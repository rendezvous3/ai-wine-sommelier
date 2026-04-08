"""Shared sync runner used by local tooling and the Worker."""

from __future__ import annotations

import argparse
import asyncio
import json
from typing import Any, Dict, Iterable, Optional

from core.config import (
    ReconcileOptions,
    SyncCycleOptions,
    SyncOptions,
    cloudflare_config_from_source,
    dutchie_config_from_source,
    load_local_env,
    parse_limit_value,
    parse_optional_int,
)
from core.cloudflare_api import CloudflareApiClient
from core.pipeline import run_sync_pipeline
from core.run_reports import D1RunReportStore, finalize_run_report
from core.types import ReconcileSummary, RemovalSummary, RunEvent, SyncCycleSummary
from d1_uniques import D1UniqueStore, build_uniques_table_name


def _chunked(items: Iterable[str], size: int) -> list[list[str]]:
    values = list(items)
    return [values[index : index + size] for index in range(0, len(values), size)]


async def _delete_batch_with_fallback(
    *,
    api: CloudflareApiClient,
    d1_store: D1UniqueStore,
    table_name: str,
    index_name: str,
    batch: list[str],
    removal: RemovalSummary,
    rows_by_id: Dict[str, Dict[str, Any]],
    target_reasons: Dict[str, str],
    removal_events: list[RunEvent],
    deleted_ids: list[str],
) -> None:
    try:
        await api.delete_vectors(index_name, batch)
        removal.deleted_vectors += len(batch)
        removal.deleted_d1_rows += await d1_store.delete_ids(table_name, batch)
        deleted_ids.extend(batch)
        for product_id in batch:
            previous_state = rows_by_id.get(product_id) or {}
            removal_events.append(
                RunEvent(
                    event_type="removed",
                    reason=target_reasons[product_id],
                    status="applied",
                    disposition="removed",
                    stage="reconcile",
                    severity="applied",
                    reason_code=target_reasons[product_id],
                    reason_label="Explicit removal applied",
                    product_id=product_id,
                    raw_name=previous_state.get("raw_name"),
                    normalized_name=previous_state.get("normalized_name"),
                    category=previous_state.get("category"),
                    subcategory=previous_state.get("subcategory"),
                    previous_state=previous_state,
                    normalized_snapshot=previous_state,
                )
            )
        return
    except Exception as exc:
        if len(batch) > 1:
            midpoint = max(1, len(batch) // 2)
            await _delete_batch_with_fallback(
                api=api,
                d1_store=d1_store,
                table_name=table_name,
                index_name=index_name,
                batch=batch[:midpoint],
                removal=removal,
                rows_by_id=rows_by_id,
                target_reasons=target_reasons,
                removal_events=removal_events,
                deleted_ids=deleted_ids,
            )
            await _delete_batch_with_fallback(
                api=api,
                d1_store=d1_store,
                table_name=table_name,
                index_name=index_name,
                batch=batch[midpoint:],
                removal=removal,
                rows_by_id=rows_by_id,
                target_reasons=target_reasons,
                removal_events=removal_events,
                deleted_ids=deleted_ids,
            )
            return

        product_id = batch[0]
        removal.failed_removal_count += 1
        previous_state = rows_by_id.get(product_id) or {}
        removal_events.append(
            RunEvent(
                event_type="removed",
                reason=target_reasons[product_id],
                status="failed",
                disposition="removed",
                stage="reconcile",
                severity="failed",
                reason_code=target_reasons[product_id],
                reason_label="Explicit removal failed",
                product_id=product_id,
                raw_name=previous_state.get("raw_name"),
                normalized_name=previous_state.get("normalized_name"),
                category=previous_state.get("category"),
                subcategory=previous_state.get("subcategory"),
                previous_state=previous_state,
                normalized_snapshot=previous_state,
                details={"error": str(exc)},
            )
        )


def build_cycle_options(
    source: Any,
    overrides: Optional[Dict[str, Any]] = None,
    trigger_source: str = "local",
) -> SyncCycleOptions:
    overrides = overrides or {}
    index_name = overrides.get("index_name") or getattr(source, "INDEX_NAME", None) or "products-prod"
    min_quantity = parse_optional_int(overrides.get("min_quantity") or getattr(source, "MIN_QUANTITY", None) or 5)
    limit = parse_limit_value(overrides.get("limit") or getattr(source, "LIMIT", None) or "none")
    product_history_retention_days = parse_optional_int(
        overrides.get("product_history_retention_days")
        or getattr(source, "PRODUCT_HISTORY_RETENTION_DAYS", None)
        or getattr(source, "VECTORIZER_PRODUCT_HISTORY_RETENTION_DAYS", None)
        or 14
    ) or 14

    return SyncCycleOptions(
        sync=SyncOptions(
            index_name=index_name,
            limit=limit,
            dry_run=bool(overrides.get("dry_run", False)),
            use_api=True,
            min_quantity=min_quantity,
            trigger_source=trigger_source,
            product_history_retention_days=product_history_retention_days,
        ),
        reconcile=ReconcileOptions(
            index_name=index_name,
            stale_hours=0,
            dry_run=bool(overrides.get("dry_run", False)),
        ),
    )


async def _apply_explicit_removals(
    *,
    options: SyncCycleOptions,
    cloudflare: Any,
    active_rows_before: Dict[str, Dict[str, Any]],
    fetched_ids_raw: Iterable[str],
    low_stock_active_ids: Iterable[str],
) -> tuple[RemovalSummary, list[RunEvent]]:
    removal = RemovalSummary(index_name=options.sync.index_name)
    removal_events: list[RunEvent] = []

    active_ids_before = set(active_rows_before.keys())
    fetched_ids = set(str(value) for value in fetched_ids_raw if value)
    low_stock_ids = set(str(value) for value in low_stock_active_ids if value)
    missing_from_fetch_ids = sorted(active_ids_before - fetched_ids)

    removal.missing_from_fetch_count = len(missing_from_fetch_ids)
    removal.low_stock_removed_count = len(low_stock_ids)

    target_reasons = {
        product_id: "missing_from_fetch"
        for product_id in missing_from_fetch_ids
    }
    for product_id in sorted(low_stock_ids):
        target_reasons[product_id] = "low_stock"

    if not target_reasons:
        return removal, removal_events

    rows_by_id = {
        str(product_id): active_rows_before.get(str(product_id), {})
        for product_id in target_reasons
    }

    if options.sync.dry_run:
        for product_id, reason in target_reasons.items():
            previous_state = rows_by_id.get(product_id) or {}
            removal_events.append(
                RunEvent(
                    event_type="removed",
                    reason=reason,
                    status="skipped",
                    disposition="removed",
                    stage="reconcile",
                    severity="info",
                    reason_code=reason,
                    reason_label="Explicit removal pending (dry run)",
                    product_id=product_id,
                    raw_name=previous_state.get("raw_name"),
                    normalized_name=previous_state.get("normalized_name"),
                    category=previous_state.get("category"),
                    subcategory=previous_state.get("subcategory"),
                    previous_state=previous_state,
                    normalized_snapshot=previous_state,
                    details={"dry_run": True},
                )
            )
        removal.sample_removed_ids = sorted(target_reasons.keys())[:20]
        removal.sample_removed_details = [
            {"product_id": event.product_id, "reason": event.reason, "raw_name": event.raw_name}
            for event in removal_events[:20]
        ]
        return removal, removal_events

    api = CloudflareApiClient(cloudflare)
    d1_store = D1UniqueStore(
        account_id=cloudflare.account_id,
        database_id=cloudflare.d1_database_id,
        api_token=cloudflare.resolved_d1_token,
        timeout_seconds=cloudflare.timeout_seconds,
    )
    table_name = build_uniques_table_name(options.sync.index_name)
    await d1_store.ensure_table(table_name)

    deleted_ids: list[str] = []
    for batch in _chunked(target_reasons.keys(), options.reconcile.batch_size):
        await _delete_batch_with_fallback(
            api=api,
            d1_store=d1_store,
            table_name=table_name,
            index_name=options.sync.index_name,
            batch=list(batch),
            removal=removal,
            rows_by_id=rows_by_id,
            target_reasons=target_reasons,
            removal_events=removal_events,
            deleted_ids=deleted_ids,
        )

    removal.removed_count = len(deleted_ids)
    removal.sample_removed_ids = deleted_ids[:20]
    removal.sample_removed_details = [
        {
            "product_id": event.product_id,
            "reason": event.reason,
            "raw_name": event.raw_name,
            "category": event.category,
            "subcategory": event.subcategory,
        }
        for event in removal_events
        if event.status == "applied"
    ][:20]
    return removal, removal_events


def _compat_reconcile_summary(options: SyncCycleOptions, removal: RemovalSummary) -> ReconcileSummary:
    return ReconcileSummary(
        index_name=options.sync.index_name,
        removal_mode="explicit_diff",
        candidate_removed_ids=removal.missing_from_fetch_count + removal.low_stock_removed_count,
        deleted_vectors=removal.deleted_vectors,
        deleted_d1_rows=removal.deleted_d1_rows,
        failed_batches=0 if removal.failed_removal_count == 0 else 1,
        sample_removed_ids=list(removal.sample_removed_ids),
    )


def _to_optional_int(value: Any) -> Optional[int]:
    if value is None or str(value).strip() == "":
        return None
    return int(value)


def _to_optional_float(value: Any) -> Optional[float]:
    if value is None or str(value).strip() == "":
        return None
    return float(value)


def _finalize_product_snapshots(
    *,
    pipeline_snapshots: Dict[str, Dict[str, Any]],
    removal_events: Iterable[RunEvent],
) -> list[Dict[str, Any]]:
    snapshots = {
        str(product_id): dict(snapshot)
        for product_id, snapshot in (pipeline_snapshots or {}).items()
        if product_id
    }

    for event in removal_events:
        product_id = str(event.product_id or "").strip()
        if not product_id:
            continue

        previous_state = dict(event.previous_state or {})
        snapshot = dict(snapshots.get(product_id) or {})
        if not snapshot:
            snapshot = {
                "product_id": product_id,
                "raw_name": previous_state.get("raw_name") or event.raw_name,
                "normalized_name": previous_state.get("normalized_name") or event.normalized_name,
                "category": previous_state.get("category") or event.category,
                "subcategory": previous_state.get("subcategory") or event.subcategory,
                "source_seen": False,
                "active_after_run": event.status != "applied",
                "disposition": "removed",
                "reason_code": event.reason_code or event.reason,
                "reason_label": event.reason_label or event.reason_code or event.reason,
                "status": event.status,
                "quantity": _to_optional_int(previous_state.get("quantity")),
                "previous_quantity": _to_optional_int(previous_state.get("quantity")),
                "price": _to_optional_float(previous_state.get("price")),
                "previous_price": _to_optional_float(previous_state.get("price")),
                "changed_fields": [],
            }
        else:
            snapshot["disposition"] = "removed"
            snapshot["reason_code"] = event.reason_code or event.reason
            snapshot["reason_label"] = event.reason_label or event.reason_code or event.reason
            snapshot["status"] = event.status
            snapshot["active_after_run"] = event.status != "applied"
            if snapshot.get("previous_quantity") is None:
                snapshot["previous_quantity"] = _to_optional_int(previous_state.get("quantity"))
            if snapshot.get("previous_price") is None:
                snapshot["previous_price"] = _to_optional_float(previous_state.get("price"))
            if snapshot.get("quantity") is None:
                snapshot["quantity"] = _to_optional_int(previous_state.get("quantity"))
            if snapshot.get("price") is None:
                snapshot["price"] = _to_optional_float(previous_state.get("price"))

        snapshots[product_id] = snapshot

    return list(snapshots.values())


async def run_sync_cycle(
    options: SyncCycleOptions,
    trigger_source: str = "local",
    source: Any = None,
) -> SyncCycleSummary:
    cloudflare = cloudflare_config_from_source(source)
    dutchie = dutchie_config_from_source(source)
    report_store = D1RunReportStore(
        account_id=cloudflare.account_id,
        database_id=cloudflare.d1_database_id,
        api_token=cloudflare.resolved_d1_token,
    )
    run_id = None
    pipeline_result = None

    try:
        if report_store.configured:
            try:
                await report_store.ensure_table()
                run_id = await report_store.start_run(
                    trigger_source=trigger_source,
                    index_name=options.sync.index_name,
                    min_quantity=options.sync.min_quantity,
                    limit_value=options.sync.limit,
                )
            except Exception as exc:
                print(f"Warning: run reporting unavailable, continuing without reports: {exc}")
                run_id = None

        pipeline_result = await run_sync_pipeline(options.sync, cloudflare, dutchie)
        removal_summary, removal_events = await _apply_explicit_removals(
            options=options,
            cloudflare=cloudflare,
            active_rows_before=pipeline_result.active_rows_before,
            fetched_ids_raw=pipeline_result.fetched_ids_raw,
            low_stock_active_ids=pipeline_result.low_stock_active_ids,
        )
        reconcile_summary = _compat_reconcile_summary(options, removal_summary)
        cycle_summary = SyncCycleSummary(
            sync=pipeline_result.summary,
            removal=removal_summary,
            reconcile=reconcile_summary,
            run_id=run_id,
        )

        if run_id:
            try:
                all_events = [event.to_dict() for event in [*pipeline_result.events, *removal_events]]
                final_product_snapshots = _finalize_product_snapshots(
                    pipeline_snapshots=pipeline_result.product_snapshots,
                    removal_events=removal_events,
                )
                reporting_warnings = await finalize_run_report(
                    report_store,
                    run_id=run_id,
                    index_name=options.sync.index_name,
                    summary=cycle_summary.to_dict(),
                    stale_deleted_count=removal_summary.removed_count,
                    events=all_events,
                    product_snapshots=final_product_snapshots,
                    retain_days=options.sync.product_history_retention_days,
                )
                if reporting_warnings:
                    print(
                        "Warning: vectorizer run report completed with warnings: "
                        + "; ".join(reporting_warnings)
                    )
            except Exception as exc:
                print(f"Warning: failed to write run report completion: {exc}")

        return cycle_summary
    except Exception as exc:
        if run_id:
            try:
                await report_store.fail_run(
                    run_id=run_id,
                    error_message=str(exc),
                    summary={
                        "sync": pipeline_result.summary.to_dict() if pipeline_result else {},
                    },
                )
            except Exception:
                pass
        raise


async def async_main() -> None:
    load_local_env()
    parser = argparse.ArgumentParser(description="Run sync + explicit per-run removal reconciliation")
    parser.add_argument("index", nargs="?", default="products-prod")
    parser.add_argument("min_quantity", nargs="?", default="5")
    parser.add_argument("limit", nargs="?", default="none")
    args = parser.parse_args()

    options = SyncCycleOptions(
        sync=SyncOptions(
            index_name=args.index,
            limit=parse_limit_value(args.limit),
            dry_run=False,
            use_api=True,
            min_quantity=parse_optional_int(args.min_quantity),
            trigger_source="local",
        ),
        reconcile=ReconcileOptions(
            index_name=args.index,
            stale_hours=0,
            dry_run=False,
        ),
    )
    summary = (await run_sync_cycle(options, trigger_source="local")).to_dict()
    print(json.dumps(summary, indent=2, default=str))


def main() -> None:
    asyncio.run(async_main())


if __name__ == "__main__":
    main()

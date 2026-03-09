"""Shared sync + reconcile runner used by local tooling and the Worker."""

from __future__ import annotations

import argparse
import asyncio
import json
from typing import Any, Dict, Optional

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
from core.pipeline import run_sync_pipeline
from core.reconcile import run_reconcile_pipeline
from core.run_reports import D1RunReportStore
from core.types import SyncCycleSummary


def build_cycle_options(
    source: Any,
    overrides: Optional[Dict[str, Any]] = None,
    trigger_source: str = "local",
) -> SyncCycleOptions:
    overrides = overrides or {}
    index_name = overrides.get("index_name") or getattr(source, "INDEX_NAME", None) or "products-prod"
    min_quantity = parse_optional_int(overrides.get("min_quantity") or getattr(source, "MIN_QUANTITY", None) or 5)
    stale_hours = int(overrides.get("stale_hours") or getattr(source, "STALE_HOURS", None) or 48)
    limit = parse_limit_value(overrides.get("limit") or getattr(source, "LIMIT", None) or "none")

    return SyncCycleOptions(
        sync=SyncOptions(
            index_name=index_name,
            limit=limit,
            dry_run=bool(overrides.get("dry_run", False)),
            use_api=True,
            min_quantity=min_quantity,
            trigger_source=trigger_source,
        ),
        reconcile=ReconcileOptions(
            index_name=index_name,
            stale_hours=stale_hours,
            dry_run=bool(overrides.get("dry_run", False)),
        ),
    )


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
    sync_summary = None

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

        sync_summary = await run_sync_pipeline(options.sync, cloudflare, dutchie)
        reconcile_summary = await run_reconcile_pipeline(options.reconcile, cloudflare)
        cycle_summary = SyncCycleSummary(sync=sync_summary, reconcile=reconcile_summary)

        if run_id:
            try:
                await report_store.finish_run(
                    run_id=run_id,
                    summary=cycle_summary.to_dict(),
                    stale_deleted_count=reconcile_summary.deleted_vectors,
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
                    summary={"sync": sync_summary.to_dict() if sync_summary else {}},
                )
            except Exception:
                pass
        raise


async def async_main() -> None:
    load_local_env()
    parser = argparse.ArgumentParser(description="Run sync + stale reconciliation")
    parser.add_argument("index", nargs="?", default="products-prod")
    parser.add_argument("min_quantity", nargs="?", default="5")
    parser.add_argument("stale_hours", nargs="?", default="48")
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
            stale_hours=int(args.stale_hours),
            dry_run=False,
        ),
    )
    summary = (await run_sync_cycle(options, trigger_source="local")).to_dict()
    print(json.dumps(summary, indent=2, default=str))


def main() -> None:
    asyncio.run(async_main())


if __name__ == "__main__":
    main()

from __future__ import annotations

from typing import Any, Dict, List, Optional, Set

from normalize_products import transform_product

from d1_uniques import D1UniqueStore, build_uniques_table_name, normalize_product_name
from .audit import (
    audit_source_product,
    audit_transformed_product,
    compact_normalized_snapshot,
    compact_source_snapshot,
)
from .cloudflare_api import CloudflareApiClient
from .config import CloudflareConfig, DutchieConfig, SyncOptions
from .documents import build_metadata
from .product_source import iter_product_batches
from .types import RunEvent, RunProductSnapshot, SyncPipelineResult, SyncSummary


TRACKED_UPDATE_FIELDS = ("raw_name", "category", "subcategory", "quantity", "price")


def _to_int(value: Any) -> Optional[int]:
    if value is None or value == "":
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _to_float(value: Any) -> Optional[float]:
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _product_state(product: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "product_id": str(product.get("id") or "").strip(),
        "normalized_name": normalize_product_name(str(product.get("name") or "")),
        "raw_name": str(product.get("name") or ""),
        "category": str(product.get("category") or ""),
        "subcategory": str(product.get("subcategory") or ""),
        "quantity": _to_int(product.get("quantity")),
        "price": _to_float(product.get("price")),
    }


def _ledger_state(row: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if not row:
        return None
    return {
        "product_id": str(row.get("product_id") or "").strip(),
        "normalized_name": str(row.get("normalized_name") or ""),
        "raw_name": str(row.get("raw_name") or ""),
        "category": str(row.get("category") or ""),
        "subcategory": str(row.get("subcategory") or ""),
        "quantity": _to_int(row.get("quantity")),
        "price": _to_float(row.get("price")),
        "updated_at": row.get("updated_at"),
        "last_seen_at": row.get("last_seen_at"),
    }


def _diff_tracked_fields(previous: Optional[Dict[str, Any]], current: Dict[str, Any]) -> List[str]:
    if not previous:
        return list(TRACKED_UPDATE_FIELDS)
    changed: List[str] = []
    for field in TRACKED_UPDATE_FIELDS:
        if previous.get(field) != current.get(field):
            changed.append(field)
    return changed


def _excluded_event(
    *,
    reason: str,
    product_id: Optional[str],
    raw_name: str,
    category: str,
    subcategory: str,
    details: Optional[Dict[str, Any]] = None,
) -> RunEvent:
    return RunEvent(
        event_type="excluded",
        reason=reason,
        reason_code=reason,
        status="skipped",
        disposition="excluded",
        stage="pipeline",
        severity="hard_omit",
        product_id=product_id or None,
        raw_name=raw_name or None,
        normalized_name=normalize_product_name(raw_name or "") or None,
        category=category or None,
        subcategory=subcategory or None,
        details=details or {},
    )


def _change_field_records(previous: Optional[Dict[str, Any]], current: Dict[str, Any], fields: List[str]) -> List[Dict[str, Any]]:
    previous = previous or {}
    return [
        {
            "field_name": field_name,
            "field_role": "changed",
            "source_value": None,
            "previous_value": previous.get(field_name),
            "current_value": current.get(field_name),
            "notes": None,
        }
        for field_name in fields
    ]


def _snapshot_record(
    *,
    product_id: Optional[str],
    raw_name: Optional[str],
    normalized_name: Optional[str],
    category: Optional[str],
    subcategory: Optional[str],
    source_seen: bool,
    active_after_run: bool,
    disposition: str,
    reason_code: Optional[str],
    reason_label: Optional[str],
    status: str,
    quantity: Optional[int],
    previous_quantity: Optional[int],
    price: Optional[float],
    previous_price: Optional[float],
    changed_fields: Optional[List[str]] = None,
) -> Optional[Dict[str, Any]]:
    product_id_value = str(product_id or "").strip()
    if not product_id_value:
        return None
    return RunProductSnapshot(
        product_id=product_id_value,
        raw_name=raw_name or None,
        normalized_name=normalized_name or None,
        category=category or None,
        subcategory=subcategory or None,
        source_seen=source_seen,
        active_after_run=active_after_run,
        disposition=disposition,
        reason_code=reason_code or None,
        reason_label=reason_label or None,
        status=status,
        quantity=quantity,
        previous_quantity=previous_quantity,
        price=price,
        previous_price=previous_price,
        changed_fields=list(changed_fields or []),
    ).to_dict()


def _store_snapshot(snapshot_rows: Dict[str, Dict[str, Any]], snapshot: Optional[Dict[str, Any]]) -> None:
    if not snapshot:
        return
    product_id = str(snapshot.get("product_id") or "").strip()
    if not product_id:
        return
    snapshot_rows[product_id] = snapshot


def _note_quality_audit(summary: SyncSummary, finding: Dict[str, Any]) -> None:
    stage = str(finding.get("stage") or "pipeline")
    severity = str(finding.get("severity") or "warning")
    reason_code = str(finding.get("reason_code") or "unknown")
    missing_fields = list(finding.get("missing_fields") or [])

    if severity == "warning":
        summary.audit_warning_count += 1
    else:
        summary.audit_hard_omit_count += 1

    if stage == "source":
        summary.source_issue_count += 1
    elif stage == "transform":
        summary.transform_issue_count += 1

    if reason_code == "potency_anomaly":
        summary.potency_anomaly_count += 1
    if reason_code.startswith("missing_"):
        summary.missing_metadata_count += 1

    quality_audit = summary.quality_audit
    stage_bucket = quality_audit.setdefault(stage, {})
    severity_bucket = stage_bucket.setdefault(severity, {})
    severity_bucket[reason_code] = int(severity_bucket.get(reason_code, 0) or 0) + 1

    if missing_fields:
        field_bucket = quality_audit.setdefault("missing_fields", {})
        for field_name in missing_fields:
            field_bucket[field_name] = int(field_bucket.get(field_name, 0) or 0) + 1


def _audit_event(
    *,
    finding: Dict[str, Any],
    product_id: Optional[str],
    raw_name: str,
    category: str,
    subcategory: str,
    normalized_name: Optional[str],
    current_state: Optional[Dict[str, Any]] = None,
) -> RunEvent:
    event_type = "warning" if finding.get("severity") == "warning" else "excluded"
    status = "applied" if event_type == "warning" else "skipped"
    return RunEvent(
        event_type=event_type,
        reason=str(finding.get("reason_code") or ""),
        reason_code=str(finding.get("reason_code") or ""),
        reason_label=str(finding.get("reason_label") or finding.get("reason_code") or ""),
        status=status,
        disposition="warning" if event_type == "warning" else "excluded",
        stage=str(finding.get("stage") or "pipeline"),
        severity=str(finding.get("severity") or ("warning" if event_type == "warning" else "hard_omit")),
        product_id=product_id or None,
        raw_name=raw_name or None,
        normalized_name=normalized_name or normalize_product_name(raw_name or "") or None,
        category=category or None,
        subcategory=subcategory or None,
        current_state=current_state,
        source_snapshot=finding.get("source_snapshot") or {},
        normalized_snapshot=finding.get("normalized_snapshot") or {},
        field_records=finding.get("field_records") or [],
        details=finding.get("details") or {},
    )


def _append_audit_findings(
    *,
    summary: SyncSummary,
    events: List[RunEvent],
    findings: List[Dict[str, Any]],
    product_id: Optional[str],
    raw_name: str,
    category: str,
    subcategory: str,
    normalized_name: Optional[str],
    current_state: Optional[Dict[str, Any]] = None,
) -> None:
    for finding in findings:
        _note_quality_audit(summary, finding)
        events.append(
            _audit_event(
                finding=finding,
                product_id=product_id,
                raw_name=raw_name,
                category=category,
                subcategory=subcategory,
                normalized_name=normalized_name,
                current_state=current_state,
            )
        )


async def run_sync_pipeline(
    options: SyncOptions,
    cloudflare: CloudflareConfig,
    dutchie: DutchieConfig,
) -> SyncPipelineResult:
    summary = SyncSummary(
        index_name=options.index_name,
        mode="DRY RUN" if options.dry_run else "LIVE UPLOAD",
    )

    api = CloudflareApiClient(cloudflare)
    d1_store = D1UniqueStore(
        account_id=cloudflare.account_id,
        database_id=cloudflare.d1_database_id,
        api_token=cloudflare.resolved_d1_token,
        timeout_seconds=cloudflare.timeout_seconds,
    )
    d1_table_name = build_uniques_table_name(options.index_name)
    active_rows_before: Dict[str, Dict[str, Any]] = {}
    active_name_owners: Dict[str, str] = {}
    events: List[RunEvent] = []
    product_snapshots: Dict[str, Dict[str, Any]] = {}
    fetched_ids_raw: Set[str] = set()
    low_stock_active_ids: Set[str] = set()

    if not options.dry_run:
        index_exists = await api.index_exists(options.index_name)
        if not index_exists:
            raise RuntimeError(
                f"Index '{options.index_name}' does not exist. "
                f"Create it first with: python manage_indexes.py --create {options.index_name}"
            )

    if options.use_d1_dedup and d1_store.configured:
        await d1_store.ensure_table(d1_table_name)
        rows = await d1_store.list_rows(d1_table_name)
        active_rows_before = {
            str(row.get("product_id")): row
            for row in rows
            if row.get("product_id")
        }
        active_name_owners = {
            str(row.get("normalized_name")): str(row.get("product_id"))
            for row in rows
            if row.get("normalized_name") and row.get("product_id")
        }

    seen_ids: Set[str] = set()
    seen_names: Set[str] = set()

    async for raw_batch in iter_product_batches(options, dutchie):
        summary.fetched_count += len(raw_batch)

        candidate_batch: List[Dict[str, Any]] = []
        for raw_product in raw_batch:
            raw_id = str(raw_product.get("id") or "").strip()
            raw_name = str(raw_product.get("name") or "")
            raw_category = str(raw_product.get("category") or "").lower().replace("_", "")
            raw_subcategory = str(raw_product.get("subcategory") or "")
            if raw_id:
                fetched_ids_raw.add(raw_id)

            source_findings = audit_source_product(raw_product)
            source_hard_findings = [finding for finding in source_findings if finding.get("severity") != "warning"]
            source_warning_findings = [finding for finding in source_findings if finding.get("severity") == "warning"]
            if source_hard_findings:
                existing_row = active_rows_before.get(raw_id) if raw_id else None
                _store_snapshot(
                    product_snapshots,
                    _snapshot_record(
                        product_id=raw_id or None,
                        raw_name=raw_name,
                        normalized_name=normalize_product_name(raw_name),
                        category=raw_category,
                        subcategory=raw_subcategory,
                        source_seen=bool(raw_id),
                        active_after_run=bool(existing_row),
                        disposition="excluded",
                        reason_code=str(source_hard_findings[0].get("reason_code") or ""),
                        reason_label=str(source_hard_findings[0].get("reason_label") or source_hard_findings[0].get("reason_code") or ""),
                        status="skipped",
                        quantity=None,
                        previous_quantity=None,
                        price=None,
                        previous_price=None,
                    ),
                )
                _append_audit_findings(
                    summary=summary,
                    events=events,
                    findings=source_hard_findings,
                    product_id=raw_id or None,
                    raw_name=raw_name,
                    category=raw_category,
                    subcategory=raw_subcategory,
                    normalized_name=normalize_product_name(raw_name),
                )
                continue

            try:
                normalized = transform_product(raw_product)
                summary.transformed_count += 1
            except Exception as exc:
                existing_row = active_rows_before.get(raw_id) if raw_id else None
                _store_snapshot(
                    product_snapshots,
                    _snapshot_record(
                        product_id=raw_id or None,
                        raw_name=raw_name,
                        normalized_name=normalize_product_name(raw_name),
                        category=raw_category,
                        subcategory=raw_subcategory,
                        source_seen=bool(raw_id),
                        active_after_run=bool(existing_row),
                        disposition="excluded",
                        reason_code="transform_error",
                        reason_label="Transform error",
                        status="skipped",
                        quantity=None,
                        previous_quantity=None,
                        price=None,
                        previous_price=None,
                    ),
                )
                summary.transform_errors += 1
                summary.exclusions.transform_error_count += 1
                summary.errors.append({"name": raw_name or "Unknown", "error": str(exc)})
                events.append(
                    RunEvent(
                        event_type="excluded",
                        reason="transform_error",
                        reason_code="transform_error",
                        reason_label="Transform error",
                        status="skipped",
                        disposition="excluded",
                        stage="transform",
                        severity="hard_omit",
                        product_id=raw_id or None,
                        raw_name=raw_name,
                        normalized_name=normalize_product_name(raw_name) or None,
                        category=raw_category,
                        subcategory=raw_subcategory,
                        source_snapshot=compact_source_snapshot(raw_product),
                        details={"error": str(exc)},
                    )
                )
                continue

            transform_findings = audit_transformed_product(raw_product, normalized)
            transform_hard_findings = [finding for finding in transform_findings if finding.get("severity") != "warning"]
            transform_warning_findings = [finding for finding in transform_findings if finding.get("severity") == "warning"]
            if transform_hard_findings:
                current_state = _product_state(normalized)
                existing_row = active_rows_before.get(raw_id) if raw_id else None
                _store_snapshot(
                    product_snapshots,
                    _snapshot_record(
                        product_id=raw_id or None,
                        raw_name=str(normalized.get("name") or raw_name),
                        normalized_name=normalize_product_name(str(normalized.get("name") or raw_name)),
                        category=str(normalized.get("category") or raw_category),
                        subcategory=str(normalized.get("subcategory") or raw_subcategory),
                        source_seen=bool(raw_id),
                        active_after_run=bool(existing_row),
                        disposition="excluded",
                        reason_code=str(transform_hard_findings[0].get("reason_code") or ""),
                        reason_label=str(transform_hard_findings[0].get("reason_label") or transform_hard_findings[0].get("reason_code") or ""),
                        status="skipped",
                        quantity=current_state.get("quantity"),
                        previous_quantity=None,
                        price=current_state.get("price"),
                        previous_price=None,
                    ),
                )
                _append_audit_findings(
                    summary=summary,
                    events=events,
                    findings=transform_hard_findings,
                    product_id=raw_id or None,
                    raw_name=str(normalized.get("name") or raw_name),
                    category=str(normalized.get("category") or raw_category),
                    subcategory=str(normalized.get("subcategory") or raw_subcategory),
                    normalized_name=normalize_product_name(str(normalized.get("name") or raw_name)),
                    current_state=_product_state(normalized),
                )
                continue

            candidate_batch.append(
                {
                    "raw": raw_product,
                    "normalized": normalized,
                    "warning_findings": [*source_warning_findings, *transform_warning_findings],
                }
            )

        filtered_batch: List[Dict[str, Any]] = []
        for candidate in candidate_batch:
            raw_product = candidate["raw"]
            product = candidate["normalized"]
            warning_findings = candidate.get("warning_findings") or []
            product_id = str(product.get("id") or "").strip()
            raw_name = str(product.get("name") or "")
            category = str(product.get("category") or "")
            subcategory = str(product.get("subcategory") or "")
            normalized_name = normalize_product_name(raw_name)
            current_state = _product_state(product)
            existing_row = active_rows_before.get(product_id)

            if options.min_quantity is not None:
                quantity = _to_int(product.get("quantity"))
                if quantity is not None and quantity < options.min_quantity:
                    summary.low_stock_excluded += 1
                    summary.exclusions.low_stock_count += 1
                    if existing_row:
                        low_stock_active_ids.add(product_id)
                    _store_snapshot(
                        product_snapshots,
                        _snapshot_record(
                            product_id=product_id or None,
                            raw_name=raw_name,
                            normalized_name=normalized_name or None,
                            category=category,
                            subcategory=subcategory,
                            source_seen=True,
                            active_after_run=False,
                            disposition="removed" if existing_row else "excluded",
                            reason_code="low_stock",
                            reason_label="Below minimum quantity threshold",
                            status="pending_removal" if existing_row else "skipped",
                            quantity=current_state.get("quantity"),
                            previous_quantity=_to_int(existing_row.get("quantity")) if existing_row else None,
                            price=current_state.get("price"),
                            previous_price=_to_float(existing_row.get("price")) if existing_row else None,
                        ),
                    )
                    if not existing_row:
                        events.append(
                            RunEvent(
                                event_type="excluded",
                                reason="low_stock",
                                reason_code="low_stock",
                                reason_label="Below minimum quantity threshold",
                                status="skipped",
                                disposition="excluded",
                                stage="pipeline",
                                severity="hard_omit",
                                product_id=product_id or None,
                                raw_name=raw_name,
                                normalized_name=normalized_name or None,
                                category=category,
                                subcategory=subcategory,
                                current_state=current_state,
                                source_snapshot=compact_source_snapshot(raw_product),
                                normalized_snapshot=compact_normalized_snapshot(product),
                                details={"quantity": quantity, "min_quantity": options.min_quantity},
                            )
                        )
                    continue

            if not product_id:
                summary.missing_id_excluded += 1
                summary.exclusions.missing_id_count += 1
                events.append(
                    RunEvent(
                        event_type="excluded",
                        reason="missing_id",
                        reason_code="missing_id",
                        reason_label="Missing product id",
                        status="skipped",
                        disposition="excluded",
                        stage="pipeline",
                        severity="hard_omit",
                        product_id=None,
                        raw_name=raw_name,
                        normalized_name=normalized_name or None,
                        category=category,
                        subcategory=subcategory,
                        current_state=current_state,
                        source_snapshot=compact_source_snapshot(raw_product),
                        normalized_snapshot=compact_normalized_snapshot(product),
                    )
                )
                continue

            if product_id in seen_ids:
                _store_snapshot(
                    product_snapshots,
                    _snapshot_record(
                        product_id=product_id,
                        raw_name=raw_name,
                        normalized_name=normalized_name or None,
                        category=category,
                        subcategory=subcategory,
                        source_seen=True,
                        active_after_run=bool(existing_row),
                        disposition="excluded",
                        reason_code="duplicate_id",
                        reason_label="Duplicate product id in fetched batch",
                        status="skipped",
                        quantity=current_state.get("quantity"),
                        previous_quantity=None,
                        price=current_state.get("price"),
                        previous_price=None,
                    ),
                )
                summary.duplicate_id_excluded += 1
                summary.exclusions.duplicate_id_count += 1
                events.append(
                    RunEvent(
                        event_type="excluded",
                        reason="duplicate_id",
                        reason_code="duplicate_id",
                        reason_label="Duplicate product id in fetched batch",
                        status="skipped",
                        disposition="excluded",
                        stage="pipeline",
                        severity="hard_omit",
                        product_id=product_id,
                        raw_name=raw_name,
                        normalized_name=normalized_name or None,
                        category=category,
                        subcategory=subcategory,
                        current_state=current_state,
                        source_snapshot=compact_source_snapshot(raw_product),
                        normalized_snapshot=compact_normalized_snapshot(product),
                    )
                )
                continue

            if normalized_name and normalized_name in seen_names:
                _store_snapshot(
                    product_snapshots,
                    _snapshot_record(
                        product_id=product_id,
                        raw_name=raw_name,
                        normalized_name=normalized_name or None,
                        category=category,
                        subcategory=subcategory,
                        source_seen=True,
                        active_after_run=bool(existing_row),
                        disposition="excluded",
                        reason_code="duplicate_name",
                        reason_label="Duplicate normalized name in fetched batch",
                        status="skipped",
                        quantity=current_state.get("quantity"),
                        previous_quantity=None,
                        price=current_state.get("price"),
                        previous_price=None,
                    ),
                )
                summary.duplicate_name_excluded += 1
                summary.exclusions.duplicate_name_count += 1
                events.append(
                    RunEvent(
                        event_type="excluded",
                        reason="duplicate_name",
                        reason_code="duplicate_name",
                        reason_label="Duplicate normalized name in fetched batch",
                        status="skipped",
                        disposition="excluded",
                        stage="pipeline",
                        severity="hard_omit",
                        product_id=product_id,
                        raw_name=raw_name,
                        normalized_name=normalized_name or None,
                        category=category,
                        subcategory=subcategory,
                        current_state=current_state,
                        source_snapshot=compact_source_snapshot(raw_product),
                        normalized_snapshot=compact_normalized_snapshot(product),
                        details={"normalized_name": normalized_name},
                    )
                )
                continue

            if options.use_d1_dedup and d1_store.configured and normalized_name:
                owner = active_name_owners.get(normalized_name)
                if owner and owner != product_id:
                    _store_snapshot(
                        product_snapshots,
                        _snapshot_record(
                            product_id=product_id,
                            raw_name=raw_name,
                            normalized_name=normalized_name or None,
                            category=category,
                            subcategory=subcategory,
                            source_seen=True,
                            active_after_run=bool(existing_row),
                            disposition="excluded",
                            reason_code="d1_name_conflict",
                            reason_label="Normalized name conflicts with active D1 record",
                            status="skipped",
                            quantity=current_state.get("quantity"),
                            previous_quantity=None,
                            price=current_state.get("price"),
                            previous_price=None,
                        ),
                    )
                    summary.d1_name_excluded += 1
                    summary.exclusions.d1_name_conflict_count += 1
                    events.append(
                        RunEvent(
                            event_type="excluded",
                            reason="d1_name_conflict",
                            reason_code="d1_name_conflict",
                            reason_label="Normalized name conflicts with active D1 record",
                            status="skipped",
                            disposition="excluded",
                            stage="pipeline",
                            severity="hard_omit",
                            product_id=product_id,
                            raw_name=raw_name,
                            normalized_name=normalized_name or None,
                            category=category,
                            subcategory=subcategory,
                            current_state=current_state,
                            source_snapshot=compact_source_snapshot(raw_product),
                            normalized_snapshot=compact_normalized_snapshot(product),
                            details={
                                "normalized_name": normalized_name,
                                "conflicting_product_id": owner,
                            },
                        )
                    )
                    continue

            seen_ids.add(product_id)
            if normalized_name:
                seen_names.add(normalized_name)
                prior_name = str(existing_row.get("normalized_name") or "") if existing_row else ""
                if prior_name and prior_name != normalized_name and active_name_owners.get(prior_name) == product_id:
                    active_name_owners.pop(prior_name, None)
                active_name_owners[normalized_name] = product_id

            if warning_findings:
                _append_audit_findings(
                    summary=summary,
                    events=events,
                    findings=warning_findings,
                    product_id=product_id or None,
                    raw_name=raw_name,
                    category=category,
                    subcategory=subcategory,
                    normalized_name=normalized_name or None,
                    current_state=current_state,
                )

            filtered_batch.append({"raw": raw_product, "normalized": product})

        texts: List[str] = []
        metadatas: List[Dict[str, Any]] = []
        ids: List[str] = []
        ready_batch: List[Dict[str, Any]] = []

        for candidate in filtered_batch:
            raw_product = candidate["raw"]
            product = candidate["normalized"]
            try:
                metadata = build_metadata(product)
            except Exception as exc:
                existing_row = active_rows_before.get(str(product.get("id") or "").strip())
                _store_snapshot(
                    product_snapshots,
                    _snapshot_record(
                        product_id=str(product.get("id") or "").strip() or None,
                        raw_name=str(product.get("name") or ""),
                        normalized_name=normalize_product_name(str(product.get("name") or "")) or None,
                        category=str(product.get("category") or ""),
                        subcategory=str(product.get("subcategory") or ""),
                        source_seen=True,
                        active_after_run=bool(existing_row),
                        disposition="excluded",
                        reason_code="metadata_build_error",
                        reason_label="Metadata build error",
                        status="skipped",
                        quantity=_product_state(product).get("quantity"),
                        previous_quantity=None,
                        price=_product_state(product).get("price"),
                        previous_price=None,
                    ),
                )
                summary.transform_errors += 1
                summary.exclusions.transform_error_count += 1
                summary.errors.append({"name": str(product.get("name") or "Unknown"), "error": str(exc)})
                events.append(
                    RunEvent(
                        event_type="excluded",
                        reason="metadata_build_error",
                        reason_code="metadata_build_error",
                        reason_label="Metadata build error",
                        status="skipped",
                        disposition="excluded",
                        stage="transform",
                        severity="hard_omit",
                        product_id=str(product.get("id") or "").strip() or None,
                        raw_name=str(product.get("name") or ""),
                        normalized_name=normalize_product_name(str(product.get("name") or "")) or None,
                        category=str(product.get("category") or ""),
                        subcategory=str(product.get("subcategory") or ""),
                        current_state=_product_state(product),
                        source_snapshot=compact_source_snapshot(raw_product),
                        normalized_snapshot=compact_normalized_snapshot(product),
                        details={"error": str(exc)},
                    )
                )
                continue

            ids.append(str(metadata["id"]))
            texts.append(metadata["page_content"])
            metadatas.append(metadata)
            ready_batch.append(candidate)

        summary.document_count += len(texts)
        if summary.sample_document is None and metadatas:
            summary.sample_document = {
                "page_content": texts[0],
                "metadata": metadatas[0],
            }

        if options.dry_run or not texts:
            continue

        await api.upsert_vectors(
            index_name=options.index_name,
            texts=texts,
            metadatas=metadatas,
            ids=ids,
        )
        summary.uploaded_count += len(texts)

        successful_ids = set(ids)
        if options.use_d1_dedup and d1_store.configured:
            upsert_result = await d1_store.upsert_seen(
                d1_table_name,
                [
                    {
                        "product_id": str(candidate["normalized"].get("id", "")),
                        "normalized_name": normalize_product_name(str(candidate["normalized"].get("name", ""))),
                        "raw_name": str(candidate["normalized"].get("name", "")),
                        "category": str(candidate["normalized"].get("category", "")),
                        "subcategory": str(candidate["normalized"].get("subcategory", "")),
                        "quantity": _to_int(candidate["normalized"].get("quantity")),
                        "price": _to_float(candidate["normalized"].get("price")),
                    }
                    for candidate in ready_batch
                ],
            )
            successful_ids = set(upsert_result.get("upserted_ids", []) or ids)

        for candidate in ready_batch:
            raw_product = candidate["raw"]
            product = candidate["normalized"]
            product_id = str(product.get("id") or "").strip()
            if product_id not in successful_ids:
                continue

            previous_state = _ledger_state(active_rows_before.get(product_id))
            current_state = _product_state(product)

            if previous_state is None:
                _store_snapshot(
                    product_snapshots,
                    _snapshot_record(
                        product_id=product_id,
                        raw_name=current_state.get("raw_name"),
                        normalized_name=current_state.get("normalized_name"),
                        category=current_state.get("category"),
                        subcategory=current_state.get("subcategory"),
                        source_seen=True,
                        active_after_run=True,
                        disposition="new",
                        reason_code="new_product",
                        reason_label="Indexed new product",
                        status="applied",
                        quantity=current_state.get("quantity"),
                        previous_quantity=None,
                        price=current_state.get("price"),
                        previous_price=None,
                    ),
                )
                summary.indexing.new_count += 1
                events.append(
                    RunEvent(
                        event_type="indexed_new",
                        reason="new_product",
                        reason_code="new_product",
                        reason_label="Indexed new product",
                        status="applied",
                        disposition="added",
                        stage="pipeline",
                        severity="applied",
                        product_id=product_id,
                        raw_name=current_state.get("raw_name"),
                        normalized_name=current_state.get("normalized_name"),
                        category=current_state.get("category"),
                        subcategory=current_state.get("subcategory"),
                        current_state=current_state,
                        source_snapshot=compact_source_snapshot(raw_product),
                        normalized_snapshot=compact_normalized_snapshot(product),
                    )
                )
            else:
                summary.d1_existing_ids_allowed += 1
                changed_fields = _diff_tracked_fields(previous_state, current_state)
                if changed_fields:
                    _store_snapshot(
                        product_snapshots,
                        _snapshot_record(
                            product_id=product_id,
                            raw_name=current_state.get("raw_name"),
                            normalized_name=current_state.get("normalized_name"),
                            category=current_state.get("category"),
                            subcategory=current_state.get("subcategory"),
                            source_seen=True,
                            active_after_run=True,
                            disposition="updated",
                            reason_code="metadata_changed",
                            reason_label="Indexed updated product metadata",
                            status="applied",
                            quantity=current_state.get("quantity"),
                            previous_quantity=previous_state.get("quantity"),
                            price=current_state.get("price"),
                            previous_price=previous_state.get("price"),
                            changed_fields=changed_fields,
                        ),
                    )
                    summary.indexing.updated_count += 1
                    events.append(
                        RunEvent(
                            event_type="indexed_updated",
                            reason="metadata_changed",
                            reason_code="metadata_changed",
                            reason_label="Indexed updated product metadata",
                            status="applied",
                            disposition="updated",
                            stage="pipeline",
                            severity="applied",
                            product_id=product_id,
                            raw_name=current_state.get("raw_name"),
                            normalized_name=current_state.get("normalized_name"),
                            category=current_state.get("category"),
                            subcategory=current_state.get("subcategory"),
                            previous_state=previous_state,
                            current_state=current_state,
                            source_snapshot=compact_source_snapshot(raw_product),
                            normalized_snapshot=compact_normalized_snapshot(product),
                            field_records=_change_field_records(previous_state, current_state, changed_fields),
                            details={"changed_fields": changed_fields},
                        )
                    )
                else:
                    _store_snapshot(
                        product_snapshots,
                        _snapshot_record(
                            product_id=product_id,
                            raw_name=current_state.get("raw_name"),
                            normalized_name=current_state.get("normalized_name"),
                            category=current_state.get("category"),
                            subcategory=current_state.get("subcategory"),
                            source_seen=True,
                            active_after_run=True,
                            disposition="unchanged",
                            reason_code="unchanged",
                            reason_label="Tracked metadata unchanged",
                            status="applied",
                            quantity=current_state.get("quantity"),
                            previous_quantity=previous_state.get("quantity"),
                            price=current_state.get("price"),
                            previous_price=previous_state.get("price"),
                        ),
                    )

    return SyncPipelineResult(
        summary=summary,
        fetched_ids_raw=sorted(fetched_ids_raw),
        active_rows_before=active_rows_before,
        low_stock_active_ids=sorted(low_stock_active_ids),
        events=events,
        product_snapshots=product_snapshots,
    )

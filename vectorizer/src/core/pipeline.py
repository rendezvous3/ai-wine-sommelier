from __future__ import annotations

from typing import Any, Dict, List, Optional, Set

from normalize_products import transform_product

from d1_uniques import D1UniqueStore, build_uniques_table_name, normalize_product_name
from .cloudflare_api import CloudflareApiClient
from .config import CloudflareConfig, DutchieConfig, SyncOptions
from .documents import build_metadata
from .product_source import iter_product_batches
from .types import RunEvent, SyncPipelineResult, SyncSummary


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
        status="skipped",
        product_id=product_id or None,
        raw_name=raw_name or None,
        category=category or None,
        subcategory=subcategory or None,
        details=details or {},
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

        normalized_batch: List[Dict[str, Any]] = []
        for raw_product in raw_batch:
            raw_id = str(raw_product.get("id") or "").strip()
            raw_name = str(raw_product.get("name") or "")
            raw_category = str(raw_product.get("category") or "")
            raw_subcategory = str(raw_product.get("subcategory") or "")
            if raw_id:
                fetched_ids_raw.add(raw_id)
            try:
                normalized = transform_product(raw_product)
                normalized_batch.append(normalized)
                summary.transformed_count += 1
            except Exception as exc:
                summary.transform_errors += 1
                summary.exclusions.transform_error_count += 1
                summary.errors.append(
                    {
                        "name": raw_name or "Unknown",
                        "error": str(exc),
                    }
                )
                events.append(
                    _excluded_event(
                        reason="transform_error",
                        product_id=raw_id or None,
                        raw_name=raw_name,
                        category=raw_category,
                        subcategory=raw_subcategory,
                        details={"error": str(exc)},
                    )
                )

        filtered_batch: List[Dict[str, Any]] = []
        for product in normalized_batch:
            product_id = str(product.get("id") or "").strip()
            raw_name = str(product.get("name") or "")
            category = str(product.get("category") or "")
            subcategory = str(product.get("subcategory") or "")
            normalized_name = normalize_product_name(raw_name)
            existing_row = active_rows_before.get(product_id)

            if options.min_quantity is not None:
                quantity = _to_int(product.get("quantity"))
                if quantity is not None and quantity < options.min_quantity:
                    summary.low_stock_excluded += 1
                    summary.exclusions.low_stock_count += 1
                    if existing_row:
                        low_stock_active_ids.add(product_id)
                    else:
                        events.append(
                            _excluded_event(
                                reason="low_stock",
                                product_id=product_id or None,
                                raw_name=raw_name,
                                category=category,
                                subcategory=subcategory,
                                details={"quantity": quantity, "min_quantity": options.min_quantity},
                            )
                        )
                    continue

            if not product_id:
                summary.missing_id_excluded += 1
                summary.exclusions.missing_id_count += 1
                events.append(
                    _excluded_event(
                        reason="missing_id",
                        product_id=None,
                        raw_name=raw_name,
                        category=category,
                        subcategory=subcategory,
                    )
                )
                continue

            if product_id in seen_ids:
                summary.duplicate_id_excluded += 1
                summary.exclusions.duplicate_id_count += 1
                events.append(
                    _excluded_event(
                        reason="duplicate_id",
                        product_id=product_id,
                        raw_name=raw_name,
                        category=category,
                        subcategory=subcategory,
                    )
                )
                continue

            if normalized_name and normalized_name in seen_names:
                summary.duplicate_name_excluded += 1
                summary.exclusions.duplicate_name_count += 1
                events.append(
                    _excluded_event(
                        reason="duplicate_name",
                        product_id=product_id,
                        raw_name=raw_name,
                        category=category,
                        subcategory=subcategory,
                        details={"normalized_name": normalized_name},
                    )
                )
                continue

            if options.use_d1_dedup and d1_store.configured and normalized_name:
                owner = active_name_owners.get(normalized_name)
                if owner and owner != product_id:
                    summary.d1_name_excluded += 1
                    summary.exclusions.d1_name_conflict_count += 1
                    events.append(
                        _excluded_event(
                            reason="d1_name_conflict",
                            product_id=product_id,
                            raw_name=raw_name,
                            category=category,
                            subcategory=subcategory,
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
            filtered_batch.append(product)

        texts: List[str] = []
        metadatas: List[Dict[str, Any]] = []
        ids: List[str] = []

        for product in filtered_batch:
            metadata = build_metadata(product)
            ids.append(str(metadata["id"]))
            texts.append(metadata["page_content"])
            metadatas.append(metadata)

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
                        "product_id": str(product.get("id", "")),
                        "normalized_name": normalize_product_name(str(product.get("name", ""))),
                        "raw_name": str(product.get("name", "")),
                        "category": str(product.get("category", "")),
                        "subcategory": str(product.get("subcategory", "")),
                        "quantity": _to_int(product.get("quantity")),
                        "price": _to_float(product.get("price")),
                    }
                    for product in filtered_batch
                ],
            )
            successful_ids = set(upsert_result.get("upserted_ids", []) or ids)

        for product in filtered_batch:
            product_id = str(product.get("id") or "").strip()
            if product_id not in successful_ids:
                continue

            previous_state = _ledger_state(active_rows_before.get(product_id))
            current_state = _product_state(product)

            if previous_state is None:
                summary.indexing.new_count += 1
                events.append(
                    RunEvent(
                        event_type="indexed_new",
                        reason="new_product",
                        status="applied",
                        product_id=product_id,
                        raw_name=current_state.get("raw_name"),
                        category=current_state.get("category"),
                        subcategory=current_state.get("subcategory"),
                        current_state=current_state,
                    )
                )
            else:
                summary.d1_existing_ids_allowed += 1
                changed_fields = _diff_tracked_fields(previous_state, current_state)
                if changed_fields:
                    summary.indexing.updated_count += 1
                    events.append(
                        RunEvent(
                            event_type="indexed_updated",
                            reason="metadata_changed",
                            status="applied",
                            product_id=product_id,
                            raw_name=current_state.get("raw_name"),
                            category=current_state.get("category"),
                            subcategory=current_state.get("subcategory"),
                            previous_state=previous_state,
                            current_state=current_state,
                            details={"changed_fields": changed_fields},
                        )
                    )

    return SyncPipelineResult(
        summary=summary,
        fetched_ids_raw=sorted(fetched_ids_raw),
        active_rows_before=active_rows_before,
        low_stock_active_ids=sorted(low_stock_active_ids),
        events=events,
    )

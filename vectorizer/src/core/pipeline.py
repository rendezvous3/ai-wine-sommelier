from __future__ import annotations

from typing import Any, Dict, List, Set

from normalize_products import transform_product

from d1_uniques import D1UniqueStore, build_uniques_table_name, normalize_product_name
from .cloudflare_api import CloudflareApiClient
from .config import CloudflareConfig, DutchieConfig, SyncOptions
from .documents import build_metadata
from .product_source import iter_product_batches
from .types import SyncSummary


async def run_sync_pipeline(
    options: SyncOptions,
    cloudflare: CloudflareConfig,
    dutchie: DutchieConfig,
) -> SyncSummary:
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

    if not options.dry_run:
        index_exists = await api.index_exists(options.index_name)
        if not index_exists:
            raise RuntimeError(
                f"Index '{options.index_name}' does not exist. "
                f"Create it first with: python manage_indexes.py --create {options.index_name}"
            )
        if options.use_d1_dedup and d1_store.configured:
            await d1_store.ensure_table(d1_table_name)

    seen_ids: Set[str] = set()
    seen_names: Set[str] = set()

    async for raw_batch in iter_product_batches(options, dutchie):
        summary.fetched_count += len(raw_batch)

        normalized_batch: List[Dict[str, Any]] = []
        for raw_product in raw_batch:
            try:
                normalized = transform_product(raw_product)
                normalized_batch.append(normalized)
                summary.transformed_count += 1
            except Exception as exc:
                summary.transform_errors += 1
                summary.errors.append(
                    {
                        "name": raw_product.get("name", "Unknown"),
                        "error": str(exc),
                    }
                )

        filtered_batch: List[Dict[str, Any]] = []
        for product in normalized_batch:
            if options.min_quantity is not None:
                quantity = product.get("quantity")
                if quantity is not None:
                    try:
                        if int(quantity) < options.min_quantity:
                            summary.low_stock_excluded += 1
                            continue
                    except (TypeError, ValueError):
                        pass

            product_id = str(product.get("id") or "").strip()
            if not product_id:
                summary.missing_id_excluded += 1
                continue

            normalized_name = normalize_product_name(str(product.get("name") or ""))
            if product_id in seen_ids:
                summary.duplicate_id_excluded += 1
                continue
            if normalized_name and normalized_name in seen_names:
                summary.duplicate_name_excluded += 1
                continue

            seen_ids.add(product_id)
            if normalized_name:
                seen_names.add(normalized_name)
            filtered_batch.append(product)

        if not options.dry_run and options.use_d1_dedup and d1_store.configured and filtered_batch:
            existing = await d1_store.get_existing(
                d1_table_name,
                product_ids=[str(product.get("id", "")) for product in filtered_batch],
                normalized_names=[normalize_product_name(str(product.get("name", ""))) for product in filtered_batch],
            )
            existing_ids = existing.get("ids", set())
            existing_names = existing.get("names", set())

            d1_filtered_batch: List[Dict[str, Any]] = []
            for product in filtered_batch:
                product_id = str(product.get("id", ""))
                normalized_name = normalize_product_name(str(product.get("name", "")))
                if product_id in existing_ids:
                    summary.d1_existing_ids_allowed += 1
                    d1_filtered_batch.append(product)
                    continue
                if normalized_name and normalized_name in existing_names:
                    summary.d1_name_excluded += 1
                    continue
                d1_filtered_batch.append(product)
            filtered_batch = d1_filtered_batch

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

        if not options.dry_run and texts:
            await api.upsert_vectors(
                index_name=options.index_name,
                texts=texts,
                metadatas=metadatas,
                ids=ids,
            )
            summary.uploaded_count += len(texts)

            if options.use_d1_dedup and d1_store.configured:
                await d1_store.upsert_seen(
                    d1_table_name,
                    [
                        {
                            "product_id": str(product.get("id", "")),
                            "normalized_name": normalize_product_name(str(product.get("name", ""))),
                            "raw_name": str(product.get("name", "")),
                            "category": str(product.get("category", "")),
                            "subcategory": str(product.get("subcategory", "")),
                        }
                        for product in filtered_batch
                    ],
                )

    return summary


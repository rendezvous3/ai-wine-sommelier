from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import List

from d1_uniques import D1UniqueStore, build_uniques_table_name

from .cloudflare_api import CloudflareApiClient
from .config import CloudflareConfig, ReconcileOptions
from .types import ReconcileSummary


def _chunked(items: List[str], size: int) -> List[List[str]]:
    return [items[index : index + size] for index in range(0, len(items), size)]


async def run_reconcile_pipeline(
    options: ReconcileOptions,
    cloudflare: CloudflareConfig,
) -> ReconcileSummary:
    summary = ReconcileSummary(
        index_name=options.index_name,
        removal_mode="last_seen_at",
    )

    d1_store = D1UniqueStore(
        account_id=cloudflare.account_id,
        database_id=cloudflare.d1_database_id,
        api_token=cloudflare.resolved_d1_token,
        timeout_seconds=cloudflare.timeout_seconds,
    )
    if not d1_store.configured:
        raise RuntimeError("D1 is not configured. Set CF_ACCOUNT_ID, CF_D1_DATABASE_ID, and token env vars.")

    table_name = build_uniques_table_name(options.index_name)
    await d1_store.ensure_table(table_name)

    cutoff = datetime.now(timezone.utc) - timedelta(hours=options.stale_hours)
    stale_ids = await d1_store.list_stale_ids(
        table_name=table_name,
        cutoff_iso=cutoff.isoformat(),
        limit=options.max_delete,
    )
    summary.candidate_removed_ids = len(stale_ids)
    summary.sample_removed_ids = stale_ids[:20]

    if options.dry_run or not stale_ids:
        return summary

    api = CloudflareApiClient(cloudflare)

    for batch in _chunked(stale_ids, options.batch_size):
        try:
            await api.delete_vectors(options.index_name, batch)
            summary.deleted_vectors += len(batch)
            summary.deleted_d1_rows += await d1_store.delete_ids(table_name, batch)
        except Exception:
            summary.failed_batches += 1

    return summary

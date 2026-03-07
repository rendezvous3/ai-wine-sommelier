"""
Stale vector reconciliation for periodic cron workflows.

Deletes vectors that were not seen recently (based on D1 last_seen_at), then
removes matching D1 ledger rows.
"""

import argparse
import os
from datetime import datetime, timedelta, timezone
from typing import Iterable, List

from dotenv import load_dotenv
from langchain_cloudflare.embeddings import CloudflareWorkersAIEmbeddings
from langchain_cloudflare.vectorstores import CloudflareVectorize

from d1_uniques import D1UniqueStore, build_uniques_table_name


def chunked(items: List[str], size: int) -> Iterable[List[str]]:
    for i in range(0, len(items), size):
        yield items[i : i + size]


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Delete stale vectors by ID using D1 last_seen_at tracking.",
    )
    parser.add_argument("--index", "-x", required=True, help="Vectorize index name")
    parser.add_argument(
        "--stale-hours",
        type=int,
        default=48,
        help="Products not seen for this many hours are considered stale (default: 48)",
    )
    parser.add_argument(
        "--max-delete",
        type=int,
        default=5000,
        help="Maximum stale IDs to process in one run (default: 5000)",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=500,
        help="Delete batch size for Vectorize API (default: 500)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview stale IDs without deleting vectors or D1 rows.",
    )
    args = parser.parse_args()

    env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
    load_dotenv(env_path)

    account_id = os.getenv("CF_ACCOUNT_ID")
    vectorize_token = os.getenv("CF_VECTORIZE_API_TOKEN")
    d1_database_id = os.getenv("CF_D1_DATABASE_ID")
    d1_token = os.getenv("CF_D1_API_TOKEN") or vectorize_token

    d1_store = D1UniqueStore(
        account_id=account_id,
        database_id=d1_database_id,
        api_token=d1_token,
    )
    if not d1_store.configured:
        raise RuntimeError("D1 is not configured. Set CF_ACCOUNT_ID, CF_D1_DATABASE_ID, and token env vars.")

    table_name = build_uniques_table_name(args.index)
    d1_store.ensure_table(table_name)

    cutoff = datetime.now(timezone.utc) - timedelta(hours=args.stale_hours)
    cutoff_iso = cutoff.isoformat()

    stale_ids = d1_store.list_stale_ids(
        table_name=table_name,
        cutoff_iso=cutoff_iso,
        limit=args.max_delete,
    )

    print("=" * 60)
    print("STALE RECONCILIATION")
    print("=" * 60)
    print(f"Index: {args.index}")
    print(f"D1 Table: {table_name}")
    print(f"Cutoff: {cutoff_iso}")
    print(f"Candidate stale IDs: {len(stale_ids)}")

    if not stale_ids:
        print("No stale vectors found.")
        return

    if args.dry_run:
        preview = stale_ids[:20]
        print("Dry run only. Sample stale IDs:")
        for stale_id in preview:
            print(f"  - {stale_id}")
        if len(stale_ids) > len(preview):
            print(f"  ... and {len(stale_ids) - len(preview)} more")
        return

    embedder = CloudflareWorkersAIEmbeddings(model_name="@cf/baai/bge-large-en-v1.5")
    vector_store = CloudflareVectorize(embedding=embedder)

    deleted_vectors = 0
    deleted_d1_rows = 0
    failed_batches = 0

    for batch in chunked(stale_ids, args.batch_size):
        try:
            vector_store.delete(
                ids=batch,
                index_name=args.index,
                include_d1=False,  # D1 table naming is custom in this project.
                wait=False,
            )
            deleted_vectors += len(batch)

            d1_deleted = d1_store.delete_ids(table_name=table_name, ids=batch)
            deleted_d1_rows += d1_deleted
        except Exception as exc:
            failed_batches += 1
            print(f"⚠️  Failed stale-delete batch ({len(batch)} ids): {exc}")
            continue

    print("-" * 60)
    print(f"Deleted vectors: {deleted_vectors}")
    print(f"Deleted D1 rows: {deleted_d1_rows}")
    print(f"Failed batches: {failed_batches}")
    print("=" * 60)


if __name__ == "__main__":
    main()

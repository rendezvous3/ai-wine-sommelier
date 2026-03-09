"""CLI entrypoint for stale vector reconciliation."""

import argparse
import asyncio

from core.config import ReconcileOptions, cloudflare_config_from_source, load_local_env
from core.reconcile import run_reconcile_pipeline


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Delete stale vectors by ID using D1 last_seen_at tracking.",
    )
    parser.add_argument("--index", "-x", required=True, help="Vectorize index name")
    parser.add_argument("--stale-hours", type=int, default=48, help="Stale threshold in hours")
    parser.add_argument("--max-delete", type=int, default=5000, help="Maximum stale IDs to process")
    parser.add_argument("--batch-size", type=int, default=500, help="Delete batch size")
    parser.add_argument("--dry-run", action="store_true", help="Preview stale IDs without deleting")
    return parser


async def async_main() -> None:
    load_local_env()
    args = build_parser().parse_args()
    cloudflare = cloudflare_config_from_source()
    summary = (
        await run_reconcile_pipeline(
            ReconcileOptions(
                index_name=args.index,
                stale_hours=args.stale_hours,
                max_delete=args.max_delete,
                batch_size=args.batch_size,
                dry_run=args.dry_run,
            ),
            cloudflare,
        )
    ).to_dict()

    print("=" * 60)
    print("STALE RECONCILIATION")
    print("=" * 60)
    print(f"Index: {summary['index_name']}")
    print(f"Candidate stale IDs: {summary['candidate_stale_ids']}")
    if args.dry_run:
        print("Dry run sample IDs:")
        for stale_id in summary["sample_stale_ids"]:
            print(f"  - {stale_id}")
    else:
        print(f"Deleted vectors: {summary['deleted_vectors']}")
        print(f"Deleted D1 rows: {summary['deleted_d1_rows']}")
        print(f"Failed batches: {summary['failed_batches']}")


def main() -> None:
    asyncio.run(async_main())


if __name__ == "__main__":
    main()


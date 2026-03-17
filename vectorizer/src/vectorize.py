"""
Local CLI entrypoint for vectorization syncs.

The actual pipeline lives in core/ so the same behavior can run locally and in
the dedicated Cloudflare worker.
"""

import argparse
import asyncio
import json

from core.config import (
    SyncOptions,
    cloudflare_config_from_source,
    dutchie_config_from_source,
    load_local_env,
    parse_limit_value,
)
from core.run_reports import D1RunReportStore
from core.pipeline import run_sync_pipeline


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Vectorize products from Dutchie API",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python vectorize.py -x products-prod --category EDIBLES --limit 20
  python vectorize.py -x products-prod --limit none --upload
  python vectorize.py -x products-prod --limit none --min-quantity 5 --upload
        """,
    )
    parser.add_argument("--category", type=str, help="Category to vectorize")
    parser.add_argument("--subcategory", type=str, help="Optional subcategory filter")
    parser.add_argument("--strain", type=str, choices=["INDICA", "SATIVA", "HYBRID"], help="Optional strain filter")
    parser.add_argument("--index", "-x", type=str, help="Vectorize index name")
    parser.add_argument("--upload", action="store_true", help="Actually upload to Vectorize")
    parser.add_argument("--local", action="store_true", help="Use local JSON files instead of the API")
    parser.add_argument("--offset", type=int, default=0, help="Starting offset")
    parser.add_argument(
        "--limit",
        type=parse_limit_value,
        default=50,
        help="Total limit of products to fetch. Use 'none' for unlimited.",
    )
    parser.add_argument(
        "--min-quantity",
        type=int,
        default=None,
        help="Exclude products where known quantity is below this threshold.",
    )
    parser.add_argument(
        "--skip-d1-dedup",
        action="store_true",
        help="Skip D1 cross-run duplicate checks and ledger writes.",
    )
    parser.add_argument("--list-categories", action="store_true", help="List supported categories and exit")
    return parser


def print_summary(summary: dict) -> None:
    print("\n" + "=" * 60)
    print("PIPELINE SUMMARY")
    print("=" * 60)
    print(f"Fetched products: {summary['fetched_count']}")
    print(f"Transformed products: {summary['transformed_count']}")
    print(f"Documents built: {summary['document_count']}")
    print(f"Uploaded vectors: {summary['uploaded_count']}")
    print(f"Transform errors: {summary['transform_errors']}")
    print(f"Excluded (low stock): {summary['low_stock_excluded']}")
    print(f"Excluded (missing ID): {summary['missing_id_excluded']}")
    print(f"Excluded (duplicate ID in run): {summary['duplicate_id_excluded']}")
    print(f"Excluded (duplicate name in run): {summary['duplicate_name_excluded']}")
    print(f"Allowed (D1 existing IDs): {summary['d1_existing_ids_allowed']}")
    print(f"Excluded (D1 duplicate name): {summary['d1_name_excluded']}")

    if summary.get("sample_document"):
        sample = summary["sample_document"]
        print("\n" + "=" * 60)
        print("SAMPLE DOCUMENT")
        print("=" * 60)
        print(
            json.dumps(
                {
                    "page_content": sample["page_content"][:500] + "..."
                    if len(sample["page_content"]) > 500
                    else sample["page_content"],
                    "metadata": sample["metadata"],
                },
                indent=2,
                default=str,
            )
        )


async def async_main() -> None:
    load_local_env()
    parser = build_parser()
    args = parser.parse_args()

    if args.list_categories:
        for category in [
            "FLOWER",
            "PRE_ROLLS",
            "EDIBLES",
            "VAPORIZERS",
            "CONCENTRATES",
            "TINCTURES",
            "CBD",
            "TOPICALS",
            "ACCESSORIES",
        ]:
            print(category)
        return

    if not args.index:
        parser.error("the following arguments are required: --index/-x")

    sync_options = SyncOptions(
        index_name=args.index,
        category=args.category,
        subcategory=args.subcategory,
        strain_type=args.strain,
        offset=args.offset,
        limit=args.limit,
        dry_run=not args.upload,
        use_api=not args.local,
        min_quantity=args.min_quantity,
        use_d1_dedup=not args.skip_d1_dedup,
        trigger_source="local",
    )

    cloudflare = cloudflare_config_from_source()
    dutchie = dutchie_config_from_source()
    report_store = D1RunReportStore(
        account_id=cloudflare.account_id,
        database_id=cloudflare.d1_database_id,
        api_token=cloudflare.resolved_d1_token,
    )
    run_id = None

    try:
        if report_store.configured:
            try:
                await report_store.ensure_table()
                run_id = await report_store.start_run(
                    trigger_source=sync_options.trigger_source,
                    index_name=sync_options.index_name,
                    min_quantity=sync_options.min_quantity,
                    limit_value=sync_options.limit,
                )
            except Exception as exc:
                print(f"Warning: run reporting unavailable, continuing without reports: {exc}")
                run_id = None

        pipeline_result = await run_sync_pipeline(sync_options, cloudflare, dutchie)
        summary = pipeline_result.summary.to_dict()
        print_summary(summary)

        if run_id:
            try:
                await report_store.finish_run(
                    run_id=run_id,
                    summary={
                        "sync": summary,
                        "indexing": summary.get("indexing", {}),
                        "exclusions": summary.get("exclusions", {}),
                        "removal": {},
                        "reconcile": {},
                    },
                    stale_deleted_count=0,
                )
            except Exception as exc:
                print(f"Warning: failed to write run report completion: {exc}")
    except Exception as exc:
        if run_id:
            try:
                await report_store.fail_run(run_id=run_id, error_message=str(exc))
            except Exception:
                pass
        raise


def main() -> None:
    asyncio.run(async_main())


if __name__ == "__main__":
    main()

from __future__ import annotations

import argparse
import asyncio
import json
from typing import List, Optional

from dotenv import load_dotenv

from core.config import load_local_env
from postrun_verify import DEFAULT_CATEGORY_CHECKS, run_postrun_verification


async def async_main() -> None:
    parser = argparse.ArgumentParser(description="Run simplified post-run verification")
    parser.add_argument("--suite", default="full", choices=["full", "categories_only", "api_only"])
    parser.add_argument("--index", required=True)
    parser.add_argument("--backend-base-url")
    parser.add_argument("--expected-trigger-source", default="manual")
    parser.add_argument("--skip-email", action="store_true")
    parser.add_argument("--env-file", help="Optional env file to load before running verification.")
    parser.add_argument(
        "--categories",
        nargs="*",
        default=None,
        help=f"Categories to verify for Dutchie chunk checks. Defaults to: {', '.join(DEFAULT_CATEGORY_CHECKS)}",
    )
    parser.add_argument("--vectorizer-run-id", help="Optional specific vectorizer run id to verify against.")
    args = parser.parse_args()

    load_local_env()
    if args.env_file:
        load_dotenv(args.env_file, override=True)

    categories: Optional[List[str]] = args.categories if args.categories else None
    summary = await run_postrun_verification(
        source=None,
        suite=args.suite,
        index_name=args.index,
        expected_trigger_source=args.expected_trigger_source,
        backend_base_url=args.backend_base_url,
        categories=categories,
        skip_email=args.skip_email,
        verification_source="manual",
        vectorizer_run_id=args.vectorizer_run_id,
    )
    print(json.dumps(summary, indent=2, default=str))


def main() -> None:
    asyncio.run(async_main())


if __name__ == "__main__":
    main()

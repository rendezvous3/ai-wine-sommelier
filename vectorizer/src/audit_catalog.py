"""Read-only audit for Dutchie -> transformed -> D1 catalog consistency."""

from __future__ import annotations

import argparse
import asyncio
import json
from collections import Counter, defaultdict
from typing import Any, DefaultDict, Dict, List

from core.audit import audit_source_product, audit_transformed_product
from core.config import (
    SyncOptions,
    cloudflare_config_from_source,
    dutchie_config_from_source,
    load_local_env,
    parse_limit_value,
    parse_optional_int,
)
from core.product_source import iter_product_batches
from d1_uniques import D1UniqueStore, build_uniques_table_name, normalize_product_name
from normalize_products import transform_product


def _sample_counter(counter: Counter[str], limit: int) -> List[Dict[str, Any]]:
    return [
        {"value": value, "count": count}
        for value, count in counter.most_common(limit)
        if count > 1
    ]


def _sample_grouped(
    grouped: DefaultDict[str, List[Dict[str, Any]]],
    limit: int,
) -> List[Dict[str, Any]]:
    samples: List[Dict[str, Any]] = []
    for key, rows in grouped.items():
        if len(rows) <= 1:
            continue
        samples.append(
            {
                "normalized_name": key,
                "count": len(rows),
                "rows": rows[:limit],
            }
        )
    samples.sort(key=lambda item: int(item["count"]), reverse=True)
    return samples[:limit]


def _sample_findings(findings: List[Dict[str, Any]], limit: int) -> List[Dict[str, Any]]:
    return findings[:limit]


async def async_main() -> None:
    load_local_env()

    parser = argparse.ArgumentParser(description="Audit Dutchie, transformed products, and D1 ledger consistency.")
    parser.add_argument("--index", "-x", required=True, help="Vectorize index name / D1 uniques table lane")
    parser.add_argument("--category", help="Optional Dutchie category filter")
    parser.add_argument("--subcategory", help="Optional Dutchie subcategory filter")
    parser.add_argument("--strain", choices=["INDICA", "SATIVA", "HYBRID"], help="Optional Dutchie strain filter")
    parser.add_argument("--offset", type=int, default=0, help="Starting Dutchie offset")
    parser.add_argument("--limit", type=parse_limit_value, default=None, help="Use 'none' for unlimited")
    parser.add_argument("--min-quantity", type=parse_optional_int, default=5, help="Minimum quantity threshold context")
    parser.add_argument("--sample-size", type=int, default=20, help="Max rows to include in each sample section")
    args = parser.parse_args()

    sync_options = SyncOptions(
        index_name=args.index,
        category=args.category,
        subcategory=args.subcategory,
        strain_type=args.strain,
        offset=args.offset,
        limit=args.limit,
        dry_run=True,
        use_api=True,
        min_quantity=args.min_quantity,
        use_d1_dedup=True,
        trigger_source="audit",
    )

    dutchie = dutchie_config_from_source()
    cloudflare = cloudflare_config_from_source()

    raw_id_counts: Counter[str] = Counter()
    raw_name_groups: DefaultDict[str, List[Dict[str, Any]]] = defaultdict(list)
    source_reason_counts: Counter[str] = Counter()
    source_hard_findings: List[Dict[str, Any]] = []

    transform_reason_counts: Counter[str] = Counter()
    transform_hard_findings: List[Dict[str, Any]] = []
    transform_exception_samples: List[Dict[str, Any]] = []
    transformed_id_counts: Counter[str] = Counter()
    transformed_name_groups: DefaultDict[str, List[Dict[str, Any]]] = defaultdict(list)
    transformed_survivors: List[Dict[str, Any]] = []
    fetched_ids: set[str] = set()

    raw_fetch_count = 0

    async for batch in iter_product_batches(sync_options, dutchie):
        raw_fetch_count += len(batch)
        for raw_product in batch:
            product_id = str(raw_product.get("id") or "").strip()
            raw_name = str(raw_product.get("name") or "").strip()
            raw_category = str(raw_product.get("category") or "").strip()
            raw_subcategory = str(raw_product.get("subcategory") or "").strip()
            normalized_raw_name = normalize_product_name(raw_name)

            if product_id:
                fetched_ids.add(product_id)
                raw_id_counts[product_id] += 1
            if normalized_raw_name:
                raw_name_groups[normalized_raw_name].append(
                    {
                        "product_id": product_id,
                        "raw_name": raw_name,
                        "category": raw_category,
                        "subcategory": raw_subcategory,
                    }
                )

            source_findings = [finding for finding in audit_source_product(raw_product) if finding.get("severity") != "warning"]
            if source_findings:
                for finding in source_findings:
                    reason_code = str(finding.get("reason_code") or "unknown")
                    source_reason_counts[reason_code] += 1
                    source_hard_findings.append(
                        {
                            "product_id": product_id,
                            "raw_name": raw_name,
                            "reason_code": reason_code,
                            "missing_fields": list(finding.get("missing_fields") or []),
                        }
                    )
                continue

            try:
                normalized = transform_product(raw_product)
            except Exception as exc:
                transform_reason_counts["transform_exception"] += 1
                transform_exception_samples.append(
                    {
                        "product_id": product_id,
                        "raw_name": raw_name,
                        "error": str(exc),
                    }
                )
                continue

            transform_findings = [
                finding for finding in audit_transformed_product(raw_product, normalized)
                if finding.get("severity") != "warning"
            ]
            if transform_findings:
                for finding in transform_findings:
                    reason_code = str(finding.get("reason_code") or "unknown")
                    transform_reason_counts[reason_code] += 1
                    transform_hard_findings.append(
                        {
                            "product_id": str(normalized.get("id") or product_id or "").strip(),
                            "raw_name": str(normalized.get("name") or raw_name).strip(),
                            "reason_code": reason_code,
                            "missing_fields": list(finding.get("missing_fields") or []),
                            "details": finding.get("details") or {},
                        }
                    )
                continue

            transformed_id = str(normalized.get("id") or "").strip()
            transformed_name = str(normalized.get("name") or "").strip()
            transformed_category = str(normalized.get("category") or "").strip()
            transformed_subcategory = str(normalized.get("subcategory") or "").strip()
            normalized_transformed_name = normalize_product_name(transformed_name)

            if transformed_id:
                transformed_id_counts[transformed_id] += 1
            if normalized_transformed_name:
                transformed_name_groups[normalized_transformed_name].append(
                    {
                        "product_id": transformed_id,
                        "raw_name": transformed_name,
                        "category": transformed_category,
                        "subcategory": transformed_subcategory,
                    }
                )

            transformed_survivors.append(
                {
                    "product_id": transformed_id,
                    "raw_name": transformed_name,
                    "normalized_name": normalized_transformed_name,
                    "category": transformed_category,
                    "subcategory": transformed_subcategory,
                }
            )

    d1_summary: Dict[str, Any] = {
        "configured": False,
        "row_count": 0,
        "demo_id_count": 0,
        "duplicate_id_count": 0,
        "duplicate_name_count": 0,
        "missing_from_dutchie_count": 0,
        "transformed_name_conflict_count": 0,
        "samples": {},
    }

    if cloudflare.d1_configured:
        d1_store = D1UniqueStore(
            account_id=cloudflare.account_id,
            database_id=cloudflare.d1_database_id,
            api_token=cloudflare.resolved_d1_token,
            timeout_seconds=cloudflare.timeout_seconds,
        )
        table_name = build_uniques_table_name(args.index)
        d1_summary["configured"] = True
        try:
            d1_rows = await d1_store.list_rows(table_name)
            d1_summary["row_count"] = len(d1_rows)

            d1_id_counts: Counter[str] = Counter()
            d1_name_groups: DefaultDict[str, List[Dict[str, Any]]] = defaultdict(list)
            d1_rows_by_name: DefaultDict[str, List[Dict[str, Any]]] = defaultdict(list)
            demo_id_rows: List[Dict[str, Any]] = []

            for row in d1_rows:
                row_id = str(row.get("product_id") or "").strip()
                row_name = str(row.get("normalized_name") or "").strip()
                if row_id:
                    d1_id_counts[row_id] += 1
                if row_name:
                    d1_name_groups[row_name].append(
                        {
                            "product_id": row_id,
                            "raw_name": str(row.get("raw_name") or "").strip(),
                            "category": str(row.get("category") or "").strip(),
                            "subcategory": str(row.get("subcategory") or "").strip(),
                        }
                    )
                    d1_rows_by_name[row_name].append(row)
                if row_id.startswith("demo-prod-"):
                    demo_id_rows.append(
                        {
                            "product_id": row_id,
                            "raw_name": str(row.get("raw_name") or "").strip(),
                            "normalized_name": row_name,
                        }
                    )

            missing_from_dutchie = [
                str(row.get("product_id") or "").strip()
                for row in d1_rows
                if str(row.get("product_id") or "").strip()
                and str(row.get("product_id") or "").strip() not in fetched_ids
            ]

            transformed_name_conflicts: List[Dict[str, Any]] = []
            for row in transformed_survivors:
                product_id = str(row.get("product_id") or "").strip()
                normalized_name = str(row.get("normalized_name") or "").strip()
                if not product_id or not normalized_name:
                    continue
                owners = d1_rows_by_name.get(normalized_name, [])
                if owners and all(str(owner.get("product_id") or "").strip() != product_id for owner in owners):
                    transformed_name_conflicts.append(
                        {
                            "product_id": product_id,
                            "raw_name": row.get("raw_name"),
                            "normalized_name": normalized_name,
                            "d1_owner_ids": [str(owner.get("product_id") or "").strip() for owner in owners][: args.sample_size],
                        }
                    )

            d1_summary.update(
                {
                    "duplicate_id_count": sum(1 for count in d1_id_counts.values() if count > 1),
                    "duplicate_name_count": sum(1 for rows in d1_name_groups.values() if len(rows) > 1),
                    "demo_id_count": len(demo_id_rows),
                    "missing_from_dutchie_count": len(missing_from_dutchie),
                    "transformed_name_conflict_count": len(transformed_name_conflicts),
                    "samples": {
                        "duplicate_ids": _sample_counter(d1_id_counts, args.sample_size),
                        "duplicate_names": _sample_grouped(d1_name_groups, args.sample_size),
                        "demo_id_rows": demo_id_rows[: args.sample_size],
                        "missing_from_dutchie": missing_from_dutchie[: args.sample_size],
                        "transformed_name_conflicts": transformed_name_conflicts[: args.sample_size],
                    },
                }
            )
        except Exception as exc:
            d1_summary["error"] = str(exc)

    payload = {
        "ok": True,
        "index_name": args.index,
        "filters": {
            "category": args.category,
            "subcategory": args.subcategory,
            "strain": args.strain,
            "offset": args.offset,
            "limit": args.limit,
            "min_quantity": args.min_quantity,
        },
        "raw_dutchie": {
            "fetch_count": raw_fetch_count,
            "distinct_id_count": len(raw_id_counts),
            "distinct_name_count": len(raw_name_groups),
            "duplicate_id_count": sum(1 for count in raw_id_counts.values() if count > 1),
            "duplicate_name_count": sum(1 for rows in raw_name_groups.values() if len(rows) > 1),
            "source_hard_omit_count": len(source_hard_findings),
            "source_hard_omit_reasons": dict(source_reason_counts),
            "samples": {
                "duplicate_ids": _sample_counter(raw_id_counts, args.sample_size),
                "duplicate_names": _sample_grouped(raw_name_groups, args.sample_size),
                "source_hard_omits": _sample_findings(source_hard_findings, args.sample_size),
            },
        },
        "transformed": {
            "survivor_count": len(transformed_survivors),
            "distinct_id_count": len(transformed_id_counts),
            "distinct_name_count": len(transformed_name_groups),
            "duplicate_id_count": sum(1 for count in transformed_id_counts.values() if count > 1),
            "duplicate_name_count": sum(1 for rows in transformed_name_groups.values() if len(rows) > 1),
            "hard_omit_count": len(transform_hard_findings),
            "hard_omit_reasons": dict(transform_reason_counts),
            "samples": {
                "duplicate_ids": _sample_counter(transformed_id_counts, args.sample_size),
                "duplicate_names": _sample_grouped(transformed_name_groups, args.sample_size),
                "hard_omits": _sample_findings(transform_hard_findings, args.sample_size),
                "transform_exceptions": _sample_findings(transform_exception_samples, args.sample_size),
            },
        },
        "d1": d1_summary,
        "notes": [
            "This audit is read-only for Dutchie and D1.",
            "Vectorize full inventory enumeration is not implemented in current local tooling, so stale orphaned vectors must be inferred from live search results and D1 drift.",
        ],
    }

    print(json.dumps(payload, indent=2, default=str))


def main() -> None:
    asyncio.run(async_main())


if __name__ == "__main__":
    main()

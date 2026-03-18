from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Iterable, List, Optional, Sequence

import httpx

from core.audit import audit_source_product, audit_transformed_product
from core.config import cloudflare_config_from_source, dutchie_config_from_source
from core.postrun_reports import D1PostrunVerificationStore
from core.run_reports import D1RunReportStore
from d1_uniques import D1UniqueStore, build_uniques_table_name, normalize_product_name
from dutchie_client import DutchieClient
from normalize_products import transform_product


DEFAULT_CATEGORY_CHECKS = ["FLOWER", "PRE_ROLLS", "EDIBLES", "CONCENTRATES"]
DEFAULT_CATEGORY_FETCH_LIMIT = 10
DEFAULT_CATEGORY_COMPARE_LIMIT = 5
SCHEDULED_RECENCY_MINUTES = 30


def _to_int(value: Any) -> int:
    if value is None or value == "":
        return 0
    return int(value)


def _coerce_str_list(value: Any) -> List[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [str(item).strip().lower() for item in value if str(item).strip()]
    normalized = str(value).strip().lower()
    return [normalized] if normalized else []


def _has_hard_findings(findings: Sequence[Dict[str, Any]]) -> bool:
    return any(str(finding.get("severity") or "warning") != "warning" for finding in findings)


def _extract_sync_summary(latest_run: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    run_summary = _extract_run_summary(latest_run)
    sync_summary = run_summary.get("sync")
    return sync_summary if isinstance(sync_summary, dict) else {}


def _extract_run_summary(latest_run: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    if not latest_run:
        return {}
    raw_summary = latest_run.get("summary_json")
    if not raw_summary:
        return {}
    try:
        parsed = json.loads(str(raw_summary))
    except (TypeError, ValueError, json.JSONDecodeError):
        return {}
    return parsed if isinstance(parsed, dict) else {}


def _chat_endpoint(base_url: str, route: str) -> str:
    cleaned = (base_url or "").rstrip("/")
    if not cleaned:
        raise ValueError("backend_base_url is required for API verification.")
    if cleaned.endswith("/chat"):
        return f"{cleaned}/{route}"
    return f"{cleaned}/chat/{route}"


async def _post_json(url: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(url, json=payload)
        response.raise_for_status()
        return response.json()


def _decode_event_json(value: Any) -> Dict[str, Any]:
    if not value:
        return {}
    if isinstance(value, dict):
        return value
    try:
        parsed = json.loads(str(value))
    except (TypeError, ValueError, json.JSONDecodeError):
        return {}
    return parsed if isinstance(parsed, dict) else {}


def _format_delta_line(event: Dict[str, Any]) -> str:
    previous_state = _decode_event_json(event.get("previous_state_json"))
    current_state = _decode_event_json(event.get("current_state_json"))
    details = _decode_event_json(event.get("details_json"))
    product_id = event.get("product_id") or "n/a"
    raw_name = event.get("raw_name") or current_state.get("raw_name") or previous_state.get("raw_name") or "n/a"
    category = event.get("category") or current_state.get("category") or previous_state.get("category") or ""
    subcategory = event.get("subcategory") or current_state.get("subcategory") or previous_state.get("subcategory") or ""
    reason = event.get("reason") or ""
    reason_code = event.get("reason_code") or reason
    reason_label = event.get("reason_label") or reason_code
    event_type = event.get("event_type") or ""
    stage = event.get("stage") or ""
    severity = event.get("severity") or ""

    if event_type == "removed":
        return (
            f"{product_id} | {raw_name} | {category}/{subcategory} | reason={reason} "
            f"| previous_quantity={previous_state.get('quantity')} | previous_price={previous_state.get('price')}"
        )

    if event_type == "indexed_new":
        return (
            f"{product_id} | {raw_name} | {category}/{subcategory} "
            f"| quantity={current_state.get('quantity')} | price={current_state.get('price')}"
        )

    if event_type == "indexed_updated":
        changed_fields = details.get("changed_fields", [])
        diffs = [
            f"{field}: {previous_state.get(field)} -> {current_state.get(field)}"
            for field in changed_fields
        ]
        return f"{product_id} | {raw_name} | changed_fields={changed_fields} | " + "; ".join(diffs)

    parts = [f"{product_id} | {raw_name}"]
    if category or subcategory:
        parts.append(f"{category}/{subcategory}")
    parts.append(f"reason={reason_code}")
    if reason_label and reason_label != reason_code:
        parts.append(f"label={reason_label}")
    if stage:
        parts.append(f"stage={stage}")
    if severity:
        parts.append(f"severity={severity}")

    missing_fields = details.get("missing_fields") or []
    if missing_fields:
        parts.append(f"missing_fields={missing_fields}")

    if reason_code == "potency_anomaly":
        potency_bits = {
            "source_classification": details.get("source_classification"),
            "source_total_mg": details.get("source_total_mg"),
            "text_total_mg": details.get("text_total_mg"),
            "text_per_unit_mg": details.get("text_per_unit_mg"),
            "pack_count": details.get("pack_count"),
            "reason": details.get("reason"),
        }
        parts.append(f"potency={json.dumps(potency_bits, default=str)}")

    if not missing_fields and details:
        parts.append(f"details={json.dumps(details, default=str)}")

    return " | ".join(parts)


async def _send_run_email(
    env: Any,
    summary: Dict[str, Any],
    delta_events: Sequence[Dict[str, Any]],
) -> bool:
    api_key = getattr(env, "RESEND_API_KEY", None)
    alert_to = getattr(env, "VERIFY_ALERT_TO", None)
    alert_from = getattr(env, "VERIFY_ALERT_FROM", None)
    if not api_key or not alert_to or not alert_from:
        return False

    subject = (
        f"[Cannavita QA Sync][{summary.get('index_name', 'unknown')}]"
        f"[{summary.get('source', 'unknown')}]"
        f"[{summary.get('status', 'unknown')}]"
    )

    grouped_events: Dict[str, List[Dict[str, Any]]] = {
        "removed": [event for event in delta_events if event.get("event_type") == "removed"],
        "added": [event for event in delta_events if event.get("event_type") == "indexed_new"],
        "updated": [event for event in delta_events if event.get("event_type") == "indexed_updated"],
        "excluded": [event for event in delta_events if event.get("event_type") == "excluded"],
        "warning": [event for event in delta_events if event.get("event_type") == "warning"],
    }
    failed_checks = [check for check in summary.get("checks", []) if check.get("status") == "failed"]
    text_lines = [
        f"Verification ID: {summary.get('verification_id', 'n/a')}",
        f"Suite: {summary.get('suite', 'n/a')}",
        f"Source: {summary.get('source', 'n/a')}",
        f"Index: {summary.get('index_name', 'n/a')}",
        f"Vectorizer run: {summary.get('vectorizer_run_id', 'n/a')}",
        f"Status: {summary.get('status', 'unknown')}",
        f"Active unique count: {summary.get('active_unique_count', 'n/a')}",
        f"Expected active delta: {summary.get('expected_active_delta', 'n/a')}",
        f"Actual active delta: {summary.get('actual_active_delta', 'n/a')}",
        "",
        "Removed:",
    ]
    text_lines.extend(
        [f"- {_format_delta_line(event)}" for event in grouped_events["removed"]]
        or ["- none"]
    )
    text_lines.extend(
        [
            "",
            "Added:",
            *([f"- {_format_delta_line(event)}" for event in grouped_events["added"]] or ["- none"]),
            "",
            "Updated:",
            *([f"- {_format_delta_line(event)}" for event in grouped_events["updated"]] or ["- none"]),
            "",
            "Excluded:",
            *([f"- {_format_delta_line(event)}" for event in grouped_events["excluded"]] or ["- none"]),
            "",
            "Warnings:",
            *([f"- {_format_delta_line(event)}" for event in grouped_events["warning"]] or ["- none"]),
            "",
            "Failed checks:",
            *(
                [
                    f"- {check.get('check_id')}: {json.dumps(check.get('details', {}), default=str)}"
                    for check in failed_checks
                ]
                or ["- none"]
            ),
        ]
    )

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "from": alert_from,
                "to": [alert_to],
                "subject": subject,
                "text": "\n".join(text_lines),
            },
        )
        response.raise_for_status()
    return True


async def run_postrun_verification(
    *,
    source: Any,
    suite: str = "full",
    index_name: str,
    expected_trigger_source: Optional[str] = None,
    backend_base_url: Optional[str] = None,
    categories: Optional[Sequence[str]] = None,
    skip_email: bool = False,
    verification_source: str = "manual",
    vectorizer_run_id: Optional[str] = None,
) -> Dict[str, Any]:
    cloudflare = cloudflare_config_from_source(source)
    dutchie = dutchie_config_from_source(source)
    backend_base_url = backend_base_url or getattr(source, "BACKEND_BASE_URL", None)
    normalized_suite = (suite or "full").strip().lower()
    if normalized_suite not in {"full", "categories_only", "api_only"}:
        raise ValueError("suite must be one of: full, categories_only, api_only")

    verifier_store = D1PostrunVerificationStore(
        account_id=cloudflare.account_id,
        database_id=cloudflare.d1_database_id,
        api_token=cloudflare.resolved_d1_token,
    )
    run_store = D1RunReportStore(
        account_id=cloudflare.account_id,
        database_id=cloudflare.d1_database_id,
        api_token=cloudflare.resolved_d1_token,
    )
    unique_store = D1UniqueStore(
        account_id=cloudflare.account_id,
        database_id=cloudflare.d1_database_id,
        api_token=cloudflare.resolved_d1_token,
    )

    if normalized_suite in {"full", "categories_only"} and not (verifier_store.configured and run_store.configured and unique_store.configured):
        raise RuntimeError("D1 configuration is required for full or categories_only verification.")
    if normalized_suite in {"full", "api_only"} and not backend_base_url:
        raise ValueError("backend_base_url is required for full or api_only verification.")

    if verifier_store.configured:
        await verifier_store.ensure_tables()

    verification_id: Optional[str] = None
    checks: List[Dict[str, Any]] = []
    active_unique_count: Optional[int] = None
    previous_active_unique_count: Optional[int] = None
    expected_active_delta: Optional[int] = None
    actual_active_delta: Optional[int] = None
    vectorizer_finished_at: Optional[str] = None
    current_run_id: Optional[str] = None
    delta_events: List[Dict[str, Any]] = []

    if verifier_store.configured:
        verification_id = await verifier_store.start_run(
            source=verification_source,
            suite=normalized_suite,
            index_name=index_name,
            expected_trigger_source=expected_trigger_source,
            vectorizer_run_id=vectorizer_run_id,
            vectorizer_finished_at=None,
        )

    async def record_check(check_id: str, status: str, details: Dict[str, Any]) -> None:
        entry = {"check_id": check_id, "status": status, "details": details}
        checks.append(entry)
        if verification_id and verifier_store.configured:
            await verifier_store.record_check(verification_id, check_id, status, details)

    try:
        latest_run: Optional[Dict[str, Any]] = None
        min_quantity = _to_int(getattr(source, "MIN_QUANTITY", None) or 5)

        if normalized_suite in {"full", "categories_only"}:
            await run_store.ensure_table()
            latest_run = await (run_store.get_run(vectorizer_run_id) if vectorizer_run_id else run_store.get_latest_run())

            if not latest_run:
                await record_check("latest_run", "failed", {"reason": "no_vectorizer_run_found"})
                raise RuntimeError("No vectorizer run found for verification.")

            current_run_id = latest_run.get("run_id")
            vectorizer_finished_at = latest_run.get("finished_at")
            min_quantity = _to_int(latest_run.get("min_quantity") or min_quantity)

            preflight_errors: List[str] = []
            if latest_run.get("status") != "success":
                preflight_errors.append(f"latest_run_status={latest_run.get('status')}")
            if latest_run.get("index_name") != index_name:
                preflight_errors.append(
                    f"index_mismatch expected={index_name} actual={latest_run.get('index_name')}"
                )
            if expected_trigger_source and expected_trigger_source != "any":
                if latest_run.get("trigger_source") != expected_trigger_source:
                    preflight_errors.append(
                        "trigger_source_mismatch "
                        f"expected={expected_trigger_source} actual={latest_run.get('trigger_source')}"
                    )
            if verification_source == "scheduled_postrun" and vectorizer_finished_at:
                finished_at = datetime.fromisoformat(str(vectorizer_finished_at).replace("Z", "+00:00"))
                age = datetime.now(timezone.utc) - finished_at
                if age > timedelta(minutes=SCHEDULED_RECENCY_MINUTES):
                    preflight_errors.append(
                        f"run_not_recent age_minutes={round(age.total_seconds() / 60, 2)}"
                    )

            if preflight_errors:
                await record_check(
                    "latest_run",
                    "failed",
                    {
                        "errors": preflight_errors,
                        "run_id": current_run_id,
                        "trigger_source": latest_run.get("trigger_source"),
                        "finished_at": vectorizer_finished_at,
                    },
                )
                raise RuntimeError("Latest vectorizer run failed preflight checks.")

            await record_check(
                "latest_run",
                "passed",
                {
                    "run_id": current_run_id,
                    "trigger_source": latest_run.get("trigger_source"),
                    "finished_at": vectorizer_finished_at,
                    "status": latest_run.get("status"),
                },
            )

            table_name = build_uniques_table_name(index_name)
            await unique_store.ensure_table(table_name)
            active_unique_count = await unique_store.count_rows(table_name)

            run_summary = _extract_run_summary(latest_run)
            sync_summary = _extract_sync_summary(latest_run)
            indexing_summary = run_summary.get("indexing", {}) if isinstance(run_summary.get("indexing"), dict) else {}
            removal_summary = run_summary.get("removal", {}) if isinstance(run_summary.get("removal"), dict) else {}
            delta_events = await run_store.get_run_events(current_run_id) if current_run_id else []

            uploaded_count = _to_int(latest_run.get("uploaded_count") or sync_summary.get("uploaded_count"))
            updated_existing_count = _to_int(
                latest_run.get("d1_existing_ids_allowed")
                or sync_summary.get("d1_existing_ids_allowed")
            )
            stale_deleted_count = _to_int(latest_run.get("stale_deleted_count"))
            added_count = _to_int(indexing_summary.get("new_count"))
            if added_count == 0 and uploaded_count:
                added_count = max(uploaded_count - updated_existing_count, 0)
            updated_count = _to_int(indexing_summary.get("updated_count"))
            missing_from_fetch_count = _to_int(
                latest_run.get("missing_from_fetch_count")
                or removal_summary.get("missing_from_fetch_count")
            )
            low_stock_removed_count = _to_int(
                latest_run.get("low_stock_removed_count")
                or removal_summary.get("low_stock_removed_count")
            )
            if missing_from_fetch_count == 0 and low_stock_removed_count == 0:
                missing_from_fetch_count = max(stale_deleted_count, 0)

            previous = await verifier_store.get_latest_count_baseline_for_index(
                index_name,
                exclude_vectorizer_run_id=current_run_id,
            ) if verifier_store.configured else None
            if previous and previous.get("active_unique_count") is not None:
                previous_active_unique_count = _to_int(previous.get("active_unique_count"))
                expected_active_delta = added_count - missing_from_fetch_count - low_stock_removed_count
                actual_active_delta = active_unique_count - previous_active_unique_count
                full_reseed_detected = (
                    previous_active_unique_count > 0
                    and active_unique_count == added_count
                    and uploaded_count == active_unique_count
                    and updated_count == 0
                    and updated_existing_count == 0
                    and stale_deleted_count == 0
                    and missing_from_fetch_count == 0
                    and low_stock_removed_count == 0
                )
                if full_reseed_detected:
                    await record_check(
                        "count_reconciliation",
                        "skipped",
                        {
                            "reason": "full_reseed_detected",
                            "active_unique_count": active_unique_count,
                            "previous_active_unique_count": previous_active_unique_count,
                            "expected_active_delta": expected_active_delta,
                            "actual_active_delta": actual_active_delta,
                            "new_count": added_count,
                            "updated_count": updated_count,
                            "uploaded_count": uploaded_count,
                            "updated_existing_count": updated_existing_count,
                            "stale_deleted_count": stale_deleted_count,
                            "missing_from_fetch_count": missing_from_fetch_count,
                            "low_stock_removed_count": low_stock_removed_count,
                        },
                    )
                elif actual_active_delta == expected_active_delta:
                    await record_check(
                        "count_reconciliation",
                        "passed",
                        {
                            "active_unique_count": active_unique_count,
                            "previous_active_unique_count": previous_active_unique_count,
                            "expected_active_delta": expected_active_delta,
                            "actual_active_delta": actual_active_delta,
                            "new_count": added_count,
                            "updated_count": updated_count,
                            "uploaded_count": uploaded_count,
                            "updated_existing_count": updated_existing_count,
                            "stale_deleted_count": stale_deleted_count,
                            "missing_from_fetch_count": missing_from_fetch_count,
                            "low_stock_removed_count": low_stock_removed_count,
                        },
                    )
                else:
                    await record_check(
                        "count_reconciliation",
                        "failed",
                        {
                            "active_unique_count": active_unique_count,
                            "previous_active_unique_count": previous_active_unique_count,
                            "expected_active_delta": expected_active_delta,
                            "actual_active_delta": actual_active_delta,
                            "new_count": added_count,
                            "updated_count": updated_count,
                            "uploaded_count": uploaded_count,
                            "updated_existing_count": updated_existing_count,
                            "stale_deleted_count": stale_deleted_count,
                            "missing_from_fetch_count": missing_from_fetch_count,
                            "low_stock_removed_count": low_stock_removed_count,
                        },
                    )
            else:
                await record_check(
                    "count_reconciliation",
                    "skipped",
                    {
                        "reason": "no_previous_successful_verification",
                        "active_unique_count": active_unique_count,
                        "new_count": added_count,
                        "updated_count": updated_count,
                        "uploaded_count": uploaded_count,
                        "updated_existing_count": updated_existing_count,
                        "stale_deleted_count": stale_deleted_count,
                        "missing_from_fetch_count": missing_from_fetch_count,
                        "low_stock_removed_count": low_stock_removed_count,
                    },
                )

            if delta_events:
                removed_events = [event for event in delta_events if event.get("event_type") == "removed" and event.get("status") == "applied"]
                removed_missing_count = sum(1 for event in removed_events if event.get("reason") == "missing_from_fetch")
                removed_low_stock_count = sum(1 for event in removed_events if event.get("reason") == "low_stock")
                expected_removed = missing_from_fetch_count + low_stock_removed_count
                if removed_missing_count == missing_from_fetch_count and removed_low_stock_count == low_stock_removed_count and len(removed_events) == expected_removed:
                    await record_check(
                        "removal_audit_consistency",
                        "passed",
                        {
                            "removed_event_count": len(removed_events),
                            "missing_from_fetch_count": missing_from_fetch_count,
                            "low_stock_removed_count": low_stock_removed_count,
                        },
                    )
                else:
                    await record_check(
                        "removal_audit_consistency",
                        "failed",
                        {
                            "removed_event_count": len(removed_events),
                            "missing_from_fetch_count": missing_from_fetch_count,
                            "low_stock_removed_count": low_stock_removed_count,
                            "removed_missing_event_count": removed_missing_count,
                            "removed_low_stock_event_count": removed_low_stock_count,
                        },
                    )

            if normalized_suite in {"full", "categories_only"}:
                category_checks = [str(category).upper() for category in (categories or DEFAULT_CATEGORY_CHECKS)]
                async with DutchieClient(
                    api_key=dutchie.api_key,
                    retailer_id=dutchie.retailer_id,
                    ssl_verify=dutchie.ssl_verify,
                ) as dutchie_client:
                    for category in category_checks:
                        check_id = f"dutchie_{category.lower()}_top5"
                        raw_products = await dutchie_client.fetch_products_by_category(
                            category=category,
                            limit=DEFAULT_CATEGORY_FETCH_LIMIT,
                            offset=0,
                        )

                        transformed_products: List[Dict[str, Any]] = []
                        transform_errors: List[str] = []
                        source_hard_omit_count = 0
                        transform_hard_omit_count = 0
                        duplicate_sample_skip_count = 0
                        seen_ids: set[str] = set()
                        seen_names: set[str] = set()
                        for raw_product in raw_products:
                            source_findings = audit_source_product(raw_product)
                            if _has_hard_findings(source_findings):
                                source_hard_omit_count += 1
                                continue
                            try:
                                transformed = transform_product(raw_product)
                            except Exception as exc:
                                transform_errors.append(f"{raw_product.get('id')}: {exc}")
                                continue

                            transform_findings = audit_transformed_product(raw_product, transformed)
                            if _has_hard_findings(transform_findings):
                                transform_hard_omit_count += 1
                                continue

                            product_id = transformed.get("id")
                            quantity = _to_int(transformed.get("quantity"))
                            if not product_id:
                                continue
                            if quantity < min_quantity:
                                continue

                            normalized_name = normalize_product_name(str(transformed.get("name") or ""))
                            if product_id in seen_ids or (normalized_name and normalized_name in seen_names):
                                duplicate_sample_skip_count += 1
                                continue

                            seen_ids.add(str(product_id))
                            if normalized_name:
                                seen_names.add(normalized_name)
                            transformed_products.append(transformed)

                        comparable = transformed_products[:DEFAULT_CATEGORY_COMPARE_LIMIT]
                        if not comparable:
                            await record_check(
                                check_id,
                                "skipped",
                                {
                                    "reason": "no_comparable_products",
                                    "raw_fetched": len(raw_products),
                                    "transformed_count": len(transformed_products),
                                    "transform_errors": transform_errors[:5],
                                    "source_hard_omit_count": source_hard_omit_count,
                                    "transform_hard_omit_count": transform_hard_omit_count,
                                    "duplicate_sample_skip_count": duplicate_sample_skip_count,
                                    "min_quantity": min_quantity,
                                },
                            )
                            continue

                        rows = await unique_store.get_rows_by_ids(
                            table_name,
                            [product["id"] for product in comparable],
                        )
                        row_map = {
                            str(row.get("product_id")): row
                            for row in rows
                            if row.get("product_id")
                        }
                        mismatches: List[Dict[str, Any]] = []

                        for product in comparable:
                            product_id = str(product.get("id"))
                            row = row_map.get(product_id)
                            if not row:
                                mismatches.append({"product_id": product_id, "error": "missing_d1_row"})
                                continue

                            product_name = str(product.get("name", ""))
                            product_category = str(product.get("category", ""))
                            product_subcategory = str(product.get("subcategory", "") or "")
                            if str(row.get("raw_name", "")) != product_name:
                                mismatches.append(
                                    {
                                        "product_id": product_id,
                                        "error": "name_mismatch",
                                        "expected": product_name,
                                        "actual": row.get("raw_name"),
                                    }
                                )
                            if str(row.get("category", "")) != product_category:
                                mismatches.append(
                                    {
                                        "product_id": product_id,
                                        "error": "category_mismatch",
                                        "expected": product_category,
                                        "actual": row.get("category"),
                                    }
                                )
                            row_subcategory = str(row.get("subcategory", "") or "")
                            if product_subcategory and row_subcategory != product_subcategory:
                                mismatches.append(
                                    {
                                        "product_id": product_id,
                                        "error": "subcategory_mismatch",
                                        "expected": product_subcategory,
                                        "actual": row_subcategory,
                                    }
                                )

                        details = {
                            "raw_fetched": len(raw_products),
                            "transformed_count": len(transformed_products),
                            "compared_count": len(comparable),
                            "transform_errors": transform_errors[:5],
                            "source_hard_omit_count": source_hard_omit_count,
                            "transform_hard_omit_count": transform_hard_omit_count,
                            "duplicate_sample_skip_count": duplicate_sample_skip_count,
                            "sample_product_ids": [product["id"] for product in comparable],
                        }
                        if mismatches:
                            details["mismatches"] = mismatches[:10]
                            await record_check(check_id, "failed", details)
                        else:
                            await record_check(check_id, "passed", details)

        if normalized_suite in {"full", "api_only"}:
            intent_payload = {
                "messages": [
                    {"role": "assistant", "content": "Welcome to Cannavita!"},
                    {"role": "user", "content": "Can you recommend relaxing pre-rolls?"},
                    {
                        "role": "assistant",
                        "content": (
                            "I completely understand what you're looking for - relaxing prerolls. "
                            "Let me check what we have that matches your preferences."
                        ),
                    },
                ]
            }
            intent_response = await _post_json(_chat_endpoint(backend_base_url, "intent"), intent_payload)
            intent_categories = _coerce_str_list(intent_response.get("filters", {}).get("category"))
            intent_effects = _coerce_str_list(intent_response.get("filters", {}).get("effects"))
            if (
                intent_response.get("intent") == "recommendation"
                and "prerolls" in intent_categories
                and "relaxed" in intent_effects
            ):
                await record_check(
                    "api_intent_relaxing_prerolls",
                    "passed",
                    {
                        "intent": intent_response.get("intent"),
                        "filters": intent_response.get("filters", {}),
                        "semantic_search": intent_response.get("semantic_search"),
                    },
                )
            else:
                await record_check(
                    "api_intent_relaxing_prerolls",
                    "failed",
                    {
                        "intent": intent_response.get("intent"),
                        "filters": intent_response.get("filters", {}),
                        "semantic_search": intent_response.get("semantic_search"),
                    },
                )

            recommendations_payload = {
                "messages": [
                    {"role": "user", "content": "What edible is best for sleep?"},
                    {
                        "role": "assistant",
                        "content": (
                            "I completely understand what you're looking for - sleepy edibles. "
                            "Let me check what we have that matches your preferences."
                        ),
                    },
                ],
                "filters": {"category": "edibles", "effects": ["sleepy"]},
                "semantic_search": "sleepy edibles",
            }
            recommendations_response = await _post_json(
                _chat_endpoint(backend_base_url, "recommendations"),
                recommendations_payload,
            )
            recommendations = recommendations_response.get("recommendations") or []
            first_category = ""
            first_name = ""
            if recommendations:
                first_category = str(recommendations[0].get("category", "")).lower()
                first_name = str(recommendations[0].get("name", ""))
            recommendations_valid = bool(recommendations) and all(
                all(field in recommendation for field in ("id", "name", "category"))
                for recommendation in recommendations
            )
            if recommendations_valid and first_category == "edibles":
                await record_check(
                    "api_recommendations_sleepy_edibles",
                    "passed",
                    {
                        "count": len(recommendations),
                        "top_name": first_name,
                        "top_category": first_category,
                    },
                )
            else:
                await record_check(
                    "api_recommendations_sleepy_edibles",
                    "failed",
                    {
                        "count": len(recommendations),
                        "top_name": first_name,
                        "top_category": first_category,
                        "response_keys": list(recommendations_response.keys()),
                    },
                )

        failed_checks = [check for check in checks if check["status"] == "failed"]
        overall_status = "failed" if failed_checks else "passed"
        summary = {
            "verification_id": verification_id,
            "source": verification_source,
            "suite": normalized_suite,
            "index_name": index_name,
            "vectorizer_run_id": current_run_id or vectorizer_run_id,
            "vectorizer_finished_at": vectorizer_finished_at,
            "active_unique_count": active_unique_count,
            "previous_active_unique_count": previous_active_unique_count,
            "expected_active_delta": expected_active_delta,
            "actual_active_delta": actual_active_delta,
            "checks": checks,
            "failed_check_ids": [check["check_id"] for check in failed_checks],
        }

        email_sent = False
        if not skip_email:
            if verification_source == "scheduled_postrun":
                email_sent = await _send_run_email(source, {**summary, "status": overall_status}, delta_events)
            elif overall_status == "failed":
                email_sent = await _send_run_email(source, {**summary, "status": overall_status}, delta_events)

        if verification_id and verifier_store.configured:
            await verifier_store.finish_run(
                verification_id,
                status=overall_status,
                active_unique_count=active_unique_count,
                previous_active_unique_count=previous_active_unique_count,
                expected_active_delta=expected_active_delta,
                actual_active_delta=actual_active_delta,
                summary=summary,
                email_sent=email_sent,
            )

        summary["status"] = overall_status
        summary["email_sent"] = email_sent
        return summary
    except Exception as exc:
        summary = {
            "verification_id": verification_id,
            "source": verification_source,
            "suite": normalized_suite,
            "index_name": index_name,
            "vectorizer_run_id": current_run_id or vectorizer_run_id,
            "vectorizer_finished_at": vectorizer_finished_at,
            "active_unique_count": active_unique_count,
            "previous_active_unique_count": previous_active_unique_count,
            "expected_active_delta": expected_active_delta,
            "actual_active_delta": actual_active_delta,
            "checks": checks,
            "error": str(exc),
        }
        email_sent = False
        if not skip_email:
            try:
                if verification_source == "scheduled_postrun":
                    email_sent = await _send_run_email(source, {**summary, "status": "failed"}, delta_events)
                else:
                    email_sent = await _send_run_email(source, {**summary, "status": "failed"}, delta_events)
            except Exception:
                email_sent = False
        if verification_id and verifier_store.configured:
            await verifier_store.fail_run(
                verification_id,
                error_message=str(exc),
                summary=summary,
                email_sent=email_sent,
            )
        summary["status"] = "failed"
        summary["email_sent"] = email_sent
        return summary

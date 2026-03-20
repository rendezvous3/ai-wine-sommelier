"""Thin verification Worker wrapper for post-run checks."""

from __future__ import annotations

import json
from html import escape as html_escape
from typing import Any, Dict, Optional
from urllib.parse import parse_qs, urlparse

from workers import Request, Response, WorkerEntrypoint

from core.config import cloudflare_config_from_source
from core.postrun_reports import D1PostrunVerificationStore
from core.run_reports import D1RunReportStore
from postrun_verify import DEFAULT_CATEGORY_CHECKS, _format_delta_line, run_postrun_verification


def _json_response(payload: Dict[str, Any], status: int = 200) -> Response:
    return Response(
        json.dumps(payload, default=str),
        status=status,
        headers={"content-type": "application/json"},
    )


def _html_response(html: str, status: int = 200) -> Response:
    return Response(
        html,
        status=status,
        headers={"content-type": "text/html; charset=utf-8"},
    )


def _get_bearer_token(request: Request) -> Optional[str]:
    authorization = request.headers.get("authorization")
    if not authorization:
        return None
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        return None
    return token.strip()


def _authorized(request: Request, env: Any) -> bool:
    configured = getattr(env, "VERIFY_ADMIN_TOKEN", None)
    if not configured:
        return False
    provided = _get_bearer_token(request)
    return bool(provided and provided == configured)


def _report_authorized(request: Request, env: Any) -> bool:
    valid_tokens = [
        str(getattr(env, "VERIFY_REPORT_TOKEN", "") or "").strip(),
        str(getattr(env, "VERIFY_ADMIN_TOKEN", "") or "").strip(),
    ]
    valid_tokens = [token for token in valid_tokens if token]
    if not valid_tokens:
        return False
    provided = _get_bearer_token(request)
    if provided and provided in valid_tokens:
        return True
    parsed = urlparse(request.url)
    query_token = (parse_qs(parsed.query).get("token") or [None])[0]
    return bool(query_token and query_token in valid_tokens)


def _payload_get(payload: Any, key: str) -> Any:
    if isinstance(payload, dict):
        return payload.get(key)
    return getattr(payload, key, None)


def _parse_summary_json(run: Dict[str, Any] | None) -> Dict[str, Any] | None:
    if not run:
        return None
    raw_summary = run.get("summary_json")
    if not raw_summary:
        return None
    try:
        parsed = json.loads(str(raw_summary))
    except (TypeError, ValueError, json.JSONDecodeError):
        return None
    return parsed if isinstance(parsed, dict) else None


def _parse_json_value(value: Any) -> Any:
    if value is None or value == "":
        return None
    if isinstance(value, (dict, list)):
        return value
    try:
        return json.loads(str(value))
    except (TypeError, ValueError, json.JSONDecodeError):
        return value


def _group_delta_events(events: list[Dict[str, Any]]) -> Dict[str, list[Dict[str, Any]]]:
    return {
        "removed": [event for event in events if event.get("event_type") == "removed"],
        "added": [event for event in events if event.get("event_type") == "indexed_new"],
        "updated": [event for event in events if event.get("event_type") == "indexed_updated"],
        "excluded": [event for event in events if event.get("event_type") == "excluded"],
        "warning": [event for event in events if event.get("event_type") == "warning"],
    }


def _render_event_section(title: str, events: list[Dict[str, Any]], *, limit: int = 50) -> str:
    if not events:
        return (
            "<section style=\"margin-top:28px;\">"
            f"<h2 style=\"font-size:18px;margin:0 0 12px 0;\">{html_escape(title)} (0)</h2>"
            "<div style=\"color:#64748b;\">none</div>"
            "</section>"
        )
    rows = "".join(
        [
            (
                "<li style=\"margin:0 0 10px 0;padding:12px 14px;background:#f8fafc;"
                "border:1px solid #e2e8f0;border-radius:10px;\">"
                f"<code style=\"font-size:12px;color:#334155;\">{html_escape(str(event.get('product_id') or 'n/a'))}</code>"
                f"<div style=\"margin-top:6px;color:#0f172a;line-height:1.5;\">{html_escape(_format_delta_line(event))}</div>"
                "</li>"
            )
            for event in events[:limit]
        ]
    )
    hidden_note = (
        f"<div style=\"margin-top:10px;color:#64748b;font-size:13px;\">Showing first {limit} of {len(events)}.</div>"
        if len(events) > limit
        else ""
    )
    return (
        "<section style=\"margin-top:28px;\">"
        f"<h2 style=\"font-size:18px;margin:0 0 12px 0;\">{html_escape(title)} ({len(events)})</h2>"
        f"<ul style=\"list-style:none;padding:0;margin:0;\">{rows}</ul>"
        f"{hidden_note}</section>"
    )


def _render_verification_report_html(
    *,
    verification: Dict[str, Any],
    checks: list[Dict[str, Any]],
    vectorizer_run: Optional[Dict[str, Any]],
    vectorizer_summary: Optional[Dict[str, Any]],
    delta_events: list[Dict[str, Any]],
    reason_counts: list[Dict[str, Any]],
) -> str:
    grouped_events = _group_delta_events(delta_events)
    failed_checks = [check for check in checks if str(check.get("status") or "") == "failed"]
    counts = {
        "removed": len(grouped_events["removed"]),
        "added": len(grouped_events["added"]),
        "updated": len(grouped_events["updated"]),
        "excluded": len(grouped_events["excluded"]),
        "warnings": len(grouped_events["warning"]),
        "failed_checks": len(failed_checks),
    }
    status = str(verification.get("status") or "unknown")
    status_color = "#16a34a" if status.lower() == "passed" else "#dc2626"
    metric_cards = [
        ("Active unique count", verification.get("active_unique_count", "n/a")),
        ("Expected active delta", verification.get("expected_active_delta", "n/a")),
        ("Actual active delta", verification.get("actual_active_delta", "n/a")),
        ("Removed", counts["removed"]),
        ("Added", counts["added"]),
        ("Updated", counts["updated"]),
        ("Excluded", counts["excluded"]),
        ("Warnings", counts["warnings"]),
        ("Failed checks", counts["failed_checks"]),
    ]
    cards_html = "".join(
        [
            (
                "<div style=\"background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;"
                "padding:14px 16px;min-width:150px;\">"
                f"<div style=\"font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.04em;\">{html_escape(str(label))}</div>"
                f"<div style=\"font-size:24px;font-weight:700;color:#0f172a;margin-top:6px;\">{html_escape(str(value))}</div>"
                "</div>"
            )
            for label, value in metric_cards
        ]
    )
    failed_checks_html = "".join(
        [
            (
                "<li style=\"margin:0 0 8px 0;\">"
                f"<strong>{html_escape(str(check.get('check_id') or 'unknown'))}</strong>"
                f"<div style=\"color:#475569;font-size:13px;line-height:1.5;\">"
                f"{html_escape(json.dumps(_parse_json_value(check.get('details_json')) or {}, default=str))}</div>"
                "</li>"
            )
            for check in failed_checks
        ]
    ) or "<li>none</li>"
    reason_rows = "".join(
        [
            (
                "<tr>"
                f"<td style=\"padding:10px 12px;border-bottom:1px solid #e2e8f0;\">{html_escape(str(item.get('reason_code') or ''))}</td>"
                f"<td style=\"padding:10px 12px;border-bottom:1px solid #e2e8f0;\">{html_escape(str(item.get('stage') or ''))}</td>"
                f"<td style=\"padding:10px 12px;border-bottom:1px solid #e2e8f0;\">{html_escape(str(item.get('severity') or ''))}</td>"
                f"<td style=\"padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:right;\">{html_escape(str(item.get('event_count') or 0))}</td>"
                f"<td style=\"padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:right;\">{html_escape(str(item.get('product_count') or 0))}</td>"
                "</tr>"
            )
            for item in reason_counts
        ]
    ) or (
        "<tr><td colspan=\"5\" style=\"padding:12px;color:#64748b;\">none</td></tr>"
    )
    run_bits = []
    if vectorizer_run:
        run_bits.extend(
            [
                f"Started: {html_escape(str(vectorizer_run.get('started_at') or 'n/a'))}",
                f"Finished: {html_escape(str(vectorizer_run.get('finished_at') or 'n/a'))}",
                f"Run status: {html_escape(str(vectorizer_run.get('status') or 'n/a'))}",
            ]
        )
    sync_summary = (vectorizer_summary or {}).get("sync") if isinstance(vectorizer_summary, dict) else None
    if isinstance(sync_summary, dict):
        run_bits.extend(
            [
                f"Fetched: {html_escape(str(sync_summary.get('fetched_count', 'n/a')))}",
                f"Uploaded: {html_escape(str(sync_summary.get('uploaded_count', 'n/a')))}",
                f"New: {html_escape(str(sync_summary.get('new_count', 'n/a')))}",
                f"Updated: {html_escape(str(sync_summary.get('updated_count', 'n/a')))}",
            ]
        )
    run_summary_html = "".join([f"<li style=\"margin:0 0 6px 0;\">{bit}</li>" for bit in run_bits]) or "<li>n/a</li>"

    return f"""
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Cannavita Verification Report</title>
      </head>
      <body style="margin:0;background:#f1f5f9;color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
        <main style="max-width:1120px;margin:0 auto;padding:28px 20px 48px;">
          <section style="background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;padding:28px;">
            <div style="display:flex;justify-content:space-between;gap:16px;align-items:flex-start;flex-wrap:wrap;">
              <div>
                <div style="font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;">Cannavita QA Sync</div>
                <h1 style="margin:8px 0 6px 0;font-size:32px;line-height:1.2;">Verification report</h1>
                <div style="color:#475569;font-size:14px;line-height:1.7;">
                  Verification ID: <code>{html_escape(str(verification.get('verification_id') or 'n/a'))}</code><br />
                  Suite: {html_escape(str(verification.get('suite') or 'n/a'))}<br />
                  Source: {html_escape(str(verification.get('source') or 'n/a'))}<br />
                  Index: {html_escape(str(verification.get('index_name') or 'n/a'))}<br />
                  Vectorizer run: <code>{html_escape(str(verification.get('vectorizer_run_id') or 'n/a'))}</code>
                </div>
              </div>
              <div style="background:{status_color};color:#ffffff;border-radius:999px;padding:10px 14px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">
                {html_escape(status)}
              </div>
            </div>

            <div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:24px;">
              {cards_html}
            </div>

            <section style="margin-top:28px;padding:18px;border:1px solid #e2e8f0;border-radius:12px;background:#fcfcfd;">
              <h2 style="font-size:18px;margin:0 0 12px 0;">Vectorizer run summary</h2>
              <ul style="padding-left:18px;margin:0;">{run_summary_html}</ul>
            </section>

            <section style="margin-top:28px;padding:18px;border:1px solid #e2e8f0;border-radius:12px;background:#fcfcfd;">
              <h2 style="font-size:18px;margin:0 0 12px 0;">Failed checks</h2>
              <ul style="padding-left:18px;margin:0;">{failed_checks_html}</ul>
            </section>

            <section style="margin-top:28px;">
              <h2 style="font-size:18px;margin:0 0 12px 0;">Reason counts</h2>
              <div style="overflow:auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;">
                <table style="width:100%;border-collapse:collapse;font-size:14px;">
                  <thead style="background:#f8fafc;">
                    <tr>
                      <th style="text-align:left;padding:10px 12px;">Reason</th>
                      <th style="text-align:left;padding:10px 12px;">Stage</th>
                      <th style="text-align:left;padding:10px 12px;">Severity</th>
                      <th style="text-align:right;padding:10px 12px;">Events</th>
                      <th style="text-align:right;padding:10px 12px;">Products</th>
                    </tr>
                  </thead>
                  <tbody>{reason_rows}</tbody>
                </table>
              </div>
            </section>

            {_render_event_section("Removed", grouped_events["removed"])}
            {_render_event_section("Added", grouped_events["added"])}
            {_render_event_section("Updated", grouped_events["updated"])}
            {_render_event_section("Excluded", grouped_events["excluded"])}
            {_render_event_section("Warnings", grouped_events["warning"])}
          </section>
        </main>
      </body>
    </html>
    """


async def _run_verification_from_payload(env: Any, payload: Dict[str, Any]) -> Dict[str, Any]:
    categories = _payload_get(payload, "categories")
    if categories is not None and not isinstance(categories, list):
        categories = [categories]

    return await run_postrun_verification(
        source=env,
        suite=str(_payload_get(payload, "suite") or "full"),
        index_name=str(_payload_get(payload, "index_name") or getattr(env, "INDEX_NAME", "products-prod")),
        expected_trigger_source=_payload_get(payload, "expected_trigger_source") or "manual",
        backend_base_url=_payload_get(payload, "backend_base_url") or getattr(env, "BACKEND_BASE_URL", None),
        categories=categories or DEFAULT_CATEGORY_CHECKS,
        skip_email=bool(_payload_get(payload, "skip_email") or False),
        verification_source=str(_payload_get(payload, "source") or "manual"),
        vectorizer_run_id=_payload_get(payload, "vectorizer_run_id"),
    )


class Default(WorkerEntrypoint):
    async def run_verification(self, payload: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        return await _run_verification_from_payload(self.env, payload or {})

    async def fetch(self, request: Request) -> Response:
        path = urlparse(request.url).path

        if path == "/health":
            return _json_response({"ok": True, "service": "postrun-verifier"})

        if path.startswith("/reports/"):
            if not _report_authorized(request, self.env):
                return _json_response({"ok": False, "error": "unauthorized"}, status=401)
            verification_id = path.rsplit("/", 1)[-1]
            cloudflare = cloudflare_config_from_source(self.env)
            verification_store = D1PostrunVerificationStore(
                account_id=cloudflare.account_id,
                database_id=cloudflare.d1_database_id,
                api_token=cloudflare.resolved_d1_token,
            )
            run_store = D1RunReportStore(
                account_id=cloudflare.account_id,
                database_id=cloudflare.d1_database_id,
                api_token=cloudflare.resolved_d1_token,
            )
            if not verification_store.configured:
                return _json_response({"ok": False, "error": "d1_not_configured"}, status=500)
            await verification_store.ensure_tables()
            verification = await verification_store.get_run(verification_id)
            if not verification:
                return _json_response({"ok": False, "error": "not_found"}, status=404)
            checks = await verification_store.get_checks(verification_id)
            vectorizer_run = None
            vectorizer_summary = None
            delta_events: list[Dict[str, Any]] = []
            reason_counts: list[Dict[str, Any]] = []
            vectorizer_run_id = verification.get("vectorizer_run_id")
            if run_store.configured and vectorizer_run_id:
                await run_store.ensure_table()
                vectorizer_run = await run_store.get_run(str(vectorizer_run_id))
                vectorizer_summary = _parse_summary_json(vectorizer_run)
                delta_events = await run_store.get_run_events(str(vectorizer_run_id))
                reason_counts = await run_store.get_run_reason_counts(str(vectorizer_run_id))
            return _html_response(
                _render_verification_report_html(
                    verification=verification,
                    checks=checks,
                    vectorizer_run=vectorizer_run,
                    vectorizer_summary=vectorizer_summary,
                    delta_events=delta_events,
                    reason_counts=reason_counts,
                )
            )

        if path == "/last-run":
            if not _authorized(request, self.env):
                return _json_response({"ok": False, "error": "unauthorized"}, status=401)
            cloudflare = cloudflare_config_from_source(self.env)
            store = D1PostrunVerificationStore(
                account_id=cloudflare.account_id,
                database_id=cloudflare.d1_database_id,
                api_token=cloudflare.resolved_d1_token,
            )
            if not store.configured:
                return _json_response({"ok": False, "error": "d1_not_configured"}, status=500)
            await store.ensure_tables()
            latest = await store.get_latest_run()
            return _json_response({"ok": True, "run": latest})

        if path.startswith("/runs/"):
            if not _authorized(request, self.env):
                return _json_response({"ok": False, "error": "unauthorized"}, status=401)
            verification_id = path.rsplit("/", 1)[-1]
            cloudflare = cloudflare_config_from_source(self.env)
            store = D1PostrunVerificationStore(
                account_id=cloudflare.account_id,
                database_id=cloudflare.d1_database_id,
                api_token=cloudflare.resolved_d1_token,
            )
            if not store.configured:
                return _json_response({"ok": False, "error": "d1_not_configured"}, status=500)
            await store.ensure_tables()
            run = await store.get_run(verification_id)
            if not run:
                return _json_response({"ok": False, "error": "not_found"}, status=404)
            checks = await store.get_checks(verification_id)
            return _json_response({"ok": True, "run": run, "checks": checks})

        if path == "/run" and request.method.upper() == "POST":
            if not _authorized(request, self.env):
                return _json_response({"ok": False, "error": "unauthorized"}, status=401)

            payload: Dict[str, Any] = {}
            try:
                payload = await request.json()
            except Exception:
                payload = {}

            summary = await _run_verification_from_payload(self.env, payload)
            return _json_response({"ok": True, "summary": summary}, status=200)

        return _json_response({"ok": False, "error": "not_found"}, status=404)

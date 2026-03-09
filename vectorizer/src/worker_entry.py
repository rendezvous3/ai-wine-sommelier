"""Dedicated Cloudflare Python Worker entrypoint for vectorizer scheduling."""

from __future__ import annotations

import json
from typing import Any, Dict
from urllib.parse import urlparse

from workers import Request, Response, WorkerEntrypoint

from core.config import parse_limit_value, parse_optional_int
from core.run_reports import D1RunReportStore
from run_sync_cycle import build_cycle_options, run_sync_cycle
from core.config import cloudflare_config_from_source


def _json_response(payload: Dict[str, Any], status: int = 200) -> Response:
    return Response(
        json.dumps(payload, default=str),
        status=status,
        headers={"content-type": "application/json"},
    )


def _get_bearer_token(request: Request) -> str | None:
    authorization = request.headers.get("authorization")
    if not authorization:
        return None
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        return None
    return token.strip()


def _authorized(request: Request, env: Any) -> bool:
    configured = getattr(env, "ADMIN_TOKEN", None)
    if not configured:
        return False
    provided = _get_bearer_token(request)
    return bool(provided and provided == configured)


def _payload_get(payload: Any, key: str) -> Any:
    if isinstance(payload, dict):
        return payload.get(key)
    return getattr(payload, key, None)


async def _run_with_overrides(env: Any, overrides: Dict[str, Any], trigger_source: str) -> Dict[str, Any]:
    options = build_cycle_options(env, overrides=overrides, trigger_source=trigger_source)
    summary = await run_sync_cycle(options, trigger_source=trigger_source, source=env)
    return summary.to_dict()


class Default(WorkerEntrypoint):
    async def fetch(self, request: Request) -> Response:
        path = urlparse(request.url).path

        if path == "/health":
            return _json_response({"ok": True, "service": "vectorizer-worker"})

        if path == "/last-run":
            if not _authorized(request, self.env):
                return _json_response({"ok": False, "error": "unauthorized"}, status=401)
            cloudflare = cloudflare_config_from_source(self.env)
            report_store = D1RunReportStore(
                account_id=cloudflare.account_id,
                database_id=cloudflare.d1_database_id,
                api_token=cloudflare.resolved_d1_token,
            )
            if not report_store.configured:
                return _json_response({"ok": False, "error": "d1_not_configured"}, status=500)
            await report_store.ensure_table()
            latest = await report_store.get_latest_run()
            return _json_response({"ok": True, "run": latest})

        if path == "/run" and request.method.upper() == "POST":
            if not _authorized(request, self.env):
                return _json_response({"ok": False, "error": "unauthorized"}, status=401)

            overrides: Dict[str, Any] = {}
            try:
                payload = await request.json()
                overrides = {
                    "index_name": _payload_get(payload, "index_name"),
                    "min_quantity": parse_optional_int(_payload_get(payload, "min_quantity")),
                    "stale_hours": parse_optional_int(_payload_get(payload, "stale_hours")),
                    "limit": (
                        parse_limit_value(_payload_get(payload, "limit"))
                        if _payload_get(payload, "limit") is not None
                        else None
                    ),
                    "dry_run": bool(_payload_get(payload, "dry_run") or False),
                }
            except Exception:
                overrides = {}

            summary = await _run_with_overrides(self.env, overrides, trigger_source="manual")
            return _json_response({"ok": True, "summary": summary}, status=200)

        return _json_response({"ok": False, "error": "not_found"}, status=404)

    async def scheduled(self, controller, env, ctx) -> None:
        options = build_cycle_options(env, trigger_source="scheduled")
        await run_sync_cycle(options, trigger_source="scheduled", source=env)

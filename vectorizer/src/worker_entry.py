"""Dedicated Cloudflare Python Worker entrypoint for vectorizer scheduling."""

from __future__ import annotations

import json
from typing import Any, Dict
from urllib.parse import urlparse

import httpx
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


async def _trigger_postrun_verifier(env: Any, index_name: str, vectorizer_run_id: str | None) -> None:
    verifier_url = getattr(env, "POSTRUN_VERIFIER_URL", None)
    verifier_token = getattr(env, "POSTRUN_VERIFIER_TOKEN", None)
    if not verifier_url or not verifier_token:
        return

    payload = {
        "source": "scheduled_postrun",
        # The deployed verifier's reliable gate is currently categories-only.
        "suite": "categories_only",
        "index_name": index_name,
        "expected_trigger_source": "scheduled",
        "vectorizer_run_id": vectorizer_run_id,
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            verifier_url.rstrip("/") + "/run",
            headers={"Authorization": f"Bearer {verifier_token}"},
            json=payload,
        )
        response.raise_for_status()


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

        cloudflare = cloudflare_config_from_source(env)
        report_store = D1RunReportStore(
            account_id=cloudflare.account_id,
            database_id=cloudflare.d1_database_id,
            api_token=cloudflare.resolved_d1_token,
        )
        latest_run = None
        if report_store.configured:
            try:
                await report_store.ensure_table()
                latest_run = await report_store.get_latest_run()
            except Exception as exc:
                print(f"Warning: unable to load latest run for verifier trigger: {exc}")

        try:
            await _trigger_postrun_verifier(
                env,
                index_name=options.sync.index_name,
                vectorizer_run_id=(
                    (latest_run or {}).get("run_id")
                    if latest_run and latest_run.get("index_name") == options.sync.index_name
                    else None
                ),
            )
        except Exception as exc:
            print(f"Warning: post-run verifier trigger failed: {exc}")

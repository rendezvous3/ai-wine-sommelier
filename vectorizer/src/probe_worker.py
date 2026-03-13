"""Thin verification Worker wrapper for post-run checks."""

from __future__ import annotations

import json
from typing import Any, Dict, Optional
from urllib.parse import urlparse

from workers import Request, Response, WorkerEntrypoint

from core.config import cloudflare_config_from_source
from core.postrun_reports import D1PostrunVerificationStore
from postrun_verify import DEFAULT_CATEGORY_CHECKS, run_postrun_verification


def _json_response(payload: Dict[str, Any], status: int = 200) -> Response:
    return Response(
        json.dumps(payload, default=str),
        status=status,
        headers={"content-type": "application/json"},
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


def _payload_get(payload: Any, key: str) -> Any:
    if isinstance(payload, dict):
        return payload.get(key)
    return getattr(payload, key, None)


class Default(WorkerEntrypoint):
    async def fetch(self, request: Request) -> Response:
        path = urlparse(request.url).path

        if path == "/health":
            return _json_response({"ok": True, "service": "postrun-verifier"})

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

            categories = _payload_get(payload, "categories")
            if categories is not None and not isinstance(categories, list):
                categories = [categories]

            summary = await run_postrun_verification(
                source=self.env,
                suite=str(_payload_get(payload, "suite") or "full"),
                index_name=str(_payload_get(payload, "index_name") or getattr(self.env, "INDEX_NAME", "products-prod")),
                expected_trigger_source=_payload_get(payload, "expected_trigger_source") or "manual",
                backend_base_url=_payload_get(payload, "backend_base_url") or getattr(self.env, "BACKEND_BASE_URL", None),
                categories=categories or DEFAULT_CATEGORY_CHECKS,
                skip_email=bool(_payload_get(payload, "skip_email") or False),
                verification_source=str(_payload_get(payload, "source") or "manual"),
                vectorizer_run_id=_payload_get(payload, "vectorizer_run_id"),
            )
            return _json_response({"ok": True, "summary": summary}, status=200)

        return _json_response({"ok": False, "error": "not_found"}, status=404)

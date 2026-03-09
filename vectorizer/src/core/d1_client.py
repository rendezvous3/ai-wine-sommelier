from __future__ import annotations

from typing import Any, Dict, Optional

import httpx


class D1RestClient:
    """Minimal async D1 SQL client backed by Cloudflare's REST API."""

    def __init__(
        self,
        account_id: Optional[str],
        database_id: Optional[str],
        api_token: Optional[str],
        timeout_seconds: float = 30.0,
    ) -> None:
        self.account_id = account_id
        self.database_id = database_id
        self.api_token = api_token
        self.timeout_seconds = timeout_seconds
        self.base_url = (
            f"https://api.cloudflare.com/client/v4/accounts/"
            f"{account_id}/d1/database/{database_id}/query"
        )

    @property
    def configured(self) -> bool:
        return bool(self.account_id and self.database_id and self.api_token)

    @property
    def headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self.api_token}",
            "Content-Type": "application/json",
        }

    @staticmethod
    def sql_quote(value: str) -> str:
        return (value or "").replace("'", "''")

    async def exec_sql(self, sql: str) -> Dict[str, Any]:
        if not self.configured:
            raise RuntimeError("D1 client is not configured.")
        async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
            response = await client.post(
                self.base_url,
                headers=self.headers,
                json={"sql": sql},
            )
            response.raise_for_status()
            payload = response.json()
        if not payload.get("success", False):
            raise RuntimeError(f"D1 query failed: {payload.get('errors', [])}")
        return payload


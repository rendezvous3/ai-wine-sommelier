"""
D1-backed uniqueness ledger for vectorizer ingestion.

Each Vectorize index gets an isolated D1 table so old index data cannot block
new index ingestion.
"""

import re
from datetime import datetime, timezone
from typing import Any, Dict, Iterable, List, Optional, Set

import requests


def sanitize_index_name(index_name: str) -> str:
    """Convert index names to safe SQL table suffixes."""
    lowered = (index_name or "").strip().lower()
    safe = re.sub(r"[^a-z0-9_]+", "_", lowered)
    safe = re.sub(r"_+", "_", safe).strip("_")
    return safe or "default"


def build_uniques_table_name(index_name: str) -> str:
    return f"vector_uniques_{sanitize_index_name(index_name)}"


def normalize_product_name(name: str) -> str:
    """Normalize names for cross-run duplicate checks."""
    value = (name or "").strip().lower()
    value = re.sub(r"[^\w\s]+", " ", value)
    value = re.sub(r"\s+", " ", value).strip()
    return value


class D1UniqueStore:
    """Small D1 helper for uniqueness checks by product id and normalized name."""

    def __init__(self, account_id: Optional[str], database_id: Optional[str], api_token: Optional[str]):
        self.account_id = account_id
        self.database_id = database_id
        self.api_token = api_token
        self.base_url = f"https://api.cloudflare.com/client/v4/accounts/{account_id}/d1/database/{database_id}/query"

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
    def _sql_quote(value: str) -> str:
        return (value or "").replace("'", "''")

    def _exec_sql(self, sql: str) -> Dict[str, Any]:
        response = requests.post(
            self.base_url,
            headers=self.headers,
            json={"sql": sql},
            timeout=30,
        )
        response.raise_for_status()
        payload = response.json()
        if not payload.get("success", False):
            errors = payload.get("errors", [])
            raise RuntimeError(f"D1 query failed: {errors}")
        return payload

    def ensure_table(self, table_name: str) -> None:
        sql = f"""
        CREATE TABLE IF NOT EXISTS "{table_name}" (
            product_id TEXT NOT NULL UNIQUE,
            normalized_name TEXT NOT NULL UNIQUE,
            raw_name TEXT,
            category TEXT,
            subcategory TEXT,
            last_seen_at TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_{table_name}_name ON "{table_name}" (normalized_name);
        """
        self._exec_sql(sql)

    def get_existing(self, table_name: str, product_ids: Iterable[str], normalized_names: Iterable[str]) -> Dict[str, Set[str]]:
        quoted_ids = [f"'{self._sql_quote(pid)}'" for pid in product_ids if pid]
        quoted_names = [f"'{self._sql_quote(name)}'" for name in normalized_names if name]

        existing_ids: Set[str] = set()
        existing_names: Set[str] = set()

        if quoted_ids:
            sql_ids = f'SELECT product_id FROM "{table_name}" WHERE product_id IN ({",".join(quoted_ids)});'
            payload = self._exec_sql(sql_ids)
            rows = payload.get("result", [{}])[0].get("results", [])
            existing_ids = {str(row.get("product_id")) for row in rows if row.get("product_id")}

        if quoted_names:
            sql_names = f'SELECT normalized_name FROM "{table_name}" WHERE normalized_name IN ({",".join(quoted_names)});'
            payload = self._exec_sql(sql_names)
            rows = payload.get("result", [{}])[0].get("results", [])
            existing_names = {str(row.get("normalized_name")) for row in rows if row.get("normalized_name")}

        return {"ids": existing_ids, "names": existing_names}

    def upsert_seen(self, table_name: str, rows: List[Dict[str, str]]) -> Dict[str, int]:
        inserted_or_updated = 0
        skipped = 0
        now = datetime.now(timezone.utc).isoformat()

        for row in rows:
            product_id = self._sql_quote(row.get("product_id", ""))
            normalized_name = self._sql_quote(row.get("normalized_name", ""))
            raw_name = self._sql_quote(row.get("raw_name", ""))
            category = self._sql_quote(row.get("category", ""))
            subcategory = self._sql_quote(row.get("subcategory", ""))
            seen_at = self._sql_quote(row.get("last_seen_at", now))

            if not product_id or not normalized_name:
                skipped += 1
                continue

            sql = f'''
            INSERT INTO "{table_name}"
                (product_id, normalized_name, raw_name, category, subcategory, last_seen_at)
            VALUES
                ('{product_id}', '{normalized_name}', '{raw_name}', '{category}', '{subcategory}', '{seen_at}')
            ON CONFLICT(product_id) DO UPDATE SET
                normalized_name = excluded.normalized_name,
                raw_name = excluded.raw_name,
                category = excluded.category,
                subcategory = excluded.subcategory,
                last_seen_at = excluded.last_seen_at;
            '''
            try:
                payload = self._exec_sql(sql)
                meta = payload.get("result", [{}])[0].get("meta", {})
                changes = int(meta.get("changes", 0) or 0)
                if changes > 0:
                    inserted_or_updated += 1
                else:
                    skipped += 1
            except Exception:
                # Keep sync resilient for cron use.
                skipped += 1
                continue

        return {"upserted": inserted_or_updated, "skipped": skipped}

    def list_stale_ids(self, table_name: str, cutoff_iso: str, limit: int = 1000) -> List[str]:
        cutoff = self._sql_quote(cutoff_iso)
        sql = f'''
        SELECT product_id
        FROM "{table_name}"
        WHERE last_seen_at < '{cutoff}'
        ORDER BY last_seen_at ASC
        LIMIT {int(limit)};
        '''
        payload = self._exec_sql(sql)
        rows = payload.get("result", [{}])[0].get("results", [])
        return [str(row.get("product_id")) for row in rows if row.get("product_id")]

    def delete_ids(self, table_name: str, ids: Iterable[str]) -> int:
        quoted_ids = [f"'{self._sql_quote(pid)}'" for pid in ids if pid]
        if not quoted_ids:
            return 0
        sql = f'DELETE FROM "{table_name}" WHERE product_id IN ({",".join(quoted_ids)});'
        payload = self._exec_sql(sql)
        meta = payload.get("result", [{}])[0].get("meta", {})
        return int(meta.get("changes", 0) or 0)

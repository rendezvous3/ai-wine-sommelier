"""
D1-backed uniqueness ledger for vectorizer ingestion.

Each Vectorize index gets an isolated D1 table so old index data cannot block
new index ingestion.
"""

import re
from datetime import datetime, timezone
from typing import Any, Dict, Iterable, List, Optional, Set

from core.d1_client import D1RestClient


def sanitize_index_name(index_name: str) -> str:
    lowered = (index_name or "").strip().lower()
    safe = re.sub(r"[^a-z0-9_]+", "_", lowered)
    safe = re.sub(r"_+", "_", safe).strip("_")
    return safe or "default"


def build_uniques_table_name(index_name: str) -> str:
    return f"vector_uniques_{sanitize_index_name(index_name)}"


def normalize_product_name(name: str) -> str:
    value = (name or "").strip().lower()
    value = re.sub(r"[^\w\s]+", " ", value)
    value = re.sub(r"\s+", " ", value).strip()
    return value


class D1UniqueStore:
    """Small D1 helper for uniqueness checks by product id and normalized name."""

    def __init__(
        self,
        account_id: Optional[str],
        database_id: Optional[str],
        api_token: Optional[str],
        timeout_seconds: float = 30.0,
    ) -> None:
        self.client = D1RestClient(
            account_id=account_id,
            database_id=database_id,
            api_token=api_token,
            timeout_seconds=timeout_seconds,
        )

    @property
    def configured(self) -> bool:
        return self.client.configured

    async def ensure_table(self, table_name: str) -> None:
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
        await self.client.exec_sql(sql)

    async def get_existing(
        self,
        table_name: str,
        product_ids: Iterable[str],
        normalized_names: Iterable[str],
    ) -> Dict[str, Set[str]]:
        quoted_ids = [f"'{self.client.sql_quote(product_id)}'" for product_id in product_ids if product_id]
        quoted_names = [f"'{self.client.sql_quote(name)}'" for name in normalized_names if name]

        existing_ids: Set[str] = set()
        existing_names: Set[str] = set()

        if quoted_ids:
            sql_ids = f'SELECT product_id FROM "{table_name}" WHERE product_id IN ({",".join(quoted_ids)});'
            payload = await self.client.exec_sql(sql_ids)
            rows = payload.get("result", [{}])[0].get("results", [])
            existing_ids = {str(row.get("product_id")) for row in rows if row.get("product_id")}

        if quoted_names:
            sql_names = f'SELECT normalized_name FROM "{table_name}" WHERE normalized_name IN ({",".join(quoted_names)});'
            payload = await self.client.exec_sql(sql_names)
            rows = payload.get("result", [{}])[0].get("results", [])
            existing_names = {str(row.get("normalized_name")) for row in rows if row.get("normalized_name")}

        return {"ids": existing_ids, "names": existing_names}

    async def upsert_seen(self, table_name: str, rows: List[Dict[str, str]]) -> Dict[str, int]:
        inserted_or_updated = 0
        skipped = 0
        now = datetime.now(timezone.utc).isoformat()

        for row in rows:
            product_id = self.client.sql_quote(row.get("product_id", ""))
            normalized_name = self.client.sql_quote(row.get("normalized_name", ""))
            raw_name = self.client.sql_quote(row.get("raw_name", ""))
            category = self.client.sql_quote(row.get("category", ""))
            subcategory = self.client.sql_quote(row.get("subcategory", ""))
            seen_at = self.client.sql_quote(row.get("last_seen_at", now))

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
                payload = await self.client.exec_sql(sql)
                meta = payload.get("result", [{}])[0].get("meta", {})
                changes = int(meta.get("changes", 0) or 0)
                if changes > 0:
                    inserted_or_updated += 1
                else:
                    skipped += 1
            except Exception:
                skipped += 1
                continue

        return {"upserted": inserted_or_updated, "skipped": skipped}

    async def list_stale_ids(self, table_name: str, cutoff_iso: str, limit: int = 1000) -> List[str]:
        cutoff = self.client.sql_quote(cutoff_iso)
        sql = f'''
        SELECT product_id
        FROM "{table_name}"
        WHERE last_seen_at < '{cutoff}'
        ORDER BY last_seen_at ASC
        LIMIT {int(limit)};
        '''
        payload = await self.client.exec_sql(sql)
        rows = payload.get("result", [{}])[0].get("results", [])
        return [str(row.get("product_id")) for row in rows if row.get("product_id")]

    async def delete_ids(self, table_name: str, ids: Iterable[str]) -> int:
        quoted_ids = [f"'{self.client.sql_quote(product_id)}'" for product_id in ids if product_id]
        if not quoted_ids:
            return 0
        sql = f'DELETE FROM "{table_name}" WHERE product_id IN ({",".join(quoted_ids)});'
        payload = await self.client.exec_sql(sql)
        meta = payload.get("result", [{}])[0].get("meta", {})
        return int(meta.get("changes", 0) or 0)

    async def count_rows(self, table_name: str) -> int:
        sql = f'SELECT COUNT(*) AS row_count FROM "{table_name}";'
        payload = await self.client.exec_sql(sql)
        rows = payload.get("result", [{}])[0].get("results", [])
        if not rows:
            return 0
        return int(rows[0].get("row_count", 0) or 0)

    async def get_rows_by_ids(self, table_name: str, ids: Iterable[str]) -> List[Dict[str, Any]]:
        quoted_ids = [f"'{self.client.sql_quote(product_id)}'" for product_id in ids if product_id]
        if not quoted_ids:
            return []
        sql = f'''
        SELECT product_id, normalized_name, raw_name, category, subcategory, last_seen_at
        FROM "{table_name}"
        WHERE product_id IN ({",".join(quoted_ids)});
        '''
        payload = await self.client.exec_sql(sql)
        return payload.get("result", [{}])[0].get("results", []) or []

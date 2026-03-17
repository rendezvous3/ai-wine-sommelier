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
            quantity INTEGER,
            price REAL,
            updated_at TEXT,
            last_seen_at TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_{table_name}_name ON "{table_name}" (normalized_name);
        """
        await self.client.exec_sql(sql)
        await self._ensure_column(table_name, "quantity", "INTEGER")
        await self._ensure_column(table_name, "price", "REAL")
        await self._ensure_column(table_name, "updated_at", "TEXT")

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
        upserted_ids: List[str] = []
        skipped_ids: List[str] = []

        for row in rows:
            product_id_value = str(row.get("product_id", "") or "").strip()
            normalized_name_value = str(row.get("normalized_name", "") or "").strip()
            product_id = self.client.sql_quote(product_id_value)
            normalized_name = self.client.sql_quote(normalized_name_value)
            raw_name = self.client.sql_quote(str(row.get("raw_name", "") or ""))
            category = self.client.sql_quote(str(row.get("category", "") or ""))
            subcategory = self.client.sql_quote(str(row.get("subcategory", "") or ""))
            seen_at = self.client.sql_quote(str(row.get("last_seen_at", now) or now))
            updated_at = self.client.sql_quote(str(row.get("updated_at", now) or now))
            quantity = self._nullable_int(row.get("quantity"))
            price = self._nullable_float(row.get("price"))

            if not product_id or not normalized_name:
                skipped += 1
                if product_id_value:
                    skipped_ids.append(product_id_value)
                continue

            sql = f'''
            INSERT INTO "{table_name}"
                (product_id, normalized_name, raw_name, category, subcategory, quantity, price, updated_at, last_seen_at)
            VALUES
                ('{product_id}', '{normalized_name}', '{raw_name}', '{category}', '{subcategory}', {quantity}, {price}, '{updated_at}', '{seen_at}')
            ON CONFLICT(product_id) DO UPDATE SET
                normalized_name = excluded.normalized_name,
                raw_name = excluded.raw_name,
                category = excluded.category,
                subcategory = excluded.subcategory,
                quantity = excluded.quantity,
                price = excluded.price,
                updated_at = excluded.updated_at,
                last_seen_at = excluded.last_seen_at;
            '''
            try:
                payload = await self.client.exec_sql(sql)
                meta = payload.get("result", [{}])[0].get("meta", {})
                changes = int(meta.get("changes", 0) or 0)
                if changes > 0:
                    inserted_or_updated += 1
                    upserted_ids.append(product_id_value)
                else:
                    skipped += 1
                    skipped_ids.append(product_id_value)
            except Exception:
                skipped += 1
                skipped_ids.append(product_id_value)
                continue

        return {
            "upserted": inserted_or_updated,
            "skipped": skipped,
            "upserted_ids": upserted_ids,
            "skipped_ids": skipped_ids,
        }

    async def list_rows(self, table_name: str) -> List[Dict[str, Any]]:
        sql = f'''
        SELECT product_id, normalized_name, raw_name, category, subcategory, quantity, price, updated_at, last_seen_at
        FROM "{table_name}";
        '''
        payload = await self.client.exec_sql(sql)
        return payload.get("result", [{}])[0].get("results", []) or []

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
        SELECT product_id, normalized_name, raw_name, category, subcategory, quantity, price, updated_at, last_seen_at
        FROM "{table_name}"
        WHERE product_id IN ({",".join(quoted_ids)});
        '''
        payload = await self.client.exec_sql(sql)
        return payload.get("result", [{}])[0].get("results", []) or []

    async def _ensure_column(self, table_name: str, column_name: str, column_type: str) -> None:
        sql = f'PRAGMA table_info("{table_name}");'
        payload = await self.client.exec_sql(sql)
        rows = payload.get("result", [{}])[0].get("results", []) or []
        existing = {str(row.get("name")) for row in rows if row.get("name")}
        if column_name in existing:
            return
        await self.client.exec_sql(
            f'ALTER TABLE "{table_name}" ADD COLUMN {column_name} {column_type};'
        )

    @staticmethod
    def _nullable_int(value: Any) -> str:
        if value is None or str(value).strip() == "":
            return "NULL"
        return str(int(value))

    @staticmethod
    def _nullable_float(value: Any) -> str:
        if value is None or str(value).strip() == "":
            return "NULL"
        return str(float(value))

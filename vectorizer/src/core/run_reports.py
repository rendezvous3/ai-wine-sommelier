from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Dict, Iterable, List, Optional
from uuid import uuid4

from .d1_client import D1RestClient


class D1RunReportStore:
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

    async def ensure_table(self) -> None:
        sql = """
        CREATE TABLE IF NOT EXISTS vectorizer_runs (
            run_id TEXT PRIMARY KEY,
            trigger_source TEXT,
            status TEXT,
            index_name TEXT,
            min_quantity INTEGER,
            limit_value TEXT,
            started_at TEXT,
            finished_at TEXT,
            fetched_count INTEGER DEFAULT 0,
            transformed_count INTEGER DEFAULT 0,
            document_count INTEGER DEFAULT 0,
            uploaded_count INTEGER DEFAULT 0,
            low_stock_excluded INTEGER DEFAULT 0,
            missing_id_excluded INTEGER DEFAULT 0,
            duplicate_id_excluded INTEGER DEFAULT 0,
            duplicate_name_excluded INTEGER DEFAULT 0,
            d1_existing_ids_allowed INTEGER DEFAULT 0,
            d1_name_excluded INTEGER DEFAULT 0,
            new_count INTEGER DEFAULT 0,
            updated_count INTEGER DEFAULT 0,
            missing_from_fetch_count INTEGER DEFAULT 0,
            low_stock_removed_count INTEGER DEFAULT 0,
            stale_deleted_count INTEGER DEFAULT 0,
            error_message TEXT,
            summary_json TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_vectorizer_runs_started_at ON vectorizer_runs (started_at);

        CREATE TABLE IF NOT EXISTS vectorizer_run_events (
            event_id TEXT PRIMARY KEY,
            run_id TEXT NOT NULL,
            index_name TEXT NOT NULL,
            product_id TEXT,
            event_type TEXT NOT NULL,
            reason TEXT NOT NULL,
            status TEXT NOT NULL,
            raw_name TEXT,
            category TEXT,
            subcategory TEXT,
            previous_state_json TEXT,
            current_state_json TEXT,
            details_json TEXT,
            created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_vectorizer_run_events_run_id
            ON vectorizer_run_events (run_id, created_at);
        CREATE INDEX IF NOT EXISTS idx_vectorizer_run_events_lookup
            ON vectorizer_run_events (run_id, event_type, reason, status);
        """
        await self.client.exec_sql(sql)
        await self._ensure_run_column("missing_id_excluded", "INTEGER DEFAULT 0")
        await self._ensure_run_column("d1_existing_ids_allowed", "INTEGER DEFAULT 0")
        await self._ensure_run_column("new_count", "INTEGER DEFAULT 0")
        await self._ensure_run_column("updated_count", "INTEGER DEFAULT 0")
        await self._ensure_run_column("missing_from_fetch_count", "INTEGER DEFAULT 0")
        await self._ensure_run_column("low_stock_removed_count", "INTEGER DEFAULT 0")

    async def start_run(
        self,
        trigger_source: str,
        index_name: str,
        min_quantity: Optional[int],
        limit_value: Optional[int],
    ) -> str:
        run_id = str(uuid4())
        now = datetime.now(timezone.utc).isoformat()
        limit_str = "none" if limit_value is None else str(limit_value)
        sql = f"""
        INSERT INTO vectorizer_runs
            (run_id, trigger_source, status, index_name, min_quantity, limit_value, started_at)
        VALUES
            ('{self.client.sql_quote(run_id)}',
             '{self.client.sql_quote(trigger_source)}',
             'running',
             '{self.client.sql_quote(index_name)}',
             {min_quantity if min_quantity is not None else 'NULL'},
             '{self.client.sql_quote(limit_str)}',
             '{self.client.sql_quote(now)}');
        """
        await self.client.exec_sql(sql)
        return run_id

    async def finish_run(
        self,
        run_id: str,
        summary: Dict[str, Any],
        stale_deleted_count: int,
    ) -> None:
        finished_at = datetime.now(timezone.utc).isoformat()
        sync_summary = summary.get("sync", {})
        indexing_summary = summary.get("indexing", {})
        removal_summary = summary.get("removal", {})
        summary_json = self.client.sql_quote(json.dumps(summary, default=str))
        sql = f"""
        UPDATE vectorizer_runs
        SET
            status = 'success',
            finished_at = '{self.client.sql_quote(finished_at)}',
            fetched_count = {int(sync_summary.get('fetched_count', 0) or 0)},
            transformed_count = {int(sync_summary.get('transformed_count', 0) or 0)},
            document_count = {int(sync_summary.get('document_count', 0) or 0)},
            uploaded_count = {int(sync_summary.get('uploaded_count', 0) or 0)},
            low_stock_excluded = {int(sync_summary.get('low_stock_excluded', 0) or 0)},
            missing_id_excluded = {int(sync_summary.get('missing_id_excluded', 0) or 0)},
            duplicate_id_excluded = {int(sync_summary.get('duplicate_id_excluded', 0) or 0)},
            duplicate_name_excluded = {int(sync_summary.get('duplicate_name_excluded', 0) or 0)},
            d1_existing_ids_allowed = {int(sync_summary.get('d1_existing_ids_allowed', 0) or 0)},
            d1_name_excluded = {int(sync_summary.get('d1_name_excluded', 0) or 0)},
            new_count = {int(indexing_summary.get('new_count', 0) or 0)},
            updated_count = {int(indexing_summary.get('updated_count', 0) or 0)},
            missing_from_fetch_count = {int(removal_summary.get('missing_from_fetch_count', 0) or 0)},
            low_stock_removed_count = {int(removal_summary.get('low_stock_removed_count', 0) or 0)},
            stale_deleted_count = {int(stale_deleted_count or 0)},
            error_message = NULL,
            summary_json = '{summary_json}'
        WHERE run_id = '{self.client.sql_quote(run_id)}';
        """
        await self.client.exec_sql(sql)

    async def fail_run(self, run_id: str, error_message: str, summary: Optional[Dict[str, Any]] = None) -> None:
        finished_at = datetime.now(timezone.utc).isoformat()
        summary_json = self.client.sql_quote(json.dumps(summary or {}, default=str))
        sql = f"""
        UPDATE vectorizer_runs
        SET
            status = 'failed',
            finished_at = '{self.client.sql_quote(finished_at)}',
            error_message = '{self.client.sql_quote(error_message)}',
            summary_json = '{summary_json}'
        WHERE run_id = '{self.client.sql_quote(run_id)}';
        """
        await self.client.exec_sql(sql)

    async def get_latest_run(self) -> Optional[Dict[str, Any]]:
        sql = """
        SELECT *
        FROM vectorizer_runs
        ORDER BY started_at DESC
        LIMIT 1;
        """
        payload = await self.client.exec_sql(sql)
        rows = payload.get("result", [{}])[0].get("results", [])
        return rows[0] if rows else None

    async def get_run(self, run_id: str) -> Optional[Dict[str, Any]]:
        sql = f"""
        SELECT *
        FROM vectorizer_runs
        WHERE run_id = '{self.client.sql_quote(run_id)}'
        LIMIT 1;
        """
        payload = await self.client.exec_sql(sql)
        rows = payload.get("result", [{}])[0].get("results", [])
        return rows[0] if rows else None

    async def record_events(self, run_id: str, index_name: str, events: Iterable[Dict[str, Any]]) -> None:
        created_at = datetime.now(timezone.utc).isoformat()
        for event in events:
            event_id = str(uuid4())
            sql = f"""
            INSERT INTO vectorizer_run_events
                (event_id, run_id, index_name, product_id, event_type, reason, status, raw_name, category, subcategory,
                 previous_state_json, current_state_json, details_json, created_at)
            VALUES
                ('{self.client.sql_quote(event_id)}',
                 '{self.client.sql_quote(run_id)}',
                 '{self.client.sql_quote(index_name)}',
                 {self._nullable_text(event.get('product_id'))},
                 '{self.client.sql_quote(str(event.get('event_type') or ''))}',
                 '{self.client.sql_quote(str(event.get('reason') or ''))}',
                 '{self.client.sql_quote(str(event.get('status') or ''))}',
                 {self._nullable_text(event.get('raw_name'))},
                 {self._nullable_text(event.get('category'))},
                 {self._nullable_text(event.get('subcategory'))},
                 {self._nullable_json(event.get('previous_state_json'))},
                 {self._nullable_json(event.get('current_state_json'))},
                 {self._nullable_json(event.get('details_json'))},
                 '{self.client.sql_quote(created_at)}');
            """
            await self.client.exec_sql(sql)

    async def get_run_events(
        self,
        run_id: str,
        *,
        event_type: Optional[str] = None,
        reason: Optional[str] = None,
        status: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        where = [f"run_id = '{self.client.sql_quote(run_id)}'"]
        if event_type:
            where.append(f"event_type = '{self.client.sql_quote(event_type)}'")
        if reason:
            where.append(f"reason = '{self.client.sql_quote(reason)}'")
        if status:
            where.append(f"status = '{self.client.sql_quote(status)}'")
        sql = f"""
        SELECT *
        FROM vectorizer_run_events
        WHERE {" AND ".join(where)}
        ORDER BY created_at ASC, event_type ASC, reason ASC, product_id ASC;
        """
        payload = await self.client.exec_sql(sql)
        return payload.get("result", [{}])[0].get("results", []) or []

    async def _ensure_run_column(self, column_name: str, column_type: str) -> None:
        payload = await self.client.exec_sql("PRAGMA table_info('vectorizer_runs');")
        rows = payload.get("result", [{}])[0].get("results", []) or []
        existing = {str(row.get("name")) for row in rows if row.get("name")}
        if column_name in existing:
            return
        await self.client.exec_sql(
            f"ALTER TABLE vectorizer_runs ADD COLUMN {column_name} {column_type};"
        )

    def _nullable_text(self, value: Any) -> str:
        if value is None or str(value).strip() == "":
            return "NULL"
        return f"'{self.client.sql_quote(str(value))}'"

    def _nullable_json(self, value: Any) -> str:
        if value is None:
            return "NULL"
        payload = self.client.sql_quote(json.dumps(value, default=str))
        return f"'{payload}'"

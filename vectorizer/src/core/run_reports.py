from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Dict, Optional
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
            duplicate_id_excluded INTEGER DEFAULT 0,
            duplicate_name_excluded INTEGER DEFAULT 0,
            d1_name_excluded INTEGER DEFAULT 0,
            stale_deleted_count INTEGER DEFAULT 0,
            error_message TEXT,
            summary_json TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_vectorizer_runs_started_at ON vectorizer_runs (started_at);
        """
        await self.client.exec_sql(sql)

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
            duplicate_id_excluded = {int(sync_summary.get('duplicate_id_excluded', 0) or 0)},
            duplicate_name_excluded = {int(sync_summary.get('duplicate_name_excluded', 0) or 0)},
            d1_name_excluded = {int(sync_summary.get('d1_name_excluded', 0) or 0)},
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


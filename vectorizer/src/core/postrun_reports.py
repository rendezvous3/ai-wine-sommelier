from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import uuid4

from .d1_client import D1RestClient


class D1PostrunVerificationStore:
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

    async def ensure_tables(self) -> None:
        sql = """
        CREATE TABLE IF NOT EXISTS postrun_verifications (
            verification_id TEXT PRIMARY KEY,
            source TEXT,
            suite TEXT,
            index_name TEXT,
            expected_trigger_source TEXT,
            vectorizer_run_id TEXT,
            vectorizer_finished_at TEXT,
            started_at TEXT,
            finished_at TEXT,
            status TEXT,
            active_unique_count INTEGER,
            previous_active_unique_count INTEGER,
            expected_active_delta INTEGER,
            actual_active_delta INTEGER,
            summary_json TEXT,
            error_message TEXT,
            email_sent INTEGER DEFAULT 0,
            email_sent_at TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_postrun_verifications_started_at
            ON postrun_verifications (started_at);
        CREATE INDEX IF NOT EXISTS idx_postrun_verifications_index_name
            ON postrun_verifications (index_name);
        CREATE INDEX IF NOT EXISTS idx_postrun_verifications_status
            ON postrun_verifications (status);
        CREATE INDEX IF NOT EXISTS idx_postrun_verifications_vectorizer_run_id
            ON postrun_verifications (vectorizer_run_id);

        CREATE TABLE IF NOT EXISTS postrun_verification_checks (
            verification_id TEXT NOT NULL,
            check_id TEXT NOT NULL,
            status TEXT,
            details_json TEXT,
            created_at TEXT,
            PRIMARY KEY (verification_id, check_id)
        );
        CREATE INDEX IF NOT EXISTS idx_postrun_verification_checks_verification_id
            ON postrun_verification_checks (verification_id);
        """
        await self.client.exec_sql(sql)

    async def start_run(
        self,
        *,
        source: str,
        suite: str,
        index_name: str,
        expected_trigger_source: Optional[str],
        vectorizer_run_id: Optional[str],
        vectorizer_finished_at: Optional[str],
    ) -> str:
        verification_id = str(uuid4())
        started_at = datetime.now(timezone.utc).isoformat()
        sql = f"""
        INSERT INTO postrun_verifications
            (verification_id, source, suite, index_name, expected_trigger_source,
             vectorizer_run_id, vectorizer_finished_at, started_at, status)
        VALUES
            ('{self.client.sql_quote(verification_id)}',
             '{self.client.sql_quote(source)}',
             '{self.client.sql_quote(suite)}',
             '{self.client.sql_quote(index_name)}',
             {self._nullable_text(expected_trigger_source)},
             {self._nullable_text(vectorizer_run_id)},
             {self._nullable_text(vectorizer_finished_at)},
             '{self.client.sql_quote(started_at)}',
             'running');
        """
        await self.client.exec_sql(sql)
        return verification_id

    async def record_check(
        self,
        verification_id: str,
        check_id: str,
        status: str,
        details: Dict[str, Any],
    ) -> None:
        created_at = datetime.now(timezone.utc).isoformat()
        details_json = self.client.sql_quote(json.dumps(details, default=str))
        sql = f"""
        INSERT INTO postrun_verification_checks
            (verification_id, check_id, status, details_json, created_at)
        VALUES
            ('{self.client.sql_quote(verification_id)}',
             '{self.client.sql_quote(check_id)}',
             '{self.client.sql_quote(status)}',
             '{details_json}',
             '{self.client.sql_quote(created_at)}')
        ON CONFLICT(verification_id, check_id) DO UPDATE SET
            status = excluded.status,
            details_json = excluded.details_json,
            created_at = excluded.created_at;
        """
        await self.client.exec_sql(sql)

    async def finish_run(
        self,
        verification_id: str,
        *,
        status: str,
        active_unique_count: Optional[int],
        previous_active_unique_count: Optional[int],
        expected_active_delta: Optional[int],
        actual_active_delta: Optional[int],
        summary: Dict[str, Any],
        email_sent: bool = False,
    ) -> None:
        finished_at = datetime.now(timezone.utc).isoformat()
        summary_json = self.client.sql_quote(json.dumps(summary, default=str))
        vectorizer_finished_at = summary.get("vectorizer_finished_at")
        email_sent_at = finished_at if email_sent else None
        sql = f"""
        UPDATE postrun_verifications
        SET
            finished_at = '{self.client.sql_quote(finished_at)}',
            status = '{self.client.sql_quote(status)}',
            vectorizer_finished_at = {self._nullable_text(vectorizer_finished_at)},
            active_unique_count = {self._nullable_int(active_unique_count)},
            previous_active_unique_count = {self._nullable_int(previous_active_unique_count)},
            expected_active_delta = {self._nullable_int(expected_active_delta)},
            actual_active_delta = {self._nullable_int(actual_active_delta)},
            summary_json = '{summary_json}',
            error_message = NULL,
            email_sent = {1 if email_sent else 0},
            email_sent_at = {self._nullable_text(email_sent_at)}
        WHERE verification_id = '{self.client.sql_quote(verification_id)}';
        """
        await self.client.exec_sql(sql)

    async def fail_run(
        self,
        verification_id: str,
        *,
        error_message: str,
        summary: Optional[Dict[str, Any]] = None,
        email_sent: bool = False,
    ) -> None:
        finished_at = datetime.now(timezone.utc).isoformat()
        summary_json = self.client.sql_quote(json.dumps(summary or {}, default=str))
        email_sent_at = finished_at if email_sent else None
        sql = f"""
        UPDATE postrun_verifications
        SET
            finished_at = '{self.client.sql_quote(finished_at)}',
            status = 'failed',
            summary_json = '{summary_json}',
            error_message = '{self.client.sql_quote(error_message)}',
            email_sent = {1 if email_sent else 0},
            email_sent_at = {self._nullable_text(email_sent_at)}
        WHERE verification_id = '{self.client.sql_quote(verification_id)}';
        """
        await self.client.exec_sql(sql)

    async def get_latest_run(self) -> Optional[Dict[str, Any]]:
        sql = """
        SELECT *
        FROM postrun_verifications
        ORDER BY started_at DESC
        LIMIT 1;
        """
        payload = await self.client.exec_sql(sql)
        rows = payload.get("result", [{}])[0].get("results", [])
        return rows[0] if rows else None

    async def get_run(self, verification_id: str) -> Optional[Dict[str, Any]]:
        sql = f"""
        SELECT *
        FROM postrun_verifications
        WHERE verification_id = '{self.client.sql_quote(verification_id)}'
        LIMIT 1;
        """
        payload = await self.client.exec_sql(sql)
        rows = payload.get("result", [{}])[0].get("results", [])
        return rows[0] if rows else None

    async def get_checks(self, verification_id: str) -> List[Dict[str, Any]]:
        sql = f"""
        SELECT *
        FROM postrun_verification_checks
        WHERE verification_id = '{self.client.sql_quote(verification_id)}'
        ORDER BY created_at ASC, check_id ASC;
        """
        payload = await self.client.exec_sql(sql)
        return payload.get("result", [{}])[0].get("results", []) or []

    async def get_latest_success_for_index(
        self,
        index_name: str,
        *,
        exclude_vectorizer_run_id: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        where = [
            "status = 'passed'",
            f"index_name = '{self.client.sql_quote(index_name)}'",
        ]
        if exclude_vectorizer_run_id:
            where.append(
                f"(vectorizer_run_id IS NULL OR vectorizer_run_id != '{self.client.sql_quote(exclude_vectorizer_run_id)}')"
            )
        sql = f"""
        SELECT *
        FROM postrun_verifications
        WHERE {" AND ".join(where)}
        ORDER BY started_at DESC
        LIMIT 1;
        """
        payload = await self.client.exec_sql(sql)
        rows = payload.get("result", [{}])[0].get("results", [])
        return rows[0] if rows else None

    @staticmethod
    def _nullable_int(value: Optional[int]) -> str:
        return "NULL" if value is None else str(int(value))

    def _nullable_text(self, value: Optional[str]) -> str:
        if value is None or str(value).strip() == "":
            return "NULL"
        return f"'{self.client.sql_quote(str(value))}'"

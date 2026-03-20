from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Dict, Iterable, List, Optional, Tuple
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
        statements = [
            (
                "create_vectorizer_runs",
                """
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
                audit_warning_count INTEGER DEFAULT 0,
                audit_hard_omit_count INTEGER DEFAULT 0,
                source_issue_count INTEGER DEFAULT 0,
                transform_issue_count INTEGER DEFAULT 0,
                potency_anomaly_count INTEGER DEFAULT 0,
                missing_metadata_count INTEGER DEFAULT 0,
                error_message TEXT,
                summary_json TEXT
            );
            """,
            ),
            (
                "index_vectorizer_runs_started_at",
                "CREATE INDEX IF NOT EXISTS idx_vectorizer_runs_started_at ON vectorizer_runs (started_at);",
            ),
            (
                "create_vectorizer_run_events",
                """
            CREATE TABLE IF NOT EXISTS vectorizer_run_events (
                event_id TEXT PRIMARY KEY,
                run_id TEXT NOT NULL,
                index_name TEXT NOT NULL,
                product_id TEXT,
                event_type TEXT NOT NULL,
                disposition TEXT,
                stage TEXT,
                severity TEXT,
                reason TEXT NOT NULL,
                reason_code TEXT,
                reason_label TEXT,
                status TEXT NOT NULL,
                raw_name TEXT,
                normalized_name TEXT,
                category TEXT,
                subcategory TEXT,
                previous_state_json TEXT,
                current_state_json TEXT,
                source_snapshot_json TEXT,
                normalized_snapshot_json TEXT,
                details_json TEXT,
                missing_field_count INTEGER DEFAULT 0,
                changed_field_count INTEGER DEFAULT 0,
                created_at TEXT NOT NULL
            );
            """,
            ),
            (
                "index_vectorizer_run_events_run_id",
                """
            CREATE INDEX IF NOT EXISTS idx_vectorizer_run_events_run_id
                ON vectorizer_run_events (run_id, created_at);
            """,
            ),
            (
                "index_vectorizer_run_events_lookup",
                """
            CREATE INDEX IF NOT EXISTS idx_vectorizer_run_events_lookup
                ON vectorizer_run_events (run_id, event_type, reason, status);
            """,
            ),
            (
                "create_vectorizer_run_event_fields",
                """
            CREATE TABLE IF NOT EXISTS vectorizer_run_event_fields (
                event_field_id TEXT PRIMARY KEY,
                event_id TEXT NOT NULL,
                run_id TEXT NOT NULL,
                product_id TEXT,
                field_name TEXT NOT NULL,
                field_role TEXT NOT NULL,
                source_value_text TEXT,
                previous_value_text TEXT,
                current_value_text TEXT,
                notes TEXT,
                created_at TEXT NOT NULL
            );
            """,
            ),
            (
                "index_vectorizer_run_event_fields_event_id",
                """
            CREATE INDEX IF NOT EXISTS idx_vectorizer_run_event_fields_event_id
                ON vectorizer_run_event_fields (event_id, field_role);
            """,
            ),
            (
                "index_vectorizer_run_event_fields_product_id",
                """
            CREATE INDEX IF NOT EXISTS idx_vectorizer_run_event_fields_product_id
                ON vectorizer_run_event_fields (product_id, field_name);
            """,
            ),
            (
                "create_vectorizer_run_reason_counts",
                """
            CREATE TABLE IF NOT EXISTS vectorizer_run_reason_counts (
                run_id TEXT NOT NULL,
                stage TEXT,
                severity TEXT,
                reason_code TEXT NOT NULL,
                event_count INTEGER DEFAULT 0,
                product_count INTEGER DEFAULT 0,
                created_at TEXT NOT NULL,
                PRIMARY KEY (run_id, stage, severity, reason_code)
            );
            """,
            ),
            (
                "index_vectorizer_run_reason_counts_run_id",
                """
            CREATE INDEX IF NOT EXISTS idx_vectorizer_run_reason_counts_run_id
                ON vectorizer_run_reason_counts (run_id, stage, severity);
            """,
            ),
            (
                "create_vectorizer_run_product_snapshots",
                """
            CREATE TABLE IF NOT EXISTS vectorizer_run_product_snapshots (
                snapshot_id TEXT PRIMARY KEY,
                run_id TEXT NOT NULL,
                index_name TEXT NOT NULL,
                product_id TEXT NOT NULL,
                raw_name TEXT,
                normalized_name TEXT,
                category TEXT,
                subcategory TEXT,
                source_seen INTEGER DEFAULT 0,
                active_after_run INTEGER DEFAULT 0,
                disposition TEXT NOT NULL,
                reason_code TEXT,
                reason_label TEXT,
                status TEXT NOT NULL,
                quantity INTEGER,
                previous_quantity INTEGER,
                price REAL,
                previous_price REAL,
                changed_fields_json TEXT,
                created_at TEXT NOT NULL
            );
            """,
            ),
            (
                "index_vectorizer_run_product_snapshots_run_id",
                """
            CREATE INDEX IF NOT EXISTS idx_vectorizer_run_product_snapshots_run_id
                ON vectorizer_run_product_snapshots (run_id, disposition, status);
            """,
            ),
            (
                "index_vectorizer_run_product_snapshots_product_id",
                """
            CREATE INDEX IF NOT EXISTS idx_vectorizer_run_product_snapshots_product_id
                ON vectorizer_run_product_snapshots (product_id, created_at);
            """,
            ),
        ]
        for label, statement in statements:
            try:
                await self.client.exec_sql(statement)
            except Exception as exc:
                raise RuntimeError(f"run_reports.ensure_table failed at {label}: {exc}") from exc

        for column_name, column_type in (
            ("missing_id_excluded", "INTEGER DEFAULT 0"),
            ("d1_existing_ids_allowed", "INTEGER DEFAULT 0"),
            ("new_count", "INTEGER DEFAULT 0"),
            ("updated_count", "INTEGER DEFAULT 0"),
            ("missing_from_fetch_count", "INTEGER DEFAULT 0"),
            ("low_stock_removed_count", "INTEGER DEFAULT 0"),
            ("audit_warning_count", "INTEGER DEFAULT 0"),
            ("audit_hard_omit_count", "INTEGER DEFAULT 0"),
            ("source_issue_count", "INTEGER DEFAULT 0"),
            ("transform_issue_count", "INTEGER DEFAULT 0"),
            ("potency_anomaly_count", "INTEGER DEFAULT 0"),
            ("missing_metadata_count", "INTEGER DEFAULT 0"),
        ):
            await self._ensure_run_column(column_name, column_type)

        for column_name, column_type in (
            ("disposition", "TEXT"),
            ("stage", "TEXT"),
            ("severity", "TEXT"),
            ("reason_code", "TEXT"),
            ("reason_label", "TEXT"),
            ("normalized_name", "TEXT"),
            ("source_snapshot_json", "TEXT"),
            ("normalized_snapshot_json", "TEXT"),
            ("missing_field_count", "INTEGER DEFAULT 0"),
            ("changed_field_count", "INTEGER DEFAULT 0"),
        ):
            await self._ensure_event_column(column_name, column_type)

        await self.client.exec_sql(
            """
            CREATE INDEX IF NOT EXISTS idx_vectorizer_run_events_reason_stage
                ON vectorizer_run_events (run_id, reason_code, stage, severity);
            """
        )

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
            audit_warning_count = {int(sync_summary.get('audit_warning_count', 0) or 0)},
            audit_hard_omit_count = {int(sync_summary.get('audit_hard_omit_count', 0) or 0)},
            source_issue_count = {int(sync_summary.get('source_issue_count', 0) or 0)},
            transform_issue_count = {int(sync_summary.get('transform_issue_count', 0) or 0)},
            potency_anomaly_count = {int(sync_summary.get('potency_anomaly_count', 0) or 0)},
            missing_metadata_count = {int(sync_summary.get('missing_metadata_count', 0) or 0)},
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
        payload = await self.client.exec_sql(
            """
            SELECT *
            FROM vectorizer_runs
            ORDER BY started_at DESC
            LIMIT 1;
            """
        )
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
        materialized_events = list(events)
        await self.client.exec_sql(
            f"DELETE FROM vectorizer_run_reason_counts WHERE run_id = '{self.client.sql_quote(run_id)}';"
        )

        reason_counts: Dict[Tuple[str, str, str], Dict[str, Any]] = {}
        for event in materialized_events:
            event_id = str(uuid4())
            reason_code = str(event.get("reason_code") or event.get("reason") or "")
            field_records = event.get("field_records") or []
            missing_field_count = sum(1 for row in field_records if str(row.get("field_role") or "") == "missing")
            changed_field_count = sum(1 for row in field_records if str(row.get("field_role") or "") == "changed")
            sql = f"""
            INSERT INTO vectorizer_run_events
                (event_id, run_id, index_name, product_id, event_type, disposition, stage, severity,
                 reason, reason_code, reason_label, status, raw_name, normalized_name, category, subcategory,
                 previous_state_json, current_state_json, source_snapshot_json, normalized_snapshot_json,
                 details_json, missing_field_count, changed_field_count, created_at)
            VALUES
                ('{self.client.sql_quote(event_id)}',
                 '{self.client.sql_quote(run_id)}',
                 '{self.client.sql_quote(index_name)}',
                 {self._nullable_text(event.get('product_id'))},
                 '{self.client.sql_quote(str(event.get('event_type') or ''))}',
                 {self._nullable_text(event.get('disposition'))},
                 {self._nullable_text(event.get('stage'))},
                 {self._nullable_text(event.get('severity'))},
                 '{self.client.sql_quote(str(event.get('reason') or ''))}',
                 {self._nullable_text(reason_code)},
                 {self._nullable_text(event.get('reason_label'))},
                 '{self.client.sql_quote(str(event.get('status') or ''))}',
                 {self._nullable_text(event.get('raw_name'))},
                 {self._nullable_text(event.get('normalized_name'))},
                 {self._nullable_text(event.get('category'))},
                 {self._nullable_text(event.get('subcategory'))},
                 {self._nullable_json(event.get('previous_state_json'))},
                 {self._nullable_json(event.get('current_state_json'))},
                 {self._nullable_json(event.get('source_snapshot_json'))},
                 {self._nullable_json(event.get('normalized_snapshot_json'))},
                 {self._nullable_json(event.get('details_json'))},
                 {missing_field_count},
                 {changed_field_count},
                 '{self.client.sql_quote(created_at)}');
            """
            await self.client.exec_sql(sql)
            await self._record_event_fields(
                run_id=run_id,
                event_id=event_id,
                product_id=event.get("product_id"),
                field_records=field_records,
                created_at=created_at,
            )

            key = (
                str(event.get("stage") or ""),
                str(event.get("severity") or ""),
                reason_code,
            )
            bucket = reason_counts.setdefault(key, {"event_count": 0, "product_ids": set()})
            bucket["event_count"] += 1
            product_id = str(event.get("product_id") or "").strip()
            if product_id:
                bucket["product_ids"].add(product_id)

        for (stage, severity, reason_code), stats in reason_counts.items():
            sql = f"""
            INSERT INTO vectorizer_run_reason_counts
                (run_id, stage, severity, reason_code, event_count, product_count, created_at)
            VALUES
                ('{self.client.sql_quote(run_id)}',
                 '{self.client.sql_quote(stage)}',
                 '{self.client.sql_quote(severity)}',
                 '{self.client.sql_quote(reason_code)}',
                 {int(stats['event_count'])},
                 {int(len(stats['product_ids']))},
                 '{self.client.sql_quote(created_at)}')
            ON CONFLICT(run_id, stage, severity, reason_code) DO UPDATE SET
                event_count = excluded.event_count,
                product_count = excluded.product_count,
                created_at = excluded.created_at;
            """
            await self.client.exec_sql(sql)

    async def get_run_events(
        self,
        run_id: str,
        *,
        event_type: Optional[str] = None,
        reason: Optional[str] = None,
        status: Optional[str] = None,
        stage: Optional[str] = None,
        severity: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        where = [f"run_id = '{self.client.sql_quote(run_id)}'"]
        if event_type:
            where.append(f"event_type = '{self.client.sql_quote(event_type)}'")
        if reason:
            escaped = self.client.sql_quote(reason)
            where.append(f"(reason = '{escaped}' OR reason_code = '{escaped}')")
        if status:
            where.append(f"status = '{self.client.sql_quote(status)}'")
        if stage:
            where.append(f"stage = '{self.client.sql_quote(stage)}'")
        if severity:
            where.append(f"severity = '{self.client.sql_quote(severity)}'")
        sql = f"""
        SELECT *
        FROM vectorizer_run_events
        WHERE {" AND ".join(where)}
        ORDER BY created_at ASC, event_type ASC, reason ASC, product_id ASC;
        """
        payload = await self.client.exec_sql(sql)
        return payload.get("result", [{}])[0].get("results", []) or []

    async def get_run_reason_counts(self, run_id: str) -> List[Dict[str, Any]]:
        sql = f"""
        SELECT *
        FROM vectorizer_run_reason_counts
        WHERE run_id = '{self.client.sql_quote(run_id)}'
        ORDER BY stage ASC, severity ASC, reason_code ASC;
        """
        payload = await self.client.exec_sql(sql)
        return payload.get("result", [{}])[0].get("results", []) or []

    async def get_run_event_fields(self, run_id: str, event_id: Optional[str] = None) -> List[Dict[str, Any]]:
        where = [f"run_id = '{self.client.sql_quote(run_id)}'"]
        if event_id:
            where.append(f"event_id = '{self.client.sql_quote(event_id)}'")
        sql = f"""
        SELECT *
        FROM vectorizer_run_event_fields
        WHERE {" AND ".join(where)}
        ORDER BY created_at ASC, event_id ASC, field_name ASC;
        """
        payload = await self.client.exec_sql(sql)
        return payload.get("result", [{}])[0].get("results", []) or []

    async def record_product_snapshots(
        self,
        run_id: str,
        index_name: str,
        snapshots: Iterable[Dict[str, Any]],
    ) -> None:
        created_at = datetime.now(timezone.utc).isoformat()
        await self.client.exec_sql(
            f"DELETE FROM vectorizer_run_product_snapshots WHERE run_id = '{self.client.sql_quote(run_id)}';"
        )
        for snapshot in snapshots:
            product_id = str(snapshot.get("product_id") or "").strip()
            if not product_id:
                continue
            sql = f"""
            INSERT INTO vectorizer_run_product_snapshots
                (snapshot_id, run_id, index_name, product_id, raw_name, normalized_name, category, subcategory,
                 source_seen, active_after_run, disposition, reason_code, reason_label, status,
                 quantity, previous_quantity, price, previous_price, changed_fields_json, created_at)
            VALUES
                ('{self.client.sql_quote(str(uuid4()))}',
                 '{self.client.sql_quote(run_id)}',
                 '{self.client.sql_quote(index_name)}',
                 '{self.client.sql_quote(product_id)}',
                 {self._nullable_text(snapshot.get('raw_name'))},
                 {self._nullable_text(snapshot.get('normalized_name'))},
                 {self._nullable_text(snapshot.get('category'))},
                 {self._nullable_text(snapshot.get('subcategory'))},
                 {1 if snapshot.get('source_seen') else 0},
                 {1 if snapshot.get('active_after_run') else 0},
                 '{self.client.sql_quote(str(snapshot.get('disposition') or 'unchanged'))}',
                 {self._nullable_text(snapshot.get('reason_code'))},
                 {self._nullable_text(snapshot.get('reason_label'))},
                 '{self.client.sql_quote(str(snapshot.get('status') or 'applied'))}',
                 {self._nullable_int(snapshot.get('quantity'))},
                 {self._nullable_int(snapshot.get('previous_quantity'))},
                 {self._nullable_float(snapshot.get('price'))},
                 {self._nullable_float(snapshot.get('previous_price'))},
                 {self._nullable_json(snapshot.get('changed_fields') or [])},
                 '{self.client.sql_quote(created_at)}');
            """
            await self.client.exec_sql(sql)

    async def purge_product_snapshots(self, *, retain_days: int) -> int:
        cutoff = datetime.now(timezone.utc).timestamp() - max(int(retain_days), 0) * 86400
        cutoff_iso = datetime.fromtimestamp(cutoff, tz=timezone.utc).isoformat()
        payload = await self.client.exec_sql(
            f"""
            DELETE FROM vectorizer_run_product_snapshots
            WHERE created_at < '{self.client.sql_quote(cutoff_iso)}';
            """
        )
        meta = payload.get("result", [{}])[0].get("meta", {})
        return int(meta.get("changes", 0) or 0)

    async def get_run_product_snapshots(
        self,
        run_id: str,
        *,
        disposition: Optional[str] = None,
        product_id: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        where = [f"run_id = '{self.client.sql_quote(run_id)}'"]
        if disposition:
            where.append(f"disposition = '{self.client.sql_quote(disposition)}'")
        if product_id:
            where.append(f"product_id = '{self.client.sql_quote(product_id)}'")
        sql = f"""
        SELECT *
        FROM vectorizer_run_product_snapshots
        WHERE {" AND ".join(where)}
        ORDER BY disposition ASC, raw_name ASC, product_id ASC;
        """
        payload = await self.client.exec_sql(sql)
        return payload.get("result", [{}])[0].get("results", []) or []

    async def get_product_snapshot_history(
        self,
        index_name: str,
        product_id: str,
        *,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        sql = f"""
        SELECT *
        FROM vectorizer_run_product_snapshots
        WHERE index_name = '{self.client.sql_quote(index_name)}'
          AND product_id = '{self.client.sql_quote(product_id)}'
        ORDER BY created_at DESC
        LIMIT {max(int(limit), 1)};
        """
        payload = await self.client.exec_sql(sql)
        return payload.get("result", [{}])[0].get("results", []) or []

    async def _ensure_run_column(self, column_name: str, column_type: str) -> None:
        payload = await self.client.exec_sql("PRAGMA table_info('vectorizer_runs');")
        rows = payload.get("result", [{}])[0].get("results", []) or []
        existing = {str(row.get("name")) for row in rows if row.get("name")}
        if column_name in existing:
            return
        await self.client.exec_sql(f"ALTER TABLE vectorizer_runs ADD COLUMN {column_name} {column_type};")

    async def _ensure_event_column(self, column_name: str, column_type: str) -> None:
        payload = await self.client.exec_sql("PRAGMA table_info('vectorizer_run_events');")
        rows = payload.get("result", [{}])[0].get("results", []) or []
        existing = {str(row.get("name")) for row in rows if row.get("name")}
        if column_name in existing:
            return
        await self.client.exec_sql(f"ALTER TABLE vectorizer_run_events ADD COLUMN {column_name} {column_type};")

    async def _record_event_fields(
        self,
        *,
        run_id: str,
        event_id: str,
        product_id: Any,
        field_records: List[Dict[str, Any]],
        created_at: str,
    ) -> None:
        for row in field_records:
            sql = f"""
            INSERT INTO vectorizer_run_event_fields
                (event_field_id, event_id, run_id, product_id, field_name, field_role,
                 source_value_text, previous_value_text, current_value_text, notes, created_at)
            VALUES
                ('{self.client.sql_quote(str(uuid4()))}',
                 '{self.client.sql_quote(event_id)}',
                 '{self.client.sql_quote(run_id)}',
                 {self._nullable_text(product_id)},
                 '{self.client.sql_quote(str(row.get('field_name') or ''))}',
                 '{self.client.sql_quote(str(row.get('field_role') or ''))}',
                 {self._nullable_text(self._stringify_value(row.get('source_value')))},
                 {self._nullable_text(self._stringify_value(row.get('previous_value')))},
                 {self._nullable_text(self._stringify_value(row.get('current_value')))},
                 {self._nullable_text(row.get('notes'))},
                 '{self.client.sql_quote(created_at)}');
            """
            await self.client.exec_sql(sql)

    def _nullable_text(self, value: Any) -> str:
        if value is None or str(value).strip() == "":
            return "NULL"
        return f"'{self.client.sql_quote(str(value))}'"

    def _nullable_json(self, value: Any) -> str:
        if value is None:
            return "NULL"
        payload = self.client.sql_quote(json.dumps(value, default=str))
        return f"'{payload}'"

    def _nullable_int(self, value: Any) -> str:
        if value is None or str(value).strip() == "":
            return "NULL"
        return str(int(value))

    def _nullable_float(self, value: Any) -> str:
        if value is None or str(value).strip() == "":
            return "NULL"
        return str(float(value))

    def _stringify_value(self, value: Any) -> Optional[str]:
        if value is None:
            return None
        if isinstance(value, (dict, list)):
            return json.dumps(value, default=str)
        return str(value)

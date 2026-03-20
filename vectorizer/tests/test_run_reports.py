import os
import sys
import unittest


SRC_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src"))
if SRC_ROOT not in sys.path:
    sys.path.insert(0, SRC_ROOT)

from core.run_reports import D1RunReportStore  # noqa: E402


class FakeClient:
    def __init__(self) -> None:
        self.configured = True
        self.sql_calls = []

    async def exec_sql(self, sql: str):
        self.sql_calls.append(sql)
        return {"result": [{"results": []}]}

    def sql_quote(self, value: str) -> str:
        return str(value).replace("'", "''")


class RunReportsTests(unittest.IsolatedAsyncioTestCase):
    async def test_record_events_writes_parent_fields_and_reason_counts(self) -> None:
        store = D1RunReportStore(account_id=None, database_id=None, api_token=None)
        store.client = FakeClient()

        await store.record_events(
            run_id="run-1",
            index_name="products-qa",
            events=[
                {
                    "event_type": "excluded",
                    "disposition": "excluded",
                    "stage": "transform",
                    "severity": "hard_omit",
                    "reason": "potency_anomaly",
                    "reason_code": "potency_anomaly",
                    "reason_label": "Ambiguous edible potency data",
                    "status": "skipped",
                    "product_id": "prod-1",
                    "raw_name": "Sleep Gummies",
                    "normalized_name": "sleep gummies",
                    "category": "edibles",
                    "subcategory": "gummies",
                    "details_json": {"missing_fields": ["thc_total_mg"]},
                    "source_snapshot_json": {"id": "prod-1"},
                    "normalized_snapshot_json": {"category": "edibles"},
                    "field_records": [
                        {
                            "field_name": "thc_total_mg",
                            "field_role": "missing",
                            "source_value": None,
                            "previous_value": None,
                            "current_value": None,
                            "notes": None,
                        }
                    ],
                }
            ],
        )

        combined_sql = "\n".join(store.client.sql_calls)
        self.assertIn("INSERT INTO vectorizer_run_events", combined_sql)
        self.assertIn("INSERT INTO vectorizer_run_event_fields", combined_sql)
        self.assertIn("INSERT INTO vectorizer_run_reason_counts", combined_sql)

    async def test_record_product_snapshots_and_purge_write_snapshot_sql(self) -> None:
        store = D1RunReportStore(account_id=None, database_id=None, api_token=None)
        store.client = FakeClient()

        await store.record_product_snapshots(
            run_id="run-1",
            index_name="products-qa",
            snapshots=[
                {
                    "product_id": "prod-1",
                    "raw_name": "Sleep Gummies",
                    "normalized_name": "sleep gummies",
                    "category": "edibles",
                    "subcategory": "gummies",
                    "source_seen": True,
                    "active_after_run": True,
                    "disposition": "unchanged",
                    "reason_code": "unchanged",
                    "reason_label": "Tracked metadata unchanged",
                    "status": "applied",
                    "quantity": 8,
                    "previous_quantity": 8,
                    "price": 27.0,
                    "previous_price": 27.0,
                    "changed_fields": [],
                }
            ],
        )
        await store.purge_product_snapshots(retain_days=14)

        combined_sql = "\n".join(store.client.sql_calls)
        self.assertIn("DELETE FROM vectorizer_run_product_snapshots WHERE run_id = 'run-1'", combined_sql)
        self.assertIn("INSERT INTO vectorizer_run_product_snapshots", combined_sql)
        self.assertIn("DELETE FROM vectorizer_run_product_snapshots", combined_sql)


if __name__ == "__main__":
    unittest.main()

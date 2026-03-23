import os
import sys
import unittest
from types import SimpleNamespace


SRC_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src"))
if SRC_ROOT not in sys.path:
    sys.path.insert(0, SRC_ROOT)

from core.types import RemovalSummary  # noqa: E402
from run_sync_cycle import _compat_reconcile_summary, _delete_batch_with_fallback, build_cycle_options  # noqa: E402


class RunSyncCycleTests(unittest.TestCase):
    def test_build_cycle_options_ignores_stale_hours_for_active_cycle(self) -> None:
        options = build_cycle_options(
            SimpleNamespace(
                INDEX_NAME="products-qa",
                MIN_QUANTITY="5",
                STALE_HOURS="48",
                LIMIT="none",
            ),
            overrides={"stale_hours": 999},
            trigger_source="manual",
        )
        self.assertEqual(options.sync.index_name, "products-qa")
        self.assertEqual(options.reconcile.stale_hours, 0)

    def test_compat_reconcile_summary_uses_explicit_diff_terms(self) -> None:
        options = build_cycle_options(SimpleNamespace(INDEX_NAME="products-qa", MIN_QUANTITY="5", LIMIT="none"))
        summary = _compat_reconcile_summary(
            options,
            RemovalSummary(
                index_name="products-qa",
                missing_from_fetch_count=10,
                low_stock_removed_count=2,
                removed_count=12,
                deleted_vectors=12,
                deleted_d1_rows=12,
                sample_removed_ids=["a", "b"],
            ),
        )
        self.assertEqual(summary.removal_mode, "explicit_diff")
        self.assertEqual(summary.candidate_removed_ids, 12)
        self.assertEqual(summary.sample_removed_ids, ["a", "b"])


class DeleteBatchWithFallbackTests(unittest.IsolatedAsyncioTestCase):
    async def test_splits_large_failed_batch_until_success(self) -> None:
        class FakeApi:
            def __init__(self) -> None:
                self.calls: list[list[str]] = []

            async def delete_vectors(self, index_name: str, batch: list[str]) -> None:
                self.calls.append(list(batch))
                if len(batch) > 2:
                    raise RuntimeError("batch too large")

        class FakeD1Store:
            async def delete_ids(self, table_name: str, batch: list[str]) -> int:
                return len(batch)

        removal = RemovalSummary(index_name="products-prod")
        rows_by_id = {str(index): {"raw_name": f"Product {index}"} for index in range(5)}
        target_reasons = {str(index): "missing_from_fetch" for index in range(5)}
        removal_events = []
        deleted_ids: list[str] = []

        await _delete_batch_with_fallback(
            api=FakeApi(),
            d1_store=FakeD1Store(),
            table_name="vectorizer_uniques_products_prod",
            index_name="products-prod",
            batch=["0", "1", "2", "3", "4"],
            removal=removal,
            rows_by_id=rows_by_id,
            target_reasons=target_reasons,
            removal_events=removal_events,
            deleted_ids=deleted_ids,
        )

        self.assertEqual(removal.deleted_vectors, 5)
        self.assertEqual(removal.deleted_d1_rows, 5)
        self.assertEqual(removal.failed_removal_count, 0)
        self.assertEqual(sorted(deleted_ids), ["0", "1", "2", "3", "4"])
        self.assertEqual(len([event for event in removal_events if event.status == "applied"]), 5)

    async def test_records_single_id_failure_after_split(self) -> None:
        class FakeApi:
            async def delete_vectors(self, index_name: str, batch: list[str]) -> None:
                if len(batch) > 1 or batch == ["2"]:
                    raise RuntimeError("delete failed")

        class FakeD1Store:
            async def delete_ids(self, table_name: str, batch: list[str]) -> int:
                return len(batch)

        removal = RemovalSummary(index_name="products-prod")
        rows_by_id = {str(index): {"raw_name": f"Product {index}"} for index in range(4)}
        target_reasons = {str(index): "low_stock" for index in range(4)}
        removal_events = []
        deleted_ids: list[str] = []

        await _delete_batch_with_fallback(
            api=FakeApi(),
            d1_store=FakeD1Store(),
            table_name="vectorizer_uniques_products_prod",
            index_name="products-prod",
            batch=["0", "1", "2", "3"],
            removal=removal,
            rows_by_id=rows_by_id,
            target_reasons=target_reasons,
            removal_events=removal_events,
            deleted_ids=deleted_ids,
        )

        self.assertEqual(removal.deleted_vectors, 3)
        self.assertEqual(removal.deleted_d1_rows, 3)
        self.assertEqual(removal.failed_removal_count, 1)
        self.assertEqual(sorted(deleted_ids), ["0", "1", "3"])
        self.assertEqual(len([event for event in removal_events if event.status == "applied"]), 3)
        failed_events = [event for event in removal_events if event.status == "failed"]
        self.assertEqual(len(failed_events), 1)
        self.assertEqual(failed_events[0].product_id, "2")


if __name__ == "__main__":
    unittest.main()

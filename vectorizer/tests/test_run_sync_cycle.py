import os
import sys
import unittest
from types import SimpleNamespace


SRC_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src"))
if SRC_ROOT not in sys.path:
    sys.path.insert(0, SRC_ROOT)

from core.types import RemovalSummary  # noqa: E402
from run_sync_cycle import _compat_reconcile_summary, build_cycle_options  # noqa: E402


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


if __name__ == "__main__":
    unittest.main()

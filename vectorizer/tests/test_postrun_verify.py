import os
import sys
import unittest


SRC_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src"))
if SRC_ROOT not in sys.path:
    sys.path.insert(0, SRC_ROOT)

from postrun_verify import (  # noqa: E402
    _build_email_bodies,
    _build_email_subject,
    _resolve_verification_run,
    _sync_brand,
    _wait_for_target_run,
)


class PostrunVerifyBrandingTests(unittest.TestCase):
    def test_sync_brand_uses_lane_from_index_name(self) -> None:
        self.assertEqual(_sync_brand("products-qa"), "Cannavita QA Sync")
        self.assertEqual(_sync_brand("products-prod"), "Cannavita PROD Sync")
        self.assertEqual(_sync_brand("products-demo"), "Cannavita Sync")

    def test_email_subject_uses_prod_branding(self) -> None:
        subject = _build_email_subject(
            {
                "index_name": "products-prod",
                "source": "scheduled_postrun",
                "status": "passed",
            }
        )
        self.assertEqual(subject, "[Cannavita PROD Sync][products-prod][scheduled_postrun][passed]")

    def test_email_html_uses_lane_aware_branding(self) -> None:
        summary = {
            "verification_id": "ver-1",
            "suite": "categories_only",
            "source": "scheduled_postrun",
            "index_name": "products-prod",
            "vectorizer_run_id": "run-1",
            "status": "passed",
            "active_unique_count": 595,
            "expected_active_delta": -7,
            "actual_active_delta": -7,
            "checks": [],
        }
        grouped_events = {"removed": [], "added": [], "updated": [], "excluded": [], "warning": []}
        text_body, html_body = _build_email_bodies(
            summary,
            grouped_events,
            [],
            [],
            "https://example.com/report",
        )

        self.assertIn("Cannavita PROD Sync", text_body)
        self.assertIn("Cannavita PROD Sync", html_body)
        self.assertNotIn("Cannavita QA Sync", html_body)

    def test_email_body_separates_verifier_and_vectorizer_state(self) -> None:
        summary = {
            "verification_id": "ver-2",
            "suite": "categories_only",
            "source": "scheduled_postrun",
            "index_name": "products-qa",
            "vectorizer_run_id": "run-2",
            "status": "deferred",
            "verification_status": "deferred",
            "vectorizer_status": "running",
            "vectorizer_reporting_status": "warning",
            "vectorizer_reporting_warnings": ["record_events failed: timeout"],
            "checks": [
                {
                    "check_id": "latest_run",
                    "status": "deferred",
                    "details": {"reason": "target_run_not_finalized"},
                }
            ],
        }
        grouped_events = {"removed": [], "added": [], "updated": [], "excluded": [], "warning": []}

        text_body, html_body = _build_email_bodies(
            summary,
            grouped_events,
            [],
            summary["checks"],
            "https://example.com/report",
        )

        self.assertIn("Verification status: deferred", text_body)
        self.assertIn("Vectorizer status: running", text_body)
        self.assertIn("Vectorizer reporting: warning", text_body)
        self.assertIn("record_events failed: timeout", text_body)
        self.assertIn("Verification deferred", html_body)
        self.assertIn("Vectorizer reporting warnings", html_body)


class _FakeRunStore:
    def __init__(self, runs_by_id=None, latest_successful=None) -> None:
        self._runs_by_id = {key: list(value) for key, value in (runs_by_id or {}).items()}
        self.latest_successful = latest_successful
        self.latest_successful_calls = []

    async def get_run(self, run_id: str):
        sequence = self._runs_by_id.get(run_id, [])
        if not sequence:
            return None
        if len(sequence) == 1:
            return sequence[0]
        return sequence.pop(0)

    async def get_latest_successful_run(self, *, index_name=None, trigger_source=None):
        self.latest_successful_calls.append(
            {"index_name": index_name, "trigger_source": trigger_source}
        )
        return self.latest_successful


class PostrunVerifyRunResolutionTests(unittest.IsolatedAsyncioTestCase):
    async def test_wait_for_target_run_polls_until_run_completes(self) -> None:
        store = _FakeRunStore(
            runs_by_id={
                "run-1": [
                    {"run_id": "run-1", "status": "running"},
                    {"run_id": "run-1", "status": "success"},
                ]
            }
        )

        resolved, waited_seconds = await _wait_for_target_run(
            store,
            "run-1",
            timeout_seconds=0.05,
            poll_seconds=0,
        )

        self.assertIsNotNone(resolved)
        self.assertEqual(resolved["status"], "success")
        self.assertGreaterEqual(waited_seconds, 0.0)

    async def test_resolve_verification_run_prefers_exact_run_id(self) -> None:
        store = _FakeRunStore(
            runs_by_id={"run-2": [{"run_id": "run-2", "status": "success", "index_name": "products-prod"}]},
            latest_successful={"run_id": "older-run", "status": "success", "index_name": "products-prod"},
        )

        resolved, waited_seconds, selection = await _resolve_verification_run(
            store,
            index_name="products-prod",
            vectorizer_run_id="run-2",
            expected_trigger_source="scheduled",
        )

        self.assertEqual(selection, "explicit_run_id")
        self.assertEqual(resolved["run_id"], "run-2")
        self.assertEqual(store.latest_successful_calls, [])
        self.assertGreaterEqual(waited_seconds, 0.0)

    async def test_resolve_verification_run_falls_back_to_latest_successful(self) -> None:
        store = _FakeRunStore(
            latest_successful={"run_id": "latest-success", "status": "success", "index_name": "products-qa"}
        )

        resolved, waited_seconds, selection = await _resolve_verification_run(
            store,
            index_name="products-qa",
            vectorizer_run_id=None,
            expected_trigger_source="manual",
        )

        self.assertEqual(selection, "latest_successful")
        self.assertEqual(resolved["run_id"], "latest-success")
        self.assertEqual(
            store.latest_successful_calls,
            [{"index_name": "products-qa", "trigger_source": "manual"}],
        )
        self.assertEqual(waited_seconds, 0.0)


if __name__ == "__main__":
    unittest.main()

import os
import sys
import unittest


SRC_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src"))
if SRC_ROOT not in sys.path:
    sys.path.insert(0, SRC_ROOT)

from postrun_verify import _build_email_bodies, _build_email_subject, _sync_brand  # noqa: E402


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
        text_body, html_body = _build_email_bodies(summary, grouped_events, [], "https://example.com/report")

        self.assertIn("Cannavita PROD Sync", text_body)
        self.assertIn("Cannavita PROD Sync", html_body)
        self.assertNotIn("Cannavita QA Sync", html_body)


if __name__ == "__main__":
    unittest.main()

import os
import sys
import unittest


SRC_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src"))
if SRC_ROOT not in sys.path:
    sys.path.insert(0, SRC_ROOT)

from core.audit import audit_source_product, audit_transformed_product  # noqa: E402
from normalize_products import transform_product  # noqa: E402


class AuditTests(unittest.TestCase):
    def test_source_audit_flags_missing_brand_and_effects(self) -> None:
        findings = audit_source_product(
            {
                "id": "prod-1",
                "name": "Sleepy Gummies",
                "category": "EDIBLES",
                "subcategory": "GUMMIES",
                "slug": "sleepy-gummies",
                "image": "https://images.example.com/1.png",
                "variants": [{"priceRec": 25}],
                "effects": [],
            }
        )
        reason_codes = {finding["reason_code"] for finding in findings}
        self.assertIn("missing_source_required_metadata", reason_codes)
        self.assertIn("missing_source_effects", reason_codes)

    def test_transform_audit_flags_ambiguous_edible_potency(self) -> None:
        raw_product = {
            "id": "prod-2",
            "name": "Sleep Gummies",
            "category": "EDIBLES",
            "subcategory": "GUMMIES",
            "slug": "sleep-gummies",
            "image": "https://images.example.com/2.png",
            "brand": {"name": "Wana"},
            "effects": ["sleepy", "relaxed"],
            "strainType": "INDICA",
            "variants": [{"priceRec": 28, "quantity": 12}],
            "potencyThc": {"formatted": "0.19%", "range": [0.19], "unit": "%"},
        }
        normalized = transform_product(raw_product)
        findings = audit_transformed_product(raw_product, normalized)
        reason_codes = {finding["reason_code"] for finding in findings}
        self.assertIn("potency_anomaly", reason_codes)


if __name__ == "__main__":
    unittest.main()

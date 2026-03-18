import os
import sys
import unittest


SRC_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src"))
if SRC_ROOT not in sys.path:
    sys.path.insert(0, SRC_ROOT)

from normalize_products import (  # noqa: E402
    extract_pack_and_mg_from_name,
    extract_preferred_variant_price,
    normalize_thc_for_edibles,
    transform_edible_data,
)


class NormalizeProductsTests(unittest.TestCase):
    def test_extract_pack_and_mg_from_name_supports_pack_wording(self) -> None:
        result = extract_pack_and_mg_from_name("Blueberry Gummies [10 pack] | 100mg")
        self.assertEqual(result["pack_count"], 10)
        self.assertEqual(result["thc_total_mg"], 100.0)
        self.assertEqual(result["thc_per_unit_mg"], 10.0)

    def test_edible_thc_uses_text_when_source_is_percentage(self) -> None:
        result = normalize_thc_for_edibles(
            potency_thc={"formatted": "0.19%", "range": [0.19], "unit": "%"},
            subcategory="gummies",
            pack_count=10,
            name="Blueberry Indica Gummies [10 pack] | 100mg",
            description="",
            slug="blueberry-indica-gummies-10-pack-100mg",
        )
        self.assertEqual(result["thc_total_mg"], 100.0)
        self.assertEqual(result["thc_per_unit_mg"], 10.0)
        self.assertEqual(result["_potency_audit"]["status"], "resolved")
        self.assertEqual(result["_potency_audit"]["source_classification"], "concentration")

    def test_edible_thc_marks_ambiguous_concentration_without_safe_total(self) -> None:
        result = normalize_thc_for_edibles(
            potency_thc={"formatted": "1.95mg/g", "range": [1.95], "unit": "mg/g"},
            subcategory="gummies",
            pack_count=10,
            name="Blueberry Gummies",
            description="Sleepy mixed berry gummies.",
            slug="blueberry-gummies",
        )
        self.assertNotIn("thc_total_mg", result)
        self.assertEqual(result["_potency_audit"]["status"], "ambiguous")
        self.assertEqual(result["_potency_audit"]["reason"], "concentration_without_safe_total")

    def test_transform_edible_data_does_not_invent_relaxed_effect(self) -> None:
        normalized = transform_edible_data(
            {
                "id": "prod-1",
                "name": "Night Gummies [10 pack] | 100mg",
                "category": "EDIBLES",
                "subcategory": "GUMMIES",
                "description": "Per Package: 100mg THC",
                "effects": [],
                "brand": {"name": "Wana"},
                "slug": "night-gummies-10-pack-100mg",
                "image": "https://images.example.com/1.png",
                "variants": [{"priceRec": 28, "quantity": 12}],
                "potencyThc": {"formatted": "100mg", "range": [100], "unit": "mg"},
            }
        )
        self.assertEqual(normalized["effects"], [])

    def test_price_extraction_prefers_special_retail_price(self) -> None:
        price = extract_preferred_variant_price(
            [
                {"priceRec": 40, "specialPriceRec": 32, "priceMed": 29},
                {"priceRec": 45},
            ]
        )
        self.assertEqual(price, 32.0)


if __name__ == "__main__":
    unittest.main()

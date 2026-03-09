from __future__ import annotations

import json
import os
from functools import lru_cache
from typing import Any, Dict

from normalize_products import get_potency_label


@lru_cache(maxsize=1)
def load_schema() -> Dict[str, Any]:
    schema_path = os.path.join(os.path.dirname(__file__), "..", "schema.json")
    with open(schema_path, "r") as handle:
        return json.load(handle)


def build_page_content(product: Dict[str, Any]) -> str:
    parts = []

    if product.get("name"):
        parts.append(product["name"])
    if product.get("description"):
        parts.append(product["description"])

    effects = product.get("effects", [])
    if effects:
        parts.append(f"Effects: {', '.join(effects)}")

    flavor = product.get("flavor")
    if flavor:
        if isinstance(flavor, list):
            flavor_str = ", ".join(str(item) for item in flavor if item)
            if flavor_str:
                parts.append(f"Flavor: {flavor_str}")
        else:
            parts.append(f"Flavor: {flavor}")

    if product.get("brand_tagline"):
        parts.append(f"Brand: {product['brand_tagline']}")

    if product.get("subcategory"):
        parts.append(f"Subcategory: {product['subcategory']}")

    terpenes = product.get("terpenes", [])
    if terpenes and isinstance(terpenes, list):
        aromas_list = []
        benefits_list = []
        for terpene in terpenes:
            if not isinstance(terpene, dict):
                continue
            aromas_list.extend(terpene.get("aromas", []) or [])
            benefits_list.extend(terpene.get("potentialHealthBenefits", []) or [])
        if aromas_list:
            parts.append(f"Aromas: {', '.join(sorted(set(aromas_list)))}")
        if benefits_list:
            parts.append(f"Health Benefits: {', '.join(sorted(set(benefits_list)))}")

    cannabinoids = product.get("cannabinoids", [])
    if cannabinoids and isinstance(cannabinoids, list):
        descriptions = []
        for cannabinoid in cannabinoids:
            if not isinstance(cannabinoid, dict):
                continue
            name = cannabinoid.get("name", "")
            desc = cannabinoid.get("description", "")
            if name and desc:
                truncated = desc[:150] + "..." if len(desc) > 150 else desc
                descriptions.append(f"{name}: {truncated}")
        if descriptions:
            parts.append(f"Cannabinoids: {'; '.join(descriptions[:3])}")

    category = product.get("category", "")
    thc_value = product.get("thc_per_unit_mg") if category == "edibles" else product.get("thc_percentage")
    if thc_value is not None:
        potency = get_potency_label(category, thc_value)
        if potency:
            parts.append(f"Potency: {potency}")

    return ". ".join(parts)


def build_metadata(product: Dict[str, Any]) -> Dict[str, Any]:
    schema = load_schema()
    category = product.get("category", "").lower() if product.get("category") else ""
    product_type = product.get("type", "").lower() if product.get("type") else ""

    metadata: Dict[str, Any] = {
        "name": product.get("name", ""),
        "category": category,
        "type": product_type,
        "brand": product.get("brand", ""),
    }

    product_id = product.get("id")
    if not product_id:
        raise ValueError(f"Product missing required 'id' field: {product.get('name', 'Unknown')}")
    metadata["id"] = product_id

    subcategory = product.get("subcategory")
    if subcategory:
        normalized_subcategory = subcategory.lower()
        valid_subcategories = schema.get("subcategories", {}).get(category, [])
        if normalized_subcategory in valid_subcategories:
            metadata["subcategory"] = normalized_subcategory

    if product.get("brand_tagline"):
        metadata["brand_tagline"] = product["brand_tagline"]

    metadata["effects"] = product.get("effects", [])

    flavor = product.get("flavor")
    if flavor:
        if isinstance(flavor, list):
            metadata["flavor"] = [str(item).lower() for item in flavor if item]
        else:
            metadata["flavor"] = [str(flavor).lower()]
    else:
        metadata["flavor"] = []

    optional_fields = [
        "total_weight_ounce", "total_weight_grams", "individual_weight_grams",
        "thc_percentage", "thc_total_mg", "thc_per_unit_mg", "thc_per_serving_mg",
        "cbd_percentage", "cbd_total_mg", "cbd_per_unit_mg",
        "cbg_total_mg", "cbg_per_serving_mg",
        "total_volume_ml", "serving_size_ml",
        "pack_count", "serving_size_mg",
        "inStock", "price", "shopLink", "imageLink", "slug", "quantity",
    ]
    for field in optional_fields:
        if product.get(field) is not None:
            metadata[field] = product[field]

    terpenes = product.get("terpenes")
    if terpenes and isinstance(terpenes, list):
        terpene_names = []
        for terpene in terpenes:
            if isinstance(terpene, dict):
                name = terpene.get("name")
                if name:
                    terpene_names.append(str(name))
            elif isinstance(terpene, str):
                terpene_names.append(terpene)
        if terpene_names:
            metadata["terpenes"] = terpene_names

    cannabinoids = product.get("cannabinoids")
    if cannabinoids and isinstance(cannabinoids, list):
        cannabinoid_names = []
        for cannabinoid in cannabinoids:
            if isinstance(cannabinoid, dict):
                name = cannabinoid.get("name")
                if name:
                    cannabinoid_names.append(str(name))
            elif isinstance(cannabinoid, str):
                cannabinoid_names.append(cannabinoid)
        if cannabinoid_names:
            metadata["cannabinoids"] = cannabinoid_names

    metadata["page_content"] = build_page_content(product)
    return metadata


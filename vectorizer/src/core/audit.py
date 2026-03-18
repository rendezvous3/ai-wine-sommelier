from __future__ import annotations

from typing import Any, Dict, List, Optional

from d1_uniques import normalize_product_name
from normalize_products import (
    extract_preferred_variant_price,
    normalize_category,
    normalize_strain_type,
    normalize_subcategory,
)


EFFECT_DRIVEN_CATEGORIES = {
    "flower",
    "prerolls",
    "edibles",
    "vaporizers",
    "concentrates",
    "tinctures",
}

REQUIRED_METADATA_FIELDS = (
    "id",
    "name",
    "category",
    "brand",
    "subcategory",
    "price",
    "imageLink",
    "link_target",
)


def compact_source_snapshot(product: Dict[str, Any]) -> Dict[str, Any]:
    variants = product.get("variants") if isinstance(product.get("variants"), list) else []
    variant_excerpt: List[Dict[str, Any]] = []
    for variant in variants[:3]:
        if not isinstance(variant, dict):
            continue
        variant_excerpt.append(
            {
                "option": variant.get("option"),
                "quantity": variant.get("quantity"),
                "priceRec": variant.get("priceRec"),
                "specialPriceRec": variant.get("specialPriceRec"),
                "priceMed": variant.get("priceMed"),
                "specialPriceMed": variant.get("specialPriceMed"),
            }
        )

    cannabinoids: List[Dict[str, Any]] = []
    raw_cannabinoids = product.get("cannabinoids") if isinstance(product.get("cannabinoids"), list) else []
    for entry in raw_cannabinoids[:5]:
        if not isinstance(entry, dict):
            continue
        cannabinoid = entry.get("cannabinoid") if isinstance(entry.get("cannabinoid"), dict) else {}
        cannabinoids.append(
            {
                "name": cannabinoid.get("name"),
                "value": entry.get("value"),
                "unit": entry.get("unit"),
            }
        )

    return {
        "id": product.get("id"),
        "name": product.get("name"),
        "category": product.get("category"),
        "subcategory": product.get("subcategory"),
        "strainType": product.get("strainType"),
        "slug": product.get("slug"),
        "brand_name": (product.get("brand") or {}).get("name") if isinstance(product.get("brand"), dict) else None,
        "has_image": bool(product.get("image")),
        "image_count": len(product.get("images") or []) if isinstance(product.get("images"), list) else 0,
        "variant_excerpt": variant_excerpt,
        "potencyThc": _compact_potency(product.get("potencyThc")),
        "potencyCbd": _compact_potency(product.get("potencyCbd")),
        "cannabinoids": cannabinoids,
    }


def compact_normalized_snapshot(product: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    if not isinstance(product, dict):
        return {}
    return {
        "id": product.get("id"),
        "name": product.get("name"),
        "category": product.get("category"),
        "subcategory": product.get("subcategory"),
        "type": product.get("type"),
        "brand": product.get("brand"),
        "price": product.get("price"),
        "imageLink": product.get("imageLink"),
        "slug": product.get("slug"),
        "shopLink": product.get("shopLink"),
        "effects": product.get("effects"),
        "thc_percentage": product.get("thc_percentage"),
        "thc_total_mg": product.get("thc_total_mg"),
        "thc_per_unit_mg": product.get("thc_per_unit_mg"),
    }


def audit_source_product(product: Dict[str, Any]) -> List[Dict[str, Any]]:
    category = normalize_category(str(product.get("category") or ""))
    findings: List[Dict[str, Any]] = []
    snapshot = compact_source_snapshot(product)
    missing_fields: List[str] = []
    brand_name = ""
    if isinstance(product.get("brand"), dict):
        brand_name = str(product["brand"].get("name") or "").strip()

    if not str(product.get("id") or "").strip():
        missing_fields.append("id")
    if not str(product.get("name") or "").strip():
        missing_fields.append("name")
    if not category:
        missing_fields.append("category")
    if not brand_name:
        missing_fields.append("brand")
    if not normalize_subcategory(str(product.get("subcategory") or ""), category):
        missing_fields.append("subcategory")
    if not _has_usable_source_price(product):
        missing_fields.append("price")
    if not _has_usable_source_image(product):
        missing_fields.append("imageLink")
    if not _has_link_target(str(product.get("slug") or ""), None):
        missing_fields.append("link_target")

    if missing_fields:
        findings.append(
            _finding(
                stage="source",
                severity="hard_omit",
                reason_code="missing_source_required_metadata",
                reason_label="Missing required source metadata",
                missing_fields=missing_fields,
                source_snapshot=snapshot,
            )
        )

    if _requires_type(category):
        strain_type = normalize_strain_type(str(product.get("strainType") or ""))
        if not strain_type:
            findings.append(
                _finding(
                    stage="source",
                    severity="hard_omit",
                    reason_code="missing_source_type",
                    reason_label="Missing required source type",
                    missing_fields=["type"],
                    source_snapshot=snapshot,
                )
            )

    if _requires_effects(category):
        effects = product.get("effects")
        if not isinstance(effects, list) or not any(str(value).strip() for value in effects):
            findings.append(
                _finding(
                    stage="source",
                    severity="hard_omit",
                    reason_code="missing_source_effects",
                    reason_label="Missing required source effects",
                    missing_fields=["effects"],
                    source_snapshot=snapshot,
                )
            )

    return findings


def audit_transformed_product(raw_product: Dict[str, Any], normalized: Dict[str, Any]) -> List[Dict[str, Any]]:
    category = str(normalized.get("category") or "").strip().lower()
    findings: List[Dict[str, Any]] = []
    source_snapshot = compact_source_snapshot(raw_product)
    normalized_snapshot = compact_normalized_snapshot(normalized)

    missing_fields: List[str] = []
    if not str(normalized.get("id") or "").strip():
        missing_fields.append("id")
    if not str(normalized.get("name") or "").strip():
        missing_fields.append("name")
    if not category:
        missing_fields.append("category")
    if not str(normalized.get("brand") or "").strip():
        missing_fields.append("brand")
    if not str(normalized.get("subcategory") or "").strip():
        missing_fields.append("subcategory")
    if normalized.get("price") is None:
        missing_fields.append("price")
    if not str(normalized.get("imageLink") or "").strip():
        missing_fields.append("imageLink")
    if not _has_link_target(str(normalized.get("slug") or ""), str(normalized.get("shopLink") or "")):
        missing_fields.append("link_target")

    if missing_fields:
        findings.append(
            _finding(
                stage="transform",
                severity="hard_omit",
                reason_code="missing_transformed_required_metadata",
                reason_label="Missing required transformed metadata",
                missing_fields=missing_fields,
                source_snapshot=source_snapshot,
                normalized_snapshot=normalized_snapshot,
            )
        )

    if _requires_type(category) and not str(normalized.get("type") or "").strip():
        findings.append(
            _finding(
                stage="transform",
                severity="hard_omit",
                reason_code="missing_transformed_type",
                reason_label="Missing required transformed type",
                missing_fields=["type"],
                source_snapshot=source_snapshot,
                normalized_snapshot=normalized_snapshot,
            )
        )

    if _requires_effects(category):
        effects = normalized.get("effects")
        if not isinstance(effects, list) or not any(str(value).strip() for value in effects):
            findings.append(
                _finding(
                    stage="transform",
                    severity="hard_omit",
                    reason_code="missing_transformed_effects",
                    reason_label="Missing required transformed effects",
                    missing_fields=["effects"],
                    source_snapshot=source_snapshot,
                    normalized_snapshot=normalized_snapshot,
                )
            )

    potency_audit = normalized.get("_potency_audit")
    if isinstance(potency_audit, dict) and potency_audit.get("status") == "ambiguous":
        details = dict(potency_audit)
        details.setdefault("category", category)
        findings.append(
            _finding(
                stage="transform",
                severity="hard_omit",
                reason_code="potency_anomaly",
                reason_label="Ambiguous edible potency data",
                missing_fields=["thc_total_mg", "thc_per_unit_mg"],
                details=details,
                source_snapshot=source_snapshot,
                normalized_snapshot=normalized_snapshot,
            )
        )

    return findings


def _compact_potency(value: Any) -> Optional[Dict[str, Any]]:
    if not isinstance(value, dict):
        return None
    return {
        "formatted": value.get("formatted"),
        "range": value.get("range"),
        "unit": value.get("unit"),
    }


def _finding(
    *,
    stage: str,
    severity: str,
    reason_code: str,
    reason_label: str,
    missing_fields: Optional[List[str]] = None,
    details: Optional[Dict[str, Any]] = None,
    source_snapshot: Optional[Dict[str, Any]] = None,
    normalized_snapshot: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    missing = sorted({field for field in (missing_fields or []) if field})
    field_records = [
        {
            "field_name": field_name,
            "field_role": "missing",
            "source_value": None,
            "previous_value": None,
            "current_value": None,
            "notes": None,
        }
        for field_name in missing
    ]
    payload_details = dict(details or {})
    if missing:
        payload_details.setdefault("missing_fields", missing)
    return {
        "stage": stage,
        "severity": severity,
        "reason_code": reason_code,
        "reason_label": reason_label,
        "missing_fields": missing,
        "details": payload_details,
        "field_records": field_records,
        "source_snapshot": source_snapshot or {},
        "normalized_snapshot": normalized_snapshot or {},
    }


def _has_link_target(slug: str, shop_link: Optional[str]) -> bool:
    return bool((slug or "").strip() or (shop_link or "").strip())


def _has_usable_source_image(product: Dict[str, Any]) -> bool:
    if str(product.get("image") or "").strip():
        return True
    images = product.get("images")
    if not isinstance(images, list):
        return False
    for image in images:
        if isinstance(image, dict) and str(image.get("url") or "").strip():
            return True
    return False


def _has_usable_source_price(product: Dict[str, Any]) -> bool:
    return extract_preferred_variant_price(product.get("variants")) is not None


def _requires_effects(category: str) -> bool:
    return category in EFFECT_DRIVEN_CATEGORIES


def _requires_type(category: str) -> bool:
    return category in EFFECT_DRIVEN_CATEGORIES


def build_warning_or_exclusion_event(
    *,
    finding: Dict[str, Any],
    product_id: Optional[str],
    raw_name: str,
    category: str,
    subcategory: str,
    normalized_name: Optional[str],
) -> Dict[str, Any]:
    event_type = "warning" if finding.get("severity") == "warning" else "excluded"
    status = "applied" if event_type == "warning" else "skipped"
    return {
        "event_type": event_type,
        "reason": finding.get("reason_code") or "",
        "reason_code": finding.get("reason_code") or "",
        "reason_label": finding.get("reason_label") or "",
        "status": status,
        "disposition": "warning" if event_type == "warning" else "excluded",
        "stage": finding.get("stage") or "pipeline",
        "severity": finding.get("severity") or ("warning" if event_type == "warning" else "hard_omit"),
        "product_id": product_id,
        "raw_name": raw_name or None,
        "normalized_name": normalized_name or normalize_product_name(raw_name or ""),
        "category": category or None,
        "subcategory": subcategory or None,
        "source_snapshot_json": finding.get("source_snapshot") or {},
        "normalized_snapshot_json": finding.get("normalized_snapshot") or {},
        "field_records": finding.get("field_records") or [],
        "details_json": finding.get("details") or {},
    }

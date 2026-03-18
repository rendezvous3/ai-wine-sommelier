import json
import os
import re
from typing import Dict, Any, Optional, List

FALLBACK_SCHEMA = {
    "subcategories": {
        "edibles": [
            "default",
            "chews",
            "chocolates",
            "cooking-baking",
            "drinks",
            "gummies",
            "live-resin-gummies",
            "live-rosin-gummies",
        ],
        "vaporizers": [
            "default",
            "all-in-one",
            "cartridges",
            "disposables",
            "live-resin",
            "live-rosin",
        ],
        "prerolls": [
            "default",
            "blunts",
            "infused-prerolls",
            "infused-preroll-packs",
            "pre-roll-packs",
            "singles",
        ],
        "flower": [
            "default",
            "bulk-flower",
            "pre-ground",
            "premium-flower",
            "small-buds",
            "whole-flower",
        ],
        "tinctures": ["default", "unflavored", "herbal"],
        "cbd": ["default", "oil", "cream", "tincture", "chews", "pet-food"],
        "concentrates": [
            "default",
            "badder",
            "hash",
            "live-resin",
            "live-rosin",
            "rosin",
            "unflavored",
        ],
        "topicals": ["default", "balms"],
        "accessories": [
            "default",
            "batteries",
            "glassware",
            "grinders",
            "lighters",
            "papers-rolling-supplies",
        ],
    }
}

# Load schema at module level (can be overridden)
try:
    SCHEMA_PATH = os.path.join(os.path.dirname(__file__), "schema.json")
    with open(SCHEMA_PATH, "r") as f:
        schema = json.load(f)
except FileNotFoundError:
    schema = FALLBACK_SCHEMA

# Mapping from display names AND Dutchie API formats to schema subcategory values (lowercase kebab-case)
SUBCATEGORY_MAPPING = {
    # Demo format (display names)
    "Premium": "premium-flower",
    "Whole Flower": "whole-flower",
    "Pre-Roll Packs": "pre-roll-packs",
    "Singles": "singles",
    "Live Rosin Gummies": "live-rosin-gummies",
    "Live Resin Gummies": "live-resin-gummies",
    "Gummies": "gummies",
    "Chocolates": "chocolates",
    "Drinks": "drinks",
    "All-In-One": "all-in-one",
    "Cartridges": "cartridges",
    "Disposables": "disposables",
    "Live Resin": "live-resin",
    "Badder": "badder",
    "Hash": "hash",
    # Dutchie API uppercase formats
    "PREMIUM": "premium-flower",
    "WHOLE_FLOWER": "whole-flower",
    "BULK_FLOWER": "bulk-flower",
    "SMALL_BUDS": "small-buds",
    "PRE_GROUND": "pre-ground",
    "DEFAULT": "default",
    "SINGLES": "singles",
    "PACKS": "pre-roll-packs",
    "INFUSED": "infused-prerolls",
    "INFUSED_PRE_ROLL_PACKS": "infused-preroll-packs",
    "BLUNTS": "blunts",
    "GUMMIES": "gummies",
    "COOKING_BAKING": "cooking-baking",
    "LIVE_RESIN_GUMMIES": "live-resin-gummies",
    "LIVE_ROSIN_GUMMIES": "live-rosin-gummies",
    "CHOCOLATES": "chocolates",
    "DRINKS": "drinks",
    "CHEWS": "chews",
    "LIVE_RESIN": "live-resin",
    "LIVE_ROSIN": "live-rosin",
    "HERBAL": "herbal",
    "ALL_IN_ONE": "all-in-one",
    "CARTRIDGES": "cartridges",
    "DISPOSABLES": "disposables",
    "UNFLAVORED": "unflavored",
    "BADDER": "badder",
    "HASH": "hash",
    "ROSIN": "rosin",
    "BALMS": "balms",
    "PAPERS_ROLLING_SUPPLIES": "papers-rolling-supplies",
    "GRINDERS": "grinders",
    "LIGHTERS": "lighters",
    "BATTERIES": "batteries",
    "GLASSWARE": "glassware",
}

# Potency scales by category (centralized from vectorize.py)
# Each category has thresholds for: mild, balanced, moderate, strong, very_strong
# Values are (min, max) tuples where min is inclusive, max is exclusive
POTENCY_SCALES = {
    "flower": {
        "mild": (0, 13),
        "balanced": (13, 18),
        "moderate": (18, 22),
        "strong": (22, 28),
        "very_strong": (28, 100)
    },
    "prerolls": {
        "mild": (0, 13),
        "balanced": (13, 18),
        "moderate": (18, 22),
        "strong": (22, 28),
        "very_strong": (28, 100)
    },
    "vaporizers": {
        "mild": (0, 66),
        "balanced": (66, 75),
        "moderate": (75, 85),
        "strong": (85, 90),
        "very_strong": (90, 100)
    },
    "concentrates": {
        "mild": (0, 66),
        "balanced": (66, 75),
        "moderate": (75, 85),
        "strong": (85, 90),
        "very_strong": (90, 100)
    },
    "edibles": {
        # mg per unit scale (thc_per_unit_mg)
        "mild": (0, 2.5),
        "balanced": (2.5, 5),
        "moderate": (5, 10),
        "strong": (10, 25),
        "very_strong": (25, 100)
    }
}

# Effect groups for cleaning logic (moved from vectorize.py)
EFFECT_GROUPS = {
    "sedating": {"sleepy", "sedated", "relaxed", "calm", "chill"},
    "energizing": {"energetic", "uplifting", "energized"},
    "creative": {"creative", "inspired"},
    "joyful": {"happy", "euphoric"},
    "clear_mind": {"clear-mind", "focused"}
}


# ============================================================================
# CENTRALIZED UTILITY FUNCTIONS (moved from vectorize.py)
# ============================================================================

def normalize_category(category: str) -> str:
    """
    Normalize category from Dutchie API format to schema format.

    Converts:
    - "PRE_ROLLS" -> "prerolls"
    - "FLOWER" -> "flower"
    - "EDIBLES" -> "edibles"

    Args:
        category: Raw category string from API (e.g., "PRE_ROLLS", "FLOWER")

    Returns:
        Normalized category string (lowercase, no underscores)
    """
    if not category:
        return ""
    # Convert to lowercase and remove underscores
    return category.lower().replace("_", "")


def normalize_strain_type(strain_type: str) -> str:
    """
    Normalize strain type from Dutchie API format to schema format.

    Converts:
    - "INDICA_HYBRID" -> "indica-hybrid"
    - "SATIVA_HYBRID" -> "sativa-hybrid"
    - "INDICA" -> "indica"
    - "SATIVA" -> "sativa"
    - "HYBRID" -> "hybrid"

    Args:
        strain_type: Raw strain type string from API (e.g., "INDICA_HYBRID", "SATIVA")

    Returns:
        Normalized strain type string (lowercase, underscores replaced with hyphens)
    """
    if not strain_type:
        return ""
    # Convert to lowercase and replace underscores with hyphens
    return strain_type.lower().replace("_", "-")


def get_potency_label(category: str, value: float) -> str:
    """
    Get potency label for a category and THC value.

    Centralized potency label generator that works for all categories.
    Uses POTENCY_SCALES to determine the appropriate label.

    Args:
        category: Product category (flower, prerolls, edibles, etc.)
        value: THC value (percentage for flower/prerolls/vaporizers,
               mg per unit for edibles)

    Returns:
        Potency label string (e.g., "Moderate potency") or empty string if not applicable.
    """
    if value is None:
        return ""

    scale = POTENCY_SCALES.get(category.lower())
    if not scale:
        return ""

    for label, (min_val, max_val) in scale.items():
        if min_val <= value < max_val:
            return label.replace("_", " ").title() + " potency"

    return ""


def clean_effects(effects: list, product_type: str) -> list:
    """
    Clean effects array to remove contradictory effects.

    Moved from vectorize.py for centralization.

    Strategies:
    1. Sedating effects are isolated - if present, remove all energizing/creative/joyful effects
    2. Type-based filtering for extremes (energizing only in sativa/hybrid, sedating extremes only in indica/hybrid)
    3. Creative and joyful effects can blend with energizing, but NOT with sedating

    Args:
        effects: List of effect strings
        product_type: Product strain type (indica, sativa, hybrid, etc.)

    Returns:
        Cleaned list of effects
    """
    if not effects or not isinstance(effects, list):
        return []

    # Normalize to lowercase
    normalized = [str(e).lower().strip() for e in effects if e]
    if not normalized:
        return []

    # Normalize variations
    # "clear mind" -> "clear-mind"
    normalized = ["clear-mind" if e == "clear mind" else e for e in normalized]
    # "euphoria", "euphoric" -> "euphoric"
    normalized = ["euphoric" if e in ["euphoria"] else e for e in normalized]

    # Get effect groups
    sedating_effects = EFFECT_GROUPS["sedating"]
    energizing_effects = EFFECT_GROUPS["energizing"]
    creative_effects = EFFECT_GROUPS["creative"]
    joyful_effects = EFFECT_GROUPS["joyful"]

    # Strategy 2: Type-based filtering for extremes
    product_type_lower = product_type.lower() if product_type else ""

    # If indica, remove energizing effects
    if product_type_lower in ["indica", "indica-hybrid", "indica-dominant"]:
        normalized = [e for e in normalized if e not in energizing_effects]

    # If sativa, remove extreme sedating effects (sleepy, sedated) but keep relaxed/calm/chill
    if product_type_lower in ["sativa", "sativa-hybrid", "sativa-dominant"]:
        normalized = [e for e in normalized if e not in {"sleepy", "sedated"}]

    # Strategy 1: Sedating effects are isolated - if ANY sedating effect is present,
    # remove ALL energizing, creative, and joyful effects
    has_sedating = any(e in sedating_effects for e in normalized)
    if has_sedating:
        normalized = [e for e in normalized if e not in energizing_effects]
        normalized = [e for e in normalized if e not in creative_effects]
        normalized = [e for e in normalized if e not in joyful_effects]

    # Strategy 3: Creative and joyful effects can blend with energizing,
    # but if sedating is present (from above check), they're already removed

    # Remove "clear mind" if "sleepy" is present (contradictory)
    if "sleepy" in normalized and "clear-mind" in normalized:
        normalized = [e for e in normalized if e != "clear-mind"]

    return normalized


def extract_preferred_variant_price(variants: Any) -> Optional[float]:
    """Return the best available variant price using merch-first priority."""
    if not isinstance(variants, list) or not variants:
        return None

    price_fields = ("specialPriceRec", "priceRec", "specialPriceMed", "priceMed")
    for field_name in price_fields:
        for variant in variants:
            if not isinstance(variant, dict):
                continue
            value = variant.get(field_name)
            if value is None or value == "":
                continue
            try:
                return float(value)
            except (TypeError, ValueError):
                continue
    return None


def extract_max_variant_quantity(variants: Any) -> Optional[int]:
    """Return the maximum known stock quantity across variants."""
    if not isinstance(variants, list) or not variants:
        return None

    max_quantity = None
    for variant in variants:
        if not isinstance(variant, dict):
            continue
        quantity = variant.get("quantity")
        if quantity is None or quantity == "":
            continue
        try:
            quantity_int = int(quantity)
        except (TypeError, ValueError):
            continue
        if max_quantity is None or quantity_int > max_quantity:
            max_quantity = quantity_int
    return max_quantity


def normalize_subcategory(subcategory: str, category: str, schema_data: Optional[Dict] = None) -> Optional[str]:
    """
    Unified subcategory normalization for any data format.

    Handles both demo format (display names) and Dutchie API format (UPPERCASE_UNDERSCORE).

    Args:
        subcategory: Raw subcategory string
        category: Product category
        schema_data: Optional schema dict for validation

    Returns:
        Normalized subcategory string (lowercase kebab-case) or None if invalid.
    """
    if not subcategory:
        return None

    schema_to_use = schema_data or schema

    # Try direct mapping first (handles both demo and API formats)
    mapped = SUBCATEGORY_MAPPING.get(subcategory)
    if mapped:
        # Validate against schema
        valid = schema_to_use.get("subcategories", {}).get(category.lower(), [])
        return mapped if mapped in valid else None

    # Try lowercase kebab-case conversion (for already-normalized values)
    normalized = subcategory.lower().replace("_", "-")
    valid = schema_to_use.get("subcategories", {}).get(category.lower(), [])
    return normalized if normalized in valid else None


def estimate_tokens(text: str) -> int:
    """Rough token estimation: ~1 token per 4 characters"""
    return len(text) // 4

def summarize_brand_description(description: str, max_tokens: int = 150) -> str:
    """Summarize brand description if too long"""
    if not description:
        return ""
    
    current_tokens = estimate_tokens(description)
    if current_tokens <= max_tokens:
        return description
    
    # Simple summarization: take first ~600 characters (150 tokens * 4)
    max_chars = max_tokens * 4
    summary = description[:max_chars]
    
    # Try to end at a sentence boundary
    last_period = summary.rfind('.')
    if last_period > max_chars * 0.7:  # If we found a period in the last 30%
        summary = summary[:last_period + 1]
    else:
        # Otherwise, try to end at a word boundary
        last_space = summary.rfind(' ')
        if last_space > max_chars * 0.7:
            summary = summary[:last_space] + "..."
    
    return summary

def assign_subcategory(product: Dict[str, Any], schema_data: Optional[Dict] = None) -> Optional[str]:
    """Assign subcategory based on category and product details.
    Returns lowercase kebab-case subcategory matching schema."""
    schema_to_use = schema_data or schema
    category = normalize_category(product.get("category", ""))
    name = product.get("name", "").lower()
    description = product.get("description", "").lower()
    
    # Get valid subcategories for this category from schema
    valid_subcategories = schema_to_use.get("subcategories", {}).get(category, [])
    if not valid_subcategories:
        return None
    
    display_subcategory = None
    
    if category == "flower":
        if product.get("staffPick"):
            display_subcategory = "Premium"
        else:
            display_subcategory = "Whole Flower"
    
    elif category == "prerolls":
        pack_count = product.get("pack_count", 0)
        if pack_count > 1:
            display_subcategory = "Pre-Roll Packs"
        else:
            display_subcategory = "Singles"
    
    elif category == "edibles":
        if "live rosin gummy" in name or "live rosin" in description:
            display_subcategory = "Live Rosin Gummies"
        elif "live resin gummy" in name or "live resin" in description:
            display_subcategory = "Live Resin Gummies"
        elif "gummy" in name or "gummies" in name:
            display_subcategory = "Gummies"
        elif "chocolate" in name:
            display_subcategory = "Chocolates"
        elif "drink" in name:
            display_subcategory = "Drinks"
        else:
            display_subcategory = "Gummies"  # Default
    
    elif category == "vaporizers":
        if "aio" in name or "all-in-one" in name or "all in one" in name:
            display_subcategory = "All-In-One"
        elif "live resin" in name or "live resin" in description:
            display_subcategory = "Live Resin"
        elif "cartridge" in name:
            display_subcategory = "Cartridges"
        elif "disposable" in name:
            display_subcategory = "Disposables"
        else:
            display_subcategory = "All-In-One"  # Default
    
    elif category == "tinctures":
        raw_subcategory = str(product.get("subcategory", "")).upper()
        if raw_subcategory == "HERBAL":
            display_subcategory = "HERBAL"
        elif raw_subcategory == "UNFLAVORED":
            display_subcategory = "UNFLAVORED"
        else:
            display_subcategory = "DEFAULT"

    elif category == "concentrates":
        if product.get("texture") == "badder":
            display_subcategory = "Badder"
        elif "live resin" in description.lower():
            display_subcategory = "Live Resin"
        elif "hash" in name.lower():
            display_subcategory = "Hash"
        else:
            display_subcategory = "Badder"  # Default
    
    # Map display name to schema value (lowercase kebab-case)
    if display_subcategory:
        schema_value = SUBCATEGORY_MAPPING.get(display_subcategory)
        if schema_value and schema_value in valid_subcategories:
            return schema_value
    
    return None

def normalize_inventory(product: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize inventory field - all products in response are in stock by default"""
    inventory = product.get("inventory")
    if inventory is None:
        # Remove inventory field and add inStock: true
        if "inventory" in product:
            del product["inventory"]
        product["inStock"] = True
    else:
        # Keep inventory as is, add inStock: true
        product["inStock"] = True
    return product

def normalize_weights_and_thc(product: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize weights and THC values with proper units"""
    category = normalize_category(product.get("category", ""))
    normalized = product.copy()
    
    # Common fields
    if "weight" in normalized:
        normalized["total_weight_ounce"] = normalized.pop("weight")
    if "weight_grams" in normalized:
        normalized["total_weight_grams"] = normalized.pop("weight_grams")
    if "unit" in normalized:
        del normalized["unit"]  # Remove unit field as it's now in property names
    
    # THC/CBD percentage fields (skip for tinctures - they may use mg or percentages)
    category = normalize_category(normalized.get("category", ""))
    is_tincture = category == "tinctures"
    
    if not is_tincture:
        if "thc" in normalized:
            normalized["thc_percentage"] = normalized.pop("thc")
        if "cbd" in normalized:
            normalized["cbd_percentage"] = normalized.pop("cbd")
    
    if category == "flower":
        # Flower: already normalized above
        pass
    
    elif category == "prerolls":
        # Pre-Rolls: normalize individual_weight and calculate THC totals
        if "individual_weight" in normalized:
            individual_weight = normalized["individual_weight"]
            # For prerolls, individual_weight is already in grams (not ounces)
            # Values like 0.7, 1.0 are grams, not ounces
            normalized["individual_weight_grams"] = individual_weight
            del normalized["individual_weight"]
        
        # Calculate THC totals
        pack_count = normalized.get("pack_count", 1)
        total_weight_grams = normalized.get("total_weight_grams", 0)
        thc_percentage = normalized.get("thc_percentage", 0)
        
        if total_weight_grams and thc_percentage:
            thc_total_mg = (total_weight_grams * thc_percentage / 100) * 1000
            normalized["thc_total_mg"] = round(thc_total_mg, 2)
            
            # NOTE: Do NOT add thc_per_unit_mg for prerolls - that field is only for edibles per schema
            # Prerolls use individual_weight_grams instead
    
    elif category == "edibles":
        # Edibles: normalize THC/CBD/CBN totals to mg
        if "thc_total" in normalized:
            thc_total = normalized["thc_total"]
            # Assume if > 1000, it's in mg already, otherwise convert from g
            if thc_total < 1000:
                normalized["thc_total_mg"] = round(thc_total * 1000, 2)
            else:
                normalized["thc_total_mg"] = round(thc_total, 2)
            del normalized["thc_total"]
        
        if "thc_per_unit" in normalized:
            thc_per_unit = normalized["thc_per_unit"]
            if thc_per_unit < 100:
                normalized["thc_per_unit_mg"] = round(thc_per_unit * 1000, 2)
            else:
                normalized["thc_per_unit_mg"] = round(thc_per_unit, 2)
            del normalized["thc_per_unit"]
        
        if "cbd_total" in normalized:
            cbd_total = normalized["cbd_total"]
            if cbd_total < 1000:
                normalized["cbd_total_mg"] = round(cbd_total * 1000, 2)
            else:
                normalized["cbd_total_mg"] = round(cbd_total, 2)
            del normalized["cbd_total"]
        
        if "cbn_total" in normalized:
            cbn_total = normalized["cbn_total"]
            if cbn_total < 1000:
                normalized["cbn_total_mg"] = round(cbn_total * 1000, 2)
            else:
                normalized["cbn_total_mg"] = round(cbn_total, 2)
            del normalized["cbn_total"]
    
    elif category == "tinctures":
        if "volume_ml" in normalized:
            normalized["total_volume_ml"] = normalized.pop("volume_ml")

        if "thc_total" in normalized:
            normalized["thc_total_mg"] = round(normalized.pop("thc_total"), 2)

        if "cbd_total" in normalized:
            normalized["cbd_total_mg"] = round(normalized.pop("cbd_total"), 2)

        if "cbg_total" in normalized:
            normalized["cbg_total_mg"] = round(normalized.pop("cbg_total"), 2)

        if "thc" in normalized:
            del normalized["thc"]
        if "cbd" in normalized:
            del normalized["cbd"]

    elif category == "concentrates":
        # Regular concentrates: calculate THC total from weight and percentage
        total_weight_grams = normalized.get("total_weight_grams", 0)
        thc_percentage = normalized.get("thc_percentage", 0)

        if total_weight_grams and thc_percentage:
            thc_total_mg = (total_weight_grams * thc_percentage / 100) * 1000
            normalized["thc_total_mg"] = round(thc_total_mg, 2)

        if "serving_size" in normalized:
            serving_size = normalized["serving_size"]
            # Convert to mg if in g (assuming < 1 means grams)
            if serving_size < 1.0:
                normalized["serving_size_mg"] = round(serving_size * 1000, 2)
            else:
                normalized["serving_size_mg"] = round(serving_size, 2)
            del normalized["serving_size"]

        if "serving_unit" in normalized:
            del normalized["serving_unit"]
    
    elif category == "vaporizers":
        # Vaporizers: already normalized above
        pass
    
    return normalized

def enrich_with_brand(product: Dict[str, Any], brands_lookup: Optional[Dict[str, Dict]] = None) -> Dict[str, Any]:
    """Enrich product with brand information with strict 512 token limit"""
    if brands_lookup is None:
        return product
    
    brand_id = product.get("brandId")
    if not brand_id or brand_id not in brands_lookup:
        return product
    
    brand = brands_lookup[brand_id]
    enriched = product.copy()
    
    # Add brand tagline
    if "tagline" in brand:
        enriched["brand_tagline"] = brand["tagline"]
    
    # Add brand description with strict 512 token limit enforcement
    brand_description = brand.get("description", "")
    if brand_description:
        # Calculate product tokens (description + name + effects + flavor)
        product_desc = enriched.get("description", "")
        product_name = enriched.get("name", "")
        product_effects = enriched.get("effects", [])
        product_flavor = enriched.get("flavor", [])
        
        # Build product text for token estimation
        product_text = product_desc
        if product_name:
            product_text += " " + product_name
        if isinstance(product_effects, list) and product_effects:
            product_text += " " + ", ".join(str(e) for e in product_effects)
        if isinstance(product_flavor, list) and product_flavor:
            product_text += " " + ", ".join(str(f) for f in product_flavor)
        
        product_tokens = estimate_tokens(product_text)
        brand_tokens = estimate_tokens(brand_description)
        total_tokens = product_tokens + brand_tokens
        
        # Strict 512 token limit
        MAX_TOKENS = 512
        
        if total_tokens > MAX_TOKENS:
            # First try using description_summary if available
            if brand.get("description_summary"):
                brand_description_summary = brand["description_summary"]
                brand_tokens = estimate_tokens(brand_description_summary)
                total_tokens = product_tokens + brand_tokens
                
                if total_tokens <= MAX_TOKENS:
                    enriched["brand_description"] = brand_description_summary
                else:
                    # Still over limit, truncate summary to fit
                    remaining_tokens = MAX_TOKENS - product_tokens
                    if remaining_tokens > 0:
                        max_brand_chars = remaining_tokens * 4
                        truncated = brand_description_summary[:max_brand_chars]
                        # Try to end at word boundary
                        last_space = truncated.rfind(' ')
                        if last_space > max_brand_chars * 0.7:
                            truncated = truncated[:last_space] + "..."
                        enriched["brand_description"] = truncated
                    else:
                        # Product itself exceeds limit, use empty brand description
                        enriched["brand_description"] = ""
            else:
                # No summary available, truncate original description
                remaining_tokens = MAX_TOKENS - product_tokens
                if remaining_tokens > 0:
                    max_brand_chars = remaining_tokens * 4
                    truncated = brand_description[:max_brand_chars]
                    # Try to end at word boundary
                    last_space = truncated.rfind(' ')
                    if last_space > max_brand_chars * 0.7:
                        truncated = truncated[:last_space] + "..."
                    enriched["brand_description"] = truncated
                else:
                    # Product itself exceeds limit, use empty brand description
                    enriched["brand_description"] = ""
        else:
            # Within limit, use full description
            enriched["brand_description"] = brand_description
    else:
        enriched["brand_description"] = ""
    
    return enriched

def cleanup_properties(product: Dict[str, Any]) -> Dict[str, Any]:
    """Clean up properties and handle empty fields"""
    cleaned = product.copy()
    
    # Handle empty flavor arrays
    if "flavor" in cleaned:
        if isinstance(cleaned["flavor"], list) and len(cleaned["flavor"]) == 0:
            cleaned["flavor"] = None
    
    return cleaned

# ============================================================================
# NEW FUNCTIONS FOR REAL DATA TRANSFORMATION
# ============================================================================

def map_real_subcategory(subcategory: str, schema_data: Optional[Dict] = None) -> Optional[str]:
    """
    Map real data subcategory (uppercase with underscores) to schema format (lowercase kebab-case).
    
    Mapping:
    - "LIVE_RESIN_GUMMIES" -> "live-resin-gummies"
    - "LIVE_ROSIN_GUMMIES" -> "live-rosin-gummies"
    - "COOKING_BAKING" -> "cooking-baking"
    - "CHOCOLATES" -> "chocolates"
    - "DRINKS" -> "drinks"
    - "CHEWS" -> "chews"
    """
    if not subcategory:
        return None
    
    schema_to_use = schema_data or schema
    
    # Convert to lowercase and replace underscores with hyphens
    normalized = subcategory.lower().replace("_", "-")
    
    # Validate against schema
    category = None
    for cat, subcats in schema_to_use.get("subcategories", {}).items():
        if normalized in subcats:
            category = cat
            break
    
    if category:
        return normalized
    
    return None

def extract_pack_and_mg_from_name(name: str) -> Dict[str, Any]:
    """
    Extract both pack count and total mg from product name.

    Handles formats like:
    - "Kiva | Camino | Midnight Blueberry | Sleep | 5:1 THC:CBN | 20pk Gummies | 100mg"
    - "Brand | 10pk | 50mg"
    - "Product Name [20pk] 100mg"

    Returns: {"pack_count": int, "thc_total_mg": float, "thc_per_unit_mg": float} or empty dict
    """
    result = {}

    # Pattern for "Xpk ... | Ymg" or "Xpk Gummies | Ymg" format
    # More flexible to handle various separators and words between pk and mg
    combined_patterns = [
        # "20pk Gummies | 100mg" or "20 pack | 100mg"
        r'(\d+)\s*(?:pk|pack)\s*(?:\w+\s*)*\|\s*(\d+(?:\.\d+)?)\s*mg',
        # "[20pk] ... 100mg" or "[20 pack] 100mg"
        r'\[(\d+)\s*(?:pk|pack)\]\s*.*?(\d+(?:\.\d+)?)\s*mg',
        # "20pk 100mg" or "20 pack 100mg" (no pipe)
        r'(\d+)\s*(?:pk|pack)\s+(?:\w+\s+)*(\d+(?:\.\d+)?)\s*mg',
    ]

    for pattern in combined_patterns:
        match = re.search(pattern, name, re.IGNORECASE)
        if match:
            pack_count = int(match.group(1))
            total_mg = float(match.group(2))
            # Validate reasonable ranges
            if 1 <= pack_count <= 100 and 1 <= total_mg <= 1000:
                result["pack_count"] = pack_count
                result["thc_total_mg"] = total_mg
                result["thc_per_unit_mg"] = round(total_mg / pack_count, 2)
                return result

    return result


def extract_total_mg_from_text(name: str, description: str, slug: str) -> Optional[float]:
    """Extract a package-total mg signal from merch text when it is explicit enough."""
    explicit_patterns = [
        r'(?:per\s+package|package|total|contains)\s*:?\s*(\d+(?:\.\d+)?)\s*mg\b',
        r'(\d+(?:\.\d+)?)\s*mg\b(?:\s*thc)?',
    ]

    # Name and slug are merch-facing and usually safest for total dosage.
    for text in (name, slug):
        if not text:
            continue
        for pattern in explicit_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if not match:
                continue
            value = float(match.group(1))
            if 1 <= value <= 1000:
                return value

    # Description needs tighter context because it often mentions per-piece values.
    description_patterns = [
        r'(?:per\s+package|package|total)\s*:?\s*(\d+(?:\.\d+)?)\s*mg\b',
        r'(\d+(?:\.\d+)?)\s*mg\s*(?:thc\s*)?per\s+package\b',
    ]
    for pattern in description_patterns:
        match = re.search(pattern, description or "", re.IGNORECASE)
        if not match:
            continue
        value = float(match.group(1))
        if 1 <= value <= 1000:
            return value

    return None


def extract_per_unit_mg_from_text(name: str, description: str) -> Optional[float]:
    """Extract a per-piece mg signal from descriptive text."""
    per_piece_patterns = [
        r'(\d+(?:\.\d+)?)\s*mg\s*per\s*(?:piece|gummy|serving|dose)',
        r'(\d+(?:\.\d+)?)\s*mg\s*(?:of\s+)?(?:thc\s+)?(?:per|each)\s+(?:piece|gummy|serving)',
        r'(\d+(?:\.\d+)?)\s*mg\s*(?:thc\s+)?each\b',
        r'(?:contains|each\s+(?:piece|gummy)\s+(?:has|contains)?)\s*(\d+(?:\.\d+)?)\s*mg',
    ]

    for text in (description, name):
        if not text:
            continue
        for pattern in per_piece_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if not match:
                continue
            value = float(match.group(1))
            if 0 < value <= 200:
                return value
    return None


def extract_total_mg_from_potency(potency: Dict[str, Any]) -> Dict[str, Any]:
    """
    Return a safely-usable total mg value only when Dutchie's potency payload is dosage-based.

    Concentration-style units like `%`, `mg/g`, and `mg/ml` are not package dosage.
    """
    if not isinstance(potency, dict):
        return {"value": None, "classification": "missing", "unit": ""}

    unit = str(potency.get("unit") or "").strip().lower()
    formatted = str(potency.get("formatted") or "").strip().lower()
    numeric_value = None
    raw_range = potency.get("range") or []
    if raw_range:
        try:
            numeric_value = float(raw_range[0])
        except (TypeError, ValueError):
            numeric_value = None
    if numeric_value is None and formatted:
        match = re.search(r'(\d+(?:\.\d+)?)', formatted)
        if match:
            numeric_value = float(match.group(1))

    concentration_markers = {"%", "percent", "percentage", "mg/g", "mg/ml"}
    if unit in concentration_markers or "%" in formatted or "mg/g" in formatted or "mg/ml" in formatted:
        return {"value": numeric_value, "classification": "concentration", "unit": unit or formatted}

    if unit in {"mg", "milligram", "milligrams"}:
        return {"value": numeric_value, "classification": "total_mg", "unit": unit}

    if numeric_value is not None and formatted and "mg" in formatted and "/" not in formatted and "%" not in formatted:
        return {"value": numeric_value, "classification": "total_mg", "unit": unit or "mg"}

    return {"value": numeric_value, "classification": "unknown", "unit": unit or formatted}


def extract_pack_count_edibles(name: str, description: str, slug: str, subcategory: str) -> Optional[int]:
    """
    Extract pack count from name/description/slug with subcategory-specific logic.

    Subcategory-specific patterns:
    - gummies/live-resin-gummies/live-rosin-gummies: "10 pk", "10pk", "[10pk]", "10 pack"
    - chews: Same patterns + "10 pieces", "10 count"
    - chocolates: Same patterns + check description for "10 pieces" or "10 servings"
    - cooking-baking: Usually single unit, but check for "X oz", "X ml"
    - drinks: Usually single unit, but check for "X ml", "X fl oz"
    """
    # Common patterns for all subcategories
    patterns = [
        r'\[(\d+)\s*pk\]',           # [10pk] or [10 pk]
        r'(\d+)\s*pk\b',              # 10 pk (word boundary)
        r'(\d+)\s*pack\b',            # 10 pack
        r'(\d+)\s*-pack\b',          # 10-pack
    ]
    
    # Additional patterns for chews/chocolates
    if subcategory in ["chews", "chocolates"]:
        patterns.extend([
            r'(\d+)\s*pieces?\b',     # 10 pieces or 10 piece
            r'(\d+)\s*count\b',      # 10 count
            r'(\d+)\s*servings?\b',  # 10 servings or 10 serving
        ])
    
    # Try name first
    for pattern in patterns:
        match = re.search(pattern, name, re.IGNORECASE)
        if match:
            count = int(match.group(1))
            if count > 0 and count <= 100:  # Reasonable range
                return count
    
    # Fallback to description
    for pattern in patterns:
        match = re.search(pattern, description, re.IGNORECASE)
        if match:
            count = int(match.group(1))
            if count > 0 and count <= 100:
                return count
    
    # Fallback to slug
    for pattern in patterns:
        match = re.search(pattern, slug, re.IGNORECASE)
        if match:
            count = int(match.group(1))
            if count > 0 and count <= 100:
                return count
    
    return None

def normalize_thc_for_edibles(
    potency_thc: Dict[str, Any], 
    subcategory: str, 
    pack_count: Optional[int],
    name: str,
    description: str,
    slug: str
) -> Dict[str, Any]:
    """
    Normalize edible THC fields without conflating concentration with package dosage.

    Only direct mg potency payloads are trusted as package-total dosage. Concentration-style
    values like `%` or `mg/g` must be resolved from safer merch text or the result is marked
    ambiguous for omission by the audit layer.
    """
    result = {}
    potency_resolution = extract_total_mg_from_potency(potency_thc)
    source_total_mg = potency_resolution.get("value")
    source_classification = potency_resolution.get("classification")
    text_total_mg = extract_total_mg_from_text(name, description, slug)
    text_per_unit_mg = extract_per_unit_mg_from_text(name, description)
    resolved_pack_count = pack_count or extract_pack_count_edibles(name, description, slug, subcategory)

    audit = {
        "subcategory": subcategory,
        "potency_unit": potency_resolution.get("unit"),
        "source_total_mg": source_total_mg,
        "source_classification": source_classification,
        "text_total_mg": text_total_mg,
        "text_per_unit_mg": text_per_unit_mg,
        "pack_count": resolved_pack_count,
        "cannabinoid_panel_not_used_for_dosage": True,
    }

    resolved_total_mg = None
    if source_classification == "total_mg" and source_total_mg is not None:
        resolved_total_mg = source_total_mg
        if text_total_mg is not None:
            tolerance = max(1.0, resolved_total_mg * 0.2)
            if abs(text_total_mg - resolved_total_mg) > tolerance:
                if 0 < resolved_total_mg <= 120 and 0 < text_total_mg <= 1000 and abs(text_total_mg - resolved_total_mg) <= 20:
                    resolved_total_mg = text_total_mg
                    audit["resolution"] = "text_override_for_common_rounding_issue"
                else:
                    audit["status"] = "ambiguous"
                    audit["reason"] = "conflicting_total_mg"
            else:
                audit["resolution"] = "potency_total_confirmed_by_text"
    elif source_classification == "concentration":
        if text_total_mg is not None:
            resolved_total_mg = text_total_mg
            audit["resolution"] = "text_total_from_concentration_source"
        else:
            audit["status"] = "ambiguous"
            audit["reason"] = "concentration_without_safe_total"
    elif text_total_mg is not None:
        resolved_total_mg = text_total_mg
        audit["resolution"] = "text_total_only"

    if resolved_total_mg is None and text_per_unit_mg is not None and resolved_pack_count:
        resolved_total_mg = text_per_unit_mg * resolved_pack_count
        audit["resolution"] = audit.get("resolution") or "per_unit_times_pack"

    if resolved_total_mg is not None:
        result["thc_total_mg"] = round(resolved_total_mg, 2)
    if resolved_pack_count and pack_count is None:
        result["pack_count"] = resolved_pack_count

    resolved_per_unit_mg = None
    if text_per_unit_mg is not None:
        resolved_per_unit_mg = text_per_unit_mg
    elif resolved_total_mg is not None and resolved_pack_count:
        resolved_per_unit_mg = resolved_total_mg / resolved_pack_count

    if resolved_per_unit_mg is not None:
        result["thc_per_unit_mg"] = round(resolved_per_unit_mg, 2)

    if resolved_total_mg is None:
        audit["status"] = "ambiguous"
        audit.setdefault("reason", "missing_resolved_total")
    elif resolved_pack_count and resolved_per_unit_mg is not None:
        recomposed_total = round(resolved_per_unit_mg * resolved_pack_count, 2)
        tolerance = max(1.0, resolved_total_mg * 0.15)
        if abs(recomposed_total - resolved_total_mg) > tolerance:
            audit["status"] = "ambiguous"
            audit["reason"] = "per_unit_total_conflict"
            result.pop("thc_total_mg", None)
            result.pop("thc_per_unit_mg", None)
        else:
            audit["status"] = "resolved"
    else:
        audit["status"] = audit.get("status") or "resolved"

    result["_potency_audit"] = audit
    return result

def normalize_cbd_for_edibles(
    potency_cbd: Dict[str, Any],
    pack_count: Optional[int],
    description: str
) -> Dict[str, Any]:
    """
    Normalize CBD values for edibles.
    
    Returns: {"cbd_total_mg": Optional[float], "cbd_per_unit_mg": Optional[float]}
    """
    result = {}
    
    cbd_resolution = extract_total_mg_from_potency(potency_cbd)
    cbd_total_mg = cbd_resolution.get("value") if cbd_resolution.get("classification") == "total_mg" else None
    
    if cbd_total_mg is not None:
        result["cbd_total_mg"] = round(cbd_total_mg, 2)
        
        # Calculate cbd_per_unit_mg
        if pack_count and pack_count > 0:
            result["cbd_per_unit_mg"] = round(cbd_total_mg / pack_count, 2)
    
    return result

def extract_terpenes(terpenes_array: List[Dict]) -> List[Dict]:
    """
    Extract and flatten terpene data.
    
    Keep:
    - id, name (from terpene object)
    - aromas (array) - IMPORTANT for search
    - potentialHealthBenefits (array) - IMPORTANT for search
    - effects (array)
    - value, unit (from ActiveTerpene wrapper)
    
    Returns: List of flattened terpene objects (deduplicated by terpene.id)
    """
    if not terpenes_array:
        return []
    
    terpenes_dict = {}
    
    for active_terpene in terpenes_array:
        if not isinstance(active_terpene, dict):
            continue
        
        terpene = active_terpene.get("terpene")
        if not terpene or not isinstance(terpene, dict):
            continue
        
        terpene_id = terpene.get("id")
        if not terpene_id:
            continue
        
        # Deduplicate by terpene.id
        if terpene_id not in terpenes_dict:
            terpenes_dict[terpene_id] = {
                "id": terpene_id,
                "name": terpene.get("name", ""),
                "aromas": terpene.get("aromas", []),
                "potentialHealthBenefits": terpene.get("potentialHealthBenefits", []),
                "effects": terpene.get("effects", []),
                "value": active_terpene.get("value"),
                "unit": active_terpene.get("unit", ""),
            }
    
    return list(terpenes_dict.values())

def extract_cannabinoids(cannabinoids_array: List[Dict]) -> List[Dict]:
    """
    Extract and flatten cannabinoid data.
    
    Keep:
    - id, name, description (from cannabinoid object)
    - value, unit (from ActiveCannabinoid wrapper)
    
    Returns: List of flattened cannabinoid objects (deduplicated by cannabinoid.id)
    """
    if not cannabinoids_array:
        return []
    
    cannabinoids_dict = {}
    
    for active_cannabinoid in cannabinoids_array:
        if not isinstance(active_cannabinoid, dict):
            continue
        
        cannabinoid = active_cannabinoid.get("cannabinoid")
        if not cannabinoid or not isinstance(cannabinoid, dict):
            continue
        
        cannabinoid_id = cannabinoid.get("id")
        if not cannabinoid_id:
            continue
        
        # Deduplicate by cannabinoid.id
        if cannabinoid_id not in cannabinoids_dict:
            cannabinoids_dict[cannabinoid_id] = {
                "id": cannabinoid_id,
                "name": cannabinoid.get("name", ""),
                "description": cannabinoid.get("description", ""),
                "value": active_cannabinoid.get("value"),
                "unit": active_cannabinoid.get("unit", ""),
            }
    
    return list(cannabinoids_dict.values())

def construct_shop_link(product: Dict[str, Any]) -> Optional[str]:
    """
    Construct shop link from slug or use existing shopLink.
    
    Strategy:
    - If product has shopLink in variants or top-level, use it
    - Otherwise, construct from slug: "https://cannavita.us/shop/?dtche%5Bproduct%5D={slug}"
    - The %5B and %5D are URL-encoded [ and ], so the query parameter is dtche[product]={slug}
    - Return None if slug not available
    """
    # Check for existing shopLink (not typically in real data, but check anyway)
    if product.get("shopLink"):
        return product["shopLink"]
    
    # Construct from slug with Dutchie query parameter format
    slug = product.get("slug", "")
    if slug:
        return f"https://cannavita.us/shop/?dtche%5Bproduct%5D={slug}"
    
    return None

def transform_edible_data(product: Dict[str, Any], schema_data: Optional[Dict] = None) -> Dict[str, Any]:
    """
    Transform real edible product from GraphQL schema to normalized format.
    
    Handles:
    - Category/type/subcategory mapping
    - THC/CBD extraction and normalization
    - Pack count extraction
    - Terpenes/cannabinoids extraction
    - Slug/shopLink handling
    - Brand enrichment
    - Effects, images, price, quantity
    """
    schema_to_use = schema_data or schema
    normalized = {}
    
    # Basic fields
    normalized["id"] = product.get("id", "")
    normalized["name"] = product.get("name", "")
    normalized["category"] = normalize_category(product.get("category", ""))

    # Type
    strain_type = product.get("strainType", "")
    if strain_type:
        normalized["type"] = normalize_strain_type(strain_type)

    normalized["description"] = product.get("description", "")
    
    # Subcategory mapping (real data uses uppercase with underscores)
    subcategory = map_real_subcategory(product.get("subcategory", ""), schema_to_use)
    if subcategory:
        normalized["subcategory"] = subcategory

    # Try combined pack+mg extraction first (handles "20pk Gummies | 100mg" format)
    combined_data = extract_pack_and_mg_from_name(product.get("name", ""))
    pack_count = combined_data.get("pack_count")

    # If combined extraction found values, use them
    if combined_data:
        if pack_count:
            normalized["pack_count"] = pack_count
        if combined_data.get("thc_total_mg"):
            normalized["thc_total_mg"] = combined_data["thc_total_mg"]
        if combined_data.get("thc_per_unit_mg"):
            normalized["thc_per_unit_mg"] = combined_data["thc_per_unit_mg"]

    # Fallback: Extract pack count using standard patterns if not found
    if not pack_count:
        pack_count = extract_pack_count_edibles(
            product.get("name", ""),
            product.get("description", ""),
            product.get("slug", ""),
            subcategory or ""
        )
        if pack_count:
            normalized["pack_count"] = pack_count

    # Normalize THC (subcategory-specific) - only if not already set by combined extraction
    if "thc_total_mg" not in normalized:
        thc_data = normalize_thc_for_edibles(
            product.get("potencyThc", {}),
            subcategory or "",
            pack_count,
            product.get("name", ""),
            product.get("description", ""),
            product.get("slug", "")
        )
        normalized.update(thc_data)
    elif pack_count and "thc_per_unit_mg" not in normalized:
        # We have thc_total_mg but not per_unit, calculate it
        normalized["thc_per_unit_mg"] = round(normalized["thc_total_mg"] / pack_count, 2)
    
    # Normalize CBD (similar pattern)
    cbd_data = normalize_cbd_for_edibles(
        product.get("potencyCbd", {}),
        pack_count or normalized.get("pack_count"),
        product.get("description", "")
    )
    normalized.update(cbd_data)
    
    # Extract terpenes (flatten structure, keep aromas and potentialHealthBenefits)
    normalized["terpenes"] = extract_terpenes(product.get("terpenes", []))
    
    # Extract cannabinoids (flatten structure)
    normalized["cannabinoids"] = extract_cannabinoids(product.get("cannabinoids", []))
    
    # Slug and shopLink
    normalized["slug"] = product.get("slug", "")
    normalized["shopLink"] = construct_shop_link(product)
    
    # Brand enrichment
    if product.get("brand"):
        brand = product["brand"]
        normalized["brand"] = brand.get("name", "")
        brand_description = brand.get("description", "")
        if brand_description:
            # Truncate brand description to 150 chars for tagline
            normalized["brand_tagline"] = brand_description[:150] + "..." if len(brand_description) > 150 else brand_description
    
    # Effects (normalize to lowercase, then clean)
    effects = product.get("effects", [])
    if isinstance(effects, list):
        normalized["effects"] = clean_effects(
            [str(e).lower() for e in effects if e],
            normalized.get("type", ""),
        )
    else:
        normalized["effects"] = []

    # Images
    image = product.get("image")
    images = product.get("images", [])
    if image:
        normalized["imageLink"] = image
    elif images and isinstance(images, list) and len(images) > 0:
        first_image = images[0]
        if isinstance(first_image, dict) and first_image.get("url"):
            normalized["imageLink"] = first_image["url"]
    
    variants = product.get("variants", [])
    price = extract_preferred_variant_price(variants)
    if price is not None:
        normalized["price"] = price

    quantity = extract_max_variant_quantity(variants)
    if quantity is not None:
        normalized["quantity"] = quantity
    
    # Staff pick
    if product.get("staffPick"):
        normalized["staffPick"] = True
    
    # In stock (all products in response are in stock)
    normalized["inStock"] = True
    
    return normalized

def normalize_product(product: Dict[str, Any], brands_lookup: Optional[Dict[str, Dict]] = None, schema_data: Optional[Dict] = None) -> Dict[str, Any]:
    """
    Main normalization function - orchestrates all normalization steps.
    
    This is the main entry point for normalizing demo/legacy product data.
    For real edible data, use transform_edible_data() instead.
    """
    schema_to_use = schema_data or schema
    
    # Step 1: Normalize inventory
    product = normalize_inventory(product)
    
    # Step 1.5: Normalize category and type
    if "category" in product and product["category"]:
        product["category"] = normalize_category(product["category"])
    if "type" in product and product["type"]:
        product["type"] = normalize_strain_type(product["type"])
    
    # Step 2: Assign subcategory (already returns lowercase kebab-case)
    subcategory = assign_subcategory(product, schema_to_use)
    if subcategory:
        product["subcategory"] = subcategory
    
    # Step 3: Normalize weights and THC
    product = normalize_weights_and_thc(product)
    
    # Step 4: Enrich with brand
    product = enrich_with_brand(product, brands_lookup)
    
    # Step 5: Cleanup properties
    product = cleanup_properties(product)
    
    return product

def is_real_data_format(product: Dict[str, Any]) -> bool:
    """
    Detect if product is in real data format (GraphQL schema) vs demo format.
    
    Real data indicators:
    - Has "potencyThc" object with "formatted" and "range"
    - Has "strainType" field
    - Has "subcategory" in uppercase with underscores
    - Has "terpenes" array with nested "terpene" objects
    """
    return (
        "potencyThc" in product and isinstance(product["potencyThc"], dict) and "formatted" in product["potencyThc"]
    ) or (
        "strainType" in product
    ) or (
        "subcategory" in product and "_" in str(product["subcategory"])
    )

# ============================================================================
# PRODUCT TRANSFORMER CLASSES
# ============================================================================

class ProductTransformer:
    """
    Base class for category-specific product transformations.

    Subclasses implement category-specific transformation logic while
    sharing common functionality.
    """

    def __init__(self, schema_data: Optional[Dict] = None):
        """
        Initialize transformer with schema data.

        Args:
            schema_data: Optional schema dict for validation. Uses module-level schema if not provided.
        """
        self.schema = schema_data or schema

    def transform(self, product: Dict[str, Any]) -> Dict[str, Any]:
        """
        Transform a product from raw API format to normalized format.

        To be overridden by subclasses.

        Args:
            product: Raw product dictionary from API.

        Returns:
            Normalized product dictionary.
        """
        raise NotImplementedError("Subclasses must implement transform()")

    def _basic_transform(self, product: Dict[str, Any]) -> Dict[str, Any]:
        """
        Basic transformation shared by all categories.

        Handles common fields: id, name, category, type, description,
        subcategory, brand, effects, images, price, quantity, inStock.

        Args:
            product: Raw product dictionary.

        Returns:
            Partially normalized product dictionary.
        """
        normalized = {}

        # Basic fields
        normalized["id"] = product.get("id", "")
        normalized["name"] = product.get("name", "")
        normalized["category"] = normalize_category(product.get("category", ""))

        # Type (strainType from API)
        strain_type = product.get("strainType", "")
        if strain_type:
            normalized["type"] = normalize_strain_type(strain_type)

        normalized["description"] = product.get("description", "")

        # Subcategory mapping
        raw_subcategory = product.get("subcategory", "")
        subcategory = normalize_subcategory(raw_subcategory, normalized["category"], self.schema)
        if subcategory:
            normalized["subcategory"] = subcategory

        # Slug and shopLink
        normalized["slug"] = product.get("slug", "")
        normalized["shopLink"] = construct_shop_link(product)

        # Brand enrichment
        if product.get("brand"):
            brand = product["brand"]
            normalized["brand"] = brand.get("name", "")
            brand_description = brand.get("description", "")
            if brand_description:
                normalized["brand_tagline"] = brand_description[:150] + "..." if len(brand_description) > 150 else brand_description

        # Effects (normalize to lowercase, then clean)
        effects = product.get("effects", [])
        if isinstance(effects, list):
            lowercased = [e.lower() for e in effects if e]
            product_type = normalized.get("type", "")
            normalized["effects"] = clean_effects(lowercased, product_type)
        else:
            normalized["effects"] = []

        # Images
        image = product.get("image")
        images = product.get("images", [])
        if image:
            normalized["imageLink"] = image
        elif images and isinstance(images, list) and len(images) > 0:
            first_image = images[0]
            if isinstance(first_image, dict) and first_image.get("url"):
                normalized["imageLink"] = first_image["url"]

        # Price and quantity (from variants)
        variants = product.get("variants", [])
        price = extract_preferred_variant_price(variants)
        if price is not None:
            normalized["price"] = price

        max_quantity = extract_max_variant_quantity(variants)
        if max_quantity is not None:
            normalized["quantity"] = max_quantity

        # Staff pick
        if product.get("staffPick"):
            normalized["staffPick"] = True

        # In stock (all products in response are in stock)
        normalized["inStock"] = True

        # Extract terpenes and cannabinoids (common to many categories)
        normalized["terpenes"] = extract_terpenes(product.get("terpenes", []))
        normalized["cannabinoids"] = extract_cannabinoids(product.get("cannabinoids", []))

        return normalized


class EdibleTransformer(ProductTransformer):
    """Transformer for edible products (gummies, chocolates, drinks, etc.)."""

    def transform(self, product: Dict[str, Any]) -> Dict[str, Any]:
        """
        Transform edible product with mg-based potency normalization.

        Handles pack count extraction, THC/CBD normalization for mg units,
        and subcategory-specific logic.
        """
        # Use existing transform_edible_data function
        return transform_edible_data(product, self.schema)


class FlowerTransformer(ProductTransformer):
    """Transformer for flower products."""

    def transform(self, product: Dict[str, Any]) -> Dict[str, Any]:
        """
        Transform flower product with percentage-based potency.
        """
        normalized = self._basic_transform(product)

        # THC/CBD as percentage
        potency_thc = product.get("potencyThc", {})
        if potency_thc.get("range") and len(potency_thc["range"]) > 0:
            normalized["thc_percentage"] = potency_thc["range"][0]

        potency_cbd = product.get("potencyCbd", {})
        if potency_cbd.get("range") and len(potency_cbd["range"]) > 0:
            normalized["cbd_percentage"] = potency_cbd["range"][0]

        # Weight from variants
        variants = product.get("variants", [])
        if variants and isinstance(variants, list) and len(variants) > 0:
            first_variant = variants[0]
            if isinstance(first_variant, dict):
                option = first_variant.get("option", "")
                # Parse weight from option (e.g., "1/8oz", "1/4oz", "1oz", "3.5g")
                weight_grams = self._parse_weight(option)
                if weight_grams:
                    normalized["total_weight_grams"] = round(weight_grams, 2)
                    normalized["total_weight_ounce"] = round(weight_grams / 28.35, 3)

        return normalized

    def _parse_weight(self, option: str) -> Optional[float]:
        """
        Parse weight from variant option string.

        Handles:
        - Fractional ounces: "1/8oz", "1/4oz", "1/2oz"
        - Whole ounces: "1oz", "2oz"
        - Grams: "3.5g", "7g"

        Returns weight in grams.
        """
        if not option:
            return None

        import re

        # Try grams first
        match = re.search(r'(\d+(?:\.\d+)?)\s*g(?:rams?)?', option, re.IGNORECASE)
        if match:
            return float(match.group(1))

        # Try fractional ounces (1/8oz, 1/4oz, 1/2oz)
        match = re.search(r'(\d+)/(\d+)\s*oz', option, re.IGNORECASE)
        if match:
            numerator = float(match.group(1))
            denominator = float(match.group(2))
            ounces = numerator / denominator
            return ounces * 28.35  # Convert to grams

        # Try whole ounces
        match = re.search(r'(\d+(?:\.\d+)?)\s*oz', option, re.IGNORECASE)
        if match:
            return float(match.group(1)) * 28.35  # Convert to grams

        return None


class PrerollTransformer(ProductTransformer):
    """Transformer for preroll products."""

    def transform(self, product: Dict[str, Any]) -> Dict[str, Any]:
        """
        Transform preroll product with pack count and individual weight.
        """
        normalized = self._basic_transform(product)

        # THC/CBD as percentage
        potency_thc = product.get("potencyThc", {})
        if potency_thc.get("range") and len(potency_thc["range"]) > 0:
            normalized["thc_percentage"] = potency_thc["range"][0]

        potency_cbd = product.get("potencyCbd", {})
        if potency_cbd.get("range") and len(potency_cbd["range"]) > 0:
            normalized["cbd_percentage"] = potency_cbd["range"][0]

        # Pack count from name/slug (NOT from variants.quantity!)
        pack_count = self._extract_pack_count(product.get("name", ""), product.get("slug", ""))
        if pack_count:
            normalized["pack_count"] = pack_count

        # Individual weight from variants
        variants = product.get("variants", [])
        individual_weight = None
        if variants and isinstance(variants, list) and len(variants) > 0:
            first_variant = variants[0]
            if isinstance(first_variant, dict):
                option = first_variant.get("option", "")
                individual_weight = self._parse_weight(option)
                if individual_weight:
                    normalized["individual_weight_grams"] = round(individual_weight, 2)

        # Calculate total weight if we have both pack_count and individual_weight
        if pack_count and individual_weight:
            normalized["total_weight_grams"] = round(individual_weight * pack_count, 2)

        return normalized

    def _extract_pack_count(self, name: str, slug: str) -> Optional[int]:
        """Extract pack count from name or slug."""
        import re
        patterns = [
            r'(\d+)\s*(?:pk|pack)\b',
            r'\[(\d+)\s*pk\]',
        ]
        for text in [name, slug]:
            for pattern in patterns:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    count = int(match.group(1))
                    if 1 <= count <= 20:
                        return count
        return None

    def _parse_weight(self, option: str) -> Optional[float]:
        """
        Parse weight from variant option string.

        Handles:
        - Decimal grams: "1g", "0.5g", ".5g", "0.75g"
        """
        if not option:
            return None

        import re
        # Match patterns like "1g", "0.5g", ".5g", "0.75g"
        match = re.search(r'(\d*\.?\d+)\s*g', option, re.IGNORECASE)
        if match:
            return float(match.group(1))
        return None


class VaporizerTransformer(ProductTransformer):
    """Transformer for vaporizer products (cartridges, disposables, etc.)."""

    def transform(self, product: Dict[str, Any]) -> Dict[str, Any]:
        """
        Transform vaporizer product with high-percentage THC scale.
        """
        normalized = self._basic_transform(product)

        # THC/CBD as percentage (vaporizers have higher THC)
        potency_thc = product.get("potencyThc", {})
        if potency_thc.get("range") and len(potency_thc["range"]) > 0:
            normalized["thc_percentage"] = potency_thc["range"][0]

        potency_cbd = product.get("potencyCbd", {})
        if potency_cbd.get("range") and len(potency_cbd["range"]) > 0:
            normalized["cbd_percentage"] = potency_cbd["range"][0]

        # Weight from variants
        variants = product.get("variants", [])
        if variants and isinstance(variants, list) and len(variants) > 0:
            first_variant = variants[0]
            if isinstance(first_variant, dict):
                option = first_variant.get("option", "")
                weight = self._parse_weight(option)
                if weight:
                    normalized["total_weight_grams"] = weight

        return normalized

    def _parse_weight(self, option: str) -> Optional[float]:
        """
        Parse weight from variant option string.

        Handles:
        - Decimal grams: "1g", "0.5g", ".5g"
        """
        if not option:
            return None

        import re
        # Match patterns like "1g", "0.5g", ".5g"
        match = re.search(r'(\d*\.?\d+)\s*g', option, re.IGNORECASE)
        if match:
            return float(match.group(1))
        return None


class TinctureTransformer(ProductTransformer):
    """Transformer for tincture products with mixed-unit potency support."""

    def transform(self, product: Dict[str, Any]) -> Dict[str, Any]:
        """
        Transform tincture products without forcing a single potency scale.

        Real Dutchie tinctures may expose potency as either mg totals or percentages,
        so preserve whichever concrete value the API provides.
        """
        normalized = self._basic_transform(product)

        potency_thc = product.get("potencyThc", {})
        potency_cbd = product.get("potencyCbd", {})

        thc_value = self._extract_potency_value(potency_thc)
        thc_unit = str(potency_thc.get("unit", "")).strip().lower()
        if thc_value is not None:
            if thc_unit == "mg":
                normalized["thc_total_mg"] = thc_value
            elif thc_unit == "%":
                normalized["thc_percentage"] = thc_value

        cbd_value = self._extract_potency_value(potency_cbd)
        cbd_unit = str(potency_cbd.get("unit", "")).strip().lower()
        if cbd_value is not None:
            if cbd_unit == "mg":
                normalized["cbd_total_mg"] = cbd_value
            elif cbd_unit == "%":
                normalized["cbd_percentage"] = cbd_value

        total_volume_ml = self._extract_explicit_volume_ml(
            product.get("name", ""),
            product.get("description", ""),
            product.get("slug", ""),
        )
        if total_volume_ml is not None:
            normalized["total_volume_ml"] = total_volume_ml

        return normalized

    def _extract_potency_value(self, potency: Dict[str, Any]) -> Optional[float]:
        if not isinstance(potency, dict):
            return None
        raw_range = potency.get("range") or []
        if raw_range:
            try:
                return float(raw_range[0])
            except (TypeError, ValueError):
                return None
        formatted = potency.get("formatted", "")
        if formatted:
            match = re.search(r"(\d+(?:\.\d+)?)", str(formatted))
            if match:
                return float(match.group(1))
        return None

    def _extract_explicit_volume_ml(self, *texts: str) -> Optional[float]:
        for text in texts:
            if not text:
                continue
            match = re.search(r"(\d+(?:\.\d+)?)\s*m\s*l\b", text, re.IGNORECASE)
            if not match:
                match = re.search(r"(\d+(?:\.\d+)?)\s*ml\b", text, re.IGNORECASE)
            if match:
                value = float(match.group(1))
                if 0 < value <= 120:
                    return value
        return None


class ConcentrateTransformer(ProductTransformer):
    """Transformer for concentrate products (badder, hash, rosin, etc.)."""

    def transform(self, product: Dict[str, Any]) -> Dict[str, Any]:
        """
        Transform concentrate product with percentage-based potency.
        """
        normalized = self._basic_transform(product)

        potency_thc = product.get("potencyThc", {})
        if potency_thc.get("range") and len(potency_thc["range"]) > 0:
            normalized["thc_percentage"] = potency_thc["range"][0]

        potency_cbd = product.get("potencyCbd", {})
        if potency_cbd.get("range") and len(potency_cbd["range"]) > 0:
            normalized["cbd_percentage"] = potency_cbd["range"][0]

        variants = product.get("variants", [])
        if variants and isinstance(variants, list) and len(variants) > 0:
            first_variant = variants[0]
            if isinstance(first_variant, dict):
                option = first_variant.get("option", "")
                weight = self._parse_weight(option)
                if weight:
                    normalized["total_weight_grams"] = weight

        return normalized

    def _parse_weight(self, option: str) -> Optional[float]:
        """Parse weight from variant option string."""
        if not option:
            return None

        import re
        # Match patterns like "1g", "0.5g", ".5g", ".15g", ".3g"
        match = re.search(r'(\d*\.?\d+)\s*g', option, re.IGNORECASE)
        if match:
            return float(match.group(1))
        return None


class CBDTransformer(ProductTransformer):
    """Transformer for CBD products (creams, roll-ons, pet treats, etc.)."""

    def transform(self, product: Dict[str, Any]) -> Dict[str, Any]:
        """
        Transform CBD product with mg-based CBD potency.

        CBD products have high CBD and minimal/no THC.
        """
        normalized = self._basic_transform(product)

        # CBD/THC as mg (not percentage)
        potency_cbd = product.get("potencyCbd", {})
        if potency_cbd.get("range") and len(potency_cbd["range"]) > 0:
            normalized["cbd_total_mg"] = potency_cbd["range"][0]

        potency_thc = product.get("potencyThc", {})
        if potency_thc.get("range") and len(potency_thc["range"]) > 0:
            normalized["thc_total_mg"] = potency_thc["range"][0]

        # Weight from variants
        variants = product.get("variants", [])
        if variants and isinstance(variants, list) and len(variants) > 0:
            first_variant = variants[0]
            if isinstance(first_variant, dict):
                option = first_variant.get("option", "")
                weight = self._parse_weight(option)
                if weight:
                    normalized["total_weight_grams"] = weight

        # Extract product form from name (for search)
        name = product.get("name", "").lower()
        product_form = None
        if "roll-on" in name:
            product_form = "roll-on"
        elif "cream" in name:
            product_form = "cream"
        elif "chew" in name:
            product_form = "chew"
        elif "peanut butter" in name:
            product_form = "peanut butter"

        if product_form:
            normalized["product_form"] = product_form

        normalized["subcategory"] = self._infer_cbd_subcategory(product)

        return normalized

    def _infer_cbd_subcategory(self, product: Dict[str, Any]) -> str:
        """Infer CBD subcategory from text and fallback to default."""
        name = str(product.get("name", "")).lower()
        description = str(product.get("description", "")).lower()
        brand_name = ""
        if isinstance(product.get("brand"), dict):
            brand_name = str(product["brand"].get("name", "")).lower()
        combined = f"{name} {description} {brand_name}"

        # Order matters: pet-food should win before generic chew/treat matching.
        if re.search(r"\b(pet|dog|cat|puppy|feline|canine|peanut butter|biscuit|pet treat)\b", combined):
            candidate = "pet-food"
        elif re.search(r"\b(tincture)\b", combined):
            candidate = "tincture"
        elif re.search(r"\b(roll[\s-]?on|cream|lotion|balm|salve|ointment|topical)\b", combined):
            candidate = "cream"
        elif re.search(r"\b(chew|chews|gummy|gummies|treat|treats)\b", combined):
            candidate = "chews"
        elif re.search(r"\b(oil|drops|dropper)\b", combined):
            candidate = "oil"
        else:
            candidate = "default"

        # Validate against schema; fallback hard to default.
        valid = self.schema.get("subcategories", {}).get("cbd", [])
        if candidate in valid:
            return candidate
        return "default"

    def _parse_weight(self, option: str) -> Optional[float]:
        """Parse weight from variant option string."""
        if not option:
            return None

        import re
        # Match patterns like ".3g", ".5g", "0.05g"
        match = re.search(r'(\d*\.?\d+)\s*g', option, re.IGNORECASE)
        if match:
            return float(match.group(1))
        return None


class TopicalTransformer(ProductTransformer):
    """Transformer for topical products (balms, creams, lotions, etc.)."""

    def transform(self, product: Dict[str, Any]) -> Dict[str, Any]:
        """
        Transform topical product with mg-based THC/CBD potency.

        Topicals have THC:CBD ratios and are applied externally.
        """
        normalized = self._basic_transform(product)

        # THC/CBD as mg (not percentage)
        potency_thc = product.get("potencyThc", {})
        if potency_thc.get("range") and len(potency_thc["range"]) > 0:
            normalized["thc_total_mg"] = potency_thc["range"][0]

        potency_cbd = product.get("potencyCbd", {})
        if potency_cbd.get("range") and len(potency_cbd["range"]) > 0:
            normalized["cbd_total_mg"] = potency_cbd["range"][0]

        # Extract THC:CBD ratio from name (for search)
        name = product.get("name", "")
        ratio = self._extract_ratio(name)
        if ratio:
            normalized["thc_cbd_ratio"] = ratio

        # Weight from variants
        variants = product.get("variants", [])
        if variants and isinstance(variants, list) and len(variants) > 0:
            first_variant = variants[0]
            if isinstance(first_variant, dict):
                option = first_variant.get("option", "")
                weight = self._parse_weight(option)
                if weight:
                    normalized["total_weight_grams"] = weight

        return normalized

    def _extract_ratio(self, name: str) -> Optional[str]:
        """
        Extract THC:CBD ratio from product name.

        Examples: "1:1", "3:1", "1:3"
        """
        if not name:
            return None

        import re
        # Match patterns like "1:1", "3:1", "1:3"
        match = re.search(r'(\d+):(\d+)', name)
        if match:
            return f"{match.group(1)}:{match.group(2)}"
        return None

    def _parse_weight(self, option: str) -> Optional[float]:
        """Parse weight from variant option string."""
        if not option:
            return None

        import re
        # Match patterns like "1g", "0.341g", "0.168g"
        match = re.search(r'(\d*\.?\d+)\s*g', option, re.IGNORECASE)
        if match:
            return float(match.group(1))
        return None


class AccessoryTransformer(ProductTransformer):
    """Transformer for accessory products (minimal transformation)."""

    def transform(self, product: Dict[str, Any]) -> Dict[str, Any]:
        """
        Transform accessory product with minimal processing.

        Accessories don't have potency, effects, or terpenes.
        """
        normalized = {}

        # Basic fields only
        normalized["id"] = product.get("id", "")
        normalized["name"] = product.get("name", "")
        normalized["category"] = normalize_category(product.get("category", ""))
        normalized["description"] = product.get("description", "")

        # Subcategory
        raw_subcategory = product.get("subcategory", "")
        subcategory = normalize_subcategory(raw_subcategory, normalized["category"], self.schema)
        if subcategory:
            normalized["subcategory"] = subcategory

        # Slug and shopLink
        normalized["slug"] = product.get("slug", "")
        normalized["shopLink"] = construct_shop_link(product)

        # Brand
        if product.get("brand"):
            brand = product["brand"]
            normalized["brand"] = brand.get("name", "")

        # Images
        image = product.get("image")
        images = product.get("images", [])
        if image:
            normalized["imageLink"] = image
        elif images and isinstance(images, list) and len(images) > 0:
            first_image = images[0]
            if isinstance(first_image, dict) and first_image.get("url"):
                normalized["imageLink"] = first_image["url"]

        # Price
        variants = product.get("variants", [])
        price = extract_preferred_variant_price(variants)
        if price is not None:
            normalized["price"] = price

        quantity = extract_max_variant_quantity(variants)
        if quantity is not None:
            normalized["quantity"] = quantity

        normalized["inStock"] = True

        return normalized


# ============================================================================
# TRANSFORMER DISPATCHER
# ============================================================================

def get_transformer(category: str, schema_data: Optional[Dict] = None) -> ProductTransformer:
    """
    Get the appropriate transformer for a category.

    Args:
        category: Product category string (e.g., "EDIBLES", "FLOWER").
        schema_data: Optional schema dict for validation.

    Returns:
        Appropriate ProductTransformer subclass instance.
    """
    transformers = {
        "edibles": EdibleTransformer,
        "flower": FlowerTransformer,
        "prerolls": PrerollTransformer,
        "pre_rolls": PrerollTransformer,  # Handle both formats
        "vaporizers": VaporizerTransformer,
        "tinctures": TinctureTransformer,
        "concentrates": ConcentrateTransformer,
        "cbd": CBDTransformer,  # CBD products with mg-based potency
        "topicals": TopicalTransformer,  # Topical products with mg-based potency
        "accessories": AccessoryTransformer,
    }

    transformer_class = transformers.get(category.lower(), ProductTransformer)
    return transformer_class(schema_data)


def transform_product(product: Dict[str, Any], schema_data: Optional[Dict] = None) -> Dict[str, Any]:
    """
    Main entry point for product transformation.

    Automatically detects data format and dispatches to appropriate transformer.

    Args:
        product: Raw product dictionary (from API or demo data).
        schema_data: Optional schema dict for validation.

    Returns:
        Normalized product dictionary.
    """
    # Detect format and get category
    if is_real_data_format(product):
        # Real data from API
        category = normalize_category(product.get("category", ""))
        transformer = get_transformer(category, schema_data)
        return transformer.transform(product)
    else:
        # Demo/legacy format - use existing normalize_product
        return normalize_product(product, None, schema_data)


# ============================================================================
# SCRIPT EXECUTION
# ============================================================================

if __name__ == "__main__":
    print("This module is intended to be imported, not run directly.")
    print("Use vectorize.py to process products.")

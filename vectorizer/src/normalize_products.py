import json
import re
from typing import Dict, Any, Optional, List

# Load schema at module level (can be overridden)
try:
    with open("schema.json", "r") as f:
        schema = json.load(f)
except FileNotFoundError:
    schema = {}

# Mapping from display names to schema subcategory values (lowercase kebab-case)
SUBCATEGORY_MAPPING = {
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
    "Tinctures": "tinctures",
    "Badder": "badder",
    "Hash": "hash"
}

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
    category = product.get("category", "").lower()
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
    
    elif category == "concentrates":
        # Check if it's a tincture
        if "tincture" in name.lower():
            display_subcategory = "Tinctures"
        elif product.get("texture") == "badder":
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
    category = product.get("category", "").lower()
    normalized = product.copy()
    
    # Common fields
    if "weight" in normalized:
        normalized["total_weight_ounce"] = normalized.pop("weight")
    if "weight_grams" in normalized:
        normalized["total_weight_grams"] = normalized.pop("weight_grams")
    if "unit" in normalized:
        del normalized["unit"]  # Remove unit field as it's now in property names
    
    # THC/CBD percentage fields (skip for tinctures - they'll be handled separately)
    category = normalized.get("category", "").lower()
    is_tincture = category == "concentrates" and "tincture" in normalized.get("name", "").lower()
    
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
    
    elif category == "concentrates":
        # Check if it's a tincture
        if "tincture" in normalized.get("name", "").lower():
            # Tinctures: normalize volume and serving fields
            if "volume_ml" in normalized:
                normalized["total_volume_ml"] = normalized.pop("volume_ml")
            
            if "serving_size_ml" in normalized:
                # Keep as is
                pass
            
            # Remove thc_percentage and cbd_percentage for tinctures (they don't have percentages)
            if "thc_percentage" in normalized:
                del normalized["thc_percentage"]
            if "cbd_percentage" in normalized:
                del normalized["cbd_percentage"]
            
            # THC/CBG totals are already in mg in the original data
            if "thc_total" in normalized:
                thc_total = normalized["thc_total"]
                # Values like 150.0 are already in mg, not grams
                normalized["thc_total_mg"] = round(thc_total, 2)
                del normalized["thc_total"]
            
            if "thc_per_serving" in normalized:
                normalized["thc_per_serving_mg"] = normalized.pop("thc_per_serving")
            
            if "cbg_total" in normalized:
                cbg_total = normalized["cbg_total"]
                # Values like 600.0 are already in mg
                normalized["cbg_total_mg"] = round(cbg_total, 2)
                del normalized["cbg_total"]
            
            if "cbg_per_serving" in normalized:
                normalized["cbg_per_serving_mg"] = normalized.pop("cbg_per_serving")
            
            # Remove leftover thc/cbd fields (they're not percentages for tinctures)
            if "thc" in normalized:
                del normalized["thc"]
            if "cbd" in normalized:
                del normalized["cbd"]
        else:
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
    
    # Ensure effects is never empty (shouldn't happen per user, but safety check)
    if "effects" in cleaned:
        if isinstance(cleaned["effects"], list) and len(cleaned["effects"]) == 0:
            cleaned["effects"] = ["relaxed"]  # Default fallback
    
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
    Normalize THC values with subcategory-specific error handling.
    
    Logic:
    - gummies/live-resin-gummies/live-rosin-gummies: 
      * If 100 <= thc_total <= 120, normalize to 100 (common error)
      * Extract from name/description if potencyThc seems wrong
    - cooking-baking: Use potencyThc as-is (no normalization)
    - drinks: Use potencyThc as-is (no normalization)  
    - chews/chocolates: Be defensive - try name/description first if >120mg
    
    Returns: {"thc_total_mg": float, "thc_per_unit_mg": Optional[float]}
    """
    result = {}
    
    # Extract thc_total_mg from potencyThc
    thc_total_mg = None
    if potency_thc.get("range") and len(potency_thc["range"]) > 0:
        thc_total_mg = potency_thc["range"][0]
    elif potency_thc.get("formatted"):
        # Fallback: parse from formatted string "110mg"
        match = re.search(r'(\d+(?:\.\d+)?)', potency_thc["formatted"])
        if match:
            thc_total_mg = float(match.group(1))
    
    if thc_total_mg is None:
        return result
    
    # Subcategory-specific normalization
    gummy_subcategories = ["gummies", "live-resin-gummies", "live-rosin-gummies"]
    
    if subcategory in gummy_subcategories:
        # Gummies: normalize 100-120mg to 100mg (common error)
        if 100 <= thc_total_mg <= 120:
            thc_total_mg = 100.0
        # If still > 120, try to extract from name/description
        elif thc_total_mg > 120:
            # Try to find "100mg" or similar in name/description
            for text in [name, description, slug]:
                match = re.search(r'(\d+(?:\.\d+)?)\s*mg', text, re.IGNORECASE)
                if match:
                    extracted = float(match.group(1))
                    if 50 <= extracted <= 150:  # Reasonable range
                        thc_total_mg = extracted
                        break
    
    elif subcategory in ["chews", "chocolates"]:
        # Chews/Chocolates: be defensive if >120mg
        if thc_total_mg > 120:
            # Try to extract from name/description first
            for text in [name, description, slug]:
                match = re.search(r'(\d+(?:\.\d+)?)\s*mg', text, re.IGNORECASE)
                if match:
                    extracted = float(match.group(1))
                    if 50 <= extracted <= 150:
                        thc_total_mg = extracted
                        break
    
    # cooking-baking and drinks: use as-is (no normalization)
    
    result["thc_total_mg"] = round(thc_total_mg, 2)
    
    # Calculate thc_per_unit_mg
    if pack_count and pack_count > 0:
        result["thc_per_unit_mg"] = round(thc_total_mg / pack_count, 2)
    else:
        # Try to extract from description: "10mg per piece"
        per_piece_match = re.search(
            r'(\d+(?:\.\d+)?)\s*mg\s*per\s*piece', 
            description, 
            re.IGNORECASE
        )
        if per_piece_match:
            result["thc_per_unit_mg"] = round(float(per_piece_match.group(1)), 2)
            # Back-calculate pack_count if we found per_unit
            if thc_total_mg and result.get("thc_per_unit_mg"):
                calculated_pack_count = int(thc_total_mg / result["thc_per_unit_mg"])
                if 1 <= calculated_pack_count <= 100:
                    result["pack_count"] = calculated_pack_count
    
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
    
    # Extract cbd_total_mg from potencyCbd
    cbd_total_mg = None
    if potency_cbd.get("range") and len(potency_cbd["range"]) > 0:
        cbd_total_mg = potency_cbd["range"][0]
    elif potency_cbd.get("formatted"):
        match = re.search(r'(\d+(?:\.\d+)?)', potency_cbd["formatted"])
        if match:
            cbd_total_mg = float(match.group(1))
    
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
    normalized["category"] = product.get("category", "").lower()
    
    # Type
    strain_type = product.get("strainType", "")
    if strain_type:
        normalized["type"] = strain_type.lower()
    
    normalized["description"] = product.get("description", "")
    
    # Subcategory mapping (real data uses uppercase with underscores)
    subcategory = map_real_subcategory(product.get("subcategory", ""), schema_to_use)
    if subcategory:
        normalized["subcategory"] = subcategory
    
    # Extract pack count (subcategory-specific)
    pack_count = extract_pack_count_edibles(
        product.get("name", ""),
        product.get("description", ""),
        product.get("slug", ""),
        subcategory or ""
    )
    if pack_count:
        normalized["pack_count"] = pack_count
    
    # Normalize THC (subcategory-specific)
    thc_data = normalize_thc_for_edibles(
        product.get("potencyThc", {}),
        subcategory or "",
        pack_count,
        product.get("name", ""),
        product.get("description", ""),
        product.get("slug", "")
    )
    normalized.update(thc_data)
    
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
    
    # Effects (normalize to lowercase)
    effects = product.get("effects", [])
    if isinstance(effects, list):
        normalized["effects"] = [e.lower() for e in effects if e]
    else:
        normalized["effects"] = []
    
    # Ensure effects is never empty
    if not normalized["effects"]:
        normalized["effects"] = ["relaxed"]
    
    # Images
    image = product.get("image")
    images = product.get("images", [])
    if image:
        normalized["imageLink"] = image
    elif images and isinstance(images, list) and len(images) > 0:
        first_image = images[0]
        if isinstance(first_image, dict) and first_image.get("url"):
            normalized["imageLink"] = first_image["url"]
    
    # Price (from variants)
    variants = product.get("variants", [])
    if variants and isinstance(variants, list) and len(variants) > 0:
        first_variant = variants[0]
        if isinstance(first_variant, dict):
            price = first_variant.get("priceRec") or first_variant.get("priceMed")
            if price is not None:
                normalized["price"] = float(price)
            
            # Quantity (inventory from variants)
            quantity = first_variant.get("quantity")
            if quantity is not None:
                normalized["quantity"] = int(quantity)
    
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
    
    # Step 1.5: Normalize category and type to lowercase
    if "category" in product and product["category"]:
        product["category"] = product["category"].lower()
    if "type" in product and product["type"]:
        product["type"] = product["type"].lower()
    
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
# SCRIPT EXECUTION (for backward compatibility)
# ============================================================================

if __name__ == "__main__":
    # Load data
    with open("demo_products.json", "r") as f:
        products = json.load(f)
    
    with open("demo_brands.json", "r") as f:
        brands = json.load(f)
    
    # Create brand lookup dictionary
    brand_lookup = {brand["id"]: brand for brand in brands}
    
    # Transform all products
    normalized_products = []
    
    for product in products:
        normalized = normalize_product(product, brand_lookup)
        normalized_products.append(normalized)
    
    # Write output
    with open("demo_products_1.json", "w") as f:
        json.dump(normalized_products, f, indent=2, ensure_ascii=False)
    
    print(f"✓ Normalized {len(normalized_products)} products")
    print(f"✓ Written to demo_products_1.json")
    
    # Validate JSON
    with open("demo_products_1.json", "r") as f:
        validation_data = json.load(f)
        print(f"✓ JSON validation passed ({len(validation_data)} products)")

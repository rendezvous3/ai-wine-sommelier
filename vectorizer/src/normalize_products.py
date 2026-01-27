import json
import re
from typing import Dict, Any, Optional

# Load schema
with open("schema.json", "r") as f:
    schema = json.load(f)

# Load data
with open("demo_products.json", "r") as f:
    products = json.load(f)

with open("demo_brands.json", "r") as f:
    brands = json.load(f)

# Create brand lookup dictionary
brand_lookup = {brand["id"]: brand for brand in brands}

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

def assign_subcategory(product: Dict[str, Any]) -> Optional[str]:
    """Assign subcategory based on category and product details.
    Returns lowercase kebab-case subcategory matching schema."""
    category = product.get("category", "").lower()
    name = product.get("name", "").lower()
    description = product.get("description", "").lower()
    
    # Get valid subcategories for this category from schema
    valid_subcategories = schema.get("subcategories", {}).get(category, [])
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
    """Normalize inventory field"""
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

def enrich_with_brand(product: Dict[str, Any]) -> Dict[str, Any]:
    """Enrich product with brand information with strict 512 token limit"""
    brand_id = product.get("brandId")
    if not brand_id or brand_id not in brand_lookup:
        return product
    
    brand = brand_lookup[brand_id]
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

# Transform all products
normalized_products = []

for product in products:
    # Step 1: Normalize inventory
    product = normalize_inventory(product)
    
    # Step 1.5: Normalize category and type to lowercase
    if "category" in product and product["category"]:
        product["category"] = product["category"].lower()
    if "type" in product and product["type"]:
        product["type"] = product["type"].lower()
    
    # Step 2: Assign subcategory (already returns lowercase kebab-case)
    subcategory = assign_subcategory(product)
    if subcategory:
        product["subcategory"] = subcategory
    
    # Step 3: Normalize weights and THC
    product = normalize_weights_and_thc(product)
    
    # Step 4: Enrich with brand
    product = enrich_with_brand(product)
    
    # Step 5: Cleanup properties
    product = cleanup_properties(product)
    
    normalized_products.append(product)

# Write output
with open("demo_products_1.json", "w") as f:
    json.dump(normalized_products, f, indent=2, ensure_ascii=False)

print(f"✓ Normalized {len(normalized_products)} products")
print(f"✓ Written to demo_products_1.json")

# Validate JSON
with open("demo_products_1.json", "r") as f:
    validation_data = json.load(f)
    print(f"✓ JSON validation passed ({len(validation_data)} products)")


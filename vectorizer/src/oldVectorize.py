import json
import os
from dotenv import load_dotenv
from langchain_cloudflare.chat_models import ChatCloudflareWorkersAI
from langchain_cloudflare.embeddings import CloudflareWorkersAIEmbeddings
from langchain_cloudflare.vectorstores import CloudflareVectorize
from langchain_core.documents import Document
from tqdm import tqdm
import requests
from normalize_products import (
    normalize_product,
    transform_edible_data,
    is_real_data_format
)

load_dotenv("../.env")

# Load schema for validation
with open("schema.json", "r") as f:
    schema = json.load(f)

ACCOUNT_ID = os.getenv("CF_ACCOUNT_ID")
API_TOKEN = os.getenv("CF_VECTORIZE_API_TOKEN")

# Load raw products and normalize them
# TODO: Update this to load from your actual data source (API, file, etc.)
# For now, try to load real edible data first, fallback to demo data
raw_products = []
try:
    # Try loading real edible data
    with open("schema/edibles.json", "r") as f:
        raw_products = json.load(f)
except FileNotFoundError:
    # Fallback to demo products
    try:
        with open("demo_products.json", "r") as f:
            raw_products = json.load(f)
    except FileNotFoundError:
        # Fallback to already-normalized products (backward compatibility)
        with open("demo_products_1.json", "r") as f:
            products = json.load(f)
            raw_products = None

# Normalize products if we loaded raw data
if raw_products:
    # Load brands for demo data normalization
    brand_lookup = {}
    try:
        with open("demo_brands.json", "r") as f:
            brands = json.load(f)
            brand_lookup = {brand["id"]: brand for brand in brands}
    except FileNotFoundError:
        pass
    
    # Normalize products
    products = []
    for product in raw_products:
        if is_real_data_format(product):
            # Real data format - use transform_edible_data
            normalized = transform_edible_data(product, schema)
        else:
            # Demo format - use normalize_product
            normalized = normalize_product(product, brand_lookup, schema)
        products.append(normalized)

MODEL_WORKERSAI = "@cf/baai/bge-large-en-v1.5"
embedder = CloudflareWorkersAIEmbeddings(model_name=MODEL_WORKERSAI)
cfVect = CloudflareVectorize(embedding=embedder)

def clean_effects(effects: list, product_type: str) -> list:
    """
    Clean effects array to remove contradictory effects.
    
    Strategies:
    1. Sedating effects are isolated - if present, remove all energizing/creative/joyful effects
    2. Type-based filtering for extremes (energizing only in sativa/hybrid, sedating extremes only in indica/hybrid)
    3. Creative and joyful effects can blend with energizing, but NOT with sedating
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
    # "euphoria", "euphoric" -> "euphoric" (then map to "happy" if needed, but keep as-is for now)
    normalized = ["euphoric" if e in ["euphoria"] else e for e in normalized]
    
    # Define effect groups
    sedating_effects = {"sleepy", "sedated", "relaxed", "calm", "chill"}
    energizing_effects = {"energetic", "uplifting", "energized"}
    creative_effects = {"creative", "inspired"}
    joyful_effects = {"happy", "euphoric"}
    clear_mind_effects = {"clear-mind", "focused"}
    
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

def get_potency_label(product: dict) -> str:
    """
    Get potency label based on THC scales.
    
    Flower/Prerolls: Mild (<13%), Balanced (13-18%), Moderate (18-22%), Strong (22-28%), Very Strong (>28%)
    Vaporizers/Concentrates: Mild (<66%), Balanced (66-75%), Moderate (75-85%), Strong (85-90%), Very Strong (>90%)
    Edibles: Based on thc_per_unit_mg (not percentage)
    """
    category = product.get("category", "").lower()
    thc_percentage = product.get("thc_percentage")
    thc_per_unit_mg = product.get("thc_per_unit_mg")
    
    if category in ["flower", "prerolls"]:
        if thc_percentage is None:
            return ""
        if thc_percentage < 13:
            return "Mild potency"
        elif thc_percentage < 18:
            return "Balanced potency"
        elif thc_percentage < 22:
            return "Moderate potency"
        elif thc_percentage < 28:
            return "Strong potency"
        else:
            return "Very Strong potency"
    
    elif category in ["vaporizers", "concentrates"]:
        if thc_percentage is None:
            return ""
        if thc_percentage < 66:
            return "Mild potency"
        elif thc_percentage < 75:
            return "Balanced potency"
        elif thc_percentage < 85:
            return "Moderate potency"
        elif thc_percentage < 90:
            return "Strong potency"
        else:
            return "Very Strong potency"
    
    elif category == "edibles":
        # For edibles, use thc_per_unit_mg (not percentage)
        # Edibles scale would be different - for now, just note if it's high
        if thc_per_unit_mg is None:
            return ""
        if thc_per_unit_mg >= 10:
            return "Strong potency"
        elif thc_per_unit_mg >= 5:
            return "Moderate potency"
        else:
            return "Mild potency"
    
    return ""

def build_page_content(p: dict) -> str:
    """Build page_content string from product data"""
    parts = []
    
    # Product name and description
    if p.get("name"):
        parts.append(p["name"])
    if p.get("description"):
        parts.append(p["description"])
    
    # Clean effects before adding
    product_type = p.get("type", "")
    effects = clean_effects(p.get("effects"), product_type)
    if effects:
        effects_str = ", ".join(effects)
        parts.append(f"Effects: {effects_str}")
    
    # Flavor (handle None case)
    flavor = p.get("flavor")
    if flavor:
        if isinstance(flavor, list):
            flavor_str = ", ".join(str(f) for f in flavor if f)
            if flavor_str:
                parts.append(f"Flavor: {flavor_str}")
        else:
            parts.append(f"Flavor: {flavor}")
    
    # Brand tagline (keep this - it's short and useful)
    if p.get("brand_tagline"):
        parts.append(f"Brand: {p['brand_tagline']}")
    
    # REMOVED: Brand description (dilutes context)
    # if p.get("brand_description"):
    #     parts.append(p["brand_description"])
    
    # Subcategory
    if p.get("subcategory"):
        parts.append(f"Subcategory: {p['subcategory']}")
    
    # Terpene aromas (important for search)
    terpenes = p.get("terpenes", [])
    if terpenes and isinstance(terpenes, list):
        aromas_list = []
        for terpene in terpenes:
            if isinstance(terpene, dict):
                aromas = terpene.get("aromas", [])
                if aromas:
                    aromas_list.extend(aromas)
        if aromas_list:
            unique_aromas = list(set(aromas_list))
            parts.append(f"Aromas: {', '.join(unique_aromas)}")
    
    # Terpene potential health benefits (important for search)
    if terpenes and isinstance(terpenes, list):
        benefits_list = []
        for terpene in terpenes:
            if isinstance(terpene, dict):
                benefits = terpene.get("potentialHealthBenefits", [])
                if benefits:
                    benefits_list.extend(benefits)
        if benefits_list:
            unique_benefits = list(set(benefits_list))
            parts.append(f"Health Benefits: {', '.join(unique_benefits)}")
    
    # Add potency label
    potency = get_potency_label(p)
    if potency:
        parts.append(f"Potency: {potency}")
    
    return ". ".join(parts)

def build_metadata(p: dict) -> dict:
    """Build metadata dictionary from product data.
    Ensures all classifications are lowercase and validates subcategory against schema."""
    # Normalize category and type to lowercase
    category = p.get("category", "").lower() if p.get("category") else ""
    product_type = p.get("type", "").lower() if p.get("type") else ""
    
    metadata = {
        "name": p.get("name", ""),
        "category": category,
        "type": product_type,
        "brand": p.get("brand", ""),
    }
    
    # Include ID in metadata for proper retrieval
    # CRITICAL: ID must be in metadata because CloudflareVectorizeStore doesn't expose doc.id
    # The vector ID (passed to add_documents) and metadata ID should match
    product_id = p.get("id")
    if not product_id:
        raise ValueError(f"Product missing required 'id' field: {p.get('name', 'Unknown')}")
    metadata["id"] = product_id
    
    # Subcategory - validate against schema
    subcategory = p.get("subcategory")
    if subcategory:
        # Normalize to lowercase
        normalized_subcategory = subcategory.lower()
        # Validate against schema
        valid_subcategories = schema.get("subcategories", {}).get(category, [])
        if normalized_subcategory in valid_subcategories:
            metadata["subcategory"] = normalized_subcategory
        # If invalid, don't include it (better to omit than be wrong)
    
    # Brand fields (keep brand_tagline, remove brand_description from metadata)
    if p.get("brand_tagline"):
        metadata["brand_tagline"] = p["brand_tagline"]
    # Note: brand_description should NOT be in metadata (only in page_content for semantic search)
    
    # Effects - clean effects before adding to metadata
    product_type = p.get("type", "")
    cleaned_effects = clean_effects(p.get("effects"), product_type)
    metadata["effects"] = cleaned_effects
    
    # Flavor - keep as array, normalize to lowercase
    flavor = p.get("flavor")
    if flavor:
        if isinstance(flavor, list):
            metadata["flavor"] = [str(f).lower() for f in flavor if f]  # Normalize to lowercase
        else:
            metadata["flavor"] = [str(flavor).lower()]  # Convert single value to array and lowercase
    else:
        metadata["flavor"] = []
    
    # Weight fields
    if p.get("total_weight_ounce") is not None:
        metadata["total_weight_ounce"] = p["total_weight_ounce"]
    if p.get("total_weight_grams") is not None:
        metadata["total_weight_grams"] = p["total_weight_grams"]
    if p.get("individual_weight_grams") is not None:
        metadata["individual_weight_grams"] = p["individual_weight_grams"]
    
    # THC fields
    if p.get("thc_percentage") is not None:
        metadata["thc_percentage"] = p["thc_percentage"]
    if p.get("thc_total_mg") is not None:
        metadata["thc_total_mg"] = p["thc_total_mg"]
    if p.get("thc_per_unit_mg") is not None:
        metadata["thc_per_unit_mg"] = p["thc_per_unit_mg"]
    if p.get("thc_per_serving_mg") is not None:
        metadata["thc_per_serving_mg"] = p["thc_per_serving_mg"]
    
    # CBD fields
    if p.get("cbd_percentage") is not None:
        metadata["cbd_percentage"] = p["cbd_percentage"]
    if p.get("cbd_total_mg") is not None:
        metadata["cbd_total_mg"] = p["cbd_total_mg"]
    if p.get("cbd_per_unit_mg") is not None:
        metadata["cbd_per_unit_mg"] = p["cbd_per_unit_mg"]
    
    # CBG fields (for tinctures)
    if p.get("cbg_total_mg") is not None:
        metadata["cbg_total_mg"] = p["cbg_total_mg"]
    if p.get("cbg_per_serving_mg") is not None:
        metadata["cbg_per_serving_mg"] = p["cbg_per_serving_mg"]
    
    # Volume fields (for tinctures)
    if p.get("total_volume_ml") is not None:
        metadata["total_volume_ml"] = p["total_volume_ml"]
    if p.get("serving_size_ml") is not None:
        metadata["serving_size_ml"] = p["serving_size_ml"]
    
    # Preroll fields
    if p.get("pack_count") is not None:
        metadata["pack_count"] = p["pack_count"]
    
    # Serving size (for concentrates)
    if p.get("serving_size_mg") is not None:
        metadata["serving_size_mg"] = p["serving_size_mg"]
    
    # Inventory status
    if p.get("inStock") is not None:
        metadata["inStock"] = p["inStock"]
    
    # Price
    if p.get("price") is not None:
        metadata["price"] = p["price"]
    
    # Shop and image links
    if p.get("shopLink"):
        metadata["shopLink"] = p["shopLink"]
    if p.get("imageLink"):
        metadata["imageLink"] = p["imageLink"]
    
    # Slug
    if p.get("slug"):
        metadata["slug"] = p["slug"]
    
    # Quantity (inventory)
    if p.get("quantity") is not None:
        metadata["quantity"] = p["quantity"]
    
    # Terpenes (keep aromas and potentialHealthBenefits for search)
    terpenes = p.get("terpenes")
    if terpenes and isinstance(terpenes, list) and len(terpenes) > 0:
        metadata["terpenes"] = terpenes
    
    # Cannabinoids
    cannabinoids = p.get("cannabinoids")
    if cannabinoids and isinstance(cannabinoids, list) and len(cannabinoids) > 0:
        metadata["cannabinoids"] = cannabinoids
    
    # Add page_content to metadata for examination
    metadata["page_content"] = build_page_content(p)
    
    return metadata

documents = [
    Document(
        page_content=build_page_content(p),
        metadata=build_metadata(p),
    )
    for p in products
]

# Use product IDs as unique vector IDs
# Validate that all products have IDs before vectorization
ids = []
for p in products:
    product_id = p.get("id")
    if not product_id:
        raise ValueError(f"Product missing required 'id' field: {p.get('name', 'Unknown')}")
    ids.append(product_id)

# Verify IDs match metadata IDs (sanity check)
for i, (p, doc) in enumerate(zip(products, documents)):
    product_id = p.get("id")
    metadata_id = doc.metadata.get("id")
    if product_id != metadata_id:
        raise ValueError(f"ID mismatch at index {i}: product_id={product_id}, metadata_id={metadata_id}")

# STEP 4 # print("Examples for embeddings") 
# Embed the products and create the documents
# Do not specify the id in the metadata, it will be generated by the vectorize index
# print("ids", ids)
# print("---------------------------------")
# print("documents", documents)

# for doc in documents:
#     print("---------------------------------")
#     # print("doc", doc.page_content)
#     # print("doc", doc.type)
#     # Print all metadata except page_content
#     metadata_without_content = {k: v for k, v in doc.metadata.items() if k != "page_content"}
#     print("doc", metadata_without_content)
#     # print("doc", doc.metadata.get("thc_per_unit_mg"))
#     print("---------------------------------")


print("documents", json.dumps([{"page_content": doc.page_content, "metadata": {k: v for k, v in doc.metadata.items() if k != "page_content"}} for doc in documents], indent=2, default=str))




# STEP 1 - Create the Vector DB Table - chose index name
# vectorize_index_name = "products-demo-x"
# vectorize_index_name = "test-langchain-cloudflare"
# vectorize_index_name = "products-demo-2"
vectorize_index_name = "products-demo-3"

# STEP 2 - Create the Vector DB Table, run create_index command
# ONLY RUN ONCE INITIALLY to create the Vector DB Table
# cfVect.create_index(index_name=vectorize_index_name, wait=True)

# STEP 3 - run matadata indexing commands in backend

# STEP 5 - Add the documents to the Vector DB Table
# r = cfVect.add_documents(index_name=vectorize_index_name, documents=documents, ids=ids)

# Delete the specific index
# requests.delete(
#     f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/vectorize/v2/indexes/{vectorize_index_name}",
#     headers={
#         "Authorization": f"Bearer {API_TOKEN}",  # ← THIS IS THE KEY LINE
#         "Content-Type": "application/json",
#     },
# )

# Fetch all indeces, Vector DB table info
response = requests.get(
    f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/vectorize/v2/indexes",
    headers={
        "Authorization": f"Bearer {API_TOKEN}",  # ← THIS IS THE KEY LINE
        "Content-Type": "application/json",
    },
)

# Fetch the specific index, Vector DB table info
# response = requests.get(
#     f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/vectorize/v2/indexes/{vectorize_index_name}/info",
#     headers={
#         "Authorization": f"Bearer {API_TOKEN}",  # ← THIS IS THE KEY LINE
#         "Content-Type": "application/json",
#     },
# )

# curl "https://api.cloudflare.com/client/v4/accounts/a1d51caa9dfb04600e8aefd32367408e/vectorize/v2/indexes" \
# -H "Authorization: Bearer 2L8iOfQM7ugSPVBgz3cP0JgxFTyhYch5-1I46q6g"

if response.status_code != 200:
    raise ValueError(f"Token invalid—status {response.status_code}: {response.text}")

print("response", response.json())
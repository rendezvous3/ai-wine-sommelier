"""
Vectorize Products

Orchestrates the product vectorization pipeline:
1. Fetch products from Dutchie API (or fallback to local files)
2. Transform products using normalize_products.py
3. Build page_content and metadata
4. Upload to Cloudflare Vectorize

All business logic is delegated to normalize_products.py.
"""

import os
import json
import asyncio
import argparse
from typing import List, Dict, Any, Optional

from dotenv import load_dotenv
from langchain_cloudflare.embeddings import CloudflareWorkersAIEmbeddings
from langchain_cloudflare.vectorstores import CloudflareVectorize
from langchain_core.documents import Document
from tqdm import tqdm
import requests

# Local imports - business logic now centralized in normalize_products
from normalize_products import (
    transform_product,
    clean_effects,
    get_potency_label,
    is_real_data_format,
)
from dutchie_client import DutchieClient, DutchieAPIError
from d1_uniques import (
    D1UniqueStore,
    build_uniques_table_name,
    normalize_product_name,
)

env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
load_dotenv(env_path)
# load_dotenv("../.env")

# Load schema for validation
try:
    schema_path = os.path.join(os.path.dirname(__file__), "schema.json")
    with open(schema_path, "r") as f:
        schema = json.load(f)
except FileNotFoundError:
    raise FileNotFoundError(f"schema.json not found at {schema_path}. Make sure you're running from the correct directory.")

# Configuration
ACCOUNT_ID = os.getenv("CF_ACCOUNT_ID")
API_TOKEN = os.getenv("CF_VECTORIZE_API_TOKEN")
MODEL_WORKERSAI = "@cf/baai/bge-large-en-v1.5"
CF_D1_DATABASE_ID = os.getenv("CF_D1_DATABASE_ID")
CF_D1_API_TOKEN = os.getenv("CF_D1_API_TOKEN") or API_TOKEN


# ============================================================================
# DATA LOADING
# ============================================================================

async def load_products_from_api(
    category: Optional[str] = None,
    subcategory: Optional[str] = None,
    strain_type: Optional[str] = None,
    offset: int = 0,
    total_limit: Optional[int] = None
) -> List[Dict[str, Any]]:
    """
    Load products from Dutchie API.

    Args:
        category: Optional category filter (e.g., "EDIBLES", "FLOWER").
        subcategory: Optional subcategory filter (e.g., "GUMMIES", "CHOCOLATES").
        strain_type: Optional strain type filter (e.g., "INDICA", "SATIVA", "HYBRID").
        offset: Starting offset for pagination (default 0).
        total_limit: Optional total limit of products to fetch. If None, fetches all.

    Returns:
        List of raw product dictionaries.

    Raises:
        DutchieAPIError: If API fetch fails.
    """
    client = None
    try:
        limit_str = f", limit: {total_limit}" if total_limit else ""
        offset_str = f", offset: {offset}" if offset > 0 else ""
        subcategory_str = f", subcategory: {subcategory}" if subcategory else ""
        strain_str = f", strain: {strain_type}" if strain_type else ""
        print(f"Fetching products from Dutchie API (category: {category}{subcategory_str}{strain_str}{offset_str}{limit_str})...")
        client = DutchieClient()
        products = []

        async for batch in client.fetch_all_products_paginated(
            category=category,
            subcategory=subcategory,
            strain_type=strain_type,
            offset=offset,
            total_limit=total_limit
        ):
            products.extend(batch)
            print(f"  Fetched batch of {len(batch)} products (total: {len(products)})")

        print(f"Successfully fetched {len(products)} products from API")
        return products

    except DutchieAPIError as e:
        print(f"\n✗ API fetch failed: {e}")
        print("  Use --local flag to load from local files instead.")
        raise

    finally:
        # Always close the client to avoid unclosed session warnings
        if client:
            await client.close()


def load_products_from_file(category: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Load products from local JSON files (fallback).

    Args:
        category: Optional category filter for file selection.

    Returns:
        List of raw product dictionaries.
    """
    # Map category to file
    file_mapping = {
        "edibles": "schema/edibles.json",
        "EDIBLES": "schema/edibles.json",
    }

    # Try category-specific file first
    if category:
        file_path = file_mapping.get(category)
        if file_path:
            try:
                with open(file_path, "r") as f:
                    products = json.load(f)
                    print(f"Loaded {len(products)} products from {file_path}")
                    return products
            except FileNotFoundError:
                print(f"Category file {file_path} not found")

    print("No product files found")
    return []


# ============================================================================
# DOCUMENT BUILDING
# ============================================================================

def build_page_content(p: Dict[str, Any]) -> str:
    """
    Build page_content string from normalized product data.

    Args:
        p: Normalized product dictionary.

    Returns:
        Semantic search text string.
    """
    parts = []

    # Product name and description
    if p.get("name"):
        parts.append(p["name"])
    if p.get("description"):
        parts.append(p["description"])

    # Effects (already cleaned in transformation)
    effects = p.get("effects", [])
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

    # Cannabinoid descriptions (important for semantic search on cannabinoid properties)
    cannabinoids = p.get("cannabinoids", [])
    if cannabinoids and isinstance(cannabinoids, list):
        cannabinoid_descs = []
        for cannabinoid in cannabinoids:
            if isinstance(cannabinoid, dict):
                name = cannabinoid.get("name", "")
                desc = cannabinoid.get("description", "")
                if name and desc:
                    # Truncate long descriptions to keep page_content reasonable
                    truncated_desc = desc[:150] + "..." if len(desc) > 150 else desc
                    cannabinoid_descs.append(f"{name}: {truncated_desc}")
        if cannabinoid_descs:
            # Limit to top 3 cannabinoids to avoid overly long page_content
            parts.append(f"Cannabinoids: {'; '.join(cannabinoid_descs[:3])}")

    # Add potency label (uses centralized function from normalize_products)
    category = p.get("category", "")
    if category == "edibles":
        thc_value = p.get("thc_per_unit_mg")
    else:
        thc_value = p.get("thc_percentage")

    if thc_value is not None:
        potency = get_potency_label(category, thc_value)
        if potency:
            parts.append(f"Potency: {potency}")

    return ". ".join(parts)


def build_metadata(p: Dict[str, Any]) -> Dict[str, Any]:
    """
    Build metadata dictionary from normalized product data.

    Args:
        p: Normalized product dictionary.

    Returns:
        Metadata dictionary for vector storage.
    """
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
    product_id = p.get("id")
    if not product_id:
        raise ValueError(f"Product missing required 'id' field: {p.get('name', 'Unknown')}")
    metadata["id"] = product_id

    # Subcategory - validate against schema
    subcategory = p.get("subcategory")
    if subcategory:
        normalized_subcategory = subcategory.lower()
        valid_subcategories = schema.get("subcategories", {}).get(category, [])
        if normalized_subcategory in valid_subcategories:
            metadata["subcategory"] = normalized_subcategory

    # Brand fields
    if p.get("brand_tagline"):
        metadata["brand_tagline"] = p["brand_tagline"]

    # Effects (already cleaned in transformation)
    metadata["effects"] = p.get("effects", [])

    # Flavor - normalize to lowercase array
    flavor = p.get("flavor")
    if flavor:
        if isinstance(flavor, list):
            metadata["flavor"] = [str(f).lower() for f in flavor if f]
        else:
            metadata["flavor"] = [str(flavor).lower()]
    else:
        metadata["flavor"] = []

    # Weight fields
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
        if p.get(field) is not None:
            metadata[field] = p[field]

    # Terpenes
    # terpenes = p.get("terpenes")
    # if terpenes and isinstance(terpenes, list) and len(terpenes) > 0:
    #     metadata["terpenes"] = terpenes
    terpenes = p.get("terpenes")
    if terpenes and isinstance(terpenes, list) and len(terpenes) > 0:
        # Extract just the names as strings
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

    # Cannabinoids
    # cannabinoids = p.get("cannabinoids")
    # if cannabinoids and isinstance(cannabinoids, list) and len(cannabinoids) > 0:
    #     metadata["cannabinoids"] = cannabinoids
    cannabinoids = p.get("cannabinoids")
    if cannabinoids and isinstance(cannabinoids, list) and len(cannabinoids) > 0:
        # Extract just the names as strings
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

    # Add page_content to metadata for examination
    metadata["page_content"] = build_page_content(p)

    return metadata


# ============================================================================
# MAIN PIPELINE
# ============================================================================

async def vectorize_products(
    index_name: str,
    category: Optional[str] = None,
    subcategory: Optional[str] = None,
    strain_type: Optional[str] = None,
    offset: int = 0,
    limit: Optional[int] = 50,
    dry_run: bool = True,
    use_api: bool = True,
    min_quantity: Optional[int] = None,
    use_d1_dedup: bool = True,
) -> List[Document]:
    """
    Main vectorization pipeline.

    Args:
        category: Optional category filter (e.g., "EDIBLES", "FLOWER").
        subcategory: Optional subcategory filter (e.g., "GUMMIES", "CHOCOLATES").
        strain_type: Optional strain type filter (e.g., "INDICA", "SATIVA", "HYBRID").
        offset: Starting offset for pagination (default 0).
        limit: Total limit of products to fetch (default 50). If None, fetches all.
        index_name: Cloudflare Vectorize index name.
        dry_run: If True, don't upload to Vectorize (just transform and print).
        use_api: If True, fetch from API; if False, use local files only.
        min_quantity: Optional stock threshold. If provided, products with known
            quantity lower than threshold are excluded.
        use_d1_dedup: If True, perform cross-run duplicate checks using D1.

    Returns:
        List of Document objects ready for vectorization.
    """

    # Step 1: Load products
    print(f"\n{'='*60}")
    print(f"VECTORIZATION PIPELINE")
    print(f"{'='*60}")
    print(f"Category: {category or 'ALL'}")
    print(f"Subcategory: {subcategory or 'ALL'}")
    print(f"Strain Type: {strain_type or 'ALL'}")
    print(f"Offset: {offset}")
    print(f"Limit: {limit if limit is not None else 'ALL'}")
    print(f"Min Quantity Filter: {min_quantity if min_quantity is not None else 'OFF'}")
    print(f"Index: {index_name}")
    print(f"Mode: {'DRY RUN' if dry_run else 'LIVE UPLOAD'}")
    print(f"{'='*60}\n")

    if use_api:
        raw_products = await load_products_from_api(
            category=category,
            subcategory=subcategory,
            strain_type=strain_type,
            offset=offset,
            total_limit=limit
        )
    else:
        raw_products = load_products_from_file(category)

    if not raw_products:
        print("No products to process")
        return []

    # Step 2: Transform products
    print(f"\nTransforming {len(raw_products)} products...")
    products = []
    errors = []
    stats = {
        "transform_errors": 0,
        "low_stock_excluded": 0,
        "duplicate_id_excluded": 0,
        "duplicate_name_excluded": 0,
        "d1_existing_ids_allowed": 0,
        "d1_name_excluded": 0,
        "missing_id_excluded": 0,
    }

    for i, product in enumerate(tqdm(raw_products, desc="Transforming")):
        try:
            normalized = transform_product(product, schema)
            products.append(normalized)
        except Exception as e:
            stats["transform_errors"] += 1
            errors.append({
                "index": i,
                "name": product.get("name", "Unknown"),
                "error": str(e)
            })

    if errors:
        print(f"\n{len(errors)} products failed to transform:")
        for err in errors[:5]:  # Show first 5 errors
            print(f"  - {err['name']}: {err['error']}")
        if len(errors) > 5:
            print(f"  ... and {len(errors) - 5} more")

    print(f"\nSuccessfully transformed {len(products)} products")

    # Step 2b: Optional low-stock filtering
    if min_quantity is not None:
        stock_filtered = []
        for product in products:
            quantity = product.get("quantity")
            if quantity is None:
                stock_filtered.append(product)
                continue
            try:
                quantity_int = int(quantity)
            except (TypeError, ValueError):
                stock_filtered.append(product)
                continue
            if quantity_int < min_quantity:
                stats["low_stock_excluded"] += 1
                continue
            stock_filtered.append(product)
        products = stock_filtered
        print(f"After low-stock filter: {len(products)} products (excluded: {stats['low_stock_excluded']})")

    # Step 2c: In-memory dedup by ID and normalized name
    unique_products = []
    seen_ids = set()
    seen_names = set()
    for product in products:
        product_id = str(product.get("id") or "").strip()
        if not product_id:
            stats["missing_id_excluded"] += 1
            continue

        normalized_name = normalize_product_name(str(product.get("name") or ""))
        if product_id in seen_ids:
            stats["duplicate_id_excluded"] += 1
            continue
        if normalized_name and normalized_name in seen_names:
            stats["duplicate_name_excluded"] += 1
            continue

        seen_ids.add(product_id)
        if normalized_name:
            seen_names.add(normalized_name)
        unique_products.append(product)
    products = unique_products
    print(
        "After in-memory dedup: "
        f"{len(products)} products "
        f"(duplicate IDs: {stats['duplicate_id_excluded']}, duplicate names: {stats['duplicate_name_excluded']})"
    )

    # Step 2d: Cross-run dedup via D1 (upload mode only)
    d1_store = D1UniqueStore(
        account_id=ACCOUNT_ID,
        database_id=CF_D1_DATABASE_ID,
        api_token=CF_D1_API_TOKEN,
    )
    d1_table_name = build_uniques_table_name(index_name)
    if not dry_run and use_d1_dedup:
        if d1_store.configured:
            try:
                d1_store.ensure_table(d1_table_name)
                existing = d1_store.get_existing(
                    d1_table_name,
                    product_ids=[str(p.get("id", "")) for p in products],
                    normalized_names=[normalize_product_name(str(p.get("name", ""))) for p in products],
                )
                existing_ids = existing.get("ids", set())
                existing_names = existing.get("names", set())

                filtered_by_d1 = []
                for product in products:
                    product_id = str(product.get("id", ""))
                    normalized_name = normalize_product_name(str(product.get("name", "")))
                    # Existing IDs are allowed (normal upsert refresh path).
                    if product_id in existing_ids:
                        stats["d1_existing_ids_allowed"] += 1
                        filtered_by_d1.append(product)
                        continue
                    # New ID + existing normalized name => likely duplicate listing.
                    if normalized_name and normalized_name in existing_names:
                        stats["d1_name_excluded"] += 1
                        continue
                    filtered_by_d1.append(product)
                products = filtered_by_d1
                print(
                    "After D1 dedup: "
                    f"{len(products)} products "
                    f"(existing IDs allowed: {stats['d1_existing_ids_allowed']}, "
                    f"duplicate names excluded: {stats['d1_name_excluded']})"
                )
            except Exception as e:
                # Cron resilience: continue even if D1 is temporarily unavailable.
                print(f"⚠️  D1 dedup check unavailable, continuing without cross-run dedup: {e}")
        else:
            print("⚠️  D1 dedup is enabled but D1 env vars are not configured. Continuing without D1 checks.")

    # Step 3: Build documents
    print("\nBuilding documents...")
    documents = []
    ids = []

    for product in products:
        product_id = product.get("id")
        if not product_id:
            print(f"Skipping product without ID: {product.get('name', 'Unknown')}")
            continue

        try:
            doc = Document(
                page_content=build_page_content(product),
                metadata=build_metadata(product),
            )
            documents.append(doc)
            ids.append(product_id)
        except Exception as e:
            print(f"Error building document for {product.get('name', 'Unknown')}: {e}")

    print(f"Built {len(documents)} documents")

    # Step 4: Upload to Vectorize (if not dry run)
    if not dry_run:
        # Check if index exists before uploading
        try:
            response = requests.get(
                f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/vectorize/v2/indexes",
                headers={
                    "Authorization": f"Bearer {API_TOKEN}",
                    "Content-Type": "application/json",
                },
            )
            if response.status_code == 200:
                indexes = response.json().get("result", [])
                index_exists = any(idx.get("name") == index_name for idx in indexes)
                if not index_exists:
                    print(f"\n⚠️  WARNING: Index '{index_name}' does not exist!")
                    print(f"   Create it first with: python manage_indexes.py --create {index_name}")
                    print("   Skipping upload...")
                    return documents
        except Exception as e:
            print(f"⚠️  Warning: Could not verify index existence: {e}")
            print("   Proceeding with upload anyway...")

        print(f"\nUploading to Vectorize index: {index_name}")
        try:
            embedder = CloudflareWorkersAIEmbeddings(model_name=MODEL_WORKERSAI)
            cfVect = CloudflareVectorize(embedding=embedder)
            cfVect.add_documents(index_name=index_name, documents=documents, ids=ids)
            print("Upload complete!")

            if use_d1_dedup and d1_store.configured and products:
                rows = []
                for product in products:
                    rows.append({
                        "product_id": str(product.get("id", "")),
                        "normalized_name": normalize_product_name(str(product.get("name", ""))),
                        "raw_name": str(product.get("name", "")),
                        "category": str(product.get("category", "")),
                        "subcategory": str(product.get("subcategory", "")),
                    })
                try:
                    d1_store.ensure_table(d1_table_name)
                    d1_result = d1_store.upsert_seen(d1_table_name, rows)
                    print(
                        "D1 uniqueness ledger updated "
                        f"(upserted: {d1_result.get('upserted', 0)}, skipped: {d1_result.get('skipped', 0)})"
                    )
                except Exception as e:
                    print(f"⚠️  D1 uniqueness ledger update failed (non-fatal): {e}")
        except Exception as e:
            print(f"\n✗ Upload failed: {e}")
            if hasattr(e, 'response') and e.response is not None:
                try:
                    error_detail = e.response.json()
                    print(f"Error details: {json.dumps(error_detail, indent=2)}")
                except:
                    print(f"Error response: {e.response.text}")
            raise  
    else:
        print("\nDRY RUN - Skipping upload")

        # Print sample output for verification
        if documents:
            # print("documents", json.dumps([{"page_content": doc.page_content, "metadata": {k: v for k, v in doc.metadata.items() if k != "page_content"}} for doc in documents], indent=2, default=str))
            print("\n" + "="*60)
            print("SAMPLE DOCUMENT")
            print("="*60)
            sample = documents[0]
            sample_metadata = {k: v for k, v in sample.metadata.items() if k != "page_content"}
            print(json.dumps({
                "page_content": sample.page_content[:500] + "..." if len(sample.page_content) > 500 else sample.page_content,
                "metadata": sample_metadata
            }, indent=2, default=str))

    # Verify vectorize indexes
    print("\n" + "="*60)
    print("VECTORIZE INDEXES")
    print("="*60)
    try:
        response = requests.get(
            f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/vectorize/v2/indexes",
            headers={
                "Authorization": f"Bearer {API_TOKEN}",
                "Content-Type": "application/json",
            },
        )
        if response.status_code == 200:
            indexes = response.json().get("result", [])
            for idx in indexes:
                print(f"  - {idx.get('name', 'Unknown')}: {idx.get('vectorsCount', 0)} vectors")
        else:
            print(f"  Failed to fetch indexes: {response.status_code}")
    except Exception as e:
        print(f"  Error fetching indexes: {e}")

    print("\n" + "=" * 60)
    print("PIPELINE SUMMARY")
    print("=" * 60)
    print(f"Final documents: {len(documents)}")
    print(f"Transform errors: {stats['transform_errors']}")
    print(f"Excluded (low stock): {stats['low_stock_excluded']}")
    print(f"Excluded (missing ID): {stats['missing_id_excluded']}")
    print(f"Excluded (duplicate ID in run): {stats['duplicate_id_excluded']}")
    print(f"Excluded (duplicate name in run): {stats['duplicate_name_excluded']}")
    print(f"Allowed (D1 existing IDs): {stats['d1_existing_ids_allowed']}")
    print(f"Excluded (D1 duplicate name): {stats['d1_name_excluded']}")

    return documents


def parse_limit_arg(value: str) -> Optional[int]:
    """Parse --limit argument, supporting integer values or 'none' for unlimited."""
    normalized = (value or "").strip().lower()
    if normalized in {"none", "all", "unlimited"}:
        return None
    try:
        parsed = int(normalized)
    except ValueError as exc:
        raise argparse.ArgumentTypeError("limit must be an integer or one of: none, all, unlimited") from exc
    if parsed <= 0:
        raise argparse.ArgumentTypeError("limit must be > 0 when provided as an integer")
    return parsed


# ============================================================================
# CLI ENTRY POINT
# ============================================================================

def main():
    """CLI entry point."""
    parser = argparse.ArgumentParser(
        description="Vectorize products from Dutchie API",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Dry run with EDIBLES from API (fetches first 50 products)
  python vectorize.py -x products-test --category EDIBLES

  # Fetch 20 INDICA gummies
  python vectorize.py -x products-test --category EDIBLES --subcategory GUMMIES --strain INDICA --limit 20

  # Fetch SATIVA chocolates and upload
  python vectorize.py -x products-prod --category EDIBLES --subcategory CHOCOLATES --strain SATIVA --limit 15 --upload

  # Fetch FLOWER by strain type
  python vectorize.py -x products-test --category FLOWER --strain INDICA --limit 25

  # Fetch EDIBLES products starting from offset 100, limit 50
  python vectorize.py -x products-test --category EDIBLES --offset 100 --limit 50

  # Upload EDIBLES to a test index
  python vectorize.py -x products-test --category EDIBLES --upload

  # Use local files instead of API
  python vectorize.py -x products-test --category EDIBLES --local

  # List available categories
  python vectorize.py -x dummy --list-categories
        """
    )

    parser.add_argument(
        "--category",
        type=str,
        help="Category to vectorize (EDIBLES, FLOWER, PRE_ROLLS, VAPORIZERS, CONCENTRATES, etc.)"
    )
    parser.add_argument(
        "--subcategory",
        type=str,
        help="Subcategory to filter (GUMMIES, CHOCOLATES, COOKING_BAKING, DRINKS, etc.)"
    )
    parser.add_argument(
        "--strain",
        type=str,
        choices=["INDICA", "SATIVA", "HYBRID"],
        help="Strain type to filter (INDICA, SATIVA, HYBRID)"
    )
    parser.add_argument(
        "--index", "-x",
        type=str,
        required=True,
        help="Vectorize index name (required)"
    )
    parser.add_argument(
        "--upload",
        action="store_true",
        help="Actually upload to Vectorize (default is dry run)"
    )
    parser.add_argument(
        "--local",
        action="store_true",
        help="Use local JSON files instead of API"
    )
    parser.add_argument(
        "--offset",
        type=int,
        default=0,
        help="Starting offset for pagination (default: 0)"
    )
    parser.add_argument(
        "--limit",
        type=parse_limit_arg,
        default=50,
        help="Total limit of products to fetch (default: 50). Use 'none' to fetch all."
    )
    parser.add_argument(
        "--min-quantity",
        type=int,
        default=None,
        help="Optional stock threshold: exclude products when quantity exists and is below this value."
    )
    parser.add_argument(
        "--skip-d1-dedup",
        action="store_true",
        help="Skip D1 cross-run deduplication checks and ledger writes."
    )
    parser.add_argument(
        "--list-categories",
        action="store_true",
        help="List available categories and exit"
    )

    args = parser.parse_args()

    if args.list_categories:
        print("Available categories:")
        print("  - FLOWER")
        print("  - PRE_ROLLS")
        print("  - EDIBLES")
        print("  - VAPORIZERS")
        print("  - CONCENTRATES")
        print("  - CBD")
        print("  - TOPICALS")
        print("  - ACCESSORIES")
        return

    asyncio.run(vectorize_products(
        category=args.category,
        subcategory=args.subcategory,
        strain_type=args.strain,
        offset=args.offset,
        limit=args.limit,
        index_name=args.index,
        dry_run=not args.upload,
        use_api=not args.local,
        min_quantity=args.min_quantity,
        use_d1_dedup=not args.skip_d1_dedup,
    ))


if __name__ == "__main__":
    main()

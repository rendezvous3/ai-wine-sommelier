"""
Cloudflare Vectorize Index Management

Handles index lifecycle operations:
- Create indexes
- Delete indexes
- List indexes
- Check if index exists

This script is separate from vectorize.py to maintain clear separation:
- Index management: Rare admin operations
- Data sync: Regular cronjob operations
"""

import os
import json
import argparse
import requests
from typing import List, Dict, Optional
from dotenv import load_dotenv
from d1_uniques import D1UniqueStore, build_uniques_table_name

# Load environment variables
env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
load_dotenv(env_path)

# Configuration
ACCOUNT_ID = os.getenv("CF_ACCOUNT_ID")
API_TOKEN = os.getenv("CF_VECTORIZE_API_TOKEN")
MODEL_WORKERSAI = "@cf/baai/bge-large-en-v1.5"
CF_D1_DATABASE_ID = os.getenv("CF_D1_DATABASE_ID")
CF_D1_API_TOKEN = os.getenv("CF_D1_API_TOKEN") or API_TOKEN

# Cloudflare Vectorize API endpoint
VECTORIZE_API_BASE = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/vectorize/v2"


def list_indexes() -> List[Dict]:
    """
    List all Vectorize indexes.

    Returns:
        List of index dictionaries with name, vector count, etc.
    """
    try:
        response = requests.get(
            f"{VECTORIZE_API_BASE}/indexes",
            headers={
                "Authorization": f"Bearer {API_TOKEN}",
                "Content-Type": "application/json",
            },
        )
        if response.status_code == 200:
            return response.json().get("result", [])
        else:
            print(f"Error listing indexes: {response.status_code} - {response.text}")
            return []
    except Exception as e:
        print(f"Error listing indexes: {e}")
        return []


def index_exists(index_name: str) -> bool:
    """
    Check if an index exists.

    Args:
        index_name: Name of the index to check.

    Returns:
        True if index exists, False otherwise.
    """
    indexes = list_indexes()
    return any(idx.get("name") == index_name for idx in indexes)


def create_index(index_name: str, wait: bool = True) -> bool:
    """
    Create a new Vectorize index.

    Args:
        index_name: Name of the index to create.
        wait: If True, wait for index creation to complete.

    Returns:
        True if successful, False otherwise.
    """
    if not ACCOUNT_ID or not API_TOKEN:
        print("Error: CF_ACCOUNT_ID and CF_VECTORIZE_API_TOKEN must be set in .env")
        return False

    if index_exists(index_name):
        print(f"Index '{index_name}' already exists")
        return True

    try:
        # Create index using Cloudflare API
        # Note: Vectorize indexes are created with a default configuration
        # The embedding model is specified when uploading documents, not at index creation
        response = requests.post(
            f"{VECTORIZE_API_BASE}/indexes",
            headers={
                "Authorization": f"Bearer {API_TOKEN}",
                "Content-Type": "application/json",
            },
            json={
                "name": index_name,
                "description": f"Product catalog index: {index_name}",
                "config": {
                    "dimensions": 1024,  # bge-large-en-v1.5 produces 1024-dimensional embeddings
                    "metric": "cosine"
                }
            },
        )

        if response.status_code in [200, 201]:
            result = response.json().get("result", {})
            print(f"✓ Successfully created index '{index_name}'")
            if wait:
                print(f"  Index ID: {result.get('id', 'N/A')}")
                print(f"  Status: {result.get('status', 'N/A')}")

            d1_store = D1UniqueStore(
                account_id=ACCOUNT_ID,
                database_id=CF_D1_DATABASE_ID,
                api_token=CF_D1_API_TOKEN,
            )
            if d1_store.configured:
                try:
                    table_name = build_uniques_table_name(index_name)
                    d1_store.ensure_table(table_name)
                    print(f"  D1 uniqueness table ready: {table_name}")
                except Exception as e:
                    print(f"  ⚠️  Could not initialize D1 uniqueness table (non-fatal): {e}")
            else:
                print("  ⚠️  D1 uniqueness table not initialized (missing D1 env vars)")
            return True
        else:
            error_text = response.text
            print(f"✗ Failed to create index: {response.status_code}")
            print(f"  Error: {error_text}")
            return False

    except Exception as e:
        print(f"✗ Error creating index: {e}")
        return False


def delete_index(index_name: str) -> bool:
    """
    Delete an existing Vectorize index.

    Args:
        index_name: Name of the index to delete.

    Returns:
        True if successful, False otherwise.
    """
    if not ACCOUNT_ID or not API_TOKEN:
        print("Error: CF_ACCOUNT_ID and CF_VECTORIZE_API_TOKEN must be set in .env")
        return False

    if not index_exists(index_name):
        print(f"Index '{index_name}' does not exist")
        return False

    try:
        # First, get the index details to find the correct identifier
        indexes = list_indexes()
        matching_index = None
        for idx in indexes:
            if idx.get("name") == index_name:
                matching_index = idx
                break
        
        if not matching_index:
            print(f"Could not find index '{index_name}' in list")
            return False
        
        # Try to find the ID field - Cloudflare API might use different field names
        index_id = matching_index.get("id") or matching_index.get("index_id") or matching_index.get("_id")
        
        # If no ID field found, try using the name directly (some APIs allow this)
        identifier = index_id if index_id else index_name
        
        # Debug: print what we're using
        if not index_id:
            print(f"Note: No ID field found, using index name '{index_name}' for deletion")
            print(f"Available fields: {list(matching_index.keys())}")
        
        response = requests.delete(
            f"{VECTORIZE_API_BASE}/indexes/{identifier}",
            headers={
                "Authorization": f"Bearer {API_TOKEN}",
                "Content-Type": "application/json",
            },
        )

        if response.status_code == 200:
            print(f"✓ Successfully deleted index '{index_name}'")
            return True
        else:
            error_text = response.text
            print(f"✗ Failed to delete index: {response.status_code}")
            print(f"  Error: {error_text}")
            return False

    except Exception as e:
        print(f"✗ Error deleting index: {e}")
        return False


def main():
    """CLI entry point."""
    parser = argparse.ArgumentParser(
        description="Manage Cloudflare Vectorize indexes",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Create index
  python manage_indexes.py --create products-demo-X

  # Delete index
  python manage_indexes.py --delete products-demo-X

  # List all indexes
  python manage_indexes.py --list

  # Check if index exists
  python manage_indexes.py --exists products-demo-X
        """
    )

    parser.add_argument(
        "--create",
        type=str,
        metavar="INDEX_NAME",
        help="Create a new index with the specified name"
    )
    parser.add_argument(
        "--delete",
        type=str,
        metavar="INDEX_NAME",
        help="Delete an existing index"
    )
    parser.add_argument(
        "--list",
        action="store_true",
        help="List all indexes"
    )
    parser.add_argument(
        "--exists",
        type=str,
        metavar="INDEX_NAME",
        help="Check if an index exists"
    )
    parser.add_argument(
        "--no-wait",
        action="store_true",
        help="Don't wait for index creation to complete (only for --create)"
    )

    args = parser.parse_args()

    # Validate that at least one action is specified
    actions = [args.create, args.delete, args.list, args.exists]
    if not any(actions):
        parser.print_help()
        return

    # Execute actions
    if args.create:
        success = create_index(args.create, wait=not args.no_wait)
        exit(0 if success else 1)

    if args.delete:
        success = delete_index(args.delete)
        exit(0 if success else 1)

    if args.list:
        indexes = list_indexes()
        if indexes:
            print("\n" + "="*60)
            print("VECTORIZE INDEXES")
            print("="*60)
            for idx in indexes:
                name = idx.get("name", "Unknown")
                vectors = idx.get("vectorsCount", 0)
                status = idx.get("status", "Unknown")
                print(f"  - {name}: {vectors} vectors (status: {status})")
            print("="*60)
        else:
            print("No indexes found")

    if args.exists:
        exists = index_exists(args.exists)
        if exists:
            print(f"✓ Index '{args.exists}' exists")
            exit(0)
        else:
            print(f"✗ Index '{args.exists}' does not exist")
            exit(1)


if __name__ == "__main__":
    main()

"""
Dutchie GraphQL API Client

Async client for fetching product data from Dutchie's GraphQL API.
Supports pagination, category filtering, and proper error handling.
"""

import os
import asyncio
import json
from typing import Optional, Dict, Any, List, AsyncGenerator
import ssl

import aiohttp
from dotenv import load_dotenv

# Load environment variables
env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
load_dotenv(env_path)
# load_dotenv("../.env")

# Configuration
DUTCHIE_ENDPOINT = "https://plus.dutchie.com/plus/2021-07/graphql"
DEFAULT_RETAILER_ID = "ca181286-eb0d-4b6d-a4d2-2e9c8ea9e446"
DEFAULT_LIMIT = 50
MAX_RETRIES = 3
RETRY_BACKOFF_BASE = 2  # seconds


class DutchieCategory:
    """Category enum values as used in Dutchie API."""
    FLOWER = "FLOWER"
    PRE_ROLLS = "PRE_ROLLS"
    EDIBLES = "EDIBLES"
    VAPORIZERS = "VAPORIZERS"
    CONCENTRATES = "CONCENTRATES"
    CBD = "CBD"
    TOPICALS = "TOPICALS"
    ACCESSORIES = "ACCESSORIES"


class DutchieAPIError(Exception):
    """Base exception for Dutchie API errors."""
    pass


class AuthenticationError(DutchieAPIError):
    """Raised when API authentication fails."""
    pass


class APIError(DutchieAPIError):
    """Raised for general API errors."""
    pass


class DutchieClient:
    """Async GraphQL client for Dutchie API."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        retailer_id: str = DEFAULT_RETAILER_ID
    ):
        """
        Initialize the Dutchie client.

        Args:
            api_key: Bearer token for authentication. If not provided,
                     reads from CANNAVITA_API_KEY environment variable.
            retailer_id: The retailer ID to query products for.
        """
        self.api_key = api_key or os.getenv("CANNAVITA_API_KEY")
        if not self.api_key:
            raise AuthenticationError(
                "API key not provided. Set CANNAVITA_API_KEY in .env or pass api_key parameter."
            )
        self.retailer_id = retailer_id
        self._session: Optional[aiohttp.ClientSession] = None

    @property
    def headers(self) -> Dict[str, str]:
        """Get HTTP headers for API requests."""
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

    async def _get_session(self) -> aiohttp.ClientSession:
        """Get or create an aiohttp session with SSL workaround."""
        if self._session is None or self._session.closed:
            # TODO: fix ssl certificate verification error properly
            ssl_context = ssl.create_default_context()
            ssl_context.check_hostname = False
            ssl_context.verify_mode = ssl.CERT_NONE

            self._session = aiohttp.ClientSession(
                headers=self.headers,
                connector=aiohttp.TCPConnector(ssl=ssl_context)
            )
        return self._session

    async def close(self):
        """Close the HTTP session."""
        if self._session and not self._session.closed:
            await self._session.close()

    async def __aenter__(self):
        """Context manager entry."""
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        await self.close()

    async def _execute_query(
        self,
        query: str,
        variables: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Execute a GraphQL query with error handling and retries.

        Args:
            query: The GraphQL query string.
            variables: Query variables.

        Returns:
            The JSON response from the API.

        Raises:
            AuthenticationError: If API key is invalid.
            APIError: If the request fails after all retries.
        """
        session = await self._get_session()

        for attempt in range(MAX_RETRIES):
            try:
                async with session.post(
                    DUTCHIE_ENDPOINT,
                    json={"query": query, "variables": variables},
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as response:
                    if response.status == 401:
                        raise AuthenticationError("Invalid API key - received 401 Unauthorized")

                    if response.status == 429:
                        # Rate limited - exponential backoff
                        wait_time = RETRY_BACKOFF_BASE ** attempt
                        print(f"Rate limited, waiting {wait_time}s before retry...")
                        await asyncio.sleep(wait_time)
                        continue

                    if response.status >= 400:
                        error_text = await response.text()
                        raise APIError(f"API error {response.status}: {error_text}")

                    result = await response.json()

                    # Check for GraphQL errors
                    if "errors" in result:
                        errors = result["errors"]
                        error_messages = [e.get("message", str(e)) for e in errors]
                        raise APIError(f"GraphQL errors: {'; '.join(error_messages)}")

                    return result

            except aiohttp.ClientError as e:
                if attempt == MAX_RETRIES - 1:
                    raise APIError(f"API request failed after {MAX_RETRIES} attempts: {e}")
                wait_time = RETRY_BACKOFF_BASE ** attempt
                print(f"Request failed ({e}), retrying in {wait_time}s...")
                await asyncio.sleep(wait_time)

        raise APIError("Max retries exceeded")

    async def fetch_products_by_category(
        self,
        category: Optional[str] = None,
        limit: int = DEFAULT_LIMIT,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """
        Fetch products, optionally filtered by category.

        Args:
            category: Optional category filter (e.g., "EDIBLES", "FLOWER").
                      Can be a string or an Enum with a .value attribute.
            limit: Maximum number of products to fetch per request.
            offset: Starting offset for pagination.

        Returns:
            List of product dictionaries.
        """
        # Convert Enum to string if needed
        category_str = None
        if category is not None:
            # Handle both Enum and string inputs
            if hasattr(category, 'value'):
                category_str = category.value  # It's an Enum
            else:
                category_str = str(category).upper()  # It's a string

        # Build query with category embedded directly (not as variable)
        # This is because Dutchie API uses enum values directly, not typed variables
        query = self._build_menu_query(category=category_str)
        variables = {
            "retailerId": self.retailer_id,
            "limit": limit,
            "offset": offset
        }

        result = await self._execute_query(query, variables)

        # Navigate the response structure
        data = result.get("data", {})
        menu = data.get("menu", {})
        products = menu.get("products", [])

        return products

    async def fetch_all_products_paginated(
        self,
        category: Optional[str] = None,
        offset: int = 0,
        total_limit: Optional[int] = None,
        batch_size: int = DEFAULT_LIMIT
    ) -> AsyncGenerator[List[Dict[str, Any]], None]:
        """
        Fetch products with pagination (yields batches).

        Args:
            category: Optional category filter.
            offset: Starting offset for pagination (default 0).
            total_limit: Optional total limit of products to fetch. If None, fetches all.
            batch_size: Batch size for each API request (default 50).

        Yields:
            Lists of product dictionaries (one batch per yield).
        """
        current_offset = offset
        total_fetched = 0

        while True:
            # Calculate how many to fetch in this batch
            if total_limit is not None:
                remaining = total_limit - total_fetched
                if remaining <= 0:
                    break
                batch_limit = min(batch_size, remaining)
            else:
                batch_limit = batch_size

            products = await self.fetch_products_by_category(
                category=category,
                limit=batch_limit,
                offset=current_offset
            )

            if not products:
                break

            yield products
            total_fetched += len(products)
            current_offset += len(products)

            # If we got fewer products than requested, we've reached the end
            if len(products) < batch_limit:
                break

            # Stop if we've reached the total limit
            if total_limit is not None and total_fetched >= total_limit:
                break

        print(f"Total products fetched: {total_fetched}")

    async def fetch_all_products(
        self,
        category: Optional[str] = None,
        offset: int = 0,
        total_limit: Optional[int] = None,
        batch_size: int = DEFAULT_LIMIT
    ) -> List[Dict[str, Any]]:
        """
        Fetch all products as a single list.

        Args:
            category: Optional category filter.
            offset: Starting offset for pagination (default 0).
            total_limit: Optional total limit of products to fetch. If None, fetches all.
            batch_size: Batch size for each API request (default 50).

        Returns:
            List of all product dictionaries.
        """
        all_products = []
        async for batch in self.fetch_all_products_paginated(
            category=category,
            offset=offset,
            total_limit=total_limit,
            batch_size=batch_size
        ):
            all_products.extend(batch)
        return all_products

    def _build_menu_query(self, category: Optional[str] = None) -> str:
        """
        Build the menu query with all fragments.

        Args:
            category: Optional category to filter by (e.g., "EDIBLES", "FLOWER").
                      Will be embedded directly as enum value in query.

        Returns:
            Complete GraphQL query string.
        """
        # Filter and pagination arguments for the query
        # NOTE: Category is embedded directly as enum value (no quotes, no variable)
        # This is because Dutchie API expects enum values like EDIBLES, not "EDIBLES"
        filter_arg = f"\n    filter: {{ category: {category} }}" if category else ""
        pagination_arg = "\n    pagination: { offset: $offset, limit: $limit }"

        return f'''
fragment terpeneFragment on Terpene {{
  aliasList
  aromas
  description
  effects
  id
  name
  potentialHealthBenefits
  unitSymbol
}}

fragment activeTerpeneFragment on ActiveTerpene {{
  id
  terpene {{
    ...terpeneFragment
  }}
  name
  terpeneId
  unit
  unitSymbol
  value
}}

fragment activeCannabinoidFragment on ActiveCannabinoid {{
  cannabinoidId
  cannabinoid {{
    description
    id
    name
  }}
  unit
  value
}}

fragment variantFragment on ProductVariant {{
  id
  option
  priceMed
  priceRec
  specialPriceMed
  specialPriceRec
  quantity
  flowerEquivalent {{
    unit
    value
  }}
}}

fragment productFragment on Product {{
  brand {{
    description
    id
    imageUrl
    name
  }}
  category
  description
  descriptionHtml
  effects
  enterpriseProductId
  id
  productBatchId
  image
  images {{
    id
    url
    label
    description
  }}
  menuTypes
  name
  slug
  posId
  potencyCbd {{
    formatted
    range
    unit
  }}
  potencyThc {{
    formatted
    range
    unit
  }}
  posMetaData {{
    id
    category
    sku
  }}
  staffPick
  strainType
  subcategory
  tags
  variants {{
    ...variantFragment
  }}
  terpenes {{
    ...activeTerpeneFragment
  }}
  cannabinoids {{
    ...activeCannabinoidFragment
  }}
}}

query MenuQuery($retailerId: ID!, $limit: Int!, $offset: Int!) {{
  menu(
    retailerId: $retailerId{filter_arg}{pagination_arg}
  ) {{
    products {{
      ...productFragment
    }}
  }}
}}
'''


# Convenience function for simple usage
async def fetch_products(
    category: Optional[str] = None,
    api_key: Optional[str] = None,
    retailer_id: str = DEFAULT_RETAILER_ID
) -> List[Dict[str, Any]]:
    """
    Convenience function to fetch all products.

    Args:
        category: Optional category filter.
        api_key: Optional API key (uses env var if not provided).
        retailer_id: Retailer ID.

    Returns:
        List of all product dictionaries.
    """
    async with DutchieClient(api_key=api_key, retailer_id=retailer_id) as client:
        return await client.fetch_all_products(category=category, offset=0, total_limit=None)


# Test function
async def test_connection():
    """Test the API connection by fetching a few products."""
    try:
        client = DutchieClient()
        products = await client.fetch_products_by_category(category="EDIBLES", limit=3)
        print(f"Successfully fetched {len(products)} EDIBLES products")

        if products:
            print(f"\nFirst product: {products[0].get('name', 'Unknown')}")
            print(f"Category: {products[0].get('category', 'Unknown')}")
            print(f"Subcategory: {products[0].get('subcategory', 'Unknown')}")

        await client.close()
        return True

    except AuthenticationError as e:
        print(f"Authentication failed: {e}")
        return False
    except APIError as e:
        print(f"API error: {e}")
        return False
    except Exception as e:
        print(f"Unexpected error: {e}")
        return False


if __name__ == "__main__":
    # Run test when executed directly
    print("Testing Dutchie API connection...")
    success = asyncio.run(test_connection())
    if success:
        print("\nAPI connection test passed!")
    else:
        print("\nAPI connection test failed!")

"""
Dutchie GraphQL API Client

Async client for fetching product data from Dutchie's GraphQL API.
Supports pagination, category filtering, and proper error handling.
"""

import asyncio
import os
from typing import Any, AsyncGenerator, Dict, List, Optional

import certifi
import httpx
from dotenv import load_dotenv


env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
load_dotenv(env_path)

DUTCHIE_ENDPOINT = "https://plus.dutchie.com/plus/2021-07/graphql"
DEFAULT_RETAILER_ID = "ca181286-eb0d-4b6d-a4d2-2e9c8ea9e446"
DEFAULT_LIMIT = 50
MAX_RETRIES = 3
RETRY_BACKOFF_BASE = 2


class DutchieCategory:
    FLOWER = "FLOWER"
    PRE_ROLLS = "PRE_ROLLS"
    EDIBLES = "EDIBLES"
    VAPORIZERS = "VAPORIZERS"
    CONCENTRATES = "CONCENTRATES"
    CBD = "CBD"
    TOPICALS = "TOPICALS"
    ACCESSORIES = "ACCESSORIES"


class DutchieAPIError(Exception):
    pass


class AuthenticationError(DutchieAPIError):
    pass


class APIError(DutchieAPIError):
    pass


class DutchieClient:
    """Async GraphQL client for Dutchie."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        retailer_id: str = DEFAULT_RETAILER_ID,
        ssl_verify: bool = True,
    ) -> None:
        self.api_key = api_key or os.getenv("CANNAVITA_API_KEY")
        if not self.api_key:
            raise AuthenticationError(
                "API key not provided. Set CANNAVITA_API_KEY in .env or pass api_key parameter."
            )
        self.retailer_id = retailer_id
        self.ssl_verify = ssl_verify
        self._client: Optional[httpx.AsyncClient] = None

    @property
    def headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None:
            verify_value: bool | str = certifi.where() if self.ssl_verify else False
            self._client = httpx.AsyncClient(
                headers=self.headers,
                timeout=30.0,
                verify=verify_value,
            )
        return self._client

    async def close(self) -> None:
        if self._client is not None:
            await self._client.aclose()
            self._client = None

    async def __aenter__(self) -> "DutchieClient":
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None:
        await self.close()

    async def _execute_query(self, query: str, variables: Dict[str, Any]) -> Dict[str, Any]:
        client = await self._get_client()

        for attempt in range(MAX_RETRIES):
            try:
                response = await client.post(
                    DUTCHIE_ENDPOINT,
                    json={"query": query, "variables": variables},
                )

                if response.status_code == 401:
                    raise AuthenticationError("Invalid API key - received 401 Unauthorized")

                if response.status_code == 429:
                    wait_time = RETRY_BACKOFF_BASE ** attempt
                    print(f"Rate limited, waiting {wait_time}s before retry...")
                    await asyncio.sleep(wait_time)
                    continue

                if response.status_code >= 400:
                    raise APIError(f"API error {response.status_code}: {response.text}")

                result = response.json()
                if "errors" in result:
                    error_messages = [entry.get("message", str(entry)) for entry in result["errors"]]
                    raise APIError(f"GraphQL errors: {'; '.join(error_messages)}")
                return result

            except httpx.HTTPError as exc:
                if attempt == MAX_RETRIES - 1:
                    raise APIError(f"API request failed after {MAX_RETRIES} attempts: {exc}") from exc
                wait_time = RETRY_BACKOFF_BASE ** attempt
                print(f"Request failed ({exc}), retrying in {wait_time}s...")
                await asyncio.sleep(wait_time)

        raise APIError("Max retries exceeded")

    async def fetch_products_by_category(
        self,
        category: Optional[str] = None,
        subcategory: Optional[str] = None,
        strain_type: Optional[str] = None,
        limit: int = DEFAULT_LIMIT,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        category_str = category.value if hasattr(category, "value") else (str(category).upper() if category else None)
        subcategory_str = str(subcategory).upper() if subcategory else None
        strain_type_str = str(strain_type).upper() if strain_type else None

        variables = {
            "retailerId": self.retailer_id,
            "pagination": {
                "limit": limit,
                "offset": offset,
            },
            "filter": {
                key: value
                for key, value in {
                    "category": category_str,
                    "subcategory": subcategory_str,
                    "strainType": strain_type_str,
                }.items()
                if value is not None
            }
            or None,
        }

        result = await self._execute_query(self._build_menu_query(), variables)
        data = result.get("data", {})
        menu = data.get("menu", {})
        return menu.get("products", [])

    async def fetch_all_products_paginated(
        self,
        category: Optional[str] = None,
        subcategory: Optional[str] = None,
        strain_type: Optional[str] = None,
        offset: int = 0,
        total_limit: Optional[int] = None,
        batch_size: int = DEFAULT_LIMIT,
    ) -> AsyncGenerator[List[Dict[str, Any]], None]:
        current_offset = offset
        remaining = total_limit

        while True:
            current_limit = batch_size if remaining is None else min(batch_size, remaining)
            batch = await self.fetch_products_by_category(
                category=category,
                subcategory=subcategory,
                strain_type=strain_type,
                limit=current_limit,
                offset=current_offset,
            )
            if not batch:
                return

            yield batch

            fetched = len(batch)
            current_offset += fetched

            if remaining is not None:
                remaining -= fetched
                if remaining <= 0:
                    return

            if fetched < current_limit:
                return

    def _build_menu_query(self) -> str:
        return f"""
        query MenuProducts($retailerId: ID!, $pagination: Pagination!, $filter: MenuFilter) {{
          menu(retailerId: $retailerId, pagination: $pagination, filter: $filter) {{
            products {{
              id
              name
              category
              subcategory
              strainType
              description
              brand {{
                name
                description
              }}
              effects
              potencyThc {{
                formatted
                range
                unit
              }}
              potencyCbd {{
                formatted
                range
                unit
              }}
              variants {{
                id
                priceMed
                priceRec
                specialPriceMed
                specialPriceRec
                option
                quantity
              }}
              images {{
                url
              }}
              slug
              staffPick
              terpenes {{
                value
                unitSymbol
                terpene {{
                  id
                  name
                  aromas
                  effects
                  potentialHealthBenefits
                  description
                }}
              }}
              cannabinoids {{
                value
                unit
                cannabinoid {{
                  id
                  name
                  description
                }}
              }}
            }}
          }}
        }}
        """

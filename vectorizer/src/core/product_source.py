from __future__ import annotations

import json
import os
from typing import Any, AsyncGenerator, Dict, List

from dutchie_client import DutchieClient

from .config import DutchieConfig, SyncOptions


def load_products_from_file(category: str | None = None) -> List[Dict[str, Any]]:
    file_mapping = {
        "edibles": "schema/edibles.json",
        "EDIBLES": "schema/edibles.json",
    }
    if category:
        file_path = file_mapping.get(category)
        if file_path:
            absolute_path = os.path.join(os.path.dirname(__file__), "..", file_path)
            try:
                with open(absolute_path, "r") as handle:
                    return json.load(handle)
            except FileNotFoundError:
                pass

    fallback_path = os.path.join(os.path.dirname(__file__), "..", "demo_products_1.json")
    try:
        with open(fallback_path, "r") as handle:
            return json.load(handle)
    except FileNotFoundError:
        return []


async def iter_product_batches(
    options: SyncOptions,
    dutchie_config: DutchieConfig,
) -> AsyncGenerator[List[Dict[str, Any]], None]:
    if not options.use_api:
        products = load_products_from_file(options.category)
        if options.offset:
            products = products[options.offset :]
        if options.limit is not None:
            products = products[: options.limit]
        if products:
            yield products
        return

    client = DutchieClient(
        api_key=dutchie_config.api_key,
        retailer_id=dutchie_config.retailer_id,
        ssl_verify=dutchie_config.ssl_verify,
    )
    try:
        async for batch in client.fetch_all_products_paginated(
            category=options.category,
            subcategory=options.subcategory,
            strain_type=options.strain_type,
            offset=options.offset,
            total_limit=options.limit,
        ):
            yield batch
    finally:
        await client.close()

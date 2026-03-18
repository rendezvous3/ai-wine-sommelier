from __future__ import annotations

from typing import Any, AsyncGenerator, Dict, List

from dutchie_client import DutchieClient

from .config import DutchieConfig, SyncOptions


async def iter_product_batches(
    options: SyncOptions,
    dutchie_config: DutchieConfig,
) -> AsyncGenerator[List[Dict[str, Any]], None]:
    if not options.use_api:
        raise RuntimeError(
            "Local file product sources have been removed. "
            "Vectorizer syncs must read from the Dutchie API."
        )

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

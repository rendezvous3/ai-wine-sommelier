"""Async CLI for Cloudflare Vectorize index lifecycle operations."""

import argparse
import asyncio

from core.cloudflare_api import CloudflareApiClient
from core.config import cloudflare_config_from_source, load_local_env
from d1_uniques import D1UniqueStore, build_uniques_table_name


async def list_indexes(api: CloudflareApiClient) -> None:
    indexes = await api.list_indexes()
    if not indexes:
        print("No indexes found.")
        return
    for index in indexes:
        print(
            f"- {index.get('name', 'Unknown')}: "
            f"{index.get('vectorsCount', 0)} vectors"
        )


async def create_index(
    api: CloudflareApiClient,
    d1_store: D1UniqueStore,
    index_name: str,
    wait: bool,
) -> None:
    if await api.index_exists(index_name):
        print(f"Index '{index_name}' already exists")
        return

    result = await api.create_index(
        index_name=index_name,
        description=f"Product catalog index: {index_name}",
        wait=wait,
    )
    print(f"Successfully created index '{index_name}'")
    if result.get("id"):
        print(f"Index ID: {result['id']}")

    if d1_store.configured:
        table_name = build_uniques_table_name(index_name)
        await d1_store.ensure_table(table_name)
        print(f"D1 uniqueness table ready: {table_name}")


async def delete_index(api: CloudflareApiClient, index_name: str) -> None:
    indexes = await api.list_indexes()
    matching_index = next((index for index in indexes if index.get("name") == index_name), None)
    if not matching_index:
        print(f"Index '{index_name}' does not exist")
        return
    await api.delete_index(str(matching_index.get("id") or index_name))
    print(f"Successfully deleted index '{index_name}'")


async def async_main() -> None:
    load_local_env()
    parser = argparse.ArgumentParser(description="Manage Cloudflare Vectorize indexes")
    parser.add_argument("--create", type=str, metavar="INDEX_NAME", help="Create a new index")
    parser.add_argument("--delete", type=str, metavar="INDEX_NAME", help="Delete an index")
    parser.add_argument("--list", action="store_true", help="List all indexes")
    parser.add_argument("--exists", type=str, metavar="INDEX_NAME", help="Check whether an index exists")
    parser.add_argument("--no-wait", action="store_true", help="Do not wait for create mutation completion")
    args = parser.parse_args()

    cloudflare = cloudflare_config_from_source()
    api = CloudflareApiClient(cloudflare)
    d1_store = D1UniqueStore(
        account_id=cloudflare.account_id,
        database_id=cloudflare.d1_database_id,
        api_token=cloudflare.resolved_d1_token,
    )

    if args.list:
        await list_indexes(api)
        return
    if args.exists:
        print("exists" if await api.index_exists(args.exists) else "missing")
        return
    if args.create:
        await create_index(api, d1_store, args.create, wait=not args.no_wait)
        return
    if args.delete:
        await delete_index(api, args.delete)
        return

    parser.print_help()


def main() -> None:
    asyncio.run(async_main())


if __name__ == "__main__":
    main()

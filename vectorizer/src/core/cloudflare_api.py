from __future__ import annotations

import asyncio
import json
from typing import Any, Dict, Iterable, List, Optional

import httpx

from .config import CloudflareConfig


class CloudflareApiClient:
    """Async Cloudflare client for embeddings, Vectorize, and index management."""

    def __init__(self, config: CloudflareConfig) -> None:
        self.config = config
        self.base_url = f"https://api.cloudflare.com/client/v4/accounts/{config.account_id}"

    @property
    def vectorize_headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self.config.resolved_vectorize_token}",
            "Content-Type": "application/json",
        }

    @property
    def ai_headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self.config.resolved_ai_token}",
            "Content-Type": "application/json",
        }

    def _vectorize_url(self, index_name: str, endpoint: str) -> str:
        return f"{self.base_url}/vectorize/v2/indexes/{index_name}/{endpoint}"

    async def list_indexes(self) -> List[Dict[str, Any]]:
        async with httpx.AsyncClient(timeout=self.config.timeout_seconds) as client:
            response = await client.get(
                f"{self.base_url}/vectorize/v2/indexes",
                headers=self.vectorize_headers,
            )
            response.raise_for_status()
            return response.json().get("result", [])

    async def index_exists(self, index_name: str) -> bool:
        indexes = await self.list_indexes()
        return any(index.get("name") == index_name for index in indexes)

    async def get_index_info(self, index_name: str) -> Dict[str, Any]:
        async with httpx.AsyncClient(timeout=self.config.timeout_seconds) as client:
            response = await client.get(
                self._vectorize_url(index_name, "info"),
                headers=self.vectorize_headers,
            )
            response.raise_for_status()
            return response.json().get("result", {})

    async def wait_for_mutation(
        self,
        index_name: str,
        mutation_id: Optional[str],
        wait_seconds: int = 2,
    ) -> None:
        if not mutation_id:
            return
        await asyncio.sleep(wait_seconds)
        while True:
            info = await self.get_index_info(index_name)
            if info.get("processedUpToMutation") == mutation_id:
                return
            await asyncio.sleep(wait_seconds)

    async def create_index(
        self,
        index_name: str,
        dimensions: int = 1024,
        metric: str = "cosine",
        description: Optional[str] = None,
        wait: bool = False,
    ) -> Dict[str, Any]:
        payload: Dict[str, Any] = {
            "name": index_name,
            "config": {
                "dimensions": dimensions,
                "metric": metric,
            },
        }
        if description:
            payload["description"] = description

        async with httpx.AsyncClient(timeout=self.config.timeout_seconds) as client:
            response = await client.post(
                f"{self.base_url}/vectorize/v2/indexes",
                headers=self.vectorize_headers,
                json=payload,
            )
            response.raise_for_status()
            result = response.json().get("result", {})
        if wait:
            await self.wait_for_mutation(index_name, result.get("mutationId"))
        return result

    async def delete_index(self, index_name: str) -> None:
        async with httpx.AsyncClient(timeout=self.config.timeout_seconds) as client:
            response = await client.delete(
                f"{self.base_url}/vectorize/v2/indexes/{index_name}",
                headers=self.vectorize_headers,
            )
            response.raise_for_status()

    async def embed_texts(self, texts: Iterable[str], batch_size: int = 50) -> List[List[float]]:
        clean_texts = [str(text).replace("\n", " ") for text in texts]
        embeddings: List[List[float]] = []
        if not clean_texts:
            return embeddings

        if self.config.ai_gateway:
            inference_url = (
                f"https://gateway.ai.cloudflare.com/v1/"
                f"{self.config.account_id}/{self.config.ai_gateway}/workers-ai/run/{self.config.model_name}"
            )
        else:
            inference_url = f"{self.base_url}/ai/run/{self.config.model_name}"

        async with httpx.AsyncClient(timeout=self.config.timeout_seconds) as client:
            for start in range(0, len(clean_texts), batch_size):
                batch = clean_texts[start : start + batch_size]
                response = await client.post(
                    inference_url,
                    headers=self.ai_headers,
                    json={"text": batch},
                )
                response.raise_for_status()
                embeddings.extend(response.json()["result"]["data"])
        return embeddings

    async def upsert_vectors(
        self,
        index_name: str,
        texts: List[str],
        metadatas: List[Dict[str, Any]],
        ids: List[str],
        wait: bool = False,
    ) -> List[str]:
        if not texts:
            return []

        embeddings = await self.embed_texts(texts)
        vectors = []
        for vector_id, values, metadata in zip(ids, embeddings, metadatas):
            vectors.append(
                {
                    "id": str(vector_id),
                    "values": values,
                    "metadata": metadata,
                }
            )

        ndjson_payload = "\n".join(json.dumps(vector) for vector in vectors)
        headers = self.vectorize_headers.copy()
        headers["Content-Type"] = "application/x-ndjson"

        async with httpx.AsyncClient(timeout=self.config.timeout_seconds) as client:
            response = await client.post(
                self._vectorize_url(index_name, "upsert"),
                headers=headers,
                content=ndjson_payload.encode("utf-8"),
            )
            response.raise_for_status()
            mutation_id = response.json().get("result", {}).get("mutationId")

        if wait:
            await self.wait_for_mutation(index_name, mutation_id)

        return ids

    async def delete_vectors(
        self,
        index_name: str,
        ids: List[str],
        wait: bool = False,
    ) -> None:
        if not ids:
            return
        async with httpx.AsyncClient(timeout=self.config.timeout_seconds) as client:
            response = await client.post(
                self._vectorize_url(index_name, "delete_by_ids"),
                headers=self.vectorize_headers,
                json={"ids": [str(value) for value in ids]},
            )
            response.raise_for_status()
            mutation_id = response.json().get("result", {}).get("mutationId")

        if wait:
            await self.wait_for_mutation(index_name, mutation_id)


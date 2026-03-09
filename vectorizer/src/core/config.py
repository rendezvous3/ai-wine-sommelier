from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Any, Mapping, Optional

from dotenv import load_dotenv


DEFAULT_MODEL_WORKERSAI = "@cf/baai/bge-large-en-v1.5"
DEFAULT_RETAILER_ID = "ca181286-eb0d-4b6d-a4d2-2e9c8ea9e446"


def load_local_env() -> None:
    """Load vectorizer-local .env settings for CLI runs."""
    env_path = os.path.join(os.path.dirname(__file__), "..", "..", ".env")
    load_dotenv(env_path)


def _read_value(source: Any, key: str) -> Optional[str]:
    if source is None:
        return None
    if isinstance(source, Mapping):
        value = source.get(key)
    else:
        value = getattr(source, key, None)
    if value is None:
        return None
    string_value = str(value).strip()
    return string_value if string_value else None


@dataclass(frozen=True)
class CloudflareConfig:
    account_id: str
    api_token: str
    vectorize_api_token: Optional[str]
    ai_api_token: Optional[str]
    d1_database_id: Optional[str]
    d1_api_token: Optional[str]
    model_name: str = DEFAULT_MODEL_WORKERSAI
    ai_gateway: Optional[str] = None
    timeout_seconds: float = 60.0

    @property
    def resolved_vectorize_token(self) -> str:
        return self.vectorize_api_token or self.api_token

    @property
    def resolved_ai_token(self) -> str:
        return self.ai_api_token or self.api_token

    @property
    def resolved_d1_token(self) -> str:
        return self.d1_api_token or self.api_token

    @property
    def d1_configured(self) -> bool:
        return bool(self.account_id and self.d1_database_id and self.resolved_d1_token)


@dataclass(frozen=True)
class DutchieConfig:
    api_key: Optional[str]
    retailer_id: str = DEFAULT_RETAILER_ID
    ssl_verify: bool = True


@dataclass(frozen=True)
class SyncOptions:
    index_name: str
    category: Optional[str] = None
    subcategory: Optional[str] = None
    strain_type: Optional[str] = None
    offset: int = 0
    limit: Optional[int] = 50
    dry_run: bool = True
    use_api: bool = True
    min_quantity: Optional[int] = None
    use_d1_dedup: bool = True
    trigger_source: str = "local"


@dataclass(frozen=True)
class ReconcileOptions:
    index_name: str
    stale_hours: int = 48
    max_delete: int = 5000
    batch_size: int = 500
    dry_run: bool = False


@dataclass(frozen=True)
class SyncCycleOptions:
    sync: SyncOptions
    reconcile: ReconcileOptions


def cloudflare_config_from_source(source: Any = None) -> CloudflareConfig:
    source = source or os.environ
    account_id = _read_value(source, "CF_ACCOUNT_ID") or ""
    api_token = (
        _read_value(source, "CF_API_TOKEN")
        or _read_value(source, "CF_VECTORIZE_API_TOKEN")
        or ""
    )
    return CloudflareConfig(
        account_id=account_id,
        api_token=api_token,
        vectorize_api_token=_read_value(source, "CF_VECTORIZE_API_TOKEN"),
        ai_api_token=_read_value(source, "CF_AI_API_TOKEN"),
        d1_database_id=_read_value(source, "CF_D1_DATABASE_ID"),
        d1_api_token=_read_value(source, "CF_D1_API_TOKEN"),
        model_name=_read_value(source, "CF_EMBED_MODEL") or DEFAULT_MODEL_WORKERSAI,
        ai_gateway=_read_value(source, "AI_GATEWAY"),
    )


def dutchie_config_from_source(source: Any = None) -> DutchieConfig:
    source = source or os.environ
    ssl_verify_value = (_read_value(source, "VECTORIZER_SSL_VERIFY") or "true").lower()
    return DutchieConfig(
        api_key=_read_value(source, "CANNAVITA_API_KEY"),
        retailer_id=_read_value(source, "DUTCHIE_RETAILER_ID") or DEFAULT_RETAILER_ID,
        ssl_verify=ssl_verify_value != "false",
    )


def parse_limit_value(value: Any) -> Optional[int]:
    if value is None:
        return None
    if isinstance(value, int):
        if value <= 0:
            raise ValueError("limit must be greater than 0")
        return value
    normalized = str(value).strip().lower()
    if normalized in {"none", "all", "unlimited", ""}:
        return None
    parsed = int(normalized)
    if parsed <= 0:
        raise ValueError("limit must be greater than 0")
    return parsed


def parse_optional_int(value: Any) -> Optional[int]:
    if value is None:
        return None
    normalized = str(value).strip()
    if not normalized:
        return None
    return int(normalized)

from __future__ import annotations

from dataclasses import dataclass, field, asdict
from typing import Any, Dict, List, Optional


@dataclass
class SyncSummary:
    index_name: str
    mode: str
    fetched_count: int = 0
    transformed_count: int = 0
    document_count: int = 0
    uploaded_count: int = 0
    transform_errors: int = 0
    low_stock_excluded: int = 0
    duplicate_id_excluded: int = 0
    duplicate_name_excluded: int = 0
    d1_existing_ids_allowed: int = 0
    d1_name_excluded: int = 0
    missing_id_excluded: int = 0
    sample_document: Optional[Dict[str, Any]] = None
    errors: List[Dict[str, Any]] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class ReconcileSummary:
    index_name: str
    stale_hours: int
    candidate_stale_ids: int = 0
    deleted_vectors: int = 0
    deleted_d1_rows: int = 0
    failed_batches: int = 0
    sample_stale_ids: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class SyncCycleSummary:
    sync: SyncSummary
    reconcile: ReconcileSummary

    def to_dict(self) -> Dict[str, Any]:
        return {
            "sync": self.sync.to_dict(),
            "reconcile": self.reconcile.to_dict(),
        }


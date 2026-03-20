from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class IndexingSummary:
    new_count: int = 0
    updated_count: int = 0

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class ExclusionSummary:
    low_stock_count: int = 0
    transform_error_count: int = 0
    missing_id_count: int = 0
    duplicate_id_count: int = 0
    duplicate_name_count: int = 0
    d1_name_conflict_count: int = 0

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class RemovalSummary:
    index_name: str
    missing_from_fetch_count: int = 0
    low_stock_removed_count: int = 0
    removed_count: int = 0
    deleted_vectors: int = 0
    deleted_d1_rows: int = 0
    failed_removal_count: int = 0
    sample_removed_ids: List[str] = field(default_factory=list)
    sample_removed_details: List[Dict[str, Any]] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class RunEvent:
    event_type: str
    reason: str
    status: str
    disposition: Optional[str] = None
    stage: Optional[str] = None
    severity: Optional[str] = None
    reason_code: Optional[str] = None
    reason_label: Optional[str] = None
    product_id: Optional[str] = None
    raw_name: Optional[str] = None
    normalized_name: Optional[str] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    previous_state: Optional[Dict[str, Any]] = None
    current_state: Optional[Dict[str, Any]] = None
    source_snapshot: Optional[Dict[str, Any]] = None
    normalized_snapshot: Optional[Dict[str, Any]] = None
    field_records: List[Dict[str, Any]] = field(default_factory=list)
    details: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        payload = asdict(self)
        payload["disposition"] = payload.get("disposition") or self._default_disposition()
        payload["reason_code"] = payload.get("reason_code") or payload.get("reason")
        payload["reason_label"] = payload.get("reason_label") or payload.get("reason_code") or payload.get("reason")
        payload["previous_state_json"] = payload.pop("previous_state")
        payload["current_state_json"] = payload.pop("current_state")
        payload["source_snapshot_json"] = payload.pop("source_snapshot")
        payload["normalized_snapshot_json"] = payload.pop("normalized_snapshot")
        payload["details_json"] = payload.pop("details")
        return payload

    def _default_disposition(self) -> str:
        return {
            "indexed_new": "added",
            "indexed_updated": "updated",
            "removed": "removed",
            "excluded": "excluded",
            "warning": "warning",
        }.get(self.event_type, self.event_type)


@dataclass
class RunProductSnapshot:
    product_id: str
    raw_name: Optional[str] = None
    normalized_name: Optional[str] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    source_seen: bool = False
    active_after_run: bool = False
    disposition: str = "unchanged"
    reason_code: Optional[str] = None
    reason_label: Optional[str] = None
    status: str = "applied"
    quantity: Optional[int] = None
    previous_quantity: Optional[int] = None
    price: Optional[float] = None
    previous_price: Optional[float] = None
    changed_fields: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class SyncPipelineResult:
    summary: "SyncSummary"
    fetched_ids_raw: List[str] = field(default_factory=list)
    active_rows_before: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    low_stock_active_ids: List[str] = field(default_factory=list)
    events: List[RunEvent] = field(default_factory=list)
    product_snapshots: Dict[str, Dict[str, Any]] = field(default_factory=dict)


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
    audit_warning_count: int = 0
    audit_hard_omit_count: int = 0
    source_issue_count: int = 0
    transform_issue_count: int = 0
    potency_anomaly_count: int = 0
    missing_metadata_count: int = 0
    sample_document: Optional[Dict[str, Any]] = None
    errors: List[Dict[str, Any]] = field(default_factory=list)
    indexing: IndexingSummary = field(default_factory=IndexingSummary)
    exclusions: ExclusionSummary = field(default_factory=ExclusionSummary)
    quality_audit: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class ReconcileSummary:
    index_name: str
    removal_mode: str = "explicit_diff"
    candidate_removed_ids: int = 0
    deleted_vectors: int = 0
    deleted_d1_rows: int = 0
    failed_batches: int = 0
    sample_removed_ids: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class SyncCycleSummary:
    sync: SyncSummary
    removal: RemovalSummary
    reconcile: ReconcileSummary

    def to_dict(self) -> Dict[str, Any]:
        return {
            "sync": self.sync.to_dict(),
            "indexing": self.sync.indexing.to_dict(),
            "exclusions": self.sync.exclusions.to_dict(),
            "removal": self.removal.to_dict(),
            "reconcile": self.reconcile.to_dict(),
        }

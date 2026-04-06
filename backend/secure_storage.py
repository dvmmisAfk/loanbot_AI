import json
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

from cryptography.fernet import Fernet

SECURE_UPLOAD_ROOT = Path(__file__).resolve().parent / "secure_uploads"
FERNET_KEY_PATH = SECURE_UPLOAD_ROOT / ".fernet.key"


def _ensure_storage_root() -> None:
    SECURE_UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)


def _load_fernet_key() -> bytes:
    env_key = os.getenv("LOANBOT_FERNET_KEY")
    if env_key:
        return env_key.encode("utf-8")

    _ensure_storage_root()
    if FERNET_KEY_PATH.exists():
        return FERNET_KEY_PATH.read_bytes()

    key = Fernet.generate_key()
    FERNET_KEY_PATH.write_bytes(key)
    return key


def _safe_extension(filename: Optional[str], fallback: str) -> str:
    extension = Path(filename or "").suffix.lower()
    if not extension or len(extension) > 10:
        return fallback
    return extension


def _default_extension_for_kind(kind: str) -> str:
    if kind in {"aadhaar", "signature"}:
        return ".jpg"
    return ".webm"


def store_secure_artifact(
    session_id: str,
    kind: str,
    payload: bytes,
    filename: Optional[str],
    content_type: Optional[str],
    metadata: Optional[dict[str, Any]] = None,
) -> dict[str, str]:
    _ensure_storage_root()

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    session_dir = SECURE_UPLOAD_ROOT / session_id
    session_dir.mkdir(parents=True, exist_ok=True)

    fallback_extension = _default_extension_for_kind(kind)
    extension = _safe_extension(filename, fallback_extension)
    artifact_name = f"{kind}-{timestamp}-{uuid.uuid4().hex[:8]}"
    encrypted_path = session_dir / f"{artifact_name}{extension}.enc"
    metadata_path = session_dir / f"{artifact_name}.json"

    encrypted_payload = Fernet(_load_fernet_key()).encrypt(payload)
    encrypted_path.write_bytes(encrypted_payload)

    artifact_metadata = {
        "session_id": session_id,
        "kind": kind,
        "stored_at": timestamp,
        "original_filename": filename,
        "content_type": content_type,
    }
    if metadata:
        artifact_metadata.update(metadata)

    metadata_path.write_text(
        json.dumps(artifact_metadata, ensure_ascii=True, indent=2),
        encoding="utf-8",
    )

    return {
        "path": str(encrypted_path),
        "metadata_path": str(metadata_path),
    }

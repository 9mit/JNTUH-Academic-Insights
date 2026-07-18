"""Signed share token utilities (JWT-style: base64url(payload).base64url(sig))."""
import base64
import hashlib
import hmac
import json
import os
import time
from typing import Any, Dict, Optional

from backend.security import DEV_SHARE_SECRET, is_production

SHARE_TTL_SECONDS = int(os.environ.get("SHARE_TOKEN_TTL", "604800"))  # 7 days
MAX_SHARE_PAYLOAD_BYTES = int(os.environ.get("SHARE_MAX_PAYLOAD_BYTES", "65536"))


def _share_secret() -> bytes:
    secret = os.environ.get("SHARE_TOKEN_SECRET", "").strip()
    if not secret:
        if is_production():
            raise RuntimeError("SHARE_TOKEN_SECRET is not configured.")
        secret = DEV_SHARE_SECRET
    return secret.encode()


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _b64url_decode(data: str) -> bytes:
    pad = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode((data + pad).encode())


def create_share_token(data: Dict[str, Any]) -> str:
    raw_payload = json.dumps({"data": data}, separators=(",", ":")).encode()
    if len(raw_payload) > MAX_SHARE_PAYLOAD_BYTES:
        raise ValueError("Share payload too large.")

    payload = {
        "data": data,
        "exp": int(time.time()) + SHARE_TTL_SECONDS,
    }
    raw = json.dumps(payload, separators=(",", ":")).encode()
    sig = hmac.new(_share_secret(), raw, hashlib.sha256).digest()
    # Text-level "." separator — never collide with binary signature bytes
    return f"{_b64url_encode(raw)}.{_b64url_encode(sig)}"


def verify_share_token(token: str) -> Optional[Dict[str, Any]]:
    try:
        if "." not in token:
            # Legacy format: base64(raw + b'.' + sig) — may fail if sig contains 0x2e
            return _verify_legacy_token(token)
        payload_b64, sig_b64 = token.rsplit(".", 1)
        raw = _b64url_decode(payload_b64)
        sig = _b64url_decode(sig_b64)
        expected = hmac.new(_share_secret(), raw, hashlib.sha256).digest()
        if not hmac.compare_digest(sig, expected):
            return None
        payload = json.loads(raw)
        if payload.get("exp", 0) < time.time():
            return None
        return payload.get("data")
    except Exception:
        return None


def _verify_legacy_token(token: str) -> Optional[Dict[str, Any]]:
    """Best-effort verify for old single-blob tokens (pre JWT-style format)."""
    try:
        decoded = base64.urlsafe_b64decode(token.encode())
        # Prefer split after JSON object end: ...}.<sig>
        idx = decoded.find(b"}.")
        if idx == -1:
            return None
        raw = decoded[: idx + 1]
        sig = decoded[idx + 2 :]
        if len(sig) != 32:
            return None
        expected = hmac.new(_share_secret(), raw, hashlib.sha256).digest()
        if not hmac.compare_digest(sig, expected):
            return None
        payload = json.loads(raw)
        if payload.get("exp", 0) < time.time():
            return None
        return payload.get("data")
    except Exception:
        return None

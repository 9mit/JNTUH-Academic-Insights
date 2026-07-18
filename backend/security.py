"""Rate limiting and security utilities."""
import os
import time
from collections import defaultdict
from typing import Dict

from fastapi import HTTPException, Request

RATE_LIMIT_STORE: Dict[str, list] = defaultdict(list)

DEFAULT_LIMIT = int(os.environ.get("RATE_LIMIT_PER_MINUTE", "30"))
FETCH_LIMIT = int(os.environ.get("FETCH_RATE_LIMIT_PER_MINUTE", "10"))
PDF_LIMIT = int(os.environ.get("PDF_RATE_LIMIT_PER_MINUTE", "15"))
SHARE_LIMIT = int(os.environ.get("SHARE_RATE_LIMIT_PER_MINUTE", "20"))

DEV_SHARE_SECRET = "jntuh-dev-share-secret-change-in-prod"


def is_production() -> bool:
    env = os.environ.get("ENVIRONMENT", "").lower()
    if env in ("production", "prod"):
        return True
    return bool(os.environ.get("RENDER_EXTERNAL_URL"))


def get_cors_origins() -> list:
    raw = os.environ.get("CORS_ORIGINS", "")
    if raw:
        return [o.strip() for o in raw.split(",") if o.strip()]
    if is_production():
        raise RuntimeError("CORS_ORIGINS must be set in production (comma-separated allowed origins).")
    return ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:8000"]


def validate_production_config() -> None:
    """Fail fast when required production secrets are missing."""
    if not is_production():
        return

    cors = os.environ.get("CORS_ORIGINS", "").strip()
    if not cors:
        raise RuntimeError("CORS_ORIGINS must be set in production.")

    share_secret = os.environ.get("SHARE_TOKEN_SECRET", "").strip()
    if not share_secret or share_secret == DEV_SHARE_SECRET:
        raise RuntimeError(
            "SHARE_TOKEN_SECRET must be set to a strong random value in production "
            "(e.g. openssl rand -hex 32)."
        )

    api_key = os.environ.get("JNTUH_RESULTS_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("JNTUH_RESULTS_API_KEY must be set in production.")


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def check_rate_limit(request: Request, limit: int = DEFAULT_LIMIT) -> None:
    ip = _client_ip(request)
    now = time.time()
    window = RATE_LIMIT_STORE[ip]
    RATE_LIMIT_STORE[ip] = [t for t in window if now - t < 60]
    if len(RATE_LIMIT_STORE[ip]) >= limit:
        raise HTTPException(status_code=429, detail="Rate limit exceeded. Please try again later.")
    RATE_LIMIT_STORE[ip].append(now)


def mask_hall_ticket(htno: str) -> str:
    htno = (htno or "").strip().upper()
    if len(htno) < 6:
        return "****"
    return f"{htno[:4]}****{htno[-2:]}"

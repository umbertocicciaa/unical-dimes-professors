import os
from datetime import timedelta
from typing import Optional

from dotenv import load_dotenv

load_dotenv()


def _get_env(key: str, default: Optional[str] = None) -> str:
    value = os.getenv(key, default)
    if value is None:
        raise RuntimeError(f"Environment variable '{key}' must be set")
    return value


AUTH_SECRET_KEY: str = _get_env("AUTH_SECRET_KEY", "dev-secret-change-me")
AUTH_REFRESH_SECRET: str = _get_env("AUTH_REFRESH_SECRET", "dev-refresh-secret-change-me")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
AUTH_ISSUER = os.getenv("AUTH_ISSUER", "unical-dimes-professors")
AUTH_AUDIENCE = os.getenv("AUTH_AUDIENCE", "unical-dimes-professors-api")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "15"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
PASSWORD_MIN_LENGTH = int(os.getenv("PASSWORD_MIN_LENGTH", "12"))
MAX_ACTIVE_SESSIONS_PER_USER = int(os.getenv("MAX_ACTIVE_SESSIONS_PER_USER", "5"))


def access_token_ttl() -> timedelta:
    return timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)


def refresh_token_ttl() -> timedelta:
    return timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)

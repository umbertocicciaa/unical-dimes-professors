import hashlib
from datetime import datetime, timedelta
from typing import Callable, Optional, Sequence

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app import models
from app.config import (
    AUTH_AUDIENCE,
    AUTH_ISSUER,
    AUTH_REFRESH_SECRET,
    AUTH_SECRET_KEY,
    JWT_ALGORITHM,
    MAX_ACTIVE_SESSIONS_PER_USER,
    access_token_ttl,
    refresh_token_ttl,
)
from app.database import get_db

from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")
bearer_scheme = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return pwd_context.verify(password, password_hash)


def _base_token_payload(user_id: int, roles: Sequence[str]) -> dict:
    now = datetime.utcnow()
    return {
        "sub": str(user_id),
        "roles": list(roles),
        "iss": AUTH_ISSUER,
        "aud": AUTH_AUDIENCE,
        "iat": int(now.timestamp()),
    }


def create_access_token(user_id: int, roles: Sequence[str], expires_delta: Optional[timedelta] = None) -> str:
    payload = _base_token_payload(user_id, roles)
    expire = datetime.utcnow() + (expires_delta or access_token_ttl())
    payload.update({"exp": int(expire.timestamp())})
    return jwt.encode(payload, AUTH_SECRET_KEY, algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: int, roles: Sequence[str], expires_delta: Optional[timedelta] = None) -> str:
    payload = _base_token_payload(user_id, roles)
    expire = datetime.utcnow() + (expires_delta or refresh_token_ttl())
    payload.update({"exp": int(expire.timestamp())})
    return jwt.encode(payload, AUTH_REFRESH_SECRET, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    return jwt.decode(
        token,
        AUTH_SECRET_KEY,
        algorithms=[JWT_ALGORITHM],
        audience=AUTH_AUDIENCE,
        issuer=AUTH_ISSUER,
    )


def decode_refresh_token(token: str) -> dict:
    return jwt.decode(
        token,
        AUTH_REFRESH_SECRET,
        algorithms=[JWT_ALGORITHM],
        audience=AUTH_AUDIENCE,
        issuer=AUTH_ISSUER,
    )


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> models.User:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication credentials were not provided")

    token = credentials.credentials
    try:
        payload = decode_access_token(token)
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired access token")

    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token missing subject claim")

    user = db.query(models.User).filter(models.User.id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account disabled")
    return user


def require_roles(*allowed_roles: str) -> Callable[[models.User], models.User]:
    def dependency(current_user: models.User = Depends(get_current_user)) -> models.User:
        if not allowed_roles:
            return current_user
        user_roles = set(current_user.role_names)
        if not user_roles.intersection(set(allowed_roles)):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")
        return current_user

    return dependency


def issue_refresh_session(
    user: models.User,
    db: Session,
    user_agent: Optional[str] = None,
    ip_address: Optional[str] = None,
) -> str:
    refresh_token = create_refresh_token(user.id, user.role_names, refresh_token_ttl())

    session = models.UserSession(
        user_id=user.id,
        refresh_token_hash=_hash_token(refresh_token),
        expires_at=datetime.utcnow() + refresh_token_ttl(),
        user_agent=user_agent,
        ip_address=ip_address,
    )
    db.add(session)
    db.flush()
    _prune_old_sessions(user.id, db)
    return refresh_token


def rotate_refresh_session(session: models.UserSession, db: Session, roles: Sequence[str]) -> str:
    new_refresh = create_refresh_token(session.user_id, roles, refresh_token_ttl())
    session.refresh_token_hash = _hash_token(new_refresh)
    session.expires_at = datetime.utcnow() + refresh_token_ttl()
    session.last_used_at = datetime.utcnow()
    db.add(session)
    db.flush()
    return new_refresh


def get_session_for_refresh_token(db: Session, refresh_token: str) -> models.UserSession:
    token_hash = _hash_token(refresh_token)
    session = (
        db.query(models.UserSession)
        .filter(models.UserSession.refresh_token_hash == token_hash)
        .first()
    )
    if not session:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token invalid")
    if session.expires_at < datetime.utcnow():
        db.delete(session)
        db.flush()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token expired")
    return session


def revoke_session(session: models.UserSession, db: Session) -> None:
    db.delete(session)
    db.flush()


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _prune_old_sessions(user_id: int, db: Session) -> None:
    if MAX_ACTIVE_SESSIONS_PER_USER <= 0:
        return

    sessions = (
        db.query(models.UserSession)
        .filter(models.UserSession.user_id == user_id)
        .order_by(models.UserSession.created_at.desc())
        .all()
    )
    if len(sessions) <= MAX_ACTIVE_SESSIONS_PER_USER:
        return

    for session in sessions[MAX_ACTIVE_SESSIONS_PER_USER:]:
        db.delete(session)
    db.flush()

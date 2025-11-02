from datetime import datetime, timedelta

import pytest
from fastapi import HTTPException

from app import models
from app.security import (
    MAX_ACTIVE_SESSIONS_PER_USER,
    create_access_token,
    create_refresh_token,
    decode_access_token,
    decode_refresh_token,
    get_session_for_refresh_token,
    hash_password,
    issue_refresh_session,
    require_roles,
    revoke_session,
    rotate_refresh_session,
    verify_password,
)
from tests.utils import create_user


def test_hash_and_verify_password():
    password = "UltraSecurePassword!"
    hashed = hash_password(password)
    assert hashed != password
    assert verify_password(password, hashed) is True
    assert verify_password("wrong", hashed) is False


def test_access_token_round_trip():
    token = create_access_token(42, ["admin"])
    decoded = decode_access_token(token)
    assert decoded["sub"] == "42"
    assert decoded["roles"] == ["admin"]


def test_refresh_token_round_trip():
    token = create_refresh_token(7, ["viewer"])
    decoded = decode_refresh_token(token)
    assert decoded["sub"] == "7"
    assert decoded["roles"] == ["viewer"]


def test_require_roles_enforces_membership(session):
    user = create_user(session, email="member@example.com", roles=("viewer",))
    enforce_admin = require_roles("admin")
    with pytest.raises(HTTPException) as exc:
        enforce_admin(current_user=user)
    assert exc.value.status_code == 403

    enforce_viewer = require_roles("viewer")
    assert enforce_viewer(current_user=user) == user


def test_issue_refresh_session_creates_record(session, monkeypatch):
    monkeypatch.setattr("app.security.MAX_ACTIVE_SESSIONS_PER_USER", 2)
    user = create_user(session, email="session@example.com", roles=("viewer",))

    tokens = [
        issue_refresh_session(user, db=session, user_agent=f"agent-{i}", ip_address=f"127.0.0.{i}")
        for i in range(3)
    ]
    session.commit()

    stored_sessions = (
        session.query(models.UserSession)
        .filter(models.UserSession.user_id == user.id)
        .order_by(models.UserSession.created_at.desc())
        .all()
    )
    assert len(stored_sessions) == 2
    saved_agents = {record.user_agent for record in stored_sessions}
    assert saved_agents == {"agent-1", "agent-2"}
    assert all(token in tokens for token in tokens[-2:])


def test_rotate_refresh_session_updates_hash(session):
    user = create_user(session, email="rotate@example.com", roles=("viewer", "admin"))
    refresh_token = issue_refresh_session(user, db=session, user_agent="agent", ip_address="127.0.0.1")
    session.commit()

    stored_session = get_session_for_refresh_token(session, refresh_token)
    old_hash = stored_session.refresh_token_hash
    new_token = rotate_refresh_session(stored_session, session, roles=user.role_names)
    session.commit()

    session.refresh(stored_session)
    assert stored_session.refresh_token_hash != old_hash
    assert new_token != refresh_token
    decoded = decode_refresh_token(new_token)
    assert decoded["roles"] == user.role_names


def test_get_session_for_refresh_token_validates_expiration(session):
    user = create_user(session, email="expire@example.com")
    refresh_token = issue_refresh_session(user, db=session)
    session.commit()

    # Force expiration in the past
    stored_session = session.query(models.UserSession).filter_by(user_id=user.id).first()
    stored_session.expires_at = datetime.utcnow() - timedelta(minutes=1)
    session.commit()

    with pytest.raises(HTTPException) as exc:
        get_session_for_refresh_token(session, refresh_token)
    assert exc.value.status_code == 401
    remaining = session.query(models.UserSession).filter_by(user_id=user.id).count()
    assert remaining == 0


def test_revoke_session_removes_record(session):
    user = create_user(session, email="revoke@example.com")
    refresh_token = issue_refresh_session(user, db=session)
    session.commit()

    stored_session = get_session_for_refresh_token(session, refresh_token)
    revoke_session(stored_session, session)
    session.commit()
    remaining = session.query(models.UserSession).filter_by(user_id=user.id).count()
    assert remaining == 0

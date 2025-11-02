from fastapi import status

from app import models
from tests.utils import auth_headers, create_user


def test_register_creates_user_with_viewer_role(client, session):
    payload = {"email": "alice@example.com", "password": "SupersafePass123!"}
    response = client.post("/auth/register", json=payload)
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["email"] == payload["email"]
    assert any(role["name"] == "viewer" for role in data["roles"])

    session.expire_all()
    user = session.query(models.User).filter_by(email=payload["email"]).first()
    assert user is not None
    assert {role.name for role in user.roles} == {"viewer"}


def test_register_rejects_duplicate_email(client):
    payload = {"email": "duplicate@example.com", "password": "AnotherSafePass123!"}
    first = client.post("/auth/register", json=payload)
    assert first.status_code == status.HTTP_201_CREATED

    duplicate = client.post("/auth/register", json=payload)
    assert duplicate.status_code == status.HTTP_400_BAD_REQUEST
    assert duplicate.json()["detail"] == "Account with this email already exists"


def test_login_returns_tokens_and_creates_session(client, session):
    password = "LoginPass123!"
    create_user(session, email="login@example.com", password=password)

    response = client.post("/auth/login", json={"email": "login@example.com", "password": password})
    assert response.status_code == status.HTTP_200_OK
    tokens = response.json()
    assert "access_token" in tokens and "refresh_token" in tokens

    session.expire_all()
    stored_sessions = session.query(models.UserSession).all()
    assert len(stored_sessions) == 1


def test_login_rejects_invalid_credentials(client):
    response = client.post("/auth/login", json={"email": "unknown@example.com", "password": "invalid"})
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert response.json()["detail"] == "Invalid email or password"


def test_login_blocks_disabled_user(client, session):
    password = "DisabledPass123!"
    create_user(session, email="disabled@example.com", password=password, is_active=False)

    response = client.post("/auth/login", json={"email": "disabled@example.com", "password": password})
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert response.json()["detail"] == "User account disabled"


def test_refresh_token_rotates_session(client, session):
    password = "RefreshPass123!"
    create_user(session, email="refresh@example.com", password=password)

    login = client.post("/auth/login", json={"email": "refresh@example.com", "password": password})
    refresh_token = login.json()["refresh_token"]

    response = client.post("/auth/refresh", json={"refresh_token": refresh_token})
    assert response.status_code == status.HTTP_200_OK
    rotated = response.json()
    assert rotated["refresh_token"] != refresh_token

    session.expire_all()
    records = session.query(models.UserSession).all()
    assert len(records) == 1


def test_refresh_token_invalid_token_rejected(client):
    response = client.post("/auth/refresh", json={"refresh_token": "invalid-token"})
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert response.json()["detail"] == "Invalid refresh token"


def test_refresh_token_mismatch_revokes_session(client, session):
    password = "Mismatch123!"
    user = create_user(session, email="mismatch@example.com", password=password)
    other = create_user(session, email="other@example.com", password="OtherPass123!")

    login = client.post("/auth/login", json={"email": "mismatch@example.com", "password": password})
    refresh_token = login.json()["refresh_token"]

    session_record = session.query(models.UserSession).filter_by(user_id=user.id).first()
    session_record.user_id = other.id
    session.commit()

    response = client.post("/auth/refresh", json={"refresh_token": refresh_token})
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert response.json()["detail"] == "Refresh token mismatch"
    remaining = session.query(models.UserSession).count()
    assert remaining == 0


def test_logout_revokes_session(client, session):
    password = "LogoutPass123!"
    create_user(session, email="logout@example.com", password=password)

    login = client.post("/auth/login", json={"email": "logout@example.com", "password": password})
    refresh_token = login.json()["refresh_token"]

    logout = client.post("/auth/logout", json={"refresh_token": refresh_token})
    assert logout.status_code == status.HTTP_204_NO_CONTENT
    session.expire_all()
    assert session.query(models.UserSession).count() == 0


def test_read_current_user_requires_authentication(client):
    response = client.get("/auth/me")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert response.json()["detail"] == "Authentication credentials were not provided"


def test_read_current_user_returns_profile(client, session):
    user = create_user(session, email="me@example.com")
    headers = auth_headers(user)
    response = client.get("/auth/me", headers=headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["email"] == "me@example.com"
    assert data["roles"][0]["name"] == "viewer"

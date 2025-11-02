from fastapi import status

from app import models
from tests.utils import auth_headers, create_user


def test_admin_routes_require_admin_role(client, session):
    viewer = create_user(session, email="viewer_admin@example.com", roles=("viewer",))
    headers = auth_headers(viewer)

    unauthorized = client.get("/admin/roles", headers=headers)
    assert unauthorized.status_code == status.HTTP_403_FORBIDDEN
    assert unauthorized.json()["detail"] == "Not enough permissions"

    unauthenticated = client.get("/admin/roles")
    assert unauthenticated.status_code == status.HTTP_401_UNAUTHORIZED


def test_list_roles_returns_all_defaults(client, session):
    admin = create_user(session, email="admin_roles@example.com", roles=("admin",))
    headers = auth_headers(admin)
    response = client.get("/admin/roles", headers=headers)
    assert response.status_code == status.HTTP_200_OK
    roles = response.json()
    role_names = {role["name"] for role in roles}
    assert role_names == {"admin", "editor", "viewer"}


def test_list_users_respects_include_inactive(client, session):
    admin = create_user(session, email="admin_users@example.com", roles=("admin",))
    active_user = create_user(session, email="active@example.com", roles=("viewer",))
    inactive_user = create_user(session, email="inactive@example.com", roles=("viewer",), is_active=False)
    headers = auth_headers(admin)

    all_users = client.get("/admin/users", headers=headers)
    assert all_users.status_code == status.HTTP_200_OK
    all_emails = {user["email"] for user in all_users.json()}
    assert {"admin_users@example.com", "active@example.com", "inactive@example.com"} <= all_emails

    active_only = client.get("/admin/users", params={"include_inactive": "false"}, headers=headers)
    assert active_only.status_code == status.HTTP_200_OK
    active_emails = {user["email"] for user in active_only.json()}
    assert "inactive@example.com" not in active_emails
    assert "active@example.com" in active_emails


def test_update_user_allows_role_and_status_changes(client, session):
    admin = create_user(session, email="admin_update@example.com", roles=("admin",))
    target = create_user(session, email="target@example.com", roles=("viewer",))
    headers = auth_headers(admin)

    payload = {"role_names": ["editor"], "is_active": False}
    response = client.put(f"/admin/users/{target.id}", json=payload, headers=headers)
    assert response.status_code == status.HTTP_200_OK
    body = response.json()
    assert body["is_active"] is False
    assert body["roles"][0]["name"] == "editor"

    session.expire_all()
    refreshed = session.get(models.User, target.id)
    assert refreshed.is_active is False
    assert {role.name for role in refreshed.roles} == {"editor"}


def test_update_user_missing_returns_404(client, session):
    admin = create_user(session, email="admin_missing@example.com", roles=("admin",))
    headers = auth_headers(admin)
    response = client.put("/admin/users/99999", json={"role_names": ["admin"]}, headers=headers)
    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert response.json()["detail"] == "User not found"

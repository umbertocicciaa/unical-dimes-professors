import pytest

from app import models
from app.roles import DEFAULT_ROLES, assign_roles_by_name, ensure_default_roles, get_or_create_role
from tests.utils import create_user


def test_ensure_default_roles_creates_all_defaults(session):
    ensure_default_roles(session)
    roles = session.query(models.Role).order_by(models.Role.name).all()
    role_names = [role.name for role in roles]
    assert role_names == sorted(DEFAULT_ROLES.keys())


def test_get_or_create_role_returns_existing_instance(session):
    ensure_default_roles(session)
    role = get_or_create_role(session, "admin")
    duplicate = get_or_create_role(session, "admin")
    assert role.id == duplicate.id


def test_assign_roles_by_name_updates_relationship(session):
    ensure_default_roles(session)
    user = create_user(session, email="roles@example.com", roles=("viewer",))
    assign_roles_by_name(user, ["admin", "editor"], session)
    session.refresh(user)
    assert {role.name for role in user.roles} == {"admin", "editor"}


def test_assign_roles_by_name_allows_role_removal(session):
    ensure_default_roles(session)
    user = create_user(session, email="remove@example.com", roles=("admin", "viewer"))
    assign_roles_by_name(user, [], session)
    session.refresh(user)
    assert user.roles == []


def test_assign_roles_by_name_raises_for_missing_role(session):
    ensure_default_roles(session)
    user = create_user(session, email="missing@example.com", roles=("viewer",))
    with pytest.raises(ValueError) as exc:
        assign_roles_by_name(user, ["admin", "ghost"], session)
    assert "Roles not found: ghost" in str(exc.value)

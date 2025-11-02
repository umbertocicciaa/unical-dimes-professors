from typing import Dict, Iterable, List, Optional

from sqlalchemy.orm import Session

from app import models

DEFAULT_ROLES: Dict[str, str] = {
    "admin": "Full administrative access",
    "editor": "Manage content but no user administration",
    "viewer": "Read-only access to catalog resources",
}

DEFAULT_REGISTER_ROLE = "viewer"


def ensure_default_roles(db: Session) -> None:
    for name, description in DEFAULT_ROLES.items():
        get_or_create_role(db, name, description)


def assign_roles_by_name(user: models.User, role_names: Iterable[str], db: Session) -> None:
    requested = list(role_names)
    if not requested:
        user.roles = []
        db.flush()
        return

    roles: List[models.Role] = (
        db.query(models.Role)
        .filter(models.Role.name.in_(requested))
        .all()
    )
    unique_requested = set(requested)
    found_names = {role.name for role in roles}
    if found_names != unique_requested:
        missing = unique_requested - {role.name for role in roles}
        raise ValueError(f"Roles not found: {', '.join(sorted(missing))}")
    user.roles = roles
    db.flush()


def get_or_create_role(db: Session, role_name: str, description: Optional[str] = None) -> models.Role:
    role = db.query(models.Role).filter(models.Role.name == role_name).first()
    if role:
        return role
    role = models.Role(name=role_name, description=description or DEFAULT_ROLES.get(role_name))
    db.add(role)
    db.flush()
    return role

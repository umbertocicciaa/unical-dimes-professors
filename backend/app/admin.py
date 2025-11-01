from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.roles import assign_roles_by_name, ensure_default_roles
from app.security import require_roles

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_roles("admin"))])


@router.get("/roles", response_model=List[schemas.Role])
def list_roles(db: Session = Depends(get_db)) -> List[models.Role]:
    ensure_default_roles(db)
    roles = db.query(models.Role).order_by(models.Role.name.asc()).all()
    return roles


@router.get("/users", response_model=List[schemas.User])
def list_users(include_inactive: bool = True, db: Session = Depends(get_db)) -> List[models.User]:
    query = db.query(models.User)
    if not include_inactive:
        query = query.filter(models.User.is_active.is_(True))
    users = query.order_by(models.User.created_at.desc()).all()
    return users


@router.put("/users/{user_id}", response_model=schemas.User)
def update_user(user_id: int, payload: schemas.UserAdminUpdate, db: Session = Depends(get_db)) -> models.User:
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if payload.role_names is not None:
        ensure_default_roles(db)
        try:
            assign_roles_by_name(user, payload.role_names, db)
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    if payload.is_active is not None:
        user.is_active = payload.is_active

    db.add(user)
    db.commit()
    db.refresh(user)
    return user

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.roles import DEFAULT_REGISTER_ROLE, ensure_default_roles, get_or_create_role
from app.security import (
    create_access_token,
    decode_refresh_token,
    get_current_user,
    get_session_for_refresh_token,
    hash_password,
    issue_refresh_session,
    rotate_refresh_session,
    verify_password,
    revoke_session,
)

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=schemas.User, status_code=status.HTTP_201_CREATED)
def register_user(payload: schemas.UserRegister, db: Session = Depends(get_db)) -> schemas.User:
    ensure_default_roles(db)

    existing = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Account with this email already exists")

    user = models.User(
        email=payload.email,
        password_hash=hash_password(payload.password),
    )
    default_role = get_or_create_role(db, DEFAULT_REGISTER_ROLE)
    user.roles.append(default_role)

    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=schemas.TokenResponse)
def login(payload: schemas.UserLogin, request: Request, db: Session = Depends(get_db)) -> schemas.TokenResponse:
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account disabled")

    access_token = create_access_token(user.id, user.role_names)
    refresh_token = issue_refresh_session(
        user,
        db=db,
        user_agent=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None,
    )

    db.commit()
    return schemas.TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/refresh", response_model=schemas.TokenResponse)
def refresh_token(payload: schemas.RefreshRequest, db: Session = Depends(get_db)) -> schemas.TokenResponse:
    try:
        refresh_payload = decode_refresh_token(payload.refresh_token)
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    session = get_session_for_refresh_token(db, payload.refresh_token)
    if str(session.user_id) != refresh_payload.get("sub"):
        revoke_session(session, db)
        db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token mismatch")

    user = db.query(models.User).filter(models.User.id == session.user_id).first()
    if not user or not user.is_active:
        revoke_session(session, db)
        db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User unavailable")

    access_token = create_access_token(user.id, user.role_names)
    new_refresh_token = rotate_refresh_session(session, db, user.role_names)
    db.commit()
    return schemas.TokenResponse(access_token=access_token, refresh_token=new_refresh_token)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(payload: schemas.LogoutRequest, db: Session = Depends(get_db)) -> None:
    session = get_session_for_refresh_token(db, payload.refresh_token)
    revoke_session(session, db)
    db.commit()


@router.get("/me", response_model=schemas.User)
def read_current_user(current_user: models.User = Depends(get_current_user)) -> models.User:
    return current_user

from typing import Iterable, Optional, Sequence

from app import models
from app.roles import ensure_default_roles, get_or_create_role
from app.security import create_access_token, hash_password


def create_user(
    session,
    email: str = "user@example.com",
    password: str = "StrongPassword123!",
    roles: Optional[Iterable[str]] = ("viewer",),
    is_active: bool = True,
) -> models.User:
    ensure_default_roles(session)
    user = models.User(email=email, password_hash=hash_password(password), is_active=is_active)
    if roles:
        for role_name in roles:
            role = get_or_create_role(session, role_name)
            user.roles.append(role)
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def auth_headers(user: models.User, roles: Optional[Sequence[str]] = None) -> dict:
    token = create_access_token(user.id, roles or user.role_names)
    return {"Authorization": f"Bearer {token}"}


def create_teacher(
    session,
    name: str = "Dr. Ada Lovelace",
    department: Optional[str] = "Computer Science",
) -> models.Teacher:
    teacher = models.Teacher(name=name, department=department)
    session.add(teacher)
    session.commit()
    session.refresh(teacher)
    return teacher


def create_course(
    session,
    teacher: models.Teacher,
    name: str = "Advanced Algorithms",
) -> models.Course:
    course = models.Course(name=name, teacher_id=teacher.id)
    session.add(course)
    session.commit()
    session.refresh(course)
    return course


def create_review(
    session,
    teacher: models.Teacher,
    course: models.Course,
    rating: int = 4,
    description: str = "Great course with valuable insights.",
) -> models.Review:
    review = models.Review(
        teacher_id=teacher.id,
        course_id=course.id,
        rating=rating,
        description=description,
    )
    session.add(review)
    session.commit()
    session.refresh(review)
    return review

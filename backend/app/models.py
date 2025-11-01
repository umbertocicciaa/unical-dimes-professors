from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, Boolean, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class Teacher(Base):
    __tablename__ = "teachers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    department = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    courses = relationship("Course", back_populates="teacher", cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="teacher", cascade="all, delete-orphan")

class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    teacher_id = Column(Integer, ForeignKey("teachers.id", ondelete="CASCADE"))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    teacher = relationship("Teacher", back_populates="courses")
    reviews = relationship("Review", back_populates="course", cascade="all, delete-orphan")

class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    teacher_id = Column(Integer, ForeignKey("teachers.id", ondelete="CASCADE"))
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"))
    rating = Column(Integer, nullable=False)
    description = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    teacher = relationship("Teacher", back_populates="reviews")
    course = relationship("Course", back_populates="reviews")


class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    users = relationship("User", secondary="user_roles", back_populates="roles")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, nullable=False, unique=True, index=True)
    password_hash = Column(String, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    roles = relationship("Role", secondary="user_roles", back_populates="users")
    sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")

    @property
    def role_names(self):
        return [role.name for role in self.roles]


class UserRole(Base):
    __tablename__ = "user_roles"
    __table_args__ = (UniqueConstraint("user_id", "role_id", name="uq_user_roles_user_role"),)

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    role_id = Column(Integer, ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True)
    assigned_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", backref="user_role_links")
    role = relationship("Role", backref="role_user_links")


class UserSession(Base):
    __tablename__ = "user_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    refresh_token_hash = Column(String, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_used_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    user_agent = Column(String, nullable=True)
    ip_address = Column(String, nullable=True)

    user = relationship("User", back_populates="sessions")

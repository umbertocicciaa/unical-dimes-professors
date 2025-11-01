from pydantic import BaseModel, Field, EmailStr
from datetime import datetime
from typing import Optional, List
from app.config import PASSWORD_MIN_LENGTH

class CourseBase(BaseModel):
    name: str

class CourseCreate(CourseBase):
    teacher_id: int

class CourseUpdate(BaseModel):
    name: Optional[str] = None
    teacher_id: Optional[int] = None

class Course(CourseBase):
    id: int
    teacher_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class ReviewBase(BaseModel):
    rating: int = Field(ge=1, le=5, description="Rating must be between 1 and 5")
    description: str = Field(min_length=10, description="Description must be at least 10 characters")

class ReviewCreate(ReviewBase):
    teacher_id: int
    course_id: int

class ReviewUpdate(BaseModel):
    rating: Optional[int] = Field(default=None, ge=1, le=5, description="Rating must be between 1 and 5")
    description: Optional[str] = Field(default=None, min_length=10, description="Description must be at least 10 characters")
    teacher_id: Optional[int] = None
    course_id: Optional[int] = None

class Review(ReviewBase):
    id: int
    teacher_id: int
    course_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class TeacherBase(BaseModel):
    name: str
    department: Optional[str] = None

class TeacherCreate(TeacherBase):
    pass

class TeacherUpdate(BaseModel):
    name: Optional[str] = None
    department: Optional[str] = None

class TeacherWithStats(TeacherBase):
    id: int
    created_at: datetime
    average_rating: Optional[float] = None
    review_count: int = 0
    courses: List[Course] = []

    class Config:
        from_attributes = True

class Teacher(TeacherBase):
    id: int
    created_at: datetime
    courses: List[Course] = []
    reviews: List[Review] = []

    class Config:
        from_attributes = True


class RoleBase(BaseModel):
    name: str
    description: Optional[str] = None


class Role(RoleBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class UserBase(BaseModel):
    email: EmailStr


class UserCreate(UserBase):
    password: str = Field(min_length=PASSWORD_MIN_LENGTH)


class UserRegister(UserCreate):
    pass


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class User(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    roles: List[Role] = []

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "Bearer"


class RefreshRequest(BaseModel):
    refresh_token: str = Field(min_length=32)


class LogoutRequest(RefreshRequest):
    pass

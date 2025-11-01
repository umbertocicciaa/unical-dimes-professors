from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List

class CourseBase(BaseModel):
    name: str

class CourseCreate(CourseBase):
    teacher_id: int

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

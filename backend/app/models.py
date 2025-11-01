from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Text
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

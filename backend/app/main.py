from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from app import models, schemas
from app.database import engine, get_db

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Professor Review API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://frontend:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Professor Review API"}

# Teacher endpoints
@app.get("/api/teachers", response_model=List[schemas.TeacherWithStats])
def get_teachers(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    teachers = db.query(models.Teacher).offset(skip).limit(limit).all()
    
    result = []
    for teacher in teachers:
        avg_rating = db.query(func.avg(models.Review.rating)).filter(
            models.Review.teacher_id == teacher.id
        ).scalar()
        
        review_count = db.query(models.Review).filter(
            models.Review.teacher_id == teacher.id
        ).count()
        
        teacher_dict = {
            "id": teacher.id,
            "name": teacher.name,
            "department": teacher.department,
            "created_at": teacher.created_at,
            "average_rating": float(avg_rating) if avg_rating else None,
            "review_count": review_count,
            "courses": teacher.courses
        }
        result.append(teacher_dict)
    
    return result

@app.get("/api/teachers/{teacher_id}", response_model=schemas.Teacher)
def get_teacher(teacher_id: int, db: Session = Depends(get_db)):
    teacher = db.query(models.Teacher).filter(models.Teacher.id == teacher_id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
    return teacher

@app.post("/api/teachers", response_model=schemas.Teacher)
def create_teacher(teacher: schemas.TeacherCreate, db: Session = Depends(get_db)):
    db_teacher = models.Teacher(**teacher.dict())
    db.add(db_teacher)
    db.commit()
    db.refresh(db_teacher)
    return db_teacher

# Course endpoints
@app.get("/api/courses", response_model=List[schemas.Course])
def get_courses(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    courses = db.query(models.Course).offset(skip).limit(limit).all()
    return courses

@app.get("/api/courses/{course_id}", response_model=schemas.Course)
def get_course(course_id: int, db: Session = Depends(get_db)):
    course = db.query(models.Course).filter(models.Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course

@app.post("/api/courses", response_model=schemas.Course)
def create_course(course: schemas.CourseCreate, db: Session = Depends(get_db)):
    teacher = db.query(models.Teacher).filter(models.Teacher.id == course.teacher_id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
    
    db_course = models.Course(**course.dict())
    db.add(db_course)
    db.commit()
    db.refresh(db_course)
    return db_course

# Review endpoints
@app.get("/api/reviews", response_model=List[schemas.Review])
def get_reviews(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    reviews = db.query(models.Review).offset(skip).limit(limit).all()
    return reviews

@app.get("/api/teachers/{teacher_id}/reviews", response_model=List[schemas.Review])
def get_teacher_reviews(teacher_id: int, db: Session = Depends(get_db)):
    reviews = db.query(models.Review).filter(models.Review.teacher_id == teacher_id).all()
    return reviews

@app.post("/api/reviews", response_model=schemas.Review)
def create_review(review: schemas.ReviewCreate, db: Session = Depends(get_db)):
    teacher = db.query(models.Teacher).filter(models.Teacher.id == review.teacher_id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
    
    course = db.query(models.Course).filter(models.Course.id == review.course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    db_review = models.Review(**review.dict())
    db.add(db_review)
    db.commit()
    db.refresh(db_review)
    return db_review

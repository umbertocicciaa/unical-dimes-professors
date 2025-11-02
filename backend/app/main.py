from fastapi import FastAPI, Depends, HTTPException, status, Response
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from app import models, schemas
from app.database import engine, get_db
from app.auth import router as auth_router
from app.admin import router as admin_router
from app.security import require_roles
from app.services.moderation import ModerationClient, get_moderation_client

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Professor Review API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://frontend:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(admin_router)

_moderation_client = get_moderation_client()


def moderation_dependency() -> ModerationClient:
    return _moderation_client

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

@app.post("/api/teachers", response_model=schemas.Teacher, dependencies=[Depends(require_roles("admin", "editor"))])
def create_teacher(teacher: schemas.TeacherCreate, db: Session = Depends(get_db)):
    db_teacher = models.Teacher(**teacher.dict())
    db.add(db_teacher)
    db.commit()
    db.refresh(db_teacher)
    return db_teacher

@app.put("/api/teachers/{teacher_id}", response_model=schemas.Teacher, dependencies=[Depends(require_roles("admin", "editor"))])
def update_teacher(teacher_id: int, teacher_update: schemas.TeacherUpdate, db: Session = Depends(get_db)):
    teacher = db.query(models.Teacher).filter(models.Teacher.id == teacher_id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")

    update_data = teacher_update.dict(exclude_unset=True)
    if not update_data:
        return teacher

    for key, value in update_data.items():
        setattr(teacher, key, value)

    db.commit()
    db.refresh(teacher)
    return teacher

@app.delete("/api/teachers/{teacher_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_roles("admin"))])
def delete_teacher(teacher_id: int, db: Session = Depends(get_db)):
    teacher = db.query(models.Teacher).filter(models.Teacher.id == teacher_id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")

    db.delete(teacher)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)

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

@app.post("/api/courses", response_model=schemas.Course, dependencies=[Depends(require_roles("admin", "editor"))])
def create_course(course: schemas.CourseCreate, db: Session = Depends(get_db)):
    teacher = db.query(models.Teacher).filter(models.Teacher.id == course.teacher_id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
    
    db_course = models.Course(**course.dict())
    db.add(db_course)
    db.commit()
    db.refresh(db_course)
    return db_course

@app.put("/api/courses/{course_id}", response_model=schemas.Course, dependencies=[Depends(require_roles("admin", "editor"))])
def update_course(course_id: int, course_update: schemas.CourseUpdate, db: Session = Depends(get_db)):
    course = db.query(models.Course).filter(models.Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    update_data = course_update.dict(exclude_unset=True)
    if "teacher_id" in update_data:
        new_teacher_id = update_data["teacher_id"]
        if new_teacher_id is None:
            raise HTTPException(status_code=422, detail="teacher_id cannot be null")
        teacher = db.query(models.Teacher).filter(models.Teacher.id == new_teacher_id).first()
        if not teacher:
            raise HTTPException(status_code=404, detail="Teacher not found")

    if not update_data:
        return course

    for key, value in update_data.items():
        setattr(course, key, value)

    db.commit()
    db.refresh(course)
    return course

@app.delete("/api/courses/{course_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_roles("admin"))])
def delete_course(course_id: int, db: Session = Depends(get_db)):
    course = db.query(models.Course).filter(models.Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    db.delete(course)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)

# Review endpoints
@app.get("/api/reviews", response_model=List[schemas.Review])
def get_reviews(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    reviews = db.query(models.Review).offset(skip).limit(limit).all()
    return reviews


@app.get(
    "/api/reviews/moderation-log",
    response_model=List[schemas.Review],
    dependencies=[Depends(require_roles("admin"))],
)
def get_moderation_log(
    teacher_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    query = db.query(models.Review).filter(models.Review.moderation_allowed.is_(False))
    if teacher_id is not None:
        query = query.filter(models.Review.teacher_id == teacher_id)
    reviews = query.order_by(models.Review.created_at.desc()).all()
    return reviews

@app.get("/api/reviews/{review_id}", response_model=schemas.Review)
def get_review(review_id: int, db: Session = Depends(get_db)):
    review = db.query(models.Review).filter(models.Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    return review

@app.get("/api/teachers/{teacher_id}/reviews", response_model=List[schemas.Review])
def get_teacher_reviews(teacher_id: int, db: Session = Depends(get_db)):
    reviews = db.query(models.Review).filter(models.Review.teacher_id == teacher_id).all()
    return reviews

@app.post(
    "/api/reviews/moderate",
    response_model=schemas.ReviewModerationResponse,
    dependencies=[Depends(require_roles("admin", "editor", "viewer"))],
)
async def moderate_review(
    payload: schemas.ReviewModerationRequest,
    db: Session = Depends(get_db),
    moderation_client: ModerationClient = Depends(moderation_dependency),
):
    teacher = db.query(models.Teacher).filter(models.Teacher.id == payload.teacher_id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")

    course = db.query(models.Course).filter(models.Course.id == payload.course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    if course.teacher_id != teacher.id:
        raise HTTPException(status_code=422, detail="Course does not belong to the specified teacher")

    verdict = await moderation_client.evaluate(
        text=payload.text,
        teacher_name=teacher.name,
        course_title=course.name,
    )

    response_payload = schemas.ReviewModerationResponse.from_verdict(verdict)
    if verdict.allowed:
        return response_payload

    raise HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail=response_payload.model_dump(by_alias=True),
    )


@app.post(
    "/api/reviews",
    response_model=schemas.Review,
    dependencies=[Depends(require_roles("admin", "editor", "viewer"))],
)
async def create_review(
    review: schemas.ReviewCreate,
    db: Session = Depends(get_db),
    moderation_client: ModerationClient = Depends(moderation_dependency),
):
    teacher = db.query(models.Teacher).filter(models.Teacher.id == review.teacher_id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")

    course = db.query(models.Course).filter(models.Course.id == review.course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    verdict = await moderation_client.evaluate(
        text=review.description,
        teacher_name=teacher.name,
        course_title=course.name,
    )

    if not verdict.allowed:
        warning = schemas.ReviewModerationResponse.from_verdict(verdict)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=warning.model_dump(by_alias=True),
        )

    db_review = models.Review(**review.dict())
    db_review.moderation_allowed = verdict.allowed
    db_review.moderation_blocked_reasons = verdict.blocked_reasons
    db_review.moderation_scores = verdict.scores
    db_review.moderation_model_version = verdict.model_version
    db_review.moderation_message = verdict.message
    db.add(db_review)
    db.commit()
    db.refresh(db_review)
    return db_review

@app.put("/api/reviews/{review_id}", response_model=schemas.Review, dependencies=[Depends(require_roles("admin", "editor"))])
def update_review(review_id: int, review_update: schemas.ReviewUpdate, db: Session = Depends(get_db)):
    review = db.query(models.Review).filter(models.Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    update_data = review_update.dict(exclude_unset=True)
    if "teacher_id" in update_data:
        new_teacher_id = update_data["teacher_id"]
        if new_teacher_id is None:
            raise HTTPException(status_code=422, detail="teacher_id cannot be null")
        teacher = db.query(models.Teacher).filter(models.Teacher.id == new_teacher_id).first()
        if not teacher:
            raise HTTPException(status_code=404, detail="Teacher not found")

    if "course_id" in update_data:
        new_course_id = update_data["course_id"]
        if new_course_id is None:
            raise HTTPException(status_code=422, detail="course_id cannot be null")
        course = db.query(models.Course).filter(models.Course.id == new_course_id).first()
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")

    if not update_data:
        return review

    for key, value in update_data.items():
        setattr(review, key, value)

    db.commit()
    db.refresh(review)
    return review

@app.delete("/api/reviews/{review_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_roles("admin"))])
def delete_review(review_id: int, db: Session = Depends(get_db)):
    review = db.query(models.Review).filter(models.Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    db.delete(review)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)

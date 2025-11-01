"""
Script to seed the database with sample data for testing
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, engine
from app.models import Base, Teacher, Course, Review

def seed_database():
    # Create tables
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    try:
        # Check if data already exists
        existing_teachers = db.query(Teacher).count()
        if existing_teachers > 0:
            print("Database already contains data. Skipping seed.")
            return
        
        # Create sample teachers
        teachers = [
            Teacher(name="Prof. John Smith", department="Computer Science"),
            Teacher(name="Dr. Maria Garcia", department="Mathematics"),
            Teacher(name="Prof. Robert Johnson", department="Physics"),
        ]
        
        for teacher in teachers:
            db.add(teacher)
        db.commit()
        
        # Refresh to get IDs
        for teacher in teachers:
            db.refresh(teacher)
        
        # Create sample courses
        courses = [
            Course(name="Data Structures", teacher_id=teachers[0].id),
            Course(name="Algorithms", teacher_id=teachers[0].id),
            Course(name="Calculus I", teacher_id=teachers[1].id),
            Course(name="Linear Algebra", teacher_id=teachers[1].id),
            Course(name="Quantum Mechanics", teacher_id=teachers[2].id),
            Course(name="Classical Physics", teacher_id=teachers[2].id),
        ]
        
        for course in courses:
            db.add(course)
        db.commit()
        
        # Refresh to get IDs
        for course in courses:
            db.refresh(course)
        
        # Create sample reviews
        reviews = [
            Review(
                teacher_id=teachers[0].id,
                course_id=courses[0].id,
                rating=5,
                description="Excellent professor! Very clear explanations and helpful during office hours. The course material was challenging but Prof. Smith made it engaging and understandable."
            ),
            Review(
                teacher_id=teachers[0].id,
                course_id=courses[0].id,
                rating=4,
                description="Good teacher overall. Sometimes moves a bit fast through the material, but always willing to answer questions. Fair grading and interesting assignments."
            ),
            Review(
                teacher_id=teachers[0].id,
                course_id=courses[1].id,
                rating=5,
                description="Best algorithms course I've taken! Prof. Smith really knows how to break down complex topics. Highly recommend this course to anyone interested in algorithms."
            ),
            Review(
                teacher_id=teachers[1].id,
                course_id=courses[2].id,
                rating=4,
                description="Dr. Garcia is very knowledgeable and passionate about mathematics. The course is well-structured and the homework helps reinforce the concepts."
            ),
            Review(
                teacher_id=teachers[2].id,
                course_id=courses[4].id,
                rating=3,
                description="The course content is interesting but the lectures can be hard to follow sometimes. More examples would be helpful. Prof. Johnson is approachable during office hours."
            ),
        ]
        
        for review in reviews:
            db.add(review)
        db.commit()
        
        print("✓ Database seeded successfully!")
        print(f"  - Created {len(teachers)} teachers")
        print(f"  - Created {len(courses)} courses")
        print(f"  - Created {len(reviews)} reviews")
        
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()

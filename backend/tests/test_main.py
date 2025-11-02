from fastapi import status

from app import models
from tests.utils import auth_headers, create_course, create_review, create_teacher, create_user


def test_get_teachers_returns_stats(client, session):
    teacher = create_teacher(session, name="Prof. Turing")
    course = create_course(session, teacher, name="Computation")
    create_review(session, teacher, course, rating=5, description="Excellent")
    create_review(session, teacher, course, rating=3, description="Challenging but fair")

    response = client.get("/api/teachers")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) == 1
    record = data[0]
    assert record["name"] == "Prof. Turing"
    assert record["review_count"] == 2
    assert record["average_rating"] == 4.0
    assert record["courses"][0]["name"] == "Computation"


def test_get_teacher_not_found(client):
    response = client.get("/api/teachers/999")
    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert response.json()["detail"] == "Teacher not found"


def test_create_teacher_requires_authentication(client):
    response = client.post("/api/teachers", json={"name": "Dr. No Auth"})
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_create_teacher_requires_admin_or_editor(client, session):
    user = create_user(session, email="viewer@example.com", roles=("viewer",))
    headers = auth_headers(user)
    response = client.post("/api/teachers", json={"name": "Dr. Viewer"}, headers=headers)
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert response.json()["detail"] == "Not enough permissions"


def test_create_teacher_with_admin_role(client, session):
    admin = create_user(session, email="admin@example.com", roles=("admin",))
    headers = auth_headers(admin)
    response = client.post("/api/teachers", json={"name": "Dr. Admin", "department": "Math"}, headers=headers)
    assert response.status_code == status.HTTP_200_OK
    created = response.json()
    assert created["name"] == "Dr. Admin"

    session.expire_all()
    teacher = session.query(models.Teacher).filter_by(name="Dr. Admin").first()
    assert teacher is not None


def test_update_teacher_returns_original_when_no_changes(client, session):
    admin = create_user(session, email="editor@example.com", roles=("editor",))
    teacher = create_teacher(session, name="Dr. Original")
    headers = auth_headers(admin)

    response = client.put(f"/api/teachers/{teacher.id}", json={}, headers=headers)
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["name"] == "Dr. Original"


def test_update_teacher_missing_returns_404(client, session):
    admin = create_user(session, email="editor404@example.com", roles=("editor",))
    headers = auth_headers(admin)
    response = client.put("/api/teachers/12345", json={"name": "Updated"}, headers=headers)
    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_delete_teacher_removes_related_records(client, session):
    admin = create_user(session, email="deleter@example.com", roles=("admin",))
    teacher = create_teacher(session, name="Dr. Delete")
    course = create_course(session, teacher, name="Delete Course")
    create_review(session, teacher, course, rating=4, description="Solid")
    headers = auth_headers(admin)

    response = client.delete(f"/api/teachers/{teacher.id}", headers=headers)
    assert response.status_code == status.HTTP_204_NO_CONTENT

    session.expire_all()
    assert session.query(models.Teacher).count() == 0
    assert session.query(models.Course).count() == 0
    assert session.query(models.Review).count() == 0


def test_create_course_requires_teacher(client, session):
    admin = create_user(session, email="course_admin@example.com", roles=("admin",))
    headers = auth_headers(admin)
    response = client.post("/api/courses", json={"name": "Imaginary", "teacher_id": 999}, headers=headers)
    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert response.json()["detail"] == "Teacher not found"


def test_create_course_success(client, session):
    admin = create_user(session, email="course_creator@example.com", roles=("editor",))
    teacher = create_teacher(session, name="Course Teacher")
    headers = auth_headers(admin)
    response = client.post(
        "/api/courses",
        json={"name": "New Course", "teacher_id": teacher.id},
        headers=headers,
    )
    assert response.status_code == status.HTTP_200_OK
    course = response.json()
    assert course["name"] == "New Course"


def test_update_course_validates_teacher(client, session):
    admin = create_user(session, email="course_update@example.com", roles=("editor",))
    teacher = create_teacher(session, name="Course Owner")
    course = create_course(session, teacher, name="Rewrite Course")
    headers = auth_headers(admin)

    invalid_teacher = client.put(
        f"/api/courses/{course.id}",
        json={"teacher_id": 999},
        headers=headers,
    )
    assert invalid_teacher.status_code == status.HTTP_404_NOT_FOUND
    assert invalid_teacher.json()["detail"] == "Teacher not found"

    null_teacher = client.put(
        f"/api/courses/{course.id}",
        json={"teacher_id": None},
        headers=headers,
    )
    assert null_teacher.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    assert null_teacher.json()["detail"] == "teacher_id cannot be null"


def test_delete_course(client, session):
    admin = create_user(session, email="course_delete@example.com", roles=("admin",))
    teacher = create_teacher(session, name="Delete Course Teacher")
    course = create_course(session, teacher, name="Disposable Course")
    headers = auth_headers(admin)

    response = client.delete(f"/api/courses/{course.id}", headers=headers)
    assert response.status_code == status.HTTP_204_NO_CONTENT
    session.expire_all()
    assert session.query(models.Course).count() == 0


def test_create_review_flow(client, session):
    user = create_user(session, email="reviewer@example.com", roles=("viewer",))
    teacher = create_teacher(session, name="Review Target")
    course = create_course(session, teacher, name="Review Course")
    headers = auth_headers(user, roles=("viewer",))

    payload = {
        "teacher_id": teacher.id,
        "course_id": course.id,
        "rating": 5,
        "description": "Fantastic educator!",
    }
    response = client.post("/api/reviews", json=payload, headers=headers)
    assert response.status_code == status.HTTP_200_OK
    review = response.json()
    assert review["rating"] == 5


def test_create_review_requires_existing_entities(client, session):
    user = create_user(session, email="missing_review@example.com", roles=("viewer",))
    headers = auth_headers(user, roles=("viewer",))
    response = client.post(
        "/api/reviews",
        json={"teacher_id": 999, "course_id": 1, "rating": 4, "description": "No teacher"},
        headers=headers,
    )
    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert response.json()["detail"] == "Teacher not found"


def test_moderate_review_allows_constructive_text(client, session):
    user = create_user(session, email="moderation_ok@example.com", roles=("viewer",))
    teacher = create_teacher(session, name="Helpful Teacher")
    course = create_course(session, teacher, name="Insightful Course")
    headers = auth_headers(user, roles=("viewer",))

    payload = {
        "teacher_id": teacher.id,
        "course_id": course.id,
        "text": "Great explanations and helpful office hours.",
        "rating": 5,
    }

    response = client.post("/api/reviews/moderate", json=payload, headers=headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["allowed"] is True
    assert data["blockedReasons"] == []
    assert data["modelVersion"]


def test_moderate_review_blocks_offensive_text(client, session):
    user = create_user(session, email="moderation_block@example.com", roles=("viewer",))
    teacher = create_teacher(session, name="Strict Teacher")
    course = create_course(session, teacher, name="Hard Course")
    headers = auth_headers(user, roles=("viewer",))

    payload = {
        "teacher_id": teacher.id,
        "course_id": course.id,
        "text": "This professor is an idiot and their class sucks.",
        "rating": 1,
    }

    response = client.post("/api/reviews/moderate", json=payload, headers=headers)
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    detail = response.json()["detail"]
    assert detail["allowed"] is False
    assert "PERSONAL_ATTACK" in detail["blockedReasons"]
    assert detail["message"]


def test_moderate_review_rejects_unsupported_language(client, session):
    user = create_user(session, email="language_block@example.com", roles=("viewer",))
    teacher = create_teacher(session, name="Language Teacher")
    course = create_course(session, teacher, name="Language Course")
    headers = auth_headers(user, roles=("viewer",))

    payload = {
        "teacher_id": teacher.id,
        "course_id": course.id,
        "text": "Este profesor explica muy bien la materia.",
        "rating": 5,
    }

    response = client.post("/api/reviews/moderate", json=payload, headers=headers)
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    detail = response.json()["detail"]
    assert detail["allowed"] is False
    assert "UNSUPPORTED_LANGUAGE" in detail["blockedReasons"]
    assert "English or Italian" in detail["message"]


def test_create_review_rejects_unsupported_language(client, session):
    user = create_user(session, email="language_submit@example.com", roles=("viewer",))
    teacher = create_teacher(session, name="Language Submit Teacher")
    course = create_course(session, teacher, name="Language Submit Course")
    headers = auth_headers(user, roles=("viewer",))

    payload = {
        "teacher_id": teacher.id,
        "course_id": course.id,
        "rating": 4,
        "description": "Este profesor es increíble.",
    }

    response = client.post("/api/reviews", json=payload, headers=headers)
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    detail = response.json()["detail"]
    assert detail["allowed"] is False
    assert "UNSUPPORTED_LANGUAGE" in detail["blockedReasons"]


def test_update_review_validations(client, session):
    admin = create_user(session, email="review_admin@example.com", roles=("admin",))
    teacher = create_teacher(session, name="Review Admin Teacher")
    other_teacher = create_teacher(session, name="Other Teacher")
    course = create_course(session, teacher, name="Review Admin Course")
    other_course = create_course(session, other_teacher, name="Other Course")
    review = create_review(session, teacher, course, rating=4)
    headers = auth_headers(admin)

    missing = client.put(f"/api/reviews/99999", json={"rating": 3}, headers=headers)
    assert missing.status_code == status.HTTP_404_NOT_FOUND

    invalid_teacher = client.put(
        f"/api/reviews/{review.id}",
        json={"teacher_id": 12345},
        headers=headers,
    )
    assert invalid_teacher.status_code == status.HTTP_404_NOT_FOUND

    null_teacher = client.put(
        f"/api/reviews/{review.id}",
        json={"teacher_id": None},
        headers=headers,
    )
    assert null_teacher.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    invalid_course = client.put(
        f"/api/reviews/{review.id}",
        json={"course_id": 54321},
        headers=headers,
    )
    assert invalid_course.status_code == status.HTTP_404_NOT_FOUND

    null_course = client.put(
        f"/api/reviews/{review.id}",
        json={"course_id": None},
        headers=headers,
    )
    assert null_course.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    no_changes = client.put(
        f"/api/reviews/{review.id}",
        json={},
        headers=headers,
    )
    assert no_changes.status_code == status.HTTP_200_OK
    assert no_changes.json()["id"] == review.id

    update = client.put(
        f"/api/reviews/{review.id}",
        json={"rating": 2, "course_id": other_course.id, "teacher_id": other_teacher.id},
        headers=headers,
    )
    assert update.status_code == status.HTTP_200_OK
    body = update.json()
    assert body["rating"] == 2
    assert body["course_id"] == other_course.id
    assert body["teacher_id"] == other_teacher.id


def test_delete_review(client, session):
    admin = create_user(session, email="review_delete@example.com", roles=("admin",))
    teacher = create_teacher(session, name="Review Delete Teacher")
    course = create_course(session, teacher, name="Review Delete Course")
    review = create_review(session, teacher, course, rating=5)
    headers = auth_headers(admin)

    response = client.delete(f"/api/reviews/{review.id}", headers=headers)
    assert response.status_code == status.HTTP_204_NO_CONTENT
    session.expire_all()
    assert session.query(models.Review).count() == 0

import os
from typing import Callable, Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

os.environ.setdefault("DATABASE_URL", "sqlite:///./test_db.sqlite3")
os.environ.setdefault("AUTH_SECRET_KEY", "test-secret-key")
os.environ.setdefault("AUTH_REFRESH_SECRET", "test-refresh-secret")

import app.database as database  # noqa: E402
from app.database import Base, get_db  # noqa: E402

TEST_DATABASE_URL = os.environ["DATABASE_URL"]

engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Point the application database handles at the testing engine/session.
database.engine = engine
database.SessionLocal = TestingSessionLocal

from app.main import app  # noqa: E402


@pytest.fixture(scope="function", autouse=True)
def _prepare_database() -> Generator[None, None, None]:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


@pytest.fixture(scope="function")
def session() -> Generator[Session, None, None]:
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="function")
def client() -> Generator[TestClient, None, None]:
    def override_get_db() -> Generator[Session, None, None]:
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def session_factory() -> Callable[[], Session]:
    return TestingSessionLocal

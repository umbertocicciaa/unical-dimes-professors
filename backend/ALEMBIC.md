# Alembic Workflow

This backend now uses [Alembic](https://alembic.sqlalchemy.org) for database schema migrations. Alembic keeps track of how the database should evolve together with your SQLAlchemy models in `app/models.py`.

## Getting Started

1. Install dependencies from `requirements.txt` inside your virtual environment.
2. Configure the `DATABASE_URL` environment variable (or add it to `.env`) so it matches the database you want to migrate. It defaults to `postgresql://postgres:postgres@localhost:5432/professors_db`.
3. Migrations live in `migrations/versions/`. The current state of the schema is represented by the latest revision.

## Everyday Commands

- `alembic upgrade head` — apply all migrations to reach the most recent schema.
- `alembic downgrade -1` — revert the last applied migration.
- `alembic history` — list all revisions with their identifiers.
- `alembic current` — show which revision your database is currently at.

## Creating New Migrations

Whenever you change the SQLAlchemy models:

1. Make sure the environment can import your changes (activate the venv, export `PYTHONPATH`, etc.).
2. Run `alembic revision --autogenerate -m "describe change"`. Alembic compares `app/models.py` with the current database and writes a draft migration under `migrations/versions/`.
3. Review the generated migration. Pay special attention to defaults, data migrations, and irreversible operations.
4. Apply the migration with `alembic upgrade head`.

If you prefer to write migrations manually, create a new file under `migrations/versions/` with a unique revision ID and implement the `upgrade()` / `downgrade()` functions.

## Using Multiple Environments

- **Local development:** point `DATABASE_URL` to your local PostgreSQL instance.
- **Tests:** you can override `DATABASE_URL` before running test suites to target a temporary database.
- **Production:** ensure the environment running the app (or CI/CD pipeline) applies the migrations via `alembic upgrade head` during deployment.

## Troubleshooting Tips

- If Alembic cannot import `app.database`, confirm that the backend directory is on `PYTHONPATH` (running Alembic from `backend/` takes care of this).
- Autogenerate only sees changes that are expressed in SQLAlchemy models. Pure SQL migrations must be written by hand.
- Revision IDs must be unique. Use a prefix like `0002_add_new_table` to keep them readable while guaranteeing uniqueness.

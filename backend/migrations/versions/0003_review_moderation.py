"""Add moderation metadata columns to reviews."""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "0003_review_moderation"
down_revision = "0002_auth_tables"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "reviews",
        sa.Column("moderation_allowed", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.add_column(
        "reviews",
        sa.Column("moderation_blocked_reasons", sa.JSON(), nullable=True),
    )
    op.add_column(
        "reviews",
        sa.Column("moderation_scores", sa.JSON(), nullable=True),
    )
    op.add_column(
        "reviews",
        sa.Column("moderation_model_version", sa.String(), nullable=True),
    )
    op.add_column(
        "reviews",
        sa.Column("moderation_message", sa.String(), nullable=True),
    )

    op.execute(
        "UPDATE reviews SET moderation_allowed = COALESCE(moderation_allowed, true)"
    )


def downgrade() -> None:
    op.drop_column("reviews", "moderation_message")
    op.drop_column("reviews", "moderation_model_version")
    op.drop_column("reviews", "moderation_scores")
    op.drop_column("reviews", "moderation_blocked_reasons")
    op.drop_column("reviews", "moderation_allowed")


"""Initial Migration

Revision ID: 384dd7fbb2ff
Revises: 
Create Date: 2025-09-08 21:21:04.133753

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '384dd7fbb2ff'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # zones
    op.create_table(
        "zones",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime, server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
    )

    # cameras
    op.create_table(
        "cameras",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("zone_id", sa.Integer, sa.ForeignKey("zones.id", ondelete="SET NULL"), nullable=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("location", sa.String(255), nullable=True),
        sa.Column("source_url", sa.String(1024), nullable=True),
        sa.Column("is_active", sa.Boolean, server_default=sa.text("1"), nullable=False),
        sa.Column("created_at", sa.DateTime, server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
    )

    # detections
    op.create_table(
        "detections",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("camera_id", sa.Integer, sa.ForeignKey("cameras.id", ondelete="CASCADE"), nullable=False),
        sa.Column("event_time", sa.DateTime, nullable=False),
        sa.Column("label", sa.String(128), nullable=True),
        sa.Column("confidence", sa.Float, nullable=True),
        sa.Column("metadata", sa.JSON, nullable=True),
        sa.Column("created_at", sa.DateTime, server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
    )

    # media
    op.create_table(
        "media",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("detection_id", sa.Integer, sa.ForeignKey("detections.id", ondelete="CASCADE"), nullable=False),
        sa.Column("media_type", sa.String(50), nullable=False),  # e.g., "video","image"
        sa.Column("path", sa.String(2048), nullable=False),
        sa.Column("size", sa.BigInteger, nullable=True),
        sa.Column("created_at", sa.DateTime, server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
    )

    # inference_settings
    op.create_table(
        "inference_settings",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("camera_id", sa.Integer, sa.ForeignKey("cameras.id", ondelete="CASCADE"), nullable=True),
        sa.Column("enabled", sa.Boolean, server_default=sa.text("1"), nullable=False),
        sa.Column("threshold", sa.Float, server_default="0.50", nullable=False),
        sa.Column("model_name", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime, server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
    )

    # storage_settings
    op.create_table(
        "storage_settings",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("key", sa.String(255), nullable=False, unique=True),
        sa.Column("value", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime, server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
    )

    # users
    op.create_table(
        "users",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("username", sa.String(150), nullable=False, unique=True),
        sa.Column("email", sa.String(320), nullable=False, unique=True),
        sa.Column("hashed_password", sa.String(1024), nullable=True),
        sa.Column("is_active", sa.Boolean, server_default=sa.text("1"), nullable=False),
        sa.Column("is_superuser", sa.Boolean, server_default=sa.text("0"), nullable=False),
        sa.Column("created_at", sa.DateTime, server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
    )

    # user_device_tokens
    op.create_table(
        "user_device_tokens",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("device_token", sa.String(512), nullable=False),
        sa.Column("platform", sa.String(50), nullable=True),
        sa.Column("created_at", sa.DateTime, server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
    )

    # notification_preferences
    op.create_table(
        "notification_preferences",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("enabled", sa.Boolean, server_default=sa.text("1"), nullable=False),
        sa.Column("channels", sa.JSON, nullable=True),
        sa.Column("created_at", sa.DateTime, server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
    )

    # notification_logs
    op.create_table(
        "notification_logs",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("detection_id", sa.Integer, sa.ForeignKey("detections.id", ondelete="SET NULL"), nullable=True),
        sa.Column("status", sa.String(50), nullable=True),
        sa.Column("payload", sa.Text, nullable=True),
        sa.Column("sent_at", sa.DateTime, server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
    )


def downgrade() -> None:
    """Downgrade schema."""
    # drop in reverse order to respect FK constraints
    op.drop_table("notification_logs")
    op.drop_table("notification_preferences")
    op.drop_table("user_device_tokens")
    op.drop_table("users")
    op.drop_table("storage_settings")
    op.drop_table("inference_settings")
    op.drop_table("media")
    op.drop_table("detections")
    op.drop_table("cameras")
    op.drop_table("zones")

"""initial schema

Revision ID: 0001_initial
Revises:
Create Date: 2026-09-20

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    user_role = sa.Enum("ADMIN", "MANAGER", "OPERATOR", name="user_role")
    product_category = sa.Enum("PIZZA", "HAMBURGUER", "DRINK", "DESSERT", "SIDE", name="product_category")
    product_type = sa.Enum("SIMPLE", "PIZZA_HALF", "PIZZA_QUARTER", "COMBO", name="product_type")
    order_type = sa.Enum("DELIVERY", "TAKEAWAY", "TABLE", name="order_type")
    order_status = sa.Enum(
        "PENDING", "CONFIRMED", "PREPARING", "READY", "DELIVERING", "DELIVERED", "CANCELLED",
        name="order_status",
    )
    payment_method = sa.Enum(
        "CASH", "CREDIT_CARD", "DEBIT_CARD", "PIX", "IFOOD", "MEAL_TICKET", name="payment_method"
    )

    bind = op.get_bind()
    for enum_type in (user_role, product_category, product_type, order_type, order_status, payment_method):
        enum_type.create(bind, checkfirst=True)

    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(150), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("role", user_role, nullable=False, server_default="OPERATOR"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("is_superuser", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "ingredients",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(150), nullable=False),
        sa.Column("unit", sa.String(10), nullable=False, server_default="g"),
        sa.Column("current_stock", sa.Float(), nullable=False, server_default="0"),
        sa.Column("min_stock", sa.Float(), nullable=False, server_default="0"),
        sa.Column("cost_per_unit", sa.Float(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "products",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(150), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("price", sa.Float(), nullable=False),
        sa.Column("cost", sa.Float(), nullable=False, server_default="0"),
        sa.Column("category", product_category, nullable=False, server_default="PIZZA"),
        sa.Column("type", product_type, nullable=False, server_default="SIMPLE"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("image", sa.String(500), nullable=True),
        sa.Column("preparation_time", sa.Integer(), nullable=False, server_default="15"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "product_ingredients",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id", ondelete="CASCADE"), nullable=False),
        sa.Column(
            "ingredient_id", sa.Integer(), sa.ForeignKey("ingredients.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("quantity", sa.Float(), nullable=False),
        sa.Column("unit", sa.String(10), nullable=False, server_default="g"),
    )

    op.create_table(
        "orders",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("number", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("customer_name", sa.String(150), nullable=True),
        sa.Column("customer_phone", sa.String(30), nullable=True),
        sa.Column("customer_address", sa.String(255), nullable=True),
        sa.Column("type", order_type, nullable=False, server_default="DELIVERY"),
        sa.Column("status", order_status, nullable=False, server_default="PENDING"),
        sa.Column("payment_method", payment_method, nullable=False, server_default="CASH"),
        sa.Column("total", sa.Float(), nullable=False),
        sa.Column("discount", sa.Float(), nullable=False, server_default="0"),
        sa.Column("delivery_fee", sa.Float(), nullable=False, server_default="0"),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_orders_number", "orders", ["number"])
    op.create_index("ix_orders_created_at", "orders", ["created_at"])

    op.create_table(
        "order_items",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("order_id", sa.Integer(), sa.ForeignKey("orders.id", ondelete="CASCADE"), nullable=False),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("unit_price", sa.Float(), nullable=False),
        sa.Column("total_price", sa.Float(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("half_flavors", sa.Text(), nullable=True),
    )

    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("action", sa.String(100), nullable=False),
        sa.Column("entity", sa.String(100), nullable=False),
        sa.Column("entity_id", sa.String(50), nullable=True),
        sa.Column("details", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("audit_logs")
    op.drop_table("order_items")
    op.drop_table("orders")
    op.drop_table("product_ingredients")
    op.drop_table("products")
    op.drop_table("ingredients")
    op.drop_table("users")

    bind = op.get_bind()
    for name in ("payment_method", "order_status", "order_type", "product_type", "product_category", "user_role"):
        sa.Enum(name=name).drop(bind, checkfirst=True)

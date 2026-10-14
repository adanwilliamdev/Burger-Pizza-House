"""robustez: número de pedido único, índices, livro-razão de estoque, check de estoque

Revision ID: 0002_robustness
Revises: 0001_initial
Create Date: 2026-10-14

ATENÇÃO: o índice único de orders.number falha se já existirem números
duplicados (a versão anterior tinha uma condição de corrida). Verifique antes:
    SELECT number, count(*) FROM orders GROUP BY number HAVING count(*) > 1;
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002_robustness"
down_revision: Union[str, None] = "0001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Número sequencial nunca pode repetir (rede de segurança do advisory lock).
    op.drop_index("ix_orders_number", table_name="orders")
    op.create_index("ix_orders_number", "orders", ["number"], unique=True)

    # Filtros/relatórios do dashboard e da listagem.
    op.create_index("ix_orders_status_created_at", "orders", ["status", "created_at"])
    op.create_index("ix_order_items_order_id", "order_items", ["order_id"])
    op.create_index("ix_order_items_product_id", "order_items", ["product_id"])
    op.create_index("ix_product_ingredients_product_id", "product_ingredients", ["product_id"])
    op.create_index("ix_product_ingredients_ingredient_id", "product_ingredients", ["ingredient_id"])
    op.create_index("ix_audit_logs_entity", "audit_logs", ["entity", "entity_id"])

    # Estoque nunca negativo. NOT VALID: não reprova dados antigos, mas vale
    # para toda escrita nova (um bug de concorrência passa a dar erro em vez
    # de gravar saldo negativo silenciosamente).
    op.execute(
        "ALTER TABLE ingredients ADD CONSTRAINT ck_ingredients_stock_non_negative "
        "CHECK (current_stock >= 0) NOT VALID"
    )

    op.create_table(
        "stock_movements",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("ingredient_id", sa.Integer(), sa.ForeignKey("ingredients.id", ondelete="CASCADE"), nullable=False),
        sa.Column("order_id", sa.Integer(), sa.ForeignKey("orders.id", ondelete="SET NULL"), nullable=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("delta", sa.Float(), nullable=False),
        sa.Column("reason", sa.String(30), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_stock_movements_ingredient_id", "stock_movements", ["ingredient_id"])
    op.create_index("ix_stock_movements_order_id", "stock_movements", ["order_id"])


def downgrade() -> None:
    op.drop_table("stock_movements")
    op.execute("ALTER TABLE ingredients DROP CONSTRAINT IF EXISTS ck_ingredients_stock_non_negative")
    op.drop_index("ix_audit_logs_entity", table_name="audit_logs")
    op.drop_index("ix_product_ingredients_ingredient_id", table_name="product_ingredients")
    op.drop_index("ix_product_ingredients_product_id", table_name="product_ingredients")
    op.drop_index("ix_order_items_product_id", table_name="order_items")
    op.drop_index("ix_order_items_order_id", table_name="order_items")
    op.drop_index("ix_orders_status_created_at", table_name="orders")
    op.drop_index("ix_orders_number", table_name="orders")
    op.create_index("ix_orders_number", "orders", ["number"])

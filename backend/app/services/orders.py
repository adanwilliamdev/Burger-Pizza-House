"""
Regras de negócio de pedidos. Separado das rotas para ser testável.

Garantias:
- Estoque nunca é vendido além do saldo, mesmo com pedidos simultâneos: as
  linhas de `ingredients` são travadas (SELECT ... FOR UPDATE, sempre em ordem
  de id para evitar deadlock) ANTES de validar o saldo.
- Número do pedido sequencial e sem repetição (advisory lock da transação +
  índice único no banco).
- Cancelar um pedido devolve ao estoque exatamente o que ele consumiu
  (via livro-razão `stock_movements`).
- Tudo (pedido, itens, baixa, movimentos, auditoria) numa única transação.
"""
import json
from collections import defaultdict

from sqlalchemy import select, text, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.money import round_money
from app.db.redis import invalidate_dashboard_cache
from app.models.catalog import Ingredient, Product, ProductIngredient
from app.models.order import AuditLog, Order, OrderItem, OrderStatus, StockMovement
from app.models.user import User
from app.schemas.order import OrderCreate
from app.services.stock import aggregate_required, find_shortages

# Chave arbitrária (constante) do advisory lock que serializa a geração do número do pedido.
_ORDER_NUMBER_LOCK_KEY = 726_001


class OrderError(Exception):
    """Erro de negócio "normal" (não é bug) — vira uma resposta HTTP para o usuário."""

    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class InsufficientStockError(OrderError):
    """Falta estoque de algum ingrediente para atender TODOS os itens do pedido."""

    def __init__(self, shortages: list[dict]):
        super().__init__("Estoque insuficiente para um ou mais ingredientes", status_code=409)
        self.shortages = shortages


async def _load_recipes(db: AsyncSession, product_ids: set[int]) -> dict[int, list[tuple[int, float]]]:
    recipes: dict[int, list[tuple[int, float]]] = defaultdict(list)
    if not product_ids:
        return recipes
    result = await db.execute(select(ProductIngredient).where(ProductIngredient.product_id.in_(product_ids)))
    for pi in result.scalars().all():
        recipes[pi.product_id].append((pi.ingredient_id, pi.quantity))
    return recipes


async def _lock_ingredients(db: AsyncSession, ingredient_ids) -> dict[int, Ingredient]:
    """Trava as linhas na ordem do id (ordem fixa = sem deadlock entre pedidos concorrentes)."""
    ids = sorted(set(ingredient_ids))
    if not ids:
        return {}
    result = await db.execute(
        select(Ingredient)
        .where(Ingredient.id.in_(ids))
        .order_by(Ingredient.id)
        .with_for_update()
        .execution_options(populate_existing=True)
    )
    return {ing.id: ing for ing in result.scalars().all()}


async def create_order(db: AsyncSession, *, user: User, data: OrderCreate) -> Order:
    if not data.items:
        raise OrderError("O pedido precisa ter ao menos um item")

    # --- produtos: 1 query para todos os itens (antes eram N)
    product_ids = {item.product_id for item in data.items}
    result = await db.execute(select(Product).where(Product.id.in_(product_ids)))
    products = {p.id: p for p in result.scalars().all()}

    total = 0.0
    items_to_create: list[dict] = []
    for item in data.items:
        product = products.get(item.product_id)
        if product is None:
            raise OrderError("Produto não encontrado", status_code=404)
        if not product.is_active:
            raise OrderError(f'Produto "{product.name}" não está mais disponível')

        total_price = round_money(product.price * item.quantity)
        total = round_money(total + total_price)
        items_to_create.append({
            "product_id": product.id,
            "quantity": item.quantity,
            "unit_price": product.price,
            "total_price": total_price,
            "notes": item.notes or None,
            "half_flavors": json.dumps(item.half_flavors) if item.half_flavors else None,
        })

    subtotal = total
    if data.discount > subtotal:
        raise OrderError("O desconto não pode ser maior que o subtotal do pedido")
    total = round_money(subtotal - data.discount + data.delivery_fee)

    # --- estoque: soma por ingrediente, trava as linhas e só então valida
    recipes = await _load_recipes(db, product_ids)
    required = aggregate_required(((i.product_id, i.quantity) for i in data.items), recipes)

    locked = await _lock_ingredients(db, required.keys())
    shortages = find_shortages(
        required,
        available={iid: ing.current_stock for iid, ing in locked.items()},
        names={iid: ing.name for iid, ing in locked.items()},
    )
    if shortages:
        await db.rollback()  # libera os locks imediatamente
        raise InsufficientStockError(shortages)

    # --- número sequencial: advisory lock vale até o commit/rollback
    await db.execute(text("SELECT pg_advisory_xact_lock(:key)"), {"key": _ORDER_NUMBER_LOCK_KEY})
    last_number = (await db.execute(select(Order.number).order_by(Order.number.desc()).limit(1))).scalar()
    number = (last_number or 0) + 1

    order = Order(
        number=number,
        user_id=user.id,
        customer_name=data.customer_name or None,
        customer_phone=data.customer_phone or None,
        customer_address=data.customer_address or None,
        type=data.type,
        payment_method=data.payment_method,
        total=total,
        discount=data.discount,
        delivery_fee=data.delivery_fee,
        note=data.note or None,
        status=OrderStatus.PENDING,
    )
    db.add(order)
    await db.flush()  # garante order.id

    db.add_all([OrderItem(order_id=order.id, **item_data) for item_data in items_to_create])

    for ingredient_id, amount in required.items():
        await db.execute(
            update(Ingredient)
            .where(Ingredient.id == ingredient_id)
            .values(current_stock=Ingredient.current_stock - amount)
        )
        db.add(StockMovement(
            ingredient_id=ingredient_id, order_id=order.id, user_id=user.id, delta=-amount, reason="ORDER"
        ))

    db.add(AuditLog(
        user_id=user.id,
        action="CREATE_ORDER",
        entity="Order",
        entity_id=str(order.id),
        details=f"Pedido #{number} criado — total {total:.2f}",
    ))

    await db.commit()
    await db.refresh(order)
    await invalidate_dashboard_cache()
    return order


async def _restore_stock_for_order(db: AsyncSession, *, order: Order, user: User) -> None:
    """Devolve ao estoque o que o pedido consumiu, conforme o livro-razão."""
    result = await db.execute(
        select(StockMovement).where(StockMovement.order_id == order.id, StockMovement.reason == "ORDER")
    )
    consumed: dict[int, float] = defaultdict(float)
    for movement in result.scalars().all():
        consumed[movement.ingredient_id] += -movement.delta  # delta é negativo na saída

    await _lock_ingredients(db, consumed.keys())
    for ingredient_id, amount in sorted(consumed.items()):
        await db.execute(
            update(Ingredient)
            .where(Ingredient.id == ingredient_id)
            .values(current_stock=Ingredient.current_stock + amount)
        )
        db.add(StockMovement(
            ingredient_id=ingredient_id, order_id=order.id, user_id=user.id,
            delta=amount, reason="ORDER_CANCEL",
        ))


async def update_order_status(db: AsyncSession, *, order: Order, new_status: OrderStatus, user: User) -> Order:
    # Relê o pedido com lock: dois "cancelar" simultâneos não podem devolver o estoque duas vezes.
    await db.refresh(order, with_for_update=True)

    if new_status not in order.allowed_next_statuses():
        await db.rollback()
        raise OrderError(
            f'Não é possível mudar o status de "{order.status.value}" para "{new_status.value}"',
            status_code=409,
        )

    old_status = order.status
    order.status = new_status
    db.add(order)

    if new_status == OrderStatus.CANCELLED:
        await _restore_stock_for_order(db, order=order, user=user)

    db.add(AuditLog(
        user_id=user.id,
        action="UPDATE_ORDER_STATUS",
        entity="Order",
        entity_id=str(order.id),
        details=f"Status alterado de {old_status.value} para {new_status.value}",
    ))

    await db.commit()
    await db.refresh(order)
    await invalidate_dashboard_cache()
    return order

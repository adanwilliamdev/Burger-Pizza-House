"""
Regras de negócio de pedidos — conversão direta de `orders/services.py`
(Django), que por sua vez espelhava o `OrderController` do backend
Node/Express original. Mantido separado das rotas para ficar fácil de
testar isoladamente.
"""
import json

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.money import round_money
from app.models.catalog import Ingredient, Product, ProductIngredient
from app.models.order import AuditLog, Order, OrderItem, OrderStatus
from app.models.user import User
from app.schemas.order import OrderCreate


class OrderError(Exception):
    """Erro de negócio "normal" (não é bug) — vira uma resposta HTTP para o usuário."""

    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class InsufficientStockError(OrderError):
    """
    Levantado quando não há estoque suficiente de algum ingrediente para
    atender TODOS os itens do pedido (somando o mesmo ingrediente quando
    ele aparece em produtos diferentes do carrinho).
    """

    def __init__(self, shortages: list[dict]):
        super().__init__("Estoque insuficiente para um ou mais ingredientes", status_code=409)
        self.shortages = shortages


async def create_order(db: AsyncSession, *, user: User, data: OrderCreate) -> Order:
    """
    Espelha o `create_order` original: calcula o total, valida desconto e
    estoque de ingredientes ANTES de gravar qualquer coisa, e só então cria
    o pedido e baixa o estoque — tudo dentro de uma única transação.
    """
    if not data.items:
        raise OrderError("O pedido precisa ter ao menos um item")

    total = 0.0
    items_to_create: list[dict] = []

    for item in data.items:
        product = await db.get(Product, item.product_id)
        if product is None:
            raise OrderError("Produto não encontrado", status_code=404)
        if not product.is_active:
            raise OrderError(f'Produto "{product.name}" não está mais disponível')

        unit_price = product.price
        total_price = round_money(unit_price * item.quantity)
        total = round_money(total + total_price)

        items_to_create.append({
            "product_id": product.id,
            "quantity": item.quantity,
            "unit_price": unit_price,
            "total_price": total_price,
            "notes": item.notes or None,
            "half_flavors": json.dumps(item.half_flavors) if item.half_flavors else None,
        })

    subtotal = total
    if data.discount > subtotal:
        raise OrderError("O desconto não pode ser maior que o subtotal do pedido")

    total = round_money(subtotal - data.discount + data.delivery_fee)

    # Soma a quantidade necessária de cada ingrediente em TODOS os itens do
    # pedido antes de decidir se dá para confirmar — evita vender além do
    # estoque quando o mesmo ingrediente aparece em produtos diferentes.
    required_by_ingredient: dict[int, float] = {}
    for item in data.items:
        result = await db.execute(
            select(ProductIngredient).where(ProductIngredient.product_id == item.product_id)
        )
        for pi in result.scalars().all():
            needed = pi.quantity * item.quantity
            required_by_ingredient[pi.ingredient_id] = required_by_ingredient.get(pi.ingredient_id, 0) + needed

    if required_by_ingredient:
        result = await db.execute(
            select(Ingredient).where(Ingredient.id.in_(required_by_ingredient.keys()))
        )
        ingredients = {ing.id: ing for ing in result.scalars().all()}
        shortages = []
        for ingredient_id, required in required_by_ingredient.items():
            ingredient = ingredients.get(ingredient_id)
            available = ingredient.current_stock if ingredient else 0
            if available < required:
                shortages.append({
                    "ingredient_id": ingredient_id,
                    "ingredient_name": ingredient.name if ingredient else str(ingredient_id),
                    "required": required,
                    "available": available,
                })
        if shortages:
            raise InsufficientStockError(shortages)

    # Número sequencial do pedido. `with_for_update()` trava a última linha
    # (equivalente ao `select_for_update` do Django) para que duas
    # transações concorrentes não recebam o mesmo número.
    result = await db.execute(select(Order).order_by(Order.number.desc()).limit(1).with_for_update())
    last_order = result.scalars().first()
    number = (last_order.number if last_order else 0) + 1

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
    await db.flush()  # garante order.id antes de criar os itens

    db.add_all([OrderItem(order_id=order.id, **item_data) for item_data in items_to_create])

    # Baixa o estoque — já validamos acima que há saldo suficiente para
    # todos os ingredientes.
    for ingredient_id, amount in required_by_ingredient.items():
        await db.execute(
            update(Ingredient)
            .where(Ingredient.id == ingredient_id)
            .values(current_stock=Ingredient.current_stock - amount)
        )

    await db.commit()
    await db.refresh(order)
    return order


async def update_order_status(db: AsyncSession, *, order: Order, new_status: OrderStatus, user: User) -> Order:
    allowed_next = order.allowed_next_statuses()
    if new_status not in allowed_next:
        raise OrderError(
            f'Não é possível mudar o status de "{order.status.value}" para "{new_status.value}"',
            status_code=409,
        )

    old_status = order.status
    order.status = new_status
    db.add(order)

    db.add(AuditLog(
        user_id=user.id,
        action="UPDATE_ORDER_STATUS",
        entity="Order",
        entity_id=str(order.id),
        details=f"Status alterado de {old_status.value} para {new_status.value}",
    ))

    await db.commit()
    await db.refresh(order)
    return order


async def next_order_number(db: AsyncSession) -> int:
    result = await db.execute(select(func.max(Order.number)))
    return (result.scalar() or 0) + 1

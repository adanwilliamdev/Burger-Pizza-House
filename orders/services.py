"""
Regras de negócio de pedidos — a conversão direta do `OrderController` do
backend Node/Express original (create, updateStatus). Mantido separado das
views para ficar fácil de testar isoladamente.
"""
import json

from django.db import transaction
from django.db.models import F

from catalog.models import Ingredient, Product, ProductIngredient
from common.money import round_money

from .models import AuditLog, Order, OrderItem


class OrderError(Exception):
    """Erro de negócio "normal" (não é bug) — vira uma mensagem para o usuário."""

    def __init__(self, message, status=400):
        super().__init__(message)
        self.message = message
        self.status = status


class InsufficientStockError(OrderError):
    """
    Levantado quando não há estoque suficiente de algum ingrediente para
    atender TODOS os itens do pedido (somando o mesmo ingrediente quando
    ele aparece em produtos diferentes do carrinho).
    """

    def __init__(self, shortages):
        super().__init__("Estoque insuficiente para um ou mais ingredientes", status=409)
        self.shortages = shortages


@transaction.atomic
def create_order(*, user, customer_name, customer_phone, customer_address,
                  order_type, payment_method, items, discount=0.0,
                  delivery_fee=0.0, note=None):
    """
    items: lista de dicts {product_id, quantity, notes, half_flavors}
    Espelha o método `OrderController.create` original: calcula o total,
    valida desconto e estoque de ingredientes ANTES de gravar qualquer
    coisa, e só então cria o pedido e baixa o estoque — tudo dentro de uma
    única transação atômica.
    """
    if not items:
        raise OrderError("O pedido precisa ter ao menos um item")

    total = 0.0
    items_to_create = []

    for item in items:
        try:
            product = Product.objects.get(id=item["product_id"])
        except Product.DoesNotExist:
            raise OrderError("Produto não encontrado", status=404)

        if not product.is_active:
            raise OrderError(f'Produto "{product.name}" não está mais disponível')

        quantity = item["quantity"]
        unit_price = product.price
        total_price = round_money(unit_price * quantity)
        total = round_money(total + total_price)

        items_to_create.append({
            "product": product,
            "quantity": quantity,
            "unit_price": unit_price,
            "total_price": total_price,
            "notes": item.get("notes") or None,
            "half_flavors": json.dumps(item["half_flavors"]) if item.get("half_flavors") else None,
        })

    subtotal = total
    if discount > subtotal:
        raise OrderError("O desconto não pode ser maior que o subtotal do pedido")

    total = round_money(subtotal - discount + delivery_fee)

    # Soma a quantidade necessária de cada ingrediente em TODOS os itens do
    # pedido antes de decidir se dá para confirmar — evita vender além do
    # estoque quando o mesmo ingrediente aparece em produtos diferentes.
    required_by_ingredient = {}
    for item in items:
        product_ingredients = ProductIngredient.objects.filter(product_id=item["product_id"])
        for pi in product_ingredients:
            needed = pi.quantity * item["quantity"]
            required_by_ingredient[pi.ingredient_id] = (
                required_by_ingredient.get(pi.ingredient_id, 0) + needed
            )

    if required_by_ingredient:
        ingredients = {
            ing.id: ing
            for ing in Ingredient.objects.filter(id__in=required_by_ingredient.keys())
        }
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

    # Número sequencial do pedido, calculado dentro da mesma transação
    # (SQLite serializa transações de escrita, o que evita duas ordens
    # concorrentes recebendo o mesmo número).
    last_order = Order.objects.select_for_update().order_by("-number").first()
    number = (last_order.number if last_order else 0) + 1

    order = Order.objects.create(
        number=number,
        user=user,
        customer_name=customer_name or None,
        customer_phone=customer_phone or None,
        customer_address=customer_address or None,
        type=order_type,
        payment_method=payment_method,
        total=total,
        discount=discount,
        delivery_fee=delivery_fee,
        note=note or None,
        status=Order.Status.PENDING,
    )

    OrderItem.objects.bulk_create([
        OrderItem(order=order, **data) for data in items_to_create
    ])

    # Baixa o estoque — já validamos acima que há saldo suficiente para
    # todos os ingredientes.
    for ingredient_id, amount in required_by_ingredient.items():
        Ingredient.objects.filter(id=ingredient_id).update(
            current_stock=F("current_stock") - amount
        )

    return order


@transaction.atomic
def update_order_status(*, order, new_status, user):
    allowed_next = order.allowed_next_statuses()
    if new_status not in allowed_next:
        raise OrderError(
            f'Não é possível mudar o status de "{order.get_status_display()}" para "{new_status}"',
            status=409,
        )

    old_status = order.status
    order.status = new_status
    order.save(update_fields=["status", "updated_at"])

    AuditLog.objects.create(
        user=user,
        action="UPDATE_ORDER_STATUS",
        entity="Order",
        entity_id=str(order.id),
        details=f"Status alterado de {old_status} para {new_status}",
    )
    return order

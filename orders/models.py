from django.conf import settings
from django.db import models


class Order(models.Model):
    class OrderType(models.TextChoices):
        DELIVERY = "DELIVERY", "Entrega"
        TAKEAWAY = "TAKEAWAY", "Retirada"
        TABLE = "TABLE", "Mesa"

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pendente"
        CONFIRMED = "CONFIRMED", "Confirmado"
        PREPARING = "PREPARING", "Preparando"
        READY = "READY", "Pronto"
        DELIVERING = "DELIVERING", "Saiu para entrega"
        DELIVERED = "DELIVERED", "Entregue"
        CANCELLED = "CANCELLED", "Cancelado"

    class PaymentMethod(models.TextChoices):
        CASH = "CASH", "Dinheiro"
        CREDIT_CARD = "CREDIT_CARD", "Cartão de crédito"
        DEBIT_CARD = "DEBIT_CARD", "Cartão de débito"
        PIX = "PIX", "Pix"
        IFOOD = "IFOOD", "iFood"
        MEAL_TICKET = "MEAL_TICKET", "Vale-refeição"

    # Transições de status permitidas — um pedido só avança no fluxo (ou é
    # cancelado a partir de um estado não terminal); nunca "volta" ou pula
    # etapas, e nada muda a partir de um estado terminal.
    STATUS_TRANSITIONS = {
        Status.PENDING: [Status.CONFIRMED, Status.CANCELLED],
        Status.CONFIRMED: [Status.PREPARING, Status.CANCELLED],
        Status.PREPARING: [Status.READY, Status.CANCELLED],
        Status.READY: [Status.DELIVERING, Status.DELIVERED, Status.CANCELLED],
        Status.DELIVERING: [Status.DELIVERED, Status.CANCELLED],
        Status.DELIVERED: [],
        Status.CANCELLED: [],
    }

    number = models.PositiveIntegerField("Número")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, related_name="orders", on_delete=models.PROTECT, verbose_name="Atendente"
    )
    customer_name = models.CharField("Cliente", max_length=150, blank=True, null=True)
    customer_phone = models.CharField("Telefone", max_length=30, blank=True, null=True)
    customer_address = models.CharField("Endereço", max_length=255, blank=True, null=True)
    type = models.CharField("Tipo", max_length=20, choices=OrderType.choices, default=OrderType.DELIVERY)
    status = models.CharField("Status", max_length=20, choices=Status.choices, default=Status.PENDING)
    payment_method = models.CharField(
        "Forma de pagamento", max_length=20, choices=PaymentMethod.choices, default=PaymentMethod.CASH
    )
    total = models.FloatField("Total")
    discount = models.FloatField("Desconto", default=0)
    delivery_fee = models.FloatField("Taxa de entrega", default=0)
    note = models.TextField("Observações", blank=True, null=True)
    created_at = models.DateTimeField("Criado em", auto_now_add=True)
    updated_at = models.DateTimeField("Atualizado em", auto_now=True)

    class Meta:
        verbose_name = "Pedido"
        verbose_name_plural = "Pedidos"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Pedido #{self.number}"

    def allowed_next_statuses(self):
        return self.STATUS_TRANSITIONS.get(self.status, [])

    def subtotal(self):
        return round(self.total - self.delivery_fee + self.discount, 2)


class OrderItem(models.Model):
    order = models.ForeignKey(Order, related_name="items", on_delete=models.CASCADE)
    product = models.ForeignKey("catalog.Product", related_name="order_items", on_delete=models.PROTECT)
    quantity = models.PositiveIntegerField("Quantidade")
    unit_price = models.FloatField("Preço unitário")
    total_price = models.FloatField("Preço total")
    notes = models.TextField("Observações", blank=True, null=True)
    half_flavors = models.TextField("Sabores (meia pizza)", blank=True, null=True)

    class Meta:
        verbose_name = "Item do pedido"
        verbose_name_plural = "Itens do pedido"

    def __str__(self):
        return f"{self.quantity}x {self.product.name}"

    def half_flavors_list(self):
        import json
        if not self.half_flavors:
            return []
        try:
            return json.loads(self.half_flavors)
        except (ValueError, TypeError):
            return []


class AuditLog(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, verbose_name="Usuário")
    action = models.CharField("Ação", max_length=100)
    entity = models.CharField("Entidade", max_length=100)
    entity_id = models.CharField("ID da entidade", max_length=50, blank=True, null=True)
    details = models.TextField("Detalhes", blank=True, null=True)
    created_at = models.DateTimeField("Criado em", auto_now_add=True)

    class Meta:
        verbose_name = "Log de auditoria"
        verbose_name_plural = "Logs de auditoria"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.action} — {self.entity} ({self.created_at})"

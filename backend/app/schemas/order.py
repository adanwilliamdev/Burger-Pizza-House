from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.order import OrderStatus, OrderType, PaymentMethod


class OrderItemIn(BaseModel):
    product_id: int
    quantity: int = Field(gt=0)
    notes: str | None = None
    half_flavors: list[str] = []


class OrderCreate(BaseModel):
    customer_name: str | None = None
    customer_phone: str | None = None
    customer_address: str | None = None
    type: OrderType = OrderType.DELIVERY
    payment_method: PaymentMethod = PaymentMethod.CASH
    items: list[OrderItemIn]
    discount: float = Field(default=0, ge=0)
    delivery_fee: float = Field(default=0, ge=0)
    note: str | None = None


class OrderStatusUpdate(BaseModel):
    status: OrderStatus


class OrderItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    product_name: str
    quantity: int
    unit_price: float
    total_price: float
    notes: str | None = None
    half_flavors: list[str] = []


class OrderUserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str


class OrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    number: int
    user: OrderUserOut
    customer_name: str | None = None
    customer_phone: str | None = None
    customer_address: str | None = None
    type: OrderType
    status: OrderStatus
    payment_method: PaymentMethod
    total: float
    discount: float
    delivery_fee: float
    subtotal: float
    note: str | None = None
    created_at: datetime
    updated_at: datetime
    items: list[OrderItemOut] = []
    allowed_next_statuses: list[OrderStatus] = []


class StockShortage(BaseModel):
    ingredient_id: int
    ingredient_name: str
    required: float
    available: float

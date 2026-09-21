from pydantic import BaseModel

from app.schemas.order import OrderOut


class TopProduct(BaseModel):
    id: int
    name: str
    price: float
    total_sold: int


class RevenueByDay(BaseModel):
    date: str
    revenue: float


class DashboardSummary(BaseModel):
    total_orders: int
    total_revenue: float
    pending_orders: int
    low_stock: int
    today_orders: int
    today_revenue: float
    top_products: list[TopProduct]
    revenue_by_day: list[RevenueByDay]
    max_revenue: float
    recent_orders: list[OrderOut]
    days: int

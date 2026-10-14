import json
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, Query
from sqlalchemy import and_, func, literal_column, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user
from app.api.routes.orders import _serialize as serialize_order
from app.core.config import settings
from app.core.money import round_money
from app.db.redis import DASHBOARD_CACHE_PREFIX, cache_get, cache_set
from app.db.session import get_db
from app.models.catalog import Ingredient, Product
from app.models.order import Order, OrderItem, OrderStatus
from app.models.user import User
from app.schemas.dashboard import DashboardSummary

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

# O cache é invalidado a cada pedido criado/alterado (ver services/orders.py);
# o TTL é só uma rede de segurança.
CACHE_TTL_SECONDS = 60

_OPEN_STATUSES = [OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.PREPARING]


@router.get("", response_model=DashboardSummary)
async def dashboard(
    days: int = Query(default=7),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    days = min(90, max(1, days))

    cache_key = f"{DASHBOARD_CACHE_PREFIX}{days}"
    cached = await cache_get(cache_key)
    if cached:
        return json.loads(cached)

    # "Hoje" e o agrupamento por dia usam o fuso do negócio, não UTC — senão
    # pedidos feitos às 22h em São Paulo cairiam no "dia seguinte".
    tz = ZoneInfo(settings.business_timezone)
    today_local = datetime.now(tz).replace(hour=0, minute=0, second=0, microsecond=0)
    today_start = today_local.astimezone(timezone.utc)
    tomorrow_start = (today_local + timedelta(days=1)).astimezone(timezone.utc)
    window_start = (today_local - timedelta(days=days - 1)).astimezone(timezone.utc)

    in_today = and_(Order.created_at >= today_start, Order.created_at < tomorrow_start)
    delivered = Order.status == OrderStatus.DELIVERED

    # Todos os totais em UMA query (antes eram 5).
    stats = (
        await db.execute(
            select(
                func.count(Order.id),
                func.coalesce(func.sum(Order.total).filter(delivered), 0),
                func.count(Order.id).filter(Order.status.in_(_OPEN_STATUSES)),
                func.count(Order.id).filter(in_today),
                func.coalesce(func.sum(Order.total).filter(and_(delivered, in_today)), 0),
            )
        )
    ).one()
    total_orders, total_revenue, pending_orders, today_orders, today_revenue = stats

    low_stock = (
        await db.execute(select(func.count(Ingredient.id)).where(Ingredient.current_stock <= Ingredient.min_stock))
    ).scalar() or 0

    # Mais vendidos: pedidos cancelados não contam.
    top_products_result = await db.execute(
        select(
            OrderItem.product_id,
            Product.name,
            Product.price,
            func.sum(OrderItem.quantity).label("total_sold"),
        )
        .join(Product, Product.id == OrderItem.product_id)
        .join(Order, Order.id == OrderItem.order_id)
        .where(Order.status != OrderStatus.CANCELLED)
        .group_by(OrderItem.product_id, Product.name, Product.price)
        .order_by(func.sum(OrderItem.quantity).desc())
        .limit(5)
    )
    top_products = [
        {"id": row.product_id, "name": row.name, "price": row.price, "total_sold": int(row.total_sold)}
        for row in top_products_result.all()
    ]

    # Faturamento diário: 1 query agrupada (antes eram até 90, uma por dia).
    # O nome do fuso entra como literal (já validado pelo ZoneInfo acima, vem do .env): com
    # parâmetro bind, o SELECT e o GROUP BY teriam placeholders diferentes ($1 vs $3) e o
    # Postgres recusaria a query ("must appear in the GROUP BY clause").
    tz_literal = literal_column("'" + str(tz.key).replace("'", "") + "'")
    local_day = func.date(func.timezone(tz_literal, Order.created_at))
    rows = await db.execute(
        select(local_day.label("day"), func.sum(Order.total))
        .where(delivered, Order.created_at >= window_start, Order.created_at < tomorrow_start)
        .group_by(local_day)
    )
    revenue_map = {row[0]: row[1] for row in rows.all()}
    first_day = today_local.date() - timedelta(days=days - 1)
    revenue_by_day = []
    for offset in range(days):
        day = first_day + timedelta(days=offset)
        revenue_by_day.append({"date": day.isoformat(), "revenue": round_money(revenue_map.get(day) or 0)})

    recent_orders = (
        (
            await db.execute(
                select(Order)
                .options(selectinload(Order.user), selectinload(Order.items).selectinload(OrderItem.product))
                .order_by(Order.created_at.desc())
                .limit(5)
            )
        )
        .scalars()
        .unique()
        .all()
    )

    summary = {
        "total_orders": total_orders,
        "total_revenue": round_money(total_revenue),
        "pending_orders": pending_orders,
        "low_stock": low_stock,
        "today_orders": today_orders,
        "today_revenue": round_money(today_revenue),
        "top_products": top_products,
        "revenue_by_day": revenue_by_day,
        "max_revenue": max((d["revenue"] for d in revenue_by_day), default=0) or 1,
        "recent_orders": [serialize_order(o) for o in recent_orders],
        "days": days,
    }

    await cache_set(cache_key, json.dumps(summary, default=str), ex=CACHE_TTL_SECONDS)
    return summary

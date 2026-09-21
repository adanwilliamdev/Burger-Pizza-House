import json
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user
from app.core.money import round_money
from app.db.redis import get_redis
from app.db.session import get_db
from app.models.catalog import Ingredient
from app.models.order import Order, OrderItem, OrderStatus
from app.models.user import User
from app.schemas.dashboard import DashboardSummary

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

CACHE_TTL_SECONDS = 30


@router.get("", response_model=DashboardSummary)
async def dashboard(
    days: int = Query(default=7),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    # Faturamento diário — janela configurável pela query string `days`
    # (1 a 90), igual ao backend original.
    days = min(90, max(1, days))

    redis = get_redis()
    cache_key = f"dashboard:summary:{days}"
    cached = await redis.get(cache_key)
    if cached:
        return json.loads(cached)

    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow_start = today_start + timedelta(days=1)

    total_orders = (await db.execute(select(func.count(Order.id)))).scalar() or 0

    total_revenue = round_money(
        (
            await db.execute(
                select(func.sum(Order.total)).where(Order.status == OrderStatus.DELIVERED)
            )
        ).scalar()
        or 0
    )

    pending_orders = (
        await db.execute(
            select(func.count(Order.id)).where(
                Order.status.in_([OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.PREPARING])
            )
        )
    ).scalar() or 0

    ingredients = (await db.execute(select(Ingredient))).scalars().all()
    low_stock = sum(1 for i in ingredients if i.is_low_stock())

    today_orders = (
        await db.execute(
            select(func.count(Order.id)).where(
                Order.created_at >= today_start, Order.created_at < tomorrow_start
            )
        )
    ).scalar() or 0

    today_revenue = round_money(
        (
            await db.execute(
                select(func.sum(Order.total)).where(
                    Order.status == OrderStatus.DELIVERED,
                    Order.created_at >= today_start,
                    Order.created_at < tomorrow_start,
                )
            )
        ).scalar()
        or 0
    )

    from app.models.catalog import Product

    top_products_stmt = (
        select(
            OrderItem.product_id,
            Product.name,
            Product.price,
            func.sum(OrderItem.quantity).label("total_sold"),
        )
        .join(Product, Product.id == OrderItem.product_id)
        .group_by(OrderItem.product_id, Product.name, Product.price)
        .order_by(func.sum(OrderItem.quantity).desc())
        .limit(5)
    )
    top_products_result = await db.execute(top_products_stmt)
    top_products = [
        {"id": row.product_id, "name": row.name, "price": row.price, "total_sold": row.total_sold}
        for row in top_products_result.all()
    ]

    revenue_by_day = []
    for i in range(days - 1, -1, -1):
        day_start = today_start - timedelta(days=i)
        day_end = day_start + timedelta(days=1)
        day_revenue = round_money(
            (
                await db.execute(
                    select(func.sum(Order.total)).where(
                        Order.status == OrderStatus.DELIVERED,
                        Order.created_at >= day_start,
                        Order.created_at < day_end,
                    )
                )
            ).scalar()
            or 0
        )
        revenue_by_day.append({"date": day_start.date().isoformat(), "revenue": day_revenue})

    recent_orders_stmt = (
        select(Order)
        .options(selectinload(Order.user), selectinload(Order.items).selectinload(OrderItem.product))
        .order_by(Order.created_at.desc())
        .limit(5)
    )
    recent_orders_result = await db.execute(recent_orders_stmt)
    recent_orders = recent_orders_result.scalars().unique().all()

    max_revenue = max((d["revenue"] for d in revenue_by_day), default=0) or 1

    from app.api.routes.orders import _serialize as serialize_order

    summary = {
        "total_orders": total_orders,
        "total_revenue": total_revenue,
        "pending_orders": pending_orders,
        "low_stock": low_stock,
        "today_orders": today_orders,
        "today_revenue": today_revenue,
        "top_products": top_products,
        "revenue_by_day": revenue_by_day,
        "max_revenue": max_revenue,
        "recent_orders": [serialize_order(o) for o in recent_orders],
        "days": days,
    }

    await redis.set(cache_key, json.dumps(summary, default=str), ex=CACHE_TTL_SECONDS)
    return summary

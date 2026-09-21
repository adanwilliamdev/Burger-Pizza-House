from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.order import Order, OrderItem, OrderStatus, OrderType
from app.models.user import User
from app.schemas.order import OrderCreate, OrderOut, OrderStatusUpdate
from app.services.orders import InsufficientStockError, OrderError, create_order, update_order_status

router = APIRouter(prefix="/orders", tags=["orders"])


def _serialize(order: Order) -> dict:
    data = OrderOut.model_validate(order).model_dump()
    data["user"] = {"id": order.user.id, "name": order.user.name, "email": order.user.email}
    data["subtotal"] = order.subtotal()
    data["allowed_next_statuses"] = order.allowed_next_statuses()
    data["items"] = [
        {
            "id": item.id,
            "product_id": item.product_id,
            "product_name": item.product.name,
            "quantity": item.quantity,
            "unit_price": item.unit_price,
            "total_price": item.total_price,
            "notes": item.notes,
            "half_flavors": item.half_flavors_list(),
        }
        for item in order.items
    ]
    return data


@router.get("", response_model=list[OrderOut])
async def list_orders(
    status_filter: OrderStatus | None = Query(default=None, alias="status"),
    type_filter: OrderType | None = Query(default=None, alias="type"),
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    stmt = (
        select(Order)
        .options(selectinload(Order.user), selectinload(Order.items).selectinload(OrderItem.product))
        .order_by(Order.created_at.desc())
    )
    if status_filter:
        stmt = stmt.where(Order.status == status_filter)
    if type_filter:
        stmt = stmt.where(Order.type == type_filter)
    if start_date:
        stmt = stmt.where(Order.created_at >= start_date)
    if end_date:
        stmt = stmt.where(Order.created_at < date.fromordinal(end_date.toordinal() + 1))
    stmt = stmt.limit(500)

    result = await db.execute(stmt)
    orders = result.scalars().unique().all()
    return [_serialize(o) for o in orders]


@router.post("", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
async def create_order_route(
    payload: OrderCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        order = await create_order(db, user=user, data=payload)
    except InsufficientStockError as exc:
        raise HTTPException(status_code=exc.status_code, detail={"message": exc.message, "shortages": exc.shortages})
    except OrderError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message)

    return await _get_full(db, order.id)


@router.get("/{order_id}", response_model=OrderOut)
async def get_order(
    order_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    order = await _get_full(db, order_id)
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pedido não encontrado.")
    return order


@router.post("/{order_id}/status", response_model=OrderOut)
async def update_status_route(
    order_id: int,
    payload: OrderStatusUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    stmt = select(Order).where(Order.id == order_id)
    result = await db.execute(stmt)
    order = result.scalars().first()
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pedido não encontrado.")

    try:
        order = await update_order_status(db, order=order, new_status=payload.status, user=user)
    except OrderError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message)

    return await _get_full(db, order.id)


async def _get_full(db: AsyncSession, order_id: int) -> dict | None:
    stmt = (
        select(Order)
        .where(Order.id == order_id)
        .options(selectinload(Order.user), selectinload(Order.items).selectinload(OrderItem.product))
    )
    result = await db.execute(stmt)
    order = result.scalars().first()
    if order is None:
        return None
    return _serialize(order)

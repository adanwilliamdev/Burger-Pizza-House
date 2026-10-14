from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin, get_current_user
from app.db.session import get_db
from app.db.redis import invalidate_dashboard_cache
from app.models.catalog import Ingredient, ProductIngredient
from app.models.order import AuditLog, StockMovement
from app.models.user import User
from app.schemas.catalog import IngredientCreate, IngredientOut, IngredientUpdate, StockAdjust

router = APIRouter(prefix="/ingredients", tags=["ingredients"])


@router.get("", response_model=list[IngredientOut])
async def list_ingredients(
    low_stock: bool = Query(default=False),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    stmt = select(Ingredient).order_by(Ingredient.name)
    if low_stock:
        stmt = stmt.where(Ingredient.current_stock <= Ingredient.min_stock)  # filtra no banco
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("", response_model=IngredientOut, status_code=status.HTTP_201_CREATED)
async def create_ingredient(
    payload: IngredientCreate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    ingredient = Ingredient(**payload.model_dump())
    db.add(ingredient)
    await db.commit()
    await db.refresh(ingredient)
    return ingredient


@router.get("/{ingredient_id}", response_model=IngredientOut)
async def get_ingredient(
    ingredient_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    ingredient = await db.get(Ingredient, ingredient_id)
    if ingredient is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ingrediente não encontrado.")
    return ingredient


@router.put("/{ingredient_id}", response_model=IngredientOut)
async def update_ingredient(
    ingredient_id: int,
    payload: IngredientUpdate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    ingredient = await db.get(Ingredient, ingredient_id)
    if ingredient is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ingrediente não encontrado.")
    for field, value in payload.model_dump().items():
        setattr(ingredient, field, value)
    await db.commit()
    await db.refresh(ingredient)
    return ingredient


@router.post("/{ingredient_id}/stock", response_model=IngredientOut)
async def adjust_stock(
    ingredient_id: int,
    payload: StockAdjust,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    # Trava a linha: um ajuste manual não pode se sobrepor a uma baixa de pedido em andamento.
    result = await db.execute(select(Ingredient).where(Ingredient.id == ingredient_id).with_for_update())
    ingredient = result.scalars().first()
    if ingredient is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ingrediente não encontrado.")

    if payload.operation == "remove" and ingredient.current_stock < payload.quantity:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Quantidade a remover ({payload.quantity}) é maior que o estoque atual "
                f"({ingredient.current_stock})."
            ),
        )

    delta = payload.quantity if payload.operation == "add" else -payload.quantity
    ingredient.current_stock += delta
    db.add(StockMovement(
        ingredient_id=ingredient.id, user_id=admin.id, delta=delta,
        reason="MANUAL_ADD" if delta > 0 else "MANUAL_REMOVE",
    ))
    db.add(AuditLog(
        user_id=admin.id, action="ADJUST_STOCK", entity="Ingredient", entity_id=str(ingredient.id),
        details=f"{ingredient.name}: {delta:+g} {ingredient.unit}",
    ))

    await db.commit()
    await db.refresh(ingredient)
    await invalidate_dashboard_cache()  # contagem de "estoque baixo" mudou
    return ingredient


@router.delete("/{ingredient_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_ingredient(
    ingredient_id: int,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    ingredient = await db.get(Ingredient, ingredient_id)
    if ingredient is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ingrediente não encontrado.")

    usage_count = (
        await db.execute(
            select(func.count(ProductIngredient.id)).where(ProductIngredient.ingredient_id == ingredient_id)
        )
    ).scalar() or 0
    if usage_count > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Este ingrediente é usado em {usage_count} receita(s) de produto e não pode "
                "ser excluído. Remova-o das receitas primeiro."
            ),
        )

    await db.delete(ingredient)
    await db.commit()

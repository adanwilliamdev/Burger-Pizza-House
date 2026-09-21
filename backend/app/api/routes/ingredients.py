from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin, get_current_user
from app.db.session import get_db
from app.models.catalog import Ingredient, ProductIngredient
from app.models.user import User
from app.schemas.catalog import IngredientCreate, IngredientOut, IngredientUpdate, StockAdjust

router = APIRouter(prefix="/ingredients", tags=["ingredients"])


@router.get("", response_model=list[IngredientOut])
async def list_ingredients(
    low_stock: bool = Query(default=False),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    result = await db.execute(select(Ingredient).order_by(Ingredient.name))
    ingredients = result.scalars().all()
    if low_stock:
        ingredients = [i for i in ingredients if i.is_low_stock()]
    return ingredients


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
    _admin: User = Depends(get_current_admin),
):
    ingredient = await db.get(Ingredient, ingredient_id)
    if ingredient is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ingrediente não encontrado.")

    if payload.operation == "remove" and ingredient.current_stock < payload.quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Quantidade a remover ({payload.quantity}) é maior que o estoque atual "
                f"({ingredient.current_stock})."
            ),
        )

    if payload.operation == "add":
        ingredient.current_stock += payload.quantity
    else:
        ingredient.current_stock -= payload.quantity

    await db.commit()
    await db.refresh(ingredient)
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

    result = await db.execute(
        select(ProductIngredient).where(ProductIngredient.ingredient_id == ingredient_id)
    )
    usage_count = len(result.scalars().all())
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

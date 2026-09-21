from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_admin, get_current_user
from app.db.session import get_db
from app.models.catalog import Category, Product, ProductIngredient
from app.models.order import OrderItem
from app.models.user import User
from app.schemas.catalog import ProductCreate, ProductOut, ProductUpdate

router = APIRouter(prefix="/products", tags=["products"])


def _serialize(product: Product) -> dict:
    data = ProductOut.model_validate(product).model_dump()
    data["ingredients"] = [
        {
            "id": pi.id,
            "ingredient_id": pi.ingredient_id,
            "ingredient_name": pi.ingredient.name,
            "quantity": pi.quantity,
            "unit": pi.unit,
        }
        for pi in product.ingredients
    ]
    return data


@router.get("", response_model=list[ProductOut])
async def list_products(
    category: Category | None = Query(default=None),
    is_active: bool | None = Query(default=True),
    q: str | None = Query(default=None, alias="q"),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    stmt = select(Product).options(selectinload(Product.ingredients).selectinload(ProductIngredient.ingredient))
    if category:
        stmt = stmt.where(Product.category == category)
    if is_active is not None:
        stmt = stmt.where(Product.is_active == is_active)
    if q:
        stmt = stmt.where(Product.name.ilike(f"%{q}%"))
    # Mesmo raciocínio do backend original: um cardápio real não passa de
    # algumas centenas de itens, então um teto simples evita crescimento
    # descontrolado sem precisar de paginação de verdade.
    stmt = stmt.order_by(Product.name).limit(500)

    result = await db.execute(stmt)
    products = result.scalars().unique().all()
    return [_serialize(p) for p in products]


@router.post("", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
async def create_product(
    payload: ProductCreate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    data = payload.model_dump(exclude={"ingredients"})
    product = Product(**data)
    db.add(product)
    await db.flush()

    for ing in payload.ingredients:
        db.add(ProductIngredient(
            product_id=product.id,
            ingredient_id=ing.ingredient_id,
            quantity=ing.quantity,
            unit=ing.unit,
        ))

    await db.commit()
    return await _get_full(db, product.id)


@router.get("/{product_id}", response_model=ProductOut)
async def get_product(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    product = await _get_full(db, product_id)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Produto não encontrado.")
    return product


@router.put("/{product_id}", response_model=ProductOut)
async def update_product(
    product_id: int,
    payload: ProductUpdate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    product = await db.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Produto não encontrado.")

    for field, value in payload.model_dump(exclude={"ingredients"}).items():
        setattr(product, field, value)

    # Substitui a receita inteira — mesmo comportamento do formset Django
    # original (as linhas antigas somem, as novas são recriadas).
    result = await db.execute(select(ProductIngredient).where(ProductIngredient.product_id == product_id))
    for pi in result.scalars().all():
        await db.delete(pi)
    await db.flush()

    for ing in payload.ingredients:
        db.add(ProductIngredient(
            product_id=product.id,
            ingredient_id=ing.ingredient_id,
            quantity=ing.quantity,
            unit=ing.unit,
        ))

    await db.commit()
    return await _get_full(db, product.id)


@router.delete("/{product_id}", status_code=status.HTTP_200_OK)
async def delete_product(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    product = await db.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Produto não encontrado.")

    result = await db.execute(select(OrderItem).where(OrderItem.product_id == product_id))
    order_item_count = len(result.scalars().all())

    if order_item_count > 0:
        # Produto já apareceu em algum pedido: apagar de verdade destruiria
        # o histórico desses pedidos. Em vez disso, desativamos — o
        # produto some do cardápio, mas os pedidos antigos continuam íntegros.
        product.is_active = False
        await db.commit()
        return {
            "deactivated": True,
            "message": f'Produto "{product.name}" possui pedidos associados; foi desativado em vez de excluído.',
        }

    await db.delete(product)
    await db.commit()
    return {"deactivated": False, "message": f'Produto "{product.name}" excluído com sucesso.'}


async def _get_full(db: AsyncSession, product_id: int) -> dict | None:
    stmt = (
        select(Product)
        .where(Product.id == product_id)
        .options(selectinload(Product.ingredients).selectinload(ProductIngredient.ingredient))
    )
    result = await db.execute(stmt)
    product = result.scalars().first()
    if product is None:
        return None
    return _serialize(product)

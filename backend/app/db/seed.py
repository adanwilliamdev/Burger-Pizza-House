"""
Popula o banco com dados iniciais (equivalente ao `catalog/management/commands/seed.py`
do backend Django, que por sua vez espelhava o `backend/src/seed.ts` original).

Uso:
    python -m app.db.seed
"""
import asyncio

from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import AsyncSessionLocal
from app.models.catalog import Category, Ingredient, Product, ProductIngredient
from app.models.user import Role, User


async def get_or_create_ingredient(db, name: str, **defaults) -> Ingredient:
    result = await db.execute(select(Ingredient).where(Ingredient.name == name))
    ingredient = result.scalars().first()
    if ingredient is None:
        ingredient = Ingredient(name=name, **defaults)
        db.add(ingredient)
        await db.flush()
    else:
        for key, value in defaults.items():
            setattr(ingredient, key, value)
    return ingredient


async def get_or_create_product(db, name: str, **defaults) -> Product:
    result = await db.execute(select(Product).where(Product.name == name))
    product = result.scalars().first()
    if product is None:
        product = Product(name=name, **defaults)
        db.add(product)
        await db.flush()
    else:
        for key, value in defaults.items():
            setattr(product, key, value)
    return product


async def set_recipe(db, product: Product, entries: list[tuple[Ingredient, float, str]]) -> None:
    result = await db.execute(select(ProductIngredient).where(ProductIngredient.product_id == product.id))
    for pi in result.scalars().all():
        await db.delete(pi)
    await db.flush()
    for ingredient, quantity, unit in entries:
        db.add(ProductIngredient(product_id=product.id, ingredient_id=ingredient.id, quantity=quantity, unit=unit))


async def run() -> None:
    print("🌱 Iniciando seed...")
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == "admin@burgerpizzahouse.com"))
        admin = result.scalars().first()
        if admin is None:
            admin = User(
                name="Administrador",
                email="admin@burgerpizzahouse.com",
                role=Role.ADMIN,
                is_superuser=True,
                hashed_password=hash_password("admin123"),
            )
            db.add(admin)
            await db.flush()
        print(f"✅ Admin: {admin.email} (senha: admin123)")

        farinha = await get_or_create_ingredient(
            db, "Farinha", unit="kg", current_stock=50, min_stock=10, cost_per_unit=3.50
        )
        queijo = await get_or_create_ingredient(
            db, "Queijo Mussarela", unit="kg", current_stock=30, min_stock=8, cost_per_unit=25.00
        )
        molho = await get_or_create_ingredient(
            db, "Molho de Tomate", unit="L", current_stock=20, min_stock=5, cost_per_unit=8.00
        )
        carne = await get_or_create_ingredient(
            db, "Carne Moída", unit="kg", current_stock=15, min_stock=5, cost_per_unit=32.00
        )
        print("✅ Ingredientes criados")

        margherita = await get_or_create_product(
            db, "Pizza Margherita",
            description="Molho de tomate, mussarela, manjericão",
            price=45.90, cost=15.00, category=Category.PIZZA, preparation_time=20,
        )
        await set_recipe(db, margherita, [
            (farinha, 0.5, "kg"),
            (queijo, 0.3, "kg"),
            (molho, 0.2, "L"),
        ])

        await get_or_create_product(
            db, "Pizza Calabresa",
            description="Molho de tomate, mussarela, calabresa, cebola",
            price=49.90, cost=18.00, category=Category.PIZZA, preparation_time=20,
        )

        classico = await get_or_create_product(
            db, "Hambúrguer Clássico",
            description="Pão, carne, queijo, alface, tomate",
            price=32.90, cost=12.00, category=Category.HAMBURGUER, preparation_time=15,
        )
        await set_recipe(db, classico, [
            (queijo, 0.1, "kg"),
            (carne, 0.2, "kg"),
        ])
        print("✅ Produtos criados")

        await db.commit()
        print("🎉 Seed concluída com sucesso!")


if __name__ == "__main__":
    asyncio.run(run())

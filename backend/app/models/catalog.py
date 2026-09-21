import enum
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class Category(str, enum.Enum):
    PIZZA = "PIZZA"
    HAMBURGUER = "HAMBURGUER"
    DRINK = "DRINK"
    DESSERT = "DESSERT"
    SIDE = "SIDE"


class ProductType(str, enum.Enum):
    SIMPLE = "SIMPLE"
    PIZZA_HALF = "PIZZA_HALF"
    PIZZA_QUARTER = "PIZZA_QUARTER"
    COMBO = "COMBO"


class Ingredient(Base):
    __tablename__ = "ingredients"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(150))
    unit: Mapped[str] = mapped_column(String(10), default="g")
    current_stock: Mapped[float] = mapped_column(Float, default=0)
    min_stock: Mapped[float] = mapped_column(Float, default=0)
    cost_per_unit: Mapped[float] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    product_ingredients: Mapped[list["ProductIngredient"]] = relationship(back_populates="ingredient")

    def is_low_stock(self) -> bool:
        return self.current_stock <= self.min_stock


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(150))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    price: Mapped[float] = mapped_column(Float)
    cost: Mapped[float] = mapped_column(Float, default=0)
    category: Mapped[Category] = mapped_column(Enum(Category, name="product_category"), default=Category.PIZZA)
    type: Mapped[ProductType] = mapped_column(Enum(ProductType, name="product_type"), default=ProductType.SIMPLE)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    image: Mapped[str | None] = mapped_column(String(500), nullable=True)
    preparation_time: Mapped[int] = mapped_column(Integer, default=15)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    ingredients: Mapped[list["ProductIngredient"]] = relationship(
        back_populates="product", cascade="all, delete-orphan"
    )


class ProductIngredient(Base):
    """Receita: quanto de cada ingrediente um produto consome."""

    __tablename__ = "product_ingredients"

    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"))
    ingredient_id: Mapped[int] = mapped_column(ForeignKey("ingredients.id", ondelete="CASCADE"))
    quantity: Mapped[float] = mapped_column(Float)
    unit: Mapped[str] = mapped_column(String(10), default="g")

    product: Mapped["Product"] = relationship(back_populates="ingredients")
    ingredient: Mapped["Ingredient"] = relationship(back_populates="product_ingredients")

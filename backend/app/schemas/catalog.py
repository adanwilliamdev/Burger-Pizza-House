from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.catalog import Category, ProductType


# --------------------------------------------------------------- Ingredient

class IngredientBase(BaseModel):
    name: str
    unit: str = "g"
    current_stock: float = Field(default=0, ge=0)
    min_stock: float = Field(default=0, ge=0)
    cost_per_unit: float = Field(ge=0)


class IngredientCreate(IngredientBase):
    pass


class IngredientUpdate(IngredientBase):
    pass


class IngredientOut(IngredientBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
    is_low_stock: bool = False

    @field_validator("is_low_stock", mode="before")
    @classmethod
    def _compute_low_stock(cls, value):  # noqa: ANN001
        # O model SQLAlchemy expõe `is_low_stock()` como método (mesmo
        # nome do model Django original); resolvemos aqui para virar um
        # campo booleano simples na resposta da API.
        return value() if callable(value) else value


class StockAdjust(BaseModel):
    operation: Literal["add", "remove"]
    quantity: float = Field(gt=0)


# ------------------------------------------------------------------ Product

class ProductIngredientIn(BaseModel):
    ingredient_id: int
    quantity: float = Field(gt=0)
    unit: str = "g"


class ProductIngredientOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ingredient_id: int
    ingredient_name: str
    quantity: float
    unit: str


class ProductBase(BaseModel):
    name: str
    description: str | None = None
    price: float = Field(ge=0)
    cost: float = Field(default=0, ge=0)
    category: Category = Category.PIZZA
    type: ProductType = ProductType.SIMPLE
    is_active: bool = True
    image: str | None = None
    preparation_time: int = 15


class ProductCreate(ProductBase):
    ingredients: list[ProductIngredientIn] = []


class ProductUpdate(ProductBase):
    ingredients: list[ProductIngredientIn] = []


class ProductOut(ProductBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
    ingredients: list[ProductIngredientOut] = []

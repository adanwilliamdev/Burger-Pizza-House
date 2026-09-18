from django.db import models


class Ingredient(models.Model):
    name = models.CharField("Nome", max_length=150)
    unit = models.CharField("Unidade", max_length=10, default="g")
    current_stock = models.FloatField("Estoque atual", default=0)
    min_stock = models.FloatField("Estoque mínimo", default=0)
    cost_per_unit = models.FloatField("Custo por unidade")
    created_at = models.DateTimeField("Criado em", auto_now_add=True)
    updated_at = models.DateTimeField("Atualizado em", auto_now=True)

    class Meta:
        verbose_name = "Ingrediente"
        verbose_name_plural = "Ingredientes"
        ordering = ["name"]

    def __str__(self):
        return self.name

    def is_low_stock(self):
        return self.current_stock <= self.min_stock


class Product(models.Model):
    class Category(models.TextChoices):
        PIZZA = "PIZZA", "Pizza"
        HAMBURGUER = "HAMBURGUER", "Hambúrguer"
        DRINK = "DRINK", "Bebida"
        DESSERT = "DESSERT", "Sobremesa"
        SIDE = "SIDE", "Acompanhamento"

    class Type(models.TextChoices):
        SIMPLE = "SIMPLE", "Simples"
        PIZZA_HALF = "PIZZA_HALF", "Meia Pizza"
        PIZZA_QUARTER = "PIZZA_QUARTER", "Pizza em 1/4"
        COMBO = "COMBO", "Combo"

    name = models.CharField("Nome", max_length=150)
    description = models.TextField("Descrição", blank=True, null=True)
    price = models.FloatField("Preço")
    cost = models.FloatField("Custo", default=0, blank=True, null=True)
    category = models.CharField(
        "Categoria", max_length=20, choices=Category.choices, default=Category.PIZZA
    )
    type = models.CharField("Tipo", max_length=20, choices=Type.choices, default=Type.SIMPLE)
    is_active = models.BooleanField("Ativo", default=True)
    image = models.CharField("Imagem (URL)", max_length=500, blank=True, null=True)
    preparation_time = models.PositiveIntegerField("Tempo de preparo (min)", default=15)
    created_at = models.DateTimeField("Criado em", auto_now_add=True)
    updated_at = models.DateTimeField("Atualizado em", auto_now=True)

    class Meta:
        verbose_name = "Produto"
        verbose_name_plural = "Produtos"
        ordering = ["name"]

    def __str__(self):
        return self.name


class ProductIngredient(models.Model):
    """Receita: quanto de cada ingrediente um produto consome."""

    product = models.ForeignKey(Product, related_name="ingredients", on_delete=models.CASCADE)
    ingredient = models.ForeignKey(
        Ingredient, related_name="product_ingredients", on_delete=models.CASCADE
    )
    quantity = models.FloatField("Quantidade")
    unit = models.CharField("Unidade", max_length=10, default="g")

    class Meta:
        verbose_name = "Ingrediente do produto"
        verbose_name_plural = "Ingredientes do produto"

    def __str__(self):
        return f"{self.product.name} — {self.ingredient.name} ({self.quantity}{self.unit})"

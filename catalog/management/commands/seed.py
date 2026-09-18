from django.core.management.base import BaseCommand

from accounts.models import User
from catalog.models import Ingredient, Product, ProductIngredient


class Command(BaseCommand):
    help = "Popula o banco com dados iniciais (equivalente ao backend/src/seed.ts original)."

    def handle(self, *args, **options):
        self.stdout.write("🌱 Iniciando seed...")

        admin, created = User.objects.get_or_create(
            email="admin@burgerpizzahouse.com",
            defaults={"name": "Administrador", "role": User.Role.ADMIN, "is_staff": True, "is_superuser": True},
        )
        if created:
            admin.set_password("admin123")
            admin.save()
        self.stdout.write(self.style.SUCCESS(f"✅ Admin: {admin.email} (senha: admin123)"))

        farinha, _ = Ingredient.objects.update_or_create(
            name="Farinha", defaults={"unit": "kg", "current_stock": 50, "min_stock": 10, "cost_per_unit": 3.50}
        )
        queijo, _ = Ingredient.objects.update_or_create(
            name="Queijo Mussarela", defaults={"unit": "kg", "current_stock": 30, "min_stock": 8, "cost_per_unit": 25.00}
        )
        molho, _ = Ingredient.objects.update_or_create(
            name="Molho de Tomate", defaults={"unit": "L", "current_stock": 20, "min_stock": 5, "cost_per_unit": 8.00}
        )
        carne, _ = Ingredient.objects.update_or_create(
            name="Carne Moída", defaults={"unit": "kg", "current_stock": 15, "min_stock": 5, "cost_per_unit": 32.00}
        )
        self.stdout.write(self.style.SUCCESS("✅ Ingredientes criados"))

        margherita, _ = Product.objects.update_or_create(
            name="Pizza Margherita",
            defaults={
                "description": "Molho de tomate, mussarela, manjericão",
                "price": 45.90, "cost": 15.00, "category": Product.Category.PIZZA, "preparation_time": 20,
            },
        )
        ProductIngredient.objects.filter(product=margherita).delete()
        ProductIngredient.objects.bulk_create([
            ProductIngredient(product=margherita, ingredient=farinha, quantity=0.5, unit="kg"),
            ProductIngredient(product=margherita, ingredient=queijo, quantity=0.3, unit="kg"),
            ProductIngredient(product=margherita, ingredient=molho, quantity=0.2, unit="L"),
        ])

        Product.objects.update_or_create(
            name="Pizza Calabresa",
            defaults={
                "description": "Molho de tomate, mussarela, calabresa, cebola",
                "price": 49.90, "cost": 18.00, "category": Product.Category.PIZZA, "preparation_time": 20,
            },
        )

        classico, _ = Product.objects.update_or_create(
            name="Hambúrguer Clássico",
            defaults={
                "description": "Pão, carne, queijo, alface, tomate",
                "price": 32.90, "cost": 12.00, "category": Product.Category.HAMBURGUER, "preparation_time": 15,
            },
        )
        ProductIngredient.objects.filter(product=classico).delete()
        ProductIngredient.objects.bulk_create([
            ProductIngredient(product=classico, ingredient=queijo, quantity=0.1, unit="kg"),
            ProductIngredient(product=classico, ingredient=carne, quantity=0.2, unit="kg"),
        ])

        self.stdout.write(self.style.SUCCESS("✅ Produtos criados"))
        self.stdout.write(self.style.SUCCESS("🎉 Seed concluída com sucesso!"))

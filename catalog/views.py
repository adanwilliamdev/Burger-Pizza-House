from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.db.models import ProtectedError
from django.shortcuts import get_object_or_404, redirect, render
from django.views.decorators.http import require_POST

from common.decorators import admin_required
from orders.models import OrderItem

from .forms import IngredientForm, ProductForm, ProductIngredientFormSet, StockAdjustForm
from .models import Ingredient, Product, ProductIngredient


# ---------------------------------------------------------------- Produtos

@login_required
def product_list(request):
    category = request.GET.get("category") or ""
    is_active = request.GET.get("is_active", "true")
    search = request.GET.get("q") or ""

    products = Product.objects.all().prefetch_related("ingredients__ingredient")
    if category:
        products = products.filter(category=category)
    if is_active in ("true", "false"):
        products = products.filter(is_active=(is_active == "true"))
    if search:
        products = products.filter(name__icontains=search)

    # Mesmo raciocínio do backend original: um cardápio real não passa de
    # algumas centenas de itens, então um teto simples evita crescimento
    # descontrolado sem precisar de paginação de verdade.
    products = products[:500]

    return render(request, "catalog/product_list.html", {
        "products": products,
        "categories": Product.Category.choices,
        "selected_category": category,
        "selected_is_active": is_active,
        "search": search,
    })


@login_required
def product_detail(request, pk):
    product = get_object_or_404(
        Product.objects.prefetch_related("ingredients__ingredient"), pk=pk
    )
    return render(request, "catalog/product_detail.html", {"product": product})


@admin_required
def product_create(request):
    if request.method == "POST":
        form = ProductForm(request.POST)
        if form.is_valid():
            product = form.save()
            formset = ProductIngredientFormSet(request.POST, instance=product)
            if formset.is_valid():
                formset.save()
                messages.success(request, f'Produto "{product.name}" criado com sucesso.')
                return redirect("catalog:product_list")
        else:
            formset = ProductIngredientFormSet(request.POST)
    else:
        form = ProductForm()
        formset = ProductIngredientFormSet()

    return render(request, "catalog/product_form.html", {
        "form": form, "formset": formset, "is_new": True,
    })


@admin_required
def product_update(request, pk):
    product = get_object_or_404(Product, pk=pk)
    if request.method == "POST":
        form = ProductForm(request.POST, instance=product)
        formset = ProductIngredientFormSet(request.POST, instance=product)
        if form.is_valid() and formset.is_valid():
            form.save()
            formset.save()
            messages.success(request, f'Produto "{product.name}" atualizado com sucesso.')
            return redirect("catalog:product_list")
    else:
        form = ProductForm(instance=product)
        formset = ProductIngredientFormSet(instance=product)

    return render(request, "catalog/product_form.html", {
        "form": form, "formset": formset, "product": product, "is_new": False,
    })


@admin_required
@require_POST
def product_delete(request, pk):
    product = get_object_or_404(Product, pk=pk)

    order_item_count = OrderItem.objects.filter(product_id=pk).count()
    if order_item_count > 0:
        # Produto já apareceu em algum pedido: apagar de verdade destruiria
        # o histórico desses pedidos. Em vez disso, desativamos — o
        # produto some do cardápio, mas os pedidos antigos continuam
        # íntegros.
        product.is_active = False
        product.save(update_fields=["is_active"])
        messages.warning(
            request,
            f'Produto "{product.name}" possui pedidos associados; foi desativado em vez de excluído.',
        )
    else:
        product.delete()
        messages.success(request, f'Produto "{product.name}" excluído com sucesso.')

    return redirect("catalog:product_list")


# ------------------------------------------------------------- Ingredientes

@login_required
def ingredient_list(request):
    ingredients = Ingredient.objects.all()
    low_stock_only = request.GET.get("low_stock") == "1"
    if low_stock_only:
        ingredients = [i for i in ingredients if i.is_low_stock()]
    return render(request, "catalog/ingredient_list.html", {
        "ingredients": ingredients, "low_stock_only": low_stock_only,
    })


@admin_required
def ingredient_create(request):
    if request.method == "POST":
        form = IngredientForm(request.POST)
        if form.is_valid():
            ingredient = form.save()
            messages.success(request, f'Ingrediente "{ingredient.name}" criado com sucesso.')
            return redirect("catalog:ingredient_list")
    else:
        form = IngredientForm()
    return render(request, "catalog/ingredient_form.html", {"form": form, "is_new": True})


@admin_required
def ingredient_update(request, pk):
    ingredient = get_object_or_404(Ingredient, pk=pk)
    if request.method == "POST":
        form = IngredientForm(request.POST, instance=ingredient)
        if form.is_valid():
            form.save()
            messages.success(request, f'Ingrediente "{ingredient.name}" atualizado com sucesso.')
            return redirect("catalog:ingredient_list")
    else:
        form = IngredientForm(instance=ingredient)
    return render(request, "catalog/ingredient_form.html", {
        "form": form, "ingredient": ingredient, "is_new": False,
    })


@admin_required
@require_POST
def ingredient_stock_update(request, pk):
    ingredient = get_object_or_404(Ingredient, pk=pk)
    form = StockAdjustForm(request.POST)
    if form.is_valid():
        quantity = form.cleaned_data["quantity"]
        operation = form.cleaned_data["operation"]
        if operation == "remove" and ingredient.current_stock < quantity:
            messages.error(
                request,
                f"Quantidade a remover ({quantity}) é maior que o estoque atual "
                f"({ingredient.current_stock}).",
            )
        else:
            if operation == "add":
                ingredient.current_stock += quantity
            else:
                ingredient.current_stock -= quantity
            ingredient.save(update_fields=["current_stock", "updated_at"])
            messages.success(request, "Estoque atualizado com sucesso.")
    else:
        messages.error(request, "Dados inválidos para ajuste de estoque.")
    return redirect("catalog:ingredient_list")


@admin_required
@require_POST
def ingredient_delete(request, pk):
    ingredient = get_object_or_404(Ingredient, pk=pk)
    usage_count = ProductIngredient.objects.filter(ingredient_id=pk).count()
    if usage_count > 0:
        messages.error(
            request,
            f"Este ingrediente é usado em {usage_count} receita(s) de produto e não pode "
            "ser excluído. Remova-o das receitas primeiro.",
        )
    else:
        ingredient.delete()
        messages.success(request, f'Ingrediente "{ingredient.name}" excluído com sucesso.')
    return redirect("catalog:ingredient_list")

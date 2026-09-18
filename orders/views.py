from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.shortcuts import get_object_or_404, redirect, render
from django.views.decorators.http import require_POST

from catalog.models import Product

from .cart import Cart
from .forms import AddCartItemForm, CheckoutForm, OrderStatusForm
from .models import Order
from .services import InsufficientStockError, OrderError, create_order, update_order_status


@login_required
def order_list(request):
    status = request.GET.get("status") or ""
    order_type = request.GET.get("type") or ""
    start_date = request.GET.get("start_date") or ""
    end_date = request.GET.get("end_date") or ""

    orders = Order.objects.select_related("user").prefetch_related("items__product")
    if status:
        orders = orders.filter(status=status)
    if order_type:
        orders = orders.filter(type=order_type)
    if start_date:
        orders = orders.filter(created_at__date__gte=start_date)
    if end_date:
        orders = orders.filter(created_at__date__lte=end_date)

    orders = orders[:500]

    return render(request, "orders/order_list.html", {
        "orders": orders,
        "statuses": Order.Status.choices,
        "types": Order.OrderType.choices,
        "selected_status": status,
        "selected_type": order_type,
        "start_date": start_date,
        "end_date": end_date,
    })


@login_required
def order_detail(request, pk):
    order = get_object_or_404(
        Order.objects.select_related("user").prefetch_related("items__product"), pk=pk
    )
    status_form = OrderStatusForm(initial={"status": order.status})
    next_status_choices = [
        (value, Order.Status(value).label) for value in order.allowed_next_statuses()
    ]
    return render(request, "orders/order_detail.html", {
        "order": order, "status_form": status_form, "next_status_choices": next_status_choices,
    })


@login_required
@require_POST
def order_update_status(request, pk):
    order = get_object_or_404(Order, pk=pk)
    form = OrderStatusForm(request.POST)
    if form.is_valid():
        try:
            update_order_status(order=order, new_status=form.cleaned_data["status"], user=request.user)
            messages.success(request, "Status do pedido atualizado com sucesso.")
        except OrderError as exc:
            messages.error(request, str(exc.message))
    else:
        messages.error(request, "Status inválido.")
    return redirect("orders:order_detail", pk=pk)


# --------------------------------------------------------------- Novo pedido

@login_required
def order_new(request):
    """Tela de montagem do pedido: cardápio à esquerda, carrinho à direita."""
    cart = Cart(request)

    category = request.GET.get("category") or ""
    products = Product.objects.filter(is_active=True)
    if category:
        products = products.filter(category=category)

    cart_items = []
    subtotal = 0.0
    product_ids = [item["product_id"] for item in cart.items]
    products_by_id = {p.id: p for p in Product.objects.filter(id__in=product_ids)}
    for index, item in enumerate(cart.items):
        product = products_by_id.get(item["product_id"])
        if not product:
            continue
        line_total = round(product.price * item["quantity"], 2)
        subtotal += line_total
        cart_items.append({
            "index": index, "product": product, "quantity": item["quantity"],
            "notes": item.get("notes"), "half_flavors": item.get("half_flavors"),
            "line_total": line_total,
        })
    subtotal = round(subtotal, 2)

    checkout_form = CheckoutForm(initial={"type": Order.OrderType.DELIVERY, "payment_method": Order.PaymentMethod.CASH})

    return render(request, "orders/order_new.html", {
        "products": products,
        "categories": Product.Category.choices,
        "selected_category": category,
        "cart_items": cart_items,
        "subtotal": subtotal,
        "checkout_form": checkout_form,
    })


@login_required
@require_POST
def order_cart_add(request):
    form = AddCartItemForm(request.POST)
    if form.is_valid():
        half_flavors_raw = form.cleaned_data.get("half_flavors") or ""
        half_flavors = [f.strip() for f in half_flavors_raw.split(",") if f.strip()]
        cart = Cart(request)
        cart.add(
            product_id=form.cleaned_data["product_id"],
            quantity=form.cleaned_data["quantity"],
            notes=form.cleaned_data.get("notes") or "",
            half_flavors=half_flavors,
        )
        messages.success(request, "Item adicionado ao pedido.")
    else:
        messages.error(request, "Não foi possível adicionar o item.")
    return redirect("orders:order_new")


@login_required
@require_POST
def order_cart_remove(request, index):
    cart = Cart(request)
    cart.remove(index)
    messages.info(request, "Item removido do pedido.")
    return redirect("orders:order_new")


@login_required
@require_POST
def order_checkout(request):
    cart = Cart(request)
    if not cart.items:
        messages.error(request, "Adicione ao menos um item ao pedido.")
        return redirect("orders:order_new")

    form = CheckoutForm(request.POST)
    if not form.is_valid():
        messages.error(request, "Verifique os dados do pedido.")
        return redirect("orders:order_new")

    data = form.cleaned_data
    try:
        order = create_order(
            user=request.user,
            customer_name=data.get("customer_name"),
            customer_phone=data.get("customer_phone"),
            customer_address=data.get("customer_address"),
            order_type=data["type"],
            payment_method=data["payment_method"],
            items=cart.items,
            discount=data.get("discount") or 0,
            delivery_fee=data.get("delivery_fee") or 0,
            note=data.get("note"),
        )
    except InsufficientStockError as exc:
        for shortage in exc.shortages:
            messages.error(
                request,
                f'Estoque insuficiente de "{shortage["ingredient_name"]}": '
                f'necessário {shortage["required"]}, disponível {shortage["available"]}.',
            )
        return redirect("orders:order_new")
    except OrderError as exc:
        messages.error(request, str(exc.message))
        return redirect("orders:order_new")

    cart.clear()
    messages.success(request, f"Pedido #{order.number} criado com sucesso!")
    return redirect("orders:order_detail", pk=order.pk)

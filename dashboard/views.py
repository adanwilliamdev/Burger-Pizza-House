from datetime import timedelta

from django.contrib.auth.decorators import login_required
from django.db.models import Sum
from django.shortcuts import render
from django.utils import timezone

from catalog.models import Ingredient, Product
from common.money import round_money
from orders.models import Order, OrderItem


@login_required
def index(request):
    now = timezone.localtime()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow_start = today_start + timedelta(days=1)

    total_orders = Order.objects.count()
    total_revenue = round_money(
        Order.objects.filter(status=Order.Status.DELIVERED).aggregate(s=Sum("total"))["s"] or 0
    )
    pending_orders = Order.objects.filter(
        status__in=[Order.Status.PENDING, Order.Status.CONFIRMED, Order.Status.PREPARING]
    ).count()
    low_stock = sum(1 for i in Ingredient.objects.all() if i.is_low_stock())

    today_orders = Order.objects.filter(created_at__gte=today_start, created_at__lt=tomorrow_start).count()
    today_revenue = round_money(
        Order.objects.filter(
            status=Order.Status.DELIVERED, created_at__gte=today_start, created_at__lt=tomorrow_start
        ).aggregate(s=Sum("total"))["s"] or 0
    )

    top_products_qs = (
        OrderItem.objects.values("product_id", "product__name", "product__price")
        .annotate(total_sold=Sum("quantity"))
        .order_by("-total_sold")[:5]
    )
    top_products = [
        {
            "id": row["product_id"],
            "name": row["product__name"],
            "price": row["product__price"],
            "total_sold": row["total_sold"],
        }
        for row in top_products_qs
    ]

    # Faturamento diário — janela configurável pela query string `days`
    # (1 a 90), igual ao backend original.
    raw_days = request.GET.get("days")
    try:
        days = int(raw_days)
    except (TypeError, ValueError):
        days = 7
    days = min(90, max(1, days))

    revenue_by_day = []
    for i in range(days - 1, -1, -1):
        day_start = today_start - timedelta(days=i)
        day_end = day_start + timedelta(days=1)
        day_revenue = round_money(
            Order.objects.filter(
                status=Order.Status.DELIVERED, created_at__gte=day_start, created_at__lt=day_end
            ).aggregate(s=Sum("total"))["s"] or 0
        )
        revenue_by_day.append({"date": day_start.date().isoformat(), "revenue": day_revenue})

    recent_orders = Order.objects.select_related("user").prefetch_related("items")[:5]

    max_revenue = max((d["revenue"] for d in revenue_by_day), default=0) or 1

    return render(request, "dashboard/index.html", {
        "total_orders": total_orders,
        "total_revenue": total_revenue,
        "pending_orders": pending_orders,
        "low_stock": low_stock,
        "today_orders": today_orders,
        "today_revenue": today_revenue,
        "top_products": top_products,
        "revenue_by_day": revenue_by_day,
        "max_revenue": max_revenue,
        "recent_orders": recent_orders,
        "days": days,
    })

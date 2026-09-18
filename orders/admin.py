from django.contrib import admin

from .models import AuditLog, Order, OrderItem


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ["number", "customer_name", "status", "type", "total", "created_at"]
    list_filter = ["status", "type", "payment_method"]
    search_fields = ["number", "customer_name"]
    inlines = [OrderItemInline]


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ["action", "entity", "entity_id", "user", "created_at"]
    list_filter = ["action", "entity"]

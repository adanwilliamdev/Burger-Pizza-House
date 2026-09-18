from django.urls import path

from . import views

app_name = "orders"

urlpatterns = [
    path("", views.order_list, name="order_list"),
    path("novo/", views.order_new, name="order_new"),
    path("novo/carrinho/adicionar/", views.order_cart_add, name="order_cart_add"),
    path("novo/carrinho/remover/<int:index>/", views.order_cart_remove, name="order_cart_remove"),
    path("novo/finalizar/", views.order_checkout, name="order_checkout"),
    path("<int:pk>/", views.order_detail, name="order_detail"),
    path("<int:pk>/status/", views.order_update_status, name="order_update_status"),
]

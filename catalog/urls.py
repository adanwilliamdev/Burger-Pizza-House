from django.urls import path

from . import views

app_name = "catalog"

urlpatterns = [
    path("produtos/", views.product_list, name="product_list"),
    path("produtos/novo/", views.product_create, name="product_create"),
    path("produtos/<int:pk>/", views.product_detail, name="product_detail"),
    path("produtos/<int:pk>/editar/", views.product_update, name="product_update"),
    path("produtos/<int:pk>/excluir/", views.product_delete, name="product_delete"),

    path("ingredientes/", views.ingredient_list, name="ingredient_list"),
    path("ingredientes/novo/", views.ingredient_create, name="ingredient_create"),
    path("ingredientes/<int:pk>/editar/", views.ingredient_update, name="ingredient_update"),
    path("ingredientes/<int:pk>/estoque/", views.ingredient_stock_update, name="ingredient_stock_update"),
    path("ingredientes/<int:pk>/excluir/", views.ingredient_delete, name="ingredient_delete"),
]

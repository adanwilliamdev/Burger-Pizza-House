from django.urls import path

from . import views

app_name = "accounts"

urlpatterns = [
    path("login/", views.EmailLoginView.as_view(), name="login"),
    path("logout/", views.logout_view, name="logout"),
    path("register/", views.register_view, name="register"),
    path("usuarios/", views.user_list_view, name="user_list"),
    path("perfil/", views.me_view, name="me"),
]

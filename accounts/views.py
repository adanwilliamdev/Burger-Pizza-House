from django.contrib import messages
from django.contrib.auth import login as auth_login
from django.contrib.auth import logout as auth_logout
from django.contrib.auth.decorators import login_required
from django.contrib.auth.views import LoginView
from django.shortcuts import redirect, render

from common.decorators import admin_required

from .forms import EmailLoginForm, UserRegisterForm
from .models import User


class EmailLoginView(LoginView):
    template_name = "accounts/login.html"
    authentication_form = EmailLoginForm
    redirect_authenticated_user = True

    def get_success_url(self):
        return "/dashboard/"


def logout_view(request):
    auth_logout(request)
    messages.info(request, "Você saiu do sistema.")
    return redirect("accounts:login")


@admin_required
def register_view(request):
    """Criação de usuários — restrita a administradores, como no backend original."""
    if request.method == "POST":
        form = UserRegisterForm(request.POST)
        if form.is_valid():
            user = form.save()
            messages.success(request, f'Usuário "{user.name}" criado com sucesso.')
            return redirect("accounts:user_list")
    else:
        form = UserRegisterForm()

    return render(request, "accounts/register.html", {"form": form})


@admin_required
def user_list_view(request):
    users = User.objects.all().order_by("name")
    return render(request, "accounts/user_list.html", {"users": users})


@login_required
def me_view(request):
    return render(request, "accounts/me.html", {"user_obj": request.user})

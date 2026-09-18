from functools import wraps

from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.shortcuts import redirect


def admin_required(view_func):
    """
    Equivalente ao middleware `adminOnly` do backend original: só usuários
    com role ADMIN podem acessar a view. Aplicado sempre depois de
    @login_required (a rota precisa exigir autenticação primeiro).
    """

    @wraps(view_func)
    @login_required(login_url="accounts:login")
    def _wrapped(request, *args, **kwargs):
        if not request.user.is_admin():
            messages.error(request, "Acesso negado. Apenas administradores.")
            return redirect("dashboard:index")
        return view_func(request, *args, **kwargs)

    return _wrapped

from django import forms
from django.contrib.auth.forms import AuthenticationForm

from .models import User


class EmailLoginForm(AuthenticationForm):
    """Formulário de login usando e-mail em vez de username."""

    username = forms.EmailField(
        label="E-mail",
        widget=forms.EmailInput(attrs={"autofocus": True, "class": "input", "placeholder": "voce@exemplo.com"}),
    )
    password = forms.CharField(
        label="Senha",
        strip=False,
        widget=forms.PasswordInput(attrs={"class": "input", "placeholder": "••••••••"}),
    )

    error_messages = {
        "invalid_login": "Credenciais inválidas.",
        "inactive": "Esta conta está inativa.",
    }


class UserRegisterForm(forms.ModelForm):
    """Criação de novos usuários — restrita a administradores (ver views)."""

    password = forms.CharField(
        label="Senha", min_length=6, widget=forms.PasswordInput(attrs={"class": "input"})
    )

    class Meta:
        model = User
        fields = ["name", "email", "role"]
        widgets = {
            "name": forms.TextInput(attrs={"class": "input"}),
            "email": forms.EmailInput(attrs={"class": "input"}),
            "role": forms.Select(attrs={"class": "input"}),
        }

    def clean_name(self):
        name = self.cleaned_data["name"].strip()
        if len(name) < 2:
            raise forms.ValidationError("Nome muito curto")
        return name

    def save(self, commit=True):
        user = super().save(commit=False)
        user.set_password(self.cleaned_data["password"])
        if commit:
            user.save()
        return user

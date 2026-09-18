from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.contrib.auth.models import PermissionsMixin
from django.db import models


class UserManager(BaseUserManager):
    """Gerenciador customizado: o login é feito por e-mail, não por username."""

    use_in_migrations = True

    def _create_user(self, email, password, **extra_fields):
        if not email:
            raise ValueError("O e-mail é obrigatório")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", User.Role.ADMIN)
        extra_fields.setdefault("name", extra_fields.get("name", "Administrador"))
        return self._create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """
    Equivalente ao model `User` do schema.prisma original.
    Papéis (role) controlam o acesso: ADMIN pode gerenciar produtos,
    ingredientes e criar novos usuários; MANAGER e OPERATOR só operam
    pedidos e consultam o dashboard.
    """

    class Role(models.TextChoices):
        ADMIN = "ADMIN", "Administrador"
        MANAGER = "MANAGER", "Gerente"
        OPERATOR = "OPERATOR", "Operador"

    name = models.CharField("Nome", max_length=150)
    email = models.EmailField("E-mail", unique=True)
    role = models.CharField(
        "Papel", max_length=20, choices=Role.choices, default=Role.OPERATOR
    )
    is_active = models.BooleanField("Ativo", default=True)
    is_staff = models.BooleanField("Equipe (admin do Django)", default=False)
    created_at = models.DateTimeField("Criado em", auto_now_add=True)
    updated_at = models.DateTimeField("Atualizado em", auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["name"]

    class Meta:
        verbose_name = "Usuário"
        verbose_name_plural = "Usuários"
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} <{self.email}>"

    def is_admin(self):
        return self.role == self.Role.ADMIN

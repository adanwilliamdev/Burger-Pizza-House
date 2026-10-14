from functools import lru_cache

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configurações da aplicação, lidas do .env."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+asyncpg://bph_user:bph_password@localhost:5432/burger_pizza_house"
    database_url_sync: str = "postgresql+psycopg2://bph_user:bph_password@localhost:5432/burger_pizza_house"

    redis_url: str = "redis://localhost:6379/0"

    jwt_secret_key: str = "troque-esta-chave-em-producao"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 60
    jwt_refresh_token_expire_days: int = 7

    cors_origins: str = "http://localhost:3000"

    env: str = "development"

    # Fuso usado para "hoje" e para agrupar o faturamento por dia no dashboard.
    business_timezone: str = "America/Sao_Paulo"

    # Proteção contra força bruta no login (por e-mail, contado no Redis).
    login_max_attempts: int = 5
    login_lock_seconds: int = 900

    @model_validator(mode="after")
    def _validate_production_secrets(self) -> "Settings":
        # Em produção a chave padrão do repositório seria publicamente conhecida
        # (qualquer um forjaria tokens ADMIN), então a aplicação se recusa a subir.
        if self.env.lower() == "production":
            if self.jwt_secret_key.startswith("troque-esta-chave") or len(self.jwt_secret_key) < 32:
                raise ValueError(
                    "JWT_SECRET_KEY inseguro para ENV=production: use um valor aleatório com 32+ caracteres."
                )
        return self

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

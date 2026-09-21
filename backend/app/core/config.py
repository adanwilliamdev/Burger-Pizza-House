from functools import lru_cache

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

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

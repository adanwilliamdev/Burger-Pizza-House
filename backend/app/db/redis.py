"""
Cliente Redis + helpers "à prova de falha".

O Redis aqui é auxiliar (cache do dashboard, blacklist de tokens, contador de
tentativas de login). Se ele cair, o ERP não pode parar de vender: os helpers
de cache/contador degradam silenciosamente (com log). Só a blacklist de
tokens falha "fechada" — ver `app/api/routes/auth.py`.
"""
import logging

from redis.asyncio import Redis, from_url

from app.core.config import settings

logger = logging.getLogger(__name__)

_redis: Redis | None = None

DASHBOARD_CACHE_PREFIX = "dashboard:summary:"


def get_redis() -> Redis:
    global _redis
    if _redis is None:
        _redis = from_url(settings.redis_url, decode_responses=True)
    return _redis


async def cache_get(key: str) -> str | None:
    try:
        return await get_redis().get(key)
    except Exception:  # noqa: BLE001 — cache nunca pode derrubar a requisição
        logger.warning("Redis indisponível ao ler %s", key, exc_info=True)
        return None


async def cache_set(key: str, value: str, ex: int) -> None:
    try:
        await get_redis().set(key, value, ex=ex)
    except Exception:  # noqa: BLE001
        logger.warning("Redis indisponível ao gravar %s", key, exc_info=True)


async def invalidate_dashboard_cache() -> None:
    """Chamado após qualquer mudança que altere números do dashboard."""
    try:
        redis = get_redis()
        keys = [k async for k in redis.scan_iter(match=f"{DASHBOARD_CACHE_PREFIX}*")]
        if keys:
            await redis.delete(*keys)
    except Exception:  # noqa: BLE001
        logger.warning("Redis indisponível ao invalidar o cache do dashboard", exc_info=True)

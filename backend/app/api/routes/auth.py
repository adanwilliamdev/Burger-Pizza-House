import hashlib
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.security import create_access_token, create_refresh_token, decode_token, verify_password
from app.db.redis import get_redis
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, LoginResponse, RefreshRequest, TokenPair
from app.schemas.user import UserOut

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])


def _blacklist_key(token: str) -> str:
    # Guarda só o hash: o token completo (credencial válida) não fica em texto puro no Redis.
    return "blacklist:" + hashlib.sha256(token.encode()).hexdigest()


def _remaining_ttl(data: dict | None) -> int:
    ttl = settings.jwt_refresh_token_expire_days * 24 * 3600
    if data and data.get("exp"):
        ttl = int(data["exp"] - datetime.now(timezone.utc).timestamp())
    return max(ttl, 1)


async def _blacklist(token: str, data: dict | None) -> None:
    await get_redis().set(_blacklist_key(token), "1", ex=_remaining_ttl(data))


def _login_key(email: str) -> str:
    return f"login:fail:{email.strip().lower()}"


async def _check_login_lock(email: str) -> None:
    """Bloqueia temporariamente após N falhas seguidas. Se o Redis cair, não impede o login."""
    try:
        attempts = await get_redis().get(_login_key(email))
    except Exception:  # noqa: BLE001
        logger.warning("Redis indisponível: limite de tentativas de login desativado", exc_info=True)
        return
    if attempts and int(attempts) >= settings.login_max_attempts:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Muitas tentativas de login. Tente novamente em alguns minutos.",
        )


async def _register_login_failure(email: str) -> None:
    try:
        redis = get_redis()
        key = _login_key(email)
        count = await redis.incr(key)
        if count == 1:
            await redis.expire(key, settings.login_lock_seconds)
    except Exception:  # noqa: BLE001
        logger.warning("Redis indisponível ao registrar falha de login", exc_info=True)


async def _clear_login_failures(email: str) -> None:
    try:
        await get_redis().delete(_login_key(email))
    except Exception:  # noqa: BLE001
        pass


@router.post("/login", response_model=LoginResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    await _check_login_lock(payload.email)

    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalars().first()

    if user is None or not verify_password(payload.password, user.hashed_password):
        await _register_login_failure(payload.email)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciais inválidas.")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Esta conta está inativa.")

    await _clear_login_failures(payload.email)
    return LoginResponse(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
        user=UserOut.model_validate(user),
    )


@router.post("/refresh", response_model=TokenPair)
async def refresh(payload: RefreshRequest, db: AsyncSession = Depends(get_db)):
    invalid = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token inválido.")

    data = decode_token(payload.refresh_token)
    if data is None or data.get("type") != "refresh":
        raise invalid

    # Aqui o Redis é requisito de segurança (blacklist): se estiver fora, recusa em vez de aceitar token possivelmente revogado.
    try:
        if await get_redis().get(_blacklist_key(payload.refresh_token)):
            raise invalid
    except HTTPException:
        raise
    except Exception:  # noqa: BLE001
        logger.error("Redis indisponível ao validar refresh token", exc_info=True)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Serviço temporariamente indisponível.")

    user_id = data.get("sub")
    user = await db.get(User, int(user_id)) if user_id else None
    if user is None or not user.is_active:
        raise invalid

    # Rotação: o refresh usado é revogado; roubo e reuso do token antigo deixa de funcionar.
    try:
        await _blacklist(payload.refresh_token, data)
    except Exception:  # noqa: BLE001
        logger.error("Redis indisponível ao revogar refresh token", exc_info=True)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Serviço temporariamente indisponível.")

    return TokenPair(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(payload: RefreshRequest):
    """Revoga o refresh token, colocando-o na blacklist do Redis até expirar."""
    data = decode_token(payload.refresh_token)
    if data is None:
        return  # token inválido/expirado: já não vale nada
    try:
        await _blacklist(payload.refresh_token, data)
    except Exception:  # noqa: BLE001
        logger.error("Redis indisponível no logout", exc_info=True)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Serviço temporariamente indisponível.")


@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(get_current_user)):
    return user

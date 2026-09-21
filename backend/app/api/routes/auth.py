from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.security import create_access_token, create_refresh_token, decode_token, verify_password
from app.db.redis import get_redis
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, LoginResponse, RefreshRequest, TokenPair
from app.schemas.user import UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalars().first()

    if user is None or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciais inválidas.")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Esta conta está inativa.")

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

    # Tokens revogados (logout) ficam na blacklist do Redis até expirarem.
    redis = get_redis()
    if await redis.get(f"blacklist:{payload.refresh_token}"):
        raise invalid

    user_id = data.get("sub")
    user = await db.get(User, int(user_id)) if user_id else None
    if user is None or not user.is_active:
        raise invalid

    return TokenPair(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(payload: RefreshRequest):
    """Revoga o refresh token, colocando-o na blacklist do Redis até expirar."""
    data = decode_token(payload.refresh_token)
    redis = get_redis()
    ttl = 60 * 60 * 24 * 7  # 7 dias, mesmo teto do refresh token
    if data and data.get("exp"):
        from datetime import datetime, timezone

        remaining = int(data["exp"] - datetime.now(timezone.utc).timestamp())
        ttl = max(remaining, 1)
    await redis.set(f"blacklist:{payload.refresh_token}", "1", ex=ttl)


@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(get_current_user)):
    return user

from fastapi import FastAPI, HTTPException
from sqlalchemy import text
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import settings
from app.db.redis import get_redis
from app.db.session import engine

app = FastAPI(
    title="Burger & Pizza House — API",
    description="ERP para hamburgueria e pizzaria: pedidos, catálogo, estoque e dashboard.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/api/health", tags=["health"])
async def health():
    return {"status": "ok"}


@app.get("/api/health/ready", tags=["health"])
async def ready():
    """Readiness: confirma que Postgres e Redis respondem (usado pelo healthcheck do Docker)."""
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        await get_redis().ping()
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=503, detail="Dependência indisponível") from exc
    return {"status": "ready"}

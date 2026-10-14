"""
Testes de integração: exigem Postgres e Redis reais com as migrações aplicadas
(`alembic upgrade head && python -m app.db.seed`). O CI (.github/workflows/ci.yml)
já faz isso; localmente: `docker compose up -d postgres redis` e depois o acima.
"""
import httpx
import pytest_asyncio

from app.main import app


@pytest_asyncio.fixture(scope="session", loop_scope="session")
async def client():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


@pytest_asyncio.fixture(scope="session", loop_scope="session")
async def admin_headers(client):
    resp = await client.post(
        "/api/auth/login", json={"email": "admin@burgerpizzahouse.com", "password": "admin123"}
    )
    assert resp.status_code == 200, resp.text
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}

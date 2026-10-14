import asyncio
import uuid


async def _make_product_with_stock(client, headers, stock: float):
    suffix = uuid.uuid4().hex[:6]
    ing = await client.post("/api/ingredients", headers=headers, json={
        "name": f"Teste-{suffix}", "unit": "un", "current_stock": stock, "min_stock": 0, "cost_per_unit": 1,
    })
    assert ing.status_code == 201, ing.text
    ing_id = ing.json()["id"]
    prod = await client.post("/api/products", headers=headers, json={
        "name": f"Produto-{suffix}", "price": 10, "category": "SIDE",
        "ingredients": [{"ingredient_id": ing_id, "quantity": 1, "unit": "un"}],
    })
    assert prod.status_code == 201, prod.text
    return ing_id, prod.json()["id"]


async def _stock(client, headers, ing_id):
    return (await client.get(f"/api/ingredients/{ing_id}", headers=headers)).json()["current_stock"]


def _order(product_id, qty=1):
    return {"type": "TAKEAWAY", "payment_method": "PIX", "items": [{"product_id": product_id, "quantity": qty}]}


async def test_concurrent_orders_never_oversell(client, admin_headers):
    ing_id, product_id = await _make_product_with_stock(client, admin_headers, stock=1)

    responses = await asyncio.gather(*[
        client.post("/api/orders", headers=admin_headers, json=_order(product_id)) for _ in range(6)
    ])
    codes = sorted(r.status_code for r in responses)

    assert codes == [201, 409, 409, 409, 409, 409]
    assert await _stock(client, admin_headers, ing_id) == 0


async def test_order_numbers_are_unique_under_concurrency(client, admin_headers):
    _, product_id = await _make_product_with_stock(client, admin_headers, stock=50)
    responses = await asyncio.gather(*[
        client.post("/api/orders", headers=admin_headers, json=_order(product_id)) for _ in range(8)
    ])
    assert all(r.status_code == 201 for r in responses)
    numbers = [r.json()["number"] for r in responses]
    assert len(set(numbers)) == len(numbers)


async def test_cancel_returns_stock_exactly_once(client, admin_headers):
    ing_id, product_id = await _make_product_with_stock(client, admin_headers, stock=5)
    created = await client.post("/api/orders", headers=admin_headers, json=_order(product_id, qty=3))
    assert created.status_code == 201
    order_id = created.json()["id"]
    assert await _stock(client, admin_headers, ing_id) == 2

    # dois cancelamentos simultâneos: só um pode valer
    results = await asyncio.gather(*[
        client.post(f"/api/orders/{order_id}/status", headers=admin_headers, json={"status": "CANCELLED"})
        for _ in range(2)
    ])
    assert sorted(r.status_code for r in results) == [200, 409]
    assert await _stock(client, admin_headers, ing_id) == 5

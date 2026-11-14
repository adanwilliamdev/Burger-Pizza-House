"""
Refaz as imagens deste diretório a partir da aplicação rodando de verdade.

Uso (aplicação em http://localhost:8080 com o seed padrão):
    pip install playwright && playwright install chromium
    python docs/screenshots/capture.py
Variáveis opcionais: BASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD (padrão: admin@burgerpizzahouse.com / admin123).
Com mais pedidos e produtos cadastrados as telas ficam mais parecidas com o uso real.
"""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = os.environ.get("BASE_URL", "http://localhost:8080")
EMAIL = os.environ.get("ADMIN_EMAIL", "admin@burgerpizzahouse.com")
PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin123")
OUT = Path(__file__).parent


def fill_cart(page):
    tiles = page.locator("button.tile")
    for i in range(min(3, tiles.count())):
        tiles.nth(i).click()
        page.wait_for_timeout(400)
    if page.locator("#customerName").count():
        page.fill("#customerName", "Maria Souza")
        page.fill("#customerPhone", "(38) 99876-5432")
        page.fill("#customerAddress", "Rua das Flores, 120 — Centro")
    page.evaluate("document.activeElement.blur(); window.scrollTo(0, 0)")


with sync_playwright() as p:
    browser = p.chromium.launch()

    def context(width, height, scale, touch=False):
        return browser.new_context(locale="pt-BR", viewport={"width": width, "height": height},
                                   device_scale_factor=scale, has_touch=touch, is_mobile=touch and width < 900)

    # login (sem sessão)
    ctx = context(1366, 760, 1.5)
    page = ctx.new_page()
    page.goto(f"{BASE}/login")
    page.screenshot(path=OUT / "login.png")
    page.fill("#email", EMAIL)
    page.fill("#password", PASSWORD)
    page.click("button[type=submit]")
    page.wait_for_url("**/dashboard")
    state = ctx.storage_state()
    ctx.close()

    def shot(name, path, width, height, scale, touch=False, full=False, setup=None):
        c = browser.new_context(storage_state=state, locale="pt-BR", viewport={"width": width, "height": height},
                                device_scale_factor=scale, has_touch=touch, is_mobile=touch and width < 900)
        pg = c.new_page()
        pg.goto(f"{BASE}{path}")
        pg.wait_for_load_state("networkidle")
        if setup:
            setup(pg)
        pg.screenshot(path=OUT / f"{name}.png", full_page=full)
        c.close()

    shot("dashboard", "/dashboard", 1366, 900, 1.5, full=True)
    shot("pedidos", "/orders", 1366, 900, 1.5, full=True)
    shot("novo-pedido", "/orders/new", 1366, 820, 1.5, setup=fill_cart)
    shot("novo-pedido-tablet", "/orders/new", 1180, 820, 1.5, touch=True, setup=fill_cart)
    shot("novo-pedido-celular", "/orders/new", 390, 844, 2, touch=True, setup=fill_cart)
    browser.close()

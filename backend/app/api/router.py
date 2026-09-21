from fastapi import APIRouter

from app.api.routes import auth, dashboard, ingredients, orders, products, users

api_router = APIRouter(prefix="/api")
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(products.router)
api_router.include_router(ingredients.router)
api_router.include_router(orders.router)
api_router.include_router(dashboard.router)

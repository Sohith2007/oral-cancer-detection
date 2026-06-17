from fastapi import APIRouter

# Central router — mounts all versioned sub-routers.
# Endpoints will be registered here as each phase is implemented.
api_router = APIRouter()

from app.api.endpoints import predictions, analyze

api_router.include_router(predictions.router, prefix="/predict", tags=["predict"])
api_router.include_router(analyze.router,     prefix="/analyze",  tags=["analyze"])

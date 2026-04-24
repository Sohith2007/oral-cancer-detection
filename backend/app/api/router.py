from fastapi import APIRouter

# Central router — mounts all versioned sub-routers.
# Endpoints will be registered here as each phase is implemented.
api_router = APIRouter()

# Phase 2+: from app.api.endpoints import patients, predictions
# api_router.include_router(patients.router, prefix="/patients", tags=["patients"])
# api_router.include_router(predictions.router, prefix="/predict", tags=["predict"])

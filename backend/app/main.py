from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.router import api_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
)

# ── CORS ─────────────────────────────────────────────────────────────────────
# Allow all origins during hackathon development.
# Restrict to your deployed frontend URL before going to production.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── API Routes ────────────────────────────────────────────────────────────────
app.include_router(api_router, prefix=settings.API_V1_STR)


# ── Root ──────────────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"message": "Oral Cancer AI Backend is Online"}


# ── Health Check ──────────────────────────────────────────────────────────────
@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "project": settings.PROJECT_NAME,
        "layers": {
            "layer1_experts": "pending (Phase 3)",
            "layer2_fusion": "pending (Phase 4)",
            "layer3_xai": "pending (Phase 5)",
        },
    }

# STATE — Oral Cancer Multimodal AI System

## Current Position

**Milestone**: 1.0 — Working Prototype  
**Active Phase**: Phase 2 — Database & Data Ingestion  
**Status**: In progress

## Completed Work

- **Phase 0** (2026-04-24): Codebase mapped, GSD initialized, planning structure created.
- **Phase 1** (2026-04-24): FastAPI skeleton live at http://127.0.0.1:8000. CORS, /health, /docs, modular folder structure, pydantic-settings config. Commit: `b1616ed`.

## In Progress

**Phase 2**: Building PostgreSQL models, CRUD APIs, file upload system.  
Implementation started: 2026-04-24.

## Key Context

- Backend runs from: `d:\oral-cancer-detection\backend\`
- Launch command: `.\venv\Scripts\uvicorn app.main:app --reload`
- PostgreSQL DB to create: `oral_cancer_db`
- Update `backend/.env` with your real DB credentials before Phase 2 testing
- Frontend: `d:\oral-cancer-detection\frontend\` (Vite, React 19)
- ML dependencies (torch, torchvision) already installed in venv

## Open Issues

- [ ] PostgreSQL must be installed and `oral_cancer_db` created before Phase 2 test
- [ ] `.env` DATABASE_URL must be updated with real credentials
- [ ] Frontend mock data not yet connected to backend APIs (Phase 6)

## Decisions Log

| Date | Decision | Why |
|------|----------|-----|
| 2026-04-24 | FastAPI + SQLAlchemy + PostgreSQL | Async, type-safe, industry standard for medical backends |
| 2026-04-24 | Local file storage in uploads/ | Simplicity for hackathon; migrate to S3 later |
| 2026-04-24 | JSONB column for genomic data | Flexible schema for high-dimensional gene expression |
| 2026-04-24 | Grad-CAM for heatmaps | Works without retraining, well-supported in pytorch-grad-cam |

*Last updated: 2026-04-24*

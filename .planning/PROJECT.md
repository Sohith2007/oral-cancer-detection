# Oral Cancer Multimodal AI System

## What This Is

A clinically deployable, Explainable AI (XAI) system for early detection and risk stratification of oral cancer. Integrates four data streams — histopathology images, intraoral photographs, structured patient records (EHR), and genomic data — through a three-layer AI pipeline to produce diagnosis, risk scores, and interpretable clinical evidence.

Targets clinicians directly: the output is a structured report with heatmaps, feature importance, and a clear risk label — not raw model scores.

## Core Value

Speed up oral cancer diagnosis at point-of-care using multimodal AI, providing explainability that clinicians can trust and act on immediately.

## Context

- **Stage**: Hackathon prototype → Production-grade clinical tool
- **Team**: Solo / small team, fast iterations required
- **Stack**:
  - Frontend: React 19, Vite, Tailwind CSS 4, Recharts, Lucide React
  - Backend: FastAPI (Python 3.12), SQLAlchemy, PostgreSQL
  - ML: PyTorch, torchvision, pytorch-grad-cam, SHAP, Captum
- **Codebase Map**: `.planning/codebase/` — see ARCHITECTURE.md, STACK.md

## Requirements

### Validated

- ✓ React SPA frontend scaffold — existing (Login, DoctorDashboard, AdminDashboard pages)
- ✓ FastAPI backend skeleton with CORS and /health endpoint — Phase 1 complete
- ✓ Python venv with all core dependencies installed — Phase 1 complete

### Active

- [ ] PostgreSQL database with Patient, Prediction, Upload, Note tables
- [ ] File upload system for histopathology, intraoral, and genomic files
- [ ] Layer 1: Specialist feature extraction (ResNet50/EfficientNet/tabular/genomic branches)
- [ ] Layer 2: Cross-modal attention-based fusion
- [ ] Layer 3: XAI — Grad-CAM heatmaps, SHAP tabular importance, risk rule engine
- [ ] /predict endpoint orchestrating all 3 layers
- [ ] Clinical PDF report generation
- [ ] Doctor dashboard real API integration (replace mock data)
- [ ] Authentication / role-based access (doctor vs admin)

### Out of Scope (v1)

- HIPAA compliance infrastructure — hackathon prototype only
- Real-time streaming inference — batch per request for now
- Multi-tenant cloud deployment — local/single-server first
- TypeScript migration of frontend — .jsx for speed

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| FastAPI over Django | Async-native, fast iteration, auto Swagger docs | Adopted |
| PyTorch over TensorFlow | Better pretrained model ecosystem, Captum XAI support | Adopted |
| PostgreSQL with JSONB for genomics | High-dimensional genomic data as flexible JSON column | Pending Phase 2 |
| Grad-CAM for heatmaps | Established, works without model retraining | Pending Phase 5 |
| Local file storage for uploads | Simplicity for hackathon; swap to S3 post-hackathon | Pending Phase 2 |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-24 after initialization*

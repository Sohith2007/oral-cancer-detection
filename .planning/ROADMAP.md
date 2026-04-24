# Roadmap — Oral Cancer Multimodal AI System

## Milestone 1.0 — Working Prototype

### Phase 0 — Environment & Codebase Map ✅ COMPLETE
- [x] Python venv + all dependencies installed
- [x] Codebase mapped to .planning/codebase/
- [x] GSD project initialized

### Phase 1 — Core Foundation ✅ COMPLETE
**Goal**: Live FastAPI server ready for frontend communication.
- [x] FastAPI skeleton with CORS middleware
- [x] /health endpoint with 3-layer status
- [x] Modular folder structure (api/, core/, db/, ml/, schemas/)
- [x] .env configuration via pydantic-settings
- Commit: `b1616ed`

### Phase 2 — Database & Data Ingestion 🔄 IN PROGRESS
**Goal**: Store patients, files, predictions, and notes in PostgreSQL.
**Requires**: REQ-001, REQ-002
- [ ] SQLAlchemy ORM models: Patient, Prediction, Upload, Note
- [ ] PostgreSQL connection via get_db() dependency
- [ ] Pydantic schemas for request/response validation
- [ ] CRUD APIs: POST/GET patients, notes, predictions
- [ ] File upload endpoint (histopathology, intraoral, genomic)
- [ ] Patient history endpoint

### Phase 3 — Layer 1: Specialist Feature Extraction
**Goal**: Raw inputs → embedding vectors.
**Requires**: REQ-003
- [ ] Histopathology branch: ResNet50 → 512-d embedding
- [ ] Intraoral branch: EfficientNet → 512-d embedding
- [ ] Clinical branch: tabular encoder → embedding
- [ ] Genomic branch: deep net for gene expression
- [ ] Preprocessing pipeline: resize to 224×224, normalize, to tensor

### Phase 4 — Layer 2: Transformer-Based Fusion
**Goal**: Four embeddings → single decision.
**Requires**: REQ-004
- [ ] Cross-modal attention fusion module (PyTorch)
- [ ] Concatenation bottleneck layer
- [ ] Classifier head: fused features → probability score (0.0–1.0)

### Phase 5 — Layer 3: Decision & Explainability
**Goal**: Numbers → clinical insights and heatmaps.
**Requires**: REQ-005
- [ ] pytorch-grad-cam heatmap overlay on intraoral image
- [ ] Risk rule engine: score → "Malignant – High Risk" + next action
- [ ] Tabular feature importance via SHAP/weights

### Phase 6 — API Orchestration & Frontend Integration
**Goal**: Full /predict pipeline + live dashboard.
**Requires**: REQ-006, REQ-007
- [ ] POST /predict: receive → save → Layer1 → Layer2 → Layer3 → return JSON
- [ ] Frontend API integration (replace mock data)
- [ ] Swagger documentation complete

---

## Backlog (v1.1)

- PDF clinical report generation (REQ-008)
- JWT authentication with doctor/admin roles (REQ-009)
- Admin dashboard with model stats (REQ-010)
- S3 file storage migration
- TypeScript frontend migration

*Last updated: 2026-04-24*

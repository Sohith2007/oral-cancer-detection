# Concerns

Technical debt, known issues, and critical areas of concern.

## ⚠️ Critical Missing Infrastructure
- **No Backend**: The project currently only consists of a frontend skeleton.
- **Hackathon Constraint**: The backend needs to be implemented across 6 logical phases to ensure a working system at each stage.
  - Phase 1: Core Foundation (FastAPI, venv, health check).
  - Phase 2: DB & Data Ingestion (PostgreSQL, SQLAlchemy, file handling).
  - Phase 3: Layer 1 - Specialist Feature Extraction (Pre-trained models, preprocessing).
  - Phase 4: Layer 2 - Transformer-Based Fusion (Cross-Modal Attention, Classifier).
  - Phase 5: Layer 3 - Decision & XAI (pytorch-grad-cam, Heatmaps, Rule Engine).
  - Phase 6: API Integration & Orchestration (/predict endpoint).

## 🛠 Technical Debt
- **Page-Heavy Logic**: Current frontend pages (`DoctorDashboard.jsx`) contain a lot of code (12k+ bytes). This should be broken down into reusable components (Cards, Charts, Uploader) as the project scales.
- **No Type Safety**: While the README mentions TypeScript, the existing code is `.jsx`. Migration to `.tsx` is recommended for medical software to reduce runtime errors.
- **Mock Data**: Frontend likely uses mock data currently; real API integration is needed.

## 🔒 Security & Compliance
- **Patient Privacy**: No authentication logic or data encryption implemented yet. HIPAA compliance needs consideration if this moves beyond a hackathon prototype.

[2026-04-24]

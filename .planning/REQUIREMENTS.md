# Requirements — Oral Cancer Multimodal AI System

## REQ-001: Patient Data Management
**Priority**: Must  
Store and retrieve patient demographic data, scan history, uploaded files, predictions, and doctor notes. System must maintain full patient history.

## REQ-002: Multimodal File Ingestion
**Priority**: Must  
Accept and store histopathology images (.jpg/.png), intraoral photographs (.jpg/.png), and genomic data (.csv). Save file paths to DB with patient linkage.

## REQ-003: Layer 1 — Specialist Feature Extraction
**Priority**: Must  
Pre-trained model branches for each modality return embedding vectors (not classifications). ResNet50 for histopathology, EfficientNet for intraoral, tabular encoder for clinical, deep net for genomic.

## REQ-004: Layer 2 — Cross-Modal Fusion
**Priority**: Must  
Attention-based transformer fusion merges four embedding vectors into one fused representation fed to a classifier head producing a probability score (0.0–1.0).

## REQ-005: Layer 3 — Decision & Explainability
**Priority**: Must  
Grad-CAM heatmap overlaid on intraoral image. Rule engine converts score to risk label (e.g. "Malignant – High Risk"). SHAP/weight importance for tabular clinical factors.

## REQ-006: Prediction API
**Priority**: Must  
POST /predict accepts multimodal inputs, runs the full 3-layer pipeline, stores results, returns structured JSON including diagnosis, risk_score, confidence, stage, heatmap_url, and factor_importance.

## REQ-007: Doctor Dashboard Integration
**Priority**: Must  
Replace frontend mock data with live API calls. Doctor can upload patient data, view history, and see XAI results.

## REQ-008: Clinical PDF Reports
**Priority**: Should  
One-click report generation per patient with diagnosis, heatmap, and risk factors.

## REQ-009: Authentication
**Priority**: Should  
JWT-based login with doctor and admin roles. Middleware protects all clinical endpoints.

## REQ-010: Admin Dashboard
**Priority**: Should  
Admin can view all patients, model performance stats, and system health.

---

## Phase Mapping

| Requirement | Phase |
|-------------|-------|
| REQ-001, REQ-002 | Phase 2 — Database & Data Ingestion |
| REQ-003 | Phase 3 — Layer 1 Specialist Models |
| REQ-004 | Phase 4 — Layer 2 Fusion |
| REQ-005 | Phase 5 — Layer 3 XAI |
| REQ-006 | Phase 6 — API Orchestration |
| REQ-007 | Phase 6 — API Integration |
| REQ-008, REQ-009, REQ-010 | Post-hackathon / v1.1 |

*Last updated: 2026-04-24*

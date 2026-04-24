# Architecture

High-level overview of the system architecture.

## Overview
The system follows a standard Client-Server architecture (currently focused on Client). The frontend is a Single Page Application (SPA) built with React.

## Frontend Architecture
- **Router**: React Router for client-side navigation.
- **Pages**:
  - `Login.jsx`: User authentication entry point.
  - `DoctorDashboard.jsx`: Main interface for clinicians to view and manage patient data.
  - `AdminDashboard.jsx`: Administrative interface for system management.
- **Components**: (TBD - currently logic seems to be largely within pages).
- **Styling**: Utility-first CSS using Tailwind CSS.

## Backend Architecture (Planned)
- **API**: FastAPI providing RESTful endpoints.
- **Workers**: Celery for asynchronous model inference.
- **Models**: Specialized multimodal models for histopathology, intraoral images, clinical data, and genomics.

## Data Flow
1. Clinician uploads multimodal data via the dashboard.
2. Frontend sends data to Backend API.
3. Backend triggers inference tasks.
4. Results (diagnosis, risk, XAI) are stored and returned to the Frontend.
5. Frontend renders diagnostic insights and heatmaps.

[2026-04-24]

# Oral Cancer Detection

FastAPI + React prototype for multimodal oral-cancer risk assessment with:

- Supabase authentication
- Tabular and image-informed prediction inputs
- Ensemble model execution with deterministic fusion fallback
- Gemini-powered clinical summaries with local fallback text

## Current Architecture

### Frontend

- Vite
- React 19
- React Router
- Tailwind CSS v4 utilities
- Supabase JS client

Main flow:

1. User signs in through Supabase.
2. Doctor dashboard fetches the backend schema.
3. User uploads intra-oral and histopathology images plus clinical/genomic JSON.
4. Frontend submits a multipart request to the FastAPI backend.

### Backend

- FastAPI
- Supabase Python client for auth and prediction persistence
- PyTorch / torchvision for model services
- scikit-learn / LightGBM / joblib model loading
- Optional Gemini summary generation

Main API routes:

- `GET /health`
- `GET /api/v1/predict/schema`
- `POST /api/v1/predict/`
- `POST /api/v1/predict/multimodal`

## Inference Notes

- Base model artifacts are loaded from `backend/app/ml/models/`.
- If a trained fusion checkpoint is missing, the backend uses a deterministic weighted-average fallback instead of a randomly initialized fusion network.
- If trained vision checkpoints are missing, image branches return a neutral score of `0.5` instead of pretending to provide a medical prediction.
- If `GEMINI_API_KEY` is not configured, the backend returns a local deterministic clinical summary.

These fallbacks keep the app operational while making missing trained assets explicit in system behavior.

## Environment Setup

### Backend

Copy `backend/.env.example` to `backend/.env` and fill in:

- `SUPABASE_URL`
- `SUPABASE_KEY`
- `GEMINI_API_KEY` (optional)
- `BACKEND_CORS_ORIGINS`

Install dependencies:

```bash
cd backend
pip install -r requirements.txt
```

Run the API:

```bash
uvicorn app.main:app --reload
```

### Frontend

Copy `frontend/.env.example` to `frontend/.env` and fill in:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_URL`

Install and run:

```bash
cd frontend
npm install
npm run dev
```

## Testing

Backend:

```bash
cd backend
pytest
```

Frontend:

```bash
cd frontend
npm run lint
npm run build
```

## Repository Notes

- SQLAlchemy models are present in `backend/app/models`, but the active request path currently persists predictions through Supabase.
- The admin page is intentionally lightweight and only reflects backend capabilities that exist in this repository.
- Large model artifacts are already committed in the project; expect a heavier checkout than a typical web app.

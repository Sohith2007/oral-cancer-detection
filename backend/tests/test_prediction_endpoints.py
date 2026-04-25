from types import SimpleNamespace
import asyncio

import numpy as np
import httpx

from app.api.deps import get_current_user
from app.db.session import get_supabase
from app.main import app
import app.api.endpoints.predictions as predictions_module


class FakeSupabaseTable:
    def __init__(self, rows=None):
        self.inserted_payload = None
        self.rows = rows or []

    def select(self, _fields):
        return self

    def eq(self, _column, _value):
        return self

    def order(self, _column, desc=False):
        return self

    def limit(self, _n):
        return self

    def insert(self, payload):
        self.inserted_payload = payload
        return self

    def execute(self):
        if self.inserted_payload is not None:
            return {"status": "ok"}
        return {"data": self.rows}


class FakeSupabaseClient:
    def __init__(self, rows=None):
        self.table_instance = FakeSupabaseTable(rows=rows)

    def table(self, _name):
        return self.table_instance


class DummyPipeline:
    def __init__(self):
        self.model_names = [
            "best_oscc_model.pkl",
            "final_genomic_model.pkl",
            "lightgbm_oral_cancer_model.pkl",
            "oral_cancer_svm_model.joblib",
        ]

    def get_input_schema(self):
        return {
            "expected_feature_count": 103,
            "clinical_features": ["age", "gender", "tobacco_history"],
            "gene_features": ["gene_1", "gene_2"],
            "feature_names": ["feature_0", "feature_1", "feature_2"],
        }

    def build_multimodal_features(self, clinical_data, gene_data, histopathology_score, intra_oral_score):
        features = [0.1] * 103
        features[0] = float(clinical_data.get("age", 50)) / 120.0
        features[1] = 1.0 if str(clinical_data.get("gender", "male")).lower() == "male" else 0.0
        features[2] = 0.0 if str(clinical_data.get("tobacco_history", "never")).lower() == "never" else 0.8
        features[3] = float(histopathology_score)
        features[4] = float(intra_oral_score)
        return features

    def predict_simultaneously(self, _features):
        final_preds = np.array([[0.73]])
        base_preds = np.array([[0.61, 0.52, 0.71, 0.44]])
        attention_weights = np.array([[1.0, 1.0, 1.0, 1.0]])
        explanations = ["e1", "e2", "e3", "e4"]
        return final_preds, base_preds, attention_weights, explanations


async def _request(method, url, **kwargs):
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        return await client.request(method, url, **kwargs)


def setup_function():
    app.dependency_overrides.clear()


def teardown_function():
    app.dependency_overrides.clear()


def _override_auth_and_db(fake_supabase):
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id="user-123")
    app.dependency_overrides[get_supabase] = lambda: fake_supabase


def test_schema_endpoint_returns_expected_structure(monkeypatch):
    fake_supabase = FakeSupabaseClient()
    _override_auth_and_db(fake_supabase)

    monkeypatch.setattr(predictions_module, "pipeline_instance", DummyPipeline())

    response = asyncio.run(_request("GET", "/api/v1/predict/schema"))

    assert response.status_code == 200
    payload = response.json()
    assert payload["expected_feature_count"] == 103
    assert "clinical_features" in payload
    assert "gene_features" in payload
    assert "feature_names" in payload


def test_multimodal_endpoint_processes_images_and_form_data(monkeypatch):
    fake_supabase = FakeSupabaseClient()
    _override_auth_and_db(fake_supabase)

    dummy_pipeline = DummyPipeline()
    monkeypatch.setattr(predictions_module, "pipeline_instance", dummy_pipeline)
    monkeypatch.setattr(predictions_module, "histopathology_vision_model", lambda _bytes: 0.91)
    monkeypatch.setattr(predictions_module, "intra_oral_vision_model", lambda _bytes: 0.34)
    monkeypatch.setattr(
        predictions_module,
        "generate_clinical_insight",
        lambda **_kwargs: "Mock clinical insight",
    )

    files = {
        "histopathology_image": ("hist.png", b"fake-bytes-1", "image/png"),
        "intra_oral_image": ("oral.png", b"fake-bytes-2", "image/png"),
    }
    data = {
        "clinical_data": '{"age": 60, "gender": "Male", "tobacco_history": "Never"}',
        "gene_data": '{"gene_1": 0.17, "gene_2": 0.29}',
    }

    response = asyncio.run(
        _request("POST", "/api/v1/predict/multimodal", files=files, data=data)
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["patient_id"] == "user-123"
    assert payload["final_risk_score"] == 0.73
    assert payload["clinical_insight"] == "Mock clinical insight"
    assert "best_oscc_model.pkl" in payload["base_model_predictions"]
    assert fake_supabase.table_instance.inserted_payload is not None


def test_legacy_predict_endpoint_still_accepts_feature_vector(monkeypatch):
    fake_supabase = FakeSupabaseClient()
    _override_auth_and_db(fake_supabase)

    monkeypatch.setattr(predictions_module, "pipeline_instance", DummyPipeline())
    monkeypatch.setattr(
        predictions_module,
        "generate_clinical_insight",
        lambda **_kwargs: "Legacy path insight",
    )

    response = asyncio.run(
        _request(
            "POST",
            "/api/v1/predict/",
            json={"features": [0.1] * 103},
        )
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["clinical_insight"] == "Legacy path insight"
    assert payload["patient_id"] == "user-123"


def test_same_user_same_input_passes_previous_prediction_to_gemini(monkeypatch):
    repeated_features = [0.1] * 103
    fake_supabase = FakeSupabaseClient(
        rows=[
            {
                "input_features": repeated_features,
                "final_risk_score": 0.68,
                "base_model_predictions": {"m1": 0.5},
                "explainability_attention": {"m1": "100%"},
                "feature_dependencies": {"m1": "age"},
                "clinical_insight": "Previous insight",
                "created_at": "2026-04-25T00:00:00Z",
            }
        ]
    )
    _override_auth_and_db(fake_supabase)

    monkeypatch.setattr(predictions_module, "pipeline_instance", DummyPipeline())

    captured = {}

    def fake_generate_clinical_insight(**kwargs):
        captured["previous_prediction"] = kwargs.get("previous_prediction")
        return "Progress + reasoning insight"

    monkeypatch.setattr(predictions_module, "generate_clinical_insight", fake_generate_clinical_insight)

    response = asyncio.run(
        _request(
            "POST",
            "/api/v1/predict/",
            json={"features": repeated_features},
        )
    )

    assert response.status_code == 200
    assert response.json()["clinical_insight"] == "Progress + reasoning insight"
    assert captured["previous_prediction"] is not None
    assert captured["previous_prediction"]["clinical_insight"] == "Previous insight"

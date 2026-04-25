import json
import hashlib
import numpy as np
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from app.ml.layer2_fusion.fusion_service import pipeline_instance
from app.ml.layer3_xai.gemini_service import generate_clinical_insight
from app.ml.layer1_experts.vision_service import (
    histopathology_vision_model,
    intra_oral_vision_model,
)
from app.api.deps import get_current_user
from app.db.session import get_supabase
from supabase import Client

router = APIRouter()

class PredictionRequest(BaseModel):
    features: List[float] # Expected to be 103 features long

class PredictionResponse(BaseModel):
    final_risk_score: float
    base_model_predictions: Dict[str, float]
    explainability_attention: Dict[str, str]
    feature_dependencies: Dict[str, str] # ADDED: Why each model decided what it did
    patient_id: str
    clinical_insight: str  


class SchemaResponse(BaseModel):
    expected_feature_count: int
    clinical_features: List[str]
    gene_features: List[str]
    feature_names: List[str]


def _parse_json_field(raw_value: Optional[str], field_name: str):
    if not raw_value:
        return {}
    try:
        parsed = json.loads(raw_value)
        if isinstance(parsed, (dict, list)):
            return parsed
        raise ValueError("must be an object or array")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid JSON for {field_name}: {exc}")


def _build_input_signature(features: List[float]) -> str:
    normalized = [round(float(v), 8) for v in features]
    payload = json.dumps(normalized, separators=(",", ":"))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _extract_rows(query_result):
    if hasattr(query_result, "data"):
        return query_result.data or []
    if isinstance(query_result, dict):
        return query_result.get("data", []) or []
    return []


def _find_previous_matching_prediction(user_id: str, features: List[float], supabase: Optional[Client]):
    if supabase is None:
        return None
    target_signature = _build_input_signature(features)
    try:
        result = (
            supabase.table("predictions")
            .select(
                "input_features,final_risk_score,base_model_predictions,explainability_attention,feature_dependencies,clinical_insight,created_at"
            )
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(50)
            .execute()
        )
        rows = _extract_rows(result)
        for row in rows:
            row_features = row.get("input_features")
            if not isinstance(row_features, list):
                continue
            if _build_input_signature(row_features) == target_signature:
                return row
    except Exception as lookup_err:
        print(f"[Warning] Could not query prior prediction history: {lookup_err}")
    return None


def _run_prediction(features: List[float], current_user, supabase: Optional[Client]):
    final_preds, base_preds, attention_weights, model_explanations = pipeline_instance.predict_simultaneously([features])

    base_model_dict = {}
    explain_dict = {}
    feature_dep_dict = {}

    sample_attention = attention_weights[0]
    attention_total = float(sample_attention.sum())
    if attention_total <= 0:
        normalized_attention = np.zeros_like(sample_attention)
    else:
        normalized_attention = (sample_attention / attention_total) * 100

    for j, model_name in enumerate(pipeline_instance.model_names):
        base_model_dict[model_name] = float(base_preds[0][j])
        explain_dict[model_name] = f"{normalized_attention[j]:.1f}%"
        feature_dep_dict[model_name] = model_explanations[j]

    final_risk = float(final_preds[0][0])

    previous_prediction = _find_previous_matching_prediction(current_user.id, features, supabase)

    from app.ml.layer3_xai.gemini_service import generate_clinical_insight
    insight = generate_clinical_insight(
        final_risk_score=final_risk,
        base_model_predictions=base_model_dict,
        explainability_attention=explain_dict,
        feature_dependencies=feature_dep_dict,
        previous_prediction=previous_prediction,
    )

    if supabase is not None:
        try:
            supabase.table("predictions").insert({
                "user_id": current_user.id,
                "input_features": features,
                "final_risk_score": final_risk,
                "base_model_predictions": base_model_dict,
                "explainability_attention": explain_dict,
                "feature_dependencies": feature_dep_dict,
                "clinical_insight": insight,
            }).execute()
        except Exception as db_err:
            print(f"[Warning] Failed to save prediction to DB: {db_err}")

    return PredictionResponse(
        final_risk_score=final_risk,
        base_model_predictions=base_model_dict,
        explainability_attention=explain_dict,
        feature_dependencies=feature_dep_dict,
        patient_id=current_user.id,
        clinical_insight=insight,
    )


@router.get("/schema", response_model=SchemaResponse)
def get_prediction_schema(current_user=Depends(get_current_user)):
    schema = pipeline_instance.get_input_schema()
    return SchemaResponse(**schema)

@router.post("/", response_model=PredictionResponse)
def predict_oral_cancer(
    request: PredictionRequest,
    current_user = Depends(get_current_user), # REQUIRES AUTH
    supabase: Optional[Client] = Depends(get_supabase)
):
    try:
        return _run_prediction(request.features, current_user, supabase)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/multimodal", response_model=PredictionResponse)
async def predict_oral_cancer_multimodal(
    histopathology_image: Optional[UploadFile] = File(default=None),
    intra_oral_image: Optional[UploadFile] = File(default=None),
    clinical_report: Optional[UploadFile] = File(default=None),
    gene_report: Optional[UploadFile] = File(default=None),
    current_user=Depends(get_current_user),
    supabase: Optional[Client] = Depends(get_supabase),
):
    intra_oral_bytes = None
    histopathology_bytes = None
    clin_bytes = None
    gene_bytes = None
    try:
        if not any([histopathology_image, intra_oral_image, clinical_report, gene_report]):
            raise HTTPException(status_code=400, detail="Please upload at least one piece of patient data to run the analysis.")

        # Read all uploaded files into memory
        intra_oral_bytes     = await intra_oral_image.read()     if intra_oral_image     else None
        histopathology_bytes = await histopathology_image.read() if histopathology_image else None
        clin_bytes           = await clinical_report.read()      if clinical_report      else None
        gene_bytes           = await gene_report.read()          if gene_report          else None

        from app.ml.layer3_xai.gemini_service import gemini_multimodal_prediction

        # Always route directly to Gemini Vision — local PyTorch weights not available
        f_risk, b_preds, ext_att, f_deps, c_insight = gemini_multimodal_prediction(
            intra_oral_bytes, histopathology_bytes, clin_bytes, gene_bytes
        )

        return PredictionResponse(
            final_risk_score=f_risk,
            base_model_predictions=b_preds,
            explainability_attention=ext_att,
            feature_dependencies=f_deps,
            patient_id=current_user.id,
            clinical_insight=c_insight,
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if histopathology_image: await histopathology_image.close()
        if intra_oral_image:     await intra_oral_image.close()
        if clinical_report:      await clinical_report.close()
        if gene_report:          await gene_report.close()


from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict, Any
from app.ml.layer2_fusion.fusion_service import pipeline_instance
from app.ml.layer3_xai.gemini_service import generate_clinical_insight
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

@router.post("/", response_model=PredictionResponse)
def predict_oral_cancer(
    request: PredictionRequest,
    current_user = Depends(get_current_user), # REQUIRES AUTH
    supabase: Client = Depends(get_supabase)
):
    try:
        # Pass the features list as a single sample
        final_preds, base_preds, attention_weights, model_explanations = pipeline_instance.predict_simultaneously([request.features])
        
        # Format the response
        base_model_dict = {}
        explain_dict = {}
        feature_dep_dict = {}
        
        sample_attention = attention_weights[0]
        # Normalize attention
        normalized_attention = (sample_attention / sample_attention.sum()) * 100
        
        for j, model_name in enumerate(pipeline_instance.model_names):
            base_model_dict[model_name] = float(base_preds[0][j])
            explain_dict[model_name] = f"{normalized_attention[j]:.1f}%"
            feature_dep_dict[model_name] = model_explanations[j]
            
        final_risk = float(final_preds[0][0])
        
        # Ask Gemini to explain the data
        insight = generate_clinical_insight(
            final_risk_score=final_risk,
            base_model_predictions=base_model_dict,
            explainability_attention=explain_dict,
            feature_dependencies=feature_dep_dict
        )
        
        # Save prediction results to Supabase DB
        try:
            supabase.table("predictions").insert({
                "user_id": current_user.id,
                "input_features": request.features,
                "final_risk_score": final_risk,
                "base_model_predictions": base_model_dict,
                "explainability_attention": explain_dict,
                "feature_dependencies": feature_dep_dict,
                "clinical_insight": insight
            }).execute()
        except Exception as db_err:
            print(f"[Warning] Failed to save prediction to DB: {db_err}")
            
        return PredictionResponse(
            final_risk_score=final_risk,
            base_model_predictions=base_model_dict,
            explainability_attention=explain_dict,
            feature_dependencies=feature_dep_dict,
            patient_id=current_user.id,
            clinical_insight=insight
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

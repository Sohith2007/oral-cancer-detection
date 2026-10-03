from pydantic import BaseModel
from typing import Optional, Dict

# Schema for taking in a new prediction request
class PredictionCreate(BaseModel):
    patient_id: int
    
    # 📋 B. Clinical Form Inputs (Symptoms)
    # Passed as a dictionary, e.g., {"pain": "severe", "ulcer_duration": "2 weeks", "weight_loss": "yes"}
    symptoms: Dict[str, str] = {} 

# Schema for returning the final massive AI prediction packet
class PredictionResponse(BaseModel):
    id: int
    patient_id: int
    
    # 🩺 A. Primary Medical Outputs
    diagnosis: str # "Cancer Detected", "No Cancer", "Suspicious Lesion"
    risk_level: str # "Low Risk", "Medium Risk", "High Risk"
    risk_score: float # 0.0 to 100.0 (percentage)
    stage: Optional[str] # "Stage I", "Stage II", etc.
    
    # 📊 B. Confidence Outputs
    confidence: float # Calibrated confidence percentage
    modality_weights: Optional[Dict[str, float]] # e.g. {"Histopathology": 50.0, "Clinical": 20.0}
    
    # 🔍 C. Explainability Outputs
    heatmap_url: Optional[str] # Path to the Grad-CAM image
    shap_clinical: Optional[Dict[str, float]] # Top clinical factors driving the score
    shap_genomic: Optional[Dict[str, float]] # Top genomic factors driving the score
    
    # 📄 D. Doctor-Friendly Outputs
    clinical_summary: Optional[str] # Gemini 1.5 Flash paragraph
    next_action: Optional[str] # "Biopsy advised", "Urgent oncology consult"
    
    class Config:
        from_attributes = True

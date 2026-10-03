from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON, func
from sqlalchemy.orm import relationship
from app.db.base import Base


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Inputs (recorded at time of prediction)
    symptoms = Column(JSON, nullable=True)
    
    # Primary Medical Outputs
    diagnosis = Column(String(100), nullable=False)   
    risk_level = Column(String(50), nullable=False)   
    risk_score = Column(Float, nullable=False)         
    stage = Column(String(50), nullable=True)          
    
    # Confidence Outputs
    confidence = Column(Float, nullable=False)         
    modality_weights = Column(JSON, nullable=True)
    
    # Explainability Outputs
    heatmap_url = Column(String(512), nullable=True)   
    shap_clinical = Column(JSON, nullable=True)
    shap_genomic = Column(JSON, nullable=True)
    
    # Doctor-Friendly Outputs
    clinical_summary = Column(String(1000), nullable=True)
    next_action = Column(String(255), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    patient = relationship("Patient", backref="predictions")

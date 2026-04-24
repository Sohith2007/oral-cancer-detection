from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.db.base import Base


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    diagnosis = Column(String(100), nullable=False)   # e.g. "Malignant" / "Benign"
    risk_level = Column(String(50), nullable=False)   # e.g. "High" / "Medium" / "Low"
    risk_score = Column(Float, nullable=False)         # 0.0 – 1.0 raw model output
    confidence = Column(Float, nullable=False)         # confidence of final prediction
    stage = Column(String(50), nullable=True)          # e.g. "Stage II"
    heatmap_url = Column(String(512), nullable=True)   # path to Grad-CAM image
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    patient = relationship("Patient", backref="predictions")

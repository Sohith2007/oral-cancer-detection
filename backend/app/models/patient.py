from sqlalchemy import Column, Integer, String, DateTime, Boolean, func
from app.db.base import Base


class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    age = Column(Integer, nullable=False)
    gender = Column(String(20), nullable=False)
    
    # Risk Factors
    smoking = Column(Boolean, default=False)
    alcohol = Column(Boolean, default=False)
    betel_nut = Column(Boolean, default=False)
    family_history = Column(Boolean, default=False)
    previous_oral_disease = Column(Boolean, default=False)
    
    # Contact
    phone = Column(String(20), nullable=True)
    email = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

from pydantic import BaseModel
from typing import Optional

# Base schema contains fields common to reading and writing
class PatientBase(BaseModel):
    name: str
    age: int
    gender: str
    
    # Risk Factors (📋 B. Clinical Form Inputs)
    smoking: bool = False
    alcohol: bool = False
    betel_nut: bool = False
    family_history: bool = False
    previous_oral_disease: bool = False
    
    phone: Optional[str] = None
    email: Optional[str] = None

# Schema for creating a new patient via POST /patients/
class PatientCreate(PatientBase):
    pass

# Schema for returning patient data via GET /patients/
class PatientResponse(PatientBase):
    id: int
    
    class Config:
        from_attributes = True

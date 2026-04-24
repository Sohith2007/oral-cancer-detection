# SQLAlchemy Base — all models inherit from this declarative base.
# Will be populated with Patient, Scan, Prediction models in Phase 2.
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass

"""
SQLAlchemy models for FastAPI application
Migrated from Django ORM models
"""
from sqlalchemy import Column, Integer, Float, DateTime, Index
from .database import Base


class Measurement(Base):
    """
    Measurement model - stores temperature and humidity readings
    """
    __tablename__ = "monitoring_measurement"
    
    id = Column(Integer, primary_key=True, index=True)
    ts = Column(DateTime(timezone=True), nullable=False, index=True)
    temp_current = Column(Float, nullable=True)
    temp_min = Column(Float, nullable=True)
    temp_max = Column(Float, nullable=True)
    rh_current = Column(Float, nullable=True)
    rh_min = Column(Float, nullable=True)
    rh_max = Column(Float, nullable=True)
    
    __table_args__ = (
        Index('mm_ts_idx', 'ts'),
    )
    
    def __repr__(self):
        return f"<Measurement(ts={self.ts}, temp={self.temp_current}°C, rh={self.rh_current}%)>"

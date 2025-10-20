"""
Pydantic schemas for request/response validation
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class MeasurementBase(BaseModel):
    """Base schema for measurements"""
    ts: datetime
    temp_current: Optional[float] = None
    temp_min: Optional[float] = None
    temp_max: Optional[float] = None
    rh_current: Optional[float] = None
    rh_min: Optional[float] = None
    rh_max: Optional[float] = None


class MeasurementCreate(MeasurementBase):
    """Schema for creating measurements"""
    pass


class MeasurementResponse(MeasurementBase):
    """Schema for measurement responses"""
    id: int
    
    class Config:
        from_attributes = True  # Permite conversão de ORM models


class TemperatureStats(BaseModel):
    """Temperature statistics"""
    mean: Optional[float] = None
    min: Optional[float] = None
    max: Optional[float] = None


class HumidityStats(BaseModel):
    """Humidity statistics"""
    mean: Optional[float] = None
    min: Optional[float] = None
    max: Optional[float] = None


class SummaryResponse(BaseModel):
    """Summary response with stats and violations"""
    temperature_stats: TemperatureStats
    humidity_stats: HumidityStats
    total_measurements: int
    violations_count: int


class SeriesPoint(BaseModel):
    """Single point in time series"""
    timestamp: str
    temperature: Optional[float] = None
    relative_humidity: Optional[float] = None


class ViolationItem(BaseModel):
    """Violation record"""
    timestamp: str
    temperature: Optional[float] = None
    relative_humidity: Optional[float] = None
    reason: str


class SystemMetrics(BaseModel):
    """System performance metrics"""
    cpu_percent: float
    memory_percent: float
    disk_usage_percent: float
    uptime_seconds: int


class HealthCheck(BaseModel):
    """Health check response"""
    status: str
    timestamp: str
    checks: dict

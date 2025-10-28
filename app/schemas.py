"""
Pydantic schemas for request/response validation
Enhanced with validators and better error messages
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, field_validator, ConfigDict


class MeasurementBase(BaseModel):
    """Base schema for measurements"""
    ts: datetime = Field(..., description="Timestamp da medição")
    temp_current: Optional[float] = Field(None, ge=-50, le=100, description="Temperatura atual (°C)")
    temp_min: Optional[float] = Field(None, ge=-50, le=100, description="Temperatura mínima (°C)")
    temp_max: Optional[float] = Field(None, ge=-50, le=100, description="Temperatura máxima (°C)")
    rh_current: Optional[float] = Field(None, ge=0, le=1, description="Umidade relativa atual (0-1)")
    rh_min: Optional[float] = Field(None, ge=0, le=1, description="Umidade relativa mínima (0-1)")
    rh_max: Optional[float] = Field(None, ge=0, le=1, description="Umidade relativa máxima (0-1)")
    
    @field_validator('temp_min', 'temp_max')
    @classmethod
    def validate_temp_range(cls, v: Optional[float], info) -> Optional[float]:
        """Validate temperature is within reasonable range"""
        if v is not None and (v < -50 or v > 100):
            raise ValueError("Temperatura deve estar entre -50°C e 100°C")
        return v
    
    @field_validator('rh_min', 'rh_max', 'rh_current')
    @classmethod
    def validate_rh_range(cls, v: Optional[float], info) -> Optional[float]:
        """Validate relative humidity is between 0 and 1"""
        if v is not None and (v < 0 or v > 1):
            raise ValueError("Umidade relativa deve estar entre 0 e 1 (0-100%)")
        return v


class MeasurementCreate(MeasurementBase):
    """Schema for creating measurements"""
    pass


class MeasurementResponse(MeasurementBase):
    """Schema for measurement responses"""
    id: int = Field(..., description="ID único da medição")
    
    model_config = ConfigDict(from_attributes=True)


class TemperatureStats(BaseModel):
    """Temperature statistics"""
    mean: Optional[float] = Field(None, description="Temperatura média (°C)")
    min: Optional[float] = Field(None, description="Temperatura mínima (°C)")
    max: Optional[float] = Field(None, description="Temperatura máxima (°C)")


class HumidityStats(BaseModel):
    """Humidity statistics"""
    mean: Optional[float] = Field(None, description="Umidade média (%)")
    min: Optional[float] = Field(None, description="Umidade mínima (%)")
    max: Optional[float] = Field(None, description="Umidade máxima (%)")


class SummaryResponse(BaseModel):
    """Summary response with stats and violations"""
    temperature_stats: TemperatureStats = Field(..., description="Estatísticas de temperatura")
    humidity_stats: HumidityStats = Field(..., description="Estatísticas de umidade")
    total_measurements: int = Field(..., ge=0, description="Total de medições")
    violations_count: int = Field(..., ge=0, description="Total de violações")


class SeriesPoint(BaseModel):
    """Single point in time series"""
    timestamp: str = Field(..., description="Timestamp ISO 8601")
    temperature: Optional[float] = Field(None, description="Temperatura (°C)")
    relative_humidity: Optional[float] = Field(None, ge=0, le=100, description="Umidade relativa (%)")


class ViolationItem(BaseModel):
    """Violation record"""
    timestamp: str = Field(..., description="Timestamp ISO 8601")
    temperature: Optional[float] = Field(None, description="Temperatura (°C)")
    relative_humidity: Optional[float] = Field(None, ge=0, le=100, description="Umidade relativa (%)")
    reason: str = Field(..., description="Motivo da violação")


class SystemMetrics(BaseModel):
    """System performance metrics"""
    cpu_percent: float = Field(..., ge=0, le=100, description="Uso de CPU (%)")
    memory_percent: float = Field(..., ge=0, le=100, description="Uso de memória (%)")
    disk_usage_percent: float = Field(..., ge=0, le=100, description="Uso de disco (%)")
    uptime_seconds: int = Field(..., ge=0, description="Tempo de atividade (segundos)")


class HealthCheck(BaseModel):
    """Health check response"""
    status: str = Field(..., description="Status geral (healthy/warning/unhealthy)")
    timestamp: str = Field(..., description="Timestamp ISO 8601")
    checks: dict = Field(..., description="Status de cada componente")

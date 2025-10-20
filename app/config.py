# FastAPI Configuration Settings
# Use .env file for sensitive data

import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings"""
    
    # Application
    app_name: str = "PI Monitoring"
    app_version: str = "2.0.0"
    debug: bool = True
    
    # Database (SQLite - local file, no external database needed)
    database_url: str = "sqlite:///data/monitoring.db"
    
    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    
    # Timezone
    timezone: str = "America/Sao_Paulo"
    
    # Business rules
    temp_low: float = 17.0
    temp_high: float = 19.5
    rh_limit: float = 62.0
    
    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()

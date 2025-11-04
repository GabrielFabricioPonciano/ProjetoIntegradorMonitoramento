import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "PI Monitoring"
    app_version: str = "2.0.0"
    debug: bool = True
    
    database_url: str = "sqlite:///data/monitoring.db"
    
    host: str = "0.0.0.0"
    port: int = 8000
    
    timezone: str = "America/Sao_Paulo"
    
    temp_low: float = 17.0
    temp_high: float = 19.5
    rh_limit: float = 62.0
    
    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()

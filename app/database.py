"""
Database configuration for FastAPI application
Connects to PostgreSQL database
"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Database URL (mesma configuração do Django)
DATABASE_URL = "postgresql://ultra_user:1234@localhost:5432/pi_monitoring"

# Create SQLAlchemy engine
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,  # Verifica conexão antes de usar
    pool_size=5,         # Pool de conexões
    max_overflow=10
)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()


def get_db():
    """
    Dependency para obter sessão do banco de dados.
    Fecha automaticamente após uso.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

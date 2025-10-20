"""
Database configuration for FastAPI application
Uses SQLite for local data storage (no external database needed)
"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from pathlib import Path

# Database file path (stored locally in project root)
DB_FILE = Path(__file__).parent.parent / "data" / "monitoring.db"
DB_FILE.parent.mkdir(exist_ok=True)  # Create data directory if it doesn't exist

DATABASE_URL = f"sqlite:///{DB_FILE}"

# Create SQLAlchemy engine (SQLite specific settings)
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},  # SQLite specific
    echo=False  # Set to True for SQL debugging
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

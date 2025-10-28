"""
Basic tests for PI Monitoring API
Run with: pytest tests/
"""
import pytest
from fastapi.testclient import TestClient
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from main import app
from app.database import Base, engine
from app import models


@pytest.fixture(scope="module")
def client():
    """Create test client"""
    # Create test database tables
    Base.metadata.create_all(bind=engine)
    
    # Create test client
    with TestClient(app) as c:
        yield c
    
    # Cleanup
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="module")
def sample_data(client):
    """Add sample data for testing"""
    from app.database import SessionLocal
    
    db = SessionLocal()
    try:
        # Add sample measurements
        tz = ZoneInfo("America/Sao_Paulo")
        now = datetime.now(tz)
        
        measurements = [
            models.Measurement(
                ts=now - timedelta(hours=i),
                temp_current=18.0 + (i % 3),
                rh_current=0.55 + (i % 10) * 0.01
            )
            for i in range(10)
        ]
        
        db.add_all(measurements)
        db.commit()
    finally:
        db.close()


def test_read_root(client):
    """Test root endpoint returns dashboard"""
    response = client.get("/")
    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]


def test_favicon(client):
    """Test favicon endpoint"""
    response = client.get("/favicon.ico")
    assert response.status_code == 200


def test_health_check(client, sample_data):
    """Test health check endpoint"""
    response = client.get("/api/system/health/")
    assert response.status_code == 200
    
    data = response.json()
    assert "status" in data
    assert "timestamp" in data
    assert "checks" in data
    assert data["status"] in ["healthy", "warning", "unhealthy"]


def test_summary_endpoint(client, sample_data):
    """Test summary endpoint"""
    response = client.get("/api/summary/")
    assert response.status_code == 200
    
    data = response.json()
    assert "temperature_stats" in data
    assert "humidity_stats" in data
    assert "total_measurements" in data
    assert "violations_count" in data
    
    # Validate temperature stats
    temp_stats = data["temperature_stats"]
    assert "mean" in temp_stats
    assert "min" in temp_stats
    assert "max" in temp_stats
    
    # Validate humidity stats
    humidity_stats = data["humidity_stats"]
    assert "mean" in humidity_stats
    assert "min" in humidity_stats
    assert "max" in humidity_stats


def test_series_endpoint(client, sample_data):
    """Test series endpoint"""
    response = client.get("/api/series/?max_points=10")
    assert response.status_code == 200
    
    data = response.json()
    assert isinstance(data, list)
    assert len(data) <= 10
    
    if len(data) > 0:
        point = data[0]
        assert "timestamp" in point
        assert "temperature" in point
        assert "relative_humidity" in point


def test_violations_endpoint(client, sample_data):
    """Test violations endpoint"""
    response = client.get("/api/violations/?limit=5")
    assert response.status_code == 200
    
    data = response.json()
    assert isinstance(data, list)
    assert len(data) <= 5
    
    if len(data) > 0:
        violation = data[0]
        assert "timestamp" in violation
        assert "temperature" in violation
        assert "relative_humidity" in violation
        assert "reason" in violation


def test_summary_with_date_filter(client, sample_data):
    """Test summary endpoint with date filters"""
    response = client.get("/api/summary/?days=7")
    assert response.status_code == 200
    
    data = response.json()
    assert "total_measurements" in data


def test_series_validation(client):
    """Test series endpoint validates max_points"""
    # Test with very large max_points (should be clamped)
    response = client.get("/api/series/?max_points=10000")
    assert response.status_code == 200
    
    data = response.json()
    assert isinstance(data, list)
    # Should be clamped to 2000 or less


def test_violations_validation(client):
    """Test violations endpoint validates limit"""
    # Test with very large limit (should be clamped)
    response = client.get("/api/violations/?limit=500")
    assert response.status_code == 200
    
    data = response.json()
    assert isinstance(data, list)
    # Should be clamped to 100 or less


def test_api_docs_available(client):
    """Test API documentation is available"""
    response = client.get("/api/docs")
    assert response.status_code == 200


def test_404_error_handling(client):
    """Test 404 error handling"""
    response = client.get("/nonexistent-endpoint")
    assert response.status_code == 404


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

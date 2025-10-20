"""
FastAPI Main Application
Migrated from Django to FastAPI

Features:
- Serve static files and templates
- REST API endpoints for monitoring data
- PostgreSQL database with SQLAlchemy
- Async support for better performance
- Auto-generated API documentation (Swagger UI)
"""
from datetime import datetime, timedelta
from typing import Optional, List
from zoneinfo import ZoneInfo

from fastapi import FastAPI, Depends, Query, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_

from app.database import get_db, engine
from app import models, schemas
from app.domain import is_violation, violation_reason, TEMP_LOW, TEMP_HIGH, RH_LIMIT

# Create database tables
models.Base.metadata.create_all(bind=engine)

# Initialize FastAPI app
app = FastAPI(
    title="PI IV - Monitoramento",
    description="APIs do MVP (summary, series, violations). Sistema de monitoramento de temperatura e umidade.",
    version="2.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")


# ==================== HTML Routes ====================

@app.get("/", include_in_schema=False)
@app.get("/dashboard/", include_in_schema=False)
async def dashboard():
    """Render dashboard HTML"""
    return FileResponse("templates/dashboard_fastapi.html")


# ==================== Helper Functions ====================

def apply_date_filters(
    query,
    days: Optional[int] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """
    Apply date filters to query
    
    Args:
        query: SQLAlchemy query
        days: Number of days to look back
        start_date: Start date (YYYY-MM-DD)
        end_date: End date (YYYY-MM-DD)
    
    Returns:
        Filtered query
    """
    # Filter by days
    if days and days > 0:
        end_dt = datetime.now(ZoneInfo("America/Sao_Paulo"))
        start_dt = end_dt - timedelta(days=days)
        return query.filter(
            models.Measurement.ts >= start_dt,
            models.Measurement.ts <= end_dt
        )
    
    # Filter by date range
    if start_date and end_date:
        try:
            sao_paulo_tz = ZoneInfo("America/Sao_Paulo")
            start_dt = datetime.fromisoformat(start_date).replace(
                hour=0, minute=0, second=0, tzinfo=sao_paulo_tz
            )
            end_dt = datetime.fromisoformat(end_date).replace(
                hour=23, minute=59, second=59, tzinfo=sao_paulo_tz
            )
            return query.filter(
                models.Measurement.ts >= start_dt,
                models.Measurement.ts <= end_dt
            )
        except (ValueError, TypeError):
            pass
    
    return query


# ==================== API Endpoints ====================

@app.get("/api/summary/", response_model=schemas.SummaryResponse, tags=["Resumo"])
async def api_summary(
    days: Optional[int] = Query(None, description="Filtrar últimos N dias"),
    start_date: Optional[str] = Query(None, description="Data inicial (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="Data final (YYYY-MM-DD)"),
    db: Session = Depends(get_db)
):
    """
    Resumo geral de temperatura/umidade e violações
    
    Calcula agregados (média/mín/máx) e contagens de violações.
    Suporta filtros de período.
    """
    # Base query
    query = db.query(models.Measurement)
    query = apply_date_filters(query, days, start_date, end_date)
    
    # Total count
    total = query.count()
    
    # Aggregates
    agg_result = query.with_entities(
        func.avg(models.Measurement.temp_current).label('temp_avg'),
        func.min(models.Measurement.temp_current).label('temp_min'),
        func.max(models.Measurement.temp_current).label('temp_max'),
        func.avg(models.Measurement.rh_current).label('rh_avg'),
        func.min(models.Measurement.rh_current).label('rh_min'),
        func.max(models.Measurement.rh_current).label('rh_max'),
    ).first()
    
    # Count violations
    violations_query = query.filter(
        or_(
            models.Measurement.temp_current < TEMP_LOW,
            models.Measurement.temp_current > TEMP_HIGH,
            models.Measurement.rh_current >= RH_LIMIT / 100.0
        )
    )
    violations_count = violations_query.count()
    
    return schemas.SummaryResponse(
        temperature_stats=schemas.TemperatureStats(
            mean=round(agg_result.temp_avg, 2) if agg_result.temp_avg else None,
            min=round(agg_result.temp_min, 1) if agg_result.temp_min else None,
            max=round(agg_result.temp_max, 1) if agg_result.temp_max else None,
        ),
        humidity_stats=schemas.HumidityStats(
            mean=round(agg_result.rh_avg * 100, 2) if agg_result.rh_avg else None,
            min=round(agg_result.rh_min * 100, 1) if agg_result.rh_min else None,
            max=round(agg_result.rh_max * 100, 1) if agg_result.rh_max else None,
        ),
        total_measurements=total,
        violations_count=violations_count
    )


@app.get("/api/series/", response_model=List[schemas.SeriesPoint], tags=["Séries"])
async def api_series(
    max_points: int = Query(1000, description="Quantidade máxima de pontos"),
    days: Optional[int] = Query(None, description="Filtrar últimos N dias"),
    start_date: Optional[str] = Query(None, description="Data inicial (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="Data final (YYYY-MM-DD)"),
    db: Session = Depends(get_db)
):
    """
    Série temporal de temperatura e umidade
    
    Retorna pontos de medição ao longo do tempo.
    """
    # Validate max_points
    max_points = max(5, min(max_points, 2000))
    
    # Base query
    query = db.query(models.Measurement)
    query = apply_date_filters(query, days, start_date, end_date)
    
    # Get records
    records = query.order_by(models.Measurement.ts).limit(max_points).all()
    
    # Prepare timezone
    sao_paulo_tz = ZoneInfo("America/Sao_Paulo")
    
    # Format response
    points = [
        schemas.SeriesPoint(
            timestamp=record.ts.astimezone(sao_paulo_tz).isoformat(),
            temperature=record.temp_current,
            relative_humidity=round(record.rh_current * 100, 1) if record.rh_current else None
        )
        for record in records
    ]
    
    return points


@app.get("/api/violations/", response_model=List[schemas.ViolationItem], tags=["Violações"])
async def api_violations(
    limit: int = Query(20, description="Quantidade de registros"),
    days: Optional[int] = Query(None, description="Filtrar últimos N dias"),
    start_date: Optional[str] = Query(None, description="Data inicial (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="Data final (YYYY-MM-DD)"),
    db: Session = Depends(get_db)
):
    """
    Lista as últimas violações com o motivo
    
    Retorna medições que violaram os limites estabelecidos.
    """
    # Validate limit
    limit = max(1, min(limit, 100))
    
    # Base query
    query = db.query(models.Measurement)
    query = apply_date_filters(query, days, start_date, end_date)
    
    # Filter violations
    query = query.filter(
        or_(
            models.Measurement.temp_current < TEMP_LOW,
            models.Measurement.temp_current > TEMP_HIGH,
            models.Measurement.rh_current >= RH_LIMIT / 100.0
        )
    )
    
    # Get records
    records = query.order_by(models.Measurement.ts.desc()).limit(limit).all()
    
    # Prepare timezone
    sao_paulo_tz = ZoneInfo("America/Sao_Paulo")
    
    # Format response
    items = [
        schemas.ViolationItem(
            timestamp=record.ts.astimezone(sao_paulo_tz).isoformat(),
            temperature=record.temp_current,
            relative_humidity=round(record.rh_current * 100, 1) if record.rh_current else None,
            reason=violation_reason(record.temp_current, record.rh_current)
        )
        for record in records
    ]
    
    return items


@app.post("/api/force-cycle/", tags=["Operações"])
async def force_simulator_cycle():
    """
    Força a execução de um ciclo do simulador
    
    NOTA: Implementação simplificada - o simulador completo requer migração separada
    """
    return JSONResponse({
        "status": "info",
        "message": "Simulador requer migração separada. Use scripts externos para popular dados."
    })


@app.get("/api/frontend-logs/", tags=["Sistema"])
async def api_frontend_logs():
    """
    Retorna logs simulados do frontend
    """
    return [
        {
            "timestamp": datetime.now(ZoneInfo("America/Sao_Paulo")).isoformat(),
            "level": "INFO",
            "message": "Frontend log example"
        }
    ]


@app.get("/api/system/metrics/", response_model=schemas.SystemMetrics, tags=["Sistema"])
async def api_system_metrics():
    """
    Retorna métricas de performance do sistema
    """
    try:
        import psutil
        
        return schemas.SystemMetrics(
            cpu_percent=psutil.cpu_percent(interval=1),
            memory_percent=psutil.virtual_memory().percent,
            disk_usage_percent=psutil.disk_usage('/').percent,
            uptime_seconds=int(datetime.now().timestamp() - psutil.boot_time())
        )
    except ImportError:
        raise HTTPException(
            status_code=501,
            detail="A biblioteca 'psutil' não está instalada. Métricas do sistema indisponíveis."
        )


@app.get("/api/system/health/", response_model=schemas.HealthCheck, tags=["Sistema"])
async def api_system_health(db: Session = Depends(get_db)):
    """
    Verifica a saúde dos componentes do sistema
    """
    health_checks = {}
    overall_status = "healthy"
    
    # Check database connection
    try:
        db.execute("SELECT 1")
        health_checks["database_connection"] = "healthy"
    except Exception:
        health_checks["database_connection"] = "unhealthy"
        overall_status = "unhealthy"
    
    # Check recent data flow
    if health_checks["database_connection"] == "healthy":
        try:
            one_hour_ago = datetime.now(ZoneInfo("America/Sao_Paulo")) - timedelta(hours=1)
            recent_count = db.query(models.Measurement).filter(
                models.Measurement.ts >= one_hour_ago
            ).count()
            
            if recent_count > 0:
                health_checks["recent_data_flow"] = "healthy"
            else:
                health_checks["recent_data_flow"] = "warning"
                if overall_status == "healthy":
                    overall_status = "warning"
        except Exception:
            health_checks["recent_data_flow"] = "unhealthy"
            overall_status = "unhealthy"
    else:
        health_checks["recent_data_flow"] = "not_checked"
    
    return schemas.HealthCheck(
        status=overall_status,
        timestamp=datetime.now(ZoneInfo("America/Sao_Paulo")).isoformat(),
        checks=health_checks
    )


# ==================== Startup/Shutdown Events ====================

@app.on_event("startup")
async def startup_event():
    """Execute on application startup"""
    print("🚀 FastAPI application started!")
    print("📊 Dashboard: http://localhost:8000")
    print("📖 API Docs: http://localhost:8000/api/docs")


@app.on_event("shutdown")
async def shutdown_event():
    """Execute on application shutdown"""
    print("👋 FastAPI application shutting down...")

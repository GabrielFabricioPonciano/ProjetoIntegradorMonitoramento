"""
FastAPI Main Application
Migrated from Django to FastAPI

Features:
- Serve static files and templates
- REST API endpoints for monitoring data
- SQLite database with SQLAlchemy
- Async support for better performance
- Auto-generated API documentation (Swagger UI)
- Exception handling and error responses
- Performance monitoring
"""
from datetime import datetime, timedelta
from typing import Optional, List
from zoneinfo import ZoneInfo
import traceback

from fastapi import FastAPI, Depends, Query, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, text
from sqlalchemy.exc import SQLAlchemyError

from app.database import get_db, engine, SessionLocal
from app import models, schemas
from app.domain import is_violation, violation_reason, TEMP_LOW, TEMP_HIGH, RH_LIMIT
from app.logger import logger
from app.analytics import analytics_engine

# Constants
TIMEZONE = "America/Sao_Paulo"
QUERY_DAYS_DESC = "Filtrar últimos N dias"
QUERY_START_DESC = "Data inicial (YYYY-MM-DD)"
QUERY_END_DESC = "Data final (YYYY-MM-DD)"

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


# ==================== Exception Handlers ====================

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions with JSON response"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "status_code": exc.status_code,
            "path": str(request.url),
            "timestamp": datetime.now(ZoneInfo(TIMEZONE)).isoformat()
        }
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors with JSON response"""
    return JSONResponse(
        status_code=422,
        content={
            "error": "Erro de validação",
            "details": exc.errors(),
            "status_code": 422,
            "path": str(request.url),
            "timestamp": datetime.now(ZoneInfo(TIMEZONE)).isoformat()
        }
    )


@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    """Handle database errors"""
    return JSONResponse(
        status_code=500,
        content={
            "error": "Erro de banco de dados",
            "details": str(exc) if app.debug else "Erro interno do servidor",
            "status_code": 500,
            "path": str(request.url),
            "timestamp": datetime.now(ZoneInfo(TIMEZONE)).isoformat()
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle all other exceptions"""
    # Log the full traceback
    logger.error(f"Unhandled exception at {request.url}: {exc}")
    logger.error(traceback.format_exc())
    
    return JSONResponse(
        status_code=500,
        content={
            "error": "Erro interno do servidor",
            "details": str(exc) if app.debug else None,
            "status_code": 500,
            "path": str(request.url),
            "timestamp": datetime.now(ZoneInfo(TIMEZONE)).isoformat()
        }
    )


# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")


# ==================== HTML Routes ====================

@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    """Serve favicon"""
    return FileResponse("static/images/favicon.svg", media_type="image/svg+xml")


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
        end_dt = datetime.now(ZoneInfo(TIMEZONE))
        start_dt = end_dt - timedelta(days=days)
        return query.filter(
            models.Measurement.ts >= start_dt,
            models.Measurement.ts <= end_dt
        )
    
    # Filter by date range
    if start_date and end_date:
        try:
            sao_paulo_tz = ZoneInfo(TIMEZONE)
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
    days: Optional[int] = Query(None, description=QUERY_DAYS_DESC),
    start_date: Optional[str] = Query(None, description=QUERY_START_DESC),
    end_date: Optional[str] = Query(None, description=QUERY_END_DESC),
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
    days: Optional[int] = Query(None, description=QUERY_DAYS_DESC),
    start_date: Optional[str] = Query(None, description=QUERY_START_DESC),
    end_date: Optional[str] = Query(None, description=QUERY_END_DESC),
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
    sao_paulo_tz = ZoneInfo(TIMEZONE)
    
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
    days: Optional[int] = Query(None, description=QUERY_DAYS_DESC),
    start_date: Optional[str] = Query(None, description=QUERY_START_DESC),
    end_date: Optional[str] = Query(None, description=QUERY_END_DESC),
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
    sao_paulo_tz = ZoneInfo(TIMEZONE)
    
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
            "timestamp": datetime.now(ZoneInfo(TIMEZONE)).isoformat(),
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
        db.execute(text("SELECT 1"))
        health_checks["database_connection"] = "healthy"
    except Exception:
        health_checks["database_connection"] = "unhealthy"
        overall_status = "unhealthy"
    
    # Check recent data flow
    if health_checks["database_connection"] == "healthy":
        try:
            one_hour_ago = datetime.now(ZoneInfo(TIMEZONE)) - timedelta(hours=1)
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
        timestamp=datetime.now(ZoneInfo(TIMEZONE)).isoformat(),
        checks=health_checks
    )


# ==================== Analytics Endpoints ====================

@app.get("/api/analytics/trends/", tags=["Analytics"])
async def api_analytics_trends(
    days_history: int = Query(30, ge=7, le=90, description="Dias de histórico para análise"),
    days_forecast: int = Query(7, ge=1, le=30, description="Dias de previsão"),
    db: Session = Depends(get_db)
):
    """
    Análise de tendências com predição usando Machine Learning
    
    Utiliza regressão linear para prever tendências futuras de temperatura e umidade.
    Retorna coeficientes, qualidade do modelo (R²) e predições para os próximos dias.
    """
    try:
        result = analytics_engine.predict_trends(db, days_history, days_forecast)
        return result
    except Exception as e:
        logger.error(f"Erro em analytics/trends: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/analytics/patterns/", tags=["Analytics"])
async def api_analytics_patterns(db: Session = Depends(get_db)):
    """
    Análise de padrões sazonais (hora do dia, dia da semana)
    
    Identifica padrões de temperatura e umidade ao longo do dia e da semana.
    Útil para detectar comportamentos cíclicos e otimizar controle ambiental.
    """
    try:
        result = analytics_engine.analyze_patterns(db)
        return result
    except Exception as e:
        logger.error(f"Erro em analytics/patterns: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/analytics/correlations/", tags=["Analytics"])
async def api_analytics_correlations(
    days: int = Query(30, ge=7, le=90, description="Dias para análise"),
    db: Session = Depends(get_db)
):
    """
    Análise de correlações entre temperatura e umidade
    
    Calcula correlações de Pearson e Spearman para identificar relações
    lineares e monotônicas entre as variáveis ambientais.
    """
    try:
        result = analytics_engine.calculate_correlations(db, days)
        return result
    except Exception as e:
        logger.error(f"Erro em analytics/correlations: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/analytics/statistics/", tags=["Analytics"])
async def api_analytics_statistics(
    days: int = Query(30, ge=7, le=90, description="Dias para análise"),
    db: Session = Depends(get_db)
):
    """
    Estatísticas avançadas (quartis, assimetria, curtose)
    
    Fornece métricas estatísticas detalhadas incluindo medidas de
    dispersão, forma da distribuição e quartis.
    """
    try:
        result = analytics_engine.advanced_statistics(db, days)
        return result
    except Exception as e:
        logger.error(f"Erro em analytics/statistics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Database Management ====================

@app.post("/api/admin/populate-db/", tags=["Admin"])
async def populate_database(
    days: int = Query(365, ge=1, le=730, description="Número de dias de dados para gerar"),
    force: bool = Query(False, description="Forçar recriação mesmo com dados existentes"),
    db: Session = Depends(get_db)
):
    """
    Popular banco de dados com dados de amostra
    
    Útil para testes e demonstrações. Gera dados realísticos de temperatura e umidade.
    """
    import random
    
    try:
        # Check existing data
        existing_count = db.query(models.Measurement).count()
        
        if existing_count > 0 and not force:
            return {
                "status": "skipped",
                "message": f"Database already has {existing_count} records. Use force=true to recreate.",
                "existing_records": existing_count
            }
        
        # Clear existing data if force=true
        if existing_count > 0 and force:
            db.query(models.Measurement).delete()
            db.commit()
            logger.info(f"Cleared {existing_count} existing records")
        
        # Generate data
        sao_paulo_tz = ZoneInfo("America/Sao_Paulo")
        start_date = datetime(2024, 11, 1, tzinfo=sao_paulo_tz)
        
        # Time points for measurements (07:30 and 16:30)
        time_points = [(7, 30), (16, 30)]
        
        measurements = []
        for day in range(days):
            current_date = start_date + timedelta(days=day)
            
            for hour, minute in time_points:
                ts = current_date.replace(hour=hour, minute=minute, second=0, microsecond=0)
                
                # Generate realistic values
                temp = random.gauss(18.4, 0.4)
                temp = max(17.0, min(19.5, temp))
                
                humidity_pct = random.gauss(59.0, 2.0)
                humidity_pct = max(56.0, min(65.0, humidity_pct))
                humidity = humidity_pct / 100.0
                
                measurement = models.Measurement(
                    ts=ts,
                    temp_current=round(temp, 2),
                    temp_min=round(temp, 2),
                    temp_max=round(temp, 2),
                    rh_current=round(humidity, 4),
                    rh_min=round(humidity, 4),
                    rh_max=round(humidity, 4)
                )
                measurements.append(measurement)
        
        # Bulk insert
        db.bulk_save_objects(measurements)
        db.commit()
        
        total_records = len(measurements)
        violations = sum(1 for m in measurements 
                        if m.temp_current < 17.0 or m.temp_current > 19.5 or m.rh_current >= 0.62)
        
        logger.info(f"Generated {total_records} measurements with {violations} violations")
        
        return {
            "status": "success",
            "message": "Database populated successfully!",
            "total_records": total_records,
            "violations": violations,
            "violation_percentage": round(violations/total_records*100, 2),
            "date_range": {
                "start": start_date.date().isoformat(),
                "end": (start_date + timedelta(days=days-1)).date().isoformat()
            }
        }
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error populating database: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Startup/Shutdown Events ====================

@app.on_event("startup")
async def startup_event():
    """Execute on application startup"""
    logger.info("=" * 60)
    logger.info("🚀 FastAPI application started!")
    logger.info("📊 Dashboard: http://localhost:8000")
    logger.info("📖 API Docs: http://localhost:8000/api/docs")
    logger.info("=" * 60)
    
    # Auto-populate database if empty
    import random
    db = SessionLocal()
    try:
        count = db.query(models.Measurement).count()
        if count == 0:
            logger.info("📦 Database is empty. Auto-populating with sample data...")
            
            # Generate 1 year of data
            sao_paulo_tz = ZoneInfo("America/Sao_Paulo")
            start_date = datetime(2024, 11, 1, tzinfo=sao_paulo_tz)
            days = 365
            time_points = [(7, 30), (16, 30)]
            
            measurements = []
            for day in range(days):
                current_date = start_date + timedelta(days=day)
                
                for hour, minute in time_points:
                    ts = current_date.replace(hour=hour, minute=minute, second=0, microsecond=0)
                    
                    temp = random.gauss(18.4, 0.4)
                    temp = max(17.0, min(19.5, temp))
                    
                    humidity_pct = random.gauss(59.0, 2.0)
                    humidity_pct = max(56.0, min(65.0, humidity_pct))
                    humidity = humidity_pct / 100.0
                    
                    measurement = models.Measurement(
                        ts=ts,
                        temp_current=round(temp, 2),
                        temp_min=round(temp, 2),
                        temp_max=round(temp, 2),
                        rh_current=round(humidity, 4),
                        rh_min=round(humidity, 4),
                        rh_max=round(humidity, 4)
                    )
                    measurements.append(measurement)
            
            db.bulk_save_objects(measurements)
            db.commit()
            logger.info(f"✅ Auto-populated database with {len(measurements)} records!")
        else:
            logger.info(f"✅ Database has {count} existing records")
    except Exception as e:
        logger.error(f"❌ Error auto-populating database: {e}")
        db.rollback()
    finally:
        db.close()


@app.on_event("shutdown")
async def shutdown_event():
    """Execute on application shutdown"""
    logger.info("👋 FastAPI application shutting down...")

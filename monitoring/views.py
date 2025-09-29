# Arquivo: views.py (Corrigido e Refatorado)

# Imports movidos para o topo do arquivo por performance e boas práticas.
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from django.db.models import Avg, Min, Max
from django.shortcuts import render
from django.utils import timezone

from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiExample
from drf_spectacular.types import OpenApiTypes
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from .models import Measurement
from .domain import violation_q, violation_reason

# --- Views de Interface ---

def dashboard(request):
    """View para renderizar o dashboard web"""
    return render(request, 'dashboard.html')

# --- Funções Auxiliares ---

def get_filtered_queryset(request):
    """
    Aplica filtros de período baseado nos parâmetros da requisição.
    Esta função centraliza a lógica de filtragem para ser reutilizada pelas views da API.
    """
    qs = Measurement.objects.all()
    params = request.query_params # Usar query_params é a prática recomendada no DRF

    # Filtro por número de dias
    days = params.get('days')
    if days:
        try:
            days_int = int(days)
            if days_int > 0:
                end_date = timezone.now()
                start_date = end_date - timedelta(days=days_int)
                return qs.filter(ts__gte=start_date, ts__lte=end_date)
        except (ValueError, TypeError):
            # Ignora o parâmetro se for inválido, continuando sem o filtro de dias
            pass

    # Filtro por período personalizado (start_date e end_date)
    start_date_str = params.get('start_date')
    end_date_str = params.get('end_date')

    if start_date_str and end_date_str:
        try:
            # Converte as strings de data para objetos datetime
            start_dt = datetime.fromisoformat(start_date_str).replace(hour=0, minute=0, second=0)
            end_dt = datetime.fromisoformat(end_date_str).replace(hour=23, minute=59, second=59)

            # Garante que os datetimes são "timezone-aware" para comparações seguras
            if timezone.is_naive(start_dt):
                start_dt = timezone.make_aware(start_dt)
            if timezone.is_naive(end_dt):
                end_dt = timezone.make_aware(end_dt)

            return qs.filter(ts__gte=start_dt, ts__lte=end_dt)
        except (ValueError, TypeError):
            # Ignora os parâmetros se forem inválidos
            pass
    
    # IMPORTANTE: Retorna todos os registros se nenhum filtro específico foi aplicado
    # Isso permite que a API funcione corretamente com dados de demonstração
    return qs

# --- Views da API ---

@extend_schema(
    tags=["Resumo"],
    summary="Resumo geral de temperatura/umidade e violações",
    description="Calcula agregados (média/mín/máx) e contagens/percentuais de violações. Suporta filtros de período.",
    parameters=[
        OpenApiParameter(name="days", type=OpenApiTypes.INT, location=OpenApiParameter.QUERY, description="Filtrar últimos N dias (ex: 30)"),
        OpenApiParameter(name="start_date", type=OpenApiTypes.DATE, location=OpenApiParameter.QUERY, description="Data inicial (formato: YYYY-MM-DD)"),
        OpenApiParameter(name="end_date", type=OpenApiTypes.DATE, location=OpenApiParameter.QUERY, description="Data final (formato: YYYY-MM-DD)"),
    ],
    responses={200: OpenApiTypes.OBJECT},
    examples=[
        OpenApiExample(
            "Exemplo de resposta",
            value={
                "temperature_stats": {"mean": 18.45, "min": 16.2, "max": 20.9},
                "humidity_stats": {"mean": 59.26, "min": 54.0, "max": 65.0},
                "total_measurements": 730,
                "violations_count": 15
            },
        )
    ],
)
@api_view(["GET"])
def api_summary(request):
    qs = get_filtered_queryset(request)
    total = qs.count()
        
    # Agregados básicos
    agg = qs.aggregate(
        temp_avg=Avg("temp_current"), temp_min=Min("temp_current"), temp_max=Max("temp_current"),
        rh_avg=Avg("rh_current"), rh_min=Min("rh_current"), rh_max=Max("rh_current"),
    )

    # Violações (contagem total)
    v_tot = qs.filter(violation_q()).count()
        
    return Response({
        "temperature_stats": {
            "mean": round(agg["temp_avg"], 2) if agg["temp_avg"] is not None else None,
            "min": round(agg["temp_min"], 1) if agg["temp_min"] is not None else None,
            "max": round(agg["temp_max"], 1) if agg["temp_max"] is not None else None,
        },
        "humidity_stats": {
            "mean": round(agg["rh_avg"] * 100, 2) if agg["rh_avg"] is not None else None,
            "min": round(agg["rh_min"] * 100, 1) if agg["rh_min"] is not None else None,
            "max": round(agg["rh_max"] * 100, 1) if agg["rh_max"] is not None else None,
        },
        "total_measurements": total,
        "violations_count": v_tot,
    })


@extend_schema(
    tags=["Séries"],
    summary="Série temporal de temperatura e umidade",
    parameters=[
        OpenApiParameter(name="max_points", type=OpenApiTypes.INT, location=OpenApiParameter.QUERY, description="Quantidade máxima de pontos (padrão: 1000)."),
        OpenApiParameter(name="days", type=OpenApiTypes.INT, location=OpenApiParameter.QUERY, description="Filtrar últimos N dias."),
        OpenApiParameter(name="start_date", type=OpenApiTypes.DATE, location=OpenApiParameter.QUERY, description="Data inicial (YYYY-MM-DD)"),
        OpenApiParameter(name="end_date", type=OpenApiTypes.DATE, location=OpenApiParameter.QUERY, description="Data final (YYYY-MM-DD)"),
    ],
    responses={200: OpenApiTypes.OBJECT},
    examples=[
        OpenApiExample(
            "Exemplo de resposta",
            value=[
                {"timestamp": "2025-01-01T07:30:00-03:00", "temperature": 18.4, "relative_humidity": 59.0},
                {"timestamp": "2025-01-01T16:30:00-03:00", "temperature": 18.2, "relative_humidity": 58.5},
            ]
        )
    ],
)
@api_view(["GET"])
def api_series(request):
    try:
        max_points = int(request.query_params.get("max_points", 1000))
    except (ValueError, TypeError):
        max_points = 1000
    
    # Limita a quantidade de pontos para evitar sobrecarga
    max_points = max(5, min(max_points, 2000))

    qs = get_filtered_queryset(request)
    
    # Query otimizada que busca apenas os campos necessários
    records = qs.order_by("ts").values("ts", "temp_current", "rh_current")[:max_points]

    # Prepara o timezone uma única vez fora do loop
    sao_paulo_tz = ZoneInfo("America/Sao_Paulo")

    points = [
        {
            "timestamp": r["ts"].astimezone(sao_paulo_tz).isoformat(),
            "temperature": r["temp_current"],
            "relative_humidity": round(r["rh_current"] * 100, 1) if r["rh_current"] is not None else None,
        }
        for r in records
    ]

    return Response(points)


@extend_schema(
    tags=["Violações"],
    summary="Lista as últimas violações com o motivo",
    parameters=[
        OpenApiParameter(name="limit", type=OpenApiTypes.INT, location=OpenApiParameter.QUERY, description="Quantidade de registros (padrão 20)."),
        OpenApiParameter(name="days", type=OpenApiTypes.INT, location=OpenApiParameter.QUERY, description="Filtrar últimos N dias."),
        OpenApiParameter(name="start_date", type=OpenApiTypes.DATE, location=OpenApiParameter.QUERY, description="Data inicial (YYYY-MM-DD)"),
        OpenApiParameter(name="end_date", type=OpenApiTypes.DATE, location=OpenApiParameter.QUERY, description="Data final (YYYY-MM-DD)"),
    ],
    responses={200: OpenApiTypes.OBJECT},
    examples=[
        OpenApiExample(
            "Exemplo de resposta",
            value=[{
                "timestamp": "2025-12-28T07:30:00-03:00",
                "temperature": 19.7,
                "relative_humidity": 61.0,
                "reason": "Temperatura 19,7°C fora do intervalo 17,0°C - 19,5°C"
            }]
        )
    ],
)
@api_view(["GET"])
def api_violations(request):
    try:
        limit = int(request.query_params.get("limit", 20))
    except (ValueError, TypeError):
        limit = 20
    
    limit = max(1, min(limit, 100)) # Limita o valor para segurança

    qs = get_filtered_queryset(request)
        
    records = (
        qs.filter(violation_q())
        .order_by("-ts")
        .values("ts", "temp_current", "rh_current")[:limit]
    )

    sao_paulo_tz = ZoneInfo("America/Sao_Paulo")
    
    items = [
        {
            "timestamp": r["ts"].astimezone(sao_paulo_tz).isoformat(),
            "temperature": r["temp_current"],
            "relative_humidity": round(r["rh_current"] * 100, 1) if r["rh_current"] is not None else None,
            "reason": violation_reason(r),
        }
        for r in records
    ]
    return Response(items)


@extend_schema(tags=["Operações"], summary="Força a execução de um ciclo do simulador")
@api_view(['POST'])
def force_simulator_cycle(request):
    try:
        # Import local é aceitável para evitar dependências circulares com tasks
        from .tasks import rotate_and_append_daily_measurements
        
        result = rotate_and_append_daily_measurements()
        if result:
            return Response({"status": "success", "message": "Ciclo do simulador executado com sucesso."})
        
        return Response(
            {"status": "warning", "message": "Ciclo executado, mas a tarefa não retornou um resultado positivo."},
            status=status.HTTP_200_OK
        )
    except Exception as e:
        return Response(
            {"status": "error", "message": str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

# As views de 'logs', 'metrics' e 'health' estão com uma estrutura boa,
# farei apenas pequenas melhorias de consistência e robustez.

@extend_schema(tags=["Sistema"], summary="Retorna logs simulados do frontend")
@api_view(['GET'])
def api_frontend_logs(request):
    # Em um sistema real, esta view leria de um arquivo, banco de dados ou serviço de logging.
    logs = [
        {"timestamp": timezone.now().isoformat(), "level": "INFO", "message": "Frontend log example"}
    ]
    return Response(logs)


@extend_schema(tags=["Sistema"], summary="Retorna métricas de performance do sistema")
@api_view(['GET'])
def api_system_metrics(request):
    try:
        # O import local aqui é uma ótima prática, pois psutil é uma dependência opcional.
        import psutil
        
        metrics = {
            "cpu_percent": psutil.cpu_percent(interval=1),
            "memory_percent": psutil.virtual_memory().percent,
            "disk_usage_percent": psutil.disk_usage('/').percent,
            "uptime_seconds": int(timezone.now().timestamp() - psutil.boot_time()),
        }
        return Response(metrics)
    except ImportError:
        return Response(
            {"error": "A biblioteca 'psutil' não está instalada. Métricas do sistema indisponíveis."},
            status=status.HTTP_501_NOT_IMPLEMENTED
        )
    except Exception as e:
        return Response(
            {"status": "error", "message": str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@extend_schema(tags=["Sistema"], summary="Verifica a saúde dos componentes do sistema")
@api_view(['GET'])
def api_system_health(request):
    health_checks = {}
    overall_status = "healthy"
    
    try:
        # 1. Verificar conexão com o banco de dados
        from django.db import connection, OperationalError
        connection.ensure_connection()
        health_checks["database_connection"] = "healthy"
    except OperationalError:
        health_checks["database_connection"] = "unhealthy"
        overall_status = "unhealthy"

    # 2. Verificar se há dados recentes (só executa se o BD estiver ok)
    if health_checks.get("database_connection") == "healthy":
        try:
            one_hour_ago = timezone.now() - timedelta(hours=1)
            recent_count = Measurement.objects.filter(ts__gte=one_hour_ago).count()
            
            if recent_count > 0:
                health_checks["recent_data_flow"] = "healthy"
            else:
                health_checks["recent_data_flow"] = "warning"
                if overall_status == "healthy": # Não sobrescreve um "unhealthy"
                    overall_status = "warning"
        except Exception:
            health_checks["recent_data_flow"] = "unhealthy"
            overall_status = "unhealthy"
    else:
        health_checks["recent_data_flow"] = "not_checked"

    response_data = {
        "status": overall_status,
        "timestamp": timezone.now().isoformat(),
        "checks": health_checks
    }

    http_status = status.HTTP_200_OK if overall_status != "unhealthy" else status.HTTP_503_SERVICE_UNAVAILABLE
    
    return Response(response_data, status=http_status)
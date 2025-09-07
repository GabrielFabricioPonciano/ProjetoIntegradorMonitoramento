from rest_framework.decorators import api_view
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiTypes, OpenApiExample
from django.shortcuts import render
from django.utils import timezone
from datetime import timedelta

from django.db.models import Avg, Min, Max
from .models import Measurement
from .domain import violation_q, violation_reason, TEMP_LOW, TEMP_HIGH, RH_LIMIT

def dashboard(request):
    """View para renderizar o dashboard web"""
    return render(request, 'dashboard.html')

def get_filtered_queryset(request):
    """Aplica filtros de período baseado nos parâmetros da requisição"""
    qs = Measurement.objects.all()
    
    # Filtro por número de dias
    days = request.GET.get('days')
    if days:
        try:
            days = int(days)
            if days > 0:
                end_date = timezone.now()
                start_date = end_date - timedelta(days=days)
                qs = qs.filter(ts__gte=start_date, ts__lte=end_date)
        except (ValueError, TypeError):
            pass
    
    # Filtro por período personalizado
    start_date = request.GET.get('start_date')
    end_date = request.GET.get('end_date')
    
    if start_date and end_date:
        try:
            from datetime import datetime
            start_dt = datetime.fromisoformat(start_date).replace(hour=0, minute=0, second=0)
            end_dt = datetime.fromisoformat(end_date).replace(hour=23, minute=59, second=59)
            
            # Converter para timezone aware se necessário
            if timezone.is_naive(start_dt):
                start_dt = timezone.make_aware(start_dt)
            if timezone.is_naive(end_dt):
                end_dt = timezone.make_aware(end_dt)
                
            qs = qs.filter(ts__gte=start_dt, ts__lte=end_dt)
        except (ValueError, TypeError):
            pass
    
    return qs

@extend_schema(
    tags=["Resumo"],
    summary="Resumo geral de temperatura/umidade e violações",
    description="Calcula agregados (média/mín/máx) e contagens/percentuais de violações. Suporta filtros de período.",
    parameters=[
        OpenApiParameter(
            name="days", type=OpenApiTypes.INT, required=False, location=OpenApiParameter.QUERY,
            description="Filtrar últimos N dias (exemplo: 30 para último mês)"
        ),
        OpenApiParameter(
            name="start_date", type=OpenApiTypes.DATE, required=False, location=OpenApiParameter.QUERY,
            description="Data inicial (formato: YYYY-MM-DD)"
        ),
        OpenApiParameter(
            name="end_date", type=OpenApiTypes.DATE, required=False, location=OpenApiParameter.QUERY,
            description="Data final (formato: YYYY-MM-DD)"
        ),
    ],
    responses={
        200: OpenApiTypes.OBJECT,
    },
    examples=[
        OpenApiExample(
            "Exemplo de resposta",
            value={
                "temperature_stats": {
                    "mean": 18.45, "min": 16.2, "max": 20.9
                },
                "humidity_stats": {
                    "mean": 59.26, "min": 54.0, "max": 65.0
                },
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
        rh_avg=Avg("rh_current"),     rh_min=Min("rh_current"),     rh_max=Max("rh_current"),
    )
    
    # Violações (contagem total)
    v_tot = qs.filter(violation_q()).count()
    
    return Response({
        "temperature_stats": {
            "mean": round(agg["temp_avg"], 2) if agg["temp_avg"] else None,
            "min": round(agg["temp_min"], 1) if agg["temp_min"] else None,
            "max": round(agg["temp_max"], 1) if agg["temp_max"] else None,
        },
        "humidity_stats": {
            "mean": round(agg["rh_avg"] * 100, 2) if agg["rh_avg"] else None,  # Converte para %
            "min": round(agg["rh_min"] * 100, 1) if agg["rh_min"] else None,   # Converte para %
            "max": round(agg["rh_max"] * 100, 1) if agg["rh_max"] else None,   # Converte para %
        },
        "total_measurements": total,
        "violations_count": v_tot,
    })

@extend_schema(
    tags=["Séries"],
    summary="Série temporal de temperatura e umidade",
    parameters=[
        OpenApiParameter(
            name="max_points", type=OpenApiTypes.INT, required=False, location=OpenApiParameter.QUERY,
            description="Quantidade máxima de pontos retornados (mín: 5, máx: 2000, padrão: 1000)."
        ),
        OpenApiParameter(
            name="days", type=OpenApiTypes.INT, required=False, location=OpenApiParameter.QUERY,
            description="Filtrar últimos N dias (exemplo: 30 para último mês)"
        ),
        OpenApiParameter(
            name="start_date", type=OpenApiTypes.DATE, required=False, location=OpenApiParameter.QUERY,
            description="Data inicial (formato: YYYY-MM-DD)"
        ),
        OpenApiParameter(
            name="end_date", type=OpenApiTypes.DATE, required=False, location=OpenApiParameter.QUERY,
            description="Data final (formato: YYYY-MM-DD)"
        ),
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
    max_points = int(request.GET.get("max_points", 1000))
    if max_points > 2000:
        max_points = 2000
    if max_points < 5:
        max_points = 5

    # Usar queryset filtrado
    qs = get_filtered_queryset(request)
    
    # Busca os dados ordenados cronologicamente
    records = (qs.order_by("ts")  # Ordem cronológica
              .values("ts", "temp_current", "rh_current")[:max_points])

    points = []
    for r in records:
        # Converte timezone para America/Sao_Paulo se necessário
        ts = r["ts"]
        if ts.tzinfo:
            from zoneinfo import ZoneInfo
            ts = ts.astimezone(ZoneInfo("America/Sao_Paulo"))
        
        points.append({
            "timestamp": ts.isoformat(),
            "temperature": r["temp_current"],
            "relative_humidity": round(r["rh_current"] * 100, 1) if r["rh_current"] else None  # Converte para %
        })

    return Response(points)

@extend_schema(
    tags=["Violações"],
    summary="Últimas violações com motivo composto",
    parameters=[
        OpenApiParameter(
            name="limit", type=OpenApiTypes.INT, required=False, location=OpenApiParameter.QUERY,
            description="Quantidade de registros (default 20)."
        ),
        OpenApiParameter(
            name="days", type=OpenApiTypes.INT, required=False, location=OpenApiParameter.QUERY,
            description="Filtrar últimos N dias (exemplo: 30 para último mês)"
        ),
        OpenApiParameter(
            name="start_date", type=OpenApiTypes.DATE, required=False, location=OpenApiParameter.QUERY,
            description="Data inicial (formato: YYYY-MM-DD)"
        ),
        OpenApiParameter(
            name="end_date", type=OpenApiTypes.DATE, required=False, location=OpenApiParameter.QUERY,
            description="Data final (formato: YYYY-MM-DD)"
        ),
    ],
    responses={200: OpenApiTypes.OBJECT},
    examples=[
        OpenApiExample(
            "Exemplo de resposta",
            value=[
                {
                    "timestamp": "2025-12-28T07:30:00-03:00",
                    "temperature": 19.7,
                    "relative_humidity": 61.0,
                    "reason": "Temperatura 19,7°C fora do intervalo 17,0°C - 19,5°C"
                }
            ]
        )
    ],
)
@api_view(["GET"])
def api_violations(request):
    limit = int(request.GET.get("limit", 20))
    
    # Usar queryset filtrado
    qs = get_filtered_queryset(request)
    
    records = (qs.filter(violation_q())
              .order_by("-ts")
              .values("ts", "temp_current", "rh_current")[:limit])

    items = []
    for r in records:
        # Converte timezone para America/Sao_Paulo se necessário
        ts = r["ts"]
        if ts.tzinfo:
            from zoneinfo import ZoneInfo
            ts = ts.astimezone(ZoneInfo("America/Sao_Paulo"))
            
        items.append({
            "timestamp": ts.isoformat(),
            "temperature": r["temp_current"],
            "relative_humidity": round(r["rh_current"] * 100, 1) if r["rh_current"] else None,  # Converte para %
            "reason": violation_reason(r),
        })
    return Response(items)

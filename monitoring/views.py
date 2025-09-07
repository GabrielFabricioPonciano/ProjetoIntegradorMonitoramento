from rest_framework.decorators import api_view
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiTypes, OpenApiExample
from django.shortcuts import render

from django.db.models import Avg, Min, Max
from .models import Measurement
from .domain import violation_q, violation_reason, TEMP_LOW, TEMP_HIGH, RH_LIMIT

def dashboard(request):
    """View para renderizar o dashboard web"""
    return render(request, 'dashboard.html')

@extend_schema(
    tags=["Resumo"],
    summary="Resumo geral de temperatura/umidade e violações",
    description="Calcula agregados (média/mín/máx) e contagens/percentuais de violações. Percentuais são calculados sobre o total de linhas (MVP).",
    responses={
        200: OpenApiTypes.OBJECT,
    },
    examples=[
        OpenApiExample(
            "Exemplo de resposta",
            value={
                "total": 730,
                "temperature": {
                    "mean": 12.8, "min": 9.7, "max": 18.5,
                    "ideal_range": [10.0, 15.0],
                    "violations_count": 123, "violations_pct": 16.8
                },
                "humidity": {
                    "mean": 58.2, "min": 41.0, "max": 68.0,
                    "ideal_limit": 60.0,
                    "violations_count": 87, "violations_pct": 11.9
                },
                "violations_total": 150, "violations_pct": 20.5
            },
        )
    ],
)
@api_view(["GET"])
def api_summary(request):
    qs = Measurement.objects.all()
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
            description="Quantidade máxima de pontos retornados (mín: 5, máx: 2000, padrão: 2000)."
        ),
    ],
    responses={200: OpenApiTypes.OBJECT},
    examples=[
        OpenApiExample(
            "Exemplo de resposta",
            value={
                "points": [
                    {"ts": "2025-01-01T07:30:00-03:00", "temp": 12.4, "rh": 58.0},
                    {"ts": "2025-01-01T16:30:00-03:00", "temp": 11.8, "rh": 57.0},
                ],
                "max_points": 2000
            }
        )
    ],
)
@api_view(["GET"])
def api_series(request):
    max_points = int(request.GET.get("max_points", 2000))
    if max_points > 2000:
        max_points = 2000
    if max_points < 5:
        max_points = 5

    # Busca os ÚLTIMOS N pontos (mais recentes) e depois inverte para ordem cronológica
    qs = (Measurement.objects
          .order_by("-ts")  # Mais recentes primeiro
          .values("ts", "temp_current", "rh_current")[:max_points])
    
    # Converte para lista e inverte para ordem cronológica
    records = list(qs)
    records.reverse()

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
            description="Quantidade de registros (default 50)."
        ),
    ],
    responses={200: OpenApiTypes.OBJECT},
    examples=[
        OpenApiExample(
            "Exemplo de resposta",
            value={
                "items": [
                    {
                        "ts": "2025-03-02T16:30:00-03:00",
                        "temp_current": 18.2,
                        "rh_current": 61.0,
                        "reason": "Temperatura 18,2°C fora do intervalo 10,0°C - 15,0°C, Umidade relativa 61,0% acima do limite 60,0%"
                    }
                ]
            }
        )
    ],
)
@api_view(["GET"])
def api_violations(request):
    limit = int(request.GET.get("limit", 50))
    qs = (Measurement.objects
          .filter(violation_q())
          .order_by("-ts")
          .values("ts", "temp_current", "rh_current")[:limit])

    items = []
    for r in qs:
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

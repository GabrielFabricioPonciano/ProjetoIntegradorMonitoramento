from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiTypes, OpenApiExample
from django.shortcuts import render
from django.utils import timezone
from django.core.cache import cache
from datetime import timedelta
from django_ratelimit.decorators import ratelimit

from django.db.models import Avg, Min, Max
from .models import Measurement
from .domain import violation_q, violation_reason, TEMP_LOW, TEMP_HIGH, RH_LIMIT
from .reports import ReportGenerator
from .metrics import get_system_metrics, get_system_health

def dashboard(request):
    """View para renderizar o dashboard web"""
    return render(request, 'dashboard.html')


@extend_schema(
    operation_id="force_simulator_cycle",
    summary="Força execução manual do ciclo do simulador",
    description="Endpoint para testes - executa manualmente o job de rotação e inserção de dados do simulador",
    responses={
        200: {
            "description": "Ciclo executado com sucesso",
            "examples": {
                "application/json": {
                    "success": True,
                    "message": "Ciclo forçado executado com sucesso",
                    "details": {
                        "inserted_date": "2026-01-02",
                        "inserted_count": 2,
                        "removed_count": 2,
                        "total_records": 730
                    }
                }
            }
        },
        400: {
            "description": "Erro na execução do ciclo",
            "examples": {
                "application/json": {
                    "success": False,
                    "message": "Erro ao executar ciclo forçado",
                    "error": "Descrição do erro"
                }
            }
        }
    }
)
@api_view(['POST'])
def force_simulator_cycle(request):
    """
    Força a execução manual de um ciclo do simulador para testes.
    
    Este endpoint permite forçar a execução do job de simulação
    sem aguardar o próximo ciclo agendado.
    """
    try:
        from .tasks import rotate_and_append_daily_measurements
        
        # Obter dados antes da execução
        total_before = Measurement.objects.count()
        latest_before = None
        try:
            latest_before = timezone.localtime(Measurement.objects.latest('ts').ts).date()
        except Measurement.DoesNotExist:
            pass
        
        # Executar o ciclo
        success = rotate_and_append_daily_measurements()
        
        if not success:
            return Response({
                'success': False,
                'message': 'Erro ao executar ciclo forçado',
                'error': 'Função retornou False'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Obter dados após a execução
        total_after = Measurement.objects.count()
        latest_after = None
        try:
            latest_after = timezone.localtime(Measurement.objects.latest('ts').ts).date()
        except Measurement.DoesNotExist:
            pass
        
        # Calcular diferenças
        inserted_count = max(0, total_after - total_before)
        inserted_date = latest_after.strftime('%Y-%m-%d') if latest_after else None
        
        # Limpar cache para forçar refresh dos dados
        from django.core.cache import cache
        cache.clear()
        
        return Response({
            'success': True,
            'message': 'Ciclo forçado executado com sucesso',
            'details': {
                'inserted_date': inserted_date,
                'inserted_count': inserted_count,
                'total_records_before': total_before,
                'total_records_after': total_after,
                'latest_date_before': latest_before.strftime('%Y-%m-%d') if latest_before else None,
                'latest_date_after': latest_after.strftime('%Y-%m-%d') if latest_after else None
            }
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'message': 'Erro ao executar ciclo forçado',
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)

def get_filtered_queryset(request):
    """Aplica filtros de período baseado nos parâmetros da requisição"""
    qs = Measurement.objects.all()
    
    # Filtro por número de dias
    days = request.GET.get('days')
    if days:
        try:
            days = int(days)
            if days > 0:
                # Usar a data do registro mais recente como referência, não timezone.now()
                try:
                    latest_record = Measurement.objects.latest('ts')
                    end_date = latest_record.ts
                except Measurement.DoesNotExist:
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
@ratelimit(key='ip', rate='60/m', method='GET')  # 60 requests por minuto por IP
def api_summary(request):
    """
    Retorna estatísticas agregadas de temperatura e umidade.
    Dados sempre em tempo real - SEM CACHE.
    """
    # Sem cache para dados sempre atualizados
    qs = get_filtered_queryset(request)
    total = qs.count()
    
    # Agregados básicos
    agg = qs.aggregate(
        temp_avg=Avg("temp_current"), temp_min=Min("temp_current"), temp_max=Max("temp_current"),
        rh_avg=Avg("rh_current"),     rh_min=Min("rh_current"),     rh_max=Max("rh_current"),
    )
    
    # Violações (contagem total)
    v_tot = qs.filter(violation_q()).count()
    
    result = {
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
    }
    
    # Headers para evitar cache
    response = Response(result)
    response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    response['Pragma'] = 'no-cache'
    response['Expires'] = '0'
    
    return response

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
# @ratelimit(key='ip', rate='120/m', method='GET')  # 120 requests por minuto (mais permissivo para gráficos)
def api_series(request):
    """
    Retorna série temporal de medições.
    Dados sempre em tempo real - SEM CACHE.
    """
    max_points = int(request.GET.get("max_points", 1000))
    if max_points > 2000:
        max_points = 2000
    if max_points < 5:
        max_points = 5

    # Sem cache para dados sempre atualizados
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

    # Headers para evitar cache
    response = Response(points)
    response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    response['Pragma'] = 'no-cache'
    response['Expires'] = '0'
    
    return response

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
# @ratelimit(key='ip', rate='60/m', method='GET', block=True)
def api_violations(request):
    limit = int(request.GET.get("limit", 20))
    
    # Sem cache para dados sempre atualizados
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
    
    # Headers para evitar cache
    response = Response(items)
    response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    response['Pragma'] = 'no-cache'
    response['Expires'] = '0'
    
    return response
    
    return Response(items)


@api_view(["POST"])
def api_frontend_logs(request):
    """Recebe logs do frontend para debug"""
    try:
        log_data = request.data
        level = log_data.get('level', 'INFO')
        context = log_data.get('context', 'Frontend')
        message = log_data.get('message', '')
        data = log_data.get('data', None)
        
        log_message = f"[FRONTEND-{level}] [{context}] {message}"
        if data:
            log_message += f" | Dados: {data}"
            
        # Usar logger apropriado baseado no nível
        import logging
        logger = logging.getLogger('monitoring')
        
        if level == 'ERROR':
            logger.error(log_message)
        elif level == 'WARNING':
            logger.warning(log_message)
        else:
            logger.info(log_message)
            
        return Response({"status": "logged"})
    except Exception as e:
        # Não retornar erro para não quebrar o frontend
        return Response({"status": "error"}, status=500)


@extend_schema(
    tags=["Sistema"],
    summary="Métricas completas do sistema",
    responses={200: OpenApiTypes.OBJECT},
    description="Retorna métricas completas do sistema incluindo CPU, memória, disco, rede, banco de dados e aplicação."
)
@api_view(["GET"])
# @ratelimit(key='ip', rate='10/m', method='GET', block=True)  # Limitado devido ao impacto na performance
def api_system_metrics(request):
    """
    Retorna métricas completas do sistema.
    Dados são cacheados por 30 segundos.
    """
    cache_key = "system_metrics_full"
    
    # Tentar buscar do cache
    cached_result = cache.get(cache_key)
    if cached_result:
        return Response(cached_result)
    
    # Coletar métricas
    metrics = get_system_metrics()
    
    # Cachear resultado por 30 segundos
    cache.set(cache_key, metrics, 30)
    
    return Response(metrics)


@extend_schema(
    tags=["Sistema"],
    summary="Status de saúde do sistema",
    responses={200: OpenApiTypes.OBJECT},
    description="Retorna o status de saúde do sistema com indicadores de CPU, memória, disco e serviços."
)
@api_view(["GET"])
# @ratelimit(key='ip', rate='30/m', method='GET', block=True)
def api_system_health(request):
    """
    Retorna status de saúde do sistema.
    Dados são cacheados por 15 segundos.
    """
    cache_key = "system_health"
    
    # Tentar buscar do cache
    cached_result = cache.get(cache_key)
    if cached_result:
        return Response(cached_result)
    
    # Verificar saúde do sistema
    health = get_system_health()
    
    # Cachear resultado por 15 segundos
    cache.set(cache_key, health, 15)
    
    return Response(health)

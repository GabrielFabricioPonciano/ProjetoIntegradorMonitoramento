from django.urls import path
from django.http import HttpResponse
from django.shortcuts import render
from django.db.models import Avg, Min, Max, Count
from django.utils import timezone
from datetime import timedelta
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .models import Measurement
from .domain import violation_q, violation_reason
from .reports import export_pdf_report, export_excel_report
from .tasks import rotate_and_append_daily_measurements
from .ai_models import EnvironmentalAI

# Temporary inline function definitions
def dashboard(request):
    return render(request, 'dashboard.html')

@api_view(['GET'])
def api_summary(request):
    # Últimas 24 horas
    since = timezone.now() - timedelta(hours=24)
    
    # Estatísticas gerais
    stats = Measurement.objects.filter(ts__gte=since).aggregate(
        temp_avg=Avg('temp_current'),
        temp_min=Min('temp_current'),
        temp_max=Max('temp_current'),
        rh_avg=Avg('rh_current'),
        rh_min=Min('rh_current'),
        rh_max=Max('rh_current'),
        total_measurements=Count('id')
    )
    
    # Contar violações
    violations_count = Measurement.objects.filter(ts__gte=since).filter(violation_q()).count()
    
    # Valores atuais (última medição)
    latest = Measurement.objects.filter(ts__gte=since).order_by('-ts').first()
    
    return Response({
        'temperature': {
            'current': round(latest.temp_current, 1) if latest and latest.temp_current else None,
            'average': round(stats['temp_avg'], 1) if stats['temp_avg'] else None,
            'min': round(stats['temp_min'], 1) if stats['temp_min'] else None,
            'max': round(stats['temp_max'], 1) if stats['temp_max'] else None,
        },
        'humidity': {
            'current': round(latest.rh_current * 100, 1) if latest and latest.rh_current else None,
            'average': round(stats['rh_avg'] * 100, 1) if stats['rh_avg'] else None,
            'min': round(stats['rh_min'] * 100, 1) if stats['rh_min'] else None,
            'max': round(stats['rh_max'] * 100, 1) if stats['rh_max'] else None,
        },
        'measurements': stats['total_measurements'] or 0,
        'violations': violations_count
    })

@api_view(['GET'])
def api_series(request):
    # Últimas 24 horas
    since = timezone.now() - timedelta(hours=24)
    
    # Buscar medições ordenadas por tempo
    measurements = Measurement.objects.filter(ts__gte=since).order_by('ts').values(
        'ts', 'temp_current', 'rh_current'
    )
    
    # Formatar dados para o frontend
    series_data = []
    for m in measurements:
        series_data.append({
            'timestamp': m['ts'].isoformat(),
            'temperature': round(m['temp_current'], 1) if m['temp_current'] else None,
            'humidity': round(m['rh_current'] * 100, 1) if m['rh_current'] else None,
        })
    
    return Response(series_data)

@api_view(['GET'])
def api_violations(request):
    # Últimas 24 horas
    since = timezone.now() - timedelta(hours=24)
    
    # Buscar medições com violações
    violations = Measurement.objects.filter(ts__gte=since).filter(violation_q()).order_by('-ts').values(
        'ts', 'temp_current', 'rh_current'
    )[:50]  # Limitar a 50 violações mais recentes
    
    # Formatar dados das violações
    violations_data = []
    for v in violations:
        violations_data.append({
            'timestamp': v['ts'].isoformat(),
            'temperature': round(v['temp_current'], 1) if v['temp_current'] else None,
            'humidity': round(v['rh_current'] * 100, 1) if v['rh_current'] else None,
            'reason': violation_reason(v)
        })
    
    return Response(violations_data)

@api_view(['POST'])
def force_simulator_cycle(request):
    try:
        success = rotate_and_append_daily_measurements()
        if success:
            return Response({
                'status': 'success', 
                'message': 'Ciclo do simulador executado com sucesso'
            })
        else:
            return Response({
                'status': 'error',
                'message': 'Falha ao executar ciclo do simulador'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    except Exception as e:
        return Response({
            'status': 'error',
            'message': f'Erro interno: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def api_frontend_logs(request):
    # Aceitar logs do frontend (por enquanto apenas retorna sucesso)
    # Em uma implementação completa, poderia salvar em arquivo ou banco
    return Response({'status': 'success'})

@api_view(['GET'])
def api_system_metrics(request):
    try:
        import psutil
        return Response({
            'cpu': psutil.cpu_percent(interval=1),
            'memory': psutil.virtual_memory().percent
        })
    except ImportError:
        # Fallback se psutil não estiver disponível
        return Response({
            'cpu': 0,
            'memory': 0
        })

@api_view(['GET'])
def api_system_health(request):
    # Verificar saúde básica do sistema
    try:
        # Verificar se há medições recentes (últimas 24h)
        since = timezone.now() - timedelta(hours=24)
        recent_count = Measurement.objects.filter(ts__gte=since).count()
        
        # Verificar se o banco está acessível
        db_healthy = True
        
        # Verificar se há dados suficientes
        total_count = Measurement.objects.count()
        
        status_code = status.HTTP_200_OK
        health_status = 'healthy'
        
        if recent_count == 0:
            health_status = 'warning'
            status_code = status.HTTP_200_OK  # Ainda retorna 200, mas com warning
        elif total_count == 0:
            health_status = 'error'
            status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        
        return Response({
            'status': health_status,
            'database': 'healthy' if db_healthy else 'error',
            'measurements': {
                'total': total_count,
                'recent_24h': recent_count
            }
        }, status=status_code)
        
    except Exception as e:
        return Response({
            'status': 'error',
            'error': str(e)
        }, status=status.HTTP_503_SERVICE_UNAVAILABLE)

# === APIs de IA ===
ai_system = EnvironmentalAI()

@api_view(['GET'])
def api_ai_insights(request):
    """Retorna insights inteligentes baseados nos dados"""
    try:
        days = int(request.GET.get('days', 30))
        insights = ai_system.generate_insights(days)
        return Response(insights)
    except Exception as e:
        return Response({
            'error': f'Erro ao gerar insights: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def api_ai_anomalies(request):
    """Detecta anomalias nas medições"""
    try:
        days = int(request.GET.get('days', 30))
        anomalies = ai_system.detect_anomalies(days)
        return Response(anomalies)
    except Exception as e:
        return Response({
            'error': f'Erro ao detectar anomalias: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def api_ai_predictions(request):
    """Gera previsões para as próximas horas"""
    try:
        hours = int(request.GET.get('hours', 12))
        predictions = ai_system.predict_trends(hours)
        return Response(predictions)
    except Exception as e:
        return Response({
            'error': f'Erro ao gerar previsões: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def api_ai_patterns(request):
    """Analisa padrões nos dados históricos"""
    try:
        days = int(request.GET.get('days', 30))
        patterns = ai_system.analyze_patterns(days)
        return Response(patterns)
    except Exception as e:
        return Response({
            'error': f'Erro ao analisar padrões: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

urlpatterns = [
    path("", dashboard, name="dashboard"),  # Dashboard principal
    path("dashboard", dashboard, name="dashboard"),  # Rota alternativa
    path("api/summary/", api_summary),
    path("api/series/", api_series),
    path("api/violations/", api_violations),
    path("api/force-cycle/", force_simulator_cycle, name="force_simulator_cycle"),  # Endpoint para forçar ciclo
    path("api/frontend-logs/", api_frontend_logs, name="api_frontend_logs"),  # Logs do frontend
    
    # Relatórios
    path("reports/pdf/", export_pdf_report, name="export_pdf"),
    path("reports/excel/", export_excel_report, name="export_excel"),
    
    # Métricas do sistema
    path("api/system/metrics/", api_system_metrics, name="api_system_metrics"),
    path("api/system/health/", api_system_health, name="api_system_health"),
    
    # APIs de Inteligência Artificial
    path("api/ai/insights/", api_ai_insights, name="api_ai_insights"),
    path("api/ai/anomalies/", api_ai_anomalies, name="api_ai_anomalies"),
    path("api/ai/predictions/", api_ai_predictions, name="api_ai_predictions"),
    path("api/ai/patterns/", api_ai_patterns, name="api_ai_patterns"),
]

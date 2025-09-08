from django.urls import path
from . import views
from .reports import export_pdf_report, export_excel_report

urlpatterns = [
    path("", views.dashboard, name="dashboard"),  # Dashboard principal
    path("dashboard", views.dashboard, name="dashboard"),  # Rota alternativa
    path("api/summary", views.api_summary),
    path("api/series", views.api_series),
    path("api/violations", views.api_violations),
    path("api/force-cycle", views.force_simulator_cycle, name="force_simulator_cycle"),  # Endpoint para forçar ciclo
    path("api/frontend-logs", views.api_frontend_logs, name="api_frontend_logs"),  # Logs do frontend
    
    # Relatórios
    path("reports/pdf", export_pdf_report, name="export_pdf"),
    path("reports/excel", export_excel_report, name="export_excel"),
    
    # Métricas do sistema
    path("api/system/metrics", views.api_system_metrics, name="api_system_metrics"),
    path("api/system/health", views.api_system_health, name="api_system_health"),
]

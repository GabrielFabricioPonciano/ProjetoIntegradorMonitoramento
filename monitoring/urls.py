
from django.urls import path
from .views import (
    dashboard, api_summary, api_series, api_violations,
    force_simulator_cycle, api_frontend_logs, api_system_metrics,
    api_system_health
)

urlpatterns = [
    path("", dashboard, name="dashboard"),
    path("dashboard/", dashboard, name="dashboard"),
    path("api/summary/", api_summary, name="api_summary"),
    path("api/series/", api_series, name="api_series"),
    path("api/violations/", api_violations, name="api_violations"),
    path("api/force-cycle/", force_simulator_cycle, name="force_simulator_cycle"),
    path("api/frontend-logs/", api_frontend_logs, name="api_frontend_logs"),
    path("api/system/metrics/", api_system_metrics, name="api_system_metrics"),
    path("api/system/health/", api_system_health, name="api_system_health"),
]
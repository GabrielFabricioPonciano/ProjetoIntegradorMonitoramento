from django.urls import path
from . import views

urlpatterns = [
    path("", views.dashboard, name="dashboard"),  # Dashboard principal
    path("dashboard", views.dashboard, name="dashboard"),  # Rota alternativa
    path("api/summary", views.api_summary),
    path("api/series", views.api_series),
    path("api/violations", views.api_violations),
]

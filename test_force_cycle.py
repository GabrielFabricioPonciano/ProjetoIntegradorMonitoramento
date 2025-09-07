#!/usr/bin/env python3
"""
Script de teste para o endpoint force_simulator_cycle
"""
import os
import sys
import django

# Configurar Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pi_monitoring.settings')
django.setup()

from django.test import Client
from django.contrib.auth.models import User
from monitoring.models import Measurement
from django.utils import timezone

def test_force_cycle_endpoint():
    print("=== Teste do Endpoint force_simulator_cycle ===")
    
    # Criar cliente de teste
    client = Client()
    
    # Dados antes do teste
    total_before = Measurement.objects.count()
    try:
        latest_before = timezone.localtime(Measurement.objects.latest('ts').ts)
        print(f"Dados antes: {total_before} registros, último: {latest_before}")
    except Measurement.DoesNotExist:
        print(f"Dados antes: {total_before} registros")
    
    # Fazer requisição POST
    print("\nFazendo requisição POST para /api/force-cycle...")
    response = client.post('/api/force-cycle', content_type='application/json')
    
    print(f"Status: {response.status_code}")
    print(f"Content-Type: {response.get('Content-Type', 'N/A')}")
    
    if response.status_code == 200:
        try:
            import json
            data = json.loads(response.content.decode())
            print(f"Resposta JSON: {json.dumps(data, indent=2, ensure_ascii=False)}")
        except:
            print(f"Resposta (texto): {response.content.decode()}")
    else:
        print(f"Erro: {response.content.decode()}")
    
    # Dados depois do teste
    total_after = Measurement.objects.count()
    try:
        latest_after = timezone.localtime(Measurement.objects.latest('ts').ts)
        print(f"\nDados depois: {total_after} registros, último: {latest_after}")
    except Measurement.DoesNotExist:
        print(f"\nDados depois: {total_after} registros")
    
    print(f"Diferença: {total_after - total_before} registros")

if __name__ == "__main__":
    test_force_cycle_endpoint()

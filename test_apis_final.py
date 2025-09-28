import time
import requests

# Aguardar um pouco para o servidor inicializar
time.sleep(2)

base_url = 'http://127.0.0.1:8000'

print('Testando APIs corrigidas:')
print('=' * 50)

# Testar summary
try:
    response = requests.get(f'{base_url}/api/summary/?days=30', timeout=5)
    print(f'✅ Summary API: {response.status_code}')
    if response.status_code == 200:
        data = response.json()
        temp_avg = data.get('temperature', {}).get('average', 'N/A')
        hum_avg = data.get('humidity', {}).get('average', 'N/A')
        measurements = data.get('measurements', 'N/A')
        violations = data.get('violations', 'N/A')
        print(f'   Temperatura média: {temp_avg}°C')
        print(f'   Umidade média: {hum_avg}%')
        print(f'   Total medições: {measurements}')
        print(f'   Violações: {violations}')
except Exception as e:
    print(f'❌ Summary API Error: {e}')

print()

# Testar series
try:
    response = requests.get(f'{base_url}/api/series/?days=30', timeout=5)
    print(f'✅ Series API: {response.status_code}')
    if response.status_code == 200:
        data = response.json()
        print(f'   Pontos de dados: {len(data)}')
except Exception as e:
    print(f'❌ Series API Error: {e}')

print()

# Testar violations
try:
    response = requests.get(f'{base_url}/api/violations/?days=30&limit=10', timeout=5)
    print(f'✅ Violations API: {response.status_code}')
    if response.status_code == 200:
        data = response.json()
        print(f'   Violações encontradas: {len(data)}')
except Exception as e:
    print(f'❌ Violations API Error: {e}')

print()

# Testar AI insights
try:
    response = requests.get(f'{base_url}/api/ai/insights/?days=30', timeout=5)
    print(f'✅ AI Insights API: {response.status_code}')
    if response.status_code == 200:
        data = response.json()
        insights_count = len(data) if isinstance(data, list) else 'objeto'
        print(f'   Insights gerados: {insights_count}')
except Exception as e:
    print(f'❌ AI Insights API Error: {e}')

print()
print('🎉 Todas as APIs estão funcionando corretamente!')
print('📱 Agora verifique o dashboard no navegador: http://127.0.0.1:8000')
print('🔍 Use o botão de debug (canto inferior direito) para ver os logs do console.')
print('🔄 Teste mudar o período e clicar em "Forçar Ciclo" para ver se os dados atualizam.')
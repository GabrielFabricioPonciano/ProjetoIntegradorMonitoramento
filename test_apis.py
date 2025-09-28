import requests

base_url = 'http://127.0.0.1:8000'

# Testar summary
try:
    response = requests.get(f'{base_url}/api/summary/?days=30')
    print(f'Summary API: {response.status_code} - {len(response.text)} chars')
    if response.status_code == 200:
        data = response.json()
        print(f'  Temperature: {data.get("temperature", {}).get("average", "N/A")}')
        print(f'  Humidity: {data.get("humidity", {}).get("average", "N/A")}')
        print(f'  Measurements: {data.get("measurements", "N/A")}')
        print(f'  Violations: {data.get("violations", "N/A")}')
except Exception as e:
    print(f'Summary API Error: {e}')

# Testar series
try:
    response = requests.get(f'{base_url}/api/series/?days=30')
    print(f'Series API: {response.status_code} - {len(response.text)} chars')
    if response.status_code == 200:
        data = response.json()
        print(f'  Data points: {len(data)}')
except Exception as e:
    print(f'Series API Error: {e}')

# Testar violations
try:
    response = requests.get(f'{base_url}/api/violations/?days=30&limit=10')
    print(f'Violations API: {response.status_code} - {len(response.text)} chars')
    if response.status_code == 200:
        data = response.json()
        print(f'  Violations found: {len(data)}')
except Exception as e:
    print(f'Violations API Error: {e}')

# Testar AI insights
try:
    response = requests.get(f'{base_url}/api/ai/insights/?days=30')
    print(f'AI Insights API: {response.status_code} - {len(response.text)} chars')
    if response.status_code == 200:
        data = response.json()
        print(f'  Insights: {len(data) if isinstance(data, list) else "object"}')
except Exception as e:
    print(f'AI Insights API Error: {e}')
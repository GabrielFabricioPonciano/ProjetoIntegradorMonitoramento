import requests
import json

print("=== Teste da API Corrigida ===")

# Testar API summary
r1 = requests.get('http://127.0.0.1:8000/api/summary?days=1')
summary = r1.json()
print(f"Summary: {json.dumps(summary, indent=2)}")

# Testar API series
r2 = requests.get('http://127.0.0.1:8000/api/series?days=1&max_points=5')
series = r2.json()
print(f"\nSérie temporal ({len(series)} pontos):")
for item in series[:3]:
    print(f"  {item['timestamp']} - {item['temperature']}°C, {item['relative_humidity']}%")

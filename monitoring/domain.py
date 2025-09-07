from django.db.models import Q

# Limites mais realistas baseados nos dados reais
TEMP_LOW = 17.0   # Antes: 10.0
TEMP_HIGH = 19.5  # Antes: 15.0  
RH_LIMIT = 62.0   # Antes: 60.0

def violation_q():
    # Ajusta a consulta para comparar com fração (RH_LIMIT/100)
    return Q(temp_current__lt=TEMP_LOW) | Q(temp_current__gt=TEMP_HIGH) | Q(rh_current__gte=RH_LIMIT/100.0)

def violation_reason(row: dict) -> str:
    r = []
    t = row.get("temp_current")
    h = row.get("rh_current")   
    if t is not None and (t < TEMP_LOW or t > TEMP_HIGH):
        r.append(f"Temperatura {t:.1f}°C fora do intervalo {TEMP_LOW:.1f}°C - {TEMP_HIGH:.1f}°C")
    if h is not None and h >= RH_LIMIT/100.0:
        # Converte para porcentagem na exibição
        h_pct = h * 100
        r.append(f"Umidade relativa {h_pct:.1f}% acima do limite {RH_LIMIT:.1f}%")
    return ", ".join(r) if r else "Sem violação"

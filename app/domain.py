from typing import Optional

TEMP_LOW = 17.0
TEMP_HIGH = 19.5
RH_LIMIT = 62.0


def is_violation(temp: Optional[float], rh: Optional[float]) -> bool:
    if temp is not None and (temp < TEMP_LOW or temp > TEMP_HIGH):
        return True
    if rh is not None and rh >= RH_LIMIT / 100.0:
        return True
    return False


def violation_reason(temp: Optional[float], rh: Optional[float]) -> str:
    reasons = []
    
    if temp is not None and (temp < TEMP_LOW or temp > TEMP_HIGH):
        reasons.append(
            f"Temperatura {temp:.1f}°C fora do intervalo {TEMP_LOW:.1f}°C - {TEMP_HIGH:.1f}°C"
        )
    
    if rh is not None and rh >= RH_LIMIT / 100.0:
        rh_pct = rh * 100
        reasons.append(
            f"Umidade relativa {rh_pct:.1f}% acima do limite {RH_LIMIT:.1f}%"
        )
    
    return ", ".join(reasons) if reasons else "Sem violação"

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pi_monitoring.settings')
django.setup()

from monitoring.models import Measurement
from django.utils import timezone

print("=== VERIFICAÇÃO DO SIMULADOR ===")
print(f"Total de registros: {Measurement.objects.count()}")

print("\nÚltimos 4 registros:")
latest = Measurement.objects.order_by('-ts')[:4]
for m in latest:
    local_time = timezone.localtime(m.ts)
    print(f"  {local_time.strftime('%Y-%m-%d %H:%M')} - T:{m.temp_current}°C UR:{m.rh_current*100:.1f}%")

print("\nPrimeiros 2 registros:")
oldest = Measurement.objects.order_by('ts')[:2]
for m in oldest:
    local_time = timezone.localtime(m.ts)
    print(f"  {local_time.strftime('%Y-%m-%d %H:%M')} - T:{m.temp_current}°C UR:{m.rh_current*100:.1f}%")

# Verificar range de datas
first_date = timezone.localtime(Measurement.objects.earliest('ts').ts).date()
last_date = timezone.localtime(Measurement.objects.latest('ts').ts).date()
total_days = (last_date - first_date).days + 1

print(f"\nRange de datas: {first_date} até {last_date}")
print(f"Total de dias: {total_days}")
print(f"Registros por dia: {Measurement.objects.count() / total_days:.1f}")

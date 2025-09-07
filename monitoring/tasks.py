"""
Agendador leve para simulação de dados de monitoramento ambiental.

Este módulo implementa um sistema de geração automática de dados sintéticos
sem dependências externas (Celery, Redis), usando apenas threading do Python.

Funcionalidades:
- Gera 2 medições por dia (07:30 e 16:30) automaticamente a cada minuto
- Mantém rolling window de 365 dias (730 registros máximo)
- Remove dados mais antigos automaticamente
- Valores realistas com variação controlada
- Timezone aware (America/Sao_Paulo)
- Thread-safe e idempotente

Configuração no settings.py:
- SIM_JOB_INTERVAL_SECONDS: intervalo entre execuções (padrão: 60s)
- SIM_DAILY_TIMES: horários das medições (padrão: ["07:30", "16:30"])
- SIM_TARGET_DAYS: dias a manter (padrão: 365)
- ENABLE_SIM_JOB: flag para ativar/desativar (padrão: True em DEBUG)
"""

import logging
import threading
import time
import random
import os
from datetime import datetime, timedelta, time as dt_time
from typing import List, Tuple, Optional

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from django.core.exceptions import ValidationError

from .models import Measurement

# Configuração de logging
logger = logging.getLogger(__name__)

# Scheduler global
_scheduler_thread = None
_scheduler_running = False
_scheduler_lock = threading.Lock()


def get_sim_settings() -> dict:
    """
    Obtém configurações do simulador com valores padrão.
    
    Returns:
        dict: Configurações do simulador
    """
    return {
        'interval_seconds': getattr(settings, 'SIM_JOB_INTERVAL_SECONDS', 60),
        'daily_times': getattr(settings, 'SIM_DAILY_TIMES', ["07:30", "16:30"]),
        'target_days': getattr(settings, 'SIM_TARGET_DAYS', 365),
        'enabled': getattr(settings, 'ENABLE_SIM_JOB', settings.DEBUG),
    }


def _get_next_day() -> datetime:
    """
    Obtém o próximo dia para inserção de dados.
    
    Se não houver dados, retorna 01/01/2025.
    Caso contrário, retorna o dia seguinte ao último registro.
    
    Returns:
        datetime: Próximo dia (timezone aware, meia-noite)
    """
    try:
        # Buscar a última medição
        latest_measurement = Measurement.objects.latest('ts')
        latest_date = timezone.localtime(latest_measurement.ts).date()
        next_date = latest_date + timedelta(days=1)
        
        logger.debug(f"Última medição: {latest_date}, próximo dia: {next_date}")
        
    except Measurement.DoesNotExist:
        # Se não há dados, começar em 01/01/2025
        next_date = datetime(2025, 1, 1).date()
        logger.info("Nenhuma medição encontrada, iniciando em 01/01/2025")
    
    # Retornar datetime timezone-aware às 00:00
    naive_datetime = datetime.combine(next_date, dt_time(0, 0, 0))
    return timezone.make_aware(naive_datetime, timezone.get_current_timezone())


def _generate_realistic_values() -> Tuple[float, float]:
    """
    Gera valores realistas de temperatura e umidade com variação controlada.
    
    Temperatura: distribuição normal em torno de 18.4°C (±0.4°C)
    Umidade: distribuição normal em torno de 59.0% (±2.0%)
    
    Returns:
        Tuple[float, float]: (temperatura, umidade_percentual)
    """
    # Temperatura: média 18.4°C, desvio 0.4°C, clamp [17.0, 19.5]
    temp = random.gauss(18.4, 0.4)
    temp = max(17.0, min(19.5, temp))
    
    # Umidade: média 59.0%, desvio 2.0%, clamp [56.0, 65.0]
    # Ocasionalmente pode cruzar 62% para gerar violações
    humidity = random.gauss(59.0, 2.0)
    humidity = max(56.0, min(65.0, humidity))
    
    # Converter umidade para fração [0, 1]
    humidity_fraction = humidity / 100.0
    
    logger.debug(f"Valores gerados - Temp: {temp:.2f}°C, UR: {humidity:.1f}%")
    
    return round(temp, 2), round(humidity_fraction, 4)


def _insert_day_records(target_date: datetime) -> int:
    """
    Insere registros para um dia específico nos horários configurados.
    
    Args:
        target_date: Data alvo (timezone aware)
    
    Returns:
        int: Número de registros inseridos
    """
    sim_config = get_sim_settings()
    daily_times = sim_config['daily_times']
    
    inserted_count = 0
    target_date_only = timezone.localtime(target_date).date()
    
    for time_str in daily_times:
        # Parse do horário (formato "HH:MM")
        hour, minute = map(int, time_str.split(':'))
        
        # Criar datetime completo
        naive_dt = datetime.combine(target_date_only, dt_time(hour, minute, 0))
        aware_dt = timezone.make_aware(naive_dt, timezone.get_current_timezone())
        
        # Verificar se já existe (idempotência)
        if Measurement.objects.filter(ts=aware_dt).exists():
            logger.debug(f"Registro já existe para {aware_dt}, pulando")
            continue
        
        # Gerar valores realistas
        temp, humidity = _generate_realistic_values()
        
        # Criar medição
        measurement = Measurement.objects.create(
            ts=aware_dt,
            temp_current=temp,
            temp_min=temp,  # MVP: iguais ao current
            temp_max=temp,
            rh_current=humidity,
            rh_min=humidity,
            rh_max=humidity
        )
        
        inserted_count += 1
        logger.debug(f"Inserida medição: {aware_dt} - T:{temp}°C, UR:{humidity*100:.1f}%")
    
    return inserted_count


def _prune_oldest_day() -> int:
    """
    Remove o dia mais antigo quando exceder o limite de registros.
    
    Returns:
        int: Número de registros removidos
    """
    sim_config = get_sim_settings()
    target_days = sim_config['target_days']
    max_records = target_days * len(sim_config['daily_times'])  # Ex: 365 * 2 = 730
    
    current_count = Measurement.objects.count()
    
    if current_count <= max_records:
        logger.debug(f"Contagem atual ({current_count}) dentro do limite ({max_records})")
        return 0
    
    # Encontrar o dia mais antigo
    oldest_measurement = Measurement.objects.earliest('ts')
    oldest_date = timezone.localtime(oldest_measurement.ts).date()
    
    # Deletar todos os registros do dia mais antigo
    oldest_day_start = timezone.make_aware(
        datetime.combine(oldest_date, dt_time(0, 0, 0)),
        timezone.get_current_timezone()
    )
    oldest_day_end = oldest_day_start + timedelta(days=1)
    
    deleted_count, _ = Measurement.objects.filter(
        ts__gte=oldest_day_start,
        ts__lt=oldest_day_end
    ).delete()
    
    logger.info(f"Removidos {deleted_count} registros do dia {oldest_date}")
    return deleted_count


@transaction.atomic
def rotate_and_append_daily_measurements() -> bool:
    """
    Executa um ciclo completo de rotação e inserção de dados.
    
    1. Determina o próximo dia a inserir
    2. Verifica se já foi inserido (idempotência)
    3. Insere as medições do dia
    4. Remove dias antigos se exceder o limite
    5. Registra estatísticas
    
    Returns:
        bool: True se executou com sucesso, False em caso de erro
    """
    try:
        # Obter próximo dia
        next_day = _get_next_day()
        next_date_str = timezone.localtime(next_day).strftime('%Y-%m-%d')
        
        # Verificar se o dia já foi processado (idempotência por dia)
        next_day_start = next_day
        next_day_end = next_day + timedelta(days=1)
        existing_count = Measurement.objects.filter(
            ts__gte=next_day_start,
            ts__lt=next_day_end
        ).count()
        
        if existing_count > 0:
            logger.debug(f"Dia {next_date_str} já processado ({existing_count} registros)")
            return True
        
        # Inserir registros do novo dia
        inserted_count = _insert_day_records(next_day)
        
        if inserted_count == 0:
            logger.warning(f"Nenhum registro inserido para {next_date_str}")
            return False
        
        # Remover dias antigos se necessário
        removed_count = _prune_oldest_day()
        
        # Estatísticas finais
        total_records = Measurement.objects.count()
        
        logger.info(
            f"Job executado com sucesso - "
            f"Inserido: {next_date_str} ({inserted_count} registros), "
            f"Removido: {removed_count} registros antigos, "
            f"Total atual: {total_records} registros"
        )
        
        return True
        
    except Exception as e:
        logger.error(f"Erro no job de simulação: {e}", exc_info=True)
        return False


def _scheduler_worker():
    """
    Worker thread que executa o agendador em background.
    
    Executa o job a cada intervalo configurado até ser interrompido.
    """
    global _scheduler_running
    sim_config = get_sim_settings()
    interval = sim_config['interval_seconds']
    
    logger.info(f"Agendador iniciado - intervalo: {interval}s")
    
    while _scheduler_running:
        try:
            # Executar o job
            success = rotate_and_append_daily_measurements()
            
            if not success:
                logger.warning("Job falhou, tentando novamente no próximo ciclo")
            
        except Exception as e:
            logger.error(f"Erro crítico no agendador: {e}", exc_info=True)
        
        # Aguardar próximo ciclo
        time.sleep(interval)
    
    logger.info("Agendador finalizado")


def start_background_scheduler() -> bool:
    """
    Inicia o agendador em background thread.
    
    Thread-safe e idempotente - não cria múltiplas instâncias.
    
    Returns:
        bool: True se iniciou com sucesso, False se já estava rodando ou desabilitado
    """
    global _scheduler_thread, _scheduler_running
    
    sim_config = get_sim_settings()
    
    if not sim_config['enabled']:
        logger.info("Simulador desabilitado via configuração")
        return False
    
    with _scheduler_lock:
        if _scheduler_running:
            logger.warning("Agendador já está rodando")
            return False
        
        # Iniciar thread em background
        _scheduler_running = True
        _scheduler_thread = threading.Thread(
            target=_scheduler_worker,
            name="SimulatorScheduler",
            daemon=True  # Thread daemon para não bloquear shutdown
        )
        _scheduler_thread.start()
        
        logger.info("Agendador de simulação iniciado em background")
        return True


def stop_background_scheduler() -> bool:
    """
    Para o agendador em background.
    
    Returns:
        bool: True se parou com sucesso, False se já estava parado
    """
    global _scheduler_running
    
    with _scheduler_lock:
        if not _scheduler_running:
            logger.info("Agendador já estava parado")
            return False
        
        _scheduler_running = False
        logger.info("Sinal de parada enviado ao agendador")
        return True


def is_scheduler_running() -> bool:
    """
    Verifica se o agendador está rodando.
    
    Returns:
        bool: True se o agendador está ativo
    """
    return _scheduler_running

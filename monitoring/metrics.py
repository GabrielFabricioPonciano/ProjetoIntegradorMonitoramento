"""
Sistema de monitoramento de métricas do sistema.
Monitora CPU, memória, disco, rede e performance do Django.
"""
import os
import time
import psutil
import logging
from datetime import datetime
from typing import Dict, Any, List
from django.core.cache import cache
from django.db import connection
from django.conf import settings


logger = logging.getLogger(__name__)


class SystemMetrics:
    """Coletor de métricas do sistema."""
    
    @staticmethod
    def get_cpu_metrics() -> Dict[str, Any]:
        """Obtém métricas de CPU."""
        try:
            return {
                'cpu_percent': psutil.cpu_percent(interval=1),
                'cpu_count': psutil.cpu_count(),
                'cpu_count_logical': psutil.cpu_count(logical=True),
                'load_average': os.getloadavg() if hasattr(os, 'getloadavg') else None,
            }
        except Exception as e:
            logger.error(f"Erro ao obter métricas de CPU: {e}")
            return {}
    
    @staticmethod
    def get_memory_metrics() -> Dict[str, Any]:
        """Obtém métricas de memória."""
        try:
            memory = psutil.virtual_memory()
            swap = psutil.swap_memory()
            
            return {
                'memory_total': memory.total,
                'memory_available': memory.available,
                'memory_used': memory.used,
                'memory_percent': memory.percent,
                'swap_total': swap.total,
                'swap_used': swap.used,
                'swap_percent': swap.percent,
            }
        except Exception as e:
            logger.error(f"Erro ao obter métricas de memória: {e}")
            return {}
    
    @staticmethod
    def get_disk_metrics() -> Dict[str, Any]:
        """Obtém métricas de disco."""
        try:
            disk_usage = psutil.disk_usage('/')
            disk_io = psutil.disk_io_counters()
            
            metrics = {
                'disk_total': disk_usage.total,
                'disk_used': disk_usage.used,
                'disk_free': disk_usage.free,
                'disk_percent': (disk_usage.used / disk_usage.total) * 100,
            }
            
            if disk_io:
                metrics.update({
                    'disk_read_bytes': disk_io.read_bytes,
                    'disk_write_bytes': disk_io.write_bytes,
                    'disk_read_count': disk_io.read_count,
                    'disk_write_count': disk_io.write_count,
                })
            
            return metrics
        except Exception as e:
            logger.error(f"Erro ao obter métricas de disco: {e}")
            return {}
    
    @staticmethod
    def get_network_metrics() -> Dict[str, Any]:
        """Obtém métricas de rede."""
        try:
            net_io = psutil.net_io_counters()
            net_connections = len(psutil.net_connections())
            
            return {
                'network_bytes_sent': net_io.bytes_sent,
                'network_bytes_recv': net_io.bytes_recv,
                'network_packets_sent': net_io.packets_sent,
                'network_packets_recv': net_io.packets_recv,
                'network_errin': net_io.errin,
                'network_errout': net_io.errout,
                'network_dropin': net_io.dropin,
                'network_dropout': net_io.dropout,
                'network_connections': net_connections,
            }
        except Exception as e:
            logger.error(f"Erro ao obter métricas de rede: {e}")
            return {}
    
    @staticmethod
    def get_process_metrics() -> Dict[str, Any]:
        """Obtém métricas do processo atual."""
        try:
            process = psutil.Process()
            
            with process.oneshot():
                return {
                    'process_pid': process.pid,
                    'process_memory_rss': process.memory_info().rss,
                    'process_memory_vms': process.memory_info().vms,
                    'process_memory_percent': process.memory_percent(),
                    'process_cpu_percent': process.cpu_percent(),
                    'process_num_threads': process.num_threads(),
                    'process_num_fds': process.num_fds() if hasattr(process, 'num_fds') else None,
                    'process_create_time': process.create_time(),
                }
        except Exception as e:
            logger.error(f"Erro ao obter métricas do processo: {e}")
            return {}


class DatabaseMetrics:
    """Coletor de métricas do banco de dados."""
    
    @staticmethod
    def get_connection_metrics() -> Dict[str, Any]:
        """Obtém métricas de conexão com o banco."""
        try:
            with connection.cursor() as cursor:
                # Número de conexões ativas
                cursor.execute("""
                    SELECT count(*) as active_connections
                    FROM pg_stat_activity
                    WHERE state = 'active'
                """)
                active_connections = cursor.fetchone()[0]
                
                # Número total de conexões
                cursor.execute("SELECT count(*) as total_connections FROM pg_stat_activity")
                total_connections = cursor.fetchone()[0]
                
                # Tamanho do banco de dados
                cursor.execute("""
                    SELECT pg_size_pretty(pg_database_size(current_database())) as db_size_pretty,
                           pg_database_size(current_database()) as db_size_bytes
                """)
                db_size_result = cursor.fetchone()
                
                return {
                    'db_active_connections': active_connections,
                    'db_total_connections': total_connections,
                    'db_size_pretty': db_size_result[0],
                    'db_size_bytes': db_size_result[1],
                }
        except Exception as e:
            logger.error(f"Erro ao obter métricas do banco: {e}")
            return {}
    
    @staticmethod
    def get_table_metrics() -> Dict[str, Any]:
        """Obtém métricas das tabelas principais."""
        try:
            with connection.cursor() as cursor:
                # Contagem de registros na tabela principal
                cursor.execute("SELECT count(*) FROM monitoring_temperaturehumidityrecord")
                record_count = cursor.fetchone()[0]
                
                # Tamanho da tabela principal
                cursor.execute("""
                    SELECT pg_size_pretty(pg_total_relation_size('monitoring_temperaturehumidityrecord')) as table_size_pretty,
                           pg_total_relation_size('monitoring_temperaturehumidityrecord') as table_size_bytes
                """)
                table_size_result = cursor.fetchone()
                
                return {
                    'table_record_count': record_count,
                    'table_size_pretty': table_size_result[0],
                    'table_size_bytes': table_size_result[1],
                }
        except Exception as e:
            logger.error(f"Erro ao obter métricas das tabelas: {e}")
            return {}


class DjangoMetrics:
    """Coletor de métricas específicas do Django."""
    
    @staticmethod
    def get_application_metrics() -> Dict[str, Any]:
        """Obtém métricas da aplicação."""
        try:
            return {
                'django_version': getattr(settings, 'DJANGO_VERSION', 'unknown'),
                'debug_mode': settings.DEBUG,
                'timezone': str(settings.TIME_ZONE),
                'language_code': settings.LANGUAGE_CODE,
                'allowed_hosts': settings.ALLOWED_HOSTS,
                'secret_key_length': len(settings.SECRET_KEY),
            }
        except Exception as e:
            logger.error(f"Erro ao obter métricas da aplicação: {e}")
            return {}


class MetricsCollector:
    """Coletor principal que agrega todas as métricas."""
    
    def __init__(self):
        self.system_metrics = SystemMetrics()
        self.database_metrics = DatabaseMetrics()
        self.django_metrics = DjangoMetrics()
    
    def collect_all(self) -> Dict[str, Any]:
        """Coleta todas as métricas disponíveis."""
        start_time = time.time()
        
        metrics = {
            'timestamp': datetime.now().isoformat(),
            'collection_time_ms': 0,  # Será preenchido no final
        }
        
        # Coletar métricas do sistema
        metrics.update(self.system_metrics.get_cpu_metrics())
        metrics.update(self.system_metrics.get_memory_metrics())
        metrics.update(self.system_metrics.get_disk_metrics())
        metrics.update(self.system_metrics.get_network_metrics())
        metrics.update(self.system_metrics.get_process_metrics())
        
        # Coletar métricas do banco de dados
        metrics.update(self.database_metrics.get_connection_metrics())
        metrics.update(self.database_metrics.get_table_metrics())
        
        # Coletar métricas do Django
        metrics.update(self.django_metrics.get_application_metrics())
        
        # Calcular tempo de coleta
        end_time = time.time()
        metrics['collection_time_ms'] = round((end_time - start_time) * 1000, 2)
        
        return metrics
    
    def collect_summary(self) -> Dict[str, Any]:
        """Coleta um resumo das métricas mais importantes."""
        try:
            cpu_metrics = self.system_metrics.get_cpu_metrics()
            memory_metrics = self.system_metrics.get_memory_metrics()
            disk_metrics = self.system_metrics.get_disk_metrics()
            db_metrics = self.database_metrics.get_connection_metrics()
            
            return {
                'timestamp': datetime.now().isoformat(),
                'system_status': 'healthy',  # Será calculado baseado nas métricas
                'cpu_percent': cpu_metrics.get('cpu_percent', 0),
                'memory_percent': memory_metrics.get('memory_percent', 0),
                'disk_percent': disk_metrics.get('disk_percent', 0),
                'db_connections': db_metrics.get('db_active_connections', 0),
            }
        except Exception as e:
            logger.error(f"Erro na coleta de resumo: {e}")
            return {
                'timestamp': datetime.now().isoformat(),
                'system_status': 'error',
                'error': str(e)
            }
    
    def get_health_status(self) -> Dict[str, Any]:
        """Determina o status de saúde do sistema."""
        try:
            summary = self.collect_summary()
            
            # Determinar status baseado nas métricas
            issues = []
            status = 'healthy'
            
            # Verificar CPU
            cpu_percent = summary.get('cpu_percent', 0)
            if cpu_percent > 90:
                issues.append(f"CPU alta: {cpu_percent}%")
                status = 'warning'
            elif cpu_percent > 95:
                status = 'critical'
            
            # Verificar memória
            memory_percent = summary.get('memory_percent', 0)
            if memory_percent > 85:
                issues.append(f"Memória alta: {memory_percent}%")
                status = 'warning'
            elif memory_percent > 95:
                status = 'critical'
            
            # Verificar disco
            disk_percent = summary.get('disk_percent', 0)
            if disk_percent > 90:
                issues.append(f"Disco cheio: {disk_percent}%")
                status = 'warning'
            elif disk_percent > 95:
                status = 'critical'
            
            return {
                'status': status,
                'issues': issues,
                'metrics': summary,
                'last_check': datetime.now().isoformat(),
            }
            
        except Exception as e:
            logger.error(f"Erro na verificação de saúde: {e}")
            return {
                'status': 'error',
                'issues': [f"Erro interno: {str(e)}"],
                'metrics': {},
                'last_check': datetime.now().isoformat(),
            }


# Instância global do coletor
metrics_collector = MetricsCollector()


def get_system_metrics() -> Dict[str, Any]:
    """Função auxiliar para obter métricas do sistema."""
    return metrics_collector.collect_all()


def get_system_health() -> Dict[str, Any]:
    """Função auxiliar para obter status de saúde do sistema."""
    return metrics_collector.get_health_status()

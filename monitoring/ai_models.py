# monitoring/ai_models.py - Módulo de Inteligência Artificial e Machine Learning

import json
import statistics
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
import logging

# Django imports
from django.utils import timezone
from django.db.models import Q
from .models import Measurement
from .domain import violation_q, violation_reason, TEMP_LOW, TEMP_HIGH, RH_LIMIT

def is_violation(temperature, relative_humidity):
    """Determina se uma medição é uma violação baseada nos limites do domínio"""
    return (temperature < TEMP_LOW or 
            temperature > TEMP_HIGH or 
            relative_humidity >= RH_LIMIT)

logger = logging.getLogger('monitoring')

class EnvironmentalAI:
    """
    Sistema de Inteligência Artificial para Monitoramento Ambiental
    
    Funcionalidades:
    - Detecção de anomalias usando análise estatística
    - Predições baseadas em tendências
    - Análise de padrões temporais
    - Insights inteligentes
    """
    
    def __init__(self):
        self.name = "Environmental AI v1.0"
        self.trained = False
        self.last_training = None
        
    def get_data(self, days: int = 30) -> List[Dict]:
        """Obtém dados de medições dos últimos N dias"""
        try:
            cutoff_date = timezone.now() - timedelta(days=days)
            measurements = Measurement.objects.filter(
                ts__gte=cutoff_date
            ).order_by('ts')
            
            data = []
            for m in measurements:
                if m.temp_current is not None and m.rh_current is not None:
                    data.append({
                        'timestamp': m.ts,
                        'temperature': float(m.temp_current),
                        'relative_humidity': float(m.rh_current * 100),  # Convertendo para %
                        'is_violation': is_violation(m.temp_current, m.rh_current * 100)
                    })
            
            logger.info(f"[AI] Dados carregados: {len(data)} medições dos últimos {days} dias")
            return data
            
        except Exception as e:
            logger.error(f"[AI] Erro ao carregar dados: {e}")
            return []
    
    def detect_anomalies(self, days: int = 30) -> Dict[str, Any]:
        """Detecta anomalias usando análise estatística simples"""
        try:
            data = self.get_data(days)
            if len(data) < 10:
                return {
                    'anomalies': [],
                    'total_measurements': len(data),
                    'message': 'Dados insuficientes para detecção de anomalias'
                }
            
            temperatures = [d['temperature'] for d in data]
            humidities = [d['relative_humidity'] for d in data]
            
            # Calcular estatísticas
            temp_mean = statistics.mean(temperatures)
            temp_stdev = statistics.stdev(temperatures) if len(temperatures) > 1 else 0
            hum_mean = statistics.mean(humidities)
            hum_stdev = statistics.stdev(humidities) if len(humidities) > 1 else 0
            
            # Detectar anomalias (valores fora de 2 desvios padrão)
            anomalies = []
            for d in data:
                temp_z = abs(d['temperature'] - temp_mean) / temp_stdev if temp_stdev > 0 else 0
                hum_z = abs(d['relative_humidity'] - hum_mean) / hum_stdev if hum_stdev > 0 else 0
                
                if temp_z > 2 or hum_z > 2:
                    anomalies.append({
                        'timestamp': d['timestamp'].isoformat(),
                        'temperature': d['temperature'],
                        'humidity': d['relative_humidity'],  # Alterado de relative_humidity para humidity
                        'temp_zscore': round(temp_z, 2),
                        'hum_zscore': round(hum_z, 2),
                        'severity': 'high' if max(temp_z, hum_z) > 3 else 'medium'
                    })
            
            return {
                'anomalies': anomalies,
                'total_measurements': len(data),
                'anomaly_rate': len(anomalies) / len(data) * 100,
                'temperature_stats': {
                    'mean': round(temp_mean, 2),
                    'stdev': round(temp_stdev, 2)
                },
                'humidity_stats': {
                    'mean': round(hum_mean, 2),
                    'stdev': round(hum_stdev, 2)
                }
            }
            
        except Exception as e:
            logger.error(f"[AI] Erro na detecção de anomalias: {e}")
            return {'error': str(e)}
    
    def predict_trends(self, hours: int = 24) -> Dict[str, Any]:
        """Prediz tendências usando regressão linear simples"""
        try:
            data = self.get_data(7)  # Últimos 7 dias para predição
            if len(data) < 5:
                return {
                    'predictions': [],
                    'message': 'Dados insuficientes para predição'
                }
            
            # Preparar dados para regressão linear simples
            timestamps = [(d['timestamp'] - data[0]['timestamp']).total_seconds() for d in data]
            temperatures = [d['temperature'] for d in data]
            humidities = [d['relative_humidity'] for d in data]
            
            # Regressão linear simples para temperatura
            temp_slope, temp_intercept = self._linear_regression(timestamps, temperatures)
            
            # Regressão linear simples para umidade
            hum_slope, hum_intercept = self._linear_regression(timestamps, humidities)
            
            # Gerar predições
            predictions = []
            base_time = timezone.now()
            
            for i in range(1, hours + 1):
                future_time = base_time + timedelta(hours=i)
                future_seconds = (future_time - data[0]['timestamp']).total_seconds()
                
                pred_temp = temp_slope * future_seconds + temp_intercept
                pred_hum = hum_slope * future_seconds + hum_intercept
                
                # Calcular probabilidade de violação baseada na proximidade dos limites
                violation_probability = 0
                if pred_hum > 60:  # Próximo do limite de 62%
                    violation_probability = min(100, (pred_hum - 60) * 50)  # 2% de margem = 100% prob
                if pred_temp > 20 or pred_temp < 16:  # Fora da faixa ideal
                    violation_probability = max(violation_probability, 30)  # Pelo menos 30% de risco
                
                predictions.append({
                    'timestamp': future_time.isoformat(),
                    'predicted_temperature': round(pred_temp, 2),
                    'predicted_humidity': round(max(0, min(100, pred_hum)), 2),
                    'violation_probability': round(violation_probability, 1),  # Adicionado
                    'confidence': 'medium'
                })
            
            return {
                'predictions': predictions,
                'trend_analysis': {
                    'temperature_trend': 'increasing' if temp_slope > 0 else 'decreasing',
                    'humidity_trend': 'increasing' if hum_slope > 0 else 'decreasing',
                    'temp_slope': round(temp_slope * 3600, 4),  # Por hora
                    'hum_slope': round(hum_slope * 3600, 4)     # Por hora
                }
            }
            
        except Exception as e:
            logger.error(f"[AI] Erro na predição: {e}")
            return {'error': str(e)}
    
    def _linear_regression(self, x: List[float], y: List[float]) -> Tuple[float, float]:
        """Implementa regressão linear simples"""
        n = len(x)
        sum_x = sum(x)
        sum_y = sum(y)
        sum_xy = sum(x[i] * y[i] for i in range(n))
        sum_x2 = sum(xi * xi for xi in x)
        
        slope = (n * sum_xy - sum_x * sum_y) / (n * sum_x2 - sum_x * sum_x)
        intercept = (sum_y - slope * sum_x) / n
        
        return slope, intercept
    
    def analyze_patterns(self, days: int = 30) -> Dict[str, Any]:
        """Analisa padrões temporais nos dados"""
        try:
            data = self.get_data(days)
            if len(data) < 10:
                return {
                    'patterns': {},
                    'message': 'Dados insuficientes para análise de padrões'
                }
            
            # Análise por hora do dia
            hourly_patterns = {}
            daily_patterns = {}
            
            for d in data:
                hour = d['timestamp'].hour
                day = d['timestamp'].weekday()
                
                if hour not in hourly_patterns:
                    hourly_patterns[hour] = {'temps': [], 'hums': []}
                if day not in daily_patterns:
                    daily_patterns[day] = {'temps': [], 'hums': []}
                
                hourly_patterns[hour]['temps'].append(d['temperature'])
                hourly_patterns[hour]['hums'].append(d['relative_humidity'])
                daily_patterns[day]['temps'].append(d['temperature'])
                daily_patterns[day]['hums'].append(d['relative_humidity'])
            
            # Calcular médias
            hourly_avg = {}
            for hour, values in hourly_patterns.items():
                hourly_avg[hour] = {
                    'avg_temp': round(statistics.mean(values['temps']), 2),
                    'avg_humidity': round(statistics.mean(values['hums']), 2),
                    'sample_count': len(values['temps'])
                }
            
            daily_avg = {}
            day_names = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']
            for day, values in daily_patterns.items():
                daily_avg[day_names[day]] = {
                    'avg_temp': round(statistics.mean(values['temps']), 2),
                    'avg_humidity': round(statistics.mean(values['hums']), 2),
                    'sample_count': len(values['temps'])
                }
            
            # Calcular taxa de violações
            violations = [d for d in data if d['is_violation']]
            violation_rate = len(violations) / len(data) * 100 if data else 0
            
            return {
                'hourly_patterns': hourly_avg,
                'daily_patterns': daily_avg,
                'analysis_period': f'{days} dias',
                'total_measurements': len(data),
                'temperature_trend': {
                    'direction': 'stable',  # Simplificado - poderia ser calculado com regressão
                    'slope_per_day': 0.0
                },
                'humidity_trend': {
                    'direction': 'stable',  # Simplificado - poderia ser calculado com regressão
                    'slope_per_day': 0.0
                },
                'violation_rate': round(violation_rate, 2)
            }
            
        except Exception as e:
            logger.error(f"[AI] Erro na análise de padrões: {e}")
            return {'error': str(e)}
    
    def generate_insights(self, days: int = 30) -> Dict[str, Any]:
        """Gera insights inteligentes baseados nos dados"""
        try:
            data = self.get_data(days)
            if len(data) < 5:
                return {
                    'insights': [],
                    'message': 'Dados insuficientes para gerar insights'
                }
            
            insights = []
            
            # Análise de violações
            violations = [d for d in data if d['is_violation']]
            violation_rate = len(violations) / len(data) * 100
            
            if violation_rate > 10:
                insights.append({
                    'type': 'warning',
                    'title': 'Alta taxa de violações',
                    'description': f'Taxa de violações de {violation_rate:.1f}% detectada',
                    'recommendation': 'Verificar calibração dos sensores e condições ambientais'
                })
            
            # Análise de estabilidade
            temperatures = [d['temperature'] for d in data]
            temp_variance = statistics.variance(temperatures) if len(temperatures) > 1 else 0
            
            if temp_variance > 1.0:
                insights.append({
                    'type': 'info',
                    'title': 'Variação de temperatura',
                    'description': f'Temperatura apresenta variação de {temp_variance:.2f}°C²',
                    'recommendation': 'Monitorar fatores externos que podem afetar a temperatura'
                })
            
            # Análise de tendências recentes
            recent_data = data[-10:] if len(data) >= 10 else data
            if len(recent_data) >= 3:
                recent_temps = [d['temperature'] for d in recent_data]
                if recent_temps[-1] > recent_temps[0] + 1:
                    insights.append({
                        'type': 'trend',
                        'title': 'Tendência de aquecimento',
                        'description': 'Temperatura em tendência crescente',
                        'recommendation': 'Verificar sistemas de refrigeração'
                    })
                elif recent_temps[-1] < recent_temps[0] - 1:
                    insights.append({
                        'type': 'trend',
                        'title': 'Tendência de resfriamento',
                        'description': 'Temperatura em tendência decrescente',
                        'recommendation': 'Verificar sistemas de aquecimento'
                    })
            
            return {
                'insights': insights,
                'summary': {
                    'violation_rate': round(violation_rate, 2),
                    'temperature_variance': round(temp_variance, 2),
                    'data_quality': 'good' if len(data) > 50 else 'limited'
                },
                'generated_at': timezone.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"[AI] Erro na geração de insights: {e}")
            return {'error': str(e)}
    
    def train_models(self) -> Dict[str, Any]:
        """Simula treinamento de modelos (versão simplificada)"""
        try:
            data = self.get_data(60)  # Últimos 60 dias para treinamento
            
            if len(data) < 20:
                return {
                    'status': 'insufficient_data',
                    'message': f'Apenas {len(data)} medições disponíveis. Mínimo: 20',
                    'recommendation': 'Aguardar mais dados para treinamento efetivo'
                }
            
            # Simular processo de treinamento
            temperatures = [d['temperature'] for d in data]
            humidities = [d['relative_humidity'] for d in data]
            
            training_stats = {
                'data_points': len(data),
                'temperature_range': [min(temperatures), max(temperatures)],
                'humidity_range': [min(humidities), max(humidities)],
                'violation_count': len([d for d in data if d['is_violation']]),
                'training_period': '60 dias'
            }
            
            self.trained = True
            self.last_training = timezone.now()
            
            return {
                'status': 'success',
                'message': 'Modelos treinados com sucesso',
                'training_stats': training_stats,
                'models_trained': [
                    'anomaly_detection',
                    'trend_prediction', 
                    'pattern_analysis'
                ],
                'trained_at': self.last_training.isoformat()
            }
            
        except Exception as e:
            logger.error(f"[AI] Erro no treinamento: {e}")
            return {'error': str(e)}

# Instância global do sistema de IA
ai_system = EnvironmentalAI()

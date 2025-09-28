// modules/ai.js - Módulo de Inteligência Artificial
import { CONFIG } from './config.js';
import { Utils } from './utils.js';

export class AIManager {
    constructor() {
        this.insights = null;
        this.anomalies = [];
        this.predictions = [];
        this.patterns = null;
        this.isAIEnabled = true;
    }

    // === CARREGAR DADOS DE IA ===
    async loadAIInsights() {
        try {
            Utils.logInfo('AI', 'Carregando insights de IA...');

            const url = `/api/ai/insights/?_t=${Date.now()}`;
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            this.insights = await response.json();
            Utils.logInfo('AI', 'Insights de IA carregados:', this.insights);

            return this.insights;

        } catch (error) {
            Utils.logError('AI', 'Erro ao carregar insights de IA', error);
            this.isAIEnabled = false;
            return null;
        }
    }

    async loadAnomalies(limit = 10) {
        try {
            Utils.logInfo('AI', `Carregando anomalias (últimas ${limit} medições)...`);

            const url = `/api/ai/anomalies/?limit=${limit}&_t=${Date.now()}`;
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            this.anomalies = data.anomalies || [];

            Utils.logInfo('AI', `${this.anomalies.length} anomalias detectadas`);
            return data;

        } catch (error) {
            Utils.logError('AI', 'Erro ao detectar anomalias', error);
            return { anomalies: [], total_analyzed: 0, anomalies_found: 0 };
        }
    }

    async loadPredictions(hours = 12) {
        try {
            Utils.logInfo('AI', `Carregando previsões para próximas ${hours} horas...`);

            const url = `/api/ai/predictions/?hours=${hours}&_t=${Date.now()}`;
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            this.predictions = data.predictions || [];

            Utils.logInfo('AI', `${this.predictions.length} previsões carregadas`);
            return data;

        } catch (error) {
            Utils.logError('AI', 'Erro ao carregar previsões', error);
            return { predictions: [], hours_predicted: 0, high_risk_periods: 0 };
        }
    }

    async loadPatterns(days = 30) {
        try {
            Utils.logInfo('AI', `Analisando padrões dos últimos ${days} dias...`);

            const url = `/api/ai/patterns/?days=${days}&_t=${Date.now()}`;
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            this.patterns = await response.json();
            Utils.logInfo('AI', 'Padrões analisados:', this.patterns);

            return this.patterns;

        } catch (error) {
            Utils.logError('AI', 'Erro ao analisar padrões', error);
            return null;
        }
    }

    // === RENDERIZAÇÃO DA INTERFACE ===
    initializeAISection() {
        try {
            // A seção já existe no HTML, apenas inicializar
            const aiContainer = Utils.getElementById('ai-insights-container');
            if (!aiContainer) {
                Utils.logError('AI', 'Container de IA não encontrado no HTML');
                return false;
            }

            // Atualizar status badge
            this.updateAIStatusBadge('active', 'Monitorando');

            // Não há mais botão de refresh manual - tudo é automático
            Utils.logInfo('AI', 'Seção de IA inicializada com monitoramento automático');
            return true;

        } catch (error) {
            Utils.logError('AI', 'Erro ao inicializar seção de IA', error);
            return false;
        }
    }

    updateAIStatusBadge(status, text) {
        const badge = Utils.getElementById('ai-status-badge');
        if (!badge) return;

        const statusConfig = {
            loading: { icon: 'fa-spinner fa-spin', class: 'bg-warning', text: text || 'Verificando...' },
            active: { icon: 'fa-check', class: 'bg-success', text: text || 'Monitorando' },
            error: { icon: 'fa-times', class: 'bg-danger', text: text || 'Aguardando dados' },
            training: { icon: 'fa-graduation-cap fa-pulse', class: 'bg-info', text: text || 'Aprendendo...' }
        };

        const config = statusConfig[status] || statusConfig.loading;

        badge.className = `badge ${config.class} ms-2`;
        badge.innerHTML = `<i class="fas ${config.icon} me-1"></i>${config.text}`;
    }

    showAIContent() {
        const skeleton = Utils.getElementById('ai-skeleton');
        const content = Utils.getElementById('ai-content');

        if (skeleton) skeleton.style.display = 'none';
        if (content) content.style.display = 'block';

        this.updateAIStatusBadge('active', 'Operacional');
    }

    hideAIContent() {
        const skeleton = Utils.getElementById('ai-skeleton');
        const content = Utils.getElementById('ai-content');

        if (skeleton) skeleton.style.display = 'block';
        if (content) content.style.display = 'none';

        this.updateAIStatusBadge('loading', 'Carregando...');
    }

    updateAnomaliesDisplay(anomaliesData) {
        const container = Utils.getElementById('ai-anomalies-content');
        if (!container) return;

        const anomalies = anomaliesData.anomalies || [];

        if (anomalies.length === 0) {
            container.innerHTML = `
                <div class="text-center py-3">
                    <i class="fas fa-check-circle text-success fa-2x mb-2"></i>
                    <p class="mb-1 fw-bold text-success">Tudo Perfeito!</p>
                    <small class="text-muted">O ambiente está nas condições ideais</small>
                </div>
            `;
            return;
        }

        const anomaliesHtml = anomalies.slice(0, 3).map(anomaly => {
            const timestamp = Utils.formatDateTime(anomaly.timestamp);
            const temp = Utils.formatNumber(anomaly.temperature);
            const humidity = Utils.formatNumber(anomaly.humidity);
            const severityColor = anomaly.severity === 'high' ? 'danger' : 'warning';
            const severityText = anomaly.severity === 'high' ? 'Precisa Atenção' : 'Fique de Olho';

            return `
                <div class="d-flex justify-content-between align-items-start mb-3 p-2 border-start border-${severityColor} border-4 bg-light">
                    <div class="flex-grow-1">
                        <small class="fw-bold text-${severityColor}">${severityText}</small><br>
                        <small class="text-muted">${timestamp}</small><br>
                        <span class="badge bg-${severityColor}-subtle text-${severityColor} mt-1">
                            ${temp}°C, ${humidity}% de umidade
                        </span>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = `
            ${anomaliesHtml}
            ${anomalies.length > 3 ? `<div class="text-center mt-2"><small class="text-muted">+${anomalies.length - 3} outras situações para acompanhar</small></div>` : ''}
        `;
    }

    updatePredictionsDisplay(predictionsData) {
        const container = Utils.getElementById('ai-predictions-content');
        if (!container) return;

        const predictions = predictionsData.predictions || [];
        const highRisk = predictionsData.high_risk_periods || 0;

        if (predictions.length === 0) {
            container.innerHTML = `
                <div class="text-center py-3">
                    <i class="fas fa-chart-line text-muted fa-2x mb-2"></i>
                    <p class="mb-1 text-muted">Coletando Dados</p>
                    <small class="text-muted">Aguarde mais medições para previsões</small>
                </div>
            `;
            return;
        }

        // Mostrar próximas 3 previsões
        const next3 = predictions.slice(0, 3);
        const predictionsHtml = next3.map(pred => {
            const time = new Date(pred.timestamp).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit'
            });
            const temp = Utils.formatNumber(pred.predicted_temperature);
            const humidity = Utils.formatNumber(pred.predicted_humidity);
            const riskPercent = Utils.formatNumber(pred.violation_probability);

            let riskColor = 'success';
            let riskText = 'Tudo bem';
            if (pred.violation_probability > 50) {
                riskColor = 'danger';
                riskText = 'Cuidado';
            } else if (pred.violation_probability > 30) {
                riskColor = 'warning';
                riskText = 'Atenção';
            }

            return `
                <div class="d-flex justify-content-between align-items-center mb-3 p-2 rounded bg-light">
                    <div>
                        <small class="fw-bold">${time}</small><br>
                        <small class="text-muted">${temp}°C, ${humidity}% umidade</small>
                    </div>
                    <span class="badge bg-${riskColor}-subtle text-${riskColor} px-2">
                        ${riskText}
                    </span>
                </div>
            `;
        }).join('');

        container.innerHTML = `
            ${predictionsHtml}
            ${highRisk > 0 ? `
                <div class="alert alert-warning py-2 px-3 mt-2 mb-0">
                    <i class="fas fa-exclamation-triangle me-1"></i>
                    <small>${highRisk} momento(s) que precisam de atenção</small>
                </div>
            ` : ''}
        `;
    }

    updatePatternsDisplay(patterns) {
        const container = Utils.getElementById('ai-patterns-content');
        if (!container || !patterns) return;

        const tempTrend = patterns.temperature_trend?.direction || 'stable';
        const humidityTrend = patterns.humidity_trend?.direction || 'stable';
        const violationRate = patterns.violation_rate || 0;

        const tempIcon = tempTrend === 'increasing' ? 'fa-arrow-up text-danger' :
            tempTrend === 'decreasing' ? 'fa-arrow-down text-info' :
                'fa-minus text-muted';

        const humidityIcon = humidityTrend === 'increasing' ? 'fa-arrow-up text-warning' :
            humidityTrend === 'decreasing' ? 'fa-arrow-down text-info' :
                'fa-minus text-muted';

        const violationColor = violationRate > 10 ? 'danger' : violationRate > 5 ? 'warning' : 'success';
        const violationText = violationRate > 10 ? 'Muita atenção' : violationRate > 5 ? 'Pouca atenção' : 'Poucos cuidados';

        container.innerHTML = `
            <div class="row g-3">
                <div class="col-md-4">
                    <div class="text-center p-2 bg-light rounded">
                        <i class="fas fa-thermometer-half fa-lg text-primary mb-2"></i>
                        <div class="small text-muted mb-1">Temperatura</div>
                        <div class="fw-bold">
                            <i class="fas ${tempIcon} me-1"></i>
                            ${tempTrend === 'stable' ? 'Estável' :
                tempTrend === 'increasing' ? 'Esquentando' :
                    tempTrend === 'decreasing' ? 'Esfriando' : 'Analisando'}
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="text-center p-2 bg-light rounded">
                        <i class="fas fa-tint fa-lg text-info mb-2"></i>
                        <div class="small text-muted mb-1">Umidade</div>
                        <div class="fw-bold">
                            <i class="fas ${humidityIcon} me-1"></i>
                            ${humidityTrend === 'stable' ? 'Estável' :
                humidityTrend === 'increasing' ? 'Aumentando' :
                    humidityTrend === 'decreasing' ? 'Diminuindo' : 'Analisando'}
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="text-center p-2 bg-light rounded">
                        <i class="fas fa-heartbeat fa-lg text-${violationColor} mb-2"></i>
                        <div class="small text-muted mb-1">Saúde Geral</div>
                        <div class="fw-bold text-${violationColor}">
                            ${violationText}<br>
                            <small class="text-muted">${Utils.formatNumber(violationRate)}% de atenção</small>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async loadAllAIData() {
        try {
            Utils.logInfo('AI', 'Atualizando monitoramento inteligente...');

            // Carregar dados em paralelo
            const [anomaliesData, predictionsData, patterns] = await Promise.all([
                this.loadAnomalies(10),
                this.loadPredictions(12),
                this.loadPatterns(30)
            ]);

            // Atualizar displays
            this.updateAnomaliesDisplay(anomaliesData);
            this.updatePredictionsDisplay(predictionsData);
            this.updatePatternsDisplay(patterns);

            Utils.logInfo('AI', 'Monitoramento atualizado com sucesso');

        } catch (error) {
            Utils.logError('AI', 'Erro ao atualizar monitoramento', error);
        }
    }

    async initializeAI() {
        try {
            Utils.logInfo('AI', 'Inicializando sistema de IA...');

            // Inicializar interface (agora usa HTML existente)
            const aiReady = this.initializeAISection();
            if (!aiReady) {
                Utils.logError('AI', 'Falha na inicialização da interface de IA');
                this.isAIEnabled = false;
                return;
            }

            // Mostrar skeleton enquanto carrega
            this.hideAIContent();

            // Carregar insights primeiro para verificar se a IA está funcionando
            await this.loadAIInsights();

            // Se a IA estiver ativa, carregar todos os dados
            if (this.isAIEnabled) {
                await this.loadAllAIData();
                this.showAIContent();
            } else {
                this.updateAIStatusBadge('error', 'Indisponível');
            }

            Utils.logInfo('AI', 'Sistema de IA inicializado com sucesso');

        } catch (error) {
            Utils.logError('AI', 'Erro ao inicializar IA', error);
            this.isAIEnabled = false;
            this.updateAIStatusBadge('error', 'Erro na inicialização');
        }
    }

    getState() {
        return {
            isEnabled: this.isAIEnabled,
            hasInsights: !!this.insights,
            anomaliesCount: this.anomalies.length,
            predictionsCount: this.predictions.length,
            hasPatterns: !!this.patterns
        };
    }
}

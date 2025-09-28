/**
 * Dashboard AI Module
 * AI data loading and UI updates for the environmental monitoring dashboard
 */

class DashboardAI {
    constructor() {
        this.aiData = null;
        this.init();
    }

    init() {
        console.log('Dashboard AI: Initializing...');
    }

    updateAIUI(aiData) {
        console.log('Dashboard AI: Updating AI UI...', aiData);

        this.aiData = aiData;

        if (aiData) {
            // Transform API data to expected format
            const transformedData = {
                anomalies: aiData.insights || [],
                predictions: [], // API doesn't provide predictions yet
                patterns: [], // API doesn't provide patterns yet
                summary: aiData.summary,
                generated_at: aiData.generated_at
            };

            this.updateAnomalies(transformedData.anomalies);
            this.updatePredictions(transformedData.predictions);
            this.updatePatterns(transformedData.patterns);
            this.updateAISummary(transformedData.summary);
        } else {
            this.showNoAIData();
        }
    }

    updateAnomalies(anomalies) {
        const container = document.getElementById('ai-anomalies-content');

        if (!container) return;

        if (anomalies && anomalies.length > 0) {
            const anomaliesHtml = `
                <div class="ai-content">
                    <div class="mb-3">
                        <h5 class="text-warning mb-3">
                            <i class="fas fa-exclamation-triangle me-2"></i>
                            ${anomalies.length} anomalia(s) detectada(s)
                        </h5>
                        <div class="anomalies-list">
                            ${anomalies.slice(0, 3).map(anomaly => this.createAnomalyItem(anomaly)).join('')}
                        </div>
                        ${anomalies.length > 3 ? `
                            <div class="text-center mt-3">
                                <small style="color: rgba(255,255,255,0.6);">
                                    +${anomalies.length - 3} anomalia(s) adicional(is)
                                </small>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
            container.innerHTML = anomaliesHtml;
        } else {
            container.innerHTML = `
                <div class="text-center">
                    <i class="fas fa-check-circle fa-2x mb-3" style="color: rgba(67, 233, 123, 0.5);"></i>
                    <p style="color: rgba(255,255,255,0.7); margin: 0;">Nenhuma anomalia detectada</p>
                    <small style="color: rgba(255,255,255,0.6);">Condições ambientais estáveis</small>
                </div>
            `;
        }
    }

    createAnomalyItem(anomaly) {
        const timestamp = this.formatAnomalyTime(anomaly.timestamp);
        const severity = this.getAnomalySeverity(anomaly.severity);
        const description = this.formatAnomalyDescription(anomaly);

        return `
            <div class="anomaly-item mb-2 p-2 rounded" style="background: rgba(255,255,255,0.05); border-left: 3px solid ${severity.color};">
                <div class="d-flex justify-content-between align-items-start">
                    <div class="flex-grow-1">
                        <small style="color: rgba(255,255,255,0.7);">${timestamp}</small>
                        <div style="color: rgba(255,255,255,0.9); font-size: 0.9em;">${description}</div>
                    </div>
                    <span class="badge ${severity.badgeClass}">${severity.label}</span>
                </div>
            </div>
        `;
    }

    updatePredictions(predictions) {
        const container = document.getElementById('ai-predictions-content');

        if (!container) return;

        if (predictions && predictions.length > 0) {
            const predictionsHtml = `
                <div class="ai-content">
                    <div class="mb-3">
                        <h5 class="text-info mb-3">
                            <i class="fas fa-chart-line me-2"></i>
                            Previsões para as próximas horas
                        </h5>
                        <div class="predictions-grid">
                            ${predictions.slice(0, 2).map(prediction => this.createPredictionItem(prediction)).join('')}
                        </div>
                    </div>
                </div>
            `;
            container.innerHTML = predictionsHtml;
        } else {
            container.innerHTML = `
                <div class="text-center">
                    <i class="fas fa-chart-line fa-2x mb-3" style="color: rgba(79, 172, 254, 0.5);"></i>
                    <p style="color: rgba(255,255,255,0.7); margin: 0;">Previsões indisponíveis</p>
                    <small style="color: rgba(255,255,255,0.6);">Dados insuficientes para análise</small>
                </div>
            `;
        }
    }

    createPredictionItem(prediction) {
        const timeLabel = this.formatPredictionTime(prediction.hours_ahead);
        const tempChange = prediction.temperature_change;
        const humidityChange = prediction.humidity_change;

        const tempIcon = tempChange > 0 ? 'fa-arrow-up text-danger' : tempChange < 0 ? 'fa-arrow-down text-info' : 'fa-minus text-secondary';
        const humidityIcon = humidityChange > 0 ? 'fa-arrow-up text-info' : humidityChange < 0 ? 'fa-arrow-down text-primary' : 'fa-minus text-secondary';

        return `
            <div class="prediction-item p-3 rounded mb-2" style="background: rgba(255,255,255,0.05);">
                <div class="text-center mb-2">
                    <strong style="color: rgba(255,255,255,0.9);">${timeLabel}</strong>
                </div>
                <div class="d-flex justify-content-around">
                    <div class="text-center">
                        <i class="fas fa-thermometer-half ${tempIcon} mb-1"></i>
                        <div style="color: rgba(255,255,255,0.8); font-size: 0.9em;">
                            ${tempChange > 0 ? '+' : ''}${tempChange.toFixed(1)}°C
                        </div>
                    </div>
                    <div class="text-center">
                        <i class="fas fa-tint ${humidityIcon} mb-1"></i>
                        <div style="color: rgba(255,255,255,0.8); font-size: 0.9em;">
                            ${humidityChange > 0 ? '+' : ''}${humidityChange.toFixed(1)}%
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    updatePatterns(patterns) {
        const container = document.getElementById('ai-patterns-content');

        if (!container) return;

        if (patterns && patterns.length > 0) {
            const patternsHtml = `
                <div class="ai-content">
                    <div class="mb-3">
                        <h5 class="text-success mb-3">
                            <i class="fas fa-search me-2"></i>
                            Padrões Identificados
                        </h5>
                        <div class="patterns-list">
                            ${patterns.slice(0, 2).map(pattern => this.createPatternItem(pattern)).join('')}
                        </div>
                    </div>
                </div>
            `;
            container.innerHTML = patternsHtml;
        } else {
            container.innerHTML = `
                <div class="text-center">
                    <i class="fas fa-search fa-2x mb-3" style="color: rgba(67, 233, 123, 0.5);"></i>
                    <p style="color: rgba(255,255,255,0.7); margin: 0;">Análise em andamento</p>
                    <small style="color: rgba(255,255,255,0.6);">Coletando dados para identificação de padrões</small>
                </div>
            `;
        }
    }

    createPatternItem(pattern) {
        const confidence = Math.round(pattern.confidence * 100);
        const description = this.formatPatternDescription(pattern);

        return `
            <div class="pattern-item mb-2 p-2 rounded" style="background: rgba(255,255,255,0.05);">
                <div class="d-flex justify-content-between align-items-center">
                    <div class="flex-grow-1">
                        <div style="color: rgba(255,255,255,0.9); font-size: 0.9em;">${description}</div>
                    </div>
                    <div class="text-end">
                        <div class="progress mb-1" style="width: 60px; height: 4px;">
                            <div class="progress-bar bg-success" style="width: ${confidence}%"></div>
                        </div>
                        <small style="color: rgba(255,255,255,0.6);">${confidence}%</small>
                    </div>
                </div>
            </div>
        `;
    }

    updateAISummary(summary) {
        const container = document.getElementById('ai-summary-content');

        if (!container || !summary) return;

        const violationRate = summary.violation_rate ? summary.violation_rate.toFixed(2) : 'N/A';
        const temperatureVariance = summary.temperature_variance ? summary.temperature_variance.toFixed(3) : 'N/A';
        const dataQuality = summary.data_quality || 'N/A';

        const summaryHtml = `
            <div class="ai-content">
                <div class="row g-3">
                    <div class="col-md-4">
                        <div class="metric-card p-3 rounded" style="background: rgba(255,255,255,0.05);">
                            <div class="d-flex align-items-center">
                                <i class="fas fa-exclamation-triangle fa-2x me-3" style="color: #ffc107;"></i>
                                <div>
                                    <div style="color: rgba(255,255,255,0.9); font-size: 1.2em; font-weight: 600;">${violationRate}%</div>
                                    <div style="color: rgba(255,255,255,0.7); font-size: 0.9em;">Taxa de Violações</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="metric-card p-3 rounded" style="background: rgba(255,255,255,0.05);">
                            <div class="d-flex align-items-center">
                                <i class="fas fa-chart-bar fa-2x me-3" style="color: #4f9efa;"></i>
                                <div>
                                    <div style="color: rgba(255,255,255,0.9); font-size: 1.2em; font-weight: 600;">${temperatureVariance}</div>
                                    <div style="color: rgba(255,255,255,0.7); font-size: 0.9em;">Variância Temp.</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="metric-card p-3 rounded" style="background: rgba(255,255,255,0.05);">
                            <div class="d-flex align-items-center">
                                <i class="fas fa-check-circle fa-2x me-3" style="color: #43e97b;"></i>
                                <div>
                                    <div style="color: rgba(255,255,255,0.9); font-size: 1.2em; font-weight: 600;">${dataQuality}</div>
                                    <div style="color: rgba(255,255,255,0.7); font-size: 0.9em;">Qualidade dos Dados</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = summaryHtml;
    }

    formatAnomalyTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

        if (diffHours < 1) {
            return 'Agora mesmo';
        } else if (diffHours < 24) {
            return `${diffHours}h atrás`;
        } else {
            return date.toLocaleDateString('pt-BR');
        }
    }

    getAnomalySeverity(severity) {
        const severities = {
            'low': { label: 'Baixo', color: '#28a745', badgeClass: 'bg-success' },
            'medium': { label: 'Médio', color: '#ffc107', badgeClass: 'bg-warning' },
            'high': { label: 'Alto', color: '#fd7e14', badgeClass: 'bg-warning' },
            'critical': { label: 'Crítico', color: '#dc3545', badgeClass: 'bg-danger' }
        };

        return severities[severity] || severities['medium'];
    }

    formatAnomalyDescription(anomaly) {
        const descriptions = {
            'temperature_spike': 'Pico de temperatura detectado',
            'humidity_drop': 'Queda brusca na umidade',
            'unusual_pattern': 'Padrão incomum identificado',
            'sensor_malfunction': 'Possível falha no sensor',
            'environmental_change': 'Mudança ambiental significativa'
        };

        return descriptions[anomaly.type] || anomaly.description || 'Anomalia detectada';
    }

    formatPredictionTime(hours) {
        if (hours === 1) return '1 hora';
        if (hours < 24) return `${hours} horas`;
        return `${Math.floor(hours / 24)} dias`;
    }

    formatPatternDescription(pattern) {
        const descriptions = {
            'daily_cycle': 'Ciclo diário identificado',
            'seasonal_trend': 'Tendência sazonal detectada',
            'correlation_found': 'Correlação entre variáveis',
            'stability_period': 'Período de estabilidade',
            'variability_increase': 'Aumento na variabilidade'
        };

        return descriptions[pattern.type] || pattern.description || 'Padrão identificado';
    }

    getAIInsights() {
        if (!this.aiData) return null;

        return {
            anomaliesCount: this.aiData.anomalies ? this.aiData.anomalies.length : 0,
            predictionsAvailable: this.aiData.predictions ? this.aiData.predictions.length > 0 : false,
            patternsFound: this.aiData.patterns ? this.aiData.patterns.length : 0,
            lastAnalysis: this.aiData.timestamp || null
        };
    }

    refreshAIData() {
        console.log('Dashboard AI: Refreshing AI data...');
        // This would trigger a new AI analysis
        // For now, just reload the existing data
        if (this.aiData) {
            this.updateAIUI(this.aiData);
        }
    }

    exportAIReport() {
        if (!this.aiData) return null;

        const report = {
            timestamp: new Date().toISOString(),
            anomalies: this.aiData.anomalies || [],
            predictions: this.aiData.predictions || [],
            patterns: this.aiData.patterns || [],
            insights: this.getAIInsights()
        };

        return JSON.stringify(report, null, 2);
    }
}

// Make AI available as a module property
window.dashboard.ai = new DashboardAI();
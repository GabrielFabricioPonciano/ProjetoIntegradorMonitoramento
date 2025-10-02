/**
 * Dashboard Fullscreen Charts Module
 * Gerencia a funcionalidade de visualização de gráficos em tela cheia
 */

class DashboardFullscreen {
    constructor() {
        this.fullscreenChart = null;
        this.currentChartType = null;
        this.modal = null;
        this.init();
    }

    init() {
        // Aguardar DOM carregar
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initializeElements());
        } else {
            this.initializeElements();
        }
    }

    initializeElements() {
        this.modal = document.getElementById('chart-fullscreen-modal');

        // Adicionar listener para fechar com ESC
        this.keydownHandler = (e) => {
            if (e.key === 'Escape' && this.modal && this.modal.classList.contains('active')) {
                this.closeFullscreen();
            }
        };
        document.addEventListener('keydown', this.keydownHandler);

        // Fechar clicando fora do conteúdo (guardado)
        if (this.modal) {
            this.clickHandler = (e) => {
                if (e.target === this.modal) {
                    this.closeFullscreen();
                }
            };
            this.modal.addEventListener('click', this.clickHandler);
        }
    }

    openFullscreen(chartType) {
        console.log('🎯 openFullscreen chamado com:', chartType);

        this.currentChartType = chartType;

        // Configurar modal
        this.setupModal(chartType);

        // Mostrar modal
        if (this.modal) {
            this.modal.classList.add('active');
            document.body.classList.add('modal-active');
            document.body.style.overflow = 'hidden';
        } else {
            console.error('❌ Modal não encontrado!');
            return;
        }

        // Aguardar modal aparecer e criar conteúdo
        setTimeout(() => {
            if (chartType === 'violations') {
                this.createFullscreenViolations();
            } else {
                if (!window.dashboardCharts || !window.dashboardCharts.charts[chartType]) {
                    console.error('❌ Chart not found:', chartType);
                    return;
                }
                const originalChart = window.dashboardCharts.charts[chartType];
                this.createFullscreenChart(originalChart);
            }
        }, 300);
    }

    setupModal(chartType) {
        const titleElement = document.getElementById('fullscreen-chart-title');
        const iconElement = document.getElementById('fullscreen-chart-icon');

        if (chartType === 'temperature') {
            titleElement.textContent = 'Temperatura (°C) - Análise Detalhada';
            iconElement.innerHTML = '<i class="fas fa-thermometer-half"></i>';
            iconElement.className = 'chart-icon temp';
        } else if (chartType === 'humidity') {
            titleElement.textContent = 'Umidade Relativa (%) - Análise Detalhada';
            iconElement.innerHTML = '<i class="fas fa-tint"></i>';
            iconElement.className = 'chart-icon humidity';
        } else if (chartType === 'violations') {
            titleElement.textContent = 'Últimas Violações - Análise Detalhada';
            iconElement.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
            iconElement.className = 'chart-icon violations';
        }
    }

    createFullscreenChart(originalChart) {
        // Use the container to (re)create a canvas safely
        const container = document.getElementById('fullscreen-chart-container') || document.getElementById('fullscreen-chart-canvas');
        if (!container) {
            console.error('Canvas container not found for fullscreen chart');
            return;
        }

        // Remove previous canvas if exists
        let canvas = container.querySelector('canvas');
        if (this.fullscreenChart) {
            try {
                this.fullscreenChart.destroy();
            } catch (e) {
                console.warn('Error destroying previous fullscreen chart:', e);
            }
            this.fullscreenChart = null;
        }

        if (canvas) {
            canvas.remove();
        }

        // Create a fresh canvas
        canvas = document.createElement('canvas');
        canvas.id = 'fullscreen-chart-canvas';
        // Append first so clientWidth/clientHeight are available
        container.appendChild(canvas);

        // Compute pixel size from container to avoid Chart.js creating an oversized canvas
        const rect = container.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const pixelWidth = Math.max(1, Math.floor(rect.width * dpr));
        const pixelHeight = Math.max(1, Math.floor(rect.height * dpr));

        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';

        const ctx = canvas.getContext('2d');

        // Clonar dados e configuração do gráfico original
        const config = {
            type: originalChart.config.type,
            data: {
                labels: Array.isArray(originalChart.data.labels) ? [...originalChart.data.labels] : [],
                datasets: Array.isArray(originalChart.data.datasets) ? originalChart.data.datasets.map(dataset => ({
                    ...dataset,
                    data: Array.isArray(dataset.data) ? [...dataset.data] : []
                })) : []
            },
            options: this.createFullscreenOptions(originalChart.config.options)
        };

        // Criar novo gráfico
        try {
            this.fullscreenChart = new Chart(ctx, config);
        } catch (error) {
            console.error('Error creating fullscreen chart:', error);
        }
    }

    createFullscreenViolations() {
        const canvasContainer = document.getElementById('fullscreen-chart-container') || document.getElementById('fullscreen-chart-canvas');

        // Limpar conteúdo anterior
        if (this.fullscreenChart) {
            try { this.fullscreenChart.destroy(); } catch (e) { console.warn(e); }
            this.fullscreenChart = null;
        }

        // Criar container para violações fullscreen
        const html = `
            <div class="violations-fullscreen-container">
                <div class="violations-fullscreen-header">
                    <div class="violations-stats">
                        <div class="stat-item">
                            <span class="stat-label">Total de Violações</span>
                            <span class="stat-value" id="fullscreen-violations-count">--</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Período</span>
                            <span class="stat-value" id="fullscreen-violations-period">--</span>
                        </div>
                    </div>
                </div>
                <div class="violations-fullscreen-list" id="fullscreen-violations-list">
                    <div class="text-center py-4">
                        <div class="loading-spinner" style="width: 40px; height: 40px; margin: 0 auto 1rem;"></div>
                        <p style="color: rgba(255,255,255,0.7); margin: 0;">Carregando violações...</p>
                    </div>
                </div>
            </div>
        `;

        canvasContainer.innerHTML = html;

        // Buscar dados das violações e atualizar
        this.loadFullscreenViolations();
    }

    async loadFullscreenViolations() {
        try {
            const response = await fetch('/api/violations/');
            const data = await response.json();

            // A API retorna uma lista diretamente, não um objeto com chave "value"
            if (Array.isArray(data)) {
                this.updateFullscreenViolations(data);
            } else if (data && data.value) {
                this.updateFullscreenViolations(data.value);
            } else {
                this.showFullscreenViolationsError('Erro ao carregar violações');
            }
        } catch (error) {
            console.error('Erro em loadFullscreenViolations:', error);
            this.showFullscreenViolationsError('Erro ao carregar violações');
        }
    }

    updateFullscreenViolations(violationsData) {
        const countElement = document.getElementById('fullscreen-violations-count');
        const periodElement = document.getElementById('fullscreen-violations-period');
        const listElement = document.getElementById('fullscreen-violations-list');

        if (!violationsData || violationsData.length === 0) {
            listElement.innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-check-circle text-success mb-2" style="font-size: 2rem;"></i>
                    <p class="text-muted mb-0">Nenhuma violação encontrada</p>
                </div>
            `;
            if (countElement) countElement.textContent = '0';
            if (periodElement) periodElement.textContent = '--';
            return;
        }

        // Atualizar estatísticas
        if (countElement) countElement.textContent = violationsData.length.toLocaleString();

        // Calcular período
        if (periodElement && violationsData.length > 0) {
            const firstDate = new Date(violationsData[violationsData.length - 1].timestamp);
            const lastDate = new Date(violationsData[0].timestamp);
            const daysDiff = Math.ceil((lastDate - firstDate) / (1000 * 60 * 60 * 24));
            periodElement.textContent = `${daysDiff} dias`;
        }

        // Criar lista expandida de violações
        const violationsHTML = violationsData.map((violation, index) => {
            const timestamp = new Date(violation.timestamp);
            const timeString = timestamp.toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });

            // Determinar qual parâmetro causou a violação
            const tempValue = violation.temperature || 0;
            const humidityValue = violation.relative_humidity || 0;
            const tempLimit = 19.5; // Limite superior da Embrapa
            const humidityLimit = 62; // Limite da Embrapa

            let violationType = 'general';
            let violationTitle = 'Violação Detectada';
            let alertClass = '';
            let itemClass = 'violation-fullscreen-item';

            if (tempValue > tempLimit) {
                violationType = 'temp';
                violationTitle = 'Temperatura Acima do Limite';
                alertClass = 'temp';
                itemClass += ' temp-violation';
            } else if (humidityValue > humidityLimit) {
                violationType = 'humidity';
                violationTitle = 'Umidade Acima do Limite';
                alertClass = 'humidity';
                itemClass += ' humidity-violation';
            }

            // Build metrics HTML: show only the violated metric prominently to avoid duplication
            let metricsHtml = '';
            if (violationType === 'temp') {
                metricsHtml = `
                    <div class="metric-card violated temp">
                        <span class="metric-label">Temperatura</span>
                        <span class="metric-value">${tempValue.toFixed(1)}°C</span>
                        <span class="metric-limit">Limite: ≤ ${tempLimit}°C</span>
                    </div>
                `;
            } else if (violationType === 'humidity') {
                metricsHtml = `
                    <div class="metric-card violated humidity">
                        <span class="metric-label">Umidade</span>
                        <span class="metric-value">${humidityValue.toFixed(1)}%</span>
                        <span class="metric-limit">Limite: ≤ ${humidityLimit}%</span>
                    </div>
                `;
            } else {
                // general case: show both metrics
                metricsHtml = `
                    <div class="metric-card ${violationType === 'temp' ? 'violated temp' : ''}">
                        <span class="metric-label">Temperatura</span>
                        <span class="metric-value">${tempValue.toFixed(1)}°C</span>
                        <span class="metric-limit">Limite: ≤ ${tempLimit}°C</span>
                    </div>
                    <div class="metric-card ${violationType === 'humidity' ? 'violated humidity' : ''}">
                        <span class="metric-label">Umidade</span>
                        <span class="metric-value">${humidityValue.toFixed(1)}%</span>
                        <span class="metric-limit">Limite: ≤ ${humidityLimit}%</span>
                    </div>
                `;
            }

            return `
                <div class="${itemClass}" data-index="${index}">
                    <div class="violation-fullscreen-header">
                        <div>
                            <h4 class="violation-fullscreen-title">
                                <i class="fas fa-exclamation-triangle me-2"></i>
                                ${violationTitle}
                            </h4>
                            <div class="violation-fullscreen-time">
                                <i class="fas fa-clock"></i>
                                ${timeString}
                            </div>
                        </div>
                        <div class="violation-fullscreen-alert ${alertClass}">
                            <i class="fas fa-exclamation-triangle"></i>
                        </div>
                    </div>

                    <div class="violation-fullscreen-content">
                        <div class="violation-metrics">
                            ${metricsHtml}
                        </div>

                        <div class="violation-description ${alertClass}">
                            ${(() => {
                    const defaultMsg = 'Condições ambientais fora dos parâmetros ideais estabelecidos pela Embrapa. Recomenda-se intervenção imediata para manter a qualidade do ambiente.';
                    const reason = violation.reason || '';
                    const reasonLower = reason.toLowerCase();
                    if (violationType === 'humidity' && reason && reasonLower.includes('umid')) {
                        return 'Condições de umidade fora dos parâmetros ideais.';
                    }
                    if (violationType === 'temp' && reason && (reasonLower.includes('temp') || reasonLower.includes('temper'))) {
                        return 'Condições de temperatura fora dos parâmetros ideais.';
                    }
                    return reason || defaultMsg;
                })()}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        listElement.innerHTML = violationsHTML;
    }

    showFullscreenViolationsError(message) {
        const listElement = document.getElementById('fullscreen-violations-list');
        if (listElement) {
            listElement.innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-exclamation-circle text-danger mb-2" style="font-size: 2rem;"></i>
                    <p class="text-danger mb-0">${message}</p>
                </div>
            `;
        }
    }

    createFullscreenOptions(originalOptions) {
        // Criar opções otimizadas para fullscreen
        return {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        font: {
                            size: 16,
                            weight: '500',
                            family: 'Inter, system-ui, sans-serif'
                        },
                        color: '#e5e5e5',
                        usePointStyle: true,
                        pointStyle: 'circle',
                        padding: 20
                    }
                },
                tooltip: {
                    enabled: true,
                    backgroundColor: 'rgba(17, 17, 17, 0.95)',
                    titleColor: '#ffffff',
                    bodyColor: '#e5e5e5',
                    borderColor: this.currentChartType === 'temperature' ? '#ef4444' : '#3b82f6',
                    borderWidth: 2,
                    cornerRadius: 12,
                    padding: 16,
                    displayColors: false,
                    titleFont: {
                        size: 16,
                        weight: '600'
                    },
                    bodyFont: {
                        size: 14,
                        weight: '500'
                    },
                    callbacks: originalOptions?.plugins?.tooltip?.callbacks || {
                        title: function (context) {
                            return 'Horário: ' + context[0].label;
                        },
                        label: function (context) {
                            const unit = this.currentChartType === 'temperature' ? '°C' : '%';
                            const label = this.currentChartType === 'temperature' ? 'Temperatura' : 'Umidade';
                            return `${label}: ${context.parsed.y.toFixed(1)}${unit}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Horário',
                        font: {
                            size: 16,
                            weight: '500',
                            family: 'Inter, system-ui, sans-serif'
                        },
                        color: '#a3a3a3'
                    },
                    ticks: {
                        font: {
                            size: 12,
                            family: 'Inter, system-ui, sans-serif'
                        },
                        color: '#a3a3a3',
                        maxTicksLimit: 12
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.08)',
                        drawBorder: false,
                        lineWidth: 1
                    },
                    border: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                y: {
                    display: true,
                    title: {
                        display: true,
                        text: this.currentChartType === 'temperature' ? 'Temperatura (°C)' : 'Umidade (%)',
                        font: {
                            size: 16,
                            weight: '500',
                            family: 'Inter, system-ui, sans-serif'
                        },
                        color: '#a3a3a3'
                    },
                    ticks: {
                        font: {
                            size: 12,
                            family: 'Inter, system-ui, sans-serif'
                        },
                        color: '#a3a3a3',
                        callback: function (value) {
                            const unit = this.currentChartType === 'temperature' ? '°C' : '%';
                            return value.toFixed(1) + unit;
                        }.bind(this)
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.08)',
                        drawBorder: false,
                        lineWidth: 1
                    },
                    border: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    beginAtZero: false
                }
            },
            animation: {
                duration: 1500,
                easing: 'easeInOutQuart'
            },
            elements: {
                point: {
                    radius: 6,
                    hoverRadius: 9,
                    hoverBackgroundColor: this.currentChartType === 'temperature' ? '#dc2626' : '#2563eb',
                    hoverBorderColor: '#ffffff',
                    hoverBorderWidth: 3
                },
                line: {
                    tension: 0.4,
                    borderWidth: 4
                }
            }
        };
    }

    closeFullscreen() {
        // Destruir gráfico fullscreen se existir
        if (this.fullscreenChart) {
            this.fullscreenChart.destroy();
            this.fullscreenChart = null;
        }

        // Limpar conteúdo de violações fullscreen - restaurar um canvas vazio no container
        const container = document.getElementById('fullscreen-chart-container') || document.getElementById('fullscreen-chart-canvas');
        if (container && this.currentChartType === 'violations') {
            // remove all children and add an empty canvas so subsequent opens have a properly sized canvas
            while (container.firstChild) container.removeChild(container.firstChild);
            const newCanvas = document.createElement('canvas');
            newCanvas.id = 'fullscreen-chart-canvas';
            container.appendChild(newCanvas);

            // size it to the container to avoid future oversizing
            const rect = container.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            newCanvas.width = Math.max(1, Math.floor(rect.width * dpr));
            newCanvas.height = Math.max(1, Math.floor(rect.height * dpr));
            newCanvas.style.width = rect.width + 'px';
            newCanvas.style.height = rect.height + 'px';
        }

        // Esconder modal
        this.modal.classList.remove('active');
        document.body.classList.remove('modal-active');
        document.body.style.overflow = '';

        this.currentChartType = null;
    }

    // Método para atualizar gráfico fullscreen quando dados mudarem
    updateFullscreenChart(chartType, data) {
        if (this.currentChartType === chartType && this.fullscreenChart) {
            this.fullscreenChart.data.labels = data.labels;
            this.fullscreenChart.data.datasets[0].data = data.data;
            this.fullscreenChart.update('active');
        }
    }

    destroy() {
        if (this.fullscreenChart) {
            this.fullscreenChart.destroy();
        }

        // Remover listeners (guard checks)
        if (this.keydownHandler) {
            document.removeEventListener('keydown', this.keydownHandler);
        }
        if (this.modal && this.clickHandler) {
            this.modal.removeEventListener('click', this.clickHandler);
        }
    }
}

// Funções globais para os botões
window.openChartFullscreen = function (chartType) {
    if (window.dashboardFullscreen) {
        window.dashboardFullscreen.openFullscreen(chartType);
    } else {
        console.error('dashboardFullscreen não encontrado!');
    }
};

window.closeChartFullscreen = function () {
    if (window.dashboardFullscreen) {
        window.dashboardFullscreen.closeFullscreen();
    }
};

// Exportar classe
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DashboardFullscreen;
} else {
    window.DashboardFullscreen = DashboardFullscreen;
}
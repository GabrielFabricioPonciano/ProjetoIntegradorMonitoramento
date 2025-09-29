/**
 * Dashboard Fullscreen Charts Module
 * Gerencia a funcionalidade de visualização de gráficos em tela cheia
 */

console.log('Dashboard Fullscreen module loading...');

class DashboardFullscreen {
    constructor() {
        this.fullscreenChart = null;
        this.currentChartType = null;
        this.modal = null;
        this.init();
    }

    init() {
        console.log('DashboardFullscreen init called');

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
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.classList.contains('active')) {
                this.closeFullscreen();
            }
        });

        // Fechar clicando fora do conteúdo
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.closeFullscreen();
            }
        });

        console.log('Fullscreen elements initialized');
    }

    openFullscreen(chartType) {
        console.log('Opening fullscreen for chart:', chartType);

        if (!window.dashboardCharts || !window.dashboardCharts.charts[chartType]) {
            console.error('Chart not found:', chartType);
            return;
        }

        this.currentChartType = chartType;
        const originalChart = window.dashboardCharts.charts[chartType];

        // Configurar modal
        this.setupModal(chartType);

        // Mostrar modal
        this.modal.classList.add('active');
        document.body.style.overflow = 'hidden';

        // Aguardar modal aparecer e criar gráfico
        setTimeout(() => {
            this.createFullscreenChart(originalChart);
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
        }
    }

    createFullscreenChart(originalChart) {
        const canvas = document.getElementById('fullscreen-chart-canvas');
        const ctx = canvas.getContext('2d');

        // Limpar canvas anterior se existir
        if (this.fullscreenChart) {
            this.fullscreenChart.destroy();
        }

        // Clonar dados e configuração do gráfico original
        const config = {
            type: originalChart.config.type,
            data: {
                labels: [...originalChart.data.labels],
                datasets: originalChart.data.datasets.map(dataset => ({
                    ...dataset,
                    data: [...dataset.data]
                }))
            },
            options: this.createFullscreenOptions(originalChart.config.options)
        };

        // Criar novo gráfico
        try {
            this.fullscreenChart = new Chart(ctx, config);
            console.log('Fullscreen chart created successfully');
        } catch (error) {
            console.error('Error creating fullscreen chart:', error);
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
        console.log('Closing fullscreen chart');

        // Destruir gráfico fullscreen
        if (this.fullscreenChart) {
            this.fullscreenChart.destroy();
            this.fullscreenChart = null;
        }

        // Esconder modal
        this.modal.classList.remove('active');
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

        // Remover listeners
        document.removeEventListener('keydown', this.keydownHandler);
        if (this.modal) {
            this.modal.removeEventListener('click', this.clickHandler);
        }
    }
}

// Funções globais para os botões
window.openChartFullscreen = function (chartType) {
    if (window.dashboardFullscreen) {
        window.dashboardFullscreen.openFullscreen(chartType);
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

console.log('Dashboard Fullscreen module loaded');
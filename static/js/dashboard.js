// Dashboard JavaScript - Design Limpo e Corrigido
class EnvironmentalDashboard {
    constructor() {
        this.charts = {};
        this.data = {};
        this.isLoading = false;
        
        // Formatador brasileiro para números
        this.numberFormatter = new Intl.NumberFormat('pt-BR', {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1
        });
        
        // Formatador para datas brasileiras
        this.dateFormatter = new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'America/Sao_Paulo'
        });
        
        // Formatador completo para datas
        this.fullDateFormatter = new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'America/Sao_Paulo'
        });
        
        // Configurações dos gráficos
        this.chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 20
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    titleColor: '#333',
                    bodyColor: '#666',
                    borderColor: '#ddd',
                    borderWidth: 1,
                    cornerRadius: 8,
                    displayColors: true,
                    callbacks: {
                        title: (context) => {
                            if (context[0] && context[0].parsed && context[0].parsed.x) {
                                const date = new Date(context[0].parsed.x);
                                return this.fullDateFormatter.format(date);
                            }
                            return '';
                        },
                        label: (context) => {
                            const value = context.parsed.y;
                            const label = context.dataset.label;
                            if (label.includes('Temperatura')) {
                                return `${label}: ${this.numberFormatter.format(value)}°C`;
                            } else if (label.includes('Umidade')) {
                                return `${label}: ${this.numberFormatter.format(value)}%`;
                            }
                            return `${label}: ${this.numberFormatter.format(value)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    title: {
                        display: true,
                        font: {
                            weight: 'bold'
                        }
                    },
                    grid: {
                        color: '#f0f0f0'
                    },
                    ticks: {
                        callback: function(value) {
                            return value.toLocaleString('pt-BR', {
                                minimumFractionDigits: 1,
                                maximumFractionDigits: 1
                            });
                        }
                    }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            }
        };
        
        this.init();
    }
    
    async init() {
        this.showLoading();
        
        try {
            await this.loadData();
            this.updateKPIs();
            this.createCharts();
            await this.loadViolations();
            this.addAnimations();
        } catch (error) {
            console.error('Erro ao inicializar dashboard:', error);
            this.showError('Erro ao carregar dados do dashboard');
        } finally {
            this.hideLoading();
        }
    }
    
    async loadData() {
        try {
            // Carregar dados de resumo
            const summaryResponse = await fetch('/api/summary');
            if (!summaryResponse.ok) throw new Error('Erro ao carregar resumo');
            this.data.summary = await summaryResponse.json();
            
            // Carregar dados de série temporal
            const seriesResponse = await fetch('/api/series?max_points=500');
            if (!seriesResponse.ok) throw new Error('Erro ao carregar série');
            this.data.series = await seriesResponse.json();
            
            // Ordenar série por timestamp (do mais antigo ao mais recente)
            if (Array.isArray(this.data.series)) {
                this.data.series.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            }
            
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            throw error;
        }
    }
    
    updateKPIs() {
        const { summary } = this.data;
        
        if (!summary || !summary.temperature_stats || !summary.humidity_stats) {
            console.error('Dados de resumo inválidos:', summary);
            return;
        }
        
        // Temperatura
        const tempMean = summary.temperature_stats.mean;
        const tempMin = summary.temperature_stats.min;
        const tempMax = summary.temperature_stats.max;
        
        document.getElementById('temp-mean').textContent = `${this.numberFormatter.format(tempMean)}°C`;
        document.getElementById('temp-range').textContent = 
            `Min: ${this.numberFormatter.format(tempMin)}°C | Max: ${this.numberFormatter.format(tempMax)}°C`;
        
        // Umidade
        const rhMean = summary.humidity_stats.mean;
        const rhMin = summary.humidity_stats.min;
        const rhMax = summary.humidity_stats.max;
        
        document.getElementById('rh-mean').textContent = `${this.numberFormatter.format(rhMean)}%`;
        document.getElementById('rh-range').textContent = 
            `Min: ${this.numberFormatter.format(rhMin)}% | Max: ${this.numberFormatter.format(rhMax)}%`;
        
        // Violações
        const violationsCount = summary.violations_count || 0;
        const totalMeasurements = summary.total_measurements || 0;
        const violationsPct = totalMeasurements > 0 ? (violationsCount / totalMeasurements * 100) : 0;
        
        document.getElementById('violations-count').textContent = violationsCount.toLocaleString('pt-BR');
        document.getElementById('violations-pct').textContent = 
            `${this.numberFormatter.format(violationsPct)}% do total`;
        
        // Total de medições
        document.getElementById('total-measurements').textContent = totalMeasurements.toLocaleString('pt-BR');
    }
    
    createCharts() {
        if (!this.data.series || !Array.isArray(this.data.series)) {
            console.error('Dados de série inválidos:', this.data.series);
            return;
        }
        
        this.createTemperatureChart();
        this.createHumidityChart();
    }
    
    createTemperatureChart() {
        const ctx = document.getElementById('tempChart').getContext('2d');
        
        // Preparar dados com timestamps reais
        const data = this.data.series.map(item => ({
            x: new Date(item.timestamp),
            y: item.temperature
        }));
        
        // Criar linhas de limite com timestamps
        const tempLowLine = this.data.series.map(item => ({
            x: new Date(item.timestamp),
            y: 17.0
        }));
        
        const tempHighLine = this.data.series.map(item => ({
            x: new Date(item.timestamp),
            y: 19.5
        }));
        
        this.charts.temperature = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [
                    {
                        label: 'Temperatura',
                        data: data,
                        borderColor: '#dc3545',
                        backgroundColor: 'rgba(220, 53, 69, 0.1)',
                        borderWidth: 2,
                        fill: false,
                        tension: 0.1,
                        pointRadius: 1,
                        pointHoverRadius: 5
                    },
                    {
                        label: 'Limite Mínimo (17,0°C)',
                        data: tempLowLine,
                        borderColor: '#0d6efd',
                        backgroundColor: 'transparent',
                        borderWidth: 1,
                        borderDash: [5, 5],
                        fill: false,
                        pointRadius: 0,
                        pointHoverRadius: 0
                    },
                    {
                        label: 'Limite Máximo (19,5°C)',
                        data: tempHighLine,
                        borderColor: '#dc3545',
                        backgroundColor: 'transparent',
                        borderWidth: 1,
                        borderDash: [5, 5],
                        fill: false,
                        pointRadius: 0,
                        pointHoverRadius: 0
                    }
                ]
            },
            options: {
                ...this.chartOptions,
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            displayFormats: {
                                hour: 'dd/MM HH:mm',
                                day: 'dd/MM HH:mm'
                            }
                        },
                        title: {
                            display: true,
                            text: 'Data/Hora',
                            font: {
                                weight: 'bold'
                            }
                        },
                        ticks: {
                            source: 'auto',
                            maxTicksLimit: 10
                        }
                    },
                    y: {
                        ...this.chartOptions.scales.y,
                        title: {
                            display: true,
                            text: 'Temperatura (°C)',
                            font: {
                                weight: 'bold'
                            }
                        },
                        ticks: {
                            callback: function(value) {
                                return value.toLocaleString('pt-BR', {
                                    minimumFractionDigits: 1,
                                    maximumFractionDigits: 1
                                }) + '°C';
                            }
                        }
                    }
                }
            }
        });
    }
    
    createHumidityChart() {
        const ctx = document.getElementById('rhChart').getContext('2d');
        
        // Preparar dados com timestamps reais
        const data = this.data.series.map(item => ({
            x: new Date(item.timestamp),
            y: item.relative_humidity
        }));
        
        // Criar linha de limite com timestamps
        const rhLimitLine = this.data.series.map(item => ({
            x: new Date(item.timestamp),
            y: 62.0
        }));
        
        this.charts.humidity = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [
                    {
                        label: 'Umidade Relativa',
                        data: data,
                        borderColor: '#0d6efd',
                        backgroundColor: 'rgba(13, 110, 253, 0.1)',
                        borderWidth: 2,
                        fill: false,
                        tension: 0.1,
                        pointRadius: 1,
                        pointHoverRadius: 5
                    },
                    {
                        label: 'Limite Máximo (62,0%)',
                        data: rhLimitLine,
                        borderColor: '#ffc107',
                        backgroundColor: 'transparent',
                        borderWidth: 1,
                        borderDash: [5, 5],
                        fill: false,
                        pointRadius: 0,
                        pointHoverRadius: 0
                    }
                ]
            },
            options: {
                ...this.chartOptions,
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            displayFormats: {
                                hour: 'dd/MM HH:mm',
                                day: 'dd/MM HH:mm'
                            }
                        },
                        title: {
                            display: true,
                            text: 'Data/Hora',
                            font: {
                                weight: 'bold'
                            }
                        },
                        ticks: {
                            source: 'auto',
                            maxTicksLimit: 10
                        }
                    },
                    y: {
                        ...this.chartOptions.scales.y,
                        title: {
                            display: true,
                            text: 'Umidade Relativa (%)',
                            font: {
                                weight: 'bold'
                            }
                        },
                        ticks: {
                            callback: function(value) {
                                return value.toLocaleString('pt-BR', {
                                    minimumFractionDigits: 1,
                                    maximumFractionDigits: 1
                                }) + '%';
                            }
                        }
                    }
                }
            }
        });
    }
    
    async loadViolations() {
        try {
            const response = await fetch('/api/violations?limit=50');
            if (!response.ok) throw new Error('Erro ao carregar violações');
            
            const violations = await response.json();
            
            if (Array.isArray(violations) && violations.length > 0) {
                this.updateViolationsTable(violations);
            } else {
                this.showNoViolations();
            }
            
        } catch (error) {
            console.error('Erro ao carregar violações:', error);
            this.showViolationsError();
        }
    }
    
    updateViolationsTable(violations) {
        const tableBody = document.getElementById('violations-table');
        
        if (violations.length === 0) {
            this.showNoViolations();
            return;
        }
        
        const rows = violations.map(violation => {
            const date = new Date(violation.timestamp);
            const formattedDate = this.fullDateFormatter.format(date);
            
            const temp = violation.temperature !== null ? 
                `${this.numberFormatter.format(violation.temperature)}°C` : '—';
            
            const rh = violation.relative_humidity !== null ? 
                `${this.numberFormatter.format(violation.relative_humidity)}%` : '—';
            
            return `
                <tr>
                    <td class="fw-medium">${formattedDate}</td>
                    <td>${temp}</td>
                    <td>${rh}</td>
                    <td>${this.getViolationReasonBadge(violation.reason)}</td>
                </tr>
            `;
        }).join('');
        
        tableBody.innerHTML = rows;
    }
    
    getViolationReasonBadge(reason) {
        if (!reason) return '—';
        
        let badgeClass = 'violation-badge';
        
        if (reason.includes('Temperatura') && reason.includes('Umidade')) {
            badgeClass += ' multiple';
        } else if (reason.includes('fora do intervalo')) {
            badgeClass += reason.includes('baixa') ? ' temp-low' : ' temp-high';
        } else if (reason.includes('Umidade')) {
            badgeClass += ' rh-high';
        }
        
        return `<span class="${badgeClass}">${reason}</span>`;
    }
    
    showNoViolations() {
        const tableBody = document.getElementById('violations-table');
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center py-4 text-muted">
                    <i class="fas fa-check-circle text-success me-2"></i>
                    Nenhuma violação encontrada nos dados atuais.
                </td>
            </tr>
        `;
    }
    
    showViolationsError() {
        const tableBody = document.getElementById('violations-table');
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center py-4 text-danger">
                    <i class="fas fa-exclamation-circle me-2"></i>
                    Erro ao carregar violações. Tente novamente.
                </td>
            </tr>
        `;
    }
    
    addAnimations() {
        // Adicionar animações aos cards
        const cards = document.querySelectorAll('.kpi-card, .card');
        cards.forEach((card, index) => {
            card.classList.add('fade-in-up');
            card.style.animationDelay = `${index * 0.1}s`;
        });
    }
    
    showLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.remove('hidden');
        }
        this.isLoading = true;
    }
    
    hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.add('hidden');
        }
        this.isLoading = false;
    }
    
    showError(message) {
        console.error(message);
        // Aqui você pode adicionar uma notificação visual se desejar
    }
    
    // Método para atualizar dados periodicamente (opcional)
    startAutoRefresh(interval = 300000) { // 5 minutos
        setInterval(async () => {
            if (!this.isLoading) {
                console.log('Atualizando dados automaticamente...');
                try {
                    await this.loadData();
                    this.updateKPIs();
                    this.updateCharts();
                    await this.loadViolations();
                } catch (error) {
                    console.error('Erro na atualização automática:', error);
                }
            }
        }, interval);
    }
    
    updateCharts() {
        if (this.charts.temperature) {
            this.charts.temperature.destroy();
        }
        if (this.charts.humidity) {
            this.charts.humidity.destroy();
        }
        this.createCharts();
    }
}

// Inicializar dashboard quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    const dashboard = new EnvironmentalDashboard();
    
    // Opcional: iniciar auto-refresh
    // dashboard.startAutoRefresh();
    
    // Expor para debug no console
    window.dashboard = dashboard;
    
    console.log('Dashboard inicializado com sucesso!');
});

// Dashboard JavaScript - Sistema Dinâmico de Monitoramento
class EnvironmentalDashboard {
    constructor() {
        this.charts = {};
        this.data = {};
        this.isLoading = false;
        this.currentPeriod = 30; // dias
        this.lastUpdated = null;
        this.autoRefreshEnabled = true;
        this.autoRefreshInterval = null;
        
        // Formatadores brasileiros
        this.numberFormatter = new Intl.NumberFormat('pt-BR', {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1
        });
        
        this.dateFormatter = new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'America/Sao_Paulo'
        });
        
        this.fullDateFormatter = new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'America/Sao_Paulo'
        });
        
        this.monthFormatter = new Intl.DateTimeFormat('pt-BR', {
            month: 'short',
            timeZone: 'America/Sao_Paulo'
        });
        
        this.timeFormatter = new Intl.DateTimeFormat('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'America/Sao_Paulo'
        });
        
        this.init();
    }
    
    async init() {
        this.setupEventListeners();
        this.showLoading();
        this.showSkeletons();
        
        try {
            await this.loadData();
            this.updateKPIs();
            this.createCharts();
            await this.loadViolations();
            this.hideSkeletons();
            this.addAnimations();
            this.updateLastUpdatedTime();
            this.startAutoRefresh();
        } catch (error) {
            console.error('Erro ao inicializar dashboard:', error);
            this.showErrorToast('Erro ao carregar dados do dashboard');
        } finally {
            this.hideLoading();
        }
    }
    
    setupEventListeners() {
        // Seletor de período
        const periodRadios = document.querySelectorAll('input[name="period"]');
        periodRadios.forEach(radio => {
            radio.addEventListener('change', async (e) => {
                if (e.target.value === 'custom') {
                    this.showCustomPeriodPanel();
                } else {
                    this.hideCustomPeriodPanel();
                    this.currentPeriod = parseInt(e.target.value);
                    await this.refreshData();
                }
            });
        });
        
        // Teclas de atalho
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'r') {
                e.preventDefault();
                this.refreshData();
            }
        });
    }
    
    showCustomPeriodPanel() {
        const panel = document.getElementById('custom-period-panel');
        panel.style.display = 'block';
        panel.classList.add('fade-in');
        
        // Definir datas padrão (último mês)
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        
        document.getElementById('start-date').value = startDate.toISOString().split('T')[0];
        document.getElementById('end-date').value = endDate.toISOString().split('T')[0];
    }
    
    hideCustomPeriodPanel() {
        const panel = document.getElementById('custom-period-panel');
        panel.style.display = 'none';
    }
    
    async applyCustomPeriod() {
        const startDate = document.getElementById('start-date').value;
        const endDate = document.getElementById('end-date').value;
        
        if (!startDate || !endDate) {
            this.showErrorToast('Por favor, selecione ambas as datas');
            return;
        }
        
        if (new Date(startDate) > new Date(endDate)) {
            this.showErrorToast('Data inicial deve ser anterior à data final');
            return;
        }
        
        this.customStartDate = startDate;
        this.customEndDate = endDate;
        this.currentPeriod = 'custom';
        
        await this.refreshData();
        this.hideCustomPeriodPanel();
        
        const periodText = this.getCurrentPeriodText();
        this.showSuccessToast(`Período personalizado aplicado: ${periodText}`);
    }
    
    buildApiUrl(endpoint, extraParams = {}) {
        const params = new URLSearchParams();
        
        // Adicionar filtros de período
        if (this.currentPeriod === 'custom' && this.customStartDate && this.customEndDate) {
            params.set('start_date', this.customStartDate);
            params.set('end_date', this.customEndDate);
        } else if (this.currentPeriod !== 'all') {
            params.set('days', this.currentPeriod.toString());
        }
        
        // Adicionar parâmetros extras
        Object.entries(extraParams).forEach(([key, value]) => {
            params.set(key, value);
        });
        
        return `${endpoint}?${params.toString()}`;
    }
    
    async loadData() {
        try {
            // URLs com filtros aplicados
            const summaryUrl = this.buildApiUrl('/api/summary');
            const seriesUrl = this.buildApiUrl('/api/series', { max_points: '1000' });
            
            console.log('Carregando dados:', { summaryUrl, seriesUrl });
            
            // Carregar dados de resumo
            const summaryResponse = await fetch(summaryUrl);
            if (!summaryResponse.ok) throw new Error('Erro ao carregar resumo');
            this.data.summary = await summaryResponse.json();
            
            // Carregar dados de série temporal
            const seriesResponse = await fetch(seriesUrl);
            if (!seriesResponse.ok) throw new Error('Erro ao carregar série');
            this.data.series = await seriesResponse.json();
            
            console.log('Dados carregados:', {
                summary: this.data.summary,
                seriesCount: this.data.series?.length
            });
            
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
        
        if (tempMean !== null) {
            document.getElementById('temp-mean').textContent = `${this.numberFormatter.format(tempMean)}°C`;
            document.getElementById('temp-range').textContent = 
                `Min: ${this.numberFormatter.format(tempMin)}°C | Max: ${this.numberFormatter.format(tempMax)}°C`;
        }
        
        // Umidade
        const rhMean = summary.humidity_stats.mean;
        const rhMin = summary.humidity_stats.min;
        const rhMax = summary.humidity_stats.max;
        
        if (rhMean !== null) {
            document.getElementById('rh-mean').textContent = `${this.numberFormatter.format(rhMean)}%`;
            document.getElementById('rh-range').textContent = 
                `Min: ${this.numberFormatter.format(rhMin)}% | Max: ${this.numberFormatter.format(rhMax)}%`;
        }
        
        // Violações com base de cálculo
        const violationsCount = summary.violations_count || 0;
        const totalMeasurements = summary.total_measurements || 0;
        const violationsPct = totalMeasurements > 0 ? (violationsCount / totalMeasurements * 100) : 0;
        
        document.getElementById('violations-count').textContent = violationsCount.toLocaleString('pt-BR');
        document.getElementById('violations-pct').textContent = 
            `${this.numberFormatter.format(violationsPct)}% do total`;
        document.getElementById('violations-base').textContent = 
            `(base: ${totalMeasurements.toLocaleString('pt-BR')} medições válidas)`;
        
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
        
        // Mostrar containers dos gráficos
        document.getElementById('temp-chart-placeholder').style.display = 'none';
        document.getElementById('temp-chart-container').style.display = 'block';
        document.getElementById('rh-chart-placeholder').style.display = 'none';
        document.getElementById('rh-chart-container').style.display = 'block';
    }
    
    createTemperatureChart() {
        const ctx = document.getElementById('tempChart').getContext('2d');
        
        // Destruir gráfico anterior se existir
        if (this.charts.temperature) {
            this.charts.temperature.destroy();
        }
        
        // Preparar dados
        const data = this.data.series.map(item => ({
            x: new Date(item.timestamp),
            y: item.temperature
        }));
        
        // Determinar formato do eixo X baseado no período
        const timeSpan = this.getTimeSpan(data);
        const displayFormats = this.getTimeDisplayFormats(timeSpan);
        
        // Linhas de limite
        const tempLowLine = data.map(item => ({ x: item.x, y: 17.0 }));
        const tempHighLine = data.map(item => ({ x: item.x, y: 19.5 }));
        
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
                        pointHoverRadius: 6
                    },
                    {
                        label: 'Limite Mínimo (17,0°C)',
                        data: tempLowLine,
                        borderColor: 'rgba(13, 110, 253, 0.6)',
                        backgroundColor: 'transparent',
                        borderWidth: 1,
                        borderDash: [6, 4],
                        fill: false,
                        pointRadius: 0,
                        pointHoverRadius: 0
                    },
                    {
                        label: 'Limite Máximo (19,5°C)',
                        data: tempHighLine,
                        borderColor: 'rgba(220, 53, 69, 0.6)',
                        backgroundColor: 'transparent',
                        borderWidth: 1,
                        borderDash: [6, 4],
                        fill: false,
                        pointRadius: 0,
                        pointHoverRadius: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                decimation: {
                    enabled: data.length > 500,
                    algorithm: 'lttb',
                    samples: 500
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 20,
                            font: { size: 12 }
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
                                if (label.includes('Temperatura') || label.includes('Limite')) {
                                    return `${label}: ${this.numberFormatter.format(value)}°C`;
                                }
                                return `${label}: ${this.numberFormatter.format(value)}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            displayFormats: displayFormats,
                            tooltipFormat: 'dd/MM/yyyy HH:mm'
                        },
                        title: {
                            display: true,
                            text: 'Data/Hora',
                            font: { weight: 'bold' }
                        },
                        grid: { color: '#f0f0f0' }
                    },
                    y: {
                        title: {
                            display: true,
                            text: '°C',
                            font: { weight: 'bold' }
                        },
                        grid: { color: '#f0f0f0' },
                        ticks: {
                            callback: (value) => this.numberFormatter.format(value) + '°C'
                        }
                    }
                }
            }
        });
    }
    
    createHumidityChart() {
        const ctx = document.getElementById('rhChart').getContext('2d');
        
        // Destruir gráfico anterior se existir
        if (this.charts.humidity) {
            this.charts.humidity.destroy();
        }
        
        // Preparar dados
        const data = this.data.series.map(item => ({
            x: new Date(item.timestamp),
            y: item.relative_humidity
        }));
        
        // Determinar formato do eixo X baseado no período
        const timeSpan = this.getTimeSpan(data);
        const displayFormats = this.getTimeDisplayFormats(timeSpan);
        
        // Linha de limite
        const rhLimitLine = data.map(item => ({ x: item.x, y: 62.0 }));
        
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
                        pointHoverRadius: 6
                    },
                    {
                        label: 'Limite Máximo (62,0%)',
                        data: rhLimitLine,
                        borderColor: 'rgba(255, 193, 7, 0.6)',
                        backgroundColor: 'transparent',
                        borderWidth: 1,
                        borderDash: [6, 4],
                        fill: false,
                        pointRadius: 0,
                        pointHoverRadius: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                decimation: {
                    enabled: data.length > 500,
                    algorithm: 'lttb',
                    samples: 500
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 20,
                            font: { size: 12 }
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
                                if (label.includes('Umidade') || label.includes('Limite')) {
                                    return `${label}: ${this.numberFormatter.format(value)}%`;
                                }
                                return `${label}: ${this.numberFormatter.format(value)}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            displayFormats: displayFormats,
                            tooltipFormat: 'dd/MM/yyyy HH:mm'
                        },
                        title: {
                            display: true,
                            text: 'Data/Hora',
                            font: { weight: 'bold' }
                        },
                        grid: { color: '#f0f0f0' }
                    },
                    y: {
                        title: {
                            display: true,
                            text: '%',
                            font: { weight: 'bold' }
                        },
                        grid: { color: '#f0f0f0' },
                        ticks: {
                            callback: (value) => this.numberFormatter.format(value) + '%'
                        }
                    }
                }
            }
        });
    }
    
    getTimeSpan(data) {
        if (!data || data.length === 0) return 0;
        const start = new Date(data[0].x);
        const end = new Date(data[data.length - 1].x);
        return (end - start) / (1000 * 60 * 60 * 24); // dias
    }
    
    getTimeDisplayFormats(timeSpanDays) {
        if (timeSpanDays >= 90) {
            return {
                day: 'MMM',
                week: 'MMM',
                month: 'MMM yyyy'
            };
        } else if (timeSpanDays >= 30) {
            return {
                day: 'dd/MM',
                week: 'dd/MM',
                month: 'MM/yyyy'
            };
        } else {
            return {
                hour: 'dd/MM HH:mm',
                day: 'dd/MM HH:mm'
            };
        }
    }
    
    async loadViolations() {
        try {
            const violationsUrl = this.buildApiUrl('/api/violations', { limit: '20' });
            console.log('Carregando violações:', violationsUrl);
            
            const response = await fetch(violationsUrl);
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
        const periodText = this.getCurrentPeriodText();
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center py-4 text-success">
                    <i class="fas fa-check-circle me-2"></i>
                    Nenhuma violação encontrada no período: <strong>${periodText}</strong>
                </td>
            </tr>
        `;
    }
    
    getCurrentPeriodText() {
        if (this.currentPeriod === 'custom' && this.customStartDate && this.customEndDate) {
            const startDate = new Date(this.customStartDate);
            const endDate = new Date(this.customEndDate);
            const startFormatted = startDate.toLocaleDateString('pt-BR');
            const endFormatted = endDate.toLocaleDateString('pt-BR');
            return `${startFormatted} até ${endFormatted}`;
        } else if (this.currentPeriod === 1) {
            return 'último dia';
        } else if (this.currentPeriod === 30) {
            return 'últimos 30 dias';
        } else if (this.currentPeriod === 60) {
            return 'últimos 60 dias';
        } else if (this.currentPeriod === 90) {
            return 'últimos 90 dias';
        } else {
            return 'período selecionado';
        }
    }
    
    showViolationsError() {
        const tableBody = document.getElementById('violations-table');
        const periodText = this.getCurrentPeriodText();
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center py-4 text-danger">
                    <i class="fas fa-exclamation-circle me-2"></i>
                    Erro ao carregar violações para o período: <strong>${periodText}</strong>. Tente novamente.
                </td>
            </tr>
        `;
    }
    
    async refreshData() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        
        try {
            // Mostrar skeletons enquanto carrega
            this.showSkeletons();
            
            await this.loadData();
            this.updateKPIs();
            this.createCharts(); // Gráficos são recriados aqui
            await this.loadViolations();
            this.updateLastUpdatedTime();
            
            // Esconder skeletons
            this.hideSkeletons();
            
            const periodText = this.getCurrentPeriodText();
            console.log(`Dados atualizados para período: ${periodText}`);
        } catch (error) {
            console.error('Erro ao atualizar dados:', error);
            this.showErrorToast('Erro ao atualizar dados');
        } finally {
            this.isLoading = false;
        }
    }
    
    showSkeletons() {
        const skeletons = ['temp', 'humidity', 'violations', 'measurements'];
        skeletons.forEach(id => {
            const skeleton = document.getElementById(`${id}-skeleton`);
            const content = document.getElementById(`${id}-content`);
            if (skeleton && content) {
                skeleton.style.display = 'block';
                content.style.display = 'none';
            }
        });
    }
    
    hideSkeletons() {
        const skeletons = ['temp', 'humidity', 'violations', 'measurements'];
        skeletons.forEach(id => {
            const skeleton = document.getElementById(`${id}-skeleton`);
            const content = document.getElementById(`${id}-content`);
            if (skeleton && content) {
                skeleton.style.display = 'none';
                content.style.display = 'block';
                content.classList.add('fade-in');
            }
        });
    }
    
    addAnimations() {
        const cards = document.querySelectorAll('.kpi-card, .card');
        cards.forEach((card, index) => {
            card.classList.add('fade-in-up');
            card.style.animationDelay = `${index * 0.1}s`;
        });
    }
    
    updateLastUpdatedTime() {
        this.lastUpdated = new Date();
        const timeString = this.timeFormatter.format(this.lastUpdated);
        const dateString = this.dateFormatter.format(this.lastUpdated);
        
        document.getElementById('last-updated').innerHTML = `
            <i class="fas fa-clock me-1"></i>
            Atualizado às ${timeString} (${dateString})
        `;
    }
    
    startAutoRefresh() {
        // Auto-refresh a cada 1 minuto
        this.autoRefreshInterval = setInterval(() => {
            if (this.autoRefreshEnabled && !this.isLoading) {
                console.log('Auto-refresh ativado');
                this.refreshData();
            }
        }, 60000); // 1 minuto
    }
    
    stopAutoRefresh() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
        }
    }
    
    showLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.remove('hidden');
        }
    }
    
    hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.add('hidden');
        }
    }
    
    showErrorToast(message) {
        const toast = document.getElementById('error-toast');
        const messageEl = document.getElementById('error-message');
        
        if (toast && messageEl) {
            messageEl.textContent = message;
            const bsToast = new bootstrap.Toast(toast);
            bsToast.show();
        }
    }
    
    showSuccessToast(message) {
        const toast = document.getElementById('success-toast');
        const messageEl = document.getElementById('success-message');
        
        if (toast && messageEl) {
            messageEl.textContent = message;
            const bsToast = new bootstrap.Toast(toast);
            bsToast.show();
        }
    }
}

// Inicializar dashboard quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    const dashboard = new EnvironmentalDashboard();
    
    // Expor métodos para o HTML
    window.dashboard = {
        applyCustomPeriod: () => dashboard.applyCustomPeriod()
    };
    
    console.log('Dashboard dinâmico inicializado com sucesso!');
});

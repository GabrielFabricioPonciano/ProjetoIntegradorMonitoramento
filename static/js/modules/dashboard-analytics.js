/**
 * Dashboard Analytics Module
 * Handles advanced analytics display: trends, patterns, correlations, and statistics
 */

export const AnalyticsModule = {
    // Configuration
    config: {
        refreshInterval: 300000, // 5 minutes
        apiEndpoints: {
            trends: '/api/analytics/trends/',
            patterns: '/api/analytics/patterns/',
            correlations: '/api/analytics/correlations/',
            statistics: '/api/analytics/statistics/'
        }
    },

    // Chart instances
    charts: {
        trends: null,
        hourlyPatterns: null,
        dailyPatterns: null
    },

    // State
    state: {
        initialized: false,
        refreshTimer: null,
        activeTab: 'trends'
    },

    /**
     * Initialize the analytics module
     */
    init() {
        console.log('🔬 Initializing Analytics Module...');

        this.setupEventListeners();
        this.loadTrendsData(); // Load first tab on init

        this.state.initialized = true;
        console.log('✅ Analytics Module initialized');
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Refresh button
        const refreshBtn = document.getElementById('refresh-analytics-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshCurrentTab());
        }

        // Tab change listeners
        const tabs = document.querySelectorAll('#analytics-tabs button[data-bs-toggle="tab"]');
        tabs.forEach(tab => {
            tab.addEventListener('shown.bs.tab', (e) => {
                const targetId = e.target.getAttribute('data-bs-target');
                this.handleTabChange(targetId);
            });
        });
    },

    /**
     * Handle tab change
     */
    handleTabChange(targetId) {
        const tabMap = {
            '#trends-panel': 'trends',
            '#patterns-panel': 'patterns',
            '#correlations-panel': 'correlations',
            '#statistics-panel': 'statistics'
        };

        const tabName = tabMap[targetId];
        if (tabName) {
            this.state.activeTab = tabName;
            this.loadTabData(tabName);
        }
    },

    /**
     * Load data for specific tab
     */
    loadTabData(tabName) {
        const loadFunctions = {
            'trends': () => this.loadTrendsData(),
            'patterns': () => this.loadPatternsData(),
            'correlations': () => this.loadCorrelationsData(),
            'statistics': () => this.loadStatisticsData()
        };

        const loadFn = loadFunctions[tabName];
        if (loadFn) {
            loadFn();
        }
    },

    /**
     * Refresh current active tab
     */
    refreshCurrentTab() {
        this.loadTabData(this.state.activeTab);
    },

    /**
     * Load trends data (ML predictions)
     */
    async loadTrendsData() {
        const container = document.getElementById('trends-content');
        if (!container) return;

        try {
            container.innerHTML = this.getLoadingHTML('Analisando tendências com Machine Learning...');

            const response = await fetch(this.config.apiEndpoints.trends);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            this.renderTrends(data);

        } catch (error) {
            console.error('Error loading trends:', error);
            container.innerHTML = this.getErrorHTML('Erro ao carregar tendências');
        }
    },

    /**
     * Render trends chart
     */
    renderTrends(data) {
        const container = document.getElementById('trends-content');

        container.innerHTML = `
            <div class="row mb-3">
                <div class="col-md-6">
                    <div class="alert alert-info">
                        <strong>R² Score Temperatura:</strong> ${data.temperature.r2_score.toFixed(4)}
                        <small class="d-block">Qualidade da predição: ${this.getR2Quality(data.temperature.r2_score)}</small>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="alert alert-info">
                        <strong>R² Score Umidade:</strong> ${data.humidity.r2_score.toFixed(4)}
                        <small class="d-block">Qualidade da predição: ${this.getR2Quality(data.humidity.r2_score)}</small>
                    </div>
                </div>
            </div>
            <div class="row">
                <div class="col-12">
                    <canvas id="trends-chart" style="max-height: 400px;"></canvas>
                </div>
            </div>
        `;

        // Prepare data for chart
        const dates = data.temperature.predictions.map(p => new Date(p.date).toLocaleDateString('pt-BR'));
        const tempPredictions = data.temperature.predictions.map(p => p.value);
        const humidityPredictions = data.humidity.predictions.map(p => p.value);

        // Create chart
        const ctx = document.getElementById('trends-chart');
        if (this.charts.trends) {
            this.charts.trends.destroy();
        }

        this.charts.trends = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [
                    {
                        label: 'Temperatura Prevista (°C)',
                        data: tempPredictions,
                        borderColor: 'rgb(255, 99, 132)',
                        backgroundColor: 'rgba(255, 99, 132, 0.1)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Umidade Prevista (%)',
                        data: humidityPredictions,
                        borderColor: 'rgb(54, 162, 235)',
                        backgroundColor: 'rgba(54, 162, 235, 0.1)',
                        tension: 0.4,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Predição de 7 Dias (Machine Learning)',
                        font: { size: 16, weight: 'bold' }
                    },
                    legend: {
                        display: true,
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        title: {
                            display: true,
                            text: 'Valor'
                        }
                    }
                }
            }
        });
    },

    /**
     * Get R² quality description
     */
    getR2Quality(r2) {
        if (r2 >= 0.9) return '🌟 Excelente';
        if (r2 >= 0.7) return '✅ Bom';
        if (r2 >= 0.5) return '⚠️ Moderado';
        return '❌ Fraco';
    },

    /**
     * Load patterns data
     */
    async loadPatternsData() {
        const container = document.getElementById('patterns-content');
        if (!container) return;

        try {
            container.innerHTML = this.getLoadingHTML('Analisando padrões sazonais...');

            const response = await fetch(this.config.apiEndpoints.patterns);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            this.renderPatterns(data);

        } catch (error) {
            console.error('Error loading patterns:', error);
            container.innerHTML = this.getErrorHTML('Erro ao carregar padrões');
        }
    },

    /**
     * Render patterns charts
     */
    renderPatterns(data) {
        const container = document.getElementById('patterns-content');

        container.innerHTML = `
            <div class="row">
                <div class="col-md-6 mb-3">
                    <h5 class="mb-3">Padrão por Hora do Dia</h5>
                    <canvas id="hourly-patterns-chart"></canvas>
                </div>
                <div class="col-md-6 mb-3">
                    <h5 class="mb-3">Padrão por Dia da Semana</h5>
                    <canvas id="daily-patterns-chart"></canvas>
                </div>
            </div>
        `;

        // Hourly patterns
        const hourlyLabels = data.hourly_patterns.map(p => `${p.hour}h`);
        const hourlyTemp = data.hourly_patterns.map(p => p.temperature.average);
        const hourlyHumidity = data.hourly_patterns.map(p => p.humidity.average);

        const ctxHourly = document.getElementById('hourly-patterns-chart');
        if (this.charts.hourlyPatterns) {
            this.charts.hourlyPatterns.destroy();
        }

        this.charts.hourlyPatterns = new Chart(ctxHourly, {
            type: 'bar',
            data: {
                labels: hourlyLabels,
                datasets: [
                    {
                        label: 'Temperatura Média (°C)',
                        data: hourlyTemp,
                        backgroundColor: 'rgba(255, 99, 132, 0.7)',
                        borderColor: 'rgb(255, 99, 132)',
                        borderWidth: 1
                    },
                    {
                        label: 'Umidade Média (%)',
                        data: hourlyHumidity,
                        backgroundColor: 'rgba(54, 162, 235, 0.7)',
                        borderColor: 'rgb(54, 162, 235)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: true, position: 'top' }
                },
                scales: {
                    y: { beginAtZero: false }
                }
            }
        });

        // Daily patterns
        const daysMap = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const dailyLabels = data.daily_patterns.map(p => daysMap[p.day_of_week]);
        const dailyTemp = data.daily_patterns.map(p => p.temperature_avg);
        const dailyHumidity = data.daily_patterns.map(p => p.humidity_avg);

        const ctxDaily = document.getElementById('daily-patterns-chart');
        if (this.charts.dailyPatterns) {
            this.charts.dailyPatterns.destroy();
        }

        this.charts.dailyPatterns = new Chart(ctxDaily, {
            type: 'line',
            data: {
                labels: dailyLabels,
                datasets: [
                    {
                        label: 'Temperatura Média (°C)',
                        data: dailyTemp,
                        borderColor: 'rgb(255, 99, 132)',
                        backgroundColor: 'rgba(255, 99, 132, 0.1)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Umidade Média (%)',
                        data: dailyHumidity,
                        borderColor: 'rgb(54, 162, 235)',
                        backgroundColor: 'rgba(54, 162, 235, 0.1)',
                        tension: 0.4,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: true, position: 'top' }
                },
                scales: {
                    y: { beginAtZero: false }
                }
            }
        });
    },

    /**
     * Load correlations data
     */
    async loadCorrelationsData() {
        const container = document.getElementById('correlations-content');
        if (!container) return;

        try {
            container.innerHTML = this.getLoadingHTML('Calculando correlações...');

            const response = await fetch(this.config.apiEndpoints.correlations);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            this.renderCorrelations(data);

        } catch (error) {
            console.error('Error loading correlations:', error);
            container.innerHTML = this.getErrorHTML('Erro ao carregar correlações');
        }
    },

    /**
     * Render correlations
     */
    renderCorrelations(data) {
        const container = document.getElementById('correlations-content');

        const pearson = data.pearson_correlation;
        const spearman = data.spearman_correlation;

        container.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <div class="card bg-light">
                        <div class="card-body">
                            <h5 class="card-title">Correlação de Pearson</h5>
                            <div class="text-center my-4">
                                <div style="font-size: 3rem; font-weight: bold; color: ${this.getCorrelationColor(pearson.coefficient)};">
                                    ${pearson.coefficient.toFixed(4)}
                                </div>
                                <div class="mt-2">
                                    ${this.getCorrelationBadge(pearson.coefficient)}
                                </div>
                            </div>
                            <div class="alert alert-info">
                                <strong>P-valor:</strong> ${pearson.p_value.toExponential(4)}
                                <br>
                                <strong>Significância:</strong> ${pearson.significance === 'significant' ? '✅ Significativo' : '❌ Não significativo'}
                                <br>
                                <small>Mede relação linear entre temperatura e umidade</small>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card bg-light">
                        <div class="card-body">
                            <h5 class="card-title">Correlação de Spearman</h5>
                            <div class="text-center my-4">
                                <div style="font-size: 3rem; font-weight: bold; color: ${this.getCorrelationColor(spearman.coefficient)};">
                                    ${spearman.coefficient.toFixed(4)}
                                </div>
                                <div class="mt-2">
                                    ${this.getCorrelationBadge(spearman.coefficient)}
                                </div>
                            </div>
                            <div class="alert alert-info">
                                <strong>P-valor:</strong> ${spearman.p_value.toExponential(4)}
                                <br>
                                <strong>Significância:</strong> ${spearman.significance === 'significant' ? '✅ Significativo' : '❌ Não significativo'}
                                <br>
                                <small>Mede relação monotônica (ordem) entre variáveis</small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="row mt-3">
                <div class="col-12">
                    <div class="alert alert-secondary">
                        <h6>📊 Interpretação:</h6>
                        <p class="mb-1">${this.getCorrelationInterpretation(pearson.coefficient, spearman.coefficient)}</p>
                        <small class="text-muted">
                            Valores próximos a +1 indicam forte correlação positiva, próximos a -1 indicam forte correlação negativa, 
                            e próximos a 0 indicam ausência de correlação.
                        </small>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Get correlation color
     */
    getCorrelationColor(value) {
        const abs = Math.abs(value);
        if (abs >= 0.7) return '#28a745'; // Green
        if (abs >= 0.4) return '#ffc107'; // Yellow
        return '#dc3545'; // Red
    },

    /**
     * Get correlation badge
     */
    getCorrelationBadge(value) {
        const abs = Math.abs(value);
        if (abs >= 0.7) return '<span class="badge bg-success">Forte</span>';
        if (abs >= 0.4) return '<span class="badge bg-warning">Moderada</span>';
        return '<span class="badge bg-danger">Fraca</span>';
    },

    /**
     * Get correlation interpretation
     */
    getCorrelationInterpretation(pearson, spearman) {
        const avgCorr = (Math.abs(pearson) + Math.abs(spearman)) / 2;

        if (avgCorr >= 0.7) {
            return '🔥 Existe uma forte relação entre temperatura e umidade. Mudanças em uma variável estão fortemente associadas a mudanças na outra.';
        } else if (avgCorr >= 0.4) {
            return '⚖️ Existe uma relação moderada entre temperatura e umidade. As variáveis têm alguma associação, mas outros fatores também influenciam.';
        } else {
            return '🔍 A relação entre temperatura e umidade é fraca. As variáveis aparentam ter pouca dependência entre si neste dataset.';
        }
    },

    /**
     * Load statistics data
     */
    async loadStatisticsData() {
        const container = document.getElementById('statistics-content');
        if (!container) return;

        try {
            container.innerHTML = this.getLoadingHTML('Calculando estatísticas avançadas...');

            const response = await fetch(this.config.apiEndpoints.statistics);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            this.renderStatistics(data);

        } catch (error) {
            console.error('Error loading statistics:', error);
            container.innerHTML = this.getErrorHTML('Erro ao carregar estatísticas');
        }
    },

    /**
     * Render statistics
     */
    renderStatistics(data) {
        const container = document.getElementById('statistics-content');

        const temp = data.temperature;
        const humidity = data.humidity;

        container.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <h5 class="mb-3"><i class="fas fa-thermometer-half me-2"></i>Temperatura</h5>
                    <div class="row g-3">
                        ${this.createStatCard('Média', temp.mean.toFixed(2) + ' °C', 'primary')}
                        ${this.createStatCard('Mediana', temp.median.toFixed(2) + ' °C', 'info')}
                        ${this.createStatCard('Desvio Padrão', temp.std_dev.toFixed(2) + ' °C', 'secondary')}
                        ${this.createStatCard('Variância', temp.variance.toFixed(2), 'secondary')}
                        ${this.createStatCard('Q1 (25%)', temp.quartiles.q1.toFixed(2) + ' °C', 'dark')}
                        ${this.createStatCard('Q2 (50%)', temp.quartiles.q2.toFixed(2) + ' °C', 'dark')}
                        ${this.createStatCard('Q3 (75%)', temp.quartiles.q3.toFixed(2) + ' °C', 'dark')}
                        ${this.createStatCard('Assimetria', temp.skewness.toFixed(4), 'warning')}
                        ${this.createStatCard('Curtose', temp.kurtosis.toFixed(4), 'warning')}
                    </div>
                </div>
                <div class="col-md-6">
                    <h5 class="mb-3"><i class="fas fa-droplet me-2"></i>Umidade</h5>
                    <div class="row g-3">
                        ${this.createStatCard('Média', humidity.mean.toFixed(2) + ' %', 'primary')}
                        ${this.createStatCard('Mediana', humidity.median.toFixed(2) + ' %', 'info')}
                        ${this.createStatCard('Desvio Padrão', humidity.std_dev.toFixed(2) + ' %', 'secondary')}
                        ${this.createStatCard('Variância', humidity.variance.toFixed(2), 'secondary')}
                        ${this.createStatCard('Q1 (25%)', humidity.quartiles.q1.toFixed(2) + ' %', 'dark')}
                        ${this.createStatCard('Q2 (50%)', humidity.quartiles.q2.toFixed(2) + ' %', 'dark')}
                        ${this.createStatCard('Q3 (75%)', humidity.quartiles.q3.toFixed(2) + ' %', 'dark')}
                        ${this.createStatCard('Assimetria', humidity.skewness.toFixed(4), 'warning')}
                        ${this.createStatCard('Curtose', humidity.kurtosis.toFixed(4), 'warning')}
                    </div>
                </div>
            </div>
            <div class="row mt-4">
                <div class="col-12">
                    <div class="alert alert-info">
                        <h6>📘 Glossário Estatístico:</h6>
                        <ul class="mb-0" style="font-size: 0.9rem;">
                            <li><strong>Média:</strong> Valor médio de todas as medições</li>
                            <li><strong>Mediana:</strong> Valor central quando ordenado</li>
                            <li><strong>Desvio Padrão:</strong> Medida de dispersão dos dados</li>
                            <li><strong>Variância:</strong> Quadrado do desvio padrão</li>
                            <li><strong>Q1, Q2, Q3:</strong> Quartis (25%, 50%, 75%)</li>
                            <li><strong>Assimetria:</strong> Medida de simetria da distribuição (0 = simétrica)</li>
                            <li><strong>Curtose:</strong> Medida de "achatamento" da distribuição (0 = normal)</li>
                        </ul>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Create statistic card HTML
     */
    createStatCard(label, value, color) {
        return `
            <div class="col-6 col-lg-4">
                <div class="card border-${color}">
                    <div class="card-body p-2 text-center">
                        <div class="text-muted small">${label}</div>
                        <div class="fw-bold text-${color}">${value}</div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Get loading HTML
     */
    getLoadingHTML(message) {
        return `
            <div class="text-center py-4">
                <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
                    <span class="visually-hidden">Carregando...</span>
                </div>
                <p class="text-muted mt-3">${message}</p>
            </div>
        `;
    },

    /**
     * Get error HTML
     */
    getErrorHTML(message) {
        return `
            <div class="alert alert-danger" role="alert">
                <i class="fas fa-exclamation-triangle me-2"></i>
                <strong>Erro!</strong> ${message}
            </div>
        `;
    },

    /**
     * Cleanup method
     */
    destroy() {
        if (this.state.refreshTimer) {
            clearInterval(this.state.refreshTimer);
        }

        // Destroy all charts
        Object.keys(this.charts).forEach(key => {
            if (this.charts[key]) {
                this.charts[key].destroy();
                this.charts[key] = null;
            }
        });

        this.state.initialized = false;
    }
};

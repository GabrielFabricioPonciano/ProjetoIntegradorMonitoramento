// Dashboard JavaScript - Versão Limpa e Otimizada
class EnvironmentalDashboard {
    constructor() {
        this.charts = {};
        this.data = {};
        this.violations = null;
        this.isLoading = false;
        this.currentPeriod = 30;
        this.lastUpdated = null;
        this.autoRefreshEnabled = true;
        this.autoRefreshInterval = null;

        this.numberFormatter = new Intl.NumberFormat('pt-BR', {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1
        });

        this.init();
    }

    async init() {
        console.log('Inicializando dashboard...');
        this.setupEventListeners();
        this.showLoading();

        // Aguardar um pouco para garantir que Chart.js está completamente carregado
        await new Promise(resolve => setTimeout(resolve, 100));

        try {
            // Carregar dados
            await this.loadData();
            console.log('Dados carregados');

            // Carregar violações primeiro
            await this.loadViolations();
            console.log('Violações carregadas');

            // Atualizar KPIs com dados completos
            this.updateKPIs();
            console.log('KPIs atualizados');

            // Aguardar mais tempo antes de criar gráficos
            await new Promise(resolve => setTimeout(resolve, 500));

            // Mostrar containers primeiro (antes de criar gráficos)
            this.prepareChartContainers();

            // Criar gráficos com delay adicional
            await new Promise(resolve => setTimeout(resolve, 200));
            this.createCharts();
            console.log('Gráficos criados');

            this.updateLastUpdatedTime();
            this.startAutoRefresh();
            console.log('Dashboard inicializado com sucesso!');

            // Carregar IA por último
            await this.loadAI();
            console.log('IA carregada');
        } catch (error) {
            console.error('Erro ao inicializar dashboard:', error);
            this.showErrorToast('Erro ao carregar dados do dashboard');
        } finally {
            this.hideLoading();
        }
    }

    prepareChartContainers() {
        console.log('Preparando containers dos gráficos...');
        const tempContainer = document.getElementById('temp-chart-container');
        const rhContainer = document.getElementById('rh-chart-container');
        const tempPlaceholder = document.getElementById('temp-chart-placeholder');
        const rhPlaceholder = document.getElementById('rh-chart-placeholder');

        if (tempContainer) {
            tempContainer.style.display = 'block';
            tempContainer.style.height = '400px';
            tempContainer.style.minHeight = '400px';
            console.log('Container temperatura preparado');
        }
        if (rhContainer) {
            rhContainer.style.display = 'block';
            rhContainer.style.height = '400px';
            rhContainer.style.minHeight = '400px';
            console.log('Container umidade preparado');
        }
        if (tempPlaceholder) {
            tempPlaceholder.style.display = 'none';
        }
        if (rhPlaceholder) {
            rhPlaceholder.style.display = 'none';
        }

        // Forçar reflow para garantir que as dimensões são aplicadas
        if (tempContainer) tempContainer.offsetHeight;
        if (rhContainer) rhContainer.offsetHeight;
    } setupEventListeners() {
        console.log('Configurando event listeners...');

        // Seletor de período
        const periodRadios = document.querySelectorAll('input[name="period"]');
        periodRadios.forEach(radio => {
            radio.addEventListener('change', async (e) => {
                this.currentPeriod = parseInt(e.target.value);
                await this.refreshData();
            });
        });

        // Event listener para o botão de forçar ciclo
        const forceCycleBtn = document.getElementById('force-cycle-btn');
        if (forceCycleBtn) {
            forceCycleBtn.addEventListener('click', () => this.forceCycle());
        }
    }

    async loadData() {
        console.log('Carregando dados...');
        const summaryUrl = `/api/summary?days=${this.currentPeriod}`;
        const seriesUrl = `/api/series?days=${this.currentPeriod}&max_points=1000`;

        console.log('URLs:', { summaryUrl, seriesUrl });

        try {
            const [summaryResponse, seriesResponse] = await Promise.all([
                fetch(summaryUrl),
                fetch(seriesUrl)
            ]);

            if (!summaryResponse.ok) throw new Error(`Erro ao carregar resumo: ${summaryResponse.status}`);
            if (!seriesResponse.ok) throw new Error(`Erro ao carregar série: ${seriesResponse.status}`);

            const summary = await summaryResponse.json();
            const series = await seriesResponse.json();

            this.data = { summary, series };
            console.log('Dados carregados:', { summary, seriesCount: series.length });
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            throw error;
        }
    }

    async loadViolations() {
        console.log('Carregando violações...');
        const violationsUrl = `/api/violations?days=${this.currentPeriod}&limit=10`;
        console.log('URL violações:', violationsUrl);

        try {
            const response = await fetch(violationsUrl);
            if (!response.ok) throw new Error(`Erro ao carregar violações: ${response.status}`);

            const violations = await response.json();
            console.log('Violações carregadas:', violations.length, 'registros');

            // Armazenar violações na instância
            this.violations = violations;
            console.log('Violações armazenadas na instância:', this.violations?.length || 0);

            this.updateViolationsTable(violations);

        } catch (error) {
            console.error('Erro ao carregar violações:', error);
            // Em caso de erro, mostrar tabela vazia
            this.violations = [];
            this.updateViolationsTable([]);
        }
    }

    async loadAI() {
        console.log('Carregando IA...');
        try {
            const insightsUrl = `/api/ai/insights?days=${this.currentPeriod}`;
            const anomaliesUrl = `/api/ai/anomalies?days=${this.currentPeriod}`;
            const predictionsUrl = `/api/ai/predictions?hours=12`;
            const patternsUrl = `/api/ai/patterns?days=${this.currentPeriod}`;

            const [insightsRes, anomaliesRes, predictionsRes, patternsRes] = await Promise.all([
                fetch(insightsUrl),
                fetch(anomaliesUrl),
                fetch(predictionsUrl),
                fetch(patternsUrl)
            ]);

            const insights = insightsRes.ok ? await insightsRes.json() : { error: 'Falha ao carregar' };
            const anomalies = anomaliesRes.ok ? await anomaliesRes.json() : { error: 'Falha ao carregar' };
            const predictions = predictionsRes.ok ? await predictionsRes.json() : { error: 'Falha ao carregar' };
            const patterns = patternsRes.ok ? await patternsRes.json() : { error: 'Falha ao carregar' };

            this.updateAISection(insights, anomalies, predictions, patterns);
        } catch (error) {
            console.error('Erro ao carregar IA:', error);
            this.updateAISection({ error: 'Erro ao carregar' }, { error: 'Erro ao carregar' }, { error: 'Erro ao carregar' }, { error: 'Erro ao carregar' });
        }
    }

    updateAISection(insights, anomalies, predictions, patterns) {
        // Esconder skeleton
        const skeleton = document.getElementById('ai-skeleton');
        if (skeleton) skeleton.style.display = 'none';

        // Mostrar conteúdo
        const content = document.getElementById('ai-content');
        if (content) content.style.display = 'block';

        // Atualizar badge de status
        const badge = document.getElementById('ai-status-badge');
        if (badge) {
            badge.className = 'badge bg-success ms-2';
            badge.innerHTML = '<i class="fas fa-check me-1"></i>Pronto';
        }

        // Atualizar anomalias
        const anomaliesEl = document.getElementById('ai-anomalies-content');
        if (anomaliesEl) {
            if (anomalies.error) {
                anomaliesEl.innerHTML = '<p class="text-muted mb-0">Erro ao carregar anomalias</p>';
            } else if (anomalies.anomalies && anomalies.anomalies.length > 0) {
                anomaliesEl.innerHTML = `<p class="mb-1">${anomalies.anomalies.length} anomalias detectadas</p><small class="text-muted">Taxa: ${anomalies.anomaly_rate?.toFixed(1) || 0}%</small>`;
            } else {
                anomaliesEl.innerHTML = '<p class="text-muted mb-0">Nenhuma anomalia detectada</p>';
            }
        }

        // Atualizar previsões
        const predictionsEl = document.getElementById('ai-predictions-content');
        if (predictionsEl) {
            if (predictions.error) {
                predictionsEl.innerHTML = '<p class="text-muted mb-0">Erro ao carregar previsões</p>';
            } else if (predictions.predictions && predictions.predictions.length > 0) {
                const next = predictions.predictions[0];
                predictionsEl.innerHTML = `<p class="mb-1">Próxima: ${next.predicted_temperature?.toFixed(1) || 'N/A'}°C, ${next.predicted_humidity?.toFixed(1) || 'N/A'}%</p><small class="text-muted">Risco violação: ${next.violation_probability?.toFixed(1) || 0}%</small>`;
            } else {
                predictionsEl.innerHTML = '<p class="text-muted mb-0">Previsões indisponíveis</p>';
            }
        }

        // Atualizar padrões
        const patternsEl = document.getElementById('ai-patterns-content');
        if (patternsEl) {
            if (patterns.error) {
                patternsEl.innerHTML = '<p class="text-muted mb-0">Erro ao carregar padrões</p>';
            } else {
                patternsEl.innerHTML = `<p class="mb-1">Taxa violação: ${patterns.violation_rate?.toFixed(1) || 0}%</p><small class="text-muted">${patterns.total_measurements || 0} medições analisadas</small>`;
            }
        }
    }

    updateViolationsTable(violations) {
        console.log('Atualizando tabela de violações...');
        const tbody = document.getElementById('violations-table');
        if (!tbody) {
            console.error('Tabela de violações não encontrada');
            return;
        }

        if (!violations || violations.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center text-muted py-4">
                        <i class="fas fa-check-circle text-success me-2"></i>
                        Nenhuma violação encontrada no período
                    </td>
                </tr>
            `;
            return;
        }

        console.log('Processando violações:', violations);

        const rows = violations.map((violation, index) => {
            // Verificar se os dados existem - aceitar diferentes formatos
            if (!violation) {
                console.warn(`Violação ${index} é nula:`, violation);
                return '';
            }

            // Tentar diferentes campos de temperatura e umidade
            const temperature = violation.temperature || 0;
            const humidity = violation.humidity || violation.relative_humidity || violation.rh || 0;

            if (temperature === 0 && humidity === 0) {
                console.warn(`Violação ${index} não tem dados de temperatura/umidade:`, violation);
                // Ainda assim, vamos mostrar o que temos
            }

            const date = new Date(violation.timestamp);
            const formattedDate = date.toLocaleDateString('pt-BR') + ' ' +
                date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

            const tempValue = parseFloat(temperature) || 0;
            const humidityValue = parseFloat(humidity) || 0;

            const tempViolation = tempValue < 17 || tempValue > 19.5;
            const rhViolation = humidityValue > 62;
            const hasViolation = tempViolation || rhViolation || violation.reason; // Se tem reason, é uma violação

            const tempColor = tempViolation ? 'text-danger' : 'text-success';
            const rhColor = rhViolation ? 'text-danger' : 'text-success';

            // Se tem reason, mostrar isso
            let violationReason = '';
            if (violation.reason) {
                violationReason = violation.reason;
            } else if (hasViolation) {
                violationReason = tempViolation ? 'Temperatura fora do range' : 'Umidade acima do limite';
            } else {
                violationReason = 'Normal';
            }

            return `
                <tr>
                    <td class="fw-semibold">${formattedDate}</td>
                    <td class="${tempColor}">
                        ${tempValue.toFixed(1)}°C
                        ${tempViolation ?
                    '<i class="fas fa-exclamation-triangle ms-1"></i>' :
                    '<i class="fas fa-check ms-1"></i>'}
                    </td>
                    <td class="${rhColor}">
                        ${humidityValue.toFixed(1)}%
                        ${rhViolation ?
                    '<i class="fas fa-exclamation-triangle ms-1"></i>' :
                    '<i class="fas fa-check ms-1"></i>'}
                    </td>
                    <td>
                        <span class="badge ${hasViolation ? 'bg-danger' : 'bg-success'}" title="${violationReason}">
                            ${hasViolation ? 'Violação' : 'Normal'}
                        </span>
                    </td>
                </tr>
            `;
        }).filter(row => row !== '').join('');

        tbody.innerHTML = rows || `
            <tr>
                <td colspan="4" class="text-center text-muted py-4">
                    <i class="fas fa-exclamation-triangle text-warning me-2"></i>
                    Dados de violações incompletos
                </td>
            </tr>
        `;

        console.log('Tabela de violações atualizada com', violations.length, 'registros');
    }

    updateKPIs() {
        console.log('Atualizando KPIs...');
        console.log('Dados recebidos:', this.data);

        const { summary } = this.data;

        if (!summary) {
            console.error('Dados de resumo não encontrados:', this.data);
            this.calculateKPIsFromSeries();
            return;
        }

        console.log('Summary data:', summary);

        if (!summary.temperature_stats || !summary.humidity_stats) {
            console.warn('Stats não encontrados no summary, calculando a partir da série');
            this.calculateKPIsFromSeries();
            return;
        }

        // Verificar elementos no DOM
        const elements = {
            'temp-mean': document.getElementById('temp-mean'),
            'temp-range': document.getElementById('temp-range'),
            'rh-mean': document.getElementById('rh-mean'),
            'rh-range': document.getElementById('rh-range'),
            'total-measurements': document.getElementById('total-measurements'),
            'violations-count': document.getElementById('violations-count'),
            'violations-pct': document.getElementById('violations-pct'),
            'violations-base': document.getElementById('violations-base')
        };

        console.log('Elementos DOM encontrados:', Object.keys(elements).reduce((acc, key) => {
            acc[key] = !!elements[key];
            return acc;
        }, {}));

        // Temperatura
        const tempMean = summary.temperature_stats.mean;
        const tempMin = summary.temperature_stats.min;
        const tempMax = summary.temperature_stats.max;

        if (tempMean !== null && tempMean !== undefined) {
            const meanEl = document.getElementById('temp-mean');
            const rangeEl = document.getElementById('temp-range');

            if (meanEl) meanEl.textContent = tempMean.toFixed(1) + '°C';
            if (rangeEl) rangeEl.textContent = `${tempMin?.toFixed(1) || 'N/A'}°C - ${tempMax?.toFixed(1) || 'N/A'}°C`;
        }

        // Umidade
        const humidityMean = summary.humidity_stats.mean;
        const humidityMin = summary.humidity_stats.min;
        const humidityMax = summary.humidity_stats.max;

        console.log('Dados de umidade:', { humidityMean, humidityMin, humidityMax });

        if (humidityMean !== null && humidityMean !== undefined) {
            const meanEl = document.getElementById('rh-mean');
            const rangeEl = document.getElementById('rh-range');

            console.log('Elementos de umidade encontrados:', {
                'rh-mean': !!meanEl,
                'rh-range': !!rangeEl
            });

            if (meanEl) {
                meanEl.textContent = humidityMean.toFixed(1) + '%';
                console.log('rh-mean atualizado para:', humidityMean.toFixed(1) + '%');
            }
            if (rangeEl) {
                rangeEl.textContent = `${humidityMin?.toFixed(1) || 'N/A'}% - ${humidityMax?.toFixed(1) || 'N/A'}%`;
                console.log('rh-range atualizado para:', `${humidityMin?.toFixed(1) || 'N/A'}% - ${humidityMax?.toFixed(1) || 'N/A'}%`);
            }
        } else {
            console.warn('Dados de umidade são nulos ou undefined');
        }

        // Total de medições
        const totalMeasurements = summary.total_measurements || this.data.series?.length || 0;
        const measurementsEl = document.getElementById('total-measurements');
        if (measurementsEl) {
            measurementsEl.textContent = totalMeasurements.toLocaleString('pt-BR');
        }

        // Violações
        console.log('Atualizando KPIs de violações. Violações disponíveis:', this.violations?.length || 0);
        const totalViolations = this.violations?.length || 0;
        const violationsEl = document.getElementById('violations-count');
        const violationsPctEl = document.getElementById('violations-pct');
        const violationsBaseEl = document.getElementById('violations-base');

        console.log('Elementos de violações encontrados:', {
            'violations-count': !!violationsEl,
            'violations-pct': !!violationsPctEl,
            'violations-base': !!violationsBaseEl
        });

        if (violationsEl) {
            violationsEl.textContent = totalViolations.toLocaleString('pt-BR');
            console.log('violations-count atualizado para:', totalViolations);
        }

        if (violationsPctEl && totalMeasurements > 0) {
            const percentage = ((totalViolations / totalMeasurements) * 100).toFixed(1);
            violationsPctEl.textContent = `${percentage}% do total`;
            console.log('violations-pct atualizado para:', `${percentage}% do total`);
        }

        if (violationsBaseEl) {
            violationsBaseEl.textContent = `Base: ${totalMeasurements.toLocaleString('pt-BR')} medições`;
            console.log('violations-base atualizado para:', `Base: ${totalMeasurements.toLocaleString('pt-BR')} medições`);
        }

        console.log('KPIs atualizados');
    }

    calculateKPIsFromSeries() {
        console.log('Calculando KPIs a partir da série...');

        if (!this.data.series || this.data.series.length === 0) {
            console.warn('Nenhum dado da série disponível para calcular KPIs');
            return;
        }

        const temps = [];
        const humidities = [];

        this.data.series.forEach(item => {
            const temp = parseFloat(item.temperature);
            if (!isNaN(temp)) temps.push(temp);

            const humidity = parseFloat(item.humidity || item.relative_humidity || item.rh);
            if (!isNaN(humidity)) humidities.push(humidity);
        });

        // Calcular estatísticas de temperatura
        if (temps.length > 0) {
            const tempMean = temps.reduce((a, b) => a + b, 0) / temps.length;
            const tempMin = Math.min(...temps);
            const tempMax = Math.max(...temps);

            const meanEl = document.getElementById('temp-mean');
            const rangeEl = document.getElementById('temp-range');

            if (meanEl) meanEl.textContent = tempMean.toFixed(1) + '°C';
            if (rangeEl) rangeEl.textContent = `${tempMin.toFixed(1)}°C - ${tempMax.toFixed(1)}°C`;
        }

        // Calcular estatísticas de umidade
        if (humidities.length > 0) {
            const humidityMean = humidities.reduce((a, b) => a + b, 0) / humidities.length;
            const humidityMin = Math.min(...humidities);
            const humidityMax = Math.max(...humidities);

            const meanEl = document.getElementById('rh-mean');
            const rangeEl = document.getElementById('rh-range');

            if (meanEl) meanEl.textContent = humidityMean.toFixed(1) + '%';
            if (rangeEl) rangeEl.textContent = `${humidityMin.toFixed(1)}% - ${humidityMax.toFixed(1)}%`;
        }

        // Total de medições
        const measurementsEl = document.getElementById('total-measurements');
        if (measurementsEl) {
            measurementsEl.textContent = this.data.series.length.toLocaleString('pt-BR');
        }

        // Violações
        const totalViolations = this.violations?.length || 0;
        const violationsEl = document.getElementById('violations-count');
        const violationsPctEl = document.getElementById('violations-pct');
        const violationsBaseEl = document.getElementById('violations-base');

        if (violationsEl) {
            violationsEl.textContent = totalViolations.toLocaleString('pt-BR');
        }

        if (violationsPctEl && this.data.series.length > 0) {
            const percentage = ((totalViolations / this.data.series.length) * 100).toFixed(1);
            violationsPctEl.textContent = `${percentage}% do total`;
        }

        if (violationsBaseEl) {
            violationsBaseEl.textContent = `Base: ${this.data.series.length.toLocaleString('pt-BR')} medições`;
        }

        console.log('KPIs calculados a partir da série');
    }

    createCharts() {
        console.log('Criando gráficos...');

        if (!this.data.series || !Array.isArray(this.data.series)) {
            console.error('Dados de série inválidos:', this.data.series);
            return;
        }

        console.log('Dados da série:', this.data.series.length, 'registros');

        // Aguardar um frame para garantir que o DOM está pronto
        requestAnimationFrame(() => {
            this.createTemperatureChart();

            // Aguardar mais tempo e forçar reflow antes de criar o segundo gráfico
            setTimeout(() => {
                // Forçar reflow novamente
                const rhContainer = document.getElementById('rh-chart-container');
                if (rhContainer) {
                    rhContainer.offsetHeight;
                    console.log('Forçando reflow do container umidade');
                }

                this.createHumidityChart();

                // Aguardar mais um tempo antes de mostrar containers
                setTimeout(() => {
                    this.showChartContainers();

                    // Forçar resize dos gráficos após criação
                    setTimeout(() => {
                        this.resizeCharts();
                    }, 200);
                }, 100);
            }, 500);
        });

        console.log('Processo de criação de gráficos iniciado');
    }

    resizeCharts() {
        console.log('Forçando resize dos gráficos...');
        if (this.charts.temperature) {
            this.charts.temperature.resize();
            console.log('Gráfico temperatura redimensionado');
        }
        if (this.charts.humidity) {
            this.charts.humidity.resize();
            console.log('Gráfico umidade redimensionado');
        }
    } showChartContainers() {
        const tempPlaceholder = document.getElementById('temp-chart-placeholder');
        const tempContainer = document.getElementById('temp-chart-container');
        const rhPlaceholder = document.getElementById('rh-chart-placeholder');
        const rhContainer = document.getElementById('rh-chart-container');

        console.log('Elementos encontrados:', {
            tempPlaceholder: !!tempPlaceholder,
            tempContainer: !!tempContainer,
            rhPlaceholder: !!rhPlaceholder,
            rhContainer: !!rhContainer
        });

        if (tempPlaceholder) {
            tempPlaceholder.style.display = 'none';
            console.log('Placeholder temperatura escondido');
        }
        if (tempContainer) {
            tempContainer.style.display = 'block';
            console.log('Container temperatura mostrado');
        }
        if (rhPlaceholder) {
            rhPlaceholder.style.display = 'none';
            console.log('Placeholder umidade escondido');
        }
        if (rhContainer) {
            rhContainer.style.display = 'block';
            console.log('Container umidade mostrado');
        }

        console.log('Gráficos finalizados');
    }

    createTemperatureChart() {
        console.log('Criando gráfico de temperatura...');
        const canvas = document.getElementById('tempChart');
        if (!canvas) {
            console.error('Canvas tempChart não encontrado');
            return;
        }

        console.log('Canvas tempChart encontrado');
        const ctx = canvas.getContext('2d');

        // Destruir gráfico anterior se existir
        if (this.charts.temperature) {
            console.log('Destruindo gráfico anterior de temperatura');
            this.charts.temperature.destroy();
        }

        // Preparar dados
        const labels = [];
        const data = [];

        console.log('Processando', this.data.series.length, 'registros de dados');

        this.data.series.forEach((item, index) => {
            const date = new Date(item.timestamp);
            const label = date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

            labels.push(label);
            data.push(item.temperature);

            if (index < 3) { // Log apenas os primeiros 3 para não poluir
                console.log(`Registro ${index}:`, {
                    timestamp: item.timestamp,
                    temperature: item.temperature,
                    label: label
                });
            }
        });

        console.log('Dados preparados:', {
            labels: labels.length,
            data: data.length,
            firstLabel: labels[0],
            firstData: data[0]
        });

        this.charts.temperature = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Temperatura (°C)',
                        data: data,
                        borderColor: '#dc3545',
                        backgroundColor: 'rgba(220, 53, 69, 0.1)',
                        borderWidth: 2,
                        fill: false,
                        tension: 0.1,
                        pointRadius: 2,
                        pointHoverRadius: 6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 1000
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Tempo'
                        },
                        ticks: {
                            maxTicksLimit: 10
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Temperatura (°C)'
                        },
                        min: 10,
                        max: 25
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    }
                }
            }
        });

        console.log('Gráfico de temperatura criado com sucesso!', this.charts.temperature);
    }

    createHumidityChart() {
        console.log('=== INICIANDO CRIAÇÃO DO GRÁFICO DE UMIDADE ===');
        const canvas = document.getElementById('rhChart');
        console.log('Canvas rhChart encontrado:', !!canvas);

        if (!canvas) {
            console.error('Canvas rhChart não encontrado');
            return;
        }

        // Forçar mostrar container antes de criar gráfico
        const rhContainer = document.getElementById('rh-chart-container');
        const rhPlaceholder = document.getElementById('rh-chart-placeholder');
        if (rhContainer) {
            rhContainer.style.display = 'block';
            console.log('Container umidade forçado a mostrar');
        }
        if (rhPlaceholder) {
            rhPlaceholder.style.display = 'none';
            console.log('Placeholder umidade escondido');
        }

        // Forçar redimensionamento do canvas
        const parentWidth = canvas.parentElement.clientWidth;
        const parentHeight = canvas.parentElement.clientHeight || 400;

        canvas.style.width = parentWidth + 'px';
        canvas.style.height = parentHeight + 'px';
        canvas.width = parentWidth;
        canvas.height = parentHeight;

        console.log('Canvas redimensionado para:', parentWidth, 'x', parentHeight);

        // Verificar se o canvas está visível e tem dimensões
        const rect = canvas.getBoundingClientRect();
        console.log('Canvas dimensions após redimensionamento:', canvas.width, 'x', canvas.height);
        console.log('Canvas rect:', rect);
        console.log('Canvas parent:', canvas.parentElement);
        console.log('Canvas container display:', canvas.parentElement?.style.display);

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error('Não foi possível obter contexto 2D do canvas rhChart');
            return;
        }

        // Destruir gráfico anterior se existir
        if (this.charts.humidity) {
            console.log('Destruindo gráfico anterior de umidade');
            this.charts.humidity.destroy();
        }

        // Preparar dados
        const labels = [];
        const data = [];

        console.log('Dados série disponíveis:', this.data.series.length);
        console.log('Amostra dos dados:', this.data.series.slice(0, 3));

        this.data.series.forEach((item, index) => {
            try {
                const date = new Date(item.timestamp);
                if (isNaN(date.getTime())) {
                    console.warn(`Timestamp inválido no índice ${index}:`, item.timestamp);
                    return;
                }

                // Tentar diferentes campos de umidade
                let humidity = item.humidity || item.relative_humidity || item.rh;
                humidity = parseFloat(humidity);
                if (isNaN(humidity)) {
                    console.warn(`Umidade inválida no índice ${index}:`, item.humidity, item.relative_humidity, item);
                    return;
                }

                labels.push(date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
                data.push(humidity);
            } catch (error) {
                console.warn(`Erro ao processar item ${index}:`, error, item);
            }
        });

        console.log('Dados de umidade preparados:', {
            labels: labels.length,
            data: data.length,
            sampleData: data.slice(0, 5)
        });

        try {
            // Limpar o canvas antes de criar novo gráfico
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            this.charts.humidity = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Umidade (%)',
                            data: data,
                            borderColor: '#0d6efd',
                            backgroundColor: 'rgba(13, 110, 253, 0.1)',
                            borderWidth: 2,
                            fill: false,
                            tension: 0.1,
                            pointRadius: 2,
                            pointHoverRadius: 6
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: {
                        duration: 1000
                    },
                    scales: {
                        x: {
                            title: {
                                display: true,
                                text: 'Tempo'
                            },
                            ticks: {
                                maxTicksLimit: 10
                            }
                        },
                        y: {
                            title: {
                                display: true,
                                text: 'Umidade (%)'
                            },
                            min: 0,
                            max: 100
                        }
                    },
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top'
                        }
                    }
                }
            });

            console.log('Gráfico de umidade criado com sucesso!', this.charts.humidity);

            // Forçar redesenho
            this.charts.humidity.update();

        } catch (error) {
            console.error('Erro ao criar gráfico de umidade:', error);
        }
    }

    async refreshData() {
        console.log('Atualizando dados...');
        this.showLoading();
        try {
            await this.loadData();
            await this.loadViolations();
            this.updateKPIs();
            this.createCharts();
            this.updateLastUpdatedTime();
            this.showSuccessToast('Dados atualizados com sucesso!');
        } catch (error) {
            console.error('Erro ao atualizar dados:', error);
            this.showErrorToast('Erro ao atualizar dados');
        } finally {
            this.hideLoading();
        }
    }

    startAutoRefresh() {
        if (!this.autoRefreshEnabled) return;

        this.autoRefreshInterval = setInterval(async () => {
            try {
                await this.refreshData();
            } catch (error) {
                console.error('Erro no auto-refresh:', error);
            }
        }, 60000); // 60 segundos

        console.log('Auto-refresh ativado (60s)');
    }

    updateLastUpdatedTime() {
        this.lastUpdated = new Date();
        const lastUpdatedEl = document.getElementById('last-updated');
        if (lastUpdatedEl) {
            const timeStr = this.lastUpdated.toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit'
            });
            const dateStr = this.lastUpdated.toLocaleDateString('pt-BR');
            lastUpdatedEl.innerHTML = `<i class="fas fa-clock me-1"></i>Atualizado às ${timeStr} (${dateStr})`;
        }
    }

    async forceCycle() {
        console.log('Forçando ciclo do simulador...');
        this.showLoading();

        try {
            const response = await fetch('/api/force-cycle', { method: 'POST' });
            const result = await response.json();

            if (result.success) {
                this.showSuccessToast('Ciclo executado com sucesso!');
                await this.refreshData();
            } else {
                this.showErrorToast('Erro ao executar ciclo: ' + result.message);
            }
        } catch (error) {
            console.error('Erro ao forçar ciclo:', error);
            this.showErrorToast('Erro ao executar ciclo');
        } finally {
            this.hideLoading();
        }
    }

    showLoading() {
        console.log('Mostrando loading...');
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.remove('hidden');
            console.log('Loading overlay mostrado');
        }
    }

    hideLoading() {
        console.log('=== INICIANDO hideLoading() ===');

        // 1. Esconder overlay principal
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.add('hidden');
            console.log('✅ Loading overlay escondido');
        } else {
            console.warn('❌ Loading overlay não encontrado');
        }

        // 2. Verificar e esconder skeleton loaders / mostrar conteúdo
        const skeletonElements = [
            { skeleton: 'temp-skeleton', content: 'temp-content' },
            { skeleton: 'humidity-skeleton', content: 'humidity-content' },
            { skeleton: 'violations-skeleton', content: 'violations-content' },
            { skeleton: 'measurements-skeleton', content: 'measurements-content' }
        ];

        console.log('=== PROCESSANDO SKELETONS ===');

        skeletonElements.forEach(({ skeleton, content }) => {
            const skeletonEl = document.getElementById(skeleton);
            const contentEl = document.getElementById(content);

            console.log(`Processando ${skeleton}:`, {
                skeletonExists: !!skeletonEl,
                contentExists: !!contentEl,
                skeletonVisible: skeletonEl ? skeletonEl.style.display !== 'none' : false,
                contentVisible: contentEl ? contentEl.style.display !== 'none' : false
            });

            if (skeletonEl) {
                skeletonEl.style.display = 'none';
                console.log(`✅ ${skeleton} escondido`);
            } else {
                console.warn(`❌ ${skeleton} não encontrado`);
            }

            if (contentEl) {
                contentEl.style.display = 'block';
                console.log(`✅ ${content} mostrado`);
            } else {
                console.warn(`❌ ${content} não encontrado`);
            }
        });

        console.log('=== hideLoading() FINALIZADO ===');
    }

    showSuccessToast(message) {
        console.log('SUCCESS:', message);
        this.showToast('success-toast', 'success-message', message);
    }

    showErrorToast(message) {
        console.error('ERROR:', message);
        this.showToast('error-toast', 'error-message', message);
    }

    showToast(toastId, messageId, message) {
        const toastEl = document.getElementById(toastId);
        const messageEl = document.getElementById(messageId);

        if (toastEl && messageEl) {
            messageEl.textContent = message;
            const toast = new bootstrap.Toast(toastEl);
            toast.show();
        }
    }
}

// Inicialização quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function () {
    console.log('DOM carregado, inicializando dashboard...');

    // Verificar dependências
    const checks = {
        Chart: typeof Chart !== 'undefined',
        bootstrap: typeof bootstrap !== 'undefined',
        fetch: typeof fetch !== 'undefined'
    };

    console.log('Verificação de dependências:', checks);

    if (!checks.Chart) {
        console.error('ERRO CRÍTICO: Chart.js não está carregado');
        alert('Erro: Chart.js não foi carregado. Verifique a conexão com a internet.');
        return;
    }

    if (!checks.bootstrap) {
        console.warn('AVISO: Bootstrap JS não está carregado - dropdowns podem não funcionar');
    }

    if (!checks.fetch) {
        console.error('ERRO CRÍTICO: Fetch API não suportada pelo navegador');
        return;
    }

    console.log('Chart.js versão:', Chart.version || 'versão desconhecida');

    // Inicializar dashboard
    try {
        const dashboard = new EnvironmentalDashboard();

        // Expor para uso global
        window.dashboard = dashboard;

        console.log('Dashboard inicializado globalmente!');
    } catch (error) {
        console.error('Erro fatal ao inicializar dashboard:', error);
        alert('Erro fatal ao carregar o dashboard. Verifique o console para detalhes.');
    }
});

// Função global para download de relatórios
function downloadReport(format, days) {
    console.log(`Tentando baixar relatório ${format} para ${days} dias...`);
    const baseUrl = format === 'pdf' ? '/reports/pdf' : '/reports/excel';
    const url = `${baseUrl}?days=${days}`;

    // Download via link temporário
    const link = document.createElement('a');
    link.href = url;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
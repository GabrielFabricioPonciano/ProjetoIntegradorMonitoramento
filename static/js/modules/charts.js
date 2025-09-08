// modules/charts.js - Gerenciador de gráficos Chart.js
import { DOM_ELEMENTS, CONFIG } from './config.js';
import { Utils } from './utils.js';

export class ChartManager {
    constructor() {
        this.charts = {};
        this.chartData = null;
    }

    async createCharts(data) {
        if (!data || !data.series || !Array.isArray(data.series)) {
            Utils.logError('Charts', 'Dados de série inválidos', data);
            return;
        }

        // Verificar se Chart.js está disponível
        if (typeof Chart === 'undefined') {
            Utils.logError('Charts', 'Chart.js não está carregado');
            return;
        }

        this.chartData = data;
        Utils.logInfo('Charts', `Criando gráficos com ${data.series.length} registros`);

        // Aguardar frame para garantir que o DOM está pronto
        await Utils.nextFrame();

        this.createTemperatureChart();

        // Aguardar mais tempo e forçar reflow antes de criar o segundo gráfico
        await Utils.delay(CONFIG.CHART_CREATION_DELAY);

        // Forçar reflow novamente
        const rhContainer = Utils.getElementById(DOM_ELEMENTS.rhChartContainer);
        Utils.forceReflow(rhContainer);
        Utils.logInfo('Charts', 'Forçando reflow do container umidade');

        this.createHumidityChart();

        // Aguardar antes de fazer resize
        await Utils.delay(CONFIG.RESIZE_DELAY);
        this.resizeCharts();

        Utils.logInfo('Charts', 'Processo de criação de gráficos finalizado');
    }

    createTemperatureChart() {
        Utils.logInfo('Charts', 'Criando gráfico de temperatura');

        const canvas = Utils.getElementById(DOM_ELEMENTS.tempChart);
        if (!canvas) {
            Utils.logError('Charts', 'Canvas tempChart não encontrado');
            return;
        }

        const ctx = canvas.getContext('2d');

        // Destruir gráfico anterior se existir
        if (this.charts.temperature) {
            Utils.logInfo('Charts', 'Destruindo gráfico anterior de temperatura');
            this.charts.temperature.destroy();
        }

        // Preparar dados
        const { labels, data } = this.prepareTemperatureData();

        try {
            this.charts.temperature = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Temperatura (°C)',
                        data: data,
                        borderColor: CONFIG.COLORS.temperature,
                        backgroundColor: `${CONFIG.COLORS.temperature}20`,
                        borderWidth: 2,
                        fill: false,
                        tension: 0.1,
                        pointRadius: 2,
                        pointHoverRadius: 6
                    }]
                },
                options: this.getTemperatureChartOptions()
            });

            Utils.logInfo('Charts', 'Gráfico de temperatura criado com sucesso');
        } catch (error) {
            Utils.logError('Charts', 'Erro ao criar gráfico de temperatura', error);
        }
    }

    createHumidityChart() {
        Utils.logInfo('Charts', '=== INICIANDO CRIAÇÃO DO GRÁFICO DE UMIDADE ===');

        const canvas = Utils.getElementById(DOM_ELEMENTS.rhChart);
        if (!canvas) {
            Utils.logError('Charts', 'Canvas rhChart não encontrado');
            return;
        }

        // Forçar mostrar container antes de criar gráfico
        const rhContainer = Utils.getElementById(DOM_ELEMENTS.rhChartContainer);
        const rhPlaceholder = Utils.getElementById(DOM_ELEMENTS.rhChartPlaceholder);

        if (rhContainer) {
            rhContainer.style.display = 'block';
            Utils.logInfo('Charts', 'Container umidade forçado a mostrar');
        }
        if (rhPlaceholder) {
            rhPlaceholder.style.display = 'none';
            Utils.logInfo('Charts', 'Placeholder umidade escondido');
        }

        // Forçar redimensionamento do canvas
        this.forceCanvasResize(canvas);

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            Utils.logError('Charts', 'Não foi possível obter contexto 2D do canvas rhChart');
            return;
        }

        // Destruir gráfico anterior se existir
        if (this.charts.humidity) {
            Utils.logInfo('Charts', 'Destruindo gráfico anterior de umidade');
            this.charts.humidity.destroy();
        }

        // Preparar dados
        const { labels, data } = this.prepareHumidityData();

        try {
            // Limpar o canvas antes de criar novo gráfico
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            this.charts.humidity = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Umidade (%)',
                        data: data,
                        borderColor: CONFIG.COLORS.humidity,
                        backgroundColor: `${CONFIG.COLORS.humidity}20`,
                        borderWidth: 2,
                        fill: false,
                        tension: 0.1,
                        pointRadius: 2,
                        pointHoverRadius: 6
                    }]
                },
                options: this.getHumidityChartOptions()
            });

            Utils.logInfo('Charts', 'Gráfico de umidade criado com sucesso!', this.charts.humidity);

            // Forçar redesenho
            this.charts.humidity.update();

        } catch (error) {
            Utils.logError('Charts', 'Erro ao criar gráfico de umidade', error);
        }
    }

    forceCanvasResize(canvas) {
        const parentWidth = canvas.parentElement.clientWidth;
        const parentHeight = canvas.parentElement.clientHeight || CONFIG.CHART_HEIGHT;

        canvas.style.width = parentWidth + 'px';
        canvas.style.height = parentHeight + 'px';
        canvas.width = parentWidth;
        canvas.height = parentHeight;

        Utils.logInfo('Charts', `Canvas redimensionado para: ${parentWidth}x${parentHeight}`);

        // Verificar dimensões após redimensionamento
        const rect = canvas.getBoundingClientRect();
        Utils.logInfo('Charts', 'Canvas rect após redimensionamento:', rect);
    }

    prepareTemperatureData() {
        const labels = [];
        const data = [];

        this.chartData.series.forEach((item, index) => {
            try {
                if (!Utils.isValidTimestamp(item.timestamp)) {
                    Utils.logError('Charts', `Timestamp inválido no índice ${index}`, item.timestamp);
                    return;
                }

                const temperature = Utils.parseFloat(item.temperature);
                if (temperature === null) {
                    Utils.logError('Charts', `Temperatura inválida no índice ${index}`, item.temperature);
                    return;
                }

                labels.push(Utils.formatDateTime(item.timestamp));
                data.push(temperature);
            } catch (error) {
                Utils.logError('Charts', `Erro ao processar item ${index}`, error);
            }
        });

        Utils.logInfo('Charts', `Dados de temperatura preparados: ${data.length} pontos`);
        return { labels, data };
    }

    prepareHumidityData() {
        const labels = [];
        const data = [];

        Utils.logInfo('Charts', `Dados série disponíveis: ${this.chartData.series.length}`);
        Utils.logInfo('Charts', 'Amostra dos dados:', this.chartData.series.slice(0, 3));

        this.chartData.series.forEach((item, index) => {
            try {
                if (!Utils.isValidTimestamp(item.timestamp)) {
                    Utils.logError('Charts', `Timestamp inválido no índice ${index}`, item.timestamp);
                    return;
                }

                // Tentar diferentes campos de umidade
                let humidity = item.humidity || item.relative_humidity || item.rh;
                humidity = Utils.parseFloat(humidity);

                if (humidity === null) {
                    Utils.logError('Charts', `Umidade inválida no índice ${index}`, {
                        humidity: item.humidity,
                        relative_humidity: item.relative_humidity,
                        rh: item.rh,
                        item: item
                    });
                    return;
                }

                labels.push(Utils.formatDateTime(item.timestamp));
                data.push(humidity);
            } catch (error) {
                Utils.logError('Charts', `Erro ao processar item ${index}`, error);
            }
        });

        Utils.logInfo('Charts', `Dados de umidade preparados: ${data.length} pontos`);
        return { labels, data };
    }

    getTemperatureChartOptions() {
        return {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: CONFIG.CHART_ANIMATION_DURATION
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
        };
    }

    getHumidityChartOptions() {
        return {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: CONFIG.CHART_ANIMATION_DURATION
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
        };
    }

    resizeCharts() {
        Utils.logInfo('Charts', 'Forçando resize dos gráficos');

        if (this.charts.temperature) {
            this.charts.temperature.resize();
            Utils.logInfo('Charts', 'Gráfico temperatura redimensionado');
        }

        if (this.charts.humidity) {
            this.charts.humidity.resize();
            Utils.logInfo('Charts', 'Gráfico umidade redimensionado');
        }
    }

    destroyCharts() {
        Object.keys(this.charts).forEach(key => {
            if (this.charts[key]) {
                this.charts[key].destroy();
                delete this.charts[key];
            }
        });
        Utils.logInfo('Charts', 'Todos os gráficos destruídos');
    }

    updateCharts(data) {
        this.chartData = data;
        this.destroyCharts();
        return this.createCharts(data);
    }
}

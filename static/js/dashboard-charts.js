// dashboard-charts.js - Charts functionality
// This extends the EnvironmentalDashboard class

EnvironmentalDashboard.prototype.prepareChartContainers = function() {
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
};

EnvironmentalDashboard.prototype.createCharts = function() {
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
};

EnvironmentalDashboard.prototype.resizeCharts = function() {
    console.log('Forçando resize dos gráficos...');
    if (this.charts.temperature) {
        this.charts.temperature.resize();
        console.log('Gráfico temperatura redimensionado');
    }
    if (this.charts.humidity) {
        this.charts.humidity.resize();
        console.log('Gráfico umidade redimensionado');
    }
};

EnvironmentalDashboard.prototype.showChartContainers = function() {
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
};

EnvironmentalDashboard.prototype.createTemperatureChart = function() {
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
};

EnvironmentalDashboard.prototype.createHumidityChart = function() {
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
};
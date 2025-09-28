/**
 * Dashboard Charts Module
 * Chart rendering and management for the environmental monitoring dashboard
 */

class DashboardCharts {
    constructor() {
        this.charts = {
            temperature: null,
            humidity: null
        };
        this.chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    borderWidth: 1,
                    cornerRadius: 8,
                    displayColors: false,
                    callbacks: {
                        title: function (context) {
                            return context[0].label;
                        },
                        label: function (context) {
                            return `${context.dataset.label}: ${context.parsed.y.toFixed(1)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.7)',
                        maxTicksLimit: 8
                    }
                },
                y: {
                    display: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.7)',
                        callback: function (value) {
                            return value.toFixed(1);
                        }
                    }
                }
            },
            elements: {
                point: {
                    hoverRadius: 6,
                    hoverBorderWidth: 2
                }
            }
        };

        this.init();
    }

    init() {
        console.log('Dashboard Charts: Initializing...');
        this.initializeCharts();
    }

    initializeCharts() {
        // Destroy existing charts first
        this.destroyCharts();

        // Temperature chart
        const tempCtx = document.getElementById('tempChart');
        if (tempCtx) {
            this.charts.temperature = new Chart(tempCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Temperatura (°C)',
                        data: [],
                        borderColor: 'rgba(250, 112, 154, 1)',
                        backgroundColor: 'rgba(250, 112, 154, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 0,
                        pointHoverRadius: 4,
                        pointHoverBackgroundColor: 'rgba(250, 112, 154, 1)',
                        pointHoverBorderColor: '#ffffff',
                        pointHoverBorderWidth: 2
                    }]
                },
                options: {
                    ...this.chartOptions,
                    scales: {
                        ...this.chartOptions.scales,
                        y: {
                            ...this.chartOptions.scales.y,
                            ticks: {
                                ...this.chartOptions.scales.y.ticks,
                                callback: function (value) {
                                    return value + '°C';
                                }
                            }
                        }
                    }
                }
            });
        }

        // Humidity chart
        const humidityCtx = document.getElementById('rhChart');
        if (humidityCtx) {
            this.charts.humidity = new Chart(humidityCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Umidade Relativa (%)',
                        data: [],
                        borderColor: 'rgba(79, 172, 254, 1)',
                        backgroundColor: 'rgba(79, 172, 254, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 0,
                        pointHoverRadius: 4,
                        pointHoverBackgroundColor: 'rgba(79, 172, 254, 1)',
                        pointHoverBorderColor: '#ffffff',
                        pointHoverBorderWidth: 2
                    }]
                },
                options: {
                    ...this.chartOptions,
                    scales: {
                        ...this.chartOptions.scales,
                        y: {
                            ...this.chartOptions.scales.y,
                            ticks: {
                                ...this.chartOptions.scales.y.ticks,
                                callback: function (value) {
                                    return value + '%';
                                }
                            }
                        }
                    }
                }
            });
        }
    }

    updateChartsUI(seriesData) {
        console.log('Dashboard Charts: Updating charts...', seriesData);

        if (seriesData && Array.isArray(seriesData)) {
            // Transform API data format to expected format
            const transformedData = {
                temperature: seriesData.map(item => ({
                    timestamp: item.timestamp,
                    value: item.temperature
                })),
                humidity: seriesData.map(item => ({
                    timestamp: item.timestamp,
                    value: item.humidity
                }))
            };

            this.updateTemperatureChart(transformedData);
            this.updateHumidityChart(transformedData);
        }

        // Hide loading placeholders
        this.hideChartPlaceholders();
    }

    updateTemperatureChart(seriesData) {
        if (!this.charts.temperature || !seriesData.temperature) return;

        const data = seriesData.temperature;

        // Group data by hour for better performance with large datasets
        const groupedData = this.groupDataByHour(data);

        this.charts.temperature.data.labels = groupedData.map(item =>
            this.formatChartLabel(item.timestamp)
        );
        this.charts.temperature.data.datasets[0].data = groupedData.map(item => item.value);

        this.charts.temperature.update('none');
    }

    updateHumidityChart(seriesData) {
        if (!this.charts.humidity || !seriesData.humidity) return;

        const data = seriesData.humidity;

        // Group data by hour for better performance with large datasets
        const groupedData = this.groupDataByHour(data);

        this.charts.humidity.data.labels = groupedData.map(item =>
            this.formatChartLabel(item.timestamp)
        );
        this.charts.humidity.data.datasets[0].data = groupedData.map(item => item.value);

        this.charts.humidity.update('none');
    }

    hideChartPlaceholders() {
        const placeholders = ['temp-chart-placeholder', 'rh-chart-placeholder'];
        placeholders.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.style.display = 'none';
            }
        });

        // Show actual charts
        const charts = ['tempChart', 'rhChart'];
        charts.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.style.display = 'block';
            }
        });
    }

    showChartPlaceholders() {
        const placeholders = ['temp-chart-placeholder', 'rh-chart-placeholder'];
        placeholders.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.style.display = 'block';
            }
        });

        // Hide actual charts
        const charts = ['tempChart', 'rhChart'];
        charts.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.style.display = 'none';
            }
        });
    }

    groupDataByHour(data) {
        const grouped = new Map();

        data.forEach(item => {
            const date = new Date(item.timestamp);
            const hourKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;

            if (!grouped.has(hourKey)) {
                grouped.set(hourKey, {
                    timestamp: new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()),
                    values: []
                });
            }

            grouped.get(hourKey).values.push(item.value);
        });

        return Array.from(grouped.values()).map(group => ({
            timestamp: group.timestamp,
            value: group.values.reduce((sum, val) => sum + val, 0) / group.values.length
        }));
    }

    formatChartLabel(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return date.toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit'
            });
        } else if (diffDays === 1) {
            return 'Ontem ' + date.toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit'
            });
        } else {
            return date.toLocaleDateString('pt-BR', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    }

    resizeCharts() {
        Object.values(this.charts).forEach(chart => {
            if (chart) {
                chart.resize();
            }
        });
    }

    destroyCharts() {
        Object.values(this.charts).forEach(chart => {
            if (chart) {
                chart.destroy();
            }
        });
        this.charts = {};
    }

    updateChartTheme(isDark = true) {
        const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
        const tickColor = isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)';

        Object.values(this.charts).forEach(chart => {
            if (chart) {
                chart.options.scales.x.grid.color = gridColor;
                chart.options.scales.y.grid.color = gridColor;
                chart.options.scales.x.ticks.color = tickColor;
                chart.options.scales.y.ticks.color = tickColor;
                chart.update();
            }
        });
    }

    exportChart(chartType, format = 'png') {
        const chart = this.charts[chartType];
        if (!chart) return null;

        return chart.toBase64Image();
    }

    getChartData(chartType) {
        const chart = this.charts[chartType];
        return chart ? chart.data : null;
    }

    setChartPeriod(chartType, days) {
        // This method can be used to adjust chart display based on period
        const chart = this.charts[chartType];
        if (chart) {
            // Adjust tick limits based on period
            const maxTicks = days <= 1 ? 24 : days <= 7 ? 14 : 8;
            chart.options.scales.x.ticks.maxTicksLimit = maxTicks;
            chart.update();
        }
    }
}

// Make charts available as a module property
window.dashboard.charts = new DashboardCharts();

// Handle window resize for responsive charts
window.addEventListener('resize', () => {
    if (window.dashboard.resizeCharts) {
        window.dashboard.resizeCharts();
    }
});
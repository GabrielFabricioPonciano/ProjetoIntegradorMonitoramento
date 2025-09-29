/**
 * Dashboard Charts Module
 * Professional chart rendering and management for the environmental monitoring dashboard
 */

console.log('Dashboard Charts module loading...');

class DashboardCharts {
    constructor() {
        this.charts = {};
        this.chartColors = {
            temperature: {
                primary: '#ef4444',
                secondary: '#dc2626',
                gradient: ['#ef4444', '#f87171', '#fca5a5'],
                border: '#ef4444',
                background: 'rgba(239, 68, 68, 0.15)',
                point: '#ef4444',
                pointHover: '#dc2626'
            },
            humidity: {
                primary: '#3b82f6',
                secondary: '#2563eb',
                gradient: ['#3b82f6', '#60a5fa', '#93c5fd'],
                border: '#3b82f6',
                background: 'rgba(59, 130, 246, 0.15)',
                point: '#3b82f6',
                pointHover: '#2563eb'
            }
        };
        this.init();
    }

    init() {
        console.log('DashboardCharts init called');

        // Wait for DOM and Chart.js
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initCharts());
        } else {
            this.initCharts();
        }
    }

    initCharts() {
        console.log('Creating professional charts...');
        this.createTemperatureChart();
        this.createHumidityChart();
        console.log('Professional charts created');
    }

    createTemperatureChart() {
        let canvas = document.getElementById('temperature-chart');
        if (!canvas) {
            console.error('Temperature canvas not found');
            return;
        }

        // Destroy existing chart if it exists
        if (this.charts.temperature) {
            this.charts.temperature.destroy();
            delete this.charts.temperature;
        }

        // Replace canvas completely to avoid Chart.js conflicts
        const parent = canvas.parentNode;
        const newCanvas = document.createElement('canvas');
        newCanvas.id = 'temperature-chart';
        newCanvas.width = canvas.width;
        newCanvas.height = canvas.height;
        parent.replaceChild(newCanvas, canvas);
        canvas = newCanvas;

        console.log('Creating professional temperature chart on canvas:', canvas);

        // Create professional gradient for dark theme
        const ctx = canvas.getContext('2d');
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, 'rgba(239, 68, 68, 0.4)');
        gradient.addColorStop(0.6, 'rgba(239, 68, 68, 0.2)');
        gradient.addColorStop(1, 'rgba(239, 68, 68, 0.0)');

        try {
            this.charts.temperature = new Chart(canvas, {
                type: 'line',
                data: {
                    labels: this.generateTimeLabels(),
                    datasets: [{
                        label: 'Temperatura (°C)',
                        data: this.generateTemperatureData(),
                        borderColor: this.chartColors.temperature.primary,
                        backgroundColor: gradient,
                        borderWidth: 3,
                        pointBackgroundColor: this.chartColors.temperature.point,
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: 5,
                        pointHoverRadius: 7,
                        pointHoverBackgroundColor: this.chartColors.temperature.pointHover,
                        pointHoverBorderColor: '#ffffff',
                        pointHoverBorderWidth: 3,
                        tension: 0.4,
                        fill: true,
                        spanGaps: true
                    }]
                },
                options: {
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
                                    size: 13,
                                    weight: '500',
                                    family: 'Inter, system-ui, sans-serif'
                                },
                                color: '#e5e5e5',
                                usePointStyle: true,
                                pointStyle: 'circle',
                                padding: 15
                            }
                        },
                        tooltip: {
                            enabled: true,
                            backgroundColor: 'rgba(17, 17, 17, 0.95)',
                            titleColor: '#ffffff',
                            bodyColor: '#e5e5e5',
                            borderColor: this.chartColors.temperature.primary,
                            borderWidth: 1,
                            cornerRadius: 12,
                            padding: 12,
                            displayColors: false,
                            titleFont: {
                                size: 13,
                                weight: '600'
                            },
                            bodyFont: {
                                size: 12,
                                weight: '500'
                            },
                            callbacks: {
                                title: function (context) {
                                    return 'Horário: ' + context[0].label;
                                },
                                label: function (context) {
                                    return 'Temperatura: ' + context.parsed.y.toFixed(1) + '°C';
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
                                    size: 12,
                                    weight: '500',
                                    family: 'Inter, system-ui, sans-serif'
                                },
                                color: '#a3a3a3'
                            },
                            ticks: {
                                font: {
                                    size: 10,
                                    family: 'Inter, system-ui, sans-serif'
                                },
                                color: '#a3a3a3',
                                maxTicksLimit: 8
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
                                text: 'Temperatura (°C)',
                                font: {
                                    size: 12,
                                    weight: '500',
                                    family: 'Inter, system-ui, sans-serif'
                                },
                                color: '#a3a3a3'
                            },
                            ticks: {
                                font: {
                                    size: 10,
                                    family: 'Inter, system-ui, sans-serif'
                                },
                                color: '#a3a3a3',
                                callback: function (value) {
                                    return value.toFixed(1) + '°C';
                                }
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
                        duration: 1200,
                        easing: 'easeInOutQuart'
                    },
                    elements: {
                        point: {
                            hoverBackgroundColor: this.chartColors.temperature.pointHover,
                            hoverBorderColor: '#ffffff'
                        },
                        line: {
                            tension: 0.4
                        }
                    }
                }
            });
            console.log('Professional temperature chart created successfully');
        } catch (error) {
            console.error('Error creating temperature chart:', error);
        }
    }

    createHumidityChart() {
        let canvas = document.getElementById('humidity-chart');
        if (!canvas) {
            console.error('Humidity canvas not found');
            return;
        }

        // Destroy existing chart if it exists
        if (this.charts.humidity) {
            this.charts.humidity.destroy();
            delete this.charts.humidity;
        }

        // Replace canvas completely to avoid Chart.js conflicts
        const parent = canvas.parentNode;
        const newCanvas = document.createElement('canvas');
        newCanvas.id = 'humidity-chart';
        newCanvas.width = canvas.width;
        newCanvas.height = canvas.height;
        parent.replaceChild(newCanvas, canvas);
        canvas = newCanvas;

        // Create professional gradient for dark theme
        const ctx = canvas.getContext('2d');
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, 'rgba(59, 130, 246, 0.4)');
        gradient.addColorStop(0.6, 'rgba(59, 130, 246, 0.2)');
        gradient.addColorStop(1, 'rgba(59, 130, 246, 0.0)');

        try {
            this.charts.humidity = new Chart(canvas, {
                type: 'line',
                data: {
                    labels: this.generateTimeLabels(),
                    datasets: [{
                        label: 'Umidade (%)',
                        data: this.generateHumidityData(),
                        borderColor: this.chartColors.humidity.primary,
                        backgroundColor: gradient,
                        borderWidth: 3,
                        pointBackgroundColor: this.chartColors.humidity.point,
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: 5,
                        pointHoverRadius: 7,
                        pointHoverBackgroundColor: this.chartColors.humidity.pointHover,
                        pointHoverBorderColor: '#ffffff',
                        pointHoverBorderWidth: 3,
                        tension: 0.4,
                        fill: true,
                        spanGaps: true
                    }]
                },
                options: {
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
                                    size: 13,
                                    weight: '500',
                                    family: 'Inter, system-ui, sans-serif'
                                },
                                color: '#e5e5e5',
                                usePointStyle: true,
                                pointStyle: 'circle',
                                padding: 15
                            }
                        },
                        tooltip: {
                            enabled: true,
                            backgroundColor: 'rgba(17, 17, 17, 0.95)',
                            titleColor: '#ffffff',
                            bodyColor: '#e5e5e5',
                            borderColor: this.chartColors.humidity.primary,
                            borderWidth: 1,
                            cornerRadius: 12,
                            padding: 12,
                            displayColors: false,
                            titleFont: {
                                size: 13,
                                weight: '600'
                            },
                            bodyFont: {
                                size: 12,
                                weight: '500'
                            },
                            callbacks: {
                                title: function (context) {
                                    return 'Horário: ' + context[0].label;
                                },
                                label: function (context) {
                                    return 'Umidade: ' + context.parsed.y.toFixed(1) + '%';
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
                                    size: 12,
                                    weight: '500',
                                    family: 'Inter, system-ui, sans-serif'
                                },
                                color: '#a3a3a3'
                            },
                            ticks: {
                                font: {
                                    size: 10,
                                    family: 'Inter, system-ui, sans-serif'
                                },
                                color: '#a3a3a3',
                                maxTicksLimit: 8
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
                                text: 'Umidade (%)',
                                font: {
                                    size: 12,
                                    weight: '500',
                                    family: 'Inter, system-ui, sans-serif'
                                },
                                color: '#a3a3a3'
                            },
                            ticks: {
                                font: {
                                    size: 10,
                                    family: 'Inter, system-ui, sans-serif'
                                },
                                color: '#a3a3a3',
                                callback: function (value) {
                                    return value.toFixed(1) + '%';
                                }
                            },
                            grid: {
                                color: 'rgba(255, 255, 255, 0.08)',
                                drawBorder: false,
                                lineWidth: 1
                            },
                            border: {
                                color: 'rgba(255, 255, 255, 0.1)'
                            },
                            beginAtZero: false,
                            min: 40,
                            max: 80
                        }
                    },
                    animation: {
                        duration: 1200,
                        easing: 'easeInOutQuart'
                    },
                    elements: {
                        point: {
                            hoverBackgroundColor: this.chartColors.humidity.pointHover,
                            hoverBorderColor: '#ffffff'
                        },
                        line: {
                            tension: 0.4
                        }
                    }
                }
            });
            console.log('Professional humidity chart created successfully');
        } catch (error) {
            console.error('Error creating humidity chart:', error);
        }
    }

    updateCharts(data) {
        console.log('updateCharts called with data:', data);

        try {
            // Verificar se temos dados válidos
            if (!data || typeof data !== 'object') {
                console.warn('Dados inválidos para atualização dos gráficos:', data);
                return;
            }

            // Atualizar gráfico de temperatura se existir
            if (this.charts.temperature && data.temperature) {
                const labels = data.labels || this.generateTimeLabels();
                const temperatureData = data.temperature || this.generateTemperatureData();

                this.updateChartWithAnimation(this.charts.temperature, labels, temperatureData);
                console.log('Gráfico de temperatura atualizado com dados reais');
            }

            // Atualizar gráfico de umidade se existir  
            if (this.charts.humidity && data.humidity) {
                const labels = data.labels || this.generateTimeLabels();
                const humidityData = data.humidity || this.generateHumidityData();

                this.updateChartWithAnimation(this.charts.humidity, labels, humidityData);
                console.log('Gráfico de umidade atualizado com dados reais');
            }

            console.log('Gráficos atualizados com sucesso');
        } catch (error) {
            console.error('Erro ao atualizar gráficos:', error);
        }
    }

    updateChartWithAnimation(chart, labels, data) {
        // Atualização suave com animação
        chart.data.labels = labels;
        chart.data.datasets[0].data = data;
        chart.update('active');
    }

    generateTimeLabels() {
        const labels = [];
        const now = new Date();
        for (let i = 23; i >= 0; i--) {
            const time = new Date(now - i * 60 * 60 * 1000); // Últimas 24 horas
            labels.push(time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
        }
        return labels;
    }

    generateTemperatureData() {
        // Gerar dados realistas de temperatura com padrões mais sofisticados (18°C - 26°C)
        const data = [];
        const now = new Date();
        let baseTemp = 20;

        for (let i = 0; i < 24; i++) {
            const hour = (now.getHours() - (23 - i)) % 24;

            // Padrão diário: mais frio de madrugada, mais quente à tarde
            let dailyPattern = 0;
            if (hour >= 6 && hour <= 12) {
                dailyPattern = (hour - 6) * 0.8; // Aquecendo manhã
            } else if (hour > 12 && hour <= 18) {
                dailyPattern = 4.8 - (hour - 12) * 0.3; // Pico da tarde
            } else if (hour > 18 && hour <= 23) {
                dailyPattern = 3 - (hour - 18) * 0.5; // Esfriando à noite
            } else {
                dailyPattern = 0.5 - (hour > 23 ? (hour - 24) : hour) * 0.1; // Madrugada
            }

            // Adicionar ruído realista e tendência
            const noise = (Math.random() - 0.5) * 1.2;
            const trend = Math.sin(i * 0.3) * 0.5; // Micro-tendência

            baseTemp = 20 + dailyPattern + noise + trend;
            baseTemp = Math.max(18, Math.min(26, baseTemp)); // Limitar entre 18-26°C
            data.push(Number(baseTemp.toFixed(1)));
        }
        return data;
    }

    generateHumidityData() {
        // Gerar dados realistas de umidade com padrões inversos à temperatura (45% - 75%)
        const data = [];
        const now = new Date();
        let baseHumidity = 60;

        for (let i = 0; i < 24; i++) {
            const hour = (now.getHours() - (23 - i)) % 24;

            // Padrão inverso à temperatura: mais úmido de madrugada, menos úmido à tarde
            let dailyPattern = 0;
            if (hour >= 6 && hour <= 12) {
                dailyPattern = -(hour - 6) * 1.2; // Secando pela manhã
            } else if (hour > 12 && hour <= 18) {
                dailyPattern = -7.2 + (hour - 12) * 0.8; // Mínimo à tarde
            } else if (hour > 18 && hour <= 23) {
                dailyPattern = -2.4 + (hour - 18) * 0.9; // Umidade aumentando à noite
            } else {
                dailyPattern = 2 + (hour > 23 ? (hour - 24) : hour) * 0.3; // Máximo de madrugada
            }

            // Adicionar variação climática realista
            const weatherNoise = (Math.random() - 0.5) * 4;
            const seasonalTrend = Math.cos(i * 0.4) * 1.5; // Variação sazonal simulada

            baseHumidity = 60 + dailyPattern + weatherNoise + seasonalTrend;
            baseHumidity = Math.max(45, Math.min(75, baseHumidity)); // Limitar entre 45-75%
            data.push(Number(baseHumidity.toFixed(1)));
        }
        return data;
    }

    // Método para refresh periódico dos gráficos
    refreshCharts() {
        if (this.charts.temperature) {
            this.charts.temperature.data.labels = this.generateTimeLabels();
            this.charts.temperature.data.datasets[0].data = this.generateTemperatureData();
            this.charts.temperature.update();
        }

        if (this.charts.humidity) {
            this.charts.humidity.data.labels = this.generateTimeLabels();
            this.charts.humidity.data.datasets[0].data = this.generateHumidityData();
        }

        console.log('Gráficos atualizados automaticamente');
    }

    // Método para destruir todos os gráficos
    destroy() {
        Object.keys(this.charts).forEach(key => {
            if (this.charts[key]) {
                this.charts[key].destroy();
                delete this.charts[key];
            }
        });
        console.log('Todos os gráficos destruídos');
    }
}

// Módulo disponível para exportação
if (typeof window !== 'undefined') {
    window.DashboardCharts = DashboardCharts;
}
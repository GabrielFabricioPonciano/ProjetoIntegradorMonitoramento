// dashboard-measures.js - KPIs and measurements functionality
// This extends the EnvironmentalDashboard class

EnvironmentalDashboard.prototype.updateKPIs = function() {
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
};

EnvironmentalDashboard.prototype.calculateKPIsFromSeries = function() {
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
};
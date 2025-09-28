/**
 * Dashboard Data Module
 * Data manipulation and API calls for the environmental monitoring dashboard
 */

class DashboardData {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
        this.init();
    }

    init() {
        console.log('Dashboard Data: Initializing...');
    }

    async fetchSummary(days = 30) {
        const cacheKey = `summary_${days}`;
        const cached = this.getCached(cacheKey);
        if (cached) return cached;

        try {
            const data = await window.dashboard.apiCall(`/summary/?days=${days}`);
            this.setCached(cacheKey, data);
            return data;
        } catch (error) {
            console.error('Dashboard Data: Error fetching summary:', error);
            throw error;
        }
    }

    async fetchSeries(days = 30) {
        const cacheKey = `series_${days}`;
        const cached = this.getCached(cacheKey);
        if (cached) return cached;

        try {
            const data = await window.dashboard.apiCall(`/series/?days=${days}`);
            this.setCached(cacheKey, data);
            return data;
        } catch (error) {
            console.error('Dashboard Data: Error fetching series:', error);
            throw error;
        }
    }

    async fetchViolations(days = 30, limit = 10, types = null) {
        let cacheKey = `violations_${days}_${limit}`;
        if (types) {
            cacheKey += `_${types.join('_')}`;
        }

        const cached = this.getCached(cacheKey);
        if (cached) return cached;

        try {
            let url = `/violations/?days=${days}&limit=${limit}`;
            if (types && types.length > 0) {
                url += `&type=${types.join(',')}`;
            }

            const data = await window.dashboard.apiCall(url);
            this.setCached(cacheKey, data);
            return data;
        } catch (error) {
            console.error('Dashboard Data: Error fetching violations:', error);
            throw error;
        }
    }

    async fetchAI(days = 30) {
        const cacheKey = `ai_${days}`;
        const cached = this.getCached(cacheKey);
        if (cached) return cached;

        try {
            const data = await window.dashboard.apiCall(`/ai/?days=${days}`);
            this.setCached(cacheKey, data);
            return data;
        } catch (error) {
            console.error('Dashboard Data: Error fetching AI data:', error);
            throw error;
        }
    }

    async downloadReport(format, days) {
        try {
            const url = `/reports/download/?format=${format}&days=${days}`;
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'X-CSRFToken': window.dashboard.getCSRFToken()
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            // Create download link
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = downloadUrl;
            a.download = `relatorio_monitoramento_${days}dias.${format}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(downloadUrl);
            document.body.removeChild(a);

            window.dashboard.showSuccess(`Relatório ${format.toUpperCase()} baixado com sucesso`);
        } catch (error) {
            console.error('Dashboard Data: Error downloading report:', error);
            window.dashboard.showError(`Erro ao baixar relatório ${format.toUpperCase()}`);
        }
    }

    getCached(key) {
        const cached = this.cache.get(key);
        if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
            return cached.data;
        }
        this.cache.delete(key);
        return null;
    }

    setCached(key, data) {
        this.cache.set(key, {
            data: data,
            timestamp: Date.now()
        });
    }

    clearCache() {
        this.cache.clear();
    }

    invalidateCache(pattern) {
        for (const key of this.cache.keys()) {
            if (key.includes(pattern)) {
                this.cache.delete(key);
            }
        }
    }

    // Data processing utilities
    processTemperatureData(seriesData) {
        if (!seriesData || !seriesData.temperature) return null;

        const data = seriesData.temperature;
        return {
            labels: data.map(item => this.formatDateTime(item.timestamp)),
            datasets: [{
                label: 'Temperatura (°C)',
                data: data.map(item => item.value),
                borderColor: 'rgba(250, 112, 154, 1)',
                backgroundColor: 'rgba(250, 112, 154, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 4
            }]
        };
    }

    processHumidityData(seriesData) {
        if (!seriesData || !seriesData.humidity) return null;

        const data = seriesData.humidity;
        return {
            labels: data.map(item => this.formatDateTime(item.timestamp)),
            datasets: [{
                label: 'Umidade Relativa (%)',
                data: data.map(item => item.value),
                borderColor: 'rgba(79, 172, 254, 1)',
                backgroundColor: 'rgba(79, 172, 254, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 4
            }]
        };
    }

    processViolationsData(violationsData) {
        if (!violationsData || !violationsData.violations) return [];

        return violationsData.violations.map(violation => ({
            timestamp: violation.timestamp,
            temperature: violation.temperature,
            humidity: violation.humidity,
            reason: violation.reason,
            type: violation.type
        }));
    }

    calculateStatistics(data) {
        if (!data || data.length === 0) return null;

        const values = data.map(item => item.value).filter(val => val !== null && val !== undefined);
        if (values.length === 0) return null;

        const sorted = [...values].sort((a, b) => a - b);

        return {
            count: values.length,
            min: sorted[0],
            max: sorted[sorted.length - 1],
            mean: values.reduce((sum, val) => sum + val, 0) / values.length,
            median: sorted.length % 2 === 0
                ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
                : sorted[Math.floor(sorted.length / 2)],
            q1: sorted[Math.floor(sorted.length * 0.25)],
            q3: sorted[Math.floor(sorted.length * 0.75)]
        };
    }

    formatDateTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString('pt-BR', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
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

    validateDataIntegrity(data, requiredFields = []) {
        if (!data) return false;

        for (const field of requiredFields) {
            if (!(field in data)) return false;
        }

        return true;
    }

    sanitizeNumericValue(value, defaultValue = 0) {
        const num = parseFloat(value);
        return isNaN(num) ? defaultValue : num;
    }

    sanitizeStringValue(value, defaultValue = '') {
        return (value && typeof value === 'string') ? value.trim() : defaultValue;
    }
}

// Make data available as a module property
window.dashboard.data = new DashboardData();
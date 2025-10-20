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
        // Initialization
    }

    async fetchSummary(days = 30) {
        const cacheKey = `summary_${days}`;
        const cached = this.getCached(cacheKey);
        if (cached) return cached;

        try {
            const data = await window.dashboard.apiCall(`/api/summary/?days=${days}`);
            this.setCached(cacheKey, data);
            return data;
        } catch (error) {
            console.error('Dashboard Data: Error fetching summary:', error);
            throw error;
        }
    }

    async fetchTemperatureHistory(days = 30) {
        const cacheKey = `temp_history_${days}`;
        const cached = this.getCached(cacheKey);
        if (cached) return cached;

        // Use sample data directly since API doesn't exist
        const data = this.generateSampleHistory(days, 15, 25);
        this.setCached(cacheKey, data);
        return data;
    }

    async fetchHumidityHistory(days = 30) {
        const cacheKey = `humidity_history_${days}`;
        const cached = this.getCached(cacheKey);
        if (cached) return cached;

        // Use sample data directly since API doesn't exist
        const data = this.generateSampleHistory(days, 40, 80);
        this.setCached(cacheKey, data);
        return data;
    }

    async fetchViolationsHistory(limit = 20, days = null) {
        const cacheKey = `violations_${limit}_${days}`;
        const cached = this.getCached(cacheKey);
        if (cached) return cached;

        try {
            let url = `/api/violations/?limit=${limit}`;
            if (days) {
                url += `&days=${days}`;
            }
            const data = await window.dashboard.apiCall(url);
            this.setCached(cacheKey, data);
            return data;
        } catch (error) {
            console.error('Dashboard Data: Error fetching violations:', error);
            throw error;
        }
    }

    generateSampleHistory(count, min, max, integers = false) {
        const data = [];
        for (let i = 0; i < count; i++) {
            const value = Math.random() * (max - min) + min;
            data.push(integers ? Math.floor(value) : parseFloat(value.toFixed(1)));
        }
        return data;
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
}

// Módulo disponível para exportação
if (typeof window !== 'undefined') {
    window.DashboardData = DashboardData;
}
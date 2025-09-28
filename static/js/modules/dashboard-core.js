/**
 * Dashboard Core Module
 * Core functionality and initialization for the environmental monitoring dashboard
 */

class DashboardCore {
    constructor() {
        this.config = {
            apiBaseUrl: '/api',
            defaultPeriod: 30,
            updateInterval: 30000, // 30 seconds
            maxRetries: 3,
            retryDelay: 1000
        };

        this.state = {
            currentPeriod: 30,
            isLoading: false,
            lastUpdate: null,
            data: {
                summary: null,
                series: null,
                violations: null,
                ai: null
            }
        };

        this.intervals = {
            autoUpdate: null
        };

        this.init();
    }

    init() {
        console.log('Dashboard Core: Initializing...');
        // Don't auto-initialize, let dashboard-init.js control this
    }

    start() {
        console.log('Dashboard Core: Starting...');
        this.bindEvents();
        this.startAutoUpdate();
        this.loadInitialData();
    }

    bindEvents() {
        // Period selector events
        document.querySelectorAll('input[name="period"]').forEach(radio => {
            radio.addEventListener('change', (e) => this.handlePeriodChange(e));
        });

        // Custom period slider
        const slider = document.getElementById('period-slider');
        if (slider) {
            slider.addEventListener('input', (e) => this.handleSliderChange(e));
        }

        // Force cycle button
        const forceBtn = document.getElementById('force-cycle-btn');
        if (forceBtn) {
            forceBtn.addEventListener('click', () => this.forceCycle());
        }

        // Violations limit selector
        const limitSelect = document.getElementById('violations-limit');
        if (limitSelect) {
            limitSelect.addEventListener('change', (e) => this.handleViolationsLimitChange(e));
        }

        // Violation filters
        document.querySelectorAll('.filter-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', () => this.handleViolationFiltersChange());
        });
    }

    async loadInitialData() {
        this.setLoading(true);
        try {
            await Promise.all([
                this.loadSummary(),
                this.loadSeries(),
                this.loadViolations(),
                this.loadAI()
            ]);
            this.updateLastUpdated();
        } catch (error) {
            console.error('Dashboard Core: Error loading initial data:', error);
            this.showError('Erro ao carregar dados iniciais');
        } finally {
            this.setLoading(false);
        }
    }

    startAutoUpdate() {
        this.intervals.autoUpdate = setInterval(() => {
            this.loadSummary();
            this.loadViolations();
        }, this.config.updateInterval);
    }

    stopAutoUpdate() {
        if (this.intervals.autoUpdate) {
            clearInterval(this.intervals.autoUpdate);
            this.intervals.autoUpdate = null;
        }
    }

    async handlePeriodChange(event) {
        const period = event.target.value;
        if (period === 'custom') {
            this.showCustomPeriodPanel();
        } else {
            this.state.currentPeriod = parseInt(period);
            this.hideCustomPeriodPanel();
            await this.reloadAllData();
        }
    }

    handleSliderChange(event) {
        const value = event.target.value;
        document.getElementById('slider-value').textContent = `${value} dias`;
    }

    applyCustomPeriod() {
        const slider = document.getElementById('period-slider');
        this.state.currentPeriod = parseInt(slider.value);
        this.hideCustomPeriodPanel();
        this.reloadAllData();
    }

    showCustomPeriodPanel() {
        document.getElementById('custom-period-panel').style.display = 'block';
    }

    hideCustomPeriodPanel() {
        document.getElementById('custom-period-panel').style.display = 'none';
    }

    async handleViolationsLimitChange(event) {
        await this.loadViolations();
    }

    async handleViolationFiltersChange() {
        await this.loadViolations();
    }

    async forceCycle() {
        console.log('Dashboard Core: Forcing data cycle...');
        this.setLoading(true);
        try {
            await this.reloadAllData();
            this.showSuccess('Ciclo forçado executado com sucesso');
        } catch (error) {
            console.error('Dashboard Core: Error forcing cycle:', error);
            this.showError('Erro ao executar ciclo forçado');
        } finally {
            this.setLoading(false);
        }
    }

    async reloadAllData() {
        try {
            await Promise.all([
                this.loadSummary(),
                this.loadSeries(),
                this.loadViolations(),
                this.loadAI()
            ]);
        } catch (error) {
            console.error('Dashboard Core: Error reloading data:', error);
            throw error;
        }
    }

    async loadSummary() {
        try {
            const response = await this.apiCall(`/summary/?days=${this.state.currentPeriod}`);
            this.state.data.summary = response;
            this.updateSummaryUI(response);
        } catch (error) {
            console.error('Dashboard Core: Error loading summary:', error);
            throw error;
        }
    }

    async loadSeries() {
        try {
            const response = await this.apiCall(`/series/?days=${this.state.currentPeriod}`);
            this.state.data.series = response;
            this.updateChartsUI(response);
        } catch (error) {
            console.error('Dashboard Core: Error loading series:', error);
            throw error;
        }
    }

    async loadViolations() {
        try {
            const limit = document.getElementById('violations-limit').value;
            const tempFilter = document.getElementById('filter-temp-violations').checked;
            const humidityFilter = document.getElementById('filter-humidity-violations').checked;

            let url = `/violations/?days=${this.state.currentPeriod}&limit=${limit}`;
            if (!tempFilter || !humidityFilter) {
                const types = [];
                if (tempFilter) types.push('temperature');
                if (humidityFilter) types.push('humidity');
                if (types.length > 0) {
                    url += `&type=${types.join(',')}`;
                }
            }

            const response = await this.apiCall(url);
            this.state.data.violations = response;
            this.updateViolationsUI(response);
        } catch (error) {
            console.error('Dashboard Core: Error loading violations:', error);
            throw error;
        }
    }

    async loadAI() {
        try {
            const response = await this.apiCall(`/ai/insights/?days=${this.state.currentPeriod}`);
            this.state.data.ai = response;
            this.updateAIUI(response);
        } catch (error) {
            console.error('Dashboard Core: Error loading AI data:', error);
            throw error;
        }
    }

    async apiCall(endpoint, options = {}) {
        const url = `${this.config.apiBaseUrl}${endpoint}`;
        const defaultOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': this.getCSRFToken()
            }
        };

        const finalOptions = { ...defaultOptions, ...options };

        let lastError;
        for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
            try {
                const response = await fetch(url, finalOptions);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return await response.json();
            } catch (error) {
                lastError = error;
                console.warn(`Dashboard Core: API call attempt ${attempt} failed:`, error);
                if (attempt < this.config.maxRetries) {
                    await this.delay(this.config.retryDelay * attempt);
                }
            }
        }
        throw lastError;
    }

    getCSRFToken() {
        const token = document.querySelector('[name=csrfmiddlewaretoken]');
        return token ? token.value : '';
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    setLoading(loading) {
        this.state.isLoading = loading;
        const overlay = document.getElementById('loading-overlay');
        if (loading) {
            overlay.classList.remove('hidden');
        } else {
            overlay.classList.add('hidden');
        }
    }

    updateLastUpdated() {
        this.state.lastUpdate = new Date();
        const element = document.getElementById('last-updated');
        if (element) {
            element.textContent = `Atualizado às ${this.state.lastUpdate.toLocaleTimeString('pt-BR')}`;
        }
    }

    showError(message) {
        this.showToast('error-toast', message);
    }

    showSuccess(message) {
        this.showToast('success-toast', message);
    }

    showToast(toastId, message) {
        const toast = document.getElementById(toastId);
        if (toast) {
            toast.querySelector('.toast-body span').textContent = message;
            const bsToast = new bootstrap.Toast(toast);
            bsToast.show();
        }
    }

    // UI update methods - delegate to appropriate modules
    updateSummaryUI(data) {
        if (window.dashboard.ui && typeof window.dashboard.ui.updateSummaryUI === 'function') {
            window.dashboard.ui.updateSummaryUI(data);
        }
    }
    updateChartsUI(data) {
        if (window.dashboard.charts && typeof window.dashboard.charts.updateChartsUI === 'function') {
            window.dashboard.charts.updateChartsUI(data);
        }
    }
    updateViolationsUI(data) {
        if (window.dashboard.violations && typeof window.dashboard.violations.updateViolationsUI === 'function') {
            window.dashboard.violations.updateViolationsUI(data);
        }
    }
    updateAIUI(data) {
        if (window.dashboard.ai && typeof window.dashboard.ai.updateAIUI === 'function') {
            window.dashboard.ai.updateAIUI(data);
        }
    }
}

// Global dashboard instance - only create if it doesn't exist
if (typeof window.dashboard === 'undefined') {
    window.dashboard = new DashboardCore();
}

// Make core available as a module property
window.dashboard.core = window.dashboard;
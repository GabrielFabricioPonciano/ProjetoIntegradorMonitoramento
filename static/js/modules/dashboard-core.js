/**
 * Dashboard Core Module
 * Core functionality and initialization for the environmental monitoring dashboard
 */

class DashboardCore {
    constructor() {
        this.config = {
            apiBaseUrl: '', // Empty base URL since endpoints already include /api/
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

        // Initialize immediately instead of calling this.init()
        console.log('Dashboard Core: Constructor completed');
    }

    start() {
        console.log('Dashboard Core: Starting...');
        console.log('Dashboard Core: Current state:', this.state);
        this.bindEvents();
        this.startAutoUpdate();
        this.loadInitialData();
        console.log('Dashboard Core: Start completed');
    }

    bindEvents() {
        console.log('Dashboard Core: bindEvents() called');

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

        console.log('Dashboard Core: bindEvents() completed');
    }

    async loadInitialData() {
        console.log('🔄 DASHBOARD-CORE: loadInitialData called at', new Date().toISOString());
        this.setLoading(true);
        try {
            console.log('🔄 DASHBOARD-CORE: Starting to load summary...');
            await this.loadSummary();
            console.log('✅ DASHBOARD-CORE: Summary loaded');

            console.log('🔄 DASHBOARD-CORE: Starting to load series...');
            await this.loadSeries();
            console.log('✅ DASHBOARD-CORE: Series loaded');

            console.log('🔄 DASHBOARD-CORE: Starting to load violations...');
            await this.loadViolations();
            console.log('✅ DASHBOARD-CORE: Violations loaded');

            console.log('🔄 DASHBOARD-CORE: Starting to load AI...');
            await this.loadAI();
            console.log('✅ DASHBOARD-CORE: AI loaded');

            this.updateLastUpdated();
            console.log('🎉 DASHBOARD-CORE: All initial data loaded successfully');
        } catch (error) {
            console.error('❌ DASHBOARD-CORE: Error loading initial data:', error);
            console.error('Stack trace:', error.stack);
            this.showError('Erro ao carregar dados iniciais');
        } finally {
            this.setLoading(false);
        }
    }

    startAutoUpdate() {
        console.log('🚀 Dashboard Core: startAutoUpdate() called at', new Date().toISOString());
        console.log('📊 Dashboard Core: Current config:', this.config);
        console.log('⏰ Dashboard Core: Current intervals:', this.intervals);

        if (this.intervals.autoUpdate) {
            console.log('🧹 Dashboard Core: Clearing existing auto-update interval');
            clearInterval(this.intervals.autoUpdate);
        }

        console.log('⚙️ Dashboard Core: Setting up new auto-update interval with', this.config.updateInterval, 'ms');

        let tickCount = 0;

        this.intervals.autoUpdate = setInterval(() => {
            tickCount++;
            const now = new Date();
            console.log(`🔄 TICK #${tickCount} - AUTO-UPDATE at ${now.toLocaleTimeString()} - Starting data load...`);

            try {
                this.showAutoUpdateStatus();
                console.log(`📈 TICK #${tickCount} - Status updated, calling loadSummary...`);

                this.loadSummary();
                console.log(`📊 TICK #${tickCount} - loadSummary called`);

                this.loadSeries();
                console.log(`📈 TICK #${tickCount} - loadSeries called`);

                this.loadViolations();
                console.log(`🚨 TICK #${tickCount} - loadViolations called`);

                this.loadAI();
                console.log(`🤖 TICK #${tickCount} - loadAI called`);

                this.updateLastUpdated();
                console.log(`✅ TICK #${tickCount} - AUTO-UPDATE COMPLETED at ${new Date().toLocaleTimeString()}`);

            } catch (error) {
                console.error(`❌ TICK #${tickCount} - AUTO-UPDATE ERROR:`, error);
                console.error('Stack trace:', error.stack);
            }
        }, this.config.updateInterval);

        console.log('🎯 Dashboard Core: Auto-update interval set successfully, ID:', this.intervals.autoUpdate);
        console.log('⏳ Next update in', this.config.updateInterval / 1000, 'seconds');
    }

    stopAutoUpdate() {
        if (this.intervals.autoUpdate) {
            clearInterval(this.intervals.autoUpdate);
            this.intervals.autoUpdate = null;
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
        const limitElement = document.getElementById('violations-limit');
        if (limitElement) {
            await this.loadViolations();
        } else {
            console.warn('Dashboard Core: violations-limit element not found');
        }
    }

    async handleViolationFiltersChange() {
        const tempFilterElement = document.getElementById('filter-temp-violations');
        const humidityFilterElement = document.getElementById('filter-humidity-violations');
        if (tempFilterElement && humidityFilterElement) {
            await this.loadViolations();
        } else {
            console.warn('Dashboard Core: Violation filter elements not found');
        }
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
        console.log('🔄 DASHBOARD-CORE: reloadAllData called with period:', this.state.currentPeriod);
        console.log('🔄 DASHBOARD-CORE: Current state:', this.state);
        try {
            console.log('🔄 DASHBOARD-CORE: Starting sequential data reload...');

            console.log('🔄 DASHBOARD-CORE: Loading summary...');
            await this.loadSummary();
            console.log('✅ DASHBOARD-CORE: Summary reloaded');

            console.log('🔄 DASHBOARD-CORE: Loading series...');
            await this.loadSeries();
            console.log('✅ DASHBOARD-CORE: Series reloaded');

            console.log('🔄 DASHBOARD-CORE: Loading violations...');
            await this.loadViolations();
            console.log('✅ DASHBOARD-CORE: Violations reloaded');

            console.log('🔄 DASHBOARD-CORE: Loading AI...');
            await this.loadAI();
            console.log('✅ DASHBOARD-CORE: AI reloaded');

            this.updateLastUpdated();
            console.log('🎉 DASHBOARD-CORE: reloadAllData completed successfully');
        } catch (error) {
            console.error('❌ DASHBOARD-CORE: Error reloading data:', error);
            console.error('Stack trace:', error.stack);
            throw error;
        }
    }

    async loadSummary() {
        try {
            console.log('📊 DASHBOARD-CORE: loadSummary called');
            const url = `/api/summary/?days=${this.state.currentPeriod}`;
            const response = await this.apiCall(url);
            this.state.data.summary = response;
            this.updateSummaryUI(response);
        } catch (error) {
            console.error('❌ DASHBOARD-CORE: Error loading summary:', error);
            throw error;
        }
    }

    async loadSeries() {
        try {
            const response = await this.apiCall(`/api/series/?days=${this.state.currentPeriod}`);
            this.state.data.series = response;
            this.updateChartsUI(response);
        } catch (error) {
            console.error('Dashboard Core: Error loading series:', error);
            throw error;
        }
    }

    async loadViolations() {
        try {
            const limitElement = document.getElementById('violations-limit');
            const tempFilterElement = document.getElementById('filter-temp-violations');
            const humidityFilterElement = document.getElementById('filter-humidity-violations');

            if (!limitElement || !tempFilterElement || !humidityFilterElement) {
                console.warn('Dashboard Core: Violation filter elements not found, using defaults');
                const response = await this.apiCall(`/api/violations/?days=${this.state.currentPeriod}&limit=10`);
                this.state.data.violations = response;
                this.updateViolationsUI(response);
                return;
            }

            const limit = limitElement.value;
            const tempFilter = tempFilterElement.checked;
            const humidityFilter = humidityFilterElement.checked;

            let url = `/api/violations/?days=${this.state.currentPeriod}&limit=${limit}`;
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
            const response = await this.apiCall(`/api/ai/insights/?days=${this.state.currentPeriod}`);
            this.state.data.ai = response;
            this.updateAIUI(response);
        } catch (error) {
            console.error('Dashboard Core: Error loading AI data:', error);
            throw error;
        }
    }

    async apiCall(endpoint, options = {}) {
        console.log('🔗 DASHBOARD-CORE: apiCall called with endpoint:', endpoint);
        const url = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        console.log('🔗 DASHBOARD-CORE: Full URL constructed:', url);

        const defaultOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': this.getCSRFToken()
            }
        };

        const finalOptions = { ...defaultOptions, ...options };
        console.log('🔗 DASHBOARD-CORE: Final options:', finalOptions);

        let lastError;
        for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
            try {
                console.log(`🔗 DASHBOARD-CORE: Attempt ${attempt} - Fetching:`, url);
                const response = await fetch(url, finalOptions);
                console.log(`🔗 DASHBOARD-CORE: Response status:`, response.status);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();
                console.log('🔗 DASHBOARD-CORE: Response data received, length:', JSON.stringify(data).length);
                return data;
            } catch (error) {
                console.warn(`🔗 DASHBOARD-CORE: API call attempt ${attempt} failed:`, error);
                lastError = error;
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

    updateSummaryUI(data) {
        console.log('Dashboard Core: updateSummaryUI called with data:', data);
        console.log('Dashboard Core: Checking if dashboard.ui exists:', !!window.dashboard.ui);
        console.log('Dashboard Core: Checking if updateSummaryUI method exists:', !!(window.dashboard.ui && typeof window.dashboard.ui.updateSummaryUI === 'function'));

        if (window.dashboard.ui && typeof window.dashboard.ui.updateSummaryUI === 'function') {
            console.log('Dashboard Core: Calling dashboard.ui.updateSummaryUI');
            window.dashboard.ui.updateSummaryUI(data);
            console.log('Dashboard Core: dashboard.ui.updateSummaryUI completed');
        } else {
            console.error('Dashboard Core: dashboard.ui.updateSummaryUI not available');
            console.error('Dashboard Core: window.dashboard:', window.dashboard);
            console.error('Dashboard Core: window.dashboard.ui:', window.dashboard.ui);
        }

        // Force show KPIs directly
        this.forceShowKPIs();
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

    debug() {
        console.log('=== DASHBOARD DEBUG INFO ===');
        console.log('Config:', this.config);
        console.log('State:', this.state);
        console.log('Intervals:', this.intervals);
        console.log('Auto-update active:', !!this.intervals.autoUpdate);
        console.log('Time since last update:', this.state.lastUpdate ? (new Date() - this.state.lastUpdate) + 'ms' : 'Never');
        console.log('Current period:', this.state.currentPeriod);
        console.log('Is loading:', this.state.isLoading);
        console.log('UI module available:', !!window.dashboard.ui);
        console.log('Charts module available:', !!window.dashboard.charts);
        console.log('Violations module available:', !!window.dashboard.violations);
        console.log('AI module available:', !!window.dashboard.ai);
        console.log('=== END DEBUG INFO ===');
        return {
            config: this.config,
            state: this.state,
            intervals: this.intervals,
            modules: {
                ui: !!window.dashboard.ui,
                charts: !!window.dashboard.charts,
                violations: !!window.dashboard.violations,
                ai: !!window.dashboard.ai
            }
        };
    }

    // Force show KPIs if UI module fails
    forceShowKPIs() {
        console.log('🔧 DASHBOARD-CORE: forceShowKPIs called');
        const kpis = ['temp', 'humidity', 'violations', 'measurements'];
        kpis.forEach(kpi => {
            const skeleton = document.getElementById(`${kpi}-skeleton`);
            const content = document.getElementById(`${kpi}-content`);

            if (skeleton && content) {
                console.log(`🔧 FORCE-SHOW: Processing ${kpi} - skeleton:`, skeleton, 'content:', content);
                skeleton.style.setProperty('display', 'none', 'important');
                content.style.setProperty('display', 'block', 'important');
                content.style.setProperty('visibility', 'visible', 'important');
                content.style.setProperty('opacity', '1', 'important');
                console.log(`✅ FORCE-SHOW: ${kpi} forced to show`);
            } else {
                console.warn(`⚠️ FORCE-SHOW: ${kpi} elements missing - skeleton:`, !!skeleton, 'content:', !!content);
            }
        });
    }

    // Force manual update for testing
    forceUpdate() {
        console.log('🔧 MANUAL UPDATE TRIGGERED');
        this.showAutoUpdateStatus();
        this.loadSummary();
        this.loadSeries();
        this.loadViolations();
        this.loadAI();
        this.updateLastUpdated();
        console.log('✅ MANUAL UPDATE COMPLETED');
    }

    // Download report method
    downloadReport(format, days) {
        console.log(`Dashboard Core: Downloading ${format} report for ${days} days...`);
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

    // Show auto-update status
    showAutoUpdateStatus() {
        console.log('Dashboard Core: Auto-update status - Active:', !!this.intervals.autoUpdate);
        if (this.intervals.autoUpdate) {
            console.log('Dashboard Core: Next update in approximately', Math.round(this.config.updateInterval / 1000), 'seconds');
        }
    }
}

// Global dashboard object - only create if it doesn't exist
if (typeof window.dashboard === 'undefined') {
    window.dashboard = {};
}

// Create core instance and assign to dashboard object
window.dashboard.core = new DashboardCore();

// Expose apiCall globally for other modules
window.dashboard.apiCall = window.dashboard.core.apiCall.bind(window.dashboard.core);
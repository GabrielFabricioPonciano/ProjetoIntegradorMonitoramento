// dashboard-main.js - Dashboard principal modularizado
import { CONFIG, DOM_ELEMENTS } from './modules/config.js';
import { Utils } from './modules/utils.js';
import { APIManager } from './modules/api.js';
import { NotificationManager } from './modules/notifications.js';
import { UIManager } from './modules/ui.js';
import { KPIManager } from './modules/kpis.js';
import { ChartManager } from './modules/charts.js';
import { ReportManager } from './modules/reports.js';

class EnvironmentalDashboard {
    constructor() {
        // Inicializar gerenciadores
        this.api = new APIManager();
        this.notifications = new NotificationManager();
        this.ui = new UIManager();
        this.kpis = new KPIManager();
        this.charts = new ChartManager();
        this.reports = new ReportManager(this.notifications);

        // Estado
        this.currentPeriod = CONFIG.DEFAULT_PERIOD;
        this.autoRefreshInterval = null;
        this.autoRefreshEnabled = true;

        // Dados
        this.data = null;

        this.init();
    }

    async init() {
        Utils.logInfo('Dashboard', 'Inicializando dashboard modularizado...');

        this.setupEventListeners();
        this.ui.showLoading();

        // Aguardar dependências estarem carregadas
        await this.waitForDependencies();

        try {
            // Carregar dados
            await this.loadData();
            Utils.logInfo('Dashboard', 'Dados carregados');

            // Atualizar KPIs
            this.updateKPIs();
            Utils.logInfo('Dashboard', 'KPIs atualizados');

            // Aguardar mais tempo antes de criar gráficos
            await Utils.delay(500);

            // Preparar containers primeiro
            this.ui.prepareChartContainers();

            // Criar gráficos com delay adicional
            await Utils.delay(200);
            await this.createCharts();
            Utils.logInfo('Dashboard', 'Gráficos criados');

            this.ui.updateLastUpdatedTime();
            this.startAutoRefresh();

            Utils.logInfo('Dashboard', 'Dashboard inicializado com sucesso!');

        } catch (error) {
            Utils.logError('Dashboard', 'Erro ao inicializar dashboard', error);
            this.notifications.showError('Erro ao carregar dados do dashboard');
        } finally {
            this.ui.hideLoading();
        }
    }

    async waitForDependencies() {
        Utils.logInfo('Dashboard', 'Aguardando dependências...');

        let attempts = 0;
        const maxAttempts = 50; // 5 segundos máximo

        while (attempts < maxAttempts) {
            if (typeof Chart !== 'undefined' && typeof bootstrap !== 'undefined') {
                Utils.logInfo('Dashboard', 'Todas as dependências carregadas');
                return;
            }

            await Utils.delay(100);
            attempts++;
        }

        if (typeof Chart === 'undefined') {
            Utils.logError('Dashboard', 'Chart.js não foi carregado após timeout');
        }
        if (typeof bootstrap === 'undefined') {
            Utils.logError('Dashboard', 'Bootstrap não foi carregado após timeout');
        }
    }

    setupEventListeners() {
        Utils.logInfo('Dashboard', 'Configurando event listeners...');

        // Seletor de período
        const periodRadios = document.querySelectorAll('input[name="period"]');
        periodRadios.forEach(radio => {
            radio.addEventListener('change', async (e) => {
                const newPeriod = parseInt(e.target.value);
                if (newPeriod !== this.currentPeriod) {
                    this.currentPeriod = newPeriod;
                    await this.refreshData(); // Sempre dados em tempo real
                }
            });
        });

        // Botão de forçar ciclo
        const forceCycleBtn = Utils.getElementById(DOM_ELEMENTS.forceCycleBtn);
        if (forceCycleBtn) {
            forceCycleBtn.addEventListener('click', () => this.forceCycle());
        }

        // Event listeners globais para relatórios (função global para HTML)
        window.downloadReport = (type, days) => this.reports.downloadReport(type, days);

        Utils.logInfo('Dashboard', 'Event listeners configurados');
    }

    async loadData() {
        Utils.logInfo('Dashboard', `Carregando dados em tempo real para ${this.currentPeriod} dias`);

        try {
            this.data = await this.api.loadAllData(this.currentPeriod);
            Utils.logInfo('Dashboard', 'Dados carregados com sucesso', {
                summary: this.data.summary,
                seriesCount: this.data.series.length,
                violationsCount: this.data.violations.length
            });
        } catch (error) {
            Utils.logError('Dashboard', 'Erro ao carregar dados', error);
            throw error;
        }
    }

    updateKPIs() {
        if (!this.data) {
            Utils.logError('Dashboard', 'Dados não disponíveis para atualizar KPIs');
            return;
        }

        this.kpis.updateKPIs(this.data, this.data.violations);
        this.kpis.updateViolationsTable(this.data.violations);
        this.ui.hideSkeletons();
    }

    async createCharts() {
        if (!this.data) {
            Utils.logError('Dashboard', 'Dados não disponíveis para criar gráficos');
            return;
        }

        await this.charts.createCharts(this.data);
        this.ui.showChartContainers();
    }

    async refreshData() {
        Utils.logInfo('Dashboard', 'Atualizando dados em tempo real...');
        this.ui.showLoading();

        try {
            await this.loadData();
            this.updateKPIs();
            await this.charts.updateCharts(this.data);
            this.ui.updateLastUpdatedTime();
            this.notifications.dataLoadSuccess();
        } catch (error) {
            Utils.logError('Dashboard', 'Erro ao atualizar dados', error);
            this.notifications.apiError('atualização', error);
        } finally {
            this.ui.hideLoading();
        }
    }

    async forceCycle() {
        Utils.logInfo('Dashboard', 'Forçando ciclo do simulador');

        try {
            await this.api.forceCycle();
            this.notifications.cycleForced();

            // Aguardar mais tempo para o servidor processar e recarregar dados
            await Utils.delay(3000);
            await this.refreshData(); // Sempre dados em tempo real

        } catch (error) {
            Utils.logError('Dashboard', 'Erro ao forçar ciclo', error);
            this.notifications.apiError('ciclo forçado', error);
        }
    }

    startAutoRefresh() {
        if (!this.autoRefreshEnabled) return;

        this.autoRefreshInterval = setInterval(async () => {
            try {
                if (!this.ui.isLoading) {
                    Utils.logInfo('Dashboard', 'Auto-refresh executando...');
                    await this.refreshData();
                }
            } catch (error) {
                Utils.logError('Dashboard', 'Erro no auto-refresh', error);
            }
        }, CONFIG.AUTO_REFRESH_INTERVAL);

        Utils.logInfo('Dashboard', `Auto-refresh iniciado com intervalo de ${CONFIG.AUTO_REFRESH_INTERVAL}ms`);
    }

    stopAutoRefresh() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
            Utils.logInfo('Dashboard', 'Auto-refresh parado');
        }
    }

    // Método para aplicar período personalizado
    async applyCustomPeriod() {
        try {
            const startDateElement = Utils.getElementById('start-date');
            const endDateElement = Utils.getElementById('end-date');

            if (!startDateElement || !endDateElement) {
                Utils.logError('Dashboard', 'Campos de data não encontrados no DOM');
                this.notifications.showError('Campos de data não encontrados');
                return;
            }

            const startDate = startDateElement.value;
            const endDate = endDateElement.value;

            if (!startDate || !endDate) {
                this.notifications.showError('Por favor, selecione as datas de início e fim');
                return;
            }

            const start = new Date(startDate);
            const end = new Date(endDate);

            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                this.notifications.showError('Datas inválidas');
                return;
            }

            if (start >= end) {
                this.notifications.showError('Data de início deve ser anterior à data de fim');
                return;
            }

            // Calcular período em dias
            const diffTime = Math.abs(end - start);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays > 365) {
                this.notifications.showError('Período máximo é de 365 dias');
                return;
            }

            // Para período personalizado, usar a API diretamente
            // (seria necessário implementar endpoint específico)
            this.notifications.showError('Período personalizado ainda não implementado na API');

        } catch (error) {
            Utils.logError('Dashboard', 'Erro no período personalizado', error);
            this.notifications.showError('Erro ao aplicar período personalizado');
        }
    }

    // Métodos de diagnóstico
    getState() {
        return {
            currentPeriod: this.currentPeriod,
            hasData: !!this.data,
            dataCount: this.data ? this.data.series.length : 0,
            violationsCount: this.data ? this.data.violations.length : 0,
            autoRefreshEnabled: this.autoRefreshEnabled,
            ui: this.ui.getState(),
            temperatureStatus: this.kpis.getTemperatureStatus(),
            humidityStatus: this.kpis.getHumidityStatus(),
            overallStatus: this.kpis.getOverallStatus()
        };
    }

    // Cleanup
    destroy() {
        this.stopAutoRefresh();
        this.charts.destroyCharts();
        this.api.clearCache();
        Utils.logInfo('Dashboard', 'Dashboard destruído');
    }
}

// Inicializar dashboard quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    Utils.logInfo('Dashboard', 'DOM carregado, inicializando dashboard...');
    window.dashboard = new EnvironmentalDashboard();
});

// Exportar para debug
window.EnvironmentalDashboard = EnvironmentalDashboard;

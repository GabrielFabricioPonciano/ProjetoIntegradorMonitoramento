// dashboard-core.js - Core dashboard functionality
class EnvironmentalDashboard {
    constructor() {
        this.charts = {};
        this.data = {};
        this.violations = null;
        this.isLoading = false;
        this.currentPeriod = 30;
        this.lastUpdated = null;
        this.autoRefreshEnabled = true;
        this.autoRefreshInterval = null;

        this.numberFormatter = new Intl.NumberFormat('pt-BR', {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1
        });

        this.init();
    }

    async init() {
        console.log('Inicializando dashboard...');
        this.setupEventListeners();
        this.showLoading();

        // Aguardar um pouco para garantir que Chart.js está completamente carregado
        await new Promise(resolve => setTimeout(resolve, 100));

        try {
            // Carregar dados
            await this.loadData();
            console.log('Dados carregados');

            // Carregar violações
            await this.loadViolations();
            console.log('Violações carregadas');

            // Atualizar KPIs
            this.updateKPIs();
            console.log('KPIs atualizados');

            // Aguardar antes de criar gráficos
            await new Promise(resolve => setTimeout(resolve, 500));
            this.prepareChartContainers();
            await new Promise(resolve => setTimeout(resolve, 200));
            this.createCharts();
            console.log('Gráficos criados');

            this.updateLastUpdatedTime();
            this.startAutoRefresh();
            console.log('Dashboard inicializado com sucesso!');

            // Carregar IA
            await this.loadAI();
            console.log('IA carregada');
        } catch (error) {
            console.error('Erro ao inicializar dashboard:', error);
            this.showErrorToast('Erro ao carregar dados do dashboard');
        } finally {
            this.hideLoading();
        }
    }

    setupEventListeners() {
        console.log('Configurando event listeners...');

        // Seletor de período
        const periodRadios = document.querySelectorAll('input[name="period"]');
        periodRadios.forEach(radio => {
            radio.addEventListener('change', async (e) => {
                // Se for período personalizado, não atualizar automaticamente
                if (e.target.id === 'period-custom') {
                    return;
                }
                this.currentPeriod = parseInt(e.target.value);
                await this.refreshData();
            });
        });

        // Botão forçar ciclo
        const forceCycleBtn = document.getElementById('force-cycle-btn');
        if (forceCycleBtn) {
            forceCycleBtn.addEventListener('click', () => this.forceCycle());
        }

        // Filtros de violações
        const tempFilter = document.getElementById('filter-temp-violations');
        const humidityFilter = document.getElementById('filter-humidity-violations');
        const limitSelect = document.getElementById('violations-limit');

        if (tempFilter) {
            tempFilter.addEventListener('change', () => this.filterViolations());
        }
        if (humidityFilter) {
            humidityFilter.addEventListener('change', () => this.filterViolations());
        }
        if (limitSelect) {
            limitSelect.addEventListener('change', async () => {
                await this.loadViolations();
            });
        }
    }

    async loadData() {
        console.log('Carregando dados...');
        const summaryUrl = `/api/summary?days=${this.currentPeriod}`;
        const seriesUrl = `/api/series?days=${this.currentPeriod}&max_points=1000`;

        console.log('URLs:', { summaryUrl, seriesUrl });

        try {
            const [summaryResponse, seriesResponse] = await Promise.all([
                fetch(summaryUrl),
                fetch(seriesUrl)
            ]);

            if (!summaryResponse.ok) throw new Error(`Erro ao carregar resumo: ${summaryResponse.status}`);
            if (!seriesResponse.ok) throw new Error(`Erro ao carregar série: ${seriesResponse.status}`);

            const summary = await summaryResponse.json();
            const series = await seriesResponse.json();

            this.data = { summary, series };
            console.log('Dados carregados:', { summary, seriesCount: series.length });
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            throw error;
        }
    }

    async refreshData() {
        console.log('Atualizando dados...');
        this.showLoading();
        try {
            await this.loadData();
            await this.loadViolations();
            this.updateKPIs();
            this.createCharts();
            this.updateLastUpdatedTime();
            this.showSuccessToast('Dados atualizados com sucesso!');
        } catch (error) {
            console.error('Erro ao atualizar dados:', error);
            this.showErrorToast('Erro ao atualizar dados');
        } finally {
            this.hideLoading();
        }
    }

    startAutoRefresh() {
        if (!this.autoRefreshEnabled) return;

        this.autoRefreshInterval = setInterval(async () => {
            try {
                await this.refreshData();
            } catch (error) {
                console.error('Erro no auto-refresh:', error);
            }
        }, 60000); // 60 segundos

        console.log('Auto-refresh ativado (60s)');
    }

    updateLastUpdatedTime() {
        this.lastUpdated = new Date();
        const lastUpdatedEl = document.getElementById('last-updated');
        if (lastUpdatedEl) {
            const timeStr = this.lastUpdated.toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit'
            });
            const dateStr = this.lastUpdated.toLocaleDateString('pt-BR');
            lastUpdatedEl.innerHTML = `<i class="fas fa-clock me-1"></i>Atualizado às ${timeStr} (${dateStr})`;
        }
    }

    async forceCycle() {
        console.log('Forçando ciclo do simulador...');
        this.showLoading();

        try {
            const response = await fetch('/api/force-cycle', { method: 'POST' });
            const result = await response.json();

            if (result.success) {
                this.showSuccessToast('Ciclo executado com sucesso!');
                await this.refreshData();
            } else {
                this.showErrorToast('Erro ao executar ciclo: ' + result.message);
            }
        } catch (error) {
            console.error('Erro ao forçar ciclo:', error);
            this.showErrorToast('Erro ao executar ciclo');
        } finally {
            this.hideLoading();
        }
    }

    showLoading() {
        console.log('Mostrando loading...');
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.remove('hidden');
            console.log('Loading overlay mostrado');
        }
    }

    hideLoading() {
        console.log('=== INICIANDO hideLoading() ===');

        // Esconder overlay principal
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.add('hidden');
            console.log('✅ Loading overlay escondido');
        } else {
            console.warn('❌ Loading overlay não encontrado');
        }

        // Esconder skeleton loaders / mostrar conteúdo
        const skeletonElements = [
            { skeleton: 'temp-skeleton', content: 'temp-content' },
            { skeleton: 'humidity-skeleton', content: 'humidity-content' },
            { skeleton: 'violations-skeleton', content: 'violations-content' },
            { skeleton: 'measurements-skeleton', content: 'measurements-content' }
        ];

        console.log('=== PROCESSANDO SKELETONS ===');

        skeletonElements.forEach(({ skeleton, content }) => {
            const skeletonEl = document.getElementById(skeleton);
            const contentEl = document.getElementById(content);

            console.log(`Processando ${skeleton}:`, {
                skeletonExists: !!skeletonEl,
                contentExists: !!contentEl,
                skeletonVisible: skeletonEl ? skeletonEl.style.display !== 'none' : false,
                contentVisible: contentEl ? contentEl.style.display !== 'none' : false
            });

            if (skeletonEl) {
                skeletonEl.style.display = 'none';
                console.log(`✅ ${skeleton} escondido`);
            } else {
                console.warn(`❌ ${skeleton} não encontrado`);
            }

            if (contentEl) {
                contentEl.style.display = 'block';
                console.log(`✅ ${content} mostrado`);
            } else {
                console.warn(`❌ ${content} não encontrado`);
            }
        });

        console.log('=== hideLoading() FINALIZADO ===');
    }

    showSuccessToast(message) {
        console.log('SUCCESS:', message);
        this.showToast('success-toast', 'success-message', message);
    }

    showErrorToast(message) {
        console.error('ERROR:', message);
        this.showToast('error-toast', 'error-message', message);
    }

    showToast(toastId, messageId, message) {
        const toastEl = document.getElementById(toastId);
        const messageEl = document.getElementById(messageId);

        if (toastEl && messageEl) {
            messageEl.textContent = message;
            const toast = new bootstrap.Toast(toastEl);
            toast.show();
        }
    }

    // Método para aplicar período personalizado
    async applyCustomPeriod() {
        const slider = document.getElementById('period-slider');
        if (!slider) {
            console.error('Slider não encontrado');
            return;
        }

        const days = parseInt(slider.value);
        console.log('Aplicando período personalizado:', days, 'dias');

        // Atualizar período atual
        this.currentPeriod = days;

        // Recarregar dados
        await this.refreshData();

        // Feedback visual
        this.showSuccessToast(`Período personalizado de ${days} dias aplicado!`);
    }
}

// Inicialização quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function () {
    console.log('DOM carregado, inicializando dashboard...');

    // Verificar dependências
    const checks = {
        Chart: typeof Chart !== 'undefined',
        bootstrap: typeof bootstrap !== 'undefined',
        fetch: typeof fetch !== 'undefined'
    };

    console.log('Verificação de dependências:', checks);

    if (!checks.Chart) {
        console.error('ERRO CRÍTICO: Chart.js não está carregado');
        alert('Erro: Chart.js não foi carregado. Verifique a conexão com a internet.');
        return;
    }

    if (!checks.bootstrap) {
        console.warn('AVISO: Bootstrap JS não está carregado - dropdowns podem não funcionar');
    }

    if (!checks.fetch) {
        console.error('ERRO CRÍTICO: Fetch API não suportada pelo navegador');
        return;
    }

    console.log('Chart.js versão:', Chart.version || 'versão desconhecida');

    // Inicializar dashboard
    try {
        const dashboard = new EnvironmentalDashboard();
        // Expor para uso global
        window.dashboard = dashboard;
        console.log('Dashboard inicializado globalmente!');
    } catch (error) {
        console.error('Erro fatal ao inicializar dashboard:', error);
        alert('Erro fatal ao carregar o dashboard. Verifique o console para detalhes.');
    }
});

// Função global para download de relatórios
function downloadReport(format, days) {
    console.log(`Tentando baixar relatório ${format} para ${days} dias...`);
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
/**
 * Dashboard Core Module (Refatorado)
 * Gerencia o estado, busca de dados e a comunicação entre os componentes do dashboard.
 * 
 * MELHORIAS:
 * - Desacoplamento: Usa um sistema de registro de componentes em vez de acessar 'window' diretamente.
 * - Eficiência: Busca todos os dados necessários (summary, series) em paralelo com uma única função.
 * - Consistência: A atualização automática agora recarrega todos os dados, não apenas o resumo.
 * - Boas Práticas: Remove a manipulação de CSS com '!important', sugerindo uma abordagem baseada em classes.
 * - Robustez: Centraliza o tratamento de erros e o gerenciamento do estado de carregamento.
 */
class DashboardCore {
    constructor(config = {}) {
        // Configurações padrão que podem ser sobrescritas na instanciação
        this.config = {
            defaultPeriodDays: 30,
            updateIntervalMs: 30000,
            apiMaxRetries: 3,
            apiRetryDelayMs: 1000,
            ...config
        };

        this.state = {
            currentPeriodDays: this.config.defaultPeriodDays,
            isLoading: false,
            lastUpdate: null,
        };

        // Armazena referências para outros módulos (UI, Gráficos) de forma desacoplada
        this.components = {};
        this.autoUpdateInterval = null;
    }

    /**
     * Inicializa o core do dashboard.
     */
    init() {
        console.log("Dashboard Core inicializado.");
        this.updateData(); // Carrega os dados iniciais
        this.startAutoUpdate();
    }

    /**
     * Permite que outros módulos (ui.js, charts.js) se registrem no core.
     * Isso remove a dependência direta do 'window.dashboard'.
     * @param {string} name - O nome do componente (ex: 'ui', 'charts').
     * @param {object} component - A instância do componente.
     */
    registerComponent(name, component) {
        this.components[name] = component;
        console.log(`Componente '${name}' registrado.`);
    }

    /**
     * Função centralizada para buscar TODOS os dados da API.
     * É chamada na inicialização e no intervalo de auto-update.
     */
    async updateData() {
        if (this.state.isLoading) {
            console.warn("Update cancelado: uma atualização já está em andamento.");
            return;
        }

        this.setLoading(true);
        console.log(`Atualizando dados para o período de ${this.state.currentPeriodDays} dias...`);

        try {
            // Executa as chamadas de API em paralelo para maior performance
            const [summaryData, seriesData] = await Promise.all([
                this.apiCall(`/api/summary/?days=${this.state.currentPeriodDays}`),
                this.apiCall(`/api/series/?days=${this.state.currentPeriodDays}`)
            ]);

            // Notifica os componentes registrados com os novos dados
            if (this.components.ui && typeof this.components.ui.updateSummaryUI === 'function') {
                this.components.ui.updateSummaryUI(summaryData);
                if (typeof this.components.ui.updateViolations === 'function') {
                    this.components.ui.updateViolations(seriesData.violations);
                }
            } else {
                console.log('Componente UI não disponível ou função updateSummaryUI não encontrada');
            }
            if (this.components.charts && typeof this.components.charts.updateCharts === 'function') {
                this.components.charts.updateCharts(seriesData);
            } else {
                console.log('Componente charts não disponível ou função updateCharts não encontrada');
            }

            this.updateLastUpdated();
            console.log("Dados atualizados com sucesso.");

        } catch (error) {
            console.error('Falha ao atualizar os dados:', error);
            this.showBasicError(`Erro ao carregar dados: ${error.message}`);
        } finally {
            this.setLoading(false);
        }
    }

    startAutoUpdate() {
        this.stopAutoUpdate(); // Garante que não haja múltiplos intervalos rodando
        this.autoUpdateInterval = setInterval(() => {
            this.updateData();
        }, this.config.updateIntervalMs);
        console.log(`Atualização automática iniciada a cada ${this.config.updateIntervalMs / 1000}s.`);
    }

    stopAutoUpdate() {
        if (this.autoUpdateInterval) {
            clearInterval(this.autoUpdateInterval);
            this.autoUpdateInterval = null;
        }
    }

    /**
     * Realiza uma chamada de API com lógica de retentativa.
     * @param {string} endpoint - O endpoint da API (ex: '/api/summary/').
     * @param {object} options - Opções para a função fetch().
     */
    async apiCall(endpoint, options = {}) {
        const defaultOptions = {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        };

        // Adiciona o token CSRF apenas para métodos que alteram dados
        if (options.method && !['GET', 'HEAD', 'OPTIONS'].includes(options.method.toUpperCase())) {
            defaultOptions.headers['X-CSRFToken'] = this.getCSRFToken();
        }

        const finalOptions = { ...defaultOptions, ...options, headers: { ...defaultOptions.headers, ...options.headers } };

        for (let attempt = 1; attempt <= this.config.apiMaxRetries; attempt++) {
            try {
                const response = await fetch(endpoint, finalOptions);
                if (!response.ok) {
                    throw new Error(`Erro na requisição: ${response.status} ${response.statusText}`);
                }
                return await response.json();
            } catch (error) {
                if (attempt === this.config.apiMaxRetries) throw error; // Lança o erro na última tentativa
                await new Promise(resolve => setTimeout(resolve, this.config.apiRetryDelayMs * attempt));
            }
        }
    }

    // --- Métodos Utilitários e de UI ---

    getCSRFToken() {
        const tokenEl = document.querySelector('input[name="csrfmiddlewaretoken"]');
        return tokenEl ? tokenEl.value : '';
    }

    setLoading(isLoading) {
        this.state.isLoading = isLoading;
        const body = document.body;
        // A melhor prática é controlar a visibilidade dos skeletons via CSS
        // Adicionando/removendo uma classe no body ou em um container principal.
        if (isLoading) {
            body.classList.add('is-loading');
        } else {
            body.classList.remove('is-loading');
        }
    }

    updateLastUpdated() {
        this.state.lastUpdate = new Date();
        const element = document.getElementById('last-updated');
        if (element) {
            const timeString = this.state.lastUpdate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            element.textContent = `Atualizado às ${timeString}`;
        }
    }

    /**
     * Função básica para mostrar erros quando o componente UI não está disponível
     */
    showBasicError(message) {
        // Criar ou atualizar um elemento de erro simples
        let errorElement = document.getElementById('dashboard-error');
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.id = 'dashboard-error';
            errorElement.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #f8d7da;
                color: #721c24;
                border: 1px solid #f5c6cb;
                border-radius: 4px;
                padding: 12px;
                max-width: 300px;
                z-index: 1000;
                font-size: 14px;
            `;
            document.body.appendChild(errorElement);
        }

        errorElement.textContent = message;
        errorElement.style.display = 'block';

        // Auto-hide após 5 segundos
        setTimeout(() => {
            errorElement.style.display = 'none';
        }, 5000);
    }
}

// Disponibilizar a classe globalmente
if (typeof window !== 'undefined') {
    window.DashboardCore = DashboardCore;
}

/* 
No seu CSS, você controlaria os skeletons assim:

.kpi-content {
    display: none;
}
.kpi-skeleton {
    display: block;
}

.is-loading .kpi-content {
    display: none;
}
.is-loading .kpi-skeleton {
    display: block;
}

body:not(.is-loading) .kpi-content {
    display: block;
}
body:not(.is-loading) .kpi-skeleton {
    display: none;
}

Isso elimina a necessidade do método `forceShowKPIs` com `!important`.
*/
/**
 * Dashboard Core Module (Refatorado e Melhorado)
 * Gerencia o estado, busca de dados e a comunicação entre os componentes do dashboard.
 *
 * MELHORIAS IMPLEMENTADAS:
 * - Sistema de c            const [summaryData, seriesData] = await Promise.all([
                this.apiCall(`/api/summary/`), // Removido o filtro de dias para pegar todos os dados
                this.apiCall(`/api/series/?max_points=100`) // Também removido o filtro de dias
            ]);guração centralizado
 * - Tratamento de erros robusto
 * - Monitoramento de performance
 * - Validações de dados
 * - Sistema de cache inteligente
 * - Retry automático com backoff
 * - Logging estruturado
 * - Métricas de uso
 */
class DashboardCore {
    constructor(config = null, errorHandler = null, performanceMonitor = null) {
        // Configurações padrão como fallback
        this.defaultConfig = {
            api: {
                baseUrl: '/api',
                maxRetries: 3,
                retryDelay: 1000
            },
            ui: {
                updateInterval: 30000,
                defaultPeriodDays: 30
            },
            features: {
                autoUpdate: true
            },
            cache: {
                duration: 300000, // 5 minutos
                cleanupInterval: 3600000 // 1 hora
            }
        };

        // Usar configuração passada, ou global, ou padrão
        this.config = config || window.dashboardConfig || this.defaultConfig;

        // Inicializar sistemas auxiliares
        this.errorHandler = errorHandler || window.dashboardErrorHandler;
        this.performanceMonitor = performanceMonitor || window.dashboardPerformanceMonitor;

        // Estado do dashboard
        this.state = {
            currentPeriodDays: this.getConfig('ui.defaultPeriodDays', 30),
            isLoading: false,
            lastUpdate: null,
            cache: new Map(),
            retryAttempts: new Map()
        };

        // Armazena referências para outros módulos (UI, Gráficos) de forma desacoplada
        this.components = {};

        // Sistema de atualização automática
        this.autoUpdateInterval = null;
        this.isDestroyed = false;

        // Métricas
        this.metrics = {
            apiCalls: 0,
            successfulUpdates: 0,
            failedUpdates: 0,
            averageResponseTime: 0
        };
    }

    /**
     * Método helper para obter configurações de forma unificada
     * @param {string} path - Caminho da configuração
     * @param {*} defaultValue - Valor padrão
     * @returns {*} Valor da configuração
     */
    getConfig(path, defaultValue = null) {
        // Se for uma instância do DashboardConfig, usar o método get
        if (this.config && typeof this.config.get === 'function') {
            return this.config.get(path, defaultValue);
        }

        // Caso contrário, navegar no objeto diretamente
        const keys = path.split('.');
        let value = this.config;

        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                return defaultValue;
            }
        }

        return value;
    }

    /**
     * Inicializa o core do dashboard.
     */
    init() {
        const timerId = this.performanceMonitor ?
            this.performanceMonitor.startTimer('core_init', { component: 'core' }) : null;

        try {
            console.log("Dashboard Core inicializado com configurações:", this.config);

            // Validar configurações críticas
            this.validateConfiguration();

            // Carregar dados iniciais
            this.updateData();

            // Iniciar atualização automática se habilitada
            if (this.getConfig('features.autoUpdate', true)) {
                this.startAutoUpdate();
            }

            if (timerId) {
                this.performanceMonitor.endTimer(timerId, { success: true });
            }

        } catch (error) {
            if (timerId) {
                this.performanceMonitor.endTimer(timerId, { success: false, error: error.message });
            }

            this.handleError(error, {
                component: 'core',
                operation: 'init',
                recoverable: false
            });
        }
    }

    /**
     * Valida configurações críticas
     */
    validateConfiguration() {
        const requiredConfigs = [
            { path: 'api.baseUrl', default: '/api' },
            { path: 'ui.updateInterval', default: 30000 }
        ];

        for (const { path, default: defaultValue } of requiredConfigs) {
            const value = this.getConfig(path, defaultValue);
            if (value === null || value === undefined) {
                throw new Error(`Configuração obrigatória não encontrada: ${path}`);
            }
        }

        console.log('Configurações validadas com sucesso');
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
        const timerId = this.performanceMonitor ?
            this.performanceMonitor.startTimer('data_update', { component: 'core' }) : null;

        if (this.state.isLoading) {
            console.warn("Update cancelado: uma atualização já está em andamento.");
            return;
        }

        this.setLoading(true);
        console.log(`🔄 updateData() iniciado - buscando todos os dados...`);

        try {
            console.log('🌐 Fazendo chamadas à API...');
            // Executa as chamadas de API em paralelo para maior performance
            const [summaryData, seriesData, violationsData] = await Promise.all([
                this.apiCall(`/api/summary/`), // Sem filtro para pegar todos os dados
                this.apiCall(`/api/series/?max_points=100`), // Sem filtro para pegar todos os dados
                this.apiCall(`/api/violations/?limit=10`) // Últimas 10 violações
            ]);

            console.log('✅ Dados recebidos - summary:', summaryData);
            console.log('✅ Dados recebidos - series length:', Array.isArray(seriesData) ? seriesData.length : 'não é array');
            console.log('✅ Dados recebidos - violations length:', Array.isArray(violationsData) ? violationsData.length : 'não é array');

            // Processar dados diretamente
            this.processData(summaryData, seriesData, violationsData);

            if (timerId) {
                this.performanceMonitor.endTimer(timerId, { success: true, cached: false });
            }

        } catch (error) {
            if (timerId) {
                this.performanceMonitor.endTimer(timerId, { success: false, error: error.message });
            }

            this.handleError(error, {
                component: 'core',
                operation: 'updateData',
                recoverable: true
            });
        } finally {
            this.setLoading(false);
        }
    }

    /**
     * Valida os dados recebidos da API.
     */
    validateReceivedData(summaryData, seriesData) {
        if (!summaryData || typeof summaryData !== 'object') {
            throw new Error('Dados de resumo inválidos recebidos da API');
        }

        if (!seriesData || typeof seriesData !== 'object') {
            throw new Error('Dados de séries inválidos recebidos da API');
        }

        // Validar campos obrigatórios baseados na resposta real da API
        const requiredSummaryFields = ['temperature_stats', 'humidity_stats', 'total_measurements', 'violations_count'];

        for (const field of requiredSummaryFields) {
            if (!(field in summaryData)) {
                throw new Error(`Campo obrigatório ausente em summaryData: ${field}`);
            }
        }

        console.log('Dados recebidos validados com sucesso');
    }

    /**
     * Processa dados do cache.
     */
    processCachedData(cachedData) {
        const { summaryData, seriesData } = cachedData;
        this.processData(summaryData, seriesData);
    }

    /**
     * Processa os dados e notifica componentes.
     */
    processData(summaryData, seriesData, violationsData) {
        console.log('🔄 processData called with violationsData:', violationsData);
        try {
            console.log('🔄 processData() iniciado');
            console.log('📊 Summary data recebido:', summaryData);

            // Transformar dados da API para o formato esperado pelo UI
            const transformedData = this.transformApiData(summaryData, seriesData);
            console.log('🔄 Dados transformados:', transformedData);

            // Notifica os componentes registrados com os novos dados
            if (this.components.ui && typeof this.components.ui.updateSummaryUI === 'function') {
                console.log('🎨 Atualizando interface com dados transformados');
                this.components.ui.updateSummaryUI(transformedData);
                if (typeof this.components.ui.updateViolations === 'function') {
                    console.log('📋 Chamando updateViolations com dados:', violationsData);
                    this.components.ui.updateViolations(violationsData);
                } else {
                    console.warn('⚠️ Método updateViolations não encontrado no componente UI');
                }
            } else {
                console.warn('⚠️ Componente UI não disponível ou função updateSummaryUI não encontrada');
            }

            if (this.components.charts && typeof this.components.charts.updateCharts === 'function') {
                this.components.charts.updateCharts(seriesData);
            } else {
                console.log('📈 Componente charts não disponível ou função updateCharts não encontrada');
            }

            this.updateLastUpdated();
            console.log("✅ Dados processados com sucesso.");

        } catch (error) {
            console.error('❌ Erro ao processar dados:', error);
            this.handleError(error, {
                component: 'core',
                operation: 'processData',
                recoverable: true
            });
        }
    }

    /**
     * Transforma dados da API para o formato esperado pelo UI
     */
    transformApiData(summaryData, seriesData) {
        return {
            temperature: {
                average: summaryData.temperature_stats?.mean || 0,
                min: summaryData.temperature_stats?.min || 0,
                max: summaryData.temperature_stats?.max || 0
            },
            humidity: {
                average: summaryData.humidity_stats?.mean || 0,
                min: summaryData.humidity_stats?.min || 0,
                max: summaryData.humidity_stats?.max || 0
            },
            violations: {
                total: summaryData.violations_count || 0,
                base_measurements: summaryData.total_measurements || 0
            },
            measurements: summaryData.total_measurements || 0
        };
    }

    startAutoUpdate() {
        this.stopAutoUpdate(); // Garante que não haja múltiplos intervalos rodando

        const updateInterval = this.getConfig('ui.updateInterval', 30000);

        if (updateInterval <= 0) {
            console.log('Atualização automática desabilitada (intervalo <= 0)');
            return;
        }

        this.autoUpdateInterval = setInterval(() => {
            this.updateData();
        }, updateInterval);

        console.log(`Atualização automática iniciada a cada ${updateInterval / 1000}s.`);
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
        const timerId = this.performanceMonitor ?
            this.performanceMonitor.startTimer('api_call', { endpoint, method: options.method || 'GET' }) : null;

        const maxRetries = this.getConfig('api.maxRetries', 3);
        const retryDelay = this.getConfig('api.retryDelay', 1000);

        const defaultOptions = {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        };

        // Adiciona o token CSRF apenas para métodos que alteram dados
        if (options.method && !['GET', 'HEAD', 'OPTIONS'].includes(options.method.toUpperCase())) {
            defaultOptions.headers['X-CSRFToken'] = this.getCSRFToken();
        }

        const finalOptions = { ...defaultOptions, ...options, headers: { ...defaultOptions.headers, ...options.headers } };

        let lastError;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const response = await fetch(endpoint, finalOptions);

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Erro na requisição: ${response.status} ${response.statusText} - ${errorText}`);
                }

                const data = await response.json();

                if (timerId) {
                    this.performanceMonitor.endTimer(timerId, {
                        success: true,
                        attempt,
                        statusCode: response.status
                    });
                }

                return data;

            } catch (error) {
                lastError = error;
                console.warn(`Tentativa ${attempt}/${maxRetries} falhou para ${endpoint}:`, error.message);

                if (attempt === maxRetries) {
                    if (timerId) {
                        this.performanceMonitor.endTimer(timerId, {
                            success: false,
                            attempts: attempt,
                            error: error.message
                        });
                    }
                    break; // Não aguardar mais, lançar o erro
                }

                // Aguardar antes da próxima tentativa com backoff exponencial
                const delay = retryDelay * Math.pow(2, attempt - 1);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        throw lastError; // Lança o último erro após todas as tentativas
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

    // --- Método de Tratamento de Erros ---

    /**
     * Trata erros de forma centralizada.
     */
    handleError(error, context = {}) {
        if (this.errorHandler) {
            this.errorHandler.handle(error, {
                component: context.component || 'core',
                operation: context.operation || 'unknown',
                recoverable: context.recoverable !== false,
                ...context
            });
        } else {
            // Fallback para tratamento básico
            console.error('Erro não tratado:', error, context);
            this.showBasicError(`Erro: ${error.message}`);
        }
    }

    // --- Método de Notificação de Componentes ---

    /**
     * Notifica componentes registrados sobre eventos.
     */
    notifyComponents(event, data) {
        for (const [name, component] of Object.entries(this.components)) {
            if (component && typeof component[event] === 'function') {
                try {
                    component[event](data);
                } catch (error) {
                    console.warn(`Erro ao notificar componente ${name}:`, error);
                }
            }
        }
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
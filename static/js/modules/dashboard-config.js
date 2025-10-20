/**
 * Dashboard Configuration Module
 * Centraliza todas as configurações do dashboard para facilitar manutenção e testes
 */

class DashboardConfig {
    constructor() {
        this.config = {
            // API Configuration
            api: {
                baseUrl: '/api',
                endpoints: {
                    summary: '/summary/',
                    series: '/series/',
                    violations: '/violations/',
                    health: '/system/health/'
                },
                timeout: 10000,
                retries: 3,
                retryDelay: 1000
            },

            // UI Configuration
            ui: {
                updateInterval: 30000,
                defaultPeriodDays: 30,
                skeletonDuration: 1500,
                toastDuration: 3000,
                animationDuration: 300
            },

            // Charts Configuration
            charts: {
                colors: {
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
                },
                animation: {
                    duration: 1200,
                    easing: 'easeInOutQuart'
                },
                responsive: {
                    breakpoints: {
                        mobile: 480,
                        tablet: 768,
                        desktop: 1200
                    }
                }
            },

            // Validation Rules
            validation: {
                temperature: {
                    min: -50,
                    max: 100,
                    unit: '°C'
                },
                humidity: {
                    min: 0,
                    max: 100,
                    unit: '%'
                },
                measurements: {
                    maxPerRequest: 1000,
                    cacheTimeout: 300000 // 5 minutes
                }
            },

            // Feature Flags
            features: {
                autoUpdate: true,
                fullscreenCharts: true,
                realTimeUpdates: false,
                debugMode: false,
                analytics: false
            },

            // Error Handling
            errors: {
                maxRetries: 3,
                retryDelay: 1000,
                showUserErrors: true,
                logErrors: true
            }
        };

        this.environment = this.detectEnvironment();
        this.applyEnvironmentOverrides();
    }

    /**
     * Detecta o ambiente de execução
     * @returns {string} Ambiente detectado
     */
    detectEnvironment() {
        if (typeof window !== 'undefined') {
            const hostname = window.location.hostname;
            if (hostname === 'localhost' || hostname === '127.0.0.1') {
                return 'development';
            }
            if (hostname.includes('staging') || hostname.includes('test')) {
                return 'staging';
            }
            return 'production';
        }
        return 'server';
    }

    /**
     * Aplica configurações específicas do ambiente
     */
    applyEnvironmentOverrides() {
        const overrides = {
            development: {
                features: {
                    debugMode: true,
                    autoUpdate: true
                },
                ui: {
                    updateInterval: 15000 // Faster updates in dev
                }
            },
            staging: {
                features: {
                    analytics: true
                }
            },
            production: {
                errors: {
                    showUserErrors: false
                }
            }
        };

        const envOverrides = overrides[this.environment];
        if (envOverrides) {
            this.deepMerge(this.config, envOverrides);
        }
    }

    /**
     * Mescla objetos profundamente
     * @param {object} target - Objeto alvo
     * @param {object} source - Objeto fonte
     */
    deepMerge(target, source) {
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                if (!target[key]) target[key] = {};
                this.deepMerge(target[key], source[key]);
            } else {
                target[key] = source[key];
            }
        }
    }

    /**
     * Obtém valor de configuração por caminho
     * @param {string} path - Caminho da configuração (ex: 'api.timeout')
     * @param {*} defaultValue - Valor padrão se não encontrado
     * @returns {*} Valor da configuração
     */
    get(path, defaultValue = null) {
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
     * Define valor de configuração
     * @param {string} path - Caminho da configuração
     * @param {*} value - Novo valor
     */
    set(path, value) {
        const keys = path.split('.');
        let obj = this.config;

        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!obj[key] || typeof obj[key] !== 'object') {
                obj[key] = {};
            }
            obj = obj[key];
        }

        obj[keys[keys.length - 1]] = value;
    }

    /**
     * Valida uma configuração
     * @param {string} path - Caminho da configuração
     * @param {*} value - Valor a validar
     * @returns {boolean} Se é válido
     */
    validate(path, value) {
        const rules = this.get(`validation.${path}`);
        if (!rules) return true;

        if (typeof value === 'number') {
            if ('min' in rules && value < rules.min) return false;
            if ('max' in rules && value > rules.max) return false;
        }

        return true;
    }

    /**
     * Obtém todas as configurações
     * @returns {object} Configurações completas
     */
    getAll() {
        return JSON.parse(JSON.stringify(this.config));
    }

    /**
     * Reseta configurações para valores padrão
     */
    reset() {
        this.constructor();
    }

    /**
     * Verifica se uma feature está habilitada
     * @param {string} feature - Nome da feature
     * @returns {boolean} Se está habilitada
     */
    isFeatureEnabled(feature) {
        return this.get(`features.${feature}`, false);
    }

    /**
     * Obtém configurações de API
     * @returns {object} Configurações da API
     */
    getApiConfig() {
        return this.get('api');
    }

    /**
     * Obtém configurações de UI
     * @returns {object} Configurações da UI
     */
    getUiConfig() {
        return this.get('ui');
    }

    /**
     * Obtém configurações de gráficos
     * @returns {object} Configurações dos gráficos
     */
    getChartsConfig() {
        return this.get('charts');
    }
}

// Singleton instance
const dashboardConfig = new DashboardConfig();

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DashboardConfig;
} else if (typeof define === 'function' && define.amd) {
    define([], () => DashboardConfig);
} else {
    window.DashboardConfig = DashboardConfig;
    window.dashboardConfig = dashboardConfig;
}

console.log('Dashboard Config module loaded, environment:', dashboardConfig.environment);
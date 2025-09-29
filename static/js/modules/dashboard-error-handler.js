/**
 * Dashboard Error Handler Module
 * Sistema centralizado de tratamento de erros e logging
 */

class DashboardErrorHandler {
    constructor(config = {}) {
        this.config = {
            maxRetries: 3,
            retryDelay: 1000,
            showUserErrors: true,
            logErrors: true,
            enableSentry: false,
            ...config
        };

        this.errorQueue = [];
        this.retryQueue = new Map();
        this.errorStats = {
            total: 0,
            byType: {},
            byComponent: {}
        };

        this.init();
    }

    init() {
        // Capturar erros globais
        if (typeof window !== 'undefined') {
            window.addEventListener('error', (event) => {
                this.handleGlobalError(event.error, {
                    message: event.message,
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno,
                    type: 'global'
                });
            });

            window.addEventListener('unhandledrejection', (event) => {
                this.handleUnhandledRejection(event.reason);
            });
        }

        console.log('Dashboard Error Handler initialized');
    }

    /**
     * Trata erros de forma centralizada
     * @param {Error|string} error - Erro ocorrido
     * @param {object} context - Contexto adicional
     */
    handleError(error, context = {}) {
        const errorInfo = this.normalizeError(error, context);

        // Atualizar estatísticas
        this.updateErrorStats(errorInfo);

        // Log do erro
        if (this.config.logErrors) {
            this.logError(errorInfo);
        }

        // Enviar para serviço externo se configurado
        if (this.config.enableSentry) {
            this.sendToExternalService(errorInfo);
        }

        // Mostrar para usuário se apropriado
        if (this.shouldShowToUser(errorInfo)) {
            this.showUserError(errorInfo);
        }

        // Executar ações de recuperação
        this.attemptRecovery(errorInfo);

        return errorInfo;
    }

    /**
     * Normaliza diferentes tipos de erro para formato consistente
     * @param {Error|string} error - Erro a normalizar
     * @param {object} context - Contexto adicional
     * @returns {object} Erro normalizado
     */
    normalizeError(error, context = {}) {
        let normalized = {
            id: this.generateErrorId(),
            timestamp: new Date().toISOString(),
            type: 'unknown',
            severity: 'medium',
            component: context.component || 'unknown',
            recoverable: false,
            ...context
        };

        if (error instanceof Error) {
            normalized.message = error.message;
            normalized.stack = error.stack;
            normalized.name = error.name;
            normalized.type = this.classifyError(error);
        } else if (typeof error === 'string') {
            normalized.message = error;
            normalized.type = 'string';
        } else if (error && typeof error === 'object') {
            normalized = { ...normalized, ...error };
        }

        return normalized;
    }

    /**
     * Classifica o tipo de erro baseado na mensagem ou stack
     * @param {Error} error - Erro a classificar
     * @returns {string} Tipo do erro
     */
    classifyError(error) {
        const message = error.message.toLowerCase();
        const stack = error.stack ? error.stack.toLowerCase() : '';

        if (message.includes('network') || message.includes('fetch')) {
            return 'network';
        }
        if (message.includes('chart') || message.includes('canvas')) {
            return 'chart';
        }
        if (message.includes('dom') || message.includes('element')) {
            return 'dom';
        }
        if (message.includes('api') || message.includes('http')) {
            return 'api';
        }
        if (stack.includes('chart.js')) {
            return 'chart_library';
        }

        return 'application';
    }

    /**
     * Atualiza estatísticas de erro
     * @param {object} errorInfo - Informações do erro
     */
    updateErrorStats(errorInfo) {
        this.errorStats.total++;

        // Por tipo
        this.errorStats.byType[errorInfo.type] =
            (this.errorStats.byType[errorInfo.type] || 0) + 1;

        // Por componente
        this.errorStats.byComponent[errorInfo.component] =
            (this.errorStats.byComponent[errorInfo.component] || 0) + 1;
    }

    /**
     * Log do erro no console
     * @param {object} errorInfo - Informações do erro
     */
    logError(errorInfo) {
        const logLevel = this.getLogLevel(errorInfo.severity);
        const logMessage = `[${errorInfo.timestamp}] ${errorInfo.type.toUpperCase()} in ${errorInfo.component}: ${errorInfo.message}`;

        console[logLevel](logMessage, errorInfo);
    }

    /**
     * Obtém nível de log apropriado
     * @param {string} severity - Severidade do erro
     * @returns {string} Nível de log
     */
    getLogLevel(severity) {
        switch (severity) {
            case 'critical': return 'error';
            case 'high': return 'error';
            case 'medium': return 'warn';
            case 'low': return 'info';
            default: return 'log';
        }
    }

    /**
     * Verifica se deve mostrar erro para usuário
     * @param {object} errorInfo - Informações do erro
     * @returns {boolean} Se deve mostrar
     */
    shouldShowToUser(errorInfo) {
        if (!this.config.showUserErrors) return false;
        if (errorInfo.severity === 'low') return false;
        if (errorInfo.type === 'network' && errorInfo.recoverable) return false;

        return true;
    }

    /**
     * Mostra erro para usuário
     * @param {object} errorInfo - Informações do erro
     */
    showUserError(errorInfo) {
        const userMessage = this.getUserFriendlyMessage(errorInfo);

        // Usar sistema de toast se disponível
        if (window.dashboard && window.dashboard.core && window.dashboard.core.showError) {
            window.dashboard.core.showError(userMessage);
        } else {
            // Fallback para alert
            alert(`Erro: ${userMessage}`);
        }
    }

    /**
     * Converte erro técnico em mensagem amigável
     * @param {object} errorInfo - Informações do erro
     * @returns {string} Mensagem amigável
     */
    getUserFriendlyMessage(errorInfo) {
        const messages = {
            network: 'Problema de conexão. Verifique sua internet.',
            api: 'Erro ao carregar dados. Tente novamente.',
            chart: 'Erro ao exibir gráfico. Recarregue a página.',
            dom: 'Erro na interface. Recarregue a página.',
            chart_library: 'Erro no sistema de gráficos.',
            application: 'Erro interno. Contate o suporte se persistir.'
        };

        return messages[errorInfo.type] || 'Ocorreu um erro inesperado.';
    }

    /**
     * Tenta recuperar do erro
     * @param {object} errorInfo - Informações do erro
     */
    attemptRecovery(errorInfo) {
        if (!errorInfo.recoverable) return;

        switch (errorInfo.type) {
            case 'network':
                this.scheduleRetry(errorInfo);
                break;
            case 'chart':
                this.recreateChart(errorInfo);
                break;
            case 'api':
                this.retryApiCall(errorInfo);
                break;
        }
    }

    /**
     * Agenda retry para operações falhadas
     * @param {object} errorInfo - Informações do erro
     */
    scheduleRetry(errorInfo) {
        const retryKey = `${errorInfo.component}_${errorInfo.operation}`;

        if (!this.retryQueue.has(retryKey)) {
            this.retryQueue.set(retryKey, {
                count: 0,
                errorInfo,
                timeoutId: null
            });
        }

        const retryData = this.retryQueue.get(retryKey);

        if (retryData.count < this.config.maxRetries) {
            retryData.count++;
            retryData.timeoutId = setTimeout(() => {
                this.executeRetry(retryData);
            }, this.config.retryDelay * retryData.count);
        }
    }

    /**
     * Executa retry
     * @param {object} retryData - Dados do retry
     */
    executeRetry(retryData) {
        console.log(`Retrying operation (${retryData.count}/${this.config.maxRetries})`);

        // Emitir evento de retry
        this.emit('retry', retryData.errorInfo);

        // Limpar da fila
        this.retryQueue.delete(`${retryData.errorInfo.component}_${retryData.errorInfo.operation}`);
    }

    /**
     * Trata erros globais
     * @param {Error} error - Erro global
     * @param {object} context - Contexto adicional
     */
    handleGlobalError(error, context = {}) {
        this.handleError(error, {
            ...context,
            component: 'global',
            severity: 'high'
        });
    }

    /**
     * Trata rejeições não tratadas
     * @param {any} reason - Razão da rejeição
     */
    handleUnhandledRejection(reason) {
        this.handleError(reason, {
            component: 'async',
            type: 'promise',
            severity: 'high'
        });
    }

    /**
     * Recria gráfico com erro
     * @param {object} errorInfo - Informações do erro
     */
    recreateChart(errorInfo) {
        if (window.dashboard && window.dashboard.charts) {
            setTimeout(() => {
                if (errorInfo.chartType === 'temperature') {
                    window.dashboard.charts.createTemperatureChart();
                } else if (errorInfo.chartType === 'humidity') {
                    window.dashboard.charts.createHumidityChart();
                }
            }, 1000);
        }
    }

    /**
     * Retry de chamada API
     * @param {object} errorInfo - Informações do erro
     */
    retryApiCall(errorInfo) {
        if (window.dashboard && window.dashboard.core) {
            setTimeout(() => {
                window.dashboard.core.updateData();
            }, this.config.retryDelay);
        }
    }

    /**
     * Gera ID único para erro
     * @returns {string} ID do erro
     */
    generateErrorId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * Obtém estatísticas de erro
     * @returns {object} Estatísticas
     */
    getStats() {
        return { ...this.errorStats };
    }

    /**
     * Limpa estatísticas
     */
    clearStats() {
        this.errorStats = {
            total: 0,
            byType: {},
            byComponent: {}
        };
    }

    /**
     * Sistema de eventos simples
     * @param {string} event - Nome do evento
     * @param {*} data - Dados do evento
     */
    emit(event, data) {
        if (typeof window !== 'undefined') {
            const customEvent = new CustomEvent(`dashboard:error:${event}`, {
                detail: data
            });
            window.dispatchEvent(customEvent);
        }
    }

    /**
     * Adiciona listener de evento
     * @param {string} event - Nome do evento
     * @param {function} callback - Callback
     */
    on(event, callback) {
        if (typeof window !== 'undefined') {
            window.addEventListener(`dashboard:error:${event}`, (e) => {
                callback(e.detail);
            });
        }
    }

    /**
     * Mostra notificação para usuário
     * @param {object} notification - Objeto de notificação
     * @param {string} notification.type - Tipo da notificação ('success', 'error', 'warning', 'info')
     * @param {string} notification.title - Título da notificação
     * @param {string} notification.message - Mensagem da notificação
     * @param {number} notification.duration - Duração em ms (opcional, padrão: 5000)
     */
    showNotification(notification) {
        if (!notification || typeof notification !== 'object') {
            console.warn('Invalid notification object provided to showNotification');
            return;
        }

        const {
            type = 'info',
            title = '',
            message = '',
            duration = 5000
        } = notification;

        // Criar elemento de notificação
        const notificationElement = this.createNotificationElement(type, title, message);

        // Adicionar ao container
        this.addNotificationToContainer(notificationElement);

        // Auto-remover após duração
        setTimeout(() => {
            this.removeNotification(notificationElement);
        }, duration);

        // Log da notificação
        console.log(`Notification shown: ${type} - ${title}: ${message}`);
    }

    /**
     * Cria elemento HTML da notificação
     * @param {string} type - Tipo da notificação
     * @param {string} title - Título
     * @param {string} message - Mensagem
     * @returns {HTMLElement} Elemento da notificação
     */
    createNotificationElement(type, title, message) {
        const notification = document.createElement('div');
        notification.className = `dashboard-notification dashboard-notification--${type}`;

        notification.innerHTML = `
            <div class="notification-header">
                <span class="notification-title">${title}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">&times;</button>
            </div>
            <div class="notification-body">
                <span class="notification-message">${message}</span>
            </div>
        `;

        return notification;
    }

    /**
     * Adiciona notificação ao container
     * @param {HTMLElement} notificationElement - Elemento da notificação
     */
    addNotificationToContainer(notificationElement) {
        let container = document.getElementById('dashboard-notifications');

        if (!container) {
            container = document.createElement('div');
            container.id = 'dashboard-notifications';
            container.className = 'dashboard-notifications-container';
            document.body.appendChild(container);

            // Adicionar estilos se não existirem
            this.addNotificationStyles();
        }

        container.appendChild(notificationElement);

        // Animação de entrada
        setTimeout(() => {
            notificationElement.classList.add('show');
        }, 10);
    }

    /**
     * Remove notificação
     * @param {HTMLElement} notificationElement - Elemento a remover
     */
    removeNotification(notificationElement) {
        if (notificationElement) {
            notificationElement.classList.remove('show');
            setTimeout(() => {
                if (notificationElement.parentElement) {
                    notificationElement.parentElement.removeChild(notificationElement);
                }
            }, 300); // Tempo da animação
        }
    }

    /**
     * Adiciona estilos CSS para notificações
     */
    addNotificationStyles() {
        if (document.getElementById('dashboard-notification-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'dashboard-notification-styles';
        styles.textContent = `
            .dashboard-notifications-container {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                max-width: 400px;
            }

            .dashboard-notification {
                background: rgba(255, 255, 255, 0.95);
                backdrop-filter: blur(10px);
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
                margin-bottom: 10px;
                opacity: 0;
                transform: translateX(100%);
                transition: all 0.3s ease;
                border-left: 4px solid;
                overflow: hidden;
            }

            .dashboard-notification.show {
                opacity: 1;
                transform: translateX(0);
            }

            .dashboard-notification--success {
                border-left-color: #10b981;
            }

            .dashboard-notification--error {
                border-left-color: #ef4444;
            }

            .dashboard-notification--warning {
                border-left-color: #f59e0b;
            }

            .dashboard-notification--info {
                border-left-color: #3b82f6;
            }

            .notification-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 16px 8px;
            }

            .notification-title {
                font-weight: 600;
                font-size: 14px;
                color: #1f2937;
            }

            .notification-close {
                background: none;
                border: none;
                font-size: 20px;
                color: #6b7280;
                cursor: pointer;
                padding: 0;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                transition: background-color 0.2s;
            }

            .notification-close:hover {
                background-color: rgba(0, 0, 0, 0.1);
            }

            .notification-body {
                padding: 0 16px 12px;
            }

            .notification-message {
                font-size: 13px;
                color: #4b5563;
                line-height: 1.4;
            }
        `;

        document.head.appendChild(styles);
    }
}

// Singleton instance
const dashboardErrorHandler = new DashboardErrorHandler();

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DashboardErrorHandler;
} else if (typeof define === 'function' && define.amd) {
    define([], () => DashboardErrorHandler);
} else {
    window.DashboardErrorHandler = DashboardErrorHandler;
    window.dashboardErrorHandler = dashboardErrorHandler;
}

console.log('Dashboard Error Handler module loaded');
// modules/notifications.js - Gerenciador de notificações (toasts)
import { DOM_ELEMENTS } from './config.js';
import { Utils } from './utils.js';

export class NotificationManager {
    constructor() {
        this.toasts = new Map();
        this.initializeToasts();
    }

    initializeToasts() {
        // Aguardar Bootstrap estar disponível
        const tryInitialize = () => {
            if (typeof bootstrap === 'undefined') {
                Utils.logInfo('Notifications', 'Bootstrap não disponível ainda, tentando novamente...');
                setTimeout(tryInitialize, 100);
                return;
            }

            // Criar instâncias dos toasts do Bootstrap
            const errorToast = Utils.getElementById(DOM_ELEMENTS.errorToast);
            const successToast = Utils.getElementById(DOM_ELEMENTS.successToast);
            const loadingToast = Utils.getElementById(DOM_ELEMENTS.loadingToast);

            if (errorToast) {
                this.toasts.set('error', new bootstrap.Toast(errorToast));
            }
            if (successToast) {
                this.toasts.set('success', new bootstrap.Toast(successToast));
            }
            if (loadingToast) {
                this.toasts.set('loading', new bootstrap.Toast(loadingToast, { autohide: false }));
            }

            Utils.logInfo('Notifications', `Toasts inicializados: ${this.toasts.size} toasts`);
        };

        tryInitialize();
    }

    showError(message, duration = 5000) {
        Utils.logError('Notifications', message);
        Utils.setElementText(DOM_ELEMENTS.errorMessage, message);

        const toast = this.toasts.get('error');
        if (toast) {
            toast.show();

            // Auto-hide personalizado
            if (duration > 0) {
                setTimeout(() => {
                    toast.hide();
                }, duration);
            }
        }
    }

    showSuccess(message, duration = 3000) {
        Utils.logInfo('Notifications', message);
        Utils.setElementText(DOM_ELEMENTS.successMessage, message);

        const toast = this.toasts.get('success');
        if (toast) {
            toast.show();

            // Auto-hide personalizado
            if (duration > 0) {
                setTimeout(() => {
                    toast.hide();
                }, duration);
            }
        }
    }

    showLoading(message = 'Carregando...') {
        Utils.logInfo('Notifications', `Loading: ${message}`);

        const loadingElement = Utils.getElementById(DOM_ELEMENTS.loadingToast);
        if (loadingElement) {
            const messageElement = loadingElement.querySelector('.toast-body span');
            if (messageElement) {
                messageElement.textContent = message;
            }
        }

        const toast = this.toasts.get('loading');
        if (toast) {
            toast.show();
        }
    }

    hideLoading() {
        const toast = this.toasts.get('loading');
        if (toast) {
            toast.hide();
        }
    }

    hideAll() {
        this.toasts.forEach(toast => {
            toast.hide();
        });
    }

    // Métodos de conveniência
    apiError(context, error) {
        this.showError(`Erro em ${context}: ${error.message || error}`);
    }

    dataLoadSuccess() {
        this.showSuccess('Dados atualizados com sucesso!');
    }

    reportGenerating(type) {
        this.showLoading(`Gerando relatório ${type.toUpperCase()}...`);
    }

    reportSuccess(type) {
        this.showSuccess(`Relatório ${type.toUpperCase()} gerado com sucesso!`);
    }

    cycleForced() {
        this.showSuccess('Ciclo do simulador executado com sucesso!');
    }
}

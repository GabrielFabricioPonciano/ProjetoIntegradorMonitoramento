// modules/utils.js - Funções utilitárias
export class Utils {
    static numberFormatter = new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
    });

    static formatNumber(value) {
        return this.numberFormatter.format(value);
    }

    static formatDate(date) {
        return date.toLocaleDateString('pt-BR') + ' ' +
            date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }

    static formatDateTime(timestamp) {
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) {
            console.warn('Timestamp inválido:', timestamp);
            return 'Data inválida';
        }
        return this.formatDate(date);
    }

    static parseFloat(value) {
        const parsed = parseFloat(value);
        return isNaN(parsed) ? null : parsed;
    }

    static parseInt(value) {
        const parsed = parseInt(value, 10);
        return isNaN(parsed) ? null : parsed;
    }

    static isValidTimestamp(timestamp) {
        const date = new Date(timestamp);
        return !isNaN(date.getTime());
    }

    static getElementById(id) {
        const element = document.getElementById(id);
        if (!element) {
            console.warn(`Elemento não encontrado: ${id}`);
        }
        return element;
    }

    static setElementText(id, text) {
        this.logInfo('Utils', `Procurando elemento: ${id}`);
        const element = this.getElementById(id);
        if (element) {
            this.logInfo('Utils', `Elemento encontrado: ${id}, definindo texto: ${text}`);
            element.textContent = text;
        } else {
            this.logError('Utils', `Elemento não encontrado: ${id}`);
        }
    }

    static setElementHTML(id, html) {
        const element = this.getElementById(id);
        if (element) {
            element.innerHTML = html;
        }
    }

    static showElement(id) {
        const element = this.getElementById(id);
        if (element) {
            element.style.display = 'block';
        }
    }

    static hideElement(id) {
        const element = this.getElementById(id);
        if (element) {
            element.style.display = 'none';
        }
    }

    static forceReflow(element) {
        if (element) {
            element.offsetHeight; // Força reflow
        }
    }

    static async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    static async nextFrame() {
        return new Promise(resolve => requestAnimationFrame(resolve));
    }

    static calculatePercentage(value, total) {
        if (total === 0) return 0;
        return (value / total) * 100;
    }

    static getCSRFToken() {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'csrftoken') {
                return value;
            }
        }

        // Fallback: buscar no meta tag
        const metaToken = document.querySelector('meta[name="csrf-token"]');
        if (metaToken) {
            return metaToken.getAttribute('content');
        }

        // Fallback: buscar no input hidden
        const inputToken = document.querySelector('input[name="csrfmiddlewaretoken"]');
        if (inputToken) {
            return inputToken.value;
        }

        return null;
    }

    static logError(context, error, data = null) {
        console.error(`[${context}] Erro:`, error);
        if (data) {
            console.error(`[${context}] Dados:`, data);
        }

        // Enviar erro para o servidor também
        this.sendLogToServer('ERROR', context, error.toString(), data);
    }

    static logInfo(context, message, data = null) {
        console.log(`[${context}]`, message);
        if (data) {
            console.log(`[${context}] Dados:`, data);
        }

        // Enviar log para o servidor também
        this.sendLogToServer('INFO', context, message, data);
    }

    static sendLogToServer(level, context, message, data = null) {
        try {
            // Não aguardar a resposta para não bloquear a execução
            fetch('/api/frontend-logs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCSRFToken() || ''
                },
                body: JSON.stringify({
                    level: level,
                    context: context,
                    message: message,
                    data: data,
                    timestamp: new Date().toISOString(),
                    userAgent: navigator.userAgent
                })
            }).catch(() => {
                // Silenciar erros de log para não criar loops
            });
        } catch (error) {
            // Silenciar erros de log para não criar loops
        }
    }
}

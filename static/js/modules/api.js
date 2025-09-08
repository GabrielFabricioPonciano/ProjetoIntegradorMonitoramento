// modules/api.js - Gerenciador de chamadas da API
import { API_ENDPOINTS, CONFIG } from './config.js';
import { Utils } from './utils.js';

export class APIManager {
    constructor() {
        // Removido cache completamente para aplicação de tempo real
    }

    async fetchDirect(url) {
        try {
            // Sempre adicionar timestamp para evitar cache do browser
            const separator = url.includes('?') ? '&' : '?';
            const finalUrl = `${url}${separator}_t=${Date.now()}`;

            Utils.logInfo('API', `Fazendo requisição direta para: ${finalUrl}`);
            const response = await fetch(finalUrl, {
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            });

            if (!response.ok) {
                throw new Error(`Erro HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            Utils.logError('API', `Erro ao buscar ${url}`, error);
            throw error;
        }
    }

    async loadSummary(days = CONFIG.DEFAULT_PERIOD) {
        const url = API_ENDPOINTS.summary(days);
        return await this.fetchDirect(url);
    }

    async loadSeries(days = CONFIG.DEFAULT_PERIOD, maxPoints = CONFIG.MAX_POINTS) {
        const url = API_ENDPOINTS.series(days, maxPoints);
        return await this.fetchDirect(url);
    }

    async loadViolations(days = CONFIG.DEFAULT_PERIOD, limit = 20) {
        const url = API_ENDPOINTS.violations(days, limit);
        return await this.fetchDirect(url);
    }

    async loadAllData(days = CONFIG.DEFAULT_PERIOD) {
        Utils.logInfo('API', `Carregando todos os dados em tempo real para ${days} dias`);

        try {
            const [summary, series, violations] = await Promise.all([
                this.loadSummary(days),
                this.loadSeries(days, CONFIG.MAX_POINTS),
                this.loadViolations(days, 20)
            ]);

            Utils.logInfo('API', 'Todos os dados carregados com sucesso (tempo real)', {
                summary,
                seriesCount: series.length,
                violationsCount: violations.length,
                firstSerie: series[0],
                lastSerie: series[series.length - 1]
            });

            // Validar dados críticos
            if (!summary) {
                Utils.logError('API', 'Summary está vazio ou null');
            }
            if (!series || series.length === 0) {
                Utils.logError('API', 'Series está vazio ou sem dados');
            }

            return { summary, series, violations };
        } catch (error) {
            Utils.logError('API', 'Erro ao carregar dados', error);
            throw error;
        }
    }

    async forceCycle() {
        Utils.logInfo('API', 'Forçando ciclo do simulador');

        try {
            const response = await fetch(API_ENDPOINTS.forceCycle, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': Utils.getCSRFToken() || '',
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            });

            if (!response.ok) {
                throw new Error(`Erro HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            Utils.logInfo('API', 'Ciclo forçado com sucesso', result);

            return result;
        } catch (error) {
            Utils.logError('API', 'Erro ao forçar ciclo', error);
            throw error;
        }
    }
}

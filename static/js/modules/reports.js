// modules/reports.js - Gerenciador de relatórios
import { Utils } from './utils.js';

export class ReportManager {
    constructor(notificationManager) {
        if (!notificationManager) {
            throw new Error('NotificationManager é obrigatório para ReportManager');
        }
        this.notificationManager = notificationManager;
    }

    async downloadReport(type, days) {
        const validTypes = ['pdf', 'excel'];
        if (!validTypes.includes(type)) {
            Utils.logError('Reports', `Tipo de relatório inválido: ${type}`);
            if (this.notificationManager) {
                this.notificationManager.showError('Tipo de relatório inválido');
            }
            return;
        }

        const validDays = [1, 7, 30, 60, 90];
        if (!validDays.includes(days)) {
            Utils.logError('Reports', `Período inválido: ${days} dias`);
            if (this.notificationManager) {
                this.notificationManager.showError('Período inválido para relatório');
            }
            return;
        }

        Utils.logInfo('Reports', `Iniciando download de relatório ${type.toUpperCase()} para ${days} dias`);

        try {
            // Mostrar notificação de loading
            this.notificationManager.reportGenerating(type);

            const url = `/reports/${type}?days=${days}`;
            Utils.logInfo('Reports', `URL do relatório: ${url}`);

            // Fazer download usando fetch para ter controle melhor
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'X-CSRFToken': Utils.getCSRFToken() || ''
                }
            });

            if (!response.ok) {
                throw new Error(`Erro HTTP ${response.status}: ${response.statusText}`);
            }

            // Obter o blob do arquivo
            const blob = await response.blob();

            // Determinar o nome do arquivo
            let filename = `relatorio_${days}dias.${type}`;

            // Tentar obter nome do header
            const contentDisposition = response.headers.get('Content-Disposition');
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
                if (filenameMatch) {
                    filename = filenameMatch[1].replace(/['"]/g, '');
                }
            }

            // Criar download automático
            this.triggerDownload(blob, filename);

            // Esconder loading e mostrar sucesso
            this.notificationManager.hideLoading();
            this.notificationManager.reportSuccess(type);

            Utils.logInfo('Reports', `Relatório ${type.toUpperCase()} baixado com sucesso: ${filename}`);

        } catch (error) {
            Utils.logError('Reports', `Erro ao baixar relatório ${type}`, error);

            this.notificationManager.hideLoading();
            this.notificationManager.showError(`Erro ao gerar relatório ${type.toUpperCase()}: ${error.message}`);
        }
    }

    triggerDownload(blob, filename) {
        try {
            // Criar URL temporária para o blob
            const url = window.URL.createObjectURL(blob);

            // Criar elemento <a> temporário para download
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = filename;

            // Adicionar ao DOM, clicar e remover
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            // Limpar URL temporária
            window.URL.revokeObjectURL(url);

            Utils.logInfo('Reports', `Download iniciado: ${filename}`);
        } catch (error) {
            Utils.logError('Reports', 'Erro ao iniciar download', error);
            throw new Error('Erro ao iniciar download do arquivo');
        }
    }

    // Métodos de conveniência para diferentes tipos de relatório
    async downloadPDF(days = 30) {
        return this.downloadReport('pdf', days);
    }

    async downloadExcel(days = 30) {
        return this.downloadReport('excel', days);
    }

    // Método para relatórios personalizados com período
    async downloadCustomReport(type, startDate, endDate) {
        try {
            if (!startDate || !endDate) {
                throw new Error('Datas de início e fim são obrigatórias');
            }

            const start = new Date(startDate);
            const end = new Date(endDate);

            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                throw new Error('Datas inválidas');
            }

            if (start >= end) {
                throw new Error('Data de início deve ser anterior à data de fim');
            }

            // Calcular diferença em dias
            const diffTime = Math.abs(end - start);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays > 365) {
                throw new Error('Período máximo é de 365 dias');
            }

            Utils.logInfo('Reports', `Relatório personalizado: ${type}, ${diffDays} dias (${startDate} a ${endDate})`);

            this.notificationManager.reportGenerating(type);

            const url = `/reports/${type}?start_date=${startDate}&end_date=${endDate}`;

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'X-CSRFToken': Utils.getCSRFToken() || ''
                }
            });

            if (!response.ok) {
                throw new Error(`Erro HTTP ${response.status}: ${response.statusText}`);
            }

            const blob = await response.blob();
            const filename = `relatorio_personalizado_${startDate}_${endDate}.${type}`;

            this.triggerDownload(blob, filename);

            this.notificationManager.hideLoading();
            this.notificationManager.reportSuccess(type);

            Utils.logInfo('Reports', `Relatório personalizado baixado: ${filename}`);

        } catch (error) {
            Utils.logError('Reports', 'Erro em relatório personalizado', error);

            this.notificationManager.hideLoading();
            this.notificationManager.showError(`Erro no relatório personalizado: ${error.message}`);
        }
    }

    // Validações
    validateReportParams(type, days) {
        const errors = [];

        if (!['pdf', 'excel'].includes(type)) {
            errors.push('Tipo de relatório deve ser PDF ou Excel');
        }

        if (!Number.isInteger(days) || days <= 0) {
            errors.push('Número de dias deve ser um inteiro positivo');
        }

        if (days > 365) {
            errors.push('Período máximo é de 365 dias');
        }

        return errors;
    }

    // Método para obter status dos relatórios
    getSupportedFormats() {
        return [
            { type: 'pdf', name: 'PDF', icon: 'fas fa-file-pdf', color: 'danger' },
            { type: 'excel', name: 'Excel', icon: 'fas fa-file-excel', color: 'success' }
        ];
    }

    getSupportedPeriods() {
        return [
            { days: 1, name: '1 dia' },
            { days: 7, name: '7 dias' },
            { days: 30, name: '30 dias' },
            { days: 60, name: '60 dias' },
            { days: 90, name: '90 dias' }
        ];
    }
}

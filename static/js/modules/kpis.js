// modules/kpis.js - Gerenciador de KPIs
import { DOM_ELEMENTS, CONFIG } from './config.js';
import { Utils } from './utils.js';

export class KPIManager {
    constructor() {
        this.currentData = null;
        this.currentViolations = null;
    }

    updateKPIs(data, violations) {
        this.currentData = data;
        this.currentViolations = violations;

        Utils.logInfo('KPIs', 'updateKPIs chamado com:', { data, violations });

        // Verificar se temos a estrutura correta
        let summary;
        if (data && data.summary) {
            summary = data.summary;
        } else if (data && !data.summary) {
            // Se data for diretamente o summary
            summary = data;
        } else {
            Utils.logError('KPIs', 'Dados de summary inválidos para KPIs', data);
            return;
        }

        Utils.logInfo('KPIs', 'Atualizando KPIs com summary:', summary);

        this.updateTemperatureKPI(summary);
        this.updateHumidityKPI(summary);
        this.updateViolationsKPI(violations, data ? data.series : null);
        this.updateMeasurementsKPI(summary);
    }

    updateTemperatureKPI(summary) {
        try {
            Utils.logInfo('KPIs', 'updateTemperatureKPI chamado com:', summary);

            // Acessar dados da estrutura correta da API
            const tempStats = summary.temperature_stats || {};
            const tempMean = Utils.parseFloat(tempStats.mean);
            const tempMin = Utils.parseFloat(tempStats.min);
            const tempMax = Utils.parseFloat(tempStats.max);

            Utils.logInfo('KPIs', 'Valores de temperatura parseados:', { tempMean, tempMin, tempMax });

            if (tempMean !== null) {
                const formattedTemp = `${Utils.formatNumber(tempMean)}°C`;
                Utils.logInfo('KPIs', `Definindo temperatura média: ${formattedTemp}`);
                Utils.setElementText(DOM_ELEMENTS.tempMean, formattedTemp);
            } else {
                Utils.logInfo('KPIs', 'Temperatura média é null, definindo --°C');
                Utils.setElementText(DOM_ELEMENTS.tempMean, '--°C');
            }

            if (tempMin !== null && tempMax !== null) {
                const formattedRange = `Min: ${Utils.formatNumber(tempMin)}°C | Max: ${Utils.formatNumber(tempMax)}°C`;
                Utils.logInfo('KPIs', `Definindo range de temperatura: ${formattedRange}`);
                Utils.setElementText(DOM_ELEMENTS.tempRange, formattedRange);
            } else {
                Utils.logInfo('KPIs', 'Range de temperatura inválido, definindo padrão');
                Utils.setElementText(DOM_ELEMENTS.tempRange, 'Min: --°C | Max: --°C');
            }

            Utils.logInfo('KPIs', 'KPI de temperatura atualizado', { tempMean, tempMin, tempMax });
        } catch (error) {
            Utils.logError('KPIs', 'Erro ao atualizar KPI de temperatura', error);
        }
    }

    updateHumidityKPI(summary) {
        try {
            // Acessar dados da estrutura correta da API
            const rhStats = summary.humidity_stats || {};
            const rhMean = Utils.parseFloat(rhStats.mean);
            const rhMin = Utils.parseFloat(rhStats.min);
            const rhMax = Utils.parseFloat(rhStats.max);

            if (rhMean !== null) {
                Utils.setElementText(DOM_ELEMENTS.rhMean, `${Utils.formatNumber(rhMean)}%`);
            } else {
                Utils.setElementText(DOM_ELEMENTS.rhMean, '--%');
            }

            if (rhMin !== null && rhMax !== null) {
                Utils.setElementText(DOM_ELEMENTS.rhRange,
                    `Min: ${Utils.formatNumber(rhMin)}% | Max: ${Utils.formatNumber(rhMax)}%`);
            } else {
                Utils.setElementText(DOM_ELEMENTS.rhRange, 'Min: --% | Max: --%');
            }

            Utils.logInfo('KPIs', 'KPI de umidade atualizado', { rhMean, rhMin, rhMax });
        } catch (error) {
            Utils.logError('KPIs', 'Erro ao atualizar KPI de umidade', error);
        }
    }

    updateViolationsKPI(violations, series) {
        try {
            Utils.logInfo('KPIs', 'updateViolationsKPI chamado com:', {
                violations: violations,
                violationsLength: violations ? violations.length : 'null',
                series: series,
                seriesLength: series ? series.length : 'null',
                currentData: this.currentData
            });

            // Usar dados da API diretamente
            const violationsCount = violations ? violations.length : 0;

            // Obter total de medições da API summary
            let totalMeasurements = 0;
            if (this.currentData) {
                if (this.currentData.summary && this.currentData.summary.total_measurements) {
                    totalMeasurements = Utils.parseInt(this.currentData.summary.total_measurements) || 0;
                } else if (this.currentData.total_measurements) {
                    totalMeasurements = Utils.parseInt(this.currentData.total_measurements) || 0;
                }
            }

            // Fallback para contagem de series se não tiver na API
            if (totalMeasurements === 0 && series) {
                totalMeasurements = series.length || 0;
            }

            Utils.logInfo('KPIs', 'Definindo violations count:', violationsCount);
            Utils.setElementText(DOM_ELEMENTS.violationsCount, violationsCount.toString());

            if (totalMeasurements > 0) {
                const percentage = Utils.calculatePercentage(violationsCount, totalMeasurements);
                Utils.logInfo('KPIs', 'Definindo violations percentage:', percentage);
                Utils.setElementText(DOM_ELEMENTS.violationsPct, `${Utils.formatNumber(percentage)}% do total`);
                Utils.setElementText(DOM_ELEMENTS.violationsBase, `Base: ${totalMeasurements} medições`);
            } else {
                Utils.logInfo('KPIs', 'Total measurements é 0, definindo valores padrão');
                Utils.setElementText(DOM_ELEMENTS.violationsPct, '-- do total');
                Utils.setElementText(DOM_ELEMENTS.violationsBase, '--');
            }

            Utils.logInfo('KPIs', 'KPI de violações atualizado', {
                violationsCount,
                totalMeasurements,
                percentage: totalMeasurements > 0 ? Utils.calculatePercentage(violationsCount, totalMeasurements) : 0
            });
        } catch (error) {
            Utils.logError('KPIs', 'Erro ao atualizar KPI de violações', error);
        }
    }

    updateMeasurementsKPI(summary) {
        try {
            Utils.logInfo('KPIs', 'updateMeasurementsKPI chamado com summary:', summary);

            let totalMeasurements = 0;
            if (summary && summary.total_measurements !== undefined) {
                totalMeasurements = Utils.parseInt(summary.total_measurements) || 0;
            } else {
                Utils.logError('KPIs', 'total_measurements não encontrado no summary:', summary);
            }

            Utils.logInfo('KPIs', 'Total measurements parseado:', totalMeasurements);
            Utils.logInfo('KPIs', 'Definindo total measurements no elemento:', DOM_ELEMENTS.totalMeasurements);

            Utils.setElementText(DOM_ELEMENTS.totalMeasurements, totalMeasurements.toString());

            Utils.logInfo('KPIs', 'KPI de medições atualizado', { totalMeasurements });
        } catch (error) {
            Utils.logError('KPIs', 'Erro ao atualizar KPI de medições', error);
        }
    }

    updateViolationsTable(violations) {
        try {
            const tableElement = Utils.getElementById(DOM_ELEMENTS.violationsTable);
            if (!tableElement) {
                Utils.logError('KPIs', 'Tabela de violações não encontrada');
                return;
            }

            if (!violations || violations.length === 0) {
                tableElement.innerHTML = `
                    <tr>
                        <td colspan="4" class="text-center py-4 text-muted">
                            <i class="fas fa-check-circle text-success me-2"></i>
                            Nenhuma violação encontrada no período
                        </td>
                    </tr>
                `;
                Utils.logInfo('KPIs', 'Nenhuma violação para mostrar');
                return;
            }

            const rowsHTML = violations.map(violation => {
                const timestamp = Utils.formatDateTime(violation.timestamp);
                const temperature = Utils.formatNumber(violation.temperature);
                const humidity = Utils.formatNumber(violation.relative_humidity);
                const reason = violation.reason || 'Motivo não especificado';

                return `
                    <tr>
                        <td class="fw-medium">${timestamp}</td>
                        <td>
                            <span class="badge bg-danger-subtle text-danger">
                                ${temperature}°C
                            </span>
                        </td>
                        <td>
                            <span class="badge bg-primary-subtle text-primary">
                                ${humidity}%
                            </span>
                        </td>
                        <td>
                            <small class="text-muted">${reason}</small>
                        </td>
                    </tr>
                `;
            }).join('');

            tableElement.innerHTML = rowsHTML;

            Utils.logInfo('KPIs', `Tabela de violações atualizada com ${violations.length} registros`);
        } catch (error) {
            Utils.logError('KPIs', 'Erro ao atualizar tabela de violações', error);
        }
    }

    // === MÉTODOS DE ANÁLISE ===
    getTemperatureStatus() {
        if (!this.currentData || !this.currentData.summary) return 'unknown';

        const tempMean = Utils.parseFloat(this.currentData.summary.temp_mean);
        if (tempMean === null) return 'unknown';

        if (tempMean >= CONFIG.TEMP_MIN && tempMean <= CONFIG.TEMP_MAX) {
            return 'ideal';
        } else if (tempMean < CONFIG.TEMP_MIN - 2 || tempMean > CONFIG.TEMP_MAX + 2) {
            return 'critical';
        } else {
            return 'warning';
        }
    }

    getHumidityStatus() {
        if (!this.currentData || !this.currentData.summary) return 'unknown';

        const rhMean = Utils.parseFloat(this.currentData.summary.rh_mean);
        if (rhMean === null) return 'unknown';

        if (rhMean <= CONFIG.HUMIDITY_MAX) {
            return 'ideal';
        } else if (rhMean > CONFIG.HUMIDITY_MAX + 10) {
            return 'critical';
        } else {
            return 'warning';
        }
    }

    getOverallStatus() {
        const tempStatus = this.getTemperatureStatus();
        const humidityStatus = this.getHumidityStatus();

        if (tempStatus === 'critical' || humidityStatus === 'critical') {
            return 'critical';
        } else if (tempStatus === 'warning' || humidityStatus === 'warning') {
            return 'warning';
        } else if (tempStatus === 'ideal' && humidityStatus === 'ideal') {
            return 'ideal';
        } else {
            return 'unknown';
        }
    }
}

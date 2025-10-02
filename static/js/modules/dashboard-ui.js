/**
 * Dashboard UI Module
 * User interface manipulation and updates for the environmental monitoring dashboard
 */

class DashboardUI {
    constructor(config = null, errorHandler = null) {
        this.config = config;
        this.errorHandler = errorHandler;
        this.init();
    }

    init() {
        // Initialization
    }

    updateSummaryUI(data) {
        if (!data) {
            console.warn('No data provided to updateSummaryUI');
            return;
        }

        this.updateTemperatureKPI(data.temperature);
        this.updateHumidityKPI(data.humidity);
        this.updateViolationsKPI(data.violations);
        this.updateMeasurementsKPI(data.measurements);
        this.showKPIs();
    }

    updateViolations(violationsData) {
        console.log('📋 updateViolations chamado com dados:', violationsData);
        const container = document.getElementById('violations-list');
        console.log('📋 Container encontrado:', container);
        if (!container) {
            console.warn('Container de violações não encontrado');
            return;
        }

        if (!Array.isArray(violationsData) || violationsData.length === 0) {
            container.innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-check-circle text-success mb-2" style="font-size: 2rem;"></i>
                    <p class="text-muted mb-0">Nenhuma violação recente detectada</p>
                </div>
            `;
            return;
        }

        const violationsHTML = violationsData.map(violation => {
            const timestamp = new Date(violation.timestamp);
            const timeString = timestamp.toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            return `
                <div class="violation-item">
                    <div class="violation-header">
                        <span class="violation-time">${timeString}</span>
                        <span class="violation-type">
                            <i class="fas fa-exclamation-triangle"></i>
                        </span>
                    </div>
                    <div class="violation-details">
                        <div class="violation-values">
                            <span class="temp-value">${violation.temperature?.toFixed(1) || '--'}°C</span>
                            <span class="humidity-value">${violation.relative_humidity?.toFixed(1) || '--'}%</span>
                        </div>
                        <div class="violation-reason">${violation.reason || 'Violação detectada'}</div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = violationsHTML;
    }

    updateTemperatureKPI(tempData) {
        const content = document.getElementById('temp-content');
        const skeleton = document.getElementById('temp-skeleton');

        if (tempData && tempData.average !== undefined) {
            const tempMeanElement = document.getElementById('temp-mean');
            const tempRangeElement = document.getElementById('temp-range');

            if (tempMeanElement) {
                tempMeanElement.textContent = `${tempData.average.toFixed(1)}°C`;
                this.updateTemperatureStatus(tempMeanElement, tempData.average);
            }

            if (tempRangeElement) {
                tempRangeElement.textContent =
                    `Min: ${tempData.min.toFixed(1)}°C | Max: ${tempData.max.toFixed(1)}°C`;
            }
        } else {
            const tempMeanElement = document.getElementById('temp-mean');
            const tempRangeElement = document.getElementById('temp-range');

            if (tempMeanElement) {
                tempMeanElement.textContent = '--';
            }
            if (tempRangeElement) {
                tempRangeElement.textContent = 'Min: -- | Max: --';
            }
        }
    }

    updateHumidityKPI(humidityData) {
        const content = document.getElementById('humidity-content');
        const skeleton = document.getElementById('humidity-skeleton');

        if (humidityData && humidityData.average !== undefined) {
            const rhMeanElement = document.getElementById('rh-mean');
            const rhRangeElement = document.getElementById('rh-range');

            if (rhMeanElement) {
                rhMeanElement.textContent = `${humidityData.average.toFixed(1)}%`;
                this.updateHumidityStatus(rhMeanElement, humidityData.average);
            }

            if (rhRangeElement) {
                rhRangeElement.textContent =
                    `Min: ${humidityData.min.toFixed(1)}% | Max: ${humidityData.max.toFixed(1)}%`;
            }
        } else {
            const rhMeanElement = document.getElementById('rh-mean');
            const rhRangeElement = document.getElementById('rh-range');

            if (rhMeanElement) rhMeanElement.textContent = '--';
            if (rhRangeElement) rhRangeElement.textContent = 'Min: -- | Max: --';
        }
    }

    updateViolationsKPI(violationsData) {
        const content = document.getElementById('violations-content');
        const skeleton = document.getElementById('violations-skeleton');

        if (violationsData !== undefined) {
            const total = typeof violationsData === 'number' ? violationsData : (violationsData.total || 0);
            const base = typeof violationsData === 'object' && violationsData.base_measurements ?
                violationsData.base_measurements : 0;
            const percentage = base > 0 ? ((total / base) * 100).toFixed(1) : '0.0';

            const violationsCountElement = document.getElementById('violations-count');
            const violationsPctElement = document.getElementById('violations-pct');
            const violationsBaseElement = document.getElementById('violations-base');

            if (violationsCountElement) violationsCountElement.textContent = total.toLocaleString();
            if (violationsPctElement) violationsPctElement.textContent = `${percentage}% do total`;
            if (violationsBaseElement) violationsBaseElement.textContent = `Base: ${base.toLocaleString()} medições`;
        } else {
            const violationsCountElement = document.getElementById('violations-count');
            const violationsPctElement = document.getElementById('violations-pct');
            const violationsBaseElement = document.getElementById('violations-base');

            if (violationsCountElement) violationsCountElement.textContent = '--';
            if (violationsPctElement) violationsPctElement.textContent = '-- do total';
            if (violationsBaseElement) violationsBaseElement.textContent = 'Base: -- medições';
        }
    }

    updateMeasurementsKPI(measurementsData) {
        const content = document.getElementById('measurements-content');
        const skeleton = document.getElementById('measurements-skeleton');

        if (measurementsData !== undefined) {
            const total = typeof measurementsData === 'number' ? measurementsData : (measurementsData.total || 0);
            const totalMeasurementsElement = document.getElementById('total-measurements');
            if (totalMeasurementsElement) {
                totalMeasurementsElement.textContent = total.toLocaleString();
            }
        } else {
            const totalMeasurementsElement = document.getElementById('total-measurements');
            if (totalMeasurementsElement) {
                totalMeasurementsElement.textContent = '--';
            }
        }
    }

    updateTemperatureStatus(element, temperature) {
        if (!element) {
            return;
        }

        element.classList.remove('text-success', 'text-warning', 'text-danger');

        if (temperature >= 17 && temperature <= 19.5) {
            element.classList.add('text-success');
        } else if (temperature >= 15 && temperature <= 22) {
            element.classList.add('text-warning');
        } else {
            element.classList.add('text-danger');
        }
    }

    updateHumidityStatus(element, humidity) {
        if (!element) {
            return;
        }

        element.classList.remove('text-success', 'text-warning', 'text-danger');

        if (humidity <= 62) {
            element.classList.add('text-success');
        } else if (humidity <= 70) {
            element.classList.add('text-warning');
        } else {
            element.classList.add('text-danger');
        }
    }

    showKPIs() {
        console.log('showKPIs chamado - forçando exibição dos KPIs');
        const kpis = ['temp', 'humidity', 'violations', 'measurements'];
        kpis.forEach(kpi => {
            const skeleton = document.getElementById(`${kpi}-skeleton`);
            const content = document.getElementById(`${kpi}-content`);

            if (skeleton && content) {
                skeleton.style.setProperty('display', 'none', 'important');
                content.style.setProperty('display', 'block', 'important');
                content.style.setProperty('visibility', 'visible', 'important');
                content.style.setProperty('opacity', '1', 'important');
                console.log(`KPI ${kpi} exibido`);
            } else {
                console.warn(`Elementos KPI não encontrados para: ${kpi}`);
            }
        });
    }

    /**
     * Função de emergência para mostrar KPIs com dados padrão
     */
    forceShowKPIs() {
        console.log('forceShowKPIs - exibindo KPIs com dados padrão');

        // Dados padrão para exibir algo
        const defaultData = {
            temperature: { average: 19.5, min: 18.0, max: 21.0 },
            humidity: { average: 65.2, min: 60.0, max: 70.0 },
            violations: 3,
            measurements: 730
        };

        this.updateSummaryUI(defaultData);
    }

    showSkeletonLoaders() {
        const kpis = ['temp', 'humidity', 'violations', 'measurements'];
        kpis.forEach(kpi => {
            const skeleton = document.getElementById(`${kpi}-skeleton`);
            const content = document.getElementById(`${kpi}-content`);
            if (skeleton && content) {
                skeleton.style.setProperty('display', 'block', 'important');
                content.style.setProperty('display', 'none', 'important');
            }
        });
    }

    showLoadingSpinner(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = `
                <div class="text-center py-4">
                    <div class="loading-spinner" style="width: 40px; height: 40px; margin: 0 auto 1rem;"></div>
                    <p style="color: rgba(255,255,255,0.7); margin: 0;">Carregando...</p>
                </div>
            `;
        }
    }

    hideLoadingSpinner(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = '';
        }
    }

    createToast(message, type = 'info') {
        const toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) return;

        const toastId = `toast-${Date.now()}`;
        const toastHTML = `
            <div id="${toastId}" class="toast align-items-center text-white border-0" role="alert">
                <div class="d-flex">
                    <div class="toast-body">
                        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'} me-2"></i>
                        <span>${message}</span>
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                </div>
            </div>
        `;

        toastContainer.insertAdjacentHTML('beforeend', toastHTML);
        const toast = document.getElementById(toastId);
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();

        toast.addEventListener('hidden.bs.toast', () => {
            toast.remove();
        });
    }

    formatDateTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    formatNumber(num, decimals = 1) {
        if (typeof num !== 'number' || isNaN(num)) return '--';
        return num.toFixed(decimals);
    }

    formatPercentage(num, total) {
        if (typeof num !== 'number' || typeof total !== 'number' || total === 0) return '--';
        return ((num / total) * 100).toFixed(1);
    }
}

// Módulo disponível para exportação
if (typeof window !== 'undefined') {
    window.DashboardUI = DashboardUI;
}
/**
 * Dashboard UI Module
 * User interface manipulation and updates for the environmental monitoring dashboard
 */

class DashboardUI {
    constructor() {
        this.init();
    }

    init() {
        console.log('Dashboard UI: Initializing...');
    }

    updateSummaryUI(data) {
        console.log('Dashboard UI: updateSummaryUI called with data:', data);
        console.log('Dashboard UI: Current timestamp:', new Date().toISOString());
        console.log('Dashboard UI: Data validation - temperature:', data?.temperature);
        console.log('Dashboard UI: Data validation - humidity:', data?.humidity);
        console.log('Dashboard UI: Data validation - violations:', data?.violations);
        console.log('Dashboard UI: Data validation - measurements:', data?.measurements);

        if (!data) {
            console.error('Dashboard UI: No data provided to updateSummaryUI');
            return;
        }

        // Update temperature KPI
        console.log('Dashboard UI: Updating temperature KPI...');
        this.updateTemperatureKPI(data.temperature);

        // Update humidity KPI
        console.log('Dashboard UI: Updating humidity KPI...');
        this.updateHumidityKPI(data.humidity);

        // Update violations KPI
        console.log('Dashboard UI: Updating violations KPI...');
        this.updateViolationsKPI(data.violations);

        // Update measurements KPI
        console.log('Dashboard UI: Updating measurements KPI...');
        this.updateMeasurementsKPI(data.measurements);

        // Hide skeletons and show content
        console.log('Dashboard UI: About to call showKPIs()');
        this.showKPIs();
        console.log('Dashboard UI: updateSummaryUI completed');
    }

    updateTemperatureKPI(tempData) {
        console.log('Dashboard UI: updateTemperatureKPI called with:', tempData);
        const content = document.getElementById('temp-content');
        const skeleton = document.getElementById('temp-skeleton');
        console.log('Dashboard UI: temp-content element:', content);
        console.log('Dashboard UI: temp-skeleton element:', skeleton);

        if (tempData && tempData.average !== undefined) {
            console.log('Dashboard UI: Temperature data is valid, updating elements');
            const tempMeanElement = document.getElementById('temp-mean');
            const tempRangeElement = document.getElementById('temp-range');
            console.log('Dashboard UI: temp-mean element:', tempMeanElement);
            console.log('Dashboard UI: temp-range element:', tempRangeElement);

            if (tempMeanElement) {
                tempMeanElement.textContent = `${tempData.average.toFixed(1)}°C`;
                console.log('Dashboard UI: Set temp-mean to:', tempMeanElement.textContent);
                // Add visual indicator for temperature status
                this.updateTemperatureStatus(tempMeanElement, tempData.average);
            } else {
                console.error('Dashboard UI: temp-mean element not found!');
            }

            if (tempRangeElement) {
                tempRangeElement.textContent =
                    `Min: ${tempData.min.toFixed(1)}°C | Max: ${tempData.max.toFixed(1)}°C`;
                console.log('Dashboard UI: Set temp-range to:', tempRangeElement.textContent);
            } else {
                console.error('Dashboard UI: temp-range element not found!');
            }
        } else {
            console.log('Dashboard UI: Temperature data is invalid, setting to --');
            const tempMeanElement = document.getElementById('temp-mean');
            const tempRangeElement = document.getElementById('temp-range');

            if (tempMeanElement) {
                tempMeanElement.textContent = '--';
                console.log('Dashboard UI: Set temp-mean to: --');
            }
            if (tempRangeElement) {
                tempRangeElement.textContent = 'Min: -- | Max: --';
                console.log('Dashboard UI: Set temp-range to: Min: -- | Max: --');
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
                // Add visual indicator for humidity status
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
            const base = violationsData.base_measurements || 729; // Use total measurements as base
            const percentage = base > 0 ? ((total / base) * 100).toFixed(1) : 0;

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
            console.warn('Dashboard UI: updateTemperatureStatus called with null element');
            return;
        }

        // Remove existing status classes
        element.classList.remove('text-success', 'text-warning', 'text-danger');

        // Ideal range: 17-19.5°C (according to Embrapa)
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
            console.warn('Dashboard UI: updateHumidityStatus called with null element');
            return;
        }

        // Remove existing status classes
        element.classList.remove('text-success', 'text-warning', 'text-danger');

        // Ideal range: ≤ 62% (according to Embrapa)
        if (humidity <= 62) {
            element.classList.add('text-success');
        } else if (humidity <= 70) {
            element.classList.add('text-warning');
        } else {
            element.classList.add('text-danger');
        }
    }

    showKPIs() {
        console.log('Dashboard UI: showKPIs called at', new Date().toISOString());
        console.log('Dashboard UI: Document readyState:', document.readyState);

        // Hide skeletons and show content for all KPIs
        const kpis = ['temp', 'humidity', 'violations', 'measurements'];
        kpis.forEach(kpi => {
            const skeleton = document.getElementById(`${kpi}-skeleton`);
            const content = document.getElementById(`${kpi}-content`);
            console.log(`Dashboard UI: ${kpi} - skeleton element:`, skeleton);
            console.log(`Dashboard UI: ${kpi} - content element:`, content);

            if (skeleton && content) {
                console.log(`Dashboard UI: ${kpi} - Before changes - skeleton display:`, skeleton.style.display, 'content display:', content.style.display);

                // Use setProperty with !important to override CSS
                skeleton.style.setProperty('display', 'none', 'important');
                content.style.setProperty('display', 'block', 'important');
                content.style.setProperty('visibility', 'visible', 'important');
                content.style.setProperty('opacity', '1', 'important');

                console.log(`Dashboard UI: ${kpi} - After changes - skeleton display:`, skeleton.style.display, 'content display:', content.style.display);
                console.log(`Dashboard UI: ${kpi} - Content innerHTML:`, content.innerHTML.substring(0, 50) + '...');
            } else {
                console.warn(`Dashboard UI: ${kpi} - missing elements - skeleton: ${!!skeleton}, content: ${!!content}`);
            }
        });

        console.log('Dashboard UI: showKPIs completed');
    }

    showSkeletonLoaders() {
        // Show skeletons and hide content for all KPIs
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

    updatePeriodButtons(activePeriod) {
        console.log('Dashboard UI: Updating period buttons for period:', activePeriod);

        // Update button states using data-period attribute
        document.querySelectorAll('.period-btn').forEach(btn => {
            const period = parseInt(btn.dataset.period);
            if (period === activePeriod) {
                btn.classList.add('active');
                console.log('Dashboard UI: Activated button for period:', activePeriod);
            } else {
                btn.classList.remove('active');
            }
        });
    }

    updateCustomPeriodSlider(value) {
        const slider = document.getElementById('period-slider');
        const valueDisplay = document.getElementById('slider-value');

        if (slider) slider.value = value;
        if (valueDisplay) valueDisplay.textContent = `${value} dias`;
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

        // Remove toast after it's hidden
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

// Make UI available as a module property
window.dashboard.ui = new DashboardUI();
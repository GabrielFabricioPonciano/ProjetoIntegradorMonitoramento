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
        console.log('Dashboard UI: Updating summary UI...', data);

        // Update temperature KPI
        this.updateTemperatureKPI(data.temperature);

        // Update humidity KPI
        this.updateHumidityKPI(data.humidity);

        // Update violations KPI
        this.updateViolationsKPI(data.violations);

        // Update measurements KPI
        this.updateMeasurementsKPI(data.measurements);

        // Hide skeletons and show content
        this.showKPIs();
    }

    updateTemperatureKPI(tempData) {
        const content = document.getElementById('temp-content');
        const skeleton = document.getElementById('temp-skeleton');

        if (tempData && tempData.average !== undefined) {
            document.getElementById('temp-mean').textContent = `${tempData.average.toFixed(1)}°C`;
            document.getElementById('temp-range').textContent =
                `Min: ${tempData.min.toFixed(1)}°C | Max: ${tempData.max.toFixed(1)}°C`;

            // Add visual indicator for temperature status
            const tempElement = document.getElementById('temp-mean');
            this.updateTemperatureStatus(tempElement, tempData.average);
        } else {
            document.getElementById('temp-mean').textContent = '--';
            document.getElementById('temp-range').textContent = 'Min: -- | Max: --';
        }
    }

    updateHumidityKPI(humidityData) {
        const content = document.getElementById('humidity-content');
        const skeleton = document.getElementById('humidity-skeleton');

        if (humidityData && humidityData.average !== undefined) {
            document.getElementById('rh-mean').textContent = `${humidityData.average.toFixed(1)}%`;
            document.getElementById('rh-range').textContent =
                `Min: ${humidityData.min.toFixed(1)}% | Max: ${humidityData.max.toFixed(1)}%`;

            // Add visual indicator for humidity status
            const humidityElement = document.getElementById('rh-mean');
            this.updateHumidityStatus(humidityElement, humidityData.average);
        } else {
            document.getElementById('rh-mean').textContent = '--';
            document.getElementById('rh-range').textContent = 'Min: -- | Max: --';
        }
    }

    updateViolationsKPI(violationsData) {
        const content = document.getElementById('violations-content');
        const skeleton = document.getElementById('violations-skeleton');

        if (violationsData !== undefined) {
            const total = typeof violationsData === 'number' ? violationsData : (violationsData.total || 0);
            const base = violationsData.base_measurements || 729; // Use total measurements as base
            const percentage = base > 0 ? ((total / base) * 100).toFixed(1) : 0;

            document.getElementById('violations-count').textContent = total.toLocaleString();
            document.getElementById('violations-pct').textContent = `${percentage}% do total`;
            document.getElementById('violations-base').textContent = `Base: ${base.toLocaleString()} medições`;
        } else {
            document.getElementById('violations-count').textContent = '--';
            document.getElementById('violations-pct').textContent = '-- do total';
            document.getElementById('violations-base').textContent = 'Base: -- medições';
        }
    }

    updateMeasurementsKPI(measurementsData) {
        const content = document.getElementById('measurements-content');
        const skeleton = document.getElementById('measurements-skeleton');

        if (measurementsData !== undefined) {
            const total = typeof measurementsData === 'number' ? measurementsData : (measurementsData.total || 0);
            document.getElementById('total-measurements').textContent = total.toLocaleString();
        } else {
            document.getElementById('total-measurements').textContent = '--';
        }
    }

    updateTemperatureStatus(element, temperature) {
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
        // Hide skeletons and show content for all KPIs
        const kpis = ['temp', 'humidity', 'violations', 'measurements'];
        kpis.forEach(kpi => {
            const skeleton = document.getElementById(`${kpi}-skeleton`);
            const content = document.getElementById(`${kpi}-content`);
            if (skeleton && content) {
                skeleton.style.display = 'none';
                content.style.display = 'block';
            }
        });
    }

    showSkeletonLoaders() {
        // Show skeletons and hide content for all KPIs
        const kpis = ['temp', 'humidity', 'violations', 'measurements'];
        kpis.forEach(kpi => {
            const skeleton = document.getElementById(`${kpi}-skeleton`);
            const content = document.getElementById(`${kpi}-content`);
            if (skeleton && content) {
                skeleton.style.display = 'block';
                content.style.display = 'none';
            }
        });
    }

    updatePeriodButtons(activePeriod) {
        // Update radio button states
        document.querySelectorAll('input[name="period"]').forEach(radio => {
            const label = document.querySelector(`label[for="${radio.id}"]`);
            if (radio.value == activePeriod) {
                radio.checked = true;
                label.classList.add('active');
            } else {
                radio.checked = false;
                label.classList.remove('active');
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
// modules/ui.js - Gerenciador de interface e UX
import { DOM_ELEMENTS, CONFIG } from './config.js';
import { Utils } from './utils.js';

export class UIManager {
    constructor() {
        this.isLoading = false;
        this.skeletonElements = [];
    }

    // === LOADING OVERLAY ===
    showLoading() {
        this.isLoading = true;
        Utils.showElement(DOM_ELEMENTS.loadingOverlay);
        Utils.logInfo('UI', 'Loading overlay mostrado');
    }

    hideLoading() {
        this.isLoading = false;
        Utils.hideElement(DOM_ELEMENTS.loadingOverlay);
        Utils.logInfo('UI', 'Loading overlay escondido');
    }

    // === SKELETON LOADERS ===
    showSkeletons() {
        const skeletonIds = [
            'temp-skeleton',
            'humidity-skeleton',
            'violations-skeleton',
            'measurements-skeleton'
        ];

        skeletonIds.forEach(id => {
            Utils.showElement(id);
        });

        Utils.logInfo('UI', 'Skeleton loaders mostrados');
    }

    hideSkeletons() {
        const skeletonIds = [
            'temp-skeleton',
            'humidity-skeleton',
            'violations-skeleton',
            'measurements-skeleton'
        ];

        const contentIds = [
            'temp-content',
            'humidity-content',
            'violations-content',
            'measurements-content'
        ];

        skeletonIds.forEach(id => {
            Utils.hideElement(id);
        });

        contentIds.forEach(id => {
            Utils.showElement(id);
        });

        Utils.logInfo('UI', 'Skeleton loaders escondidos e conteúdo mostrado');
    }

    // === CHART CONTAINERS ===
    prepareChartContainers() {
        Utils.logInfo('UI', 'Preparando containers dos gráficos');

        const tempContainer = Utils.getElementById(DOM_ELEMENTS.tempChartContainer);
        const rhContainer = Utils.getElementById(DOM_ELEMENTS.rhChartContainer);
        const tempPlaceholder = Utils.getElementById(DOM_ELEMENTS.tempChartPlaceholder);
        const rhPlaceholder = Utils.getElementById(DOM_ELEMENTS.rhChartPlaceholder);

        if (tempContainer) {
            tempContainer.style.display = 'block';
            tempContainer.style.height = `${CONFIG.CHART_HEIGHT}px`;
            tempContainer.style.minHeight = `${CONFIG.CHART_MIN_HEIGHT}px`;
            Utils.logInfo('UI', 'Container temperatura preparado');
        }

        if (rhContainer) {
            rhContainer.style.display = 'block';
            rhContainer.style.height = `${CONFIG.CHART_HEIGHT}px`;
            rhContainer.style.minHeight = `${CONFIG.CHART_MIN_HEIGHT}px`;
            Utils.logInfo('UI', 'Container umidade preparado');
        }

        if (tempPlaceholder) {
            tempPlaceholder.style.display = 'none';
        }
        if (rhPlaceholder) {
            rhPlaceholder.style.display = 'none';
        }

        // Forçar reflow para garantir que as dimensões são aplicadas
        Utils.forceReflow(tempContainer);
        Utils.forceReflow(rhContainer);
    }

    showChartContainers() {
        const tempPlaceholder = Utils.getElementById(DOM_ELEMENTS.tempChartPlaceholder);
        const tempContainer = Utils.getElementById(DOM_ELEMENTS.tempChartContainer);
        const rhPlaceholder = Utils.getElementById(DOM_ELEMENTS.rhChartPlaceholder);
        const rhContainer = Utils.getElementById(DOM_ELEMENTS.rhChartContainer);

        Utils.logInfo('UI', 'Elementos encontrados:', {
            tempPlaceholder: !!tempPlaceholder,
            tempContainer: !!tempContainer,
            rhPlaceholder: !!rhPlaceholder,
            rhContainer: !!rhContainer
        });

        if (tempPlaceholder) {
            tempPlaceholder.style.display = 'none';
            Utils.logInfo('UI', 'Placeholder temperatura escondido');
        }
        if (tempContainer) {
            tempContainer.style.display = 'block';
            Utils.logInfo('UI', 'Container temperatura mostrado');
        }
        if (rhPlaceholder) {
            rhPlaceholder.style.display = 'none';
            Utils.logInfo('UI', 'Placeholder umidade escondido');
        }
        if (rhContainer) {
            rhContainer.style.display = 'block';
            Utils.logInfo('UI', 'Container umidade mostrado');
        }

        Utils.logInfo('UI', 'Gráficos finalizados');
    }

    // === LAST UPDATED ===
    updateLastUpdatedTime() {
        const now = new Date();
        const timeString = Utils.formatDate(now);
        Utils.setElementText(DOM_ELEMENTS.lastUpdated, `Atualizado às ${timeString}`);
        Utils.logInfo('UI', `Última atualização: ${timeString}`);
    }

    // === ANIMATIONS ===
    fadeIn(elementId, duration = 300) {
        const element = Utils.getElementById(elementId);
        if (element) {
            element.style.opacity = '0';
            element.style.display = 'block';

            const start = performance.now();

            const animate = (currentTime) => {
                const elapsed = currentTime - start;
                const progress = Math.min(elapsed / duration, 1);

                element.style.opacity = progress.toString();

                if (progress < 1) {
                    requestAnimationFrame(animate);
                }
            };

            requestAnimationFrame(animate);
        }
    }

    fadeOut(elementId, duration = 300) {
        const element = Utils.getElementById(elementId);
        if (element) {
            const start = performance.now();
            const startOpacity = parseFloat(element.style.opacity) || 1;

            const animate = (currentTime) => {
                const elapsed = currentTime - start;
                const progress = Math.min(elapsed / duration, 1);

                element.style.opacity = (startOpacity * (1 - progress)).toString();

                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    element.style.display = 'none';
                }
            };

            requestAnimationFrame(animate);
        }
    }

    // === UTILITY METHODS ===
    getState() {
        return {
            isLoading: this.isLoading,
            chartContainersVisible: this.areChartContainersVisible()
        };
    }

    areChartContainersVisible() {
        const tempContainer = Utils.getElementById(DOM_ELEMENTS.tempChartContainer);
        const rhContainer = Utils.getElementById(DOM_ELEMENTS.rhChartContainer);

        return !!(tempContainer && tempContainer.style.display === 'block' &&
            rhContainer && rhContainer.style.display === 'block');
    }
}

// modules/config.js - Configurações e constantes
export const CONFIG = {
    // Intervalos de tempo
    AUTO_REFRESH_INTERVAL: 60000, // 1 minuto
    CHART_ANIMATION_DURATION: 1000,

    // Delays para inicialização
    CHART_CREATION_DELAY: 500,
    CONTAINER_SHOW_DELAY: 100,
    RESIZE_DELAY: 200,

    // Configurações da API
    MAX_POINTS: 1000,
    DEFAULT_PERIOD: 30,

    // Configurações dos gráficos
    CHART_HEIGHT: 400,
    CHART_MIN_HEIGHT: 400,

    // Limites ideais (Embrapa)
    TEMP_MIN: 17,
    TEMP_MAX: 19.5,
    HUMIDITY_MAX: 62,

    // Cores do tema
    COLORS: {
        temperature: '#dc3545',
        humidity: '#0d6efd',
        success: '#198754',
        warning: '#ffc107',
        danger: '#dc3545',
        primary: '#0d6efd'
    }
};

export const API_ENDPOINTS = {
    summary: (days) => `/api/summary/?days=${days}`,
    series: (days, maxPoints) => `/api/series/?days=${days}&max_points=${maxPoints}`,
    violations: (days, limit) => `/api/violations/?days=${days}&limit=${limit}`,
    forceCycle: '/api/force-cycle/'
};

export const DOM_ELEMENTS = {
    // Containers dos gráficos
    tempChartContainer: 'temp-chart-container',
    tempChartPlaceholder: 'temp-chart-placeholder',
    rhChartContainer: 'rh-chart-container',
    rhChartPlaceholder: 'rh-chart-placeholder',

    // Canvas dos gráficos
    tempChart: 'tempChart',
    rhChart: 'rhChart',

    // KPIs
    tempMean: 'temp-mean',
    tempRange: 'temp-range',
    rhMean: 'rh-mean',
    rhRange: 'rh-range',
    violationsCount: 'violations-count',
    violationsPct: 'violations-pct',
    violationsBase: 'violations-base',
    totalMeasurements: 'total-measurements',

    // Controles
    forceCycleBtn: 'force-cycle-btn',
    lastUpdated: 'last-updated',
    violationsTable: 'violations-table',

    // Loading e overlays
    loadingOverlay: 'loading-overlay',

    // Toasts
    errorToast: 'error-toast',
    successToast: 'success-toast',
    loadingToast: 'loading-toast',
    errorMessage: 'error-message',
    successMessage: 'success-message'
};

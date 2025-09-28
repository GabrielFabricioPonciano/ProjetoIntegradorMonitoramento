/**
 * Dashboard Main Initializer
 * Main entry point that initializes all dashboard modules and starts the application
 */

(function () {
    'use strict';

    // Wait for DOM to be fully loaded
    document.addEventListener('DOMContentLoaded', function () {
        // Performance monitoring start
        if ('performance' in window && 'mark' in window.performance) {
            performance.mark('dashboard-init-start');
        }

        console.log('Dashboard Init: Starting initialization...');

        try {
            // Check if dashboard core is available
            if (typeof window.dashboard === 'undefined') {
                console.error('Dashboard Init: Dashboard core not found!');
                showInitializationError('Sistema de dashboard não encontrado. Recarregue a página.');
                return;
            }

            console.log('Dashboard Init: Dashboard core found, initializing modules...');

            // Initialize all modules in correct order
            initializeModules()
                .then(() => {
                    console.log('Dashboard Init: All modules initialized successfully');
                    startDashboard();
                })
                .catch(error => {
                    console.error('Dashboard Init: Initialization failed:', error);
                    showInitializationError('Falha ao inicializar o dashboard: ' + error.message);
                });
        } catch (error) {
            console.error('Dashboard Init: Unexpected error during initialization:', error);
            showInitializationError('Erro inesperado: ' + error.message);
        }
    });

    async function initializeModules() {
        const modules = [
            'ui',
            'data',
            'charts',
            'violations',
            'ai'
        ];

        console.log('Dashboard Init: Starting module initialization...');
        console.log('Dashboard Init: Available dashboard object:', typeof window.dashboard);
        console.log('Dashboard Init: Dashboard properties:', Object.keys(window.dashboard || {}));

        console.log('Dashboard Init: Waiting for modules:', modules);

        // Wait for modules to be available
        await waitForModules(modules);

        console.log('Dashboard Init: All modules verified and loaded');
    }

    function waitForModules(modules) {
        return new Promise((resolve) => {
            const checkModules = () => {
                const loadedModules = [];
                const missingModules = [];

                modules.forEach(module => {
                    if (typeof window.dashboard[module] !== 'undefined') {
                        loadedModules.push(module);
                    } else {
                        missingModules.push(module);
                    }
                });

                console.log('Dashboard Init: Current check - Loaded modules:', loadedModules);
                console.log('Dashboard Init: Current check - Missing modules:', missingModules);
                console.log('Dashboard Init: Dashboard object keys:', Object.keys(window.dashboard || {}));

                if (missingModules.length === 0) {
                    // Initialize Chart.js if available
                    if (typeof Chart !== 'undefined') {
                        Chart.defaults.color = 'rgba(255, 255, 255, 0.7)';
                        Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.1)';
                        console.log('Dashboard Init: Chart.js initialized');
                    }

                    // Initialize Bootstrap tooltips if available
                    if (typeof bootstrap !== 'undefined' && bootstrap.Tooltip) {
                        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
                        tooltipTriggerList.map(function (tooltipTriggerEl) {
                            return new bootstrap.Tooltip(tooltipTriggerEl);
                        });
                        console.log('Dashboard Init: Bootstrap tooltips initialized');
                    }

                    resolve();
                } else {
                    console.log('Dashboard Init: Waiting for modules to load...');
                    setTimeout(checkModules, 100);
                }
            };

            checkModules();
        });
    }

    function startDashboard() {
        try {
            // Start the dashboard core
            if (window.dashboard && typeof window.dashboard.start === 'function') {
                window.dashboard.start();
            }

            // Hide loading overlay after a short delay to show it briefly
            setTimeout(() => {
                const overlay = document.getElementById('loading-overlay');
                if (overlay) {
                    overlay.classList.add('hidden');
                }
            }, 1000);

            // Set up global error handling
            setupErrorHandling();

            // Set up keyboard shortcuts
            setupKeyboardShortcuts();

            // Initialize responsive behavior
            setupResponsiveBehavior();

            // Show welcome message
            showWelcomeMessage();

            console.log('Dashboard Init: Dashboard started successfully');

            // Performance monitoring
            if ('performance' in window && 'mark' in window.performance) {
                performance.mark('dashboard-init-end');
                performance.measure('dashboard-initialization', 'dashboard-init-start', 'dashboard-init-end');

                const measure = performance.getEntriesByName('dashboard-initialization')[0];
                console.log(`Dashboard Init: Initialization took ${measure.duration.toFixed(2)}ms`);
            }

        } catch (error) {
            console.error('Dashboard Init: Error starting dashboard:', error);
            showInitializationError('Erro ao iniciar o dashboard: ' + error.message);
        }
    }

    function setupErrorHandling() {
        // Global error handler for JavaScript errors
        window.addEventListener('error', function (event) {
            console.error('Dashboard Error:', event.error);
            window.dashboard.showError('Erro no sistema: ' + event.error.message);
        });

        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', function (event) {
            console.error('Dashboard Unhandled Rejection:', event.reason);
            window.dashboard.showError('Erro assíncrono: ' + event.reason.message);
        });

        // Handle network errors
        window.addEventListener('offline', function () {
            window.dashboard.showError('Conexão com a internet perdida');
        });

        window.addEventListener('online', function () {
            window.dashboard.showSuccess('Conexão restaurada');
        });
    }

    function setupKeyboardShortcuts() {
        document.addEventListener('keydown', function (event) {
            // Ctrl/Cmd + R to force refresh
            if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
                event.preventDefault();
                window.dashboard.forceCycle();
                return;
            }

            // Ctrl/Cmd + P to download PDF report
            if ((event.ctrlKey || event.metaKey) && event.key === 'p') {
                event.preventDefault();
                downloadReport('pdf', window.dashboard.state.currentPeriod);
                return;
            }

            // Ctrl/Cmd + E to download Excel report
            if ((event.ctrlKey || event.metaKey) && event.key === 'e') {
                event.preventDefault();
                downloadReport('excel', window.dashboard.state.currentPeriod);
                return;
            }

            // Number keys 1-7 for period selection
            if (!event.ctrlKey && !event.metaKey && !event.altKey) {
                const periodMap = {
                    '1': 1,
                    '2': 7,
                    '3': 30,
                    '4': 90
                };

                if (periodMap[event.key]) {
                    event.preventDefault();
                    changePeriod(periodMap[event.key]);
                }
            }
        });
    }

    function setupResponsiveBehavior() {
        // Handle window resize
        let resizeTimeout;
        window.addEventListener('resize', function () {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(function () {
                if (window.dashboard.resizeCharts) {
                    window.dashboard.resizeCharts();
                }
            }, 250);
        });

        // Handle visibility change (tab switching)
        document.addEventListener('visibilitychange', function () {
            if (!document.hidden) {
                // Tab became visible, refresh data if needed
                const now = Date.now();
                const lastUpdate = window.dashboard.state.lastUpdate;
                if (lastUpdate && (now - lastUpdate.getTime()) > 5 * 60 * 1000) { // 5 minutes
                    console.log('Dashboard Init: Refreshing data after tab became visible');
                    window.dashboard.loadSummary();
                }
            }
        });
    }

    function showWelcomeMessage() {
        setTimeout(() => {
            window.dashboard.showSuccess('Dashboard carregado com sucesso');
        }, 1500);
    }

    function showInitializationError(message) {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.innerHTML = `
                <div class="text-center">
                    <div class="text-danger mb-3">
                        <i class="fas fa-exclamation-triangle fa-3x"></i>
                    </div>
                    <h4 class="text-danger">Erro de Inicialização</h4>
                    <p class="text-white">${message}</p>
                    <button class="btn btn-primary mt-3" onclick="location.reload()">
                        <i class="fas fa-redo me-2"></i>Recarregar Página
                    </button>
                </div>
            `;
            overlay.classList.remove('hidden');
        } else {
            alert('Erro: ' + message);
        }
    }

    // Global helper functions
    window.downloadReport = function (format, days) {
        if (window.dashboard.downloadReport) {
            window.dashboard.downloadReport(format, days);
        }
    };

    window.changePeriod = function (days) {
        window.dashboard.state.currentPeriod = days;
        window.dashboard.updatePeriodButtons(days);
        window.dashboard.reloadAllData();
    };

    window.applyCustomPeriod = function () {
        if (window.dashboard.applyCustomPeriod) {
            window.dashboard.applyCustomPeriod();
        }
    };

    console.log('Dashboard Init: Initialization script loaded');

})();
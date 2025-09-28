/**
 * Dashboard Main Initializer
 * Main entry point that initializes all dashboard modules and starts the application
 */

(function () {
    'use strict';

    // Wait for DOM to be fully loaded
    document.addEventListener('DOMContentLoaded', function () {
        console.log('Dashboard Init: DOMContentLoaded fired at', new Date().toISOString());
        console.log('Dashboard Init: Document readyState:', document.readyState);

        // Additional check to ensure all elements are rendered
        if (document.readyState === 'loading') {
            console.log('Dashboard Init: Document still loading, waiting...');
            return;
        }

        // Wait a bit more to ensure all scripts are loaded
        setTimeout(() => {
            console.log('Dashboard Init: Timeout completed, proceeding with initialization');
            initializeDashboard();
        }, 100);
    });

    // Fallback for when DOMContentLoaded already fired
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        console.log('Dashboard Init: Document already ready, initializing immediately');
        setTimeout(() => {
            initializeDashboard();
        }, 100);
    }

    function initializeDashboard() {
        // Performance monitoring start
        if ('performance' in window && 'mark' in window.performance) {
            performance.mark('dashboard-init-start');
        }

        console.log('Dashboard Init: Starting initialization...');

        // Check if all required modules are loaded
        console.log('Dashboard Init: Checking module availability...');
        console.log('Dashboard Init: window.dashboard exists:', typeof window.dashboard);
        console.log('Dashboard Init: window.dashboard.core exists:', typeof window.dashboard.core);
        console.log('Dashboard Init: window.dashboard.ui exists:', typeof window.dashboard.ui);
        console.log('Dashboard Init: window.dashboard.data exists:', typeof window.dashboard.data);
        console.log('Dashboard Init: window.dashboard.charts exists:', typeof window.dashboard.charts);
        console.log('Dashboard Init: window.dashboard.violations exists:', typeof window.dashboard.violations);
        console.log('Dashboard Init: window.dashboard.ai exists:', typeof window.dashboard.ai);
        // Check if dashboard core is available
        if (typeof window.dashboard === 'undefined') {
            console.error('Dashboard Init: Dashboard core not found!');
            showInitializationError('Sistema de dashboard não encontrado. Recarregue a página.');
            return;
        }

        console.log('Dashboard Init: Dashboard core found, initializing modules...');

        try {
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
    }

    async function initializeModules() {
        const modules = [
            'core',
            'ui',
            'data',
            'violations',
            'ai'
            // 'charts' - optional, will be initialized separately if available
        ];

        console.log('Dashboard Init: Starting module initialization...');
        console.log('Dashboard Init: Available dashboard object:', typeof window.dashboard);
        console.log('Dashboard Init: Dashboard properties:', Object.keys(window.dashboard || {}));

        console.log('Dashboard Init: Waiting for modules:', modules);

        // Wait for modules to be available with timeout
        const timeout = 5000; // 5 seconds timeout
        const startTime = Date.now();

        await waitForModules(modules);

        const elapsed = Date.now() - startTime;
        console.log(`Dashboard Init: Module loading took ${elapsed}ms`);

        console.log('Dashboard Init: All modules verified and loaded');

        // Initialize charts after all modules are loaded
        if (window.dashboard.charts && typeof window.dashboard.charts.init === 'function') {
            console.log('Dashboard Init: Initializing charts...');
            try {
                window.dashboard.charts.init();
            } catch (error) {
                console.warn('Dashboard Init: Failed to initialize charts:', error);
                console.warn('Dashboard Init: Charts module will be unavailable');
            }
        } else {
            console.warn('Dashboard Init: Charts module not available or missing init method');
        }
    }

    function waitForModules(modules) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                console.warn('Dashboard Init: Timeout waiting for modules, proceeding anyway');
                console.warn('Dashboard Init: Final module status:');
                modules.forEach(module => {
                    console.warn(`Dashboard Init: ${module}: ${typeof window.dashboard[module] !== 'undefined'}`);
                });
                // Always resolve, don't wait forever
                resolve();
            }, 2000); // Reduced timeout to 2 seconds

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

                // Proceed if at least core and ui are loaded, or after minimal wait
                if (missingModules.length === 0 || (loadedModules.includes('core') && loadedModules.includes('ui'))) {
                    clearTimeout(timeout);
                    resolve();
                } else {
                    console.log('Dashboard Init: Waiting for modules to load...');
                    setTimeout(checkModules, 50); // Faster check interval
                }
            };

            checkModules();
        });
    }

    function startDashboard() {
        try {
            console.log('Dashboard Init: startDashboard called at', new Date().toISOString());
            // Start the dashboard core
            if (window.dashboard && window.dashboard.core && typeof window.dashboard.core.start === 'function') {
                console.log('Dashboard Init: window.dashboard.core.start function found, calling it...');
                window.dashboard.core.start();
                console.log('Dashboard Init: window.dashboard.core.start() completed successfully');
            } else {
                console.error('Dashboard Init: window.dashboard.core.start not available');
                console.error('Dashboard Init: window.dashboard exists:', !!window.dashboard);
                console.error('Dashboard Init: window.dashboard.core exists:', !!(window.dashboard && window.dashboard.core));
                console.error('Dashboard Init: window.dashboard type:', typeof window.dashboard);
                if (window.dashboard) {
                    console.error('Dashboard Init: window.dashboard methods:', Object.getOwnPropertyNames(window.dashboard));
                }
            }

            // Force bind events after a short delay to ensure DOM is ready
            setTimeout(() => {
                console.log('Dashboard Init: Force binding events...');
                if (window.dashboard && window.dashboard.core && typeof window.dashboard.core.bindEvents === 'function') {
                    window.dashboard.core.bindEvents();
                    console.log('Dashboard Init: Events bound successfully');
                } else {
                    console.error('Dashboard Init: bindEvents method not available');
                }

                // Force load data immediately
                if (window.dashboard && window.dashboard.core && typeof window.dashboard.core.loadInitialData === 'function') {
                    console.log('Dashboard Init: Force loading initial data...');
                    window.dashboard.core.loadInitialData();
                } else {
                    console.error('Dashboard Init: loadInitialData method not available');
                }
            }, 500);

            // Hide loading overlay after a short delay to show it briefly
            setTimeout(() => {
                console.log('Dashboard Init: Hiding loading overlay');
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
            if (window.dashboard && window.dashboard.core && typeof window.dashboard.core.showError === 'function') {
                window.dashboard.core.showError('Erro no sistema: ' + event.error.message);
            }
        });

        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', function (event) {
            console.error('Dashboard Unhandled Rejection:', event.reason);
            if (window.dashboard && window.dashboard.core && typeof window.dashboard.core.showError === 'function') {
                window.dashboard.core.showError('Erro assíncrono: ' + event.reason.message);
            }
        });

        // Handle network errors
        window.addEventListener('offline', function () {
            if (window.dashboard && window.dashboard.core && typeof window.dashboard.core.showError === 'function') {
                window.dashboard.core.showError('Conexão com a internet perdida');
            }
        });

        window.addEventListener('online', function () {
            if (window.dashboard && window.dashboard.core && typeof window.dashboard.core.showSuccess === 'function') {
                window.dashboard.core.showSuccess('Conexão restaurada');
            }
        });
    }

    function setupKeyboardShortcuts() {
        document.addEventListener('keydown', function (event) {
            // Ctrl/Cmd + R to force refresh
            if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
                event.preventDefault();
                if (window.dashboard && window.dashboard.core && typeof window.dashboard.core.forceCycle === 'function') {
                    window.dashboard.core.forceCycle();
                }
                return;
            }

            // Ctrl/Cmd + P to download PDF report
            if ((event.ctrlKey || event.metaKey) && event.key === 'p') {
                event.preventDefault();
                if (window.dashboard && window.dashboard.core && window.dashboard.core.state) {
                    downloadReport('pdf', window.dashboard.core.state.currentPeriod);
                }
                return;
            }

            // Ctrl/Cmd + E to download Excel report
            if ((event.ctrlKey || event.metaKey) && event.key === 'e') {
                event.preventDefault();
                if (window.dashboard && window.dashboard.core && window.dashboard.core.state) {
                    downloadReport('excel', window.dashboard.core.state.currentPeriod);
                }
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
                if (window.dashboard && window.dashboard.charts && typeof window.dashboard.charts.resizeCharts === 'function') {
                    window.dashboard.charts.resizeCharts();
                }
            }, 250);
        });

        // Handle visibility change (tab switching)
        document.addEventListener('visibilitychange', function () {
            if (!document.hidden) {
                // Tab became visible, refresh data if needed
                const now = Date.now();
                if (window.dashboard && window.dashboard.core && window.dashboard.core.state && window.dashboard.core.state.lastUpdate) {
                    const lastUpdate = window.dashboard.core.state.lastUpdate;
                    if (lastUpdate && (now - lastUpdate.getTime()) > 5 * 60 * 1000) { // 5 minutes
                        console.log('Dashboard Init: Refreshing data after tab became visible');
                        if (window.dashboard.core.loadSummary) {
                            window.dashboard.core.loadSummary();
                        }
                    }
                }
            }
        });
    }

    function showWelcomeMessage() {
        setTimeout(() => {
            if (window.dashboard && window.dashboard.core && typeof window.dashboard.core.showSuccess === 'function') {
                window.dashboard.core.showSuccess('Dashboard carregado com sucesso');
            }
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
        if (window.dashboard && window.dashboard.core && typeof window.dashboard.core.downloadReport === 'function') {
            window.dashboard.core.downloadReport(format, days);
        }
    };

    window.changePeriod = function (days) {
        console.log('🔄 DASHBOARD-INIT: changePeriod called with days:', days);
        console.log('🔍 DASHBOARD-INIT: window.dashboard exists:', !!window.dashboard);
        console.log('🔍 DASHBOARD-INIT: window.dashboard.core exists:', !!(window.dashboard && window.dashboard.core));
        console.log('🔍 DASHBOARD-INIT: reloadAllData exists:', !!(window.dashboard && window.dashboard.core && window.dashboard.core.reloadAllData));

        // Update button styles
        document.querySelectorAll('.period-btn').forEach(btn => {
            btn.classList.remove('active');
            if (parseInt(btn.dataset.period) === days) {
                btn.classList.add('active');
            }
        });

        // Update dashboard state
        if (window.dashboard && window.dashboard.core) {
            if (window.dashboard.core.state) {
                window.dashboard.core.state.currentPeriod = days;
                console.log('✅ DASHBOARD-INIT: Updated currentPeriod to:', days);
            }
            if (window.dashboard.ui && typeof window.dashboard.ui.updatePeriodButtons === 'function') {
                window.dashboard.ui.updatePeriodButtons(days);
            }
            if (window.dashboard.core.reloadAllData) {
                console.log('🔄 DASHBOARD-INIT: Calling reloadAllData');
                window.dashboard.core.reloadAllData();
            } else {
                console.error('❌ DASHBOARD-INIT: reloadAllData not available');
                // Fallback: try to call load methods directly
                console.log('🔄 DASHBOARD-INIT: Trying fallback load methods');
                if (window.dashboard.core.loadSummary) window.dashboard.core.loadSummary();
                if (window.dashboard.core.loadSeries) window.dashboard.core.loadSeries();
                if (window.dashboard.core.loadViolations) window.dashboard.core.loadViolations();
                if (window.dashboard.core.loadAI) window.dashboard.core.loadAI();
            }
        } else {
            console.error('❌ DASHBOARD-INIT: dashboard.core not available');
        }
    };

    window.showCustomPeriod = function () {
        console.log('🔧 DASHBOARD-INIT: showCustomPeriod called');
        console.log('🔍 DASHBOARD-INIT: showCustomPeriodPanel exists:', !!(window.dashboard && window.dashboard.core && window.dashboard.core.showCustomPeriodPanel));

        if (window.dashboard && window.dashboard.core && typeof window.dashboard.core.showCustomPeriodPanel === 'function') {
            window.dashboard.core.showCustomPeriodPanel();
        } else {
            console.error('❌ DASHBOARD-INIT: showCustomPeriodPanel not available');
            // Fallback: show panel directly
            const panel = document.getElementById('custom-period-panel');
            if (panel) {
                panel.style.display = 'block';
                console.log('✅ DASHBOARD-INIT: Panel shown via fallback');
            }
        }
    };

    window.applyCustomPeriod = function () {
        console.log('🔧 DASHBOARD-INIT: applyCustomPeriod called');
        console.log('🔍 DASHBOARD-INIT: applyCustomPeriod exists:', !!(window.dashboard && window.dashboard.core && window.dashboard.core.applyCustomPeriod));

        if (window.dashboard && window.dashboard.core && typeof window.dashboard.core.applyCustomPeriod === 'function') {
            window.dashboard.core.applyCustomPeriod();
        } else {
            console.error('❌ DASHBOARD-INIT: applyCustomPeriod not available');
            // Fallback: apply period directly
            const slider = document.getElementById('period-slider');
            if (slider) {
                const days = parseInt(slider.value);
                console.log('🔄 DASHBOARD-INIT: Applying period via fallback:', days);
                window.changePeriod(days);
                const panel = document.getElementById('custom-period-panel');
                if (panel) {
                    panel.style.display = 'none';
                }
            }
        }
    };

    console.log('Dashboard Init: Initialization script loaded');

})();
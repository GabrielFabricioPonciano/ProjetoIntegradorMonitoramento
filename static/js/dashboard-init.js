/**
 * Dashboard Main Initializer    function initializeDashboard() {
        console.log('🔄 initializeDashboard called, readyState:', document.readyState);

        // Simple test: try to access basic elements
        const violationsList = document.getElementById('violations-list');
        console.log('violations-list element:', violationsList);

        if (document.readyState !== 'complete') {
            console.log('DOM not complete, waiting...');
            return;
        }

        console.log('🚀 Starting dashboard initialization...');entry point that initializes all dashboard modules and starts the application
 */

console.log('🚀 dashboard-init.js loaded');

(function () {
    'use strict';

    console.log('📦 Dashboard init IIFE started');

    document.addEventListener('DOMContentLoaded', function () {
        if (document.readyState === 'loading') {
            return;
        }
        setTimeout(() => {
            initializeDashboard();
        }, 100);
    });

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(() => {
            initializeDashboard();
        }, 100);
    }

    // Fallback: try to initialize after a delay
    setTimeout(() => {
        if (!window.dashboard || !window.dashboard.core) {
            console.log('Fallback initialization triggered');
            initializeDashboard();
        }
    }, 2000);

    function initializeDashboard() {
        console.log('🔄 initializeDashboard called, readyState:', document.readyState);

        if (document.readyState !== 'complete') {
            console.log('DOM not complete, waiting...');
            return;
        }

        console.log('🚀 Starting dashboard initialization...');

        // Inicializar objeto dashboard global
        window.dashboard = window.dashboard || {};
        console.log('Dashboard object initialized:', window.dashboard);

        try {
            // 1. Instanciar os sistemas utilitários primeiro
            const dashboardConfig = window.DashboardConfig ? new window.DashboardConfig() : null;
            const errorHandler = window.DashboardErrorHandler ? new window.DashboardErrorHandler() : null;
            const performanceMonitor = window.DashboardPerformanceMonitor ? new window.DashboardPerformanceMonitor() : null;

            // 2. Instanciar o Core com as dependências
            const dashboardCore = window.DashboardCore ?
                new window.DashboardCore(dashboardConfig, errorHandler, performanceMonitor) : null;

            if (!dashboardCore) {
                console.error('DashboardCore class not found!');
                showInitializationError('Sistema de dashboard não encontrado. Recarregue a página.');
                return;
            }

            // 3. Instanciar os outros módulos
            const dashboardUI = window.DashboardUI ? new window.DashboardUI(dashboardConfig, errorHandler) : null;
            console.log('DashboardUI created:', !!dashboardUI);
            const dashboardCharts = window.DashboardCharts ? new window.DashboardCharts(dashboardConfig, errorHandler, performanceMonitor) : null;
            const dashboardData = window.DashboardData ? new window.DashboardData(dashboardConfig, errorHandler) : null;
            const dashboardFullscreen = window.DashboardFullscreen ? new window.DashboardFullscreen(dashboardConfig, errorHandler) : null;
            console.log('DashboardFullscreen criado:', !!dashboardFullscreen);
            console.log('window.DashboardFullscreen:', window.DashboardFullscreen);

            // 4. Registrar os módulos no Core
            if (dashboardUI) {
                dashboardCore.registerComponent('ui', dashboardUI);
                console.log('UI component registered');
            }
            if (dashboardCharts) {
                dashboardCore.registerComponent('charts', dashboardCharts);
                // Disponibilizar globalmente para o fullscreen
                window.dashboardCharts = dashboardCharts;
            }
            if (dashboardData) {
                dashboardCore.registerComponent('data', dashboardData);
            }
            if (dashboardFullscreen) {
                dashboardCore.registerComponent('fullscreen', dashboardFullscreen);
                // Disponibilizar globalmente
                window.dashboardFullscreen = dashboardFullscreen;
            }

            // 5. Inicializar o sistema
            dashboardCore.init();

            // 6. Disponibilizar globalmente
            window.dashboard = {
                core: dashboardCore,
                ui: dashboardUI,
                charts: dashboardCharts,
                data: dashboardData,
                fullscreen: dashboardFullscreen,
                config: dashboardConfig,
                errorHandler: errorHandler,
                performanceMonitor: performanceMonitor
            };

            console.log('Dashboard inicializado com sucesso:', window.dashboard);

            // 7. Configurar tratamento de erros global
            setupGlobalErrorHandling(errorHandler);

            // 8. Mostrar mensagem de boas-vindas
            showWelcomeMessage();

        } catch (error) {
            showInitializationError('Erro inesperado: ' + error.message);
        }
    }

    function setupGlobalErrorHandling(errorHandler) {
        if (!errorHandler) {
            console.warn('Sistema de tratamento de erros não disponível, usando fallback');
            setupFallbackErrorHandling();
            return;
        }

        // Configurar captura global de erros
        window.addEventListener('error', function (event) {
            errorHandler.handle(event.error, {
                component: 'global',
                operation: 'runtime_error',
                recoverable: false,
                source: 'error_event'
            });
        });

        window.addEventListener('unhandledrejection', function (event) {
            errorHandler.handle(event.reason, {
                component: 'global',
                operation: 'unhandled_promise',
                recoverable: true,
                source: 'unhandledrejection_event'
            });
        });

        // Monitorar conectividade
        window.addEventListener('offline', function () {
            errorHandler.handle(new Error('Conexão com a internet perdida'), {
                component: 'network',
                operation: 'connectivity',
                recoverable: true,
                severity: 'warning'
            });
        });

        window.addEventListener('online', function () {
            if (window.dashboard && window.dashboard.core) {
                // Notificar recuperação da conectividade
                console.log('Conexão restaurada');
            }
        });

        console.log('Sistema global de tratamento de erros configurado');
    }

    function setupFallbackErrorHandling() {
        window.addEventListener('error', function (event) {
            console.error('Erro global:', event.error);
            showBasicError('Erro no sistema: ' + event.error.message);
        });

        window.addEventListener('unhandledrejection', function (event) {
            console.error('Erro assíncrono:', event.reason);
            showBasicError('Erro assíncrono: ' + event.reason.message);
        });

        window.addEventListener('offline', function () {
            showBasicError('Conexão com a internet perdida');
        });

        window.addEventListener('online', function () {
            showBasicSuccess('Conexão restaurada');
        });
    }

    function showBasicError(message) {
        let errorElement = document.getElementById('dashboard-global-error');
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.id = 'dashboard-global-error';
            errorElement.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #f8d7da;
                color: #721c24;
                border: 1px solid #f5c6cb;
                border-radius: 4px;
                padding: 12px;
                max-width: 300px;
                z-index: 1000;
                font-size: 14px;
            `;
            document.body.appendChild(errorElement);
        }

        errorElement.textContent = message;
        errorElement.style.display = 'block';

        setTimeout(() => {
            errorElement.style.display = 'none';
        }, 5000);
    }

    function showBasicSuccess(message) {
        let successElement = document.getElementById('dashboard-global-success');
        if (!successElement) {
            successElement = document.createElement('div');
            successElement.id = 'dashboard-global-success';
            successElement.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #d4edda;
                color: #155724;
                border: 1px solid #c3e6cb;
                border-radius: 4px;
                padding: 12px;
                max-width: 300px;
                z-index: 1000;
                font-size: 14px;
            `;
            document.body.appendChild(successElement);
        }

        successElement.textContent = message;
        successElement.style.display = 'block';

        setTimeout(() => {
            successElement.style.display = 'none';
        }, 3000);
    }

    function showWelcomeMessage() {
        setTimeout(() => {
            console.log('Dashboard inicializado com sucesso');

            // Usar sistema de notificação se disponível
            if (window.dashboard && window.dashboard.errorHandler) {
                // Sistema de notificação integrado
                const notification = {
                    type: 'success',
                    title: 'Dashboard Carregado',
                    message: 'Sistema inicializado com sucesso',
                    duration: 3000
                };
                window.dashboard.errorHandler.showNotification(notification);
            } else {
                // Fallback para notificação básica
                showBasicSuccess('Dashboard carregado com sucesso');
            }
        }, 1500);
    }

    function showInitializationError(message) {
        console.error('Erro de inicialização:', message);

        // Tentar usar sistema de tratamento de erros
        if (window.dashboard && window.dashboard.errorHandler) {
            window.dashboard.errorHandler.handle(new Error(message), {
                component: 'initialization',
                operation: 'startup',
                recoverable: false,
                severity: 'critical'
            });
        } else {
            // Fallback para notificação básica
            showBasicError(`Erro de inicialização: ${message}\n\nRecarregue a página para tentar novamente.`);
        }
    }
})();
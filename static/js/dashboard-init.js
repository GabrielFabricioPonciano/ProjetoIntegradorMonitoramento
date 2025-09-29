/**
 * Dashboard Main Initializer
 * Main entry point that initializes all dashboard modules and starts the application
 */

(function () {
    'use strict';

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

    function initializeDashboard() {
        if (document.readyState !== 'complete') {
            console.log('DOM not ready, waiting...');
            return;
        }

        console.log('Initializing dashboard...');

        // Inicializar objeto dashboard global
        window.dashboard = window.dashboard || {};
        console.log('Dashboard object initialized:', window.dashboard);

        try {
            // 1. Instanciar o Core
            const dashboardCore = window.DashboardCore ? new window.DashboardCore() : null;

            if (!dashboardCore) {
                console.error('DashboardCore class not found!');
                showInitializationError('Sistema de dashboard não encontrado. Recarregue a página.');
                return;
            }

            // 2. Instanciar os outros módulos
            const dashboardUI = window.DashboardUI ? new window.DashboardUI() : null;
            const dashboardCharts = window.DashboardCharts ? new window.DashboardCharts() : null;
            const dashboardData = window.DashboardData ? new window.DashboardData() : null;

            // 3. Registrar os módulos no Core
            if (dashboardUI) {
                dashboardCore.registerComponent('ui', dashboardUI);
            }
            if (dashboardCharts) {
                dashboardCore.registerComponent('charts', dashboardCharts);
            }
            if (dashboardData) {
                dashboardCore.registerComponent('data', dashboardData);
            }

            // 4. Inicializar o sistema
            dashboardCore.init();

            // 5. Disponibilizar globalmente
            window.dashboard = {
                core: dashboardCore,
                ui: dashboardUI,
                charts: dashboardCharts,
                data: dashboardData
            };

            console.log('Dashboard inicializado com sucesso:', window.dashboard);

            // 6. Configurar tratamento de erros e mostrar mensagem de boas-vindas
            setupErrorHandling();
            showWelcomeMessage();

            // 7. Forçar exibição dos KPIs após um delay (fallback)
            setTimeout(() => {
                if (window.dashboard && window.dashboard.ui && typeof window.dashboard.ui.forceShowKPIs === 'function') {
                    console.log('Forçando exibição dos KPIs como fallback...');
                    window.dashboard.ui.forceShowKPIs();
                }
            }, 2000);

        } catch (error) {
            showInitializationError('Erro inesperado: ' + error.message);
        }
    }

    function setupErrorHandling() {
        window.addEventListener('error', function (event) {
            if (window.dashboard && window.dashboard.core && typeof window.dashboard.core.showError === 'function') {
                window.dashboard.core.showError('Erro no sistema: ' + event.error.message);
            }
        });

        window.addEventListener('unhandledrejection', function (event) {
            if (window.dashboard && window.dashboard.core && typeof window.dashboard.core.showError === 'function') {
                window.dashboard.core.showError('Erro assíncrono: ' + event.reason.message);
            }
        });

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

    function showWelcomeMessage() {
        setTimeout(() => {
            console.log('Dashboard inicializado com sucesso');
            // Usar notificação básica já que removemos o overlay
            if (window.dashboard && window.dashboard.core && window.dashboard.core.showBasicError) {
                // Criar mensagem temporária de sucesso
                let successElement = document.getElementById('dashboard-success');
                if (!successElement) {
                    successElement = document.createElement('div');
                    successElement.id = 'dashboard-success';
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

                successElement.textContent = 'Dashboard carregado com sucesso';
                successElement.style.display = 'block';

                // Auto-hide após 3 segundos
                setTimeout(() => {
                    successElement.style.display = 'none';
                }, 3000);
            }
        }, 1500);
    }

    function showInitializationError(message) {
        console.error('Erro de inicialização:', message);
        // Usar sistema básico de notificação ao invés do overlay
        if (window.dashboard && window.dashboard.core && window.dashboard.core.showBasicError) {
            window.dashboard.core.showBasicError(`Erro de inicialização: ${message}`);
        } else {
            // Fallback: alert simples
            alert(`Erro de inicialização: ${message}\n\nRecarregue a página para tentar novamente.`);
        }
    }
})();
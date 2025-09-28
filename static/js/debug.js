// Debug script para testar inicialização do dashboard
console.log('=== DEBUG DASHBOARD INIT ===');
console.log('DOM ready:', document.readyState);
console.log('Chart.js loaded:', typeof Chart !== 'undefined');
console.log('Bootstrap loaded:', typeof bootstrap !== 'undefined');
console.log('Fetch available:', typeof fetch !== 'undefined');

// Simple test to see if JavaScript is working
window.testDashboardInit = function () {
    console.log('Test function called successfully');
    alert('JavaScript is working!');
};

// Verificar se os módulos estão sendo carregados
setTimeout(() => {
    console.log('=== CHECKING MODULES AFTER 2s ===');
    console.log('window.dashboard exists:', typeof window.dashboard !== 'undefined');
    if (window.dashboard) {
        console.log('dashboard.data exists:', typeof window.dashboard.data !== 'undefined');
        console.log('dashboard.ui exists:', typeof window.dashboard.ui !== 'undefined');
        console.log('dashboard.charts exists:', typeof window.dashboard.charts !== 'undefined');
        console.log('dashboard.violations exists:', typeof window.dashboard.violations !== 'undefined');
        console.log('dashboard.ai exists:', typeof window.dashboard.ai !== 'undefined');
        console.log('dashboard.start exists:', typeof window.dashboard.start !== 'undefined');

        // Verificar propriedades do dashboard
        console.log('Dashboard object keys:', Object.keys(window.dashboard));

        // Test if dashboard can start
        if (typeof window.dashboard.start === 'function') {
            console.log('Dashboard start method is available, attempting to start...');
            try {
                window.dashboard.start();
                console.log('Dashboard started successfully');
            } catch (error) {
                console.error('Error starting dashboard:', error);
                console.error('Error stack:', error.stack);
            }
        } else {
            console.error('Dashboard start method not found!');
        }
    } else {
        console.error('window.dashboard is undefined!');
    }
}, 3000);

// Verificar se há erros de rede
window.addEventListener('error', (e) => {
    console.error('JavaScript Error:', e.error);
    console.error('Error stack:', e.error.stack);
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled Promise Rejection:', e.reason);
});

// Verificar quando os scripts são carregados
document.addEventListener('DOMContentLoaded', () => {
    console.log('=== DOMContentLoaded fired ===');

    // Verificar se todos os scripts foram carregados
    const scripts = document.querySelectorAll('script[src]');
    console.log('Scripts loaded:');
    scripts.forEach(script => {
        console.log(' -', script.src);
    });

    // Add a test button to the page
    const testButton = document.createElement('button');
    testButton.textContent = 'Test JS';
    testButton.onclick = window.testDashboardInit;
    testButton.style.position = 'fixed';
    testButton.style.top = '10px';
    testButton.style.right = '10px';
    testButton.style.zIndex = '9999';
    document.body.appendChild(testButton);
});

// Verificar quando todos os recursos são carregados
window.addEventListener('load', () => {
    console.log('=== Window load fired ===');
    console.log('All resources loaded');
});
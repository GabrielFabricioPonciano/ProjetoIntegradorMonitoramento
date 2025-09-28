// Debug CSS interference - Clean fix

(function () {
    console.log('=== DEBUG CSS FIX START ===');

    /**
     * CSS Debug and Cache Buster Script
     * Forces visibility of KPI elements and clears cache
     */

    console.log('🔧 CSS Debug: Script loaded at', new Date().toISOString());

    // Force hard reload if cache is detected
    if (performance.navigation.type !== performance.navigation.TYPE_RELOAD) {
        console.log('🔄 CSS Debug: Forcing hard reload to clear cache...');
        location.reload(true);
    }

    function forceVisibility() {
        console.log('🔧 CSS Debug: forceVisibility called');

        const ids = [
            'temp-content', 'temp-skeleton',
            'humidity-content', 'humidity-skeleton',
            'violations-content', 'violations-skeleton',
            'measurements-content', 'measurements-skeleton'
        ];

        ids.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                if (id.includes('skeleton')) {
                    element.style.setProperty('display', 'none', 'important');
                    console.log(`🔧 FORCE: Hidden skeleton ${id}`);
                } else if (id.includes('content')) {
                    element.style.setProperty('display', 'block', 'important');
                    element.style.setProperty('visibility', 'visible', 'important');
                    element.style.setProperty('opacity', '1', 'important');
                    console.log(`🔧 FORCE: Showed content ${id}`);
                }
            } else {
                console.warn(`🔧 FORCE: Element ${id} not found`);
            }
        });
    }

    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', forceVisibility);
    } else {
        forceVisibility();
    }

    // Also run every 2 seconds as safety net
    setInterval(forceVisibility, 2000);

    console.log('🔧 CSS Debug: Initialization completed');    // Run immediately
    forceVisibility();

    // Run again after DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', forceVisibility);
    }

    // Run every 5 seconds for 60 seconds
    let count = 0;
    const interval = setInterval(() => {
        count++;
        console.log('=== FORCE VISIBILITY ATTEMPT ===');
        forceVisibility();
        if (count >= 12) { // 60 seconds
            clearInterval(interval);
            console.log('=== FORCE VISIBILITY COMPLETED ===');
        }
    }, 5000);

    // Force immediately at different times
    setTimeout(forceVisibility, 1000);
    setTimeout(forceVisibility, 3000);
    setTimeout(forceVisibility, 5000);

    console.log('=== DEBUG CSS FIX INITIALIZED ===');
})();

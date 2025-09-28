/**
 * Force Show KPIs - Emergency Script
 * Forces KPI visibility when modules fail to load properly
 */

console.log('🚨 FORCE-SHOW-KPIS: Script loaded');

function forceShowAllKPIs() {
    console.log('🔧 FORCE-SHOW-KPIS: Forcing all KPIs to show');

    const kpis = [
        'temp',
        'humidity',
        'violations',
        'measurements'
    ];

    kpis.forEach(kpi => {
        const skeleton = document.getElementById(`${kpi}-skeleton`);
        const content = document.getElementById(`${kpi}-content`);

        console.log(`🔍 FORCE-SHOW: ${kpi} - skeleton:`, skeleton, 'content:', content);

        if (skeleton) {
            skeleton.style.setProperty('display', 'none', 'important');
            skeleton.style.setProperty('visibility', 'hidden', 'important');
        }

        if (content) {
            content.style.setProperty('display', 'block', 'important');
            content.style.setProperty('visibility', 'visible', 'important');
            content.style.setProperty('opacity', '1', 'important');

            // Force show all child elements too
            const children = content.querySelectorAll('*');
            children.forEach(child => {
                child.style.setProperty('visibility', 'visible', 'important');
                child.style.setProperty('opacity', '1', 'important');
            });
        }

        console.log(`✅ FORCE-SHOW: ${kpi} processed`);
    });

    // Also try to show chart containers
    const chartContainers = document.querySelectorAll('.chart-container');
    chartContainers.forEach((container, index) => {
        container.style.setProperty('display', 'block', 'important');
        container.style.setProperty('visibility', 'visible', 'important');
        console.log(`✅ FORCE-SHOW: Chart container ${index} shown`);
    });

    console.log('🎉 FORCE-SHOW-KPIS: All elements processed');
}

// Force show immediately when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', forceShowAllKPIs);
} else {
    forceShowAllKPIs();
}

// Also force show after a delay
setTimeout(forceShowAllKPIs, 1000);
setTimeout(forceShowAllKPIs, 3000);
setTimeout(forceShowAllKPIs, 5000);

// Expose globally for manual calls
window.forceShowAllKPIs = forceShowAllKPIs;

console.log('🚨 FORCE-SHOW-KPIS: Script setup complete');
/**
 * Debug script to test UI element updates
 */

(function () {
    'use strict';

    // Debug output function
    function debugLog(message) {
        console.log(message);
        const debugOutput = document.getElementById('debug-output');
        if (debugOutput) {
            const timestamp = new Date().toLocaleTimeString();
            debugOutput.innerHTML += `<div>[${timestamp}] ${message}</div>`;
            debugOutput.scrollTop = debugOutput.scrollHeight;
        }
    }

    debugLog('=== UI DEBUG SCRIPT STARTED ===');

    // Test data from API
    const testData = {
        temperature: {
            current: 19.0,
            average: 18.4,
            min: 17.2,
            max: 19.5
        },
        humidity: {
            current: 61.0,
            average: 59.2,
            min: 56.0,
            max: 65.0
        },
        measurements: 731,
        violations: 66
    };

    debugLog('Test data: ' + JSON.stringify(testData, null, 2));

    // Test element existence
    const elements = [
        'temp-content',
        'temp-skeleton',
        'temp-mean',
        'temp-range',
        'humidity-content',
        'humidity-skeleton',
        'rh-mean',
        'rh-range',
        'violations-content',
        'violations-skeleton',
        'violations-count',
        'violations-pct',
        'violations-base',
        'measurements-content',
        'measurements-skeleton',
        'total-measurements'
    ];

    debugLog('=== CHECKING ELEMENT EXISTENCE ===');
    elements.forEach(id => {
        const element = document.getElementById(id);
        debugLog(`${id}: ${element ? 'EXISTS' : 'NOT FOUND'}`);
        if (element) {
            debugLog(`  - Current textContent: "${element.textContent}"`);
            debugLog(`  - Current display: ${getComputedStyle(element).display}`);
            debugLog(`  - Current visibility: ${getComputedStyle(element).visibility}`);
        }
    });

    // Test manual update
    debugLog('=== TESTING MANUAL UPDATE ===');

    // Temperature
    const tempMean = document.getElementById('temp-mean');
    const tempRange = document.getElementById('temp-range');
    if (tempMean) {
        tempMean.textContent = `${testData.temperature.average.toFixed(1)}°C`;
        debugLog('✅ Updated temp-mean to: ' + tempMean.textContent);
    }
    if (tempRange) {
        tempRange.textContent = `Min: ${testData.temperature.min.toFixed(1)}°C | Max: ${testData.temperature.max.toFixed(1)}°C`;
        debugLog('✅ Updated temp-range to: ' + tempRange.textContent);
    }

    // Humidity
    const rhMean = document.getElementById('rh-mean');
    const rhRange = document.getElementById('rh-range');
    if (rhMean) {
        rhMean.textContent = `${testData.humidity.average.toFixed(1)}%`;
        debugLog('✅ Updated rh-mean to: ' + rhMean.textContent);
    }
    if (rhRange) {
        rhRange.textContent = `Min: ${testData.humidity.min.toFixed(1)}% | Max: ${testData.humidity.max.toFixed(1)}%`;
        debugLog('✅ Updated rh-range to: ' + rhRange.textContent);
    }

    // Violations
    const violationsCount = document.getElementById('violations-count');
    const violationsPct = document.getElementById('violations-pct');
    const violationsBase = document.getElementById('violations-base');
    if (violationsCount) {
        violationsCount.textContent = testData.violations.toLocaleString();
        debugLog('✅ Updated violations-count to: ' + violationsCount.textContent);
    }
    if (violationsPct) {
        const base = 731; // From measurements
        const percentage = base > 0 ? ((testData.violations / base) * 100).toFixed(1) : 0;
        violationsPct.textContent = `${percentage}% do total`;
        debugLog('✅ Updated violations-pct to: ' + violationsPct.textContent);
    }
    if (violationsBase) {
        violationsBase.textContent = `Base: ${testData.measurements.toLocaleString()} medições`;
        debugLog('✅ Updated violations-base to: ' + violationsBase.textContent);
    }

    // Measurements
    const totalMeasurements = document.getElementById('total-measurements');
    if (totalMeasurements) {
        totalMeasurements.textContent = testData.measurements.toLocaleString();
        debugLog('✅ Updated total-measurements to: ' + totalMeasurements.textContent);
    }

    // Test showKPIs
    debugLog('=== TESTING showKPIs ===');
    const kpis = ['temp', 'humidity', 'violations', 'measurements'];
    kpis.forEach(kpi => {
        const skeleton = document.getElementById(`${kpi}-skeleton`);
        const content = document.getElementById(`${kpi}-content`);
        debugLog(`${kpi} - skeleton: ${!!skeleton}, content: ${!!content}`);

        if (skeleton && content) {
            debugLog(`Before: skeleton display: ${skeleton.style.display}, content display: ${content.style.display}`);
            skeleton.style.setProperty('display', 'none', 'important');
            content.style.setProperty('display', 'block', 'important');
            content.style.setProperty('visibility', 'visible', 'important');
            content.style.setProperty('opacity', '1', 'important');
            debugLog(`After: skeleton display: ${skeleton.style.display}, content display: ${content.style.display}`);
        }
    });

    // Test dashboard modules
    debugLog('=== CHECKING DASHBOARD MODULES ===');
    debugLog('window.dashboard exists: ' + !!window.dashboard);
    if (window.dashboard) {
        debugLog('dashboard.core exists: ' + !!window.dashboard.core);
        debugLog('dashboard.ui exists: ' + !!window.dashboard.ui);
        debugLog('dashboard.charts exists: ' + !!window.dashboard.charts);
        debugLog('dashboard.violations exists: ' + !!window.dashboard.violations);
        debugLog('dashboard.ai exists: ' + !!window.dashboard.ai);

        if (window.dashboard.ui && typeof window.dashboard.ui.updateSummaryUI === 'function') {
            debugLog('✅ dashboard.ui.updateSummaryUI function exists');
            debugLog('Testing updateSummaryUI with real data...');
            try {
                window.dashboard.ui.updateSummaryUI(testData);
                debugLog('✅ updateSummaryUI called successfully');
            } catch (error) {
                debugLog('❌ Error calling updateSummaryUI: ' + error.message);
            }
        } else {
            debugLog('❌ dashboard.ui.updateSummaryUI function not found');
        }
    }

    debugLog('=== UI DEBUG SCRIPT COMPLETED ===');
})();
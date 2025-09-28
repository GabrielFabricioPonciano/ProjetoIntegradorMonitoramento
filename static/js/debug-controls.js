// Debug script to check dashboard controls
console.log('=== DASHBOARD DEBUG START ===');

// Check if dashboard is initialized
console.log('Dashboard object:', typeof window.dashboard);
console.log('Dashboard core:', typeof window.dashboard?.core);
console.log('Dashboard state:', window.dashboard?.state);

// Check if elements exist
const elements = [
    'force-cycle-btn',
    'period-slider',
    'custom-period-panel',
    'period-1',
    'period-7',
    'period-30',
    'period-90',
    'period-custom'
];

elements.forEach(id => {
    const el = document.getElementById(id);
    console.log(`${id}: ${el ? 'EXISTS' : 'MISSING'}`);
    if (el) {
        console.log(`  - Type: ${el.tagName}`);
        console.log(`  - Visible: ${el.offsetWidth > 0 && el.offsetHeight > 0}`);
    }
});

// Check radio buttons
const radios = document.querySelectorAll('input[name="period"]');
console.log(`Period radios found: ${radios.length}`);

// Check quick period buttons
const quickBtns = document.querySelectorAll('.quick-period-btn');
console.log(`Quick period buttons found: ${quickBtns.length}`);

// Test if dashboard start method exists
if (window.dashboard && typeof window.dashboard.start === 'function') {
    console.log('Dashboard start method exists');
} else {
    console.log('Dashboard start method MISSING');
}

// Test if dashboard bindEvents method exists
if (window.dashboard && typeof window.dashboard.bindEvents === 'function') {
    console.log('Dashboard bindEvents method exists');
} else {
    console.log('Dashboard bindEvents method MISSING');
}

// Wait for dashboard to initialize and test
setTimeout(() => {
    console.log('=== TESTING AFTER INITIALIZATION ===');
    console.log('Dashboard state after init:', window.dashboard?.state);

    // Test click on force cycle button
    const forceBtn = document.getElementById('force-cycle-btn');
    if (forceBtn) {
        console.log('Force button found, testing click...');
        // Don't actually click, just check if event listener is attached
        console.log('Force button onclick:', typeof forceBtn.onclick);
    } else {
        console.log('Force cycle button not found');
    }

    // Test period radios
    const periodRadios = document.querySelectorAll('input[name="period"]');
    console.log(`Testing ${periodRadios.length} period radios...`);
    periodRadios.forEach((radio, index) => {
        console.log(`Radio ${index}: ${radio.id}, value: ${radio.value}, checked: ${radio.checked}`);
    });

}, 3000);

console.log('=== DASHBOARD DEBUG END ===');
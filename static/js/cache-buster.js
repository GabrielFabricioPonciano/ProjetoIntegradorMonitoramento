/**
 * Cache Buster - Forces hard reload
 */

console.log('🔄 CACHE-BUSTER: Starting cache clear...');

// Clear browser cache
if ('caches' in window) {
    caches.keys().then(function (names) {
        names.forEach(function (name) {
            caches.delete(name);
        });
        console.log('✅ CACHE-BUSTER: Service worker caches cleared');
    });
}

// Clear localStorage and sessionStorage
try {
    localStorage.clear();
    sessionStorage.clear();
    console.log('✅ CACHE-BUSTER: Storage cleared');
} catch (e) {
    console.warn('⚠️ CACHE-BUSTER: Could not clear storage:', e);
}

// Force page reload after clearing cache
setTimeout(() => {
    console.log('🔄 CACHE-BUSTER: Forcing page reload...');
    window.location.reload(true); // Hard reload
}, 1000);

console.log('🔄 CACHE-BUSTER: Cache clear initiated');
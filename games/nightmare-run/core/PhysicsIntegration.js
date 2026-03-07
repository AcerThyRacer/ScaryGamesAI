/**
 * ============================================
 * Nightmare Run - Physics Integration
 * ============================================
 */
(function(global) {
    'use strict';
    
    // Reuse RunnerPhysics for Nightmare Run
    const NightmareRunPhysics = global.RunnerPhysics || {};
    
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = NightmareRunPhysics;
    } else {
        global.NightmareRunPhysics = NightmareRunPhysics;
    }

})(typeof window !== 'undefined' ? window : this);

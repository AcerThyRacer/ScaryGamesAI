/**
 * ============================================
 * Nightmare Run - WebGPU Renderer
 * ============================================
 */
(function(global) {
    'use strict';
    const NightmareRunWebGPU = global.RunnerWebGPU || {};
    
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = NightmareRunWebGPU;
    } else {
        global.NightmareRunWebGPU = NightmareRunWebGPU;
    }
})(typeof window !== 'undefined' ? window : this);

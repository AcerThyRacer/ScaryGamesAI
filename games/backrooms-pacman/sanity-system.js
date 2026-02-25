/**
 * Sanity System - Full integration with visual/audio hallucinations
 */

var SanitySystem = (function() {
    'use strict';

    var config = {
        maxSanity: 100,
        minSanity: 0,
        baseDrainRate: 0.3,
        pacmanNearbyDrain: 1.5,
        blackoutDrain: 2.0,
        hidingRecovery: 0.8,
        safeZoneRecovery: 0.5,
        pelletBonus: 0.2,
        powerPelletBonus: 5.0,
        hallucinationThreshold: 40,
        audioHallucinationThreshold: 30,
        visualDistortionThreshold: 50
    };

    var state = {
        current: 100,
        previous: 100,
        isHallucinating: false,
        visualDistortion: 0,
        audioDistortion: 0,
        lastSanityChange: 0
    };

    var scene = null;
    var camera = null;
    var enabled = true;

    function init(threeScene, threeCamera) {
        scene = threeScene;
        camera = threeCamera;
        state.current = config.maxSanity;
        state.previous = config.maxSanity;
        console.log('[SanitySystem] Initialized');
    }

    function update(deltaTime, playerPos, pacmanPos, isBlackout, isHiding) {
        if (!enabled) return;

        state.previous = state.current;
        var now = Date.now();

        // Base drain
        var drainRate = config.baseDrainRate;

        // Pac-Man nearby drain
        if (pacmanPos && playerPos) {
            var dist = new THREE.Vector3(
                playerPos.x - pacmanPos.x,
                0,
                playerPos.z - pacmanPos.z
            ).length();

            if (dist < 10) {
                drainRate += config.pacmanNearbyDrain * (1 - dist / 10);
            }
        }

        // Blackout drain
        if (isBlackout) {
            drainRate += config.blackoutDrain;
        }

        // Recovery
        var recovery = 0;
        if (isHiding) {
            recovery = config.hidingRecovery;
        }

        // Apply changes
        state.current -= drainRate * deltaTime;
        state.current += recovery * deltaTime;

        // Clamp
        state.current = Math.max(config.minSanity, Math.min(config.maxSanity, state.current));

        state.lastSanityChange = now;

        // Calculate distortion levels
        updateDistortionLevels();

        // Check hallucinations
        checkHallucinations();
    }

    function updateDistortionLevels() {
        // Visual distortion increases as sanity decreases
        if (state.current < config.visualDistortionThreshold) {
            state.visualDistortion = (config.visualDistortionThreshold - state.current) / config.visualDistortionThreshold;
        } else {
            state.visualDistortion = 0;
        }

        // Audio distortion
        if (state.current < config.audioHallucinationThreshold) {
            state.audioDistortion = (config.audioHallucinationThreshold - state.current) / config.audioHallucinationThreshold;
        } else {
            state.audioDistortion = 0;
        }
    }

    function checkHallucinations() {
        state.isHallucinating = state.current < config.hallucinationThreshold;
    }

    function modifySanity(amount, reason) {
        var oldSanity = state.current;
        state.current += amount;
        state.current = Math.max(config.minSanity, Math.min(config.maxSanity, state.current));

        state.lastSanityChange = Date.now();

        console.log('[SanitySystem]', reason, ':', oldSanity.toFixed(1), '->', state.current.toFixed(1));

        return state.current;
    }

    function getSanity() {
        return state.current;
    }

    function getSanityPercent() {
        return state.current / config.maxSanity;
    }

    function isHallucinating() {
        return state.isHallucinating;
    }

    function getVisualDistortion() {
        return state.visualDistortion;
    }

    function getAudioDistortion() {
        return state.audioDistortion;
    }

    function addSanityEffect(overlay) {
        // Apply visual effects based on sanity level
        if (!overlay) return;

        if (state.visualDistortion > 0.1) {
            // Chromatic aberration
            overlay.style.setProperty('--chromatic-aberration', state.visualDistortion * 10 + 'px');
        }

        if (state.audioDistortion > 0.1) {
            // Audio filter would be applied here
        }
    }

    function createSanityHUD(container) {
        var hud = document.createElement('div');
        hud.id = 'sanity-hud';
        hud.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);z-index:75;color:#aa88ff;font-family:monospace;font-size:0.85rem;text-shadow:0 0 8px rgba(0,0,0,0.9);display:flex;align-items:center;gap:10px;';

        hud.innerHTML = `
            <span>🧠 SANITY</span>
            <div style="width:150px;height:8px;background:rgba(0,0,0,0.6);border:1px solid rgba(170,136,255,0.3);border-radius:4px;overflow:hidden;">
                <div id="sanity-bar-fill" style="height:100%;width:100%;background:linear-gradient(90deg,#aa88ff,#6644cc);transition:width 0.3s;"></div>
            </div>
            <span id="sanity-value">100%</span>
        `;

        if (container) {
            container.appendChild(hud);
        } else {
            document.body.appendChild(hud);
        }

        return hud;
    }

    function updateSanityHUD() {
        var fill = document.getElementById('sanity-bar-fill');
        var value = document.getElementById('sanity-value');

        if (fill && value) {
            var percent = getSanityPercent() * 100;
            fill.style.width = percent + '%';
            value.textContent = Math.floor(getSanity()) + '%';

            // Color based on sanity level
            if (percent < 25) {
                fill.style.background = 'linear-gradient(90deg,#ff4444,#cc0000)';
            } else if (percent < 50) {
                fill.style.background = 'linear-gradient(90deg,#ffaa00,#ff6600)';
            } else if (percent < 75) {
                fill.style.background = 'linear-gradient(90deg,#ffff00,#ffaa00)';
            } else {
                fill.style.background = 'linear-gradient(90deg,#aa88ff,#6644cc)';
            }
        }
    }

    function reset() {
        state.current = config.maxSanity;
        state.previous = config.maxSanity;
        state.isHallucinating = false;
        state.visualDistortion = 0;
        state.audioDistortion = 0;
    }

    function setEnabled(value) {
        enabled = value;
    }

    function getConfig() {
        return config;
    }

    return {
        init: init,
        update: update,
        modifySanity: modifySanity,
        getSanity: getSanity,
        getSanityPercent: getSanityPercent,
        isHallucinating: isHallucinating,
        getVisualDistortion: getVisualDistortion,
        getAudioDistortion: getAudioDistortion,
        addSanityEffect: addSanityEffect,
        createSanityHUD: createSanityHUD,
        updateSanityHUD: updateSanityHUD,
        reset: reset,
        setEnabled: setEnabled,
        getConfig: config
    };
})();

if (typeof window !== 'undefined') {
    window.SanitySystem = SanitySystem;
}

/**
 * Stress & Fear Mechanics - Heartbeat, breathing, tunnel vision
 */

var StressSystem = (function() {
    'use strict';

    var config = {
        baseStress: 0,
        maxStress: 100,
        pacmanNearbyRate: 15,
        lowSanityRate: 10,
        blackoutRate: 8,
        runningRate: 5,
        recoveryRate: -3,
        heartbeatThreshold: 30,
        tunnelVisionThreshold: 50,
        handShakeThreshold: 40
    };

    var state = {
        current: 0,
        heartbeat: 60,
        breathing: 'normal',
        tunnelVision: 0,
        handShake: 0
    };

    var scene = null;
    var camera = null;
    var enabled = true;

    function init(threeScene, threeCamera) {
        scene = threeScene;
        camera = threeCamera;
        state.current = config.baseStress;
        state.heartbeat = 60;
        console.log('[StressSystem] Initialized');
    }

    function update(deltaTime, playerPos, pacmanPos, sanity, isBlackout, isRunning) {
        if (!enabled) return;

        var stressChange = 0;

        // Pac-Man nearby stress
        if (pacmanPos && playerPos) {
            var dist = new THREE.Vector3(
                playerPos.x - pacmanPos.x,
                0,
                playerPos.z - pacmanPos.z
            ).length();

            if (dist < 12) {
                stressChange += config.pacmanNearbyRate * (1 - dist / 12) * deltaTime;
            }
        }

        // Low sanity stress
        if (sanity < 50) {
            stressChange += config.lowSanityRate * (1 - sanity / 50) * deltaTime;
        }

        // Blackout stress
        if (isBlackout) {
            stressChange += config.blackoutRate * deltaTime;
        }

        // Running stress
        if (isRunning) {
            stressChange += config.runningRate * deltaTime;
        }

        // Natural recovery
        if (stressChange <= 0 || (!pacmanPos && sanity > 70 && !isBlackout)) {
            stressChange += config.recoveryRate * deltaTime;
        }

        state.current += stressChange;
        state.current = Math.max(0, Math.min(config.maxStress, state.current));

        // Update physiological effects
        updateHeartbeat(deltaTime);
        updateBreathing();
        updateTunnelVision();
        updateHandShake();
    }

    function updateHeartbeat(deltaTime) {
        // Base heartbeat 60 BPM, max 180 BPM
        var targetHeartbeat = 60 + (state.current / config.maxStress) * 120;
        state.heartbeat += (targetHeartbeat - state.heartbeat) * 0.1;

        // Play heartbeat sound at high stress
        if (state.current > config.heartbeatThreshold) {
            var beatInterval = 60 / state.heartbeat;
            // Would trigger audio system here
        }
    }

    function updateBreathing() {
        if (state.current < 30) {
            state.breathing = 'normal';
        } else if (state.current < 60) {
            state.breathing = 'elevated';
        } else if (state.current < 80) {
            state.breathing = 'heavy';
        } else {
            state.breathing = 'panicked';
        }
    }

    function updateTunnelVision() {
        if (state.current > config.tunnelVisionThreshold) {
            state.tunnelVision = (state.current - config.tunnelVisionThreshold) / (config.maxStress - config.tunnelVisionThreshold);
        } else {
            state.tunnelVision = 0;
        }
    }

    function updateHandShake() {
        if (state.current > config.handShakeThreshold) {
            state.handShake = (state.current - config.handShakeThreshold) / (config.maxStress - config.handShakeThreshold);
        } else {
            state.handShake = 0;
        }
    }

    function getStress() {
        return state.current;
    }

    function getStressPercent() {
        return state.current / config.maxStress;
    }

    function getHeartbeat() {
        return state.heartbeat;
    }

    function getBreathing() {
        return state.breathing;
    }

    function getTunnelVision() {
        return state.tunnelVision;
    }

    function getHandShake() {
        return state.handShake;
    }

    function applyStressEffects(camera) {
        if (!camera) return;

        // Hand shake affects camera
        if (state.handShake > 0.1) {
            var shakeAmount = state.handShake * 0.02;
            camera.rotation.x += (Math.random() - 0.5) * shakeAmount;
            camera.rotation.y += (Math.random() - 0.5) * shakeAmount;
        }

        // Tunnel vision effect (would be applied in post-processing)
        if (state.tunnelVision > 0.1) {
            // Create vignette overlay
            var overlay = document.getElementById('stress-overlay');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = 'stress-overlay';
                overlay.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:88;box-shadow:inset 0 0 100px 50px rgba(0,0,0,0);transition:box-shadow 0.3s;';
                document.body.appendChild(overlay);
            }

            var darkness = state.tunnelVision * 0.8;
            overlay.style.boxShadow = 'inset 0 0 ' + (50 + state.tunnelVision * 100) + 'px ' + (20 + state.tunnelVision * 50) + 'px rgba(0,0,0,' + darkness + ')';
        }
    }

    function createStressHUD(container) {
        var hud = document.createElement('div');
        hud.id = 'stress-hud';
        hud.style.cssText = 'position:fixed;bottom:120px;left:50%;transform:translateX(-50%);z-index:76;color:#ff6666;font-family:monospace;font-size:0.75rem;text-shadow:0 0 6px rgba(0,0,0,0.9);display:none;';

        hud.innerHTML = `
            <div style="display:flex;align-items:center;gap:8px;">
                <span>❤️</span>
                <span id="stress-heartbeat">60</span>
                <span>BPM</span>
                <span style="margin-left:10px;">💨</span>
                <span id="stress-breathing">normal</span>
            </div>
        `;

        if (container) {
            container.appendChild(hud);
        } else {
            document.body.appendChild(hud);
        }

        return hud;
    }

    function updateStressHUD() {
        var heartbeatEl = document.getElementById('stress-heartbeat');
        var breathingEl = document.getElementById('stress-breathing');
        var hud = document.getElementById('stress-hud');

        if (heartbeatEl && breathingEl && hud) {
            hud.style.display = state.current > 30 ? 'block' : 'none';
            heartbeatEl.textContent = Math.floor(state.heartbeat);
            breathingEl.textContent = state.breathing;
        }
    }

    function reset() {
        state.current = config.baseStress;
        state.heartbeat = 60;
        state.breathing = 'normal';
        state.tunnelVision = 0;
        state.handShake = 0;
    }

    function setEnabled(value) {
        enabled = value;
    }

    return {
        init: init,
        update: update,
        getStress: getStress,
        getStressPercent: getStressPercent,
        getHeartbeat: getHeartbeat,
        getBreathing: getBreathing,
        getTunnelVision: getTunnelVision,
        getHandShake: getHandShake,
        applyStressEffects: applyStressEffects,
        createStressHUD: createStressHUD,
        updateStressHUD: updateStressHUD,
        reset: reset,
        setEnabled: setEnabled,
        config: config
    };
})();

if (typeof window !== 'undefined') {
    window.StressSystem = StressSystem;
}

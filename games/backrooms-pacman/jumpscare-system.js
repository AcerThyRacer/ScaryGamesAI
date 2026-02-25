/**
 * Jump Scare System - Contextual horror events
 */

var JumpscareSystem = (function() {
    'use strict';

    var config = {
        minInterval: 15,
        maxInterval: 45,
        baseChance: 0.001,
        blackoutMultiplier: 3.0,
        lowSanityMultiplier: 2.5,
        quietPeriodMultiplier: 1.5
    };

    var state = {
        lastJumpscare: 0,
        nextJumpscare: 0,
        queuedJumpscare: null,
        active: false,
        intensity: 0
    };

    var scene = null;
    var camera = null;
    var audioSystem = null;

    function init(threeScene, threeCamera) {
        scene = threeScene;
        camera = threeCamera;
        scheduleNextJumpscare();
        console.log('[JumpscareSystem] Initialized');
    }

    function scheduleNextJumpscare() {
        var interval = config.minInterval + Math.random() * (config.maxInterval - config.minInterval);
        state.nextJumpscare = Date.now() + interval * 1000;
    }

    function update(deltaTime, playerPos, pacmanPos, sanity, isBlackout) {
        var now = Date.now();

        if (state.active) return;

        // Check if it's time for a jumpscare
        if (now >= state.nextJumpscare) {
            var chance = calculateJumpscareChance(sanity, isBlackout, pacmanPos);

            if (Math.random() < chance) {
                triggerJumpscare(playerPos, pacmanPos);
            } else {
                scheduleNextJumpscare();
            }
        }
    }

    function calculateJumpscareChance(sanity, isBlackout, pacmanPos) {
        var chance = config.baseChance;

        if (isBlackout) {
            chance *= config.blackoutMultiplier;
        }

        if (sanity < 40) {
            chance *= config.lowSanityMultiplier;
        }

        // Higher chance if Pac-Man is not visible (psychological tension)
        if (!pacmanPos || pacmanPos.length() === 0) {
            chance *= config.quietPeriodMultiplier;
        }

        return Math.min(0.1, chance);
    }

    function triggerJumpscare(playerPos, pacmanPos) {
        state.active = true;
        state.lastJumpscare = Date.now();
        state.intensity = 1.0;

        console.log('[JumpscareSystem] TRIGGERED!');

        // Visual effects
        if (scene && camera) {
            // Flash effect
            var flash = document.createElement('div');
            flash.style.cssText = 'position:fixed;inset:0;background:#fff;z-index:9999;pointer-events:none;animation:flashAnim 0.1s ease-out;';
            document.body.appendChild(flash);

            setTimeout(function() {
                flash.remove();
            }, 100);

            // Camera shake
            if (camera) {
                shakeCamera(0.5);
            }
        }

        // Audio effect
        if (typeof HorrorAudio !== 'undefined') {
            try {
                HorrorAudio.playJumpscare();
            } catch (e) {
                console.log('[JumpscareSystem] Audio error:', e);
            }
        }

        // Sanity damage
        if (typeof SanitySystem !== 'undefined') {
            SanitySystem.modifySanity(-15, 'jumpscare');
        }

        // Schedule next
        setTimeout(function() {
            state.active = false;
            scheduleNextJumpscare();
        }, 2000);
    }

    function shakeCamera(intensity, duration) {
        if (!camera) return;

        duration = duration || 500;
        var startTime = Date.now();
        var originalPos = camera.position.clone();

        function shake() {
            var elapsed = Date.now() - startTime;
            var progress = elapsed / duration;

            if (progress < 1) {
                var shakeAmount = intensity * (1 - progress);
                camera.position.x = originalPos.x + (Math.random() - 0.5) * shakeAmount;
                camera.position.y = originalPos.y + (Math.random() - 0.5) * shakeAmount;
                camera.position.z = originalPos.z + (Math.random() - 0.5) * shakeAmount;
                requestAnimationFrame(shake);
            } else {
                camera.position.copy(originalPos);
            }
        }

        shake();
    }

    function triggerFakeJumpscare(type) {
        // Environmental misdirection
        console.log('[JumpscareSystem] Fake jumpscare:', type);

        switch (type) {
            case 'light_flicker':
                // Rapid light flickering
                if (scene) {
                    var lights = scene.children.filter(function(c) { return c.isLight; });
                    var flickerCount = 0;
                    var flickerInterval = setInterval(function() {
                        lights.forEach(function(light) {
                            light.visible = !light.visible;
                        });
                        flickerCount++;
                        if (flickerCount > 10) {
                            clearInterval(flickerInterval);
                            lights.forEach(function(light) { light.visible = true; });
                        }
                    }, 50);
                }
                break;

            case 'sound':
                // Random noise
                if (typeof HorrorAudio !== 'undefined') {
                    try { HorrorAudio.playAmbient(); } catch (e) {}
                }
                break;

            case 'shadow':
                // Quick shadow movement
                console.log('[JumpscareSystem] Shadow flicker');
                break;
        }
    }

    function reset() {
        state.lastJumpscare = 0;
        state.nextJumpscare = Date.now() + config.minInterval * 1000;
        state.active = false;
        state.intensity = 0;
    }

    function setEnabled(value) {
        // Can be disabled for testing
    }

    function getState() {
        return {
            active: state.active,
            intensity: state.intensity,
            timeSinceLast: Date.now() - state.lastJumpscare,
            timeToNext: state.nextJumpscare - Date.now()
        };
    }

    return {
        init: init,
        update: update,
        triggerJumpscare: triggerJumpscare,
        triggerFakeJumpscare: triggerFakeJumpscare,
        reset: reset,
        setEnabled: setEnabled,
        getState: getState,
        config: config
    };
})();

if (typeof window !== 'undefined') {
    window.JumpscareSystem = JumpscareSystem;
}

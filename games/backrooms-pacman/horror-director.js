/**
 * Horror AI Director - Dynamic pacing and tension management
 */

var HorrorDirector = (function() {
    'use strict';

    var config = {
        targetTension: 0.5,
        tensionUpdateRate: 0.5,
        peakDuration: 30,
        recoveryDuration: 60,
        eventCooldown: 20
    };

    var state = {
        currentTension: 0,
        phase: 'build',
        phaseTimer: 0,
        lastEvent: 0,
        intensityHistory: [],
        nextEvent: ''
    };

    var events = [
        'ambient_increase',
        'light_flicker',
        'pacman_spawn',
        'blackout',
        'jumpscare',
        'sound_cue',
        'environmental',
        'quiet'
    ];

    function init() {
        state.currentTension = 0;
        state.phase = 'build';
        state.phaseTimer = config.recoveryDuration;
        console.log('[HorrorDirector] Initialized');
    }

    function update(deltaTime, playerState, enemyState, environmentState) {
        // Update tension based on game state
        updateTension(playerState, enemyState, environmentState);

        // Update phase timer
        state.phaseTimer -= deltaTime;

        // Phase transitions
        if (state.phase === 'build' && state.currentTension >= 0.7) {
            transitionTo('peak');
        } else if (state.phase === 'peak' && state.phaseTimer <= 0) {
            transitionTo('release');
        } else if (state.phase === 'release' && state.currentTension <= 0.3) {
            transitionTo('build');
        }

        // Schedule events
        if (Date.now() - state.lastEvent > config.eventCooldown * 1000) {
            scheduleEvent();
        }

        // Track history
        state.intensityHistory.push(state.currentTension);
        if (state.intensityHistory.length > 100) {
            state.intensityHistory.shift();
        }
    }

    function updateTension(player, enemies, environment) {
        var targetTension = 0;

        // Enemy proximity
        if (enemies.nearby > 0) {
            targetTension += 0.3 * enemies.nearby;
        }

        // Player state
        if (player.sanity < 50) {
            targetTension += 0.2;
        }
        if (player.stress > 50) {
            targetTension += 0.2;
        }

        // Environment
        if (environment.dark) {
            targetTension += 0.15;
        }
        if (environment.blackout) {
            targetTension += 0.25;
        }

        // Smooth tension changes
        var delta = targetTension - state.currentTension;
        state.currentTension += delta * config.tensionUpdateRate * 0.1;
        state.currentTension = Math.max(0, Math.min(1, state.currentTension));
    }

    function transitionTo(newPhase) {
        console.log('[HorrorDirector] Phase:', state.phase, '->', newPhase);

        state.phase = newPhase;

        switch (newPhase) {
            case 'build':
                state.phaseTimer = config.recoveryDuration;
                state.targetTension = 0.4;
                break;
            case 'peak':
                state.phaseTimer = config.peakDuration;
                state.targetTension = 0.9;
                // Trigger intense event
                triggerEvent('peak_horror');
                break;
            case 'release':
                state.phaseTimer = config.recoveryDuration;
                state.targetTension = 0.2;
                break;
        }
    }

    function scheduleEvent() {
        var availableEvents = getAvailableEvents();
        if (availableEvents.length === 0) return;

        var selected = availableEvents[Math.floor(Math.random() * availableEvents.length)];
        state.nextEvent = selected;

        console.log('[HorrorDirector] Scheduling event:', selected);

        setTimeout(function() {
            executeEvent(selected);
            state.lastEvent = Date.now();
        }, 1000 + Math.random() * 3000);
    }

    function getAvailableEvents() {
        var available = [];

        switch (state.phase) {
            case 'build':
                available = ['ambient_increase', 'light_flicker', 'sound_cue', 'quiet'];
                break;
            case 'peak':
                available = ['jumpscare', 'pacman_spawn', 'blackout', 'environmental'];
                break;
            case 'release':
                available = ['quiet', 'ambient_increase', 'sound_cue'];
                break;
        }

        return available;
    }

    function executeEvent(eventType) {
        console.log('[HorrorDirector] Executing event:', eventType);

        switch (eventType) {
            case 'jumpscare':
                if (typeof JumpscareSystem !== 'undefined') {
                    JumpscareSystem.triggerJumpscare();
                }
                break;

            case 'light_flicker':
                triggerLightFlicker();
                break;

            case 'blackout':
                triggerBlackout();
                break;

            case 'pacman_spawn':
                spawnExtraPacman();
                break;

            case 'ambient_increase':
                increaseAmbientHorror();
                break;

            case 'sound_cue':
                playHorrorSound();
                break;

            case 'environmental':
                triggerEnvironmentalEvent();
                break;

            case 'quiet':
                // Intentional quiet for contrast
                decreaseAmbientHorror();
                break;
        }
    }

    function triggerLightFlicker() {
        if (typeof AdvancedLighting !== 'undefined') {
            var lights = scene ? scene.children.filter(function(c) { return c.isLight; }) : [];
            var flickerCount = 0;
            var interval = setInterval(function() {
                lights.forEach(function(light) {
                    if (Math.random() > 0.3) {
                        light.visible = !light.visible;
                    }
                });
                flickerCount++;
                if (flickerCount > 8) {
                    clearInterval(interval);
                    lights.forEach(function(light) { light.visible = true; });
                }
            }, 80);
        }
    }

    function triggerBlackout() {
        // Would integrate with existing blackout system
        console.log('[HorrorDirector] Triggering blackout');
    }

    function spawnExtraPacman() {
        // Would spawn additional enemy
        console.log('[HorrorDirector] Spawning extra Pac-Man');
    }

    function increaseAmbientHorror() {
        if (typeof HorrorAudio !== 'undefined') {
            try {
                HorrorAudio.setAmbientIntensity(0.8);
            } catch (e) {}
        }
    }

    function decreaseAmbientHorror() {
        if (typeof HorrorAudio !== 'undefined') {
            try {
                HorrorAudio.setAmbientIntensity(0.3);
            } catch (e) {}
        }
    }

    function playHorrorSound() {
        if (typeof HorrorAudio !== 'undefined') {
            try {
                HorrorAudio.playAmbient();
            } catch (e) {}
        }
    }

    function triggerEnvironmentalEvent() {
        if (typeof DynamicEnvironment !== 'undefined') {
            // Trigger falling tiles or blood drips
            console.log('[HorrorDirector] Environmental event triggered');
        }
    }

    function triggerEvent(eventType) {
        executeEvent(eventType);
    }

    function getTension() {
        return state.currentTension;
    }

    function getPhase() {
        return state.phase;
    }

    function reset() {
        state.currentTension = 0;
        state.phase = 'build';
        state.phaseTimer = config.recoveryDuration;
        state.lastEvent = 0;
        state.intensityHistory = [];
    }

    return {
        init: init,
        update: update,
        triggerEvent: triggerEvent,
        getTension: getTension,
        getPhase: getPhase,
        reset: reset,
        config: config
    };
})();

if (typeof window !== 'undefined') {
    window.HorrorDirector = HorrorDirector;
}

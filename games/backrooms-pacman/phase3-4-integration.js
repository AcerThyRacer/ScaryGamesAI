/**
 * PHASE 3 & 4: INTEGRATION MODULE
 * Unifies procedural generation and psychological horror systems
 */

var Phase3_4_Integration = (function() {
    'use strict';

    var config = {
        // Procedural generation settings
        procedural: {
            enabled: true,
            seed: null,
            biome: 'yellow',
            difficulty: 'standard'
        },
        
        // Psychological horror settings
        horror: {
            enabled: true,
            intensity: 'normal', // normal, intense, nightmare
            personalized: true
        }
    };

    var state = {
        currentSeed: null,
        currentBiome: null,
        activeModifiers: [],
        playerProfile: null
    };

    /**
     * Initialize Phase 3 & 4 integration
     */
    function init(scene, camera, renderer) {
        console.log('[Phase3-4] Initializing integrated systems...');
        
        // Initialize Biome System
        if (typeof BiomeSystem !== 'undefined') {
            BiomeSystem.init(scene, renderer, camera);
        }
        
        // Initialize Roguelike Mode
        if (typeof RoguelikeMode !== 'undefined') {
            RoguelikeMode.init();
        }
        
        // Initialize Hallucination System
        if (typeof HallucinationSystem !== 'undefined') {
            HallucinationSystem.init(scene, camera);
        }
        
        console.log('[Phase3-4] ✅ All systems initialized');
    }

    /**
     * Start new procedural run
     */
    function startProceduralRun(options) {
        console.log('[Phase3-4] Starting new procedural run');
        
        // Generate seed
        state.currentSeed = options.seed || Date.now();
        
        // Select biome
        state.currentBiome = options.biome || 'yellow';
        
        // Load biome
        if (typeof BiomeSystem !== 'undefined') {
            BiomeSystem.loadBiome(state.currentBiome);
        }
        
        // Generate maze with WFC
        var maze = null;
        if (typeof WaveFunctionCollapse !== 'undefined') {
            maze = WaveFunctionCollapse.generateMaze(20, 20, {
                addRooms: true,
                safeRooms: 2,
                exitPosition: { x: 18, z: 18 }
            });
        }
        
        // Start roguelike run
        if (typeof RoguelikeMode !== 'undefined') {
            RoguelikeMode.startRun({
                difficulty: options.difficulty || 'standard',
                biome: state.currentBiome,
                seed: state.currentSeed
            });
        }
        
        return {
            seed: state.currentSeed,
            biome: state.currentBiome,
            maze: maze
        };
    }

    /**
     * Update all systems
     */
    function update(deltaTime, playerPos, pacmanPos, gameState) {
        // Update hallucinations
        if (config.horror.enabled && typeof HallucinationSystem !== 'undefined') {
            var sanity = 100;
            var stress = 0;
            
            if (typeof SanitySystem !== 'undefined') {
                sanity = SanitySystem.getSanity();
            }
            
            if (typeof StressSystem !== 'undefined') {
                stress = StressSystem.getStress();
            }
            
            HallucinationSystem.update(deltaTime, playerPos, pacmanPos, sanity, stress);
        }
        
        // Update biome hazards
        if (typeof BiomeSystem !== 'undefined') {
            BiomeSystem.updateHazards(deltaTime, playerPos);
        }
        
        // Update particles
        if (typeof BiomeSystem !== 'undefined') {
            BiomeSystem.updateParticles(deltaTime);
        }
    }

    /**
     * Trigger personalized horror event
     */
    function triggerPersonalizedHorror(playerProfile) {
        state.playerProfile = playerProfile;
        
        // Analyze what scares this player most
        var fearType = analyzeFears(playerProfile);
        
        console.log('[Phase3-4] Triggering personalized horror:', fearType);
        
        switch (fearType) {
            case 'claustrophobia':
                triggerClaustrophobiaEvent();
                break;
            case 'agoraphobia':
                triggerAgoraphobiaEvent();
                break;
            case 'scopophobia':
                triggerScopophobiaEvent();
                break;
            default:
                triggerGenericHorror();
        }
    }

    /**
     * Analyze player fears from profile
     */
    function analyzeFears(profile) {
        // Simple heuristic - could be more sophisticated with ML
        if (profile.stressResponse === 'freeze') {
            return 'claustrophobia';
        } else if (profile.stressResponse === 'flight') {
            return 'agoraphobia';
        } else if (profile.avoidsEyeContact) {
            return 'scopophobia';
        }
        return 'generic';
    }

    /**
     * Claustrophobia event - walls close in
     */
    function triggerClaustrophobiaEvent() {
        console.log('[Phase3-4] Claustrophobia event triggered');
        
        // Could animate walls to move closer
        // Or reduce corridor width temporarily
    }

    /**
     * Agoraphobia event - too much open space
     */
    function triggerAgoraphobiaEvent() {
        console.log('[Phase3-4] Agoraphobia event triggered');
        
        // Remove walls temporarily
        // Increase fog density
    }

    /**
     * Scopophobia event - feeling watched
     */
    function triggerScopophobiaEvent() {
        console.log('[Phase3-4] Scopophobia event triggered');
        
        // Add multiple eyes watching player
        // Create sensation of being followed
    }

    /**
     * Generic horror event
     */
    function triggerGenericHorror() {
        // Random scary event
        var events = ['lights_out', 'loud_noise', 'enemy_spawn', 'hallucination'];
        var selected = events[Math.floor(Math.random() * events.length)];
        
        console.log('[Phase3-4] Generic horror event:', selected);
    }

    /**
     * Get current biome properties
     */
    function getCurrentBiome() {
        if (typeof BiomeSystem !== 'undefined') {
            return BiomeSystem.getCurrentBiome();
        }
        return null;
    }

    /**
     * Export run seed for sharing
     */
    function exportRunSeed() {
        return JSON.stringify({
            seed: state.currentSeed,
            biome: state.currentBiome,
            date: Date.now(),
            modifiers: state.activeModifiers
        });
    }

    /**
     * Import run seed
     */
    function importRunSeed(seedString) {
        try {
            var data = JSON.parse(seedString);
            state.currentSeed = data.seed;
            state.currentBiome = data.biome;
            state.activeModifiers = data.modifiers || [];
            return true;
        } catch (e) {
            console.error('[Phase3-4] Failed to import seed:', e);
            return false;
        }
    }

    /**
     * Enable/disable procedural generation
     */
    function setProceduralEnabled(enabled) {
        config.procedural.enabled = enabled;
    }

    /**
     * Enable/disable psychological horror
     */
    function setHorrorEnabled(enabled) {
        config.horror.enabled = enabled;
        
        if (!enabled && typeof HallucinationSystem !== 'undefined') {
            HallucinationSystem.setEnabled(false);
        }
    }

    // Public API
    return {
        init: init,
        startProceduralRun: startProceduralRun,
        update: update,
        triggerPersonalizedHorror: triggerPersonalizedHorror,
        getCurrentBiome: getCurrentBiome,
        exportRunSeed: exportRunSeed,
        importRunSeed: importRunSeed,
        setProceduralEnabled: setProceduralEnabled,
        setHorrorEnabled: setHorrorEnabled,
        config: config,
        state: state
    };
})();

// Export to global scope
if (typeof window !== 'undefined') {
    window.Phase3_4_Integration = Phase3_4_Integration;
}

console.log('[Phase3-4] Integration module loaded');

/**
 * PHASE 6: EXPANDED ABILITIES SYSTEM
 * 5 new game-changing abilities with cooldowns and upgrades
 */

var ExpandedAbilities = (function() {
    'use strict';

    var config = {
        // Ability definitions
        abilities: {
            TIME_DILATION: {
                id: 'time_dilation',
                name: 'Time Dilation',
                description: 'Slow down time for 5 seconds',
                duration: 5,
                cooldown: 60,
                cost: 20,
                upgradeable: true
            },
            POSSESSION: {
                id: 'possession',
                name: 'Possession',
                description: 'Control Pac-Man for 3 seconds',
                duration: 3,
                cooldown: 180,
                cost: 30,
                upgradeable: true,
                oncePerGame: true
            },
            BLACKOUT_BOMB: {
                id: 'blackout_bomb',
                name: 'Blackout Bomb',
                description: 'Create darkness cloud for 10 seconds',
                duration: 10,
                cooldown: 45,
                cost: 15,
                upgradeable: true
            },
            DECOY: {
                id: 'decoy',
                name: 'Decoy',
                description: 'Spawn sound lure to distract enemies',
                duration: 8,
                cooldown: 30,
                cost: 10,
                upgradeable: true
            },
            PHASE_SHIFT: {
                id: 'phase_shift',
                name: 'Phase Shift',
                description: 'Walk through walls for 5 seconds',
                duration: 5,
                cooldown: 90,
                cost: 25,
                upgradeable: true
            }
        },
        
        // Upgrade tiers
        upgradeTiers: {
            level1: { cooldownReduction: 0.1, durationIncrease: 0.1 },
            level2: { cooldownReduction: 0.2, durationIncrease: 0.2 },
            level3: { cooldownReduction: 0.3, durationIncrease: 0.3 }
        }
    };

    var state = {
        unlockedAbilities: [],
        abilityLevels: {},
        activeEffects: {},
        cooldowns: {},
        lastUsed: {}
    };

    /**
     * Initialize expanded abilities
     */
    function init(scene, camera) {
        console.log('[ExpandedAbilities] Initialized');
        
        // Start cooldown manager
        setInterval(updateCooldowns, 1000);
    }

    /**
     * Unlock ability
     */
    function unlockAbility(abilityId) {
        if (!config.abilities[abilityId.toUpperCase()]) {
            return false;
        }
        
        if (!state.unlockedAbilities.includes(abilityId)) {
            state.unlockedAbilities.push(abilityId);
            state.abilityLevels[abilityId] = 1;
            console.log('[ExpandedAbilities] Unlocked:', abilityId);
            return true;
        }
        return false;
    }

    /**
     * Use ability
     */
    function useAbility(abilityId, targetData) {
        var ability = config.abilities[abilityId.toUpperCase()];
        if (!ability) return false;
        
        // Check cooldown
        if (isOnCooldown(abilityId)) {
            console.log('[ExpandedAbilities] On cooldown:', abilityId);
            return false;
        }
        
        // Check cost (sanity/energy)
        if (!canAffordAbility(ability.cost)) {
            console.log('[ExpandedAbilities] Cannot afford:', abilityId);
            return false;
        }
        
        // Activate ability
        activateAbility(ability, targetData);
        
        // Set cooldown
        startCooldown(abilityId, ability.cooldown);
        state.lastUsed[abilityId] = Date.now();
        
        return true;
    }

    /**
     * Activate specific ability
     */
    function activateAbility(ability, targetData) {
        switch (ability.id) {
            case 'time_dilation':
                activateTimeDilation(ability.duration);
                break;
            case 'possession':
                activatePossession(ability.duration);
                break;
            case 'blackout_bomb':
                activateBlackoutBomb(targetData);
                break;
            case 'decoy':
                activateDecoy(targetData);
                break;
            case 'phase_shift':
                activatePhaseShift(ability.duration);
                break;
        }
        
        // Track active effect
        state.activeEffects[ability.id] = {
            startTime: Date.now(),
            duration: ability.duration,
            level: state.abilityLevels[ability.id] || 1
        };
    }

    /**
     * Time Dilation - Slow motion
     */
    function activateTimeDilation(duration) {
        console.log('[ExpandedAbilities] Time Dilation activated for', duration, 's');
        
        // Slow down game speed
        if (typeof window !== 'undefined') {
            window.timeScale = 0.3; // 30% speed
            
            setTimeout(function() {
                window.timeScale = 1.0;
                delete state.activeEffects['time_dilation'];
                console.log('[ExpandedAbilities] Time Dilation ended');
            }, duration * 1000);
        }
    }

    /**
     * Possession - Control Pac-Man
     */
    function activatePossession(duration) {
        console.log('[ExpandedAbilities] Possession activated');
        
        // Take control of nearest Pac-Man
        var pacman = findNearestPacman();
        if (pacman) {
            // Override AI control temporarily
            pacman.possessed = true;
            pacman.possessionEndTime = Date.now() + (duration * 1000);
            
            setTimeout(function() {
                if (pacman) {
                    pacman.possessed = false;
                    delete state.activeEffects['possession'];
                    console.log('[ExpandedAbilities] Possession ended');
                }
            }, duration * 1000);
        }
    }

    /**
     * Blackout Bomb - Create darkness
     */
    function activateBlackoutBomb(targetData) {
        console.log('[ExpandedAbilities] Blackout Bomb at', targetData);
        
        // Create darkness sphere
        if (typeof AdvancedLighting !== 'undefined') {
            AdvancedLighting.createBlackoutZone(targetData.position, 10);
        }
        
        // End effect after duration
        setTimeout(function() {
            delete state.activeEffects['blackout_bomb'];
        }, 10000);
    }

    /**
     * Decoy - Sound lure
     */
    function activateDecoy(targetData) {
        console.log('[ExpandedAbilities] Decoy spawned at', targetData);
        
        // Create noise at location
        if (typeof HorrorAudio !== 'undefined') {
            // Play loud sound to attract enemies
            HorrorAudio.playJumpScare();
        }
        
        // Attract AI to this location
        if (typeof Phase2AIIntegration !== 'undefined') {
            Phase2AIIntegration.reportNoise(targetData.position, 10);
        }
        
        setTimeout(function() {
            delete state.activeEffects['decoy'];
        }, 8000);
    }

    /**
     * Phase Shift - Walk through walls
     */
    function activatePhaseShift(duration) {
        console.log('[ExpandedAbilities] Phase Shift activated');
        
        // Disable collision detection temporarily
        if (typeof window !== 'undefined') {
            window.phaseShiftActive = true;
            
            setTimeout(function() {
                window.phaseShiftActive = false;
                delete state.activeEffects['phase_shift'];
                console.log('[ExpandedAbilities] Phase Shift ended');
            }, duration * 1000);
        }
    }

    /**
     * Find nearest Pac-Man
     */
    function findNearestPacman() {
        // Would search game entities
        return null; // Placeholder
    }

    /**
     * Check if ability on cooldown
     */
    function isOnCooldown(abilityId) {
        return state.cooldowns[abilityId] && state.cooldowns[abilityId] > Date.now();
    }

    /**
     * Start cooldown
     */
    function startCooldown(abilityId, baseCooldown) {
        var level = state.abilityLevels[abilityId] || 1;
        var reduction = config.upgradeTiers['level' + Math.min(level, 3)].cooldownReduction;
        
        var actualCooldown = baseCooldown * (1 - reduction);
        state.cooldowns[abilityId] = Date.now() + (actualCooldown * 1000);
    }

    /**
     * Update all cooldowns
     */
    function updateCooldowns() {
        var now = Date.now();
        for (var abilityId in state.cooldowns) {
            if (state.cooldowns[abilityId] < now) {
                delete state.cooldowns[abilityId];
            }
        }
    }

    /**
     * Check if player can afford ability
     */
    function canAffordAbility(cost) {
        // Check sanity or energy resource
        var currentSanity = typeof SanitySystem !== 'undefined' ? SanitySystem.getSanity() : 100;
        return currentSanity >= cost;
    }

    /**
     * Get active effects
     */
    function getActiveEffects() {
        return state.activeEffects;
    }

    /**
     * Get cooldown remaining
     */
    function getCooldownRemaining(abilityId) {
        if (!state.cooldowns[abilityId]) return 0;
        return Math.max(0, (state.cooldowns[abilityId] - Date.now()) / 1000);
    }

    /**
     * Upgrade ability
     */
    function upgradeAbility(abilityId) {
        if (!state.unlockedAbilities.includes(abilityId)) return false;
        
        var currentLevel = state.abilityLevels[abilityId] || 1;
        if (currentLevel >= 3) return false; // Max level
        
        state.abilityLevels[abilityId] = currentLevel + 1;
        console.log('[ExpandedAbilities] Upgraded', abilityId, 'to level', currentLevel + 1);
        return true;
    }

    // Public API
    return {
        init: init,
        unlockAbility: unlockAbility,
        useAbility: useAbility,
        upgradeAbility: upgradeAbility,
        getActiveEffects: getActiveEffects,
        getCooldownRemaining: getCooldownRemaining,
        isOnCooldown: isOnCooldown,
        config: config,
        state: state
    };
})();

// Export to global scope
if (typeof window !== 'undefined') {
    window.ExpandedAbilities = ExpandedAbilities;
}

console.log('[ExpandedAbilities] Module loaded - 5 abilities ready');

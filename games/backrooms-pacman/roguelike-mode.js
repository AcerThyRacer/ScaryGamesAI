/**
 * Roguelike Infinite Mode
 * Procedural floors with meta-progression
 */

var RoguelikeMode = (function() {
    'use strict';

    var config = {
        maxFloors: 100,
        floorDifficulty: 0.05,
        permadeathEnabled: false,
        metaProgressionEnabled: true
    };

    var state = {
        currentFloor: 0,
        maxFloorReached: 0,
        totalRuns: 0,
        totalWins: 0,
        unlocks: [],
        currency: 0,
        upgrades: {}
    };

    var floorData = null;

    function init() {
        loadProgress();
        console.log('[RoguelikeMode] Initialized, max floor:', state.maxFloorReached);
    }

    function startNewRun(permadeath) {
        state.currentFloor = 1;
        floorData = {
            floor: 1,
            seed: Math.floor(Math.random() * 1000000),
            biome: selectBiomeForFloor(1),
            difficulty: 1.0,
            enemies: 1,
            pellets: 100,
            secrets: 3
        };

        config.permadeathEnabled = permadeath;
        console.log('[RoguelikeMode] New run started, floor 1');
        return floorData;
    }

    function nextFloor() {
        state.currentFloor++;

        if (state.currentFloor > config.maxFloors) {
            return completeRun(true);
        }

        var difficulty = 1.0 + (state.currentFloor * config.floorDifficulty);
        floorData = {
            floor: state.currentFloor,
            seed: Math.floor(Math.random() * 1000000),
            biome: selectBiomeForFloor(state.currentFloor),
            difficulty: difficulty,
            enemies: Math.floor(1 + state.currentFloor / 5),
            pellets: 100 + state.currentFloor * 10,
            secrets: Math.min(10, 3 + Math.floor(state.currentFloor / 10))
        };

        console.log('[RoguelikeMode] Advanced to floor', state.currentFloor);
        return floorData;
    }

    function selectBiomeForFloor(floor) {
        var biomes = ['yellow', 'mono', 'infinite', 'flooded', 'construction'];
        var unlocked = biomes.slice(0, Math.min(biomes.length, 1 + Math.floor(floor / 20)));
        return unlocked[Math.floor(Math.random() * unlocked.length)];
    }

    function completeRun(victory) {
        if (victory) {
            state.totalWins++;
            state.currency += 1000 * state.currentFloor;
        }

        if (state.currentFloor > state.maxFloorReached) {
            state.maxFloorReached = state.currentFloor;
        }

        state.totalRuns++;

        saveProgress();

        console.log('[RoguelikeMode] Run complete, victory:', victory);
        return {
            victory: victory,
            floor: state.currentFloor,
            currency: state.currency,
            maxFloor: state.maxFloorReached
        };
    }

    function playerDied() {
        if (config.permadeathEnabled) {
            state.currentFloor = 0;
            console.log('[RoguelikeMode] Permadeath - reset to floor 0');
        }
        completeRun(false);
    }

    function unlockUpgrade(upgradeId) {
        if (!state.unlocks.includes(upgradeId)) {
            state.unlocks.push(upgradeId);
            saveProgress();
            return true;
        }
        return false;
    }

    function hasUpgrade(upgradeId) {
        return state.unlocks.includes(upgradeId);
    }

    function purchaseUpgrade(upgradeId, cost) {
        if (state.currency >= cost && !state.unlocks.includes(upgradeId)) {
            state.currency -= cost;
            unlockUpgrade(upgradeId);
            return true;
        }
        return false;
    }

    function getUpgrades() {
        return [
            { id: 'extra_health', name: 'Extra Health', cost: 100, description: '+1 HP' },
            { id: 'speed_boost', name: 'Speed Boost', cost: 150, description: '+10% speed' },
            { id: 'stamina_up', name: 'More Stamina', cost: 120, description: '+20 stamina' },
            { id: 'night_vision', name: 'Night Vision', cost: 200, description: 'Better dark vision' },
            { id: 'quiet_steps', name: 'Quiet Steps', cost: 180, description: 'Less noise' }
        ];
    }

    function saveProgress() {
        try {
            localStorage.setItem('backrooms_rogue_progress', JSON.stringify(state));
        } catch (e) {
            console.warn('[RoguelikeMode] Could not save progress');
        }
    }

    function loadProgress() {
        try {
            var saved = localStorage.getItem('backrooms_rogue_progress');
            if (saved) {
                var loaded = JSON.parse(saved);
                Object.assign(state, loaded);
            }
        } catch (e) {
            console.warn('[RoguelikeMode] Could not load progress');
        }
    }

    function resetProgress() {
        state = {
            currentFloor: 0,
            maxFloorReached: 0,
            totalRuns: 0,
            totalWins: 0,
            unlocks: [],
            currency: 0,
            upgrades: {}
        };
        saveProgress();
    }

    function getState() {
        return state;
    }

    function getCurrentFloor() {
        return state.currentFloor;
    }

    function getFloorData() {
        return floorData;
    }

    return {
        init: init,
        startNewRun: startNewRun,
        nextFloor: nextFloor,
        completeRun: completeRun,
        playerDied: playerDied,
        unlockUpgrade: unlockUpgrade,
        hasUpgrade: hasUpgrade,
        purchaseUpgrade: purchaseUpgrade,
        getUpgrades: getUpgrades,
        getState: getState,
        getCurrentFloor: getCurrentFloor,
        getFloorData: getFloorData,
        resetProgress: resetProgress,
        config: config
    };
})();

if (typeof window !== 'undefined') {
    window.RoguelikeMode = RoguelikeMode;
}

/* ============================================
   The Abyss - Game Modes System
   Phase 1 Implementation
   ============================================ */

const GameModes = (function() {
    'use strict';

    const GAME_MODES = {
        CAMPAIGN: {
            id: 'campaign',
            name: 'Campaign',
            description: 'The full story experience. Collect all artifacts and survive the abyss.',
            icon: '📖',
            features: {
                saves: true,
                checkpoints: true,
                story: true,
                permadeath: false,
                oxygenDrain: 1.0,
                creatureAggression: 1.0,
                tutorial: true
            },
            objectives: ['Collect all 5 artifacts', 'Find data logs', 'Survive the depths']
        },
        
        ENDLESS: {
            id: 'endless',
            name: 'Endless Descent',
            description: 'How deep can you go? Infinite procedural exploration with increasing difficulty.',
            icon: '∞',
            features: {
                saves: false,
                checkpoints: false,
                story: false,
                permadeath: true,
                oxygenDrain: 1.0,
                creatureAggression: 1.0,
                tutorial: false,
                infiniteDepth: true
            },
            objectives: ['Survive as long as possible', 'Reach greater depths', 'Beat your high score']
        },
        
        TIME_ATTACK: {
            id: 'timeattack',
            name: 'Time Attack',
            description: 'Race against the clock. Fixed seed daily challenges.',
            icon: '⏱️',
            features: {
                saves: false,
                checkpoints: false,
                story: false,
                permadeath: true,
                oxygenDrain: 1.2,
                creatureAggression: 1.2,
                tutorial: false,
                timer: true,
                fixedSeed: true
            },
            objectives: ['Complete as fast as possible', 'Compete on leaderboards', 'Master the daily seed']
        },
        
        HARDCORE: {
            id: 'hardcore',
            name: 'Hardcore',
            description: 'One life. No HUD. Maximum terror. For experienced divers only.',
            icon: '💀',
            features: {
                saves: false,
                checkpoints: false,
                story: true,
                permadeath: true,
                oxygenDrain: 1.5,
                creatureAggression: 1.5,
                tutorial: false,
                diegeticHUDOnly: true,
                noFlares: false
            },
            objectives: ['Complete without dying', 'Survive with no HUD', 'Prove your skill']
        },
        
        ZEN: {
            id: 'zen',
            name: 'Zen Mode',
            description: 'No creatures, infinite oxygen. Explore and take screenshots in peace.',
            icon: '☯️',
            features: {
                saves: true,
                checkpoints: true,
                story: false,
                permadeath: false,
                oxygenDrain: 0,
                creatureAggression: 0,
                tutorial: false,
                noCreatures: true,
                infiniteOxygen: true,
                infiniteFlares: true,
                photoModeUnlock: true
            },
            objectives: ['Explore freely', 'Take screenshots', 'Find hidden areas']
        }
    };

    let currentMode = null;
    let dailySeed = 0;
    let highScores = {};

    // ============================================
    // MODE MANAGEMENT
    // ============================================
    function init() {
        generateDailySeed();
        loadHighScores();
    }

    function setGameMode(modeId) {
        if (GAME_MODES[modeId.toUpperCase()]) {
            currentMode = GAME_MODES[modeId.toUpperCase()];
            return currentMode;
        }
        return null;
    }

    function getCurrentMode() {
        return currentMode || GAME_MODES.CAMPAIGN;
    }

    function getAllModes() {
        return Object.values(GAME_MODES);
    }

    function getModeFeatures() {
        return getCurrentMode().features;
    }

    // ============================================
    // DAILY CHALLENGE
    // ============================================
    function generateDailySeed() {
        const now = new Date();
        dailySeed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
        return dailySeed;
    }

    function getDailySeed() {
        return dailySeed;
    }

    function getTimeUntilNextDaily() {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        return tomorrow - now;
    }

    // ============================================
    // HIGH SCORES
    // ============================================
    function loadHighScores() {
        try {
            const saved = localStorage.getItem('abyss_highscores_v2');
            if (saved) {
                highScores = JSON.parse(saved);
            }
        } catch (e) {
            console.error('Failed to load high scores:', e);
        }
    }

    function saveHighScores() {
        try {
            localStorage.setItem('abyss_highscores_v2', JSON.stringify(highScores));
        } catch (e) {
            console.error('Failed to save high scores:', e);
        }
    }

    function submitScore(modeId, score, data = {}) {
        if (!highScores[modeId]) {
            highScores[modeId] = [];
        }
        
        const entry = {
            score: score,
            date: Date.now(),
            ...data
        };
        
        highScores[modeId].push(entry);
        
        // Sort and keep top 10
        highScores[modeId].sort((a, b) => b.score - a.score);
        highScores[modeId] = highScores[modeId].slice(0, 10);
        
        saveHighScores();
        
        // Return rank
        return highScores[modeId].findIndex(e => e === entry) + 1;
    }

    function getHighScores(modeId) {
        return highScores[modeId] || [];
    }

    function getPersonalBest(modeId) {
        const scores = getHighScores(modeId);
        return scores.length > 0 ? scores[0].score : null;
    }

    // ============================================
    // MODE-SPECIFIC LOGIC
    // ============================================
    function getOxygenDrainMultiplier() {
        return getCurrentMode().features.oxygenDrain;
    }

    function getCreatureAggressionMultiplier() {
        return getCurrentMode().features.creatureAggression;
    }

    function shouldShowTutorial() {
        return getCurrentMode().features.tutorial;
    }

    function isPermadeath() {
        return getCurrentMode().features.permadeath;
    }

    function canSave() {
        return getCurrentMode().features.saves;
    }

    function hasCheckpoints() {
        return getCurrentMode().features.checkpoints;
    }

    function isCreatureEnabled() {
        return getCurrentMode().features.creatureAggression > 0;
    }

    function isInfiniteOxygen() {
        return getCurrentMode().features.infiniteOxygen;
    }

    function useDiegeticHUDOnly() {
        return getCurrentMode().features.diegeticHUDOnly;
    }

    // ============================================
    // LEADERBOARD
    // ============================================
    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    function formatDistance(meters) {
        if (meters >= 1000) {
            return `${(meters / 1000).toFixed(2)}km`;
        }
        return `${Math.floor(meters)}m`;
    }

    function formatDepth(meters) {
        return `${Math.floor(meters)}m`;
    }

    // ============================================
    // PUBLIC API
    // ============================================
    return {
        init,
        setGameMode,
        getCurrentMode,
        getAllModes,
        getModeFeatures,
        
        // Daily challenge
        generateDailySeed,
        getDailySeed,
        getTimeUntilNextDaily,
        
        // High scores
        submitScore,
        getHighScores,
        getPersonalBest,
        
        // Mode checks
        getOxygenDrainMultiplier,
        getCreatureAggressionMultiplier,
        shouldShowTutorial,
        isPermadeath,
        canSave,
        hasCheckpoints,
        isCreatureEnabled,
        isInfiniteOxygen,
        useDiegeticHUDOnly,
        
        // Formatting
        formatTime,
        formatDistance,
        formatDepth,
        
        // Constants
        GAME_MODES
    };
})();

// Global access
window.GameModes = GameModes;

/**
 * PHASE 10: COMMUNITY & MODDING ECOSYSTEM
 * Level editor, modding API, workshop integration, competitive modes
 */

var CommunityModdingSystem = (function() {
    'use strict';

    var config = {
        // Modding capabilities
        moddingAPI: {
            customEnemies: true,
            newAbilities: true,
            alternativeWinConditions: true,
            customSoundtracks: true,
            textureReplacements: true,
            uiModifications: true
        },
        
        // Workshop settings
        workshop: {
            maxFileSize: 50, // MB
            supportedFormats: ['json', 'png', 'jpg', 'mp3', 'ogg'],
            moderationEnabled: true,
            ratingEnabled: true
        },
        
        // Competitive features
        competitive: {
            speedrunTimer: true,
            ghostReplays: true,
            leaderboards: true,
            tournaments: true
        }
    };

    var state = {
        installedMods: [],
        subscribedWorkshop: [],
        customLevels: [],
        replays: [],
        creatorProfile: null
    };

    /**
     * Initialize community & modding system
     */
    function init() {
        console.log('[CommunityModding] Initializing...');
        
        loadInstalledMods();
        loadCustomLevels();
        loadCreatorProfile();
        
        console.log('[CommunityModding] ✅ Ready');
    }

    /**
     * Load installed mods
     */
    function loadInstalledMods() {
        try {
            var saved = localStorage.getItem('installed_mods');
            if (saved) {
                state.installedMods = JSON.parse(saved);
                console.log('[CommunityModding] Loaded', state.installedMods.length, 'mods');
                
                // Apply mods
                applyMods(state.installedMods);
            }
        } catch (e) {
            console.error('[CommunityModding] Failed to load mods:', e);
        }
    }

    /**
     * Apply mods to game
     */
    function applyMods(mods) {
        mods.forEach(function(mod) {
            switch (mod.type) {
                case 'enemy_variant':
                    applyEnemyMod(mod);
                    break;
                case 'ability':
                    applyAbilityMod(mod);
                    break;
                case 'texture':
                    applyTextureMod(mod);
                    break;
                case 'soundtrack':
                    applySoundtrackMod(mod);
                    break;
            }
        });
    }

    /**
     * Apply enemy variant mod
     */
    function applyEnemyMod(mod) {
        console.log('[CommunityModding] Applying enemy mod:', mod.name);
        
        if (typeof EnemyVariants !== 'undefined') {
            // Register custom enemy
            EnemyVariants.registerCustomVariant({
                id: mod.id,
                name: mod.name,
                behavior: mod.behavior,
                appearance: mod.appearance
            });
        }
    }

    /**
     * Apply ability mod
     */
    function applyAbilityMod(mod) {
        console.log('[CommunityModding] Applying ability mod:', mod.name);
        
        if (typeof ExpandedAbilities !== 'undefined') {
            ExpandedAbilities.registerCustomAbility({
                id: mod.id,
                name: mod.name,
                effect: mod.effect,
                cooldown: mod.cooldown
            });
        }
    }

    /**
     * Apply texture mod
     */
    function applyTextureMod(mod) {
        console.log('[CommunityModding] Applying texture mod:', mod.name);
        
        // Would replace textures in game
        state.textureReplacements = state.textureReplacements || {};
        state.textureReplacements[mod.target] = mod.texturePath;
    }

    /**
     * Apply soundtrack mod
     */
    function applySoundtrackMod(mod) {
        console.log('[CommunityModding] Applying soundtrack mod:', mod.name);
        
        if (typeof DynamicSoundtrack !== 'undefined') {
            DynamicSoundtrack.loadCustomTrack(mod.id, mod.audioPath);
        }
    }

    /**
     * Install mod from file
     */
    function installMod(modFile) {
        return new Promise(function(resolve, reject) {
            var reader = new FileReader();
            
            reader.onload = function(e) {
                try {
                    var modData = JSON.parse(e.target.result);
                    
                    // Validate mod
                    if (!validateMod(modData)) {
                        reject('Invalid mod format');
                        return;
                    }
                    
                    // Add to installed mods
                    state.installedMods.push(modData);
                    saveInstalledMods();
                    
                    // Apply mod
                    applyMods([modData]);
                    
                    console.log('[CommunityModding] Installed mod:', modData.name);
                    resolve(modData);
                } catch (err) {
                    reject('Failed to parse mod file: ' + err.message);
                }
            };
            
            reader.onerror = function() {
                reject('Failed to read mod file');
            };
            
            reader.readAsText(modFile);
        });
    }

    /**
     * Validate mod structure
     */
    function validateMod(modData) {
        var required = ['id', 'name', 'type', 'version'];
        return required.every(function(field) {
            return modData.hasOwnProperty(field);
        });
    }

    /**
     * Save installed mods
     */
    function saveInstalledMods() {
        try {
            localStorage.setItem('installed_mods', JSON.stringify(state.installedMods));
        } catch (e) {
            console.error('[CommunityModding] Failed to save mods:', e);
        }
    }

    /**
     * Uninstall mod
     */
    function uninstallMod(modId) {
        state.installedMods = state.installedMods.filter(function(mod) {
            return mod.id !== modId;
        });
        
        saveInstalledMods();
        console.log('[CommunityModding] Uninstalled mod:', modId);
    }

    /**
     * Load custom levels
     */
    function loadCustomLevels() {
        try {
            var saved = localStorage.getItem('custom_levels');
            if (saved) {
                state.customLevels = JSON.parse(saved);
                console.log('[CommunityModding] Loaded', state.customLevels.length, 'custom levels');
            }
        } catch (e) {
            console.error('[CommunityModding] Failed to load levels:', e);
        }
    }

    /**
     * Save custom level
     */
    function saveCustomLevel(levelData) {
        state.customLevels.push(levelData);
        
        try {
            localStorage.setItem('custom_levels', JSON.stringify(state.customLevels));
            console.log('[CommunityModding] Saved custom level:', levelData.name);
        } catch (e) {
            console.error('[CommunityModding] Failed to save level:', e);
        }
    }

    /**
     * Export level for sharing
     */
    function exportLevel(levelId) {
        var level = state.customLevels.find(function(l) {
            return l.id === levelId;
        });
        
        if (!level) return null;
        
        return JSON.stringify(level, null, 2);
    }

    /**
     * Import level from code
     */
    function importLevel(levelCode) {
        try {
            var levelData = JSON.parse(levelCode);
            
            if (validateLevel(levelData)) {
                saveCustomLevel(levelData);
                return true;
            } else {
                console.error('[CommunityModding] Invalid level format');
                return false;
            }
        } catch (e) {
            console.error('[CommunityModding] Failed to import level:', e);
            return false;
        }
    }

    /**
     * Validate level structure
     */
    function validateLevel(levelData) {
        var required = ['id', 'name', 'grid', 'biome'];
        return required.every(function(field) {
            return levelData.hasOwnProperty(field);
        });
    }

    /**
     * Save replay
     */
    function saveReplay(replayData) {
        state.replays.push(replayData);
        
        // Limit to 20 replays
        if (state.replays.length > 20) {
            state.replays.shift();
        }
        
        console.log('[CommunityModding] Saved replay');
    }

    /**
     * Get leaderboard data
     * @param {string} category - Leaderboard category ('speedrun', 'score', 'survival')
     * @returns {Promise<Array>} Leaderboard entries
     */
    async function getLeaderboard(category) {
        category = category || 'speedrun';
        
        try {
            // Try to fetch from server first
            const response = await fetch('/api/leaderboard/' + category, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                return data;
            }
            
            // Fallback to local storage
            const localKey = 'leaderboard_' + category;
            const saved = localStorage.getItem(localKey);
            
            if (saved) {
                return JSON.parse(saved);
            }
            
            // Default mock data for new players
            return [
                { rank: 1, player: 'SpeedRunner99', score: 15420, time: '2:34.56' },
                { rank: 2, player: 'PacMaster', score: 14250, time: '2:45.12' },
                { rank: 3, player: 'BackroomsKing', score: 13890, time: '2:58.90' },
                { rank: 4, player: 'GhostHunter', score: 12500, time: '3:12.45' },
                { rank: 5, player: 'MazeRunner', score: 11200, time: '3:28.33' }
            ];
        } catch (error) {
            console.error('[CommunityModding] Failed to fetch leaderboard:', error);
            
            // Return cached data on error
            const localKey = 'leaderboard_' + category;
            const saved = localStorage.getItem(localKey);
            
            if (saved) {
                return JSON.parse(saved);
            }
            
            return [];
        }
    }
    
    /**
     * Submit score to leaderboard
     * @param {object} scoreData - Score data { player, score, time, category }
     * @returns {Promise<boolean>} Success
     */
    async function submitScore(scoreData) {
        try {
            const response = await fetch('/api/leaderboard/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    player: scoreData.player,
                    score: scoreData.score,
                    time: scoreData.time,
                    category: scoreData.category || 'speedrun',
                    timestamp: Date.now()
                })
            });
            
            if (response.ok) {
                console.log('[CommunityModding] Score submitted successfully');
                
                // Update local cache
                updateLocalLeaderboard(scoreData);
                
                return true;
            } else {
                throw new Error('Server rejected score submission');
            }
        } catch (error) {
            console.error('[CommunityModding] Failed to submit score:', error);
            
            // Store locally for later submission
            storePendingScore(scoreData);
            
            return false;
        }
    }
    
    /**
     * Update local leaderboard cache
     */
    function updateLocalLeaderboard(scoreData) {
        const localKey = 'leaderboard_' + (scoreData.category || 'speedrun');
        let leaderboard = [];
        
        const saved = localStorage.getItem(localKey);
        if (saved) {
            leaderboard = JSON.parse(saved);
        }
        
        // Add new score
        leaderboard.push({
            rank: leaderboard.length + 1,
            player: scoreData.player,
            score: scoreData.score,
            time: scoreData.time
        });
        
        // Sort by score descending
        leaderboard.sort((a, b) => b.score - a.score);
        
        // Update ranks
        leaderboard.forEach((entry, index) => {
            entry.rank = index + 1;
        });
        
        // Keep top 100
        leaderboard = leaderboard.slice(0, 100);
        
        localStorage.setItem(localKey, JSON.stringify(leaderboard));
    }
    
    /**
     * Store score for later submission
     */
    function storePendingScore(scoreData) {
        let pending = [];
        
        const saved = localStorage.getItem('pending_scores');
        if (saved) {
            pending = JSON.parse(saved);
        }
        
        pending.push({
            ...scoreData,
            timestamp: Date.now(),
            retries: 0
        });
        
        localStorage.setItem('pending_scores', JSON.stringify(pending));
    }
    
    /**
     * Retry submitting pending scores
     */
    async function retryPendingScores() {
        const saved = localStorage.getItem('pending_scores');
        if (!saved) return;
        
        let pending = JSON.parse(saved);
        const remaining = [];
        
        for (const scoreData of pending) {
            if (scoreData.retries < 3) {
                const success = await submitScore(scoreData);
                if (!success) {
                    scoreData.retries++;
                    remaining.push(scoreData);
                }
            }
        }
        
        localStorage.setItem('pending_scores', JSON.stringify(remaining));
    }

    /**
     * Get creator profile
     */
    function getCreatorProfile() {
        return state.creatorProfile || {
            username: 'Anonymous',
            totalDownloads: 0,
            totalRatings: 0,
            averageRating: 0,
            uploadedContent: []
        };
    }

    /**
     * Load creator profile
     */
    function loadCreatorProfile() {
        try {
            var saved = localStorage.getItem('creator_profile');
            if (saved) {
                state.creatorProfile = JSON.parse(saved);
            }
        } catch (e) {}
    }

    /**
     * Rate workshop item
     */
    function rateWorkshopItem(itemId, rating) {
        console.log('[CommunityModding] Rated item', itemId, rating, 'stars');
        // Would send to server
    }

    /**
     * Subscribe to workshop item
     */
    function subscribeWorkshop(itemId) {
        state.subscribedWorkshop.push(itemId);
        console.log('[CommunityModding] Subscribed to workshop item:', itemId);
    }

    /**
     * Get statistics
     */
    function getStats() {
        return {
            installedMods: state.installedMods.length,
            customLevels: state.customLevels.length,
            savedReplays: state.replays.length,
            subscribedWorkshop: state.subscribedWorkshop.length
        };
    }

    // Public API
    return {
        init: init,
        installMod: installMod,
        uninstallMod: uninstallMod,
        saveCustomLevel: saveCustomLevel,
        exportLevel: exportLevel,
        importLevel: importLevel,
        saveReplay: saveReplay,
        getLeaderboard: getLeaderboard,
        getCreatorProfile: getCreatorProfile,
        rateWorkshopItem: rateWorkshopItem,
        subscribeWorkshop: subscribeWorkshop,
        getStats: getStats,
        config: config,
        state: state
    };
})();

// Export to global scope
if (typeof window !== 'undefined') {
    window.CommunityModdingSystem = CommunityModdingSystem;
}

console.log('[CommunityModdingSystem] Module loaded - Community features ready');

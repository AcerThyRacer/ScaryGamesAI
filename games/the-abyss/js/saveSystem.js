/* ============================================
   The Abyss - Save/Load System
   Phase 1 Implementation
   ============================================ */

const SaveSystem = (function() {
    'use strict';

    const SAVE_KEY_PREFIX = 'abyss_save_';
    const SETTINGS_KEY = 'abyss_settings_v2';
    const STATS_KEY = 'abyss_stats_v2';
    const ACHIEVEMENTS_KEY = 'abyss_achievements_v2';
    const MAX_SAVE_SLOTS = 3;

    // Default settings
    const DEFAULT_SETTINGS = {
        version: '2.0.0',
        graphics: {
            quality: 'high', // low, medium, high, ultra
            renderScale: 1.0,
            shadows: true,
            shadowQuality: 'high',
            bloom: true,
            fogDensity: 0.025,
            fov: 75,
            vsync: true,
            fpsLimit: 60
        },
        audio: {
            master: 0.8,
            music: 0.3,
            sfx: 0.5,
            ambient: 0.4,
            ui: 0.5
        },
        controls: {
            mouseSensitivityX: 1.0,
            mouseSensitivityY: 1.0,
            mouseAcceleration: false,
            invertY: false,
            gamepadSensitivity: 1.0,
            keyBindings: {
                forward: 'KeyW',
                backward: 'KeyS',
                left: 'KeyA',
                right: 'KeyD',
                up: 'Space',
                down: 'ControlLeft',
                sprint: 'ShiftLeft',
                flare: 'KeyF',
                interact: 'KeyE',
                wristDisplay: 'Tab',
                photoMode: 'KeyP',
                pause: 'Escape'
            }
        },
        accessibility: {
            colorblindMode: 'none', // none, protanopia, deuteranopia, tritanopia
            highContrast: false,
            textSize: 1.0,
            subtitles: true,
            subtitleSize: 'medium', // small, medium, large
            reducedMotion: false
        },
        gameplay: {
            tutorialEnabled: true,
            autoSave: true,
            autoSaveInterval: 60, // seconds
            showDamageNumbers: false,
            compassAlwaysVisible: true
        }
    };

    // Achievement definitions
    const ACHIEVEMENTS = {
        // Progression
        'first_dive': { id: 'first_dive', name: 'First Dive', desc: 'Complete the tutorial', icon: '🤿', points: 10 },
        'treasure_hunter': { id: 'treasure_hunter', name: 'Treasure Hunter', desc: 'Collect your first artifact', icon: '🏺', points: 10 },
        'archaeologist': { id: 'archaeologist', name: 'Archaeologist', desc: 'Collect all 5 artifacts', icon: '🏛️', points: 50 },
        'historian': { id: 'historian', name: 'Historian', desc: 'Find all data logs', icon: '📚', points: 30 },
        'survivor': { id: 'survivor', name: 'Survivor', desc: 'Complete without dying', icon: '💀', points: 100 },
        
        // Skill
        'speed_demon': { id: 'speed_demon', name: 'Speed Demon', desc: 'Complete in under 10 minutes', icon: '⚡', points: 50 },
        'marathon_swimmer': { id: 'marathon_swimmer', name: 'Marathon Swimmer', desc: 'Swim 1000m total', icon: '🏊', points: 20 },
        'flare_master': { id: 'flare_master', name: 'Flare Master', desc: 'Distract 10 creatures with flares', icon: '🔥', points: 20 },
        'ghost': { id: 'ghost', name: 'Ghost', desc: 'Complete without being detected', icon: '👻', points: 100 },
        'iron_lung': { id: 'iron_lung', name: 'Iron Lung', desc: 'Complete without using air pockets', icon: '🫁', points: 50 },
        
        // Challenges
        'deep_diver': { id: 'deep_diver', name: 'Deep Diver', desc: 'Reach 100m depth', icon: '⬇️', points: 30 },
        'leviathan_witness': { id: 'leviathan_witness', name: 'Leviathan Witness', desc: 'See the leviathan and survive', icon: '🐋', points: 50 },
        'pacifist': { id: 'pacifist', name: 'Pacifist', desc: 'Complete without using flares', icon: '🕊️', points: 50 },
        
        // Secret
        'secret_room': { id: 'secret_room', name: 'Hidden Depths', desc: 'Find a secret area', icon: '🔮', points: 25, secret: true },
        'completionist': { id: 'completionist', name: 'Completionist', desc: 'Unlock all other achievements', icon: '👑', points: 200 }
    };

    // Statistics tracking
    let sessionStats = {
        startTime: Date.now(),
        distanceSwum: 0,
        creaturesEncountered: 0,
        flaresUsed: 0,
        damageTaken: 0,
        oxygenConsumed: 0,
        deepestPoint: 0,
        artifactsCollected: 0,
        logsFound: 0
    };

    // ============================================
    // SETTINGS MANAGEMENT
    // ============================================
    function loadSettings() {
        try {
            const saved = localStorage.getItem(SETTINGS_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                // Merge with defaults to handle new settings
                return deepMerge(DEFAULT_SETTINGS, parsed);
            }
        } catch (e) {
            console.error('Failed to load settings:', e);
        }
        return { ...DEFAULT_SETTINGS };
    }

    function saveSettings(settings) {
        try {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
            return true;
        } catch (e) {
            console.error('Failed to save settings:', e);
            return false;
        }
    }

    function resetSettings() {
        saveSettings(DEFAULT_SETTINGS);
        return { ...DEFAULT_SETTINGS };
    }

    // ============================================
    // SAVE GAME MANAGEMENT
    // ============================================
    function createSaveGame(slot, gameData) {
        if (slot < 0 || slot >= MAX_SAVE_SLOTS) return false;
        
        const saveData = {
            version: '2.0.0',
            timestamp: Date.now(),
            playtime: gameData.playtime || 0,
            thumbnail: gameData.thumbnail || null,
            
            // Player state
            player: {
                position: gameData.player.position,
                oxygen: gameData.player.oxygen,
                health: gameData.player.health,
                flares: gameData.player.flares,
                depth: gameData.player.depth,
                upgrades: gameData.player.upgrades || {}
            },
            
            // World state
            world: {
                artifactsCollected: gameData.world.artifactsCollected || [],
                logsCollected: gameData.world.logsCollected || [],
                flaresDestroyed: gameData.world.flaresDestroyed || [],
                creaturesKilled: gameData.world.creaturesKilled || [],
                secretsFound: gameData.world.secretsFound || [],
                currentBiome: gameData.world.currentBiome || 'shallows'
            },
            
            // Session info
            session: {
                gameMode: gameData.session.gameMode || 'campaign',
                difficulty: gameData.session.difficulty || 'normal',
                seed: gameData.session.seed || 0,
                startTime: gameData.session.startTime || Date.now()
            },
            
            // Statistics for this run
            stats: {
                distanceSwum: sessionStats.distanceSwum,
                creaturesEncountered: sessionStats.creaturesEncountered,
                flaresUsed: sessionStats.flaresUsed,
                deepestPoint: sessionStats.deepestPoint
            }
        };
        
        try {
            localStorage.setItem(SAVE_KEY_PREFIX + slot, JSON.stringify(saveData));
            return true;
        } catch (e) {
            console.error('Failed to save game:', e);
            return false;
        }
    }

    function loadSaveGame(slot) {
        if (slot < 0 || slot >= MAX_SAVE_SLOTS) return null;
        
        try {
            const saved = localStorage.getItem(SAVE_KEY_PREFIX + slot);
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (e) {
            console.error('Failed to load save:', e);
        }
        return null;
    }

    function deleteSaveGame(slot) {
        if (slot < 0 || slot >= MAX_SAVE_SLOTS) return false;
        
        try {
            localStorage.removeItem(SAVE_KEY_PREFIX + slot);
            return true;
        } catch (e) {
            console.error('Failed to delete save:', e);
            return false;
        }
    }

    function getAllSaves() {
        const saves = [];
        for (let i = 0; i < MAX_SAVE_SLOTS; i++) {
            const save = loadSaveGame(i);
            if (save) {
                saves.push({
                    slot: i,
                    ...save
                });
            }
        }
        return saves;
    }

    function hasAnySave() {
        return getAllSaves().length > 0;
    }

    // ============================================
    // ACHIEVEMENTS
    // ============================================
    function loadAchievements() {
        try {
            const saved = localStorage.getItem(ACHIEVEMENTS_KEY);
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (e) {
            console.error('Failed to load achievements:', e);
        }
        return {
            unlocked: [],
            progress: {},
            totalPoints: 0,
            lastSynced: 0
        };
    }

    function saveAchievements(data) {
        try {
            localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('Failed to save achievements:', e);
            return false;
        }
    }

    function unlockAchievement(achievementId) {
        const data = loadAchievements();
        
        if (data.unlocked.includes(achievementId)) {
            return false; // Already unlocked
        }
        
        const achievement = ACHIEVEMENTS[achievementId];
        if (!achievement) return false;
        
        data.unlocked.push(achievementId);
        data.totalPoints += achievement.points;
        data.lastSynced = Date.now();
        
        saveAchievements(data);
        
        // Trigger notification
        showAchievementNotification(achievement);
        
        // Check completionist
        const nonSecretCount = Object.values(ACHIEVEMENTS).filter(a => !a.secret && a.id !== 'completionist').length;
        const unlockedNonSecret = data.unlocked.filter(id => {
            const a = ACHIEVEMENTS[id];
            return a && !a.secret && id !== 'completionist';
        }).length;
        
        if (unlockedNonSecret >= nonSecretCount && !data.unlocked.includes('completionist')) {
            setTimeout(() => unlockAchievement('completionist'), 1000);
        }
        
        return true;
    }

    function getAchievementProgress(achievementId) {
        const data = loadAchievements();
        return data.progress[achievementId] || 0;
    }

    function updateAchievementProgress(achievementId, current, max) {
        const data = loadAchievements();
        data.progress[achievementId] = { current, max };
        
        if (current >= max) {
            unlockAchievement(achievementId);
        } else {
            saveAchievements(data);
        }
    }

    function showAchievementNotification(achievement) {
        const notification = document.createElement('div');
        notification.className = 'achievement-notification';
        notification.innerHTML = `
            <div class="achievement-icon">${achievement.icon}</div>
            <div class="achievement-info">
                <div class="achievement-title">Achievement Unlocked!</div>
                <div class="achievement-name">${achievement.name}</div>
                <div class="achievement-desc">${achievement.desc}</div>
                <div class="achievement-points">+${achievement.points} pts</div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Animation
        setTimeout(() => notification.classList.add('show'), 100);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 500);
        }, 5000);
    }

    function getAllAchievements() {
        return ACHIEVEMENTS;
    }

    function getUnlockedAchievements() {
        const data = loadAchievements();
        return data.unlocked.map(id => ACHIEVEMENTS[id]).filter(Boolean);
    }

    // ============================================
    // LIFETIME STATISTICS
    // ============================================
    function loadLifetimeStats() {
        try {
            const saved = localStorage.getItem(STATS_KEY);
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (e) {
            console.error('Failed to load stats:', e);
        }
        return {
            totalPlaytime: 0,
            totalDistanceSwum: 0,
            totalDeaths: 0,
            artifactsCollected: 0,
            logsFound: 0,
            flaresThrown: 0,
            creaturesEncountered: 0,
            bestTime: Infinity,
            deepestDive: 0,
            gamesPlayed: 0,
            gamesCompleted: 0,
            achievementsUnlocked: 0,
            totalPoints: 0
        };
    }

    function saveLifetimeStats(stats) {
        try {
            localStorage.setItem(STATS_KEY, JSON.stringify(stats));
            return true;
        } catch (e) {
            console.error('Failed to save stats:', e);
            return false;
        }
    }

    function updateLifetimeStats(sessionData) {
        const stats = loadLifetimeStats();
        
        stats.totalPlaytime += sessionData.playtime || 0;
        stats.totalDistanceSwum += sessionData.distanceSwum || 0;
        stats.totalDeaths += sessionData.deaths || 0;
        stats.artifactsCollected += sessionData.artifactsCollected || 0;
        stats.logsFound += sessionData.logsFound || 0;
        stats.flaresThrown += sessionData.flaresThrown || 0;
        stats.creaturesEncountered += sessionData.creaturesEncountered || 0;
        stats.deepestDive = Math.max(stats.deepestDive, sessionData.deepestDive || 0);
        stats.gamesPlayed++;
        
        if (sessionData.completed) {
            stats.gamesCompleted++;
            if (sessionData.completionTime < stats.bestTime) {
                stats.bestTime = sessionData.completionTime;
            }
        }
        
        const achievements = loadAchievements();
        stats.achievementsUnlocked = achievements.unlocked.length;
        stats.totalPoints = achievements.totalPoints;
        
        saveLifetimeStats(stats);
        return stats;
    }

    // Session stats helpers
    function resetSessionStats() {
        sessionStats = {
            startTime: Date.now(),
            distanceSwum: 0,
            creaturesEncountered: 0,
            flaresUsed: 0,
            damageTaken: 0,
            oxygenConsumed: 0,
            deepestPoint: 0,
            artifactsCollected: 0,
            logsFound: 0
        };
    }

    function getSessionStats() {
        return { ...sessionStats };
    }

    function updateSessionStat(key, value) {
        if (sessionStats.hasOwnProperty(key)) {
            if (typeof sessionStats[key] === 'number' && typeof value === 'number') {
                sessionStats[key] += value;
            } else {
                sessionStats[key] = value;
            }
        }
    }

    // ============================================
    // UTILITY FUNCTIONS
    // ============================================
    function deepMerge(defaults, overrides) {
        const result = { ...defaults };
        
        for (const key in overrides) {
            if (overrides.hasOwnProperty(key)) {
                if (typeof overrides[key] === 'object' && overrides[key] !== null && !Array.isArray(overrides[key])) {
                    result[key] = deepMerge(defaults[key] || {}, overrides[key]);
                } else {
                    result[key] = overrides[key];
                }
            }
        }
        
        return result;
    }

    function exportSave(slot) {
        const save = loadSaveGame(slot);
        if (!save) return null;
        
        return btoa(JSON.stringify(save));
    }

    function importSave(base64Data) {
        try {
            const save = JSON.parse(atob(base64Data));
            // Validate save data
            if (save.version && save.player && save.world) {
                return save;
            }
        } catch (e) {
            console.error('Invalid save data:', e);
        }
        return null;
    }

    function getStorageUsage() {
        let total = 0;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(SAVE_KEY_PREFIX)) {
                total += localStorage.getItem(key).length;
            }
        }
        return total;
    }

    // ============================================
    // PUBLIC API
    // ============================================
    return {
        // Settings
        loadSettings,
        saveSettings,
        resetSettings,
        DEFAULT_SETTINGS,
        
        // Saves
        createSaveGame,
        loadSaveGame,
        deleteSaveGame,
        getAllSaves,
        hasAnySave,
        MAX_SAVE_SLOTS,
        
        // Achievements
        loadAchievements,
        saveAchievements,
        unlockAchievement,
        getAchievementProgress,
        updateAchievementProgress,
        getAllAchievements,
        getUnlockedAchievements,
        ACHIEVEMENTS,
        
        // Stats
        loadLifetimeStats,
        saveLifetimeStats,
        updateLifetimeStats,
        resetSessionStats,
        getSessionStats,
        updateSessionStat,
        
        // Import/Export
        exportSave,
        importSave,
        getStorageUsage
    };
})();

// Global access
window.SaveSystem = SaveSystem;

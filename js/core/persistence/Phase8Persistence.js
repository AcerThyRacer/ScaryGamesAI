/**
 * ============================================
 * SGAI PHASE 8: SAVE/LOAD & PERSISTENCE
 * ============================================
 * Complete save system with cloud sync and local backup
 * 
 * Features:
 * - Cloud Save Integration
 * - Local Storage Backup
 * - Auto-Save System
 * - Save States/Checkpoints
 * - Statistics Tracking
 * - Settings Persistence
 * - Save Data Encryption
 * - Cross-Device Sync
 * 
 * Usage:
 *   const saveManager = new SaveManager();
 *   await saveManager.init();
 *   await saveManager.save('blood-tetris', gameState);
 */

(function(global) {
    'use strict';

    // ============================================
    // SAVE MANAGER
    // ============================================

    class SaveManager {
        constructor() {
            this.initialized = false;
            this.cloudEnabled = false;
            this.autoSaveEnabled = true;
            this.autoSaveInterval = 30000; // 30 seconds
            this.saveVersion = '1.0';
            
            // Save keys
            this.prefix = 'sgai_save_';
            this.metadataKey = 'sgai_save_metadata';
            
            // Cloud save endpoint (configurable)
            this.cloudEndpoint = '/api/save';
            this.cloudToken = null;
            
            // Pending saves queue
            this.pendingSaves = new Map();
            this.saveTimeout = null;
            
            // Encryption key (derived from user agent for basic obfuscation)
            this.encryptionKey = this._generateEncryptionKey();
            
            // Listeners
            this.listeners = new Map();
        }

        /**
         * Initialize save manager
         */
        async init(options = {}) {
            console.log('[SaveManager] Initializing...');
            
            this.cloudEnabled = options.cloudEnabled !== false;
            this.autoSaveEnabled = options.autoSave !== false;
            this.autoSaveInterval = options.autoSaveInterval || 30000;
            this.cloudEndpoint = options.cloudEndpoint || this.cloudEndpoint;
            this.cloudToken = options.cloudToken || null;

            // Load metadata
            await this._loadMetadata();

            // Setup auto-save
            if (this.autoSaveEnabled) {
                this._setupAutoSave();
            }

            // Setup cloud sync if enabled
            if (this.cloudEnabled) {
                await this._initCloudSync();
            }

            this.initialized = true;
            console.log('[SaveManager] Ready');
            return true;
        }

        /**
         * Generate encryption key
         */
        _generateEncryptionKey() {
            // Simple XOR key based on user agent
            const ua = navigator.userAgent;
            let key = 0;
            for (let i = 0; i < ua.length; i++) {
                key = ((key << 5) - key) + ua.charCodeAt(i);
                key |= 0;
            }
            return key;
        }

        /**
         * Simple XOR encryption for save data
         */
        _encrypt(data) {
            const str = JSON.stringify(data);
            let result = '';
            for (let i = 0; i < str.length; i++) {
                result += String.fromCharCode(str.charCodeAt(i) ^ (this.encryptionKey & 0xFF));
            }
            return btoa(result);
        }

        /**
         * Decrypt save data
         */
        _decrypt(encrypted) {
            try {
                const str = atob(encrypted);
                let result = '';
                for (let i = 0; i < str.length; i++) {
                    result += String.fromCharCode(str.charCodeAt(i) ^ (this.encryptionKey & 0xFF));
                }
                return JSON.parse(result);
            } catch (error) {
                console.error('[SaveManager] Decrypt failed:', error);
                return null;
            }
        }

        /**
         * Save game data
         */
        async save(gameId, data, options = {}) {
            if (!this.initialized) {
                console.warn('[SaveManager] Not initialized');
                return false;
            }

            const saveData = {
                gameId,
                data,
                version: this.saveVersion,
                timestamp: Date.now(),
                playTime: data.totalTime || 0,
                checksum: this._generateChecksum(data)
            };

            const slot = options.slot || 'default';
            const saveKey = `${this.prefix}${gameId}_${slot}`;

            try {
                // Save to local storage (encrypted)
                const encrypted = this._encrypt(saveData);
                localStorage.setItem(saveKey, encrypted);

                // Update metadata
                await this._updateMetadata(gameId, slot, saveData);

                // Cloud save if enabled
                if (this.cloudEnabled) {
                    this._cloudSave(gameId, slot, saveData);
                }

                console.log(`[SaveManager] Saved ${gameId}:${slot}`);
                this._notify('save', { gameId, slot, timestamp: saveData.timestamp });

                return true;
            } catch (error) {
                console.error('[SaveManager] Save failed:', error);
                return false;
            }
        }

        /**
         * Load game data
         */
        async load(gameId, options = {}) {
            if (!this.initialized) return null;

            const slot = options.slot || 'default';
            const saveKey = `${this.prefix}${gameId}_${slot}`;

            try {
                // Try cloud save first if enabled
                if (this.cloudEnabled) {
                    const cloudData = await this._cloudLoad(gameId, slot);
                    if (cloudData) {
                        console.log(`[SaveManager] Loaded ${gameId}:${slot} from cloud`);
                        return cloudData;
                    }
                }

                // Fall back to local storage
                const encrypted = localStorage.getItem(saveKey);
                if (!encrypted) {
                    console.log(`[SaveManager] No save found for ${gameId}:${slot}`);
                    return null;
                }

                const saveData = this._decrypt(encrypted);
                
                // Verify checksum
                if (!this._verifyChecksum(saveData.data, saveData.checksum)) {
                    console.warn('[SaveManager] Save data corrupted, attempting recovery...');
                    // Try to recover what we can
                }

                console.log(`[SaveManager] Loaded ${gameId}:${slot}`);
                return saveData.data;
            } catch (error) {
                console.error('[SaveManager] Load failed:', error);
                return null;
            }
        }

        /**
         * Delete save data
         */
        async delete(gameId, options = {}) {
            const slot = options.slot || 'default';
            const saveKey = `${this.prefix}${gameId}_${slot}`;

            try {
                localStorage.removeItem(saveKey);
                await this._removeMetadata(gameId, slot);

                // Delete from cloud
                if (this.cloudEnabled) {
                    await this._cloudDelete(gameId, slot);
                }

                console.log(`[SaveManager] Deleted ${gameId}:${slot}`);
                return true;
            } catch (error) {
                console.error('[SaveManager] Delete failed:', error);
                return false;
            }
        }

        /**
         * Check if save exists
         */
        hasSave(gameId, options = {}) {
            const slot = options.slot || 'default';
            const saveKey = `${this.prefix}${gameId}_${slot}`;
            return localStorage.getItem(saveKey) !== null;
        }

        /**
         * Get all saves
         */
        getAllSaves() {
            const saves = [];
            
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith(this.prefix)) {
                    try {
                        const encrypted = localStorage.getItem(key);
                        const saveData = this._decrypt(encrypted);
                        if (saveData) {
                            const parts = key.replace(this.prefix, '').split('_');
                            saves.push({
                                gameId: parts[0],
                                slot: parts[1] || 'default',
                                timestamp: saveData.timestamp,
                                playTime: saveData.playTime,
                                preview: this._getSavePreview(saveData.data)
                            });
                        }
                    } catch (error) {
                        console.warn('[SaveManager] Error reading save:', key, error);
                    }
                }
            }

            return saves.sort((a, b) => b.timestamp - a.timestamp);
        }

        /**
         * Get save preview
         */
        _getSavePreview(data) {
            if (!data) return {};
            
            return {
                score: data.score || data.highScore || 0,
                level: data.level || data.wave || 1,
                time: data.totalTime || 0
            };
        }

        /**
         * Generate checksum for data integrity
         */
        _generateChecksum(data) {
            const str = JSON.stringify(data);
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash |= 0;
            }
            return hash;
        }

        /**
         * Verify checksum
         */
        _verifyChecksum(data, expectedChecksum) {
            return this._generateChecksum(data) === expectedChecksum;
        }

        /**
         * Update metadata
         */
        async _updateMetadata(gameId, slot, saveData) {
            let metadata = await this._loadMetadata();
            
            if (!metadata.games[gameId]) {
                metadata.games[gameId] = {};
            }
            
            metadata.games[gameId][slot] = {
                timestamp: saveData.timestamp,
                playTime: saveData.playTime,
                version: saveData.version
            };
            
            metadata.lastSave = Date.now();
            metadata.totalSaves++;
            
            localStorage.setItem(this.metadataKey, JSON.stringify(metadata));
        }

        /**
         * Remove metadata
         */
        async _removeMetadata(gameId, slot) {
            let metadata = await this._loadMetadata();
            
            if (metadata.games[gameId]) {
                delete metadata.games[gameId][slot];
                if (Object.keys(metadata.games[gameId]).length === 0) {
                    delete metadata.games[gameId];
                }
            }
            
            localStorage.setItem(this.metadataKey, JSON.stringify(metadata));
        }

        /**
         * Load metadata
         */
        async _loadMetadata() {
            try {
                const data = localStorage.getItem(this.metadataKey);
                if (data) {
                    return JSON.parse(data);
                }
            } catch (error) {
                console.error('[SaveManager] Metadata load failed:', error);
            }
            
            return {
                games: {},
                lastSave: 0,
                totalSaves: 0,
                cloudSynced: false
            };
        }

        /**
         * Setup auto-save
         */
        _setupAutoSave() {
            // Save on visibility change
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    this._flushPendingSaves();
                }
            });

            // Save on beforeunload
            window.addEventListener('beforeunload', () => {
                this._flushPendingSaves();
            });

            // Periodic auto-save
            setInterval(() => {
                this._flushPendingSaves();
            }, this.autoSaveInterval);
        }

        /**
         * Queue save for auto-save
         */
        queueSave(gameId, data, options = {}) {
            if (!this.autoSaveEnabled) return;
            
            this.pendingSaves.set(`${gameId}_${options.slot || 'default'}`, {
                gameId,
                data,
                options,
                timestamp: Date.now()
            });

            // Debounce save flush
            if (this.saveTimeout) {
                clearTimeout(this.saveTimeout);
            }
            this.saveTimeout = setTimeout(() => {
                this._flushPendingSaves();
            }, 5000);
        }

        /**
         * Flush pending saves
         */
        _flushPendingSaves() {
            this.pendingSaves.forEach((save, key) => {
                this.save(save.gameId, save.data, save.options);
            });
            this.pendingSaves.clear();
        }

        /**
         * Initialize cloud sync
         */
        async _initCloudSync() {
            if (!this.cloudToken) {
                console.log('[SaveManager] Cloud sync disabled (no token)');
                this.cloudEnabled = false;
                return;
            }

            try {
                // Test cloud connection
                const response = await fetch(`${this.cloudEndpoint}/status`, {
                    headers: { 'Authorization': `Bearer ${this.cloudToken}` }
                });
                
                if (response.ok) {
                    console.log('[SaveManager] Cloud sync enabled');
                } else {
                    console.warn('[SaveManager] Cloud sync unavailable');
                    this.cloudEnabled = false;
                }
            } catch (error) {
                console.warn('[SaveManager] Cloud sync error:', error);
                this.cloudEnabled = false;
            }
        }

        /**
         * Cloud save
         */
        async _cloudSave(gameId, slot, data) {
            if (!this.cloudEnabled || !this.cloudToken) return false;

            try {
                const response = await fetch(`${this.cloudEndpoint}/save`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.cloudToken}`
                    },
                    body: JSON.stringify({
                        gameId,
                        slot,
                        data,
                        timestamp: data.timestamp,
                        version: this.saveVersion
                    })
                });

                if (response.ok) {
                    console.log('[SaveManager] Cloud save successful');
                    this._notify('cloudSave', { gameId, slot });
                    return true;
                }
                return false;
            } catch (error) {
                console.error('[SaveManager] Cloud save failed:', error);
                return false;
            }
        }

        /**
         * Cloud load
         */
        async _cloudLoad(gameId, slot) {
            if (!this.cloudEnabled || !this.cloudToken) return null;

            try {
                const response = await fetch(
                    `${this.cloudEndpoint}/load?gameId=${gameId}&slot=${slot}`,
                    {
                        headers: { 'Authorization': `Bearer ${this.cloudToken}` }
                    }
                );

                if (response.ok) {
                    const result = await response.json();
                    return result.data;
                }
                return null;
            } catch (error) {
                console.error('[SaveManager] Cloud load failed:', error);
                return null;
            }
        }

        /**
         * Cloud delete
         */
        async _cloudDelete(gameId, slot) {
            if (!this.cloudEnabled || !this.cloudToken) return false;

            try {
                await fetch(`${this.cloudEndpoint}/delete`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.cloudToken}`
                    },
                    body: JSON.stringify({ gameId, slot })
                });
                return true;
            } catch (error) {
                console.error('[SaveManager] Cloud delete failed:', error);
                return false;
            }
        }

        /**
         * Export save data
         */
        exportSave(gameId, options = {}) {
            const slot = options.slot || 'default';
            const saveKey = `${this.prefix}${gameId}_${slot}`;
            const encrypted = localStorage.getItem(saveKey);
            
            if (!encrypted) return null;

            return {
                gameId,
                slot,
                data: encrypted,
                version: this.saveVersion,
                exportedAt: Date.now()
            };
        }

        /**
         * Import save data
         */
        importSave(exportData) {
            try {
                if (!exportData || !exportData.data || !exportData.gameId) {
                    throw new Error('Invalid export data');
                }

                const saveKey = `${this.prefix}${exportData.gameId}_${exportData.slot || 'default'}`;
                localStorage.setItem(saveKey, exportData.data);
                
                console.log(`[SaveManager] Imported save for ${exportData.gameId}`);
                return true;
            } catch (error) {
                console.error('[SaveManager] Import failed:', error);
                return false;
            }
        }

        /**
         * Clear all saves
         */
        clearAll() {
            const keys = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith(this.prefix)) {
                    keys.push(key);
                }
            }
            
            keys.forEach(key => localStorage.removeItem(key));
            localStorage.removeItem(this.metadataKey);
            
            console.log('[SaveManager] All saves cleared');
        }

        /**
         * Get save statistics
         */
        getStats() {
            const saves = this.getAllSaves();
            const metadata = this._loadMetadata();
            
            return {
                totalSaves: saves.length,
                gamesPlayed: new Set(saves.map(s => s.gameId)).size,
                totalPlayTime: saves.reduce((acc, s) => acc + (s.playTime || 0), 0),
                lastSave: metadata.lastSave,
                cloudEnabled: this.cloudEnabled,
                autoSaveEnabled: this.autoSaveEnabled
            };
        }

        /**
         * Event listeners
         */
        on(event, callback) {
            if (!this.listeners.has(event)) {
                this.listeners.set(event, []);
            }
            this.listeners.get(event).push(callback);
        }

        _notify(event, data) {
            const callbacks = this.listeners.get(event);
            if (callbacks) {
                callbacks.forEach(cb => cb(data));
            }
        }

        /**
         * Cleanup
         */
        dispose() {
            this._flushPendingSaves();
            this.listeners.clear();
            this.initialized = false;
        }
    }

    // ============================================
    // STATISTICS TRACKER
    // ============================================

    class StatisticsTracker {
        constructor() {
            this.stats = new Map();
            this.sessionStats = new Map();
            this.initialized = false;
            this.saveKey = 'sgai_statistics_v1';
            this.listeners = new Map();
        }

        /**
         * Initialize statistics tracker
         */
        async init() {
            console.log('[StatisticsTracker] Initializing...');
            await this.load();
            this.initialized = true;
            return true;
        }

        /**
         * Track event
         */
        track(gameId, event, data = {}) {
            if (!this.initialized) return;

            const key = `${gameId}:${event}`;
            
            // Update global stats
            if (!this.stats.has(key)) {
                this.stats.set(key, {
                    count: 0,
                    total: 0,
                    min: Infinity,
                    max: -Infinity,
                    lastValue: null,
                    timestamps: []
                });
            }

            const stat = this.stats.get(key);
            stat.count++;
            
            if (data.value !== undefined) {
                stat.total += data.value;
                stat.min = Math.min(stat.min, data.value);
                stat.max = Math.max(stat.max, data.value);
                stat.lastValue = data.value;
            }

            // Track timestamp (keep last 100)
            stat.timestamps.push(Date.now());
            if (stat.timestamps.length > 100) {
                stat.timestamps.shift();
            }

            // Update session stats
            this._updateSessionStats(gameId, event, data);

            // Notify listeners
            this._notify('track', { gameId, event, data, stat });

            // Auto-save periodically
            this._scheduleSave();
        }

        /**
         * Update session stats
         */
        _updateSessionStats(gameId, event, data) {
            if (!this.sessionStats.has(gameId)) {
                this.sessionStats.set(gameId, {
                    startTime: Date.now(),
                    events: new Map()
                });
            }

            const session = this.sessionStats.get(gameId);
            if (!session.events.has(event)) {
                session.events.set(event, { count: 0, total: 0 });
            }

            const eventStats = session.events.get(event);
            eventStats.count++;
            if (data.value !== undefined) {
                eventStats.total += data.value;
            }
        }

        /**
         * Get statistics
         */
        getStats(gameId, event = null) {
            if (gameId && event) {
                return this.stats.get(`${gameId}:${event}`) || null;
            }

            if (gameId) {
                const gameStats = {};
                this.stats.forEach((stat, key) => {
                    if (key.startsWith(`${gameId}:`)) {
                        gameStats[key.replace(`${gameId}:`, '')] = stat;
                    }
                });
                return gameStats;
            }

            return Object.fromEntries(this.stats);
        }

        /**
         * Get session statistics
         */
        getSessionStats(gameId) {
            const session = this.sessionStats.get(gameId);
            if (!session) return null;

            return {
                playTime: Date.now() - session.startTime,
                events: Object.fromEntries(session.events)
            };
        }

        /**
         * Get aggregated statistics
         */
        getAggregatedStats(gameId) {
            const stats = this.getStats(gameId);
            if (!stats) return null;

            const aggregated = {
                totalEvents: 0,
                totalTime: 0,
                averages: {},
                totals: {}
            };

            Object.entries(stats).forEach(([event, stat]) => {
                aggregated.totalEvents += stat.count;
                if (stat.total > 0) {
                    aggregated.totalTime += stat.total;
                    aggregated.averages[event] = stat.count > 0 ? stat.total / stat.count : 0;
                    aggregated.totals[event] = stat.total;
                }
            });

            return aggregated;
        }

        /**
         * Get recent activity
         */
        getRecentActivity(gameId, limit = 10) {
            const stats = this.getStats(gameId);
            if (!stats) return [];

            const activity = [];
            Object.entries(stats).forEach(([event, stat]) => {
                if (stat.timestamps.length > 0) {
                    activity.push({
                        event,
                        lastOccurrence: stat.timestamps[stat.timestamps.length - 1],
                        recentCount: stat.timestamps.filter(t => Date.now() - t < 3600000).length // Last hour
                    });
                }
            });

            return activity.sort((a, b) => b.lastOccurrence - a.lastOccurrence).slice(0, limit);
        }

        /**
         * Get player behavior summary
         */
        getPlayerSummary() {
            const games = new Set();
            let totalPlayTime = 0;
            let totalEvents = 0;

            this.stats.forEach((stat, key) => {
                const gameId = key.split(':')[0];
                games.add(gameId);
                totalEvents += stat.count;
            });

            this.sessionStats.forEach((session) => {
                totalPlayTime += Date.now() - session.startTime;
            });

            return {
                gamesPlayed: games.size,
                totalPlayTime,
                totalEvents,
                avgPlayTime: totalPlayTime / (this.sessionStats.size || 1)
            };
        }

        /**
         * Reset statistics
         */
        reset(gameId = null) {
            if (gameId) {
                this.stats.forEach((_, key) => {
                    if (key.startsWith(`${gameId}:`)) {
                        this.stats.delete(key);
                    }
                });
                this.sessionStats.delete(gameId);
            } else {
                this.stats.clear();
                this.sessionStats.clear();
            }
            this.save();
        }

        /**
         * Save/Load
         */
        async save() {
            const data = {
                stats: Object.fromEntries(
                    Array.from(this.stats.entries()).map(([key, stat]) => [
                        key,
                        { ...stat, timestamps: stat.timestamps.slice(-20) } // Keep last 20 timestamps
                    ])
                ),
                savedAt: Date.now()
            };

            try {
                localStorage.setItem(this.saveKey, JSON.stringify(data));
            } catch (error) {
                console.error('[StatisticsTracker] Save failed:', error);
            }
        }

        async load() {
            try {
                const data = localStorage.getItem(this.saveKey);
                if (!data) return false;

                const parsed = JSON.parse(data);
                this.stats = new Map(Object.entries(parsed.stats || {}));
                
                return true;
            } catch (error) {
                console.error('[StatisticsTracker] Load failed:', error);
                return false;
            }
        }

        _saveTimeout: null,

        _scheduleSave() {
            if (this._saveTimeout) {
                clearTimeout(this._saveTimeout);
            }
            this._saveTimeout = setTimeout(() => this.save(), 10000);
        }

        /**
         * Event listeners
         */
        on(event, callback) {
            if (!this.listeners.has(event)) {
                this.listeners.set(event, []);
            }
            this.listeners.get(event).push(callback);
        }

        _notify(event, data) {
            const callbacks = this.listeners.get(event);
            if (callbacks) {
                callbacks.forEach(cb => cb(data));
            }
        }
    }

    // ============================================
    // SETTINGS MANAGER
    // ============================================

    class SettingsManager {
        constructor() {
            this.settings = {
                // Audio
                masterVolume: 0.8,
                musicVolume: 0.5,
                sfxVolume: 0.7,
                muted: false,

                // Graphics
                quality: 'high', // low, medium, high, ultra
                fullscreen: false,
                fps: 60,
                postProcessing: true,

                // Gameplay
                difficulty: 'normal', // easy, normal, hard
                hintsEnabled: true,
                autoSave: true,

                // Accessibility
                colorblindMode: false,
                screenReader: false,
                subtitles: true,
                largeText: false,
                highContrast: false,

                // Controls
                keyBindings: this._getDefaultKeyBindings(),
                touchSensitivity: 0.5,
                vibrationEnabled: true
            };

            this.saveKey = 'sgai_settings_v1';
            this.listeners = new Map();
        }

        /**
         * Get default key bindings
         */
        _getDefaultKeyBindings() {
            return {
                'move_left': 'ArrowLeft',
                'move_right': 'ArrowRight',
                'move_up': 'ArrowUp',
                'move_down': 'ArrowDown',
                'action': 'Space',
                'pause': 'Escape',
                'interact': 'KeyE',
                'sprint': 'ShiftLeft'
            };
        }

        /**
         * Initialize settings
         */
        async init() {
            console.log('[SettingsManager] Initializing...');
            await this.load();
            this._applySettings();
            return true;
        }

        /**
         * Get setting value
         */
        get(key, defaultValue = null) {
            if (this.settings.hasOwnProperty(key)) {
                return this.settings[key];
            }
            return defaultValue;
        }

        /**
         * Set setting value
         */
        set(key, value, save = true) {
            if (this.settings.hasOwnProperty(key)) {
                const oldValue = this.settings[key];
                this.settings[key] = value;
                
                this._notify('change', { key, value, oldValue });
                
                if (save) {
                    this.save();
                }

                // Apply specific settings immediately
                this._applySetting(key, value);
                
                return true;
            }
            return false;
        }

        /**
         * Get all settings
         */
        getAll() {
            return { ...this.settings };
        }

        /**
         * Update multiple settings
         */
        updateAll(newSettings, save = true) {
            Object.entries(newSettings).forEach(([key, value]) => {
                if (this.settings.hasOwnProperty(key)) {
                    this.settings[key] = value;
                }
            });

            if (save) {
                this.save();
            }
        }

        /**
         * Apply settings to game
         */
        _applySettings() {
            Object.entries(this.settings).forEach(([key, value]) => {
                this._applySetting(key, value);
            });
        }

        /**
         * Apply individual setting
         */
        _applySetting(key, value) {
            switch (key) {
                case 'masterVolume':
                case 'musicVolume':
                case 'sfxVolume':
                case 'muted':
                    // Apply audio settings if audio system exists
                    if (global.audioDirector) {
                        global.audioDirector.setMasterVolume(this.settings.masterVolume);
                        global.audioDirector.setMusicVolume(this.settings.musicVolume);
                        global.audioDirector.setSFXVolume(this.settings.sfxVolume);
                        global.audioDirector.setMuted(this.settings.muted);
                    }
                    break;
                case 'fullscreen':
                    if (value && document.documentElement.requestFullscreen) {
                        document.documentElement.requestFullscreen();
                    } else if (!value && document.exitFullscreen) {
                        document.exitFullscreen();
                    }
                    break;
                case 'quality':
                    if (global.postProcessing) {
                        global.postProcessing.setQuality(value);
                    }
                    break;
                case 'postProcessing':
                    if (global.postProcessing) {
                        global.postProcessing.enabled = value;
                    }
                    break;
            }
        }

        /**
         * Reset to defaults
         */
        reset() {
            this.settings = {
                masterVolume: 0.8,
                musicVolume: 0.5,
                sfxVolume: 0.7,
                muted: false,
                quality: 'high',
                fullscreen: false,
                fps: 60,
                postProcessing: true,
                difficulty: 'normal',
                hintsEnabled: true,
                autoSave: true,
                colorblindMode: false,
                screenReader: false,
                subtitles: true,
                largeText: false,
                highContrast: false,
                keyBindings: this._getDefaultKeyBindings(),
                touchSensitivity: 0.5,
                vibrationEnabled: true
            };
            this.save();
        }

        /**
         * Get preset settings
         */
        getPreset(preset) {
            const presets = {
                'low': { quality: 'low', postProcessing: false, fps: 30 },
                'medium': { quality: 'medium', postProcessing: true, fps: 60 },
                'high': { quality: 'high', postProcessing: true, fps: 60 },
                'ultra': { quality: 'ultra', postProcessing: true, fps: 120 },
                'accessible': { largeText: true, highContrast: true, subtitles: true, screenReader: true },
                'performance': { quality: 'low', postProcessing: false, fps: 60, autoSave: false }
            };
            return presets[preset] || null;
        }

        /**
         * Apply preset
         */
        applyPreset(preset) {
            const presetSettings = this.getPreset(preset);
            if (presetSettings) {
                this.updateAll(presetSettings);
            }
        }

        /**
         * Export settings
         */
        export() {
            return JSON.stringify(this.settings, null, 2);
        }

        /**
         * Import settings
         */
        import(json) {
            try {
                const imported = JSON.parse(json);
                this.updateAll(imported);
                return true;
            } catch (error) {
                console.error('[SettingsManager] Import failed:', error);
                return false;
            }
        }

        /**
         * Save/Load
         */
        async save() {
            try {
                localStorage.setItem(this.saveKey, JSON.stringify(this.settings));
            } catch (error) {
                console.error('[SettingsManager] Save failed:', error);
            }
        }

        async load() {
            try {
                const data = localStorage.getItem(this.saveKey);
                if (data) {
                    const imported = JSON.parse(data);
                    this.updateAll(imported, false);
                }
                return true;
            } catch (error) {
                console.error('[SettingsManager] Load failed:', error);
                return false;
            }
        }

        /**
         * Event listeners
         */
        on(event, callback) {
            if (!this.listeners.has(event)) {
                this.listeners.set(event, []);
            }
            this.listeners.get(event).push(callback);
        }

        _notify(event, data) {
            const callbacks = this.listeners.get(event);
            if (callbacks) {
                callbacks.forEach(cb => cb(data));
            }
        }
    }

    // ============================================
    // EXPORT
    // ============================================

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            SaveManager,
            StatisticsTracker,
            SettingsManager
        };
    } else {
        global.SaveManager = SaveManager;
        global.StatisticsTracker = StatisticsTracker;
        global.SettingsManager = SettingsManager;
    }

})(typeof window !== 'undefined' ? window : this);

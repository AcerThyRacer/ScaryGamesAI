/**
 * PHASE 9.4: Cross-Platform Save System
 * Cloud save integration with continue on different devices
 * Cross-progression with mobile version
 * Integration with subscription-system.js premium features
 */

const CrossPlatformSave = (function() {
    'use strict';

    // Configuration
    const config = {
        apiBase: '/api',
        syncInterval: 30000, // 30 seconds
        autoSave: true,
        autoSaveInterval: 60000, // 1 minute
        compressionEnabled: true,
        encryptionEnabled: true,
        maxSaveSlots: 10,
        premiumFeatures: {
            cloudSaves: true,
            crossPlatform: true,
            autoSync: true,
            versionHistory: true
        }
    };

    // State
    let currentSave = null;
    let saveSlots = [];
    let lastSyncTime = null;
    let isSyncing = false;
    let deviceId = null;
    let userId = null;
    let subscriptionTier = null;

    // Save schema
    const SAVE_VERSION = '1.0.0';
    const SAVE_SCHEMA = {
        version: String,
        timestamp: Number,
        deviceId: String,
        userId: String,
        gameData: Object,
        metadata: Object,
        checksum: String
    };

    /**
     * Initialize cross-platform save system
     */
    async function init() {
        console.log('[CrossSave] Initializing...');

        // Generate device ID if not exists
        deviceId = localStorage.getItem('scarygames-device-id');
        if (!deviceId) {
            deviceId = generateDeviceId();
            localStorage.setItem('scarygames-device-id', deviceId);
        }

        // Get user ID from subscription system
        await loadUserData();

        // Load save slots
        await loadSaveSlots();

        // Start auto-sync
        if (config.autoSave) {
            startAutoSave();
        }

        // Listen for visibility changes (tab switch)
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Listen for storage events (cross-tab sync)
        window.addEventListener('storage', handleStorageEvent);

        console.log('[CrossSave] Initialized', { deviceId, userId, subscriptionTier });
        return true;
    }

    /**
     * Load user data from subscription system
     */
    async function loadUserData() {
        try {
            // Try to get from subscription system
            if (window.subscriptionSystem) {
                userId = subscriptionSystem.userToken;
                subscriptionTier = subscriptionSystem.currentTier;
            } else {
                // Fallback to localStorage
                userId = localStorage.getItem('scarygames-user-id') || 'guest-' + deviceId;
                subscriptionTier = localStorage.getItem('scarygames-tier') || 'free';
            }

            // Check premium features
            const isPremium = ['premium', 'elder', 'hunter'].includes(subscriptionTier);
            config.premiumFeatures.cloudSaves = isPremium;
            config.premiumFeatures.crossPlatform = isPremium;

        } catch (error) {
            console.error('[CrossSave] Failed to load user data:', error);
            userId = 'guest-' + deviceId;
            subscriptionTier = 'free';
        }
    }

    /**
     * Generate unique device ID
     */
    function generateDeviceId() {
        const browser = navigator.userAgent;
        const platform = navigator.platform;
        const random = Math.random().toString(36).substring(2, 15);
        const timestamp = Date.now().toString(36);
        
        // Create hash
        const data = `${browser}-${platform}-${random}-${timestamp}`;
        return btoa(data).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
    }

    /**
     * Load save slots from storage
     */
    async function loadSaveSlots() {
        try {
            // Try cloud first (if premium)
            if (config.premiumFeatures.cloudSaves && userId) {
                const cloudSlots = await fetchCloudSlots();
                if (cloudSlots && cloudSlots.length > 0) {
                    saveSlots = cloudSlots;
                    localStorage.setItem('scarygames-slots', JSON.stringify(saveSlots));
                    return saveSlots;
                }
            }

            // Fallback to local storage
            const localSlots = localStorage.getItem('scarygames-slots');
            if (localSlots) {
                saveSlots = JSON.parse(localSlots);
            } else {
                saveSlots = [];
            }

            return saveSlots;
        } catch (error) {
            console.error('[CrossSave] Failed to load slots:', error);
            saveSlots = [];
            return [];
        }
    }

    /**
     * Fetch cloud save slots
     */
    async function fetchCloudSlots() {
        try {
            const response = await fetch(`${config.apiBase}/saves/slots`, {
                headers: {
                    'Authorization': `Bearer ${userId}`,
                    'X-Device-ID': deviceId
                }
            });

            if (!response.ok) {
                throw new Error('Cloud sync failed');
            }

            const data = await response.json();
            return data.slots || [];
        } catch (error) {
            console.warn('[CrossSave] Cloud fetch failed, using local:', error);
            return null;
        }
    }

    /**
     * Create new save
     */
    async function createSave(gameData, slotIndex = 0, metadata = {}) {
        const saveData = {
            version: SAVE_VERSION,
            timestamp: Date.now(),
            deviceId: deviceId,
            userId: userId,
            gameData: compressGameData(gameData),
            metadata: {
                ...metadata,
                platform: getPlatformInfo(),
                gameVersion: getGameVersion(),
                playtime: metadata.playtime || 0,
                difficulty: metadata.difficulty || 'standard',
                level: metadata.level || 1
            },
            checksum: null
        };

        // Generate checksum
        saveData.checksum = generateChecksum(saveData);

        // Save to slot
        saveSlots[slotIndex] = saveData;
        currentSave = saveData;

        // Save locally
        await saveToLocal(slotIndex);

        // Sync to cloud (if premium)
        if (config.premiumFeatures.cloudSaves) {
            await syncToCloud(slotIndex);
        }

        console.log('[CrossSave] Save created in slot', slotIndex);
        return saveData;
    }

    /**
     * Load save from slot
     */
    async function loadSave(slotIndex = 0) {
        try {
            // Try cloud first (if premium and cross-platform enabled)
            if (config.premiumFeatures.crossPlatform && userId) {
                const cloudSave = await fetchCloudSave(slotIndex);
                if (cloudSave && validateSave(cloudSave)) {
                    currentSave = cloudSave;
                    return decompressGameData(cloudSave.gameData);
                }
            }

            // Fallback to local
            const localData = localStorage.getItem(`scarygames-save-${slotIndex}`);
            if (localData) {
                const saveData = JSON.parse(localData);
                if (validateSave(saveData)) {
                    currentSave = saveData;
                    return decompressGameData(saveData.gameData);
                }
            }

            return null;
        } catch (error) {
            console.error('[CrossSave] Failed to load save:', error);
            return null;
        }
    }

    /**
     * Fetch cloud save
     */
    async function fetchCloudSave(slotIndex) {
        try {
            const response = await fetch(`${config.apiBase}/saves/load/${slotIndex}`, {
                headers: {
                    'Authorization': `Bearer ${userId}`,
                    'X-Device-ID': deviceId
                }
            });

            if (!response.ok) {
                throw new Error('Cloud fetch failed');
            }

            const data = await response.json();
            return data.save || null;
        } catch (error) {
            console.warn('[CrossSave] Cloud fetch failed:', error);
            return null;
        }
    }

    /**
     * Save to local storage
     */
    async function saveToLocal(slotIndex) {
        try {
            const saveData = saveSlots[slotIndex];
            if (!saveData) return;

            localStorage.setItem(`scarygames-save-${slotIndex}`, JSON.stringify(saveData));
            localStorage.setItem('scarygames-slots', JSON.stringify(saveSlots));
            
            console.log('[CrossSave] Saved locally');
        } catch (error) {
            console.error('[CrossSave] Local save failed:', error);
        }
    }

/**
 * Sync to cloud with optimistic locking to prevent race conditions
 */
async function syncToCloud(slotIndex) {
	if (isSyncing) return;

	try {
		isSyncing = true;

		const saveData = saveSlots[slotIndex];
		if (!saveData) return;

		// Get current cloud version for optimistic locking
		const cloudSave = await fetchCloudSave(slotIndex);
		const cloudVersion = cloudSave?.version || 0;
		const cloudHash = cloudSave?.checksum || null;

		// Check if local version is compatible
		if (saveData.version <= cloudVersion && cloudHash !== null) {
			// Cloud is newer or equal - check timestamps
			if (saveData.timestamp < (cloudSave?.timestamp || 0)) {
				console.warn('[CrossSave] Cloud version is newer, skipping local save');
				return;
			}
		}

		// Increment version for optimistic locking
		saveData.version = Math.max(saveData.version, cloudVersion + 1);
		saveData.previousVersionHash = cloudHash;

		// Recalculate checksum with new version
		saveData.checksum = generateChecksum(saveData);

		const response = await fetch(`${config.apiBase}/saves/save/${slotIndex}`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${userId}`,
				'X-Device-ID': deviceId,
				'If-Version-Matches': cloudVersion.toString() // Optimistic lock header
			},
			body: JSON.stringify({
				save: saveData,
				previousVersion: cloudVersion,
				previousHash: cloudHash
			})
		});

		if (!response.ok) {
			const error = await response.json().catch(() => ({}));
			if (response.status === 409 || error.code === 'SAVE_CONFLICT') {
				// Conflict detected - another save occurred
				console.warn('[CrossSave] Save conflict detected');
				await handleSaveConflict(slotIndex);
				return;
			}
			throw new Error('Cloud save failed');
		}

		lastSyncTime = Date.now();
		console.log('[CrossSave] Synced to cloud v' + saveData.version);
	} catch (error) {
		console.error('[CrossSave] Cloud sync error:', error);
		throw error;
	} finally {
		isSyncing = false;
	}
}

/**
 * Handle save conflict by fetching latest and resolving
 */
async function handleSaveConflict(slotIndex) {
	try {
		const cloudSave = await fetchCloudSave(slotIndex);
		if (!cloudSave) return;

		const localSave = saveSlots[slotIndex];
		if (!localSave) return;

		// Conflict resolution: use most recent timestamp
		if (cloudSave.timestamp > localSave.timestamp) {
			// Cloud is newer - update local
			saveSlots[slotIndex] = cloudSave;
			currentSave = cloudSave;
			console.log('[CrossSave] Resolved conflict: using cloud version');
		} else {
			// Local is newer - retry save with incremented version
			localSave.version = cloudSave.version + 1;
			localSave.checksum = generateChecksum(localSave);
			await syncToCloud(slotIndex);
			console.log('[CrossSave] Resolved conflict: saved local version');
		}
	} catch (error) {
		console.error('[CrossSave] Conflict resolution failed:', error);
	}
}

    /**
     * Compress game data
     */
    function compressGameData(gameData) {
        if (!config.compressionEnabled) {
            return gameData;
        }

        try {
            // Simple compression - remove redundant data
            const compressed = {
                p: gameData.playerPos,
                y: gameData.yaw,
                pi: gameData.pitch,
                c: gameData.collected,
                t: gameData.total,
                d: gameData.difficulty,
                l: gameData.level,
                s: gameData.stats,
                i: gameData.inventory,
                q: gameData.quests,
                a: gameData.achievements
            };

            return compressed;
        } catch (error) {
            console.error('[CrossSave] Compression failed:', error);
            return gameData;
        }
    }

    /**
     * Decompress game data
     */
    function decompressGameData(compressedData) {
        if (!compressedData || !compressedData.p) {
            return compressedData;
        }

        try {
            const gameData = {
                playerPos: compressedData.p,
                yaw: compressedData.y,
                pitch: compressedData.pi,
                collectedPellets: compressedData.c,
                totalPellets: compressedData.t,
                difficulty: compressedData.d,
                level: compressedData.l,
                stats: compressedData.s,
                inventory: compressedData.i,
                quests: compressedData.q,
                achievements: compressedData.a
            };

            return gameData;
        } catch (error) {
            console.error('[CrossSave] Decompression failed:', error);
            return null;
        }
    }

    /**
     * Generate checksum for save validation
     */
    function generateChecksum(saveData) {
        const data = JSON.stringify({
            version: saveData.version,
            timestamp: saveData.timestamp,
            gameData: saveData.gameData
        });

        // Simple hash (can be enhanced with crypto.subtle)
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
            const char = data.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }

        return hash.toString(36);
    }

    /**
     * Validate save data
     */
    function validateSave(saveData) {
        if (!saveData || !saveData.version) return false;

        // Check version compatibility
        const saveVersion = saveData.version.split('.').map(Number);
        const currentVersion = SAVE_VERSION.split('.').map(Number);

        if (saveVersion[0] > currentVersion[0]) {
            console.warn('[CrossSave] Save version newer than current');
            return false;
        }

        // Validate checksum
        const expectedChecksum = generateChecksum(saveData);
        if (saveData.checksum !== expectedChecksum) {
            console.warn('[CrossSave] Checksum validation failed');
            return false;
        }

        return true;
    }

    /**
     * Get platform info
     */
    function getPlatformInfo() {
        return {
            platform: navigator.platform,
            userAgent: navigator.userAgent,
            language: navigator.language,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            screen: {
                width: screen.width,
                height: screen.height,
                colorDepth: screen.colorDepth
            },
            connection: navigator.connection ? {
                effectiveType: navigator.connection.effectiveType,
                downlink: navigator.connection.downlink
            } : null
        };
    }

    /**
     * Get game version
     */
    function getGameVersion() {
        return '9.0.0'; // Phase 9 version
    }

    /**
     * Start auto-save
     */
    function startAutoSave() {
        setInterval(() => {
            if (currentSave && config.autoSave) {
                // Find current slot index
                const slotIndex = saveSlots.indexOf(currentSave);
                if (slotIndex >= 0) {
                    saveToLocal(slotIndex);
                    
                    if (config.premiumFeatures.autoSync) {
                        syncToCloud(slotIndex);
                    }
                }
            }
        }, config.autoSaveInterval);
    }

    /**
     * Handle visibility change (tab switch)
     */
    function handleVisibilityChange() {
        if (document.visibilityState === 'hidden') {
            // Save when tab is hidden
            if (currentSave) {
                const slotIndex = saveSlots.indexOf(currentSave);
                if (slotIndex >= 0) {
                    saveToLocal(slotIndex);
                }
            }
        } else if (document.visibilityState === 'visible') {
            // Sync when tab becomes visible
            if (config.premiumFeatures.crossPlatform) {
                loadSaveSlots();
            }
        }
    }

    /**
     * Handle storage events (cross-tab sync)
     */
    function handleStorageEvent(event) {
        if (event.key.startsWith('scarygames-save-')) {
            console.log('[CrossSave] Save updated in another tab');
            // Could trigger refresh here
        }
    }

    /**
     * Get save history (premium feature)
     */
    async function getSaveHistory(slotIndex) {
        if (!config.premiumFeatures.versionHistory) {
            throw new Error('Version history requires premium subscription');
        }

        try {
            const response = await fetch(`${config.apiBase}/saves/history/${slotIndex}`, {
                headers: {
                    'Authorization': `Bearer ${userId}`,
                    'X-Device-ID': deviceId
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch history');
            }

            const data = await response.json();
            return data.history || [];
        } catch (error) {
            console.error('[CrossSave] History fetch failed:', error);
            return [];
        }
    }

    /**
     * Restore from save history
     */
    async function restoreFromHistory(slotIndex, timestamp) {
        if (!config.premiumFeatures.versionHistory) {
            throw new Error('Version history requires premium subscription');
        }

        try {
            const response = await fetch(`${config.apiBase}/saves/restore/${slotIndex}/${timestamp}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${userId}`,
                    'X-Device-ID': deviceId
                }
            });

            if (!response.ok) {
                throw new Error('Failed to restore');
            }

            const data = await response.json();
            await loadSaveSlots();
            return data.save;
        } catch (error) {
            console.error('[CrossSave] Restore failed:', error);
            return null;
        }
    }

    /**
     * Delete save
     */
    async function deleteSave(slotIndex) {
        try {
            // Delete from cloud
            if (config.premiumFeatures.cloudSaves) {
                await fetch(`${config.apiBase}/saves/delete/${slotIndex}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${userId}`,
                        'X-Device-ID': deviceId
                    }
                });
            }

            // Delete locally
            localStorage.removeItem(`scarygames-save-${slotIndex}`);
            saveSlots.splice(slotIndex, 1);
            localStorage.setItem('scarygames-slots', JSON.stringify(saveSlots));

            console.log('[CrossSave] Save deleted');
            return true;
        } catch (error) {
            console.error('[CrossSave] Delete failed:', error);
            return false;
        }
    }

    /**
     * Export save for sharing
     */
    function exportSave(slotIndex = 0) {
        const saveData = saveSlots[slotIndex];
        if (!saveData) return null;

        // Create export code (base64 encoded)
        const exportData = {
            v: saveData.version,
            d: saveData.gameData,
            m: saveData.metadata
        };

        const jsonString = JSON.stringify(exportData);
        const exportCode = btoa(jsonString);

        return {
            code: exportCode,
            timestamp: saveData.timestamp,
            metadata: saveData.metadata
        };
    }

    /**
     * Import save from code
     */
    async function importSave(exportCode, slotIndex = saveSlots.length) {
        try {
            const jsonString = atob(exportCode);
            const exportData = JSON.parse(jsonString);

            const saveData = {
                version: exportData.v || SAVE_VERSION,
                timestamp: Date.now(),
                deviceId: deviceId,
                userId: userId,
                gameData: exportData.d,
                metadata: {
                    ...exportData.m,
                    imported: true,
                    importDate: Date.now()
                },
                checksum: null
            };

            saveData.checksum = generateChecksum(saveData);

            saveSlots[slotIndex] = saveData;
            await saveToLocal(slotIndex);

            if (config.premiumFeatures.cloudSaves) {
                await syncToCloud(slotIndex);
            }

            console.log('[CrossSave] Save imported');
            return saveData;
        } catch (error) {
            console.error('[CrossSave] Import failed:', error);
            return null;
        }
    }

    /**
     * Get sync status
     */
    function getSyncStatus() {
        return {
            isSyncing,
            lastSyncTime,
            hasCloudSaves: config.premiumFeatures.cloudSaves,
            crossPlatformEnabled: config.premiumFeatures.crossPlatform,
            deviceId,
            userId,
            subscriptionTier
        };
    }

    // Public API
    return {
        init,
        createSave,
        loadSave,
        deleteSave,
        exportSave,
        importSave,
        getSaveHistory,
        restoreFromHistory,
        getSyncStatus,
        loadSaveSlots,
        syncToCloud: () => syncToCloud(saveSlots.indexOf(currentSave)),
        config,
        setConfig: (newConfig) => Object.assign(config, newConfig)
    };
})();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CrossPlatformSave;
}

/**
 * Save/Load System for The Abyss
 * Phase 1: Foundation & Player Experience
 * 
 * Features:
 * - Multi-slot save system (3 slots + autosave)
 * - Save game state encryption
 * - Cloud save sync option
 * - Save thumbnails
 * - Statistics tracking
 */

export class SaveSystem {
    constructor() {
        this.saveSlots = 3;
        this.autoSaveSlot = 'autosave';
        this.saveVersion = '1.0';
        this.compressionEnabled = true;
        
        // Save metadata
        this.saves = {};
        
        // Encryption key (in production, use proper key management)
        this.encryptionKey = 'abyss_save_key_v1';
    }
    
    /**
     * Initialize save system
     */
    async initialize() {
        console.log('💾 Initializing save system...');
        
        // Load existing saves from localStorage
        await this.loadAllSaves();
        
        // Check for cloud saves if enabled
        if (localStorage.getItem('cloudSyncEnabled') === 'true') {
            await this.syncCloudSaves();
        }
        
        console.log('✓ Save system initialized');
    }
    
    /**
     * Create save data object
     */
    createSaveData(gameState) {
        const timestamp = Date.now();
        
        return {
            version: this.saveVersion,
            timestamp: timestamp,
            playtime: gameState.playtime || 0,
            
            // Player state
            player: {
                position: { ...gameState.player.position },
                rotation: { ...gameState.player.rotation },
                health: gameState.player.health,
                oxygen: gameState.player.oxygen,
                flares: gameState.player.flares,
                upgrades: gameState.player.upgrades || {}
            },
            
            // World state
            world: {
                collectedArtifacts: gameState.collectedArtifacts || [],
                foundLogs: gameState.foundLogs || [],
                destroyedFlares: gameState.destroyedFlares || [],
                openedDoors: gameState.openedDoors || [],
                creatureStates: gameState.creatureStates || {},
                currentDepth: gameState.currentDepth || 0,
                biome: gameState.biome || 'shallows'
            },
            
            // Statistics
            statistics: {
                totalTimePlayed: gameState.statistics?.totalTimePlayed || 0,
                totalDistance: gameState.statistics?.totalDistance || 0,
                totalDeaths: gameState.statistics?.totalDeaths || 0,
                bestTime: gameState.statistics?.bestTime || null,
                deepestDive: gameState.statistics?.deepestDive || 0,
                artifactsCollected: gameState.statistics?.artifactsCollected || 0,
                logsFound: gameState.statistics?.logsFound || 0
            },
            
            // Settings
            settings: {
                graphics: gameState.settings?.graphics || 'medium',
                audio: gameState.settings?.audio || {},
                controls: gameState.settings?.controls || {}
            },
            
            // Metadata
            metadata: {
                saveName: `Save ${new Date(timestamp).toLocaleString()}`,
                location: this.getLocationName(gameState),
                depth: gameState.currentDepth || 0,
                screenshot: null // Will be filled by captureScreenshot()
            }
        };
    }
    
    /**
     * Save to slot
     */
    async saveToSlot(slotIndex, gameState, isAutoSave = false) {
        try {
            const slotName = isAutoSave ? this.autoSaveSlot : `save_${slotIndex}`;
            const saveData = this.createSaveData(gameState);
            
            // Capture screenshot thumbnail
            saveData.metadata.screenshot = await this.captureScreenshot();
            
            // Compress and encrypt
            const encrypted = await this.encryptSaveData(saveData);
            
            // Save to localStorage
            localStorage.setItem(slotName, encrypted);
            
            // Update metadata cache
            this.saves[slotName] = {
                slot: slotName,
                timestamp: saveData.timestamp,
                playtime: saveData.playtime,
                metadata: saveData.metadata,
                isAutoSave: isAutoSave
            };
            
            // Sync to cloud if enabled
            if (localStorage.getItem('cloudSyncEnabled') === 'true') {
                await this.uploadSaveToCloud(slotName, encrypted);
            }
            
            console.log(`💾 Saved to ${slotName}`);
            return { success: true, slot: slotName };
            
        } catch (error) {
            console.error('❌ Save failed:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Load from slot
     */
    async loadFromSlot(slotIndex) {
        try {
            const slotName = slotIndex === 'auto' ? this.autoSaveSlot : `save_${slotIndex}`;
            const encrypted = localStorage.getItem(slotName);
            
            if (!encrypted) {
                throw new Error('Save not found');
            }
            
            // Decrypt and decompress
            const saveData = await this.decryptSaveData(encrypted);
            
            // Validate save version
            if (!this.validateSaveVersion(saveData)) {
                throw new Error('Incompatible save version');
            }
            
            console.log(`💾 Loaded from ${slotName}`);
            return { success: true, data: saveData };
            
        } catch (error) {
            console.error('❌ Load failed:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Delete save slot
     */
    deleteSave(slotIndex) {
        const slotName = slotIndex === 'auto' ? this.autoSaveSlot : `save_${slotIndex}`;
        localStorage.removeItem(slotName);
        delete this.saves[slotName];
        console.log(`🗑️ Deleted save ${slotName}`);
    }
    
    /**
     * Get all save slots info
     */
    getAllSaveSlots() {
        const slots = [];
        
        for (let i = 1; i <= this.saveSlots; i++) {
            const slotName = `save_${i}`;
            const saveInfo = this.saves[slotName];
            
            slots.push({
                slot: i,
                exists: !!saveInfo,
                timestamp: saveInfo?.timestamp || null,
                playtime: saveInfo?.playtime || 0,
                metadata: saveInfo?.metadata || null,
                isAutoSave: false
            });
        }
        
        // Add autosave slot
        const autoSaveInfo = this.saves[this.autoSaveSlot];
        slots.push({
            slot: 'auto',
            exists: !!autoSaveInfo,
            timestamp: autoSaveInfo?.timestamp || null,
            playtime: autoSaveInfo?.playtime || 0,
            metadata: autoSaveInfo?.metadata || null,
            isAutoSave: true
        });
        
        return slots;
    }
    
    /**
     * Encrypt save data
     */
    async encryptSaveData(saveData) {
        const data = JSON.stringify(saveData);
        
        // Simple base64 encoding + checksum (in production, use Web Crypto API)
        const encoded = btoa(data);
        const checksum = this.calculateChecksum(data);
        
        return JSON.stringify({
            data: encoded,
            checksum: checksum,
            version: this.saveVersion
        });
    }
    
    /**
     * Decrypt save data
     */
    async decryptSaveData(encrypted) {
        const wrapper = JSON.parse(encrypted);
        
        // Verify checksum
        const decoded = atob(wrapper.data);
        const checksum = this.calculateChecksum(decoded);
        
        if (checksum !== wrapper.checksum) {
            throw new Error('Save file corrupted');
        }
        
        return JSON.parse(decoded);
    }
    
    /**
     * Calculate checksum for data integrity
     */
    calculateChecksum(data) {
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
            const char = data.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString(36);
    }
    
    /**
     * Capture screenshot thumbnail
     */
    async captureScreenshot() {
        const canvas = document.querySelector('canvas');
        if (!canvas) return null;
        
        try {
            // Create thumbnail (smaller size)
            const thumbnailCanvas = document.createElement('canvas');
            thumbnailCanvas.width = 320;
            thumbnailCanvas.height = 180;
            const ctx = thumbnailCanvas.getContext('2d');
            
            // Draw scaled screenshot
            ctx.drawImage(canvas, 0, 0, 320, 180);
            
            // Return as base64 JPEG
            return thumbnailCanvas.toDataURL('image/jpeg', 0.7);
            
        } catch (error) {
            console.warn('⚠️ Screenshot capture failed:', error);
            return null;
        }
    }
    
    /**
     * Get location name based on depth/biome
     */
    getLocationName(gameState) {
        const depth = gameState.currentDepth || 0;
        
        if (depth < 20) return 'The Shallows';
        if (depth < 50) return 'Twilight Zone';
        if (depth < 100) return 'Midnight Zone';
        return 'The Abyss';
    }
    
    /**
     * Validate save version compatibility
     */
    validateSaveVersion(saveData) {
        const majorVersion = parseInt(saveData.version.split('.')[0]);
        const currentMajor = parseInt(this.saveVersion.split('.')[0]);
        
        // Allow loading if major versions match
        return majorVersion === currentMajor;
    }
    
    /**
     * Load all saves metadata
     */
    async loadAllSaves() {
        for (let i = 1; i <= this.saveSlots; i++) {
            const slotName = `save_${i}`;
            const encrypted = localStorage.getItem(slotName);
            
            if (encrypted) {
                try {
                    const saveData = await this.decryptSaveData(encrypted);
                    this.saves[slotName] = {
                        slot: slotName,
                        timestamp: saveData.timestamp,
                        playtime: saveData.playtime,
                        metadata: saveData.metadata,
                        isAutoSave: false
                    };
                } catch (error) {
                    console.warn(`⚠️ Failed to load save ${slotName}:`, error);
                }
            }
        }
        
        // Load autosave
        const autoEncrypted = localStorage.getItem(this.autoSaveSlot);
        if (autoEncrypted) {
            try {
                const saveData = await this.decryptSaveData(autoEncrypted);
                this.saves[this.autoSaveSlot] = {
                    slot: this.autoSaveSlot,
                    timestamp: saveData.timestamp,
                    playtime: saveData.playtime,
                    metadata: saveData.metadata,
                    isAutoSave: true
                };
            } catch (error) {
                console.warn('⚠️ Failed to load autosave:', error);
            }
        }
    }
    
    /**
     * Upload save to cloud storage
     */
    async uploadSaveToCloud(slotName, encryptedData) {
        // Placeholder for cloud sync implementation
        // Would integrate with backend API
        console.log('☁️ Uploading save to cloud:', slotName);
        
        try {
            // Example API call
            /*
            const response = await fetch('/api/save/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    slot: slotName,
                    data: encryptedData,
                    timestamp: Date.now()
                })
            });
            */
        } catch (error) {
            console.warn('⚠️ Cloud sync failed:', error);
        }
    }
    
    /**
     * Download saves from cloud
     */
    async syncCloudSaves() {
        // Placeholder for cloud sync implementation
        console.log('☁️ Syncing with cloud...');
        
        try {
            // Example API call
            /*
            const response = await fetch('/api/save/list');
            const cloudSaves = await response.json();
            
            // Compare timestamps and merge
            for (const cloudSave of cloudSaves) {
                const localSave = this.saves[cloudSave.slot];
                
                if (!localSave || cloudSave.timestamp > localSave.timestamp) {
                    // Download newer cloud save
                    await this.downloadSaveFromCloud(cloudSave.slot);
                }
            }
            */
        } catch (error) {
            console.warn('⚠️ Cloud sync failed:', error);
        }
    }
    
    /**
     * Export save to file
     */
    exportSave(slotIndex) {
        const slotName = slotIndex === 'auto' ? this.autoSaveSlot : `save_${slotIndex}`;
        const encrypted = localStorage.getItem(slotName);
        
        if (!encrypted) {
            throw new Error('Save not found');
        }
        
        // Create download blob
        const blob = new Blob([encrypted], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        // Trigger download
        const a = document.createElement('a');
        a.href = url;
        a.download = `abyss_save_${slotName}_${Date.now()}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
    }
    
    /**
     * Import save from file
     */
    async importSave(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = async (e) => {
                try {
                    const encrypted = e.target.result;
                    
                    // Validate and decrypt to test
                    const saveData = await this.decryptSaveData(encrypted);
                    
                    // Save to first empty slot or overwrite oldest
                    let targetSlot = 1;
                    for (let i = 1; i <= this.saveSlots; i++) {
                        if (!this.saves[`save_${i}`]) {
                            targetSlot = i;
                            break;
                        }
                    }
                    
                    const slotName = `save_${targetSlot}`;
                    localStorage.setItem(slotName, encrypted);
                    
                    resolve({ success: true, slot: targetSlot });
                    
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }
}

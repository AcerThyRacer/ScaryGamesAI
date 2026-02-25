/* ============================================================
   HELLAPHOBIA - PHASE 9: MODDING & CUSTOMIZATION
   Level Editor | Mod API | Asset Import | Community Hub
   ============================================================ */

(function() {
    'use strict';

    // ===== PHASE 9: MODDING CONFIGURATION =====
    const MODDING_CONFIG = {
        MAX_MOD_SIZE: 50 * 1024 * 1024, // 50MB
        SUPPORTED_FORMATS: {
            images: ['png', 'jpg', 'jpeg', 'gif', 'webp'],
            audio: ['mp3', 'wav', 'ogg', 'webm'],
            data: ['json'],
            levels: ['json']
        },
        MOD_API_VERSION: '1.0.0',
        SANDBOX_ENABLED: true
    };

    // ===== PHASE 9: MOD LOADER =====
    const ModLoader = {
        loadedMods: [],
        activeMods: [],
        modDirectory: 'mods',
        sandbox: null,

        init() {
            this.loadModList();
            this.setupSandbox();
            console.log('Phase 9: Mod Loader initialized');
        },

        // Setup sandboxed environment for mods
        setupSandbox() {
            this.sandbox = {
                console: {
                    log: (...args) => console.log('[Mod]', ...args),
                    warn: (...args) => console.warn('[Mod]', ...args),
                    error: (...args) => console.error('[Mod]', ...args)
                },
                Math: Math,
                Date: Date,
                Object: Object,
                Array: Array,
                String: String,
                Number: Number,
                Boolean: Boolean,
                JSON: JSON,
                setTimeout: setTimeout,
                setInterval: setInterval,
                clearTimeout: clearTimeout,
                clearInterval: clearInterval,
                // Game API (safe methods only)
                GameAPI: this.createGameAPI()
            };
        },

        // Create safe game API for mods
        createGameAPI() {
            return {
                // Level manipulation
                createRoom: (config) => this.createModRoom(config),
                placeEntity: (type, x, y, props) => this.placeModEntity(type, x, y, props),
                setEnvironment: (props) => this.setModEnvironment(props),

                // Entity creation
                createMonster: (config) => this.createModMonster(config),
                createNPC: (config) => this.createModNPC(config),
                createItem: (config) => this.createModItem(config),

                // Events
                onEvent: (event, callback) => this.registerModEvent(event, callback),
                triggerEvent: (event, data) => this.triggerModEvent(event, data),

                // UI
                showNotification: (title, message, type) => this.showModNotification(title, message, type),
                createUIElement: (config) => this.createModUIElement(config),

                // Storage
                saveData: (key, value) => this.saveModData(key, value),
                loadData: (key) => this.loadModData(key),

                // Utilities
                random: (min, max) => Math.random() * (max - min) + min,
                distance: (x1, y1, x2, y2) => Math.sqrt((x2-x1)**2 + (y2-y1)**2)
            };
        },

        // Load mod list from storage
        loadModList() {
            const saved = localStorage.getItem('hellaphobia_mods');
            if (saved) {
                this.loadedMods = JSON.parse(saved);
            }
        },

        // Save mod list
        saveModList() {
            localStorage.setItem('hellaphobia_mods', JSON.stringify(this.loadedMods));
        },

        // Install mod from file
        async installMod(file) {
            try {
                // Validate file size
                if (file.size > MODDING_CONFIG.MAX_MOD_SIZE) {
                    throw new Error('Mod file too large (max 50MB)');
                }

                // Read mod file
                const content = await this.readModFile(file);
                
                // Validate mod structure
                const modData = this.validateMod(content);
                
                // Add to loaded mods
                this.loadedMods.push({
                    id: modData.id,
                    name: modData.name,
                    version: modData.version,
                    author: modData.author,
                    description: modData.description,
                    enabled: true,
                    installedAt: Date.now(),
                    data: modData
                });

                this.saveModList();
                EventTracker.track('mod_installed', { modId: modData.id });

                console.log(`[ModLoader] Installed: ${modData.name} v${modData.version}`);
                return { success: true, mod: modData };
            } catch (error) {
                console.error('[ModLoader] Installation failed:', error);
                return { success: false, error: error.message };
            }
        },

        // Read and parse mod file
        async readModFile(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const content = JSON.parse(e.target.result);
                        resolve(content);
                    } catch (error) {
                        reject(new Error('Invalid mod file format'));
                    }
                };
                reader.onerror = () => reject(new Error('Failed to read file'));
                reader.readAsText(file);
            });
        },

        // Validate mod structure
        validateMod(modData) {
            const required = ['id', 'name', 'version', 'author'];
            for (const field of required) {
                if (!modData[field]) {
                    throw new Error(`Missing required field: ${field}`);
                }
            }

            // Validate ID format
            if (!/^[a-z0-9_-]+$/.test(modData.id)) {
                throw new Error('Invalid mod ID (use lowercase, numbers, underscores, hyphens)');
            }

            return modData;
        },

        // Enable/disable mod
        toggleMod(modId, enabled) {
            const mod = this.loadedMods.find(m => m.id === modId);
            if (mod) {
                mod.enabled = enabled;
                this.saveModList();

                if (enabled) {
                    this.activeMods.push(modId);
                    this.activateMod(mod);
                } else {
                    this.activeMods = this.activeMods.filter(id => id !== modId);
                    this.deactivateMod(mod);
                }

                EventTracker.track('mod_toggled', { modId, enabled });
            }
        },

        // Activate mod
        activateMod(mod) {
            console.log(`[ModLoader] Activating: ${mod.name}`);
            
            // Execute mod initialization if present
            if (mod.data.init) {
                try {
                    const initFn = new Function('GameAPI', mod.data.init);
                    initFn.call(this.sandbox, this.sandbox.GameAPI);
                } catch (error) {
                    console.error(`[ModLoader] Init error in ${mod.name}:`, error);
                }
            }
        },

        // Deactivate mod
        deactivateMod(mod) {
            console.log(`[ModLoader] Deactivating: ${mod.name}`);
            
            // Execute mod cleanup if present
            if (mod.data.cleanup) {
                try {
                    const cleanupFn = new Function('GameAPI', mod.data.cleanup);
                    cleanupFn.call(this.sandbox, this.sandbox.GameAPI);
                } catch (error) {
                    console.error(`[ModLoader] Cleanup error in ${mod.name}:`, error);
                }
            }
        },

        // Uninstall mod
        uninstallMod(modId) {
            const index = this.loadedMods.findIndex(m => m.id === modId);
            if (index !== -1) {
                const mod = this.loadedMods[index];
                this.deactivateMod(mod);
                this.loadedMods.splice(index, 1);
                this.saveModList();

                EventTracker.track('mod_uninstalled', { modId });
                console.log(`[ModLoader] Uninstalled: ${mod.name}`);
            }
        },

        // Get list of loaded mods
        getModList() {
            return this.loadedMods.map(m => ({
                id: m.id,
                name: m.name,
                version: m.version,
                author: m.author,
                enabled: m.enabled,
                installedAt: m.installedAt
            }));
        },

        // Create mod room (for level mods)
        createModRoom(config) {
            console.log('[ModAPI] Creating room:', config);
            // Integration with Phase 2 procedural generation
            if (typeof Phase2Core !== 'undefined' && Phase2Core.addModRoom) {
                Phase2Core.addModRoom(config);
            }
        },

        // Place mod entity
        placeModEntity(type, x, y, props) {
            console.log('[ModAPI] Placing entity:', type, x, y);
        },

        // Set mod environment
        setModEnvironment(props) {
            console.log('[ModAPI] Setting environment:', props);
        },

        // Create mod monster
        createModMonster(config) {
            console.log('[ModAPI] Creating monster:', config.name);
            // Integration with Phase 3 AI
            if (typeof Phase3Core !== 'undefined' && Phase3Core.addModMonster) {
                Phase3Core.addModMonster(config);
            }
        },

        // Create mod NPC
        createModNPC(config) {
            console.log('[ModAPI] Creating NPC:', config.name);
        },

        // Create mod item
        createModItem(config) {
            console.log('[ModAPI] Creating item:', config.name);
        },

        // Register mod event handler
        registerModEvent(event, callback) {
            console.log('[ModAPI] Registering event:', event);
        },

        // Trigger mod event
        triggerModEvent(event, data) {
            console.log('[ModAPI] Triggering event:', event);
        },

        // Show mod notification
        showModNotification(title, message, type = 'info') {
            console.log(`[ModAPI] Notification (${type}): ${title} - ${message}`);
        },

        // Create mod UI element
        createModUIElement(config) {
            console.log('[ModAPI] Creating UI element:', config);
        },

        // Save mod data
        saveModData(key, value) {
            const modKey = `hellaphobia_mod_data_${key}`;
            localStorage.setItem(modKey, JSON.stringify(value));
        },

        // Load mod data
        loadModData(key) {
            const modKey = `hellaphobia_mod_data_${key}`;
            const saved = localStorage.getItem(modKey);
            return saved ? JSON.parse(saved) : null;
        }
    };

    // ===== PHASE 9: LEVEL EDITOR =====
    const LevelEditor = {
        active: false,
        currentLevel: null,
        selectedTool: 'place',
        selectedTile: null,
        clipboard: null,
        history: [],
        historyIndex: -1,

        init() {
            console.log('Phase 9: Level Editor initialized');
        },

        // Open editor
        open(levelData = null) {
            this.active = true;
            this.currentLevel = levelData || this.createBlankLevel();
            this.history = [JSON.parse(JSON.stringify(this.currentLevel))];
            this.historyIndex = 0;

            EventTracker.track('level_editor_opened');
            console.log('[LevelEditor] Editor opened');
        },

        // Close editor
        close() {
            this.active = false;
            this.currentLevel = null;
            EventTracker.track('level_editor_closed');
            console.log('[LevelEditor] Editor closed');
        },

        // Create blank level
        createBlankLevel() {
            return {
                name: 'Custom Level',
                author: 'Player',
                width: 50,
                height: 30,
                tiles: [],
                entities: [],
                spawn: { x: 100, y: 300 },
                exit: { x: 1400, y: 300 },
                metadata: {
                    difficulty: 'normal',
                    theme: 'dungeon',
                    created: Date.now()
                }
            };
        },

        // Place tile
        placeTile(x, y, tileType) {
            if (!this.active) return;

            const tile = { x, y, type: tileType };
            this.currentLevel.tiles.push(tile);
            this.pushHistory();

            EventTracker.track('level_editor_tile_placed', { type: tileType });
        },

        // Remove tile
        removeTile(x, y) {
            if (!this.active) return;

            this.currentLevel.tiles = this.currentLevel.tiles.filter(
                t => !(t.x === x && t.y === y)
            );
            this.pushHistory();
        },

        // Place entity
        placeEntity(x, y, entityType, props = {}) {
            if (!this.active) return;

            const entity = {
                x, y,
                type: entityType,
                props: { ...props }
            };
            this.currentLevel.entities.push(entity);
            this.pushHistory();

            EventTracker.track('level_editor_entity_placed', { type: entityType });
        },

        // Remove entity
        removeEntity(index) {
            if (!this.active) return;

            this.currentLevel.entities.splice(index, 1);
            this.pushHistory();
        },

        // Set spawn point
        setSpawn(x, y) {
            if (!this.active) return;
            this.currentLevel.spawn = { x, y };
            this.pushHistory();
        },

        // Set exit point
        setExit(x, y) {
            if (!this.active) return;
            this.currentLevel.exit = { x, y };
            this.pushHistory();
        },

        // Push state to history
        pushHistory() {
            // Remove future history if we're not at the end
            this.history = this.history.slice(0, this.historyIndex + 1);
            
            // Add current state
            this.history.push(JSON.parse(JSON.stringify(this.currentLevel)));
            this.historyIndex++;

            // Limit history size
            if (this.history.length > 50) {
                this.history.shift();
                this.historyIndex--;
            }
        },

        // Undo
        undo() {
            if (this.historyIndex > 0) {
                this.historyIndex--;
                this.currentLevel = JSON.parse(JSON.stringify(this.history[this.historyIndex]));
                EventTracker.track('level_editor_undo');
            }
        },

        // Redo
        redo() {
            if (this.historyIndex < this.history.length - 1) {
                this.historyIndex++;
                this.currentLevel = JSON.parse(JSON.stringify(this.history[this.historyIndex]));
                EventTracker.track('level_editor_redo');
            }
        },

        // Save level
        save(name) {
            this.currentLevel.name = name;
            this.currentLevel.updated = Date.now();

            const levels = this.getSavedLevels();
            levels.push(this.currentLevel);
            localStorage.setItem('hellaphobia_custom_levels', JSON.stringify(levels));

            EventTracker.track('level_editor_save', { name });
            console.log('[LevelEditor] Level saved:', name);
        },

        // Load level
        load(levelId) {
            const levels = this.getSavedLevels();
            const level = levels.find(l => l.id === levelId);
            if (level) {
                this.currentLevel = level;
                this.history = [JSON.parse(JSON.stringify(level))];
                this.historyIndex = 0;
                EventTracker.track('level_editor_load', { levelId });
            }
        },

        // Get saved levels
        getSavedLevels() {
            const saved = localStorage.getItem('hellaphobia_custom_levels');
            return saved ? JSON.parse(saved) : [];
        },

        // Export level
        exportLevel() {
            return JSON.stringify(this.currentLevel, null, 2);
        },

        // Import level
        importLevel(jsonString) {
            try {
                const level = JSON.parse(jsonString);
                this.currentLevel = level;
                this.history = [JSON.parse(JSON.stringify(level))];
                this.historyIndex = 0;
                EventTracker.track('level_editor_import');
                return true;
            } catch (error) {
                console.error('[LevelEditor] Import failed:', error);
                return false;
            }
        },

        // Test level
        testLevel() {
            EventTracker.track('level_editor_test');
            console.log('[LevelEditor] Testing level...');
            // Integration with main game
            if (typeof window.startCustomLevel === 'function') {
                window.startCustomLevel(this.currentLevel);
            }
        },

        // Get editor state
        getState() {
            return {
                active: this.active,
                tool: this.selectedTool,
                tileCount: this.currentLevel?.tiles.length || 0,
                entityCount: this.currentLevel?.entities.length || 0,
                canUndo: this.historyIndex > 0,
                canRedo: this.historyIndex < this.history.length - 1
            };
        }
    };

    // ===== PHASE 9: ASSET MANAGER =====
    const AssetManager = {
        customAssets: {},
        assetCache: {},

        init() {
            console.log('Phase 9: Asset Manager initialized');
        },

        // Import asset
        async importAsset(file, category) {
            try {
                const format = file.name.split('.').pop().toLowerCase();
                
                // Validate format
                const allowedFormats = MODDING_CONFIG.SUPPORTED_FORMATS[category];
                if (!allowedFormats || !allowedFormats.includes(format)) {
                    throw new Error(`Unsupported format: ${format}`);
                }

                // Read file
                const assetData = await this.readFileAsDataUrl(file);
                
                // Store asset
                const assetId = `${category}_${Date.now()}_${file.name}`;
                this.customAssets[assetId] = {
                    id: assetId,
                    name: file.name,
                    category: category,
                    format: format,
                    size: file.size,
                    data: assetData,
                    importedAt: Date.now()
                };

                EventTracker.track('asset_imported', { category, format });
                console.log('[AssetManager] Imported:', assetId);
                return assetId;
            } catch (error) {
                console.error('[AssetManager] Import failed:', error);
                return null;
            }
        },

        // Read file as data URL
        readFileAsDataUrl(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = () => reject(new Error('Failed to read file'));
                reader.readAsDataURL(file);
            });
        },

        // Get asset
        getAsset(assetId) {
            return this.customAssets[assetId] || null;
        },

        // Get assets by category
        getAssetsByCategory(category) {
            return Object.values(this.customAssets).filter(a => a.category === category);
        },

        // Delete asset
        deleteAsset(assetId) {
            delete this.customAssets[assetId];
            EventTracker.track('asset_deleted', { assetId });
        },

        // Export assets
        exportAssets() {
            return JSON.stringify(this.customAssets);
        },

        // Import assets pack
        importAssetsPack(jsonString) {
            try {
                const assets = JSON.parse(jsonString);
                Object.assign(this.customAssets, assets);
                EventTracker.track('assets_pack_imported');
                return true;
            } catch (error) {
                console.error('[AssetManager] Pack import failed:', error);
                return false;
            }
        }
    };

    // ===== PHASE 9: CHARACTER CUSTOMIZATION =====
    const CharacterCustomization = {
        presets: [],
        currentLoadout: null,

        init() {
            this.loadPresets();
            console.log('Phase 9: Character Customization initialized');
        },

        // Create customization preset
        createPreset(name, config) {
            const preset = {
                id: `preset_${Date.now()}`,
                name: name,
                config: config,
                createdAt: Date.now()
            };

            this.presets.push(preset);
            this.savePresets();
            EventTracker.track('character_preset_created', { name });
            return preset;
        },

        // Apply preset
        applyPreset(presetId) {
            const preset = this.presets.find(p => p.id === presetId);
            if (preset) {
                this.currentLoadout = preset.config;
                EventTracker.track('character_preset_applied', { presetId });
                console.log('[Customization] Applied preset:', preset.name);
            }
        },

        // Get customization options
        getOptions() {
            return {
                colors: [
                    { id: 'default', name: 'Default', primary: '#ff88aa', secondary: '#1a1a2e' },
                    { id: 'crimson', name: 'Crimson', primary: '#ff0044', secondary: '#1a0a10' },
                    { id: 'shadow', name: 'Shadow', primary: '#8844ff', secondary: '#0a0a15' },
                    { id: 'golden', name: 'Golden', primary: '#ffcc00', secondary: '#1a1a0a' },
                    { id: 'ice', name: 'Ice', primary: '#88ffff', secondary: '#0a1a1a' },
                    { id: 'void', name: 'Void', primary: '#aa88ff', secondary: '#050510' }
                ],
                hairstyles: ['default', 'short', 'long', 'ponytail', 'twin_tails'],
                accessories: ['none', 'glasses', 'headband', 'hat', 'mask']
            };
        },

        // Save presets
        savePresets() {
            localStorage.setItem('hellaphobia_character_presets', JSON.stringify(this.presets));
        },

        // Load presets
        loadPresets() {
            const saved = localStorage.getItem('hellaphobia_character_presets');
            if (saved) {
                this.presets = JSON.parse(saved);
            }
        },

        // Get current loadout
        getCurrentLoadout() {
            return this.currentLoadout;
        }
    };

    // ===== PHASE 9: MAIN MODDING MANAGER =====
    const Phase9Modding = {
        initialized: false,

        init() {
            if (this.initialized) return;

            ModLoader.init();
            LevelEditor.init();
            AssetManager.init();
            CharacterCustomization.init();

            this.initialized = true;
            console.log('Phase 9: Modding & Customization System initialized');
        },

        // Mod management
        installMod: (file) => ModLoader.installMod(file),
        toggleMod: (id, enabled) => ModLoader.toggleMod(id, enabled),
        uninstallMod: (id) => ModLoader.uninstallMod(id),
        getModList: () => ModLoader.getModList(),

        // Level editor
        openEditor: (level) => LevelEditor.open(level),
        closeEditor: () => LevelEditor.close(),
        getEditorState: () => LevelEditor.getState(),
        saveLevel: (name) => LevelEditor.save(name),
        exportLevel: () => LevelEditor.exportLevel(),
        importLevel: (json) => LevelEditor.importLevel(json),
        testLevel: () => LevelEditor.testLevel(),
        undo: () => LevelEditor.undo(),
        redo: () => LevelEditor.redo(),

        // Asset management
        importAsset: (file, category) => AssetManager.importAsset(file, category),
        getAssets: (category) => AssetManager.getAssetsByCategory(category),

        // Character customization
        createPreset: (name, config) => CharacterCustomization.createPreset(name, config),
        applyPreset: (id) => CharacterCustomization.applyPreset(id),
        getCustomizationOptions: () => CharacterCustomization.getOptions()
    };

    // Export Phase 9 systems
    window.Phase9Modding = Phase9Modding;
    window.ModLoader = ModLoader;
    window.LevelEditor = LevelEditor;
    window.AssetManager = AssetManager;
    window.CharacterCustomization = CharacterCustomization;

})();

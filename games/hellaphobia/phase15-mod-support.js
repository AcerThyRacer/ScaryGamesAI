/* ============================================================
   HELLAPHOBIA - PHASE 15: MOD SUPPORT
   Level Editor | Mod API | Workshop | Custom Tools
   ============================================================ */

(function() {
    'use strict';

    // ===== PHASE 15: MOD SUPPORT CONFIG =====
    const MOD_SUPPORT_CONFIG = {
        MAX_MOD_SIZE: 100 * 1024 * 1024, // 100MB
        MAX_LEVEL_SIZE: 10 * 1024 * 1024, // 10MB
        SUPPORTED_FORMATS: {
            levels: ['json'],
            monsters: ['json'],
            stories: ['json'],
            textures: ['png', 'jpg', 'webp'],
            audio: ['mp3', 'ogg', 'wav'],
            scripts: ['js']
        },
        API_VERSION: '1.0.0',
        WORKSHOP_ENABLED: true,
        SCRIPT_SANDBOX: true
    };

    // ===== PHASE 15: WORKSHOP MANAGER =====
    const WorkshopManager = {
        subscribedMods: [],
        uploadedMods: [],
        featuredMods: [],
        categories: ['levels', 'monsters', 'stories', 'textures', 'audio', 'scripts'],
        cache: new Map(),

        init() {
            this.loadSubscriptions();
            this.fetchFeaturedMods();
            console.log('Phase 15: Workshop Manager initialized');
        },

        // Browse workshop
        async browseWorkshop(category, page = 1, filters = {}) {
            const cacheKey = `${category}_${page}_${JSON.stringify(filters)}`;
            
            if (this.cache.has(cacheKey)) {
                return this.cache.get(cacheKey);
            }

            // Simulate workshop API call
            const results = await this.simulateWorkshopFetch(category, page, filters);
            
            this.cache.set(cacheKey, results);
            
            // Clear cache after 5 minutes
            setTimeout(() => this.cache.delete(cacheKey), 300000);

            return results;
        },

        // Simulate workshop fetch
        async simulateWorkshopFetch(category, page, filters) {
            // Generate sample mods
            const mods = [];
            const modCount = 20;

            for (let i = 0; i < modCount; i++) {
                mods.push({
                    id: `mod_${category}_${page}_${i}`,
                    title: this.generateModTitle(category),
                    author: `Modder_${Math.floor(Math.random() * 1000)}`,
                    category: category,
                    description: `A custom ${category.slice(0, -1)} for Hellaphobia`,
                    version: '1.0.0',
                    downloads: Math.floor(Math.random() * 10000),
                    rating: 3 + Math.random() * 2,
                    reviews: Math.floor(Math.random() * 500),
                    thumbnail: `thumbnail_${i}.jpg`,
                    size: Math.floor(Math.random() * 50) + 1, // MB
                    uploadedAt: Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000),
                    tags: this.generateTags(category)
                });
            }

            return {
                mods,
                page,
                totalPages: 10,
                totalResults: 200
            };
        },

        // Generate mod title
        generateModTitle(category) {
            const prefixes = ['Dark', 'Bloody', 'Haunted', 'Cursed', 'Nightmare', 'Shadow', 'Evil', 'Dead'];
            const suffixes = {
                levels: ['Dungeon', 'Maze', 'Castle', 'Asylum', 'Prison', 'Catacombs'],
                monsters: ['Demon', 'Ghost', 'Zombie', 'Skeleton', 'Wraith', 'Fiend'],
                stories: ['Tale', 'Story', 'Legend', 'Chronicle', 'Saga'],
                textures: ['Pack', 'Set', 'Collection', 'Bundle'],
                audio: ['Track', 'Theme', 'Soundtrack', 'Ambience'],
                scripts: ['Script', 'Plugin', 'Extension', 'Module']
            };

            const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
            const suffix = suffixes[category]?.[Math.floor(Math.random() * suffixes[category].length)] || 'Mod';
            return `${prefix} ${suffix}`;
        },

        // Generate tags
        generateTags(category) {
            const allTags = ['horror', 'scary', 'difficult', 'easy', 'story-rich', 'atmospheric', 'challenging', 'fun'];
            const count = 2 + Math.floor(Math.random() * 3);
            const shuffled = allTags.sort(() => Math.random() - 0.5);
            return shuffled.slice(0, count);
        },

        // Subscribe to mod
        async subscribeToMod(modId) {
            if (!this.subscribedMods.includes(modId)) {
                this.subscribedMods.push(modId);
                this.saveSubscriptions();

                EventTracker.track('workshop_subscribed', { modId });
                console.log('[Workshop] Subscribed to:', modId);
                return true;
            }
            return false;
        },

        // Unsubscribe from mod
        unsubscribeFromMod(modId) {
            const index = this.subscribedMods.indexOf(modId);
            if (index !== -1) {
                this.subscribedMods.splice(index, 1);
                this.saveSubscriptions();

                EventTracker.track('workshop_unsubscribed', { modId });
                console.log('[Workshop] Unsubscribed from:', modId);
                return true;
            }
            return false;
        },

        // Upload mod to workshop
        async uploadMod(modData) {
            // Validate mod
            const validation = this.validateMod(modData);
            if (!validation.valid) {
                return { success: false, error: validation.error };
            }

            // Simulate upload
            const uploadId = 'upload_' + Date.now();
            this.uploadedMods.push({
                id: uploadId,
                ...modData,
                uploadedAt: Date.now(),
                downloads: 0,
                rating: 0,
                reviews: 0
            });

            EventTracker.track('workshop_upload', { modId: uploadId, category: modData.category });
            console.log('[Workshop] Uploaded mod:', uploadId);

            return { success: true, uploadId };
        },

        // Validate mod
        validateMod(modData) {
            const required = ['id', 'title', 'author', 'category', 'version'];
            for (const field of required) {
                if (!modData[field]) {
                    return { valid: false, error: `Missing required field: ${field}` };
                }
            }

            // Check size
            if (modData.size > MOD_SUPPORT_CONFIG.MAX_MOD_SIZE) {
                return { valid: false, error: 'Mod exceeds maximum size (100MB)' };
            }

            // Check category
            if (!this.categories.includes(modData.category)) {
                return { valid: false, error: 'Invalid category' };
            }

            return { valid: true };
        },

        // Get subscribed mods
        getSubscribedMods() {
            return this.subscribedMods;
        },

        // Save subscriptions
        saveSubscriptions() {
            localStorage.setItem('hellaphobia_workshop_subscriptions', JSON.stringify(this.subscribedMods));
        },

        // Load subscriptions
        loadSubscriptions() {
            const saved = localStorage.getItem('hellaphobia_workshop_subscriptions');
            if (saved) {
                this.subscribedMods = JSON.parse(saved);
            }
        },

        // Fetch featured mods
        async fetchFeaturedMods() {
            // Simulate featured mods
            this.featuredMods = [
                { id: 'featured_1', title: 'Dark Dungeon', author: 'ModMaster', rating: 4.8 },
                { id: 'featured_2', title: 'Nightmare Demon', author: 'HorrorKing', rating: 4.9 },
                { id: 'featured_3', title: 'Haunted Asylum', author: 'ScaryModder', rating: 4.7 }
            ];
        },

        // Get featured mods
        getFeaturedMods() {
            return this.featuredMods;
        },

        // Rate mod
        async rateMod(modId, rating) {
            EventTracker.track('workshop_rated', { modId, rating });
            console.log('[Workshop] Rated mod:', modId, rating);
            return true;
        },

        // Review mod
        async reviewMod(modId, review) {
            EventTracker.track('workshop_reviewed', { modId, review });
            console.log('[Workshop] Reviewed mod:', modId);
            return true;
        },

        // Get workshop stats
        getStats() {
            return {
                subscribed: this.subscribedMods.length,
                uploaded: this.uploadedMods.length,
                featured: this.featuredMods.length,
                cacheSize: this.cache.size
            };
        }
    };

    // ===== PHASE 15: ENHANCED LEVEL EDITOR =====
    const EnhancedLevelEditor = {
        active: false,
        currentLevel: null,
        selectedTool: 'select',
        selectedTile: null,
        clipboard: null,
        history: [],
        historyIndex: -1,
        gridVisible: true,
        snapToGrid: true,
        gridSize: 32,
        zoom: 1,
        layers: {
            background: true,
            tiles: true,
            entities: true,
            decorations: true,
            triggers: true
        },

        init() {
            console.log('Phase 15: Enhanced Level Editor initialized');
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
                version: '1.0.0',
                width: 50,
                height: 30,
                gridSize: this.gridSize,
                tiles: [],
                entities: [],
                decorations: [],
                triggers: [],
                spawn: { x: 100, y: 300 },
                exit: { x: 1400, y: 300 },
                lighting: { ambient: '#1a0a10', dynamic: true },
                weather: { type: 'none', intensity: 0 },
                music: { track: 'default', volume: 0.5 },
                metadata: {
                    difficulty: 'normal',
                    theme: 'dungeon',
                    tags: [],
                    created: Date.now(),
                    updated: Date.now()
                }
            };
        },

        // Set active tool
        setTool(tool) {
            this.selectedTool = tool;
            EventTracker.track('level_editor_tool_changed', { tool });
        },

        // Place tile
        placeTile(x, y, tileType, properties = {}) {
            if (!this.active) return;

            if (this.snapToGrid) {
                x = Math.floor(x / this.gridSize) * this.gridSize;
                y = Math.floor(y / this.gridSize) * this.gridSize;
            }

            const tile = {
                x, y,
                type: tileType,
                width: this.gridSize,
                height: this.gridSize,
                properties: { ...properties },
                layer: 'tiles'
            };

            // Check for existing tile
            const existingIndex = this.currentLevel.tiles.findIndex(
                t => t.x === x && t.y === y
            );

            if (existingIndex !== -1) {
                this.currentLevel.tiles[existingIndex] = tile;
            } else {
                this.currentLevel.tiles.push(tile);
            }

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
        placeEntity(x, y, entityType, properties = {}) {
            if (!this.active) return;

            const entity = {
                id: 'entity_' + Date.now() + '_' + Math.random(),
                x, y,
                type: entityType,
                properties: { ...properties },
                layer: 'entities'
            };

            this.currentLevel.entities.push(entity);
            this.pushHistory();

            EventTracker.track('level_editor_entity_placed', { type: entityType });
        },

        // Place decoration
        placeDecoration(x, y, decorationType, properties = {}) {
            if (!this.active) return;

            const decoration = {
                x, y,
                type: decorationType,
                properties: { ...properties },
                layer: 'decorations'
            };

            this.currentLevel.decorations.push(decoration);
            this.pushHistory();
        },

        // Add trigger
        addTrigger(x, y, width, height, triggerData) {
            if (!this.active) return;

            const trigger = {
                id: 'trigger_' + Date.now(),
                x, y, width, height,
                type: triggerData.type || 'area',
                conditions: triggerData.conditions || [],
                actions: triggerData.actions || [],
                layer: 'triggers'
            };

            this.currentLevel.triggers.push(trigger);
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
            
            // Add current state (deep copy)
            this.history.push(JSON.parse(JSON.stringify(this.currentLevel)));
            this.historyIndex++;

            // Limit history size
            if (this.history.length > 100) {
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

        // Copy selection
        copy(selection) {
            this.clipboard = JSON.parse(JSON.stringify(selection));
            EventTracker.track('level_editor_copy');
        },

        // Paste selection
        paste(x, y) {
            if (!this.clipboard) return;

            // Offset pasted items
            const offset = {
                x: x - this.clipboard.x,
                y: y - this.clipboard.y
            };

            // Paste tiles
            if (this.clipboard.tiles) {
                this.clipboard.tiles.forEach(tile => {
                    this.placeTile(tile.x + offset.x, tile.y + offset.y, tile.type, tile.properties);
                });
            }

            // Paste entities
            if (this.clipboard.entities) {
                this.clipboard.entities.forEach(entity => {
                    this.placeEntity(entity.x + offset.x, entity.y + offset.y, entity.type, entity.properties);
                });
            }

            EventTracker.track('level_editor_paste');
        },

        // Save level
        save(name, metadata = {}) {
            this.currentLevel.name = name;
            this.currentLevel.updated = Date.now();
            this.currentLevel.metadata = { ...this.currentLevel.metadata, ...metadata };

            const levels = this.getSavedLevels();
            levels.push(this.currentLevel);
            localStorage.setItem('hellaphobia_custom_levels', JSON.stringify(levels));

            EventTracker.track('level_editor_save', { name });
            console.log('[LevelEditor] Level saved:', name);

            return this.currentLevel;
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
        exportLevel(format = 'json') {
            if (format === 'json') {
                return JSON.stringify(this.currentLevel, null, 2);
            }
            return null;
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

        // Export as mod package
        exportAsMod() {
            const modPackage = {
                id: 'level_' + Date.now(),
                type: 'level',
                version: '1.0.0',
                level: this.currentLevel,
                metadata: {
                    name: this.currentLevel.name,
                    author: this.currentLevel.author,
                    description: 'Custom level created with Level Editor',
                    thumbnail: null
                }
            };

            return JSON.stringify(modPackage, null, 2);
        },

        // Test level
        testLevel() {
            EventTracker.track('level_editor_test');
            console.log('[LevelEditor] Testing level...');
            
            if (typeof window.startCustomLevel === 'function') {
                window.startCustomLevel(this.currentLevel);
            }
        },

        // Validate level
        validateLevel() {
            const errors = [];
            const warnings = [];

            // Check spawn point
            if (!this.currentLevel.spawn) {
                errors.push('Missing spawn point');
            }

            // Check exit point
            if (!this.currentLevel.exit) {
                errors.push('Missing exit point');
            }

            // Check tiles
            if (this.currentLevel.tiles.length === 0) {
                warnings.push('No tiles placed');
            }

            // Check entities
            if (this.currentLevel.entities.length === 0) {
                warnings.push('No entities placed');
            }

            return { valid: errors.length === 0, errors, warnings };
        },

        // Get editor state
        getState() {
            return {
                active: this.active,
                tool: this.selectedTool,
                tileCount: this.currentLevel?.tiles.length || 0,
                entityCount: this.currentLevel?.entities.length || 0,
                decorationCount: this.currentLevel?.decorations.length || 0,
                triggerCount: this.currentLevel?.triggers.length || 0,
                canUndo: this.historyIndex > 0,
                canRedo: this.historyIndex < this.history.length - 1,
                zoom: this.zoom,
                gridVisible: this.gridVisible
            };
        },

        // Toggle grid
        toggleGrid() {
            this.gridVisible = !this.gridVisible;
        },

        // Toggle snap
        toggleSnap() {
            this.snapToGrid = !this.snapToGrid;
        },

        // Set zoom
        setZoom(zoom) {
            this.zoom = Math.max(0.25, Math.min(4, zoom));
        },

        // Toggle layer visibility
        toggleLayer(layer) {
            if (this.layers.hasOwnProperty(layer)) {
                this.layers[layer] = !this.layers[layer];
            }
        }
    };

    // ===== PHASE 15: MONSTER CREATOR =====
    const MonsterCreator = {
        templates: [],
        customMonsters: [],

        init() {
            this.loadTemplates();
            this.loadCustomMonsters();
            console.log('Phase 15: Monster Creator initialized');
        },

        // Load monster templates
        loadTemplates() {
            this.templates = [
                { id: 'basic', name: 'Basic Monster', hp: 50, speed: 100, damage: 10 },
                { id: 'fast', name: 'Fast Monster', hp: 30, speed: 200, damage: 8 },
                { id: 'tank', name: 'Tank Monster', hp: 150, speed: 50, damage: 20 },
                { id: 'ranged', name: 'Ranged Monster', hp: 40, speed: 80, damage: 15 },
                { id: 'stealth', name: 'Stealth Monster', hp: 35, speed: 120, damage: 25 }
            ];
        },

        // Create custom monster
        createMonster(config) {
            const monster = {
                id: 'monster_' + Date.now(),
                name: config.name || 'Custom Monster',
                description: config.description || '',
                hp: config.hp || 50,
                speed: config.speed || 100,
                damage: config.damage || 10,
                width: config.width || 32,
                height: config.height || 32,
                color: config.color || '#ff0044',
                eyeColor: config.eyeColor || '#ffffff',
                behavior: config.behavior || 'chase',
                abilities: config.abilities || [],
                weaknesses: config.weaknesses || [],
                resistances: config.resistances || [],
                drops: config.drops || [],
                chat: config.chat || [],
                animations: config.animations || {},
                sounds: config.sounds || {},
                author: config.author || 'Player',
                version: config.version || '1.0.0',
                createdAt: Date.now()
            };

            this.customMonsters.push(monster);
            this.saveCustomMonsters();

            EventTracker.track('monster_created', { monsterId: monster.id });
            console.log('[MonsterCreator] Created:', monster.name);

            return monster;
        },

        // Edit monster
        editMonster(monsterId, updates) {
            const monster = this.customMonsters.find(m => m.id === monsterId);
            if (monster) {
                Object.assign(monster, updates);
                monster.updatedAt = Date.now();
                this.saveCustomMonsters();

                EventTracker.track('monster_edited', { monsterId });
                return true;
            }
            return false;
        },

        // Delete monster
        deleteMonster(monsterId) {
            const index = this.customMonsters.findIndex(m => m.id === monsterId);
            if (index !== -1) {
                this.customMonsters.splice(index, 1);
                this.saveCustomMonsters();

                EventTracker.track('monster_deleted', { monsterId });
                return true;
            }
            return false;
        },

        // Get monster templates
        getTemplates() {
            return this.templates;
        },

        // Get custom monsters
        getCustomMonsters() {
            return this.customMonsters;
        },

        // Save custom monsters
        saveCustomMonsters() {
            localStorage.setItem('hellaphobia_custom_monsters', JSON.stringify(this.customMonsters));
        },

        // Load custom monsters
        loadCustomMonsters() {
            const saved = localStorage.getItem('hellaphobia_custom_monsters');
            if (saved) {
                this.customMonsters = JSON.parse(saved);
            }
        },

        // Export monster as mod
        exportMonster(monsterId) {
            const monster = this.customMonsters.find(m => m.id === monsterId);
            if (!monster) return null;

            const modPackage = {
                id: 'monster_' + monsterId,
                type: 'monster',
                version: monster.version,
                monster: monster,
                metadata: {
                    name: monster.name,
                    author: monster.author,
                    description: monster.description
                }
            };

            return JSON.stringify(modPackage, null, 2);
        },

        // Import monster from mod
        importMonster(jsonString) {
            try {
                const modPackage = JSON.parse(jsonString);
                if (modPackage.type !== 'monster') {
                    throw new Error('Invalid monster package');
                }

                const monster = modPackage.monster;
                monster.id = 'monster_' + Date.now();
                this.customMonsters.push(monster);
                this.saveCustomMonsters();

                EventTracker.track('monster_imported', { monsterId: monster.id });
                return monster;
            } catch (error) {
                console.error('[MonsterCreator] Import failed:', error);
                return null;
            }
        }
    };

    // ===== PHASE 15: STORY CREATOR =====
    const StoryCreator = {
        stories: [],
        templates: [],

        init() {
            this.loadTemplates();
            this.loadStories();
            console.log('Phase 15: Story Creator initialized');
        },

        // Load story templates
        loadTemplates() {
            this.templates = [
                {
                    id: 'basic',
                    name: 'Basic Story',
                    structure: ['intro', 'rising_action', 'climax', 'falling_action', 'resolution']
                },
                {
                    id: 'horror',
                    name: 'Horror Story',
                    structure: ['setup', 'disturbance', 'escalation', 'terror', 'aftermath']
                },
                {
                    id: 'mystery',
                    name: 'Mystery Story',
                    structure: ['crime', 'investigation', 'clues', 'revelation', 'resolution']
                }
            ];
        },

        // Create story
        createStory(config) {
            const story = {
                id: 'story_' + Date.now(),
                title: config.title || 'Untitled Story',
                author: config.author || 'Player',
                description: config.description || '',
                chapters: config.chapters || [],
                characters: config.characters || [],
                settings: config.settings || [],
                choices: config.choices || [],
                endings: config.endings || [],
                metadata: {
                    genre: config.genre || 'horror',
                    difficulty: config.difficulty || 'normal',
                    playtime: config.playtime || 30,
                    rating: 'M',
                    tags: config.tags || []
                },
                createdAt: Date.now()
            };

            this.stories.push(story);
            this.saveStories();

            EventTracker.track('story_created', { storyId: story.id });
            console.log('[StoryCreator] Created:', story.title);

            return story;
        },

        // Add chapter
        addChapter(storyId, chapter) {
            const story = this.stories.find(s => s.id === storyId);
            if (story) {
                story.chapters.push({
                    id: 'chapter_' + Date.now(),
                    title: chapter.title || 'New Chapter',
                    content: chapter.content || '',
                    scenes: chapter.scenes || [],
                    choices: chapter.choices || []
                });
                this.saveStories();
                return true;
            }
            return false;
        },

        // Add character
        addCharacter(storyId, character) {
            const story = this.stories.find(s => s.id === storyId);
            if (story) {
                story.characters.push({
                    id: 'char_' + Date.now(),
                    name: character.name,
                    role: character.role,
                    description: character.description,
                    dialogue: character.dialogue || []
                });
                this.saveStories();
                return true;
            }
            return false;
        },

        // Add choice
        addChoice(storyId, chapterIndex, choice) {
            const story = this.stories.find(s => s.id === storyId);
            if (story && story.chapters[chapterIndex]) {
                story.chapters[chapterIndex].choices.push({
                    id: 'choice_' + Date.now(),
                    text: choice.text,
                    consequences: choice.consequences || [],
                    nextChapter: choice.nextChapter
                });
                this.saveStories();
                return true;
            }
            return false;
        },

        // Add ending
        addEnding(storyId, ending) {
            const story = this.stories.find(s => s.id === storyId);
            if (story) {
                story.endings.push({
                    id: 'ending_' + Date.now(),
                    title: ending.title,
                    description: ending.description,
                    requirements: ending.requirements || [],
                    isTrueEnding: ending.isTrueEnding || false
                });
                this.saveStories();
                return true;
            }
            return false;
        },

        // Get stories
        getStories() {
            return this.stories;
        },

        // Save stories
        saveStories() {
            localStorage.setItem('hellaphobia_custom_stories', JSON.stringify(this.stories));
        },

        // Load stories
        loadStories() {
            const saved = localStorage.getItem('hellaphobia_custom_stories');
            if (saved) {
                this.stories = JSON.parse(saved);
            }
        },

        // Export story as mod
        exportStory(storyId) {
            const story = this.stories.find(s => s.id === storyId);
            if (!story) return null;

            const modPackage = {
                id: 'story_' + storyId,
                type: 'story',
                version: '1.0.0',
                story: story,
                metadata: {
                    title: story.title,
                    author: story.author,
                    description: story.description,
                    genre: story.metadata.genre
                }
            };

            return JSON.stringify(modPackage, null, 2);
        },

        // Import story from mod
        importStory(jsonString) {
            try {
                const modPackage = JSON.parse(jsonString);
                if (modPackage.type !== 'story') {
                    throw new Error('Invalid story package');
                }

                const story = modPackage.story;
                story.id = 'story_' + Date.now();
                this.stories.push(story);
                this.saveStories();

                EventTracker.track('story_imported', { storyId: story.id });
                return story;
            } catch (error) {
                console.error('[StoryCreator] Import failed:', error);
                return null;
            }
        }
    };

    // ===== PHASE 15: MOD LOADER (Enhanced) =====
    const EnhancedModLoader = {
        loadedMods: [],
        activeMods: [],
        modConfigs: {},

        init() {
            this.loadModList();
            console.log('Phase 15: Enhanced Mod Loader initialized');
        },

        // Load mod package
        async loadModPackage(packageData) {
            try {
                const mod = JSON.parse(packageData);
                
                // Validate package
                const validation = this.validateModPackage(mod);
                if (!validation.valid) {
                    return { success: false, error: validation.error };
                }

                // Add to loaded mods
                this.loadedMods.push(mod);
                this.saveModList();

                // Activate if enabled
                if (mod.enabled !== false) {
                    this.activateMod(mod);
                }

                EventTracker.track('mod_package_loaded', { modId: mod.id });
                console.log('[ModLoader] Loaded package:', mod.id);

                return { success: true, mod };
            } catch (error) {
                console.error('[ModLoader] Failed to load package:', error);
                return { success: false, error: error.message };
            }
        },

        // Validate mod package
        validateModPackage(mod) {
            const required = ['id', 'type', 'version'];
            for (const field of required) {
                if (!mod[field]) {
                    return { valid: false, error: `Missing required field: ${field}` };
                }
            }

            // Type-specific validation
            switch (mod.type) {
                case 'level':
                    if (!mod.level) {
                        return { valid: false, error: 'Missing level data' };
                    }
                    break;
                case 'monster':
                    if (!mod.monster) {
                        return { valid: false, error: 'Missing monster data' };
                    }
                    break;
                case 'story':
                    if (!mod.story) {
                        return { valid: false, error: 'Missing story data' };
                    }
                    break;
            }

            return { valid: true };
        },

        // Activate mod
        activateMod(mod) {
            if (!this.activeMods.includes(mod.id)) {
                this.activeMods.push(mod.id);
                this.modConfigs[mod.id] = mod;

                // Apply mod based on type
                switch (mod.type) {
                    case 'level':
                        this.applyLevelMod(mod);
                        break;
                    case 'monster':
                        this.applyMonsterMod(mod);
                        break;
                    case 'story':
                        this.applyStoryMod(mod);
                        break;
                }

                EventTracker.track('mod_activated', { modId: mod.id });
                console.log('[ModLoader] Activated:', mod.id);
            }
        },

        // Deactivate mod
        deactivateMod(modId) {
            const index = this.activeMods.indexOf(modId);
            if (index !== -1) {
                this.activeMods.splice(index, 1);
                delete this.modConfigs[modId];

                EventTracker.track('mod_deactivated', { modId });
                console.log('[ModLoader] Deactivated:', modId);
            }
        },

        // Apply level mod
        applyLevelMod(mod) {
            // Integration with Phase 2 procedural generation
            if (typeof Phase2Core !== 'undefined' && Phase2Core.addModRoom) {
                // Add custom rooms from mod
                if (mod.level.tiles) {
                    Phase2Core.addModRoom({
                        type: 'mod_custom',
                        tiles: mod.level.tiles,
                        entities: mod.level.entities
                    });
                }
            }
        },

        // Apply monster mod
        applyMonsterMod(mod) {
            // Integration with Phase 3 AI
            if (typeof Phase3Core !== 'undefined' && Phase3Core.addModMonster) {
                Phase3Core.addModMonster(mod.monster);
            }
        },

        // Apply story mod
        applyStoryMod(mod) {
            // Integration with Phase 5 narrative
            if (typeof Phase5Narrative !== 'undefined' && Phase5Narrative.addCustomStory) {
                Phase5Narrative.addCustomStory(mod.story);
            }
        },

        // Get loaded mods
        getLoadedMods() {
            return this.loadedMods;
        },

        // Get active mods
        getActiveMods() {
            return this.activeMods.map(id => this.modConfigs[id]);
        },

        // Save mod list
        saveModList() {
            localStorage.setItem('hellaphobia_mod_packages', JSON.stringify(this.loadedMods));
        },

        // Load mod list
        loadModList() {
            const saved = localStorage.getItem('hellaphobia_mod_packages');
            if (saved) {
                this.loadedMods = JSON.parse(saved);
            }
        }
    };

    // ===== PHASE 15: MAIN MOD SUPPORT MANAGER =====
    const Phase15ModSupport = {
        initialized: false,

        init() {
            if (this.initialized) return;

            WorkshopManager.init();
            EnhancedLevelEditor.init();
            MonsterCreator.init();
            StoryCreator.init();
            EnhancedModLoader.init();

            this.initialized = true;
            console.log('Phase 15: Mod Support initialized');
        },

        // Workshop
        browseWorkshop: (category, page, filters) => WorkshopManager.browseWorkshop(category, page, filters),
        subscribeToMod: (modId) => WorkshopManager.subscribeToMod(modId),
        uploadMod: (modData) => WorkshopManager.uploadMod(modData),
        getFeaturedMods: () => WorkshopManager.getFeaturedMods(),

        // Level Editor
        openLevelEditor: (level) => EnhancedLevelEditor.open(level),
        closeLevelEditor: () => EnhancedLevelEditor.close(),
        setEditorTool: (tool) => EnhancedLevelEditor.setTool(tool),
        saveLevel: (name, metadata) => EnhancedLevelEditor.save(name, metadata),
        exportLevel: (format) => EnhancedLevelEditor.exportLevel(format),
        testLevel: () => EnhancedLevelEditor.testLevel(),
        undo: () => EnhancedLevelEditor.undo(),
        redo: () => EnhancedLevelEditor.redo(),

        // Monster Creator
        createMonster: (config) => MonsterCreator.createMonster(config),
        getMonsterTemplates: () => MonsterCreator.getTemplates(),
        exportMonster: (id) => MonsterCreator.exportMonster(id),

        // Story Creator
        createStory: (config) => StoryCreator.createStory(config),
        getStories: () => StoryCreator.getStories(),
        exportStory: (id) => StoryCreator.exportStory(id),

        // Mod Loader
        loadModPackage: (data) => EnhancedModLoader.loadModPackage(data),
        getActiveMods: () => EnhancedModLoader.getActiveMods()
    };

    // Export Phase 15 systems
    window.Phase15ModSupport = Phase15ModSupport;
    window.WorkshopManager = WorkshopManager;
    window.EnhancedLevelEditor = EnhancedLevelEditor;
    window.MonsterCreator = MonsterCreator;
    window.StoryCreator = StoryCreator;
    window.EnhancedModLoader = EnhancedModLoader;

})();

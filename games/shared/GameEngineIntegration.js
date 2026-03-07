/**
 * ============================================
 * Game Engine Integration - Universal Module
 * ============================================
 * Provides unified access to all core systems for the 8 target games:
 * - ECS Architecture
 * - Advanced Physics
 * - WebGPU Rendering
 * - Dynamic Audio
 * - AI Systems
 * - Post-Processing
 * - Progression & Meta-Game
 * - Save/Load
 * - Mobile Controls
 * - Accessibility
 * - Multiplayer
 * - Mod Support
 */

// Global namespace
const SGAI = window.SGAI || {};

// ============================================
// CORE SYSTEMS REGISTRY
// ============================================

const GameEngineIntegration = {
    version: '2.0.0',
    initialized: false,
    
    // System references
    systems: {
        ecs: null,
        physics: null,
        renderer: null,
        audio: null,
        ai: null,
        postProcess: null,
        progression: null,
        save: null,
        mobile: null,
        accessibility: null,
        multiplayer: null,
        mods: null,
        analytics: null
    },
    
    // Active game reference
    activeGame: null,
    
    // Performance monitoring
    performance: {
        frameTime: 0,
        updateTime: 0,
        renderTime: 0,
        entityCount: 0,
        drawCalls: 0
    },

    /**
     * Initialize all core systems
     */
    async init(options = {}) {
        if (this.initialized) return this;
        
        console.log('[GameEngine] Initializing v' + this.version);
        
        // Initialize ECS
        if (options.ecs !== false) {
            this.systems.ecs = await this.initECS();
        }
        
        // Initialize Physics
        if (options.physics !== false) {
            this.systems.physics = await this.initPhysics(options.physicsConfig || {});
        }
        
        // Initialize Audio
        if (options.audio !== false) {
            this.systems.audio = await this.initAudio();
        }
        
        // Initialize AI
        if (options.ai !== false) {
            this.systems.ai = await this.initAI();
        }
        
        // Initialize Progression
        if (options.progression !== false) {
            this.systems.progression = await this.initProgression();
        }
        
        // Initialize Save System
        if (options.save !== false) {
            this.systems.save = await this.initSave();
        }
        
        // Initialize Mobile
        if (options.mobile !== false) {
            this.systems.mobile = await this.initMobile();
        }
        
        // Initialize Accessibility
        if (options.accessibility !== false) {
            this.systems.accessibility = await this.initAccessibility();
        }
        
        // Initialize Analytics
        if (options.analytics !== false) {
            this.systems.analytics = await this.initAnalytics();
        }
        
        this.initialized = true;
        console.log('[GameEngine] All systems initialized');
        
        return this;
    },

    /**
     * Initialize ECS System
     */
    async initECS() {
        // Use existing ECS from /js/core/ecs.js
        if (window.ECS) {
            return window.ECS;
        }
        
        // Create minimal ECS if not available
        const ECS = {
            _nextEntity: 1,
            _entities: new Map(),
            _components: new Map(),
            _systems: [],
            _componentTypes: new Map(),
            
            createEntity(tag) {
                const id = this._nextEntity++;
                this._entities.set(id, { id, tag, components: new Map() });
                return id;
            },
            
            destroyEntity(id) {
                this._entities.delete(id);
            },
            
            registerComponent(name, schema) {
                this._componentTypes.set(name, schema);
            },
            
            addComponent(entityId, componentName, data) {
                const entity = this._entities.get(entityId);
                if (entity) {
                    entity.components.set(componentName, data || {});
                }
                return entity;
            },
            
            getComponent(entityId, componentName) {
                const entity = this._entities.get(entityId);
                return entity ? entity.components.get(componentName) : null;
            },
            
            hasComponent(entityId, componentName) {
                const entity = this._entities.get(entityId);
                return entity ? entity.components.has(componentName) : false;
            },
            
            removeComponent(entityId, componentName) {
                const entity = this._entities.get(entityId);
                if (entity) {
                    entity.components.delete(componentName);
                }
            },
            
            getEntitiesWith(componentNames) {
                const result = [];
                this._entities.forEach((entity, id) => {
                    const hasAll = componentNames.every(name => entity.components.has(name));
                    if (hasAll) result.push(id);
                });
                return result;
            },
            
            registerSystem(name, componentFilter, updateFn, priority = 0) {
                this._systems.push({ name, componentFilter, updateFn, priority, enabled: true });
                this._systems.sort((a, b) => a.priority - b.priority);
            },
            
            update(dt) {
                this._systems.forEach(system => {
                    if (!system.enabled) return;
                    const entities = this.getEntitiesWith(system.componentFilter);
                    system.updateFn(dt, entities);
                });
            },
            
            clear() {
                this._entities.clear();
                this._nextEntity = 1;
            }
        };
        
        // Register common components
        ECS.registerComponent('Transform', { fields: ['x', 'y', 'z', 'rotation', 'scaleX', 'scaleY'] });
        ECS.registerComponent('Velocity', { fields: ['vx', 'vy', 'vz'] });
        ECS.registerComponent('Health', { fields: ['hp', 'maxHp', 'shield'] });
        ECS.registerComponent('Renderable', { fields: ['meshId', 'materialId', 'visible', 'layer'] });
        ECS.registerComponent('Collision', { fields: ['radius', 'mass', 'isStatic'] });
        ECS.registerComponent('AI', { fields: ['state', 'targetId', 'type'] });
        
        return ECS;
    },

    /**
     * Initialize Physics System
     */
    async initPhysics(config) {
        const physics = {
            verlet: null,
            softBody: null,
            fluid: null,
            destruction: null,
            
            async init() {
                // Try to load existing physics systems
                try {
                    const module = await import('/core/physics/index.js');
                    this.verlet = module.VerletPhysics ? new module.VerletPhysics(config) : null;
                    this.softBody = module.SoftBody ? new module.SoftBody(config) : null;
                    this.fluid = module.FluidSimulation ? new module.FluidSimulation(config) : null;
                    this.destruction = module.DestructionSystem ? new module.DestructionSystem(config) : null;
                } catch (e) {
                    console.log('[Physics] Using fallback physics');
                }
                return this;
            },
            
            update(dt) {
                if (this.verlet) this.verlet.update(dt);
                if (this.softBody) this.softBody.update(dt);
                if (this.fluid) this.fluid.update(dt);
                if (this.destruction) this.destruction.update(dt);
            },
            
            createSoftBody(x, y, width, height, type = 'rectangle') {
                if (this.softBody) {
                    if (type === 'circle') {
                        return this.softBody.createSoftCircle(x, y, Math.max(width, height) / 2);
                    }
                    return this.softBody.createSoftRectangle(x, y, width, height);
                }
                return null;
            },
            
            spawnFluidParticles(x, y, count, type = 'blood') {
                if (this.fluid) {
                    for (let i = 0; i < count; i++) {
                        this.fluid.addParticle(
                            x + (Math.random() - 0.5) * 20,
                            y + (Math.random() - 0.5) * 20,
                            type
                        );
                    }
                }
            },
            
            createDestruction(x, y, force, color) {
                if (this.destruction) {
                    this.destruction.createDebris(x, y, force, color);
                }
            }
        };
        
        await physics.init();
        return physics;
    },

    /**
     * Initialize Audio System
     */
    async initAudio() {
        const audio = {
            context: null,
            masterGain: null,
            musicSystem: null,
            spatialAudio: null,
            proceduralEngine: null,
            
            async init() {
                try {
                    this.context = new (window.AudioContext || window.webkitAudioContext)();
                    this.masterGain = this.context.createGain();
                    this.masterGain.connect(this.context.destination);
                    
                    // Try to load advanced audio systems
                    try {
                        const module = await import('/core/audio/DynamicMusicSystem.js');
                        this.musicSystem = new module.DynamicMusicSystem(this.context);
                    } catch (e) {
                        // Fallback music system
                        this.musicSystem = this.createFallbackMusicSystem();
                    }
                } catch (e) {
                    console.warn('[Audio] Web Audio not available');
                }
                return this;
            },
            
            createFallbackMusicSystem() {
                return {
                    intensity: 0,
                    layers: new Map(),
                    
                    createTrack(id, layers) {
                        this.layers.set(id, layers);
                    },
                    
                    play(id) {
                        console.log('[Audio] Playing track:', id);
                    },
                    
                    stop() {},
                    
                    setIntensity(value) {
                        this.intensity = Math.max(0, Math.min(1, value));
                    },
                    
                    triggerEvent(type) {
                        console.log('[Audio] Event:', type);
                    },
                    
                    update(dt) {}
                };
            },
            
            playSound(type, volume = 1.0) {
                if (!this.context) return;
                
                const osc = this.context.createOscillator();
                const gain = this.context.createGain();
                
                gain.gain.value = volume * 0.3;
                gain.connect(this.masterGain);
                osc.connect(gain);
                
                switch (type) {
                    case 'click':
                        osc.frequency.value = 800;
                        osc.type = 'sine';
                        break;
                    case 'hit':
                        osc.frequency.value = 200;
                        osc.type = 'square';
                        break;
                    case 'collect':
                        osc.frequency.value = 1200;
                        osc.type = 'sine';
                        break;
                    case 'jumpscare':
                        osc.frequency.value = 150;
                        osc.type = 'sawtooth';
                        break;
                    default:
                        osc.frequency.value = 440;
                        osc.type = 'sine';
                }
                
                osc.start();
                osc.stop(this.context.currentTime + 0.1);
            },
            
            setMasterVolume(volume) {
                if (this.masterGain) {
                    this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
                }
            },
            
            resume() {
                if (this.context && this.context.state === 'suspended') {
                    this.context.resume();
                }
            }
        };
        
        await audio.init();
        return audio;
    },

    /**
     * Initialize AI System
     */
    async initAI() {
        const ai = {
            behaviorTrees: new Map(),
            utilityAI: null,
            pathfinding: null,
            
            async init() {
                try {
                    const module = await import('/core/ai/index.js');
                    this.utilityAI = module.UtilityAI ? new module.UtilityAI() : null;
                } catch (e) {
                    console.log('[AI] Using fallback AI');
                }
                return this;
            },
            
            createBehaviorTree(id, config) {
                const tree = {
                    id,
                    root: config.root,
                    blackboard: config.blackboard || {},
                    
                    update(dt, context) {
                        if (this.root) {
                            return this.root.execute(this.blackboard, context);
                        }
                        return 'failure';
                    }
                };
                
                this.behaviorTrees.set(id, tree);
                return tree;
            },
            
            // Behavior tree nodes
            Selector: class {
                constructor(children) {
                    this.children = children || [];
                }
                execute(bb, ctx) {
                    for (const child of this.children) {
                        const result = child.execute(bb, ctx);
                        if (result === 'success') return 'success';
                        if (result === 'running') return 'running';
                    }
                    return 'failure';
                }
            },
            
            Sequence: class {
                constructor(children) {
                    this.children = children || [];
                }
                execute(bb, ctx) {
                    for (const child of this.children) {
                        const result = child.execute(bb, ctx);
                        if (result === 'failure') return 'failure';
                        if (result === 'running') return 'running';
                    }
                    return 'success';
                }
            },
            
            Action: class {
                constructor(fn) {
                    this.fn = fn;
                }
                execute(bb, ctx) {
                    return this.fn(bb, ctx);
                }
            },
            
            Condition: class {
                constructor(fn) {
                    this.fn = fn;
                }
                execute(bb, ctx) {
                    return this.fn(bb, ctx) ? 'success' : 'failure';
                }
            },
            
            update(dt) {
                this.behaviorTrees.forEach(tree => tree.update(dt));
            }
        };
        
        await ai.init();
        return ai;
    },

    /**
     * Initialize Progression System
     */
    async initProgression() {
        const progression = {
            data: new Map(),
            
            getGame(gameId) {
                if (!this.data.has(gameId)) {
                    this.data.set(gameId, {
                        xp: 0,
                        level: 1,
                        prestige: 0,
                        unlocks: new Set(),
                        achievements: new Set(),
                        stats: {
                            gamesPlayed: 0,
                            totalTime: 0,
                            highScore: 0
                        }
                    });
                }
                return this.data.get(gameId);
            },
            
            addXP(gameId, amount) {
                const game = this.getGame(gameId);
                game.xp += amount;
                
                const xpNeeded = this.getXPForLevel(game.level);
                while (game.xp >= xpNeeded) {
                    game.xp -= xpNeeded;
                    game.level++;
                    this.onLevelUp(gameId, game.level);
                }
                
                this.save(gameId);
                return game;
            },
            
            getXPForLevel(level) {
                return Math.floor(1000 * Math.pow(1.5, level - 1));
            },
            
            onLevelUp(gameId, level) {
                console.log(`[Progression] ${gameId} reached level ${level}`);
                // Dispatch event
                window.dispatchEvent(new CustomEvent('game:levelup', {
                    detail: { gameId, level }
                }));
            },
            
            unlock(gameId, item) {
                const game = this.getGame(gameId);
                game.unlocks.add(item);
                this.save(gameId);
            },
            
            hasUnlock(gameId, item) {
                const game = this.getGame(gameId);
                return game.unlocks.has(item);
            },
            
            addAchievement(gameId, achievementId) {
                const game = this.getGame(gameId);
                if (!game.achievements.has(achievementId)) {
                    game.achievements.add(achievementId);
                    this.save(gameId);
                    window.dispatchEvent(new CustomEvent('game:achievement', {
                        detail: { gameId, achievementId }
                    }));
                }
            },
            
            updateStats(gameId, stats) {
                const game = this.getGame(gameId);
                Object.assign(game.stats, stats);
                this.save(gameId);
            },
            
            save(gameId) {
                const game = this.getGame(gameId);
                localStorage.setItem(`sgai_progress_${gameId}`, JSON.stringify({
                    xp: game.xp,
                    level: game.level,
                    prestige: game.prestige,
                    unlocks: Array.from(game.unlocks),
                    achievements: Array.from(game.achievements),
                    stats: game.stats
                }));
            },
            
            load(gameId) {
                const saved = localStorage.getItem(`sgai_progress_${gameId}`);
                if (saved) {
                    const data = JSON.parse(saved);
                    const game = this.getGame(gameId);
                    game.xp = data.xp || 0;
                    game.level = data.level || 1;
                    game.prestige = data.prestige || 0;
                    game.unlocks = new Set(data.unlocks || []);
                    game.achievements = new Set(data.achievements || []);
                    game.stats = data.stats || {};
                }
            }
        };
        
        return progression;
    },

    /**
     * Initialize Save System
     */
    async initSave() {
        const save = {
            slots: new Map(),
            autoSaveInterval: 30000,
            autoSaveTimer: null,
            
            save(gameId, slotId, data) {
                const key = `sgai_save_${gameId}_${slotId}`;
                const saveData = {
                    version: 1,
                    timestamp: Date.now(),
                    data
                };
                localStorage.setItem(key, JSON.stringify(saveData));
                console.log(`[Save] Saved ${gameId} slot ${slotId}`);
                return true;
            },
            
            load(gameId, slotId) {
                const key = `sgai_save_${gameId}_${slotId}`;
                const saved = localStorage.getItem(key);
                if (saved) {
                    const saveData = JSON.parse(saved);
                    return saveData.data;
                }
                return null;
            },
            
            delete(gameId, slotId) {
                const key = `sgai_save_${gameId}_${slotId}`;
                localStorage.removeItem(key);
            },
            
            getSlots(gameId) {
                const slots = [];
                for (let i = 0; i < 5; i++) {
                    const key = `sgai_save_${gameId}_${i}`;
                    const saved = localStorage.getItem(key);
                    if (saved) {
                        const data = JSON.parse(saved);
                        slots.push({
                            id: i,
                            timestamp: data.timestamp,
                            exists: true
                        });
                    } else {
                        slots.push({ id: i, exists: false });
                    }
                }
                return slots;
            },
            
            enableAutoSave(gameId, saveFn, interval = 30000) {
                this.disableAutoSave();
                this.autoSaveTimer = setInterval(() => {
                    const data = saveFn();
                    this.save(gameId, 'auto', data);
                }, interval);
            },
            
            disableAutoSave() {
                if (this.autoSaveTimer) {
                    clearInterval(this.autoSaveTimer);
                    this.autoSaveTimer = null;
                }
            }
        };
        
        return save;
    },

    /**
     * Initialize Mobile System
     */
    async initMobile() {
        const mobile = {
            isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
            touches: new Map(),
            virtualJoystick: null,
            buttons: [],
            
            init() {
                if (!this.isMobile) return this;
                
                document.body.classList.add('mobile');
                this.setupTouchHandlers();
                return this;
            },
            
            setupTouchHandlers() {
                document.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
                document.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
                document.addEventListener('touchend', (e) => this.onTouchEnd(e), { passive: false });
            },
            
            onTouchStart(e) {
                for (const touch of e.changedTouches) {
                    this.touches.set(touch.identifier, {
                        startX: touch.clientX,
                        startY: touch.clientY,
                        currentX: touch.clientX,
                        currentY: touch.clientY
                    });
                }
            },
            
            onTouchMove(e) {
                for (const touch of e.changedTouches) {
                    const t = this.touches.get(touch.identifier);
                    if (t) {
                        t.currentX = touch.clientX;
                        t.currentY = touch.clientY;
                    }
                }
            },
            
            onTouchEnd(e) {
                for (const touch of e.changedTouches) {
                    this.touches.delete(touch.identifier);
                }
            },
            
            createVirtualJoystick(container, options = {}) {
                const joystick = {
                    x: 0,
                    y: 0,
                    active: false,
                    element: null,
                    
                    create() {
                        const el = document.createElement('div');
                        el.className = 'virtual-joystick';
                        el.innerHTML = `
                            <div class="joystick-base">
                                <div class="joystick-stick"></div>
                            </div>
                        `;
                        el.style.cssText = `
                            position: fixed;
                            bottom: 80px;
                            left: 40px;
                            width: 120px;
                            height: 120px;
                            z-index: 1000;
                        `;
                        container.appendChild(el);
                        this.element = el;
                        return this;
                    },
                    
                    update(touch) {
                        if (!touch) {
                            this.x = 0;
                            this.y = 0;
                            this.active = false;
                            return;
                        }
                        
                        const dx = touch.currentX - touch.startX;
                        const dy = touch.currentY - touch.startY;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        const maxDist = 50;
                        
                        this.active = true;
                        this.x = dist > 0 ? (dx / dist) * Math.min(dist, maxDist) / maxDist : 0;
                        this.y = dist > 0 ? (dy / dist) * Math.min(dist, maxDist) / maxDist : 0;
                    },
                    
                    destroy() {
                        if (this.element) {
                            this.element.remove();
                        }
                    }
                };
                
                this.virtualJoystick = joystick.create();
                return joystick;
            },
            
            createButton(container, options) {
                const btn = document.createElement('button');
                btn.className = 'virtual-button';
                btn.textContent = options.label || '';
                btn.style.cssText = `
                    position: fixed;
                    width: ${options.size || 60}px;
                    height: ${options.size || 60}px;
                    border-radius: 50%;
                    background: rgba(255,255,255,0.3);
                    border: 2px solid rgba(255,255,255,0.5);
                    color: white;
                    font-size: 20px;
                    z-index: 1000;
                    ${options.position || 'bottom: 80px; right: 40px;'}
                `;
                
                btn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    options.onPress && options.onPress();
                });
                
                btn.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    options.onRelease && options.onRelease();
                });
                
                container.appendChild(btn);
                this.buttons.push(btn);
                return btn;
            },
            
            update() {
                if (this.virtualJoystick && this.touches.size > 0) {
                    const touch = this.touches.values().next().value;
                    this.virtualJoystick.update(touch);
                }
            },
            
            getJoystickInput() {
                if (this.virtualJoystick) {
                    return { x: this.virtualJoystick.x, y: this.virtualJoystick.y };
                }
                return { x: 0, y: 0 };
            }
        };
        
        mobile.init();
        return mobile;
    },

    /**
     * Initialize Accessibility System
     */
    async initAccessibility() {
        const accessibility = {
            settings: {
                colorblindMode: 'none', // none, protanopia, deuteranopia, tritanopia
                screenReader: false,
                highContrast: false,
                largeText: false,
                reducedMotion: false,
                subtitles: true
            },
            
            init() {
                this.loadSettings();
                this.applySettings();
                return this;
            },
            
            loadSettings() {
                const saved = localStorage.getItem('sgai_accessibility');
                if (saved) {
                    Object.assign(this.settings, JSON.parse(saved));
                }
            },
            
            saveSettings() {
                localStorage.setItem('sgai_accessibility', JSON.stringify(this.settings));
            },
            
            applySettings() {
                const root = document.documentElement;
                
                // Colorblind mode
                root.setAttribute('data-colorblind', this.settings.colorblindMode);
                
                // High contrast
                root.setAttribute('data-high-contrast', this.settings.highContrast);
                
                // Large text
                root.setAttribute('data-large-text', this.settings.largeText);
                
                // Reduced motion
                if (this.settings.reducedMotion) {
                    root.style.setProperty('--animation-duration', '0s');
                }
            },
            
            setColorblindMode(mode) {
                this.settings.colorblindMode = mode;
                this.applySettings();
                this.saveSettings();
            },
            
            toggleHighContrast() {
                this.settings.highContrast = !this.settings.highContrast;
                this.applySettings();
                this.saveSettings();
            },
            
            toggleLargeText() {
                this.settings.largeText = !this.settings.largeText;
                this.applySettings();
                this.saveSettings();
            },
            
            toggleReducedMotion() {
                this.settings.reducedMotion = !this.settings.reducedMotion;
                this.applySettings();
                this.saveSettings();
            },
            
            // Color transformation for colorblind modes
            transformColor(color) {
                if (this.settings.colorblindMode === 'none') return color;
                
                // Simple color transformation matrices
                const matrices = {
                    protanopia: [0.567, 0.433, 0, 0.558, 0.442, 0, 0, 0.242, 0.758],
                    deuteranopia: [0.625, 0.375, 0, 0.7, 0.3, 0, 0, 0.3, 0.7],
                    tritanopia: [0.95, 0.05, 0, 0, 0.433, 0.567, 0, 0.475, 0.525]
                };
                
                const matrix = matrices[this.settings.colorblindMode];
                if (!matrix) return color;
                
                // Parse color and apply transformation
                // Simplified - would need full color parsing for production
                return color;
            },
            
            announce(message) {
                if (this.settings.screenReader) {
                    const announcement = document.createElement('div');
                    announcement.setAttribute('role', 'alert');
                    announcement.setAttribute('aria-live', 'polite');
                    announcement.className = 'sr-only';
                    announcement.textContent = message;
                    document.body.appendChild(announcement);
                    setTimeout(() => announcement.remove(), 1000);
                }
            }
        };
        
        return accessibility.init();
    },

    /**
     * Initialize Analytics System
     */
    async initAnalytics() {
        const analytics = {
            events: [],
            sessionStart: Date.now(),
            
            track(event, data = {}) {
                const entry = {
                    event,
                    data,
                    timestamp: Date.now(),
                    sessionTime: Date.now() - this.sessionStart
                };
                
                this.events.push(entry);
                
                // Send to analytics endpoint if available
                if (window.analyticsEndpoint) {
                    navigator.sendBeacon(window.analyticsEndpoint, JSON.stringify(entry));
                }
                
                // Console log in development
                if (window.location.hostname === 'localhost') {
                    console.log('[Analytics]', event, data);
                }
            },
            
            trackGameStart(gameId) {
                this.track('game_start', { gameId });
            },
            
            trackGameEnd(gameId, score, duration) {
                this.track('game_end', { gameId, score, duration });
            },
            
            trackEvent(gameId, eventType, value) {
                this.track('game_event', { gameId, eventType, value });
            },
            
            getEvents() {
                return this.events;
            },
            
            getSessionDuration() {
                return Date.now() - this.sessionStart;
            }
        };
        
        return analytics;
    },

    /**
     * Set active game
     */
    setActiveGame(gameId, gameInstance) {
        this.activeGame = { id: gameId, instance: gameInstance };
        console.log(`[GameEngine] Active game: ${gameId}`);
    },

    /**
     * Get active game
     */
    getActiveGame() {
        return this.activeGame;
    },

    /**
     * Main update loop
     */
    update(dt) {
        const startTime = performance.now();
        
        // Update ECS
        if (this.systems.ecs) {
            this.systems.ecs.update(dt);
        }
        
        // Update Physics
        if (this.systems.physics) {
            this.systems.physics.update(dt);
        }
        
        // Update AI
        if (this.systems.ai) {
            this.systems.ai.update(dt);
        }
        
        // Update Audio
        if (this.systems.audio && this.systems.audio.musicSystem) {
            this.systems.audio.musicSystem.update(dt);
        }
        
        // Update Mobile
        if (this.systems.mobile) {
            this.systems.mobile.update();
        }
        
        this.performance.updateTime = performance.now() - startTime;
    },

    /**
     * Cleanup
     */
    destroy() {
        if (this.systems.audio) {
            this.systems.audio.context?.close();
        }
        if (this.systems.save) {
            this.systems.save.disableAutoSave();
        }
        this.initialized = false;
    }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameEngineIntegration;
} else {
    window.GameEngineIntegration = GameEngineIntegration;
    window.SGAI = SGAI;
    SGAI.GameEngine = GameEngineIntegration;
}

export default GameEngineIntegration;
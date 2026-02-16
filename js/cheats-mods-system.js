/* ============================================
   ScaryGamesAI — Cheats & Mods System
   Premium features for Elder God tier subscribers
   ============================================ */

(function () {
    'use strict';

    // ═══════════════════════════════════════════════════════════════
    // TIER CHECKING
    // ═══════════════════════════════════════════════════════════════

    const TIER_LEVELS = { none: 0, lite: 1, pro: 2, max: 3 };

    function getUserTier() {
        return localStorage.getItem('sgai-sub-tier') || 'none';
    }

    function isElderGod() {
        return TIER_LEVELS[getUserTier()] >= TIER_LEVELS.max;
    }

    function isHunter() {
        return TIER_LEVELS[getUserTier()] >= TIER_LEVELS.pro;
    }

    function isSubscriber() {
        return TIER_LEVELS[getUserTier()] >= TIER_LEVELS.lite;
    }

    // ═══════════════════════════════════════════════════════════════
    // CHEATS DATABASE
    // ═══════════════════════════════════════════════════════════════

    const CHEATS_DB = {
        // Universal cheats (work in all games)
        universal: {
            godMode: {
                id: 'godMode',
                name: 'God Mode',
                desc: 'Invincibility - Cannot take damage',
                icon: '🛡️',
                tier: 'max',
                category: 'survival',
                defaultValue: false,
            },
            infiniteStamina: {
                id: 'infiniteStamina',
                name: 'Infinite Stamina',
                desc: 'Never run out of energy',
                icon: '⚡',
                tier: 'max',
                category: 'survival',
                defaultValue: false,
            },
            superSpeed: {
                id: 'superSpeed',
                name: 'Super Speed',
                desc: 'Move 2x faster than normal',
                icon: '💨',
                tier: 'max',
                category: 'movement',
                defaultValue: false,
            },
            noclip: {
                id: 'noclip',
                name: 'Noclip',
                desc: 'Walk through walls',
                icon: '👻',
                tier: 'max',
                category: 'movement',
                defaultValue: false,
            },
            infiniteJump: {
                id: 'infiniteJump',
                name: 'Infinite Jump',
                desc: 'Jump unlimited times in the air',
                icon: '🦘',
                tier: 'max',
                category: 'movement',
                defaultValue: false,
            },
            oneHitKill: {
                id: 'oneHitKill',
                name: 'One Hit Kill',
                desc: 'Destroy enemies instantly',
                icon: '💀',
                tier: 'max',
                category: 'combat',
                defaultValue: false,
            },
            invisibleToEnemies: {
                id: 'invisibleToEnemies',
                name: 'Invisibility',
                desc: 'Enemies cannot see you',
                icon: '👁️',
                tier: 'max',
                category: 'stealth',
                defaultValue: false,
            },
            infiniteAmmo: {
                id: 'infiniteAmmo',
                name: 'Infinite Ammo',
                desc: 'Never run out of ammunition',
                icon: '🔫',
                tier: 'max',
                category: 'combat',
                defaultValue: false,
            },
            noReload: {
                id: 'noReload',
                name: 'No Reload',
                desc: 'Weapons never need reloading',
                icon: '🔄',
                tier: 'max',
                category: 'combat',
                defaultValue: false,
            },
            timeSlow: {
                id: 'timeSlow',
                name: 'Time Slow',
                desc: 'Slow down time by 50%',
                icon: '⏱️',
                tier: 'max',
                category: 'gameplay',
                defaultValue: false,
            },
            nightVision: {
                id: 'nightVision',
                name: 'Night Vision',
                desc: 'See clearly in the dark',
                icon: '🦉',
                tier: 'max',
                category: 'visual',
                defaultValue: false,
            },
            xrayVision: {
                id: 'xrayVision',
                name: 'X-Ray Vision',
                desc: 'See through walls to enemies/items',
                icon: '🔍',
                tier: 'max',
                category: 'visual',
                defaultValue: false,
            },
            autoCollect: {
                id: 'autoCollect',
                name: 'Auto Collect',
                desc: 'Automatically collect nearby items',
                icon: '🧲',
                tier: 'max',
                category: 'gameplay',
                defaultValue: false,
            },
            scoreMultiplier: {
                id: 'scoreMultiplier',
                name: 'Score Multiplier',
                desc: 'Double all points earned',
                icon: '✨',
                tier: 'max',
                category: 'gameplay',
                defaultValue: false,
            },
            showFPS: {
                id: 'showFPS',
                name: 'Show FPS',
                desc: 'Display frames per second',
                icon: '📊',
                tier: 'pro',
                category: 'debug',
                defaultValue: false,
            },
            showHitboxes: {
                id: 'showHitboxes',
                name: 'Show Hitboxes',
                desc: 'Display collision boxes',
                icon: '📦',
                tier: 'max',
                category: 'debug',
                defaultValue: false,
            },
            teleportToStart: {
                id: 'teleportToStart',
                name: 'Teleport to Start',
                desc: 'Instantly return to start point',
                icon: '🏠',
                tier: 'max',
                category: 'utility',
                type: 'action',
            },
            skipLevel: {
                id: 'skipLevel',
                name: 'Skip Level',
                desc: 'Skip current level (when available)',
                icon: '⏭️',
                tier: 'max',
                category: 'utility',
                type: 'action',
            },
        },

        // Game-specific cheats
        games: {
            'backrooms-pacman': {
                noBlackout: {
                    id: 'noBlackout',
                    name: 'No Blackout',
                    desc: 'Disable random blackouts',
                    icon: '💡',
                    tier: 'max',
                    category: 'gameplay',
                    defaultValue: false,
                },
                slowerPacman: {
                    id: 'slowerPacman',
                    name: 'Slower Pac-Man',
                    desc: 'Pac-Man moves 50% slower',
                    icon: '🐢',
                    tier: 'max',
                    category: 'difficulty',
                    defaultValue: false,
                },
                showPacmanOnMap: {
                    id: 'showPacmanOnMap',
                    name: 'Pac-Man Tracker',
                    desc: 'Show Pac-Man position on minimap',
                    icon: '📍',
                    tier: 'max',
                    category: 'visual',
                    defaultValue: false,
                },
                superCollectRange: {
                    id: 'superCollectRange',
                    name: 'Magnetic Pellets',
                    desc: 'Collect pellets from further away',
                    icon: '🧲',
                    tier: 'max',
                    category: 'gameplay',
                    defaultValue: false,
                },
            },
            'shadow-crawler': {
                infiniteTorch: {
                    id: 'infiniteTorch',
                    name: 'Infinite Torch',
                    desc: 'Torch never runs out',
                    icon: '🔥',
                    tier: 'max',
                    category: 'survival',
                    defaultValue: false,
                },
                showShadows: {
                    id: 'showShadows',
                    name: 'See Shadows',
                    desc: 'Shadow creatures are always visible',
                    icon: '👁️',
                    tier: 'max',
                    category: 'visual',
                    defaultValue: false,
                },
            },
            'the-abyss': {
                infiniteOxygen: {
                    id: 'infiniteOxygen',
                    name: 'Infinite Oxygen',
                    desc: 'Never run out of oxygen',
                    icon: '🫁',
                    tier: 'max',
                    category: 'survival',
                    defaultValue: false,
                },
                noPressureDamage: {
                    id: 'noPressureDamage',
                    name: 'Pressure Immunity',
                    desc: 'Ignore deep water pressure',
                    icon: '🌊',
                    tier: 'max',
                    category: 'survival',
                    defaultValue: false,
                },
            },
            'nightmare-run': {
                autoDodge: {
                    id: 'autoDodge',
                    name: 'Auto Dodge',
                    desc: 'Automatically avoid obstacles',
                    icon: '🤖',
                    tier: 'max',
                    category: 'gameplay',
                    defaultValue: false,
                },
            },
            'blood-tetris': {
                noBloodRise: {
                    id: 'noBloodRise',
                    name: 'No Blood Rise',
                    desc: 'Blood level stays constant',
                    icon: '🩸',
                    tier: 'max',
                    category: 'gameplay',
                    defaultValue: false,
                },
                perfectDrop: {
                    id: 'perfectDrop',
                    name: 'Perfect Drop',
                    desc: 'Ghost piece shows exact placement',
                    icon: '👻',
                    tier: 'max',
                    category: 'gameplay',
                    defaultValue: false,
                },
            },
            'zombie-horde': {
                instantBuild: {
                    id: 'instantBuild',
                    name: 'Instant Build',
                    desc: 'Turrets build instantly',
                    icon: '⚡',
                    tier: 'max',
                    category: 'gameplay',
                    defaultValue: false,
                },
                superDamage: {
                    id: 'superDamage',
                    name: 'Super Damage',
                    desc: 'Turrets deal 3x damage',
                    icon: '💥',
                    tier: 'max',
                    category: 'combat',
                    defaultValue: false,
                },
            },
            'freddys-nightmare': {
                infinitePower: {
                    id: 'infinitePower',
                    name: 'Infinite Power',
                    desc: 'Power never drains',
                    icon: '🔋',
                    tier: 'max',
                    category: 'survival',
                    defaultValue: false,
                },
                showAnimatronics: {
                    id: 'showAnimatronics',
                    name: 'Animatronic Radar',
                    desc: 'Always know where animatronics are',
                    icon: '📡',
                    tier: 'max',
                    category: 'visual',
                    defaultValue: false,
                },
            },
        },
    };

    // ═══════════════════════════════════════════════════════════════
    // CHEATS MANAGER
    // ═══════════════════════════════════════════════════════════════

    const CheatsManager = {
        activeCheats: {},
        gameId: null,
        onCheatsChange: null,
        panel: null,

        init(gameId) {
            this.gameId = gameId;
            this.load();
        },

        load() {
            try {
                const raw = localStorage.getItem('sgai_cheats');
                const allCheats = raw ? JSON.parse(raw) : {};
                this.activeCheats = allCheats[this.gameId] || {};
            } catch (e) {
                this.activeCheats = {};
            }
        },

        save() {
            try {
                const raw = localStorage.getItem('sgai_cheats');
                const allCheats = raw ? JSON.parse(raw) : {};
                allCheats[this.gameId] = this.activeCheats;
                localStorage.setItem('sgai_cheats', JSON.stringify(allCheats));
            } catch (e) {}
        },

        getAvailableCheats() {
            const cheats = { ...CHEATS_DB.universal };
            
            if (this.gameId && CHEATS_DB.games[this.gameId]) {
                Object.assign(cheats, CHEATS_DB.games[this.gameId]);
            }
            
            // Filter by tier
            const userTier = TIER_LEVELS[getUserTier()];
            const filtered = {};
            
            for (const [id, cheat] of Object.entries(cheats)) {
                const requiredTier = TIER_LEVELS[cheat.tier] || 0;
                if (userTier >= requiredTier) {
                    filtered[id] = cheat;
                }
            }
            
            return filtered;
        },

        isActive(cheatId) {
            return this.activeCheats[cheatId] === true;
        },

        toggle(cheatId) {
            if (!isElderGod() && !isHunter()) {
                this._showUpgradePrompt();
                return false;
            }
            
            this.activeCheats[cheatId] = !this.activeCheats[cheatId];
            this.save();
            
            if (this.onCheatsChange) {
                this.onCheatsChange(cheatId, this.activeCheats[cheatId]);
            }
            
            return this.activeCheats[cheatId];
        },

        set(cheatId, value) {
            if (!isElderGod() && !isHunter()) {
                this._showUpgradePrompt();
                return;
            }
            
            this.activeCheats[cheatId] = value;
            this.save();
            
            if (this.onCheatsChange) {
                this.onCheatsChange(cheatId, value);
            }
        },

        executeAction(cheatId) {
            if (!isElderGod()) {
                this._showUpgradePrompt();
                return;
            }
            
            window.dispatchEvent(new CustomEvent('sgai-cheat-action', {
                detail: { cheatId, gameId: this.gameId }
            }));
        },

        reset() {
            this.activeCheats = {};
            this.save();
            
            if (this.onCheatsChange) {
                this.onCheatsChange(null, null);
            }
        },

        getAllActive() {
            return { ...this.activeCheats };
        },

        _showUpgradePrompt() {
            if (typeof ScaryStore !== 'undefined') {
                alert('🔓 Upgrade to Elder God tier to unlock cheats!\n\nSubscribe at scarygames.ai/subscription.html');
            } else {
                window.location.href = '/subscription.html';
            }
        },

        // UI
        createPanel() {
            if (this.panel) return this.panel;
            
            const availableCheats = this.getAvailableCheats();
            
            // Group cheats by category
            const categories = {};
            for (const [id, cheat] of Object.entries(availableCheats)) {
                if (!categories[cheat.category]) {
                    categories[cheat.category] = [];
                }
                categories[cheat.category].push(cheat);
            }

            const categoryNames = {
                survival: '🛡️ Survival',
                movement: '🏃 Movement',
                combat: '⚔️ Combat',
                stealth: '🤫 Stealth',
                gameplay: '🎮 Gameplay',
                visual: '👁️ Visual',
                debug: '🔧 Debug',
                utility: '🛠️ Utility',
                difficulty: '⚖️ Difficulty',
            };

            this.panel = document.createElement('div');
            this.panel.className = 'cheats-panel';
            this.panel.innerHTML = `
                <div class="cheats-header">
                    <h3>🎮 Cheats & Mods</h3>
                    <span class="cheats-tier-badge ${getUserTier()}">${this._getTierName(getUserTier())}</span>
                    <button class="cheats-close" aria-label="Close cheats">✕</button>
                </div>
                <div class="cheats-warning">
                    ⚠️ Cheats disable leaderboard submissions
                </div>
                <div class="cheats-categories">
                    ${Object.entries(categories).map(([cat, cheats]) => `
                        <div class="cheat-category" data-category="${cat}">
                            <div class="cheat-category-header">${categoryNames[cat] || cat}</div>
                            <div class="cheat-category-items">
                                ${cheats.map(cheat => `
                                    <div class="cheat-item ${cheat.type === 'action' ? 'action' : ''}" data-cheat="${cheat.id}">
                                        <div class="cheat-icon">${cheat.icon}</div>
                                        <div class="cheat-info">
                                            <div class="cheat-name">${cheat.name}</div>
                                            <div class="cheat-desc">${cheat.desc}</div>
                                        </div>
                                        ${cheat.type === 'action' ? `
                                            <button class="cheat-action-btn">Activate</button>
                                        ` : `
                                            <label class="cheat-toggle">
                                                <input type="checkbox" ${this.isActive(cheat.id) ? 'checked' : ''}>
                                                <span class="cheat-slider"></span>
                                            </label>
                                        `}
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div class="cheats-footer">
                    <button class="cheats-reset">Reset All Cheats</button>
                </div>
            `;

            // Bind events
            this.panel.querySelectorAll('.cheat-item').forEach(item => {
                const cheatId = item.dataset.cheat;
                const toggle = item.querySelector('input[type="checkbox"]');
                const actionBtn = item.querySelector('.cheat-action-btn');
                
                if (toggle) {
                    toggle.addEventListener('change', () => {
                        this.toggle(cheatId);
                        item.classList.toggle('active', this.isActive(cheatId));
                    });
                }
                
                if (actionBtn) {
                    actionBtn.addEventListener('click', () => {
                        this.executeAction(cheatId);
                    });
                }
            });

            this.panel.querySelector('.cheats-close').addEventListener('click', () => {
                this.hidePanel();
            });

            this.panel.querySelector('.cheats-reset').addEventListener('click', () => {
                if (confirm('Reset all cheats to off?')) {
                    this.reset();
                    this.panel.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
                    this.panel.querySelectorAll('.cheat-item').forEach(item => item.classList.remove('active'));
                }
            });

            return this.panel;
        },

        showPanel() {
            if (!this.panel) {
                this.createPanel();
            }
            this.panel.classList.add('visible');
            document.body.appendChild(this.panel);
        },

        hidePanel() {
            if (this.panel) {
                this.panel.classList.remove('visible');
            }
        },

        togglePanel() {
            if (this.panel && this.panel.classList.contains('visible')) {
                this.hidePanel();
            } else {
                this.showPanel();
            }
        },

        _getTierName(tier) {
            const names = { none: 'Free', lite: 'Survivor', pro: 'Hunter', max: 'Elder God' };
            return names[tier] || tier;
        },
    };

    // ═══════════════════════════════════════════════════════════════
    // MOD LOADER
    // ═══════════════════════════════════════════════════════════════

    const ModLoader = {
        mods: [],
        activeMods: [],
        storageKey: 'sgai_game_mods',

        init() {
            this.loadMods();
        },

        loadMods() {
            try {
                const raw = localStorage.getItem(this.storageKey);
                this.mods = raw ? JSON.parse(raw) : this._getDefaultMods();
            } catch (e) {
                this.mods = this._getDefaultMods();
            }
        },

        _getDefaultMods() {
            return [
                // Preset mods for Elder God tier
                {
                    id: 'golden-player',
                    name: 'Golden Aura',
                    desc: 'Surround yourself with golden particles',
                    type: 'skin',
                    gameId: '*',
                    tier: 'max',
                    data: { effect: 'golden_aura' },
                    enabled: false,
                },
                {
                    id: 'trail-fire',
                    name: 'Fire Trail',
                    desc: 'Leave a trail of fire as you move',
                    type: 'effect',
                    gameId: '*',
                    tier: 'max',
                    data: { effect: 'fire_trail' },
                    enabled: false,
                },
                {
                    id: 'trail-void',
                    name: 'Void Trail',
                    desc: 'Leave a dark void trail behind you',
                    type: 'effect',
                    gameId: '*',
                    tier: 'max',
                    data: { effect: 'void_trail' },
                    enabled: false,
                },
                {
                    id: 'big-head',
                    name: 'Big Head Mode',
                    desc: 'Everyone has big heads',
                    type: 'cosmetic',
                    gameId: '*',
                    tier: 'max',
                    data: { scale: 2.0 },
                    enabled: false,
                },
                {
                    id: 'retro-mode',
                    name: 'Retro Mode',
                    desc: 'Pixelated graphics filter',
                    type: 'visual',
                    gameId: '*',
                    tier: 'max',
                    data: { filter: 'pixelate', strength: 4 },
                    enabled: false,
                },
                {
                    id: 'vhs-mode',
                    name: 'VHS Mode',
                    desc: 'VHS tape visual effect',
                    type: 'visual',
                    gameId: '*',
                    tier: 'max',
                    data: { filter: 'vhs' },
                    enabled: false,
                },
                {
                    id: 'custom-crosshair',
                    name: 'Custom Crosshair',
                    desc: 'Choose from different crosshair styles',
                    type: 'hud',
                    gameId: '*',
                    tier: 'pro',
                    data: { style: 'dot' },
                    enabled: false,
                },
                {
                    id: 'damage-numbers',
                    name: 'Damage Numbers',
                    desc: 'Show floating damage numbers',
                    type: 'hud',
                    gameId: '*',
                    tier: 'pro',
                    data: { enabled: true },
                    enabled: false,
                },
            ];
        },

        saveMods() {
            try {
                localStorage.setItem(this.storageKey, JSON.stringify(this.mods));
            } catch (e) {}
        },

        getAvailableMods(gameId = '*') {
            const userTier = TIER_LEVELS[getUserTier()];
            
            return this.mods.filter(mod => {
                const requiredTier = TIER_LEVELS[mod.tier] || 0;
                const tierOk = userTier >= requiredTier;
                const gameOk = mod.gameId === '*' || mod.gameId === gameId;
                return tierOk && gameOk;
            });
        },

        enableMod(modId) {
            const mod = this.mods.find(m => m.id === modId);
            if (mod) {
                const requiredTier = TIER_LEVELS[mod.tier] || 0;
                if (TIER_LEVELS[getUserTier()] < requiredTier) {
                    CheatsManager._showUpgradePrompt();
                    return false;
                }
                mod.enabled = true;
                this.saveMods();
                this._notifyChange(mod);
                return true;
            }
            return false;
        },

        disableMod(modId) {
            const mod = this.mods.find(m => m.id === modId);
            if (mod) {
                mod.enabled = false;
                this.saveMods();
                this._notifyChange(mod);
            }
        },

        toggleMod(modId) {
            const mod = this.mods.find(m => m.id === modId);
            if (mod) {
                return mod.enabled ? (this.disableMod(modId), false) : this.enableMod(modId);
            }
            return false;
        },

        getActiveMods(gameId = '*') {
            return this.mods.filter(m => 
                m.enabled && 
                (m.gameId === '*' || m.gameId === gameId)
            );
        },

        isModActive(modId) {
            const mod = this.mods.find(m => m.id === modId);
            return mod ? mod.enabled : false;
        },

        addMod(mod) {
            if (!mod.id || !mod.name) return false;
            
            const existing = this.mods.findIndex(m => m.id === mod.id);
            if (existing >= 0) {
                this.mods[existing] = { ...this.mods[existing], ...mod };
            } else {
                this.mods.push({ ...mod, enabled: false });
            }
            this.saveMods();
            return true;
        },

        removeMod(modId) {
            this.mods = this.mods.filter(m => m.id !== modId);
            this.saveMods();
        },

        importMod(jsonStr) {
            try {
                const mod = JSON.parse(jsonStr);
                mod.id = `imported_${Date.now()}`;
                return this.addMod(mod);
            } catch (e) {
                return false;
            }
        },

        exportMod(modId) {
            const mod = this.mods.find(m => m.id === modId);
            return mod ? JSON.stringify(mod, null, 2) : null;
        },

        _notifyChange(mod) {
            window.dispatchEvent(new CustomEvent('sgai-mod-changed', {
                detail: { mod, activeMods: this.getActiveMods() }
            }));
        },
    };

    // ═══════════════════════════════════════════════════════════════
    // CHEAT BUTTON FOR GAMES
    // ═══════════════════════════════════════════════════════════════

    function createCheatButton() {
        const btn = document.createElement('button');
        btn.className = 'cheats-toggle-btn';
        btn.innerHTML = `
            <span class="cheats-icon">🎮</span>
            <span class="cheats-label">Cheats</span>
        `;
        btn.title = 'Open Cheats & Mods (Elder God only)';
        
        btn.addEventListener('click', () => {
            CheatsManager.togglePanel();
        });

        return btn;
    }

    // ═══════════════════════════════════════════════════════════════
    // STYLES
    // ═══════════════════════════════════════════════════════════════

    function injectStyles() {
        if (document.getElementById('cheats-mods-styles')) return;

        const style = document.createElement('style');
        style.id = 'cheats-mods-styles';
        style.textContent = `
            /* Cheats Toggle Button */
            .cheats-toggle-btn {
                position: fixed;
                top: 70px;
                right: 16px;
                z-index: 1500;
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 8px 14px;
                background: rgba(139, 92, 246, 0.2);
                border: 1px solid rgba(139, 92, 246, 0.4);
                border-radius: 8px;
                color: #a78bfa;
                font-size: 13px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .cheats-toggle-btn:hover {
                background: rgba(139, 92, 246, 0.3);
                border-color: #a78bfa;
            }
            
            .cheats-icon {
                font-size: 16px;
            }

            /* Cheats Panel */
            .cheats-panel {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) scale(0.9);
                width: 90%;
                max-width: 500px;
                max-height: 80vh;
                background: var(--bg-secondary, #12121a);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 16px;
                box-shadow: 0 25px 50px rgba(0, 0, 0, 0.6), 0 0 100px rgba(139, 92, 246, 0.2);
                z-index: 10000;
                overflow: hidden;
                opacity: 0;
                visibility: hidden;
                transition: all 0.2s ease;
            }
            
            .cheats-panel.visible {
                opacity: 1;
                visibility: visible;
                transform: translate(-50%, -50%) scale(1);
            }
            
            .cheats-header {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 16px 20px;
                background: rgba(0, 0, 0, 0.3);
                border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            }
            
            .cheats-header h3 {
                flex: 1;
                margin: 0;
                font-size: 18px;
                color: white;
            }
            
            .cheats-tier-badge {
                padding: 4px 10px;
                border-radius: 12px;
                font-size: 11px;
                font-weight: 600;
                text-transform: uppercase;
            }
            
            .cheats-tier-badge.none { background: #333; color: #888; }
            .cheats-tier-badge.lite { background: rgba(139, 92, 246, 0.3); color: #a78bfa; }
            .cheats-tier-badge.pro { background: rgba(255, 107, 53, 0.3); color: #ff8c5a; }
            .cheats-tier-badge.max { background: rgba(204, 17, 34, 0.3); color: #ff4d5a; }
            
            .cheats-close {
                width: 32px;
                height: 32px;
                background: none;
                border: none;
                color: rgba(255, 255, 255, 0.5);
                font-size: 20px;
                cursor: pointer;
                border-radius: 6px;
                transition: all 0.2s;
            }
            
            .cheats-close:hover {
                background: rgba(255, 255, 255, 0.1);
                color: white;
            }
            
            .cheats-warning {
                padding: 10px 20px;
                background: rgba(255, 77, 90, 0.15);
                border-bottom: 1px solid rgba(255, 77, 90, 0.2);
                color: #ff8a8a;
                font-size: 12px;
                text-align: center;
            }
            
            .cheats-categories {
                max-height: 50vh;
                overflow-y: auto;
                padding: 16px;
            }
            
            .cheat-category {
                margin-bottom: 20px;
            }
            
            .cheat-category-header {
                font-size: 12px;
                font-weight: 600;
                color: rgba(255, 255, 255, 0.5);
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 10px;
                padding-bottom: 6px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            }
            
            .cheat-item {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 10px 12px;
                background: rgba(255, 255, 255, 0.02);
                border: 1px solid transparent;
                border-radius: 8px;
                margin-bottom: 6px;
                transition: all 0.15s;
            }
            
            .cheat-item:hover {
                background: rgba(255, 255, 255, 0.05);
            }
            
            .cheat-item.active {
                background: rgba(0, 255, 136, 0.1);
                border-color: rgba(0, 255, 136, 0.3);
            }
            
            .cheat-icon {
                font-size: 24px;
                width: 32px;
                text-align: center;
            }
            
            .cheat-info {
                flex: 1;
            }
            
            .cheat-name {
                font-size: 14px;
                font-weight: 500;
                color: white;
            }
            
            .cheat-desc {
                font-size: 12px;
                color: rgba(255, 255, 255, 0.5);
                margin-top: 2px;
            }
            
            .cheat-toggle {
                position: relative;
                width: 44px;
                height: 24px;
            }
            
            .cheat-toggle input {
                opacity: 0;
                width: 0;
                height: 0;
            }
            
            .cheat-slider {
                position: absolute;
                cursor: pointer;
                inset: 0;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 12px;
                transition: 0.2s;
            }
            
            .cheat-slider::before {
                content: '';
                position: absolute;
                height: 18px;
                width: 18px;
                left: 3px;
                bottom: 3px;
                background: white;
                border-radius: 50%;
                transition: 0.2s;
            }
            
            .cheat-toggle input:checked + .cheat-slider {
                background: var(--accent-green, #00ff88);
            }
            
            .cheat-toggle input:checked + .cheat-slider::before {
                transform: translateX(20px);
            }
            
            .cheat-action-btn {
                padding: 6px 14px;
                background: rgba(139, 92, 246, 0.3);
                border: 1px solid rgba(139, 92, 246, 0.4);
                border-radius: 6px;
                color: #a78bfa;
                font-size: 12px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .cheat-action-btn:hover {
                background: rgba(139, 92, 246, 0.4);
            }
            
            .cheats-footer {
                padding: 16px;
                background: rgba(0, 0, 0, 0.2);
                border-top: 1px solid rgba(255, 255, 255, 0.05);
            }
            
            .cheats-reset {
                width: 100%;
                padding: 10px;
                background: none;
                border: 1px solid rgba(255, 77, 90, 0.3);
                border-radius: 6px;
                color: #ff8a8a;
                font-size: 13px;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .cheats-reset:hover {
                background: rgba(255, 77, 90, 0.15);
                border-color: #ff4d5a;
            }

            /* Mobile */
            @media (max-width: 768px) {
                .cheats-toggle-btn {
                    top: auto;
                    bottom: 80px;
                    right: 12px;
                    padding: 10px;
                }
                
                .cheats-label {
                    display: none;
                }
                
                .cheats-panel {
                    max-width: 95%;
                    max-height: 85vh;
                }
                
                .cheats-categories {
                    max-height: 60vh;
                }
            }
        `;

        document.head.appendChild(style);
    }

    // ═══════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════

    function init() {
        injectStyles();
        ModLoader.init();
    }

    // ═══════════════════════════════════════════════════════════════
    // EXPORTS
    // ═══════════════════════════════════════════════════════════════

    window.GameCheats = {
        init: (gameId) => CheatsManager.init(gameId),
        isActive: (cheatId) => CheatsManager.isActive(cheatId),
        toggle: (cheatId) => CheatsManager.toggle(cheatId),
        set: (cheatId, value) => CheatsManager.set(cheatId, value),
        getAllActive: () => CheatsManager.getAllActive(),
        getAvailableCheats: () => CheatsManager.getAvailableCheats(),
        showPanel: () => CheatsManager.showPanel(),
        hidePanel: () => CheatsManager.hidePanel(),
        togglePanel: () => CheatsManager.togglePanel(),
        createButton: createCheatButton,
        onChange: (callback) => { CheatsManager.onCheatsChange = callback; },
    };

    window.GameModsExtended = {
        getAvailableMods: (gameId) => ModLoader.getAvailableMods(gameId),
        getActiveMods: (gameId) => ModLoader.getActiveMods(gameId),
        enableMod: (modId) => ModLoader.enableMod(modId),
        disableMod: (modId) => ModLoader.disableMod(modId),
        toggleMod: (modId) => ModLoader.toggleMod(modId),
        isModActive: (modId) => ModLoader.isModActive(modId),
        addMod: (mod) => ModLoader.addMod(mod),
        removeMod: (modId) => ModLoader.removeMod(modId),
        importMod: (json) => ModLoader.importMod(json),
        exportMod: (modId) => ModLoader.exportMod(modId),
    };

    // Tier helpers
    window.SGAIUser = {
        getTier: getUserTier,
        isElderGod,
        isHunter,
        isSubscriber,
    };

    // Auto-init
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();

/* ============================================
   ScaryGamesAI — Unified Game Container
   Standard game wrapper with pause menu, settings,
   replay system, mod support, and score submission
   ============================================ */

(function () {
    'use strict';

    // ═══════════════════════════════════════════════════════════════
    // CONFIGURATION
    // ═══════════════════════════════════════════════════════════════

    const CONFIG = {
        storageKeys: {
            settings: 'sgai_game_settings',
            replays: 'sgai_replays',
            mods: 'sgai_mods',
            bindings: 'sgai_key_bindings',
        },
        maxReplays: 50,
        maxReplayDuration: 300000, // 5 minutes max recording
        replaySampleRate: 100, // ms between input samples
        leaderboardApiBase: '/api/leaderboards',
    };

    // Default settings
    const DEFAULT_SETTINGS = {
        audio: {
            masterVolume: 0.8,
            musicVolume: 0.6,
            sfxVolume: 0.8,
            ambientVolume: 0.5,
            muted: false,
        },
        graphics: {
            quality: 'medium', // low, medium, high, ultra
            shadows: true,
            particles: true,
            screenShake: true,
            vsync: true,
            fps: 60,
        },
        controls: {
            sensitivity: 1.0,
            invertY: false,
            holdToCrouch: false,
            holdToSprint: true,
            togglePause: true,
        },
        accessibility: {
            reduceMotion: false,
            highContrast: false,
            colorBlindMode: 'none', // none, protanopia, deuteranopia, tritanopia
            screenReader: false,
            largerText: false,
        },
        gameplay: {
            showFPS: false,
            showTimer: true,
            showHints: true,
            autoSave: true,
            difficulty: 'normal', // easy, normal, hard, nightmare
        },
    };

    // Default key bindings
    const DEFAULT_BINDINGS = {
        moveForward: 'KeyW',
        moveBackward: 'KeyS',
        moveLeft: 'KeyA',
        moveRight: 'KeyD',
        jump: 'Space',
        sprint: 'ShiftLeft',
        crouch: 'ControlLeft',
        interact: 'KeyE',
        pause: 'Escape',
        inventory: 'KeyI',
        map: 'KeyM',
        attack: 'Mouse0',
        aim: 'Mouse2',
        reload: 'KeyR',
        flashlight: 'KeyF',
    };

    // ═══════════════════════════════════════════════════════════════
    // SETTINGS MANAGER
    // ═══════════════════════════════════════════════════════════════

    const SettingsManager = {
        settings: null,
        bindings: null,
        listeners: [],

        init() {
            this.load();
            this.applyAccessibility();
        },

        load() {
            try {
                const rawSettings = localStorage.getItem(CONFIG.storageKeys.settings);
                this.settings = rawSettings ? { ...DEFAULT_SETTINGS, ...JSON.parse(rawSettings) } : { ...DEFAULT_SETTINGS };
                
                const rawBindings = localStorage.getItem(CONFIG.storageKeys.bindings);
                this.bindings = rawBindings ? { ...DEFAULT_BINDINGS, ...JSON.parse(rawBindings) } : { ...DEFAULT_BINDINGS };
            } catch (e) {
                this.settings = { ...DEFAULT_SETTINGS };
                this.bindings = { ...DEFAULT_BINDINGS };
            }
        },

        save() {
            try {
                localStorage.setItem(CONFIG.storageKeys.settings, JSON.stringify(this.settings));
                localStorage.setItem(CONFIG.storageKeys.bindings, JSON.stringify(this.bindings));
            } catch (e) {
                console.warn('Failed to save settings:', e);
            }
            this.notifyListeners();
        },

        get(path) {
            const parts = path.split('.');
            let value = this.settings;
            for (const part of parts) {
                if (value === undefined || value === null) return undefined;
                value = value[part];
            }
            return value;
        },

        set(path, value) {
            const parts = path.split('.');
            let obj = this.settings;
            for (let i = 0; i < parts.length - 1; i++) {
                if (!obj[parts[i]]) obj[parts[i]] = {};
                obj = obj[parts[i]];
            }
            obj[parts[parts.length - 1]] = value;
            this.save();
            
            // Apply immediate effects
            this.applyImmediate(path, value);
        },

        getBinding(action) {
            return this.bindings[action] || DEFAULT_BINDINGS[action];
        },

        setBinding(action, key) {
            this.bindings[action] = key;
            this.save();
        },

        getBindingLabel(action) {
            const code = this.getBinding(action);
            if (!code) return 'Not Set';
            
            // Convert code to readable label
            const labelMap = {
                'Space': 'Space',
                'ShiftLeft': 'Left Shift',
                'ShiftRight': 'Right Shift',
                'ControlLeft': 'Left Ctrl',
                'ControlRight': 'Right Ctrl',
                'AltLeft': 'Left Alt',
                'AltRight': 'Right Alt',
                'Escape': 'Esc',
                'ArrowUp': '↑',
                'ArrowDown': '↓',
                'ArrowLeft': '←',
                'ArrowRight': '→',
                'Mouse0': 'Left Click',
                'Mouse1': 'Middle Click',
                'Mouse2': 'Right Click',
                'Mouse3': 'Mouse 4',
                'Mouse4': 'Mouse 5',
            };
            
            if (labelMap[code]) return labelMap[code];
            if (code.startsWith('Key')) return code.slice(3);
            if (code.startsWith('Digit')) return code.slice(5);
            return code;
        },

        applyImmediate(path, value) {
            if (path.startsWith('accessibility.')) {
                this.applyAccessibility();
            }
            if (path === 'audio.masterVolume' || path === 'audio.muted') {
                this.applyAudioVolume();
            }
        },

        applyAccessibility() {
            const root = document.documentElement;
            root.classList.toggle('reduce-motion', this.settings.accessibility.reduceMotion);
            root.classList.toggle('high-contrast', this.settings.accessibility.highContrast);
            root.classList.toggle('larger-text', this.settings.accessibility.largerText);
            
            // Color blind mode
            root.dataset.colorBlind = this.settings.accessibility.colorBlindMode;
        },

        applyAudioVolume() {
            if (typeof window.GameAudio !== 'undefined') {
                window.GameAudio.setMasterVolume(
                    this.settings.audio.muted ? 0 : this.settings.audio.masterVolume
                );
            }
        },

        reset(category = null) {
            if (category) {
                this.settings[category] = { ...DEFAULT_SETTINGS[category] };
            } else {
                this.settings = { ...DEFAULT_SETTINGS };
                this.bindings = { ...DEFAULT_BINDINGS };
            }
            this.save();
        },

        onChange(callback) {
            this.listeners.push(callback);
            return () => {
                this.listeners = this.listeners.filter(l => l !== callback);
            };
        },

        notifyListeners() {
            this.listeners.forEach(cb => cb(this.settings, this.bindings));
        },
    };

    // ═══════════════════════════════════════════════════════════════
    // REPLAY MANAGER
    // ═══════════════════════════════════════════════════════════════

    const ReplayManager = {
        isRecording: false,
        isPlaying: false,
        currentRecording: null,
        recordings: [],
        playbackFrame: 0,
        
        init() {
            this.loadRecordings();
        },
        
        loadRecordings() {
            try {
                const raw = localStorage.getItem(CONFIG.storageKeys.replays);
                this.recordings = raw ? JSON.parse(raw) : [];
            } catch (e) {
                this.recordings = [];
            }
        },
        
        saveRecordings() {
            try {
                // Keep only the most recent replays
                if (this.recordings.length > CONFIG.maxReplays) {
                    this.recordings = this.recordings.slice(-CONFIG.maxReplays);
                }
                localStorage.setItem(CONFIG.storageKeys.replays, JSON.stringify(this.recordings));
            } catch (e) {
                console.warn('Failed to save replays:', e);
            }
        },

        startRecording(gameId, metadata = {}) {
            if (this.isRecording) return;
            
            this.isRecording = true;
            this.currentRecording = {
                id: `${gameId}_${Date.now()}`,
                gameId,
                startTime: Date.now(),
                metadata: {
                    playerName: PlayerProfile?.getUsername?.() || 'Player',
                    difficulty: SettingsManager.get('gameplay.difficulty'),
                    ...metadata,
                },
                inputs: [],
                states: [],
            };
            
            console.log('[Replay] Recording started for', gameId);
        },

        recordInput(input) {
            if (!this.isRecording || !this.currentRecording) return;
            
            const timestamp = Date.now() - this.currentRecording.startTime;
            
            // Don't record if too frequent
            const lastInput = this.currentRecording.inputs[this.currentRecording.inputs.length - 1];
            if (lastInput && timestamp - lastInput.t < 16) return;
            
            this.currentRecording.inputs.push({
                t: timestamp,
                ...input,
            });
        },

        recordState(state) {
            if (!this.isRecording || !this.currentRecording) return;
            
            const timestamp = Date.now() - this.currentRecording.startTime;
            
            // Record state every 100ms for ghost playback
            const lastState = this.currentRecording.states[this.currentRecording.states.length - 1];
            if (lastState && timestamp - lastState.t < CONFIG.replaySampleRate) return;
            
            this.currentRecording.states.push({
                t: timestamp,
                ...state,
            });
        },

        stopRecording(finalScore = null) {
            if (!this.isRecording || !this.currentRecording) return null;
            
            this.isRecording = false;
            this.currentRecording.endTime = Date.now();
            this.currentRecording.duration = this.currentRecording.endTime - this.currentRecording.startTime;
            this.currentRecording.finalScore = finalScore;
            
            const recording = { ...this.currentRecording };
            this.currentRecording = null;
            
            // Save if it has meaningful content
            if (recording.inputs.length > 10 || recording.states.length > 5) {
                this.recordings.push(recording);
                this.saveRecordings();
                console.log('[Replay] Recording saved:', recording.id);
            }
            
            return recording;
        },

        discardRecording() {
            this.isRecording = false;
            this.currentRecording = null;
            console.log('[Replay] Recording discarded');
        },

        getRecordings(gameId = null) {
            if (gameId) {
                return this.recordings.filter(r => r.gameId === gameId);
            }
            return this.recordings;
        },

        getBestRecording(gameId) {
            const gameRecordings = this.getRecordings(gameId);
            if (gameRecordings.length === 0) return null;
            
            return gameRecordings.reduce((best, current) => {
                if (!best) return current;
                return (current.finalScore || 0) > (best.finalScore || 0) ? current : best;
            }, null);
        },

        deleteRecording(replayId) {
            this.recordings = this.recordings.filter(r => r.id !== replayId);
            this.saveRecordings();
        },

        // Ghost replay playback
        startPlayback(recording, onState, onComplete) {
            if (this.isPlaying) return;
            
            this.isPlaying = true;
            this.playbackRecording = recording;
            this.playbackFrame = 0;
            this.playbackStartTime = Date.now();
            this.onPlaybackState = onState;
            this.onPlaybackComplete = onComplete;
            
            this.playbackInterval = setInterval(() => {
                this._playbackTick();
            }, 16);
            
            console.log('[Replay] Playback started');
        },

        _playbackTick() {
            if (!this.isPlaying || !this.playbackRecording) {
                this.stopPlayback();
                return;
            }
            
            const elapsed = Date.now() - this.playbackStartTime;
            const states = this.playbackRecording.states;
            
            // Find the appropriate state for current time
            while (this.playbackFrame < states.length && states[this.playbackFrame].t <= elapsed) {
                this.playbackFrame++;
            }
            
            if (this.playbackFrame < states.length) {
                // Interpolate between frames
                const currentState = states[this.playbackFrame - 1] || states[0];
                if (currentState && this.onPlaybackState) {
                    this.onPlaybackState(currentState);
                }
            } else {
                // Playback complete
                this.stopPlayback();
                if (this.onPlaybackComplete) {
                    this.onPlaybackComplete();
                }
            }
        },

        stopPlayback() {
            this.isPlaying = false;
            if (this.playbackInterval) {
                clearInterval(this.playbackInterval);
                this.playbackInterval = null;
            }
            this.playbackRecording = null;
            this.playbackFrame = 0;
            console.log('[Replay] Playback stopped');
        },

        exportRecording(replayId) {
            const recording = this.recordings.find(r => r.id === replayId);
            if (!recording) return null;
            
            return JSON.stringify(recording);
        },

        importRecording(jsonStr) {
            try {
                const recording = JSON.parse(jsonStr);
                if (recording.id && recording.gameId && recording.inputs) {
                    recording.id = `${recording.gameId}_imported_${Date.now()}`;
                    this.recordings.push(recording);
                    this.saveRecordings();
                    return recording;
                }
            } catch (e) {
                console.error('Failed to import replay:', e);
            }
            return null;
        },
    };

    // ═══════════════════════════════════════════════════════════════
    // MOD MANAGER
    // ═══════════════════════════════════════════════════════════════

    const ModManager = {
        mods: [],
        activeMods: [],
        
        init() {
            this.loadMods();
        },
        
        loadMods() {
            try {
                const raw = localStorage.getItem(CONFIG.storageKeys.mods);
                this.mods = raw ? JSON.parse(raw) : [];
            } catch (e) {
                this.mods = [];
            }
        },
        
        saveMods() {
            try {
                localStorage.setItem(CONFIG.storageKeys.mods, JSON.stringify(this.mods));
            } catch (e) {
                console.warn('Failed to save mods:', e);
            }
        },

        registerMod(mod) {
            // Validate mod structure
            const requiredFields = ['id', 'name', 'version', 'type'];
            for (const field of requiredFields) {
                if (!mod[field]) {
                    console.error('Mod missing required field:', field);
                    return false;
                }
            }
            
            // Check for duplicates
            const existing = this.mods.findIndex(m => m.id === mod.id);
            if (existing >= 0) {
                this.mods[existing] = mod;
            } else {
                this.mods.push({
                    ...mod,
                    enabled: false,
                    installed: Date.now(),
                });
            }
            
            this.saveMods();
            return true;
        },

        enableMod(modId) {
            const mod = this.mods.find(m => m.id === modId);
            if (mod) {
                mod.enabled = true;
                this.saveMods();
                this.applyMods();
            }
        },

        disableMod(modId) {
            const mod = this.mods.find(m => m.id === modId);
            if (mod) {
                mod.enabled = false;
                this.saveMods();
                this.applyMods();
            }
        },

        deleteMod(modId) {
            this.mods = this.mods.filter(m => m.id !== modId);
            this.saveMods();
            this.applyMods();
        },

        getMods(type = null) {
            if (type) {
                return this.mods.filter(m => m.type === type);
            }
            return this.mods;
        },

        getActiveMods(type = null) {
            let active = this.mods.filter(m => m.enabled);
            if (type) {
                active = active.filter(m => m.type === type);
            }
            return active;
        },

        applyMods() {
            // This is called when mods change
            // Individual games should listen to this event
            window.dispatchEvent(new CustomEvent('sgai-mods-changed', {
                detail: { activeMods: this.getActiveMods() }
            }));
        },

        // Get custom skin for a game/character
        getCustomSkin(gameId, characterId = 'default') {
            const skinMods = this.getActiveMods('skin');
            const skin = skinMods.find(m => 
                m.gameId === gameId && 
                (m.characterId === characterId || !m.characterId)
            );
            return skin?.data || null;
        },

        // Get custom level
        getCustomLevel(gameId, levelId) {
            const levelMods = this.getActiveMods('level');
            return levelMods.find(m => m.gameId === gameId && m.levelId === levelId)?.data || null;
        },

        // Import mod from JSON
        importMod(jsonStr) {
            try {
                const mod = JSON.parse(jsonStr);
                return this.registerMod(mod);
            } catch (e) {
                console.error('Failed to import mod:', e);
                return false;
            }
        },

        // Export mod to JSON
        exportMod(modId) {
            const mod = this.mods.find(m => m.id === modId);
            if (!mod) return null;
            return JSON.stringify(mod, null, 2);
        },
    };

    // ═══════════════════════════════════════════════════════════════
    // SCORE SUBMITTER
    // ═══════════════════════════════════════════════════════════════

    const ScoreSubmitter = {
        pendingScores: [],
        
        async submit(gameId, score, metadata = {}) {
            const submission = {
                gameId,
                score,
                metadata: {
                    difficulty: SettingsManager.get('gameplay.difficulty'),
                    duration: metadata.duration || 0,
                    timestamp: Date.now(),
                    playerName: PlayerProfile?.getUsername?.() || 'Anonymous',
                    version: '1.0',
                    ...metadata,
                },
            };
            
            // Try to submit to API
            try {
                const response = await fetch(`${CONFIG.leaderboardApiBase}/${gameId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(submission),
                });
                
                if (response.ok) {
                    const result = await response.json();
                    console.log('[Score] Submitted successfully:', result);
                    return { success: true, rank: result.rank, isNewBest: result.isNewBest };
                }
            } catch (e) {
                console.warn('[Score] API submission failed, storing locally:', e);
            }
            
            // Store locally if API fails
            this.storeLocal(submission);
            return { success: true, local: true };
        },
        
        storeLocal(submission) {
            try {
                const key = `sgai_scores_${submission.gameId}`;
                const raw = localStorage.getItem(key);
                let scores = raw ? JSON.parse(raw) : [];
                
                scores.push(submission);
                scores.sort((a, b) => b.score - a.score);
                scores = scores.slice(0, 100); // Keep top 100
                
                localStorage.setItem(key, JSON.stringify(scores));
            } catch (e) {
                console.warn('Failed to store score locally:', e);
            }
        },
        
        getLocalHighScore(gameId) {
            try {
                const key = `sgai_scores_${gameId}`;
                const raw = localStorage.getItem(key);
                const scores = raw ? JSON.parse(raw) : [];
                return scores[0]?.score || 0;
            } catch (e) {
                return 0;
            }
        },
    };

    // ═══════════════════════════════════════════════════════════════
    // GAME CONTAINER CLASS
    // ═══════════════════════════════════════════════════════════════

    class GameContainer {
        constructor(options = {}) {
            this.gameId = options.gameId || 'unknown';
            this.gameName = options.gameName || 'Game';
            this.canvas = options.canvas || null;
            this.container = options.container || document.body;
            
            this.isPaused = false;
            this.isGameOver = false;
            this.isRunning = false;
            
            this.score = 0;
            this.startTime = null;
            this.elapsedTime = 0;
            
            this.pauseMenu = null;
            this.settingsPanel = null;
            this.gameOverScreen = null;
            this.hud = null;
            
            this.onBeforePause = null;
            this.onAfterResume = null;
            this.onExit = null;
            this.onRestart = null;
            this.onSettingsChange = null;
            this.onCheatChange = null;
            
            this._init();
        }
        
        _init() {
            // Create HUD
            this._createHUD();
            
            // Create pause menu (hidden)
            this._createPauseMenu();
            
            // Create game over screen (hidden)
            this._createGameOverScreen();
            
            // Bind keyboard events
            this._bindEvents();
            
            // Apply settings
            SettingsManager.init();
            ReplayManager.init();
            ModManager.init();
            
            // Initialize cheats system
            if (typeof GameCheats !== 'undefined') {
                GameCheats.init(this.gameId);
                this._createCheatsButton();
                
                // Listen for cheat changes
                GameCheats.onChange((cheatId, value) => {
                    if (this.onCheatChange) {
                        this.onCheatChange(cheatId, value);
                    }
                });
            }
            
            // Listen for settings changes
            SettingsManager.onChange((settings) => {
                if (this.onSettingsChange) {
                    this.onSettingsChange(settings);
                }
            });
        }
        
        _createCheatsButton() {
            if (!window.SGAIUser?.isElderGod?.()) return;
            
            const cheatsBtn = GameCheats.createButton();
            this.container.appendChild(cheatsBtn);
        }
        
        _createHUD() {
            this.hud = document.createElement('div');
            this.hud.className = 'game-hud';
            this.hud.innerHTML = `
                <div class="game-hud-top">
                    <div class="game-hud-left">
                        <button class="hud-pause-btn" aria-label="Pause game">
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <rect x="6" y="4" width="4" height="16"/>
                                <rect x="14" y="4" width="4" height="16"/>
                            </svg>
                        </button>
                        <span class="game-title">${this.gameName}</span>
                    </div>
                    <div class="game-hud-center">
                        <div class="game-timer">
                            <span class="timer-icon">⏱️</span>
                            <span class="timer-value">00:00</span>
                        </div>
                    </div>
                    <div class="game-hud-right">
                        <div class="game-score">
                            <span class="score-label">Score</span>
                            <span class="score-value">0</span>
                        </div>
                    </div>
                </div>
                <div class="game-hud-bottom">
                    <div class="game-fps"></div>
                </div>
            `;
            
            this.container.appendChild(this.hud);
            
            // Pause button click
            this.hud.querySelector('.hud-pause-btn').addEventListener('click', () => {
                this.togglePause();
            });
        }
        
        _createPauseMenu() {
            const showCheats = window.SGAIUser?.isElderGod?.() || window.SGAIUser?.isHunter?.();
            
            this.pauseMenu = document.createElement('div');
            this.pauseMenu.className = 'game-pause-overlay';
            this.pauseMenu.style.display = 'none';
            this.pauseMenu.innerHTML = `
                <div class="pause-backdrop"></div>
                <div class="pause-menu">
                    <h2 class="pause-title">⏸️ Paused</h2>
                    <div class="pause-stats">
                        <div class="pause-stat">
                            <span class="stat-label">Time</span>
                            <span class="stat-value pause-time">00:00</span>
                        </div>
                        <div class="pause-stat">
                            <span class="stat-label">Score</span>
                            <span class="stat-value pause-score">0</span>
                        </div>
                    </div>
                    <div class="pause-actions">
                        <button class="pause-btn resume" data-action="resume">
                            <span class="btn-icon">▶️</span>
                            <span>Resume</span>
                        </button>
                        <button class="pause-btn" data-action="settings">
                            <span class="btn-icon">⚙️</span>
                            <span>Settings</span>
                        </button>
                        ${showCheats ? `<button class="pause-btn cheats" data-action="cheats">
                            <span class="btn-icon">🎮</span>
                            <span>Cheats & Mods</span>
                        </button>` : ''}
                        <button class="pause-btn" data-action="restart">
                            <span class="btn-icon">🔄</span>
                            <span>Restart</span>
                        </button>
                        <button class="pause-btn" data-action="replay">
                            <span class="btn-icon">📼</span>
                            <span>Save Replay</span>
                        </button>
                        <button class="pause-btn danger" data-action="exit">
                            <span class="btn-icon">🚪</span>
                            <span>Exit Game</span>
                        </button>
                    </div>
                    <div class="pause-shortcuts">
                        <span><kbd>Esc</kbd> Resume</span>
                        <span><kbd>R</kbd> Restart</span>
                    </div>
                </div>
            `;
            
            this.container.appendChild(this.pauseMenu);
            
            // Bind pause menu buttons
            this.pauseMenu.querySelectorAll('.pause-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    this._handlePauseAction(btn.dataset.action);
                });
            });
            
            // Click backdrop to resume
            this.pauseMenu.querySelector('.pause-backdrop').addEventListener('click', () => {
                this.resume();
            });
        }
        
        _createGameOverScreen() {
            this.gameOverScreen = document.createElement('div');
            this.gameOverScreen.className = 'game-over-overlay';
            this.gameOverScreen.style.display = 'none';
            this.gameOverScreen.innerHTML = `
                <div class="game-over-backdrop"></div>
                <div class="game-over-menu">
                    <div class="game-over-header">
                        <h2 class="game-over-title">💀 Game Over</h2>
                        <p class="game-over-subtitle">Better luck next time...</p>
                    </div>
                    <div class="game-over-stats">
                        <div class="game-over-stat">
                            <span class="stat-icon">⏱️</span>
                            <span class="stat-label">Time</span>
                            <span class="stat-value final-time">00:00</span>
                        </div>
                        <div class="game-over-stat highlight">
                            <span class="stat-icon">🏆</span>
                            <span class="stat-label">Score</span>
                            <span class="stat-value final-score">0</span>
                        </div>
                        <div class="game-over-stat">
                            <span class="stat-icon">🎯</span>
                            <span class="stat-label">High Score</span>
                            <span class="stat-value high-score">0</span>
                        </div>
                        <div class="game-over-stat new-record" style="display:none;">
                            <span class="stat-icon">🎉</span>
                            <span class="stat-label">New Record!</span>
                        </div>
                    </div>
                    <div class="game-over-actions">
                        <button class="game-over-btn primary" data-action="restart">
                            <span class="btn-icon">🔄</span>
                            <span>Play Again</span>
                        </button>
                        <button class="game-over-btn" data-action="replay">
                            <span class="btn-icon">📼</span>
                            <span>Save Replay</span>
                        </button>
                        <button class="game-over-btn" data-action="share">
                            <span class="btn-icon">📤</span>
                            <span>Share Score</span>
                        </button>
                        <button class="game-over-btn" data-action="exit">
                            <span class="btn-icon">🏠</span>
                            <span>Exit to Menu</span>
                        </button>
                    </div>
                </div>
            `;
            
            this.container.appendChild(this.gameOverScreen);
            
            // Bind game over buttons
            this.gameOverScreen.querySelectorAll('.game-over-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    this._handleGameOverAction(btn.dataset.action);
                });
            });
        }
        
        _createSettingsPanel() {
            if (this.settingsPanel) {
                this.settingsPanel.style.display = 'block';
                return;
            }
            
            this.settingsPanel = document.createElement('div');
            this.settingsPanel.className = 'game-settings-panel';
            this.settingsPanel.innerHTML = `
                <div class="settings-header">
                    <h3>⚙️ Settings</h3>
                    <button class="settings-close" aria-label="Close settings">✕</button>
                </div>
                <div class="settings-tabs">
                    <button class="settings-tab active" data-tab="audio">🔊 Audio</button>
                    <button class="settings-tab" data-tab="graphics">🎨 Graphics</button>
                    <button class="settings-tab" data-tab="controls">🎮 Controls</button>
                    <button class="settings-tab" data-tab="accessibility">♿ Accessibility</button>
                    <button class="settings-tab" data-tab="gameplay">🎯 Gameplay</button>
                </div>
                <div class="settings-content">
                    ${this._renderAudioSettings()}
                    ${this._renderGraphicsSettings()}
                    ${this._renderControlsSettings()}
                    ${this._renderAccessibilitySettings()}
                    ${this._renderGameplaySettings()}
                </div>
                <div class="settings-footer">
                    <button class="settings-reset">Reset to Defaults</button>
                </div>
            `;
            
            this.pauseMenu.querySelector('.pause-menu').appendChild(this.settingsPanel);
            this.settingsPanel.style.display = 'none';
            
            // Bind settings events
            this._bindSettingsEvents();
        }
        
        _renderAudioSettings() {
            return `
                <div class="settings-tab-content active" data-tab="audio">
                    <div class="setting-group">
                        <label class="setting-label">
                            <input type="checkbox" class="setting-checkbox" 
                                data-setting="audio.muted" 
                                ${SettingsManager.get('audio.muted') ? 'checked' : ''}>
                            <span>Mute All</span>
                        </label>
                    </div>
                    <div class="setting-group">
                        <label class="setting-label">Master Volume</label>
                        <input type="range" class="setting-slider" 
                            data-setting="audio.masterVolume"
                            min="0" max="1" step="0.1"
                            value="${SettingsManager.get('audio.masterVolume')}">
                        <span class="setting-value">${Math.round(SettingsManager.get('audio.masterVolume') * 100)}%</span>
                    </div>
                    <div class="setting-group">
                        <label class="setting-label">Music Volume</label>
                        <input type="range" class="setting-slider" 
                            data-setting="audio.musicVolume"
                            min="0" max="1" step="0.1"
                            value="${SettingsManager.get('audio.musicVolume')}">
                        <span class="setting-value">${Math.round(SettingsManager.get('audio.musicVolume') * 100)}%</span>
                    </div>
                    <div class="setting-group">
                        <label class="setting-label">SFX Volume</label>
                        <input type="range" class="setting-slider" 
                            data-setting="audio.sfxVolume"
                            min="0" max="1" step="0.1"
                            value="${SettingsManager.get('audio.sfxVolume')}">
                        <span class="setting-value">${Math.round(SettingsManager.get('audio.sfxVolume') * 100)}%</span>
                    </div>
                </div>
            `;
        }
        
        _renderGraphicsSettings() {
            return `
                <div class="settings-tab-content" data-tab="graphics">
                    <div class="setting-group">
                        <label class="setting-label">Quality</label>
                        <select class="setting-select" data-setting="graphics.quality">
                            <option value="low" ${SettingsManager.get('graphics.quality') === 'low' ? 'selected' : ''}>Low</option>
                            <option value="medium" ${SettingsManager.get('graphics.quality') === 'medium' ? 'selected' : ''}>Medium</option>
                            <option value="high" ${SettingsManager.get('graphics.quality') === 'high' ? 'selected' : ''}>High</option>
                            <option value="ultra" ${SettingsManager.get('graphics.quality') === 'ultra' ? 'selected' : ''}>Ultra</option>
                        </select>
                    </div>
                    <div class="setting-group">
                        <label class="setting-label">
                            <input type="checkbox" class="setting-checkbox" 
                                data-setting="graphics.shadows" 
                                ${SettingsManager.get('graphics.shadows') ? 'checked' : ''}>
                            <span>Shadows</span>
                        </label>
                    </div>
                    <div class="setting-group">
                        <label class="setting-label">
                            <input type="checkbox" class="setting-checkbox" 
                                data-setting="graphics.particles" 
                                ${SettingsManager.get('graphics.particles') ? 'checked' : ''}>
                            <span>Particles</span>
                        </label>
                    </div>
                    <div class="setting-group">
                        <label class="setting-label">
                            <input type="checkbox" class="setting-checkbox" 
                                data-setting="graphics.screenShake" 
                                ${SettingsManager.get('graphics.screenShake') ? 'checked' : ''}>
                            <span>Screen Shake</span>
                        </label>
                    </div>
                </div>
            `;
        }
        
        _renderControlsSettings() {
            return `
                <div class="settings-tab-content" data-tab="controls">
                    <div class="setting-group">
                        <label class="setting-label">Sensitivity</label>
                        <input type="range" class="setting-slider" 
                            data-setting="controls.sensitivity"
                            min="0.1" max="3" step="0.1"
                            value="${SettingsManager.get('controls.sensitivity')}">
                        <span class="setting-value">${SettingsManager.get('controls.sensitivity').toFixed(1)}</span>
                    </div>
                    <div class="setting-group">
                        <label class="setting-label">
                            <input type="checkbox" class="setting-checkbox" 
                                data-setting="controls.invertY" 
                                ${SettingsManager.get('controls.invertY') ? 'checked' : ''}>
                            <span>Invert Y-Axis</span>
                        </label>
                    </div>
                    <div class="setting-group">
                        <label class="setting-label">
                            <input type="checkbox" class="setting-checkbox" 
                                data-setting="controls.holdToSprint" 
                                ${SettingsManager.get('controls.holdToSprint') ? 'checked' : ''}>
                            <span>Hold to Sprint</span>
                        </label>
                    </div>
                    <div class="keybindings">
                        <h4>Key Bindings</h4>
                        <div class="keybinding-row">
                            <span>Move Forward</span>
                            <button class="keybinding-btn" data-action="moveForward">${SettingsManager.getBindingLabel('moveForward')}</button>
                        </div>
                        <div class="keybinding-row">
                            <span>Move Backward</span>
                            <button class="keybinding-btn" data-action="moveBackward">${SettingsManager.getBindingLabel('moveBackward')}</button>
                        </div>
                        <div class="keybinding-row">
                            <span>Move Left</span>
                            <button class="keybinding-btn" data-action="moveLeft">${SettingsManager.getBindingLabel('moveLeft')}</button>
                        </div>
                        <div class="keybinding-row">
                            <span>Move Right</span>
                            <button class="keybinding-btn" data-action="moveRight">${SettingsManager.getBindingLabel('moveRight')}</button>
                        </div>
                        <div class="keybinding-row">
                            <span>Jump</span>
                            <button class="keybinding-btn" data-action="jump">${SettingsManager.getBindingLabel('jump')}</button>
                        </div>
                        <div class="keybinding-row">
                            <span>Interact</span>
                            <button class="keybinding-btn" data-action="interact">${SettingsManager.getBindingLabel('interact')}</button>
                        </div>
                    </div>
                </div>
            `;
        }
        
        _renderAccessibilitySettings() {
            return `
                <div class="settings-tab-content" data-tab="accessibility">
                    <div class="setting-group">
                        <label class="setting-label">
                            <input type="checkbox" class="setting-checkbox" 
                                data-setting="accessibility.reduceMotion" 
                                ${SettingsManager.get('accessibility.reduceMotion') ? 'checked' : ''}>
                            <span>Reduce Motion</span>
                        </label>
                    </div>
                    <div class="setting-group">
                        <label class="setting-label">
                            <input type="checkbox" class="setting-checkbox" 
                                data-setting="accessibility.highContrast" 
                                ${SettingsManager.get('accessibility.highContrast') ? 'checked' : ''}>
                            <span>High Contrast</span>
                        </label>
                    </div>
                    <div class="setting-group">
                        <label class="setting-label">
                            <input type="checkbox" class="setting-checkbox" 
                                data-setting="accessibility.largerText" 
                                ${SettingsManager.get('accessibility.largerText') ? 'checked' : ''}>
                            <span>Larger Text</span>
                        </label>
                    </div>
                    <div class="setting-group">
                        <label class="setting-label">Color Blind Mode</label>
                        <select class="setting-select" data-setting="accessibility.colorBlindMode">
                            <option value="none" ${SettingsManager.get('accessibility.colorBlindMode') === 'none' ? 'selected' : ''}>None</option>
                            <option value="protanopia" ${SettingsManager.get('accessibility.colorBlindMode') === 'protanopia' ? 'selected' : ''}>Protanopia</option>
                            <option value="deuteranopia" ${SettingsManager.get('accessibility.colorBlindMode') === 'deuteranopia' ? 'selected' : ''}>Deuteranopia</option>
                            <option value="tritanopia" ${SettingsManager.get('accessibility.colorBlindMode') === 'tritanopia' ? 'selected' : ''}>Tritanopia</option>
                        </select>
                    </div>
                </div>
            `;
        }
        
        _renderGameplaySettings() {
            return `
                <div class="settings-tab-content" data-tab="gameplay">
                    <div class="setting-group">
                        <label class="setting-label">Difficulty</label>
                        <select class="setting-select" data-setting="gameplay.difficulty">
                            <option value="easy" ${SettingsManager.get('gameplay.difficulty') === 'easy' ? 'selected' : ''}>Easy</option>
                            <option value="normal" ${SettingsManager.get('gameplay.difficulty') === 'normal' ? 'selected' : ''}>Normal</option>
                            <option value="hard" ${SettingsManager.get('gameplay.difficulty') === 'hard' ? 'selected' : ''}>Hard</option>
                            <option value="nightmare" ${SettingsManager.get('gameplay.difficulty') === 'nightmare' ? 'selected' : ''}>Nightmare</option>
                        </select>
                    </div>
                    <div class="setting-group">
                        <label class="setting-label">
                            <input type="checkbox" class="setting-checkbox" 
                                data-setting="gameplay.showFPS" 
                                ${SettingsManager.get('gameplay.showFPS') ? 'checked' : ''}>
                            <span>Show FPS</span>
                        </label>
                    </div>
                    <div class="setting-group">
                        <label class="setting-label">
                            <input type="checkbox" class="setting-checkbox" 
                                data-setting="gameplay.showTimer" 
                                ${SettingsManager.get('gameplay.showTimer') ? 'checked' : ''}>
                            <span>Show Timer</span>
                        </label>
                    </div>
                    <div class="setting-group">
                        <label class="setting-label">
                            <input type="checkbox" class="setting-checkbox" 
                                data-setting="gameplay.showHints" 
                                ${SettingsManager.get('gameplay.showHints') ? 'checked' : ''}>
                            <span>Show Hints</span>
                        </label>
                    </div>
                </div>
            `;
        }
        
        _bindEvents() {
            // Keyboard events
            document.addEventListener('keydown', (e) => {
                if (e.code === 'Escape') {
                    if (this.settingsPanel && this.settingsPanel.style.display !== 'none') {
                        this._closeSettings();
                    } else {
                        this.togglePause();
                    }
                }
                
                if (this.isPaused && e.code === 'KeyR') {
                    this.restart();
                }
            });
            
            // Visibility change
            document.addEventListener('visibilitychange', () => {
                if (document.hidden && this.isRunning && !this.isPaused) {
                    this.pause();
                }
            });
        }
        
        _bindSettingsEvents() {
            // Tab switching
            this.settingsPanel.querySelectorAll('.settings-tab').forEach(tab => {
                tab.addEventListener('click', () => {
                    this.settingsPanel.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
                    this.settingsPanel.querySelectorAll('.settings-tab-content').forEach(c => c.classList.remove('active'));
                    
                    tab.classList.add('active');
                    this.settingsPanel.querySelector(`.settings-tab-content[data-tab="${tab.dataset.tab}"]`).classList.add('active');
                });
            });
            
            // Settings changes
            this.settingsPanel.querySelectorAll('.setting-checkbox').forEach(checkbox => {
                checkbox.addEventListener('change', () => {
                    SettingsManager.set(checkbox.dataset.setting, checkbox.checked);
                });
            });
            
            this.settingsPanel.querySelectorAll('.setting-slider').forEach(slider => {
                slider.addEventListener('input', () => {
                    SettingsManager.set(slider.dataset.setting, parseFloat(slider.value));
                    slider.nextElementSibling.textContent = 
                        slider.dataset.setting.includes('Volume') ? 
                        `${Math.round(slider.value * 100)}%` : 
                        parseFloat(slider.value).toFixed(1);
                });
            });
            
            this.settingsPanel.querySelectorAll('.setting-select').forEach(select => {
                select.addEventListener('change', () => {
                    SettingsManager.set(select.dataset.setting, select.value);
                });
            });
            
            // Reset button
            this.settingsPanel.querySelector('.settings-reset').addEventListener('click', () => {
                if (confirm('Reset all settings to defaults?')) {
                    SettingsManager.reset();
                    this._closeSettings();
                    this._createSettingsPanel();
                    this._openSettings();
                }
            });
            
            // Keybinding buttons
            this.settingsPanel.querySelectorAll('.keybinding-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    this._captureKeybinding(btn);
                });
            });
            
            // Close button
            this.settingsPanel.querySelector('.settings-close').addEventListener('click', () => {
                this._closeSettings();
            });
        }
        
        _captureKeybinding(btn) {
            const action = btn.dataset.action;
            const originalText = btn.textContent;
            btn.textContent = 'Press any key...';
            btn.classList.add('capturing');
            
            const handler = (e) => {
                e.preventDefault();
                
                // Get the key code
                let keyCode = e.code;
                if (e.type === 'mousedown') {
                    keyCode = `Mouse${e.button}`;
                }
                
                SettingsManager.setBinding(action, keyCode);
                btn.textContent = SettingsManager.getBindingLabel(action);
                btn.classList.remove('capturing');
                
                document.removeEventListener('keydown', handler);
                document.removeEventListener('mousedown', handler);
            };
            
            document.addEventListener('keydown', handler);
            document.addEventListener('mousedown', handler);
            
            // Cancel after 5 seconds
            setTimeout(() => {
                if (btn.classList.contains('capturing')) {
                    btn.textContent = originalText;
                    btn.classList.remove('capturing');
                    document.removeEventListener('keydown', handler);
                    document.removeEventListener('mousedown', handler);
                }
            }, 5000);
        }
        
        _openSettings() {
            this._createSettingsPanel();
            this.settingsPanel.style.display = 'block';
            this.pauseMenu.querySelector('.pause-actions').style.display = 'none';
            this.pauseMenu.querySelector('.pause-stats').style.display = 'none';
        }
        
        _closeSettings() {
            if (this.settingsPanel) {
                this.settingsPanel.style.display = 'none';
            }
            this.pauseMenu.querySelector('.pause-actions').style.display = '';
            this.pauseMenu.querySelector('.pause-stats').style.display = '';
        }
        
        _handlePauseAction(action) {
            switch (action) {
                case 'resume':
                    this.resume();
                    break;
                case 'settings':
                    this._openSettings();
                    break;
                case 'cheats':
                    this._openCheats();
                    break;
                case 'restart':
                    this.restart();
                    break;
                case 'replay':
                    this._saveReplay();
                    break;
                case 'exit':
                    this._confirmExit();
                    break;
            }
        }
        
        _openCheats() {
            if (typeof GameCheats !== 'undefined') {
                GameCheats.showPanel();
            }
        }
        
        _handleGameOverAction(action) {
            switch (action) {
                case 'restart':
                    this.restart();
                    break;
                case 'replay':
                    this._saveReplay();
                    break;
                case 'share':
                    this._shareScore();
                    break;
                case 'exit':
                    this.exit();
                    break;
            }
        }
        
        _saveReplay() {
            if (ReplayManager.isRecording) {
                const recording = ReplayManager.stopRecording(this.score);
                if (recording) {
                    this._showNotification('Replay saved!', 'success');
                }
            } else {
                this._showNotification('No recording in progress', 'warning');
            }
        }
        
        _shareScore() {
            const text = `🎮 I scored ${this.score.toLocaleString()} in ${this.gameName}!\n⏱️ Time: ${this._formatTime(this.elapsedTime)}\n\nPlay at scarygames.ai`;
            
            if (navigator.share) {
                navigator.share({
                    title: `${this.gameName} Score`,
                    text: text,
                }).catch(() => {});
            } else {
                navigator.clipboard.writeText(text).then(() => {
                    this._showNotification('Score copied to clipboard!', 'success');
                });
            }
        }
        
        _confirmExit() {
            if (confirm('Are you sure you want to exit? Unsaved progress will be lost.')) {
                this.exit();
            }
        }
        
        _showNotification(message, type = 'info') {
            const notification = document.createElement('div');
            notification.className = `game-notification ${type}`;
            notification.textContent = message;
            this.container.appendChild(notification);
            
            setTimeout(() => {
                notification.classList.add('fade-out');
                setTimeout(() => notification.remove(), 300);
            }, 2000);
        }
        
        _formatTime(ms) {
            const seconds = Math.floor(ms / 1000);
            const minutes = Math.floor(seconds / 60);
            const secs = seconds % 60;
            return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        
        // ═══════════════════════════════════════════════════════════
        // PUBLIC API
        // ═══════════════════════════════════════════════════════════
        
        start() {
            this.isRunning = true;
            this.isPaused = false;
            this.isGameOver = false;
            this.score = 0;
            this.startTime = Date.now();
            this.elapsedTime = 0;
            
            // Start recording
            ReplayManager.startRecording(this.gameId, {
                gameName: this.gameName,
            });
            
            // Update HUD
            this.updateHUD();
            
            // Start timer
            this._timerInterval = setInterval(() => {
                if (!this.isPaused && !this.isGameOver) {
                    this.elapsedTime = Date.now() - this.startTime;
                    this.updateHUD();
                }
            }, 100);
            
            console.log(`[GameContainer] Started: ${this.gameId}`);
        }
        
        pause() {
            if (!this.isRunning || this.isPaused || this.isGameOver) return;
            
            this.isPaused = true;
            
            if (this.onBeforePause) {
                this.onBeforePause();
            }
            
            // Update pause menu stats
            this.pauseMenu.querySelector('.pause-time').textContent = this._formatTime(this.elapsedTime);
            this.pauseMenu.querySelector('.pause-score').textContent = this.score.toLocaleString();
            
            this.pauseMenu.style.display = 'flex';
            this._closeSettings();
            
            console.log('[GameContainer] Paused');
        }
        
        resume() {
            if (!this.isPaused) return;
            
            this.isPaused = false;
            this.pauseMenu.style.display = 'none';
            
            // Adjust start time to account for pause duration
            this.startTime = Date.now() - this.elapsedTime;
            
            if (this.onAfterResume) {
                this.onAfterResume();
            }
            
            console.log('[GameContainer] Resumed');
        }
        
        togglePause() {
            if (this.isPaused) {
                this.resume();
            } else {
                this.pause();
            }
        }
        
        restart() {
            this.isGameOver = false;
            this.isPaused = false;
            this.pauseMenu.style.display = 'none';
            this.gameOverScreen.style.display = 'none';
            
            // Discard old recording and start new
            ReplayManager.discardRecording();
            
            if (this.onRestart) {
                this.onRestart();
            } else {
                // Default: reload page
                window.location.reload();
            }
        }
        
        exit() {
            ReplayManager.stopRecording();
            
            if (this.onExit) {
                this.onExit();
            } else {
                // Default: go to games page
                window.location.href = '/games.html';
            }
        }
        
        gameOver(finalScore = null) {
            if (finalScore !== null) {
                this.score = finalScore;
            }
            
            this.isGameOver = true;
            this.isRunning = false;
            
            // Stop recording
            const recording = ReplayManager.stopRecording(this.score);
            
            // Submit score
            ScoreSubmitter.submit(this.gameId, this.score, {
                duration: this.elapsedTime,
            });
            
            // Get high score
            const highScore = ScoreSubmitter.getLocalHighScore(this.gameId);
            const isNewRecord = this.score > highScore;
            
            // Update game over screen
            this.gameOverScreen.querySelector('.final-time').textContent = this._formatTime(this.elapsedTime);
            this.gameOverScreen.querySelector('.final-score').textContent = this.score.toLocaleString();
            this.gameOverScreen.querySelector('.high-score').textContent = highScore.toLocaleString();
            this.gameOverScreen.querySelector('.new-record').style.display = isNewRecord ? 'flex' : 'none';
            
            // Update title based on performance
            const title = this.gameOverScreen.querySelector('.game-over-title');
            if (isNewRecord) {
                title.textContent = '🎉 New Record!';
            } else if (this.score > highScore * 0.8) {
                title.textContent = '💀 Great Run!';
            } else {
                title.textContent = '💀 Game Over';
            }
            
            this.gameOverScreen.style.display = 'flex';
            
            // Record profile play
            if (typeof PlayerProfile !== 'undefined') {
                PlayerProfile.recordPlay(this.gameId, this.score, this.elapsedTime);
            }
            
            console.log('[GameContainer] Game Over, Score:', this.score);
        }
        
        victory(finalScore = null) {
            if (finalScore !== null) {
                this.score = finalScore;
            }
            
            // Change game over to victory
            const title = this.gameOverScreen.querySelector('.game-over-title');
            const subtitle = this.gameOverScreen.querySelector('.game-over-subtitle');
            title.textContent = '🏆 Victory!';
            subtitle.textContent = 'You survived the nightmare!';
            
            this.gameOver(finalScore);
        }
        
        updateScore(score) {
            this.score = score;
            this.updateHUD();
            
            // Record in replay
            ReplayManager.recordState({ score });
        }
        
        addScore(points) {
            this.score += points;
            this.updateHUD();
        }
        
        updateHUD() {
            // Update timer
            const timerEl = this.hud?.querySelector('.timer-value');
            if (timerEl) {
                timerEl.textContent = this._formatTime(this.elapsedTime);
                timerEl.parentElement.style.display = SettingsManager.get('gameplay.showTimer') ? 'flex' : 'none';
            }
            
            // Update score
            const scoreEl = this.hud?.querySelector('.score-value');
            if (scoreEl) {
                scoreEl.textContent = this.score.toLocaleString();
            }
        }
        
        recordInput(input) {
            ReplayManager.recordInput(input);
        }
        
        recordState(state) {
            ReplayManager.recordState(state);
        }
        
        getSettings() {
            return SettingsManager.settings;
        }
        
        getBindings() {
            return SettingsManager.bindings;
        }
        
        isActionPressed(action, event) {
            const binding = SettingsManager.getBinding(action);
            if (binding.startsWith('Mouse')) {
                return event.type === 'mousedown' && `Mouse${event.button}` === binding;
            }
            return event.code === binding;
        }
        
        // ═══════════════════════════════════════════════════════════
        // CHEATS API
        // ═══════════════════════════════════════════════════════════
        
        isCheatActive(cheatId) {
            if (typeof GameCheats === 'undefined') return false;
            return GameCheats.isActive(cheatId);
        }
        
        getCheatValue(cheatId) {
            return this.isCheatActive(cheatId);
        }
        
        getAllActiveCheats() {
            if (typeof GameCheats === 'undefined') return {};
            return GameCheats.getAllActive();
        }
        
        hasActiveCheats() {
            const active = this.getAllActiveCheats();
            return Object.values(active).some(v => v === true);
        }
        
        toggleCheat(cheatId) {
            if (typeof GameCheats === 'undefined') return false;
            return GameCheats.toggle(cheatId);
        }
        
        // ═══════════════════════════════════════════════════════════
        // MODS API
        // ═══════════════════════════════════════════════════════════
        
        getActiveMods(type = null) {
            if (typeof GameModsExtended === 'undefined') return [];
            return GameModsExtended.getActiveMods(this.gameId);
        }
        
        isModActive(modId) {
            if (typeof GameModsExtended === 'undefined') return false;
            return GameModsExtended.isModActive(modId);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // EXPORTS
    // ═══════════════════════════════════════════════════════════════

    window.GameContainer = GameContainer;
    window.GameSettings = SettingsManager;
    window.GameReplay = ReplayManager;
    window.GameMods = ModManager;
    window.GameScore = ScoreSubmitter;

    // Initialize on load
    SettingsManager.init();

})();

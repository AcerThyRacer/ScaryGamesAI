/* ============================================================
   HELLAPHOBIA - PHASE 14: MULTIPLAYER FOUNDATIONS
   Co-op Mode | Ghost System | Leaderboards | Spectator
   ============================================================ */

(function() {
    'use strict';

    // ===== PHASE 14: MULTIPLAYER CONFIG =====
    const MP_CONFIG = {
        MAX_PLAYERS: 4,
        SYNC_RATE: 20, // Updates per second
        PREDICTION_MS: 100,
        INTERPOLATION_MS: 100,
        GHOST_UPDATE_RATE: 5, // Ghost updates per second
        LEADERBOARD_CACHE_TIME: 300000, // 5 minutes
        SPECTATOR_DELAY: 3000 // 3 second delay for spectators
    };

    // ===== PHASE 14: CO-OP MANAGER =====
    const CoopManager = {
        players: new Map(),
        localPlayerId: null,
        isHost: false,
        sessionActive: false,
        sharedSanity: 100,
        sanityLinkEnabled: true,

        init() {
            this.players.clear();
            this.localPlayerId = null;
            this.isHost = false;
            this.sessionActive = false;
            this.sharedSanity = 100;
            console.log('Phase 14: Co-op Manager initialized');
        },

        // Create co-op session
        createSession(maxPlayers = 2) {
            this.localPlayerId = this.generatePlayerId();
            this.isHost = true;
            this.sessionActive = true;

            // Add local player
            this.players.set(this.localPlayerId, {
                id: this.localPlayerId,
                isHost: true,
                isLocal: true,
                name: 'Player 1',
                state: { x: 100, y: 300, hp: 100, sanity: 100 },
                connected: true,
                ping: 0
            });

            EventTracker.track('coop_session_created', { maxPlayers });

            console.log('[Co-op] Session created as host');
            return this.localPlayerId;
        },

        // Join co-op session
        joinSession(hostId, sessionId) {
            this.localPlayerId = this.generatePlayerId();
            this.isHost = false;
            this.sessionActive = true;

            // Add local player
            this.players.set(this.localPlayerId, {
                id: this.localPlayerId,
                isHost: false,
                isLocal: true,
                name: 'Player 2',
                state: { x: 150, y: 300, hp: 100, sanity: 100 },
                connected: true,
                ping: 50
            });

            // Add host player
            this.players.set(hostId, {
                id: hostId,
                isHost: true,
                isLocal: false,
                name: 'Host',
                state: { x: 100, y: 300, hp: 100, sanity: 100 },
                connected: true,
                ping: 50
            });

            EventTracker.track('coop_session_joined', { hostId, sessionId });

            console.log('[Co-op] Joined session');
            return this.localPlayerId;
        },

        // Update player state
        updatePlayerState(playerId, state) {
            const player = this.players.get(playerId);
            if (player) {
                player.state = { ...player.state, ...state };
                player.lastUpdate = Date.now();
            }
        },

        // Update all players
        update(dt) {
            if (!this.sessionActive) return;

            // Update shared sanity
            if (this.sanityLinkEnabled) {
                this.updateSharedSanity();
            }

            // Check for disconnected players
            this.checkConnections();

            // Interpolate other players
            this.interpolatePlayers();
        },

        // Update shared sanity (co-op mechanic)
        updateSharedSanity() {
            let totalSanity = 0;
            let playerCount = 0;

            this.players.forEach(player => {
                if (player.connected) {
                    totalSanity += player.state.sanity;
                    playerCount++;
                }
            });

            if (playerCount > 0) {
                this.sharedSanity = totalSanity / playerCount;

                // Apply sanity link effect
                this.players.forEach(player => {
                    if (player.isLocal) {
                        player.state.sanity = this.sharedSanity;
                    }
                });
            }
        },

        // Check player connections
        checkConnections() {
            const now = Date.now();
            const timeout = 5000;

            this.players.forEach((player, id) => {
                if (!player.isLocal && player.lastUpdate) {
                    if (now - player.lastUpdate > timeout) {
                        player.connected = false;
                        console.log(`[Co-op] Player ${id} disconnected`);
                    }
                }
            });
        },

        // Interpolate other players
        interpolatePlayers() {
            this.players.forEach((player, id) => {
                if (!player.isLocal && player.connected) {
                    // Smooth interpolation
                    if (player.previousState) {
                        const t = Math.min(1, (Date.now() - player.lastUpdate) / MP_CONFIG.INTERPOLATION_MS);
                        player.state.x = this.lerp(player.previousState.x, player.state.x, t);
                        player.state.y = this.lerp(player.previousState.y, player.state.y, t);
                    }
                    player.previousState = { ...player.state };
                }
            });
        },

        // Linear interpolation
        lerp(a, b, t) {
            return a + (b - a) * t;
        },

        // Generate player ID
        generatePlayerId() {
            return 'player_' + Math.random().toString(36).substr(2, 9);
        },

        // Get all players
        getAllPlayers() {
            return Array.from(this.players.values());
        },

        // Get local player
        getLocalPlayer() {
            return this.players.get(this.localPlayerId);
        },

        // Leave session
        leaveSession() {
            this.sessionActive = false;
            this.players.clear();
            this.localPlayerId = null;
            this.isHost = false;

            EventTracker.track('coop_session_left');

            console.log('[Co-op] Session left');
        },

        // Get session status
        getSessionStatus() {
            return {
                active: this.sessionActive,
                isHost: this.isHost,
                playerCount: this.players.size,
                sharedSanity: this.sharedSanity,
                players: this.getAllPlayers()
            };
        }
    };

    // ===== PHASE 14: GHOST SYSTEM (Asynchronous Multiplayer) =====
    const GhostSystem = {
        ghosts: [],
        ghostData: [],
        recordingGhost: false,
        playbackGhost: null,
        ghostTrail: [],

        init() {
            this.ghosts = [];
            this.ghostData = this.loadGhosts();
            this.recordingGhost = false;
            this.playbackGhost = null;
            this.ghostTrail = [];
            console.log('Phase 14: Ghost System initialized');
        },

        // Start recording ghost
        startRecording() {
            this.recordingGhost = true;
            this.ghostTrail = [];
            console.log('[Ghost] Recording started');
        },

        // Stop recording ghost
        stopRecording(levelId) {
            if (!this.recordingGhost) return;

            this.recordingGhost = false;

            // Save ghost data
            if (this.ghostTrail.length > 0) {
                const ghost = {
                    id: 'ghost_' + Date.now(),
                    levelId: levelId,
                    playerId: this.getPlayerIdentifier(),
                    timestamp: Date.now(),
                    trail: [...this.ghostTrail],
                    stats: this.calculateGhostStats()
                };

                this.ghostData.push(ghost);
                this.saveGhosts();

                EventTracker.track('ghost_recorded', { levelId, frames: this.ghostTrail.length });

                console.log('[Ghost] Recording saved:', ghost.id);
            }
        },

        // Record frame
        recordFrame(player) {
            if (!this.recordingGhost) return;

            this.ghostTrail.push({
                x: player.x,
                y: player.y,
                hp: player.hp,
                sanity: player.sanity,
                frame: window.gameFrame || 0,
                timestamp: Date.now()
            });

            // Limit trail size
            if (this.ghostTrail.length > 3600) { // 1 minute at 60fps
                this.ghostTrail.shift();
            }
        },

        // Load ghosts for level
        loadGhostsForLevel(levelId) {
            return this.ghostData
                .filter(g => g.levelId === levelId)
                .sort((a, b) => b.timestamp - a.timestamp)
                .slice(0, 5); // Top 5 ghosts
        },

        // Start ghost playback
        startPlayback(ghostId) {
            const ghost = this.ghostData.find(g => g.id === ghostId);
            if (!ghost) return false;

            this.playbackGhost = {
                ...ghost,
                currentIndex: 0,
                lastUpdate: 0
            };

            console.log('[Ghost] Playback started:', ghostId);
            return true;
        },

        // Update ghost playback
        updatePlayback(dt) {
            if (!this.playbackGhost) return null;

            const ghost = this.playbackGhost;
            const updateInterval = 1000 / MP_CONFIG.GHOST_UPDATE_RATE;

            if (Date.now() - ghost.lastUpdate > updateInterval) {
                if (ghost.currentIndex < ghost.trail.length) {
                    const frame = ghost.trail[ghost.currentIndex];
                    ghost.currentIndex++;
                    ghost.lastUpdate = Date.now();

                    return {
                        x: frame.x,
                        y: frame.y,
                        alpha: 0.5,
                        isGhost: true
                    };
                } else {
                    // Playback complete
                    this.stopPlayback();
                }
            }

            return null;
        },

        // Stop ghost playback
        stopPlayback() {
            this.playbackGhost = null;
            console.log('[Ghost] Playback stopped');
        },

        // Calculate ghost stats
        calculateGhostStats() {
            if (this.ghostTrail.length === 0) return {};

            const first = this.ghostTrail[0];
            const last = this.ghostTrail[this.ghostTrail.length - 1];

            return {
                duration: (last.timestamp - first.timestamp) / 1000,
                frames: this.ghostTrail.length,
                avgSpeed: this.calculateAverageSpeed(),
                deaths: this.countDeaths()
            };
        },

        // Calculate average speed
        calculateAverageSpeed() {
            if (this.ghostTrail.length < 2) return 0;

            let totalDistance = 0;
            for (let i = 1; i < this.ghostTrail.length; i++) {
                const prev = this.ghostTrail[i - 1];
                const curr = this.ghostTrail[i];
                const dx = curr.x - prev.x;
                const dy = curr.y - prev.y;
                totalDistance += Math.sqrt(dx * dx + dy * dy);
            }

            return totalDistance / this.ghostTrail.length;
        },

        // Count deaths in trail
        countDeaths() {
            return this.ghostTrail.filter(f => f.hp <= 0).length;
        },

        // Get player identifier
        getPlayerIdentifier() {
            let playerId = localStorage.getItem('hellaphobia_player_id');
            if (!playerId) {
                playerId = 'player_' + Math.random().toString(36).substr(2, 9);
                localStorage.setItem('hellaphobia_player_id', playerId);
            }
            return playerId;
        },

        // Save ghosts to storage
        saveGhosts() {
            // Keep only last 100 ghosts to save space
            const toSave = this.ghostData.slice(-100);
            localStorage.setItem('hellaphobia_ghosts', JSON.stringify(toSave));
        },

        // Load ghosts from storage
        loadGhosts() {
            const saved = localStorage.getItem('hellaphobia_ghosts');
            return saved ? JSON.parse(saved) : [];
        },

        // Get all ghosts
        getAllGhosts() {
            return this.ghostData;
        },

        // Clear ghosts
        clearGhosts() {
            this.ghostData = [];
            this.saveGhosts();
        }
    };

    // ===== PHASE 14: LEADERBOARD MANAGER =====
    const LeaderboardManager = {
        leaderboards: {},
        cachedData: null,
        lastCacheTime: 0,

        init() {
            this.loadLeaderboards();
            console.log('Phase 14: Leaderboard Manager initialized');
        },

        // Submit score
        submitScore(category, score, data = {}) {
            const entry = {
                id: 'score_' + Date.now(),
                playerId: GhostSystem.getPlayerIdentifier(),
                score: score,
                category: category,
                timestamp: Date.now(),
                ...data
            };

            // Add to local leaderboard
            if (!this.leaderboards[category]) {
                this.leaderboards[category] = [];
            }

            this.leaderboards[category].push(entry);
            this.sortLeaderboard(category);
            this.saveLeaderboards();

            EventTracker.track('score_submitted', { category, score });

            console.log('[Leaderboard] Score submitted:', score, category);
            return entry;
        },

        // Get leaderboard
        getLeaderboard(category, limit = 10) {
            // Check cache
            if (this.cachedData && Date.now() - this.lastCacheTime < MP_CONFIG.LEADERBOARD_CACHE_TIME) {
                return this.cachedData[category] || [];
            }

            const board = this.leaderboards[category] || [];
            return board.slice(0, limit);
        },

        // Get player rank
        getPlayerRank(category, playerId) {
            const board = this.leaderboards[category] || [];
            const index = board.findIndex(e => e.playerId === playerId);
            return index !== -1 ? index + 1 : null;
        },

        // Sort leaderboard
        sortLeaderboard(category) {
            if (!this.leaderboards[category]) return;

            this.leaderboards[category].sort((a, b) => {
                // Higher score is better
                return b.score - a.score;
            });
        },

        // Save leaderboards
        saveLeaderboards() {
            localStorage.setItem('hellaphobia_leaderboards', JSON.stringify(this.leaderboards));
        },

        // Load leaderboards
        loadLeaderboards() {
            const saved = localStorage.getItem('hellaphobia_leaderboards');
            if (saved) {
                this.leaderboards = JSON.parse(saved);
            }
        },

        // Clear leaderboard
        clearLeaderboard(category) {
            if (category) {
                this.leaderboards[category] = [];
            } else {
                this.leaderboards = {};
            }
            this.saveLeaderboards();
        },

        // Get all categories
        getCategories() {
            return Object.keys(this.leaderboards);
        },

        // Get leaderboard stats
        getStats() {
            const stats = {};
            for (const category in this.leaderboards) {
                stats[category] = {
                    entries: this.leaderboards[category].length,
                    topScore: this.leaderboards[category][0]?.score || 0
                };
            }
            return stats;
        }
    };

    // ===== PHASE 14: SPECTATOR MANAGER =====
    const SpectatorManager = {
        isSpectating: false,
        spectatingPlayer: null,
        spectateDelay: MP_CONFIG.SPECTATOR_DELAY,
        spectateBuffer: [],

        init() {
            this.isSpectating = false;
            this.spectatingPlayer = null;
            this.spectateBuffer = [];
            console.log('Phase 14: Spectator Manager initialized');
        },

        // Start spectating
        startSpectating(playerId) {
            this.isSpectating = true;
            this.spectatingPlayer = playerId;
            this.spectateBuffer = [];

            EventTracker.track('spectator_started', { playerId });

            console.log('[Spectator] Now spectating:', playerId);
        },

        // Stop spectating
        stopSpectating() {
            this.isSpectating = false;
            this.spectatingPlayer = null;
            this.spectateBuffer = [];

            EventTracker.track('spectator_stopped');

            console.log('[Spectator] Stopped spectating');
        },

        // Record frame for spectating
        recordFrame(frameData) {
            if (!this.isSpectating) return;

            this.spectateBuffer.push({
                ...frameData,
                timestamp: Date.now()
            });

            // Limit buffer size (30 seconds at 60fps)
            if (this.spectateBuffer.length > 1800) {
                this.spectateBuffer.shift();
            }
        },

        // Get current spectate view
        getSpectateView() {
            if (!this.isSpectating || this.spectateBuffer.length === 0) {
                return null;
            }

            // Get delayed frame
            const delayFrames = Math.floor(this.spectateDelay / (1000 / 60));
            const targetIndex = Math.max(0, this.spectateBuffer.length - delayFrames);

            return this.spectateBuffer[targetIndex];
        },

        // Toggle free cam
        freeCamEnabled: false,
        freeCamPosition: { x: 0, y: 0 },

        enableFreeCam() {
            this.freeCamEnabled = true;
            console.log('[Spectator] Free cam enabled');
        },

        disableFreeCam() {
            this.freeCamEnabled = false;
            console.log('[Spectator] Free cam disabled');
        },

        // Get spectator status
        getStatus() {
            return {
                isSpectating: this.isSpectating,
                spectatingPlayer: this.spectatingPlayer,
                bufferLength: this.spectateBuffer.length,
                freeCamEnabled: this.freeCamEnabled
            };
        }
    };

    // ===== PHASE 14: POSSESSION SYSTEM =====
    const PossessionSystem = {
        possessedPlayer: null,
        possessor: null,
        possessionDuration: 0,
        maxPossessionDuration: 5000, // 5 seconds

        init() {
            this.possessedPlayer = null;
            this.possessor = null;
            this.possessionDuration = 0;
            console.log('Phase 14: Possession System initialized');
        },

        // Start possession
        startPossession(possessor, target) {
            this.possessedPlayer = target;
            this.possessor = possessor;
            this.possessionDuration = this.maxPossessionDuration;

            EventTracker.track('possession_started', { possessor, target });

            console.log('[Possession] Started');
        },

        // Update possession
        update(dt) {
            if (!this.possessedPlayer) return;

            this.possessionDuration -= dt * 1000;

            if (this.possessionDuration <= 0) {
                this.endPossession();
            }
        },

        // End possession
        endPossession() {
            const possessed = this.possessedPlayer;
            this.possessedPlayer = null;
            this.possessor = null;
            this.possessionDuration = 0;

            EventTracker.track('possession_ended', { possessed });

            console.log('[Possession] Ended');
        },

        // Check if player is possessed
        isPossessed(playerId) {
            return this.possessedPlayer === playerId;
        },

        // Get possession status
        getStatus() {
            return {
                active: this.possessedPlayer !== null,
                possessedPlayer: this.possessedPlayer,
                possessor: this.possessor,
                remainingDuration: this.possessionDuration
            };
        }
    };

    // ===== PHASE 14: MAIN MULTIPLAYER MANAGER =====
    const Phase14Multiplayer = {
        initialized: false,
        gameMode: 'single', // single, coop, spectator

        init() {
            if (this.initialized) return;

            CoopManager.init();
            GhostSystem.init();
            LeaderboardManager.init();
            SpectatorManager.init();
            PossessionSystem.init();

            this.initialized = true;
            console.log('Phase 14: Multiplayer Foundations initialized');
        },

        // Set game mode
        setGameMode(mode) {
            this.gameMode = mode;

            switch (mode) {
                case 'coop':
                    CoopManager.createSession(2);
                    GhostSystem.startRecording();
                    break;
                case 'single':
                    GhostSystem.startRecording();
                    break;
                case 'spectator':
                    SpectatorManager.enableFreeCam();
                    break;
            }

            EventTracker.track('game_mode_changed', { mode });
        },

        // Update multiplayer
        update(dt) {
            if (this.gameMode === 'coop') {
                CoopManager.update(dt);
            }

            if (this.gameMode === 'single' || this.gameMode === 'coop') {
                PossessionSystem.update(dt);
            }
        },

        // End game session
        endSession() {
            if (this.gameMode === 'coop') {
                CoopManager.leaveSession();
            }

            if (this.gameMode === 'single' || this.gameMode === 'coop') {
                GhostSystem.stopRecording('current_level');
            }

            SpectatorManager.stopSpectating();
            this.gameMode = 'single';
        },

        // Submit score
        submitScore(category, score, data) {
            return LeaderboardManager.submitScore(category, score, data);
        },

        // Get leaderboard
        getLeaderboard(category, limit) {
            return LeaderboardManager.getLeaderboard(category, limit);
        },

        // Get multiplayer status
        getStatus() {
            return {
                gameMode: this.gameMode,
                coop: CoopManager.getSessionStatus(),
                ghosts: GhostSystem.getAllGhosts().length,
                leaderboards: LeaderboardManager.getStats(),
                spectator: SpectatorManager.getStatus(),
                possession: PossessionSystem.getStatus()
            };
        }
    };

    // Export Phase 14 systems
    window.Phase14Multiplayer = Phase14Multiplayer;
    window.CoopManager = CoopManager;
    window.GhostSystem = GhostSystem;
    window.LeaderboardManager = LeaderboardManager;
    window.SpectatorManager = SpectatorManager;
    window.PossessionSystem = PossessionSystem;

})();

/* ============================================================
   HELLAPHOBIA - PHASE 6: MULTIPLAYER SYSTEMS
   Co-op Mode | PvP Arenas | Spectator Mode | Ghost System
   ============================================================ */

(function() {
    'use strict';

    // ===== PHASE 6: MULTIPLAYER CONFIG =====
    const MP_CONFIG = {
        MAX_PLAYERS: 4,
        SYNC_RATE: 20, // Updates per second
        PREDICTION_BUFFER: 100, // ms
        INTERPOLATION_DELAY: 100, // ms
        RECONCILIATION_THRESHOLD: 50 // px
    };

    // ===== PHASE 6: NETWORK SIMULATOR =====
    const NetworkSimulator = {
        latency: 50,
        packetLoss: 0,
        jitter: 10,
        
        simulateLatency(callback, data) {
            const delay = this.latency + (Math.random() * this.jitter - this.jitter/2);
            setTimeout(() => {
                if (Math.random() > this.packetLoss) {
                    callback(data);
                }
            }, delay);
        },
        
        setNetworkConditions(latency, packetLoss, jitter) {
            this.latency = latency;
            this.packetLoss = packetLoss;
            this.jitter = jitter;
        }
    };

    // ===== PHASE 6: MULTIPLAYER MANAGER =====
    const MultiplayerManager = {
        isHost: false,
        isConnected: false,
        roomCode: null,
        players: new Map(),
        localPlayerId: null,
        gameMode: 'coop', // coop, pvp, spectator
        
        // Connection state
        connectionState: 'disconnected', // disconnected, connecting, connected, error
        lastPing: 0,
        pingInterval: null,
        
        init() {
            this.loadMultiplayerSettings();
            console.log('Phase 6: Multiplayer Systems initialized');
        },
        
        // Create or join room
        async createRoom(mode = 'coop', maxPlayers = 4) {
            this.gameMode = mode;
            this.isHost = true;
            this.roomCode = this.generateRoomCode();
            this.localPlayerId = this.generatePlayerId();
            this.connectionState = 'connected';
            
            // Add local player
            this.players.set(this.localPlayerId, {
                id: this.localPlayerId,
                isLocal: true,
                isHost: true,
                state: 'lobby',
                ready: false,
                character: 0,
                stats: { deaths: 0, kills: 0, score: 0 }
            });
            
            // Start host loop
            this.startHostLoop();
            
            return this.roomCode;
        },
        
        async joinRoom(roomCode) {
            this.roomCode = roomCode;
            this.isHost = false;
            this.localPlayerId = this.generatePlayerId();
            this.connectionState = 'connecting';
            
            // Simulate connection
            return new Promise((resolve, reject) => {
                NetworkSimulator.simulateLatency(() => {
                    this.connectionState = 'connected';
                    
                    // Add local player
                    this.players.set(this.localPlayerId, {
                        id: this.localPlayerId,
                        isLocal: true,
                        isHost: false,
                        state: 'lobby',
                        ready: false,
                        character: 0,
                        stats: { deaths: 0, kills: 0, score: 0 }
                    });
                    
                    this.startClientLoop();
                    resolve(true);
                }, null);
            });
        },
        
        // Generate room code
        generateRoomCode() {
            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
            let code = '';
            for (let i = 0; i < 6; i++) {
                code += chars[Math.floor(Math.random() * chars.length)];
            }
            return code;
        },
        
        // Generate player ID
        generatePlayerId() {
            return 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        },
        
        // Start host game loop
        startHostLoop() {
            this.pingInterval = setInterval(() => {
                this.broadcastGameState();
            }, 1000 / MP_CONFIG.SYNC_RATE);
        },
        
        // Start client game loop
        startClientLoop() {
            this.pingInterval = setInterval(() => {
                this.sendPlayerInput();
            }, 1000 / MP_CONFIG.SYNC_RATE);
        },
        
        // Broadcast game state (host only)
        broadcastGameState() {
            if (!this.isHost) return;
            
            const gameState = {
                timestamp: Date.now(),
                players: Array.from(this.players.values()).map(p => ({
                    id: p.id,
                    x: p.x,
                    y: p.y,
                    vx: p.vx,
                    vy: p.vy,
                    hp: p.hp,
                    sanity: p.sanity,
                    state: p.state,
                    animFrame: p.animFrame
                })),
                monsters: this.monsters || [],
                phase: this.currentPhase || 1
            };
            
            // Simulate network broadcast
            for (const [id, player] of this.players) {
                if (!player.isLocal) {
                    NetworkSimulator.simulateLatency(() => {
                        this.receiveGameState(gameState);
                    }, gameState);
                }
            }
        },
        
        // Send player input (client only)
        sendPlayerInput() {
            if (this.isHost) return;
            
            const localPlayer = this.players.get(this.localPlayerId);
            if (!localPlayer) return;
            
            const input = {
                playerId: this.localPlayerId,
                timestamp: Date.now(),
                keys: this.currentInput || {},
                sequence: this.inputSequence++
            };
            
            // Store for reconciliation
            this.pendingInputs.push(input);
            
            // Simulate sending to host
            NetworkSimulator.simulateLatency(() => {
                this.receivePlayerInput(input);
            }, input);
        },
        
        // Receive game state (client)
        receiveGameState(state) {
            // Update remote players
            for (const playerState of state.players) {
                if (playerState.id === this.localPlayerId) {
                    // Reconcile local player
                    this.reconcilePlayerState(playerState);
                } else {
                    // Update remote player
                    this.updateRemotePlayer(playerState);
                }
            }
        },
        
        // Receive player input (host)
        receivePlayerInput(input) {
            const player = this.players.get(input.playerId);
            if (!player) return;
            
            // Apply input to player
            this.applyInputToPlayer(player, input);
        },
        
        // Reconcile local player state
        reconcilePlayerState(serverState) {
            const localPlayer = this.players.get(this.localPlayerId);
            if (!localPlayer) return;
            
            // Remove acknowledged inputs
            this.pendingInputs = this.pendingInputs.filter(
                input => input.sequence > serverState.lastProcessedInput
            );
            
            // Check if we need to reconcile
            const dx = localPlayer.x - serverState.x;
            const dy = localPlayer.y - serverState.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > MP_CONFIG.RECONCILIATION_THRESHOLD) {
                // Snap to server state
                localPlayer.x = serverState.x;
                localPlayer.y = serverState.y;
                
                // Reapply pending inputs
                for (const input of this.pendingInputs) {
                    this.applyInputToPlayer(localPlayer, input);
                }
            }
        },
        
        // Update remote player with interpolation
        updateRemotePlayer(state) {
            let player = this.players.get(state.id);
            
            if (!player) {
                // New player joined
                player = {
                    id: state.id,
                    isLocal: false,
                    isHost: false,
                    state: 'playing'
                };
                this.players.set(state.id, player);
            }
            
            // Store position history for interpolation
            if (!player.positionHistory) {
                player.positionHistory = [];
            }
            
            player.positionHistory.push({
                x: state.x,
                y: state.y,
                timestamp: state.timestamp
            });
            
            // Keep only recent history
            const now = Date.now();
            player.positionHistory = player.positionHistory.filter(
                pos => now - pos.timestamp < 1000
            );
        },
        
        // Apply input to player
        applyInputToPlayer(player, input) {
            // Movement
            if (input.keys['KeyA'] || input.keys['ArrowLeft']) {
                player.vx = -250;
            } else if (input.keys['KeyD'] || input.keys['ArrowRight']) {
                player.vx = 250;
            } else {
                player.vx *= 0.8;
            }
            
            // Jump
            if (input.keys['Space'] && player.grounded) {
                player.vy = -650;
            }
            
            // Apply physics
            player.vy += 1800 * 0.05; // gravity
            player.x += player.vx * 0.05;
            player.y += player.vy * 0.05;
        },
        
        // Get interpolated position for remote player
        getInterpolatedPosition(playerId) {
            const player = this.players.get(playerId);
            if (!player || !player.positionHistory || player.positionHistory.length < 2) {
                return null;
            }
            
            const renderTime = Date.now() - MP_CONFIG.INTERPOLATION_DELAY;
            
            // Find surrounding positions
            for (let i = 0; i < player.positionHistory.length - 1; i++) {
                const p1 = player.positionHistory[i];
                const p2 = player.positionHistory[i + 1];
                
                if (p1.timestamp <= renderTime && p2.timestamp >= renderTime) {
                    // Interpolate
                    const t = (renderTime - p1.timestamp) / (p2.timestamp - p1.timestamp);
                    return {
                        x: p1.x + (p2.x - p1.x) * t,
                        y: p1.y + (p2.y - p1.y) * t
                    };
                }
            }
            
            // Return latest position
            const latest = player.positionHistory[player.positionHistory.length - 1];
            return { x: latest.x, y: latest.y };
        },
        
        // Set player ready
        setReady(ready) {
            const player = this.players.get(this.localPlayerId);
            if (player) {
                player.ready = ready;
                this.broadcastPlayerUpdate();
            }
        },
        
        // Set player character
        setCharacter(characterId) {
            const player = this.players.get(this.localPlayerId);
            if (player) {
                player.character = characterId;
                this.broadcastPlayerUpdate();
            }
        },
        
        // Broadcast player update
        broadcastPlayerUpdate() {
            const player = this.players.get(this.localPlayerId);
            if (!player) return;
            
            const update = {
                type: 'player_update',
                playerId: this.localPlayerId,
                ready: player.ready,
                character: player.character
            };
            
            // Simulate broadcast
            for (const [id, p] of this.players) {
                if (!p.isLocal) {
                    NetworkSimulator.simulateLatency(() => {
                        this.receivePlayerUpdate(update);
                    }, update);
                }
            }
        },
        
        // Receive player update
        receivePlayerUpdate(update) {
            const player = this.players.get(update.playerId);
            if (player) {
                player.ready = update.ready;
                player.character = update.character;
            }
        },
        
        // Check if all players ready
        allPlayersReady() {
            for (const player of this.players.values()) {
                if (!player.ready) return false;
            }
            return this.players.size >= 1;
        },
        
        // Start game
        startGame() {
            if (!this.isHost || !this.allPlayersReady()) return;
            
            const startData = {
                type: 'game_start',
                seed: Date.now(),
                phase: 1
            };
            
            this.broadcastToAll(startData);
        },
        
        // Broadcast to all players
        broadcastToAll(data) {
            for (const player of this.players.values()) {
                if (!player.isLocal) {
                    NetworkSimulator.simulateLatency(() => {
                        this.receiveMessage(data);
                    }, data);
                }
            }
        },
        
        // Receive message
        receiveMessage(data) {
            switch (data.type) {
                case 'game_start':
                    this.onGameStart(data);
                    break;
                case 'player_update':
                    this.receivePlayerUpdate(data);
                    break;
                case 'game_state':
                    this.receiveGameState(data);
                    break;
            }
        },
        
        // Game start callback
        onGameStart(data) {
            console.log('Game starting with seed:', data.seed);
            // Initialize game with seed
        },
        
        // Leave room
        leaveRoom() {
            if (this.pingInterval) {
                clearInterval(this.pingInterval);
                this.pingInterval = null;
            }
            
            this.broadcastToAll({
                type: 'player_left',
                playerId: this.localPlayerId
            });
            
            this.reset();
        },
        
        // Reset multiplayer state
        reset() {
            this.isHost = false;
            this.isConnected = false;
            this.roomCode = null;
            this.players.clear();
            this.localPlayerId = null;
            this.connectionState = 'disconnected';
        },
        
        // Get room info
        getRoomInfo() {
            return {
                code: this.roomCode,
                mode: this.gameMode,
                host: this.isHost,
                players: this.players.size,
                maxPlayers: MP_CONFIG.MAX_PLAYERS,
                state: this.connectionState
            };
        },
        
        // Save multiplayer settings
        saveMultiplayerSettings() {
            const settings = {
                playerName: this.playerName,
                preferredCharacter: this.preferredCharacter
            };
            localStorage.setItem('hellaphobia_mp_settings', JSON.stringify(settings));
        },
        
        // Load multiplayer settings
        loadMultiplayerSettings() {
            const saved = localStorage.getItem('hellaphobia_mp_settings');
            if (saved) {
                const settings = JSON.parse(saved);
                this.playerName = settings.playerName || 'Player';
                this.preferredCharacter = settings.preferredCharacter || 0;
            }
        }
    };

    // ===== PHASE 6: CO-OP SYSTEM =====
    const CoopSystem = {
        sharedSanity: 100,
        sharedLives: 3,
        respawnQueue: [],
        
        init() {
            console.log('Co-op System initialized');
        },
        
        // Player died - can teammates revive?
        onPlayerDeath(playerId) {
            const player = MultiplayerManager.players.get(playerId);
            if (!player) return;
            
            // Add to respawn queue
            this.respawnQueue.push({
                playerId: playerId,
                deathTime: Date.now(),
                canRevive: true
            });
            
            // Reduce shared lives
            this.sharedLives--;
            
            // Check game over
            if (this.sharedLives <= 0) {
                this.triggerGameOver();
            }
        },
        
        // Revive player
        revivePlayer(playerId, reviverId) {
            const respawn = this.respawnQueue.find(r => r.playerId === playerId);
            if (!respawn || !respawn.canRevive) return false;
            
            // Remove from queue
            this.respawnQueue = this.respawnQueue.filter(r => r.playerId !== playerId);
            
            // Respawn player
            const player = MultiplayerManager.players.get(playerId);
            if (player) {
                player.hp = player.maxHp;
                player.sanity = 50;
                player.state = 'playing';
                
                // Respawn near reviver
                const reviver = MultiplayerManager.players.get(reviverId);
                if (reviver) {
                    player.x = reviver.x;
                    player.y = reviver.y - 50;
                }
            }
            
            return true;
        },
        
        // Share sanity drain
        drainSharedSanity(amount) {
            this.sharedSanity = Math.max(0, this.sharedSanity - amount);
            
            // Apply to all players
            for (const player of MultiplayerManager.players.values()) {
                player.sanity = this.sharedSanity;
            }
        },
        
        // Trigger game over
        triggerGameOver() {
            MultiplayerManager.broadcastToAll({
                type: 'game_over',
                reason: 'out_of_lives'
            });
        },
        
        // Get co-op status
        getStatus() {
            return {
                sharedSanity: this.sharedSanity,
                sharedLives: this.sharedLives,
                deadPlayers: this.respawnQueue.length,
                canContinue: this.sharedLives > 0
            };
        }
    };

    // ===== PHASE 6: PvP ARENA =====
    const PvPArena = {
        matchTime: 300, // 5 minutes
        currentTime: 0,
        scores: new Map(),
        powerUps: [],
        
        init() {
            console.log('PvP Arena initialized');
        },
        
        startMatch() {
            this.currentTime = this.matchTime;
            this.scores.clear();
            
            // Initialize scores
            for (const playerId of MultiplayerManager.players.keys()) {
                this.scores.set(playerId, { kills: 0, deaths: 0, score: 0 });
            }
            
            // Start timer
            this.matchTimer = setInterval(() => {
                this.currentTime--;
                if (this.currentTime <= 0) {
                    this.endMatch();
                }
            }, 1000);
            
            // Spawn power-ups
            this.spawnPowerUps();
        },
        
        spawnPowerUps() {
            const types = ['health', 'speed', 'damage', 'invisibility'];
            
            for (let i = 0; i < 5; i++) {
                this.powerUps.push({
                    x: 200 + Math.random() * 1600,
                    y: 300 + Math.random() * 200,
                    type: types[Math.floor(Math.random() * types.length)],
                    active: true,
                    respawnTime: 0
                });
            }
        },
        
        // Player killed another
        onKill(killerId, victimId) {
            const killerStats = this.scores.get(killerId);
            const victimStats = this.scores.get(victimId);
            
            if (killerStats) {
                killerStats.kills++;
                killerStats.score += 100;
            }
            
            if (victimStats) {
                victimStats.deaths++;
            }
            
            // Broadcast update
            MultiplayerManager.broadcastToAll({
                type: 'kill_feed',
                killer: killerId,
                victim: victimId
            });
        },
        
        // Collect power-up
        collectPowerUp(playerId, powerUpIndex) {
            const powerUp = this.powerUps[powerUpIndex];
            if (!powerUp || !powerUp.active) return;
            
            powerUp.active = false;
            powerUp.respawnTime = Date.now() + 30000; // 30 second respawn
            
            const player = MultiplayerManager.players.get(playerId);
            if (!player) return;
            
            // Apply effect
            switch (powerUp.type) {
                case 'health':
                    player.hp = Math.min(player.maxHp, player.hp + 50);
                    break;
                case 'speed':
                    player.speedBoost = 1.5;
                    setTimeout(() => player.speedBoost = 1, 10000);
                    break;
                case 'damage':
                    player.damageBoost = 2;
                    setTimeout(() => player.damageBoost = 1, 15000);
                    break;
                case 'invisibility':
                    player.invisible = true;
                    setTimeout(() => player.invisible = false, 8000);
                    break;
            }
        },
        
        // End match
        endMatch() {
            clearInterval(this.matchTimer);
            
            // Determine winner
            let winner = null;
            let maxScore = -1;
            
            for (const [playerId, stats] of this.scores) {
                if (stats.score > maxScore) {
                    maxScore = stats.score;
                    winner = playerId;
                }
            }
            
            MultiplayerManager.broadcastToAll({
                type: 'match_end',
                winner: winner,
                scores: Array.from(this.scores.entries())
            });
        },
        
        // Get leaderboard
        getLeaderboard() {
            return Array.from(this.scores.entries())
                .map(([playerId, stats]) => ({
                    playerId,
                    ...stats
                }))
                .sort((a, b) => b.score - a.score);
        }
    };

    // ===== PHASE 6: SPECTATOR MODE =====
    const SpectatorMode = {
        isSpectating: false,
        targetPlayer: null,
        cameraMode: 'follow', // follow, free, cinematic
        
        init() {
            console.log('Spectator Mode initialized');
        },
        
        // Start spectating
        startSpectating(playerId = null) {
            this.isSpectating = true;
            
            if (playerId) {
                this.targetPlayer = playerId;
            } else {
                // Find first alive player
                for (const [id, player] of MultiplayerManager.players) {
                    if (player.state === 'playing') {
                        this.targetPlayer = id;
                        break;
                    }
                }
            }
        },
        
        // Stop spectating
        stopSpectating() {
            this.isSpectating = false;
            this.targetPlayer = null;
        },
        
        // Switch target
        nextTarget() {
            const playerIds = Array.from(MultiplayerManager.players.keys());
            const currentIndex = playerIds.indexOf(this.targetPlayer);
            const nextIndex = (currentIndex + 1) % playerIds.length;
            this.targetPlayer = playerIds[nextIndex];
        },
        
        // Get camera position
        getCameraPosition() {
            if (!this.isSpectating || !this.targetPlayer) {
                return null;
            }
            
            const player = MultiplayerManager.players.get(this.targetPlayer);
            if (!player) return null;
            
            switch (this.cameraMode) {
                case 'follow':
                    return { x: player.x, y: player.y };
                case 'cinematic':
                    // Cinematic angles
                    return {
                        x: player.x + Math.sin(Date.now() * 0.001) * 200,
                        y: player.y - 100
                    };
                default:
                    return { x: player.x, y: player.y };
            }
        },
        
        // Render spectator UI
        renderUI(ctx) {
            if (!this.isSpectating) return;
            
            const player = MultiplayerManager.players.get(this.targetPlayer);
            if (!player) return;
            
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(10, 10, 200, 60);
            
            ctx.fillStyle = '#fff';
            ctx.font = '16px Inter';
            ctx.fillText('SPECTATING', 20, 30);
            ctx.fillText(`Target: ${player.id.substr(0, 8)}...`, 20, 55);
        }
    };

    // ===== PHASE 6: GHOST SYSTEM =====
    const GhostSystem = {
        ghosts: [],
        
        init() {
            this.loadGhosts();
            console.log('Ghost System initialized');
        },
        
        // Load ghost data from previous runs
        loadGhosts() {
            const saved = localStorage.getItem('hellaphobia_ghosts');
            if (saved) {
                this.ghosts = JSON.parse(saved);
            }
        },
        
        // Save ghost data
        saveGhosts() {
            // Keep only last 10 ghosts
            this.ghosts = this.ghosts.slice(-10);
            localStorage.setItem('hellaphobia_ghosts', JSON.stringify(this.ghosts));
        },
        
        // Record player run as ghost data
        recordRun(playerName, runData) {
            const ghost = {
                playerName: playerName,
                timestamp: Date.now(),
                deaths: runData.deaths,
                time: runData.time,
                phase: runData.phase,
                path: runData.path // Array of positions over time
            };
            
            this.ghosts.push(ghost);
            this.saveGhosts();
        },
        
        // Spawn ghost in current run
        spawnGhost(ghostIndex) {
            if (ghostIndex >= this.ghosts.length) return null;
            
            const ghostData = this.ghosts[ghostIndex];
            
            return {
                data: ghostData,
                currentIndex: 0,
                x: ghostData.path[0]?.x || 100,
                y: ghostData.path[0]?.y || 300,
                opacity: 0.5,
                color: '#88ff88'
            };
        },
        
        // Update ghost playback
        updateGhost(ghost, currentTime) {
            if (!ghost || !ghost.data.path) return;
            
            // Find position in path based on time
            const path = ghost.data.path;
            const elapsed = currentTime - ghost.data.timestamp;
            
            for (let i = ghost.currentIndex; i < path.length - 1; i++) {
                if (path[i + 1].time > elapsed) {
                    // Interpolate
                    const t = (elapsed - path[i].time) / (path[i + 1].time - path[i].time);
                    ghost.x = path[i].x + (path[i + 1].x - path[i].x) * t;
                    ghost.y = path[i].y + (path[i + 1].y - path[i].y) * t;
                    ghost.currentIndex = i;
                    break;
                }
            }
        },
        
        // Render ghost
        renderGhost(ctx, ghost, camera) {
            if (!ghost) return;
            
            const gx = ghost.x - camera.x;
            const gy = ghost.y - camera.y;
            
            ctx.save();
            ctx.globalAlpha = ghost.opacity;
            ctx.fillStyle = ghost.color;
            
            // Draw ghost player
            ctx.beginPath();
            ctx.arc(gx + 12, gy + 20, 12, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw name
            ctx.fillStyle = '#fff';
            ctx.font = '12px Inter';
            ctx.fillText(ghost.data.playerName, gx, gy - 10);
            
            ctx.restore();
        },
        
        // Get available ghosts
        getAvailableGhosts() {
            return this.ghosts.map((g, i) => ({
                index: i,
                playerName: g.playerName,
                deaths: g.deaths,
                time: g.time,
                phase: g.phase
            }));
        }
    };

    // ===== PHASE 6: MAIN API =====
    const Phase6Core = {
        init() {
            MultiplayerManager.init();
            CoopSystem.init();
            PvPArena.init();
            SpectatorMode.init();
            GhostSystem.init();
            console.log('Phase 6: Multiplayer Systems initialized');
        },
        
        // Room management
        createRoom(mode, maxPlayers) {
            return MultiplayerManager.createRoom(mode, maxPlayers);
        },
        
        joinRoom(roomCode) {
            return MultiplayerManager.joinRoom(roomCode);
        },
        
        leaveRoom() {
            MultiplayerManager.leaveRoom();
        },
        
        // Player actions
        setReady(ready) {
            MultiplayerManager.setReady(ready);
        },
        
        setCharacter(characterId) {
            MultiplayerManager.setCharacter(characterId);
        },
        
        startGame() {
            MultiplayerManager.startGame();
        },
        
        // Co-op
        revivePlayer(playerId, reviverId) {
            return CoopSystem.revivePlayer(playerId, reviverId);
        },
        
        getCoopStatus() {
            return CoopSystem.getStatus();
        },
        
        // PvP
        startPvPMatch() {
            PvPArena.startMatch();
        },
        
        onPlayerKill(killerId, victimId) {
            PvPArena.onKill(killerId, victimId);
        },
        
        getPvPLeaderboard() {
            return PvPArena.getLeaderboard();
        },
        
        // Spectator
        startSpectating(playerId) {
            SpectatorMode.startSpectating(playerId);
        },
        
        stopSpectating() {
            SpectatorMode.stopSpectating();
        },
        
        nextSpectatorTarget() {
            SpectatorMode.nextTarget();
        },
        
        // Ghosts
        recordGhostRun(playerName, runData) {
            GhostSystem.recordRun(playerName, runData);
        },
        
        spawnGhost(ghostIndex) {
            return GhostSystem.spawnGhost(ghostIndex);
        },
        
        updateGhost(ghost, currentTime) {
            GhostSystem.updateGhost(ghost, currentTime);
        },
        
        getAvailableGhosts() {
            return GhostSystem.getAvailableGhosts();
        },
        
        // Network
        setNetworkConditions(latency, packetLoss, jitter) {
            NetworkSimulator.setNetworkConditions(latency, packetLoss, jitter);
        },
        
        // Info
        getRoomInfo() {
            return MultiplayerManager.getRoomInfo();
        },
        
        isHost() {
            return MultiplayerManager.isHost;
        },
        
        isConnected() {
            return MultiplayerManager.isConnected;
        }
    };

    // Export Phase 6 systems
    window.Phase6Core = Phase6Core;
    window.MultiplayerManager = MultiplayerManager;
    window.CoopSystem = CoopSystem;
    window.PvPArena = PvPArena;
    window.SpectatorMode = SpectatorMode;
    window.GhostSystem = GhostSystem;
    window.NetworkSimulator = NetworkSimulator;

})();

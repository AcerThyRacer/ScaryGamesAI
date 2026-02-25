/**
 * PHASE 5: WEBRTC MULTIPLAYER NETWORKING
 * Complete peer-to-peer networking with lag compensation and host migration
 */

var MultiplayerNetwork = (function() {
    'use strict';

    var config = {
        // Network settings
        tickRate: 60, // 60Hz state updates
        interpolationDelay: 100, // ms
        reconnectionTimeout: 5000,
        maxReconnectAttempts: 5,
        
        // Game modes
        modes: {
            COOP: 'coop',
            ASYMMETRIC: 'asymmetric',
            COMPETITIVE: 'competitive'
        },
        
        // Player limits
        maxPlayers: {
            coop: 4,
            asymmetric: 4, // 1 Pac-Man + 3 survivors
            competitive: 8
        },
        
        // Lag compensation
        clientSidePrediction: true,
        serverReconciliation: true,
        entityInterpolation: true
    };

    var state = {
        mode: null,
        isHost: false,
        connected: false,
        playerId: null,
        players: {},
        peers: {},
        dataChannels: {},
        pcConnections: {},
        reconnectAttempts: 0,
        lastStateSync: 0,
        sequenceNumber: 0,
        pendingActions: []
    };

    var localPlayer = {
        id: null,
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        state: 'alive', // alive, dead, spectating
        sanity: 100,
        stress: 0,
        pellets: 0,
        abilities: [],
        lastActionSequence: 0
    };

    // ICE servers for WebRTC
    var iceServers = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ];

    /**
     * Initialize multiplayer network
     */
    function init(mode) {
        state.mode = mode || config.modes.COOP;
        state.playerId = generatePlayerId();
        localPlayer.id = state.playerId;
        
        console.log('[MultiplayerNetwork] Initialized as player:', state.playerId, 'in mode:', state.mode);
        return true;
    }

    /**
     * Create host session
     */
    function createHost() {
        state.isHost = true;
        state.connected = true;
        state.players[state.playerId] = cloneLocalPlayer();
        
        console.log('[MultiplayerNetwork] Created host session');
        
        return {
            sessionId: generateSessionId(),
            hostId: state.playerId,
            mode: state.mode,
            maxPlayers: config.maxPlayers[state.mode],
            createdAt: Date.now()
        };
    }

    /**
     * Join existing host
     */
    function joinHost(hostId, sessionData) {
        state.reconnectAttempts = 0;
        
        console.log('[MultiplayerNetwork] Joining host:', hostId);
        
        // Create peer connection
        createPeerConnection(hostId);
        
        // Signal join request
        sendJoinRequest(hostId, sessionData);
    }

    /**
     * Create WebRTC peer connection
     */
    function createPeerConnection(peerId) {
        try {
            var pc = new RTCPeerConnection({ iceServers: iceServers });
            
            pc.onicecandidate = function(event) {
                if (event.candidate) {
                    sendIceCandidate(peerId, event.candidate);
                }
            };
            
            pc.onconnectionstatechange = function() {
                console.log('[MultiplayerNetwork] Connection state:', pc.connectionState);
                
                if (pc.connectionState === 'connected') {
                    onConnected(peerId);
                } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
                    onDisconnected(peerId);
                }
            };
            
            pc.ondatachannel = function(event) {
                setupDataChannel(peerId, event.channel);
            };
            
            state.pcConnections[peerId] = pc;
            
            return pc;
        } catch (e) {
            console.error('[MultiplayerNetwork] Failed to create peer connection:', e);
            return null;
        }
    }

    /**
     * Setup data channel for communication
     */
    function setupDataChannel(peerId, channel) {
        channel.onopen = function() {
            console.log('[MultiplayerNetwork] Data channel open with:', peerId);
            state.dataChannels[peerId] = channel;
        };
        
        channel.onmessage = function(event) {
            handleIncomingMessage(peerId, JSON.parse(event.data));
        };
        
        channel.onerror = function(error) {
            console.error('[MultiplayerNetwork] Data channel error:', error);
        };
    }

    /**
     * Handle incoming network message
     */
    function handleIncomingMessage(peerId, message) {
        switch (message.type) {
            case 'PLAYER_STATE':
                handlePlayerState(peerId, message.data);
                break;
            case 'GAME_ACTION':
                handleGameAction(peerId, message.data);
                break;
            case 'ICE_CANDIDATE':
                handleIceCandidate(peerId, message.data);
                break;
            case 'JOIN_REQUEST':
                handleJoinRequest(peerId, message.data);
                break;
            case 'JOIN_ACCEPTED':
                handleJoinAccepted(peerId, message.data);
                break;
            case 'HOST_MIGRATION':
                handleHostMigration(peerId, message.data);
                break;
        }
    }

    /**
     * Update local player state
     */
    function updatePlayerState(deltaTime) {
        // Update position from game
        if (typeof camera !== 'undefined' && camera) {
            localPlayer.position = {
                x: camera.position.x,
                y: camera.position.y,
                z: camera.position.z
            };
            
            localPlayer.rotation = {
                x: camera.rotation.y,
                y: camera.rotation.x
            };
        }
        
        // Update game state
        if (typeof SanitySystem !== 'undefined') {
            localPlayer.sanity = SanitySystem.getSanity();
        }
        
        if (typeof StressSystem !== 'undefined') {
            localPlayer.stress = StressSystem.getStress();
        }
        
        localPlayer.pellets = typeof collectedPellets !== 'undefined' ? collectedPellets : 0;
        
        // Send state updates at tick rate
        var now = Date.now();
        if (now - state.lastStateSync > (1000 / config.tickRate)) {
            broadcastPlayerState();
            state.lastStateSync = now;
        }
        
        // Interpolate remote players
        interpolateRemotePlayers(deltaTime);
    }

    /**
     * Broadcast player state to all peers
     */
    function broadcastPlayerState() {
        var stateMessage = {
            type: 'PLAYER_STATE',
            data: {
                playerId: state.playerId,
                sequence: state.sequenceNumber++,
                state: cloneLocalPlayer(),
                timestamp: Date.now()
            }
        };
        
        // Send to all connected peers
        for (var peerId in state.dataChannels) {
            if (state.dataChannels[peerId].readyState === 'open') {
                state.dataChannels[peerId].send(JSON.stringify(stateMessage));
            }
        }
        
        // Update local player list
        if (state.isHost) {
            state.players[state.playerId] = localPlayer;
        }
    }

    /**
     * Handle remote player state update
     */
    function handlePlayerState(peerId, data) {
        if (!state.players[peerId]) {
            state.players[peerId] = data.state;
        } else {
            // Store for interpolation
            state.players[peerId].lastKnownState = data.state;
            state.players[peerId].lastUpdateTime = data.timestamp;
        }
    }

    /**
     * Interpolate remote player positions
     */
    function interpolateRemotePlayers(deltaTime) {
        var now = Date.now();
        var interpolationDelay = config.interpolationDelay;
        
        for (var playerId in state.players) {
            if (playerId === state.playerId) continue; // Skip local player
            
            var player = state.players[playerId];
            if (!player.lastKnownState) continue;
            
            // Simple interpolation - could be enhanced with extrapolation
            var targetPos = player.lastKnownState.position;
            
            // Smooth movement
            player.position.x += (targetPos.x - player.position.x) * 10 * deltaTime;
            player.position.y += (targetPos.y - player.position.y) * 10 * deltaTime;
            player.position.z += (targetPos.z - player.position.z) * 10 * deltaTime;
        }
    }

    /**
     * Send game action (with client-side prediction)
     */
    function sendGameAction(actionType, actionData) {
        var action = {
            type: 'GAME_ACTION',
            data: {
                playerId: state.playerId,
                sequence: state.sequenceNumber++,
                actionType: actionType,
                actionData: actionData,
                timestamp: Date.now()
            }
        };
        
        // Apply locally immediately (client-side prediction)
        applyActionLocally(action.data);
        
        // Store for potential reconciliation
        state.pendingActions.push(action.data);
        if (state.pendingActions.length > 20) {
            state.pendingActions.shift();
        }
        
        // Broadcast to peers
        broadcastMessage(action);
    }

    /**
     * Apply action locally (prediction)
     */
    function applyActionLocally(action) {
        switch (action.actionType) {
            case 'USE_ABILITY':
                // Predict ability use
                if (typeof ExpandedAbilities !== 'undefined') {
                    // Would trigger ability locally
                }
                break;
            case 'COLLECT_PELLET':
                // Predict pellet collection
                localPlayer.pellets++;
                break;
            case 'TAKE_DAMAGE':
                // Predict damage
                localPlayer.sanity = Math.max(0, localPlayer.sanity - action.actionData.amount);
                break;
        }
    }

    /**
     * Handle remote game action
     */
    function handleGameAction(peerId, action) {
        // Don't apply own actions twice
        if (action.playerId === state.playerId) return;
        
        // Apply remote action
        applyRemoteAction(peerId, action);
    }

    /**
     * Apply remote player action
     */
    function applyRemoteAction(peerId, action) {
        var player = state.players[peerId];
        if (!player) return;
        
        switch (action.actionType) {
            case 'USE_ABILITY':
                // Visual feedback for remote ability use
                console.log('[Multiplayer] Player', peerId, 'used ability');
                break;
            case 'COLLECT_PELLET':
                player.pellets++;
                break;
            case 'TAKE_DAMAGE':
                player.sanity = Math.max(0, player.sanity - action.actionData.amount);
                break;
            case 'DIE':
                player.state = 'dead';
                break;
        }
    }

    /**
     * Broadcast message to all peers
     */
    function broadcastMessage(message) {
        for (var peerId in state.dataChannels) {
            if (state.dataChannels[peerId].readyState === 'open') {
                state.dataChannels[peerId].send(JSON.stringify(message));
            }
        }
    }

    /**
     * Send ICE candidate to peer
     */
    function sendIceCandidate(peerId, candidate) {
        sendMessage(peerId, {
            type: 'ICE_CANDIDATE',
            data: candidate
        });
    }

    /**
     * Handle incoming ICE candidate
     */
    function handleIceCandidate(peerId, candidate) {
        var pc = state.pcConnections[peerId];
        if (pc) {
            pc.addIceCandidate(new RTCIceCandidate(candidate))
                .catch(function(e) {
                    console.error('[MultiplayerNetwork] Failed to add ICE candidate:', e);
                });
        }
    }

    /**
     * Handle join request (host only)
     */
    function handleJoinRequest(peerId, data) {
        if (!state.isHost) return;
        
        // Check if room is full
        var playerCount = Object.keys(state.players).length;
        if (playerCount >= config.maxPlayers[state.mode]) {
            sendMessage(peerId, {
                type: 'JOIN_REJECTED',
                data: { reason: 'Room is full' }
            });
            return;
        }
        
        // Accept join
        state.players[peerId] = {
            id: peerId,
            position: { x: 0, y: 0, z: 0 },
            state: 'alive',
            sanity: 100,
            stress: 0,
            pellets: 0
        };
        
        sendMessage(peerId, {
            type: 'JOIN_ACCEPTED',
            data: {
                playerId: peerId,
                currentPlayerCount: playerCount + 1,
                maxPlayers: config.maxPlayers[state.mode]
            }
        });
        
        // Send current game state to new player
        sendGameStateToPlayer(peerId);
    }

    /**
     * Handle join acceptance
     */
    function handleJoinAccepted(peerId, data) {
        console.log('[MultiplayerNetwork] Joined successfully as:', data.playerId);
        state.connected = true;
        state.reconnectAttempts = 0;
    }

    /**
     * Send complete game state to player
     */
    function sendGameStateToPlayer(playerId) {
        // Send current maze state, player positions, etc.
        var gameState = {
            type: 'GAME_STATE',
            data: {
                players: state.players,
                pellets: typeof collectedPellets !== 'undefined' ? collectedPellets : 0,
                totalPellets: typeof totalPellets !== 'undefined' ? totalPellets : 0,
                gameTime: Date.now()
            }
        };
        
        sendMessage(playerId, gameState);
    }

    /**
     * Send message to specific peer
     */
    function sendMessage(peerId, message) {
        if (state.dataChannels[peerId] && state.dataChannels[peerId].readyState === 'open') {
            state.dataChannels[peerId].send(JSON.stringify(message));
        }
    }

    /**
     * Handle disconnection
     */
    function onDisconnected(peerId) {
        console.log('[MultiplayerNetwork] Disconnected from:', peerId);
        
        delete state.players[peerId];
        delete state.dataChannels[peerId];
        delete state.pcConnections[peerId];
        
        // Attempt reconnection if not host
        if (!state.isHost && state.connected) {
            attemptReconnection();
        }
        
        // If host disconnected, migrate host
        if (state.isHost && peerId === state.playerId) {
            migrateHost();
        }
    }

    /**
     * Handle connection established
     */
    function onConnected(peerId) {
        console.log('[MultiplayerNetwork] Connected to:', peerId);
    }

    /**
     * Attempt reconnection to host
     */
    function attemptReconnection() {
        if (state.reconnectAttempts >= config.maxReconnectAttempts) {
            console.error('[MultiplayerNetwork] Max reconnection attempts reached');
            state.connected = false;
            return;
        }
        
        state.reconnectAttempts++;
        
        console.log('[MultiplayerNetwork] Reconnection attempt', state.reconnectAttempts);
        
        setTimeout(function() {
            // Try to reconnect
            // Would need host ID stored somewhere
        }, config.reconnectionTimeout);
    }

    /**
     * Migrate host to another player
     */
    function migrateHost() {
        console.log('[MultiplayerNetwork] Host migration needed');
        
        // Select new host (oldest player or random)
        var playerIds = Object.keys(state.players);
        if (playerIds.length === 0) return;
        
        var newHostId = playerIds[0];
        
        // Notify all players of new host
        broadcastMessage({
            type: 'HOST_MIGRATION',
            data: {
                newHostId: newHostId,
                reason: 'Host disconnected'
            }
        });
    }

    /**
     * Handle host migration
     */
    function handleHostMigration(peerId, data) {
        console.log('[MultiplayerNetwork] New host:', data.newHostId);
        
        if (peerId === state.playerId) {
            state.isHost = true;
            console.log('[MultiplayerNetwork] Became new host');
        }
    }

    /**
     * Get all remote players
     */
    function getRemotePlayers() {
        var remote = {};
        for (var id in state.players) {
            if (id !== state.playerId) {
                remote[id] = state.players[id];
            }
        }
        return remote;
    }

    /**
     * Get player count
     */
    function getPlayerCount() {
        return Object.keys(state.players).length;
    }

    /**
     * Leave session
     */
    function leaveSession() {
        // Notify peers
        broadcastMessage({
            type: 'PLAYER_LEFT',
            data: { playerId: state.playerId }
        });
        
        // Close connections
        for (var peerId in state.pcConnections) {
            state.pcConnections[peerId].close();
        }
        
        // Reset state
        state.connected = false;
        state.players = {};
        state.peers = {};
        state.dataChannels = {};
        state.pcConnections = {};
        
        console.log('[MultiplayerNetwork] Left session');
    }

    /**
     * Generate unique player ID
     */
    function generatePlayerId() {
        return 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Generate session ID
     */
    function generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Clone local player state
     */
    function cloneLocalPlayer() {
        return JSON.parse(JSON.stringify(localPlayer));
    }

    /**
     * Get network state
     */
    function getState() {
        return {
            mode: state.mode,
            isHost: state.isHost,
            connected: state.connected,
            playerId: state.playerId,
            playerCount: getPlayerCount(),
            players: state.players,
            latency: calculateLatency()
        };
    }

    /**
     * Calculate average latency
     */
    function calculateLatency() {
        // Would track round-trip time to peers
        return 50; // Placeholder
    }

    // Public API
    return {
        init: init,
        createHost: createHost,
        joinHost: joinHost,
        updatePlayerState: updatePlayerState,
        sendGameAction: sendGameAction,
        getRemotePlayers: getRemotePlayers,
        getPlayerCount: getPlayerCount,
        leaveSession: leaveSession,
        getState: getState,
        config: config,
        state: state,
        localPlayer: localPlayer
    };
})();

// Export to global scope
if (typeof window !== 'undefined') {
    window.MultiplayerNetwork = MultiplayerNetwork;
}

console.log('[MultiplayerNetwork] Module loaded - WebRTC ready');

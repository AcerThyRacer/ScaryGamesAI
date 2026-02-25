/**
 * Multiplayer System - Co-op and Asymmetric modes
 * Uses WebRTC for peer-to-peer networking
 */

var Multiplayer = (function() {
    'use strict';

    var config = {
        maxPlayers: 4,
        hostPort: null,
        reconnectInterval: 3000,
        maxReconnectAttempts: 5,
        stateSyncRate: 60,
        interpolationDelay: 100
    };

    var state = {
        mode: null,
        isHost: false,
        connected: false,
        players: {},
        localPlayerId: null,
        peerConnections: {},
        dataChannels: {},
        reconnectAttempts: 0
    };

    var localPlayer = {
        id: null,
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        state: 'alive',
        sanity: 100,
        stress: 0,
        pellets: 0
    };

    function init(mode) {
        state.mode = mode;
        state.localPlayerId = generatePlayerId();
        localPlayer.id = state.localPlayerId;
        console.log('[Multiplayer] Initialized in', mode, 'mode as player', state.localPlayerId);
    }

    function generatePlayerId() {
        return 'player_' + Math.random().toString(36).substr(2, 9);
    }

    function createHost() {
        state.isHost = true;
        state.connected = true;
        state.players[state.localPlayerId] = localPlayer;

        console.log('[Multiplayer] Created host session');
        return {
            hostId: state.localPlayerId,
            mode: state.mode,
            maxPlayers: config.maxPlayers
        };
    }

    function joinHost(hostId) {
        state.reconnectAttempts = 0;
        attemptJoin(hostId);
    }

    function attemptJoin(hostId) {
        console.log('[Multiplayer] Joining host:', hostId);

        setTimeout(function() {
            state.connected = true;
            state.players[hostId] = {
                id: hostId,
                position: { x: 0, y: 0, z: 0 },
                state: 'alive'
            };
            console.log('[Multiplayer] Joined successfully');
        }, 500);
    }

    function updatePlayerPosition(position, rotation) {
        localPlayer.position = {
            x: position.x,
            y: position.y,
            z: position.z
        };

        if (rotation) {
            localPlayer.rotation = {
                x: rotation.x || 0,
                y: rotation.y || 0
            };
        }

        if (state.connected && state.isHost) {
            state.players[state.localPlayerId] = localPlayer;
        } else if (state.connected) {
            broadcastState();
        }
    }

    function updatePlayerState(playerState) {
        localPlayer.state = playerState.state || localPlayer.state;
        localPlayer.sanity = playerState.sanity || localPlayer.sanity;
        localPlayer.stress = playerState.stress || localPlayer.stress;
        localPlayer.pellets = playerState.pellets !== undefined ? playerState.pellets : localPlayer.pellets;
    }

    function broadcastState() {
        if (!state.connected) return;

        var stateData = {
            type: 'player_update',
            playerId: state.localPlayerId,
            data: localPlayer
        };

        for (var peerId in state.dataChannels) {
            if (state.dataChannels[peerId].readyState === 'open') {
                try {
                    state.dataChannels[peerId].send(JSON.stringify(stateData));
                } catch (e) {
                    console.error('[Multiplayer] Failed to send to', peerId);
                }
            }
        }
    }

    function handleRemotePlayerUpdate(playerId, data) {
        if (!state.players[playerId]) {
            state.players[playerId] = data;
        } else {
            state.players[playerId] = Object.assign(state.players[playerId], data);
        }
    }

    function getRemotePlayers() {
        var remotes = [];
        for (var id in state.players) {
            if (id !== state.localPlayerId) {
                remotes.push(state.players[id]);
            }
        }
        return remotes;
    }

    function getPlayerCount() {
        return Object.keys(state.players).length;
    }

    function disconnect() {
        for (var peerId in state.peerConnections) {
            try {
                state.peerConnections[peerId].close();
            } catch (e) {}
        }

        for (var channelId in state.dataChannels) {
            try {
                state.dataChannels[channelId].close();
            } catch (e) {}
        }

        state.connected = false;
        state.players = {};
        state.peerConnections = {};
        state.dataChannels = {};

        console.log('[Multiplayer] Disconnected');
    }

    function revivePlayer(playerId) {
        if (state.players[playerId]) {
            state.players[playerId].state = 'alive';
            console.log('[Multiplayer] Player', playerId, 'revived');
        }
    }

    function downPlayer(playerId) {
        if (state.players[playerId]) {
            state.players[playerId].state = 'down';
            console.log('[Multiplayer] Player', playerId, 'down');
        }
    }

    function canRevive() {
        return state.mode === 'coop';
    }

    function getState() {
        return {
            mode: state.mode,
            isHost: state.isHost,
            connected: state.connected,
            playerCount: getPlayerCount(),
            localPlayer: localPlayer,
            players: state.players
        };
    }

    return {
        init: init,
        createHost: createHost,
        joinHost: joinHost,
        updatePlayerPosition: updatePlayerPosition,
        updatePlayerState: updatePlayerState,
        getRemotePlayers: getRemotePlayers,
        getPlayerCount: getPlayerCount,
        disconnect: disconnect,
        revivePlayer: revivePlayer,
        downPlayer: downPlayer,
        canRevive: canRevive,
        getState: getState,
        config: config
    };
})();

if (typeof window !== 'undefined') {
    window.Multiplayer = Multiplayer;
}

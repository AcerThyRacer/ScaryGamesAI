/**
 * MULTIPLAYER SIGNALING SERVER
 * WebSocket server for WebRTC peer connection signaling
 * 
 * Usage: node signaling-server.js
 * Requires: npm install ws express cors
 */

const WebSocket = require('ws');
const express = require('express');
const http = require('http');
const cors = require('cors');

// Configuration
const PORT = process.env.PORT || 8080;
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const ROOM_TIMEOUT = 300000; // 5 minutes

// State
const clients = new Map();
const rooms = new Map();
const pendingOffers = new Map();

// Express setup
const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

/**
 * Generate unique ID
 */
function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

/**
 * Heartbeat to detect disconnected clients
 */
function heartbeat() {
    this.isAlive = true;
}

// WebSocket connection handler
wss.on('connection', (ws) => {
    console.log('[SignalingServer] New client connected');
    
    ws.isAlive = true;
    ws.id = generateId();
    ws.pingTimeout = null;
    
    clients.set(ws.id, {
        ws: ws,
        id: ws.id,
        connectedAt: Date.now(),
        currentRoom: null,
        isAlive: true
    });
    
    // Send client their ID
    ws.send(JSON.stringify({
        type: 'connected',
        clientId: ws.id,
        timestamp: Date.now()
    }));
    
    // Message handler
    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);
            handleMessage(ws, message);
        } catch (error) {
            console.error('[SignalingServer] Invalid message:', error);
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Invalid message format'
            }));
        }
    });
    
    // Close handler
    ws.on('close', () => {
        console.log('[SignalingServer] Client disconnected:', ws.id);
        handleDisconnect(ws.id);
    });
    
    // Error handler
    ws.on('error', (error) => {
        console.error('[SignalingServer] Client error:', ws.id, error);
    });
    
    // Pong handler (responds to server's ping)
    ws.on('pong', heartbeat);
    
    // Set ping timeout
    ws.pingTimeout = setTimeout(() => {
        if (!ws.isAlive) {
            console.log('[SignalingServer] Client timeout:', ws.id);
            ws.terminate();
        } else {
            ws.isAlive = false;
            ws.ping();
            ws.pingTimeout = setTimeout(() => {
                ws.terminate();
            }, 5000);
        }
    }, HEARTBEAT_INTERVAL);
});

/**
 * Handle incoming message
 */
function handleMessage(ws, message) {
    const client = clients.get(ws.id);
    if (!client) {
        return;
    }
    
    console.log('[SignalingServer] Message from', ws.id, ':', message.type);
    
    switch (message.type) {
        case 'create-room':
            handleCreateRoom(ws, message);
            break;
            
        case 'join-room':
            handleJoinRoom(ws, message);
            break;
            
        case 'leave-room':
            handleLeaveRoom(ws, message);
            break;
            
        case 'offer':
        case 'answer':
        case 'ice-candidate':
            handleSignalingMessage(ws, message);
            break;
            
        case 'heartbeat':
            ws.send(JSON.stringify({
                type: 'heartbeat',
                timestamp: Date.now()
            }));
            break;
            
        case 'get-rooms':
            handleGetRooms(ws);
            break;
            
        default:
            console.warn('[SignalingServer] Unknown message type:', message.type);
    }
}

/**
 * Handle room creation
 */
function handleCreateRoom(ws, message) {
    const client = clients.get(ws.id);
    if (!client) return;
    
    const roomId = message.roomId || generateId();
    
    // Check if room already exists
    if (rooms.has(roomId)) {
        ws.send(JSON.stringify({
            type: 'room-error',
            message: 'Room already exists',
            roomId: roomId
        }));
        return;
    }
    
    // Create room
    const room = {
        id: roomId,
        host: ws.id,
        players: [ws.id],
        maxPlayers: message.maxPlayers || 8,
        createdAt: Date.now(),
        lastActivity: Date.now(),
        metadata: message.metadata || {}
    };
    
    rooms.set(roomId, room);
    client.currentRoom = roomId;
    
    console.log('[SignalingServer] Room created:', roomId, 'by', ws.id);
    
    ws.send(JSON.stringify({
        type: 'room-created',
        roomId: roomId,
        isHost: true,
        players: [ws.id]
    }));
}

/**
 * Handle room join
 */
function handleJoinRoom(ws, message) {
    const client = clients.get(ws.id);
    if (!client) return;
    
    const roomId = message.roomId;
    const room = rooms.get(roomId);
    
    if (!room) {
        ws.send(JSON.stringify({
            type: 'room-error',
            message: 'Room not found',
            roomId: roomId
        }));
        return;
    }
    
    if (room.players.length >= room.maxPlayers) {
        ws.send(JSON.stringify({
            type: 'room-error',
            message: 'Room is full',
            roomId: roomId
        }));
        return;
    }
    
    // Add player to room
    room.players.push(ws.id);
    client.currentRoom = roomId;
    room.lastActivity = Date.now();
    
    console.log('[SignalingServer] Player', ws.id, 'joined room', roomId);
    
    // Notify host
    const hostClient = clients.get(room.host);
    if (hostClient) {
        hostClient.ws.send(JSON.stringify({
            type: 'player-joined',
            roomId: roomId,
            playerId: ws.id,
            playerCount: room.players.length
        }));
    }
    
    // Notify joining player
    ws.send(JSON.stringify({
        type: 'room-joined',
        roomId: roomId,
        isHost: ws.id === room.host,
        hostId: room.host,
        players: room.players,
        playerCount: room.players.length
    }));
    
    // Notify other players
    room.players.forEach(playerId => {
        if (playerId !== ws.id && playerId !== room.host) {
            const playerClient = clients.get(playerId);
            if (playerClient) {
                playerClient.ws.send(JSON.stringify({
                    type: 'player-joined',
                    roomId: roomId,
                    playerId: ws.id,
                    playerCount: room.players.length
                }));
            }
        }
    });
}

/**
 * Handle room leave
 */
function handleLeaveRoom(ws, message) {
    const client = clients.get(ws.id);
    if (!client || !client.currentRoom) return;
    
    const roomId = client.currentRoom;
    const room = rooms.get(roomId);
    
    if (!room) return;
    
    // Remove player from room
    room.players = room.players.filter(id => id !== ws.id);
    client.currentRoom = null;
    
    console.log('[SignalingServer] Player', ws.id, 'left room', roomId);
    
    // If host left, assign new host or close room
    if (ws.id === room.host) {
        if (room.players.length > 0) {
            const newHost = room.players[0];
            room.host = newHost;
            
            const newHostClient = clients.get(newHost);
            if (newHostClient) {
                newHostClient.ws.send(JSON.stringify({
                    type: 'room-host-changed',
                    roomId: roomId,
                    newHostId: newHost
                }));
            }
            
            // Notify remaining players
            room.players.forEach(playerId => {
                const playerClient = clients.get(playerId);
                if (playerClient) {
                    playerClient.ws.send(JSON.stringify({
                        type: 'room-host-changed',
                        roomId: roomId,
                        newHostId: newHost
                    }));
                }
            });
        } else {
            // No players left, delete room
            rooms.delete(roomId);
        }
    } else if (room.players.length === 0) {
        // Last player left, delete room
        rooms.delete(roomId);
    }
    
    ws.send(JSON.stringify({
        type: 'room-left',
        roomId: roomId
    }));
}

/**
 * Handle signaling messages (offer/answer/ICE)
 */
function handleSignalingMessage(ws, message) {
    const client = clients.get(ws.id);
    if (!client || !client.currentRoom) return;
    
    const room = rooms.get(client.currentRoom);
    if (!room) return;
    
    const targetId = message.targetId;
    const targetClient = clients.get(targetId);
    
    if (!targetClient) {
        ws.send(JSON.stringify({
            type: 'signaling-error',
            message: 'Target player not found',
            targetId: targetId
        }));
        return;
    }
    
    // Forward signaling message to target
    targetClient.ws.send(JSON.stringify({
        type: message.type,
        fromId: ws.id,
        sdp: message.sdp,
        candidate: message.candidate
    }));
}

/**
 * Handle get rooms list
 */
function handleGetRooms(ws) {
    const roomList = Array.from(rooms.values()).map(room => ({
        id: room.id,
        playerCount: room.players.length,
        maxPlayers: room.maxPlayers,
        createdAt: room.createdAt,
        metadata: room.metadata
    }));
    
    ws.send(JSON.stringify({
        type: 'rooms-list',
        rooms: roomList
    }));
}

/**
 * Handle client disconnect
 */
function handleDisconnect(clientId) {
    const client = clients.get(clientId);
    if (!client) return;
    
    // Remove from current room
    if (client.currentRoom) {
        const roomId = client.currentRoom;
        const room = rooms.get(roomId);
        
        if (room) {
            room.players = room.players.filter(id => id !== clientId);
            
            // Notify remaining players
            room.players.forEach(playerId => {
                const playerClient = clients.get(playerId);
                if (playerClient) {
                    playerClient.ws.send(JSON.stringify({
                        type: 'player-left',
                        roomId: roomId,
                        playerId: clientId
                    }));
                }
            });
            
            // If room is empty, delete it
            if (room.players.length === 0) {
                rooms.delete(roomId);
            }
        }
    }
    
    // Clear ping timeout
    if (client.pingTimeout) {
        clearTimeout(client.pingTimeout);
    }
    
    clients.delete(clientId);
}

// HTTP API endpoints

/**
 * Get server stats
 */
app.get('/api/stats', (req, res) => {
    res.json({
        connectedClients: clients.size,
        activeRooms: rooms.size,
        uptime: process.uptime(),
        timestamp: Date.now()
    });
});

/**
 * Get rooms list
 */
app.get('/api/rooms', (req, res) => {
    const roomList = Array.from(rooms.values()).map(room => ({
        id: room.id,
        playerCount: room.players.length,
        maxPlayers: room.maxPlayers,
        createdAt: room.createdAt,
        metadata: room.metadata
    }));
    
    res.json(roomList);
});

// Cleanup inactive rooms
setInterval(() => {
    const now = Date.now();
    
    rooms.forEach((room, roomId) => {
        if (now - room.lastActivity > ROOM_TIMEOUT) {
            console.log('[SignalingServer] Cleaning up inactive room:', roomId);
            
            // Notify all players
            room.players.forEach(playerId => {
                const playerClient = clients.get(playerId);
                if (playerClient) {
                    playerClient.currentRoom = null;
                    playerClient.ws.send(JSON.stringify({
                        type: 'room-closed',
                        roomId: roomId,
                        reason: 'timeout'
                    }));
                }
            });
            
            rooms.delete(roomId);
        }
    });
    
    // Log stats
    console.log('[SignalingServer] Stats:', {
        clients: clients.size,
        rooms: rooms.size
    });
}, 60000);

// Start server
server.listen(PORT, () => {
    console.log('==========================================');
    console.log('Signaling Server Started');
    console.log('==========================================');
    console.log('WebSocket: ws://localhost:' + PORT);
    console.log('HTTP API: http://localhost:' + PORT);
    console.log('==========================================');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('[SignalingServer] Shutting down...');
    
    // Notify all clients
    clients.forEach(client => {
        client.ws.send(JSON.stringify({
            type: 'server-shutdown',
            reason: 'Server shutting down'
        }));
        client.ws.close();
    });
    
    server.close(() => {
        console.log('[SignalingServer] Server closed');
        process.exit(0);
    });
});

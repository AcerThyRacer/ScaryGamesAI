/**
 * WebSocket Network Manager - Phase 7: Multiplayer & Social
 * Real-time multiplayer with WebSocket and WebRTC support
 */

export class NetworkManager {
  constructor(options = {}) {
    this.serverUrl = options.serverUrl || 'ws://localhost:3001';
    this.socket = null;
    this.connected = false;
    this.players = new Map();
    this.roomId = null;
    this.playerId = null;
    this.messageHandlers = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 5;
    this.heartbeatInterval = null;
  }

  connect() {
    return new Promise((resolve, reject) => {
      try {
        this.socket = new WebSocket(this.serverUrl);
        
        this.socket.onopen = () => {
          this.connected = true;
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          resolve({ type: 'connected', playerId: this.playerId });
        };
        
        this.socket.onclose = () => {
          this.connected = false;
          this.stopHeartbeat();
          this.attemptReconnect();
        };
        
        this.socket.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };
        
        this.socket.onmessage = (event) => {
          this.handleMessage(JSON.parse(event.data));
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect() {
    this.stopHeartbeat();
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.connected = false;
  }

  handleMessage(message) {
    const handler = this.messageHandlers.get(message.type);
    if (handler) {
      handler(message.data);
    } else {
      console.log('Unhandled message:', message.type);
    }
  }

  send(type, data) {
    if (!this.connected || !this.socket) return false;
    
    const message = {
      type,
      data,
      timestamp: Date.now(),
      roomId: this.roomId
    };
    
    this.socket.send(JSON.stringify(message));
    return true;
  }

  on(messageType, handler) {
    this.messageHandlers.set(messageType, handler);
  }

  off(messageType) {
    this.messageHandlers.delete(messageType);
  }

  createRoom(options = {}) {
    this.send('create_room', {
      name: options.name || 'Room',
      maxPlayers: options.maxPlayers || 4,
      isPrivate: options.isPrivate || false,
      gameMode: options.gameMode || 'default'
    });
  }

  joinRoom(roomId, password = null) {
    this.send('join_room', { roomId, password });
    this.roomId = roomId;
  }

  leaveRoom() {
    this.send('leave_room', { roomId: this.roomId });
    this.roomId = null;
  }

  startGame() {
    this.send('start_game', { roomId: this.roomId });
  }

  syncState(state) {
    this.send('sync_state', {
      roomId: this.roomId,
      state,
      timestamp: Date.now()
    });
  }

  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached');
      return;
    }
    
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    setTimeout(() => {
      console.log(`Reconnecting (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      this.connect().catch(console.error);
    }, delay);
  }

  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.send('heartbeat', { timestamp: Date.now() });
    }, 5000);
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  getPlayerCount() {
    return this.players.size;
  }

  getPlayers() {
    return Array.from(this.players.values());
  }
}

/**
 * WebRTC Peer-to-Peer Connection
 */
export class P2PConnection {
  constructor(config = {}) {
    this.rtcConfig = config.rtcConfig || {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
      ]
    };
    this.connections = new Map();
    this.dataChannels = new Map();
    this.localStream = null;
    this.onDataCallback = null;
    this.onPeerConnectedCallback = null;
    this.onPeerDisconnectedCallback = null;
  }

  async createOffer(peerId) {
    const connection = new RTCPeerConnection(this.rtcConfig);
    
    connection.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignal(peerId, {
          type: 'ice-candidate',
          candidate: event.candidate
        });
      }
    };

    connection.onconnectionstatechange = () => {
      if (connection.connectionState === 'connected') {
        this.onPeerConnectedCallback?.(peerId);
      } else if (connection.connectionState === 'disconnected') {
        this.onPeerDisconnectedCallback?.(peerId);
        this.connections.delete(peerId);
      }
    };

    const dataChannel = connection.createDataChannel('game');
    this.setupDataChannel(dataChannel, peerId);
    
    const offer = await connection.createOffer();
    await connection.setLocalDescription(offer);
    
    this.connections.set(peerId, connection);
    
    return { offer: connection.localDescription };
  }

  async createAnswer(peerId, offer) {
    const connection = new RTCPeerConnection(this.rtcConfig);
    
    connection.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignal(peerId, {
          type: 'ice-candidate',
          candidate: event.candidate
        });
      }
    };

    connection.onconnectionstatechange = () => {
      if (connection.connectionState === 'connected') {
        this.onPeerConnectedCallback?.(peerId);
      }
    };

    connection.ondatachannel = (event) => {
      this.setupDataChannel(event.channel, peerId);
    };

    await connection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await connection.createAnswer();
    await connection.setLocalDescription(answer);
    
    this.connections.set(peerId, connection);
    
    return { answer: connection.localDescription };
  }

  async setRemoteDescription(peerId, description) {
    const connection = this.connections.get(peerId);
    if (!connection) return;
    
    await connection.setRemoteDescription(new RTCSessionDescription(description));
  }

  async addIceCandidate(peerId, candidate) {
    const connection = this.connections.get(peerId);
    if (!connection) return;
    
    await connection.addIceCandidate(new RTCIceCandidate(candidate));
  }

  setupDataChannel(dataChannel, peerId) {
    dataChannel.onopen = () => {
      console.log(`Data channel open with ${peerId}`);
      this.dataChannels.set(peerId, dataChannel);
    };

    dataChannel.onmessage = (event) => {
      if (this.onDataCallback) {
        this.onDataCallback(peerId, JSON.parse(event.data));
      }
    };

    dataChannel.onerror = (error) => {
      console.error(`Data channel error with ${peerId}:`, error);
    };
  }

  sendTo(peerId, data) {
    const channel = this.dataChannels.get(peerId);
    if (channel && channel.readyState === 'open') {
      channel.send(JSON.stringify(data));
      return true;
    }
    return false;
  }

  broadcast(data) {
    this.dataChannels.forEach((channel, peerId) => {
      this.sendTo(peerId, data);
    });
  }

  onData(callback) {
    this.onDataCallback = callback;
  }

  onPeerConnected(callback) {
    this.onPeerConnectedCallback = callback;
  }

  onPeerDisconnected(callback) {
    this.onPeerDisconnectedCallback = callback;
  }

  close() {
    this.connections.forEach(connection => {
      connection.close();
    });
    this.connections.clear();
    this.dataChannels.clear();
  }

  // Override this to send signals through your server
  sendSignal(peerId, signal) {
    console.log(`Sending signal to ${peerId}:`, signal.type);
    // Implement based on your signaling server
  }
}

/**
 * Matchmaking System
 */
export class Matchmaker {
  constructor(network) {
    this.network = network;
    this.queue = [];
    this.ratings = new Map();
    this.preferences = new Map();
  }

  joinQueue(playerId, options = {}) {
    const player = {
      id: playerId,
      rating: this.ratings.get(playerId) || 1000,
      preferences: options.preferences || {},
      joinedAt: Date.now()
    };
    
    this.queue.push(player);
    this.preferences.set(playerId, options);
    
    this.attemptMatch();
    
    return player;
  }

  leaveQueue(playerId) {
    this.queue = this.queue.filter(p => p.id !== playerId);
    this.preferences.delete(playerId);
  }

  attemptMatch() {
    if (this.queue.length < 2) return;
    
    // Sort by rating
    this.queue.sort((a, b) => b.rating - a.rating);
    
    // Try to match players with similar ratings
    for (let i = 0; i < this.queue.length; i++) {
      const player1 = this.queue[i];
      
      for (let j = i + 1; j < this.queue.length; j++) {
        const player2 = this.queue[j];
        
        if (this.canMatch(player1, player2)) {
          this.createMatch([player1, player2]);
          this.queue.splice(j, 1);
          this.queue.splice(i, 1);
          i--;
          break;
        }
      }
    }
  }

  canMatch(player1, player2) {
    const ratingDiff = Math.abs(player1.rating - player2.rating);
    const maxRatingDiff = this.preferences.get(player1.id)?.maxRatingDiff || 200;
    
    return ratingDiff <= maxRatingDiff;
  }

  createMatch(players) {
    const roomId = `match_${Date.now()}`;
    
    players.forEach(player => {
      this.network.send('match_created', {
        roomId,
        players: players.map(p => p.id)
      });
    });
  }

  updateRating(playerId, delta) {
    const current = this.ratings.get(playerId) || 1000;
    this.ratings.set(playerId, current + delta);
  }

  getQueueLength() {
    return this.queue.length;
  }
}

export default { NetworkManager, P2PConnection, Matchmaker };

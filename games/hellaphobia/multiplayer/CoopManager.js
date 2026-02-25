/* ============================================================
   HELLAPHOBIA - PHASE 14: CO-OP MULTIPLAYER SYSTEM
   2-Player Co-op | Shared Sanity | Revive Mechanics
   Voice Chat | Proximity Chat | Team Horror
   ============================================================ */

(function() {
    'use strict';

    // ===== CO-OP MANAGER =====
    const CoopManager = {
        isHost: false,
        isConnected: false,
        peerConnection: null,
        dataChannel: null,
        localPlayer: null,
        remotePlayer: null,
        sharedSanity: 100,
        reviveCooldown: 0,
        
        async init() {
            console.log('Phase 14: Co-op Multiplayer System initializing...');
            
            // Check WebRTC support
            if (!window.RTCPeerConnection) {
                console.warn('WebRTC not supported - co-op disabled');
                return;
            }
            
            this.setupPeerConnection();
            this.setupDataChannel();
            
            console.log('Phase 14: Ready for co-op connections');
        },
        
        // Create game (host)
        async createGame() {
            this.isHost = true;
            
            try {
                // Create offer
                const offer = await this.peerConnection.createOffer();
                await this.peerConnection.setLocalDescription(offer);
                
                // Send offer to peer (via signaling server in production)
                window.dispatchEvent(new CustomEvent('gameCreated', {
                    detail: { 
                        hostId: this.generateId(),
                        offer: btoa(JSON.stringify(offer))
                    }
                }));
                
                console.log('Phase 14: Game created - waiting for player...');
            } catch (err) {
                console.error('Phase 14: Failed to create game', err);
            }
        },
        
        // Join game (client)
        async joinGame(hostOffer) {
            this.isHost = false;
            
            try {
                const offer = JSON.parse(atob(hostOffer));
                await this.peerConnection.setRemoteDescription(offer);
                
                const answer = await this.peerConnection.createAnswer();
                await this.peerConnection.setLocalDescription(answer);
                
                // Send answer back to host
                window.dispatchEvent(new CustomEvent('gameJoined', {
                    detail: { answer: btoa(JSON.stringify(answer)) }
                }));
                
                console.log('Phase 14: Joined game');
            } catch (err) {
                console.error('Phase 14: Failed to join game', err);
            }
        },
        
        setupPeerConnection() {
            const config = {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' }
                ]
            };
            
            this.peerConnection = new RTCPeerConnection(config);
            
            this.peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    // Send ICE candidate to peer
                    this.sendToPeer({ type: 'ice', candidate: event.candidate });
                }
            };
            
            this.peerConnection.onconnectionstatechange = () => {
                if (this.peerConnection.connectionState === 'connected') {
                    this.isConnected = true;
                    window.dispatchEvent(new CustomEvent('coopConnected'));
                }
            };
        },
        
        setupDataChannel() {
            if (this.isHost) {
                this.dataChannel = this.peerConnection.createDataChannel('game');
            } else {
                this.peerConnection.ondatachannel = (event) => {
                    this.dataChannel = event.channel;
                    this.setupDataHandlers();
                };
            }
            
            if (this.dataChannel) {
                this.setupDataHandlers();
            }
        },
        
        setupDataHandlers() {
            this.dataChannel.onopen = () => {
                console.log('Phase 14: Data channel open');
            };
            
            this.dataChannel.onmessage = (event) => {
                const data = JSON.parse(event.data);
                this.handlePeerMessage(data);
            };
        },
        
        handlePeerMessage(data) {
            switch(data.type) {
                case 'position':
                    if (this.remotePlayer) {
                        this.remotePlayer.x = data.x;
                        this.remotePlayer.y = data.y;
                        this.remotePlayer.sanity = data.sanity;
                    }
                    break;
                    
                case 'action':
                    this.handleRemoteAction(data.action);
                    break;
                    
                case 'sanity':
                    this.updateSharedSanity(data.sanity);
                    break;
                    
                case 'revive':
                    this.attemptRevive(data.target);
                    break;
            }
        },
        
        sendToPeer(data) {
            if (this.dataChannel && this.dataChannel.readyState === 'open') {
                this.dataChannel.send(JSON.stringify(data));
            }
        },
        
        // Update local player and sync to remote
        updateLocalPlayer(player) {
            this.localPlayer = player;
            
            // Send position to peer
            this.sendToPeer({
                type: 'position',
                x: player.x,
                y: player.y,
                sanity: player.sanity
            });
        },
        
        // Shared sanity mechanic
        updateSharedSanity(newSanity) {
            if (!this.isConnected) return;
            
            const avgSanity = (this.localPlayer.sanity + (this.remotePlayer?.sanity || 100)) / 2;
            this.sharedSanity = avgSanity;
            
            // Apply sanity drain to both players
            if (avgSanity < 30) {
                window.dispatchEvent(new CustomEvent('sharedSanityLow', {
                    detail: { sanity: avgSanity }
                }));
            }
        },
        
        // Revive downed partner
        attemptRevive(targetPlayer) {
            if (this.reviveCooldown > 0) return;
            
            const distance = this.calculateDistance(this.localPlayer, targetPlayer);
            if (distance < 100) {
                // Successful revive
                targetPlayer.hp = 50;
                targetPlayer.sanity = 50;
                
                this.sendToPeer({
                    type: 'revive_success',
                    target: targetPlayer.id
                });
                
                this.reviveCooldown = 60; // 60 second cooldown
            }
        },
        
        calculateDistance(a, b) {
            const dx = a.x - b.x;
            const dy = a.y - b.y;
            return Math.sqrt(dx * dx + dy * dy);
        },
        
        handleRemoteAction(action) {
            // Play remote player action
            window.dispatchEvent(new CustomEvent('remoteAction', {
                detail: { action, player: this.remotePlayer }
            }));
        },
        
        generateId() {
            return Math.random().toString(36).substr(2, 9);
        },
        
        exportAPI() {
            return {
                init: () => this.init(),
                createGame: () => this.createGame(),
                joinGame: (offer) => this.joinGame(offer),
                updateLocalPlayer: (player) => this.updateLocalPlayer(player),
                isConnected: () => this.isConnected,
                getSharedSanity: () => this.sharedSanity
            };
        }
    };
    
    // Export
    window.CoopManager = CoopManager.exportAPI();
    
    console.log('Phase 14: Co-op Multiplayer System loaded');
})();

/**
 * BACKROOMS PACMAN - PHASE 4: MULTIPLAYER & SOCIAL FEATURES
 * Real-time multiplayer, proximity voice chat, shared horror, spectator mode
 */

(function() {
    'use strict';

    // ============================================
    // PHASE 4.1: WEBRTC MULTIPLAYER NETWORKING
    // ============================================
    
    const MultiplayerNetwork = {
        // Connection
        socket: null,
        peerConnections: {},
        dataChannels: {},
        
        // Player data
        localPlayer: {
            id: null,
            position: { x: 0, y: 1.6, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            velocity: { x: 0, y: 0, z: 0 },
            state: 'alive',
            health: 100,
            pellets: 0
        },
        
        // Remote players
        remotePlayers: new Map(),
        
        // Network settings
        config: {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ],
            updateRate: 20, // Updates per second
            interpolationDelay: 100 // ms
        },
        
        // State
        isHost: false,
        roomId: null,
        connected: false,
        
        async init(serverUrl = 'wss://your-signaling-server.com') {
            console.log('[Phase 4] Initializing multiplayer networking...');
            
            // Generate unique player ID
            this.localPlayer.id = this.generatePlayerId();
            
            // Connect to signaling server
            await this.connectToSignaling(serverUrl);
            
            // Start update loop
            this.startUpdateLoop();
            
            console.log('[Phase 4] Multiplayer initialized. Player ID:', this.localPlayer.id);
        },
        
        generatePlayerId() {
            return 'player_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
        },
        
        async connectToSignaling(serverUrl) {
            return new Promise((resolve, reject) => {
                this.socket = new WebSocket(serverUrl);
                
                this.socket.onopen = () => {
                    console.log('[Phase 4] Connected to signaling server');
                    this.connected = true;
                    resolve();
                };
                
                this.socket.onmessage = (event) => {
                    const message = JSON.parse(event.data);
                    this.handleSignalingMessage(message);
                };
                
                this.socket.onerror = (error) => {
                    console.error('[Phase 4] Signaling error:', error);
                    reject(error);
                };
                
                this.socket.onclose = () => {
                    console.log('[Phase 4] Disconnected from signaling server');
                    this.connected = false;
                };
            });
        },
        
        handleSignalingMessage(message) {
            switch (message.type) {
                case 'player-joined':
                    this.onPlayerJoined(message.playerId);
                    break;
                case 'player-left':
                    this.onPlayerLeft(message.playerId);
                    break;
                case 'offer':
                    this.handleOffer(message.from, message.offer);
                    break;
                case 'answer':
                    this.handleAnswer(message.from, message.answer);
                    break;
                case 'ice-candidate':
                    this.handleIceCandidate(message.from, message.candidate);
                    break;
                case 'room-created':
                    this.roomId = message.roomId;
                    this.isHost = true;
                    console.log('[Phase 4] Room created:', this.roomId);
                    break;
                case 'room-joined':
                    this.roomId = message.roomId;
                    console.log('[Phase 4] Joined room:', this.roomId);
                    break;
            }
        },
        
        async onPlayerJoined(playerId) {
            console.log('[Phase 4] Player joined:', playerId);
            
            // Create peer connection
            const pc = this.createPeerConnection(playerId);
            
            // Create data channel
            const dc = pc.createDataChannel('game', {
                ordered: false,
                maxRetransmits: 0
            });
            
            this.setupDataChannel(dc, playerId);
            
            // Create offer
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            
            // Send offer
            this.socket.send(JSON.stringify({
                type: 'offer',
                to: playerId,
                offer: offer
            }));
        },
        
        async handleOffer(from, offer) {
            console.log('[Phase 4] Received offer from:', from);
            
            // Create peer connection
            const pc = this.createPeerConnection(from);
            
            // Set remote description
            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            
            // Create answer
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            
            // Send answer
            this.socket.send(JSON.stringify({
                type: 'answer',
                to: from,
                answer: answer
            }));
        },
        
        async handleAnswer(from, answer) {
            console.log('[Phase 4] Received answer from:', from);
            
            const pc = this.peerConnections[from];
            if (pc) {
                await pc.setRemoteDescription(new RTCSessionDescription(answer));
            }
        },
        
        async handleIceCandidate(from, candidate) {
            const pc = this.peerConnections[from];
            if (pc) {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
            }
        },
        
        createPeerConnection(playerId) {
            const pc = new RTCPeerConnection({
                iceServers: this.config.iceServers
            });
            
            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    this.socket.send(JSON.stringify({
                        type: 'ice-candidate',
                        to: playerId,
                        candidate: event.candidate
                    }));
                }
            };
            
            pc.ondatachannel = (event) => {
                this.setupDataChannel(event.channel, playerId);
            };
            
            pc.onconnectionstatechange = () => {
                console.log(`[Phase 4] Connection state with ${playerId}:`, pc.connectionState);
            };
            
            this.peerConnections[playerId] = pc;
            
            return pc;
        },
        
        setupDataChannel(channel, playerId) {
            this.dataChannels[playerId] = channel;
            
            channel.onopen = () => {
                console.log('[Phase 4] Data channel opened with:', playerId);
                
                // Create remote player
                this.createRemotePlayer(playerId);
            };
            
            channel.onmessage = (event) => {
                const data = JSON.parse(event.data);
                this.handleGameMessage(playerId, data);
            };
            
            channel.onclose = () => {
                console.log('[Phase 4] Data channel closed with:', playerId);
                this.removeRemotePlayer(playerId);
            };
        },
        
        createRemotePlayer(playerId) {
            const player = {
                id: playerId,
                position: { x: 0, y: 1.6, z: 0 },
                rotation: { x: 0, y: 0, z: 0 },
                velocity: { x: 0, y: 0, z: 0 },
                state: 'alive',
                health: 100,
                pellets: 0,
                
                // Interpolation
                interpolation: {
                    start: null,
                    end: null,
                    startTime: 0,
                    endTime: 0
                },
                
                // Mesh
                mesh: this.createPlayerMesh()
            };
            
            this.remotePlayers.set(playerId, player);
            
            // Add to scene
            if (window.PhasesIntegration && PhasesIntegration.scene) {
                PhasesIntegration.scene.add(player.mesh);
            }
        },
        
        createPlayerMesh() {
            const group = new THREE.Group();
            
            // Body
            const bodyGeometry = new THREE.CapsuleGeometry(0.3, 1.2, 4, 8);
            const bodyMaterial = new THREE.MeshStandardMaterial({
                color: 0x444444,
                roughness: 0.7
            });
            const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
            body.position.y = 0.9;
            group.add(body);
            
            // Head
            const headGeometry = new THREE.SphereGeometry(0.25, 16, 16);
            const headMaterial = new THREE.MeshStandardMaterial({
                color: 0x333333,
                roughness: 0.5
            });
            const head = new THREE.Mesh(headGeometry, headMaterial);
            head.position.y = 1.7;
            group.add(head);
            
            // Flashlight
            const flashlight = new THREE.SpotLight(0xffffff, 1, 20, Math.PI / 4, 0.5, 1);
            flashlight.position.set(0, 1.6, 0);
            flashlight.target.position.set(0, 1.6, -1);
            group.add(flashlight);
            group.add(flashlight.target);
            
            // Name tag
            const canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 64;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(0, 0, 256, 64);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Player', 128, 40);
            
            const texture = new THREE.CanvasTexture(canvas);
            const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
            const sprite = new THREE.Sprite(spriteMaterial);
            sprite.position.y = 2.2;
            sprite.scale.set(1, 0.25, 1);
            group.add(sprite);
            
            return group;
        },
        
        removeRemotePlayer(playerId) {
            const player = this.remotePlayers.get(playerId);
            if (player) {
                if (player.mesh && PhasesIntegration.scene) {
                    PhasesIntegration.scene.remove(player.mesh);
                }
                this.remotePlayers.delete(playerId);
            }
            
            // Clean up connection
            if (this.peerConnections[playerId]) {
                this.peerConnections[playerId].close();
                delete this.peerConnections[playerId];
            }
            delete this.dataChannels[playerId];
        },
        
        onPlayerLeft(playerId) {
            console.log('[Phase 4] Player left:', playerId);
            this.removeRemotePlayer(playerId);
        },
        
        handleGameMessage(playerId, data) {
            const player = this.remotePlayers.get(playerId);
            if (!player) return;
            
            switch (data.type) {
                case 'position':
                    this.updateRemotePlayerPosition(player, data);
                    break;
                case 'state':
                    this.updateRemotePlayerState(player, data);
                    break;
                case 'action':
                    this.handleRemotePlayerAction(player, data);
                    break;
                case 'voice':
                    this.handleVoiceData(playerId, data);
                    break;
            }
        },
        
        updateRemotePlayerPosition(player, data) {
            // Store for interpolation
            player.interpolation.start = { ...player.position };
            player.interpolation.end = data.position;
            player.interpolation.startTime = performance.now();
            player.interpolation.endTime = performance.now() + this.config.interpolationDelay;
            
            player.rotation = data.rotation;
            player.velocity = data.velocity;
        },
        
        updateRemotePlayerState(player, data) {
            player.state = data.state;
            player.health = data.health;
            player.pellets = data.pellets;
        },
        
        handleRemotePlayerAction(player, data) {
            // Handle actions like shooting, using items, etc.
            console.log('[Phase 4] Remote player action:', data.action);
        },
        
        handleVoiceData(playerId, data) {
            // Handle voice data (forward to audio system)
            if (window.ProximityVoiceChat) {
                ProximityVoiceChat.receiveVoiceData(playerId, data.audioData);
            }
        },
        
        // Room management
        createRoom() {
            this.socket.send(JSON.stringify({
                type: 'create-room'
            }));
        },
        
        joinRoom(roomId) {
            this.socket.send(JSON.stringify({
                type: 'join-room',
                roomId: roomId
            }));
        },
        
        // Update loop
        startUpdateLoop() {
            setInterval(() => {
                this.broadcastUpdate();
            }, 1000 / this.config.updateRate);
        },
        
        broadcastUpdate() {
            const update = {
                type: 'position',
                position: this.localPlayer.position,
                rotation: this.localPlayer.rotation,
                velocity: this.localPlayer.velocity
            };
            
            this.broadcast(update);
        },
        
        broadcast(data) {
            const message = JSON.stringify(data);
            
            Object.values(this.dataChannels).forEach(channel => {
                if (channel.readyState === 'open') {
                    channel.send(message);
                }
            });
        },
        
        // Update remote player interpolation
        update(dt) {
            const now = performance.now();
            
            this.remotePlayers.forEach(player => {
                if (player.interpolation.end) {
                    const t = Math.min(1, (now - player.interpolation.startTime) / 
                                      (player.interpolation.endTime - player.interpolation.startTime));
                    
                    // Linear interpolation
                    player.position.x = this.lerp(player.interpolation.start.x, player.interpolation.end.x, t);
                    player.position.y = this.lerp(player.interpolation.start.y, player.interpolation.end.y, t);
                    player.position.z = this.lerp(player.interpolation.start.z, player.interpolation.end.z, t);
                    
                    // Update mesh
                    if (player.mesh) {
                        player.mesh.position.set(
                            player.position.x,
                            player.position.y,
                            player.position.z
                        );
                        player.mesh.rotation.set(
                            player.rotation.x,
                            player.rotation.y,
                            player.rotation.z
                        );
                    }
                }
            });
        },
        
        lerp(a, b, t) {
            return a + (b - a) * t;
        },
        
        // Update local player
        updateLocalPlayer(position, rotation, velocity) {
            this.localPlayer.position = position;
            this.localPlayer.rotation = rotation;
            this.localPlayer.velocity = velocity;
        },
        
        // Get all players
        getAllPlayers() {
            return [this.localPlayer, ...this.remotePlayers.values()];
        },
        
        // Disconnect
        disconnect() {
            Object.values(this.peerConnections).forEach(pc => pc.close());
            this.peerConnections = {};
            this.dataChannels = {};
            this.remotePlayers.clear();
            
            if (this.socket) {
                this.socket.close();
            }
            
            this.connected = false;
        }
    };

    // ============================================
    // PHASE 4.2: PROXIMITY VOICE CHAT
    // ============================================
    
    const ProximityVoiceChat = {
        // Audio context
        audioContext: null,
        
        // Local audio
        localStream: null,
        microphone: null,
        
        // Remote audio
        remoteStreams: new Map(),
        
        // Spatial audio
        spatialAudio: null,
        
        // Settings
        settings: {
            maxDistance: 20,
            minDistance: 1,
            rolloff: 1,
            voiceActivityThreshold: 0.01
        },
        
        // Voice activity
        isSpeaking: false,
        voiceActivityHistory: [],
        
        async init() {
            console.log('[Phase 4] Initializing proximity voice chat...');
            
            // Create audio context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Get microphone access
            await this.initMicrophone();
            
            // Setup voice activity detection
            this.setupVoiceActivityDetection();
            
            console.log('[Phase 4] Proximity voice chat initialized');
        },
        
        async initMicrophone() {
            try {
                this.localStream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true,
                        sampleRate: 48000
                    }
                });
                
                // Create microphone source
                this.microphone = this.audioContext.createMediaStreamSource(this.localStream);
                
                console.log('[Phase 4] Microphone initialized');
            } catch (error) {
                console.error('[Phase 4] Failed to get microphone:', error);
            }
        },
        
        setupVoiceActivityDetection() {
            if (!this.microphone) return;
            
            // Create analyser
            const analyser = this.audioContext.createAnalyser();
            analyser.fftSize = 256;
            analyser.smoothingTimeConstant = 0.5;
            
            this.microphone.connect(analyser);
            
            // Monitor voice activity
            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            
            const checkVoiceActivity = () => {
                analyser.getByteFrequencyData(dataArray);
                
                // Calculate average volume
                let sum = 0;
                for (let i = 0; i < bufferLength; i++) {
                    sum += dataArray[i];
                }
                const average = sum / bufferLength / 255;
                
                // Update speaking state
                const wasSpeaking = this.isSpeaking;
                this.isSpeaking = average > this.settings.voiceActivityThreshold;
                
                // Notify on state change
                if (this.isSpeaking && !wasSpeaking) {
                    this.onStartSpeaking();
                } else if (!this.isSpeaking && wasSpeaking) {
                    this.onStopSpeaking();
                }
                
                requestAnimationFrame(checkVoiceActivity);
            };
            
            checkVoiceActivity();
        },
        
        onStartSpeaking() {
            console.log('[Phase 4] Started speaking');
            
            // Notify other players
            MultiplayerNetwork.broadcast({
                type: 'voice-start',
                playerId: MultiplayerNetwork.localPlayer.id
            });
        },
        
        onStopSpeaking() {
            console.log('[Phase 4] Stopped speaking');
            
            // Notify other players
            MultiplayerNetwork.broadcast({
                type: 'voice-stop',
                playerId: MultiplayerNetwork.localPlayer.id
            });
        },
        
        // Encode audio data for transmission
        encodeAudioData(audioData) {
            // Convert Float32Array to Int16Array for compression
            const int16Data = new Int16Array(audioData.length);
            for (let i = 0; i < audioData.length; i++) {
                int16Data[i] = Math.max(-32768, Math.min(32767, audioData[i] * 32767));
            }
            return int16Data;
        },
        
        // Decode received audio data
        decodeAudioData(int16Data) {
            const floatData = new Float32Array(int16Data.length);
            for (let i = 0; i < int16Data.length; i++) {
                floatData[i] = int16Data[i] / 32767;
            }
            return floatData;
        },
        
        // Receive voice data from remote player
        receiveVoiceData(playerId, audioData) {
            if (!this.remoteStreams.has(playerId)) {
                this.createRemoteAudio(playerId);
            }
            
            const remoteAudio = this.remoteStreams.get(playerId);
            
            // Decode and play
            const floatData = this.decodeAudioData(audioData);
            remoteAudio.bufferQueue.push(floatData);
            
            // Update spatial position
            this.updateSpatialAudio(playerId);
        },
        
        createRemoteAudio(playerId) {
            // Create audio source for remote player
            const bufferSize = 4096;
            const scriptNode = this.audioContext.createScriptProcessor(
                bufferSize, 1, 1
            );
            
            const remoteAudio = {
                bufferQueue: [],
                scriptNode: scriptNode,
                gainNode: this.audioContext.createGain(),
                pannerNode: this.audioContext.createPanner()
            };
            
            // Setup panner
            remoteAudio.pannerNode.panningModel = 'HRTF';
            remoteAudio.pannerNode.distanceModel = 'exponential';
            remoteAudio.pannerNode.refDistance = this.settings.minDistance;
            remoteAudio.pannerNode.maxDistance = this.settings.maxDistance;
            remoteAudio.pannerNode.rolloffFactor = this.settings.rolloff;
            
            // Connect audio graph
            scriptNode.connect(remoteAudio.pannerNode);
            remoteAudio.pannerNode.connect(remoteAudio.gainNode);
            remoteAudio.gainNode.connect(this.audioContext.destination);
            
            // Process audio
            scriptNode.onaudioprocess = (event) => {
                const outputBuffer = event.outputBuffer.getChannelData(0);
                
                if (remoteAudio.bufferQueue.length > 0) {
                    const inputData = remoteAudio.bufferQueue.shift();
                    
                    for (let i = 0; i < outputBuffer.length && i < inputData.length; i++) {
                        outputBuffer[i] = inputData[i];
                    }
                } else {
                    // Silence
                    for (let i = 0; i < outputBuffer.length; i++) {
                        outputBuffer[i] = 0;
                    }
                }
            };
            
            this.remoteStreams.set(playerId, remoteAudio);
        },
        
        updateSpatialAudio(playerId) {
            const remoteAudio = this.remoteStreams.get(playerId);
            if (!remoteAudio) return;
            
            // Get player position
            const player = MultiplayerNetwork.remotePlayers.get(playerId);
            if (!player) return;
            
            // Update panner position
            remoteAudio.pannerNode.positionX.value = player.position.x;
            remoteAudio.pannerNode.positionY.value = player.position.y;
            remoteAudio.pannerNode.positionZ.value = player.position.z;
            
            // Calculate distance for volume
            const localPos = MultiplayerNetwork.localPlayer.position;
            const dx = player.position.x - localPos.x;
            const dy = player.position.y - localPos.y;
            const dz = player.position.z - localPos.z;
            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
            
            // Mute if too far
            if (distance > this.settings.maxDistance) {
                remoteAudio.gainNode.gain.value = 0;
            } else {
                // Calculate volume based on distance
                const t = Math.max(0, (distance - this.settings.minDistance) / 
                                  (this.settings.maxDistance - this.settings.minDistance));
                remoteAudio.gainNode.gain.value = 1 - t;
            }
        },
        
        // Update all spatial audio
        update() {
            this.remoteStreams.forEach((_, playerId) => {
                this.updateSpatialAudio(playerId);
            });
        },
        
        // Mute/unmute
        setMuted(muted) {
            if (this.localStream) {
                this.localStream.getAudioTracks().forEach(track => {
                    track.enabled = !muted;
                });
            }
        },
        
        // Set volume for specific player
        setPlayerVolume(playerId, volume) {
            const remoteAudio = this.remoteStreams.get(playerId);
            if (remoteAudio) {
                remoteAudio.gainNode.gain.value = volume;
            }
        },
        
        // Cleanup
        cleanup() {
            this.remoteStreams.forEach(audio => {
                audio.scriptNode.disconnect();
                audio.pannerNode.disconnect();
                audio.gainNode.disconnect();
            });
            this.remoteStreams.clear();
            
            if (this.localStream) {
                this.localStream.getTracks().forEach(track => track.stop());
            }
            
            if (this.audioContext) {
                this.audioContext.close();
            }
        }
    };

    // ============================================
    // PHASE 4.3: SHARED HORROR EXPERIENCES
    // ============================================
    
    const SharedHorror = {
        // Active events
        activeEvents: new Map(),
        
        // Event history
        eventHistory: [],
        
        // Synchronized random
        synchronizedRandom: {
            seed: 0,
            state: 0
        },
        
        init() {
            console.log('[Phase 4] Initializing shared horror system...');
            
            // Sync random seed with host
            if (MultiplayerNetwork.isHost) {
                this.synchronizedRandom.seed = Date.now();
                this.broadcastSeed();
            }
            
            console.log('[Phase 4] Shared horror system initialized');
        },
        
        broadcastSeed() {
            MultiplayerNetwork.broadcast({
                type: 'random-seed',
                seed: this.synchronizedRandom.seed
            });
        },
        
        setSeed(seed) {
            this.synchronizedRandom.seed = seed;
            this.synchronizedRandom.state = seed;
        },
        
        // Synchronized random number generator
        random() {
            // Linear congruential generator
            this.synchronizedRandom.state = 
                (this.synchronizedRandom.state * 1664525 + 1013904223) % 4294967296;
            return this.synchronizedRandom.state / 4294967296;
        },
        
        // Trigger synchronized event
        triggerEvent(eventType, data = {}) {
            const event = {
                id: 'event_' + Date.now() + '_' + Math.floor(this.random() * 10000),
                type: eventType,
                timestamp: Date.now(),
                data: data,
                participants: this.getParticipants()
            };
            
            // Store event
            this.activeEvents.set(event.id, event);
            this.eventHistory.push(event);
            
            // Broadcast to all players
            MultiplayerNetwork.broadcast({
                type: 'horror-event',
                event: event
            });
            
            // Execute locally
            this.executeEvent(event);
            
            console.log('[Phase 4] Triggered horror event:', eventType);
            
            return event.id;
        },
        
        // Receive event from remote
        receiveEvent(event) {
            // Store event
            this.activeEvents.set(event.id, event);
            this.eventHistory.push(event);
            
            // Execute
            this.executeEvent(event);
        },
        
        executeEvent(event) {
            switch (event.type) {
                case 'lights-out':
                    this.executeLightsOut(event);
                    break;
                case 'pacman-ambush':
                    this.executePacmanAmbush(event);
                    break;
                case 'shared-jumpscare':
                    this.executeSharedJumpscare(event);
                    break;
                case 'maze-shift':
                    this.executeMazeShift(event);
                    break;
                case 'whisper':
                    this.executeWhisper(event);
                    break;
            }
        },
        
        executeLightsOut(event) {
            // Turn off all lights for all players
            console.log('[Phase 4] Executing lights out event');
            
            // Apply to scene
            if (window.PhasesIntegration && PhasesIntegration.scene) {
                PhasesIntegration.scene.traverse((object) => {
                    if (object.isLight && object !== PhasesIntegration.flashlight) {
                        object.userData.originalIntensity = object.intensity;
                        object.intensity = 0;
                    }
                });
                
                // Restore after duration
                setTimeout(() => {
                    PhasesIntegration.scene.traverse((object) => {
                        if (object.isLight && object.userData.originalIntensity !== undefined) {
                            object.intensity = object.userData.originalIntensity;
                        }
                    });
                }, event.data.duration || 5000);
            }
        },
        
        executePacmanAmbush(event) {
            // Spawn multiple Pac-Men at specific location
            console.log('[Phase 4] Executing Pac-Man ambush');
            
            const spawnCount = event.data.count || 3;
            const location = event.data.location;
            
            for (let i = 0; i < spawnCount; i++) {
                // Spawn Pac-Man at location with offset
                const offset = {
                    x: (this.random() - 0.5) * 4,
                    z: (this.random() - 0.5) * 4
                };
                
                // This would integrate with the existing spawn system
                console.log('[Phase 4] Spawning ambush Pac-Man at:', 
                    location.x + offset.x, location.z + offset.z);
            }
        },
        
        executeSharedJumpscare(event) {
            // Trigger jumpscare for all players simultaneously
            console.log('[Phase 4] Executing shared jumpscare');
            
            // Play sound
            if (event.data.sound) {
                // Play synchronized sound
            }
            
            // Show visual
            if (event.data.visual) {
                // Show jumpscare visual
                this.showJumpscareVisual(event.data.visual);
            }
            
            // Trigger haptic
            if (window.Phase3VRAR) {
                Phase3VRAR.triggerHaptic('damage', 'chest', 1.0);
            }
        },
        
        showJumpscareVisual(visualType) {
            // Create full-screen jumpscare effect
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: #000;
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                transition: opacity 0.1s;
            `;
            
            // Add scary image/text
            overlay.innerHTML = `
                <div style="
                    color: #ff0000;
                    font-size: 120px;
                    font-weight: bold;
                    text-shadow: 0 0 50px #ff0000;
                    animation: shake 0.5s;
                ">BEHIND YOU</div>
            `;
            
            document.body.appendChild(overlay);
            
            // Flash in
            requestAnimationFrame(() => {
                overlay.style.opacity = '1';
            });
            
            // Remove after duration
            setTimeout(() => {
                overlay.style.opacity = '0';
                setTimeout(() => overlay.remove(), 200);
            }, 500);
        },
        
        executeMazeShift(event) {
            // Shift maze layout for all players
            console.log('[Phase 4] Executing maze shift');
            
            // This would modify the maze geometry
            // All players see the same new layout
        },
        
        executeWhisper(event) {
            // Play whispered message based on player
            console.log('[Phase 4] Executing whisper event');
            
            const playerId = event.data.targetPlayer;
            const message = event.data.message;
            
            if (playerId === MultiplayerNetwork.localPlayer.id) {
                // Play whisper for this player
                console.log('[Phase 4] Whisper:', message);
            }
        },
        
        getParticipants() {
            return MultiplayerNetwork.getAllPlayers().map(p => p.id);
        },
        
        // Update
        update(dt) {
            // Update active events
            this.activeEvents.forEach((event, id) => {
                // Check if event should end
                if (event.data.duration && 
                    Date.now() - event.timestamp > event.data.duration) {
                    this.endEvent(id);
                }
            });
        },
        
        endEvent(eventId) {
            const event = this.activeEvents.get(eventId);
            if (!event) return;
            
            console.log('[Phase 4] Ending event:', event.type);
            
            // Cleanup based on event type
            switch (event.type) {
                case 'lights-out':
                    // Restore lights
                    break;
            }
            
            this.activeEvents.delete(eventId);
        },
        
        // Get event history
        getEventHistory() {
            return this.eventHistory;
        }
    };

    // ============================================
    // PHASE 4.4: SPECTATOR MODE & STREAMING
    // ============================================
    
    const SpectatorMode = {
        // Streaming
        mediaRecorder: null,
        stream: null,
        
        // Spectators
        spectators: new Set(),
        
        // Recording
        isRecording: false,
        recordedChunks: [],
        
        // Settings
        settings: {
            videoBitrate: 5000000, // 5 Mbps
            audioBitrate: 128000, // 128 kbps
            frameRate: 60
        },
        
        async init() {
            console.log('[Phase 4] Initializing spectator mode...');
            
            // Setup streaming if host
            if (MultiplayerNetwork.isHost) {
                await this.setupStreaming();
            }
            
            console.log('[Phase 4] Spectator mode initialized');
        },
        
        async setupStreaming() {
            // Get canvas stream
            const canvas = document.querySelector('canvas');
            if (!canvas) return;
            
            this.stream = canvas.captureStream(this.settings.frameRate);
            
            // Add audio if available
            if (ProximityVoiceChat.localStream) {
                ProximityVoiceChat.localStream.getAudioTracks().forEach(track => {
                    this.stream.addTrack(track);
                });
            }
            
            // Create media recorder
            this.mediaRecorder = new MediaRecorder(this.stream, {
                mimeType: 'video/webm;codecs=vp9,opus',
                videoBitsPerSecond: this.settings.videoBitrate,
                audioBitsPerSecond: this.settings.audioBitrate
            });
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.broadcastStreamData(event.data);
                }
            };
        },
        
        startStreaming() {
            if (!this.mediaRecorder) return;
            
            this.mediaRecorder.start(100); // Collect data every 100ms
            console.log('[Phase 4] Started streaming');
        },
        
        stopStreaming() {
            if (!this.mediaRecorder) return;
            
            this.mediaRecorder.stop();
            console.log('[Phase 4] Stopped streaming');
        },
        
        broadcastStreamData(data) {
            // Send to spectators
            this.spectators.forEach(spectatorId => {
                // Send via data channel
                const channel = MultiplayerNetwork.dataChannels[spectatorId];
                if (channel && channel.readyState === 'open') {
                    // Note: In practice, you'd want to use a proper streaming protocol
                    // This is simplified for demonstration
                }
            });
        },
        
        // Become spectator
        async becomeSpectator(targetPlayerId) {
            console.log('[Phase 4] Becoming spectator of:', targetPlayerId);
            
            // Request stream from target player
            MultiplayerNetwork.broadcast({
                type: 'spectator-request',
                from: MultiplayerNetwork.localPlayer.id,
                target: targetPlayerId
            });
            
            // Setup video element for viewing
            this.setupSpectatorView();
        },
        
        setupSpectatorView() {
            // Create spectator UI
            const container = document.createElement('div');
            container.id = 'spectator-view';
            container.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: #000;
                z-index: 9999;
            `;
            
            const video = document.createElement('video');
            video.id = 'spectator-video';
            video.style.cssText = `
                width: 100%;
                height: 100%;
                object-fit: contain;
            `;
            video.autoplay = true;
            
            const controls = document.createElement('div');
            controls.style.cssText = `
                position: absolute;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                display: flex;
                gap: 10px;
            `;
            
            controls.innerHTML = `
                <button id="spectator-prev" style="padding: 10px 20px;">Previous Player</button>
                <button id="spectator-exit" style="padding: 10px 20px;">Exit Spectator</button>
                <button id="spectator-next" style="padding: 10px 20px;">Next Player</button>
            `;
            
            container.appendChild(video);
            container.appendChild(controls);
            document.body.appendChild(container);
            
            // Setup controls
            document.getElementById('spectator-exit').addEventListener('click', () => {
                this.exitSpectator();
            });
        },
        
        exitSpectator() {
            const container = document.getElementById('spectator-view');
            if (container) {
                container.remove();
            }
            
            // Notify server
            MultiplayerNetwork.broadcast({
                type: 'spectator-exit',
                playerId: MultiplayerNetwork.localPlayer.id
            });
        },
        
        // Recording
        startRecording() {
            if (!this.mediaRecorder) return;
            
            this.recordedChunks = [];
            this.isRecording = true;
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };
            
            this.mediaRecorder.start();
            console.log('[Phase 4] Started recording');
        },
        
        stopRecording() {
            if (!this.mediaRecorder || !this.isRecording) return;
            
            this.mediaRecorder.stop();
            this.isRecording = false;
            
            // Save recording
            setTimeout(() => {
                this.saveRecording();
            }, 100);
            
            console.log('[Phase 4] Stopped recording');
        },
        
        saveRecording() {
            const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `backrooms-pacman-recording-${Date.now()}.webm`;
            document.body.appendChild(a);
            a.click();
            
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
        },
        
        // Add spectator
        addSpectator(playerId) {
            this.spectators.add(playerId);
            console.log('[Phase 4] Added spectator:', playerId);
        },
        
        // Remove spectator
        removeSpectator(playerId) {
            this.spectators.delete(playerId);
            console.log('[Phase 4] Removed spectator:', playerId);
        }
    };

    // ============================================
    // PHASE 4.5: SOCIAL FEATURES & LEADERBOARDS
    // ============================================
    
    const SocialFeatures = {
        // Friends
        friends: new Map(),
        friendRequests: [],
        
        // Presence
        presence: {
            status: 'online', // online, playing, away, offline
            currentGame: null,
            lastSeen: Date.now()
        },
        
        // Leaderboards
        leaderboards: new Map(),
        
        // Achievements
        achievements: new Map(),
        
        init() {
            console.log('[Phase 4] Initializing social features...');
            
            // Load friends from storage
            this.loadFriends();
            
            // Setup presence
            this.setupPresence();
            
            // Fetch leaderboards
            this.fetchLeaderboards();
            
            console.log('[Phase 4] Social features initialized');
        },
        
        // Friends system
        loadFriends() {
            const saved = localStorage.getItem('backroomsPacman_friends');
            if (saved) {
                const data = JSON.parse(saved);
                this.friends = new Map(data.friends);
                this.friendRequests = data.requests || [];
            }
        },
        
        saveFriends() {
            const data = {
                friends: Array.from(this.friends.entries()),
                requests: this.friendRequests
            };
            localStorage.setItem('backroomsPacman_friends', JSON.stringify(data));
        },
        
        sendFriendRequest(playerId) {
            // Send request
            MultiplayerNetwork.broadcast({
                type: 'friend-request',
                from: MultiplayerNetwork.localPlayer.id,
                to: playerId
            });
            
            console.log('[Phase 4] Sent friend request to:', playerId);
        },
        
        acceptFriendRequest(playerId) {
            // Add to friends
            this.friends.set(playerId, {
                id: playerId,
                addedAt: Date.now(),
                status: 'offline'
            });
            
            // Remove from requests
            this.friendRequests = this.friendRequests.filter(id => id !== playerId);
            
            // Save
            this.saveFriends();
            
            // Notify
            MultiplayerNetwork.broadcast({
                type: 'friend-accepted',
                from: MultiplayerNetwork.localPlayer.id,
                to: playerId
            });
        },
        
        removeFriend(playerId) {
            this.friends.delete(playerId);
            this.saveFriends();
        },
        
        // Presence system
        setupPresence() {
            // Update presence periodically
            setInterval(() => {
                this.updatePresence();
            }, 30000); // Every 30 seconds
        },
        
        updatePresence() {
            this.presence.lastSeen = Date.now();
            
            // Broadcast to friends
            MultiplayerNetwork.broadcast({
                type: 'presence-update',
                playerId: MultiplayerNetwork.localPlayer.id,
                presence: this.presence
            });
        },
        
        setPresenceStatus(status) {
            this.presence.status = status;
            this.updatePresence();
        },
        
        // Leaderboards
        async fetchLeaderboards() {
            // Fetch from server
            // This would connect to your leaderboard API
            
            const categories = ['survival-time', 'pellets-collected', 'deaths', 'exploration'];
            
            categories.forEach(category => {
                this.leaderboards.set(category, {
                    category: category,
                    entries: [],
                    lastUpdated: Date.now()
                });
            });
        },
        
        submitScore(category, score) {
            // Submit to server
            const entry = {
                playerId: MultiplayerNetwork.localPlayer.id,
                score: score,
                timestamp: Date.now()
            };
            
            // Update local
            const leaderboard = this.leaderboards.get(category);
            if (leaderboard) {
                leaderboard.entries.push(entry);
                leaderboard.entries.sort((a, b) => b.score - a.score);
                leaderboard.entries = leaderboard.entries.slice(0, 100); // Keep top 100
            }
            
            // Broadcast
            MultiplayerNetwork.broadcast({
                type: 'leaderboard-update',
                category: category,
                entry: entry
            });
        },
        
        getLeaderboard(category) {
            return this.leaderboards.get(category);
        },
        
        // Achievements
        unlockAchievement(achievementId) {
            if (this.achievements.has(achievementId)) return;
            
            const achievement = {
                id: achievementId,
                unlockedAt: Date.now()
            };
            
            this.achievements.set(achievementId, achievement);
            
            // Save
            localStorage.setItem('backroomsPacman_achievements', 
                JSON.stringify(Array.from(this.achievements.entries())));
            
            // Show notification
            this.showAchievementNotification(achievementId);
            
            // Broadcast
            MultiplayerNetwork.broadcast({
                type: 'achievement-unlocked',
                playerId: MultiplayerNetwork.localPlayer.id,
                achievement: achievementId
            });
        },
        
        showAchievementNotification(achievementId) {
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: linear-gradient(135deg, #ffd700, #ffaa00);
                color: #000;
                padding: 20px;
                border-radius: 10px;
                box-shadow: 0 4px 20px rgba(255, 215, 0, 0.5);
                z-index: 10000;
                animation: slideIn 0.5s;
            `;
            
            notification.innerHTML = `
                <div style="font-weight: bold; font-size: 18px;">🏆 Achievement Unlocked!</div>
                <div style="margin-top: 5px;">${achievementId}</div>
            `;
            
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.style.animation = 'slideOut 0.5s';
                setTimeout(() => notification.remove(), 500);
            }, 5000);
        },
        
        // Invite system
        inviteFriend(playerId) {
            MultiplayerNetwork.broadcast({
                type: 'game-invite',
                from: MultiplayerNetwork.localPlayer.id,
                to: playerId,
                roomId: MultiplayerNetwork.roomId
            });
        }
    };

    // ============================================
    // PHASE 4: MAIN INITIALIZER
    // ============================================
    
    const Phase4Multiplayer = {
        async init(serverUrl) {
            console.log('[Phase 4] Initializing Multiplayer & Social Features...');
            
            // Initialize networking
            await MultiplayerNetwork.init(serverUrl);
            
            // Initialize voice chat
            await ProximityVoiceChat.init();
            
            // Initialize shared horror
            SharedHorror.init();
            
            // Initialize spectator mode
            await SpectatorMode.init();
            
            // Initialize social features
            SocialFeatures.init();
            
            console.log('[Phase 4] Multiplayer initialization complete');
        },
        
        update(dt) {
            // Update networking
            MultiplayerNetwork.update(dt);
            
            // Update voice chat
            ProximityVoiceChat.update();
            
            // Update shared horror
            SharedHorror.update(dt);
        },
        
        // Room management
        createRoom() {
            return MultiplayerNetwork.createRoom();
        },
        
        joinRoom(roomId) {
            return MultiplayerNetwork.joinRoom(roomId);
        },
        
        // Event triggers
        triggerHorrorEvent(eventType, data) {
            return SharedHorror.triggerEvent(eventType, data);
        },
        
        // Streaming
        startStreaming() {
            SpectatorMode.startStreaming();
        },
        
        stopStreaming() {
            SpectatorMode.stopStreaming();
        },
        
        // Recording
        startRecording() {
            SpectatorMode.startRecording();
        },
        
        stopRecording() {
            SpectatorMode.stopRecording();
        },
        
        // Social
        sendFriendRequest(playerId) {
            SocialFeatures.sendFriendRequest(playerId);
        },
        
        submitScore(category, score) {
            SocialFeatures.submitScore(category, score);
        },
        
        unlockAchievement(achievementId) {
            SocialFeatures.unlockAchievement(achievementId);
        },
        
        // Cleanup
        disconnect() {
            MultiplayerNetwork.disconnect();
            ProximityVoiceChat.cleanup();
        }
    };

    // Export to global scope
    window.Phase4Multiplayer = Phase4Multiplayer;
    window.MultiplayerNetwork = MultiplayerNetwork;
    window.ProximityVoiceChat = ProximityVoiceChat;
    window.SharedHorror = SharedHorror;
    window.SpectatorMode = SpectatorMode;
    window.SocialFeatures = SocialFeatures;

})();

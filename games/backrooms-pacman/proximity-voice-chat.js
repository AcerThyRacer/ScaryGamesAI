/**
 * PHASE 5: PROXIMITY VOICE CHAT & COOPERATIVE GAMEPLAY
 * Spatial voice chat with distance-based volume and team mechanics
 */

var ProximityVoiceChat = (function() {
    'use strict';

    var config = {
        // Voice settings
        maxDistance: 20, // meters
        minDistance: 1, // meters for full volume
        rolloffFactor: 1.5,
        
        // Audio quality
        sampleRate: 16000,
        channels: 1, // Mono for voice
        bitrate: 32000,
        
        // Voice activation
        voiceActivationThreshold: 0.05,
        noiseSuppression: true,
        echoCancellation: true,
        autoGainControl: true
    };

    var state = {
        audioContext: null,
        mediaStream: null,
        isSpeaking: false,
        speakingTimeout: null,
        remoteAudioElements: {},
        gainNodes: {}
    };

    /**
     * Initialize voice chat
     */
    async function init() {
        try {
            // Create audio context
            state.audioContext = new (window.AudioContext || window.webkitAudioContext)({
                sampleRate: config.sampleRate
            });
            
            // Request microphone access
            state.mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: config.echoCancellation,
                    noiseSuppression: config.noiseSuppression,
                    autoGainControl: config.autoGainControl,
                    sampleRate: config.sampleRate
                }
            });
            
            console.log('[ProximityVoiceChat] Initialized with microphone access');
            return true;
        } catch (e) {
            console.error('[ProximityVoiceChat] Failed to initialize:', e);
            return false;
        }
    }

    /**
     * Start transmitting voice
     */
    function startTransmitting() {
        if (!state.mediaStream) return;
        
        var source = state.audioContext.createMediaStreamSource(state.mediaStream);
        
        // Create analyser for voice detection
        var analyser = state.audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        
        // Monitor voice activity
        detectVoiceActivity(analyser);
        
        console.log('[ProximityVoiceChat] Started transmitting');
    }

    /**
     * Detect voice activity
     */
    function detectVoiceActivity(analyser) {
        var dataArray = new Uint8Array(analyser.frequencyBinCount);
        
        function checkActivity() {
            analyser.getByteFrequencyData(dataArray);
            
            // Calculate average volume
            var sum = 0;
            for (var i = 0; i < dataArray.length; i++) {
                sum += dataArray[i];
            }
            var average = sum / dataArray.length / 255;
            
            var wasSpeaking = state.isSpeaking;
            state.isSpeaking = average > config.voiceActivationThreshold;
            
            // Notify on state change
            if (state.isSpeaking !== wasSpeaking) {
                onSpeakingStateChanged(state.isSpeaking);
            }
            
            requestAnimationFrame(checkActivity);
        }
        
        checkActivity();
    }

    /**
     * Handle speaking state change
     */
    function onSpeakingStateChanged(speaking) {
        // Clear existing timeout
        if (state.speakingTimeout) {
            clearTimeout(state.speakingTimeout);
        }
        
        if (speaking) {
            // Notify multiplayer system
            if (typeof MultiplayerNetwork !== 'undefined') {
                MultiplayerNetwork.sendGameAction('VOICE_CHAT', { speaking: true });
            }
        } else {
            // Delay to prevent rapid toggling
            state.speakingTimeout = setTimeout(function() {
                if (typeof MultiplayerNetwork !== 'undefined') {
                    MultiplayerNetwork.sendGameAction('VOICE_CHAT', { speaking: false });
                }
            }, 200);
        }
    }

    /**
     * Add remote player audio
     */
    function addRemotePlayer(playerId, audioStream) {
        if (!state.audioContext) return;
        
        try {
            var audioElement = document.createElement('audio');
            audioElement.srcObject = audioStream;
            audioElement.autoplay = true;
            
            // Create spatial audio node
            var panner = state.audioContext.createPanner();
            panner.panningModel = 'HRTF';
            panner.distanceModel = 'exponential';
            panner.refDistance = config.minDistance;
            panner.maxDistance = config.maxDistance;
            panner.rolloffFactor = config.rolloffFactor;
            
            var gainNode = state.audioContext.createGain();
            
            // Connect: source -> panner -> gain -> destination
            var source = state.audioContext.createMediaStreamSource(audioStream);
            source.connect(panner);
            panner.connect(gainNode);
            gainNode.connect(state.audioContext.destination);
            
            state.remoteAudioElements[playerId] = audioElement;
            state.gainNodes[playerId] = gainNode;
            
            console.log('[ProximityVoiceChat] Added remote player:', playerId);
        } catch (e) {
            console.error('[ProximityVoiceChat] Failed to add remote player:', e);
        }
    }

    /**
     * Update remote player position (for spatial audio)
     */
    function updateRemotePlayerPosition(playerId, position) {
        // This would integrate with the game's audio listener
        // For now, placeholder
    }

    /**
     * Remove remote player audio
     */
    function removeRemotePlayer(playerId) {
        if (state.remoteAudioElements[playerId]) {
            state.remoteAudioElements[playerId].pause();
            delete state.remoteAudioElements[playerId];
        }
        
        if (state.gainNodes[playerId]) {
            state.gainNodes[playerId].disconnect();
            delete state.gainNodes[playerId];
        }
        
        console.log('[ProximityVoiceChat] Removed remote player:', playerId);
    }

    /**
     * Mute/unmute microphone
     */
    function setMuted(muted) {
        if (state.mediaStream && state.mediaStream.getAudioTracks().length > 0) {
            state.mediaStream.getAudioTracks()[0].enabled = !muted;
            console.log('[ProximityVoiceChat] Microphone', muted ? 'muted' : 'unmuted');
        }
    }

    /**
     * Check if local player is speaking
     */
    function isLocalPlayerSpeaking() {
        return state.isSpeaking;
    }

    /**
     * Cleanup voice chat
     */
    function cleanup() {
        if (state.mediaStream) {
            state.mediaStream.getTracks().forEach(function(track) {
                track.stop();
            });
        }
        
        if (state.audioContext) {
            state.audioContext.close();
        }
        
        state.remoteAudioElements = {};
        state.gainNodes = {};
        
        console.log('[ProximityVoiceChat] Cleaned up');
    }

    // Public API
    return {
        init: init,
        startTransmitting: startTransmitting,
        addRemotePlayer: addRemotePlayer,
        updateRemotePlayerPosition: updateRemotePlayerPosition,
        removeRemotePlayer: removeRemotePlayer,
        setMuted: setMuted,
        isLocalPlayerSpeaking: isLocalPlayerSpeaking,
        cleanup: cleanup,
        config: config,
        state: state
    };
})();

// Export to global scope
if (typeof window !== 'undefined') {
    window.ProximityVoiceChat = ProximityVoiceChat;
}

console.log('[ProximityVoiceChat] Module loaded');

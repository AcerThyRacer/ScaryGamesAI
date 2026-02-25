/**
 * Voice Chat & Social Features
 * Spatial audio communication and social systems
 */

var VoiceChat = (function() {
    'use strict';

    var config = {
        maxVoiceDistance: 15,
        voiceVolume: 0.8,
        noiseSuppression: true,
        echoCancellation: true,
        autoGainControl: true
    };

    var state = {
        initialized: false,
        localStream: null,
        audioContext: null,
        analyser: null,
        microphone: null,
        isSpeaking: false,
        speakingPlayers: {}
    };

    var audioElements = {};

    function init() {
        console.log('[VoiceChat] Initializing...');

        try {
            state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            state.initialized = true;
            console.log('[VoiceChat] Initialized');
        } catch (e) {
            console.error('[VoiceChat] Failed to initialize:', e);
            state.initialized = false;
        }

        return state.initialized;
    }

    async function requestMicrophone() {
        if (!state.initialized) {
            console.error('[VoiceChat] Not initialized');
            return false;
        }

        try {
            state.localStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: config.echoCancellation,
                    noiseSuppression: config.noiseSuppression,
                    autoGainControl: config.autoGainControl
                }
            });

            state.microphone = state.audioContext.createMediaStreamSource(state.localStream);
            state.analyser = state.audioContext.createAnalyser();
            state.analyser.fftSize = 256;
            state.microphone.connect(state.analyser);

            console.log('[VoiceChat] Microphone enabled');
            return true;
        } catch (e) {
            console.error('[VoiceChat] Microphone access denied:', e);
            return false;
        }
    }

    function isLocalPlayerSpeaking() {
        if (!state.analyser) return false;

        var dataArray = new Uint8Array(state.analyser.frequencyBinCount);
        state.analyser.getByteFrequencyData(dataArray);

        var average = dataArray.reduce(function(a, b) { return a + b; }) / dataArray.length;
        state.isSpeaking = average > 10;

        return state.isSpeaking;
    }

    function addRemotePlayer(playerId, stream) {
        if (audioElements[playerId]) {
            audioElements[playerId].srcObject = stream;
        } else {
            var audio = document.createElement('audio');
            audio.srcObject = stream;
            audio.autoplay = true;
            audio.volume = config.voiceVolume;
            document.body.appendChild(audio);
            audioElements[playerId] = audio;
        }

        console.log('[VoiceChat] Added remote player audio:', playerId);
    }

    function removeRemotePlayer(playerId) {
        if (audioElements[playerId]) {
            audioElements[playerId].srcObject = null;
            audioElements[playerId].remove();
            delete audioElements[playerId];
        }

        if (state.speakingPlayers[playerId]) {
            delete state.speakingPlayers[playerId];
        }
    }

    function setPlayerSpeaking(playerId, speaking) {
        state.speakingPlayers[playerId] = speaking;
    }

    function getSpeakingPlayers() {
        return Object.keys(state.speakingPlayers).filter(function(id) {
            return state.speakingPlayers[id];
        });
    }

    function mute(muted) {
        if (state.microphone) {
            state.microphone.disconnect();
            if (!muted) {
                state.microphone.connect(state.analyser);
            }
        }
    }

    function cleanup() {
        if (state.localStream) {
            state.localStream.getTracks().forEach(function(track) {
                track.stop();
            });
        }

        for (var playerId in audioElements) {
            audioElements[playerId].remove();
        }

        if (state.audioContext) {
            state.audioContext.close();
        }

        state.localStream = null;
        state.audioContext = null;
        state.analyser = null;
        state.microphone = null;
        audioElements = {};

        console.log('[VoiceChat] Cleaned up');
    }

    return {
        init: init,
        requestMicrophone: requestMicrophone,
        isLocalPlayerSpeaking: isLocalPlayerSpeaking,
        addRemotePlayer: addRemotePlayer,
        removeRemotePlayer: removeRemotePlayer,
        setPlayerSpeaking: setPlayerSpeaking,
        getSpeakingPlayers: getSpeakingPlayers,
        mute: mute,
        cleanup: cleanup,
        config: config
    };
})();

var SocialFeatures = (function() {
    'use strict';

    var config = {
        maxPings: 5,
        pingDuration: 3,
        maxJournalEntries: 20
    };

    var pings = [];
    var journal = [];
    var photoMode = {
        active: false,
        lastPhoto: null
    };

    function init() {
        journal = loadJournal();
        console.log('[SocialFeatures] Initialized');
    }

    function sendPing(position, type, playerId) {
        if (pings.length >= config.maxPings) {
            pings.shift();
        }

        var ping = {
            id: 'ping_' + Date.now(),
            position: position,
            type: type || 'default',
            playerId: playerId,
            timestamp: Date.now(),
            duration: config.pingDuration
        };

        pings.push(ping);
        console.log('[SocialFeatures] Ping sent:', type, 'at', position);

        setTimeout(function() {
            removePing(ping.id);
        }, config.pingDuration * 1000);

        return ping;
    }

    function removePing(pingId) {
        var index = pings.findIndex(function(p) { return p.id === pingId; });
        if (index !== -1) {
            pings.splice(index, 1);
        }
    }

    function getPings() {
        return pings;
    }

    function addToJournal(entry) {
        if (journal.length >= config.maxJournalEntries) {
            journal.shift();
        }

        journal.push({
            id: 'entry_' + Date.now(),
            text: entry.text,
            position: entry.position,
            timestamp: Date.now(),
            type: entry.type || 'note'
        });

        saveJournal();
        console.log('[SocialFeatures] Journal entry added');
    }

    function getJournal() {
        return journal;
    }

    function saveJournal() {
        try {
            localStorage.setItem('backrooms_journal', JSON.stringify(journal));
        } catch (e) {
            console.error('[SocialFeatures] Failed to save journal');
        }
    }

    function loadJournal() {
        try {
            var saved = localStorage.getItem('backrooms_journal');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    }

    function takePhoto(camera, renderer) {
        if (!camera || !renderer) return null;

        photoMode.active = true;
        photoMode.lastPhoto = {
            timestamp: Date.now(),
            position: camera.position.clone(),
            rotation: camera.rotation.clone()
        };

        renderer.renderCallback = function() {
            var canvas = renderer.domElement;
            var dataURL = canvas.toDataURL('image/png');

            photoMode.active = false;
            console.log('[SocialFeatures] Photo taken');

            return dataURL;
        };

        return photoMode.lastPhoto;
    }

    function getPhotoMode() {
        return photoMode;
    }

    function clearJournal() {
        journal = [];
        localStorage.removeItem('backrooms_journal');
    }

    return {
        init: init,
        sendPing: sendPing,
        removePing: removePing,
        getPings: getPings,
        addToJournal: addToJournal,
        getJournal: getJournal,
        clearJournal: clearJournal,
        takePhoto: takePhoto,
        getPhotoMode: getPhotoMode
    };
})();

if (typeof window !== 'undefined') {
    window.VoiceChat = VoiceChat;
    window.SocialFeatures = SocialFeatures;
}

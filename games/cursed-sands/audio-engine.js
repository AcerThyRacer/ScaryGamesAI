/* ============================================
   Cursed Sands — Phase 11: Audio Engine
   Spatial audio, dynamic music, ambient layers,
   creature sounds, environmental audio
   ============================================ */
var AudioEngine = (function () {
    'use strict';

    var ctx = null;
    var masterGain = null;
    var musicGain = null;
    var sfxGain = null;
    var ambientGain = null;

    var currentTrack = null;
    var trackFadeTimer = 0;
    var _initialized = false;

    // ============ MUSIC LAYERS ============
    var musicLayers = {
        exploration: { frequency: 220, type: 'sine', volume: 0.08 },
        combat: { frequency: 330, type: 'sawtooth', volume: 0.12 },
        horror: { frequency: 110, type: 'square', volume: 0.06 },
        boss: { frequency: 440, type: 'sawtooth', volume: 0.15 },
        night: { frequency: 165, type: 'sine', volume: 0.05 },
        biome_lush: { frequency: 294, type: 'sine', volume: 0.07 },
        biome_volcanic: { frequency: 147, type: 'square', volume: 0.08 },
        underwater: { frequency: 196, type: 'sine', volume: 0.06 }
    };

    var activeLayers = {};
    var ambientSources = [];

    // ============ SFX DEFINITIONS ============
    var SFX = {
        footstep_sand: { freq: 80, dur: 0.08, type: 'noise' },
        footstep_stone: { freq: 200, dur: 0.05, type: 'noise' },
        footstep_water: { freq: 120, dur: 0.12, type: 'noise' },
        swing: { freq: 300, dur: 0.15, type: 'sawtooth' },
        hit: { freq: 150, dur: 0.1, type: 'square' },
        critical: { freq: 600, dur: 0.2, type: 'sawtooth' },
        pickup: { freq: 800, dur: 0.15, type: 'sine' },
        levelup: { freq: [523, 659, 784], dur: 0.5, type: 'sine' },
        quicksand: { freq: 60, dur: 0.3, type: 'noise' },
        splash: { freq: 100, dur: 0.2, type: 'noise' },
        campfire: { freq: 80, dur: 0.5, type: 'noise' },
        wind_gust: { freq: 50, dur: 1.0, type: 'noise' },
        snake_hiss: { freq: 2000, dur: 0.3, type: 'noise' },
        jackal_howl: { freq: [400, 500, 350], dur: 0.8, type: 'sine' },
        boss_roar: { freq: [80, 60, 40], dur: 1.5, type: 'sawtooth' },
        door_open: { freq: 200, dur: 0.4, type: 'square' },
        quest_complete: { freq: [523, 659, 784, 1047], dur: 0.8, type: 'sine' },
        damage: { freq: 100, dur: 0.1, type: 'square' },
        death: { freq: [200, 150, 100, 50], dur: 1.5, type: 'sawtooth' },
        tame: { freq: [400, 500, 600, 700], dur: 0.6, type: 'sine' }
    };

    // ============ INIT ============
    function init() {
        if (_initialized) return;
        try {
            ctx = new (window.AudioContext || window.webkitAudioContext)();
            masterGain = ctx.createGain(); masterGain.gain.value = 0.3;
            musicGain = ctx.createGain(); musicGain.gain.value = 0.5;
            sfxGain = ctx.createGain(); sfxGain.gain.value = 0.7;
            ambientGain = ctx.createGain(); ambientGain.gain.value = 0.4;
            musicGain.connect(masterGain);
            sfxGain.connect(masterGain);
            ambientGain.connect(masterGain);
            masterGain.connect(ctx.destination);
            _initialized = true;
        } catch (e) {
            console.warn('AudioEngine init failed:', e);
        }
    }

    // ============ PLAY SFX ============
    function playSFX(name, volume, pan) {
        if (!_initialized || !ctx) return;
        var sfx = SFX[name];
        if (!sfx) return;

        try {
            var gain = ctx.createGain();
            gain.gain.value = (volume || 0.5) * 0.3;
            gain.connect(sfxGain);

            // Spatial panning
            if (pan !== undefined) {
                var panner = ctx.createStereoPanner();
                panner.pan.value = Math.max(-1, Math.min(1, pan));
                gain.connect(panner);
                panner.connect(sfxGain);
            }

            if (sfx.type === 'noise') {
                // White noise burst
                var bufferSize = Math.round(ctx.sampleRate * sfx.dur);
                var buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
                var data = buffer.getChannelData(0);
                for (var i = 0; i < bufferSize; i++) {
                    data[i] = (Math.random() * 2 - 1) * 0.5;
                }
                var source = ctx.createBufferSource();
                source.buffer = buffer;
                // Filter for tonal noise
                var filter = ctx.createBiquadFilter();
                filter.type = 'bandpass';
                filter.frequency.value = Array.isArray(sfx.freq) ? sfx.freq[0] : sfx.freq;
                filter.Q.value = 5;
                source.connect(filter);
                filter.connect(gain);
                source.start(ctx.currentTime);
                source.stop(ctx.currentTime + sfx.dur);
            } else if (Array.isArray(sfx.freq)) {
                // Arpeggio
                var stepDur = sfx.dur / sfx.freq.length;
                sfx.freq.forEach(function (f, idx) {
                    var osc = ctx.createOscillator();
                    osc.type = sfx.type;
                    osc.frequency.value = f;
                    var noteGain = ctx.createGain();
                    noteGain.gain.value = 0.2;
                    noteGain.gain.setValueAtTime(0.2, ctx.currentTime + idx * stepDur);
                    noteGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (idx + 1) * stepDur);
                    osc.connect(noteGain);
                    noteGain.connect(gain);
                    osc.start(ctx.currentTime + idx * stepDur);
                    osc.stop(ctx.currentTime + (idx + 1) * stepDur);
                });
            } else {
                var osc = ctx.createOscillator();
                osc.type = sfx.type;
                osc.frequency.value = sfx.freq;
                osc.connect(gain);
                gain.gain.setValueAtTime(0.3, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + sfx.dur);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + sfx.dur);
            }
        } catch (e) { }
    }

    // Spatial SFX adjusted by distance/angle
    function playSpatialSFX(name, srcX, srcZ, listenerX, listenerZ, listenerYaw) {
        var dx = srcX - listenerX, dz = srcZ - listenerZ;
        var dist = Math.sqrt(dx * dx + dz * dz);
        if (dist > 40) return; // too far
        var volume = Math.max(0, 1 - dist / 40);
        var angle = Math.atan2(dx, dz) - listenerYaw;
        var pan = Math.sin(angle);
        playSFX(name, volume * 0.5, pan);
    }

    // ============ MUSIC LAYERS ============
    function setMusicLayer(layerName) {
        if (!_initialized || !ctx) return;
        // Stop current
        Object.keys(activeLayers).forEach(function (k) {
            if (k !== layerName) {
                try { activeLayers[k].osc.stop(); } catch (e) { }
                delete activeLayers[k];
            }
        });
        if (activeLayers[layerName]) return; // Already playing
        var layer = musicLayers[layerName];
        if (!layer) return;
        try {
            var osc = ctx.createOscillator();
            osc.type = layer.type;
            osc.frequency.value = layer.frequency;
            var gain = ctx.createGain();
            gain.gain.value = layer.volume;
            // LFO for subtle vibrato
            var lfo = ctx.createOscillator();
            lfo.frequency.value = 0.3;
            var lfoGain = ctx.createGain();
            lfoGain.gain.value = 3;
            lfo.connect(lfoGain);
            lfoGain.connect(osc.frequency);
            osc.connect(gain);
            gain.connect(musicGain);
            osc.start();
            lfo.start();
            activeLayers[layerName] = { osc: osc, gain: gain, lfo: lfo };
        } catch (e) { }
    }

    function stopMusic() {
        Object.keys(activeLayers).forEach(function (k) {
            try { activeLayers[k].osc.stop(); } catch (e) { }
            try { activeLayers[k].lfo.stop(); } catch (e) { }
        });
        activeLayers = {};
    }

    // ============ AMBIENT LOOPS ============
    function startAmbientWind() {
        if (!_initialized || !ctx) return;
        try {
            var bufferSize = ctx.sampleRate * 2;
            var buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            var data = buffer.getChannelData(0);
            for (var i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * 0.1;
            }
            var source = ctx.createBufferSource();
            source.buffer = buffer;
            source.loop = true;
            var filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 300;
            source.connect(filter);
            filter.connect(ambientGain);
            source.start();
            ambientSources.push(source);
        } catch (e) { }
    }

    // ============ DYNAMIC MUSIC ============
    function updateMusic(isNight, inCombat, bossActive, biomeKey, underwater) {
        if (bossActive) { setMusicLayer('boss'); return; }
        if (inCombat) { setMusicLayer('combat'); return; }
        if (underwater) { setMusicLayer('underwater'); return; }
        if (biomeKey === 'scorching_badlands') { setMusicLayer('biome_volcanic'); return; }
        if (biomeKey === 'oasis_grove') { setMusicLayer('biome_lush'); return; }
        if (isNight) { setMusicLayer('night'); return; }
        setMusicLayer('exploration');
    }

    // ============ VOLUME CONTROLS ============
    function setMasterVolume(v) { if (masterGain) masterGain.gain.value = Math.max(0, Math.min(1, v)); }
    function setMusicVolume(v) { if (musicGain) musicGain.gain.value = Math.max(0, Math.min(1, v)); }
    function setSFXVolume(v) { if (sfxGain) sfxGain.gain.value = Math.max(0, Math.min(1, v)); }

    // ============ RESET ============
    function reset() {
        stopMusic();
        ambientSources.forEach(function (s) { try { s.stop(); } catch (e) { } });
        ambientSources = [];
    }

    return {
        init: init, reset: reset,
        playSFX: playSFX, playSpatialSFX: playSpatialSFX,
        setMusicLayer: setMusicLayer, stopMusic: stopMusic,
        startAmbientWind: startAmbientWind,
        updateMusic: updateMusic,
        setMasterVolume: setMasterVolume,
        setMusicVolume: setMusicVolume,
        setSFXVolume: setSFXVolume
    };
})();

/* ============================================
   ScaryGamesAI — Horror Audio Engine
   Procedurally generated horror sounds using
   Web Audio API. Zero external files needed.
   ============================================ */

var HorrorAudio = (function () {
    'use strict';

    var ctx = null;
    var masterGain = null;
    var musicGain = null;
    var sfxGain = null;
    var ambienceGain = null;
    var initialized = false;
    var activeNodes = [];
    var currentAmbience = null;
    var currentMusic = null;
    var volume = 0.6;

    // ============ INIT ============
    function init() {
        if (initialized) return;
        try {
            ctx = new (window.AudioContext || window.webkitAudioContext)();
            masterGain = ctx.createGain();
            masterGain.gain.value = volume;
            masterGain.connect(ctx.destination);

            musicGain = ctx.createGain();
            musicGain.gain.value = 0.3;
            musicGain.connect(masterGain);

            sfxGain = ctx.createGain();
            sfxGain.gain.value = 0.7;
            sfxGain.connect(masterGain);

            ambienceGain = ctx.createGain();
            ambienceGain.gain.value = 0.4;
            ambienceGain.connect(masterGain);

            initialized = true;
        } catch (e) {
            console.warn('HorrorAudio: Web Audio API not available', e);
        }
    }

    function ensureContext() {
        if (!initialized) init();
        if (ctx && ctx.state === 'suspended') ctx.resume();
    }

    // ============ VOLUME CONTROL ============
    function setVolume(v) {
        volume = Math.max(0, Math.min(1, v));
        if (masterGain) masterGain.gain.setTargetAtTime(volume, ctx.currentTime, 0.05);
    }

    function getVolume() { return volume; }

    function setMusicVolume(v) { if (musicGain) musicGain.gain.setTargetAtTime(v, ctx.currentTime, 0.05); }
    function setSfxVolume(v) { if (sfxGain) sfxGain.gain.setTargetAtTime(v, ctx.currentTime, 0.05); }

    // ============ NOISE GENERATORS ============
    function createNoiseBuffer(duration, type) {
        var sampleRate = ctx.sampleRate;
        var length = sampleRate * duration;
        var buffer = ctx.createBuffer(1, length, sampleRate);
        var data = buffer.getChannelData(0);

        if (type === 'white') {
            for (var i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
        } else if (type === 'brown') {
            var last = 0;
            for (var i = 0; i < length; i++) {
                var w = Math.random() * 2 - 1;
                data[i] = (last + 0.02 * w) / 1.02;
                last = data[i];
                data[i] *= 3.5;
            }
        } else if (type === 'pink') {
            var b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
            for (var i = 0; i < length; i++) {
                var w = Math.random() * 2 - 1;
                b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759;
                b2 = 0.96900 * b2 + w * 0.1538520; b3 = 0.86650 * b3 + w * 0.3104856;
                b4 = 0.55000 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.0168980;
                data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
                b6 = w * 0.115926;
            }
        }
        return buffer;
    }

    // ============ SOUND EFFECTS ============

    // UI click
    function playClick() {
        ensureContext();
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(sfxGain);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.1);
    }

    // UI hover
    function playHover() {
        ensureContext();
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, ctx.currentTime);
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
        osc.connect(gain);
        gain.connect(sfxGain);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.06);
    }

    // Collect item (pellet, key, artifact)
    function playCollect() {
        ensureContext();
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523, ctx.currentTime);
        osc.frequency.setValueAtTime(659, ctx.currentTime + 0.08);
        osc.frequency.setValueAtTime(784, ctx.currentTime + 0.16);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(sfxGain);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
    }

    // Powerup grab
    function playPowerup() {
        ensureContext();
        for (var i = 0; i < 3; i++) {
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(300 + i * 200, ctx.currentTime + i * 0.1);
            gain.gain.setValueAtTime(0.1, ctx.currentTime + i * 0.1);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.15);
            osc.connect(gain);
            gain.connect(sfxGain);
            osc.start(ctx.currentTime + i * 0.1);
            osc.stop(ctx.currentTime + i * 0.1 + 0.15);
        }
    }

    // Footstep
    function playFootstep(surface) {
        ensureContext();
        var buffer = createNoiseBuffer(0.08, 'brown');
        var src = ctx.createBufferSource();
        src.buffer = buffer;
        var gain = ctx.createGain();
        var filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';

        if (surface === 'snow') {
            filter.frequency.value = 3000;
            filter.Q.value = 0.5;
            gain.gain.setValueAtTime(0.08, ctx.currentTime);
        } else if (surface === 'water') {
            filter.frequency.value = 800;
            filter.Q.value = 1;
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
        } else if (surface === 'stone') {
            filter.frequency.value = 2000;
            filter.Q.value = 2;
            gain.gain.setValueAtTime(0.12, ctx.currentTime);
        } else {
            // default / dirt
            filter.frequency.value = 1500;
            filter.Q.value = 1;
            gain.gain.setValueAtTime(0.06, ctx.currentTime);
        }
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        src.connect(filter);
        filter.connect(gain);
        gain.connect(sfxGain);
        src.start(ctx.currentTime);
    }

    // Jump
    function playJump() {
        ensureContext();
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.connect(gain);
        gain.connect(sfxGain);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.2);
    }

    // Death / Game Over
    function playDeath() {
        ensureContext();
        // Low rumble + dissonant chord
        var osc1 = ctx.createOscillator();
        var osc2 = ctx.createOscillator();
        var gain = ctx.createGain();
        osc1.type = 'sawtooth';
        osc2.type = 'sawtooth';
        osc1.frequency.setValueAtTime(80, ctx.currentTime);
        osc2.frequency.setValueAtTime(83, ctx.currentTime);
        osc1.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 1.5);
        osc2.frequency.exponentialRampToValueAtTime(28, ctx.currentTime + 1.5);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(sfxGain);
        osc1.start(ctx.currentTime);
        osc2.start(ctx.currentTime);
        osc1.stop(ctx.currentTime + 1.5);
        osc2.stop(ctx.currentTime + 1.5);
    }

    // Jump scare sting
    function playJumpScare() {
        ensureContext();
        var buffer = createNoiseBuffer(0.4, 'white');
        var src = ctx.createBufferSource();
        src.buffer = buffer;
        var gain = ctx.createGain();
        gain.gain.setValueAtTime(0.5, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        var filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 2000;
        src.connect(filter);
        filter.connect(gain);
        gain.connect(sfxGain);
        src.start(ctx.currentTime);

        // Dissonant screech
        var osc = ctx.createOscillator();
        var g2 = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(1200, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.5);
        g2.gain.setValueAtTime(0.3, ctx.currentTime);
        g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
        osc.connect(g2);
        g2.connect(sfxGain);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.6);
    }

    // Win / Level complete
    function playWin() {
        ensureContext();
        var notes = [523, 659, 784, 1047];
        for (var i = 0; i < notes.length; i++) {
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(notes[i], ctx.currentTime + i * 0.15);
            gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.15);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.4);
            osc.connect(gain);
            gain.connect(sfxGain);
            osc.start(ctx.currentTime + i * 0.15);
            osc.stop(ctx.currentTime + i * 0.15 + 0.4);
        }
    }

    // Hit/stumble
    function playHit() {
        ensureContext();
        var buffer = createNoiseBuffer(0.15, 'brown');
        var src = ctx.createBufferSource();
        src.buffer = buffer;
        var gain = ctx.createGain();
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        src.connect(gain);
        gain.connect(sfxGain);
        src.start(ctx.currentTime);
    }

    // ============ AMBIENCE ============

    // Heartbeat — speeds up based on intensity (0-1)
    var heartbeatInterval = null;
    function startHeartbeat(bpm) {
        ensureContext();
        bpm = bpm || 70;
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        function beat() {
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(60, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
            osc.connect(gain);
            gain.connect(ambienceGain);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.15);

            // Second thump (diastolic)
            setTimeout(function () {
                var osc2 = ctx.createOscillator();
                var g2 = ctx.createGain();
                osc2.type = 'sine';
                osc2.frequency.setValueAtTime(50, ctx.currentTime);
                osc2.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + 0.08);
                g2.gain.setValueAtTime(0.12, ctx.currentTime);
                g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
                osc2.connect(g2);
                g2.connect(ambienceGain);
                osc2.start(ctx.currentTime);
                osc2.stop(ctx.currentTime + 0.1);
            }, 120);
        }
        beat();
        heartbeatInterval = setInterval(beat, 60000 / bpm);
    }

    function setHeartbeatBPM(bpm) {
        if (heartbeatInterval) { clearInterval(heartbeatInterval); startHeartbeat(bpm); }
    }

    function stopHeartbeat() {
        if (heartbeatInterval) { clearInterval(heartbeatInterval); heartbeatInterval = null; }
    }

    // Dark ambient drone
    function startDrone(baseFreq, type) {
        ensureContext();
        stopDrone();
        baseFreq = baseFreq || 55;
        type = type || 'dark';

        var drone = {};

        // Base oscillator
        var osc1 = ctx.createOscillator();
        osc1.type = 'sawtooth';
        osc1.frequency.value = baseFreq;

        // Detuned second oscillator for thickness
        var osc2 = ctx.createOscillator();
        osc2.type = 'sawtooth';
        osc2.frequency.value = baseFreq * 1.005;

        // Third — sub octave
        var osc3 = ctx.createOscillator();
        osc3.type = 'sine';
        osc3.frequency.value = baseFreq / 2;

        // LFO for pulsing
        var lfo = ctx.createOscillator();
        var lfoGain = ctx.createGain();
        lfo.frequency.value = 0.15;
        lfoGain.gain.value = 0.08;
        lfo.connect(lfoGain);

        // Filter
        var filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = type === 'underwater' ? 300 : type === 'wind' ? 600 : 200;
        filter.Q.value = 2;
        lfoGain.connect(filter.frequency);

        // Gain
        var gain = ctx.createGain();
        gain.gain.value = 0;
        gain.gain.setTargetAtTime(0.15, ctx.currentTime, 2);

        osc1.connect(filter);
        osc2.connect(filter);
        osc3.connect(filter);
        filter.connect(gain);
        gain.connect(ambienceGain);

        osc1.start();
        osc2.start();
        osc3.start();
        lfo.start();

        drone.oscs = [osc1, osc2, osc3, lfo];
        drone.gain = gain;
        currentAmbience = drone;
    }

    function stopDrone() {
        if (currentAmbience) {
            var drone = currentAmbience;
            if (drone.gain) drone.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.5);
            setTimeout(function () {
                if (drone.oscs) for (var i = 0; i < drone.oscs.length; i++) { try { drone.oscs[i].stop(); } catch (e) { } }
            }, 2000);
            currentAmbience = null;
        }
    }

    // Wind ambience (for Yeti Run, etc.)
    function startWind(intensity) {
        ensureContext();
        stopWind();
        intensity = intensity || 0.5;

        var buffer = createNoiseBuffer(4, 'pink');
        var src = ctx.createBufferSource();
        src.buffer = buffer;
        src.loop = true;

        var filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 400;
        filter.Q.value = 0.5;

        // LFO for wind gusts
        var lfo = ctx.createOscillator();
        var lfoGain = ctx.createGain();
        lfo.frequency.value = 0.3;
        lfoGain.gain.value = 300;
        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);

        var gain = ctx.createGain();
        gain.gain.value = intensity * 0.15;

        src.connect(filter);
        filter.connect(gain);
        gain.connect(ambienceGain);

        src.start();
        lfo.start();

        currentMusic = { src: src, lfo: lfo, gain: gain };
    }

    function stopWind() {
        if (currentMusic) {
            try { currentMusic.src.stop(); } catch (e) { }
            try { currentMusic.lfo.stop(); } catch (e) { }
            currentMusic = null;
        }
    }

    // Underwater ambience
    function startUnderwaterAmbience() {
        startDrone(40, 'underwater');
    }

    // ============ 3D AUDIO ============
    function updateListener(x, y, z, fx, fy, fz, ux, uy, uz) {
        ensureContext();
        if (ctx.listener.positionX) {
            var t = ctx.currentTime;
            ctx.listener.positionX.setTargetAtTime(x, t, 0.1);
            ctx.listener.positionY.setTargetAtTime(y, t, 0.1);
            ctx.listener.positionZ.setTargetAtTime(z, t, 0.1);
            ctx.listener.forwardX.setTargetAtTime(fx, t, 0.1);
            ctx.listener.forwardY.setTargetAtTime(fy, t, 0.1);
            ctx.listener.forwardZ.setTargetAtTime(fz, t, 0.1);
            ctx.listener.upX.setTargetAtTime(ux, t, 0.1);
            ctx.listener.upY.setTargetAtTime(uy, t, 0.1);
            ctx.listener.upZ.setTargetAtTime(uz, t, 0.1);
        } else {
            ctx.listener.setPosition(x, y, z);
            ctx.listener.setOrientation(fx, fy, fz, ux, uy, uz);
        }
    }

    function create3DSound(type) {
        ensureContext();
        var panner = ctx.createPanner();
        panner.panningModel = 'HRTF';
        panner.distanceModel = 'exponential';
        panner.refDistance = 2;
        panner.maxDistance = 25;
        panner.rolloffFactor = 1.5;
        panner.connect(sfxGain);

        var source = null, lfo = null, gain = null;
        var alive = true;

        if (type === 'monster_breath') {
            // heavy breathing / static hybrid
            var buffer = createNoiseBuffer(4, 'pink');
            source = ctx.createBufferSource();
            source.buffer = buffer;
            source.loop = true;

            var filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 500;

            lfo = ctx.createOscillator();
            lfo.frequency.value = 0.3; // breath speed

            gain = ctx.createGain();
            gain.gain.value = 0; // base

            // LFO modulation
            var lfoGain = ctx.createGain();
            lfoGain.gain.value = 0.8;

            lfo.connect(lfoGain);
            lfoGain.connect(gain.gain);

            // Bias gain up so it breathes 0.2 to 1.0
            var constant = ctx.createConstantSource ? ctx.createConstantSource() : ctx.createOscillator();
            if (ctx.createConstantSource) {
                 constant.offset.value = 0.4;
                 constant.connect(gain.gain);
                 constant.start();
            } else {
                // Fallback for no ConstantSource (rare now, but safe)
                gain.gain.value = 0.4;
            }

            source.connect(filter);
            filter.connect(gain);
            gain.connect(panner);

            source.start();
            lfo.start();

            // Store nodes for cleanup
            source.onended = function() { alive = false; };
        }

        return {
            setPosition: function(x, y, z) {
                if (!alive) return;
                if (panner.positionX) {
                    var t = ctx.currentTime;
                    panner.positionX.setTargetAtTime(x, t, 0.1);
                    panner.positionY.setTargetAtTime(y, t, 0.1);
                    panner.positionZ.setTargetAtTime(z, t, 0.1);
                } else {
                    panner.setPosition(x, y, z);
                }
            },
            stop: function() {
                alive = false;
                try { if (source) source.stop(); } catch(e){}
                try { if (lfo) lfo.stop(); } catch(e){}
                setTimeout(function(){ panner.disconnect(); }, 500);
            }
        };
    }

    // ============ STOP ALL ============
    function stopAll() {
        stopHeartbeat();
        stopDrone();
        stopWind();
        for (var i = 0; i < activeNodes.length; i++) {
            try { activeNodes[i].stop(); } catch (e) { }
        }
        activeNodes = [];
    }

    // ============ PUBLIC API ============
    return {
        init: init,

        // Volume
        setVolume: setVolume,
        getVolume: getVolume,
        setMusicVolume: setMusicVolume,
        setSfxVolume: setSfxVolume,

        // SFX
        playClick: playClick,
        playHover: playHover,
        playCollect: playCollect,
        playPowerup: playPowerup,
        playFootstep: playFootstep,
        playJump: playJump,
        playDeath: playDeath,
        playJumpScare: playJumpScare,
        playWin: playWin,
        playHit: playHit,

        // 3D Audio
        updateListener: updateListener,
        create3DSound: create3DSound,

        // Ambience
        startHeartbeat: startHeartbeat,
        setHeartbeatBPM: setHeartbeatBPM,
        stopHeartbeat: stopHeartbeat,
        startDrone: startDrone,
        stopDrone: stopDrone,
        startWind: startWind,
        stopWind: stopWind,
        startUnderwaterAmbience: startUnderwaterAmbience,

        // Control
        stopAll: stopAll,
    };
})();

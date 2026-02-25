/**
 * Procedural Audio Effects - Generated sounds and synthesized audio
 */

var ProceduralAudio = (function() {
    'use strict';

var context = null;
var enabled = true;

// PHASE 8: Enhanced procedural audio
var voiceSynth = {
  enabled: true,
  whisperIntensity: 0.5,
  chantSpeed: 0.3
};

var surfaceMaterials = {
  'tile': { freq: 800, decay: 30, noise: 0.3 },
  'water': { freq: 400, decay: 20, noise: 0.1, splash: true },
  'metal': { freq: 1200, decay: 40, noise: 0.5, resonance: true },
  'carpet': { freq: 300, decay: 50, noise: 0.2, dampened: true },
  'concrete': { freq: 600, decay: 35, noise: 0.4 },
  'grate': { freq: 1000, decay: 25, noise: 0.6, metallic: true }
};

var activeProceduralSounds = [];

    function init() {
        try {
            context = new (window.AudioContext || window.webkitAudioContext)();
            console.log('[ProceduralAudio] Initialized');
            return true;
        } catch (e) {
            console.error('[ProceduralAudio] Failed to initialize:', e);
            return false;
        }
    }

    function generateWhiteNoise(duration) {
        if (!context) return null;

        var sampleRate = context.sampleRate;
        var length = sampleRate * duration;
        var buffer = context.createBuffer(1, length, sampleRate);
        var data = buffer.getChannelData(0);

        for (var i = 0; i < length; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        return buffer;
    }

    function generateBrownNoise(duration) {
        if (!context) return null;

        var sampleRate = context.sampleRate;
        var length = sampleRate * duration;
        var buffer = context.createBuffer(1, length, sampleRate);
        var data = buffer.getChannelData(0);

        var lastOut = 0;
        for (var i = 0; i < length; i++) {
            var white = Math.random() * 2 - 1;
            data[i] = (lastOut + (0.02 * white)) / 1.02;
            lastOut = data[i];
            data[i] *= 3.5;
        }

        return buffer;
    }

    function playAmbientDrone(frequency, duration, volume) {
        if (!context || !enabled) return;

        var oscillator = context.createOscillator();
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency || 50;

        var gain = context.createGain();
        gain.gain.value = volume || 0.3;

        // Add some modulation
        var lfo = context.createOscillator();
        lfo.frequency.value = 0.2;
        var lfoGain = context.createGain();
        lfoGain.gain.value = 10;

        lfo.connect(lfoGain);
        lfoGain.connect(oscillator.frequency);

        oscillator.connect(gain);
        gain.connect(context.destination);

        oscillator.start();
        oscillator.stop(context.currentTime + (duration || 10));

        console.log('[ProceduralAudio] Playing ambient drone:', frequency, 'Hz');
    }

function generateFootstep(surface, velocity, weight) {
  if (!context || !enabled) return;

  // PHASE 8: Physical modeling for realistic footsteps
  var material = surfaceMaterials[surface] || surfaceMaterials['concrete'];
  var now = context.currentTime;
  var stepVelocity = velocity || 1.0;
  var playerWeight = weight || 1.0;

  console.log('[ProceduralAudio] Footstep on', surface);

  // Impact noise component
  var duration = 0.15;
  var noiseBuffer = generateWhiteNoise(duration);
  var noiseSrc = context.createBufferSource();
  noiseSrc.buffer = noiseBuffer;

  var noiseFilter = context.createBiquadFilter();
  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.value = material.freq;
  noiseFilter.Q.value = 1.5;

  var noiseGain = context.createGain();
  noiseGain.gain.value = 0;

  noiseSrc.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(context.destination);

  // Envelope based on material properties
  var attackTime = 0.01;
  var decayTime = material.decay / 100;

  noiseGain.gain.setValueAtTime(0, now);
  noiseGain.gain.linearRampToValueAtTime(0.5 * stepVelocity * playerWeight, now + attackTime);
  noiseGain.gain.exponentialRampToValueAtTime(0.01, now + decayTime);

  // Resonant body mode (for metal, tile, etc.)
  if (material.resonance || material.metallic) {
    var osc = context.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = material.freq * 0.5;

    var oscGain = context.createGain();
    oscGain.gain.value = 0;

    osc.connect(oscGain);
    oscGain.connect(context.destination);

    oscGain.gain.setValueAtTime(0, now);
    oscGain.gain.linearRampToValueAtTime(0.3 * stepVelocity, now + 0.02);
    oscGain.gain.exponentialRampToValueAtTime(0.01, now + decayTime * 1.5);

    osc.start(now);
    osc.stop(now + decayTime * 1.5);
  }

  // Splash sound for water
  if (material.splash) {
    var splashDuration = 0.3;
    var splashBuffer = generateBrownNoise(splashDuration);
    var splashSrc = context.createBufferSource();
    splashSrc.buffer = splashBuffer;

    var splashFilter = context.createBiquadFilter();
    splashFilter.type = 'lowpass';
    splashFilter.frequency.value = 800;

    var splashGain = context.createGain();
    splashGain.gain.setValueAtTime(0.2 * stepVelocity, now);
    splashGain.gain.exponentialRampToValueAtTime(0.01, now + splashDuration);

    splashSrc.connect(splashFilter);
    splashFilter.connect(splashGain);
    splashGain.connect(context.destination);

    splashSrc.start(now);
  }

  // Dampened sound for carpet
  if (material.dampened) {
    noiseFilter.frequency.value = material.freq * 0.6;
    noiseGain.gain.value = noiseGain.gain.value * 0.5;
  }

  noiseSrc.start(now);

  // Track active sound
  activeProceduralSounds.push({
    type: 'footstep',
    surface: surface,
    endTime: now + Math.max(duration, decayTime * 1.5)
  });
}

// PHASE 8: Enhanced footstep system with running variation
function generateFootstepSequence(surface, count, interval) {
  if (!context || !enabled) return;

  var now = context.currentTime;
  for (var i = 0; i < count; i++) {
    setTimeout(function() {
      var velocity = 0.8 + Math.random() * 0.4; // Natural variation
      var weight = 0.9 + Math.random() * 0.2;
      generateFootstep(surface, velocity, weight);
    }, i * interval * 1000);
  }
}

    function generateHeartbeat(bpm) {
        if (!context || !enabled) return;

        var interval = 60 / bpm;
        var now = context.currentTime;

        function playBeat() {
            if (!enabled) return;

            var oscillator = context.createOscillator();
            oscillator.frequency.value = 60;

            var gain = context.createGain();
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.8, now + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

            oscillator.connect(gain);
            gain.connect(context.destination);

            oscillator.start(now);
            oscillator.stop(now + 0.2);

            // Schedule next beat
            if (enabled) {
                setTimeout(playBeat, interval * 1000);
            }
        }

        playBeat();
        console.log('[ProceduralAudio] Heartbeat started at', bpm, 'BPM');
    }

function generateWhisper(text) {
  if (!context || !enabled || !voiceSynth.enabled) return;

  // PHASE 8: Enhanced voice synthesis with formant filtering
  var duration = 2 + Math.random();
  var buffer = generateBrownNoise(duration);

  if (!buffer) return;

  var source = context.createBufferSource();
  source.buffer = buffer;

  // Multi-band formant filter for more realistic whisper
  var filter1 = context.createBiquadFilter();
  filter1.type = 'bandpass';
  filter1.frequency.value = 800;
  filter1.Q.value = 2;

  var filter2 = context.createBiquadFilter();
  filter2.type = 'bandpass';
  filter2.frequency.value = 2500;
  filter2.Q.value = 1.5;

  var filter3 = context.createBiquadFilter();
  filter3.type = 'highpass';
  filter3.frequency.value = 3000;
  filter3.gain.value = 5;

  // Merge filters
  var merger = context.createChannelMerger(3);
  filter1.connect(merger, 0, 0);
  filter2.connect(merger, 0, 1);
  filter3.connect(merger, 0, 2);

  var gain = context.createGain();
  gain.gain.value = 0;

  // Create amplitude envelope for whisper patterns
  var now = context.currentTime;
  gain.gain.setValueAtTime(0, now);

  // Whisper pattern: soft-loud-soft
  var pattern = [0.05, 0.15, 0.08, 0.12, 0.03];
  var patternTime = 0;
  pattern.forEach(function(amp, i) {
    gain.gain.linearRampToValueAtTime(amp * voiceSynth.whisperIntensity, now + patternTime);
    patternTime += 0.3 + Math.random() * 0.2;
  });

  gain.gain.linearRampToValueAtTime(0, now + duration);

  // Add formant modulation for vowel-like sounds
  var formantLFO = context.createOscillator();
  formantLFO.frequency.value = 0.5 + Math.random() * 0.5;
  var formantGain = context.createGain();
  formantGain.gain.value = 500;
  formantLFO.connect(formantGain);
  formantGain.connect(filter1.frequency);
  formantGain.connect(filter2.frequency);

  source.connect(filter1);
  source.connect(filter2);
  source.connect(filter3);
  merger.connect(gain);
  gain.connect(context.destination);

  source.start(0);
  formantLFO.start(0);

  console.log('[ProceduralAudio] Enhanced whisper playing');
}

// PHASE 8: New voice synthesis functions
function generateChant(pitch, speed, intensity) {
  if (!context || !enabled || !voiceSynth.enabled) return;

  console.log('[ProceduralAudio] Generating chant');

  var now = context.currentTime;
  var baseFreq = pitch || 110; // A2
  var chantSpeed = speed || voiceSynth.chantSpeed;
  var chantIntensity = intensity || 0.3;

  // Create multiple voice layers for chorus effect
  var voices = [];
  var numVoices = 3 + Math.floor(Math.random() * 3);

  for (var v = 0; v < numVoices; v++) {
    var osc = context.createOscillator();
    osc.type = 'sawtooth';

    // Slight detuning for each voice
    var detune = (Math.random() - 0.5) * 20;
    osc.frequency.value = baseFreq * (1 + detune / 1000);

    var filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800 + Math.random() * 400;

    var gain = context.createGain();
    gain.gain.value = 0;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(context.destination);

    // Create rhythmic chanting pattern
    var patternLength = 4 + Math.floor(Math.random() * 4);
    for (var i = 0; i < patternLength; i++) {
      var noteTime = now + i * chantSpeed;
      var noteDuration = chantSpeed * 0.7;

      gain.gain.setValueAtTime(0, noteTime);
      gain.gain.linearRampToValueAtTime(chantIntensity / numVoices, noteTime + 0.05);
      gain.gain.setValueAtTime(chantIntensity / numVoices, noteTime + noteDuration - 0.05);
      gain.gain.linearRampToValueAtTime(0, noteTime + noteDuration);

      // Vary pitch slightly for each note
      var pitchVariation = Math.random() > 0.5 ? 1.0 : 1.5;
      osc.frequency.setValueAtTime(baseFreq * pitchVariation, noteTime);
    }

    osc.start(now);
    osc.stop(now + patternLength * chantSpeed + 1);

    voices.push({ osc: osc, gain: gain });
  }

  activeProceduralSounds.push({ type: 'chant', voices: voices, endTime: now + patternLength * chantSpeed + 1 });
}

function generateMoan(pitch, duration, intensity) {
  if (!context || !enabled) return;

  console.log('[ProceduralAudio] Generating moan');

  var now = context.currentTime;
  var baseFreq = pitch || 80;
  var moanDuration = duration || 3;
  var moanIntensity = intensity || 0.4;

  var osc1 = context.createOscillator();
  var osc2 = context.createOscillator();

  osc1.type = 'sawtooth';
  osc2.type = 'sawtooth';

  // Slight detuning for eerie effect
  osc1.frequency.value = baseFreq;
  osc2.frequency.value = baseFreq * 1.01;

  var filter = context.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 400;

  var gain = context.createGain();
  gain.gain.value = 0;

  // Create moan envelope (slow attack, long decay)
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(moanIntensity * 0.3, now + 0.5);
  gain.gain.linearRampToValueAtTime(moanIntensity, now + 1.5);
  gain.gain.linearRampToValueAtTime(moanIntensity * 0.5, now + moanDuration - 1);
  gain.gain.linearRampToValueAtTime(0, now + moanDuration);

  // Pitch bend for moan effect
  osc1.frequency.linearRampToValueAtTime(baseFreq * 0.95, now + moanDuration);
  osc2.frequency.linearRampToValueAtTime(baseFreq * 0.96, now + moanDuration);

  osc1.connect(filter);
  osc2.connect(filter);
  filter.connect(gain);
  gain.connect(context.destination);

  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + moanDuration);
  osc2.stop(now + moanDuration);
}

function generateScream(intensity, duration) {
  if (!context || !enabled) return;

  console.log('[ProceduralAudio] Generating scream');

  var now = context.currentTime;
  var screamIntensity = intensity || 0.8;
  var screamDuration = duration || 1.5;

  // Noise component
  var noiseBuffer = generateWhiteNoise(screamDuration);
  var noiseSrc = context.createBufferSource();
  noiseSrc.buffer = noiseBuffer;

  var noiseFilter = context.createBiquadFilter();
  noiseFilter.type = 'highpass';
  noiseFilter.frequency.value = 2000;

  var noiseGain = context.createGain();
  noiseGain.gain.value = 0;

  noiseSrc.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(context.destination);

  // Oscillator component
  var osc = context.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.value = 800;

  var oscGain = context.createGain();
  oscGain.gain.value = 0;

  osc.connect(oscGain);
  oscGain.connect(context.destination);

  // Envelope for scream
  noiseGain.gain.setValueAtTime(0, now);
  noiseGain.gain.linearRampToValueAtTime(screamIntensity, now + 0.1);
  noiseGain.gain.exponentialRampToValueAtTime(0.01, now + screamDuration);

  oscGain.gain.setValueAtTime(0, now);
  oscGain.gain.linearRampToValueAtTime(screamIntensity * 0.5, now + 0.1);
  oscGain.gain.exponentialRampToValueAtTime(0.01, now + screamDuration);

  // Frequency modulation for scream
  osc.frequency.linearRampToValueAtTime(1200, now + screamDuration * 0.5);
  osc.frequency.linearRampToValueAtTime(600, now + screamDuration);

  noiseSrc.start(now);
  osc.start(now);
  osc.stop(now + screamDuration);
}

    function generateCreak() {
        if (!context || !enabled) return;

        var duration = 1.5;
        var buffer = context.createBuffer(1, context.sampleRate * duration, context.sampleRate);
        var data = buffer.getChannelData(0);

        for (var i = 0; i < data.length; i++) {
            var t = i / data.length;
            var envelope = Math.sin(Math.PI * t);

            // Combine multiple frequencies for creaking sound
            var sample = 0;
            sample += Math.sin(t * 200 + Math.sin(t * 5) * 10) * 0.3;
            sample += Math.sin(t * 150 + Math.cos(t * 3) * 8) * 0.2;
            sample += (Math.random() * 2 - 1) * 0.1;

            data[i] = sample * envelope;
        }

        var source = context.createBufferSource();
        source.buffer = buffer;

        var gain = context.createGain();
        gain.gain.value = 0.4;

        source.connect(gain);
        gain.connect(context.destination);

        source.start(0);
    }

    function generateMetalScrape() {
        if (!context || !enabled) return;

        var duration = 1;
        var buffer = context.createBuffer(1, context.sampleRate * duration, context.sampleRate);
        var data = buffer.getChannelData(0);

        for (var i = 0; i < data.length; i++) {
            var t = i / data.length;
            var freq = 800 + Math.sin(t * 20) * 400;
            data[i] = Math.sin(t * freq) * Math.exp(-t * 2) * 0.3;
        }

        var source = context.createBufferSource();
        source.buffer = buffer;

        var filter = context.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 1000;

        var gain = context.createGain();
        gain.gain.value = 0.5;

        source.connect(filter);
        filter.connect(gain);
        gain.connect(context.destination);

        source.start(0);
    }

function generateDrip() {
  if (!context || !enabled) return;

  var duration = 0.3;
  var buffer = context.createBuffer(1, context.sampleRate * duration, context.sampleRate);
  var data = buffer.getChannelData(0);

  for (var i = 0; i < data.length; i++) {
    var t = i / data.length;
    var freq = 1200 - t * 800;
    data[i] = Math.sin(t * Math.PI * freq) * Math.exp(-t * 10) * 0.4;
  }

  var source = context.createBufferSource();
  source.buffer = buffer;

  var gain = context.createGain();
  gain.gain.value = 0.3;

  source.connect(gain);
  gain.connect(context.destination);

  source.start(0);
}

// PHASE 8: Additional environmental sounds
function generateTileCrack() {
  if (!context || !enabled) return;

  console.log('[ProceduralAudio] Tile cracking');

  var duration = 0.4;
  var buffer = generateWhiteNoise(duration);

  var source = context.createBufferSource();
  source.buffer = buffer;

  var filter = context.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 3000;

  var gain = context.createGain();
  gain.gain.setValueAtTime(0, context.currentTime);
  gain.gain.linearRampToValueAtTime(0.4, context.currentTime + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + duration);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(context.destination);

  source.start(context.currentTime);
}

function generatePaperRustle() {
  if (!context || !enabled) return;

  console.log('[ProceduralAudio] Paper rustling');

  var duration = 1.5;
  var buffer = generateBrownNoise(duration);

  var source = context.createBufferSource();
  source.buffer = buffer;

  var filter = context.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 2000;
  filter.Q.value = 0.5;

  var gain = context.createGain();
  gain.gain.value = 0;

  // Create rustling pattern
  var now = context.currentTime;
  for (var i = 0; i < 5; i++) {
    gain.gain.setValueAtTime(0, now + i * 0.3);
    gain.gain.linearRampToValueAtTime(0.15, now + i * 0.3 + 0.1);
    gain.gain.linearRampToValueAtTime(0, now + i * 0.3 + 0.25);
  }

  source.connect(filter);
  filter.connect(gain);
  gain.connect(context.destination);

  source.start(now);
}

function generateGlassBreak() {
  if (!context || !enabled) return;

  console.log('[ProceduralAudio] Glass breaking');

  var duration = 0.8;
  var buffer = generateWhiteNoise(duration);

  var source = context.createBufferSource();
  source.buffer = buffer;

  var filter = context.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 4000;
  filter.Q.value = 2;

  var gain = context.createGain();
  gain.gain.setValueAtTime(0, context.currentTime);
  gain.gain.linearRampToValueAtTime(0.6, context.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + duration);

  // Add resonant frequencies
  var osc = context.createOscillator();
  osc.type = 'triangle';
  osc.frequency.value = 6000;

  var oscGain = context.createGain();
  oscGain.gain.setValueAtTime(0.2, context.currentTime);
  oscGain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.3);

  osc.connect(oscGain);
  oscGain.connect(context.destination);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(context.destination);

  source.start(context.currentTime);
  osc.start(context.currentTime);
  osc.stop(context.currentTime + 0.3);
}

function generateWind(intensity) {
  if (!context || !enabled) return;

  console.log('[ProceduralAudio] Wind:', intensity);

  var duration = 10;
  var buffer = generateBrownNoise(duration);

  var source = context.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  var filter = context.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 400 + intensity * 200;
  filter.Q.value = 0.5;

  var gain = context.createGain();
  gain.gain.value = 0.1 * intensity;

  // Modulate wind intensity
  var lfo = context.createOscillator();
  lfo.frequency.value = 0.2;
  var lfoGain = context.createGain();
  lfoGain.gain.value = 0.05 * intensity;
  lfo.connect(lfoGain);
  lfoGain.connect(gain.gain);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(context.destination);

  source.start(context.currentTime);
  lfo.start(context.currentTime);

  activeProceduralSounds.push({
    type: 'wind',
    source: source,
    lfo: lfo,
    gain: gain,
    endTime: context.currentTime + duration
  });
}

function stopAllProceduralSounds() {
  activeProceduralSounds.forEach(function(sound) {
    try {
      if (sound.source && sound.source.stop) sound.source.stop();
      if (sound.lfo && sound.lfo.stop) sound.lfo.stop();
    } catch (e) {}
  });
  activeProceduralSounds = [];
}

    function setEnabled(value) {
        enabled = value;
    }

    function cleanup() {
        if (context) {
            context.close();
        }
        context = null;
    }

return {
  init: init,
  generateWhiteNoise: generateWhiteNoise,
  generateBrownNoise: generateBrownNoise,
  playAmbientDrone: playAmbientDrone,
  generateFootstep: generateFootstep,
  generateFootstepSequence: generateFootstepSequence,
  generateHeartbeat: generateHeartbeat,
  generateWhisper: generateWhisper,
  generateChant: generateChant,
  generateMoan: generateMoan,
  generateScream: generateScream,
  generateCreak: generateCreak,
  generateMetalScrape: generateMetalScrape,
  generateDrip: generateDrip,
  generateTileCrack: generateTileCrack,
  generatePaperRustle: generatePaperRustle,
  generateGlassBreak: generateGlassBreak,
  generateWind: generateWind,
  stopAllProceduralSounds: stopAllProceduralSounds,
  setEnabled: setEnabled,
  cleanup: cleanup,
  // PHASE 8: Configuration
  setVoiceSynth: function(config) { Object.assign(voiceSynth, config); },
  setSurfaceMaterial: function(surface, props) { surfaceMaterials[surface] = Object.assign(surfaceMaterials[surface] || {}, props); }
};
})();

if (typeof window !== 'undefined') {
    window.ProceduralAudio = ProceduralAudio;
}

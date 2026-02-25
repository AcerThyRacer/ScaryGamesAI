/**
 * Dynamic Soundtrack - Adaptive music that responds to gameplay
 */

var DynamicSoundtrack = (function() {
    'use strict';

var config = {
  layers: ['ambient', 'tension', 'action', 'horror'],
  crossfadeDuration: 2,
  baseVolume: 0.6,
  maxLayers: 3,
  // PHASE 8: Enhanced features
  leitmotifsEnabled: true,
  silenceEnabled: true,
  adaptiveMusic: true,
  minSilenceDuration: 3,
  maxSilenceDuration: 8,
  silenceChance: 0.15,
  leitmotifVariations: ['pacman_chase', 'sanity_drop', 'blackout', 'powerup', 'discovery']
};

var state = {
  currentIntensity: 0,
  targetIntensity: 0,
  activeLayers: [],
  context: null,
  buffers: {},
  gainNodes: {},
  // PHASE 8: New state
  leitmotifs: {},
  activeLeitmotif: null,
  silenceTimer: 0,
  inSilence: false,
  silenceDuration: 0,
  lastIntensityChange: 0,
  pacmanThemeActive: false,
  sanityThemeActive: false,
  blackoutThemeActive: false
};

    var intensityLevels = {
        0: { name: 'calm', layers: ['ambient'], volume: 0.4 },
        1: { name: 'uneasy', layers: ['ambient', 'tension'], volume: 0.5 },
        2: { name: 'tense', layers: ['ambient', 'tension'], volume: 0.6 },
        3: { name: 'danger', layers: ['ambient', 'tension', 'action'], volume: 0.7 },
        4: { name: 'terror', layers: ['ambient', 'tension', 'action', 'horror'], volume: 0.8 }
    };

function init() {
  try {
    state.context = new (window.AudioContext || window.webkitAudioContext)();
    initializeLeitmotifs();
    console.log('[DynamicSoundtrack] Initialized with Phase 8 enhancements');
    return true;
  } catch (e) {
    console.error('[DynamicSoundtrack] Failed to initialize:', e);
    return false;
  }
}

// PHASE 8: Leitmotif System - Character-specific musical themes
function initializeLeitmotifs() {
  // Pac-Man chase theme (aggressive, rhythmic)
  state.leitmotifs['pacman_chase'] = {
    name: 'Pac-Man Chase',
    baseFreq: 110,
    tempo: 140,
    intervals: [0, 7, 12, 7], // Semitones
    rhythm: [0.25, 0.25, 0.5, 0.5],
    oscillator: 'sawtooth',
    trigger: 'pacman_proximity'
  };

  // Sanity drop theme (dissonant, unsettling)
  state.leitmotifs['sanity_drop'] = {
    name: 'Sanity Loss',
    baseFreq: 65,
    tempo: 60,
    intervals: [0, 1, 6, 5], // Dissonant intervals
    rhythm: [1, 1, 2, 2],
    oscillator: 'sine',
    trigger: 'sanity_critical'
  };

  // Blackout theme (tense, minimal)
  state.leitmotifs['blackout'] = {
    name: 'Blackout',
    baseFreq: 49,
    tempo: 80,
    intervals: [0, 12],
    rhythm: [2, 2],
    oscillator: 'triangle',
    trigger: 'blackout_active'
  };

  // Power-up theme (heroic, ascending)
  state.leitmotifs['powerup'] = {
    name: 'Power-Up',
    baseFreq: 131,
    tempo: 120,
    intervals: [0, 4, 7, 12],
    rhythm: [0.5, 0.5, 0.5, 1],
    oscillator: 'square',
    trigger: 'powerup_active'
  };

  // Discovery theme (mysterious, exploratory)
  state.leitmotifs['discovery'] = {
    name: 'Discovery',
    baseFreq: 98,
    tempo: 90,
    intervals: [0, 5, 7, 10],
    rhythm: [1, 0.5, 0.5, 2],
    oscillator: 'sine',
    trigger: 'secret_found'
  };
}

function playLeitmotif(leitmotifName, options) {
  if (!config.leitmotifsEnabled || !state.context) return;

  var leitmotif = state.leitmotifs[leitmotifName];
  if (!leitmotif) return;

  console.log('[DynamicSoundtrack] Playing leitmotif:', leitmotifName);

  var now = state.context.currentTime;
  var time = now;
  var baseFreq = leitmotif.baseFreq;

  // Create leitmotif oscillator
  var osc = state.context.createOscillator();
  osc.type = leitmotif.oscillator;

  var gain = state.context.createGain();
  gain.gain.value = 0;

  osc.connect(gain);
  gain.connect(state.context.destination);

  // Play the motif
  leitmotif.intervals.forEach(function(interval, index) {
    var freq = baseFreq * Math.pow(2, interval / 12);
    var duration = leitmotif.rhythm[index] || 0.5;

    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.2, time + 0.05);
    gain.gain.setValueAtTime(0.2, time + duration - 0.05);
    gain.gain.linearRampToValueAtTime(0, time + duration);

    osc.frequency.setValueAtTime(freq, time);

    time += duration;
  });

  osc.start(now);
  osc.stop(time);

  state.activeLeitmotif = leitmotifName;

  // Clear active leitmotif after playback
  setTimeout(function() {
    state.activeLeitmotif = null;
  }, (time - now) * 1000);
}

    function loadLayer(layerName, audioBuffer) {
        if (!state.context) return false;

        state.buffers[layerName] = audioBuffer;

        var gain = state.context.createGain();
        gain.gain.value = 0;
        gain.connect(state.context.destination);
        state.gainNodes[layerName] = gain;

        console.log('[DynamicSoundtrack] Loaded layer:', layerName);
        return true;
    }

    function playLayer(layerName, loop) {
        if (!state.buffers[layerName] || !state.gainNodes[layerName]) return false;

        var source = state.context.createBufferSource();
        source.buffer = state.buffers[layerName];
        source.loop = loop !== false;
        source.connect(state.gainNodes[layerName]);
        source.start(0);

        console.log('[DynamicSoundtrack] Playing layer:', layerName);
        return true;
    }

function updateIntensity(newIntensity, deltaTime, gameContext) {
  // PHASE 8: Check for silence periods
  if (config.silenceEnabled && !state.inSilence) {
    state.silenceTimer += deltaTime;

    // Random chance to enter silence after period of low intensity
    if (newIntensity < 1.5 && state.silenceTimer > config.minSilenceDuration) {
      if (Math.random() < config.silenceChance * deltaTime) {
        enterSilence();
      }
    }
  }

  // If in silence, don't update music layers
  if (state.inSilence) {
    state.silenceTimer -= deltaTime;
    if (state.silenceTimer <= 0) {
      exitSilence();
    }
    return;
  }

  state.targetIntensity = Math.max(0, Math.min(4, newIntensity));

  // Smooth transition
  var delta = state.targetIntensity - state.currentIntensity;
  state.currentIntensity += delta * deltaTime * 0.5;

  // Track intensity changes for silence triggering
  if (Math.abs(delta) > 0.5) {
    state.lastIntensityChange = Date.now();
  }

  var level = Math.round(state.currentIntensity);
  var levelData = intensityLevels[level];

  if (!levelData) return;

  // Update active layers
  updateLayers(levelData.layers, levelData.volume);

  // PHASE 8: Check for leitmotif triggers
  if (config.leitmotifsEnabled && gameContext) {
    checkLeitmotifTriggers(gameContext);
  }
}

// PHASE 8: Silence as a horror tool
function enterSilence() {
  console.log('[DynamicSoundtrack] Entering silence...');
  state.inSilence = true;
  state.silenceDuration = config.minSilenceDuration + Math.random() * (config.maxSilenceDuration - config.minSilenceDuration);
  state.silenceTimer = state.silenceDuration;

  // Fade out all layers
  state.activeLayers.forEach(function(layer) {
    var gain = state.gainNodes[layer];
    if (gain) {
      gain.gain.setTargetAtTime(0, state.context.currentTime, 2);
    }
  });

  // Trigger subtitle for accessibility
  if (window.HorrorAudioEnhanced) {
    HorrorAudioEnhanced.showSubtitle('silence', {
      text: '...',
      duration: 2000
    });
  }
}

function exitSilence() {
  console.log('[DynamicSoundtrack] Exiting silence');
  state.inSilence = false;
  state.silenceTimer = 0;

  // Restore layers at current intensity
  var level = Math.round(state.currentIntensity);
  var levelData = intensityLevels[level];
  if (levelData) {
    updateLayers(levelData.layers, levelData.volume);
  }
}

    function updateLayers(activeLayerNames, targetVolume) {
        // Fade out inactive layers
        config.layers.forEach(function(layer) {
            var gain = state.gainNodes[layer];
            if (!gain) return;

            if (activeLayerNames.includes(layer)) {
                // Fade in
                gain.gain.setTargetAtTime(targetVolume / activeLayerNames.length, state.context.currentTime, config.crossfadeDuration);

                if (!state.activeLayers.includes(layer)) {
                    playLayer(layer, true);
                    state.activeLayers.push(layer);
                }
            } else {
                // Fade out
                gain.gain.setTargetAtTime(0, state.context.currentTime, config.crossfadeDuration);

                var index = state.activeLayers.indexOf(layer);
                if (index !== -1) {
                    state.activeLayers.splice(index, 1);
                }
            }
        });
    }

function setIntensityParameter(param, value) {
  switch (param) {
    case 'pacman_proximity':
      if (value < 5) state.targetIntensity = Math.max(state.targetIntensity, 3);
      else if (value < 10) state.targetIntensity = Math.max(state.targetIntensity, 2);
      // PHASE 8: Trigger Pac-Man leitmotif
      if (value < 5 && !state.pacmanThemeActive && config.leitmotifsEnabled) {
        playLeitmotif('pacman_chase');
        state.pacmanThemeActive = true;
      } else if (value >= 8) {
        state.pacmanThemeActive = false;
      }
      break;

    case 'sanity':
      if (value < 25) state.targetIntensity = Math.max(state.targetIntensity, 3);
      else if (value < 50) state.targetIntensity = Math.max(state.targetIntensity, 2);
      // PHASE 8: Trigger sanity leitmotif on critical sanity
      if (value < 20 && !state.sanityThemeActive && config.leitmotifsEnabled) {
        playLeitmotif('sanity_drop');
        state.sanityThemeActive = true;
      } else if (value >= 40) {
        state.sanityThemeActive = false;
      }
      break;

    case 'blackout':
      if (value) state.targetIntensity = Math.max(state.targetIntensity, 2);
      // PHASE 8: Trigger blackout leitmotif
      if (value && !state.blackoutThemeActive && config.leitmotifsEnabled) {
        playLeitmotif('blackout');
        state.blackoutThemeActive = true;
      } else if (!value) {
        state.blackoutThemeActive = false;
      }
      break;

    case 'enemies_nearby':
      state.targetIntensity = Math.max(state.targetIntensity, Math.min(4, value));
      break;

    // PHASE 8: New parameters
    case 'powerup':
      if (value && config.leitmotifsEnabled) {
        playLeitmotif('powerup');
      }
      break;

    case 'discovery':
      if (value && config.leitmotifsEnabled) {
        playLeitmotif('discovery');
      }
      break;

    case 'force_silence':
      if (value && config.silenceEnabled && !state.inSilence) {
        enterSilence();
      }
      break;
  }
}

// PHASE 8: Check for leitmotif triggers based on game context
function checkLeitmotifTriggers(gameContext) {
  if (!config.leitmotifsEnabled) return;

  // Prevent too frequent leitmotif triggers
  var now = Date.now();
  if (now - state.lastIntensityChange < 5000) return;

  // Check for discovery (secret rooms, items)
  if (gameContext.discoveredSecret && !state.discoveryCooldown) {
    playLeitmotif('discovery');
    state.discoveryCooldown = true;
    setTimeout(function() { state.discoveryCooldown = false; }, 10000);
  }
}

    function triggerStinger(stingerType) {
        console.log('[DynamicSoundtrack] Triggering stinger:', stingerType);

        var stingerBuffer = state.buffers['stinger_' + stingerType];
        if (!stingerBuffer || !state.context) return;

        var source = state.context.createBufferSource();
        source.buffer = stingerBuffer;

        var gain = state.context.createGain();
        gain.gain.value = 0.8;
        gain.connect(state.context.destination);

        source.connect(gain);
        source.start(0);
    }

    function setVolume(volume) {
        config.baseVolume = volume;
        config.layers.forEach(function(layer) {
            var gain = state.gainNodes[layer];
            if (gain && state.activeLayers.includes(layer)) {
                gain.gain.setTargetAtTime(volume, state.context.currentTime, 0.5);
            }
        });
    }

    function pause() {
        if (state.context && state.context.state === 'running') {
            state.context.suspend();
        }
    }

    function resume() {
        if (state.context && state.context.state === 'suspended') {
            state.context.resume();
        }
    }

    function stopAll() {
        config.layers.forEach(function(layer) {
            var gain = state.gainNodes[layer];
            if (gain) {
                gain.gain.setTargetAtTime(0, state.context.currentTime, 0.5);
            }
        });
        state.activeLayers = [];
    }

    function getCurrentIntensity() {
        return state.currentIntensity;
    }

    function getActiveLayers() {
        return state.activeLayers;
    }

    function cleanup() {
        stopAll();
        if (state.context) {
            state.context.close();
        }
        state.buffers = {};
        state.gainNodes = {};
        state.context = null;
    }

    return {
        init: init,
        loadLayer: loadLayer,
        playLayer: playLayer,
        updateIntensity: updateIntensity,
        setIntensityParameter: setIntensityParameter,
        triggerStinger: triggerStinger,
        setVolume: setVolume,
        pause: pause,
        resume: resume,
        stopAll: stopAll,
        getCurrentIntensity: getCurrentIntensity,
        getActiveLayers: getActiveLayers,
        cleanup: cleanup
    };
})();

if (typeof window !== 'undefined') {
    window.DynamicSoundtrack = DynamicSoundtrack;
}

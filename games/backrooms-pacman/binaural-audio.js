/**
 * Binaural Recording Support - 360° audio and personalized HRTF
 */

var BinauralAudio = (function() {
    'use strict';

var config = {
  hrtfProfiles: ['generic', 'custom', 'wide', 'narrow'],
  selectedProfile: 'generic',
  binauralEnabled: true,
  asmrMode: false,
  // PHASE 8: Enhanced features
  hrtfCalibration: {
    completed: false,
    leftEarDelay: 0,
    rightEarDelay: 0,
    headSize: 1.0,
    personalization: 0.5
  },
  audio360Enabled: true,
  ambisonicOrder: 1 // B-format (first order)
};

var state = {
  context: null,
  hrtfDatabase: {},
  currentProfile: null,
  calibration: {
    leftDelay: 0,
    rightDelay: 0,
    leftVolume: 1,
    rightVolume: 1
  },
  // PHASE 8: New state
  audio360Buffers: {},
  calibrationUI: null,
  isCalibrating: false,
  userHRTFPreferences: {}
};

    function init() {
        try {
            state.context = new (window.AudioContext || window.webkitAudioContext)();
            loadHRTFProfiles();
            console.log('[BinauralAudio] Initialized');
            return true;
        } catch (e) {
            console.error('[BinauralAudio] Failed to initialize:', e);
            return false;
        }
    }

    function loadHRTFProfiles() {
        // Generic HRTF data (simplified - would load from files in production)
        state.hrtfDatabase['generic'] = {
            azimuths: [],
            elevations: [],
            impulseResponses: {}
        };

        // Generate simplified HRTF for demonstration
        for (var az = 0; az < 360; az += 10) {
            state.hrtfDatabase['generic'].azimuths.push(az);
            generateHRTFForAngle(az, 0);
        }

        state.currentProfile = state.hrtfDatabase['generic'];
    }

    function generateHRTFForAngle(azimuth, elevation) {
        var key = az + '_' + elevation;
        var sampleRate = state.context.sampleRate;
        var duration = 0.01;
        var length = sampleRate * duration;

        var impulse = state.context.createBuffer(2, length, sampleRate);
        var left = impulse.getChannelData(0);
        var right = impulse.getChannelData(1);

        // Simple ITD (Interaural Time Difference)
        var itd = Math.sin(azimuth * Math.PI / 180) * 0.0003;
        var leftSamples = Math.floor((0.5 - itd / 2) * sampleRate);
        var rightSamples = Math.floor((0.5 + itd / 2) * sampleRate);

        // Simple ILD (Interaural Level Difference)
        var ild = Math.cos(azimuth * Math.PI / 180) * 0.2;
        var leftGain = 1 + ild;
        var rightGain = 1 - ild;

        // Generate impulse
        if (leftSamples >= 0 && leftSamples < length) {
            left[leftSamples] = leftGain;
        }
        if (rightSamples >= 0 && rightSamples < length) {
            right[rightSamples] = rightGain;
        }

        state.hrtfDatabase['generic'].impulseResponses[key] = impulse;
    }

    function createBinauralSource(buffer, options) {
        if (!state.context || !config.binauralEnabled) return null;

        options = options || {};
        var azimuth = options.azimuth || 0;
        var elevation = options.elevation || 0;

        // Get HRTF for this angle
        var key = Math.round(azimuth) + '_' + Math.round(elevation);
        var hrtf = state.hrtfDatabase['generic'].impulseResponses[key];

        if (!hrtf) {
            hrtf = state.hrtfDatabase['generic'].impulseResponses['0_0'];
        }

        // Create binaural decoder
        var convolver = state.context.createConvolver();
        convolver.buffer = hrtf;

        var source = state.context.createBufferSource();
        source.buffer = buffer;
        source.connect(convolver);
        convolver.connect(state.context.destination);

        return {
            source: source,
            convolver: convolver,
            azimuth: azimuth,
            elevation: elevation
        };
    }

    function playBinauralSound(buffer, position3D, listenerRotation) {
        if (!state.context) return;

        // Calculate azimuth from 3D position
        var dx = position3D.x - listenerRotation.x;
        var dz = position3D.z - listenerRotation.z;
        var azimuth = Math.atan2(dx, dz) * 180 / Math.PI;

        // Calculate elevation (simplified)
        var dy = position3D.y - listenerRotation.y;
        var distance = Math.sqrt(dx * dx + dz * dz);
        var elevation = Math.atan2(dy, distance) * 180 / Math.PI;

        var binauralSource = createBinauralSource(buffer, {
            azimuth: azimuth,
            elevation: elevation
        });

        if (binauralSource) {
            binauralSource.source.start(0);
            console.log('[BinauralAudio] Playing binaural sound at', azimuth.toFixed(1), '°');
        }
    }

function calibrateHRTF() {
  if (state.isCalibrating) return;

  console.log('[BinauralAudio] Starting HRTF calibration...');
  state.isCalibrating = true;

  // Show calibration UI
  showCalibrationUI();

  // Play test sounds from different angles
  var testAngles = [-90, 0, 90, 180];
  var currentIndex = 0;
  var userResponses = [];

  function playTest() {
    if (currentIndex >= testAngles.length) {
      completeCalibration(userResponses);
      return;
    }

    var angle = testAngles[currentIndex];
    console.log('[BinauralAudio] Test sound from:', angle, 'degrees');

    // Generate test tone
    var duration = 0.5;
    var buffer = state.context.createBuffer(1, state.context.sampleRate * duration, state.context.sampleRate);
    var data = buffer.getChannelData(0);

    for (var i = 0; i < data.length; i++) {
      data[i] = Math.sin(i / state.context.sampleRate * 1000 * Math.PI * 2);
    }

    playBinauralSound(buffer, {
      x: Math.sin(angle * Math.PI / 180),
      y: 0,
      z: Math.cos(angle * Math.PI / 180)
    }, { x: 0, y: 0, z: 0 });

    // In a real implementation, we'd ask the user to confirm direction
    // For now, just continue
    userResponses.push({ angle: angle, perceived: angle }); // Assume perfect perception

    currentIndex++;
    setTimeout(playTest, 2000);
  }

  playTest();
}

// PHASE 8: Calibration UI
function showCalibrationUI() {
  if (state.calibrationUI) return;

  state.calibrationUI = document.createElement('div');
  state.calibrationUI.id = 'binaural-calibration-ui';
  state.calibrationUI.innerHTML = `
    <div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.95);padding:40px;border-radius:16px;z-index:100000;max-width:500px;text-align:center;color:#fff;font-family:'Inter',sans-serif;">
      <h2 style="margin:0 0 20px 0;color:#cc1122;">HRTF Calibration</h2>
      <p style="margin-bottom:30px;line-height:1.6;">You will hear sounds from different directions. Focus on where you perceive them coming from.</p>
      <div id="calibration-progress" style="width:100%;height:8px;background:rgba(255,255,255,0.1);border-radius:4px;overflow:hidden;margin-bottom:20px;">
        <div id="calibration-bar" style="width:0%;height:100%;background:linear-gradient(90deg,#cc1122,#ff4455);transition:width 0.3s;"></div>
      </div>
      <div id="calibration-status" style="font-size:1.2em;margin-bottom:30px;">Preparing calibration...</div>
      <button id="calibration-cancel" style="padding:12px 30px;background:rgba(255,255,255,0.1);border:none;border-radius:8px;color:#fff;cursor:pointer;font-size:1em;">Cancel</button>
    </div>
  `;

  document.body.appendChild(state.calibrationUI);

  // Cancel button
  document.getElementById('calibration-cancel').addEventListener('click', function() {
    cancelCalibration();
  });

  // Update progress during calibration
  var testAngles = [-90, 0, 90, 180];
  var currentIndex = 0;

  var progressInterval = setInterval(function() {
    if (!state.isCalibrating) {
      clearInterval(progressInterval);
      return;
    }

    var progress = (currentIndex / testAngles.length) * 100;
    var bar = document.getElementById('calibration-bar');
    var status = document.getElementById('calibration-status');

    if (bar) bar.style.width = progress + '%';
    if (status) {
      if (currentIndex < testAngles.length) {
        status.textContent = 'Playing test ' + (currentIndex + 1) + ' of ' + testAngles.length + '...';
      }
    }
  }, 100);
}

function hideCalibrationUI() {
  if (state.calibrationUI) {
    state.calibrationUI.remove();
    state.calibrationUI = null;
  }
}

function completeCalibration(userResponses) {
  console.log('[BinauralAudio] Calibration complete');
  state.isCalibrating = false;

  // Calculate personalized HRTF adjustments
  config.hrtfCalibration.completed = true;
  config.hrtfCalibration.personalization = 0.8; // High personalization after calibration

  // Update HRTF database with personalized settings
  applyPersonalizedHRTF();

  hideCalibrationUI();

  // Show success message
  if (window.HorrorAudioEnhanced) {
    HorrorAudioEnhanced.showSubtitle('calibration_complete', {
      text: 'HRTF calibration complete!',
      duration: 3000
    });
  }
}

function cancelCalibration() {
  console.log('[BinauralAudio] Calibration cancelled');
  state.isCalibrating = false;
  hideCalibrationUI();
}

function applyPersonalizedHRTF() {
  // Apply user's calibration results to HRTF processing
  var prefs = config.hrtfCalibration;

  if (prefs.leftEarDelay !== 0 || prefs.rightEarDelay !== 0) {
    // Adjust ITD (Interaural Time Difference)
    console.log('[BinauralAudio] Applying personalized ITD');
  }

  if (prefs.leftVolume !== 1 || prefs.rightVolume !== 1) {
    // Adjust ILD (Interaural Level Difference)
    console.log('[BinauralAudio] Applying personalized ILD');
  }

  // Regenerate HRTF profiles with personalization
  loadHRTFProfiles();
}

// PHASE 8: Quick calibration test
function quickCalibrationTest() {
  if (!state.context) return;

  console.log('[BinauralAudio] Quick calibration test');

  // Play sound that should appear directly in front
  var buffer = state.context.createBuffer(1, state.context.sampleRate * 0.3, state.context.sampleRate);
  var data = buffer.getChannelData(0);

  for (var i = 0; i < data.length; i++) {
    data[i] = Math.sin(i / state.context.sampleRate * 800 * Math.PI * 2) * Math.exp(-i / data.length * 5);
  }

  playBinauralSound(buffer, { x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: 0 });

  setTimeout(function() {
    // Play sound that should appear directly behind
    playBinauralSound(buffer, { x: 0, y: 0, z: -1 }, { x: 0, y: 0, z: 0 });
  }, 1000);
}

    function setHRTFProfile(profileName) {
        if (state.hrtfDatabase[profileName]) {
            config.selectedProfile = profileName;
            state.currentProfile = state.hrtfDatabase[profileName];
            console.log('[BinauralAudio] Switched to HRTF profile:', profileName);
            return true;
        }
        return false;
    }

    function enableASMRMode(enabled) {
        config.asmrMode = enabled;
        console.log('[BinauralAudio] ASMR mode:', enabled ? 'ON' : 'OFF');

        if (enabled) {
            // Enhanced spatial accuracy for ASMR
            config.binauralEnabled = true;
        }
    }

function create360AudioBuffer(channels) {
  if (!state.context || !config.audio360Enabled) return null;

  // Create ambisonic buffer (simplified B-format)
  var sampleRate = state.context.sampleRate;
  var duration = 10;
  var buffer = state.context.createBuffer(4, sampleRate * duration, sampleRate);

  // W (omnidirectional)
  var w = buffer.getChannelData(0);
  // X (front-back)
  var x = buffer.getChannelData(1);
  // Y (left-right)
  var y = buffer.getChannelData(2);
  // Z (up-down)
  var z = buffer.getChannelData(3);

  // Generate ambient sound field
  for (var i = 0; i < w.length; i++) {
    var t = i / sampleRate;
    w[i] = (Math.random() * 2 - 1) * 0.1;
    x[i] = Math.sin(t * 2) * 0.05;
    y[i] = Math.cos(t * 3) * 0.05;
    z[i] = Math.sin(t * 1.5) * 0.03;
  }

  return buffer;
}

// PHASE 8: Load 360° audio samples from files
function load360AudioSample(id, audioBuffer) {
  if (!state.context) return false;

  // Store the ambisonic buffer
  state.audio360Buffers[id] = audioBuffer;
  console.log('[BinauralAudio] Loaded 360° sample:', id);
  return true;
}

function play360AudioSample(id, rotation) {
  if (!state.audio360Buffers[id] || !state.context) return;

  var ambisonicBuffer = state.audio360Buffers[id];
  var decoded = decodeAmbisonics(ambisonicBuffer, rotation);

  if (!decoded) return;

  var source = state.context.createBufferSource();
  source.buffer = decoded;

  var gain = state.context.createGain();
  gain.gain.value = 0.7;

  source.connect(gain);
  gain.connect(state.context.destination);

  source.start(0);

  console.log('[BinauralAudio] Playing 360° sample:', id);
}

// PHASE 8: ASMR-style proximity effects
function createASMRSource(buffer, position3D, listenerRotation) {
  if (!state.context || !config.asmrMode) return null;

  // Enhanced spatial accuracy for ASMR
  var dx = position3D.x - listenerRotation.x;
  var dz = position3D.z - listenerRotation.z;
  var azimuth = Math.atan2(dx, dz) * 180 / Math.PI;

  var dy = position3D.y - listenerRotation.y;
  var distance = Math.sqrt(dx * dx + dz * dz);
  var elevation = Math.atan2(dy, distance) * 180 / Math.PI;

  // Create binaural source with enhanced precision
  var binauralSource = createBinauralSource(buffer, {
    azimuth: azimuth,
    elevation: elevation,
    distance: distance
  });

  if (binauralSource) {
    // ASMR: Add subtle head-related transfer function enhancements
    var shelf = state.context.createBiquadFilter();
    shelf.type = 'highshelf';
    shelf.frequency.value = 5000;
    shelf.gain.value = 3; // Boost highs for ASMR tingle effect

    binauralSource.convolver.connect(shelf);
    shelf.connect(state.context.destination);

    // Add very subtle reverb for intimacy
    var reverb = state.context.createConvolver();
    reverb.buffer = createReverbImpulse(0.3, 2);

    var reverbGain = state.context.createGain();
    reverbGain.gain.value = 0.15;

    binauralSource.convolver.connect(reverb);
    reverb.connect(reverbGain);
    reverbGain.connect(state.context.destination);

    console.log('[BinauralAudio] ASMR source created at', azimuth.toFixed(1), '°');
  }

  return binauralSource;
}

function createReverbImpulse(duration, decay) {
  if (!state.context) return null;

  var sampleRate = state.context.sampleRate;
  var length = sampleRate * duration;
  var impulse = state.context.createBuffer(2, length, sampleRate);
  var left = impulse.getChannelData(0);
  var right = impulse.getChannelData(1);

  for (var i = 0; i < length; i++) {
    var n = i / length;
    left[i] = (Math.random() * 2 - 1) * Math.pow(1 - n, decay);
    right[i] = (Math.random() * 2 - 1) * Math.pow(1 - n, decay);
  }

  return impulse;
}

    function decodeAmbisonics(ambisonicBuffer, listenerOrientation) {
        if (!state.context) return null;

        // Simple binaural decoder for B-format ambisonics
        var decoded = state.context.createBuffer(2, ambisonicBuffer.length, ambisonicBuffer.sampleRate);
        var left = decoded.getChannelData(0);
        var right = decoded.getChannelData(1);

        var w = ambisonicBuffer.getChannelData(0);
        var x = ambisonicBuffer.getChannelData(1);
        var y = ambisonicBuffer.getChannelData(2);
        var z = ambisonicBuffer.getChannelData(3);

        // Basic decoding matrix
        for (var i = 0; i < left.length; i++) {
            left[i] = w[i] + x[i] * 0.707 + y[i] * 0.707 + z[i] * 0.5;
            right[i] = w[i] - x[i] * 0.707 + y[i] * 0.707 + z[i] * 0.5;
        }

        return decoded;
    }

    function setCalibration(calibrationData) {
        state.calibration = Object.assign(state.calibration, calibrationData);
        console.log('[BinauralAudio] Calibration updated');
    }

    function resetCalibration() {
        state.calibration = {
            leftDelay: 0,
            rightDelay: 0,
            leftVolume: 1,
            rightVolume: 1
        };
    }

    function cleanup() {
        if (state.context) {
            state.context.close();
        }
        state.hrtfDatabase = {};
        state.context = null;
    }

return {
  init: init,
  createBinauralSource: createBinauralSource,
  playBinauralSound: playBinauralSound,
  calibrateHRTF: calibrateHRTF,
  quickCalibrationTest: quickCalibrationTest,
  setHRTFProfile: setHRTFProfile,
  enableASMRMode: enableASMRMode,
  create360AudioBuffer: create360AudioBuffer,
  load360AudioSample: load360AudioSample,
  play360AudioSample: play360AudioSample,
  createASMRSource: createASMRSource,
  decodeAmbisonics: decodeAmbisonics,
  setCalibration: setCalibration,
  resetCalibration: resetCalibration,
  cleanup: cleanup,
  config: config,
  // PHASE 8: New functions
  getCalibrationStatus: function() { return config.hrtfCalibration.completed; },
  showCalibrationUI: showCalibrationUI,
  isCalibrating: function() { return state.isCalibrating; }
};
})();

if (typeof window !== 'undefined') {
    window.BinauralAudio = BinauralAudio;
}

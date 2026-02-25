/**
 * Advanced 3D Audio System - HRTF, occlusion, reverb zones
 */

var Advanced3DAudio = (function() {
    'use strict';

var config = {
  hrtfEnabled: true,
  occlusionEnabled: true,
  reverbEnabled: true,
  dopplerEnabled: true,
  maxDistance: 50,
  rolloffFactor: 1.5,
  referenceDistance: 5,
  coneInnerAngle: 360,
  coneOuterAngle: 180,
  coneOuterGain: 0.3,
  // Enhanced features
  occlusionRays: 16, // Increased from 8 for better accuracy
  occlusionSmoothing: 0.3,
  dopplerFactor: 1.5,
  speedOfSound: 343, // meters per second
  reverbZones: true,
  dynamicOcclusion: true,
  wallMaterialTypes: ['concrete', 'metal', 'tile', 'water', 'carpet']
};

var context = null;
var listener = null;
var soundSources = {};
var reverbNodes = {};
var occlusionCache = {};
var reverbZones = [];
var enabled = true;
var mazeWalls = []; // Cache wall positions for occlusion

    function init() {
        try {
            context = new (window.AudioContext || window.webkitAudioContext)();
            listener = context.listener;

            if (listener.positionX) {
                // Modern API
                listener.positionX.value = 0;
                listener.positionY.value = 0;
                listener.positionZ.value = 0;
                listener.forwardX.value = 0;
                listener.forwardY.value = 0;
                listener.forwardZ.value = -1;
                listener.upX.value = 0;
                listener.upY.value = 1;
                listener.upZ.value = 0;
            } else {
                // Legacy API
                listener.setPosition(0, 0, 0);
                listener.setOrientation(0, 0, -1, 0, 1, 0);
            }

            createReverbPresets();
            console.log('[Advanced3DAudio] Initialized with HRTF');
            return true;
        } catch (e) {
            console.error('[Advanced3DAudio] Failed to initialize:', e);
            return false;
        }
    }

function createReverbPresets() {
  // Small room reverb
  reverbNodes.small = createReverbImpulse(0.3, 2);

  // Medium room (corridor)
  reverbNodes.corridor = createReverbImpulse(0.8, 3);

  // Large room
  reverbNodes.large = createReverbImpulse(1.5, 4);

  // Echo chamber (sewers)
  reverbNodes.echo = createReverbImpulse(2.5, 5);

  // PHASE 8: Additional reverb zones
  // Tight space (vents, small closets)
  reverbNodes.tight = createReverbImpulse(0.15, 1.5);

  // Open warehouse (large open spaces)
  reverbNodes.warehouse = createReverbImpulse(2.0, 3.5);

  // Underwater (for water areas)
  reverbNodes.underwater = createReverbImpulse(1.2, 2.5, true);

  // Metal corridor (industrial areas)
  reverbNodes.metal = createReverbImpulse(1.0, 3.2, false, 'metal');

  // Carpeted office (absorptive surfaces)
  reverbNodes.carpet = createReverbImpulse(0.5, 2.0);

  // Outdoor/void (minimal reverb)
  reverbNodes.void = createReverbImpulse(3.0, 1.0);

  console.log('[Advanced3DAudio] Created', Object.keys(reverbNodes).length, 'reverb presets');
}

function createReverbImpulse(duration, decay, underwater, material) {
  if (!context) return null;

  var sampleRate = context.sampleRate;
  var length = sampleRate * duration;
  var impulse = context.createBuffer(2, length, sampleRate);
  var left = impulse.getChannelData(0);
  var right = impulse.getChannelData(1);

  // Material-specific filtering
  var filterFreq = 20000;
  var stereoWidth = 1.0;

  switch (material) {
    case 'metal':
      filterFreq = 4000; // Bright, metallic reflections
      stereoWidth = 1.2;
      break;
    case 'concrete':
      filterFreq = 3000;
      stereoWidth = 1.0;
      break;
    case 'carpet':
      filterFreq = 1500; // Absorbs high frequencies
      stereoWidth = 0.8;
      break;
    case 'water':
      underwater = true;
      break;
  }

  for (var i = 0; i < length; i++) {
    var n = i / length;
    var envelope = Math.pow(1 - n, decay);

    // Underwater effect: lowpass filtering and slower decay
    if (underwater) {
      envelope *= Math.exp(-n * 2);
      envelope *= (1 - n * 0.5); // Reduce high frequencies
    }

    // Add some coloration based on material
    var noise = Math.random() * 2 - 1;
    if (material === 'metal') {
      // Add some resonant frequencies
      noise += Math.sin(i / length * Math.PI * 800) * 0.1;
    }

    left[i] = noise * envelope;
    right[i] = (Math.random() * 2 - 1) * envelope * stereoWidth;

    // Apply simple lowpass for material absorption
    if (i > 0) {
      left[i] = left[i] * 0.99 + left[i - 1] * 0.01 * (20000 / filterFreq);
      right[i] = right[i] * 0.99 + right[i - 1] * 0.01 * (20000 / filterFreq);
    }
  }

  return impulse;
}

    function createSoundSource(id, buffer, options) {
        if (!context || !enabled) return null;

        options = options || {};

        var source = context.createBufferSource();
        source.buffer = buffer;
        source.loop = options.loop || false;

        // 3D panner node
        var panner = context.createPanner();
        panner.panningModel = config.hrtfEnabled ? 'HRTF' : 'equalpower';
        panner.distanceModel = 'inverse';
        panner.maxDistance = config.maxDistance;
        panner.rolloffFactor = config.rolloffFactor;
        panner.referenceDistance = options.referenceDistance || config.referenceDistance;
        panner.coneInnerAngle = options.coneInnerAngle || config.coneInnerAngle;
        panner.coneOuterAngle = options.coneOuterAngle || config.coneOuterAngle;
        panner.coneOuterGain = options.coneOuterGain || config.coneOuterGain;

        // Position
        var pos = options.position || { x: 0, y: 0, z: 0 };
        if (panner.positionX) {
            panner.positionX.value = pos.x;
            panner.positionY.value = pos.y;
            panner.positionZ.value = pos.z;
        } else {
            panner.setPosition(pos.x, pos.y, pos.z);
        }

        // Gain node for volume
        var gain = context.createGain();
        gain.gain.value = options.volume || 1.0;

        // Occlusion filter
        var filter = context.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = options.occlusionFrequency || 20000;

        // Reverb (optional)
        var convolver = null;
        var reverbGain = context.createGain();
        reverbGain.gain.value = 0;

        if (config.reverbEnabled && options.reverb) {
            convolver = context.createConvolver();
            convolver.buffer = reverbNodes[options.reverb] || reverbNodes.corridor;
            reverbGain.gain.value = options.reverbMix || 0.3;
        }

        // Connect nodes
        source.connect(panner);
        panner.connect(filter);
        filter.connect(gain);

        // Dry path
        gain.connect(context.destination);

        // Wet path (reverb)
        if (convolver) {
            gain.connect(convolver);
            convolver.connect(reverbGain);
            reverbGain.connect(context.destination);
        }

        soundSources[id] = {
            source: source,
            panner: panner,
            gain: gain,
            filter: filter,
            convolver: convolver,
            reverbGain: reverbGain,
            position: pos,
            options: options
        };

        return soundSources[id];
    }

    function playSound(id, buffer, options) {
        var sound = createSoundSource(id, buffer, options);
        if (!sound) return false;

        sound.source.start(0);
        console.log('[Advanced3DAudio] Playing sound:', id);

        if (options && !options.loop) {
            sound.source.onended = function() {
                stopSound(id);
            };
        }

        return true;
    }

    function stopSound(id) {
        var sound = soundSources[id];
        if (!sound) return;

        try {
            sound.source.stop();
        } catch (e) {}

        // Disconnect and cleanup
        if (sound.source.disconnect) sound.source.disconnect();
        if (sound.panner.disconnect) sound.panner.disconnect();
        if (sound.gain.disconnect) sound.gain.disconnect();
        if (sound.filter.disconnect) sound.filter.disconnect();

        delete soundSources[id];
    }

    function updateSoundPosition(id, position) {
        var sound = soundSources[id];
        if (!sound) return;

        sound.position = position;

        var panner = sound.panner;
        if (panner.positionX) {
            panner.positionX.value = position.x;
            panner.positionY.value = position.y;
            panner.positionZ.value = position.z;
        } else {
            panner.setPosition(position.x, position.y, position.z);
        }

        // Update occlusion
        if (config.occlusionEnabled) {
            updateOcclusion(sound);
        }
    }

function updateOcclusion(sound) {
  if (!sound || !listener) return;

  var listenerPos = {
    x: listener.positionX ? listener.positionX.value : 0,
    y: listener.positionY ? listener.positionY.value : 0,
    z: listener.positionZ ? listener.positionZ.value : 0
  };

  // PHASE 8: Enhanced multi-ray occlusion detection
  var occlusion = 0;
  var transmission = 1.0;

  if (config.dynamicOcclusion && config.occlusionEnabled) {
    var rayResult = castOcclusionRays(listenerPos, sound.position);
    occlusion = rayResult.occlusion;
    transmission = rayResult.transmission;
  } else {
    // Fallback to simple check
    var wallsBetween = checkWallsBetween(listenerPos, sound.position);
    occlusion = Math.min(1, wallsBetween * 0.3);
  }

  // Apply lowpass filter based on occlusion
  var frequency = 20000 * (1 - occlusion * 0.9);
  sound.filter.frequency.setTargetAtTime(frequency, context.currentTime, config.occlusionSmoothing);

  // Reduce volume based on transmission
  var gain = transmission * (1 - occlusion * 0.5);
  sound.gain.gain.setTargetAtTime(gain, context.currentTime, config.occlusionSmoothing);

  // Update cached occlusion value
  occlusionCache[sound.options.id || 'unknown'] = {
    occlusion: occlusion,
    transmission: transmission,
    frequency: frequency,
    gain: gain
  };
}

function checkWallsBetween(listenerPos, soundPos) {
  // Simplified - would use actual maze raycasting
  return 0;
}

// PHASE 8: Advanced multi-ray occlusion detection
function castOcclusionRays(from, to) {
  var numRays = config.occlusionRays;
  var totalOcclusion = 0;
  var totalTransmission = 0;

  // Calculate direction vector
  var dx = to.x - from.x;
  var dy = to.y - from.y;
  var dz = to.z - from.z;
  var distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

  if (distance < 0.1) {
    return { occlusion: 0, transmission: 1.0 };
  }

  // Cast multiple rays in a spread pattern
  for (var i = 0; i < numRays; i++) {
    // Calculate ray angle (spread in a cone)
    var angle = (i / numRays) * Math.PI * 2;
    var spread = 0.3; // radians

    var rayDir = {
      x: dx / distance * Math.cos(spread) + Math.sin(angle) * Math.sin(spread),
      y: dy / distance,
      z: dz / distance * Math.cos(spread) + Math.cos(angle) * Math.sin(spread)
    };

    // Raycast through maze
    var rayOcclusion = raycastMaze(from, rayDir, distance);
    totalOcclusion += rayOcclusion.occlusion;
    totalTransmission += rayOcclusion.transmission;
  }

  // Average the results
  return {
    occlusion: totalOcclusion / numRays,
    transmission: totalTransmission / numRays
  };
}

function raycastMaze(origin, direction, maxDistance) {
  var occlusion = 0;
  var transmission = 1.0;
  var stepSize = 0.5; // Check every 0.5 units
  var steps = Math.floor(maxDistance / stepSize);

  var x = origin.x;
  var y = origin.y;
  var z = origin.z;

  for (var i = 0; i < steps; i++) {
    x += direction.x * stepSize;
    y += direction.y * stepSize;
    z += direction.z * stepSize;

    // Check if this point is inside a wall
    if (isPointInWall(x, y, z)) {
      var wallMaterial = getWallMaterial(x, y, z);
      var materialOcclusion = getMaterialOcclusion(wallMaterial);
      occlusion += materialOcclusion;
      transmission *= (1 - materialOcclusion);
    }
  }

  // Normalize occlusion
  occlusion = Math.min(1, occlusion / Math.max(1, steps * 0.1));

  return { occlusion: occlusion, transmission: transmission };
}

function isPointInWall(x, y, z) {
  // Convert to maze coordinates
  var mazeX = Math.floor(x / CELL);
  var mazeZ = Math.floor(z / CELL);

  // Check bounds
  if (mazeX < 0 || mazeX >= COLS || mazeZ < 0 || mazeZ >= ROWS) {
    return false;
  }

  // Check if wall (1 = wall in maze array)
  // This would need access to the MAZE array from the main game
  if (typeof MAZE !== 'undefined' && MAZE[mazeZ] && MAZE[mazeZ][mazeX] === 1) {
    return true;
  }

  return false;
}

function getWallMaterial(x, y, z) {
  // Default to concrete, but could vary based on location
  // For example, water areas, metal grates, etc.
  if (y < 0.5) return 'tile'; // Floor
  return 'concrete'; // Walls
}

function getMaterialOcclusion(material) {
  var occlusionValues = {
    'concrete': 0.8,
    'metal': 0.9,
    'tile': 0.7,
    'water': 0.4,
    'carpet': 0.5,
    'glass': 0.3,
    'wood': 0.6
  };
  return occlusionValues[material] || 0.7;
}

function updateListener(position, rotation, velocity) {
  if (!listener || !enabled) return;

  // Update position
  if (listener.positionX) {
    listener.positionX.value = position.x;
    listener.positionY.value = position.y;
    listener.positionZ.value = position.z;

    // Update orientation
    var forward = new THREE.Vector3(0, 0, -1);
    forward.applyEuler(new THREE.Euler(rotation.x, rotation.y, 0, 'YXZ'));

    listener.forwardX.value = forward.x;
    listener.forwardY.value = forward.y;
    listener.forwardZ.value = forward.z;

    listener.upX.value = 0;
    listener.upY.value = 1;
    listener.upZ.value = 0;

    // PHASE 8: Enhanced Doppler effect
    if (config.dopplerEnabled && velocity) {
      listener.velocityX.value = velocity.x * config.dopplerFactor;
      listener.velocityY.value = velocity.y * config.dopplerFactor;
      listener.velocityZ.value = velocity.z * config.dopplerFactor;
    }
  } else {
    listener.setPosition(position.x, position.y, position.z);
    listener.setOrientation(
      forward.x, forward.y, forward.z,
      0, 1, 0
    );
  }
}

// PHASE 8: Update sound velocity for doppler on moving sound sources
function updateSoundVelocity(id, velocity) {
  var sound = soundSources[id];
  if (!sound) return;

  if (config.dopplerEnabled && sound.panner.velocityX) {
    sound.panner.velocityX.value = velocity.x * config.dopplerFactor;
    sound.panner.velocityY.value = velocity.y * config.dopplerFactor;
    sound.panner.velocityZ.value = velocity.z * config.dopplerFactor;
  }
}

function setReverbPreset(soundId, preset) {
  var sound = soundSources[soundId];
  if (!sound || !sound.convolver) return;

  var impulse = reverbNodes[preset];
  if (impulse) {
    sound.convolver.buffer = impulse;
  }
}

// PHASE 8: Reverb zones - automatic reverb based on position
function createReverbZone(id, position, radius, reverbType, blendRadius) {
  reverbZones.push({
    id: id,
    position: position,
    radius: radius,
    blendRadius: blendRadius || radius * 0.2,
    reverbType: reverbType
  });
  console.log('[Advanced3DAudio] Created reverb zone:', id, 'type:', reverbType);
}

function updateReverbZones(listenerPos) {
  if (!config.reverbZones || reverbZones.length === 0) return;

  // Find the zone the listener is in
  var activeZone = null;
  var maxInfluence = 0;

  reverbZones.forEach(function(zone) {
    var dx = listenerPos.x - zone.position.x;
    var dy = listenerPos.y - zone.position.y;
    var dz = listenerPos.z - zone.position.z;
    var distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (distance <= zone.radius + zone.blendRadius) {
      var influence = 1.0;

      if (distance > zone.radius) {
        // Blending at edges
        influence = 1 - (distance - zone.radius) / zone.blendRadius;
      }

      if (influence > maxInfluence) {
        maxInfluence = influence;
        activeZone = zone;
      }
    }
  });

  // Apply reverb zone to all sounds
  if (activeZone) {
    for (var id in soundSources) {
      var sound = soundSources[id];
      if (sound && sound.convolver) {
        var impulse = reverbNodes[activeZone.reverbType];
        if (impulse) {
          sound.convolver.buffer = impulse;
          sound.reverbGain.gain.setTargetAtTime(
            maxInfluence * (sound.options.reverbMix || 0.3),
            context.currentTime,
            0.5
          );
        }
      }
    }
  }
}

function removeReverbZone(id) {
  reverbZones = reverbZones.filter(function(zone) {
    return zone.id !== id;
  });
}

function clearReverbZones() {
  reverbZones = [];
}

    function setSoundVolume(id, volume) {
        var sound = soundSources[id];
        if (!sound) return;
        sound.gain.gain.setTargetAtTime(volume, context.currentTime, 0.1);
    }

    function pauseAll() {
        if (context.state === 'running') {
            context.suspend();
        }
    }

    function resumeAll() {
        if (context.state === 'suspended') {
            context.resume();
        }
    }

    function cleanup() {
        for (var id in soundSources) {
            stopSound(id);
        }

        if (context) {
            context.close();
        }

        soundSources = {};
        context = null;
        listener = null;
    }

    function setEnabled(value) {
        enabled = value;
    }

return {
  init: init,
  playSound: playSound,
  stopSound: stopSound,
  updateSoundPosition: updateSoundPosition,
  updateSoundVelocity: updateSoundVelocity,
  updateListener: updateListener,
  setReverbPreset: setReverbPreset,
  setSoundVolume: setSoundVolume,
  pauseAll: pauseAll,
  resumeAll: resumeAll,
  cleanup: cleanup,
  setEnabled: setEnabled,
  config: config,
  // PHASE 8: New functions
  createReverbZone: createReverbZone,
  updateReverbZones: updateReverbZones,
  removeReverbZone: removeReverbZone,
  clearReverbZones: clearReverbZones,
  castOcclusionRays: castOcclusionRays,
  getOcclusionCache: function() { return occlusionCache; }
};
})();

if (typeof window !== 'undefined') {
    window.Advanced3DAudio = Advanced3DAudio;
}

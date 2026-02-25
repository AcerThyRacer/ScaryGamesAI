# PHASE 8 AUDIO - Quick Reference Guide

## 🎛️ Using the Audio Systems

### 1. Advanced 3D Audio

```javascript
// Initialize
Advanced3DAudio.init();

// Play a 3D sound
var buffer = loadAudioBuffer('sound.wav');
Advanced3DAudio.playSound('enemy_1', buffer, {
  position: { x: 10, y: 1.5, z: 20 },
  loop: true,
  volume: 0.8,
  reverb: 'corridor',
  reverbMix: 0.3
});

// Update sound position (call every frame)
Advanced3DAudio.updateSoundPosition('enemy_1', {
  x: newX,
  y: newY,
  z: newZ
});

// Update listener (player) position
Advanced3DAudio.updateListener(
  { x: playerX, y: playerY, z: playerZ }, // position
  { x: rotX, y: rotY, z: rotZ },          // rotation
  { x: velX, y: velY, z: velZ }           // velocity (for doppler)
);

// Create reverb zone
Advanced3DAudio.createReverbZone(
  'zone_1',        // ID
  { x: 50, y: 1.5, z: 50 }, // center position
  10,              // radius
  'warehouse'      // reverb type
);

// Configure
Advanced3DAudio.config.hrtfEnabled = true;
Advanced3DAudio.config.occlusionEnabled = true;
Advanced3DAudio.config.dopplerEnabled = true;
```

### 2. Dynamic Soundtrack

```javascript
// Initialize
DynamicSoundtrack.init();

// Update intensity based on danger (0-4)
DynamicSoundtrack.updateIntensity(
  3,              // intensity (0-4)
  deltaTime,      // time since last frame
  gameContext     // optional context for leitmotifs
);

// Set individual parameters
DynamicSoundtrack.setIntensityParameter('pacman_proximity', 5);
DynamicSoundtrack.setIntensityParameter('sanity', 30);
DynamicSoundtrack.setIntensityParameter('blackout', true);
DynamicSoundtrack.setIntensityParameter('discovery', true);

// Manually trigger leitmotif
DynamicSoundtrack.playLeitmotif('pacman_chase');

// Configure
DynamicSoundtrack.config.leitmotifsEnabled = true;
DynamicSoundtrack.config.silenceEnabled = true;
```

### 3. Procedural Audio

```javascript
// Initialize
ProceduralAudio.init();

// Generate voice sounds
ProceduralAudio.generateWhisper();
ProceduralAudio.generateChant(110, 0.3, 0.5); // pitch, speed, intensity
ProceduralAudio.generateMoan(80, 3, 0.4);
ProceduralAudio.generateScream(0.8, 1.5);

// Generate footsteps
ProceduralAudio.generateFootstep('tile', 1.0, 1.0); // surface, velocity, weight
ProceduralAudio.generateFootstepSequence('metal', 4, 0.4);

// Environmental sounds
ProceduralAudio.generateDrip();
ProceduralAudio.generateCreak();
ProceduralAudio.generateMetalScrape();
ProceduralAudio.generateTileCrack();
ProceduralAudio.generateGlassBreak();
ProceduralAudio.generateWind(0.5); // intensity

// Generate ambience
ProceduralAudio.playAmbientDrone(50, 10, 0.3); // freq, duration, volume

// Configure voice synthesis
ProceduralAudio.setVoiceSynth({
  enabled: true,
  whisperIntensity: 0.5,
  chantSpeed: 0.3
});
```

### 4. Binaural Audio

```javascript
// Initialize
BinauralAudio.init();

// Start HRTF calibration (shows UI)
BinauralAudio.calibrateHRTF();

// Quick test
BinauralAudio.quickCalibrationTest();

// Enable ASMR mode
BinauralAudio.enableASMRMode(true);

// Create 360° audio buffer
var ambisonicBuffer = BinauralAudio.create360AudioBuffer(4);

// Load 360° sample from file
loadAudioFile('ambient360.wav', function(buffer) {
  BinauralAudio.load360AudioSample('ambient_1', buffer);
});

// Play 360° sample
BinauralAudio.play360AudioSample('ambient_1', {
  x: 0, y: 0, z: 0 // rotation
});

// Create ASMR source (enhanced binaural)
BinauralAudio.createASMRSource(buffer, position3D, listenerRotation);

// Check calibration status
if (BinauralAudio.getCalibrationStatus()) {
  console.log('User has completed HRTF calibration');
}
```

### 5. HorrorAudioEnhanced (Base System)

```javascript
// Initialize
HorrorAudioEnhanced.init();

// Show settings panel
HorrorAudioEnhanced.toggleSettings();

// Control volume
HorrorAudioEnhanced.setVolume(0.8);
HorrorAudioEnhanced.setMusicVolume(0.6);
HorrorAudioEnhanced.setSfxVolume(0.7);

// Play SFX
HorrorAudioEnhanced.playClick();
HorrorAudioEnhanced.playCollect();
HorrorAudioEnhanced.playJumpScare();

// Create spatial sound
var sound = HorrorAudioEnhanced.createSpatialSound({
  reverb: true,
  reverbWet: 0.3
});
sound.setPosition(x, y, z);
sound.playBuffer(audioBuffer, 1.0);

// Dynamic music
HorrorAudioEnhanced.startDynamicMusic('tension');
HorrorAudioEnhanced.setMusicTheme('chase');
HorrorAudioEnhanced.setMusicIntensity(0.8);

// Subtitles
HorrorAudioEnhanced.showSubtitle('monster_nearby', {
  text: 'Something approaches...',
  speaker: 'Narrator',
  duration: 3000,
  priority: 5
});

// Get tier features
var features = HorrorAudioEnhanced.getFeatures();
console.log('HRTF Quality:', features.hrtfQuality);
```

---

## 🎮 Game Integration Examples

### Example 1: Enemy Approach

```javascript
function updateEnemyAudio(enemy, deltaTime) {
  var distance = player.distanceTo(enemy);

  // 3D audio positioning
  if (enemy.soundId) {
    Advanced3DAudio.updateSoundPosition(enemy.soundId, enemy.position);
  } else {
    enemy.soundId = 'enemy_' + enemy.id;
    Advanced3DAudio.playSound(enemy.soundId, enemy.audioBuffer, {
      position: enemy.position,
      loop: true,
      volume: 0.8,
      reverb: 'corridor'
    });
  }

  // Dynamic soundtrack intensity
  if (distance < 10) {
    DynamicSoundtrack.setIntensityParameter('pacman_proximity', distance);
  }

  // Procedural whispers when very close
  if (distance < 5 && Math.random() < 0.01) {
    ProceduralAudio.generateWhisper();
  }
}
```

### Example 2: Player Footsteps

```javascript
function playPlayerFootstep(surface, isRunning) {
  var velocity = isRunning ? 1.5 : 1.0;

  // Physical modeling
  ProceduralAudio.generateFootstep(surface, velocity, 1.0);

  // Add reverb based on location
  var reverbType = getReverbForLocation(player.position);
  // (reverb automatically applied via reverb zones)
}
```

### Example 3: Blackout Event

```javascript
function triggerBlackout() {
  // Audio cues
  HorrorAudioEnhanced.playJumpScare();

  // Dynamic soundtrack
  DynamicSoundtrack.setIntensityParameter('blackout', true);

  // Procedural whispers
  setTimeout(function() {
    ProceduralAudio.generateWhisper();
  }, 1000);

  setTimeout(function() {
    ProceduralAudio.generateMoan(60, 2, 0.5);
  }, 2500);

  // Silence moment (horror effect)
  setTimeout(function() {
    DynamicSoundtrack.setIntensityParameter('force_silence', true);
  }, 4000);
}
```

### Example 4: Power-Up Collection

```javascript
function onPowerUpCollected() {
  // Standard sound
  HorrorAudioEnhanced.playCollect();

  // Leitmotif
  DynamicSoundtrack.setIntensityParameter('powerup', true);
  DynamicSoundtrack.playLeitmotif('powerup');

  // Subtitle
  HorrorAudioEnhanced.showSubtitle('pickup_powerup', {
    text: 'Power-up acquired!',
    duration: 2000
  });
}
```

---

## ⚙️ Configuration Reference

### Advanced3DAudio Config

```javascript
Advanced3DAudio.config = {
  hrtfEnabled: true,
  occlusionEnabled: true,
  reverbEnabled: true,
  dopplerEnabled: true,
  maxDistance: 50,
  rolloffFactor: 1.5,
  referenceDistance: 5,
  occlusionRays: 16,
  occlusionSmoothing: 0.3,
  dopplerFactor: 1.5,
  speedOfSound: 343
};
```

### DynamicSoundtrack Config

```javascript
DynamicSoundtrack.config = {
  layers: ['ambient', 'tension', 'action', 'horror'],
  crossfadeDuration: 2,
  baseVolume: 0.6,
  leitmotifsEnabled: true,
  silenceEnabled: true,
  adaptiveMusic: true,
  minSilenceDuration: 3,
  maxSilenceDuration: 8,
  silenceChance: 0.15
};
```

### ProceduralAudio Config

```javascript
ProceduralAudio.setVoiceSynth({
  enabled: true,
  whisperIntensity: 0.5,
  chantSpeed: 0.3
});

// Surface materials
ProceduralAudio.setSurfaceMaterial('tile', {
  freq: 800,
  decay: 30,
  noise: 0.3
});
```

### BinauralAudio Config

```javascript
BinauralAudio.config = {
  hrtfProfiles: ['generic', 'custom', 'wide', 'narrow'],
  selectedProfile: 'generic',
  binauralEnabled: true,
  asmrMode: false,
  audio360Enabled: true,
  ambisonicOrder: 1,
  hrtfCalibration: {
    completed: false,
    headSize: 1.0,
    personalization: 0.5
  }
};
```

---

## 🐛 Debugging Tips

```javascript
// Check if audio systems are initialized
console.log('Advanced3DAudio:', typeof Advanced3DAudio !== 'undefined');
console.log('DynamicSoundtrack:', typeof DynamicSoundtrack !== 'undefined');
console.log('ProceduralAudio:', typeof ProceduralAudio !== 'undefined');
console.log('BinauralAudio:', typeof BinauralAudio !== 'undefined');

// Get audio context state
var ctx = HorrorAudioEnhanced.getContext();
console.log('Audio Context State:', ctx.state);

// Check active sounds
console.log('Active procedural sounds:', activeProceduralSounds.length);

// Test HRTF calibration
BinauralAudio.quickCalibrationTest();

// Force reverb zone update
Advanced3DAudio.updateReverbZones(camera.position);

// Monitor performance
console.time('audioUpdate');
// ... audio update code ...
console.timeEnd('audioUpdate');
```

---

## 📊 Performance Tips

1. **Limit simultaneous sounds**: Keep active sounds under 50
2. **Use occlusion caching**: Reduces ray casting overhead
3. **Smooth transitions**: Prevents audio clicks (0.1-0.5s)
4. **Cleanup stopped sounds**: Call stopSound() when done
5. **Quality tiers**: Adjust based on device performance
6. **Lazy initialization**: Only init audio on user interaction

---

## 🎯 Best Practices

1. **Always initialize on user gesture** (click, tap)
2. **Handle audio context state** (suspended/running)
3. **Provide mute options** for accessibility
4. **Test with headphones** for HRTF effects
5. **Balance volumes** between systems
6. **Use subtitles** for important audio cues
7. **Save user preferences** to localStorage
8. **Graceful degradation** for older browsers

---

*Quick Reference Guide - Phase 8 Audio Revolution*  
*For complete documentation, see PHASE8_AUDIO_REVOLUTION_COMPLETE.md*

/**
 * PHASE 8: AUDIO REVOLUTION - COMPLETE INTEGRATION MODULE
 * Unifies all audio systems for seamless, immersive 3D soundscape
 */

var Phase8AudioIntegration = (function() {
    'use strict';

    var config = {
        // Quality presets
        qualityPresets: {
            low: { hrtf: false, occlusionRays: 4, reverb: false, maxSounds: 16 },
            medium: { hrtf: true, occlusionRays: 8, reverb: true, maxSounds: 32 },
            high: { hrtf: true, occlusionRays: 16, reverb: true, maxSounds: 64 },
            ultra: { hrtf: true, occlusionRays: 32, reverb: true, maxSounds: 128 }
        },
        
        // Current quality setting
        currentQuality: 'high',
        
        // Audio feature toggles
        features: {
            hrtfEnabled: true,
            occlusionEnabled: true,
            dopplerEnabled: true,
            adaptiveMusic: true,
            leitmotifs: true,
            silenceMechanics: true,
            voiceSynthesis: true,
            enhancedFootsteps: true,
            asmrMode: false
        },
        
        // Mixing levels
        mixLevels: {
            master: 0.8,
            music: 0.6,
            sfx: 0.9,
            ambient: 0.4,
            voice: 0.7,
            footsteps: 0.5
        },
        
        // Dynamic mixing rules
        dynamicMixing: {
            duckingWhenMusicPlays: 0.3, // Reduce SFX by 30% when music is loud
            heartbeatPriority: 0.9, // Heartbeat gets high priority
            jumpscareDucking: 0.1 // Duck everything to 10% during jumpscare
        }
    };

    var state = {
        initialized: false,
        currentIntensity: 0,
        currentReverbZone: null,
        activeSounds: 0,
        lastFootstepSurface: null,
        playerState: {
            sanity: 100,
            stress: 0,
            health: 100
        },
        calibrationData: null
    };

    var audioContext = null;
    var masterGain = null;
    var musicMixer = null;
    var sfxMixer = null;
    var ambientMixer = null;
    var voiceMixer = null;

    /**
     * Initialize Phase 8 Audio Integration
     */
    function init() {
        if (state.initialized) return true;

        console.log('[Phase8Audio] Starting initialization...');

        try {
            // Get or create audio context
            if (typeof HorrorAudio !== 'undefined' && HorrorAudio.getContext) {
                audioContext = HorrorAudio.getContext();
            }
            
            if (!audioContext) {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }

            // Create mixer busses
            createMixerBusses();

            // Initialize all subsystems
            initializeSubsystems();

            // Load saved settings
            loadSettings();

            // Apply quality preset
            applyQualityPreset(config.currentQuality);

            state.initialized = true;
            console.log('[Phase8Audio] ✅ Full integration complete');
            return true;

        } catch (e) {
            console.error('[Phase8Audio] ❌ Initialization failed:', e);
            return false;
        }
    }

    /**
     * Create mixer busses for proper audio routing
     */
    function createMixerBusses() {
        if (!audioContext) return;

        // Master output
        masterGain = audioContext.createGain();
        masterGain.gain.value = config.mixLevels.master;
        masterGain.connect(audioContext.destination);

        // Sub-mixers
        musicMixer = audioContext.createGain();
        musicMixer.gain.value = config.mixLevels.music;
        musicMixer.connect(masterGain);

        sfxMixer = audioContext.createGain();
        sfxMixer.gain.value = config.mixLevels.sfx;
        sfxMixer.connect(masterGain);

        ambientMixer = audioContext.createGain();
        ambientMixer.gain.value = config.mixLevels.ambient;
        ambientMixer.connect(masterGain);

        voiceMixer = audioContext.createGain();
        voiceMixer.gain.value = config.mixLevels.voice;
        voiceMixer.connect(masterGain);
    }

    /**
     * Initialize all audio subsystems
     */
    function initializeSubsystems() {
        // Advanced 3D Audio
        if (typeof Advanced3DAudio !== 'undefined') {
            if (Advanced3DAudio.init) {
                Advanced3DAudio.init();
                console.log('[Phase8Audio] Advanced3DAudio ready');
            }
        }

        // Dynamic Soundtrack
        if (typeof DynamicSoundtrack !== 'undefined') {
            if (DynamicSoundtrack.init) {
                DynamicSoundtrack.init();
                console.log('[Phase8Audio] DynamicSoundtrack ready');
            }
        }

        // Procedural Audio
        if (typeof ProceduralAudio !== 'undefined') {
            if (ProceduralAudio.init) {
                ProceduralAudio.init();
                console.log('[Phase8Audio] ProceduralAudio ready');
            }
        }

        // Binaural Audio
        if (typeof BinauralAudio !== 'undefined') {
            if (BinauralAudio.init) {
                BinauralAudio.init();
                console.log('[Phase8Audio] BinauralAudio ready');
            }
        }

        // Base Horror Audio
        if (typeof HorrorAudio !== 'undefined') {
            if (HorrorAudio.init) {
                HorrorAudio.init();
                console.log('[Phase8Audio] HorrorAudio base ready');
            }
        }
    }

    /**
     * Main update loop - coordinates all audio systems
     */
    function update(deltaTime, playerPos, pacmanPos, gameState) {
        if (!state.initialized) return;

        // Update intensity based on game state
        updateIntensity(playerPos, pacmanPos, gameState);

        // Update reverb zones
        updateReverbZones(playerPos);

        // Dynamic mixing based on game state
        updateDynamicMixing(gameState);

        // Update subsystems
        updateSubsystems(deltaTime, playerPos, pacmanPos, gameState);

        // Performance monitoring
        monitorPerformance();
    }

    /**
     * Update horror intensity
     */
    function updateIntensity(playerPos, pacmanPos, gameState) {
        var intensity = 0;

        // Pac-Man proximity
        if (pacmanPos && playerPos) {
            var distance = new THREE.Vector3()
                .subVectors(playerPos, pacmanPos)
                .length();
            
            intensity = Math.max(intensity, 1 - (distance / 20));
        }

        // Sanity level
        if (typeof SanitySystem !== 'undefined') {
            var sanity = SanitySystem.getSanity();
            intensity = Math.max(intensity, (100 - sanity) / 100);
        }

        // Stress level
        if (typeof StressSystem !== 'undefined') {
            var stress = StressSystem.getStress();
            intensity = Math.max(intensity, stress / 100);
        }

        // Blackout
        if (gameState && gameState.blackoutActive) {
            intensity = Math.max(intensity, 0.8);
        }

        state.currentIntensity = intensity;

        // Pass intensity to dynamic soundtrack
        if (typeof DynamicSoundtrack !== 'undefined' && DynamicSoundtrack.setIntensity) {
            DynamicSoundtrack.setIntensity(intensity);
        }
    }

    /**
     * Update reverb zones based on player position
     */
    function updateReverbZones(playerPos) {
        if (!playerPos || typeof Advanced3DAudio === 'undefined') return;

        // Simple zone detection based on position
        var newZone = 'corridor'; // default
        
        // Could implement more sophisticated zone detection here
        // For now, use simple heuristics
        
        if (state.currentReverbZone !== newZone) {
            state.currentReverbZone = newZone;
            
            if (Advanced3DAudio.setReverbZone) {
                Advanced3DAudio.setReverbZone(newZone);
            }
        }
    }

    /**
     * Dynamic mixing - duck/boost channels based on game state
     */
    function updateDynamicMixing(gameState) {
        if (!musicMixer || !sfxMixer || !ambientMixer) return;

        var time = audioContext.currentTime;

        // Duck ambient when music is intense
        if (state.currentIntensity > 0.7) {
            ambientMixer.gain.setTargetAtTime(
                config.mixLevels.ambient * 0.5,
                time,
                0.5
            );
        } else {
            ambientMixer.gain.setTargetAtTime(
                config.mixLevels.ambient,
                time,
                0.5
            );
        }

        // Jumpscare moment - duck everything except SFX
        if (gameState && gameState.jumpscareActive) {
            musicMixer.gain.setTargetAtTime(
                config.mixLevels.music * config.dynamicMixing.jumpscareDucking,
                time,
                0.1
            );
            ambientMixer.gain.setTargetAtTime(
                config.mixLevels.ambient * config.dynamicMixing.jumpscareDucking,
                time,
                0.1
            );
        } else {
            musicMixer.gain.setTargetAtTime(
                config.mixLevels.music,
                time,
                0.5
            );
        }
    }

    /**
     * Update all audio subsystems
     */
    function updateSubsystems(deltaTime, playerPos, pacmanPos, gameState) {
        // Advanced 3D Audio updates
        if (typeof Advanced3DAudio !== 'undefined' && Advanced3DAudio.update) {
            Advanced3DAudio.update(deltaTime, playerPos);
        }

        // Dynamic Soundtrack updates
        if (typeof DynamicSoundtrack !== 'undefined' && DynamicSoundtrack.update) {
            DynamicSoundtrack.update(deltaTime, gameState);
        }

        // Procedural Audio updates
        if (typeof ProceduralAudio !== 'undefined' && ProceduralAudio.update) {
            ProceduralAudio.update(deltaTime, playerPos, gameState);
        }

        // Binaural Audio updates
        if (typeof BinauralAudio !== 'undefined' && BinauralAudio.update) {
            BinauralAudio.update(deltaTime, playerPos);
        }

        // Enhanced footsteps
        if (config.features.enhancedFootsteps && typeof HorrorAudio !== 'undefined') {
            updateEnhancedFootsteps(deltaTime, gameState);
        }

        // Voice synthesis events
        if (config.features.voiceSynthesis && typeof ProceduralAudio !== 'undefined') {
            updateVoiceEvents(deltaTime, gameState);
        }
    }

    /**
     * Update enhanced footsteps system
     */
    function updateEnhancedFootsteps(deltaTime, gameState) {
        if (!gameState || !gameState.isMoving) return;

        // Detect surface (this would need integration with the maze system)
        var surface = detectSurfaceUnderPlayer();
        
        if (surface !== state.lastFootstepSurface) {
            state.lastFootstepSurface = surface;
            
            // Play surface-specific footstep
            if (typeof HorrorAudio !== 'undefined' && HorrorAudio.playFootstep) {
                HorrorAudio.playFootstep(surface);
            }
        }
    }

    /**
     * Detect surface type under player
     */
    function detectSurfaceUnderPlayer() {
        // Simplified - would need actual maze data for proper implementation
        // Return different surfaces based on game progress or area
        var surfaces = ['tile', 'concrete', 'water', 'metal', 'carpet'];
        return surfaces[Math.floor(Math.random() * surfaces.length)];
    }

    /**
     * Update procedural voice events
     */
    function updateVoiceEvents(deltaTime, gameState) {
        if (!gameState) return;

        // Trigger whispers at low sanity
        if (typeof SanitySystem !== 'undefined') {
            var sanity = SanitySystem.getSanity();
            
            if (sanity < 40 && Math.random() < 0.01) {
                // Play whisper
                if (typeof ProceduralAudio !== 'undefined' && ProceduralAudio.generateWhisper) {
                    ProceduralAudio.generateWhisper();
                }
            }
        }

        // Trigger chants during high intensity
        if (state.currentIntensity > 0.8 && Math.random() < 0.005) {
            if (typeof ProceduralAudio !== 'undefined' && ProceduralAudio.generateChant) {
                ProceduralAudio.generateChant();
            }
        }
    }

    /**
     * Play sound effect through appropriate mixer
     */
    function playSFX(bufferOrSource, options) {
        if (!sfxMixer || !audioContext) return null;

        var source;
        if (bufferOrSource instanceof AudioBuffer) {
            source = audioContext.createBufferSource();
            source.buffer = bufferOrSource;
        } else {
            source = bufferOrSource;
        }

        // Create gain for this sound
        var gain = audioContext.createGain();
        gain.gain.value = options && options.volume ? options.volume : 1.0;

        // Connect through SFX mixer
        source.connect(gain);
        gain.connect(sfxMixer);

        // Start playback
        source.start();

        // Auto-cleanup
        if (options && options.duration) {
            source.stop(audioContext.currentTime + options.duration);
            setTimeout(function() {
                source.disconnect();
                gain.disconnect();
            }, (options.duration + 0.1) * 1000);
        }

        return { source: source, gain: gain };
    }

    /**
     * Play 3D positioned sound
     */
    function playSpatialSound(buffer, position, options) {
        if (typeof Advanced3DAudio !== 'undefined' && Advanced3DAudio.playSpatialSound) {
            return Advanced3DAudio.playSpatialSound(buffer, position, options);
        }

        // Fallback: create panner node
        if (!audioContext) return null;

        var panner = audioContext.createPanner();
        panner.panningModel = 'HRTF';
        panner.positionX.value = position.x;
        panner.positionY.value = position.y || 1.5;
        panner.positionZ.value = position.z;

        var source = audioContext.createBufferSource();
        source.buffer = buffer;

        var gain = audioContext.createGain();
        gain.gain.value = options && options.volume ? options.volume : 1.0;

        source.connect(panner);
        panner.connect(gain);
        gain.connect(sfxMixer);

        source.start();

        return { source: source, panner: panner, gain: gain };
    }

    /**
     * Apply quality preset
     */
    function applyQualityPreset(quality) {
        config.currentQuality = quality;
        var preset = config.qualityPresets[quality];

        if (!preset) return;

        // Update Advanced3DAudio config
        if (typeof Advanced3DAudio !== 'undefined') {
            Advanced3DAudio.config.hrtfEnabled = preset.hrtf;
            Advanced3DAudio.config.occlusionRays = preset.occlusionRays;
            Advanced3DAudio.config.reverbEnabled = preset.reverb;
        }

        // Update other systems
        if (typeof DynamicSoundtrack !== 'undefined') {
            DynamicSoundtrack.config.maxSimultaneousSounds = preset.maxSounds;
        }

        console.log('[Phase8Audio] Quality preset applied:', quality);
    }

    /**
     * Enable/disable specific audio feature
     */
    function setFeature(feature, enabled) {
        if (config.features.hasOwnProperty(feature)) {
            config.features[feature] = enabled;

            // Apply immediately to subsystems
            switch (feature) {
                case 'hrtfEnabled':
                    if (typeof Advanced3DAudio !== 'undefined') {
                        Advanced3DAudio.config.hrtfEnabled = enabled;
                    }
                    break;
                case 'occlusionEnabled':
                    if (typeof Advanced3DAudio !== 'undefined') {
                        Advanced3DAudio.config.occlusionEnabled = enabled;
                    }
                    break;
                case 'adaptiveMusic':
                    if (typeof DynamicSoundtrack !== 'undefined') {
                        DynamicSoundtrack.config.adaptiveMusic = enabled;
                    }
                    break;
                case 'voiceSynthesis':
                    if (typeof ProceduralAudio !== 'undefined') {
                        ProceduralAudio.setVoiceSynth({ enabled: enabled });
                    }
                    break;
            }

            saveSettings();
            console.log('[Phase8Audio] Feature updated:', feature, '=', enabled);
        }
    }

    /**
     * Calibrate HRTF for user
     */
    function calibrateHRTF() {
        if (typeof BinauralAudio !== 'undefined' && BinauralAudio.calibrateHRTF) {
            BinauralAudio.calibrateHRTF();
        } else {
            console.warn('[Phase8Audio] HRTF calibration not available');
        }
    }

    /**
     * Save audio settings to localStorage
     */
    function saveSettings() {
        try {
            var settings = {
                quality: config.currentQuality,
                features: config.features,
                mixLevels: config.mixLevels,
                calibration: state.calibrationData
            };
            localStorage.setItem('phase8_audio_settings', JSON.stringify(settings));
        } catch (e) {
            console.warn('[Phase8Audio] Failed to save settings:', e);
        }
    }

    /**
     * Load audio settings from localStorage
     */
    function loadSettings() {
        try {
            var saved = localStorage.getItem('phase8_audio_settings');
            if (saved) {
                var settings = JSON.parse(saved);
                
                if (settings.quality) config.currentQuality = settings.quality;
                if (settings.features) Object.assign(config.features, settings.features);
                if (settings.mixLevels) Object.assign(config.mixLevels, settings.mixLevels);
                if (settings.calibration) state.calibrationData = settings.calibration;

                console.log('[Phase8Audio] Settings loaded');
            }
        } catch (e) {
            console.warn('[Phase8Audio] Failed to load settings:', e);
        }
    }

    /**
     * Monitor audio performance
     */
    function monitorPerformance() {
        if (!audioContext) return;

        // Count active sounds
        state.activeSounds = audioContext.state === 'running' ? 
            audioContext.getActiveSources().length : 0;

        // Warn if too many sounds
        if (state.activeSounds > config.qualityPresets[config.currentQuality].maxSounds) {
            console.warn('[Phase8Audio] Too many active sounds:', state.activeSounds);
        }
    }

    /**
     * Get current audio state
     */
    function getState() {
        return {
            initialized: state.initialized,
            intensity: state.currentIntensity,
            reverbZone: state.currentReverbZone,
            activeSounds: state.activeSounds,
            quality: config.currentQuality,
            features: config.features
        };
    }

    /**
     * Reset to default settings
     */
    function resetToDefaults() {
        config.currentQuality = 'high';
        config.features = {
            hrtfEnabled: true,
            occlusionEnabled: true,
            dopplerEnabled: true,
            adaptiveMusic: true,
            leitmotifs: true,
            silenceMechanics: true,
            voiceSynthesis: true,
            enhancedFootsteps: true,
            asmrMode: false
        };
        config.mixLevels = {
            master: 0.8,
            music: 0.6,
            sfx: 0.9,
            ambient: 0.4,
            voice: 0.7,
            footsteps: 0.5
        };

        applyQualityPreset('high');
        saveSettings();
        console.log('[Phase8Audio] Reset to defaults');
    }

    // Public API
    return {
        init: init,
        update: update,
        playSFX: playSFX,
        playSpatialSound: playSpatialSound,
        setFeature: setFeature,
        calibrateHRTF: calibrateHRTF,
        applyQualityPreset: applyQualityPreset,
        resetToDefaults: resetToDefaults,
        getState: getState,
        config: config,
        state: state
    };
})();

// Export to global scope
if (typeof window !== 'undefined') {
    window.Phase8AudioIntegration = Phase8AudioIntegration;
}

console.log('[Phase8Audio] Module loaded - Ready for integration');

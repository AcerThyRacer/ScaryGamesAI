/**
 * PHASE 8: COMPLETE AUDIO INTEGRATION & ENHANCEMENTS
 * Final polish connecting all audio systems with game events
 */

var Phase8AudioComplete = (function() {
    'use strict';

    var config = {
        // Audio event mappings
        gameEvents: {
            PELLET_COLLECT: 'pellet_collect',
            POWER_PELLET: 'power_pellet',
            ENEMY_SPOTTED: 'enemy_spotted',
            ENEMY_CLOSE: 'enemy_close',
            LOW_SANITY: 'low_sanity',
            ABILITY_USE: 'ability_use',
            REVIVE_PLAYER: 'revive',
            CRAFT_ITEM: 'craft',
            TRAP_TRIGGERED: 'trap',
            QUEST_COMPLETE: 'quest_complete',
            BOSS_SPAWN: 'boss_spawn',
            GAME_WIN: 'game_win',
            GAME_OVER: 'game_over'
        },
        
        // Dynamic music layers
        musicLayers: {
            AMBIENT: 'ambient',
            TENSION: 'tension',
            ACTION: 'action',
            RESOLUTION: 'resolution'
        },
        
        // Quality presets
        qualityPresets: {
            MOBILE: { maxSounds: 16, hrtf: false, reverb: false },
            STANDARD: { maxSounds: 32, hrtf: true, reverb: true },
            HIGH: { maxSounds: 64, hrtf: true, reverb: true },
            ULTRA: { maxSounds: 128, hrtf: true, reverb: true }
        }
    };

    var state = {
        currentQuality: 'standard',
        activeSounds: 0,
        musicIntensity: 0,
        lastEventTime: {},
        audioProfiles: {}
    };

    /**
     * Initialize complete audio system
     */
    function init() {
        console.log('[Phase8AudioComplete] Initializing...');
        
        // Initialize all audio subsystems
        initializeSubsystems();
        
        // Load user preferences
        loadUserPreferences();
        
        // Setup event listeners
        setupGameEventListeners();
        
        // Start dynamic music
        startDynamicMusic();
        
        console.log('[Phase8AudioComplete] ✅ Fully initialized');
    }

    /**
     * Initialize all audio subsystems
     */
    function initializeSubsystems() {
        // Base Horror Audio
        if (typeof HorrorAudio !== 'undefined' && HorrorAudio.init) {
            HorrorAudio.init();
        }
        
        // Advanced 3D Audio
        if (typeof Advanced3DAudio !== 'undefined' && Advanced3DAudio.init) {
            Advanced3DAudio.init();
        }
        
        // Dynamic Soundtrack
        if (typeof DynamicSoundtrack !== 'undefined' && DynamicSoundtrack.init) {
            DynamicSoundtrack.init();
        }
        
        // Procedural Audio
        if (typeof ProceduralAudio !== 'undefined' && ProceduralAudio.init) {
            ProceduralAudio.init();
        }
        
        // Binaural Audio
        if (typeof BinauralAudio !== 'undefined' && BinauralAudio.init) {
            BinauralAudio.init();
        }
        
        // Phase 8 Integration
        if (typeof Phase8AudioIntegration !== 'undefined' && Phase8AudioIntegration.init) {
            Phase8AudioIntegration.init();
        }
    }

    /**
     * Setup game event listeners
     */
    function setupGameEventListeners() {
        // Pellet collection
        window.addEventListener('pelletCollected', function(e) {
            playGameEvent(config.gameEvents.PELLET_COLLECT, {
                position: e.detail.position,
                isPowerPellet: e.detail.isPower
            });
        });
        
        // Enemy spotted
        window.addEventListener('enemySpotted', function(e) {
            var distance = e.detail.distance;
            if (distance < 5) {
                playGameEvent(config.gameEvents.ENEMY_CLOSE, { distance: distance });
            } else {
                playGameEvent(config.gameEvents.ENEMY_SPOTTED, { distance: distance });
            }
        });
        
        // Low sanity warning
        window.addEventListener('sanityLow', function(e) {
            if (e.detail.sanity < 30) {
                playGameEvent(config.gameEvents.LOW_SANITY, { sanity: e.detail.sanity });
            }
        });
        
        // Ability use
        window.addEventListener('abilityUsed', function(e) {
            playGameEvent(config.gameEvents.ABILITY_USE, {
                abilityId: e.detail.abilityId,
                success: e.detail.success
            });
        });
        
        // Quest completion
        window.addEventListener('questCompleted', function(e) {
            playGameEvent(config.gameEvents.QUEST_COMPLETE, {
                questId: e.detail.questId,
                bonus: e.detail.bonus
            });
        });
    }

    /**
     * Play sound for game event
     */
    function playGameEvent(eventType, data) {
        var now = Date.now();
        
        // Cooldown check (prevent spam)
        if (state.lastEventTime[eventType] && now - state.lastEventTime[eventType] < 500) {
            return;
        }
        
        state.lastEventEventTime = now;
        
        switch (eventType) {
            case config.gameEvents.PELLET_COLLECT:
                playPelletCollectSound(data);
                break;
            case config.gameEvents.ENEMY_SPOTTED:
            case config.gameEvents.ENEMY_CLOSE:
                playEnemyWarning(data);
                break;
            case config.gameEvents.LOW_SANITY:
                playLowSanityWarning(data);
                break;
            case config.gameEvents.ABILITY_USE:
                playAbilitySound(data);
                break;
            case config.gameEvents.CRAFT_ITEM:
                playCraftSound();
                break;
            case config.gameEvents.TRAP_TRIGGERED:
                playTrapSound();
                break;
            case config.gameEvents.BOSS_SPAWN:
                playBossSpawnSound();
                break;
            case config.gameEvents.GAME_WIN:
                playWinSound();
                break;
            case config.gameEvents.GAME_OVER:
                playGameOverSound();
                break;
        }
        
        // Update music intensity based on event
        updateMusicIntensityForEvent(eventType);
    }

    /**
     * Pellet collect sound
     */
    function playPelletCollectSound(data) {
        if (typeof HorrorAudio !== 'undefined' && HorrorAudio.playCollect) {
            HorrorAudio.playCollect();
        }
        
        // Special sound for power pellets
        if (data.isPowerPellet && typeof ProceduralAudio !== 'undefined') {
            ProceduralAudio.generateChime(880, 0.3); // High A note
        }
    }

    /**
     * Enemy warning sound
     */
    function playEnemyWarning(data) {
        // Subtle heartbeat increase
        if (typeof HorrorAudioEnhanced !== 'undefined') {
            HorrorAudioEnhanced.increaseHeartbeat(10);
        }
        
        // Spatial warning sound if enemy close
        if (data.distance < 8 && typeof Advanced3DAudio !== 'undefined') {
            Advanced3DAudio.playSpatialWarning(data.position);
        }
    }

    /**
     * Low sanity warning
     */
    function playLowSanityWarning(data) {
        // Distortion effect
        if (typeof ProceduralAudio !== 'undefined') {
            ProceduralAudio.generateDistortion(0.5);
        }
        
        // Whisper sounds
        if (Math.random() < 0.3) {
            ProceduralAudio.generateWhisper();
        }
    }

    /**
     * Ability use sound
     */
    function playAbilitySound(data) {
        var sounds = {
            'time_dilation': function() {
                // Slow motion woosh
                if (typeof ProceduralAudio !== 'undefined') {
                    ProceduralAudio.generateSweep(400, 200, 1.0);
                }
            },
            'possession': function() {
                // Eerie possession sound
                if (typeof ProceduralAudio !== 'undefined') {
                    ProceduralAudio.generatePossessionEffect();
                }
            },
            'blackout_bomb': function() {
                // Explosion + darkness
                if (typeof HorrorAudio !== 'undefined') {
                    HorrorAudio.playJumpScare();
                }
            },
            'decoy': function() {
                // Loud noise
                if (typeof HorrorAudio !== 'undefined') {
                    HorrorAudio.playFootstep('metal');
                }
            },
            'phase_shift': function() {
                // Phasing sound
                if (typeof ProceduralAudio !== 'undefined') {
                    ProceduralAudio.generatePhaseShift();
                }
            }
        };
        
        if (sounds[data.abilityId]) {
            sounds[data.abilityId]();
        }
    }

    /**
     * Craft item sound
     */
    function playCraftSound() {
        if (typeof ProceduralAudio !== 'undefined') {
            ProceduralAudio.generateCraftSound();
        }
    }

    /**
     * Trap triggered sound
     */
    function playTrapSound() {
        if (typeof HorrorAudio !== 'undefined') {
            HorrorAudio.playTrapTrigger();
        }
    }

    /**
     * Boss spawn sound
     */
    function playBossSpawnSound() {
        // Dramatic boss introduction
        if (typeof DynamicSoundtrack !== 'undefined') {
            DynamicSoundtrack.setIntensity(1.0); // Max intensity
        }
        
        if (typeof ProceduralAudio !== 'undefined') {
            ProceduralAudio.generateBossRoar();
        }
        
        // Jumpscare effect
        if (typeof HorrorAudio !== 'undefined') {
            HorrorAudio.playJumpScare();
        }
    }

    /**
     * Win sound
     */
    function playWinSound() {
        if (typeof HorrorAudio !== 'undefined') {
            HorrorAudio.playWin();
        }
        
        // Triumphant music
        if (typeof DynamicSoundtrack !== 'undefined') {
            DynamicSoundtrack.playResolution();
        }
    }

    /**
     * Game over sound
     */
    function playGameOverSound() {
        if (typeof HorrorAudio !== 'undefined') {
            HorrorAudio.playDeath();
        }
        
        // Fade out music
        if (typeof DynamicSoundtrack !== 'undefined') {
            DynamicSoundtrack.fadeOut(2.0);
        }
    }

    /**
     * Update music intensity for event
     */
    function updateMusicIntensityForEvent(eventType) {
        var intensityChanges = {
            'enemy_close': 0.3,
            'enemy_spotted': 0.2,
            'low_sanity': 0.15,
            'boss_spawn': 0.5,
            'trap_triggered': 0.1,
            'ability_use': 0.05
        };
        
        if (intensityChanges[eventType]) {
            state.musicIntensity = Math.min(1.0, state.musicIntensity + intensityChanges[eventType]);
            
            if (typeof DynamicSoundtrack !== 'undefined') {
                DynamicSoundtrack.setIntensity(state.musicIntensity);
            }
        }
    }

    /**
     * Start dynamic music system
     */
    function startDynamicMusic() {
        if (typeof DynamicSoundtrack !== 'undefined') {
            DynamicSoundtrack.startDynamicMusic('ambient');
        }
    }

    /**
     * Load user audio preferences
     */
    function loadUserPreferences() {
        try {
            var saved = localStorage.getItem('audio_preferences');
            if (saved) {
                var prefs = JSON.parse(saved);
                state.currentQuality = prefs.quality || 'standard';
                
                // Apply quality preset
                applyQualityPreset(state.currentQuality);
            }
        } catch (e) {
            console.error('[Phase8AudioComplete] Failed to load preferences:', e);
        }
    }

    /**
     * Apply quality preset
     */
    function applyQualityPreset(quality) {
        var preset = config.qualityPresets[quality];
        if (!preset) return;
        
        // Update 3D audio config
        if (typeof Advanced3DAudio !== 'undefined') {
            Advanced3DAudio.config.hrtfEnabled = preset.hrtf;
            Advanced3DAudio.config.maxSounds = preset.maxSounds;
        }
        
        // Update soundtrack config
        if (typeof DynamicSoundtrack !== 'undefined') {
            DynamicSoundtrack.config.maxSimultaneousSounds = preset.maxSounds;
        }
        
        console.log('[Phase8AudioComplete] Applied quality preset:', quality);
    }

    /**
     * Set audio quality
     */
    function setAudioQuality(quality) {
        if (!config.qualityPresets[quality]) return false;
        
        state.currentQuality = quality;
        applyQualityPreset(quality);
        
        // Save preference
        try {
            localStorage.setItem('audio_preferences', JSON.stringify({
                quality: quality,
                timestamp: Date.now()
            }));
        } catch (e) {}
        
        return true;
    }

    /**
     * Calibrate HRTF for user
     */
    function calibrateHRTF() {
        if (typeof BinauralAudio !== 'undefined' && BinauralAudio.calibrateHRTF) {
            BinauralAudio.calibrateHRTF();
        } else {
            alert('HRTF calibration requires binaural audio support');
        }
    }

    /**
     * Get audio statistics
     */
    function getAudioStats() {
        return {
            quality: state.currentQuality,
            activeSounds: state.activeSounds,
            musicIntensity: state.musicIntensity,
            hrtfCalibrated: typeof BinauralAudio !== 'undefined' ? BinauralAudio.isCalibrated() : false,
            subsystems: {
                horrorAudio: typeof HorrorAudio !== 'undefined',
                advanced3D: typeof Advanced3DAudio !== 'undefined',
                dynamicSoundtrack: typeof DynamicSoundtrack !== 'undefined',
                proceduralAudio: typeof ProceduralAudio !== 'undefined',
                binauralAudio: typeof BinauralAudio !== 'undefined'
            }
        };
    }

    // Public API
    return {
        init: init,
        playGameEvent: playGameEvent,
        setAudioQuality: setAudioQuality,
        calibrateHRTF: calibrateHRTF,
        getAudioStats: getAudioStats,
        config: config,
        state: state
    };
})();

// Export to global scope
if (typeof window !== 'undefined') {
    window.Phase8AudioComplete = Phase8AudioComplete;
}

console.log('[Phase8AudioComplete] Module loaded - Ready for final audio polish');

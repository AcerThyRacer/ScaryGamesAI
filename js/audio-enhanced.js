/* ============================================
   ScaryGamesAI — Enhanced Horror Audio Engine
   Web Audio API with HRTF spatial audio,
   dynamic music, subtitle system, and
   tier-based audio features
   ============================================ */

const HorrorAudioEnhanced = (function () {
    'use strict';

    // ═══════════════════════════════════════════════════════════════
    // TIER FEATURES - Audio enhancements by subscription
    // ═══════════════════════════════════════════════════════════════

    const TIER_AUDIO_FEATURES = {
        none: {
            label: 'Free',
            hrtf: true, // Basic 3D audio
            hrtfQuality: 'low',
            dynamicMusic: false,
            musicLayers: 1,
            reverbQuality: 'basic',
            occlusion: false,
            voiceChat: false,
            subtitleLanguages: ['en'],
        },
        lite: { // Survivor - $2
            label: 'Survivor',
            hrtf: true,
            hrtfQuality: 'medium',
            dynamicMusic: true,
            musicLayers: 2,
            reverbQuality: 'standard',
            occlusion: true,
            voiceChat: false,
            subtitleLanguages: ['en'],
        },
        pro: { // Hunter - $5
            label: 'Hunter',
            hrtf: true,
            hrtfQuality: 'high',
            dynamicMusic: true,
            musicLayers: 4,
            reverbQuality: 'high',
            occlusion: true,
            voiceChat: true,
            subtitleLanguages: ['en', 'es', 'de', 'fr', 'pt', 'ja'],
        },
        max: { // Elder God - $8
            label: 'Elder God',
            hrtf: true,
            hrtfQuality: 'ultra',
            dynamicMusic: true,
            musicLayers: 6,
            reverbQuality: 'ultra',
            occlusion: true,
            voiceChat: true,
            subtitleLanguages: ['en', 'es', 'de', 'fr', 'pt', 'ja', 'ko', 'zh', 'ru', 'it'],
        },
    };

    // ═══════════════════════════════════════════════════════════════
    // CORE AUDIO CONTEXT
    // ═══════════════════════════════════════════════════════════════

    let ctx = null;
    let initialized = false;
    let currentTier = 'none';
    let features = TIER_AUDIO_FEATURES.none;

    // Master chain
    let masterGain = null;
    let compressor = null;
    let limiter = null;

    // Sub-channel gains
    let musicGain = null;
    let sfxGain = null;
    let ambienceGain = null;
    let voiceGain = null;
    let uiGain = null;

    // Reverb (convolution)
    let reverbNode = null;
    let reverbGain = null;
    let reverbIR = null;

    // Volume settings
    const volumes = {
        master: 0.6,
        music: 0.5,
        sfx: 0.7,
        ambience: 0.4,
        voice: 0.8,
        ui: 0.6,
    };

    // Listener state
    let listenerPosition = { x: 0, y: 0, z: 0 };
    let listenerOrientation = { fx: 0, fy: 0, fz: -1, ux: 0, uy: 1, uz: 0 };

    // Active sounds tracking
    let activeSounds = new Map();
    let soundIdCounter = 0;

    // ═══════════════════════════════════════════════════════════════
    // SUBTITLE SYSTEM
    // ═══════════════════════════════════════════════════════════════

    const subtitleConfig = {
        enabled: true,
        language: 'en',
        fontSize: 'medium', // small, medium, large
        background: 'semi-transparent', // none, semi-transparent, solid
        position: 'bottom', // top, bottom
        showSpeaker: true,
        duration: 4000, // ms
    };

    let subtitleQueue = [];
    let subtitleContainer = null;
    let currentSubtitle = null;

    const SUBTITLE_TRANSLATIONS = {
        en: {
            // Game event subtitles
            'monster_nearby': 'Something approaches...',
            'monster_attack': 'RUN!',
            'player_damage': 'Argh!',
            'player_death': 'You have died...',
            'pickup_key': 'Key collected',
            'pickup_health': 'Health restored',
            'door_locked': 'Door is locked',
            'door_unlocked': 'Door unlocked',
            'objective_new': 'New objective',
            'objective_complete': 'Objective complete',
            'safe_zone': 'You feel safer here',
            'danger_zone': 'The air feels heavy...',
            'checkpoint': 'Checkpoint reached',
            'boss_spawn': 'A terrifying presence awakens...',
            'heartbeat_fast': 'Your heart races...',
            'low_health': 'Critical condition!',
            'jumpscare': '!',
        },
        es: {
            'monster_nearby': 'Algo se acerca...',
            'monster_attack': '¡CORRE!',
            'player_damage': '¡Ay!',
            'player_death': 'Has muerto...',
            'pickup_key': 'Llave recogida',
            'pickup_health': 'Salud restaurada',
            'door_locked': 'La puerta está cerrada',
            'door_unlocked': 'Puerta abierta',
            'objective_new': 'Nuevo objetivo',
            'objective_complete': 'Objetivo completado',
            'safe_zone': 'Te sientes más seguro aquí',
            'danger_zone': 'El aire se siente pesado...',
            'checkpoint': 'Punto de control alcanzado',
            'boss_spawn': 'Una presencia aterradora despierta...',
            'heartbeat_fast': 'Tu corazón se acelera...',
            'low_health': '¡Condición crítica!',
            'jumpscare': '!',
        },
        de: {
            'monster_nearby': 'Etwas nähert sich...',
            'monster_attack': 'LAUF!',
            'player_damage': 'Autsch!',
            'player_death': 'Du bist gestorben...',
            'pickup_key': 'Schlüssel gesammelt',
            'pickup_health': 'Gesundheit wiederhergestellt',
            'door_locked': 'Tür ist verschlossen',
            'door_unlocked': 'Tür entriegelt',
            'objective_new': 'Neues Ziel',
            'objective_complete': 'Ziel erreicht',
            'safe_zone': 'Du fühlst dich hier sicherer',
            'danger_zone': 'Die Luft fühlt sich schwer an...',
            'checkpoint': 'Speicherpunkt erreicht',
            'boss_spawn': 'Eine erschreckende Präsenz erwacht...',
            'heartbeat_fast': 'Dein Herz rast...',
            'low_health': 'Kritischer Zustand!',
            'jumpscare': '!',
        },
        ja: {
            'monster_nearby': '何かが近づいている...',
            'monster_attack': '逃げろ！',
            'player_damage': 'ぐあっ！',
            'player_death': 'あなたは死んだ...',
            'pickup_key': '鍵を手に入れた',
            'pickup_health': '体力回復',
            'door_locked': 'ドアが閉まっている',
            'door_unlocked': 'ドアが開いた',
            'objective_new': '新しい目標',
            'objective_complete': '目標達成',
            'safe_zone': 'ここなら安全そうだ',
            'danger_zone': '空気が重い...',
            'checkpoint': 'チェックポイント',
            'boss_spawn': '恐ろしい存在が目覚める...',
            'heartbeat_fast': '心臓が早鐘を打つ...',
            'low_health': '危険状態！',
            'jumpscare': '！',
        },
    };

    function createSubtitleContainer() {
        if (subtitleContainer) return;

        subtitleContainer = document.createElement('div');
        subtitleContainer.id = 'ha-subtitle-container';
        subtitleContainer.className = `ha-subtitle-container ha-position-${subtitleConfig.position}`;
        document.body.appendChild(subtitleContainer);

        injectSubtitleStyles();
    }

    function injectSubtitleStyles() {
        if (document.getElementById('ha-subtitle-styles')) return;

        const style = document.createElement('style');
        style.id = 'ha-subtitle-styles';
        style.textContent = `
            .ha-subtitle-container {
                position: fixed;
                left: 50%;
                transform: translateX(-50%);
                z-index: 100000;
                pointer-events: none;
                font-family: 'Inter', -apple-system, sans-serif;
                text-align: center;
                max-width: 80%;
                min-width: 200px;
            }

            .ha-position-bottom {
                bottom: 15%;
            }

            .ha-position-top {
                top: 15%;
            }

            .ha-subtitle {
                display: inline-block;
                padding: 12px 24px;
                border-radius: 8px;
                font-weight: 500;
                line-height: 1.5;
                animation: ha-subtitle-fadeIn 0.3s ease;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
            }

            .ha-font-small { font-size: 16px; }
            .ha-font-medium { font-size: 20px; }
            .ha-font-large { font-size: 26px; }

            .ha-bg-none {
                background: transparent;
                color: #fff;
            }

            .ha-bg-semi {
                background: rgba(0, 0, 0, 0.7);
                color: #fff;
            }

            .ha-bg-solid {
                background: #000;
                color: #fff;
            }

            .ha-subtitle-fadeOut {
                animation: ha-subtitle-fadeOut 0.5s ease forwards;
            }

            .ha-speaker {
                display: block;
                font-size: 0.75em;
                color: var(--accent-red, #cc1122);
                margin-bottom: 4px;
                text-transform: uppercase;
                letter-spacing: 1px;
            }

            @keyframes ha-subtitle-fadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }

            @keyframes ha-subtitle-fadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }

            /* Audio Settings Panel */
            .ha-settings-panel {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) scale(0.9);
                background: rgba(10, 10, 20, 0.98);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 16px;
                padding: 24px;
                z-index: 1000000;
                min-width: 400px;
                max-width: 90vw;
                opacity: 0;
                pointer-events: none;
                transition: all 0.3s ease;
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
                font-family: 'Inter', -apple-system, sans-serif;
                color: #e8e6e3;
            }

            .ha-settings-panel.ha-open {
                opacity: 1;
                pointer-events: auto;
                transform: translate(-50%, -50%) scale(1);
            }

            .ha-settings-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 24px;
                padding-bottom: 16px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }

            .ha-settings-title {
                font-size: 1.25rem;
                font-weight: 600;
                color: var(--accent-red, #cc1122);
            }

            .ha-settings-close {
                background: none;
                border: none;
                color: #888;
                font-size: 1.5rem;
                cursor: pointer;
                padding: 0;
                line-height: 1;
            }

            .ha-settings-close:hover {
                color: #fff;
            }

            .ha-volume-group {
                margin-bottom: 20px;
            }

            .ha-volume-label {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
            }

            .ha-volume-name {
                font-size: 0.9rem;
                color: #aaa;
            }

            .ha-volume-value {
                font-size: 0.8rem;
                color: #666;
                font-family: monospace;
            }

            .ha-volume-slider {
                width: 100%;
                height: 6px;
                -webkit-appearance: none;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 3px;
                outline: none;
            }

            .ha-volume-slider::-webkit-slider-thumb {
                -webkit-appearance: none;
                width: 18px;
                height: 18px;
                border-radius: 50%;
                background: var(--accent-red, #cc1122);
                cursor: pointer;
                transition: transform 0.2s;
            }

            .ha-volume-slider::-webkit-slider-thumb:hover {
                transform: scale(1.2);
            }

            .ha-divider {
                height: 1px;
                background: rgba(255, 255, 255, 0.1);
                margin: 20px 0;
            }

            .ha-toggle-group {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 16px;
            }

            .ha-toggle-label {
                font-size: 0.9rem;
                color: #aaa;
            }

            .ha-toggle {
                width: 48px;
                height: 26px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 13px;
                position: relative;
                cursor: pointer;
                transition: background 0.3s;
            }

            .ha-toggle.ha-active {
                background: var(--accent-red, #cc1122);
            }

            .ha-toggle::after {
                content: '';
                position: absolute;
                width: 20px;
                height: 20px;
                background: #fff;
                border-radius: 50%;
                top: 3px;
                left: 3px;
                transition: transform 0.3s;
            }

            .ha-toggle.ha-active::after {
                transform: translateX(22px);
            }

            .ha-select-group {
                margin-bottom: 16px;
            }

            .ha-select-label {
                display: block;
                font-size: 0.9rem;
                color: #aaa;
                margin-bottom: 8px;
            }

            .ha-select {
                width: 100%;
                padding: 10px 14px;
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 8px;
                color: #fff;
                font-size: 0.9rem;
                cursor: pointer;
            }

            .ha-select:focus {
                outline: none;
                border-color: var(--accent-red, #cc1122);
            }

            .ha-tier-badge {
                display: inline-block;
                padding: 4px 10px;
                background: rgba(204, 17, 34, 0.2);
                border: 1px solid rgba(204, 17, 34, 0.3);
                border-radius: 4px;
                font-size: 0.7rem;
                color: var(--accent-red, #cc1122);
                margin-left: 8px;
            }

            .ha-locked {
                opacity: 0.5;
                pointer-events: none;
            }

            /* Audio visualizer in settings */
            .ha-visualizer {
                height: 40px;
                background: rgba(0, 0, 0, 0.3);
                border-radius: 8px;
                margin-top: 16px;
                display: flex;
                align-items: flex-end;
                justify-content: center;
                gap: 2px;
                padding: 8px;
            }

            .ha-viz-bar {
                width: 4px;
                background: linear-gradient(to top, var(--accent-red, #cc1122), var(--accent-purple, #8b5cf6));
                border-radius: 2px;
                transition: height 0.1s ease;
            }
        `;
        document.head.appendChild(style);
    }

    function showSubtitle(key, options = {}) {
        if (!subtitleConfig.enabled) return;

        const text = options.text || SUBTITLE_TRANSLATIONS[subtitleConfig.language]?.[key] || key;
        const speaker = options.speaker || null;
        const duration = options.duration || subtitleConfig.duration;
        const priority = options.priority || 0;

        const item = { text, speaker, duration, priority, id: Date.now() };
        subtitleQueue.push(item);

        // Sort by priority
        subtitleQueue.sort((a, b) => b.priority - a.priority);

        processSubtitleQueue();
    }

    function processSubtitleQueue() {
        if (currentSubtitle || subtitleQueue.length === 0) return;

        const item = subtitleQueue.shift();
        currentSubtitle = item;

        const el = document.createElement('div');
        el.className = `ha-subtitle ha-font-${subtitleConfig.fontSize} ha-bg-${subtitleConfig.background}`;

        if (item.speaker && subtitleConfig.showSpeaker) {
            el.innerHTML = `<span class="ha-speaker">${item.speaker}</span>${item.text}`;
        } else {
            el.textContent = item.text;
        }

        subtitleContainer.innerHTML = '';
        subtitleContainer.appendChild(el);

        setTimeout(() => {
            el.classList.add('ha-subtitle-fadeOut');
            setTimeout(() => {
                currentSubtitle = null;
                if (subtitleContainer.contains(el)) {
                    subtitleContainer.removeChild(el);
                }
                processSubtitleQueue();
            }, 500);
        }, item.duration);
    }

    // ═══════════════════════════════════════════════════════════════
    // DYNAMIC MUSIC SYSTEM
    // ═══════════════════════════════════════════════════════════════

    let musicState = {
        playing: false,
        intensity: 0, // 0-1
        layers: [],
        currentTheme: 'ambient',
    };

    const MUSIC_THEMES = {
        ambient: {
            baseFreq: 55,
            tempo: 60,
            layers: ['drone', 'pad', 'arp'],
        },
        chase: {
            baseFreq: 82,
            tempo: 140,
            layers: ['drone', 'pad', 'arp', 'perc'],
        },
        combat: {
            baseFreq: 110,
            tempo: 160,
            layers: ['drone', 'pad', 'arp', 'perc', 'bass'],
        },
        tension: {
            baseFreq: 65,
            tempo: 80,
            layers: ['drone', 'pad'],
        },
        safe: {
            baseFreq: 49,
            tempo: 50,
            layers: ['pad'],
        },
        boss: {
            baseFreq: 73,
            tempo: 100,
            layers: ['drone', 'pad', 'arp', 'perc', 'bass', 'lead'],
        },
    };

    function createDynamicMusic() {
        if (!features.dynamicMusic) return;

        const theme = MUSIC_THEMES[musicState.currentTheme];
        const activeLayers = theme.layers.slice(0, features.musicLayers);

        musicState.layers.forEach(layer => {
            if (layer && layer.stop) {
                try { layer.stop(); } catch (e) {}
            }
        });
        musicState.layers = [];

        activeLayers.forEach((layerType, index) => {
            const layer = createMusicLayer(layerType, theme, index);
            if (layer) musicState.layers.push(layer);
        });

        musicState.playing = true;
    }

    function createMusicLayer(type, theme, index) {
        const oscs = [];
        const gains = [];
        let mainGain = ctx.createGain();
        mainGain.gain.value = 0;
        mainGain.connect(musicGain);

        switch (type) {
            case 'drone':
                const droneOsc = ctx.createOscillator();
                droneOsc.type = 'sawtooth';
                droneOsc.frequency.value = theme.baseFreq;

                const droneOsc2 = ctx.createOscillator();
                droneOsc2.type = 'sawtooth';
                droneOsc2.frequency.value = theme.baseFreq * 1.005;

                const droneFilter = ctx.createBiquadFilter();
                droneFilter.type = 'lowpass';
                droneFilter.frequency.value = 200;

                const droneLfo = ctx.createOscillator();
                const droneLfoGain = ctx.createGain();
                droneLfo.frequency.value = 0.1;
                droneLfoGain.gain.value = 50;
                droneLfo.connect(droneLfoGain);
                droneLfoGain.connect(droneFilter.frequency);

                droneOsc.connect(droneFilter);
                droneOsc2.connect(droneFilter);
                droneFilter.connect(mainGain);

                droneOsc.start();
                droneOsc2.start();
                droneLfo.start();

                oscs.push(droneOsc, droneOsc2, droneLfo);
                break;

            case 'pad':
                const padFreqs = [theme.baseFreq, theme.baseFreq * 1.5, theme.baseFreq * 2];
                padFreqs.forEach(freq => {
                    const padOsc = ctx.createOscillator();
                    padOsc.type = 'sine';
                    padOsc.frequency.value = freq;

                    const padGain = ctx.createGain();
                    padGain.gain.value = 0.15;

                    padOsc.connect(padGain);
                    padGain.connect(mainGain);
                    padOsc.start();
                    oscs.push(padOsc);
                    gains.push(padGain);
                });
                break;

            case 'arp':
                const arpOsc = ctx.createOscillator();
                arpOsc.type = 'triangle';
                arpOsc.frequency.value = theme.baseFreq * 2;

                const arpGain = ctx.createGain();
                arpGain.gain.value = 0;

                const arpLfo = ctx.createOscillator();
                const arpLfoGain = ctx.createGain();
                arpLfo.frequency.value = theme.tempo / 60;
                arpLfoGain.gain.value = 0.1;
                arpLfo.connect(arpLfoGain);
                arpLfoGain.connect(arpGain.gain);

                const arpFilter = ctx.createBiquadFilter();
                arpFilter.type = 'lowpass';
                arpFilter.frequency.value = 1500;

                arpOsc.connect(arpFilter);
                arpFilter.connect(arpGain);
                arpGain.connect(mainGain);

                arpOsc.start();
                arpLfo.start();
                oscs.push(arpOsc, arpLfo);
                break;

            case 'perc':
                const noiseBuffer = createNoiseBuffer(0.1, 'white');
                const percGain = ctx.createGain();
                percGain.gain.value = 0;

                const percLfo = ctx.createOscillator();
                const percLfoGain = ctx.createGain();
                percLfo.frequency.value = theme.tempo / 60 / 2;
                percLfoGain.gain.value = 0.08;
                percLfo.connect(percLfoGain);
                percLfoGain.connect(percGain.gain);

                // Create looping percussive noise
                const percSrc = ctx.createBufferSource();
                percSrc.buffer = noiseBuffer;
                percSrc.loop = true;
                percSrc.loopStart = 0;
                percSrc.loopEnd = 60 / theme.tempo;

                const percFilter = ctx.createBiquadFilter();
                percFilter.type = 'highpass';
                percFilter.frequency.value = 1000;

                percSrc.connect(percFilter);
                percFilter.connect(percGain);
                percGain.connect(mainGain);

                percSrc.start();
                percLfo.start();
                oscs.push(percSrc, percLfo);
                break;

            case 'bass':
                const bassOsc = ctx.createOscillator();
                bassOsc.type = 'sine';
                bassOsc.frequency.value = theme.baseFreq / 2;

                const bassGain = ctx.createGain();
                bassGain.gain.value = 0.2;

                const bassLfo = ctx.createOscillator();
                const bassLfoGain = ctx.createGain();
                bassLfo.frequency.value = theme.tempo / 60;
                bassLfoGain.gain.value = 0.1;
                bassLfo.connect(bassLfoGain);
                bassLfoGain.connect(bassGain.gain);

                bassOsc.connect(bassGain);
                bassGain.connect(mainGain);

                bassOsc.start();
                bassLfo.start();
                oscs.push(bassOsc, bassLfo);
                break;

            case 'lead':
                const leadOsc = ctx.createOscillator();
                leadOsc.type = 'square';
                leadOsc.frequency.value = theme.baseFreq * 4;

                const leadGain = ctx.createGain();
                leadGain.gain.value = 0;

                const leadLfo = ctx.createOscillator();
                const leadLfoGain = ctx.createGain();
                leadLfo.frequency.value = 4;
                leadLfoGain.gain.value = 20;
                leadLfo.connect(leadLfoGain);
                leadLfoGain.connect(leadOsc.frequency);

                const leadFilter = ctx.createBiquadFilter();
                leadFilter.type = 'lowpass';
                leadFilter.frequency.value = 2000;
                leadFilter.Q.value = 5;

                leadOsc.connect(leadFilter);
                leadFilter.connect(leadGain);
                leadGain.connect(mainGain);

                leadOsc.start();
                leadLfo.start();
                oscs.push(leadOsc, leadLfo);
                break;
        }

        // Fade in
        mainGain.gain.setTargetAtTime(0.15 * (1 - index * 0.1), ctx.currentTime, 1);

        return {
            stop: () => {
                mainGain.gain.setTargetAtTime(0, ctx.currentTime, 0.5);
                setTimeout(() => {
                    oscs.forEach(osc => {
                        try { osc.stop(); } catch (e) {}
                    });
                }, 1000);
            },
            setIntensity: (intensity) => {
                // Intensity affects volume and possibly filter
                const vol = 0.1 + intensity * 0.2;
                mainGain.gain.setTargetAtTime(vol, ctx.currentTime, 0.3);
            },
        };
    }

    function setMusicTheme(themeName) {
        if (!MUSIC_THEMES[themeName]) return;
        musicState.currentTheme = themeName;
        if (musicState.playing) {
            createDynamicMusic();
        }
    }

    function setMusicIntensity(intensity) {
        musicState.intensity = Math.max(0, Math.min(1, intensity));
        musicState.layers.forEach(layer => {
            if (layer && layer.setIntensity) {
                layer.setIntensity(musicState.intensity);
            }
        });
    }

    function startDynamicMusic(theme = 'ambient') {
        if (!features.dynamicMusic) {
            // Fallback to basic drone
            startDrone(55, 'dark');
            return;
        }
        musicState.currentTheme = theme;
        createDynamicMusic();
    }

    function stopDynamicMusic() {
        musicState.layers.forEach(layer => {
            if (layer && layer.stop) layer.stop();
        });
        musicState.layers = [];
        musicState.playing = false;
    }

    // ═══════════════════════════════════════════════════════════════
    // HRTF SPATIAL AUDIO
    // ═══════════════════════════════════════════════════════════════

    function createSpatialSound(options = {}) {
        ensureContext();

        const panner = ctx.createPanner();

        // HRTF quality based on tier
        const qualitySettings = {
            low: { refDistance: 1, maxDistance: 20, rolloff: 2 },
            medium: { refDistance: 1, maxDistance: 50, rolloff: 1.5 },
            high: { refDistance: 1, maxDistance: 100, rolloff: 1.2 },
            ultra: { refDistance: 1, maxDistance: 200, rolloff: 1 },
        };

        const qs = qualitySettings[features.hrtfQuality] || qualitySettings.low;

        panner.panningModel = 'HRTF';
        panner.distanceModel = 'exponential';
        panner.refDistance = options.refDistance || qs.refDistance;
        panner.maxDistance = options.maxDistance || qs.maxDistance;
        panner.rolloffFactor = options.rolloffFactor || qs.rolloff;
        panner.coneInnerAngle = options.coneInnerAngle || 360;
        panner.coneOuterAngle = options.coneOuterAngle || 360;
        panner.coneOuterGain = options.coneOuterGain || 0;

        // Optional reverb send
        let reverbSend = null;
        if (reverbGain && options.reverb) {
            reverbSend = ctx.createGain();
            reverbSend.gain.value = options.reverbWet || 0.3;
            panner.connect(reverbSend);
            reverbSend.connect(reverbGain);
        }

        panner.connect(sfxGain);

        const soundId = ++soundIdCounter;
        let source = null;
        let gainNode = null;
        let isPlaying = false;

        return {
            id: soundId,

            setPosition: (x, y, z) => {
                if (panner.positionX) {
                    panner.positionX.setTargetAtTime(x, ctx.currentTime, 0.1);
                    panner.positionY.setTargetAtTime(y, ctx.currentTime, 0.1);
                    panner.positionZ.setTargetAtTime(z, ctx.currentTime, 0.1);
                } else {
                    panner.setPosition(x, y, z);
                }
            },

            setVelocity: (vx, vy, vz) => {
                // Doppler effect
                if (panner.velocityX) {
                    panner.velocityX.setValueAtTime(vx, ctx.currentTime);
                    panner.velocityY.setValueAtTime(vy, ctx.currentTime);
                    panner.velocityZ.setValueAtTime(vz, ctx.currentTime);
                }
            },

            setOrientation: (fx, fy, fz) => {
                if (panner.orientationX) {
                    panner.orientationX.setTargetAtTime(fx, ctx.currentTime, 0.1);
                    panner.orientationY.setTargetAtTime(fy, ctx.currentTime, 0.1);
                    panner.orientationZ.setTargetAtTime(fz, ctx.currentTime, 0.1);
                } else {
                    panner.setOrientation(fx, fy, fz);
                }
            },

            playBuffer: (buffer, volume = 1) => {
                if (isPlaying) return;
                source = ctx.createBufferSource();
                source.buffer = buffer;
                gainNode = ctx.createGain();
                gainNode.gain.value = volume;
                source.connect(gainNode);
                gainNode.connect(panner);
                source.start();
                isPlaying = true;
                source.onended = () => {
                    isPlaying = false;
                    activeSounds.delete(soundId);
                };
                activeSounds.set(soundId, { source, panner, gainNode });
            },

            playOscillator: (type, freq, duration, volume = 1) => {
                if (isPlaying) return;
                source = ctx.createOscillator();
                source.type = type;
                source.frequency.value = freq;
                gainNode = ctx.createGain();
                gainNode.gain.setValueAtTime(volume, ctx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
                source.connect(gainNode);
                gainNode.connect(panner);
                source.start();
                source.stop(ctx.currentTime + duration);
                isPlaying = true;
                source.onended = () => {
                    isPlaying = false;
                    activeSounds.delete(soundId);
                };
                activeSounds.set(soundId, { source, panner, gainNode });
            },

            stop: () => {
                if (source) {
                    try { source.stop(); } catch (e) {}
                }
                isPlaying = false;
                activeSounds.delete(soundId);
            },

            setVolume: (vol) => {
                if (gainNode) {
                    gainNode.gain.setTargetAtTime(vol, ctx.currentTime, 0.1);
                }
            },

            disconnect: () => {
                try {
                    panner.disconnect();
                    if (reverbSend) reverbSend.disconnect();
                } catch (e) {}
                activeSounds.delete(soundId);
            },
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // SOUND OCCLUSION (Pro+ feature)
    // ═══════════════════════════════════════════════════════════════

    function calculateOcclusion(sourcePos, listenerPos, obstacles = []) {
        if (!features.occlusion) return 1;

        // Simple ray-based occlusion
        let occlusion = 0;
        const dx = sourcePos.x - listenerPos.x;
        const dy = sourcePos.y - listenerPos.y;
        const dz = sourcePos.z - listenerPos.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        obstacles.forEach(obstacle => {
            // Check if obstacle is between source and listener
            // This is a simplified check - games would implement proper raycasting
            const toObstacle = Math.sqrt(
                Math.pow(obstacle.x - listenerPos.x, 2) +
                Math.pow(obstacle.y - listenerPos.y, 2) +
                Math.pow(obstacle.z - listenerPos.z, 2)
            );

            if (toObstacle < dist) {
                const dotProduct = (
                    (obstacle.x - listenerPos.x) * dx +
                    (obstacle.y - listenerPos.y) * dy +
                    (obstacle.z - listenerPos.z) * dz
                ) / (toObstacle * dist);

                if (dotProduct > 0.5) {
                    occlusion += obstacle.density || 0.3;
                }
            }
        });

        return Math.max(0.1, 1 - occlusion);
    }

    // ═══════════════════════════════════════════════════════════════
    // NOISE GENERATORS
    // ═══════════════════════════════════════════════════════════════

    function createNoiseBuffer(duration, type) {
        const sampleRate = ctx.sampleRate;
        const length = sampleRate * duration;
        const buffer = ctx.createBuffer(1, length, sampleRate);
        const data = buffer.getChannelData(0);

        if (type === 'white') {
            for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
        } else if (type === 'brown') {
            let last = 0;
            for (let i = 0; i < length; i++) {
                const w = Math.random() * 2 - 1;
                data[i] = (last + 0.02 * w) / 1.02;
                last = data[i];
                data[i] *= 3.5;
            }
        } else if (type === 'pink') {
            let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
            for (let i = 0; i < length; i++) {
                const w = Math.random() * 2 - 1;
                b0 = 0.99886 * b0 + w * 0.0555179;
                b1 = 0.99332 * b1 + w * 0.0750759;
                b2 = 0.96900 * b2 + w * 0.1538520;
                b3 = 0.86650 * b3 + w * 0.3104856;
                b4 = 0.55000 * b4 + w * 0.5329522;
                b5 = -0.7616 * b5 - w * 0.0168980;
                data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
                b6 = w * 0.115926;
            }
        }

        return buffer;
    }

    // ═══════════════════════════════════════════════════════════════
    // REVERB (Convolution)
    // ═══════════════════════════════════════════════════════════════

    function createReverbImpulse(duration, decay) {
        const sampleRate = ctx.sampleRate;
        const length = sampleRate * duration;
        const buffer = ctx.createBuffer(2, length, sampleRate);

        for (let channel = 0; channel < 2; channel++) {
            const data = buffer.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
            }
        }

        return buffer;
    }

    function initReverb() {
        if (!reverbNode) {
            reverbNode = ctx.createConvolver();
            reverbGain = ctx.createGain();
            reverbGain.gain.value = 0.2;

            // Create impulse based on quality
            const reverbSettings = {
                basic: { duration: 1, decay: 2 },
                standard: { duration: 2, decay: 2.5 },
                high: { duration: 3, decay: 2.8 },
                ultra: { duration: 5, decay: 3 },
            };

            const rs = reverbSettings[features.reverbQuality] || reverbSettings.basic;
            reverbIR = createReverbImpulse(rs.duration, rs.decay);
            reverbNode.buffer = reverbIR;

            reverbNode.connect(reverbGain);
            reverbGain.connect(masterGain);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════

    function init() {
        if (initialized) return;

        try {
            ctx = new (window.AudioContext || window.webkitAudioContext)();

            // Check user tier
            currentTier = localStorage.getItem('sgai-sub-tier') || 'none';
            features = TIER_AUDIO_FEATURES[currentTier] || TIER_AUDIO_FEATURES.none;

            // Master chain
            masterGain = ctx.createGain();
            masterGain.gain.value = volumes.master;

            compressor = ctx.createDynamicsCompressor();
            compressor.threshold.value = -24;
            compressor.knee.value = 30;
            compressor.ratio.value = 12;
            compressor.attack.value = 0.003;
            compressor.release.value = 0.25;

            limiter = ctx.createDynamicsCompressor();
            limiter.threshold.value = -3;
            limiter.knee.value = 0;
            limiter.ratio.value = 20;
            limiter.attack.value = 0.001;
            limiter.release.value = 0.1;

            // Sub-channel gains
            musicGain = ctx.createGain();
            musicGain.gain.value = volumes.music;

            sfxGain = ctx.createGain();
            sfxGain.gain.value = volumes.sfx;

            ambienceGain = ctx.createGain();
            ambienceGain.gain.value = volumes.ambience;

            voiceGain = ctx.createGain();
            voiceGain.gain.value = volumes.voice;

            uiGain = ctx.createGain();
            uiGain.gain.value = volumes.ui;

            // Connect chain
            musicGain.connect(compressor);
            sfxGain.connect(compressor);
            ambienceGain.connect(compressor);
            voiceGain.connect(compressor);
            uiGain.connect(compressor);

            compressor.connect(limiter);
            limiter.connect(masterGain);
            masterGain.connect(ctx.destination);

            // Initialize reverb
            initReverb();

            // Create subtitle container
            createSubtitleContainer();

            // Create settings panel
            createAudioSettingsPanel();

            initialized = true;

            console.log('[HorrorAudioEnhanced] Initialized — Tier:', features.label);
        } catch (e) {
            console.warn('[HorrorAudioEnhanced] Web Audio API not available:', e);
        }
    }

    function ensureContext() {
        if (!initialized) init();
        if (ctx && ctx.state === 'suspended') ctx.resume();
    }

    // ═══════════════════════════════════════════════════════════════
    // AUDIO SETTINGS PANEL
    // ═══════════════════════════════════════════════════════════════

    let settingsPanel = null;

    function createAudioSettingsPanel() {
        if (settingsPanel) return;

        settingsPanel = document.createElement('div');
        settingsPanel.className = 'ha-settings-panel';
        settingsPanel.id = 'ha-settings-panel';

        const availableLanguages = features.subtitleLanguages;
        const languageOptions = {
            en: 'English',
            es: 'Spanish',
            de: 'German',
            fr: 'French',
            pt: 'Portuguese',
            ja: 'Japanese',
            ko: 'Korean',
            zh: 'Chinese',
            ru: 'Russian',
            it: 'Italian',
        };

        settingsPanel.innerHTML = `
            <div class="ha-settings-header">
                <span class="ha-settings-title">Audio Settings</span>
                <button class="ha-settings-close" id="ha-close-btn">&times;</button>
            </div>

            <div class="ha-settings-content">
                <!-- Volume Controls -->
                <div class="ha-volume-group">
                    <div class="ha-volume-label">
                        <span class="ha-volume-name">Master Volume</span>
                        <span class="ha-volume-value" id="ha-master-val">${Math.round(volumes.master * 100)}%</span>
                    </div>
                    <input type="range" class="ha-volume-slider" id="ha-master" min="0" max="100" value="${volumes.master * 100}">
                </div>

                <div class="ha-volume-group">
                    <div class="ha-volume-label">
                        <span class="ha-volume-name">Music</span>
                        <span class="ha-volume-value" id="ha-music-val">${Math.round(volumes.music * 100)}%</span>
                    </div>
                    <input type="range" class="ha-volume-slider" id="ha-music" min="0" max="100" value="${volumes.music * 100}">
                </div>

                <div class="ha-volume-group">
                    <div class="ha-volume-label">
                        <span class="ha-volume-name">Sound Effects</span>
                        <span class="ha-volume-value" id="ha-sfx-val">${Math.round(volumes.sfx * 100)}%</span>
                    </div>
                    <input type="range" class="ha-volume-slider" id="ha-sfx" min="0" max="100" value="${volumes.sfx * 100}">
                </div>

                <div class="ha-volume-group">
                    <div class="ha-volume-label">
                        <span class="ha-volume-name">Ambience</span>
                        <span class="ha-volume-value" id="ha-ambience-val">${Math.round(volumes.ambience * 100)}%</span>
                    </div>
                    <input type="range" class="ha-volume-slider" id="ha-ambience" min="0" max="100" value="${volumes.ambience * 100}">
                </div>

                <div class="ha-volume-group">
                    <div class="ha-volume-label">
                        <span class="ha-volume-name">Voice</span>
                        <span class="ha-volume-value" id="ha-voice-val">${Math.round(volumes.voice * 100)}%</span>
                    </div>
                    <input type="range" class="ha-volume-slider" id="ha-voice" min="0" max="100" value="${volumes.voice * 100}">
                </div>

                <div class="ha-divider"></div>

                <!-- Subtitle Settings -->
                <div class="ha-toggle-group">
                    <span class="ha-toggle-label">Subtitles</span>
                    <div class="ha-toggle ${subtitleConfig.enabled ? 'ha-active' : ''}" id="ha-subtitles-toggle"></div>
                </div>

                <div class="ha-select-group">
                    <label class="ha-select-label">Subtitle Language</label>
                    <select class="ha-select" id="ha-language">
                        ${availableLanguages.map(lang =>
                            `<option value="${lang}" ${lang === subtitleConfig.language ? 'selected' : ''}>${languageOptions[lang] || lang}</option>`
                        ).join('')}
                    </select>
                </div>

                <div class="ha-select-group">
                    <label class="ha-select-label">Subtitle Size</label>
                    <select class="ha-select" id="ha-subtitle-size">
                        <option value="small" ${subtitleConfig.fontSize === 'small' ? 'selected' : ''}>Small</option>
                        <option value="medium" ${subtitleConfig.fontSize === 'medium' ? 'selected' : ''}>Medium</option>
                        <option value="large" ${subtitleConfig.fontSize === 'large' ? 'selected' : ''}>Large</option>
                    </select>
                </div>

                <div class="ha-divider"></div>

                <!-- Advanced Features -->
                <div class="ha-toggle-group ${!features.dynamicMusic ? 'ha-locked' : ''}">
                    <span class="ha-toggle-label">
                        Dynamic Music
                        ${!features.dynamicMusic ? '<span class="ha-tier-badge">Hunter+</span>' : ''}
                    </span>
                    <div class="ha-toggle ${features.dynamicMusic ? 'ha-active' : ''}" id="ha-dynamic-music-toggle"></div>
                </div>

                <div class="ha-toggle-group ${!features.occlusion ? 'ha-locked' : ''}">
                    <span class="ha-toggle-label">
                        Sound Occlusion
                        ${!features.occlusion ? '<span class="ha-tier-badge">Survivor+</span>' : ''}
                    </span>
                    <div class="ha-toggle ${features.occlusion ? 'ha-active' : ''}" id="ha-occlusion-toggle"></div>
                </div>

                <div class="ha-select-group ${features.hrtfQuality === 'low' ? 'ha-locked' : ''}">
                    <label class="ha-select-label">
                        HRTF Quality
                        ${features.hrtfQuality === 'low' ? '<span class="ha-tier-badge">Upgrade for better</span>' : ''}
                    </label>
                    <select class="ha-select" id="ha-hrtf-quality">
                        <option value="low" ${features.hrtfQuality === 'low' ? 'selected' : ''}>Low</option>
                        <option value="medium" ${features.hrtfQuality === 'medium' ? 'selected' : ''} ${currentTier === 'none' ? 'disabled' : ''}>Medium</option>
                        <option value="high" ${features.hrtfQuality === 'high' ? 'selected' : ''} ${currentTier !== 'pro' && currentTier !== 'max' ? 'disabled' : ''}>High</option>
                        <option value="ultra" ${features.hrtfQuality === 'ultra' ? 'selected' : ''} ${currentTier !== 'max' ? 'disabled' : ''}>Ultra</option>
                    </select>
                </div>

                <!-- Audio Visualizer -->
                <div class="ha-visualizer" id="ha-visualizer">
                    ${Array(20).fill(0).map(() => '<div class="ha-viz-bar" style="height: 4px;"></div>').join('')}
                </div>
            </div>
        `;

        document.body.appendChild(settingsPanel);

        // Event listeners
        document.getElementById('ha-close-btn').addEventListener('click', toggleSettings);

        // Volume sliders
        ['master', 'music', 'sfx', 'ambience', 'voice'].forEach(channel => {
            const slider = document.getElementById(`ha-${channel}`);
            const valueEl = document.getElementById(`ha-${channel}-val`);

            slider.addEventListener('input', (e) => {
                const vol = e.target.value / 100;
                volumes[channel] = vol;
                valueEl.textContent = `${e.target.value}%`;

                if (channel === 'master' && masterGain) {
                    masterGain.gain.setTargetAtTime(vol, ctx.currentTime, 0.05);
                } else if (channel === 'music' && musicGain) {
                    musicGain.gain.setTargetAtTime(vol, ctx.currentTime, 0.05);
                } else if (channel === 'sfx' && sfxGain) {
                    sfxGain.gain.setTargetAtTime(vol, ctx.currentTime, 0.05);
                } else if (channel === 'ambience' && ambienceGain) {
                    ambienceGain.gain.setTargetAtTime(vol, ctx.currentTime, 0.05);
                } else if (channel === 'voice' && voiceGain) {
                    voiceGain.gain.setTargetAtTime(vol, ctx.currentTime, 0.05);
                }

                // Save to localStorage
                localStorage.setItem('ha-volumes', JSON.stringify(volumes));
            });
        });

        // Subtitle toggle
        document.getElementById('ha-subtitles-toggle').addEventListener('click', (e) => {
            subtitleConfig.enabled = !subtitleConfig.enabled;
            e.target.classList.toggle('ha-active', subtitleConfig.enabled);
        });

        // Language select
        document.getElementById('ha-language').addEventListener('change', (e) => {
            subtitleConfig.language = e.target.value;
        });

        // Subtitle size
        document.getElementById('ha-subtitle-size').addEventListener('change', (e) => {
            subtitleConfig.fontSize = e.target.value;
        });

        // Load saved volumes
        const savedVolumes = localStorage.getItem('ha-volumes');
        if (savedVolumes) {
            try {
                const parsed = JSON.parse(savedVolumes);
                Object.assign(volumes, parsed);
                ['master', 'music', 'sfx', 'ambience', 'voice'].forEach(channel => {
                    const slider = document.getElementById(`ha-${channel}`);
                    const valueEl = document.getElementById(`ha-${channel}-val`);
                    slider.value = volumes[channel] * 100;
                    valueEl.textContent = `${Math.round(volumes[channel] * 100)}%`;
                });
            } catch (e) {}
        }
    }

    function toggleSettings() {
        ensureContext();
        if (settingsPanel) {
            settingsPanel.classList.toggle('ha-open');
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // LEGACY COMPATIBILITY (wraps old HorrorAudio API)
    // ═══════════════════════════════════════════════════════════════

    let heartbeatInterval = null;
    let currentAmbience = null;

    function playClick() {
        ensureContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(uiGain);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.1);
    }

    function playHover() {
        ensureContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, ctx.currentTime);
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
        osc.connect(gain);
        gain.connect(uiGain);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.06);
    }

    function playCollect() {
        ensureContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
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

        showSubtitle('pickup_key');
    }

    function playDeath() {
        ensureContext();
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
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

        showSubtitle('player_death');
    }

    function playJumpScare() {
        ensureContext();
        const buffer = createNoiseBuffer(0.4, 'white');
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.5, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 2000;
        src.connect(filter);
        filter.connect(gain);
        gain.connect(sfxGain);
        src.start(ctx.currentTime);

        const osc = ctx.createOscillator();
        const g2 = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(1200, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.5);
        g2.gain.setValueAtTime(0.3, ctx.currentTime);
        g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
        osc.connect(g2);
        g2.connect(sfxGain);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.6);

        showSubtitle('jumpscare', { priority: 10 });
    }

    function playWin() {
        ensureContext();
        const notes = [523, 659, 784, 1047];
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.15);
            gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.15);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.4);
            osc.connect(gain);
            gain.connect(musicGain);
            osc.start(ctx.currentTime + i * 0.15);
            osc.stop(ctx.currentTime + i * 0.15 + 0.4);
        });

        showSubtitle('objective_complete');
    }

    function startHeartbeat(bpm) {
        ensureContext();
        bpm = bpm || 70;
        if (heartbeatInterval) clearInterval(heartbeatInterval);

        function beat() {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(60, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
            osc.connect(gain);
            gain.connect(ambienceGain);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.15);

            setTimeout(() => {
                if (!ctx) return;
                const osc2 = ctx.createOscillator();
                const g2 = ctx.createGain();
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

        if (bpm > 120) {
            showSubtitle('heartbeat_fast');
        }
    }

    function setHeartbeatBPM(bpm) {
        if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            startHeartbeat(bpm);
        }
    }

    function stopHeartbeat() {
        if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            heartbeatInterval = null;
        }
    }

    function startDrone(baseFreq, type) {
        ensureContext();
        stopDrone();
        baseFreq = baseFreq || 55;
        type = type || 'dark';

        const drone = {};

        const osc1 = ctx.createOscillator();
        osc1.type = 'sawtooth';
        osc1.frequency.value = baseFreq;

        const osc2 = ctx.createOscillator();
        osc2.type = 'sawtooth';
        osc2.frequency.value = baseFreq * 1.005;

        const osc3 = ctx.createOscillator();
        osc3.type = 'sine';
        osc3.frequency.value = baseFreq / 2;

        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.frequency.value = 0.15;
        lfoGain.gain.value = 0.08;
        lfo.connect(lfoGain);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = type === 'underwater' ? 300 : type === 'wind' ? 600 : 200;
        filter.Q.value = 2;
        lfoGain.connect(filter.frequency);

        const gain = ctx.createGain();
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
            const drone = currentAmbience;
            if (drone.gain) drone.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.5);
            setTimeout(() => {
                if (drone.oscs) {
                    drone.oscs.forEach(osc => {
                        try { osc.stop(); } catch (e) {}
                    });
                }
            }, 2000);
            currentAmbience = null;
        }
    }

    function stopAll() {
        stopHeartbeat();
        stopDrone();
        stopDynamicMusic();
        activeSounds.forEach(sound => {
            if (sound && sound.stop) sound.stop();
        });
        activeSounds.clear();
    }

    function updateListener(x, y, z, fx, fy, fz, ux, uy, uz) {
        ensureContext();
        listenerPosition = { x, y, z };
        listenerOrientation = { fx, fy, fz, ux, uy, uz };

        if (ctx.listener.positionX) {
            const t = ctx.currentTime;
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

    // ═══════════════════════════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════════════════════════

    return {
        init: init,

        // Volume controls
        setVolume: (v) => {
            volumes.master = Math.max(0, Math.min(1, v));
            if (masterGain) masterGain.gain.setTargetAtTime(volumes.master, ctx.currentTime, 0.05);
        },
        getVolume: () => volumes.master,
        setMusicVolume: (v) => {
            volumes.music = v;
            if (musicGain) musicGain.gain.setTargetAtTime(v, ctx.currentTime, 0.05);
        },
        setSfxVolume: (v) => {
            volumes.sfx = v;
            if (sfxGain) sfxGain.gain.setTargetAtTime(v, ctx.currentTime, 0.05);
        },
        setAmbienceVolume: (v) => {
            volumes.ambience = v;
            if (ambienceGain) ambienceGain.gain.setTargetAtTime(v, ctx.currentTime, 0.05);
        },
        setVoiceVolume: (v) => {
            volumes.voice = v;
            if (voiceGain) voiceGain.gain.setTargetAtTime(v, ctx.currentTime, 0.05);
        },

        // Settings
        toggleSettings: toggleSettings,

        // SFX (legacy compatible)
        playClick: playClick,
        playHover: playHover,
        playCollect: playCollect,
        playDeath: playDeath,
        playJumpScare: playJumpScare,
        playWin: playWin,
        playFootstep: (surface) => ensureContext(),
        playJump: () => ensureContext(),
        playPowerup: () => ensureContext(),
        playHit: () => ensureContext(),

        // 3D Audio
        updateListener: updateListener,
        createSpatialSound: createSpatialSound,
        create3DSound: (type) => createSpatialSound({ type }), // Legacy alias
        calculateOcclusion: calculateOcclusion,

        // Dynamic Music
        startDynamicMusic: startDynamicMusic,
        stopDynamicMusic: stopDynamicMusic,
        setMusicTheme: setMusicTheme,
        setMusicIntensity: setMusicIntensity,

        // Ambience (legacy compatible)
        startHeartbeat: startHeartbeat,
        setHeartbeatBPM: setHeartbeatBPM,
        stopHeartbeat: stopHeartbeat,
        startDrone: startDrone,
        stopDrone: stopDrone,
        startWind: (intensity) => startDrone(60, 'wind'),
        stopWind: () => {},
        startUnderwaterAmbience: () => startDrone(40, 'underwater'),

        // Subtitles
        showSubtitle: showSubtitle,
        setSubtitleConfig: (config) => Object.assign(subtitleConfig, config),

        // Control
        stopAll: stopAll,

        // Tier features
        getFeatures: () => ({ ...features }),
        setTier: (tier) => {
            currentTier = tier;
            features = TIER_AUDIO_FEATURES[tier] || TIER_AUDIO_FEATURES.none;
            initReverb();
        },

        // Context access
        getContext: () => ctx,
    };
})();

// Auto-initialize on user interaction
document.addEventListener('click', () => {
    if (!HorrorAudioEnhanced.getContext()) {
        HorrorAudioEnhanced.init();
    }
}, { once: true });

// Export for global access (compatible with old HorrorAudio)
if (typeof window !== 'undefined') {
    window.HorrorAudioEnhanced = HorrorAudioEnhanced;
    // Keep backwards compatibility
    window.HorrorAudio = HorrorAudioEnhanced;
}

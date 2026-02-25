/* ============================================================
   HELLAPHOBIA - PHASE 10: ACCESSIBILITY FEATURES
   Visual | Audio | Cognitive | Motor Accessibility
   ============================================================ */

(function() {
    'use strict';

    // ===== PHASE 10: ACCESSIBILITY CONFIG =====
    const ACCESSIBILITY_CONFIG = {
        // Visual
        COLORBLIND_MODES: ['none', 'protanopia', 'deuteranopia', 'tritanopia'],
        HIGH_CONTRAST_COLORS: {
            player: '#00ffff',
            monster: '#ff00ff',
            hazard: '#ffff00',
            safe: '#00ff00'
        },
        
        // Audio
        VISUAL_SOUND_ENABLED: true,
        SUBTITLE_SIZE: ['small', 'medium', 'large', 'extra_large'],
        
        // Cognitive
        REDUCED_MOTION_ENABLED: false,
        SIMPLE_UI_ENABLED: false,
        HINTS_ENABLED: true,
        
        // Motor
        ONE_HANDED_MODE: false,
        AUTO_RUN_ENABLED: false,
        TOGGLE_INSTEAD_OF_HOLD: true
    };

    // ===== PHASE 10: VISUAL ACCESSIBILITY =====
    const VisualAccessibility = {
        colorblindMode: 'none',
        highContrast: false,
        screenShake: true,
        flashEffects: true,
        fontSize: 100,
        uiScale: 100,
        
        init() {
            this.loadSettings();
            this.applyColorblindMode();
            console.log('Phase 10: Visual Accessibility initialized');
        },

        // Set colorblind mode
        setColorblindMode(mode) {
            this.colorblindMode = mode;
            this.applyColorblindMode();
            this.saveSettings();
            EventTracker.track('accessibility_visual', { colorblindMode: mode });
        },

        // Apply colorblind mode filters
        applyColorblindMode() {
            const canvas = document.getElementById('game-canvas');
            if (!canvas) return;

            // Remove existing filters
            canvas.style.filter = canvas.style.filter.replace(/url\(#colorblind-[^\)]+\)/g, '').trim();

            if (this.colorblindMode !== 'none') {
                // Create SVG filter for colorblind simulation
                this.createColorblindFilter(this.colorblindMode);
                canvas.style.filter += ` url(#colorblind-${this.colorblindMode})`;
            }
        },

        // Create colorblind filter SVG
        createColorblindFilter(type) {
            if (document.getElementById(`colorblind-${type}`)) return;

            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.style.display = 'none';
            
            const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
            filter.id = `colorblind-${type}`;
            
            // Colorblind simulation matrices
            const matrices = {
                protanopia: [
                    0.567, 0.433, 0, 0, 0,
                    0.558, 0.442, 0, 0, 0,
                    0, 0.242, 0.758, 0, 0,
                    0, 0, 0, 1, 0
                ],
                deuteranopia: [
                    0.625, 0.375, 0, 0, 0,
                    0.7, 0.3, 0, 0, 0,
                    0, 0.3, 0.7, 0, 0,
                    0, 0, 0, 1, 0
                ],
                tritanopia: [
                    0.95, 0.05, 0, 0, 0,
                    0, 0.433, 0.567, 0, 0,
                    0, 0.475, 0.525, 0, 0,
                    0, 0, 0, 1, 0
                ]
            };

            const feColorMatrix = document.createElementNS('http://www.w3.org/2000/svg', 'feColorMatrix');
            feColorMatrix.setAttribute('type', 'matrix');
            feColorMatrix.setAttribute('values', matrices[type].join(' '));
            
            filter.appendChild(feColorMatrix);
            svg.appendChild(filter);
            document.body.appendChild(svg);
        },

        // Toggle high contrast mode
        setHighContrast(enabled) {
            this.highContrast = enabled;
            document.body.classList.toggle('high-contrast', enabled);
            
            if (enabled) {
                this.applyHighContrastColors();
            }
            
            this.saveSettings();
            EventTracker.track('accessibility_visual', { highContrast: enabled });
        },

        // Apply high contrast colors
        applyHighContrastColors() {
            if (typeof window.updatePlayerColors === 'function') {
                window.updatePlayerColors(
                    ACCESSIBILITY_CONFIG.HIGH_CONTRAST_COLORS.player,
                    ACCESSIBILITY_CONFIG.HIGH_CONTRAST_COLORS.player
                );
            }
        },

        // Toggle screen shake
        setScreenShake(enabled) {
            this.screenShake = enabled;
            this.saveSettings();
            EventTracker.track('accessibility_visual', { screenShake: enabled });
        },

        // Toggle flash effects
        setFlashEffects(enabled) {
            this.flashEffects = enabled;
            this.saveSettings();
            EventTracker.track('accessibility_visual', { flashEffects: enabled });
        },

        // Set font size
        setFontSize(size) {
            this.fontSize = size;
            document.documentElement.style.setProperty('--font-size', `${size}%`);
            this.saveSettings();
        },

        // Set UI scale
        setUIScale(scale) {
            this.uiScale = scale;
            document.documentElement.style.setProperty('--ui-scale', `${scale / 100}`);
            this.saveSettings();
        },

        // Save settings
        saveSettings() {
            localStorage.setItem('hellaphobia_visual_accessibility', JSON.stringify({
                colorblindMode: this.colorblindMode,
                highContrast: this.highContrast,
                screenShake: this.screenShake,
                flashEffects: this.flashEffects,
                fontSize: this.fontSize,
                uiScale: this.uiScale
            }));
        },

        // Load settings
        loadSettings() {
            const saved = localStorage.getItem('hellaphobia_visual_accessibility');
            if (saved) {
                const data = JSON.parse(saved);
                this.colorblindMode = data.colorblindMode || 'none';
                this.highContrast = data.highContrast || false;
                this.screenShake = data.screenShake !== false;
                this.flashEffects = data.flashEffects !== false;
                this.fontSize = data.fontSize || 100;
                this.uiScale = data.uiScale || 100;
            }
        },

        // Get current settings
        getSettings() {
            return {
                colorblindMode: this.colorblindMode,
                highContrast: this.highContrast,
                screenShake: this.screenShake,
                flashEffects: this.flashEffects,
                fontSize: this.fontSize,
                uiScale: this.uiScale
            };
        }
    };

    // ===== PHASE 10: AUDIO ACCESSIBILITY =====
    const AudioAccessibility = {
        visualSounds: true,
        subtitleSize: 'medium',
        monoAudio: false,
        audioDescriptions: false,
        hapticFeedback: true,
        
        init() {
            this.loadSettings();
            console.log('Phase 10: Audio Accessibility initialized');
        },

        // Toggle visual sound indicators
        setVisualSounds(enabled) {
            this.visualSounds = enabled;
            this.saveSettings();
            EventTracker.track('accessibility_audio', { visualSounds: enabled });
        },

        // Set subtitle size
        setSubtitleSize(size) {
            this.subtitleSize = size;
            document.documentElement.style.setProperty('--subtitle-size', this.getSubtitleFontSize(size));
            this.saveSettings();
        },

        // Get subtitle font size
        getSubtitleFontSize(size) {
            const sizes = {
                small: '12px',
                medium: '16px',
                large: '20px',
                extra_large: '24px'
            };
            return sizes[size] || sizes.medium;
        },

        // Toggle mono audio
        setMonoAudio(enabled) {
            this.monoAudio = enabled;
            // Apply Web Audio API mono conversion if enabled
            this.saveSettings();
            EventTracker.track('accessibility_audio', { monoAudio: enabled });
        },

        // Toggle audio descriptions
        setAudioDescriptions(enabled) {
            this.audioDescriptions = enabled;
            this.saveSettings();
            EventTracker.track('accessibility_audio', { audioDescriptions: enabled });
        },

        // Toggle haptic feedback
        setHapticFeedback(enabled) {
            this.hapticFeedback = enabled;
            this.saveSettings();
            EventTracker.track('accessibility_audio', { hapticFeedback: enabled });
        },

        // Trigger haptic feedback
        triggerHaptic(pattern = [50]) {
            if (!this.hapticFeedback) return;
            
            if (navigator.vibrate) {
                navigator.vibrate(pattern);
            }
        },

        // Show visual sound indicator
        showSoundIndicator(type, position) {
            if (!this.visualSounds) return;

            const indicators = {
                monster: '👁️',
                footsteps: '👣',
                ambient: '🌀',
                ui: '🔔',
                warning: '⚠️'
            };

            const symbol = indicators[type] || '🔊';
            
            // Create visual indicator
            this.createSoundIndicator(symbol, position);
        },

        // Create sound indicator element
        createSoundIndicator(symbol, position) {
            const indicator = document.createElement('div');
            indicator.className = 'sound-indicator';
            indicator.textContent = symbol;
            indicator.style.position = 'absolute';
            indicator.style.left = `${position.x}px`;
            indicator.style.top = `${position.y}px`;
            indicator.style.fontSize = '24px';
            indicator.style.pointerEvents = 'none';
            indicator.style.zIndex = '1000';
            indicator.style.animation = 'soundIndicator 1s ease-out forwards';
            
            document.body.appendChild(indicator);
            
            // Remove after animation
            setTimeout(() => indicator.remove(), 1000);
        },

        // Save settings
        saveSettings() {
            localStorage.setItem('hellaphobia_audio_accessibility', JSON.stringify({
                visualSounds: this.visualSounds,
                subtitleSize: this.subtitleSize,
                monoAudio: this.monoAudio,
                audioDescriptions: this.audioDescriptions,
                hapticFeedback: this.hapticFeedback
            }));
        },

        // Load settings
        loadSettings() {
            const saved = localStorage.getItem('hellaphobia_audio_accessibility');
            if (saved) {
                const data = JSON.parse(saved);
                this.visualSounds = data.visualSounds !== false;
                this.subtitleSize = data.subtitleSize || 'medium';
                this.monoAudio = data.monoAudio || false;
                this.audioDescriptions = data.audioDescriptions || false;
                this.hapticFeedback = data.hapticFeedback !== false;
            }
        },

        // Get current settings
        getSettings() {
            return {
                visualSounds: this.visualSounds,
                subtitleSize: this.subtitleSize,
                monoAudio: this.monoAudio,
                audioDescriptions: this.audioDescriptions,
                hapticFeedback: this.hapticFeedback
            };
        }
    };

    // ===== PHASE 10: COGNITIVE ACCESSIBILITY =====
    const CognitiveAccessibility = {
        reducedMotion: false,
        simpleUI: false,
        hintsEnabled: true,
        tutorialMode: true,
        pauseOnFocusLoss: true,
        colorCoding: true,
        
        init() {
            this.loadSettings();
            console.log('Phase 10: Cognitive Accessibility initialized');
        },

        // Toggle reduced motion
        setReducedMotion(enabled) {
            this.reducedMotion = enabled;
            document.body.classList.toggle('reduced-motion', enabled);
            this.saveSettings();
            EventTracker.track('accessibility_cognitive', { reducedMotion: enabled });
        },

        // Toggle simple UI
        setSimpleUI(enabled) {
            this.simpleUI = enabled;
            document.body.classList.toggle('simple-ui', enabled);
            this.saveSettings();
            EventTracker.track('accessibility_cognitive', { simpleUI: enabled });
        },

        // Toggle hints
        setHintsEnabled(enabled) {
            this.hintsEnabled = enabled;
            this.saveSettings();
            EventTracker.track('accessibility_cognitive', { hintsEnabled: enabled });
        },

        // Toggle tutorial mode
        setTutorialMode(enabled) {
            this.tutorialMode = enabled;
            this.saveSettings();
            EventTracker.track('accessibility_cognitive', { tutorialMode: enabled });
        },

        // Toggle pause on focus loss
        setPauseOnFocusLoss(enabled) {
            this.pauseOnFocusLoss = enabled;
            this.saveSettings();
        },

        // Toggle color coding
        setColorCoding(enabled) {
            this.colorCoding = enabled;
            this.saveSettings();
            EventTracker.track('accessibility_cognitive', { colorCoding: enabled });
        },

        // Show hint
        showHint(message, duration = 5000) {
            if (!this.hintsEnabled) return;

            const hintElement = document.createElement('div');
            hintElement.className = 'accessibility-hint';
            hintElement.textContent = message;
            hintElement.style.position = 'fixed';
            hintElement.style.bottom = '100px';
            hintElement.style.left = '50%';
            hintElement.style.transform = 'translateX(-50%)';
            hintElement.style.background = 'rgba(0, 0, 0, 0.8)';
            hintElement.style.color = '#fff';
            hintElement.style.padding = '12px 24px';
            hintElement.style.borderRadius = '8px';
            hintElement.style.zIndex = '10000';
            hintElement.style.fontSize = '14px';
            
            document.body.appendChild(hintElement);
            
            setTimeout(() => hintElement.remove(), duration);
        },

        // Save settings
        saveSettings() {
            localStorage.setItem('hellaphobia_cognitive_accessibility', JSON.stringify({
                reducedMotion: this.reducedMotion,
                simpleUI: this.simpleUI,
                hintsEnabled: this.hintsEnabled,
                tutorialMode: this.tutorialMode,
                pauseOnFocusLoss: this.pauseOnFocusLoss,
                colorCoding: this.colorCoding
            }));
        },

        // Load settings
        loadSettings() {
            const saved = localStorage.getItem('hellaphobia_cognitive_accessibility');
            if (saved) {
                const data = JSON.parse(saved);
                this.reducedMotion = data.reducedMotion || false;
                this.simpleUI = data.simpleUI || false;
                this.hintsEnabled = data.hintsEnabled !== false;
                this.tutorialMode = data.tutorialMode !== false;
                this.pauseOnFocusLoss = data.pauseOnFocusLoss !== false;
                this.colorCoding = data.colorCoding !== false;
            }
        },

        // Get current settings
        getSettings() {
            return {
                reducedMotion: this.reducedMotion,
                simpleUI: this.simpleUI,
                hintsEnabled: this.hintsEnabled,
                tutorialMode: this.tutorialMode,
                pauseOnFocusLoss: this.pauseOnFocusLoss,
                colorCoding: this.colorCoding
            };
        }
    };

    // ===== PHASE 10: MOTOR ACCESSIBILITY =====
    const MotorAccessibility = {
        oneHandedMode: false,
        autoRun: false,
        toggleInsteadOfHold: true,
        stickyKeys: false,
        inputDelay: 0,
        alternativeControls: true,
        
        init() {
            this.loadSettings();
            this.setupAlternativeControls();
            console.log('Phase 10: Motor Accessibility initialized');
        },

        // Toggle one-handed mode
        setOneHandedMode(enabled) {
            this.oneHandedMode = enabled;
            if (enabled) {
                this.applyOneHandedControls();
            }
            this.saveSettings();
            EventTracker.track('accessibility_motor', { oneHandedMode: enabled });
        },

        // Apply one-handed controls
        applyOneHandedControls() {
            // Remap controls for one-handed play
            // WASD -> Arrow keys, Actions -> nearby keys
            console.log('[Accessibility] One-handed mode enabled');
        },

        // Toggle auto-run
        setAutoRun(enabled) {
            this.autoRun = enabled;
            this.saveSettings();
            EventTracker.track('accessibility_motor', { autoRun: enabled });
        },

        // Toggle instead of hold
        setToggleInsteadOfHold(enabled) {
            this.toggleInsteadOfHold = enabled;
            this.saveSettings();
            EventTracker.track('accessibility_motor', { toggleInsteadOfHold: enabled });
        },

        // Toggle sticky keys
        setStickyKeys(enabled) {
            this.stickyKeys = enabled;
            this.saveSettings();
            EventTracker.track('accessibility_motor', { stickyKeys: enabled });
        },

        // Set input delay
        setInputDelay(delay) {
            this.inputDelay = delay;
            this.saveSettings();
        },

        // Toggle alternative controls
        setAlternativeControls(enabled) {
            this.alternativeControls = enabled;
            if (enabled) {
                this.setupAlternativeControls();
            }
            this.saveSettings();
        },

        // Setup alternative controls
        setupAlternativeControls() {
            if (!this.alternativeControls) return;

            // Enable touch controls
            if (typeof window.enableTouchControls === 'function') {
                window.enableTouchControls();
            }

            // Enable voice commands (if supported)
            if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
                this.setupVoiceCommands();
            }
        },

        // Setup voice commands
        setupVoiceCommands() {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SpeechRecognition) return;

            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = false;

            recognition.onresult = (event) => {
                const lastResult = event.results[event.results.length - 1];
                const command = lastResult[0].transcript.toLowerCase().trim();
                this.processVoiceCommand(command);
            };

            recognition.start();
            console.log('[Accessibility] Voice commands enabled');
        },

        // Process voice command
        processVoiceCommand(command) {
            const commands = {
                'jump': () => this.triggerCommand('jump'),
                'move left': () => this.triggerCommand('left'),
                'move right': () => this.triggerCommand('right'),
                'dash': () => this.triggerCommand('dash'),
                'attack': () => this.triggerCommand('attack'),
                'pause': () => this.triggerCommand('pause')
            };

            for (const [key, fn] of Object.entries(commands)) {
                if (command.includes(key)) {
                    fn();
                    break;
                }
            }
        },

        // Trigger command
        triggerCommand(command) {
            console.log('[Voice Command]', command);
            
            // Simulate key press based on command
            const keyMap = {
                jump: 'Space',
                left: 'ArrowLeft',
                right: 'ArrowRight',
                dash: 'ShiftLeft',
                attack: 'KeyJ',
                pause: 'Escape'
            };

            if (keyMap[command]) {
                window.dispatchEvent(new KeyboardEvent('keydown', { code: keyMap[command] }));
            }
        },

        // Save settings
        saveSettings() {
            localStorage.setItem('hellaphobia_motor_accessibility', JSON.stringify({
                oneHandedMode: this.oneHandedMode,
                autoRun: this.autoRun,
                toggleInsteadOfHold: this.toggleInsteadOfHold,
                stickyKeys: this.stickyKeys,
                inputDelay: this.inputDelay,
                alternativeControls: this.alternativeControls
            }));
        },

        // Load settings
        loadSettings() {
            const saved = localStorage.getItem('hellaphobia_motor_accessibility');
            if (saved) {
                const data = JSON.parse(saved);
                this.oneHandedMode = this.oneHandedMode || false;
                this.autoRun = data.autoRun || false;
                this.toggleInsteadOfHold = data.toggleInsteadOfHold !== false;
                this.stickyKeys = data.stickyKeys || false;
                this.inputDelay = data.inputDelay || 0;
                this.alternativeControls = data.alternativeControls !== false;
            }
        },

        // Get current settings
        getSettings() {
            return {
                oneHandedMode: this.oneHandedMode,
                autoRun: this.autoRun,
                toggleInsteadOfHold: this.toggleInsteadOfHold,
                stickyKeys: this.stickyKeys,
                inputDelay: this.inputDelay,
                alternativeControls: this.alternativeControls
            };
        }
    };

    // ===== PHASE 10: MAIN ACCESSIBILITY MANAGER =====
    const Phase10Accessibility = {
        initialized: false,
        profile: 'custom',

        init() {
            if (this.initialized) return;

            VisualAccessibility.init();
            AudioAccessibility.init();
            CognitiveAccessibility.init();
            MotorAccessibility.init();

            this.initialized = true;
            this.loadProfile();
            console.log('Phase 10: Accessibility System initialized');
        },

        // Apply accessibility profile
        applyProfile(profileName) {
            const profiles = {
                default: () => this.applyDefaultProfile(),
                visual_impairment: () => this.applyVisualImpairmentProfile(),
                hearing_impairment: () => this.applyHearingImpairmentProfile(),
                motor_impairment: () => this.applyMotorImpairmentProfile(),
                cognitive_impairment: () => this.applyCognitiveImpairmentProfile(),
                colorblind: () => this.applyColorblindProfile()
            };

            if (profiles[profileName]) {
                profiles[profileName]();
                this.profile = profileName;
                this.saveProfile();
                EventTracker.track('accessibility_profile_applied', { profile: profileName });
            }
        },

        // Default profile
        applyDefaultProfile() {
            VisualAccessibility.setHighContrast(false);
            VisualAccessibility.setScreenShake(true);
            AudioAccessibility.setVisualSounds(false);
            CognitiveAccessibility.setReducedMotion(false);
            MotorAccessibility.setOneHandedMode(false);
        },

        // Visual impairment profile
        applyVisualImpairmentProfile() {
            VisualAccessibility.setHighContrast(true);
            VisualAccessibility.setFontSize(150);
            VisualAccessibility.setUIScale(120);
            AudioAccessibility.setAudioDescriptions(true);
            CognitiveAccessibility.setHintsEnabled(true);
        },

        // Hearing impairment profile
        applyHearingImpairmentProfile() {
            AudioAccessibility.setVisualSounds(true);
            AudioAccessibility.setSubtitleSize('large');
            AudioAccessibility.setHapticFeedback(true);
            VisualAccessibility.setFlashEffects(false);
        },

        // Motor impairment profile
        applyMotorImpairmentProfile() {
            MotorAccessibility.setOneHandedMode(true);
            MotorAccessibility.setAutoRun(true);
            MotorAccessibility.setToggleInsteadOfHold(true);
            MotorAccessibility.setAlternativeControls(true);
            CognitiveAccessibility.setPauseOnFocusLoss(true);
        },

        // Cognitive impairment profile
        applyCognitiveImpairmentProfile() {
            CognitiveAccessibility.setReducedMotion(true);
            CognitiveAccessibility.setSimpleUI(true);
            CognitiveAccessibility.setHintsEnabled(true);
            CognitiveAccessibility.setTutorialMode(true);
            VisualAccessibility.setColorCoding(true);
        },

        // Colorblind profile
        applyColorblindProfile() {
            VisualAccessibility.setColorblindMode('deuteranopia');
            VisualAccessibility.setHighContrast(true);
            CognitiveAccessibility.setColorCoding(false);
        },

        // Save profile
        saveProfile() {
            localStorage.setItem('hellaphobia_accessibility_profile', this.profile);
        },

        // Load profile
        loadProfile() {
            const saved = localStorage.getItem('hellaphobia_accessibility_profile');
            if (saved) {
                this.applyProfile(saved);
            }
        },

        // Get all settings
        getAllSettings() {
            return {
                profile: this.profile,
                visual: VisualAccessibility.getSettings(),
                audio: AudioAccessibility.getSettings(),
                cognitive: CognitiveAccessibility.getSettings(),
                motor: MotorAccessibility.getSettings()
            };
        },

        // Reset to defaults
        resetToDefaults() {
            this.applyProfile('default');
            console.log('[Accessibility] Reset to default profile');
        }
    };

    // Export Phase 10 systems
    window.Phase10Accessibility = Phase10Accessibility;
    window.VisualAccessibility = VisualAccessibility;
    window.AudioAccessibility = AudioAccessibility;
    window.CognitiveAccessibility = CognitiveAccessibility;
    window.MotorAccessibility = MotorAccessibility;

})();

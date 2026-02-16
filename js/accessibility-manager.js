/* ============================================
   Accessibility Manager
   Universal accessibility support for ALL games
   - Colorblind modes
   - Screen reader announcements
   - Subtitles/captions
   - Reduced motion
   - UI scaling
   - High contrast mode
   ============================================ */

const AccessibilityManager = (function () {
    'use strict';

    // ── State ──────────────────────────────────────────────
    let _initialized = false;
    let _settings = {
        colorblindMode: 'none',      // none, protanopia, deuteranopia, tritanopia, achromatopsia
        screenReaderEnabled: false,
        subtitlesEnabled: true,
        reducedMotion: false,
        uiScale: 100,                 // 50-200%
        highContrast: false,
        largeText: false,
        flashReduction: false,       // Reduce flashing effects
        audioCues: true,             // Audio descriptions
    };

    let _announcementQueue = [];
    let _subtitleQueue = [];
    let _liveRegion = null;
    let _subtitleContainer = null;
    let _lastAnnouncement = '';
    let _settingsPanel = null;

    // ── Color Blindness Filters ─────────────────────────────────
    const COLORBLIND_FILTERS = {
        none: 'none',
        protanopia: 'url(#protanopia-filter)',
        deuteranopia: 'url(#deuteranopia-filter)',
        tritanopia: 'url(#tritanopia-filter)',
        achromatopsia: 'grayscale(100%)'
    };

    // Color replacements for colorblind-friendly rendering
    const COLOR_REPLACEMENTS = {
        protanopia: {
            // Red → Yellow/Orange
            '#ff0000': '#ffcc00',
            '#ff3333': '#ffcc33',
            '#ff4444': '#ffdd44',
            '#cc0000': '#cc9900',
            '#00ff00': '#00ffff', // Green → Cyan
        },
        deuteranopia: {
            // Green → Orange/Pink
            '#00ff00': '#ff9900',
            '#00cc00': '#cc7700',
            '#00ff44': '#ffaa44',
            '#ff0000': '#ff00ff', // Red → Magenta
        },
        tritanopia: {
            // Blue → Pink/Red
            '#0000ff': '#ff0088',
            '#0066ff': '#ff4488',
            '#4444ff': '#ff44aa',
        },
        achromatopsia: {
            // Use patterns instead of colors
        }
    };

    // ── Initialization ─────────────────────────────────────────
    function init() {
        if (_initialized) return;
        _initialized = true;

        // Load saved settings
        loadSettings();

        // Create live region for screen readers
        createLiveRegion();

        // Create subtitle container
        createSubtitleContainer();

        // Check system preferences
        detectSystemPreferences();

        // Apply initial settings
        applyAllSettings();

        // Add keyboard shortcuts
        addKeyboardShortcuts();

        // Create settings panel (hidden by default)
        createSettingsPanel();

        console.log('[Accessibility] Manager initialized', _settings);
    }

    function loadSettings() {
        try {
            const saved = localStorage.getItem('accessibility_settings');
            if (saved) {
                _settings = { ..._settings, ...JSON.parse(saved) };
            }
        } catch (e) {
            console.warn('[Accessibility] Could not load settings');
        }
    }

    function saveSettings() {
        try {
            localStorage.setItem('accessibility_settings', JSON.stringify(_settings));
        } catch (e) {
            console.warn('[Accessibility] Could not save settings');
        }
    }

    // ── System Preference Detection ────────────────────────────
    function detectSystemPreferences() {
        // Reduced motion
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            _settings.reducedMotion = true;
            console.log('[Accessibility] System prefers reduced motion');
        }

        // High contrast
        if (window.matchMedia('(prefers-contrast: more)').matches) {
            _settings.highContrast = true;
        }

        // Large text / increased font size
        if (window.matchMedia('(prefers-reduced-data: reduce)').matches) {
            // Could indicate preference for simpler UI
        }

        // Listen for changes
        window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
            _settings.reducedMotion = e.matches;
            applyReducedMotion();
        });

        window.matchMedia('(prefers-contrast: more)').addEventListener('change', (e) => {
            _settings.highContrast = e.matches;
            applyHighContrast();
        });
    }

    // ── Live Region (Screen Reader Announcements) ──────────────
    function createLiveRegion() {
        if (document.getElementById('a11y-live-region')) return;

        _liveRegion = document.createElement('div');
        _liveRegion.id = 'a11y-live-region';
        _liveRegion.setAttribute('role', 'status');
        _liveRegion.setAttribute('aria-live', 'polite');
        _liveRegion.setAttribute('aria-atomic', 'true');
        _liveRegion.className = 'sr-only';
        _liveRegion.style.cssText = `
            position: absolute;
            width: 1px;
            height: 1px;
            padding: 0;
            margin: -1px;
            overflow: hidden;
            clip: rect(0, 0, 0, 0);
            white-space: nowrap;
            border: 0;
        `;
        document.body.appendChild(_liveRegion);
    }

    // ── Focus Trap (Modal Dialog Safety) ────────────────────────
    var _focusTrap = {
        active: false,
        root: null,
        prevActive: null,
        onKeyDown: null,
        onFocusIn: null,
    };

    function getFocusableElements(root) {
        if (!root) return [];
        var selector = [
            'a[href]',
            'button:not([disabled])',
            'input:not([disabled])',
            'select:not([disabled])',
            'textarea:not([disabled])',
            '[tabindex]:not([tabindex=\"-1\"])'
        ].join(',');

        var nodes = Array.prototype.slice.call(root.querySelectorAll(selector));
        // Filter hidden/disabled-ish nodes
        return nodes.filter(function (el) {
            if (!el) return false;
            if (el.hasAttribute('disabled')) return false;
            if (el.getAttribute('aria-hidden') === 'true') return false;
            // Rough visibility check
            var rect = el.getBoundingClientRect ? el.getBoundingClientRect() : null;
            if (!rect) return true;
            return rect.width > 0 && rect.height > 0;
        });
    }

    /**
     * Trap focus inside a modal/root element. Call releaseFocusTrap() when closing.
     * @param {HTMLElement} root
     * @param {object} opts
     * @param {HTMLElement} opts.initialFocus
     * @param {function} opts.onEscape
     */
    function trapFocus(root, opts) {
        opts = opts || {};
        if (!root || _focusTrap.active) return;

        _focusTrap.active = true;
        _focusTrap.root = root;
        _focusTrap.prevActive = document.activeElement;

        _focusTrap.onKeyDown = function (ev) {
            if (!_focusTrap.active) return;
            if (!ev) return;

            if (ev.key === 'Escape') {
                if (typeof opts.onEscape === 'function') {
                    try { opts.onEscape(); } catch (e) { }
                }
                return;
            }

            if (ev.key !== 'Tab') return;

            var focusables = getFocusableElements(root);
            if (focusables.length === 0) {
                ev.preventDefault();
                return;
            }

            var first = focusables[0];
            var last = focusables[focusables.length - 1];
            var active = document.activeElement;

            if (ev.shiftKey) {
                if (active === first || !root.contains(active)) {
                    ev.preventDefault();
                    last.focus();
                }
            } else {
                if (active === last || !root.contains(active)) {
                    ev.preventDefault();
                    first.focus();
                }
            }
        };

        _focusTrap.onFocusIn = function (ev) {
            if (!_focusTrap.active) return;
            if (!ev || !ev.target) return;
            if (!root.contains(ev.target)) {
                var focusables = getFocusableElements(root);
                if (focusables.length > 0) focusables[0].focus();
            }
        };

        document.addEventListener('keydown', _focusTrap.onKeyDown, true);
        document.addEventListener('focusin', _focusTrap.onFocusIn, true);

        // Initial focus.
        setTimeout(function () {
            var target = opts.initialFocus || null;
            if (target && typeof target.focus === 'function') {
                try { target.focus({ preventScroll: true }); return; } catch (e) { }
            }
            var focusables = getFocusableElements(root);
            if (focusables.length > 0) {
                try { focusables[0].focus({ preventScroll: true }); } catch (e) { try { focusables[0].focus(); } catch (_) { } }
            } else {
                try { root.focus({ preventScroll: true }); } catch (e) { }
            }
        }, 0);
    }

    function releaseFocusTrap() {
        if (!_focusTrap.active) return;

        document.removeEventListener('keydown', _focusTrap.onKeyDown, true);
        document.removeEventListener('focusin', _focusTrap.onFocusIn, true);

        var prev = _focusTrap.prevActive;
        _focusTrap.active = false;
        _focusTrap.root = null;
        _focusTrap.prevActive = null;
        _focusTrap.onKeyDown = null;
        _focusTrap.onFocusIn = null;

        // Restore focus to where the user was (if still attached).
        try {
            if (prev && document.contains(prev) && typeof prev.focus === 'function') prev.focus({ preventScroll: true });
        } catch (e) { }
    }

    /**
     * Announce a message to screen readers
     * @param {string} message - The message to announce
     * @param {string} priority - 'polite' (default) or 'assertive'
     */
    function announce(message, priority = 'polite') {
        if (!message) return;

        // Always keep a live region available. If the user isn't using a screen reader,
        // this is effectively a no-op; if they are, it's critical.
        createLiveRegion();

        // Prevent duplicate announcements
        if (message === _lastAnnouncement) return;
        _lastAnnouncement = message;

        // Queue the announcement
        _announcementQueue.push({ message, priority });
        processAnnouncementQueue();
    }

    function processAnnouncementQueue() {
        if (_announcementQueue.length === 0) return;

        const { message, priority } = _announcementQueue.shift();

        if (_liveRegion) {
            _liveRegion.setAttribute('aria-live', priority);
            _liveRegion.textContent = '';

            // Small delay to ensure screen reader catches the change
            setTimeout(() => {
                _liveRegion.textContent = message;

                // Clear after announcement
                setTimeout(() => {
                    _lastAnnouncement = '';
                }, 1000);
            }, 50);
        }

        // Process next in queue
        if (_announcementQueue.length > 0) {
            setTimeout(processAnnouncementQueue, 500);
        }
    }

    // ── Subtitles / Captions ────────────────────────────────────
    function createSubtitleContainer() {
        if (document.getElementById('a11y-subtitles')) return;

        _subtitleContainer = document.createElement('div');
        _subtitleContainer.id = 'a11y-subtitles';
        _subtitleContainer.setAttribute('role', 'caption');
        _subtitleContainer.style.cssText = `
            position: fixed;
            bottom: calc(80px + env(safe-area-inset-bottom, 0px));
            left: 50%;
            transform: translateX(-50%);
            max-width: 80vw;
            padding: 12px 24px;
            background: rgba(0, 0, 0, 0.85);
            color: #fff;
            font-family: 'Inter', sans-serif;
            font-size: 18px;
            text-align: center;
            border-radius: 8px;
            z-index: 10000;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.3s;
        `;
        document.body.appendChild(_subtitleContainer);
    }

    /**
     * Show a subtitle/caption for audio cues
     * @param {string} text - The caption text
     * @param {number} duration - Duration in ms (default 3000)
     * @param {string} type - 'speech', 'sound', 'music'
     */
    function showSubtitle(text, duration = 3000, type = 'sound') {
        if (!_settings.subtitlesEnabled || !text) return;

        // Clear existing
        _subtitleContainer.innerHTML = '';

        // Add type icon
        const icons = {
            speech: '💬',
            sound: '🔊',
            music: '🎵',
            warning: '⚠️',
            info: 'ℹ️'
        };

        const icon = icons[type] || '';
        _subtitleContainer.innerHTML = icon ? `<span style="margin-right:8px">${icon}</span>${text}` : text;
        _subtitleContainer.style.opacity = '1';

        // Auto-hide
        setTimeout(() => {
            if (_subtitleContainer) {
                _subtitleContainer.style.opacity = '0';
            }
        }, duration);
    }

    // ── Color Blindness ─────────────────────────────────────────
    function applyColorblindFilter() {
        // Remove existing filter styles
        const existing = document.getElementById('a11y-colorblind-filter');
        if (existing) existing.remove();

        if (_settings.colorblindMode === 'none') {
            document.documentElement.style.filter = '';
            return;
        }

        // Create SVG filters for more accurate color blindness simulation
        const svgFilters = createColorblindSVGFilters();
        document.body.insertAdjacentHTML('afterbegin', svgFilters);

        // Apply CSS filter
        const style = document.createElement('style');
        style.id = 'a11y-colorblind-filter';

        if (_settings.colorblindMode === 'achromatopsia') {
            style.textContent = `
                html { filter: grayscale(100%); }
                .game-canvas, #game-canvas { filter: grayscale(100%); }
            `;
        } else {
            style.textContent = `
                html { filter: ${COLORBLIND_FILTERS[_settings.colorblindMode]}; }
            `;
        }

        document.head.appendChild(style);

        announce(`Color blind mode: ${_settings.colorblindMode}`);
    }

    function createColorblindSVGFilters() {
        return `
            <svg style="position:absolute;width:0;height:0;" aria-hidden="true">
                <defs>
                    <filter id="protanopia-filter">
                        <feColorMatrix type="matrix" values="
                            0.567, 0.433, 0,     0, 0
                            0.558, 0.442, 0,     0, 0
                            0,     0.242, 0.758, 0, 0
                            0,     0,     0,     1, 0
                        "/>
                    </filter>
                    <filter id="deuteranopia-filter">
                        <feColorMatrix type="matrix" values="
                            0.625, 0.375, 0,   0, 0
                            0.7,   0.3,   0,   0, 0
                            0,     0.3,   0.7, 0, 0
                            0,     0,     0,   1, 0
                        "/>
                    </filter>
                    <filter id="tritanopia-filter">
                        <feColorMatrix type="matrix" values="
                            0.95, 0.05,  0,     0, 0
                            0,    0.433, 0.567, 0, 0
                            0,    0.475, 0.525, 0, 0
                            0,    0,     0,     1, 0
                        "/>
                    </filter>
                </defs>
            </svg>
        `;
    }

    /**
     * Get a colorblind-friendly replacement for a color
     */
    function getAccessibleColor(originalColor, context = 'default') {
        if (_settings.colorblindMode === 'none') return originalColor;

        const replacements = COLOR_REPLACEMENTS[_settings.colorblindMode];
        if (!replacements) return originalColor;

        // Normalize color
        const normalized = originalColor.toLowerCase();

        // Direct match
        if (replacements[normalized]) {
            return replacements[normalized];
        }

        // Pattern-based for achromatopsia
        if (_settings.colorblindMode === 'achromatopsia') {
            return originalColor; // CSS filter handles it
        }

        return originalColor;
    }

    // ── Reduced Motion ──────────────────────────────────────────
    function applyReducedMotion() {
        const existing = document.getElementById('a11y-reduced-motion');
        if (existing) existing.remove();

        if (!_settings.reducedMotion) return;

        const style = document.createElement('style');
        style.id = 'a11y-reduced-motion';
        style.textContent = `
            *, *::before, *::after {
                animation-duration: 0.01ms !important;
                animation-iteration-count: 1 !important;
                transition-duration: 0.01ms !important;
                scroll-behavior: auto !important;
            }
            
            .particle, .particles-container, [class*="particle"] {
                display: none !important;
            }
            
            .shake, .vibrate, .wobble, .flash {
                animation: none !important;
            }
            
            .screen-flash, .damage-flash {
                opacity: 0.3 !important;
            }
            
            @keyframes none { }
        `;
        document.head.appendChild(style);

        announce('Reduced motion enabled');
    }

    // ── High Contrast Mode ──────────────────────────────────────
    function applyHighContrast() {
        const existing = document.getElementById('a11y-high-contrast');
        if (existing) existing.remove();

        if (!_settings.highContrast) {
            document.body.classList.remove('high-contrast');
            return;
        }

        document.body.classList.add('high-contrast');

        const style = document.createElement('style');
        style.id = 'a11y-high-contrast';
        style.textContent = `
            .high-contrast * {
                border-color: currentColor !important;
            }
            
            .high-contrast button,
            .high-contrast .btn,
            .high-contrast .play-btn,
            .high-contrast .start-btn {
                border: 3px solid currentColor !important;
                outline: 2px solid #fff !important;
                outline-offset: 2px;
            }
            
            .high-contrast #game-canvas {
                outline: 3px solid #fff !important;
            }
            
            .high-contrast .hud-item,
            .high-contrast .hud-score {
                background: #000 !important;
                color: #fff !important;
                border: 2px solid #fff !important;
            }
            
            .high-contrast .mc-btn {
                border-width: 3px !important;
            }
            
            .high-contrast .mc-joystick-ring {
                border-width: 4px !important;
            }
        `;
        document.head.appendChild(style);
    }

    // ── UI Scaling ──────────────────────────────────────────────
    function applyUIScale() {
        const existing = document.getElementById('a11y-ui-scale');
        if (existing) existing.remove();

        if (_settings.uiScale === 100) return;

        const scale = _settings.uiScale / 100;
        const style = document.createElement('style');
        style.id = 'a11y-ui-scale';
        style.textContent = `
            .game-hud,
            .hud-item,
            .hud-score,
            .hud-btn,
            .mc-btn,
            .mc-joystick-ring,
            .mc-btn-label,
            .start-screen,
            .game-over-screen,
            .game-win-screen,
            button,
            .btn {
                transform: scale(${scale});
                transform-origin: center;
            }
            
            .game-hud {
                font-size: calc(1em * ${scale}) !important;
            }
            
            .start-screen h1,
            .game-over-screen h1,
            .game-win-screen h1 {
                font-size: calc(2em * ${scale}) !important;
            }
            
            .game-desc,
            .game-over-screen p,
            .game-win-screen p {
                font-size: calc(1em * ${scale}) !important;
            }
            
            .mc-btn {
                width: calc(60px * ${scale}) !important;
                height: calc(60px * ${scale}) !important;
            }
            
            .mc-btn-icon {
                font-size: calc(22px * ${scale}) !important;
            }
        `;
        document.head.appendChild(style);

        announce(`UI scale: ${_settings.uiScale}%`);
    }

    // ── Large Text Mode ─────────────────────────────────────────
    function applyLargeText() {
        const existing = document.getElementById('a11y-large-text');
        if (existing) existing.remove();

        if (!_settings.largeText) return;

        const style = document.createElement('style');
        style.id = 'a11y-large-text';
        style.textContent = `
            body {
                font-size: 120% !important;
            }
            
            .hud-item,
            .hud-score {
                font-size: 1.1em !important;
            }
            
            .game-desc {
                font-size: 1.2em !important;
            }
            
            button, .btn {
                font-size: 1.1em !important;
            }
        `;
        document.head.appendChild(style);
    }

    // ── Flash Reduction ─────────────────────────────────────────
    function applyFlashReduction() {
        const existing = document.getElementById('a11y-flash-reduction');
        if (existing) existing.remove();

        if (!_settings.flashReduction) return;

        const style = document.createElement('style');
        style.id = 'a11y-flash-reduction';
        style.textContent = `
            .screen-flash,
            .damage-flash,
            .lightning-flash,
            .strobe {
                animation: none !important;
                opacity: 0.2 !important;
                transition: none !important;
            }
            
            .jumpscare-flash {
                opacity: 0.3 !important;
                transition: opacity 0.5s !important;
            }
            
            canvas {
                filter: brightness(0.9) contrast(0.95);
            }
        `;
        document.head.appendChild(style);
    }

    // ── Apply All Settings ──────────────────────────────────────
    function applyAllSettings() {
        applyColorblindFilter();
        applyReducedMotion();
        applyHighContrast();
        applyUIScale();
        applyLargeText();
        applyFlashReduction();
    }

    // ── Settings Panel ──────────────────────────────────────────
    function createSettingsPanel() {
        _settingsPanel = document.createElement('div');
        _settingsPanel.id = 'a11y-settings-panel';
        _settingsPanel.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 90%;
            max-width: 400px;
            max-height: 80vh;
            background: rgba(10, 10, 15, 0.98);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 16px;
            padding: 24px;
            z-index: 999999;
            font-family: 'Inter', sans-serif;
            color: #fff;
            overflow-y: auto;
            display: none;
        `;

        _settingsPanel.innerHTML = `
            <h2 style="margin:0 0 20px 0;font-size:20px;color:#ff6666;">♿ Accessibility Settings</h2>
            
            <div class="a11y-section">
                <h3 style="font-size:14px;color:#aaa;margin:0 0 12px 0;">Visual</h3>
                
                <label class="a11y-row">
                    <span>Color Blind Mode</span>
                    <select id="a11y-colorblind" style="flex:1;padding:8px;background:#222;border:1px solid #444;color:#fff;border-radius:4px;">
                        <option value="none">None</option>
                        <option value="protanopia">Protanopia (Red-Blind)</option>
                        <option value="deuteranopia">Deuteranopia (Green-Blind)</option>
                        <option value="tritanopia">Tritanopia (Blue-Blind)</option>
                        <option value="achromatopsia">Achromatopsia (Grayscale)</option>
                    </select>
                </label>
                
                <label class="a11y-row">
                    <span>High Contrast</span>
                    <input type="checkbox" id="a11y-contrast" style="width:20px;height:20px;">
                </label>
                
                <label class="a11y-row">
                    <span>Large Text</span>
                    <input type="checkbox" id="a11y-largetext" style="width:20px;height:20px;">
                </label>
                
                <label class="a11y-row">
                    <span>UI Scale: <span id="a11y-scale-value">100</span>%</span>
                    <input type="range" id="a11y-scale" min="50" max="200" value="100" style="flex:1;">
                </label>
                
                <label class="a11y-row">
                    <span>Reduce Flashing</span>
                    <input type="checkbox" id="a11y-flash" style="width:20px;height:20px;">
                </label>
            </div>
            
            <div class="a11y-section" style="margin-top:16px;">
                <h3 style="font-size:14px;color:#aaa;margin:0 0 12px 0;">Motion</h3>
                
                <label class="a11y-row">
                    <span>Reduced Motion</span>
                    <input type="checkbox" id="a11y-motion" style="width:20px;height:20px;">
                </label>
            </div>
            
            <div class="a11y-section" style="margin-top:16px;">
                <h3 style="font-size:14px;color:#aaa;margin:0 0 12px 0;">Audio & Captions</h3>
                
                <label class="a11y-row">
                    <span>Subtitles</span>
                    <input type="checkbox" id="a11y-subtitles" style="width:20px;height:20px;">
                </label>
                
                <label class="a11y-row">
                    <span>Screen Reader Announcements</span>
                    <input type="checkbox" id="a11y-screenreader" style="width:20px;height:20px;">
                </label>
            </div>
            
            <div style="margin-top:20px;display:flex;gap:10px;">
                <button id="a11y-save" style="flex:1;padding:12px;background:#cc2233;border:none;color:#fff;border-radius:8px;cursor:pointer;font-size:14px;">Save Settings</button>
                <button id="a11y-close" style="flex:1;padding:12px;background:#333;border:none;color:#fff;border-radius:8px;cursor:pointer;font-size:14px;">Close</button>
            </div>
            
            <style>
                .a11y-row { display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05); }
                .a11y-row span { font-size:14px; }
            </style>
        `;

        document.body.appendChild(_settingsPanel);

        // Event listeners
        document.getElementById('a11y-colorblind').addEventListener('change', (e) => {
            _settings.colorblindMode = e.target.value;
        });
        document.getElementById('a11y-contrast').addEventListener('change', (e) => {
            _settings.highContrast = e.target.checked;
        });
        document.getElementById('a11y-largetext').addEventListener('change', (e) => {
            _settings.largeText = e.target.checked;
        });
        document.getElementById('a11y-scale').addEventListener('input', (e) => {
            _settings.uiScale = parseInt(e.target.value);
            document.getElementById('a11y-scale-value').textContent = e.target.value;
        });
        document.getElementById('a11y-flash').addEventListener('change', (e) => {
            _settings.flashReduction = e.target.checked;
        });
        document.getElementById('a11y-motion').addEventListener('change', (e) => {
            _settings.reducedMotion = e.target.checked;
        });
        document.getElementById('a11y-subtitles').addEventListener('change', (e) => {
            _settings.subtitlesEnabled = e.target.checked;
        });
        document.getElementById('a11y-screenreader').addEventListener('change', (e) => {
            _settings.screenReaderEnabled = e.target.checked;
        });

        document.getElementById('a11y-save').addEventListener('click', () => {
            saveSettings();
            applyAllSettings();
            showPanel(false);
            announce('Accessibility settings saved');
        });

        document.getElementById('a11y-close').addEventListener('click', () => {
            showPanel(false);
        });
    }

    function showPanel(show = true) {
        if (!_settingsPanel) return;

        if (show) {
            // Populate current settings
            document.getElementById('a11y-colorblind').value = _settings.colorblindMode;
            document.getElementById('a11y-contrast').checked = _settings.highContrast;
            document.getElementById('a11y-largetext').checked = _settings.largeText;
            document.getElementById('a11y-scale').value = _settings.uiScale;
            document.getElementById('a11y-scale-value').textContent = _settings.uiScale;
            document.getElementById('a11y-flash').checked = _settings.flashReduction;
            document.getElementById('a11y-motion').checked = _settings.reducedMotion;
            document.getElementById('a11y-subtitles').checked = _settings.subtitlesEnabled;
            document.getElementById('a11y-screenreader').checked = _settings.screenReaderEnabled;

            _settingsPanel.style.display = 'block';
        } else {
            _settingsPanel.style.display = 'none';
        }
    }

    function togglePanel() {
        if (_settingsPanel.style.display === 'block') {
            showPanel(false);
        } else {
            showPanel(true);
        }
    }

    // ── Keyboard Shortcuts ──────────────────────────────────────
    function addKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Alt + A = Toggle accessibility panel
            if (e.altKey && e.code === 'KeyA') {
                e.preventDefault();
                togglePanel();
            }

            // Alt + S = Toggle subtitles
            if (e.altKey && e.code === 'KeyS') {
                e.preventDefault();
                _settings.subtitlesEnabled = !_settings.subtitlesEnabled;
                saveSettings();
                showSubtitle(_settings.subtitlesEnabled ? 'Subtitles ON' : 'Subtitles OFF', 2000);
            }

            // Alt + M = Toggle reduced motion
            if (e.altKey && e.code === 'KeyM') {
                e.preventDefault();
                _settings.reducedMotion = !_settings.reducedMotion;
                saveSettings();
                applyReducedMotion();
            }
        });
    }

    // ── Game Event Announcements ────────────────────────────────
    /**
     * Announce a game event
     */
    function announceGameEvent(eventType, data) {
        const messages = {
            'game_start': 'Game started',
            'game_over': `Game over. Score: ${data?.score || 0}`,
            'game_win': `You won! Score: ${data?.score || 0}`,
            'level_up': `Level ${data?.level || 1}`,
            'enemy_spawn': `${data?.enemyName || 'Enemy'} appeared`,
            'enemy_killed': `${data?.enemyName || 'Enemy'} defeated`,
            'item_collected': `${data?.itemName || 'Item'} collected`,
            'damage_taken': `Health: ${data?.health || 0}`,
            'low_health': 'Warning: Low health',
            'power_low': 'Warning: Power low',
            'door_closed': 'Door closed',
            'camera_switch': `Camera ${data?.camera || 1}`,
            'boss_appear': 'Boss approaching!',
            'boss_defeated': 'Boss defeated!',
        };

        const message = messages[eventType];
        if (message) {
            announce(message);
            if (_settings.subtitlesEnabled) {
                showSubtitle(message, 3000, 'info');
            }
        }
    }

    // ── Public API ──────────────────────────────────────────────
    return {
        init,
        announce,
        trapFocus,
        releaseFocusTrap,
        showSubtitle,
        announceGameEvent,
        showPanel,
        togglePanel,
        getAccessibleColor,
        
        // Getters
        getSettings: () => ({ ..._settings }),
        isReducedMotion: () => _settings.reducedMotion,
        isColorblindMode: () => _settings.colorblindMode !== 'none',
        isScreenReaderEnabled: () => _settings.screenReaderEnabled,
        areSubtitlesEnabled: () => _settings.subtitlesEnabled,
        getUIScale: () => _settings.uiScale,
        
        // Setters
        setColorblindMode: (mode) => {
            _settings.colorblindMode = mode;
            saveSettings();
            applyColorblindFilter();
        },
        setReducedMotion: (enabled) => {
            _settings.reducedMotion = enabled;
            saveSettings();
            applyReducedMotion();
        },
        setUIScale: (scale) => {
            _settings.uiScale = Math.max(50, Math.min(200, scale));
            saveSettings();
            applyUIScale();
        },
        setSubtitles: (enabled) => {
            _settings.subtitlesEnabled = enabled;
            saveSettings();
        },
        setHighContrast: (enabled) => {
            _settings.highContrast = enabled;
            saveSettings();
            applyHighContrast();
        },
        setFlashReduction: (enabled) => {
            _settings.flashReduction = enabled;
            saveSettings();
            applyFlashReduction();
        }
    };
})();

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => AccessibilityManager.init());
} else {
    AccessibilityManager.init();
}

// Export for global access
window.AccessibilityManager = AccessibilityManager;
window.A11y = AccessibilityManager; // Shorthand

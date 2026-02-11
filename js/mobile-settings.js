/* ============================================
   Mobile Settings — Touch Control Customization
   Settings gear icon for adjusting controls on touch
   ============================================ */
(function () {
    'use strict';

    if (typeof MobileControls === 'undefined' || !MobileControls.isMobile()) return;

    var STORAGE_KEY = 'mc_settings';
    var defaults = {
        opacity: 0.7,
        size: 1.0,
        haptic: true,
        sensitivity: 1.0,
        showIndicator: true,
    };
    var settings = {};
    try { settings = Object.assign({}, defaults, JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')); } catch (e) { settings = Object.assign({}, defaults); }

    function save() {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch (e) { }
    }

    // ── Build Settings Button ────────────────────────
    var btn = document.createElement('div');
    btn.className = 'mc-settings-btn';
    btn.innerHTML = '⚙';
    btn.title = 'Touch Settings';

    // ── Build Settings Panel ─────────────────────────
    var panel = document.createElement('div');
    panel.className = 'mc-settings-panel';
    panel.innerHTML = [
        '<div class="mc-settings-title">⚙ Touch Settings</div>',
        '<div class="mc-settings-row"><span>Opacity</span><input type="range" class="mc-settings-slider" id="mc-s-opacity" min="20" max="100" value="' + Math.round(settings.opacity * 100) + '"></div>',
        '<div class="mc-settings-row"><span>Size</span><input type="range" class="mc-settings-slider" id="mc-s-size" min="60" max="140" value="' + Math.round(settings.size * 100) + '"></div>',
        '<div class="mc-settings-row"><span>Sensitivity</span><input type="range" class="mc-settings-slider" id="mc-s-sens" min="30" max="200" value="' + Math.round(settings.sensitivity * 100) + '"></div>',
        '<div class="mc-settings-row"><span>Haptic</span><div class="mc-settings-toggle' + (settings.haptic ? ' on' : '') + '" id="mc-s-haptic"></div></div>',
        '<div class="mc-settings-row"><span>Touch Dot</span><div class="mc-settings-toggle' + (settings.showIndicator ? ' on' : '') + '" id="mc-s-indicator"></div></div>',
    ].join('');

    var isOpen = false;
    btn.addEventListener('click', function (e) {
        e.stopPropagation();
        isOpen = !isOpen;
        panel.classList.toggle('open', isOpen);
    });

    document.addEventListener('click', function () {
        if (isOpen) { isOpen = false; panel.classList.remove('open'); }
    });
    panel.addEventListener('click', function (e) { e.stopPropagation(); });

    // Apply settings to DOM
    function applySettings() {
        var container = document.querySelector('.mobile-controls-container');
        if (container) {
            container.style.opacity = settings.opacity;
            container.style.transform = 'scale(' + settings.size + ')';
            container.style.transformOrigin = 'bottom center';
        }

        // Scale joystick and buttons
        var joystickRing = document.querySelector('.mc-joystick-ring');
        if (joystickRing) {
            var baseSize = 120 * settings.size;
            joystickRing.style.width = baseSize + 'px';
            joystickRing.style.height = baseSize + 'px';
            joystickRing.style.left = (-baseSize / 2) + 'px';
            joystickRing.style.top = (-baseSize / 2) + 'px';
        }

        var buttons = document.querySelectorAll('.mc-btn');
        buttons.forEach(function (b) {
            var baseWidth = 60 * settings.size;
            b.style.width = baseWidth + 'px';
            b.style.height = baseWidth + 'px';
        });

        save();
    }

    // Wire up controls
    function wireControls() {
        var opSlider = document.getElementById('mc-s-opacity');
        if (opSlider) opSlider.addEventListener('input', function () {
            settings.opacity = parseInt(this.value) / 100;
            applySettings();
        });

        var szSlider = document.getElementById('mc-s-size');
        if (szSlider) szSlider.addEventListener('input', function () {
            settings.size = parseInt(this.value) / 100;
            applySettings();
        });

        var sensSlider = document.getElementById('mc-s-sens');
        if (sensSlider) sensSlider.addEventListener('input', function () {
            settings.sensitivity = parseInt(this.value) / 100;
            // Update MobileControls sensitivity if available
            if (MobileControls._lookSensitivity !== undefined) {
                MobileControls._lookSensitivity = 0.004 * settings.sensitivity;
            }
            save();
        });

        var hapticToggle = document.getElementById('mc-s-haptic');
        if (hapticToggle) hapticToggle.addEventListener('click', function () {
            settings.haptic = !settings.haptic;
            this.classList.toggle('on', settings.haptic);
            save();
        });

        var indicatorToggle = document.getElementById('mc-s-indicator');
        if (indicatorToggle) indicatorToggle.addEventListener('click', function () {
            settings.showIndicator = !settings.showIndicator;
            this.classList.toggle('on', settings.showIndicator);
            save();
        });
    }

    // ── Touch Indicator ──────────────────────────────
    var touchDot = document.createElement('div');
    touchDot.className = 'mc-touch-indicator';
    document.body.appendChild(touchDot);

    document.addEventListener('touchstart', function (e) {
        if (!settings.showIndicator) return;
        var t = e.touches[0];
        touchDot.style.left = t.clientX + 'px';
        touchDot.style.top = t.clientY + 'px';
        touchDot.classList.add('active');
        if (settings.haptic) { try { navigator.vibrate(10); } catch (e) { } }
    }, { passive: true });

    document.addEventListener('touchend', function () {
        touchDot.classList.remove('active');
    }, { passive: true });

    // ── Init ─────────────────────────────────────────
    function init() {
        document.body.appendChild(btn);
        document.body.appendChild(panel);
        wireControls();
        // Delay application to let MobileControls init first
        setTimeout(applySettings, 500);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

/* ============================================
   Mobile Controls — Universal Touch Input System
   Shared across ALL ScaryGamesAI games
   ============================================ */

const MobileControls = (function () {
    'use strict';

    // ── State ──────────────────────────────────────────────
    let _active = false;
    let _container = null;        // DOM container for controls
    let _config = {};
    let _isMobile = false;

    // Joystick state
    let _joystick = {
        el: null, thumb: null,
        active: false, id: null,
        ox: 0, oy: 0,      // origin (center of joystick)
        dx: 0, dy: 0,      // delta from center (-1 to 1)
        angle: 0,           // radians
        magnitude: 0,       // 0‑1
        radius: 55,
    };

    // Look‑touch state (right half of screen for FPS)
    let _look = {
        active: false, id: null,
        startX: 0, startY: 0,
        dx: 0, dy: 0,       // frame delta (pixels)
        sensitivity: 0.004,
    };

    // Buttons
    let _buttons = {};       // { id: { el, pressed, justPressed } }
    let _buttonDefs = [];    // user‑provided config

    // Swipe state
    let _swipe = {
        active: false, id: null,
        startX: 0, startY: 0,
        dir: null,           // 'left','right','up','down' or null
        triggered: false,
    };

    // Callbacks
    let _onSwipe = null;
    let _onPinch = null;

    // Pinch state
    let _pinch = { active: false, startDist: 0, scale: 1 };

    // Landscape overlay
    let _landscapeOverlay = null;

    // ── Helpers ────────────────────────────────────────────
    function isTouchDevice() {
        // Must have touch capability
        var hasTouch = ('ontouchstart' in window) ||
            (navigator.maxTouchPoints > 0);
        if (!hasTouch) return false;

        // UA-based mobile detection (reliable)
        if (/Mobi|Android|iPhone|iPad|iPod|Tablet/i.test(navigator.userAgent)) return true;

        // Screen size heuristic — desktops with touch rarely have screens <1024px
        if (window.innerWidth < 1024 && window.innerHeight < 1024) return true;

        // Media query: coarse pointer = finger, fine = mouse
        // If device has ONLY coarse pointer, it's mobile
        if (window.matchMedia) {
            var coarse = window.matchMedia('(pointer: coarse)').matches;
            var fine = window.matchMedia('(pointer: fine)').matches;
            // If device has a fine pointer (mouse), it's a desktop with touch — NOT mobile
            if (fine && !coarse) return false;
            // If device has only coarse pointer, it's mobile
            if (coarse && !fine) return true;
            // Both coarse and fine — could be 2-in-1 laptop, treat as desktop
            if (coarse && fine) return false;
        }

        // Fallback: if screen is small, assume mobile
        return window.innerWidth < 1024;
    }

    function vibrate(ms) {
        try { if (navigator.vibrate) navigator.vibrate(ms); } catch (_) { }
    }

    function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

    function dist(x1, y1, x2, y2) {
        return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    }

    // ── DOM builders ──────────────────────────────────────
    function createContainer() {
        if (_container) return;
        _container = document.createElement('div');
        _container.id = 'mobile-controls';
        _container.className = 'mobile-controls-container';
        document.body.appendChild(_container);
    }

    function createJoystick() {
        const wrap = document.createElement('div');
        wrap.className = 'mc-joystick';
        wrap.innerHTML = `
            <div class="mc-joystick-ring">
                <div class="mc-joystick-thumb"></div>
            </div>`;
        _container.appendChild(wrap);
        _joystick.el = wrap;
        _joystick.thumb = wrap.querySelector('.mc-joystick-thumb');
    }

    function createButtons() {
        const zone = document.createElement('div');
        zone.className = 'mc-buttons-zone';

        _buttonDefs.forEach(def => {
            const btn = document.createElement('div');
            btn.className = 'mc-btn mc-btn-' + def.id;
            btn.setAttribute('data-btn', def.id);
            btn.innerHTML = `<span class="mc-btn-icon">${def.icon || ''}</span>
                             <span class="mc-btn-label">${def.label || ''}</span>`;
            zone.appendChild(btn);

            _buttons[def.id] = { el: btn, pressed: false, justPressed: false, def };
        });

        _container.appendChild(zone);
    }

    function createLandscapeOverlay() {
        _landscapeOverlay = document.createElement('div');
        _landscapeOverlay.className = 'mc-landscape-overlay';
        _landscapeOverlay.innerHTML = `
            <div class="mc-landscape-prompt">
                <div class="mc-rotate-icon">📱↻</div>
                <p>Rotate your device to landscape for the best experience</p>
            </div>`;
        document.body.appendChild(_landscapeOverlay);
        checkOrientation();
        window.addEventListener('resize', checkOrientation);

        // Also use screen orientation API if available
        if (screen.orientation) {
            screen.orientation.addEventListener('change', checkOrientation);
        }
    }

    function checkOrientation() {
        if (!_landscapeOverlay || !_isMobile) return;
        const isPortrait = window.innerHeight > window.innerWidth;
        _landscapeOverlay.classList.toggle('visible', isPortrait);
    }

    // ── Touch Handlers ────────────────────────────────────
    function handleTouchStart(e) {
        if (!_active) return;
        const touches = e.changedTouches;
        for (let i = 0; i < touches.length; i++) {
            const t = touches[i];

            // Check if tapping a button
            const btnEl = t.target.closest('.mc-btn');
            if (btnEl) {
                const btnId = btnEl.getAttribute('data-btn');
                if (_buttons[btnId]) {
                    _buttons[btnId].pressed = true;
                    _buttons[btnId].justPressed = true;
                    _buttons[btnId]._touchId = t.identifier;
                    btnEl.classList.add('mc-btn-active');
                    vibrate(15);
                }
                e.preventDefault();
                continue;
            }

            const x = t.clientX;
            const y = t.clientY;
            const halfW = window.innerWidth / 2;

            // Left side → joystick
            if (x < halfW && !_joystick.active) {
                _joystick.active = true;
                _joystick.id = t.identifier;
                _joystick.ox = x;
                _joystick.oy = y;
                _joystick.dx = 0;
                _joystick.dy = 0;
                _joystick.magnitude = 0;

                // Position joystick at touch point
                _joystick.el.style.left = x + 'px';
                _joystick.el.style.top = y + 'px';
                _joystick.el.classList.add('active');
                e.preventDefault();
                continue;
            }

            // Right side → look (FPS) or swipe
            if (x >= halfW && !_look.active && _config.touchLook) {
                _look.active = true;
                _look.id = t.identifier;
                _look.startX = x;
                _look.startY = y;
                _look.dx = 0;
                _look.dy = 0;
                e.preventDefault();
                continue;
            }

            // Swipe mode (non-FPS games)
            if (x >= halfW && !_swipe.active && _config.swipeControls) {
                _swipe.active = true;
                _swipe.id = t.identifier;
                _swipe.startX = x;
                _swipe.startY = y;
                _swipe.dir = null;
                _swipe.triggered = false;
                e.preventDefault();
            }
        }
    }

    function handleTouchMove(e) {
        if (!_active) return;
        const touches = e.changedTouches;
        for (let i = 0; i < touches.length; i++) {
            const t = touches[i];

            // Joystick
            if (_joystick.active && t.identifier === _joystick.id) {
                const rawDx = t.clientX - _joystick.ox;
                const rawDy = t.clientY - _joystick.oy;
                const d = Math.sqrt(rawDx * rawDx + rawDy * rawDy);
                const maxR = _joystick.radius;
                const clamped = Math.min(d, maxR);
                const angle = Math.atan2(rawDy, rawDx);

                _joystick.dx = (clamped / maxR) * Math.cos(angle);
                _joystick.dy = (clamped / maxR) * Math.sin(angle);
                _joystick.angle = angle;
                _joystick.magnitude = clamped / maxR;

                // Move thumb visual
                const thumbX = Math.cos(angle) * clamped;
                const thumbY = Math.sin(angle) * clamped;
                _joystick.thumb.style.transform = `translate(${thumbX}px, ${thumbY}px)`;
                e.preventDefault();
                continue;
            }

            // Look
            if (_look.active && t.identifier === _look.id) {
                _look.dx = t.clientX - _look.startX;
                _look.dy = t.clientY - _look.startY;
                _look.startX = t.clientX;
                _look.startY = t.clientY;
                e.preventDefault();
                continue;
            }

            // Swipe
            if (_swipe.active && t.identifier === _swipe.id && !_swipe.triggered) {
                const sdx = t.clientX - _swipe.startX;
                const sdy = t.clientY - _swipe.startY;
                const threshold = 30;
                if (Math.abs(sdx) > threshold || Math.abs(sdy) > threshold) {
                    if (Math.abs(sdx) > Math.abs(sdy)) {
                        _swipe.dir = sdx > 0 ? 'right' : 'left';
                    } else {
                        _swipe.dir = sdy > 0 ? 'down' : 'up';
                    }
                    _swipe.triggered = true;
                    if (_onSwipe) _onSwipe(_swipe.dir);
                    vibrate(10);
                }
                e.preventDefault();
            }
        }

        // Pinch detection
        if (_config.pinchZoom && e.touches.length === 2) {
            const d = dist(e.touches[0].clientX, e.touches[0].clientY,
                e.touches[1].clientX, e.touches[1].clientY);
            if (!_pinch.active) {
                _pinch.active = true;
                _pinch.startDist = d;
            } else {
                _pinch.scale = d / _pinch.startDist;
                if (_onPinch) _onPinch(_pinch.scale);
            }
            e.preventDefault();
        }
    }

    function handleTouchEnd(e) {
        if (!_active) return;
        const touches = e.changedTouches;
        for (let i = 0; i < touches.length; i++) {
            const t = touches[i];

            // Joystick release
            if (_joystick.active && t.identifier === _joystick.id) {
                _joystick.active = false;
                _joystick.id = null;
                _joystick.dx = 0;
                _joystick.dy = 0;
                _joystick.magnitude = 0;
                _joystick.thumb.style.transform = 'translate(0,0)';
                _joystick.el.classList.remove('active');
                continue;
            }

            // Look release
            if (_look.active && t.identifier === _look.id) {
                _look.active = false;
                _look.id = null;
                _look.dx = 0;
                _look.dy = 0;
                continue;
            }

            // Swipe release
            if (_swipe.active && t.identifier === _swipe.id) {
                // Quick tap on right side = tap action
                if (!_swipe.triggered && _config.onTap) {
                    _config.onTap(t.clientX, t.clientY);
                }
                _swipe.active = false;
                _swipe.id = null;
                _swipe.dir = null;
                _swipe.triggered = false;
                continue;
            }

            // Button release
            for (const id in _buttons) {
                if (_buttons[id]._touchId === t.identifier) {
                    _buttons[id].pressed = false;
                    _buttons[id]._touchId = null;
                    _buttons[id].el.classList.remove('mc-btn-active');
                }
            }
        }

        // Pinch end
        if (e.touches.length < 2) {
            _pinch.active = false;
            _pinch.scale = 1;
        }
    }

    // ── Public API ────────────────────────────────────────
    /**
     * Initialize mobile controls.
     * @param {Object} config
     * @param {Array}  config.buttons   — [{id,label,icon}]
     * @param {boolean} config.touchLook — enable right-side look (FPS games)
     * @param {boolean} config.swipeControls — enable swipe gestures
     * @param {boolean} config.pinchZoom — enable pinch to zoom
     * @param {Function} config.onSwipe — callback(dir)
     * @param {Function} config.onPinch — callback(scale)
     * @param {Function} config.onTap   — callback(x,y)
     * @param {number}  config.lookSensitivity — default 0.004
     * @param {boolean} config.showLandscapePrompt — default true
     */
    function init(config) {
        _config = config || {};
        _isMobile = isTouchDevice();

        if (!_isMobile) return; // Do nothing on desktop

        _active = true;
        _buttonDefs = _config.buttons || [];
        _look.sensitivity = _config.lookSensitivity || 0.004;
        _onSwipe = _config.onSwipe || null;
        _onPinch = _config.onPinch || null;

        // Load CSS
        if (!document.getElementById('mc-css')) {
            const link = document.createElement('link');
            link.id = 'mc-css';
            link.rel = 'stylesheet';
            link.href = '/css/mobile-controls.css';
            document.head.appendChild(link);
        }

        // Build DOM
        createContainer();
        createJoystick();
        if (_buttonDefs.length) createButtons();
        if (_config.showLandscapePrompt !== false) createLandscapeOverlay();

        // Attach listeners
        document.addEventListener('touchstart', handleTouchStart, { passive: false });
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('touchend', handleTouchEnd, { passive: false });
        document.addEventListener('touchcancel', handleTouchEnd, { passive: false });

        // Prevent default gestures that interfere
        document.addEventListener('gesturestart', e => e.preventDefault(), { passive: false });

        // Safe area padding
        document.documentElement.style.setProperty('--mc-safe-top', 'env(safe-area-inset-top, 0px)');
        document.documentElement.style.setProperty('--mc-safe-bottom', 'env(safe-area-inset-bottom, 0px)');
        document.documentElement.style.setProperty('--mc-safe-left', 'env(safe-area-inset-left, 0px)');
        document.documentElement.style.setProperty('--mc-safe-right', 'env(safe-area-inset-right, 0px)');

        // Add body class
        document.body.classList.add('mc-mobile-active');
    }

    /** Get joystick state */
    function getJoystick() {
        return {
            dx: _joystick.dx,      // -1 to 1
            dy: _joystick.dy,      // -1 to 1
            angle: _joystick.angle,
            magnitude: _joystick.magnitude,
            active: _joystick.active,
        };
    }

    /** Get look delta (reset after read) */
    function getLookDelta() {
        const dx = _look.dx * _look.sensitivity;
        const dy = _look.dy * _look.sensitivity;
        _look.dx = 0;
        _look.dy = 0;
        return { dx, dy };
    }

    /** Check if a button is currently pressed */
    function isPressed(btnId) {
        return _buttons[btnId] ? _buttons[btnId].pressed : false;
    }

    /** Check if a button was just pressed (resets after read) */
    function justPressed(btnId) {
        if (_buttons[btnId] && _buttons[btnId].justPressed) {
            _buttons[btnId].justPressed = false;
            return true;
        }
        return false;
    }

    /** Clear all justPressed flags (call at end of frame) */
    function clearFrame() {
        for (const id in _buttons) {
            _buttons[id].justPressed = false;
        }
    }

    /** Is the system active (touch device detected)? */
    function isActive() { return _active; }

    /** Is it a mobile device? */
    function isMobileDevice() { return _isMobile; }

    /** Trigger haptic feedback */
    function haptic(ms) { vibrate(ms || 20); }

    /** Show/hide controls */
    function show() {
        if (_container) _container.style.display = '';
        if (_isMobile) _active = true;
    }
    function hide() {
        if (_container) _container.style.display = 'none';
        _active = false;

        _joystick.active = false;
        _joystick.id = null;
        _joystick.dx = 0;
        _joystick.dy = 0;
        _joystick.magnitude = 0;
        if (_joystick.thumb) _joystick.thumb.style.transform = 'translate(0,0)';
        if (_joystick.el) _joystick.el.classList.remove('active');

        _look.active = false;
        _look.id = null;
        _look.dx = 0;
        _look.dy = 0;

        _swipe.active = false;
        _swipe.id = null;
        _swipe.dir = null;
        _swipe.triggered = false;

        for (const id in _buttons) {
            if (!_buttons[id]) continue;
            _buttons[id].pressed = false;
            _buttons[id].justPressed = false;
            _buttons[id]._touchId = null;
            if (_buttons[id].el) _buttons[id].el.classList.remove('mc-btn-active');
        }
    }

    /** Destroy all controls */
    function destroy() {
        _active = false;
        if (_container) { _container.remove(); _container = null; }
        if (_landscapeOverlay) { _landscapeOverlay.remove(); _landscapeOverlay = null; }
        document.removeEventListener('touchstart', handleTouchStart);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
        document.removeEventListener('touchcancel', handleTouchEnd);
        document.body.classList.remove('mc-mobile-active');
    }

    return {
        init,
        getJoystick,
        getLookDelta,
        isPressed,
        justPressed,
        clearFrame,
        isActive,
        isMobile: isMobileDevice,
        haptic,
        show,
        hide,
        destroy,
    };
})();

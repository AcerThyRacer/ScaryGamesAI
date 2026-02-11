/* ============================================
   Mobile Game Bindings — Auto-Wire for All Games
   Reads MobileControls state each frame and injects 
   into the game's existing input variables.
   ============================================ */

(function () {
    'use strict';

    // Detect game type from URL path
    var path = window.location.pathname.toLowerCase();

    // Map game IDs to their control configurations
    var GAME_CONFIGS = {
        'backrooms-pacman': { type: 'fps', buttons: ['sprint'] },
        'the-abyss': { type: 'fps', buttons: ['sprint', 'interact'] },
        'cursed-sands': { type: 'fps', buttons: ['sprint', 'interact'] },
        'yeti-run': { type: 'fps', buttons: ['sprint'] },
        'graveyard-shift': { type: 'fps', buttons: ['sprint', 'interact'] },
        'the-elevator': { type: 'fps', buttons: ['sprint', 'interact'] },
        'web-of-terror': { type: 'fps', buttons: ['sprint'] },
        'nightmare-run': { type: 'runner', buttons: ['jump', 'slide', 'slow'] },
        'blood-tetris': { type: 'swipe', buttons: ['rotate', 'drop'] },
        'shadow-crawler': { type: 'topdown', buttons: [] },
        'haunted-asylum': { type: 'topdown', buttons: [] },
        'seance': { type: 'pointer', buttons: [] },
        'dollhouse': { type: 'pointer', buttons: [] },
        'freddys-nightmare': { type: 'fnaf', buttons: ['light', 'camera'] },
        'zombie-horde': { type: 'strategy', buttons: [] },
        'ritual-circle': { type: 'strategy', buttons: ['fireball'] },
        'total-zombies-medieval': { type: 'rts', buttons: [] },
        'cursed-depths': { type: 'platformer', buttons: ['jump', 'attack', 'interact'] },
    };

    // Identify current game
    var gameId = null;
    for (var id in GAME_CONFIGS) {
        if (path.indexOf(id) !== -1) { gameId = id; break; }
    }
    if (!gameId) return;

    var config = GAME_CONFIGS[gameId];

    // Build button definitions based on game type
    var buttonDefs = [];
    var buttonMap = {
        sprint: { id: 'sprint', icon: '🏃', label: 'Sprint' },
        interact: { id: 'interact', icon: '👆', label: 'Use' },
        jump: { id: 'jump', icon: '⬆', label: 'Jump' },
        slide: { id: 'slide', icon: '⬇', label: 'Slide' },
        slow: { id: 'slow', icon: '⏳', label: 'Slow' },
        attack: { id: 'attack', icon: '⚔', label: 'Attack' },
        rotate: { id: 'rotate', icon: '🔄', label: 'Rotate' },
        drop: { id: 'drop', icon: '⬇', label: 'Drop' },
        light: { id: 'light', icon: '💡', label: 'Light' },
        camera: { id: 'camera', icon: '📷', label: 'Camera' },
        fireball: { id: 'fireball', icon: '🔥', label: 'Fire' },
    };

    config.buttons.forEach(function (b) {
        if (buttonMap[b]) buttonDefs.push(buttonMap[b]);
    });

    // Initialize MobileControls with game-specific settings
    if (typeof MobileControls !== 'undefined') {
        var initOpts = {
            buttons: buttonDefs,
            touchLook: config.type === 'fps',
            swipeControls: config.type === 'swipe' || config.type === 'runner',
            pinchZoom: config.type === 'strategy' || config.type === 'rts',
            showLandscapePrompt: true,
            lookSensitivity: 0.004,
        };

        // Swipe callback for tetris-like and runner games
        if (config.type === 'swipe' || config.type === 'runner') {
            initOpts.onSwipe = function (dir) {
                // Simulate keyboard events for swipe actions
                var keyMap = {
                    'left': 'ArrowLeft', 'right': 'ArrowRight',
                    'up': 'ArrowUp', 'down': 'ArrowDown'
                };
                if (keyMap[dir]) {
                    var e = new KeyboardEvent('keydown', { code: keyMap[dir], key: keyMap[dir], bubbles: true });
                    document.dispatchEvent(e);
                    setTimeout(function () {
                        var up = new KeyboardEvent('keyup', { code: keyMap[dir], key: keyMap[dir], bubbles: true });
                        document.dispatchEvent(up);
                    }, 100);
                }
            };
        }

        // Tap callback for pointer/click-based games
        if (config.type === 'pointer' || config.type === 'strategy') {
            initOpts.onTap = function (x, y) {
                var canvas = document.getElementById('game-canvas');
                if (canvas) {
                    // Dispatch a synthetic click
                    var rect = canvas.getBoundingClientRect();
                    var event = new MouseEvent('click', {
                        clientX: x, clientY: y,
                        bubbles: true, cancelable: true
                    });
                    canvas.dispatchEvent(event);
                }
            };
        }

        MobileControls.init(initOpts);
    }

    /* ─── Frame Integration ────────────────────────────────
       Hook into requestAnimationFrame to inject mobile input
       into the game's key/mouse state each frame.
       This avoids modifying each game's source code. */

    var _origRAF = window.requestAnimationFrame;
    window.requestAnimationFrame = function (cb) {
        return _origRAF.call(window, function (time) {
            if (typeof MobileControls !== 'undefined' && MobileControls.isActive()) {
                injectMobileInput();
            }
            cb(time);
        });
    };

    function injectMobileInput() {
        var joy = MobileControls.getJoystick();
        var look = MobileControls.getLookDelta();

        // ── FPS Games: Inject joystick as WASD keys + look as mouse ──
        if (config.type === 'fps') {
            // Simulate key presses based on joystick
            simulateKey('KeyW', joy.dy < -0.25);
            simulateKey('KeyS', joy.dy > 0.25);
            simulateKey('KeyA', joy.dx < -0.25);
            simulateKey('KeyD', joy.dx > 0.25);

            // Sprint button
            if (MobileControls.isPressed('sprint')) {
                simulateKey('ShiftLeft', true);
            } else {
                simulateKey('ShiftLeft', false);
            }

            // Interact button
            if (MobileControls.justPressed('interact')) {
                simulateKeyTap('KeyE');
            }

            // Inject look as mouse movement
            if (look.dx !== 0 || look.dy !== 0) {
                var moveEvt = new MouseEvent('mousemove', {
                    movementX: look.dx / 0.004 * 200,  // Scale back to pixel movement
                    movementY: look.dy / 0.004 * 200,
                    bubbles: true
                });
                // Directly modify yaw/pitch if accessible via window
                // (most games use document mousemove listener with pointerLock check)
                // We need to bypass pointer lock requirement for mobile
                document.dispatchEvent(moveEvt);
            }
        }

        // ── Top-Down 2D: Inject joystick as arrow keys / WASD ──
        if (config.type === 'topdown') {
            simulateKey('KeyW', joy.dy < -0.25);
            simulateKey('KeyS', joy.dy > 0.25);
            simulateKey('KeyA', joy.dx < -0.25);
            simulateKey('KeyD', joy.dx > 0.25);
            simulateKey('ArrowUp', joy.dy < -0.25);
            simulateKey('ArrowDown', joy.dy > 0.25);
            simulateKey('ArrowLeft', joy.dx < -0.25);
            simulateKey('ArrowRight', joy.dx > 0.25);
        }

        // ── Runner: Jump/slide buttons ──
        if (config.type === 'runner') {
            if (MobileControls.justPressed('jump')) {
                simulateKeyTap('Space');
                simulateKeyTap('ArrowUp');
            }
            if (MobileControls.isPressed('slide')) {
                simulateKey('ArrowDown', true);
                simulateKey('KeyS', true);
            } else {
                simulateKey('ArrowDown', false);
                simulateKey('KeyS', false);
            }
            if (MobileControls.isPressed('slow')) {
                simulateKey('ShiftLeft', true);
            } else {
                simulateKey('ShiftLeft', false);
            }
        }

        // ── FNAF: Light & Camera buttons ──
        if (config.type === 'fnaf') {
            if (MobileControls.justPressed('light')) {
                simulateKeyTap('Space');
            }
            if (MobileControls.justPressed('camera')) {
                simulateKeyTap('KeyC');
            }
            // Joystick for looking left/right
            simulateKey('KeyA', joy.dx < -0.3);
            simulateKey('KeyD', joy.dx > 0.3);
        }

        //  ── Platformer (Cursed Depths): Joystick + buttons ──
        if (config.type === 'platformer') {
            simulateKey('KeyA', joy.dx < -0.25);
            simulateKey('KeyD', joy.dx > 0.25);
            simulateKey('ArrowLeft', joy.dx < -0.25);
            simulateKey('ArrowRight', joy.dx > 0.25);

            if (MobileControls.justPressed('jump')) {
                simulateKeyTap('Space');
                simulateKeyTap('KeyW');
            }
            if (MobileControls.justPressed('attack')) {
                // Trigger attack/mine by clicking canvas
                var canvas = document.getElementById('game-canvas');
                if (canvas) {
                    var rect = canvas.getBoundingClientRect();
                    var evt = new MouseEvent('click', {
                        clientX: rect.left + rect.width / 2,
                        clientY: rect.top + rect.height / 2,
                        bubbles: true
                    });
                    canvas.dispatchEvent(evt);
                }
            }
            if (MobileControls.justPressed('interact')) {
                simulateKeyTap('KeyE');
            }
        }

        // ── Strategy: Pinch zoom + tap ──
        if (config.type === 'strategy') {
            if (MobileControls.justPressed('fireball')) {
                simulateKeyTap('Space');
            }
            // Number keys for traps (ritual circle)
            // Could add more buttons but let's keep it simple
        }

        // ── Swipe (Blood Tetris): Rotate + drop buttons ──
        if (config.type === 'swipe') {
            if (MobileControls.justPressed('rotate')) {
                simulateKeyTap('ArrowUp');
            }
            if (MobileControls.justPressed('drop')) {
                simulateKeyTap('Space');
            }
            // Also support joystick for movement
            if (joy.dx < -0.4) simulateKeyTap('ArrowLeft');
            if (joy.dx > 0.4) simulateKeyTap('ArrowRight');
            if (joy.dy > 0.4) simulateKey('ArrowDown', true);
            else simulateKey('ArrowDown', false);
        }

        MobileControls.clearFrame();
    }

    // ── Key simulation helpers ────────────────────────────
    var _simulatedKeys = {};

    function simulateKey(code, pressed) {
        if (pressed && !_simulatedKeys[code]) {
            _simulatedKeys[code] = true;
            document.dispatchEvent(new KeyboardEvent('keydown', { code: code, key: code, bubbles: true }));
        } else if (!pressed && _simulatedKeys[code]) {
            _simulatedKeys[code] = false;
            document.dispatchEvent(new KeyboardEvent('keyup', { code: code, key: code, bubbles: true }));
        }
    }

    function simulateKeyTap(code) {
        document.dispatchEvent(new KeyboardEvent('keydown', { code: code, key: code, bubbles: true }));
        setTimeout(function () {
            document.dispatchEvent(new KeyboardEvent('keyup', { code: code, key: code, bubbles: true }));
        }, 80);
    }

    /* ─── Mobile Pointer Lock Bypass ──────────────────────
       FPS games check `pointerLocked` or `document.pointerLockElement`.
       On mobile there's no pointer lock. We make the games think
       the pointer is always locked when on mobile. */
    if (config.type === 'fps' && typeof MobileControls !== 'undefined' && MobileControls.isMobile()) {
        // Override pointerLockElement to return a truthy value
        Object.defineProperty(document, 'pointerLockElement', {
            get: function () {
                // Return the canvas element so FPS games think pointer is locked
                return document.getElementById('game-canvas') || document.body;
            },
            configurable: true
        });

        // Prevent actual pointer lock requests on mobile (they fail on iOS etc.)
        HTMLElement.prototype._origRequestPointerLock = HTMLElement.prototype.requestPointerLock;
        HTMLElement.prototype.requestPointerLock = function () {
            // No-op on mobile — the fake pointerLockElement handles it
        };
    }

})();

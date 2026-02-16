/* ============================================
   Mobile Game Bindings — Universal Touch Controls
   Auto-Wires MobileControls for ALL 18 ScaryGamesAI games
   Reads MobileControls state each frame and injects
   into each game's existing input variables.
   ============================================ */

(function () {
    'use strict';

    // Detect game type from URL path
    var path = window.location.pathname.toLowerCase();

    // ── GAME CONFIGURATIONS ────────────────────────────────────
    // All 18 games with their control schemes
    var GAME_CONFIGS = {
        // FPS/3D Games
        'backrooms-pacman': {
            type: 'fps',
            buttons: [
                { id: 'sprint', icon: '🏃', label: 'Run' },
                { id: 'interact', icon: '👆', label: 'Eat' }
            ],
            touchLook: true,
            swipeControls: false,
            pinchZoom: false
        },
        'the-abyss': {
            type: 'fps',
            buttons: [
                { id: 'sprint', icon: '🏃', label: 'Sprint' },
                { id: 'interact', icon: '✋', label: 'Grab' },
                { id: 'flashlight', icon: '🔦', label: 'Light' }
            ],
            touchLook: true,
            swipeControls: false,
            pinchZoom: false
        },
        'cursed-sands': {
            type: 'fps',
            buttons: [
                { id: 'sprint', icon: '🏃', label: 'Sprint' },
                { id: 'interact', icon: '✋', label: 'Use' },
                { id: 'attack', icon: '⚔️', label: 'Attack' }
            ],
            touchLook: true,
            swipeControls: false,
            pinchZoom: false
        },
        'yeti-run': {
            type: 'fps',
            buttons: [
                { id: 'sprint', icon: '🏃', label: 'Run' }
            ],
            touchLook: true,
            swipeControls: false,
            pinchZoom: false
        },
        'graveyard-shift': {
            type: 'fps',
            buttons: [
                { id: 'sprint', icon: '🏃', label: 'Run' },
                { id: 'interact', icon: '✋', label: 'Investigate' },
                { id: 'flashlight', icon: '🔦', label: 'Light' },
                { id: 'emf', icon: '📡', label: 'EMF' }
            ],
            touchLook: true,
            swipeControls: false,
            pinchZoom: false
        },
        'web-of-terror': {
            type: 'fps',
            buttons: [
                { id: 'sprint', icon: '🏃', label: 'Run' },
                { id: 'interact', icon: '✋', label: 'Interact' }
            ],
            touchLook: true,
            swipeControls: false,
            pinchZoom: false
        },

        // 2D Side-Scrolling Runners
        'nightmare-run': {
            type: 'runner',
            buttons: [
                { id: 'jump', icon: '⬆️', label: 'Jump' },
                { id: 'slide', icon: '⬇️', label: 'Slide' },
                { id: 'slow', icon: '⏳', label: 'Slow' }
            ],
            touchLook: false,
            swipeControls: true,
            pinchZoom: false
        },

        // Puzzle/Tetris-like
        'blood-tetris': {
            type: 'tetris',
            buttons: [
                { id: 'rotate', icon: '🔄', label: 'Rotate' },
                { id: 'drop', icon: '⬇️', label: 'Drop' },
                { id: 'left', icon: '⬅️', label: '' },
                { id: 'right', icon: '➡️', label: '' }
            ],
            touchLook: false,
            swipeControls: true,
            pinchZoom: false
        },

        // Top-Down 2D
        'shadow-crawler': {
            type: 'topdown',
            buttons: [
                { id: 'attack', icon: '⚔️', label: 'Attack' },
                { id: 'interact', icon: '✋', label: 'Use' },
                { id: 'potion', icon: '🧪', label: 'Heal' }
            ],
            touchLook: false,
            swipeControls: false,
            pinchZoom: false
        },
        'haunted-asylum': {
            type: 'topdown',
            buttons: [
                { id: 'interact', icon: '✋', label: 'Search' }
            ],
            touchLook: false,
            swipeControls: false,
            pinchZoom: false
        },
        'zombie-horde': {
            type: 'topdown_tower',
            buttons: [
                { id: 'turret1', icon: '1️⃣', label: '' },
                { id: 'turret2', icon: '2️⃣', label: '' },
                { id: 'turret3', icon: '3️⃣', label: '' },
                { id: 'upgrade', icon: '⬆️', label: 'Up' }
            ],
            touchLook: false,
            swipeControls: false,
            pinchZoom: true
        },

        // Point-and-Click / Pointer
        'seance': {
            type: 'pointer',
            buttons: [
                { id: 'hint', icon: '💡', label: 'Hint' },
                { id: 'backspace', icon: '⌫', label: 'Undo' }
            ],
            touchLook: false,
            swipeControls: false,
            pinchZoom: false
        },
        'dollhouse': {
            type: 'pointer',
            buttons: [],
            touchLook: false,
            swipeControls: false,
            pinchZoom: false
        },
        'the-elevator': {
            type: 'pointer',
            buttons: [
                { id: 'interact', icon: '✋', label: 'Press' }
            ],
            touchLook: false,
            swipeControls: false,
            pinchZoom: false
        },

        // FNAF-style Camera Monitor
        'freddys-nightmare': {
            type: 'fnaf',
            buttons: [
                { id: 'leftdoor', icon: '🚪', label: 'L Door' },
                { id: 'rightdoor', icon: '🚪', label: 'R Door' },
                { id: 'camera', icon: '📷', label: 'Cam' },
                { id: 'light', icon: '💡', label: 'Light' }
            ],
            touchLook: false,
            swipeControls: false,
            pinchZoom: false
        },

        // Strategy/Tower Defense
        'ritual-circle': {
            type: 'strategy',
            buttons: [
                { id: 'trap1', icon: '1️⃣', label: 'Salt' },
                { id: 'trap2', icon: '2️⃣', label: 'Water' },
                { id: 'trap3', icon: '3️⃣', label: 'Sigil' },
                { id: 'fireball', icon: '🔥', label: 'Fire' }
            ],
            touchLook: false,
            swipeControls: false,
            pinchZoom: true
        },
        'total-zombies-medieval': {
            type: 'strategy',
            buttons: [
                { id: 'turret1', icon: '1️⃣', label: '' },
                { id: 'turret2', icon: '2️⃣', label: '' },
                { id: 'turret3', icon: '3️⃣', label: '' },
                { id: 'turret4', icon: '4️⃣', label: '' }
            ],
            touchLook: false,
            swipeControls: false,
            pinchZoom: true
        },

        // Top-down arena shooter (diep-style)
        'crypt-tanks': {
            type: 'fps', // joystick -> WASD, look -> mousemove, attack -> mouse click
            buttons: [
                { id: 'attack', icon: '💥', label: 'Fire' },
                { id: 'interact', icon: '🕯️', label: 'Power' }
            ],
            touchLook: true,
            swipeControls: false,
            pinchZoom: false
        },

        // Total War-style RTS (Rome prequel)
        'total-zombies-rome': {
            type: 'strategy',
            buttons: [
                { id: 'turret1', icon: '1️⃣', label: '' },
                { id: 'turret2', icon: '2️⃣', label: '' },
                { id: 'turret3', icon: '3️⃣', label: '' },
                { id: 'turret4', icon: '4️⃣', label: '' }
            ],
            touchLook: false,
            swipeControls: false,
            pinchZoom: true
        },

        // Platformer
        'cursed-depths': {
            type: 'platformer',
            buttons: [
                { id: 'jump', icon: '⬆️', label: 'Jump' },
                { id: 'attack', icon: '⛏️', label: 'Mine' },
                { id: 'interact', icon: '✋', label: 'Use' }
            ],
            touchLook: false,
            swipeControls: false,
            pinchZoom: false
        }
    };

    // ── IDENTIFY CURRENT GAME ─────────────────────────────────────
    var gameId = null;
    for (var id in GAME_CONFIGS) {
        // Check multiple path patterns
        if (path.indexOf('/games/' + id + '/') !== -1 ||
            path.indexOf('/' + id + '/') !== -1 ||
            path.endsWith('/' + id) ||
            path.indexOf(id.replace(/-/g, '')) !== -1) {
            gameId = id;
            break;
        }
    }

    // Fallback: try partial matching
    if (!gameId) {
        for (var id in GAME_CONFIGS) {
            var parts = id.split('-');
            for (var i = 0; i < parts.length; i++) {
                if (path.indexOf(parts[i]) !== -1) {
                    gameId = id;
                    break;
                }
            }
            if (gameId) break;
        }
    }

    if (!gameId) {
        console.log('[MobileBindings] No game identified, skipping binding');
        return;
    }

    console.log('[MobileBindings] Identified game:', gameId);
    var config = GAME_CONFIGS[gameId];
    if (!config) {
        console.log('[MobileBindings] No config for game:', gameId, 'skipping binding');
        return;
    }

    // ── INITIALIZE MOBILE CONTROLS ─────────────────────────────────
    function initMobileControls() {
        if (typeof MobileControls === 'undefined') {
            console.warn('[MobileBindings] MobileControls not loaded');
            return;
        }

        if (!MobileControls.isMobile()) {
            console.log('[MobileBindings] Not a mobile device');
            return;
        }

        var initOpts = {
            buttons: config.buttons || [],
            touchLook: config.touchLook || false,
            swipeControls: config.swipeControls || false,
            pinchZoom: config.pinchZoom || false,
            showLandscapePrompt: true,
            lookSensitivity: 0.005,
        };

        // Swipe callback for runner/tetris games
        if (config.swipeControls) {
            initOpts.onSwipe = function (dir) {
                var keyMap = {
                    'left': 'ArrowLeft',
                    'right': 'ArrowRight',
                    'up': 'ArrowUp',
                    'down': 'ArrowDown'
                };
                if (keyMap[dir]) {
                    simulateKeyTap(keyMap[dir]);
                }
            };
        }

        // Tap callback for pointer/click-based games
        if (config.type === 'pointer' || config.type === 'strategy') {
            initOpts.onTap = function (x, y) {
                var canvas = document.getElementById('game-canvas');
                if (canvas) {
                    var rect = canvas.getBoundingClientRect();
                    var event = new MouseEvent('click', {
                        clientX: x,
                        clientY: y,
                        bubbles: true,
                        cancelable: true
                    });
                    canvas.dispatchEvent(event);
                }
            };
        }

        MobileControls.init(initOpts);
        console.log('[MobileBindings] MobileControls initialized');
    }

    // ── FRAME INTEGRATION ─────────────────────────────────────────
    // Hook into requestAnimationFrame to inject mobile input
    var _origRAF = window.requestAnimationFrame;
    window.requestAnimationFrame = function (cb) {
        return _origRAF.call(window, function (time) {
            if (typeof MobileControls !== 'undefined' && MobileControls.isActive()) {
                injectMobileInput();
            }
            cb(time);
        });
    };

    // ── INPUT INJECTION ───────────────────────────────────────────
    function injectMobileInput() {
        var joy = MobileControls.getJoystick();
        var look = MobileControls.getLookDelta();

        // ── FPS Games: Joystick → WASD, Look → Mouse ──
        if (config.type === 'fps') {
            // Movement
            simulateKey('KeyW', joy.dy < -0.3);
            simulateKey('KeyS', joy.dy > 0.3);
            simulateKey('KeyA', joy.dx < -0.3);
            simulateKey('KeyD', joy.dx > 0.3);

            // Arrow keys too
            simulateKey('ArrowUp', joy.dy < -0.3);
            simulateKey('ArrowDown', joy.dy > 0.3);
            simulateKey('ArrowLeft', joy.dx < -0.3);
            simulateKey('ArrowRight', joy.dx > 0.3);

            // Buttons
            if (MobileControls.isPressed('sprint')) {
                simulateKey('ShiftLeft', true);
            } else {
                simulateKey('ShiftLeft', false);
            }

            if (MobileControls.justPressed('interact')) {
                simulateKeyTap('KeyE');
            }

            if (MobileControls.justPressed('flashlight')) {
                simulateKeyTap('KeyF');
            }

            if (MobileControls.justPressed('attack')) {
                simulateMouseClick();
            }

            // Look (inject as mouse movement)
            if (look.dx !== 0 || look.dy !== 0) {
                // For pointer-locked FPS games, we need to dispatch
                // mousemove events with movementX/Y
                var moveEvt = new MouseEvent('mousemove', {
                    movementX: look.dx / 0.005 * 300,
                    movementY: look.dy / 0.005 * 300,
                    bubbles: true
                });
                document.dispatchEvent(moveEvt);
            }
        }

        // ── Top-Down 2D: Joystick → WASD/Arrows ──
        if (config.type === 'topdown' || config.type === 'topdown_tower') {
            simulateKey('KeyW', joy.dy < -0.3);
            simulateKey('KeyS', joy.dy > 0.3);
            simulateKey('KeyA', joy.dx < -0.3);
            simulateKey('KeyD', joy.dx > 0.3);
            simulateKey('ArrowUp', joy.dy < -0.3);
            simulateKey('ArrowDown', joy.dy > 0.3);
            simulateKey('ArrowLeft', joy.dx < -0.3);
            simulateKey('ArrowRight', joy.dx > 0.3);

            // Interact
            if (MobileControls.justPressed('interact')) {
                simulateKeyTap('KeyE');
            }

            // Attack
            if (MobileControls.justPressed('attack')) {
                simulateKeyTap('Space');
            }

            // Potion
            if (MobileControls.justPressed('potion')) {
                simulateKeyTap('KeyE');
            }
        }

        // ── Runner: Jump/Slide/Slow ──
        if (config.type === 'runner') {
            if (MobileControls.justPressed('jump')) {
                simulateKeyTap('Space');
                simulateKeyTap('ArrowUp');
                simulateKeyTap('KeyW');
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

            // Swipe also triggers jump/slide
        }

        // ── Tetris: Rotate/Drop + Movement ──
        if (config.type === 'tetris') {
            if (MobileControls.justPressed('rotate')) {
                simulateKeyTap('ArrowUp');
                simulateKeyTap('KeyX');
            }
            if (MobileControls.justPressed('drop')) {
                simulateKeyTap('Space');
            }
            if (MobileControls.justPressed('left')) {
                simulateKeyTap('ArrowLeft');
            }
            if (MobileControls.justPressed('right')) {
                simulateKeyTap('ArrowRight');
            }

            // Joystick for soft drop
            if (joy.dy > 0.5) {
                simulateKey('ArrowDown', true);
            } else {
                simulateKey('ArrowDown', false);
            }
        }

        // ── FNAF: Door/Light/Camera buttons ──
        if (config.type === 'fnaf') {
            if (MobileControls.justPressed('leftdoor')) {
                simulateKeyTap('KeyQ');
            }
            if (MobileControls.justPressed('rightdoor')) {
                simulateKeyTap('KeyE');
            }
            if (MobileControls.justPressed('camera')) {
                simulateKeyTap('Space');
            }
            if (MobileControls.isPressed('light')) {
                simulateKey('KeyF', true);
            } else {
                simulateKey('KeyF', false);
            }

            // Camera switching with number keys
            // Could add buttons 1-8 for this
        }

        // ── Platformer: Jump/Attack/Interact ──
        if (config.type === 'platformer') {
            simulateKey('KeyA', joy.dx < -0.3);
            simulateKey('KeyD', joy.dx > 0.3);
            simulateKey('ArrowLeft', joy.dx < -0.3);
            simulateKey('ArrowRight', joy.dx > 0.3);

            if (MobileControls.justPressed('jump')) {
                simulateKeyTap('Space');
                simulateKeyTap('KeyW');
            }
            if (MobileControls.justPressed('attack')) {
                simulateMouseClick();
            }
            if (MobileControls.justPressed('interact')) {
                simulateKeyTap('KeyE');
            }
        }

        // ── Strategy: Traps + Click ──
        if (config.type === 'strategy') {
            if (MobileControls.justPressed('trap1')) {
                simulateKeyTap('Digit1');
            }
            if (MobileControls.justPressed('trap2')) {
                simulateKeyTap('Digit2');
            }
            if (MobileControls.justPressed('trap3')) {
                simulateKeyTap('Digit3');
            }
            if (MobileControls.justPressed('fireball')) {
                simulateKeyTap('Space');
            }
            if (MobileControls.justPressed('turret1')) {
                simulateKeyTap('Digit1');
            }
            if (MobileControls.justPressed('turret2')) {
                simulateKeyTap('Digit2');
            }
            if (MobileControls.justPressed('turret3')) {
                simulateKeyTap('Digit3');
            }
            if (MobileControls.justPressed('turret4')) {
                simulateKeyTap('Digit4');
            }
            if (MobileControls.justPressed('upgrade')) {
                simulateKeyTap('KeyU');
            }
        }

        // ── Pointer (Dollhouse/Seance): Tap only ──
        if (config.type === 'pointer') {
            if (MobileControls.justPressed('hint')) {
                simulateKeyTap('KeyH');
            }
            if (MobileControls.justPressed('backspace')) {
                simulateKeyTap('Backspace');
            }
        }

        MobileControls.clearFrame();
    }

    // ── KEY SIMULATION HELPERS ─────────────────────────────────────
    var _simulatedKeys = {};

    function simulateKey(code, pressed) {
        if (pressed && !_simulatedKeys[code]) {
            _simulatedKeys[code] = true;
            document.dispatchEvent(new KeyboardEvent('keydown', {
                code: code,
                key: getKeyFromCode(code),
                bubbles: true
            }));
        } else if (!pressed && _simulatedKeys[code]) {
            _simulatedKeys[code] = false;
            document.dispatchEvent(new KeyboardEvent('keyup', {
                code: code,
                key: getKeyFromCode(code),
                bubbles: true
            }));
        }
    }

    function simulateKeyTap(code) {
        document.dispatchEvent(new KeyboardEvent('keydown', {
            code: code,
            key: getKeyFromCode(code),
            bubbles: true
        }));
        setTimeout(function () {
            document.dispatchEvent(new KeyboardEvent('keyup', {
                code: code,
                key: getKeyFromCode(code),
                bubbles: true
            }));
        }, 80);
    }

    function simulateMouseClick() {
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

    function getKeyFromCode(code) {
        var map = {
            'KeyW': 'w', 'KeyA': 'a', 'KeyS': 's', 'KeyD': 'd',
            'KeyE': 'e', 'KeyF': 'f', 'KeyQ': 'q', 'KeyR': 'r',
            'KeyH': 'h', 'KeyX': 'x', 'KeyC': 'c', 'KeyU': 'u',
            'ArrowUp': 'ArrowUp', 'ArrowDown': 'ArrowDown',
            'ArrowLeft': 'ArrowLeft', 'ArrowRight': 'ArrowRight',
            'Space': ' ', 'ShiftLeft': 'Shift',
            'Backspace': 'Backspace',
            'Digit1': '1', 'Digit2': '2', 'Digit3': '3', 'Digit4': '4',
            'Digit5': '5', 'Digit6': '6', 'Digit7': '7', 'Digit8': '8'
        };
        return map[code] || code;
    }

    // ── POINTER LOCK BYPASS FOR MOBILE ────────────────────────────
    // FPS games require pointer lock, which doesn't work on mobile
    // We fake it so the games think pointer is always locked
    if ((config.type === 'fps') && typeof MobileControls !== 'undefined') {
        // Wait for MobileControls to be ready
        setTimeout(function () {
            if (MobileControls.isMobile && MobileControls.isMobile()) {
                // Override pointerLockElement
                try {
                    Object.defineProperty(document, 'pointerLockElement', {
                        get: function () {
                            return document.getElementById('game-canvas') || document.body;
                        },
                        configurable: true
                    });
                } catch (e) {
                    console.warn('[MobileBindings] Could not override pointerLockElement');
                }

                // Prevent actual pointer lock requests
                var origRequestPointerLock = HTMLElement.prototype.requestPointerLock;
                HTMLElement.prototype.requestPointerLock = function () {
                    // No-op on mobile
                    console.log('[MobileBindings] Blocked pointerLock request');
                };
            }
        }, 500);
    }

    // ── INITIALIZE ON DOM READY ───────────────────────────────────
    function onReady() {
        initMobileControls();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', onReady);
    } else {
        // Small delay to ensure other scripts are loaded
        setTimeout(onReady, 100);
    }

})();

/* ============================================
   Mobile Tutorial — Per-Game Touch Controls Hints
   Auto-detects game type and shows contextual
   touch instructions + interactive demo
   ============================================ */
(function () {
    'use strict';

    if (typeof MobileControls === 'undefined' || !MobileControls.isMobile()) return;

    var STORAGE_KEY = 'mc_tutorials_seen';
    var seen = {};
    try { seen = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch (e) { }

    // ── Game-specific tutorial content ────────────────
    var TUTORIALS = {
        'fps': {
            title: '🎮 Touch Controls',
            steps: [
                { icon: '👆', text: 'Left side: Drag to move', anim: 'joystick' },
                { icon: '👁️', text: 'Right side: Drag to look around', anim: 'swipe' },
                { icon: '⚡', text: 'Tap action buttons to interact', anim: 'tap' },
            ]
        },
        'platformer': {
            title: '🕹️ Touch Controls',
            steps: [
                { icon: '👆', text: 'Left stick: Move left/right', anim: 'joystick' },
                { icon: '🦘', text: 'Jump button: Tap to jump', anim: 'tap' },
                { icon: '⚔️', text: 'Attack button: Tap to attack', anim: 'tap' },
            ]
        },
        'runner': {
            title: '🏃 Touch Controls',
            steps: [
                { icon: '⬆️', text: 'Swipe UP to jump', anim: 'swipe-up' },
                { icon: '⬇️', text: 'Swipe DOWN to slide', anim: 'swipe-down' },
                { icon: '➡️', text: 'Swipe LEFT/RIGHT to dodge', anim: 'swipe' },
            ]
        },
        'swipe': {
            title: '📱 Touch Controls',
            steps: [
                { icon: '👆', text: 'Swipe to move pieces', anim: 'swipe' },
                { icon: '🔄', text: 'Tap to rotate', anim: 'tap' },
                { icon: '⬇️', text: 'Swipe down to drop', anim: 'swipe-down' },
            ]
        },
        'pointer': {
            title: '👆 Touch Controls',
            steps: [
                { icon: '👆', text: 'Tap to select/interact', anim: 'tap' },
                { icon: '🔍', text: 'Drag to explore', anim: 'swipe' },
                { icon: '⭐', text: 'Double-tap for special actions', anim: 'tap' },
            ]
        },
        'strategy': {
            title: '🏰 Touch Controls',
            steps: [
                { icon: '👆', text: 'Tap to place towers', anim: 'tap' },
                { icon: '📍', text: 'Drag to pan the map', anim: 'swipe' },
                { icon: '🔢', text: 'Use number buttons to select', anim: 'tap' },
            ]
        },
        'rts': {
            title: '⚔️ Touch Controls',
            steps: [
                { icon: '👆', text: 'Tap to select units', anim: 'tap' },
                { icon: '📍', text: 'Tap ground to move units', anim: 'tap' },
                { icon: '🔄', text: 'Pinch to zoom', anim: 'pinch' },
            ]
        },
    };

    // Identify game
    var path = window.location.pathname.toLowerCase();
    var GAME_TYPES = {
        'backrooms-pacman': 'fps', 'the-elevator': 'fps', 'graveyard-shift': 'fps',
        'web-of-terror': 'fps', 'haunted-asylum': 'fps', 'freddy': 'fps',
        'the-abyss': 'fps', 'cursed-sands': 'fps',
        'cursed-depths': 'platformer',
        'nightmare-run': 'runner', 'yeti-run': 'runner',
        'blood-tetris': 'swipe',
        'shadow-crawler': 'pointer', 'dollhouse': 'pointer', 'seance': 'pointer',
        'ritual-circle': 'pointer',
        'zombie-horde': 'strategy',
        'total-zombies-medieval': 'rts',
    };

    var gameId = null;
    for (var id in GAME_TYPES) {
        if (path.indexOf(id) !== -1) { gameId = id; break; }
    }
    if (!gameId) return;

    var gameType = GAME_TYPES[gameId];
    var tutorial = TUTORIALS[gameType];
    if (!tutorial) return;

    // Skip if already seen
    if (seen[gameId]) return;

    // ── Build Tutorial UI ────────────────────────────
    var overlay = document.createElement('div');
    overlay.id = 'mc-tutorial-overlay';
    overlay.style.cssText = [
        'position:fixed', 'inset:0', 'z-index:99998',
        'background:rgba(0,0,0,0.88)', 'backdrop-filter:blur(10px)',
        '-webkit-backdrop-filter:blur(10px)',
        'display:flex', 'flex-direction:column',
        'align-items:center', 'justify-content:center',
        'font-family:Inter,system-ui,sans-serif', 'color:#fff',
        'opacity:0', 'transition:opacity 0.4s ease',
        'padding:20px', 'box-sizing:border-box',
    ].join(';');

    var inner = document.createElement('div');
    inner.style.cssText = 'max-width:360px;width:100%;text-align:center;';

    // Title
    var title = document.createElement('h2');
    title.textContent = tutorial.title;
    title.style.cssText = 'font-size:clamp(1.3rem,4vw,1.8rem);margin-bottom:24px;color:#ffcc44;text-shadow:0 0 20px rgba(255,200,50,0.4);';
    inner.appendChild(title);

    // Steps
    var stepIdx = 0;
    var stepContainer = document.createElement('div');
    stepContainer.style.cssText = 'min-height:140px;display:flex;flex-direction:column;align-items:center;justify-content:center;';
    inner.appendChild(stepContainer);

    function showStep(idx) {
        if (idx >= tutorial.steps.length) { dismiss(); return; }
        var s = tutorial.steps[idx];
        stepContainer.innerHTML = '';

        var animEl = document.createElement('div');
        animEl.style.cssText = 'width:80px;height:80px;margin:0 auto 16px;position:relative;';
        animEl.innerHTML = buildAnimHTML(s.anim);
        stepContainer.appendChild(animEl);

        var iconText = document.createElement('div');
        iconText.style.cssText = 'font-size:20px;margin-bottom:8px;';
        iconText.textContent = s.icon;
        stepContainer.appendChild(iconText);

        var textEl = document.createElement('div');
        textEl.textContent = s.text;
        textEl.style.cssText = 'font-size:clamp(0.9rem,3vw,1.1rem);color:rgba(255,255,255,0.8);line-height:1.5;';
        stepContainer.appendChild(textEl);

        var dots = document.createElement('div');
        dots.style.cssText = 'margin-top:16px;display:flex;gap:8px;justify-content:center;';
        for (var i = 0; i < tutorial.steps.length; i++) {
            var dot = document.createElement('div');
            dot.style.cssText = 'width:8px;height:8px;border-radius:50%;background:' + (i === idx ? '#ffcc44' : 'rgba(255,255,255,0.2)') + ';transition:background 0.2s;';
            dots.appendChild(dot);
        }
        stepContainer.appendChild(dots);
    }

    function buildAnimHTML(anim) {
        if (anim === 'joystick') {
            return '<div style="width:60px;height:60px;border-radius:50%;border:2px solid rgba(255,255,255,0.3);position:absolute;top:10px;left:10px;display:flex;align-items:center;justify-content:center;">' +
                '<div style="width:24px;height:24px;border-radius:50%;background:rgba(255,200,50,0.6);animation:tutJoystick 2s ease-in-out infinite;"></div></div>';
        } else if (anim === 'swipe') {
            return '<div style="position:absolute;top:35px;left:10px;width:20px;height:20px;border-radius:50%;background:rgba(255,200,50,0.7);animation:tutSwipeH 2s ease-in-out infinite;"></div>' +
                '<div style="position:absolute;top:40px;left:15px;width:50px;height:2px;background:rgba(255,255,255,0.15);"></div>';
        } else if (anim === 'swipe-up') {
            return '<div style="position:absolute;bottom:5px;left:30px;width:20px;height:20px;border-radius:50%;background:rgba(255,200,50,0.7);animation:tutSwipeUp 2s ease-in-out infinite;"></div>' +
                '<div style="position:absolute;bottom:10px;left:39px;width:2px;height:50px;background:rgba(255,255,255,0.15);"></div>';
        } else if (anim === 'swipe-down') {
            return '<div style="position:absolute;top:5px;left:30px;width:20px;height:20px;border-radius:50%;background:rgba(255,200,50,0.7);animation:tutSwipeDown 2s ease-in-out infinite;"></div>' +
                '<div style="position:absolute;top:10px;left:39px;width:2px;height:50px;background:rgba(255,255,255,0.15);"></div>';
        } else if (anim === 'tap') {
            return '<div style="position:absolute;top:25px;left:25px;width:30px;height:30px;border-radius:50%;background:rgba(255,200,50,0.5);animation:tutTap 1.5s ease-in-out infinite;"></div>';
        } else if (anim === 'pinch') {
            return '<div style="position:absolute;top:20px;left:15px;width:16px;height:16px;border-radius:50%;background:rgba(255,200,50,0.6);animation:tutPinchL 2s ease-in-out infinite;"></div>' +
                '<div style="position:absolute;top:20px;left:50px;width:16px;height:16px;border-radius:50%;background:rgba(255,200,50,0.6);animation:tutPinchR 2s ease-in-out infinite;"></div>';
        }
        return '';
    }

    // Navigation buttons
    var navRow = document.createElement('div');
    navRow.style.cssText = 'margin-top:24px;display:flex;gap:12px;justify-content:center;';

    var nextBtn = document.createElement('button');
    nextBtn.textContent = 'Next →';
    nextBtn.style.cssText = 'padding:12px 28px;background:linear-gradient(135deg,#cc1122,#991122);color:#fff;font-size:1rem;font-weight:600;border:none;border-radius:10px;cursor:pointer;min-height:44px;touch-action:manipulation;-webkit-tap-highlight-color:transparent;';
    nextBtn.addEventListener('click', function () {
        stepIdx++;
        showStep(stepIdx);
    });

    var skipBtn = document.createElement('button');
    skipBtn.textContent = 'Skip';
    skipBtn.style.cssText = 'padding:12px 20px;background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.6);font-size:0.9rem;border:1px solid rgba(255,255,255,0.1);border-radius:10px;cursor:pointer;min-height:44px;touch-action:manipulation;-webkit-tap-highlight-color:transparent;';
    skipBtn.addEventListener('click', dismiss);

    navRow.appendChild(skipBtn);
    navRow.appendChild(nextBtn);
    inner.appendChild(navRow);
    overlay.appendChild(inner);

    function dismiss() {
        overlay.style.opacity = '0';
        setTimeout(function () {
            if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        }, 400);
        seen[gameId] = true;
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(seen)); } catch (e) { }
    }

    // ── Inject Animation Keyframes ───────────────────
    var style = document.createElement('style');
    style.textContent = [
        '@keyframes tutJoystick { 0%,100% { transform: translate(0,0); } 25% { transform: translate(12px,0); } 50% { transform: translate(0,-12px); } 75% { transform: translate(-12px,0); } }',
        '@keyframes tutSwipeH { 0%,100% { transform: translateX(0); opacity:0.7; } 50% { transform: translateX(40px); opacity:1; } }',
        '@keyframes tutSwipeUp { 0%,100% { transform: translateY(0); opacity:0.7; } 50% { transform: translateY(-40px); opacity:1; } }',
        '@keyframes tutSwipeDown { 0%,100% { transform: translateY(0); opacity:0.7; } 50% { transform: translateY(40px); opacity:1; } }',
        '@keyframes tutTap { 0%,100% { transform: scale(1); opacity:0.5; } 50% { transform: scale(0.7); opacity:1; } }',
        '@keyframes tutPinchL { 0%,100% { transform: translateX(0); } 50% { transform: translateX(-10px); } }',
        '@keyframes tutPinchR { 0%,100% { transform: translateX(0); } 50% { transform: translateX(10px); } }',
    ].join('\n');
    document.head.appendChild(style);

    // ── Show tutorial when game starts ────────────────
    // Wait for start button click
    var startBtn = document.getElementById('start-btn');
    if (startBtn) {
        var origClick = startBtn.onclick;
        startBtn.addEventListener('click', function () {
            setTimeout(function () {
                document.body.appendChild(overlay);
                requestAnimationFrame(function () {
                    overlay.style.opacity = '1';
                    showStep(0);
                });
            }, 500);
        }, { once: true });
    }

})();

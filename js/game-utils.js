/* ============================================
   ScaryGamesAI — Shared Game Utilities
   Provides: WebGL check, error screens, pause,
   restart, loading, difficulty, state management
   ============================================ */

var GameUtils = (function () {
    'use strict';

    // ============ GAME STATE MACHINE ============
    var STATE = { MENU: 'MENU', LOADING: 'LOADING', PLAYING: 'PLAYING', PAUSED: 'PAUSED', GAME_OVER: 'GAME_OVER', WIN: 'WIN' };
    var currentState = STATE.MENU;
    var stateChangeCallbacks = [];

    function getState() { return currentState; }

    function setState(newState) {
        var old = currentState;
        currentState = newState;
        for (var i = 0; i < stateChangeCallbacks.length; i++) {
            stateChangeCallbacks[i](newState, old);
        }
    }

    function onStateChange(cb) { stateChangeCallbacks.push(cb); }

    // ============ WEBGL CHECK ============
    function checkWebGL() {
        try {
            var c = document.createElement('canvas');
            return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
        } catch (e) { return false; }
    }

    function showBrowserError(container) {
        var isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
        var target = container || document.querySelector('.game-page') || document.body;
        var errorDiv = document.createElement('div');
        errorDiv.className = 'gu-browser-error';
        errorDiv.innerHTML =
            '<div class="gu-error-inner">' +
            '<div style="font-size:64px;margin-bottom:20px;">⚠️</div>' +
            '<h1>WebGL Not Available</h1>' +
            '<p>' + (isFirefox
                ? 'This 3D game requires WebGL, which is <strong>disabled in your browser (Firefox / LibreWolf)</strong>. Privacy-focused browsers often block WebGL to prevent fingerprinting.'
                : 'This 3D game requires WebGL, which is not supported by your current browser.') +
            '</p>' +
            '<div class="gu-browser-list">' +
            '<p style="font-weight:600;margin-bottom:12px;">🎮 To play this game, use one of:</p>' +
            '<div class="gu-browser-badges">' +
            '<span class="gu-badge-chrome">Chrome</span>' +
            '<span class="gu-badge-edge">Edge</span>' +
            '<span class="gu-badge-brave">Brave</span>' +
            '</div></div>' +
            '<a href="/games.html" class="gu-back-btn">← Back to Games</a>' +
            '</div>';
        target.appendChild(errorDiv);
    }

    // ============ DIFFICULTY SYSTEM ============
    var DIFFICULTIES = {
        easy: { label: 'Easy', icon: '💀', multiplier: 0.6, color: '#44cc44' },
        normal: { label: 'Normal', icon: '💀💀', multiplier: 1.0, color: '#ffaa00' },
        hard: { label: 'Hard', icon: '💀💀💀', multiplier: 1.5, color: '#ff4444' },
        nightmare: { label: 'Nightmare', icon: '☠️', multiplier: 2.2, color: '#cc00ff' },
    };
    var currentDifficulty = 'normal';

    function getDifficulty() { return currentDifficulty; }
    function getDifficultyData() { return DIFFICULTIES[currentDifficulty]; }
    function getMultiplier() { return DIFFICULTIES[currentDifficulty].multiplier; }

    function injectDifficultySelector(startScreenId) {
        var screen = document.getElementById(startScreenId);
        if (!screen) return;
        // Don't inject twice
        if (screen.querySelector('.gu-difficulty-bar')) return;

        var bar = document.createElement('div');
        bar.className = 'gu-difficulty-bar';
        bar.innerHTML = '<span class="gu-diff-label">Difficulty</span>';

        var keys = ['easy', 'normal', 'hard', 'nightmare'];
        for (var i = 0; i < keys.length; i++) {
            (function (key) {
                var btn = document.createElement('button');
                btn.className = 'gu-diff-btn' + (key === currentDifficulty ? ' active' : '');
                btn.setAttribute('data-diff', key);
                btn.style.setProperty('--diff-color', DIFFICULTIES[key].color);
                btn.textContent = DIFFICULTIES[key].label;
                btn.addEventListener('click', function () {
                    currentDifficulty = key;
                    var all = bar.querySelectorAll('.gu-diff-btn');
                    for (var j = 0; j < all.length; j++) all[j].classList.remove('active');
                    btn.classList.add('active');
                });
                bar.appendChild(btn);
            })(keys[i]);
        }

        // Insert before the start button
        var startBtn = screen.querySelector('#start-btn') || screen.querySelector('.play-btn');
        if (startBtn) {
            startBtn.parentNode.insertBefore(bar, startBtn);
        } else {
            screen.appendChild(bar);
        }
    }

    // ============ LOADING SCREEN ============
    function showLoadingScreen(container) {
        var target = container || document.querySelector('.game-page') || document.body;
        var loader = document.createElement('div');
        loader.id = 'gu-loading-screen';
        loader.className = 'gu-loading-screen';
        loader.innerHTML =
            '<div class="gu-loading-inner">' +
            '<div class="gu-loading-skull">💀</div>' +
            '<div class="gu-loading-bar-track"><div class="gu-loading-bar-fill" id="gu-loading-fill"></div></div>' +
            '<p class="gu-loading-text" id="gu-loading-text">Summoning nightmares...</p>' +
            '</div>';
        target.appendChild(loader);
        return loader;
    }

    function updateLoadingProgress(percent, text) {
        var fill = document.getElementById('gu-loading-fill');
        var txt = document.getElementById('gu-loading-text');
        if (fill) fill.style.width = Math.min(100, Math.max(0, percent)) + '%';
        if (txt && text) txt.textContent = text;
    }

    function hideLoadingScreen() {
        var loader = document.getElementById('gu-loading-screen');
        if (loader) {
            loader.classList.add('gu-loading-fade');
            setTimeout(function () { if (loader.parentNode) loader.parentNode.removeChild(loader); }, 600);
        }
    }

    // ============ PAUSE MENU ============
    var pauseOverlay = null;
    var onResume = null;
    var onRestart = null;
    var onQuit = null;

    function initPause(opts) {
        opts = opts || {};
        onResume = opts.onResume || null;
        onRestart = opts.onRestart || null;
        onQuit = opts.onQuit || function () { window.location.href = '/games.html'; };

        // Create pause overlay if not existing
        if (!document.getElementById('gu-pause-overlay')) {
            pauseOverlay = document.createElement('div');
            pauseOverlay.id = 'gu-pause-overlay';
            pauseOverlay.className = 'gu-pause-overlay';
            pauseOverlay.style.display = 'none';
            pauseOverlay.innerHTML =
                '<div class="gu-pause-inner">' +
                '<h2 class="gu-pause-title">⏸ PAUSED</h2>' +
                '<button class="gu-pause-btn gu-pause-resume" id="gu-resume-btn">▶ Resume</button>' +
                '<button class="gu-pause-btn gu-pause-restart" id="gu-restart-btn">🔄 Restart</button>' +
                '<button class="gu-pause-btn gu-pause-quit" id="gu-quit-btn">🚪 Quit to Menu</button>' +
                '</div>';
            var target = document.querySelector('.game-page') || document.body;
            target.appendChild(pauseOverlay);

            document.getElementById('gu-resume-btn').addEventListener('click', resumeGame);
            document.getElementById('gu-restart-btn').addEventListener('click', function () {
                pauseOverlay.style.display = 'none';
                if (onRestart) onRestart();
            });
            document.getElementById('gu-quit-btn').addEventListener('click', function () {
                if (onQuit) onQuit();
            });
        } else {
            pauseOverlay = document.getElementById('gu-pause-overlay');
        }

        // ESC key listener
        document.addEventListener('keydown', function (e) {
            if (e.code === 'Escape') {
                if (currentState === STATE.PLAYING) {
                    pauseGame();
                } else if (currentState === STATE.PAUSED) {
                    resumeGame();
                }
            }
        });
    }

    function pauseGame() {
        if (currentState !== STATE.PLAYING) return;
        setState(STATE.PAUSED);
        if (pauseOverlay) pauseOverlay.style.display = 'flex';
        try { document.exitPointerLock(); } catch (e) { }
    }

    function resumeGame() {
        if (currentState !== STATE.PAUSED) return;
        setState(STATE.PLAYING);
        if (pauseOverlay) pauseOverlay.style.display = 'none';
        if (onResume) onResume();
    }

    // ============ FULLSCREEN ============
    function toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(function () { });
        } else {
            document.exitFullscreen().catch(function () { });
        }
    }

    // ============ CONTROLS OVERLAY ============
    function showControlsOverlay(controlsId, duration, callback) {
        var overlay = document.getElementById(controlsId);
        if (!overlay) { if (callback) callback(); return; }
        overlay.style.display = 'flex';
        setTimeout(function () {
            overlay.classList.add('hiding');
            setTimeout(function () {
                overlay.style.display = 'none';
                overlay.classList.remove('hiding');
                if (callback) callback();
            }, 800);
        }, duration || 3000);
    }

    // ============ INJECT STYLES ============
    function injectStyles() {
        if (document.getElementById('gu-injected-styles')) return;
        var style = document.createElement('style');
        style.id = 'gu-injected-styles';
        style.textContent = [
            /* Browser Error */
            '.gu-browser-error{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#0a0a0a,#1a0000);color:#fff;font-family:Inter,sans-serif;text-align:center;padding:40px;}',
            '.gu-error-inner{max-width:520px;}',
            '.gu-error-inner h1{font-size:28px;color:#ff4444;margin:0 0 16px;text-transform:uppercase;letter-spacing:2px;}',
            '.gu-error-inner p{color:#aaa;font-size:16px;line-height:1.6;margin:0 0 24px;}',
            '.gu-error-inner strong{color:#ff8844;}',
            '.gu-browser-list{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:24px;margin-bottom:24px;}',
            '.gu-browser-list p{color:#fff;font-size:15px;margin:0;}',
            '.gu-browser-badges{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;}',
            '.gu-browser-badges span{padding:8px 16px;border-radius:8px;}',
            '.gu-badge-chrome{background:rgba(66,133,244,0.15);border:1px solid rgba(66,133,244,0.3);color:#88aaff;}',
            '.gu-badge-edge{background:rgba(0,120,212,0.15);border:1px solid rgba(0,120,212,0.3);color:#66aaff;}',
            '.gu-badge-brave{background:rgba(251,84,43,0.15);border:1px solid rgba(251,84,43,0.3);color:#ff8866;}',
            '.gu-back-btn{display:inline-block;padding:12px 32px;background:linear-gradient(135deg,#ff4444,#cc2222);color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;transition:transform 0.2s;}',
            '.gu-back-btn:hover{transform:scale(1.05);}',

            /* Difficulty Selector */
            '.gu-difficulty-bar{display:flex;align-items:center;gap:8px;margin:20px auto;justify-content:center;flex-wrap:wrap;}',
            '.gu-diff-label{color:#888;font-size:0.85rem;font-weight:600;text-transform:uppercase;letter-spacing:1px;margin-right:8px;}',
            '.gu-diff-btn{padding:8px 18px;border:1px solid rgba(255,255,255,0.12);border-radius:8px;background:rgba(255,255,255,0.04);color:#999;font-size:0.82rem;font-weight:600;cursor:pointer;transition:all 0.25s;font-family:Inter,sans-serif;text-transform:uppercase;letter-spacing:0.5px;}',
            '.gu-diff-btn:hover{background:rgba(255,255,255,0.08);color:#ccc;}',
            '.gu-diff-btn.active{background:var(--diff-color,#ffaa00);color:#000;border-color:var(--diff-color,#ffaa00);box-shadow:0 0 16px var(--diff-color,#ffaa00)44;}',

            /* Loading Screen */
            '.gu-loading-screen{position:fixed;inset:0;z-index:9998;display:flex;align-items:center;justify-content:center;background:#0a0a0f;transition:opacity 0.6s;}',
            '.gu-loading-fade{opacity:0;pointer-events:none;}',
            '.gu-loading-inner{text-align:center;}',
            '.gu-loading-skull{font-size:64px;animation:gu-skull-pulse 1.5s ease-in-out infinite;}',
            '@keyframes gu-skull-pulse{0%,100%{transform:scale(1);opacity:1;}50%{transform:scale(1.1);opacity:0.7;}}',
            '.gu-loading-bar-track{width:260px;height:6px;background:rgba(255,255,255,0.08);border-radius:3px;margin:24px auto 16px;overflow:hidden;}',
            '.gu-loading-bar-fill{height:100%;width:0;background:linear-gradient(90deg,#cc1122,#ff4444);border-radius:3px;transition:width 0.3s ease;}',
            '.gu-loading-text{color:#666;font-size:0.85rem;font-family:Inter,sans-serif;}',

            /* Pause Menu */
            '.gu-pause-overlay{position:fixed;inset:0;z-index:9000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.85);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);animation:fadeIn 0.2s ease;}',
            '.gu-pause-inner{text-align:center;min-width:280px;}',
            '.gu-pause-title{font-family:Creepster,cursive;font-size:3rem;color:#cc1122;text-shadow:0 0 30px rgba(204,17,34,0.5);margin-bottom:32px;}',
            '.gu-pause-btn{display:block;width:100%;padding:14px 0;margin-bottom:12px;border:1px solid rgba(255,255,255,0.1);border-radius:10px;background:rgba(255,255,255,0.04);color:#ddd;font-size:1rem;font-weight:600;cursor:pointer;transition:all 0.25s;font-family:Inter,sans-serif;}',
            '.gu-pause-btn:hover{background:rgba(255,255,255,0.1);border-color:rgba(255,255,255,0.2);transform:translateY(-1px);}',
            '.gu-pause-resume:hover{border-color:#00ff88;box-shadow:0 0 20px rgba(0,255,136,0.2);}',
            '.gu-pause-restart:hover{border-color:#ffaa00;box-shadow:0 0 20px rgba(255,170,0,0.2);}',
            '.gu-pause-quit:hover{border-color:#ff4444;box-shadow:0 0 20px rgba(255,68,68,0.2);}',
        ].join('\n');
        document.head.appendChild(style);
    }

    // Auto-inject styles on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectStyles);
    } else {
        injectStyles();
    }

    // ============ PUBLIC API ============
    return {
        // State
        STATE: STATE,
        getState: getState,
        setState: setState,
        onStateChange: onStateChange,

        // WebGL
        checkWebGL: checkWebGL,
        showBrowserError: showBrowserError,

        // Difficulty
        getDifficulty: getDifficulty,
        getDifficultyData: getDifficultyData,
        getMultiplier: getMultiplier,
        injectDifficultySelector: injectDifficultySelector,

        // Loading
        showLoadingScreen: showLoadingScreen,
        updateLoadingProgress: updateLoadingProgress,
        hideLoadingScreen: hideLoadingScreen,

        // Pause
        initPause: initPause,
        pauseGame: pauseGame,
        resumeGame: resumeGame,

        // Utils
        toggleFullscreen: toggleFullscreen,
        showControlsOverlay: showControlsOverlay,
    };
})();

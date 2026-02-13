/* ============================================
   ScaryGamesAI — Shared Game Utilities v2.0
   Provides: WebGL check, error screens, pause,
   restart, loading, difficulty, state management,
   universal settings, HUD, game integration
   ============================================ */

var GameUtils = (function () {
    'use strict';

    // ============ VERSION ============
    var VERSION = '2.0.0';

    // ============ GAME STATE MACHINE ============
    var STATE = { MENU: 'MENU', LOADING: 'LOADING', PLAYING: 'PLAYING', PAUSED: 'PAUSED', GAME_OVER: 'GAME_OVER', WIN: 'WIN' };
    var currentState = STATE.MENU;
    var stateChangeCallbacks = [];
    var currentGameId = null;

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

    // ============ PAUSE MENU (ENHANCED) ============
    var pauseOverlay = null;
    var onResume = null;
    var onRestart = null;
    var onQuit = null;
    var settingsPanel = null;
    var statsPanel = null;

    function initPause(opts) {
        opts = opts || {};
        onResume = opts.onResume || null;
        onRestart = opts.onRestart || null;
        onQuit = opts.onQuit || function () { window.location.href = '/games.html'; };
        currentGameId = opts.gameId || null;

        // Initialize universal systems if available
        if (currentGameId && typeof UniversalGameSystem !== 'undefined') {
            UniversalGameSystem.init(currentGameId);
        }

        // Create enhanced pause overlay
        if (!document.getElementById('gu-pause-overlay')) {
            pauseOverlay = document.createElement('div');
            pauseOverlay.id = 'gu-pause-overlay';
            pauseOverlay.className = 'gu-pause-overlay';
            pauseOverlay.style.display = 'none';
            pauseOverlay.innerHTML =
                '<div class="gu-pause-container">' +
                '<div class="gu-pause-main">' +
                '<h2 class="gu-pause-title">⏸ PAUSED</h2>' +
                '<div class="gu-pause-buttons">' +
                '<button class="gu-pause-btn gu-pause-resume" id="gu-resume-btn">▶ Resume</button>' +
                '<button class="gu-pause-btn gu-pause-restart" id="gu-restart-btn">🔄 Restart</button>' +
                '<button class="gu-pause-btn gu-pause-stats" id="gu-stats-btn">📊 Session Stats</button>' +
                '<button class="gu-pause-btn gu-pause-settings" id="gu-settings-btn">⚙️ Settings</button>' +
                '<button class="gu-pause-btn gu-pause-screenshot" id="gu-screenshot-btn">📷 Screenshot</button>' +
                '<button class="gu-pause-btn gu-pause-quit" id="gu-quit-btn">🚪 Quit to Menu</button>' +
                '</div>' +
                '</div>' +
                '<div class="gu-pause-sidebar">' +
                '<div class="gu-pause-session-info" id="gu-session-info"></div>' +
                '<div class="gu-pause-daily-challenges" id="gu-daily-challenges"></div>' +
                '</div>' +
                '</div>';

            var target = document.querySelector('.game-page') || document.body;
            target.appendChild(pauseOverlay);

            // Button events
            document.getElementById('gu-resume-btn').addEventListener('click', resumeGame);
            document.getElementById('gu-restart-btn').addEventListener('click', function () {
                pauseOverlay.style.display = 'none';
                if (onRestart) onRestart();
            });
            document.getElementById('gu-quit-btn').addEventListener('click', function () {
                if (onQuit) onQuit();
            });
            document.getElementById('gu-settings-btn').addEventListener('click', toggleSettingsPanel);
            document.getElementById('gu-stats-btn').addEventListener('click', toggleStatsPanel);
            document.getElementById('gu-screenshot-btn').addEventListener('click', captureScreenshot);

            // Create settings panel (hidden initially)
            createSettingsPanel();
            createStatsPanel();
        } else {
            pauseOverlay = document.getElementById('gu-pause-overlay');
        }

        // Update session info
        updateSessionInfo();

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

        // F12 for screenshot during gameplay
        document.addEventListener('keydown', function (e) {
            if (e.code === 'F12' && currentState === STATE.PLAYING) {
                e.preventDefault();
                captureScreenshot();
            }
        });
    }

    function createSettingsPanel() {
        if (document.getElementById('gu-settings-panel')) return;

        settingsPanel = document.createElement('div');
        settingsPanel.id = 'gu-settings-panel';
        settingsPanel.className = 'gu-settings-panel';
        settingsPanel.style.display = 'none';
        settingsPanel.innerHTML =
            '<div class="gu-settings-header">' +
            '<h3>⚙️ Settings</h3>' +
            '<button class="gu-settings-close" id="gu-settings-close">✕</button>' +
            '</div>' +
            '<div class="gu-settings-content">' +
            '<div class="gu-settings-section">' +
            '<h4>🔊 Audio</h4>' +
            '<div class="gu-setting-item">' +
            '<label>Master Volume</label>' +
            '<input type="range" id="gu-master-vol" min="0" max="100" value="100">' +
            '<span id="gu-master-vol-val">100%</span>' +
            '</div>' +
            '<div class="gu-setting-item">' +
            '<label>Music Volume</label>' +
            '<input type="range" id="gu-music-vol" min="0" max="100" value="80">' +
            '<span id="gu-music-vol-val">80%</span>' +
            '</div>' +
            '<div class="gu-setting-item">' +
            '<label>SFX Volume</label>' +
            '<input type="range" id="gu-sfx-vol" min="0" max="100" value="100">' +
            '<span id="gu-sfx-vol-val">100%</span>' +
            '</div>' +
            '</div>' +
            '<div class="gu-settings-section">' +
            '<h4>🎮 Gameplay</h4>' +
            '<div class="gu-setting-item">' +
            '<label>Screen Shake</label>' +
            '<input type="checkbox" id="gu-screen-shake" checked>' +
            '</div>' +
            '<div class="gu-setting-item">' +
            '<label>Show FPS</label>' +
            '<input type="checkbox" id="gu-show-fps">' +
            '</div>' +
            '<div class="gu-setting-item">' +
            '<label>Reduced Motion</label>' +
            '<input type="checkbox" id="gu-reduced-motion">' +
            '</div>' +
            '</div>' +
            '<div class="gu-settings-section">' +
            '<h4>👁️ Visual</h4>' +
            '<div class="gu-setting-item">' +
            '<label>Brightness</label>' +
            '<input type="range" id="gu-brightness" min="50" max="150" value="100">' +
            '<span id="gu-brightness-val">100%</span>' +
            '</div>' +
            '<div class="gu-setting-item">' +
            '<label>Colorblind Mode</label>' +
            '<select id="gu-colorblind">' +
            '<option value="none">None</option>' +
            '<option value="protanopia">Protanopia</option>' +
            '<option value="deuteranopia">Deuteranopia</option>' +
            '<option value="tritanopia">Tritanopia</option>' +
            '</select>' +
            '</div>' +
            '</div>' +
            '</div>';

        document.body.appendChild(settingsPanel);

        // Close button
        document.getElementById('gu-settings-close').addEventListener('click', function () {
            settingsPanel.style.display = 'none';
        });

        // Settings change handlers
        var sliders = ['master-vol', 'music-vol', 'sfx-vol', 'brightness'];
        sliders.forEach(function (id) {
            var slider = document.getElementById('gu-' + id);
            var val = document.getElementById('gu-' + id + '-val');
            if (slider && val) {
                slider.addEventListener('input', function () {
                    val.textContent = this.value + '%';
                    saveSettings();
                });
            }
        });

        var checkboxes = ['screen-shake', 'show-fps', 'reduced-motion'];
        checkboxes.forEach(function (id) {
            var cb = document.getElementById('gu-' + id);
            if (cb) {
                cb.addEventListener('change', saveSettings);
            }
        });

        var selects = ['colorblind'];
        selects.forEach(function (id) {
            var sel = document.getElementById('gu-' + id);
            if (sel) {
                sel.addEventListener('change', saveSettings);
            }
        });

        // Load saved settings
        loadSettings();
    }

    function createStatsPanel() {
        if (document.getElementById('gu-stats-panel')) return;

        statsPanel = document.createElement('div');
        statsPanel.id = 'gu-stats-panel';
        statsPanel.className = 'gu-stats-panel';
        statsPanel.style.display = 'none';
        statsPanel.innerHTML =
            '<div class="gu-stats-header">' +
            '<h3>📊 Session Statistics</h3>' +
            '<button class="gu-stats-close" id="gu-stats-close">✕</button>' +
            '</div>' +
            '<div class="gu-stats-content" id="gu-stats-content">' +
            '</div>';

        document.body.appendChild(statsPanel);

        document.getElementById('gu-stats-close').addEventListener('click', function () {
            statsPanel.style.display = 'none';
        });
    }

    function toggleSettingsPanel() {
        if (!settingsPanel) return;
        settingsPanel.style.display = settingsPanel.style.display === 'none' ? 'block' : 'none';
        if (statsPanel) statsPanel.style.display = 'none';
    }

    function toggleStatsPanel() {
        if (!statsPanel) return;
        statsPanel.style.display = statsPanel.style.display === 'none' ? 'block' : 'none';
        if (settingsPanel) settingsPanel.style.display = 'none';
        updateStatsDisplay();
    }

    function updateStatsDisplay() {
        var content = document.getElementById('gu-stats-content');
        if (!content) return;

        var stats = getSessionStats();
        var html = '<div class="gu-stats-grid">';

        html += '<div class="gu-stat-item"><span class="gu-stat-label">⏱️ Time Played</span><span class="gu-stat-value">' + formatTime(stats.duration) + '</span></div>';
        html += '<div class="gu-stat-item"><span class="gu-stat-label">💀 Deaths</span><span class="gu-stat-value">' + stats.deaths + '</span></div>';
        html += '<div class="gu-stat-item"><span class="gu-stat-label">⚔️ Kills</span><span class="gu-stat-value">' + stats.kills + '</span></div>';
        html += '<div class="gu-stat-item"><span class="gu-stat-label">🎯 Score</span><span class="gu-stat-value">' + formatNumber(stats.score) + '</span></div>';
        html += '<div class="gu-stat-item"><span class="gu-stat-label">💎 Items Collected</span><span class="gu-stat-value">' + stats.items + '</span></div>';
        html += '<div class="gu-stat-item"><span class="gu-stat-label">🔍 Secrets Found</span><span class="gu-stat-value">' + stats.secrets + '</span></div>';
        html += '<div class="gu-stat-item"><span class="gu-stat-label">🏃 Distance</span><span class="gu-stat-value">' + formatNumber(Math.floor(stats.distance)) + 'm</span></div>';
        html += '<div class="gu-stat-item"><span class="gu-stat-label">🔥 Damage Dealt</span><span class="gu-stat-value">' + formatNumber(Math.floor(stats.damageDealt)) + '</span></div>';

        html += '</div>';

        // Achievements progress
        if (typeof UniversalGameSystem !== 'undefined') {
            html += '<div class="gu-stats-section"><h4>🏆 Recent Achievements</h4>';
            var achievements = UniversalGameSystem.achievements.getUnlocked().slice(-3);
            if (achievements.length > 0) {
                achievements.forEach(function (a) {
                    html += '<div class="gu-achievement-mini"><span class="gu-achievement-icon">' + a.icon + '</span><span>' + a.name + '</span></div>';
                });
            } else {
                html += '<p class="gu-stats-empty">No achievements yet. Keep playing!</p>';
            }
            html += '</div>';
        }

        content.innerHTML = html;
    }

    function updateSessionInfo() {
        var info = document.getElementById('gu-session-info');
        if (!info) return;

        var stats = getSessionStats();
        info.innerHTML =
            '<h4>📍 Current Session</h4>' +
            '<div class="gu-session-stat"><span>⏱️</span><span>' + formatTime(stats.duration) + '</span></div>' +
            '<div class="gu-session-stat"><span>🎯</span><span>' + formatNumber(stats.score) + '</span></div>' +
            '<div class="gu-session-stat"><span>💀</span><span>' + stats.deaths + ' deaths</span></div>';

        // Daily challenges
        var challenges = document.getElementById('gu-daily-challenges');
        if (challenges && typeof UniversalGameSystem !== 'undefined') {
            var dailyChallenges = UniversalGameSystem.daily.getChallenges();
            var challengesHtml = '<h4>📋 Daily Challenges</h4>';
            dailyChallenges.forEach(function (c) {
                var status = c.completed ? '✅' : '⭕';
                challengesHtml += '<div class="gu-daily-challenge ' + (c.completed ? 'completed' : '') + '">' +
                    '<span class="gu-challenge-status">' + status + '</span>' +
                    '<span class="gu-challenge-name">' + c.name + '</span>' +
                    '<span class="gu-challenge-reward">+' + c.reward + '</span>' +
                    '</div>';
            });
            challenges.innerHTML = challengesHtml;
        }
    }

    function getSessionStats() {
        if (typeof UniversalGameSystem !== 'undefined' && UniversalGameSystem.stats) {
            var duration = UniversalGameSystem.stats.getSessionDuration();
            return {
                duration: duration,
                deaths: 0,
                kills: 0,
                score: 0,
                items: 0,
                secrets: 0,
                distance: 0,
                damageDealt: 0
            };
        }
        return {
            duration: 0,
            deaths: 0,
            kills: 0,
            score: 0,
            items: 0,
            secrets: 0,
            distance: 0,
            damageDealt: 0
        };
    }

    function formatTime(ms) {
        var seconds = Math.floor(ms / 1000);
        var minutes = Math.floor(seconds / 60);
        var hours = Math.floor(minutes / 60);
        if (hours > 0) {
            return hours + ':' + String(minutes % 60).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0');
        }
        return String(minutes).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0');
    }

    function formatNumber(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    }

    function saveSettings() {
        var settings = {
            masterVolume: document.getElementById('gu-master-vol').value,
            musicVolume: document.getElementById('gu-music-vol').value,
            sfxVolume: document.getElementById('gu-sfx-vol').value,
            screenShake: document.getElementById('gu-screen-shake').checked,
            showFps: document.getElementById('gu-show-fps').checked,
            reducedMotion: document.getElementById('gu-reduced-motion').checked,
            brightness: document.getElementById('gu-brightness').value,
            colorblindMode: document.getElementById('gu-colorblind').value
        };
        localStorage.setItem('sgai_game_settings', JSON.stringify(settings));
        applySettings(settings);
    }

    function loadSettings() {
        var saved = localStorage.getItem('sgai_game_settings');
        if (saved) {
            var settings = JSON.parse(saved);
            if (document.getElementById('gu-master-vol')) {
                document.getElementById('gu-master-vol').value = settings.masterVolume || 100;
                document.getElementById('gu-master-vol-val').textContent = (settings.masterVolume || 100) + '%';
            }
            if (document.getElementById('gu-music-vol')) {
                document.getElementById('gu-music-vol').value = settings.musicVolume || 80;
                document.getElementById('gu-music-vol-val').textContent = (settings.musicVolume || 80) + '%';
            }
            if (document.getElementById('gu-sfx-vol')) {
                document.getElementById('gu-sfx-vol').value = settings.sfxVolume || 100;
                document.getElementById('gu-sfx-vol-val').textContent = (settings.sfxVolume || 100) + '%';
            }
            if (document.getElementById('gu-screen-shake')) {
                document.getElementById('gu-screen-shake').checked = settings.screenShake !== false;
            }
            if (document.getElementById('gu-show-fps')) {
                document.getElementById('gu-show-fps').checked = settings.showFps === true;
            }
            if (document.getElementById('gu-reduced-motion')) {
                document.getElementById('gu-reduced-motion').checked = settings.reducedMotion === true;
            }
            if (document.getElementById('gu-brightness')) {
                document.getElementById('gu-brightness').value = settings.brightness || 100;
                document.getElementById('gu-brightness-val').textContent = (settings.brightness || 100) + '%';
            }
            if (document.getElementById('gu-colorblind')) {
                document.getElementById('gu-colorblind').value = settings.colorblindMode || 'none';
            }
            applySettings(settings);
        }
    }

    function applySettings(settings) {
        // Apply brightness filter
        var gameCanvas = document.getElementById('game-canvas');
        if (gameCanvas) {
            gameCanvas.style.filter = 'brightness(' + (settings.brightness || 100) + '%)';
        }

        // Apply reduced motion
        if (settings.reducedMotion) {
            document.body.classList.add('gu-reduced-motion');
        } else {
            document.body.classList.remove('gu-reduced-motion');
        }

        // Dispatch settings change event
        document.dispatchEvent(new CustomEvent('gameSettingsChanged', { detail: settings }));
    }

    function getSettings() {
        var saved = localStorage.getItem('sgai_game_settings');
        return saved ? JSON.parse(saved) : {
            masterVolume: 100,
            musicVolume: 80,
            sfxVolume: 100,
            screenShake: true,
            showFps: false,
            reducedMotion: false,
            brightness: 100,
            colorblindMode: 'none'
        };
    }

    function captureScreenshot() {
        if (typeof UniversalGameSystem !== 'undefined' && UniversalGameSystem.media) {
            var screenshot = UniversalGameSystem.media.screenshot();
            if (screenshot) {
                showNotification('Screenshot saved!', 'success');
            }
        } else {
            // Fallback: basic screenshot
            var canvas = document.getElementById('game-canvas');
            if (canvas) {
                var link = document.createElement('a');
                link.download = 'scarygames_screenshot_' + Date.now() + '.png';
                link.href = canvas.toDataURL();
                link.click();
                showNotification('Screenshot saved!', 'success');
            }
        }
    }

    function showNotification(message, type) {
        var notification = document.createElement('div');
        notification.className = 'gu-notification gu-notification-' + (type || 'info');
        notification.textContent = message;
        document.body.appendChild(notification);

        requestAnimationFrame(function () {
            notification.classList.add('gu-notification-show');
        });

        setTimeout(function () {
            notification.classList.remove('gu-notification-show');
            setTimeout(function () {
                notification.remove();
            }, 300);
        }, 2000);
    }

    function pauseGame() {
        if (currentState !== STATE.PLAYING) return;
        setState(STATE.PAUSED);
        if (pauseOverlay) {
            pauseOverlay.style.display = 'flex';
            updateSessionInfo();
        }
        try { document.exitPointerLock(); } catch (e) { }
    }

    function resumeGame() {
        if (currentState !== STATE.PAUSED) return;
        setState(STATE.PLAYING);
        if (pauseOverlay) pauseOverlay.style.display = 'none';
        if (settingsPanel) settingsPanel.style.display = 'none';
        if (statsPanel) statsPanel.style.display = 'none';
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

    function injectAccessibleControlsDocumentation() {
        var gamePage = document.querySelector('.game-page');
        var overlay = document.getElementById('controls-overlay');
        if (!gamePage || !overlay || document.getElementById('gu-controls-doc')) return;

        var controlItems = overlay.querySelectorAll('.control-item');
        if (!controlItems.length) return;

        var section = document.createElement('section');
        section.id = 'gu-controls-doc';
        section.className = 'gu-controls-doc';
        section.setAttribute('aria-label', 'Keyboard and game controls');

        var listItems = [];
        for (var i = 0; i < controlItems.length; i++) {
            var item = controlItems[i];
            var keyEl = item.querySelector('.control-key');
            var keyText = keyEl ? keyEl.textContent.trim() : '';
            var actionText = item.textContent.replace(keyText, '').trim();
            if (!actionText && keyText) actionText = 'Action';
            if (!keyText && !actionText) continue;
            listItems.push('<li><strong>' + keyText + '</strong> — ' + actionText + '</li>');
        }

        if (!listItems.length) return;

        section.innerHTML =
            '<h2>Keyboard & Game Controls</h2>' +
            '<p>Use the following controls while playing this game.</p>' +
            '<ul>' + listItems.join('') + '</ul>';

        gamePage.appendChild(section);
    }

    function enhanceCanvasAccessibility() {
        var canvas = document.getElementById('game-canvas');
        if (!canvas) return;

        if (!canvas.hasAttribute('aria-label')) {
            canvas.setAttribute('aria-label', 'Game canvas showing live gameplay visuals.');
        }
        canvas.setAttribute('role', 'img');

        if (!document.getElementById('gu-canvas-description')) {
            var description = document.createElement('p');
            description.id = 'gu-canvas-description';
            description.className = 'sr-only';
            description.textContent = 'This game is primarily visual and rendered in a canvas. Use the Keyboard and Game Controls section for controls and gameplay actions.';
            var gamePage = document.querySelector('.game-page') || document.body;
            gamePage.insertBefore(description, gamePage.firstChild);
        }

        canvas.setAttribute('aria-describedby', 'gu-canvas-description');
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

            /* Enhanced Pause Menu */
            '.gu-pause-overlay{position:fixed;inset:0;z-index:9000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.9);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);}',
            '.gu-pause-container{display:flex;gap:40px;align-items:flex-start;max-width:900px;width:90%;}',
            '.gu-pause-main{flex:1;min-width:300px;}',
            '.gu-pause-title{font-family:Creepster,cursive;font-size:3rem;color:#cc1122;text-shadow:0 0 30px rgba(204,17,34,0.5);margin-bottom:24px;text-align:center;}',
            '.gu-pause-buttons{display:flex;flex-direction:column;gap:10px;}',
            '.gu-pause-btn{display:flex;align-items:center;justify-content:center;gap:10px;padding:14px 20px;border:1px solid rgba(255,255,255,0.1);border-radius:10px;background:rgba(255,255,255,0.04);color:#ddd;font-size:1rem;font-weight:600;cursor:pointer;transition:all 0.25s;font-family:Inter,sans-serif;}',
            '.gu-pause-btn:hover{background:rgba(255,255,255,0.1);border-color:rgba(255,255,255,0.2);transform:translateY(-2px);}',
            '.gu-pause-resume:hover{border-color:#00ff88;box-shadow:0 0 20px rgba(0,255,136,0.2);}',
            '.gu-pause-restart:hover{border-color:#ffaa00;box-shadow:0 0 20px rgba(255,170,0,0.2);}',
            '.gu-pause-quit:hover{border-color:#ff4444;box-shadow:0 0 20px rgba(255,68,68,0.2);}',
            '.gu-pause-sidebar{width:280px;display:flex;flex-direction:column;gap:20px;}',

            /* Session Info */
            '.gu-pause-session-info{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:16px;}',
            '.gu-pause-session-info h4{font-size:0.9rem;color:#888;margin:0 0 12px;text-transform:uppercase;letter-spacing:1px;}',
            '.gu-session-stat{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);}',
            '.gu-session-stat:last-child{border-bottom:none;}',
            '.gu-session-stat span:first-child{color:#888;}',
            '.gu-session-stat span:last-child{color:#fff;font-weight:600;}',

            /* Daily Challenges in Pause */
            '.gu-pause-daily-challenges{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:16px;}',
            '.gu-pause-daily-challenges h4{font-size:0.9rem;color:#888;margin:0 0 12px;text-transform:uppercase;letter-spacing:1px;}',
            '.gu-daily-challenge{display:flex;align-items:center;gap:8px;padding:8px;border-radius:6px;background:rgba(255,255,255,0.03);margin-bottom:6px;font-size:0.85rem;}',
            '.gu-daily-challenge.completed{opacity:0.6;}',
            '.gu-challenge-status{font-size:1rem;}',
            '.gu-challenge-name{flex:1;color:#ddd;}',
            '.gu-challenge-reward{color:#00ff88;font-weight:600;}',

            /* Settings Panel */
            '.gu-settings-panel{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:linear-gradient(135deg,rgba(20,20,30,0.98),rgba(10,10,20,0.98));padding:24px;border-radius:16px;border:1px solid rgba(255,255,255,0.15);z-index:9100;min-width:400px;max-width:90vw;max-height:80vh;overflow-y:auto;}',
            '.gu-settings-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid rgba(255,255,255,0.1);}',
            '.gu-settings-header h3{font-family:Creepster,cursive;font-size:1.5rem;color:#cc1122;margin:0;}',
            '.gu-settings-close{background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);border-radius:6px;color:#fff;width:32px;height:32px;cursor:pointer;font-size:1rem;}',
            '.gu-settings-close:hover{background:rgba(255,68,68,0.3);}',
            '.gu-settings-section{margin-bottom:20px;}',
            '.gu-settings-section h4{font-size:0.9rem;color:#888;margin:0 0 12px;text-transform:uppercase;letter-spacing:1px;}',
            '.gu-setting-item{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);}',
            '.gu-setting-item label{color:#ddd;font-size:0.9rem;}',
            '.gu-setting-item input[type="range"]{width:120px;accent-color:#cc1122;}',
            '.gu-setting-item input[type="checkbox"]{width:18px;height:18px;accent-color:#cc1122;}',
            '.gu-setting-item select{padding:6px 12px;border-radius:6px;border:1px solid rgba(255,255,255,0.2);background:rgba(0,0,0,0.5);color:#fff;font-size:0.85rem;}',
            '.gu-setting-item span{color:#888;font-size:0.85rem;min-width:40px;text-align:right;}',

            /* Stats Panel */
            '.gu-stats-panel{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:linear-gradient(135deg,rgba(20,20,30,0.98),rgba(10,10,20,0.98));padding:24px;border-radius:16px;border:1px solid rgba(255,255,255,0.15);z-index:9100;min-width:400px;max-width:90vw;max-height:80vh;overflow-y:auto;}',
            '.gu-stats-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid rgba(255,255,255,0.1);}',
            '.gu-stats-header h3{font-family:Creepster,cursive;font-size:1.5rem;color:#cc1122;margin:0;}',
            '.gu-stats-close{background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);border-radius:6px;color:#fff;width:32px;height:32px;cursor:pointer;font-size:1rem;}',
            '.gu-stats-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;}',
            '.gu-stat-item{background:rgba(255,255,255,0.05);border-radius:8px;padding:12px;display:flex;flex-direction:column;gap:4px;}',
            '.gu-stat-label{font-size:0.8rem;color:#888;}',
            '.gu-stat-value{font-size:1.2rem;font-weight:600;color:#fff;}',
            '.gu-stats-section{margin-top:20px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.1);}',
            '.gu-stats-section h4{font-size:0.9rem;color:#888;margin:0 0 12px;text-transform:uppercase;}',
            '.gu-achievement-mini{display:flex;align-items:center;gap:8px;padding:8px;background:rgba(139,92,246,0.1);border-radius:6px;margin-bottom:6px;}',
            '.gu-achievement-icon{font-size:1.2rem;}',
            '.gu-achievement-mini span:last-child{color:#ddd;font-size:0.9rem;}',
            '.gu-stats-empty{color:#666;font-style:italic;font-size:0.85rem;}',

            /* Notifications */
            '.gu-notification{position:fixed;bottom:20px;left:50%;transform:translateX(-50%) translateY(100px);padding:12px 24px;border-radius:8px;font-weight:600;font-size:0.9rem;z-index:9999;transition:transform 0.3s ease;font-family:Inter,sans-serif;}',
            '.gu-notification-show{transform:translateX(-50%) translateY(0);}',
            '.gu-notification-success{background:rgba(0,255,136,0.9);color:#000;}',
            '.gu-notification-info{background:rgba(100,150,255,0.9);color:#fff;}',
            '.gu-notification-error{background:rgba(255,68,68,0.9);color:#fff;}',

            /* Reduced Motion */
            '.gu-reduced-motion *{animation-duration:0.01ms!important;animation-iteration-count:1!important;transition-duration:0.01ms!important;}',

            /* Responsive */
            '@media(max-width:768px){.gu-pause-container{flex-direction:column;}.gu-pause-sidebar{width:100%;}.gu-settings-panel,.gu-stats-panel{min-width:90%;padding:16px;}.gu-stats-grid{grid-template-columns:1fr;}}',

            /* Accessible Controls Documentation */
            '.gu-controls-doc{max-width:900px;margin:24px auto 12px;padding:16px 18px;border:1px solid rgba(255,255,255,0.15);border-radius:12px;background:rgba(0,0,0,0.55);color:#ddd;font-family:Inter,sans-serif;}',
            '.gu-controls-doc h2{font-size:1.1rem;margin:0 0 10px;color:#fff;}',
            '.gu-controls-doc p{margin:0 0 10px;color:#aaa;font-size:0.92rem;}',
            '.gu-controls-doc ul{margin:0;padding-left:18px;display:grid;gap:6px;}',
            '.gu-controls-doc li{line-height:1.4;font-size:0.9rem;}',
            '.gu-controls-doc strong{color:#fff;}',
        ].join('\n');
        document.head.appendChild(style);
    }

    function initAccessibilityHelpers() {
        injectAccessibleControlsDocumentation();
        enhanceCanvasAccessibility();
    }

    // Auto-inject styles on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            injectStyles();
            initAccessibilityHelpers();
        });
    } else {
        injectStyles();
        initAccessibilityHelpers();
    }

    // ============ VISUAL ENHANCEMENTS INTEGRATION ============
    function getVisualEnhancements() {
        return typeof VisualEnhancements !== 'undefined' ? VisualEnhancements : null;
    }

    // Convenience wrappers for visual effects
    function shakeScreen(intensity, duration) {
        var ve = getVisualEnhancements();
        if (ve && ve.shake) ve.shake(intensity, duration);
    }

    function onPlayerDamage(intensity) {
        var ve = getVisualEnhancements();
        if (ve && ve.onDamage) ve.onDamage(intensity);
    }

    function onPlayerDeath() {
        var ve = getVisualEnhancements();
        if (ve && ve.onDeath) ve.onDeath();
    }

    function onJumpscare() {
        var ve = getVisualEnhancements();
        if (ve && ve.onJumpscare) ve.onJumpscare();
    }

    function setIntensityLevel(level) {
        var ve = getVisualEnhancements();
        if (ve && ve.setIntensity) ve.setIntensity(level);
    }

    function spawnBloodSplatter(x, y, size) {
        var ve = getVisualEnhancements();
        if (ve && ve.bloodSplatter) ve.bloodSplatter(x, y, size);
    }

    function spawnEffectParticles(count, x, y, type) {
        var ve = getVisualEnhancements();
        if (ve && ve.spawnParticles) ve.spawnParticles(count, x, y, type);
    }

    function isVisualFeatureAvailable(feature) {
        var ve = getVisualEnhancements();
        if (ve && ve.isFeatureAvailable) return ve.isFeatureAvailable(feature);
        return false;
    }

    // ============ WEBGL CONTEXT POOLING ============
    var webglPool = [];
    var lifecycleBound = false;

    function normalizeGlType(type) {
        return (type === 'webgl' || type === 'experimental-webgl') ? 'webgl' : 'webgl2';
    }

    function bindPoolLifecycle() {
        if (lifecycleBound) return;
        lifecycleBound = true;

        function trimPool() {
            while (webglPool.length) {
                var item = webglPool.pop();
                if (!item || !item.canvas) continue;

                try {
                    var ctx = item.context || item.canvas.getContext(item.type || 'webgl2') || item.canvas.getContext('webgl');
                    var lose = ctx && ctx.getExtension && ctx.getExtension('WEBGL_lose_context');
                    if (lose && lose.loseContext) lose.loseContext();
                } catch (e) {
                    // Ignore cleanup errors
                }

                if (item.canvas.parentNode) {
                    item.canvas.parentNode.removeChild(item.canvas);
                }
            }
        }

        window.addEventListener('pagehide', trimPool);
        window.addEventListener('beforeunload', trimPool);
    }

    function acquireWebGLCanvas(options) {
        options = options || {};
        bindPoolLifecycle();

        var container = options.container || document.querySelector('.game-page') || document.body;
        var width = options.width || 1280;
        var height = options.height || 720;
        var className = options.className || '';
        var type = normalizeGlType(options.type || 'webgl2');

        var pooledIndex = -1;
        for (var i = 0; i < webglPool.length; i++) {
            if (webglPool[i].type === type) {
                pooledIndex = i;
                break;
            }
        }

        var pooled = pooledIndex >= 0 ? webglPool.splice(pooledIndex, 1)[0] : null;
        var canvas = pooled && pooled.canvas ? pooled.canvas : document.createElement('canvas');

        if (options.id) {
            canvas.id = options.id;
        }

        if (className) {
            canvas.className = className;
        }

        canvas.width = width;
        canvas.height = height;

        if (!canvas.parentNode) {
            container.appendChild(canvas);
        }

        var contextOptions = options.contextOptions || {
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance'
        };

        var context = canvas.getContext(type, contextOptions);
        if (!context && type === 'webgl2') {
            type = 'webgl';
            context = canvas.getContext('webgl', contextOptions) || canvas.getContext('experimental-webgl', contextOptions);
        }

        return {
            canvas: canvas,
            context: context,
            type: type
        };
    }

    function releaseWebGLCanvas(canvas, type) {
        if (!canvas) return;
        bindPoolLifecycle();

        var glType = normalizeGlType(type || 'webgl2');
        var context = canvas.getContext(glType) || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

        try {
            if (context && context.finish) context.finish();
        } catch (e) {
            // ignore
        }

        canvas.style.display = 'none';

        if (canvas.parentNode) {
            canvas.parentNode.removeChild(canvas);
        }

        webglPool.push({
            canvas: canvas,
            type: glType,
            context: context,
            releasedAt: Date.now()
        });

        if (webglPool.length > 6) {
            var retired = webglPool.shift();
            if (retired && retired.canvas) {
                var retiredCtx = retired.context || retired.canvas.getContext(retired.type || 'webgl');
                var lose = retiredCtx && retiredCtx.getExtension && retiredCtx.getExtension('WEBGL_lose_context');
                if (lose && lose.loseContext) lose.loseContext();
            }
        }
    }

    function getWebGLPoolStats() {
        return {
            pooledCanvases: webglPool.length,
            types: webglPool.map(function (entry) { return entry.type; })
        };
    }

    // ============ TEXTURE ATLAS RUNTIME HELPERS ============
    var atlasManifestCache = {};

    function loadAtlasManifest(manifestUrl) {
        if (!manifestUrl) return Promise.reject(new Error('manifestUrl is required'));
        if (atlasManifestCache[manifestUrl]) return atlasManifestCache[manifestUrl];

        atlasManifestCache[manifestUrl] = fetch(manifestUrl, { cache: 'force-cache' })
            .then(function (response) {
                if (!response.ok) throw new Error('Failed to load atlas manifest: ' + response.status);
                return response.json();
            });

        return atlasManifestCache[manifestUrl];
    }

    function getAtlasFrame(manifest, frameName) {
        if (!manifest || !manifest.frames || !frameName) return null;

        return manifest.frames[frameName]
            || manifest.frames[frameName + '.png']
            || manifest.frames[frameName + '.webp']
            || null;
    }

    function drawAtlasFrame(ctx, image, frame, dx, dy, dw, dh) {
        if (!ctx || !image || !frame || !frame.frame) return false;

        var src = frame.frame;
        ctx.drawImage(
            image,
            src.x || 0,
            src.y || 0,
            src.w || image.width,
            src.h || image.height,
            dx || 0,
            dy || 0,
            dw || src.w || image.width,
            dh || src.h || image.height
        );

        return true;
    }

    // ============ PUBLIC API ============
    return {
        // Version
        version: VERSION,

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

        // Settings
        getSettings: getSettings,
        saveSettings: saveSettings,
        loadSettings: loadSettings,

        // Media
        captureScreenshot: captureScreenshot,
        showNotification: showNotification,

        // Utils
        toggleFullscreen: toggleFullscreen,
        showControlsOverlay: showControlsOverlay,
        injectAccessibleControlsDocumentation: injectAccessibleControlsDocumentation,
        enhanceCanvasAccessibility: enhanceCanvasAccessibility,
        formatTime: formatTime,
        formatNumber: formatNumber,

        // Visual Enhancements
        getVisualEnhancements: getVisualEnhancements,
        shakeScreen: shakeScreen,
        onPlayerDamage: onPlayerDamage,
        onPlayerDeath: onPlayerDeath,
        onJumpscare: onJumpscare,
        setIntensityLevel: setIntensityLevel,
        spawnBloodSplatter: spawnBloodSplatter,
        spawnEffectParticles: spawnEffectParticles,
        isVisualFeatureAvailable: isVisualFeatureAvailable,

        // WebGL lifecycle
        acquireWebGLCanvas: acquireWebGLCanvas,
        releaseWebGLCanvas: releaseWebGLCanvas,
        getWebGLPoolStats: getWebGLPoolStats,

        // Texture atlas runtime
        loadAtlasManifest: loadAtlasManifest,
        getAtlasFrame: getAtlasFrame,
        drawAtlasFrame: drawAtlasFrame,

        // Game Integration Helpers
        initGame: function(gameId, opts) {
            opts = opts || {};
            opts.gameId = gameId;
            currentGameId = gameId;

            // Initialize UniversalGameSystem if available
            if (typeof UniversalGameSystem !== 'undefined') {
                UniversalGameSystem.init(gameId);
            }

            // Initialize pause menu
            this.initPause(opts);

            // Load settings
            this.loadSettings();
        },

        endGame: function(sessionStats) {
            // End session tracking
            if (typeof UniversalGameSystem !== 'undefined' && UniversalGameSystem.stats) {
                var session = UniversalGameSystem.stats.endSession();

                // Check achievements
                if (UniversalGameSystem.achievements) {
                    var newAchievements = UniversalGameSystem.achievements.checkAll(session);
                    // Achievements will show their own notifications
                }

                // Check daily challenges
                if (UniversalGameSystem.daily) {
                    UniversalGameSystem.daily.checkProgress(session);
                }

                // Award currency
                if (typeof CrossGameMechanics !== 'undefined' && session) {
                    var earnings = CrossGameMechanics.currency.calculateEarnings(
                        gameId,
                        session,
                        sessionStats && sessionStats.isVictory
                    );
                    if (earnings.souls > 0) {
                        CrossGameMechanics.addCurrency('souls', earnings.souls, 'gameplay');
                    }
                    if (earnings.bloodGems > 0) {
                        CrossGameMechanics.addCurrency('bloodGems', earnings.bloodGems, 'gameplay');
                    }
                }

                return session;
            }
            return null;
        },

        recordEvent: function(eventType, data) {
            if (typeof UniversalGameSystem !== 'undefined' && UniversalGameSystem.stats) {
                UniversalGameSystem.stats.recordEvent(eventType, data);
            }
        },

        // Get active skill effects
        getSkillEffects: function() {
            if (typeof CrossGameMechanics !== 'undefined' && CrossGameMechanics.skills) {
                return CrossGameMechanics.skills.getEffects();
            }
            return {};
        },

        // Get active pet abilities
        getPetAbilities: function() {
            if (typeof CrossGameMechanics !== 'undefined' && CrossGameMechanics.pets) {
                return CrossGameMechanics.pets.getAbilities();
            }
            return {};
        },

        // Get equipped skin effects
        getSkinEffects: function() {
            if (typeof CrossGameMechanics !== 'undefined' && CrossGameMechanics.skins) {
                return CrossGameMechanics.skins.getEffects();
            }
            return {};
        },

        // Combined gameplay modifiers (skills + pets + skins)
        getGameplayModifiers: function() {
            var effects = {};
            var skillEffects = this.getSkillEffects();
            var petAbilities = this.getPetAbilities();
            var skinEffects = this.getSkinEffects();

            for (var key in skillEffects) effects[key] = skillEffects[key];
            for (var key in petAbilities) effects[key] = petAbilities[key];
            for (var key in skinEffects) effects[key] = skinEffects[key];

            return effects;
        }
    };
})();

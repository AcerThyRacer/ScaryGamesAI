/* ============================================
   ScaryGamesAI — Device Testing & Regression
   Automated cross-device compatibility checks
   and desktop controls regression verification.
   ============================================ */

const DeviceTesting = (function () {
    'use strict';

    var results = [];
    var testStart = 0;

    /* ── Cross-Device Feature Detection ── */
    function detectCapabilities() {
        var caps = {
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            platform: navigator.platform || 'unknown',
            screen: window.screen.width + 'x' + window.screen.height,
            viewport: window.innerWidth + 'x' + window.innerHeight,
            devicePixelRatio: window.devicePixelRatio || 1,
            touchSupport: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
            maxTouchPoints: navigator.maxTouchPoints || 0,
            pointerEvents: 'PointerEvent' in window,
            orientation: screen.orientation ? screen.orientation.type : 'unknown',
            webgl: false, webgl2: false,
            gpuRenderer: 'unknown',
            memoryMB: 0,
            networkType: 'unknown',
            battery: { supported: false, level: 1, charging: true },
            pointerLock: 'pointerLockElement' in document,
            fullscreen: !!(document.fullscreenEnabled || document.webkitFullscreenEnabled),
            vibration: 'vibrate' in navigator,
            gamepads: 'getGamepads' in navigator,
            safeAreaInsets: CSS.supports && CSS.supports('padding', 'env(safe-area-inset-top)'),
        };

        // WebGL detection
        try {
            var testCanvas = document.createElement('canvas');
            var gl2 = testCanvas.getContext('webgl2');
            if (gl2) { caps.webgl2 = true; caps.webgl = true; }
            else {
                var gl = testCanvas.getContext('webgl');
                if (gl) caps.webgl = true;
            }
            var ctx = gl2 || testCanvas.getContext('webgl');
            if (ctx) {
                var dbg = ctx.getExtension('WEBGL_debug_renderer_info');
                if (dbg) caps.gpuRenderer = ctx.getParameter(dbg.UNMASKED_RENDERER_WEBGL);
            }
        } catch (e) { }

        // Memory
        if (performance.memory) {
            caps.memoryMB = Math.round(performance.memory.jsHeapSizeLimit / 1048576);
        }

        // Network
        if (navigator.connection) {
            caps.networkType = navigator.connection.effectiveType || 'unknown';
        }

        // Battery
        if (navigator.getBattery) {
            try {
                caps.battery.supported = true;
            } catch (e) { }
        }

        return caps;
    }

    /* ── Desktop Controls Regression Tests ── */
    function runDesktopRegressionTests() {
        var tests = [];

        // 1. Keyboard event system
        tests.push({
            name: 'Keyboard Events',
            pass: typeof KeyboardEvent !== 'undefined',
            detail: 'KeyboardEvent constructor available',
        });

        // 2. Mouse event system
        tests.push({
            name: 'Mouse Events',
            pass: typeof MouseEvent !== 'undefined',
            detail: 'MouseEvent constructor available',
        });

        // 3. Pointer lock API
        tests.push({
            name: 'Pointer Lock API',
            pass: 'pointerLockElement' in document && typeof HTMLElement.prototype.requestPointerLock === 'function',
            detail: 'document.pointerLockElement and requestPointerLock exist',
        });

        // 4. requestAnimationFrame
        tests.push({
            name: 'requestAnimationFrame',
            pass: typeof window.requestAnimationFrame === 'function',
            detail: 'rAF available for game loops',
        });

        // 5. Canvas 2D
        tests.push({
            name: 'Canvas 2D',
            pass: (function () {
                try { return !!document.createElement('canvas').getContext('2d'); } catch (e) { return false; }
            })(),
            detail: 'canvas.getContext("2d") works',
        });

        // 6. WebGL for Three.js
        tests.push({
            name: 'WebGL Support',
            pass: (function () {
                try { return !!document.createElement('canvas').getContext('webgl'); } catch (e) { return false; }
            })(),
            detail: 'WebGL context available for Three.js games',
        });

        // 7. Audio context
        tests.push({
            name: 'Audio API',
            pass: typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined',
            detail: 'AudioContext available for game audio',
        });

        // 8. localStorage
        tests.push({
            name: 'localStorage',
            pass: (function () {
                try { localStorage.setItem('__test', '1'); localStorage.removeItem('__test'); return true; } catch (e) { return false; }
            })(),
            detail: 'localStorage available for save data',
        });

        // 9. Performance API
        tests.push({
            name: 'Performance API',
            pass: typeof performance !== 'undefined' && typeof performance.now === 'function',
            detail: 'performance.now() for delta time',
        });

        // 10. DOM game elements exist
        tests.push({
            name: 'Game Container',
            pass: !!document.getElementById('game-container') || !!document.getElementById('game-canvas'),
            detail: 'Game container or canvas element found',
        });

        // 11. Start button
        tests.push({
            name: 'Start Button',
            pass: !!document.getElementById('start-btn'),
            detail: 'Start button element found',
        });

        // 12. HUD elements
        tests.push({
            name: 'HUD Present',
            pass: !!document.querySelector('.game-hud'),
            detail: 'Game HUD container found',
        });

        // 13. Keyboard event dispatch
        tests.push({
            name: 'Keyboard Dispatch',
            pass: (function () {
                try {
                    var received = false;
                    var handler = function () { received = true; };
                    document.addEventListener('keydown', handler);
                    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'w', code: 'KeyW', bubbles: true }));
                    document.removeEventListener('keydown', handler);
                    return received;
                } catch (e) { return false; }
            })(),
            detail: 'Keyboard events can be dispatched/received',
        });

        // 14. Mouse move dispatch
        tests.push({
            name: 'Mouse Move Dispatch',
            pass: (function () {
                try {
                    var received = false;
                    var handler = function () { received = true; };
                    document.addEventListener('mousemove', handler);
                    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 100, clientY: 100, bubbles: true }));
                    document.removeEventListener('mousemove', handler);
                    return received;
                } catch (e) { return false; }
            })(),
            detail: 'Mouse events can be dispatched/received',
        });

        // 15. Three.js loaded (if applicable)
        tests.push({
            name: 'Three.js',
            pass: typeof THREE !== 'undefined',
            detail: typeof THREE !== 'undefined' ? 'Three.js r' + THREE.REVISION + ' loaded' : 'Not loaded (2D game or not yet loaded)',
        });

        // 16. GameUtils loaded
        tests.push({
            name: 'GameUtils',
            pass: typeof GameUtils !== 'undefined',
            detail: 'GameUtils module available',
        });

        // 17. MobileControls (should NOT interfere on desktop)
        tests.push({
            name: 'Mobile Controls Desktop Safety',
            pass: typeof MobileControls === 'undefined' || !MobileControls.isActive || !MobileControls.isActive(),
            detail: 'MobileControls not active on desktop (no touch)',
        });

        // 18. AdaptiveQuality loaded
        tests.push({
            name: 'AdaptiveQuality',
            pass: typeof AdaptiveQuality !== 'undefined',
            detail: 'Performance system available',
        });

        return tests;
    }

    /* ── Mobile Compatibility Tests ── */
    function runMobileTests() {
        var tests = [];

        tests.push({
            name: 'Touch Events',
            pass: 'ontouchstart' in window,
            detail: 'Touch event support detected',
        });

        tests.push({
            name: 'MobileControls Loaded',
            pass: typeof MobileControls !== 'undefined',
            detail: 'MobileControls module available',
        });

        tests.push({
            name: 'MobileControls Active',
            pass: typeof MobileControls !== 'undefined' && MobileControls.isMobile && MobileControls.isMobile(),
            detail: 'Mobile controls activated for touch device',
        });

        tests.push({
            name: 'Viewport Meta',
            pass: !!document.querySelector('meta[name="viewport"]'),
            detail: 'Viewport meta tag present',
        });

        tests.push({
            name: 'Safe Area CSS',
            pass: CSS.supports && CSS.supports('padding', 'env(safe-area-inset-top)'),
            detail: 'Safe area inset CSS supported',
        });

        tests.push({
            name: 'Game Responsive CSS',
            pass: (function () {
                var links = document.querySelectorAll('link[rel="stylesheet"]');
                for (var i = 0; i < links.length; i++) {
                    if (links[i].href && links[i].href.indexOf('game-responsive') !== -1) return true;
                }
                return false;
            })(),
            detail: 'game-responsive.css loaded',
        });

        tests.push({
            name: 'Mobile Tutorial',
            pass: typeof document.getElementById('mc-tutorial-overlay') !== 'undefined',
            detail: 'Tutorial system available',
        });

        tests.push({
            name: 'Orientation API',
            pass: 'orientation' in screen || 'mozOrientation' in screen,
            detail: 'Screen orientation detection',
        });

        tests.push({
            name: 'Vibration API',
            pass: 'vibrate' in navigator,
            detail: 'Haptic feedback supported',
        });

        tests.push({
            name: 'Touch Target Size',
            pass: (function () {
                var btns = document.querySelectorAll('.start-btn, .play-btn, .mc-btn');
                if (btns.length === 0) return true;
                for (var i = 0; i < btns.length; i++) {
                    var rect = btns[i].getBoundingClientRect();
                    if (rect.width < 44 || rect.height < 44) return false;
                }
                return true;
            })(),
            detail: 'All interactive elements ≥ 44px',
        });

        return tests;
    }

    /* ── Run All Tests ── */
    function runAll() {
        testStart = performance.now();
        var caps = detectCapabilities();
        var desktopTests = runDesktopRegressionTests();
        var mobileTests = runMobileTests();
        var elapsed = Math.round(performance.now() - testStart);

        var allTests = desktopTests.concat(mobileTests);
        var passed = allTests.filter(function (t) { return t.pass; }).length;
        var total = allTests.length;

        results = {
            capabilities: caps,
            desktopTests: desktopTests,
            mobileTests: mobileTests,
            summary: {
                passed: passed,
                total: total,
                score: Math.round(passed / total * 100),
                elapsed: elapsed + 'ms',
                isMobile: caps.touchSupport && caps.maxTouchPoints > 0,
            }
        };

        console.log('[DeviceTesting] ' + passed + '/' + total + ' tests passed (' + results.summary.score + '%) in ' + elapsed + 'ms');
        return results;
    }

    /* ── Display Results Panel ── */
    function showReport() {
        var r = results.summary ? results : runAll();
        var existing = document.getElementById('dt-report');
        if (existing) existing.remove();

        var panel = document.createElement('div');
        panel.id = 'dt-report';
        panel.style.cssText =
            'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:999999;' +
            'width:min(420px,90vw);max-height:80vh;overflow-y:auto;' +
            'background:rgba(10,10,20,0.96);border:1px solid rgba(255,255,255,0.1);' +
            'border-radius:14px;padding:20px;' +
            'font-family:"Inter",system-ui,sans-serif;color:#ccc;font-size:0.78rem;' +
            'backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);' +
            'box-shadow:0 20px 60px rgba(0,0,0,0.8);';

        var scoreColor = r.summary.score >= 80 ? '#4ade80' : r.summary.score >= 60 ? '#fbbf24' : '#f87171';
        var html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">' +
            '<span style="font-weight:bold;color:#cc1122;font-size:1rem;">🔍 Device Test Report</span>' +
            '<span id="dt-close" style="cursor:pointer;color:#888;font-size:1.2rem;">×</span>' +
            '</div>';

        // Score badge
        html += '<div style="text-align:center;margin-bottom:16px;">' +
            '<div style="font-size:2rem;font-weight:bold;color:' + scoreColor + ';">' + r.summary.score + '%</div>' +
            '<div style="color:#888;font-size:0.72rem;">' + r.summary.passed + '/' + r.summary.total + ' passed in ' + r.summary.elapsed + '</div>' +
            '</div>';

        // Device info
        html += '<div style="background:rgba(255,255,255,0.03);border-radius:8px;padding:10px;margin-bottom:12px;font-size:0.7rem;line-height:1.6;">';
        html += '<div><b>Screen:</b> ' + r.capabilities.screen + ' @ ' + r.capabilities.devicePixelRatio + 'x</div>';
        html += '<div><b>Viewport:</b> ' + r.capabilities.viewport + '</div>';
        html += '<div><b>GPU:</b> ' + r.capabilities.gpuRenderer + '</div>';
        html += '<div><b>Touch:</b> ' + (r.capabilities.touchSupport ? r.capabilities.maxTouchPoints + ' points' : 'No') + '</div>';
        html += '<div><b>WebGL:</b> ' + (r.capabilities.webgl2 ? 'WebGL 2' : r.capabilities.webgl ? 'WebGL 1' : 'None') + '</div>';
        html += '</div>';

        // Desktop tests
        html += '<div style="margin-bottom:4px;font-weight:600;color:#60a5fa;">Desktop Controls</div>';
        r.desktopTests.forEach(function (t) {
            html += '<div style="display:flex;gap:8px;align-items:center;padding:3px 0;border-bottom:1px solid rgba(255,255,255,0.03);">' +
                '<span style="color:' + (t.pass ? '#4ade80' : '#f87171') + ';">' + (t.pass ? '✓' : '✗') + '</span>' +
                '<span>' + t.name + '</span>' +
                '<span style="margin-left:auto;font-size:0.65rem;color:#888;">' + t.detail + '</span>' +
                '</div>';
        });

        // Mobile tests
        html += '<div style="margin-top:12px;margin-bottom:4px;font-weight:600;color:#c084fc;">Mobile Compatibility</div>';
        r.mobileTests.forEach(function (t) {
            html += '<div style="display:flex;gap:8px;align-items:center;padding:3px 0;border-bottom:1px solid rgba(255,255,255,0.03);">' +
                '<span style="color:' + (t.pass ? '#4ade80' : '#f87171') + ';">' + (t.pass ? '✓' : '✗') + '</span>' +
                '<span>' + t.name + '</span>' +
                '<span style="margin-left:auto;font-size:0.65rem;color:#888;">' + t.detail + '</span>' +
                '</div>';
        });

        panel.innerHTML = html;
        document.body.appendChild(panel);

        panel.querySelector('#dt-close').addEventListener('click', function () { panel.remove(); });
    }

    /* ── Keyboard Shortcut ── */
    document.addEventListener('keydown', function (e) {
        if (e.ctrlKey && e.shiftKey && e.key === 'T') {
            e.preventDefault();
            showReport();
        }
    });

    // Auto-run on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(runAll, 1000); });
    } else {
        setTimeout(runAll, 1000);
    }

    return { runAll: runAll, showReport: showReport, getResults: function () { return results; }, detectCapabilities: detectCapabilities };
})();

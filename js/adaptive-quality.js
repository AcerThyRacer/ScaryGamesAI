/* ============================================
   ScaryGamesAI — Adaptive Quality v2.0
   FPS monitoring, auto-scaling, mobile perf
   presets, device profiling, battery-aware,
   Three.js hooks, and debug panel.
   ============================================ */

const AdaptiveQuality = (function () {
    'use strict';

    // ── Quality Tiers ──────────────────────────────────
    const TIERS = {
        MINIMAL: {
            label: 'Minimal', particles: false, fog: false, grain: false,
            trails: false, dust: false, cobwebs: false,
            pixelRatio: 0.5, shadowMap: false, drawDistance: 40,
            maxLights: 2, postProcess: false, antialias: false,
        },
        LOW: {
            label: 'Low', particles: false, fog: false, grain: false,
            trails: false, dust: false, cobwebs: false,
            pixelRatio: 0.75, shadowMap: false, drawDistance: 60,
            maxLights: 3, postProcess: false, antialias: false,
        },
        MEDIUM: {
            label: 'Medium', particles: true, fog: false, grain: false,
            trails: false, dust: true, cobwebs: true,
            pixelRatio: 1.0, shadowMap: true, drawDistance: 100,
            maxLights: 5, postProcess: false, antialias: true,
        },
        HIGH: {
            label: 'High', particles: true, fog: true, grain: true,
            trails: true, dust: true, cobwebs: true,
            pixelRatio: 1.0, shadowMap: true, drawDistance: 200,
            maxLights: 8, postProcess: true, antialias: true,
        },
        ULTRA: {
            label: 'Ultra', particles: true, fog: true, grain: true,
            trails: true, dust: true, cobwebs: true,
            pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
            shadowMap: true, drawDistance: 500,
            maxLights: 16, postProcess: true, antialias: true,
        },
    };

    // ── Mobile Device Profiles ─────────────────────────
    const DEVICE_PROFILES = {
        LOW_END: { maxTier: 'LOW', defaultTier: 'MINIMAL', pixelRatioCap: 1.0, targetFps: 30 },
        MID_RANGE: { maxTier: 'MEDIUM', defaultTier: 'LOW', pixelRatioCap: 1.5, targetFps: 45 },
        HIGH_END: { maxTier: 'HIGH', defaultTier: 'MEDIUM', pixelRatioCap: 2.0, targetFps: 60 },
        DESKTOP: { maxTier: 'ULTRA', defaultTier: 'HIGH', pixelRatioCap: 2.0, targetFps: 60 },
    };

    // ── Per-Game Performance Budgets ───────────────────
    const GAME_BUDGETS = {
        'backrooms-pacman': { base: 'HIGH', mobile: 'MEDIUM' },
        'the-elevator': { base: 'HIGH', mobile: 'LOW' },
        'graveyard-shift': { base: 'HIGH', mobile: 'LOW' },
        'web-of-terror': { base: 'HIGH', mobile: 'LOW' },
        'haunted-asylum': { base: 'HIGH', mobile: 'LOW' },
        'freddys-nightmare': { base: 'HIGH', mobile: 'MEDIUM' },
        'the-abyss': { base: 'HIGH', mobile: 'LOW' },
        'cursed-sands': { base: 'HIGH', mobile: 'LOW' },
        'cursed-depths': { base: 'HIGH', mobile: 'MEDIUM' },
        'nightmare-run': { base: 'ULTRA', mobile: 'MEDIUM' },
        'yeti-run': { base: 'ULTRA', mobile: 'MEDIUM' },
        'blood-tetris': { base: 'ULTRA', mobile: 'HIGH' },
        'shadow-crawler': { base: 'ULTRA', mobile: 'HIGH' },
        'dollhouse': { base: 'ULTRA', mobile: 'HIGH' },
        'seance': { base: 'ULTRA', mobile: 'HIGH' },
        'ritual-circle': { base: 'ULTRA', mobile: 'HIGH' },
        'zombie-horde': { base: 'ULTRA', mobile: 'HIGH' },
        'total-zombies-medieval': { base: 'HIGH', mobile: 'MEDIUM' },
    };

    // ── Constants ──────────────────────────────────────
    const FPS_HISTORY_SIZE = 60;
    const FPS_LOW_THRESHOLD = 28;
    const FPS_HIGH_THRESHOLD = 50;
    const SCALE_DOWN_DELAY = 1200;
    const SCALE_UP_DELAY = 5000;
    const MEMORY_WARNING_MB = 200;
    const TIER_ORDER = ['MINIMAL', 'LOW', 'MEDIUM', 'HIGH', 'ULTRA'];

    // ── State ─────────────────────────────────────────
    const isMobileDevice = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
        || ('ontouchstart' in window && window.innerWidth < 1024);
    let deviceProfile = isMobileDevice ? 'MID_RANGE' : 'DESKTOP';
    let currentTier = 'HIGH';
    let maxTier = 'ULTRA';
    let fpsHistory = [];
    let lastFrameTime = performance.now();
    let frameCount = 0;
    let lastFps = 60;
    let lowFpsSince = 0;
    let highFpsSince = 0;
    let debugOpen = false;
    let debugPanel = null;
    let fpsGraphCanvas = null;
    let fpsGraphCtx = null;
    let reducedMotion = false;
    let running = true;
    let gpuScore = -1;
    let memoryUsageMB = 0;
    let batteryLevel = 1;
    let batteryCharging = true;
    let currentGameId = null;
    let rendererRef = null;
    let sceneRef = null;
    let cameraRef = null;

    // ── GPU Benchmark ─────────────────────────────────
    function benchmarkGPU() {
        try {
            var canvas = document.createElement('canvas');
            canvas.width = 256; canvas.height = 256;
            var gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
            if (!gl) { gpuScore = 20; return; }

            var debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            var gpuName = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : '';
            console.log('[AdaptiveQuality] GPU: ' + gpuName);

            // Benchmark: draw many triangles and measure
            var startTime = performance.now();
            var verts = new Float32Array(3000);
            for (var i = 0; i < 3000; i++) verts[i] = Math.random() * 2 - 1;

            var buf = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, buf);
            gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);

            var vs = gl.createShader(gl.VERTEX_SHADER);
            gl.shaderSource(vs, 'attribute vec3 p;void main(){gl_Position=vec4(p,1.0);gl_PointSize=1.0;}');
            gl.compileShader(vs);
            var fs = gl.createShader(gl.FRAGMENT_SHADER);
            gl.shaderSource(fs, 'precision mediump float;void main(){gl_FragColor=vec4(1.0);}');
            gl.compileShader(fs);
            var prog = gl.createProgram();
            gl.attachShader(prog, vs); gl.attachShader(prog, fs);
            gl.linkProgram(prog); gl.useProgram(prog);
            var loc = gl.getAttribLocation(prog, 'p');
            gl.enableVertexAttribArray(loc);
            gl.vertexAttribPointer(loc, 3, gl.FLOAT, false, 0, 0);

            for (var j = 0; j < 50; j++) {
                gl.drawArrays(gl.TRIANGLES, 0, 1000);
            }
            gl.finish();

            var elapsed = performance.now() - startTime;
            gl.deleteBuffer(buf); gl.deleteProgram(prog);
            gl.deleteShader(vs); gl.deleteShader(fs);
            canvas.remove();

            // Score from 0-100
            gpuScore = Math.max(0, Math.min(100, Math.round(100 - elapsed)));

            // Classify device
            if (gpuScore < 30) deviceProfile = 'LOW_END';
            else if (gpuScore < 60) deviceProfile = 'MID_RANGE';
            else if (isMobileDevice) deviceProfile = 'HIGH_END';
            else deviceProfile = 'DESKTOP';

            console.log('[AdaptiveQuality] GPU score: ' + gpuScore + ', profile: ' + deviceProfile);
        } catch (e) {
            gpuScore = isMobileDevice ? 30 : 70;
            console.warn('[AdaptiveQuality] GPU benchmark failed:', e);
        }
    }

    // ── Battery Monitoring ────────────────────────────
    function initBattery() {
        if (navigator.getBattery) {
            navigator.getBattery().then(function (batt) {
                batteryLevel = batt.level;
                batteryCharging = batt.charging;
                batt.addEventListener('levelchange', function () { batteryLevel = batt.level; checkBattery(); });
                batt.addEventListener('chargingchange', function () { batteryCharging = batt.charging; checkBattery(); });
                checkBattery();
            }).catch(function () { });
        }
    }

    function checkBattery() {
        if (!batteryCharging && batteryLevel < 0.15 && TIER_ORDER.indexOf(currentTier) > 1) {
            setTier('LOW');
            console.log('[AdaptiveQuality] Low battery (' + Math.round(batteryLevel * 100) + '%) — scaled to LOW');
        }
    }

    // ── Memory Monitoring ─────────────────────────────
    function checkMemory() {
        if (performance.memory) {
            memoryUsageMB = Math.round(performance.memory.usedJSHeapSize / 1048576);
            if (memoryUsageMB > MEMORY_WARNING_MB && TIER_ORDER.indexOf(currentTier) > 1) {
                scaleDown();
                console.log('[AdaptiveQuality] Memory warning (' + memoryUsageMB + 'MB) — scaling down');
            }
        }
    }

    // ── Detect Current Game ───────────────────────────
    function detectGame() {
        var path = window.location.pathname.toLowerCase();
        for (var id in GAME_BUDGETS) {
            if (path.indexOf(id) !== -1) { currentGameId = id; return; }
        }
    }

    // ── Initialize ────────────────────────────────────
    function init() {
        benchmarkGPU();
        detectGame();
        initBattery();

        // Set initial tier from device profile + game budget
        var profile = DEVICE_PROFILES[deviceProfile];
        maxTier = profile.maxTier;
        if (currentGameId && GAME_BUDGETS[currentGameId]) {
            currentTier = isMobileDevice ? GAME_BUDGETS[currentGameId].mobile : GAME_BUDGETS[currentGameId].base;
        } else {
            currentTier = profile.defaultTier;
        }
        // Clamp to max
        if (TIER_ORDER.indexOf(currentTier) > TIER_ORDER.indexOf(maxTier)) {
            currentTier = maxTier;
        }

        // Reduced motion
        reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', function (e) {
            reducedMotion = e.matches;
            if (reducedMotion) { setTier('MINIMAL'); disableAllAnimations(); }
            else { setTier(profile.defaultTier); enableAllAnimations(); }
        });
        if (reducedMotion) { setTier('MINIMAL'); disableAllAnimations(); }

        createDebugPanel();
        monitorFps();

        // Keyboard shortcut: Ctrl+Shift+D = toggle debug
        document.addEventListener('keydown', function (e) {
            if (e.ctrlKey && e.shiftKey && e.key === 'D') {
                e.preventDefault();
                toggleDebug();
            }
        });

        // Check memory periodically
        setInterval(checkMemory, 10000);

        console.log('[AdaptiveQuality v2] Init — tier: ' + currentTier + ', profile: ' + deviceProfile + ', gpu: ' + gpuScore + ', game: ' + (currentGameId || 'unknown'));
    }

    /* ── FPS Monitoring ── */
    function monitorFps() {
        if (!running) return;
        frameCount++;
        var now = performance.now();
        var dt = now - lastFrameTime;

        if (dt >= 1000) {
            lastFps = Math.round(frameCount * 1000 / dt);
            frameCount = 0;
            lastFrameTime = now;

            fpsHistory.push(lastFps);
            if (fpsHistory.length > FPS_HISTORY_SIZE) fpsHistory.shift();

            autoScale(now);
            updateDebug();
        }

        requestAnimationFrame(monitorFps);
    }

    function getAvgFps() {
        if (fpsHistory.length === 0) return 60;
        return fpsHistory.reduce(function (a, b) { return a + b; }, 0) / fpsHistory.length;
    }

    function getMinFps() {
        if (fpsHistory.length === 0) return 60;
        return Math.min.apply(null, fpsHistory);
    }

    function autoScale(now) {
        if (reducedMotion) return;

        var avg = getAvgFps();
        var threshold = isMobileDevice ? FPS_LOW_THRESHOLD - 4 : FPS_LOW_THRESHOLD;
        var upThreshold = isMobileDevice ? FPS_HIGH_THRESHOLD + 5 : FPS_HIGH_THRESHOLD;

        if (avg < threshold) {
            if (!lowFpsSince) lowFpsSince = now;
            highFpsSince = 0;
            var delay = isMobileDevice ? SCALE_DOWN_DELAY * 0.7 : SCALE_DOWN_DELAY;
            if (now - lowFpsSince > delay) {
                scaleDown();
                lowFpsSince = 0;
            }
        } else if (avg > upThreshold) {
            if (!highFpsSince) highFpsSince = now;
            lowFpsSince = 0;
            if (now - highFpsSince > SCALE_UP_DELAY) {
                scaleUp();
                highFpsSince = 0;
            }
        } else {
            lowFpsSince = 0;
            highFpsSince = 0;
        }
    }

    function scaleDown() {
        var idx = TIER_ORDER.indexOf(currentTier);
        if (idx > 0) {
            setTier(TIER_ORDER[idx - 1]);
            console.log('[AdaptiveQuality] Scaled down → ' + currentTier);
        }
    }

    function scaleUp() {
        var idx = TIER_ORDER.indexOf(currentTier);
        var maxIdx = TIER_ORDER.indexOf(maxTier);
        if (idx < maxIdx) {
            setTier(TIER_ORDER[idx + 1]);
            console.log('[AdaptiveQuality] Scaled up → ' + currentTier);
        }
    }

    function setTier(tier) {
        if (!TIERS[tier]) return;
        currentTier = tier;
        var cfg = TIERS[tier];
        applyTierEffects(cfg);
        applyThreeJsOptimizations(cfg);

        if (typeof QualityFX !== 'undefined' && QualityFX.setPerformanceMode) {
            var modeMap = { MINIMAL: 'minimal', LOW: 'minimal', MEDIUM: 'reduced', HIGH: 'full', ULTRA: 'full' };
            QualityFX.setPerformanceMode(modeMap[tier] || 'full');
        }
    }

    function applyTierEffects(cfg) {
        var trailCanvas = document.getElementById('cursor-trail');
        if (trailCanvas) trailCanvas.style.display = cfg.trails ? '' : 'none';

        var dustContainer = document.getElementById('ambient-dust');
        if (dustContainer) dustContainer.style.display = cfg.dust ? '' : 'none';

        var particlesEl = document.getElementById('particles');
        if (particlesEl) particlesEl.style.display = cfg.particles ? '' : 'none';

        var fxCanvas = document.getElementById('quality-fx-canvas');
        if (fxCanvas) fxCanvas.style.opacity = cfg.grain ? '1' : '0.3';

        var cinematicCanvas = document.getElementById('cinematic-overlay-canvas');
        if (cinematicCanvas) cinematicCanvas.style.display = cfg.fog ? '' : 'none';

        // Mobile controls opacity on minimal
        if (cfg.label === 'Minimal') {
            var mcContainer = document.querySelector('.mobile-controls-container');
            if (mcContainer) mcContainer.style.opacity = '0.5';
        }
    }

    /* ── Three.js Optimization Hooks ── */
    function applyThreeJsOptimizations(cfg) {
        if (!rendererRef) return;
        try {
            // Pixel ratio
            var pr = Math.min(cfg.pixelRatio, window.devicePixelRatio || 1);
            rendererRef.setPixelRatio(pr);

            // Shadow maps
            if (rendererRef.shadowMap) {
                rendererRef.shadowMap.enabled = cfg.shadowMap;
                if (cfg.shadowMap) {
                    rendererRef.shadowMap.type = cfg.label === 'Ultra'
                        ? (typeof THREE !== 'undefined' ? THREE.PCFSoftShadowMap : 2)
                        : (typeof THREE !== 'undefined' ? THREE.BasicShadowMap : 0);
                }
            }

            // Draw distance via camera far plane
            if (cameraRef && cameraRef.far !== cfg.drawDistance) {
                cameraRef.far = cfg.drawDistance;
                cameraRef.updateProjectionMatrix();
            }

            // Fog distance
            if (sceneRef && sceneRef.fog && cfg.fog) {
                sceneRef.fog.far = cfg.drawDistance;
            }
        } catch (e) {
            console.warn('[AdaptiveQuality] Three.js optimization error:', e);
        }
    }

    /** Register a Three.js renderer/scene/camera for automatic optimization */
    function registerThreeJs(renderer, scene, camera) {
        rendererRef = renderer;
        sceneRef = scene;
        cameraRef = camera;
        applyThreeJsOptimizations(TIERS[currentTier]);
    }

    /* ── Reduced Motion ── */
    function disableAllAnimations() {
        if (!document.getElementById('aq-reduced-motion')) {
            var s = document.createElement('style');
            s.id = 'aq-reduced-motion';
            s.textContent =
                '*, *::before, *::after {' +
                '  animation-duration: 0.01ms !important;' +
                '  animation-iteration-count: 1 !important;' +
                '  transition-duration: 0.01ms !important;' +
                '}';
            document.head.appendChild(s);
        }
    }

    function enableAllAnimations() {
        var style = document.getElementById('aq-reduced-motion');
        if (style) style.remove();
    }

    /* ── Debug Panel ── */
    function createDebugPanel() {
        debugPanel = document.createElement('div');
        debugPanel.id = 'aq-debug';
        debugPanel.style.cssText =
            'position:fixed;bottom:60px;right:12px;z-index:100000;' +
            'width:300px;padding:12px;' +
            'background:rgba(10,10,20,0.94);' +
            'border:1px solid rgba(255,255,255,0.1);' +
            'border-radius:10px;' +
            'backdrop-filter:blur(12px);' +
            'font-family:"Courier New",monospace;' +
            'font-size:0.68rem;' +
            'color:rgba(255,255,255,0.7);' +
            'display:none;' +
            'pointer-events:auto;' +
            'max-height:80vh;overflow-y:auto;';

        debugPanel.innerHTML =
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">' +
            '  <span style="font-weight:bold;color:#ff4444;letter-spacing:1px;">⚡ PERFORMANCE v2</span>' +
            '  <button id="aq-close" style="background:none;border:none;color:#888;cursor:pointer;font-size:1rem;">×</button>' +
            '</div>' +
            '<canvas id="aq-fps-graph" width="276" height="60" style="width:100%;height:60px;border-radius:4px;background:rgba(0,0,0,0.3);margin-bottom:8px;"></canvas>' +
            '<div id="aq-stats" style="line-height:1.7;">' +
            '  <div>FPS: <span id="aq-fps" style="color:#4ade80;">--</span> <span style="color:#555;">|</span> Min: <span id="aq-min" style="color:#fbbf24;">--</span></div>' +
            '  <div>Avg FPS: <span id="aq-avg" style="color:#60a5fa;">--</span></div>' +
            '  <div>Quality: <span id="aq-tier" style="color:#fbbf24;">--</span> <span style="color:#555;">|</span> Max: <span id="aq-max" style="color:#888;">--</span></div>' +
            '  <div>Device: <span id="aq-device" style="color:#c084fc;">--</span></div>' +
            '  <div>GPU Score: <span id="aq-gpu" style="color:#38bdf8;">--</span></div>' +
            '  <div>Memory: <span id="aq-mem" style="color:#fb923c;">--</span></div>' +
            '  <div>Battery: <span id="aq-batt" style="color:#4ade80;">--</span></div>' +
            '  <div>Pixel Ratio: <span id="aq-pr" style="color:#e879f9;">--</span></div>' +
            '  <div>Effects: <span id="aq-effects" style="color:#c084fc;">--</span></div>' +
            '  <div>Game: <span id="aq-game" style="color:#94a3b8;">--</span></div>' +
            '  <div>Reduced Motion: <span id="aq-rm" style="color:#f87171;">--</span></div>' +
            '</div>' +
            '<div style="margin-top:8px;display:flex;gap:4px;flex-wrap:wrap;">' +
            '  <button class="aq-btn" data-tier="MINIMAL">Min</button>' +
            '  <button class="aq-btn" data-tier="LOW">Low</button>' +
            '  <button class="aq-btn" data-tier="MEDIUM">Med</button>' +
            '  <button class="aq-btn" data-tier="HIGH">High</button>' +
            '  <button class="aq-btn" data-tier="ULTRA">Ultra</button>' +
            '</div>';

        document.body.appendChild(debugPanel);

        var btnStyle = document.createElement('style');
        btnStyle.textContent =
            '.aq-btn{background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);' +
            'color:rgba(255,255,255,0.6);padding:3px 8px;border-radius:4px;cursor:pointer;' +
            'font-size:0.62rem;font-family:inherit;transition:all 0.2s;-webkit-tap-highlight-color:transparent;}' +
            '.aq-btn:hover{background:rgba(255,255,255,0.15);color:#fff;}' +
            '.aq-btn.active{background:rgba(204,17,34,0.3);border-color:rgba(204,17,34,0.5);color:#ff6666;}';
        document.head.appendChild(btnStyle);

        debugPanel.querySelectorAll('.aq-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                setTier(this.dataset.tier);
                updateDebug();
            });
        });

        debugPanel.querySelector('#aq-close').addEventListener('click', toggleDebug);

        fpsGraphCanvas = document.getElementById('aq-fps-graph');
        fpsGraphCtx = fpsGraphCanvas.getContext('2d');
    }

    function toggleDebug() {
        debugOpen = !debugOpen;
        debugPanel.style.display = debugOpen ? 'block' : 'none';
        if (debugOpen) updateDebug();
    }

    function updateDebug() {
        if (!debugOpen) return;

        var fpsEl = document.getElementById('aq-fps');
        var minEl = document.getElementById('aq-min');
        var avgEl = document.getElementById('aq-avg');
        var tierEl = document.getElementById('aq-tier');
        var maxEl = document.getElementById('aq-max');
        var deviceEl = document.getElementById('aq-device');
        var gpuEl = document.getElementById('aq-gpu');
        var memEl = document.getElementById('aq-mem');
        var battEl = document.getElementById('aq-batt');
        var prEl = document.getElementById('aq-pr');
        var effectsEl = document.getElementById('aq-effects');
        var gameEl = document.getElementById('aq-game');
        var rmEl = document.getElementById('aq-rm');

        if (fpsEl) {
            fpsEl.textContent = lastFps;
            fpsEl.style.color = lastFps >= 50 ? '#4ade80' : lastFps >= 30 ? '#fbbf24' : '#f87171';
        }
        if (minEl) minEl.textContent = getMinFps();
        if (avgEl) avgEl.textContent = getAvgFps().toFixed(1);
        if (tierEl) tierEl.textContent = currentTier;
        if (maxEl) maxEl.textContent = maxTier;
        if (deviceEl) deviceEl.textContent = deviceProfile + (isMobileDevice ? ' (mobile)' : ' (desktop)');
        if (gpuEl) gpuEl.textContent = gpuScore >= 0 ? gpuScore + '/100' : 'N/A';
        if (memEl) memEl.textContent = memoryUsageMB ? memoryUsageMB + ' MB' : 'N/A';
        if (battEl) battEl.textContent = batteryLevel < 1 ? Math.round(batteryLevel * 100) + '%' + (batteryCharging ? ' ⚡' : '') : 'N/A';
        if (prEl) prEl.textContent = (rendererRef ? rendererRef.getPixelRatio().toFixed(2) : (window.devicePixelRatio || 1).toFixed(2));
        if (gameEl) gameEl.textContent = currentGameId || 'unknown';
        if (rmEl) rmEl.textContent = reducedMotion ? 'ON' : 'OFF';

        var effectCount = 0;
        if (document.getElementById('cursor-trail') && document.getElementById('cursor-trail').style.display !== 'none') effectCount++;
        if (document.getElementById('ambient-dust') && document.getElementById('ambient-dust').style.display !== 'none') effectCount++;
        if (document.getElementById('particles') && document.getElementById('particles').style.display !== 'none') effectCount++;
        if (document.getElementById('quality-fx-canvas')) effectCount++;
        if (document.getElementById('cinematic-overlay-canvas') && document.getElementById('cinematic-overlay-canvas').style.display !== 'none') effectCount++;
        if (effectsEl) effectsEl.textContent = effectCount + ' active';

        debugPanel.querySelectorAll('.aq-btn').forEach(function (btn) {
            btn.classList.toggle('active', btn.dataset.tier === currentTier);
        });

        drawFpsGraph();
    }

    function drawFpsGraph() {
        if (!fpsGraphCtx || fpsHistory.length < 2) return;
        var w = fpsGraphCanvas.width;
        var h = fpsGraphCanvas.height;
        fpsGraphCtx.clearRect(0, 0, w, h);

        fpsGraphCtx.strokeStyle = 'rgba(255,255,255,0.05)';
        fpsGraphCtx.lineWidth = 0.5;
        for (var y = 0; y < h; y += 15) {
            fpsGraphCtx.beginPath();
            fpsGraphCtx.moveTo(0, y); fpsGraphCtx.lineTo(w, y);
            fpsGraphCtx.stroke();
        }

        var y30 = h - (30 / 120) * h;
        fpsGraphCtx.strokeStyle = 'rgba(248,113,113,0.3)';
        fpsGraphCtx.setLineDash([4, 4]);
        fpsGraphCtx.beginPath();
        fpsGraphCtx.moveTo(0, y30); fpsGraphCtx.lineTo(w, y30);
        fpsGraphCtx.stroke();
        fpsGraphCtx.setLineDash([]);

        var y60 = h - (60 / 120) * h;
        fpsGraphCtx.strokeStyle = 'rgba(74,222,128,0.3)';
        fpsGraphCtx.setLineDash([4, 4]);
        fpsGraphCtx.beginPath();
        fpsGraphCtx.moveTo(0, y60); fpsGraphCtx.lineTo(w, y60);
        fpsGraphCtx.stroke();
        fpsGraphCtx.setLineDash([]);

        var step = w / (FPS_HISTORY_SIZE - 1);
        fpsGraphCtx.beginPath();
        fpsGraphCtx.strokeStyle = '#4ade80';
        fpsGraphCtx.lineWidth = 1.5;

        for (var i = 0; i < fpsHistory.length; i++) {
            var x = i * step;
            var fy = h - Math.min(fpsHistory[i], 120) / 120 * h;
            if (i === 0) fpsGraphCtx.moveTo(x, fy);
            else fpsGraphCtx.lineTo(x, fy);
        }
        fpsGraphCtx.stroke();

        var lastX = (fpsHistory.length - 1) * step;
        fpsGraphCtx.lineTo(lastX, h);
        fpsGraphCtx.lineTo(0, h);
        fpsGraphCtx.closePath();
        var grad = fpsGraphCtx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, 'rgba(74,222,128,0.15)');
        grad.addColorStop(1, 'rgba(74,222,128,0)');
        fpsGraphCtx.fillStyle = grad;
        fpsGraphCtx.fill();
    }

    // Auto-init
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    return {
        init: init,
        getTier: function () { return currentTier; },
        getConfig: function () { return TIERS[currentTier]; },
        setTier: setTier,
        toggleDebug: toggleDebug,
        registerThreeJs: registerThreeJs,
        getDeviceProfile: function () { return deviceProfile; },
        getGpuScore: function () { return gpuScore; },
        getMemoryMB: function () { return memoryUsageMB; },
        isMobile: isMobileDevice,
        TIERS: TIERS,
        TIER_ORDER: TIER_ORDER,
    };
})();

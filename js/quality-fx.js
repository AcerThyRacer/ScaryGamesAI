/* ============================================
   ScaryGamesAI — Quality FX Engine v2.0
   Cinematic Ray Tracing & Path Tracing
   post-processing overlays for all games.
   ============================================ */

const QualityFX = (function () {
    'use strict';

    const TIER_KEY = 'sgai-sub-tier';
    let tier = 'none';
    let fxCanvas = null;
    let fxCtx = null;
    let gameCanvas = null;
    let running = false;
    let frameCount = 0;
    let hudEl = null;
    let detailPanel = null;
    let detailOpen = false;

    // === PERFORMANCE: cached dimensions & mobile detection ===
    let cachedW = 0, cachedH = 0;
    const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
        || ('ontouchstart' in window && window.innerWidth < 1024);
    let tabVisible = true;
    let perfMode = 'full'; // 'full' | 'reduced' | 'minimal'
    let fxOpacity = 1.0;  // global FX overlay opacity
    let effectToggles = {
        godRays: true, ssr: true, contactShadow: true, specularBloom: true,
        ambientOcclusion: true, lightShafts: true, rain: true, bloomHalos: true,
        motionBlur: true, wetSurface: true, heatDistortion: true, crepRays: true,
        edgeGlow: true, dustMotes: true,
        photons: true, gi: true, caustics: true, fireflies: true, fog: true,
        lensFlare: true, sss: true, aurora: true, prism: true,
        lightPaint: true, sparkles: true, emissiveBlooms: true
    };
    // Mobile uses fewer particles — same effects, lower counts
    const POOL_SCALE = isMobile ? 0.4 : 1;
    // Full refresh-rate rendering by default.
    // Only cap if the user explicitly asks the OS/browser to reduce motion or save data.
    const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const saveData = !!(navigator.connection && navigator.connection.saveData);
    const TARGET_FPS_INTERVAL = (prefersReducedMotion || saveData) ? (1000 / 30) : 0;
    let lastRenderTime = 0;
    // Pre-allocated noise ImageData buffer
    let noiseImageData = null;

    // === DATA POOLS ===
    const rays = [];
    const photons = [];
    const causticPts = [];
    const fireflies = [];
    const fogLayers = [];
    const giSources = [];
    const lensFlares = [];
    const ssrStripes = [];
    const lightShafts = [];
    const rainStreaks = [];
    // Phase 6 RT pools
    const bloomHalos = [];
    const motionTrails = [];
    const wetBands = [];
    const heatWaves = [];
    const crepRays = [];
    const edgeGlowPts = [];
    const dustMotes = [];
    // Phase 6 PT pools
    const sssPts = [];
    const auroraWaves = [];
    const prismCorners = [];
    const lightPaintTrails = [];
    const microSparkles = [];
    const penumbraEdges = [];
    const emissiveBlooms = [];
    let lightAngle = 0;
    let denoiserNoise = 0.06;
    let dispersionOffset = 0;
    let convergenceTimer = 0;
    let fpsFrames = 0, fpsLast = performance.now(), fpsDisplay = 0;

    function getTier() { return localStorage.getItem(TIER_KEY) || 'none'; }
    function isRT() { const t = getTier(); return t === 'pro' || t === 'max'; }
    function isPT() { return getTier() === 'max'; }

    /* ============ INIT ============ */
    function init() {
        tier = getTier();
        gameCanvas = document.getElementById('game-canvas');
        if (!gameCanvas) return;

        // Create overlay canvas
        fxCanvas = document.createElement('canvas');
        fxCanvas.id = 'quality-fx-canvas';
        fxCanvas.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:50;will-change:transform;';
        document.body.appendChild(fxCanvas);

        // === PERFORMANCE: cache dimensions on resize instead of every frame ===
        function updateCanvasSize() {
            cachedW = window.innerWidth;
            cachedH = window.innerHeight;
            fxCanvas.width = cachedW;
            fxCanvas.height = cachedH;
            noiseImageData = null; // invalidate noise buffer on resize
        }
        updateCanvasSize();
        window.addEventListener('resize', updateCanvasSize);

        // === PERFORMANCE: Page Visibility API — pause when tab hidden ===
        document.addEventListener('visibilitychange', function () {
            tabVisible = !document.hidden;
            if (tabVisible && running) requestAnimationFrame(renderLoop);
        });
        fxCtx = fxCanvas.getContext('2d');

        // === Populate ray data (scaled for device) ===
        for (let i = 0; i < Math.round(48 * POOL_SCALE); i++) {
            rays.push({
                x: Math.random(),
                y: Math.random() * 0.25,
                angle: Math.PI * 0.3 + Math.random() * 0.4,
                width: 0.8 + Math.random() * 3.5,
                speed: 0.0003 + Math.random() * 0.0012,
                opacity: 0.03 + Math.random() * 0.07,
                length: 0.4 + Math.random() * 0.6,
                colorTemp: Math.random(), // 0 = warm, 1 = cool
                scatter: Math.random() * 0.02,
                dustInteraction: Math.random() > 0.6,
            });
        }

        // === Photon particles (scaled for device) ===
        for (let i = 0; i < Math.round(120 * POOL_SCALE); i++) {
            photons.push({
                x: Math.random(), y: Math.random(),
                vx: (Math.random() - 0.5) * 0.003,
                vy: (Math.random() - 0.5) * 0.003,
                life: Math.random(),
                maxLife: 0.4 + Math.random() * 0.6,
                radius: 0.8 + Math.random() * 2.5,
                bounce: Math.floor(Math.random() * 4) + 2,
                maxBounce: 0,
                hue: Math.random() * 60 + 10,
                energy: 1.0,
                spectralSplit: Math.random() > 0.7,
                trail: [],
            });
            photons[photons.length - 1].maxBounce = photons[photons.length - 1].bounce;
        }

        // === Caustic points (scaled for device) ===
        for (let i = 0; i < Math.round(50 * POOL_SCALE); i++) {
            causticPts.push({
                x: Math.random(), y: Math.random(),
                phase: Math.random() * Math.PI * 2,
                speed: 0.008 + Math.random() * 0.025,
                radius: 10 + Math.random() * 40,
                waveFreq: 2 + Math.random() * 5,
                refraction: Math.random() * 0.3,
            });
        }

        // === Fireflies (PT only, scaled) ===
        for (let i = 0; i < Math.round(35 * POOL_SCALE); i++) {
            fireflies.push({
                x: Math.random(), y: Math.random(),
                vx: (Math.random() - 0.5) * 0.001,
                vy: (Math.random() - 0.5) * 0.001,
                phase: Math.random() * Math.PI * 2,
                radius: 1.5 + Math.random() * 3,
                hue: Math.random() > 0.5 ? (40 + Math.random() * 20) : (180 + Math.random() * 40),
                brightness: 0.5 + Math.random() * 0.5,
                flickerSpeed: 0.02 + Math.random() * 0.04,
            });
        }

        // === Fog layers (PT only) ===
        for (let i = 0; i < 5; i++) {
            fogLayers.push({
                y: 0.3 + i * 0.15,
                density: 0.02 + Math.random() * 0.03,
                scrollSpeed: 0.0002 + Math.random() * 0.0004,
                offset: Math.random() * 100,
                hue: 220 + Math.random() * 30,
            });
        }

        // === GI Sources (8 for PT) ===
        const giPresets = [
            { x: 0.05, y: 0.95, r: 220, g: 60, b: 60 },    // red bounce corner
            { x: 0.95, y: 0.95, r: 60, g: 60, b: 220 },     // blue bounce corner
            { x: 0.5, y: 0.05, r: 220, g: 200, b: 100 },    // warm ceiling
            { x: 0.1, y: 0.5, r: 160, g: 80, b: 120 },      // purple wall
            { x: 0.9, y: 0.5, r: 80, g: 160, b: 120 },      // teal wall
            { x: 0.5, y: 0.5, r: 180, g: 150, b: 80 },      // center warm
            { x: 0.3, y: 0.2, r: 100, g: 180, b: 200 },     // sky bleed
            { x: 0.7, y: 0.8, r: 200, g: 100, b: 80 },      // lava/fire bleed
        ];
        giPresets.forEach(g => giSources.push({ ...g, phase: Math.random() * Math.PI * 2 }));

        // === Lens Flares (PT) ===
        for (let i = 0; i < 6; i++) {
            lensFlares.push({
                x: Math.random(),
                y: Math.random() * 0.4,
                size: 20 + Math.random() * 40,
                intensity: 0.015 + Math.random() * 0.02,
                hue: Math.random() * 360,
                anamorphicStretch: 2 + Math.random() * 6,
            });
        }

        // === SSR Stripes (RT) ===
        for (let i = 0; i < 12; i++) {
            ssrStripes.push({
                x: Math.random(),
                width: 0.05 + Math.random() * 0.15,
                noisePhase: Math.random() * 100,
                noiseSpeed: 0.01 + Math.random() * 0.02,
                opacity: 0.02 + Math.random() * 0.03,
            });
        }

        // === Light Shafts (RT) ===
        for (let i = 0; i < 8; i++) {
            lightShafts.push({
                x: Math.random(),
                width: 0.03 + Math.random() * 0.06,
                angle: -0.1 + Math.random() * 0.2,
                opacity: 0.02 + Math.random() * 0.04,
                scrollSpeed: 0.001 + Math.random() * 0.002,
                phase: Math.random() * 100,
            });
        }

        // === Rain Streaks (RT, subtle) ===
        for (let i = 0; i < Math.round(40 * POOL_SCALE); i++) {
            rainStreaks.push({
                x: Math.random(),
                y: Math.random(),
                length: 0.02 + Math.random() * 0.04,
                speed: 0.008 + Math.random() * 0.012,
                opacity: 0.015 + Math.random() * 0.025,
                width: 0.5 + Math.random(),
            });
        }

        // === Phase 6: RT new pools ===
        for (let i = 0; i < 6; i++) bloomHalos.push({ x: Math.random(), y: Math.random() * 0.5, r: 30 + Math.random() * 50, phase: Math.random() * Math.PI * 2, speed: 0.008 + Math.random() * 0.015 });
        for (let i = 0; i < 8; i++) motionTrails.push({ x: Math.random(), y: Math.random(), angle: Math.random() * Math.PI, len: 0.05 + Math.random() * 0.1, opacity: 0.01 + Math.random() * 0.02, speed: 0.002 + Math.random() * 0.003 });
        for (let i = 0; i < 5; i++) wetBands.push({ y: 0.7 + i * 0.06, width: 0.04 + Math.random() * 0.03, phase: Math.random() * 100, speed: 0.005 + Math.random() * 0.01 });
        for (let i = 0; i < 4; i++) heatWaves.push({ y: 0.65 + Math.random() * 0.3, amplitude: 1 + Math.random() * 2, freq: 0.05 + Math.random() * 0.05, phase: Math.random() * 100 });
        for (let i = 0; i < 6; i++) crepRays.push({ x: Math.random(), angle: Math.PI * 0.55 + Math.random() * 0.3, width: 0.8 + Math.random() * 2, opacity: 0.015 + Math.random() * 0.025, speed: 0.0005 + Math.random() * 0.001 });
        for (let i = 0; i < 10; i++) edgeGlowPts.push({ t: Math.random(), side: Math.floor(Math.random() * 4), intensity: 0.02 + Math.random() * 0.03, phase: Math.random() * Math.PI * 2 });
        for (let i = 0; i < Math.round(50 * POOL_SCALE); i++) dustMotes.push({ x: Math.random(), y: Math.random(), vx: (Math.random() - 0.5) * 0.0005, vy: -0.0002 - Math.random() * 0.0003, size: 0.5 + Math.random() * 1.5, opacity: 0.03 + Math.random() * 0.05, phase: Math.random() * Math.PI * 2 });

        // === Phase 6: PT new pools ===
        for (let i = 0; i < 5; i++) sssPts.push({ x: 0.3 + Math.random() * 0.4, y: 0.3 + Math.random() * 0.4, radius: 80 + Math.random() * 120, phase: Math.random() * Math.PI * 2, hue: Math.random() > 0.5 ? 15 : 35 });
        for (let i = 0; i < 4; i++) auroraWaves.push({ y: 0.05 + i * 0.06, hue: 120 + i * 60, amplitude: 0.02 + Math.random() * 0.02, speed: 0.003 + Math.random() * 0.004, phase: Math.random() * 100 });
        prismCorners.push({ corner: 'tl' }, { corner: 'tr' }, { corner: 'bl' }, { corner: 'br' });
        for (let i = 0; i < 8; i++) lightPaintTrails.push({ points: [], hue: Math.random() * 360, speed: 0.003 + Math.random() * 0.005, phase: Math.random() * Math.PI * 2, radius: 0.15 + Math.random() * 0.25 });
        for (let i = 0; i < Math.round(60 * POOL_SCALE); i++) microSparkles.push({ x: Math.random(), y: Math.random(), phase: Math.random() * Math.PI * 2, speed: 0.03 + Math.random() * 0.06, size: 0.5 + Math.random() * 1 });
        penumbraEdges.push({ side: 'left' }, { side: 'right' }, { side: 'top' }, { side: 'bottom' });
        for (let i = 0; i < 6; i++) emissiveBlooms.push({ x: Math.random(), y: Math.random(), radius: 40 + Math.random() * 80, phase: Math.random() * Math.PI * 2, speed: 0.006 + Math.random() * 0.012, hue: Math.random() * 60 + 20 });

        // Inject HUD
        injectQualityHUD();

        // Start render loop
        running = true;
        convergenceTimer = 0;
        requestAnimationFrame(renderLoop);
    }

    /* ============ QUALITY HUD (Upgraded) ============ */
    function injectQualityHUD() {
        const t = getTier();

        hudEl = document.createElement('div');
        hudEl.className = 'qfx-hud';

        const fpsHtml = '<div class="qfx-fps" id="qfx-fps">-- FPS</div>';
        const convergenceHtml = t === 'max' ? '<div class="qfx-convergence"><div class="qfx-conv-bar"><div class="qfx-conv-fill" id="qfx-conv-fill"></div></div><span class="qfx-conv-label">Converging...</span></div>' : '';

        if (t === 'pro') {
            hudEl.classList.add('qfx-rt');
            hudEl.innerHTML = `
                <div class="qfx-hud-main">
                    <span class="qfx-icon">💠</span>
                    <span class="qfx-label">Ray Tracing</span>
                    <span class="qfx-on">ON</span>
                </div>
                <div class="qfx-hud-stats">
                    <span class="qfx-stat">48 rays</span>
                    <span class="qfx-stat">SSR</span>
                    <span class="qfx-stat">Vol. Light</span>
                    <span class="qfx-stat">Bloom</span>
                    <span class="qfx-stat">Dust</span>
                </div>
                ${fpsHtml}
                <div class="qfx-detail" id="qfx-detail">
                    <div class="qfx-detail-row"><span>God Rays</span><span class="qfx-val">48 active</span></div>
                    <div class="qfx-detail-row"><span>SSR Stripes</span><span class="qfx-val">12 bands</span></div>
                    <div class="qfx-detail-row"><span>Light Shafts</span><span class="qfx-val">8 shafts</span></div>
                    <div class="qfx-detail-row"><span>Bloom Halos</span><span class="qfx-val">6 halos</span></div>
                    <div class="qfx-detail-row"><span>Dust Motes</span><span class="qfx-val">50 particles</span></div>
                    <div class="qfx-detail-row"><span>Motion Blur</span><span class="qfx-val">8 trails</span></div>
                    <div class="qfx-detail-row"><span>Wet Surface</span><span class="qfx-val">5 bands</span></div>
                </div>`;
        } else if (t === 'max') {
            hudEl.classList.add('qfx-pt');
            hudEl.innerHTML = `
                <div class="qfx-hud-main">
                    <span class="qfx-icon">✨</span>
                    <span class="qfx-label">Path Tracing</span>
                    <span class="qfx-on">ON</span>
                </div>
                <div class="qfx-hud-stats">
                    <span class="qfx-stat">120 photons</span>
                    <span class="qfx-stat">GI</span>
                    <span class="qfx-stat">Caustics</span>
                    <span class="qfx-stat">SSS</span>
                    <span class="qfx-stat">Aurora</span>
                </div>
                ${fpsHtml}
                ${convergenceHtml}
                <div class="qfx-detail" id="qfx-detail">
                    <div class="qfx-detail-row"><span>Photon Particles</span><span class="qfx-val">120 active</span></div>
                    <div class="qfx-detail-row"><span>GI Sources</span><span class="qfx-val">8 lights</span></div>
                    <div class="qfx-detail-row"><span>Caustic Points</span><span class="qfx-val">50 patterns</span></div>
                    <div class="qfx-detail-row"><span>Subsurface Scatter</span><span class="qfx-val">5 zones</span></div>
                    <div class="qfx-detail-row"><span>Aurora Waves</span><span class="qfx-val">4 bands</span></div>
                    <div class="qfx-detail-row"><span>Micro-Reflections</span><span class="qfx-val">60 sparkles</span></div>
                    <div class="qfx-detail-row"><span>Emissive Blooms</span><span class="qfx-val">6 sources</span></div>
                    <div class="qfx-detail-row"><span>Light Painting</span><span class="qfx-val">8 trails</span></div>
                </div>`;
        } else {
            hudEl.classList.add('qfx-standard');
            hudEl.innerHTML = `
                <div class="qfx-hud-main">
                    <span class="qfx-icon">🎮</span>
                    <span class="qfx-label">Standard Quality</span>
                </div>
                ${fpsHtml}`;
        }

        document.body.appendChild(hudEl);

        // Make HUD clickable to toggle detail panel
        hudEl.style.pointerEvents = 'auto';
        hudEl.style.cursor = 'pointer';
        hudEl.addEventListener('click', function () {
            const detail = document.getElementById('qfx-detail');
            if (detail) {
                detailOpen = !detailOpen;
                detail.style.display = detailOpen ? 'block' : 'none';
            }
        });

        // Inject HUD styles
        const style = document.createElement('style');
        style.textContent = `
            .qfx-hud {
                position: fixed;
                top: 12px;
                right: 12px;
                z-index: 200;
                padding: 8px 16px;
                border-radius: 10px;
                font-family: 'Inter', sans-serif;
                backdrop-filter: blur(12px);
                -webkit-backdrop-filter: blur(12px);
                animation: qfxSlideIn 0.6s cubic-bezier(0.16,1,0.3,1);
                transition: all 0.4s ease;
                max-width: 280px;
            }
            @keyframes qfxSlideIn {
                from { opacity: 0; transform: translateY(-15px) scale(0.95); }
                to   { opacity: 1; transform: translateY(0) scale(1); }
            }
            .qfx-hud-main {
                display: flex;
                align-items: center;
                gap: 6px;
                font-size: 0.8rem;
                font-weight: 700;
                letter-spacing: 0.5px;
            }
            .qfx-hud-stats {
                display: flex;
                gap: 6px;
                margin-top: 4px;
                font-size: 0.58rem;
                opacity: 0.7;
                font-weight: 500;
                flex-wrap: wrap;
            }
            .qfx-stat {
                background: rgba(255,255,255,0.08);
                padding: 1px 6px;
                border-radius: 3px;
            }
            .qfx-icon {
                font-size: 1rem;
                filter: drop-shadow(0 0 4px currentColor);
            }
            .qfx-standard {
                background: rgba(40,40,55,0.7);
                color: #8a8a9a;
                border: 1px solid rgba(100,100,120,0.25);
            }
            .qfx-rt {
                background: rgba(0,40,60,0.75);
                color: #44ddff;
                border: 1px solid rgba(0,200,255,0.25);
                box-shadow: 0 0 25px rgba(0,200,255,0.12), inset 0 0 20px rgba(0,200,255,0.05);
            }
            .qfx-pt {
                background: rgba(50,40,0,0.75);
                color: #ffd700;
                border: 1px solid rgba(255,215,0,0.25);
                box-shadow: 0 0 25px rgba(255,215,0,0.12), inset 0 0 20px rgba(255,215,0,0.05);
            }
            .qfx-on {
                display: inline-block;
                background: rgba(0,255,100,0.15);
                color: #44ff88;
                padding: 2px 8px;
                border-radius: 4px;
                font-size: 0.6rem;
                font-weight: 800;
                letter-spacing: 1px;
                animation: qfxPulse 2.5s ease-in-out infinite;
            }
            @keyframes qfxPulse {
                0%, 100% { opacity: 1; box-shadow: 0 0 6px rgba(68,255,136,0.3); }
                50% { opacity: 0.7; box-shadow: 0 0 2px rgba(68,255,136,0.1); }
            }
            .qfx-rt .qfx-stat { background: rgba(0,200,255,0.1); }
            .qfx-pt .qfx-stat { background: rgba(255,215,0,0.1); }
            .qfx-fps {
                margin-top: 4px;
                font-size: 0.6rem;
                font-weight: 600;
                font-family: monospace;
                opacity: 0.6;
                letter-spacing: 0.5px;
            }
            .qfx-convergence {
                margin-top: 6px;
            }
            .qfx-conv-bar {
                height: 3px;
                background: rgba(255,255,255,0.1);
                border-radius: 2px;
                overflow: hidden;
            }
            .qfx-conv-fill {
                height: 100%;
                width: 0%;
                background: linear-gradient(90deg, #ffd700, #ff8800);
                border-radius: 2px;
                transition: width 0.5s;
            }
            .qfx-conv-label {
                font-size: 0.55rem;
                opacity: 0.5;
                display: block;
                margin-top: 2px;
            }
            .qfx-detail {
                display: none;
                margin-top: 8px;
                padding-top: 8px;
                border-top: 1px solid rgba(255,255,255,0.1);
            }
            .qfx-detail-row {
                display: flex;
                justify-content: space-between;
                font-size: 0.6rem;
                padding: 2px 0;
                opacity: 0.65;
            }
            .qfx-val {
                font-weight: 600;
                opacity: 0.9;
            }
        `;
        document.head.appendChild(style);
    }

    /* ============ RENDER LOOP (Performance-Optimized) ============ */
    function renderLoop(timestamp) {
        if (!running) return;
        // === PERFORMANCE: skip if tab is hidden ===
        if (!tabVisible) return;

        // === PERFORMANCE: frame rate cap on mobile (30fps) ===
        if (TARGET_FPS_INTERVAL > 0) {
            if (timestamp - lastRenderTime < TARGET_FPS_INTERVAL) {
                requestAnimationFrame(renderLoop);
                return;
            }
            lastRenderTime = timestamp;
        }

        frameCount++;

        // FPS counter
        fpsFrames++;
        const now = performance.now();
        if (now - fpsLast >= 1000) {
            fpsDisplay = fpsFrames;
            fpsFrames = 0;
            fpsLast = now;
            const fpsEl = document.getElementById('qfx-fps');
            if (fpsEl) fpsEl.textContent = fpsDisplay + ' FPS';
            // Update convergence bar
            const convFill = document.getElementById('qfx-conv-fill');
            if (convFill) {
                const convPct = Math.min(100, convergenceTimer * 3.3);
                convFill.style.width = convPct + '%';
            }
        }

        // === PERFORMANCE: use cached dimensions instead of resizing every frame ===
        const w = cachedW;
        const h = cachedH;
        fxCtx.clearRect(0, 0, w, h);

        // Apply global opacity
        fxCtx.globalAlpha = fxOpacity;

        // perfMode gating: 'minimal' = skip all overlays
        if (perfMode !== 'minimal') {
            if (isRT()) drawRayTracing(w, h);
            if (isPT() && perfMode === 'full') drawPathTracing(w, h);
        }

        fxCtx.globalAlpha = 1.0;
        requestAnimationFrame(renderLoop);
    }

    /* ============================================
       RAY TRACING SIMULATION (Pro + Max)
       ============================================ */
    function drawRayTracing(w, h) {
        lightAngle += 0.002;

        // ──── 1. VOLUMETRIC GOD RAYS (48 rays with dynamic scatter) ────
        if (!effectToggles.godRays) { /* skip */ } else {
            const lightX = w * (0.5 + Math.sin(lightAngle * 0.5) * 0.35);
            const lightY = -30;

            fxCtx.save();
            fxCtx.globalCompositeOperation = 'screen';
            rays.forEach(ray => {
                ray.x += Math.sin(frameCount * ray.speed) * 0.0008;
                const startX = lightX + (ray.x - 0.5) * w * 0.7;
                const startY = lightY;
                const endX = startX + Math.cos(ray.angle) * h * ray.length;
                const endY = startY + Math.sin(ray.angle) * h * ray.length;

                // Color temperature variation
                const warmR = 255, warmG = 230, warmB = 180;
                const coolR = 200, coolG = 220, coolB = 255;
                const t = ray.colorTemp;
                const r = Math.round(warmR + (coolR - warmR) * t);
                const g = Math.round(warmG + (coolG - warmG) * t);
                const b = Math.round(warmB + (coolB - warmB) * t);

                const gradient = fxCtx.createLinearGradient(startX, startY, endX, endY);
                const osc = Math.sin(frameCount * 0.012 + ray.x * 10) * 0.3 + 0.7;
                const alpha = ray.opacity * osc;
                gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${(alpha * 1.6).toFixed(3)})`);
                gradient.addColorStop(0.2, `rgba(${r}, ${g}, ${b}, ${(alpha * 1.2).toFixed(3)})`);
                gradient.addColorStop(0.6, `rgba(${r}, ${g}, ${b}, ${(alpha * 0.5).toFixed(3)})`);
                gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

                fxCtx.strokeStyle = gradient;
                fxCtx.lineWidth = ray.width + Math.sin(frameCount * 0.02 + ray.x * 5) * 0.8;
                fxCtx.beginPath();
                fxCtx.moveTo(startX, startY);

                // Scatter — slight curve for atmospheric interaction
                if (ray.scatter > 0.01) {
                    const midX = (startX + endX) / 2 + Math.sin(frameCount * 0.015 + ray.x * 20) * ray.scatter * w;
                    const midY = (startY + endY) / 2;
                    fxCtx.quadraticCurveTo(midX, midY, endX, endY);
                } else {
                    fxCtx.lineTo(endX, endY);
                }
                fxCtx.stroke();

                // Dust motes along ray
                if (ray.dustInteraction && frameCount % 3 === 0) {
                    const dustT = (Math.sin(frameCount * 0.008 + ray.x * 30) + 1) / 2;
                    const dx = startX + (endX - startX) * dustT;
                    const dy = startY + (endY - startY) * dustT;
                    fxCtx.fillStyle = `rgba(${r}, ${g}, ${b}, ${(alpha * 0.6).toFixed(3)})`;
                    fxCtx.beginPath();
                    fxCtx.arc(dx, dy, 1.5, 0, Math.PI * 2);
                    fxCtx.fill();
                }
            });
            fxCtx.restore();
        } // end godRays toggle

        // ──── 2. SCREEN-SPACE REFLECTIONS (SSR) ────
        if (effectToggles.ssr) {
            fxCtx.save();
            fxCtx.globalCompositeOperation = 'screen';
            const reflectionZone = h * 0.78;
            ssrStripes.forEach(s => {
                s.noisePhase += s.noiseSpeed;
                const sx = s.x * w;
                const sw = s.width * w;
                const noiseOffset = Math.sin(s.noisePhase) * 15;
                const reflGrad = fxCtx.createLinearGradient(0, reflectionZone, 0, h);
                const rAlpha = s.opacity * (0.6 + Math.sin(frameCount * 0.01 + s.x * 10) * 0.4);
                reflGrad.addColorStop(0, 'rgba(120,160,220,0)');
                reflGrad.addColorStop(0.3, `rgba(120,160,220,${rAlpha.toFixed(3)})`);
                reflGrad.addColorStop(0.7, `rgba(80,120,200,${(rAlpha * 0.7).toFixed(3)})`);
                reflGrad.addColorStop(1, `rgba(60,100,180,${(rAlpha * 0.3).toFixed(3)})`);
                fxCtx.fillStyle = reflGrad;
                fxCtx.fillRect(sx + noiseOffset, reflectionZone, sw, h - reflectionZone);
            });
            fxCtx.restore();
        } // end ssr toggle

        // ──── 3. CONTACT SHADOW SIMULATION ────
        if (effectToggles.contactShadow) {
            fxCtx.save();
            // Soft shadow penumbra from edges
            const shadowIntensity = 0.12 + Math.sin(frameCount * 0.004) * 0.03;

            // Left edge shadow
            let edgeGrad = fxCtx.createLinearGradient(0, 0, w * 0.12, 0);
            edgeGrad.addColorStop(0, `rgba(0,0,0,${shadowIntensity})`);
            edgeGrad.addColorStop(1, 'rgba(0,0,0,0)');
            fxCtx.fillStyle = edgeGrad;
            fxCtx.fillRect(0, 0, w * 0.12, h);

            // Right edge shadow
            edgeGrad = fxCtx.createLinearGradient(w, 0, w * 0.88, 0);
            edgeGrad.addColorStop(0, `rgba(0,0,0,${shadowIntensity})`);
            edgeGrad.addColorStop(1, 'rgba(0,0,0,0)');
            fxCtx.fillStyle = edgeGrad;
            fxCtx.fillRect(w * 0.88, 0, w * 0.12, h);

            // Bottom contact shadow
            edgeGrad = fxCtx.createLinearGradient(0, h, 0, h * 0.9);
            edgeGrad.addColorStop(0, `rgba(0,0,0,${shadowIntensity * 1.3})`);
            edgeGrad.addColorStop(1, 'rgba(0,0,0,0)');
            fxCtx.fillStyle = edgeGrad;
            fxCtx.fillRect(0, h * 0.9, w, h * 0.1);
            fxCtx.restore();
        } // end contactShadow toggle

        // ──── 4. SPECULAR HIGHLIGHT NETWORK ────
        if (effectToggles.specularBloom) {
            fxCtx.save();
            fxCtx.globalCompositeOperation = 'screen';
            const specCount = 8;
            for (let i = 0; i < specCount; i++) {
                const sx = w * (0.1 + (i / specCount) * 0.8);
                const sy = h * (0.12 + Math.sin(frameCount * 0.008 + i * 1.8) * 0.12);
                const sr = 25 + Math.sin(frameCount * 0.015 + i * 2.5) * 18;
                const specAlpha = 0.025 + Math.sin(frameCount * 0.012 + i * 3) * 0.015;

                // Core bloom
                const bloomGrad = fxCtx.createRadialGradient(sx, sy, 0, sx, sy, sr);
                bloomGrad.addColorStop(0, `rgba(220, 235, 255, ${specAlpha.toFixed(3)})`);
                bloomGrad.addColorStop(0.4, `rgba(200, 220, 255, ${(specAlpha * 0.5).toFixed(3)})`);
                bloomGrad.addColorStop(1, 'rgba(200, 220, 255, 0)');
                fxCtx.fillStyle = bloomGrad;
                fxCtx.beginPath();
                fxCtx.arc(sx, sy, sr, 0, Math.PI * 2);
                fxCtx.fill();

                // Anamorphic light streak
                if (specAlpha > 0.02) {
                    const streakGrad = fxCtx.createLinearGradient(sx - sr * 3, sy, sx + sr * 3, sy);
                    streakGrad.addColorStop(0, 'rgba(200,220,255,0)');
                    streakGrad.addColorStop(0.4, `rgba(220,235,255,${(specAlpha * 0.3).toFixed(3)})`);
                    streakGrad.addColorStop(0.6, `rgba(220,235,255,${(specAlpha * 0.3).toFixed(3)})`);
                    streakGrad.addColorStop(1, 'rgba(200,220,255,0)');
                    fxCtx.fillStyle = streakGrad;
                    fxCtx.fillRect(sx - sr * 3, sy - 1, sr * 6, 2);
                }
            }
            fxCtx.restore();
        } // end specularBloom toggle

        // ──── 5. DYNAMIC AMBIENT OCCLUSION ────
        if (effectToggles.ambientOcclusion) {
            const aoGrad = fxCtx.createRadialGradient(
                w * (0.5 + Math.sin(lightAngle) * 0.05),
                h * (0.5 + Math.cos(lightAngle * 0.7) * 0.05),
                h * 0.2, w / 2, h / 2, h * 0.85
            );
            aoGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
            aoGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.03)');
            aoGrad.addColorStop(0.8, 'rgba(0, 0, 0, 0.08)');
            aoGrad.addColorStop(1, 'rgba(0, 0, 0, 0.18)');
            fxCtx.fillStyle = aoGrad;
            fxCtx.fillRect(0, 0, w, h);
        } // end ambientOcclusion toggle

        // ──── 6. LIGHT SHAFTS ────
        if (effectToggles.lightShafts) {
            fxCtx.save();
            fxCtx.globalCompositeOperation = 'screen';
            lightShafts.forEach(ls => {
                ls.phase += ls.scrollSpeed;
                const shaftX = ls.x * w + Math.sin(ls.phase * 10) * 20;
                const shaftW = ls.width * w;
                const osc = (Math.sin(ls.phase * 5) + 1) / 2;
                const alpha = ls.opacity * (0.5 + osc * 0.5);

                fxCtx.save();
                fxCtx.translate(shaftX, 0);
                fxCtx.rotate(ls.angle);
                const shaftGrad = fxCtx.createLinearGradient(0, 0, 0, h);
                shaftGrad.addColorStop(0, `rgba(255,240,200,${(alpha * 1.2).toFixed(3)})`);
                shaftGrad.addColorStop(0.3, `rgba(255,230,180,${(alpha * 0.8).toFixed(3)})`);
                shaftGrad.addColorStop(0.7, `rgba(255,220,160,${(alpha * 0.3).toFixed(3)})`);
                shaftGrad.addColorStop(1, 'rgba(255,220,160,0)');
                fxCtx.fillStyle = shaftGrad;
                fxCtx.fillRect(-shaftW / 2, -10, shaftW, h + 20);
                fxCtx.restore();
            });
            fxCtx.restore();
        } // end lightShafts toggle

        // ──── 7. RAIN / MOISTURE STREAKS ────
        if (effectToggles.rain && perfMode !== 'reduced') {
            fxCtx.save();
            fxCtx.globalCompositeOperation = 'screen';
            rainStreaks.forEach(rs => {
                rs.y += rs.speed;
                if (rs.y > 1.1) { rs.y = -0.05; rs.x = Math.random(); }
                const rx = rs.x * w;
                const ry = rs.y * h;
                const rLen = rs.length * h;

                fxCtx.strokeStyle = `rgba(180,200,230,${rs.opacity.toFixed(3)})`;
                fxCtx.lineWidth = rs.width;
                fxCtx.beginPath();
                fxCtx.moveTo(rx, ry);
                fxCtx.lineTo(rx - 1, ry + rLen);
                fxCtx.stroke();
            });
            fxCtx.restore();
        } // end rain toggle

        // ──── 8. BLOOM HALOS ────
        if (effectToggles.bloomHalos && perfMode !== 'reduced') {
            fxCtx.save();
            fxCtx.globalCompositeOperation = 'screen';
            bloomHalos.forEach(bh => {
                bh.phase += bh.speed;
                const bx = bh.x * w + Math.sin(bh.phase) * 30;
                const by = bh.y * h + Math.cos(bh.phase * 0.7) * 20;
                const pulse = (Math.sin(bh.phase * 2) + 1) / 2;
                const alpha = 0.015 + pulse * 0.015;
                const grad = fxCtx.createRadialGradient(bx, by, 0, bx, by, bh.r * (1 + pulse * 0.3));
                grad.addColorStop(0, `rgba(255,240,220,${alpha.toFixed(3)})`);
                grad.addColorStop(0.3, `rgba(255,230,200,${(alpha * 0.5).toFixed(3)})`);
                grad.addColorStop(1, 'rgba(255,220,180,0)');
                fxCtx.fillStyle = grad;
                fxCtx.beginPath();
                fxCtx.arc(bx, by, bh.r * (1 + pulse * 0.3), 0, Math.PI * 2);
                fxCtx.fill();
            });
            fxCtx.restore();
        } // end bloomHalos toggle

        // ──── 9. MOTION BLUR TRAILS ────
        if (effectToggles.motionBlur && perfMode !== 'reduced') {
            fxCtx.save();
            fxCtx.globalCompositeOperation = 'screen';
            motionTrails.forEach(mt => {
                mt.x += Math.cos(mt.angle) * mt.speed;
                mt.y += Math.sin(mt.angle) * mt.speed;
                if (mt.x < -0.1 || mt.x > 1.1 || mt.y < -0.1 || mt.y > 1.1) { mt.x = Math.random(); mt.y = Math.random(); mt.angle = Math.random() * Math.PI; }
                const sx = mt.x * w, sy = mt.y * h;
                const ex = sx + Math.cos(mt.angle) * mt.len * w;
                const ey = sy + Math.sin(mt.angle) * mt.len * h;
                const grad = fxCtx.createLinearGradient(sx, sy, ex, ey);
                grad.addColorStop(0, `rgba(200,210,230,${mt.opacity.toFixed(3)})`);
                grad.addColorStop(1, 'rgba(200,210,230,0)');
                fxCtx.strokeStyle = grad;
                fxCtx.lineWidth = 1;
                fxCtx.beginPath();
                fxCtx.moveTo(sx, sy);
                fxCtx.lineTo(ex, ey);
                fxCtx.stroke();
            });
            fxCtx.restore();
        } // end motionBlur toggle

        // ──── 10. WET SURFACE SHEEN ────
        if (effectToggles.wetSurface && perfMode !== 'reduced') {
            fxCtx.save();
            fxCtx.globalCompositeOperation = 'screen';
            wetBands.forEach(wb => {
                wb.phase += wb.speed;
                const wy = wb.y * h;
                const wHeight = wb.width * h;
                const shimmer = (Math.sin(wb.phase * 8) + 1) / 2;
                const alpha = 0.008 + shimmer * 0.012;
                const grad = fxCtx.createLinearGradient(0, wy, 0, wy + wHeight);
                grad.addColorStop(0, 'rgba(150,180,220,0)');
                grad.addColorStop(0.3, `rgba(150,180,220,${alpha.toFixed(3)})`);
                grad.addColorStop(0.7, `rgba(130,160,200,${(alpha * 0.6).toFixed(3)})`);
                grad.addColorStop(1, 'rgba(130,160,200,0)');
                fxCtx.fillStyle = grad;
                fxCtx.fillRect(0, wy, w, wHeight);
            });
            fxCtx.restore();
        } // end wetSurface toggle

        // ──── 11. HEAT DISTORTION (perf-optimized step size) ────
        if (effectToggles.heatDistortion) {
            fxCtx.save();
            fxCtx.globalCompositeOperation = 'screen';
            const heatStep = isMobile ? 16 : 8; // wider step on mobile
            heatWaves.forEach((hw, hIdx) => {
                // === PERFORMANCE: skip half the waves on alternating frames ===
                if (isMobile && (frameCount + hIdx) % 2 !== 0) return;
                hw.phase += hw.freq;
                const hy = hw.y * h;
                for (let x = 0; x < w; x += heatStep) {
                    const offset = Math.sin(hw.phase + x * 0.02) * hw.amplitude;
                    const alpha = 0.006 + Math.abs(offset) * 0.002;
                    fxCtx.fillStyle = `rgba(255,200,120,${alpha.toFixed(4)})`;
                    fxCtx.fillRect(x, hy + offset, heatStep, 2);
                }
            });
            fxCtx.restore();
        } // end heatDistortion toggle

        // ──── 12. CREPUSCULAR RAYS (secondary) ────
        if (effectToggles.crepRays) {
            fxCtx.save();
            fxCtx.globalCompositeOperation = 'screen';
            const crepX = w * (0.5 - Math.sin(lightAngle * 0.5) * 0.35);
            crepRays.forEach(cr => {
                cr.x += Math.sin(frameCount * cr.speed) * 0.001;
                const sx = crepX + (cr.x - 0.5) * w * 0.5;
                const endX = sx + Math.cos(cr.angle) * h * 0.8;
                const endY = Math.sin(cr.angle) * h * 0.8;
                const osc = (Math.sin(frameCount * 0.01 + cr.x * 8) + 1) / 2;
                const alpha = cr.opacity * (0.4 + osc * 0.6);
                const grad = fxCtx.createLinearGradient(sx, 0, endX, endY);
                grad.addColorStop(0, `rgba(200,180,255,${alpha.toFixed(3)})`);
                grad.addColorStop(0.5, `rgba(180,160,240,${(alpha * 0.4).toFixed(3)})`);
                grad.addColorStop(1, 'rgba(180,160,240,0)');
                fxCtx.strokeStyle = grad;
                fxCtx.lineWidth = cr.width;
                fxCtx.beginPath();
                fxCtx.moveTo(sx, 0);
                fxCtx.lineTo(endX, endY);
                fxCtx.stroke();
            });
            fxCtx.restore();
        } // end crepRays toggle

        // ──── 13. EDGE GLOW (Fresnel rim) ────
        if (effectToggles.edgeGlow) {
            fxCtx.save();
            fxCtx.globalCompositeOperation = 'screen';
            edgeGlowPts.forEach(eg => {
                eg.phase += 0.015;
                const pulse = (Math.sin(eg.phase) + 1) / 2;
                const alpha = eg.intensity * (0.5 + pulse * 0.5);
                let gx, gy, gw, gh;
                if (eg.side === 0) { gx = 0; gy = eg.t * h; gw = w * 0.06; gh = h * 0.15; }
                else if (eg.side === 1) { gx = w * 0.94; gy = eg.t * h; gw = w * 0.06; gh = h * 0.15; }
                else if (eg.side === 2) { gx = eg.t * w; gy = 0; gw = w * 0.15; gh = h * 0.05; }
                else { gx = eg.t * w; gy = h * 0.95; gw = w * 0.15; gh = h * 0.05; }
                const grad = fxCtx.createRadialGradient(gx + gw / 2, gy + gh / 2, 0, gx + gw / 2, gy + gh / 2, Math.max(gw, gh));
                grad.addColorStop(0, `rgba(180,200,255,${alpha.toFixed(3)})`);
                grad.addColorStop(1, 'rgba(180,200,255,0)');
                fxCtx.fillStyle = grad;
                fxCtx.fillRect(gx, gy, gw, gh);
            });
            fxCtx.restore();
        } // end edgeGlow toggle

        // ──── 14. DUST MOTES ────
        if (effectToggles.dustMotes) {
            fxCtx.save();
            fxCtx.globalCompositeOperation = 'screen';
            dustMotes.forEach(dm => {
                dm.phase += 0.02;
                dm.x += dm.vx + Math.sin(dm.phase) * 0.0002;
                dm.y += dm.vy;
                if (dm.y < -0.02) { dm.y = 1.02; dm.x = Math.random(); }
                if (dm.x < -0.02 || dm.x > 1.02) dm.x = Math.random();
                const brightness = (Math.sin(dm.phase * 3) + 1) / 2;
                const alpha = dm.opacity * (0.3 + brightness * 0.7);
                fxCtx.fillStyle = `rgba(255,240,200,${alpha.toFixed(3)})`;
                fxCtx.beginPath();
                fxCtx.arc(dm.x * w, dm.y * h, dm.size * (0.8 + brightness * 0.4), 0, Math.PI * 2);
                fxCtx.fill();
            });
            fxCtx.restore();
        } // end dustMotes toggle
    }

    /* ============================================
       PATH TRACING SIMULATION (Max only)
       All RT effects + these additions
       ============================================ */
    function drawPathTracing(w, h) {
        convergenceTimer += 0.016;
        // Denoiser convergence — noise decreases over time
        denoiserNoise = Math.max(0.01, 0.06 - convergenceTimer * 0.002);

        // ──── 1. BOUNCING PHOTON PARTICLES (physically-simulated) ────
        fxCtx.save();
        fxCtx.globalCompositeOperation = 'screen';
        photons.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.life += 0.004;

            // Energy decay per bounce
            if (p.x < 0 || p.x > 1) { p.vx *= -0.85; p.bounce--; p.energy *= 0.75; }
            if (p.y < 0 || p.y > 1) { p.vy *= -0.85; p.bounce--; p.energy *= 0.75; }
            p.x = Math.max(0, Math.min(1, p.x));
            p.y = Math.max(0, Math.min(1, p.y));

            // Track trail
            if (p.trail.length > 6) p.trail.shift();
            p.trail.push({ x: p.x, y: p.y });

            if (p.life > p.maxLife || p.bounce <= 0) {
                // Re-emit photon
                p.x = Math.random();
                p.y = Math.random() * 0.3;
                p.vx = (Math.random() - 0.5) * 0.004;
                p.vy = Math.random() * 0.004 + 0.001;
                p.life = 0;
                p.bounce = Math.floor(Math.random() * 4) + 2;
                p.maxBounce = p.bounce;
                p.hue = Math.random() * 60 + 10;
                p.energy = 1.0;
                p.trail = [];
                p.spectralSplit = Math.random() > 0.7;
            }

            const fadeIn = Math.min(p.life * 6, 1);
            const fadeOut = p.life > p.maxLife * 0.65 ? (p.maxLife - p.life) / (p.maxLife * 0.35) : 1;
            const alpha = 0.1 * fadeIn * Math.max(0, fadeOut) * p.energy;

            // Draw photon with energy-based sizing
            const pSize = p.radius * (1 + (1 - p.energy) * 2) * 3;
            const grad = fxCtx.createRadialGradient(p.x * w, p.y * h, 0, p.x * w, p.y * h, pSize);

            if (p.spectralSplit) {
                // Spectral split — show separate RGB channels
                const bounceRatio = 1 - (p.bounce / p.maxBounce);
                const hueShift = bounceRatio * 120;
                grad.addColorStop(0, `hsla(${p.hue + hueShift}, 90%, 75%, ${alpha.toFixed(3)})`);
                grad.addColorStop(0.5, `hsla(${p.hue + hueShift + 30}, 80%, 65%, ${(alpha * 0.4).toFixed(3)})`);
                grad.addColorStop(1, `hsla(${p.hue + hueShift + 60}, 70%, 55%, 0)`);
            } else {
                grad.addColorStop(0, `hsla(${p.hue}, 85%, 72%, ${alpha.toFixed(3)})`);
                grad.addColorStop(0.6, `hsla(${p.hue}, 75%, 65%, ${(alpha * 0.3).toFixed(3)})`);
                grad.addColorStop(1, `hsla(${p.hue}, 70%, 60%, 0)`);
            }
            fxCtx.fillStyle = grad;
            fxCtx.beginPath();
            fxCtx.arc(p.x * w, p.y * h, pSize, 0, Math.PI * 2);
            fxCtx.fill();

            // Draw bounce trail path
            if (p.trail.length > 2 && alpha > 0.02) {
                fxCtx.strokeStyle = `hsla(${p.hue}, 60%, 60%, ${(alpha * 0.25).toFixed(3)})`;
                fxCtx.lineWidth = 0.6;
                fxCtx.beginPath();
                fxCtx.moveTo(p.trail[0].x * w, p.trail[0].y * h);
                for (let ti = 1; ti < p.trail.length; ti++) {
                    fxCtx.lineTo(p.trail[ti].x * w, p.trail[ti].y * h);
                }
                fxCtx.stroke();
            }
        });
        fxCtx.restore();

        // ──── 2. CAUSTIC LIGHT PATTERNS (wave interference) ────
        fxCtx.save();
        fxCtx.globalCompositeOperation = 'screen';
        causticPts.forEach(c => {
            c.phase += c.speed;
            const cx = (c.x + Math.sin(c.phase) * 0.06) * w;
            const cy = (c.y + Math.cos(c.phase * 0.7) * 0.06) * h;

            // Wave interference pattern — multiple overlapping rings
            for (let ring = 0; ring < 3; ring++) {
                const rRadius = c.radius * (0.5 + ring * 0.4);
                const rPhase = c.phase * c.waveFreq + ring * 1.2;
                const intensity = (0.018 + Math.sin(rPhase) * 0.012) * (1 - ring * 0.25);

                const grad = fxCtx.createRadialGradient(cx, cy, rRadius * 0.3, cx, cy, rRadius);
                grad.addColorStop(0, `rgba(255, 245, 210, ${Math.max(0, intensity).toFixed(3)})`);
                grad.addColorStop(0.4, `rgba(220, 235, 255, ${Math.max(0, intensity * 0.5).toFixed(3)})`);
                grad.addColorStop(0.7, `rgba(200, 225, 255, ${Math.max(0, intensity * 0.2).toFixed(3)})`);
                grad.addColorStop(1, 'rgba(200, 225, 255, 0)');
                fxCtx.fillStyle = grad;
                fxCtx.beginPath();
                fxCtx.arc(cx, cy, rRadius, 0, Math.PI * 2);
                fxCtx.fill();
            }
        });
        fxCtx.restore();

        // ──── 3. GLOBAL ILLUMINATION FIELD (8 sources) ────
        fxCtx.save();
        fxCtx.globalCompositeOperation = 'screen';
        giSources.forEach(gi => {
            gi.phase += 0.006;
            const pulse = 0.018 + Math.sin(gi.phase + gi.x * 8) * 0.01;
            const radius = h * (0.45 + Math.sin(gi.phase * 0.5) * 0.1);

            const grad = fxCtx.createRadialGradient(gi.x * w, gi.y * h, 0, gi.x * w, gi.y * h, radius);
            grad.addColorStop(0, `rgba(${gi.r}, ${gi.g}, ${gi.b}, ${pulse.toFixed(3)})`);
            grad.addColorStop(0.4, `rgba(${gi.r}, ${gi.g}, ${gi.b}, ${(pulse * 0.5).toFixed(3)})`);
            grad.addColorStop(1, `rgba(${gi.r}, ${gi.g}, ${gi.b}, 0)`);
            fxCtx.fillStyle = grad;
            fxCtx.fillRect(0, 0, w, h);
        });
        fxCtx.restore();

        // ──── 4. CHROMATIC DISPERSION ────
        fxCtx.save();
        fxCtx.globalCompositeOperation = 'screen';
        dispersionOffset = Math.sin(frameCount * 0.005) * 2 + 2;
        // Red channel shift
        const dGradR = fxCtx.createRadialGradient(w / 2 - dispersionOffset, h / 2, h * 0.3, w / 2, h / 2, h * 0.9);
        dGradR.addColorStop(0, 'rgba(255,0,0,0)');
        dGradR.addColorStop(0.7, 'rgba(255,0,0,0)');
        dGradR.addColorStop(1, `rgba(255,0,0,${(0.012 + Math.sin(frameCount * 0.008) * 0.006).toFixed(3)})`);
        fxCtx.fillStyle = dGradR;
        fxCtx.fillRect(0, 0, w, h);

        // Blue channel shift
        const dGradB = fxCtx.createRadialGradient(w / 2 + dispersionOffset, h / 2, h * 0.3, w / 2, h / 2, h * 0.9);
        dGradB.addColorStop(0, 'rgba(0,0,255,0)');
        dGradB.addColorStop(0.7, 'rgba(0,0,255,0)');
        dGradB.addColorStop(1, `rgba(0,0,255,${(0.012 + Math.sin(frameCount * 0.008 + 1) * 0.006).toFixed(3)})`);
        fxCtx.fillStyle = dGradB;
        fxCtx.fillRect(0, 0, w, h);
        fxCtx.restore();

        // ──── 5. RADIOSITY (inter-surface color transfer) ────
        fxCtx.save();
        fxCtx.globalCompositeOperation = 'screen';
        // Animated gradient bands simulating bounced light between surfaces
        const radPhase = frameCount * 0.003;
        for (let i = 0; i < 4; i++) {
            const ry = h * (0.2 + i * 0.2 + Math.sin(radPhase + i * 1.5) * 0.05);
            const radGrad = fxCtx.createLinearGradient(0, ry - 30, 0, ry + 30);
            const radAlpha = 0.01 + Math.sin(radPhase + i * 2) * 0.005;
            const hue = (i * 60 + frameCount * 0.2) % 360;
            radGrad.addColorStop(0, `hsla(${hue}, 40%, 60%, 0)`);
            radGrad.addColorStop(0.5, `hsla(${hue}, 40%, 60%, ${Math.max(0, radAlpha).toFixed(3)})`);
            radGrad.addColorStop(1, `hsla(${hue}, 40%, 60%, 0)`);
            fxCtx.fillStyle = radGrad;
            fxCtx.fillRect(0, ry - 30, w, 60);
        }
        fxCtx.restore();

        // ──── 6. VOLUMETRIC FOG LAYERS ────
        fxCtx.save();
        fogLayers.forEach(fl => {
            fl.offset += fl.scrollSpeed;
            const fogY = fl.y * h + Math.sin(fl.offset * 10) * 10;
            const fogGrad = fxCtx.createLinearGradient(0, fogY - h * 0.08, 0, fogY + h * 0.08);
            const fogAlpha = fl.density * (0.7 + Math.sin(fl.offset * 20) * 0.3);
            fogGrad.addColorStop(0, `hsla(${fl.hue}, 30%, 20%, 0)`);
            fogGrad.addColorStop(0.3, `hsla(${fl.hue}, 30%, 25%, ${fogAlpha.toFixed(3)})`);
            fogGrad.addColorStop(0.7, `hsla(${fl.hue}, 30%, 25%, ${fogAlpha.toFixed(3)})`);
            fogGrad.addColorStop(1, `hsla(${fl.hue}, 30%, 20%, 0)`);
            fxCtx.fillStyle = fogGrad;
            fxCtx.fillRect(0, fogY - h * 0.08, w, h * 0.16);
        });
        fxCtx.restore();

        // ──── 7. FIREFLY / TRAPPED LIGHT PARTICLES ────
        fxCtx.save();
        fxCtx.globalCompositeOperation = 'screen';
        fireflies.forEach(ff => {
            ff.phase += ff.flickerSpeed;
            ff.x += ff.vx + Math.sin(ff.phase * 3) * 0.0003;
            ff.y += ff.vy + Math.cos(ff.phase * 2.5) * 0.0003;

            // Wrap around
            if (ff.x < -0.05) ff.x = 1.05;
            if (ff.x > 1.05) ff.x = -0.05;
            if (ff.y < -0.05) ff.y = 1.05;
            if (ff.y > 1.05) ff.y = -0.05;

            const brightness = (Math.sin(ff.phase) + 1) / 2 * ff.brightness;
            const alpha = brightness * 0.15;
            const ffSize = ff.radius * (1 + brightness * 0.5);

            // Glow
            const ffGrad = fxCtx.createRadialGradient(ff.x * w, ff.y * h, 0, ff.x * w, ff.y * h, ffSize * 4);
            ffGrad.addColorStop(0, `hsla(${ff.hue}, 80%, 75%, ${alpha.toFixed(3)})`);
            ffGrad.addColorStop(0.3, `hsla(${ff.hue}, 70%, 65%, ${(alpha * 0.5).toFixed(3)})`);
            ffGrad.addColorStop(1, `hsla(${ff.hue}, 60%, 55%, 0)`);
            fxCtx.fillStyle = ffGrad;
            fxCtx.beginPath();
            fxCtx.arc(ff.x * w, ff.y * h, ffSize * 4, 0, Math.PI * 2);
            fxCtx.fill();

            // Core bright point
            fxCtx.fillStyle = `hsla(${ff.hue}, 90%, 90%, ${(alpha * 1.5).toFixed(3)})`;
            fxCtx.beginPath();
            fxCtx.arc(ff.x * w, ff.y * h, ffSize * 0.5, 0, Math.PI * 2);
            fxCtx.fill();
        });
        fxCtx.restore();

        // ──── 8. DENOISER SAMPLING GRAIN (perf-optimized) ────
        if (denoiserNoise > 0.015) {
            // === PERFORMANCE: use ImageData buffer instead of individual fillRect ===
            const noiseCount = Math.floor(w * h * 0.0003 * (denoiserNoise / 0.06));
            if (!noiseImageData || noiseImageData.width !== w || noiseImageData.height !== h) {
                noiseImageData = fxCtx.createImageData(w, h);
            }
            const data = noiseImageData.data;
            // Clear only — fill is sparse so zero first
            const len = data.length;
            for (let j = 0; j < len; j++) data[j] = 0;
            const alphaVal = Math.round(denoiserNoise * 255);
            for (let i = 0; i < noiseCount; i++) {
                const nx = (Math.random() * w) | 0;
                const ny = (Math.random() * h) | 0;
                const gray = (Math.random() * 80 + 20) | 0;
                const idx = (ny * w + nx) * 4;
                data[idx] = gray; data[idx + 1] = gray; data[idx + 2] = gray; data[idx + 3] = alphaVal;
            }
            fxCtx.putImageData(noiseImageData, 0, 0);
        }

        // ──── 9. LENS EFFECTS (Anamorphic Flares + Barrel Distortion Edge) ────
        fxCtx.save();
        fxCtx.globalCompositeOperation = 'screen';
        lensFlares.forEach(lf => {
            const lfx = lf.x * w;
            const lfy = lf.y * h;
            const pulse = (Math.sin(frameCount * 0.01 + lf.x * 5) + 1) / 2;
            const lfAlpha = lf.intensity * pulse;

            // Circular flare
            const lfGrad = fxCtx.createRadialGradient(lfx, lfy, 0, lfx, lfy, lf.size);
            lfGrad.addColorStop(0, `hsla(${lf.hue}, 60%, 80%, ${lfAlpha.toFixed(3)})`);
            lfGrad.addColorStop(0.5, `hsla(${lf.hue}, 50%, 70%, ${(lfAlpha * 0.3).toFixed(3)})`);
            lfGrad.addColorStop(1, `hsla(${lf.hue}, 40%, 60%, 0)`);
            fxCtx.fillStyle = lfGrad;
            fxCtx.beginPath();
            fxCtx.arc(lfx, lfy, lf.size, 0, Math.PI * 2);
            fxCtx.fill();

            // Horizontal anamorphic stretch
            const stretchGrad = fxCtx.createLinearGradient(
                lfx - lf.size * lf.anamorphicStretch, lfy,
                lfx + lf.size * lf.anamorphicStretch, lfy
            );
            stretchGrad.addColorStop(0, `hsla(${lf.hue}, 50%, 70%, 0)`);
            stretchGrad.addColorStop(0.35, `hsla(${lf.hue}, 60%, 80%, ${(lfAlpha * 0.2).toFixed(3)})`);
            stretchGrad.addColorStop(0.65, `hsla(${lf.hue}, 60%, 80%, ${(lfAlpha * 0.2).toFixed(3)})`);
            stretchGrad.addColorStop(1, `hsla(${lf.hue}, 50%, 70%, 0)`);
            fxCtx.fillStyle = stretchGrad;
            fxCtx.fillRect(
                lfx - lf.size * lf.anamorphicStretch, lfy - 1.5,
                lf.size * lf.anamorphicStretch * 2, 3
            );
        });
        fxCtx.restore();

        // ──── 10. SOFT SHADOW VIGNETTE ────
        const shadowGrad = fxCtx.createRadialGradient(w / 2, h / 2, h * 0.15, w / 2, h / 2, h * 0.95);
        shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        shadowGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
        shadowGrad.addColorStop(0.8, `rgba(0, 0, 0, ${(0.05 + Math.sin(frameCount * 0.004) * 0.02).toFixed(3)})`);
        shadowGrad.addColorStop(1, `rgba(0, 0, 0, ${(0.1 + Math.sin(frameCount * 0.004) * 0.03).toFixed(3)})`);
        fxCtx.fillStyle = shadowGrad;
        fxCtx.fillRect(0, 0, w, h);

        // ──── 11. SUBSURFACE SCATTERING ────
        fxCtx.save();
        fxCtx.globalCompositeOperation = 'screen';
        sssPts.forEach(sss => {
            sss.phase += 0.008;
            const sx = sss.x * w + Math.sin(sss.phase) * 20;
            const sy = sss.y * h + Math.cos(sss.phase * 0.7) * 15;
            const pulse = (Math.sin(sss.phase * 1.5) + 1) / 2;
            const alpha = 0.012 + pulse * 0.01;
            const grad = fxCtx.createRadialGradient(sx, sy, 0, sx, sy, sss.radius);
            grad.addColorStop(0, `hsla(${sss.hue}, 80%, 70%, ${alpha.toFixed(3)})`);
            grad.addColorStop(0.4, `hsla(${sss.hue}, 70%, 60%, ${(alpha * 0.4).toFixed(3)})`);
            grad.addColorStop(1, `hsla(${sss.hue}, 60%, 50%, 0)`);
            fxCtx.fillStyle = grad;
            fxCtx.beginPath();
            fxCtx.arc(sx, sy, sss.radius, 0, Math.PI * 2);
            fxCtx.fill();
        });
        fxCtx.restore();

        // ──── 12. SPECTRAL AURORA (perf-optimized step size) ────
        fxCtx.save();
        fxCtx.globalCompositeOperation = 'screen';
        const auroraStep = isMobile ? 12 : 4;
        auroraWaves.forEach(aw => {
            aw.phase += aw.speed;
            const ay = aw.y * h;
            for (let x = 0; x < w; x += auroraStep) {
                const waveY = ay + Math.sin(aw.phase * 10 + x * 0.005) * aw.amplitude * h;
                const alpha = 0.01 + Math.sin(aw.phase + x * 0.003) * 0.006;
                if (alpha > 0) {
                    fxCtx.fillStyle = `hsla(${aw.hue + Math.sin(x * 0.01) * 30}, 70%, 60%, ${Math.max(0, alpha).toFixed(4)})`;
                    fxCtx.fillRect(x, waveY, auroraStep, h * 0.04);
                }
            }
        });
        fxCtx.restore();

        // ──── 13. PRISMATIC EDGE DISPERSION ────
        fxCtx.save();
        fxCtx.globalCompositeOperation = 'screen';
        const prismSize = Math.min(w, h) * 0.15;
        prismCorners.forEach(pc => {
            let px, py;
            if (pc.corner === 'tl') { px = 0; py = 0; }
            else if (pc.corner === 'tr') { px = w; py = 0; }
            else if (pc.corner === 'bl') { px = 0; py = h; }
            else { px = w; py = h; }
            const pulse = (Math.sin(frameCount * 0.006 + px * 0.001) + 1) / 2;
            const alpha = 0.008 + pulse * 0.008;
            for (let i = 0; i < 3; i++) {
                const hue = [0, 120, 240][i];
                const offset = (i - 1) * 3;
                const grad = fxCtx.createRadialGradient(px + offset, py + offset, 0, px, py, prismSize);
                grad.addColorStop(0, `hsla(${hue}, 80%, 60%, ${alpha.toFixed(4)})`);
                grad.addColorStop(0.5, `hsla(${hue}, 70%, 50%, ${(alpha * 0.3).toFixed(4)})`);
                grad.addColorStop(1, `hsla(${hue}, 60%, 40%, 0)`);
                fxCtx.fillStyle = grad;
                fxCtx.fillRect(Math.min(px, px - prismSize), Math.min(py, py - prismSize), prismSize, prismSize);
            }
        });
        fxCtx.restore();

        // ──── 14. LIGHT PAINTING TRAILS ────
        fxCtx.save();
        fxCtx.globalCompositeOperation = 'screen';
        lightPaintTrails.forEach(lpt => {
            lpt.phase += lpt.speed;
            const cx = w * 0.5 + Math.sin(lpt.phase * 2.3) * lpt.radius * w;
            const cy = h * 0.5 + Math.cos(lpt.phase * 1.7) * lpt.radius * h;
            lpt.points.push({ x: cx, y: cy });
            if (lpt.points.length > 40) lpt.points.shift();
            if (lpt.points.length > 2) {
                fxCtx.strokeStyle = `hsla(${lpt.hue}, 70%, 65%, 0.015)`;
                fxCtx.lineWidth = 1.5;
                fxCtx.beginPath();
                fxCtx.moveTo(lpt.points[0].x, lpt.points[0].y);
                for (let i = 1; i < lpt.points.length; i++) {
                    fxCtx.lineTo(lpt.points[i].x, lpt.points[i].y);
                }
                fxCtx.stroke();
            }
        });
        fxCtx.restore();

        // ──── 15. MICRO-REFLECTIONS ────
        fxCtx.save();
        fxCtx.globalCompositeOperation = 'screen';
        microSparkles.forEach(ms => {
            ms.phase += ms.speed;
            const brightness = Math.max(0, Math.sin(ms.phase));
            if (brightness > 0.7) {
                const alpha = (brightness - 0.7) * 0.15;
                fxCtx.fillStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
                fxCtx.beginPath();
                fxCtx.arc(ms.x * w, ms.y * h, ms.size, 0, Math.PI * 2);
                fxCtx.fill();
            }
        });
        fxCtx.restore();

        // ──── 16. SHADOW PENUMBRA SOFT EDGES ────
        fxCtx.save();
        const penAlpha = 0.04 + Math.sin(frameCount * 0.003) * 0.015;
        penumbraEdges.forEach(pe => {
            let grad;
            if (pe.side === 'left') { grad = fxCtx.createLinearGradient(0, 0, w * 0.08, 0); }
            else if (pe.side === 'right') { grad = fxCtx.createLinearGradient(w, 0, w * 0.92, 0); }
            else if (pe.side === 'top') { grad = fxCtx.createLinearGradient(0, 0, 0, h * 0.06); }
            else { grad = fxCtx.createLinearGradient(0, h, 0, h * 0.94); }
            grad.addColorStop(0, `rgba(10,5,20,${penAlpha.toFixed(3)})`);
            grad.addColorStop(1, 'rgba(10,5,20,0)');
            fxCtx.fillStyle = grad;
            if (pe.side === 'left') fxCtx.fillRect(0, 0, w * 0.08, h);
            else if (pe.side === 'right') fxCtx.fillRect(w * 0.92, 0, w * 0.08, h);
            else if (pe.side === 'top') fxCtx.fillRect(0, 0, w, h * 0.06);
            else fxCtx.fillRect(0, h * 0.94, w, h * 0.06);
        });
        fxCtx.restore();

        // ──── 17. TEMPORAL ACCUMULATION NOISE ────
        if (convergenceTimer < 20) {
            fxCtx.save();
            const tNoiseAlpha = Math.max(0.002, 0.02 - convergenceTimer * 0.001);
            fxCtx.globalAlpha = tNoiseAlpha;
            const noiseCount = Math.floor(w * h * 0.00008);
            for (let i = 0; i < noiseCount; i++) {
                const nx = Math.random() * w;
                const ny = Math.random() * h;
                const hue = Math.random() * 60 + 20;
                fxCtx.fillStyle = `hsla(${hue}, 30%, ${40 + Math.random() * 30}%, 1)`;
                fxCtx.fillRect(nx, ny, 1, 1);
            }
            fxCtx.restore();
        }

        // ──── 18. EMISSIVE SURFACE BLOOMS ────
        fxCtx.save();
        fxCtx.globalCompositeOperation = 'screen';
        emissiveBlooms.forEach(eb => {
            eb.phase += eb.speed;
            const pulse = Math.max(0, Math.sin(eb.phase));
            if (pulse > 0.3) {
                const alpha = (pulse - 0.3) * 0.02;
                const ex = eb.x * w + Math.sin(eb.phase * 2) * 15;
                const ey = eb.y * h + Math.cos(eb.phase * 1.5) * 10;
                const grad = fxCtx.createRadialGradient(ex, ey, 0, ex, ey, eb.radius * pulse);
                grad.addColorStop(0, `hsla(${eb.hue}, 80%, 75%, ${alpha.toFixed(3)})`);
                grad.addColorStop(0.4, `hsla(${eb.hue}, 70%, 65%, ${(alpha * 0.4).toFixed(3)})`);
                grad.addColorStop(1, `hsla(${eb.hue}, 60%, 55%, 0)`);
                fxCtx.fillStyle = grad;
                fxCtx.beginPath();
                fxCtx.arc(ex, ey, eb.radius * pulse, 0, Math.PI * 2);
                fxCtx.fill();
            }
        });
        fxCtx.restore();
    }

    /* ============ PERFORMANCE MODE API ============ */
    function setPerformanceMode(mode) {
        // mode: 'full' | 'reduced' | 'minimal'
        perfMode = mode;
    }

    function setOpacity(val) {
        fxOpacity = Math.max(0, Math.min(1, val));
        if (fxCanvas) fxCanvas.style.opacity = fxOpacity;
    }

    function getSettings() {
        return {
            perfMode: perfMode,
            opacity: fxOpacity,
            toggles: Object.assign({}, effectToggles)
        };
    }

    function setSettings(obj) {
        if (obj.perfMode) perfMode = obj.perfMode;
        if (typeof obj.opacity === 'number') setOpacity(obj.opacity);
        if (obj.toggles) {
            for (var k in obj.toggles) {
                if (k in effectToggles) effectToggles[k] = !!obj.toggles[k];
            }
        }
    }

    function toggleEffect(name, on) {
        if (name in effectToggles) effectToggles[name] = on;
    }

    /* ============ CLEANUP ============ */
    function destroy() {
        running = false;
        if (fxCanvas && fxCanvas.parentNode) fxCanvas.parentNode.removeChild(fxCanvas);
        if (hudEl && hudEl.parentNode) hudEl.parentNode.removeChild(hudEl);
    }

    /* ============ AUTO INIT ============ */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    return { init, destroy, getTier, isRT, isPT, setPerformanceMode, setOpacity, getSettings, setSettings, toggleEffect, isMobile };
})();

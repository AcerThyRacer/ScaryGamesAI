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
    let lightAngle = 0;
    let denoiserNoise = 0.06; // starts noisy, converges
    let dispersionOffset = 0;
    let convergenceTimer = 0;

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
        fxCanvas.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:50;';
        document.body.appendChild(fxCanvas);
        fxCtx = fxCanvas.getContext('2d');

        // === Populate ray data (48 rays for RT) ===
        for (let i = 0; i < 48; i++) {
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

        // === Photon particles (120 for PT) ===
        for (let i = 0; i < 120; i++) {
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

        // === Caustic points (50 for PT) ===
        for (let i = 0; i < 50; i++) {
            causticPts.push({
                x: Math.random(), y: Math.random(),
                phase: Math.random() * Math.PI * 2,
                speed: 0.008 + Math.random() * 0.025,
                radius: 10 + Math.random() * 40,
                waveFreq: 2 + Math.random() * 5,
                refraction: Math.random() * 0.3,
            });
        }

        // === Fireflies (PT only) ===
        for (let i = 0; i < 35; i++) {
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
        for (let i = 0; i < 40; i++) {
            rainStreaks.push({
                x: Math.random(),
                y: Math.random(),
                length: 0.02 + Math.random() * 0.04,
                speed: 0.008 + Math.random() * 0.012,
                opacity: 0.015 + Math.random() * 0.025,
                width: 0.5 + Math.random(),
            });
        }

        // Inject HUD
        injectQualityHUD();

        // Start render loop
        running = true;
        convergenceTimer = 0;
        requestAnimationFrame(renderLoop);
    }

    /* ============ QUALITY HUD ============ */
    function injectQualityHUD() {
        const t = getTier();

        hudEl = document.createElement('div');
        hudEl.className = 'qfx-hud';

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
                    <span class="qfx-stat">Dispersion</span>
                </div>`;
        } else {
            hudEl.classList.add('qfx-standard');
            hudEl.innerHTML = `
                <div class="qfx-hud-main">
                    <span class="qfx-icon">🎮</span>
                    <span class="qfx-label">Standard Quality</span>
                </div>`;
        }

        document.body.appendChild(hudEl);

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
                pointer-events: none;
                backdrop-filter: blur(12px);
                -webkit-backdrop-filter: blur(12px);
                animation: qfxSlideIn 0.6s cubic-bezier(0.16,1,0.3,1);
                transition: all 0.4s ease;
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
                gap: 8px;
                margin-top: 4px;
                font-size: 0.6rem;
                opacity: 0.7;
                font-weight: 500;
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
        `;
        document.head.appendChild(style);
    }

    /* ============ RENDER LOOP ============ */
    function renderLoop() {
        if (!running) return;
        frameCount++;

        const w = fxCanvas.width = window.innerWidth;
        const h = fxCanvas.height = window.innerHeight;
        fxCtx.clearRect(0, 0, w, h);

        if (isRT()) drawRayTracing(w, h);
        if (isPT()) drawPathTracing(w, h);

        requestAnimationFrame(renderLoop);
    }

    /* ============================================
       RAY TRACING SIMULATION (Pro + Max)
       ============================================ */
    function drawRayTracing(w, h) {
        lightAngle += 0.002;

        // ──── 1. VOLUMETRIC GOD RAYS (48 rays with dynamic scatter) ────
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

        // ──── 2. SCREEN-SPACE REFLECTIONS (SSR) ────
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

        // ──── 3. CONTACT SHADOW SIMULATION ────
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

        // ──── 4. SPECULAR HIGHLIGHT NETWORK ────
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

        // ──── 5. DYNAMIC AMBIENT OCCLUSION ────
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

        // ──── 6. LIGHT SHAFTS ────
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

        // ──── 7. RAIN / MOISTURE STREAKS ────
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

        // ──── 8. DENOISER SAMPLING GRAIN ────
        if (denoiserNoise > 0.015) {
            fxCtx.save();
            fxCtx.globalAlpha = denoiserNoise;
            // Draw sparse noise pixels
            const noiseCount = Math.floor(w * h * 0.0003 * (denoiserNoise / 0.06));
            for (let i = 0; i < noiseCount; i++) {
                const nx = Math.random() * w;
                const ny = Math.random() * h;
                const gray = Math.random() * 80 + 20;
                fxCtx.fillStyle = `rgb(${gray},${gray},${gray})`;
                fxCtx.fillRect(nx, ny, 1.5, 1.5);
            }
            fxCtx.restore();
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

    return { init, destroy, getTier, isRT, isPT };
})();

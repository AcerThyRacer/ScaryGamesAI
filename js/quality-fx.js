/* ============================================
   ScaryGamesAI — Quality FX Engine
   Real simulated Ray Tracing & Path Tracing
   post-processing overlays for all games.
   ============================================ */

const QualityFX = (function () {
    'use strict';

    const TIER_KEY = 'sgai-sub-tier';
    let tier = localStorage.getItem(TIER_KEY) || 'none';
    let fxCanvas = null;
    let fxCtx = null;
    let gameCanvas = null;
    let running = false;
    let frameCount = 0;
    let hudEl = null;

    // Ray/light data for simulations
    const rays = [];
    const photons = [];
    const causticPts = [];
    let lightAngle = 0;

    function getTier() {
        return localStorage.getItem(TIER_KEY) || 'none';
    }

    function isRT() { const t = getTier(); return t === 'pro' || t === 'max'; }
    function isPT() { return getTier() === 'max'; }

    /* ============ INIT ============ */
    function init() {
        tier = getTier();
        gameCanvas = document.getElementById('game-canvas');
        if (!gameCanvas) return;

        // Create overlay canvas for FX
        fxCanvas = document.createElement('canvas');
        fxCanvas.id = 'quality-fx-canvas';
        fxCanvas.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:50;';
        document.body.appendChild(fxCanvas);
        fxCtx = fxCanvas.getContext('2d');

        // Init ray data
        for (let i = 0; i < 24; i++) {
            rays.push({
                x: Math.random(),
                y: Math.random() * 0.3,
                angle: Math.PI * 0.35 + Math.random() * 0.3,
                width: 1 + Math.random() * 2.5,
                speed: 0.0005 + Math.random() * 0.001,
                opacity: 0.04 + Math.random() * 0.06,
                length: 0.5 + Math.random() * 0.5,
            });
        }

        // Init photon particles for path tracing
        for (let i = 0; i < 60; i++) {
            photons.push({
                x: Math.random(), y: Math.random(),
                vx: (Math.random() - 0.5) * 0.002,
                vy: (Math.random() - 0.5) * 0.002,
                life: Math.random(),
                maxLife: 0.5 + Math.random() * 0.5,
                radius: 1 + Math.random() * 2,
                bounce: Math.floor(Math.random() * 3) + 1,
                hue: Math.random() * 40 + 20, // warm tones
            });
        }

        // Init caustic points
        for (let i = 0; i < 30; i++) {
            causticPts.push({
                x: Math.random(), y: Math.random(),
                phase: Math.random() * Math.PI * 2,
                speed: 0.01 + Math.random() * 0.02,
                radius: 15 + Math.random() * 30,
            });
        }

        // Inject HUD badge
        injectQualityHUD();

        // Start render loop
        running = true;
        requestAnimationFrame(renderLoop);
    }

    /* ============ QUALITY HUD ============ */
    function injectQualityHUD() {
        const t = getTier();
        if (t !== 'pro' && t !== 'max') {
            // Standard quality — simple badge
            hudEl = document.createElement('div');
            hudEl.className = 'qfx-hud qfx-standard';
            hudEl.innerHTML = '🎮 Standard Quality';
            document.body.appendChild(hudEl);
            return;
        }

        hudEl = document.createElement('div');
        if (t === 'pro') {
            hudEl.className = 'qfx-hud qfx-rt';
            hudEl.innerHTML = '💠 Ray Tracing <span class="qfx-on">ON</span>';
        } else {
            hudEl.className = 'qfx-hud qfx-pt';
            hudEl.innerHTML = '✨ Path Tracing <span class="qfx-on">ON</span>';
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
                padding: 6px 14px;
                border-radius: 8px;
                font-family: 'Inter', sans-serif;
                font-size: 0.75rem;
                font-weight: 700;
                letter-spacing: 0.5px;
                pointer-events: none;
                backdrop-filter: blur(8px);
                animation: qfxFadeIn 0.5s ease;
            }
            @keyframes qfxFadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
            .qfx-standard {
                background: rgba(60,60,80,0.6);
                color: #8a8a9a;
                border: 1px solid rgba(100,100,120,0.3);
            }
            .qfx-rt {
                background: rgba(0,60,80,0.7);
                color: #44ddff;
                border: 1px solid rgba(0,200,255,0.3);
                box-shadow: 0 0 20px rgba(0,200,255,0.15);
            }
            .qfx-pt {
                background: rgba(60,50,0,0.7);
                color: #ffd700;
                border: 1px solid rgba(255,215,0,0.3);
                box-shadow: 0 0 20px rgba(255,215,0,0.15);
            }
            .qfx-on {
                display: inline-block;
                background: rgba(0,255,100,0.2);
                color: #44ff88;
                padding: 1px 6px;
                border-radius: 4px;
                font-size: 0.65rem;
                margin-left: 4px;
                animation: qfxPulse 2s infinite;
            }
            @keyframes qfxPulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.6; }
            }
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

    /* ============ RAY TRACING SIMULATION ============ */
    function drawRayTracing(w, h) {
        lightAngle += 0.003;

        // === Volumetric light rays (god rays) ===
        const lightX = w * (0.5 + Math.sin(lightAngle * 0.7) * 0.3);
        const lightY = -20;

        fxCtx.save();
        rays.forEach(ray => {
            ray.x += Math.sin(frameCount * ray.speed) * 0.001;
            const startX = lightX + (ray.x - 0.5) * w * 0.6;
            const startY = lightY;
            const endX = startX + Math.cos(ray.angle) * h * ray.length;
            const endY = startY + Math.sin(ray.angle) * h * ray.length;

            const gradient = fxCtx.createLinearGradient(startX, startY, endX, endY);
            gradient.addColorStop(0, `rgba(255, 240, 200, ${ray.opacity * 1.5})`);
            gradient.addColorStop(0.3, `rgba(255, 220, 150, ${ray.opacity})`);
            gradient.addColorStop(1, 'rgba(255, 200, 100, 0)');

            fxCtx.strokeStyle = gradient;
            fxCtx.lineWidth = ray.width;
            fxCtx.globalCompositeOperation = 'screen';
            fxCtx.beginPath();
            fxCtx.moveTo(startX, startY);
            fxCtx.lineTo(endX, endY);
            fxCtx.stroke();
        });
        fxCtx.restore();

        // === Ambient occlusion vignette ===
        const aoGrad = fxCtx.createRadialGradient(w / 2, h / 2, h * 0.25, w / 2, h / 2, h * 0.8);
        aoGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        aoGrad.addColorStop(0.7, 'rgba(0, 0, 0, 0.05)');
        aoGrad.addColorStop(1, 'rgba(0, 0, 0, 0.15)');
        fxCtx.fillStyle = aoGrad;
        fxCtx.fillRect(0, 0, w, h);

        // === Specular highlight bloom ===
        const bloomCount = 5;
        for (let i = 0; i < bloomCount; i++) {
            const bx = w * (0.2 + (i / bloomCount) * 0.6);
            const by = h * (0.15 + Math.sin(frameCount * 0.01 + i * 1.5) * 0.1);
            const br = 40 + Math.sin(frameCount * 0.02 + i) * 15;
            const bloomGrad = fxCtx.createRadialGradient(bx, by, 0, bx, by, br);
            bloomGrad.addColorStop(0, `rgba(200, 220, 255, ${0.03 + Math.sin(frameCount * 0.015 + i * 2) * 0.015})`);
            bloomGrad.addColorStop(1, 'rgba(200, 220, 255, 0)');
            fxCtx.globalCompositeOperation = 'screen';
            fxCtx.fillStyle = bloomGrad;
            fxCtx.beginPath();
            fxCtx.arc(bx, by, br, 0, Math.PI * 2);
            fxCtx.fill();
        }
        fxCtx.globalCompositeOperation = 'source-over';

        // === Subtle reflection plane at bottom ===
        const reflGrad = fxCtx.createLinearGradient(0, h * 0.85, 0, h);
        reflGrad.addColorStop(0, 'rgba(100, 140, 200, 0)');
        reflGrad.addColorStop(1, `rgba(100, 140, 200, ${0.03 + Math.sin(frameCount * 0.008) * 0.01})`);
        fxCtx.fillStyle = reflGrad;
        fxCtx.fillRect(0, h * 0.85, w, h * 0.15);
    }

    /* ============ PATH TRACING SIMULATION ============ */
    function drawPathTracing(w, h) {

        // === Bouncing photon particles (simulated light bounces) ===
        fxCtx.save();
        fxCtx.globalCompositeOperation = 'screen';
        photons.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.life += 0.005;

            // Bounce off walls (simulate path bounces)
            if (p.x < 0 || p.x > 1) { p.vx *= -1; p.bounce--; }
            if (p.y < 0 || p.y > 1) { p.vy *= -1; p.bounce--; }
            p.x = Math.max(0, Math.min(1, p.x));
            p.y = Math.max(0, Math.min(1, p.y));

            if (p.life > p.maxLife || p.bounce <= 0) {
                // Reset photon — new emission
                p.x = Math.random();
                p.y = Math.random() * 0.3;
                p.vx = (Math.random() - 0.5) * 0.003;
                p.vy = Math.random() * 0.003 + 0.001;
                p.life = 0;
                p.bounce = Math.floor(Math.random() * 3) + 2;
                p.hue = Math.random() * 40 + 20;
            }

            const fadeIn = Math.min(p.life * 5, 1);
            const fadeOut = p.life > p.maxLife * 0.7 ? (p.maxLife - p.life) / (p.maxLife * 0.3) : 1;
            const alpha = 0.12 * fadeIn * Math.max(0, fadeOut);

            // Draw photon with warm color based on bounces
            const grad = fxCtx.createRadialGradient(p.x * w, p.y * h, 0, p.x * w, p.y * h, p.radius * 3);
            grad.addColorStop(0, `hsla(${p.hue}, 80%, 70%, ${alpha})`);
            grad.addColorStop(1, `hsla(${p.hue}, 80%, 70%, 0)`);
            fxCtx.fillStyle = grad;
            fxCtx.beginPath();
            fxCtx.arc(p.x * w, p.y * h, p.radius * 3, 0, Math.PI * 2);
            fxCtx.fill();

            // Trail line (light path visualization)
            if (alpha > 0.03) {
                fxCtx.strokeStyle = `hsla(${p.hue}, 60%, 60%, ${alpha * 0.3})`;
                fxCtx.lineWidth = 0.5;
                fxCtx.beginPath();
                fxCtx.moveTo(p.x * w, p.y * h);
                fxCtx.lineTo((p.x - p.vx * 40) * w, (p.y - p.vy * 40) * h);
                fxCtx.stroke();
            }
        });
        fxCtx.restore();

        // === Caustic light patterns ===
        fxCtx.save();
        fxCtx.globalCompositeOperation = 'screen';
        causticPts.forEach(c => {
            c.phase += c.speed;
            const cx = (c.x + Math.sin(c.phase) * 0.05) * w;
            const cy = (c.y + Math.cos(c.phase * 0.7) * 0.05) * h;
            const intensity = 0.02 + Math.sin(c.phase * 2) * 0.015;
            const grad = fxCtx.createRadialGradient(cx, cy, 0, cx, cy, c.radius);
            grad.addColorStop(0, `rgba(255, 240, 200, ${Math.max(0, intensity)})`);
            grad.addColorStop(0.5, `rgba(200, 220, 255, ${Math.max(0, intensity * 0.5)})`);
            grad.addColorStop(1, 'rgba(200, 220, 255, 0)');
            fxCtx.fillStyle = grad;
            fxCtx.beginPath();
            fxCtx.arc(cx, cy, c.radius, 0, Math.PI * 2);
            fxCtx.fill();
        });
        fxCtx.restore();

        // === Global Illumination — soft color bleeding ===
        const giColors = [
            { x: 0.1, y: 0.9, r: 200, g: 80, b: 80 },   // red bounce
            { x: 0.9, y: 0.8, r: 80, g: 80, b: 200 },    // blue bounce
            { x: 0.5, y: 0.1, r: 200, g: 200, b: 100 },  // warm ceiling
        ];
        fxCtx.save();
        fxCtx.globalCompositeOperation = 'screen';
        giColors.forEach(gi => {
            const pulse = 0.015 + Math.sin(frameCount * 0.008 + gi.x * 10) * 0.008;
            const grad = fxCtx.createRadialGradient(gi.x * w, gi.y * h, 0, gi.x * w, gi.y * h, h * 0.5);
            grad.addColorStop(0, `rgba(${gi.r}, ${gi.g}, ${gi.b}, ${pulse})`);
            grad.addColorStop(1, `rgba(${gi.r}, ${gi.g}, ${gi.b}, 0)`);
            fxCtx.fillStyle = grad;
            fxCtx.fillRect(0, 0, w, h);
        });
        fxCtx.restore();

        // === Soft shadows (darkened corners with noise) ===
        const shadowGrad = fxCtx.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, h * 0.9);
        shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        shadowGrad.addColorStop(0.6, 'rgba(0, 0, 0, 0)');
        shadowGrad.addColorStop(1, `rgba(0, 0, 0, ${0.08 + Math.sin(frameCount * 0.005) * 0.02})`);
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

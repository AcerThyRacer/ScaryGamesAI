/* ============================================
   ScaryGamesAI — Visual Utils v1.0
   Shared cinematic utility functions for
   canvas-based post-processing overlays.
   ============================================ */

const VisualUtils = (function () {
    'use strict';

    /**
     * Draw a circular vignette overlay.
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} w - width
     * @param {number} h - height
     * @param {number} intensity - 0..1, default 0.4
     */
    function drawVignette(ctx, w, h, intensity = 0.4) {
        const cx = w / 2, cy = h / 2;
        const radius = Math.sqrt(cx * cx + cy * cy);
        const grad = ctx.createRadialGradient(cx, cy, radius * 0.25, cx, cy, radius);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(0.5, 'rgba(0,0,0,0)');
        grad.addColorStop(0.8, `rgba(0,0,0,${(intensity * 0.5).toFixed(3)})`);
        grad.addColorStop(1, `rgba(0,0,0,${intensity.toFixed(3)})`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
    }

    /**
     * Draw CRT-style scanlines.
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} w - width
     * @param {number} h - height
     * @param {number} opacity - 0..1, default 0.04
     */
    function drawScanlines(ctx, w, h, opacity = 0.04) {
        ctx.save();
        ctx.fillStyle = `rgba(0,0,0,${opacity})`;
        for (let y = 0; y < h; y += 4) {
            ctx.fillRect(0, y, w, 1);
        }
        ctx.restore();
    }

    /**
     * Draw film grain noise.
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} w - width
     * @param {number} h - height
     * @param {number} amount - grain density 0..1, default 0.03
     */
    function drawFilmGrain(ctx, w, h, amount = 0.03) {
        ctx.save();
        ctx.globalAlpha = amount;
        const count = Math.floor(w * h * 0.0005);
        for (let i = 0; i < count; i++) {
            const x = Math.random() * w;
            const y = Math.random() * h;
            const gray = Math.random() * 100 + 30;
            ctx.fillStyle = `rgb(${gray},${gray},${gray})`;
            ctx.fillRect(x, y, 1, 1);
        }
        ctx.restore();
    }

    /**
     * Draw chromatic aberration (color fringing at edges).
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} w - width
     * @param {number} h - height
     * @param {number} amount - shift intensity, default 0.015
     */
    function drawChromaticAberration(ctx, w, h, amount = 0.015) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        const shift = Math.sin(Date.now() * 0.003) * 2 + 2;
        // Red channel
        const rGrad = ctx.createRadialGradient(w / 2 - shift, h / 2, h * 0.3, w / 2, h / 2, h * 0.9);
        rGrad.addColorStop(0, 'rgba(255,0,0,0)');
        rGrad.addColorStop(0.7, 'rgba(255,0,0,0)');
        rGrad.addColorStop(1, `rgba(255,0,0,${amount})`);
        ctx.fillStyle = rGrad;
        ctx.fillRect(0, 0, w, h);
        // Blue channel
        const bGrad = ctx.createRadialGradient(w / 2 + shift, h / 2, h * 0.3, w / 2, h / 2, h * 0.9);
        bGrad.addColorStop(0, 'rgba(0,0,255,0)');
        bGrad.addColorStop(0.7, 'rgba(0,0,255,0)');
        bGrad.addColorStop(1, `rgba(0,0,255,${amount})`);
        ctx.fillStyle = bGrad;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
    }

    /**
     * Draw cinematic letterbox bars (horizontal black bars).
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} w - width
     * @param {number} h - height
     * @param {number} ratio - bar height ratio 0..0.15, default 0.06
     */
    function drawLetterbox(ctx, w, h, ratio = 0.06) {
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.9)';
        const barH = h * ratio;
        ctx.fillRect(0, 0, w, barH);
        ctx.fillRect(0, h - barH, w, barH);
        ctx.restore();
    }

    /**
     * Draw blood splatter effect on edges.
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} w - width
     * @param {number} h - height
     */
    let bloodSplatters = null;
    function drawBloodSplatter(ctx, w, h) {
        if (!bloodSplatters) {
            bloodSplatters = [];
            for (let i = 0; i < 8; i++) {
                bloodSplatters.push({
                    x: Math.random() < 0.5 ? Math.random() * 0.15 : 0.85 + Math.random() * 0.15,
                    y: Math.random(),
                    size: 30 + Math.random() * 60,
                    opacity: 0.08 + Math.random() * 0.12,
                    drip: 0.05 + Math.random() * 0.1,
                });
            }
        }
        ctx.save();
        bloodSplatters.forEach(bs => {
            const bx = bs.x * w, by = bs.y * h;
            // Splat
            const grad = ctx.createRadialGradient(bx, by, 0, bx, by, bs.size);
            grad.addColorStop(0, `rgba(120,0,0,${bs.opacity.toFixed(3)})`);
            grad.addColorStop(0.6, `rgba(80,0,0,${(bs.opacity * 0.4).toFixed(3)})`);
            grad.addColorStop(1, 'rgba(60,0,0,0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(bx, by, bs.size, 0, Math.PI * 2);
            ctx.fill();
            // Drip
            const dripGrad = ctx.createLinearGradient(bx, by, bx, by + bs.drip * h);
            dripGrad.addColorStop(0, `rgba(100,0,0,${(bs.opacity * 0.5).toFixed(3)})`);
            dripGrad.addColorStop(1, 'rgba(80,0,0,0)');
            ctx.fillStyle = dripGrad;
            ctx.fillRect(bx - 2, by, 4, bs.drip * h);
        });
        ctx.restore();
    }

    /**
     * Draw heartbeat pulse (red vignette that pulses).
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} w - width
     * @param {number} h - height
     * @param {number} bpm - beats per minute, default 72
     */
    function drawHeartbeatPulse(ctx, w, h, bpm = 72) {
        const t = Date.now() * 0.001;
        const beatFreq = bpm / 60;
        const phase = (t * beatFreq * Math.PI * 2) % (Math.PI * 2);
        // Double-beat pattern
        const beat1 = Math.max(0, Math.sin(phase) * 0.8);
        const beat2 = Math.max(0, Math.sin(phase * 2 + 0.8) * 0.4);
        const intensity = (beat1 + beat2) * 0.06;

        if (intensity > 0.005) {
            ctx.save();
            const grad = ctx.createRadialGradient(w / 2, h / 2, h * 0.25, w / 2, h / 2, h * 0.9);
            grad.addColorStop(0, 'rgba(0,0,0,0)');
            grad.addColorStop(0.5, 'rgba(0,0,0,0)');
            grad.addColorStop(0.8, `rgba(80,0,0,${intensity.toFixed(4)})`);
            grad.addColorStop(1, `rgba(120,0,0,${(intensity * 1.8).toFixed(4)})`);
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);
            ctx.restore();
        }
    }

    /**
     * Draw flashlight cone effect.
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} w - width
     * @param {number} h - height
     * @param {number} fx - flashlight x (0..1), default center
     * @param {number} fy - flashlight y (0..1), default center
     * @param {number} radius - cone radius in px, default 200
     */
    function drawFlashlight(ctx, w, h, fx = 0.5, fy = 0.5, radius = 200) {
        ctx.save();
        const lx = fx * w, ly = fy * h;
        // Dark overlay with flashlight cutout
        const grad = ctx.createRadialGradient(lx, ly, radius * 0.3, lx, ly, radius);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(0.6, 'rgba(0,0,0,0.1)');
        grad.addColorStop(0.8, 'rgba(0,0,0,0.4)');
        grad.addColorStop(1, 'rgba(0,0,0,0.7)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Warm light glow
        ctx.globalCompositeOperation = 'screen';
        const glowGrad = ctx.createRadialGradient(lx, ly, 0, lx, ly, radius * 0.5);
        glowGrad.addColorStop(0, 'rgba(255,240,200,0.03)');
        glowGrad.addColorStop(1, 'rgba(255,230,180,0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(lx, ly, radius * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    /**
     * Draw a scrolling fog layer.
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} w - width
     * @param {number} h - height
     * @param {number} density - 0..1, default 0.03
     * @param {number} speed - scroll speed, default 0.5
     */
    let fogOffset = 0;
    function drawFogLayer(ctx, w, h, density = 0.03, speed = 0.5) {
        fogOffset += speed * 0.01;
        ctx.save();
        for (let i = 0; i < 3; i++) {
            const fogY = h * (0.5 + i * 0.15) + Math.sin(fogOffset * 5 + i * 2) * 15;
            const fogGrad = ctx.createLinearGradient(0, fogY - h * 0.06, 0, fogY + h * 0.06);
            const alpha = density * (0.6 + Math.sin(fogOffset * 8 + i * 3) * 0.4);
            fogGrad.addColorStop(0, `rgba(180,180,200,0)`);
            fogGrad.addColorStop(0.4, `rgba(160,170,190,${Math.max(0, alpha).toFixed(4)})`);
            fogGrad.addColorStop(0.6, `rgba(160,170,190,${Math.max(0, alpha).toFixed(4)})`);
            fogGrad.addColorStop(1, `rgba(180,180,200,0)`);
            ctx.fillStyle = fogGrad;
            ctx.fillRect(0, fogY - h * 0.06, w, h * 0.12);
        }
        ctx.restore();
    }

    /**
     * Draw a lightning flash effect.
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} w - width
     * @param {number} h - height
     */
    let nextLightning = 0;
    let lightningAlpha = 0;
    function drawLightning(ctx, w, h) {
        const now = Date.now();
        if (now > nextLightning && lightningAlpha <= 0) {
            lightningAlpha = 0.15 + Math.random() * 0.15;
            nextLightning = now + 5000 + Math.random() * 15000;
        }
        if (lightningAlpha > 0) {
            ctx.save();
            ctx.fillStyle = `rgba(200,210,255,${lightningAlpha.toFixed(3)})`;
            ctx.fillRect(0, 0, w, h);
            ctx.restore();
            lightningAlpha -= 0.015;
        }
    }

    return {
        drawVignette,
        drawScanlines,
        drawFilmGrain,
        drawChromaticAberration,
        drawLetterbox,
        drawBloodSplatter,
        drawHeartbeatPulse,
        drawFlashlight,
        drawFogLayer,
        drawLightning,
    };
})();

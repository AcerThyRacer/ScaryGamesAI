/* ============================================
   ScaryGamesAI — Cinematic Overlay v1.0
   Per-game atmosphere system with genre presets.
   Auto-detects game from URL and applies matching
   cinematic overlay using VisualUtils.
   ============================================ */

const CinematicOverlay = (function () {
    'use strict';

    const TIER_KEY = 'sgai-sub-tier';
    let overlayCanvas = null;
    let overlayCtx = null;
    let running = false;
    let preset = null;
    let frameCount = 0;
    // === PERFORMANCE ===
    let cinCachedW = 0, cinCachedH = 0;
    let cinTabVisible = true;
    const cinIsMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
        || ('ontouchstart' in window && window.innerWidth < 1024);
    const CIN_FPS_INTERVAL = cinIsMobile ? (1000 / 30) : 0;
    let cinLastRender = 0;

    // ── Genre presets: each game maps to a preset name ──
    const GAME_PRESETS = {
        // Chase games — adrenaline-pumping
        'backrooms-pacman': 'chase',
        'nightmare-run': 'chase',
        'yeti-run': 'chase',

        // Survival / Dungeon
        'shadow-crawler': 'dungeon',
        'web-of-terror': 'dungeon',
        'cursed-depths': 'dungeon',
        'haunted-asylum': 'dungeon',

        // Psychological
        'the-elevator': 'psychological',
        'seance': 'psychological',
        'dollhouse': 'psychological',
        'freddys-nightmare': 'psychological',
        'ritual-circle': 'psychological',

        // Survival
        'graveyard-shift': 'survival',
        'zombie-horde': 'survival',
        'total-zombies-medieval': 'survival',
        'blood-tetris': 'survival',

        // Cosmic / Deep
        'the-abyss': 'cosmic',
        'cursed-sands': 'cosmic',
    };

    // ── Preset definitions ──
    const PRESETS = {
        psychological: {
            label: 'Psychological Horror',
            effects: function (ctx, w, h) {
                VisualUtils.drawScanlines(ctx, w, h, 0.03);
                VisualUtils.drawFilmGrain(ctx, w, h, 0.025);
                VisualUtils.drawChromaticAberration(ctx, w, h, 0.01);
                VisualUtils.drawHeartbeatPulse(ctx, w, h, 65);
                VisualUtils.drawVignette(ctx, w, h, 0.3);
            },
        },
        survival: {
            label: 'Survival Horror',
            effects: function (ctx, w, h) {
                VisualUtils.drawVignette(ctx, w, h, 0.35);
                VisualUtils.drawFogLayer(ctx, w, h, 0.02, 0.3);
                VisualUtils.drawBloodSplatter(ctx, w, h);
                VisualUtils.drawFilmGrain(ctx, w, h, 0.015);
                if (Math.random() < 0.001) VisualUtils.drawLightning(ctx, w, h);
                VisualUtils.drawLightning(ctx, w, h); // continues fade
            },
        },
        chase: {
            label: 'Chase Horror',
            effects: function (ctx, w, h) {
                VisualUtils.drawLetterbox(ctx, w, h, 0.04);
                VisualUtils.drawVignette(ctx, w, h, 0.25);
                VisualUtils.drawHeartbeatPulse(ctx, w, h, 110);
                VisualUtils.drawFilmGrain(ctx, w, h, 0.01);
                // Adrenaline edge tint
                ctx.save();
                const pulse = (Math.sin(Date.now() * 0.008) + 1) / 2;
                const edgeGrad = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.85);
                edgeGrad.addColorStop(0, 'rgba(0,0,0,0)');
                edgeGrad.addColorStop(0.7, 'rgba(0,0,0,0)');
                edgeGrad.addColorStop(1, `rgba(60,0,0,${(0.03 + pulse * 0.03).toFixed(3)})`);
                ctx.fillStyle = edgeGrad;
                ctx.fillRect(0, 0, w, h);
                ctx.restore();
            },
        },
        dungeon: {
            label: 'Dungeon Crawl',
            effects: function (ctx, w, h) {
                VisualUtils.drawVignette(ctx, w, h, 0.4);
                VisualUtils.drawFogLayer(ctx, w, h, 0.025, 0.4);
                VisualUtils.drawFilmGrain(ctx, w, h, 0.02);
                // Torch flicker — warm edges that flicker
                ctx.save();
                ctx.globalCompositeOperation = 'screen';
                const flicker = 0.01 + Math.random() * 0.015;
                const torchGrad = ctx.createRadialGradient(w / 2, h, h * 0.2, w / 2, h, h * 0.9);
                torchGrad.addColorStop(0, `rgba(255,180,80,${flicker.toFixed(3)})`);
                torchGrad.addColorStop(0.5, `rgba(200,120,40,${(flicker * 0.3).toFixed(3)})`);
                torchGrad.addColorStop(1, 'rgba(150,80,20,0)');
                ctx.fillStyle = torchGrad;
                ctx.fillRect(0, 0, w, h);
                ctx.restore();
                // Cobweb corners
                ctx.save();
                ctx.globalAlpha = 0.04;
                ctx.strokeStyle = 'rgba(200,200,200,0.5)';
                ctx.lineWidth = 0.5;
                for (let i = 0; i < 5; i++) {
                    const cx = i < 3 ? 0 : w;
                    const cy = 0;
                    ctx.beginPath();
                    ctx.moveTo(cx, cy);
                    ctx.quadraticCurveTo(cx + (i < 3 ? 40 : -40) + i * 10, cy + 30 + i * 8, cx + (i < 3 ? 60 : -60), cy + 60 + i * 12);
                    ctx.stroke();
                }
                ctx.restore();
            },
        },
        cosmic: {
            label: 'Cosmic Horror',
            effects: function (ctx, w, h) {
                VisualUtils.drawVignette(ctx, w, h, 0.3);
                VisualUtils.drawFilmGrain(ctx, w, h, 0.01);
                // Aurora shimmer
                ctx.save();
                ctx.globalCompositeOperation = 'screen';
                const t = Date.now() * 0.001;
                for (let i = 0; i < 3; i++) {
                    const ay = h * 0.08 + i * h * 0.04;
                    for (let x = 0; x < w; x += 6) {
                        const waveY = ay + Math.sin(t * 2 + x * 0.003 + i) * h * 0.02;
                        const hue = 180 + i * 50 + Math.sin(x * 0.005 + t) * 30;
                        const alpha = 0.006 + Math.sin(t + x * 0.002) * 0.003;
                        if (alpha > 0) {
                            ctx.fillStyle = `hsla(${hue}, 60%, 55%, ${Math.max(0, alpha).toFixed(4)})`;
                            ctx.fillRect(x, waveY, 6, h * 0.03);
                        }
                    }
                }
                ctx.restore();
                // Star field
                ctx.save();
                ctx.globalCompositeOperation = 'screen';
                for (let i = 0; i < 30; i++) {
                    const sx = (Math.sin(i * 127.1 + 31.7) * 0.5 + 0.5) * w;
                    const sy = (Math.cos(i * 269.5 + 183.3) * 0.5 + 0.5) * h * 0.3;
                    const twinkle = (Math.sin(t * 3 + i * 2.7) + 1) / 2;
                    if (twinkle > 0.6) {
                        const alpha = (twinkle - 0.6) * 0.06;
                        ctx.fillStyle = `rgba(200,220,255,${alpha.toFixed(4)})`;
                        ctx.beginPath();
                        ctx.arc(sx, sy, 0.8, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
                ctx.restore();
                // Nebula fog
                VisualUtils.drawFogLayer(ctx, w, h, 0.015, 0.2);
            },
        },
    };

    function getTier() { return localStorage.getItem(TIER_KEY) || 'none'; }

    /**
     * Detect game from URL and return the preset key.
     */
    function detectGame() {
        const path = window.location.pathname.toLowerCase();
        for (const [gameId, presetKey] of Object.entries(GAME_PRESETS)) {
            if (path.includes(gameId)) return presetKey;
        }
        return null;
    }

    /**
     * Get intensity multiplier based on tier.
     * Higher tiers get richer overlays.
     */
    function getTierIntensity() {
        const t = getTier();
        if (t === 'max') return 1.0;
        if (t === 'pro') return 0.8;
        if (t === 'lite') return 0.5;
        return 0.3; // free tier gets a subtle taste
    }

    function init() {
        const presetKey = detectGame();
        if (!presetKey || !PRESETS[presetKey]) return;
        preset = PRESETS[presetKey];

        // Don't double-init
        if (document.getElementById('cinematic-overlay-canvas')) return;

        overlayCanvas = document.createElement('canvas');
        overlayCanvas.id = 'cinematic-overlay-canvas';
        overlayCanvas.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:45;will-change:transform;';
        document.body.appendChild(overlayCanvas);
        overlayCtx = overlayCanvas.getContext('2d');

        // === PERFORMANCE: cache dimensions on resize ===
        function updateCinSize() {
            cinCachedW = window.innerWidth;
            cinCachedH = window.innerHeight;
            overlayCanvas.width = cinCachedW;
            overlayCanvas.height = cinCachedH;
        }
        updateCinSize();
        window.addEventListener('resize', updateCinSize);

        // === PERFORMANCE: Page Visibility API ===
        document.addEventListener('visibilitychange', function () {
            cinTabVisible = !document.hidden;
            if (cinTabVisible && running) requestAnimationFrame(renderLoop);
        });

        // Inject cinematic badge
        const badge = document.createElement('div');
        badge.className = 'cinematic-badge';
        badge.innerHTML = `<span class="cinematic-icon">🎬</span><span class="cinematic-text">${preset.label}</span>`;
        document.body.appendChild(badge);

        const style = document.createElement('style');
        style.textContent = `
            .cinematic-badge {
                position: fixed;
                bottom: 12px;
                left: 12px;
                z-index: 200;
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 5px 12px;
                border-radius: 6px;
                background: rgba(20,15,30,0.7);
                border: 1px solid rgba(255,255,255,0.08);
                backdrop-filter: blur(8px);
                font-family: 'Inter', monospace;
                font-size: 0.6rem;
                color: rgba(255,255,255,0.5);
                pointer-events: none;
                animation: cinBadgeIn 0.8s cubic-bezier(0.16,1,0.3,1);
            }
            @keyframes cinBadgeIn {
                from { opacity: 0; transform: translateY(10px); }
                to   { opacity: 1; transform: translateY(0); }
            }
            .cinematic-icon { font-size: 0.8rem; }
            .cinematic-text { letter-spacing: 0.5px; text-transform: uppercase; font-weight: 600; }
        `;
        document.head.appendChild(style);

        running = true;
        requestAnimationFrame(renderLoop);

        console.log(`[CinematicOverlay] ${preset.label} preset activated`);
    }

    function renderLoop(timestamp) {
        if (!running) return;
        // === PERFORMANCE: skip when tab hidden ===
        if (!cinTabVisible) return;
        // === PERFORMANCE: 30fps cap on mobile ===
        if (CIN_FPS_INTERVAL > 0) {
            if (timestamp - cinLastRender < CIN_FPS_INTERVAL) {
                requestAnimationFrame(renderLoop);
                return;
            }
            cinLastRender = timestamp;
        }
        frameCount++;

        const w = cinCachedW;
        const h = cinCachedH;
        overlayCtx.clearRect(0, 0, w, h);

        // Apply intensity scaling based on tier
        const intensity = getTierIntensity();
        overlayCtx.globalAlpha = intensity;

        if (preset && preset.effects) {
            preset.effects(overlayCtx, w, h);
        }

        overlayCtx.globalAlpha = 1;
        requestAnimationFrame(renderLoop);
    }

    function destroy() {
        running = false;
        if (overlayCanvas && overlayCanvas.parentNode) overlayCanvas.parentNode.removeChild(overlayCanvas);
        const badge = document.querySelector('.cinematic-badge');
        if (badge && badge.parentNode) badge.parentNode.removeChild(badge);
    }

    // Auto-init
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    return { init, destroy, detectGame };
})();

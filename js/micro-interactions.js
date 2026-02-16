const MicroInteractions = (function () {
    'use strict';

    let trailCanvas = null;
    let trailCtx = null;
    let mouseX = 0, mouseY = 0;
    const trailDots = [];
    const dustParticles = [];
    let animFrame = 0;
    let cursorStyleEl = null;
    let currentThemeId = '';
    // === PERFORMANCE ===
    let trailCachedW = 0, trailCachedH = 0;
    let trailTabVisible = true;
    const isTouchOnly = ('ontouchstart' in window) && !('onmousedown' in window || window.innerWidth >= 1024);

    /* ══════════════════════════════════════
       THEME → CURSOR CONFIG MAP
       Groups themes into visual families
       ══════════════════════════════════════ */
    const CURSOR_FAMILIES = {
        // Default blood-red horror
        blood: {
            cursor: { fill: '%23cc1122', stroke: '%23660000' },
            pointer: { fill: '%23ff4444', stroke: '%23880000' },
            crosshair: { stroke: '%23cc1122', dot: '%23cc1122' },
            trail: { hues: [0, 350], sat: 80, lit: 40, glow: [0, 90, 30], behavior: 'drip' },
        },
        // Green toxic themes
        toxic: {
            cursor: { fill: '%2333ff33', stroke: '%23006600' },
            pointer: { fill: '%2344ff88', stroke: '%23008833' },
            crosshair: { stroke: '%2333ff33', dot: '%2333ff33' },
            trail: { hues: [120, 140], sat: 80, lit: 45, glow: [130, 90, 35], behavior: 'fizz' },
        },
        // Blue/white frost themes
        frost: {
            cursor: { fill: '%2366ccff', stroke: '%23003366' },
            pointer: { fill: '%2388ddff', stroke: '%23005588' },
            crosshair: { stroke: '%2366ccff', dot: '%2366ccff' },
            trail: { hues: [195, 210], sat: 70, lit: 60, glow: [200, 80, 50], behavior: 'sparkle' },
        },
        // Gold/amber cursed themes
        cursed: {
            cursor: { fill: '%23ffaa00', stroke: '%23664400' },
            pointer: { fill: '%23ffcc33', stroke: '%23886600' },
            crosshair: { stroke: '%23ffaa00', dot: '%23ffaa00' },
            trail: { hues: [35, 50], sat: 90, lit: 50, glow: [40, 90, 40], behavior: 'float' },
        },
        // Purple void/shadow themes
        void: {
            cursor: { fill: '%238833cc', stroke: '%23330066' },
            pointer: { fill: '%23aa55ee', stroke: '%23550088' },
            crosshair: { stroke: '%238833cc', dot: '%238833cc' },
            trail: { hues: [270, 290], sat: 70, lit: 45, glow: [280, 80, 35], behavior: 'orbit' },
        },
        // Orange/red fire themes
        fire: {
            cursor: { fill: '%23ff6600', stroke: '%23882200' },
            pointer: { fill: '%23ff8833', stroke: '%23aa4400' },
            crosshair: { stroke: '%23ff6600', dot: '%23ff6600' },
            trail: { hues: [15, 40], sat: 95, lit: 50, glow: [25, 95, 40], behavior: 'rise' },
        },
        // Neon cyan/magenta cyber themes
        cyber: {
            cursor: { fill: '%2300ffcc', stroke: '%23006644' },
            pointer: { fill: '%23ff00aa', stroke: '%23660044' },
            crosshair: { stroke: '%2300ffcc', dot: '%23ff00aa' },
            trail: { hues: [170, 310], sat: 100, lit: 55, glow: [170, 100, 45], behavior: 'glitch' },
        },
        // Deep blue ocean themes
        ocean: {
            cursor: { fill: '%230088cc', stroke: '%23003355' },
            pointer: { fill: '%2333aadd', stroke: '%23005577' },
            crosshair: { stroke: '%230088cc', dot: '%230088cc' },
            trail: { hues: [200, 220], sat: 65, lit: 45, glow: [210, 70, 35], behavior: 'bubble' },
        },
        // Purple/green witchcraft themes
        witch: {
            cursor: { fill: '%23aa44ff', stroke: '%23440088' },
            pointer: { fill: '%2366ff66', stroke: '%23008800' },
            crosshair: { stroke: '%23aa44ff', dot: '%2366ff66' },
            trail: { hues: [280, 130], sat: 80, lit: 50, glow: [280, 85, 40], behavior: 'spiral' },
        },
        // Green jungle/nature themes
        jungle: {
            cursor: { fill: '%2344cc44', stroke: '%23115511' },
            pointer: { fill: '%2366ee66', stroke: '%23228822' },
            crosshair: { stroke: '%2344cc44', dot: '%2344cc44' },
            trail: { hues: [100, 130], sat: 60, lit: 40, glow: [110, 65, 30], behavior: 'leaf' },
        },
        // Yellow electric/storm themes
        electric: {
            cursor: { fill: '%23ffdd00', stroke: '%23665500' },
            pointer: { fill: '%23ffee44', stroke: '%23887700' },
            crosshair: { stroke: '%23ffdd00', dot: '%23ffdd00' },
            trail: { hues: [50, 60], sat: 100, lit: 55, glow: [55, 100, 45], behavior: 'zap' },
        },
        // Bone/grey necrotic themes
        necrotic: {
            cursor: { fill: '%23bbaa88', stroke: '%23443322' },
            pointer: { fill: '%23ccbb99', stroke: '%23554433' },
            crosshair: { stroke: '%23bbaa88', dot: '%23bbaa88' },
            trail: { hues: [40, 30], sat: 25, lit: 55, glow: [35, 30, 40], behavior: 'ash' },
        },
        // Deep red crimson themes
        crimson: {
            cursor: { fill: '%23ee0022', stroke: '%23550008' },
            pointer: { fill: '%23ff3344', stroke: '%23770011' },
            crosshair: { stroke: '%23ee0022', dot: '%23ee0022' },
            trail: { hues: [350, 5], sat: 90, lit: 35, glow: [355, 95, 25], behavior: 'drip' },
        },
        // Dark grey/white silent hill style
        silent: {
            cursor: { fill: '%23999999', stroke: '%23333333' },
            pointer: { fill: '%23bbbbbb', stroke: '%23555555' },
            crosshair: { stroke: '%23999999', dot: '%23999999' },
            trail: { hues: [0, 0], sat: 0, lit: 60, glow: [0, 0, 40], behavior: 'ash' },
        },
    };

    // Map theme IDs to cursor families
    const THEME_FAMILY_MAP = {
        'default': 'blood', 'crimson': 'crimson', 'eclipse': 'crimson',
        'blood-valentine': 'crimson', 'slasher': 'crimson',
        'toxic': 'toxic', 'biohazard': 'toxic', 'sewer': 'toxic',
        'ghost': 'frost', 'frozen-december': 'frost', 'blizzard': 'frost',
        'cursed': 'cursed', 'ancient-scroll': 'cursed', 'autumn-dread': 'cursed',
        'void': 'void', 'shadowrealm': 'void', 'the-ring': 'void',
        'hellfire': 'fire', 'fireball': 'fire', 'inferno': 'fire',
        'upside-down': 'void', 'carnival': 'witch',
        'cyberpunk-horror': 'cyber',
        'tsunami': 'ocean', 'deep-sea': 'ocean',
        'witchcraft': 'witch', 'gothic-cathedral': 'witch',
        'jungle': 'jungle', 'alien-hive': 'jungle',
        'thunderstorm': 'electric', 'summer-plague': 'electric',
        'necrotic': 'necrotic', 'silent-asylum': 'silent',
    };

    function getThemeFamily() {
        const themeId = localStorage.getItem('sg_theme') || 'default';
        return CURSOR_FAMILIES[THEME_FAMILY_MAP[themeId] || 'blood'];
    }

    function getActiveThemeId() {
        return localStorage.getItem('sg_theme') || 'default';
    }

    function init() {
        currentThemeId = getActiveThemeId();
        initHorrorCursor();
        initCursorTrail();
        initButtonEffects();
        initAnimatedHeadings();
        initAmbientDetails();
        // Poll for theme changes every 500ms
        setInterval(checkThemeChange, 500);
        console.log('[MicroInteractions] All micro-interactions initialized (theme-aware)');
    }

    function checkThemeChange() {
        const newTheme = getActiveThemeId();
        if (newTheme !== currentThemeId) {
            currentThemeId = newTheme;
            updateCursorForTheme();
        }
    }

    /* ══════════════════════════════════════
       1. HORROR CURSORS (Theme-Aware)
       ══════════════════════════════════════ */
    function initHorrorCursor() {
        cursorStyleEl = document.createElement('style');
        cursorStyleEl.id = 'theme-cursor-style';
        document.head.appendChild(cursorStyleEl);
        updateCursorForTheme();
    }

    function updateCursorForTheme() {
        const fam = getThemeFamily();
        const c = fam.cursor;
        const p = fam.pointer;
        const x = fam.crosshair;

        cursorStyleEl.textContent = `
            body {
                cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath d='M4 2l6 6-3.5 3.5L13 18l-2 2-6.5-6.5L1 17V2h3z' fill='${c.fill}' stroke='${c.stroke}' stroke-width='0.5'/%3E%3C/svg%3E") 4 2, auto;
            }
            a, button, [role='button'], .game-card, .nav-links a, input[type='submit'],
            .pricing-card, .cust-btn, .cust-item, .filter-btn, .faq-item {
                cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='28' viewBox='0 0 24 28'%3E%3Cpath d='M8 1v13l3-3 3 6 2-1-3-6h5L8 1z' fill='${p.fill}' stroke='${p.stroke}' stroke-width='0.5'/%3E%3C/svg%3E") 8 1, pointer;
            }
            .game-container, #game-canvas {
                cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='8' fill='none' stroke='${x.stroke}' stroke-width='1'/%3E%3Cline x1='12' y1='2' x2='12' y2='8' stroke='${x.stroke}' stroke-width='1'/%3E%3Cline x1='12' y1='16' x2='12' y2='22' stroke='${x.stroke}' stroke-width='1'/%3E%3Cline x1='2' y1='12' x2='8' y2='12' stroke='${x.stroke}' stroke-width='1'/%3E%3Cline x1='16' y1='12' x2='22' y2='12' stroke='${x.stroke}' stroke-width='1'/%3E%3Ccircle cx='12' cy='12' r='2' fill='${x.dot}'/%3E%3C/svg%3E") 12 12, crosshair;
            }
        `;
    }

    /* ══════════════════════════════════════
       2. CURSOR TRAIL (Theme-Aware)
       ══════════════════════════════════════ */
    function initCursorTrail() {
        // === PERFORMANCE: skip trail entirely on touch-only devices ===
        if (isTouchOnly) return;

        trailCanvas = document.createElement('canvas');
        trailCanvas.id = 'cursor-trail';
        trailCanvas.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:9998;will-change:transform;';
        document.body.appendChild(trailCanvas);
        trailCtx = trailCanvas.getContext('2d');

        // === PERFORMANCE: cache canvas dimensions on resize ===
        function updateTrailSize() {
            trailCachedW = window.innerWidth;
            trailCachedH = window.innerHeight;
            trailCanvas.width = trailCachedW;
            trailCanvas.height = trailCachedH;
        }
        updateTrailSize();
        window.addEventListener('resize', updateTrailSize);

        // === PERFORMANCE: Page Visibility API ===
        document.addEventListener('visibilitychange', function () {
            trailTabVisible = !document.hidden;
            if (trailTabVisible) requestAnimationFrame(renderTrail);
        });

        document.addEventListener('mousemove', function (e) {
            mouseX = e.clientX;
            mouseY = e.clientY;
            if (trailDots.length < 35) {
                const fam = getThemeFamily();
                const t = fam.trail;
                const hue = t.hues[0] + Math.random() * (t.hues[1] - t.hues[0]);
                const dot = {
                    x: mouseX, y: mouseY,
                    life: 1.0,
                    size: 2 + Math.random() * 3,
                    vx: 0, vy: 0,
                    hue: hue, sat: t.sat, lit: t.lit,
                    glow: t.glow,
                    behavior: t.behavior,
                };

                // Behavior-specific initial velocity
                switch (t.behavior) {
                    case 'drip':
                        dot.vx = (Math.random() - 0.5) * 1.2;
                        dot.vy = Math.random() * 2 + 0.5;
                        break;
                    case 'fizz':
                        dot.vx = (Math.random() - 0.5) * 3;
                        dot.vy = -Math.random() * 2 - 0.5;
                        dot.size *= 0.8;
                        break;
                    case 'sparkle':
                        dot.vx = (Math.random() - 0.5) * 2;
                        dot.vy = (Math.random() - 0.5) * 2;
                        dot.size = 1 + Math.random() * 2;
                        break;
                    case 'float':
                        dot.vx = (Math.random() - 0.5) * 0.8;
                        dot.vy = -Math.random() * 0.5 - 0.2;
                        break;
                    case 'orbit':
                        dot.angle = Math.random() * Math.PI * 2;
                        dot.orbitR = 5 + Math.random() * 15;
                        dot.orbitSpeed = 0.08 + Math.random() * 0.1;
                        dot.vx = 0; dot.vy = 0;
                        break;
                    case 'rise':
                        dot.vx = (Math.random() - 0.5) * 1;
                        dot.vy = -Math.random() * 3 - 1;
                        dot.size = 1.5 + Math.random() * 3;
                        break;
                    case 'glitch':
                        dot.vx = (Math.random() - 0.5) * 5;
                        dot.vy = (Math.random() - 0.5) * 5;
                        dot.size = 1 + Math.random() * 2;
                        dot.shape = 'rect';
                        break;
                    case 'bubble':
                        dot.vx = (Math.random() - 0.5) * 0.5;
                        dot.vy = -Math.random() * 1.5 - 0.3;
                        dot.size = 3 + Math.random() * 4;
                        dot.shape = 'ring';
                        break;
                    case 'spiral':
                        dot.angle = Math.random() * Math.PI * 2;
                        dot.spiralR = 0;
                        dot.spiralSpeed = 0.12;
                        break;
                    case 'leaf':
                        dot.vx = (Math.random() - 0.5) * 2;
                        dot.vy = Math.random() * 1.5 + 0.5;
                        dot.wobble = Math.random() * Math.PI * 2;
                        break;
                    case 'zap':
                        dot.vx = (Math.random() - 0.5) * 6;
                        dot.vy = (Math.random() - 0.5) * 6;
                        dot.size = 1 + Math.random() * 1.5;
                        dot.shape = 'line';
                        break;
                    case 'ash':
                        dot.vx = (Math.random() - 0.5) * 0.5;
                        dot.vy = Math.random() * 0.8 + 0.2;
                        dot.size = 1 + Math.random() * 2;
                        break;
                    default:
                        dot.vx = (Math.random() - 0.5) * 1.5;
                        dot.vy = Math.random() * 2 + 0.5;
                }
                trailDots.push(dot);
            }
        }, { passive: true });

        renderTrail();
    }

    function renderTrail() {
        if (!trailCanvas) return;
        // === PERFORMANCE: skip when tab hidden ===
        if (!trailTabVisible) return;
        // === PERFORMANCE: skip rendering when no dots to draw ===
        if (trailDots.length === 0) {
            requestAnimationFrame(renderTrail);
            return;
        }

        // Time-based update so trail stays smooth at any refresh rate.
        if (renderTrail._lastTs === undefined) renderTrail._lastTs = performance.now();
        const now = performance.now();
        const dt = Math.min(0.05, Math.max(0, (now - renderTrail._lastTs) / 1000));
        renderTrail._lastTs = now;
        const scale = dt * 60; // preserve legacy tuning (was per-frame at ~60fps)
        const decayPow = (base) => Math.pow(base, scale);
        const chanceAtLeastOnce = (pPerFrame) => 1 - Math.pow(1 - pPerFrame, scale);

        const w = trailCachedW;
        const h = trailCachedH;
        trailCtx.clearRect(0, 0, w, h);

        for (let i = trailDots.length - 1; i >= 0; i--) {
            const d = trailDots[i];
            d.life -= 0.03 * scale;

            // Behavior-specific physics
            switch (d.behavior) {
                case 'drip':
                    d.x += d.vx * scale; d.y += d.vy * scale; d.vy += 0.06 * scale;
                    break;
                case 'fizz':
                    d.x += d.vx * scale; d.y += d.vy * scale;
                    d.vx *= decayPow(0.96); d.vy *= decayPow(0.96);
                    break;
                case 'sparkle':
                    d.x += d.vx * d.life * scale; d.y += d.vy * d.life * scale;
                    break;
                case 'float':
                    d.x += (d.vx + Math.sin(d.life * 8) * 0.5) * scale;
                    d.y += d.vy * scale;
                    break;
                case 'orbit':
                    d.angle += d.orbitSpeed * scale;
                    d.x = d.x + Math.cos(d.angle) * d.orbitR * 0.03 * scale;
                    d.y = d.y + Math.sin(d.angle) * d.orbitR * 0.03 * scale;
                    d.orbitR *= decayPow(0.99);
                    break;
                case 'rise':
                    d.x += d.vx * scale; d.y += d.vy * scale;
                    d.vx += (Math.random() - 0.5) * 0.2 * scale;
                    break;
                case 'glitch':
                    if (Math.random() < chanceAtLeastOnce(0.3)) {
                        d.x += (Math.random() - 0.5) * 8 * Math.min(1.5, scale);
                        d.y += (Math.random() - 0.5) * 8 * Math.min(1.5, scale);
                    }
                    break;
                case 'bubble':
                    d.x += (d.vx + Math.sin(d.life * 10) * 0.3) * scale;
                    d.y += d.vy * scale;
                    d.size *= decayPow(1.005);
                    break;
                case 'spiral':
                    d.angle += d.spiralSpeed * scale;
                    d.spiralR += 0.3 * scale;
                    d.x += Math.cos(d.angle) * d.spiralR * 0.05 * scale;
                    d.y += Math.sin(d.angle) * d.spiralR * 0.05 * scale;
                    break;
                case 'leaf':
                    d.wobble += 0.1 * scale;
                    d.x += (d.vx + Math.sin(d.wobble) * 1.2) * scale;
                    d.y += d.vy * scale;
                    d.vx *= decayPow(0.98);
                    break;
                case 'zap':
                    d.x += d.vx * scale; d.y += d.vy * scale;
                    d.vx *= decayPow(0.85); d.vy *= decayPow(0.85);
                    break;
                case 'ash':
                    d.x += (d.vx + Math.sin(d.life * 5) * 0.3) * scale;
                    d.y += d.vy * scale;
                    break;
                default:
                    d.x += d.vx * scale; d.y += d.vy * scale; d.vy += 0.05 * scale;
            }

            if (d.life <= 0) { trailDots.splice(i, 1); continue; }

            const alpha = d.life * 0.55;
            const color = `hsla(${d.hue}, ${d.sat}%, ${d.lit}%, ${alpha.toFixed(3)})`;
            const s = d.size * d.life;

            // Draw particle based on shape
            if (d.shape === 'rect') {
                trailCtx.fillStyle = color;
                trailCtx.fillRect(d.x - s / 2, d.y - s / 2, s, s * 0.4);
            } else if (d.shape === 'ring') {
                trailCtx.strokeStyle = color;
                trailCtx.lineWidth = 0.8;
                trailCtx.beginPath();
                trailCtx.arc(d.x, d.y, s, 0, Math.PI * 2);
                trailCtx.stroke();
            } else if (d.shape === 'line') {
                trailCtx.strokeStyle = color;
                trailCtx.lineWidth = 1;
                trailCtx.beginPath();
                trailCtx.moveTo(d.x, d.y);
                trailCtx.lineTo(d.x + d.vx * 3, d.y + d.vy * 3);
                trailCtx.stroke();
            } else {
                trailCtx.fillStyle = color;
                trailCtx.beginPath();
                trailCtx.arc(d.x, d.y, s, 0, Math.PI * 2);
                trailCtx.fill();
            }

            // Glow effect
            if (d.life > 0.4 && d.glow) {
                const glowAlpha = (alpha * 0.25).toFixed(3);
                trailCtx.fillStyle = `hsla(${d.glow[0]}, ${d.glow[1]}%, ${d.glow[2]}%, ${glowAlpha})`;
                trailCtx.beginPath();
                trailCtx.arc(d.x, d.y, s * 2.5, 0, Math.PI * 2);
                trailCtx.fill();
            }
        }

        requestAnimationFrame(renderTrail);
    }

    /* ══════════════════════════════════════
       3. BUTTON HOVER EFFECTS
       ══════════════════════════════════════ */
    function initButtonEffects() {
        const style = document.createElement('style');
        style.textContent = `
            /* Enhanced button hover states */
            .start-btn, .play-btn, .hero-cta, .start-btn-alt {
                position: relative;
                overflow: hidden;
                transition: all 0.3s cubic-bezier(0.25,0.8,0.25,1) !important;
            }
            .start-btn:hover, .play-btn:hover, .hero-cta:hover, .start-btn-alt:hover {
                transform: scale(1.05) !important;
                box-shadow:
                    0 0 20px var(--accent-red-glow, rgba(204,17,34,0.4)),
                    0 0 40px var(--border-glow, rgba(204,17,34,0.2)),
                    inset 0 0 15px var(--border-glow, rgba(204,17,34,0.1)) !important;
            }
            .start-btn:active, .play-btn:active, .hero-cta:active, .start-btn-alt:active {
                transform: scale(0.97) !important;
                animation: btnShake 0.15s ease 1 !important;
            }
            @keyframes btnShake {
                0%{transform:translate(0) scale(0.97)} 25%{transform:translate(-2px,1px) scale(0.97)}
                50%{transform:translate(2px,-1px) scale(0.97)} 75%{transform:translate(-1px,-1px) scale(0.97)}
                100%{transform:translate(0) scale(0.97)}
            }
            /* Shimmer sweep across button */
            .start-btn::after, .play-btn::after, .hero-cta::after, .start-btn-alt::after {
                content: '';
                position: absolute;
                top: -50%;
                left: -75%;
                width: 50%;
                height: 200%;
                background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
                transform: skewX(-25deg);
                transition: none;
                animation: btnShimmer 4s ease-in-out infinite;
            }
            @keyframes btnShimmer {
                0% { left: -75%; }
                50% { left: 125%; }
                100% { left: 125%; }
            }
            /* Glow pulse for CTA */
            .hero-cta {
                animation: ctaGlowPulse 3s ease-in-out infinite !important;
            }
            @keyframes ctaGlowPulse {
                0%,100% { box-shadow: 0 0 15px var(--accent-red-glow, rgba(204,17,34,0.3)), 0 4px 20px rgba(0,0,0,0.3); }
                50% { box-shadow: 0 0 30px var(--accent-red-glow, rgba(204,17,34,0.5)), 0 0 60px var(--border-glow, rgba(204,17,34,0.15)), 0 4px 20px rgba(0,0,0,0.3); }
            }
        `;
        document.head.appendChild(style);

        // Particle burst on click
        document.addEventListener('click', function (e) {
            const btn = e.target.closest('.start-btn, .play-btn, .hero-cta, .start-btn-alt');
            if (!btn) return;
            const rect = btn.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            spawnClickParticles(cx, cy);
        });
    }

    function spawnClickParticles(cx, cy) {
        for (let i = 0; i < 12; i++) {
            const p = document.createElement('div');
            const angle = (i / 12) * Math.PI * 2;
            const dist = 30 + Math.random() * 40;
            const tx = Math.cos(angle) * dist;
            const ty = Math.sin(angle) * dist;
            const size = 3 + Math.random() * 4;
            p.style.cssText = `
                position:fixed;left:${cx}px;top:${cy}px;
                width:${size}px;height:${size}px;
                background:radial-gradient(circle, var(--accent-red, #ff4444), var(--bg-secondary, #880000));
                border-radius:50%;pointer-events:none;z-index:99998;
                transition:all 0.5s cubic-bezier(0.25,0.8,0.25,1);
                opacity:1;
            `;
            document.body.appendChild(p);
            requestAnimationFrame(() => {
                p.style.transform = `translate(${tx}px, ${ty}px) scale(0)`;
                p.style.opacity = '0';
            });
            setTimeout(() => p.remove(), 600);
        }
    }

    /* ══════════════════════════════════════
       4. ANIMATED HEADINGS
       ══════════════════════════════════════ */
    function initAnimatedHeadings() {
        const style = document.createElement('style');
        style.textContent = `
            /* Glitch-on-scroll for section headings */
            .section-title, h2, .section-header h2 {
                transition: all 0.4s ease;
            }
            .heading-glitch {
                animation: headingGlitch 0.6s ease 1 !important;
            }
            @keyframes headingGlitch {
                0% { transform:translate(0); filter:none; }
                10% { transform:translate(-2px,1px); filter:blur(1px); color:#ff4444; }
                20% { transform:translate(2px,-1px); filter:none; }
                30% { transform:translate(-1px,-1px); filter:blur(0.5px); }
                40% { transform:translate(1px,1px); filter:none; color:inherit; }
                50% { transform:translate(0); clip-path:inset(20% 0 30% 0); }
                60% { clip-path:inset(60% 0 10% 0); }
                70% { clip-path:none; transform:translate(-1px,0); }
                100% { transform:translate(0); filter:none; clip-path:none; }
            }
            /* Typewriter reveal */
            .heading-reveal {
                animation: headingReveal 0.8s ease forwards !important;
            }
            @keyframes headingReveal {
                0% { opacity:0; letter-spacing:15px; filter:blur(8px); }
                50% { opacity:0.7; letter-spacing:5px; filter:blur(2px); }
                100% { opacity:1; letter-spacing:normal; filter:blur(0); }
            }
        `;
        document.head.appendChild(style);

        // Observe section headings for scroll reveal
        const observer = new IntersectionObserver(function (entries) {
            entries.forEach(entry => {
                if (entry.isIntersecting && !entry.target.dataset.animated) {
                    entry.target.dataset.animated = '1';
                    // Randomly choose glitch or reveal
                    const anim = Math.random() > 0.4 ? 'heading-glitch' : 'heading-reveal';
                    entry.target.classList.add(anim);
                    setTimeout(() => entry.target.classList.remove(anim), 1000);
                }
            });
        }, { threshold: 0.3 });

        document.querySelectorAll('.section-title, .section-header h2, h2').forEach(h => {
            observer.observe(h);
        });
    }

    /* ══════════════════════════════════════
       5. AMBIENT DETAILS
       ══════════════════════════════════════ */
    function initAmbientDetails() {
        injectCobwebs();
        injectFloatingDust();
        injectScratchOverlay();
    }

    function injectCobwebs() {
        const cobwebSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
            <path d="M0,0 Q30,5 50,50 Q5,30 0,0" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="0.5"/>
            <path d="M0,0 Q20,15 50,50 Q15,20 0,0" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="0.3"/>
            <path d="M0,0 Q10,25 50,50 Q25,10 0,0" fill="none" stroke="rgba(255,255,255,0.025)" stroke-width="0.3"/>
            <path d="M0,0 Q40,2 50,50" fill="none" stroke="rgba(255,255,255,0.02)" stroke-width="0.3"/>
            <path d="M0,0 Q2,40 50,50" fill="none" stroke="rgba(255,255,255,0.02)" stroke-width="0.3"/>
            <circle cx="15" cy="15" r="0.5" fill="rgba(255,255,255,0.04)"/>
            <circle cx="25" cy="10" r="0.3" fill="rgba(255,255,255,0.03)"/>
        </svg>`;
        const dataUrl = 'data:image/svg+xml,' + encodeURIComponent(cobwebSVG);

        const style = document.createElement('style');
        style.textContent = `
            /* Cobweb corners */
            body::before {
                content:'';
                position:fixed;
                top:var(--nav-height, 60px);
                left:0;
                width:120px;
                height:120px;
                background-image:url("${dataUrl}");
                background-size:contain;
                background-repeat:no-repeat;
                pointer-events:none;
                z-index:50;
                opacity:0.6;
            }
            body::after {
                content:'';
                position:fixed;
                top:var(--nav-height, 60px);
                right:0;
                width:120px;
                height:120px;
                background-image:url("${dataUrl}");
                background-size:contain;
                background-repeat:no-repeat;
                pointer-events:none;
                z-index:50;
                opacity:0.5;
                transform:scaleX(-1);
            }
        `;
        document.head.appendChild(style);
    }

    function injectFloatingDust() {
        const dustContainer = document.createElement('div');
        dustContainer.id = 'ambient-dust';
        dustContainer.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:49;overflow:hidden;';
        document.body.appendChild(dustContainer);

        const style = document.createElement('style');
        style.textContent = `
            .dust-particle {
                position:absolute;
                border-radius:50%;
                background:rgba(200,190,170,0.15);
                pointer-events:none;
                animation:dustFloat linear infinite;
            }
            @keyframes dustFloat {
                0% { transform:translateY(0) translateX(0) rotate(0deg); opacity:0; }
                10% { opacity:1; }
                90% { opacity:1; }
                100% { transform:translateY(-100vh) translateX(30px) rotate(360deg); opacity:0; }
            }
        `;
        document.head.appendChild(style);

        // Spawn 20 dust particles
        for (let i = 0; i < 20; i++) {
            const p = document.createElement('div');
            p.className = 'dust-particle';
            const size = 1 + Math.random() * 2.5;
            const left = Math.random() * 100;
            const delay = Math.random() * 15;
            const duration = 10 + Math.random() * 15;
            p.style.cssText += `
                width:${size}px;height:${size}px;
                left:${left}%;
                bottom:-5px;
                animation-delay:${delay}s;
                animation-duration:${duration}s;
            `;
            dustContainer.appendChild(p);
        }
    }

    function injectScratchOverlay() {
        const style = document.createElement('style');
        style.textContent = `
            /* Subtle scratch/grunge texture */
            .main-content::after {
                content:'';
                position:fixed;
                top:0;left:0;width:100%;height:100%;
                pointer-events:none;
                z-index:48;
                background-image:
                    linear-gradient(90deg, transparent 98%, rgba(255,255,255,0.01) 98.5%, transparent 99%),
                    linear-gradient(0deg, transparent 97%, rgba(255,255,255,0.008) 97.5%, transparent 98%),
                    linear-gradient(45deg, transparent 96%, rgba(255,255,255,0.005) 96.5%, transparent 97%);
                background-size: 80px 100%, 100% 60px, 120px 120px;
                opacity:0.5;
                mix-blend-mode:overlay;
            }
        `;
        document.head.appendChild(style);
    }

    // Auto-init
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    return { init };
})();

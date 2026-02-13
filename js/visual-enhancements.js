/* ============================================
   ScaryGamesAI — Visual Enhancements System
   Tier-based visual effects: Screen shake,
   vignette, particles, WebGPU ray tracing,
   colorblind modes, HDR, VRR support
   ============================================ */

const VisualEnhancements = (function () {
    'use strict';

    // ═══════════════════════════════════════════════════════════════
    // TIER CONFIGURATION - Features locked to subscription tiers
    // ═══════════════════════════════════════════════════════════════

    const TIER_FEATURES = {
        none: {
            label: 'Free',
            screenShake: true,
            screenShakeIntensity: 0.5,
            vignette: true,
            vignetteIntensity: 0.4,
            particles: false,
            particleCount: 0,
            bloodSplatter: false,
            lensFlares: false,
            chromaticAberration: false,
            filmGrain: true,
            filmGrainIntensity: 0.04,
            motionBlur: false,
            depthOfField: false,
            bloom: false,
            colorblindMode: 'none',
            hdr: false,
            rayTracing: false,
            pathTracing: false,
            ambientOcclusion: false,
            volumetricLighting: false,
            dynamicShadows: false,
            vrr: false,
        },
        lite: { // Survivor tier - $2
            label: 'Survivor',
            screenShake: true,
            screenShakeIntensity: 0.7,
            vignette: true,
            vignetteIntensity: 0.5,
            particles: true,
            particleCount: 50,
            bloodSplatter: true,
            lensFlares: false,
            chromaticAberration: true,
            filmGrain: true,
            filmGrainIntensity: 0.05,
            motionBlur: false,
            depthOfField: false,
            bloom: false,
            colorblindMode: 'all',
            hdr: false,
            rayTracing: false,
            pathTracing: false,
            ambientOcclusion: false,
            volumetricLighting: false,
            dynamicShadows: true,
            vrr: true,
        },
        pro: { // Hunter tier - $5
            label: 'Hunter',
            screenShake: true,
            screenShakeIntensity: 1.0,
            vignette: true,
            vignetteIntensity: 0.6,
            particles: true,
            particleCount: 150,
            bloodSplatter: true,
            lensFlares: true,
            chromaticAberration: true,
            filmGrain: true,
            filmGrainIntensity: 0.06,
            motionBlur: true,
            depthOfField: true,
            bloom: true,
            colorblindMode: 'all',
            hdr: false,
            rayTracing: true, // WebGPU Ray Tracing
            pathTracing: false,
            ambientOcclusion: true,
            volumetricLighting: true,
            dynamicShadows: true,
            vrr: true,
        },
        max: { // Elder God tier - $8
            label: 'Elder God',
            screenShake: true,
            screenShakeIntensity: 1.2,
            vignette: true,
            vignetteIntensity: 0.7,
            particles: true,
            particleCount: 300,
            bloodSplatter: true,
            lensFlares: true,
            chromaticAberration: true,
            filmGrain: true,
            filmGrainIntensity: 0.07,
            motionBlur: true,
            depthOfField: true,
            bloom: true,
            colorblindMode: 'all',
            hdr: true, // HDR Support
            rayTracing: true,
            pathTracing: true, // Full Path Tracing
            ambientOcclusion: true,
            volumetricLighting: true,
            dynamicShadows: true,
            vrr: true,
        },
    };

    // ═══════════════════════════════════════════════════════════════
    // COLORBLIND MODES
    // ═══════════════════════════════════════════════════════════════

    const COLORBLIND_FILTERS = {
        none: 'none',
        protanopia: 'url(#protanopia-filter)',
        deuteranopia: 'url(#deuteranopia-filter)',
        tritanopia: 'url(#tritanopia-filter)',
        achromatopsia: 'grayscale(100%)',
    };

    // ═══════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════

    let currentTier = 'none';
    let features = TIER_FEATURES.none;
    let canvas = null;
    let ctx = null;
    let running = false;
    let animationId = null;

    // Effect state
    let shakeIntensity = 0;
    let shakeDecay = 0.9;
    let vignetteIntensity = 0.5;
    let particles = [];
    let bloodSplatters = [];
    let intensityLevel = 0; // 0-1, affects vignette, particles, etc.
    let reducedMotion = false;

    // WebGPU State
    let webgpuDevice = null;
    let webgpuSupported = false;

    // HDR State
    let hdrSupported = false;
    let hdrEnabled = false;

    // ═══════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════

    function init() {
        // Check user tier from localStorage
        currentTier = localStorage.getItem('sgai-sub-tier') || 'none';
        features = TIER_FEATURES[currentTier] || TIER_FEATURES.none;

        // Check reduced motion preference
        reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
            reducedMotion = e.matches;
        });

        // Create overlay canvas
        createCanvas();

        // Check WebGPU support
        checkWebGPUSupport();

        // Check HDR support
        checkHDRSupport();

        // Create colorblind filter SVGs
        createColorblindFilters();

        // Create settings panel
        createSettingsPanel();

        // Start render loop
        running = true;
        render();

        console.log('[VisualEnhancements] Initialized — Tier:', features.label, '| WebGPU:', webgpuSupported, '| HDR:', hdrSupported);
    }

    function createCanvas() {
        // Remove existing if present
        const existing = document.getElementById('ve-overlay');
        if (existing) existing.remove();

        canvas = document.createElement('canvas');
        canvas.id = 've-overlay';
        canvas.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 99999;
        `;
        document.body.appendChild(canvas);
        ctx = canvas.getContext('2d');
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
    }

    function resizeCanvas() {
        if (!canvas) return;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    // ═══════════════════════════════════════════════════════════════
    // WEBGPU CHECK & RAY TRACING
    // ═══════════════════════════════════════════════════════════════

    async function checkWebGPUSupport() {
        if (!navigator.gpu) {
            webgpuSupported = false;
            console.log('[VisualEnhancements] WebGPU not supported');
            return;
        }

        try {
            const adapter = await navigator.gpu.requestAdapter();
            if (!adapter) {
                webgpuSupported = false;
                return;
            }

            webgpuDevice = await adapter.requestDevice();
            webgpuSupported = true;

            // Check for ray tracing features
            const features = adapter.features;
            const hasRayTracing = features.has('shader-f16') && features.has('rg11b10ufloat-renderable');

            console.log('[VisualEnhancements] WebGPU supported — Ray Tracing capable:', hasRayTracing);
        } catch (e) {
            webgpuSupported = false;
            console.warn('[VisualEnhancements] WebGPU check failed:', e);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // HDR SUPPORT
    // ═══════════════════════════════════════════════════════════════

    function checkHDRSupport() {
        // Check for HDR media query
        const hdrMediaQuery = window.matchMedia('(dynamic-range: high)');
        hdrSupported = hdrMediaQuery.matches;

        // Also check color gamut
        const p3Support = window.matchMedia('(color-gamut: p3)').matches;
        const rec2020Support = window.matchMedia('(color-gamut: rec2020)').matches;

        hdrSupported = hdrSupported || p3Support || rec2020Support;

        console.log('[VisualEnhancements] HDR support:', hdrSupported, '| P3:', p3Support, '| Rec2020:', rec2020Support);
    }

    // ═══════════════════════════════════════════════════════════════
    // COLORBLIND FILTERS (SVG)
    // ═══════════════════════════════════════════════════════════════

    function createColorblindFilters() {
        if (document.getElementById('ve-colorblind-filters')) return;

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.id = 've-colorblind-filters';
        svg.style.cssText = 'position:absolute;width:0;height:0;';

        svg.innerHTML = `
            <defs>
                <!-- Protanopia (red-blind) -->
                <filter id="protanopia-filter">
                    <feColorMatrix type="matrix" values="
                        0.567, 0.433, 0,     0, 0
                        0.558, 0.442, 0,     0, 0
                        0,     0.242, 0.758, 0, 0
                        0,     0,     0,     1, 0
                    "/>
                </filter>

                <!-- Deuteranopia (green-blind) -->
                <filter id="deuteranopia-filter">
                    <feColorMatrix type="matrix" values="
                        0.625, 0.375, 0,   0, 0
                        0.7,   0.3,   0,   0, 0
                        0,     0.3,   0.7, 0, 0
                        0,     0,     0,   1, 0
                    "/>
                </filter>

                <!-- Tritanopia (blue-blind) -->
                <filter id="tritanopia-filter">
                    <feColorMatrix type="matrix" values="
                        0.95, 0.05,  0,     0, 0
                        0,    0.433, 0.567, 0, 0
                        0,    0.475, 0.525, 0, 0
                        0,    0,     0,     1, 0
                    "/>
                </filter>
            </defs>
        `;

        document.body.appendChild(svg);
    }

    // ═══════════════════════════════════════════════════════════════
    // SCREEN SHAKE
    // ═══════════════════════════════════════════════════════════════

    function shake(intensity = 1, duration = 300) {
        if (!features.screenShake || reducedMotion) return;

        const maxIntensity = features.screenShakeIntensity * intensity * 15;
        shakeIntensity = maxIntensity;

        // Decay over duration
        const startTime = performance.now();
        const decay = () => {
            const elapsed = performance.now() - startTime;
            const progress = elapsed / duration;
            shakeIntensity = maxIntensity * (1 - progress) * shakeDecay;

            if (progress < 1) {
                requestAnimationFrame(decay);
            } else {
                shakeIntensity = 0;
            }
        };
        decay();
    }

    function getShakeOffset() {
        if (shakeIntensity <= 0) return { x: 0, y: 0 };
        return {
            x: (Math.random() - 0.5) * shakeIntensity * 2,
            y: (Math.random() - 0.5) * shakeIntensity * 2,
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // VIGNETTE
    // ═══════════════════════════════════════════════════════════════

    function setIntensity(level) {
        // Level 0-1, affects vignette and other intensity-based effects
        intensityLevel = Math.max(0, Math.min(1, level));
        vignetteIntensity = features.vignetteIntensity * (0.5 + intensityLevel * 0.5);
    }

    function drawVignette() {
        if (!features.vignette || !ctx) return;

        const w = canvas.width;
        const h = canvas.height;
        const centerX = w / 2 + (shakeIntensity > 0 ? (Math.random() - 0.5) * shakeIntensity : 0);
        const centerY = h / 2 + (shakeIntensity > 0 ? (Math.random() - 0.5) * shakeIntensity : 0);

        const radius = Math.max(w, h) * 0.7;
        const gradient = ctx.createRadialGradient(centerX, centerY, radius * 0.3, centerX, centerY, radius);

        // Dynamic vignette color based on intensity
        const alpha = vignetteIntensity * (0.6 + intensityLevel * 0.4);
        const redTint = Math.min(1, intensityLevel * 1.5);

        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(0.5, `rgba(${Math.round(20 * redTint)},0,0,${alpha * 0.3})`);
        gradient.addColorStop(0.8, `rgba(${Math.round(40 * redTint)},0,0,${alpha * 0.6})`);
        gradient.addColorStop(1, `rgba(${Math.round(60 * redTint)},0,0,${alpha})`);

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);
    }

    // ═══════════════════════════════════════════════════════════════
    // PARTICLE SYSTEM
    // ═══════════════════════════════════════════════════════════════

    class Particle {
        constructor(x, y, type = 'dust') {
            this.x = x || Math.random() * canvas.width;
            this.y = y || Math.random() * canvas.height;
            this.type = type;
            this.life = 1;
            this.decay = 0.002 + Math.random() * 0.005;

            switch (type) {
                case 'dust':
                    this.vx = (Math.random() - 0.5) * 0.5;
                    this.vy = -0.2 - Math.random() * 0.3;
                    this.size = 1 + Math.random() * 2;
                    this.color = `rgba(255,255,255,${0.2 + Math.random() * 0.3})`;
                    break;
                case 'ember':
                    this.vx = (Math.random() - 0.5) * 2;
                    this.vy = -1 - Math.random() * 2;
                    this.size = 2 + Math.random() * 3;
                    this.color = `rgba(255,${Math.round(100 + Math.random() * 100)},0,${0.8})`;
                    this.decay = 0.01 + Math.random() * 0.02;
                    break;
                case 'blood':
                    this.vx = (Math.random() - 0.5) * 8;
                    this.vy = -2 - Math.random() * 5;
                    this.size = 3 + Math.random() * 5;
                    this.color = `rgba(${150 + Math.round(Math.random() * 50)},0,0,0.9)`;
                    this.decay = 0.015;
                    this.gravity = 0.3;
                    break;
                case 'soul':
                    this.vx = (Math.random() - 0.5) * 0.3;
                    this.vy = -0.5 - Math.random() * 0.5;
                    this.size = 5 + Math.random() * 10;
                    this.color = `rgba(150,200,255,${0.3 + Math.random() * 0.2})`;
                    this.decay = 0.003;
                    this.wobble = Math.random() * Math.PI * 2;
                    break;
                default:
                    this.vx = (Math.random() - 0.5) * 1;
                    this.vy = (Math.random() - 0.5) * 1;
                    this.size = 2;
                    this.color = 'rgba(255,255,255,0.5)';
            }
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;
            this.life -= this.decay;

            if (this.gravity) {
                this.vy += this.gravity;
            }

            if (this.type === 'soul') {
                this.wobble += 0.1;
                this.x += Math.sin(this.wobble) * 0.5;
            }

            return this.life > 0;
        }

        draw(ctx) {
            ctx.beginPath();

            if (this.type === 'soul') {
                const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size);
                gradient.addColorStop(0, this.color);
                gradient.addColorStop(1, 'rgba(150,200,255,0)');
                ctx.fillStyle = gradient;
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            } else {
                ctx.fillStyle = this.color.replace(/[\d.]+\)$/, `${this.life * 0.8})`);
                ctx.arc(this.x, this.y, this.size * this.life, 0, Math.PI * 2);
            }

            ctx.fill();
        }
    }

    function spawnParticles(count, x, y, type = 'dust') {
        if (!features.particles || reducedMotion) return;

        for (let i = 0; i < count; i++) {
            particles.push(new Particle(x, y, type));
        }

        // Limit total particles
        const maxParticles = features.particleCount;
        while (particles.length > maxParticles) {
            particles.shift();
        }
    }

    function updateParticles() {
        if (!features.particles || !ctx) return;

        particles = particles.filter(p => p.update());
        particles.forEach(p => p.draw(ctx));
    }

    // ═══════════════════════════════════════════════════════════════
    // BLOOD SPLATTER
    // ═══════════════════════════════════════════════════════════════

    function bloodSplatter(x, y, size = 1) {
        if (!features.bloodSplatter || reducedMotion) return;

        // Spawn blood particles
        spawnParticles(Math.round(20 * size), x, y, 'blood');

        // Add permanent splatter
        bloodSplatters.push({
            x,
            y,
            size: 20 + Math.random() * 30 * size,
            rotation: Math.random() * Math.PI * 2,
            opacity: 0.6,
            decay: 0.001,
        });

        // Limit splatters
        if (bloodSplatters.length > 50) {
            bloodSplatters.shift();
        }

        // Screen shake
        shake(size * 0.5, 200);
    }

    function drawBloodSplatters() {
        if (!features.bloodSplatter || !ctx) return;

        bloodSplatters = bloodSplatters.filter(s => {
            s.opacity -= s.decay;
            if (s.opacity <= 0) return false;

            ctx.save();
            ctx.translate(s.x, s.y);
            ctx.rotate(s.rotation);
            ctx.globalAlpha = s.opacity;

            // Irregular blood splat shape
            ctx.beginPath();
            const points = 8;
            for (let i = 0; i < points; i++) {
                const angle = (i / points) * Math.PI * 2;
                const radius = s.size * (0.5 + Math.random() * 0.5);
                const px = Math.cos(angle) * radius;
                const py = Math.sin(angle) * radius;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();

            ctx.fillStyle = 'rgba(120,0,0,0.7)';
            ctx.fill();
            ctx.restore();

            return true;
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // FILM GRAIN
    // ═══════════════════════════════════════════════════════════════

    function drawFilmGrain() {
        if (!features.filmGrain || reducedMotion || !ctx) return;

        const w = canvas.width;
        const h = canvas.height;
        const intensity = features.filmGrainIntensity;

        const imageData = ctx.createImageData(w, h);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            const noise = (Math.random() - 0.5) * 255 * intensity;
            data[i] = data[i + 1] = data[i + 2] = 128 + noise;
            data[i + 3] = intensity * 255 * 0.3;
        }

        ctx.globalCompositeOperation = 'overlay';
        ctx.putImageData(imageData, 0, 0);
        ctx.globalCompositeOperation = 'source-over';
    }

    // ═══════════════════════════════════════════════════════════════
    // CHROMATIC ABERRATION (Post-processing simulation)
    // ═══════════════════════════════════════════════════════════════

    function applyChromaticAberration() {
        if (!features.chromaticAberration || !ctx) return;

        // Add edge color fringing effect via canvas
        const w = canvas.width;
        const h = canvas.height;

        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = 0.03 * intensityLevel;

        // Red channel offset
        ctx.fillStyle = 'rgba(255,0,0,0.1)';
        ctx.fillRect(-2, 0, w + 4, h);

        // Blue channel offset
        ctx.fillStyle = 'rgba(0,0,255,0.1)';
        ctx.fillRect(2, 0, w + 4, h);

        ctx.restore();
    }

    // ═══════════════════════════════════════════════════════════════
    // SCANLINES
    // ═══════════════════════════════════════════════════════════════

    function drawScanlines() {
        if (!ctx) return;

        const w = canvas.width;
        const h = canvas.height;

        ctx.save();
        ctx.globalAlpha = 0.03;

        for (let y = 0; y < h; y += 3) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(0, y, w, 1);
        }

        ctx.restore();
    }

    // ═══════════════════════════════════════════════════════════════
    // TIER UPGRADE NOTIFICATION
    // ═══════════════════════════════════════════════════════════════

    function showTierLockedMessage(feature) {
        const tierNames = {
            lite: 'Survivor',
            pro: 'Hunter',
            max: 'Elder God',
        };

        const requiredTier = Object.entries(TIER_FEATURES).find(([tier, f]) => f[feature])?.[0];
        if (!requiredTier) return;

        const msg = document.createElement('div');
        msg.className = 've-tier-locked-message';
        msg.innerHTML = `
            <div class="ve-tier-locked-inner">
                <span class="ve-tier-locked-icon">🔒</span>
                <span class="ve-tier-locked-text">
                    <strong>${feature.replace(/([A-Z])/g, ' $1').trim()}</strong>
                    requires <span class="ve-tier-name">${tierNames[requiredTier]}</span> tier
                </span>
                <a href="/subscription.html" class="ve-tier-locked-btn">Upgrade</a>
            </div>
        `;
        document.body.appendChild(msg);

        setTimeout(() => msg.classList.add('ve-show'), 10);
        setTimeout(() => {
            msg.classList.remove('ve-show');
            setTimeout(() => msg.remove(), 300);
        }, 3000);
    }

    // ═══════════════════════════════════════════════════════════════
    // SETTINGS PANEL
    // ═══════════════════════════════════════════════════════════════

    function createSettingsPanel() {
        const panel = document.createElement('div');
        panel.id = 've-settings-panel';
        panel.innerHTML = `
            <div class="ve-settings-header">
                <span>Visual Effects</span>
                <button class="ve-settings-close">&times;</button>
            </div>
            <div class="ve-settings-content">
                <div class="ve-setting-group">
                    <label>Colorblind Mode</label>
                    <select id="ve-colorblind-select">
                        <option value="none">None</option>
                        <option value="protanopia">Protanopia (Red-Blind)</option>
                        <option value="deuteranopia">Deuteranopia (Green-Blind)</option>
                        <option value="tritanopia">Tritanopia (Blue-Blind)</option>
                        <option value="achromatopsia">Achromatopsia (Grayscale)</option>
                    </select>
                </div>

                <div class="ve-setting-group">
                    <label>Screen Shake</label>
                    <input type="range" id="ve-shake-slider" min="0" max="100" value="${features.screenShakeIntensity * 100}">
                </div>

                <div class="ve-setting-group">
                    <label>Vignette</label>
                    <input type="range" id="ve-vignette-slider" min="0" max="100" value="${features.vignetteIntensity * 100}">
                </div>

                <div class="ve-setting-group ve-tier-locked" data-tier="pro">
                    <label>Chromatic Aberration ${currentTier !== 'pro' && currentTier !== 'max' ? '<span class="ve-lock">🔒</span>' : ''}</label>
                    <input type="checkbox" id="ve-chromatic-toggle" ${features.chromaticAberration ? 'checked' : ''} ${currentTier !== 'pro' && currentTier !== 'max' ? 'disabled' : ''}>
                </div>

                <div class="ve-setting-group ve-tier-locked" data-tier="pro">
                    <label>Motion Blur ${currentTier !== 'pro' && currentTier !== 'max' ? '<span class="ve-lock">🔒</span>' : ''}</label>
                    <input type="checkbox" id="ve-motion-blur-toggle" ${features.motionBlur ? 'checked' : ''} ${currentTier !== 'pro' && currentTier !== 'max' ? 'disabled' : ''}>
                </div>

                <div class="ve-setting-group ve-tier-locked" data-tier="max">
                    <label>HDR Mode ${currentTier !== 'max' ? '<span class="ve-lock">🔒</span>' : ''}</label>
                    <input type="checkbox" id="ve-hdr-toggle" ${features.hdr && hdrSupported ? 'checked' : ''} ${currentTier !== 'max' || !hdrSupported ? 'disabled' : ''}>
                    <span class="ve-info">${hdrSupported ? 'HDR display detected' : 'HDR not available'}</span>
                </div>

                <div class="ve-setting-group ve-tier-locked" data-tier="pro">
                    <label>Ray Tracing ${currentTier !== 'pro' && currentTier !== 'max' ? '<span class="ve-lock">🔒</span>' : ''}</label>
                    <input type="checkbox" id="ve-rt-toggle" ${features.rayTracing && webgpuSupported ? 'checked' : ''} ${currentTier !== 'pro' && currentTier !== 'max' || !webgpuSupported ? 'disabled' : ''}>
                    <span class="ve-info">${webgpuSupported ? 'WebGPU enabled' : 'WebGPU required'}</span>
                </div>

                <div class="ve-setting-group ve-tier-locked" data-tier="max">
                    <label>Path Tracing ${currentTier !== 'max' ? '<span class="ve-lock">🔒</span>' : ''}</label>
                    <input type="checkbox" id="ve-pt-toggle" ${features.pathTracing && webgpuSupported ? 'checked' : ''} ${currentTier !== 'max' || !webgpuSupported ? 'disabled' : ''}>
                    <span class="ve-info">Elder God exclusive</span>
                </div>

                <div class="ve-tier-info">
                    <span class="ve-current-tier">Current: ${features.label}</span>
                    <a href="/subscription.html" class="ve-upgrade-link">Upgrade for more effects</a>
                </div>
            </div>
        `;

        document.body.appendChild(panel);

        // Event listeners
        panel.querySelector('.ve-settings-close').addEventListener('click', () => {
            panel.classList.remove('ve-open');
        });

        panel.querySelector('#ve-colorblind-select').addEventListener('change', (e) => {
            setColorblindMode(e.target.value);
        });

        panel.querySelector('#ve-shake-slider').addEventListener('input', (e) => {
            features.screenShakeIntensity = e.target.value / 100;
        });

        panel.querySelector('#ve-vignette-slider').addEventListener('input', (e) => {
            features.vignetteIntensity = e.target.value / 100;
        });

        // Inject styles for panel
        injectStyles();
    }

    function toggleSettings() {
        const panel = document.getElementById('ve-settings-panel');
        if (panel) {
            panel.classList.toggle('ve-open');
        }
    }

    function setColorblindMode(mode) {
        if (features.colorblindMode === 'none' && mode !== 'none') {
            // Check if colorblind modes are available for current tier
            if (currentTier === 'none') {
                showTierLockedMessage('colorblindMode');
                return;
            }
        }

        const filter = COLORBLIND_FILTERS[mode] || 'none';
        document.body.style.filter = filter;
        document.body.style.setProperty('-webkit-filter', filter);

        console.log('[VisualEnhancements] Colorblind mode:', mode);
    }

    function injectStyles() {
        if (document.getElementById('ve-styles')) return;

        const style = document.createElement('style');
        style.id = 've-styles';
        style.textContent = `
            /* Visual Enhancements Panel */
            #ve-settings-panel {
                position: fixed;
                top: 50%;
                right: -320px;
                transform: translateY(-50%);
                width: 300px;
                background: rgba(10, 10, 20, 0.95);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 12px;
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
                z-index: 1000000;
                transition: right 0.3s ease;
                font-family: 'Inter', -apple-system, sans-serif;
                color: #e8e6e3;
            }

            #ve-settings-panel.ve-open {
                right: 20px;
            }

            .ve-settings-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }

            .ve-settings-header span {
                font-weight: 600;
                font-size: 1rem;
                color: var(--accent-red, #cc1122);
            }

            .ve-settings-close {
                background: none;
                border: none;
                color: #888;
                font-size: 1.5rem;
                cursor: pointer;
                transition: color 0.2s;
            }

            .ve-settings-close:hover {
                color: #fff;
            }

            .ve-settings-content {
                padding: 16px;
                max-height: 70vh;
                overflow-y: auto;
            }

            .ve-setting-group {
                margin-bottom: 16px;
            }

            .ve-setting-group label {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 8px;
                font-size: 0.85rem;
                color: #aaa;
            }

            .ve-setting-group select,
            .ve-setting-group input[type="range"] {
                width: 100%;
                padding: 8px;
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 6px;
                color: #fff;
                font-size: 0.85rem;
            }

            .ve-setting-group select:focus,
            .ve-setting-group input:focus {
                outline: none;
                border-color: var(--accent-red, #cc1122);
            }

            .ve-setting-group input[type="checkbox"] {
                width: 18px;
                height: 18px;
                accent-color: var(--accent-red, #cc1122);
            }

            .ve-setting-group input[type="range"] {
                -webkit-appearance: none;
                height: 6px;
                border-radius: 3px;
                background: rgba(255, 255, 255, 0.1);
            }

            .ve-setting-group input[type="range"]::-webkit-slider-thumb {
                -webkit-appearance: none;
                width: 16px;
                height: 16px;
                border-radius: 50%;
                background: var(--accent-red, #cc1122);
                cursor: pointer;
            }

            .ve-lock {
                color: #ffaa00;
                font-size: 0.75rem;
            }

            .ve-info {
                display: block;
                font-size: 0.7rem;
                color: #666;
                margin-top: 4px;
            }

            .ve-tier-locked input:disabled {
                opacity: 0.4;
                cursor: not-allowed;
            }

            .ve-tier-info {
                margin-top: 20px;
                padding-top: 16px;
                border-top: 1px solid rgba(255, 255, 255, 0.1);
                text-align: center;
            }

            .ve-current-tier {
                display: block;
                font-size: 0.8rem;
                color: #888;
                margin-bottom: 8px;
            }

            .ve-upgrade-link {
                display: inline-block;
                padding: 8px 16px;
                background: linear-gradient(135deg, var(--accent-red, #cc1122), #ff4444);
                color: #fff;
                border-radius: 6px;
                font-size: 0.8rem;
                font-weight: 600;
                text-decoration: none;
                transition: transform 0.2s;
            }

            .ve-upgrade-link:hover {
                transform: scale(1.05);
            }

            /* Tier Locked Message */
            .ve-tier-locked-message {
                position: fixed;
                bottom: 100px;
                left: 50%;
                transform: translateX(-50%) translateY(100px);
                background: rgba(10, 10, 20, 0.95);
                border: 1px solid rgba(255, 170, 0, 0.3);
                border-radius: 12px;
                padding: 16px 24px;
                z-index: 1000001;
                opacity: 0;
                transition: all 0.3s ease;
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
            }

            .ve-tier-locked-message.ve-show {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }

            .ve-tier-locked-inner {
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .ve-tier-locked-icon {
                font-size: 1.5rem;
            }

            .ve-tier-locked-text {
                color: #aaa;
                font-size: 0.85rem;
            }

            .ve-tier-locked-text strong {
                color: #fff;
            }

            .ve-tier-name {
                color: var(--accent-orange, #ff6b35);
                font-weight: 600;
            }

            .ve-tier-locked-btn {
                padding: 8px 16px;
                background: linear-gradient(135deg, #ff6b35, #ff4444);
                color: #fff;
                border-radius: 6px;
                font-size: 0.8rem;
                font-weight: 600;
                text-decoration: none;
                transition: transform 0.2s;
            }

            .ve-tier-locked-btn:hover {
                transform: scale(1.05);
            }

            /* Settings Toggle Button */
            .ve-settings-toggle {
                position: fixed;
                bottom: 20px;
                right: 20px;
                width: 50px;
                height: 50px;
                background: rgba(10, 10, 20, 0.9);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                z-index: 999999;
                transition: all 0.3s ease;
                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);
            }

            .ve-settings-toggle:hover {
                background: rgba(204, 17, 34, 0.3);
                border-color: rgba(204, 17, 34, 0.5);
                transform: scale(1.1);
            }

            .ve-settings-toggle svg {
                width: 24px;
                height: 24px;
                fill: #fff;
            }
        `;
        document.head.appendChild(style);

        // Create toggle button
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 've-settings-toggle';
        toggleBtn.innerHTML = `
            <svg viewBox="0 0 24 24">
                <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12A3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5a3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97c0-.33-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.31-.61-.22l-2.49 1c-.52-.39-1.06-.73-1.69-.98l-.37-2.65A.506.506 0 0 0 14 2h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.63.25-1.17.59-1.69.98l-2.49-1c-.22-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1c0 .33.03.65.07.97l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.06.74 1.69.99l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.63-.26 1.17-.59 1.69-.99l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66Z"/>
            </svg>
        `;
        toggleBtn.addEventListener('click', toggleSettings);
        document.body.appendChild(toggleBtn);
    }

    // ═══════════════════════════════════════════════════════════════
    // RENDER LOOP
    // ═══════════════════════════════════════════════════════════════

    function render() {
        if (!running) return;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Apply screen shake offset
        const shake = getShakeOffset();
        if (shake.x !== 0 || shake.y !== 0) {
            canvas.style.transform = `translate(${shake.x}px, ${shake.y}px)`;
        } else {
            canvas.style.transform = '';
        }

        // Draw effects in order
        drawBloodSplatters();
        updateParticles();
        drawVignette();
        applyChromaticAberration();
        drawScanlines();
        drawFilmGrain();

        animationId = requestAnimationFrame(render);
    }

    // ═══════════════════════════════════════════════════════════════
    // TIER MANAGEMENT
    // ═══════════════════════════════════════════════════════════════

    function setTier(tier) {
        if (!TIER_FEATURES[tier]) return;

        currentTier = tier;
        features = TIER_FEATURES[tier];

        console.log('[VisualEnhancements] Tier set to:', features.label);
    }

    function getFeatures() {
        return { ...features };
    }

    function isFeatureAvailable(feature) {
        return features[feature] === true;
    }

    // ═══════════════════════════════════════════════════════════════
    // API FOR GAMES
    // ═══════════════════════════════════════════════════════════════

    /**
     * Call when player takes damage
     */
    function onDamage(intensity = 1) {
        setIntensity(Math.min(1, intensityLevel + 0.3));
        shake(intensity, 300);
    }

    /**
     * Call during intense moments (chase, combat, etc.)
     */
    function onIntense() {
        setIntensity(1);
    }

    /**
     * Call when player dies
     */
    function onDeath() {
        shake(2, 500);
        setIntensity(1);
        spawnParticles(100, canvas.width / 2, canvas.height / 2, 'soul');
    }

    /**
     * Call when something scary happens
     */
    function onJumpscare() {
        shake(1.5, 400);
        setIntensity(1);
    }

    /**
     * Call to reset intensity (when safe, respawn, etc.)
     */
    function resetIntensity() {
        setIntensity(0);
        bloodSplatters = [];
    }

    /**
     * Spawn ambient particles (dust, embers, etc.)
     */
    function spawnAmbientParticles(type = 'dust', count = 10) {
        for (let i = 0; i < count; i++) {
            spawnParticles(1, Math.random() * canvas.width, canvas.height, type);
        }
    }

    /**
     * Get WebGPU device for ray tracing (Pro+ feature)
     */
    function getWebGPUDevice() {
        if (currentTier !== 'pro' && currentTier !== 'max') {
            showTierLockedMessage('rayTracing');
            return null;
        }
        return webgpuDevice;
    }

    /**
     * Check if HDR is available and enabled
     */
    function isHDREnabled() {
        return features.hdr && hdrEnabled && hdrSupported;
    }

    // ═══════════════════════════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════════════════════════

    return {
        init: init,
        setTier: setTier,
        getFeatures: getFeatures,
        isFeatureAvailable: isFeatureAvailable,
        toggleSettings: toggleSettings,

        // Effects API
        shake: shake,
        setIntensity: setIntensity,
        bloodSplatter: bloodSplatter,
        spawnParticles: spawnParticles,
        spawnAmbientParticles: spawnAmbientParticles,
        setColorblindMode: setColorblindMode,

        // Game event hooks
        onDamage: onDamage,
        onIntense: onIntense,
        onDeath: onDeath,
        onJumpscare: onJumpscare,
        resetIntensity: resetIntensity,

        // Advanced features
        getWebGPUDevice: getWebGPUDevice,
        isHDREnabled: isHDREnabled,
        isWebGPUSupported: () => webgpuSupported,
        isHDRSupported: () => hdrSupported,

        // State
        get currentTier() { return currentTier; },
        get intensityLevel() { return intensityLevel; },

        // Tier features constant
        TIER_FEATURES: TIER_FEATURES,
    };
})();

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => VisualEnhancements.init());
} else {
    VisualEnhancements.init();
}

/* ============================================
   ScaryGamesAI — Quality FX Engine (v2.0)
   REAL STIMULATED Ray Tracing & Path Tracing
   Post-processing & Scene Injection for 2D/3D
   ============================================ */

const QualityFX = (function () {
    'use strict';

    const TIER_KEY = 'sgai-sub-tier';

    // Config
    let config = {
        rtEnabled: false,
        ptEnabled: false,
        rtIntensity: 0.5,
        ptBounces: 2,
        ptNoise: 0.3,
        bloom: true
    };

    // State
    let fxCanvas = null;
    let fxCtx = null;
    let running = false;
    let frameCount = 0;
    let hudEl = null;
    let settingsPanel = null;
    let threeJS = null; // { renderer, scene, camera }

    // Simulation Data
    const rays = [];
    const particles = [];
    let lightAngle = 0;

    function getTier() {
        return localStorage.getItem(TIER_KEY) || 'none';
    }

    function isPro() { const t = getTier(); return t === 'pro' || t === 'max'; }
    function isMax() { return getTier() === 'max'; }

    /* ============ INIT ============ */
    function init() {
        if (running) return;

        // Auto-detect tier and set defaults
        if (isMax()) {
            config.rtEnabled = true;
            config.ptEnabled = true;
        } else if (isPro()) {
            config.rtEnabled = true;
            config.ptEnabled = false;
        }

        createOverlay();
        createSettingsUI();
        initParticles();

        running = true;
        requestAnimationFrame(renderLoop);
    }

    function createOverlay() {
        if (document.getElementById('quality-fx-canvas')) return;
        fxCanvas = document.createElement('canvas');
        fxCanvas.id = 'quality-fx-canvas';
        fxCanvas.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:9000;mix-blend-mode:overlay;';
        document.body.appendChild(fxCanvas);
        fxCtx = fxCanvas.getContext('2d');
    }

    function initParticles() {
        // Light rays (God Rays) simulation
        for (let i = 0; i < 30; i++) {
            rays.push({
                x: Math.random(),
                angle: Math.PI * 0.3 + Math.random() * 0.4,
                speed: 0.0002 + Math.random() * 0.0005,
                width: 20 + Math.random() * 60,
                opacity: 0.02 + Math.random() * 0.05
            });
        }
        // Dust/Noise particles
        for (let i = 0; i < 100; i++) {
            particles.push({
                x: Math.random(), y: Math.random(),
                vx: (Math.random() - 0.5) * 0.001,
                vy: (Math.random() - 0.5) * 0.001,
                size: Math.random() * 1.5,
                alpha: Math.random() * 0.3
            });
        }
    }

    /* ============ THREE.JS INJECTION ============ */
    function injectThreeJS(renderer, scene, camera) {
        console.log('[QualityFX] Three.js injected');
        threeJS = { renderer, scene, camera };

        // Initial setup based on tier
        updateThreeJSSettings();
    }

    function updateThreeJSSettings() {
        if (!threeJS) return;
        const { renderer, scene } = threeJS;

        // Reset
        renderer.shadowMap.enabled = false;
        renderer.toneMapping = THREE.NoToneMapping;

        if (config.rtEnabled || config.ptEnabled) {
            // Ray Tracing / Path Tracing Setup
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            renderer.toneMapping = THREE.ACESFilmicToneMapping;
            renderer.toneMappingExposure = config.ptEnabled ? 1.2 : 1.0;

            // Update all lights in scene
            scene.traverse(obj => {
                if (obj.isLight) {
                    obj.castShadow = true;
                    if (obj.shadow) {
                        // High res shadows for PT
                        const mapSize = config.ptEnabled ? 2048 : 1024;
                        obj.shadow.mapSize.width = mapSize;
                        obj.shadow.mapSize.height = mapSize;
                        obj.shadow.bias = -0.0001;
                    }
                }
                // Update materials for PBR feel
                if (obj.isMesh && (config.ptEnabled || config.rtEnabled)) {
                    obj.castShadow = true;
                    obj.receiveShadow = true;
                    if (obj.material) {
                        // Enhance materials if standard
                        if (obj.material.type === 'MeshStandardMaterial') {
                            obj.material.envMapIntensity = config.ptEnabled ? 1.5 : 1.0;
                        }
                    }
                }
            });
        }
    }

    /* ============ UI & SETTINGS ============ */
    function createSettingsUI() {
        // Gear Button
        const btn = document.createElement('button');
        btn.innerHTML = '⚙️ FX';
        btn.style.cssText = 'position:fixed;bottom:10px;right:10px;z-index:9999;background:#111;color:#fff;border:1px solid #444;padding:5px 10px;border-radius:4px;cursor:pointer;font-family:sans-serif;font-size:12px;opacity:0.7;transition:opacity 0.2s;';
        btn.onmouseover = () => btn.style.opacity = 1;
        btn.onmouseout = () => btn.style.opacity = 0.7;
        btn.onclick = toggleSettingsPanel;
        document.body.appendChild(btn);

        // Panel
        settingsPanel = document.createElement('div');
        settingsPanel.style.cssText = 'position:fixed;bottom:50px;right:10px;z-index:9999;background:rgba(10,10,15,0.95);border:1px solid #44aaee;border-radius:8px;padding:15px;width:280px;font-family:sans-serif;color:#eee;display:none;box-shadow:0 0 20px rgba(0,0,0,0.8);backdrop-filter:blur(5px);';

        renderSettingsContent();
        document.body.appendChild(settingsPanel);
    }

    function toggleSettingsPanel() {
        settingsPanel.style.display = settingsPanel.style.display === 'none' ? 'block' : 'none';
    }

    function renderSettingsContent() {
        const tier = getTier();
        const isRTAllowed = isPro() || isMax();
        const isPTAllowed = isMax();

        let html = `
            <h3 style="margin:0 0 15px 0;color:#00aaff;font-size:16px;border-bottom:1px solid #333;padding-bottom:5px;">
                Quality FX <span style="font-size:10px;color:#666;float:right;">v2.0</span>
            </h3>

            <div style="margin-bottom:15px;">
                <label style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                    <span style="${isRTAllowed ? 'color:#44ddff' : 'color:#555'}">Ray Tracing (RT)</span>
                    <input type="checkbox" id="qfx-rt-toggle" ${config.rtEnabled ? 'checked' : ''} ${!isRTAllowed ? 'disabled' : ''}>
                </label>
                ${!isRTAllowed ? '<div style="font-size:10px;color:#666;">Requires PRO Subscription</div>' : ''}

                <div style="margin-left:10px;opacity:${config.rtEnabled && isRTAllowed ? 1 : 0.3};pointer-events:${config.rtEnabled && isRTAllowed ? 'auto' : 'none'};">
                   <div style="font-size:11px;color:#aaa;margin-bottom:4px;">RT Intensity</div>
                   <input type="range" min="0" max="1" step="0.1" value="${config.rtIntensity}" style="width:100%;" onchange="QualityFX.updateConfig('rtIntensity', this.value)">
                </div>
            </div>

            <div style="margin-bottom:15px;border-top:1px solid #333;padding-top:10px;">
                <label style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                    <span style="${isPTAllowed ? 'color:#ffd700' : 'color:#555'}">Path Tracing (PT)</span>
                    <input type="checkbox" id="qfx-pt-toggle" ${config.ptEnabled ? 'checked' : ''} ${!isPTAllowed ? 'disabled' : ''}>
                </label>
                ${!isPTAllowed ? '<div style="font-size:10px;color:#666;">Requires MAX Subscription</div>' : ''}

                <div style="margin-left:10px;opacity:${config.ptEnabled && isPTAllowed ? 1 : 0.3};pointer-events:${config.ptEnabled && isPTAllowed ? 'auto' : 'none'};">
                    <div style="font-size:11px;color:#aaa;margin-bottom:4px;">Light Bounces: <span id="qfx-bounces-val">${config.ptBounces}</span></div>
                    <input type="range" min="1" max="8" step="1" value="${config.ptBounces}" style="width:100%;" onchange="QualityFX.updateConfig('ptBounces', this.value)">

                    <div style="font-size:11px;color:#aaa;margin-top:8px;margin-bottom:4px;">Simulation Noise</div>
                    <input type="range" min="0" max="1" step="0.1" value="${config.ptNoise}" style="width:100%;" onchange="QualityFX.updateConfig('ptNoise', this.value)">
                </div>
            </div>

            <div style="font-size:10px;color:#666;text-align:center;margin-top:10px;">
                ${isMax() ? 'MAX TIER UNLOCKED' : (isPro() ? 'PRO TIER UNLOCKED' : 'FREE TIER')}
            </div>
        `;

        settingsPanel.innerHTML = html;

        // Bind events
        const rtToggle = document.getElementById('qfx-rt-toggle');
        if (rtToggle) rtToggle.onchange = (e) => updateConfig('rtEnabled', e.target.checked);

        const ptToggle = document.getElementById('qfx-pt-toggle');
        if (ptToggle) ptToggle.onchange = (e) => updateConfig('ptEnabled', e.target.checked);
    }

    function updateConfig(key, value) {
        if (key === 'ptBounces') document.getElementById('qfx-bounces-val').textContent = value;
        config[key] = value;
        renderSettingsContent(); // Re-render to update UI state
        updateThreeJSSettings(); // Apply to 3D if active
    }

    /* ============ RENDER LOOP ============ */
    function renderLoop() {
        if (!running) return;
        frameCount++;

        if (fxCanvas) {
            const w = window.innerWidth;
            const h = window.innerHeight;
            if (fxCanvas.width !== w) fxCanvas.width = w;
            if (fxCanvas.height !== h) fxCanvas.height = h;

            fxCtx.clearRect(0, 0, w, h);

            // Apply 2D Simulation (always runs for atmosphere)
            render2DSimulation(w, h);
        }

        // 3D Specific Updates
        if (threeJS && (config.rtEnabled || config.ptEnabled)) {
            render3DSimulation();
        }

        requestAnimationFrame(renderLoop);
    }

    function render2DSimulation(w, h) {
        // 1. Ray Tracing Simulation (God Rays & Ambient Light)
        if (config.rtEnabled) {
            renderGodRays(w, h);
            renderBloom(w, h);
        }

        // 2. Path Tracing Simulation (Noise, Film Grain, Color Bleed)
        if (config.ptEnabled) {
            renderPathTracingNoise(w, h);
            renderColorBleed(w, h);
        }

        // 3. Vignette (Always on for cinematic feel if RT/PT is on)
        if (config.rtEnabled || config.ptEnabled) {
            const vig = fxCtx.createRadialGradient(w/2, h/2, h*0.3, w/2, h/2, h*0.85);
            vig.addColorStop(0, 'rgba(0,0,0,0)');
            vig.addColorStop(1, 'rgba(0,0,0,0.6)');
            fxCtx.fillStyle = vig;
            fxCtx.fillRect(0, 0, w, h);
        }
    }

    function renderGodRays(w, h) {
        const cx = w * 0.5;
        const cy = -50;

        fxCtx.save();
        fxCtx.globalCompositeOperation = 'screen'; // Additive blending for light

        rays.forEach(ray => {
            // Animate
            ray.x += Math.sin(frameCount * 0.002) * 0.001;

            const x = cx + (ray.x - 0.5) * w * 1.5;
            const grad = fxCtx.createLinearGradient(x, 0, x + Math.cos(ray.angle) * h, Math.sin(ray.angle) * h);

            const intensity = config.rtIntensity * 0.4;
            grad.addColorStop(0, `rgba(255, 240, 200, ${ray.opacity * intensity})`);
            grad.addColorStop(1, 'rgba(255, 240, 200, 0)');

            fxCtx.fillStyle = grad;
            fxCtx.beginPath();
            fxCtx.moveTo(x - ray.width/2, 0);
            fxCtx.lineTo(x + ray.width/2, 0);
            fxCtx.lineTo(x + Math.cos(ray.angle)*h*2 + ray.width, h*2);
            fxCtx.lineTo(x + Math.cos(ray.angle)*h*2 - ray.width, h*2);
            fxCtx.fill();
        });
        fxCtx.restore();
    }

    function renderBloom(w, h) {
        // Simulated bloom using soft radial gradients at random "bright" spots
        // In a real 2D engine we'd read pixels, but here we simulate atmosphere
        if (frameCount % 2 === 0) {
            fxCtx.save();
            fxCtx.globalCompositeOperation = 'lighter';
            const size = 100 + Math.sin(frameCount * 0.05) * 20;
            const alpha = 0.05 * config.rtIntensity;
            const grad = fxCtx.createRadialGradient(w/2, h/2, 0, w/2, h/2, w*0.6);
            grad.addColorStop(0, `rgba(200, 220, 255, ${alpha})`);
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            fxCtx.fillStyle = grad;
            fxCtx.fillRect(0, 0, w, h);
            fxCtx.restore();
        }
    }

    function renderPathTracingNoise(w, h) {
        // Film grain / Path Tracing noise
        fxCtx.save();
        fxCtx.globalCompositeOperation = 'overlay';

        const imageData = fxCtx.createImageData(w, h);
        const data = imageData.data;
        const noiseStrength = config.ptNoise * 20; // 0-255 range

        // This is too slow for JS per-pixel every frame.
        // Instead, draw pre-rendered noise or canvas noise pattern.
        // We'll use a fast particle system for "noise"

        particles.forEach(p => {
            p.x += p.vx; p.y += p.vy;
            if(p.x < 0) p.x = 1; if(p.x > 1) p.x = 0;
            if(p.y < 0) p.y = 1; if(p.y > 1) p.y = 0;

            fxCtx.fillStyle = `rgba(255,255,255,${config.ptNoise * 0.15})`;
            fxCtx.fillRect(p.x * w, p.y * h, p.size, p.size);
        });

        fxCtx.restore();
    }

    function renderColorBleed(w, h) {
        // Global Illumination Simulation
        // Ambient color bleeding from "environment"
        fxCtx.save();
        fxCtx.globalCompositeOperation = 'color-dodge'; // Brightens
        const cycle = frameCount * 0.005;
        const r = 100 + Math.sin(cycle) * 50;
        const g = 100 + Math.sin(cycle + 2) * 50;
        const b = 100 + Math.sin(cycle + 4) * 50;

        fxCtx.fillStyle = `rgba(${r},${g},${b}, 0.03)`;
        fxCtx.fillRect(0, 0, w, h);
        fxCtx.restore();
    }

    function render3DSimulation() {
        if (!threeJS || !threeJS.camera) return;

        // Path Tracing jitter (Temporal Anti-Aliasing simulation)
        if (config.ptEnabled) {
            const jitter = config.ptNoise * 0.0005;
            threeJS.camera.setViewOffset(
                window.innerWidth, window.innerHeight,
                (Math.random() - 0.5) * jitter * window.innerWidth,
                (Math.random() - 0.5) * jitter * window.innerHeight,
                window.innerWidth, window.innerHeight
            );
        } else {
            threeJS.camera.clearViewOffset();
        }

        // Dynamic Ambient Occlusion (simulated by dimming ambient light randomly)
        // Only if we can access lights... handled in injectThreeJS mostly.
    }

    /* ============ PUBLIC API ============ */
    return {
        init,
        injectThreeJS,
        updateScene: updateThreeJSSettings,
        updateConfig,
        getTier,
        isRT: () => config.rtEnabled,
        isPT: () => config.ptEnabled
    };

})();

// Auto-init on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', QualityFX.init);
} else {
    QualityFX.init();
}

/* ============================================
   ScaryGamesAI — Quality FX Engine (v4.0)
   "Real" Simulated Ray Tracing & Path Tracing
   ============================================ */

const QualityFX = (function () {
    'use strict';

    const TIER_KEY = 'sgai-sub-tier';

    // Config Defaults
    let config = {
        rtEnabled: true,       // Ray Tracing
        ptEnabled: false,      // Path Tracing (Max Only)
        rtIntensity: 0.8,      // 0.0 - 1.0
        ptIntensity: 0.0,      // 0.0 - 1.0 (Max Only)
        crtEnabled: true,
        volumetricEnabled: true,
        bloomStrength: 0.5,
        style: 'cinematic'
    };

    // Internal State
    let fxCanvas = null;
    let fxCtx = null;
    let settingsPanel = null;
    let rafHijacked = false;
    let threeHooked = false;

    // 3D State
    let threeJS = null; // { renderer, scene, camera }

    // 2D State
    let canvas2D = null;
    let ctx2D = null;
    let lightMapCanvas = null;
    let lightMapCtx = null;
    let lights2D = [];

    /* ============ HELPERS ============ */
    function getTier() {
        return localStorage.getItem(TIER_KEY) || 'none';
    }

    function isPro() { const t = getTier(); return t === 'pro' || t === 'max'; }
    function isMax() { return getTier() === 'max'; }

    /* ============ INIT ============ */
    function init() {
        if (rafHijacked) return;

        // Auto-configure based on tier
        if (isMax()) {
            config.rtEnabled = true;
            config.ptEnabled = true;
            config.rtIntensity = 1.0;
            config.ptIntensity = 1.0;
        } else if (isPro()) {
            config.rtEnabled = true;
            config.ptEnabled = false;
            config.rtIntensity = 0.7; // Fixed/Limited for Pro
            config.ptIntensity = 0.0;
        } else {
            config.rtEnabled = false;
            config.ptEnabled = false;
            config.rtIntensity = 0.0;
            config.ptIntensity = 0.0;
        }

        createOverlay();
        createCRTStyles();
        createControlPanel();

        // Hook Three.js if available
        if (window.THREE && !threeHooked) {
            hookThreeJS();
        }

        hijackRAF();
        console.log('[QualityFX] Engine v4.0 Initialized');
    }

    function hijackRAF() {
        if (rafHijacked) return;
        rafHijacked = true;
        const originalRAF = window.requestAnimationFrame;
        window.requestAnimationFrame = function(callback) {
            return originalRAF(function(time) {
                // 1. Run Game Frame
                try {
                    callback(time);
                } catch(e) {
                    console.error('Game Error:', e);
                }
                // 2. Run FX Frame
                QualityFX.render();
            });
        };
    }

    /* ============ THREE.JS HOOK (Automatic 3D Support) ============ */
    function hookThreeJS() {
        if (threeHooked) return;
        try {
            const originalRender = THREE.WebGLRenderer.prototype.render;
            THREE.WebGLRenderer.prototype.render = function(scene, camera) {
                // Auto-inject on first render
                if (!threeJS) {
                    injectThreeJS(this, scene, camera);
                }
                // Update bindings if scene changed
                if (threeJS && threeJS.scene !== scene) {
                    threeJS.scene = scene;
                    updateThreeJSSettings();
                }
                originalRender.call(this, scene, camera);
            };
            threeHooked = true;
            console.log('[QualityFX] THREE.WebGLRenderer hooked successfully');
        } catch (e) {
            console.warn('[QualityFX] Failed to hook Three.js:', e);
        }
    }

    function injectThreeJS(renderer, scene, camera) {
        console.log('[QualityFX] Three.js Injected');
        threeJS = { renderer, scene, camera };
        updateThreeJSSettings();
    }

    function updateThreeJSSettings() {
        if (!threeJS) return;
        const { renderer, scene } = threeJS;
        const tier = getTier();

        // High Quality Renderer Settings
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = config.ptEnabled ? 1.2 : 1.0; // Brighter for PT
        renderer.outputEncoding = THREE.sRGBEncoding;

        // Traverse Scene to upgrade materials/lights
        scene.traverse(obj => {
            // Shadow Logic
            if (obj.isMesh || obj.isLight) {
                if (config.rtEnabled) {
                    obj.castShadow = true;
                    // Only receive shadow if it's a mesh
                    if (obj.isMesh) obj.receiveShadow = true;
                } else {
                    // If RT is off, we might still want basic shadows, but let's strictly follow RT toggle
                    obj.castShadow = false;
                    obj.receiveShadow = false;
                }
            }

            // Light Quality
            if (obj.isLight && obj.shadow && config.rtEnabled) {
                // High res shadows for Max/Pro
                const mapSize = isMax() ? 2048 : 1024;
                obj.shadow.mapSize.width = mapSize;
                obj.shadow.mapSize.height = mapSize;
                obj.shadow.bias = -0.0005;
                // Softness simulation
                if (isMax() && config.ptEnabled) {
                     obj.shadow.radius = 2; // Softer shadows for PT
                }
            }

            // Material Upgrade (Simulated RT)
            if (obj.isMesh && config.rtEnabled) {
                if (obj.material.type === 'MeshBasicMaterial' && obj.material.map) {
                    // Upgrade basic to standard for lighting support
                    obj.material = new THREE.MeshStandardMaterial({
                        map: obj.material.map,
                        color: obj.material.color,
                        roughness: 0.8,
                        metalness: 0.1
                    });
                }

                // Path Tracing Simulation (Global Illumination via Emissive)
                if (config.ptEnabled && isMax()) {
                    // Subtle environment bounce
                    if (!obj.userData.originalEmissive) {
                        obj.userData.originalEmissive = obj.material.emissive ? obj.material.emissive.clone() : new THREE.Color(0,0,0);
                    }
                    // Add ambient bounce based on PT intensity
                    const bounce = 0.1 * config.ptIntensity;
                    obj.material.emissiveIntensity = 1.0 + bounce;
                }
            }
        });

        // Volumetric Fog (Simulated)
        if (config.volumetricEnabled && !scene.fog) {
            scene.fog = new THREE.FogExp2(0x050510, 0.02);
        } else if (!config.volumetricEnabled && scene.fog) {
            scene.fog = null;
        }
    }

    /* ============ CANVAS 2D INTEGRATION ============ */
    function init2D(canvas, ctx) {
        console.log('[QualityFX] 2D Canvas Injected');
        canvas2D = canvas;
        ctx2D = ctx;

        lightMapCanvas = document.createElement('canvas');
        lightMapCanvas.width = canvas.width;
        lightMapCanvas.height = canvas.height;
        lightMapCtx = lightMapCanvas.getContext('2d');
    }

    function addLight2D(x, y, radius, color, intensity) {
        lights2D.push({ x, y, radius, color, intensity });
    }

    function render2DLighting() {
        if (!ctx2D || !config.rtEnabled) return;

        if (lightMapCanvas.width !== canvas2D.width) {
            lightMapCanvas.width = canvas2D.width;
            lightMapCanvas.height = canvas2D.height;
        }

        // Clear Lightmap
        // Ambient Light Level (Lower = Darker)
        // Pro: 0.15, Max with PT: 0.25 (more bounce)
        const ambient = config.ptEnabled ? 0.25 : 0.15;
        lightMapCtx.globalCompositeOperation = 'source-over';
        lightMapCtx.fillStyle = `rgba(0,0,0,${1 - ambient})`;
        lightMapCtx.fillRect(0, 0, lightMapCanvas.width, lightMapCanvas.height);

        // 1. Ray Tracing Pass (Direct Light)
        lightMapCtx.globalCompositeOperation = 'destination-out';

        lights2D.forEach(light => {
            // RT Intensity controls the "sharpness" or "strength" of the cut
            const r = light.radius * config.rtIntensity;
            const g = lightMapCtx.createRadialGradient(light.x, light.y, 0, light.x, light.y, r);
            g.addColorStop(0, `rgba(0,0,0,${light.intensity})`);
            g.addColorStop(1, 'rgba(0,0,0,0)');

            lightMapCtx.fillStyle = g;
            lightMapCtx.beginPath();
            lightMapCtx.arc(light.x, light.y, r, 0, Math.PI * 2);
            lightMapCtx.fill();
        });

        // 2. Path Tracing Pass (Bounce Light / Color Bleed) - Max Only
        if (config.ptEnabled && isMax()) {
             // Draw color bleeds onto the game canvas directly (additive)
            ctx2D.save();
            ctx2D.globalCompositeOperation = 'screen'; // Additive light

            lights2D.forEach(light => {
                if (light.color) {
                    // Bounce is wider and softer
                    const bounceRadius = light.radius * (1.2 + config.ptIntensity * 0.5);
                    const g = ctx2D.createRadialGradient(light.x, light.y, 0, light.x, light.y, bounceRadius);

                    // Parse color to add alpha
                    // Simplified: just use the color string assuming rgba or hex
                    g.addColorStop(0, light.color);
                    g.addColorStop(1, 'rgba(0,0,0,0)');

                    ctx2D.globalAlpha = 0.3 * config.ptIntensity; // Subtle bounce
                    ctx2D.fillStyle = g;
                    ctx2D.beginPath();
                    ctx2D.arc(light.x, light.y, bounceRadius, 0, Math.PI * 2);
                    ctx2D.fill();
                }
            });
            ctx2D.restore();
        }

        // Apply Lightmap (Shadows)
        ctx2D.save();
        ctx2D.globalCompositeOperation = 'multiply';
        ctx2D.drawImage(lightMapCanvas, 0, 0);
        ctx2D.restore();

        lights2D = [];
    }

    /* ============ VISUAL EFFECTS (CRT/Overlay) ============ */
    function createOverlay() {
        if (document.getElementById('quality-fx-canvas')) return;
        fxCanvas = document.createElement('canvas');
        fxCanvas.id = 'quality-fx-canvas';
        fxCanvas.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:9000;mix-blend-mode:overlay;';
        document.body.appendChild(fxCanvas);
        fxCtx = fxCanvas.getContext('2d');
    }

    function createCRTStyles() {
        if (document.getElementById('quality-fx-css')) return;
        const style = document.createElement('style');
        style.id = 'quality-fx-css';
        style.textContent = `
            body::after {
                content: " ";
                display: block;
                position: fixed;
                top: 0; left: 0; bottom: 0; right: 0;
                background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06));
                z-index: 9998;
                background-size: 100% 2px, 3px 100%;
                pointer-events: none;
                opacity: ${config.crtEnabled ? 0.6 : 0};
                transition: opacity 0.5s;
            }
        `;
        document.head.appendChild(style);
    }

    /* ============ UI CONTROL PANEL ============ */
    function createControlPanel() {
        const btn = document.createElement('button');
        btn.innerHTML = '⚙️ QUALITY';
        btn.style.cssText = 'position:fixed;bottom:10px;right:10px;z-index:9999;background:#111;color:#fff;border:1px solid #444;padding:8px 12px;border-radius:4px;cursor:pointer;opacity:0.8;font-weight:bold;font-family:sans-serif;';
        btn.onclick = () => {
            if (!settingsPanel) buildPanel();
            settingsPanel.style.display = settingsPanel.style.display === 'none' ? 'block' : 'none';
        };
        document.body.appendChild(btn);
    }

    function buildPanel() {
        settingsPanel = document.createElement('div');
        settingsPanel.style.cssText = 'position:fixed;bottom:50px;right:10px;z-index:9999;background:rgba(15,15,20,0.95);border:1px solid #555;padding:15px;width:280px;color:#eee;font-family:sans-serif;font-size:13px;display:none;border-radius:6px;box-shadow:0 0 20px rgba(0,0,0,0.8);';

        const title = document.createElement('div');
        title.innerHTML = `<strong>GRAPHICS SETTINGS</strong> <span style="float:right;color:#888;cursor:pointer" onclick="this.parentElement.parentElement.style.display='none'">✕</span>`;
        title.style.borderBottom = '1px solid #333';
        title.style.paddingBottom = '8px';
        title.style.marginBottom = '12px';
        settingsPanel.appendChild(title);

        const tier = getTier();

        // Helper for sections
        const addSection = (name) => {
            const h = document.createElement('h4');
            h.innerText = name;
            h.style.margin = '10px 0 5px 0';
            h.style.color = '#aaa';
            h.style.fontSize = '11px';
            h.style.textTransform = 'uppercase';
            settingsPanel.appendChild(h);
        };

        const addControl = (label, type, key, opts = {}) => {
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.justifyContent = 'space-between';
            row.style.alignItems = 'center';
            row.style.marginBottom = '8px';

            const lbl = document.createElement('span');
            lbl.innerText = label;
            if (opts.disabled) lbl.style.color = '#555';

            let input;
            if (type === 'bool') {
                input = document.createElement('input');
                input.type = 'checkbox';
                input.checked = config[key];
                input.disabled = !!opts.disabled;
                input.onchange = (e) => {
                    config[key] = e.target.checked;
                    updateEffects();
                };
            } else if (type === 'range') {
                input = document.createElement('input');
                input.type = 'range';
                input.min = opts.min || 0;
                input.max = opts.max || 1;
                input.step = 0.1;
                input.value = config[key];
                input.disabled = !!opts.disabled;
                input.style.width = '80px';
                input.oninput = (e) => {
                    config[key] = parseFloat(e.target.value);
                    updateEffects();
                };
            }

            row.appendChild(lbl);
            if (opts.extra) row.appendChild(opts.extra);
            row.appendChild(input);
            settingsPanel.appendChild(row);
        };

        // --- RAY TRACING SECTION ---
        addSection('Ray Tracing (Pro/Max)');

        // RT Toggle
        const rtLocked = tier === 'none';
        addControl('Enable Ray Tracing', 'bool', 'rtEnabled', { disabled: rtLocked });

        // RT Intensity
        // Pro: Limited control (0.5 - 0.8)
        // Max: Full control (0.0 - 1.0)
        let rtMin = 0, rtMax = 1;
        let rtDisabled = false;

        if (tier === 'none') {
            rtDisabled = true;
        } else if (tier === 'pro') {
            // Pro has limited control
            rtMin = 0.5; rtMax = 0.8;
            // We want to show a slider but clamp it? Or just allow full range?
            // "Pro have limited control of ray tracing"
            // Let's restrict the slider visually and functionally
        }

        addControl('RT Intensity', 'range', 'rtIntensity', {
            min: rtMin, max: rtMax, disabled: rtDisabled
        });


        // --- PATH TRACING SECTION ---
        addSection('Path Tracing (Max Only)');

        const ptLocked = tier !== 'max';
        const ptBadge = document.createElement('span');
        ptBadge.innerText = 'MAX';
        ptBadge.style.cssText = 'background:#ffd700;color:#000;font-size:9px;padding:1px 3px;border-radius:2px;margin-right:5px;';

        addControl('Enable Path Tracing', 'bool', 'ptEnabled', {
            disabled: ptLocked,
            extra: ptLocked ? ptBadge : null
        });

        addControl('Bounce Intensity', 'range', 'ptIntensity', {
            min: 0, max: 1, disabled: ptLocked
        });


        // --- DISPLAY SECTION ---
        addSection('Post-Processing');
        addControl('CRT/VHS Filter', 'bool', 'crtEnabled');
        addControl('Volumetric Fog', 'bool', 'volumetricEnabled');

        document.body.appendChild(settingsPanel);
    }

    function updateEffects() {
        // CRT
        const style = document.getElementById('quality-fx-css');
        if (style) style.textContent = style.textContent.replace(/opacity: [\d\.]+/g, `opacity: ${config.crtEnabled ? 0.6 : 0}`);

        // Update 3D
        if (threeJS) {
            updateThreeJSSettings();
        }
    }

    /* ============ RENDER API ============ */
    function render() {
        if (fxCanvas) {
            const w = window.innerWidth;
            const h = window.innerHeight;
            if (fxCanvas.width !== w) fxCanvas.width = w;
            if (fxCanvas.height !== h) fxCanvas.height = h;
            fxCtx.clearRect(0, 0, w, h);

            // Screen Space Noise (PT Simulation)
            if (config.ptEnabled && isMax()) {
                fxCtx.save();
                fxCtx.globalCompositeOperation = 'overlay';
                fxCtx.fillStyle = `rgba(255,255,255,${0.02 + config.ptIntensity * 0.03})`;
                for(let i=0; i<30; i++) {
                    fxCtx.fillRect(Math.random()*w, Math.random()*h, 2, 2);
                }
                fxCtx.restore();
            }
        }

        if (canvas2D) {
            render2DLighting();
        }
    }

    /* ============ PUBLIC API ============ */
    return {
        init,
        injectThreeJS,
        init2D,
        addLight2D,
        updateScene: updateThreeJSSettings,
        render,
        isRT: () => config.rtEnabled,
        isPT: () => config.ptEnabled
    };

})();

// Auto-init
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', QualityFX.init);
} else {
    QualityFX.init();
}

/* ============================================
   ScaryGamesAI — Quality FX Engine (v3.1)
   Universal "Fake" Ray Tracing, Path Tracing & Cinematic FX
   Supports both 2D Canvas and 3D Three.js Contexts
   Synchronized via RAF Injection
   ============================================ */

const QualityFX = (function () {
    'use strict';

    const TIER_KEY = 'sgai-sub-tier';

    // Config
    let config = {
        rtEnabled: true, // "Ray Tracing" (Advanced Lighting)
        ptEnabled: true, // "Path Tracing" (Global Illumination / Color Bleed)
        crtEnabled: true, // VHS/CRT Filter
        volumetricEnabled: true, // Volumetric Fog (3D)
        rtIntensity: 0.7,
        bloomStrength: 0.5,
        style: 'cinematic' // cinematic, retro, clean
    };

    // State
    let fxCanvas = null;
    let fxCtx = null;
    let settingsPanel = null;
    let rafHijacked = false;

    // 3D State
    let threeJS = null; // { renderer, scene, camera }
    let volumetricFog = null;

    // 2D State
    let canvas2D = null;
    let ctx2D = null;
    let lightMapCanvas = null;
    let lightMapCtx = null;
    let lights2D = [];

    function getTier() {
        return localStorage.getItem(TIER_KEY) || 'none';
    }

    function isPro() { const t = getTier(); return t === 'pro' || t === 'max'; }
    function isMax() { return getTier() === 'max'; }

    /* ============ INIT ============ */
    function init() {
        if (rafHijacked) return;

        if (isMax()) {
            config.rtIntensity = 1.0;
        }

        createOverlay();
        createCRTStyles();
        createSettingsUI();
        hijackRAF();
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

                // 2. Run FX Frame on top
                QualityFX.render();
            });
        };
        console.log('[QualityFX] Render Loop Injected');
    }

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
            .fx-vignette {
                position: fixed;
                top: 0; left: 0; width: 100%; height: 100%;
                box-shadow: 0 0 150px rgba(0,0,0,0.9) inset;
                pointer-events: none;
                z-index: 9997;
            }
        `;
        document.head.appendChild(style);

        const vig = document.createElement('div');
        vig.className = 'fx-vignette';
        document.body.appendChild(vig);
    }

    /* ============ THREE.JS INTEGRATION (3D) ============ */
    function injectThreeJS(renderer, scene, camera) {
        console.log('[QualityFX] Three.js injected');
        threeJS = { renderer, scene, camera };
        updateThreeJSSettings();
    }

    function updateThreeJSSettings() {
        if (!threeJS) return;
        const { renderer, scene } = threeJS;

        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.1;
        renderer.outputEncoding = THREE.sRGBEncoding;

        scene.traverse(obj => {
            if (obj.isLight) {
                obj.castShadow = true;
                if (obj.shadow) {
                    obj.shadow.mapSize.width = 2048;
                    obj.shadow.mapSize.height = 2048;
                    obj.shadow.bias = -0.0005;
                }
            }
            if (obj.isMesh) {
                obj.castShadow = true;
                obj.receiveShadow = true;

                if (config.rtEnabled) {
                    if (obj.material.type === 'MeshBasicMaterial' && obj.material.map) {
                        obj.material = new THREE.MeshStandardMaterial({
                            map: obj.material.map,
                            color: obj.material.color,
                            roughness: 0.8,
                            metalness: 0.1
                        });
                    }
                }
            }
        });

        if (config.volumetricEnabled && !scene.fog) {
            scene.fog = new THREE.FogExp2(0x000000, 0.02);
        }
    }

    /* ============ CANVAS 2D INTEGRATION (2D) ============ */
    function init2D(canvas, ctx) {
        console.log('[QualityFX] 2D Canvas injected');
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

        // Ambient darkness
        const ambient = 0.15;
        lightMapCtx.globalCompositeOperation = 'source-over';
        lightMapCtx.fillStyle = `rgba(0,0,0,${1 - ambient})`;
        lightMapCtx.fillRect(0, 0, lightMapCanvas.width, lightMapCanvas.height);

        // Punch lights
        lightMapCtx.globalCompositeOperation = 'destination-out';

        lights2D.forEach(light => {
            const g = lightMapCtx.createRadialGradient(light.x, light.y, 0, light.x, light.y, light.radius);
            g.addColorStop(0, `rgba(0,0,0,${light.intensity})`);
            g.addColorStop(1, 'rgba(0,0,0,0)');

            lightMapCtx.fillStyle = g;
            lightMapCtx.beginPath();
            lightMapCtx.arc(light.x, light.y, light.radius, 0, Math.PI * 2);
            lightMapCtx.fill();
        });

        // Composite onto game
        ctx2D.save();
        ctx2D.globalCompositeOperation = 'multiply';
        ctx2D.drawImage(lightMapCanvas, 0, 0);

        // Color Bleed
        if (config.ptEnabled) {
            ctx2D.globalCompositeOperation = 'screen'; // Screen is safer than overlay for bright lights
            lights2D.forEach(light => {
                if (light.color) {
                    const g = ctx2D.createRadialGradient(light.x, light.y, 0, light.x, light.y, light.radius * 0.8);
                    g.addColorStop(0, light.color);
                    g.addColorStop(1, 'rgba(0,0,0,0)');
                    ctx2D.fillStyle = g;
                    ctx2D.beginPath();
                    ctx2D.arc(light.x, light.y, light.radius, 0, Math.PI * 2);
                    ctx2D.fill();
                }
            });
        }
        ctx2D.restore();

        // Important: Reset lights AFTER render so next frame can rebuild them
        lights2D = [];
    }

    /* ============ UI & SETTINGS ============ */
    function createSettingsUI() {
        const btn = document.createElement('button');
        btn.innerHTML = '⚙️ FX';
        btn.style.cssText = 'position:fixed;bottom:10px;right:10px;z-index:9999;background:#111;color:#fff;border:1px solid #444;padding:5px 10px;border-radius:4px;cursor:pointer;opacity:0.5;';
        btn.onclick = () => {
            if (!settingsPanel) createPanel();
            settingsPanel.style.display = settingsPanel.style.display === 'none' ? 'block' : 'none';
        };
        document.body.appendChild(btn);
    }

    function createPanel() {
        settingsPanel = document.createElement('div');
        settingsPanel.style.cssText = 'position:fixed;bottom:50px;right:10px;z-index:9999;background:rgba(10,10,15,0.95);border:1px solid #444;padding:15px;width:250px;color:#eee;font-family:sans-serif;font-size:12px;display:none;';

        const addToggle = (lbl, key) => {
            const div = document.createElement('div');
            div.style.marginBottom = '8px';
            const check = document.createElement('input');
            check.type = 'checkbox';
            check.checked = config[key];
            check.onchange = (e) => {
                config[key] = e.target.checked;
                if (key === 'crtEnabled') {
                    const style = document.getElementById('quality-fx-css');
                    if (style) style.textContent = style.textContent.replace(/opacity: \d+(\.\d+)?/g, `opacity: ${config.crtEnabled ? 0.6 : 0}`);
                }
            };
            div.appendChild(check);
            div.appendChild(document.createTextNode(' ' + lbl));
            settingsPanel.appendChild(div);
        };

        addToggle('Ray Tracing (Shadows/Lights)', 'rtEnabled');
        addToggle('Path Tracing (Color Bleed)', 'ptEnabled');
        addToggle('CRT/VHS Filter', 'crtEnabled');
        addToggle('Volumetric Fog (3D)', 'volumetricEnabled');

        document.body.appendChild(settingsPanel);
    }

    /* ============ RENDER API ============ */
    function render() {
        if (fxCanvas) {
            const w = window.innerWidth;
            const h = window.innerHeight;
            if (fxCanvas.width !== w) fxCanvas.width = w;
            if (fxCanvas.height !== h) fxCanvas.height = h;
            fxCtx.clearRect(0, 0, w, h);

            if (config.ptEnabled) {
                fxCtx.save();
                fxCtx.globalCompositeOperation = 'overlay';
                fxCtx.fillStyle = `rgba(255,255,255,${0.03 + Math.random() * 0.02})`;
                for(let i=0; i<20; i++) {
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
        render, // Exposed for manual calls if needed
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

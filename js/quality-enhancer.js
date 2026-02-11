/* ============================================
   ScaryGamesAI — Quality Enhancer v2.0
   Per-game Three.js renderer upgrades
   based on subscription tier.
   ============================================ */

const QualityEnhancer = (function () {
    'use strict';

    const TIER_KEY = 'sgai-sub-tier';
    let enhanced = false;
    let giLights = [];

    function getTier() { return localStorage.getItem(TIER_KEY) || 'none'; }
    function isRT() { const t = getTier(); return t === 'pro' || t === 'max'; }
    function isPT() { return getTier() === 'max'; }

    /**
     * Call this AFTER your Three.js renderer/scene are initialized.
     * Pass in the renderer, scene, and optionally the camera.
     *
     * @param {THREE.WebGLRenderer} renderer
     * @param {THREE.Scene} scene
     * @param {THREE.Camera} [camera]
     */
    function enhance(renderer, scene, camera) {
        if (!renderer || !scene) return;
        if (enhanced) return;
        enhanced = true;

        const tier = getTier();
        if (tier !== 'pro' && tier !== 'max') return;

        console.log(`[QualityEnhancer] Enhancing for tier: ${tier}`);

        // ──── PRO (Ray Tracing) Enhancements ────
        if (isRT()) {
            // 1. Higher shadow map resolution
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE.PCFSoftShadowMap;

            // Upgrade existing shadow-casting lights
            scene.traverse(function (obj) {
                if (obj.isLight && obj.shadow) {
                    if (obj.shadow.mapSize) {
                        obj.shadow.mapSize.width = 4096;
                        obj.shadow.mapSize.height = 4096;
                    }
                    if (obj.shadow.bias !== undefined) {
                        obj.shadow.bias = -0.0005;
                    }
                    // Increase shadow camera range for directional lights
                    if (obj.isDirectionalLight && obj.shadow.camera) {
                        obj.shadow.camera.near = 0.1;
                        obj.shadow.camera.far = 150;
                    }
                }

                // 2. Add emissive glow to light-source meshes
                if (obj.isMesh && obj.material) {
                    const mat = obj.material;
                    if (mat.isMeshBasicMaterial && mat.color) {
                        const c = mat.color;
                        // If it looks like a light fixture (bright warm color)
                        if (c.r > 0.7 && c.g > 0.5 && c.b < 0.7) {
                            // Convert to standard material with emissive
                            const newMat = new THREE.MeshStandardMaterial({
                                color: mat.color,
                                emissive: mat.color,
                                emissiveIntensity: 0.4,
                                roughness: 0.3,
                                metalness: 0.1,
                            });
                            obj.material = newMat;
                        }
                    }
                }
            });

            // 3. Enhanced tone mapping
            renderer.toneMapping = THREE.ACESFilmicToneMapping;
            if (renderer.toneMappingExposure !== undefined) {
                // Slight boost for dramatic atmosphere
                renderer.toneMappingExposure = Math.max(renderer.toneMappingExposure, 0.6);
            }

            // 4. Enable higher pixel ratio
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

            // 5. Add subtle colored rim light for depth
            const rimLight = new THREE.DirectionalLight(0x334466, 0.15);
            rimLight.position.set(-10, 15, -5);
            rimLight.name = 'qe-rim-light';
            scene.add(rimLight);

            // 6. Add ambient fill for better shadow detail
            const fillLight = new THREE.HemisphereLight(0x445566, 0x111122, 0.1);
            fillLight.name = 'qe-fill-light';
            scene.add(fillLight);

            console.log('[QualityEnhancer] RT enhancements applied: 4K shadows, emissive fixtures, ACES tonemapping, rim+fill lights');
        }

        // ──── MAX (Path Tracing) Enhancements ────
        if (isPT()) {
            // 1. Max pixel ratio
            renderer.setPixelRatio(window.devicePixelRatio);

            // 2. Enhanced fog for atmospheric depth
            if (scene.fog) {
                if (scene.fog.isFogExp2) {
                    scene.fog.density *= 1.15; // denser fog
                } else if (scene.fog.isFog) {
                    scene.fog.near *= 0.85;
                    scene.fog.far *= 0.92;
                }
            }

            // 3. Add colored GI bounce lights
            const giPresets = [
                { color: 0xcc4444, x: -15, y: 1, z: -15, intensity: 0.08, dist: 25 }, // red bounce
                { color: 0x4444cc, x: 15, y: 1, z: 15, intensity: 0.08, dist: 25 },   // blue bounce
                { color: 0xccaa44, x: 0, y: 8, z: 0, intensity: 0.06, dist: 30 },      // warm ceiling
                { color: 0x44ccaa, x: -10, y: 2, z: 10, intensity: 0.05, dist: 20 },   // teal fill
                { color: 0xaa44cc, x: 10, y: 2, z: -10, intensity: 0.05, dist: 20 },   // purple fill
                { color: 0xcc8844, x: 5, y: 0.5, z: 5, intensity: 0.04, dist: 15 },    // warm ground
            ];

            giPresets.forEach((gi, i) => {
                const giLight = new THREE.PointLight(gi.color, gi.intensity, gi.dist);
                giLight.position.set(gi.x, gi.y, gi.z);
                giLight.name = `qe-gi-light-${i}`;
                scene.add(giLight);
                giLights.push({ light: giLight, baseX: gi.x, baseY: gi.y, baseZ: gi.z, phase: Math.random() * Math.PI * 2 });
            });

            // 4. Upgrade material quality across the board
            scene.traverse(function (obj) {
                if (obj.isMesh && obj.material) {
                    const mat = obj.material;

                    // Upgrade MeshPhong → MeshStandard for PBR quality
                    if (mat.isMeshPhongMaterial) {
                        const newMat = new THREE.MeshStandardMaterial({
                            color: mat.color,
                            roughness: 0.7,
                            metalness: 0.05,
                            side: mat.side,
                        });
                        if (mat.map) newMat.map = mat.map;
                        if (mat.normalMap) newMat.normalMap = mat.normalMap;
                        obj.material = newMat;
                    }

                    // Ensure all standard materials have refined properties
                    if (mat.isMeshStandardMaterial) {
                        // Slight metalness for wet/horror look
                        if (mat.metalness < 0.1) mat.metalness = 0.05;
                        // Ensure roughness isn't fully flat
                        if (mat.roughness > 0.95) mat.roughness = 0.9;
                    }

                    // Enable shadow casting/receiving on all meshes
                    obj.castShadow = true;
                    obj.receiveShadow = true;
                }
            });

            // 5. Add atmospheric haze light
            const hazeLight = new THREE.PointLight(0x556688, 0.12, 50);
            hazeLight.position.set(0, 10, 0);
            hazeLight.name = 'qe-haze-light';
            scene.add(hazeLight);

            console.log('[QualityEnhancer] PT enhancements applied: max DPR, fog boost, 6 GI lights, PBR materials, haze light');
        }
    }

    /**
     * Call this in your game loop to animate GI lights (subtle drift)
     * @param {number} dt - delta time in seconds
     */
    function update(dt) {
        if (!isPT() || giLights.length === 0) return;

        giLights.forEach(gi => {
            gi.phase += dt * 0.3;
            gi.light.position.x = gi.baseX + Math.sin(gi.phase) * 2;
            gi.light.position.z = gi.baseZ + Math.cos(gi.phase * 0.7) * 2;
            // Subtle intensity pulsing
            gi.light.intensity = 0.04 + Math.sin(gi.phase * 1.5) * 0.02;
        });
    }

    /**
     * Cleanup added lights
     * @param {THREE.Scene} scene
     */
    function destroy(scene) {
        if (!scene) return;
        ['qe-rim-light', 'qe-fill-light', 'qe-haze-light'].forEach(name => {
            const obj = scene.getObjectByName(name);
            if (obj) scene.remove(obj);
        });
        giLights.forEach(gi => {
            if (gi.light.parent) gi.light.parent.remove(gi.light);
        });
        giLights = [];
        enhanced = false;
    }

    return { enhance, update, destroy, getTier, isRT, isPT };
})();

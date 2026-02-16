/**
 * ============================================
 * SGAI Graphics Framework - Phase 8: PBR Materials
 * ============================================
 * Physically Based Rendering setup and utilities.
 * 
 * Key Benefits:
 * - Realistic materials
 * - Normal mapping
 * - Environment reflections
 */

(function(global) {
    'use strict';

    // ============================================
    // PBR MATERIALS
    // ============================================

    /**
     * PBR Material presets for common surfaces
     */
    const PBRMaterials = {
        // Metals
        steel: { color: 0x888899, metalness: 0.9, roughness: 0.3 },
        gold: { color: 0xFFD700, metalness: 1.0, roughness: 0.2 },
        bronze: { color: 0xCD7F32, metalness: 0.8, roughness: 0.4 },
        iron: { color: 0x43464B, metalness: 0.8, roughness: 0.5 },
        
        // Stone/Concrete
        stone: { color: 0x808080, metalness: 0.0, roughness: 0.9 },
        concrete: { color: 0x808080, metalness: 0.0, roughness: 0.95 },
        sand: { color: 0xC2B280, metalness: 0.0, roughness: 1.0 },
        
        // Wood
        wood: { color: 0x8B4513, metalness: 0.0, roughness: 0.8 },
        bark: { color: 0x3D2914, metalness: 0.0, roughness: 0.95 },
        
        // Organic
        skin: { color: 0xDEB887, metalness: 0.0, roughness: 0.6 },
        flesh: { color: 0x8B0000, metalness: 0.0, roughness: 0.7 },
        leaf: { color: 0x228B22, metalness: 0.0, roughness: 0.5 },
        
        // Cloth
        leather: { color: 0x6B4423, metalness: 0.0, roughness: 0.75 },
        cloth: { color: 0xCCCCCC, metalness: 0.0, roughness: 0.9 },
        
        // Glow/Emissive
        torch: { color: 0xFF6600, emissive: 0xFF4400, emissiveIntensity: 2 },
        eye: { color: 0xFF0000, emissive: 0xFF0000, emissiveIntensity: 1 },
        magic: { color: 0x00FFFF, emissive: 0x00FFFF, emissiveIntensity: 1.5 },
        
        // Water
        water: { color: 0x0066AA, metalness: 0.1, roughness: 0.1, opacity: 0.8, transparent: true },
        
        // Glass
        glass: { color: 0xFFFFFF, metalness: 0.0, roughness: 0.0, opacity: 0.3, transparent: true }
    };

    /**
     * Create PBR material from preset
     */
    function createMaterial(preset, options = {}) {
        const config = PBRMaterials[preset] || PBRMaterials.stone;
        
        const material = new THREE.MeshStandardMaterial({
            color: config.color,
            metalness: config.metalness || 0,
            roughness: config.roughness || 0.5,
            emissive: config.emissive || 0x000000,
            emissiveIntensity: config.emissiveIntensity || 0,
            transparent: config.transparent || false,
            opacity: config.opacity || 1,
            side: options.side || THREE.FrontSide,
            flatShading: options.flatShading || false,
            wireframe: options.wireframe || false,
            ...options
        });

        // Add normal map if provided
        if (options.normalMap) {
            material.normalMap = options.normalMap;
            material.normalScale = options.normalScale || new THREE.Vector2(1, 1);
        }

        // Add displacement map
        if (options.displacementMap) {
            material.displacementMap = options.displacementMap;
            material.displacementScale = options.displacementScale || 0.1;
        }

        // Add AO map
        if (options.aoMap) {
            material.aoMap = options.aoMap;
            material.aoMapIntensity = options.aoMapIntensity || 1;
        }

        // Add environment map
        if (options.envMap) {
            material.envMap = options.envMap;
            material.envMapIntensity = options.envMapIntensity || 1;
        }

        return material;
    }

    /**
     * Load PBR texture set
     */
    async function loadPBRTextures(basePath, name) {
        const loader = new THREE.TextureLoader();
        
        const loadTexture = (path) => {
            return new Promise((resolve) => {
                loader.load(path, resolve, undefined, () => {
                    console.warn(`[PBR] Failed to load: ${path}`);
                    resolve(null);
                });
            });
        };

        const [colorMap, normalMap, roughnessMap, aoMap] = await Promise.all([
            loadTexture(`${basePath}/${name}_color.jpg`),
            loadTexture(`${basePath}/${name}_normal.jpg`),
            loadTexture(`${basePath}/${name}_roughness.jpg`),
            loadTexture(`${basePath}/${name}_ao.jpg`)
        ]);

        return { colorMap, normalMap, roughnessMap, aoMap };
    }

    /**
     * Apply PBR textures to material
     */
    function applyPBRTextures(material, textures) {
        if (textures.colorMap) {
            material.map = textures.colorMap;
            material.color.set(0xffffff);
        }
        
        if (textures.normalMap) {
            material.normalMap = textures.normalMap;
            material.normalScale.set(1, 1);
        }
        
        if (textures.roughnessMap) {
            material.roughnessMap = textures.roughnessMap;
            material.roughness = 1;
        }
        
        if (textures.aoMap) {
            material.aoMap = textures.aoMap;
            material.aoMapIntensity = 1;
        }
        
        material.needsUpdate = true;
    }

    // ============================================
    // ENVIRONMENT MAP GENERATOR
    // ============================================

    /**
     * Generate environment map from scene
     */
    class EnvironmentGenerator {
        constructor(renderer) {
            this.renderer = renderer;
            this.pmremGenerator = new THREE.PMREMGenerator(renderer);
            this.pmremGenerator.compileEquirectangularShader();
            
            this.scene = new THREE.Scene();
            this.camera = new THREE.CubeCamera(0.1, 1000, new THREE.WebGLCubeRenderTarget(256));
        }

        /**
         * Generate from HDR environment
         */
        fromHDR(url) {
            return new Promise((resolve) => {
                new THREE.RGBELoader().load(url, (texture) => {
                    const envMap = this.pmremGenerator.fromEquirectangular(texture).texture;
                    texture.dispose();
                    this.pmremGenerator.dispose();
                    resolve(envMap);
                });
            });
        }

        /**
         * Generate from scene (for dynamic environments)
         */
        fromScene(scene, background) {
            this.scene.copy(scene);
            
            // Hide background temporarily
            const originalBackground = scene.background;
            scene.background = null;
            
            // Render cubemap
            this.camera.position.set(0, 0, 0);
            this.camera.update(this.renderer, scene);
            
            const envMap = this.pmremGenerator.fromCubemap(this.camera.renderTarget.texture).texture;
            
            scene.background = originalBackground;
            
            return envMap;
        }

        /**
         * Generate procedural sky
         */
        proceduralSky(sunPosition) {
            const sky = new THREE.Sky();
            sky.scale.setScalar(450000);
            this.scene.add(sky);

            const sun = new THREE.Vector3().copy(sunPosition);
            
            const uniforms = sky.material.uniforms;
            uniforms['turbidity'].value = 10;
            uniforms['rayleigh'].value = 3;
            uniforms['mieCoefficient'].value = 0.005;
            uniforms['mieDirectionalG'].value = 0.7;

            return sky;
        }
    }

    // ============================================
    // LIGHT MANAGER
    // ============================================

    /**
     * Dynamic light manager with shadows
     */
    class LightManager {
        constructor(scene, options = {}) {
            this.scene = scene;
            this.lights = [];
            this.shadowLights = [];
            
            // Shadow map settings
            this.shadowMapSize = options.shadowMapSize || 2048;
            this.shadowType = options.shadowType || THREE.PCFSoftShadowMap;
            
            // Light limits
            this.maxShadowLights = options.maxShadowLights || 4;
            this.maxPointLights = options.maxPointLights || 20;
            this.maxSpotLights = options.maxSpotLights || 10;
        }

        /**
         * Add ambient light
         */
        addAmbient(color, intensity) {
            const light = new THREE.AmbientLight(color, intensity);
            this.scene.add(light);
            this.lights.push({ light, type: 'ambient' });
            return light;
        }

        /**
         * Add directional light (sun/moon)
         */
        addDirectional(color, intensity, position, castShadow = true) {
            const light = new THREE.DirectionalLight(color, intensity);
            light.position.copy(position);
            
            if (castShadow) {
                light.castShadow = true;
                light.shadow.mapSize.width = this.shadowMapSize;
                light.shadow.mapSize.height = this.shadowMapSize;
                light.shadow.camera.near = 0.5;
                light.shadow.camera.far = 500;
                light.shadow.camera.left = -50;
                light.shadow.camera.right = 50;
                light.shadow.camera.top = 50;
                light.shadow.camera.bottom = -50;
                light.shadow.bias = -0.0001;
            }
            
            this.scene.add(light);
            this.lights.push({ light, type: 'directional', castShadow });
            
            return light;
        }

        /**
         * Add point light (torch, glow)
         */
        addPoint(color, intensity, distance, position, castShadow = false) {
            if (this.lights.filter(l => l.type === 'point').length >= this.maxPointLights) {
                console.warn('[LightManager] Max point lights reached');
                return null;
            }
            
            const light = new THREE.PointLight(color, intensity, distance);
            light.position.copy(position);
            light.castShadow = castShadow;
            
            if (castShadow) {
                light.shadow.mapSize.width = this.shadowMapSize / 2;
                light.shadow.mapSize.height = this.shadowMapSize / 2;
            }
            
            this.scene.add(light);
            this.lights.push({ light, type: 'point', castShadow });
            
            return light;
        }

        /**
         * Add spotlight
         */
        addSpot(color, intensity, angle, penumbra, distance, position, target, castShadow = true) {
            if (this.lights.filter(l => l.type === 'spot').length >= this.maxSpotLights) {
                console.warn('[LightManager] Max spot lights reached');
                return null;
            }
            
            const light = new THREE.SpotLight(color, intensity, distance, angle, penumbra);
            light.position.copy(position);
            light.target.position.copy(target);
            
            if (castShadow) {
                light.castShadow = true;
                light.shadow.mapSize.width = this.shadowMapSize;
                light.shadow.mapSize.height = this.shadowMapSize;
                light.shadow.bias = -0.0001;
            }
            
            this.scene.add(light);
            this.scene.add(light.target);
            this.lights.push({ light, type: 'spot', castShadow });
            
            return light;
        }

        /**
         * Update light intensities based on distance to player
         */
        updateDynamicLights(playerPosition) {
            for (const { light, type } of this.lights) {
                if (type === 'ambient' || type === 'directional') continue;
                
                const dist = light.position.distanceTo(playerPosition);
                
                // Reduce intensity for distant lights
                if (dist > 30) {
                    light.intensity = Math.max(0, light.userData.baseIntensity - (dist - 30) * 0.1);
                } else {
                    light.intensity = light.userData.baseIntensity;
                }
            }
        }

        /**
         * Get all lights
         */
        getLights() {
            return this.lights.map(l => l.light);
        }

        /**
         * Enable/disable shadows
         */
        setShadowsEnabled(enabled) {
            for (const { light, castShadow } of this.lights) {
                if (castShadow) {
                    light.castShadow = enabled;
                }
            }
        }
    }

    // ============================================
    // EXPORT
    // ============================================

    const SGAI = global.SGAI || {};
    SGAI.PBRMaterials = PBRMaterials;
    SGAI.createMaterial = createMaterial;
    SGAI.loadPBRTextures = loadPBRTextures;
    SGAI.applyPBRTextures = applyPBRTextures;
    SGAI.EnvironmentGenerator = EnvironmentGenerator;
    SGAI.LightManager = LightManager;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            PBRMaterials,
            createMaterial,
            loadPBRTextures,
            applyPBRTextures,
            EnvironmentGenerator,
            LightManager
        };
    } else {
        global.SGAI = SGAI;
    }

})(typeof window !== 'undefined' ? window : this);

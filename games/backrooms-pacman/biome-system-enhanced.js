/**
 * PHASE 3: BIOME SYSTEM - 5 DISTINCT BACKROOMS ENVIRONMENTS
 * Each biome has unique visuals, hazards, and gameplay mechanics
 */

var BiomeSystem = (function() {
    'use strict';

    var config = {
        // Available biomes
        biomes: {
            YELLOW: 'yellow',
            POOLROOMS: 'poolrooms',
            RED_ROOMS: 'red_rooms',
            CONSTRUCTION: 'construction',
            SEWERS: 'sewers'
        },
        
        // Current biome
        currentBiome: null,
        
        // Biome properties
        biomeProperties: {}
    };

    var state = {
        scene: null,
        renderer: null,
        camera: null,
        activeHazards: [],
        ambientParticles: [],
        loadedAssets: {}
    };

    /**
     * Initialize biome system
     */
    function init(scene, renderer, camera) {
        state.scene = scene;
        state.renderer = renderer;
        state.camera = camera;
        
        console.log('[BiomeSystem] Initialized');
    }

    /**
     * Load and apply biome
     */
    function loadBiome(biomeType) {
        if (!config.biomes[biomeType.toUpperCase()]) {
            console.error('[BiomeSystem] Unknown biome:', biomeType);
            return false;
        }
        
        console.log('[BiomeSystem] Loading biome:', biomeType);
        
        // Cleanup previous biome
        cleanupCurrentBiome();
        
        // Apply new biome
        switch (biomeType) {
            case 'yellow':
                applyYellowBackrooms();
                break;
            case 'poolrooms':
                applyPoolrooms();
                break;
            case 'red_rooms':
                applyRedRooms();
                break;
            case 'construction':
                applyConstruction();
                break;
            case 'sewers':
                applySewers();
                break;
        }
        
        config.currentBiome = biomeType;
        return true;
    }

    /**
     * Yellow Backrooms - Classic horror
     */
    function applyYellowBackrooms() {
        config.biomeProperties = {
            name: 'Yellow Backrooms',
            difficulty: 'normal',
            fogColor: 0xd4c685,
            fogDensity: 0.035,
            lightColor: 0xffeebb,
            lightIntensity: 0.6,
            wallTexture: 'yellow_wallpaper',
            floorTexture: 'wet_carpet',
            ceilingTexture: 'ceiling_tiles',
            
            // Gameplay modifiers
            sanityDrainRate: 1.0,
            movementSpeed: 1.0,
            visibilityRange: 15,
            
            // Hazards
            hazards: ['fluorescent_hum', 'water_drips'],
            
            // Atmosphere
            particles: ['dust'],
            postProcessing: ['film_grain', 'vignette']
        };
        
        applyVisualSettings();
        applyGameplayModifiers();
        spawnAmbientEffects();
    }

    /**
     * Poolrooms - Wet, reflective surfaces
     */
    function applyPoolrooms() {
        config.biomeProperties = {
            name: 'Poolrooms',
            difficulty: 'hard',
            fogColor: 0x88ccff,
            fogDensity: 0.045,
            lightColor: 0xaaddff,
            lightIntensity: 0.7,
            wallTexture: 'white_tile',
            floorTexture: 'reflective_water',
            ceilingTexture: 'open_sky',
            
            // Gameplay modifiers
            sanityDrainRate: 1.3,
            movementSpeed: 0.85, // Water slows movement
            visibilityRange: 12,
            
            // Unique mechanics
            waterPhysics: true,
            reflectionEnabled: true,
            soundOcclusion: 0.5, // Sound travels through water
            
            // Hazards
            hazards: ['drowning_risk', 'slippery_surfaces', 'underwater_sections'],
            
            // Atmosphere
            particles: ['water_mist', 'bubbles'],
            postProcessing: ['caustics', 'reflections', 'chromatic_aberration']
        };
        
        applyVisualSettings();
        applyGameplayModifiers();
        spawnAmbientEffects();
        
        // Enable water shader effects
        if (typeof AdvancedLighting !== 'undefined') {
            AdvancedLighting.enableWaterEffects(true);
        }
    }

    /**
     * Red Rooms - Psychological horror
     */
    function applyRedRooms() {
        config.biomeProperties = {
            name: 'Red Rooms',
            difficulty: 'nightmare',
            fogColor: 0x440000,
            fogDensity: 0.06,
            lightColor: 0xff4444,
            lightIntensity: 0.4,
            wallTexture: 'blood_stained',
            floorTexture: 'dark_flesh',
            ceilingTexture: 'pulsing_organic',
            
            // Gameplay modifiers
            sanityDrainRate: 2.0, // Double sanity drain
            movementSpeed: 0.9,
            visibilityRange: 10,
            
            // Unique mechanics
            hallucinationsEnabled: true,
            illusionFrequency: 0.3, // 30% more hallucinations
            paranoiaLevel: 'extreme',
            
            // Hazards
            hazards: ['psychological_trauma', 'false_walls', 'jump_scare_triggers'],
            
            // Atmosphere
            particles: ['floating_blood_cells', 'dark_motes'],
            postProcessing: ['color_distortion', 'pulse_effect', 'peripheral_horror']
        };
        
        applyVisualSettings();
        applyGameplayModifiers();
        spawnAmbientEffects();
        
        // Enable psychological effects
        if (typeof SanitySystem !== 'undefined') {
            SanitySystem.config.hallucinationThreshold = 60; // Easier to hallucinate
        }
    }

    /**
     * Construction - Industrial hazards
     */
    function applyConstruction() {
        config.biomeProperties = {
            name: 'Construction',
            difficulty: 'hard',
            fogColor: 0x666666,
            fogDensity: 0.04,
            lightColor: 0xffaa00,
            lightIntensity: 0.5,
            wallTexture: 'concrete_blocks',
            floorTexture: 'metal_grating',
            ceilingTexture: 'exposed_pipes',
            
            // Gameplay modifiers
            sanityDrainRate: 1.2,
            movementSpeed: 1.0,
            visibilityRange: 14,
            
            // Unique mechanics
            environmentalHazards: true,
            fallingDebris: true,
            noiseLevels: 'high', // Attracts enemies
            
            // Hazards
            hazards: ['falling_objects', 'electrical_arcs', 'sharp_edges', 'noise_attraction'],
            
            // Atmosphere
            particles: ['construction_dust', 'sparks'],
            postProcessing: ['industrial_grit', 'flicker']
        };
        
        applyVisualSettings();
        applyGameplayModifiers();
        spawnAmbientEffects();
        
        // Enable debris physics
        if (typeof DynamicEnvironment !== 'undefined') {
            DynamicEnvironment.enableFallingDebris(true);
        }
    }

    /**
     * Sewers - Toxic, flooding mechanics
     */
    function applySewers() {
        config.biomeProperties = {
            name: 'The Sewers',
            difficulty: 'impossible',
            fogColor: 0x335522,
            fogDensity: 0.07,
            lightColor: 0x66ff66,
            lightIntensity: 0.3,
            wallTexture: 'slime_brick',
            floorTexture: 'toxic_sludge',
            ceilingTexture: 'dripping_pipes',
            
            // Gameplay modifiers
            sanityDrainRate: 2.5, // Highest drain
            movementSpeed: 0.7, // Very slow in sludge
            visibilityRange: 8, // Very limited
            
            // Unique mechanics
            toxicDamage: true,
            floodRisk: true,
            diseaseChance: 0.1,
            
            // Hazards
            hazards: ['toxic_gas', 'flooding', 'disease', 'creature_infestation'],
            
            // Atmosphere
            particles: ['toxic_fumes', 'floating_debris', 'insects'],
            postProcessing: ['toxic_green_tint', 'distortion', 'nausea_effect']
        };
        
        applyVisualSettings();
        applyGameplayModifiers();
        spawnAmbientEffects();
        
        // Enable toxic effects
        if (typeof DecaySystem !== 'undefined') {
            DecaySystem.setDecayRate(2.0); // Double decay
        }
    }

    /**
     * Apply visual settings for current biome
     */
    function applyVisualSettings() {
        var props = config.biomeProperties;
        
        if (!state.scene) return;
        
        // Update fog
        state.scene.fog = new THREE.FogExp2(
            props.fogColor,
            props.fogDensity
        );
        
        // Update background
        state.scene.background = new THREE.Color(props.fogColor);
        
        // Update lighting
        if (state.scene.children) {
            for (var i = 0; i < state.scene.children.length; i++) {
                var child = state.scene.children[i];
                
                if (child.isPointLight || child.isSpotLight) {
                    if (child.color) {
                        child.color.setHex(props.lightColor);
                    }
                    if (child.intensity !== undefined) {
                        child.intensity = props.lightIntensity;
                    }
                }
            }
        }
        
        // Update renderer
        if (state.renderer) {
            state.renderer.setClearColor(props.fogColor);
        }
    }

    /**
     * Apply gameplay modifiers
     */
    function applyGameplayModifiers() {
        var props = config.biomeProperties;
        
        // Update difficulty settings if available
        if (typeof window !== 'undefined' && window.DIFFICULTY_SETTINGS) {
            // Modify current difficulty based on biome
            var diff = window.DIFFICULTY_SETTINGS.standard;
            if (diff) {
                diff.sanityDrain = (diff.sanityDrain || 1.0) * props.sanityDrainRate;
                diff.playerSpeed = (diff.playerSpeed || 1.0) * props.movementSpeed;
                diff.visibility = props.visibilityRange;
            }
        }
    }

    /**
     * Spawn ambient particle effects
     */
    function spawnAmbientEffects() {
        var props = config.biomeProperties;
        
        // Clear previous particles
        clearAmbientParticles();
        
        // Create particle system for each particle type
        props.particles.forEach(function(particleType) {
            var particleSystem = createParticleSystem(particleType);
            if (particleSystem) {
                state.ambientParticles.push(particleSystem);
                state.scene.add(particleSystem.mesh);
            }
        });
    }

    /**
     * Create particle system for specific effect
     */
    function createParticleSystem(type) {
        var particleCount = 500;
        var geometry = new THREE.BufferGeometry();
        var positions = new Float32Array(particleCount * 3);
        var velocities = [];
        
        // Initialize particles
        for (var i = 0; i < particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 40;
            positions[i * 3 + 1] = Math.random() * 10;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 40;
            
            velocities.push({
                x: (Math.random() - 0.5) * 0.02,
                y: type === 'bubbles' ? 0.05 : -0.01,
                z: (Math.random() - 0.5) * 0.02
            });
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        // Create material based on type
        var material;
        switch (type) {
            case 'dust':
                material = new THREE.PointsMaterial({
                    color: 0xffffaa,
                    size: 0.05,
                    transparent: true,
                    opacity: 0.6
                });
                break;
            case 'water_mist':
                material = new THREE.PointsMaterial({
                    color: 0xaaddff,
                    size: 0.08,
                    transparent: true,
                    opacity: 0.4
                });
                break;
            case 'bubbles':
                material = new THREE.PointsMaterial({
                    color: 0xffffff,
                    size: 0.1,
                    transparent: true,
                    opacity: 0.7
                });
                break;
            default:
                material = new THREE.PointsMaterial({
                    color: 0x888888,
                    size: 0.05,
                    transparent: true
                });
        }
        
        var mesh = new THREE.Points(geometry, material);
        
        return {
            mesh: mesh,
            geometry: geometry,
            material: material,
            velocities: velocities,
            type: type
        };
    }

    /**
     * Update particle systems
     */
    function updateParticles(deltaTime) {
        for (var i = 0; i < state.ambientParticles.length; i++) {
            var ps = state.ambientParticles[i];
            var positions = ps.geometry.attributes.position.array;
            
            for (var j = 0; j < ps.velocities.length; j++) {
                positions[j * 3] += ps.velocities[j].x;
                positions[j * 3 + 1] += ps.velocities[j].y;
                positions[j * 3 + 2] += ps.velocities[j].z;
                
                // Reset if out of bounds
                if (positions[j * 3 + 1] < 0 || positions[j * 3 + 1] > 10) {
                    positions[j * 3 + 1] = type === 'bubbles' ? 0 : 10;
                }
            }
            
            ps.geometry.attributes.position.needsUpdate = true;
        }
    }

    /**
     * Clear all ambient particles
     */
    function clearAmbientParticles() {
        for (var i = 0; i < state.ambientParticles.length; i++) {
            var ps = state.ambientParticles[i];
            if (ps.mesh) {
                state.scene.remove(ps.mesh);
                ps.geometry.dispose();
                ps.material.dispose();
            }
        }
        state.ambientParticles = [];
    }

    /**
     * Cleanup current biome before switching
     */
    function cleanupCurrentBiome() {
        clearAmbientParticles();
        
        // Disable special effects
        if (typeof AdvancedLighting !== 'undefined') {
            AdvancedLighting.enableWaterEffects(false);
        }
        
        if (typeof DynamicEnvironment !== 'undefined') {
            DynamicEnvironment.enableFallingDebris(false);
        }
        
        if (typeof DecaySystem !== 'undefined') {
            DecaySystem.setDecayRate(1.0);
        }
        
        config.currentBiome = null;
    }

    /**
     * Get current biome properties
     */
    function getCurrentBiome() {
        return config.biomeProperties;
    }

    /**
     * Check if hazard is active in current biome
     */
    function hasHazard(hazardType) {
        return config.biomeProperties.hazards && 
               config.biomeProperties.hazards.indexOf(hazardType) !== -1;
    }

    /**
     * Get biome-specific modifier
     */
    function getModifier(modifierName) {
        return config.biomeProperties[modifierName] || 1.0;
    }

    /**
     * Update biome hazards
     */
    function updateHazards(deltaTime, playerPos) {
        // Update hazard effects based on current biome
        if (hasHazard('toxic_gas')) {
            applyToxicDamage(deltaTime, playerPos);
        }
        
        if (hasHazard('falling_objects')) {
            checkFallingDebris(deltaTime, playerPos);
        }
        
        if (hasHazard('flooding')) {
            updateFlooding(deltaTime, playerPos);
        }
    }

    /**
     * Apply toxic damage in sewers
     */
    function applyToxicDamage(deltaTime, playerPos) {
        // Could integrate with health/sanity system
        if (typeof SanitySystem !== 'undefined') {
            SanitySystem.addSanityDamage(-0.1 * deltaTime);
        }
    }

    /**
     * Check for falling debris in construction
     */
    function checkFallingDebris(deltaTime, playerPos) {
        if (Math.random() < 0.001) { // 0.1% chance per frame
            console.log('[BiomeSystem] Debris falling!');
            // Could add visual/audio warning
        }
    }

    /**
     * Update flooding mechanics
     */
    function updateFlooding(deltaTime, playerPos) {
        // Gradual water level rise
        // Could affect movement and visibility
    }

    // Public API
    return {
        init: init,
        loadBiome: loadBiome,
        getCurrentBiome: getCurrentBiome,
        hasHazard: hasHazard,
        getModifier: getModifier,
        updateHazards: updateHazards,
        updateParticles: updateParticles,
        config: config,
        state: state
    };
})();

// Export to global scope
if (typeof window !== 'undefined') {
    window.BiomeSystem = BiomeSystem;
}

console.log('[BiomeSystem] Module loaded - 5 biomes ready');

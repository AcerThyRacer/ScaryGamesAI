/* ============================================
   The Abyss - Biome System
   Phase 2 Implementation
   ============================================ */

const BiomeSystem = (function() {
    'use strict';

    // Biome definitions with distinct characteristics
    const BIOMES = {
        SHALLOWS: {
            id: 'shallows',
            name: 'Shallows',
            description: 'Sunlight filters through the water. The journey begins here.',
            depthRange: [0, 20],
            fogColor: 0x1a4080,
            fogDensity: 0.015,
            ambientLight: 0.4,
            waterColor: 0x20a0c0,
            lightRays: true,
            particleDensity: 0.5,
            
            // Creature settings
            creatureTypes: ['passive_fish'],
            creatureDensity: 0.3,
            maxCreatures: 2,
            dangerLevel: 0,
            
            // Resources
            resources: ['coral', 'seaweed', 'shell'],
            resourceDensity: 0.6,
            
            // Visuals
            visibility: 40,
            turbulence: 0.2,
            causticsIntensity: 1.0,
            
            // Audio
            ambientTrack: 'shallows',
            reverb: 0.1
        },
        
        TWILIGHT: {
            id: 'twilight',
            name: 'Twilight Zone',
            description: 'The sun fades. Strange lights begin to appear in the depths.',
            depthRange: [20, 50],
            fogColor: 0x102040,
            fogDensity: 0.025,
            ambientLight: 0.2,
            waterColor: 0x153050,
            lightRays: true,
            particleDensity: 0.8,
            
            creatureTypes: ['angler', 'jellyfish', 'swarmer'],
            creatureDensity: 0.6,
            maxCreatures: 4,
            dangerLevel: 1,
            
            resources: ['bioluminescent_plant', 'crystal', 'wreck_debris'],
            resourceDensity: 0.5,
            
            visibility: 25,
            turbulence: 0.4,
            causticsIntensity: 0.5,
            
            ambientTrack: 'twilight',
            reverb: 0.3
        },
        
        MIDNIGHT: {
            id: 'midnight',
            name: 'Midnight Zone',
            description: 'Total darkness. Only the creatures\' bioluminescence guides you.',
            depthRange: [50, 100],
            fogColor: 0x080820,
            fogDensity: 0.04,
            ambientLight: 0.05,
            waterColor: 0x0a1520,
            lightRays: false,
            particleDensity: 1.2,
            
            creatureTypes: ['angler', 'stalker', 'mimic', 'swarmer'],
            creatureDensity: 1.0,
            maxCreatures: 6,
            dangerLevel: 2,
            
            resources: ['rare_crystal', 'ancient_bone', 'black_pearl'],
            resourceDensity: 0.4,
            
            visibility: 15,
            turbulence: 0.6,
            causticsIntensity: 0.0,
            
            ambientTrack: 'midnight',
            reverb: 0.5
        },
        
        ABYSS: {
            id: 'abyss',
            name: 'The Abyss',
            description: 'Crushing pressure and unimaginable horrors await.',
            depthRange: [100, 200],
            fogColor: 0x020510,
            fogDensity: 0.06,
            ambientLight: 0.0,
            waterColor: 0x050810,
            lightRays: false,
            particleDensity: 0.8,
            
            creatureTypes: ['leviathan_juvenile', 'abyssal_horror', 'mimic', 'stalker'],
            creatureDensity: 0.8,
            maxCreatures: 5,
            dangerLevel: 3,
            
            resources: ['abyssal_ore', 'void_crystal', 'leviathan_pearl'],
            resourceDensity: 0.3,
            
            visibility: 8,
            turbulence: 0.3,
            causticsIntensity: 0.0,
            
            ambientTrack: 'abyss',
            reverb: 0.7
        },
        
        HADAL: {
            id: 'hadal',
            name: 'Hadal Zone',
            description: 'The deepest trenches. Few have returned from here.',
            depthRange: [200, 400],
            fogColor: 0x000000,
            fogDensity: 0.08,
            ambientLight: 0.0,
            waterColor: 0x000000,
            lightRays: false,
            particleDensity: 0.5,
            
            creatureTypes: ['leviathan', 'ancient_one'],
            creatureDensity: 0.5,
            maxCreatures: 3,
            dangerLevel: 4,
            
            resources: ['primordial_essence', 'hadal_stone'],
            resourceDensity: 0.2,
            
            visibility: 5,
            turbulence: 0.1,
            causticsIntensity: 0.0,
            
            ambientTrack: 'hadal',
            reverb: 0.9,
            
            // Special: pressure damage
            pressureDamage: true,
            pressureDamageRate: 5 // per second
        }
    };

    let currentBiome = null;
    let previousBiome = null;
    let biomeTransitionProgress = 0;
    let activeBiomeEffects = [];
    let poiManager = null;

    // ============================================
    // BIOME MANAGEMENT
    // ============================================
    function init(scene) {
        poiManager = new POIManager(scene);
        return poiManager;
    }

    function getBiomeForDepth(depth) {
        for (const key in BIOMES) {
            const biome = BIOMES[key];
            if (depth >= biome.depthRange[0] && depth < biome.depthRange[1]) {
                return biome;
            }
        }
        return BIOMES.HADAL; // Default to deepest
    }

    function update(playerDepth, deltaTime) {
        const newBiome = getBiomeForDepth(playerDepth);
        
        if (newBiome !== currentBiome) {
            if (currentBiome) {
                previousBiome = currentBiome;
                onBiomeExit(currentBiome);
            }
            currentBiome = newBiome;
            onBiomeEnter(currentBiome);
            biomeTransitionProgress = 0;
        }
        
        // Smooth transition between biomes
        if (biomeTransitionProgress < 1) {
            biomeTransitionProgress = Math.min(1, biomeTransitionProgress + deltaTime * 0.5);
            updateBiomeTransition(deltaTime);
        }
        
        // Update biome-specific effects
        updateBiomeEffects(deltaTime);
        
        return currentBiome;
    }

    function onBiomeEnter(biome) {
        console.log(`Entering ${biome.name}`);
        
        // Trigger events
        if (window.EventSystem) {
            EventSystem.trigger('biome_enter', { biome: biome });
        }
        
        // Show notification for significant biomes
        if (biome.dangerLevel >= 2) {
            showBiomeWarning(biome);
        }
        
        // Spawn POIs for this biome
        if (poiManager) {
            poiManager.spawnPOIsForBiome(biome);
        }
    }

    function onBiomeExit(biome) {
        console.log(`Exiting ${biome.name}`);
        
        if (window.EventSystem) {
            EventSystem.trigger('biome_exit', { biome: biome });
        }
    }

    function showBiomeWarning(biome) {
        const warnings = {
            2: '⚠️ Entering hostile waters. Stay alert.',
            3: '☠️ You are being watched. The abyss knows you are here.',
            4: '💀 TURN BACK. This is the realm of ancient horrors.'
        };
        
        if (window.showNotification && warnings[biome.dangerLevel]) {
            showNotification(warnings[biome.dangerLevel], 'danger');
        }
    }

    // ============================================
    // BIOME TRANSITIONS
    // ============================================
    function updateBiomeTransition(deltaTime) {
        if (!previousBiome || !currentBiome) return;
        
        const t = biomeTransitionProgress;
        
        // Interpolate fog properties
        const fogColor = lerpColor(previousBiome.fogColor, currentBiome.fogColor, t);
        const fogDensity = lerp(previousBiome.fogDensity, currentBiome.fogDensity, t);
        
        // Apply to scene if available
        if (window.scene) {
            if (window.scene.fog) {
                window.scene.fog.color.setHex(fogColor);
                window.scene.fog.density = fogDensity;
            }
        }
        
        // Interpolate ambient light
        const ambientLight = lerp(previousBiome.ambientLight, currentBiome.ambientLight, t);
        // Apply to ambient light
    }

    function updateBiomeEffects(deltaTime) {
        if (!currentBiome) return;
        
        // Update active effects
        activeBiomeEffects = activeBiomeEffects.filter(effect => {
            effect.lifetime -= deltaTime;
            if (effect.update) effect.update(deltaTime);
            return effect.lifetime > 0;
        });
        
        // Spawn ambient particles based on biome
        if (Math.random() < currentBiome.particleDensity * 0.1) {
            spawnAmbientParticle();
        }
    }

    function spawnAmbientParticle() {
        // Spawn marine snow, bubbles, or bioluminescent particles
        // Implementation depends on particle system
    }

    // ============================================
    // POI MANAGER
    // ============================================
    class POIManager {
        constructor(scene) {
            this.scene = scene;
            this.spawnedPOIs = [];
            this.poiTypes = {
                SHIPWRECK: 'shipwreck',
                CAVE: 'cave',
                THERMAL_VENT: 'thermal_vent',
                KELP_FOREST: 'kelp_forest',
                ANCIENT_RUINS: 'ancient_ruins',
                ABANDONED_BASE: 'abandoned_base',
                CRYSTAL_FORMATION: 'crystal_formation',
                TRENCH: 'trench',
                WHALE_FALL: 'whale_fall'
            };
        }

        spawnPOIsForBiome(biome) {
            // Clear old POIs that are too far
            this.cleanupDistantPOIs();
            
            // Spawn new POIs based on biome
            const poiCount = Math.floor(Math.random() * 3) + 2;
            
            for (let i = 0; i < poiCount; i++) {
                if (this.spawnedPOIs.length >= 15) break; // Limit total POIs
                
                const poiType = this.selectPOITypeForBiome(biome);
                if (poiType) {
                    this.spawnPOI(poiType, biome);
                }
            }
        }

        selectPOITypeForBiome(biome) {
            const options = [];
            
            switch(biome.id) {
                case 'shallows':
                    options.push('kelp_forest', 'cave', 'shipwreck');
                    break;
                case 'twilight':
                    options.push('shipwreck', 'thermal_vent', 'crystal_formation', 'cave');
                    break;
                case 'midnight':
                    options.push('ancient_ruins', 'thermal_vent', 'crystal_formation', 'whale_fall');
                    break;
                case 'abyss':
                    options.push('ancient_ruins', 'abandoned_base', 'trench', 'whale_fall');
                    break;
                case 'hadal':
                    options.push('trench', 'ancient_ruins');
                    break;
            }
            
            if (options.length === 0) return null;
            return options[Math.floor(Math.random() * options.length)];
        }

        spawnPOI(type, biome) {
            const poi = {
                type: type,
                id: Math.random().toString(36).substr(2, 9),
                position: this.generatePosition(biome),
                biome: biome.id,
                visited: false,
                looted: false,
                dangerLevel: biome.dangerLevel,
                entities: []
            };
            
            // Generate POI-specific content
            this.generatePOIContent(poi);
            
            this.spawnedPOIs.push(poi);
            
            // Trigger spawn event
            if (window.EventSystem) {
                EventSystem.trigger('poi_spawned', { poi: poi });
            }
            
            return poi;
        }

        generatePosition(biome) {
            // Generate position within biome depth range
            const depth = biome.depthRange[0] + Math.random() * (biome.depthRange[1] - biome.depthRange[0]);
            const angle = Math.random() * Math.PI * 2;
            const distance = 20 + Math.random() * 60;
            
            return {
                x: Math.cos(angle) * distance,
                y: -depth,
                z: Math.sin(angle) * distance
            };
        }

        generatePOIContent(poi) {
            switch(poi.type) {
                case 'shipwreck':
                    poi.name = this.generateShipwreckName();
                    poi.loot = this.generateLoot('shipwreck');
                    poi.creatures = this.generateCreatures(poi.dangerLevel, 2);
                    poi.interior = true;
                    break;
                    
                case 'cave':
                    poi.name = 'Underwater Cave';
                    poi.loot = this.generateLoot('cave');
                    poi.creatures = this.generateCreatures(poi.dangerLevel, 3);
                    poi.interior = true;
                    poi.size = ['small', 'medium', 'large'][Math.floor(Math.random() * 3)];
                    break;
                    
                case 'thermal_vent':
                    poi.name = 'Hydrothermal Vent';
                    poi.hazard = 'heat';
                    poi.damage = 10; // per second
                    poi.loot = this.generateLoot('thermal');
                    break;
                    
                case 'kelp_forest':
                    poi.name = 'Kelp Forest';
                    poi.hiding = true; // Can hide from creatures
                    poi.loot = this.generateLoot('kelp');
                    break;
                    
                case 'ancient_ruins':
                    poi.name = this.generateRuinName();
                    poi.loot = this.generateLoot('ruins');
                    poi.creatures = this.generateCreatures(poi.dangerLevel + 1, 4);
                    poi.hasArtifact = Math.random() < 0.3;
                    poi.puzzle = Math.random() < 0.5;
                    break;
                    
                case 'abandoned_base':
                    poi.name = 'Research Station ' + String.fromCharCode(65 + Math.floor(Math.random() * 26));
                    poi.loot = this.generateLoot('base');
                    poi.creatures = this.generateCreatures(poi.dangerLevel, 3);
                    poi.interior = true;
                    poi.hasLog = true;
                    break;
                    
                case 'crystal_formation':
                    poi.name = 'Crystal Formation';
                    poi.loot = this.generateLoot('crystal');
                    poi.lightSource = true;
                    break;
                    
                case 'whale_fall':
                    poi.name = 'Whale Fall';
                    poi.loot = this.generateLoot('whale');
                    poi.creatures = this.generateCreatures(1, 5); // Many small scavengers
                    break;
                    
                case 'trench':
                    poi.name = 'The Trench';
                    poi.loot = this.generateLoot('trench');
                    poi.creatures = this.generateCreatures(3, 2);
                    poi.depth = 50 + Math.random() * 100;
                    break;
            }
        }

        generateShipwreckName() {
            const prefixes = ['SS', 'MV', 'HMS', 'F/V'];
            const names = ['Abyssal', 'Deep Venture', 'Mariana', 'Triton', 'Poseidon', 'Neptune', 'Kraken', 'Leviathan'];
            const suffixes = ['', 'II', 'III', 'Jr.', 'Sr.'];
            
            return `${prefixes[Math.floor(Math.random() * prefixes.length)]} ${names[Math.floor(Math.random() * names.length)]}${suffixes[Math.floor(Math.random() * suffixes.length)]}`;
        }

        generateRuinName() {
            const names = ['Temple of', 'Shrine to', 'Altar of', 'Citadel of'];
            const deities = ['the Deep', 'the Abyss', 'Dagon', 'Cthulhu', 'the Void', 'Ancient Ones'];
            return `${names[Math.floor(Math.random() * names.length)]} ${deities[Math.floor(Math.random() * deities.length)]}`;
        }

        generateLoot(poiType) {
            const lootTables = {
                shipwreck: ['flare', 'flare', 'oxygen_tank', 'battery', 'metal_scrap', 'old_journal'],
                cave: ['crystal_shard', 'rare_shell', 'ancient_bone', 'mineral'],
                thermal: ['heat_resistant_material', 'rare_mineral', 'research_data'],
                kelp: ['seaweed_bundle', 'bioluminescent_sample', 'medical_supplies'],
                ruins: ['ancient_artifact', 'gold_relic', 'mysterious_tablet', 'artifact_fragment'],
                base: ['research_notes', 'advanced_battery', 'medical_kit', 'oxygen_tank', 'data_log'],
                crystal: ['pure_crystal', 'energy_crystal', 'crystal_shard', 'crystal_cluster'],
                whale: ['organic_material', 'rare_bone', 'ambergris', 'samples'],
                trench: ['abyssal_ore', 'pressure_crystal', 'unknown_substance', 'void_fragment']
            };
            
            const table = lootTables[poiType] || ['flare'];
            const count = Math.floor(Math.random() * 3) + 1;
            const loot = [];
            
            for (let i = 0; i < count; i++) {
                loot.push(table[Math.floor(Math.random() * table.length)]);
            }
            
            return loot;
        }

        generateCreatures(dangerLevel, maxCount) {
            const creatures = [];
            const count = Math.floor(Math.random() * maxCount);
            
            for (let i = 0; i < count; i++) {
                creatures.push({
                    type: 'hostile',
                    alerted: false,
                    position: { x: 0, y: 0, z: 0 }
                });
            }
            
            return creatures;
        }

        cleanupDistantPOIs() {
            // Remove POIs that are too far from player
            if (!window.player) return;
            
            const playerPos = window.player.position;
            const maxDistance = 150;
            
            this.spawnedPOIs = this.spawnedPOIs.filter(poi => {
                const dist = Math.sqrt(
                    Math.pow(poi.position.x - playerPos.x, 2) +
                    Math.pow(poi.position.z - playerPos.z, 2)
                );
                return dist < maxDistance;
            });
        }

        getNearbyPOIs(position, radius = 30) {
            return this.spawnedPOIs.filter(poi => {
                const dist = Math.sqrt(
                    Math.pow(poi.position.x - position.x, 2) +
                    Math.pow(poi.position.y - position.y, 2) +
                    Math.pow(poi.position.z - position.z, 2)
                );
                return dist < radius;
            });
        }

        markPOIVisited(poiId) {
            const poi = this.spawnedPOIs.find(p => p.id === poiId);
            if (poi && !poi.visited) {
                poi.visited = true;
                
                // Award exploration XP
                if (window.SaveSystem) {
                    SaveSystem.updateSessionStat('poisDiscovered', 1);
                }
            }
        }
    }

    // ============================================
    // UTILITY FUNCTIONS
    // ============================================
    function lerp(a, b, t) {
        return a + (b - a) * t;
    }

    function lerpColor(c1, c2, t) {
        const r1 = (c1 >> 16) & 0xff;
        const g1 = (c1 >> 8) & 0xff;
        const b1 = c1 & 0xff;
        
        const r2 = (c2 >> 16) & 0xff;
        const g2 = (c2 >> 8) & 0xff;
        const b2 = c2 & 0xff;
        
        const r = Math.round(lerp(r1, r2, t));
        const g = Math.round(lerp(g1, g2, t));
        const b = Math.round(lerp(b1, b2, t));
        
        return (r << 16) | (g << 8) | b;
    }

    // ============================================
    // PUBLIC API
    // ============================================
    return {
        BIOMES,
        init,
        update,
        getBiomeForDepth,
        getCurrentBiome: () => currentBiome,
        getPOIManager: () => poiManager,
        
        // For external systems
        isInDangerousBiome: () => currentBiome && currentBiome.dangerLevel >= 2,
        getCurrentVisibility: () => currentBiome ? currentBiome.visibility : 20,
        shouldApplyPressureDamage: () => currentBiome && currentBiome.pressureDamage,
        getPressureDamageRate: () => currentBiome ? currentBiome.pressureDamageRate : 0
    };
})();

// Global access
window.BiomeSystem = BiomeSystem;

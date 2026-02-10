/* ============================================
   The Abyss - Expanded Biome System
   8 distinct biomes with unique characteristics
   Phase 2 Implementation
   ============================================ */

const ExpandedBiomeSystem = (function() {
    'use strict';

    // Extended biome definitions
    const BIOMES = {
        SUNLIT_ZONE: {
            id: 'sunlit',
            name: 'Sunlit Zone',
            description: 'Warm waters bathed in sunlight. The journey begins.',
            depthRange: [0, 20],
            fogColor: 0x20a0c0,
            fogDensity: 0.015,
            ambientLight: 0.6,
            waterColor: 0x40c0e0,
            visibility: 60,
            temperature: 25,
            pressure: 1,
            creatureTypes: ['small_fish', 'jellyfish', 'seal', 'dolphin'],
            creatureDensity: 0.4,
            maxCreatures: 5,
            dangerLevel: 0,
            resources: ['coral', 'seaweed', 'shell', 'pearl'],
            resourceDensity: 0.7,
            lightRays: true,
            causticsIntensity: 1.0,
            ambientTrack: 'shallows'
        },

        TWILIGHT_ZONE: {
            id: 'twilight',
            name: 'Twilight Zone',
            description: 'The sun fades. Strange lights begin to appear.',
            depthRange: [20, 50],
            fogColor: 0x102040,
            fogDensity: 0.025,
            ambientLight: 0.3,
            waterColor: 0x153050,
            visibility: 35,
            temperature: 15,
            pressure: 3,
            creatureTypes: ['angler', 'jellyfish', 'squid', 'small_shark'],
            creatureDensity: 0.6,
            maxCreatures: 6,
            dangerLevel: 1,
            resources: ['bioluminescent_plant', 'crystal', 'wreck_debris'],
            resourceDensity: 0.5,
            lightRays: true,
            causticsIntensity: 0.5,
            ambientTrack: 'twilight'
        },

        MIDNIGHT_ZONE: {
            id: 'midnight',
            name: 'Midnight Zone',
            description: 'Total darkness. Only bioluminescence guides you.',
            depthRange: [50, 100],
            fogColor: 0x080820,
            fogDensity: 0.04,
            ambientLight: 0.05,
            waterColor: 0x0a1520,
            visibility: 20,
            temperature: 8,
            pressure: 6,
            creatureTypes: ['angler', 'stalker', 'mimic', 'swarmer', 'gulper'],
            creatureDensity: 0.9,
            maxCreatures: 8,
            dangerLevel: 2,
            resources: ['rare_crystal', 'ancient_bone', 'black_pearl'],
            resourceDensity: 0.4,
            lightRays: false,
            ambientTrack: 'midnight'
        },

        ABYSSAL_PLAIN: {
            id: 'abyssal',
            name: 'Abyssal Plain',
            description: 'A desolate expanse of silt and secrets.',
            depthRange: [100, 200],
            fogColor: 0x020510,
            fogDensity: 0.06,
            ambientLight: 0.01,
            waterColor: 0x050810,
            visibility: 12,
            temperature: 4,
            pressure: 12,
            creatureTypes: ['leviathan_juvenile', 'abyssal_horror', 'mimic', 'stalker'],
            creatureDensity: 0.7,
            maxCreatures: 6,
            dangerLevel: 3,
            resources: ['abyssal_ore', 'void_crystal', 'leviathan_pearl'],
            resourceDensity: 0.3,
            lightRays: false,
            ambientTrack: 'abyss'
        },

        HADAL_ZONE: {
            id: 'hadal',
            name: 'Hadal Zone',
            description: 'The deepest trenches. Few have returned.',
            depthRange: [200, 400],
            fogColor: 0x000000,
            fogDensity: 0.08,
            ambientLight: 0,
            waterColor: 0x000000,
            visibility: 8,
            temperature: 2,
            pressure: 25,
            creatureTypes: ['leviathan', 'ancient_one', 'void_walker'],
            creatureDensity: 0.4,
            maxCreatures: 3,
            dangerLevel: 4,
            resources: ['primordial_essence', 'hadal_stone', 'ancient_relic'],
            resourceDensity: 0.2,
            lightRays: false,
            pressureDamage: true,
            pressureDamageRate: 2,
            ambientTrack: 'hadal'
        }
    };

    let currentBiome = null;
    let previousBiome = null;
    let transitionProgress = 0;

    function getBiomeForDepth(depth) {
        for (const key in BIOMES) {
            const biome = BIOMES[key];
            if (depth >= biome.depthRange[0] && depth < biome.depthRange[1]) {
                return biome;
            }
        }
        return BIOMES.HADAL_ZONE;
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
            transitionProgress = 0;
        }

        if (transitionProgress < 1) {
            transitionProgress = Math.min(1, transitionProgress + deltaTime * 0.5);
        }

        return currentBiome;
    }

    function onBiomeEnter(biome) {
        console.log(`Entering ${biome.name}`);
        if (window.EventSystem) {
            EventSystem.trigger('biome_enter', { biome });
        }

        if (window.showNotification) {
            const warnings = {
                2: '🌑 Entering hostile waters...',
                3: '💀 The abyss watches you',
                4: '🔥 CRUSHING PRESSURE!'
            };
            if (warnings[biome.dangerLevel]) {
                showNotification(warnings[biome.dangerLevel], 'danger');
            }
        }
    }

    function onBiomeExit(biome) {
        if (window.EventSystem) {
            EventSystem.trigger('biome_exit', { biome });
        }
    }

    return {
        BIOMES,
        update,
        getBiomeForDepth,
        getCurrentBiome: () => currentBiome,
        getAllBiomes: () => Object.values(BIOMES),
        getVisibility: () => currentBiome?.visibility || 20,
        getDangerLevel: () => currentBiome?.dangerLevel || 0
    };
})();

window.ExpandedBiomeSystem = ExpandedBiomeSystem;

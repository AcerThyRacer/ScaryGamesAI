/**
 * Biome System - 5 distinct backrooms environments
 */

var BiomeSystem = (function() {
    'use strict';

    var biomes = {
        yellow: {
            name: 'Yellow Backrooms',
            id: 'yellow',
            wallColor: 0xb5a44c,
            floorColor: 0x6b6030,
            ceilingColor: 0x8a7d45,
            fogColor: 0x080600,
            fogDensity: 0.038,
            lightColor: 0xffeecc,
            lightIntensity: 0.6,
            ambientColor: 0x333322,
            wallpaperPattern: 'stripes',
            floorPattern: 'tiles',
            mood: 'classic',
            difficulty: 1.0
        },
        mono: {
            name: 'Mono-Yellow',
            id: 'mono',
            wallColor: 0x999977,
            floorColor: 0x555544,
            ceilingColor: 0x777766,
            fogColor: 0x111111,
            fogDensity: 0.05,
            lightColor: 0xddddcc,
            lightIntensity: 0.4,
            ambientColor: 0x222222,
            wallpaperPattern: 'faded',
            floorPattern: 'concrete',
            mood: 'desaturated',
            difficulty: 1.3
        },
        infinite: {
            name: 'Infinite',
            id: 'infinite',
            wallColor: 0xc4b85a,
            floorColor: 0x776d40,
            ceilingColor: 0x9a8d55,
            fogColor: 0x0a0800,
            fogDensity: 0.06,
            lightColor: 0xffdd88,
            lightIntensity: 0.5,
            ambientColor: 0x443311,
            wallpaperPattern: 'looping',
            floorPattern: 'impossible',
            mood: 'non-euclidean',
            difficulty: 1.5
        },
        flooded: {
            name: 'Flooded',
            id: 'flooded',
            wallColor: 0x8b9bb4,
            floorColor: 0x224466,
            ceilingColor: 0x667788,
            fogColor: 0x001122,
            fogDensity: 0.07,
            lightColor: 0xaaccff,
            lightIntensity: 0.3,
            ambientColor: 0x112233,
            wallpaperPattern: 'water-damaged',
            floorPattern: 'submerged',
            mood: 'aquatic',
            difficulty: 1.4
        },
        construction: {
            name: 'Construction',
            id: 'construction',
            wallColor: 0x887766,
            floorColor: 0x443322,
            ceilingColor: 0x665544,
            fogColor: 0x1a1510,
            fogDensity: 0.055,
            lightColor: 0xffaa66,
            lightIntensity: 0.7,
            ambientColor: 0x332211,
            wallpaperPattern: 'unfinished',
            floorPattern: 'raw',
            mood: 'industrial',
            difficulty: 1.2
        },
        sewers: {
            name: 'The Sewers',
            id: 'sewers',
            wallColor: 0x223322,
            floorColor: 0x111a11,
            ceilingColor: 0x1a221a,
            fogColor: 0x0a110a,
            fogDensity: 0.09,
            lightColor: 0x44aa66,
            lightIntensity: 0.25,
            ambientColor: 0x051105,
            wallpaperPattern: 'slime-covered',
            floorPattern: 'grate-water',
            mood: 'terrifying',
            difficulty: 1.8,
            special: {
                waterLevel: 0.3,
                hasSlime: true,
                hasRats: true,
                echoEffect: true,
                veryDark: true
            }
        }
    };

    var currentBiome = null;
    var scene = null;
    var wallMaterial = null;
    var floorMaterial = null;
    var ceilingMaterial = null;

    function init(threeScene) {
        scene = threeScene;
        currentBiome = biomes.yellow;
        console.log('[BiomeSystem] Initialized with', Object.keys(biomes).length, 'biomes');
    }

    function setBiome(biomeId) {
        var biome = biomes[biomeId];
        if (!biome) {
            console.warn('Unknown biome:', biomeId, 'using yellow');
            biome = biomes.yellow;
        }

        currentBiome = biome;

        if (scene) {
            scene.background = new THREE.Color(biome.fogColor);
            scene.fog = new THREE.FogExp2(biome.fogColor, biome.fogDensity);
        }

        updateMaterials(biome);

        console.log('[BiomeSystem] Switched to', biome.name);
        return biome;
    }

    function updateMaterials(biome) {
        if (!wallMaterial) {
            wallMaterial = new THREE.MeshStandardMaterial({
                color: biome.wallColor,
                roughness: 0.9,
                metalness: 0.1
            });
        } else {
            wallMaterial.color.setHex(biome.wallColor);
        }

        if (!floorMaterial) {
            floorMaterial = new THREE.MeshStandardMaterial({
                color: biome.floorColor,
                roughness: 0.95,
                metalness: 0.05
            });
        } else {
            floorMaterial.color.setHex(biome.floorColor);
        }

        if (!ceilingMaterial) {
            ceilingMaterial = new THREE.MeshStandardMaterial({
                color: biome.ceilingColor,
                roughness: 0.8,
                metalness: 0.1
            });
        } else {
            ceilingMaterial.color.setHex(biome.ceilingColor);
        }
    }

    function getBiome(biomeId) {
        return biomes[biomeId] || biomes.yellow;
    }

    function getCurrentBiome() {
        return currentBiome;
    }

    function getAllBiomes() {
        return biomes;
    }

    function getBiomeDifficulty(biomeId) {
        var biome = biomes[biomeId];
        return biome ? biome.difficulty : 1.0;
    }

    function applyToScene(threeScene) {
        if (!currentBiome) return;
        scene = threeScene;
        scene.background = new THREE.Color(currentBiome.fogColor);
        scene.fog = new THREE.FogExp2(currentBiome.fogColor, currentBiome.fogDensity);
    }

    function getWallMaterial() {
        return wallMaterial;
    }

    function getFloorMaterial() {
        return floorMaterial;
    }

    function getCeilingMaterial() {
        return ceilingMaterial;
    }

    return {
        init: init,
        setBiome: setBiome,
        getBiome: getBiome,
        getCurrentBiome: getCurrentBiome,
        getAllBiomes: getAllBiomes,
        getBiomeDifficulty: getBiomeDifficulty,
        applyToScene: applyToScene,
        getWallMaterial: getWallMaterial,
        getFloorMaterial: getFloorMaterial,
        getCeilingMaterial: getCeilingMaterial
    };
})();

if (typeof window !== 'undefined') {
    window.BiomeSystem = BiomeSystem;
}

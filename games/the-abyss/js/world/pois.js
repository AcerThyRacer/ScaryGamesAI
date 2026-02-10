/* ============================================
   The Abyss - Point of Interest System
   Shipwrecks, caves, ruins, and more
   Phase 2 Implementation
   ============================================ */

const POISystem = (function() {
    'use strict';

    const POI_TYPES = {
        SHIPWRECK: {
            id: 'shipwreck',
            name: 'Shipwreck',
            models: ['cargo_ship', 'submarine', 'research_vessel', 'tanker'],
            lootTable: ['metal_scrap', 'battery', 'flare', 'oxygen_tank', 'data_log'],
            creatures: ['small_fish', 'eel', 'octopus'],
            dangerLevel: 1,
            explorationTime: 30,
            xpReward: 100
        },

        CAVE: {
            id: 'cave',
            name: 'Underwater Cave',
            variants: ['small', 'medium', 'large', 'maze'],
            lootTable: ['crystal_shard', 'rare_shell', 'ancient_bone', 'mineral'],
            creatures: ['bat', 'cave_fish', 'stalker'],
            dangerLevel: 2,
            explorationTime: 45,
            xpReward: 150,
            special: 'darkness'
        },

        THERMAL_VENT: {
            id: 'thermal_vent',
            name: 'Hydrothermal Vent',
            lootTable: ['thermal_crystal', 'rare_mineral', 'research_data'],
            hazards: ['extreme_heat', 'toxic_gas'],
            dangerLevel: 2,
            explorationTime: 20,
            xpReward: 200
        },

        KELP_FOREST: {
            id: 'kelp_forest',
            name: 'Kelp Forest',
            lootTable: ['seaweed_bundle', 'bioluminescent_sample', 'hiding_spot'],
            creatures: ['kelp_fish', 'forest_creature'],
            dangerLevel: 1,
            explorationTime: 25,
            xpReward: 75,
            special: 'hiding'
        },

        ANCIENT_RUINS: {
            id: 'ancient_ruins',
            name: 'Ancient Ruins',
            lootTable: ['ancient_tablet', 'gold_relic', 'mysterious_device', 'artifact'],
            creatures: ['ruin_guardian', 'construct'],
            dangerLevel: 3,
            explorationTime: 60,
            xpReward: 500,
            special: 'puzzle'
        },

        ABANDONED_BASE: {
            id: 'abandoned_base',
            name: 'Research Station',
            lootTable: ['research_notes', 'advanced_battery', 'medical_kit', 'data_log'],
            creatures: ['security_drone', 'mutant_fish'],
            dangerLevel: 2,
            explorationTime: 40,
            xpReward: 250
        },

        CRYSTAL_FORMATION: {
            id: 'crystal',
            name: 'Crystal Formation',
            lootTable: ['pure_crystal', 'energy_crystal', 'crystal_shard'],
            dangerLevel: 0,
            explorationTime: 15,
            xpReward: 150,
            special: 'light_source'
        },

        WHALE_FALL: {
            id: 'whale_fall',
            name: 'Whale Fall',
            lootTable: ['organic_material', 'rare_bone', 'samples'],
            creatures: ['bone_worm', 'scavenger', 'deep_crab'],
            dangerLevel: 1,
            explorationTime: 35,
            xpReward: 200
        },

        TRENCH: {
            id: 'trench',
            name: 'Deep Trench',
            lootTable: ['abyssal_ore', 'pressure_crystal', 'unknown_substance'],
            creatures: ['trench_creature', 'leviathan'],
            dangerLevel: 4,
            explorationTime: 50,
            xpReward: 400
        }
    };

    const activePOIs = [];
    const exploredPOIs = new Set();
    let poiIdCounter = 0;

    class PointOfInterest {
        constructor(type, position, biome) {
            this.id = `poi_${++poiIdCounter}`;
            this.type = type;
            this.position = position.clone();
            this.biome = biome;
            this.config = POI_TYPES[type];
            
            this.visited = false;
            this.looted = false;
            this.explorationProgress = 0;
            this.currentDanger = 0;
            
            // Generate content
            this.loot = this.generateLoot();
            this.creatures = this.generateCreatures();
            this.events = this.generateEvents();
            
            // Visual representation
            this.mesh = null;
            this.light = null;
        }

        generateLoot() {
            const loot = [];
            const count = 1 + Math.floor(Math.random() * 3);
            
            for (let i = 0; i < count; i++) {
                const item = this.config.lootTable[
                    Math.floor(Math.random() * this.config.lootTable.length)
                ];
                loot.push({
                    item: item,
                    quantity: 1 + Math.floor(Math.random() * 2)
                });
            }
            
            // Rare chance for special item
            if (Math.random() < 0.1) {
                loot.push({ item: 'rare_artifact', quantity: 1 });
            }
            
            return loot;
        }

        generateCreatures() {
            if (!this.config.creatures) return [];
            
            const count = Math.floor(Math.random() * 3);
            const creatures = [];
            
            for (let i = 0; i < count; i++) {
                const type = this.config.creatures[
                    Math.floor(Math.random() * this.config.creatures.length)
                ];
                creatures.push({
                    type: type,
                    position: this.getRandomPositionNearby(),
                    state: 'idle'
                });
            }
            
            return creatures;
        }

        generateEvents() {
            const events = [];
            
            // Danger events based on danger level
            if (this.config.dangerLevel >= 2) {
                events.push({
                    type: 'ambush',
                    trigger: 'entry',
                    chance: 0.3
                });
            }
            
            // Special events
            if (this.config.special === 'puzzle') {
                events.push({
                    type: 'puzzle',
                    trigger: 'interaction',
                    solved: false
                });
            }
            
            return events;
        }

        getRandomPositionNearby() {
            const offset = new THREE.Vector3(
                (Math.random() - 0.5) * 20,
                (Math.random() - 0.5) * 10,
                (Math.random() - 0.5) * 20
            );
            return this.position.clone().add(offset);
        }

        visit() {
            if (this.visited) return;
            
            this.visited = true;
            exploredPOIs.add(this.id);
            
            // Trigger events
            this.events.forEach(event => {
                if (event.trigger === 'entry' && Math.random() < event.chance) {
                    this.triggerEvent(event);
                }
            });
            
            // Award XP
            if (window.SaveSystem) {
                SaveSystem.updateSessionStat('explorationXP', this.config.xpReward);
            }
            
            // Notification
            if (window.showNotification) {
                showNotification(`📍 Discovered: ${this.config.name}`, 'success');
            }
            
            // Achievement
            if (exploredPOIs.size >= 10 && window.SaveSystem) {
                SaveSystem.unlockAchievement('explorer');
            }
        }

        triggerEvent(event) {
            switch(event.type) {
                case 'ambush':
                    this.triggerAmbush();
                    break;
                case 'puzzle':
                    this.triggerPuzzle();
                    break;
            }
        }

        triggerAmbush() {
            if (window.showNotification) {
                showNotification('👹 Ambush! Creatures emerge from hiding!', 'danger');
            }
            
            // Spawn additional creatures
            this.creatures.forEach(creature => {
                creature.state = 'hostile';
            });
        }

        triggerPuzzle() {
            // Would open puzzle UI
            console.log('Puzzle triggered at', this.config.name);
        }

        lootContainer(containerIndex) {
            if (this.looted) return null;
            
            const loot = this.loot[containerIndex];
            if (loot) {
                this.loot[containerIndex] = null;
                
                // Check if all looted
                if (this.loot.every(l => l === null)) {
                    this.looted = true;
                }
                
                return loot;
            }
            return null;
        }

        dispose() {
            if (this.mesh) {
                window.scene?.remove(this.mesh);
                this.mesh.geometry?.dispose();
                this.mesh.material?.dispose();
            }
            if (this.light) {
                window.scene?.remove(this.light);
            }
        }
    }

    // ============================================
    // POI MANAGEMENT
    // ============================================
    function spawnForBiome(biome) {
        const count = 2 + Math.floor(Math.random() * 3);
        
        for (let i = 0; i < count; i++) {
            if (activePOIs.length >= 15) break;
            
            const type = selectPOITypeForBiome(biome);
            if (type) {
                const position = generatePosition(biome);
                const poi = new PointOfInterest(type, position, biome.id);
                activePOIs.push(poi);
                
                // Create visual
                createVisuals(poi);
                
                // Event
                if (window.EventSystem) {
                    EventSystem.trigger('poi_spawned', { poi });
                }
            }
        }
    }

    function selectPOITypeForBiome(biome) {
        const options = [];
        
        switch(biome.id) {
            case 'sunlit':
                options.push('KELP_FOREST', 'SHIPWRECK', 'CRYSTAL_FORMATION');
                break;
            case 'twilight':
                options.push('SHIPWRECK', 'CAVE', 'CRYSTAL_FORMATION', 'KELP_FOREST');
                break;
            case 'midnight':
                options.push('ANCIENT_RUINS', 'THERMAL_VENT', 'CAVE', 'WHALE_FALL');
                break;
            case 'abyssal':
                options.push('ANCIENT_RUINS', 'ABANDONED_BASE', 'TRENCH', 'WHALE_FALL');
                break;
            case 'hadal':
                options.push('TRENCH', 'ANCIENT_RUINS');
                break;
        }
        
        if (options.length === 0) return null;
        
        const typeKey = options[Math.floor(Math.random() * options.length)];
        return typeKey;
    }

    function generatePosition(biome) {
        const depth = biome.depthRange[0] + 
            Math.random() * (biome.depthRange[1] - biome.depthRange[0]);
        const angle = Math.random() * Math.PI * 2;
        const distance = 30 + Math.random() * 70;
        
        return new THREE.Vector3(
            Math.cos(angle) * distance,
            -depth,
            Math.sin(angle) * distance
        );
    }

    function createVisuals(poi) {
        // Simple placeholder visuals - would be replaced with actual models
        const geometry = new THREE.BoxGeometry(2, 2, 2);
        const material = new THREE.MeshStandardMaterial({
            color: poi.config.dangerLevel > 2 ? 0xff0000 : 0x00aaff,
            transparent: true,
            opacity: 0.3
        });
        
        poi.mesh = new THREE.Mesh(geometry, material);
        poi.mesh.position.copy(poi.position);
        
        if (window.scene) {
            window.scene.add(poi.mesh);
        }
        
        // Add light for some POIs
        if (poi.config.special === 'light_source' || poi.config.id === 'thermal_vent') {
            poi.light = new THREE.PointLight(0x00aaff, 1, 20);
            poi.light.position.copy(poi.position);
            window.scene?.add(poi.light);
        }
    }

    function getNearbyPOIs(position, radius = 30) {
        return activePOIs.filter(poi => {
            const dist = poi.position.distanceTo(position);
            return dist < radius && !poi.visited;
        });
    }

    function visitPOI(poiId) {
        const poi = activePOIs.find(p => p.id === poiId);
        if (poi) {
            poi.visit();
        }
        return poi;
    }

    function cleanupDistantPOIs(playerPosition, maxDistance = 200) {
        for (let i = activePOIs.length - 1; i >= 0; i--) {
            const poi = activePOIs[i];
            const dist = poi.position.distanceTo(playerPosition);
            
            if (dist > maxDistance && poi.visited) {
                poi.dispose();
                activePOIs.splice(i, 1);
            }
        }
    }

    return {
        POI_TYPES,
        PointOfInterest,
        spawnForBiome,
        getNearbyPOIs,
        visitPOI,
        cleanupDistantPOIs,
        getAllPOIs: () => activePOIs,
        getExploredCount: () => exploredPOIs.size
    };
})();

window.POISystem = POISystem;

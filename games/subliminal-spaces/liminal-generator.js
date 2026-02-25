/**
 * Liminal Space Generator
 * Procedurally generates unsettling liminal spaces using WFC and noise algorithms
 */

import { WaveFunctionCollapse } from '../../core/procedural/WaveFunctionCollapse.js';

export class LiminalSpaceGenerator {
    constructor(options = {}) {
        this.options = {
            detailLevel: options.detailLevel || 'high', // low, medium, high
            themeVariation: options.themeVariation || 0.7, // 0-1
            ensurePlayability: options.ensurePlayability || true,
            seed: options.seed || Date.now(),
            ...options
        };

        this.wfc = new WaveFunctionCollapse({
            width: 64,
            height: 64,
            tileSize: 4
        });

        // Initialize seeded random
        this.random = this.seededRandom(this.options.seed);

        // Architectural elements library
        this.elements = {
            walls: [
                'plain_drywall',
                'concrete_blocks',
                'ceramic_tiles',
                'wood_paneling',
                'peeling_paint',
                'water_damage',
                'cracked_plaster',
                'fluorescent_sconces'
            ],
            floors: [
                'linoleum_tiles',
                'patterned_carpet',
                'concrete_slab',
                'ceramic_tile',
                'hardwood worn',
                'epoxy_coating',
                'cracked_tile'
            ],
            ceilings: [
                'drop_ceiling',
                'exposed_pipes',
                'concrete_beams',
                'acoustic_tiles',
                'fluorescent_panels',
                'stained_plaster'
            ],
            lighting: [
                'fluorescent_tubes',
                'recessed_lights',
                'emergency_exit_sign',
                'flickering_bulb',
                'natural_skylight',
                'neon_accent',
                'dead_fixture'
            ],
            features: [
                'doorway_empty',
                'doorway_door',
                'window_boarded',
                'window_dark',
                'vent_grate',
                'fire_extinguisher',
                'trash_bin',
                'potted_plant_dead',
                'vending_machine',
                'water_fountain',
                'elevator_doors',
                'stairwell_entrance'
            ]
        };

        // Location-specific configurations
        this.locationConfigs = {
            empty_mall: {
                wallHeight: 4,
                corridorWidth: 8,
                lightingColor: { r: 0.9, g: 0.85, b: 0.7 },
                fogDensity: 0.02,
                primaryMaterials: ['ceramic_tiles', 'patterned_carpet', 'fluorescent_panels'],
                features: ['vending_machine', 'potted_plant_dead', 'doorway_empty'],
                uneaseModifiers: {
                    lighting: 0.3,
                    sound: 0.4,
                    spatial: 0.5
                }
            },
            office_complex: {
                wallHeight: 3,
                corridorWidth: 5,
                lightingColor: { r: 0.85, g: 0.9, b: 0.95 },
                fogDensity: 0.015,
                primaryMaterials: ['plain_drywall', 'linoleum_tiles', 'drop_ceiling'],
                features: ['doorway_door', 'window_dark', 'vent_grate'],
                uneaseModifiers: {
                    lighting: 0.4,
                    sound: 0.5,
                    spatial: 0.4
                }
            },
            hotel_corridor: {
                wallHeight: 3.5,
                corridorWidth: 4,
                lightingColor: { r: 0.9, g: 0.8, b: 0.6 },
                fogDensity: 0.025,
                primaryMaterials: ['patterned_carpet', 'wood_paneling', 'acoustic_tiles'],
                features: ['doorway_door', 'dead_fixture', 'elevator_doors'],
                uneaseModifiers: {
                    lighting: 0.5,
                    sound: 0.3,
                    spatial: 0.6
                }
            },
            indoor_pool: {
                wallHeight: 5,
                corridorWidth: 10,
                lightingColor: { r: 0.7, g: 0.85, b: 0.9 },
                fogDensity: 0.04,
                primaryMaterials: ['ceramic_tiles', 'concrete_slab', 'exposed_pipes'],
                features: ['water_fountain', 'vent_grate', 'window_boarded'],
                uneaseModifiers: {
                    lighting: 0.6,
                    sound: 0.7,
                    spatial: 0.5
                }
            },
            parking_garage: {
                wallHeight: 4.5,
                corridorWidth: 12,
                lightingColor: { r: 0.75, g: 0.75, b: 0.8 },
                fogDensity: 0.03,
                primaryMaterials: ['concrete_blocks', 'concrete_slab', 'concrete_beams'],
                features: ['fire_extinguisher', 'vent_grate', 'stairwell_entrance'],
                uneaseModifiers: {
                    lighting: 0.5,
                    sound: 0.6,
                    spatial: 0.7
                }
            },
            school_hallway: {
                wallHeight: 4,
                corridorWidth: 6,
                lightingColor: { r: 0.85, g: 0.85, b: 0.9 },
                fogDensity: 0.02,
                primaryMaterials: ['plain_drywall', 'linoleum_tiles', 'acoustic_tiles'],
                features: ['doorway_door', 'window_dark', 'trash_bin', 'water_fountain'],
                uneaseModifiers: {
                    lighting: 0.4,
                    sound: 0.5,
                    spatial: 0.5
                }
            },
            hospital_wing: {
                wallHeight: 3.5,
                corridorWidth: 5,
                lightingColor: { r: 0.95, g: 0.95, b: 1.0 },
                fogDensity: 0.025,
                primaryMaterials: ['ceramic_tiles', 'epoxy_coating', 'fluorescent_panels'],
                features: ['doorway_door', 'vent_grate', 'fire_extinguisher', 'elevator_doors'],
                uneaseModifiers: {
                    lighting: 0.6,
                    sound: 0.4,
                    spatial: 0.6
                }
            },
            backrooms_level: {
                wallHeight: 3,
                corridorWidth: 4,
                lightingColor: { r: 0.95, g: 0.9, b: 0.5 },
                fogDensity: 0.035,
                primaryMaterials: ['peeling_paint', 'patterned_carpet', 'fluorescent_panels'],
                features: ['doorway_empty', 'dead_fixture', 'water_damage'],
                uneaseModifiers: {
                    lighting: 0.7,
                    sound: 0.6,
                    spatial: 0.8
                }
            }
        };
    }

    seededRandom(seed) {
        return function() {
            seed = (seed * 9301 + 49297) % 233280;
            return seed / 233280;
        };
    }

    generate(locationType, seed = null) {
        if (seed) {
            this.random = this.seededRandom(seed);
        }

        console.log(`🏗️ Generating ${locationType}...`);

        const config = this.locationConfigs[locationType] || this.locationConfigs.empty_mall;

        // Generate floor plan using WFC
        const floorPlan = this.generateFloorPlan(config);

        // Extrude to 3D
        const geometry3D = this.extrudeTo3D(floorPlan, config);

        // Add architectural details
        this.addArchitecturalDetails(geometry3D, config);

        // Place props and features
        this.placeProps(geometry3D, config);

        // Setup lighting
        this.setupLighting(geometry3D, config);

        // Add atmospheric triggers
        this.addTriggers(geometry3D, config);

        // Calculate bounds
        geometry3D.bounds = this.calculateBounds(geometry3D);

        console.log(`✅ Generated ${Object.keys(geometry3D.rooms).length} rooms, ${geometry3D.corridors.length} corridors`);

        return geometry3D;
    }

    generateFloorPlan(config) {
        // Use WFC for coherent room layout
        const rules = this.createArchitecturalRules(config);
        const wfcMap = this.wfc.generate(rules, this.options.seed);

        const floorPlan = {
            rooms: [],
            corridors: [],
            connections: []
        };

        // Parse WFC output into rooms and corridors
        for (let y = 0; y < wfcMap.height; y++) {
            for (let x = 0; x < wfcMap.width; x++) {
                const tile = wfcMap.getTile(x, y);

                if (tile && tile.type === 'room') {
                    floorPlan.rooms.push({
                        x: x * config.corridorWidth,
                        z: y * config.corridorWidth,
                        width: config.corridorWidth * (tile.size || 1),
                        height: config.corridorWidth * (tile.size || 1),
                        type: tile.subtype || 'generic'
                    });
                } else if (tile && tile.type === 'corridor') {
                    floorPlan.corridors.push({
                        x: x * config.corridorWidth,
                        z: y * config.corridorWidth,
                        width: config.corridorWidth,
                        length: config.corridorWidth,
                        direction: tile.direction || 'horizontal'
                    });
                }
            }
        }

        // Ensure playability - connect all rooms
        if (this.options.ensurePlayability) {
            this.ensureConnectivity(floorPlan);
        }

        return floorPlan;
    }

    createArchitecturalRules(config) {
        // Define adjacency rules for believable architecture
        return {
            tiles: [
                { id: 'room_small', weight: 0.4 },
                { id: 'room_large', weight: 0.2 },
                { id: 'corridor_h', weight: 0.2 },
                { id: 'corridor_v', weight: 0.2 },
                { id: 'intersection', weight: 0.1 },
                { id: 'dead_end', weight: 0.1 },
                { id: 'empty', weight: 0.3 }
            ],
            rules: [
                // Corridors connect to rooms
                { from: 'corridor_h', to: ['room_small', 'room_large', 'corridor_h', 'intersection'] },
                { from: 'corridor_v', to: ['room_small', 'room_large', 'corridor_v', 'intersection'] },

                // Rooms can be anywhere
                { from: 'room_small', to: ['corridor_h', 'corridor_v', 'intersection', 'dead_end', 'room_small'] },
                { from: 'room_large', to: ['corridor_h', 'corridor_v', 'intersection', 'dead_end'] },

                // Intersections connect corridors
                { from: 'intersection', to: ['corridor_h', 'corridor_v', 'intersection'] },

                // Dead ends terminate
                { from: 'dead_end', to: ['corridor_h', 'corridor_v'] },

                // Empty space is flexible
                { from: 'empty', to: ['empty', 'corridor_h', 'corridor_v', 'room_small'] }
            ]
        };
    }

    ensureConnectivity(floorPlan) {
        // Simple algorithm to ensure all rooms are reachable
        if (floorPlan.rooms.length === 0) return;

        const visited = new Set();
        const queue = [floorPlan.rooms[0]];
        visited.add(0);

        while (queue.length > 0) {
            const current = queue.shift();

            // Find adjacent corridors
            floorPlan.corridors.forEach((corridor, index) => {
                const key = `corridor_${index}`;
                if (!visited.has(key)) {
                    const dist = Math.hypot(
                        corridor.x - (current.x + current.width / 2),
                        corridor.z - (current.z + current.height / 2)
                    );

                    if (dist < 10) {
                        visited.add(key);
                        floorPlan.connections.push({
                            from: current,
                            to: corridor
                        });
                        queue.push(corridor);
                    }
                }
            });

            // Find adjacent rooms
            floorPlan.rooms.forEach((room, index) => {
                const key = `room_${index}`;
                if (!visited.has(key)) {
                    const dist = Math.hypot(
                        room.x - (current.x + current.width / 2),
                        room.z - (current.z + current.height / 2)
                    );

                    if (dist < 15) {
                        visited.add(key);
                        floorPlan.connections.push({
                            from: current,
                            to: room
                        });
                        queue.push(room);
                    }
                }
            });
        }
    }

    extrudeTo3D(floorPlan, config) {
        const geometry = {
            rooms: {},
            corridors: [],
            walls: [],
            floors: [],
            ceilings: [],
            vertices: [],
            indices: []
        };

        // Extrude rooms
        floorPlan.rooms.forEach((room, index) => {
            const room3D = {
                id: `room_${index}`,
                position: { x: room.x, y: 0, z: room.z },
                size: { x: room.width, y: config.wallHeight, z: room.height },
                type: room.type,
                surfaces: this.createRoomSurfaces(room, config)
            };

            geometry.rooms[room3D.id] = room3D;
            geometry.vertices.push(...room3D.surfaces.vertices);
            geometry.indices.push(...room3D.surfaces.indices);
        });

        // Extrude corridors
        floorPlan.corridors.forEach((corridor, index) => {
            const corridor3D = {
                id: `corridor_${index}`,
                position: { 
                    x: corridor.x, 
                    y: 0, 
                    z: corridor.z 
                },
                size: {
                    x: corridor.direction === 'horizontal' ? corridor.length : corridor.width,
                    y: config.wallHeight,
                    z: corridor.direction === 'vertical' ? corridor.length : corridor.width
                },
                surfaces: this.createCorridorSurfaces(corridor, config)
            };

            geometry.corridors.push(corridor3D);
            geometry.vertices.push(...corridor3D.surfaces.vertices);
            geometry.indices.push(...corridor3D.surfaces.indices);
        });

        return geometry;
    }

    createRoomSurfaces(room, config) {
        const surfaces = {
            vertices: [],
            indices: [],
            normals: [],
            uvs: []
        };

        const hw = room.width / 2;
        const hh = room.height / 2;
        const hl = room.height / 2;

        // Floor
        surfaces.vertices.push(
            { x: room.x - hw, y: 0, z: room.z - hl },
            { x: room.x + hw, y: 0, z: room.z - hl },
            { x: room.x + hw, y: 0, z: room.z + hl },
            { x: room.x - hw, y: 0, z: room.z + hl }
        );

        // Ceiling
        surfaces.vertices.push(
            { x: room.x - hw, y: config.wallHeight, z: room.z - hl },
            { x: room.x + hw, y: config.wallHeight, z: room.z - hl },
            { x: room.x + hw, y: config.wallHeight, z: room.z + hl },
            { x: room.x - hw, y: config.wallHeight, z: room.z + hl }
        );

        // Walls would go here (simplified for brevity)

        return surfaces;
    }

    createCorridorSurfaces(corridor, config) {
        const surfaces = {
            vertices: [],
            indices: [],
            normals: [],
            uvs: []
        };

        // Simple corridor box
        const cw = corridor.width;
        const cl = corridor.length;
        const ch = config.wallHeight;

        surfaces.vertices.push(
            // Floor
            { x: corridor.x, y: 0, z: corridor.z },
            { x: corridor.x + cw, y: 0, z: corridor.z },
            { x: corridor.x + cw, y: 0, z: corridor.z + cl },
            { x: corridor.x, y: 0, z: corridor.z + cl }
        );

        return surfaces;
    }

    addArchitecturalDetails(geometry, config) {
        // Add doors, windows, vents, etc.
        geometry.details = [];

        Object.values(geometry.rooms).forEach(room => {
            // Add doorways
            if (this.random() > 0.3) {
                geometry.details.push({
                    type: 'doorway',
                    position: {
                        x: room.position.x + room.size.x / 2,
                        y: 0,
                        z: room.position.z
                    },
                    rotation: { x: 0, y: Math.PI / 2, z: 0 },
                    size: { width: 1.2, height: 2.4, depth: 0.2 }
                });
            }

            // Add wall damage based on location type
            if (config.primaryMaterials.includes('peeling_paint') || 
                config.primaryMaterials.includes('water_damage')) {
                geometry.details.push({
                    type: 'damage',
                    subtype: this.random() > 0.5 ? 'crack' : 'stain',
                    position: {
                        x: room.position.x,
                        y: room.size.y * 0.7,
                        z: room.position.z + room.size.z / 2
                    }
                });
            }
        });
    }

    placeProps(geometry, config) {
        geometry.props = [];

        config.features.forEach(featureType => {
            const count = Math.floor(this.random() * 3) + 1;

            for (let i = 0; i < count; i++) {
                // Find a valid position
                const roomKeys = Object.keys(geometry.rooms);
                const randomRoomKey = roomKeys[Math.floor(this.random() * roomKeys.length)];
                const room = geometry.rooms[randomRoomKey];

                geometry.props.push({
                    type: featureType,
                    position: {
                        x: room.position.x + (this.random() - 0.5) * room.size.x * 0.8,
                        y: 0,
                        z: room.position.z + (this.random() - 0.5) * room.size.z * 0.8
                    },
                    rotation: {
                        x: 0,
                        y: this.random() * Math.PI * 2,
                        z: 0
                    }
                });
            }
        });
    }

    setupLighting(geometry, config) {
        geometry.lights = [];

        // Place ceiling lights in rooms
        Object.values(geometry.rooms).forEach(room => {
            geometry.lights.push({
                type: 'point',
                position: {
                    x: room.position.x,
                    y: room.size.y - 0.5,
                    z: room.position.z
                },
                color: config.lightingColor,
                intensity: 0.8 + this.random() * 0.4,
                radius: 8,
                flicker: this.random() < 0.2 // 20% chance of flickering
            });
        });

        // Add corridor lights
        geometry.corridors.forEach(corridor => {
            geometry.lights.push({
                type: 'spot',
                position: {
                    x: corridor.position.x + corridor.size.x / 2,
                    y: corridor.size.y - 0.3,
                    z: corridor.position.z + corridor.size.z / 2
                },
                color: config.lightingColor,
                intensity: 0.6,
                radius: 10,
                direction: { x: 0, y: -1, z: 0 }
            });
        });
    }

    addTriggers(geometry, config) {
        geometry.triggers = [];

        // Add audio triggers
        geometry.triggers.push({
            type: 'audio_cue',
            sound: 'fluorescent_hum',
            position: { x: 0, y: 3, z: 0 },
            radius: 15,
            activated: false
        });

        // Add unease triggers
        geometry.triggers.push({
            type: 'unease_boost',
            position: { 
                x: (this.random() - 0.5) * 50, 
                y: 0, 
                z: (this.random() - 0.5) * 50 
            },
            radius: 8,
            activated: false
        });

        // Add transition trigger
        geometry.triggers.push({
            type: 'location_transition',
            newLocation: this.getRandomNextLocation(),
            position: { 
                x: (this.random() - 0.5) * 80, 
                y: 0, 
                z: (this.random() - 0.5) * 80 
            },
            radius: 5,
            activated: false
        });
    }

    getRandomNextLocation() {
        const locations = Object.keys(this.locationConfigs);
        return locations[Math.floor(this.random() * locations.length)];
    }

    calculateBounds(geometry) {
        let minX = Infinity, maxX = -Infinity;
        let minZ = Infinity, maxZ = -Infinity;

        Object.values(geometry.rooms).forEach(room => {
            minX = Math.min(minX, room.position.x - room.size.x / 2);
            maxX = Math.max(maxX, room.position.x + room.size.x / 2);
            minZ = Math.min(minZ, room.position.z - room.size.z / 2);
            maxZ = Math.max(maxZ, room.position.z + room.size.z / 2);
        });

        return { minX, maxX, minZ, maxZ };
    }

    // Utility: Noise function for variation
    noise(x, z) {
        const X = Math.floor(x) & 255;
        const Z = Math.floor(z) & 255;

        return this.random() * 2 - 1;
    }
}

// Export for module usage
if (typeof window !== 'undefined') {
    window.LiminalSpaceGenerator = LiminalSpaceGenerator;
}

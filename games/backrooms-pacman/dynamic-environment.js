/**
 * Dynamic Environment System for Backrooms Pacman
 * Implements: Bleeding walls, falling ceiling tiles, floor cracks, interactive objects
 * 
 * @author ScaryGamesAI
 * @version 1.0
 */

var DynamicEnvironment = (function() {
    'use strict';

    // Configuration
    var config = {
        bleedingWallsEnabled: true,
        fallingTilesEnabled: true,
        floorCracksEnabled: true,
        interactiveObjectsEnabled: true,
        maxBloodDrips: 50,
        maxFallingTiles: 20,
        maxFloorCracks: 30,
        tileFallChance: 0.001,    // Per second during blackouts
        bloodDripChance: 0.005,    // Per second when Pac-Man nearby
        crackGrowthRate: 0.01      // Per second at low sanity
    };

    // State
    var scene = null;
    var enabled = true;
    var bloodDrips = [];
    var fallingTiles = [];
    var floorCracks = [];
    var interactiveObjects = [];
    var environmentTime = 0;

    // Materials cache
    var bloodDripMaterial = null;
    var tileMaterial = null;

    /**
     * Initialize dynamic environment
     */
    function init(threeScene) {
        scene = threeScene;

        // Create materials
        bloodDripMaterial = new THREE.MeshBasicMaterial({
            color: 0x8b0000,
            transparent: true,
            opacity: 0.8
        });

        tileMaterial = new THREE.MeshStandardMaterial({
            color: 0x8a7d45,
            roughness: 0.8,
            metalness: 0.1
        });

        console.log('[DynamicEnvironment] Initialized');
    }

    /**
     * Spawn blood drip on wall
     */
    function spawnBloodDrip(position, wallNormal) {
        if (!enabled || !config.bleedingWallsEnabled) return;
        if (bloodDrips.length >= config.maxBloodDrips) {
            // Remove oldest
            var old = bloodDrips.shift();
            if (old && old.mesh) {
                scene.remove(old.mesh);
                old.mesh.geometry.dispose();
                old.mesh.material.dispose();
            }
        }

        // Create drip (elongated sphere)
        var geometry = new THREE.SphereGeometry(0.05, 8, 8);
        geometry.scale(1, 3, 1); // Elongate

        var drip = new THREE.Mesh(geometry, bloodDripMaterial.clone());
        drip.position.copy(position);
        drip.position.y -= 0.1; // Start slightly below spawn

        // Offset from wall
        var offset = wallNormal.clone().multiplyScalar(0.05);
        drip.position.add(offset);

        scene.add(drip);

        bloodDrips.push({
            mesh: drip,
            velocity: 0,
            age: 0,
            maxLength: 0.5 + Math.random() * 0.5
        });
    }

    /**
     * Spawn falling ceiling tile
     */
    function spawnFallingTile(position) {
        if (!enabled || !config.fallingTilesEnabled) return;
        if (fallingTiles.length >= config.maxFallingTiles) return;

        // Create tile (flat box)
        var geometry = new THREE.BoxGeometry(1, 0.05, 1);
        var tile = new THREE.Mesh(geometry, tileMaterial.clone());
        tile.position.copy(position);
        tile.position.y += 3; // Start at ceiling height

        // Random rotation
        tile.rotation.y = Math.random() * Math.PI * 2;

        scene.add(tile);

        fallingTiles.push({
            mesh: tile,
            velocity: 0,
            rotationVelocity: new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2
            ),
            resting: false
        });
    }

    /**
     * Create floor crack that grows over time
     */
    function createFloorCrack(position, initialSize) {
        if (!enabled || !config.floorCracksEnabled) return;
        if (floorCracks.length >= config.maxFloorCracks) return;

        // Create crack mesh (irregular plane)
        var crackGeometry = createCrackGeometry(initialSize || 0.5);
        var crackMaterial = new THREE.MeshBasicMaterial({
            color: 0x1a1a1a,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide,
            depthWrite: false,
            polygonOffset: true,
            polygonOffsetFactor: -2
        });

        var crack = new THREE.Mesh(crackGeometry, crackMaterial);
        crack.position.copy(position);
        crack.position.y = 0.02; // Slightly above floor
        crack.rotation.z = Math.random() * Math.PI * 2;

        scene.add(crack);

        floorCracks.push({
            mesh: crack,
            size: initialSize || 0.5,
            growthRate: config.crackGrowthRate * (0.5 + Math.random() * 0.5)
        });
    }

    /**
     * Generate procedural crack geometry
     */
    function createCrackGeometry(baseSize) {
        // Create irregular crack shape using connected line segments
        var points = [];
        var numPoints = 8 + Math.floor(Math.random() * 8);
        var angle = 0;
        var radius = baseSize;

        for (var i = 0; i < numPoints; i++) {
            angle += (Math.PI * 2) / numPoints;
            var variance = 0.3 + Math.random() * 0.4;
            var x = Math.cos(angle) * radius * variance;
            var y = Math.sin(angle) * radius * variance;
            points.push(new THREE.Vector2(x, y));
        }

        var shape = new THREE.Shape(points);
        var geometry = new THREE.ShapeGeometry(shape);
        return geometry;
    }

    /**
     * Add interactive object (door, movable object, etc.)
     */
    function addInteractiveObject(type, position, properties) {
        if (!enabled || !config.interactiveObjectsEnabled) return;

        var obj = {
            type: type,
            position: position.clone(),
            properties: properties || {},
            state: 'idle',
            mesh: null,
            audioSource: null
        };

        // Create mesh based on type
        switch (type) {
            case 'door':
                obj.mesh = createDoor(position, properties);
                break;
            case 'movable_box':
                obj.mesh = createMovableBox(position, properties);
                break;
            case 'light_switch':
                obj.mesh = createLightSwitch(position, properties);
                break;
            case 'locker':
                obj.mesh = createLocker(position, properties);
                break;
        }

        if (obj.mesh) {
            scene.add(obj.mesh);
            interactiveObjects.push(obj);
        }

        return obj;
    }

    /**
     * Create door object
     */
    function createDoor(position, properties) {
        var doorGroup = new THREE.Group();

        // Door frame
        var frameGeo = new THREE.BoxGeometry(1.2, 2.2, 0.1);
        var frameMat = new THREE.MeshStandardMaterial({
            color: 0x3d2817,
            roughness: 0.9
        });
        var frame = new THREE.Mesh(frameGeo, frameMat);
        doorGroup.add(frame);

        // Door panel
        var panelGeo = new THREE.BoxGeometry(1.0, 2.0, 0.05);
        var panelMat = new THREE.MeshStandardMaterial({
            color: 0x5d4037,
            roughness: 0.8
        });
        var panel = new THREE.Mesh(panelGeo, panelMat);
        panel.position.z = 0.03;
        panel.position.y = -0.1;

        // Pivot point for rotation
        var pivot = new THREE.Object3D();
        pivot.position.x = -0.5;
        pivot.add(panel);
        doorGroup.add(pivot);

        doorGroup.position.copy(position);
        doorGroup.userData.pivot = pivot;
        doorGroup.userData.isOpen = false;

        return doorGroup;
    }

    /**
     * Create movable box
     */
    function createMovableBox(position, properties) {
        var size = properties.size || 0.8;
        var geometry = new THREE.BoxGeometry(size, size, size);
        var material = new THREE.MeshStandardMaterial({
            color: 0x8b7355,
            roughness: 0.9
        });
        var box = new THREE.Mesh(geometry, material);
        box.position.copy(position);
        box.castShadow = true;
        box.receiveShadow = true;
        return box;
    }

    /**
     * Create light switch
     */
    function createLightSwitch(position, properties) {
        var switchGroup = new THREE.Group();

        // Plate
        var plateGeo = new THREE.BoxGeometry(0.15, 0.2, 0.02);
        var plateMat = new THREE.MeshStandardMaterial({
            color: 0xdddddd,
            roughness: 0.5
        });
        var plate = new THREE.Mesh(plateGeo, plateMat);
        switchGroup.add(plate);

        // Switch lever
        var leverGeo = new THREE.BoxGeometry(0.05, 0.08, 0.02);
        var leverMat = new THREE.MeshStandardMaterial({
            color: 0xffffff
        });
        var lever = new THREE.Mesh(leverGeo, leverMat);
        lever.position.set(0, 0.02, 0.02);
        switchGroup.add(lever);

        switchGroup.position.copy(position);
        switchGroup.position.y = 1.2; // Wall height
        switchGroup.userData.isOn = properties.initialState !== false;

        return switchGroup;
    }

    /**
     * Create locker (hiding spot)
     */
    function createLocker(position, properties) {
        var lockerGroup = new THREE.Group();

        // Main body
        var bodyGeo = new THREE.BoxGeometry(0.6, 1.8, 0.5);
        var bodyMat = new THREE.MeshStandardMaterial({
            color: 0x4a5568,
            roughness: 0.6,
            metalness: 0.3
        });
        var body = new THREE.Mesh(bodyGeo, bodyMat);
        lockerGroup.add(body);

        // Door
        var doorGeo = new THREE.BoxGeometry(0.55, 1.7, 0.05);
        var doorMat = new THREE.MeshStandardMaterial({
            color: 0x5a6578,
            roughness: 0.5,
            metalness: 0.4
        });
        var door = new THREE.Mesh(doorGeo, doorMat);
        door.position.z = 0.25;
        door.position.x = -0.02;
        lockerGroup.add(door);

        // Vents
        var ventGeo = new THREE.PlaneGeometry(0.4, 0.3);
        var ventMat = new THREE.MeshBasicMaterial({
            color: 0x1a1a1a
        });
        var vent = new THREE.Mesh(ventGeo, ventMat);
        vent.position.set(0, 0.6, 0.26);
        lockerGroup.add(vent);

        lockerGroup.position.copy(position);
        lockerGroup.userData.isOpen = false;

        return lockerGroup;
    }

    /**
     * Open/close door
     */
    function toggleDoor(doorObject, open) {
        if (!doorObject || !doorObject.userData.pivot) return;

        var pivot = doorObject.userData.pivot;
        var targetAngle = open ? Math.PI / 2 : 0;

        // Simple animation (would be smoother with tweening in production)
        pivot.rotation.y = targetAngle;
        doorObject.userData.isOpen = open;
    }

    /**
     * Update dynamic environment
     */
    function update(deltaTime, playerPosition, pacmanPosition, sanityLevel, isBlackout) {
        if (!enabled) return;

        environmentTime += deltaTime;

        // Update blood drips
        for (var i = bloodDrips.length - 1; i >= 0; i--) {
            var drip = bloodDrips[i];
            drip.age += deltaTime;

            // Gravity
            drip.velocity += 9.8 * deltaTime;
            drip.mesh.position.y -= drip.velocity * deltaTime;

            // Stretch as it falls
            var stretch = 1 + drip.velocity * 0.1;
            drip.mesh.scale.y = stretch;

            // Remove if too old or hit ground
            if (drip.age > 5 || drip.mesh.position.y < 0) {
                scene.remove(drip.mesh);
                drip.mesh.geometry.dispose();
                drip.mesh.material.dispose();
                bloodDrips.splice(i, 1);
            }
        }

        // Update falling tiles
        for (var j = fallingTiles.length - 1; j >= 0; j--) {
            var tile = fallingTiles[j];

            if (!tile.resting) {
                // Gravity
                tile.velocity += 9.8 * deltaTime;
                tile.mesh.position.y -= tile.velocity * deltaTime;

                // Rotation
                tile.mesh.rotation.x += tile.rotationVelocity.x * deltaTime;
                tile.mesh.rotation.y += tile.rotationVelocity.y * deltaTime;
                tile.mesh.rotation.z += tile.rotationVelocity.z * deltaTime;

                // Hit ground
                if (tile.mesh.position.y < 0.025) {
                    tile.mesh.position.y = 0.025;
                    tile.resting = true;

                    // Play sound (would integrate with audio system)
                    // AudioSystem.play('tile_crash', tile.mesh.position);
                }
            } else {
                // Fade out resting tiles
                tile.mesh.material.opacity -= deltaTime * 0.1;
                if (tile.mesh.material.opacity <= 0) {
                    scene.remove(tile.mesh);
                    tile.mesh.geometry.dispose();
                    tile.mesh.material.dispose();
                    fallingTiles.splice(j, 1);
                }
            }
        }

        // Update floor cracks (grow over time)
        for (var k = floorCracks.length - 1; k >= 0; k--) {
            var crack = floorCracks[k];

            // Grow crack
            crack.size += crack.growthRate * deltaTime;
            crack.mesh.scale.setScalar(crack.size);

            // Fade at very large sizes
            if (crack.size > 3) {
                crack.mesh.material.opacity -= deltaTime * 0.05;
                if (crack.mesh.material.opacity <= 0) {
                    scene.remove(crack.mesh);
                    crack.mesh.geometry.dispose();
                    crack.mesh.material.dispose();
                    floorCracks.splice(k, 1);
                }
            }
        }

        // Random events

        // Blood drips when Pac-Man is nearby
        if (pacmanPosition && config.bleedingWallsEnabled) {
            var distToPacman = new THREE.Vector3(
                playerPosition.x - pacmanPosition.x,
                0,
                playerPosition.z - pacmanPosition.z
            ).length();

            if (distToPacman < 8 && Math.random() < config.bloodDripChance * deltaTime) {
                // Find nearby wall
                var wallPos = playerPosition.clone();
                var angle = Math.random() * Math.PI * 2;
                wallPos.x += Math.cos(angle) * 5;
                wallPos.z += Math.sin(angle) * 5;
                wallPos.y = 1.5 + Math.random() * 1.5;

                var normal = new THREE.Vector3(
                    -Math.cos(angle),
                    0,
                    -Math.sin(angle)
                );

                spawnBloodDrip(wallPos, normal);
            }
        }

        // Tiles fall during blackouts
        if (isBlackout && config.fallingTilesEnabled) {
            if (Math.random() < config.tileFallChance * deltaTime) {
                var tilePos = playerPosition.clone();
                tilePos.x += (Math.random() - 0.5) * 10;
                tilePos.z += (Math.random() - 0.5) * 10;
                spawnFallingTile(tilePos);
            }
        }

        // Cracks grow at low sanity
        if (sanityLevel < 40 && config.floorCracksEnabled) {
            if (Math.random() < 0.01 * deltaTime && floorCracks.length < config.maxFloorCracks) {
                var crackPos = playerPosition.clone();
                crackPos.x += (Math.random() - 0.5) * 8;
                crackPos.z += (Math.random() - 0.5) * 8;
                createFloorCrack(crackPos, 0.3);
            }
        }
    }

    /**
     * Reset environment
     */
    function reset() {
        // Clear all dynamic objects
        for (var i = 0; i < bloodDrips.length; i++) {
            if (bloodDrips[i].mesh) {
                scene.remove(bloodDrips[i].mesh);
                bloodDrips[i].mesh.geometry.dispose();
                bloodDrips[i].mesh.material.dispose();
            }
        }

        for (var j = 0; j < fallingTiles.length; j++) {
            if (fallingTiles[j].mesh) {
                scene.remove(fallingTiles[j].mesh);
                fallingTiles[j].mesh.geometry.dispose();
                fallingTiles[j].mesh.material.dispose();
            }
        }

        for (var k = 0; k < floorCracks.length; k++) {
            if (floorCracks[k].mesh) {
                scene.remove(floorCracks[k].mesh);
                floorCracks[k].mesh.geometry.dispose();
                floorCracks[k].mesh.material.dispose();
            }
        }

        for (var l = 0; l < interactiveObjects.length; l++) {
            if (interactiveObjects[l].mesh) {
                scene.remove(interactiveObjects[l].mesh);
            }
        }

        bloodDrips = [];
        fallingTiles = [];
        floorCracks = [];
        interactiveObjects = [];
        environmentTime = 0;
    }

    /**
     * Enable/disable system
     */
    function setEnabled(value) {
        enabled = value;
    }

    /**
     * Get statistics
     */
    function getStats() {
        return {
            bloodDrips: bloodDrips.length,
            fallingTiles: fallingTiles.length,
            floorCracks: floorCracks.length,
            interactiveObjects: interactiveObjects.length,
            environmentTime: environmentTime
        };
    }

    // Public API
    return {
        init: init,
        spawnBloodDrip: spawnBloodDrip,
        spawnFallingTile: spawnFallingTile,
        createFloorCrack: createFloorCrack,
        addInteractiveObject: addInteractiveObject,
        toggleDoor: toggleDoor,
        update: update,
        reset: reset,
        setEnabled: setEnabled,
        getStats: getStats,
        config: config
    };
})();

// Export for global access
if (typeof window !== 'undefined') {
    window.DynamicEnvironment = DynamicEnvironment;
}

/* ============================================
   Cursed Sands — Phase 6: Desert Physics Engine
   Wind, heat, hydration, sand, water, quicksand,
   structural decay, temperature cycle
   ============================================ */
var DesertPhysics = (function () {
    'use strict';

    var _scene = null;

    // ============ WIND SYSTEM ============
    var wind = {
        angle: 0,           // radians, 0 = north
        speed: 3,            // m/s base
        gustTimer: 0,
        gustDuration: 0,
        gustStrength: 0,
        currentSpeed: 3,     // actual speed including gusts
        dx: 0, dz: 0        // normalized direction
    };

    // ============ TEMPERATURE & HYDRATION ============
    var temperature = 25;     // °C
    var hydration = 100;      // 0-100
    var heatstroke = 0;       // 0-100 severity
    var hypothermia = 0;      // 0-100 severity
    var isInShade = false;
    var isNearCampfire = false;
    var campfires = [];
    var oases = [];

    // Clothing
    var clothing = 'linen';   // 'linen' (day) or 'cloak' (night)

    // ============ SAND PARTICLES ============
    var sandParticles = [];
    var MAX_SAND_PARTICLES = 200;
    var sandParticleMesh = null; // instanced mesh
    var footprints = [];
    var MAX_FOOTPRINTS = 60;
    var footprintTimer = 0;
    var lastFootprintX = 0, lastFootprintZ = 0;

    // ============ QUICKSAND ============
    var quicksandZones = [];
    var playerInQuicksand = null;
    var quicksandSinkDepth = 0;
    var struggleCount = 0;
    var STRUGGLE_NEEDED = 6;

    // ============ WATER / SWIMMING ============
    var waterZones = [];
    var playerSwimming = false;
    var breathTimer = 15;     // seconds underwater
    var MAX_BREATH = 15;
    var playerSubmerged = false; // head underwater
    var currentPushX = 0, currentPushZ = 0;

    // ============ FLASH FLOODS ============
    var floodActive = false;
    var floodTimer = 0;
    var floodCooldown = 300;
    var floodMesh = null;
    var floodDirection = { x: 0, z: 1 };

    // ============ STRUCTURAL DECAY ============
    var decayStructures = [];

    // ============ BUILD ============
    function build(scene) {
        _scene = scene;

        // Reset all state
        wind.angle = Math.random() * Math.PI * 2;
        wind.speed = 2 + Math.random() * 3;
        wind.gustTimer = 8 + Math.random() * 10;
        wind.currentSpeed = wind.speed;
        temperature = 25; hydration = 100;
        heatstroke = 0; hypothermia = 0;
        sandParticles = []; footprints = [];
        quicksandZones = []; waterZones = [];
        campfires = []; oases = [];
        playerInQuicksand = null; quicksandSinkDepth = 0;
        playerSwimming = false; breathTimer = MAX_BREATH;
        floodActive = false; floodTimer = 0; floodCooldown = 300;
        decayStructures = []; clothing = 'linen';

        buildSandParticlePool(scene);
        buildQuicksandZones(scene);
        buildWaterZones(scene);
        buildOases(scene);
        buildCampfireSites(scene);
    }

    // ============ SAND PARTICLE POOL ============
    function buildSandParticlePool(scene) {
        var geo = new THREE.SphereGeometry(0.03, 3, 3);
        var mat = new THREE.MeshBasicMaterial({ color: 0xd4a843, transparent: true, opacity: 0.4 });
        for (var i = 0; i < MAX_SAND_PARTICLES; i++) {
            var p = new THREE.Mesh(geo, mat.clone());
            p.visible = false;
            scene.add(p);
            sandParticles.push({
                mesh: p, active: false,
                x: 0, y: 0, z: 0,
                vx: 0, vy: 0, vz: 0,
                life: 0
            });
        }
    }

    // ============ QUICKSAND ZONES ============
    function buildQuicksandZones(scene) {
        var qsTypes = [
            { id: 'mud', color: 0x5c4a2a, sanityDrain: 0 },
            { id: 'tar', color: 0x1a1a0a, sanityDrain: 2 },
            { id: 'cursed', color: 0x2a0a2a, sanityDrain: 8 }
        ];
        // Place 12 quicksand patches
        var positions = [
            { x: 20, z: 30 }, { x: -30, z: 50 }, { x: 50, z: 10 },
            { x: -60, z: -20 }, { x: 15, z: -60 }, { x: -40, z: 40 },
            { x: 70, z: -50 }, { x: -20, z: -70 }, { x: 35, z: 55 },
            { x: -75, z: 15 }, { x: 45, z: -30 }, { x: -55, z: -55 }
        ];
        for (var i = 0; i < positions.length; i++) {
            var type = qsTypes[i % qsTypes.length];
            var radius = 1.5 + Math.random() * 1.5;
            var mesh = new THREE.Mesh(
                new THREE.CircleGeometry(radius, 12),
                new THREE.MeshStandardMaterial({
                    color: type.color, roughness: 1, transparent: true, opacity: 0.5,
                    side: THREE.DoubleSide
                })
            );
            mesh.rotation.x = -Math.PI / 2;
            mesh.position.set(positions[i].x, 0.02, positions[i].z);
            scene.add(mesh);
            // Subtle bubble particles
            var bubbleMat = new THREE.MeshBasicMaterial({ color: type.color, transparent: true, opacity: 0.3 });
            for (var b = 0; b < 4; b++) {
                var bubble = new THREE.Mesh(new THREE.SphereGeometry(0.04, 4, 4), bubbleMat);
                bubble.position.set(
                    positions[i].x + (Math.random() - 0.5) * radius,
                    0.05,
                    positions[i].z + (Math.random() - 0.5) * radius
                );
                scene.add(bubble);
            }
            quicksandZones.push({
                x: positions[i].x, z: positions[i].z, radius: radius,
                type: type.id, sanityDrain: type.sanityDrain, mesh: mesh
            });
        }
    }

    // ============ WATER ZONES ============
    function buildWaterZones(scene) {
        // Nile River section
        var nileWater = new THREE.Mesh(
            new THREE.PlaneGeometry(12, 120),
            new THREE.MeshStandardMaterial({
                color: 0x1a5577, roughness: 0.2, metalness: 0.4,
                transparent: true, opacity: 0.65, side: THREE.DoubleSide
            })
        );
        nileWater.rotation.x = -Math.PI / 2;
        nileWater.position.set(30, -0.2, 0);
        scene.add(nileWater);
        waterZones.push({
            x: 30, z: 0, halfW: 6, halfL: 60, depth: 3,
            currentX: 0, currentZ: 0.5, // flow south
            mesh: nileWater, type: 'river'
        });

        // Oasis pond
        var oasisWater = new THREE.Mesh(
            new THREE.CircleGeometry(5, 16),
            new THREE.MeshStandardMaterial({
                color: 0x227799, roughness: 0.3, metalness: 0.3,
                transparent: true, opacity: 0.55, side: THREE.DoubleSide
            })
        );
        oasisWater.rotation.x = -Math.PI / 2;
        oasisWater.position.set(-50, -0.1, 60);
        scene.add(oasisWater);
        waterZones.push({
            x: -50, z: 60, halfW: 5, halfL: 5, depth: 2,
            currentX: 0, currentZ: 0, mesh: oasisWater, type: 'pond'
        });

        // Nile bank details — reeds
        var reedMat = new THREE.MeshStandardMaterial({ color: 0x336622, roughness: 0.8 });
        for (var ri = 0; ri < 30; ri++) {
            var rx = 30 + (Math.random() > 0.5 ? 1 : -1) * (5.5 + Math.random());
            var rz = (Math.random() - 0.5) * 100;
            var reed = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.6 + Math.random() * 0.4, 4), reedMat);
            reed.position.set(rx, 0.3, rz);
            reed.rotation.z = (Math.random() - 0.5) * 0.2;
            scene.add(reed);
        }
    }

    // ============ OASES ============
    function buildOases(scene) {
        var oasisPos = [
            { x: -50, z: 60 },
            { x: 60, z: 45 },
            { x: -30, z: -45 }
        ];
        for (var i = 0; i < oasisPos.length; i++) {
            var p = oasisPos[i];
            // Palm trees
            var trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c3a1e, roughness: 0.8 });
            var leafMat = new THREE.MeshStandardMaterial({ color: 0x228822, roughness: 0.7, side: THREE.DoubleSide });
            for (var t = 0; t < 4; t++) {
                var tx = p.x + (Math.random() - 0.5) * 8;
                var tz = p.z + (Math.random() - 0.5) * 8;
                var trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 4, 6), trunkMat);
                trunk.position.set(tx, 2, tz);
                trunk.rotation.z = (Math.random() - 0.5) * 0.15;
                scene.add(trunk);
                // Fronds
                for (var f = 0; f < 5; f++) {
                    var frond = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.4), leafMat);
                    frond.position.set(tx + Math.cos(f * 1.26) * 0.8, 4.2, tz + Math.sin(f * 1.26) * 0.8);
                    frond.rotation.x = -0.6;
                    frond.rotation.y = f * 1.26;
                    scene.add(frond);
                }
            }
            // Shade zone marker (invisible)
            oases.push({ x: p.x, z: p.z, radius: 6, refillRate: 15 });
            // Ground verdure
            var grassMat = new THREE.MeshStandardMaterial({ color: 0x448833, roughness: 0.9 });
            var grass = new THREE.Mesh(new THREE.CircleGeometry(5, 12), grassMat);
            grass.rotation.x = -Math.PI / 2;
            grass.position.set(p.x, 0.01, p.z);
            scene.add(grass);
        }
    }

    // ============ CAMPFIRE SITES ============
    function buildCampfireSites(scene) {
        var firePos = [
            { x: 10, z: 10 }, { x: -25, z: -15 }, { x: 40, z: 55 },
            { x: -65, z: 30 }, { x: 55, z: -65 }, { x: -80, z: -40 }
        ];
        for (var i = 0; i < firePos.length; i++) {
            var fp = firePos[i];
            // Stone ring
            var stoneMat = new THREE.MeshStandardMaterial({ color: 0x555544, roughness: 0.9 });
            for (var s = 0; s < 8; s++) {
                var sa = s * Math.PI / 4;
                var stone = new THREE.Mesh(new THREE.SphereGeometry(0.12, 4, 4), stoneMat);
                stone.position.set(fp.x + Math.cos(sa) * 0.5, 0.08, fp.z + Math.sin(sa) * 0.5);
                scene.add(stone);
            }
            // Wood logs
            var woodMat = new THREE.MeshStandardMaterial({ color: 0x4a3018, roughness: 0.8 });
            for (var l = 0; l < 3; l++) {
                var log = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.6, 4), woodMat);
                log.position.set(fp.x + (Math.random() - 0.5) * 0.3, 0.06, fp.z + (Math.random() - 0.5) * 0.3);
                log.rotation.z = Math.random() * Math.PI;
                log.rotation.x = -0.3;
                scene.add(log);
            }
            // Fire (starts unlit — press E to light)
            var fireMat = new THREE.MeshStandardMaterial({
                color: 0xff5500, emissive: 0xff3300, emissiveIntensity: 2,
                transparent: true, opacity: 0
            });
            var fireMesh = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.6, 5), fireMat);
            fireMesh.position.set(fp.x, 0.3, fp.z);
            scene.add(fireMesh);
            var fireLight = new THREE.PointLight(0xff6600, 0, 8);
            fireLight.position.set(fp.x, 0.5, fp.z);
            scene.add(fireLight);
            campfires.push({
                x: fp.x, z: fp.z, lit: false,
                mesh: fireMesh, light: fireLight,
                warmthRadius: 6, fuel: 120 // 120s of burn time
            });
        }
    }

    // ============ MAIN UPDATE ============
    function update(dt, px, pz, py, gameMinute, isNight, isSprinting, sandstormActive) {
        var results = {
            moveSpeedMod: 1,
            staminaDrain: 0,
            sanityDrain: 0,
            damage: 0,
            temperature: temperature,
            hydration: hydration,
            heatstroke: heatstroke,
            hypothermia: hypothermia,
            swimming: playerSwimming,
            breathTimer: breathTimer,
            inQuicksand: !!playerInQuicksand,
            sinkDepth: quicksandSinkDepth,
            currentPushX: 0,
            currentPushZ: 0,
            windDX: wind.dx,
            windDZ: wind.dz,
            windSpeed: wind.currentSpeed,
            nearCampfire: null,
            nearOasis: null,
            floodPush: null,
            clothingType: clothing
        };

        updateWind(dt, sandstormActive);
        updateTemperature(dt, gameMinute, isNight, px, pz);
        updateHydration(dt, px, pz, isSprinting);
        updateSandParticles(dt, px, pz, wind);
        updateFootprints(dt, px, pz, isSprinting);
        updateQuicksand(dt, px, pz, results);
        updateWater(dt, px, pz, py, results);
        updateCampfires(dt, px, pz);
        updateFlashFlood(dt, px, pz, isNight, results);
        updateDecay(dt, sandstormActive);

        // Wind speed modifier on player movement
        var windAngleToPlayer = Math.atan2(wind.dz, wind.dx);
        // Simplified: strong headwind slows, tailwind speeds up
        results.moveSpeedMod *= (1 - (wind.currentSpeed / 30) * 0.15);

        // Heatstroke effects
        if (heatstroke > 30) {
            results.staminaDrain += heatstroke * 0.05;
            if (heatstroke > 70) results.sanityDrain += 3 * dt;
            if (heatstroke > 90) results.damage += 2 * dt;
        }
        // Hypothermia effects
        if (hypothermia > 30) {
            results.moveSpeedMod *= (1 - hypothermia * 0.003);
            if (hypothermia > 70) results.sanityDrain += 3 * dt;
            if (hypothermia > 90) results.damage += 2 * dt;
        }
        // Dehydration effects
        if (hydration < 20) {
            results.staminaDrain += (20 - hydration) * 0.1;
            results.moveSpeedMod *= 0.8;
            if (hydration <= 0) results.damage += 5 * dt;
        }

        results.temperature = temperature;
        results.hydration = hydration;
        results.heatstroke = heatstroke;
        results.hypothermia = hypothermia;
        results.windDX = wind.dx;
        results.windDZ = wind.dz;
        results.windSpeed = wind.currentSpeed;

        return results;
    }

    // ============ WIND ============
    function updateWind(dt, sandstormActive) {
        // Slowly drift direction
        wind.angle += (Math.random() - 0.5) * 0.01 * dt;
        wind.dx = Math.cos(wind.angle);
        wind.dz = Math.sin(wind.angle);

        // Gusts
        wind.gustTimer -= dt;
        if (wind.gustTimer <= 0) {
            wind.gustTimer = 5 + Math.random() * 15;
            wind.gustDuration = 1 + Math.random() * 3;
            wind.gustStrength = 3 + Math.random() * 8;
        }
        if (wind.gustDuration > 0) {
            wind.gustDuration -= dt;
            wind.currentSpeed = wind.speed + wind.gustStrength;
        } else {
            wind.currentSpeed = wind.speed;
        }
        // Sandstorm boosts wind
        if (sandstormActive) wind.currentSpeed = Math.max(wind.currentSpeed, 12);
    }

    // ============ TEMPERATURE ============
    function updateTemperature(dt, gameMinute, isNight, px, pz) {
        // Base temp from time of day (6AM=25°C, noon=45°C, midnight=5°C)
        var hour = gameMinute / 60;
        var targetTemp;
        if (hour >= 6 && hour < 14) {
            // Morning → peak heat
            targetTemp = 25 + (hour - 6) * 2.5; // 25→45
        } else if (hour >= 14 && hour < 19) {
            // Afternoon → cooling
            targetTemp = 45 - (hour - 14) * 4; // 45→25
        } else if (hour >= 19 || hour < 2) {
            // Evening → cold
            targetTemp = 15 - (hour >= 19 ? (hour - 19) : (hour + 5)) * 2;
        } else {
            // Pre-dawn (2-6AM) — coldest
            targetTemp = 3 + (hour - 2) * 5.5;
        }

        // Shade modifier
        isInShade = false;
        for (var i = 0; i < oases.length; i++) {
            var o = oases[i];
            if (Math.sqrt((px - o.x) * (px - o.x) + (pz - o.z) * (pz - o.z)) < o.radius) {
                isInShade = true; break;
            }
        }
        if (isInShade && !isNight) targetTemp -= 10;

        // Campfire warmth
        isNearCampfire = false;
        for (var ci = 0; ci < campfires.length; ci++) {
            var cf = campfires[ci];
            if (!cf.lit) continue;
            var dx = px - cf.x, dz = pz - cf.z;
            if (Math.sqrt(dx * dx + dz * dz) < cf.warmthRadius) {
                isNearCampfire = true;
                targetTemp = Math.max(targetTemp, 22); // campfire keeps you warm
                break;
            }
        }

        // Clothing modifier
        if (clothing === 'cloak' && !isNight) targetTemp += 5; // overheating in heavy clothes
        if (clothing === 'linen' && isNight) targetTemp -= 5; // too cold in light clothes

        // Underground = stable temperature
        if (typeof TombSystem !== 'undefined' && TombSystem.isUnderground && TombSystem.isUnderground(0)) {
            targetTemp = 18;
        }

        // Lerp temperature
        temperature += (targetTemp - temperature) * dt * 0.3;

        // Heatstroke accumulation
        if (temperature > 38) {
            heatstroke = Math.min(100, heatstroke + (temperature - 38) * 0.5 * dt);
        } else {
            heatstroke = Math.max(0, heatstroke - 10 * dt);
        }

        // Hypothermia accumulation
        if (temperature < 10) {
            hypothermia = Math.min(100, hypothermia + (10 - temperature) * 0.5 * dt);
        } else {
            hypothermia = Math.max(0, hypothermia - 10 * dt);
        }
    }

    // ============ HYDRATION ============
    function updateHydration(dt, px, pz, isSprinting) {
        // Base drain
        var drain = 0.5 * dt; // ~200s to fully dehydrate
        if (isSprinting) drain *= 2;
        if (temperature > 35) drain *= 1.5;
        hydration = Math.max(0, hydration - drain);

        // Oasis refill
        for (var i = 0; i < oases.length; i++) {
            var o = oases[i];
            var dx = px - o.x, dz = pz - o.z;
            if (Math.sqrt(dx * dx + dz * dz) < o.radius) {
                hydration = Math.min(100, hydration + o.refillRate * dt);
                break;
            }
        }

        // Swimming auto-refills slightly
        if (playerSwimming) {
            hydration = Math.min(100, hydration + 5 * dt);
        }
    }

    // ============ SAND PARTICLES ============
    function updateSandParticles(dt, px, pz, wind) {
        var spawnRate = Math.min(1, wind.currentSpeed / 8);
        // Spawn new particles near player
        for (var i = 0; i < sandParticles.length; i++) {
            var sp = sandParticles[i];
            if (!sp.active && Math.random() < spawnRate * 0.1) {
                sp.active = true;
                sp.x = px + (Math.random() - 0.5) * 30 - wind.dx * 15;
                sp.z = pz + (Math.random() - 0.5) * 30 - wind.dz * 15;
                sp.y = 0.05 + Math.random() * 0.5;
                sp.vx = wind.dx * wind.currentSpeed * (0.5 + Math.random() * 0.5);
                sp.vz = wind.dz * wind.currentSpeed * (0.5 + Math.random() * 0.5);
                sp.vy = (Math.random() - 0.3) * 0.5;
                sp.life = 2 + Math.random() * 3;
                if (sp.mesh) { sp.mesh.visible = true; sp.mesh.position.set(sp.x, sp.y, sp.z); }
            }
            if (sp.active) {
                sp.x += sp.vx * dt;
                sp.z += sp.vz * dt;
                sp.y += sp.vy * dt;
                sp.vy -= 0.3 * dt; // gravity
                if (sp.y < 0.02) { sp.y = 0.02; sp.vy = Math.random() * 0.3; } // bounce
                sp.life -= dt;
                if (sp.mesh) {
                    sp.mesh.position.set(sp.x, sp.y, sp.z);
                    sp.mesh.material.opacity = Math.min(0.4, sp.life * 0.2);
                }
                if (sp.life <= 0) {
                    sp.active = false;
                    if (sp.mesh) sp.mesh.visible = false;
                }
            }
        }
    }

    // ============ FOOTPRINTS ============
    function updateFootprints(dt, px, pz, isSprinting) {
        footprintTimer -= dt;
        var dist = Math.sqrt((px - lastFootprintX) * (px - lastFootprintX) + (pz - lastFootprintZ) * (pz - lastFootprintZ));
        if (dist > (isSprinting ? 1.2 : 0.8) && footprintTimer <= 0 && !playerSwimming) {
            footprintTimer = 0.3;
            lastFootprintX = px; lastFootprintZ = pz;
            var fp = new THREE.Mesh(
                new THREE.PlaneGeometry(0.2, 0.35),
                new THREE.MeshBasicMaterial({ color: 0x8a7030, transparent: true, opacity: 0.3, side: THREE.DoubleSide })
            );
            fp.rotation.x = -Math.PI / 2;
            fp.position.set(px, 0.01, pz);
            if (_scene) _scene.add(fp);
            footprints.push({ mesh: fp, life: 30 }); // fade over 30s
            // Cap
            while (footprints.length > MAX_FOOTPRINTS) {
                var old = footprints.shift();
                if (old.mesh) _scene.remove(old.mesh);
            }
        }
        // Fade footprints
        for (var i = footprints.length - 1; i >= 0; i--) {
            footprints[i].life -= dt;
            if (footprints[i].mesh) footprints[i].mesh.material.opacity = Math.max(0, (footprints[i].life / 30) * 0.3);
            // Wind erodes footprints faster
            footprints[i].life -= wind.currentSpeed * 0.05 * dt;
            if (footprints[i].life <= 0) {
                if (footprints[i].mesh) _scene.remove(footprints[i].mesh);
                footprints.splice(i, 1);
            }
        }
    }

    // ============ QUICKSAND ============
    function updateQuicksand(dt, px, pz, results) {
        playerInQuicksand = null;
        for (var i = 0; i < quicksandZones.length; i++) {
            var qs = quicksandZones[i];
            var dx = px - qs.x, dz = pz - qs.z;
            if (Math.sqrt(dx * dx + dz * dz) < qs.radius) {
                playerInQuicksand = qs;
                break;
            }
        }
        if (playerInQuicksand) {
            // Sink
            var sinkRate = playerInQuicksand.type === 'tar' ? 0.15 : (playerInQuicksand.type === 'cursed' ? 0.2 : 0.1);
            quicksandSinkDepth = Math.min(1.2, quicksandSinkDepth + sinkRate * dt);
            results.moveSpeedMod *= 0.3;
            results.sanityDrain += playerInQuicksand.sanityDrain * dt;
            results.inQuicksand = true;
            results.sinkDepth = quicksandSinkDepth;
            // Animate mesh
            if (playerInQuicksand.mesh) {
                playerInQuicksand.mesh.material.opacity = 0.5 + Math.sin(Date.now() * 0.005) * 0.15;
            }
            // If fully sunk — damage
            if (quicksandSinkDepth > 1) {
                results.damage += 10 * dt;
            }
        } else {
            quicksandSinkDepth = Math.max(0, quicksandSinkDepth - 0.5 * dt);
            struggleCount = 0;
        }
    }

    // Called when player presses SPACE while in quicksand
    function struggle() {
        if (!playerInQuicksand) return false;
        struggleCount++;
        quicksandSinkDepth = Math.max(0, quicksandSinkDepth - 0.2);
        if (struggleCount >= STRUGGLE_NEEDED) {
            quicksandSinkDepth = 0;
            playerInQuicksand = null;
            struggleCount = 0;
            return true; // escaped
        }
        return false;
    }

    // ============ WATER / SWIMMING ============
    function updateWater(dt, px, pz, py, results) {
        playerSwimming = false;
        playerSubmerged = false;
        currentPushX = 0; currentPushZ = 0;

        for (var i = 0; i < waterZones.length; i++) {
            var wz = waterZones[i];
            var inZone = false;
            if (wz.type === 'river') {
                inZone = Math.abs(px - wz.x) < wz.halfW && Math.abs(pz - wz.z) < wz.halfL;
            } else {
                var dx = px - wz.x, dz = pz - wz.z;
                inZone = Math.sqrt(dx * dx + dz * dz) < wz.halfW;
            }
            if (inZone) {
                playerSwimming = true;
                results.swimming = true;
                results.moveSpeedMod *= 0.5; // slower in water
                // Current pushes player
                currentPushX = wz.currentX * 2;
                currentPushZ = wz.currentZ * 2;
                results.currentPushX = currentPushX;
                results.currentPushZ = currentPushZ;
                // Submerged check
                if (py < -0.3) {
                    playerSubmerged = true;
                    breathTimer = Math.max(0, breathTimer - dt);
                    if (breathTimer <= 0) results.damage += 15 * dt; // drowning
                } else {
                    breathTimer = Math.min(MAX_BREATH, breathTimer + 2 * dt);
                }
                results.breathTimer = breathTimer;
                break;
            }
        }
        if (!playerSwimming) {
            breathTimer = Math.min(MAX_BREATH, breathTimer + 5 * dt);
        }
    }

    // ============ CAMPFIRE MANAGEMENT ============
    function updateCampfires(dt, px, pz) {
        for (var i = 0; i < campfires.length; i++) {
            var cf = campfires[i];
            if (cf.lit) {
                cf.fuel -= dt;
                if (cf.fuel <= 0) {
                    cf.lit = false;
                    if (cf.mesh) cf.mesh.material.opacity = 0;
                    if (cf.light) cf.light.intensity = 0;
                    continue;
                }
                // Fire flicker
                if (cf.light) cf.light.intensity = 1.2 + Math.sin(Date.now() * 0.01) * 0.3;
                if (cf.mesh) {
                    cf.mesh.material.opacity = 0.7 + Math.sin(Date.now() * 0.015) * 0.2;
                    cf.mesh.scale.y = 1 + Math.sin(Date.now() * 0.008) * 0.2;
                }
            }
        }
    }

    function lightCampfire(px, pz) {
        for (var i = 0; i < campfires.length; i++) {
            var cf = campfires[i];
            var dx = px - cf.x, dz = pz - cf.z;
            if (Math.sqrt(dx * dx + dz * dz) < 2 && !cf.lit) {
                cf.lit = true;
                cf.fuel = 120;
                if (cf.mesh) cf.mesh.material.opacity = 0.7;
                if (cf.light) cf.light.intensity = 1.2;
                return true;
            }
        }
        return false;
    }

    function getNearCampfire(px, pz) {
        for (var i = 0; i < campfires.length; i++) {
            var cf = campfires[i];
            var dx = px - cf.x, dz = pz - cf.z;
            if (Math.sqrt(dx * dx + dz * dz) < 2 && !cf.lit) {
                return cf;
            }
        }
        return null;
    }

    // ============ FLASH FLOODS ============
    function updateFlashFlood(dt, px, pz, isNight, results) {
        floodCooldown -= dt;
        if (floodActive) {
            floodTimer -= dt;
            // Push player
            var floodZoneZ = pz;
            if (Math.abs(px - 30) < 15) { // near Nile
                results.floodPush = { x: floodDirection.x * 6, z: floodDirection.z * 6 };
                results.damage += 3 * dt;
            }
            // Move flood mesh
            if (floodMesh) {
                floodMesh.material.opacity = Math.min(0.4, floodTimer * 0.05);
            }
            if (floodTimer <= 0) {
                floodActive = false;
                if (floodMesh) { _scene.remove(floodMesh); floodMesh = null; }
            }
        } else if (floodCooldown <= 0 && !isNight && Math.random() < 0.001) {
            // Trigger flash flood (rare, daytime only after rain)
            floodActive = true;
            floodTimer = 15;
            floodCooldown = 300 + Math.random() * 200;
            floodDirection = { x: 0, z: Math.random() > 0.5 ? 1 : -1 };
            // Visual
            floodMesh = new THREE.Mesh(
                new THREE.PlaneGeometry(30, 120),
                new THREE.MeshStandardMaterial({
                    color: 0x3a6688, transparent: true, opacity: 0.4,
                    side: THREE.DoubleSide
                })
            );
            floodMesh.rotation.x = -Math.PI / 2;
            floodMesh.position.set(30, 0.1, 0);
            if (_scene) _scene.add(floodMesh);
        }
    }

    // ============ STRUCTURAL DECAY ============
    function updateDecay(dt, sandstormActive) {
        if (!sandstormActive) return;
        for (var i = 0; i < decayStructures.length; i++) {
            var ds = decayStructures[i];
            ds.erosion = Math.min(1, (ds.erosion || 0) + 0.002 * dt);
            if (ds.mesh && ds.mesh.material) {
                ds.mesh.material.color.lerp(new THREE.Color(0x8a7030), ds.erosion * 0.1);
            }
        }
    }

    function registerDecayStructure(mesh) {
        decayStructures.push({ mesh: mesh, erosion: 0 });
    }

    // ============ CLOTHING ============
    function toggleClothing() {
        clothing = clothing === 'linen' ? 'cloak' : 'linen';
        return clothing;
    }

    // ============ GETTERS ============
    function getTemperature() { return Math.round(temperature); }
    function getHydration() { return Math.round(hydration); }
    function getHeatstroke() { return Math.round(heatstroke); }
    function getHypothermia() { return Math.round(hypothermia); }
    function getWindInfo() { return { angle: wind.angle, speed: wind.currentSpeed, dx: wind.dx, dz: wind.dz }; }
    function getBreath() { return Math.round(breathTimer); }
    function isSwimming() { return playerSwimming; }
    function isSubmerged() { return playerSubmerged; }
    function getClothing() { return clothing; }
    function isInQuicksand() { return !!playerInQuicksand; }
    function getQuicksandDepth() { return quicksandSinkDepth; }

    // ============ RESET ============
    function reset() {
        temperature = 25; hydration = 100;
        heatstroke = 0; hypothermia = 0;
        playerSwimming = false; breathTimer = MAX_BREATH;
        playerInQuicksand = null; quicksandSinkDepth = 0;
        floodActive = false; floodTimer = 0;
        clothing = 'linen'; struggleCount = 0;
        // Cleanup meshes
        sandParticles.forEach(function (p) { if (p.mesh) { p.mesh.visible = false; p.active = false; } });
        footprints.forEach(function (f) { if (f.mesh && _scene) _scene.remove(f.mesh); });
        footprints = [];
        campfires.forEach(function (cf) { cf.lit = false; cf.fuel = 120; });
        if (floodMesh && _scene) { _scene.remove(floodMesh); floodMesh = null; }
        decayStructures = [];
    }

    return {
        build: build, update: update, reset: reset,
        struggle: struggle,
        lightCampfire: lightCampfire,
        getNearCampfire: getNearCampfire,
        toggleClothing: toggleClothing,
        registerDecayStructure: registerDecayStructure,
        // Getters
        getTemperature: getTemperature,
        getHydration: getHydration,
        getHeatstroke: getHeatstroke,
        getHypothermia: getHypothermia,
        getWindInfo: getWindInfo,
        getBreath: getBreath,
        isSwimming: isSwimming,
        isSubmerged: isSubmerged,
        getClothing: getClothing,
        isInQuicksand: isInQuicksand,
        getQuicksandDepth: getQuicksandDepth
    };
})();

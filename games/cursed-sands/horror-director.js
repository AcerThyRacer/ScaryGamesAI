/* ============================================
   Cursed Sands — Phase 4: Advanced Horror & Dynamic AI Director
   AI Director, procedural horror events, advanced weather, enemy evolution
   ============================================ */
var HorrorDirector = (function () {
    'use strict';

    // ============ AI DIRECTOR STATE ============
    var playerStress = 50; // 0-100 stress meter
    var horrorIntensity = 0.5; // 0-1 current horror level
    var calmTimer = 0, buildupTimer = 0;
    var directorPhase = 'buildup'; // 'calm', 'buildup', 'peak', 'aftermath'
    var phaseTimer = 0;
    var eventCooldown = 0;
    var activeHorrorEvents = [];

    // ============ WEATHER STATE ============
    var weatherState = 'clear'; // 'clear', 'sandstorm', 'rain', 'eclipse'
    var weatherTimer = 0, weatherTransition = 0;
    var eclipseActive = false, eclipseDarkness = 0;
    var rainParticles = [], sandParticles = [];
    var mirages = [];
    var weatherMeshGroup = null;

    // ============ ENEMY EVOLUTION ============
    var evolutionLevel = 0; // increases over time
    var enemyMemory = { playerPatterns: [], lastPositions: [], flankAttempts: 0 };
    var ammitSpawned = false, ammitEntity = null;

    // ============ ENVIRONMENTAL HORROR ============
    var apparitions = [];
    var sandHands = [];
    var movingStatues = [];
    var bloodHieroglyphs = [];
    var quicksandPatches = [];
    var _scene = null;

    // ============ PROCEDURAL EVENT POOL ============
    var EVENT_TYPES = [
        { id: 'apparition', name: 'Ghostly Apparition', weight: 3, minStress: 20 },
        { id: 'sand_hands', name: 'Sand Hands', weight: 2, minStress: 40 },
        { id: 'statue_turn', name: 'Statue Turns', weight: 2, minStress: 30 },
        { id: 'whisper_surge', name: 'Whispering Surge', weight: 4, minStress: 10 },
        { id: 'blood_glyph', name: 'Blood Hieroglyphs', weight: 2, minStress: 50 },
        { id: 'shadow_figure', name: 'Shadow Figure', weight: 1, minStress: 60 },
        { id: 'ground_shake', name: 'Ground Tremor', weight: 2, minStress: 35 },
        { id: 'lantern_flicker', name: 'Lights Die', weight: 3, minStress: 15 },
        { id: 'footsteps', name: 'Phantom Footsteps', weight: 4, minStress: 5 },
        { id: 'face_flash', name: 'Face Flash', weight: 1, minStress: 70 },
    ];

    // ============ BUILD ============
    function build(scene) {
        _scene = scene;
        playerStress = 50; horrorIntensity = 0.5;
        calmTimer = 0; buildupTimer = 0;
        directorPhase = 'buildup'; phaseTimer = 15;
        eventCooldown = 10; // initial grace period
        activeHorrorEvents = [];
        weatherState = 'clear'; weatherTimer = 60 + Math.random() * 60;
        weatherTransition = 0; eclipseActive = false; eclipseDarkness = 0;
        rainParticles = []; sandParticles = []; mirages = [];
        evolutionLevel = 0;
        enemyMemory = { playerPatterns: [], lastPositions: [], flankAttempts: 0 };
        ammitSpawned = false; ammitEntity = null;
        apparitions = []; sandHands = []; movingStatues = [];
        bloodHieroglyphs = []; quicksandPatches = [];

        // Create weather particle group
        weatherMeshGroup = new THREE.Group();
        scene.add(weatherMeshGroup);

        // Pre-create sand particles for sandstorms
        var sandMat = new THREE.MeshBasicMaterial({ color: 0xd4a843, transparent: true, opacity: 0.4 });
        for (var i = 0; i < 200; i++) {
            var p = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.15), sandMat);
            p.visible = false;
            weatherMeshGroup.add(p);
            sandParticles.push({ mesh: p, vx: 0, vy: 0, vz: 0 });
        }
        // Rain particles
        var rainMat = new THREE.MeshBasicMaterial({ color: 0x88aacc, transparent: true, opacity: 0.5 });
        for (var i = 0; i < 150; i++) {
            var r = new THREE.Mesh(new THREE.PlaneGeometry(0.02, 0.3), rainMat);
            r.visible = false;
            weatherMeshGroup.add(r);
            rainParticles.push({ mesh: r, vx: 0, vy: 0, vz: 0 });
        }

        // Place quicksand patches
        for (var q = 0; q < 6; q++) {
            var qx = (Math.random() - 0.5) * 160;
            var qz = (Math.random() - 0.5) * 160;
            if (Math.abs(qx + 40) < 15) continue; // skip river
            var qMesh = new THREE.Mesh(new THREE.CircleGeometry(2 + Math.random() * 2, 8),
                new THREE.MeshStandardMaterial({ color: 0xb89840, roughness: 1, transparent: true, opacity: 0.6 }));
            qMesh.rotation.x = -Math.PI / 2;
            qMesh.position.set(qx, 0.02, qz);
            scene.add(qMesh);
            quicksandPatches.push({ x: qx, z: qz, radius: 2 + Math.random() * 2, mesh: qMesh, sinkRate: 0 });
        }

        // Heat mirages (daytime visual distortion)
        for (var m = 0; m < 4; m++) {
            var mx = (Math.random() - 0.5) * 140;
            var mz = (Math.random() - 0.5) * 140;
            var mMesh = new THREE.Mesh(new THREE.PlaneGeometry(8, 4),
                new THREE.MeshStandardMaterial({ color: 0xd4a843, transparent: true, opacity: 0.12, side: THREE.DoubleSide }));
            mMesh.position.set(mx, 2, mz);
            mMesh.visible = false;
            scene.add(mMesh);
            mirages.push({ mesh: mMesh, x: mx, z: mz, phase: Math.random() * Math.PI * 2 });
        }
    }

    // ============ MAIN UPDATE ============
    function update(dt, playerX, playerZ, playerY, gameMinute, sanity, isNight, enemies, sunY) {
        if (!_scene) return {};

        var hour = gameMinute / 60;
        var results = {};

        // ---- Track player stress ----
        updateStress(dt, sanity, isNight, enemies, playerX, playerZ);

        // ---- AI Director phase management ----
        updateDirectorPhase(dt);

        // ---- Procedural horror events ----
        eventCooldown -= dt;
        if (eventCooldown <= 0) {
            triggerEvent(playerX, playerZ, playerY, isNight);
            // Dynamic cooldown: shorter when stress is low (to build tension), longer after peak
            eventCooldown = directorPhase === 'calm' ? 5 + Math.random() * 5 :
                directorPhase === 'peak' ? 2 + Math.random() * 3 :
                    8 + Math.random() * 10;
        }

        // Update active horror events
        updateHorrorEvents(dt, playerX, playerZ, playerY);

        // ---- Advanced weather ----
        results.weather = updateWeather(dt, playerX, playerZ, playerY, hour, isNight, sunY);

        // ---- Enemy evolution ----
        updateEvolution(dt, playerX, playerZ, enemies, isNight);

        // ---- Quicksand ----
        results.quicksand = updateQuicksand(dt, playerX, playerZ);

        // ---- Heat mirages ----
        updateMirages(dt, hour, playerX, playerZ);

        // ---- Environmental decay ----
        results.sanityModifier = getSanityModifier(isNight);
        results.horrorIntensity = horrorIntensity;
        results.eclipseActive = eclipseActive;
        results.eclipseDarkness = eclipseDarkness;
        results.directorPhase = directorPhase;

        return results;
    }

    // ============ STRESS TRACKING ============
    function updateStress(dt, sanity, isNight, enemies, px, pz) {
        var stressDelta = 0;
        // Low sanity = high stress
        if (sanity < 50) stressDelta += (50 - sanity) * 0.02 * dt;
        // Night = stress
        if (isNight) stressDelta += 1.5 * dt;
        // Enemies nearby
        var nearDist = 999;
        enemies.forEach(function (e) {
            var d = Math.sqrt((px - e.x) * (px - e.x) + (pz - e.z) * (pz - e.z));
            if (d < nearDist) nearDist = d;
        });
        if (nearDist < 8) stressDelta += (8 - nearDist) * 0.8 * dt;
        // Recently attacked = big stress spike
        if (nearDist < 2) stressDelta += 15 * dt;
        // Eclipse = maximum stress
        if (eclipseActive) stressDelta += 5 * dt;
        // Natural decay toward 50
        stressDelta -= (playerStress - 50) * 0.01 * dt;
        playerStress = Math.max(0, Math.min(100, playerStress + stressDelta));
    }

    // ============ DIRECTOR PHASES ============
    function updateDirectorPhase(dt) {
        phaseTimer -= dt;
        if (phaseTimer <= 0) {
            switch (directorPhase) {
                case 'calm':
                    directorPhase = 'buildup'; phaseTimer = 20 + Math.random() * 20;
                    horrorIntensity = 0.3;
                    break;
                case 'buildup':
                    if (playerStress > 60) {
                        directorPhase = 'peak'; phaseTimer = 10 + Math.random() * 10;
                        horrorIntensity = 0.9;
                    } else {
                        phaseTimer = 10; // keep building
                        horrorIntensity = Math.min(0.8, horrorIntensity + 0.1);
                    }
                    break;
                case 'peak':
                    directorPhase = 'aftermath'; phaseTimer = 8 + Math.random() * 5;
                    horrorIntensity = 0.6;
                    break;
                case 'aftermath':
                    directorPhase = 'calm'; phaseTimer = 15 + Math.random() * 15;
                    horrorIntensity = 0.1;
                    break;
            }
        }
        // Smooth intensity transition
        var targetIntensity = directorPhase === 'calm' ? 0.1 :
            directorPhase === 'buildup' ? 0.3 + (1 - phaseTimer / 30) * 0.4 :
                directorPhase === 'peak' ? 0.85 + Math.sin(Date.now() * 0.003) * 0.1 : 0.4;
        horrorIntensity += (targetIntensity - horrorIntensity) * dt * 0.5;
    }

    // ============ PROCEDURAL HORROR EVENTS ============
    function triggerEvent(px, pz, py, isNight) {
        // Filter eligible events
        var eligible = EVENT_TYPES.filter(function (e) { return playerStress >= e.minStress; });
        if (eligible.length === 0) return;
        // Weighted random selection
        var totalW = 0;
        eligible.forEach(function (e) { totalW += e.weight * (isNight ? 1.5 : 1); });
        var roll = Math.random() * totalW, sum = 0;
        var chosen = eligible[0];
        for (var i = 0; i < eligible.length; i++) {
            sum += eligible[i].weight * (isNight ? 1.5 : 1);
            if (roll < sum) { chosen = eligible[i]; break; }
        }

        switch (chosen.id) {
            case 'apparition': spawnApparition(px, pz); break;
            case 'sand_hands': spawnSandHands(px, pz); break;
            case 'statue_turn': triggerStatueTurn(px, pz); break;
            case 'whisper_surge': activeHorrorEvents.push({ type: 'whisper', life: 4 + Math.random() * 4, intensity: horrorIntensity }); break;
            case 'blood_glyph': spawnBloodGlyph(px, pz); break;
            case 'shadow_figure': spawnShadowFigure(px, pz); break;
            case 'ground_shake': activeHorrorEvents.push({ type: 'shake', life: 2 + Math.random() * 2, intensity: 0.03 * horrorIntensity }); break;
            case 'lantern_flicker': activeHorrorEvents.push({ type: 'flicker', life: 3 + Math.random() * 3 }); break;
            case 'footsteps': activeHorrorEvents.push({ type: 'footsteps', life: 5, side: Math.random() > 0.5 ? 1 : -1 }); break;
            case 'face_flash': activeHorrorEvents.push({ type: 'face_flash', life: 0.15 }); break;
        }
    }

    function spawnApparition(px, pz) {
        var angle = Math.random() * Math.PI * 2;
        var dist = 8 + Math.random() * 12;
        var ax = px + Math.cos(angle) * dist, az = pz + Math.sin(angle) * dist;
        var ghost = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 2, 8),
            new THREE.MeshStandardMaterial({ color: 0xaaaacc, transparent: true, opacity: 0.25, emissive: 0x6666aa, emissiveIntensity: 0.5 }));
        ghost.position.set(ax, 1, az);
        _scene.add(ghost);
        var glow = new THREE.PointLight(0x6666cc, 0.3, 6);
        glow.position.set(ax, 1.5, az); _scene.add(glow);
        apparitions.push({ mesh: ghost, light: glow, x: ax, z: az, life: 5 + Math.random() * 5, phase: Math.random() * Math.PI * 2 });
    }

    function spawnSandHands(px, pz) {
        for (var h = 0; h < 3 + Math.floor(Math.random() * 3); h++) {
            var hx = px + (Math.random() - 0.5) * 8;
            var hz = pz + (Math.random() - 0.5) * 8;
            var hand = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.8, 5),
                new THREE.MeshStandardMaterial({ color: 0xd4a843, roughness: 1 }));
            hand.position.set(hx, -0.5, hz);
            _scene.add(hand);
            sandHands.push({ mesh: hand, x: hx, z: hz, life: 4, riseProgress: 0 });
        }
    }

    function triggerStatueTurn(px, pz) {
        activeHorrorEvents.push({ type: 'statue_turn', life: 0.5, px: px, pz: pz });
    }

    function spawnBloodGlyph(px, pz) {
        var angle = Math.random() * Math.PI * 2;
        var dist = 3 + Math.random() * 5;
        var gx = px + Math.cos(angle) * dist, gz = pz + Math.sin(angle) * dist;
        var glyph = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5),
            new THREE.MeshStandardMaterial({ color: 0x880000, emissive: 0x440000, emissiveIntensity: 0.5, transparent: true, opacity: 0.7, side: THREE.DoubleSide }));
        glyph.rotation.x = -Math.PI / 2;
        glyph.position.set(gx, 0.02, gz);
        _scene.add(glyph);
        bloodHieroglyphs.push({ mesh: glyph, life: 8, fadeIn: 0 });
    }

    function spawnShadowFigure(px, pz) {
        var angle = Math.random() * Math.PI * 2;
        var dist = 12 + Math.random() * 8;
        var sx = px + Math.cos(angle) * dist, sz = pz + Math.sin(angle) * dist;
        var shadow = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.2, 2.5, 6),
            new THREE.MeshStandardMaterial({ color: 0x000000, transparent: true, opacity: 0.6 }));
        shadow.position.set(sx, 1.25, sz);
        _scene.add(shadow);
        // Red eyes
        var eyeMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 2 });
        var e1 = new THREE.Mesh(new THREE.SphereGeometry(0.04, 4, 4), eyeMat);
        e1.position.set(-0.08, 1, 0.2); shadow.add(e1);
        var e2 = new THREE.Mesh(new THREE.SphereGeometry(0.04, 4, 4), eyeMat);
        e2.position.set(0.08, 1, 0.2); shadow.add(e2);
        apparitions.push({ mesh: shadow, x: sx, z: sz, life: 3, phase: 0, isShadow: true });
    }

    // ============ UPDATE HORROR EVENTS ============
    function updateHorrorEvents(dt, px, pz, py) {
        // Apparitions
        for (var ai = apparitions.length - 1; ai >= 0; ai--) {
            var ap = apparitions[ai];
            ap.life -= dt;
            ap.phase += dt * 2;
            if (ap.mesh) {
                ap.mesh.position.y = 1 + Math.sin(ap.phase) * 0.2;
                ap.mesh.material.opacity = Math.min(0.3, ap.life * 0.1) * (ap.isShadow ? 2 : 1);
                // Face player
                ap.mesh.lookAt(px, 1, pz);
            }
            if (ap.life <= 0) {
                if (ap.mesh) _scene.remove(ap.mesh);
                if (ap.light) _scene.remove(ap.light);
                apparitions.splice(ai, 1);
            }
        }
        // Sand hands
        for (var si = sandHands.length - 1; si >= 0; si--) {
            var sh = sandHands[si];
            sh.life -= dt;
            sh.riseProgress = Math.min(1, sh.riseProgress + dt * 0.8);
            if (sh.mesh) sh.mesh.position.y = -0.5 + sh.riseProgress * 1.0;
            // Grab player
            var dx = px - sh.x, dz = pz - sh.z;
            if (Math.sqrt(dx * dx + dz * dz) < 1 && sh.riseProgress > 0.5) {
                playerStress += 10 * dt;
            }
            if (sh.life <= 0) {
                if (sh.mesh) _scene.remove(sh.mesh);
                sandHands.splice(si, 1);
            }
        }
        // Blood hieroglyphs
        for (var bi = bloodHieroglyphs.length - 1; bi >= 0; bi--) {
            var bg = bloodHieroglyphs[bi];
            bg.life -= dt;
            bg.fadeIn = Math.min(1, bg.fadeIn + dt * 0.5);
            if (bg.mesh) bg.mesh.material.opacity = bg.fadeIn * 0.7 * Math.min(1, bg.life);
            if (bg.life <= 0) {
                if (bg.mesh) _scene.remove(bg.mesh);
                bloodHieroglyphs.splice(bi, 1);
            }
        }
        // Active events (whispers, shakes, flickers, etc.)
        for (var ei = activeHorrorEvents.length - 1; ei >= 0; ei--) {
            activeHorrorEvents[ei].life -= dt;
            if (activeHorrorEvents[ei].life <= 0) activeHorrorEvents.splice(ei, 1);
        }
    }

    // ============ ADVANCED WEATHER ============
    function updateWeather(dt, px, pz, py, hour, isNight, sunY) {
        var result = { type: weatherState, intensity: 0, visibility: 1 };
        weatherTimer -= dt;

        if (weatherTimer <= 0) {
            // Transition to new weather
            var rand = Math.random();
            if (rand < 0.4) { weatherState = 'clear'; weatherTimer = 60 + Math.random() * 90; }
            else if (rand < 0.75) { weatherState = 'sandstorm'; weatherTimer = 15 + Math.random() * 20; }
            else if (rand < 0.9 && isNight) { weatherState = 'rain'; weatherTimer = 20 + Math.random() * 15; }
            else if (rand >= 0.9 && !eclipseActive && hour > 8 && hour < 16) {
                weatherState = 'eclipse'; weatherTimer = 20 + Math.random() * 10;
                eclipseActive = true;
            } else {
                weatherState = 'clear'; weatherTimer = 40 + Math.random() * 40;
            }
        }

        // Update particles
        if (weatherState === 'sandstorm') {
            result.intensity = 0.7 + Math.sin(Date.now() * 0.001) * 0.2;
            result.visibility = 0.3;
            for (var si = 0; si < sandParticles.length; si++) {
                var sp = sandParticles[si];
                sp.mesh.visible = true;
                if (!sp.vx) {
                    sp.mesh.position.set(px + (Math.random() - 0.5) * 30, Math.random() * 5, pz + (Math.random() - 0.5) * 30);
                    sp.vx = 8 + Math.random() * 4; sp.vz = (Math.random() - 0.5) * 3;
                    sp.vy = (Math.random() - 0.5) * 2;
                }
                sp.mesh.position.x += sp.vx * dt;
                sp.mesh.position.y += sp.vy * dt;
                sp.mesh.position.z += sp.vz * dt;
                // Reset if too far
                if (Math.abs(sp.mesh.position.x - px) > 20 || Math.abs(sp.mesh.position.z - pz) > 20) {
                    sp.mesh.position.set(px - 15 + Math.random() * 5, Math.random() * 5, pz + (Math.random() - 0.5) * 30);
                }
                sp.mesh.lookAt(px, sp.mesh.position.y, pz);
            }
        } else {
            sandParticles.forEach(function (sp) { sp.mesh.visible = false; sp.vx = 0; });
        }

        if (weatherState === 'rain') {
            result.intensity = 0.5 + Math.sin(Date.now() * 0.002) * 0.15;
            result.visibility = 0.6;
            for (var ri = 0; ri < rainParticles.length; ri++) {
                var rp = rainParticles[ri];
                rp.mesh.visible = true;
                if (!rp.vy) {
                    rp.mesh.position.set(px + (Math.random() - 0.5) * 20, 8 + Math.random() * 3, pz + (Math.random() - 0.5) * 20);
                    rp.vy = -8 - Math.random() * 4;
                    rp.vx = (Math.random() - 0.5) * 1;
                }
                rp.mesh.position.y += rp.vy * dt;
                rp.mesh.position.x += rp.vx * dt;
                if (rp.mesh.position.y < 0) {
                    rp.mesh.position.set(px + (Math.random() - 0.5) * 20, 8 + Math.random() * 3, pz + (Math.random() - 0.5) * 20);
                }
            }
        } else {
            rainParticles.forEach(function (rp) { rp.mesh.visible = false; rp.vy = 0; });
        }

        // Eclipse
        if (weatherState === 'eclipse') {
            eclipseActive = true;
            eclipseDarkness = Math.min(0.9, eclipseDarkness + dt * 0.1);
            result.intensity = 1;
            result.visibility = 0.4;
        } else if (eclipseActive) {
            eclipseDarkness -= dt * 0.15;
            if (eclipseDarkness <= 0) { eclipseActive = false; eclipseDarkness = 0; }
        }

        return result;
    }

    // ============ QUICKSAND ============
    function updateQuicksand(dt, px, pz) {
        var result = { trapped: false, sinkSpeed: 0 };
        for (var qi = 0; qi < quicksandPatches.length; qi++) {
            var qs = quicksandPatches[qi];
            var dx = px - qs.x, dz = pz - qs.z;
            var dist = Math.sqrt(dx * dx + dz * dz);
            if (dist < qs.radius) {
                result.trapped = true;
                qs.sinkRate = Math.min(1, qs.sinkRate + dt * 0.3);
                result.sinkSpeed = qs.sinkRate * 0.5;
                // Visual: darken center
                if (qs.mesh) qs.mesh.material.opacity = 0.6 + qs.sinkRate * 0.3;
            } else {
                qs.sinkRate = Math.max(0, qs.sinkRate - dt * 0.5);
            }
        }
        return result;
    }

    // ============ MIRAGES ============
    function updateMirages(dt, hour, px, pz) {
        var isDaytime = hour >= 10 && hour < 16;
        mirages.forEach(function (m) {
            m.phase += dt * 0.5;
            m.mesh.visible = isDaytime;
            if (isDaytime) {
                m.mesh.material.opacity = 0.08 + Math.sin(m.phase) * 0.06;
                m.mesh.position.y = 1.5 + Math.sin(m.phase * 0.7) * 0.5;
                m.mesh.lookAt(px, m.mesh.position.y, pz);
            }
        });
    }

    // ============ ENEMY EVOLUTION ============
    function updateEvolution(dt, px, pz, enemies, isNight) {
        evolutionLevel += dt * 0.005; // slowly increases
        // Track player position for flanking
        enemyMemory.lastPositions.push({ x: px, z: pz, t: Date.now() });
        if (enemyMemory.lastPositions.length > 30) enemyMemory.lastPositions.shift();

        // Apply evolution effects
        enemies.forEach(function (e) {
            // Speed scaling
            var speedBoost = 1 + evolutionLevel * 0.1;

            // Mummy pattern learning (level 1+ = try to predict player movement)
            if (evolutionLevel >= 1 && enemyMemory.lastPositions.length > 10 && e.state === 'chase') {
                var oldest = enemyMemory.lastPositions[0];
                var newest = enemyMemory.lastPositions[enemyMemory.lastPositions.length - 1];
                var predX = newest.x + (newest.x - oldest.x) * 0.3;
                var predZ = newest.z + (newest.z - oldest.z) * 0.3;
                // Move toward predicted position
                var pdx = predX - e.x, pdz = predZ - e.z;
                var pdist = Math.sqrt(pdx * pdx + pdz * pdz);
                if (pdist > 1) {
                    e.x += (pdx / pdist) * e.speed * speedBoost * dt * 0.3;
                    e.z += (pdz / pdist) * e.speed * speedBoost * dt * 0.3;
                }
            }

            // Anubis coordination (level 2+ = try to surround player)
            if (evolutionLevel >= 2 && e.state === 'chase') {
                var nearbyAllies = enemies.filter(function (e2) {
                    return e2 !== e && e2.state === 'chase' && Math.sqrt((e2.x - e.x) * (e2.x - e.x) + (e2.z - e.z) * (e2.z - e.z)) < 15;
                });
                if (nearbyAllies.length > 0) {
                    // Spread out from allies
                    nearbyAllies.forEach(function (ally) {
                        var ax = e.x - ally.x, az = e.z - ally.z;
                        var ad = Math.sqrt(ax * ax + az * az);
                        if (ad < 3 && ad > 0) {
                            e.x += (ax / ad) * dt * 2;
                            e.z += (az / ad) * dt * 2;
                        }
                    });
                }
            }
        });

        // Ammit boss spawn at evolution level 3+
        if (evolutionLevel >= 3 && !ammitSpawned) {
            spawnAmmit(px, pz);
        }
        if (ammitEntity) updateAmmit(dt, px, pz);
    }

    // ============ AMMIT BOSS ============
    function spawnAmmit(px, pz) {
        ammitSpawned = true;
        var group = new THREE.Group();
        // Massive body (crocodile-lion hybrid)
        var bodyMat = new THREE.MeshStandardMaterial({ color: 0x2a1a0a, roughness: 0.7, metalness: 0.3 });
        // Croc body
        var body = new THREE.Mesh(new THREE.BoxGeometry(2, 1.2, 4), bodyMat);
        group.add(body);
        // Lion mane
        var maneMat = new THREE.MeshStandardMaterial({ color: 0x4a2a0a, roughness: 0.9 });
        var mane = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 8), maneMat);
        mane.position.set(0, 0.8, 1.5); mane.scale.set(1.2, 0.8, 1); group.add(mane);
        // Croc head
        var head = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 1.5), bodyMat);
        head.position.set(0, 0.6, 2.8); group.add(head);
        // Jaw
        var jaw = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.2, 1.2), bodyMat);
        jaw.position.set(0, 0.2, 3); group.add(jaw);
        // Glowing eyes
        var eyeMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 2 });
        group.add(new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), eyeMat).translateX(-0.2).translateY(0.85).translateZ(3.2));
        group.add(new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), eyeMat).translateX(0.2).translateY(0.85).translateZ(3.2));
        // Tail
        var tail = new THREE.Mesh(new THREE.ConeGeometry(0.3, 2, 5), bodyMat);
        tail.position.set(0, 0.2, -2.5); tail.rotation.x = Math.PI / 2; group.add(tail);

        var spawnDist = 40;
        var angle = Math.random() * Math.PI * 2;
        var sx = px + Math.cos(angle) * spawnDist;
        var sz = pz + Math.sin(angle) * spawnDist;
        group.position.set(sx, 0.6, sz);
        _scene.add(group);

        var aLight = new THREE.PointLight(0xff2200, 0.5, 10);
        aLight.position.set(sx, 2, sz); _scene.add(aLight);

        ammitEntity = { mesh: group, light: aLight, x: sx, z: sz, hp: 200, speed: 3, state: 'stalk', attackTimer: 0, burrowTimer: 0, burrowed: false };
    }

    function updateAmmit(dt, px, pz) {
        var a = ammitEntity; if (!a || a.hp <= 0) return;
        var dx = px - a.x, dz = pz - a.z;
        var dist = Math.sqrt(dx * dx + dz * dz);

        if (a.burrowed) {
            a.burrowTimer -= dt;
            if (a.burrowTimer <= 0) {
                // Emerge near player
                var angle = Math.random() * Math.PI * 2;
                a.x = px + Math.cos(angle) * 5;
                a.z = pz + Math.sin(angle) * 5;
                a.burrowed = false;
                a.mesh.visible = true;
                a.state = 'charge';
                a.attackTimer = 3;
            }
            return;
        }

        if (a.state === 'stalk') {
            // Circle the player
            var orbitAngle = Math.atan2(dz, dx) + dt * 0.3;
            a.x = px + Math.cos(orbitAngle) * 15;
            a.z = pz + Math.sin(orbitAngle) * 15;
            if (Math.random() < 0.01) { a.state = 'charge'; a.attackTimer = 4; }
            if (Math.random() < 0.005) {
                a.state = 'burrow'; a.burrowed = true;
                a.burrowTimer = 3 + Math.random() * 3;
                a.mesh.visible = false;
            }
        } else if (a.state === 'charge') {
            // Rush toward player
            if (dist > 1) {
                a.x += (dx / dist) * a.speed * 1.5 * dt;
                a.z += (dz / dist) * a.speed * 1.5 * dt;
            }
            a.attackTimer -= dt;
            if (a.attackTimer <= 0 || dist > 25) a.state = 'stalk';
        }

        a.mesh.position.set(a.x, 0.6, a.z);
        a.mesh.lookAt(px, 0.6, pz);
        if (a.light) a.light.position.set(a.x, 2, a.z);
    }

    function damageAmmit(dmg) {
        if (!ammitEntity) return false;
        ammitEntity.hp -= dmg;
        if (ammitEntity.hp <= 0) {
            if (ammitEntity.mesh) _scene.remove(ammitEntity.mesh);
            if (ammitEntity.light) _scene.remove(ammitEntity.light);
            ammitEntity = null;
            return true; // killed
        }
        return false;
    }

    // ============ SANITY MODIFIER ============
    function getSanityModifier(isNight) {
        var mod = 1;
        if (directorPhase === 'peak') mod *= 1.5;
        if (eclipseActive) mod *= 2;
        // Active horror events increase drain
        activeHorrorEvents.forEach(function (e) {
            if (e.type === 'whisper') mod *= 1.3;
            if (e.type === 'face_flash') mod *= 3;
        });
        return mod;
    }

    function getActiveEvents() { return activeHorrorEvents; }

    function isAmmitNear(px, pz) {
        if (!ammitEntity || ammitEntity.burrowed) return false;
        var dx = px - ammitEntity.x, dz = pz - ammitEntity.z;
        return Math.sqrt(dx * dx + dz * dz) < 3;
    }

    function reset() {
        playerStress = 50; horrorIntensity = 0.5;
        directorPhase = 'buildup'; phaseTimer = 15;
        eventCooldown = 10; activeHorrorEvents = [];
        weatherState = 'clear'; eclipseActive = false; eclipseDarkness = 0;
        evolutionLevel = 0; ammitSpawned = false; ammitEntity = null;
        apparitions = []; sandHands = []; bloodHieroglyphs = []; quicksandPatches = [];
        mirages = []; rainParticles = []; sandParticles = [];
    }

    return {
        build: build, update: update, reset: reset,
        damageAmmit: damageAmmit, isAmmitNear: isAmmitNear,
        getActiveEvents: getActiveEvents,
        getStress: function () { return playerStress; },
        getIntensity: function () { return horrorIntensity; },
        getEvolutionLevel: function () { return evolutionLevel; },
        getWeatherState: function () { return weatherState; },
        isEclipse: function () { return eclipseActive; },
    };
})();

/* ============================================
   Cursed Sands — Phase 5: Endgame Systems
   Bosses, NG+, Survival, Leaderboards, Daily Challenges, Cosmetics
   ============================================ */
var EndgameSystem = (function () {
    'use strict';

    var _scene = null;

    // ============ BOSS STATE ============
    var bosses = {
        pharaoh: { name: 'The Mummy Pharaoh', hp: 0, maxHp: 300, phase: 0, mesh: null, arena: null, active: false, defeated: false, x: 40, z: -40, attackTimer: 0, summonTimer: 0, minions: [], shockwaves: [], curseAura: null },
        anubis: { name: 'Anubis, God of Death', hp: 0, maxHp: 400, phase: 0, mesh: null, arena: null, active: false, defeated: false, x: 70, z: 30, attackTimer: 0, teleportTimer: 0, clones: [], soulTimer: 0 },
        apophis: { name: 'Apophis, the World Serpent', hp: 0, maxHp: 500, phase: 0, mesh: null, arena: null, active: false, defeated: false, x: 0, z: 0, attackTimer: 0, burrowTimer: 0, burrowed: false, sinkholes: [], venomPools: [] }
    };
    var activeBoss = null;
    var bossArenaRadius = 20;

    // ============ NG+ STATE ============
    var ngPlus = false;
    var ngPlusMultiplier = 2;

    // ============ SURVIVAL MODE ============
    var survivalMode = false;
    var survivalWave = 0, survivalTimer = 0, survivalKills = 0;
    var survivalSpawnTimer = 0;
    var WAVE_INTERVAL = 30;

    // ============ GAME MODE ============
    var gameMode = 'story'; // 'story', 'survival', 'daily'

    // ============ LEADERBOARD ============
    var LEADERBOARD_KEY = 'cursed_sands_leaderboard';
    var leaderboard = { speedrun: [], survival: [], kills: [] };

    // ============ DAILY CHALLENGE ============
    var dailySeed = 0;
    var dailyModifiers = [];
    var MODIFIER_POOL = [
        { id: 'no_torch', name: 'Blind Faith', desc: 'Torch disabled', icon: '🔦' },
        { id: 'fast_enemies', name: 'Swift Curse', desc: 'Enemies 50% faster', icon: '💨' },
        { id: 'low_sanity', name: 'Fragile Mind', desc: 'Start with 30 sanity', icon: '🧠' },
        { id: 'no_sprint', name: 'Heavy Sands', desc: 'Sprint disabled', icon: '🦶' },
        { id: 'double_enemies', name: 'Legion', desc: '2x enemies', icon: '💀' },
        { id: 'fog', name: 'Desert Fog', desc: 'Dense fog always', icon: '🌫️' },
        { id: 'eclipse', name: 'Eternal Eclipse', desc: 'Permanent eclipse', icon: '🌑' },
        { id: 'glass_cannon', name: 'Glass Cannon', desc: '3x damage dealt & taken', icon: '⚡' }
    ];

    // ============ COSMETICS ============
    var cosmetics = {
        torch_flames: [
            { id: 'default', name: 'Standard', color: 0xff6600, unlocked: true },
            { id: 'blue', name: 'Spirit Flame', color: 0x4488ff, unlocked: false, req: 'Beat Mummy Pharaoh' },
            { id: 'green', name: 'Plague Fire', color: 0x44ff44, unlocked: false, req: 'Beat Anubis' },
            { id: 'purple', name: 'Void Flame', color: 0xaa44ff, unlocked: false, req: 'Beat Apophis' },
            { id: 'white', name: 'Divine Light', color: 0xffffff, unlocked: false, req: 'Complete NG+' }
        ],
        trails: [
            { id: 'none', name: 'None', unlocked: true },
            { id: 'sand', name: 'Sand Trail', unlocked: false, req: 'Survive 10 waves', color: 0xd4a843 },
            { id: 'ankh', name: 'Ankh Sparks', unlocked: false, req: 'Collect 100 tokens', color: 0xffd700 },
            { id: 'shadow', name: 'Shadow Steps', unlocked: false, req: 'Beat all bosses', color: 0x220033 }
        ]
    };
    var activeFlame = 'default', activeTrail = 'none';
    var trailParticles = [];

    // ============ ACHIEVEMENTS ============
    var achievements = {};
    var ACHIEVEMENT_KEY = 'cursed_sands_achievements';

    // ============ BUILD ============
    function build(scene) {
        _scene = scene;
        loadLeaderboard();
        loadAchievements();
        loadCosmetics();

        // Build boss trigger zones (visual markers)
        buildBossTriggers(scene);
    }

    function buildBossTriggers(scene) {
        // Pharaoh trigger — top of Great Pyramid
        var pharaohGate = new THREE.Mesh(new THREE.TorusGeometry(2, 0.15, 8, 16),
            new THREE.MeshStandardMaterial({ color: 0xffd700, emissive: 0xffaa00, emissiveIntensity: 0.5, transparent: true, opacity: 0.6 }));
        pharaohGate.position.set(40, 5, -40); pharaohGate.rotation.x = Math.PI / 2;
        scene.add(pharaohGate);
        bosses.pharaoh.gate = pharaohGate;

        // Anubis trigger — temple entrance
        var anubisGate = new THREE.Mesh(new THREE.TorusGeometry(2, 0.15, 8, 16),
            new THREE.MeshStandardMaterial({ color: 0x6600cc, emissive: 0x4400aa, emissiveIntensity: 0.5, transparent: true, opacity: 0.6 }));
        anubisGate.position.set(70, 2, 30); anubisGate.rotation.x = Math.PI / 2;
        scene.add(anubisGate);
        bosses.anubis.gate = anubisGate;

        // Apophis trigger — underground (River of Dead entrance)
        var apophisGate = new THREE.Mesh(new THREE.TorusGeometry(2, 0.15, 8, 16),
            new THREE.MeshStandardMaterial({ color: 0x00cc44, emissive: 0x008833, emissiveIntensity: 0.5, transparent: true, opacity: 0.6 }));
        apophisGate.position.set(0, -10, 0); apophisGate.rotation.x = Math.PI / 2;
        scene.add(apophisGate);
        bosses.apophis.gate = apophisGate;
    }

    // ============ BOSS MESH BUILDERS ============
    function buildPharaohMesh() {
        var g = new THREE.Group();
        // Body — tall wrapped mummy king
        var bodyMat = new THREE.MeshStandardMaterial({ color: 0xaa8844, roughness: 0.8 });
        var body = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.6, 3.5, 8), bodyMat);
        body.position.y = 1.75; g.add(body);
        // Golden death mask
        var mask = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.8, 0.3),
            new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9, roughness: 0.1 }));
        mask.position.set(0, 3.2, 0.2); g.add(mask);
        // Eyes — glowing red
        var eyeMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 3 });
        var e1 = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), eyeMat);
        e1.position.set(-0.12, 3.3, 0.4); g.add(e1);
        var e2 = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), eyeMat);
        e2.position.set(0.12, 3.3, 0.4); g.add(e2);
        // Crown — Pschent
        var crown = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.8, 8),
            new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.8 }));
        crown.position.set(0, 3.9, 0); g.add(crown);
        // Crook and flail in hands
        var staff = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2),
            new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.7 }));
        staff.position.set(0.6, 1.5, 0); staff.rotation.z = 0.2; g.add(staff);
        var hookCurve = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.03, 6, 8, Math.PI),
            new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.7 }));
        hookCurve.position.set(0.55, 2.55, 0); g.add(hookCurve);
        // Aura light
        var aura = new THREE.PointLight(0xff4400, 1, 15);
        aura.position.set(0, 2, 0); g.add(aura);
        return g;
    }

    function buildAnubisMesh() {
        var g = new THREE.Group();
        // Body — tall dark jackal god
        var bodyMat = new THREE.MeshStandardMaterial({ color: 0x1a0a2e, roughness: 0.5, metalness: 0.4 });
        var torso = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.4, 3, 8), bodyMat);
        torso.position.y = 1.5; g.add(torso);
        // Jackal head
        var headMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.6 });
        var head = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), headMat);
        head.position.set(0, 3.2, 0); head.scale.set(0.8, 1, 1.2); g.add(head);
        // Snout
        var snout = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.6, 6), headMat);
        snout.position.set(0, 3, 0.5); snout.rotation.x = Math.PI / 2; g.add(snout);
        // Pointed ears
        for (var side = -1; side <= 1; side += 2) {
            var ear = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.5, 4), headMat);
            ear.position.set(side * 0.25, 3.7, 0); g.add(ear);
        }
        // Golden collar
        var collar = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.08, 8, 16),
            new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9 }));
        collar.position.set(0, 2.7, 0); collar.rotation.x = Math.PI / 2; g.add(collar);
        // Was-scepter
        var scepter = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.5),
            new THREE.MeshStandardMaterial({ color: 0x6600cc, emissive: 0x4400aa, emissiveIntensity: 0.5 }));
        scepter.position.set(0.7, 1.5, 0); scepter.rotation.z = 0.15; g.add(scepter);
        // Glowing eyes — purple
        var eyeMat = new THREE.MeshStandardMaterial({ color: 0xaa00ff, emissive: 0xaa00ff, emissiveIntensity: 3 });
        g.add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), eyeMat).translateX(-0.15).translateY(3.25).translateZ(0.35));
        g.add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), eyeMat).translateX(0.15).translateY(3.25).translateZ(0.35));
        // Shadow aura
        var aura = new THREE.PointLight(0x6600cc, 1, 15);
        aura.position.set(0, 2, 0); g.add(aura);
        return g;
    }

    function buildApophisMesh() {
        var g = new THREE.Group();
        var serpMat = new THREE.MeshStandardMaterial({ color: 0x224400, roughness: 0.5, metalness: 0.3 });
        // Segmented snake body
        for (var seg = 0; seg < 12; seg++) {
            var radius = seg < 3 ? 0.8 - seg * 0.05 : (seg > 9 ? 0.5 - (seg - 9) * 0.1 : 0.65);
            var segment = new THREE.Mesh(new THREE.SphereGeometry(radius, 8, 8), serpMat);
            segment.position.set(Math.sin(seg * 0.5) * 2, 0.8, -seg * 1.2);
            g.add(segment);
        }
        // Head — angular snake
        var headMat = new THREE.MeshStandardMaterial({ color: 0x113300, roughness: 0.4, metalness: 0.5 });
        var head = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 1.5), headMat);
        head.position.set(0, 1.2, 1); g.add(head);
        // Lower jaw
        var jaw = new THREE.Mesh(new THREE.BoxGeometry(1, 0.2, 1), headMat);
        jaw.position.set(0, 0.7, 1.2); g.add(jaw);
        // Fangs
        var fangMat = new THREE.MeshStandardMaterial({ color: 0xffffcc, roughness: 0.2 });
        var f1 = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.3, 4), fangMat);
        f1.position.set(-0.2, 0.6, 1.6); f1.rotation.z = Math.PI; g.add(f1);
        var f2 = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.3, 4), fangMat);
        f2.position.set(0.2, 0.6, 1.6); f2.rotation.z = Math.PI; g.add(f2);
        // Red eyes
        var eyeMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 3 });
        g.add(new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), eyeMat).translateX(-0.3).translateY(1.4).translateZ(1.4));
        g.add(new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), eyeMat).translateX(0.3).translateY(1.4).translateZ(1.4));
        // Venom glow
        var glow = new THREE.PointLight(0x44ff00, 1, 12);
        glow.position.set(0, 1.5, 1); g.add(glow);
        return g;
    }

    // ============ BOSS ACTIVATION ============
    function checkBossTriggers(px, pz, py) {
        if (activeBoss) return null;
        // Pharaoh — near Great Pyramid peak
        if (!bosses.pharaoh.defeated) {
            var pd = Math.sqrt((px - 40) * (px - 40) + (pz + 40) * (pz + 40));
            if (pd < 5 && py > 3) return startBoss('pharaoh', px, pz);
        }
        // Anubis — near temple
        if (!bosses.anubis.defeated && bosses.pharaoh.defeated) {
            var ad = Math.sqrt((px - 70) * (px - 70) + (pz - 30) * (pz - 30));
            if (ad < 5) return startBoss('anubis', px, pz);
        }
        // Apophis — underground
        if (!bosses.apophis.defeated && bosses.anubis.defeated) {
            var apd = Math.sqrt(px * px + pz * pz);
            if (apd < 5 && py < -5) return startBoss('apophis', px, pz);
        }
        return null;
    }

    function startBoss(id, px, pz) {
        var b = bosses[id]; if (!b) return null;
        b.active = true; b.phase = 1;
        b.hp = b.maxHp * (ngPlus ? ngPlusMultiplier : 1);
        b.attackTimer = 3; b.minions = []; b.shockwaves = [];
        b.clones = []; b.sinkholes = []; b.venomPools = [];
        activeBoss = id;

        // Build mesh
        if (id === 'pharaoh') b.mesh = buildPharaohMesh();
        else if (id === 'anubis') b.mesh = buildAnubisMesh();
        else if (id === 'apophis') b.mesh = buildApophisMesh();

        if (b.mesh) {
            b.mesh.position.set(b.x, 0, b.z);
            _scene.add(b.mesh);
        }

        // Build arena barrier
        var barrierMat = new THREE.MeshStandardMaterial({ color: 0xffd700, emissive: 0xffaa00, emissiveIntensity: 0.3, transparent: true, opacity: 0.15, side: THREE.DoubleSide });
        b.arena = new THREE.Mesh(new THREE.CylinderGeometry(bossArenaRadius, bossArenaRadius, 8, 24, 1, true), barrierMat);
        b.arena.position.set(b.x, 4, b.z);
        _scene.add(b.arena);

        return { type: 'boss_start', name: b.name, id: id };
    }

    // ============ BOSS UPDATE ============
    function updateBoss(dt, px, pz, py) {
        if (!activeBoss) return null;
        var b = bosses[activeBoss];
        if (!b || !b.active) return null;

        var results = { damage: 0, text: null, defeated: false };
        var dx = px - b.x, dz = pz - b.z;
        var dist = Math.sqrt(dx * dx + dz * dz);

        // Update phase based on HP
        var hpPct = b.hp / (b.maxHp * (ngPlus ? ngPlusMultiplier : 1));
        var newPhase = hpPct > 0.66 ? 1 : (hpPct > 0.33 ? 2 : 3);
        if (newPhase !== b.phase) {
            b.phase = newPhase;
            results.text = b.name + ' — Phase ' + b.phase + '!';
        }

        b.attackTimer -= dt;

        if (activeBoss === 'pharaoh') {
            results = updatePharaoh(b, dt, px, pz, dist, results);
        } else if (activeBoss === 'anubis') {
            results = updateAnubis(b, dt, px, pz, dist, results);
        } else if (activeBoss === 'apophis') {
            results = updateApophis(b, dt, px, pz, dist, results);
        }

        // Update mesh position
        if (b.mesh) {
            b.mesh.position.set(b.x, b.mesh.position.y, b.z);
            b.mesh.lookAt(px, b.mesh.position.y, pz);
        }
        // Arena pulse
        if (b.arena) b.arena.material.opacity = 0.1 + Math.sin(Date.now() * 0.003) * 0.05;

        // Check death
        if (b.hp <= 0) {
            results.defeated = true;
            results.text = b.name + ' DEFEATED!';
            defeatBoss(activeBoss);
        }

        return results;
    }

    // ---- PHARAOH AI ----
    function updatePharaoh(b, dt, px, pz, dist, results) {
        // Move toward player slowly
        if (dist > 3) {
            var spd = (b.phase >= 2 ? 3 : 2) * dt;
            b.x += ((px - b.x) / dist) * spd;
            b.z += ((pz - b.z) / dist) * spd;
        }
        // Phase 1: Melee + summon mummies
        if (b.phase === 1) {
            if (b.attackTimer <= 0 && dist < 4) {
                results.damage = 20; b.attackTimer = 2;
            }
            b.summonTimer = (b.summonTimer || 8) - dt;
            if (b.summonTimer <= 0) {
                b.summonTimer = 10;
                results.summon = { type: 'mummy', count: 2 };
            }
        }
        // Phase 2: Curse aura (DOT in range)
        if (b.phase >= 2) {
            if (dist < 8) results.damage += 5 * dt;
            // Shockwave attack
            if (b.attackTimer <= 0) {
                b.attackTimer = 3;
                var wave = new THREE.Mesh(new THREE.RingGeometry(0.5, 1, 16),
                    new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 1, transparent: true, opacity: 0.6, side: THREE.DoubleSide }));
                wave.rotation.x = -Math.PI / 2;
                wave.position.set(b.x, 0.3, b.z);
                if (_scene) _scene.add(wave);
                b.shockwaves.push({ mesh: wave, radius: 1, maxRadius: 15, speed: 12 });
            }
        }
        // Phase 3: Arena ground collapses (damage zones)
        if (b.phase === 3 && b.attackTimer <= 0) {
            b.attackTimer = 2;
            results.summon = { type: 'mummy', count: 3 };
        }
        // Update shockwaves
        for (var si = b.shockwaves.length - 1; si >= 0; si--) {
            var sw = b.shockwaves[si];
            sw.radius += sw.speed * dt;
            if (sw.mesh) {
                sw.mesh.scale.set(sw.radius, sw.radius, 1);
                sw.mesh.material.opacity = Math.max(0, 0.6 - sw.radius / sw.maxRadius);
            }
            // Check player hit
            var pdist = Math.sqrt((px - b.x) * (px - b.x) + (pz - b.z) * (pz - b.z));
            if (Math.abs(pdist - sw.radius) < 1.5) results.damage += 10;
            if (sw.radius >= sw.maxRadius) {
                if (sw.mesh) _scene.remove(sw.mesh);
                b.shockwaves.splice(si, 1);
            }
        }
        return results;
    }

    // ---- ANUBIS AI ----
    function updateAnubis(b, dt, px, pz, dist, results) {
        b.teleportTimer = (b.teleportTimer || 5) - dt;
        // Phase 1: Melee + occasional dash
        if (b.phase === 1) {
            if (dist > 3) {
                var spd = 4 * dt;
                b.x += ((px - b.x) / dist) * spd; b.z += ((pz - b.z) / dist) * spd;
            }
            if (b.attackTimer <= 0 && dist < 3) {
                results.damage = 25; b.attackTimer = 1.5;
            }
        }
        // Phase 2: Teleportation + shadow clones
        if (b.phase >= 2) {
            if (b.teleportTimer <= 0) {
                b.teleportTimer = 4 + Math.random() * 3;
                var angle = Math.random() * Math.PI * 2;
                b.x = px + Math.cos(angle) * 8; b.z = pz + Math.sin(angle) * 8;
                if (b.mesh) b.mesh.position.set(b.x, 0, b.z);
                // Spawn clone
                if (b.clones.length < 3) {
                    var ca = Math.random() * Math.PI * 2;
                    var cx = px + Math.cos(ca) * 6, cz = pz + Math.sin(ca) * 6;
                    var clone = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.3, 2.5, 6),
                        new THREE.MeshStandardMaterial({ color: 0x1a0a2e, transparent: true, opacity: 0.5 }));
                    clone.position.set(cx, 1.25, cz); if (_scene) _scene.add(clone);
                    b.clones.push({ mesh: clone, x: cx, z: cz, hp: 50, life: 12 });
                }
            }
            // Chase
            if (dist > 2) {
                var spd = 5 * dt;
                b.x += ((px - b.x) / dist) * spd; b.z += ((pz - b.z) / dist) * spd;
            }
            if (b.attackTimer <= 0 && dist < 3) {
                results.damage = 30; b.attackTimer = 1.2;
            }
        }
        // Phase 3: Weighing of the heart — sanity drain aura
        if (b.phase === 3) {
            if (dist < 12) results.sanityDrain = 8 * dt;
            // Soul beam attack
            b.soulTimer = (b.soulTimer || 6) - dt;
            if (b.soulTimer <= 0) {
                b.soulTimer = 5;
                results.damage += 15;
                results.text = results.text || '⚖️ Your heart is being weighed...';
            }
        }
        // Update clones
        for (var ci = b.clones.length - 1; ci >= 0; ci--) {
            var cl = b.clones[ci];
            cl.life -= dt;
            // Chase player
            var cdx = px - cl.x, cdz = pz - cl.z;
            var cd = Math.sqrt(cdx * cdx + cdz * cdz);
            if (cd > 1.5) { cl.x += (cdx / cd) * 3 * dt; cl.z += (cdz / cd) * 3 * dt; }
            if (cd < 2) results.damage += 8 * dt;
            if (cl.mesh) cl.mesh.position.set(cl.x, 1.25, cl.z);
            if (cl.life <= 0 || cl.hp <= 0) {
                if (cl.mesh) _scene.remove(cl.mesh);
                b.clones.splice(ci, 1);
            }
        }
        return results;
    }

    // ---- APOPHIS AI ----
    function updateApophis(b, dt, px, pz, dist, results) {
        b.burrowTimer = (b.burrowTimer || 6) - dt;

        if (b.burrowed) {
            b.burrowTimer -= dt;
            if (b.burrowTimer <= 0) {
                // Emerge with sinkhole
                var angle = Math.random() * Math.PI * 2;
                b.x = px + Math.cos(angle) * 6; b.z = pz + Math.sin(angle) * 6;
                b.burrowed = false;
                if (b.mesh) { b.mesh.visible = true; b.mesh.position.set(b.x, 0, b.z); }
                // Create sinkhole at emergence
                var sh = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 0.3, 12),
                    new THREE.MeshStandardMaterial({ color: 0x332200, transparent: true, opacity: 0.5 }));
                sh.position.set(b.x, -0.1, b.z); if (_scene) _scene.add(sh);
                b.sinkholes.push({ mesh: sh, x: b.x, z: b.z, life: 10, radius: 3 });
                results.damage += 20; // emergence attack
            }
            return results;
        }

        // Surface AI
        if (b.phase === 1) {
            // Slither toward player
            if (dist > 3) {
                var spd = 3.5 * dt;
                b.x += ((px - b.x) / dist) * spd; b.z += ((pz - b.z) / dist) * spd;
            }
            if (b.attackTimer <= 0 && dist < 4) {
                results.damage = 25; b.attackTimer = 2;
            }
        }
        // Phase 2: Burrow attacks
        if (b.phase >= 2 && b.burrowTimer <= 0) {
            b.burrowed = true; b.burrowTimer = 3 + Math.random() * 2;
            if (b.mesh) b.mesh.visible = false;
        }
        if (b.phase >= 2 && !b.burrowed) {
            // Faster movement
            if (dist > 2) {
                var spd = 5 * dt;
                b.x += ((px - b.x) / dist) * spd; b.z += ((pz - b.z) / dist) * spd;
            }
            if (b.attackTimer <= 0 && dist < 4) {
                results.damage = 30; b.attackTimer = 1.5;
            }
        }
        // Phase 3: Venom rain
        if (b.phase === 3) {
            b.attackTimer -= dt;
            if (b.attackTimer <= 0) {
                b.attackTimer = 2;
                // Spawn venom pool
                var vx = px + (Math.random() - 0.5) * 10, vz = pz + (Math.random() - 0.5) * 10;
                var vp = new THREE.Mesh(new THREE.CircleGeometry(2, 8),
                    new THREE.MeshStandardMaterial({ color: 0x44ff00, emissive: 0x22aa00, emissiveIntensity: 0.8, transparent: true, opacity: 0.5, side: THREE.DoubleSide }));
                vp.rotation.x = -Math.PI / 2; vp.position.set(vx, 0.05, vz);
                if (_scene) _scene.add(vp);
                b.venomPools.push({ mesh: vp, x: vx, z: vz, life: 8, radius: 2 });
            }
        }
        // Sinkholes pull player
        for (var si = b.sinkholes.length - 1; si >= 0; si--) {
            var sk = b.sinkholes[si];
            sk.life -= dt;
            var sdx = px - sk.x, sdz = pz - sk.z;
            if (Math.sqrt(sdx * sdx + sdz * sdz) < sk.radius) results.damage += 5 * dt;
            if (sk.life <= 0) { if (sk.mesh) _scene.remove(sk.mesh); b.sinkholes.splice(si, 1); }
        }
        // Venom pools damage
        for (var vi = b.venomPools.length - 1; vi >= 0; vi--) {
            var vp = b.venomPools[vi];
            vp.life -= dt;
            var vdx = px - vp.x, vdz = pz - vp.z;
            if (Math.sqrt(vdx * vdx + vdz * vdz) < vp.radius) results.damage += 8 * dt;
            if (vp.mesh) vp.mesh.material.opacity = Math.min(0.5, vp.life * 0.1);
            if (vp.life <= 0) { if (vp.mesh) _scene.remove(vp.mesh); b.venomPools.splice(vi, 1); }
        }
        return results;
    }

    // ============ BOSS DAMAGE ============
    function damageBoss(dmg) {
        if (!activeBoss) return false;
        var b = bosses[activeBoss];
        b.hp -= dmg;
        return b.hp <= 0;
    }
    function damageBossClone(dmg, px, pz) {
        if (!activeBoss || activeBoss !== 'anubis') return;
        var b = bosses.anubis;
        b.clones.forEach(function (cl) {
            var d = Math.sqrt((px - cl.x) * (px - cl.x) + (pz - cl.z) * (pz - cl.z));
            if (d < 2) cl.hp -= dmg;
        });
    }

    function defeatBoss(id) {
        var b = bosses[id];
        b.active = false; b.defeated = true; activeBoss = null;
        if (b.mesh) _scene.remove(b.mesh);
        if (b.arena) _scene.remove(b.arena);
        // Clean up effects
        (b.shockwaves || []).forEach(function (s) { if (s.mesh) _scene.remove(s.mesh); });
        (b.clones || []).forEach(function (c) { if (c.mesh) _scene.remove(c.mesh); });
        (b.sinkholes || []).forEach(function (s) { if (s.mesh) _scene.remove(s.mesh); });
        (b.venomPools || []).forEach(function (v) { if (v.mesh) _scene.remove(v.mesh); });
        b.shockwaves = []; b.clones = []; b.sinkholes = []; b.venomPools = [];
        // Unlock cosmetics
        if (id === 'pharaoh') unlockCosmetic('torch_flames', 'blue');
        if (id === 'anubis') unlockCosmetic('torch_flames', 'green');
        if (id === 'apophis') unlockCosmetic('torch_flames', 'purple');
        if (bosses.pharaoh.defeated && bosses.anubis.defeated && bosses.apophis.defeated) unlockCosmetic('trails', 'shadow');
        saveAchievements();
    }

    // ============ SURVIVAL MODE ============
    function startSurvival() {
        gameMode = 'survival'; survivalMode = true;
        survivalWave = 0; survivalTimer = 0; survivalKills = 0;
        survivalSpawnTimer = WAVE_INTERVAL;
    }

    function updateSurvival(dt) {
        if (!survivalMode) return null;
        survivalSpawnTimer -= dt;
        survivalTimer += dt;
        if (survivalSpawnTimer <= 0) {
            survivalWave++;
            survivalSpawnTimer = WAVE_INTERVAL;
            var mummyCount = survivalWave * 2;
            var anubisCount = Math.max(0, survivalWave - 1);
            return { type: 'wave', wave: survivalWave, mummies: mummyCount, anubis: anubisCount };
        }
        return null;
    }

    function survivalKill() { survivalKills++; }

    function endSurvival() {
        if (!survivalMode) return;
        var score = survivalWave * 100 + survivalKills * 10;
        addLeaderboardEntry('survival', { waves: survivalWave, kills: survivalKills, time: Math.floor(survivalTimer), score: score, date: new Date().toLocaleDateString() });
        if (survivalWave >= 10) unlockCosmetic('trails', 'sand');
        survivalMode = false;
    }

    // ============ NEW GAME+ ============
    function enableNGPlus() { ngPlus = true; unlockCosmetic('torch_flames', 'white'); saveAchievements(); }
    function isNGPlus() { return ngPlus; }
    function getNGMultiplier() { return ngPlus ? ngPlusMultiplier : 1; }

    // ============ DAILY CHALLENGE ============
    function startDaily() {
        gameMode = 'daily';
        var today = new Date();
        dailySeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
        // Seeded random
        var rng = seedRandom(dailySeed);
        var modCount = 2 + Math.floor(rng() * 2);
        dailyModifiers = [];
        var pool = MODIFIER_POOL.slice();
        for (var i = 0; i < modCount && pool.length > 0; i++) {
            var idx = Math.floor(rng() * pool.length);
            dailyModifiers.push(pool[idx]);
            pool.splice(idx, 1);
        }
    }

    function seedRandom(seed) {
        var s = seed;
        return function () {
            s = (s * 1103515245 + 12345) & 0x7fffffff;
            return s / 0x7fffffff;
        };
    }

    function getDailyArtifactPositions() {
        var rng = seedRandom(dailySeed + 777);
        var positions = [];
        for (var i = 0; i < 7; i++) {
            positions.push({ x: (rng() - 0.5) * 160, z: (rng() - 0.5) * 160 });
        }
        return positions;
    }

    function getDailyModifiers() { return dailyModifiers; }

    function endDaily(time, collected) {
        addLeaderboardEntry('speedrun', { time: Math.floor(time), collected: collected, date: new Date().toLocaleDateString(), modifiers: dailyModifiers.map(function (m) { return m.id; }).join(',') });
    }

    // ============ LEADERBOARD ============
    function loadLeaderboard() {
        try {
            var data = localStorage.getItem(LEADERBOARD_KEY);
            if (data) leaderboard = JSON.parse(data);
        } catch (e) { }
    }

    function saveLeaderboard() {
        try { localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(leaderboard)); } catch (e) { }
    }

    function addLeaderboardEntry(category, entry) {
        if (!leaderboard[category]) leaderboard[category] = [];
        leaderboard[category].push(entry);
        // Sort and cap at 10
        if (category === 'speedrun') leaderboard[category].sort(function (a, b) { return a.time - b.time; });
        else if (category === 'survival') leaderboard[category].sort(function (a, b) { return b.score - a.score; });
        else leaderboard[category].sort(function (a, b) { return b.kills - a.kills; });
        leaderboard[category] = leaderboard[category].slice(0, 10);
        saveLeaderboard();
    }

    function addKillEntry(kills, time) {
        addLeaderboardEntry('kills', { kills: kills, time: Math.floor(time), date: new Date().toLocaleDateString() });
    }

    // ============ COSMETICS ============
    function unlockCosmetic(category, id) {
        var list = cosmetics[category];
        if (!list) return;
        list.forEach(function (c) { if (c.id === id) c.unlocked = true; });
        saveAchievements();
    }
    function setFlame(id) { activeFlame = id; saveAchievements(); }
    function setTrail(id) { activeTrail = id; saveAchievements(); }
    function getFlameColor() {
        var f = cosmetics.torch_flames.find(function (c) { return c.id === activeFlame; });
        return f ? f.color : 0xff6600;
    }

    function updateTrail(dt, px, pz) {
        if (activeTrail === 'none') return;
        var trail = cosmetics.trails.find(function (t) { return t.id === activeTrail; });
        if (!trail || !trail.unlocked) return;
        // Spawn particle every few frames
        if (Math.random() < 0.3) {
            var p = new THREE.Mesh(new THREE.SphereGeometry(0.05, 4, 4),
                new THREE.MeshStandardMaterial({ color: trail.color, emissive: trail.color, emissiveIntensity: 0.5, transparent: true, opacity: 0.6 }));
            p.position.set(px + (Math.random() - 0.5) * 0.3, 0.1, pz + (Math.random() - 0.5) * 0.3);
            if (_scene) _scene.add(p);
            trailParticles.push({ mesh: p, life: 1.5 });
        }
        for (var i = trailParticles.length - 1; i >= 0; i--) {
            trailParticles[i].life -= dt;
            if (trailParticles[i].mesh) trailParticles[i].mesh.material.opacity = trailParticles[i].life * 0.4;
            if (trailParticles[i].life <= 0) {
                if (trailParticles[i].mesh) _scene.remove(trailParticles[i].mesh);
                trailParticles.splice(i, 1);
            }
        }
    }

    // ============ ACHIEVEMENTS ============
    function loadAchievements() {
        try {
            var data = localStorage.getItem(ACHIEVEMENT_KEY);
            if (data) {
                var saved = JSON.parse(data);
                if (saved.cosmetics) {
                    Object.keys(saved.cosmetics).forEach(function (cat) {
                        if (cosmetics[cat]) {
                            saved.cosmetics[cat].forEach(function (sid) {
                                cosmetics[cat].forEach(function (c) { if (c.id === sid) c.unlocked = true; });
                            });
                        }
                    });
                }
                if (saved.activeFlame) activeFlame = saved.activeFlame;
                if (saved.activeTrail) activeTrail = saved.activeTrail;
                if (saved.bosses) {
                    Object.keys(saved.bosses).forEach(function (k) {
                        if (bosses[k]) bosses[k].defeated = saved.bosses[k];
                    });
                }
                if (saved.ngPlus) ngPlus = saved.ngPlus;
            }
        } catch (e) { }
    }

    function saveAchievements() {
        try {
            var data = { cosmetics: {}, activeFlame: activeFlame, activeTrail: activeTrail, bosses: {}, ngPlus: ngPlus };
            Object.keys(cosmetics).forEach(function (cat) {
                data.cosmetics[cat] = cosmetics[cat].filter(function (c) { return c.unlocked; }).map(function (c) { return c.id; });
            });
            Object.keys(bosses).forEach(function (k) { data.bosses[k] = bosses[k].defeated; });
            localStorage.setItem(ACHIEVEMENT_KEY, JSON.stringify(data));
        } catch (e) { }
    }
    function loadCosmetics() { /* loaded in loadAchievements */ }

    // ============ RENDER HELPERS ============
    function renderLeaderboard() {
        var el = document.getElementById('leaderboard-content');
        if (!el) return;
        var html = '';
        ['speedrun', 'survival', 'kills'].forEach(function (cat) {
            var title = cat === 'speedrun' ? '⏱️ Speedrun' : cat === 'survival' ? '🏰 Survival' : '💀 Most Kills';
            html += '<h3 style="color:#ffd700;margin:12px 0 6px">' + title + '</h3>';
            if (!leaderboard[cat] || leaderboard[cat].length === 0) {
                html += '<p style="color:#666;font-size:13px">No entries yet</p>';
            } else {
                html += '<table style="width:100%;border-collapse:collapse;font-size:12px;color:#bba870">';
                html += '<tr><th>#</th><th>Score</th><th>Date</th></tr>';
                leaderboard[cat].forEach(function (e, i) {
                    var score = cat === 'speedrun' ? e.time + 's' : cat === 'survival' ? e.score : e.kills;
                    html += '<tr><td>' + (i + 1) + '</td><td>' + score + '</td><td>' + (e.date || '-') + '</td></tr>';
                });
                html += '</table>';
            }
        });
        el.innerHTML = html;
    }

    function renderCosmetics() {
        var el = document.getElementById('cosmetic-content');
        if (!el) return;
        var html = '<h3 style="color:#ffd700;margin-bottom:10px">🔥 Torch Flame</h3><div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">';
        cosmetics.torch_flames.forEach(function (f) {
            var sel = activeFlame === f.id ? 'border-color:#ffd700;' : '';
            var lock = f.unlocked ? '' : 'opacity:0.3;pointer-events:none;';
            html += '<div class="cosmetic-item" data-type="flame" data-id="' + f.id + '" style="' + sel + lock + 'padding:8px 14px;background:rgba(255,215,0,0.06);border:2px solid rgba(255,215,0,0.2);border-radius:8px;cursor:pointer;text-align:center;font-size:12px;color:#ddc080">';
            html += '<div style="width:20px;height:20px;background:#' + f.color.toString(16).padStart(6, '0') + ';border-radius:50%;margin:0 auto 4px"></div>';
            html += f.name + (f.unlocked ? '' : '<br><span style="font-size:10px;color:#888">' + f.req + '</span>') + '</div>';
        });
        html += '</div><h3 style="color:#ffd700;margin-bottom:10px">👣 Trail Effect</h3><div style="display:flex;gap:8px;flex-wrap:wrap">';
        cosmetics.trails.forEach(function (t) {
            var sel = activeTrail === t.id ? 'border-color:#ffd700;' : '';
            var lock = t.unlocked ? '' : 'opacity:0.3;pointer-events:none;';
            html += '<div class="cosmetic-item" data-type="trail" data-id="' + t.id + '" style="' + sel + lock + 'padding:8px 14px;background:rgba(255,215,0,0.06);border:2px solid rgba(255,215,0,0.2);border-radius:8px;cursor:pointer;text-align:center;font-size:12px;color:#ddc080">';
            html += t.name + (t.unlocked ? '' : '<br><span style="font-size:10px;color:#888">' + t.req + '</span>') + '</div>';
        });
        html += '</div>';
        el.innerHTML = html;
        // Bind clicks
        el.querySelectorAll('.cosmetic-item').forEach(function (item) {
            item.onclick = function () {
                if (item.dataset.type === 'flame') setFlame(item.dataset.id);
                else if (item.dataset.type === 'trail') setTrail(item.dataset.id);
                renderCosmetics();
            };
        });
    }

    function renderDailyInfo() {
        var el = document.getElementById('daily-mods');
        if (!el) return;
        var html = '<h4 style="color:#ffd700;margin-bottom:8px">Today\'s Modifiers</h4>';
        dailyModifiers.forEach(function (m) {
            html += '<div style="display:inline-block;padding:4px 10px;margin:2px;background:rgba(255,100,0,0.1);border:1px solid rgba(255,100,0,0.3);border-radius:6px;font-size:12px;color:#ffaa66">' + m.icon + ' ' + m.name + ': ' + m.desc + '</div>';
        });
        el.innerHTML = html;
    }

    // ============ RESET ============
    function reset() {
        activeBoss = null; survivalMode = false; survivalWave = 0; survivalKills = 0;
        gameMode = 'story'; dailyModifiers = [];
        Object.keys(bosses).forEach(function (k) {
            var b = bosses[k];
            b.active = false; b.hp = 0; b.phase = 0;
            if (b.mesh) { try { _scene.remove(b.mesh); } catch (e) { } b.mesh = null; }
            if (b.arena) { try { _scene.remove(b.arena); } catch (e) { } b.arena = null; }
            b.minions = []; b.shockwaves = []; b.clones = []; b.sinkholes = []; b.venomPools = [];
        });
        trailParticles.forEach(function (p) { if (p.mesh) _scene.remove(p.mesh); });
        trailParticles = [];
    }

    return {
        build: build, reset: reset,
        checkBossTriggers: checkBossTriggers, updateBoss: updateBoss,
        damageBoss: damageBoss, damageBossClone: damageBossClone,
        getActiveBoss: function () { return activeBoss; },
        getBossHP: function () { return activeBoss ? { hp: bosses[activeBoss].hp, max: bosses[activeBoss].maxHp * (ngPlus ? ngPlusMultiplier : 1), name: bosses[activeBoss].name, phase: bosses[activeBoss].phase } : null; },
        isBossActive: function () { return !!activeBoss; },
        // Survival
        startSurvival: startSurvival, updateSurvival: updateSurvival,
        survivalKill: survivalKill, endSurvival: endSurvival,
        getSurvivalInfo: function () { return { wave: survivalWave, kills: survivalKills, time: Math.floor(survivalTimer) }; },
        isSurvival: function () { return survivalMode; },
        // NG+
        enableNGPlus: enableNGPlus, isNGPlus: isNGPlus, getNGMultiplier: getNGMultiplier,
        // Daily
        startDaily: startDaily, getDailyModifiers: getDailyModifiers,
        getDailyArtifactPositions: getDailyArtifactPositions, endDaily: endDaily,
        // Leaderboard
        addKillEntry: addKillEntry, renderLeaderboard: renderLeaderboard,
        // Cosmetics
        getFlameColor: getFlameColor, updateTrail: updateTrail,
        renderCosmetics: renderCosmetics, renderDailyInfo: renderDailyInfo,
        getCosmetics: function () { return cosmetics; },
        // Mode
        getMode: function () { return gameMode; },
        setMode: function (m) { gameMode = m; },
    };
})();

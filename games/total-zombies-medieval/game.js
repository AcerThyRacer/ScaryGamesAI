/* Total Zombies Medieval — Enhanced 3D Total War RTS */
(function () {
    'use strict';
    var scene, camera, renderer, clock, ground, raycaster, groundPlane;
    var gameActive = false, initialized = false, setupPhase = false;
    var territoryLine = null, territoryZone = null, TERRITORY_Z = -5;
    var MAP_SIZE = 120, HALF = 60;
    var camTarget = { x: 0, z: 0 }, camDist = 40, camAngle = 0, camPitch = Math.PI / 3.2;
    var keys = {}, mouseScreen = { x: 0, y: 0 };
    var blueUnits = [], redUnits = [], allUnits = [], selectedUnits = [], controlGroups = {};
    var currentFormation = 'line', selBox, selStart, isDragging = false;
    var rightDown = false, rightStart = null, rightStartWorld = null, rightDragging = false;
    var previewDots = [];
    var killCount = 0, totalKills = 0, blueMorale = 100;
    var minimapCtx, minimapCanvas, obstacles = [], arrows = [], particles = [];
    var middleDown = false, midStart = { x: 0, y: 0 }, midAngleStart = 0, midPitchStart = 0;
    var currentSquadIdx = 0, currentLevel = 0;
    var capturePoints = [], capturePointMeshes = [];
    var gameTime = 0;

    // === UNIT ===
    function Unit(team, type, x, z) {
        this.team = team; this.type = type; this.x = x; this.z = z; this.y = 0;
        this.tx = x; this.tz = z; this.facing = team === 'blue' ? 0 : Math.PI;
        this.targetFacing = this.facing;
        this.hp = type === 'cavalry' ? 140 : type === 'archers' ? 80 : 100;
        this.maxHp = this.hp;
        this.atk = type === 'cavalry' ? 20 : type === 'archers' ? 10 : 14;
        this.range = type === 'archers' ? 14 : 1.8;
        this.speed = type === 'cavalry' ? 7 : type === 'archers' ? 3 : 3.8;
        this.atkCooldown = type === 'archers' ? 1.6 : 0.9;
        this.atkTimer = Math.random() * 0.5;
        this.state = 'idle'; this.target = null; this.selected = false; this.dead = false;
        this.morale = 100; this.mesh = null; this.hpBar = null; this.selRing = null;
        this.deathTimer = 0; this.squadId = -1; this.guarding = false;
        // Animation state
        this.animPhase = 0; this.swingAngle = 0; this.bobPhase = Math.random() * 6.28;
        this.weaponPivot = null; this.bodyMesh = null;
        // Arms
        this.rightArm = null; this.leftArm = null; this.guardIcon = null;
    }

    function createUnitMesh(u) {
        var isBlue = u.team === 'blue';
        var c = isBlue ? 0x3366cc : 0xcc3333;
        var dc = isBlue ? 0x224488 : 0x882222;
        var skinColor = isBlue ? 0xddbb99 : 0x557755;
        // Armor materials for blue
        var steelMat = new THREE.MeshStandardMaterial({ color: 0x888899, roughness: 0.25, metalness: 0.85 });
        var chainMat = new THREE.MeshStandardMaterial({ color: 0x777788, roughness: 0.35, metalness: 0.7 });
        var leatherMat = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.75, metalness: 0.05 });
        var g = new THREE.Group();
        // Legs — armored greaves for blue
        var legMat = isBlue ? chainMat : new THREE.MeshStandardMaterial({ color: dc, roughness: 0.8 });
        var lleg = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.5, 0.15), legMat);
        lleg.position.set(-0.1, 0.25, 0); g.add(lleg);
        var rleg = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.5, 0.15), legMat);
        rleg.position.set(0.1, 0.25, 0); g.add(rleg);
        if (isBlue) { // Knee guards
            var kMat = steelMat;
            var lk = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.12, 0.08), kMat); lk.position.set(-0.1, 0.45, 0.07); g.add(lk);
            var rk = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.12, 0.08), kMat); rk.position.set(0.1, 0.45, 0.07); g.add(rk);
        }
        // Body (torso) — plate armor for blue swordsmen/cavalry, leather for archers
        var bodyMat;
        if (isBlue) bodyMat = (u.type === 'archers') ? leatherMat : steelMat;
        else bodyMat = new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, metalness: 0.1 });
        var body = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.55, 0.3), bodyMat);
        body.position.y = 0.78; body.castShadow = true; g.add(body); u.bodyMesh = body;
        // Chest plate detail for blue melee
        if (isBlue && u.type !== 'archers') {
            var crest = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.02),
                new THREE.MeshStandardMaterial({ color: 0x2244aa, metalness: 0.4, roughness: 0.3 }));
            crest.position.set(0, 0.82, 0.16); g.add(crest);
        }
        // Shoulder pauldrons for blue
        if (isBlue) {
            var pMat = u.type === 'archers' ? leatherMat : steelMat;
            var lp = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), pMat); lp.position.set(-0.28, 1.0, 0); g.add(lp);
            var rp = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), pMat); rp.position.set(0.28, 1.0, 0); g.add(rp);
        }
        // Head
        var head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8),
            new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.7 }));
        head.position.y = 1.25; head.castShadow = true; g.add(head);
        // Helmet for blue, eyes for red
        if (isBlue) {
            if (u.type === 'swordsmen') {
                // Great helm
                var helm = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.32, 0.32), steelMat);
                helm.position.y = 1.3; g.add(helm);
                // Visor slit
                var slit = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.03, 0.02),
                    new THREE.MeshBasicMaterial({ color: 0x111111 }));
                slit.position.set(0, 1.3, 0.17); g.add(slit);
                // Helm top ridge
                var ridge = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.32), steelMat);
                ridge.position.set(0, 1.48, 0); g.add(ridge);
            } else if (u.type === 'archers') {
                // Leather cap
                var cap = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), leatherMat);
                cap.position.y = 1.32; g.add(cap);
            } else {
                // Cavalry helm with plume
                var cHelm = new THREE.Mesh(new THREE.SphereGeometry(0.21, 8, 8), steelMat);
                cHelm.position.y = 1.28; g.add(cHelm);
                var visor = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 0.02),
                    new THREE.MeshBasicMaterial({ color: 0x111111 }));
                visor.position.set(0, 1.28, 0.2); g.add(visor);
                var plume = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.2, 0.25),
                    new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.9 }));
                plume.position.set(0, 1.48, -0.05); g.add(plume);
            }
        } else {
            var eyeM = new THREE.MeshBasicMaterial({ color: 0xff0000 });
            var le = new THREE.Mesh(new THREE.SphereGeometry(0.03, 4, 4), eyeM);
            le.position.set(-0.06, 1.28, 0.15); g.add(le);
            var re = new THREE.Mesh(new THREE.SphereGeometry(0.03, 4, 4), eyeM);
            re.position.set(0.06, 1.28, 0.15); g.add(re);
        }
        // Arms — armored for blue
        var armMat = isBlue ? (u.type === 'archers' ? leatherMat : chainMat) : new THREE.MeshStandardMaterial({ color: c, roughness: 0.7 });
        var la = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, 0.12), armMat);
        la.position.set(-0.3, 0.78, 0); g.add(la); u.leftArm = la;
        var ra = new THREE.Group();
        var raMesh = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, 0.12), armMat);
        ra.add(raMesh); ra.position.set(0.3, 0.78, 0); g.add(ra); u.rightArm = ra;
        // Gauntlets for blue melee
        if (isBlue && u.type !== 'archers') {
            var gMat = steelMat;
            var lg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.14), gMat); lg.position.set(0, -0.22, 0); la.add(lg);
        }
        // Weapon on right arm pivot
        if (u.type === 'swordsmen') {
            var sword = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.9, 0.03),
                new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9, roughness: 0.15 }));
            sword.position.y = 0.55; ra.add(sword); u.weaponPivot = ra;
            // Sword crossguard
            var xguard = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.04, 0.04),
                new THREE.MeshStandardMaterial({ color: 0xaa8833, metalness: 0.6 }));
            xguard.position.y = 0.1; ra.add(xguard);
            // Shield on left arm — big kite shield for blue, small for red
            var shieldW = isBlue ? 0.06 : 0.04, shieldH = isBlue ? 0.6 : 0.45, shieldD = isBlue ? 0.4 : 0.35;
            var shield = new THREE.Mesh(new THREE.BoxGeometry(shieldW, shieldH, shieldD),
                new THREE.MeshStandardMaterial({ color: dc, roughness: 0.35, metalness: isBlue ? 0.4 : 0.3 }));
            shield.position.set(0, 0.05, 0.18); la.add(shield);
            // Shield emblem for blue
            if (isBlue) {
                var emblem = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.15, 0.15),
                    new THREE.MeshStandardMaterial({ color: 0xffcc00, metalness: 0.5, roughness: 0.3 }));
                emblem.position.set(0.035, 0.05, 0.18); la.add(emblem);
            }
        } else if (u.type === 'archers') {
            var bow = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.02, 4, 10, Math.PI),
                new THREE.MeshStandardMaterial({ color: 0x664422 }));
            bow.position.set(0, 0.3, 0.1); bow.rotation.z = Math.PI / 2; ra.add(bow); u.weaponPivot = ra;
            // Quiver on back for blue
            if (isBlue) {
                var quiver = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.5),
                    new THREE.MeshStandardMaterial({ color: 0x553311, roughness: 0.8 }));
                quiver.position.set(0.1, 0.85, -0.18); quiver.rotation.x = 0.15; g.add(quiver);
            }
        } else {
            // Cavalry mount
            var hCol = isBlue ? 0x443322 : 0x554433;
            var hMat = new THREE.MeshStandardMaterial({ color: hCol, roughness: 0.85 });
            var hBody = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.6, 1.1), hMat);
            hBody.position.set(0, -0.1, 0); g.add(hBody);
            // Barding (horse armor) for blue
            if (isBlue) {
                var bard = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.3, 1.15),
                    new THREE.MeshStandardMaterial({ color: 0x2244aa, roughness: 0.5, metalness: 0.3 }));
                bard.position.set(0, 0.1, 0); g.add(bard);
            }
            var hHead2 = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.35), hMat);
            hHead2.position.set(0, 0.1, -0.65); g.add(hHead2);
            // Horse head armor for blue
            if (isBlue) {
                var hArmor = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.15, 0.2), steelMat);
                hArmor.position.set(0, 0.2, -0.7); g.add(hArmor);
            }
            for (var li = 0; li < 4; li++) {
                var hl = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.4, 0.08), hMat);
                hl.position.set((li % 2 === 0 ? -0.2 : 0.2), -0.5, (li < 2 ? -0.35 : 0.35)); g.add(hl);
            }
            var lance = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.2),
                new THREE.MeshStandardMaterial({ color: 0x886644 }));
            lance.position.set(0, 0.5, -0.5); lance.rotation.x = -0.25; ra.add(lance); u.weaponPivot = ra;
        }
        // Guard mode icon (shield emoji sprite — shown as a floating marker)
        var guardMark = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6),
            new THREE.MeshBasicMaterial({ color: 0x44aaff, transparent: true, opacity: 0.8 }));
        guardMark.position.y = 1.7; guardMark.visible = false; g.add(guardMark); u.guardIcon = guardMark;
        // HP bar
        var hpBg = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.08),
            new THREE.MeshBasicMaterial({ color: 0x333333, side: THREE.DoubleSide, depthTest: false }));
        var hpFill = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.06),
            new THREE.MeshBasicMaterial({ color: u.team === 'blue' ? 0x44aaff : 0xff4444, side: THREE.DoubleSide, depthTest: false }));
        var hpY = u.type === 'cavalry' ? 1.8 : 1.55;
        hpBg.position.y = hpY; hpFill.position.y = hpY;
        hpBg.renderOrder = 999; hpFill.renderOrder = 1000;
        g.add(hpBg); g.add(hpFill); u.hpBar = hpFill; u.hpBarBg = hpBg;
        // Selection ring
        var ring = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.55, 16),
            new THREE.MeshBasicMaterial({ color: 0x44ccff, side: THREE.DoubleSide, transparent: true, opacity: 0.7 }));
        ring.rotation.x = -Math.PI / 2; ring.position.y = 0.03; ring.visible = false;
        g.add(ring); u.selRing = ring;
        g.position.set(u.x, 0, u.z); scene.add(g); u.mesh = g;
    }

    // === PARTICLES ===
    function spawnBlood(x, y, z, count) {
        for (var i = 0; i < count; i++) {
            var p = new THREE.Mesh(new THREE.SphereGeometry(0.04 + Math.random() * 0.04, 4, 4),
                new THREE.MeshBasicMaterial({ color: 0xaa0000 }));
            p.position.set(x, y, z); scene.add(p);
            particles.push({ mesh: p, vx: (Math.random() - 0.5) * 3, vy: 2 + Math.random() * 3, vz: (Math.random() - 0.5) * 3, life: 0.6 + Math.random() * 0.4 });
        }
    }
    function spawnSpark(x, y, z) {
        for (var i = 0; i < 3; i++) {
            var p = new THREE.Mesh(new THREE.SphereGeometry(0.03, 4, 4),
                new THREE.MeshBasicMaterial({ color: 0xffcc44 }));
            p.position.set(x, y, z); scene.add(p);
            particles.push({ mesh: p, vx: (Math.random() - 0.5) * 4, vy: 1 + Math.random() * 2, vz: (Math.random() - 0.5) * 4, life: 0.3 + Math.random() * 0.2 });
        }
    }
    function updateParticles(dt) {
        for (var i = particles.length - 1; i >= 0; i--) {
            var p = particles[i]; p.life -= dt;
            p.mesh.position.x += p.vx * dt; p.mesh.position.y += p.vy * dt; p.mesh.position.z += p.vz * dt;
            p.vy -= 12 * dt;
            if (p.mesh.position.y < 0) p.mesh.position.y = 0;
            if (p.life <= 0) { scene.remove(p.mesh); particles.splice(i, 1); }
        }
    }

    // === TERRAIN ===
    function buildTerrain() {
        var lv = LEVELS[currentLevel]; MAP_SIZE = lv.mapSize; HALF = MAP_SIZE / 2;
        var gMat = new THREE.MeshStandardMaterial({ color: lv.groundColor, roughness: 0.92 });
        ground = new THREE.Mesh(new THREE.PlaneGeometry(MAP_SIZE, MAP_SIZE, 50, 50), gMat);
        ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
        var vt = ground.geometry.attributes.position;
        for (var i = 0; i < vt.count; i++) {
            var px = vt.getX(i), py = vt.getY(i);
            vt.setZ(i, (Math.sin(px * 0.15) * Math.cos(py * 0.12) * 0.5 + Math.sin(px * 0.04 + 2) * Math.cos(py * 0.06) * 1.5) * 0.25);
        }
        ground.geometry.computeVertexNormals(); scene.add(ground);
        groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        // Lighting
        var sun = new THREE.DirectionalLight(lv.sunColor, lv.sunIntensity);
        sun.position.set(30, 50, 20); sun.castShadow = true;
        sun.shadow.mapSize.set(2048, 2048);
        sun.shadow.camera.left = -65; sun.shadow.camera.right = 65; sun.shadow.camera.top = 65; sun.shadow.camera.bottom = -65;
        scene.add(sun);
        scene.add(new THREE.AmbientLight(0x445566, 0.3));
        scene.add(new THREE.HemisphereLight(0x88aacc, 0x445533, 0.2));
        scene.fog = new THREE.FogExp2(lv.fogColor, lv.fogDensity);
        scene.background = new THREE.Color(lv.fogColor);
        // Trees
        var tMat = new THREE.MeshStandardMaterial({ color: 0x2a1a0a, roughness: 0.9 });
        var lMat = new THREE.MeshStandardMaterial({ color: currentLevel === 2 ? 0x1a3a10 : 0x2a5a1a, roughness: 0.8 });
        for (var i = 0; i < lv.trees; i++) {
            var tx = (Math.random() - 0.5) * MAP_SIZE * 0.85, tz = (Math.random() - 0.5) * MAP_SIZE * 0.85;
            if (Math.abs(tx) < 15 && Math.abs(tz) < 25) continue;
            var tg = new THREE.Group();
            var trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.35, 3 + Math.random() * 3), tMat);
            trunk.position.y = 1.5; trunk.castShadow = true; tg.add(trunk);
            var leaf = new THREE.Mesh(new THREE.SphereGeometry(1.2 + Math.random() * 1.5, 6, 6), lMat);
            leaf.position.y = 4 + Math.random(); leaf.castShadow = true; tg.add(leaf);
            tg.position.set(tx, 0, tz); scene.add(tg); obstacles.push({ x: tx, z: tz, r: 1.5 });
        }
        // Walls
        var sMat = new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.9 });
        for (var i = 0; i < lv.walls; i++) {
            var wx = (Math.random() - 0.5) * MAP_SIZE * 0.55, wz = (Math.random() - 0.5) * MAP_SIZE * 0.55;
            if (Math.abs(wx) < 15 && Math.abs(wz) < 20) continue;
            var w = new THREE.Mesh(new THREE.BoxGeometry(3 + Math.random() * 5, 1.5 + Math.random(), 0.6), sMat);
            w.position.set(wx, 0.75, wz); w.rotation.y = Math.random() * Math.PI; w.castShadow = true; w.receiveShadow = true;
            scene.add(w); obstacles.push({ x: wx, z: wz, r: 2.5 });
        }
        // River + Bridge
        if (lv.hasRiver) {
            var rMat = new THREE.MeshStandardMaterial({ color: 0x224466, roughness: 0.3, metalness: 0.1, transparent: true, opacity: 0.7 });
            var river = new THREE.Mesh(new THREE.PlaneGeometry(MAP_SIZE, 14), rMat);
            river.rotation.x = -Math.PI / 2; river.position.y = 0.02; scene.add(river);
        }
        if (lv.hasBridge) {
            var bMat = new THREE.MeshStandardMaterial({ color: 0x886644, roughness: 0.8 });
            var bridge = new THREE.Mesh(new THREE.BoxGeometry(8, 0.5, 16), bMat);
            bridge.position.set(0, 0.3, 0); bridge.castShadow = true; scene.add(bridge);
            // Rails
            for (var s = -1; s <= 1; s += 2) {
                var rail = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.2, 16), bMat);
                rail.position.set(s * 3.8, 0.9, 0); scene.add(rail);
            }
        }
        // Castle
        if (lv.hasCastle) {
            var cMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.85 });
            // Main walls
            for (var s = -1; s <= 1; s += 2) {
                var cw = new THREE.Mesh(new THREE.BoxGeometry(0.8, 5, 40), cMat);
                cw.position.set(s * 20, 2.5, 10); cw.castShadow = true; scene.add(cw);
            }
            var bw = new THREE.Mesh(new THREE.BoxGeometry(40, 5, 0.8), cMat);
            bw.position.set(0, 2.5, 30); bw.castShadow = true; scene.add(bw);
            // Gate opening
            var gw1 = new THREE.Mesh(new THREE.BoxGeometry(14, 5, 0.8), cMat); gw1.position.set(-13, 2.5, -10); scene.add(gw1);
            var gw2 = new THREE.Mesh(new THREE.BoxGeometry(14, 5, 0.8), cMat); gw2.position.set(13, 2.5, -10); scene.add(gw2);
            // Towers
            for (var tx2 = -1; tx2 <= 1; tx2 += 2)for (var tz2 = -1; tz2 <= 1; tz2 += 2) {
                var tw = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 3, 7, 8), cMat);
                tw.position.set(tx2 * 20, 3.5, tz2 === 1 ? 30 : -10); tw.castShadow = true; scene.add(tw);
            }
            // Keep
            var keep = new THREE.Mesh(new THREE.BoxGeometry(10, 8, 10), cMat);
            keep.position.set(0, 4, 20); keep.castShadow = true; scene.add(keep);
        }
        // City buildings
        if (lv.isCity) {
            var bMats = [
                new THREE.MeshStandardMaterial({ color: 0x665544, roughness: 0.85 }),
                new THREE.MeshStandardMaterial({ color: 0x776655, roughness: 0.8 }),
                new THREE.MeshStandardMaterial({ color: 0x554433, roughness: 0.9 })
            ];
            for (var i = 0; i < lv.buildings; i++) {
                var bx = (Math.random() - 0.5) * MAP_SIZE * 0.5, bz = (Math.random() - 0.5) * MAP_SIZE * 0.4;
                if (Math.abs(bx) < 6 && Math.abs(bz) < 6) continue;
                var bw2 = 3 + Math.random() * 4, bh2 = 2 + Math.random() * 4, bd = 3 + Math.random() * 3;
                var bld = new THREE.Mesh(new THREE.BoxGeometry(bw2, bh2, bd), bMats[i % 3]);
                bld.position.set(bx, bh2 / 2, bz); bld.castShadow = true; bld.receiveShadow = true; scene.add(bld);
                // Roof
                var roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(bw2, bd) * 0.6, 2, 4),
                    new THREE.MeshStandardMaterial({ color: 0x993322, roughness: 0.7 }));
                roof.position.set(bx, bh2 + 1, bz); roof.rotation.y = Math.PI / 4; roof.castShadow = true; scene.add(roof);
                obstacles.push({ x: bx, z: bz, r: Math.max(bw2, bd) * 0.5 });
            }
            // Streets
            var streetMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.95 });
            var s1 = new THREE.Mesh(new THREE.PlaneGeometry(4, MAP_SIZE * 0.8), streetMat);
            s1.rotation.x = -Math.PI / 2; s1.position.y = 0.02; scene.add(s1);
            var s2 = new THREE.Mesh(new THREE.PlaneGeometry(MAP_SIZE * 0.6, 4), streetMat);
            s2.rotation.x = -Math.PI / 2; s2.position.y = 0.02; scene.add(s2);
        }
        // Capture points (city level)
        capturePoints = []; capturePointMeshes = [];
        if (lv.capturePoints > 0) {
            var cpPositions = [{ x: 0, z: 0 }, { x: -25, z: 15 }, { x: 25, z: -10 }];
            for (var i = 0; i < lv.capturePoints; i++) {
                var cp = cpPositions[i];
                var cpRing = new THREE.Mesh(new THREE.RingGeometry(3, 3.5, 24),
                    new THREE.MeshBasicMaterial({ color: 0xff4444, side: THREE.DoubleSide, transparent: true, opacity: 0.5 }));
                cpRing.rotation.x = -Math.PI / 2; cpRing.position.set(cp.x, 0.05, cp.z); scene.add(cpRing);
                var cpLight = new THREE.PointLight(0xff4444, 0.5, 10);
                cpLight.position.set(cp.x, 2, cp.z); scene.add(cpLight);
                // Flag pole
                var fp = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 4), new THREE.MeshStandardMaterial({ color: 0x888888 }));
                fp.position.set(cp.x, 2, cp.z); scene.add(fp);
                var fl = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.8),
                    new THREE.MeshStandardMaterial({ color: 0xff4444, side: THREE.DoubleSide }));
                fl.position.set(cp.x + 0.7, 3.6, cp.z); scene.add(fl);
                capturePoints.push({ x: cp.x, z: cp.z, owner: 'red', progress: 0, ring: cpRing, light: cpLight, flag: fl });
                capturePointMeshes.push(cpRing);
            }
        }
        // Flags
        addFlag(-8, -HALF + 10, 0x3366cc); addFlag(8, HALF - 10, 0xcc3333);
    }

    function addFlag(x, z, color) {
        var p = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 5), new THREE.MeshStandardMaterial({ color: 0x666666 }));
        p.position.set(x, 2.5, z); scene.add(p);
        var f = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1), new THREE.MeshStandardMaterial({ color: color, side: THREE.DoubleSide }));
        f.position.set(x + 0.8, 4.5, z); scene.add(f);
    }

    // === SPAWN ===
    function spawnArmies() {
        blueUnits = []; redUnits = []; var lv = LEVELS[currentLevel];
        lv.blue.forEach(function (f) {
            var cols = Math.ceil(Math.sqrt(f.count));
            for (var i = 0; i < f.count; i++) {
                var row = Math.floor(i / cols), col = i % cols;
                var u = new Unit('blue', f.type, f.x + (col - cols / 2) * 1.5 + (Math.random() - 0.5) * 0.3, f.z + row * 1.5 + (Math.random() - 0.5) * 0.3);
                u.squadId = f.sq; createUnitMesh(u); blueUnits.push(u);
            }
        });
        lv.red.forEach(function (f) {
            var cols = Math.ceil(Math.sqrt(f.count));
            for (var i = 0; i < f.count; i++) {
                var row = Math.floor(i / cols), col = i % cols;
                var u = new Unit('red', f.type, f.x + (col - cols / 2) * 1.5 + (Math.random() - 0.5) * 0.5, f.z + row * 1.5 + (Math.random() - 0.5) * 0.5);
                u.squadId = f.sq; u.facing = Math.PI; createUnitMesh(u); redUnits.push(u);
            }
        });
        allUnits = blueUnits.concat(redUnits);
    }

    // === CAMERA ===
    function updateCamera() {
        var ex = camTarget.x + camDist * Math.sin(camAngle) * Math.cos(camPitch);
        var ey = Math.max(2, camDist * Math.sin(camPitch));
        var ez = camTarget.z + camDist * Math.cos(camAngle) * Math.cos(camPitch);
        camera.position.set(ex, ey, ez);
        camera.lookAt(camTarget.x, 0, camTarget.z);
    }
    function panCamera(dt) {
        var ps = camDist * 0.6 * dt;
        var fw = { x: -Math.sin(camAngle), z: -Math.cos(camAngle) };
        var rt = { x: Math.cos(camAngle), z: -Math.sin(camAngle) };
        if (keys['KeyW'] || keys['ArrowUp']) { camTarget.x += fw.x * ps; camTarget.z += fw.z * ps; }
        if (keys['KeyS'] || keys['ArrowDown']) { camTarget.x -= fw.x * ps; camTarget.z -= fw.z * ps; }
        if (keys['KeyA'] || keys['ArrowLeft']) { camTarget.x -= rt.x * ps; camTarget.z -= rt.z * ps; }
        if (keys['KeyD'] || keys['ArrowRight']) { camTarget.x += rt.x * ps; camTarget.z += rt.z * ps; }
        camTarget.x = Math.max(-HALF, Math.min(HALF, camTarget.x));
        camTarget.z = Math.max(-HALF, Math.min(HALF, camTarget.z));
    }

    // === RAYCAST ===
    function getWorldPos(sx, sy) {
        var ndc = new THREE.Vector2((sx / window.innerWidth) * 2 - 1, -(sy / window.innerHeight) * 2 + 1);
        raycaster.setFromCamera(ndc, camera); var t = new THREE.Vector3();
        raycaster.ray.intersectPlane(groundPlane, t); return t;
    }
    function getUnitAtScreen(sx, sy) {
        var ndc = new THREE.Vector2((sx / window.innerWidth) * 2 - 1, -(sy / window.innerHeight) * 2 + 1);
        raycaster.setFromCamera(ndc, camera);
        for (var i = 0; i < blueUnits.length; i++) {
            var u = blueUnits[i]; if (u.dead) continue;
            if (raycaster.ray.distanceToPoint(new THREE.Vector3(u.x, 0.6, u.z)) < 0.8) return u;
        } return null;
    }

    // === SELECTION ===
    function clearSelection() { selectedUnits.forEach(function (u) { u.selected = false; if (u.selRing) u.selRing.visible = false; }); selectedUnits = []; }
    function selectUnit(u, add) { if (!add) clearSelection(); if (!u || u.dead || u.team !== 'blue') return; u.selected = true; if (u.selRing) u.selRing.visible = true; if (selectedUnits.indexOf(u) === -1) selectedUnits.push(u); updateSelPanel(); }
    function boxSelect(x1, y1, x2, y2, add) {
        if (!add) clearSelection(); var l = Math.min(x1, x2), r = Math.max(x1, x2), t = Math.min(y1, y2), b = Math.max(y1, y2);
        blueUnits.forEach(function (u) {
            if (u.dead) return; var sp = w2s(u.x, 0.6, u.z);
            if (sp.x >= l && sp.x <= r && sp.y >= t && sp.y <= b) { u.selected = true; if (u.selRing) u.selRing.visible = true; if (selectedUnits.indexOf(u) === -1) selectedUnits.push(u); }
        });
        updateSelPanel();
    }
    function w2s(wx, wy, wz) { var v = new THREE.Vector3(wx, wy, wz).project(camera); return { x: (v.x + 1) / 2 * window.innerWidth, y: (-v.y + 1) / 2 * window.innerHeight }; }
    function updateSelPanel() {
        var p = document.getElementById('bottom-panel'), info = document.getElementById('selected-info');
        if (!selectedUnits.length) { p.style.display = 'none'; return; }
        p.style.display = 'flex'; var c = { swordsmen: 0, archers: 0, cavalry: 0 }, th = 0, tm = 0;
        selectedUnits.forEach(function (u) { c[u.type]++; th += u.hp; tm += u.maxHp; });
        var pts = []; if (c.swordsmen) pts.push('⚔️' + c.swordsmen + ' Swords'); if (c.archers) pts.push('🏹' + c.archers + ' Archers'); if (c.cavalry) pts.push('🐴' + c.cavalry + ' Cavalry');
        info.innerHTML = '<strong>' + selectedUnits.length + ' units</strong> — ' + pts.join(' | ') + '<br>HP: ' + Math.round(th) + '/' + tm;
    }

    // === FORMATIONS ===
    function moveSelectedTo(wx, wz, fa, dragWidth) {
        if (!selectedUnits.length) return;
        // During setup phase, clamp to player side of territory line
        if (setupPhase) {
            wz = Math.min(wz, TERRITORY_Z - 1);
        }
        var pos = getFormPos(wx, wz, selectedUnits.length, currentFormation, fa, dragWidth);
        for (var i = 0; i < selectedUnits.length; i++) {
            var u = selectedUnits[i]; u.tx = pos[i].x;
            u.tz = setupPhase ? Math.min(pos[i].z, TERRITORY_Z - 1) : pos[i].z;
            u.targetFacing = fa != null ? fa : Math.atan2(wx - u.x, wz - u.z);
            u.state = 'move'; u.target = null; u.guarding = false;
            if (u.guardIcon) u.guardIcon.visible = false;
        }
    }
    function getFormPos(cx, cz, n, fm, f, dragWidth) {
        var p = [], sp = dragWidth || 1.0; f = f || 0;
        if (fm === 'line') {
            // Shield wall: tight grouped line
            var cols = Math.min(n, Math.max(4, Math.ceil(n * 0.7)));
            for (var i = 0; i < n; i++) {
                var r = Math.floor(i / cols), c = i % cols;
                var stagger = (r % 2 === 1) ? sp * 0.4 : 0;
                var ox = (c - (cols - 1) / 2) * sp + stagger;
                var oz = r * sp * 0.8;
                p.push({ x: cx + ox * Math.cos(f) + oz * Math.sin(f), z: cz - ox * Math.sin(f) + oz * Math.cos(f) });
            }
        } else if (fm === 'wedge') {
            var placed = 0;
            for (var row = 0; placed < n; row++) {
                var inRow = Math.min(row * 2 + 1, n - placed);
                for (var j = 0; j < inRow; j++) {
                    var ox = (j - (inRow - 1) / 2) * sp;
                    var oz = row * sp * 0.9;
                    p.push({ x: cx + ox * Math.cos(f) + oz * Math.sin(f), z: cz - ox * Math.sin(f) + oz * Math.cos(f) });
                    placed++;
                }
            }
        } else if (fm === 'circle') {
            var rad = Math.max(1.5, n * sp * 0.12);
            for (var i = 0; i < n; i++) {
                var a = (i / n) * Math.PI * 2 + f;
                p.push({ x: cx + Math.cos(a) * rad, z: cz + Math.sin(a) * rad });
            }
        } else {
            // Square block
            var cols = Math.ceil(Math.sqrt(n));
            for (var i = 0; i < n; i++) {
                var r = Math.floor(i / cols), c = i % cols;
                var ox = (c - (cols - 1) / 2) * sp;
                var oz = (r - (Math.ceil(n / cols) - 1) / 2) * sp;
                p.push({ x: cx + ox * Math.cos(f) + oz * Math.sin(f), z: cz - ox * Math.sin(f) + oz * Math.cos(f) });
            }
        }
        return p;
    }

    // === AI ===
    function updateAI(dt) {
        redUnits.forEach(function (u) {
            if (u.dead) return; if (u.state === 'attack' && u.target && !u.target.dead) return;
            var best = null, bestD = Infinity;
            blueUnits.forEach(function (b) { if (b.dead) return; var d = Math.hypot(u.x - b.x, u.z - b.z); if (d < bestD) { bestD = d; best = b; } });
            if (best) { if (bestD <= u.range + 0.5) { u.state = 'attack'; u.target = best; } else { u.state = 'move'; u.tx = best.x; u.tz = best.z; u.target = best; } }
        });
    }

    // === COMBAT ===
    function angleDiff(t, c) { var d = t - c; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; }
    function updateUnits(dt) {
        allUnits.forEach(function (u) {
            if (u.dead) { u.deathTimer += dt; return; }
            u.bobPhase += dt * 4; u.animPhase += dt;
            // Auto-acquire
            if (u.team === 'blue' && u.state === 'idle') {
                var guardRange = u.guarding ? u.range + 3 : u.range + 2;
                var best = null, bd = Infinity; var enemies = redUnits;
                enemies.forEach(function (r) { if (r.dead) return; var d = Math.hypot(u.x - r.x, u.z - r.z); if (d < guardRange && d < bd) { bd = d; best = r; } });
                if (best) { u.state = 'attack'; u.target = best; }
            }
            if (u.state === 'move') {
                var dx = u.tx - u.x, dz = u.tz - u.z, dist = Math.hypot(dx, dz);
                if (dist < 0.3) { u.state = 'idle'; return; }
                var s = Math.min(u.speed * dt, dist); u.x += (dx / dist) * s; u.z += (dz / dist) * s;
                u.facing += angleDiff(Math.atan2(dx, dz), u.facing) * 5 * dt;
                // Walk bob
                if (u.bodyMesh) u.bodyMesh.position.y = 0.78 + Math.sin(u.bobPhase * 2) * 0.03;
                var en = u.team === 'blue' ? redUnits : blueUnits;
                en.forEach(function (e) { if (e.dead || u.state === 'attack') return; if (Math.hypot(u.x - e.x, u.z - e.z) < u.range + 0.5) { u.state = 'attack'; u.target = e; } });
            } else if (u.state === 'attack') {
                if (!u.target || u.target.dead) { u.state = 'idle'; u.target = null; return; }
                var dx = u.target.x - u.x, dz = u.target.z - u.z, dist = Math.hypot(dx, dz);
                u.facing += angleDiff(Math.atan2(dx, dz), u.facing) * 8 * dt;
                // Guard mode: don't chase, disengage if too far
                if (u.guarding && dist > u.range + 4) { u.state = 'idle'; u.target = null; return; }
                if (dist > u.range + 0.5 && !u.guarding) { u.x += (dx / dist) * u.speed * dt; u.z += (dz / dist) * u.speed * dt; }
                else {
                    u.atkTimer -= dt;
                    // Swing animation
                    if (u.weaponPivot) {
                        var swing = Math.sin(u.animPhase * 8) * 0.8;
                        if (u.atkTimer > u.atkCooldown * 0.7) swing = Math.sin(u.animPhase * 12) * 1.2;
                        u.weaponPivot.rotation.x = swing;
                    }
                    if (u.atkTimer <= 0) {
                        u.atkTimer = u.atkCooldown;
                        var dmg = u.atk * (0.8 + Math.random() * 0.4);
                        u.target.hp -= dmg;
                        // VFX
                        spawnSpark((u.x + u.target.x) / 2, 1, (u.z + u.target.z) / 2);
                        if (u.target.hp <= 0) {
                            killUnit(u.target); if (u.team === 'blue') { killCount++; totalKills++; }
                            u.state = 'idle'; u.target = null;
                        }
                        if (u.type === 'archers') spawnArrow(u, u.target);
                    }
                }
            } else {
                // Idle weapon reset
                if (u.weaponPivot) u.weaponPivot.rotation.x *= 0.9;
            }
            // Separation
            allUnits.forEach(function (o) { if (o === u || o.dead) return; var dx = u.x - o.x, dz = u.z - o.z, d = Math.hypot(dx, dz); if (d < 0.8 && d > 0.01) { u.x += (dx / d) * 0.5 * dt; u.z += (dz / d) * 0.5 * dt; } });
            u.x = Math.max(-HALF + 1, Math.min(HALF - 1, u.x)); u.z = Math.max(-HALF + 1, Math.min(HALF - 1, u.z));
            if (u.mesh) {
                u.mesh.position.set(u.x, 0, u.z); u.mesh.rotation.y = u.facing;
                if (u.hpBar) { u.hpBar.scale.x = Math.max(0.01, u.hp / u.maxHp); u.hpBar.lookAt(camera.position); u.hpBarBg.lookAt(camera.position); }
            }
        });
    }

    function killUnit(u) {
        u.dead = true; u.state = 'dead';
        spawnBlood(u.x, 0.8, u.z, 8);
        if (u.mesh) { u.mesh.rotation.x = Math.PI / 2; u.mesh.position.y = 0.15; setTimeout(function () { if (u.mesh) u.mesh.visible = false; }, 4000); }
        if (u.selected) { u.selected = false; var i = selectedUnits.indexOf(u); if (i > -1) selectedUnits.splice(i, 1); updateSelPanel(); }
    }

    // === ARROWS ===
    function spawnArrow(from, to) {
        var g = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.6), new THREE.MeshBasicMaterial({ color: 0xddaa44 }));
        g.position.set(from.x, 1.5, from.z); scene.add(g); arrows.push({ mesh: g, tx: to.x, ty: 0.8, tz: to.z, life: 0.8 });
    }
    function updateArrows(dt) {
        for (var i = arrows.length - 1; i >= 0; i--) {
            var a = arrows[i]; a.life -= dt; var t = 1 - a.life / 0.8;
            a.mesh.position.x += (a.tx - a.mesh.position.x) * 5 * dt; a.mesh.position.z += (a.tz - a.mesh.position.z) * 5 * dt;
            a.mesh.position.y = 1.5 + Math.sin(t * Math.PI) * 3 - t * 0.7; a.mesh.lookAt(a.tx, a.ty, a.tz);
            if (a.life <= 0) { scene.remove(a.mesh); arrows.splice(i, 1); }
        }
    }

    // === CAPTURE POINTS ===
    function updateCapturePoints(dt) {
        if (!capturePoints.length) return; var allCaptured = true;
        capturePoints.forEach(function (cp) {
            var blueNear = 0, redNear = 0;
            blueUnits.forEach(function (u) { if (!u.dead && Math.hypot(u.x - cp.x, u.z - cp.z) < 5) blueNear++; });
            redUnits.forEach(function (u) { if (!u.dead && Math.hypot(u.x - cp.x, u.z - cp.z) < 5) redNear++; });
            if (blueNear > redNear) { cp.progress = Math.min(100, cp.progress + dt * 10 * (blueNear - redNear)); if (cp.progress >= 100) cp.owner = 'blue'; }
            else if (redNear > blueNear) { cp.progress = Math.max(0, cp.progress - dt * 8); if (cp.progress <= 0) cp.owner = 'red'; }
            // Visual feedback
            var col = cp.owner === 'blue' ? 0x4488ff : 0xff4444;
            cp.ring.material.color.setHex(col); cp.light.color.setHex(col); cp.flag.material.color.setHex(col);
            cp.ring.material.opacity = 0.4 + Math.sin(gameTime * 3) * 0.15;
            if (cp.owner !== 'blue') allCaptured = false;
        });
        return allCaptured;
    }

    // === MINIMAP ===
    function drawMinimap() {
        if (!minimapCtx) return; var c = minimapCtx, w = 200, h = 200;
        c.fillStyle = '#1a2a15'; c.fillRect(0, 0, w, h);
        c.strokeStyle = 'rgba(255,255,255,0.05)'; c.lineWidth = 0.5;
        for (var i = 0; i <= 10; i++) { c.beginPath(); c.moveTo(i * 20, 0); c.lineTo(i * 20, h); c.stroke(); c.beginPath(); c.moveTo(0, i * 20); c.lineTo(w, i * 20); c.stroke(); }
        var sc = w / MAP_SIZE;
        blueUnits.forEach(function (u) { if (u.dead) return; c.fillStyle = u.selected ? '#88ddff' : '#4488ff'; c.fillRect((u.x + HALF) * sc - 1.5, (u.z + HALF) * sc - 1.5, 3, 3); });
        redUnits.forEach(function (u) { if (u.dead) return; c.fillStyle = '#ff4444'; c.fillRect((u.x + HALF) * sc - 1.5, (u.z + HALF) * sc - 1.5, 3, 3); });
        // Capture points
        capturePoints.forEach(function (cp) { c.fillStyle = cp.owner === 'blue' ? '#4488ff' : '#ff4444'; c.beginPath(); c.arc((cp.x + HALF) * sc, (cp.z + HALF) * sc, 4, 0, Math.PI * 2); c.fill(); });
        c.strokeStyle = 'rgba(255,255,200,0.6)'; c.lineWidth = 1;
        var cx = (camTarget.x + HALF) * sc, cz = (camTarget.z + HALF) * sc, vs = camDist * sc * 0.5;
        c.strokeRect(cx - vs, cz - vs, vs * 2, vs * 2);
    }

    // === HUD ===
    function updateHUD() {
        var al = blueUnits.filter(function (u) { return !u.dead; }).length;
        var el = redUnits.filter(function (u) { return !u.dead; }).length;
        document.getElementById('hud-blue-count').textContent = al + '/' + blueUnits.length;
        document.getElementById('hud-red-count').textContent = el + '/' + redUnits.length;
        document.getElementById('hud-kills').textContent = totalKills;
        document.getElementById('hud-level').textContent = (currentLevel + 1);
        blueMorale = Math.max(0, Math.round(al / blueUnits.length * 100));
        document.getElementById('hud-morale').textContent = blueMorale + '%';
    }

    // === LEVEL TRANSITIONS ===
    function checkEnd() {
        var bl = blueUnits.filter(function (u) { return !u.dead; }).length;
        var rl = redUnits.filter(function (u) { return !u.dead; }).length;
        if (bl === 0) { endGame(false); return true; }
        var lv = LEVELS[currentLevel];
        if (lv.capturePoints > 0) {
            var allCap = capturePoints.every(function (cp) { return cp.owner === 'blue'; });
            if (allCap && rl < 5) { nextLevel(); return true; }
        } else if (rl === 0) { nextLevel(); return true; }
        return false;
    }
    function nextLevel() {
        if (currentLevel >= LEVELS.length - 1) { endGame(true); return; }
        gameActive = false;
        var trans = document.getElementById('level-transition');
        trans.style.display = 'flex';
        document.getElementById('level-title').textContent = 'VICTORY — ' + LEVELS[currentLevel].name;
        document.getElementById('level-desc').textContent = 'Next: ' + LEVELS[currentLevel + 1].name + ' — ' + LEVELS[currentLevel + 1].desc;
        setTimeout(function () {
            currentLevel++; killCount = 0; trans.style.display = 'none';
            resetState(); gameActive = true; setupPhase = true; enterSetupPhase();
            GameUtils.setState(GameUtils.STATE.PLAYING); gameLoop();
        }, 3000);
    }
    function endGame(victory) {
        gameActive = false; GameUtils.setState(victory ? GameUtils.STATE.WIN : GameUtils.STATE.GAME_OVER);
        var st = 'Total Kills: ' + totalKills + ' | Battles Won: ' + (victory ? LEVELS.length : currentLevel);
        if (victory) { document.getElementById('win-stats').textContent = st; document.getElementById('game-win-screen').style.display = 'flex'; try { HorrorAudio.playWin(); } catch (e) { } }
        else { document.getElementById('final-stats').textContent = st; document.getElementById('game-over-screen').style.display = 'flex'; try { HorrorAudio.playDeath(); } catch (e) { } }
        document.getElementById('top-hud').style.display = 'none'; document.getElementById('bottom-panel').style.display = 'none'; document.getElementById('minimap-container').style.display = 'none';
    }

    // === INPUT ===
    document.addEventListener('keydown', function (e) {
        keys[e.code] = true; if (!gameActive) return;
        if (e.code === 'KeyA' && e.ctrlKey) { e.preventDefault(); clearSelection(); blueUnits.forEach(function (u) { if (!u.dead) selectUnit(u, true); }); }
        if (e.code === 'KeyF') { var fs = ['line', 'wedge', 'square', 'circle']; var i = (fs.indexOf(currentFormation) + 1) % fs.length; currentFormation = fs[i]; updFormBtns(); }
        if (e.code === 'KeyH') { selectedUnits.forEach(function (u) { u.state = 'idle'; u.tx = u.x; u.tz = u.z; }); }
        // Guard mode toggle
        if (e.code === 'KeyG') { selectedUnits.forEach(function (u) { u.guarding = !u.guarding; if (u.guardIcon) u.guardIcon.visible = u.guarding; u.state = 'idle'; u.tx = u.x; u.tz = u.z; u.target = null; }); }
        if (e.code === 'Tab') { e.preventDefault(); currentSquadIdx = (currentSquadIdx + 1) % 3; clearSelection(); blueUnits.forEach(function (u) { if (!u.dead && u.squadId === currentSquadIdx) selectUnit(u, true); }); }
        if (e.code === 'Space' && selectedUnits.length > 0) { e.preventDefault(); var cx = 0, cz = 0; selectedUnits.forEach(function (u) { cx += u.x; cz += u.z; }); camTarget.x = cx / selectedUnits.length; camTarget.z = cz / selectedUnits.length; }
        if (e.code >= 'Digit1' && e.code <= 'Digit9') { var n = e.code.replace('Digit', ''); if (e.ctrlKey) { controlGroups[n] = selectedUnits.slice(); } else if (controlGroups[n] && controlGroups[n].length) { clearSelection(); controlGroups[n].forEach(function (u) { if (!u.dead) selectUnit(u, true); }); } }
        if (e.code === 'Escape') { gameActive = false; GameUtils.pauseGame(); }
        if (e.code === 'Enter' && setupPhase) { beginBattle(); }
    });
    document.addEventListener('keyup', function (e) { keys[e.code] = false; });

    // === FORMATION PREVIEW DOTS ===
    function clearPreviewDots() {
        for (var i = 0; i < previewDots.length; i++) scene.remove(previewDots[i]);
        previewDots = [];
    }
    function showPreviewDots(cx, cz, n, fm, fa, dragWidth) {
        clearPreviewDots();
        var positions = getFormPos(cx, cz, n, fm, fa, dragWidth);
        var dotMat = new THREE.MeshBasicMaterial({ color: 0x44ddff, transparent: true, opacity: 0.6 });
        var dotGeo = new THREE.SphereGeometry(0.25, 6, 6);
        for (var i = 0; i < positions.length; i++) {
            var dot = new THREE.Mesh(dotGeo, dotMat);
            dot.position.set(positions[i].x, 0.15, positions[i].z);
            scene.add(dot); previewDots.push(dot);
        }
        // Draw a direction line from center
        if (fa != null) {
            var lineMat = new THREE.MeshBasicMaterial({ color: 0x44ddff, transparent: true, opacity: 0.35 });
            var lineLen = Math.max(3, n * 0.3);
            var arrowMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.15, lineLen), lineMat);
            arrowMesh.rotation.x = -Math.PI / 2;
            arrowMesh.rotation.z = -fa;
            arrowMesh.position.set(cx + Math.sin(fa) * lineLen * 0.5, 0.1, cz + Math.cos(fa) * lineLen * 0.5);
            scene.add(arrowMesh); previewDots.push(arrowMesh);
        }
    }

    var canvas;
    function setupMouse() {
        canvas = document.getElementById('game-canvas'); selBox = document.getElementById('selection-box');
        // Track mouse position on document level for reliable edge panning
        document.addEventListener('mousemove', function (e) {
            mouseScreen.x = e.clientX; mouseScreen.y = e.clientY;
        });
        canvas.addEventListener('mousedown', function (e) {
            if (!gameActive) return;
            if (e.button === 0) { selStart = { x: e.clientX, y: e.clientY }; isDragging = false; }
            if (e.button === 2) { e.preventDefault(); rightDown = true; rightDragging = false; rightStart = { x: e.clientX, y: e.clientY }; rightStartWorld = getWorldPos(e.clientX, e.clientY); }
            if (e.button === 1) { e.preventDefault(); middleDown = true; midStart = { x: e.clientX, y: e.clientY }; midAngleStart = camAngle; midPitchStart = camPitch; document.getElementById('cam-mode').style.display = 'block'; }
        });
        canvas.addEventListener('mousemove', function (e) {
            if (!gameActive) return;
            if (selStart) {
                var dx = e.clientX - selStart.x, dy = e.clientY - selStart.y; if (Math.abs(dx) > 4 || Math.abs(dy) > 4) isDragging = true;
                if (isDragging) { selBox.style.display = 'block'; selBox.style.left = Math.min(selStart.x, e.clientX) + 'px'; selBox.style.top = Math.min(selStart.y, e.clientY) + 'px'; selBox.style.width = Math.abs(dx) + 'px'; selBox.style.height = Math.abs(dy) + 'px'; }
            }
            if (middleDown) {
                camAngle = midAngleStart + (e.clientX - midStart.x) * 0.008;
                camPitch = Math.max(0.1, Math.min(Math.PI / 2.1, midPitchStart + (e.clientY - midStart.y) * 0.008));
            }
            // Right-click drag: show formation preview dots (Total War style)
            if (rightDown && selectedUnits.length > 0 && rightStartWorld) {
                var dx = e.clientX - rightStart.x, dy = e.clientY - rightStart.y;
                if (Math.hypot(dx, dy) > 10) {
                    rightDragging = true;
                    var wE = getWorldPos(e.clientX, e.clientY);
                    if (wE) {
                        var fa = Math.atan2(wE.x - rightStartWorld.x, wE.z - rightStartWorld.z);
                        // Drag distance controls formation width
                        var worldDragDist = Math.hypot(wE.x - rightStartWorld.x, wE.z - rightStartWorld.z);
                        var dragWidth = Math.max(0.8, Math.min(2.5, worldDragDist / selectedUnits.length * 2));
                        showPreviewDots(rightStartWorld.x, rightStartWorld.z, selectedUnits.length, currentFormation, fa, dragWidth);
                    }
                }
            }
        });
        canvas.addEventListener('mouseup', function (e) {
            if (!gameActive) return;
            if (e.button === 0 && selStart) { if (isDragging) { boxSelect(selStart.x, selStart.y, e.clientX, e.clientY, e.shiftKey); } else { var u = getUnitAtScreen(e.clientX, e.clientY); selectUnit(u, e.shiftKey); } selBox.style.display = 'none'; selStart = null; isDragging = false; }
            if (e.button === 2 && rightDown && selectedUnits.length > 0) {
                clearPreviewDots();
                var wp = getWorldPos(e.clientX, e.clientY);
                if (wp) {
                    var fa = null, dragW = undefined;
                    if (rightStartWorld && rightDragging) {
                        var wE = getWorldPos(e.clientX, e.clientY);
                        fa = Math.atan2(wE.x - rightStartWorld.x, wE.z - rightStartWorld.z);
                        var worldDragDist = Math.hypot(wE.x - rightStartWorld.x, wE.z - rightStartWorld.z);
                        dragW = Math.max(0.8, Math.min(2.5, worldDragDist / selectedUnits.length * 2));
                    }
                    moveSelectedTo(rightStartWorld ? rightStartWorld.x : wp.x, rightStartWorld ? rightStartWorld.z : wp.z, fa, dragW);
                }
                rightDown = false; rightDragging = false; rightStartWorld = null;
            }
            if (e.button === 2 && !selectedUnits.length) { rightDown = false; rightDragging = false; clearPreviewDots(); }
            if (e.button === 1) { middleDown = false; document.getElementById('cam-mode').style.display = 'none'; }
        });
        canvas.addEventListener('wheel', function (e) { camDist += e.deltaY * 0.04; camDist = Math.max(5, Math.min(90, camDist)); });
        canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
        minimapCanvas = document.getElementById('minimap-canvas'); minimapCtx = minimapCanvas.getContext('2d');
        minimapCanvas.addEventListener('click', function (e) { var r = minimapCanvas.getBoundingClientRect(); camTarget.x = ((e.clientX - r.left) / r.width - 0.5) * MAP_SIZE; camTarget.z = ((e.clientY - r.top) / r.height - 0.5) * MAP_SIZE; });
        document.querySelectorAll('.formation-btn').forEach(function (b) { b.addEventListener('click', function () { currentFormation = b.dataset.formation; updFormBtns(); }); });
    }
    function updFormBtns() { document.querySelectorAll('.formation-btn').forEach(function (b) { b.classList.toggle('active', b.dataset.formation === currentFormation); }); }

    // === INIT ===
    function init() {
        if (initialized) return; initialized = true; clock = new THREE.Clock(); scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.5, 250);
        renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('game-canvas'), antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight); renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.8;
        raycaster = new THREE.Raycaster();
        window.addEventListener('resize', function () { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); });
    }

    function startGame() {
        if (!GameUtils.checkWebGL()) { GameUtils.showBrowserError(); return; } init();
        document.getElementById('start-screen').style.display = 'none';
        var ctrl = document.getElementById('controls-overlay'); ctrl.style.display = 'flex';
        try { HorrorAudio.init(); HorrorAudio.startDrone(30, 'dark'); } catch (e) { }
        setTimeout(function () {
            ctrl.classList.add('hiding'); setTimeout(function () {
                ctrl.style.display = 'none'; ctrl.classList.remove('hiding');
                currentLevel = 0; totalKills = 0; resetState();
                gameActive = true; setupPhase = true;
                GameUtils.setState(GameUtils.STATE.PLAYING);
                document.getElementById('top-hud').style.display = 'flex';
                document.getElementById('minimap-container').style.display = 'block';
                document.getElementById('back-link').style.display = 'none';
                setupMouse(); enterSetupPhase(); gameLoop();
            }, 800);
        }, 3000);
    }

    function resetState() {
        while (scene.children.length > 0) scene.remove(scene.children[0]);
        blueUnits = []; redUnits = []; allUnits = []; selectedUnits = []; arrows = []; particles = []; obstacles = []; capturePoints = []; capturePointMeshes = [];
        killCount = 0; blueMorale = 100; controlGroups = {}; currentSquadIdx = 0; gameTime = 0;
        camTarget = { x: 0, z: -25 }; camDist = 40; camAngle = 0; camPitch = Math.PI / 3.2;
        var lv = LEVELS[currentLevel]; renderer.toneMappingExposure = lv.exposure || 0.8;
        buildTerrain(); spawnArmies(); buildTerritoryLine(); updateCamera();
    }

    function restartGame() {
        document.getElementById('game-over-screen').style.display = 'none'; document.getElementById('game-win-screen').style.display = 'none';
        document.getElementById('top-hud').style.display = 'flex'; document.getElementById('minimap-container').style.display = 'block';
        currentLevel = 0; totalKills = 0; resetState(); gameActive = true; setupPhase = true;
        GameUtils.setState(GameUtils.STATE.PLAYING);
        try { HorrorAudio.startDrone(30, 'dark'); } catch (e) { } enterSetupPhase(); gameLoop();
    }

    // === TERRITORY LINE & SETUP PHASE ===
    function buildTerritoryLine() {
        // Glowing red line across the map at TERRITORY_Z
        var lineMat = new THREE.MeshBasicMaterial({ color: 0xff2222, transparent: true, opacity: 0.7, side: THREE.DoubleSide });
        territoryLine = new THREE.Mesh(new THREE.PlaneGeometry(MAP_SIZE, 0.3), lineMat);
        territoryLine.rotation.x = -Math.PI / 2; territoryLine.position.set(0, 0.08, TERRITORY_Z);
        scene.add(territoryLine);
        // Transparent red zone covering enemy territory
        var zoneMat = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.06, side: THREE.DoubleSide });
        var zoneDepth = HALF - TERRITORY_Z;
        territoryZone = new THREE.Mesh(new THREE.PlaneGeometry(MAP_SIZE, zoneDepth), zoneMat);
        territoryZone.rotation.x = -Math.PI / 2;
        territoryZone.position.set(0, 0.04, TERRITORY_Z + zoneDepth / 2);
        scene.add(territoryZone);
        // Dashed warning posts along the line
        var postMat = new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.6 });
        for (var px = -HALF + 5; px <= HALF - 5; px += 10) {
            var post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.5), postMat);
            post.position.set(px, 0.75, TERRITORY_Z); scene.add(post);
            var flag = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.3),
                new THREE.MeshBasicMaterial({ color: 0xff4444, side: THREE.DoubleSide, transparent: true, opacity: 0.6 }));
            flag.position.set(px + 0.35, 1.3, TERRITORY_Z); scene.add(flag);
        }
    }
    function enterSetupPhase() {
        setupPhase = true;
        document.getElementById('deploy-banner').style.display = 'flex';
        if (territoryLine) { territoryLine.visible = true; territoryZone.visible = true; }
    }
    function beginBattle() {
        setupPhase = false;
        document.getElementById('deploy-banner').style.display = 'none';
        // Fade out territory visuals
        if (territoryLine) { territoryLine.visible = false; territoryZone.visible = false; }
    }

    var hudTimer = 0;
    function gameLoop() {
        if (!gameActive) return; requestAnimationFrame(gameLoop);
        var dt = Math.min(clock.getDelta(), 0.1); gameTime += dt;
        panCamera(dt); updateCamera();
        if (!setupPhase) {
            updateAI(dt); updateArrows(dt);
            if (capturePoints.length) updateCapturePoints(dt);
        }
        updateUnits(dt); updateParticles(dt);
        // Animate territory line during setup
        if (setupPhase && territoryLine) {
            territoryLine.material.opacity = 0.5 + Math.sin(gameTime * 3) * 0.3;
        }
        hudTimer += dt; if (hudTimer > 0.25) { hudTimer = 0; updateHUD(); drawMinimap(); if (!setupPhase && checkEnd()) return; }
        renderer.render(scene, camera);
    }

    document.getElementById('start-btn').addEventListener('click', startGame);
    document.getElementById('begin-battle-btn').addEventListener('click', beginBattle);
    GameUtils.injectDifficultySelector('start-screen');
    GameUtils.initPause({ onResume: function () { gameActive = true; clock.getDelta(); gameLoop(); }, onRestart: restartGame });
    var ob = document.querySelector('#game-over-screen .play-btn'); if (ob) ob.onclick = restartGame;
    var wb = document.querySelector('#game-win-screen .play-btn'); if (wb) wb.onclick = restartGame;
})();

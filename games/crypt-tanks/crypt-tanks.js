/* Crypt Tanks — creepy diep-style arena shooter (singleplayer with bot husks) */
(function () {
    'use strict';

    var canvas = document.getElementById('game-canvas');
    var ctx = canvas.getContext('2d', { alpha: false });

    var startScreen = document.getElementById('start-screen');
    var startBtn = document.getElementById('start-btn');
    var controlsOverlay = document.getElementById('controls-overlay');
    var hudWrap = document.getElementById('hud-wrap');
    var gameOverScreen = document.getElementById('game-over-screen');

    var hudLv = document.getElementById('hud-lv');
    var hudXp = document.getElementById('hud-xp');
    var hudTank = document.getElementById('hud-tank');
    var hudScore = document.getElementById('hud-score');
    var hudBest = document.getElementById('hud-best');
    var hudPts = document.getElementById('hud-pts');
    var barsEl = document.getElementById('bars');
    var evolveEl = document.getElementById('evolve');
    var choicesEl = document.getElementById('choices');
    var dangerVignette = document.getElementById('danger-vignette');

    var bestKey = 'crypt-tanks-best';
    var bestScore = parseInt(localStorage.getItem(bestKey) || '0', 10) || 0;
    hudBest.textContent = String(bestScore);

    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
    function lerp(a, b, t) { return a + (b - a) * t; }
    function rand(a, b) { return a + Math.random() * (b - a); }
    function irand(a, b) { return Math.floor(rand(a, b + 1)); }
    function dist2(ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; }
    function hypot(ax, ay) { return Math.sqrt(ax * ax + ay * ay); }

    // Resize
    var DPR = 1;
    function resize() {
        DPR = Math.min(window.devicePixelRatio || 1, 2);
        var w = Math.floor(window.innerWidth * DPR);
        var h = Math.floor(window.innerHeight * DPR);
        if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
        }
    }
    window.addEventListener('resize', resize);
    resize();
    // ===== Input =====
    var keys = Object.create(null);
    var pressed = Object.create(null); // one-frame / tapped keys (works with simulated key taps)
    var mouse = { x: canvas.width / 2, y: canvas.height / 2, down: false, tap: false };
    var vCursor = { x: canvas.width / 2, y: canvas.height / 2, active: false };

    window.addEventListener('keydown', function (e) {
        if (!keys[e.code]) pressed[e.code] = true;
        keys[e.code] = true;
        if (e.code === 'Space' || e.code.indexOf('Arrow') === 0) e.preventDefault();
    }, { passive: false });
    window.addEventListener('keyup', function (e) { keys[e.code] = false; });

    function consume(code) {
        if (pressed[code]) { pressed[code] = false; return true; }
        return false;
    }

    canvas.addEventListener('mousedown', function () { mouse.down = true; });
    window.addEventListener('mouseup', function () { mouse.down = false; });

    canvas.addEventListener('mousemove', function (e) {
        if (typeof e.clientX === 'number' && typeof e.clientY === 'number' && (e.clientX || e.clientY)) {
            var r = canvas.getBoundingClientRect();
            mouse.x = (e.clientX - r.left) * DPR;
            mouse.y = (e.clientY - r.top) * DPR;
            vCursor.active = false;
        } else if (typeof e.movementX === 'number' || typeof e.movementY === 'number') {
            if (!vCursor.active) {
                vCursor.active = true;
                vCursor.x = canvas.width / 2;
                vCursor.y = canvas.height / 2;
            }
            vCursor.x = clamp(vCursor.x + (e.movementX || 0) * 1.15, 0, canvas.width);
            vCursor.y = clamp(vCursor.y + (e.movementY || 0) * 1.15, 0, canvas.height);
            mouse.x = vCursor.x;
            mouse.y = vCursor.y;
        }
    });
    // ===== World =====
    var WORLD = { w: 5200, h: 5200 };
    var camera = { x: 0, y: 0, shake: 0 };

    function worldToScreen(x, y) {
        return { x: (x - camera.x) + canvas.width / 2, y: (y - camera.y) + canvas.height / 2 };
    }

    function screenToWorld(x, y) {
        return { x: (x - canvas.width / 2) + camera.x, y: (y - canvas.height / 2) + camera.y };
    }

    // ===== Progression =====
    var statDefs = [
        { key: 'maxHp', code: 'Digit1', max: 7 },
        { key: 'regen', code: 'Digit2', max: 7 },
        { key: 'move', code: 'Digit3', max: 7 },
        { key: 'dmg', code: 'Digit4', max: 7 },
        { key: 'pen', code: 'Digit5', max: 7 },
        { key: 'bspd', code: 'Digit6', max: 7 },
        { key: 'rld', code: 'Digit7', max: 7 },
        { key: 'body', code: 'Digit8', max: 7 },
    ];

    function makeStats() {
        var s = Object.create(null);
        for (var i = 0; i < statDefs.length; i++) s[statDefs[i].key] = 0;
        return s;
    }

    function makeGun(spread, length, width, offset, bulletScale) {
        return { spread: spread, length: length, width: width, offset: offset || 0, bulletScale: bulletScale || 1 };
    }

    // ===== Tank Types =====
    var TANKS = {
        wretch: {
            name: 'Wretch',
            base: { hp: 120, regen: 2.2, speed: 3.4, dmg: 18, pen: 1.0, bspd: 9.0, rld: 0.22, body: 26, fov: 1.0 },
            guns: [makeGun(0.04, 22, 10, 0, 1)],
            alt: function (p) { // E: fear pulse knocks back nearby husks and shapes
                if (p.altCd > 0) return;
                p.altCd = 8.0;
                p.pulse = 0.45;
                spawnRing(p.x, p.y, 0, 260, 'rgba(102,255,204,0.35)');
            },
            next: ['twincoffin', 'bellmortar', 'lanterntrapper'],
        },
        twincoffin: {
            name: 'Twin Coffin',
            base: { hp: 150, regen: 2.6, speed: 3.2, dmg: 16, pen: 1.1, bspd: 9.2, rld: 0.16, body: 30, fov: 1.02 },
            guns: [makeGun(0.05, 22, 10, -10, 0.95), makeGun(0.05, 22, 10, 10, 0.95)],
            alt: function (p) { // E: short burst window
                if (p.altCd > 0) return;
                p.altCd = 9.0;
                p.burstBoost = 0.9;
            },
            next: ['ivoryreaper', 'needlepriest'],
        },
        bellmortar: {
            name: 'Bell Mortar',
            base: { hp: 170, regen: 2.4, speed: 2.9, dmg: 38, pen: 1.6, bspd: 7.0, rld: 0.40, body: 34, fov: 1.05 },
            guns: [makeGun(0.02, 26, 12, 0, 1.4)],
            alt: function (p) { // E: curse shell
                if (p.altCd > 0) return;
                p.altCd = 10.0;
                fireSpecial(p, { kind: 'curse', scale: 2.1, dmgMul: 2.0, spdMul: 0.75, penMul: 2.5 });
            },
            next: ['ivoryreaper', 'needlepriest'],
        },
        lanterntrapper: {
            name: 'Lantern Trapper',
            base: { hp: 160, regen: 2.8, speed: 3.0, dmg: 14, pen: 0.8, bspd: 8.4, rld: 0.24, body: 28, fov: 1.08 },
            guns: [makeGun(0.06, 20, 10, 0, 0.9)],
            alt: function (p) { // E: drop lantern mine
                if (p.altCd > 0) return;
                p.altCd = 4.5;
                mines.push({ x: p.x, y: p.y, life: 18.0, arm: 0.4, dmg: 42 + p.final.dmg * 0.55 });
                spawnPuff(p.x, p.y, 12, 'rgba(102,255,204,0.14)');
            },
            next: ['ivoryreaper', 'needlepriest'],
        },
        ivoryreaper: {
            name: 'Ivory Reaper',
            base: { hp: 230, regen: 3.0, speed: 2.8, dmg: 30, pen: 1.9, bspd: 8.2, rld: 0.19, body: 44, fov: 1.12 },
            guns: [makeGun(0.03, 26, 12, 0, 1.15)],
            alt: function (p) { // E: siphon (bullets heal you on hit)
                if (p.altCd > 0) return;
                p.altCd = 10.0;
                p.siphon = 4.5;
                spawnRing(p.x, p.y, 0, 180, 'rgba(255,255,255,0.14)');
            },
            next: [],
        },
        needlepriest: {
            name: 'Needle Priest',
            base: { hp: 160, regen: 2.6, speed: 3.3, dmg: 11, pen: 0.85, bspd: 11.0, rld: 0.08, body: 26, fov: 1.15 },
            guns: [makeGun(0.14, 18, 9, 0, 0.75)],
            alt: function (p) { // E: needle storm
                if (p.altCd > 0) return;
                p.altCd = 11.5;
                p.storm = 0.85;
                spawnRing(p.x, p.y, 0, 220, 'rgba(102,255,204,0.22)');
            },
            next: [],
        },
    };

    // ===== Entities =====
    var shapes = [];
    var bullets = [];
    var mines = [];
    var husks = [];
    var fx = [];

    function xpForLevel(lv) { return Math.floor(18 + lv * lv * 2.6); }

    function recalcFinal(p) {
        var st = p.stats;
        var b = p.tank.base;
        var f = p.final || {};
        f.maxHp = b.hp * (1 + 0.08 * st.maxHp);
        f.regen = b.regen * (1 + 0.13 * st.regen);
        f.speed = b.speed * (1 + 0.06 * st.move);
        f.dmg = b.dmg * (1 + 0.10 * st.dmg);
        f.pen = b.pen * (1 + 0.13 * st.pen);
        f.bspd = b.bspd * (1 + 0.09 * st.bspd);
        f.rld = Math.max(0.045, b.rld * (1 - 0.06 * st.rld));
        f.body = b.body * (1 + 0.10 * st.body);
        f.radius = 26 + p.level * 0.13;
        f.fov = b.fov || 1.0;
        p.final = f;
        p.maxHp = f.maxHp;
    }

    function makeTankEntity(opts, isBot) {
        var tid = opts.tankId || 'wretch';
        var tt = TANKS[tid];
        var lvl = opts.level || 1;
        var e = {
            isPlayer: !!opts.isPlayer,
            tankId: tid,
            tank: tt,
            x: opts.x || 0,
            y: opts.y || 0,
            vx: 0,
            vy: 0,
            aim: opts.aim || 0,
            hp: tt.base.hp,
            level: lvl,
            xp: opts.xp || 0,
            xpNeed: xpForLevel(lvl),
            score: 0,
            pts: 0,
            stats: makeStats(),
            altCd: 0,
            pulse: 0,
            siphon: 0,
            storm: 0,
            burstBoost: 0,
            reloadT: 0,
            dead: false,
            ai: isBot ? (opts.ai || { think: 0, mode: 'hunt', target: null, strafe: 0 }) : null,
        };
        recalcFinal(e);
        e.hp = e.final.maxHp;
        return e;
    }

    function spawnPuff(x, y, count, col) {
        for (var i = 0; i < count; i++) {
            fx.push({ kind: 'puff', x: x, y: y, vx: rand(-1.5, 1.5), vy: rand(-1.5, 1.5), life: rand(0.35, 0.7), r: rand(2, 5), col: col });
        }
    }

    function spawnRing(x, y, r0, r1, col) {
        fx.push({ kind: 'ring', x: x, y: y, r0: r0, r1: r1, t: 0, life: 0.55, col: col });
    }

    function pickShapeKind() {
        var r = Math.random();
        if (r < 0.42) return 'bone';
        if (r < 0.78) return 'eye';
        if (r < 0.93) return 'shard';
        return 'skull';
    }

    function spawnShape(kind) {
        var s = kind === 'eye'
            ? { kind: 'eye', sides: 4, r: 16, hp: 42, xp: 14, score: 12, spin: rand(-1, 1), col: '#5eead4' }
            : kind === 'bone'
                ? { kind: 'bone', sides: 3, r: 14, hp: 28, xp: 10, score: 8, spin: rand(-1.4, 1.4), col: '#86efac' }
                : kind === 'skull'
                    ? { kind: 'skull', sides: 5, r: 20, hp: 78, xp: 26, score: 22, spin: rand(-0.9, 0.9), col: '#fca5a5' }
                    : { kind: 'shard', sides: 6, r: 18, hp: 58, xp: 18, score: 16, spin: rand(-1.1, 1.1), col: '#93c5fd' };

        var a = Math.random() * Math.PI * 2;
        var d = rand(700, 1500);
        s.x = clamp(camera.x + Math.cos(a) * d, -WORLD.w / 2 + 80, WORLD.w / 2 - 80);
        s.y = clamp(camera.y + Math.sin(a) * d, -WORLD.h / 2 + 80, WORLD.h / 2 - 80);
        s.vx = rand(-0.25, 0.25);
        s.vy = rand(-0.25, 0.25);
        s.rot = rand(0, Math.PI * 2);
        shapes.push(s);
    }

    function spawnHusk(level, nearPlayer) {
        var tnames = ['wretch', 'twincoffin', 'bellmortar', 'lanterntrapper'];
        var tid = tnames[clamp(irand(0, tnames.length - 1), 0, tnames.length - 1)];
        var a = Math.random() * Math.PI * 2;
        var d = nearPlayer ? rand(900, 1400) : rand(1400, 2200);
        var x = clamp(camera.x + Math.cos(a) * d, -WORLD.w / 2 + 120, WORLD.w / 2 - 120);
        var y = clamp(camera.y + Math.sin(a) * d, -WORLD.h / 2 + 120, WORLD.h / 2 - 120);
        husks.push(makeTankEntity({ isPlayer: false, tankId: tid, level: level, x: x, y: y, aim: rand(-Math.PI, Math.PI), ai: { think: 0, mode: 'hunt', target: null, strafe: rand(-1, 1) } }, true));
    }
    // ===== UI =====
    function updateHUD() {
        hudLv.textContent = String(player.level);
        hudXp.textContent = String(Math.floor(player.xp)) + '/' + String(player.xpNeed);
        hudTank.textContent = player.tank.name;
        hudScore.textContent = String(Math.floor(player.score));
        hudPts.textContent = String(player.pts);
        hudBest.textContent = String(bestScore);
    }

    function updateBarsUI() {
        if (!barsEl.__built) {
            barsEl.__built = true;
            barsEl.innerHTML = statDefs.map(function (d, idx) {
                return ''
                    + '<div class="bar" data-k="' + d.key + '">'
                    + '<div class="k">' + (idx + 1) + '</div>'
                    + '<div class="meter"><div></div></div>'
                    + '<div class="v">0/' + d.max + '</div>'
                    + '</div>';
            }).join('');
        }
        for (var i = 0; i < statDefs.length; i++) {
            var d = statDefs[i];
            var row = barsEl.querySelector('.bar[data-k="' + d.key + '"]');
            if (!row) continue;
            var v = player.stats[d.key] || 0;
            var meter = row.querySelector('.meter > div');
            var val = row.querySelector('.v');
            meter.style.width = ((v / d.max) * 100).toFixed(1) + '%';
            val.textContent = v + '/' + d.max;
        }
    }

    function showEvolve(options) {
        evolveEl.style.display = 'block';
        choicesEl.innerHTML = options.map(function (o, idx) {
            return ''
                + '<div class="choice" data-id="' + o.id + '">'
                + '<div class="t"><span>' + o.name + '</span><span>#' + (idx + 1) + '</span></div>'
                + '<div class="d">' + o.desc + '</div>'
                + '<div class="hint">Click or press ' + (idx + 1) + '.</div>'
                + '</div>';
        }).join('');
        Array.prototype.forEach.call(choicesEl.querySelectorAll('.choice'), function (el) {
            el.addEventListener('click', function () { evolveTo(el.getAttribute('data-id')); });
        });
    }

    function hideEvolve() {
        evolveEl.style.display = 'none';
        choicesEl.innerHTML = '';
    }

    function evolveTo(tankId) {
        var nt = TANKS[tankId];
        if (!nt) return;
        player.tankId = tankId;
        player.tank = nt;
        recalcFinal(player);
        player.hp = Math.min(player.hp, player.final.maxHp);
        hideEvolve();
        updateHUD();
        updateBarsUI();
        spawnRing(player.x, player.y, 0, 260, 'rgba(102,255,204,0.22)');
    }

    function maybeOfferEvolution() {
        if (!player.tank.next || !player.tank.next.length) return;
        if (player.level === 10 || player.level === 20 || player.level === 30) {
            var nextIds = player.tank.next.slice(0);
            var picks = [];
            while (picks.length < 3 && nextIds.length) {
                var idx = irand(0, nextIds.length - 1);
                picks.push(nextIds.splice(idx, 1)[0]);
            }
            var options = picks.map(function (id) {
                var tt = TANKS[id];
                var desc = id === 'twincoffin'
                    ? 'Twin barrels. Reliable DPS. Alt: burst.'
                    : id === 'bellmortar'
                        ? 'Heavy shells. Brutal hits. Alt: curse shell.'
                        : id === 'lanterntrapper'
                            ? 'Mines and control. Alt: lantern mine.'
                            : id === 'ivoryreaper'
                                ? 'Big scythe shots. Alt: siphon.'
                                : 'Needle firehose. Alt: storm.';
                return { id: id, name: tt.name, desc: desc };
            });
            showEvolve(options);
        }
    }

    function tryUpgrade(statKey) {
        if (player.pts <= 0) return false;
        var def = null;
        for (var i = 0; i < statDefs.length; i++) if (statDefs[i].key === statKey) def = statDefs[i];
        if (!def) return false;
        var v = player.stats[statKey] || 0;
        if (v >= def.max) return false;
        player.stats[statKey] = v + 1;
        player.pts--;
        var hpPct = player.hp / Math.max(1, player.maxHp);
        recalcFinal(player);
        player.hp = clamp(player.final.maxHp * hpPct, 1, player.final.maxHp);
        updateHUD();
        updateBarsUI();
        return true;
    }

    // ===== Combat =====
    function getAimAngle(p) {
        var aimW = screenToWorld(mouse.x, mouse.y);
        return Math.atan2(aimW.y - p.y, aimW.x - p.x);
    }

    function fireBullet(p, gun, ang, scale, kind) {
        var f = p.final;
        var muzzle = f.radius + gun.length * 0.6;
        var ox = Math.cos(ang) * muzzle - Math.sin(ang) * (gun.offset || 0);
        var oy = Math.sin(ang) * muzzle + Math.cos(ang) * (gun.offset || 0);
        var spd = f.bspd * (0.86 + Math.random() * 0.12);
        bullets.push({
            owner: p,
            x: p.x + ox,
            y: p.y + oy,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd,
            r: 6.5 * (gun.bulletScale || 1) * (scale || 1),
            dmg: f.dmg * (scale || 1),
            pen: f.pen * (scale || 1),
            life: 1.35,
            kind: kind || 'shot',
            col: (kind === 'curse') ? '#f472b6' : '#67e8f9'
        });
        // recoil
        var kick = 0.14 * (scale || 1);
        p.vx -= Math.cos(ang) * kick;
        p.vy -= Math.sin(ang) * kick;
    }

    function fireSpecial(p, spec) {
        var baseAng = getAimAngle(p);
        var gun = p.tank.guns[0];
        fireBullet(p, gun, baseAng, spec.scale || 1, spec.kind || 'curse');
        var b = bullets[bullets.length - 1];
        b.dmg = p.final.dmg * (spec.dmgMul || 1);
        b.pen = p.final.pen * (spec.penMul || 1);
        b.vx *= (spec.spdMul || 1);
        b.vy *= (spec.spdMul || 1);
        b.life = 1.75;
        b.r *= 1.18;
    }

    function explodeMine(m) {
        spawnRing(m.x, m.y, 0, 260, 'rgba(102,255,204,0.22)');
        spawnPuff(m.x, m.y, 30, 'rgba(102,255,204,0.10)');
        var rr = 220 * 220;
        for (var i = 0; i < husks.length; i++) {
            var h = husks[i];
            if (h.dead) continue;
            var d2 = dist2(h.x, h.y, m.x, m.y);
            if (d2 < rr) {
                var t = 1 - Math.sqrt(d2) / 220;
                h.hp -= m.dmg * (0.35 + 0.65 * t);
                var d = Math.max(1, Math.sqrt(d2));
                h.vx += (h.x - m.x) / d * 2.6;
                h.vy += (h.y - m.y) / d * 2.6;
            }
        }
        for (var j = 0; j < shapes.length; j++) {
            var s = shapes[j];
            var sd2 = dist2(s.x, s.y, m.x, m.y);
            if (sd2 < rr) s.hp -= m.dmg * 1.15;
        }
    }

    // ===== Run State =====
    var player = makeTankEntity({ isPlayer: true, tankId: 'wretch', x: 0, y: 0, level: 1 }, false);
    camera.x = player.x;
    camera.y = player.y;

    var paused = false;
    var running = false;
    var lastT = 0;

    var shapeBudget = 140;
    var nextHusk = 6.0;
    var difficulty = 0;

    function resetRun() {
        shapes.length = 0;
        bullets.length = 0;
        mines.length = 0;
        husks.length = 0;
        fx.length = 0;

        player = makeTankEntity({ isPlayer: true, tankId: 'wretch', x: 0, y: 0, level: 1 }, false);
        camera.x = player.x;
        camera.y = player.y;

        paused = false;
        lastT = 0;
        nextHusk = 6.0;
        difficulty = 0;

        for (var i = 0; i < shapeBudget; i++) spawnShape(pickShapeKind());
        for (var j = 0; j < 5; j++) spawnHusk(4, false);

        updateHUD();
        updateBarsUI();
        hideEvolve();
        dangerVignette.style.opacity = '0';
    }

    function awardKill(owner, xp, score) {
        if (!owner || owner.dead) return;
        owner.xp += xp;
        owner.score += score;
        if (owner.isPlayer) {
            while (owner.xp >= owner.xpNeed && owner.level < 45) {
                owner.xp -= owner.xpNeed;
                owner.level++;
                owner.pts++;
                owner.xpNeed = xpForLevel(owner.level);
                recalcFinal(owner);
                owner.hp = clamp(owner.hp + owner.final.maxHp * 0.08, 1, owner.final.maxHp);
                maybeOfferEvolution();
                updateBarsUI();
            }
        } else {
            owner.level = Math.min(45, owner.level + 0.15);
        }

        if (owner.isPlayer && owner.score > bestScore) {
            bestScore = Math.floor(owner.score);
            localStorage.setItem(bestKey, String(bestScore));
        }
    }

    function updateBot(b, dt) {
        b.ai.think -= dt;
        if (b.ai.think <= 0) {
            b.ai.think = rand(0.25, 0.6);
            var playerD2 = dist2(b.x, b.y, player.x, player.y);
            if (!player.dead && playerD2 < 1300 * 1300) {
                b.ai.mode = 'player';
                b.ai.target = player;
            } else {
                b.ai.mode = 'farm';
                var best = null, bestD = 1e18;
                for (var i = 0; i < shapes.length; i++) {
                    var s = shapes[i];
                    var d2 = dist2(b.x, b.y, s.x, s.y) - (s.kind === 'skull' ? 9000 : 0);
                    if (d2 < bestD) { bestD = d2; best = s; }
                }
                b.ai.target = best;
            }
            b.ai.strafe = rand(-1, 1);
        }

        var tx = 0, ty = 0;
        if (b.ai.target && !b.ai.target.dead) {
            tx = b.ai.target.x;
            ty = b.ai.target.y;
        }

        var dx = tx - b.x, dy = ty - b.y;
        var d = Math.max(1, hypot(dx, dy));
        var nx = dx / d, ny = dy / d;
        var desired = (b.ai.mode === 'player') ? 360 : 120;
        var steer = (d > desired) ? 1 : -1;
        var sp = b.final.speed * 60 * dt;
        var sx = -ny * b.ai.strafe;
        var sy = nx * b.ai.strafe;
        b.vx += (nx * steer + sx * 0.45) * sp;
        b.vy += (ny * steer + sy * 0.45) * sp;
        b.aim = Math.atan2(dy, dx);
        if (b.reloadT <= 0) {
            if (b.ai.mode === 'player' && d < 900 && Math.random() < 0.8) fireFromTank(b, dt);
            else if (b.ai.mode === 'farm' && d < 520 && Math.random() < 0.55) fireFromTank(b, dt);
        }
    }

    function fireFromTank(p, dt) {
        var rld = p.final.rld;
        if (p.burstBoost > 0) rld *= 0.55;
        if (p.storm > 0) rld *= 0.35;
        p.reloadT = rld;
        for (var gi = 0; gi < p.tank.guns.length; gi++) {
            var g = p.tank.guns[gi];
            var ang = p.aim + rand(-g.spread, g.spread);
            fireBullet(p, g, ang, 1, 'shot');
        }
    }

    function updateTank(p, dt, isPlayer) {
        if (p.dead) return;

        p.reloadT -= dt;
        p.altCd = Math.max(0, p.altCd - dt);
        p.pulse = Math.max(0, p.pulse - dt);
        p.siphon = Math.max(0, p.siphon - dt);
        p.storm = Math.max(0, p.storm - dt);
        p.burstBoost = Math.max(0, p.burstBoost - dt);

        p.hp = clamp(p.hp + p.final.regen * dt, 1, p.final.maxHp);

        if (isPlayer) {
            var ax = 0, ay = 0;
            if (keys.KeyW || keys.ArrowUp) ay -= 1;
            if (keys.KeyS || keys.ArrowDown) ay += 1;
            if (keys.KeyA || keys.ArrowLeft) ax -= 1;
            if (keys.KeyD || keys.ArrowRight) ax += 1;
            var m = hypot(ax, ay);
            if (m > 0) { ax /= m; ay /= m; }
            var sp = p.final.speed * 60 * dt;
            p.vx += ax * sp;
            p.vy += ay * sp;
            p.aim = getAimAngle(p);

            if (consume('KeyE')) {
                if (p.tank && p.tank.alt) p.tank.alt(p);
            }

            var wantFire = mouse.down || mouse.tap || keys.Space;
            if (wantFire && p.reloadT <= 0 && evolveEl.style.display !== 'block') fireFromTank(p, dt);
            mouse.tap = false;
        } else {
            updateBot(p, dt);
        }

        if (p.pulse > 0) {
            var pr = 260;
            var pr2 = pr * pr;
            for (var i = 0; i < husks.length; i++) {
                var h = husks[i];
                if (h.dead) continue;
                var d2 = dist2(h.x, h.y, p.x, p.y);
                if (d2 < pr2) {
                    var d = Math.max(1, Math.sqrt(d2));
                    h.vx += (h.x - p.x) / d * (7.5 * dt * 60);
                    h.vy += (h.y - p.y) / d * (7.5 * dt * 60);
                }
            }
            for (var j = 0; j < shapes.length; j++) {
                var s = shapes[j];
                var sd2 = dist2(s.x, s.y, p.x, p.y);
                if (sd2 < pr2) {
                    var dd = Math.max(1, Math.sqrt(sd2));
                    s.vx += (s.x - p.x) / dd * 0.06;
                    s.vy += (s.y - p.y) / dd * 0.06;
                }
            }
        }

        p.vx *= 0.90;
        p.vy *= 0.90;
        p.x = clamp(p.x + p.vx, -WORLD.w / 2 + 40, WORLD.w / 2 - 40);
        p.y = clamp(p.y + p.vy, -WORLD.h / 2 + 40, WORLD.h / 2 - 40);

        for (var si = shapes.length - 1; si >= 0; si--) {
            var s2 = shapes[si];
            var rr = p.final.radius + s2.r;
            var d2b = dist2(p.x, p.y, s2.x, s2.y);
            if (d2b < rr * rr) {
                var d = Math.max(1, Math.sqrt(d2b));
                var push = (rr - d) * 0.45;
                var nx = (p.x - s2.x) / d, ny = (p.y - s2.y) / d;
                p.x += nx * push;
                p.y += ny * push;
                s2.x -= nx * push * 0.6;
                s2.y -= ny * push * 0.6;
                s2.hp -= p.final.body * dt * 0.9;
                p.hp -= 0.45 * dt * (s2.kind === 'skull' ? 4.0 : 2.0);
                if (s2.hp <= 0) {
                    awardKill(p, s2.xp, s2.score);
                    shapes.splice(si, 1);
                }
            }
        }

        for (var hi = 0; hi < husks.length; hi++) {
            var o = husks[hi];
            if (o.dead || o === p) continue;
            var rr2 = p.final.radius + o.final.radius;
            var d2c = dist2(p.x, p.y, o.x, o.y);
            if (d2c < rr2 * rr2) {
                var dd2 = Math.max(1, Math.sqrt(d2c));
                var nx2 = (p.x - o.x) / dd2, ny2 = (p.y - o.y) / dd2;
                var push2 = (rr2 - dd2) * 0.36;
                p.x += nx2 * push2;
                p.y += ny2 * push2;
                o.x -= nx2 * push2;
                o.y -= ny2 * push2;
                var dps = (p.final.body + o.final.body) * 0.2;
                p.hp -= dps * dt * 0.65;
                o.hp -= dps * dt * 0.65;
            }
        }

        if (p.hp <= 0) {
            p.dead = true;
            if (p.isPlayer) endRun();
        }
    }

    function step(dt) {
        if (!running) return;
        if (paused) return;
        dt = clamp(dt, 0, 0.033);

        if (consume('Escape')) {
            paused = !paused;
            if (typeof GameUtils !== 'undefined') GameUtils.setState(paused ? GameUtils.STATE.PAUSED : GameUtils.STATE.PLAYING);
        }

        if (evolveEl.style.display === 'block') {
            if (consume('Digit1')) clickChoice(0);
            if (consume('Digit2')) clickChoice(1);
            if (consume('Digit3')) clickChoice(2);
        } else {
            if (consume('Digit1')) tryUpgrade('maxHp');
            if (consume('Digit2')) tryUpgrade('regen');
            if (consume('Digit3')) tryUpgrade('move');
            if (consume('Digit4')) tryUpgrade('dmg');
            if (consume('Digit5')) tryUpgrade('pen');
            if (consume('Digit6')) tryUpgrade('bspd');
            if (consume('Digit7')) tryUpgrade('rld');
            if (consume('Digit8')) tryUpgrade('body');
        }

        function clickChoice(i) {
            var el = choicesEl.querySelectorAll('.choice')[i];
            if (el) evolveTo(el.getAttribute('data-id'));
        }

        difficulty = Math.min(1, player.score / 12000);

        while (shapes.length < shapeBudget) spawnShape(pickShapeKind());
        nextHusk -= dt;
        if (nextHusk <= 0) {
            nextHusk = lerp(10.0, 4.6, difficulty) + rand(-1.0, 1.0);
            spawnHusk(Math.min(35, 4 + Math.floor(player.level * 0.55)), true);
        }

        updateTank(player, dt, true);
        for (var i = 0; i < husks.length; i++) updateTank(husks[i], dt, false);

        for (var bi = bullets.length - 1; bi >= 0; bi--) {
            var b = bullets[bi];
            b.life -= dt;
            b.x += b.vx * dt * 60;
            b.y += b.vy * dt * 60;
            if (b.x < -WORLD.w / 2 || b.x > WORLD.w / 2 || b.y < -WORLD.h / 2 || b.y > WORLD.h / 2) b.life = 0;

            for (var si = shapes.length - 1; si >= 0; si--) {
                var s = shapes[si];
                if (s.hp <= 0) continue;
                var r = s.r + b.r;
                if (dist2(b.x, b.y, s.x, s.y) < r * r) {
                    s.hp -= b.dmg;
                    b.pen -= 1;
                    spawnPuff(b.x, b.y, 2, 'rgba(255,255,255,0.08)');
                    if (s.hp <= 0) {
                        awardKill(b.owner, s.xp, s.score);
                        spawnPuff(s.x, s.y, 12, 'rgba(102,255,204,0.12)');
                    }
                    if (b.pen <= 0) { b.life = 0; break; }
                }
            }
            if (b.life <= 0) { bullets.splice(bi, 1); continue; }

            for (var ti = 0; ti < husks.length; ti++) {
                var h = husks[ti];
                if (h.dead || h === b.owner) continue;
                var rr = (h.final.radius + b.r);
                if (dist2(b.x, b.y, h.x, h.y) < rr * rr) {
                    var dmg = b.dmg;
                    h.hp -= dmg;
                    b.pen -= 1.0;
                    spawnPuff(b.x, b.y, 4, 'rgba(244,114,182,0.08)');
                    if (b.owner && b.owner.siphon > 0) b.owner.hp = clamp(b.owner.hp + dmg * 0.22, 1, b.owner.final.maxHp);
                    if (h.hp <= 0) {
                        h.dead = true;
                        awardKill(b.owner, 40 + h.level * 6, 70 + h.level * 10);
                        spawnRing(h.x, h.y, 0, 260, 'rgba(244,114,182,0.22)');
                    }
                    if (b.pen <= 0) { b.life = 0; break; }
                }
            }
            if (b.life <= 0) bullets.splice(bi, 1);
        }

        for (var mi = mines.length - 1; mi >= 0; mi--) {
            var m = mines[mi];
            m.life -= dt;
            m.arm -= dt;
            if (m.life <= 0) { mines.splice(mi, 1); continue; }
            if (m.arm > 0) continue;
            var rr2 = 44 * 44;
            for (var hi = 0; hi < husks.length; hi++) {
                var hh = husks[hi];
                if (hh.dead) continue;
                if (dist2(hh.x, hh.y, m.x, m.y) < rr2) {
                    explodeMine(m);
                    mines.splice(mi, 1);
                    break;
                }
            }
        }

        for (var sidx = shapes.length - 1; sidx >= 0; sidx--) {
            var sh = shapes[sidx];
            sh.rot += sh.spin * dt;
            sh.x += sh.vx;
            sh.y += sh.vy;
            if (sh.x < -WORLD.w / 2 + 40) sh.vx = Math.abs(sh.vx) + 0.05;
            if (sh.x > WORLD.w / 2 - 40) sh.vx = -Math.abs(sh.vx) - 0.05;
            if (sh.y < -WORLD.h / 2 + 40) sh.vy = Math.abs(sh.vy) + 0.05;
            if (sh.y > WORLD.h / 2 - 40) sh.vy = -Math.abs(sh.vy) - 0.05;
            if (sh.hp <= 0) shapes.splice(sidx, 1);
        }

        for (var fi = fx.length - 1; fi >= 0; fi--) {
            var f = fx[fi];
            f.life -= dt;
            if (f.kind === 'puff') {
                f.x += f.vx;
                f.y += f.vy;
                f.vx *= 0.96;
                f.vy *= 0.96;
            } else if (f.kind === 'ring') {
                f.t += dt;
            }
            if (f.life <= 0) fx.splice(fi, 1);
        }

        for (var hi2 = husks.length - 1; hi2 >= 0; hi2--) {
            var hu = husks[hi2];
            if (!hu.dead) continue;
            if (dist2(hu.x, hu.y, camera.x, camera.y) > 2200 * 2200) husks.splice(hi2, 1);
        }

        var aim = getAimAngle(player);
        var lead = 90 * player.final.fov;
        var tx = player.x + Math.cos(aim) * lead;
        var ty = player.y + Math.sin(aim) * lead;
        camera.x = lerp(camera.x, tx, 0.10);
        camera.y = lerp(camera.y, ty, 0.10);

        var hpPct = player.hp / Math.max(1, player.final.maxHp);
        dangerVignette.style.opacity = String(clamp((0.45 - hpPct) / 0.45, 0, 1));

        updateHUD();
        render();
    }

    function endRun() {
        running = false;
        hudWrap.style.display = 'none';
        document.getElementById('final-stats').textContent = 'Score: ' + Math.floor(player.score) + ' \u2022 Level: ' + player.level + ' \u2022 Best: ' + bestScore;
        gameOverScreen.style.display = 'flex';
    }
    // ===== Rendering =====
    function render() {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = '#020303';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        var shake = camera.shake;
        camera.shake *= 0.9;
        var ox = (Math.random() - 0.5) * shake;
        var oy = (Math.random() - 0.5) * shake;
        ctx.translate(ox, oy);

        drawBackground();
        drawShapes();
        drawMines();
        drawBullets();
        drawTank(player, true);
        for (var i = 0; i < husks.length; i++) drawTank(husks[i], false);
        drawFx();
        drawFog();
    }

    function drawBackground() {
        var grid = 90 * DPR;
        var base = worldToScreen(0, 0);
        var gx0 = ((base.x % grid) + grid) % grid;
        var gy0 = ((base.y % grid) + grid) % grid;

        ctx.strokeStyle = 'rgba(102,255,204,0.06)';
        ctx.lineWidth = 1;
        for (var x = gx0; x < canvas.width; x += grid) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
        }
        for (var y = gy0; y < canvas.height; y += grid) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
        }

        var t = performance.now() * 0.00012;
        for (var i = 0; i < 4; i++) {
            var x0 = canvas.width * (0.2 + i * 0.2) + Math.sin(t + i) * 120 * DPR;
            var y0 = canvas.height * (0.25 + i * 0.18) + Math.cos(t * 1.3 + i * 1.7) * 110 * DPR;
            var r = (220 + i * 40) * DPR;
            var g = ctx.createRadialGradient(x0, y0, 0, x0, y0, r);
            g.addColorStop(0, 'rgba(102,255,204,0.03)');
            g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(x0, y0, r, 0, Math.PI * 2); ctx.fill();
        }
    }

    function drawShapes() {
        for (var i = 0; i < shapes.length; i++) {
            var s = shapes[i];
            var sc = worldToScreen(s.x, s.y);
            if (sc.x < -80 || sc.y < -80 || sc.x > canvas.width + 80 || sc.y > canvas.height + 80) continue;
            drawPoly(sc.x, sc.y, s.r, s.sides, s.rot, s.col, s.hp);
        }
    }

    function drawPoly(x, y, r, sides, rot, col, hp) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);

        ctx.beginPath();
        for (var i = 0; i < sides; i++) {
            var a = (i / sides) * Math.PI * 2;
            var px = Math.cos(a) * r;
            var py = Math.sin(a) * r;
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();

        ctx.fillStyle = 'rgba(255,255,255,0.03)';
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = col;
        ctx.stroke();

        if (sides === 4) {
            ctx.fillStyle = 'rgba(0,0,0,0.55)';
            ctx.beginPath();
            ctx.arc(r * 0.12, 0, r * 0.22, 0, Math.PI * 2);
            ctx.fill();
        }

        var hpPct = clamp(hp / 90, 0, 1);
        ctx.globalAlpha = 0.75;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(-r, r + 6, r * 2, 4);
        ctx.fillStyle = 'rgba(102,255,204,0.8)';
        ctx.fillRect(-r, r + 6, r * 2 * hpPct, 4);
        ctx.restore();
    }

    function drawTank(t, isPlayer) {
        if (t.dead) return;
        var sc = worldToScreen(t.x, t.y);
        if (sc.x < -120 || sc.y < -120 || sc.x > canvas.width + 120 || sc.y > canvas.height + 120) return;

        var r = t.final.radius;
        var ang = t.aim;
        ctx.save();
        ctx.translate(sc.x, sc.y);

        ctx.globalAlpha = isPlayer ? 1 : 0.92;
        ctx.shadowBlur = isPlayer ? 26 : 16;
        ctx.shadowColor = isPlayer ? 'rgba(102,255,204,0.28)' : 'rgba(244,114,182,0.18)';

        var bodyCol = isPlayer ? '#66ffcc' : '#f472b6';
        var rimCol = isPlayer ? '#1bb9a4' : '#c026d3';
        var fill = ctx.createRadialGradient(0, 0, r * 0.1, 0, 0, r * 1.35);
        fill.addColorStop(0, 'rgba(255,255,255,0.08)');
        fill.addColorStop(1, 'rgba(0,0,0,0.35)');

        ctx.fillStyle = fill;
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = bodyCol;
        ctx.stroke();

        ctx.lineWidth = 1.5;
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.beginPath(); ctx.arc(0, 0, r * 0.72, 0, Math.PI * 2); ctx.stroke();

        ctx.rotate(ang);
        for (var gi = 0; gi < t.tank.guns.length; gi++) {
            var g = t.tank.guns[gi];
            ctx.save();
            ctx.translate(0, g.offset || 0);
            ctx.fillStyle = 'rgba(0,0,0,0.55)';
            ctx.fillRect(r * 0.35, -(g.width / 2), g.length, g.width);
            ctx.strokeStyle = rimCol;
            ctx.lineWidth = 2;
            ctx.strokeRect(r * 0.35, -(g.width / 2), g.length, g.width);
            ctx.restore();
        }
        ctx.rotate(-ang);

        var hpPct = t.hp / Math.max(1, t.final.maxHp);
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(-r, r + 12, r * 2, 6);
        ctx.fillStyle = (hpPct < 0.35) ? 'rgba(255,40,40,0.85)' : 'rgba(102,255,204,0.85)';
        ctx.fillRect(-r, r + 12, r * 2 * clamp(hpPct, 0, 1), 6);

        ctx.restore();
    }

    function drawBullets() {
        for (var i = 0; i < bullets.length; i++) {
            var b = bullets[i];
            var sc = worldToScreen(b.x, b.y);
            if (sc.x < -60 || sc.y < -60 || sc.x > canvas.width + 60 || sc.y > canvas.height + 60) continue;
            ctx.save();
            ctx.translate(sc.x, sc.y);
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.beginPath(); ctx.arc(0, 0, b.r + 2, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = b.col;
            ctx.beginPath(); ctx.arc(0, 0, b.r, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }
    }

    function drawMines() {
        for (var i = 0; i < mines.length; i++) {
            var m = mines[i];
            var sc = worldToScreen(m.x, m.y);
            if (sc.x < -60 || sc.y < -60 || sc.x > canvas.width + 60 || sc.y > canvas.height + 60) continue;
            var t = clamp(1 - m.life / 18.0, 0, 1);
            ctx.save();
            ctx.translate(sc.x, sc.y);
            ctx.globalAlpha = m.arm > 0 ? 0.4 : 0.9;
            ctx.strokeStyle = 'rgba(102,255,204,0.55)';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.stroke();
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(102,255,204,0.25)';
            ctx.beginPath(); ctx.arc(0, 0, 6 + Math.sin(performance.now() * 0.006 + t * 6) * 1.8, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }
    }

    function drawFx() {
        for (var i = 0; i < fx.length; i++) {
            var f = fx[i];
            var sc = worldToScreen(f.x, f.y);
            if (f.kind === 'puff') {
                var a = clamp(f.life / 0.7, 0, 1);
                ctx.globalAlpha = a;
                ctx.fillStyle = f.col;
                ctx.beginPath(); ctx.arc(sc.x, sc.y, f.r, 0, Math.PI * 2); ctx.fill();
                ctx.globalAlpha = 1;
            } else if (f.kind === 'ring') {
                var tt = clamp(1 - f.life / 0.55, 0, 1);
                var rr = lerp(f.r0, f.r1, tt);
                ctx.globalAlpha = 1 - tt;
                ctx.strokeStyle = f.col;
                ctx.lineWidth = 3;
                ctx.beginPath(); ctx.arc(sc.x, sc.y, rr, 0, Math.PI * 2); ctx.stroke();
                ctx.globalAlpha = 1;
            }
        }
    }

    function drawFog() {
        var g = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, canvas.width * 0.12, canvas.width / 2, canvas.height / 2, canvas.width * 0.62);
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(0.62, 'rgba(0,0,0,0.35)');
        g.addColorStop(1, 'rgba(0,0,0,0.86)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.globalAlpha = 0.06;
        ctx.fillStyle = '#66ffcc';
        var t = performance.now() * 0.002;
        for (var y = ((t * 10) % 14) * DPR; y < canvas.height; y += 14 * DPR) {
            ctx.fillRect(0, y, canvas.width, 1);
        }
        ctx.globalAlpha = 1;
    }
    // ===== Start / Loop =====
    function start() {
        startScreen.style.display = 'none';
        gameOverScreen.style.display = 'none';
        controlsOverlay.style.display = 'flex';
        hudWrap.style.display = 'none';
        resize();
        setTimeout(function () {
            controlsOverlay.style.display = 'none';
            hudWrap.style.display = 'block';
            resetRun();
            running = true;
            if (typeof GameUtils !== 'undefined') GameUtils.setState(GameUtils.STATE.PLAYING);
            lastT = performance.now();
            requestAnimationFrame(loop);
        }, 900);
    }

    function loop(t) {
        if (!running && gameOverScreen.style.display !== 'none') return;
        var dt = (t - lastT) / 1000;
        lastT = t;
        step(dt);
        requestAnimationFrame(loop);
    }

    startBtn.addEventListener('click', start);
    Array.prototype.forEach.call(document.querySelectorAll('#game-over-screen .play-btn'), function (btn) {
        btn.addEventListener('click', start);
    });

    canvas.addEventListener('click', function () {
        mouse.tap = true; // mobile bindings use click injection for attack
        if (canvas && typeof canvas.focus === 'function') canvas.focus();
    });
})();

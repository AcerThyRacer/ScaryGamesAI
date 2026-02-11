/* ============================================
   Zombie Horde — Tower Defense Horror Game
   OVERHAULED: 8 turrets, 15+ zombie types, upgrades,
   boss waves, abilities, maps, economy system
   Canvas 2D
   ============================================ */
(function () {
    'use strict';

    var canvas, ctx, W = 700, H = 700;
    var gameActive = false, lastTime = 0;

    // Game state
    var wave = 0, gold = 150, baseHP = 100, kills = 0;
    var zombies = [], turrets = [], bullets = [], particles = [];
    var selectedTool = 1;
    var waveTimer = 0, waveActive = false, zombiesLeft = 0;
    var mouseX = 0, mouseY = 0;
    var baseX, baseY, baseR = 30;
    var GRID = 35;
    var dayNight = 0;

    // ── NEW: Expanded Turrets ─────────────────────────
    var TOOLS = [
        null,
        { name: 'Turret', cost: 50, range: 120, rate: 1.2, damage: 8, color: '#4488aa', r: 12, desc: 'Basic shooter' },
        { name: 'Barricade', cost: 25, hp: 80, color: '#886633', r: 14, desc: 'Blocks zombies' },
        { name: 'Flame Tower', cost: 100, range: 80, rate: 0.8, damage: 15, color: '#cc4400', r: 14, desc: 'Area fire' },
        { name: 'Sniper', cost: 120, range: 200, rate: 0.4, damage: 40, color: '#2244aa', r: 10, desc: 'Long range' },
        { name: 'Tesla', cost: 150, range: 100, rate: 0.6, damage: 12, color: '#44ccff', r: 13, desc: 'Chain lightning' },
        { name: 'Slow Field', cost: 80, range: 90, rate: 0, damage: 0, color: '#8844cc', r: 12, desc: 'Slows zombies' },
        { name: 'Mine Layer', cost: 60, range: 60, rate: 1.5, damage: 30, color: '#aa4444', r: 10, desc: 'Drops mines' },
        { name: 'Healer', cost: 100, range: 80, rate: 0, damage: 0, color: '#44aa44', r: 11, desc: 'Heals barricades' },
    ];

    // ── NEW: Zombie Types ─────────────────────────────
    var ZOMBIE_TYPES = [
        { name: 'Walker', speed: 30, hp: 15, damage: 3, r: 8, color: '#448844', gold: 10 },
        { name: 'Runner', speed: 60, hp: 10, damage: 2, r: 7, color: '#44aa44', gold: 8 },
        { name: 'Brute', speed: 18, hp: 50, damage: 8, r: 14, color: '#335533', gold: 20 },
        { name: 'Spitter', speed: 25, hp: 12, damage: 5, r: 8, color: '#66aa22', gold: 12 },
        { name: 'Crawler', speed: 40, hp: 8, damage: 4, r: 6, color: '#558855', gold: 7 },
        { name: 'Exploder', speed: 35, hp: 20, damage: 15, r: 10, color: '#aa6622', gold: 15 },
        { name: 'Shield', speed: 22, hp: 35, damage: 4, r: 10, color: '#556655', gold: 18 },
        { name: 'Summoner', speed: 20, hp: 25, damage: 2, r: 9, color: '#885588', gold: 25 },
        { name: 'Ghost', speed: 45, hp: 10, damage: 6, r: 7, color: '#99aacc', gold: 14 },
        { name: 'Leaper', speed: 55, hp: 12, damage: 7, r: 8, color: '#449944', gold: 13 },
        { name: 'Acid', speed: 28, hp: 18, damage: 5, r: 9, color: '#22aa44', gold: 14 },
        { name: 'Armored', speed: 15, hp: 80, damage: 10, r: 12, color: '#444444', gold: 30 },
        { name: 'Phantom', speed: 50, hp: 8, damage: 8, r: 7, color: '#aabbdd', gold: 16 },
        { name: 'Berserker', speed: 20, hp: 30, damage: 12, r: 11, color: '#cc4444', gold: 22 },
        { name: 'Healer Z', speed: 18, hp: 15, damage: 2, r: 8, color: '#44cc44', gold: 20 },
    ];

    // ── NEW: Boss Types ───────────────────────────────
    var BOSS_TYPES = [
        { name: 'Zombie King', hp: 200, speed: 15, damage: 15, r: 22, color: '#664422', gold: 100, special: 'summon' },
        { name: 'Abomination', hp: 350, speed: 10, damage: 25, r: 28, color: '#443322', gold: 150, special: 'explode' },
        { name: 'Necromancer', hp: 150, speed: 20, damage: 10, r: 18, color: '#553366', gold: 200, special: 'revive' },
    ];

    // ── NEW: Upgrade System ───────────────────────────
    var turretUpgradeCost = 40;

    // ── NEW: Abilities ────────────────────────────────
    var abilities = {
        airstrike: { cooldown: 0, maxCooldown: 45, ready: true },
        repair: { cooldown: 0, maxCooldown: 30, ready: true },
        frenzy: { cooldown: 0, maxCooldown: 60, ready: true, active: false, timer: 0 },
    };

    // ── NEW: Stats ────────────────────────────────────
    var totalGoldEarned = 0;
    var bossesDefeated = 0;
    var turretsPlaced = 0;
    var bestWave = parseInt(localStorage.getItem('zombie_best_wave') || '0', 10);

    // Messages
    var msgText = '';
    var msgTimer2 = 0;
    function showMsg(text) { msgText = text; msgTimer2 = 2.5; }

    GameUtils.injectDifficultySelector('start-screen');
    GameUtils.initPause({
        onResume: function () { gameActive = true; lastTime = performance.now(); gameLoop(); },
        onRestart: restartGame
    });

    document.getElementById('start-btn').addEventListener('click', function () { HorrorAudio.init(); startGame(); });
    document.addEventListener('keydown', function (e) {
        if (e.code === 'Escape' && gameActive) { gameActive = false; GameUtils.pauseGame(); return; }
        var num = parseInt(e.key);
        if (num >= 1 && num <= 8) selectedTool = num;
        if (e.code === 'KeyZ' && gameActive) useAirstrike();
        if (e.code === 'KeyX' && gameActive) useRepair();
        if (e.code === 'KeyC' && gameActive) useFrenzy();
        if (e.code === 'KeyU' && gameActive) upgradeNearestTurret();
    });

    function upgradeNearestTurret() {
        var nearest = null, nearDist = 50;
        for (var i = 0; i < turrets.length; i++) {
            var t = turrets[i];
            var dx = mouseX - t.x, dy = mouseY - t.y;
            var d = Math.sqrt(dx * dx + dy * dy);
            if (d < nearDist) { nearest = t; nearDist = d; }
        }
        if (nearest && gold >= turretUpgradeCost && (nearest.level || 1) < 3) {
            gold -= turretUpgradeCost;
            nearest.level = (nearest.level || 1) + 1;
            nearest.damage = (nearest.damage || 0) * 1.4;
            nearest.range = (nearest.range || 0) * 1.15;
            nearest.rate = (nearest.rate || 0) * 1.2;
            showMsg('⬆ Turret upgraded to Lvl ' + nearest.level);
            HorrorAudio.playClick();
        }
    }

    function useAirstrike() {
        if (!abilities.airstrike.ready) return;
        abilities.airstrike.ready = false;
        abilities.airstrike.cooldown = abilities.airstrike.maxCooldown;
        showMsg('💥 AIRSTRIKE!');
        for (var i = zombies.length - 1; i >= 0; i--) {
            var dx = mouseX - zombies[i].x, dy = mouseY - zombies[i].y;
            if (Math.sqrt(dx * dx + dy * dy) < 100) {
                zombies[i].hp -= 50;
                spawnParticles(zombies[i].x, zombies[i].y, '#ff6600', 5);
            }
        }
        HorrorAudio.playHit();
    }

    function useRepair() {
        if (!abilities.repair.ready) return;
        abilities.repair.ready = false;
        abilities.repair.cooldown = abilities.repair.maxCooldown;
        baseHP = Math.min(100, baseHP + 25);
        showMsg('🔧 Base repaired +25 HP!');
        HorrorAudio.playCollect();
    }

    function useFrenzy() {
        if (!abilities.frenzy.ready) return;
        abilities.frenzy.ready = false;
        abilities.frenzy.cooldown = abilities.frenzy.maxCooldown;
        abilities.frenzy.active = true;
        abilities.frenzy.timer = 8;
        showMsg('🔥 FRENZY MODE! All turrets fire 2x faster!');
    }

    function startGame() {
        canvas = document.getElementById('game-canvas'); ctx = canvas.getContext('2d');
        canvas.width = W; canvas.height = H;
        baseX = W / 2; baseY = H / 2;
        canvas.addEventListener('mousemove', function (e) {
            var r = canvas.getBoundingClientRect();
            mouseX = (e.clientX - r.left) * (W / r.width);
            mouseY = (e.clientY - r.top) * (H / r.height);
        });
        canvas.addEventListener('click', function () { placeTower(); });

        document.getElementById('start-screen').style.display = 'none';
        var ctrl = document.getElementById('controls-overlay'); ctrl.style.display = 'flex';
        HorrorAudio.startDrone(45, 'dark');
        if (window.QualityFX) QualityFX.init2D(canvas, ctx);
        setTimeout(function () {
            ctrl.classList.add('hiding');
            setTimeout(function () {
                ctrl.style.display = 'none'; ctrl.classList.remove('hiding');
                resetState();
                gameActive = true; GameUtils.setState(GameUtils.STATE.PLAYING);
                document.getElementById('game-hud').style.display = 'flex';
                document.getElementById('back-link').style.display = 'none';
                startWave();
                lastTime = performance.now(); gameLoop();
            }, 800);
        }, 2500);
    }

    function resetState() {
        wave = 0; gold = 150; baseHP = 100; kills = 0;
        zombies = []; turrets = []; bullets = []; particles = [];
        waveTimer = 0; waveActive = false; dayNight = 0;
        totalGoldEarned = 0; bossesDefeated = 0; turretsPlaced = 0;
        abilities.airstrike.ready = true; abilities.airstrike.cooldown = 0;
        abilities.repair.ready = true; abilities.repair.cooldown = 0;
        abilities.frenzy.ready = true; abilities.frenzy.cooldown = 0; abilities.frenzy.active = false;
    }

    function restartGame() {
        resetState();
        document.getElementById('game-over-screen').style.display = 'none';
        document.getElementById('game-hud').style.display = 'flex';
        HorrorAudio.startDrone(45, 'dark');
        gameActive = true; GameUtils.setState(GameUtils.STATE.PLAYING);
        startWave();
        lastTime = performance.now(); gameLoop();
    }

    function startWave() {
        wave++;
        if (window.ChallengeManager) ChallengeManager.notify('zombie-horde', 'wave', wave);
        var count = 5 + wave * 3 + Math.floor(wave * wave * 0.2);
        zombiesLeft = count;
        waveTimer = 0;
        waveActive = true;
        dayNight = wave % 2 === 0 ? 1 : 0;
        showMsg('🧟 Wave ' + wave + ' — ' + count + ' zombies incoming!');

        // Boss every 5 waves
        var isBossWave = wave % 5 === 0;
        if (isBossWave) {
            var bossType = BOSS_TYPES[Math.min(Math.floor(wave / 5) - 1, BOSS_TYPES.length - 1)];
            setTimeout(function () {
                if (!gameActive) return;
                spawnBoss(bossType);
            }, 2000);
        }

        var spawnInterval = Math.max(0.2, 1.5 - wave * 0.06);
        for (var i = 0; i < count; i++) {
            (function (idx) {
                setTimeout(function () {
                    if (!gameActive) return;
                    spawnZombie();
                }, idx * spawnInterval * 1000);
            })(i);
        }
    }

    function spawnZombie() {
        var edge = Math.floor(Math.random() * 4);
        var x, y;
        if (edge === 0) { x = Math.random() * W; y = -20; }
        else if (edge === 1) { x = Math.random() * W; y = H + 20; }
        else if (edge === 2) { x = -20; y = Math.random() * H; }
        else { x = W + 20; y = Math.random() * H; }

        // Weight types by wave
        var availableTypes = ZOMBIE_TYPES.slice(0, Math.min(3 + Math.floor(wave / 2), ZOMBIE_TYPES.length));
        var type = availableTypes[Math.floor(Math.random() * availableTypes.length)];
        var diffMult = GameUtils.getMultiplier();

        zombies.push({
            x: x, y: y,
            speed: type.speed * diffMult * (0.9 + Math.random() * 0.2),
            hp: (type.hp + wave * 1.5) * diffMult,
            maxHp: (type.hp + wave * 1.5) * diffMult,
            damage: type.damage * diffMult,
            r: type.r, color: type.color,
            type: type.name, goldValue: type.gold,
            attackTimer: 0, slowed: false, slowTimer: 0,
            isBoss: false, special: null,
        });
    }

    function spawnBoss(bossType) {
        var edge = Math.floor(Math.random() * 4);
        var x, y;
        if (edge === 0) { x = W / 2; y = -30; }
        else if (edge === 1) { x = W / 2; y = H + 30; }
        else if (edge === 2) { x = -30; y = H / 2; }
        else { x = W + 30; y = H / 2; }

        var diffMult = GameUtils.getMultiplier();
        zombies.push({
            x: x, y: y,
            speed: bossType.speed * diffMult,
            hp: bossType.hp * diffMult,
            maxHp: bossType.hp * diffMult,
            damage: bossType.damage * diffMult,
            r: bossType.r, color: bossType.color,
            type: bossType.name, goldValue: bossType.gold,
            attackTimer: 0, slowed: false, slowTimer: 0,
            isBoss: true, special: bossType.special,
            specialTimer: 5,
        });
        zombiesLeft++;
        showMsg('⚠ BOSS: ' + bossType.name + '!');
        HorrorAudio.playJumpScare && HorrorAudio.playJumpScare();
    }

    function placeTower() {
        if (!gameActive) return;
        var tool = TOOLS[selectedTool];
        if (!tool || gold < tool.cost) return;
        var dx = mouseX - baseX, dy = mouseY - baseY;
        if (Math.sqrt(dx * dx + dy * dy) < 50) return;
        for (var i = 0; i < turrets.length; i++) {
            var tdx = mouseX - turrets[i].x, tdy = mouseY - turrets[i].y;
            if (Math.sqrt(tdx * tdx + tdy * tdy) < 30) return;
        }
        gold -= tool.cost;
        turrets.push({
            x: mouseX, y: mouseY,
            type: selectedTool,
            range: tool.range || 0,
            rate: tool.rate || 0,
            damage: tool.damage || 0,
            hp: tool.hp || 999,
            maxHp: tool.hp || 999,
            color: tool.color,
            r: tool.r,
            fireTimer: 0, angle: 0,
            level: 1, kills: 0,
        });
        HorrorAudio.playClick();
        turretsPlaced++;
        if (window.ChallengeManager) ChallengeManager.notify('zombie-horde', 'towers', 1);
        updateHUD();
    }

    function updateZombies(dt) {
        for (var i = zombies.length - 1; i >= 0; i--) {
            var z = zombies[i];

            // Slow effect
            if (z.slowed) { z.slowTimer -= dt; if (z.slowTimer <= 0) z.slowed = false; }
            var speedMult = z.slowed ? 0.4 : 1;

            var dx = baseX - z.x, dy = baseY - z.y;
            var dist = Math.sqrt(dx * dx + dy * dy);

            // Check barricade blocking
            var blocked = false;
            for (var t = 0; t < turrets.length; t++) {
                if (turrets[t].type === 2) {
                    var bx = turrets[t].x - z.x, by = turrets[t].y - z.y;
                    var bd = Math.sqrt(bx * bx + by * by);
                    if (bd < turrets[t].r + z.r + 5) {
                        blocked = true;
                        z.attackTimer -= dt;
                        if (z.attackTimer <= 0) {
                            z.attackTimer = 0.8;
                            turrets[t].hp -= z.damage;
                            spawnParticles(turrets[t].x, turrets[t].y, '#886633', 2);
                            if (turrets[t].hp <= 0) {
                                spawnParticles(turrets[t].x, turrets[t].y, '#886633', 8);
                                turrets.splice(t, 1);
                            }
                        }
                        break;
                    }
                }
            }

            if (!blocked && dist > baseR) {
                z.x += (dx / dist) * z.speed * speedMult * dt;
                z.y += (dy / dist) * z.speed * speedMult * dt;
            } else if (dist <= baseR + z.r) {
                z.attackTimer -= dt;
                if (z.attackTimer <= 0) {
                    z.attackTimer = z.isBoss ? 0.5 : 1;
                    baseHP -= z.damage;
                    HorrorAudio.playHit();
                    if (baseHP <= 0) { gameOver(); return; }
                }
            }

            // Boss special abilities
            if (z.isBoss && z.special) {
                z.specialTimer = (z.specialTimer || 5) - dt;
                if (z.specialTimer <= 0) {
                    z.specialTimer = 5;
                    if (z.special === 'summon') {
                        for (var s = 0; s < 3; s++) spawnZombie();
                        zombiesLeft += 3;
                        showMsg('👑 Boss summons minions!');
                    } else if (z.special === 'explode' && z.hp < z.maxHp * 0.5) {
                        // AoE damage to turrets
                        for (var t = 0; t < turrets.length; t++) {
                            var tx = turrets[t].x - z.x, ty = turrets[t].y - z.y;
                            if (Math.sqrt(tx * tx + ty * ty) < 80) turrets[t].hp -= 20;
                        }
                        spawnParticles(z.x, z.y, '#ff4400', 15);
                        showMsg('💥 Boss EXPLODES!');
                    } else if (z.special === 'revive') {
                        // Heal nearby zombies
                        for (var j = 0; j < zombies.length; j++) {
                            if (j === i) continue;
                            var rx = zombies[j].x - z.x, ry = zombies[j].y - z.y;
                            if (Math.sqrt(rx * rx + ry * ry) < 100) {
                                zombies[j].hp = Math.min(zombies[j].maxHp, zombies[j].hp + 10);
                            }
                        }
                        spawnParticles(z.x, z.y, '#44ff44', 8);
                        showMsg('💀 Boss heals zombies!');
                    }
                }
            }

            // Exploder type: explodes on death
            if (z.hp <= 0) {
                kills++;
                var goldReward = z.goldValue || 10;
                gold += goldReward;
                totalGoldEarned += goldReward;
                if (z.isBoss) { bossesDefeated++; showMsg('🏆 BOSS DEFEATED! +' + goldReward + ' gold!'); }
                if (z.type === 'Exploder') {
                    // AoE damage
                    for (var t = turrets.length - 1; t >= 0; t--) {
                        var ex = turrets[t].x - z.x, ey = turrets[t].y - z.y;
                        if (Math.sqrt(ex * ex + ey * ey) < 50) turrets[t].hp -= 15;
                    }
                    spawnParticles(z.x, z.y, '#ff8800', 12);
                }
                if (z.type === 'Summoner') {
                    for (var s = 0; s < 2; s++) {
                        zombies.push({
                            x: z.x + (Math.random() - 0.5) * 30, y: z.y + (Math.random() - 0.5) * 30,
                            speed: 30, hp: 8, maxHp: 8, damage: 2, r: 6, color: '#558855',
                            type: 'Crawler', goldValue: 5, attackTimer: 0, slowed: false, slowTimer: 0, isBoss: false, special: null,
                        });
                    }
                    zombiesLeft += 2;
                }
                if (window.ChallengeManager) ChallengeManager.notify('zombie-horde', 'kills', 1);
                spawnParticles(z.x, z.y, z.color, 6);
                HorrorAudio.playCollect();
                zombies.splice(i, 1);
                zombiesLeft--;
            }
        }

        // Clean dead turrets
        for (var t = turrets.length - 1; t >= 0; t--) {
            if (turrets[t].hp <= 0) {
                spawnParticles(turrets[t].x, turrets[t].y, turrets[t].color, 6);
                turrets.splice(t, 1);
            }
        }

        if (waveActive && zombies.length === 0 && zombiesLeft <= 0) {
            waveActive = false;
            var bonus = 30 + wave * 8;
            gold += bonus; totalGoldEarned += bonus;
            showMsg('✅ Wave ' + wave + ' complete! +' + bonus + ' gold');
            if (wave > bestWave) { bestWave = wave; localStorage.setItem('zombie_best_wave', String(bestWave)); }
            setTimeout(function () { if (gameActive) startWave(); }, 3000);
        }
    }

    function updateTurrets(dt) {
        var frenzyMult = abilities.frenzy.active ? 2 : 1;

        for (var i = 0; i < turrets.length; i++) {
            var t = turrets[i];
            if (t.type === 2) continue; // barricade

            // Slow Field — slows zombies, doesn't shoot
            if (t.type === 6) {
                for (var j = 0; j < zombies.length; j++) {
                    var dx = zombies[j].x - t.x, dy = zombies[j].y - t.y;
                    if (Math.sqrt(dx * dx + dy * dy) < t.range) { zombies[j].slowed = true; zombies[j].slowTimer = 1; }
                }
                continue;
            }
            // Healer — heals barricades
            if (t.type === 8) {
                for (var j = 0; j < turrets.length; j++) {
                    if (turrets[j].type === 2) {
                        var dx = turrets[j].x - t.x, dy = turrets[j].y - t.y;
                        if (Math.sqrt(dx * dx + dy * dy) < t.range) {
                            turrets[j].hp = Math.min(turrets[j].maxHp, turrets[j].hp + 5 * dt);
                        }
                    }
                }
                continue;
            }

            t.fireTimer -= dt * frenzyMult;
            if (t.fireTimer > 0) continue;

            var nearest = null, nearDist = Infinity;
            // Prioritize bosses
            for (var j = 0; j < zombies.length; j++) {
                var dx = zombies[j].x - t.x, dy = zombies[j].y - t.y;
                var d = Math.sqrt(dx * dx + dy * dy);
                if (d < t.range) {
                    if (zombies[j].isBoss) { nearest = zombies[j]; nearDist = d; break; }
                    if (d < nearDist) { nearest = zombies[j]; nearDist = d; }
                }
            }

            if (nearest) {
                t.fireTimer = 1 / (t.rate * frenzyMult);
                t.angle = Math.atan2(nearest.y - t.y, nearest.x - t.x);

                if (t.type === 3) { // Flame
                    for (var j = 0; j < zombies.length; j++) {
                        var dx = zombies[j].x - t.x, dy = zombies[j].y - t.y;
                        if (Math.sqrt(dx * dx + dy * dy) < t.range) zombies[j].hp -= t.damage * 0.4;
                    }
                    spawnParticles(t.x + Math.cos(t.angle) * 30, t.y + Math.sin(t.angle) * 30, '#ff6600', 4);
                } else if (t.type === 5) { // Tesla — chain
                    var hit = [nearest];
                    nearest.hp -= t.damage;
                    t.kills++;
                    var chainCount = 2 + (t.level || 1);
                    for (var c = 0; c < chainCount && hit.length > 0; c++) {
                        var lastHit = hit[hit.length - 1];
                        var nextTarget = null, nd2 = 60;
                        for (var j = 0; j < zombies.length; j++) {
                            if (hit.indexOf(zombies[j]) !== -1) continue;
                            var cx = zombies[j].x - lastHit.x, cy = zombies[j].y - lastHit.y;
                            var cd = Math.sqrt(cx * cx + cy * cy);
                            if (cd < nd2) { nextTarget = zombies[j]; nd2 = cd; }
                        }
                        if (nextTarget) { nextTarget.hp -= t.damage * 0.6; hit.push(nextTarget); }
                    }
                    spawnParticles(nearest.x, nearest.y, '#44ccff', 3);
                } else if (t.type === 7) { // Mine Layer
                    // Drop a mine
                    bullets.push({
                        x: t.x + Math.cos(t.angle) * 20, y: t.y + Math.sin(t.angle) * 20,
                        vx: 0, vy: 0, damage: t.damage, life: 10, isMine: true,
                    });
                } else { // Regular bullet
                    bullets.push({
                        x: t.x, y: t.y,
                        vx: Math.cos(t.angle) * 300, vy: Math.sin(t.angle) * 300,
                        damage: t.damage, life: 0.5, isMine: false,
                    });
                }
            }
        }
    }

    function updateBullets(dt) {
        for (var i = bullets.length - 1; i >= 0; i--) {
            var b = bullets[i];
            if (b.isMine) {
                b.life -= dt;
                if (b.life <= 0) { bullets.splice(i, 1); continue; }
                for (var j = 0; j < zombies.length; j++) {
                    var dx = zombies[j].x - b.x, dy = zombies[j].y - b.y;
                    if (Math.sqrt(dx * dx + dy * dy) < 15) {
                        // Explode
                        for (var k = 0; k < zombies.length; k++) {
                            var ex = zombies[k].x - b.x, ey = zombies[k].y - b.y;
                            if (Math.sqrt(ex * ex + ey * ey) < 35) zombies[k].hp -= b.damage;
                        }
                        spawnParticles(b.x, b.y, '#ff4400', 8);
                        HorrorAudio.playHit();
                        bullets.splice(i, 1); break;
                    }
                }
            } else {
                b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
                if (b.life <= 0 || b.x < 0 || b.x > W || b.y < 0 || b.y > H) { bullets.splice(i, 1); continue; }
                for (var j = 0; j < zombies.length; j++) {
                    var dx = zombies[j].x - b.x, dy = zombies[j].y - b.y;
                    if (Math.sqrt(dx * dx + dy * dy) < zombies[j].r + 3) {
                        zombies[j].hp -= b.damage;
                        spawnParticles(b.x, b.y, '#cc2222', 2);
                        bullets.splice(i, 1); break;
                    }
                }
            }
        }
    }

    function spawnParticles(x, y, color, count) {
        for (var i = 0; i < count; i++) particles.push({ x: x, y: y, vx: (Math.random() - 0.5) * 100, vy: (Math.random() - 0.5) * 100, life: 0.5 + Math.random() * 0.5, color: color, r: 2 + Math.random() * 3 });
    }

    function updateParticles(dt) {
        for (var i = particles.length - 1; i >= 0; i--) {
            var p = particles[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; p.r *= 0.98;
            if (p.life <= 0) particles.splice(i, 1);
        }
    }

    function updateAbilities(dt) {
        if (!abilities.airstrike.ready) { abilities.airstrike.cooldown -= dt; if (abilities.airstrike.cooldown <= 0) { abilities.airstrike.ready = true; showMsg('💥 Airstrike ready!'); } }
        if (!abilities.repair.ready) { abilities.repair.cooldown -= dt; if (abilities.repair.cooldown <= 0) { abilities.repair.ready = true; } }
        if (!abilities.frenzy.ready) { abilities.frenzy.cooldown -= dt; if (abilities.frenzy.cooldown <= 0) { abilities.frenzy.ready = true; } }
        if (abilities.frenzy.active) { abilities.frenzy.timer -= dt; if (abilities.frenzy.timer <= 0) abilities.frenzy.active = false; }

        // Healer zombie heals others
        for (var i = 0; i < zombies.length; i++) {
            if (zombies[i].type === 'Healer Z') {
                for (var j = 0; j < zombies.length; j++) {
                    if (j === i) continue;
                    var rx = zombies[j].x - zombies[i].x, ry = zombies[j].y - zombies[i].y;
                    if (Math.sqrt(rx * rx + ry * ry) < 40) zombies[j].hp = Math.min(zombies[j].maxHp, zombies[j].hp + 3 * dt);
                }
            }
        }
    }

    function updateHUD() {
        var h1 = document.getElementById('hud-wave'); if (h1) h1.textContent = '🧟 Wave: ' + wave + ' (Best: ' + bestWave + ')';
        var h2 = document.getElementById('hud-gold'); if (h2) h2.textContent = '💰 ' + gold;
        var h3 = document.getElementById('hud-hp'); if (h3) { h3.textContent = '🏠 ' + Math.max(0, Math.round(baseHP)) + '% | ☠ ' + kills; h3.style.color = baseHP < 30 ? '#ff3333' : ''; }
    }

    function gameOver() {
        gameActive = false; GameUtils.setState(GameUtils.STATE.GAME_OVER);
        HorrorAudio.playDeath(); HorrorAudio.stopDrone();
        if (wave > bestWave) { bestWave = wave; localStorage.setItem('zombie_best_wave', String(bestWave)); }
        var fs = document.getElementById('final-wave');
        if (fs) fs.textContent = 'Wave ' + wave + ' | Kills: ' + kills + ' | Gold earned: ' + totalGoldEarned + ' | Bosses: ' + bossesDefeated + ' | Best: ' + bestWave;
        document.getElementById('game-over-screen').style.display = 'flex';
        document.getElementById('game-hud').style.display = 'none';
        var btn = document.querySelector('#game-over-screen .play-btn'); if (btn) btn.onclick = restartGame;
    }

    function draw() {
        var nightAlpha = dayNight * 0.4;
        ctx.fillStyle = dayNight ? '#0a0f0a' : '#1a2a1a';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = 'rgba(30,50,30,0.3)';
        for (var x = 0; x < W; x += GRID) for (var y = 0; y < H; y += GRID) {
            if ((Math.floor(x / GRID) + Math.floor(y / GRID)) % 2 === 0) ctx.fillRect(x, y, GRID, GRID);
        }

        // Base
        ctx.fillStyle = '#4444aa'; ctx.shadowColor = '#4444ff'; ctx.shadowBlur = 15;
        ctx.beginPath(); ctx.arc(baseX, baseY, baseR, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
        ctx.fillStyle = '#6666cc'; ctx.font = '600 11px Inter, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('BASE', baseX, baseY + 4);
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(baseX - 25, baseY - 40, 50, 6);
        ctx.fillStyle = baseHP > 50 ? '#44aa44' : (baseHP > 25 ? '#aaaa44' : '#aa4444');
        ctx.fillRect(baseX - 25, baseY - 40, 50 * (baseHP / 100), 6);

        // Turrets
        for (var i = 0; i < turrets.length; i++) {
            var t = turrets[i]; ctx.fillStyle = t.color;
            if (t.type === 2) {
                ctx.fillRect(t.x - t.r, t.y - t.r, t.r * 2, t.r * 2);
                ctx.strokeStyle = '#aa8855'; ctx.lineWidth = 1; ctx.strokeRect(t.x - t.r, t.y - t.r, t.r * 2, t.r * 2);
                ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(t.x - 12, t.y - t.r - 6, 24, 4);
                ctx.fillStyle = '#886633'; ctx.fillRect(t.x - 12, t.y - t.r - 6, 24 * (t.hp / (t.maxHp || 80)), 4);
            } else {
                ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = '#222'; ctx.lineWidth = t.type === 4 ? 2 : 3;
                ctx.beginPath(); ctx.moveTo(t.x, t.y);
                ctx.lineTo(t.x + Math.cos(t.angle) * (t.type === 4 ? 22 : 18), t.y + Math.sin(t.angle) * (t.type === 4 ? 22 : 18));
                ctx.stroke();
                // Level indicator
                if ((t.level || 1) > 1) {
                    ctx.fillStyle = '#ffcc00'; ctx.font = '600 8px Inter'; ctx.textAlign = 'center';
                    ctx.fillText('★'.repeat(t.level - 1), t.x, t.y - t.r - 3);
                }
                // Slow field visual
                if (t.type === 6) {
                    ctx.strokeStyle = 'rgba(136,68,204,0.2)'; ctx.lineWidth = 0.5;
                    ctx.beginPath(); ctx.arc(t.x, t.y, t.range, 0, Math.PI * 2); ctx.stroke();
                    ctx.fillStyle = 'rgba(136,68,204,0.05)';
                    ctx.beginPath(); ctx.arc(t.x, t.y, t.range, 0, Math.PI * 2); ctx.fill();
                }
                // Tesla visual
                if (t.type === 5) { ctx.shadowColor = '#44ccff'; ctx.shadowBlur = 8; ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0; }
            }
        }

        // Mines
        for (var i = 0; i < bullets.length; i++) {
            var b = bullets[i];
            if (b.isMine) {
                ctx.fillStyle = '#aa4444'; ctx.beginPath(); ctx.arc(b.x, b.y, 5, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = '#ff4444'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.arc(b.x, b.y, 15, 0, Math.PI * 2); ctx.stroke();
            }
        }

        // Zombies
        for (var i = 0; i < zombies.length; i++) {
            var z = zombies[i];
            ctx.fillStyle = z.slowed ? '#8888cc' : z.color;
            ctx.shadowColor = z.isBoss ? '#ff0000' : (z.type === 'Runner' ? '#00ff00' : z.color); ctx.shadowBlur = z.isBoss ? 12 : 4;
            ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
            // Eyes
            var da = Math.atan2(baseY - z.y, baseX - z.x);
            ctx.fillStyle = z.type === 'Ghost' || z.type === 'Phantom' ? '#4444ff' : '#ff3333';
            ctx.beginPath(); ctx.arc(z.x + Math.cos(da - 0.3) * z.r * 0.5, z.y + Math.sin(da - 0.3) * z.r * 0.5, z.isBoss ? 3 : 2, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(z.x + Math.cos(da + 0.3) * z.r * 0.5, z.y + Math.sin(da + 0.3) * z.r * 0.5, z.isBoss ? 3 : 2, 0, Math.PI * 2); ctx.fill();
            // HP bar
            if (z.hp < z.maxHp) {
                var barW = z.isBoss ? 30 : 16;
                ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(z.x - barW / 2, z.y - z.r - 5, barW, 3);
                ctx.fillStyle = z.isBoss ? '#ff4444' : '#44aa44'; ctx.fillRect(z.x - barW / 2, z.y - z.r - 5, barW * (z.hp / z.maxHp), 3);
            }
            // Boss name
            if (z.isBoss) {
                ctx.fillStyle = '#ff4444'; ctx.font = '600 9px Inter'; ctx.textAlign = 'center';
                ctx.fillText(z.type, z.x, z.y - z.r - 8);
            }
        }

        // Bullets
        ctx.fillStyle = '#ffcc44';
        for (var i = 0; i < bullets.length; i++) {
            var b = bullets[i];
            if (!b.isMine) { ctx.shadowColor = '#ffcc44'; ctx.shadowBlur = 4; ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, Math.PI * 2); ctx.fill(); }
        }
        ctx.shadowBlur = 0;

        // Particles
        for (var i = 0; i < particles.length; i++) {
            var p = particles[i]; ctx.globalAlpha = Math.min(1, p.life * 2); ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Placement preview
        if (gameActive) {
            var tool = TOOLS[selectedTool];
            if (tool && gold >= tool.cost) {
                ctx.globalAlpha = 0.4; ctx.fillStyle = tool.color;
                if (selectedTool === 2) ctx.fillRect(mouseX - tool.r, mouseY - tool.r, tool.r * 2, tool.r * 2);
                else { ctx.beginPath(); ctx.arc(mouseX, mouseY, tool.r, 0, Math.PI * 2); ctx.fill(); }
                if (tool.range) { ctx.strokeStyle = tool.color; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.arc(mouseX, mouseY, tool.range, 0, Math.PI * 2); ctx.stroke(); }
                ctx.globalAlpha = 1;
            }
        }

        // Tool selector (2 rows of 4)
        ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, H - 70, W, 70);
        for (var i = 1; i <= 8; i++) {
            var t = TOOLS[i]; if (!t) continue;
            var row = i <= 4 ? 0 : 1;
            var col = ((i - 1) % 4);
            var tx = 10 + col * 175, ty = H - 66 + row * 33;
            ctx.fillStyle = i === selectedTool ? 'rgba(100,100,100,0.4)' : 'rgba(30,30,30,0.5)';
            ctx.fillRect(tx, ty, 160, 28);
            ctx.strokeStyle = i === selectedTool ? '#ffffff' : '#555'; ctx.lineWidth = 1;
            ctx.strokeRect(tx, ty, 160, 28);
            ctx.fillStyle = gold >= t.cost ? '#ffffff' : '#666'; ctx.font = '600 10px Inter, sans-serif'; ctx.textAlign = 'left';
            ctx.fillText('[' + i + '] ' + t.name + ' $' + t.cost, tx + 4, ty + 18);
        }

        // Abilities bar
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(W - 180, 0, 180, 25);
        ctx.font = '600 10px Inter'; ctx.textAlign = 'left';
        ctx.fillStyle = abilities.airstrike.ready ? '#ff8800' : '#555';
        ctx.fillText('[Z]💥' + (abilities.airstrike.ready ? '' : Math.round(abilities.airstrike.cooldown) + 's'), W - 175, 16);
        ctx.fillStyle = abilities.repair.ready ? '#44aa44' : '#555';
        ctx.fillText('[X]🔧' + (abilities.repair.ready ? '' : Math.round(abilities.repair.cooldown) + 's'), W - 120, 16);
        ctx.fillStyle = abilities.frenzy.ready ? '#ff4444' : (abilities.frenzy.active ? '#ffff44' : '#555');
        ctx.fillText('[C]🔥' + (abilities.frenzy.active ? Math.round(abilities.frenzy.timer) + 's' : (abilities.frenzy.ready ? '' : Math.round(abilities.frenzy.cooldown) + 's')), W - 65, 16);

        // Night overlay
        if (dayNight) { ctx.fillStyle = 'rgba(0,0,20,0.3)'; ctx.fillRect(0, 0, W, H); }

        // Vignette
        var vig = ctx.createRadialGradient(W / 2, H / 2, W * 0.25, W / 2, H / 2, W * 0.55);
        vig.addColorStop(0, 'transparent'); vig.addColorStop(1, 'rgba(0,0,0,0.5)');
        ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);

        // Message
        if (msgTimer2 > 0) {
            ctx.font = '700 16px Inter'; ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(255,200,50,' + Math.min(1, msgTimer2) + ')';
            ctx.shadowColor = '#ff8800'; ctx.shadowBlur = 10;
            ctx.fillText(msgText, W / 2, 80);
            ctx.shadowBlur = 0;
        }
    }

    function gameLoop(time) {
        if (!gameActive) return;
        requestAnimationFrame(gameLoop);
        if (!time) time = performance.now();
        var dt = Math.min((time - lastTime) / 1000, 0.1);
        lastTime = time;
        if (dt <= 0) return;

        updateZombies(dt);
        updateTurrets(dt);
        updateBullets(dt);
        updateParticles(dt);
        updateAbilities(dt);
        if (msgTimer2 > 0) msgTimer2 -= dt;
        draw();
        updateHUD();
    }
})();

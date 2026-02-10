/* ============================================
   Zombie Horde — Tower Defense Horror Game
   Canvas 2D
   ============================================ */
(function () {
    'use strict';

    var canvas, ctx, W = 700, H = 700;
    var gameActive = false, lastTime = 0;

    // Game state
    var wave = 0, gold = 100, baseHP = 100, kills = 0;
    var zombies = [], turrets = [], bullets = [], particles = [];
    var selectedTool = 1; // 1=turret, 2=barricade, 3=flame
    var waveTimer = 0, waveActive = false, zombiesLeft = 0;
    var mouseX = 0, mouseY = 0;
    var baseX, baseY, baseR = 30;
    var GRID = 35;
    var dayNight = 0; // 0=day, 1=night

    var TOOLS = [
        null,
        { name: 'Turret', cost: 50, range: 120, rate: 1.2, damage: 8, color: '#4488aa', r: 12 },
        { name: 'Barricade', cost: 25, hp: 80, color: '#886633', r: 14 },
        { name: 'Flame Tower', cost: 100, range: 80, rate: 0.8, damage: 15, color: '#cc4400', r: 14 },
    ];

    GameUtils.injectDifficultySelector('start-screen');
    GameUtils.initPause({
        onResume: function () { gameActive = true; lastTime = performance.now(); gameLoop(); },
        onRestart: restartGame
    });

    document.getElementById('start-btn').addEventListener('click', function () { HorrorAudio.init(); startGame(); });
    document.addEventListener('keydown', function (e) {
        if (e.code === 'Escape' && gameActive) { gameActive = false; GameUtils.pauseGame(); return; }
        if (e.key === '1') selectedTool = 1;
        if (e.key === '2') selectedTool = 2;
        if (e.key === '3') selectedTool = 3;
    });

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
        wave = 0; gold = 100; baseHP = 100; kills = 0;
        zombies = []; turrets = []; bullets = []; particles = [];
        waveTimer = 0; waveActive = false; dayNight = 0;
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
        var count = 5 + wave * 3;
        zombiesLeft = count;
        waveTimer = 0;
        waveActive = true;
        dayNight = wave % 2 === 0 ? 1 : 0; // alternating day/night
        // Spawn zombies over time
        var spawnInterval = Math.max(0.3, 1.5 - wave * 0.08);
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
        // Spawn from edges
        var edge = Math.floor(Math.random() * 4);
        var x, y;
        if (edge === 0) { x = Math.random() * W; y = -20; }
        else if (edge === 1) { x = Math.random() * W; y = H + 20; }
        else if (edge === 2) { x = -20; y = Math.random() * H; }
        else { x = W + 20; y = Math.random() * H; }

        var isFast = Math.random() < 0.15 + wave * 0.02;
        var isBig = !isFast && Math.random() < 0.1 + wave * 0.01;
        var diffMult = GameUtils.getMultiplier();

        zombies.push({
            x: x, y: y,
            speed: (isFast ? 50 : (isBig ? 20 : 30)) * diffMult,
            hp: (isBig ? 40 : 15) + wave * 2,
            maxHp: (isBig ? 40 : 15) + wave * 2,
            damage: isBig ? 8 : 3,
            r: isBig ? 14 : 8,
            color: isFast ? '#44aa44' : (isBig ? '#335533' : '#448844'),
            type: isFast ? 'fast' : (isBig ? 'big' : 'normal'),
            attackTimer: 0,
        });
    }

    function placeTower() {
        if (!gameActive) return;
        var tool = TOOLS[selectedTool];
        if (!tool || gold < tool.cost) return;
        // Check distance from base and other turrets
        var dx = mouseX - baseX, dy = mouseY - baseY;
        if (Math.sqrt(dx * dx + dy * dy) < 50) return; // too close to base
        for (var i = 0; i < turrets.length; i++) {
            var tdx = mouseX - turrets[i].x, tdy = mouseY - turrets[i].y;
            if (Math.sqrt(tdx * tdx + tdy * tdy) < 30) return; // too close to another
        }

        gold -= tool.cost;
        turrets.push({
            x: mouseX, y: mouseY,
            type: selectedTool,
            range: tool.range || 0,
            rate: tool.rate || 0,
            damage: tool.damage || 0,
            hp: tool.hp || 999,
            color: tool.color,
            r: tool.r,
            fireTimer: 0,
            angle: 0,
        });
        HorrorAudio.playClick();
        if (window.ChallengeManager) ChallengeManager.notify('zombie-horde', 'towers', 1);
        updateHUD();
    }

    function updateZombies(dt) {
        for (var i = zombies.length - 1; i >= 0; i--) {
            var z = zombies[i];
            // Move toward base
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
                            if (turrets[t].hp <= 0) {
                                turrets.splice(t, 1);
                                spawnParticles(z.x, z.y, '#886633', 5);
                            }
                        }
                        break;
                    }
                }
            }

            if (!blocked && dist > baseR) {
                z.x += (dx / dist) * z.speed * dt;
                z.y += (dy / dist) * z.speed * dt;
            } else if (dist <= baseR + z.r) {
                // Attacking base
                z.attackTimer -= dt;
                if (z.attackTimer <= 0) {
                    z.attackTimer = 1;
                    baseHP -= z.damage;
                    HorrorAudio.playHit();
                    if (baseHP <= 0) { gameOver(); return; }
                }
            }

            // Dead?
            if (z.hp <= 0) {
                kills++;
                if (window.ChallengeManager) ChallengeManager.notify('zombie-horde', 'kills', 1);
                gold += z.type === 'big' ? 15 : (z.type === 'fast' ? 8 : 10);
                spawnParticles(z.x, z.y, '#448844', 8);
                HorrorAudio.playCollect();
                zombies.splice(i, 1);
                zombiesLeft--;
            }
        }

        // Wave complete?
        if (waveActive && zombies.length === 0 && zombiesLeft <= 0) {
            waveActive = false;
            gold += 30 + wave * 5; // wave bonus
            setTimeout(function () { if (gameActive) startWave(); }, 3000);
        }
    }

    function updateTurrets(dt) {
        for (var i = 0; i < turrets.length; i++) {
            var t = turrets[i];
            if (t.type === 2) continue; // barricades don't shoot
            t.fireTimer -= dt;
            if (t.fireTimer > 0) continue;

            // Find nearest zombie in range
            var nearest = null, nearDist = Infinity;
            for (var j = 0; j < zombies.length; j++) {
                var dx = zombies[j].x - t.x, dy = zombies[j].y - t.y;
                var d = Math.sqrt(dx * dx + dy * dy);
                if (d < t.range && d < nearDist) { nearest = zombies[j]; nearDist = d; }
            }

            if (nearest) {
                t.fireTimer = 1 / t.rate;
                t.angle = Math.atan2(nearest.y - t.y, nearest.x - t.x);
                if (t.type === 3) {
                    // Flame: area damage
                    for (var j = 0; j < zombies.length; j++) {
                        var dx = zombies[j].x - t.x, dy = zombies[j].y - t.y;
                        if (Math.sqrt(dx * dx + dy * dy) < t.range) {
                            zombies[j].hp -= t.damage * 0.4;
                        }
                    }
                    spawnParticles(t.x + Math.cos(t.angle) * 30, t.y + Math.sin(t.angle) * 30, '#ff6600', 6);
                } else {
                    // Bullet
                    bullets.push({
                        x: t.x, y: t.y,
                        vx: Math.cos(t.angle) * 300,
                        vy: Math.sin(t.angle) * 300,
                        damage: t.damage,
                        life: 0.5,
                    });
                }
            }
        }
    }

    function updateBullets(dt) {
        for (var i = bullets.length - 1; i >= 0; i--) {
            var b = bullets[i];
            b.x += b.vx * dt; b.y += b.vy * dt;
            b.life -= dt;
            if (b.life <= 0 || b.x < 0 || b.x > W || b.y < 0 || b.y > H) { bullets.splice(i, 1); continue; }
            // Hit zombies
            for (var j = 0; j < zombies.length; j++) {
                var dx = zombies[j].x - b.x, dy = zombies[j].y - b.y;
                if (Math.sqrt(dx * dx + dy * dy) < zombies[j].r + 3) {
                    zombies[j].hp -= b.damage;
                    spawnParticles(b.x, b.y, '#cc2222', 3);
                    bullets.splice(i, 1); break;
                }
            }
        }
    }

    function spawnParticles(x, y, color, count) {
        for (var i = 0; i < count; i++) {
            particles.push({
                x: x, y: y,
                vx: (Math.random() - 0.5) * 100,
                vy: (Math.random() - 0.5) * 100,
                life: 0.5 + Math.random() * 0.5,
                color: color, r: 2 + Math.random() * 3,
            });
        }
    }

    function updateParticles(dt) {
        for (var i = particles.length - 1; i >= 0; i--) {
            var p = particles[i];
            p.x += p.vx * dt; p.y += p.vy * dt;
            p.life -= dt; p.r *= 0.98;
            if (p.life <= 0) particles.splice(i, 1);
        }
    }

    function updateHUD() {
        var h1 = document.getElementById('hud-wave'); if (h1) h1.textContent = 'Wave: ' + wave;
        var h2 = document.getElementById('hud-gold'); if (h2) h2.textContent = 'Gold: ' + gold;
        var h3 = document.getElementById('hud-hp'); if (h3) { h3.textContent = 'Base HP: ' + Math.max(0, Math.round(baseHP)); h3.style.color = baseHP < 30 ? '#ff3333' : ''; }
    }

    function gameOver() {
        gameActive = false; GameUtils.setState(GameUtils.STATE.GAME_OVER);
        HorrorAudio.playDeath(); HorrorAudio.stopDrone();
        document.getElementById('final-wave').textContent = 'Survived ' + (wave - 1) + ' waves | Kills: ' + kills;
        document.getElementById('game-over-screen').style.display = 'flex';
        document.getElementById('game-hud').style.display = 'none';
        var btn = document.querySelector('#game-over-screen .play-btn'); if (btn) btn.onclick = restartGame;
    }

    function draw() {
        // Background — ground
        var nightAlpha = dayNight * 0.4;
        ctx.fillStyle = dayNight ? '#0a0f0a' : '#1a2a1a';
        ctx.fillRect(0, 0, W, H);

        // Ground texture
        ctx.fillStyle = 'rgba(30,50,30,0.3)';
        for (var x = 0; x < W; x += GRID) for (var y = 0; y < H; y += GRID) {
            if ((Math.floor(x / GRID) + Math.floor(y / GRID)) % 2 === 0) ctx.fillRect(x, y, GRID, GRID);
        }

        // REAL RAYTRACING SHADOWS (Pro/Max Tier)
        if (window.QualityFX && window.QualityFX.isRT()) {
            ctx.save();
            ctx.fillStyle = 'rgba(0,0,0,0.6)'; // Shadow color

            // Cast shadows for each zombie away from base light
            for (var i = 0; i < zombies.length; i++) {
                var z = zombies[i];
                var dx = z.x - baseX, dy = z.y - baseY;
                var angle = Math.atan2(dy, dx);
                var dist = Math.sqrt(dx*dx + dy*dy);
                var shadowLen = (800 / dist) * 20; // Longer shadows when closer to light

                ctx.beginPath();
                ctx.moveTo(z.x + Math.cos(angle + 1.5) * z.r, z.y + Math.sin(angle + 1.5) * z.r);
                ctx.lineTo(z.x + Math.cos(angle) * shadowLen, z.y + Math.sin(angle) * shadowLen);
                ctx.lineTo(z.x + Math.cos(angle - 1.5) * z.r, z.y + Math.sin(angle - 1.5) * z.r);
                ctx.fill();
            }

            // Cast shadows from turrets if there are nearby zombies blocking them?
            // Too complex for 2D canvas without webgl.
            // Instead, just cast base shadows.
            ctx.restore();
        }

        // Base
        ctx.fillStyle = '#4444aa';
        ctx.shadowColor = '#4444ff'; ctx.shadowBlur = 15;
        ctx.beginPath(); ctx.arc(baseX, baseY, baseR, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#6666cc'; ctx.font = '600 12px Inter, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('BASE', baseX, baseY + 4);
        // HP bar on base
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(baseX - 25, baseY - 40, 50, 6);
        ctx.fillStyle = baseHP > 50 ? '#44aa44' : (baseHP > 25 ? '#aaaa44' : '#aa4444');
        ctx.fillRect(baseX - 25, baseY - 40, 50 * (baseHP / 100), 6);

        // Turrets
        for (var i = 0; i < turrets.length; i++) {
            var t = turrets[i];

            // RT Flashlight Cone
            if (window.QualityFX && window.QualityFX.isRT() && t.type !== 2) {
                ctx.save();
                var grd = ctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, t.range);
                grd.addColorStop(0, 'rgba(200,255,255,0.3)');
                grd.addColorStop(1, 'rgba(200,255,255,0)');
                ctx.fillStyle = grd;
                ctx.beginPath();
                ctx.moveTo(t.x, t.y);
                ctx.arc(t.x, t.y, t.range, t.angle - 0.3, t.angle + 0.3);
                ctx.fill();
                ctx.restore();
            }

            ctx.fillStyle = t.color;
            if (t.type === 2) {
                // Barricade
                ctx.fillRect(t.x - t.r, t.y - t.r, t.r * 2, t.r * 2);
                ctx.strokeStyle = '#aa8855'; ctx.lineWidth = 1; ctx.strokeRect(t.x - t.r, t.y - t.r, t.r * 2, t.r * 2);
                // HP bar
                ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(t.x - 12, t.y - t.r - 6, 24, 4);
                ctx.fillStyle = '#886633'; ctx.fillRect(t.x - 12, t.y - t.r - 6, 24 * (t.hp / (TOOLS[2].hp)), 4);
            } else {
                ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2); ctx.fill();
                // Barrel
                ctx.strokeStyle = '#222'; ctx.lineWidth = 3;
                ctx.beginPath(); ctx.moveTo(t.x, t.y);
                ctx.lineTo(t.x + Math.cos(t.angle) * 18, t.y + Math.sin(t.angle) * 18);
                ctx.stroke();
                // Range circle (faint)
                ctx.strokeStyle = 'rgba(100,100,100,0.1)'; ctx.lineWidth = 0.5;
                ctx.beginPath(); ctx.arc(t.x, t.y, t.range, 0, Math.PI * 2); ctx.stroke();
            }
        }

        // Zombies
        for (var i = 0; i < zombies.length; i++) {
            var z = zombies[i];
            ctx.fillStyle = z.color;
            ctx.shadowColor = z.type === 'fast' ? '#00ff00' : '#448844'; ctx.shadowBlur = 4;
            ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
            // Eyes
            var da = Math.atan2(baseY - z.y, baseX - z.x);
            ctx.fillStyle = '#ff3333';
            ctx.beginPath(); ctx.arc(z.x + Math.cos(da - 0.3) * z.r * 0.5, z.y + Math.sin(da - 0.3) * z.r * 0.5, 2, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(z.x + Math.cos(da + 0.3) * z.r * 0.5, z.y + Math.sin(da + 0.3) * z.r * 0.5, 2, 0, Math.PI * 2); ctx.fill();
            // HP bar
            if (z.hp < z.maxHp) {
                ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(z.x - 8, z.y - z.r - 5, 16, 3);
                ctx.fillStyle = '#44aa44'; ctx.fillRect(z.x - 8, z.y - z.r - 5, 16 * (z.hp / z.maxHp), 3);
            }
        }

        // Bullets
        ctx.fillStyle = '#ffcc44';
        for (var i = 0; i < bullets.length; i++) {
            var b = bullets[i];
            ctx.shadowColor = '#ffcc44'; ctx.shadowBlur = 4;
            ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, Math.PI * 2); ctx.fill();
        }
        ctx.shadowBlur = 0;

        // Particles
        for (var i = 0; i < particles.length; i++) {
            var p = particles[i];
            ctx.globalAlpha = Math.min(1, p.life * 2);
            ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Placement preview
        if (gameActive) {
            var tool = TOOLS[selectedTool];
            if (tool && gold >= tool.cost) {
                ctx.globalAlpha = 0.4;
                ctx.fillStyle = tool.color;
                if (selectedTool === 2) ctx.fillRect(mouseX - tool.r, mouseY - tool.r, tool.r * 2, tool.r * 2);
                else { ctx.beginPath(); ctx.arc(mouseX, mouseY, tool.r, 0, Math.PI * 2); ctx.fill(); }
                if (tool.range) {
                    ctx.strokeStyle = tool.color; ctx.lineWidth = 0.5;
                    ctx.beginPath(); ctx.arc(mouseX, mouseY, tool.range, 0, Math.PI * 2); ctx.stroke();
                }
                ctx.globalAlpha = 1;
            }
        }

        // Tool selector bar
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, H - 40, W, 40);
        for (var i = 1; i <= 3; i++) {
            var t = TOOLS[i], tx = 30 + (i - 1) * 130;
            ctx.fillStyle = i === selectedTool ? 'rgba(100,100,100,0.3)' : 'rgba(30,30,30,0.5)';
            ctx.fillRect(tx, H - 36, 110, 32);
            ctx.strokeStyle = i === selectedTool ? '#ffffff' : '#555'; ctx.lineWidth = 1;
            ctx.strokeRect(tx, H - 36, 110, 32);
            ctx.fillStyle = gold >= t.cost ? '#ffffff' : '#666'; ctx.font = '600 12px Inter, sans-serif'; ctx.textAlign = 'left';
            ctx.fillText('[' + i + '] ' + t.name + ' $' + t.cost, tx + 6, H - 16);
        }

        // Night overlay
        if (dayNight) {
            ctx.fillStyle = 'rgba(0,0,20,0.3)'; ctx.fillRect(0, 0, W, H);
        }

        // Vignette
        var vig = ctx.createRadialGradient(W / 2, H / 2, W * 0.25, W / 2, H / 2, W * 0.55);
        vig.addColorStop(0, 'transparent'); vig.addColorStop(1, 'rgba(0,0,0,0.5)');
        ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);
    }

    function gameLoop(time) {
        if (!gameActive) return;
        requestAnimationFrame(gameLoop);
        if (!time) time = performance.now();
        var dt = Math.min((time - lastTime) / 1000, 0.1);
        lastTime = time;

        updateZombies(dt);
        updateTurrets(dt);
        updateBullets(dt);
        updateParticles(dt);
        draw();
        updateHUD();
    }
})();

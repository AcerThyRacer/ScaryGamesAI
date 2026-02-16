/* ============================================
   Ritual Circle — Wave-Based Occult Tower Defense
   Place traps, cast spells, defend the summoning circle.
   ============================================ */
(function () {
    'use strict';

    var canvas = document.getElementById('game-canvas');
    var ctx = canvas.getContext('2d');

    // ============ CONSTANTS ============
    var MAX_WAVES = 10;
    var CIRCLE_RADIUS = 60;
    var SPAWN_RADIUS_MIN = 400;
    var SPAWN_RADIUS_MAX = 550;

    var TRAP_TYPES = {
        salt: { name: 'Salt Line', cost: 10, damage: 8, radius: 40, duration: 15, color: '#ffffff', slowFactor: 0.3 },
        holywater: { name: 'Holy Water', cost: 20, damage: 25, radius: 50, duration: 12, color: '#4488ff', slowFactor: 0.5 },
        sigil: { name: 'Sigil Ward', cost: 30, damage: 40, radius: 60, duration: 20, color: '#ff44ff', slowFactor: 0.0 },
    };

    var ENEMY_TYPES = {
        cultist: { name: 'Cultist', hp: 20, speed: 1.2, damage: 5, color: '#aa4444', radius: 10, reward: 5, icon: '🧙' },
        ghoul: { name: 'Ghoul', hp: 40, speed: 0.8, damage: 10, color: '#446644', radius: 12, reward: 8, icon: '👹' },
        demon: { name: 'Demon', hp: 80, speed: 1.5, damage: 20, color: '#cc2200', radius: 15, reward: 15, icon: '😈' },
        shade: { name: 'Shade', hp: 15, speed: 2.5, damage: 3, color: '#444466', radius: 8, reward: 4, icon: '👻' },
        archDemon: { name: 'Arch-Demon', hp: 200, speed: 0.6, damage: 40, color: '#880000', radius: 22, reward: 50, icon: '🔥' },
    };

    // ============ STATE ============
    var state = {
        wave: 0,
        waveActive: false,
        waveTimer: 0,
        spawnTimer: 0,
        enemiesToSpawn: 0,
        waveEnemyType: 'cultist',
        circleHP: 100,
        mana: 100,
        maxMana: 100,
        manaRegen: 2,
        kills: 0,
        totalKills: 0,
        enemies: [],
        traps: [],
        projectiles: [],
        particles: [],
        selectedTrap: null,
        gameActive: false,
        betweenWaves: false,
        betweenTimer: 0,
        mouseX: 0,
        mouseY: 0,
        centerX: 0,
        centerY: 0,
        circleRotation: 0,
        trapsPlaced: 0,
        spellsCast: 0,
        wavesCleared: 0,
    };

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        state.centerX = canvas.width / 2;
        state.centerY = canvas.height / 2;
    }
    resize();
    window.addEventListener('resize', resize);

    // ============ INPUT ============
    document.addEventListener('keydown', function (e) {
        if (!state.gameActive) return;
        if (e.code === 'Digit1') { state.selectedTrap = 'salt'; e.preventDefault(); }
        if (e.code === 'Digit2') { state.selectedTrap = 'holywater'; e.preventDefault(); }
        if (e.code === 'Digit3') { state.selectedTrap = 'sigil'; e.preventDefault(); }
        if (e.code === 'Space') { castFireWall(); e.preventDefault(); }
        if (e.code === 'Escape') { state.gameActive = false; GameUtils.pauseGame(); }
    });

    canvas.addEventListener('mousemove', function (e) {
        var rect = canvas.getBoundingClientRect();
        state.mouseX = e.clientX - rect.left;
        state.mouseY = e.clientY - rect.top;
    });

    canvas.addEventListener('click', function (e) {
        if (!state.gameActive) return;
        var rect = canvas.getBoundingClientRect();
        var mx = e.clientX - rect.left;
        var my = e.clientY - rect.top;

        if (state.selectedTrap) {
            placeTrap(mx, my);
        } else {
            // Cast exorcism bolt
            castBolt(mx, my);
        }
    });

    canvas.addEventListener('contextmenu', function (e) {
        e.preventDefault();
        state.selectedTrap = null;
    });

    document.getElementById('start-btn').addEventListener('click', function () { HorrorAudio.init(); startGame(); });
    document.getElementById('fullscreen-btn').addEventListener('click', function () { GameUtils.toggleFullscreen(); });

    GameUtils.injectDifficultySelector('start-screen');
    GameUtils.initPause({
        onResume: function () { state.gameActive = true; GameUtils.setState(GameUtils.STATE.PLAYING); lastTime = performance.now(); },
        onRestart: function () { resetGame(); }
    });

    // ============ TRAP PLACEMENT ============
    function placeTrap(x, y) {
        var type = TRAP_TYPES[state.selectedTrap];
        if (!type || state.mana < type.cost) return;

        // Don't place inside the circle
        var dx = x - state.centerX, dy = y - state.centerY;
        if (Math.sqrt(dx * dx + dy * dy) < CIRCLE_RADIUS + 20) return;

        state.mana -= type.cost;
        state.traps.push({
            type: state.selectedTrap,
            x: x,
            y: y,
            radius: type.radius,
            damage: type.damage,
            duration: type.duration,
            maxDuration: type.duration,
            color: type.color,
            slowFactor: type.slowFactor,
            cooldown: 0,
        });
        state.trapsPlaced++;
        state.selectedTrap = null;

        // Particles
        for (var i = 0; i < 10; i++) {
            state.particles.push({
                x: x, y: y,
                vx: (Math.random() - 0.5) * 100,
                vy: (Math.random() - 0.5) * 100,
                life: 0.5 + Math.random() * 0.5,
                color: type.color,
                size: 2 + Math.random() * 4,
            });
        }
    }

    // ============ SPELLS ============
    function castBolt(tx, ty) {
        if (state.mana < 3) return;
        state.mana -= 3;
        state.spellsCast++;

        var dx = tx - state.centerX, dy = ty - state.centerY;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist === 0) return;

        state.projectiles.push({
            x: state.centerX, y: state.centerY,
            vx: (dx / dist) * 500,
            vy: (dy / dist) * 500,
            damage: 15,
            life: 2,
            color: '#ffff88',
            radius: 5,
        });
    }

    function castFireWall() {
        if (state.mana < 50) return;
        state.mana -= 50;
        state.spellsCast++;

        // Ring of fire around the circle
        for (var a = 0; a < Math.PI * 2; a += 0.2) {
            var dist = CIRCLE_RADIUS + 80 + Math.random() * 40;
            state.particles.push({
                x: state.centerX + Math.cos(a) * dist,
                y: state.centerY + Math.sin(a) * dist,
                vx: Math.cos(a) * 30,
                vy: Math.sin(a) * 30,
                life: 2.0,
                color: '#ff4400',
                size: 8 + Math.random() * 8,
            });
        }

        // Damage all enemies in range
        state.enemies.forEach(function (e) {
            var dx = e.x - state.centerX, dy = e.y - state.centerY;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < CIRCLE_RADIUS + 130) {
                e.hp -= 50 * GameUtils.getMultiplier();
            }
        });

        HorrorAudio.playJumpScare();
    }

    // ============ WAVE SPAWNING ============
    function getWaveDefinition(wave) {
        var defs = [
            { enemies: [{ type: 'cultist', count: 5 }] },
            { enemies: [{ type: 'cultist', count: 8 }, { type: 'shade', count: 3 }] },
            { enemies: [{ type: 'cultist', count: 6 }, { type: 'ghoul', count: 3 }] },
            { enemies: [{ type: 'shade', count: 8 }, { type: 'ghoul', count: 4 }] },
            { enemies: [{ type: 'cultist', count: 5 }, { type: 'demon', count: 2 }] },
            { enemies: [{ type: 'ghoul', count: 6 }, { type: 'demon', count: 3 }] },
            { enemies: [{ type: 'shade', count: 10 }, { type: 'demon', count: 3 }] },
            { enemies: [{ type: 'cultist', count: 8 }, { type: 'demon', count: 4 }, { type: 'ghoul', count: 4 }] },
            { enemies: [{ type: 'demon', count: 6 }, { type: 'shade', count: 8 }] },
            { enemies: [{ type: 'archDemon', count: 1 }, { type: 'demon', count: 4 }, { type: 'cultist', count: 10 }] },
        ];
        return defs[Math.min(wave, defs.length - 1)];
    }

    function startWave() {
        state.wave++;
        state.waveActive = true;
        state.betweenWaves = false;
        state.kills = 0;
        state.spawnTimer = 0;

        var def = getWaveDefinition(state.wave - 1);
        state.waveSpawnQueue = [];
        def.enemies.forEach(function (e) {
            for (var i = 0; i < e.count; i++) {
                state.waveSpawnQueue.push(e.type);
            }
        });
        // Shuffle
        for (var i = state.waveSpawnQueue.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = state.waveSpawnQueue[i]; state.waveSpawnQueue[i] = state.waveSpawnQueue[j]; state.waveSpawnQueue[j] = tmp;
        }

        updateHUD();
        HorrorAudio.startHeartbeat(50);
    }

    function spawnEnemy(type) {
        var def = ENEMY_TYPES[type];
        var angle = Math.random() * Math.PI * 2;
        var dist = SPAWN_RADIUS_MIN + Math.random() * (SPAWN_RADIUS_MAX - SPAWN_RADIUS_MIN);
        state.enemies.push({
            x: state.centerX + Math.cos(angle) * dist,
            y: state.centerY + Math.sin(angle) * dist,
            hp: def.hp * (1 + (state.wave - 1) * 0.15) * GameUtils.getMultiplier(),
            maxHp: def.hp * (1 + (state.wave - 1) * 0.15) * GameUtils.getMultiplier(),
            speed: def.speed,
            damage: def.damage,
            color: def.color,
            radius: def.radius,
            reward: def.reward,
            icon: def.icon,
            slowed: 0,
            attackCooldown: 0,
        });
    }

    // ============ UPDATE ============
    function update(dt) {
        if (!state.gameActive) return;

        state.circleRotation += dt * 0.5;

        // Mana regen
        state.mana = Math.min(state.maxMana, state.mana + state.manaRegen * dt);

        // Between waves
        if (state.betweenWaves) {
            state.betweenTimer -= dt;
            if (state.betweenTimer <= 0) startWave();
            updateParticles(dt);
            updateHUD();
            return;
        }

        // Spawn enemies
        if (state.waveActive && state.waveSpawnQueue && state.waveSpawnQueue.length > 0) {
            state.spawnTimer -= dt;
            if (state.spawnTimer <= 0) {
                spawnEnemy(state.waveSpawnQueue.shift());
                state.spawnTimer = 0.8 + Math.random() * 0.5;
            }
        }

        // Update enemies
        for (var i = state.enemies.length - 1; i >= 0; i--) {
            var e = state.enemies[i];
            if (e.slowed > 0) e.slowed -= dt;
            var speedMult = e.slowed > 0 ? 0.3 : 1.0;

            // Move toward circle center
            var dx = state.centerX - e.x, dy = state.centerY - e.y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > CIRCLE_RADIUS) {
                e.x += (dx / dist) * e.speed * speedMult * 60 * dt;
                e.y += (dy / dist) * e.speed * speedMult * 60 * dt;
            } else {
                // Attack the circle
                e.attackCooldown -= dt;
                if (e.attackCooldown <= 0) {
                    state.circleHP -= e.damage * GameUtils.getMultiplier();
                    e.attackCooldown = 1.0;
                    // Damage flash
                    for (var p = 0; p < 5; p++) {
                        state.particles.push({
                            x: state.centerX + (Math.random() - 0.5) * CIRCLE_RADIUS,
                            y: state.centerY + (Math.random() - 0.5) * CIRCLE_RADIUS,
                            vx: (Math.random() - 0.5) * 60,
                            vy: (Math.random() - 0.5) * 60,
                            life: 0.5,
                            color: '#ff0000',
                            size: 4,
                        });
                    }
                }
            }

            // Dead check
            if (e.hp <= 0) {
                state.kills++;
                state.totalKills++;
                state.mana = Math.min(state.maxMana, state.mana + e.reward * 0.3);

                // Death particles
                for (var p = 0; p < 8; p++) {
                    state.particles.push({
                        x: e.x, y: e.y,
                        vx: (Math.random() - 0.5) * 120,
                        vy: (Math.random() - 0.5) * 120,
                        life: 0.5 + Math.random() * 0.5,
                        color: e.color,
                        size: 3 + Math.random() * 5,
                    });
                }

                if (window.ChallengeManager) ChallengeManager.notify('ritual-circle', 'kills', 1);

                state.enemies.splice(i, 1);
                continue;
            }
        }

        // Update traps
        for (var i = state.traps.length - 1; i >= 0; i--) {
            var trap = state.traps[i];
            trap.duration -= dt;
            if (trap.duration <= 0) {
                state.traps.splice(i, 1);
                continue;
            }
            trap.cooldown -= dt;
            if (trap.cooldown <= 0) {
                // Apply damage to enemies in range
                state.enemies.forEach(function (e) {
                    var dx = e.x - trap.x, dy = e.y - trap.y;
                    if (Math.sqrt(dx * dx + dy * dy) < trap.radius) {
                        e.hp -= trap.damage * dt * 2;
                        if (trap.slowFactor > 0) e.slowed = 0.5;
                    }
                });
            }
        }

        // Update projectiles
        for (var i = state.projectiles.length - 1; i >= 0; i--) {
            var proj = state.projectiles[i];
            proj.x += proj.vx * dt;
            proj.y += proj.vy * dt;
            proj.life -= dt;
            if (proj.life <= 0 || proj.x < 0 || proj.x > canvas.width || proj.y < 0 || proj.y > canvas.height) {
                state.projectiles.splice(i, 1);
                continue;
            }

            // Hit enemies
            for (var j = state.enemies.length - 1; j >= 0; j--) {
                var e = state.enemies[j];
                var dx = e.x - proj.x, dy = e.y - proj.y;
                if (Math.sqrt(dx * dx + dy * dy) < e.radius + proj.radius) {
                    e.hp -= proj.damage;
                    // Hit particles
                    for (var p = 0; p < 4; p++) {
                        state.particles.push({
                            x: proj.x, y: proj.y,
                            vx: (Math.random() - 0.5) * 80,
                            vy: (Math.random() - 0.5) * 80,
                            life: 0.3,
                            color: '#ffff44',
                            size: 3,
                        });
                    }
                    state.projectiles.splice(i, 1);
                    break;
                }
            }
        }

        // Particles
        updateParticles(dt);

        // Wave complete check
        if (state.waveActive && state.enemies.length === 0 && state.waveSpawnQueue && state.waveSpawnQueue.length === 0) {
            state.waveActive = false;
            state.wavesCleared++;
            HorrorAudio.stopHeartbeat();

            if (window.ChallengeManager) {
                ChallengeManager.notify('ritual-circle', 'waves_cleared', state.wavesCleared);
                ChallengeManager.notify('ritual-circle', 'total_kills', state.totalKills);
            }

            if (state.wave >= MAX_WAVES) {
                gameWin();
            } else {
                state.betweenWaves = true;
                state.betweenTimer = 5;
                // Mana bonus between waves
                state.mana = Math.min(state.maxMana, state.mana + 20);
            }
        }

        // Circle destroyed
        if (state.circleHP <= 0) {
            gameOver();
            return;
        }

        updateHUD();
    }

    function updateParticles(dt) {
        for (var i = state.particles.length - 1; i >= 0; i--) {
            var p = state.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
            p.size *= 0.98;
            if (p.life <= 0) state.particles.splice(i, 1);
        }
    }

    function updateHUD() {
        var waveEl = document.getElementById('hud-wave');
        var manaEl = document.getElementById('hud-mana');
        var circleEl = document.getElementById('hud-circle');
        var killsEl = document.getElementById('hud-kills');
        if (waveEl) waveEl.textContent = '⚔️ Wave ' + state.wave + ' / ' + MAX_WAVES;
        if (manaEl) manaEl.textContent = '✨ Mana: ' + Math.round(state.mana);
        if (circleEl) {
            circleEl.textContent = '🔮 Circle: ' + Math.round(state.circleHP) + '%';
            circleEl.style.color = state.circleHP > 50 ? '#ff8800' : state.circleHP > 25 ? '#ff4444' : '#cc0000';
        }
        if (killsEl) killsEl.textContent = '💀 Kills: ' + state.totalKills;
    }

    // ============ RENDER ============
    function render() {
        var w = canvas.width, h = canvas.height;

        // Background — graveyard
        renderBackground(w, h);

        // Traps
        state.traps.forEach(function (trap) {
            var alpha = Math.min(1, trap.duration / trap.maxDuration);
            ctx.strokeStyle = trap.color;
            ctx.lineWidth = 2;
            ctx.globalAlpha = alpha * 0.6;
            ctx.beginPath();
            ctx.arc(trap.x, trap.y, trap.radius, 0, Math.PI * 2);
            ctx.stroke();

            // Inner glow
            ctx.fillStyle = trap.color;
            ctx.globalAlpha = alpha * 0.1;
            ctx.beginPath();
            ctx.arc(trap.x, trap.y, trap.radius, 0, Math.PI * 2);
            ctx.fill();

            // Center symbol
            ctx.globalAlpha = alpha * 0.8;
            ctx.font = '16px serif';
            ctx.textAlign = 'center';
            if (trap.type === 'salt') ctx.fillText('⚪', trap.x, trap.y + 5);
            else if (trap.type === 'holywater') ctx.fillText('💧', trap.x, trap.y + 5);
            else if (trap.type === 'sigil') ctx.fillText('🔯', trap.x, trap.y + 5);

            ctx.globalAlpha = 1.0;
        });

        // Summoning circle
        renderCircle(w, h);

        // Enemies
        state.enemies.forEach(function (e) {
            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.beginPath();
            ctx.ellipse(e.x, e.y + e.radius, e.radius * 0.8, e.radius * 0.3, 0, 0, Math.PI * 2);
            ctx.fill();

            // Body
            ctx.fillStyle = e.color;
            ctx.shadowColor = e.color;
            ctx.shadowBlur = e.slowed > 0 ? 5 : 10;
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            // Icon
            ctx.font = (e.radius * 1.5) + 'px serif';
            ctx.textAlign = 'center';
            ctx.fillText(e.icon, e.x, e.y + e.radius * 0.5);

            // HP bar
            if (e.hp < e.maxHp) {
                var barW = e.radius * 2;
                ctx.fillStyle = '#330000';
                ctx.fillRect(e.x - barW / 2, e.y - e.radius - 8, barW, 4);
                ctx.fillStyle = '#ff4444';
                ctx.fillRect(e.x - barW / 2, e.y - e.radius - 8, barW * (e.hp / e.maxHp), 4);
            }
        });

        // Projectiles
        state.projectiles.forEach(function (p) {
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        });

        // Particles
        state.particles.forEach(function (p) {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = Math.max(0, p.life);
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1.0;

        // Trap placement preview
        if (state.selectedTrap && state.gameActive) {
            var type = TRAP_TYPES[state.selectedTrap];
            ctx.strokeStyle = state.mana >= type.cost ? type.color : '#ff0000';
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.4;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.arc(state.mouseX, state.mouseY, type.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.globalAlpha = 1.0;

            // Cost display
            ctx.fillStyle = state.mana >= type.cost ? '#fff' : '#ff0000';
            ctx.font = '12px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(type.name + ' (' + type.cost + ' mana)', state.mouseX, state.mouseY - type.radius - 10);
        }

        // Between waves UI
        if (state.betweenWaves) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(0, h * 0.35, w, h * 0.3);
            ctx.fillStyle = '#ff8800';
            ctx.font = 'bold 36px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Wave ' + (state.wave + 1) + ' incoming...', w / 2, h * 0.48);
            ctx.fillStyle = '#aaa';
            ctx.font = '18px monospace';
            ctx.fillText(Math.ceil(state.betweenTimer) + 's', w / 2, h * 0.55);
            ctx.fillStyle = '#888';
            ctx.font = '14px monospace';
            ctx.fillText('Place traps! [1] Salt  [2] Holy Water  [3] Sigil', w / 2, h * 0.6);
        }

        // Spell bar at bottom
        renderSpellBar(w, h);
    }

    function renderBackground(w, h) {
        // Dark gradient sky
        var grd = ctx.createLinearGradient(0, 0, 0, h);
        grd.addColorStop(0, '#0a0515');
        grd.addColorStop(0.5, '#0f0a1a');
        grd.addColorStop(1, '#1a0f0a');
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, w, h);

        // Stars
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        for (var i = 0; i < 50; i++) {
            var sx = (i * 137.5 + 43) % w;
            var sy = (i * 89.3 + 17) % (h * 0.4);
            var twinkle = Math.sin(state.circleRotation * 2 + i) * 0.3 + 0.7;
            ctx.globalAlpha = twinkle * 0.4;
            ctx.fillRect(sx, sy, 1.5, 1.5);
        }
        ctx.globalAlpha = 1.0;

        // Ground
        ctx.fillStyle = '#0e0a06';
        ctx.fillRect(0, h * 0.7, w, h * 0.3);

        // Tombstones in background
        ctx.fillStyle = '#1a1515';
        for (var t = 0; t < 8; t++) {
            var tx = (t * w / 8) + w * 0.05;
            var ty = h * 0.65 + Math.sin(t * 2.5) * 15;
            ctx.fillRect(tx, ty, 15, 25);
            ctx.beginPath();
            ctx.arc(tx + 7, ty, 8, Math.PI, 0);
            ctx.fill();
        }

        // Fog
        ctx.fillStyle = 'rgba(30,20,40,0.15)';
        for (var f = 0; f < 5; f++) {
            var fx = Math.sin(state.circleRotation * 0.3 + f) * 100 + w * 0.2 * f;
            ctx.beginPath();
            ctx.ellipse(fx, h * 0.7, 150, 20, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function renderCircle(w, h) {
        var cx = state.centerX, cy = state.centerY;

        // Outer glow
        var glowR = CIRCLE_RADIUS + 20 + Math.sin(state.circleRotation * 3) * 5;
        var glow = ctx.createRadialGradient(cx, cy, CIRCLE_RADIUS * 0.5, cx, cy, glowR);
        glow.addColorStop(0, 'rgba(150,60,200,0.15)');
        glow.addColorStop(0.7, 'rgba(100,30,150,0.08)');
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
        ctx.fill();

        // Main circle
        ctx.strokeStyle = state.circleHP > 50 ? '#9944ff' : state.circleHP > 25 ? '#ff8844' : '#ff2222';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy, CIRCLE_RADIUS, 0, Math.PI * 2);
        ctx.stroke();

        // Rotating inner symbols
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(state.circleRotation);

        // Pentagram
        ctx.strokeStyle = 'rgba(150,60,200,0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (var i = 0; i < 5; i++) {
            var a = (i * 4 * Math.PI / 5) - Math.PI / 2;
            var px = Math.cos(a) * (CIRCLE_RADIUS - 15);
            var py = Math.sin(a) * (CIRCLE_RADIUS - 15);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();

        // Inner circle
        ctx.strokeStyle = 'rgba(150,60,200,0.3)';
        ctx.beginPath();
        ctx.arc(0, 0, CIRCLE_RADIUS * 0.5, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();

        // HP bar under circle
        var barW = CIRCLE_RADIUS * 2;
        ctx.fillStyle = '#220000';
        ctx.fillRect(cx - barW / 2, cy + CIRCLE_RADIUS + 10, barW, 6);
        ctx.fillStyle = state.circleHP > 50 ? '#9944ff' : state.circleHP > 25 ? '#ff8844' : '#ff2222';
        ctx.fillRect(cx - barW / 2, cy + CIRCLE_RADIUS + 10, barW * (state.circleHP / 100), 6);
    }

    function renderSpellBar(w, h) {
        var barY = h - 55;
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(w * 0.3, barY, w * 0.4, 50);
        ctx.strokeStyle = '#333';
        ctx.strokeRect(w * 0.3, barY, w * 0.4, 50);

        var items = [
            { key: 'Click', name: 'Bolt', cost: 3, color: '#ffff88' },
            { key: '1', name: 'Salt', cost: 10, color: '#ffffff' },
            { key: '2', name: 'Holy', cost: 20, color: '#4488ff' },
            { key: '3', name: 'Sigil', cost: 30, color: '#ff44ff' },
            { key: 'Space', name: 'Fire Wall', cost: 50, color: '#ff4400' },
        ];

        var itemW = w * 0.4 / items.length;
        items.forEach(function (item, i) {
            var ix = w * 0.3 + i * itemW;
            var canAfford = state.mana >= item.cost;

            ctx.fillStyle = canAfford ? item.color : '#444';
            ctx.font = 'bold 11px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('[' + item.key + ']', ix + itemW / 2, barY + 16);
            ctx.font = '10px monospace';
            ctx.fillText(item.name, ix + itemW / 2, barY + 30);
            ctx.fillStyle = canAfford ? '#888' : '#444';
            ctx.fillText(item.cost + 'mp', ix + itemW / 2, barY + 43);
        });

        // Mana bar
        ctx.fillStyle = '#111';
        ctx.fillRect(w * 0.3, barY - 8, w * 0.4, 6);
        ctx.fillStyle = '#4444ff';
        ctx.fillRect(w * 0.3, barY - 8, w * 0.4 * (state.mana / state.maxMana), 6);
    }

    // ============ GAME FLOW ============
    function gameOver() {
        state.gameActive = false;
        GameUtils.setState(GameUtils.STATE.GAME_OVER);
        HorrorAudio.playDeath();
        HorrorAudio.stopHeartbeat();
        document.getElementById('death-msg').textContent = 'The circle was destroyed on wave ' + state.wave + '! Kills: ' + state.totalKills;
        document.getElementById('game-over-screen').style.display = 'flex';
        document.getElementById('game-hud').style.display = 'none';

        if (window.ChallengeManager) {
            ChallengeManager.notify('ritual-circle', 'waves_cleared', state.wavesCleared);
            ChallengeManager.notify('ritual-circle', 'total_kills', state.totalKills);
            ChallengeManager.notify('ritual-circle', 'traps_placed', state.trapsPlaced);
            ChallengeManager.notify('ritual-circle', 'spells_cast', state.spellsCast);
        }
    }

    function gameWin() {
        state.gameActive = false;
        HorrorAudio.playWin();
        HorrorAudio.stopHeartbeat();
        GameUtils.setState(GameUtils.STATE.WIN);

        if (window.ChallengeManager) {
            ChallengeManager.notify('ritual-circle', 'ritual_complete', 1);
            ChallengeManager.notify('ritual-circle', 'waves_cleared', MAX_WAVES);
            ChallengeManager.notify('ritual-circle', 'total_kills', state.totalKills);
            ChallengeManager.notify('ritual-circle', 'traps_placed', state.trapsPlaced);
            ChallengeManager.notify('ritual-circle', 'spells_cast', state.spellsCast);
            ChallengeManager.notify('ritual-circle', 'circle_hp', Math.round(state.circleHP));
        }

        document.getElementById('win-msg').textContent = 'Ritual complete! Kills: ' + state.totalKills + ' | Circle: ' + Math.round(state.circleHP) + '%';
        document.getElementById('game-win-screen').style.display = 'flex';
        document.getElementById('game-hud').style.display = 'none';
    }

    function resetGame() {
        state.wave = 0;
        state.waveActive = false;
        state.circleHP = 100;
        state.mana = 100;
        state.totalKills = 0;
        state.kills = 0;
        state.enemies = [];
        state.traps = [];
        state.projectiles = [];
        state.particles = [];
        state.selectedTrap = null;
        state.betweenWaves = true;
        state.betweenTimer = 3;
        state.trapsPlaced = 0;
        state.spellsCast = 0;
        state.wavesCleared = 0;

        document.getElementById('game-over-screen').style.display = 'none';
        document.getElementById('game-win-screen').style.display = 'none';
        document.getElementById('game-hud').style.display = 'flex';
        state.gameActive = true;
        GameUtils.setState(GameUtils.STATE.PLAYING);
        lastTime = performance.now();
    }

    function startGame() {
        document.getElementById('start-screen').style.display = 'none';
        var ctrlOverlay = document.getElementById('controls-overlay');
        ctrlOverlay.style.display = 'flex';
        HorrorAudio.startDrone(30, 'dark');
        setTimeout(function () {
            ctrlOverlay.classList.add('hiding');
            setTimeout(function () {
                ctrlOverlay.style.display = 'none';
                ctrlOverlay.classList.remove('hiding');
                document.getElementById('game-hud').style.display = 'flex';
                document.getElementById('back-link').style.display = 'none';
                resetGame();
            }, 800);
        }, 3000);
    }

    // ============ GAME LOOP ============
    var lastTime = 0;
    function gameLoop(time) {
        requestAnimationFrame(gameLoop);
        if (!time) time = performance.now();
        var dt = Math.min((time - lastTime) / 1000, 0.05);
        lastTime = time;
        if (dt <= 0) return;
        update(dt);
        render();
    }
    lastTime = performance.now();
    gameLoop();
})();

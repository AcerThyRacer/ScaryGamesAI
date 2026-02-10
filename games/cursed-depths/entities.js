/* ============================================================
   CURSED DEPTHS — Entities (Enemies, Bosses, Projectiles)
   ============================================================ */

const enemies = [];
const projectiles = [];
let boss = null;
let spawnTimer = 0;

function spawnEnemy(type, x, y) {
    const def = ENEMY_TYPES[type];
    if (!def) return null;
    const e = {
        type, ...def, x, y, vx: 0, vy: 0,
        hp: def.hp, maxHp: def.hp,
        dir: Math.random() < 0.5 ? -1 : 1,
        aiTimer: 0, hitTimer: 0, dead: false,
        animFrame: 0, animTimer: 0,
        patrolTimer: 60 + Math.random() * 120,
    };
    enemies.push(e);
    // Elite enemy chance (10%)
    if (Math.random() < 0.10) {
        e.elite = true; e.hp = Math.floor(e.hp * 1.5); e.maxHp = e.hp;
        e.damage = Math.floor(e.damage * 1.3); e.xp = Math.floor((e.xp || 5) * 2);
    }
    return e;
}

function spawnBoss(type, x, y) {
    const def = BOSS_TYPES[type];
    if (!def) return;
    boss = {
        type, ...def, x, y, vx: 0, vy: 0,
        hp: def.hp, maxHp: def.hp, phase: 1,
        dir: 1, aiTimer: 0, hitTimer: 0, dead: false,
        attackCd: 0, animTimer: 0,
        drops: def.drops, xp: def.xp,
    };
    // Phase 4: Cinematic boss intro
    if (typeof cinematicMode !== 'undefined') {
        cinematicMode.active = true; cinematicMode.timer = 120;
        cinematicMode.bossName = def.name || type; cinematicMode.targetZoom = 1.3;
    }
    if (typeof triggerShake === 'function') triggerShake(15);
}

function getBiomeEnemies(depth) {
    // Phase 3: check special biomes by position
    const biome = typeof getPlayerBiome === 'function' ? getPlayerBiome() : null;
    if (biome === 'sky') return ['angel', 'harpy'];
    if (biome === 'ocean') return ['sea_serpent', 'jellyfish', 'coral_golem'];
    if (depth < CAVE_Y) return ['zombie', 'spider', 'blood_slime', 'rat_swarm'];
    if (depth < MUSH_Y) return ['skeleton', 'spider', 'eye_bat', 'wraith', 'bone_archer', 'phantom', 'ghoul'];
    if (depth < FROZEN_Y) return ['fungal_zombie', 'parasite_host', 'corpse_spider', 'spider', 'blood_slime'];
    if (depth < FLESH_Y) return ['ice_wraith', 'banshee', 'possessed_armor', 'skeleton', 'phantom'];
    if (depth < HIVE_Y) return ['flesh_crawler', 'bone_serpent', 'wraith', 'eye_bat', 'blood_leech', 'tentacle_beast'];
    if (depth < ABYSS_Y) return ['corpse_spider', 'rat_swarm', 'fungal_zombie', 'mimic', 'tentacle_beast'];
    return ['shadow_demon', 'hell_knight', 'lava_elemental', 'shadow_assassin', 'bone_serpent'];
}

function updateEnemySpawning(camX, camY, viewW, viewH) {
    spawnTimer++;
    if (spawnTimer < 120) return;
    if (enemies.length >= 15) return;
    spawnTimer = 0;

    const py = player.y + player.h / 2;
    const depthTile = Math.floor(py / TILE);
    const types = getBiomeEnemies(depthTile);
    const type = types[Math.floor(Math.random() * types.length)];

    // Spawn off-screen
    const side = Math.random() < 0.5 ? -1 : 1;
    let sx = player.x + side * (viewW / 2 + 50 + Math.random() * 100);
    let sy = player.y - 50 + Math.random() * 100;

    // Find ground
    const tx = Math.floor(sx / TILE);
    let ty = Math.floor(sy / TILE);
    const def = ENEMY_TYPES[type];
    if (def && def.flies) {
        // Flying enemies can spawn anywhere nearby
        spawnEnemy(type, sx, sy);
        return;
    }
    // Find solid ground below
    for (let fy = ty; fy < ty + 20; fy++) {
        if (isSolid(tx, fy)) {
            spawnEnemy(type, sx, (fy - 1) * TILE - (def ? def.h : 28));
            return;
        }
    }
}

function updateEnemies() {
    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        if (e.dead) { enemies.splice(i, 1); continue; }

        // Despawn if too far
        const dx = e.x - player.x, dy = e.y - player.y;
        if (dx * dx + dy * dy > 2000 * 2000) { enemies.splice(i, 1); continue; }

        e.animTimer++;
        if (e.hitTimer > 0) e.hitTimer--;

        // AI
        const toPlayer = player.x - e.x;
        const distToPlayer = Math.sqrt(dx * dx + dy * dy);

        if (e.flies) {
            // Flying AI - move toward player
            if (distToPlayer < 400) {
                e.vx += (toPlayer > 0 ? 1 : -1) * 0.15;
                e.vy += (player.y - e.y > 0 ? 1 : -1) * 0.1;
                e.vx *= 0.95; e.vy *= 0.95;
                const maxS = e.speed || 2;
                if (Math.abs(e.vx) > maxS) e.vx = maxS * Math.sign(e.vx);
                if (Math.abs(e.vy) > maxS) e.vy = maxS * Math.sign(e.vy);
            } else {
                e.vx *= 0.98; e.vy *= 0.98;
                e.vy += Math.sin(e.animTimer * 0.05) * 0.1;
            }
            e.x += e.vx; e.y += e.vy;
        } else {
            // Ground AI
            if (e.flees && distToPlayer < 400) {
                // Flee from player (treasure goblin)
                e.dir = toPlayer > 0 ? -1 : 1;
                e.vx = e.dir * (e.speed || 2);
                const frontX2 = Math.floor((e.x + (e.dir > 0 ? e.w : 0)) / TILE);
                const feetY2 = Math.floor((e.y + e.h) / TILE);
                if (isSolid(frontX2, feetY2 - 1)) e.vy = -8;
            } else if (distToPlayer < 300) {
                // Chase
                e.dir = toPlayer > 0 ? 1 : -1;
                e.vx = e.dir * (e.speed || 1);
                // Jump if blocked
                const frontX = Math.floor((e.x + (e.dir > 0 ? e.w : 0)) / TILE);
                const feetY = Math.floor((e.y + e.h) / TILE);
                if (isSolid(frontX, feetY - 1)) e.vy = -7;
                // Shooting enemies fire projectiles
                if (e.shoots && distToPlayer < 250) {
                    if (!e.shootCd) e.shootCd = 0;
                    e.shootCd--;
                    if (e.shootCd <= 0) {
                        const ang = Math.atan2(player.y - e.y, player.x - e.x);
                        projectiles.push({ x: e.x + e.w / 2, y: e.y + e.h / 2, vx: Math.cos(ang) * 4, vy: Math.sin(ang) * 4, damage: e.damage * 0.6, life: 80, color: '#AAA', size: 3, fromBoss: true });
                        e.shootCd = 60 + Math.floor(Math.random() * 30);
                    }
                }
            } else {
                // Patrol
                e.patrolTimer--;
                if (e.patrolTimer <= 0) { e.dir *= -1; e.patrolTimer = 60 + Math.random() * 120; }
                e.vx = e.dir * (e.speed || 1) * 0.4;
            }
            // Gravity
            e.vy += GRAVITY * 0.8;
            if (e.vy > MAX_FALL) e.vy = MAX_FALL;

            // Collision
            e.x += e.vx;
            const etx = Math.floor((e.x + (e.vx > 0 ? e.w : 0)) / TILE);
            const ety = Math.floor(e.y / TILE);
            if (isSolid(etx, ety) || isSolid(etx, ety + 1)) { e.x -= e.vx; e.vx = 0; }

            const ny = e.y + e.vy;
            const bty = Math.floor((ny + e.h) / TILE);
            const btx = Math.floor((e.x + e.w / 2) / TILE);
            if (e.vy > 0 && isSolid(btx, bty)) { e.y = bty * TILE - e.h; e.vy = 0; }
            else e.y = ny;
        }

        // Attack player
        if (distToPlayer < e.w + 10 && player.invincible <= 0) {
            const dmg = Math.max(1, e.damage - player.defense);
            player.hp -= dmg;
            player.invincible = 30;
            player.vx = (player.x - e.x) > 0 ? 5 : -5;
            player.vy = -4;
            spawnParticles(player.x + player.w / 2, player.y + player.h / 2, '#CC2244', 5, 4);
        }

        // Animation
        if (e.animTimer % 10 === 0) e.animFrame = (e.animFrame + 1) % 4;
        e.dir = e.vx > 0.1 ? 1 : e.vx < -0.1 ? -1 : e.dir;
    }
}

function updateBoss() {
    if (!boss || boss.dead) return;
    boss.animTimer++;
    if (boss.hitTimer > 0) boss.hitTimer--;

    const dx = player.x - boss.x, dy = player.y - boss.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Phase transitions
    const hpPct = boss.hp / boss.maxHp;
    boss.phase = hpPct > 0.66 ? 1 : hpPct > 0.33 ? 2 : 3;

    // Boss AI depends on type
    if (boss.type === 'eye_of_terror') {
        // Float and dash at player
        const targetY = player.y - 100 + Math.sin(boss.animTimer * 0.03) * 60;
        boss.vy += (targetY - boss.y) * 0.01;
        boss.vx += (player.x - boss.x) * 0.005;
        boss.vx *= 0.97; boss.vy *= 0.97;
        // Dash attack
        if (boss.attackCd <= 0 && dist < 300) {
            boss.vx += (dx / dist) * (boss.phase * 3);
            boss.vy += (dy / dist) * (boss.phase * 3);
            boss.attackCd = 90 - boss.phase * 20;
            // Shoot projectiles in phase 2+
            if (boss.phase >= 2) {
                for (let a = 0; a < boss.phase * 2; a++) {
                    const ang = (a / (boss.phase * 2)) * Math.PI * 2;
                    projectiles.push({
                        x: boss.x + boss.w / 2, y: boss.y + boss.h / 2,
                        vx: Math.cos(ang) * 3, vy: Math.sin(ang) * 3, damage: 15,
                        life: 120, color: '#CC2244', size: 4, fromBoss: true
                    });
                }
            }
        }
    } else if (boss.type === 'bone_colossus') {
        // Walk toward player, stomp
        boss.vx = (dx > 0 ? 1 : -1) * (boss.speed + boss.phase * 0.3);
        boss.vy += GRAVITY;
        if (boss.vy > MAX_FALL) boss.vy = MAX_FALL;
        // Check ground
        const bx = Math.floor((boss.x + boss.w / 2) / TILE);
        const by = Math.floor((boss.y + boss.h) / TILE);
        if (isSolid(bx, by)) { boss.y = by * TILE - boss.h; boss.vy = 0; }
        // Jump attack
        if (boss.attackCd <= 0 && dist < 200) {
            boss.vy = -12; boss.attackCd = 60;
            spawnParticles(boss.x + boss.w / 2, boss.y + boss.h, '#C0B090', 10, 6);
        }
    } else if (boss.type === 'demon_lord') {
        // Teleport and shoot
        const targetY2 = player.y - 80;
        boss.vy += (targetY2 - boss.y) * 0.008;
        boss.vx += (player.x - boss.x) * 0.003;
        boss.vx *= 0.96; boss.vy *= 0.96;
        if (boss.attackCd <= 0) {
            // Fire spread
            for (let a = -2; a <= 2; a++) {
                const ang = Math.atan2(dy, dx) + a * 0.2;
                projectiles.push({
                    x: boss.x + boss.w / 2, y: boss.y + boss.h / 2,
                    vx: Math.cos(ang) * 4, vy: Math.sin(ang) * 4, damage: 20 + boss.phase * 5,
                    life: 150, color: '#FF4400', size: 5, fromBoss: true
                });
            }
            boss.attackCd = 50 - boss.phase * 10;
        }
    } else if (boss.type === 'hive_queen') {
        // Flying bee queen — swoops and spawns bee swarms
        const targetY3 = player.y - 80 + Math.sin(boss.animTimer * 0.04) * 50;
        boss.vy += (targetY3 - boss.y) * 0.012;
        boss.vx += (player.x - boss.x) * 0.006;
        boss.vx *= 0.96; boss.vy *= 0.96;
        if (boss.attackCd <= 0) {
            // Stinger projectiles
            for (let a = 0; a < 3 + boss.phase; a++) {
                const ang = Math.atan2(dy, dx) + (a - 1 - boss.phase / 2) * 0.3;
                projectiles.push({ x: boss.x + boss.w / 2, y: boss.y + boss.h / 2, vx: Math.cos(ang) * 3.5, vy: Math.sin(ang) * 3.5, damage: 12 + boss.phase * 4, life: 100, color: '#DDAA33', size: 3, fromBoss: true });
            }
            boss.attackCd = 70 - boss.phase * 15;
            // Spawn bees in phase 2+
            if (boss.phase >= 2 && enemies.length < 20) spawnEnemy('corpse_spider', boss.x + (Math.random() - 0.5) * 100, boss.y + 30);
        }
    } else if (boss.type === 'frost_lich') {
        // Teleporting ice mage
        boss.vy += (player.y - 60 - boss.y) * 0.008;
        boss.vx += (player.x - boss.x) * 0.003;
        boss.vx *= 0.95; boss.vy *= 0.95;
        if (boss.attackCd <= 0) {
            // Ice shard ring
            const shards = 4 + boss.phase * 2;
            for (let a = 0; a < shards; a++) {
                const ang = (a / shards) * Math.PI * 2 + boss.animTimer * 0.05;
                projectiles.push({ x: boss.x + boss.w / 2, y: boss.y + boss.h / 2, vx: Math.cos(ang) * 2.5, vy: Math.sin(ang) * 2.5, damage: 18 + boss.phase * 5, life: 140, color: '#88DDFF', size: 4, fromBoss: true });
            }
            boss.attackCd = 60 - boss.phase * 12;
            // Teleport in phase 3
            if (boss.phase >= 3 && Math.random() < 0.3) {
                boss.x = player.x + (Math.random() - 0.5) * 300;
                boss.y = player.y - 120;
                spawnParticles(boss.x + boss.w / 2, boss.y + boss.h / 2, '#88DDFF', 15, 6);
            }
        }
    } else if (boss.type === 'corruption') {
        // Massive corruption blob — slow but devastating
        boss.vx += (player.x - boss.x) * 0.002;
        boss.vy += (player.y - boss.y) * 0.002;
        boss.vx *= 0.97; boss.vy *= 0.97;
        if (boss.attackCd <= 0) {
            // Corruption tentacles — 360 spread
            const tentacles = 6 + boss.phase * 3;
            for (let a = 0; a < tentacles; a++) {
                const ang = (a / tentacles) * Math.PI * 2;
                projectiles.push({ x: boss.x + boss.w / 2, y: boss.y + boss.h / 2, vx: Math.cos(ang) * (2 + boss.phase * 0.5), vy: Math.sin(ang) * (2 + boss.phase * 0.5), damage: 20 + boss.phase * 8, life: 180, color: '#440033', size: 6, fromBoss: true });
            }
            boss.attackCd = 80 - boss.phase * 15;
            // Spawn shadow demons in phase 3+
            if (boss.phase >= 3 && enemies.length < 20) spawnEnemy('shadow_demon', boss.x + (Math.random() - 0.5) * 200, boss.y);
        }
    }

    boss.attackCd--;
    boss.x += boss.vx; boss.y += boss.vy;

    // Hit player
    if (dist < boss.w / 2 + 20 && player.invincible <= 0) {
        const dmg = Math.max(1, boss.damage - player.defense);
        player.hp -= dmg; player.invincible = 40;
        player.vx = dx < 0 ? 8 : -8; player.vy = -6;
    }

    // Death
    if (boss.hp <= 0) {
        boss.dead = true;
        player.xp += boss.xp;
        if (boss.drops) for (const drop of boss.drops) {
            const amt = drop[1] + Math.floor(Math.random() * (drop[2] - drop[1] + 1));
            addItem(drop[0], amt);
        }
        spawnParticles(boss.x + boss.w / 2, boss.y + boss.h / 2, '#FFaa00', 30, 8);
        boss = null;
    }
}

function updateProjectiles() {
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        p.x += p.vx; p.y += p.vy; p.life--;
        if (p.life <= 0) { projectiles.splice(i, 1); continue; }
        // Hit block
        const tx = Math.floor(p.x / TILE), ty = Math.floor(p.y / TILE);
        if (isSolid(tx, ty)) { projectiles.splice(i, 1); continue; }
        // Hit player (if from boss/enemy)
        if (p.fromBoss && player.invincible <= 0) {
            const dx = p.x - (player.x + player.w / 2), dy = p.y - (player.y + player.h / 2);
            if (Math.sqrt(dx * dx + dy * dy) < 15) {
                player.hp -= Math.max(1, p.damage - player.defense);
                player.invincible = 20;
                projectiles.splice(i, 1);
                spawnParticles(player.x + player.w / 2, player.y, '#CC2244', 4, 3);
            }
        }
        // Hit enemies (if from player)
        if (p.fromPlayer) {
            for (const e of enemies) {
                if (e.dead) continue;
                const ex = e.x + e.w / 2, ey = e.y + e.h / 2;
                if (Math.abs(p.x - ex) < e.w / 2 + 4 && Math.abs(p.y - ey) < e.h / 2 + 4) {
                    e.hp -= p.damage; e.hitTimer = 10;
                    if (e.hp <= 0) {
                        e.dead = true; player.xp += e.xp || 5;
                        if (typeof totalKills !== 'undefined') totalKills++;
                        if (e.drops) for (const d of e.drops) addItem(d[0], d[1] + Math.floor(Math.random() * (d[2] - d[1] + 1)));
                    }
                    projectiles.splice(i, 1); break;
                }
            }
        }
    }
}

function drawEnemy(ctx, e, camX, camY) {
    if (e.dead) return;
    const sx = e.x - camX, sy = e.y - camY;
    ctx.save();
    // Flash on hit
    ctx.fillStyle = e.hitTimer > 0 ? '#FFFFFF' : e.color;
    // Body
    ctx.fillRect(sx, sy, e.w, e.h);
    // Eyes
    ctx.fillStyle = '#CC1122';
    const eyeOff = e.dir > 0 ? e.w * 0.6 : e.w * 0.2;
    ctx.fillRect(sx + eyeOff, sy + 3, 3, 3);
    ctx.fillRect(sx + eyeOff + 5, sy + 3, 3, 3);
    // HP bar
    if (e.hp < e.maxHp) {
        ctx.fillStyle = '#222'; ctx.fillRect(sx, sy - 6, e.w, 4);
        ctx.fillStyle = '#CC2244'; ctx.fillRect(sx, sy - 6, e.w * (e.hp / e.maxHp), 4);
    }
    // Elite glow
    if (e.elite) {
        ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 2;
        ctx.strokeRect(sx - 1, sy - 1, e.w + 2, e.h + 2);
        // Star icon
        ctx.fillStyle = '#FFD700'; ctx.font = '8px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('★', sx + e.w / 2, sy - 8);
    }
    ctx.restore();
}

function drawBoss(ctx, camX, camY) {
    if (!boss || boss.dead) return;
    const sx = boss.x - camX, sy = boss.y - camY;
    ctx.save();
    ctx.fillStyle = boss.hitTimer > 0 ? '#FFFFFF' : boss.color;
    if (boss.type === 'eye_of_terror') {
        // Giant eye
        ctx.beginPath(); ctx.ellipse(sx + boss.w / 2, sy + boss.h / 2, boss.w / 2, boss.h / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath(); ctx.arc(sx + boss.w / 2, sy + boss.h / 2, 15, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#CC1122';
        ctx.beginPath(); ctx.arc(sx + boss.w / 2, sy + boss.h / 2, 8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(sx + boss.w / 2, sy + boss.h / 2, 4, 0, Math.PI * 2); ctx.fill();
        // Veins
        ctx.strokeStyle = '#882233'; ctx.lineWidth = 1;
        for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2 + boss.animTimer * 0.02;
            ctx.beginPath(); ctx.moveTo(sx + boss.w / 2, sy + boss.h / 2);
            ctx.lineTo(sx + boss.w / 2 + Math.cos(a) * boss.w / 2, sy + boss.h / 2 + Math.sin(a) * boss.h / 2);
            ctx.stroke();
        }
    } else {
        // Generic boss body
        ctx.fillRect(sx, sy, boss.w, boss.h);
        ctx.fillStyle = '#CC1122';
        ctx.fillRect(sx + boss.w * 0.3, sy + 8, 6, 6);
        ctx.fillRect(sx + boss.w * 0.6, sy + 8, 6, 6);
    }
    ctx.restore();
}

function drawProjectiles(ctx, camX, camY) {
    for (const p of projectiles) {
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color; ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(p.x - camX, p.y - camY, p.size, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.shadowBlur = 0;
}

function shootArrow() {
    const held = getHeldItem();
    if (!held) return;
    const it = ITEMS[held.id];
    if (!it || it.type !== 'bow') return;
    // Need arrows
    const arrowSlot = player.inventory.find(s => s && (s.id === I_ARROW || s.id === I_FIRE_ARROW));
    if (!arrowSlot) return;
    const arrowItem = ITEMS[arrowSlot.id];
    const mx = _mouseWorldX, my = _mouseWorldY;
    const px = player.x + player.w / 2, py = player.y + player.h / 2;
    const ang = Math.atan2(my - py, mx - px);
    projectiles.push({
        x: px, y: py, vx: Math.cos(ang) * 8, vy: Math.sin(ang) * 8,
        damage: it.damage + (arrowItem ? arrowItem.damage : 0),
        life: 120, color: arrowSlot.id === I_FIRE_ARROW ? '#FF4400' : '#8B6914',
        size: 3, fromPlayer: true
    });
    arrowSlot.count--;
    if (arrowSlot.count <= 0) {
        const idx = player.inventory.indexOf(arrowSlot);
        if (idx >= 0) player.inventory[idx] = null;
    }
    player.attackCd = it.speed || 8;
}

// Global mouse world coords for arrow shooting
let _mouseWorldX = 0, _mouseWorldY = 0;

// ===== PHASE 2: NPC SYSTEM =====
const npcs = [];
let showNPCShop = null; // currently interacting NPC
let showNPCDialogue = null;

function spawnNPC(type, x, y) {
    const def = NPC_TYPES[type];
    if (!def) return null;
    const n = {
        type, ...def, x, y, vx: 0, vy: 0,
        w: 12, h: 28, hp: 100, maxHp: 100,
        dir: 1, aiTimer: 0, rescued: false,
        companion: false, homeX: x, homeY: y,
        dialogueIdx: 0, animFrame: 0, animTimer: 0,
    };
    npcs.push(n);
    return n;
}

function updateNPCs() {
    for (const n of npcs) {
        n.animTimer++;
        if (n.animTimer % 10 === 0) n.animFrame = (n.animFrame + 1) % 4;
        // Gravity
        n.vy += GRAVITY * 0.8;
        if (n.vy > MAX_FALL) n.vy = MAX_FALL;
        const ny = n.y + n.vy;
        const bty = Math.floor((ny + n.h) / TILE);
        const btx = Math.floor((n.x + n.w / 2) / TILE);
        if (n.vy > 0 && isSolid(btx, bty)) { n.y = bty * TILE - n.h; n.vy = 0; }
        else n.y = ny;

        if (n.companion) {
            // Follow player
            const dx = player.x - n.x;
            if (Math.abs(dx) > 60) {
                n.vx = (dx > 0 ? 1 : -1) * 1.2;
                n.dir = dx > 0 ? 1 : -1;
            } else n.vx *= 0.7;
            // Jump if blocked
            const frontX = Math.floor((n.x + (n.dir > 0 ? n.w : 0)) / TILE);
            const feetY = Math.floor((n.y + n.h) / TILE);
            if (isSolid(frontX, feetY - 1)) n.vy = -7;
            // Attack nearby enemies
            for (const e of enemies) {
                if (e.dead) continue;
                const d = Math.sqrt((e.x - n.x) ** 2 + (e.y - n.y) ** 2);
                if (d < 40) {
                    e.hp -= 8; e.hitTimer = 10;
                    spawnParticles(e.x + e.w / 2, e.y + e.h / 2, n.color, 3, 3);
                    if (e.hp <= 0) { e.dead = true; player.xp += e.xp || 5; if (typeof totalKills !== 'undefined') totalKills++; }
                    break;
                }
            }
        } else {
            // Idle wander near home
            if (Math.abs(n.x - n.homeX) > 80) { n.dir = n.x > n.homeX ? -1 : 1; }
            if (n.animTimer % 180 === 0) n.dir *= -1;
            n.vx = n.dir * 0.3;
        }
        n.x += n.vx;
        const etx = Math.floor((n.x + (n.vx > 0 ? n.w : 0)) / TILE);
        const ety = Math.floor(n.y / TILE);
        if (isSolid(etx, ety) || isSolid(etx, ety + 1)) { n.x -= n.vx; n.vx = 0; }
    }
}

function drawNPC(ctx, n, camX, camY) {
    const sx = n.x - camX, sy = n.y - camY;
    ctx.save();
    // Body
    ctx.fillStyle = n.color;
    ctx.fillRect(sx, sy, n.w, n.h);
    // Face
    ctx.fillStyle = '#DDBB88';
    ctx.fillRect(sx + 2, sy + 2, n.w - 4, 8);
    // Eyes (friendly green)
    ctx.fillStyle = '#44AA44';
    ctx.fillRect(sx + 3, sy + 4, 2, 2);
    ctx.fillRect(sx + n.w - 5, sy + 4, 2, 2);
    // Name tag
    ctx.fillStyle = '#FFFFFF'; ctx.font = '8px Inter'; ctx.textAlign = 'center';
    ctx.fillText(n.name, sx + n.w / 2, sy - 4);
    // Companion icon
    if (n.companion) {
        ctx.fillStyle = '#44FF44'; ctx.font = '8px sans-serif';
        ctx.fillText('♦', sx + n.w / 2, sy - 12);
    }
    ctx.restore();
}

function interactNPC(n) {
    if (!n || !n.rescued) return;
    const def = NPC_TYPES[n.type];
    if (!def) return;
    if (def.service === 'heal') {
        player.hp = player.maxHp; player.mana = player.maxMana;
        spawnParticles(player.x + player.w / 2, player.y, '#44CC44', 10, 5);
        showNPCDialogue = { npc: n, text: def.dialogue[0], timer: 120 };
        return;
    }
    if (def.shop && def.shop.length > 0) {
        showNPCShop = n;
        showNPCDialogue = { npc: n, text: def.dialogue[n.dialogueIdx % def.dialogue.length], timer: 0 };
        n.dialogueIdx++;
    } else {
        showNPCDialogue = { npc: n, text: def.dialogue[n.dialogueIdx % def.dialogue.length], timer: 120 };
        n.dialogueIdx++;
    }
}

function buyFromNPC(shopItem) {
    if (!shopItem) return false;
    const have = countItem(shopItem.currency);
    if (have >= shopItem.price) {
        removeItem(shopItem.currency, shopItem.price);
        addItem(shopItem.id, shopItem.amt || 1);
        return true;
    }
    return false;
}


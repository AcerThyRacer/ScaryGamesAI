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
    // World evil biome check — look at nearby tiles
    const px = Math.floor(player.x / TILE), py = Math.floor(player.y / TILE);
    let nearCorruption = false, nearCrimson = false, nearVoid = false;
    for (let dx = -5; dx <= 5; dx++) {
        for (let dy = -3; dy <= 3; dy++) {
            const b = getBlock(px + dx, py + dy);
            if (b === T.EBONSTONE || b === T.CORRUPT_GRASS || b === T.DEMONITE_ORE || b === T.SHADOW_ORB) nearCorruption = true;
            if (b === T.CRIMSTONE || b === T.CRIMSON_GRASS || b === T.CRIMTANE_ORE || b === T.CRIMSON_HEART) nearCrimson = true;
            if (b === T.VOID_STONE || b === T.VOID_GRASS || b === T.VOIDITE_ORE || b === T.STELLAR_FRAGMENT) nearVoid = true;
        }
    }
    if (nearCorruption) return ['eater_of_souls', 'corruptor', 'devourer', 'world_feeder', 'clinger'];
    if (nearCrimson) return ['face_monster', 'blood_crawler_evil', 'crimera', 'herpling', 'floaty_gross'];
    if (nearVoid) return ['star_phantom', 'nebula_drifter', 'cosmic_parasite', 'gravity_wraith', 'void_walker'];
    // Surface biome check
    let nearDesert = false, nearSnow = false, nearJungle = false;
    for (let dx = -5; dx <= 5; dx++) {
        for (let dy = -3; dy <= 3; dy++) {
            const b = getBlock(px + dx, py + dy);
            if (b === T.SAND || b === T.SANDSTONE || b === T.HARDENED_SAND || b === T.CACTUS || b === T.DESERT_FOSSIL) nearDesert = true;
            if (b === T.SNOW || b === T.ICE || b === T.SLUSH || b === T.BOREAL_WOOD) nearSnow = true;
            if (b === T.JUNGLE_GRASS || b === T.MUD || b === T.MAHOGANY_WOOD || b === T.BAMBOO) nearJungle = true;
        }
    }
    if (nearDesert && depth < CAVE_Y) return ['antlion', 'vulture', 'tomb_crawler', 'mummy', 'sand_elemental'];
    if (nearSnow && depth < CAVE_Y) return ['ice_slime', 'undead_viking', 'ice_tortoise', 'ice_elemental', 'frost_archer'];
    if (nearJungle && depth < CAVE_Y) return ['jungle_slime', 'hornet', 'man_eater', 'angry_trapper', 'jungle_creeper'];
    // Space biome check
    let nearSpace = false;
    for (let dx = -5; dx <= 5; dx++) {
        for (let dy = -3; dy <= 3; dy++) {
            const b = getBlock(px + dx, py + dy);
            if (b === T.METEORITE || b === T.ASTEROID_ROCK || b === T.SPACE_GLASS || b === T.LUMINITE || b === T.METEOR_CRATER) nearSpace = true;
        }
    }
    if (nearSpace || depth < 15) return ['meteor_head', 'space_worm', 'alien_drone', 'star_jelly', 'cosmic_horror'];
    // Hallowed biome check
    let nearHallowed = false;
    for (let dx = -5; dx <= 5; dx++) {
        for (let dy = -3; dy <= 3; dy++) {
            const b = getBlock(px + dx, py + dy);
            if (b === T.HALLOWED_STONE || b === T.HALLOWED_GRASS || b === T.HALLOWED_SAND || b === T.PEARLSTONE || b === T.CRYSTAL_SHARD) nearHallowed = true;
        }
    }
    if (nearHallowed && depth < CAVE_Y) return ['pixie', 'unicorn', 'gastropod', 'chaos_elemental', 'enchanted_sword'];
    // Hardmode deep enemies (when hardmode active)
    if (typeof hardmodeActive !== 'undefined' && hardmodeActive && depth >= CAVE_Y) return ['paladin', 'hm_wraith', 'chaos_elemental', 'pirate', 'gastropod', 'skeleton', 'wraith'];
    // Dungeon biome check
    let nearDungeon = false;
    for (let ddx = -4; ddx <= 4; ddx++) {
        for (let ddy = -3; ddy <= 3; ddy++) {
            const b = getBlock(px + ddx, py + ddy);
            if (b === T.DUNGEON_BRICK || b === T.CRACKED_BRICK || b === T.BONE_BLOCK) nearDungeon = true;
        }
    }
    if (nearDungeon) {
        if (typeof planteraDefeated !== 'undefined' && planteraDefeated) return ['paladin_hm', 'diabolist', 'necromancer', 'cursed_skull', 'bone_lee'];
        return ['cursed_skull', 'dark_caster', 'necromancer', 'dungeon_slime', 'bone_lee'];
    }
    // Temple biome check
    let nearTemple = false;
    for (let ddx = -4; ddx <= 4; ddx++) {
        for (let ddy = -3; ddy <= 3; ddy++) {
            const b = getBlock(px + ddx, py + ddy);
            if (b === T.LIHZAHRD_BRICK || b === T.LIHZAHRD_ALTAR || b === T.TEMPLE_DOOR) nearTemple = true;
        }
    }
    if (nearTemple) return ['lihzahrd', 'flying_snake', 'lihzahrd_priest'];
    // Event spawning (overrides normal biome)
    if (typeof activeEvent !== 'undefined' && activeEvent) {
        const evEnemies = typeof getEventEnemies === 'function' ? getEventEnemies(activeEvent) : null;
        if (evEnemies) return evEnemies;
    }
    // Celestial pillar spawning
    if (typeof celestialEventActive !== 'undefined' && celestialEventActive) {
        // Near Solar pillar area (x < 25%)
        if (px < Math.floor(typeof WORLD_W !== 'undefined' ? WORLD_W * 0.25 : 100)) return ['selenian', 'drakanian', 'corite', 'crawltipede'];
        // Near Vortex pillar area (25-50%)
        if (px < Math.floor(typeof WORLD_W !== 'undefined' ? WORLD_W * 0.50 : 200)) return ['storm_diver', 'alien_queen', 'alien_larva', 'vortexian'];
        // Near Nebula pillar area (50-75%)
        if (px < Math.floor(typeof WORLD_W !== 'undefined' ? WORLD_W * 0.75 : 300)) return ['nebula_floater', 'brain_suckler', 'predictor', 'evolution_beast'];
        // Near Stardust pillar area (75-100%)
        return ['star_cell', 'flow_invader', 'twinkle_popper', 'milkyway_weaver'];
    }
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
            const tentacles = 6 + boss.phase * 3;
            for (let a = 0; a < tentacles; a++) {
                const ang = (a / tentacles) * Math.PI * 2;
                projectiles.push({ x: boss.x + boss.w / 2, y: boss.y + boss.h / 2, vx: Math.cos(ang) * (2 + boss.phase * 0.5), vy: Math.sin(ang) * (2 + boss.phase * 0.5), damage: 20 + boss.phase * 8, life: 180, color: '#440033', size: 6, fromBoss: true });
            }
            boss.attackCd = 80 - boss.phase * 15;
            if (boss.phase >= 3 && enemies.length < 20) spawnEnemy('shadow_demon', boss.x + (Math.random() - 0.5) * 200, boss.y);
        }
    }
    // ===== PHASE 5: NEW BOSS AI =====
    else if (boss.type === 'ravager') {
        // Fast ground charger — runs, leaps, slams
        boss.vy += GRAVITY;
        if (boss.vy > MAX_FALL) boss.vy = MAX_FALL;
        const bx = Math.floor((boss.x + boss.w / 2) / TILE);
        const by = Math.floor((boss.y + boss.h) / TILE);
        if (isSolid(bx, by)) { boss.y = by * TILE - boss.h; boss.vy = 0; }
        boss.vx = (dx > 0 ? 1 : -1) * (boss.speed + boss.phase * 0.5);
        if (boss.attackCd <= 0 && dist < 250) {
            if (boss.phase >= 2 && Math.random() < 0.4) {
                // Leap slam
                boss.vy = -14; boss.vx = (dx > 0 ? 1 : -1) * 6;
                boss.attackCd = 40;
                spawnParticles(boss.x + boss.w / 2, boss.y + boss.h, '#CC4422', 12, 6);
            } else {
                // Bone spike projectiles forward
                for (let a = -1; a <= 1; a++) {
                    const ang = Math.atan2(dy, dx) + a * 0.15;
                    projectiles.push({ x: boss.x + boss.w / 2, y: boss.y + boss.h / 2, vx: Math.cos(ang) * 5, vy: Math.sin(ang) * 5, damage: 18 + boss.phase * 5, life: 90, color: '#CC4422', size: 4, fromBoss: true });
                }
                boss.attackCd = 50 - boss.phase * 10;
            }
        }
    } else if (boss.type === 'hive_mind') {
        // Floating brain — psychic attacks, minion spawns, teleports
        const targetY = player.y - 90 + Math.sin(boss.animTimer * 0.035) * 70;
        boss.vy += (targetY - boss.y) * 0.01;
        boss.vx += (player.x - boss.x) * 0.004;
        boss.vx *= 0.96; boss.vy *= 0.96;
        if (boss.attackCd <= 0) {
            // Psychic ring burst
            const ringCount = 5 + boss.phase * 3;
            for (let a = 0; a < ringCount; a++) {
                const ang = (a / ringCount) * Math.PI * 2 + boss.animTimer * 0.03;
                projectiles.push({ x: boss.x + boss.w / 2, y: boss.y + boss.h / 2, vx: Math.cos(ang) * 3, vy: Math.sin(ang) * 3, damage: 16 + boss.phase * 6, life: 120, color: '#CC44CC', size: 5, fromBoss: true });
            }
            boss.attackCd = 70 - boss.phase * 12;
            // Spawn minions phase 2+
            if (boss.phase >= 2 && enemies.length < 18) {
                spawnEnemy('fungal_zombie', boss.x + (Math.random() - 0.5) * 150, boss.y + 30);
            }
            // Teleport phase 3
            if (boss.phase >= 3 && Math.random() < 0.25) {
                boss.x = player.x + (Math.random() - 0.5) * 250;
                boss.y = player.y - 150;
                spawnParticles(boss.x + boss.w / 2, boss.y + boss.h / 2, '#CC44CC', 12, 6);
            }
        }
    } else if (boss.type === 'abyssal_serpent') {
        // Long serpent — weaves in sine pattern, spits acid
        const wave = Math.sin(boss.animTimer * 0.04) * 80;
        const targetY2 = player.y + wave;
        boss.vy += (targetY2 - boss.y) * 0.012;
        boss.vx += (player.x - boss.x + Math.sin(boss.animTimer * 0.06) * 100) * 0.006;
        boss.vx *= 0.96; boss.vy *= 0.96;
        if (boss.attackCd <= 0) {
            // Acid spit targeted at player
            for (let a = 0; a < 2 + boss.phase; a++) {
                const ang = Math.atan2(dy, dx) + (a - 1) * 0.2;
                projectiles.push({ x: boss.x + boss.w / 2, y: boss.y + boss.h / 2, vx: Math.cos(ang) * 4.5, vy: Math.sin(ang) * 4.5, damage: 20 + boss.phase * 6, life: 130, color: '#44FF00', size: 4, fromBoss: true });
            }
            boss.attackCd = 55 - boss.phase * 10;
        }
    } else if (boss.type === 'soul_devourer') {
        // Ghost-like — phasing movement, HP drain, soul projectiles
        const orbX = player.x + Math.cos(boss.animTimer * 0.025) * 150;
        const orbY = player.y - 80 + Math.sin(boss.animTimer * 0.04) * 60;
        boss.vx += (orbX - boss.x) * 0.008;
        boss.vy += (orbY - boss.y) * 0.008;
        boss.vx *= 0.95; boss.vy *= 0.95;
        if (boss.attackCd <= 0) {
            // Soul drain — homing projectiles
            const soulCount = 3 + boss.phase * 2;
            for (let a = 0; a < soulCount; a++) {
                const ang = (a / soulCount) * Math.PI * 2;
                projectiles.push({ x: boss.x + boss.w / 2, y: boss.y + boss.h / 2, vx: Math.cos(ang) * 2.5, vy: Math.sin(ang) * 2.5, damage: 22 + boss.phase * 7, life: 160, color: '#6688FF', size: 5, fromBoss: true });
            }
            boss.attackCd = 65 - boss.phase * 12;
            // Life steal in phase 3+
            if (boss.phase >= 3 && dist < 200) {
                const steal = Math.min(player.hp, 5 + boss.phase * 2);
                player.hp -= steal; boss.hp = Math.min(boss.maxHp, boss.hp + steal);
                spawnParticles(player.x + player.w / 2, player.y, '#6688FF', 6, 4);
            }
        }
    } else if (boss.type === 'plague_doctor') {
        // Ground boss — throws poison clouds, creates toxic puddles
        boss.vy += GRAVITY;
        if (boss.vy > MAX_FALL) boss.vy = MAX_FALL;
        const bx2 = Math.floor((boss.x + boss.w / 2) / TILE);
        const by2 = Math.floor((boss.y + boss.h) / TILE);
        if (isSolid(bx2, by2)) { boss.y = by2 * TILE - boss.h; boss.vy = 0; }
        boss.vx = (dx > 0 ? 1 : -1) * (boss.speed + boss.phase * 0.2);
        if (boss.attackCd <= 0) {
            // Poison cloud burst
            const clouds = 4 + boss.phase * 2;
            for (let a = 0; a < clouds; a++) {
                const ang = Math.atan2(dy, dx) + (a - clouds / 2) * 0.25;
                projectiles.push({ x: boss.x + boss.w / 2, y: boss.y + boss.h / 4, vx: Math.cos(ang) * 3, vy: Math.sin(ang) * 3 - 1, damage: 14 + boss.phase * 5, life: 150, color: '#66AA22', size: 6, fromBoss: true });
            }
            boss.attackCd = 70 - boss.phase * 12;
            // Jump away phase 2+
            if (boss.phase >= 2 && dist < 100) { boss.vy = -10; boss.vx = (dx > 0 ? -1 : 1) * 5; }
        }
    } else if (boss.type === 'storm_colossus') {
        // Massive ground boss — slow but devastating, lightning strikes
        boss.vy += GRAVITY;
        if (boss.vy > MAX_FALL) boss.vy = MAX_FALL;
        const bx3 = Math.floor((boss.x + boss.w / 2) / TILE);
        const by3 = Math.floor((boss.y + boss.h) / TILE);
        if (isSolid(bx3, by3)) { boss.y = by3 * TILE - boss.h; boss.vy = 0; }
        boss.vx = (dx > 0 ? 1 : -1) * (boss.speed + boss.phase * 0.15);
        if (boss.attackCd <= 0) {
            // Lightning strike — fast projectiles from above
            for (let a = 0; a < 3 + boss.phase; a++) {
                const lx = player.x + (Math.random() - 0.5) * 200;
                projectiles.push({ x: lx, y: boss.y - 100, vx: 0, vy: 8, damage: 25 + boss.phase * 8, life: 60, color: '#44CCFF', size: 5, fromBoss: true });
            }
            boss.attackCd = 80 - boss.phase * 15;
            // Shockwave stomp phase 2+
            if (boss.phase >= 2) {
                for (let a = 0; a < 8; a++) {
                    const ang = (a / 8) * Math.PI * 2;
                    projectiles.push({ x: boss.x + boss.w / 2, y: boss.y + boss.h, vx: Math.cos(ang) * 4, vy: -2, damage: 20 + boss.phase * 5, life: 80, color: '#33AABB', size: 4, fromBoss: true });
                }
                if (typeof triggerShake === 'function') triggerShake(12);
            }
        }
    } else if (boss.type === 'blood_titan') {
        // Slow massive boss — only during blood moon, devastating melee + blood rain
        boss.vy += GRAVITY * 0.5;
        if (boss.vy > MAX_FALL) boss.vy = MAX_FALL;
        const bx4 = Math.floor((boss.x + boss.w / 2) / TILE);
        const by4 = Math.floor((boss.y + boss.h) / TILE);
        if (isSolid(bx4, by4)) { boss.y = by4 * TILE - boss.h; boss.vy = 0; }
        boss.vx = (dx > 0 ? 1 : -1) * (boss.speed + boss.phase * 0.2);
        if (boss.attackCd <= 0) {
            // Blood rain — projectiles from sky
            for (let a = 0; a < 5 + boss.phase * 3; a++) {
                const rx = player.x + (Math.random() - 0.5) * 300;
                projectiles.push({ x: rx, y: boss.y - 150, vx: (Math.random() - 0.5) * 2, vy: 5, damage: 18 + boss.phase * 6, life: 100, color: '#AA0022', size: 4, fromBoss: true });
            }
            boss.attackCd = 60 - boss.phase * 10;
            // Melee slam phase 3+
            if (boss.phase >= 3 && dist < 150) {
                boss.vy = -10;
                spawnParticles(boss.x + boss.w / 2, boss.y + boss.h, '#AA0022', 15, 8);
                if (typeof triggerShake === 'function') triggerShake(15);
            }
        }
    } else if (boss.type === 'architect') {
        // Tactical boss — spawns turrets, builds walls, fires precise shots
        boss.vy += GRAVITY;
        if (boss.vy > MAX_FALL) boss.vy = MAX_FALL;
        const bx5 = Math.floor((boss.x + boss.w / 2) / TILE);
        const by5 = Math.floor((boss.y + boss.h) / TILE);
        if (isSolid(bx5, by5)) { boss.y = by5 * TILE - boss.h; boss.vy = 0; }
        // Keep distance from player
        if (dist < 150) boss.vx = (dx > 0 ? -1 : 1) * boss.speed * 1.5;
        else if (dist > 300) boss.vx = (dx > 0 ? 1 : -1) * boss.speed;
        else boss.vx *= 0.9;
        if (boss.attackCd <= 0) {
            // Precise targeted shots
            for (let a = 0; a < 2 + boss.phase; a++) {
                const ang = Math.atan2(dy, dx) + (a - 1) * 0.1;
                projectiles.push({ x: boss.x + boss.w / 2, y: boss.y + boss.h / 2, vx: Math.cos(ang) * 5, vy: Math.sin(ang) * 5, damage: 16 + boss.phase * 6, life: 120, color: '#BBAA77', size: 4, fromBoss: true });
            }
            boss.attackCd = 50 - boss.phase * 8;
            // Spawn turret mines phase 2+
            if (boss.phase >= 2 && Math.random() < 0.3 && enemies.length < 15) {
                spawnEnemy('bone_archer', boss.x + (Math.random() - 0.5) * 100, boss.y);
            }
            // Build walls phase 3
            if (boss.phase >= 3 && Math.random() < 0.2) {
                const wallX = Math.floor(boss.x / TILE) + (dx > 0 ? -3 : 3);
                const wallY = Math.floor(boss.y / TILE);
                for (let wy = -2; wy <= 2; wy++) {
                    if (getBlock(wallX, wallY + wy) === T.AIR) setBlock(wallX, wallY + wy, T.BONE_BRICK);
                }
                spawnParticles(wallX * TILE, wallY * TILE, '#BBAA77', 8, 4);
            }
        }
    }
    // ===== WORLD EVIL BOSS AI =====
    else if (boss.type === 'eater_of_worlds') {
        // Worm boss — charges through ground, segments
        boss.vx += (player.x - boss.x) * 0.006;
        boss.vy += (player.y - boss.y + 30) * 0.008;
        boss.vx *= 0.96; boss.vy *= 0.96;
        const maxS = boss.speed + boss.phase * 0.5;
        if (Math.abs(boss.vx) > maxS) boss.vx = maxS * Math.sign(boss.vx);
        if (Math.abs(boss.vy) > maxS) boss.vy = maxS * Math.sign(boss.vy);
        if (boss.attackCd <= 0) {
            if (boss.phase >= 2) {
                for (let a = 0; a < 3 + boss.phase; a++) {
                    const ang = Math.atan2(dy, dx) + (a - 2) * 0.3;
                    projectiles.push({ x: boss.x + boss.w / 2, y: boss.y + boss.h / 2, vx: Math.cos(ang) * 3, vy: Math.sin(ang) * 3, damage: 12 + boss.phase * 4, life: 100, color: '#5533AA', size: 4, fromBoss: true });
                }
            }
            boss.attackCd = 60 - boss.phase * 10;
            if (boss.phase >= 3 && enemies.length < 15) {
                spawnEnemy('eater_of_souls', boss.x + (Math.random() - 0.5) * 100, boss.y);
            }
        }
    } else if (boss.type === 'brain_of_cthulhu') {
        // Floating brain — teleports and summons creepers
        const targetYBoc = player.y - 100 + Math.sin(boss.animTimer * 0.04) * 80;
        boss.vy += (targetYBoc - boss.y) * 0.01;
        boss.vx += (player.x - boss.x) * 0.004;
        boss.vx *= 0.95; boss.vy *= 0.95;
        if (boss.attackCd <= 0) {
            if (boss.phase === 1) {
                if (enemies.length < 20) {
                    for (let i = 0; i < 3; i++) {
                        spawnEnemy('crimera', boss.x + (Math.random() - 0.5) * 150, boss.y + (Math.random() - 0.5) * 100);
                    }
                }
                boss.attackCd = 90;
            } else {
                boss.vx += (dx / Math.max(1, dist)) * (5 + boss.phase * 2);
                boss.vy += (dy / Math.max(1, dist)) * (5 + boss.phase * 2);
                const ringCount = 6 + boss.phase * 2;
                for (let a = 0; a < ringCount; a++) {
                    const ang = (a / ringCount) * Math.PI * 2;
                    projectiles.push({ x: boss.x + boss.w / 2, y: boss.y + boss.h / 2, vx: Math.cos(ang) * 2.5, vy: Math.sin(ang) * 2.5, damage: 16 + boss.phase * 5, life: 100, color: '#CC3344', size: 5, fromBoss: true });
                }
                boss.attackCd = 50 - boss.phase * 8;
                if (boss.phase >= 3 && Math.random() < 0.3) {
                    boss.x = player.x + (Math.random() - 0.5) * 250;
                    boss.y = player.y - 120;
                    spawnParticles(boss.x + boss.w / 2, boss.y + boss.h / 2, '#CC3344', 15, 6);
                }
            }
        }
    } else if (boss.type === 'void_maw') {
        // Gravity well boss — pulls player in, shoots void bolts
        const orbXVm = player.x + Math.cos(boss.animTimer * 0.02) * 180;
        const orbYVm = player.y - 60 + Math.sin(boss.animTimer * 0.035) * 50;
        boss.vx += (orbXVm - boss.x) * 0.006;
        boss.vy += (orbYVm - boss.y) * 0.006;
        boss.vx *= 0.95; boss.vy *= 0.95;
        if (dist < 300 && dist > 30) {
            const pull = 0.3 + boss.phase * 0.15;
            player.vx += (boss.x - player.x) / dist * pull;
            player.vy += (boss.y - player.y) / dist * pull * 0.5;
        }
        if (boss.attackCd <= 0) {
            const bolts = 8 + boss.phase * 3;
            for (let a = 0; a < bolts; a++) {
                const ang = (a / bolts) * Math.PI * 2 + boss.animTimer * 0.02;
                projectiles.push({ x: boss.x + boss.w / 2, y: boss.y + boss.h / 2, vx: Math.cos(ang) * 3, vy: Math.sin(ang) * 3, damage: 18 + boss.phase * 6, life: 120, color: '#7722DD', size: 5, fromBoss: true });
            }
            boss.attackCd = 70 - boss.phase * 15;
            if (boss.phase >= 2 && enemies.length < 18) {
                spawnEnemy('star_phantom', boss.x + (Math.random() - 0.5) * 200, boss.y + (Math.random() - 0.5) * 100);
            }
            if (boss.phase >= 3 && Math.random() < 0.25) {
                player.vy = -12;
                spawnParticles(player.x + player.w / 2, player.y + player.h / 2, '#BB66FF', 10, 6);
                if (typeof triggerShake === 'function') triggerShake(10);
            }
        }
    }
    // ===== STAR DESTROYER BOSS AI =====
    else if (boss.type === 'star_destroyer') {
        // Massive ship that orbits and fires weapons
        const orbXSd = player.x + Math.cos(boss.animTimer * 0.015) * 200;
        const orbYSd = player.y - 120 + Math.sin(boss.animTimer * 0.02) * 40;
        boss.vx += (orbXSd - boss.x) * 0.004;
        boss.vy += (orbYSd - boss.y) * 0.004;
        boss.vx *= 0.96; boss.vy *= 0.96;
        if (boss.attackCd <= 0) {
            if (boss.phase === 1) {
                // Laser barrage: multiple short-range lasers
                for (let i = 0; i < 5; i++) {
                    const ang = Math.atan2(dy, dx) + (i - 2) * 0.15;
                    projectiles.push({ x: boss.x + boss.w / 2, y: boss.y + boss.h, vx: Math.cos(ang) * 6, vy: Math.sin(ang) * 6, damage: 15, life: 80, color: '#33AACC', size: 3, fromBoss: true });
                }
                // Deploy drone minion
                if (enemies.length < 12 && Math.random() < 0.4) {
                    spawnEnemy('alien_drone', boss.x + (Math.random() - 0.5) * boss.w, boss.y + boss.h);
                }
            } else if (boss.phase === 2) {
                // Missile swarm
                for (let i = 0; i < 8; i++) {
                    const ang = (i / 8) * Math.PI * 2;
                    projectiles.push({ x: boss.x + boss.w / 2, y: boss.y + boss.h / 2, vx: Math.cos(ang) * 4, vy: Math.sin(ang) * 4, damage: 20, life: 120, color: '#FF4400', size: 4, fromBoss: true });
                }
                // Tractor beam — pull player
                if (dist < 250) {
                    player.vx += (boss.x - player.x) * 0.02;
                    player.vy += (boss.y - player.y) * 0.02;
                }
            } else {
                // Death laser — continuous beam
                for (let i = 0; i < 12; i++) {
                    const ang = Math.atan2(dy, dx) + (i - 6) * 0.08;
                    projectiles.push({ x: boss.x + boss.w / 2, y: boss.y + boss.h, vx: Math.cos(ang) * 8, vy: Math.sin(ang) * 8, damage: 25, life: 60, color: '#FFDD44', size: 5, fromBoss: true });
                }
                // Ram charge
                if (Math.random() < 0.15) {
                    boss.vx = dx > 0 ? 8 : -8;
                    boss.vy = dy > 0 ? 4 : -4;
                }
            }
            boss.attackCd = 60 - boss.phase * 10;
        }
    }
    // ===== MOON LORD BOSS AI =====
    else if (boss.type === 'moon_lord') {
        // Celestial being — floats above, multi-attack
        const floatYMl = player.y - 150 + Math.sin(boss.animTimer * 0.02) * 30;
        boss.vx += (player.x - boss.x) * 0.003;
        boss.vy += (floatYMl - boss.y) * 0.005;
        boss.vx *= 0.95; boss.vy *= 0.95;
        if (boss.attackCd <= 0) {
            if (boss.phase === 1) {
                // Eye beams
                const ang = Math.atan2(dy, dx);
                projectiles.push({ x: boss.x + boss.w * 0.3, y: boss.y + boss.h * 0.3, vx: Math.cos(ang) * 7, vy: Math.sin(ang) * 7, damage: 25, life: 100, color: '#44FFAA', size: 5, fromBoss: true });
                projectiles.push({ x: boss.x + boss.w * 0.7, y: boss.y + boss.h * 0.3, vx: Math.cos(ang) * 7, vy: Math.sin(ang) * 7, damage: 25, life: 100, color: '#44FFAA', size: 5, fromBoss: true });
                // Phantom hand grab
                if (Math.random() < 0.2 && dist < 200) {
                    player.vx = (boss.x - player.x) * 0.1;
                    player.vy = -8;
                    spawnParticles(player.x, player.y, '#44FFAA', 8, 4);
                }
            } else if (boss.phase === 2) {
                // Deathray — sweeping beam
                const sweepAng = boss.animTimer * 0.05;
                for (let i = 0; i < 3; i++) {
                    projectiles.push({ x: boss.x + boss.w / 2, y: boss.y + boss.h / 2, vx: Math.cos(sweepAng + i * 0.2) * 9, vy: Math.sin(sweepAng + i * 0.2) * 9, damage: 30, life: 60, color: '#88FFCC', size: 6, fromBoss: true });
                }
                // Summon true eyes
                if (enemies.length < 10 && Math.random() < 0.15) {
                    spawnEnemy('star_jelly', boss.x + (Math.random() - 0.5) * 200, boss.y + (Math.random() - 0.5) * 100);
                }
            } else {
                // Phantasmal deathray sweep — massive continuous beam
                const sweepSpeed = 0.03;
                for (let i = 0; i < 15; i++) {
                    const ang = boss.animTimer * sweepSpeed + (i * 0.1);
                    projectiles.push({ x: boss.x + boss.w / 2, y: boss.y + boss.h / 2, vx: Math.cos(ang) * 10, vy: Math.sin(ang) * 10, damage: 35, life: 50, color: '#AAFFDD', size: 7, fromBoss: true });
                }
                // Reality collapse — shake
                if (typeof triggerShake === 'function') triggerShake(5);
            }
            boss.attackCd = 45 - boss.phase * 8;
        }
    }
    // ===== DESTROYER BOSS AI =====
    else if (boss.type === 'destroyer') {
        // Worm segments that burrow in circular pattern
        const wormAng = boss.animTimer * 0.025;
        const wormRadius = 150 + Math.sin(boss.animTimer * 0.01) * 60;
        const targX = player.x + Math.cos(wormAng) * wormRadius;
        const targY = player.y + Math.sin(wormAng) * wormRadius;
        boss.vx += (targX - boss.x) * 0.006;
        boss.vy += (targY - boss.y) * 0.006;
        boss.vx *= 0.95; boss.vy *= 0.95;
        if (boss.attackCd <= 0) {
            if (boss.phase === 1) {
                // Deploy probes
                if (enemies.length < 12 && Math.random() < 0.3) {
                    spawnEnemy('alien_drone', boss.x + (Math.random() - 0.5) * 40, boss.y - 30);
                }
                // Laser from head
                const ang = Math.atan2(dy, dx);
                projectiles.push({ x: boss.x + boss.w / 2, y: boss.y, vx: Math.cos(ang) * 7, vy: Math.sin(ang) * 7, damage: 18, life: 80, color: '#3399FF', size: 3, fromBoss: true });
            } else if (boss.phase === 2) {
                // Rapid laser + mass probes
                for (let i = 0; i < 4; i++) {
                    const ang = Math.atan2(dy, dx) + (i - 2) * 0.2;
                    projectiles.push({ x: boss.x + boss.w / 2, y: boss.y, vx: Math.cos(ang) * 8, vy: Math.sin(ang) * 8, damage: 22, life: 70, color: '#55BBFF', size: 4, fromBoss: true });
                }
                if (enemies.length < 15 && Math.random() < 0.4) spawnEnemy('alien_drone', boss.x, boss.y - 20);
            } else {
                // Death coil — massive spray
                for (let i = 0; i < 8; i++) {
                    const ang = (i / 8) * Math.PI * 2;
                    projectiles.push({ x: boss.x + boss.w / 2, y: boss.y + boss.h / 2, vx: Math.cos(ang) * 9, vy: Math.sin(ang) * 9, damage: 28, life: 60, color: '#3399FF', size: 5, fromBoss: true });
                }
                boss.vx = (player.x - boss.x) * 0.08;
                boss.vy = (player.y - boss.y) * 0.08;
            }
            boss.attackCd = 50 - boss.phase * 12;
        }
    }
    // ===== THE TWINS BOSS AI =====
    else if (boss.type === 'the_twins') {
        // Dual eye boss — orbits separately
        const orbAng = boss.animTimer * 0.02;
        const twinOff = 80;
        const targX = player.x + Math.cos(orbAng) * 120;
        const targY = player.y - 100 + Math.sin(orbAng * 0.7) * 40;
        boss.vx += (targX - boss.x) * 0.005;
        boss.vy += (targY - boss.y) * 0.005;
        boss.vx *= 0.95; boss.vy *= 0.95;
        if (boss.attackCd <= 0) {
            const ang = Math.atan2(dy, dx);
            if (boss.phase === 1) {
                // Retinazer laser
                projectiles.push({ x: boss.x + boss.w * 0.3, y: boss.y + boss.h / 2, vx: Math.cos(ang) * 8, vy: Math.sin(ang) * 8, damage: 20, life: 80, color: '#FF3333', size: 4, fromBoss: true });
                // Spazmatism fireball
                projectiles.push({ x: boss.x + boss.w * 0.7, y: boss.y + boss.h / 2, vx: Math.cos(ang) * 6, vy: Math.sin(ang) * 6, damage: 24, life: 90, color: '#33FF33', size: 5, fromBoss: true });
            } else if (boss.phase === 2) {
                // Focused deathray + cursed flame spray
                for (let i = 0; i < 3; i++) {
                    projectiles.push({ x: boss.x + boss.w * 0.3, y: boss.y + boss.h / 2, vx: Math.cos(ang + i * 0.1) * 9, vy: Math.sin(ang + i * 0.1) * 9, damage: 25, life: 60, color: '#FF5555', size: 5, fromBoss: true });
                }
                for (let i = 0; i < 5; i++) {
                    const fa = ang + (Math.random() - 0.5) * 0.8;
                    projectiles.push({ x: boss.x + boss.w * 0.7, y: boss.y + boss.h / 2, vx: Math.cos(fa) * 5, vy: Math.sin(fa) * 5, damage: 28, life: 100, color: '#44FF44', size: 4, fromBoss: true });
                }
                // Twin dash
                if (Math.random() < 0.15) { boss.vx = dx > 0 ? 10 : -10; boss.vy = dy > 0 ? 5 : -5; }
            } else {
                // Twin deathray cross
                for (let i = 0; i < 10; i++) {
                    const a1 = ang + (i - 5) * 0.12;
                    projectiles.push({ x: boss.x + boss.w / 2, y: boss.y + boss.h / 2, vx: Math.cos(a1) * 10, vy: Math.sin(a1) * 10, damage: 30, life: 50, color: '#FF33FF', size: 6, fromBoss: true });
                }
                if (Math.random() < 0.2) { boss.vx = dx > 0 ? 12 : -12; }
            }
            boss.attackCd = 40 - boss.phase * 8;
        }
    }
    // ===== SKELETRON PRIME BOSS AI =====
    else if (boss.type === 'skeletron_prime') {
        // Mechanical skull — floats above, 4 arm attacks
        const floatY = player.y - 130 + Math.sin(boss.animTimer * 0.015) * 35;
        boss.vx += (player.x - boss.x) * 0.003;
        boss.vy += (floatY - boss.y) * 0.005;
        boss.vx *= 0.95; boss.vy *= 0.95;
        if (boss.attackCd <= 0) {
            const ang = Math.atan2(dy, dx);
            if (boss.phase === 1) {
                // 4 different arm attacks
                const armType = Math.floor(boss.animTimer / 60) % 4;
                if (armType === 0) { // Cannon
                    projectiles.push({ x: boss.x, y: boss.y + boss.h, vx: Math.cos(ang) * 7, vy: Math.sin(ang) * 7, damage: 22, life: 80, color: '#AAAAAA', size: 5, fromBoss: true });
                } else if (armType === 1) { // Saw
                    if (dist < 80) { player.hp -= 15; spawnParticles(player.x, player.y, '#FF4444', 6, 3); }
                } else if (armType === 2) { // Vice grab
                    if (dist < 120) { player.vx = (boss.x - player.x) * 0.08; player.vy = -5; }
                } else { // Laser
                    for (let i = 0; i < 3; i++) {
                        projectiles.push({ x: boss.x + boss.w, y: boss.y + boss.h / 2, vx: Math.cos(ang + i * 0.15) * 8, vy: Math.sin(ang + i * 0.15) * 8, damage: 18, life: 70, color: '#33FF66', size: 3, fromBoss: true });
                    }
                }
            } else if (boss.phase === 2) {
                // Head spin + rapid cannon
                for (let i = 0; i < 6; i++) {
                    const a = (i / 6) * Math.PI * 2 + boss.animTimer * 0.1;
                    projectiles.push({ x: boss.x + boss.w / 2, y: boss.y + boss.h / 2, vx: Math.cos(a) * 6, vy: Math.sin(a) * 6, damage: 25, life: 60, color: '#33FF66', size: 4, fromBoss: true });
                }
            } else {
                // Skull missile barrage + death spin
                for (let i = 0; i < 12; i++) {
                    const a = (i / 12) * Math.PI * 2;
                    projectiles.push({ x: boss.x + boss.w / 2, y: boss.y + boss.h / 2, vx: Math.cos(a) * 8, vy: Math.sin(a) * 8, damage: 30, life: 50, color: '#55FF88', size: 6, fromBoss: true });
                }
                if (typeof triggerShake === 'function') triggerShake(3);
            }
            boss.attackCd = 55 - boss.phase * 12;
        }
    }
    // ===== PLANTERA BOSS AI =====
    else if (boss.type === 'plantera') {
        boss.vx += (player.x - boss.x) * 0.003;
        boss.vy += (player.y - boss.y) * 0.003;
        boss.vx *= 0.96; boss.vy *= 0.96;
        if (boss.attackCd <= 0) {
            const ang = Math.atan2(dy, dx);
            if (boss.phase === 1) {
                for (let i = 0; i < 3; i++) {
                    const sa = ang + (Math.random() - 0.5) * 0.6;
                    projectiles.push({ x: boss.x + boss.w / 2, y: boss.y + boss.h / 2, vx: Math.cos(sa) * 5, vy: Math.sin(sa) * 5, damage: 18, life: 80, color: '#44BB44', size: 3, fromBoss: true });
                }
                projectiles.push({ x: boss.x + boss.w / 2, y: boss.y + boss.h / 2, vx: Math.cos(ang) * 7, vy: Math.sin(ang) * 7, damage: 22, life: 90, color: '#228822', size: 5, fromBoss: true });
            } else if (boss.phase === 2) {
                for (let i = 0; i < 6; i++) {
                    const pa = (i / 6) * Math.PI * 2 + boss.animTimer * 0.06;
                    projectiles.push({ x: boss.x + boss.w / 2, y: boss.y + boss.h / 2, vx: Math.cos(pa) * 6, vy: Math.sin(pa) * 6, damage: 25, life: 70, color: '#FF66AA', size: 5, fromBoss: true });
                }
                for (let i = 0; i < 4; i++) {
                    projectiles.push({ x: boss.x + (Math.random() - 0.5) * 40, y: boss.y + (Math.random() - 0.5) * 40, vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2, damage: 15, life: 120, color: '#AAFF44', size: 4, fromBoss: true });
                }
            } else {
                for (let i = 0; i < 8; i++) {
                    const ta = (i / 8) * Math.PI * 2;
                    projectiles.push({ x: boss.x + boss.w / 2, y: boss.y + boss.h / 2, vx: Math.cos(ta) * 4, vy: Math.sin(ta) * 4, damage: 30, life: 80, color: '#448822', size: 6, fromBoss: true });
                }
                boss.vx = (player.x - boss.x) * 0.1; boss.vy = (player.y - boss.y) * 0.1;
                if (typeof triggerShake === 'function') triggerShake(2);
            }
            boss.attackCd = 45 - boss.phase * 10;
        }
    }
    // ===== GOLEM BOSS AI =====
    else if (boss.type === 'golem') {
        boss.vx += (player.x - boss.x + (Math.random() - 0.5) * 60) * 0.002;
        boss.vy += 0.5;
        boss.vx *= 0.95;
        if (boss.attackCd <= 0) {
            const ang = Math.atan2(dy, dx);
            if (boss.phase === 1) {
                if (dist < 80) { player.hp -= 20; spawnParticles(player.x, player.y, '#AA7744', 8, 4); if (typeof triggerShake === 'function') triggerShake(3); }
                projectiles.push({ x: boss.x + boss.w * 0.35, y: boss.y + boss.h * 0.3, vx: Math.cos(ang) * 6, vy: Math.sin(ang) * 6, damage: 20, life: 80, color: '#FF4422', size: 4, fromBoss: true });
                projectiles.push({ x: boss.x + boss.w * 0.65, y: boss.y + boss.h * 0.3, vx: Math.cos(ang) * 6, vy: Math.sin(ang) * 6, damage: 20, life: 80, color: '#FF4422', size: 4, fromBoss: true });
            } else if (boss.phase === 2) {
                boss.vy = -12;
                for (let i = 0; i < 4; i++) {
                    const fa = ang + (i - 2) * 0.3;
                    projectiles.push({ x: boss.x + boss.w / 2, y: boss.y, vx: Math.cos(fa) * 5, vy: Math.sin(fa) * 5 - 2, damage: 25, life: 90, color: '#887744', size: 6, fromBoss: true });
                }
            } else {
                for (let i = 0; i < 8; i++) {
                    const ha = (i / 8) * Math.PI * 2 + boss.animTimer * 0.08;
                    projectiles.push({ x: boss.x + boss.w / 2, y: boss.y + boss.h * 0.2, vx: Math.cos(ha) * 7, vy: Math.sin(ha) * 7, damage: 28, life: 60, color: '#FF6644', size: 5, fromBoss: true });
                }
                for (let i = 0; i < 6; i++) {
                    projectiles.push({ x: boss.x + boss.w / 2, y: boss.y + boss.h, vx: (i - 3) * 3, vy: -1, damage: 20, life: 40, color: '#AA8844', size: 4, fromBoss: true });
                }
                if (typeof triggerShake === 'function') triggerShake(5);
            }
            boss.attackCd = 60 - boss.phase * 12;
        }
    }
    // ===== DUKE FISHRON BOSS AI =====
    else if (boss.type === 'duke_fishron') {
        const fAng = boss.animTimer * 0.025;
        const fRadius = 130 + Math.sin(boss.animTimer * 0.012) * 50;
        const targX = player.x + Math.cos(fAng) * fRadius;
        const targY = player.y - 80 + Math.sin(fAng * 0.8) * 50;
        boss.vx += (targX - boss.x) * 0.008;
        boss.vy += (targY - boss.y) * 0.008;
        boss.vx *= 0.94; boss.vy *= 0.94;
        if (boss.attackCd <= 0) {
            const ang = Math.atan2(dy, dx);
            if (boss.phase === 1) {
                for (let i = 0; i < 5; i++) {
                    const ba = ang + (Math.random() - 0.5) * 0.5;
                    projectiles.push({ x: boss.x + boss.w / 2, y: boss.y + boss.h / 2, vx: Math.cos(ba) * 6, vy: Math.sin(ba) * 6, damage: 22, life: 80, color: '#44CCFF', size: 5, fromBoss: true });
                }
                if (Math.random() < 0.2) { boss.vx = dx > 0 ? 12 : -12; boss.vy = dy > 0 ? 6 : -6; }
            } else if (boss.phase === 2) {
                for (let i = 0; i < 8; i++) {
                    const sa = (i / 8) * Math.PI * 2 + boss.animTimer * 0.05;
                    projectiles.push({ x: boss.x + boss.w / 2, y: boss.y + boss.h / 2, vx: Math.cos(sa) * 7, vy: Math.sin(sa) * 7, damage: 28, life: 70, color: '#3388AA', size: 6, fromBoss: true });
                }
                if (Math.random() < 0.3) { boss.vx = dx > 0 ? 15 : -15; }
            } else {
                if (Math.random() < 0.15) {
                    boss.x = player.x + (Math.random() - 0.5) * 200;
                    boss.y = player.y - 100;
                    spawnParticles(boss.x + boss.w / 2, boss.y + boss.h / 2, '#44AACC', 15, 5);
                }
                for (let i = 0; i < 12; i++) {
                    const wa = (i / 12) * Math.PI * 2;
                    projectiles.push({ x: boss.x + boss.w / 2, y: boss.y + boss.h / 2, vx: Math.cos(wa) * 9, vy: Math.sin(wa) * 9, damage: 35, life: 50, color: '#2266AA', size: 7, fromBoss: true });
                }
                boss.vx = dx > 0 ? 18 : -18; boss.vy = dy > 0 ? 8 : -8;
                if (typeof triggerShake === 'function') triggerShake(4);
            }
            boss.attackCd = 35 - boss.phase * 6;
        }
    }
    // ===== SOLAR PILLAR BOSS AI =====
    else if (boss.type === 'solar_pillar') {
        // Stationary — no movement
        boss.vx = 0; boss.vy = 0;
        if (boss.attackCd <= 0) {
            if (boss.phase === 1) {
                // Flame wave
                for (let i = 0; i < 4; i++) {
                    const fa = Math.random() * Math.PI * 2;
                    projectiles.push({ x: boss.x + boss.w / 2, y: boss.y + boss.h / 2, vx: Math.cos(fa) * 5, vy: Math.sin(fa) * 5, damage: 25, life: 80, color: '#FF6622', size: 5, fromBoss: true });
                }
                // Spawn solar enemies
                if (enemies.length < 10 && Math.random() < 0.3) spawnEnemy('selenian', boss.x + (Math.random() - 0.5) * 80, boss.y - 30);
            } else if (boss.phase === 2) {
                // Fire ring
                for (let i = 0; i < 8; i++) {
                    const fa = (i / 8) * Math.PI * 2 + boss.animTimer * 0.03;
                    projectiles.push({ x: boss.x + boss.w / 2, y: boss.y + boss.h / 2, vx: Math.cos(fa) * 6, vy: Math.sin(fa) * 6, damage: 30, life: 70, color: '#FF8844', size: 6, fromBoss: true });
                }
                if (enemies.length < 12 && Math.random() < 0.2) spawnEnemy('crawltipede', boss.x, boss.y - 50);
            } else {
                for (let i = 0; i < 12; i++) {
                    const fa = (i / 12) * Math.PI * 2;
                    projectiles.push({ x: boss.x + boss.w / 2, y: boss.y + boss.h / 2, vx: Math.cos(fa) * 8, vy: Math.sin(fa) * 8, damage: 40, life: 60, color: '#FF4400', size: 7, fromBoss: true });
                }
                if (typeof triggerShake === 'function') triggerShake(3);
            }
            boss.attackCd = 50 - boss.phase * 10;
        }
    }
    // ===== VORTEX PILLAR BOSS AI =====
    else if (boss.type === 'vortex_pillar') {
        boss.vx = 0; boss.vy = 0;
        if (boss.attackCd <= 0) {
            const ang = Math.atan2(dy, dx);
            if (boss.phase === 1) {
                for (let i = 0; i < 3; i++) {
                    const la = ang + (i - 1) * 0.3;
                    projectiles.push({ x: boss.x + boss.w / 2, y: boss.y + boss.h / 2, vx: Math.cos(la) * 8, vy: Math.sin(la) * 8, damage: 22, life: 70, color: '#22CCAA', size: 4, fromBoss: true });
                }
                if (enemies.length < 10 && Math.random() < 0.3) spawnEnemy('storm_diver', boss.x, boss.y - 40);
            } else if (boss.phase === 2) {
                for (let i = 0; i < 6; i++) {
                    const sa = (i / 6) * Math.PI * 2 + boss.animTimer * 0.04;
                    projectiles.push({ x: boss.x + boss.w / 2, y: boss.y + boss.h / 2, vx: Math.cos(sa) * 7, vy: Math.sin(sa) * 7, damage: 28, life: 65, color: '#44DDBB', size: 5, fromBoss: true });
                }
                // Gravity pull
                if (dist < 200) { player.vx += (boss.x - player.x) * 0.005; player.vy += (boss.y - player.y) * 0.005; }
            } else {
                for (let i = 0; i < 10; i++) {
                    const ca = (i / 10) * Math.PI * 2;
                    projectiles.push({ x: boss.x + boss.w / 2, y: boss.y + boss.h / 2, vx: Math.cos(ca) * 9, vy: Math.sin(ca) * 9, damage: 35, life: 55, color: '#33BBAA', size: 6, fromBoss: true });
                }
            }
            boss.attackCd = 50 - boss.phase * 10;
        }
    }
    // ===== NEBULA PILLAR BOSS AI =====
    else if (boss.type === 'nebula_pillar') {
        boss.vx = 0; boss.vy = 0;
        if (boss.attackCd <= 0) {
            const ang = Math.atan2(dy, dx);
            if (boss.phase === 1) {
                projectiles.push({ x: boss.x + boss.w / 2, y: boss.y + boss.h / 2, vx: Math.cos(ang) * 6, vy: Math.sin(ang) * 6, damage: 28, life: 90, color: '#CC44FF', size: 6, fromBoss: true });
                if (enemies.length < 10 && Math.random() < 0.3) spawnEnemy('nebula_floater', boss.x + (Math.random() - 0.5) * 60, boss.y - 30);
            } else if (boss.phase === 2) {
                for (let i = 0; i < 5; i++) {
                    const na = ang + (Math.random() - 0.5) * 0.8;
                    projectiles.push({ x: boss.x + boss.w / 2, y: boss.y + boss.h / 2, vx: Math.cos(na) * 7, vy: Math.sin(na) * 7, damage: 32, life: 80, color: '#DD66FF', size: 5, fromBoss: true });
                }
                if (enemies.length < 12 && Math.random() < 0.2) spawnEnemy('predictor', boss.x, boss.y - 20);
            } else {
                for (let i = 0; i < 8; i++) {
                    const va = (i / 8) * Math.PI * 2;
                    projectiles.push({ x: boss.x + boss.w / 2, y: boss.y + boss.h / 2, vx: Math.cos(va) * 8, vy: Math.sin(va) * 8, damage: 38, life: 60, color: '#AA22DD', size: 7, fromBoss: true });
                }
                if (typeof triggerShake === 'function') triggerShake(2);
            }
            boss.attackCd = 50 - boss.phase * 10;
        }
    }
    // ===== STARDUST PILLAR BOSS AI =====
    else if (boss.type === 'stardust_pillar') {
        boss.vx = 0; boss.vy = 0;
        if (boss.attackCd <= 0) {
            if (boss.phase === 1) {
                for (let i = 0; i < 5; i++) {
                    projectiles.push({ x: boss.x + boss.w / 2 + (Math.random() - 0.5) * 30, y: boss.y - 20, vx: (Math.random() - 0.5) * 3, vy: 5 + Math.random() * 3, damage: 20, life: 100, color: '#4488FF', size: 4, fromBoss: true });
                }
                if (enemies.length < 10 && Math.random() < 0.3) spawnEnemy('star_cell', boss.x + (Math.random() - 0.5) * 80, boss.y - 30);
            } else if (boss.phase === 2) {
                for (let i = 0; i < 8; i++) {
                    projectiles.push({ x: boss.x + boss.w / 2 + (Math.random() - 0.5) * 50, y: boss.y - 30, vx: (Math.random() - 0.5) * 4, vy: 6 + Math.random() * 3, damage: 28, life: 80, color: '#6699FF', size: 5, fromBoss: true });
                }
                // Gravity well
                if (dist < 180) { player.vx += (boss.x - player.x) * 0.003; player.vy += (boss.y - player.y) * 0.003; }
            } else {
                for (let i = 0; i < 12; i++) {
                    const sa = (i / 12) * Math.PI * 2;
                    projectiles.push({ x: boss.x + boss.w / 2, y: boss.y + boss.h / 2, vx: Math.cos(sa) * 7, vy: Math.sin(sa) * 7, damage: 35, life: 55, color: '#88BBFF', size: 6, fromBoss: true });
                }
                if (typeof triggerShake === 'function') triggerShake(3);
            }
            boss.attackCd = 50 - boss.phase * 10;
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
                if (typeof spawnDamageNumber === 'function') spawnDamageNumber(player.x + player.w / 2, player.y - 10, Math.max(1, p.damage - player.defense), '#FF4444');
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
                    if (typeof spawnDamageNumber === 'function') spawnDamageNumber(e.x + e.w / 2, e.y - 5, p.damage, '#FFDD44');
                    if (e.hp <= 0) {
                        e.dead = true; player.xp += e.xp || 5;
                        if (typeof spawnDamageNumber === 'function') spawnDamageNumber(e.x + e.w / 2, e.y - 20, `+${e.xp || 5} XP`, '#44FF88', true);
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
    } else if (boss.type === 'hive_mind') {
        // Float brain with psychic aura
        ctx.beginPath(); ctx.ellipse(sx + boss.w / 2, sy + boss.h / 2, boss.w / 2, boss.h / 2.5, 0, 0, Math.PI * 2); ctx.fill();
        // Brain folds
        ctx.strokeStyle = boss.hitTimer > 0 ? '#DDD' : '#AA3399'; ctx.lineWidth = 2;
        for (let i = 0; i < 5; i++) {
            const a = boss.animTimer * 0.02 + i * 1.2;
            ctx.beginPath(); ctx.arc(sx + boss.w / 2 + Math.cos(a) * 8, sy + boss.h / 2 + Math.sin(a) * 5, 10, 0, Math.PI); ctx.stroke();
        }
        // Glowing eye
        ctx.fillStyle = '#FFAAFF'; ctx.beginPath(); ctx.arc(sx + boss.w / 2, sy + boss.h / 2, 8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#440044'; ctx.beginPath(); ctx.arc(sx + boss.w / 2, sy + boss.h / 2, 4, 0, Math.PI * 2); ctx.fill();
    } else if (boss.type === 'abyssal_serpent') {
        // Serpent body segments
        for (let seg = 0; seg < 6; seg++) {
            const sx2 = sx + boss.w / 2 - seg * 12 + Math.sin(boss.animTimer * 0.06 + seg) * 8;
            const sy2 = sy + boss.h / 2 + Math.cos(boss.animTimer * 0.04 + seg * 0.8) * 4;
            const segR = seg === 0 ? 14 : 10 - seg;
            ctx.fillStyle = boss.hitTimer > 0 ? '#FFF' : (seg === 0 ? '#3366AA' : '#224466');
            ctx.beginPath(); ctx.arc(sx2, sy2, segR, 0, Math.PI * 2); ctx.fill();
        }
        // Eyes on head
        ctx.fillStyle = '#44FF44'; ctx.beginPath(); ctx.arc(sx + boss.w / 2 + 5, sy + boss.h / 2 - 4, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(sx + boss.w / 2 + 5, sy + boss.h / 2 + 4, 3, 0, Math.PI * 2); ctx.fill();
    } else if (boss.type === 'soul_devourer') {
        // Ghostly apparition with fading body
        ctx.globalAlpha = 0.5 + Math.sin(boss.animTimer * 0.05) * 0.3;
        ctx.beginPath(); ctx.ellipse(sx + boss.w / 2, sy + boss.h / 2, boss.w / 2, boss.h / 2, 0, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
        // Skull face
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(sx + boss.w * 0.3, sy + boss.h * 0.3, 6, 8);
        ctx.fillRect(sx + boss.w * 0.55, sy + boss.h * 0.3, 6, 8);
        ctx.fillStyle = '#000';
        ctx.fillRect(sx + boss.w * 0.32, sy + boss.h * 0.35, 4, 4);
        ctx.fillRect(sx + boss.w * 0.57, sy + boss.h * 0.35, 4, 4);
    } else if (boss.type === 'ravager') {
        // Beastly body with hunched posture
        ctx.fillRect(sx, sy + 8, boss.w, boss.h - 8);
        ctx.fillStyle = boss.hitTimer > 0 ? '#EEE' : '#AA3311';
        ctx.fillRect(sx + 5, sy, boss.w - 10, 14); // head
        // Teeth
        ctx.fillStyle = '#FFFFFF';
        for (let t = 0; t < 4; t++) ctx.fillRect(sx + 8 + t * 9, sy + 12, 3, 4);
        // Glowing red eyes
        ctx.fillStyle = '#FF2200';
        ctx.fillRect(sx + 10, sy + 4, 4, 4); ctx.fillRect(sx + boss.w - 16, sy + 4, 4, 4);
    } else if (boss.type === 'plague_doctor') {
        // Tall figure with beak mask
        ctx.fillRect(sx + 8, sy, boss.w - 16, boss.h);
        // Beak
        ctx.fillStyle = boss.hitTimer > 0 ? '#EEE' : '#334411';
        ctx.beginPath(); ctx.moveTo(sx + boss.w / 2, sy + 8); ctx.lineTo(sx + boss.w / 2 + 18, sy + 16); ctx.lineTo(sx + boss.w / 2, sy + 20); ctx.closePath(); ctx.fill();
        // Glowing green eyes
        ctx.fillStyle = '#44FF44';
        ctx.fillRect(sx + boss.w / 2 - 6, sy + 6, 4, 4); ctx.fillRect(sx + boss.w / 2 + 2, sy + 6, 4, 4);
        // Hat
        ctx.fillStyle = '#222';
        ctx.fillRect(sx + 4, sy - 6, boss.w - 8, 8);
    } else if (boss.type === 'storm_colossus') {
        // Massive humanoid with lightning accents
        ctx.fillRect(sx, sy, boss.w, boss.h);
        // Lightning cracks on body
        ctx.strokeStyle = '#44CCFF'; ctx.lineWidth = 2;
        for (let i = 0; i < 6; i++) {
            const ly = sy + 10 + i * (boss.h / 7);
            ctx.beginPath(); ctx.moveTo(sx + 5, ly);
            ctx.lineTo(sx + boss.w / 2 + Math.sin(boss.animTimer * 0.1 + i) * 10, ly + 5);
            ctx.lineTo(sx + boss.w - 5, ly + 2); ctx.stroke();
        }
        // Eyes
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(sx + boss.w * 0.25, sy + 12, 8, 8); ctx.fillRect(sx + boss.w * 0.6, sy + 12, 8, 8);
        ctx.fillStyle = '#44CCFF';
        ctx.fillRect(sx + boss.w * 0.27, sy + 14, 4, 4); ctx.fillRect(sx + boss.w * 0.62, sy + 14, 4, 4);
    } else if (boss.type === 'blood_titan') {
        // Massive blood-dripping body
        ctx.fillRect(sx, sy, boss.w, boss.h);
        // Blood drip effects
        ctx.fillStyle = '#660011';
        for (let i = 0; i < 8; i++) {
            const dripY = (boss.animTimer + i * 37) % 20;
            ctx.fillRect(sx + 5 + i * (boss.w / 9), sy + boss.h + dripY - 8, 3, dripY);
        }
        // Glowing red eyes
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(sx + boss.w * 0.2, sy + 10, 10, 6); ctx.fillRect(sx + boss.w * 0.6, sy + 10, 10, 6);
    } else if (boss.type === 'architect') {
        // Geometric body with gear accents
        ctx.fillRect(sx + 4, sy, boss.w - 8, boss.h);
        // Gear symbol on chest
        ctx.strokeStyle = '#DDCC66'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(sx + boss.w / 2, sy + boss.h * 0.4, 10, 0, Math.PI * 2); ctx.stroke();
        for (let i = 0; i < 6; i++) {
            const ga = (i / 6) * Math.PI * 2 + boss.animTimer * 0.03;
            ctx.beginPath(); ctx.moveTo(sx + boss.w / 2 + Math.cos(ga) * 8, sy + boss.h * 0.4 + Math.sin(ga) * 8);
            ctx.lineTo(sx + boss.w / 2 + Math.cos(ga) * 14, sy + boss.h * 0.4 + Math.sin(ga) * 14); ctx.stroke();
        }
        // Eyes
        ctx.fillStyle = '#DDCC44';
        ctx.fillRect(sx + boss.w * 0.3, sy + 8, 5, 5); ctx.fillRect(sx + boss.w * 0.6, sy + 8, 5, 5);
    } else if (boss.type === 'eater_of_worlds') {
        // Worm boss — segmented body
        for (let seg = 0; seg < 8; seg++) {
            const sx2 = sx + boss.w / 2 - seg * 10 + Math.sin(boss.animTimer * 0.06 + seg * 0.8) * 6;
            const sy2 = sy + boss.h / 2 + Math.cos(boss.animTimer * 0.04 + seg * 0.6) * 4;
            const segR = seg === 0 ? 16 : 12 - seg;
            ctx.fillStyle = boss.hitTimer > 0 ? '#FFF' : (seg === 0 ? '#5533AA' : '#3D1F4A');
            ctx.beginPath(); ctx.arc(sx2, sy2, segR, 0, Math.PI * 2); ctx.fill();
        }
        // Mandibles on head
        ctx.fillStyle = '#DDAAFF';
        ctx.fillRect(sx + boss.w / 2 - 8, sy + boss.h / 2 - 18, 4, 10);
        ctx.fillRect(sx + boss.w / 2 + 4, sy + boss.h / 2 - 18, 4, 10);
        // Eyes
        ctx.fillStyle = '#FFAAFF';
        ctx.beginPath(); ctx.arc(sx + boss.w / 2 - 4, sy + boss.h / 2 - 4, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(sx + boss.w / 2 + 4, sy + boss.h / 2 - 4, 3, 0, Math.PI * 2); ctx.fill();
    } else if (boss.type === 'brain_of_cthulhu') {
        // Fleshy brain with pulsing effect
        const pulse = 1 + Math.sin(boss.animTimer * 0.08) * 0.1;
        ctx.beginPath(); ctx.ellipse(sx + boss.w / 2, sy + boss.h / 2, (boss.w / 2) * pulse, (boss.h / 2.5) * pulse, 0, 0, Math.PI * 2); ctx.fill();
        // Brain folds
        ctx.strokeStyle = boss.hitTimer > 0 ? '#DDD' : '#FF6688'; ctx.lineWidth = 2;
        for (let i = 0; i < 6; i++) {
            const a = boss.animTimer * 0.03 + i * 1.0;
            ctx.beginPath(); ctx.arc(sx + boss.w / 2 + Math.cos(a) * 10, sy + boss.h / 2 + Math.sin(a) * 6, 12, 0, Math.PI); ctx.stroke();
        }
        // Central eye
        ctx.fillStyle = '#FFCCCC'; ctx.beginPath(); ctx.arc(sx + boss.w / 2, sy + boss.h / 2, 10, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#CC0022'; ctx.beginPath(); ctx.arc(sx + boss.w / 2, sy + boss.h / 2, 5, 0, Math.PI * 2); ctx.fill();
        // Phase flicker (phase 2 = semi-visible)
        if (boss.phase === 2) ctx.globalAlpha = 0.4 + Math.sin(boss.animTimer * 0.15) * 0.3;
    } else if (boss.type === 'void_maw') {
        // Massive void portal mouth
        // Outer void ring
        ctx.strokeStyle = '#BB66FF'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(sx + boss.w / 2, sy + boss.h / 2, boss.w / 2, 0, Math.PI * 2); ctx.stroke();
        // Swirling void interior
        for (let ring = 0; ring < 4; ring++) {
            const r = (boss.w / 2) - ring * 8;
            const alpha = 0.8 - ring * 0.15;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = ['#7722DD', '#5500AA', '#330066', '#110033'][ring];
            ctx.beginPath();
            ctx.arc(sx + boss.w / 2 + Math.sin(boss.animTimer * 0.03 + ring) * 3, sy + boss.h / 2 + Math.cos(boss.animTimer * 0.04 + ring) * 3, r, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        // Central "eye" - gravity well visual
        ctx.fillStyle = '#DDAAFF';
        ctx.beginPath(); ctx.arc(sx + boss.w / 2, sy + boss.h / 2, 8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath(); ctx.arc(sx + boss.w / 2, sy + boss.h / 2, 4, 0, Math.PI * 2); ctx.fill();
        // Gravity tendrils
        ctx.strokeStyle = '#9944FF'; ctx.lineWidth = 1;
        for (let t = 0; t < 6; t++) {
            const ta = (t / 6) * Math.PI * 2 + boss.animTimer * 0.04;
            ctx.beginPath();
            ctx.moveTo(sx + boss.w / 2, sy + boss.h / 2);
            ctx.quadraticCurveTo(
                sx + boss.w / 2 + Math.cos(ta + 0.5) * 30,
                sy + boss.h / 2 + Math.sin(ta + 0.5) * 30,
                sx + boss.w / 2 + Math.cos(ta) * 50,
                sy + boss.h / 2 + Math.sin(ta) * 50
            );
            ctx.stroke();
        }
    }
    // ===== STAR DESTROYER RENDERING =====
    else if (boss.type === 'star_destroyer') {
        // Metallic ship body
        ctx.fillStyle = '#334455'; ctx.fillRect(sx + 10, sy + 8, boss.w - 20, boss.h - 16);
        // Hull plating
        ctx.fillStyle = '#445566'; ctx.fillRect(sx + 5, sy + 12, boss.w - 10, boss.h - 24);
        // Bridge/cockpit
        ctx.fillStyle = '#88BBDD'; ctx.fillRect(sx + boss.w / 2 - 8, sy + 4, 16, 10);
        // Engine glow
        ctx.fillStyle = '#3399FF';
        for (let e = 0; e < 3; e++) {
            const ex = sx + 15 + e * (boss.w - 30) / 2;
            ctx.beginPath(); ctx.arc(ex, sy + boss.h - 4, 4 + Math.sin(boss.animTimer * 0.2 + e) * 2, 0, Math.PI * 2); ctx.fill();
        }
        // Turrets
        ctx.fillStyle = '#AABBCC';
        ctx.fillRect(sx + 20, sy + 6, 6, 6);
        ctx.fillRect(sx + boss.w - 26, sy + 6, 6, 6);
        // Phase-based effects
        if (boss.phase >= 2) {
            ctx.strokeStyle = '#FF4400'; ctx.lineWidth = 2;
            ctx.strokeRect(sx + 5, sy + 5, boss.w - 10, boss.h - 10);
        }
        if (boss.phase >= 3) {
            // Death laser charging
            ctx.fillStyle = `rgba(255, 221, 68, ${0.5 + Math.sin(boss.animTimer * 0.15) * 0.3})`;
            ctx.beginPath(); ctx.arc(sx + boss.w / 2, sy + boss.h, 8, 0, Math.PI * 2); ctx.fill();
        }
    }
    // ===== MOON LORD RENDERING =====
    else if (boss.type === 'moon_lord') {
        // Celestial body — ethereal green/blue
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = '#112233'; ctx.beginPath(); ctx.arc(sx + boss.w / 2, sy + boss.h / 2, boss.w / 2, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1.0;
        // Face/core
        ctx.fillStyle = '#224444'; ctx.beginPath(); ctx.arc(sx + boss.w / 2, sy + boss.h * 0.4, boss.w * 0.35, 0, Math.PI * 2); ctx.fill();
        // Three eyes — left, right, forehead
        const eyeGlow = `rgba(68, 255, 170, ${0.6 + Math.sin(boss.animTimer * 0.1) * 0.3})`;
        ctx.fillStyle = eyeGlow;
        ctx.beginPath(); ctx.arc(sx + boss.w * 0.3, sy + boss.h * 0.35, 8, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(sx + boss.w * 0.7, sy + boss.h * 0.35, 8, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(sx + boss.w * 0.5, sy + boss.h * 0.2, 10, 0, Math.PI * 2); ctx.fill();
        // Pupils
        ctx.fillStyle = '#000000';
        const pupDir = Math.atan2(player.y - boss.y, player.x - boss.x);
        ctx.beginPath(); ctx.arc(sx + boss.w * 0.3 + Math.cos(pupDir) * 3, sy + boss.h * 0.35 + Math.sin(pupDir) * 3, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(sx + boss.w * 0.7 + Math.cos(pupDir) * 3, sy + boss.h * 0.35 + Math.sin(pupDir) * 3, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(sx + boss.w * 0.5 + Math.cos(pupDir) * 4, sy + boss.h * 0.2 + Math.sin(pupDir) * 4, 4, 0, Math.PI * 2); ctx.fill();
        // Phantom hands/tendrils
        ctx.strokeStyle = '#44FFAA'; ctx.lineWidth = 2;
        for (let h = 0; h < 4; h++) {
            const ha = (h / 4) * Math.PI * 2 + boss.animTimer * 0.025;
            ctx.beginPath();
            ctx.moveTo(sx + boss.w / 2, sy + boss.h * 0.6);
            ctx.quadraticCurveTo(
                sx + boss.w / 2 + Math.cos(ha) * 40,
                sy + boss.h * 0.6 + Math.sin(ha) * 40,
                sx + boss.w / 2 + Math.cos(ha) * 60,
                sy + boss.h * 0.6 + Math.sin(ha) * 60
            );
            ctx.stroke();
            // Hand at end
            ctx.fillStyle = '#33CC88';
            ctx.beginPath(); ctx.arc(sx + boss.w / 2 + Math.cos(ha) * 60, sy + boss.h * 0.6 + Math.sin(ha) * 60, 5, 0, Math.PI * 2); ctx.fill();
        }
        // Phase glow aura
        if (boss.phase >= 2) {
            ctx.globalAlpha = 0.15 + Math.sin(boss.animTimer * 0.08) * 0.1;
            ctx.fillStyle = '#44FFAA';
            ctx.beginPath(); ctx.arc(sx + boss.w / 2, sy + boss.h / 2, boss.w * 0.6, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 1.0;
        }
    }
    // ===== DESTROYER RENDERING =====
    else if (boss.type === 'destroyer') {
        // Metallic worm body — multiple segments
        for (let s = 0; s < 8; s++) {
            const sa = boss.animTimer * 0.025 + s * 0.3;
            const segX = sx + boss.w / 2 + Math.cos(sa) * s * 8 - 8;
            const segY = sy + boss.h / 2 + Math.sin(sa) * s * 6 - 8;
            ctx.fillStyle = s === 0 ? '#5599DD' : '#3377BB';
            ctx.fillRect(segX, segY, 16, 16);
            ctx.fillStyle = '#88BBDD';
            ctx.fillRect(segX + 3, segY + 3, 4, 4); // Probe light
        }
        // Head
        ctx.fillStyle = '#4488CC';
        ctx.beginPath(); ctx.arc(sx + boss.w / 2, sy + boss.h / 2, 12, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FF3333';
        ctx.beginPath(); ctx.arc(sx + boss.w / 2, sy + boss.h / 2, 4, 0, Math.PI * 2); ctx.fill();
        if (boss.phase >= 2) {
            ctx.strokeStyle = '#3399FF'; ctx.lineWidth = 2;
            ctx.strokeRect(sx - 2, sy - 2, boss.w + 4, boss.h + 4);
        }
    }
    // ===== THE TWINS RENDERING =====
    else if (boss.type === 'the_twins') {
        // Two mechanical eyes orbiting
        const t2 = boss.animTimer * 0.02;
        // Retinazer (red eye)
        const r1x = sx + boss.w * 0.3 + Math.cos(t2) * 8;
        const r1y = sy + boss.h * 0.4 + Math.sin(t2) * 5;
        ctx.fillStyle = '#551111'; ctx.beginPath(); ctx.arc(r1x, r1y, 14, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FF3333'; ctx.beginPath(); ctx.arc(r1x, r1y, 8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FF8888'; ctx.beginPath(); ctx.arc(r1x, r1y, 3, 0, Math.PI * 2); ctx.fill();
        // Spazmatism (green eye)
        const r2x = sx + boss.w * 0.7 + Math.cos(t2 + Math.PI) * 8;
        const r2y = sy + boss.h * 0.4 + Math.sin(t2 + Math.PI) * 5;
        ctx.fillStyle = '#115511'; ctx.beginPath(); ctx.arc(r2x, r2y, 14, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#33FF33'; ctx.beginPath(); ctx.arc(r2x, r2y, 8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#88FF88'; ctx.beginPath(); ctx.arc(r2x, r2y, 3, 0, Math.PI * 2); ctx.fill();
        // Metal connectors
        ctx.strokeStyle = '#666688'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(r1x, r1y + 10); ctx.lineTo(sx + boss.w / 2, sy + boss.h * 0.7); ctx.lineTo(r2x, r2y + 10); ctx.stroke();
        if (boss.phase >= 3) {
            ctx.globalAlpha = 0.2 + Math.sin(boss.animTimer * 0.1) * 0.15;
            ctx.fillStyle = '#FF33FF';
            ctx.beginPath(); ctx.arc(sx + boss.w / 2, sy + boss.h / 2, boss.w * 0.5, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 1;
        }
    }
    // ===== SKELETRON PRIME RENDERING =====
    else if (boss.type === 'skeletron_prime') {
        // Mechanical skull
        ctx.fillStyle = '#334433'; ctx.beginPath(); ctx.arc(sx + boss.w / 2, sy + boss.h * 0.4, boss.w * 0.35, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#557755'; ctx.beginPath(); ctx.arc(sx + boss.w / 2, sy + boss.h * 0.4, boss.w * 0.28, 0, Math.PI * 2); ctx.fill();
        // Eyes
        ctx.fillStyle = '#33FF66';
        ctx.beginPath(); ctx.arc(sx + boss.w * 0.35, sy + boss.h * 0.35, 6, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(sx + boss.w * 0.65, sy + boss.h * 0.35, 6, 0, Math.PI * 2); ctx.fill();
        // Jaw
        ctx.fillStyle = '#445544';
        ctx.fillRect(sx + boss.w * 0.3, sy + boss.h * 0.5, boss.w * 0.4, boss.h * 0.15);
        // 4 mechanical arms
        ctx.strokeStyle = '#33FF66'; ctx.lineWidth = 3;
        for (let a = 0; a < 4; a++) {
            const armAng = (a / 4) * Math.PI * 2 + boss.animTimer * 0.03;
            const armLen = 30 + Math.sin(boss.animTimer * 0.05 + a) * 10;
            ctx.beginPath();
            ctx.moveTo(sx + boss.w / 2, sy + boss.h * 0.5);
            ctx.lineTo(sx + boss.w / 2 + Math.cos(armAng) * armLen, sy + boss.h * 0.5 + Math.sin(armAng) * armLen);
            ctx.stroke();
            // Arm tip (different colors for each arm type)
            const armColors = ['#AAAAAA', '#FF4444', '#4444FF', '#33FF66'];
            ctx.fillStyle = armColors[a];
            ctx.beginPath(); ctx.arc(sx + boss.w / 2 + Math.cos(armAng) * armLen, sy + boss.h * 0.5 + Math.sin(armAng) * armLen, 5, 0, Math.PI * 2); ctx.fill();
        }
        if (boss.phase >= 2) {
            ctx.globalAlpha = 0.15; ctx.fillStyle = '#33FF66';
            ctx.beginPath(); ctx.arc(sx + boss.w / 2, sy + boss.h / 2, boss.w * 0.55, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 1;
        }
    }
    // ===== PLANTERA RENDERING =====
    else if (boss.type === 'plantera') {
        // Plant bulb body
        ctx.fillStyle = '#226622';
        ctx.beginPath(); ctx.arc(sx + boss.w / 2, sy + boss.h / 2, boss.w * 0.4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FF44AA';
        ctx.beginPath(); ctx.arc(sx + boss.w / 2, sy + boss.h / 2, boss.w * 0.28, 0, Math.PI * 2); ctx.fill();
        // Petals
        for (let p = 0; p < 6; p++) {
            const pa = (p / 6) * Math.PI * 2 + boss.animTimer * 0.02;
            const petalR = boss.w * 0.35 + Math.sin(boss.animTimer * 0.04 + p) * 5;
            ctx.fillStyle = p % 2 === 0 ? '#FF66AA' : '#FF88CC';
            ctx.beginPath(); ctx.arc(sx + boss.w / 2 + Math.cos(pa) * petalR, sy + boss.h / 2 + Math.sin(pa) * petalR, 8, 0, Math.PI * 2); ctx.fill();
        }
        // Vine hooks
        ctx.strokeStyle = '#448822'; ctx.lineWidth = 3;
        for (let v = 0; v < 4; v++) {
            const va = (v / 4) * Math.PI * 2 + boss.animTimer * 0.015;
            const vLen = 40 + Math.sin(boss.animTimer * 0.03 + v) * 15;
            ctx.beginPath(); ctx.moveTo(sx + boss.w / 2, sy + boss.h / 2);
            ctx.lineTo(sx + boss.w / 2 + Math.cos(va) * vLen, sy + boss.h / 2 + Math.sin(va) * vLen);
            ctx.stroke();
            ctx.fillStyle = '#33AA33';
            ctx.beginPath(); ctx.arc(sx + boss.w / 2 + Math.cos(va) * vLen, sy + boss.h / 2 + Math.sin(va) * vLen, 4, 0, Math.PI * 2); ctx.fill();
        }
        // Phase glow
        if (boss.phase >= 2) {
            ctx.globalAlpha = 0.2; ctx.fillStyle = '#FF44AA';
            ctx.beginPath(); ctx.arc(sx + boss.w / 2, sy + boss.h / 2, boss.w * 0.55, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 1;
        }
    }
    // ===== GOLEM RENDERING =====
    else if (boss.type === 'golem') {
        // Stone body
        ctx.fillStyle = '#886633'; ctx.fillRect(sx + 5, sy + boss.h * 0.35, boss.w - 10, boss.h * 0.55);
        ctx.fillStyle = '#AA8844'; ctx.fillRect(sx + 8, sy + boss.h * 0.38, boss.w - 16, boss.h * 0.5);
        // Head (may detach in phase 3)
        const headY = boss.phase >= 3 ? sy - 10 + Math.sin(boss.animTimer * 0.05) * 8 : sy;
        ctx.fillStyle = '#997744';
        ctx.beginPath(); ctx.arc(sx + boss.w / 2, headY + boss.h * 0.2, boss.w * 0.3, 0, Math.PI * 2); ctx.fill();
        // Eyes (glow red)
        ctx.fillStyle = '#FF4422';
        ctx.beginPath(); ctx.arc(sx + boss.w * 0.35, headY + boss.h * 0.18, 5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(sx + boss.w * 0.65, headY + boss.h * 0.18, 5, 0, Math.PI * 2); ctx.fill();
        // Fists
        const fistOff = Math.sin(boss.animTimer * 0.04) * 10;
        ctx.fillStyle = '#776633';
        ctx.beginPath(); ctx.arc(sx - 5 + fistOff, sy + boss.h * 0.55, 10, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(sx + boss.w + 5 - fistOff, sy + boss.h * 0.55, 10, 0, Math.PI * 2); ctx.fill();
        // Lihzahrd markings
        ctx.strokeStyle = '#664422'; ctx.lineWidth = 1;
        ctx.strokeRect(sx + boss.w * 0.3, sy + boss.h * 0.45, boss.w * 0.4, boss.h * 0.3);
        if (boss.phase >= 2) {
            ctx.globalAlpha = 0.15; ctx.fillStyle = '#FF6644';
            ctx.beginPath(); ctx.arc(sx + boss.w / 2, sy + boss.h / 2, boss.w * 0.5, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 1;
        }
    }
    // ===== DUKE FISHRON RENDERING =====
    else if (boss.type === 'duke_fishron') {
        // Fish body
        const wobble = Math.sin(boss.animTimer * 0.04) * 3;
        ctx.fillStyle = '#2288AA';
        ctx.beginPath();
        ctx.ellipse(sx + boss.w / 2, sy + boss.h / 2 + wobble, boss.w * 0.42, boss.h * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();
        // Belly
        ctx.fillStyle = '#44AACC';
        ctx.beginPath();
        ctx.ellipse(sx + boss.w / 2, sy + boss.h * 0.55 + wobble, boss.w * 0.3, boss.h * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();
        // Eye
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath(); ctx.arc(sx + boss.w * 0.65, sy + boss.h * 0.35 + wobble, 7, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FF3333';
        ctx.beginPath(); ctx.arc(sx + boss.w * 0.65, sy + boss.h * 0.35 + wobble, 4, 0, Math.PI * 2); ctx.fill();
        // Fins
        ctx.fillStyle = '#1166AA';
        ctx.beginPath();
        ctx.moveTo(sx + boss.w * 0.1, sy + boss.h * 0.3 + wobble);
        ctx.lineTo(sx - 8, sy + wobble);
        ctx.lineTo(sx + boss.w * 0.2, sy + boss.h * 0.4 + wobble);
        ctx.fill();
        // Tail
        ctx.beginPath();
        ctx.moveTo(sx + boss.w * 0.1, sy + boss.h * 0.45 + wobble);
        ctx.lineTo(sx - 12, sy + boss.h * 0.5 + wobble);
        ctx.lineTo(sx + boss.w * 0.1, sy + boss.h * 0.6 + wobble);
        ctx.fill();
        // Teeth
        ctx.fillStyle = '#FFFFFF';
        for (let t = 0; t < 4; t++) {
            ctx.fillRect(sx + boss.w * 0.7 + t * 3, sy + boss.h * 0.45 + wobble, 2, 4);
        }
        // Phase 3 cthulhu glow
        if (boss.phase >= 3) {
            ctx.globalAlpha = 0.25 + Math.sin(boss.animTimer * 0.08) * 0.15;
            ctx.fillStyle = '#44AACC';
            ctx.beginPath(); ctx.arc(sx + boss.w / 2, sy + boss.h / 2, boss.w * 0.55, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 1;
        }
    }
    // ===== SOLAR PILLAR RENDERING =====
    else if (boss.type === 'solar_pillar') {
        // Tall glowing pillar
        const gradient = ctx.createLinearGradient(sx, sy, sx, sy + boss.h);
        gradient.addColorStop(0, '#FF8844'); gradient.addColorStop(1, '#FF4400');
        ctx.fillStyle = gradient;
        ctx.fillRect(sx + 4, sy, boss.w - 8, boss.h);
        // Solar fragments orbiting
        for (let f = 0; f < 6; f++) {
            const fa = (f / 6) * Math.PI * 2 + boss.animTimer * 0.03;
            const fr = 20 + Math.sin(boss.animTimer * 0.02 + f) * 5;
            ctx.fillStyle = '#FFAA44';
            ctx.beginPath(); ctx.arc(sx + boss.w / 2 + Math.cos(fa) * fr, sy + boss.h * 0.3 + Math.sin(fa) * fr, 4, 0, Math.PI * 2); ctx.fill();
        }
        // Shield glow (phase 1)
        if (boss.phase === 1) {
            ctx.globalAlpha = 0.2 + Math.sin(boss.animTimer * 0.05) * 0.1;
            ctx.fillStyle = '#FF6622';
            ctx.beginPath(); ctx.arc(sx + boss.w / 2, sy + boss.h * 0.4, boss.w * 0.8, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 1;
        }
    }
    // ===== VORTEX PILLAR RENDERING =====
    else if (boss.type === 'vortex_pillar') {
        const vGrad = ctx.createLinearGradient(sx, sy, sx, sy + boss.h);
        vGrad.addColorStop(0, '#44DDBB'); vGrad.addColorStop(1, '#116655');
        ctx.fillStyle = vGrad;
        ctx.fillRect(sx + 4, sy, boss.w - 8, boss.h);
        for (let f = 0; f < 6; f++) {
            const fa = (f / 6) * Math.PI * 2 + boss.animTimer * 0.04;
            const fr = 22 + Math.sin(boss.animTimer * 0.025 + f) * 6;
            ctx.fillStyle = '#22CCAA';
            ctx.beginPath(); ctx.arc(sx + boss.w / 2 + Math.cos(fa) * fr, sy + boss.h * 0.3 + Math.sin(fa) * fr, 4, 0, Math.PI * 2); ctx.fill();
        }
        if (boss.phase === 1) {
            ctx.globalAlpha = 0.2 + Math.sin(boss.animTimer * 0.05) * 0.1;
            ctx.fillStyle = '#22CCAA';
            ctx.beginPath(); ctx.arc(sx + boss.w / 2, sy + boss.h * 0.4, boss.w * 0.8, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 1;
        }
    }
    // ===== NEBULA PILLAR RENDERING =====
    else if (boss.type === 'nebula_pillar') {
        const nGrad = ctx.createLinearGradient(sx, sy, sx, sy + boss.h);
        nGrad.addColorStop(0, '#DD66FF'); nGrad.addColorStop(1, '#6622AA');
        ctx.fillStyle = nGrad;
        ctx.fillRect(sx + 4, sy, boss.w - 8, boss.h);
        for (let f = 0; f < 6; f++) {
            const fa = (f / 6) * Math.PI * 2 + boss.animTimer * 0.035;
            const fr = 20 + Math.sin(boss.animTimer * 0.02 + f) * 5;
            ctx.fillStyle = '#CC44FF';
            ctx.beginPath(); ctx.arc(sx + boss.w / 2 + Math.cos(fa) * fr, sy + boss.h * 0.3 + Math.sin(fa) * fr, 4, 0, Math.PI * 2); ctx.fill();
        }
        if (boss.phase === 1) {
            ctx.globalAlpha = 0.2 + Math.sin(boss.animTimer * 0.05) * 0.1;
            ctx.fillStyle = '#CC44FF';
            ctx.beginPath(); ctx.arc(sx + boss.w / 2, sy + boss.h * 0.4, boss.w * 0.8, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 1;
        }
    }
    // ===== STARDUST PILLAR RENDERING =====
    else if (boss.type === 'stardust_pillar') {
        const sGrad = ctx.createLinearGradient(sx, sy, sx, sy + boss.h);
        sGrad.addColorStop(0, '#88BBFF'); sGrad.addColorStop(1, '#224488');
        ctx.fillStyle = sGrad;
        ctx.fillRect(sx + 4, sy, boss.w - 8, boss.h);
        for (let f = 0; f < 6; f++) {
            const fa = (f / 6) * Math.PI * 2 + boss.animTimer * 0.03;
            const fr = 20 + Math.sin(boss.animTimer * 0.02 + f) * 5;
            ctx.fillStyle = '#4488FF';
            ctx.beginPath(); ctx.arc(sx + boss.w / 2 + Math.cos(fa) * fr, sy + boss.h * 0.3 + Math.sin(fa) * fr, 4, 0, Math.PI * 2); ctx.fill();
        }
        if (boss.phase === 1) {
            ctx.globalAlpha = 0.2 + Math.sin(boss.animTimer * 0.05) * 0.1;
            ctx.fillStyle = '#4488FF';
            ctx.beginPath(); ctx.arc(sx + boss.w / 2, sy + boss.h * 0.4, boss.w * 0.8, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 1;
        }
    } else {
        // Generic boss body
        ctx.fillRect(sx, sy, boss.w, boss.h);
        ctx.fillStyle = '#CC1122';
        ctx.fillRect(sx + boss.w * 0.3, sy + 8, 6, 6);
        ctx.fillRect(sx + boss.w * 0.6, sy + 8, 6, 6);
    }
    // Boss HP bar (all bosses)
    ctx.fillStyle = '#222';
    ctx.fillRect(sx, sy - 12, boss.w, 6);
    ctx.fillStyle = boss.hp / boss.maxHp > 0.3 ? '#CC2244' : '#FF4400';
    ctx.fillRect(sx, sy - 12, boss.w * (boss.hp / boss.maxHp), 6);
    // Boss name
    ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 10px Inter'; ctx.textAlign = 'center';
    ctx.fillText(boss.name || boss.type, sx + boss.w / 2, sy - 16);
    ctx.restore();
}

function drawProjectiles(ctx, camX, camY) {
    for (const p of projectiles) {
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color; ctx.shadowBlur = 6;
        if (p.isBullet) {
            // Gun pellet — elongated with trail
            const ang = Math.atan2(p.vy, p.vx);
            ctx.save();
            ctx.translate(p.x - camX, p.y - camY);
            ctx.rotate(ang);
            ctx.fillRect(-6, -1.5, 12, 3);
            // Trail
            ctx.globalAlpha = 0.3;
            ctx.fillRect(-14, -1, 10, 2);
            ctx.globalAlpha = 1;
            ctx.restore();
        } else {
            ctx.beginPath();
            ctx.arc(p.x - camX, p.y - camY, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    ctx.shadowBlur = 0;
    // Draw smoke puffs
    if (typeof _gunSmokePuffs !== 'undefined') {
        for (let i = _gunSmokePuffs.length - 1; i >= 0; i--) {
            const s = _gunSmokePuffs[i];
            s.x += s.vx; s.y += s.vy; s.vy -= 0.03; s.life--; s.size += 0.4;
            if (s.life <= 0) { _gunSmokePuffs.splice(i, 1); continue; }
            const alpha = s.life / s.maxLife;
            ctx.globalAlpha = alpha * 0.6;
            ctx.fillStyle = s.color;
            ctx.beginPath();
            ctx.arc(s.x - camX, s.y - camY, s.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }
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

// ===== PHASE 5: GUN SMOKE PUFF SYSTEM =====
const _gunSmokePuffs = [];

function spawnGunSmoke(x, y, angle) {
    // Cartoon-style expanding smoke puffs at muzzle
    const puffCount = 6 + Math.floor(Math.random() * 4);
    for (let i = 0; i < puffCount; i++) {
        const spread = (Math.random() - 0.5) * 1.2;
        const spd = 0.5 + Math.random() * 1.5;
        _gunSmokePuffs.push({
            x: x + Math.cos(angle) * 8,
            y: y + Math.sin(angle) * 8,
            vx: Math.cos(angle + spread) * spd + (Math.random() - 0.5) * 0.5,
            vy: Math.sin(angle + spread) * spd - 0.3 - Math.random() * 0.5,
            size: 3 + Math.random() * 4,
            life: 18 + Math.floor(Math.random() * 12),
            maxLife: 30,
            color: i % 3 === 0 ? '#BBBBBB' : i % 3 === 1 ? '#DDDDCC' : '#999988',
        });
    }
}

function shootGun() {
    const held = getHeldItem();
    if (!held) return;
    const it = ITEMS[held.id];
    if (!it || it.type !== 'gun') return;
    // Need bullets
    const ammoSlot = player.inventory.find(s => s && ITEMS[s.id] && ITEMS[s.id].type === 'ammo' &&
        (s.id === I_MUSKET_BALL || s.id === I_SILVER_BULLET || s.id === I_EXPLOSIVE_ROUND || s.id === I_CURSED_BULLET));
    if (!ammoSlot) return;
    const ammoItem = ITEMS[ammoSlot.id];
    const mx = _mouseWorldX, my = _mouseWorldY;
    const px = player.x + player.w / 2, py = player.y + player.h / 2;
    const ang = Math.atan2(my - py, mx - px);

    // Blunderbuss fires multiple pellets with spread
    const pellets = it.spread ? it.spread : 1;
    for (let p = 0; p < pellets; p++) {
        const spreadAng = pellets > 1 ? ang + (Math.random() - 0.5) * 0.5 : ang;
        const speed = pellets > 1 ? 7 + Math.random() * 3 : 10;
        projectiles.push({
            x: px, y: py,
            vx: Math.cos(spreadAng) * speed,
            vy: Math.sin(spreadAng) * speed,
            damage: it.damage + (ammoItem ? ammoItem.damage : 0),
            life: Math.floor((it.range || 200) / 10) + 20,
            color: ammoSlot.id === I_EXPLOSIVE_ROUND ? '#FF6633' :
                ammoSlot.id === I_CURSED_BULLET ? '#7700AA' :
                    ammoSlot.id === I_SILVER_BULLET ? '#CCCCDD' : '#DDCC88',
            size: 3, fromPlayer: true, isBullet: true
        });
    }

    // Spawn cartoon smoke puff at gun barrel
    spawnGunSmoke(px, py, ang);

    // Screen shake for big guns
    if (it.knockback >= 6 && typeof triggerShake === 'function') triggerShake(4);

    // SFX
    if (typeof playSFX === 'function') playSFX('hit');

    // Consume ammo (30% save chance with Ammo Pouch)
    const hasAmmoPouch = player.accessories && Object.values(player.accessories).some(a => a && ITEMS[a.id] && ITEMS[a.id].effect === 'ammo_save');
    if (!hasAmmoPouch || Math.random() > 0.3) {
        ammoSlot.count--;
        if (ammoSlot.count <= 0) {
            const idx = player.inventory.indexOf(ammoSlot);
            if (idx >= 0) player.inventory[idx] = null;
        }
    }
    // Fire rate (Gunslinger Glove halves cooldown)
    const hasGlove = player.accessories && Object.values(player.accessories).some(a => a && ITEMS[a.id] && ITEMS[a.id].effect === 'fast_guns');
    player.attackCd = Math.floor((it.speed || 18) * (hasGlove ? 0.5 : 1));
    player.swinging = true; player.swingAngle = 0;
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

// ===== PHASE 7: NPC RENDERING & AI =====
function updateNPCs() {
    if (typeof npcsP7 === 'undefined') return;
    for (const npc of npcsP7) {
        npc.animTimer++;
        // Idle movement — pace back and forth
        if (npc.animTimer % 120 === 0) npc.dir *= -1;
        npc.vx = npc.dir * 0.3;
        npc.vy += 0.4; // gravity
        npc.x += npc.vx;
        npc.y += npc.vy;
        // Simple ground collision
        if (typeof getBlock === 'function') {
            const tx = Math.floor(npc.x / 8);
            const ty = Math.floor((npc.y + npc.h) / 8);
            if (tx >= 0 && ty >= 0 && getBlock(tx, ty) !== 0) {
                npc.y = ty * 8 - npc.h;
                npc.vy = 0;
            }
        }
    }
}

function renderNPCs(ctx, camX, camY) {
    if (typeof npcsP7 === 'undefined') return;
    for (const npc of npcsP7) {
        const sx = npc.x - camX;
        const sy = npc.y - camY;
        if (sx < -30 || sx > 800 || sy < -30 || sy > 500) continue;
        // Body
        ctx.fillStyle = npc.color;
        ctx.fillRect(sx + 2, sy + 6, npc.w - 4, npc.h - 12);
        // Head
        ctx.fillStyle = '#FFD4A6';
        ctx.fillRect(sx + 3, sy, npc.w - 6, 8);
        // Eyes
        ctx.fillStyle = '#000';
        ctx.fillRect(sx + 4, sy + 2, 2, 2);
        ctx.fillRect(sx + npc.w - 6, sy + 2, 2, 2);
        // Legs (animated)
        const legOffset = Math.sin(npc.animTimer * 0.1) * 2;
        ctx.fillStyle = npc.color;
        ctx.fillRect(sx + 3, sy + npc.h - 6, 3, 6 + legOffset);
        ctx.fillRect(sx + npc.w - 6, sy + npc.h - 6, 3, 6 - legOffset);
        // Name label
        ctx.fillStyle = '#FFDD44';
        ctx.font = '7px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(npc.name, sx + npc.w / 2, sy - 3);
        ctx.textAlign = 'left';
    }
}

// ===== PHASE 8: MOUNT RENDERING =====
const MOUNT_COLORS = {
    slime: '#44BB44', bunny: '#FFAA44', bee: '#FFCC22', unicorn: '#FF88FF',
    basilisk: '#886644', ufo: '#44CCFF', drill: '#AAAAAA', cosmic_car: '#336699'
};
function renderMount(ctx, camX, camY) {
    if (typeof currentMount === 'undefined' || !currentMount || typeof player === 'undefined') return;
    const sx = player.x - camX;
    const sy = player.y - camY;
    const color = MOUNT_COLORS[currentMount.type] || '#888888';
    ctx.fillStyle = color;
    // Mount body below player
    ctx.fillRect(sx - 4, sy + player.h - 4, player.w + 8, 10);
    // Mount-specific details
    if (currentMount.type === 'slime') {
        ctx.globalAlpha = 0.6;
        ctx.beginPath(); ctx.arc(sx + player.w / 2, sy + player.h + 4, 10, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
    } else if (currentMount.type === 'unicorn') {
        // Horn
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.moveTo(sx + player.w + 6, sy + player.h - 2);
        ctx.lineTo(sx + player.w + 14, sy + player.h - 10);
        ctx.lineTo(sx + player.w + 8, sy + player.h);
        ctx.fill();
    } else if (currentMount.type === 'ufo' || currentMount.type === 'cosmic_car') {
        // Glow underneath
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#44CCFF';
        ctx.beginPath(); ctx.arc(sx + player.w / 2, sy + player.h + 6, 14, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
    }
    // Mount animation
    const bounce = Math.sin(currentMount.animTimer * 0.08) * 2;
    ctx.fillStyle = color;
    ctx.fillRect(sx - 2, sy + player.h - 2 + bounce, 4, 4);
    ctx.fillRect(sx + player.w - 2, sy + player.h - 2 + bounce, 4, 4);
}

// ===== PHASE 8: PET RENDERING =====
const PET_COLORS = {
    baby_slime: '#44BB44', shadow_orb: '#6644AA', fairy: '#FF88FF',
    dragon: '#FF4422', wisp: '#AADDFF', mini_ufo: '#44AACC',
    suspicious_eye: '#FF2244', mini_minotaur: '#886644'
};
function renderPet(ctx, camX, camY) {
    if (typeof activePetP8 === 'undefined' || !activePetP8) return;
    const pet = activePetP8;
    const sx = pet.x - camX;
    const sy = pet.y - camY;
    if (sx < -20 || sx > 820 || sy < -20 || sy > 520) return;
    const color = PET_COLORS[pet.type] || '#FFFFFF';
    // Glow effect for light pets
    if (pet.light) {
        ctx.globalAlpha = 0.15 + Math.sin(pet.animTimer * 0.05) * 0.08;
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(sx + 5, sy + 5, 18, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
    }
    // Pet body
    ctx.fillStyle = color;
    if (pet.type === 'shadow_orb' || pet.type === 'wisp') {
        ctx.beginPath(); ctx.arc(sx + 5, sy + 5, 5, 0, Math.PI * 2); ctx.fill();
    } else {
        ctx.fillRect(sx, sy, pet.w, pet.h);
    }
    // Eyes
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(sx + 2, sy + 2, 2, 2);
    ctx.fillRect(sx + 6, sy + 2, 2, 2);
}

// ===== PHASE 8: WING RENDERING =====
function renderWings(ctx, camX, camY) {
    if (typeof equippedWings === 'undefined' || !equippedWings || typeof player === 'undefined') return;
    const sx = player.x - camX;
    const sy = player.y - camY;
    const wingColor = equippedWings.color || '#FFFFFF';
    const wingSpread = player.vy < 0 ? 12 : 8;
    const wingFlap = Math.sin(Date.now() * 0.01) * 3;
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = wingColor;
    // Left wing
    ctx.beginPath();
    ctx.moveTo(sx, sy + 4);
    ctx.lineTo(sx - wingSpread, sy - 2 + wingFlap);
    ctx.lineTo(sx - wingSpread + 4, sy + 10 + wingFlap);
    ctx.lineTo(sx, sy + 12);
    ctx.fill();
    // Right wing
    ctx.beginPath();
    ctx.moveTo(sx + player.w, sy + 4);
    ctx.lineTo(sx + player.w + wingSpread, sy - 2 + wingFlap);
    ctx.lineTo(sx + player.w + wingSpread - 4, sy + 10 + wingFlap);
    ctx.lineTo(sx + player.w, sy + 12);
    ctx.fill();
    ctx.globalAlpha = 1;
}

// ===== PHASE 9: WEATHER RENDERING =====
const weatherParticles = [];
function updateWeatherParticles() {
    if (typeof currentWeather === 'undefined') return;
    // Spawn particles
    if (currentWeather === 'rain' || currentWeather === 'thunderstorm' || currentWeather === 'blood_rain') {
        for (let i = 0; i < 3; i++) {
            weatherParticles.push({
                x: Math.random() * 800, y: -5,
                vx: -1 + Math.random() * 0.5,
                vy: 6 + Math.random() * 4,
                life: 80,
                type: currentWeather === 'blood_rain' ? 'blood' : 'rain'
            });
        }
    }
    if (currentWeather === 'blizzard') {
        for (let i = 0; i < 4; i++) {
            weatherParticles.push({
                x: Math.random() * 800, y: -5,
                vx: -3 + Math.random() * 2,
                vy: 2 + Math.random() * 3,
                life: 120,
                type: 'snow'
            });
        }
    }
    if (currentWeather === 'sandstorm') {
        for (let i = 0; i < 3; i++) {
            weatherParticles.push({
                x: -5, y: Math.random() * 480,
                vx: 5 + Math.random() * 3,
                vy: -1 + Math.random() * 2,
                life: 100,
                type: 'sand'
            });
        }
    }
    // Update particles
    for (let i = weatherParticles.length - 1; i >= 0; i--) {
        const p = weatherParticles[i];
        p.x += p.vx; p.y += p.vy;
        p.life--;
        if (p.life <= 0 || p.y > 500 || p.x > 820 || p.x < -20) {
            weatherParticles.splice(i, 1);
        }
    }
    // Cap particles
    if (weatherParticles.length > 200) weatherParticles.splice(0, weatherParticles.length - 200);
}

function renderWeather(ctx) {
    if (typeof currentWeather === 'undefined') return;
    // Particle rendering
    for (const p of weatherParticles) {
        switch (p.type) {
            case 'rain':
                ctx.strokeStyle = '#6688CC';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x + p.vx * 2, p.y + p.vy * 2);
                ctx.stroke();
                break;
            case 'blood':
                ctx.strokeStyle = '#CC2222';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x + p.vx * 2, p.y + p.vy * 2);
                ctx.stroke();
                break;
            case 'snow':
                ctx.fillStyle = '#EEEEFF';
                ctx.beginPath();
                ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
                ctx.fill();
                break;
            case 'sand':
                ctx.fillStyle = '#DDBB66';
                ctx.globalAlpha = 0.6;
                ctx.fillRect(p.x, p.y, 3, 2);
                ctx.globalAlpha = 1;
                break;
        }
    }
    // Screen tint overlay
    if (currentWeather === 'thunderstorm') {
        ctx.fillStyle = '#000022';
        ctx.globalAlpha = 0.15;
        ctx.fillRect(0, 0, 800, 480);
        ctx.globalAlpha = 1;
    }
    if (currentWeather === 'blizzard') {
        ctx.fillStyle = '#CCDDFF';
        ctx.globalAlpha = 0.12;
        ctx.fillRect(0, 0, 800, 480);
        ctx.globalAlpha = 1;
    }
    if (currentWeather === 'blood_rain') {
        ctx.fillStyle = '#330000';
        ctx.globalAlpha = 0.10;
        ctx.fillRect(0, 0, 800, 480);
        ctx.globalAlpha = 1;
    }
    // Lightning flash
    if (typeof lightningFlash !== 'undefined' && lightningFlash > 0) {
        ctx.fillStyle = '#FFFFFF';
        ctx.globalAlpha = lightningFlash * 0.08;
        ctx.fillRect(0, 0, 800, 480);
        ctx.globalAlpha = 1;
    }
}

// ===== PHASE 9: LIQUID RENDERING =====
function renderLiquidTile(ctx, tile, sx, sy, time) {
    if (typeof T === 'undefined') return;
    if (tile === T.WATER) {
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = '#3366CC';
        ctx.fillRect(sx, sy, 8, 8);
        // Wave effect
        const wave = Math.sin(time * 0.004 + sx * 0.5) * 1.5;
        ctx.fillStyle = '#4488DD';
        ctx.globalAlpha = 0.3;
        ctx.fillRect(sx, sy + wave, 8, 2);
        ctx.globalAlpha = 1;
    } else if (tile === T.LAVA) {
        ctx.globalAlpha = 0.75;
        const lavaR = 200 + Math.sin(time * 0.006 + sx) * 55;
        ctx.fillStyle = `rgb(${lavaR}, ${40 + Math.sin(time * 0.008) * 20}, 0)`;
        ctx.fillRect(sx, sy, 8, 8);
        // Bubble
        if (Math.random() < 0.01) {
            ctx.fillStyle = '#FF8844';
            ctx.beginPath();
            ctx.arc(sx + Math.random() * 8, sy + 2, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    } else if (tile === T.HONEY) {
        ctx.globalAlpha = 0.65;
        ctx.fillStyle = '#DDAA22';
        ctx.fillRect(sx, sy, 8, 8);
        ctx.fillStyle = '#FFCC44';
        ctx.globalAlpha = 0.2;
        ctx.fillRect(sx + 2, sy + 1, 4, 3);
        ctx.globalAlpha = 1;
    }
}

// ===== PHASE 9: WIRE RENDERING =====
function renderWires(ctx, camX, camY) {
    if (typeof wireGrid === 'undefined') return;
    const wireColors = { red: '#FF444488', blue: '#4444FF88', green: '#44FF4488', yellow: '#FFFF4488' };
    for (const key in wireGrid) {
        const [x, y] = key.split(',').map(Number);
        const sx = x * 8 - camX;
        const sy = y * 8 - camY;
        if (sx < -8 || sx > 808 || sy < -8 || sy > 488) continue;
        const wires = wireGrid[key];
        let offset = 0;
        for (const color of ['red', 'blue', 'green', 'yellow']) {
            if (wires[color]) {
                ctx.fillStyle = wireColors[color];
                ctx.fillRect(sx + offset, sy + 3, 8, 2);
                offset += 1;
            }
        }
        // Powered glow
        const sig = typeof wireSignals !== 'undefined' ? wireSignals[key] : null;
        if (sig && sig.powered) {
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = '#FFFF44';
            ctx.fillRect(sx, sy, 8, 8);
            ctx.globalAlpha = 1;
        }
    }
}

// ===== PHASE 10: ACHIEVEMENT POPUP RENDERING =====
let achievementPopup = null;
let achievementPopupTimer = 0;
function renderAchievementPopup(ctx) {
    if (typeof achievementQueue === 'undefined' || achievementQueue.length === 0) {
        if (achievementPopup && achievementPopupTimer > 0) {
            achievementPopupTimer--;
        } else {
            achievementPopup = null;
            return;
        }
    }
    // Grab next achievement
    if (!achievementPopup && achievementQueue.length > 0) {
        achievementPopup = achievementQueue.shift();
        achievementPopupTimer = 180; // 3 seconds
    }
    if (!achievementPopup) return;
    // Slide in from top
    const slideY = achievementPopupTimer > 160 ? -40 + (180 - achievementPopupTimer) * 2 : (achievementPopupTimer < 20 ? achievementPopupTimer * -2 : 0);
    const px = 250;
    const py = 10 + slideY;
    // Background
    ctx.fillStyle = '#1a1a2e';
    ctx.globalAlpha = 0.95;
    ctx.fillRect(px, py, 300, 50);
    ctx.globalAlpha = 1;
    // Gold border
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2;
    ctx.strokeRect(px, py, 300, 50);
    // Icon
    ctx.font = '24px serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(achievementPopup.icon || '🏆', px + 10, py + 35);
    // Title
    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = '#FFD700';
    ctx.fillText('ACHIEVEMENT UNLOCKED', px + 50, py + 18);
    // Name
    ctx.font = '11px monospace';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(achievementPopup.name + ' — ' + achievementPopup.desc, px + 50, py + 36);
}

// ===== PHASE 10: BOSS RUSH HUD =====
function renderBossRushHUD(ctx) {
    if (typeof bossRushActive === 'undefined' || !bossRushActive) return;
    // Background bar
    ctx.fillStyle = '#1a0a00';
    ctx.globalAlpha = 0.85;
    ctx.fillRect(250, 460, 300, 20);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#FF8844';
    ctx.lineWidth = 1;
    ctx.strokeRect(250, 460, 300, 20);
    // Boss counter
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = '#FF8844';
    const bossName = typeof BOSS_RUSH_ORDER !== 'undefined' ? BOSS_RUSH_ORDER[bossRushIndex] || 'COMPLETE' : '???';
    ctx.fillText(`BOSS RUSH: ${bossRushIndex + 1}/${typeof BOSS_RUSH_ORDER !== 'undefined' ? BOSS_RUSH_ORDER.length : '?'} — ${bossName}`, 258, 475);
    // Timer
    const mins = Math.floor(bossRushTimer / 3600);
    const secs = Math.floor((bossRushTimer % 3600) / 60);
    ctx.fillStyle = '#FFDD44';
    ctx.fillText(`${mins}:${secs.toString().padStart(2, '0')}`, 510, 475);
}

// ===== PHASE 10: EXPERT MODE INDICATOR =====
function renderExpertIndicator(ctx) {
    if (typeof expertMode === 'undefined' || !expertMode) return;
    ctx.fillStyle = '#FF4444';
    ctx.font = 'bold 10px monospace';
    ctx.fillText('⚠ EXPERT', 720, 15);
}

// ===== PHASE 10: BESTIARY PANEL =====
function renderBestiaryPanel(ctx, panelOpen) {
    if (!panelOpen || typeof bestiary === 'undefined') return;
    // Panel background
    ctx.fillStyle = '#0a0a1a';
    ctx.globalAlpha = 0.92;
    ctx.fillRect(100, 50, 600, 380);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#4488CC';
    ctx.lineWidth = 2;
    ctx.strokeRect(100, 50, 600, 380);
    // Title
    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = '#4488CC';
    ctx.textAlign = 'center';
    ctx.fillText('📖 BESTIARY', 400, 75);
    ctx.textAlign = 'left';
    // Entries
    let row = 0;
    const entries = Object.keys(bestiary);
    for (let i = 0; i < Math.min(entries.length, 16); i++) {
        const key = entries[i];
        const entry = bestiary[key];
        const col = i < 8 ? 0 : 1;
        const r = i % 8;
        const ex = 115 + col * 290;
        const ey = 95 + r * 38;
        ctx.font = '10px monospace';
        ctx.fillStyle = '#AACCFF';
        ctx.fillText(key.replace(/_/g, ' '), ex, ey);
        ctx.fillStyle = '#888888';
        ctx.fillText(`Kills: ${entry.kills}`, ex + 150, ey);
    }
    // Completion
    if (typeof getBestiaryCompletion === 'function') {
        const comp = getBestiaryCompletion();
        ctx.font = '11px monospace';
        ctx.fillStyle = '#FFDD44';
        ctx.textAlign = 'center';
        ctx.fillText(`${comp.discovered}/${comp.total} discovered (${comp.percent}%)`, 400, 420);
        ctx.textAlign = 'left';
    }
}

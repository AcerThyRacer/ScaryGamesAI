/* ============================================================
   CURSED DEPTHS — Player System
   ============================================================ */

const player = {
    x: 0, y: 0, vx: 0, vy: 0,
    w: 12, h: 24,
    onGround: false, facing: 1,
    hp: 100, maxHp: 100, mana: 50, maxMana: 50,
    defense: 0, xp: 0, level: 1,
    inventory: new Array(40).fill(null),
    hotbar: 0,
    armor: { head: null, chest: null },
    accessories: { acc1: null, acc2: null }, // Phase 1 accessory slots
    miningX: -1, miningY: -1, miningProgress: 0,
    attackCd: 0, invincible: 0,
    jumpHeld: false, coyoteTime: 0,
    doubleJumped: false, // for double jump accessory
    effects: [],
    buffs: [], // Phase 1 food buffs: {type, duration}
    animFrame: 0, animTimer: 0, swingAngle: 0, swinging: false,
};

function initPlayer(heights) {
    const sx = Math.floor(WORLD_W / 2);
    player.x = sx * TILE + 4;
    player.y = (heights[sx] - 3) * TILE;
    // Starting items
    addItem(I_WOOD_PICK, 1);
    addItem(I_WOOD_SWORD, 1);
    addItem(T.TORCH, 10);
    addItem(T.WOOD, 20);
}

function addItem(id, count) {
    // Try stack first
    for (let i = 0; i < 40; i++) {
        const s = player.inventory[i];
        if (s && s.id === id && s.count < 999) {
            const add = Math.min(count, 999 - s.count);
            s.count += add; count -= add;
            if (count <= 0) return true;
        }
    }
    // Find empty slot
    for (let i = 0; i < 40; i++) {
        if (!player.inventory[i]) {
            player.inventory[i] = { id, count };
            return true;
        }
    }
    return false;
}

function removeItem(id, count) {
    let need = count;
    for (let i = 39; i >= 0; i--) {
        const s = player.inventory[i];
        if (s && s.id === id) {
            const take = Math.min(need, s.count);
            s.count -= take; need -= take;
            if (s.count <= 0) player.inventory[i] = null;
            if (need <= 0) return true;
        }
    }
    return false;
}

function countItem(id) {
    let c = 0;
    for (let i = 0; i < 40; i++) {
        if (player.inventory[i] && player.inventory[i].id === id) c += player.inventory[i].count;
    }
    return c;
}

function getHeldItem() {
    const s = player.inventory[player.hotbar];
    return s ? s : null;
}

function getToolTier() {
    const h = getHeldItem();
    if (!h) return -1;
    const it = ITEMS[h.id];
    if (it && it.toolType === 'pick') return it.tier;
    return -1;
}

function getToolPower() {
    const h = getHeldItem();
    if (!h) return 1;
    const it = ITEMS[h.id];
    if (it && it.toolType === 'pick') return it.power;
    return 1;
}

function updatePlayer(keys) {
    // Accessory passive effects
    const hasAcc = (eff) => {
        for (const slot of ['acc1', 'acc2']) {
            const a = player.accessories[slot];
            if (a) { const ai = ITEMS[a.id]; if (ai && ai.effect === eff) return true; }
        }
        return false;
    };
    const speedMult = player.effects.find(e => e.type === 'speed') || hasAcc('speed_perm') ? 1.5 : 1;
    const spd = PLAYER_SPEED * speedMult;

    // Horizontal movement
    if (keys['KeyA'] || keys['ArrowLeft']) { player.vx = -spd; player.facing = -1; }
    else if (keys['KeyD'] || keys['ArrowRight']) { player.vx = spd; player.facing = 1; }
    else player.vx *= 0.7;

    // Jump (with double jump accessory)
    if (player.onGround) { player.coyoteTime = 6; player.doubleJumped = false; }
    else if (player.coyoteTime > 0) player.coyoteTime--;

    if ((keys['Space'] || keys['KeyW'] || keys['ArrowUp']) && !player.jumpHeld) {
        if (player.coyoteTime > 0) {
            player.vy = JUMP_VEL; player.coyoteTime = 0; player.jumpHeld = true;
        } else if (hasAcc('doublejump') && !player.doubleJumped) {
            player.vy = JUMP_VEL * 0.85; player.doubleJumped = true; player.jumpHeld = true;
            spawnParticles(player.x + player.w / 2, player.y + player.h, '#44DD44', 4, 3);
        }
    }
    if (!keys['Space'] && !keys['KeyW'] && !keys['ArrowUp']) player.jumpHeld = false;

    // Gravity
    player.vy += GRAVITY;
    if (player.vy > MAX_FALL) player.vy = MAX_FALL;

    // Horizontal collision
    const nx = player.x + player.vx;
    const steps = Math.ceil(Math.abs(player.vx) / (TILE / 2));
    let canMoveX = true;
    for (let s = 1; s <= steps; s++) {
        const testX = player.x + (player.vx / steps) * s;
        if (collidesAt(testX, player.y)) { canMoveX = false; player.vx = 0; break; }
    }
    if (canMoveX) player.x = nx;

    // Vertical collision
    player.onGround = false;
    const ny = player.y + player.vy;
    if (collidesAt(player.x, ny)) {
        if (player.vy > 0) player.onGround = true;
        player.vy = 0;
    } else {
        player.y = ny;
    }

    // Block effects at player center
    const tx = Math.floor((player.x + player.w / 2) / TILE);
    const ty = Math.floor((player.y + player.h / 2) / TILE);
    const blockAt = getBlock(tx, ty);
    if (blockAt === T.COBWEB) { player.vx *= 0.4; player.vy *= 0.4; }
    if (blockAt === T.HONEY_BLOCK) { player.vx *= 0.5; player.vy *= 0.5; }
    if (blockAt === T.WATER) { player.vy *= 0.6; player.vx *= 0.85; } // Swimming
    if (blockAt === T.LAVA && !hasAcc('fireimmune')) {
        player.hp -= 2;
        if (player.invincible <= 0) player.invincible = 10;
    }
    // Phase 2: acid damage
    if (blockAt === T.ACID) {
        player.hp -= 3;
        if (player.invincible <= 0) player.invincible = 8;
        spawnParticles(player.x + player.w / 2, player.y, '#44FF00', 3, 3);
    }
    // Phase 2: blood slows
    if (blockAt === T.BLOOD) { player.vx *= 0.7; player.vy *= 0.7; }

    // Attack cooldown
    if (player.attackCd > 0) player.attackCd--;
    if (player.invincible > 0) player.invincible--;

    // Effects tick
    for (let i = player.effects.length - 1; i >= 0; i--) {
        player.effects[i].duration--;
        if (player.effects[i].duration <= 0) player.effects.splice(i, 1);
    }

    // Food buff tick
    for (let i = (player.buffs || []).length - 1; i >= 0; i--) {
        const b = player.buffs[i]; b.duration--;
        if (b.type === 'regen' && player.animTimer % 30 === 0) player.hp = Math.min(player.maxHp, player.hp + 1);
        if (b.type === 'mana_regen' && player.animTimer % 20 === 0) player.mana = Math.min(player.maxMana, player.mana + 1);
        if (b.duration <= 0) player.buffs.splice(i, 1);
    }

    // Animation
    player.animTimer++;
    if (Math.abs(player.vx) > 0.5) {
        if (player.animTimer % 8 === 0) player.animFrame = (player.animFrame + 1) % 4;
    } else player.animFrame = 0;

    if (player.swinging) {
        player.swingAngle += 15;
        if (player.swingAngle >= 90) { player.swinging = false; player.swingAngle = 0; }
    }

    // Mana regen
    if (player.animTimer % 60 === 0 && player.mana < player.maxMana) player.mana++;

    // XP/Level
    const needed = player.level * 50;
    if (player.xp >= needed) { player.xp -= needed; player.level++; player.maxHp += 10; player.hp = player.maxHp; player.maxMana += 5; }

    // Recalc defense (armor + accessories + food buffs)
    player.defense = 0;
    if (player.armor.head) { const a = ITEMS[player.armor.head.id]; if (a) player.defense += a.defense || 0; }
    if (player.armor.chest) { const a = ITEMS[player.armor.chest.id]; if (a) player.defense += a.defense || 0; }
    for (const slot of ['acc1', 'acc2']) {
        const ac = player.accessories[slot];
        if (ac) { const ai = ITEMS[ac.id]; if (ai && ai.defense) player.defense += ai.defense; }
    }
    if ((player.buffs || []).find(b => b.type === 'defense')) player.defense += 5;

    // World bounds
    player.x = Math.max(0, Math.min(player.x, (WORLD_W - 1) * TILE));
}

function collidesAt(px, py) {
    const left = Math.floor(px / TILE);
    const right = Math.floor((px + player.w - 1) / TILE);
    const top = Math.floor(py / TILE);
    const bot = Math.floor((py + player.h - 1) / TILE);
    for (let x = left; x <= right; x++)
        for (let y = top; y <= bot; y++)
            if (isSolid(x, y)) return true;
    return false;
}

function doMine(mouseWorldX, mouseWorldY) {
    const tx = Math.floor(mouseWorldX / TILE);
    const ty = Math.floor(mouseWorldY / TILE);
    const b = getBlock(tx, ty);
    if (b === T.AIR || b === T.BEDROCK || b === T.WATER || b === T.LAVA) return;
    const td = TILE_DATA[b];
    if (!td) return;
    // Range check
    const dx = (tx * TILE + 8) - (player.x + player.w / 2);
    const dy = (ty * TILE + 8) - (player.y + player.h / 2);
    if (Math.sqrt(dx * dx + dy * dy) > 80) return;
    // Tier check
    if (td.minTier > 0 && getToolTier() < td.minTier) return;

    if (player.miningX !== tx || player.miningY !== ty) {
        player.miningX = tx; player.miningY = ty; player.miningProgress = 0;
    }
    player.miningProgress += getToolPower();
    player.swinging = true; player.swingAngle = 0;

    if (player.miningProgress >= td.hardness) {
        setBlock(tx, ty, T.AIR);
        addItem(td.drop, 1);
        spawnParticles(tx * TILE + 8, ty * TILE + 8, td.color, 6, 3);
        player.miningX = -1; player.miningY = -1; player.miningProgress = 0;
        // Phase 3: First mine achievement
        if (typeof tryAchievement === 'function') tryAchievement('cd_first_mine');
    }
}

function doPlace(mouseWorldX, mouseWorldY) {
    const tx = Math.floor(mouseWorldX / TILE);
    const ty = Math.floor(mouseWorldY / TILE);
    if (getBlock(tx, ty) !== T.AIR) return;
    const dx = (tx * TILE + 8) - (player.x + player.w / 2);
    const dy = (ty * TILE + 8) - (player.y + player.h / 2);
    if (Math.sqrt(dx * dx + dy * dy) > 80) return;
    // Check not overlapping player
    const pl = Math.floor(player.x / TILE), pr = Math.floor((player.x + player.w) / TILE);
    const pt = Math.floor(player.y / TILE), pb = Math.floor((player.y + player.h) / TILE);
    if (tx >= pl && tx <= pr && ty >= pt && ty <= pb) return;

    const held = getHeldItem();
    if (!held || !isPlaceable(held.id)) return;
    setBlock(tx, ty, held.id);
    held.count--;
    if (held.count <= 0) player.inventory[player.hotbar] = null;
}

function doAttack(mouseWorldX, mouseWorldY, enemies) {
    if (player.attackCd > 0) return;
    const held = getHeldItem();
    const it = held ? ITEMS[held.id] : null;
    if (!it || (it.type !== 'weapon' && it.type !== 'tool')) {
        // Punch
        attackEnemies(mouseWorldX, mouseWorldY, 30, 5, enemies);
        player.attackCd = 15;
    } else if (it.type === 'weapon') {
        attackEnemies(mouseWorldX, mouseWorldY, it.range || 40, it.damage, enemies);
        player.attackCd = it.speed || 5;
        player.swinging = true; player.swingAngle = 0;
    }
}

function attackEnemies(mx, my, range, damage, enemies) {
    const px = player.x + player.w / 2, py = player.y + player.h / 2;
    for (const e of enemies) {
        if (e.dead) continue;
        const ex = e.x + e.w / 2, ey = e.y + e.h / 2;
        const d = Math.sqrt((ex - px) * (ex - px) + (ey - py) * (ey - py));
        if (d < range + e.w / 2) {
            e.hp -= damage;
            e.hitTimer = 10;
            e.vx = (ex - px) > 0 ? 4 : -4;
            e.vy = -3;
            spawnParticles(ex, ey, '#CC2244', 4, 3);
            if (e.hp <= 0) {
                e.dead = true;
                player.xp += e.xp || 5;
                // Phase 3: Kill tracking
                if (typeof totalKills !== 'undefined') totalKills++;
                // Drops
                if (e.drops) for (const drop of e.drops) {
                    const amt = drop[1] + Math.floor(Math.random() * (drop[2] - drop[1] + 1));
                    if (amt > 0) addItem(drop[0], amt);
                }
            }
        }
    }
}

function useItem() {
    const held = getHeldItem();
    if (!held) return;
    const it = ITEMS[held.id];
    if (!it) return;
    if (it.type === 'potion') {
        if (it.heal) player.hp = Math.min(player.maxHp, player.hp + it.heal);
        if (it.mana) player.mana = Math.min(player.maxMana, player.mana + it.mana);
        if (it.effect) player.effects.push({ type: it.effect, duration: it.duration || 300 });
        held.count--;
        if (held.count <= 0) player.inventory[player.hotbar] = null;
    } else if (it.type === 'food') {
        useFood(held);
    }
}

function useFood(slot) {
    if (!slot) return;
    const it = ITEMS[slot.id];
    if (!it || it.type !== 'food') return;
    if (it.heal) player.hp = Math.min(player.maxHp, player.hp + it.heal);
    if (it.buff) {
        if (!player.buffs) player.buffs = [];
        // Remove existing buff of same type
        player.buffs = player.buffs.filter(b => b.type !== it.buff);
        player.buffs.push({ type: it.buff, duration: it.buffDur || 300 });
    }
    slot.count--;
    if (slot.count <= 0) {
        const idx = player.inventory.indexOf(slot);
        if (idx >= 0) player.inventory[idx] = null;
    }
    spawnParticles(player.x + player.w / 2, player.y, '#44CC44', 4, 3);
}

function shootMagic(it) {
    if (!it || player.mana < (it.manaCost || 0)) return;
    player.mana -= it.manaCost || 0;
    const mx = _mouseWorldX, my = _mouseWorldY;
    const px = player.x + player.w / 2, py = player.y + player.h / 2;
    const ang = Math.atan2(my - py, mx - px);
    const colorMap = { fireball: '#FF4400', icebolt: '#88DDFF', shadowbolt: '#7700CC', heal: '#44CC44' };
    const spd = it.projectile === 'heal' ? 0 : 5;
    if (it.projectile === 'heal') {
        player.hp = Math.min(player.maxHp, player.hp + 15);
        spawnParticles(px, py, '#44CC44', 8, 4);
    } else {
        projectiles.push({
            x: px, y: py, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
            damage: it.damage, life: 120,
            color: colorMap[it.projectile] || '#FFFFFF', size: 5, fromPlayer: true
        });
    }
    player.attackCd = it.speed || 10;
    player.swinging = true; player.swingAngle = 0;
}

function drawPlayer(ctx, camX, camY) {
    const sx = player.x - camX, sy = player.y - camY;
    const f = player.facing;
    // Invincibility flash
    if (player.invincible > 0 && player.invincible % 4 < 2) return;

    ctx.save();
    ctx.translate(sx + player.w / 2, sy + player.h / 2);
    if (f < 0) ctx.scale(-1, 1);

    // Body (Phase 3: skin-aware)
    const skin = (typeof SKINS !== 'undefined' && typeof playerSkin !== 'undefined') ? SKINS[playerSkin] || SKINS.default : null;
    ctx.fillStyle = skin ? skin.body : '#4488CC';
    ctx.fillRect(-5, -8, 10, 16);
    // Head
    ctx.fillStyle = skin ? skin.face : '#DDBB88';
    ctx.fillRect(-4, -12, 8, 6);
    // Eyes
    ctx.fillStyle = skin ? skin.eyes : '#CC1122';
    ctx.fillRect(1, -11, 2, 2);
    // Legs
    const legOff = Math.sin(player.animFrame * Math.PI / 2) * 3;
    ctx.fillStyle = skin ? skin.body : '#335588';
    ctx.fillRect(-4, 8, 4, 5);
    ctx.fillRect(1, 8, 4, 5);
    // Arms
    ctx.fillStyle = skin ? skin.body : '#4488CC';
    if (player.swinging) {
        ctx.save();
        ctx.translate(4, -4);
        ctx.rotate((-45 + player.swingAngle) * Math.PI / 180);
        ctx.fillRect(0, -1, 10, 3);
        // Tool
        const held = getHeldItem();
        if (held) {
            ctx.fillStyle = getItemColor(held.id);
            ctx.fillRect(8, -3, 5, 5);
        }
        ctx.restore();
    } else {
        ctx.fillRect(5, -6, 3, 10);
    }
    // Armor overlay
    if (player.armor.head) {
        ctx.fillStyle = getItemColor(player.armor.head.id);
        ctx.globalAlpha = 0.5;
        ctx.fillRect(-5, -13, 10, 4);
        ctx.globalAlpha = 1;
    }
    if (player.armor.chest) {
        ctx.fillStyle = getItemColor(player.armor.chest.id);
        ctx.globalAlpha = 0.4;
        ctx.fillRect(-5, -8, 10, 16);
        ctx.globalAlpha = 1;
    }
    ctx.restore();
}

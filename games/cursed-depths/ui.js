/* ============================================================
   CURSED DEPTHS — UI (Inventory, Crafting, HUD)
   ============================================================ */

let showInventory = false;
let showCrafting = false;
let showPause = false;
let dragItem = null; // {id, count, fromSlot}
let craftScroll = 0;
let tooltipItem = null;

const SLOT_SIZE = 40;
const HOTBAR_X = 10, HOTBAR_Y = 10;
const INV_COLS = 10, INV_ROWS = 4;

function toggleInventory() { showInventory = !showInventory; showCrafting = false; dragItem = null; }
function toggleCrafting() { showCrafting = !showCrafting; showInventory = false; dragItem = null; }

// Check if player is near a station
function nearStation(type) {
    const px = Math.floor((player.x + player.w / 2) / TILE);
    const py = Math.floor((player.y + player.h / 2) / TILE);
    for (let dx = -3; dx <= 3; dx++) for (let dy = -3; dy <= 3; dy++) {
        const b = getBlock(px + dx, py + dy);
        if (type === 'workbench' && b === T.WORKBENCH) return true;
        if (type === 'furnace' && b === T.FURNACE) return true;
        if (type === 'anvil' && b === T.ANVIL) return true;
        if (type === 'altar' && b === T.BLOOD_ALTAR) return true;
        if (type === 'cooking' && b === T.COOKING_STATION) return true;
    }
    return false;
}

function getAvailableRecipes() {
    return RECIPES.filter(r => {
        if (r.station && !nearStation(r.station)) return false;
        return true;
    });
}

function canCraft(recipe) {
    for (const [id, amt] of recipe.ingredients) {
        if (countItem(id) < amt) return false;
    }
    return true;
}

function doCraft(recipe) {
    if (!canCraft(recipe)) return;
    for (const [id, amt] of recipe.ingredients) removeItem(id, amt);
    addItem(recipe.result, recipe.rAmt);
    // Phase A: Apply weapon modifier to crafted weapon
    if (typeof applyWeaponModifier === 'function') {
        const slot = player.inventory.find(s => s && s.id === recipe.result && !s.modifier);
        if (slot) applyWeaponModifier(slot);
    }
    // Phase 7: Track crafts
    if (typeof totalCrafts !== 'undefined') totalCrafts++;
    if (typeof checkQuestProgress === 'function') checkQuestProgress('craft', recipe.result);
    if (typeof playSFX === 'function') playSFX('pickup');
}

// ===== FLOATING DAMAGE/XP NUMBERS =====
const _floatingNumbers = [];
function spawnDamageNumber(x, y, text, color, isXP) {
    _floatingNumbers.push({
        x, y, text: String(text), color, life: 50, maxLife: 50,
        vx: (Math.random() - 0.5) * 1.5, vy: -2 - Math.random() * 1.5,
        size: isXP ? 12 : (parseInt(text) > 30 ? 18 : 14),
        isXP: isXP || false
    });
}
function updateFloatingNumbers() {
    for (let i = _floatingNumbers.length - 1; i >= 0; i--) {
        const n = _floatingNumbers[i];
        n.x += n.vx; n.y += n.vy; n.vy += 0.04; n.life--;
        if (n.life <= 0) _floatingNumbers.splice(i, 1);
    }
}
function drawFloatingNumbers(ctx, camX, camY) {
    for (const n of _floatingNumbers) {
        const alpha = Math.min(1, n.life / 15);
        const scale = n.life > 40 ? 1 + (50 - n.life) * 0.05 : 1;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = `bold ${Math.floor(n.size * scale)}px Inter`;
        ctx.textAlign = 'center';
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillText(n.text, n.x - camX + 1, n.y - camY + 1);
        // Text
        ctx.fillStyle = n.color;
        ctx.fillText(n.text, n.x - camX, n.y - camY);
        ctx.restore();
    }
}

// ===== DRAW HUD (Premium Glass-Panel) =====
function drawHUD(ctx, W, H, dayTime) {
    // --- Glass-panel hotbar ---
    const hotbarW = 10 * (SLOT_SIZE + 4) + 8;
    const hbXStart = HOTBAR_X;

    // Hotbar glass background
    ctx.save();
    ctx.fillStyle = 'rgba(8,4,16,0.65)';
    const hbRad = 8;
    roundedRect(ctx, hbXStart - 4, HOTBAR_Y - 4, hotbarW, SLOT_SIZE + 8, hbRad);
    ctx.fill();
    // Glass border glow
    ctx.strokeStyle = 'rgba(180,60,80,0.35)';
    ctx.lineWidth = 1.5;
    roundedRect(ctx, hbXStart - 4, HOTBAR_Y - 4, hotbarW, SLOT_SIZE + 8, hbRad);
    ctx.stroke();
    // Inner highlight
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    roundedRect(ctx, hbXStart - 2, HOTBAR_Y - 2, hotbarW - 4, (SLOT_SIZE + 4) / 2, hbRad);
    ctx.fill();
    ctx.restore();

    for (let i = 0; i < 10; i++) {
        const x = HOTBAR_X + i * (SLOT_SIZE + 4), y = HOTBAR_Y;
        // Slot background
        ctx.fillStyle = i === player.hotbar ? 'rgba(200,40,60,0.25)' : 'rgba(0,0,0,0.3)';
        roundedRect(ctx, x, y, SLOT_SIZE, SLOT_SIZE, 4);
        ctx.fill();
        // Slot border
        if (i === player.hotbar) {
            ctx.strokeStyle = '#FF3344';
            ctx.lineWidth = 2;
            ctx.shadowColor = '#FF3344';
            ctx.shadowBlur = 8;
        } else {
            ctx.strokeStyle = 'rgba(255,255,255,0.08)';
            ctx.lineWidth = 1;
            ctx.shadowBlur = 0;
        }
        roundedRect(ctx, x, y, SLOT_SIZE, SLOT_SIZE, 4);
        ctx.stroke();
        ctx.shadowBlur = 0;
        // Item
        const slot = player.inventory[i];
        if (slot) {
            drawItemIcon(ctx, slot.id, x + 4, y + 4, SLOT_SIZE - 8);
            if (slot.count > 1) {
                ctx.fillStyle = '#000'; ctx.font = 'bold 10px Inter'; ctx.textAlign = 'right';
                ctx.fillText(slot.count, x + SLOT_SIZE - 3, y + SLOT_SIZE - 3);
                ctx.fillStyle = '#fff';
                ctx.fillText(slot.count, x + SLOT_SIZE - 4, y + SLOT_SIZE - 4);
            }
        }
        // Hotbar number
        ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.font = '8px Inter'; ctx.textAlign = 'left';
        ctx.fillText(i + 1 > 9 ? '0' : String(i + 1), x + 3, y + 10);
    }

    // --- Heart-based HP ---
    const hpY = HOTBAR_Y + SLOT_SIZE + 10;
    const maxHearts = Math.ceil(player.maxHp / 20);
    const filledHearts = player.hp / 20;
    ctx.font = '14px Inter';
    for (let i = 0; i < Math.min(maxHearts, 10); i++) {
        const hx = HOTBAR_X + i * 18;
        if (i < Math.floor(filledHearts)) {
            // Full heart
            ctx.fillStyle = '#CC1122';
            ctx.fillText('♥', hx, hpY + 12);
        } else if (i < filledHearts) {
            // Partial (half) heart
            ctx.fillStyle = '#CC1122';
            ctx.globalAlpha = 0.5;
            ctx.fillText('♥', hx, hpY + 12);
            ctx.globalAlpha = 1;
        } else {
            // Empty heart
            ctx.fillStyle = 'rgba(100,30,30,0.5)';
            ctx.fillText('♥', hx, hpY + 12);
        }
    }
    // HP text
    ctx.fillStyle = '#ddd'; ctx.font = '10px Inter'; ctx.textAlign = 'left';
    ctx.fillText(`${Math.ceil(player.hp)}/${player.maxHp}`, HOTBAR_X + Math.min(maxHearts, 10) * 18 + 4, hpY + 12);

    // Low HP pulse warning
    if (player.hp / player.maxHp < 0.3) {
        const pulse = Math.sin(gameFrame * 0.15) * 0.5 + 0.5;
        ctx.fillStyle = `rgba(200,0,0,${pulse * 0.08})`;
        ctx.fillRect(0, 0, W, H);
    }

    // --- Mana orb ---
    const manaY = hpY + 18;
    const manaFill = player.mana / player.maxMana;
    // Orb background
    ctx.fillStyle = 'rgba(10,10,40,0.6)';
    ctx.beginPath(); ctx.arc(HOTBAR_X + 10, manaY + 8, 10, 0, Math.PI * 2); ctx.fill();
    // Mana fill (clip arc from bottom)
    ctx.save();
    ctx.beginPath(); ctx.arc(HOTBAR_X + 10, manaY + 8, 9, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = '#2255CC';
    ctx.fillRect(HOTBAR_X, manaY + 8 + 9 - 18 * manaFill, 20, 18 * manaFill);
    // Shine
    ctx.fillStyle = 'rgba(100,160,255,0.3)';
    ctx.fillRect(HOTBAR_X + 4, manaY + 8 - 6, 4, 6);
    ctx.restore();
    // Orb border
    ctx.strokeStyle = 'rgba(80,100,220,0.5)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(HOTBAR_X + 10, manaY + 8, 10, 0, Math.PI * 2); ctx.stroke();
    // Mana text
    ctx.fillStyle = '#88AAFF'; ctx.font = '10px Inter'; ctx.textAlign = 'left';
    ctx.fillText(`✦ ${Math.ceil(player.mana)}/${player.maxMana}`, HOTBAR_X + 24, manaY + 12);

    // --- Level/XP with bar ---
    const xpY = manaY + 24;
    const xpNeeded = player.level * 50;
    const xpPct = player.xp / xpNeeded;
    ctx.fillStyle = '#FFD700'; ctx.font = 'bold 11px Inter'; ctx.textAlign = 'left';
    ctx.fillText(`Lv.${player.level}`, HOTBAR_X, xpY);
    // Mini XP bar
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    roundedRect(ctx, HOTBAR_X + 40, xpY - 8, 100, 8, 3); ctx.fill();
    ctx.fillStyle = '#FFD700';
    roundedRect(ctx, HOTBAR_X + 40, xpY - 8, Math.max(2, 100 * xpPct), 8, 3); ctx.fill();
    ctx.fillStyle = '#aaa'; ctx.font = '8px Inter';
    ctx.fillText(`${player.xp}/${xpNeeded}`, HOTBAR_X + 144, xpY);
    // Defense
    ctx.fillStyle = '#88aacc'; ctx.font = '10px Inter';
    ctx.fillText(`🛡 ${player.defense}`, HOTBAR_X + 195, xpY);

    // --- Depth/Biome display (right side) ---
    const depthBlocks = Math.max(0, Math.floor(player.y / TILE) - SURFACE_Y);
    let biome = 'Haunted Forest';
    if (depthBlocks > ABYSS_Y - SURFACE_Y) biome = 'Hell Core';
    else if (depthBlocks > HIVE_Y - SURFACE_Y) biome = 'Abyssal Depths';
    else if (depthBlocks > FLESH_Y - SURFACE_Y) biome = 'Living Hive';
    else if (depthBlocks > FROZEN_Y - SURFACE_Y) biome = 'Flesh Tunnels';
    else if (depthBlocks > MUSH_Y - SURFACE_Y) biome = 'Frozen Crypt';
    else if (depthBlocks > CAVE_Y - SURFACE_Y) biome = 'Mushroom Caverns';
    else if (depthBlocks > 20) biome = 'Bone Caverns';

    // Glass panel for depth
    ctx.fillStyle = 'rgba(8,4,16,0.55)';
    roundedRect(ctx, W - 160, 6, 148, 50, 6); ctx.fill();
    ctx.strokeStyle = 'rgba(180,60,80,0.25)'; ctx.lineWidth = 1;
    roundedRect(ctx, W - 160, 6, 148, 50, 6); ctx.stroke();

    ctx.textAlign = 'right'; ctx.fillStyle = '#ccc'; ctx.font = '11px Inter';
    ctx.fillText(`Depth: ${depthBlocks}m`, W - 18, 24);
    ctx.fillStyle = '#CC1122'; ctx.font = '11px Creepster, cursive';
    ctx.fillText(biome, W - 18, 40);

    // Day/night clock
    const _clockIcon = typeof getGameTimeIcon === 'function' ? getGameTimeIcon() : (dayTime > 0.5 ? '🌙' : '☀');
    const _clockStr = typeof getGameTimeString === 'function' ? getGameTimeString() : (dayTime > 0.5 ? 'Night' : 'Day');
    const _nightAmt = typeof getNightAmount === 'function' ? getNightAmount() : (dayTime > 0.5 ? 1 : 0);
    ctx.fillStyle = _nightAmt > 0.5 ? '#8899BB' : '#DDCC88'; ctx.font = 'bold 10px Inter';
    ctx.fillText(`${_clockIcon} ${_clockStr}`, W - 18, 53);

    // Weather
    if (weather.type !== 'clear') {
        const wIcons = { rain: '🌧', storm: '⛈', fog: '🌫', blood_rain: '🩸', ash: '🌋' };
        ctx.fillStyle = '#CCAA88'; ctx.font = '9px Inter';
        ctx.fillText(`${wIcons[weather.type] || ''} ${weather.type.replace('_', ' ')}`, W - 18, 68);
    }
    if (worldEvent.type) {
        ctx.fillStyle = '#FF4444'; ctx.font = 'bold 10px Inter';
        ctx.fillText(`⚠ ${worldEvent.type.replace(/_/g, ' ').toUpperCase()}`, W - 18, 82);
    }

    // NPC hint
    let nearNPC = false;
    for (const n of npcs) {
        const d = Math.sqrt((n.x - player.x) ** 2 + (n.y - player.y) ** 2);
        if (d < 50 && n.rescued) { nearNPC = n; break; }
    }
    if (nearNPC) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        roundedRect(ctx, W / 2 - 180, H - 42, 360, 26, 6); ctx.fill();
        ctx.fillStyle = '#44FF44'; ctx.font = '11px Inter'; ctx.textAlign = 'center';
        ctx.fillText(`[F] Talk to ${nearNPC.name}  [T] Toggle Companion`, W / 2, H - 24);
    }

    // Buffs
    let ey = 90;
    for (const eff of player.effects) {
        ctx.textAlign = 'right';
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        roundedRect(ctx, W - 140, ey - 10, 128, 16, 3); ctx.fill();
        ctx.fillStyle = '#44CC44'; ctx.font = '10px Inter';
        ctx.fillText(`⚡ ${eff.type} (${Math.ceil(eff.duration / 60)}s)`, W - 18, ey);
        ey += 20;
    }

    // --- BOSS HP BAR (premium centered) ---
    if (boss && !boss.dead) {
        const bw = Math.min(500, W * 0.4), bx = (W - bw) / 2, by = 10;
        // Glass panel
        ctx.fillStyle = 'rgba(8,4,16,0.7)';
        roundedRect(ctx, bx - 6, by - 4, bw + 12, 32, 6); ctx.fill();
        // HP bar background
        ctx.fillStyle = '#220808';
        roundedRect(ctx, bx, by, bw, 20, 4); ctx.fill();
        // HP bar gradient fill
        const hpPct = boss.hp / boss.maxHp;
        const hpGrd = ctx.createLinearGradient(bx, by, bx, by + 20);
        if (hpPct > 0.3) {
            hpGrd.addColorStop(0, '#EE3355'); hpGrd.addColorStop(1, '#991122');
        } else {
            hpGrd.addColorStop(0, '#FF6622'); hpGrd.addColorStop(1, '#AA2200');
        }
        ctx.fillStyle = hpGrd;
        roundedRect(ctx, bx, by, Math.max(4, bw * hpPct), 20, 4); ctx.fill();
        // Shine on bar
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        roundedRect(ctx, bx + 2, by + 1, bw * hpPct - 4, 8, 3); ctx.fill();
        // Phase markers
        const phases = boss.phases || 3;
        for (let p = 1; p < phases; p++) {
            const px2 = bx + (bw / phases) * p;
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.fillRect(px2 - 0.5, by, 1, 20);
        }
        // Border
        ctx.strokeStyle = 'rgba(200,40,60,0.6)'; ctx.lineWidth = 1.5;
        roundedRect(ctx, bx, by, bw, 20, 4); ctx.stroke();
        // Name & phase
        ctx.fillStyle = '#fff'; ctx.font = 'bold 11px Creepster'; ctx.textAlign = 'center';
        ctx.fillText(`${boss.name}  ·  Phase ${boss.phase}/${phases}`, W / 2, by + 15);
    }

    // Held item tooltip
    const held = getHeldItem();
    if (held) {
        const nameText = getItemName(held.id);
        const it = ITEMS[held.id];
        const tipY = HOTBAR_Y + SLOT_SIZE + 58;
        ctx.textAlign = 'center';
        // Background pill
        const metrics = ctx.measureText(nameText);
        const pillW = metrics.width + 16;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        roundedRect(ctx, HOTBAR_X + 5 * (SLOT_SIZE + 4) + SLOT_SIZE / 2 - pillW / 2, tipY - 12, pillW, 18, 4);
        ctx.fill();
        ctx.fillStyle = getItemColor(held.id); ctx.font = '11px Inter';
        ctx.fillText(nameText, HOTBAR_X + 5 * (SLOT_SIZE + 4) + SLOT_SIZE / 2, tipY);
        // Show damage if weapon/gun
        if (it && (it.type === 'weapon' || it.type === 'gun' || it.type === 'bow')) {
            ctx.fillStyle = '#FF8866'; ctx.font = '9px Inter';
            ctx.fillText(`⚔ ${it.damage} dmg`, HOTBAR_X + 5 * (SLOT_SIZE + 4) + SLOT_SIZE / 2, tipY + 14);
        }
    }

    // Mining progress (centered pill)
    if (player.miningX >= 0) {
        const b = getBlock(player.miningX, player.miningY);
        const td = TILE_DATA[b];
        if (td && td.hardness > 0) {
            const pct = player.miningProgress / td.hardness;
            const mx = W / 2 - 40, my = H / 2 + 35;
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            roundedRect(ctx, mx, my, 80, 8, 4); ctx.fill();
            ctx.fillStyle = '#FFaa33';
            roundedRect(ctx, mx, my, Math.max(4, 80 * Math.min(1, pct)), 8, 4); ctx.fill();
        }
    }

    // Update floating numbers
    updateFloatingNumbers();
}

// Rounded rect helper
function roundedRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

function drawItemIcon(ctx, id, x, y, size) {
    ctx.fillStyle = getItemColor(id);
    if (id < 100) {
        // Block - 3D-ish cube look
        ctx.fillRect(x + 2, y + 2, size - 4, size - 4);
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(x + 2, y + 2, size - 4, (size - 4) / 3);
        ctx.fillStyle = 'rgba(0,0,0,0.12)';
        ctx.fillRect(x + 2, y + 2 + (size - 4) * 0.7, size - 4, (size - 4) * 0.3);
    } else {
        const it = ITEMS[id];
        if (it && it.type === 'gun') {
            // Gun icon — barrel + stock
            ctx.fillRect(x + 4, y + size / 2 - 2, size - 6, 4); // barrel
            ctx.fillRect(x + size - 10, y + size / 2 - 4, 6, 8); // stock
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.fillRect(x + 4, y + size / 2, size - 6, 2);
            // Trigger
            ctx.fillStyle = getItemColor(id);
            ctx.fillRect(x + size / 2 - 1, y + size / 2 + 2, 2, 4);
        } else if (it && it.type === 'ammo') {
            // Bullet icon
            ctx.beginPath();
            ctx.arc(x + size / 2, y + size / 2, size / 4, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.fillRect(x + size / 2 - 1, y + 4, 2, size / 3);
        } else if (it && (it.type === 'weapon' || it.toolType === 'pick')) {
            // Sword/tool — angled
            ctx.save();
            ctx.translate(x + size / 2, y + size / 2);
            ctx.rotate(-Math.PI / 4);
            ctx.fillRect(-2, -size / 2 + 2, 4, size - 6); // blade
            ctx.fillStyle = 'rgba(100,80,50,0.8)';
            ctx.fillRect(-4, size / 2 - 10, 8, 6); // handle
            ctx.restore();
        } else if (it && it.type === 'bow') {
            // Bow arc
            ctx.strokeStyle = getItemColor(id); ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x + size / 2 + 4, y + size / 2, size / 2 - 4, Math.PI * 0.7, Math.PI * 1.3);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x + size / 2 + 2, y + 4);
            ctx.lineTo(x + size / 2 + 2, y + size - 4);
            ctx.stroke();
        } else if (it && it.type === 'armor') {
            ctx.fillRect(x + 4, y + 4, size - 8, size - 8);
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.fillRect(x + 6, y + 6, size - 12, 4);
            ctx.fillStyle = 'rgba(0,0,0,0.15)';
            ctx.fillRect(x + 6, y + size - 10, size - 12, 4);
        } else if (it && it.type === 'potion') {
            ctx.beginPath();
            ctx.arc(x + size / 2, y + size / 2 + 2, size / 3, 0, Math.PI * 2); ctx.fill();
            ctx.fillRect(x + size / 2 - 2, y + 4, 4, size / 3);
            ctx.fillStyle = 'rgba(255,255,255,0.25)';
            ctx.fillRect(x + size / 2 - 3, y + size / 3 + 2, 2, 4);
        } else if (it && it.type === 'magic') {
            // Magic staff / orb
            ctx.fillRect(x + size / 2 - 1, y + 6, 2, size - 8);
            ctx.fillStyle = getItemColor(id);
            ctx.beginPath(); ctx.arc(x + size / 2, y + 6, 4, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.beginPath(); ctx.arc(x + size / 2 - 1, y + 5, 2, 0, Math.PI * 2); ctx.fill();
        } else if (it && it.type === 'summon') {
            // Mysterious item with glow
            const glow = Math.sin(gameFrame * 0.08) * 0.3 + 0.5;
            ctx.globalAlpha = glow;
            ctx.beginPath(); ctx.arc(x + size / 2, y + size / 2, size / 2 - 2, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#FFF';
            ctx.beginPath(); ctx.arc(x + size / 2, y + size / 2, 3, 0, Math.PI * 2); ctx.fill();
        } else if (it && it.type === 'food') {
            // Food item
            ctx.beginPath();
            ctx.ellipse(x + size / 2, y + size / 2, size / 3, size / 4, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.15)';
            ctx.fillRect(x + size / 3, y + size / 3, size / 4, 2);
        } else if (it && it.type === 'accessory') {
            // Ring shape
            ctx.strokeStyle = getItemColor(id); ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(x + size / 2, y + size / 2, size / 3, 0, Math.PI * 2); ctx.stroke();
            ctx.fillStyle = getItemColor(id);
            ctx.beginPath(); ctx.arc(x + size / 2, y + size / 3, 3, 0, Math.PI * 2); ctx.fill();
        } else {
            // Generic material — diamond shape
            ctx.beginPath();
            ctx.moveTo(x + size / 2, y + 3);
            ctx.lineTo(x + size - 3, y + size / 2);
            ctx.lineTo(x + size / 2, y + size - 3);
            ctx.lineTo(x + 3, y + size / 2);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.15)';
            ctx.beginPath();
            ctx.moveTo(x + size / 2, y + 5);
            ctx.lineTo(x + size - 6, y + size / 2);
            ctx.lineTo(x + size / 2, y + size / 2);
            ctx.lineTo(x + 6, y + size / 2);
            ctx.closePath();
            ctx.fill();
        }
    }
}

// ===== INVENTORY SCREEN =====
function drawInventoryScreen(ctx, W, H) {
    if (!showInventory) return;
    const panW = INV_COLS * (SLOT_SIZE + 4) + 20;
    const panH = INV_ROWS * (SLOT_SIZE + 4) + 80;
    const px = (W - panW) / 2, py = (H - panH) / 2;

    // Background
    ctx.fillStyle = 'rgba(10,5,15,0.92)';
    ctx.fillRect(px, py, panW, panH);
    ctx.strokeStyle = '#CC1122'; ctx.lineWidth = 2;
    ctx.strokeRect(px, py, panW, panH);

    // Title
    ctx.fillStyle = '#CC1122'; ctx.font = '20px Creepster'; ctx.textAlign = 'center';
    ctx.fillText('Inventory', W / 2, py + 24);

    // Armor slots
    ctx.fillStyle = '#aaa'; ctx.font = '10px Inter'; ctx.textAlign = 'left';
    ctx.fillText('Armor:', px + 10, py + 44);
    // Head
    drawSlotBox(ctx, px + 60, py + 34, SLOT_SIZE, player.armor.head);
    ctx.fillStyle = '#666'; ctx.font = '8px Inter'; ctx.fillText('Head', px + 64, py + 34 + SLOT_SIZE + 10);
    // Chest
    drawSlotBox(ctx, px + 110, py + 34, SLOT_SIZE, player.armor.chest);
    ctx.fillStyle = '#666'; ctx.fillText('Chest', px + 112, py + 34 + SLOT_SIZE + 10);

    // Grid (slots 10-39 = backpack)
    for (let row = 0; row < INV_ROWS; row++) {
        for (let col = 0; col < INV_COLS; col++) {
            const idx = 10 + row * INV_COLS + col;
            if (idx >= 40) continue;
            const sx = px + 10 + col * (SLOT_SIZE + 4);
            const sy = py + 84 + row * (SLOT_SIZE + 4);
            const slot = player.inventory[idx];
            drawSlotBox(ctx, sx, sy, SLOT_SIZE, slot);
        }
    }

    // Drag item
    if (dragItem) {
        const mx = _rawMouseX, my = _rawMouseY;
        drawItemIcon(ctx, dragItem.id, mx - 16, my - 16, 32);
        ctx.fillStyle = '#fff'; ctx.font = '10px Inter'; ctx.textAlign = 'right';
        ctx.fillText(dragItem.count, mx + 12, my + 12);
    }
}

function drawSlotBox(ctx, x, y, size, slot) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(x, y, size, size);
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1;
    ctx.strokeRect(x, y, size, size);
    if (slot) {
        drawItemIcon(ctx, slot.id, x + 4, y + 4, size - 8);
        if (slot.count > 1) {
            ctx.fillStyle = '#fff'; ctx.font = '10px Inter'; ctx.textAlign = 'right';
            ctx.fillText(slot.count, x + size - 3, y + size - 3);
        }
    }
}

// ===== CRAFTING SCREEN =====
function drawCraftingScreen(ctx, W, H) {
    if (!showCrafting) return;
    const recipes = getAvailableRecipes();
    const panW = 340, panH = 400;
    const px = (W - panW) / 2, py = (H - panH) / 2;

    ctx.fillStyle = 'rgba(10,5,15,0.92)';
    ctx.fillRect(px, py, panW, panH);
    ctx.strokeStyle = '#FFaa33'; ctx.lineWidth = 2;
    ctx.strokeRect(px, py, panW, panH);

    ctx.fillStyle = '#FFaa33'; ctx.font = '20px Creepster'; ctx.textAlign = 'center';
    ctx.fillText('Crafting', W / 2, py + 24);

    // Station info
    ctx.fillStyle = '#888'; ctx.font = '10px Inter';
    let stations = [];
    if (nearStation('workbench')) stations.push('Workbench');
    if (nearStation('furnace')) stations.push('Furnace');
    if (nearStation('anvil')) stations.push('Anvil');
    if (nearStation('altar')) stations.push('Blood Altar');
    if (nearStation('cooking')) stations.push('Cooking Station');
    ctx.fillText(stations.length ? 'Near: ' + stations.join(', ') : 'No station nearby (basic only)', W / 2, py + 40);

    // Recipe list
    const startY = py + 55;
    const visibleCount = Math.floor((panH - 65) / 36);
    craftScroll = Math.max(0, Math.min(craftScroll, recipes.length - visibleCount));

    for (let i = 0; i < visibleCount && i + craftScroll < recipes.length; i++) {
        const r = recipes[i + craftScroll];
        const ry = startY + i * 36;
        const can = canCraft(r);

        ctx.fillStyle = can ? 'rgba(40,60,40,0.5)' : 'rgba(40,20,20,0.5)';
        ctx.fillRect(px + 8, ry, panW - 16, 32);
        ctx.strokeStyle = can ? 'rgba(100,200,100,0.3)' : 'rgba(100,50,50,0.3)';
        ctx.strokeRect(px + 8, ry, panW - 16, 32);

        // Result icon
        drawItemIcon(ctx, r.result, px + 12, ry + 2, 28);

        // Name
        ctx.fillStyle = can ? '#ddd' : '#666'; ctx.font = '11px Inter'; ctx.textAlign = 'left';
        ctx.fillText(r.name, px + 46, ry + 14);

        // Ingredients
        ctx.fillStyle = '#888'; ctx.font = '9px Inter';
        const ingText = r.ingredients.map(([id, amt]) => `${getItemName(id)}×${amt}`).join(', ');
        ctx.fillText(ingText, px + 46, ry + 26);

        // Station tag
        if (r.station) {
            ctx.fillStyle = '#aa8833'; ctx.font = '8px Inter'; ctx.textAlign = 'right';
            ctx.fillText(`[${r.station}]`, px + panW - 12, ry + 14);
        }
    }

    // Scroll indicators
    if (craftScroll > 0) { ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText('▲ scroll up', W / 2, startY - 4); }
    if (craftScroll + visibleCount < recipes.length) { ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText('▼ scroll down', W / 2, py + panH - 8); }
}

function handleCraftClick(mouseX, mouseY, W, H) {
    if (!showCrafting) return false;
    const recipes = getAvailableRecipes();
    const panW = 340, panH = 400;
    const px = (W - panW) / 2, py = (H - panH) / 2;
    const startY = py + 55;
    const visibleCount = Math.floor((panH - 65) / 36);

    for (let i = 0; i < visibleCount && i + craftScroll < recipes.length; i++) {
        const ry = startY + i * 36;
        if (mouseX >= px + 8 && mouseX <= px + panW - 8 && mouseY >= ry && mouseY <= ry + 32) {
            doCraft(recipes[i + craftScroll]);
            return true;
        }
    }
    return false;
}

function handleInventoryClick(mouseX, mouseY, W, H) {
    if (!showInventory) return false;
    const panW = INV_COLS * (SLOT_SIZE + 4) + 20;
    const panH = INV_ROWS * (SLOT_SIZE + 4) + 80;
    const px = (W - panW) / 2, py = (H - panH) / 2;

    // Check backpack slots
    for (let row = 0; row < INV_ROWS; row++) {
        for (let col = 0; col < INV_COLS; col++) {
            const idx = 10 + row * INV_COLS + col;
            if (idx >= 40) continue;
            const sx = px + 10 + col * (SLOT_SIZE + 4);
            const sy = py + 84 + row * (SLOT_SIZE + 4);
            if (mouseX >= sx && mouseX <= sx + SLOT_SIZE && mouseY >= sy && mouseY <= sy + SLOT_SIZE) {
                if (dragItem) {
                    // Place dragged item
                    const existing = player.inventory[idx];
                    if (existing && existing.id === dragItem.id) {
                        existing.count += dragItem.count;
                    } else {
                        player.inventory[dragItem.fromSlot] = existing;
                        player.inventory[idx] = { id: dragItem.id, count: dragItem.count };
                    }
                    dragItem = null;
                } else if (player.inventory[idx]) {
                    dragItem = { ...player.inventory[idx], fromSlot: idx };
                    player.inventory[idx] = null;
                }
                return true;
            }
        }
    }

    // Check armor slots
    // Head
    if (mouseX >= px + 60 && mouseX <= px + 60 + SLOT_SIZE && mouseY >= py + 34 && mouseY <= py + 34 + SLOT_SIZE) {
        if (dragItem && ITEMS[dragItem.id] && ITEMS[dragItem.id].slot === 'head') {
            const old = player.armor.head;
            player.armor.head = { id: dragItem.id, count: 1 };
            if (old) player.inventory[dragItem.fromSlot] = old;
            dragItem = null;
        } else if (player.armor.head && !dragItem) {
            addItem(player.armor.head.id, 1);
            player.armor.head = null;
        }
        return true;
    }
    // Chest
    if (mouseX >= px + 110 && mouseX <= px + 110 + SLOT_SIZE && mouseY >= py + 34 && mouseY <= py + 34 + SLOT_SIZE) {
        if (dragItem && ITEMS[dragItem.id] && ITEMS[dragItem.id].slot === 'chest') {
            const old = player.armor.chest;
            player.armor.chest = { id: dragItem.id, count: 1 };
            if (old) player.inventory[dragItem.fromSlot] = old;
            dragItem = null;
        } else if (player.armor.chest && !dragItem) {
            addItem(player.armor.chest.id, 1);
            player.armor.chest = null;
        }
        return true;
    }

    return false;
}

// ===== PAUSE SCREEN (Phase 4 Enhanced) =====
let showSettings = false;
let showSaveSlots = false;

function drawPauseScreen(ctx, W, H) {
    if (!showPause) return;
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#CC1122'; ctx.font = '48px Creepster'; ctx.textAlign = 'center';
    ctx.fillText('PAUSED', W / 2, H / 2 - 100);

    // Menu buttons
    const btnW = 180, btnH = 36;
    const btns = [
        { label: '⚙ Settings', key: 'settings' },
        { label: '💾 Save Slots', key: 'saveslots' },
        { label: '📥 Export Map', key: 'export' },
        { label: '📤 Import Map', key: 'import' },
    ];
    for (let i = 0; i < btns.length; i++) {
        const bx = W / 2 - btnW / 2, by = H / 2 - 50 + i * 44;
        const hover = _rawMouseX >= bx && _rawMouseX <= bx + btnW && _rawMouseY >= by && _rawMouseY <= by + btnH;
        ctx.fillStyle = hover ? 'rgba(200,50,50,0.5)' : 'rgba(40,20,40,0.7)';
        ctx.fillRect(bx, by, btnW, btnH);
        ctx.strokeStyle = '#CC1122'; ctx.lineWidth = 1; ctx.strokeRect(bx, by, btnW, btnH);
        ctx.fillStyle = hover ? '#FFF' : '#CCC'; ctx.font = '13px Inter';
        ctx.fillText(btns[i].label, W / 2, by + 24);
    }

    ctx.fillStyle = '#888'; ctx.font = '12px Inter';
    ctx.fillText('Press ESC to resume', W / 2, H / 2 + 140);

    if (showSettings) drawSettingsScreen(ctx, W, H);
    if (showSaveSlots) drawSaveSlotsScreen(ctx, W, H);
}

// ===== PHASE 4: SETTINGS SCREEN =====
function drawSettingsScreen(ctx, W, H) {
    const panW = 400, panH = 340;
    const px = (W - panW) / 2, py = (H - panH) / 2;
    ctx.fillStyle = 'rgba(10,5,20,0.95)'; ctx.fillRect(px, py, panW, panH);
    ctx.strokeStyle = '#8844CC'; ctx.lineWidth = 2; ctx.strokeRect(px, py, panW, panH);
    ctx.fillStyle = '#8844CC'; ctx.font = 'bold 18px Creepster'; ctx.textAlign = 'center';
    ctx.fillText('⚙ SETTINGS', W / 2, py + 30);

    ctx.font = '12px Inter'; ctx.textAlign = 'left';
    const settings = [
        { label: 'Render Quality', value: gameSettings.renderQuality },
        { label: 'Particle Density', value: Math.round(gameSettings.particleDensity * 100) + '%' },
        { label: 'Lighting', value: gameSettings.lightingQuality },
        { label: 'Screen Shake', value: gameSettings.screenShakeEnabled ? 'ON' : 'OFF' },
        { label: 'Bloom', value: gameSettings.bloomEnabled ? 'ON' : 'OFF' },
        { label: 'Colorblind Mode', value: gameSettings.colorblindMode },
        { label: 'Music Volume', value: Math.round(gameSettings.musicVolume * 100) + '%' },
        { label: 'SFX Volume', value: Math.round(gameSettings.sfxVolume * 100) + '%' },
    ];
    for (let i = 0; i < settings.length; i++) {
        const sy = py + 55 + i * 34;
        ctx.fillStyle = '#AAA'; ctx.fillText(settings[i].label, px + 20, sy);
        ctx.fillStyle = '#FFD700'; ctx.textAlign = 'right';
        ctx.fillText(settings[i].value, px + panW - 20, sy);
        ctx.textAlign = 'left';
        ctx.strokeStyle = 'rgba(100,50,150,0.3)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(px + 15, sy + 12); ctx.lineTo(px + panW - 15, sy + 12); ctx.stroke();
    }
    ctx.fillStyle = '#666'; ctx.font = '10px Inter'; ctx.textAlign = 'center';
    ctx.fillText('Click settings to toggle | ESC to close', W / 2, py + panH - 12);
}

// ===== PHASE 4: SAVE SLOTS SCREEN =====
function drawSaveSlotsScreen(ctx, W, H) {
    const panW = 420, panH = 280;
    const px = (W - panW) / 2, py = (H - panH) / 2;
    ctx.fillStyle = 'rgba(10,5,20,0.95)'; ctx.fillRect(px, py, panW, panH);
    ctx.strokeStyle = '#44AA88'; ctx.lineWidth = 2; ctx.strokeRect(px, py, panW, panH);
    ctx.fillStyle = '#44AA88'; ctx.font = 'bold 18px Creepster'; ctx.textAlign = 'center';
    ctx.fillText('💾 SAVE SLOTS', W / 2, py + 30);

    for (let i = 0; i < 3; i++) {
        const sy = py + 50 + i * 70;
        const meta = typeof getSlotMeta === 'function' ? getSlotMeta(i) : null;
        ctx.fillStyle = 'rgba(30,20,40,0.8)';
        ctx.fillRect(px + 15, sy, panW - 30, 58);
        ctx.strokeStyle = '#44AA88'; ctx.lineWidth = 1;
        ctx.strokeRect(px + 15, sy, panW - 30, 58);

        ctx.textAlign = 'left';
        if (meta) {
            ctx.fillStyle = '#FFD700'; ctx.font = 'bold 12px Inter';
            ctx.fillText(`Slot ${i + 1}: Lv.${meta.level} | Depth ${meta.depth}m`, px + 25, sy + 20);
            ctx.fillStyle = '#888'; ctx.font = '10px Inter';
            const dateStr = new Date(meta.date).toLocaleDateString();
            ctx.fillText(`${meta.worldSize} | ${meta.hardcore ? '☠ HC' : 'Normal'} | ${dateStr}`, px + 25, sy + 38);
            if (meta.ngPlus > 0) { ctx.fillStyle = '#FF6600'; ctx.fillText(`NG+${meta.ngPlus}`, px + 340, sy + 20); }
        } else {
            ctx.fillStyle = '#555'; ctx.font = '12px Inter';
            ctx.fillText(`Slot ${i + 1}: Empty`, px + 25, sy + 30);
        }
        // Save/Load/Delete
        const btnLabels = ['Save', 'Load', 'Del'];
        const btnColors = ['#44AA88', '#4488CC', '#AA4444'];
        for (let b = 0; b < 3; b++) {
            const bx = px + panW - 28 - (2 - b) * 52, by2 = sy + 42;
            ctx.fillStyle = 'rgba(60,40,60,0.8)';
            ctx.fillRect(bx, by2, 48, 14);
            ctx.fillStyle = '#AAA'; ctx.font = '9px Inter'; ctx.textAlign = 'center';
            ctx.fillText(btnLabels[b], bx + 24, by2 + 11);
        }
    }
    ctx.fillStyle = '#666'; ctx.font = '10px Inter'; ctx.textAlign = 'center';
    ctx.fillText('ESC to close', W / 2, py + panH - 12);
}

// ===== DEATH SCREEN =====
function drawDeathScreen(ctx, W, H) {
    ctx.fillStyle = 'rgba(20,0,0,0.85)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#CC1122'; ctx.font = '56px Creepster'; ctx.textAlign = 'center';
    ctx.fillText('YOU DIED', W / 2, H / 2 - 30);
    ctx.fillStyle = '#888'; ctx.font = '16px Inter';
    ctx.fillText(`Depth reached: ${Math.max(0, Math.floor(player.y / TILE) - SURFACE_Y)}m`, W / 2, H / 2 + 10);
    ctx.fillText(`Level: ${player.level}`, W / 2, H / 2 + 34);
    ctx.fillStyle = '#CC1122'; ctx.font = '18px Inter';
    ctx.fillText('Click to respawn', W / 2, H / 2 + 70);
}

// ===== MINIMAP =====
function drawMinimap(ctx, W, H) {
    const mw = 120, mh = 80;
    const mx = W - mw - 12, my = H - mh - 12;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(mx, my, mw, mh);
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1;
    ctx.strokeRect(mx, my, mw, mh);

    const scaleX = mw / WORLD_W, scaleY = mh / WORLD_H;
    // Draw terrain overview (sampled)
    for (let x = 0; x < WORLD_W; x += 4) {
        for (let y = 0; y < WORLD_H; y += 4) {
            const b = getBlock(x, y);
            if (b === T.AIR) continue;
            const td2 = TILE_DATA[b];
            if (td2) {
                ctx.fillStyle = td2.color;
                ctx.globalAlpha = 0.6;
                ctx.fillRect(mx + x * scaleX, my + y * scaleY, Math.max(1, 4 * scaleX), Math.max(1, 4 * scaleY));
            }
        }
    }
    ctx.globalAlpha = 1;

    // Player dot
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(mx + (player.x / TILE) * scaleX - 1, my + (player.y / TILE) * scaleY - 1, 3, 3);
}

let _rawMouseX = 0, _rawMouseY = 0;

// ===== PHASE 2: NPC SHOP SCREEN =====
function drawNPCShopScreen(ctx, W, H) {
    if (!showNPCShop) return;
    const def = NPC_TYPES[showNPCShop.type];
    if (!def || !def.shop || def.shop.length === 0) return;
    const panW = 300, panH = 40 + def.shop.length * 40 + 20;
    const px = (W - panW) / 2, py = (H - panH) / 2;
    ctx.fillStyle = 'rgba(10,5,15,0.92)';
    ctx.fillRect(px, py, panW, panH);
    ctx.strokeStyle = '#88AA44'; ctx.lineWidth = 2;
    ctx.strokeRect(px, py, panW, panH);
    ctx.fillStyle = '#88AA44'; ctx.font = '18px Creepster'; ctx.textAlign = 'center';
    ctx.fillText(showNPCShop.name + "'s Shop", W / 2, py + 24);
    for (let i = 0; i < def.shop.length; i++) {
        const s = def.shop[i];
        const iy = py + 40 + i * 40;
        const have = countItem(s.currency);
        const canBuy = have >= s.price;
        ctx.fillStyle = canBuy ? 'rgba(40,60,40,0.5)' : 'rgba(40,20,20,0.5)';
        ctx.fillRect(px + 8, iy, panW - 16, 36);
        ctx.strokeStyle = canBuy ? 'rgba(100,200,100,0.3)' : 'rgba(100,50,50,0.3)';
        ctx.strokeRect(px + 8, iy, panW - 16, 36);
        drawItemIcon(ctx, s.id, px + 12, iy + 4, 28);
        ctx.fillStyle = canBuy ? '#ddd' : '#666'; ctx.font = '11px Inter'; ctx.textAlign = 'left';
        ctx.fillText(getItemName(s.id) + (s.amt && s.amt > 1 ? ' x' + s.amt : ''), px + 46, iy + 16);
        ctx.fillStyle = '#aaa'; ctx.font = '9px Inter';
        ctx.fillText(`Cost: ${s.price} ${getItemName(s.currency)}`, px + 46, iy + 28);
    }
    ctx.fillStyle = '#888'; ctx.font = '10px Inter'; ctx.textAlign = 'center';
    ctx.fillText('[F] Close  |  Click to buy', W / 2, py + panH - 6);
}

// Handle NPC shop clicks
canvas.addEventListener('click', e => {
    if (!showNPCShop) return;
    const def = NPC_TYPES[showNPCShop.type];
    if (!def || !def.shop) return;
    const panW = 300, panH = 40 + def.shop.length * 40 + 20;
    const px = (W - panW) / 2, py = (H - panH) / 2;
    for (let i = 0; i < def.shop.length; i++) {
        const iy = py + 40 + i * 40;
        if (e.offsetX >= px + 8 && e.offsetX <= px + panW - 8 && e.offsetY >= iy && e.offsetY <= iy + 36) {
            buyFromNPC(def.shop[i]);
            return;
        }
    }
});

// ===== PHASE 2: NPC DIALOGUE BOX =====
function drawNPCDialogueBox(ctx, W, H) {
    if (!showNPCDialogue) return;
    const panW = 400, panH = 60;
    const px = (W - panW) / 2, py = H - 100;
    ctx.fillStyle = 'rgba(10,5,15,0.85)';
    ctx.fillRect(px, py, panW, panH);
    ctx.strokeStyle = showNPCDialogue.npc ? NPC_TYPES[showNPCDialogue.npc.type]?.color || '#888' : '#888';
    ctx.lineWidth = 2; ctx.strokeRect(px, py, panW, panH);
    ctx.fillStyle = '#ddd'; ctx.font = '12px Inter'; ctx.textAlign = 'left';
    const name = showNPCDialogue.npc ? showNPCDialogue.npc.name : 'NPC';
    ctx.fillStyle = '#88AA44'; ctx.font = 'bold 11px Inter';
    ctx.fillText(name + ':', px + 12, py + 18);
    ctx.fillStyle = '#ccc'; ctx.font = '11px Inter';
    ctx.fillText(showNPCDialogue.text, px + 12, py + 38);
}

// ===== PHASE 7: QUEST TRACKER PANEL =====
let showQuestPanel = false;
let showAchievementPanel = false;

function drawQuestTracker(ctx, W, H) {
    if (!activeQuests || activeQuests.length === 0) return;
    // Mini quest tracker (top-left under HUD)
    const qx = 10, qy = HOTBAR_Y + SLOT_SIZE + 95;
    ctx.fillStyle = 'rgba(8,4,16,0.55)';
    roundedRect(ctx, qx, qy, 200, 16 + activeQuests.length * 20, 6); ctx.fill();
    ctx.strokeStyle = 'rgba(180,160,60,0.25)'; ctx.lineWidth = 1;
    roundedRect(ctx, qx, qy, 200, 16 + activeQuests.length * 20, 6); ctx.stroke();
    ctx.fillStyle = '#FFD700'; ctx.font = 'bold 10px Inter'; ctx.textAlign = 'left';
    ctx.fillText('📜 QUESTS', qx + 8, qy + 12);
    for (let i = 0; i < activeQuests.length; i++) {
        const q = activeQuests[i];
        const y2 = qy + 16 + i * 20;
        ctx.fillStyle = q.completed ? '#44FF44' : '#ccc'; ctx.font = '9px Inter';
        const prog = q.count ? `${Math.min(q.progress, q.count)}/${q.count}` : (q.completed ? '✓' : '...');
        ctx.fillText(`${q.completed ? '✅' : '⬜'} ${q.description}`, qx + 8, y2 + 8);
        ctx.fillStyle = '#aaa';
        ctx.fillText(prog, qx + 180, y2 + 8);
    }
}

// ===== PHASE 7: QUEST BOARD SCREEN =====
function drawQuestBoardScreen(ctx, W, H) {
    if (!showQuestPanel) return;
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 0, W, H);
    const pw = 420, ph = 350;
    const px = (W - pw) / 2, py = (H - ph) / 2;
    ctx.fillStyle = 'rgba(20,10,30,0.95)';
    roundedRect(ctx, px, py, pw, ph, 10); ctx.fill();
    ctx.strokeStyle = 'rgba(180,160,60,0.4)'; ctx.lineWidth = 2;
    roundedRect(ctx, px, py, pw, ph, 10); ctx.stroke();
    ctx.fillStyle = '#FFD700'; ctx.font = 'bold 16px Creepster'; ctx.textAlign = 'center';
    ctx.fillText('📜 QUEST BOARD', px + pw / 2, py + 28);
    ctx.fillStyle = '#aaa'; ctx.font = '10px Inter';
    ctx.fillText(`Completed: ${completedQuests}`, px + pw / 2, py + 44);
    // Active quests
    for (let i = 0; i < activeQuests.length; i++) {
        const q = activeQuests[i], y2 = py + 60 + i * 50;
        ctx.fillStyle = q.completed ? 'rgba(40,80,40,0.4)' : 'rgba(30,20,40,0.5)';
        roundedRect(ctx, px + 10, y2, pw - 20, 44, 6); ctx.fill();
        ctx.fillStyle = q.completed ? '#44FF44' : '#FFD700'; ctx.font = 'bold 11px Inter'; ctx.textAlign = 'left';
        ctx.fillText(q.description, px + 18, y2 + 18);
        ctx.fillStyle = '#aaa'; ctx.font = '10px Inter';
        const prog = q.count ? `Progress: ${Math.min(q.progress, q.count)}/${q.count}` : (q.completed ? 'COMPLETE!' : 'In Progress');
        ctx.fillText(prog, px + 18, y2 + 34);
        ctx.fillStyle = '#FFD700'; ctx.textAlign = 'right';
        ctx.fillText(`Reward: ${q.rewardAmt}x Token`, px + pw - 18, y2 + 18);
    }
    // New quest button
    if (activeQuests.length < 3) {
        const btnY = py + ph - 45;
        ctx.fillStyle = 'rgba(100,80,20,0.5)';
        roundedRect(ctx, px + pw / 2 - 60, btnY, 120, 30, 6); ctx.fill();
        ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 1;
        roundedRect(ctx, px + pw / 2 - 60, btnY, 120, 30, 6); ctx.stroke();
        ctx.fillStyle = '#FFD700'; ctx.font = 'bold 12px Inter'; ctx.textAlign = 'center';
        ctx.fillText('+ New Quest', px + pw / 2, btnY + 20);
    }
    // Close hint
    ctx.fillStyle = '#666'; ctx.font = '10px Inter'; ctx.textAlign = 'center';
    ctx.fillText('[Q] Close', px + pw / 2, py + ph - 10);
}

// ===== PHASE 7: ACHIEVEMENT GALLERY =====
function drawAchievementScreen(ctx, W, H) {
    if (!showAchievementPanel) return;
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 0, W, H);
    const pw = 480, ph = 400;
    const px = (W - pw) / 2, py = (H - ph) / 2;
    ctx.fillStyle = 'rgba(20,10,30,0.95)';
    roundedRect(ctx, px, py, pw, ph, 10); ctx.fill();
    ctx.strokeStyle = 'rgba(200,150,50,0.4)'; ctx.lineWidth = 2;
    roundedRect(ctx, px, py, pw, ph, 10); ctx.stroke();
    ctx.fillStyle = '#FFD700'; ctx.font = 'bold 16px Creepster'; ctx.textAlign = 'center';
    ctx.fillText('🏆 ACHIEVEMENTS', px + pw / 2, py + 28);
    const total = typeof ACHIEVEMENTS !== 'undefined' ? ACHIEVEMENTS.length : 0;
    const unlocked = typeof unlockedAchievements !== 'undefined' ? unlockedAchievements.size : 0;
    ctx.fillStyle = '#aaa'; ctx.font = '11px Inter';
    ctx.fillText(`${unlocked}/${total} Unlocked`, px + pw / 2, py + 44);
    // Achievement grid
    if (typeof ACHIEVEMENTS !== 'undefined') {
        for (let i = 0; i < ACHIEVEMENTS.length; i++) {
            const a = ACHIEVEMENTS[i];
            const col = i % 3, row = Math.floor(i / 3);
            const ax = px + 15 + col * 155, ay = py + 58 + row * 55;
            const isUnlocked = unlockedAchievements.has(a.id);
            ctx.fillStyle = isUnlocked ? 'rgba(60,80,40,0.5)' : 'rgba(30,25,35,0.5)';
            roundedRect(ctx, ax, ay, 145, 48, 6); ctx.fill();
            ctx.strokeStyle = isUnlocked ? 'rgba(100,200,60,0.3)' : 'rgba(80,60,80,0.2)'; ctx.lineWidth = 1;
            roundedRect(ctx, ax, ay, 145, 48, 6); ctx.stroke();
            ctx.fillStyle = isUnlocked ? '#FFD700' : '#555'; ctx.font = '18px Inter'; ctx.textAlign = 'left';
            ctx.fillText(a.icon, ax + 8, ay + 28);
            ctx.fillStyle = isUnlocked ? '#ddd' : '#666'; ctx.font = 'bold 10px Inter';
            ctx.fillText(a.name, ax + 32, ay + 18);
            ctx.fillStyle = isUnlocked ? '#aaa' : '#444'; ctx.font = '9px Inter';
            ctx.fillText(a.desc, ax + 32, ay + 32);
        }
    }
    ctx.fillStyle = '#666'; ctx.font = '10px Inter'; ctx.textAlign = 'center';
    ctx.fillText('[G] Close', px + pw / 2, py + ph - 10);
}

// ===== PHASE 6: STATUS EFFECT ICONS ON HUD =====
function drawStatusEffectIcons(ctx, W, H) {
    if (!player.effects || player.effects.length === 0) return;
    let sx = HOTBAR_X + 230, sy = HOTBAR_Y + SLOT_SIZE + 10;
    for (const eff of player.effects) {
        const def = typeof STATUS_EFFECTS !== 'undefined' ? STATUS_EFFECTS[eff.type] : null;
        if (!def) continue;
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        roundedRect(ctx, sx, sy, 22, 22, 4); ctx.fill();
        ctx.strokeStyle = def.color; ctx.lineWidth = 1;
        roundedRect(ctx, sx, sy, 22, 22, 4); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = '13px Inter'; ctx.textAlign = 'center';
        ctx.fillText(def.icon, sx + 11, sy + 16);
        // Timer
        ctx.fillStyle = def.color; ctx.font = '7px Inter';
        ctx.fillText(Math.ceil(eff.duration / 60) + 's', sx + 11, sy + 22);
        sx += 26;
    }
}

// ===== PHASE 6+7: INPUT HANDLING =====
canvas.addEventListener('keydown', function (e) {
    // 'R' - Fishing cast/reel
    if (e.code === 'KeyR' && gameState === 'playing' && !showInventory && !showCrafting && !showPause) {
        if (typeof fishingState !== 'undefined' && fishingState.active && fishingState.biting) {
            if (typeof reelFish === 'function') reelFish();
            if (typeof playSFX === 'function') playSFX('fish');
        } else if (typeof startFishing === 'function') {
            startFishing();
        }
    }
    // 'P' - Use pet/mount from held item
    if (e.code === 'KeyP' && gameState === 'playing' && !showInventory && !showCrafting) {
        const held = getHeldItem();
        if (held && ITEMS[held.id]) {
            if (ITEMS[held.id].type === 'pet' && typeof summonPet === 'function') summonPet(held.id);
            if (ITEMS[held.id].type === 'mount' && typeof toggleMount === 'function') toggleMount(held.id);
        }
    }
    // 'Q' - Toggle quest panel
    if (e.code === 'KeyQ' && gameState === 'playing' && !showInventory && !showCrafting) {
        showQuestPanel = !showQuestPanel;
        showAchievementPanel = false;
    }
    // 'G' - Toggle achievement gallery
    if (e.code === 'KeyG' && gameState === 'playing' && !showInventory && !showCrafting) {
        showAchievementPanel = !showAchievementPanel;
        showQuestPanel = false;
    }
    // 'U' - Use held potion
    if (e.code === 'KeyU' && gameState === 'playing') {
        const held = getHeldItem();
        if (held && ITEMS[held.id] && ITEMS[held.id].type === 'potion' && ITEMS[held.id].effect) {
            if (typeof applyStatusEffect === 'function') {
                applyStatusEffect(player, ITEMS[held.id].effect, ITEMS[held.id].duration || 1800);
                held.count--;
                if (held.count <= 0) player.inventory[player.hotbar] = null;
                if (typeof playSFX === 'function') playSFX('pickup');
            }
        }
        // Food
        if (held && ITEMS[held.id] && ITEMS[held.id].type === 'food') {
            player.hp = Math.min(player.maxHp, player.hp + (ITEMS[held.id].heal || 20));
            if (ITEMS[held.id].effect && typeof applyStatusEffect === 'function') applyStatusEffect(player, ITEMS[held.id].effect, ITEMS[held.id].duration || 1800);
            held.count--;
            if (held.count <= 0) player.inventory[player.hotbar] = null;
        }
    }
});

// Quest board click handler
canvas.addEventListener('click', function (e) {
    if (!showQuestPanel) return;
    const pw = 420, ph = 350;
    const px = (W - pw) / 2, py = (H - ph) / 2;
    const btnY = py + ph - 45;
    if (e.offsetX >= px + pw / 2 - 60 && e.offsetX <= px + pw / 2 + 60 && e.offsetY >= btnY && e.offsetY <= btnY + 30) {
        if (activeQuests.length < 3 && typeof generateQuest === 'function') {
            activeQuests.push(generateQuest());
            if (typeof playSFX === 'function') playSFX('quest');
        }
    }
});

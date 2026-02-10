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
}

// ===== DRAW HUD =====
function drawHUD(ctx, W, H, dayTime) {
    // Hotbar background
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.strokeStyle = 'rgba(204,17,34,0.3)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 10; i++) {
        const x = HOTBAR_X + i * (SLOT_SIZE + 4), y = HOTBAR_Y;
        ctx.fillRect(x, y, SLOT_SIZE, SLOT_SIZE);
        ctx.strokeStyle = i === player.hotbar ? '#CC1122' : 'rgba(255,255,255,0.1)';
        ctx.lineWidth = i === player.hotbar ? 2 : 1;
        ctx.strokeRect(x, y, SLOT_SIZE, SLOT_SIZE);
        // Item
        const slot = player.inventory[i];
        if (slot) {
            drawItemIcon(ctx, slot.id, x + 4, y + 4, SLOT_SIZE - 8);
            if (slot.count > 1) {
                ctx.fillStyle = '#fff'; ctx.font = '10px Inter, sans-serif'; ctx.textAlign = 'right';
                ctx.fillText(slot.count, x + SLOT_SIZE - 4, y + SLOT_SIZE - 4);
            }
        }
    }

    // Health bar
    const hbX = HOTBAR_X, hbY = HOTBAR_Y + SLOT_SIZE + 8;
    ctx.fillStyle = '#222'; ctx.fillRect(hbX, hbY, 200, 14);
    ctx.fillStyle = '#CC1122'; ctx.fillRect(hbX, hbY, 200 * (player.hp / player.maxHp), 14);
    ctx.strokeStyle = 'rgba(204,17,34,0.4)'; ctx.lineWidth = 1; ctx.strokeRect(hbX, hbY, 200, 14);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 10px Inter'; ctx.textAlign = 'center';
    ctx.fillText(`♥ ${Math.ceil(player.hp)} / ${player.maxHp}`, hbX + 100, hbY + 11);

    // Mana bar
    ctx.fillStyle = '#222'; ctx.fillRect(hbX, hbY + 18, 200, 10);
    ctx.fillStyle = '#2244CC'; ctx.fillRect(hbX, hbY + 18, 200 * (player.mana / player.maxMana), 10);
    ctx.strokeStyle = 'rgba(34,68,204,0.4)'; ctx.strokeRect(hbX, hbY + 18, 200, 10);
    ctx.fillStyle = '#aaf'; ctx.font = '9px Inter'; ctx.textAlign = 'center';
    ctx.fillText(`✦ ${Math.ceil(player.mana)} / ${player.maxMana}`, hbX + 100, hbY + 27);

    // Level & XP
    ctx.textAlign = 'left'; ctx.fillStyle = '#FFD700'; ctx.font = 'bold 11px Inter';
    ctx.fillText(`Lv.${player.level}  XP: ${player.xp}/${player.level * 50}`, hbX, hbY + 44);

    // Defense
    ctx.fillStyle = '#88aacc';
    ctx.fillText(`🛡 ${player.defense}`, hbX + 160, hbY + 44);

    // Depth meter
    const depthBlocks = Math.max(0, Math.floor(player.y / TILE) - SURFACE_Y);
    let biome = 'Haunted Forest';
    if (depthBlocks > ABYSS_Y - SURFACE_Y) biome = 'Hell Core';
    else if (depthBlocks > HIVE_Y - SURFACE_Y) biome = 'Abyssal Depths';
    else if (depthBlocks > FLESH_Y - SURFACE_Y) biome = 'Living Hive';
    else if (depthBlocks > FROZEN_Y - SURFACE_Y) biome = 'Flesh Tunnels';
    else if (depthBlocks > MUSH_Y - SURFACE_Y) biome = 'Frozen Crypt';
    else if (depthBlocks > CAVE_Y - SURFACE_Y) biome = 'Mushroom Caverns';
    else if (depthBlocks > 20) biome = 'Bone Caverns';

    ctx.textAlign = 'right'; ctx.fillStyle = '#aaa'; ctx.font = '11px Inter';
    ctx.fillText(`Depth: ${depthBlocks}m`, W - 16, 20);
    ctx.fillStyle = '#CC1122'; ctx.font = '10px Creepster, cursive';
    ctx.fillText(biome, W - 16, 36);

    // Day/night indicator
    const isNight = dayTime > 0.5;
    ctx.fillStyle = isNight ? '#334' : '#886';
    ctx.fillText(isNight ? '🌙 Night' : '☀ Day', W - 16, 52);

    // Phase 2: Weather indicator
    if (weather.type !== 'clear') {
        const wIcons = { rain: '🌧', storm: '⛈', fog: '🌫', blood_rain: '🩸', ash: '🌋' };
        ctx.fillStyle = '#CCAA88'; ctx.font = '10px Inter';
        ctx.fillText(`${wIcons[weather.type] || ''} ${weather.type.replace('_', ' ')}`, W - 16, 66);
    }
    // Phase 2: Active event
    if (worldEvent.type) {
        ctx.fillStyle = '#FF4444'; ctx.font = 'bold 10px Inter';
        ctx.fillText(`⚠ ${worldEvent.type.replace(/_/g, ' ').toUpperCase()}`, W - 16, 80);
    }
    // Phase 2: NPC interaction hint
    let nearNPC = false;
    for (const n of npcs) {
        const d = Math.sqrt((n.x - player.x) ** 2 + (n.y - player.y) ** 2);
        if (d < 50 && n.rescued) { nearNPC = n; break; }
    }
    if (nearNPC) {
        ctx.fillStyle = '#44FF44'; ctx.font = '11px Inter'; ctx.textAlign = 'center';
        ctx.fillText(`[F] Talk to ${nearNPC.name}  [T] Toggle Companion`, W / 2, H - 30);
    }

    // Effects
    let ey = 60;
    for (const eff of player.effects) {
        ctx.fillStyle = '#44CC44'; ctx.font = '10px Inter';
        ctx.fillText(`⚡ ${eff.type} (${Math.ceil(eff.duration / 60)}s)`, W - 16, ey);
        ey += 14;
    }

    // Boss health bar
    if (boss && !boss.dead) {
        const bw = 400, bx = (W - bw) / 2, by = 16;
        ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(bx - 2, by - 2, bw + 4, 24);
        ctx.fillStyle = '#441111'; ctx.fillRect(bx, by, bw, 20);
        ctx.fillStyle = '#CC2244'; ctx.fillRect(bx, by, bw * (boss.hp / boss.maxHp), 20);
        ctx.strokeStyle = '#CC2244'; ctx.lineWidth = 1; ctx.strokeRect(bx, by, bw, 20);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 12px Creepster'; ctx.textAlign = 'center';
        ctx.fillText(`${boss.name}  —  Phase ${boss.phase}`, W / 2, by + 15);
    }

    // Held item name tooltip
    const held = getHeldItem();
    if (held) {
        ctx.textAlign = 'center'; ctx.fillStyle = getItemColor(held.id); ctx.font = '11px Inter';
        ctx.fillText(getItemName(held.id), HOTBAR_X + 5 * (SLOT_SIZE + 4) + SLOT_SIZE / 2, HOTBAR_Y + SLOT_SIZE + 58);
    }

    // Mining progress bar
    if (player.miningX >= 0) {
        const b = getBlock(player.miningX, player.miningY);
        const td = TILE_DATA[b];
        if (td && td.hardness > 0) {
            const pct = player.miningProgress / td.hardness;
            const mx = W / 2 - 30, my = H / 2 + 30;
            ctx.fillStyle = '#222'; ctx.fillRect(mx, my, 60, 6);
            ctx.fillStyle = '#FFaa33'; ctx.fillRect(mx, my, 60 * Math.min(1, pct), 6);
        }
    }
}

function drawItemIcon(ctx, id, x, y, size) {
    ctx.fillStyle = getItemColor(id);
    if (id < 100) {
        // Block - draw as square
        ctx.fillRect(x + 2, y + 2, size - 4, size - 4);
        // Inner highlight
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(x + 2, y + 2, size - 4, (size - 4) / 3);
    } else {
        const it = ITEMS[id];
        if (it && (it.type === 'weapon' || it.toolType === 'pick')) {
            // Tool/weapon shape
            ctx.fillRect(x + size / 2 - 2, y + 2, 4, size - 4);
            ctx.fillRect(x + 4, y + 4, size - 8, 6);
        } else if (it && it.type === 'armor') {
            ctx.fillRect(x + 4, y + 4, size - 8, size - 8);
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.fillRect(x + 6, y + 6, size - 12, 4);
        } else if (it && it.type === 'potion') {
            ctx.beginPath();
            ctx.arc(x + size / 2, y + size / 2 + 2, size / 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillRect(x + size / 2 - 2, y + 4, 4, size / 3);
        } else {
            // Generic material
            ctx.beginPath();
            ctx.arc(x + size / 2, y + size / 2, size / 3, 0, Math.PI * 2);
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

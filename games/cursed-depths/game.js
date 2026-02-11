/* ============================================================
   CURSED DEPTHS — Main Game Loop, Rendering & Init
   ============================================================ */

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
let W, H;

// Camera
const cam = { x: 0, y: 0 };

// Input
const keys = {};
let mouseDown = false, rightMouseDown = false;
let mouseX = 0, mouseY = 0;
let gameState = 'menu'; // menu, controls, playing, dead
let dayTime = 0.0; // 0-1 cycle: 0.0 = 6:00 AM, 0.25 = 12:00 PM, 0.5 = 6:00 PM, 0.75 = 12:00 AM
let heights = [];
let bossSpawned = { eye: false, bone: false, demon: false, hive: false, frost: false, corruption: false };
let gameFrame = 0;

// Phase 3: Split-screen
let splitScreen = false;
let player2 = null;
const p2Keys = {};
let showStartMenu = true;

// ===== PHASE 4: VISUAL POLISH STATE =====
const screenShake = { intensity: 0, decay: 0.9, offsetX: 0, offsetY: 0 };
function triggerShake(intensity) { screenShake.intensity = Math.max(screenShake.intensity, intensity); }
let cinematicMode = { active: false, timer: 0, bossName: '', zoom: 1, targetZoom: 1 };
let postProcess = { chromatic: 0, bloom: 0.15, desaturation: 0 };

// ===== AMBIENT PARTICLE SYSTEM =====
const _ambientParticles = [];
const MAX_AMBIENT = 60;
function updateAmbientParticles() {
    const depth = Math.floor(player.y / TILE);
    const isNight = dayTime > 0.5;
    const isUnderground = depth > SURFACE_Y + 10;
    // Spawn new particles
    if (_ambientParticles.length < MAX_AMBIENT && Math.random() < 0.15) {
        const px = player.x + (Math.random() - 0.5) * W;
        const py = player.y + (Math.random() - 0.5) * H;
        if (isUnderground) {
            // Dust motes
            _ambientParticles.push({
                x: px, y: py, vx: (Math.random() - 0.5) * 0.3, vy: Math.random() * 0.2 - 0.05,
                size: 1 + Math.random() * 1.5, life: 200 + Math.floor(Math.random() * 200),
                maxLife: 400, color: 'rgba(160,140,120,', type: 'dust'
            });
        } else if (isNight) {
            // Fireflies
            _ambientParticles.push({
                x: px, y: py - 20 - Math.random() * 60, vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.3,
                size: 2 + Math.random(), life: 300 + Math.floor(Math.random() * 300),
                maxLife: 600, color: 'rgba(180,255,80,', type: 'firefly', phase: Math.random() * Math.PI * 2
            });
        } else {
            // Pollen / floating seeds
            _ambientParticles.push({
                x: px, y: py - 10 - Math.random() * 40, vx: 0.2 + Math.random() * 0.3, vy: Math.sin(Math.random() * 3) * 0.15,
                size: 1 + Math.random(), life: 250 + Math.floor(Math.random() * 250),
                maxLife: 500, color: 'rgba(220,220,180,', type: 'pollen'
            });
        }
    }
    // Update
    for (let i = _ambientParticles.length - 1; i >= 0; i--) {
        const p = _ambientParticles[i];
        p.x += p.vx; p.y += p.vy; p.life--;
        if (p.type === 'firefly') {
            p.vx += (Math.random() - 0.5) * 0.08;
            p.vy += (Math.random() - 0.5) * 0.08;
            p.vx *= 0.98; p.vy *= 0.98;
        } else if (p.type === 'pollen') {
            p.vy = Math.sin(gameFrame * 0.02 + p.phase) * 0.15;
        }
        if (p.life <= 0) _ambientParticles.splice(i, 1);
    }
}

function drawAmbientParticles(ctx, camX, camY) {
    for (const p of _ambientParticles) {
        const alpha = Math.min(1, p.life / 30) * Math.min(1, (p.maxLife - p.life) / 30);
        if (p.type === 'firefly') {
            const glow = Math.sin(gameFrame * 0.08 + (p.phase || 0)) * 0.5 + 0.5;
            ctx.fillStyle = `${p.color}${(alpha * glow * 0.8).toFixed(2)})`;
            ctx.shadowColor = '#AAFF44'; ctx.shadowBlur = 8;
            ctx.beginPath(); ctx.arc(p.x - camX, p.y - camY, p.size, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
        } else {
            ctx.fillStyle = `${p.color}${(alpha * 0.4).toFixed(2)})`;
            ctx.fillRect(p.x - camX, p.y - camY, p.size, p.size);
        }
    }
}


function resize() {
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W; canvas.height = H;
}
window.addEventListener('resize', resize);
resize();

// ===== INPUT HANDLERS =====
window.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (gameState !== 'playing') return;
    if (e.code === 'Escape') { showPause = !showPause; showInventory = false; showCrafting = false; }
    if (e.code === 'KeyE') toggleInventory();
    if (e.code === 'KeyC') toggleCrafting();
    if (e.code === 'KeyR') useItem();
    // Phase 3: Save/Load
    if (e.code === 'F5') { if (saveGame()) eventBannerText = 'GAME SAVED'; eventBannerTimer = 120; }
    if (e.code === 'F9') {
        if (loadGame()) {
            eventBannerText = 'GAME LOADED'; eventBannerTimer = 120;
            heights = []; // Heights aren't needed after load
        }
    }
    // Phase 3: Split-screen toggle
    if (e.code === 'F2') {
        splitScreen = !splitScreen;
        if (splitScreen && !player2) {
            player2 = { x: player.x + 30, y: player.y, w: 14, h: 28, vx: 0, vy: 0, hp: 100, maxHp: 100, onGround: false, dir: 1, hotbar: 0, inventory: new Array(40).fill(null), armor: { head: null, chest: null }, skin: 'skeleton' };
            player2.inventory[0] = { id: I_WOOD_PICK, count: 1 };
            player2.inventory[1] = { id: I_WOOD_SWORD, count: 1 };
        }
    }
    if (e.code === 'KeyF') {
        // NPC interaction
        if (showNPCShop) { showNPCShop = null; showNPCDialogue = null; }
        else {
            for (const n of npcs) {
                const d = Math.sqrt((n.x - player.x) ** 2 + (n.y - player.y) ** 2);
                if (d < 50) { interactNPC(n); break; }
            }
        }
    }
    if (e.code === 'KeyT') {
        // Toggle companion mode on nearest NPC
        for (const n of npcs) {
            const d = Math.sqrt((n.x - player.x) ** 2 + (n.y - player.y) ** 2);
            if (d < 50 && n.rescued) { n.companion = !n.companion; break; }
        }
    }
    // Hotbar 1-0
    if (e.code >= 'Digit1' && e.code <= 'Digit9') player.hotbar = parseInt(e.code[5]) - 1;
    if (e.code === 'Digit0') player.hotbar = 9;
    // Crafting scroll
    if (showCrafting && e.code === 'ArrowUp') craftScroll = Math.max(0, craftScroll - 1);
    if (showCrafting && e.code === 'ArrowDown') craftScroll++;
    e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

canvas.addEventListener('mousedown', e => {
    if (e.button === 0) mouseDown = true;
    if (e.button === 2) rightMouseDown = true;
    if (gameState === 'dead') { respawn(); return; }
    if (gameState !== 'playing') return;
    // UI clicks
    if (showCrafting && handleCraftClick(e.offsetX, e.offsetY, W, H)) return;
    if (showInventory && handleInventoryClick(e.offsetX, e.offsetY, W, H)) return;
    // Hotbar clicks
    for (let i = 0; i < 10; i++) {
        const sx = HOTBAR_X + i * (SLOT_SIZE + 4), sy = HOTBAR_Y;
        if (e.offsetX >= sx && e.offsetX <= sx + SLOT_SIZE && e.offsetY >= sy && e.offsetY <= sy + SLOT_SIZE) {
            player.hotbar = i; return;
        }
    }
});
canvas.addEventListener('mouseup', e => {
    if (e.button === 0) mouseDown = false;
    if (e.button === 2) rightMouseDown = false;
    dragItem = null; // Drop drag on release
});
canvas.addEventListener('mousemove', e => {
    mouseX = e.offsetX; mouseY = e.offsetY;
    _rawMouseX = e.offsetX; _rawMouseY = e.offsetY;
});
canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('wheel', e => {
    if (showCrafting) {
        craftScroll += e.deltaY > 0 ? 1 : -1;
        craftScroll = Math.max(0, craftScroll);
        e.preventDefault();
    } else {
        // Scroll hotbar
        player.hotbar += e.deltaY > 0 ? 1 : -1;
        if (player.hotbar < 0) player.hotbar = 9;
        if (player.hotbar > 9) player.hotbar = 0;
    }
});

// ===== RENDERING =====
function drawWorld() {
    const startX = Math.max(0, Math.floor(cam.x / TILE) - 1);
    const endX = Math.min(WORLD_W, Math.ceil((cam.x + W) / TILE) + 1);
    const startY = Math.max(0, Math.floor(cam.y / TILE) - 1);
    const endY = Math.min(WORLD_H, Math.ceil((cam.y + H) / TILE) + 1);

    for (let x = startX; x < endX; x++) {
        for (let y = startY; y < endY; y++) {
            const b = getBlock(x, y);
            if (b === T.AIR) continue;
            const td2 = TILE_DATA[b];
            if (!td2) continue;

            const sx = x * TILE - cam.x, sy = y * TILE - cam.y;
            const light = getLight(x, y);

            if (b === T.WATER) {
                // Phase 4: Animated flowing water
                const wave = Math.sin(gameFrame * 0.08 + x * 0.5) * 2;
                const waveAlpha = 0.3 + Math.sin(gameFrame * 0.04 + x * 0.3 + y * 0.2) * 0.1;
                ctx.fillStyle = `rgba(17,68,170,${waveAlpha * light})`;
                ctx.fillRect(sx, sy + wave * 0.5, TILE, TILE);
                // Foam/sparkle on top
                if (getBlock(x, y - 1) === T.AIR) {
                    ctx.fillStyle = `rgba(100,180,255,${0.15 * light})`;
                    ctx.fillRect(sx + Math.sin(gameFrame * 0.1 + x) * 3, sy, TILE * 0.6, 2);
                }
                continue;
            }
            if (b === T.LAVA) {
                const flicker = 0.8 + Math.sin(gameFrame * 0.1 + x * 0.5) * 0.2;
                ctx.fillStyle = `rgba(255,68,0,${0.7 * flicker})`;
                ctx.fillRect(sx, sy, TILE, TILE);
                // Phase 4: Lava glow particles
                if (Math.random() < 0.02) {
                    ctx.fillStyle = `rgba(255,200,50,${0.3 * flicker})`;
                    ctx.fillRect(sx + Math.random() * TILE, sy - 2, 2, 2);
                }
                continue;
            }
            if (b === T.BLOOD) {
                ctx.fillStyle = `rgba(102,0,17,${0.5 * light})`;
                ctx.fillRect(sx, sy, TILE, TILE);
                continue;
            }
            if (b === T.ACID) {
                const acidFlicker = 0.7 + Math.sin(gameFrame * 0.15 + x * 0.7) * 0.3;
                ctx.fillStyle = `rgba(68,255,0,${0.5 * acidFlicker})`;
                ctx.fillRect(sx, sy, TILE, TILE);
                continue;
            }
            if (b === T.CORRUPTION || b === T.CORRUPTED_STONE || b === T.CORRUPTED_DIRT) {
                const pulse = 0.6 + Math.sin(gameFrame * 0.05 + x * 0.3 + y * 0.3) * 0.2;
                ctx.globalAlpha = light * pulse;
                ctx.fillStyle = TILE_DATA[b].color;
                ctx.fillRect(sx, sy, TILE, TILE);
                ctx.globalAlpha = 1;
                continue;
            }
            if (b === T.TORCH) {
                // Torch
                ctx.fillStyle = '#8B6914';
                ctx.fillRect(sx + 6, sy + 4, 4, 12);
                const flicker2 = 0.7 + Math.sin(gameFrame * 0.15 + x) * 0.3;
                ctx.fillStyle = `rgba(255,170,50,${flicker2})`;
                ctx.beginPath();
                ctx.arc(sx + 8, sy + 4, 4, 0, Math.PI * 2);
                ctx.fill();
                continue;
            }

            // Regular block
            ctx.globalAlpha = light;
            ctx.fillStyle = td2.color;
            ctx.fillRect(sx, sy, TILE, TILE);

            // ===== PIXEL ART BLOCK TEXTURES =====
            // Hash for deterministic per-block variety
            const bHash = (x * 2654435761 + y * 40503) & 0xFFFF;

            // Dirt — speckles and pebbles
            if (b === T.DIRT) {
                ctx.fillStyle = `rgba(0,0,0,${0.08 + (bHash % 5) * 0.02})`;
                ctx.fillRect(sx + bHash % 12, sy + (bHash >> 4) % 12, 2, 2);
                ctx.fillRect(sx + (bHash >> 2) % 10 + 3, sy + (bHash >> 6) % 10 + 3, 2, 1);
                ctx.fillStyle = 'rgba(80,50,20,0.15)';
                ctx.fillRect(sx + (bHash >> 3) % 14, sy + (bHash >> 5) % 14, 1, 1);
            }
            // Stone — cracks and highlights
            else if (b === T.STONE || b === T.CRACKED_BRICK || b === T.MOSSY_STONE || b === T.FROZEN_STONE) {
                ctx.fillStyle = 'rgba(0,0,0,0.15)';
                ctx.fillRect(sx, sy + TILE - 1, TILE, 1);
                // Crack lines
                const cx1 = bHash % 10 + 2, cy1 = (bHash >> 3) % 8 + 2;
                ctx.fillRect(sx + cx1, sy + cy1, 1, 4 + bHash % 3);
                ctx.fillRect(sx + cx1, sy + cy1 + 2, 3, 1);
                // Highlight shard
                ctx.fillStyle = 'rgba(255,255,255,0.06)';
                ctx.fillRect(sx + (bHash >> 5) % 10 + 2, sy + 1, 3, 1);
                if (b === T.MOSSY_STONE) {
                    ctx.fillStyle = 'rgba(40,120,30,0.2)';
                    ctx.fillRect(sx, sy, TILE, 3);
                }
            }
            // Wood — bark lines and knots
            else if (b === T.WOOD) {
                ctx.fillStyle = 'rgba(0,0,0,0.1)';
                // Vertical bark lines
                ctx.fillRect(sx + 3, sy, 1, TILE);
                ctx.fillRect(sx + 8, sy, 1, TILE);
                ctx.fillRect(sx + 12, sy, 1, TILE);
                // Knot
                if (bHash % 7 === 0) {
                    ctx.fillStyle = 'rgba(60,30,10,0.25)';
                    ctx.fillRect(sx + 5 + bHash % 4, sy + 4 + bHash % 6, 3, 3);
                }
                // Lighter highlight
                ctx.fillStyle = 'rgba(180,140,80,0.08)';
                ctx.fillRect(sx + 5, sy, 3, TILE);
            }
            // Leaves — dappled light/dark pixels for foliage volume
            else if (b === T.LEAVES || b === T.MUSHROOM_CAP) {
                // Dark spots
                ctx.fillStyle = b === T.LEAVES ? 'rgba(0,40,0,0.25)' : 'rgba(60,0,40,0.2)';
                ctx.fillRect(sx + bHash % 10, sy + (bHash >> 3) % 10, 3, 3);
                ctx.fillRect(sx + (bHash >> 5) % 8 + 4, sy + (bHash >> 7) % 8 + 4, 2, 2);
                // Light spots
                ctx.fillStyle = b === T.LEAVES ? 'rgba(120,200,60,0.15)' : 'rgba(200,100,255,0.12)';
                ctx.fillRect(sx + (bHash >> 2) % 12, sy + (bHash >> 4) % 12, 2, 2);
                ctx.fillRect(sx + (bHash >> 6) % 10 + 3, sy + 1, 2, 1);
            }
            // Ice — shimmer streaks
            else if (b === T.ICE || b === T.SNOW) {
                ctx.fillStyle = 'rgba(180,220,255,0.12)';
                // Diagonal shimmer
                ctx.fillRect(sx + bHash % 8, sy + bHash % 8, 1, 6);
                ctx.fillRect(sx + bHash % 8 + 1, sy + bHash % 8 + 1, 1, 4);
                // Sparkle point
                if (bHash % 5 === 0) {
                    const sparkle = Math.sin(gameFrame * 0.04 + bHash) * 0.15 + 0.1;
                    ctx.fillStyle = `rgba(255,255,255,${sparkle})`;
                    ctx.fillRect(sx + (bHash >> 2) % 12 + 2, sy + (bHash >> 4) % 12 + 2, 2, 2);
                }
            }
            // Bone — texture
            else if (b === T.BONE || b === T.BONE_BRICK) {
                ctx.fillStyle = 'rgba(0,0,0,0.1)';
                ctx.fillRect(sx + bHash % 12, sy + (bHash >> 3) % 8 + 3, 4, 1);
                ctx.fillRect(sx + (bHash >> 5) % 10, sy + (bHash >> 7) % 6 + 6, 1, 3);
                ctx.fillStyle = 'rgba(255,255,230,0.08)';
                ctx.fillRect(sx + 2, sy, 5, 1);
            }
            // Flesh — veiny texture
            else if (b === T.FLESH || b === T.BLOOD_STONE) {
                ctx.fillStyle = 'rgba(120,10,20,0.2)';
                ctx.fillRect(sx + bHash % 8 + 2, sy, 1, TILE);
                ctx.fillRect(sx + (bHash >> 4) % 6 + 6, sy + 3, 1, TILE - 6);
                ctx.fillStyle = 'rgba(200,50,50,0.1)';
                ctx.fillRect(sx, sy + 7, TILE, 1);
            }
            // Default — simple edge shadows
            else {
                ctx.fillStyle = 'rgba(0,0,0,0.12)';
                ctx.fillRect(sx, sy + TILE - 1, TILE, 1);
                ctx.fillStyle = 'rgba(255,255,255,0.06)';
                ctx.fillRect(sx, sy, TILE, 1);
            }

            // Phase 4: Waving grass tips (enhanced with color variation)
            if (b === T.GRASS && getBlock(x, y - 1) === T.AIR) {
                const grassWave = Math.sin(gameFrame * 0.04 + x * 0.8) * 2;
                // Multiple grass blade shades
                const shades = ['rgba(40,100,25,', 'rgba(55,130,35,', 'rgba(35,90,20,', 'rgba(65,140,40,', 'rgba(45,110,28,'];
                for (let g = 0; g < 5; g++) {
                    const gx = sx + g * 3 + 1 + grassWave * (0.5 + g * 0.15);
                    const gh = 3 + (bHash + g * 3) % 4;
                    ctx.fillStyle = shades[g % shades.length] + (light * 0.7) + ')';
                    ctx.fillRect(gx, sy - gh, 1, gh);
                    // Blade tip pixel
                    ctx.fillRect(gx + (g % 2 === 0 ? 1 : -1), sy - gh, 1, 1);
                }
                // Occasional tiny flower
                if (bHash % 12 === 0) {
                    const flowerColors = ['rgba(220,50,80,', 'rgba(200,180,50,', 'rgba(100,80,200,'];
                    ctx.fillStyle = flowerColors[bHash % 3] + (light * 0.6) + ')';
                    ctx.fillRect(sx + 7 + grassWave, sy - 5, 3, 2);
                    ctx.fillRect(sx + 8 + grassWave, sy - 6, 1, 1);
                }
                // Layered grass blades with wind sway
                const windPhase = gameFrame * 0.03 + x * 0.8;
                const windStr = Math.sin(windPhase) * 3;
                ctx.fillStyle = `rgba(30,90,30,${light})`;
                for (let g = 0; g < 5; g++) {
                    const gx = sx + 1 + g * 3 + (bHash >> g) % 3;
                    const gh = 4 + (bHash >> (g + 2)) % 4;
                    const sway = windStr * (gh / 8);
                    ctx.beginPath();
                    ctx.moveTo(gx, sy);
                    ctx.lineTo(gx + sway - 1, sy - gh);
                    ctx.lineTo(gx + sway + 1, sy - gh);
                    ctx.lineTo(gx + 2, sy);
                    ctx.closePath();
                    ctx.fill();
                }
            }

            // Phase 4: Dripping ceiling
            if (y > SURFACE_Y && getBlock(x, y + 1) === T.AIR && (b === T.STONE || b === T.DIRT)) {
                if ((x * 17 + y * 31) % 60 === gameFrame % 60) {
                    ctx.fillStyle = `rgba(100,150,200,${light * 0.4})`;
                    ctx.fillRect(sx + (x * 7) % 12 + 2, sy + TILE, 1, 3);
                }
            }

            ctx.globalAlpha = 1;
        }
    }

    // Darkness overlay for unlit areas
    for (let x = startX; x < endX; x++) {
        for (let y = startY; y < endY; y++) {
            if (getBlock(x, y) !== T.AIR) continue;
            const light = getLight(x, y);
            if (light < 0.95) {
                const sx = x * TILE - cam.x, sy = y * TILE - cam.y;
                ctx.fillStyle = `rgba(0,0,0,${1 - light})`;
                ctx.fillRect(sx, sy, TILE, TILE);
            }
        }
    }
}

// Helper: convert dayTime (0-1) to 24-hour game clock
// dayTime 0.0 = 6:00 AM, 0.25 = 12:00 PM, 0.5 = 6:00 PM, 0.75 = 12:00 AM
function getGameTimeHour24() {
    return ((dayTime * 24) + 6) % 24;
}
function getGameTimeString() {
    const h24 = getGameTimeHour24();
    const h = Math.floor(h24);
    const m = Math.floor((h24 - h) * 60);
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:${m < 10 ? '0' + m : m} ${period}`;
}
function getGameTimeIcon() {
    const h = getGameTimeHour24();
    if (h >= 6 && h < 8) return '🌅';   // Dawn
    if (h >= 8 && h < 17) return '☀️';   // Day
    if (h >= 17 && h < 19) return '🌇';  // Dusk
    return '🌙';                          // Night
}
// Compute how dark it is: 0 = full daylight, 1 = full night
function getNightAmount() {
    const h = getGameTimeHour24();
    // Night: 8pm-4am = fully dark
    if (h >= 20 || h < 4) return 1.0;
    // Dawn transition: 4am-7am
    if (h >= 4 && h < 7) return 1.0 - (h - 4) / 3.0;
    // Dusk transition: 5pm-8pm
    if (h >= 17 && h < 20) return (h - 17) / 3.0;
    // Daytime
    return 0.0;
}
function drawBackground() {
    const depth = Math.floor(player.y / TILE);
    const nightAmt = getNightAmount();
    const h24 = getGameTimeHour24();

    // ===== DETERMINE CURRENT BIOME BACKGROUND =====
    const biome = depth < SURFACE_Y ? 'sky' :
        depth < CAVE_Y ? 'surface' :
            depth < MUSH_Y ? 'cave' :
                depth < FROZEN_Y ? 'mushroom' :
                    depth < FLESH_Y ? 'frozen' :
                        depth < HIVE_Y ? 'flesh' :
                            depth < ABYSS_Y ? 'hive' : 'abyss';

    // ===== SKY BASE (always drawn) =====
    if (biome === 'sky' || biome === 'surface') {
        const grd = ctx.createLinearGradient(0, 0, 0, H);

        // ---- Dawn (4am-7am): purple → orange → gold ----
        if (h24 >= 4 && h24 < 7) {
            const t = (h24 - 4) / 3;
            const r1 = Math.round(20 + t * 120), g1 = Math.round(5 + t * 60), b1 = Math.round(40 + t * 60);
            const r2 = Math.round(60 + t * 195), g2 = Math.round(20 + t * 100), b2 = Math.round(50 - t * 20);
            const r3 = Math.round(80 + t * 175), g3 = Math.round(40 + t * 120), b3 = Math.round(20 + t * 40);
            grd.addColorStop(0, `rgb(${r1},${g1},${b1})`);
            grd.addColorStop(0.4, `rgb(${r2},${g2},${b2})`);
            grd.addColorStop(0.7, `rgb(${r3},${g3},${b3})`);
            grd.addColorStop(1, `rgb(${Math.round(90 + t * 80)},${Math.round(50 + t * 60)},${Math.round(15 + t * 20)})`);
        }
        // ---- Morning (7am-10am): golden → blue ----
        else if (h24 >= 7 && h24 < 10) {
            const t = (h24 - 7) / 3;
            grd.addColorStop(0, `rgb(${Math.round(140 - t * 100)},${Math.round(65 + t * 80)},${Math.round(100 + t * 100)})`);
            grd.addColorStop(0.3, `rgb(${Math.round(180 - t * 120)},${Math.round(120 + t * 40)},${Math.round(80 + t * 100)})`);
            grd.addColorStop(0.7, `rgb(${Math.round(200 - t * 130)},${Math.round(140 - t * 20)},${Math.round(40 + t * 90)})`);
            grd.addColorStop(1, `rgb(${Math.round(120 - t * 60)},${Math.round(90 + t * 20)},${Math.round(50 + t * 80)})`);
        }
        // ---- Midday (10am-3pm): bright blue sky ----
        else if (h24 >= 10 && h24 < 15) {
            grd.addColorStop(0, '#1A0835');
            grd.addColorStop(0.2, '#2D1050');
            grd.addColorStop(0.5, '#3A1848');
            grd.addColorStop(0.8, '#2A1435');
            grd.addColorStop(1, '#1A0A25');
        }
        // ---- Afternoon (3pm-5pm): slightly warmer ----
        else if (h24 >= 15 && h24 < 17) {
            const t = (h24 - 15) / 2;
            grd.addColorStop(0, `rgb(${Math.round(26 + t * 40)},${Math.round(8 + t * 10)},${Math.round(53 - t * 10)})`);
            grd.addColorStop(0.4, `rgb(${Math.round(45 + t * 80)},${Math.round(16 + t * 20)},${Math.round(80 - t * 30)})`);
            grd.addColorStop(0.7, `rgb(${Math.round(42 + t * 120)},${Math.round(20 + t * 40)},${Math.round(72 - t * 40)})`);
            grd.addColorStop(1, `rgb(${Math.round(26 + t * 60)},${Math.round(10 + t * 20)},${Math.round(37 - t * 10)})`);
        }
        // ---- Dusk (5pm-8pm): orange → red → purple → dark ----
        else if (h24 >= 17 && h24 < 20) {
            const t = (h24 - 17) / 3;
            const r1 = Math.round(180 - t * 170), g1 = Math.round(40 - t * 35), b1 = Math.round(30 - t * 20);
            const r2 = Math.round(220 - t * 210), g2 = Math.round(80 - t * 70), b2 = Math.round(50 + t * 10);
            const r3 = Math.round(160 - t * 150), g3 = Math.round(50 - t * 45), b3 = Math.round(70 - t * 40);
            grd.addColorStop(0, `rgb(${r1},${g1},${b1})`);
            grd.addColorStop(0.3, `rgb(${r2},${g2},${b2})`);
            grd.addColorStop(0.6, `rgb(${r3},${g3},${b3})`);
            grd.addColorStop(1, `rgb(${Math.round(80 - t * 70)},${Math.round(15 - t * 10)},${Math.round(25 - t * 10)})`);
        }
        // ---- Night (8pm-4am): deep dark ----
        else {
            grd.addColorStop(0, '#020010');
            grd.addColorStop(0.3, '#0A0025');
            grd.addColorStop(0.7, '#0D0020');
            grd.addColorStop(1, '#0A0010');
        }
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, W, H);

        // ---- Stars with twinkling (only at night) ----
        if (nightAmt > 0.2) {
            const starAlpha = Math.min(1, (nightAmt - 0.2) * 1.5);
            for (let i = 0; i < 150; i++) {
                const sx = (i * 137.5 + 50) % W;
                const sy = (i * 89.3 + 20) % (H * 0.45);
                const twinkle = 0.3 + Math.sin(gameFrame * 0.012 + i * 1.7) * 0.4 + Math.sin(gameFrame * 0.03 + i * 3.1) * 0.2;
                const size = i % 7 === 0 ? 2.5 : i % 5 === 0 ? 1.5 : 1;
                const hue = (i * 47) % 360;
                ctx.fillStyle = `hsla(${hue}, ${i % 3 === 0 ? 40 : 10}%, ${80 + (i % 20)}%, ${twinkle * starAlpha * 0.8})`;
                ctx.fillRect(sx, sy, size, size);
                if (size >= 2 && twinkle > 0.7) {
                    ctx.fillRect(sx - 1, sy, size + 2, 1);
                    ctx.fillRect(sx, sy - 1, 1, size + 2);
                }
            }
        }

        // ---- Sun (arcs across sky during day: 6am-6pm) ----
        if (h24 >= 5 && h24 < 19) {
            const sunProgress = (h24 - 5) / 14; // 0 at 5am, 1 at 7pm
            const sunAngle = Math.PI * sunProgress; // 0 to PI (left to right arc)
            const sunArcCenterY = H * 0.85;
            const sunArcRadius = H * 0.7;
            const sunX = W * 0.1 + (W * 0.8) * sunProgress;
            const sunY = sunArcCenterY - Math.sin(sunAngle) * sunArcRadius;
            const sunAlpha = Math.min(1, Math.min(sunProgress * 5, (1 - sunProgress) * 5));
            if (sunY < H && sunAlpha > 0) {
                // Outer warm glow
                ctx.globalAlpha = sunAlpha * 0.06;
                ctx.fillStyle = '#FFE0A0';
                ctx.beginPath(); ctx.arc(sunX, sunY, 80, 0, Math.PI * 2); ctx.fill();
                ctx.globalAlpha = sunAlpha * 0.12;
                ctx.fillStyle = '#FFCC66';
                ctx.beginPath(); ctx.arc(sunX, sunY, 50, 0, Math.PI * 2); ctx.fill();
                // Sun body
                ctx.globalAlpha = sunAlpha * 0.7;
                ctx.fillStyle = '#FFE888';
                ctx.beginPath(); ctx.arc(sunX, sunY, 18, 0, Math.PI * 2); ctx.fill();
                ctx.globalAlpha = sunAlpha * 0.9;
                ctx.fillStyle = '#FFFFCC';
                ctx.beginPath(); ctx.arc(sunX, sunY, 12, 0, Math.PI * 2); ctx.fill();
                // Sun rays
                ctx.globalAlpha = sunAlpha * 0.15;
                ctx.strokeStyle = '#FFDD88';
                ctx.lineWidth = 1.5;
                for (let r = 0; r < 8; r++) {
                    const ra = r * Math.PI / 4 + gameFrame * 0.003;
                    ctx.beginPath();
                    ctx.moveTo(sunX + Math.cos(ra) * 22, sunY + Math.sin(ra) * 22);
                    ctx.lineTo(sunX + Math.cos(ra) * (32 + Math.sin(gameFrame * 0.05 + r) * 5), sunY + Math.sin(ra) * (32 + Math.sin(gameFrame * 0.05 + r) * 5));
                    ctx.stroke();
                }
                ctx.globalAlpha = 1;
            }
        }

        // ---- Moon with craters (arcs during night: 6pm-6am) ----
        if (nightAmt > 0.15) {
            let moonProgress;
            if (h24 >= 18) moonProgress = (h24 - 18) / 12;
            else moonProgress = (h24 + 6) / 12;
            const moonAngle = Math.PI * moonProgress;
            const moonArcCenterY = H * 0.9;
            const moonArcRadius = H * 0.75;
            const moonX = W * 0.1 + (W * 0.8) * moonProgress;
            const moonY = moonArcCenterY - Math.sin(moonAngle) * moonArcRadius;
            const moonA = Math.min(1, nightAmt * 2);
            if (moonY < H && moonA > 0) {
                // Outer ethereal glow
                ctx.globalAlpha = moonA * 0.06;
                ctx.fillStyle = '#C8D8FF';
                ctx.beginPath(); ctx.arc(moonX, moonY, 60, 0, Math.PI * 2); ctx.fill();
                ctx.globalAlpha = moonA * 0.12;
                ctx.fillStyle = '#B0C0E8';
                ctx.beginPath(); ctx.arc(moonX, moonY, 40, 0, Math.PI * 2); ctx.fill();
                // Moon body
                ctx.globalAlpha = moonA * 0.55;
                ctx.fillStyle = '#E8E0D0';
                ctx.beginPath(); ctx.arc(moonX, moonY, 22, 0, Math.PI * 2); ctx.fill();
                // Craters
                ctx.fillStyle = '#C0B098';
                ctx.globalAlpha = moonA * 0.35;
                ctx.fillRect(moonX - 8, moonY - 4, 5, 4);
                ctx.fillRect(moonX + 3, moonY + 2, 4, 3);
                ctx.fillRect(moonX - 3, moonY + 6, 3, 3);
                ctx.fillRect(moonX + 7, moonY - 7, 3, 2);
                ctx.fillRect(moonX - 12, moonY + 1, 2, 2);
                ctx.globalAlpha = 1;
            }
        }

        // ---- Mountain silhouettes (3 layers) ----
        const mtColors = nightAmt > 0.5 ?
            ['rgba(10,5,25,0.6)', 'rgba(15,8,30,0.7)', 'rgba(20,10,35,0.8)'] :
            ['rgba(30,15,40,0.5)', 'rgba(40,18,45,0.6)', 'rgba(50,22,50,0.7)'];
        for (let layer = 0; layer < 3; layer++) {
            const speed = 0.015 + layer * 0.02;
            const scrollX = cam.x * speed;
            const baseY = H * (0.25 + layer * 0.15);
            ctx.fillStyle = mtColors[layer];
            ctx.beginPath();
            ctx.moveTo(-10, H);
            for (let px = -10; px <= W + 10; px += 2) {
                const wx = px + scrollX;
                // Multi-octave mountains
                const h1 = Math.sin(wx * 0.003 + layer * 2) * 80 * (1 - layer * 0.2);
                const h2 = Math.sin(wx * 0.008 + layer * 5 + 10) * 35;
                const h3 = Math.sin(wx * 0.02 + layer * 8) * 15;
                const jagged = Math.sin(wx * 0.05 + layer) * 5 * (layer + 1); // pixelated edge
                ctx.lineTo(px, baseY - h1 - h2 - h3 - jagged);
            }
            ctx.lineTo(W + 10, H);
            ctx.closePath();
            ctx.fill();
        }

        // ---- Pixel art tree silhouettes on furthest mountains ----
        const treeSpeed = 0.045;
        const treeScroll = cam.x * treeSpeed;
        ctx.fillStyle = nightAmt > 0.5 ? 'rgba(8,3,18,0.9)' : 'rgba(25,12,35,0.8)';
        for (let i = 0; i < 40; i++) {
            const tx = (i * 73 - treeScroll % 3000 + 6000) % 3000 - 500;
            const ty = H * 0.58 + Math.sin(i * 2.3 + (tx + treeScroll) * 0.003) * 20;
            const th = 15 + (i * 7) % 25;
            const tw = 4 + (i * 3) % 8;
            // Trunk
            ctx.fillRect(tx, ty - th, 3, th);
            // Canopy shape varies
            if (i % 3 === 0) {
                // Round
                for (let cy = -th; cy < -th + tw; cy++) {
                    const cw = Math.floor(tw * Math.sqrt(1 - ((cy + th) / tw) * ((cy + th) / tw)));
                    ctx.fillRect(tx + 1 - cw, ty + cy, cw * 2 + 1, 1);
                }
            } else if (i % 3 === 1) {
                // Pine triangle
                for (let cy = 0; cy < tw; cy++) {
                    const cw = Math.floor(cy * 0.6) + 1;
                    ctx.fillRect(tx + 1 - cw, ty - th + cy, cw * 2 + 1, 1);
                }
            } else {
                // Flat bush
                ctx.fillRect(tx - tw / 2, ty - th - 2, tw + 2, tw / 2);
            }
        }

        // ---- Animated clouds ----
        const cloudAlpha = nightAmt > 0.5 ? 0.06 : 0.15;
        for (let i = 0; i < 8; i++) {
            const cx = (i * 280 + gameFrame * (0.15 + i * 0.05) - cam.x * 0.01) % (W + 400) - 200;
            const cy = 30 + (i * 43) % 80;
            const cw = 60 + (i * 31) % 50;
            const ch = 12 + (i * 7) % 10;
            ctx.fillStyle = `rgba(180,160,200,${cloudAlpha})`;
            // Fluffy cloud shape (multiple ellipses)
            ctx.beginPath();
            ctx.ellipse(cx, cy, cw / 2, ch, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(cx - cw * 0.25, cy - ch * 0.3, cw * 0.35, ch * 0.8, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(cx + cw * 0.3, cy - ch * 0.2, cw * 0.3, ch * 0.7, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    // ===== CAVE / BONE CAVERN BACKGROUND =====
    else if (biome === 'cave') {
        const grd = ctx.createLinearGradient(0, 0, 0, H);
        grd.addColorStop(0, '#060408'); grd.addColorStop(0.5, '#0A0710'); grd.addColorStop(1, '#080510');
        ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);

        // Rocky ceiling with stalactites
        ctx.fillStyle = 'rgba(30,20,35,0.7)';
        for (let i = 0; i < 30; i++) {
            const sx = (i * 97 - cam.x * 0.03 + 3000) % 3000 - 500;
            const sLen = 15 + (i * 13) % 40;
            ctx.beginPath();
            ctx.moveTo(sx - 3, 0); ctx.lineTo(sx, sLen); ctx.lineTo(sx + 3, 0);
            ctx.fill();
        }
        // Bone fragments in background
        ctx.fillStyle = 'rgba(80,70,55,0.15)';
        for (let i = 0; i < 15; i++) {
            const bx = (i * 141 - cam.x * 0.04 + 2500) % 2500 - 200;
            const by = 60 + (i * 89) % (H - 120);
            ctx.fillRect(bx, by, 8 + i % 5, 2);
            ctx.fillRect(bx + 2, by - 1, 2, 4 + i % 3);
        }
        // Eerie fog bands
        for (let f = 0; f < 3; f++) {
            const fy = H * (0.3 + f * 0.25) + Math.sin(gameFrame * 0.005 + f) * 15;
            ctx.fillStyle = `rgba(40,30,50,${0.1 - f * 0.02})`;
            ctx.fillRect(0, fy, W, 25 + f * 10);
        }
    }
    // ===== MUSHROOM BIOME BACKGROUND =====
    else if (biome === 'mushroom') {
        const grd = ctx.createLinearGradient(0, 0, 0, H);
        grd.addColorStop(0, '#050210'); grd.addColorStop(0.5, '#0A0418'); grd.addColorStop(1, '#080315');
        ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);

        // Giant glowing mushroom silhouettes
        for (let i = 0; i < 10; i++) {
            const mx = (i * 200 - cam.x * 0.03 + 2500) % 2500 - 200;
            const mh = 60 + (i * 31) % 80;
            const mw = 30 + (i * 17) % 40;
            const glow = 0.2 + Math.sin(gameFrame * 0.01 + i * 1.5) * 0.08;
            // Stem
            ctx.fillStyle = `rgba(60,30,80,${glow})`;
            ctx.fillRect(mx - 4, H - mh, 8, mh);
            // Cap (dome)
            ctx.fillStyle = `rgba(120,40,160,${glow})`;
            ctx.beginPath();
            ctx.ellipse(mx, H - mh, mw, mw * 0.5, 0, Math.PI, 0);
            ctx.fill();
            // Glow spots
            ctx.fillStyle = `rgba(180,100,255,${glow * 0.4})`;
            ctx.fillRect(mx - mw * 0.3, H - mh - mw * 0.15, 4, 4);
            ctx.fillRect(mx + mw * 0.2, H - mh - mw * 0.2, 3, 3);
        }
        // Floating spore particles
        ctx.fillStyle = 'rgba(150,80,220,0.3)';
        for (let i = 0; i < 25; i++) {
            const px = (i * 97 + gameFrame * 0.3 + Math.sin(gameFrame * 0.02 + i) * 30) % W;
            const py = (i * 67 + Math.sin(gameFrame * 0.01 + i * 2.3) * 40 + H * 0.3) % H;
            ctx.fillRect(px, py, 2, 2);
        }
    }
    // ===== FROZEN CRYPT BACKGROUND =====
    else if (biome === 'frozen') {
        const grd = ctx.createLinearGradient(0, 0, 0, H);
        grd.addColorStop(0, '#040810'); grd.addColorStop(0.5, '#081020'); grd.addColorStop(1, '#0A1428');
        ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);

        // Ice crystal formations
        for (let i = 0; i < 12; i++) {
            const cx = (i * 170 - cam.x * 0.025 + 2500) % 2500 - 200;
            const ch = 30 + (i * 23) % 60;
            const glow = 0.15 + Math.sin(gameFrame * 0.008 + i) * 0.06;
            ctx.fillStyle = `rgba(100,180,255,${glow})`;
            // Crystal pillar
            ctx.beginPath();
            ctx.moveTo(cx, H);
            ctx.lineTo(cx - 5 - i % 4, H - ch);
            ctx.lineTo(cx, H - ch - 15);
            ctx.lineTo(cx + 5 + i % 4, H - ch);
            ctx.closePath();
            ctx.fill();
            // Shimmer
            ctx.fillStyle = `rgba(200,230,255,${glow * 0.5})`;
            ctx.fillRect(cx - 1, H - ch - 10, 2, 8);
        }
        // Falling snow particles
        for (let i = 0; i < 40; i++) {
            const sx = (i * 53 + gameFrame * (0.2 + (i % 3) * 0.1) + Math.sin(gameFrame * 0.01 + i) * 20) % W;
            const sy = (i * 37 + gameFrame * (0.3 + (i % 4) * 0.15)) % H;
            ctx.fillStyle = `rgba(200,220,255,${0.2 + (i % 5) * 0.05})`;
            ctx.fillRect(sx, sy, 1 + (i % 3 === 0 ? 1 : 0), 1 + (i % 3 === 0 ? 1 : 0));
        }
        // Aurora effect
        ctx.globalAlpha = 0.06;
        for (let a = 0; a < 3; a++) {
            const hue = 180 + a * 40 + Math.sin(gameFrame * 0.005) * 20;
            ctx.fillStyle = `hsl(${hue}, 70%, 50%)`;
            for (let px = 0; px < W; px += 3) {
                const ay = 30 + Math.sin(px * 0.01 + gameFrame * 0.003 + a) * 25 + a * 15;
                ctx.fillRect(px, ay, 3, 8);
            }
        }
        ctx.globalAlpha = 1;
    }
    // ===== FLESH TUNNELS BACKGROUND =====
    else if (biome === 'flesh') {
        const grd = ctx.createLinearGradient(0, 0, 0, H);
        grd.addColorStop(0, '#10040A'); grd.addColorStop(0.5, '#1A0810'); grd.addColorStop(1, '#120408');
        ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);

        // Pulsing organic walls
        const pulse = Math.sin(gameFrame * 0.015) * 0.06;
        for (let i = 0; i < 15; i++) {
            const vx = (i * 130 - cam.x * 0.03 + 2500) % 2500 - 200;
            const glow = 0.12 + pulse + Math.sin(i * 2.1) * 0.04;
            // Vein
            ctx.strokeStyle = `rgba(180,40,60,${glow})`;
            ctx.lineWidth = 2 + i % 3;
            ctx.beginPath();
            ctx.moveTo(vx, 0);
            for (let vy = 0; vy < H; vy += 10) {
                ctx.lineTo(vx + Math.sin(vy * 0.08 + i + gameFrame * 0.005) * 15, vy);
            }
            ctx.stroke();
        }
        // Eyes in walls
        for (let i = 0; i < 6; i++) {
            const ex = (i * 210 - cam.x * 0.02 + 2000) % 2000 - 100;
            const ey = 50 + (i * 97) % (H - 100);
            const blink = Math.sin(gameFrame * 0.01 + i * 4) > 0.5 ? 1 : 0.2;
            ctx.fillStyle = `rgba(220,180,50,${0.15 * blink})`;
            ctx.beginPath(); ctx.ellipse(ex, ey, 8, 4 * blink, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = `rgba(100,10,10,${0.2 * blink})`;
            ctx.beginPath(); ctx.arc(ex, ey, 2, 0, Math.PI * 2); ctx.fill();
        }
        // Blood drip particles
        ctx.fillStyle = 'rgba(150,20,30,0.2)';
        for (let i = 0; i < 15; i++) {
            const dx = (i * 83 + 20) % W;
            const dy = (gameFrame * (0.4 + i * 0.1) + i * 47) % H;
            ctx.fillRect(dx, dy, 1, 3 + i % 3);
        }
    }
    // ===== HIVE BACKGROUND =====
    else if (biome === 'hive') {
        const grd = ctx.createLinearGradient(0, 0, 0, H);
        grd.addColorStop(0, '#0E0A02'); grd.addColorStop(0.5, '#181005'); grd.addColorStop(1, '#120C03');
        ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);

        // Hexagonal honeycomb pattern
        const hexSize = 20;
        const scroll = cam.x * 0.02;
        ctx.strokeStyle = 'rgba(200,150,30,0.08)';
        ctx.lineWidth = 1;
        for (let row = -1; row < H / (hexSize * 1.5) + 1; row++) {
            for (let col = -1; col < W / (hexSize * 1.73) + 1; col++) {
                const hx = col * hexSize * 1.73 + (row % 2) * hexSize * 0.866 - (scroll % (hexSize * 1.73));
                const hy = row * hexSize * 1.5;
                ctx.beginPath();
                for (let a = 0; a < 6; a++) {
                    const angle = Math.PI / 3 * a - Math.PI / 6;
                    const px = hx + hexSize * 0.7 * Math.cos(angle);
                    const py = hy + hexSize * 0.7 * Math.sin(angle);
                    if (a === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.stroke();
                // Some cells filled with amber
                if ((col + row * 7) % 11 === 0) {
                    ctx.fillStyle = `rgba(200,150,30,${0.04 + Math.sin(gameFrame * 0.01 + col + row) * 0.02})`;
                    ctx.fill();
                }
            }
        }
        // Buzzing particles
        for (let i = 0; i < 12; i++) {
            const bx = (gameFrame * (1 + i * 0.3) + i * 140 + Math.sin(gameFrame * 0.05 + i) * 30) % W;
            const by = (i * 67 + Math.sin(gameFrame * 0.03 + i * 2) * 40 + H * 0.3) % H;
            ctx.fillStyle = 'rgba(220,200,50,0.2)';
            ctx.fillRect(bx, by, 2, 1);
        }
    }
    // ===== ABYSS / HELL BACKGROUND =====
    else if (biome === 'abyss') {
        const grd = ctx.createLinearGradient(0, 0, 0, H);
        grd.addColorStop(0, '#0A0204'); grd.addColorStop(0.6, '#1A0408'); grd.addColorStop(1, '#2A0810');
        ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);

        // Lava glow from below
        const lavaGlow = 0.1 + Math.sin(gameFrame * 0.01) * 0.04;
        ctx.fillStyle = `rgba(255,80,20,${lavaGlow})`;
        ctx.fillRect(0, H * 0.7, W, H * 0.3);
        ctx.fillStyle = `rgba(255,40,10,${lavaGlow * 0.6})`;
        ctx.fillRect(0, H * 0.85, W, H * 0.15);

        // Hellstone pillars
        for (let i = 0; i < 8; i++) {
            const px = (i * 250 - cam.x * 0.02 + 2500) % 2500 - 200;
            const ph = 80 + (i * 37) % 100;
            ctx.fillStyle = 'rgba(40,10,15,0.6)';
            ctx.fillRect(px - 8, H - ph, 16, ph);
            ctx.fillRect(px - 12, H - ph, 24, 6);
            // Glowing cracks
            ctx.fillStyle = `rgba(255,100,30,${0.15 + Math.sin(gameFrame * 0.02 + i) * 0.05})`;
            ctx.fillRect(px - 1, H - ph + 10, 2, ph - 20);
        }
        // Rising ember particles
        for (let i = 0; i < 30; i++) {
            const ex = (i * 67 + Math.sin(gameFrame * 0.02 + i) * 20) % W;
            const ey = H - (gameFrame * (0.5 + i * 0.2) + i * 43) % (H * 0.8);
            const eLife = ey / H;
            ctx.fillStyle = `rgba(255,${Math.floor(100 + eLife * 100)},${Math.floor(20 + eLife * 30)},${0.3 * (1 - eLife)})`;
            ctx.fillRect(ex, ey, 2, 2);
        }
    }
}

function lerpColor(a, b, t) {
    const ar = parseInt(a.slice(1, 3), 16), ag = parseInt(a.slice(3, 5), 16), ab = parseInt(a.slice(5, 7), 16);
    const br = parseInt(b.slice(1, 3), 16), bg = parseInt(b.slice(3, 5), 16), bb = parseInt(b.slice(5, 7), 16);
    const r = Math.round(ar + (br - ar) * t), g = Math.round(ag + (bg - ag) * t), bv = Math.round(ab + (bb - ab) * t);
    return `rgb(${r},${g},${bv})`;
}

function drawCursor() {
    const wx = mouseX + cam.x, wy = mouseY + cam.y;
    const tx = Math.floor(wx / TILE), ty = Math.floor(wy / TILE);
    const sx = tx * TILE - cam.x, sy = ty * TILE - cam.y;
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1;
    ctx.strokeRect(sx, sy, TILE, TILE);
    // Show NPC cage highlight
    if (getBlock(tx, ty) === T.NPC_CAGE) {
        ctx.strokeStyle = '#44FF44'; ctx.lineWidth = 2;
        ctx.strokeRect(sx - 1, sy - 1, TILE + 2, TILE + 2);
    }
}

// ===== PHASE 4: POST-PROCESSING =====
function drawPostProcessing() {
    // Desaturation + red vignette at low HP
    const hpRatio = player.hp / player.maxHp;
    if (hpRatio < 0.3) {
        const intensity = (0.3 - hpRatio) / 0.3;
        // Desaturation overlay
        ctx.fillStyle = `rgba(0,0,0,${intensity * 0.3})`;
        ctx.fillRect(0, 0, W, H);
        // Red vignette
        const vgrd = ctx.createRadialGradient(W / 2, H / 2, W * 0.3, W / 2, H / 2, W * 0.8);
        vgrd.addColorStop(0, 'rgba(0,0,0,0)');
        vgrd.addColorStop(1, `rgba(120,0,0,${intensity * 0.6})`);
        ctx.fillStyle = vgrd; ctx.fillRect(0, 0, W, H);
        // Pulsing heartbeat effect
        const heartbeat = Math.sin(gameFrame * 0.15) * 0.5 + 0.5;
        ctx.fillStyle = `rgba(200,0,0,${heartbeat * intensity * 0.1})`;
        ctx.fillRect(0, 0, W, H);
    }

    // Chromatic aberration on damage
    if (postProcess.chromatic > 0.01) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = postProcess.chromatic * 0.15;
        ctx.drawImage(canvas, -postProcess.chromatic * 3, 0);
        ctx.globalAlpha = postProcess.chromatic * 0.1;
        ctx.drawImage(canvas, postProcess.chromatic * 3, 0);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        postProcess.chromatic *= 0.92;
    }

    // Global bloom glow
    if (postProcess.bloom > 0) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = postProcess.bloom * 0.06;
        ctx.drawImage(canvas, 0, 0, W, H);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
    }

    // Underwater tint when in ocean biome
    if (typeof getPlayerBiome === 'function' && getPlayerBiome() === 'ocean') {
        ctx.fillStyle = 'rgba(0,40,80,0.15)';
        ctx.fillRect(0, 0, W, H);
    }
}

// ===== PHASE 2: WEATHER SYSTEM =====
function updateWeather() {
    weather.timer--;
    if (weather.timer <= 0) {
        const r = Math.random();
        if (r < 0.4) weather.type = 'clear';
        else if (r < 0.6) weather.type = 'rain';
        else if (r < 0.7) weather.type = 'storm';
        else if (r < 0.8) weather.type = 'fog';
        else if (r < 0.9) weather.type = 'ash';
        else weather.type = 'blood_rain';
        weather.timer = 600 + Math.floor(Math.random() * 1200);
        weather.intensity = 0.3 + Math.random() * 0.7;
    }
}

const weatherParticles = [];
function updateWeatherParticles() {
    // Spawn
    if (weather.type === 'rain' || weather.type === 'storm' || weather.type === 'blood_rain') {
        for (let i = 0; i < Math.floor(weather.intensity * 8); i++) {
            weatherParticles.push({
                x: cam.x + Math.random() * W, y: cam.y - 10,
                vx: weather.type === 'storm' ? -3 + Math.random() * 2 : -0.5,
                vy: 4 + Math.random() * 4,
                life: 60, color: weather.type === 'blood_rain' ? '#880022' : '#6688CC', size: 1
            });
        }
    }
    if (weather.type === 'ash') {
        for (let i = 0; i < 2; i++) {
            weatherParticles.push({
                x: cam.x + Math.random() * W, y: cam.y - 10,
                vx: Math.sin(gameFrame * 0.01) * 0.5, vy: 0.5 + Math.random(),
                life: 120, color: '#888888', size: 2
            });
        }
    }
    // Update
    for (let i = weatherParticles.length - 1; i >= 0; i--) {
        const p = weatherParticles[i];
        p.x += p.vx; p.y += p.vy; p.life--;
        const tx = Math.floor(p.x / TILE), ty = Math.floor(p.y / TILE);
        if (p.life <= 0 || isSolid(tx, ty)) { weatherParticles.splice(i, 1); }
    }
}

function drawWeather() {
    for (const p of weatherParticles) {
        ctx.fillStyle = p.color; ctx.globalAlpha = p.life / 60;
        ctx.fillRect(p.x - cam.x, p.y - cam.y, p.size, p.size * 3);
    }
    ctx.globalAlpha = 1;
    // Fog overlay
    if (weather.type === 'fog') {
        ctx.fillStyle = `rgba(30,30,40,${weather.intensity * 0.4})`;
        ctx.fillRect(0, 0, W, H);
    }
    // Lightning flash on storm
    if (weather.type === 'storm' && Math.random() < 0.003) {
        ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(0, 0, W, H);
    }
    // Blood tint
    if (weather.type === 'blood_rain' || (worldEvent.type === 'blood_moon')) {
        ctx.fillStyle = 'rgba(100,0,0,0.15)'; ctx.fillRect(0, 0, W, H);
    }
}

// ===== PHASE 2: WORLD EVENT MANAGER =====
let eventTimer = 3600 + Math.floor(Math.random() * 3600); // first event after 1-2 min
function updateWorldEvents() {
    // Event banner countdown
    if (worldEvent.bannerTimer > 0) worldEvent.bannerTimer--;
    // Timer for next event
    if (worldEvent.type === null) {
        eventTimer--;
        if (eventTimer <= 0) {
            const r = Math.random();
            if (r < 0.25) startBloodMoon();
            else if (r < 0.45) startGoblinArmy();
            else if (r < 0.6) startSolarEclipse();
            else if (r < 0.75) startMeteorShower();
            else if (r < 0.85) { triggerEarthquake(); eventBanner('An earthquake shakes the earth!'); eventTimer = 3600 + Math.floor(Math.random() * 3600); }
            else if (r < 0.95) spawnTreasureGoblin();
            else eventTimer = 1800;
        }
    } else {
        worldEvent.timer--;
        if (worldEvent.timer <= 0) endWorldEvent();
        // Event-specific logic
        if (worldEvent.type === 'goblin_army' && gameFrame % 120 === 0 && enemies.length < 20) {
            const types = ['goblin_warrior', 'goblin_archer', 'goblin_mage'];
            const t = types[Math.floor(Math.random() * types.length)];
            const side = Math.random() < 0.5 ? -1 : 1;
            spawnEnemy(t, player.x + side * (W / 2 + 50), player.y - 50);
            worldEvent.wave++;
            if (worldEvent.wave >= 15) endWorldEvent();
        }
        if (worldEvent.type === 'blood_moon' && gameFrame % 60 === 0 && enemies.length < 25) {
            const types = ['blood_zombie', 'blood_phantom', 'zombie', 'skeleton'];
            const t = types[Math.floor(Math.random() * types.length)];
            const side = Math.random() < 0.5 ? -1 : 1;
            spawnEnemy(t, player.x + side * (W / 2 + 50), player.y - 30);
        }
        if (worldEvent.type === 'meteor_shower' && gameFrame % 180 === 0) {
            const mx = Math.floor(player.x / TILE) + Math.floor((Math.random() - 0.5) * 40);
            const my = SURFACE_Y - 2;
            for (let y = my; y < my + 3; y++) for (let x = mx; x < mx + 2; x++) {
                const ores = [T.IRON_ORE, T.GOLD_ORE, T.CRIMSON_ORE, T.FROST_ORE];
                if (getBlock(x, y) === T.AIR) setBlock(x, y, ores[Math.floor(Math.random() * ores.length)]);
            }
            spawnParticles(mx * TILE, my * TILE, '#FFAA44', 15, 8);
        }
    }
}

function startBloodMoon() {
    worldEvent.type = 'blood_moon'; worldEvent.timer = 1800; worldEvent.wave = 0;
    eventBanner('The Blood Moon is rising!');
}
function startGoblinArmy() {
    worldEvent.type = 'goblin_army'; worldEvent.timer = 2400; worldEvent.wave = 0;
    eventBanner('A Goblin Army is approaching!');
}
function startSolarEclipse() {
    worldEvent.type = 'solar_eclipse'; worldEvent.timer = 1200; worldEvent.wave = 0;
    eventBanner('A Solar Eclipse is happening!');
}
function startMeteorShower() {
    worldEvent.type = 'meteor_shower'; worldEvent.timer = 900; worldEvent.wave = 0;
    eventBanner('Meteors are falling from the sky!');
}
function spawnTreasureGoblin() {
    const side = Math.random() < 0.5 ? -1 : 1;
    spawnEnemy('treasure_goblin', player.x + side * (W / 2 + 50), player.y - 30);
    eventBanner('A Treasure Goblin has appeared!');
    eventTimer = 2400 + Math.floor(Math.random() * 2400);
}
function endWorldEvent() {
    eventBanner('The ' + (worldEvent.type || 'event').replace('_', ' ') + ' has ended.');
    worldEvent.type = null; worldEvent.timer = 0; worldEvent.wave = 0;
    eventTimer = 3600 + Math.floor(Math.random() * 3600);
}

// ===== PHASE 2: PROCEDURAL AUDIO =====
let audioCtx = null;
let ambientOsc = null, ambientGain = null;
let currentBiomeAudio = '';

function initAudio() {
    try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        ambientGain = audioCtx.createGain(); ambientGain.gain.value = 0.08;
        ambientGain.connect(audioCtx.destination);
    } catch (e) { audioCtx = null; }
}

function updateAmbientAudio() {
    if (!audioCtx) return;
    const depthTile = Math.floor(player.y / TILE);
    let biome = 'surface';
    if (depthTile > ABYSS_Y) biome = 'hell';
    else if (depthTile > HIVE_Y) biome = 'hive';
    else if (depthTile > FROZEN_Y) biome = 'frozen';
    else if (depthTile > MUSH_Y) biome = 'mushroom';
    else if (depthTile > CAVE_Y) biome = 'caves';
    if (biome === currentBiomeAudio) return;
    currentBiomeAudio = biome;
    if (ambientOsc) { ambientOsc.stop(); ambientOsc = null; }
    ambientOsc = audioCtx.createOscillator();
    const freqMap = { surface: 55, caves: 40, mushroom: 65, frozen: 50, hive: 70, hell: 35 };
    ambientOsc.frequency.value = freqMap[biome] || 45;
    ambientOsc.type = biome === 'frozen' ? 'sine' : biome === 'hell' ? 'sawtooth' : 'triangle';
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass'; filter.frequency.value = 200;
    ambientOsc.connect(filter); filter.connect(ambientGain);
    ambientOsc.start();
}

function playSFX(type) {
    if (!audioCtx) return;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain(); g.gain.value = 0.15;
    o.connect(g); g.connect(audioCtx.destination);
    const sfx = {
        mine: { f: 200, d: 0.05, t: 'square' }, place: { f: 150, d: 0.05, t: 'square' },
        hit: { f: 100, d: 0.08, t: 'sawtooth' }, kill: { f: 300, d: 0.15, t: 'triangle' },
        jump: { f: 400, d: 0.08, t: 'sine' }, hurt: { f: 80, d: 0.12, t: 'sawtooth' },
        craft: { f: 500, d: 0.1, t: 'sine' }, scare: { f: 50, d: 0.5, t: 'sawtooth' }
    };
    const s = sfx[type] || sfx.hit;
    o.frequency.value = s.f; o.type = s.t;
    g.gain.setValueAtTime(0.15, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + s.d);
    o.start(); o.stop(audioCtx.currentTime + s.d);
}

function drawEventBanner() {
    if (!worldEvent.banner || worldEvent.bannerTimer <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, worldEvent.bannerTimer / 30);
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(W / 2 - 200, 60, 400, 40);
    ctx.fillStyle = worldEvent.type === 'blood_moon' ? '#FF2244' : '#FFCC00';
    ctx.textAlign = 'center'; ctx.font = 'bold 16px Inter';
    ctx.fillText(worldEvent.banner, W / 2, 86);
    ctx.restore();
}

// ===== BOSS SPAWN CHECKS =====
function checkBossSpawns() {
    const depthTile = Math.floor(player.y / TILE);
    if (!bossSpawned.eye && dayTime > 0.55 && dayTime < 0.7 && depthTile < SURFACE_Y + 20 && !boss) {
        if (player.level >= 3 && Math.random() < 0.002) { spawnBoss('eye_of_terror', player.x + 300, player.y - 100); bossSpawned.eye = true; }
    }
    if (!bossSpawned.bone && depthTile > CAVE_Y && depthTile < MUSH_Y && !boss) {
        if (player.level >= 5 && Math.random() < 0.001) { spawnBoss('bone_colossus', player.x + 200, player.y); bossSpawned.bone = true; }
    }
    if (!bossSpawned.hive && depthTile > HIVE_Y && depthTile < ABYSS_Y && !boss) {
        if (player.level >= 6 && Math.random() < 0.001) { spawnBoss('hive_queen', player.x + 200, player.y - 80); bossSpawned.hive = true; }
    }
    if (!bossSpawned.frost && depthTile > FROZEN_Y && depthTile < FLESH_Y && !boss) {
        if (player.level >= 7 && Math.random() < 0.001) { spawnBoss('frost_lich', player.x + 200, player.y - 50); bossSpawned.frost = true; }
    }
    if (!bossSpawned.demon && depthTile > ABYSS_Y && !boss) {
        if (player.level >= 8 && Math.random() < 0.001) { spawnBoss('demon_lord', player.x + 200, player.y - 50); bossSpawned.demon = true; }
    }
    if (!bossSpawned.corruption && depthTile > ABYSS_Y + 30 && !boss) {
        if (player.level >= 10 && Math.random() < 0.0005) { spawnBoss('corruption', player.x + 200, player.y); bossSpawned.corruption = true; }
    }
}

// ===== RESPAWN =====
function respawn() {
    const sx = Math.floor(WORLD_W / 2);
    player.x = sx * TILE + 4;
    player.y = (heights[sx] - 3) * TILE;
    player.hp = player.maxHp; player.mana = player.maxMana;
    player.vx = 0; player.vy = 0;
    player.invincible = 60;
    gameState = 'playing';
}

// ===== MAIN GAME LOOP =====
function gameLoop() {
    if (gameState !== 'playing' && gameState !== 'dead') {
        requestAnimationFrame(gameLoop);
        return;
    }

    gameFrame++;

    // Phase 4: Gamepad polling
    if (typeof updateGamepad === 'function') updateGamepad();

    // ===== BIOME MUSIC CROSSFADE =====
    if (window._biomeMusic && gameFrame % 30 === 0) {
        const bm = window._biomeMusic;
        const depth = Math.floor(player.y / TILE);
        const maxVol = (gameSettings ? gameSettings.musicVolume : 0.5) * 0.4;
        // Determine target track
        let target = 'grass';
        if (depth >= ABYSS_Y) target = 'hell';
        else if (depth >= MUSH_Y && depth < FROZEN_Y) target = 'mushroom';
        else if (depth >= CAVE_Y) target = 'underground';

        // Crossfade
        const tracks = { grass: bm.grass, underground: bm.underground, mushroom: bm.mushroom, hell: bm.hell };
        for (const [name, audio] of Object.entries(tracks)) {
            if (name === target) {
                if (audio.paused) audio.play().catch(() => { });
                audio.volume = Math.min(maxVol, audio.volume + 0.02);
            } else {
                audio.volume = Math.max(0, audio.volume - 0.02);
                if (audio.volume <= 0.01 && !audio.paused) audio.pause();
            }
        }
        bm.current = target;
    }

    if (gameState === 'playing' && !showPause) {
        // Day/night cycle
        dayTime = (dayTime + 1 / DAY_LENGTH) % 1;

        // Update player
        const worldMouseX = mouseX + cam.x, worldMouseY = mouseY + cam.y;
        _mouseWorldX = worldMouseX; _mouseWorldY = worldMouseY;

        updatePlayer(keys);

        // Mining
        if (mouseDown && !showInventory && !showCrafting) {
            const held = getHeldItem();
            const it = held ? ITEMS[held.id] : null;
            if (it && it.type === 'bow') {
                if (player.attackCd <= 0) shootArrow();
            } else if (it && it.type === 'gun') {
                if (player.attackCd <= 0) shootGun();
            } else if (it && it.type === 'magic') {
                if (player.attackCd <= 0 && player.mana >= (it.manaCost || 0)) { shootMagic(it); }
            } else if (it && it.type === 'summon') {
                if (!boss && it.boss) { spawnBoss(it.boss, player.x + 200, player.y - 50); removeItem(held.id, 1); }
            } else if (it && it.type === 'food') {
                useFood(held);
            } else if (it && it.type === 'weapon') {
                doAttack(worldMouseX, worldMouseY, enemies);
            } else if (it && it.toolType === 'pick') {
                doMine(worldMouseX, worldMouseY);
            } else if (held && isPlaceable(held.id)) {
                // If holding a block, mine (need pick)
                doMine(worldMouseX, worldMouseY);
            } else {
                doAttack(worldMouseX, worldMouseY, enemies);
            }
        } else {
            player.miningX = -1; player.miningProgress = 0;
        }

        // Place blocks / Bucket usage
        if (rightMouseDown && !showInventory && !showCrafting) {
            const held2 = getHeldItem();
            const it2 = held2 ? ITEMS[held2.id] : null;
            if (it2 && it2.toolType === 'bucket') {
                const btx = Math.floor(worldMouseX / TILE), bty = Math.floor(worldMouseY / TILE);
                const blk = getBlock(btx, bty);
                if (it2.liquid === null && (blk === T.WATER || blk === T.LAVA || blk === T.BLOOD || blk === T.ACID)) {
                    // Pick up liquid
                    setBlock(btx, bty, T.AIR);
                    const bucketMap = { [T.WATER]: I_BUCKET_WATER, [T.LAVA]: I_BUCKET_LAVA, [T.BLOOD]: I_BUCKET_BLOOD, [T.ACID]: I_BUCKET_ACID };
                    held2.id = bucketMap[blk] || I_BUCKET_WATER; held2.count = 1;
                } else if (it2.liquid && blk === T.AIR) {
                    setBlock(btx, bty, it2.liquid);
                    held2.id = I_BUCKET_EMPTY; held2.count = 1;
                }
            } else {
                doPlace(worldMouseX, worldMouseY);
            }
        }

        // Camera
        const targetCamX = player.x + player.w / 2 - W / 2;
        const targetCamY = player.y + player.h / 2 - H / 2;
        cam.x += (targetCamX - cam.x) * 0.1;
        cam.y += (targetCamY - cam.y) * 0.1;
        cam.x = Math.max(0, Math.min(cam.x, WORLD_W * TILE - W));
        cam.y = Math.max(0, Math.min(cam.y, WORLD_H * TILE - H));

        // Lighting (throttled)
        if (gameFrame % 4 === 0) updateLighting(cam.x, cam.y, W, H);

        // Enemies
        updateEnemySpawning(cam.x, cam.y, W, H);
        updateEnemies();

        // Boss
        updateBoss();
        updateProjectiles();
        checkBossSpawns();

        // Particles
        updateParticles();

        // Phase 2: Liquids (throttled)
        if (gameFrame % 4 === 0) updateLiquids();
        // Phase 2: Corruption (throttled)
        if (gameFrame % 120 === 0) updateCorruption();
        // Phase 2: NPCs
        updateNPCs();
        // Phase 2: Weather
        updateWeather();
        updateWeatherParticles();
        // Phase 2: World Events
        updateWorldEvents();
        // Phase 2: Ambient Audio
        if (gameFrame % 60 === 0) updateAmbientAudio();

        // Phase 6: Fishing
        if (typeof updateFishing === 'function') updateFishing();
        // Phase 6: Pets
        if (typeof updatePet === 'function') updatePet();
        // Phase 6: Status Effects
        if (typeof processStatusEffects === 'function') processStatusEffects(player);
        // Phase 6: Mount speed/jump
        if (typeof activeMount !== 'undefined' && activeMount) {
            player.speedMult = activeMount.speedMult || 1;
            player.jumpMult = activeMount.jumpMult || 1;
        } else { player.speedMult = 1; player.jumpMult = 1; }
        // Phase 6: Footsteps
        if (typeof playFootstep === 'function' && player.onGround && (keys['KeyA'] || keys['KeyD'])) playFootstep();
        // Phase 7: Quests - depth tracking
        if (typeof checkQuestProgress === 'function') {
            const depthM = Math.max(0, Math.floor(player.y / TILE) - SURFACE_Y);
            checkQuestProgress('depth', depthM);
        }
        // Phase 7: Achievements (throttled)
        if (gameFrame % 120 === 0 && typeof checkAchievements === 'function') checkAchievements();

        // NPC dialogue timer
        if (showNPCDialogue && showNPCDialogue.timer > 0) {
            showNPCDialogue.timer--;
            if (showNPCDialogue.timer <= 0) showNPCDialogue = null;
        }

        // Rescue NPCs from cages
        const ptx = Math.floor(player.x / TILE), pty = Math.floor(player.y / TILE);
        for (let ddx = -2; ddx <= 2; ddx++) for (let ddy = -2; ddy <= 2; ddy++) {
            if (getBlock(ptx + ddx, pty + ddy) === T.NPC_CAGE) {
                setBlock(ptx + ddx, pty + ddy, T.AIR);
                const npcTypes = Object.keys(NPC_TYPES);
                const rtype = npcTypes[Math.floor(Math.random() * npcTypes.length)];
                const newNPC = spawnNPC(rtype, (ptx + ddx) * TILE, (pty + ddy) * TILE - 28);
                if (newNPC) { newNPC.rescued = true; eventBanner('You rescued the ' + newNPC.name + '!'); }
            }
        }

        // Death
        if (player.hp <= 0) {
            gameState = 'dead';
            tryAchievement('cd_die_first');
            if (hardcoreMode) { deleteSave(); }
            if (typeof triggerShake === 'function') triggerShake(20);
            postProcess.chromatic = 1;
        }

        // Phase 4: Boss Rush advancement
        if (bossRush.active && boss && boss.dead) {
            bossRush.timer = gameFrame;
            if (advanceBossRush()) {
                eventBannerText = 'BOSS RUSH COMPLETE!'; eventBannerTimer = 300;
            }
        }

        // Phase 4: Endless Dungeon floor advance
        if (endlessMode.active && enemies.length === 0 && !boss) {
            endlessMode.floor++;
            generateEndlessFloor(endlessMode.floor);
            eventBannerText = `FLOOR ${endlessMode.floor}`; eventBannerTimer = 120;
        }

        // Phase 4: Screen shake on damage taken
        if (player.invincible === 1 && typeof triggerShake === 'function') {
            triggerShake(6);
            postProcess.chromatic = Math.max(postProcess.chromatic, 0.5);
        }

        // Phase 3: Speedrun timer
        if (speedrunActive) speedrunTimer++;

        // Phase 3: Achievement checks
        const depthBlocks = Math.max(0, Math.floor(player.y / TILE) - SURFACE_Y);
        if (depthBlocks > CAVE_Y - SURFACE_Y) tryAchievement('cd_reach_caves');
        if (depthBlocks > MUSH_Y - SURFACE_Y) tryAchievement('cd_reach_mushroom');
        if (depthBlocks > FROZEN_Y - SURFACE_Y) tryAchievement('cd_reach_frozen');
        if (depthBlocks > FLESH_Y - SURFACE_Y) tryAchievement('cd_reach_flesh');
        if (depthBlocks > HIVE_Y - SURFACE_Y) tryAchievement('cd_reach_hive');
        if (depthBlocks > ABYSS_Y - SURFACE_Y) tryAchievement('cd_reach_abyss');
        if (depthBlocks > 300) tryAchievement('cd_depth_300');
        if (player.level >= 10) tryAchievement('cd_level_10');
        if (player.level >= 25) tryAchievement('cd_level_25');
        if (totalKills >= 100) tryAchievement('cd_kill_100');
        if (totalKills >= 500) tryAchievement('cd_kill_500');
        const biome = getPlayerBiome();
        if (biome === 'sky') tryAchievement('cd_sky_island');
        if (biome === 'ocean') tryAchievement('cd_ocean_depth');

        // Phase 3: Auto-save every 5 minutes
        if (gameFrame % (60 * 300) === 0 && gameFrame > 0) saveGame();
    }

    // ===== RENDER =====
    // Phase 4: Screen shake
    if (screenShake.intensity > 0.1) {
        screenShake.offsetX = (Math.random() - 0.5) * screenShake.intensity;
        screenShake.offsetY = (Math.random() - 0.5) * screenShake.intensity;
        screenShake.intensity *= screenShake.decay;
    } else { screenShake.offsetX = 0; screenShake.offsetY = 0; screenShake.intensity = 0; }

    ctx.save();
    ctx.translate(screenShake.offsetX, screenShake.offsetY);

    // Phase 4: Cinematic zoom
    if (cinematicMode.active) {
        cinematicMode.zoom += (cinematicMode.targetZoom - cinematicMode.zoom) * 0.05;
        const cx = W / 2, cy = H / 2;
        ctx.translate(cx, cy);
        ctx.scale(cinematicMode.zoom, cinematicMode.zoom);
        ctx.translate(-cx, -cy);
    }

    ctx.clearRect(-10, -10, W + 20, H + 20);
    drawBackground();
    drawWorld();

    // Enemies
    for (const e of enemies) drawEnemy(ctx, e, cam.x, cam.y);
    drawBoss(ctx, cam.x, cam.y);
    drawProjectiles(ctx, cam.x, cam.y);

    // NPCs
    for (const n of npcs) drawNPC(ctx, n, cam.x, cam.y);

    // Player
    drawPlayer(ctx, cam.x, cam.y);

    // Phase 6: Draw Pet
    if (typeof activePet !== 'undefined' && activePet) {
        const px = activePet.x - cam.x, py = activePet.y - cam.y;
        ctx.fillStyle = activePet.color;
        ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FFF';
        ctx.beginPath(); ctx.arc(px - 2, py - 2, 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(px + 2, py - 2, 2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(px - 2, py - 2, 1, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(px + 2, py - 2, 1, 0, Math.PI * 2); ctx.fill();
    }

    // Phase 6: Draw Mount
    if (typeof activeMount !== 'undefined' && activeMount) {
        const mx = player.x + player.w / 2 - cam.x, my = player.y + player.h - cam.y;
        ctx.fillStyle = activeMount.color;
        ctx.fillRect(mx - 10, my - 2, 20, 6);
        ctx.fillRect(mx - 12, my + 2, 4, 6);
        ctx.fillRect(mx + 8, my + 2, 4, 6);
    }

    // Phase 6: Draw Fishing Line
    if (typeof fishingState !== 'undefined' && fishingState.active) {
        const fx = player.x + player.w / 2 - cam.x;
        const fy = player.y - cam.y;
        const bobX = fx + 30, bobY = fy + 40 + Math.sin(gameFrame * 0.1) * 3;
        ctx.strokeStyle = '#aaa'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(bobX, bobY); ctx.stroke();
        ctx.fillStyle = fishingState.biting ? '#FF4444' : '#FFFFFF';
        ctx.beginPath(); ctx.arc(bobX, bobY, fishingState.biting ? 4 : 3, 0, Math.PI * 2); ctx.fill();
        if (fishingState.biting) {
            ctx.fillStyle = '#FF4444'; ctx.font = 'bold 14px Inter'; ctx.textAlign = 'center';
            ctx.fillText('!', bobX, bobY - 10);
        }
    }

    // Particles
    for (const p of particles) {
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - cam.x, p.y - cam.y, p.size, p.size);
    }
    ctx.globalAlpha = 1;

    // Ambient particles (fireflies, dust, pollen)
    updateAmbientParticles();
    drawAmbientParticles(ctx, cam.x, cam.y);

    // Floating damage/XP numbers
    if (typeof drawFloatingNumbers === 'function') drawFloatingNumbers(ctx, cam.x, cam.y);

    // Weather
    drawWeather();

    // Cursor
    if (!showInventory && !showCrafting) drawCursor();

    // HUD
    drawHUD(ctx, W, H, dayTime);
    drawMinimap(ctx, W, H);
    // Phase 6+7: Quest tracker, status icons, quest board, achievements
    if (typeof drawQuestTracker === 'function') drawQuestTracker(ctx, W, H);
    if (typeof drawStatusEffectIcons === 'function') drawStatusEffectIcons(ctx, W, H);
    if (typeof drawQuestBoardScreen === 'function') drawQuestBoardScreen(ctx, W, H);
    if (typeof drawAchievementScreen === 'function') drawAchievementScreen(ctx, W, H);
    drawEventBanner();

    // Overlays
    drawInventoryScreen(ctx, W, H);
    drawCraftingScreen(ctx, W, H);
    drawNPCShopScreen(ctx, W, H);
    drawNPCDialogueBox(ctx, W, H);
    drawPauseScreen(ctx, W, H);
    if (gameState === 'dead') drawDeathScreen(ctx, W, H);

    // Phase 4: Post-processing effects
    drawPostProcessing();

    // Phase 4: Cinematic letterboxing + boss title
    if (cinematicMode.active) {
        cinematicMode.timer--;
        // Letterbox bars
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, W, 60);
        ctx.fillRect(0, H - 60, W, 60);
        // Boss name
        ctx.fillStyle = '#CC1122'; ctx.font = 'bold 36px Creepster'; ctx.textAlign = 'center';
        ctx.fillText(cinematicMode.bossName, W / 2, H / 2 - 80);
        ctx.fillStyle = '#888'; ctx.font = '14px Inter';
        ctx.fillText('A terrible creature has awoken...', W / 2, H / 2 - 50);
        if (cinematicMode.timer <= 0) {
            cinematicMode.active = false;
            cinematicMode.zoom = 1; cinematicMode.targetZoom = 1;
        }
    }

    ctx.restore(); // End screen shake / cinematic transform

    // Phase 3: Speedrun timer
    if (speedrunActive) {
        const mins = Math.floor(speedrunTimer / 3600);
        const secs = Math.floor((speedrunTimer % 3600) / 60);
        const ms = Math.floor((speedrunTimer % 60) / 60 * 100);
        ctx.fillStyle = '#FFD700'; ctx.font = 'bold 14px monospace'; ctx.textAlign = 'left';
        ctx.fillText(`⏱ ${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`, 10, H - 20);
        if (speedrunSplits.length > 0) {
            ctx.font = '10px monospace'; ctx.fillStyle = '#aaa';
            for (let i = 0; i < Math.min(speedrunSplits.length, 4); i++) {
                const sp = speedrunSplits[i];
                ctx.fillText(`${sp.name}: ${Math.floor(sp.time / 3600)}:${Math.floor((sp.time % 3600) / 60).toString().padStart(2, '0')}`, 10, H - 36 - i * 14);
            }
        }
    }

    // Phase 3: Split-screen Player 2
    if (splitScreen && player2) {
        ctx.fillStyle = '#44AAFF'; ctx.font = '10px Inter'; ctx.textAlign = 'right';
        ctx.fillText('[F2] Split-Screen: ON', W - 16, H - 20);
        const skin2 = SKINS[player2.skin] || SKINS.default;
        ctx.fillStyle = skin2.body;
        ctx.fillRect(player2.x - cam.x, player2.y - cam.y, player2.w, player2.h);
        ctx.fillStyle = skin2.face;
        ctx.fillRect(player2.x - cam.x + 2, player2.y - cam.y + 2, 10, 8);
        ctx.fillStyle = skin2.eyes;
        ctx.fillRect(player2.x - cam.x + (player2.dir > 0 ? 7 : 3), player2.y - cam.y + 4, 3, 3);
        ctx.fillStyle = '#44AAFF'; ctx.font = '8px Inter'; ctx.textAlign = 'center';
        ctx.fillText('P2', player2.x - cam.x + player2.w / 2, player2.y - cam.y - 4);
    }

    // Phase 4: Touch controls overlay
    if (typeof drawTouchControls === 'function') drawTouchControls();

    // Phase 4: Boss Rush HUD
    if (bossRush.active) {
        ctx.fillStyle = '#FFD700'; ctx.font = 'bold 12px Inter'; ctx.textAlign = 'right';
        ctx.fillText(`BOSS RUSH: ${bossRush.current + 1}/${bossRush.queue.length}`, W - 16, 100);
        const elapsed = Math.floor((Date.now() - bossRush.startTime) / 1000);
        ctx.fillText(`Time: ${Math.floor(elapsed / 60)}:${(elapsed % 60).toString().padStart(2, '0')}`, W - 16, 114);
    }

    // Phase 4: Endless Dungeon HUD
    if (endlessMode.active) {
        ctx.fillStyle = '#44FF88'; ctx.font = 'bold 12px Inter'; ctx.textAlign = 'right';
        ctx.fillText(`ENDLESS: Floor ${endlessMode.floor}`, W - 16, 100);
        ctx.fillText(`Enemies: ${enemies.length}`, W - 16, 114);
    }

    // Phase 4: NG+ indicator
    if (ngPlusLevel > 0) {
        ctx.fillStyle = '#FF6600'; ctx.font = 'bold 10px Inter'; ctx.textAlign = 'right';
        ctx.fillText(`NG+${ngPlusLevel}`, W - 16, 130);
    }

    // Phase 4: Gamepad indicator
    if (gamepadConnected) {
        ctx.fillStyle = '#8888FF'; ctx.font = '9px Inter'; ctx.textAlign = 'left';
        ctx.fillText('🎮', 10, H - 40);
    }

    requestAnimationFrame(gameLoop);
}

// ===== INIT =====
function startGame(opts = {}) {
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('controls-overlay').style.display = 'flex';

    // Phase 3: Apply options
    if (opts.size) setWorldSize(opts.size);
    if (opts.seed) worldSeed = parseInt(opts.seed) || Date.now();
    if (opts.hardcore) hardcoreMode = true;
    if (opts.skin) playerSkin = opts.skin;
    if (opts.speedrun) { speedrunActive = true; speedrunTimer = 0; }

    // Phase 3: Check for continue
    if (opts.continue && hasSave()) {
        if (loadGame()) {
            initAudio();
            setTimeout(() => {
                document.getElementById('controls-overlay').style.display = 'none';
                gameState = 'playing';
                updateLighting(cam.x, cam.y, W, H);
                gameLoop();
            }, 1500);
            return;
        }
    }

    // Init world arrays
    initWorld();

    // ===== LOADING SCREEN =====
    const loadingScreen = document.getElementById('loading-screen');
    const loadingBar = document.getElementById('loading-bar');
    const loadingStatus = document.getElementById('loading-status');
    const loadingTip = document.getElementById('loading-tip');
    const tips = [
        '"The deeper you dig, the darker things get..."',
        '"Lava flows beneath the frozen crypt..."',
        '"Something watches from the flesh tunnels..."',
        '"The hive hums with ancient malice..."',
        '"Mine ores to forge weapons of power..."',
        '"The void awaits those who dare descend..."',
        '"Bones of the forgotten line these cavern walls..."',
        '"Hell expands endlessly at the world\'s bottom..."',
    ];
    loadingTip.textContent = tips[Math.floor(Math.random() * tips.length)];
    loadingScreen.classList.add('active');

    function updateLoading(pct, msg) {
        return new Promise(resolve => {
            loadingBar.style.width = pct + '%';
            loadingStatus.textContent = msg;
            requestAnimationFrame(() => setTimeout(resolve, 50));
        });
    }

    (async () => {
        await updateLoading(5, 'Carving terrain...');
        heights = generateWorld();
        await updateLoading(60, 'Placing ores and lava...');
        await updateLoading(70, 'Growing trees and foliage...');
        await updateLoading(80, 'Building structures...');

        // Init player
        initPlayer(heights);
        await updateLoading(85, 'Summoning player...');

        // Phase 2: Init audio
        initAudio();
        await updateLoading(90, 'Initializing audio...');

        // Phase 2: Spawn initial corruption source
        if (Math.random() < 0.5) {
            const cx = Math.floor(WORLD_W * (0.3 + Math.random() * 0.4));
            const cy = CAVE_Y + Math.floor(Math.random() * (MUSH_Y - CAVE_Y));
            corruptionSources.push({ x: cx, y: cy });
            setBlock(cx, cy, T.CORRUPTION);
        }

        // Phase 2/3: Place NPC cages
        const cageCount = Math.max(3, Math.floor(WORLD_W / 200));
        for (let i = 0; i < cageCount; i++) {
            const nx = 30 + Math.floor(Math.random() * (WORLD_W - 60));
            const ny = CAVE_Y + 10 + Math.floor(Math.random() * (FLESH_Y - CAVE_Y - 20));
            if (getBlock(nx, ny) === T.AIR) setBlock(nx, ny, T.NPC_CAGE);
        }

        await updateLoading(95, 'Calculating lighting...');
        updateLighting(cam.x, cam.y, W, H);

        await updateLoading(100, 'World ready!');

        // Phase 3: Leaderboard setup
        if (typeof Leaderboards !== 'undefined') {
            Leaderboards.submitScore('cursed-depths', 'Player', 0, { type: 'start' });
        }

        // ===== BIOME MUSIC SYSTEM =====
        if (!window._biomeMusic) {
            window._biomeMusic = {
                grass: new Audio('GrassTheme.mp3'),
                underground: new Audio('Underground.mp3'),
                mushroom: new Audio('GlowingMushroom.mp3'),
                hell: new Audio('HellTheme.mp3'),
                current: null
            };
            const bm = window._biomeMusic;
            [bm.grass, bm.underground, bm.mushroom, bm.hell].forEach(a => {
                a.loop = true;
                a.volume = 0;
                a.preload = 'auto';
            });
        }

        setTimeout(() => {
            loadingScreen.classList.remove('active');
            document.getElementById('controls-overlay').style.display = 'none';
            gameState = 'playing';
            gameLoop();
        }, 500);
    })();
}

// Phase 3: Death handler with hardcore check
function respawn() {
    if (hardcoreMode) {
        deleteSave();
        gameState = 'menu';
        document.getElementById('start-screen').style.display = 'flex';
        return;
    }
    player.hp = player.maxHp;
    player.mana = player.maxMana;
    player.x = (WORLD_W / 2) * TILE;
    player.y = (SURFACE_Y - 5) * TILE;
    player.vx = 0; player.vy = 0;
    gameState = 'playing';
    // Submit depth leaderboard on death
    const depth = Math.max(0, Math.floor(player.y / TILE) - SURFACE_Y);
    if (typeof Leaderboards !== 'undefined') {
        Leaderboards.submitScore('cursed-depths', 'Player', depth, { type: 'depth', level: player.level });
    }
}

document.getElementById('start-btn').addEventListener('click', () => {
    const seedInput = document.getElementById('seed-input');
    const sizeSelect = document.getElementById('size-select');
    const skinSelect = document.getElementById('skin-select');
    const hardcoreCheck = document.getElementById('hardcore-check');
    const speedrunCheck = document.getElementById('speedrun-check');
    startGame({
        seed: seedInput ? seedInput.value : '',
        size: sizeSelect ? sizeSelect.value : 'medium',
        skin: skinSelect ? skinSelect.value : 'default',
        hardcore: hardcoreCheck ? hardcoreCheck.checked : false,
        speedrun: speedrunCheck ? speedrunCheck.checked : false
    });
});

// Phase 3: Continue button
const contBtn = document.getElementById('continue-btn');
if (contBtn) {
    contBtn.addEventListener('click', () => startGame({ continue: true }));
    contBtn.style.display = hasSave() ? 'block' : 'none';
}

// ===== PHASE 4: ENDGAME MODE BUTTONS =====
const bossRushBtn = document.getElementById('boss-rush-btn');
if (bossRushBtn) bossRushBtn.addEventListener('click', () => {
    startGame({ size: 'small' });
    setTimeout(() => { startBossRush(); eventBannerText = 'BOSS RUSH!'; eventBannerTimer = 180; }, 3500);
});

const endlessBtn = document.getElementById('endless-btn');
if (endlessBtn) endlessBtn.addEventListener('click', () => {
    startGame({ size: 'medium' });
    setTimeout(() => { endlessMode.active = true; generateEndlessFloor(1); eventBannerText = 'ENDLESS DUNGEON - FLOOR 1'; eventBannerTimer = 180; }, 3500);
});

const dailyBtn = document.getElementById('daily-btn');
if (dailyBtn) dailyBtn.addEventListener('click', () => {
    const daily = getDailyChallenge();
    startGame({ seed: String(daily.seed), size: 'medium' });
    setTimeout(() => { eventBannerText = `DAILY: ${daily.name} — ${daily.desc}`; eventBannerTimer = 300; }, 3500);
});

// ===== PHASE 4: PAUSE MENU CLICK HANDLER =====
canvas.addEventListener('click', e => {
    if (!showPause) return;

    // Check pause menu buttons
    const btnW = 180, btnH = 36;
    const btns = ['settings', 'saveslots', 'export', 'import'];
    for (let i = 0; i < btns.length; i++) {
        const bx = W / 2 - btnW / 2, by = H / 2 - 50 + i * 44;
        if (e.offsetX >= bx && e.offsetX <= bx + btnW && e.offsetY >= by && e.offsetY <= by + btnH) {
            if (btns[i] === 'settings') { showSettings = !showSettings; showSaveSlots = false; }
            else if (btns[i] === 'saveslots') { showSaveSlots = !showSaveSlots; showSettings = false; }
            else if (btns[i] === 'export') downloadMapFile();
            else if (btns[i] === 'import') uploadMapFile();
            return;
        }
    }

    // Settings click handling
    if (showSettings) {
        const panW = 400, panH = 340;
        const px = (W - panW) / 2, py = (H - panH) / 2;
        const settingKeys = ['renderQuality', 'particleDensity', 'lightingQuality', 'screenShakeEnabled', 'bloomEnabled', 'colorblindMode', 'musicVolume', 'sfxVolume'];
        const cycles = {
            renderQuality: ['low', 'medium', 'high'],
            lightingQuality: ['none', 'simple', 'full'],
            colorblindMode: ['none', 'protanopia', 'deuteranopia', 'tritanopia'],
        };
        for (let i = 0; i < settingKeys.length; i++) {
            const sy = py + 43 + i * 34;
            if (e.offsetY >= sy && e.offsetY <= sy + 30 && e.offsetX >= px && e.offsetX <= px + panW) {
                const key = settingKeys[i];
                if (cycles[key]) {
                    const opts = cycles[key];
                    const idx = opts.indexOf(gameSettings[key]);
                    gameSettings[key] = opts[(idx + 1) % opts.length];
                } else if (typeof gameSettings[key] === 'boolean') {
                    gameSettings[key] = !gameSettings[key];
                } else if (typeof gameSettings[key] === 'number') {
                    gameSettings[key] = Math.round(((gameSettings[key] + 0.25) % 1.25) * 100) / 100;
                    if (gameSettings[key] > 1) gameSettings[key] = 0;
                }
                saveSettings();
                // Apply settings
                if (key === 'screenShakeEnabled' && !gameSettings.screenShakeEnabled) screenShake.intensity = 0;
                if (key === 'bloomEnabled') postProcess.bloom = gameSettings.bloomEnabled ? 0.15 : 0;
                return;
            }
        }
    }

    // Save slots click handling
    if (showSaveSlots) {
        const panW = 420, panH = 280;
        const px = (W - panW) / 2, py = (H - panH) / 2;
        for (let i = 0; i < 3; i++) {
            const sy = py + 50 + i * 70;
            for (let b = 0; b < 3; b++) {
                const bx = px + panW - 28 - (2 - b) * 52, by2 = sy + 42;
                if (e.offsetX >= bx && e.offsetX <= bx + 48 && e.offsetY >= by2 && e.offsetY <= by2 + 14) {
                    if (b === 0) { saveToSlot(i); eventBannerText = `Saved to Slot ${i + 1}`; eventBannerTimer = 90; }
                    else if (b === 1) { if (loadFromSlot(i)) { eventBannerText = `Loaded Slot ${i + 1}`; eventBannerTimer = 90; showPause = false; showSaveSlots = false; } }
                    else if (b === 2) { deleteSlot(i); }
                    return;
                }
            }
        }
    }
});

/* ============================================
   Cursed Sands — Phase 3: Combat, Tools & Upgrade System
   Weapons, inventory, crafting, Ankh upgrades
   ============================================ */
var CombatSystem = (function () {
    'use strict';

    // ============ WEAPONS ============
    var weapons = {
        khopesh: { name: 'Bronze Khopesh', dmg: 25, range: 2.5, speed: 0.5, unlocked: false, combo: 0, comboTimer: 0, parryWindow: 0 },
        torch_throw: { name: 'Throwable Torch', dmg: 15, range: 20, speed: 1.0, unlocked: false, ammo: 5 },
        shield: { name: 'Shield of Ra', dmg: 0, range: 4, speed: 2.0, unlocked: false, charge: 100, maxCharge: 100 },
        bow: { name: 'Desert Bow', dmg: 20, range: 30, speed: 0.8, unlocked: false, ammo: 10, arrowType: 'normal' },
        staff: { name: 'Sacred Staff', dmg: 40, range: 6, speed: 3.0, unlocked: false, energy: 0, maxEnergy: 100 }
    };
    var equippedWeapon = null;
    var attackCooldown = 0;
    var isAttacking = false, isParrying = false, isBlocking = false;
    var attackAnim = 0; // 0-1 animation progress
    var weaponMeshes = {};
    var projectiles = [];
    var activeEffects = []; // visual effects (fire pools, shield barriers, etc.)

    // ============ INVENTORY ============
    var MAX_SLOTS = 8;
    var inventory = [];
    var ITEMS = {
        health_potion: { name: 'Health Salve', icon: '🧴', stackable: true, maxStack: 5, effect: function () { return { type: 'heal', value: 25 }; } },
        sanity_elixir: { name: 'Sanity Elixir', icon: '🧪', stackable: true, maxStack: 5, effect: function () { return { type: 'sanity', value: 30 }; } },
        smoke_bomb: { name: 'Smoke Bomb', icon: '💨', stackable: true, maxStack: 3, effect: function () { return { type: 'smoke', value: 5 }; } },
        fire_arrow: { name: 'Fire Arrow', icon: '🔥', stackable: true, maxStack: 10, effect: function () { return { type: 'ammo', weapon: 'bow', arrowType: 'fire' }; } },
        stun_arrow: { name: 'Stun Arrow', icon: '⚡', stackable: true, maxStack: 10, effect: function () { return { type: 'ammo', weapon: 'bow', arrowType: 'stun' }; } },
        explosive_arrow: { name: 'Explosive Arrow', icon: '💥', stackable: true, maxStack: 5, effect: function () { return { type: 'ammo', weapon: 'bow', arrowType: 'explosive' }; } },
        bandage: { name: 'Linen Bandage', icon: '🩹', stackable: true, maxStack: 5, effect: function () { return { type: 'heal', value: 15 }; } },
        torch_refill: { name: 'Oil Flask', icon: '🛢️', stackable: true, maxStack: 3, effect: function () { return { type: 'ammo', weapon: 'torch_throw', value: 3 }; } }
    };

    // ============ CRAFTING ============
    var RECIPES = [
        { id: 'bandage', result: 'bandage', resultQty: 2, ingredients: [{ id: 'linen', qty: 1 }, { id: 'resin', qty: 1 }], name: 'Linen Bandage' },
        { id: 'torch_refill', result: 'torch_refill', resultQty: 1, ingredients: [{ id: 'flint', qty: 1 }, { id: 'palm_wood', qty: 1 }], name: 'Oil Flask' },
        { id: 'fire_arrow', result: 'fire_arrow', resultQty: 3, ingredients: [{ id: 'reed', qty: 2 }, { id: 'resin', qty: 1 }], name: 'Fire Arrow x3' },
        { id: 'stun_arrow', result: 'stun_arrow', resultQty: 3, ingredients: [{ id: 'reed', qty: 2 }, { id: 'lightning_shard', qty: 1 }], name: 'Stun Arrow x3' },
        { id: 'smoke_bomb', result: 'smoke_bomb', resultQty: 1, ingredients: [{ id: 'sulfur', qty: 1 }, { id: 'linen', qty: 1 }], name: 'Smoke Bomb' },
        { id: 'health_potion', result: 'health_potion', resultQty: 1, ingredients: [{ id: 'lotus', qty: 2 }, { id: 'water_vial', qty: 1 }], name: 'Health Salve' },
    ];
    var materials = {}; // { materialId: quantity }

    // ============ MATERIAL DEFS ============
    var MATERIALS = {
        linen: { name: 'Linen Strips', icon: '🧶' }, resin: { name: 'Tree Resin', icon: '🫗' },
        flint: { name: 'Flint Stone', icon: '🪨' }, palm_wood: { name: 'Palm Wood', icon: '🪵' },
        reed: { name: 'River Reed', icon: '🌿' }, lightning_shard: { name: 'Lightning Shard', icon: '⚡' },
        sulfur: { name: 'Sulfur Dust', icon: '🟡' }, lotus: { name: 'Blue Lotus', icon: '🪷' },
        water_vial: { name: 'Nile Water', icon: '💧' }
    };

    // ============ UPGRADE SYSTEM ============
    var ankhTokens = 0;
    var upgrades = {
        sprint_speed: { name: 'Swift Feet', desc: '+20% sprint speed', level: 0, maxLevel: 3, cost: [5, 10, 20], effect: 'sprint' },
        stamina: { name: 'Endurance', desc: '+25% stamina', level: 0, maxLevel: 3, cost: [5, 10, 20], effect: 'stamina' },
        torch_power: { name: 'Blazing Light', desc: '+30% torch brightness & range', level: 0, maxLevel: 3, cost: [5, 8, 15], effect: 'torch' },
        sanity_resist: { name: 'Iron Mind', desc: '+20% sanity resistance', level: 0, maxLevel: 3, cost: [8, 15, 25], effect: 'sanity' },
        melee_damage: { name: 'Honed Edge', desc: '+25% melee damage', level: 0, maxLevel: 3, cost: [5, 12, 20], effect: 'melee' },
        bow_damage: { name: 'Eagle Eye', desc: '+20% bow damage', level: 0, maxLevel: 3, cost: [5, 12, 20], effect: 'bow' },
        shield_dur: { name: "Ra's Blessing", desc: '+30% shield duration', level: 0, maxLevel: 3, cost: [8, 15, 25], effect: 'shield' },
        staff_power: { name: 'Divine Channel', desc: '+25% staff damage', level: 0, maxLevel: 3, cost: [10, 18, 30], effect: 'staff' },
    };

    // Scene reference
    var _scene = null, _camera = null;

    // ============ BUILD ============
    function build(scene, camera) {
        _scene = scene; _camera = camera;
        equippedWeapon = null; attackCooldown = 0;
        isAttacking = false; isParrying = false; isBlocking = false;
        projectiles = []; activeEffects = [];
        inventory = []; materials = {}; ankhTokens = 0;
        attackAnim = 0;
        // Reset weapons
        Object.keys(weapons).forEach(function (k) { weapons[k].unlocked = false; weapons[k].combo = 0; });
        weapons.shield.charge = 100; weapons.staff.energy = 0;
        weapons.torch_throw.ammo = 5; weapons.bow.ammo = 10;
        weaponMeshes = {};
        // Give starter items
        addMaterial('linen', 3); addMaterial('resin', 2); addMaterial('reed', 4);
        addMaterial('palm_wood', 2); addMaterial('flint', 2);
        // Build weapon meshes (attached to camera)
        buildWeaponModels(scene, camera);
        // Scatter material pickups in world
        scatterMaterials(scene);
    }

    function buildWeaponModels(scene, camera) {
        // Khopesh — curved bronze sword
        var kGroup = new THREE.Group();
        var bladeMat = new THREE.MeshStandardMaterial({ color: 0xcd7f32, metalness: 0.8, roughness: 0.3 });
        var blade = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.6, 0.02), bladeMat);
        blade.position.set(0.35, -0.1, -0.5); kGroup.add(blade);
        var curve = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.06, 0.02), bladeMat);
        curve.position.set(0.4, 0.2, -0.5); curve.rotation.z = -0.3; kGroup.add(curve);
        var handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.2),
            new THREE.MeshStandardMaterial({ color: 0x4a3520 }));
        handle.position.set(0.35, -0.3, -0.5); kGroup.add(handle);
        kGroup.visible = false; camera.add(kGroup);
        weaponMeshes.khopesh = kGroup;

        // Shield of Ra — golden disc
        var sGroup = new THREE.Group();
        var disc = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.03, 16),
            new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9, roughness: 0.2 }));
        disc.rotation.x = Math.PI / 2;
        disc.position.set(-0.4, -0.1, -0.5); sGroup.add(disc);
        var eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8),
            new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 0.8 }));
        eye.position.set(-0.4, -0.1, -0.52); sGroup.add(eye);
        sGroup.visible = false; camera.add(sGroup);
        weaponMeshes.shield = sGroup;

        // Bow
        var bGroup = new THREE.Group();
        var bowMat = new THREE.MeshStandardMaterial({ color: 0x5c3a1e, roughness: 0.7 });
        var bowBody = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.015, 6, 16, Math.PI), bowMat);
        bowBody.position.set(0.35, -0.05, -0.5); bowBody.rotation.z = Math.PI / 2;
        bGroup.add(bowBody);
        var string = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.5),
            new THREE.MeshStandardMaterial({ color: 0xccccaa }));
        string.position.set(0.35, -0.05, -0.5); bGroup.add(string);
        bGroup.visible = false; camera.add(bGroup);
        weaponMeshes.bow = bGroup;

        // Sacred Staff
        var stGroup = new THREE.Group();
        var staffBody = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 1.2),
            new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.7, roughness: 0.3 }));
        staffBody.position.set(0.35, -0.2, -0.5); stGroup.add(staffBody);
        var orb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8),
            new THREE.MeshStandardMaterial({ color: 0x00ccff, emissive: 0x0088ff, emissiveIntensity: 0.6 }));
        orb.position.set(0.35, 0.4, -0.5); stGroup.add(orb);
        stGroup.visible = false; camera.add(stGroup);
        weaponMeshes.staff = stGroup;
    }

    function scatterMaterials(scene) {
        var matTypes = ['linen', 'resin', 'flint', 'palm_wood', 'reed', 'sulfur', 'lotus', 'water_vial', 'lightning_shard'];
        var matColors = [0xeeeecc, 0xaa7733, 0x888888, 0x6b4226, 0x44aa44, 0xdddd44, 0x4488ff, 0x44aadd, 0xffff88];
        for (var i = 0; i < 40; i++) {
            var idx = Math.floor(Math.random() * matTypes.length);
            var px = (Math.random() - 0.5) * 180;
            var pz = (Math.random() - 0.5) * 180;
            if (Math.abs(px + 40) < 12) continue; // skip river
            var pickup = new THREE.Mesh(new THREE.SphereGeometry(0.2, 6, 6),
                new THREE.MeshStandardMaterial({ color: matColors[idx], emissive: matColors[idx], emissiveIntensity: 0.3 }));
            pickup.position.set(px, 0.3, pz);
            scene.add(pickup);
            var glow = new THREE.PointLight(matColors[idx], 0.15, 3);
            glow.position.set(px, 0.5, pz); scene.add(glow);
            activeEffects.push({ type: 'material_pickup', mesh: pickup, light: glow, x: px, z: pz, matType: matTypes[idx], collected: false });
        }
    }

    // ============ EQUIP / SWITCH ============
    function equipWeapon(id) {
        if (!weapons[id] || !weapons[id].unlocked) return false;
        Object.keys(weaponMeshes).forEach(function (k) { if (weaponMeshes[k]) weaponMeshes[k].visible = false; });
        equippedWeapon = id;
        if (weaponMeshes[id]) weaponMeshes[id].visible = true;
        return true;
    }

    function unlockWeapon(id) {
        if (weapons[id]) { weapons[id].unlocked = true; return true; }
        return false;
    }

    // ============ ATTACK ============
    function attack(playerX, playerZ, yaw, enemies) {
        if (attackCooldown > 0 || !equippedWeapon) return null;
        var w = weapons[equippedWeapon];
        if (!w || !w.unlocked) return null;
        attackCooldown = w.speed;
        isAttacking = true; attackAnim = 0;
        var results = [];
        var dmgMult = 1 + (upgrades.melee_damage.level * 0.25);
        var bowMult = 1 + (upgrades.bow_damage.level * 0.2);
        var staffMult = 1 + (upgrades.staff_power.level * 0.25);

        if (equippedWeapon === 'khopesh') {
            // Melee — hit enemies in front arc
            w.combo = Math.min(3, w.combo + 1);
            w.comboTimer = 1.5;
            var comboDmg = w.dmg * dmgMult * (1 + w.combo * 0.15);
            var dir = { x: -Math.sin(yaw), z: -Math.cos(yaw) };
            enemies.forEach(function (e) {
                var dx = e.x - playerX, dz = e.z - playerZ;
                var dist = Math.sqrt(dx * dx + dz * dz);
                if (dist < w.range) {
                    var dot = (dx * dir.x + dz * dir.z) / dist;
                    if (dot > 0.3) { results.push({ enemy: e, damage: comboDmg, type: 'melee' }); }
                }
            });
        } else if (equippedWeapon === 'bow') {
            if (w.ammo <= 0) return null;
            w.ammo--;
            var arrowDmg = w.dmg * bowMult;
            var arrowType = w.arrowType || 'normal';
            // Spawn projectile
            var dir = { x: -Math.sin(yaw), z: -Math.cos(yaw) };
            projectiles.push({
                x: playerX, z: playerZ, y: 1.5, dx: dir.x * 25, dz: dir.z * 25,
                dmg: arrowDmg, type: arrowType, life: 2, radius: arrowType === 'explosive' ? 5 : 1.5
            });
            if (arrowType === 'fire') arrowDmg *= 1.5;
            if (arrowType === 'explosive') arrowDmg *= 2;
        } else if (equippedWeapon === 'shield') {
            // Shield blast — push back enemies
            if (w.charge < 20) return null;
            w.charge -= 20;
            var shieldMult = 1 + (upgrades.shield_dur.level * 0.3);
            enemies.forEach(function (e) {
                var dx = e.x - playerX, dz = e.z - playerZ;
                var dist = Math.sqrt(dx * dx + dz * dz);
                if (dist < w.range * shieldMult) {
                    var pushDist = 5 / Math.max(1, dist);
                    e.x += (dx / dist) * pushDist;
                    e.z += (dz / dist) * pushDist;
                    results.push({ enemy: e, damage: 5, type: 'shield_push' });
                }
            });
            // Light barrier effect
            var barrier = new THREE.Mesh(new THREE.RingGeometry(0.5, w.range * shieldMult, 16),
                new THREE.MeshStandardMaterial({ color: 0xffd700, emissive: 0xffaa00, emissiveIntensity: 1, transparent: true, opacity: 0.4, side: THREE.DoubleSide }));
            barrier.rotation.x = -Math.PI / 2;
            barrier.position.set(playerX, 0.5, playerZ);
            if (_scene) _scene.add(barrier);
            activeEffects.push({ type: 'barrier', mesh: barrier, life: 0.8 });
        } else if (equippedWeapon === 'torch_throw') {
            if (w.ammo <= 0) return null;
            w.ammo--;
            var dir = { x: -Math.sin(yaw), z: -Math.cos(yaw) };
            // Fire pool at landing spot
            var landX = playerX + dir.x * 8, landZ = playerZ + dir.z * 8;
            var fire = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.1, 8),
                new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 1, transparent: true, opacity: 0.6 }));
            fire.position.set(landX, 0.1, landZ);
            if (_scene) _scene.add(fire);
            var fLight = new THREE.PointLight(0xff6600, 1, 8);
            fLight.position.set(landX, 1, landZ);
            if (_scene) _scene.add(fLight);
            activeEffects.push({ type: 'fire_pool', mesh: fire, light: fLight, x: landX, z: landZ, life: 8, dmg: 10 });
            // Scare enemies
            enemies.forEach(function (e) {
                var dx = e.x - landX, dz = e.z - landZ;
                if (Math.sqrt(dx * dx + dz * dz) < 6) {
                    e.state = 'flee'; e.alertTimer = 5;
                    results.push({ enemy: e, damage: w.dmg, type: 'fire' });
                }
            });
        } else if (equippedWeapon === 'staff') {
            if (w.energy < 30) return null;
            w.energy -= 30;
            var staffDmg = w.dmg * staffMult;
            // AoE blast
            var blast = new THREE.Mesh(new THREE.SphereGeometry(w.range, 12, 12),
                new THREE.MeshStandardMaterial({ color: 0x00ccff, emissive: 0x0088ff, emissiveIntensity: 1.5, transparent: true, opacity: 0.3 }));
            blast.position.set(playerX, 1, playerZ);
            if (_scene) _scene.add(blast);
            activeEffects.push({ type: 'blast', mesh: blast, life: 0.5 });
            enemies.forEach(function (e) {
                var dx = e.x - playerX, dz = e.z - playerZ;
                if (Math.sqrt(dx * dx + dz * dz) < w.range) {
                    results.push({ enemy: e, damage: staffDmg, type: 'divine' });
                }
            });
        }
        return results.length > 0 ? results : null;
    }

    // Parry — brief window to deflect
    function startParry() {
        if (equippedWeapon !== 'khopesh' || attackCooldown > 0) return;
        isParrying = true;
        weapons.khopesh.parryWindow = 0.3;
    }

    // Block — shield absorbs damage
    function startBlock() {
        if (equippedWeapon !== 'shield') return;
        isBlocking = true;
    }
    function stopBlock() { isBlocking = false; }

    function checkParry() {
        if (isParrying && weapons.khopesh.parryWindow > 0) return true;
        return false;
    }
    function checkBlock() {
        if (isBlocking && equippedWeapon === 'shield' && weapons.shield.charge > 0) {
            weapons.shield.charge -= 5;
            return true;
        }
        return false;
    }

    // ============ INVENTORY ============
    function addItem(itemId, qty) {
        qty = qty || 1;
        var def = ITEMS[itemId]; if (!def) return false;
        // Stack into existing slot
        for (var i = 0; i < inventory.length; i++) {
            if (inventory[i].id === itemId && def.stackable && inventory[i].qty < def.maxStack) {
                var space = def.maxStack - inventory[i].qty;
                var add = Math.min(space, qty);
                inventory[i].qty += add; qty -= add;
                if (qty <= 0) return true;
            }
        }
        // New slot
        while (qty > 0 && inventory.length < MAX_SLOTS) {
            var add = def.stackable ? Math.min(qty, def.maxStack) : 1;
            inventory.push({ id: itemId, qty: add });
            qty -= add;
        }
        return qty <= 0;
    }

    function useItem(slotIndex) {
        if (slotIndex < 0 || slotIndex >= inventory.length) return null;
        var slot = inventory[slotIndex];
        var def = ITEMS[slot.id]; if (!def) return null;
        var eff = def.effect();
        slot.qty--;
        if (slot.qty <= 0) inventory.splice(slotIndex, 1);
        return eff;
    }

    function addMaterial(matId, qty) {
        materials[matId] = (materials[matId] || 0) + qty;
    }

    function craft(recipeId) {
        var recipe = RECIPES.find(function (r) { return r.id === recipeId; });
        if (!recipe) return false;
        // Check materials
        for (var i = 0; i < recipe.ingredients.length; i++) {
            if ((materials[recipe.ingredients[i].id] || 0) < recipe.ingredients[i].qty) return false;
        }
        // Consume materials
        recipe.ingredients.forEach(function (ing) { materials[ing.id] -= ing.qty; });
        // Produce item
        addItem(recipe.result, recipe.resultQty);
        return true;
    }

    // ============ UPGRADES ============
    function buyUpgrade(id) {
        var upg = upgrades[id]; if (!upg || upg.level >= upg.maxLevel) return false;
        var cost = upg.cost[upg.level]; if (ankhTokens < cost) return false;
        ankhTokens -= cost;
        upg.level++;
        return true;
    }

    function getUpgradeEffects() {
        return {
            sprintMult: 1 + upgrades.sprint_speed.level * 0.2,
            torchMult: 1 + upgrades.torch_power.level * 0.3,
            sanityMult: 1 - upgrades.sanity_resist.level * 0.2,
            meleeMult: 1 + upgrades.melee_damage.level * 0.25,
            bowMult: 1 + upgrades.bow_damage.level * 0.2,
            shieldMult: 1 + upgrades.shield_dur.level * 0.3,
            staffMult: 1 + upgrades.staff_power.level * 0.25,
        };
    }

    // ============ UPDATE ============
    function update(dt, playerX, playerZ, playerY, sunY, isNight, enemies) {
        // Attack cooldown
        if (attackCooldown > 0) attackCooldown -= dt;
        if (isAttacking) { attackAnim += dt * 4; if (attackAnim >= 1) { isAttacking = false; attackAnim = 0; } }

        // Khopesh combo timer decay
        if (weapons.khopesh.comboTimer > 0) {
            weapons.khopesh.comboTimer -= dt;
            if (weapons.khopesh.comboTimer <= 0) weapons.khopesh.combo = 0;
        }
        // Parry window
        if (isParrying) {
            weapons.khopesh.parryWindow -= dt;
            if (weapons.khopesh.parryWindow <= 0) isParrying = false;
        }
        // Shield recharge (slow)
        if (weapons.shield.unlocked && weapons.shield.charge < weapons.shield.maxCharge) {
            weapons.shield.charge = Math.min(weapons.shield.maxCharge, weapons.shield.charge + dt * 3);
        }
        // Staff solar recharge — only during daytime
        if (weapons.staff.unlocked && !isNight && sunY > 0) {
            weapons.staff.energy = Math.min(weapons.staff.maxEnergy, weapons.staff.energy + dt * (sunY / 80) * 8);
        }

        // Animate weapon meshes
        if (isAttacking && equippedWeapon === 'khopesh' && weaponMeshes.khopesh) {
            weaponMeshes.khopesh.rotation.z = Math.sin(attackAnim * Math.PI) * 0.8;
            weaponMeshes.khopesh.rotation.x = Math.sin(attackAnim * Math.PI) * 0.3;
        } else if (weaponMeshes.khopesh) {
            weaponMeshes.khopesh.rotation.z = 0; weaponMeshes.khopesh.rotation.x = 0;
        }

        // Projectiles
        var projResults = [];
        for (var pi = projectiles.length - 1; pi >= 0; pi--) {
            var p = projectiles[pi];
            p.x += p.dx * dt; p.z += p.dz * dt; p.life -= dt;
            if (p.life <= 0) { projectiles.splice(pi, 1); continue; }
            // Check enemy hits
            enemies.forEach(function (e) {
                var dx = e.x - p.x, dz = e.z - p.z;
                var dist = Math.sqrt(dx * dx + dz * dz);
                if (dist < p.radius) {
                    projResults.push({ enemy: e, damage: p.dmg, type: p.type });
                    if (p.type === 'stun') e.alertTimer = -3; // stun for 3s
                    if (p.type === 'explosive') {
                        // AoE damage to nearby
                        enemies.forEach(function (e2) {
                            if (e2 === e) return;
                            var d2 = Math.sqrt((e2.x - p.x) * (e2.x - p.x) + (e2.z - p.z) * (e2.z - p.z));
                            if (d2 < 5) projResults.push({ enemy: e2, damage: p.dmg * 0.5, type: 'explosive_aoe' });
                        });
                    }
                    p.life = 0;
                }
            });
        }

        // Active effects (fire pools, barriers, blasts)
        for (var ei = activeEffects.length - 1; ei >= 0; ei--) {
            var eff = activeEffects[ei];
            if (eff.type === 'material_pickup') {
                // Check player pickup
                if (!eff.collected) {
                    var dx = playerX - eff.x, dz = playerZ - eff.z;
                    if (Math.sqrt(dx * dx + dz * dz) < 1.5) {
                        eff.collected = true;
                        addMaterial(eff.matType, 1);
                        if (eff.mesh) eff.mesh.visible = false;
                        if (eff.light) eff.light.intensity = 0;
                        projResults.push({ type: 'material', matType: eff.matType });
                    }
                }
                continue;
            }
            eff.life -= dt;
            if (eff.life <= 0) {
                if (eff.mesh && _scene) _scene.remove(eff.mesh);
                if (eff.light && _scene) _scene.remove(eff.light);
                activeEffects.splice(ei, 1);
                continue;
            }
            // Fire pool DOT
            if (eff.type === 'fire_pool') {
                enemies.forEach(function (e) {
                    var dx = e.x - eff.x, dz = e.z - eff.z;
                    if (Math.sqrt(dx * dx + dz * dz) < 2) {
                        projResults.push({ enemy: e, damage: eff.dmg * dt, type: 'fire_dot' });
                    }
                });
                // Flicker
                if (eff.mesh) eff.mesh.material.opacity = 0.3 + Math.sin(Date.now() * 0.01) * 0.2;
            }
            // Fade out blasts/barriers
            if (eff.type === 'blast' || eff.type === 'barrier') {
                if (eff.mesh) {
                    eff.mesh.material.opacity = eff.life * 0.6;
                    if (eff.type === 'blast') eff.mesh.scale.multiplyScalar(1 + dt * 3);
                }
            }
        }

        return projResults;
    }

    function reset() {
        equippedWeapon = null; attackCooldown = 0; isAttacking = false; isParrying = false;
        projectiles = []; activeEffects = []; inventory = []; materials = {};
        ankhTokens = 0; weaponMeshes = {};
        Object.keys(weapons).forEach(function (k) { weapons[k].unlocked = false; weapons[k].combo = 0; });
        Object.keys(upgrades).forEach(function (k) { upgrades[k].level = 0; });
    }

    return {
        build: build, update: update, reset: reset,
        attack: attack, equipWeapon: equipWeapon, unlockWeapon: unlockWeapon,
        startParry: startParry, startBlock: startBlock, stopBlock: stopBlock,
        checkParry: checkParry, checkBlock: checkBlock,
        addItem: addItem, useItem: useItem, addMaterial: addMaterial, craft: craft,
        buyUpgrade: buyUpgrade, getUpgradeEffects: getUpgradeEffects,
        getWeapons: function () { return weapons; },
        getInventory: function () { return inventory; },
        getMaterials: function () { return materials; },
        getUpgrades: function () { return upgrades; },
        getAnkhTokens: function () { return ankhTokens; },
        addAnkhTokens: function (n) { ankhTokens += n; },
        getRecipes: function () { return RECIPES; },
        getEquipped: function () { return equippedWeapon; },
        getItems: function () { return ITEMS; },
        getMaterialDefs: function () { return MATERIALS; },
        isAttacking: function () { return isAttacking; },
        setArrowType: function (t) { weapons.bow.arrowType = t; }
    };
})();

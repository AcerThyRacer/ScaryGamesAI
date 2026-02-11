/* ============================================
   Cursed Sands — Phase 12: Meta-Progression
   Prestige, roguelike mode, events,
   achievements, camp customization
   ============================================ */
var MetaProgression = (function () {
    'use strict';

    // ============ PRESTIGE SYSTEM ============
    var prestige = {
        level: 0,
        totalXP: 0,
        currency: 0, // Eternal Ankhs
        bonuses: {
            xpMult: 1,
            lootMult: 1,
            startGold: 0,
            extraHP: 0,
            statBonus: 0
        }
    };

    var PRESTIGE_COSTS = [0, 1000, 3000, 7000, 15000, 30000, 60000, 120000];

    function canPrestige() {
        return prestige.totalXP >= (PRESTIGE_COSTS[prestige.level + 1] || Infinity);
    }

    function doPrestige() {
        if (!canPrestige()) return false;
        prestige.level++;
        prestige.currency += prestige.level * 10;
        // Scaling bonuses
        prestige.bonuses.xpMult = 1 + prestige.level * 0.1;
        prestige.bonuses.lootMult = 1 + prestige.level * 0.08;
        prestige.bonuses.startGold = prestige.level * 25;
        prestige.bonuses.extraHP = prestige.level * 10;
        prestige.bonuses.statBonus = prestige.level;
        return true;
    }

    // ============ ROGUELIKE MODE ============
    var roguelike = {
        active: false,
        floor: 1,
        seed: 0,
        modifiers: [],
        lootMultiplier: 1,
        completed: false
    };

    var ROGUELIKE_MODIFIERS = [
        { id: 'double_damage', name: 'Double Damage', desc: 'All damage ×2', icon: '💀' },
        { id: 'no_heal', name: 'No Healing', desc: 'Cannot heal', icon: '🚫' },
        { id: 'speed_boost', name: 'Speed Demon', desc: 'Everything moves 50% faster', icon: '⚡' },
        { id: 'cursed_loot', name: 'Cursed Loot', desc: 'Better loot but items are cursed', icon: '☠️' },
        { id: 'permadeath', name: 'Permadeath', desc: 'No extra lives', icon: '💀' },
        { id: 'mirror_maze', name: 'Mirror Maze', desc: 'Controls randomly invert', icon: '🪞' },
        { id: 'blood_moon', name: 'Blood Moon', desc: 'Permanent nighttime', icon: '🌑' },
        { id: 'giants', name: 'Giants', desc: 'Enemies are 2× larger and tougher', icon: '🗿' },
        { id: 'treasure_hunter', name: 'Treasure Hunter', desc: '3× gold but ½ XP', icon: '💰' },
        { id: 'glass_cannon', name: 'Glass Cannon', desc: '3× damage dealt but 3× taken', icon: '💎' }
    ];

    function startRoguelike() {
        roguelike.active = true;
        roguelike.floor = 1;
        roguelike.seed = Math.floor(Math.random() * 999999);
        roguelike.completed = false;
        roguelike.lootMultiplier = 1;
        // Roll 2-3 random modifiers
        var shuffled = ROGUELIKE_MODIFIERS.slice().sort(function () { return Math.random() - 0.5; });
        roguelike.modifiers = shuffled.slice(0, 2 + Math.floor(Math.random() * 2));
        return roguelike;
    }

    function advanceFloor() {
        roguelike.floor++;
        roguelike.lootMultiplier += 0.3;
        // Add a new modifier every 3 floors
        if (roguelike.floor % 3 === 0 && roguelike.modifiers.length < 6) {
            var available = ROGUELIKE_MODIFIERS.filter(function (m) {
                return !roguelike.modifiers.some(function (rm) { return rm.id === m.id; });
            });
            if (available.length > 0) {
                roguelike.modifiers.push(available[Math.floor(Math.random() * available.length)]);
            }
        }
        return roguelike;
    }

    function hasModifier(modId) {
        return roguelike.active && roguelike.modifiers.some(function (m) { return m.id === modId; });
    }

    // ============ SEASONAL EVENTS ============
    var events = {
        active: null,
        schedule: [
            { id: 'blood_harvest', name: 'Blood Harvest', desc: 'Enemies drop blood tokens. Trade for unique gear.', month: 10, duration: 14, currency: 'blood_token', bonuses: { enemyDropRate: 2 } },
            { id: 'winter_solstice', name: 'Winter Solstice', desc: 'Eternal night. Stars reveal hidden paths.', month: 12, duration: 7, currency: 'star_shard', bonuses: { nightVision: true } },
            { id: 'sandstorm_festival', name: 'Sandstorm Festival', desc: 'Collect storm crystals during intense sandstorms.', month: 3, duration: 10, currency: 'storm_crystal', bonuses: { stormFrequency: 5 } },
            { id: 'pharaoh_coronation', name: "Pharaoh's Coronation", desc: 'Special boss events. Crown the pharaoh.', month: 6, duration: 7, currency: 'royal_seal', bonuses: { bossLoot: 3 } }
        ]
    };

    function checkEvent() {
        var now = new Date();
        var month = now.getMonth() + 1;
        var day = now.getDate();
        for (var i = 0; i < events.schedule.length; i++) {
            var ev = events.schedule[i];
            if (ev.month === month && day <= ev.duration) {
                events.active = ev;
                return ev;
            }
        }
        events.active = null;
        return null;
    }

    // ============ ACHIEVEMENTS ============
    var achievements = [
        { id: 'first_blood', name: 'First Blood', desc: 'Kill your first enemy', icon: '⚔️', unlocked: false },
        { id: 'artifact_1', name: 'Relic Finder', desc: 'Collect first artifact', icon: '🏺', unlocked: false },
        { id: 'all_artifacts', name: 'Master Collector', desc: 'Collect all 7 artifacts', icon: '🏆', unlocked: false },
        { id: 'level_10', name: 'Seasoned Explorer', desc: 'Reach level 10', icon: '⭐', unlocked: false },
        { id: 'level_25', name: 'Desert Legend', desc: 'Reach level 25', icon: '🌟', unlocked: false },
        { id: 'survive_night', name: 'Nightfall', desc: 'Survive your first night', icon: '🌙', unlocked: false },
        { id: 'beat_pharaoh', name: 'Tomb Raider', desc: 'Defeat the Mummy Pharaoh', icon: '👑', unlocked: false },
        { id: 'beat_anubis', name: 'Death Defied', desc: 'Defeat Anubis', icon: '☥', unlocked: false },
        { id: 'beat_apophis', name: 'Serpent Slayer', desc: 'Defeat Apophis', icon: '🐍', unlocked: false },
        { id: 'tame_animal', name: 'Beast Master', desc: 'Tame a creature', icon: '🐕', unlocked: false },
        { id: 'prestige_1', name: 'Eternal', desc: 'Prestige for the first time', icon: '♾️', unlocked: false },
        { id: 'roguelike_5', name: 'Deep Delver', desc: 'Reach roguelike floor 5', icon: '⬇️', unlocked: false },
        { id: 'all_biomes', name: 'World Walker', desc: 'Visit every biome', icon: '🗺️', unlocked: false },
        { id: 'max_gear', name: 'Legendary Gear', desc: 'Equip a legendary item', icon: '💎', unlocked: false },
        { id: 'campfire_all', name: 'Sacred Flames', desc: 'Light every campfire', icon: '🔥', unlocked: false },
        { id: 'quicksand_escape', name: 'Sand Slippery', desc: 'Escape quicksand 10 times', icon: '🏖️', unlocked: false },
        { id: 'nemesis_kill', name: 'Nemesis Slain', desc: 'Kill a nemesis enemy', icon: '💀', unlocked: false },
        { id: 'all_factions', name: 'Diplomat', desc: 'Reach max rank in all factions', icon: '🤝', unlocked: false },
        { id: 'speedrun', name: 'Speed Runner', desc: 'Complete the game in under 15 minutes', icon: '⏱️', unlocked: false },
        { id: 'no_death', name: 'Deathless', desc: 'Complete the game without dying', icon: '🛡️', unlocked: false }
    ];

    function unlockAchievement(id) {
        for (var i = 0; i < achievements.length; i++) {
            if (achievements[i].id === id && !achievements[i].unlocked) {
                achievements[i].unlocked = true;
                return achievements[i];
            }
        }
        return null;
    }

    function getUnlockedCount() {
        return achievements.filter(function (a) { return a.unlocked; }).length;
    }

    // ============ CAMP CUSTOMIZATION ============
    var camp = {
        unlocked: false,
        structures: [
            { id: 'tent', name: 'Traveler Tent', desc: 'Rest and save progress', cost: 0, built: true, level: 1 },
            { id: 'forge', name: 'Blacksmith Forge', desc: 'Upgrade weapons and armor', cost: 50, built: false, level: 0 },
            { id: 'alchemy', name: 'Alchemy Table', desc: 'Brew potions and elixirs', cost: 75, built: false, level: 0 },
            { id: 'library', name: 'Scribe Library', desc: 'Research new skills', cost: 100, built: false, level: 0 },
            { id: 'stable', name: 'Beast Stable', desc: 'House tamed companions', cost: 120, built: false, level: 0 },
            { id: 'shrine', name: 'Shrine of Ra', desc: 'Gain divine blessings', cost: 200, built: false, level: 0 },
            { id: 'war_room', name: 'War Room', desc: 'Plan raids and missions', cost: 150, built: false, level: 0 },
            { id: 'garden', name: 'Oasis Garden', desc: 'Grow herbs and food', cost: 80, built: false, level: 0 }
        ]
    };

    function buildStructure(structId, gold) {
        for (var i = 0; i < camp.structures.length; i++) {
            var s = camp.structures[i];
            if (s.id === structId && !s.built) {
                if (gold < s.cost) return { success: false, reason: 'Not enough gold' };
                s.built = true; s.level = 1;
                return { success: true, name: s.name, cost: s.cost };
            }
        }
        return { success: false, reason: 'Structure not found or already built' };
    }

    function upgradeStructure(structId, gold) {
        for (var i = 0; i < camp.structures.length; i++) {
            var s = camp.structures[i];
            if (s.id === structId && s.built && s.level < 3) {
                var cost = s.cost * (s.level + 1);
                if (gold < cost) return { success: false, reason: 'Not enough gold', cost: cost };
                s.level++;
                return { success: true, name: s.name, level: s.level, cost: cost };
            }
        }
        return { success: false, reason: 'Cannot upgrade' };
    }

    function getStructureBonus(structId) {
        for (var i = 0; i < camp.structures.length; i++) {
            if (camp.structures[i].id === structId && camp.structures[i].built) {
                return camp.structures[i].level;
            }
        }
        return 0;
    }

    // ============ RENDER ============
    function renderAchievements(containerId) {
        var el = document.getElementById(containerId);
        if (!el) return;
        var unlocked = getUnlockedCount();
        var html = '<h3>Achievements (' + unlocked + '/' + achievements.length + ')</h3>';
        achievements.forEach(function (a) {
            html += '<div style="padding:4px 8px;margin:2px 0;background:rgba(255,255,255,' + (a.unlocked ? '0.12' : '0.03') + ');border-radius:4px;opacity:' + (a.unlocked ? '1' : '0.4') + '">';
            html += a.icon + ' <b>' + a.name + '</b> — ' + a.desc;
            html += '</div>';
        });
        el.innerHTML = html;
    }

    function renderCamp(containerId) {
        var el = document.getElementById(containerId);
        if (!el) return;
        var html = '<h3>⛺ Base Camp</h3>';
        camp.structures.forEach(function (s) {
            html += '<div style="padding:6px;margin:4px 0;background:rgba(255,215,0,' + (s.built ? '0.1' : '0.03') + ');border-radius:4px">';
            html += '<b>' + s.name + '</b>';
            if (s.built) html += ' (Lv.' + s.level + ')';
            else html += ' — Cost: ' + s.cost + 'g';
            html += '<br><span style="opacity:0.6">' + s.desc + '</span></div>';
        });
        el.innerHTML = html;
    }

    function renderPrestige(containerId) {
        var el = document.getElementById(containerId);
        if (!el) return;
        var nextCost = PRESTIGE_COSTS[prestige.level + 1] || '???';
        var html = '<h3>♾️ Prestige Level ' + prestige.level + '</h3>';
        html += '<p>Eternal Ankhs: ' + prestige.currency + '</p>';
        html += '<p>XP Multiplier: ×' + prestige.bonuses.xpMult.toFixed(1) + '</p>';
        html += '<p>Loot Multiplier: ×' + prestige.bonuses.lootMult.toFixed(1) + '</p>';
        html += '<p>Starting Gold: +' + prestige.bonuses.startGold + '</p>';
        html += '<p>Bonus HP: +' + prestige.bonuses.extraHP + '</p>';
        html += '<p>Next Prestige: ' + prestige.totalXP + '/' + nextCost + ' XP</p>';
        el.innerHTML = html;
    }

    // ============ GETTERS ============
    function getPrestige() { return prestige; }
    function getRoguelike() { return roguelike; }
    function getAchievements() { return achievements; }
    function getCamp() { return camp; }
    function getActiveEvent() { return events.active; }

    // ============ RESET ============
    function reset() {
        roguelike = { active: false, floor: 1, seed: 0, modifiers: [], lootMultiplier: 1, completed: false };
        // Note: prestige, achievements, and camp persist across resets
    }

    function fullReset() {
        reset();
        prestige = { level: 0, totalXP: 0, currency: 0, bonuses: { xpMult: 1, lootMult: 1, startGold: 0, extraHP: 0, statBonus: 0 } };
        achievements.forEach(function (a) { a.unlocked = false; });
        camp.structures.forEach(function (s) { if (s.id !== 'tent') { s.built = false; s.level = 0; } });
    }

    return {
        reset: reset, fullReset: fullReset,
        // Prestige
        canPrestige: canPrestige, doPrestige: doPrestige, getPrestige: getPrestige,
        // Roguelike
        startRoguelike: startRoguelike, advanceFloor: advanceFloor, hasModifier: hasModifier, getRoguelike: getRoguelike,
        // Events
        checkEvent: checkEvent, getActiveEvent: getActiveEvent,
        // Achievements
        unlockAchievement: unlockAchievement, getUnlockedCount: getUnlockedCount, getAchievements: getAchievements,
        // Camp
        buildStructure: buildStructure, upgradeStructure: upgradeStructure, getStructureBonus: getStructureBonus, getCamp: getCamp,
        // Render
        renderAchievements: renderAchievements, renderCamp: renderCamp, renderPrestige: renderPrestige
    };
})();

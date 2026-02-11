/* ============================================
   Cursed Sands — Phase 8: Deep RPG System
   Stats, skill trees, gear, factions, quests
   ============================================ */
var RPGSystem = (function () {
    'use strict';

    // ============ PLAYER STATS ============
    var stats = {
        level: 1, xp: 0, xpToNext: 100,
        strength: 5,       // melee damage
        agility: 5,        // move speed, dodge chance
        endurance: 5,      // max HP, stamina
        wisdom: 5,         // sanity resist, magic damage
        perception: 5,     // loot quality, trap detection
        charisma: 5,       // merchant prices, faction rep gain
        statPoints: 0
    };
    var maxHP = 100;
    var currentHP = 100;
    var stamina = 100;
    var maxStamina = 100;

    // ============ SKILL TREES ============
    var skillTrees = {
        warrior: {
            name: 'Warrior of Ra', icon: '⚔️',
            skills: [
                { id: 'w_power', name: 'Power Strike', desc: '+25% melee damage', cost: 1, unlocked: false, maxRank: 3, rank: 0 },
                { id: 'w_stun', name: 'Stunning Blow', desc: 'Chance to stun enemies', cost: 2, unlocked: false, maxRank: 2, rank: 0, requires: 'w_power' },
                { id: 'w_cleave', name: 'Cleave', desc: 'Hit multiple enemies', cost: 3, unlocked: false, maxRank: 1, rank: 0, requires: 'w_stun' },
                { id: 'w_armor', name: 'Bronze Skin', desc: '+15% damage reduction', cost: 1, unlocked: false, maxRank: 3, rank: 0 },
                { id: 'w_rage', name: 'Berserker Rage', desc: 'Double damage at low HP', cost: 4, unlocked: false, maxRank: 1, rank: 0, requires: 'w_cleave' },
                { id: 'w_warcry', name: 'War Cry', desc: 'Stun all nearby enemies', cost: 3, unlocked: false, maxRank: 1, rank: 0, requires: 'w_armor' }
            ]
        },
        mystic: {
            name: 'Mystic of Thoth', icon: '✨',
            skills: [
                { id: 'm_bolt', name: 'Arcane Bolt', desc: 'Ranged magic attack', cost: 1, unlocked: false, maxRank: 3, rank: 0 },
                { id: 'm_shield', name: 'Mystic Shield', desc: 'Absorb damage', cost: 2, unlocked: false, maxRank: 2, rank: 0, requires: 'm_bolt' },
                { id: 'm_heal', name: 'Solar Heal', desc: 'Heal over time', cost: 2, unlocked: false, maxRank: 3, rank: 0 },
                { id: 'm_sanity', name: 'Mind Fortress', desc: '+30% sanity resist', cost: 1, unlocked: false, maxRank: 3, rank: 0 },
                { id: 'm_timeStop', name: 'Time Stop', desc: 'Freeze enemies briefly', cost: 4, unlocked: false, maxRank: 1, rank: 0, requires: 'm_shield' },
                { id: 'm_meteor', name: 'Meteor', desc: 'Massive AoE damage', cost: 5, unlocked: false, maxRank: 1, rank: 0, requires: 'm_timeStop' }
            ]
        },
        shadow: {
            name: 'Shadow of Anubis', icon: '🌑',
            skills: [
                { id: 's_stealth', name: 'Shadow Walk', desc: 'Reduced enemy detection', cost: 1, unlocked: false, maxRank: 3, rank: 0 },
                { id: 's_crit', name: 'Precision', desc: '+20% crit chance', cost: 2, unlocked: false, maxRank: 3, rank: 0, requires: 's_stealth' },
                { id: 's_poison', name: 'Venom Blade', desc: 'Poison damage on hit', cost: 2, unlocked: false, maxRank: 2, rank: 0 },
                { id: 's_dodge', name: 'Evasion', desc: '+15% dodge chance', cost: 1, unlocked: false, maxRank: 3, rank: 0 },
                { id: 's_assassin', name: 'Assassinate', desc: 'Instant kill on stealthed hit', cost: 5, unlocked: false, maxRank: 1, rank: 0, requires: 's_crit' },
                { id: 's_cloak', name: 'Cloak of Night', desc: 'Full invisibility for 10s', cost: 4, unlocked: false, maxRank: 1, rank: 0, requires: 's_dodge' }
            ]
        },
        explorer: {
            name: 'Explorer of Isis', icon: '🗺️',
            skills: [
                { id: 'e_loot', name: 'Treasure Hunter', desc: '+25% loot chance', cost: 1, unlocked: false, maxRank: 3, rank: 0 },
                { id: 'e_speed', name: 'Desert Runner', desc: '+15% move speed', cost: 1, unlocked: false, maxRank: 3, rank: 0 },
                { id: 'e_trap', name: 'Trap Sense', desc: 'Detect hidden traps', cost: 2, unlocked: false, maxRank: 2, rank: 0, requires: 'e_loot' },
                { id: 'e_gather', name: 'Efficient Gathering', desc: '+50% material yield', cost: 1, unlocked: false, maxRank: 3, rank: 0 },
                { id: 'e_map', name: 'Cartography', desc: 'Reveal full map', cost: 3, unlocked: false, maxRank: 1, rank: 0, requires: 'e_trap' },
                { id: 'e_camp', name: 'Master Camper', desc: 'Campfires last 3x longer', cost: 2, unlocked: false, maxRank: 1, rank: 0, requires: 'e_speed' }
            ]
        }
    };

    var skillPoints = 0;

    // ============ GEAR SYSTEM ============
    var RARITY = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
    var RARITY_COLORS = { common: '#aaa', uncommon: '#55ff55', rare: '#5555ff', epic: '#aa44ff', legendary: '#ffaa00' };
    var SLOT_NAMES = ['weapon', 'head', 'chest', 'legs', 'amulet', 'ring'];
    var equipped = { weapon: null, head: null, chest: null, legs: null, amulet: null, ring: null };
    var inventory = [];
    var MAX_INVENTORY = 24;

    function generateGear(level, forcedRarity) {
        var rIdx = forcedRarity || Math.floor(Math.random() * 5);
        if (!forcedRarity) {
            var roll = Math.random();
            if (roll < 0.4) rIdx = 0;
            else if (roll < 0.7) rIdx = 1;
            else if (roll < 0.88) rIdx = 2;
            else if (roll < 0.97) rIdx = 3;
            else rIdx = 4;
        }
        var rarity = RARITY[rIdx];
        var slot = SLOT_NAMES[Math.floor(Math.random() * SLOT_NAMES.length)];
        var baseStat = (level * 2 + rIdx * 5);
        var prefixes = ['Ancient', 'Cursed', 'Sacred', 'Gilded', 'Scorching', 'Frozen', 'Shadow', 'Divine'];
        var suffixes = {
            weapon: ['Khopesh', 'Staff', 'Bow', 'Dagger', 'Mace'],
            head: ['Crown', 'Helm', 'Hood', 'Circlet', 'Mask'],
            chest: ['Plate', 'Robe', 'Vest', 'Tunic', 'Cuirass'],
            legs: ['Greaves', 'Leggings', 'Sandals', 'Guards', 'Wraps'],
            amulet: ['Scarab', 'Ankh', 'Eye', 'Pendant', 'Talisman'],
            ring: ['Signet', 'Band', 'Loop', 'Seal', 'Circle']
        };
        var name = prefixes[Math.floor(Math.random() * prefixes.length)] + ' ' +
            suffixes[slot][Math.floor(Math.random() * suffixes[slot].length)];
        var bonuses = {};
        var statKeys = ['strength', 'agility', 'endurance', 'wisdom', 'perception', 'charisma'];
        var numBonuses = 1 + rIdx;
        for (var bi = 0; bi < numBonuses; bi++) {
            var sk = statKeys[Math.floor(Math.random() * statKeys.length)];
            bonuses[sk] = (bonuses[sk] || 0) + Math.ceil(baseStat * (0.3 + Math.random() * 0.4));
        }
        return { name: name, slot: slot, rarity: rarity, rarityIdx: rIdx, level: level, bonuses: bonuses, id: Date.now() + '' + Math.random() };
    }

    function equipGear(item) {
        var old = equipped[item.slot];
        equipped[item.slot] = item;
        // Remove from inventory
        inventory = inventory.filter(function (g) { return g.id !== item.id; });
        if (old) inventory.push(old);
        recalcStats();
        return old;
    }

    function unequipGear(slot) {
        if (!equipped[slot]) return;
        if (inventory.length >= MAX_INVENTORY) return;
        inventory.push(equipped[slot]);
        equipped[slot] = null;
        recalcStats();
    }

    function addToInventory(item) {
        if (inventory.length >= MAX_INVENTORY) return false;
        inventory.push(item);
        return true;
    }

    function recalcStats() {
        // Reset to base
        var base = { strength: 5, agility: 5, endurance: 5, wisdom: 5, perception: 5, charisma: 5 };
        SLOT_NAMES.forEach(function (slot) {
            if (equipped[slot]) {
                Object.keys(equipped[slot].bonuses).forEach(function (k) {
                    base[k] = (base[k] || 0) + equipped[slot].bonuses[k];
                });
            }
        });
        // Add level-up stat points (these are persisted in stats)
        stats.strength = base.strength;
        stats.agility = base.agility;
        stats.endurance = base.endurance;
        stats.wisdom = base.wisdom;
        stats.perception = base.perception;
        stats.charisma = base.charisma;
        // Derived stats
        maxHP = 80 + stats.endurance * 4;
        maxStamina = 80 + stats.endurance * 2 + stats.agility;
        currentHP = Math.min(currentHP, maxHP);
        stamina = Math.min(stamina, maxStamina);
    }

    // ============ FACTION SYSTEM ============
    var factions = {
        ra_order: { name: 'Order of Ra', rep: 0, rank: 'Outsider', ranks: ['Outsider', 'Initiate', 'Acolyte', 'Champion', 'High Priest'] },
        anubis_cult: { name: 'Cult of Anubis', rep: 0, rank: 'Unknown', ranks: ['Unknown', 'Shadow', 'Shade', 'Wraith', 'Death Walker'] },
        hidden_ones: { name: 'The Hidden Ones', rep: 0, rank: 'Stranger', ranks: ['Stranger', 'Associate', 'Agent', 'Master', 'Grandmaster'] },
        nomad_traders: { name: 'Nomad Traders', rep: 0, rank: 'Customer', ranks: ['Customer', 'Patron', 'Partner', 'Elder', 'Sultan'] }
    };

    function addRep(factionId, amount) {
        var f = factions[factionId];
        if (!f) return;
        f.rep += amount * (1 + stats.charisma * 0.05);
        // Rank up thresholds
        var thresholds = [0, 50, 150, 400, 1000];
        for (var i = thresholds.length - 1; i >= 0; i--) {
            if (f.rep >= thresholds[i]) { f.rank = f.ranks[i]; break; }
        }
    }

    // ============ QUEST SYSTEM ============
    var quests = [];
    var completedQuests = [];

    var questTemplates = [
        { id: 'q_kill_mummies', name: 'Purge the Undead', desc: 'Kill 10 mummies', type: 'kill', target: 'mummy', count: 10, reward: { xp: 150, gold: 50 }, faction: 'ra_order', factionRep: 20 },
        { id: 'q_collect_artifacts', name: 'Relic Hunter', desc: 'Collect 3 artifacts', type: 'collect', target: 'artifact', count: 3, reward: { xp: 200, gold: 75 }, faction: 'hidden_ones', factionRep: 15 },
        { id: 'q_explore_biomes', name: 'Cartographers Task', desc: 'Visit 4 biomes', type: 'explore', target: 'biome', count: 4, reward: { xp: 250, gold: 100, gear: true }, faction: 'nomad_traders', factionRep: 25 },
        { id: 'q_survive_night', name: 'Night Watcher', desc: 'Survive 3 full nights', type: 'survive', target: 'night', count: 3, reward: { xp: 180, gold: 60 }, faction: 'anubis_cult', factionRep: 20 },
        { id: 'q_campfire_rest', name: 'Sacred Flames', desc: 'Light 4 campfires', type: 'interact', target: 'campfire', count: 4, reward: { xp: 100, gold: 30 }, faction: 'ra_order', factionRep: 10 },
        { id: 'q_kill_guards', name: 'Defiance', desc: 'Kill 5 Anubis guards', type: 'kill', target: 'anubis_guard', count: 5, reward: { xp: 200, gold: 80, gear: true }, faction: 'hidden_ones', factionRep: 30 },
        { id: 'q_collect_mats', name: 'Supply Run', desc: 'Gather 15 materials', type: 'collect', target: 'material', count: 15, reward: { xp: 120, gold: 40 }, faction: 'nomad_traders', factionRep: 15 },
        { id: 'q_boss_pharaoh', name: 'Tomb Raider', desc: 'Defeat the Mummy Pharaoh', type: 'kill', target: 'pharaoh', count: 1, reward: { xp: 500, gold: 200, gear: true }, faction: 'ra_order', factionRep: 50 },
        { id: 'q_swim_nile', name: 'River Crossing', desc: 'Swim across the Nile', type: 'explore', target: 'nile', count: 1, reward: { xp: 80, gold: 20 }, faction: 'nomad_traders', factionRep: 10 },
        { id: 'q_quicksand_escape', name: 'Sand Survivor', desc: 'Escape quicksand 5 times', type: 'interact', target: 'quicksand_escape', count: 5, reward: { xp: 150, gold: 45 }, faction: 'hidden_ones', factionRep: 15 }
    ];

    function startRandomQuest() {
        var available = questTemplates.filter(function (qt) {
            return !quests.some(function (q) { return q.id === qt.id; }) &&
                !completedQuests.some(function (q) { return q === qt.id; });
        });
        if (available.length === 0 || quests.length >= 3) return null;
        var qt = available[Math.floor(Math.random() * available.length)];
        var quest = { id: qt.id, name: qt.name, desc: qt.desc, type: qt.type, target: qt.target, count: qt.count, progress: 0, reward: qt.reward, faction: qt.faction, factionRep: qt.factionRep };
        quests.push(quest);
        return quest;
    }

    function progressQuest(type, target, amount) {
        var completed = [];
        quests.forEach(function (q) {
            if (q.type === type && q.target === target) {
                q.progress = Math.min(q.count, q.progress + (amount || 1));
                if (q.progress >= q.count) completed.push(q);
            }
        });
        // Complete
        completed.forEach(function (q) {
            completedQuests.push(q.id);
            quests = quests.filter(function (qq) { return qq.id !== q.id; });
            addXP(q.reward.xp);
            if (q.faction) addRep(q.faction, q.factionRep);
        });
        return completed;
    }

    // ============ XP & LEVELING ============
    function addXP(amount) {
        var perceptionBonus = 1 + stats.perception * 0.03;
        stats.xp += Math.round(amount * perceptionBonus);
        while (stats.xp >= stats.xpToNext) {
            stats.xp -= stats.xpToNext;
            stats.level++;
            stats.xpToNext = Math.round(stats.xpToNext * 1.4);
            stats.statPoints += 3;
            skillPoints += 1;
            currentHP = maxHP; // full heal on level up
            stamina = maxStamina;
        }
    }

    function allocateStat(statName) {
        if (stats.statPoints <= 0) return false;
        if (!stats.hasOwnProperty(statName)) return false;
        stats[statName]++;
        stats.statPoints--;
        recalcStats();
        return true;
    }

    // ============ SKILL UNLOCKING ============
    function unlockSkill(treeKey, skillId) {
        var tree = skillTrees[treeKey];
        if (!tree || skillPoints <= 0) return false;
        var skill = null;
        tree.skills.forEach(function (s) { if (s.id === skillId) skill = s; });
        if (!skill || skill.rank >= skill.maxRank) return false;
        if (skill.requires) {
            var req = null;
            tree.skills.forEach(function (s) { if (s.id === skill.requires) req = s; });
            if (!req || req.rank < 1) return false;
        }
        if (skillPoints < skill.cost) return false;
        skillPoints -= skill.cost;
        skill.rank++;
        skill.unlocked = true;
        return true;
    }

    function getSkillRank(skillId) {
        var rank = 0;
        Object.keys(skillTrees).forEach(function (k) {
            skillTrees[k].skills.forEach(function (s) { if (s.id === skillId) rank = s.rank; });
        });
        return rank;
    }

    // ============ COMBAT MODIFIERS ============
    function getCombatMods() {
        return {
            meleeDmgMult: 1 + getSkillRank('w_power') * 0.25 + stats.strength * 0.05,
            critChance: 0.05 + getSkillRank('s_crit') * 0.2 + stats.perception * 0.01,
            dodgeChance: getSkillRank('s_dodge') * 0.15 + stats.agility * 0.01,
            dmgReduction: getSkillRank('w_armor') * 0.15,
            moveSpeedMult: 1 + getSkillRank('e_speed') * 0.15 + stats.agility * 0.01,
            lootMult: 1 + getSkillRank('e_loot') * 0.25 + stats.perception * 0.03,
            sanityResist: getSkillRank('m_sanity') * 0.3 + stats.wisdom * 0.02,
            stealthMod: getSkillRank('s_stealth') * 0.3,
            gatherMult: 1 + getSkillRank('e_gather') * 0.5,
            berserk: getSkillRank('w_rage') > 0 && currentHP < maxHP * 0.25,
            cleave: getSkillRank('w_cleave') > 0,
            assassinate: getSkillRank('s_assassin') > 0,
            campfireMult: getSkillRank('e_camp') > 0 ? 3 : 1,
            poisonDmg: getSkillRank('s_poison') * 3,
            merchantDiscount: 1 - stats.charisma * 0.02
        };
    }

    // ============ UPDATE ============
    function update(dt) {
        // Stamina regeneration
        if (!stamina) stamina = maxStamina;
        stamina = Math.min(maxStamina, stamina + (3 + stats.endurance * 0.2) * dt);
        return {
            level: stats.level, xp: stats.xp, xpToNext: stats.xpToNext,
            hp: Math.round(currentHP), maxHP: maxHP,
            stamina: Math.round(stamina), maxStamina: maxStamina,
            statPoints: stats.statPoints, skillPoints: skillPoints,
            questCount: quests.length
        };
    }

    function takeDamage(amount) {
        var mods = getCombatMods();
        // Dodge check
        if (Math.random() < mods.dodgeChance) return { dodged: true, damage: 0 };
        var finalDmg = Math.max(1, amount * (1 - mods.dmgReduction));
        currentHP = Math.max(0, currentHP - finalDmg);
        return { dodged: false, damage: finalDmg, hp: currentHP };
    }

    function heal(amount) {
        currentHP = Math.min(maxHP, currentHP + amount);
    }

    function useStamina(amount) {
        if (stamina < amount) return false;
        stamina -= amount;
        return true;
    }

    // ============ RENDER ============
    function renderSkillTree(containerId) {
        var el = document.getElementById(containerId);
        if (!el) return;
        var html = '<h3>Skill Points: ' + skillPoints + '</h3>';
        Object.keys(skillTrees).forEach(function (key) {
            var tree = skillTrees[key];
            html += '<div style="margin:10px 0"><h4>' + tree.icon + ' ' + tree.name + '</h4>';
            tree.skills.forEach(function (s) {
                var canUnlock = s.rank < s.maxRank && skillPoints >= s.cost;
                if (s.requires) {
                    var req = null;
                    tree.skills.forEach(function (sr) { if (sr.id === s.requires) req = sr; });
                    if (!req || req.rank < 1) canUnlock = false;
                }
                html += '<div style="padding:4px 8px;margin:2px 0;background:rgba(255,255,255,' + (s.rank > 0 ? '0.15' : '0.05') + ');border-radius:4px;cursor:' + (canUnlock ? 'pointer' : 'default') + '" data-tree="' + key + '" data-skill="' + s.id + '" class="skill-node">';
                html += '<b>' + s.name + '</b> (' + s.rank + '/' + s.maxRank + ') — ' + s.desc;
                html += '</div>';
            });
            html += '</div>';
        });
        el.innerHTML = html;
    }

    function renderQuestLog(containerId) {
        var el = document.getElementById(containerId);
        if (!el) return;
        var html = '<h3>Active Quests (' + quests.length + '/3)</h3>';
        quests.forEach(function (q) {
            var pct = Math.round(q.progress / q.count * 100);
            html += '<div style="padding:6px;margin:4px 0;background:rgba(255,215,0,0.1);border-radius:4px">';
            html += '<b>' + q.name + '</b><br><span style="opacity:0.7">' + q.desc + '</span>';
            html += '<br>Progress: ' + q.progress + '/' + q.count + ' (' + pct + '%)';
            html += '</div>';
        });
        if (quests.length === 0) html += '<p style="opacity:0.5">No active quests. Interact with NPCs to get quests.</p>';
        el.innerHTML = html;
    }

    function renderGearSlots(containerId) {
        var el = document.getElementById(containerId);
        if (!el) return;
        var html = '<h3>Equipment</h3><div style="display:flex;flex-wrap:wrap;gap:8px">';
        SLOT_NAMES.forEach(function (slot) {
            var item = equipped[slot];
            html += '<div style="width:100px;height:80px;background:rgba(255,255,255,0.05);border-radius:6px;padding:8px;text-align:center;border:1px solid ' + (item ? RARITY_COLORS[item.rarity] : '#333') + '">';
            html += '<div style="font-size:10px;opacity:0.5;text-transform:uppercase">' + slot + '</div>';
            if (item) {
                html += '<div style="color:' + RARITY_COLORS[item.rarity] + ';font-size:11px">' + item.name + '</div>';
            } else {
                html += '<div style="opacity:0.3">Empty</div>';
            }
            html += '</div>';
        });
        html += '</div>';
        el.innerHTML = html;
    }

    // ============ GETTERS ============
    function getStats() { return stats; }
    function getHP() { return { current: Math.round(currentHP), max: maxHP }; }
    function getStamina() { return { current: Math.round(stamina), max: maxStamina }; }
    function getQuests() { return quests; }
    function getFactions() { return factions; }
    function getEquipped() { return equipped; }
    function getInventory() { return inventory; }
    function getSkillTrees() { return skillTrees; }

    // ============ RESET ============
    function reset() {
        stats = { level: 1, xp: 0, xpToNext: 100, strength: 5, agility: 5, endurance: 5, wisdom: 5, perception: 5, charisma: 5, statPoints: 0 };
        maxHP = 100; currentHP = 100; stamina = 100; maxStamina = 100;
        skillPoints = 0;
        equipped = { weapon: null, head: null, chest: null, legs: null, amulet: null, ring: null };
        inventory = []; quests = []; completedQuests = [];
        Object.keys(skillTrees).forEach(function (k) {
            skillTrees[k].skills.forEach(function (s) { s.rank = 0; s.unlocked = false; });
        });
        Object.keys(factions).forEach(function (k) { factions[k].rep = 0; factions[k].rank = factions[k].ranks[0]; });
    }

    return {
        reset: reset, update: update,
        addXP: addXP, allocateStat: allocateStat,
        unlockSkill: unlockSkill, getSkillRank: getSkillRank,
        generateGear: generateGear, equipGear: equipGear, unequipGear: unequipGear, addToInventory: addToInventory,
        getCombatMods: getCombatMods,
        addRep: addRep, progressQuest: progressQuest, startRandomQuest: startRandomQuest,
        takeDamage: takeDamage, heal: heal, useStamina: useStamina,
        renderSkillTree: renderSkillTree, renderQuestLog: renderQuestLog, renderGearSlots: renderGearSlots,
        getStats: getStats, getHP: getHP, getStamina: getStamina,
        getQuests: getQuests, getFactions: getFactions,
        getEquipped: getEquipped, getInventory: getInventory, getSkillTrees: getSkillTrees
    };
})();

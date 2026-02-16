/* ============================================
   ScaryGamesAI — Store & Battle Pass System
   Cosmetic store, seasonal battle passes,
   gift subscriptions, bundles, limited offers
   ============================================ */

const ScaryStore = (function () {
    'use strict';

    // ═══════════════════════════════════════════════════════════════
    // STORE CONFIGURATION
    // ═══════════════════════════════════════════════════════════════

    const CURRENCY = {
        SOULS: 'souls',        // Free currency (earned in-game)
        BLOOD_GEMS: 'gems',    // Premium currency (purchased)
    };

    const TIER_DISCOUNTS = {
        none: 0,
        lite: 5,   // Survivor: 5% off
        pro: 10,   // Hunter: 10% off
        max: 15,   // Elder God: 15% off
    };

    // ═══════════════════════════════════════════════════════════════
    // COSMETIC ITEMS DATABASE
    // ═══════════════════════════════════════════════════════════════

    const COSMETICS = {
        // Character Skins
        skins: [
            // FREE TIER
            { id: 'skin_default', name: 'Default Survivor', rarity: 'common', price: 0, currency: 'souls', tier: 'none', image: '👤' },
            { id: 'skin_casual', name: 'Casual Explorer', rarity: 'common', price: 100, currency: 'souls', tier: 'none', image: '🧥' },

            // SURVIVOR TIER
            { id: 'skin_shadow', name: 'Shadow Walker', rarity: 'uncommon', price: 500, currency: 'souls', tier: 'lite', image: '🌑' },
            { id: 'skin_bloodied', name: 'Bloodied Survivor', rarity: 'uncommon', price: 150, currency: 'gems', tier: 'lite', image: '🩸' },
            { id: 'skin_woodsman', name: 'Woodsman', rarity: 'uncommon', price: 600, currency: 'souls', tier: 'lite', image: '🪓' },
            { id: 'skin_cultist', name: 'Cultist Robes', rarity: 'rare', price: 200, currency: 'gems', tier: 'lite', image: '袍' },

            // HUNTER TIER
            { id: 'skin_hunter', name: 'Master Hunter', rarity: 'rare', price: 800, currency: 'souls', tier: 'pro', image: '🗡️' },
            { id: 'skin_werewolf', name: 'Werewolf', rarity: 'rare', price: 300, currency: 'gems', tier: 'pro', image: '🐺' },
            { id: 'skin_vampire', name: 'Vampire Lord', rarity: 'epic', price: 400, currency: 'gems', tier: 'pro', image: '🧛' },
            { id: 'skin_ghost', name: 'Spectral Form', rarity: 'epic', price: 450, currency: 'gems', tier: 'pro', image: '👻' },
            { id: 'skin_scarecrow', name: 'Harvest Scarecrow', rarity: 'rare', price: 350, currency: 'gems', tier: 'pro', image: '🎃' },
            { id: 'skin_plague', name: 'Plague Doctor', rarity: 'epic', price: 500, currency: 'gems', tier: 'pro', image: '🎭' },

            // ELDER GOD TIER
            { id: 'skin_eldergod', name: 'Eldritch Horror', rarity: 'legendary', price: 600, currency: 'gems', tier: 'max', image: '🜏' },
            { id: 'skin_void', name: 'Void Walker', rarity: 'legendary', price: 700, currency: 'gems', tier: 'max', image: '🌌' },
            { id: 'skin_demon', name: 'Arch Demon', rarity: 'legendary', price: 750, currency: 'gems', tier: 'max', image: '👹' },
            { id: 'skin_lovecraft', name: 'Cthulhu\'s Chosen', rarity: 'mythic', price: 1000, currency: 'gems', tier: 'max', image: '🐙' },
            { id: 'skin_skeleton', name: 'Skeleton King', rarity: 'legendary', price: 650, currency: 'gems', tier: 'max', image: '💀' },
            { id: 'skin_reaper', name: 'Grim Reaper', rarity: 'mythic', price: 1200, currency: 'gems', tier: 'max', image: '☠️' },

            // WINTER BATTLE PASS EXCLUSIVE
            { id: 'skin_frost_demon', name: 'Frost Demon', rarity: 'legendary', battlePass: true, battlePassTier: 25, image: '❄️' },
            { id: 'skin_ice_queen', name: 'Ice Queen', rarity: 'mythic', battlePass: true, battlePassTier: 50, premium: true, image: '👸' },
            { id: 'skin_yeti', name: 'Yeti Beast', rarity: 'legendary', battlePass: true, battlePassTier: 75, premium: true, image: '🦣' },
            { id: 'skin_krampus', name: 'Krampus', rarity: 'mythic', battlePass: true, battlePassTier: 100, premium: true, image: '😈' },
        ],

        // Visual Effects
        effects: [
            // TRAILS
            { id: 'trail_blood', name: 'Blood Trail', type: 'trail', rarity: 'uncommon', price: 200, currency: 'gems', tier: 'lite', image: '🩸' },
            { id: 'trail_fire', name: 'Hellfire Trail', type: 'trail', rarity: 'rare', price: 300, currency: 'gems', tier: 'pro', image: '🔥' },
            { id: 'trail_void', name: 'Void Trail', type: 'trail', rarity: 'epic', price: 400, currency: 'gems', tier: 'pro', image: '🕳️' },
            { id: 'trail_souls', name: 'Soul Harvest', type: 'trail', rarity: 'legendary', price: 600, currency: 'gems', tier: 'max', image: '👻' },
            { id: 'trail_frost', name: 'Frost Trail', type: 'trail', rarity: 'legendary', battlePass: true, battlePassTier: 30, image: '❄️' },
            { id: 'trail_aurora', name: 'Aurora Trail', type: 'trail', rarity: 'mythic', battlePass: true, battlePassTier: 60, premium: true, image: '🌌' },

            // AURAS
            { id: 'aura_dark', name: 'Dark Aura', type: 'aura', rarity: 'uncommon', price: 250, currency: 'gems', tier: 'lite', image: '🌑' },
            { id: 'aura_blood', name: 'Blood Aura', type: 'aura', rarity: 'rare', price: 350, currency: 'gems', tier: 'pro', image: '🩸' },
            { id: 'aura_eldritch', name: 'Eldritch Aura', type: 'aura', rarity: 'legendary', price: 700, currency: 'gems', tier: 'max', image: '🜏' },
            { id: 'aura_frozen', name: 'Frozen Heart', type: 'aura', rarity: 'epic', battlePass: true, battlePassTier: 40, image: '💙' },
            { id: 'aura_blizzard', name: 'Blizzard Aura', type: 'aura', rarity: 'legendary', battlePass: true, battlePassTier: 80, premium: true, image: '🌨️' },

            // DEATH EFFECTS
            { id: 'death_explode', name: 'Bloody Explosion', type: 'death', rarity: 'rare', price: 300, currency: 'gems', tier: 'pro', image: '💥' },
            { id: 'death_dissolve', name: 'Soul Dissolve', type: 'death', rarity: 'epic', price: 400, currency: 'gems', tier: 'pro', image: '✨' },
            { id: 'death_shatter', name: 'Ice Shatter', type: 'death', rarity: 'legendary', battlePass: true, battlePassTier: 45, image: '🧊' },

            // KILL EFFECTS
            { id: 'kill_blood', name: 'Blood Splatter', type: 'kill', rarity: 'uncommon', price: 200, currency: 'gems', tier: 'lite', image: '🩸' },
            { id: 'kill_soul', name: 'Soul Rip', type: 'kill', rarity: 'epic', price: 450, currency: 'gems', tier: 'max', image: '👻' },
            { id: 'kill_freeze', name: 'Frozen Kill', type: 'kill', rarity: 'legendary', battlePass: true, battlePassTier: 55, premium: true, image: '❄️' },
        ],

        // Profile Items
        profile: [
            // FRAMES
            { id: 'frame_bronze', name: 'Survivor Frame', type: 'frame', rarity: 'common', price: 300, currency: 'souls', tier: 'none', image: '🩹' },
            { id: 'frame_silver', name: 'Hunter Frame', type: 'frame', rarity: 'rare', price: 400, currency: 'souls', tier: 'lite', image: '🗡️' },
            { id: 'frame_gold', name: 'Elder God Frame', type: 'frame', rarity: 'legendary', price: 500, currency: 'gems', tier: 'pro', image: '🜏' },
            { id: 'frame_void', name: 'Void Frame', type: 'frame', rarity: 'mythic', price: 800, currency: 'gems', tier: 'max', image: '🕳️' },
            { id: 'frame_winter', name: 'Winter Frame', type: 'frame', rarity: 'epic', battlePass: true, battlePassTier: 10, image: '❄️' },
            { id: 'frame_snowflake', name: 'Snowflake Frame', type: 'frame', rarity: 'legendary', battlePass: true, battlePassTier: 70, premium: true, image: '🌨️' },

            // TITLES
            { id: 'title_survivor', name: 'The Survivor', type: 'title', rarity: 'common', price: 200, currency: 'souls', tier: 'none', image: '🩹' },
            { id: 'title_hunter', name: 'The Hunter', type: 'title', rarity: 'rare', price: 300, currency: 'souls', tier: 'lite', image: '🗡️' },
            { id: 'title_horror', name: 'Horror Master', type: 'title', rarity: 'epic', price: 400, currency: 'gems', tier: 'pro', image: '😱' },
            { id: 'title_eldergod', name: 'Elder God', type: 'title', rarity: 'legendary', price: 600, currency: 'gems', tier: 'max', image: '🜏' },
            { id: 'title_frozen', name: 'Frozen One', type: 'title', rarity: 'rare', battlePass: true, battlePassTier: 15, image: '🥶' },
            { id: 'title_winterking', name: 'Winter King', type: 'title', rarity: 'mythic', battlePass: true, battlePassTier: 90, premium: true, image: '👑' },

            // BADGES
            { id: 'badge_founder', name: 'Founder Badge', type: 'badge', rarity: 'legendary', price: 0, limited: true, image: '⭐' },
            { id: 'badge_battlepass_s1', name: 'Season 1 Veteran', type: 'badge', rarity: 'epic', battlePass: true, battlePassTier: 100, image: '🏆' },
        ],

        // Cursors & UI
        ui: [
            { id: 'cursor_bone', name: 'Bone Cursor', type: 'cursor', rarity: 'uncommon', price: 150, currency: 'souls', tier: 'none', image: '🦴' },
            { id: 'cursor_knife', name: 'Ritual Knife', type: 'cursor', rarity: 'rare', price: 250, currency: 'souls', tier: 'lite', image: '🔪' },
            { id: 'cursor_pentagram', name: 'Pentagram', type: 'cursor', rarity: 'epic', price: 300, currency: 'gems', tier: 'pro', image: '⭐' },
            { id: 'cursor_skull', name: 'Skull Cursor', type: 'cursor', rarity: 'legendary', price: 400, currency: 'gems', tier: 'max', image: '💀' },
            { id: 'cursor_snowflake', name: 'Snowflake', type: 'cursor', rarity: 'rare', battlePass: true, battlePassTier: 5, image: '❄️' },
            { id: 'cursor_icicle', name: 'Icicle', type: 'cursor', rarity: 'epic', battlePass: true, battlePassTier: 35, premium: true, image: '🧊' },

            // THEMES
            { id: 'theme_dark', name: 'Dark Mode+', type: 'theme', rarity: 'uncommon', price: 200, currency: 'souls', tier: 'none', image: '🌙' },
            { id: 'theme_blood', name: 'Blood Theme', type: 'theme', rarity: 'rare', price: 400, currency: 'gems', tier: 'lite', image: '🩸' },
            { id: 'theme_void', name: 'Void Theme', type: 'theme', rarity: 'legendary', price: 600, currency: 'gems', tier: 'max', image: '🕳️' },
            { id: 'theme_winter', name: 'Winter Theme', type: 'theme', rarity: 'epic', battlePass: true, battlePassTier: 20, image: '🌨️' },
        ],

        // Emotes & Stickers
        emotes: [
            { id: 'emote_scream', name: 'Scream', type: 'emote', rarity: 'common', price: 100, currency: 'souls', tier: 'none', image: '😱' },
            { id: 'emote_evil', name: 'Evil Laugh', type: 'emote', rarity: 'uncommon', price: 200, currency: 'souls', tier: 'lite', image: '😈' },
            { id: 'emote_skull', name: 'Skull Dance', type: 'emote', rarity: 'rare', price: 300, currency: 'gems', tier: 'pro', image: '💀' },
            { id: 'emote_ghost', name: 'Ghost Fade', type: 'emote', rarity: 'epic', price: 400, currency: 'gems', tier: 'max', image: '👻' },
            { id: 'emote_freeze', name: 'Freeze!', type: 'emote', rarity: 'rare', battlePass: true, battlePassTier: 8, image: '🥶' },
            { id: 'emote_snowball', name: 'Snowball Fight', type: 'emote', rarity: 'legendary', battlePass: true, battlePassTier: 65, premium: true, image: '⛄' },
        ],

        // Boosters
        boosters: [
            { id: 'boost_xp_1h', name: 'XP Boost (1h)', type: 'booster', rarity: 'common', price: 100, currency: 'gems', effect: 'xp_1.5', duration: 3600, image: '⚡' },
            { id: 'boost_xp_24h', name: 'XP Boost (24h)', type: 'booster', rarity: 'rare', price: 500, currency: 'gems', effect: 'xp_2', duration: 86400, image: '⚡' },
            { id: 'boost_souls_1h', name: 'Soul Boost (1h)', type: 'booster', rarity: 'uncommon', price: 150, currency: 'gems', effect: 'souls_2', duration: 3600, image: '👻' },
            { id: 'boost_luck', name: 'Lucky Charm', type: 'booster', rarity: 'epic', price: 300, currency: 'gems', effect: 'luck_1.5', duration: 7200, image: '🍀' },
        ],
    };

    // ═══════════════════════════════════════════════════════════════
    // WINTER BATTLE PASS (300 TIERS)
    // ═══════════════════════════════════════════════════════════════

    const WINTER_BATTLE_PASS = {
        id: 'winter_2024',
        name: 'Frozen Nightmare',
        season: 1,
        startDate: '2024-12-01',
        endDate: '2025-05-31',
        theme: 'winter',
        premiumPrice: 1000, // Blood Gems
        tiers: 300,
        xpPerTier: 1000,

        generateTiers: function () {
            const tiers = [];

            const rewards = {
                free: {
                    5: { type: 'currency', currency: 'souls', amount: 500 },
                    10: { type: 'cosmetic', id: 'frame_winter' },
                    15: { type: 'cosmetic', id: 'title_frozen' },
                    20: { type: 'cosmetic', id: 'theme_winter' },
                    25: { type: 'cosmetic', id: 'skin_frost_demon' },
                    30: { type: 'cosmetic', id: 'trail_frost' },
                    35: { type: 'cosmetic', id: 'cursor_snowflake' },
                    40: { type: 'cosmetic', id: 'aura_frozen' },
                    45: { type: 'cosmetic', id: 'death_shatter' },
                    50: { type: 'currency', currency: 'gems', amount: 200 },
                    55: { type: 'cosmetic', id: 'kill_freeze' },
                    60: { type: 'cosmetic', id: 'trail_aurora' },
                    65: { type: 'cosmetic', id: 'emote_snowball' },
                    70: { type: 'cosmetic', id: 'frame_snowflake' },
                    75: { type: 'cosmetic', id: 'skin_yeti' },
                    80: { type: 'cosmetic', id: 'aura_blizzard' },
                    85: { type: 'currency', currency: 'gems', amount: 300 },
                    90: { type: 'cosmetic', id: 'title_winterking' },
                    95: { type: 'currency', currency: 'souls', amount: 2000 },
                    100: { type: 'cosmetic', id: 'badge_battlepass_s1' }
                },
                premium: {
                    1: { type: 'currency', currency: 'souls', amount: 200 },
                    2: { type: 'lootbox', id: 'winter_common', amount: 1 },
                    3: { type: 'currency', currency: 'souls', amount: 300 },
                    4: { type: 'booster', id: 'boost_xp_1h', amount: 1 },
                    5: { type: 'currency', currency: 'gems', amount: 50 },
                    6: { type: 'lootbox', id: 'winter_uncommon', amount: 1 },
                    7: { type: 'currency', currency: 'souls', amount: 400 },
                    8: { type: 'cosmetic', id: 'emote_freeze' },
                    9: { type: 'currency', currency: 'souls', amount: 300 },
                    10: { type: 'cosmetic', id: 'skin_frost_demon' },
                    11: { type: 'currency', currency: 'souls', amount: 400 },
                    12: { type: 'lootbox', id: 'winter_uncommon', amount: 1 },
                    13: { type: 'currency', currency: 'gems', amount: 50 },
                    14: { type: 'booster', id: 'boost_souls_1h', amount: 1 },
                    15: { type: 'cosmetic', id: 'trail_frost' },
                    16: { type: 'currency', currency: 'souls', amount: 500 },
                    17: { type: 'lootbox', id: 'winter_rare', amount: 1 },
                    18: { type: 'currency', currency: 'souls', amount: 400 },
                    19: { type: 'currency', currency: 'gems', amount: 75 },
                    20: { type: 'cosmetic', id: 'skin_ice_queen' },
                    21: { type: 'currency', currency: 'souls', amount: 500 },
                    22: { type: 'lootbox', id: 'winter_rare', amount: 1 },
                    23: { type: 'booster', id: 'boost_xp_24h', amount: 1 },
                    24: { type: 'currency', currency: 'souls', amount: 500 },
                    25: { type: 'cosmetic', id: 'cursor_icicle' },
                    26: { type: 'currency', currency: 'gems', amount: 100 },
                    27: { type: 'lootbox', id: 'winter_epic', amount: 1 },
                    28: { type: 'currency', currency: 'souls', amount: 600 },
                    29: { type: 'currency', currency: 'souls', amount: 400 },
                    30: { type: 'cosmetic', id: 'aura_frozen' },
                    31: { type: 'currency', currency: 'souls', amount: 600 },
                    32: { type: 'lootbox', id: 'winter_epic', amount: 1 },
                    33: { type: 'currency', currency: 'gems', amount: 100 },
                    34: { type: 'booster', id: 'boost_luck', amount: 1 },
                    35: { type: 'cosmetic', id: 'death_shatter' },
                    36: { type: 'currency', currency: 'souls', amount: 700 },
                    37: { type: 'lootbox', id: 'winter_epic', amount: 1 },
                    38: { type: 'currency', currency: 'souls', amount: 500 },
                    39: { type: 'currency', currency: 'gems', amount: 125 },
                    40: { type: 'cosmetic', id: 'trail_aurora' },
                    41: { type: 'currency', currency: 'souls', amount: 700 },
                    42: { type: 'lootbox', id: 'winter_legendary', amount: 1 },
                    43: { type: 'booster', id: 'boost_xp_24h', amount: 1 },
                    44: { type: 'currency', currency: 'souls', amount: 600 },
                    45: { type: 'cosmetic', id: 'kill_freeze' },
                    46: { type: 'currency', currency: 'gems', amount: 150 },
                    47: { type: 'lootbox', id: 'winter_legendary', amount: 1 },
                    48: { type: 'currency', currency: 'souls', amount: 800 },
                    49: { type: 'currency', currency: 'souls', amount: 600 },
                    50: { type: 'cosmetic', id: 'skin_yeti' },
                    51: { type: 'currency', currency: 'souls', amount: 800 },
                    52: { type: 'lootbox', id: 'winter_legendary', amount: 1 },
                    53: { type: 'currency', currency: 'gems', amount: 150 },
                    54: { type: 'booster', id: 'boost_xp_24h', amount: 2 },
                    55: { type: 'cosmetic', id: 'emote_snowball' },
                    56: { type: 'currency', currency: 'souls', amount: 900 },
                    57: { type: 'lootbox', id: 'winter_legendary', amount: 1 },
                    58: { type: 'currency', currency: 'souls', amount: 700 },
                    59: { type: 'currency', currency: 'gems', amount: 175 },
                    60: { type: 'cosmetic', id: 'aura_blizzard' },
                    61: { type: 'currency', currency: 'souls', amount: 900 },
                    62: { type: 'lootbox', id: 'winter_mythic', amount: 1 },
                    63: { type: 'booster', id: 'boost_luck', amount: 2 },
                    64: { type: 'currency', currency: 'souls', amount: 800 },
                    65: { type: 'cosmetic', id: 'frame_snowflake' },
                    66: { type: 'currency', currency: 'gems', amount: 200 },
                    67: { type: 'lootbox', id: 'winter_mythic', amount: 1 },
                    68: { type: 'currency', currency: 'souls', amount: 1000 },
                    69: { type: 'currency', currency: 'souls', amount: 800 },
                    70: { type: 'cosmetic', id: 'skin_krampus' },
                    71: { type: 'currency', currency: 'souls', amount: 1000 },
                    72: { type: 'lootbox', id: 'winter_mythic', amount: 1 },
                    73: { type: 'currency', currency: 'gems', amount: 200 },
                    74: { type: 'booster', id: 'boost_xp_24h', amount: 3 },
                    75: { type: 'cosmetic', id: 'title_winterking' },
                    76: { type: 'currency', currency: 'souls', amount: 1200 },
                    77: { type: 'lootbox', id: 'winter_mythic', amount: 1 },
                    78: { type: 'currency', currency: 'souls', amount: 1000 },
                    79: { type: 'currency', currency: 'gems', amount: 250 },
                    80: { type: 'currency', currency: 'gems', amount: 500 },
                    81: { type: 'currency', currency: 'souls', amount: 1200 },
                    82: { type: 'lootbox', id: 'winter_mythic', amount: 2 },
                    83: { type: 'booster', id: 'boost_luck', amount: 3 },
                    84: { type: 'currency', currency: 'souls', amount: 1000 },
                    85: { type: 'currency', currency: 'gems', amount: 300 },
                    86: { type: 'currency', currency: 'souls', amount: 1500 },
                    87: { type: 'lootbox', id: 'winter_mythic', amount: 2 },
                    88: { type: 'currency', currency: 'souls', amount: 1200 },
                    89: { type: 'currency', currency: 'gems', amount: 350 },
                    90: { type: 'cosmetic', id: 'badge_battlepass_s1' },
                    91: { type: 'currency', currency: 'souls', amount: 1500 },
                    92: { type: 'lootbox', id: 'winter_mythic', amount: 2 },
                    93: { type: 'currency', currency: 'gems', amount: 400 },
                    94: { type: 'booster', id: 'boost_xp_24h', amount: 5 },
                    95: { type: 'currency', currency: 'gems', amount: 500 },
                    96: { type: 'currency', currency: 'souls', amount: 2000 },
                    97: { type: 'lootbox', id: 'winter_mythic', amount: 3 },
                    98: { type: 'currency', currency: 'gems', amount: 600 },
                    99: { type: 'currency', currency: 'souls', amount: 3000 },
                    100: { type: 'cosmetic', id: 'skin_lovecraft' }
                }
            };

            for (let i = 1; i <= this.tiers; i++) {
                if (i > 100) {
                    if (i % 25 === 0) {
                        rewards.free[i] = { type: 'currency', currency: 'gems', amount: 120 + Math.floor(i / 10) };
                        rewards.premium[i] = { type: 'title', id: `winter_champion_${i}` };
                    } else if (i % 10 === 0) {
                        rewards.free[i] = { type: 'currency', currency: 'souls', amount: 1500 + (i * 12) };
                        rewards.premium[i] = { type: 'lootbox', id: 'winter_mythic', amount: 1 + Math.floor(i / 100) };
                    } else if (i % 5 === 0) {
                        rewards.free[i] = { type: 'currency', currency: 'souls', amount: 900 + (i * 8) };
                        rewards.premium[i] = { type: 'booster', id: 'boost_xp_24h', amount: 1 + Math.floor(i / 120) };
                    } else {
                        rewards.premium[i] = {
                            type: i % 3 === 0 ? 'currency' : 'lootbox',
                            currency: 'souls',
                            amount: 300 + (i * 6),
                            id: i % 3 === 0 ? undefined : 'winter_legendary'
                        };
                    }
                }

                tiers.push({
                    tier: i,
                    xpRequired: this.xpPerTier * i,
                    freeReward: rewards.free[i] || null,
                    premiumReward: rewards.premium[i] || null
                });
            }

            return tiers;
        },

        getTiers: function () {
            return this.generateTiers();
        }
    };

    // ═══════════════════════════════════════════════════════════════
    // BUNDLES
    // ═══════════════════════════════════════════════════════════════

    const BUNDLES = [
        {
            id: 'bundle_starter',
            name: 'Starter Pack',
            description: 'Everything you need to begin your nightmare',
            originalPrice: 1500,
            salePrice: 500,
            currency: 'gems',
            items: [
                { type: 'currency', currency: 'gems', amount: 300 },
                { type: 'cosmetic', id: 'skin_shadow' },
                { type: 'cosmetic', id: 'trail_blood' },
                { type: 'booster', id: 'boost_xp_24h', amount: 1 },
            ],
            limited: false,
            tier: 'none',
            image: '📦',
        },
        {
            id: 'bundle_hunter',
            name: 'Hunter\'s Arsenal',
            description: 'Advanced cosmetics for serious hunters',
            originalPrice: 3000,
            salePrice: 1500,
            currency: 'gems',
            items: [
                { type: 'currency', currency: 'gems', amount: 500 },
                { type: 'cosmetic', id: 'skin_hunter' },
                { type: 'cosmetic', id: 'skin_werewolf' },
                { type: 'cosmetic', id: 'trail_fire' },
                { type: 'cosmetic', id: 'aura_blood' },
                { type: 'booster', id: 'boost_xp_24h', amount: 2 },
            ],
            limited: false,
            tier: 'pro',
            image: '🗡️',
        },
        {
            id: 'bundle_eldergod',
            name: 'Elder God Ascension',
            description: 'Ultimate power bundle',
            originalPrice: 6000,
            salePrice: 3000,
            currency: 'gems',
            items: [
                { type: 'currency', currency: 'gems', amount: 1500 },
                { type: 'cosmetic', id: 'skin_eldergod' },
                { type: 'cosmetic', id: 'skin_void' },
                { type: 'cosmetic', id: 'skin_demon' },
                { type: 'cosmetic', id: 'trail_souls' },
                { type: 'cosmetic', id: 'aura_eldritch' },
                { type: 'cosmetic', id: 'title_eldergod' },
                { type: 'booster', id: 'boost_xp_24h', amount: 5 },
            ],
            limited: false,
            tier: 'max',
            image: '🜏',
        },
        {
            id: 'bundle_winter',
            name: 'Winter Nightmare Bundle',
            description: 'Limited edition winter cosmetics',
            originalPrice: 4000,
            salePrice: 2000,
            currency: 'gems',
            items: [
                { type: 'battlepass', id: 'winter_2024', premium: true },
                { type: 'currency', currency: 'gems', amount: 500 },
                { type: 'cosmetic', id: 'skin_frost_demon' },
                { type: 'cosmetic', id: 'trail_frost' },
                { type: 'booster', id: 'boost_xp_24h', amount: 3 },
            ],
            limited: true,
            endDate: '2025-02-28',
            tier: 'lite',
            image: '❄️',
        },
        {
            id: 'bundle_halloween',
            name: 'Blood Moon Bundle',
            description: 'Spooky cosmetics collection',
            originalPrice: 3500,
            salePrice: 1800,
            currency: 'gems',
            items: [
                { type: 'currency', currency: 'gems', amount: 600 },
                { type: 'cosmetic', id: 'skin_vampire' },
                { type: 'cosmetic', id: 'skin_ghost' },
                { type: 'cosmetic', id: 'skin_scarecrow' },
                { type: 'cosmetic', id: 'trail_fire' },
            ],
            limited: true,
            tier: 'pro',
            image: '🎃',
        },
    ];

    // ═══════════════════════════════════════════════════════════════
    // GIFT SUBSCRIPTIONS
    // ═══════════════════════════════════════════════════════════════

    const GIFT_OPTIONS = [
        { id: 'gift_survivor_1m', tier: 'lite', duration: 1, price: 2, currency: 'usd', name: 'Survivor (1 Month)' },
        { id: 'gift_survivor_3m', tier: 'lite', duration: 3, price: 5, currency: 'usd', name: 'Survivor (3 Months)' },
        { id: 'gift_survivor_12m', tier: 'lite', duration: 12, price: 18, currency: 'usd', name: 'Survivor (1 Year)' },
        { id: 'gift_hunter_1m', tier: 'pro', duration: 1, price: 5, currency: 'usd', name: 'Hunter (1 Month)' },
        { id: 'gift_hunter_3m', tier: 'pro', duration: 3, price: 13, currency: 'usd', name: 'Hunter (3 Months)' },
        { id: 'gift_hunter_12m', tier: 'pro', duration: 12, price: 48, currency: 'usd', name: 'Hunter (1 Year)' },
        { id: 'gift_elder_1m', tier: 'max', duration: 1, price: 8, currency: 'usd', name: 'Elder God (1 Month)' },
        { id: 'gift_elder_3m', tier: 'max', duration: 3, price: 21, currency: 'usd', name: 'Elder God (3 Months)' },
        { id: 'gift_elder_12m', tier: 'max', duration: 12, price: 75, currency: 'usd', name: 'Elder God (1 Year)' },
    ];

    // ═══════════════════════════════════════════════════════════════
    // LIMITED TIME OFFERS
    // ═══════════════════════════════════════════════════════════════

    const LIMITED_OFFERS = [
        {
            id: 'lto_weekend',
            name: 'Weekend Flash Sale',
            discount: 30,
            appliesTo: 'all',
            startTime: '2024-12-06T00:00:00Z',
            endTime: '2024-12-08T23:59:59Z',
            recurring: 'weekly',
            image: '⚡',
        },
        {
            id: 'lto_winter',
            name: 'Winter Sale',
            discount: 40,
            appliesTo: 'bundles',
            startTime: '2024-12-20T00:00:00Z',
            endTime: '2025-01-05T23:59:59Z',
            recurring: false,
            image: '❄️',
        },
        {
            id: 'lto_monthly',
            name: 'Monthly Deal',
            discount: 20,
            appliesTo: 'skins',
            startTime: '2024-12-01T00:00:00Z',
            endTime: '2024-12-31T23:59:59Z',
            recurring: 'monthly',
            image: '📅',
        },
    ];

    // ═══════════════════════════════════════════════════════════════
    // CURRENCY PACKS
    // ═══════════════════════════════════════════════════════════════

    const CURRENCY_PACKS = [
        { id: 'gems_100', gems: 100, price: 0.99, bonus: 0, currency: 'usd' },
        { id: 'gems_500', gems: 500, price: 4.99, bonus: 50, currency: 'usd' },
        { id: 'gems_1000', gems: 1000, price: 9.99, bonus: 150, currency: 'usd', popular: true },
        { id: 'gems_2500', gems: 2500, price: 24.99, bonus: 500, currency: 'usd' },
        { id: 'gems_5000', gems: 5000, price: 49.99, bonus: 1200, currency: 'usd', bestValue: true },
        { id: 'gems_10000', gems: 10000, price: 99.99, bonus: 3000, currency: 'usd' },
    ];

    // ═══════════════════════════════════════════════════════════════
    // LOOT BOXES
    // ═══════════════════════════════════════════════════════════════

    const LOOT_BOXES = {
        winter_common: {
            name: 'Winter Common Box',
            rarity: 'common',
            items: ['currency_souls_100', 'currency_souls_200', 'emote_freeze'],
            guaranteedRarity: 'common',
        },
        winter_uncommon: {
            name: 'Winter Uncommon Box',
            rarity: 'uncommon',
            items: ['currency_souls_300', 'cursor_snowflake', 'theme_winter'],
            guaranteedRarity: 'uncommon',
        },
        winter_rare: {
            name: 'Winter Rare Box',
            rarity: 'rare',
            items: ['currency_gems_50', 'trail_frost', 'aura_frozen'],
            guaranteedRarity: 'rare',
        },
        winter_epic: {
            name: 'Winter Epic Box',
            rarity: 'epic',
            items: ['currency_gems_100', 'death_shatter', 'kill_freeze'],
            guaranteedRarity: 'epic',
        },
        winter_legendary: {
            name: 'Winter Legendary Box',
            rarity: 'legendary',
            items: ['currency_gems_200', 'trail_aurora', 'aura_blizzard'],
            guaranteedRarity: 'legendary',
        },
        winter_mythic: {
            name: 'Winter Mythic Box',
            rarity: 'mythic',
            items: ['currency_gems_500', 'frame_snowflake', 'emote_snowball'],
            guaranteedRarity: 'mythic',
        },
    };

    // ═══════════════════════════════════════════════════════════════
    // STATE MANAGEMENT
    // ═══════════════════════════════════════════════════════════════

    let state = {
        balance: {
            souls: 0,
            gems: 0,
        },
        inventory: [],
        battlePass: {
            owned: false,
            premium: false,
            tier: 1,
            xp: 0,
        },
        activeBoosters: [],
        activeSkin: null,
        activeEffects: {},
    };

    let storeContainer = null;
    const apiBase = '/api';
    const PREMIUM_CURRENCY_SOURCES_FALLBACK = [
        { label: 'Daily login (Day 7)', gems: '25', frequency: 'Weekly' },
        { label: 'Battle Pass free tier', gems: '200-500', frequency: 'Seasonal' },
        { label: 'Achievements', gems: '5-200', frequency: 'One-time' },
        { label: 'Referrals', gems: '100-5,000', frequency: 'Per referral' },
        { label: 'Daily Quests (3/day)', gems: '15 gem dust + souls + chest chance', frequency: 'Daily' },
        { label: 'Weekly Quests', gems: '300-1,000', frequency: 'Weekly' },
        { label: 'Season Quest Finale', gems: '5,000 + exclusive skin', frequency: 'Seasonal' },
        { label: 'Tournament participation', gems: '50-1,000 (+ items)', frequency: 'Per event' },
        { label: 'Seasonal events', gems: '50-500', frequency: 'Per event' },
        { label: 'Level milestones', gems: '10-50', frequency: 'Every 25 levels' },
        { label: 'Community goals', gems: '50-100', frequency: 'Milestone' },
        { label: 'Holiday events', gems: '2x rewards weekends', frequency: 'Event-based' },
    ];
    const backendState = {
        seasonalItems: [],
        marketplaceListings: [],
        loyaltyStatus: null,
        adsStatus: null,
        revenueStatus: null,
        spinStatus: null,
        treasureMapStatus: null,
        premiumCurrency: null,
        gemConversionStatus: null,
        adSession: null,
        unavailable: false,
    };

    // ═══════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════

    function init() {
        // Styles first so UI doesn't degrade to unstyled markup if storage is blocked.
        injectStyles();
        loadState();
        console.log('[ScaryStore] Initialized');

        // Cross-tab sync: if another tab purchases/equips something, reflect it here.
        if (window.SGAIStateBus && typeof window.SGAIStateBus.on === 'function') {
            window.SGAIStateBus.on(function (msg, remote) {
                if (!remote || !msg || msg.type !== 'STATE_UPDATED') return;
                if (msg.source === 'store') return;

                // Reload store state from storage and refresh visible UI.
                loadState();
                try { updateBalanceDisplay(); } catch (e) { }

                if (storeContainer && storeContainer.classList.contains('open')) {
                    try {
                        const activeTab = storeContainer?.querySelector('.store-tab.active')?.dataset?.tab || 'featured';
                        renderTab(activeTab);
                    } catch (e) { }
                }
            });
        }
    }

    function getUserTier() {
        try {
            const raw = localStorage.getItem('sgai-tier') || localStorage.getItem('sgai-sub-tier') || 'none';
            const tier = String(raw).toLowerCase().trim();

            const normalized = {
                none: 'none',
                free: 'none',

                lite: 'lite',
                survivor: 'lite',
                plus: 'lite',

                pro: 'pro',
                hunter: 'pro',

                max: 'max',
                elder: 'max',
                'elder god': 'max',
                vip: 'max',
            };

            return normalized[tier] || 'none';
        } catch (_) {
            return 'none';
        }
    }

    function getTierLabel(tier) {
        switch (tier) {
            case 'lite':
                return { key: 'lite', label: 'Survivor', short: 'SURVIVOR' };
            case 'pro':
                return { key: 'pro', label: 'Hunter', short: 'HUNTER' };
            case 'max':
                return { key: 'max', label: 'Elder God', short: 'ELDER GOD' };
            default:
                return { key: 'none', label: 'Free', short: 'FREE' };
        }
    }

    function applyTierTheme() {
        if (!storeContainer) return;

        const tier = getUserTier();
        const badge = storeContainer.querySelector('[data-store-tier-badge]');
        const badgeMeta = getTierLabel(tier);

        storeContainer.dataset.tier = tier;

        if (badge) {
            badge.textContent = badgeMeta.short;
            badge.setAttribute('data-tier', tier);
            badge.setAttribute('title', `Subscription tier: ${badgeMeta.label}`);
        }

        const vars = {
            none: {
                accent: '#cc1122',
                accent2: '#f03c4a',
                glow: 'rgba(204, 17, 34, 0.35)',
                sparkle: '0'
            },
            lite: {
                accent: '#06b6d4',
                accent2: '#7dd3fc',
                glow: 'rgba(6, 182, 212, 0.35)',
                sparkle: '0.12'
            },
            pro: {
                accent: '#a855f7',
                accent2: '#f97316',
                glow: 'rgba(168, 85, 247, 0.4)',
                sparkle: '0.22'
            },
            max: {
                accent: '#fbbf24',
                accent2: '#a855f7',
                glow: 'rgba(251, 191, 36, 0.45)',
                sparkle: '0.38'
            }
        };

        const theme = vars[tier] || vars.none;

        const applyVars = (el) => {
            if (!el || !el.style) return;
            el.style.setProperty('--store-accent', theme.accent);
            el.style.setProperty('--store-accent-2', theme.accent2);
            el.style.setProperty('--store-tier-glow', theme.glow);
            el.style.setProperty('--store-sparkle', theme.sparkle);
        };

        applyVars(storeContainer);
        applyVars(storeContainer.querySelector('.store-window'));
    }

    function safeLocalStorageGet(key) {
        try {
            return localStorage.getItem(key);
        } catch (e) {
            // Can throw in some embedded/sandboxed contexts (or when storage is disabled).
            console.warn('[ScaryStore] localStorage unavailable (get):', e?.message || e);
            return null;
        }
    }

    function safeLocalStorageSet(key, value) {
        try {
            localStorage.setItem(key, value);
            return true;
        } catch (e) {
            console.warn('[ScaryStore] localStorage unavailable (set):', e?.message || e);
            return false;
        }
    }

    function loadState() {
        const saved = safeLocalStorageGet('sgai-store-state');
        if (!saved) return;

        try {
            state = JSON.parse(saved);
        } catch (e) {
            console.error('[ScaryStore] Failed to load state:', e);
        }
    }

    function saveState() {
        var ok = safeLocalStorageSet('sgai-store-state', JSON.stringify(state));
        if (ok && window.SGAIStateBus && typeof window.SGAIStateBus.broadcastStateUpdated === 'function') {
            window.SGAIStateBus.broadcastStateUpdated({ source: 'store' });
        }
    }

    function generateIdempotencyKey(scope) {
        const rand = Math.random().toString(36).slice(2);
        return `${scope}-${Date.now()}-${rand}`;
    }

    function getAuthToken() {
        return safeLocalStorageGet('sgai-token') || 'demo-token';
    }

    function buildHeaders(extra = {}) {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAuthToken()}`,
            ...extra,
        };
    }

    async function apiRequest(endpoint, options = {}) {
        const response = await fetch(`${apiBase}${endpoint}`, options);
        let data = null;

        try {
            data = await response.json();
        } catch (_) {
            data = null;
        }

        if (!response.ok || (data && data.success === false)) {
            const err = new Error(
                data?.error?.message ||
                data?.message ||
                `Request failed (${response.status})`
            );
            err.status = response.status;
            err.code = data?.error?.code || data?.code || null;
            err.payload = data;
            throw err;
        }

        return data || { success: response.ok };
    }

    async function apiGet(endpoint) {
        return apiRequest(endpoint, {
            method: 'GET',
            headers: buildHeaders({
                'Content-Type': 'application/json',
            }),
        });
    }

    async function apiPost(endpoint, body, { idempotencyScope = null } = {}) {
        const headers = buildHeaders();

        if (idempotencyScope) {
            headers['idempotency-key'] = generateIdempotencyKey(idempotencyScope);
            headers['x-idempotency-key'] = headers['idempotency-key'];
        }

        return apiRequest(endpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify(body || {}),
        });
    }

    function isBackendUnavailableError(error) {
        return error?.status === 503 || error?.code === 'PG_REQUIRED' || error?.code === 'BP_V2_REQUIRES_POSTGRES';
    }

    function syncBalancesFromBackend() {
        const premiumBalances = backendState.premiumCurrency?.balances || null;
        const conversionBalances = backendState.gemConversionStatus?.balances || null;
        const merged = premiumBalances || conversionBalances;
        if (!merged || typeof merged !== 'object') return;

        let changed = false;
        const souls = Number(merged.souls);
        const gems = Number(merged.gems);

        if (Number.isFinite(souls) && souls >= 0 && state.balance.souls !== souls) {
            state.balance.souls = souls;
            changed = true;
        }

        if (Number.isFinite(gems) && gems >= 0 && state.balance.gems !== gems) {
            state.balance.gems = gems;
            changed = true;
        }

        if (changed) {
            saveState();
            updateBalanceDisplay();
        }
    }

    async function refreshBackendSnapshots({ silent = true } = {}) {
        const calls = await Promise.allSettled([
            apiGet('/store/seasonal'),
            apiGet('/marketplace/listings'),
            apiGet('/loyalty/status'),
            apiGet('/ads/status'),
            apiGet('/revenue/status'),
            apiGet('/engagement/daily-spin/status'),
            apiGet('/engagement/treasure-map/status'),
            apiGet('/engagement/premium-currency/sources'),
            apiGet('/engagement/gem-dust/conversion-status'),
        ]);

        const [seasonal, marketplace, loyalty, ads, revenue, spin, treasure, premiumCurrency, gemConversion] = calls;

        backendState.seasonalItems = seasonal.status === 'fulfilled' ? (seasonal.value.items || []) : [];
        backendState.marketplaceListings = marketplace.status === 'fulfilled' ? (marketplace.value.listings || []) : [];
        backendState.loyaltyStatus = loyalty.status === 'fulfilled' ? loyalty.value : null;
        backendState.adsStatus = ads.status === 'fulfilled' ? ads.value : null;
        backendState.revenueStatus = revenue.status === 'fulfilled' ? revenue.value : null;
        backendState.spinStatus = spin.status === 'fulfilled' ? spin.value : null;
        backendState.treasureMapStatus = treasure.status === 'fulfilled' ? treasure.value : null;
        backendState.premiumCurrency = premiumCurrency.status === 'fulfilled' ? premiumCurrency.value : null;
        backendState.gemConversionStatus = gemConversion.status === 'fulfilled' ? gemConversion.value : null;

        syncBalancesFromBackend();

        const errors = calls
            .filter(c => c.status === 'rejected')
            .map(c => c.reason)
            .filter(Boolean);

        backendState.unavailable = errors.some(isBackendUnavailableError);

        if (!silent && backendState.unavailable) {
            showNotification('Some backend features are temporarily unavailable. Using local fallback where possible.', 'info');
        }
    }

    function renderSeasonalCatalog() {
        if (!backendState.seasonalItems.length) {
            return '<p class="section-desc">No active seasonal items right now.</p>';
        }

        return `
            <div class="items-grid">
                ${backendState.seasonalItems.map(item => `
                    <div class="item-card rare">
                        <div class="item-rarity">SEASONAL</div>
                        <div class="item-icon">🎯</div>
                        <div class="item-name">${item.name || item.itemKey}</div>
                        <div class="item-price">
                            <span class="price-current">${Number(item.priceCoins || 0).toLocaleString()} 👻</span>
                        </div>
                        <button class="item-buy-btn" onclick="ScaryStore.buySeasonalItem('${item.itemKey}')">Buy</button>
                    </div>
                `).join('')}
            </div>
        `;
    }

    function renderMarketplacePanel() {
        if (!backendState.marketplaceListings.length) {
            return '<p class="section-desc">No active marketplace listings.</p>';
        }

        return `
            <div class="bundles-grid">
                ${backendState.marketplaceListings.slice(0, 6).map(listing => `
                    <div class="bundle-card">
                        <div class="bundle-icon">🏪</div>
                        <div class="bundle-name">${listing.itemKey}</div>
                        <div class="bundle-pricing">
                            <span class="bundle-sale">${Number(listing.priceCoins || 0).toLocaleString()} 👻</span>
                        </div>
                        <button class="bundle-buy-btn" onclick="ScaryStore.buyMarketplaceListing('${listing.id}')">Buy Listing</button>
                    </div>
                `).join('')}
            </div>
        `;
    }

    function renderEngagementPanel() {
        const spin = backendState.spinStatus;
        const treasure = backendState.treasureMapStatus;
        const conversion = backendState.gemConversionStatus || backendState.premiumCurrency?.gemDustConversion || null;

        const freeSpinLabel = spin
            ? (spin.canClaimFreeSpin ? 'Free Spin Ready' : 'Free Spin Claimed')
            : 'Unavailable';
        const treasureLabel = treasure
            ? `${(treasure.ownedPieces || []).length}/6 pieces`
            : 'Unavailable';
        const conversionLabel = conversion
            ? `${Number(conversion.convertibleNow || 0)} gems available`
            : 'Unavailable';

        return `
            <div class="engagement-grid">
                <div class="engagement-card">
                    <h3>🎡 Daily Spin</h3>
                    <p class="section-desc">${freeSpinLabel}</p>
                    <div class="engagement-actions">
                        <button class="item-buy-btn" onclick="ScaryStore.claimFreeSpin()">${spin?.canClaimFreeSpin ? 'Claim Free Spin' : 'Free Spin Used'}</button>
                        <button class="item-buy-btn" onclick="ScaryStore.claimPremiumSpin()">Premium Spin (10 💎)</button>
                    </div>
                </div>
                <div class="engagement-card">
                    <h3>🗺️ Treasure Maps</h3>
                    <p class="section-desc">${treasureLabel} • Guaranteed legendary at 6/6</p>
                    <div class="engagement-actions">
                        <button class="item-buy-btn" onclick="ScaryStore.claimTreasurePiece()">Find Map Piece</button>
                        <button class="item-buy-btn" onclick="ScaryStore.claimTreasureReward()">Unlock Treasure</button>
                    </div>
                </div>
                <div class="engagement-card">
                    <h3>🛠️ Crafting</h3>
                    <p class="section-desc">Combine 3 uncommon skins + 15 💎 for guaranteed rare output.</p>
                    <div class="engagement-actions">
                        <button class="item-buy-btn" onclick="ScaryStore.craftRareSkin()">Craft Rare Skin</button>
                    </div>
                </div>
                <div class="engagement-card">
                    <h3>🔄 Gem Dust Conversion</h3>
                    <p class="section-desc">${conversionLabel} • Rate 100 dust = 1 gem</p>
                    <div class="engagement-actions">
                        <button class="item-buy-btn" onclick="ScaryStore.convertGemDustToGems()">Convert Dust</button>
                    </div>
                </div>
            </div>
        `;
    }

    function renderPremiumCurrencySources() {
        const payload = backendState.premiumCurrency || {};
        const rows = Array.isArray(payload.sources) && payload.sources.length
            ? payload.sources.map(item => ({
                label: item.label || item.key || 'Unknown',
                gems: item.gems || '-',
                frequency: item.frequency || '-'
            }))
            : PREMIUM_CURRENCY_SOURCES_FALLBACK;

        const estimate = payload.estimatedMonthlyF2pGems || { min: 1000, max: 2000 };
        const estimateText = `~${Number(estimate.min || 1000).toLocaleString()}-${Number(estimate.max || 2000).toLocaleString()} gems/month`;

        return `
            <table class="premium-sources-table">
                <thead>
                    <tr>
                        <th>Source</th>
                        <th>Gems</th>
                        <th>Frequency</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows.map(row => `
                        <tr>
                            <td>${row.label}</td>
                            <td>${row.gems}</td>
                            <td>${row.frequency}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <p class="section-desc"><strong>Total F2P per month:</strong> ${estimateText}</p>
        `;
    }

    function renderGemDustConversionPanel() {
        const conversion = backendState.gemConversionStatus || backendState.premiumCurrency?.gemDustConversion || null;
        const balanceGemDust = Number(conversion?.balances?.gemDust ?? backendState.premiumCurrency?.balances?.gemDust ?? 0);
        const convertedThisMonth = Number(conversion?.convertedThisMonth || 0);
        const remainingCap = Number(conversion?.remainingMonthlyCap || 0);
        const convertibleNow = Number(conversion?.convertibleNow || 0);

        return `
            <div class="conversion-panel">
                <div class="conversion-metrics">
                    <span>Gem Dust: <strong>${balanceGemDust.toLocaleString()}</strong></span>
                    <span>Rate: <strong>100 dust = 1 gem</strong></span>
                    <span>Monthly cap: <strong>500 gems</strong></span>
                    <span>Converted this month: <strong>${convertedThisMonth}</strong></span>
                    <span>Remaining cap: <strong>${remainingCap}</strong></span>
                    <span>Convertible now: <strong>${convertibleNow}</strong></span>
                </div>
                <div class="conversion-actions">
                    <input id="store-convert-gems-input" type="number" min="1" max="500" value="1" />
                    <button class="item-buy-btn" onclick="ScaryStore.convertGemDustToGemsFromInput()">Convert</button>
                </div>
                <p class="section-desc">Cap prevents hoarding exploits while keeping premium access fair for F2P players.</p>
            </div>
        `;
    }

    // ═══════════════════════════════════════════════════════════════
    // STORE UI
    // ═══════════════════════════════════════════════════════════════

    function openStore(tab = 'featured') {
        // Defensive: if init() was blocked by storage/CSP/etc, ensure styles still apply.
        injectStyles();

        if (!storeContainer) {
            createStoreContainer();
        }

        applyTierTheme();

        storeContainer.classList.add('open');
        document.body.style.overflow = 'hidden';

        renderTab(tab);

        // Accessibility: focus something inside the dialog.
        storeContainer.querySelector('.store-close')?.focus?.({ preventScroll: true });

        refreshBackendSnapshots({ silent: true }).then(() => {
            applyTierTheme();
            const activeTab = storeContainer?.querySelector('.store-tab.active')?.dataset?.tab || tab;
            renderTab(activeTab);
        }).catch(() => {
            // Preserve legacy rendering if backend calls fail.
        });
    }

    function closeStore() {
        if (storeContainer) {
            storeContainer.classList.remove('open');
            document.body.style.overflow = '';
        }
    }

    function createStoreContainer() {
        storeContainer = document.createElement('div');
        storeContainer.id = 'scary-store-container';
        storeContainer.innerHTML = `
            <div class="store-overlay"></div>
            <div class="store-window" role="dialog" aria-modal="true" aria-labelledby="store-modal-title" tabindex="-1">
                <div class="store-header">
                    <div class="store-header-left">
                        <h1 class="store-title" id="store-modal-title">🛒 Scary Store</h1>
                        <span class="store-tier-badge" data-store-tier-badge="true">FREE</span>
                    </div>
                    <div class="store-balance">
                        <span class="balance-souls">👻 <span id="store-souls">${state.balance.souls}</span></span>
                        <span class="balance-gems">💎 <span id="store-gems">${state.balance.gems}</span></span>
                    </div>
                    <button class="store-close" type="button" aria-label="Close store">×</button>
                </div>
                <div class="store-tabs" role="tablist" aria-label="Store sections">
                    <button class="store-tab active" type="button" data-tab="featured" role="tab" aria-selected="true">⭐ Featured</button>
                    <button class="store-tab" type="button" data-tab="battlepass" role="tab" aria-selected="false">❄️ Battle Pass</button>
                    <button class="store-tab" type="button" data-tab="skins" role="tab" aria-selected="false">👤 Skins</button>
                    <button class="store-tab" type="button" data-tab="effects" role="tab" aria-selected="false">✨ Effects</button>
                    <button class="store-tab" type="button" data-tab="bundles" role="tab" aria-selected="false">📦 Bundles</button>
                    <button class="store-tab" type="button" data-tab="currency" role="tab" aria-selected="false">💎 Currency</button>
                    <button class="store-tab" type="button" data-tab="gifts" role="tab" aria-selected="false">🎁 Gifts</button>
                </div>
                <div class="store-content" id="store-content" role="tabpanel"></div>
            </div>
        `;

        document.body.appendChild(storeContainer);

        storeContainer.querySelector('.store-overlay')?.addEventListener('click', closeStore);
        storeContainer.querySelector('.store-close')?.addEventListener('click', closeStore);

        // Close on escape (only when open)
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && storeContainer?.classList.contains('open')) {
                closeStore();
            }
        });

        // Tab event listeners
        storeContainer.querySelectorAll('.store-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                storeContainer.querySelectorAll('.store-tab').forEach(t => {
                    t.classList.remove('active');
                    t.setAttribute('aria-selected', 'false');
                });
                tab.classList.add('active');
                tab.setAttribute('aria-selected', 'true');
                renderTab(tab.dataset.tab);
            });
        });

        applyTierTheme();
    }

    function renderTab(tab) {
        const content = document.getElementById('store-content');
        if (!content) return;

        switch (tab) {
            case 'featured':
                renderFeatured(content);
                break;
            case 'battlepass':
                renderBattlePass(content);
                break;
            case 'skins':
                renderSkins(content);
                break;
            case 'effects':
                renderEffects(content);
                break;
            case 'bundles':
                renderBundles(content);
                break;
            case 'currency':
                renderCurrency(content);
                break;
            case 'gifts':
                renderGifts(content);
                break;
            default:
                renderFeatured(content);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // FEATURED TAB
    // ═══════════════════════════════════════════════════════════════

    function renderFeatured(container) {
        container.innerHTML = `
            <div class="store-section">
                <h2 class="section-title">🔥 Hot Right Now</h2>
                <div class="featured-grid">
                    ${renderBundleCard(BUNDLES.find(b => b.id === 'bundle_winter'))}
                    ${renderBundleCard(BUNDLES.find(b => b.id === 'bundle_hunter'))}
                </div>
            </div>
            <div class="store-section">
                <h2 class="section-title">🧿 Seasonal Store (Live)</h2>
                ${renderSeasonalCatalog()}
            </div>
            <div class="store-section">
                <h2 class="section-title">🏪 Marketplace (Live)</h2>
                ${renderMarketplacePanel()}
            </div>
            <div class="store-section">
                <h2 class="section-title">❄️ Winter Battle Pass</h2>
                <div class="battlepass-preview">
                    <div class="bp-header">
                        <div class="bp-icon">❄️</div>
                        <div class="bp-info">
                            <h3>Frozen Nightmare</h3>
                            <p>300 Tiers • 220+ Rewards • Long-Season Grind</p>
                        </div>
                        <button class="bp-buy-btn" onclick="ScaryStore.buyBattlePass()">
                            Buy Premium - 1000 💎
                        </button>
                    </div>
                    <div class="bp-preview-tiers">
                        ${renderBattlePassPreview()}
                    </div>
                </div>
            </div>
            <div class="store-section">
                <h2 class="section-title">⚡ Limited Time Offers</h2>
                <div class="offers-grid">
                    ${renderLimitedOffers()}
                </div>
            </div>
            <div class="store-section">
                <h2 class="section-title">🎯 Engagement Features (Live)</h2>
                <p class="section-desc">Spin, treasure maps, crafting, and gem dust conversion wired to backend endpoints.</p>
                ${renderEngagementPanel()}
            </div>
            <div class="store-section">
                <h2 class="section-title">🔗 Backend Integrations</h2>
                <p class="section-desc">Live status hooks for loyalty, watch-to-earn, and revenue streams.</p>
                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                    <button class="item-buy-btn" style="max-width:240px;" onclick="ScaryStore.refreshIntegrations()">Refresh Status</button>
                    <button class="item-buy-btn" style="max-width:240px;" onclick="ScaryStore.startAdWatch()">Start Ad Watch</button>
                    <button class="item-buy-btn" style="max-width:240px;" onclick="ScaryStore.completeAdWatch()">Complete Last Ad</button>
                    <button class="item-buy-btn" style="max-width:240px;" onclick="ScaryStore.claimLoyaltyReward()">Claim Loyalty Reward</button>
                    <button class="item-buy-btn" style="max-width:240px;" onclick="ScaryStore.giftBattlePassTier()">Gift Battle Pass Tier</button>
                </div>
            </div>
        `;
    }

    // ═══════════════════════════════════════════════════════════════
    // BATTLE PASS TAB
    // ═══════════════════════════════════════════════════════════════

    function renderBattlePass(container) {
        const tiers = WINTER_BATTLE_PASS.getTiers();
        const currentTier = state.battlePass.tier;
        const isPremium = state.battlePass.premium;

        container.innerHTML = `
            <div class="battlepass-header">
                <div class="bp-season-info">
                    <span class="bp-season-icon">❄️</span>
                    <div>
                        <h2>Frozen Nightmare</h2>
                        <p>Season 1 • Ends May 31, 2025 • 300 Tiers</p>
                    </div>
                </div>
                <div class="bp-progress">
                    <div class="bp-tier-display">
                        <span class="bp-tier-label">Current Tier</span>
                        <span class="bp-tier-number">${currentTier}</span>
                    </div>
                    <div class="bp-xp-bar">
                        <div class="bp-xp-fill" style="width: ${Math.min(100, ((state.battlePass.xp % WINTER_BATTLE_PASS.xpPerTier) / WINTER_BATTLE_PASS.xpPerTier) * 100)}%"></div>
                        <span class="bp-xp-text">${state.battlePass.xp % WINTER_BATTLE_PASS.xpPerTier} / ${WINTER_BATTLE_PASS.xpPerTier} XP</span>
                    </div>
                </div>
                <div class="bp-actions">
                    ${!isPremium ? `
                        <button class="bp-upgrade-btn" onclick="ScaryStore.buyBattlePass()">
                            <span class="bp-btn-icon">👑</span>
                            <span>Upgrade to Premium</span>
                            <span class="bp-btn-price">1000 💎</span>
                        </button>
                    ` : `
                        <div class="bp-owned-badge">
                            <span>👑</span> Premium Owned
                        </div>
                    `}
                </div>
            </div>
            <div class="battlepass-tiers" id="bp-tiers-container">
                ${tiers.map(tier => renderBattlePassTier(tier, currentTier, isPremium)).join('')}
            </div>
        `;
    }

    function renderBattlePassTier(tier, currentTier, isPremium) {
        const isUnlocked = tier.tier <= currentTier;
        const canClaimFree = isUnlocked && !isClaimed(tier.tier, 'free');
        const canClaimPremium = isUnlocked && isPremium && !isClaimed(tier.tier, 'premium');

        return `
            <div class="bp-tier ${isUnlocked ? 'unlocked' : ''} ${tier.tier === currentTier ? 'current' : ''}" data-tier="${tier.tier}">
                <div class="bp-tier-header">
                    <span class="bp-tier-number">${tier.tier}</span>
                    <span class="bp-tier-xp">${tier.xpRequired} XP</span>
                </div>
                <div class="bp-tier-rewards">
                    <div class="bp-reward free ${canClaimFree && tier.freeReward ? 'claimable' : ''}"
                         onclick="${canClaimFree && tier.freeReward ? `ScaryStore.claimReward(${tier.tier}, 'free')` : ''}">
                        ${tier.freeReward ? renderRewardPreview(tier.freeReward) : '<span class="no-reward">-</span>'}
                        <span class="reward-label">Free</span>
                    </div>
                    <div class="bp-reward premium ${canClaimPremium && tier.premiumReward ? 'claimable' : ''} ${!isPremium ? 'locked' : ''}"
                         onclick="${canClaimPremium && tier.premiumReward ? `ScaryStore.claimReward(${tier.tier}, 'premium')` : ''}">
                        ${tier.premiumReward ? renderRewardPreview(tier.premiumReward) : '<span class="no-reward">-</span>'}
                        <span class="reward-label">Premium</span>
                    </div>
                </div>
            </div>
        `;
    }

    function renderBattlePassPreview() {
        const previewTiers = [25, 50, 100, 200, 300];
        const tiers = WINTER_BATTLE_PASS.getTiers();

        return previewTiers.map(tierNum => {
            const tier = tiers[tierNum - 1];
            return `
                <div class="bp-preview-tier">
                    <span class="preview-tier-num">Tier ${tierNum}</span>
                    <div class="preview-rewards">
                        ${tier.freeReward ? `<div class="preview-reward">${renderRewardPreview(tier.freeReward)}</div>` : ''}
                        ${tier.premiumReward ? `<div class="preview-reward premium">${renderRewardPreview(tier.premiumReward)}</div>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    function renderRewardPreview(reward) {
        switch (reward.type) {
            case 'currency':
                return `<div class="reward-currency">${reward.amount} ${reward.currency === 'gems' ? '💎' : '👻'}</div>`;
            case 'cosmetic':
                const cosmetic = findCosmetic(reward.id);
                return cosmetic ? `
                    <div class="reward-cosmetic ${cosmetic.rarity}">
                        <span class="cosmetic-icon">${cosmetic.image}</span>
                        <span class="cosmetic-name">${cosmetic.name}</span>
                    </div>
                ` : '';
            case 'booster':
                return `<div class="reward-booster">⚡ x${reward.amount || 1}</div>`;
            case 'lootbox':
                return `<div class="reward-lootbox">📦 ${reward.id.split('_')[1]}</div>`;
            default:
                return '';
        }
    }

    function findCosmetic(id) {
        for (const category of Object.values(COSMETICS)) {
            const found = category.find(c => c.id === id);
            if (found) return found;
        }
        return null;
    }

    function isClaimed(tier, type) {
        return state.battlePass.claimed?.includes(`${tier}_${type}`) || false;
    }

    // ═══════════════════════════════════════════════════════════════
    // SKINS TAB
    // ═══════════════════════════════════════════════════════════════

    function renderSkins(container) {
        const userTier = getUserTier();
        const tierLevel = { none: 0, lite: 1, pro: 2, max: 3 }[userTier] ?? 0;

        container.innerHTML = `
            <div class="store-section">
                <h2 class="section-title">👤 Character Skins</h2>
                <div class="items-grid">
                    ${COSMETICS.skins.map(skin => renderItemCard(skin, tierLevel)).join('')}
                </div>
            </div>
        `;
    }

    // ═══════════════════════════════════════════════════════════════
    // EFFECTS TAB
    // ═══════════════════════════════════════════════════════════════

    function renderEffects(container) {
        const userTier = getUserTier();
        const tierLevel = { none: 0, lite: 1, pro: 2, max: 3 }[userTier] ?? 0;

        container.innerHTML = `
            <div class="store-section">
                <h2 class="section-title">✨ Visual Effects</h2>
                <div class="items-grid">
                    ${COSMETICS.effects.map(effect => renderItemCard(effect, tierLevel)).join('')}
                </div>
            </div>
            <div class="store-section">
                <h2 class="section-title">👤 Profile Items</h2>
                <div class="items-grid">
                    ${COSMETICS.profile.map(item => renderItemCard(item, tierLevel)).join('')}
                </div>
            </div>
            <div class="store-section">
                <h2 class="section-title">🖱️ UI & Cursors</h2>
                <div class="items-grid">
                    ${COSMETICS.ui.map(item => renderItemCard(item, tierLevel)).join('')}
                </div>
            </div>
            <div class="store-section">
                <h2 class="section-title">🎭 Emotes</h2>
                <div class="items-grid">
                    ${COSMETICS.emotes.map(emote => renderItemCard(emote, tierLevel)).join('')}
                </div>
            </div>
        `;
    }

    // ═══════════════════════════════════════════════════════════════
    // BUNDLES TAB
    // ═══════════════════════════════════════════════════════════════

    function renderBundles(container) {
        const userTier = getUserTier();
        const tierLevel = { none: 0, lite: 1, pro: 2, max: 3 }[userTier] ?? 0;

        container.innerHTML = `
            <div class="store-section">
                <h2 class="section-title">📦 Bundles</h2>
                <div class="bundles-grid">
                    ${BUNDLES.map(bundle => renderBundleCard(bundle, tierLevel)).join('')}
                </div>
            </div>
            <div class="store-section">
                <h2 class="section-title">⚡ Boosters</h2>
                <div class="items-grid">
                    ${COSMETICS.boosters.map(booster => renderItemCard(booster, tierLevel)).join('')}
                </div>
            </div>
        `;
    }

    // ═══════════════════════════════════════════════════════════════
    // CURRENCY TAB
    // ═══════════════════════════════════════════════════════════════

    function renderCurrency(container) {
        container.innerHTML = `
            <div class="store-section">
                <h2 class="section-title">💎 Blood Gems</h2>
                <p class="section-desc">Premium currency for exclusive items</p>
                <div class="currency-grid">
                    ${CURRENCY_PACKS.map(pack => `
                        <div class="currency-pack ${pack.popular ? 'popular' : ''} ${pack.bestValue ? 'best-value' : ''}" 
                             onclick="ScaryStore.buyCurrency('${pack.id}')">
                            ${pack.popular ? '<span class="pack-badge popular">POPULAR</span>' : ''}
                            ${pack.bestValue ? '<span class="pack-badge best">BEST VALUE</span>' : ''}
                            <div class="pack-gems">
                                <span class="gem-icon">💎</span>
                                <span class="gem-amount">${pack.gems.toLocaleString()}</span>
                                ${pack.bonus > 0 ? `<span class="gem-bonus">+${pack.bonus} BONUS</span>` : ''}
                            </div>
                            <div class="pack-price">$${pack.price}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="store-section">
                <h2 class="section-title">💎 Premium Currency Accessibility</h2>
                <p class="section-desc">F2P sources for premium gems across gameplay and events.</p>
                ${renderPremiumCurrencySources()}
            </div>
            <div class="store-section">
                <h2 class="section-title">🔄 Gem Dust Conversion</h2>
                ${renderGemDustConversionPanel()}
            </div>
        `;
    }

    // ═══════════════════════════════════════════════════════════════
    // GIFTS TAB
    // ═══════════════════════════════════════════════════════════════

    function renderGifts(container) {
        container.innerHTML = `
            <div class="store-section">
                <h2 class="section-title">🎁 Gift Subscriptions</h2>
                <p class="section-desc">Give the gift of horror to a friend</p>
                <div class="gifts-grid">
                    ${GIFT_OPTIONS.map(gift => `
                        <div class="gift-card" onclick="ScaryStore.showGiftModal('${gift.id}')">
                            <div class="gift-tier-icon">${gift.tier === 'lite' ? '🩹' : gift.tier === 'pro' ? '🗡️' : '🜏'}</div>
                            <div class="gift-name">${gift.name}</div>
                            <div class="gift-price">$${gift.price}</div>
                            <button class="gift-btn">Gift Now</button>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="store-section">
                <h2 class="section-title">🎫 Gift Battle Pass Tiers</h2>
                <p class="section-desc">Gift battle pass progress to friends (10 💎 per tier).</p>
                <div class="bp-gift-controls">
                    <input id="store-bp-gift-recipient" type="text" placeholder="Recipient user ID" />
                    <input id="store-bp-gift-tiers" type="number" min="1" max="25" value="1" />
                    <input id="store-bp-gift-message" type="text" placeholder="Message (optional)" />
                    <button class="item-buy-btn" onclick="ScaryStore.giftBattlePassTierFromInputs()">Gift Tiers</button>
                </div>
            </div>
        `;
    }

    // ═══════════════════════════════════════════════════════════════
    // ITEM CARDS
    // ═══════════════════════════════════════════════════════════════

    function renderItemCard(item, userTierLevel) {
        const tierLevel = { none: 0, lite: 1, pro: 2, max: 3 };
        const requiredLevel = tierLevel[item.tier] || 0;
        const isLocked = userTierLevel < requiredLevel;
        const isOwned = state.inventory.includes(item.id);
        const discount = getActiveDiscount(item);
        const finalPrice = discount > 0 ? Math.floor(item.price * (1 - discount / 100)) : item.price;

        return `
            <div class="item-card ${item.rarity} ${isLocked ? 'locked' : ''} ${isOwned ? 'owned' : ''}">
                <div class="item-rarity">${item.rarity.toUpperCase()}</div>
                <div class="item-icon">${item.image}</div>
                <div class="item-name">${item.name}</div>
                ${item.battlePass ? `<div class="item-bp-badge">BP Tier ${item.battlePassTier}${item.premium ? ' 👑' : ''}</div>` : ''}
                ${isOwned ? `
                    <div class="item-owned">OWNED</div>
                ` : isLocked ? `
                    <div class="item-locked">Requires ${item.tier === 'lite' ? 'Survivor' : item.tier === 'pro' ? 'Hunter' : 'Elder God'}</div>
                ` : `
                    <div class="item-price">
                        ${discount > 0 ? `<span class="price-original">${item.price}</span>` : ''}
                        <span class="price-current">${finalPrice} ${item.currency === 'gems' ? '💎' : '👻'}</span>
                    </div>
                    <button class="item-buy-btn" onclick="ScaryStore.buyItem('${item.id}', '${item.currency}')">Buy</button>
                `}
            </div>
        `;
    }

    function renderBundleCard(bundle, userTierLevel) {
        if (!bundle) return '';
        const tierLevel = { none: 0, lite: 1, pro: 2, max: 3 };
        const requiredLevel = tierLevel[bundle.tier] || 0;
        const isLocked = userTierLevel < requiredLevel;
        const discount = Math.round((1 - bundle.salePrice / bundle.originalPrice) * 100);

        return `
            <div class="bundle-card ${isLocked ? 'locked' : ''} ${bundle.limited ? 'limited' : ''}">
                ${bundle.limited ? '<div class="bundle-limited-badge">LIMITED TIME</div>' : ''}
                <div class="bundle-icon">${bundle.image}</div>
                <div class="bundle-name">${bundle.name}</div>
                <div class="bundle-desc">${bundle.description}</div>
                <div class="bundle-items">
                    ${bundle.items.map(item => `<span class="bundle-item-tag">${item.type}</span>`).join(' ')}
                </div>
                ${isLocked ? `
                    <div class="bundle-locked">Requires ${bundle.tier === 'lite' ? 'Survivor' : bundle.tier === 'pro' ? 'Hunter' : 'Elder God'}</div>
                ` : `
                    <div class="bundle-pricing">
                        <span class="bundle-original">$${(bundle.originalPrice / 100).toFixed(2)}</span>
                        <span class="bundle-sale">${bundle.salePrice} 💎</span>
                        <span class="bundle-discount">-${discount}%</span>
                    </div>
                    <button class="bundle-buy-btn" onclick="ScaryStore.buyBundle('${bundle.id}')">Buy Bundle</button>
                `}
            </div>
        `;
    }

    function renderLimitedOffers() {
        return LIMITED_OFFERS.map(offer => `
            <div class="offer-card">
                <div class="offer-icon">${offer.image}</div>
                <div class="offer-name">${offer.name}</div>
                <div class="offer-discount">-${offer.discount}% OFF</div>
                <div class="offer-applies">Applies to: ${offer.appliesTo}</div>
            </div>
        `).join('');
    }

    // ═══════════════════════════════════════════════════════════════
    // PURCHASE FUNCTIONS
    // ═══════════════════════════════════════════════════════════════

    async function buyItem(itemId, currency) {
        // Find item in all categories
        let item = null;
        for (const category of Object.values(COSMETICS)) {
            item = category.find(c => c.id === itemId);
            if (item) break;
        }

        if (!item) {
            showNotification('Item not found', 'error');
            return;
        }

        const seasonalMatch = backendState.seasonalItems.find(s => s.itemKey === itemId);
        if (seasonalMatch) {
            try {
                await apiPost('/store/seasonal/purchase', {
                    itemKey: itemId,
                    quantity: 1,
                }, { idempotencyScope: 'store-seasonal-purchase' });

                state.inventory.push(itemId);
                saveState();
                showNotification(`Purchased ${item.name}!`, 'success');
                await refreshBackendSnapshots({ silent: true });
                const activeTab = storeContainer?.querySelector('.store-tab.active');
                if (activeTab) renderTab(activeTab.dataset.tab);
                return;
            } catch (error) {
                if (!isBackendUnavailableError(error)) {
                    showNotification(error.message || 'Purchase failed', 'error');
                    return;
                }
                showNotification('Seasonal backend unavailable, using local purchase fallback.', 'info');
            }
        }

        const discount = getActiveDiscount(item);
        const finalPrice = discount > 0 ? Math.floor(item.price * (1 - discount / 100)) : item.price;

        if (currency === 'gems' && state.balance.gems < finalPrice) {
            showNotification('Not enough Blood Gems!', 'error');
            return;
        }

        if (currency === 'souls' && state.balance.souls < finalPrice) {
            showNotification('Not enough Souls!', 'error');
            return;
        }

        // Deduct currency
        if (currency === 'gems') {
            state.balance.gems -= finalPrice;
        } else {
            state.balance.souls -= finalPrice;
        }

        // Add to inventory
        state.inventory.push(itemId);
        saveState();

        showNotification(`Purchased ${item.name}!`, 'success');
        updateBalanceDisplay();

        const activeTab = storeContainer?.querySelector('.store-tab.active');
        if (activeTab) {
            renderTab(activeTab.dataset.tab);
        }
    }

    function buyBundle(bundleId) {
        const bundle = BUNDLES.find(b => b.id === bundleId);
        if (!bundle) {
            showNotification('Bundle not found', 'error');
            return;
        }

        if (state.balance.gems < bundle.salePrice) {
            showNotification('Not enough Blood Gems!', 'error');
            return;
        }

        // Deduct gems
        state.balance.gems -= bundle.salePrice;

        // Add all items
        bundle.items.forEach(item => {
            if (item.type === 'currency') {
                state.balance[item.currency] = (state.balance[item.currency] || 0) + item.amount;
            } else if (item.type === 'cosmetic') {
                state.inventory.push(item.id);
            } else if (item.type === 'booster') {
                for (let i = 0; i < (item.amount || 1); i++) {
                    state.activeBoosters.push({ id: item.id, expires: Date.now() + 86400000 });
                }
            }
        });

        saveState();
        showNotification(`Purchased ${bundle.name}!`, 'success');
        updateBalanceDisplay();

        const activeTab = storeContainer?.querySelector('.store-tab.active');
        if (activeTab) {
            renderTab(activeTab.dataset.tab);
        }
    }

    function buyBattlePass() {
        if (state.battlePass.premium) {
            showNotification('You already own the Premium Battle Pass!', 'error');
            return;
        }

        if (state.balance.gems < WINTER_BATTLE_PASS.premiumPrice) {
            showNotification('Not enough Blood Gems!', 'error');
            return;
        }

        state.balance.gems -= WINTER_BATTLE_PASS.premiumPrice;
        state.battlePass.premium = true;
        state.battlePass.claimed = [];
        saveState();

        showNotification('Battle Pass Premium Unlocked!', 'success');
        updateBalanceDisplay();
        renderBattlePass(document.getElementById('store-content'));
    }

    function buyCurrency(packId) {
        const pack = CURRENCY_PACKS.find(p => p.id === packId);
        if (!pack) return;

        // Simulate purchase (in production, would go through payment processor)
        const totalGems = pack.gems + pack.bonus;
        state.balance.gems += totalGems;
        saveState();

        showNotification(`Added ${totalGems} Blood Gems!`, 'success');
        updateBalanceDisplay();
    }

    function claimReward(tier, type) {
        const tiers = WINTER_BATTLE_PASS.getTiers();
        const tierData = tiers[tier - 1];
        const reward = type === 'free' ? tierData.freeReward : tierData.premiumReward;

        if (!reward) return;

        // Check premium requirement
        if (type === 'premium' && !state.battlePass.premium) {
            showNotification('Premium required for this reward!', 'error');
            return;
        }

        // Apply reward
        switch (reward.type) {
            case 'currency':
                state.balance[reward.currency] = (state.balance[reward.currency] || 0) + reward.amount;
                break;
            case 'cosmetic':
            case 'title':
                state.inventory.push(reward.id);
                break;
            case 'booster':
                for (let i = 0; i < (reward.amount || 1); i++) {
                    state.activeBoosters.push({ id: reward.id, expires: Date.now() + 86400000 });
                }
                break;
            case 'lootbox':
                // Would open lootbox here
                break;
        }

        // Mark as claimed
        if (!state.battlePass.claimed) state.battlePass.claimed = [];
        state.battlePass.claimed.push(`${tier}_${type}`);
        saveState();

        showNotification('Reward claimed!', 'success');
        updateBalanceDisplay();
        renderBattlePass(document.getElementById('store-content'));
    }

    function addXP(amount) {
        const tierBonus = {
            none: 1,
            lite: 1.5,
            pro: 2,
            max: 3,
        };
        const userTier = getUserTier();
        const bonus = tierBonus[userTier] || 1;

        state.battlePass.xp += Math.floor(amount * bonus);

        // Check for tier up
        while (state.battlePass.tier < WINTER_BATTLE_PASS.tiers
            && state.battlePass.xp >= state.battlePass.tier * WINTER_BATTLE_PASS.xpPerTier) {
            state.battlePass.tier++;
            showNotification(`Tier ${state.battlePass.tier} reached!`, 'success');
        }

        saveState();
    }

    // ═══════════════════════════════════════════════════════════════
    // HELPER FUNCTIONS
    // ═══════════════════════════════════════════════════════════════

    function getActiveDiscount(item) {
        let maxDiscount = 0;

        LIMITED_OFFERS.forEach(offer => {
            // Check if offer is active
            const now = Date.now();
            const start = new Date(offer.startTime).getTime();
            const end = new Date(offer.endTime).getTime();

            if (now < start || now > end) return;

            // Check if discount applies
            if (offer.appliesTo === 'all') {
                maxDiscount = Math.max(maxDiscount, offer.discount);
            } else if (offer.appliesTo === 'skins' && COSMETICS.skins.includes(item)) {
                maxDiscount = Math.max(maxDiscount, offer.discount);
            }
            // etc.
        });

        // Apply tier discount
        const userTier = getUserTier();
        const tierDiscount = TIER_DISCOUNTS[userTier] || 0;

        return Math.max(maxDiscount, tierDiscount);
    }

    function updateBalanceDisplay() {
        const soulsEl = document.getElementById('store-souls');
        const gemsEl = document.getElementById('store-gems');
        if (soulsEl) soulsEl.textContent = state.balance.souls.toLocaleString();
        if (gemsEl) gemsEl.textContent = state.balance.gems.toLocaleString();
    }

    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `store-notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    function showGiftModal(giftId) {
        const gift = GIFT_OPTIONS.find(g => g.id === giftId);
        if (!gift) return;

        const modal = document.createElement('div');
        modal.className = 'gift-modal-overlay';
        modal.innerHTML = `
            <div class="gift-modal">
                <h2>Gift ${gift.name}</h2>
                <p>Enter the recipient's email or username:</p>
                <input type="text" class="gift-input" placeholder="friend@email.com or @username">
                <div class="gift-message">
                    <textarea placeholder="Add a personal message (optional)"></textarea>
                </div>
                <div class="gift-actions">
                    <button class="gift-cancel" onclick="this.closest('.gift-modal-overlay').remove()">Cancel</button>
                    <button class="gift-confirm" onclick="ScaryStore.sendGift('${gift.id}')">
                        Send Gift - $${gift.price}
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    async function sendGift(giftId) {
        const gift = GIFT_OPTIONS.find(g => g.id === giftId);
        const modal = document.querySelector('.gift-modal-overlay');
        const recipientRaw = modal?.querySelector('.gift-input')?.value?.trim() || '';
        const message = modal?.querySelector('textarea')?.value?.trim() || '';

        if (!gift) {
            showNotification('Invalid gift selection', 'error');
            return;
        }

        if (!recipientRaw) {
            showNotification('Recipient is required', 'error');
            return;
        }

        const tierMap = {
            lite: 'survivor',
            pro: 'hunter',
            max: 'elder',
        };

        const billingCycle = gift.duration >= 12 ? 'annual' : 'monthly';

        try {
            await apiPost('/subscriptions/gift', {
                recipientUserId: recipientRaw,
                tier: tierMap[gift.tier] || 'survivor',
                billingCycle,
                message,
            }, { idempotencyScope: 'subscription-gift' });

            showNotification('Gift sent successfully!', 'success');
            modal?.remove();
        } catch (error) {
            if (isBackendUnavailableError(error)) {
                showNotification('Gift service temporarily unavailable. Please try again later.', 'info');
            } else {
                showNotification(error.message || 'Gift failed', 'error');
            }
        }
    }

    async function buySeasonalItem(itemKey) {
        try {
            await apiPost('/store/seasonal/purchase', {
                itemKey,
                quantity: 1,
            }, { idempotencyScope: 'store-seasonal-direct' });
            showNotification('Seasonal purchase completed!', 'success');
            await refreshBackendSnapshots({ silent: true });
            renderTab('featured');
        } catch (error) {
            showNotification(error.message || 'Seasonal purchase failed', isBackendUnavailableError(error) ? 'info' : 'error');
        }
    }

    async function createMarketplaceListing(itemKey, priceCoins) {
        try {
            const parsedPrice = Number(priceCoins);
            await apiPost('/marketplace/listings', {
                itemKey,
                priceCoins: parsedPrice,
            }, { idempotencyScope: 'marketplace-create' });
            showNotification('Marketplace listing created!', 'success');
            await refreshBackendSnapshots({ silent: true });
            renderTab('featured');
        } catch (error) {
            showNotification(error.message || 'Failed to create listing', isBackendUnavailableError(error) ? 'info' : 'error');
        }
    }

    async function buyMarketplaceListing(listingId) {
        try {
            await apiPost(`/marketplace/listings/${encodeURIComponent(listingId)}/buy`, {}, { idempotencyScope: 'marketplace-buy' });
            showNotification('Listing purchased!', 'success');
            await refreshBackendSnapshots({ silent: true });
            renderTab('featured');
        } catch (error) {
            showNotification(error.message || 'Failed to buy listing', isBackendUnavailableError(error) ? 'info' : 'error');
        }
    }

    async function cancelMarketplaceListing(listingId) {
        try {
            await apiPost(`/marketplace/listings/${encodeURIComponent(listingId)}/cancel`, {}, { idempotencyScope: 'marketplace-cancel' });
            showNotification('Listing canceled!', 'success');
            await refreshBackendSnapshots({ silent: true });
            renderTab('featured');
        } catch (error) {
            showNotification(error.message || 'Failed to cancel listing', isBackendUnavailableError(error) ? 'info' : 'error');
        }
    }

    async function sendItemGift(recipientUserId, itemKey, message = '') {
        try {
            await apiPost('/gifts/item', {
                recipientUserId,
                itemKey,
                message,
            }, { idempotencyScope: 'gift-item' });
            showNotification('Item gift sent!', 'success');
        } catch (error) {
            showNotification(error.message || 'Item gift failed', isBackendUnavailableError(error) ? 'info' : 'error');
        }
    }

    async function startAdWatch(placementKey = 'store_featured') {
        try {
            const result = await apiPost('/ads/start', {
                placementKey,
            }, { idempotencyScope: 'ads-start' });
            backendState.adSession = { sessionId: result.sessionId, nonce: result.nonce };
            showNotification('Ad session started. Complete after viewing.', 'success');
            await refreshBackendSnapshots({ silent: true });
        } catch (error) {
            showNotification(error.message || 'Unable to start ad watch', isBackendUnavailableError(error) ? 'info' : 'error');
        }
    }

    async function completeAdWatch() {
        if (!backendState.adSession?.sessionId || !backendState.adSession?.nonce) {
            showNotification('No active ad session. Start one first.', 'error');
            return;
        }

        try {
            await apiPost('/ads/complete', {
                sessionId: backendState.adSession.sessionId,
                nonce: backendState.adSession.nonce,
            }, { idempotencyScope: 'ads-complete' });
            backendState.adSession = null;
            showNotification('Ad reward claimed!', 'success');
            await refreshBackendSnapshots({ silent: true });
        } catch (error) {
            showNotification(error.message || 'Unable to complete ad watch', isBackendUnavailableError(error) ? 'info' : 'error');
        }
    }

    async function claimLoyaltyReward(rewardKey = null) {
        const key = rewardKey || window.prompt('Enter loyalty reward key (e.g. BRONZE_DAILY, DIAMOND_VAULT):');
        if (!key) return;

        try {
            await apiPost('/loyalty/claim', {
                rewardKey: key,
            }, { idempotencyScope: 'loyalty-claim' });
            showNotification('Loyalty reward claimed!', 'success');
            await refreshBackendSnapshots({ silent: true });
        } catch (error) {
            showNotification(error.message || 'Unable to claim loyalty reward', isBackendUnavailableError(error) ? 'info' : 'error');
        }
    }

    function applyBackendBalances(balances) {
        if (!balances || typeof balances !== 'object') return;

        const souls = Number(balances.souls);
        const gems = Number(balances.gems);

        if (Number.isFinite(souls) && souls >= 0) {
            state.balance.souls = souls;
        }
        if (Number.isFinite(gems) && gems >= 0) {
            state.balance.gems = gems;
        }

        saveState();
        updateBalanceDisplay();
    }

    async function claimFreeSpin() {
        try {
            const result = await apiPost('/engagement/daily-spin/free', {}, { idempotencyScope: 'engagement-spin-free' });
            applyBackendBalances(result.balances);
            const rewardSummary = result.reward?.rewardType === 'gems'
                ? `+${result.reward.amount} 💎`
                : result.reward?.rewardType === 'souls'
                    ? `+${result.reward.amount} 👻`
                    : (result.reward?.itemKey || 'item');
            showNotification(`Free spin reward: ${rewardSummary}`, 'success');
            await refreshBackendSnapshots({ silent: true });
            renderTab('featured');
        } catch (error) {
            showNotification(error.message || 'Unable to claim free spin', isBackendUnavailableError(error) ? 'info' : 'error');
        }
    }

    async function claimPremiumSpin() {
        try {
            const result = await apiPost('/engagement/daily-spin/premium', {}, { idempotencyScope: 'engagement-spin-premium' });
            applyBackendBalances(result.balances);
            const rewardSummary = result.reward?.rewardType === 'gems'
                ? `+${result.reward.amount} 💎`
                : result.reward?.rewardType === 'souls'
                    ? `+${result.reward.amount} 👻`
                    : (result.reward?.itemKey || 'item');
            showNotification(`Premium spin reward: ${rewardSummary}`, 'success');
            await refreshBackendSnapshots({ silent: true });
            renderTab('featured');
        } catch (error) {
            showNotification(error.message || 'Unable to claim premium spin', isBackendUnavailableError(error) ? 'info' : 'error');
        }
    }

    async function claimTreasurePiece(sourceGame = 'store_hub') {
        try {
            const result = await apiPost('/engagement/treasure-map/piece', {
                sourceGame,
            }, { idempotencyScope: 'engagement-map-piece' });
            const piece = Number(result.pieceNumber || 0);
            showNotification(piece > 0 ? `Found treasure map piece #${piece}!` : 'Found a treasure map piece!', 'success');
            await refreshBackendSnapshots({ silent: true });
            renderTab('featured');
        } catch (error) {
            showNotification(error.message || 'Unable to claim map piece', isBackendUnavailableError(error) ? 'info' : 'error');
        }
    }

    async function claimTreasureReward() {
        try {
            const result = await apiPost('/engagement/treasure-map/claim', {}, { idempotencyScope: 'engagement-map-claim' });
            const reward = result.reward?.itemKey || 'legendary skin';
            if (result.reward?.itemKey) {
                state.inventory.push(result.reward.itemKey);
                saveState();
            }
            showNotification(`Treasure unlocked: ${reward}`, 'success');
            await refreshBackendSnapshots({ silent: true });
            renderTab('featured');
        } catch (error) {
            showNotification(error.message || 'Unable to unlock treasure', isBackendUnavailableError(error) ? 'info' : 'error');
        }
    }

    async function craftRareSkin() {
        const uncommonPool = ['skin_shadow', 'skin_bloodied', 'skin_woodsman'];
        const ownedInputs = uncommonPool.filter(item => state.inventory.includes(item));
        if (ownedInputs.length < 3) {
            showNotification('Need 3 uncommon skins (Shadow, Bloodied, Woodsman) to craft.', 'error');
            return;
        }

        const recipeInputs = ownedInputs.slice(0, 3);

        try {
            const result = await apiPost('/engagement/crafting/skins/combine', {
                itemKeys: recipeInputs,
            }, { idempotencyScope: 'engagement-craft-skin' });

            recipeInputs.forEach(itemKey => {
                const idx = state.inventory.indexOf(itemKey);
                if (idx >= 0) state.inventory.splice(idx, 1);
            });

            if (result.output?.itemKey) {
                state.inventory.push(result.output.itemKey);
            }

            if (Number.isFinite(Number(result.remainingGems))) {
                state.balance.gems = Number(result.remainingGems);
            }

            saveState();
            updateBalanceDisplay();

            const outputName = result.output?.itemKey || 'rare skin';
            showNotification(`Crafted: ${outputName}`, 'success');
            await refreshBackendSnapshots({ silent: true });
            renderTab('featured');
        } catch (error) {
            showNotification(error.message || 'Unable to craft skin', isBackendUnavailableError(error) ? 'info' : 'error');
        }
    }

    async function giftBattlePassTier(recipientUserId = null, tierCount = null, message = null) {
        const recipient = recipientUserId || window.prompt('Recipient user ID:');
        if (!recipient) return;

        const tierRaw = tierCount != null ? String(tierCount) : window.prompt('How many tiers to gift? (1-25)', '1');
        const tiers = parseInt(tierRaw, 10);
        if (!Number.isFinite(tiers) || tiers < 1 || tiers > 25) {
            showNotification('Tier count must be between 1 and 25', 'error');
            return;
        }

        const note = message != null ? String(message) : (window.prompt('Optional message:', '') || '');

        try {
            const result = await apiPost('/subscriptions/battle-pass/v2/gift-tier', {
                recipientUserId: recipient.trim(),
                tierCount: tiers,
                message: note.trim(),
            }, { idempotencyScope: 'battle-pass-gift-tier' });

            const gemCost = Number(result.gemCost || (tiers * 10));
            state.balance.gems = Math.max(0, state.balance.gems - gemCost);
            saveState();
            updateBalanceDisplay();

            showNotification(`Gifted ${tiers} tier(s)!`, 'success');
            await refreshBackendSnapshots({ silent: true });
            renderTab('gifts');
        } catch (error) {
            showNotification(error.message || 'Unable to gift battle pass tiers', isBackendUnavailableError(error) ? 'info' : 'error');
        }
    }

    function giftBattlePassTierFromInputs() {
        const recipient = document.getElementById('store-bp-gift-recipient')?.value?.trim() || '';
        const tierValue = document.getElementById('store-bp-gift-tiers')?.value || '1';
        const message = document.getElementById('store-bp-gift-message')?.value || '';
        giftBattlePassTier(recipient, tierValue, message);
    }

    async function convertGemDustToGems(gems = null) {
        const requested = gems == null
            ? parseInt(window.prompt('How many gems to convert from dust? (1-500)', '1') || '', 10)
            : parseInt(gems, 10);

        if (!Number.isFinite(requested) || requested < 1 || requested > 500) {
            showNotification('Conversion amount must be between 1 and 500', 'error');
            return;
        }

        try {
            const result = await apiPost('/engagement/gem-dust/convert', {
                gems: requested,
            }, { idempotencyScope: 'gem-dust-convert' });

            applyBackendBalances({
                gems: result.balances?.gems,
                souls: state.balance.souls,
            });

            showNotification(`Converted ${result.dustSpent} dust into ${result.gemsConverted} gems`, 'success');
            await refreshBackendSnapshots({ silent: true });
            renderTab('currency');
        } catch (error) {
            showNotification(error.message || 'Unable to convert gem dust', isBackendUnavailableError(error) ? 'info' : 'error');
        }
    }

    function convertGemDustToGemsFromInput() {
        const input = document.getElementById('store-convert-gems-input');
        const requested = parseInt(input?.value || '', 10);
        convertGemDustToGems(requested);
    }

    async function getRevenueStatus() {
        try {
            const status = await apiGet('/revenue/status');
            backendState.revenueStatus = status;
            return status;
        } catch (error) {
            showNotification(error.message || 'Unable to fetch revenue status', isBackendUnavailableError(error) ? 'info' : 'error');
            throw error;
        }
    }

    async function purchaseRevenueStream(payload) {
        return apiPost('/revenue/purchase', payload, { idempotencyScope: 'revenue-purchase' });
    }

    async function consumeTournamentTicket(tournamentId) {
        return apiPost('/revenue/tournament/consume', { tournamentId }, { idempotencyScope: 'revenue-tournament-consume' });
    }

    async function redeemCharacterPack(entitlementId) {
        return apiPost('/revenue/character-pack/redeem', { entitlementId }, { idempotencyScope: 'revenue-character-redeem' });
    }

    async function activateBooster(entitlementId) {
        return apiPost('/revenue/booster/activate', { entitlementId }, { idempotencyScope: 'revenue-booster-activate' });
    }

    async function refreshIntegrations() {
        await refreshBackendSnapshots({ silent: false });
        renderTab('featured');
        showNotification('Backend integration status refreshed', 'success');
    }

    // ═══════════════════════════════════════════════════════════════
    // STYLES
    // ═══════════════════════════════════════════════════════════════

    function injectStyles() {
        if (document.getElementById('scary-store-styles')) return;

        const style = document.createElement('style');
        style.id = 'scary-store-styles';
        style.textContent = `
            /* =========================================================
               ScaryGamesAI — Supreme Store Overlay
               Tier themed via --store-accent / --store-accent-2
               ========================================================= */

            #scary-store-container {
                position: fixed;
                inset: 0;
                z-index: 10000000;
                display: grid;
                place-items: center;
                opacity: 0;
                pointer-events: none;
                transition: opacity 220ms ease;
                font-family: var(--font-body, Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif);
            }

            #scary-store-container.open {
                opacity: 1;
                pointer-events: auto;
            }

            /* Backdrop */
            #scary-store-container .store-overlay {
                position: absolute;
                inset: 0;
                background:
                    radial-gradient(1200px 700px at 12% 14%, rgba(204, 17, 34, 0.20), transparent 60%),
                    radial-gradient(1000px 600px at 86% 22%, rgba(168, 85, 247, 0.16), transparent 62%),
                    rgba(0, 0, 0, 0.80);
                backdrop-filter: blur(12px);
            }

            /* Window */
            #scary-store-container .store-window {
                --store-accent: #cc1122;
                --store-accent-2: #f03c4a;
                --store-tier-glow: rgba(204, 17, 34, 0.35);
                --store-sparkle: 0;

                position: relative;
                width: min(1180px, calc(100vw - 24px));
                height: min(88vh, 860px);
                border-radius: 18px;
                overflow: hidden;
                display: flex;
                flex-direction: column;

                background:
                    radial-gradient(900px 500px at 10% 10%, rgba(255, 255, 255, 0.06), transparent 60%),
                    radial-gradient(900px 600px at 90% 20%, rgba(255, 255, 255, 0.04), transparent 65%),
                    linear-gradient(180deg, rgba(10, 10, 18, 0.95), rgba(12, 12, 20, 0.92));

                border: 1px solid rgba(255, 255, 255, 0.10);
                box-shadow:
                    0 24px 120px rgba(0, 0, 0, 0.72),
                    0 0 0 1px rgba(255, 255, 255, 0.03) inset;
                transform: translateY(10px) scale(0.99);
                transition: transform 260ms cubic-bezier(0.2, 0.8, 0.2, 1);
            }

            #scary-store-container.open .store-window {
                transform: translateY(0) scale(1);
            }

            /* Animated tier border */
            #scary-store-container .store-window::before {
                content: "";
                position: absolute;
                inset: -2px;
                border-radius: inherit;
                background:
                    conic-gradient(from 180deg,
                        rgba(255, 255, 255, 0.00),
                        rgba(255, 255, 255, 0.06),
                        var(--store-accent),
                        rgba(255, 255, 255, 0.04),
                        var(--store-accent-2),
                        rgba(255, 255, 255, 0.00)
                    );
                opacity: 0.62;
                filter: blur(10px);
                animation: storeOrbit 5.6s linear infinite;
                pointer-events: none;
            }

            #scary-store-container .store-window::after {
                content: "";
                position: absolute;
                inset: 0;
                border-radius: inherit;
                background:
                    radial-gradient(900px 500px at 20% 10%, rgba(255, 255, 255, 0.05), transparent 55%),
                    radial-gradient(700px 420px at 80% 20%, rgba(255, 255, 255, 0.03), transparent 60%),
                    repeating-radial-gradient(circle at 20% 20%, rgba(255, 255, 255, calc(var(--store-sparkle) * 0.14)) 0 1px, transparent 1px 12px);
                opacity: 0.9;
                mix-blend-mode: screen;
                pointer-events: none;
            }

            @keyframes storeOrbit {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }

            /* Ensure content paints above fx layers */
            #scary-store-container .store-header,
            #scary-store-container .store-tabs,
            #scary-store-container .store-content {
                position: relative;
                z-index: 1;
            }

            /* Header */
            #scary-store-container .store-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 14px;
                padding: 14px 18px;
                background: linear-gradient(180deg, rgba(0, 0, 0, 0.62), rgba(0, 0, 0, 0.22));
                border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            }

            #scary-store-container .store-header-left {
                display: flex;
                align-items: center;
                gap: 12px;
                min-width: 220px;
            }

            #scary-store-container .store-title {
                margin: 0;
                font-size: 1.1rem;
                font-weight: 900;
                letter-spacing: 0.01em;
                color: rgba(255, 255, 255, 0.96);
            }

            #scary-store-container .store-tier-badge {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                height: 26px;
                padding: 0 10px;
                border-radius: 999px;
                font-size: 0.72rem;
                font-weight: 900;
                letter-spacing: 0.12em;
                text-transform: uppercase;
                color: rgba(255, 255, 255, 0.92);
                border: 1px solid rgba(255, 255, 255, 0.12);
                background:
                    linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02));
                box-shadow: 0 0 0 1px rgba(0,0,0,0.18) inset;
            }

            #scary-store-container .store-tier-badge[data-tier="lite"] {
                border-color: rgba(125, 211, 252, 0.28);
            }
            #scary-store-container .store-tier-badge[data-tier="pro"] {
                border-color: rgba(168, 85, 247, 0.30);
            }
            #scary-store-container .store-tier-badge[data-tier="max"] {
                border-color: rgba(251, 191, 36, 0.34);
            }

            #scary-store-container .store-balance {
                display: flex;
                gap: 14px;
                align-items: center;
                justify-content: center;
                padding: 8px 12px;
                border-radius: 999px;
                border: 1px solid rgba(255, 255, 255, 0.08);
                background: rgba(0, 0, 0, 0.26);
                box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.18) inset;
            }

            #scary-store-container .store-balance span {
                font-size: 0.95rem;
                font-weight: 800;
                letter-spacing: 0.01em;
            }

            #scary-store-container .balance-souls { color: #9fe0ff; }
            #scary-store-container .balance-gems { color: #ffd1f0; }

            #scary-store-container .store-close {
                width: 42px;
                height: 42px;
                border-radius: 12px;
                border: 1px solid rgba(255, 255, 255, 0.08);
                background: rgba(255, 255, 255, 0.04);
                color: rgba(255, 255, 255, 0.88);
                font-size: 1.7rem;
                line-height: 1;
                cursor: pointer;
                transition: transform 180ms ease, background 180ms ease, border-color 180ms ease;
            }

            #scary-store-container .store-close:hover {
                transform: translateY(-1px);
                background: rgba(255, 255, 255, 0.08);
                border-color: rgba(255, 255, 255, 0.14);
            }

            /* Tabs */
            #scary-store-container .store-tabs {
                display: flex;
                gap: 8px;
                padding: 12px 14px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                background: rgba(0, 0, 0, 0.16);
                overflow-x: auto;
                scrollbar-width: thin;
                scrollbar-color: rgba(255,255,255,0.22) rgba(255,255,255,0.06);
            }

            #scary-store-container .store-tab {
                flex: 0 0 auto;
                padding: 10px 14px;
                border-radius: 999px;
                border: 1px solid rgba(255, 255, 255, 0.10);
                background: rgba(255, 255, 255, 0.04);
                color: rgba(255, 255, 255, 0.66);
                font-size: 0.84rem;
                font-weight: 800;
                cursor: pointer;
                white-space: nowrap;
                transition: transform 160ms ease, background 160ms ease, border-color 160ms ease, color 160ms ease;
            }

            #scary-store-container .store-tab:hover {
                transform: translateY(-1px);
                color: rgba(255, 255, 255, 0.92);
                background: rgba(255, 255, 255, 0.07);
                border-color: rgba(255, 255, 255, 0.14);
            }

            #scary-store-container .store-tab.active {
                color: rgba(0, 0, 0, 0.92);
                background: linear-gradient(135deg, var(--store-accent), var(--store-accent-2));
                border-color: rgba(255, 255, 255, 0.18);
                box-shadow: 0 10px 26px var(--store-tier-glow);
            }

            #scary-store-container .store-tab:focus-visible,
            #scary-store-container .store-close:focus-visible,
            #scary-store-container .item-buy-btn:focus-visible,
            #scary-store-container .bundle-buy-btn:focus-visible,
            #scary-store-container .bp-buy-btn:focus-visible {
                outline: 2px solid rgba(255,255,255,0.92);
                outline-offset: 2px;
            }

            /* Content */
            #scary-store-container .store-content {
                flex: 1;
                overflow: auto;
                padding: 18px 18px 22px;
            }

            #scary-store-container .store-section {
                margin-bottom: 26px;
                padding-bottom: 22px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.06);
            }

            #scary-store-container .store-section:last-child {
                border-bottom: 0;
            }

            #scary-store-container .section-title {
                margin: 0 0 10px;
                font-size: 1.08rem;
                font-weight: 900;
                color: rgba(255, 255, 255, 0.94);
                letter-spacing: 0.01em;
            }

            #scary-store-container .section-desc {
                margin: 0 0 12px;
                color: rgba(255, 255, 255, 0.62);
                font-size: 0.92rem;
                line-height: 1.35;
            }

            /* Featured / Bundles grids */
            #scary-store-container .featured-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
                gap: 14px;
                align-items: stretch;
            }

            #scary-store-container .bundles-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
                gap: 14px;
                align-items: stretch;
            }

            /* Item grid */
            #scary-store-container .items-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
                gap: 14px;
            }

            /* Shared card base */
            #scary-store-container .item-card,
            #scary-store-container .bundle-card,
            #scary-store-container .engagement-card,
            #scary-store-container .currency-pack,
            #scary-store-container .gift-card,
            #scary-store-container .conversion-panel {
                border-radius: 16px;
                border: 1px solid rgba(255, 255, 255, 0.10);
                background:
                    linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02));
                box-shadow:
                    0 12px 30px rgba(0, 0, 0, 0.35),
                    0 0 0 1px rgba(0, 0, 0, 0.15) inset;
            }

            /* Bundle cards */
            #scary-store-container .bundle-card {
                position: relative;
                padding: 16px;
                display: grid;
                gap: 10px;
                overflow: hidden;
                transition: transform 200ms ease, border-color 200ms ease, box-shadow 200ms ease;
            }

            #scary-store-container .bundle-card:hover {
                transform: translateY(-3px);
                border-color: rgba(255, 255, 255, 0.16);
                box-shadow: 0 18px 45px rgba(0, 0, 0, 0.48), 0 0 26px var(--store-tier-glow);
            }

            #scary-store-container .bundle-limited-badge {
                position: absolute;
                top: 12px;
                right: 12px;
                height: 24px;
                display: inline-flex;
                align-items: center;
                padding: 0 10px;
                border-radius: 999px;
                font-size: 0.68rem;
                font-weight: 900;
                letter-spacing: 0.12em;
                text-transform: uppercase;
                color: rgba(0, 0, 0, 0.9);
                background: linear-gradient(135deg, #f97316, #fbbf24);
            }

            #scary-store-container .bundle-icon {
                font-size: 2.2rem;
                filter: drop-shadow(0 8px 18px rgba(0,0,0,0.35));
            }

            #scary-store-container .bundle-name {
                font-weight: 900;
                font-size: 1.05rem;
                color: rgba(255, 255, 255, 0.96);
                letter-spacing: 0.01em;
            }

            #scary-store-container .bundle-desc {
                color: rgba(255, 255, 255, 0.62);
                font-size: 0.92rem;
                line-height: 1.35;
            }

            #scary-store-container .bundle-items {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
            }

            #scary-store-container .bundle-item-tag {
                display: inline-flex;
                align-items: center;
                height: 26px;
                padding: 0 10px;
                border-radius: 999px;
                font-size: 0.72rem;
                font-weight: 800;
                color: rgba(255, 255, 255, 0.78);
                border: 1px solid rgba(255, 255, 255, 0.12);
                background: rgba(0, 0, 0, 0.18);
                text-transform: uppercase;
                letter-spacing: 0.08em;
            }

            #scary-store-container .bundle-pricing {
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
                align-items: baseline;
            }

            #scary-store-container .bundle-original {
                color: rgba(255, 255, 255, 0.45);
                text-decoration: line-through;
                font-weight: 800;
            }

            #scary-store-container .bundle-sale {
                color: rgba(255, 255, 255, 0.96);
                font-weight: 950;
                font-size: 1.08rem;
            }

            #scary-store-container .bundle-discount {
                color: rgba(0, 0, 0, 0.92);
                font-weight: 950;
                font-size: 0.78rem;
                padding: 4px 10px;
                border-radius: 999px;
                background: linear-gradient(135deg, var(--store-accent), var(--store-accent-2));
            }

            #scary-store-container .bundle-locked {
                color: rgba(255, 255, 255, 0.62);
                font-size: 0.86rem;
                padding: 10px 12px;
                border-radius: 12px;
                border: 1px dashed rgba(255, 255, 255, 0.18);
                background: rgba(0, 0, 0, 0.20);
            }

            #scary-store-container .bundle-buy-btn {
                height: 44px;
                border-radius: 14px;
                border: 0;
                cursor: pointer;
                font-weight: 950;
                letter-spacing: 0.01em;
                color: rgba(0, 0, 0, 0.92);
                background: linear-gradient(135deg, var(--store-accent), var(--store-accent-2));
                box-shadow: 0 14px 30px var(--store-tier-glow);
                transition: transform 160ms ease, filter 160ms ease;
            }

            #scary-store-container .bundle-buy-btn:hover {
                transform: translateY(-1px);
                filter: brightness(1.05);
            }

            /* Item cards */
            #scary-store-container .item-card {
                position: relative;
                padding: 14px;
                text-align: left;
                display: grid;
                gap: 8px;
                transition: transform 200ms ease, border-color 200ms ease, box-shadow 200ms ease;
            }

            #scary-store-container .item-card:hover {
                transform: translateY(-3px);
                border-color: rgba(255, 255, 255, 0.16);
                box-shadow: 0 18px 45px rgba(0, 0, 0, 0.48);
            }

            #scary-store-container .item-rarity {
                font-size: 0.68rem;
                font-weight: 950;
                letter-spacing: 0.14em;
                text-transform: uppercase;
                color: rgba(255, 255, 255, 0.60);
            }

            #scary-store-container .item-icon {
                font-size: 2.2rem;
                line-height: 1;
                margin-top: 4px;
                filter: drop-shadow(0 10px 18px rgba(0,0,0,0.36));
            }

            #scary-store-container .item-name {
                font-size: 0.95rem;
                font-weight: 900;
                color: rgba(255, 255, 255, 0.96);
            }

            #scary-store-container .item-bp-badge {
                font-size: 0.82rem;
                color: rgba(255, 255, 255, 0.72);
            }

            #scary-store-container .item-price {
                display: flex;
                align-items: baseline;
                gap: 10px;
            }

            #scary-store-container .price-original {
                color: rgba(255, 255, 255, 0.45);
                text-decoration: line-through;
                font-weight: 800;
            }

            #scary-store-container .price-current {
                color: rgba(255, 255, 255, 0.96);
                font-weight: 950;
            }

            #scary-store-container .item-buy-btn {
                height: 42px;
                border-radius: 14px;
                border: 1px solid rgba(255, 255, 255, 0.10);
                background: rgba(255, 255, 255, 0.06);
                color: rgba(255, 255, 255, 0.92);
                cursor: pointer;
                font-weight: 900;
                transition: transform 160ms ease, background 160ms ease, border-color 160ms ease;
            }

            #scary-store-container .item-buy-btn:hover {
                transform: translateY(-1px);
                background: rgba(255, 255, 255, 0.10);
                border-color: rgba(255, 255, 255, 0.14);
            }

            #scary-store-container .item-card.legendary,
            #scary-store-container .item-card.mythic {
                box-shadow: 0 18px 50px rgba(0, 0, 0, 0.52), 0 0 26px rgba(255, 255, 255, 0.05);
            }

            #scary-store-container .item-card.locked {
                opacity: 0.56;
                filter: saturate(0.7);
            }

            #scary-store-container .item-card.owned {
                border-color: rgba(34, 197, 94, 0.45);
            }

            #scary-store-container .item-owned {
                color: rgba(34, 197, 94, 0.95);
                font-weight: 950;
                letter-spacing: 0.08em;
            }

            #scary-store-container .item-locked {
                color: rgba(255, 255, 255, 0.62);
                font-size: 0.86rem;
                padding: 10px 12px;
                border-radius: 12px;
                border: 1px dashed rgba(255, 255, 255, 0.18);
                background: rgba(0, 0, 0, 0.20);
            }

            /* Engagement + tables */
            #scary-store-container .engagement-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
                gap: 14px;
            }

            #scary-store-container .engagement-card {
                padding: 14px;
            }

            #scary-store-container .engagement-card h3 {
                margin: 0 0 10px;
                font-size: 1rem;
                font-weight: 950;
                color: rgba(255, 255, 255, 0.94);
            }

            #scary-store-container .engagement-actions {
                display: flex;
                gap: 10px;
                flex-wrap: wrap;
            }

            #scary-store-container .premium-sources-table {
                width: 100%;
                border-collapse: collapse;
                overflow: hidden;
                border-radius: 14px;
                border: 1px solid rgba(255, 255, 255, 0.08);
            }

            #scary-store-container .premium-sources-table th,
            #scary-store-container .premium-sources-table td {
                padding: 10px 12px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                font-size: 0.9rem;
            }

            #scary-store-container .premium-sources-table th {
                text-transform: uppercase;
                letter-spacing: 0.12em;
                font-weight: 950;
                font-size: 0.74rem;
                color: rgba(255, 255, 255, 0.78);
                background: rgba(0, 0, 0, 0.22);
            }

            #scary-store-container .premium-sources-table td {
                color: rgba(255, 255, 255, 0.74);
            }

            /* Conversion panel */
            #scary-store-container .conversion-panel {
                padding: 14px;
            }

            #scary-store-container .conversion-metrics {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                gap: 10px;
                margin-bottom: 10px;
                color: rgba(255, 255, 255, 0.74);
                font-size: 0.92rem;
            }

            #scary-store-container .conversion-actions {
                display: flex;
                gap: 10px;
                align-items: center;
                margin-bottom: 10px;
            }

            #scary-store-container .conversion-actions input,
            #scary-store-container .bp-gift-controls input,
            #scary-store-container .gift-input,
            #scary-store-container .gift-message textarea {
                background: rgba(0, 0, 0, 0.30);
                border: 1px solid rgba(255, 255, 255, 0.12);
                border-radius: 12px;
                color: rgba(255, 255, 255, 0.92);
                padding: 10px 12px;
            }

            #scary-store-container .bp-gift-controls {
                display: grid;
                grid-template-columns: 1.2fr 110px 1fr 180px;
                gap: 10px;
                align-items: center;
            }

            /* Currency packs */
            #scary-store-container .currency-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
                gap: 14px;
            }

            #scary-store-container .currency-pack {
                padding: 16px;
                text-align: center;
                cursor: pointer;
                transition: transform 200ms ease, border-color 200ms ease, box-shadow 200ms ease;
            }

            #scary-store-container .currency-pack:hover {
                transform: translateY(-3px);
                border-color: rgba(255, 255, 255, 0.16);
                box-shadow: 0 18px 45px rgba(0, 0, 0, 0.48);
            }

            #scary-store-container .pack-badge {
                position: absolute;
                top: 10px;
                left: 50%;
                transform: translateX(-50%);
                padding: 4px 10px;
                border-radius: 999px;
                font-size: 0.68rem;
                font-weight: 950;
                letter-spacing: 0.12em;
            }

            #scary-store-container .pack-badge.popular {
                background: linear-gradient(135deg, #fbbf24, #f97316);
                color: rgba(0,0,0,0.9);
            }

            #scary-store-container .pack-badge.best {
                background: linear-gradient(135deg, #22c55e, #7dd3fc);
                color: rgba(0,0,0,0.9);
            }

            /* Gifts */
            #scary-store-container .gifts-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                gap: 14px;
            }

            #scary-store-container .gift-card {
                padding: 16px;
                text-align: center;
                cursor: pointer;
                transition: transform 200ms ease, border-color 200ms ease, box-shadow 200ms ease;
            }

            #scary-store-container .gift-card:hover {
                transform: translateY(-3px);
                border-color: rgba(255, 255, 255, 0.16);
                box-shadow: 0 18px 45px rgba(0, 0, 0, 0.48);
            }

            #scary-store-container .gift-btn,
            #scary-store-container .gift-confirm,
            #scary-store-container .bp-buy-btn {
                height: 44px;
                border-radius: 14px;
                border: 0;
                cursor: pointer;
                font-weight: 950;
                color: rgba(0, 0, 0, 0.92);
                background: linear-gradient(135deg, var(--store-accent), var(--store-accent-2));
                box-shadow: 0 14px 30px var(--store-tier-glow);
            }

            #scary-store-container .gift-actions {
                display: flex;
                gap: 10px;
            }

            #scary-store-container .gift-cancel {
                height: 44px;
                border-radius: 14px;
                border: 1px solid rgba(255,255,255,0.12);
                background: rgba(255,255,255,0.06);
                color: rgba(255,255,255,0.82);
                font-weight: 900;
                cursor: pointer;
            }

            /* Notifications */
            #scary-store-container .store-notification {
                position: fixed;
                bottom: 18px;
                left: 50%;
                transform: translateX(-50%);
                padding: 12px 16px;
                border-radius: 14px;
                font-weight: 900;
                z-index: 10000002;
                border: 1px solid rgba(255, 255, 255, 0.12);
                background: rgba(0, 0, 0, 0.72);
                color: rgba(255, 255, 255, 0.92);
                box-shadow: 0 18px 60px rgba(0,0,0,0.6);
                animation: storeToastIn 180ms ease;
            }

            #scary-store-container .store-notification.success { border-color: rgba(34, 197, 94, 0.35); }
            #scary-store-container .store-notification.error { border-color: rgba(239, 68, 68, 0.35); }
            #scary-store-container .store-notification.info { border-color: rgba(59, 130, 246, 0.35); }

            #scary-store-container .store-notification.fade-out {
                opacity: 0;
                transform: translateX(-50%) translateY(10px);
                transition: opacity 200ms ease, transform 200ms ease;
            }

            @keyframes storeToastIn {
                from { opacity: 0; transform: translateX(-50%) translateY(10px); }
                to { opacity: 1; transform: translateX(-50%) translateY(0); }
            }

            /* Scrollbar */
            #scary-store-container .store-content::-webkit-scrollbar { width: 10px; }
            #scary-store-container .store-content::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.06); }
            #scary-store-container .store-content::-webkit-scrollbar-thumb {
                background: rgba(255, 255, 255, 0.22);
                border-radius: 999px;
            }
            #scary-store-container .store-content::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.30); }

            /* Responsive */
            @media (max-width: 900px) {
                #scary-store-container .store-window {
                    height: 92vh;
                }

                #scary-store-container .store-balance {
                    display: none;
                }

                #scary-store-container .bp-gift-controls {
                    grid-template-columns: 1fr;
                }

                #scary-store-container .conversion-actions {
                    flex-direction: column;
                    align-items: stretch;
                }
            }

            /* Reduced motion */
            @media (prefers-reduced-motion: reduce) {
                #scary-store-container * {
                    animation: none !important;
                    transition: none !important;
                }
                #scary-store-container .store-window::before {
                    display: none;
                }
            }
        `;

        document.head.appendChild(style);
    }

    // ═══════════════════════════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════════════════════════

    return {
        init: init,

        // Store UI
        openStore: openStore,
        closeStore: closeStore,

        // Purchases
        buyItem: buyItem,
        buyBundle: buyBundle,
        buyBattlePass: buyBattlePass,
        buyCurrency: buyCurrency,
        claimReward: claimReward,

        // XP
        addXP: addXP,

        // State
        getBalance: () => ({ ...state.balance }),
        getInventory: () => [...state.inventory],
        getBattlePass: () => ({ ...state.battlePass }),

        // Admin (for testing)
        addGems: (amount) => {
            state.balance.gems += amount;
            saveState();
            updateBalanceDisplay();
        },
        addSouls: (amount) => {
            state.balance.souls += amount;
            saveState();
            updateBalanceDisplay();
        },

        // Gift
        showGiftModal: showGiftModal,
        sendGift: sendGift,
        sendItemGift: sendItemGift,

        // Live backend flows
        refreshIntegrations: refreshIntegrations,
        buySeasonalItem: buySeasonalItem,
        createMarketplaceListing: createMarketplaceListing,
        buyMarketplaceListing: buyMarketplaceListing,
        cancelMarketplaceListing: cancelMarketplaceListing,
        startAdWatch: startAdWatch,
        completeAdWatch: completeAdWatch,
        claimLoyaltyReward: claimLoyaltyReward,
        claimFreeSpin: claimFreeSpin,
        claimPremiumSpin: claimPremiumSpin,
        claimTreasurePiece: claimTreasurePiece,
        claimTreasureReward: claimTreasureReward,
        craftRareSkin: craftRareSkin,
        giftBattlePassTier: giftBattlePassTier,
        giftBattlePassTierFromInputs: giftBattlePassTierFromInputs,
        convertGemDustToGems: convertGemDustToGems,
        convertGemDustToGemsFromInput: convertGemDustToGemsFromInput,
        getRevenueStatus: getRevenueStatus,
        purchaseRevenueStream: purchaseRevenueStream,
        consumeTournamentTicket: consumeTournamentTicket,
        redeemCharacterPack: redeemCharacterPack,
        activateBooster: activateBooster,

        // Data
        COSMETICS: COSMETICS,
        BUNDLES: BUNDLES,
        WINTER_BATTLE_PASS: WINTER_BATTLE_PASS,
        GIFT_OPTIONS: GIFT_OPTIONS,
        CURRENCY_PACKS: CURRENCY_PACKS,
    };
})();

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ScaryStore.init());
} else {
    ScaryStore.init();
}

// Global access
if (typeof window !== 'undefined') {
    window.ScaryStore = ScaryStore;
}

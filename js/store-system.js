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
        loadState();
        injectStyles();
        console.log('[ScaryStore] Initialized');
    }

    function loadState() {
        const saved = localStorage.getItem('sgai-store-state');
        if (saved) {
            try {
                state = JSON.parse(saved);
            } catch (e) {
                console.error('[ScaryStore] Failed to load state:', e);
            }
        }
    }

    function saveState() {
        localStorage.setItem('sgai-store-state', JSON.stringify(state));
    }

    function generateIdempotencyKey(scope) {
        const rand = Math.random().toString(36).slice(2);
        return `${scope}-${Date.now()}-${rand}`;
    }

    function getAuthToken() {
        return localStorage.getItem('sgai-token') || 'demo-token';
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
        if (!storeContainer) {
            createStoreContainer();
        }

        storeContainer.classList.add('open');
        document.body.style.overflow = 'hidden';
        renderTab(tab);
        refreshBackendSnapshots({ silent: true }).then(() => {
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
            <div class="store-overlay" onclick="ScaryStore.closeStore()"></div>
            <div class="store-window">
                <div class="store-header">
                    <h1 class="store-title">🛒 Scary Store</h1>
                    <div class="store-balance">
                        <span class="balance-souls">👻 <span id="store-souls">${state.balance.souls}</span></span>
                        <span class="balance-gems">💎 <span id="store-gems">${state.balance.gems}</span></span>
                    </div>
                    <button class="store-close" onclick="ScaryStore.closeStore()">×</button>
                </div>
                <div class="store-tabs">
                    <button class="store-tab active" data-tab="featured">⭐ Featured</button>
                    <button class="store-tab" data-tab="battlepass">❄️ Battle Pass</button>
                    <button class="store-tab" data-tab="skins">👤 Skins</button>
                    <button class="store-tab" data-tab="effects">✨ Effects</button>
                    <button class="store-tab" data-tab="bundles">📦 Bundles</button>
                    <button class="store-tab" data-tab="currency">💎 Currency</button>
                    <button class="store-tab" data-tab="gifts">🎁 Gifts</button>
                </div>
                <div class="store-content" id="store-content"></div>
            </div>
        `;

        document.body.appendChild(storeContainer);

        // Tab event listeners
        storeContainer.querySelectorAll('.store-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                storeContainer.querySelectorAll('.store-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                renderTab(tab.dataset.tab);
            });
        });
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
        const userTier = localStorage.getItem('sgai-sub-tier') || 'none';
        const tierLevel = { none: 0, lite: 1, pro: 2, max: 3 }[userTier];

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
        const userTier = localStorage.getItem('sgai-sub-tier') || 'none';
        const tierLevel = { none: 0, lite: 1, pro: 2, max: 3 }[userTier];

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
        const userTier = localStorage.getItem('sgai-sub-tier') || 'none';
        const tierLevel = { none: 0, lite: 1, pro: 2, max: 3 }[userTier];

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
                    ${bundle.items.map(item => `<span class="bundle-item-tag">${item.type}</span>`).join('')}
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
        const userTier = localStorage.getItem('sgai-sub-tier') || 'none';
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
        const userTier = localStorage.getItem('sgai-sub-tier') || 'none';
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
            /* Store Container */
            #scary-store-container {
                position: fixed;
                inset: 0;
                z-index: 10000000;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.3s ease;
            }

            #scary-store-container.open {
                opacity: 1;
                pointer-events: auto;
            }

            .store-overlay {
                position: absolute;
                inset: 0;
                background: rgba(0, 0, 0, 0.85);
                backdrop-filter: blur(10px);
            }

            .store-window {
                position: relative;
                width: 95%;
                max-width: 1200px;
                height: 90vh;
                background: linear-gradient(180deg, #0a0a12 0%, #12121a 100%);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 16px;
                display: flex;
                flex-direction: column;
                overflow: hidden;
                box-shadow: 0 25px 80px rgba(0, 0, 0, 0.5);
            }

            /* Store Header */
            .store-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 16px 24px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                background: rgba(0, 0, 0, 0.3);
            }

            .store-title {
                font-size: 1.5rem;
                font-weight: 700;
                color: #fff;
                margin: 0;
            }

            .store-balance {
                display: flex;
                gap: 20px;
            }

            .store-balance span {
                font-size: 1rem;
                font-weight: 600;
            }

            .balance-souls { color: #88ccff; }
            .balance-gems { color: #ff88cc; }

            .store-close {
                background: none;
                border: none;
                color: #888;
                font-size: 2rem;
                cursor: pointer;
                line-height: 1;
                transition: color 0.2s;
            }

            .store-close:hover { color: #fff; }

            /* Store Tabs */
            .store-tabs {
                display: flex;
                gap: 4px;
                padding: 12px 16px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                background: rgba(0, 0, 0, 0.2);
                overflow-x: auto;
            }

            .store-tab {
                padding: 10px 20px;
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 8px;
                color: #888;
                font-size: 0.85rem;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
                white-space: nowrap;
            }

            .store-tab:hover {
                background: rgba(255, 255, 255, 0.1);
                color: #fff;
            }

            .store-tab.active {
                background: var(--accent-red, #cc1122);
                border-color: var(--accent-red, #cc1122);
                color: #fff;
            }

            /* Store Content */
            .store-content {
                flex: 1;
                overflow-y: auto;
                padding: 24px;
            }

            .store-section {
                margin-bottom: 40px;
            }

            .section-title {
                font-size: 1.25rem;
                font-weight: 700;
                color: #fff;
                margin-bottom: 16px;
            }

            .section-desc {
                color: #888;
                margin-bottom: 16px;
            }

            .engagement-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
                gap: 12px;
            }

            .engagement-card {
                background: rgba(255, 255, 255, 0.04);
                border: 1px solid rgba(255, 255, 255, 0.12);
                border-radius: 12px;
                padding: 14px;
            }

            .engagement-card h3 {
                margin: 0 0 8px;
                color: #fff;
                font-size: 1rem;
            }

            .engagement-actions {
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
            }

            .premium-sources-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 12px;
            }

            .premium-sources-table th,
            .premium-sources-table td {
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                padding: 8px;
                text-align: left;
                font-size: 0.85rem;
                color: #ddd;
            }

            .premium-sources-table th {
                color: #fff;
                font-size: 0.8rem;
                letter-spacing: 0.4px;
                text-transform: uppercase;
            }

            .conversion-panel {
                background: rgba(255, 255, 255, 0.03);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 12px;
                padding: 12px;
            }

            .conversion-metrics {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                gap: 8px;
                margin-bottom: 12px;
                color: #ddd;
                font-size: 0.85rem;
            }

            .conversion-actions {
                display: flex;
                gap: 8px;
                align-items: center;
                margin-bottom: 8px;
            }

            .conversion-actions input {
                background: rgba(0, 0, 0, 0.35);
                border: 1px solid rgba(255, 255, 255, 0.15);
                border-radius: 8px;
                color: #fff;
                padding: 8px 10px;
                width: 120px;
            }

            .bp-gift-controls {
                display: grid;
                grid-template-columns: 1.2fr 110px 1fr 180px;
                gap: 8px;
                align-items: center;
            }

            .bp-gift-controls input {
                background: rgba(0, 0, 0, 0.35);
                border: 1px solid rgba(255, 255, 255, 0.15);
                border-radius: 8px;
                color: #fff;
                padding: 8px 10px;
            }

            @media (max-width: 900px) {
                .bp-gift-controls {
                    grid-template-columns: 1fr;
                }

                .conversion-actions {
                    flex-direction: column;
                    align-items: stretch;
                }

                .conversion-actions input {
                    width: 100%;
                }
            }

            /* Items Grid */
            .items-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
                gap: 16px;
            }

            .item-card {
                background: rgba(255, 255, 255, 0.03);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 12px;
                padding: 16px;
                text-align: center;
                transition: all 0.3s;
            }

            .item-card:hover {
                transform: translateY(-4px);
                border-color: rgba(255, 255, 255, 0.2);
            }

            .item-card.common { border-color: #666; }
            .item-card.uncommon { border-color: #4ade80; }
            .item-card.rare { border-color: #60a5fa; }
            .item-card.epic { border-color: #a855f7; }
            .item-card.legendary { border-color: #fbbf24; box-shadow: 0 0 20px rgba(251, 191, 36, 0.2); }
            .item-card.mythic { border-color: #f43f5e; box-shadow: 0 0 25px rgba(244, 63, 94, 0.3); }

            .item-card.locked {
                opacity: 0.5;
                pointer-events: none;
            }

            .item-card.owned {
                border-color: #22c55e;
            }

            .item-rarity {
                font-size: 0.65rem;
                font-weight: 700;
                letter-spacing: 1px;
                margin-bottom: 8px;
            }

            .item-card.common .item-rarity { color: #666; }
            .item-card.uncommon .item-rarity { color: #4ade80; }
            .item-card.rare .item-rarity { color: #60a5fa; }
            .item-card.epic .item-rarity { color: #a855f7; }
            .item-card.legendary .item-rarity { color: #fbbf24; }
            .item-card.mythic .item-rarity { color: #f43f5e; }

            .item-icon {
                font-size: 2.5rem;
                margin-bottom: 8px;
            }

            .item-name {
                font-size: 0.85rem;
                font-weight: 600;
                color: #fff;
                margin-bottom: 8px;
            }

            .item-bp-badge {
                font-size: 0.7rem;
                color: var(--accent-cyan, #06b6d4);
                margin-bottom: 8px;
            }

            .item-price {
                margin-bottom: 8px;
            }

            .price-original {
                text-decoration: line-through;
                color: #666;
                margin-right: 8px;
            }

            .price-current {
                font-weight: 700;
                color: #fff;
            }

            .item-buy-btn {
                width: 100%;
                padding: 8px;
                background: var(--accent-red, #cc1122);
                border: none;
                border-radius: 6px;
                color: #fff;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
            }

            .item-buy-btn:hover {
                background: #ff2244;
                transform: scale(1.02);
            }

            .item-owned {
                color: #22c55e;
                font-weight: 700;
            }

            .item-locked {
                color: #888;
                font-size: 0.75rem;
            }

            /* Battle Pass */
            .battlepass-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 20px;
                background: linear-gradient(135deg, rgba(6, 182, 212, 0.1), rgba(139, 92, 246, 0.1));
                border-radius: 12px;
                margin-bottom: 24px;
                flex-wrap: wrap;
                gap: 16px;
            }

            .bp-season-info {
                display: flex;
                align-items: center;
                gap: 16px;
            }

            .bp-season-icon {
                font-size: 3rem;
            }

            .bp-season-info h2 {
                margin: 0;
                color: #fff;
            }

            .bp-season-info p {
                margin: 0;
                color: #888;
                font-size: 0.9rem;
            }

            .bp-progress {
                display: flex;
                align-items: center;
                gap: 16px;
            }

            .bp-tier-display {
                text-align: center;
            }

            .bp-tier-label {
                display: block;
                font-size: 0.75rem;
                color: #888;
            }

            .bp-tier-number {
                font-size: 2rem;
                font-weight: 700;
                color: #fff;
            }

            .bp-xp-bar {
                width: 150px;
                height: 8px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 4px;
                position: relative;
            }

            .bp-xp-fill {
                height: 100%;
                background: linear-gradient(90deg, #06b6d4, #8b5cf6);
                border-radius: 4px;
                transition: width 0.3s;
            }

            .bp-xp-text {
                position: absolute;
                inset: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 0.65rem;
                color: #fff;
            }

            .bp-upgrade-btn {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 12px 24px;
                background: linear-gradient(135deg, #8b5cf6, #06b6d4);
                border: none;
                border-radius: 8px;
                color: #fff;
                font-weight: 700;
                cursor: pointer;
                transition: transform 0.2s;
            }

            .bp-upgrade-btn:hover {
                transform: scale(1.05);
            }

            .bp-owned-badge {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 12px 24px;
                background: rgba(34, 197, 94, 0.2);
                border: 1px solid #22c55e;
                border-radius: 8px;
                color: #22c55e;
                font-weight: 700;
            }

            /* Battle Pass Tiers */
            .battlepass-tiers {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                gap: 12px;
            }

            .bp-tier {
                background: rgba(255, 255, 255, 0.03);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 8px;
                padding: 12px;
                transition: all 0.2s;
            }

            .bp-tier.unlocked {
                border-color: rgba(34, 197, 94, 0.3);
            }

            .bp-tier.current {
                border-color: var(--accent-red, #cc1122);
                box-shadow: 0 0 20px rgba(204, 17, 34, 0.2);
            }

            .bp-tier-header {
                display: flex;
                justify-content: space-between;
                margin-bottom: 8px;
            }

            .bp-tier-number {
                font-weight: 700;
                color: #fff;
            }

            .bp-tier-xp {
                font-size: 0.75rem;
                color: #666;
            }

            .bp-tier-rewards {
                display: flex;
                gap: 8px;
            }

            .bp-reward {
                flex: 1;
                padding: 8px;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 6px;
                text-align: center;
                font-size: 0.75rem;
            }

            .bp-reward.premium {
                background: rgba(139, 92, 246, 0.1);
            }

            .bp-reward.premium.locked {
                background: rgba(0, 0, 0, 0.3);
                opacity: 0.5;
            }

            .bp-reward.claimable {
                cursor: pointer;
                animation: pulse 2s infinite;
            }

            @keyframes pulse {
                0%, 100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); }
                50% { box-shadow: 0 0 0 8px rgba(34, 197, 94, 0); }
            }

            .reward-label {
                display: block;
                font-size: 0.6rem;
                color: #666;
                margin-top: 4px;
            }

            .reward-cosmetic {
                padding: 4px;
                border-radius: 4px;
            }

            .reward-cosmetic.legendary { background: rgba(251, 191, 36, 0.2); }
            .reward-cosmetic.mythic { background: rgba(244, 63, 94, 0.2); }

            /* Currency Packs */
            .currency-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
                gap: 16px;
            }

            .currency-pack {
                background: rgba(255, 255, 255, 0.03);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 12px;
                padding: 20px;
                text-align: center;
                cursor: pointer;
                transition: all 0.2s;
                position: relative;
            }

            .currency-pack:hover {
                transform: translateY(-4px);
                border-color: rgba(255, 136, 204, 0.3);
            }

            .currency-pack.popular {
                border-color: #fbbf24;
            }

            .currency-pack.best-value {
                border-color: #22c55e;
            }

            .pack-badge {
                position: absolute;
                top: -10px;
                left: 50%;
                transform: translateX(-50%);
                padding: 4px 12px;
                border-radius: 4px;
                font-size: 0.65rem;
                font-weight: 700;
            }

            .pack-badge.popular {
                background: #fbbf24;
                color: #000;
            }

            .pack-badge.best {
                background: #22c55e;
                color: #000;
            }

            .pack-gems {
                display: flex;
                flex-direction: column;
                align-items: center;
                margin-bottom: 12px;
            }

            .gem-icon { font-size: 2rem; }
            .gem-amount { font-size: 1.5rem; font-weight: 700; color: #fff; }
            .gem-bonus { font-size: 0.75rem; color: #22c55e; font-weight: 700; }

            .pack-price {
                font-size: 1.1rem;
                font-weight: 600;
                color: #888;
            }

            /* Gift Cards */
            .gifts-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
                gap: 16px;
            }

            .gift-card {
                background: rgba(255, 255, 255, 0.03);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 12px;
                padding: 20px;
                text-align: center;
                cursor: pointer;
                transition: all 0.2s;
            }

            .gift-card:hover {
                transform: translateY(-4px);
                border-color: rgba(255, 255, 255, 0.2);
            }

            .gift-tier-icon { font-size: 2.5rem; margin-bottom: 8px; }
            .gift-name { font-weight: 600; color: #fff; margin-bottom: 4px; }
            .gift-price { color: #888; margin-bottom: 12px; }
            .gift-btn {
                padding: 8px 16px;
                background: var(--accent-red, #cc1122);
                border: none;
                border-radius: 6px;
                color: #fff;
                font-weight: 600;
                cursor: pointer;
            }

            /* Gift Modal */
            .gift-modal-overlay {
                position: fixed;
                inset: 0;
                z-index: 10000001;
                display: flex;
                align-items: center;
                justify-content: center;
                background: rgba(0, 0, 0, 0.9);
                backdrop-filter: blur(10px);
            }

            .gift-modal {
                background: #12121a;
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 16px;
                padding: 32px;
                width: 90%;
                max-width: 400px;
            }

            .gift-modal h2 {
                margin: 0 0 16px;
                color: #fff;
            }

            .gift-modal p {
                color: #888;
                margin-bottom: 8px;
            }

            .gift-input {
                width: 100%;
                padding: 12px;
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 8px;
                color: #fff;
                font-size: 1rem;
                margin-bottom: 16px;
            }

            .gift-message textarea {
                width: 100%;
                padding: 12px;
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 8px;
                color: #fff;
                resize: vertical;
                min-height: 80px;
                margin-bottom: 16px;
            }

            .gift-actions {
                display: flex;
                gap: 12px;
            }

            .gift-cancel, .gift-confirm {
                flex: 1;
                padding: 12px;
                border-radius: 8px;
                font-weight: 600;
                cursor: pointer;
            }

            .gift-cancel {
                background: rgba(255, 255, 255, 0.1);
                border: none;
                color: #888;
            }

            .gift-confirm {
                background: var(--accent-red, #cc1122);
                border: none;
                color: #fff;
            }

            /* Notifications */
            .store-notification {
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                padding: 12px 24px;
                border-radius: 8px;
                font-weight: 600;
                z-index: 10000002;
                animation: slideUp 0.3s ease;
            }

            .store-notification.success {
                background: rgba(34, 197, 94, 0.9);
                color: #fff;
            }

            .store-notification.error {
                background: rgba(239, 68, 68, 0.9);
                color: #fff;
            }

            .store-notification.info {
                background: rgba(59, 130, 246, 0.9);
                color: #fff;
            }

            .store-notification.fade-out {
                opacity: 0;
                transform: translateX(-50%) translateY(20px);
                transition: all 0.3s;
            }

            @keyframes slideUp {
                from {
                    opacity: 0;
                    transform: translateX(-50%) translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateX(-50%) translateY(0);
                }
            }

            /* Scrollbar */
            .store-content::-webkit-scrollbar {
                width: 8px;
            }

            .store-content::-webkit-scrollbar-track {
                background: rgba(255, 255, 255, 0.05);
            }

            .store-content::-webkit-scrollbar-thumb {
                background: rgba(255, 255, 255, 0.2);
                border-radius: 4px;
            }

            .store-content::-webkit-scrollbar-thumb:hover {
                background: rgba(255, 255, 255, 0.3);
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

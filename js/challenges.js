/* ============================================
   ScaryGamesAI — Daily & Weekly Challenges System
   Tracks progress, manages challenge generation,
   rewards, and notifications.
   ============================================ */
(function () {
    'use strict';

    const STORAGE_KEY = 'scarygames_challenges_v2';

    // ============ CHALLENGE DEFINITIONS ============
    // Each game has ~5 challenges of varying difficulty.
    // type: 'best' (single run high score) or 'total' (accumulate over multiple runs)
    const ALL_CHALLENGES = [
        // ---- BACKROOMS: PAC-MAN ----
        { id: 'bp_score_1000', gameId: 'backrooms-pacman', title: 'High Scorer', desc: 'Score 1000 points in one game', target: 1000, metric: 'score', type: 'best', reward: 50, difficulty: 'easy' },
        { id: 'bp_score_5000', gameId: 'backrooms-pacman', title: 'Pac-Master', desc: 'Score 5000 points in one game', target: 5000, metric: 'score', type: 'best', reward: 150, difficulty: 'hard' },
        { id: 'bp_pellets_50', gameId: 'backrooms-pacman', title: 'Munchies', desc: 'Eat 50 pellets total', target: 50, metric: 'pellets_collected', type: 'total', reward: 50, difficulty: 'easy' },
        { id: 'bp_time_120', gameId: 'backrooms-pacman', title: 'Survivor', desc: 'Survive for 120 seconds', target: 120, metric: 'time', type: 'best', reward: 100, difficulty: 'medium' },
        { id: 'bp_score_10000', gameId: 'backrooms-pacman', title: 'Backrooms Legend', desc: 'Score 10000 points in one game', target: 10000, metric: 'score', type: 'best', reward: 300, difficulty: 'nightmare' },

        // ---- SHADOW CRAWLER ----
        { id: 'sc_keys_3', gameId: 'shadow-crawler', title: 'Key Hunter', desc: 'Find 3 keys total', target: 3, metric: 'keys_found', type: 'total', reward: 75, difficulty: 'medium' },
        { id: 'sc_levels_1', gameId: 'shadow-crawler', title: 'Dungeon Master', desc: 'Clear 1 level', target: 1, metric: 'levels_cleared', type: 'total', reward: 50, difficulty: 'easy' },
        { id: 'sc_time_60', gameId: 'shadow-crawler', title: 'Dark Survivor', desc: 'Survive 60 seconds in one run', target: 60, metric: 'survival_time', type: 'best', reward: 100, difficulty: 'medium' },
        { id: 'sc_levels_5', gameId: 'shadow-crawler', title: 'Depth Delver', desc: 'Clear 5 levels total', target: 5, metric: 'levels_cleared', type: 'total', reward: 200, difficulty: 'hard' },

        // ---- THE ABYSS ----
        { id: 'ab_depth_500', gameId: 'the-abyss', title: 'Going Deep', desc: 'Reach 500m depth', target: 500, metric: 'depth', type: 'best', reward: 100, difficulty: 'medium' },
        { id: 'ab_artifacts_3', gameId: 'the-abyss', title: 'Treasure Hunter', desc: 'Collect 3 artifacts total', target: 3, metric: 'artifacts_collected', type: 'total', reward: 75, difficulty: 'medium' },
        { id: 'ab_oxygen_50', gameId: 'the-abyss', title: 'Breathless', desc: 'Finish with >50% oxygen', target: 50, metric: 'oxygen', type: 'best', reward: 125, difficulty: 'hard' },
        { id: 'ab_depth_2000', gameId: 'the-abyss', title: 'Void Diver', desc: 'Reach 2000m depth', target: 2000, metric: 'depth', type: 'best', reward: 350, difficulty: 'nightmare' },

        // ---- NIGHTMARE RUN ----
        { id: 'nr_dist_1000', gameId: 'nightmare-run', title: 'Sprinter', desc: 'Run 1000m in one go', target: 1000, metric: 'dist_session', type: 'best', reward: 50, difficulty: 'easy' },
        { id: 'nr_dist_5000', gameId: 'nightmare-run', title: 'Marathon', desc: 'Run 5000m total', target: 5000, metric: 'dist_total', type: 'total', reward: 150, difficulty: 'hard' },
        { id: 'nr_powerups_10', gameId: 'nightmare-run', title: 'Power Player', desc: 'Collect 10 powerups total', target: 10, metric: 'powerups_collected', type: 'total', reward: 75, difficulty: 'medium' },

        // ---- YETI RUN ----
        { id: 'yr_dist_1500', gameId: 'yeti-run', title: 'Snow Sprinter', desc: 'Slide 1500m in one go', target: 1500, metric: 'dist_session', type: 'best', reward: 100, difficulty: 'medium' },
        { id: 'yr_dodges_50', gameId: 'yeti-run', title: 'Evasive Action', desc: 'Dodge 50 times total', target: 50, metric: 'dodges', type: 'total', reward: 50, difficulty: 'easy' },
        { id: 'yr_jumps_50', gameId: 'yeti-run', title: 'Hop Skip', desc: 'Jump 50 times total', target: 50, metric: 'jumps', type: 'total', reward: 50, difficulty: 'easy' },

        // ---- BLOOD TETRIS ----
        { id: 'bt_lines_10', gameId: 'blood-tetris', title: 'Line Clearer', desc: 'Clear 10 lines in one game', target: 10, metric: 'lines_session', type: 'best', reward: 50, difficulty: 'easy' },
        { id: 'bt_score_2000', gameId: 'blood-tetris', title: 'High Stacker', desc: 'Score 2000 points', target: 2000, metric: 'score', type: 'best', reward: 100, difficulty: 'medium' },
        { id: 'bt_lines_50_total', gameId: 'blood-tetris', title: 'Demolition', desc: 'Clear 50 lines total', target: 50, metric: 'lines_cleared', type: 'total', reward: 100, difficulty: 'medium' },
        { id: 'bt_lines_100_total', gameId: 'blood-tetris', title: 'Annihilator', desc: 'Clear 100 lines total', target: 100, metric: 'lines_cleared', type: 'total', reward: 250, difficulty: 'nightmare' },

        // ---- SEANCE ----
        { id: 'sn_spirits_3', gameId: 'seance', title: 'Medium', desc: 'Contact 3 spirits total', target: 3, metric: 'spirits', type: 'total', reward: 75, difficulty: 'medium' },
        { id: 'sn_calm_60', gameId: 'seance', title: 'Zen Master', desc: 'Keep anger low for 60s', target: 60, metric: 'calm_time', type: 'best', reward: 100, difficulty: 'medium' },

        // ---- DOLLHOUSE ----
        { id: 'dh_rooms_5', gameId: 'dollhouse', title: 'Explorer', desc: 'Enter 5 rooms total', target: 5, metric: 'rooms', type: 'total', reward: 50, difficulty: 'easy' },
        { id: 'dh_items_3', gameId: 'dollhouse', title: 'Scavenger', desc: 'Find 3 items total', target: 3, metric: 'items', type: 'total', reward: 75, difficulty: 'medium' },

        // ---- ZOMBIE HORDE ----
        { id: 'zh_kills_50', gameId: 'zombie-horde', title: 'Zombie Slayer', desc: 'Kill 50 zombies total', target: 50, metric: 'kills', type: 'total', reward: 100, difficulty: 'medium' },
        { id: 'zh_wave_5', gameId: 'zombie-horde', title: 'Survivor', desc: 'Reach Wave 5', target: 5, metric: 'wave', type: 'best', reward: 100, difficulty: 'medium' },
        { id: 'zh_towers_10', gameId: 'zombie-horde', title: 'Builder', desc: 'Build 10 towers total', target: 10, metric: 'towers', type: 'total', reward: 50, difficulty: 'easy' },
        { id: 'zh_kills_500', gameId: 'zombie-horde', title: 'Undead Purger', desc: 'Kill 500 zombies total', target: 500, metric: 'kills', type: 'total', reward: 400, difficulty: 'nightmare' },

        // ---- THE ELEVATOR ----
        { id: 'el_floors_5', gameId: 'the-elevator', title: 'Going Up', desc: 'Visit 5 floors total', target: 5, metric: 'floors_visited', type: 'total', reward: 50, difficulty: 'easy' },
        { id: 'el_sanity_80', gameId: 'the-elevator', title: 'Sane', desc: 'Finish with >80% sanity', target: 80, metric: 'sanity', type: 'best', reward: 125, difficulty: 'hard' },

        // ---- GRAVEYARD SHIFT ----
        { id: 'gs_ghosts_5', gameId: 'graveyard-shift', title: 'Ghost Buster', desc: 'Spot 5 ghosts total', target: 5, metric: 'ghosts', type: 'total', reward: 75, difficulty: 'medium' },
        { id: 'gs_time_180', gameId: 'graveyard-shift', title: 'Night Watch', desc: 'Survive 3 minutes', target: 180, metric: 'time', type: 'best', reward: 100, difficulty: 'medium' },

        // ---- WEB OF TERROR ----
        { id: 'wt_webs_10', gameId: 'web-of-terror', title: 'Exterminator', desc: 'Burn 10 webs total', target: 10, metric: 'webs', type: 'total', reward: 50, difficulty: 'easy' },
        { id: 'wt_keys_3', gameId: 'web-of-terror', title: 'Key Master', desc: 'Find 3 keys total', target: 3, metric: 'keys', type: 'total', reward: 75, difficulty: 'medium' },

        // ---- FREDDY'S NIGHTMARE ----
        { id: 'fn_night_1', gameId: 'freddys-nightmare', title: 'First Night', desc: 'Survive Night 1', target: 1, metric: 'nights_survived', type: 'best', reward: 50, difficulty: 'easy' },
        { id: 'fn_night_3', gameId: 'freddys-nightmare', title: 'Midnight Veteran', desc: 'Survive 3 nights', target: 3, metric: 'nights_survived', type: 'best', reward: 150, difficulty: 'hard' },
        { id: 'fn_power_50', gameId: 'freddys-nightmare', title: 'Power Saver', desc: 'Finish a night with >50% power', target: 50, metric: 'power_remaining', type: 'best', reward: 100, difficulty: 'medium' },
        { id: 'fn_doors_20', gameId: 'freddys-nightmare', title: 'Door Control', desc: 'Use doors 20 times in one night', target: 20, metric: 'doors_used', type: 'best', reward: 75, difficulty: 'medium' },
        { id: 'fn_night_5', gameId: 'freddys-nightmare', title: 'Night Shift Legend', desc: 'Survive all 5 nights', target: 5, metric: 'nights_survived', type: 'best', reward: 400, difficulty: 'nightmare' },

        // ---- HAUNTED ASYLUM ----
        { id: 'ha_fuse_1', gameId: 'haunted-asylum', title: 'First Fuse', desc: 'Find 1 fuse box', target: 1, metric: 'fuses_found', type: 'total', reward: 50, difficulty: 'easy' },
        { id: 'ha_escape', gameId: 'haunted-asylum', title: 'Asylum Escapee', desc: 'Escape the asylum', target: 1, metric: 'escapes', type: 'total', reward: 150, difficulty: 'hard' },
        { id: 'ha_records_3', gameId: 'haunted-asylum', title: 'Case Researcher', desc: 'Find 3 medical records', target: 3, metric: 'records', type: 'total', reward: 75, difficulty: 'medium' },
        { id: 'ha_sanity_80', gameId: 'haunted-asylum', title: 'Composed', desc: 'Escape with >80% sanity', target: 80, metric: 'sanity_remaining', type: 'best', reward: 200, difficulty: 'hard' },
        { id: 'ha_time_300', gameId: 'haunted-asylum', title: 'Lost in the Dark', desc: 'Survive 5 minutes', target: 300, metric: 'time_survived', type: 'best', reward: 100, difficulty: 'medium' },

        // ---- RITUAL CIRCLE ----
        { id: 'rc_wave_3', gameId: 'ritual-circle', title: 'Blood Defense', desc: 'Survive 3 waves', target: 3, metric: 'waves_cleared', type: 'best', reward: 50, difficulty: 'easy' },
        { id: 'rc_kills_50', gameId: 'ritual-circle', title: 'Exorcist', desc: 'Kill 50 enemies total', target: 50, metric: 'total_kills', type: 'total', reward: 100, difficulty: 'medium' },
        { id: 'rc_wave_7', gameId: 'ritual-circle', title: 'Circle Defender', desc: 'Survive 7 waves', target: 7, metric: 'waves_cleared', type: 'best', reward: 150, difficulty: 'hard' },
        { id: 'rc_traps_20', gameId: 'ritual-circle', title: 'Trap Master', desc: 'Place 20 traps total', target: 20, metric: 'traps_placed', type: 'total', reward: 75, difficulty: 'medium' },
        { id: 'rc_complete', gameId: 'ritual-circle', title: 'Ritual Master', desc: 'Complete all 10 waves', target: 10, metric: 'waves_cleared', type: 'best', reward: 500, difficulty: 'nightmare' },
    ];

    // ============ MONTHLY EPIC CHALLENGES (Phase 3B) ============
    const MONTHLY_CHALLENGES = [
        { id: 'monthly_zhorde_1000', title: 'The Endless Horde', desc: 'Kill 1000 zombies across all modes', gameId: 'zombie-horde', target: 1000, metric: 'kills', type: 'total', reward: 1500, difficulty: 'nightmare' },
        { id: 'monthly_abyss_deep', title: 'Abyssal Expedition', desc: 'Reach 2000m depth in The Abyss', gameId: 'the-abyss', target: 2000, metric: 'depth', type: 'best', reward: 2000, difficulty: 'nightmare' },
        { id: 'monthly_bt_lines', title: 'Blood Rain', desc: 'Clear 500 lines in Blood Tetris', gameId: 'blood-tetris', target: 500, metric: 'lines_cleared', type: 'total', reward: 1800, difficulty: 'nightmare' },
        { id: 'monthly_nr_marathon', title: 'Infinite Runner', desc: 'Run 50000m total in Nightmare Run', gameId: 'nightmare-run', target: 50000, metric: 'dist_total', type: 'total', reward: 2500, difficulty: 'nightmare' },
        { id: 'monthly_fn_allnights', title: 'Five Nights at Freddy\'s', desc: 'Survive all 5 nights in Freddy\'s Nightmare', gameId: 'freddys-nightmare', target: 5, metric: 'nights_survived', type: 'best', reward: 2000, difficulty: 'nightmare' },
        { id: 'monthly_ha_speedrun', title: 'Asylum Speedrun', desc: 'Escape the Haunted Asylum 5 times', gameId: 'haunted-asylum', target: 5, metric: 'escapes', type: 'total', reward: 2200, difficulty: 'nightmare' },
        { id: 'monthly_rc_massacre', title: 'Occult Massacre', desc: 'Kill 500 enemies in Ritual Circle', gameId: 'ritual-circle', target: 500, metric: 'total_kills', type: 'total', reward: 2500, difficulty: 'nightmare' },
    ];

    // ============ CHALLENGE CHAINS (Phase 3C) ============
    const CHALLENGE_CHAINS = [
        {
            id: 'chain_ritual_shadows',
            title: 'The Ritual of Shadows',
            desc: 'Complete a dark ritual across multiple games',
            icon: '🕯️',
            color: '#8b5cf6',
            bonusReward: 500,
            steps: [
                { id: 'crs_1', title: 'Whispers in the Dark', lore: 'The shadows begin to speak...', gameId: 'shadow-crawler', desc: 'Clear 3 levels in Shadow Crawler', target: 3, metric: 'levels_cleared', type: 'total', reward: 75 },
                { id: 'crs_2', title: 'The Vigil', lore: 'You must survive the night...', gameId: 'graveyard-shift', desc: 'Survive 5 minutes in Graveyard Shift', target: 300, metric: 'time', type: 'best', reward: 100 },
                { id: 'crs_3', title: 'Descent', lore: 'The abyss calls to you...', gameId: 'the-abyss', desc: 'Reach 1000m in The Abyss', target: 1000, metric: 'depth', type: 'best', reward: 125 },
                { id: 'crs_4', title: 'Hold the Line', lore: 'They come in waves...', gameId: 'zombie-horde', desc: 'Reach Wave 10 in Zombie Horde', target: 10, metric: 'wave', type: 'best', reward: 150 },
                { id: 'crs_5', title: 'The Final Ritual', lore: 'The darkness is complete.', gameId: 'backrooms-pacman', desc: 'Score 8000 in Backrooms: Pac-Man', target: 8000, metric: 'score', type: 'best', reward: 200 },
            ]
        },
        {
            id: 'chain_blood_moon',
            title: 'Blood Moon Rising',
            desc: 'Survive the blood moon across every domain',
            icon: '🌑',
            color: '#dc2626',
            bonusReward: 750,
            steps: [
                { id: 'cbm_1', title: 'First Blood', lore: 'The moon turns crimson...', gameId: 'blood-tetris', desc: 'Clear 30 lines in Blood Tetris', target: 30, metric: 'lines_cleared', type: 'total', reward: 100 },
                { id: 'cbm_2', title: 'The Hunt Begins', lore: 'Predators emerge from the shadows...', gameId: 'nightmare-run', desc: 'Run 3000m in one go', target: 3000, metric: 'dist_session', type: 'best', reward: 125 },
                { id: 'cbm_3', title: 'Communion', lore: 'The spirits demand an audience...', gameId: 'seance', desc: 'Contact 5 spirits', target: 5, metric: 'spirits', type: 'total', reward: 150 },
                { id: 'cbm_4', title: 'Blood Moon Apex', lore: 'The moon is at its peak. Survive.', gameId: 'yeti-run', desc: 'Slide 3000m in one go', target: 3000, metric: 'dist_session', type: 'best', reward: 200 },
            ]
        },
        {
            id: 'chain_dollhouse_nightmare',
            title: 'The Dollmaker\'s Curse',
            desc: 'Unravel the mystery of the cursed dollhouse',
            icon: '🎭',
            color: '#f59e0b',
            bonusReward: 600,
            steps: [
                { id: 'cdn_1', title: 'Enter the House', lore: 'The door creaks open...', gameId: 'dollhouse', desc: 'Enter 10 rooms', target: 10, metric: 'rooms', type: 'total', reward: 75 },
                { id: 'cdn_2', title: 'The Collection', lore: 'Strange items litter the halls...', gameId: 'dollhouse', desc: 'Find 8 items', target: 8, metric: 'items', type: 'total', reward: 100 },
                { id: 'cdn_3', title: 'Burning the Webs', lore: 'Cobwebs hide dark secrets...', gameId: 'web-of-terror', desc: 'Burn 25 webs', target: 25, metric: 'webs', type: 'total', reward: 125 },
            ]
        },
    ];

    // ============ CURSED CHALLENGE POOL (Phase 3E) ============
    const CURSED_POOL = [
        { id: 'cursed_bp_7500', title: 'Cursed Maze', desc: 'Score 7500 in Pac-Man — or lose 100 CP', gameId: 'backrooms-pacman', target: 7500, metric: 'score', type: 'best', reward: 400, penalty: 100, difficulty: 'nightmare' },
        { id: 'cursed_ab_1500', title: 'Cursed Descent', desc: 'Reach 1500m in The Abyss — or lose 150 CP', gameId: 'the-abyss', target: 1500, metric: 'depth', type: 'best', reward: 500, penalty: 150, difficulty: 'nightmare' },
        { id: 'cursed_zh_wave8', title: 'Cursed Horde', desc: 'Reach Wave 8 in Zombie Horde — or lose 100 CP', gameId: 'zombie-horde', target: 8, metric: 'wave', type: 'best', reward: 450, penalty: 100, difficulty: 'nightmare' },
        { id: 'cursed_bt_25', title: 'Cursed Stack', desc: 'Clear 25 lines in one game — or lose 75 CP', gameId: 'blood-tetris', target: 25, metric: 'lines_session', type: 'best', reward: 350, penalty: 75, difficulty: 'nightmare' },
    ];

    // ============ SHOP ITEMS (Phase 4A) ============
    const SHOP_ITEMS = [
        // ---- BADGES ----
        { id: 'badge_skull_gold', category: 'badges', name: 'Golden Skull', desc: 'A gilded skull badge', icon: '💀', cost: 500, minRank: 0 },
        { id: 'badge_fire', category: 'badges', name: 'Hellfire', desc: 'Burning with determination', icon: '🔥', cost: 750, minRank: 2 },
        { id: 'badge_ghost', category: 'badges', name: 'Phantom', desc: 'A spectral presence', icon: '👻', cost: 500, minRank: 0 },
        { id: 'badge_vampire', category: 'badges', name: 'Blood Baron', desc: 'For the undying', icon: '🧛', cost: 1000, minRank: 5 },
        { id: 'badge_crown', category: 'badges', name: 'Dark Crown', desc: 'Ruler of nightmares', icon: '👑', cost: 2000, minRank: 9 },
        { id: 'badge_diamond', category: 'badges', name: 'Eternal Gem', desc: 'Outlast eternity', icon: '💎', cost: 1500, minRank: 7 },

        // ---- NAME EFFECTS ----
        { id: 'fx_glitch', category: 'name_effects', name: 'Glitch Text', desc: 'Your name glitches and distorts', icon: '📟', cost: 1500, minRank: 3, preview: 'glitch' },
        { id: 'fx_blood_drip', category: 'name_effects', name: 'Blood Drip', desc: 'Blood drips from your name', icon: '🩸', cost: 2000, minRank: 5, preview: 'blood' },
        { id: 'fx_fire_name', category: 'name_effects', name: 'Inferno', desc: 'Your name burns with fire', icon: '🔥', cost: 2500, minRank: 7, preview: 'fire' },
        { id: 'fx_ghost_fade', category: 'name_effects', name: 'Ghost Fade', desc: 'Your name fades in and out', icon: '👻', cost: 1000, minRank: 2, preview: 'ghost' },

        // ---- CARD BACKS ----
        { id: 'cb_blood_splatter', category: 'card_backs', name: 'Blood Splatter', desc: 'Crimson chaos', icon: '🎨', cost: 750, minRank: 0 },
        { id: 'cb_void', category: 'card_backs', name: 'The Void', desc: 'Pure darkness', icon: '🌑', cost: 1000, minRank: 3 },
        { id: 'cb_eldritch', category: 'card_backs', name: 'Eldritch Pattern', desc: 'Maddening geometry', icon: '🐙', cost: 1500, minRank: 6 },
        { id: 'cb_bones', category: 'card_backs', name: 'Bone Collector', desc: 'Skeletal mosaic', icon: '🦴', cost: 750, minRank: 0 },

        // ---- TITLES ----
        { id: 'title_undying', category: 'titles', name: 'The Undying', desc: 'A title for the immortal', icon: '⚰️', cost: 1000, minRank: 3 },
        { id: 'title_nightmare_walker', category: 'titles', name: 'Nightmare Walker', desc: 'One who walks in dreams', icon: '🌙', cost: 1500, minRank: 5 },
        { id: 'title_soul_reaper', category: 'titles', name: 'Soul Reaper', desc: 'Collector of souls', icon: '⚔️', cost: 2000, minRank: 7 },
        { id: 'title_void_king', category: 'titles', name: 'Void King', desc: 'Ruler of the void', icon: '🌑', cost: 3000, minRank: 10 },
        { id: 'title_the_cursed', category: 'titles', name: 'The Cursed', desc: 'Marked by darkness', icon: '⛓️', cost: 4000, minRank: 12 },

        // ---- SITE THEMES ----
        { id: 'theme_blood_moon', category: 'themes', name: 'Blood Moon', desc: 'Deep red atmosphere', icon: '🌕', cost: 3000, minRank: 5 },
        { id: 'theme_void', category: 'themes', name: 'The Void', desc: 'Absolute darkness', icon: '🕳️', cost: 5000, minRank: 8 },
        { id: 'theme_eldritch', category: 'themes', name: 'Eldritch', desc: 'Cosmic horror palette', icon: '🐙', cost: 8000, minRank: 11 },
        { id: 'theme_neon_horror', category: 'themes', name: 'Neon Horror', desc: 'Cyberpunk nightmare', icon: '💜', cost: 10000, minRank: 13 },
    ];

    const RANKS = [
        { cp: 0, title: 'Fresh Meat', icon: '🥩', color: '#cc1122', flair: 'rank-flair-fresh' },
        { cp: 250, title: 'Survivor', icon: '🔦', color: '#e8a832', flair: 'rank-flair-survivor' },
        { cp: 750, title: 'Grave Walker', icon: '⚰️', color: '#8a8a9a', flair: 'rank-flair-grave' },
        { cp: 1500, title: 'Shadow Hunter', icon: '🗡️', color: '#6366f1', flair: 'rank-flair-shadow' },
        { cp: 3000, title: 'Exorcist', icon: '✝️', color: '#f5c842', flair: 'rank-flair-exorcist' },
        { cp: 5000, title: 'Wraith', icon: '👻', color: '#a78bfa', flair: 'rank-flair-wraith' },
        { cp: 8000, title: 'Blood Baron', icon: '🧛', color: '#dc2626', flair: 'rank-flair-baron' },
        { cp: 12000, title: 'Necromancer', icon: '💀', color: '#22c55e', flair: 'rank-flair-necro' },
        { cp: 17000, title: 'Reaper', icon: '⚔️', color: '#94a3b8', flair: 'rank-flair-reaper' },
        { cp: 23000, title: 'Nightmare Lord', icon: '👑', color: '#f43f5e', flair: 'rank-flair-nightmare' },
        { cp: 30000, title: 'Abyssal King', icon: '🌑', color: '#1e1b4b', flair: 'rank-flair-abyssal' },
        { cp: 40000, title: 'Eldritch', icon: '🐙', color: '#7c3aed', flair: 'rank-flair-eldritch' },
        { cp: 55000, title: 'Dread Sovereign', icon: '🔥', color: '#f97316', flair: 'rank-flair-dread' },
        { cp: 75000, title: 'Eternal Horror', icon: '💎', color: '#06b6d4', flair: 'rank-flair-eternal' },
        { cp: 100000, title: 'The Unspeakable', icon: '☠️', color: '#e11d48', flair: 'rank-flair-unspeakable' },
    ];

    var state = {
        active: [],           // Array of { id, progress, completed, claimed }
        weekly: null,         // { id, progress, completed, claimed }
        rerolls: 3,
        monthlyRerolls: 1,
        lastMonthlyRerollReset: '',
        lastDate: '',
        cp: 0,
        unlockedRewards: {},
        rankHistory: [],
        firstClears: {},
        lastRankIdx: 0,
        // Phase 3
        monthly: null,        // { id, progress, completed, claimed, month }
        lastMonth: '',
        chains: {},           // { chainId: { currentStep, steps: [{ progress, completed, claimed }] } }
        cursed: null,         // { id, accepted, progress, completed, claimed, failed }
        activeFilter: 'all',  // game filter
        // Phase 4
        shop: [],             // Array of purchased item IDs
        equipped: { badge: null, nameEffect: null, cardBack: null, title: null, theme: null },
        // Phase 7
        friends: [],          // [{name, icon, rivalry: {wins, losses}, pending: null}]
        events: { active: null, archive: [], weeklyCP: 0, weeklyStart: '' },
        shareHistory: [],
        notifications: { enabled: false, streakReminder: true, eventAlert: true }
    };

    // ============ CORE LOGIC ============

    function loadState() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (raw) state = JSON.parse(raw);
        } catch (e) { console.error('Failed to load challenges', e); }

        // Ensure new fields exist for older saves
        if (state.monthlyRerolls === undefined) state.monthlyRerolls = getMaxMonthlyRerolls();
        if (!state.lastMonthlyRerollReset) state.lastMonthlyRerollReset = '';

        var today = getTodayString();
        if (state.lastDate !== today) {
            // New day!
            state.lastDate = today;
            state.rerolls = getMaxDailyRerolls();
            generateDailyChallenges();
            // Weekly check (if Monday)
            if (new Date().getDay() === 1 || !state.weekly) {
                generateWeeklyChallenge();
            }
            saveState();
        }

        // Monthly check
        var monthKey = today.substring(0, 7); // YYYY-MM
        if (state.lastMonth !== monthKey) {
            state.lastMonth = monthKey;
            state.monthlyRerolls = getMaxMonthlyRerolls();
            state.lastMonthlyRerollReset = monthKey;
            generateMonthlyChallenge();
        }

        // Reset monthly rerolls if month changed
        if (state.lastMonthlyRerollReset !== monthKey) {
            state.lastMonthlyRerollReset = monthKey;
            state.monthlyRerolls = getMaxMonthlyRerolls();
        }

        // Generate cursed challenge if none active
        if (!state.cursed || state.cursed.claimed || state.cursed.failed) {
            generateCursedChallenge();
        }

        // Initialize chains if needed
        initChains();
    }

    function saveState() {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { }
    }

    function getTodayString() {
        var d = new Date();
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    function generateDailyChallenges() {
        // Phase 3: Pick 1 Easy, 1 Medium, 1 Hard (or random fallback)
        var rankIdx = getRankIndex();
        var easy = ALL_CHALLENGES.filter(function (c) { return c.difficulty === 'easy'; });
        var medium = ALL_CHALLENGES.filter(function (c) { return c.difficulty === 'medium'; });
        var hard = ALL_CHALLENGES.filter(function (c) { return c.difficulty === 'hard'; });
        var nightmare = ALL_CHALLENGES.filter(function (c) { return c.difficulty === 'nightmare'; });

        var selected = [];
        var usedIds = [];
        if (state.weekly) usedIds.push(state.weekly.id);

        function pickFrom(pool) {
            var avail = pool.filter(function (c) { return usedIds.indexOf(c.id) === -1; });
            if (avail.length === 0) return null;
            var idx = Math.floor(Math.random() * avail.length);
            var ch = avail[idx];
            usedIds.push(ch.id);
            return { id: ch.id, progress: 0, completed: false, claimed: false };
        }

        var e = pickFrom(easy);
        var m = pickFrom(medium);
        var h = pickFrom(hard);
        // If rank >= 3 (Shadow Hunter), replace easy with nightmare sometimes (20% chance)
        if (rankIdx >= 3 && Math.random() < 0.2 && nightmare.length > 0) {
            var n = pickFrom(nightmare);
            if (n) e = n;
        }

        if (e) selected.push(e);
        if (m) selected.push(m);
        if (h) selected.push(h);

        // Fill remaining slots if any pool was empty
        while (selected.length < 3) {
            var fallback = pickFrom(ALL_CHALLENGES);
            if (!fallback) break;
            selected.push(fallback);
        }

        state.active = selected;
    }

    function generateWeeklyChallenge() {
        // Pick a harder challenge (random for now, maybe filter by reward > 100 later)
        var pool = ALL_CHALLENGES.filter(function (c) { return c.reward >= 100; });
        if (pool.length === 0) pool = ALL_CHALLENGES;
        var idx = Math.floor(Math.random() * pool.length);
        var ch = pool[idx];
        state.weekly = {
            id: ch.id,
            progress: 0,
            completed: false,
            claimed: false
        };
    }

    function rerollChallenge(index) {
        if (state.rerolls <= 0) return false;
        if (index < 0 || index >= state.active.length) return false;
        if (state.active[index].completed) return false; // Don't reroll completed

        // Pick a new challenge not currently active
        var activeIds = state.active.map(function (c) { return c.id; });
        if (state.weekly) activeIds.push(state.weekly.id);

        var pool = ALL_CHALLENGES.filter(function (c) { return activeIds.indexOf(c.id) === -1; });
        if (pool.length === 0) return false;

        var idx = Math.floor(Math.random() * pool.length);
        var ch = pool[idx];

        state.active[index] = {
            id: ch.id,
            progress: 0,
            completed: false,
            claimed: false
        };
        state.rerolls--;
        saveState();
        return true;
    }

    // ============ REROLL TIER HELPERS ============

    function getUserSubTier() {
        try { return localStorage.getItem('sgai-sub-tier') || 'none'; } catch (e) { return 'none'; }
    }

    function getMaxDailyRerolls() {
        var tier = getUserSubTier();
        var base = 3;
        if (tier === 'lite') return base + 1;
        if (tier === 'pro') return base + 2;
        if (tier === 'max') return base + 3;
        return base;
    }

    function getMaxMonthlyRerolls() {
        var tier = getUserSubTier();
        var base = 1;
        if (tier === 'pro') return base + 1;
        if (tier === 'max') return base + 2;
        return base;
    }

    function rerollMonthlyChallenge() {
        if (!state.monthly) return false;
        if (state.monthlyRerolls <= 0) return false;
        if (state.monthly.completed) return false;

        // Pick a new monthly challenge different from the current one
        var currentId = state.monthly.id;
        var pool = MONTHLY_CHALLENGES.filter(function (c) { return c.id !== currentId; });
        if (pool.length === 0) return false;

        var idx = Math.floor(Math.random() * pool.length);
        var ch = pool[idx];
        state.monthly = {
            id: ch.id,
            progress: 0,
            completed: false,
            claimed: false,
            month: state.lastMonth
        };
        state.monthlyRerolls--;
        saveState();
        return true;
    }

    function getChallengeDef(id) {
        return ALL_CHALLENGES.find(function (c) { return c.id === id; });
    }

    // ============ NOTIFICATION ============

    function showNotification(title, message, icon) {
        var container = document.getElementById('challenge-toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'challenge-toast-container';
            container.className = 'challenge-toast-container';
            document.body.appendChild(container);
        }

        var toast = document.createElement('div');
        toast.className = 'challenge-toast';

        toast.innerHTML = '<div class="challenge-toast-icon">' + (icon || '🎯') + '</div>' +
            '<div><div class="challenge-toast-title">' + title + '</div>' +
            '<div class="challenge-toast-message">' + message + '</div></div>';

        container.appendChild(toast);

        // Animate in
        requestAnimationFrame(function () {
            requestAnimationFrame(function () { toast.classList.add('visible'); });
        });

        // Remove after delay
        setTimeout(function () {
            toast.classList.remove('visible');
            setTimeout(function () { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 400);
        }, 4000);
    }

    // ============ PROGRESS TRACKING ============

    function notify(gameId, metric, value) {
        var updated = false;
        var checkList = state.active.concat(state.weekly ? [state.weekly] : []);

        checkList.forEach(function (c) {
            if (!c || c.completed) return;
            var def = getChallengeDef(c.id);
            if (!def || def.gameId !== gameId || def.metric !== metric) return;

            var oldProgress = c.progress;
            if (def.type === 'total') {
                c.progress += value;
            } else if (def.type === 'best') {
                if (value > c.progress) c.progress = value;
            }

            // Cap at target for UI cleanliness
            if (c.progress > def.target && def.type === 'total') c.progress = def.target;

            // Check completion
            if (c.progress >= def.target && !c.completed) {
                c.completed = true;
                c.progress = def.target;
                updated = true;
                showNotification('Challenge Complete!', def.title + ': ' + def.desc, '🏆');
                // Auto-claim CP? No, let user claim in UI for dopamine.
            } else if (c.progress > oldProgress) {
                updated = true;
                // Optional: Notify on milestones (25%, 50%, 75%)
                if (def.type === 'total' && def.target > 10) {
                    var pct = c.progress / def.target;
                    var oldPct = oldProgress / def.target;
                    if (pct >= 0.5 && oldPct < 0.5) showNotification('Challenge Update', def.title + ': 50% Complete', '🔥');
                }
            }
        });

        if (updated) saveState();
    }

    // ============ CP MULTIPLIER SYSTEM ============

    function getStreakMultiplier() {
        var streak = 0;
        if (window.DailyChallenge) streak = DailyChallenge.getStreak();
        if (streak >= 30) return 3.0;
        if (streak >= 14) return 2.0;
        if (streak >= 7) return 1.5;
        if (streak >= 3) return 1.25;
        return 1.0;
    }

    function isWeekend() {
        var day = new Date().getDay();
        return day === 0 || day === 6;
    }

    function getWeekendMultiplier() {
        return isWeekend() ? 1.5 : 1.0;
    }

    function getFirstClearMultiplier(gameId) {
        if (!state.firstClears) state.firstClears = {};
        if (!state.firstClears[gameId]) return 2.0;
        return 1.0;
    }

    function getTotalMultiplier(gameId) {
        var streak = getStreakMultiplier();
        var weekend = getWeekendMultiplier();
        var firstClear = getFirstClearMultiplier(gameId);
        // Stack additively: (streak - 1) + (weekend - 1) + (firstClear - 1) + 1
        return 1 + (streak - 1) + (weekend - 1) + (firstClear - 1);
    }

    function getActiveBuffs() {
        var buffs = [];
        var streak = 0;
        if (window.DailyChallenge) streak = DailyChallenge.getStreak();
        if (streak >= 3) {
            var mult = getStreakMultiplier();
            buffs.push({ id: 'streak', icon: '🔥', name: streak + '-Day Streak', value: mult + '×', color: '#ff6b35' });
        }
        if (isWeekend()) {
            buffs.push({ id: 'weekend', icon: '🌙', name: 'Weekend Warrior', value: '1.5×', color: '#8b5cf6' });
        }
        return buffs;
    }

    // ============ CLAIM & RANK-UP ============

    function claimReward(challengeRef) {
        if (!challengeRef.completed || challengeRef.claimed) return false;
        var def = getChallengeDef(challengeRef.id);
        if (!def) return false;

        var prevRankIdx = getRankIndex();

        // Calculate multiplied reward
        var multiplier = getTotalMultiplier(def.gameId);
        var baseReward = def.reward;
        var finalReward = Math.round(baseReward * multiplier);

        challengeRef.claimed = true;
        state.cp += finalReward;

        // Track first clear
        if (!state.firstClears) state.firstClears = {};
        if (!state.firstClears[def.gameId]) {
            state.firstClears[def.gameId] = true;
        }

        // Check for rank-up
        var newRankIdx = getRankIndex();
        if (newRankIdx > prevRankIdx) {
            // Record in rank history
            if (!state.rankHistory) state.rankHistory = [];
            state.rankHistory.push({ rankIdx: newRankIdx, date: new Date().toISOString() });
            state.lastRankIdx = newRankIdx;
        }

        // Store reward info for UI to read
        challengeRef._lastReward = { base: baseReward, multiplier: multiplier, final: finalReward, rankedUp: newRankIdx > prevRankIdx, newRankIdx: newRankIdx };

        saveState();
        return true;
    }

    function getRankIndex() {
        var idx = 0;
        for (var i = 0; i < RANKS.length; i++) {
            if (state.cp >= RANKS[i].cp) idx = i;
        }
        return idx;
    }

    function getRankByIndex(idx) {
        return RANKS[idx] || RANKS[0];
    }

    function getRank() {
        return RANKS[getRankIndex()];
    }

    function getNextRank() {
        for (var i = 0; i < RANKS.length; i++) {
            if (state.cp < RANKS[i].cp) return RANKS[i];
        }
        return null;
    }

    // ============ MONTHLY CHALLENGE (Phase 3B) ============

    function generateMonthlyChallenge() {
        var idx = Math.floor(Math.random() * MONTHLY_CHALLENGES.length);
        var def = MONTHLY_CHALLENGES[idx];
        state.monthly = {
            id: def.id,
            progress: 0,
            completed: false,
            claimed: false,
            month: state.lastMonth
        };
    }

    function getMonthlyDef(id) {
        return MONTHLY_CHALLENGES.find(function (c) { return c.id === id; });
    }

    // ============ CHALLENGE CHAINS (Phase 3C) ============

    function initChains() {
        if (!state.chains) state.chains = {};
        CHALLENGE_CHAINS.forEach(function (chain) {
            if (!state.chains[chain.id]) {
                state.chains[chain.id] = {
                    currentStep: 0,
                    completed: false,
                    claimed: false,
                    steps: chain.steps.map(function () {
                        return { progress: 0, completed: false, claimed: false };
                    })
                };
            }
        });
    }

    function getChainDef(chainId) {
        return CHALLENGE_CHAINS.find(function (c) { return c.id === chainId; });
    }

    function claimChainStep(chainId, stepIdx) {
        var chainState = state.chains[chainId];
        var chainDef = getChainDef(chainId);
        if (!chainState || !chainDef) return false;

        var stepState = chainState.steps[stepIdx];
        var stepDef = chainDef.steps[stepIdx];
        if (!stepState || !stepDef) return false;
        if (!stepState.completed || stepState.claimed) return false;

        var prevRankIdx = getRankIndex();
        var mult = getTotalMultiplier(stepDef.gameId);
        var finalReward = Math.round(stepDef.reward * mult);

        stepState.claimed = true;
        state.cp += finalReward;

        // Advance to next step
        if (stepIdx === chainState.currentStep) {
            chainState.currentStep = stepIdx + 1;
        }

        // Check if entire chain is complete
        var allDone = chainState.steps.every(function (s) { return s.claimed; });
        if (allDone && !chainState.claimed) {
            chainState.completed = true;
            chainState.claimed = true;
            state.cp += chainDef.bonusReward;
            showNotification('Chain Complete!', chainDef.title + ' — +' + chainDef.bonusReward + ' bonus CP!', '🔗');
        }

        var newRankIdx = getRankIndex();
        if (newRankIdx > prevRankIdx) {
            if (!state.rankHistory) state.rankHistory = [];
            state.rankHistory.push({ rankIdx: newRankIdx, date: new Date().toISOString() });
            state.lastRankIdx = newRankIdx;
        }

        stepState._lastReward = { base: stepDef.reward, multiplier: mult, final: finalReward, rankedUp: newRankIdx > prevRankIdx, newRankIdx: newRankIdx };

        saveState();
        return true;
    }

    // ============ CURSED CHALLENGES (Phase 3E) ============

    function generateCursedChallenge() {
        var idx = Math.floor(Math.random() * CURSED_POOL.length);
        var def = CURSED_POOL[idx];
        state.cursed = {
            id: def.id,
            accepted: false,
            progress: 0,
            completed: false,
            claimed: false,
            failed: false
        };
    }

    function getCursedDef(id) {
        return CURSED_POOL.find(function (c) { return c.id === id; });
    }

    function acceptCursedChallenge() {
        if (!state.cursed || state.cursed.accepted) return false;
        state.cursed.accepted = true;
        saveState();
        showNotification('Curse Accepted', 'Complete the challenge before reset — or lose CP!', '⛓️');
        return true;
    }

    function failCursedChallenge() {
        if (!state.cursed || !state.cursed.accepted || state.cursed.completed) return;
        var def = getCursedDef(state.cursed.id);
        if (!def) return;
        state.cursed.failed = true;
        state.cp = Math.max(0, state.cp - def.penalty);
        saveState();
        showNotification('Curse Failed!', 'You lost ' + def.penalty + ' CP...', '💀');
    }

    function claimCursedReward() {
        if (!state.cursed || !state.cursed.completed || state.cursed.claimed) return false;
        var def = getCursedDef(state.cursed.id);
        if (!def) return false;

        var prevRankIdx = getRankIndex();
        var mult = getTotalMultiplier(def.gameId);
        var finalReward = Math.round(def.reward * mult);

        state.cursed.claimed = true;
        state.cp += finalReward;

        var newRankIdx = getRankIndex();
        if (newRankIdx > prevRankIdx) {
            if (!state.rankHistory) state.rankHistory = [];
            state.rankHistory.push({ rankIdx: newRankIdx, date: new Date().toISOString() });
            state.lastRankIdx = newRankIdx;
        }

        state.cursed._lastReward = { base: def.reward, multiplier: mult, final: finalReward, rankedUp: newRankIdx > prevRankIdx, newRankIdx: newRankIdx };
        saveState();
        return true;
    }

    // ============ SHOP (Phase 4) ============

    function getShopItem(itemId) {
        return SHOP_ITEMS.find(function (i) { return i.id === itemId; });
    }

    function purchaseItem(itemId) {
        var item = getShopItem(itemId);
        if (!item) return { ok: false, reason: 'Item not found' };
        if (!state.shop) state.shop = [];
        if (state.shop.indexOf(itemId) !== -1) return { ok: false, reason: 'Already owned' };
        if (state.cp < item.cost) return { ok: false, reason: 'Not enough CP' };
        if (getRankIndex() < item.minRank) return { ok: false, reason: 'Rank too low' };

        state.cp -= item.cost;
        state.shop.push(itemId);
        saveState();
        showNotification('Item Purchased!', item.name + ' is now yours.', item.icon);
        return { ok: true };
    }

    function equipItem(itemId) {
        var item = getShopItem(itemId);
        if (!item) return false;
        if (!state.shop) state.shop = [];
        if (state.shop.indexOf(itemId) === -1) return false;
        if (!state.equipped) state.equipped = {};

        var slot = {
            'badges': 'badge',
            'name_effects': 'nameEffect',
            'card_backs': 'cardBack',
            'titles': 'title',
            'themes': 'theme'
        }[item.category];

        if (!slot) return false;

        // Toggle: unequip if already equipped
        if (state.equipped[slot] === itemId) {
            state.equipped[slot] = null;
        } else {
            state.equipped[slot] = itemId;
        }
        saveState();
        return true;
    }

    function isOwned(itemId) {
        return state.shop && state.shop.indexOf(itemId) !== -1;
    }

    function isEquipped(itemId) {
        if (!state.equipped) return false;
        for (var k in state.equipped) {
            if (state.equipped[k] === itemId) return true;
        }
        return false;
    }

    // ============ PROGRESS TRACKING — extended for monthly/chains/cursed ============

    function notifyExtended(gameId, metric, value) {
        // Monthly
        if (state.monthly && !state.monthly.completed) {
            var mdef = getMonthlyDef(state.monthly.id);
            if (mdef && mdef.gameId === gameId && mdef.metric === metric) {
                if (mdef.type === 'total') state.monthly.progress += value;
                else if (value > state.monthly.progress) state.monthly.progress = value;
                if (state.monthly.progress >= mdef.target) {
                    state.monthly.completed = true;
                    state.monthly.progress = mdef.target;
                    showNotification('Monthly Epic Complete!', mdef.title, '🏆');
                }
            }
        }

        // Chains
        CHALLENGE_CHAINS.forEach(function (chainDef) {
            var cs = state.chains[chainDef.id];
            if (!cs || cs.completed) return;
            var stepIdx = cs.currentStep;
            if (stepIdx >= chainDef.steps.length) return;
            var stepDef = chainDef.steps[stepIdx];
            var stepState = cs.steps[stepIdx];
            if (!stepState || stepState.completed) return;
            if (stepDef.gameId !== gameId || stepDef.metric !== metric) return;
            if (stepDef.type === 'total') stepState.progress += value;
            else if (value > stepState.progress) stepState.progress = value;
            if (stepState.progress >= stepDef.target) {
                stepState.completed = true;
                stepState.progress = stepDef.target;
                showNotification('Chain Step Complete!', stepDef.title, '🔗');
            }
        });

        // Cursed
        if (state.cursed && state.cursed.accepted && !state.cursed.completed && !state.cursed.failed) {
            var cdef = getCursedDef(state.cursed.id);
            if (cdef && cdef.gameId === gameId && cdef.metric === metric) {
                if (cdef.type === 'total') state.cursed.progress += value;
                else if (value > state.cursed.progress) state.cursed.progress = value;
                if (state.cursed.progress >= cdef.target) {
                    state.cursed.completed = true;
                    state.cursed.progress = cdef.target;
                    showNotification('Curse Broken!', 'You conquered the cursed challenge!', '⛓️');
                }
            }
        }

        saveState();
    }

    // Wrap original notify to also call extended
    var _origNotify = notify;
    function notifyAll(gameId, metric, value) {
        _origNotify(gameId, metric, value);
        notifyExtended(gameId, metric, value);
    }

    // ============ PHASE 7: SIMULATED PLAYER POOL (Leaderboard) ============
    var LEADERBOARD_PLAYERS = [
        { name: 'DarkReaper666', icon: '💀', cp: 42300, streak: 28, nightmares: 45, weeklyCP: 1200 },
        { name: 'ShadowWalker', icon: '👻', cp: 38100, streak: 21, nightmares: 38, weeklyCP: 980 },
        { name: 'BloodMoonRiser', icon: '🌑', cp: 35600, streak: 35, nightmares: 33, weeklyCP: 1450 },
        { name: 'CryptKeeper_X', icon: '⚰️', cp: 31200, streak: 14, nightmares: 29, weeklyCP: 870 },
        { name: 'NightmareFuel', icon: '😈', cp: 28900, streak: 19, nightmares: 41, weeklyCP: 1100 },
        { name: 'GhostHunter42', icon: '🔦', cp: 25400, streak: 12, nightmares: 22, weeklyCP: 750 },
        { name: 'VoidWitch', icon: '🔮', cp: 22800, streak: 30, nightmares: 27, weeklyCP: 1320 },
        { name: 'TheExorcist', icon: '✝️', cp: 19500, streak: 9, nightmares: 18, weeklyCP: 620 },
        { name: 'SkullCrusherZ', icon: '☠️', cp: 17200, streak: 16, nightmares: 24, weeklyCP: 890 },
        { name: 'AbyssalOne', icon: '🐙', cp: 14800, streak: 7, nightmares: 15, weeklyCP: 540 },
        { name: 'DreadLord99', icon: '🗡️', cp: 12100, streak: 22, nightmares: 20, weeklyCP: 1050 },
        { name: 'HorrorQueen', icon: '👑', cp: 9800, streak: 11, nightmares: 12, weeklyCP: 480 },
        { name: 'PhantomGrip', icon: '🦇', cp: 7600, streak: 5, nightmares: 8, weeklyCP: 350 },
        { name: 'WraithBorn', icon: '💨', cp: 5900, streak: 8, nightmares: 6, weeklyCP: 290 },
        { name: 'BoneCollector', icon: '🦴', cp: 4200, streak: 3, nightmares: 4, weeklyCP: 210 },
        { name: 'ZombieSlayerX', icon: '🧟', cp: 3100, streak: 6, nightmares: 3, weeklyCP: 180 },
        { name: 'CursedSoul_22', icon: '⛓️', cp: 2200, streak: 2, nightmares: 1, weeklyCP: 120 },
        { name: 'FreshMeat_01', icon: '🥩', cp: 800, streak: 1, nightmares: 0, weeklyCP: 60 },
        { name: 'Noob_Survivor', icon: '🔦', cp: 350, streak: 1, nightmares: 0, weeklyCP: 40 },
        { name: 'SpookyNewbie', icon: '🕷️', cp: 100, streak: 0, nightmares: 0, weeklyCP: 15 },
    ];

    var FRIEND_POOL = [
        { name: 'DarkReaper666', icon: '💀' },
        { name: 'ShadowWalker', icon: '👻' },
        { name: 'NightmareFuel', icon: '😈' },
        { name: 'VoidWitch', icon: '🔮' },
        { name: 'GhostHunter42', icon: '🔦' },
        { name: 'SkullCrusherZ', icon: '☠️' },
        { name: 'HorrorQueen', icon: '👑' },
        { name: 'DreadLord99', icon: '🗡️' },
    ];

    var EVENT_DEFINITIONS = [
        {
            id: 'halloween_horror_fest',
            type: 'seasonal',
            title: 'Halloween Horror Fest',
            desc: 'Two weeks of terror. Double CP on all challenges.',
            icon: '🎃',
            theme: 'halloween',
            color: '#f97316',
            durationHours: 336,
            cpMultiplier: 2.0,
            challenges: [
                { id: 'evt_hw_1', title: 'Pumpkin Massacre', desc: 'Kill 200 zombies during the event', gameId: 'zombie-horde', target: 200, metric: 'kills', type: 'total', reward: 300 },
                { id: 'evt_hw_2', title: 'Haunted Depths', desc: 'Reach 1500m depth in The Abyss', gameId: 'the-abyss', target: 1500, metric: 'depth', type: 'best', reward: 400 },
                { id: 'evt_hw_3', title: 'Trick or Treat', desc: 'Score 10000 in Backrooms: Pac-Man', gameId: 'backrooms-pacman', target: 10000, metric: 'score', type: 'best', reward: 500 },
            ],
            exclusiveReward: { name: 'Pumpkin King Badge', icon: '🎃', cp: 1000 }
        },
        {
            id: 'friday_13th_frenzy',
            type: 'oneday',
            title: 'Friday the 13th Frenzy',
            desc: 'One day of ultra-rare cursed challenges. Triple CP.',
            icon: '🔪',
            theme: 'friday13',
            color: '#dc2626',
            durationHours: 24,
            cpMultiplier: 3.0,
            challenges: [
                { id: 'evt_f13_1', title: 'Unlucky Run', desc: 'Survive 13 minutes in Nightmare Run', gameId: 'nightmare-run', target: 780, metric: 'time', type: 'best', reward: 666 },
                { id: 'evt_f13_2', title: 'Jason\'s Wrath', desc: 'Kill 130 zombies in one session', gameId: 'zombie-horde', target: 130, metric: 'kills', type: 'best', reward: 650 },
            ],
            exclusiveReward: { name: 'Friday 13th Survivor', icon: '🔪', cp: 1300 }
        },
        {
            id: 'blood_moon_rising',
            type: 'flash',
            title: 'Blood Moon Rising',
            desc: 'A blood moon rises for 3 hours. Massive CP awaits the brave.',
            icon: '🌕',
            theme: 'bloodmoon',
            color: '#991b1b',
            durationHours: 3,
            cpMultiplier: 5.0,
            challenges: [
                { id: 'evt_bm_1', title: 'Moonlit Massacre', desc: 'Score 5000 in any game', gameId: 'backrooms-pacman', target: 5000, metric: 'score', type: 'best', reward: 500 },
            ],
            exclusiveReward: { name: 'Blood Moon Badge', icon: '🌕', cp: 800 }
        }
    ];

    // ============ PHASE 7A: LEADERBOARD ============

    function getLeaderboard(sortBy) {
        sortBy = sortBy || 'cp';
        var entries = LEADERBOARD_PLAYERS.map(function (p) {
            return { name: p.name, icon: p.icon, cp: p.cp, streak: p.streak, nightmares: p.nightmares, weeklyCP: p.weeklyCP, isPlayer: false };
        });
        // Add current player
        var streak = 0;
        if (state.rankHistory) {
            var dates = {};
            state.active.forEach(function (c) { if (c.claimed) dates[state.lastDate] = true; });
        }
        entries.push({
            name: 'You', icon: getRank().icon, cp: state.cp,
            streak: (window.DailyChallenge ? DailyChallenge.getStreak() : 0),
            nightmares: countNightmareClears(),
            weeklyCP: state.events.weeklyCP || 0,
            isPlayer: true
        });
        entries.sort(function (a, b) { return (b[sortBy] || 0) - (a[sortBy] || 0); });
        return entries;
    }

    function countNightmareClears() {
        var count = 0;
        if (state.active) state.active.forEach(function (c) {
            if (c.claimed) {
                var def = getChallengeDef(c.id);
                if (def && def.difficulty === 'nightmare') count++;
            }
        });
        return count;
    }

    function getWeeklyLeaderboard() {
        return getLeaderboard('weeklyCP');
    }

    // ============ PHASE 7B: FRIEND CHALLENGES ============

    function initFriends() {
        if (!state.friends || state.friends.length === 0) {
            state.friends = FRIEND_POOL.map(function (f) {
                return { name: f.name, icon: f.icon, rivalry: { wins: 0, losses: 0 }, pending: null };
            });
            saveState();
        }
    }

    function challengeFriend(friendIdx, bet) {
        if (friendIdx < 0 || friendIdx >= state.friends.length) return { ok: false, reason: 'Invalid friend' };
        var friend = state.friends[friendIdx];
        if (friend.pending) return { ok: false, reason: 'Challenge already pending' };
        bet = Math.min(Math.max(bet || 50, 10), 500);
        if (state.cp < bet) return { ok: false, reason: 'Not enough CP' };
        // Pick a random challenge
        var pool = ALL_CHALLENGES.filter(function (c) { return c.difficulty !== 'nightmare'; });
        var chalDef = pool[Math.floor(Math.random() * pool.length)];
        friend.pending = {
            challengeId: chalDef.id,
            bet: bet,
            friendScore: Math.floor(Math.random() * chalDef.target * 1.2),
            playerScore: 0,
            accepted: true,
            startTime: new Date().toISOString()
        };
        saveState();
        return { ok: true, challenge: chalDef, friend: friend };
    }

    function resolveFriendChallenge(friendIdx) {
        if (friendIdx < 0 || friendIdx >= state.friends.length) return null;
        var friend = state.friends[friendIdx];
        if (!friend.pending) return null;
        var p = friend.pending;
        var def = getChallengeDef(p.challengeId);
        if (!def) { friend.pending = null; saveState(); return null; }
        // Simulate: check if player's current progress beats the friend
        var won = p.playerScore >= p.friendScore;
        if (won) {
            friend.rivalry.wins++;
            state.cp += p.bet;
            showNotification('Duel Won!', 'You beat ' + friend.name + '! +' + p.bet + ' CP', '⚔️');
        } else {
            friend.rivalry.losses++;
            state.cp = Math.max(0, state.cp - Math.floor(p.bet / 2));
            showNotification('Duel Lost!', friend.name + ' won! -' + Math.floor(p.bet / 2) + ' CP', '💀');
        }
        var result = { won: won, bet: p.bet, friendName: friend.name };
        friend.pending = null;
        saveState();
        return result;
    }

    // ============ PHASE 7C: LIVE EVENTS ============

    function checkEventSchedule() {
        var now = new Date();
        if (state.events.active) {
            // Check if active event has expired
            var end = new Date(state.events.active.endTime);
            if (now > end) {
                // Archive it
                if (!state.events.archive) state.events.archive = [];
                state.events.active.status = 'ended';
                state.events.archive.push(state.events.active);
                state.events.active = null;
                saveState();
            }
            return state.events.active;
        }
        // Check schedule for new events
        var month = now.getMonth(); // 0-indexed
        var day = now.getDate();
        var dow = now.getDay(); // 0=Sun

        // Halloween: Oct 15-31
        if (month === 9 && day >= 15) {
            return activateEvent('halloween_horror_fest', now);
        }
        // Friday the 13th
        if (dow === 5 && day === 13) {
            return activateEvent('friday_13th_frenzy', now);
        }
        // Blood Moon: simulate on the 1st and 15th of each month at 8pm
        if ((day === 1 || day === 15) && now.getHours() >= 20) {
            var alreadyRan = (state.events.archive || []).some(function (e) {
                return e.id === 'blood_moon_rising' && new Date(e.startTime).toDateString() === now.toDateString();
            });
            if (!alreadyRan) return activateEvent('blood_moon_rising', now);
        }
        // For demo: always have a mini-event available
        return activateDemoEvent(now);
    }

    function activateEvent(eventId, now) {
        var def = EVENT_DEFINITIONS.find(function (e) { return e.id === eventId; });
        if (!def) return null;
        var end = new Date(now.getTime() + def.durationHours * 3600000);
        state.events.active = {
            id: def.id, title: def.title, desc: def.desc, icon: def.icon,
            theme: def.theme, color: def.color, cpMultiplier: def.cpMultiplier,
            startTime: now.toISOString(), endTime: end.toISOString(),
            challenges: def.challenges.map(function (c) {
                return { id: c.id, progress: 0, completed: false, claimed: false };
            }),
            exclusiveReward: def.exclusiveReward,
            status: 'active'
        };
        saveState();
        return state.events.active;
    }

    function activateDemoEvent(now) {
        // Rotate through events for demo purposes
        var idx = now.getDate() % EVENT_DEFINITIONS.length;
        return activateEvent(EVENT_DEFINITIONS[idx].id, now);
    }

    function getEventDef(eventId) {
        return EVENT_DEFINITIONS.find(function (e) { return e.id === eventId; }) || null;
    }

    function getEventChallengeDef(eventId, chalId) {
        var evtDef = getEventDef(eventId);
        if (!evtDef) return null;
        return evtDef.challenges.find(function (c) { return c.id === chalId; }) || null;
    }

    function claimEventReward(chalIdx) {
        if (!state.events.active) return false;
        var evt = state.events.active;
        if (chalIdx < 0 || chalIdx >= evt.challenges.length) return false;
        var chal = evt.challenges[chalIdx];
        if (!chal.completed || chal.claimed) return false;
        var evtDef = getEventDef(evt.id);
        var chalDef = evtDef ? evtDef.challenges[chalIdx] : null;
        if (!chalDef) return false;
        var reward = Math.round(chalDef.reward * (evt.cpMultiplier || 1));
        state.cp += reward;
        chal.claimed = true;
        state.events.weeklyCP = (state.events.weeklyCP || 0) + reward;
        saveState();
        showNotification('Event Reward!', '+' + reward + ' CP (' + evt.cpMultiplier + '× event bonus)', '🎃');
        return true;
    }

    // ============ PHASE 7D: SHARING ============

    function generateShareData(challengeObj) {
        var def = getChallengeDef(challengeObj.id);
        if (!def) return null;
        var rank = getRank();
        return {
            title: def.title,
            desc: def.desc,
            game: def.gameId,
            reward: def.reward,
            difficulty: def.difficulty || 'easy',
            rank: rank.title,
            rankIcon: rank.icon,
            rankColor: rank.color,
            cp: state.cp,
            streak: (window.DailyChallenge ? DailyChallenge.getStreak() : 0),
            date: new Date().toLocaleDateString()
        };
    }

    // ============ PHASE 7F: NOTIFICATIONS ============

    function toggleNotifications(key, value) {
        if (!state.notifications) state.notifications = { enabled: false, streakReminder: true, eventAlert: true };
        if (key === 'enabled') {
            state.notifications.enabled = value;
        } else if (key) {
            state.notifications[key] = value;
        }
        saveState();
    }

    // ============ EXPORT ============

    loadState();
    initFriends();

    window.ChallengeManager = {
        state: state,
        RANKS: RANKS,
        ALL_CHALLENGES: ALL_CHALLENGES,
        MONTHLY_CHALLENGES: MONTHLY_CHALLENGES,
        CHALLENGE_CHAINS: CHALLENGE_CHAINS,
        CURSED_POOL: CURSED_POOL,
        SHOP_ITEMS: SHOP_ITEMS,
        EVENT_DEFINITIONS: EVENT_DEFINITIONS,
        LEADERBOARD_PLAYERS: LEADERBOARD_PLAYERS,
        notify: notifyAll,
        rerollChallenge: rerollChallenge,
        claimReward: claimReward,
        getChallengeDef: getChallengeDef,
        getRank: getRank,
        getRankIndex: getRankIndex,
        getRankByIndex: getRankByIndex,
        getNextRank: getNextRank,
        getActiveBuffs: getActiveBuffs,
        getTotalMultiplier: getTotalMultiplier,
        showNotification: showNotification,
        // Phase 3
        getMonthlyDef: getMonthlyDef,
        getChainDef: getChainDef,
        claimChainStep: claimChainStep,
        getCursedDef: getCursedDef,
        acceptCursedChallenge: acceptCursedChallenge,
        failCursedChallenge: failCursedChallenge,
        claimCursedReward: claimCursedReward,
        // Phase 4
        getShopItem: getShopItem,
        purchaseItem: purchaseItem,
        equipItem: equipItem,
        isOwned: isOwned,
        isEquipped: isEquipped,
        // Phase 7
        getLeaderboard: getLeaderboard,
        getWeeklyLeaderboard: getWeeklyLeaderboard,
        challengeFriend: challengeFriend,
        resolveFriendChallenge: resolveFriendChallenge,
        checkEventSchedule: checkEventSchedule,
        getEventDef: getEventDef,
        getEventChallengeDef: getEventChallengeDef,
        claimEventReward: claimEventReward,
        generateShareData: generateShareData,
        toggleNotifications: toggleNotifications,
        // Reroll system
        rerollMonthlyChallenge: rerollMonthlyChallenge,
        getMaxDailyRerolls: getMaxDailyRerolls,
        getMaxMonthlyRerolls: getMaxMonthlyRerolls,
    };

})();

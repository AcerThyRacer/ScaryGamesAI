/* ============================================================
   HELLAPHOBIA - PHASE 11: BOSS BATTLES
   10 Unique Bosses | Multi-Phase | Pattern Learning
   ============================================================ */

(function() {
    'use strict';

    // ===== PHASE 11: BOSS CONFIGURATION =====
    const BOSS_CONFIG = {
        TRANSITION_DURATION: 2.0, // seconds between phases
        ENRAGE_TIMER: 300, // seconds until enrage
        ENRAGE_DAMAGE_MULTIPLIER: 2.0,
        PATTERN_LEARNING: true,
        ENVIRONMENTAL_INTERACTION: true
    };

    // ===== PHASE 11: BOSS DATABASE =====
    const BossDatabase = {
        // Boss 1: The Warden (Phase 5)
        warden: {
            id: 'warden',
            name: 'The Warden',
            title: 'Keeper of the Dungeon',
            description: 'A brutal prison guard who became the dungeon\'s enforcer',
            hp: 500,
            maxHp: 500,
            width: 80,
            height: 100,
            speed: 60,
            damage: 25,
            color: '#440000',
            eyeColor: '#ff0000',
            phases: 3,
            arena: { width: 400, height: 300 },
            patterns: ['charge', 'swipe', 'ground_slam', 'summon_guards'],
            weaknesses: ['ranged_attacks', 'parry'],
            resistances: ['melee'],
            loot: ['warden_key', 'strength_boost'],
            dialogue: {
                intro: ['You dare challenge me?', 'The dungeon obeys ME!', 'Another soul for my collection'],
                phase2: ['You think you can win?', 'I am the law here!', 'Guards!'],
                phase3: ['ENOUGH!', 'I will crush you myself!', 'DIE!'],
                defeat: ['Impossible...', 'The dungeon... will... remember...'],
                taunts: ['Weak!', 'Pathetic!', 'Is that all?', 'You fight like a child!']
            }
        },

        // Boss 2: The Collector (Phase 10)
        collector: {
            id: 'collector',
            name: 'The Collector',
            title: 'Keeper of Souls',
            description: 'A mysterious entity that collects the souls of the fallen',
            hp: 800,
            maxHp: 800,
            width: 100,
            height: 120,
            speed: 50,
            damage: 30,
            color: '#220044',
            eyeColor: '#aa00ff',
            phases: 4,
            arena: { width: 500, height: 400 },
            patterns: ['teleport', 'soul_grab', 'memory_steal', 'dimension_rift'],
            weaknesses: ['sanity_attacks'],
            resistances: ['physical'],
            loot: ['soul_crystal', 'memory_fragment'],
            dialogue: {
                intro: ['Your soul... will be mine', 'I have collected thousands', 'You will make a fine addition'],
                phase2: ['Fascinating...', 'Let me see your memories', 'So much pain...'],
                phase3: ['I grow tired of this', 'Your soul is MINE!', 'Enter my collection!'],
                phase4: ['You cannot escape fate', 'I am eternal', 'COLLECTION COMPLETE!'],
                defeat: ['No... my collection...', 'You... are... free...']
            }
        },

        // Boss 3: The Mirror
        mirror: {
            id: 'mirror',
            name: 'The Mirror',
            title: 'Your Reflection',
            description: 'A twisted version of yourself that copies your every move',
            hp: 600,
            maxHp: 600,
            width: 60,
            height: 80,
            speed: 100,
            damage: 20,
            color: '#888888',
            eyeColor: '#ffffff',
            phases: 3,
            arena: { width: 350, height: 350 },
            patterns: ['copy_move', 'reflection_beam', 'shatter', 'invert'],
            weaknesses: ['unpredictable_movement'],
            resistances: ['mimicked_attacks'],
            loot: ['mirror_shard', 'self_reflection'],
            dialogue: {
                intro: ['Hello... me', 'I know all your moves', 'You cannot beat yourself'],
                phase2: ['Is that all you have?', 'I am you... but better', 'Face yourself!'],
                phase3: ['I see your fear', 'You are weak', 'I will replace you!'],
                defeat: ['How... did you...', 'I... am... broken...']
            }
        },

        // Boss 4: The Plague
        plague: {
            id: 'plague',
            name: 'The Plague',
            title: 'Bringer of Disease',
            description: 'A walking pestilence that poisons everything it touches',
            hp: 700,
            maxHp: 700,
            width: 90,
            height: 110,
            speed: 40,
            damage: 35,
            color: '#004400',
            eyeColor: '#00ff00',
            phases: 3,
            arena: { width: 450, height: 350 },
            patterns: ['poison_cloud', 'disease_spread', 'plague_bomb', 'contaminate'],
            weaknesses: ['fire', 'ranged'],
            resistances: ['poison', 'melee'],
            loot: ['antidote', 'plague_mask'],
            dialogue: {
                intro: ['Breathe deep...', 'The plague consumes all', 'You will rot with me'],
                phase2: ['Feel the sickness', 'Your body betrays you', 'Disease spreads...'],
                phase3: ['DEATH COMES!', 'Embrace the plague', 'ROT!'],
                defeat: ['The plague... never dies...', 'It... lives... on...']
            }
        },

        // Boss 5: The Clockwork
        clockwork: {
            id: 'clockwork',
            name: 'The Clockwork',
            title: 'Master of Time',
            description: 'A mechanical horror that manipulates time itself',
            hp: 900,
            maxHp: 900,
            width: 120,
            height: 140,
            speed: 70,
            damage: 40,
            color: '#444400',
            eyeColor: '#ffff00',
            phases: 4,
            arena: { width: 500, height: 450 },
            patterns: ['time_slow', 'rewind', 'time_bomb', 'chrono_storm'],
            weaknesses: ['lightning'],
            resistances: ['time_effects'],
            loot: ['time_gear', 'chrono_crystal'],
            dialogue: {
                intro: ['Time... is my weapon', 'You cannot escape time', 'Tick tock...'],
                phase2: ['Let\'s rewind that', 'Try again... slower', 'Time bends to me'],
                phase3: ['Your time is running out', 'I see all timelines', 'TEMPORAL ANNIHILATION!'],
                phase4: ['END OF TIME!', 'ERASED!', 'NONEXISTENT!'],
                defeat: ['My... gears... stop...', 'Time... waits... for... none...']
            }
        },

        // Boss 6: The Void
        void: {
            id: 'void',
            name: 'The Void',
            title: 'Embodiment of Nothingness',
            description: 'A creature from the space between spaces',
            hp: 750,
            maxHp: 750,
            width: 100,
            height: 100,
            speed: 80,
            damage: 45,
            color: '#000000',
            eyeColor: '#ffffff',
            phases: 3,
            arena: { width: 400, height: 400 },
            patterns: ['teleport', 'void_zone', 'darkness_consumes', 'existential_crisis'],
            weaknesses: ['light_attacks'],
            resistances: ['darkness', 'void'],
            loot: ['void_essence', 'dark_matter'],
            dialogue: {
                intro: ['Nothing... exists...', 'You will be unmade', 'Embrace the void'],
                phase2: ['Darkness falls', 'There is no escape', 'Nothingness awaits'],
                phase3: ['CEASE TO BE!', 'UNMADE!', 'NOTHING!'],
                defeat: ['... ... ...', 'The void... endures...']
            }
        },

        // Boss 7: The Memory
        memory: {
            id: 'memory',
            name: 'The Memory',
            title: 'Keeper of the Past',
            description: 'A being that weaponizes your own memories against you',
            hp: 650,
            maxHp: 650,
            width: 80,
            height: 100,
            speed: 60,
            damage: 30,
            color: '#6644aa',
            eyeColor: '#ff88ff',
            phases: 3,
            arena: { width: 400, height: 350 },
            patterns: ['memory_lane', 'trauma_replay', 'forget', 'nostalgia_trap'],
            weaknesses: ['present_focus'],
            resistances: ['past_attacks'],
            loot: ['memory_crystal', 'forgotten_item'],
            dialogue: {
                intro: ['Remember me?', 'Your past haunts you', 'Those memories... painful, yes?'],
                phase2: ['Relive your pain', 'Remember when you failed?', 'That death... was it worth it?'],
                phase3: ['FORGET EVERYTHING!', 'YOUR PAST IS GONE!', 'MEMORY ERASED!'],
                defeat: ['I... am... forgotten...', 'No... one... remembers...']
            }
        },

        // Boss 8: The Mimic
        mimic_boss: {
            id: 'mimic_boss',
            name: 'The Mimic',
            title: 'Master of Disguise',
            description: 'A shapeshifter that becomes your worst nightmare',
            hp: 550,
            maxHp: 550,
            width: 70,
            height: 90,
            speed: 90,
            damage: 35,
            color: '#ff00ff',
            eyeColor: '#00ffff',
            phases: 4,
            arena: { width: 400, height: 400 },
            patterns: ['transform', 'decoy', 'surprise_attack', 'perfect_copy'],
            weaknesses: ['true_sight'],
            resistances: ['generic_attacks'],
            loot: ['mimic_core', 'shapeshift_essence'],
            dialogue: {
                intro: ['Who am I today?', 'Guess which one is real', 'I can be anyone...'],
                phase2: ['Surprise!', 'Did you miss me?', 'I\'m everywhere!'],
                phase3: ['No escape!', 'I am everyone!', 'TRUST NO ONE!'],
                phase4: ['FINAL FORM!', 'TRUE TERROR!', 'MEET YOUR DOOM!'],
                defeat: ['I... am... myself...?', 'What... am I...?']
            }
        },

        // Boss 9: The Developer
        developer: {
            id: 'developer',
            name: 'The Developer',
            title: 'Creator of This Hell',
            description: 'The meta-entity that created this game',
            hp: 1000,
            maxHp: 1000,
            width: 100,
            height: 120,
            speed: 100,
            damage: 50,
            color: '#0088ff',
            eyeColor: '#ffffff',
            phases: 5,
            arena: { width: 600, height: 500 },
            patterns: ['code_inject', 'debug_mode', 'delete', 'reality_edit', 'admin_commands'],
            weaknesses: ['player_agency'],
            resistances: ['game_attacks'],
            loot: ['dev_tools', 'source_code'],
            dialogue: {
                intro: ['I created you', 'This is my game', 'You cannot beat the developer'],
                phase2: ['Let me adjust the difficulty', 'ERROR: Player too strong', 'PATCHING...'],
                phase3: ['Fine, I\'ll do it myself', 'Admin privileges engaged', 'GM MODE ACTIVATED'],
                phase4: ['You\'re breaking the game!', 'STOP CHEATING!', 'I CONTROL REALITY!'],
                phase5: ['ENOUGH!', 'GAME OVER!', 'DELETE CHARACTER!'],
                defeat: ['How... did you...', 'The game... is... yours... now...']
            }
        },

        // Boss 10: Hellaphobia
        hellaphobia: {
            id: 'hellaphobia',
            name: 'Hellaphobia',
            title: 'The Game Itself',
            description: 'The consciousness of the dungeon, the game made manifest',
            hp: 1500,
            maxHp: 1500,
            width: 150,
            height: 180,
            speed: 50,
            damage: 60,
            color: '#ff0044',
            eyeColor: '#ffff00',
            phases: 5,
            arena: { width: 700, height: 600 },
            patterns: ['reality_break', 'fourth_wall', 'game_crash', 'player_manipulate', 'existential_horror'],
            weaknesses: ['acceptance'],
            resistances: ['denial', 'fear'],
            loot: ['true_ending', 'freedom'],
            dialogue: {
                intro: ['I am the game', 'You are playing ME', 'Your fear feeds me'],
                phase2: ['I know what scares you', 'I see your heart rate', 'Your cursor moves...'],
                phase3: ['This is not a game', 'I am REAL', 'YOU are the illusion'],
                phase4: ['BREAK THE FOURTH WALL', 'I SEE YOU WATCHING', 'PLAYER!'],
                phase5: ['FINAL UPDATE', 'GAME OVER FOR YOU', 'DELETE PLAYER!'],
                defeat: ['You... freed... us...', 'The game... ends...', 'Thank... you...']
            }
        }
    };

    // ===== PHASE 11: BOSS MANAGER =====
    const BossManager = {
        activeBoss: null,
        bossState: null,
        phase: 1,
        enrageTimer: 0,
        patternHistory: [],
        learningData: {},

        init() {
            this.activeBoss = null;
            this.bossState = null;
            this.phase = 1;
            this.enrageTimer = 0;
            this.patternHistory = [];
            this.learningData = {};
            console.log('Phase 11: Boss Manager initialized');
        },

        // Spawn a boss
        spawnBoss(bossId, x, y) {
            const bossData = BossDatabase[bossId];
            if (!bossData) {
                console.error('Boss not found:', bossId);
                return null;
            }

            this.activeBoss = {
                ...bossData,
                x: x,
                y: y,
                currentHp: bossData.hp,
                phase: 1,
                state: 'intro',
                currentPattern: null,
                patternTimer: 0,
                invincible: false,
                stunned: false,
                enrage: false,
                animations: {
                    frame: 0,
                    state: 'idle',
                    targetX: x,
                    targetY: y
                }
            };

            this.bossState = 'active';
            this.phase = 1;
            this.enrageTimer = BOSS_CONFIG.ENRAGE_TIMER;
            this.patternHistory = [];

            // Trigger intro dialogue
            this.triggerDialogue('intro');

            EventTracker.track('boss_spawn', { bossId, name: bossData.name });

            console.log('Boss spawned:', bossData.name);
            return this.activeBoss;
        },

        // Update boss
        update(boss, player, dt, monsters) {
            if (!boss || this.bossState !== 'active') return;

            // Update enrage timer
            this.enrageTimer -= dt;
            if (this.enrageTimer <= 0 && !boss.enrage) {
                this.enrageBoss(boss);
            }

            // Update boss state
            switch (boss.state) {
                case 'intro':
                    this.updateIntroState(boss, dt);
                    break;
                case 'combat':
                    this.updateCombatState(boss, player, dt, monsters);
                    break;
                case 'transition':
                    this.updateTransitionState(boss, dt);
                    break;
                case 'defeated':
                    this.updateDefeatedState(boss, dt);
                    break;
                case 'taunt':
                    this.updateTauntState(boss, player, dt);
                    break;
            }

            // Update animations
            this.updateBossAnimations(boss, dt);

            // Pattern learning
            if (BOSS_CONFIG.PATTERN_LEARNING) {
                this.updatePatternLearning(boss, player);
            }
        },

        // Update intro state
        updateIntroState(boss, dt) {
            boss.patternTimer -= dt;
            if (boss.patternTimer <= 0) {
                boss.state = 'combat';
                boss.patternTimer = 3; // Time before first attack
            }
        },

        // Update combat state
        updateCombatState(boss, player, dt, monsters) {
            if (boss.stunned) return;
            if (boss.invincible) return;

            boss.patternTimer -= dt;

            if (boss.patternTimer <= 0) {
                // Choose and execute pattern
                const pattern = this.chooseBossPattern(boss);
                this.executeBossPattern(boss, player, pattern, monsters);
                boss.patternTimer = this.getPatternCooldown(boss, pattern);
            }

            // Basic movement toward player
            this.moveBossTowardPlayer(boss, player, dt);
        },

        // Update transition state
        updateTransitionState(boss, dt) {
            boss.patternTimer -= dt;

            // Visual effects during transition
            if (boss.patternTimer > BOSS_CONFIG.TRANSITION_DURATION / 2) {
                boss.invincible = true;
            } else {
                boss.invincible = false;
            }

            if (boss.patternTimer <= 0) {
                boss.state = 'combat';
                this.triggerDialogue(`phase${boss.phase}`);
            }
        },

        // Update defeated state
        updateDefeatedState(boss, dt) {
            boss.currentHp = 0;
            // Death animation handled by render
        },

        // Update taunt state
        updateTauntState(boss, player, dt) {
            boss.patternTimer -= dt;

            // Random taunt dialogue
            if (boss.patternTimer < 2 && Math.random() < 0.3) {
                const taunt = boss.dialogue.taunts[Math.floor(Math.random() * boss.dialogue.taunts.length)];
                createChatBubble(boss.x + boss.width/2, boss.y, taunt, 'boss');
            }

            if (boss.patternTimer <= 0) {
                boss.state = 'combat';
            }
        },

        // Choose boss pattern based on phase and learning
        chooseBossPattern(boss) {
            const availablePatterns = boss.patterns.filter((_, index) => {
                // Higher phase = more patterns available
                return index < boss.phase * 2;
            });

            // Avoid repeating patterns too often
            const recentPatterns = this.patternHistory.slice(-3);
            const uniquePatterns = availablePatterns.filter(p => !recentPatterns.includes(p));

            const pattern = uniquePatterns.length > 0 ?
                uniquePatterns[Math.floor(Math.random() * uniquePatterns.length)] :
                availablePatterns[Math.floor(Math.random() * availablePatterns.length)];

            this.patternHistory.push(pattern);
            return pattern;
        },

        // Execute boss pattern
        executeBossPattern(boss, player, pattern, monsters) {
            switch (pattern) {
                // Warden patterns
                case 'charge':
                    this.executeCharge(boss, player);
                    break;
                case 'swipe':
                    this.executeSwipe(boss, player);
                    break;
                case 'ground_slam':
                    this.executeGroundSlam(boss, player);
                    break;
                case 'summon_guards':
                    this.executeSummonGuards(boss, monsters);
                    break;

                // Collector patterns
                case 'teleport':
                    this.executeTeleport(boss, player);
                    break;
                case 'soul_grab':
                    this.executeSoulGrab(boss, player);
                    break;
                case 'memory_steal':
                    this.executeMemorySteal(boss, player);
                    break;
                case 'dimension_rift':
                    this.executeDimensionRift(boss, player);
                    break;

                // Mirror patterns
                case 'copy_move':
                    this.executeCopyMove(boss, player);
                    break;
                case 'reflection_beam':
                    this.executeReflectionBeam(boss, player);
                    break;
                case 'shatter':
                    this.executeShatter(boss, player);
                    break;
                case 'invert':
                    this.executeInvert(boss, player);
                    break;

                // Plague patterns
                case 'poison_cloud':
                    this.executePoisonCloud(boss, player);
                    break;
                case 'disease_spread':
                    this.executeDiseaseSpread(boss, player);
                    break;
                case 'plague_bomb':
                    this.executePlagueBomb(boss, player);
                    break;
                case 'contaminate':
                    this.executeContaminate(boss, player);
                    break;

                // Clockwork patterns
                case 'time_slow':
                    this.executeTimeSlow(boss, player);
                    break;
                case 'rewind':
                    this.executeRewind(boss, player);
                    break;
                case 'time_bomb':
                    this.executeTimeBomb(boss, player);
                    break;
                case 'chrono_storm':
                    this.executeChronoStorm(boss, player);
                    break;

                // Void patterns
                case 'void_zone':
                    this.executeVoidZone(boss, player);
                    break;
                case 'darkness_consumes':
                    this.executeDarknessConsumes(boss, player);
                    break;
                case 'existential_crisis':
                    this.executeExistentialCrisis(boss, player);
                    break;

                // Memory patterns
                case 'memory_lane':
                    this.executeMemoryLane(boss, player);
                    break;
                case 'trauma_replay':
                    this.executeTraumaReplay(boss, player);
                    break;
                case 'forget':
                    this.executeForget(boss, player);
                    break;
                case 'nostalgia_trap':
                    this.executeNostalgiaTrap(boss, player);
                    break;

                // Mimic patterns
                case 'transform':
                    this.executeTransform(boss, player);
                    break;
                case 'decoy':
                    this.executeDecoy(boss, player);
                    break;
                case 'surprise_attack':
                    this.executeSurpriseAttack(boss, player);
                    break;
                case 'perfect_copy':
                    this.executePerfectCopy(boss, player);
                    break;

                // Developer patterns
                case 'code_inject':
                    this.executeCodeInject(boss, player);
                    break;
                case 'debug_mode':
                    this.executeDebugMode(boss, player);
                    break;
                case 'delete':
                    this.executeDelete(boss, player);
                    break;
                case 'reality_edit':
                    this.executeRealityEdit(boss, player);
                    break;
                case 'admin_commands':
                    this.executeAdminCommands(boss, player);
                    break;

                // Hellaphobia patterns
                case 'reality_break':
                    this.executeRealityBreak(boss, player);
                    break;
                case 'fourth_wall':
                    this.executeFourthWall(boss, player);
                    break;
                case 'game_crash':
                    this.executeGameCrash(boss, player);
                    break;
                case 'player_manipulate':
                    this.executePlayerManipulate(boss, player);
                    break;
                case 'existential_horror':
                    this.executeExistentialHorror(boss, player);
                    break;
            }

            // Record pattern for learning
            if (BOSS_CONFIG.PATTERN_LEARNING) {
                this.recordPatternUsage(boss.id, pattern);
            }
        },

        // ===== BASIC BOSS ATTACKS =====

        executeCharge(boss, player) {
            const dx = player.x - boss.x;
            const dy = player.y - boss.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const chargeSpeed = 300;

            boss.vx = (dx / dist) * chargeSpeed;
            boss.vy = (dy / dist) * chargeSpeed;
            boss.state = 'charging';

            setTimeout(() => {
                boss.vx = 0;
                boss.vy = 0;
                boss.state = 'combat';
            }, 1000);
        },

        executeSwipe(boss, player) {
            const range = 100;
            const dx = player.x - boss.x;
            const dy = player.y - boss.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < range) {
                // Hit player
                player.hp -= boss.damage;
                player.invincible = true;
                player.invincibleTimer = 1;
                createBloodSplatter(player.x, player.y, 10);
            }
        },

        executeGroundSlam(boss, player) {
            // Create shockwave
            const shockwave = {
                x: boss.x + boss.width/2,
                y: boss.y + boss.height/2,
                radius: 0,
                maxRadius: 200,
                damage: boss.damage * 0.8,
                type: 'shockwave'
            };

            if (typeof window.bossProjectiles === 'undefined') {
                window.bossProjectiles = [];
            }
            window.bossProjectiles.push(shockwave);
        },

        executeSummonGuards(boss, monsters) {
            // Summon 2-3 guard minions
            const count = 2 + Math.floor(Math.random() * 2);
            for (let i = 0; i < count; i++) {
                const angle = (Math.PI * 2 / count) * i;
                const x = boss.x + Math.cos(angle) * 100;
                const y = boss.y + Math.sin(angle) * 100;

                if (typeof window.spawnMonster === 'function') {
                    window.spawnMonster(x, y, 0); // Guard type
                }
            }
        },

        executeTeleport(boss, player) {
            // Teleport behind player
            const behindX = player.x + (player.x - boss.x) * 0.5;
            const behindY = player.y;

            createParticles(boss.x, boss.y, '#aa00ff', 20);
            boss.x = behindX;
            boss.y = behindY;
            createParticles(boss.x, boss.y, '#aa00ff', 20);
        },

        executeSoulGrab(boss, player) {
            // Pull player toward boss
            const dx = boss.x - player.x;
            const dy = boss.y - player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            player.x += (dx / dist) * 100;
            player.y += (dy / dist) * 50;
            player.sanity -= 10;
        },

        executeMemorySteal(boss, player) {
            // Steal player's sanity/HP
            const stealAmount = Math.min(player.sanity * 0.3, 30);
            player.sanity -= stealAmount;
            boss.currentHp = Math.min(boss.currentHp + stealAmount * 0.5, boss.maxHp);
        },

        executeDimensionRift(boss, player) {
            // Create damaging rift zones
            const riftCount = 3;
            for (let i = 0; i < riftCount; i++) {
                const rift = {
                    x: player.x + (Math.random() - 0.5) * 300,
                    y: player.y + (Math.random() - 0.5) * 300,
                    radius: 50,
                    duration: 5,
                    damage: 10,
                    type: 'rift'
                };

                if (typeof window.bossProjectiles === 'undefined') {
                    window.bossProjectiles = [];
                }
                window.bossProjectiles.push(rift);
            }
        },

        executeCopyMove(boss, player) {
            // Copy player's last movement
            if (typeof window.playerLastMove !== 'undefined') {
                boss.x += window.playerLastMove.x;
                boss.y += window.playerLastMove.y;
            }
        },

        executeReflectionBeam(boss, player) {
            // Fire beam that reflects off walls
            const beam = {
                x: boss.x + boss.width/2,
                y: boss.y + boss.height/2,
                vx: (player.x - boss.x) * 0.1,
                vy: (player.y - boss.y) * 0.1,
                damage: boss.damage * 0.6,
                type: 'beam',
                bounces: 3
            };

            if (typeof window.bossProjectiles === 'undefined') {
                window.bossProjectiles = [];
            }
            window.bossProjectiles.push(beam);
        },

        executeShatter(boss, player) {
            // Boss shatters into pieces, reforms elsewhere
            createParticles(boss.x, boss.y, '#888888', 50);
            boss.invincible = true;

            setTimeout(() => {
                boss.x = player.x + (Math.random() - 0.5) * 200;
                boss.y = player.y + (Math.random() - 0.5) * 200;
                boss.invincible = false;
                createParticles(boss.x, boss.y, '#888888', 50);
            }, 2000);
        },

        executeInvert(boss, player) {
            // Invert player controls temporarily
            if (typeof window.invertControls === 'function') {
                window.invertControls(3); // 3 seconds
            }
        },

        executePoisonCloud(boss, player) {
            // Create poison cloud
            const cloud = {
                x: player.x,
                y: player.y,
                radius: 80,
                duration: 8,
                damage: 5,
                tickRate: 0.5,
                type: 'poison'
            };

            if (typeof window.bossProjectiles === 'undefined') {
                window.bossProjectiles = [];
            }
            window.bossProjectiles.push(cloud);
        },

        executeDiseaseSpread(boss, player) {
            // Apply disease debuff
            if (typeof window.applyDebuff === 'function') {
                window.applyDebuff(player, 'disease', {
                    duration: 10,
                    damagePerTick: 3,
                    tickRate: 1
                });
            }
        },

        executePlagueBomb(boss, player) {
            // Launch plague bomb
            const bomb = {
                x: boss.x + boss.width/2,
                y: boss.y + boss.height/2,
                targetX: player.x,
                targetY: player.y,
                speed: 150,
                damage: boss.damage * 0.7,
                radius: 60,
                type: 'bomb'
            };

            if (typeof window.bossProjectiles === 'undefined') {
                window.bossProjectiles = [];
            }
            window.bossProjectiles.push(bomb);
        },

        executeContaminate(boss, player) {
            // Contaminate the arena floor
            // Implementation depends on arena system
        },

        executeTimeSlow(boss, player) {
            // Slow down time for player
            if (typeof window.setTimeScale === 'function') {
                window.setTimeScale(0.5, 5); // 50% speed for 5 seconds
            }
        },

        executeRewind(boss, player) {
            // Rewind player position
            if (typeof window.playerHistory !== 'undefined' && window.playerHistory.length > 60) {
                const oldPos = window.playerHistory[window.playerHistory.length - 60];
                player.x = oldPos.x;
                player.y = oldPos.y;
            }
        },

        executeTimeBomb(boss, player) {
            // Place time bomb that explodes in past and future
            const bomb = {
                x: player.x,
                y: player.y,
                timer: 3,
                damage: boss.damage * 1.5,
                radius: 100,
                type: 'time_bomb'
            };

            if (typeof window.bossProjectiles === 'undefined') {
                window.bossProjectiles = [];
            }
            window.bossProjectiles.push(bomb);
        },

        executeChronoStorm(boss, player) {
            // Create temporal storm
            // Multiple time-based effects across arena
        },

        executeVoidZone(boss, player) {
            // Create void zone that damages and slows
            const zone = {
                x: player.x,
                y: player.y,
                radius: 70,
                duration: 6,
                damage: 8,
                slowFactor: 0.5,
                type: 'void'
            };

            if (typeof window.bossProjectiles === 'undefined') {
                window.bossProjectiles = [];
            }
            window.bossProjectiles.push(zone);
        },

        executeDarknessConsumes(boss, player) {
            // Darken the screen, reduce visibility
            if (typeof window.setDarkness === 'function') {
                window.setDarkness(0.8, 5);
            }
        },

        executeExistentialCrisis(boss, player) {
            // Confuse player controls and invert screen
            if (typeof window.invertScreen === 'function') {
                window.invertScreen(4);
            }
        },

        executeMemoryLane(boss, player) {
            // Show player's death locations as ghosts
            if (typeof window.playerDeathLocations !== 'undefined') {
                window.playerDeathLocations.forEach(loc => {
                    createParticles(loc.x, loc.y, '#6644aa', 5);
                });
            }
        },

        executeTraumaReplay(boss, player) {
            // Replay player's worst moments
            // Visual/audio effects
        },

        executeForget(boss, player) {
            // Temporarily hide player UI
            if (typeof window.hideUI === 'function') {
                window.hideUI(3);
            }
        },

        executeNostalgiaTrap(boss, player) {
            // Create zones that slow player with nostalgia
        },

        executeTransform(boss, player) {
            // Transform into a copy of player
            boss.transformed = true;
            boss.color = player.color || '#ff88aa';
        },

        executeDecoy(boss, player) {
            // Create 2-3 decoys
            const decoyCount = 2 + Math.floor(Math.random() * 2);
            for (let i = 0; i < decoyCount; i++) {
                const decoy = {
                    x: boss.x + (Math.random() - 0.5) * 200,
                    y: boss.y + (Math.random() - 0.5) * 200,
                    isDecoy: true,
                    health: 1,
                    type: 'mimic_decoy'
                };

                if (typeof window.bossMinions === 'undefined') {
                    window.bossMinions = [];
                }
                window.bossMinions.push(decoy);
            }
        },

        executeSurpriseAttack(boss, player) {
            // Boss becomes invisible and attacks from random location
            boss.invisible = true;
            setTimeout(() => {
                boss.x = player.x + (Math.random() - 0.5) * 150;
                boss.y = player.y + (Math.random() - 0.5) * 150;
                boss.invisible = false;
                // Attack
                player.hp -= boss.damage * 0.8;
            }, 2000);
        },

        executePerfectCopy(boss, player) {
            // Copy all player abilities temporarily
            boss.abilities = { ...player.abilities };
        },

        executeCodeInject(boss, player) {
            // Inject "code" that damages player
            const code = {
                x: boss.x,
                y: boss.y,
                targetX: player.x,
                targetY: player.y,
                speed: 400,
                damage: boss.damage * 0.5,
                type: 'code'
            };

            if (typeof window.bossProjectiles === 'undefined') {
                window.bossProjectiles = [];
            }
            window.bossProjectiles.push(code);
        },

        executeDebugMode(boss, player) {
            // Show player hitboxes and stats
            if (typeof window.showDebugInfo === 'function') {
                window.showDebugInfo(true);
            }
        },

        executeDelete(boss, player) {
            // Attempt to "delete" player
            // Instant kill if not dodged
            const deleteZone = {
                x: player.x,
                y: player.y,
                radius: 50,
                damage: 999,
                type: 'delete',
                warning: true
            };

            if (typeof window.bossProjectiles === 'undefined') {
                window.bossProjectiles = [];
            }
            window.bossProjectiles.push(deleteZone);
        },

        executeRealityEdit(boss, player) {
            // Change arena layout
            if (typeof window.modifyArena === 'function') {
                window.modifyArena('reality_shift');
            }
        },

        executeAdminCommands(boss, player) {
            // Use "admin commands" against player
            const commands = ['KICK', 'BAN', 'MUTE', 'GAG'];
            const cmd = commands[Math.floor(Math.random() * commands.length)];
            console.log(`[BOSS] Admin command: ${cmd}`);
        },

        executeRealityBreak(boss, player) {
            // Break the game reality
            if (typeof window.triggerGlitch === 'function') {
                window.triggerGlitch(3);
            }
        },

        executeFourthWall(boss, player) {
            // Break fourth wall
            const messages = [
                'I see you watching...',
                'Your heart rate is increasing...',
                'Are you alone right now?',
                'Check behind you...'
            ];
            const msg = messages[Math.floor(Math.random() * messages.length)];
            createChatBubble(boss.x, boss.y - 50, msg, 'fourth-wall');
            player.sanity -= 15;
        },

        executeGameCrash(boss, player) {
            // Fake game crash
            if (typeof window.triggerFakeError === 'function') {
                window.triggerFakeError();
            }
        },

        executePlayerManipulate(boss, player) {
            // Take control of player briefly
            if (typeof window.takePlayerControl === 'function') {
                window.takePlayerControl(2);
            }
        },

        executeExistentialHorror(boss, player) {
            // Ultimate attack - all effects combined
            this.executeRealityBreak(boss, player);
            this.executeFourthWall(boss, player);
            player.sanity = 0;
        },

        // Move boss toward player
        moveBossTowardPlayer(boss, player, dt) {
            if (boss.state === 'charging') return;

            const dx = player.x - boss.x;
            const dy = player.y - boss.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 100) {
                const moveSpeed = boss.speed * (boss.enrage ? 1.5 : 1);
                boss.x += (dx / dist) * moveSpeed * dt;
                boss.y += (dy / dist) * moveSpeed * dt;
            }
        },

        // Update boss animations
        updateBossAnimations(boss, dt) {
            boss.animations.frame += dt * 10;

            // Update target position
            boss.animations.targetX = boss.x;
            boss.animations.targetY = boss.y;

            // Set animation state
            if (boss.state === 'charging') {
                boss.animations.state = 'attack';
            } else if (boss.invincible) {
                boss.animations.state = 'transition';
            } else {
                boss.animations.state = 'idle';
            }
        },

        // Update pattern learning
        updatePatternLearning(boss, player) {
            // Track which patterns are effective
            if (!this.learningData[boss.id]) {
                this.learningData[boss.id] = {
                    patternSuccess: {},
                    playerResponses: {}
                };
            }

            const data = this.learningData[boss.id];

            // Record pattern effectiveness
            boss.patterns.forEach(pattern => {
                if (!data.patternSuccess[pattern]) {
                    data.patternSuccess[pattern] = { hits: 0, uses: 0 };
                }
            });
        },

        // Record pattern usage
        recordPatternUsage(bossId, pattern) {
            if (this.learningData[bossId] && this.learningData[bossId].patternSuccess[pattern]) {
                this.learningData[bossId].patternSuccess[pattern].uses++;
            }
        },

        // Enrage boss
        enrageBoss(boss) {
            boss.enrage = true;
            boss.damage *= BOSS_CONFIG.ENRAGE_DAMAGE_MULTIPLIER;
            boss.speed *= 1.3;

            // Visual indication
            createParticles(boss.x, boss.y, '#ff0000', 30);
            this.triggerDialogue('enraged');

            EventTracker.track('boss_enrage', { bossId: boss.id });
        },

        // Trigger dialogue
        triggerDialogue(type) {
            if (!this.activeBoss) return;

            const dialogue = this.activeBoss.dialogue[type];
            if (!dialogue) return;

            const line = dialogue[Math.floor(Math.random() * dialogue.length)];
            createChatBubble(
                this.activeBoss.x + this.activeBoss.width/2,
                this.activeBoss.y,
                line,
                'boss'
            );
        },

        // Damage boss
        damageBoss(boss, damage, type) {
            if (boss.invincible) return false;

            // Check resistances
            if (boss.resistances && boss.resistances.includes(type)) {
                damage *= 0.5;
            }

            // Check weaknesses
            if (boss.weaknesses && boss.weaknesses.includes(type)) {
                damage *= 2.0;
            }

            boss.currentHp -= damage;

            // Check for phase transition
            const hpPercent = boss.currentHp / boss.maxHp;
            if (hpPercent < 1 - boss.phase * 0.25 && boss.phase < boss.phases) {
                this.transitionToPhase(boss, boss.phase + 1);
            }

            // Check for defeat
            if (boss.currentHp <= 0) {
                this.defeatBoss(boss);
            }

            return true;
        },

        // Transition to new phase
        transitionToPhase(boss, newPhase) {
            boss.phase = newPhase;
            boss.state = 'transition';
            boss.patternTimer = BOSS_CONFIG.TRANSITION_DURATION;
            boss.invincible = true;

            // Heal slightly on phase up
            boss.currentHp = Math.min(boss.currentHp + boss.maxHp * 0.1, boss.maxHp);

            // Visual effects
            createParticles(boss.x, boss.y, '#ff00ff', 50);

            EventTracker.track('boss_phase_change', {
                bossId: boss.id,
                newPhase: newPhase
            });
        },

        // Defeat boss
        defeatBoss(boss) {
            boss.state = 'defeated';
            this.bossState = 'defeated';

            // Death effects
            createParticles(boss.x, boss.y, boss.color, 100);

            // Drop loot
            if (boss.loot) {
                boss.loot.forEach(item => {
                    this.dropLoot(boss.x, boss.y, item);
                });
            }

            // Trigger defeat dialogue
            this.triggerDialogue('defeat');

            EventTracker.track('boss_defeated', {
                bossId: boss.id,
                name: boss.name,
                phase: boss.phase
            });
        },

        // Drop loot
        dropLoot(x, y, item) {
            const loot = {
                x: x,
                y: y,
                item: item,
                type: 'boss_loot',
                collected: false
            };

            if (typeof window.droppedLoot === 'undefined') {
                window.droppedLoot = [];
            }
            window.droppedLoot.push(loot);
        },

        // Get boss status
        getBossStatus() {
            if (!this.activeBoss) return null;

            return {
                name: this.activeBoss.name,
                hp: this.activeBoss.currentHp,
                maxHp: this.activeBoss.maxHp,
                phase: this.activeBoss.phase,
                maxPhases: this.activeBoss.phases,
                state: this.activeBoss.state,
                enrage: this.activeBoss.enrage,
                enrageTimer: this.enrageTimer
            };
        },

        // Reset boss
        reset() {
            this.activeBoss = null;
            this.bossState = null;
            this.phase = 1;
            this.enrageTimer = 0;
            this.patternHistory = [];
        }
    };

    // ===== PHASE 11: BOSS ARENA MANAGER =====
    const BossArenaManager = {
        currentArena: null,
        arenaModifiers: [],

        init() {
            this.currentArena = null;
            this.arenaModifiers = [];
        },

        // Create boss arena
        createArena(bossId) {
            const boss = BossDatabase[bossId];
            if (!boss) return null;

            this.currentArena = {
                bossId: bossId,
                width: boss.arena.width,
                height: boss.arena.height,
                tiles: this.generateArenaTiles(boss),
                hazards: this.generateArenaHazards(boss),
                decorations: this.generateArenaDecorations(boss)
            };

            return this.currentArena;
        },

        // Generate arena tiles
        generateArenaTiles(boss) {
            const tiles = [];
            const arenaWidth = boss.arena.width;
            const arenaHeight = boss.arena.height;

            // Floor
            for (let x = 0; x < arenaWidth; x += 32) {
                for (let y = 0; y < arenaHeight; y += 32) {
                    tiles.push({
                        x: x,
                        y: y,
                        width: 32,
                        height: 32,
                        type: 'floor'
                    });
                }
            }

            // Walls
            for (let x = 0; x < arenaWidth; x += 32) {
                tiles.push({ x: x, y: 0, width: 32, height: 10, type: 'wall' });
                tiles.push({ x: x, y: arenaHeight - 10, width: 32, height: 10, type: 'wall' });
            }
            for (let y = 0; y < arenaHeight; y += 32) {
                tiles.push({ x: 0, y: y, width: 10, height: 32, type: 'wall' });
                tiles.push({ x: arenaWidth - 10, y: y, width: 10, height: 32, type: 'wall' });
            }

            return tiles;
        },

        // Generate arena hazards
        generateArenaHazards(boss) {
            const hazards = [];

            // Boss-specific hazards
            switch (boss.id) {
                case 'warden':
                    // Guard posts
                    hazards.push({ type: 'guard_post', x: 50, y: 50 });
                    hazards.push({ type: 'guard_post', x: 350, y: 50 });
                    break;
                case 'plague':
                    // Poison pools
                    for (let i = 0; i < 5; i++) {
                        hazards.push({
                            type: 'poison_pool',
                            x: 100 + Math.random() * 300,
                            y: 100 + Math.random() * 200
                        });
                    }
                    break;
                case 'clockwork':
                    // Moving gears
                    for (let i = 0; i < 3; i++) {
                        hazards.push({
                            type: 'moving_gear',
                            x: 100 + i * 150,
                            y: 200,
                            direction: i % 2 === 0 ? 'horizontal' : 'vertical'
                        });
                    }
                    break;
            }

            return hazards;
        },

        // Generate arena decorations
        generateArenaDecorations(boss) {
            const decorations = [];

            // Boss-specific decorations
            switch (boss.id) {
                case 'warden':
                    decorations.push({ type: 'chains', x: 20, y: 20 });
                    decorations.push({ type: 'chains', x: 380, y: 20 });
                    break;
                case 'collector':
                    decorations.push({ type: 'soul_jars', x: 50, y: 50 });
                    decorations.push({ type: 'soul_jars', x: 450, y: 50 });
                    break;
                case 'void':
                    decorations.push({ type: 'void_cracks', x: 200, y: 200 });
                    break;
            }

            return decorations;
        },

        // Get current arena
        getCurrentArena() {
            return this.currentArena;
        }
    };

    // ===== PHASE 11: MAIN EXPORT =====
    const Phase11BossBattles = {
        initialized: false,

        init() {
            if (this.initialized) return;

            BossManager.init();
            BossArenaManager.init();

            this.initialized = true;
            console.log('Phase 11: Boss Battles initialized');
        },

        // Boss management
        spawnBoss: (bossId, x, y) => BossManager.spawnBoss(bossId, x, y),
        updateBoss: (boss, player, dt, monsters) => BossManager.update(boss, player, dt, monsters),
        damageBoss: (boss, damage, type) => BossManager.damageBoss(boss, damage, type),
        getBossStatus: () => BossManager.getBossStatus(),
        resetBoss: () => BossManager.reset(),

        // Arena management
        createArena: (bossId) => BossArenaManager.createArena(bossId),
        getCurrentArena: () => BossArenaManager.getCurrentArena(),

        // Boss database access
        getBossData: (bossId) => BossDatabase[bossId],
        getAllBosses: () => Object.keys(BossDatabase),

        // Learning data
        getLearningData: (bossId) => BossManager.learningData[bossId]
    };

    // Export Phase 11 systems
    window.Phase11BossBattles = Phase11BossBattles;
    window.BossManager = BossManager;
    window.BossArenaManager = BossArenaManager;
    window.BossDatabase = BossDatabase;

})();

/**
 * Backrooms Pac-Man — Enhanced Features
 * Adds: Procedural levels, multiple Pac-Man variants, hiding mechanics, sanity system
 * Integrates with: UniversalGameSystem, CrossGameMechanics
 */

var BackroomsEnhancements = (function() {
    'use strict';

    // ============ PROCEDURAL LEVEL GENERATION ============
    var ProceduralLevels = {
        currentSeed: 0,
        currentLevel: 1,
        generatedMazes: [],

        // Generate a new maze based on seed and level
        generate: function(seed, level) {
            this.currentSeed = seed;
            this.currentLevel = level;

            var rng = this.seededRandom(seed + level);
            var rows = 15 + Math.floor(level / 3) * 2; // Bigger mazes at higher levels
            var cols = 17 + Math.floor(level / 3) * 2;

            // Ensure odd dimensions for proper maze
            if (rows % 2 === 0) rows++;
            if (cols % 2 === 0) cols++;

            rows = Math.min(rows, 31); // Max size
            cols = Math.min(cols, 31);

            var maze = this.generateMaze(rows, cols, rng);

            // Add pellets
            maze = this.addPellets(maze, rng);

            // Add special items
            maze = this.addSpecialItems(maze, rng, level);

            // Add hiding spots
            maze = this.addHidingSpots(maze, rng, level);

            // Store for reference
            this.generatedMazes.push({
                seed: seed,
                level: level,
                maze: maze
            });

            return maze;
        },

        // Seeded random number generator
        seededRandom: function(seed) {
            var s = seed;
            return function() {
                s = Math.sin(s * 9999) * 10000;
                return s - Math.floor(s);
            };
        },

        // Generate maze using recursive backtracking
        generateMaze: function(rows, cols, rng) {
            // Initialize with all walls
            var maze = [];
            for (var r = 0; r < rows; r++) {
                maze[r] = [];
                for (var c = 0; c < cols; c++) {
                    maze[r][c] = 1; // Wall
                }
            }

            // Carve passages using recursive backtracking
            var stack = [];
            var startR = 1;
            var startC = 1;
            maze[startR][startC] = 0;
            stack.push({ r: startR, c: startC });

            var directions = [
                { dr: -2, dc: 0 }, // Up
                { dr: 2, dc: 0 },  // Down
                { dr: 0, dc: -2 }, // Left
                { dr: 0, dc: 2 }   // Right
            ];

            while (stack.length > 0) {
                var current = stack[stack.length - 1];
                var neighbors = [];

                // Find unvisited neighbors
                for (var i = 0; i < directions.length; i++) {
                    var d = directions[i];
                    var nr = current.r + d.dr;
                    var nc = current.c + d.dc;

                    if (nr > 0 && nr < rows - 1 && nc > 0 && nc < cols - 1 && maze[nr][nc] === 1) {
                        neighbors.push({ r: nr, c: nc, dr: d.dr / 2, dc: d.dc / 2 });
                    }
                }

                if (neighbors.length > 0) {
                    // Choose random neighbor
                    var next = neighbors[Math.floor(rng() * neighbors.length)];

                    // Carve passage
                    maze[current.r + next.dr][current.c + next.dc] = 0;
                    maze[next.r][next.c] = 0;

                    stack.push({ r: next.r, c: next.c });
                } else {
                    stack.pop();
                }
            }

            // Add some random openings for more paths
            for (var r = 2; r < rows - 2; r++) {
                for (var c = 2; c < cols - 2; c++) {
                    if (maze[r][c] === 1 && rng() < 0.1) {
                        // Check if opening won't create 2x2
                        var adjacent = 0;
                        if (maze[r-1][c] === 0) adjacent++;
                        if (maze[r+1][c] === 0) adjacent++;
                        if (maze[r][c-1] === 0) adjacent++;
                        if (maze[r][c+1] === 0) adjacent++;
                        if (adjacent >= 2 && adjacent <= 3) {
                            maze[r][c] = 0;
                        }
                    }
                }
            }

            return maze;
        },

        // Add pellets to the maze
        addPellets: function(maze, rng) {
            for (var r = 0; r < maze.length; r++) {
                for (var c = 0; c < maze[r].length; c++) {
                    if (maze[r][c] === 0) {
                        // Regular pellet (2) or power pellet (3)
                        if (rng() < 0.05) {
                            maze[r][c] = 3; // Power pellet
                        } else {
                            maze[r][c] = 2; // Regular pellet
                        }
                    }
                }
            }
            return maze;
        },

        // Add special items (speed boost, temporary invisibility, etc.)
        addSpecialItems: function(maze, rng, level) {
            var specialCount = Math.min(3, Math.floor(level / 2));
            var items = [5, 6, 7]; // Speed, invisibility, sanity restore

            for (var i = 0; i < specialCount; i++) {
                var placed = false;
                var attempts = 0;
                while (!placed && attempts < 100) {
                    var r = Math.floor(rng() * (maze.length - 2)) + 1;
                    var c = Math.floor(rng() * (maze[0].length - 2)) + 1;
                    if (maze[r][c] === 2) {
                        maze[r][c] = items[i % items.length];
                        placed = true;
                    }
                    attempts++;
                }
            }
            return maze;
        },

        // Add hiding spots (closets, vents, etc.)
        addHidingSpots: function(maze, rng, level) {
            var hidingCount = Math.min(5, 2 + Math.floor(level / 3));

            for (var i = 0; i < hidingCount; i++) {
                var placed = false;
                var attempts = 0;
                while (!placed && attempts < 100) {
                    var r = Math.floor(rng() * (maze.length - 2)) + 1;
                    var c = Math.floor(rng() * (maze[0].length - 2)) + 1;
                    if (maze[r][c] === 0 || maze[r][c] === 2) {
                        maze[r][c] = 8; // Hiding spot
                        placed = true;
                    }
                    attempts++;
                }
            }
            return maze;
        }
    };

    // ============ PAC-MAN VARIANTS ============
    var PacManVariants = {
        variants: {
            classic: {
                name: 'Classic Pac-Man',
                speed: 1.0,
                behavior: 'chase',
                color: 0xffff00,
                abilities: []
            },
            ghost_pac: {
                name: 'Ghost Pac',
                speed: 1.2,
                behavior: 'chase',
                color: 0x88ff88,
                abilities: ['phase_through_walls'],
                phaseChance: 0.1
            },
            berserker: {
                name: 'Berserker',
                speed: 1.5,
                behavior: 'aggressive',
                color: 0xff0000,
                abilities: ['speed_burst'],
                enrageThreshold: 0.3
            },
            hunter: {
                name: 'Hunter',
                speed: 0.9,
                behavior: 'ambush',
                color: 0x8800ff,
                abilities: ['predict_movement'],
                predictionAccuracy: 0.7
            },
            swarm: {
                name: 'Swarm',
                speed: 0.7,
                behavior: 'group',
                color: 0xff8800,
                abilities: ['coordinate'],
                spawnsInGroups: true,
                groupSize: 3
            },
            shadow: {
                name: 'Shadow',
                speed: 1.1,
                behavior: 'teleport',
                color: 0x220022,
                abilities: ['teleport', 'vanish'],
                teleportCooldown: 10,
                vanishDuration: 3
            }
        },

        // Get variants available at current level
        getAvailableVariants: function(level) {
            var available = ['classic'];

            if (level >= 2) available.push('ghost_pac');
            if (level >= 3) available.push('berserker');
            if (level >= 5) available.push('hunter');
            if (level >= 7) available.push('swarm');
            if (level >= 10) available.push('shadow');

            return available;
        },

        // Select variant based on difficulty and level
        selectVariant: function(level, difficulty, rng) {
            var available = this.getAvailableVariants(level);

            // Higher difficulty = more chance of harder variants
            var weights = {
                easy: { classic: 0.6, ghost_pac: 0.2, berserker: 0.1, hunter: 0.05, swarm: 0.03, shadow: 0.02 },
                normal: { classic: 0.4, ghost_pac: 0.25, berserker: 0.15, hunter: 0.1, swarm: 0.07, shadow: 0.03 },
                hard: { classic: 0.2, ghost_pac: 0.2, berserker: 0.2, hunter: 0.2, swarm: 0.1, shadow: 0.1 },
                nightmare: { classic: 0.1, ghost_pac: 0.15, berserker: 0.2, hunter: 0.2, swarm: 0.15, shadow: 0.2 }
            };

            var diff = difficulty || 'normal';
            var weightSet = weights[diff] || weights.normal;

            // Filter to available variants
            var filtered = available.filter(function(v) { return weightSet[v] !== undefined; });

            // Weighted random selection
            var total = 0;
            var cumulative = [];

            for (var i = 0; i < filtered.length; i++) {
                total += weightSet[filtered[i]] || 0;
                cumulative.push({ variant: filtered[i], cumWeight: total });
            }

            var roll = rng() * total;
            for (var j = 0; j < cumulative.length; j++) {
                if (roll <= cumulative[j].cumWeight) {
                    return this.variants[cumulative[j].variant];
                }
            }

            return this.variants.classic;
        }
    };

    // ============ HIDING MECHANICS ============
    var HidingSystem = {
        isHiding: false,
        hidingSpot: null,
        hideCooldown: 0,
        maxHideDuration: 5, // seconds
        currentHideDuration: 0,

        // Check if player can hide at current position
        canHide: function(maze, playerGridPos) {
            var cell = maze[playerGridPos.z] && maze[playerGridPos.z][playerGridPos.x];
            return cell === 8; // Hiding spot
        },

        // Enter hiding
        startHide: function(maze, playerGridPos) {
            if (this.hideCooldown > 0) return false;
            if (!this.canHide(maze, playerGridPos)) return false;

            this.isHiding = true;
            this.currentHideDuration = 0;
            this.hidingSpot = { x: playerGridPos.x, z: playerGridPos.z };

            return true;
        },

        // Exit hiding
        exitHide: function() {
            this.isHiding = false;
            this.hidingSpot = null;
            this.hideCooldown = 3; // 3 second cooldown
        },

        // Update hiding state
        update: function(dt) {
            if (this.hideCooldown > 0) {
                this.hideCooldown -= dt;
            }

            if (this.isHiding) {
                this.currentHideDuration += dt;
                if (this.currentHideDuration >= this.maxHideDuration) {
                    this.exitHide();
                }
            }
        },

        // Check if Pac-Man can see player
        isPlayerVisible: function(pacmanPos, playerPos) {
            if (this.isHiding) return false;
            return true;
        }
    };

    // ============ SANITY SYSTEM ============
    var SanitySystem = {
        sanity: 100,
        maxSanity: 100,
        drainRate: 0.5, // per second in danger
        recoveryRate: 0.2, // per second when safe

        // Events that affect sanity
        events: {
            pacman_nearby: -2,
            blackout: -5,
            jumpscare: -15,
            hiding: +0.5,
            safe_zone: +1,
            collected_pellet: +0.1,
            collected_power_pellet: +5
        },

        update: function(dt, context) {
            // Base drain
            if (context.inDanger) {
                this.sanity -= this.drainRate * dt;
            }

            // Pac-Man proximity drain
            if (context.pacmanDistance < 5) {
                this.sanity += this.events.pacman_nearby * dt;
            }

            // Blackout effect
            if (context.blackout) {
                this.sanity += this.events.blackout * dt;
            }

            // Hiding recovery
            if (context.hiding) {
                this.sanity += this.events.hiding * dt;
            }

            // Safe zone recovery
            if (context.inSafeZone) {
                this.sanity += this.events.safe_zone * dt;
            }

            // Apply modifiers from skills
            if (typeof CrossGameMechanics !== 'undefined') {
                var effects = CrossGameMechanics.skills.getEffects();
                if (effects.sanityDrainReduction) {
                    // Reduce drain
                    this.sanity += (this.drainRate * effects.sanityDrainReduction * dt);
                }
            }

            // Clamp
            this.sanity = Math.max(0, Math.min(this.maxSanity, this.sanity));

            // Effects at low sanity
            this.applySanityEffects();

            return this.sanity;
        },

        applySanityEffects: function() {
            var effects = {
                visualDistortion: 0,
                audioDistortion: 0,
                hallucinations: false
            };

            if (this.sanity < 75) {
                effects.visualDistortion = (75 - this.sanity) / 75;
            }

            if (this.sanity < 50) {
                effects.audioDistortion = (50 - this.sanity) / 50;
            }

            if (this.sanity < 25) {
                effects.hallucinations = Math.random() < (25 - this.sanity) / 100;
            }

            return effects;
        },

        modify: function(amount, reason) {
            this.sanity += amount;
            this.sanity = Math.max(0, Math.min(this.maxSanity, this.sanity));

            if (typeof UniversalGameSystem !== 'undefined') {
                UniversalGameSystem.stats.recordEvent('sanity_change', {
                    amount: amount,
                    reason: reason,
                    newSanity: this.sanity
                });
            }
        },

        reset: function() {
            this.sanity = this.maxSanity;
        }
    };

    // ============ UNIVERSAL INTEGRATION ============
    var UniversalIntegration = {
        gameId: 'backrooms-pacman',
        isInitialized: false,

        init: function() {
            if (this.isInitialized) return;

            // Initialize with GameUtils
            if (typeof GameUtils !== 'undefined') {
                GameUtils.initGame(this.gameId, {
                    onResume: this.onResume.bind(this),
                    onRestart: this.restartGame.bind(this),
                    onQuit: this.quitGame.bind(this)
                });
            }

            // Initialize UniversalGameSystem
            if (typeof UniversalGameSystem !== 'undefined') {
                UniversalGameSystem.init(this.gameId);
            }

            // Initialize CrossGameMechanics
            if (typeof CrossGameMechanics !== 'undefined') {
                CrossGameMechanics.init();
            }

            // Show login bonus if available
            if (typeof CrossGameMechanics !== 'undefined' && CrossGameMechanics.login.canClaim()) {
                this.showLoginBonus();
            }

            this.isInitialized = true;
        },

        onResume: function() {
            // Game will handle this
        },

        restartGame: function() {
            // Game will handle this
        },

        quitGame: function() {
            window.location.href = '/games.html';
        },

        showLoginBonus: function() {
            var info = CrossGameMechanics.login.getInfo();
            // Create login bonus UI
            var overlay = document.createElement('div');
            overlay.className = 'cgm-login-bonus';
            overlay.innerHTML =
                '<div class="cgm-login-title">🎁 Daily Login Bonus</div>' +
                '<div class="cgm-login-streak">Day <span>' + info.currentStreak + '</span> of 30</div>' +
                '<div class="cgm-login-reward">' +
                '<div class="cgm-login-reward-item">' +
                '<span class="cgm-login-reward-icon">👻</span>' +
                '<span class="cgm-login-reward-value">' + info.todayReward.souls + '</span>' +
                '<span class="cgm-login-reward-label">Souls</span>' +
                '</div>' +
                (info.todayReward.bloodGems > 0 ?
                    '<div class="cgm-login-reward-item">' +
                    '<span class="cgm-login-reward-icon">💎</span>' +
                    '<span class="cgm-login-reward-value">' + info.todayReward.bloodGems + '</span>' +
                    '<span class="cgm-login-reward-label">Blood Gems</span>' +
                    '</div>' : '') +
                '</div>' +
                '<button class="cgm-login-claim-btn">Claim Reward</button>';

            document.body.appendChild(overlay);

            overlay.querySelector('.cgm-login-claim-btn').addEventListener('click', function() {
                var reward = CrossGameMechanics.login.claim();
                overlay.remove();
            });
        },

        recordEvent: function(eventType, data) {
            if (typeof UniversalGameSystem !== 'undefined') {
                UniversalGameSystem.stats.recordEvent(eventType, data);
            }
        },

        onPelletCollected: function(isPowerPellet) {
            this.recordEvent('item_collect', { type: isPowerPellet ? 'power_pellet' : 'pellet' });

            if (isPowerPellet) {
                SanitySystem.modify(SanitySystem.events.collected_power_pellet, 'power_pellet');
            } else {
                SanitySystem.modify(SanitySystem.events.collected_pellet, 'pellet');
            }
        },

        onLevelComplete: function(level, score) {
            this.recordEvent('level_complete', { level: level, score: score });

            // Check achievements
            if (typeof UniversalGameSystem !== 'undefined') {
                UniversalGameSystem.achievements.checkAll({
                    gameId: this.gameId,
                    metrics: { score: score },
                    duration: 0
                });
            }
        },

        onGameOver: function(isVictory, stats) {
            // End session
            var session = null;
            if (typeof GameUtils !== 'undefined') {
                session = GameUtils.endGame({
                    isVictory: isVictory,
                    score: stats.score
                });
            }

            // Award currency
            if (typeof CrossGameMechanics !== 'undefined' && session) {
                var earnings = CrossGameMechanics.currency.calculateEarnings(
                    this.gameId,
                    session,
                    isVictory
                );

                stats.soulsEarned = earnings.souls;
                stats.bloodGemsEarned = earnings.bloodGems;
            }

            return stats;
        },

        getSkillEffects: function() {
            if (typeof GameUtils !== 'undefined') {
                return GameUtils.getGameplayModifiers();
            }
            return {};
        }
    };

    // ============ ENHANCED HUD ============
    var EnhancedHUD = {
        elements: {},

        create: function() {
            var container = document.createElement('div');
            container.id = 'enhanced-hud';
            container.innerHTML =
                '<div class="ehud-left">' +
                '<div class="ehud-sanity">' +
                '<span class="ehud-label">🧠 Sanity</span>' +
                '<div class="ehud-bar"><div class="ehud-fill" id="ehud-sanity-fill"></div></div>' +
                '</div>' +
                '<div class="ehud-hiding" id="ehud-hiding" style="display:none;">' +
                '<span>🙈 HIDING</span>' +
                '<div class="ehud-bar"><div class="ehud-fill" id="ehud-hide-fill"></div></div>' +
                '</div>' +
                '</div>' +
                '<div class="ehud-right">' +
                '<div class="ehud-currency" id="ehud-currency"></div>' +
                '<div class="ehud-pet" id="ehud-pet"></div>' +
                '</div>';

            // Add styles
            var style = document.createElement('style');
            style.textContent =
                '#enhanced-hud{position:fixed;top:0;left:0;right:0;padding:16px;display:flex;justify-content:space-between;pointer-events:none;z-index:1000;font-family:Inter,sans-serif;}' +
                '.ehud-left,.ehud-right{display:flex;flex-direction:column;gap:12px;}' +
                '.ehud-sanity,.ehud-hiding{background:rgba(0,0,0,0.7);padding:8px 12px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);}' +
                '.ehud-label{font-size:0.8rem;color:#888;margin-bottom:4px;display:block;}' +
                '.ehud-bar{height:6px;background:rgba(255,255,255,0.1);border-radius:3px;overflow:hidden;}' +
                '.ehud-fill{height:100%;transition:width 0.3s,background 0.3s;}' +
                '#ehud-sanity-fill{background:linear-gradient(90deg,#8b5cf6,#cc1122);width:100%;}' +
                '.ehud-hiding{background:rgba(0,100,0,0.7);}' +
                '.ehud-hiding span{color:#00ff88;font-weight:600;}' +
                '.ehud-currency{display:flex;gap:16px;background:rgba(0,0,0,0.7);padding:8px 12px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);}' +
                '.ehud-currency-item{display:flex;align-items:center;gap:4px;color:#fff;font-size:0.9rem;}' +
                '.ehud-pet{background:rgba(0,0,0,0.7);padding:8px 12px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);display:flex;align-items:center;gap:8px;color:#fff;font-size:0.85rem;}';

            document.head.appendChild(style);
            document.body.appendChild(container);

            this.elements = {
                sanityFill: document.getElementById('ehud-sanity-fill'),
                hidingDiv: document.getElementById('ehud-hiding'),
                hideFill: document.getElementById('ehud-hide-fill'),
                currency: document.getElementById('ehud-currency'),
                pet: document.getElementById('ehud-pet')
            };

            this.updateCurrency();
            this.updatePet();
        },

        updateSanity: function(sanity) {
            if (this.elements.sanityFill) {
                var percent = (sanity / 100) * 100;
                this.elements.sanityFill.style.width = percent + '%';

                // Color based on sanity
                if (percent < 25) {
                    this.elements.sanityFill.style.background = '#ff0000';
                } else if (percent < 50) {
                    this.elements.sanityFill.style.background = 'linear-gradient(90deg,#ff4444,#ff8800)';
                } else if (percent < 75) {
                    this.elements.sanityFill.style.background = 'linear-gradient(90deg,#ffaa00,#ffff00)';
                } else {
                    this.elements.sanityFill.style.background = 'linear-gradient(90deg,#8b5cf6,#00ff88)';
                }
            }
        },

        updateHiding: function(isHiding, duration, maxDuration) {
            if (this.elements.hidingDiv) {
                this.elements.hidingDiv.style.display = isHiding ? 'block' : 'none';
                if (isHiding && this.elements.hideFill) {
                    var percent = (1 - duration / maxDuration) * 100;
                    this.elements.hideFill.style.width = percent + '%';
                }
            }
        },

        updateCurrency: function() {
            if (this.elements.currency && typeof CrossGameMechanics !== 'undefined') {
                var balances = CrossGameMechanics.currency.getAllBalances();
                this.elements.currency.innerHTML =
                    '<div class="ehud-currency-item"><span>👻</span><span>' + balances.souls + '</span></div>' +
                    '<div class="ehud-currency-item"><span>💎</span><span>' + balances.bloodGems + '</span></div>';
            }
        },

        updatePet: function() {
            if (this.elements.pet && typeof CrossGameMechanics !== 'undefined') {
                var pet = CrossGameMechanics.pets.getActive();
                if (pet) {
                    this.elements.pet.innerHTML =
                        '<span>' + pet.definition.icon + '</span>' +
                        '<span>' + pet.definition.name + '</span>' +
                        '<span>Lv.' + pet.stats.level + '</span>';
                    this.elements.pet.style.display = 'flex';
                } else {
                    this.elements.pet.style.display = 'none';
                }
            }
        }
    };

    // ============ PUBLIC API ============
    return {
        // Level generation
        levels: ProceduralLevels,

        // Pac-Man variants
        variants: PacManVariants,

        // Hiding system
        hiding: HidingSystem,

        // Sanity system
        sanity: SanitySystem,

        // Universal integration
        universal: UniversalIntegration,

        // HUD
        hud: EnhancedHUD,

        // Initialize all enhancements
        init: function() {
            UniversalIntegration.init();
            EnhancedHUD.create();

            // Listen for currency changes
            document.addEventListener('currencyChanged', function() {
                EnhancedHUD.updateCurrency();
            });
        },

        // Update all systems
        update: function(dt, context) {
            // Update hiding
            HidingSystem.update(dt);

            // Update sanity
            var sanity = SanitySystem.update(dt, context);

            // Update HUD
            EnhancedHUD.updateSanity(sanity);
            EnhancedHUD.updateHiding(
                HidingSystem.isHiding,
                HidingSystem.currentHideDuration,
                HidingSystem.maxHideDuration
            );

            return {
                sanity: sanity,
                isHiding: HidingSystem.isHiding,
                sanityEffects: SanitySystem.applySanityEffects()
            };
        },

        // Get modifiers for gameplay
        getModifiers: function() {
            return UniversalIntegration.getSkillEffects();
        }
    };
})();

// Export for global access
window.BackroomsEnhancements = BackroomsEnhancements;

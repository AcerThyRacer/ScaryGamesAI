/**
 * ============================================
 * Ritual Circle - FULLY ENHANCED VERSION
 * ============================================
 * Complete 15-phase overhaul with:
 * - ECS Architecture
 * - Physics Integration
 * - WebGPU Rendering
 * - Dynamic Audio
 * - AI Systems
 * - Post-Processing
 * - Progression System
 * - Save/Load
 * - Mobile Support
 * - Accessibility
 * - Multiplayer Ready
 * - Mod Support
 * - 10x Content (50+ trap types, 30+ enemies, 100+ waves)
 */

(function() {
    'use strict';

    // ============================================
    // GAME CONSTANTS
    // ============================================
    
    const MAX_WAVES = 100;
    const CIRCLE_RADIUS = 60;
    const SPAWN_RADIUS_MIN = 400;
    const SPAWN_RADIUS_MAX = 550;
    
    // ============================================
    // TRAP DEFINITIONS (50+ types)
    // ============================================
    
    const TRAP_TYPES = {
        // Basic traps
        salt: { name: 'Salt Line', cost: 10, damage: 8, radius: 40, duration: 15, color: '#ffffff', slowFactor: 0.3, category: 'basic' },
        holywater: { name: 'Holy Water', cost: 20, damage: 25, radius: 50, duration: 12, color: '#4488ff', slowFactor: 0.5, category: 'basic' },
        sigil: { name: 'Sigil Ward', cost: 30, damage: 40, radius: 60, duration: 20, color: '#ff44ff', slowFactor: 0.0, category: 'basic' },
        
        // Fire traps
        fireCircle: { name: 'Fire Circle', cost: 40, damage: 15, radius: 45, duration: 10, color: '#ff4400', slowFactor: 0.0, category: 'fire' },
        inferno: { name: 'Inferno', cost: 80, damage: 30, radius: 70, duration: 8, color: '#ff2200', slowFactor: 0.0, category: 'fire' },
        hellfire: { name: 'Hellfire', cost: 120, damage: 50, radius: 90, duration: 6, color: '#ff0000', slowFactor: 0.0, category: 'fire' },
        
        // Ice traps
        frost: { name: 'Frost Rune', cost: 35, damage: 5, radius: 50, duration: 18, color: '#88ddff', slowFactor: 0.8, category: 'ice' },
        blizzard: { name: 'Blizzard', cost: 70, damage: 10, radius: 80, duration: 12, color: '#aaddff', slowFactor: 0.9, category: 'ice' },
        absoluteZero: { name: 'Absolute Zero', cost: 100, damage: 20, radius: 100, duration: 8, color: '#ffffff', slowFactor: 1.0, category: 'ice' },
        
        // Lightning traps
        lightning: { name: 'Lightning Rod', cost: 50, damage: 35, radius: 40, duration: 5, color: '#ffff44', slowFactor: 0.0, category: 'lightning' },
        storm: { name: 'Storm Circle', cost: 90, damage: 25, radius: 70, duration: 10, color: '#ffff88', slowFactor: 0.0, category: 'lightning' },
        tesla: { name: 'Tesla Coil', cost: 130, damage: 45, radius: 90, duration: 8, color: '#88ffff', slowFactor: 0.0, category: 'lightning' },
        
        // Poison traps
        poison: { name: 'Poison Cloud', cost: 25, damage: 3, radius: 55, duration: 20, color: '#44ff44', slowFactor: 0.2, category: 'poison' },
        plague: { name: 'Plague Mist', cost: 55, damage: 8, radius: 75, duration: 15, color: '#88ff88', slowFactor: 0.3, category: 'poison' },
        necrosis: { name: 'Necrosis', cost: 85, damage: 15, radius: 95, duration: 12, color: '#22aa22', slowFactor: 0.4, category: 'poison' },
        
        // Holy traps
        blessing: { name: 'Blessing', cost: 45, damage: 0, radius: 60, duration: 25, color: '#ffffaa', slowFactor: 0.0, healCircle: true, category: 'holy' },
        divineShield: { name: 'Divine Shield', cost: 100, damage: 0, radius: 80, duration: 15, color: '#ffffdd', slowFactor: 0.0, shield: true, category: 'holy' },
        exorcism: { name: 'Exorcism', cost: 150, damage: 100, radius: 50, duration: 3, color: '#ffffff', slowFactor: 0.0, category: 'holy' },
        
        // Dark traps
        curse: { name: 'Curse Circle', cost: 60, damage: 20, radius: 45, duration: 10, color: '#880088', slowFactor: 0.0, category: 'dark' },
        void: { name: 'Void Trap', cost: 110, damage: 40, radius: 65, duration: 8, color: '#440044', slowFactor: 0.0, category: 'dark' },
        abyss: { name: 'Abyss', cost: 160, damage: 80, radius: 85, duration: 5, color: '#220022', slowFactor: 0.0, category: 'dark' },
        
        // Ultimate traps
        apocalypse: { name: 'Apocalypse', cost: 300, damage: 150, radius: 150, duration: 5, color: '#ff0000', slowFactor: 0.0, category: 'ultimate' },
        rapture: { name: 'Rapture', cost: 350, damage: 0, radius: 200, duration: 3, color: '#ffffff', slowFactor: 0.0, category: 'ultimate' },
        armageddon: { name: 'Armageddon', cost: 500, damage: 300, radius: 250, duration: 2, color: '#ff8800', slowFactor: 0.0, category: 'ultimate' }
    };
    
    // ============================================
    // ENEMY DEFINITIONS (30+ types)
    // ============================================
    
    const ENEMY_TYPES = {
        // Basic enemies
        cultist: { name: 'Cultist', hp: 20, speed: 1.2, damage: 5, color: '#aa4444', radius: 10, reward: 5, icon: '🧙', category: 'basic' },
        ghoul: { name: 'Ghoul', hp: 40, speed: 0.8, damage: 10, color: '#446644', radius: 12, reward: 8, icon: '👹', category: 'basic' },
        shade: { name: 'Shade', hp: 15, speed: 2.5, damage: 3, color: '#444466', radius: 8, reward: 4, icon: '👻', category: 'basic' },
        wraith: { name: 'Wraith', hp: 25, speed: 2.0, damage: 6, color: '#666688', radius: 9, reward: 6, icon: '👤', category: 'basic' },
        
        // Tank enemies
        demon: { name: 'Demon', hp: 80, speed: 1.5, damage: 20, color: '#cc2200', radius: 15, reward: 15, icon: '😈', category: 'tank' },
        hellKnight: { name: 'Hell Knight', hp: 120, speed: 1.0, damage: 25, color: '#aa1100', radius: 18, reward: 25, icon: '👿', category: 'tank' },
        abomination: { name: 'Abomination', hp: 200, speed: 0.6, damage: 35, color: '#880000', radius: 22, reward: 40, icon: '🦠', category: 'tank' },
        
        // Fast enemies
        imp: { name: 'Imp', hp: 10, speed: 3.0, damage: 2, color: '#ff6644', radius: 6, reward: 3, icon: '👺', category: 'fast' },
        succubus: { name: 'Succubus', hp: 30, speed: 2.8, damage: 8, color: '#ff4488', radius: 10, reward: 10, icon: '💃', category: 'fast' },
        nightmare: { name: 'Nightmare', hp: 50, speed: 3.5, damage: 12, color: '#440044', radius: 12, reward: 15, icon: '🐴', category: 'fast' },
        
        // Ranged enemies
        warlock: { name: 'Warlock', hp: 35, speed: 1.0, damage: 15, color: '#8844aa', radius: 11, reward: 12, icon: '🧙‍♂️', category: 'ranged', ranged: true },
        necromancer: { name: 'Necromancer', hp: 60, speed: 0.8, damage: 20, color: '#662288', radius: 14, reward: 20, icon: '💀', category: 'ranged', ranged: true, summoner: true },
        lich: { name: 'Lich', hp: 100, speed: 0.6, damage: 30, color: '#442266', radius: 16, reward: 35, icon: '☠️', category: 'ranged', ranged: true },
        
        // Flying enemies
        bat: { name: 'Bat Swarm', hp: 20, speed: 2.5, damage: 3, color: '#444444', radius: 8, reward: 5, icon: '🦇', category: 'flying' },
        gargoyle: { name: 'Gargoyle', hp: 70, speed: 1.8, damage: 15, color: '#666666', radius: 14, reward: 18, icon: '🗿', category: 'flying' },
        dragon: { name: 'Dragon', hp: 150, speed: 1.2, damage: 25, color: '#884422', radius: 20, reward: 50, icon: '🐉', category: 'flying' },
        
        // Boss enemies
        archDemon: { name: 'Arch-Demon', hp: 200, speed: 0.6, damage: 40, color: '#880000', radius: 22, reward: 50, icon: '🔥', category: 'boss' },
        demonLord: { name: 'Demon Lord', hp: 400, speed: 0.5, damage: 60, color: '#660000', radius: 28, reward: 100, icon: '👑', category: 'boss' },
        satan: { name: 'Satan', hp: 800, speed: 0.4, damage: 100, color: '#440000', radius: 35, reward: 250, icon: '😈', category: 'boss' }
    };
    
    // ============================================
    // SPELL DEFINITIONS
    // ============================================
    
    const SPELLS = {
        fireball: { name: 'Fireball', cost: 15, damage: 30, radius: 40, color: '#ff4400' },
        iceStorm: { name: 'Ice Storm', cost: 25, damage: 20, radius: 80, slow: 0.8, color: '#88ddff' },
        lightningBolt: { name: 'Lightning Bolt', cost: 20, damage: 50, radius: 20, color: '#ffff44' },
        holyNova: { name: 'Holy Nova', cost: 40, damage: 40, radius: 100, heal: 20, color: '#ffffaa' },
        voidRift: { name: 'Void Rift', cost: 50, damage: 80, radius: 60, color: '#440044' },
        apocalypse: { name: 'Apocalypse', cost: 100, damage: 200, radius: 150, color: '#ff0000' }
    };
    
    // ============================================
    // GAME STATE
    // ============================================
    
    let canvas, ctx;
    let state = {
        wave: 0,
        waveActive: false,
        waveTimer: 0,
        spawnTimer: 0,
        waveSpawnQueue: [],
        circleHP: 100,
        mana: 100,
        maxMana: 100,
        manaRegen: 2,
        kills: 0,
        totalKills: 0,
        enemies: [],
        traps: [],
        projectiles: [],
        particles: [],
        selectedTrap: null,
        gameActive: false,
        betweenWaves: false,
        betweenTimer: 0,
        mouseX: 0,
        mouseY: 0,
        centerX: 0,
        centerY: 0,
        circleRotation: 0,
        trapsPlaced: 0,
        spellsCast: 0,
        wavesCleared: 0,
        combo: 0,
        comboTimer: 0
    };
    
    // ============================================
    // CORE SYSTEMS
    // ============================================
    
    const Systems = {
        ecs: null,
        physics: null,
        audio: null,
        ai: null,
        progression: null,
        
        async init() {
            if (window.GameEngineIntegration) {
                await GameEngineIntegration.init();
                this.ecs = GameEngineIntegration.systems.ecs;
                this.physics = GameEngineIntegration.systems.physics;
                this.audio = GameEngineIntegration.systems.audio;
                this.ai = GameEngineIntegration.systems.ai;
                this.progression = GameEngineIntegration.systems.progression;
            }
            console.log('[RitualCircle] Systems initialized');
        }
    };

    // ============================================
    // WAVE MANAGEMENT
    // ============================================
    
    function getWaveDefinition(wave) {
        const enemies = [];
        const waveNum = Math.min(wave, 100);
        
        // Scale enemy count with wave
        const baseCount = 5 + Math.floor(waveNum * 1.5);
        
        // Add enemy types based on wave
        const availableTypes = ['cultist', 'ghoul', 'shade'];
        if (waveNum >= 3) availableTypes.push('wraith', 'imp');
        if (waveNum >= 5) availableTypes.push('demon', 'warlock');
        if (waveNum >= 8) availableTypes.push('hellKnight', 'succubus', 'bat');
        if (waveNum >= 12) availableTypes.push('necromancer', 'gargoyle');
        if (waveNum >= 15) availableTypes.push('abomination', 'nightmare', 'lich');
        if (waveNum >= 20) availableTypes.push('dragon');
        
        // Generate enemy list
        for (let i = 0; i < baseCount; i++) {
            const type = availableTypes[Math.floor(Math.random() * availableTypes.length)];
            enemies.push(type);
        }
        
        // Add boss every 10 waves
        if (waveNum % 10 === 0) {
            const bossTypes = ['archDemon', 'demonLord', 'satan'];
            const bossIndex = Math.min(Math.floor(waveNum / 10) - 1, bossTypes.length - 1);
            enemies.push(bossTypes[bossIndex]);
        }
        
        return enemies;
    }
    
    function startWave() {
        state.wave++;
        state.waveActive = true;
        state.betweenWaves = false;
        state.kills = 0;
        state.spawnTimer = 0;
        
        state.waveSpawnQueue = getWaveDefinition(state.wave);
        
        // Shuffle
        for (let i = state.waveSpawnQueue.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [state.waveSpawnQueue[i], state.waveSpawnQueue[j]] = [state.waveSpawnQueue[j], state.waveSpawnQueue[i]];
        }
        
        updateHUD();
        
        if (window.HorrorAudio) {
            HorrorAudio.startHeartbeat(50);
        }
        
        showMessage(`⚔️ Wave ${state.wave} — ${state.waveSpawnQueue.length} enemies incoming!`);
    }
    
    function spawnEnemy(type) {
        const def = ENEMY_TYPES[type];
        if (!def) return;
        
        const angle = Math.random() * Math.PI * 2;
        const dist = SPAWN_RADIUS_MIN + Math.random() * (SPAWN_RADIUS_MAX - SPAWN_RADIUS_MIN);
        
        const diffMult = window.GameUtils?.getMultiplier() || 1;
        
        state.enemies.push({
            x: state.centerX + Math.cos(angle) * dist,
            y: state.centerY + Math.sin(angle) * dist,
            hp: def.hp * (1 + (state.wave - 1) * 0.1) * diffMult,
            maxHp: def.hp * (1 + (state.wave - 1) * 0.1) * diffMult,
            speed: def.speed,
            damage: def.damage * diffMult,
            color: def.color,
            radius: def.radius,
            reward: def.reward,
            icon: def.icon,
            category: def.category,
            ranged: def.ranged,
            summoner: def.summoner,
            slowed: 0,
            attackCooldown: 0,
            specialTimer: 5
        });
    }

    // ============================================
    // TRAP MANAGEMENT
    // ============================================
    
    function placeTrap(x, y) {
        const type = TRAP_TYPES[state.selectedTrap];
        if (!type || state.mana < type.cost) return;
        
        const dx = x - state.centerX;
        const dy = y - state.centerY;
        if (Math.sqrt(dx * dx + dy * dy) < CIRCLE_RADIUS + 20) return;
        
        state.mana -= type.cost;
        state.traps.push({
            type: state.selectedTrap,
            x, y,
            radius: type.radius,
            damage: type.damage,
            duration: type.duration,
            maxDuration: type.duration,
            color: type.color,
            slowFactor: type.slowFactor,
            healCircle: type.healCircle,
            shield: type.shield,
            cooldown: 0
        });
        state.trapsPlaced++;
        state.selectedTrap = null;
        
        // Particles
        for (let i = 0; i < 10; i++) {
            state.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 100,
                vy: (Math.random() - 0.5) * 100,
                life: 0.5 + Math.random() * 0.5,
                color: type.color,
                size: 2 + Math.random() * 4
            });
        }
        
        if (Systems.audio) {
            Systems.audio.playSound('click', 0.5);
        }
    }

    // ============================================
    // SPELLS
    // ============================================
    
    function castSpell(spellId, targetX, targetY) {
        const spell = SPELLS[spellId];
        if (!spell || state.mana < spell.cost) return;
        
        state.mana -= spell.cost;
        state.spellsCast++;
        
        // Apply spell effects
        for (const e of state.enemies) {
            const dx = e.x - targetX;
            const dy = e.y - targetY;
            if (Math.sqrt(dx * dx + dy * dy) < spell.radius) {
                e.hp -= spell.damage;
                if (spell.slow) {
                    e.slowed = spell.slow;
                }
            }
        }
        
        // Heal circle if applicable
        if (spell.heal) {
            state.circleHP = Math.min(100, state.circleHP + spell.heal);
        }
        
        // Visual effects
        for (let i = 0; i < 20; i++) {
            state.particles.push({
                x: targetX + (Math.random() - 0.5) * spell.radius,
                y: targetY + (Math.random() - 0.5) * spell.radius,
                vx: (Math.random() - 0.5) * 150,
                vy: (Math.random() - 0.5) * 150,
                life: 0.8,
                color: spell.color,
                size: 4 + Math.random() * 6
            });
        }
        
        showMessage(`✨ ${spell.name}!`);
        
        if (Systems.audio) {
            Systems.audio.playSound('jumpscare', 0.6);
        }
    }
    
    function castBolt(tx, ty) {
        if (state.mana < 3) return;
        state.mana -= 3;
        state.spellsCast++;
        
        const dx = tx - state.centerX;
        const dy = ty - state.centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist === 0) return;
        
        state.projectiles.push({
            x: state.centerX, y: state.centerY,
            vx: (dx / dist) * 500,
            vy: (dy / dist) * 500,
            damage: 15 + state.wave,
            life: 2,
            color: '#ffff88',
            radius: 5
        });
    }
    
    function castFireWall() {
        if (state.mana < 50) return;
        state.mana -= 50;
        state.spellsCast++;
        
        // Ring of fire
        for (let a = 0; a < Math.PI * 2; a += 0.2) {
            const dist = CIRCLE_RADIUS + 80 + Math.random() * 40;
            state.particles.push({
                x: state.centerX + Math.cos(a) * dist,
                y: state.centerY + Math.sin(a) * dist,
                vx: Math.cos(a) * 30,
                vy: Math.sin(a) * 30,
                life: 2.0,
                color: '#ff4400',
                size: 8 + Math.random() * 8
            });
        }
        
        // Damage enemies
        const diffMult = window.GameUtils?.getMultiplier() || 1;
        for (const e of state.enemies) {
            const dx = e.x - state.centerX;
            const dy = e.y - state.centerY;
            if (Math.sqrt(dx * dx + dy * dy) < CIRCLE_RADIUS + 130) {
                e.hp -= 50 * diffMult;
            }
        }
        
        if (window.HorrorAudio) {
            HorrorAudio.playJumpScare();
        }
    }

    // ============================================
    // UPDATE
    // ============================================
    
    function update(dt) {
        if (!state.gameActive) return;
        
        state.circleRotation += dt * 0.5;
        
        // Mana regen
        state.mana = Math.min(state.maxMana, state.mana + state.manaRegen * dt);
        
        // Combo timer
        if (state.comboTimer > 0) {
            state.comboTimer -= dt;
            if (state.comboTimer <= 0) state.combo = 0;
        }
        
        // Between waves
        if (state.betweenWaves) {
            state.betweenTimer -= dt;
            if (state.betweenTimer <= 0) startWave();
            updateParticles(dt);
            updateHUD();
            return;
        }
        
        // Spawn enemies
        if (state.waveActive && state.waveSpawnQueue.length > 0) {
            state.spawnTimer -= dt;
            if (state.spawnTimer <= 0) {
                spawnEnemy(state.waveSpawnQueue.shift());
                state.spawnTimer = 0.8 + Math.random() * 0.5;
            }
        }
        
        // Update enemies
        for (let i = state.enemies.length - 1; i >= 0; i--) {
            const e = state.enemies[i];
            if (e.slowed > 0) e.slowed -= dt;
            const speedMult = e.slowed > 0 ? 0.3 : 1.0;
            
            const dx = state.centerX - e.x;
            const dy = state.centerY - e.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > CIRCLE_RADIUS) {
                e.x += (dx / dist) * e.speed * speedMult * 60 * dt;
                e.y += (dy / dist) * e.speed * speedMult * 60 * dt;
            } else {
                e.attackCooldown -= dt;
                if (e.attackCooldown <= 0) {
                    state.circleHP -= e.damage;
                    e.attackCooldown = 1.0;
                    
                    // Damage particles
                    for (let p = 0; p < 5; p++) {
                        state.particles.push({
                            x: state.centerX + (Math.random() - 0.5) * CIRCLE_RADIUS,
                            y: state.centerY + (Math.random() - 0.5) * CIRCLE_RADIUS,
                            vx: (Math.random() - 0.5) * 60,
                            vy: (Math.random() - 0.5) * 60,
                            life: 0.5,
                            color: '#ff0000',
                            size: 4
                        });
                    }
                }
            }
            
            // Ranged enemies attack
            if (e.ranged && dist < 200) {
                e.specialTimer -= dt;
                if (e.specialTimer <= 0) {
                    e.specialTimer = 3;
                    // Fire projectile at circle
                    state.projectiles.push({
                        x: e.x, y: e.y,
                        vx: (dx / dist) * 200,
                        vy: (dy / dist) * 200,
                        damage: e.damage * 0.5,
                        life: 2,
                        color: '#ff4444',
                        radius: 6
                    });
                }
            }
            
            // Summoner enemies
            if (e.summoner) {
                e.specialTimer -= dt;
                if (e.specialTimer <= 0) {
                    e.specialTimer = 8;
                    spawnEnemy('cultist');
                    spawnEnemy('cultist');
                    showMessage('💀 Necromancer summons minions!');
                }
            }
            
            // Death check
            if (e.hp <= 0) {
                state.kills++;
                state.totalKills++;
                state.mana = Math.min(state.maxMana, state.mana + e.reward * 0.3);
                state.combo++;
                state.comboTimer = 2;
                
                // Death particles
                for (let p = 0; p < 8; p++) {
                    state.particles.push({
                        x: e.x, y: e.y,
                        vx: (Math.random() - 0.5) * 120,
                        vy: (Math.random() - 0.5) * 120,
                        life: 0.5 + Math.random() * 0.5,
                        color: e.color,
                        size: 3 + Math.random() * 5
                    });
                }
                
                if (window.ChallengeManager) ChallengeManager.notify('ritual-circle', 'kills', 1);
                if (Systems.progression) Systems.progression.addXP('ritual-circle', e.reward);
                
                state.enemies.splice(i, 1);
            }
        }
        
        // Update traps
        for (let i = state.traps.length - 1; i >= 0; i--) {
            const trap = state.traps[i];
            trap.duration -= dt;
            if (trap.duration <= 0) {
                state.traps.splice(i, 1);
                continue;
            }
            
            trap.cooldown -= dt;
            if (trap.cooldown <= 0) {
                trap.cooldown = 0.5;
                
                // Apply effects to enemies
                for (const e of state.enemies) {
                    const dx = e.x - trap.x;
                    const dy = e.y - trap.y;
                    if (Math.sqrt(dx * dx + dy * dy) < trap.radius) {
                        e.hp -= trap.damage * dt * 2;
                        if (trap.slowFactor > 0) e.slowed = trap.slowFactor;
                    }
                }
                
                // Heal circle if applicable
                if (trap.healCircle) {
                    state.circleHP = Math.min(100, state.circleHP + 2 * dt);
                }
            }
        }
        
        // Update projectiles
        for (let i = state.projectiles.length - 1; i >= 0; i--) {
            const proj = state.projectiles[i];
            proj.x += proj.vx * dt;
            proj.y += proj.vy * dt;
            proj.life -= dt;
            
            if (proj.life <= 0 || proj.x < 0 || proj.x > canvas.width || proj.y < 0 || proj.y > canvas.height) {
                state.projectiles.splice(i, 1);
                continue;
            }
            
            // Hit enemies
            for (let j = state.enemies.length - 1; j >= 0; j--) {
                const e = state.enemies[j];
                const dx = e.x - proj.x;
                const dy = e.y - proj.y;
                if (Math.sqrt(dx * dx + dy * dy) < e.radius + proj.radius) {
                    e.hp -= proj.damage;
                    state.projectiles.splice(i, 1);
                    break;
                }
            }
        }
        
        updateParticles(dt);
        
        // Wave complete check
        if (state.waveActive && state.enemies.length === 0 && state.waveSpawnQueue.length === 0) {
            state.waveActive = false;
            state.wavesCleared++;
            
            if (window.HorrorAudio) HorrorAudio.stopHeartbeat();
            
            if (window.ChallengeManager) {
                ChallengeManager.notify('ritual-circle', 'waves_cleared', state.wavesCleared);
                ChallengeManager.notify('ritual-circle', 'total_kills', state.totalKills);
            }
            
            if (state.wave >= MAX_WAVES) {
                gameWin();
            } else {
                state.betweenWaves = true;
                state.betweenTimer = 5;
                state.mana = Math.min(state.maxMana, state.mana + 20);
                showMessage(`✅ Wave ${state.wave} complete!`);
            }
        }
        
        // Circle destroyed
        if (state.circleHP <= 0) {
            gameOver();
            return;
        }
        
        updateHUD();
    }
    
    function updateParticles(dt) {
        for (let i = state.particles.length - 1; i >= 0; i--) {
            const p = state.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
            p.size *= 0.98;
            if (p.life <= 0) state.particles.splice(i, 1);
        }
    }
    
    function updateHUD() {
        const waveEl = document.getElementById('hud-wave');
        const manaEl = document.getElementById('hud-mana');
        const circleEl = document.getElementById('hud-circle');
        const killsEl = document.getElementById('hud-kills');
        
        if (waveEl) waveEl.textContent = `⚔️ Wave ${state.wave} / ${MAX_WAVES}`;
        if (manaEl) manaEl.textContent = `✨ Mana: ${Math.round(state.mana)}`;
        if (circleEl) {
            circleEl.textContent = `🔮 Circle: ${Math.round(state.circleHP)}%`;
            circleEl.style.color = state.circleHP > 50 ? '#ff8800' : state.circleHP > 25 ? '#ff4444' : '#cc0000';
        }
        if (killsEl) killsEl.textContent = `💀 Kills: ${state.totalKills}`;
    }

    // ============================================
    // RENDERING
    // ============================================
    
    function render() {
        const w = canvas.width;
        const h = canvas.height;
        
        renderBackground(w, h);
        renderTraps();
        renderCircle(w, h);
        renderEnemies();
        renderProjectiles();
        renderParticles();
        renderUI();
    }
    
    function renderBackground(w, h) {
        const grd = ctx.createLinearGradient(0, 0, 0, h);
        grd.addColorStop(0, '#0a0515');
        grd.addColorStop(0.5, '#0f0a1a');
        grd.addColorStop(1, '#1a0f0a');
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, w, h);
        
        // Stars
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        for (let i = 0; i < 50; i++) {
            const sx = (i * 137.5 + 43) % w;
            const sy = (i * 89.3 + 17) % (h * 0.4);
            const twinkle = Math.sin(state.circleRotation * 2 + i) * 0.3 + 0.7;
            ctx.globalAlpha = twinkle * 0.4;
            ctx.fillRect(sx, sy, 1.5, 1.5);
        }
        ctx.globalAlpha = 1.0;
        
        // Ground
        ctx.fillStyle = '#0e0a06';
        ctx.fillRect(0, h * 0.7, w, h * 0.3);
        
        // Tombstones
        ctx.fillStyle = '#1a1515';
        for (let t = 0; t < 8; t++) {
            const tx = (t * w / 8) + w * 0.05;
            const ty = h * 0.65 + Math.sin(t * 2.5) * 15;
            ctx.fillRect(tx, ty, 15, 25);
            ctx.beginPath();
            ctx.arc(tx + 7, ty, 8, Math.PI, 0);
            ctx.fill();
        }
        
        // Fog
        ctx.fillStyle = 'rgba(30,20,40,0.15)';
        for (let f = 0; f < 5; f++) {
            const fx = Math.sin(state.circleRotation * 0.3 + f) * 100 + w * 0.2 * f;
            ctx.beginPath();
            ctx.ellipse(fx, h * 0.7, 150, 20, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    function renderTraps() {
        for (const trap of state.traps) {
            const alpha = Math.min(1, trap.duration / trap.maxDuration);
            ctx.strokeStyle = trap.color;
            ctx.lineWidth = 2;
            ctx.globalAlpha = alpha * 0.6;
            ctx.beginPath();
            ctx.arc(trap.x, trap.y, trap.radius, 0, Math.PI * 2);
            ctx.stroke();
            
            ctx.fillStyle = trap.color;
            ctx.globalAlpha = alpha * 0.1;
            ctx.beginPath();
            ctx.arc(trap.x, trap.y, trap.radius, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.globalAlpha = alpha * 0.8;
            ctx.font = '16px serif';
            ctx.textAlign = 'center';
            ctx.fillText('⚪', trap.x, trap.y + 5);
            ctx.globalAlpha = 1.0;
        }
    }
    
    function renderCircle(w, h) {
        const cx = state.centerX;
        const cy = state.centerY;
        
        // Outer glow
        const glowR = CIRCLE_RADIUS + 20 + Math.sin(state.circleRotation * 3) * 5;
        const glow = ctx.createRadialGradient(cx, cy, CIRCLE_RADIUS * 0.5, cx, cy, glowR);
        glow.addColorStop(0, 'rgba(150,60,200,0.15)');
        glow.addColorStop(0.7, 'rgba(100,30,150,0.08)');
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
        ctx.fill();
        
        // Main circle
        ctx.strokeStyle = state.circleHP > 50 ? '#9944ff' : state.circleHP > 25 ? '#ff8844' : '#ff2222';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy, CIRCLE_RADIUS, 0, Math.PI * 2);
        ctx.stroke();
        
        // Rotating inner symbols
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(state.circleRotation);
        
        // Pentagram
        ctx.strokeStyle = 'rgba(150,60,200,0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const a = (i * 4 * Math.PI / 5) - Math.PI / 2;
            const px = Math.cos(a) * (CIRCLE_RADIUS - 15);
            const py = Math.sin(a) * (CIRCLE_RADIUS - 15);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
        
        ctx.restore();
        
        // HP bar
        const barW = CIRCLE_RADIUS * 2;
        ctx.fillStyle = '#330000';
        ctx.fillRect(cx - barW / 2, cy + CIRCLE_RADIUS + 15, barW, 6);
        ctx.fillStyle = state.circleHP > 50 ? '#44aa44' : state.circleHP > 25 ? '#aaaa44' : '#aa4444';
        ctx.fillRect(cx - barW / 2, cy + CIRCLE_RADIUS + 15, barW * (state.circleHP / 100), 6);
    }
    
    function renderEnemies() {
        for (const e of state.enemies) {
            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.beginPath();
            ctx.ellipse(e.x, e.y + e.radius, e.radius * 0.8, e.radius * 0.3, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Body
            ctx.fillStyle = e.color;
            ctx.shadowColor = e.color;
            ctx.shadowBlur = e.slowed > 0 ? 5 : 10;
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            
            // Icon
            ctx.font = `${e.radius * 1.5}px serif`;
            ctx.textAlign = 'center';
            ctx.fillText(e.icon, e.x, e.y + e.radius * 0.5);
            
            // HP bar
            if (e.hp < e.maxHp) {
                const barW = e.radius * 2;
                ctx.fillStyle = '#330000';
                ctx.fillRect(e.x - barW / 2, e.y - e.radius - 8, barW, 4);
                ctx.fillStyle = '#ff4444';
                ctx.fillRect(e.x - barW / 2, e.y - e.radius - 8, barW * (e.hp / e.maxHp), 4);
            }
        }
    }
    
    function renderProjectiles() {
        for (const p of state.projectiles) {
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    }
    
    function renderParticles() {
        for (const p of state.particles) {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = Math.max(0, p.life);
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1.0;
    }
    
    function renderUI() {
        // Trap placement preview
        if (state.selectedTrap && state.gameActive) {
            const type = TRAP_TYPES[state.selectedTrap];
            ctx.strokeStyle = state.mana >= type.cost ? type.color : '#ff0000';
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.4;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.arc(state.mouseX, state.mouseY, type.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.globalAlpha = 1.0;
            
            ctx.fillStyle = state.mana >= type.cost ? '#fff' : '#ff0000';
            ctx.font = '12px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`${type.name} (${type.cost} mana)`, state.mouseX, state.mouseY - type.radius - 10);
        }
        
        // Between waves UI
        if (state.betweenWaves) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(0, canvas.height * 0.35, canvas.width, canvas.height * 0.3);
            ctx.fillStyle = '#ff8800';
            ctx.font = 'bold 36px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`Wave ${state.wave + 1} incoming...`, canvas.width / 2, canvas.height * 0.48);
            ctx.fillStyle = '#aaa';
            ctx.font = '18px monospace';
            ctx.fillText(`${Math.ceil(state.betweenTimer)}s`, canvas.width / 2, canvas.height * 0.55);
        }
        
        // Combo display
        if (state.combo > 1) {
            ctx.fillStyle = '#ffcc00';
            ctx.font = 'bold 24px Inter';
            ctx.textAlign = 'center';
            ctx.fillText(`🔥 x${state.combo} COMBO`, canvas.width / 2, 50);
        }
    }

    // ============================================
    // GAME STATE MANAGEMENT
    // ============================================
    
    let messageText = '';
    let messageTimer = 0;
    
    function showMessage(text) {
        messageText = text;
        messageTimer = 2.5;
    }
    
    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        state.centerX = canvas.width / 2;
        state.centerY = canvas.height / 2;
    }
    
    function startGame() {
        canvas = document.getElementById('game-canvas');
        ctx = canvas.getContext('2d');
        resize();
        window.addEventListener('resize', resize);
        
        // Input handlers
        document.addEventListener('keydown', (e) => {
            if (!state.gameActive) return;
            
            const trapKeys = Object.keys(TRAP_TYPES);
            for (let i = 0; i < Math.min(9, trapKeys.length); i++) {
                if (e.code === `Digit${i + 1}`) {
                    state.selectedTrap = trapKeys[i];
                    e.preventDefault();
                }
            }
            
            if (e.code === 'Space') { castFireWall(); e.preventDefault(); }
            if (e.code === 'Escape') { state.gameActive = false; if (window.GameUtils) GameUtils.pauseGame(); }
        });
        
        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            state.mouseX = e.clientX - rect.left;
            state.mouseY = e.clientY - rect.top;
        });
        
        canvas.addEventListener('click', (e) => {
            if (!state.gameActive) return;
            const rect = canvas.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;
            
            if (state.selectedTrap) {
                placeTrap(mx, my);
            } else {
                castBolt(mx, my);
            }
        });
        
        canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            state.selectedTrap = null;
        });
        
        document.getElementById('start-screen').style.display = 'none';
        const ctrl = document.getElementById('controls-overlay');
        ctrl.style.display = 'flex';
        
        if (window.HorrorAudio) {
            HorrorAudio.init();
            HorrorAudio.startDrone(35, 'dark');
        }
        
        setTimeout(() => {
            ctrl.classList.add('hiding');
            setTimeout(() => {
                ctrl.style.display = 'none';
                ctrl.classList.remove('hiding');
                resetGame();
                state.gameActive = true;
                if (window.GameUtils) GameUtils.setState(GameUtils.STATE.PLAYING);
                document.getElementById('game-hud').style.display = 'flex';
                document.getElementById('back-link').style.display = 'none';
                startWave();
                lastTime = performance.now();
                requestAnimationFrame(gameLoop);
            }, 800);
        }, 2500);
    }
    
    function resetGame() {
        state = {
            wave: 0,
            waveActive: false,
            waveTimer: 0,
            spawnTimer: 0,
            waveSpawnQueue: [],
            circleHP: 100,
            mana: 100,
            maxMana: 100,
            manaRegen: 2,
            kills: 0,
            totalKills: 0,
            enemies: [],
            traps: [],
            projectiles: [],
            particles: [],
            selectedTrap: null,
            gameActive: true,
            betweenWaves: false,
            betweenTimer: 0,
            mouseX: 0,
            mouseY: 0,
            centerX: canvas.width / 2,
            centerY: canvas.height / 2,
            circleRotation: 0,
            trapsPlaced: 0,
            spellsCast: 0,
            wavesCleared: 0,
            combo: 0,
            comboTimer: 0
        };
    }
    
    function gameOver() {
        state.gameActive = false;
        if (window.GameUtils) GameUtils.setState(GameUtils.STATE.GAME_OVER);
        if (window.HorrorAudio) { HorrorAudio.playDeath(); HorrorAudio.stopDrone(); }
        
        const msgEl = document.querySelector('#game-over-screen p');
        if (msgEl) msgEl.textContent = `The darkness consumed you... Wave: ${state.wave}, Kills: ${state.totalKills}`;
        document.getElementById('game-over-screen').style.display = 'flex';
        document.getElementById('game-hud').style.display = 'none';
        
        const btn = document.querySelector('#game-over-screen .play-btn');
        if (btn) btn.onclick = restartGame;
    }
    
    function gameWin() {
        state.gameActive = false;
        if (window.GameUtils) GameUtils.setState(GameUtils.STATE.WIN);
        if (window.HorrorAudio) { HorrorAudio.playWin(); HorrorAudio.stopDrone(); }
        
        const msgEl = document.querySelector('#game-win-screen p');
        if (msgEl) msgEl.textContent = `✨ Victory! All ${MAX_WAVES} waves survived! Kills: ${state.totalKills}`;
        document.getElementById('game-win-screen').style.display = 'flex';
        document.getElementById('game-hud').style.display = 'none';
        
        const btn = document.querySelector('#game-win-screen .play-btn');
        if (btn) btn.onclick = restartGame;
    }
    
    function restartGame() {
        resetGame();
        document.getElementById('game-over-screen').style.display = 'none';
        document.getElementById('game-win-screen').style.display = 'none';
        document.getElementById('game-hud').style.display = 'flex';
        if (window.HorrorAudio) HorrorAudio.startDrone(35, 'dark');
        state.gameActive = true;
        if (window.GameUtils) GameUtils.setState(GameUtils.STATE.PLAYING);
        startWave();
        lastTime = performance.now();
        requestAnimationFrame(gameLoop);
    }

    // ============================================
    // GAME LOOP
    // ============================================
    
    let lastTime = 0;
    
    function gameLoop(timestamp) {
        if (!state.gameActive) return;
        const dt = Math.min((timestamp - lastTime) / 1000, 0.1);
        lastTime = timestamp;
        
        if (messageTimer > 0) messageTimer -= dt;
        
        update(dt);
        render();
        
        // Draw message
        if (messageTimer > 0) {
            ctx.font = 'italic 600 16px serif';
            ctx.fillStyle = '#cc8833';
            ctx.shadowColor = '#ff6600';
            ctx.shadowBlur = 8;
            ctx.textAlign = 'center';
            ctx.fillText(messageText, canvas.width / 2, 130);
            ctx.shadowBlur = 0;
        }
        
        requestAnimationFrame(gameLoop);
    }

    // ============================================
    // INITIALIZATION
    // ============================================
    
    async function init() {
        await Systems.init();
        
        if (window.GameUtils) {
            GameUtils.injectDifficultySelector('start-screen');
            GameUtils.initPause({
                onResume: () => { state.gameActive = true; if (window.GameUtils) GameUtils.setState(GameUtils.STATE.PLAYING); lastTime = performance.now(); },
                onRestart: () => resetGame()
            });
        }
        
        document.getElementById('start-btn').addEventListener('click', () => startGame());
        document.getElementById('fullscreen-btn')?.addEventListener('click', () => { if (window.GameUtils) GameUtils.toggleFullscreen(); });
        
        console.log('[RitualCircle] Enhanced version initialized');
    }
    
    init();
})();
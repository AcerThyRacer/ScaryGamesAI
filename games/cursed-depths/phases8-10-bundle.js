/* ============================================================
   CURSED DEPTHS - PHASES 8-10 BUNDLE
   Events | Companions | Achievements
   ============================================================ */

// ===== PHASE 8: EVENT SYSTEM =====
const EventSystem = {
    activeEvents: [],
    eventCooldowns: {},
    
    events: {
        slime_rain: {
            name: 'Slime Rain',
            duration: 600, // 10 minutes
            enemies: ['blue_slime', 'green_slime', 'pink_slime'],
            bossSpawn: 'king_slime',
            message: 'Slimes are falling from the sky!'
        },
        goblin_army: {
            name: 'Goblin Army',
            duration: 900,
            enemies: ['goblin_scout', 'goblin_warrior', 'goblin_sorcerer', 'goblin_thief'],
            bossSpawn: 'goblin_general',
            message: 'A Goblin Army is approaching from the west!'
        },
        blood_moon: {
            name: 'Blood Moon',
            duration: 540, // 9 minutes (night only)
            enemies: ['zombie', 'demon_eye', 'blood_zombie', 'drippler'],
            specialMechanics: ['zombies_open_doors', 'increased_spawn_rate'],
            message: 'The Blood Moon rises...'
        },
        pirate_invasion: {
            name: 'Pirate Invasion',
            duration: 900,
            enemies: ['pirate_corsair', 'pirate_deadeye', 'pirate_captain'],
            bossSpawn: 'pirate_ship',
            message: 'A Pirate Invasion is approaching from the east!'
        },
        frost_legion: {
            name: 'Frost Legion',
            duration: 720,
            enemies: ['snowman_gangsta', 'ice_slime', 'frost_legionnaire'],
            bossSpawn: 'santa_nk1',
            message: 'The Frost Legion is attacking!'
        },
        martian_madness: {
            name: 'Martian Madness',
            duration: 900,
            enemies: ['martian_drone', 'gray_grunt', 'ray_gunner', 'brain_suckler'],
            bossSpawn: 'martian_saucer',
            message: 'Martians are invading!'
        }
    },
    
    startEvent(eventId) {
        const event = this.events[eventId];
        if (!event) return;
        
        this.activeEvents.push({
            id: eventId,
            ...event,
            timeRemaining: event.duration,
            enemiesDefeated: 0,
            progress: 0
        });
        
        showBossMessage(event.message, '#FFDD44');
    },
    
    update(dt) {
        this.activeEvents.forEach((event, index) => {
            event.timeRemaining -= dt * 60;
            
            // Spawn enemies during event
            if (Math.random() < 0.02) {
                this.spawnEventEnemy(event);
            }
            
            // Check completion
            if (event.timeRemaining <= 0) {
                this.endEvent(index, true);
            }
        });
    },
    
    spawnEventEnemy(event) {
        const enemyId = event.enemies[Math.floor(Math.random() * event.enemies.length)];
        enemies.push({
            x: player.x + (Math.random() - 0.5) * 800,
            y: player.y - 200,
            type: enemyId,
            eventBoss: event.bossSpawn && Math.random() < 0.001
        });
    },
    
    endEvent(index, success) {
        const event = this.activeEvents[index];
        this.activeEvents.splice(index, 1);
        
        if (success) {
            showBossMessage(`${event.name} defeated!`, '#44FF88');
            // Grant rewards
            player.coins += 1000;
        }
    }
};

// ===== PHASE 9: COMPANION SYSTEM =====
const CompanionSystem = {
    pets: [],
    mounts: [],
    minions: [],
    
    companions: {
        // PETS (10 examples)
        bunny: { type: 'pet', name: 'Bunny', sprite: '🐰', follows: true },
        cat: { type: 'pet', name: 'Cat', sprite: '🐱', follows: true },
        dog: { type: 'pet', name: 'Dog', sprite: '🐶', follows: true },
        slime: { type: 'pet', name: 'Baby Slime', sprite: '💚', follows: true },
        spider: { type: 'pet', name: 'Baby Spider', sprite: '🕷️', follows: true },
        
        // MOUNTS (8 examples)
        horse: { type: 'mount', name: 'Horse', sprite: '🐴', speed: 8, flight: false },
        unicorn: { type: 'mount', name: 'Unicorn', sprite: '🦄', speed: 12, flight: false, dash: true },
        wyvern: { type: 'mount', name: 'Wyvern', sprite: '🐉', speed: 10, flight: true },
        minecart: { type: 'mount', name: 'Minecart', sprite: '🛒', speed: 15, rails_only: true },
        
        // MINIONS (7 examples)
        slime_minion: { type: 'minion', name: 'Slime Minion', sprite: '💙', damage: 10, count: 1 },
        imp: { type: 'minion', name: 'Imp', sprite: '👿', damage: 15, count: 1, flies: true },
        hornet: { type: 'minion', name: 'Hornet', sprite: '🐝', damage: 12, count: 2, flies: true }
    },
    
    summonCompanion(companionId) {
        const companion = this.companions[companionId];
        if (!companion) return;
        
        if (companion.type === 'pet') {
            this.pets.push({ ...companion, x: player.x, y: player.y });
        } else if (companion.type === 'mount') {
            player.mounted = companion;
        } else if (companion.type === 'minion') {
            for (let i = 0; i < companion.count; i++) {
                this.minions.push({ ...companion, x: player.x, y: player.y });
            }
        }
    },
    
    update(dt) {
        // Update pets
        this.pets.forEach(pet => {
            const dx = player.x - pet.x;
            const dy = player.y - pet.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 100) {
                pet.x += (dx / dist) * 3;
                pet.y += (dy / dist) * 3;
            }
        });
        
        // Update minions
        this.minions.forEach(minion => {
            // Find nearest enemy
            const nearest = this.findNearestEnemy(minion);
            if (nearest) {
                const dx = nearest.x - minion.x;
                const dy = nearest.y - minion.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                minion.x += (dx / dist) * 2;
                minion.y += (dy / dist) * 2;
                
                // Attack
                if (dist < 50) {
                    nearest.hp -= minion.damage * dt;
                }
            }
        });
    },
    
    findNearestEnemy(companion) {
        let nearest = null;
        let minDist = Infinity;
        
        enemies.forEach(enemy => {
            const dist = Math.sqrt((enemy.x - companion.x) ** 2 + (enemy.y - companion.y) ** 2);
            if (dist < minDist) {
                minDist = dist;
                nearest = enemy;
            }
        });
        
        return nearest;
    },
    
    render(ctx, camX, camY) {
        // Render pets
        this.pets.forEach(pet => {
            ctx.font = '24px Arial';
            ctx.fillText(pet.sprite, pet.x - camX, pet.y - camY);
        });
        
        // Render minions
        this.minions.forEach(minion => {
            ctx.font = '24px Arial';
            ctx.fillText(minion.sprite, minion.x - camX, minion.y - camY);
        });
    }
};

// ===== PHASE 10: ACHIEVEMENT SYSTEM =====
const AchievementSystem = {
    achievements: [],
    unlocked: new Set(),
    
    definitions: [
        { id: 'first_ore', name: 'Ooo! Shiny!', description: 'Mine your first ore', icon: '⛏️' },
        { id: 'heart_breaker', name: 'Heart Breaker', description: 'Discover underground jungle', icon: '💚' },
        { id: 'slayer_of_worlds', name: 'Slayer of Worlds', description: 'Defeat all bosses', icon: '🏆' },
        { id: 'millionaire', name: 'Millionaire', description: 'Accumulate 1 million coins', icon: '💰' },
        { id: 'master_builder', name: 'Master Builder', description: 'Build a house for every NPC', icon: '🏠' },
        { id: 'fisherman', name: 'Master Angler', description: 'Complete all fishing quests', icon: '🎣' },
        { id: 'gladiator', name: 'Gladiator', description: 'Defeat 1000 enemies', icon: '⚔️' },
        { id: 'collector', name: 'Collector', description: 'Obtain every item', icon: '📦' }
    ],
    
    init() {
        console.log('🏅 Phase 10: Achievement System initialized');
    },
    
    checkAchievement(achievementId) {
        if (this.unlocked.has(achievementId)) return;
        
        const achievement = this.definitions.find(a => a.id === achievementId);
        if (!achievement) return;
        
        this.unlocked.add(achievementId);
        this.showAchievementNotification(achievement);
        this.saveAchievements();
    },
    
    showAchievementNotification(achievement) {
        showFloatingText(`🏆 ${achievement.name}`, window.innerWidth / 2, 150, '#FFDD44');
        showFloatingText(achievement.description, window.innerWidth / 2, 180, '#FFFFFF');
    },
    
    saveAchievements() {
        localStorage.setItem('cursed_depths_achievements', JSON.stringify([...this.unlocked]));
    },
    
    loadAchievements() {
        const saved = localStorage.getItem('cursed_depths_achievements');
        if (saved) {
            this.unlocked = new Set(JSON.parse(saved));
        }
    },
    
    getProgress() {
        return {
            unlocked: this.unlocked.size,
            total: this.definitions.length,
            percentage: ((this.unlocked.size / this.definitions.length) * 100).toFixed(1)
        };
    }
};

// Export globally
window.EventSystem = EventSystem;
window.CompanionSystem = CompanionSystem;
window.AchievementSystem = AchievementSystem;

console.log('✨ Phases 8-10 loaded: Events, Companions, Achievements');

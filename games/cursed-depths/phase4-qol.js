/* ============================================================
   CURSED DEPTHS - PHASE 4: QUALITY OF LIFE FEATURES
   Mini-Map | Quest Tracker | Buff Bar | UI Improvements
   ============================================================ */

// ===== QOL SYSTEM =====
const QoLFeatures = {
    // Mini-map system
    miniMap: {
        enabled: true,
        zoom: 1,
        size: 200,
        position: { x: 20, y: 20 },
        icons: [],
        biomeColors: {
            forest: '#2D5A1E',
            desert: '#C2A645',
            snow: '#AADDFF',
            jungle: '#1A6B1A',
            corruption: '#330022',
            crimson: '#6B1020',
            hallow: '#EEDDFF',
            caves: '#666666'
        }
    },
    
    // Quest tracker
    questTracker: {
        quests: [],
        position: { x: 220, y: 20 },
        maxWidth: 250
    },
    
    // Buff/debuff bar
    buffBar: {
        buffs: [],
        position: { x: 20, y: 240 },
        slotSize: 40
    },
    
    // Achievement notifications
    achievements: {
        queue: [],
        position: { x: window.innerWidth - 320, y: 80 }
    },
    
    init() {
        console.log('✨ Phase 4: QoL Features initialized');
        this.setupUI();
        this.loadQuests();
    },
    
    setupUI() {
        // Create mini-map canvas
        const minimapCanvas = document.createElement('canvas');
        minimapCanvas.id = 'minimap';
        minimapCanvas.width = this.miniMap.size;
        minimapCanvas.height = this.miniMap.size;
        minimapCanvas.style.cssText = `
            position: absolute;
            left: ${this.miniMap.position.x}px;
            top: ${this.miniMap.position.y}px;
            border: 2px solid #444;
            border-radius: 50%;
            background: rgba(0,0,0,0.5);
        `;
        document.getElementById('game-container').appendChild(minimapCanvas);
        
        // Create quest tracker div
        const questDiv = document.createElement('div');
        questDiv.id = 'quest-tracker';
        questDiv.style.cssText = `
            position: absolute;
            left: ${this.questTracker.position.x}px;
            top: ${this.questTracker.position.y}px;
            width: ${this.questTracker.maxWidth}px;
            background: rgba(0,0,0,0.6);
            padding: 10px;
            border-radius: 5px;
            color: white;
            font-family: Inter, sans-serif;
            font-size: 12px;
            max-height: 300px;
            overflow-y: auto;
        `;
        document.getElementById('game-container').appendChild(questDiv);
        
        // Create buff bar
        const buffDiv = document.createElement('div');
        buffDiv.id = 'buff-bar';
        buffDiv.style.cssText = `
            position: absolute;
            left: ${this.buffBar.position.x}px;
            top: ${this.buffBar.position.y}px;
            display: flex;
            gap: 5px;
        `;
        document.getElementById('game-container').appendChild(buffDiv);
    },
    
    loadQuests() {
        // Starting quests
        this.questTracker.quests = [
            {
                id: 'first_ore',
                title: 'Ooo! Shiny!',
                description: 'Mine your first ore',
                objective: 'Mine any ore',
                progress: 0,
                target: 1,
                completed: false,
                reward: { coins: 100 }
            },
            {
                id: 'explore_caves',
                title: 'Heart Breaker',
                description: 'Discover the underground jungle',
                objective: 'Reach jungle biome',
                progress: 0,
                target: 1,
                completed: false,
                reward: { coins: 500, item: 'jungle_spores' }
            },
            {
                id: 'slayer_of_worlds',
                title: 'Slayer of Worlds',
                description: 'Defeat each boss',
                objective: 'Defeat all 5 bosses',
                progress: 0,
                target: 5,
                completed: false,
                reward: { coins: 5000, title: 'World Slayer' }
            }
        ];
        
        this.updateQuestTracker();
    },
    
    updateMiniMap(player, world) {
        if (!this.miniMap.enabled) return;
        
        const ctx = document.getElementById('minimap').getContext('2d');
        const size = this.miniMap.size;
        
        // Clear
        ctx.clearRect(0, 0, size, size);
        
        // Calculate visible area
        const viewW = window.innerWidth;
        const viewH = window.innerHeight;
        const scale = size / Math.max(viewW, viewH) * this.miniMap.zoom;
        
        // Draw player dot
        const playerX = size / 2;
        const playerY = size / 2;
        
        ctx.fillStyle = '#FF0000';
        ctx.beginPath();
        ctx.arc(playerX, playerY, 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw nearby icons (ores, chests, NPCs)
        this.miniMap.icons.forEach(icon => {
            const iconX = size / 2 + (icon.x - player.x) * scale;
            const iconY = size / 2 + (icon.y - player.y) * scale;
            
            // Only draw if on screen
            if (iconX >= 0 && iconX <= size && iconY >= 0 && iconY <= size) {
                ctx.fillStyle = icon.color || '#FFFFFF';
                ctx.fillRect(iconX - 2, iconY - 2, 4, 4);
            }
        });
        
        // Draw biome indicator
        const currentBiome = this.getBiomeAt(player.x, player.y);
        ctx.fillStyle = this.miniMap.biomeColors[currentBiome] || '#666666';
        ctx.globalAlpha = 0.3;
        ctx.fillRect(0, 0, size, size);
        ctx.globalAlpha = 1;
    },
    
    updateBuffBar(player) {
        const buffDiv = document.getElementById('buff-bar');
        buffDiv.innerHTML = '';
        
        // Display active buffs
        player.activeBuffs.forEach(buff => {
            const buffEl = document.createElement('div');
            buffEl.style.cssText = `
                width: ${this.buffBar.slotSize}px;
                height: ${this.buffBar.slotSize}px;
                background: rgba(0,0,0,0.7);
                border: 2px solid ${buff.rare ? '#FFDD44' : '#888'};
                border-radius: 5px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 20px;
                position: relative;
            `;
            buffEl.textContent = buff.icon;
            
            // Timer overlay
            if (buff.duration) {
                const timerEl = document.createElement('div');
                timerEl.style.cssText = `
                    position: absolute;
                    bottom: 2px;
                    right: 2px;
                    font-size: 10px;
                    color: #FFFF00;
                `;
                timerEl.textContent = Math.ceil(buff.remaining / 60);
                buffEl.appendChild(timerEl);
            }
            
            buffDiv.appendChild(buffEl);
        });
    },
    
    updateQuestTracker() {
        const questDiv = document.getElementById('quest-tracker');
        questDiv.innerHTML = '<strong style="color: #FFDD44; font-size: 14px;">QUESTS</strong><br><br>';
        
        this.questTracker.quests.forEach(quest => {
            if (!quest.completed) {
                const questEl = document.createElement('div');
                questEl.style.cssText = 'margin-bottom: 15px;';
                
                questEl.innerHTML = `
                    <div style="color: #44CCFF; font-weight: bold;">${quest.title}</div>
                    <div style="color: #AAAAAA; font-size: 11px; margin: 5px 0;">${quest.description}</div>
                    <div style="color: #888; font-size: 10px;">Progress: ${quest.progress}/${quest.target}</div>
                    <div style="background: #333; height: 4px; margin-top: 5px; border-radius: 2px;">
                        <div style="background: #44CCFF; width: ${(quest.progress / quest.target) * 100}%; height: 100%; border-radius: 2px;"></div>
                    </div>
                `;
                
                questDiv.appendChild(questEl);
            }
        });
    },
    
    showAchievement(name, description, icon) {
        const achievement = {
            name,
            description,
            icon,
            timer: 300 // 5 seconds at 60fps
        };
        
        this.achievements.queue.push(achievement);
        
        // Create notification element
        const notifEl = document.createElement('div');
        notifEl.style.cssText = `
            position: absolute;
            right: ${this.achievements.position.x}px;
            top: ${this.achievements.position.y + this.achievements.queue.length * 100}px;
            width: 300px;
            background: linear-gradient(90deg, rgba(0,0,0,0.9), rgba(50,50,50,0.8));
            border-left: 4px solid #FFDD44;
            padding: 15px;
            border-radius: 5px;
            color: white;
            font-family: Inter, sans-serif;
            animation: slideIn 0.3s ease-out;
            transition: opacity 0.5s;
        `;
        
        notifEl.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <div style="font-size: 32px;">${icon}</div>
                <div>
                    <div style="color: #FFDD44; font-weight: bold; font-size: 14px;">ACHIEVEMENT UNLOCKED</div>
                    <div style="font-weight: bold;">${name}</div>
                    <div style="color: #888; font-size: 11px;">${description}</div>
                </div>
            </div>
        `;
        
        document.getElementById('game-container').appendChild(notifEl);
        
        // Auto-remove after timer
        setTimeout(() => {
            notifEl.style.opacity = '0';
            setTimeout(() => notifEl.remove(), 500);
        }, 5000);
    },
    
    addBuff(player, buff) {
        player.activeBuffs.push({
            ...buff,
            remaining: buff.duration
        });
    },
    
    removeBuff(player, buffId) {
        player.activeBuffs = player.activeBuffs.filter(b => b.id !== buffId);
    },
    
    completeQuest(questId) {
        const quest = this.questTracker.quests.find(q => q.id === questId);
        if (quest && !quest.completed) {
            quest.completed = true;
            quest.progress = quest.target;
            
            // Show completion notification
            this.showAchievement('Quest Complete!', quest.title, '📜');
            
            // Grant rewards
            if (quest.reward.coins) {
                player.coins += quest.reward.coins;
            }
            
            this.updateQuestTracker();
        }
    },
    
    updateQuestProgress(questId, amount) {
        const quest = this.questTracker.quests.find(q => q.id === questId);
        if (quest && !quest.completed) {
            quest.progress = Math.min(quest.target, quest.progress + amount);
            
            if (quest.progress >= quest.target) {
                this.completeQuest(questId);
            } else {
                this.updateQuestTracker();
            }
        }
    },
    
    getBiomeAt(x, y) {
        // Simplified biome detection
        if (y > FLESH_Y) return 'corruption';
        if (y > MUSH_Y) return 'jungle';
        if (y > CAVE_Y) return 'caves';
        return 'forest';
    },
    
    update(dt, player) {
        // Update buff timers
        player.activeBuffs.forEach(buff => {
            buff.remaining -= dt * 60;
            if (buff.remaining <= 0) {
                this.removeBuff(player, buff.id);
            }
        });
        
        // Update UI elements
        this.updateBuffBar(player);
        
        // Process achievement queue
        this.achievements.queue = this.achievements.queue.filter(a => {
            a.timer--;
            return a.timer > 0;
        });
    }
};

// Export globally
window.QoLFeatures = QoLFeatures;

console.log('✨ Phase 4: QoL Features loaded');

/**
 * BATTLE PASS UI CONTROLLER
 */
const BattlePassUI = {
    initialized: false,

    async init() {
        this.setupEventListeners();
        this.updateCountdown();
        setInterval(() => this.updateCountdown(), 1000);
        
        // Listen for battle pass events
        window.addEventListener('battlepass:xpgain', (e) => this.onXPGain(e));
        window.addEventListener('battlepass:tierup', (e) => this.onTierUp(e));
        window.addEventListener('battlepass:reward', (e) => this.onReward(e));
        
        console.log('[BattlePassUI] Initialized');
    },

    setupEventListeners() {
        const tabs = document.querySelectorAll('.bp-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
        });
    },

    switchTab(tabName) {
        document.querySelectorAll('.bp-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.bp-content').forEach(c => c.classList.remove('bp-content-active'));
        
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`tab-${tabName}`).classList.add('bp-content-active');
        
        if (tabName === 'rewards') this.renderRewards();
        if (tabName === 'challenges') this.renderChallenges();
        if (tabName === 'overview') this.renderOverview();
    },

    render(status) {
        if (!status) status = BattlePassInstance.getStatus();
        
        // Update header
        document.getElementById('season-name').textContent = status.season.name;
        document.getElementById('season-theme').textContent = status.season.theme;
        
        // Update progress
        document.getElementById('current-tier').textContent = status.progress.currentTier;
        document.getElementById('current-xp').textContent = status.progress.xp;
        document.getElementById('xp-to-next').textContent = status.progress.xpToNextTier;
        
        const progressPercent = (status.progress.xp / status.progress.xpToNextTier) * 100;
        document.getElementById('xp-progress-fill').style.width = `${progressPercent}%`;
        
        // Show/hide premium banner
        const banner = document.getElementById('premium-banner');
        if (status.progress.premium) {
            banner.style.display = 'none';
        } else {
            banner.style.display = 'flex';
        }
        
        // Render rewards if tab is active
        if (document.querySelector('[data-tab="rewards"]').classList.contains('active')) {
            this.renderRewards();
        }
    },

    renderRewards() {
        const status = BattlePassInstance.getStatus();
        const freeContainer = document.getElementById('free-rewards');
        const premiumContainer = document.getElementById('premium-rewards');
        
        freeContainer.innerHTML = status.season.tracks.free.map(reward => 
            this.createRewardCard(reward, 'free', status)
        ).join('');
        
        premiumContainer.innerHTML = status.season.tracks.premium.map(reward => 
            this.createRewardCard(reward, 'premium', status)
        ).join('');
    },

    createRewardCard(reward, track, status) {
        const tier = reward.tier;
        const unlocked = status.progress.unlockedTiers.includes(tier);
        const claimed = status.progress.claimedRewards[track].includes(tier);
        const canClaim = unlocked && !claimed;
        
        return `
            <div class="bp-reward-card ${track} ${unlocked ? 'unlocked' : ''} ${claimed ? 'claimed' : ''}" data-tier="${tier}" data-track="${track}">
                <div class="bp-reward-tier">Tier ${tier}</div>
                <div class="bp-reward-icon">${this.getRewardIcon(reward.type)}</div>
                <div class="bp-reward-info">
                    <div class="bp-reward-type">${reward.type}</div>
                    <div class="bp-reward-amount">x${reward.amount || 1}</div>
                </div>
                ${canClaim ? `<button class="bp-btn-claim" onclick="BattlePassUI.claimReward(${tier}, '${track}')">Claim</button>` : ''}
                ${claimed ? '<div class="bp-claimed-badge">✓</div>' : ''}
            </div>
        `;
    },

    getRewardIcon(type) {
        const icons = {
            currency: '💎',
            item: '📦',
            boost: '⚡',
            cosmetic: '🎭'
        };
        return icons[type] || '❓';
    },

    claimReward(tier, track) {
        try {
            const reward = BattlePassInstance.claimReward(tier, track);
            this.render();
        } catch (error) {
            alert(error.message);
        }
    },

    renderChallenges() {
        const status = BattlePassInstance.getStatus();
        
        document.getElementById('daily-challenges').innerHTML = status.challenges.daily.map(c => 
            this.createChallengeCard(c)
        ).join('');
        
        document.getElementById('weekly-challenges').innerHTML = status.challenges.weekly.map(c => 
            this.createChallengeCard(c)
        ).join('');
        
        document.getElementById('seasonal-challenges').innerHTML = status.challenges.seasonal.map(c => 
            this.createChallengeCard(c)
        ).join('');
    },

    createChallengeCard(challenge) {
        const progress = Math.min(challenge.progress, challenge.goal);
        const percent = (progress / challenge.goal) * 100;
        const completed = challenge.completed;
        
        return `
            <div class="bp-challenge-card ${completed ? 'completed' : ''}">
                <div class="bp-challenge-text">${challenge.text}</div>
                <div class="bp-challenge-progress">
                    <div class="bp-challenge-bar" style="width: ${percent}%"></div>
                </div>
                <div class="bp-challenge-footer">
                    <span>${progress}/${challenge.goal}</span>
                    <span class="bp-challenge-xp">+${challenge.xpReward} XP</span>
                </div>
            </div>
        `;
    },

    renderOverview() {
        const status = BattlePassInstance.getStatus();
        
        document.getElementById('stat-total-xp').textContent = status.progress.totalXP.toLocaleString();
        document.getElementById('stat-challenges-completed').textContent = status.progress.completedChallenges.length;
        document.getElementById('stat-rewards-claimed').textContent = 
            status.progress.claimedRewards.free.length + status.progress.claimedRewards.premium.length;
        
        const daysRemaining = Math.ceil((new Date(status.season.endDate) - new Date()) / (1000 * 60 * 60 * 24));
        document.getElementById('stat-days-remaining').textContent = Math.max(0, daysRemaining);
    },

    updateCountdown() {
        const season = BattlePassInstance.currentSeason;
        if (!season) return;
        
        const end = new Date(season.endDate);
        const now = new Date();
        const diff = end - now;
        
        if (diff <= 0) {
            document.getElementById('season-countdown').textContent = 'Ended';
            return;
        }
        
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        document.getElementById('season-countdown').textContent = 
            `${days}d ${hours}h ${minutes}m`;
    },

    onXPGain(event) {
        const { amount, totalXP } = event.detail;
        this.showFloatingText(`+${amount} XP`, totalXP);
        this.render();
    },

    onTierUp(event) {
        const { newTier } = event.detail;
        this.showToast(`🎉 Tier ${newTier} Unlocked!`);
        this.render();
    },

    onReward(event) {
        const { reward } = event.detail;
        this.showToast(`✓ Received: ${reward.type}`);
    },

    showFloatingText(text, xp) {
        // Create floating text animation
        const el = document.createElement('div');
        el.className = 'bp-floating-text';
        el.textContent = text;
        document.body.appendChild(el);
        
        setTimeout(() => el.remove(), 2000);
    },

    showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'bp-toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('bp-toast-hide');
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    },

    upgradeToPremium() {
        if (confirm('Upgrade to Premium Battle Pass for $9.99?')) {
            BattlePassInstance.upgradeToPremium();
            this.render();
            this.showToast('👑 Premium Activated!');
        }
    },

    close() {
        document.getElementById('battlepass-screen').style.display = 'none';
    },

    open() {
        document.getElementById('battlepass-screen').style.display = 'block';
        this.render();
    }
};

// Auto-init
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => BattlePassUI.init());
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BattlePassUI };
}

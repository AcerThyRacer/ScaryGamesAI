/**
 * ScaryGamesAI Subscription System - Complete Implementation
 * Phases 1-5: Payment, Gamification, AI, Social, Metaverse
 */

class SubscriptionSystem {
    constructor() {
        this.apiBase = '/api';
        this.userToken = localStorage.getItem('sgai-token') || 'demo-token';
        this.currentTier = localStorage.getItem('sgai-tier') || null;
        this.battlePass = null;
        this.userProfile = null;
        this.communityGoals = null;
        
        this.init();
    }

    async init() {
        await this.loadUserData();
        this.setupEventListeners();
        this.initializeVisualEffects();
        this.startLiveUpdates();
    }

    // ==================== PHASE 1: CORE DATA ====================

    async loadUserData() {
        try {
            // Load subscription status
            const status = await this.apiGet('/subscriptions/status');
            this.currentTier = status.tier;
            
            // Load battle pass
            this.battlePass = await this.apiGet('/subscriptions/battle-pass');
            
            // Load user profile
            this.userProfile = await this.apiGet('/subscriptions/profile');
            
            // Load community goals
            this.communityGoals = await this.apiGet('/subscriptions/community-goals');
            
            this.updateUI();
        } catch (e) {
            console.error('Failed to load user data:', e);
        }
    }

    async apiGet(endpoint) {
        const response = await fetch(`${this.apiBase}${endpoint}`, {
            headers: {
                'Authorization': `Bearer ${this.userToken}`
            }
        });
        return response.json();
    }

    async apiPost(endpoint, data) {
        const response = await fetch(`${this.apiBase}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.userToken}`
            },
            body: JSON.stringify(data)
        });
        return response.json();
    }

    // ==================== PHASE 1: URGENCY & CONVERSION ====================

    initializeUrgencyMechanics() {
        // Limited spots counter
        this.renderLimitedSpots();
        
        // Flash sale countdown
        this.initializeFlashSales();
        
        // Recent activity ticker
        this.startActivityTicker();
        
        // Exit intent modal
        this.setupExitIntent();
        
        // Dynamic pricing
        this.updateDynamicPricing();
    }

    renderLimitedSpots() {
        const container = document.getElementById('limited-spots');
        if (!container) return;

        // Simulate limited availability (decreases over time)
        const baseSlots = 50;
        const hourOfDay = new Date().getHours();
        const remaining = Math.max(3, baseSlots - (hourOfDay * 2));

        container.innerHTML = `
            <div class="urgency-meter">
                <span class="urgency-icon">🔥</span>
                <span class="urgency-text">Only <strong>${remaining}</strong> Elder God slots remaining this moon cycle</span>
                <div class="urgency-bar">
                    <div class="urgency-fill" style="width: ${(remaining / baseSlots) * 100}%"></div>
                </div>
            </div>
        `;
    }

    initializeFlashSales() {
        // Check if there's an active flash sale
        const saleEnd = localStorage.getItem('sgai-flash-sale-end');
        const now = Date.now();

        if (!saleEnd || parseInt(saleEnd) < now) {
            // Create new flash sale (random 4-hour window)
            const newEnd = now + (4 * 60 * 60 * 1000);
            localStorage.setItem('sgai-flash-sale-end', newEnd);
            localStorage.setItem('sgai-flash-sale-discount', '35');
        }

        this.renderFlashSale();
    }

    renderFlashSale() {
        const container = document.getElementById('flash-sale-banner');
        if (!container) return;

        const saleEnd = parseInt(localStorage.getItem('sgai-flash-sale-end'));
        const discount = localStorage.getItem('sgai-flash-sale-discount');

        const updateTimer = () => {
            const remaining = saleEnd - Date.now();
            if (remaining <= 0) {
                container.style.display = 'none';
                return;
            }

            const hours = Math.floor(remaining / (1000 * 60 * 60));
            const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

            container.innerHTML = `
                <div class="flash-sale-inner">
                    <span class="flash-icon">⚡</span>
                    <span class="flash-text"><strong>BLOOD MOON SALE</strong> — ${discount}% OFF all tiers!</span>
                    <span class="flash-timer">${hours}h ${minutes}m ${seconds}s</span>
                    <button class="flash-cta" onclick="subscriptionSystem.showPricing()">Claim Now</button>
                </div>
            `;
        };

        updateTimer();
        setInterval(updateTimer, 1000);
    }

    startActivityTicker() {
        const activities = [
            { user: 'VoidWalker', action: 'ascended to Elder God', time: 2 },
            { user: 'NightCrawler', action: 'subscribed as Hunter', time: 5 },
            { user: 'DarkSoul99', action: 'claimed daily reward', time: 8 },
            { user: 'GhostHunter', action: 'reached level 25', time: 12 },
            { user: 'ShadowStep', action: 'referred a new soul', time: 15 },
            { user: 'BloodMage', action: 'unlocked achievement', time: 18 }
        ];

        const ticker = document.getElementById('activity-ticker');
        if (!ticker) return;

        let index = 0;
        const showNext = () => {
            const activity = activities[index % activities.length];
            ticker.innerHTML = `
                <span class="ticker-activity">
                    <strong>${activity.user}</strong> ${activity.action} • ${activity.time}m ago
                </span>
            `;
            index++;
        };

        showNext();
        setInterval(showNext, 4000);
    }

    setupExitIntent() {
        let hasShown = false;
        
        document.addEventListener('mouseleave', (e) => {
            if (e.clientY < 10 && !hasShown && !this.currentTier) {
                hasShown = true;
                this.showExitModal();
            }
        });
    }

    showExitModal() {
        const modal = document.createElement('div');
        modal.className = 'exit-modal-overlay';
        modal.innerHTML = `
            <div class="exit-modal">
                <div class="exit-rune">🜏</div>
                <h2>Wait... Don't Flee Yet</h2>
                <p>The darkness has a special offer for those who hesitate...</p>
                <div class="exit-offer">
                    <span class="exit-discount">20% OFF</span>
                    <span class="exit-code">Use code: DONTLEAVE</span>
                </div>
                <div class="exit-urgency">⏰ Offer expires in 10:00</div>
                <button class="exit-accept" onclick="subscriptionSystem.applyExitDiscount()">
                    Accept the Offer
                </button>
                <button class="exit-decline" onclick="this.closest('.exit-modal-overlay').remove()">
                    No, I Choose Death
                </button>
            </div>
        `;
        document.body.appendChild(modal);

        // Auto-close after 30 seconds
        setTimeout(() => modal.remove(), 30000);
    }

    async updateDynamicPricing() {
        try {
            const pricing = await this.apiGet('/subscriptions/pricing');
            this.renderPersonalizedPricing(pricing);
        } catch (e) {
            console.error('Failed to load pricing:', e);
        }
    }

    renderPersonalizedPricing(pricing) {
        // Update pricing display with personalized discounts
        Object.entries(pricing.prices).forEach(([tier, prices]) => {
            const element = document.getElementById(`price-${tier}`);
            if (element && pricing.discount > 0) {
                element.innerHTML = `
                    <span class="price-original">$${prices.originalMonthly}</span>
                    <span class="price-discounted">$${prices.monthly.toFixed(2)}</span>
                    <span class="price-badge">-${pricing.discount}%</span>
                `;
            }
        });

        // Show discount reason
        const reasonEl = document.getElementById('personalized-discount-reason');
        if (reasonEl && pricing.discountReason) {
            reasonEl.textContent = pricing.discountReason;
        }
    }

    // ==================== PHASE 2: BATTLE PASS ====================

    renderBattlePass() {
        if (!this.battlePass) return;

        const container = document.getElementById('battle-pass-widget');
        if (!container) return;

        const { level, xp, progress, nextReward, streakDays } = this.battlePass;

        container.innerHTML = `
            <div class="bp-widget">
                <div class="bp-header">
                    <h3>🎃 Your Ascension</h3>
                    <span class="bp-level">Level ${level}</span>
                </div>
                <div class="bp-progress-container">
                    <div class="bp-progress-bar">
                        <div class="bp-progress-fill" style="width: ${progress}%"></div>
                    </div>
                    <span class="bp-xp">${xp % 1000} / 1000 XP</span>
                </div>
                <div class="bp-streak">
                    <span class="streak-flame">🔥</span>
                    <span>${streakDays} Day Streak</span>
                </div>
                ${nextReward ? `
                    <div class="bp-next-reward">
                        <span>Next: ${nextReward.name}</span>
                        <button onclick="subscriptionSystem.claimDaily()">Claim Daily</button>
                    </div>
                ` : ''}
            </div>
        `;
    }

    async claimDaily() {
        try {
            const result = await this.apiPost('/subscriptions/daily-login', {});
            
            if (result.success) {
                this.showToast(`+${result.xpGained} XP! Streak: ${result.streak} days`, 'success');
                await this.loadUserData();
                this.renderBattlePass();
            }
        } catch (e) {
            this.showToast(e.message || 'Already claimed today', 'error');
        }
    }

    // ==================== PHASE 2: REFERRAL SYSTEM ====================

    async loadReferralData() {
        try {
            const data = await this.apiGet('/referrals/my-code');
            this.renderReferralWidget(data);
        } catch (e) {
            console.error('Failed to load referral data:', e);
        }
    }

    renderReferralWidget(data) {
        const container = document.getElementById('referral-widget');
        if (!container) return;

        container.innerHTML = `
            <div class="referral-widget">
                <h3>🜏 Summon Souls</h3>
                <p>Bind others to our service and be rewarded...</p>
                <div class="referral-code-box">
                    <code>${data.code}</code>
                    <button onclick="subscriptionSystem.copyReferral('${data.code}')">Copy</button>
                </div>
                <div class="referral-stats">
                    <div class="stat">
                        <span class="stat-value">${data.stats.total}</span>
                        <span class="stat-label">Summoned</span>
                    </div>
                    <div class="stat">
                        <span class="stat-value">${data.stats.converted}</span>
                        <span class="stat-label">Bound</span>
                    </div>
                    <div class="stat">
                        <span class="stat-value">$${(data.stats.rewardsEarned / 100).toFixed(2)}</span>
                        <span class="stat-label">Earned</span>
                    </div>
                </div>
            </div>
        `;
    }

    copyReferral(code) {
        navigator.clipboard.writeText(`${window.location.origin}/subscription?ref=${code}`);
        this.showToast('Summoning link copied to clipboard!', 'success');
    }

    // ==================== PHASE 3: AI PERSONALIZATION ====================

    renderPersonalGrimoire() {
        if (!this.userProfile) return;

        const container = document.getElementById('personal-grimoire');
        if (!container) return;

        const { horrorTolerance, playerArchetype, recommendedTier, fearProfile } = this.userProfile;

        container.innerHTML = `
            <div class="grimoire-personal">
                <h2>📖 Your Forbidden Profile</h2>
                <div class="archetype-card">
                    <div class="archetype-icon">${this.getArchetypeIcon(playerArchetype.name)}</div>
                    <h3>${playerArchetype.name}</h3>
                    <p>${playerArchetype.traits.join(' • ')}</p>
                </div>
                <div class="horror-stats">
                    <div class="stat-bar">
                        <label>Terror Tolerance</label>
                        <div class="bar">
                            <div class="fill" style="width: ${horrorTolerance.score * 100}%"></div>
                        </div>
                        <span>${horrorTolerance.level}</span>
                    </div>
                </div>
                <div class="ai-recommendation">
                    <h4>🔮 The AI Whispers:</h4>
                    <p>"${this.userProfile.recommendedNextGame.reason}"</p>
                    <button onclick="window.location.href='/games.html?game=${this.userProfile.recommendedNextGame.game}'">
                        Heed the Call
                    </button>
                </div>
            </div>
        `;
    }

    getArchetypeIcon(archetype) {
        const icons = {
            'The Methodical Survivor': '🛡️',
            'The Thrill Seeker': '⚡',
            'The Completionist': '⭐',
            'The Social Horror Fan': '👥',
            'The Night Wanderer': '🌙'
        };
        return icons[archetype] || '👤';
    }

    applyAdaptiveTheme() {
        if (!this.userProfile) return;

        const { horrorTolerance, playPatterns } = this.userProfile;
        const body = document.body;

        // Remove existing themes
        body.classList.remove('theme-blood-moon', 'theme-spectral', 'theme-void');

        // Apply theme based on profile
        if (horrorTolerance.score > 0.8 && this.currentTier === 'elder') {
            body.classList.add('theme-void');
        } else if (playPatterns.preferredTimeOfDay === 'Night Owl') {
            body.classList.add('theme-spectral');
        } else if (horrorTolerance.score > 0.6) {
            body.classList.add('theme-blood-moon');
        }
    }

    // ==================== PHASE 4: SOCIAL & CULT ====================

    async loadCultData() {
        try {
            const [leaderboard, referralLeaders] = await Promise.all([
                this.apiGet('/subscriptions/leaderboard?limit=10'),
                this.apiGet('/referrals/leaderboard')
            ]);

            this.renderCultLeaderboard(leaderboard);
            this.renderReferralLeaders(referralLeaders);
        } catch (e) {
            console.error('Failed to load cult data:', e);
        }
    }

    renderCultLeaderboard(leaderboard) {
        const container = document.getElementById('cult-leaderboard');
        if (!container) return;

        container.innerHTML = `
            <div class="cult-leaderboard">
                <h3>🏆 The Eternal Rankings</h3>
                <div class="leaderboard-list">
                    ${leaderboard.map((user, i) => `
                        <div class="leaderboard-item ${i < 3 ? 'top-' + (i + 1) : ''}">
                            <span class="rank">${i + 1}</span>
                            <span class="name">${user.username}</span>
                            <span class="tier-badge ${user.tier}">${user.tier}</span>
                            <span class="streak">${user.streakDays} days</span>
                            ${user.isEternal ? '<span class="eternal-badge">ETERNAL</span>' : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderCommunityGoals() {
        if (!this.communityGoals) return;

        const container = document.getElementById('community-goals');
        if (!container) return;

        const totalSubscribers = this.communityGoals[0]?.current || 0;

        container.innerHTML = `
            <div class="community-goals">
                <h3>🌍 The Great Ascension</h3>
                <p class="total-souls">${totalSubscribers.toLocaleString()} souls have joined the cult</p>
                ${this.communityGoals.map(goal => `
                    <div class="goal-item ${goal.isUnlocked ? 'unlocked' : ''}">
                        <div class="goal-header">
                            <span class="goal-reward">${goal.reward}</span>
                            <span class="goal-progress">${goal.current.toLocaleString()} / ${goal.target.toLocaleString()}</span>
                        </div>
                        <div class="goal-bar">
                            <div class="goal-fill" style="width: ${goal.progress}%"></div>
                        </div>
                        <p class="goal-desc">${goal.description}</p>
                        ${goal.isUnlocked ? '<span class="unlocked-badge">✓ UNLOCKED</span>' : ''}
                    </div>
                `).join('')}
            </div>
        `;
    }

    // ==================== PHASE 5: METAVERSE & ADVANCED ====================

    initializeMetaverseFeatures() {
        // Cross-platform sync indicator
        this.renderPlatformSync();
        
        // NFT wallet connection (mock)
        this.setupWalletConnection();
        
        // VR preview
        this.setupVRPreview();
    }

    renderPlatformSync() {
        const platforms = ['web', 'mobile', 'desktop'];
        const container = document.getElementById('platform-sync');
        if (!container) return;

        container.innerHTML = `
            <div class="platform-sync">
                <h4>🌐 Your Soul is Bound Across:</h4>
                <div class="platforms">
                    ${platforms.map(p => `
                        <span class="platform ${p} active">${p}</span>
                    `).join('')}
                </div>
                <p>Progress syncs automatically across all realms</p>
            </div>
        `;
    }

    setupWalletConnection() {
        // Mock wallet connection for future blockchain integration
        const connectBtn = document.getElementById('connect-wallet');
        if (connectBtn) {
            connectBtn.addEventListener('click', () => {
                this.showToast('Wallet connection coming in Phase 5...', 'info');
            });
        }
    }

    setupVRPreview() {
        const vrBtn = document.getElementById('vr-preview');
        if (vrBtn && 'xr' in navigator) {
            vrBtn.addEventListener('click', async () => {
                try {
                    const session = await navigator.xr.requestSession('immersive-vr');
                    this.launchVRPreview(session);
                } catch (e) {
                    this.showToast('VR not available on this device', 'error');
                }
            });
        }
    }

    // ==================== VISUAL EFFECTS ====================

    initializeVisualEffects() {
        // Initialize particles
        this.initParticles();
        
        // 3D card effects
        this.init3DCards();
        
        // Cursor effects
        this.initCursorEffects();
        
        // Scroll animations
        this.initScrollAnimations();
    }

    initParticles() {
        const container = document.getElementById('particle-container');
        if (!container) return;

        // Create tier-specific particles
        for (let i = 0; i < 50; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.animationDelay = Math.random() * 5 + 's';
            particle.style.animationDuration = (5 + Math.random() * 5) + 's';
            container.appendChild(particle);
        }
    }

    init3DCards() {
        document.querySelectorAll('.pricing-card').forEach(card => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = (e.clientX - rect.left) / rect.width;
                const y = (e.clientY - rect.top) / rect.height;
                
                const tiltX = (y - 0.5) * -15;
                const tiltY = (x - 0.5) * 15;
                
                card.style.transform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateZ(20px)`;
            });

            card.addEventListener('mouseleave', () => {
                card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateZ(0)';
            });
        });
    }

    initCursorEffects() {
        // Custom cursor trail
        const cursor = document.createElement('div');
        cursor.className = 'custom-cursor';
        document.body.appendChild(cursor);

        document.addEventListener('mousemove', (e) => {
            cursor.style.left = e.clientX + 'px';
            cursor.style.top = e.clientY + 'px';
        });
    }

    initScrollAnimations() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                }
            });
        }, { threshold: 0.1 });

        document.querySelectorAll('.scroll-animate').forEach(el => {
            observer.observe(el);
        });
    }

    // ==================== UTILITY ====================

    setupEventListeners() {
        // Billing toggle
        const billingToggle = document.getElementById('billing-toggle');
        if (billingToggle) {
            billingToggle.addEventListener('change', (e) => {
                this.updatePricingDisplay(e.target.checked ? 'annual' : 'monthly');
            });
        }

        // Subscribe buttons
        document.querySelectorAll('.sub-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tier = e.target.dataset.tier;
                this.handleSubscribe(tier);
            });
        });
    }

    async handleSubscribe(tier) {
        const billingCycle = document.getElementById('billing-toggle')?.checked ? 'annual' : 'monthly';
        
        try {
            const result = await this.apiPost('/subscriptions/create-checkout', {
                tier,
                billingCycle,
                referralCode: new URLSearchParams(window.location.search).get('ref')
            });

            if (result.url) {
                window.location.href = result.url;
            }
        } catch (e) {
            this.showToast('Failed to initiate subscription', 'error');
        }
    }

    updatePricingDisplay(cycle) {
        document.querySelectorAll('.pricing-amount').forEach(el => {
            const value = el.dataset[cycle];
            el.textContent = value;
        });
    }

    updateUI() {
        this.renderBattlePass();
        this.renderPersonalGrimoire();
        this.renderCommunityGoals();
        this.loadReferralData();
        this.loadCultData();
        this.applyAdaptiveTheme();
        this.initializeUrgencyMechanics();
        this.initializeMetaverseFeatures();
    }

    startLiveUpdates() {
        // Update every 30 seconds
        setInterval(() => {
            this.renderLimitedSpots();
        }, 30000);
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('show');
        }, 100);

        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    window.subscriptionSystem = new SubscriptionSystem();
});

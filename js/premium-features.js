/**
 * Phase 6: Business & Monetization
 * 
 * Premium features, credits system, and marketplace functionality
 */

class PremiumFeatures {
    constructor() {
        this.ollama = window.OllamaIntegration || null;
        this.storage = window.gameStorage || null;
        this.credits = window.CreditsSystem || null;
        
        // Premium templates (professionally crafted)
        this.premiumTemplates = this._loadPremiumTemplates();
        
        // User's subscription data
        this.subscription = this._loadSubscription();
        
        // Branding settings
        this.branding = {
            showWatermark: true,
            customLogo: null,
            customFooter: null
        };
        
        this._init();
    }
    
    _init() {
        console.log('[Premium] Initializing Premium Features...');
        this._loadBrandingSettings();
    }
    
    _loadPremiumTemplates() {
        // Professionally crafted prompt templates
        return {
            // Premium Game Templates
            'rogue-like': {
                id: 'rogue-like',
                name: 'Rogue-like Adventure',
                category: 'game',
                description: 'Procedural dungeon crawler with permadeath',
                credits: 50,
                prompt: `Create a rogue-like dungeon game with:
- Procedural level generation using cellular automata
- Permadeath mechanics with score tracking
- Multiple character classes (Warrior, Mage, Rogue)
- Inventory system with equipment slots
- Procedural enemy AI with learning
- Procedural item generation with rarities
- Boss encounters every 5 floors
- Run-based progression unlocks
- Turn-based or real-time combat option

Technical requirements:
- Canvas-based rendering with smooth animations
- Responsive design for mobile/desktop
- Sound effects and ambient music
- Save/load via localStorage
- Achievement system
- Local high score leaderboard`,
                tags: ['rogue-like', 'dungeon', 'procedural', 'permadeath'],
                author: 'ScaryGamesAI Team',
                rating: 4.8,
                downloads: 15420
            },
            
            'survival-horror': {
                id: 'survival-horror',
                name: 'Survival Horror',
                category: 'game',
                description: 'Atmospheric horror with resource management',
                credits: 75,
                prompt: `Create a survival horror game with:
- First-person or third-person perspective
- Resource management (ammo, health, batteries)
- Dynamic lighting with flashlight mechanics
- Enemy AI with patrol and chase behaviors
- Environmental puzzles
- Story-driven narrative with collectible lore
- Multiple endings based on choices
- Sanity/fear meter system
- Stealth mechanics
- Quick-time events for tension

Technical requirements:
- WebGL or Canvas rendering
- Atmospheric sound design (procedural)
- Dynamic camera effects
- Save system with multiple slots
- Inventory UI with crafting
- Map system with revealed areas`,
                tags: ['horror', 'survival', 'scary', 'atmospheric'],
                author: 'ScaryGamesAI Team',
                rating: 4.9,
                downloads: 23150
            },
            
            'tower-defense': {
                id: 'tower-defense',
                name: 'Tower Defense',
                category: 'game',
                description: 'Strategic tower defense with upgrades',
                credits: 60,
                prompt: `Create a tower defense game with:
- Multiple tower types (archer, mage, cannon, ice, poison)
- Enemy waves with varying strengths
- Tower upgrade system (3 tiers each)
- Special abilities (aoe, slow, damage boost)
- Resource management (gold, lives)
- Map editor for custom levels
- Multiple difficulty modes
- Boss waves every 10 levels
- Unit synergies and combos
- Achievement system

Technical requirements:
- Canvas-based with smooth animations
- Particle effects for attacks
- Sound effects and music
- Level progress saving
- High score tracking
- Replay functionality`,
                tags: ['tower-defense', 'strategy', 'casual', 'strategy'],
                author: 'ScaryGamesAI Team',
                rating: 4.7,
                downloads: 12890
            },
            
            'puzzle-platformer': {
                id: 'puzzle-platformer',
                name: 'Puzzle Platformer',
                category: 'game',
                description: 'Physics-based puzzle platformer',
                credits: 55,
                prompt: `Create a puzzle platformer with:
- Physics-based puzzles (gravity, momentum, springs)
- Multiple abilities (double jump, dash, wall-jump)
- Collectible stars/coins for score
- Level editor with sharing
- Time trial mode
- Hint system for stuck players
- Moving platforms and hazards
- Checkpoint system
- Boss puzzles
- Multiple solution paths

Technical requirements:
- Box2D or custom physics engine
- Smooth 60fps gameplay
- Level completion tracking
- Cloud level storage (optional)
- Responsive controls
- Touch support for mobile`,
                tags: ['puzzle', 'platformer', 'physics', 'casual'],
                author: 'ScaryGamesAI Team',
                rating: 4.6,
                downloads: 9870
            },
            
            'multiplayer-arena': {
                id: 'multiplayer-arena',
                name: 'Multiplayer Arena',
                category: 'game',
                description: 'Real-time multiplayer combat',
                credits: 100,
                prompt: `Create a multiplayer arena game with:
- Local multiplayer (2-4 players)
- Multiple arena maps
- Character selection with unique abilities
- Power-ups on map
- Round-based or continuous play
- Score and statistics tracking
- Bot opponents for practice
- Customizable controls per player
- Tournament mode
- Unlockable characters

Technical requirements:
- Split-screen or shared-screen
- Local state synchronization
- Smooth input handling
- AI bots with varying difficulty
- Match history
- Character unlock progression`,
                tags: ['multiplayer', 'arena', 'combat', 'local'],
                author: 'ScaryGamesAI Team',
                rating: 4.5,
                downloads: 7650
            },
            
            // Premium Story Templates
            'interactive-fiction': {
                id: 'interactive-fiction',
                name: 'Interactive Fiction',
                category: 'story',
                description: 'Text adventure with choices',
                credits: 40,
                prompt: `Create an interactive fiction game with:
- Rich narrative with branching paths
- Character stats and inventory
- Skill checks for actions
- Multiple endings
- Save/load functionality
- Chapter system
- Atmospheric text animations
- Soundtrack integration
- Achievement for completions
- Hint system

Technical requirements:
- Clean typography
- Smooth page transitions
- LocalStorage save
- Progress indicator
- Character sheet UI
- Inventory management`,
                tags: ['text', 'adventure', 'story', 'choices'],
                author: 'ScaryGamesAI Team',
                rating: 4.7,
                downloads: 11230
            },
            
            // Premium Tool Templates
            'level-editor': {
                id: 'level-editor',
                name: 'Level Editor',
                category: 'tool',
                description: 'Full-featured level creation tool',
                credits: 80,
                prompt: `Create a level editor with:
- Tile-based placement system
- Multiple tile sets
- Object placement
- Custom properties per object
- Test play mode
- Undo/redo system
- Save/load levels
- Export to JSON
- Import from JSON
- Grid snapping

Technical requirements:
- Canvas rendering
- Drag and drop
- Property inspector panel
- Toolbar with tools
- Minimap navigation
- Zoom and pan
- Level validation`,
                tags: ['editor', 'tool', 'level', 'creation'],
                author: 'ScaryGamesAI Team',
                rating: 4.8,
                downloads: 5430
            }
        };
    }
    
    _loadSubscription() {
        const stored = localStorage.getItem('sgai-subscription');
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                return this._defaultSubscription();
            }
        }
        return this._defaultSubscription();
    }
    
    _defaultSubscription() {
        return {
            tier: 'free',
            credits: 0,
            generationPriority: 0,
            historyLimit: 10,
            showWatermark: true,
            features: []
        };
    }
    
    _loadBrandingSettings() {
        const stored = localStorage.getItem('sgai-branding');
        if (stored) {
            try {
                this.branding = { ...this.branding, ...JSON.parse(stored) };
            } catch (e) {}
        }
    }
    
    _saveBrandingSettings() {
        localStorage.setItem('sgai-branding', JSON.stringify(this.branding));
    }
    
    // ============================================
    // PREMIUM TEMPLATES
    // ============================================
    
    /**
     * Get all premium templates
     */
    getTemplates(category = null) {
        if (category) {
            return Object.values(this.premiumTemplates).filter(t => t.category === category);
        }
        return Object.values(this.premiumTemplates);
    }
    
    /**
     * Get template by ID
     */
    getTemplate(templateId) {
        return this.premiumTemplates[templateId];
    }
    
    /**
     * Search templates
     */
    searchTemplates(query) {
        const q = query.toLowerCase();
        return Object.values(this.premiumTemplates).filter(t => 
            t.name.toLowerCase().includes(q) ||
            t.description.toLowerCase().includes(q) ||
            t.tags.some(tag => tag.includes(q))
        );
    }
    
    /**
     * Use a premium template
     */
    async useTemplate(templateId) {
        const template = this.premiumTemplates[templateId];
        if (!template) {
            return { success: false, error: 'Template not found' };
        }
        
        // Check credits
        const credits = this._getCredits();
        if (credits < template.credits) {
            return { 
                success: false, 
                error: `Insufficient credits. Need ${template.credits}, have ${credits}`,
                needed: template.credits,
                have: credits
            };
        }
        
        // Deduct credits
        await this._deductCredits(template.credits);
        
        // Use the template with Ollama
        if (this.ollama) {
            const result = await this.ollama.generateGame(template.prompt);
            return {
                success: true,
                template,
                result,
                creditsSpent: template.credits
            };
        }
        
        return {
            success: true,
            template,
            prompt: template.prompt,
            creditsSpent: template.credits
        };
    }
    
    /**
     * Get user templates (created by user)
     */
    getUserTemplates() {
        const stored = localStorage.getItem('sgai-user-templates');
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                return [];
            }
        }
        return [];
    }
    
    /**
     * Save user template
     */
    saveUserTemplate(template) {
        const templates = this.getUserTemplates();
        template.id = 'user-' + Date.now();
        template.author = 'You';
        template.downloads = 0;
        template.rating = 0;
        templates.push(template);
        localStorage.setItem('sgai-user-templates', JSON.stringify(templates));
        return template;
    }
    
    // ============================================
    // PRIORITY GENERATION
    // ============================================
    
    /**
     * Get user's generation priority (higher = faster)
     */
    getGenerationPriority() {
        const tier = this.subscription.tier;
        const priorities = {
            free: 0,
            lite: 1,
            pro: 2,
            max: 3
        };
        return priorities[tier] || 0;
    }
    
    /**
     * Add to generation queue with priority
     */
    async queueGeneration(prompt, options = {}) {
        const priority = this.getGenerationPriority();
        
        const queueItem = {
            id: 'gen-' + Date.now(),
            prompt,
            options,
            priority,
            timestamp: Date.now(),
            status: 'queued'
        };
        
        // Store in queue
        const queue = this._getQueue();
        queue.push(queueItem);
        
        // Sort by priority (higher first)
        queue.sort((a, b) => b.priority - a.priority);
        
        localStorage.setItem('sgai-generation-queue', JSON.stringify(queue));
        
        // Trigger processing if not already running
        this._processQueue();
        
        return queueItem;
    }
    
    _getQueue() {
        const stored = localStorage.getItem('sgai-generation-queue');
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                return [];
            }
        }
        return [];
    }
    
    _processQueue() {
        // Process queue based on priority
        const queue = this._getQueue();
        const processing = queue.filter(i => i.status === 'processing');
        
        if (processing.length > 0) return; // Already processing
        
        // Get next item
        const nextItem = queue.find(i => i.status === 'queued');
        if (!nextItem) return;
        
        // Mark as processing
        nextItem.status = 'processing';
        localStorage.setItem('sgai-generation-queue', JSON.stringify(queue));
        
        // Dispatch event for UI to handle
        window.dispatchEvent(new CustomEvent('generation:started', { detail: nextItem }));
    }
    
    /**
     * Complete generation
     */
    completeGeneration(generationId, result) {
        const queue = this._getQueue();
        const item = queue.find(i => i.id === generationId);
        
        if (item) {
            item.status = 'completed';
            item.result = result;
            item.completedAt = Date.now();
            
            localStorage.setItem('sgai-generation-queue', JSON.stringify(queue));
            
            window.dispatchEvent(new CustomEvent('generation:completed', { detail: item }));
            
            // Process next
            this._processQueue();
        }
    }
    
    // ============================================
    // EXTENDED HISTORY
    // ============================================
    
    /**
     * Get history limit based on subscription
     */
    getHistoryLimit() {
        const tier = this.subscription.tier;
        const limits = {
            free: 10,
            lite: 50,
            pro: 200,
            max: 1000
        };
        return limits[tier] || 10;
    }
    
    /**
     * Save generation to history
     */
    saveToHistory(entry) {
        const limit = this.getHistoryLimit();
        let history = this.getHistory();
        
        entry.id = 'hist-' + Date.now();
        entry.timestamp = new Date().toISOString();
        
        history.unshift(entry);
        
        // Trim to limit
        if (history.length > limit) {
            history = history.slice(0, limit);
        }
        
        localStorage.setItem('sgai-generation-history', JSON.stringify(history));
        
        return entry;
    }
    
    /**
     * Get generation history
     */
    getHistory() {
        const stored = localStorage.getItem('sgai-generation-history');
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                return [];
            }
        }
        return [];
    }
    
    /**
     * Clear history
     */
    clearHistory() {
        localStorage.removeItem('sgai-generation-history');
    }
    
    /**
     * Export history
     */
    exportHistory() {
        const history = this.getHistory();
        return JSON.stringify(history, null, 2);
    }
    
    // ============================================
    // CUSTOM BRANDING
    // ============================================
    
    /**
     * Get branding settings
     */
    getBranding() {
        return { ...this.branding };
    }
    
    /**
     * Update branding settings
     */
    updateBranding(settings) {
        this.branding = { ...this.branding, ...settings };
        this._saveBrandingSettings();
        
        // Apply branding to generated games
        this._applyBranding();
        
        return this.branding;
    }
    
    /**
     * Remove watermark from games
     */
    async removeWatermark() {
        if (this.subscription.tier === 'free') {
            return { 
                success: false, 
                error: 'Watermark removal requires subscription',
                upgradeUrl: '/subscription.html'
            };
        }
        
        this.branding.showWatermark = false;
        this._saveBrandingSettings();
        this._applyBranding();
        
        return { success: true };
    }
    
    /**
     * Set custom logo
     */
    setCustomLogo(logoUrl) {
        this.branding.customLogo = logoUrl;
        this._saveBrandingSettings();
        this._applyBranding();
    }
    
    /**
     * Set custom footer text
     */
    setCustomFooter(text) {
        this.branding.customFooter = text;
        this._saveBrandingSettings();
        this._applyBranding();
    }
    
    /**
     * Apply branding to current page
     */
    _applyBranding() {
        // Emit event for game container to handle
        window.dispatchEvent(new CustomEvent('branding:updated', { 
            detail: this.branding 
        }));
    }
    
    /**
     * Check if watermark should be shown
     */
    shouldShowWatermark() {
        return this.branding.showWatermark && this.subscription.tier === 'free';
    }
    
    // ============================================
    // CREDITS SYSTEM
    // ============================================
    
    /**
     * Get current credits
     */
    _getCredits() {
        return this.subscription.credits || 0;
    }
    
    /**
     * Add credits
     */
    async addCredits(amount, source = 'purchase') {
        this.subscription.credits = (this.subscription.credits || 0) + amount;
        this._saveSubscription();
        
        window.dispatchEvent(new CustomEvent('credits:updated', { 
            detail: { credits: this.subscription.credits, amount, source }
        }));
        
        return this.subscription.credits;
    }
    
    /**
     * Deduct credits
     */
    async _deductCredits(amount) {
        if (this.subscription.credits < amount) {
            throw new Error('Insufficient credits');
        }
        
        this.subscription.credits -= amount;
        this._saveSubscription();
        
        window.dispatchEvent(new CustomEvent('credits:updated', { 
            detail: { credits: this.subscription.credits, amount: -amount }
        }));
        
        return this.subscription.credits;
    }
    
    /**
     * Get subscription status
     */
    getSubscription() {
        return { ...this.subscription };
    }
    
    /**
     * Upgrade subscription
     */
    async upgradeSubscription(tier) {
        const validTiers = ['free', 'lite', 'pro', 'max'];
        
        if (!validTiers.includes(tier)) {
            return { success: false, error: 'Invalid tier' };
        }
        
        // In production, this would process payment
        this.subscription.tier = tier;
        
        // Add bonus credits for upgrade
        const bonusCredits = {
            lite: 100,
            pro: 500,
            max: 2000
        };
        
        if (bonusCredits[tier]) {
            this.subscription.credits = (this.subscription.credits || 0) + bonusCredits[tier];
        }
        
        // Update features
        this.subscription.features = this._getTierFeatures(tier);
        
        this._saveSubscription();
        
        window.dispatchEvent(new CustomEvent('subscription:upgraded', { 
            detail: this.subscription
        }));
        
        return { success: true, subscription: this.subscription };
    }
    
    /**
     * Cancel subscription
     */
    async cancelSubscription() {
        this.subscription.tier = 'free';
        this.subscription.features = [];
        this._saveSubscription();
        
        return { success: true };
    }
    
    _getTierFeatures(tier) {
        const features = {
            lite: ['priorityGeneration', 'extendedHistory', 'noAds'],
            pro: ['allLite', 'customBranding', 'premiumTemplates', 'apiAccess'],
            max: ['allPro', 'prioritySupport', 'earlyAccess', 'customModels']
        };
        return features[tier] || [];
    }
    
    _saveSubscription() {
        localStorage.setItem('sgai-subscription', JSON.stringify(this.subscription));
    }
    
    // ============================================
    // PUBLIC API
    // ============================================
    
    /**
     * Get feature availability
     */
    hasFeature(feature) {
        return this.subscription.features?.includes(feature) || 
               this.subscription.tier !== 'free';
    }
    
    /**
     * Get subscription URL
     */
    getSubscriptionUrl() {
        return '/subscription.html';
    }
    
    /**
     * Get upgrade URL
     */
    getUpgradeUrl(tier) {
        return `/subscription.html?tier=${tier}`;
    }
}

// Credits System Class
class CreditsSystem {
    constructor() {
        this.premium = window.PremiumFeatures || null;
        this._init();
    }
    
    _init() {
        console.log('[Credits] Initializing Credits System...');
    }
    
    /**
     * Get current balance
     */
    getBalance() {
        return this.premium?._getCredits() || 0;
    }
    
    /**
     * Purchase credits
     */
    async purchaseCredits(amount, paymentMethod = 'card') {
        // In production, this would process actual payment
        const prices = {
            100: 4.99,
            500: 19.99,
            1000: 34.99,
            5000: 149.99
        };
        
        const price = prices[amount];
        if (!price) {
            return { success: false, error: 'Invalid amount' };
        }
        
        // Simulate payment processing
        await this._simulatePayment(price);
        
        // Add credits
        await this.premium?.addCredits(amount, 'purchase');
        
        return {
            success: true,
            amount,
            price,
            newBalance: this.getBalance()
        };
    }
    
    async _simulatePayment(amount) {
        return new Promise(resolve => setTimeout(resolve, 500));
    }
    
    /**
     * Earn credits (achievements, referrals)
     */
    async earnCredits(amount, reason) {
        await this.premium?.addCredits(amount, reason);
        
        window.dispatchEvent(new CustomEvent('credits:earned', {
            detail: { amount, reason }
        }));
        
        return { success: true, amount };
    }
    
    /**
     * Get credit packages
     */
    getPackages() {
        return [
            { id: 'starter', amount: 100, price: 4.99, bonus: 0, popular: false },
            { id: 'basic', amount: 500, price: 19.99, bonus: 50, popular: false },
            { id: 'pro', amount: 1000, price: 34.99, bonus: 200, popular: true },
            { id: 'enterprise', amount: 5000, price: 149.99, bonus: 1500, popular: false }
        ];
    }
    
    /**
     * Get subscription plans
     */
    getSubscriptionPlans() {
        return [
            { 
                id: 'lite', 
                name: 'Lite', 
                price: 2.99, 
                period: 'monthly',
                credits: 50,
                features: ['Priority generation', 'Extended history', 'No ads']
            },
            { 
                id: 'pro', 
                name: 'Pro', 
                price: 5.99, 
                period: 'monthly',
                credits: 200,
                features: ['Custom branding', 'Premium templates', 'API access', 'All Lite features']
            },
            { 
                id: 'max', 
                name: 'MAX', 
                price: 9.99, 
                period: 'monthly',
                credits: 500,
                features: ['Priority support', 'Early access', 'Custom models', 'All Pro features']
            }
        ];
    }
}

// Template Marketplace Class
class TemplateMarketplace {
    constructor() {
        this.premium = window.PremiumFeatures || null;
        this._init();
    }
    
    _init() {
        console.log('[Marketplace] Initializing Template Marketplace...');
    }
    
    /**
     * Get all templates (premium + user)
     */
    getAllTemplates(category = null, sortBy = 'popular') {
        const premium = this.premium?.getTemplates(category) || [];
        const user = this.premium?.getUserTemplates() || [];
        
        let all = [...premium, ...user];
        
        // Sort
        switch (sortBy) {
            case 'popular':
                all.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
                break;
            case 'rating':
                all.sort((a, b) => (b.rating || 0) - (a.rating || 0));
                break;
            case 'newest':
                all.sort((a, b) => (b.id > a.id ? 1 : -1));
                break;
            case 'price':
                all.sort((a, b) => (a.credits || 0) - (b.credits || 0));
                break;
        }
        
        return all;
    }
    
    /**
     * Search marketplace
     */
    search(query, filters = {}) {
        let results = this.getAllTemplates(filters.category, filters.sortBy);
        
        if (query) {
            const q = query.toLowerCase();
            results = results.filter(t => 
                t.name.toLowerCase().includes(q) ||
                t.description.toLowerCase().includes(q) ||
                t.tags?.some(tag => tag.includes(q))
            );
        }
        
        return results;
    }
    
    /**
     * Purchase template
     */
    async purchaseTemplate(templateId) {
        const template = this.premium?.getTemplate(templateId);
        
        if (!template) {
            // Check user templates
            const userTemplates = this.premium?.getUserTemplates() || [];
            const userTemplate = userTemplates.find(t => t.id === templateId);
            
            if (!userTemplate) {
                return { success: false, error: 'Template not found' };
            }
            
            // User templates are free to use
            return { success: true, template: userTemplate, free: true };
        }
        
        // Premium template - deduct credits
        if (template.credits > 0) {
            const balance = this.premium?.getSubscription()?.credits || 0;
            
            if (balance < template.credits) {
                return { 
                    success: false, 
                    error: 'Insufficient credits',
                    needed: template.credits,
                    have: balance
                };
            }
        }
        
        return { success: true, template };
    }
    
    /**
     * Rate template
     */
    async rateTemplate(templateId, rating) {
        const ratings = this._getRatings();
        ratings[templateId] = rating;
        localStorage.setItem('sgai-template-ratings', JSON.stringify(ratings));
        
        // Update template average (would need backend in production)
        return { success: true };
    }
    
    _getRatings() {
        const stored = localStorage.getItem('sgai-template-ratings');
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                return {};
            }
        }
        return {};
    }
    
    /**
     * Get categories
     */
    getCategories() {
        return [
            { id: 'game', name: 'Games', count: 6 },
            { id: 'story', name: 'Stories', count: 1 },
            { id: 'tool', name: 'Tools', count: 1 }
        ];
    }
}

// Game Marketplace Class
class GameMarketplace {
    constructor() {
        this._init();
    }
    
    _init() {
        console.log('[GameMarket] Initializing Game Marketplace...');
        this._loadListings();
    }
    
    _loadListings() {
        const stored = localStorage.getItem('sgai-game-listings');
        if (stored) {
            try {
                this.listings = JSON.parse(stored);
            } catch (e) {
                this.listings = [];
            }
        } else {
            this.listings = this._getSampleListings();
        }
    }
    
    _getSampleListings() {
        // Sample marketplace listings
        return [
            {
                id: 'sample-1',
                title: 'Dungeon Explorer',
                description: 'Procedural dungeon crawler with 50+ levels',
                price: 499,
                author: 'GameStudio',
                downloads: 1250,
                rating: 4.5,
                thumbnail: '/assets/games/dungeon-explorer.png',
                tags: ['rogue-like', 'dungeon', 'adventure']
            }
        ];
    }
    
    /**
     * List a game on marketplace
     */
    async listGame(gameData) {
        const listing = {
            id: 'listing-' + Date.now(),
            ...gameData,
            author: this._getCurrentUser(),
            createdAt: new Date().toISOString(),
            downloads: 0,
            rating: 0
        };
        
        this.listings.push(listing);
        this._saveListings();
        
        return { success: true, listing };
    }
    
    /**
     * Get all listings
     */
    getListings(filters = {}) {
        let results = [...this.listings];
        
        if (filters.category) {
            results = results.filter(l => l.category === filters.category);
        }
        
        if (filters.maxPrice !== undefined) {
            results = results.filter(l => l.price <= filters.maxPrice);
        }
        
        if (filters.search) {
            const q = filters.search.toLowerCase();
            results = results.filter(l => 
                l.title.toLowerCase().includes(q) ||
                l.description.toLowerCase().includes(q)
            );
        }
        
        // Sort
        switch (filters.sortBy) {
            case 'popular':
                results.sort((a, b) => b.downloads - a.downloads);
                break;
            case 'newest':
                results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                break;
            case 'price-low':
                results.sort((a, b) => a.price - b.price);
                break;
            case 'price-high':
                results.sort((a, b) => b.price - a.price);
                break;
        }
        
        return results;
    }
    
    /**
     * Purchase game
     */
    async purchaseGame(listingId, paymentMethod = 'credits') {
        const listing = this.listings.find(l => l.id === listingId);
        
        if (!listing) {
            return { success: false, error: 'Listing not found' };
        }
        
        // In production, process payment
        // For now, just return success
        
        listing.downloads++;
        this._saveListings();
        
        return { 
            success: true, 
            listing,
            downloadUrl: `/api/games/download/${listingId}`
        };
    }
    
    /**
     * Get featured listings
     */
    getFeatured() {
        return this.listings
            .filter(l => l.featured)
            .sort((a, b) => b.downloads - a.downloads);
    }
    
    /**
     * Get top sellers
     */
    getTopSellers(limit = 10) {
        return [...this.listings]
            .sort((a, b) => b.downloads - a.downloads)
            .slice(0, limit);
    }
    
    _getCurrentUser() {
        return localStorage.getItem('sgai-username') || 'Anonymous';
    }
    
    _saveListings() {
        localStorage.setItem('sgai-game-listings', JSON.stringify(this.listings));
    }
}

// Initialize when DOM ready
document.addEventListener('DOMContentLoaded', () => {
    window.PremiumFeatures = PremiumFeatures;
    window.CreditsSystem = CreditsSystem;
    window.TemplateMarketplace = TemplateMarketplace;
    window.GameMarketplace = GameMarketplace;
    
    // Auto-initialize
    window.premiumFeatures = new PremiumFeatures();
    window.creditsSystem = new CreditsSystem();
    window.templateMarketplace = new TemplateMarketplace();
    window.gameMarketplace = new GameMarketplace();
});

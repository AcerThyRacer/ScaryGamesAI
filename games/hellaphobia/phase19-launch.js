/* ============================================================
   HELLAPHOBIA - PHASE 19: LAUNCH PREPARATION
   Marketing | Trailers | Press Kit | Community | Analytics
   ============================================================ */

(function() {
    'use strict';

    // ===== PHASE 19: LAUNCH CONFIG =====
    const LAUNCH_CONFIG = {
        LAUNCH_DATE: '2026-03-15T00:00:00Z',
        VERSION: '2.0.0',
        BUILD_NUMBER: 1000,
        PLATFORMS: ['web', 'steam', 'itch.io', 'mobile'],
        PRICE: {
            web: 0,
            steam: 14.99,
            itch: 9.99,
            mobile: 4.99
        },
        SOCIAL_LINKS: {
            twitter: 'https://twitter.com/hellaphobia',
            discord: 'https://discord.gg/hellaphobia',
            youtube: 'https://youtube.com/hellaphobia',
            tiktok: 'https://tiktok.com/@hellaphobia',
            reddit: 'https://reddit.com/r/hellaphobia'
        }
    };

    // ===== PHASE 19: MARKETING MANAGER =====
    const MarketingManager = {
        campaigns: [],
        metrics: {
            impressions: 0,
            clicks: 0,
            conversions: 0,
            wishlistAdds: 0
        },

        init() {
            this.loadCampaigns();
            console.log('Phase 19: Marketing Manager initialized');
        },

        // Create marketing campaign
        createCampaign(config) {
            const campaign = {
                id: 'camp_' + Date.now(),
                name: config.name,
                type: config.type, // social, email, influencer, ad
                platform: config.platform,
                startDate: config.startDate,
                endDate: config.endDate,
                budget: config.budget,
                targetAudience: config.targetAudience,
                content: config.content,
                status: 'draft',
                metrics: {
                    impressions: 0,
                    clicks: 0,
                    conversions: 0,
                    spend: 0
                },
                createdAt: Date.now()
            };

            this.campaigns.push(campaign);
            this.saveCampaigns();

            EventTracker.track('marketing_campaign_created', {
                campaignId: campaign.id,
                type: campaign.type
            });

            console.log('[Marketing] Campaign created:', campaign.name);
            return campaign;
        },

        // Launch campaign
        launchCampaign(campaignId) {
            const campaign = this.campaigns.find(c => c.id === campaignId);
            if (campaign) {
                campaign.status = 'active';
                campaign.launchedAt = Date.now();
                this.saveCampaigns();

                EventTracker.track('marketing_campaign_launched', { campaignId });
                console.log('[Marketing] Campaign launched:', campaign.name);
                return true;
            }
            return false;
        },

        // Track campaign impression
        trackImpression(campaignId) {
            const campaign = this.campaigns.find(c => c.id === campaignId);
            if (campaign) {
                campaign.metrics.impressions++;
                this.metrics.impressions++;
            }
        },

        // Track campaign click
        trackClick(campaignId) {
            const campaign = this.campaigns.find(c => c.id === campaignId);
            if (campaign) {
                campaign.metrics.clicks++;
                this.metrics.clicks++;
            }
        },

        // Track conversion
        trackConversion(campaignId) {
            const campaign = this.campaigns.find(c => c.id === campaignId);
            if (campaign) {
                campaign.metrics.conversions++;
                this.metrics.conversions++;
            }
        },

        // Get campaign ROI
        getCampaignROI(campaignId) {
            const campaign = this.campaigns.find(c => c.id === campaignId);
            if (!campaign || campaign.metrics.spend === 0) return 0;
            return (campaign.metrics.conversions * LAUNCH_CONFIG.PRICE.steam) / campaign.metrics.spend;
        },

        // Get all campaigns
        getCampaigns() {
            return this.campaigns;
        },

        // Save campaigns
        saveCampaigns() {
            localStorage.setItem('hellaphobia_marketing_campaigns', JSON.stringify(this.campaigns));
        },

        // Load campaigns
        loadCampaigns() {
            const saved = localStorage.getItem('hellaphobia_marketing_campaigns');
            if (saved) {
                this.campaigns = JSON.parse(saved);
            }
        },

        // Get marketing metrics
        getMetrics() {
            return {
                ...this.metrics,
                ctr: this.metrics.impressions > 0 ? 
                    (this.metrics.clicks / this.metrics.impressions * 100).toFixed(2) + '%' : '0%',
                conversionRate: this.metrics.clicks > 0 ?
                    (this.metrics.conversions / this.metrics.clicks * 100).toFixed(2) + '%' : '0%'
            };
        }
    };

    // ===== PHASE 19: TRAILER MANAGER =====
    const TrailerManager = {
        trailers: [],
        clips: [],

        init() {
            this.loadTrailers();
            console.log('Phase 19: Trailer Manager initialized');
        },

        // Create trailer
        createTrailer(config) {
            const trailer = {
                id: 'trailer_' + Date.now(),
                title: config.title,
                description: config.description,
                type: config.type, // announcement, gameplay, launch, feature
                duration: config.duration,
                thumbnail: config.thumbnail,
                videoUrl: config.videoUrl,
                platforms: config.platforms || ['all'],
                releaseDate: config.releaseDate,
                status: 'draft',
                views: 0,
                likes: 0,
                shares: 0,
                createdAt: Date.now()
            };

            this.trailers.push(trailer);
            this.saveTrailers();

            EventTracker.track('trailer_created', { trailerId: trailer.id });
            console.log('[Trailer] Created:', trailer.title);

            return trailer;
        },

        // Generate trailer from gameplay
        async generateTrailerFromGameplay(highlights) {
            // Simulate trailer generation from gameplay highlights
            const trailer = {
                id: 'trailer_' + Date.now(),
                title: 'Gameplay Highlights Trailer',
                type: 'gameplay',
                highlights: highlights,
                duration: highlights.length * 10, // 10 seconds per highlight
                status: 'processing',
                createdAt: Date.now()
            };

            // Simulate processing
            setTimeout(() => {
                trailer.status = 'ready';
                trailer.videoUrl = 'generated_trailer_' + trailer.id;
                this.trailers.push(trailer);
                this.saveTrailers();
                console.log('[Trailer] Generated from gameplay:', trailer.id);
            }, 5000);

            return trailer;
        },

        // Record gameplay clip
        recordClip(duration = 30) {
            const clip = {
                id: 'clip_' + Date.now(),
                startTime: Date.now(),
                duration: duration,
                frames: [],
                status: 'recording'
            };

            this.clips.push(clip);
            console.log('[Trailer] Recording clip:', clip.id);
            return clip;
        },

        // Stop recording clip
        stopClip(clipId) {
            const clip = this.clips.find(c => c.id === clipId);
            if (clip) {
                clip.endTime = Date.now();
                clip.status = 'saved';
                console.log('[Trailer] Clip saved:', clip.id);
                return clip;
            }
            return null;
        },

        // Publish trailer
        publishTrailer(trailerId, platforms) {
            const trailer = this.trailers.find(t => t.id === trailerId);
            if (trailer) {
                trailer.status = 'published';
                trailer.publishedAt = Date.now();
                trailer.platforms = platforms;
                this.saveTrailers();

                EventTracker.track('trailer_published', { trailerId, platforms });
                console.log('[Trailer] Published:', trailer.title);
                return true;
            }
            return false;
        },

        // Track trailer view
        trackView(trailerId) {
            const trailer = this.trailers.find(t => t.id === trailerId);
            if (trailer) {
                trailer.views++;
            }
        },

        // Get all trailers
        getTrailers() {
            return this.trailers;
        },

        // Save trailers
        saveTrailers() {
            localStorage.setItem('hellaphobia_trailers', JSON.stringify(this.trailers));
        },

        // Load trailers
        loadTrailers() {
            const saved = localStorage.getItem('hellaphobia_trailers');
            if (saved) {
                this.trailers = JSON.parse(saved);
            }
        }
    };

    // ===== PHASE 19: PRESS KIT MANAGER =====
    const PressKitManager = {
        assets: {
            logos: [],
            screenshots: [],
            artwork: [],
            videos: [],
            documents: []
        },
        pressContacts: [],
        pressReleases: []

        init() {
            this.loadAssets();
            console.log('Phase 19: Press Kit Manager initialized');
        },

        // Add press asset
        addAsset(asset) {
            const category = asset.category; // logo, screenshot, artwork, video, document
            if (!this.assets[category]) {
                this.assets[category] = [];
            }

            const fullAsset = {
                id: 'asset_' + Date.now(),
                ...asset,
                uploadedAt: Date.now(),
                downloads: 0
            };

            this.assets[category].push(fullAsset);
            this.saveAssets();

            EventTracker.track('press_asset_added', { category, assetId: fullAsset.id });
            console.log('[PressKit] Asset added:', fullAsset.name);

            return fullAsset;
        },

        // Download asset
        downloadAsset(assetId) {
            for (const category in this.assets) {
                const asset = this.assets[category].find(a => a.id === assetId);
                if (asset) {
                    asset.downloads++;
                    this.saveAssets();
                    return asset;
                }
            }
            return null;
        },

        // Create press release
        createPressRelease(release) {
            const pr = {
                id: 'pr_' + Date.now(),
                title: release.title,
                content: release.content,
                embargoDate: release.embargoDate,
                publishDate: release.publishDate,
                contacts: release.contacts || [],
                status: 'draft',
                createdAt: Date.now()
            };

            this.pressReleases.push(pr);
            this.savePressReleases();

            EventTracker.track('press_release_created', { prId: pr.id });
            console.log('[PressKit] Press release created:', pr.title);

            return pr;
        },

        // Add press contact
        addPressContact(contact) {
            this.pressContacts.push({
                id: 'contact_' + Date.now(),
                ...contact,
                addedAt: Date.now()
            });
            this.savePressContacts();
        },

        // Get press kit
        getPressKit() {
            return {
                gameInfo: {
                    title: 'HELLAPHOBIA',
                    version: LAUNCH_CONFIG.VERSION,
                    developer: 'ScaryGamesAI',
                    publisher: 'ScaryGamesAI',
                    releaseDate: LAUNCH_CONFIG.LAUNCH_DATE,
                    platforms: LAUNCH_CONFIG.PLATFORMS,
                    price: LAUNCH_CONFIG.PRICE,
                    genres: ['Horror', 'Action', 'Psychological', 'Platformer'],
                    features: [
                        '10 Epic Boss Battles',
                        '100+ Achievements',
                        '5 Difficulty Levels',
                        '12 Language Support',
                        'Mod Support with Workshop',
                        'Co-op Multiplayer',
                        'Level Editor',
                        'Psychological Horror'
                    ],
                    description: 'A psychological horror dungeon crawler with 100+ hours of content, featuring 10 unique bosses, deep combat systems, and mind-bending 4th wall breaking narrative.',
                    shortDescription: 'Psychological horror masterpiece with 18 phases of terror'
                },
                assets: this.assets,
                pressReleases: this.pressReleases,
                socialLinks: LAUNCH_CONFIG.SOCIAL_LINKS,
                keyArt: this.assets.artwork.filter(a => a.isKeyArt),
                screenshots: this.assets.screenshots,
                logos: this.assets.logos,
                trailers: TrailerManager.getTrailers()
            };
        },

        // Save assets
        saveAssets() {
            localStorage.setItem('hellaphobia_press_assets', JSON.stringify(this.assets));
        },

        // Load assets
        loadAssets() {
            const saved = localStorage.getItem('hellaphobia_press_assets');
            if (saved) {
                this.assets = JSON.parse(saved);
            }
        },

        // Save press releases
        savePressReleases() {
            localStorage.setItem('hellaphobia_press_releases', JSON.stringify(this.pressReleases));
        },

        // Load press releases
        loadPressReleases() {
            const saved = localStorage.getItem('hellaphobia_press_releases');
            if (saved) {
                this.pressReleases = JSON.parse(saved);
            }
        },

        // Save press contacts
        savePressContacts() {
            localStorage.setItem('hellaphobia_press_contacts', JSON.stringify(this.pressContacts));
        },

        // Load press contacts
        loadPressContacts() {
            const saved = localStorage.getItem('hellaphobia_press_contacts');
            if (saved) {
                this.pressContacts = JSON.parse(saved);
            }
        }
    };

    // ===== PHASE 19: COMMUNITY MANAGER =====
    const CommunityManager = {
        events: [],
        announcements: [],
        communityStats: {
            discordMembers: 0,
            twitterFollowers: 0,
            redditSubscribers: 0,
            youtubeSubscribers: 0
        },

        init() {
            this.loadEvents();
            this.loadAnnouncements();
            console.log('Phase 19: Community Manager initialized');
        },

        // Create community event
        createEvent(event) {
            const fullEvent = {
                id: 'event_' + Date.now(),
                title: event.title,
                description: event.description,
                type: event.type, // stream, tournament, qna, launch
                startDate: event.startDate,
                endDate: event.endDate,
                platform: event.platform,
                prize: event.prize,
                registrationOpen: event.registrationOpen || false,
                participants: [],
                status: 'upcoming',
                createdAt: Date.now()
            };

            this.events.push(fullEvent);
            this.saveEvents();

            EventTracker.track('community_event_created', { eventId: fullEvent.id });
            console.log('[Community] Event created:', fullEvent.title);

            return fullEvent;
        },

        // Register for event
        registerForEvent(eventId, userId) {
            const event = this.events.find(e => e.id === eventId);
            if (event && event.registrationOpen) {
                if (!event.participants.includes(userId)) {
                    event.participants.push(userId);
                    this.saveEvents();
                    return true;
                }
            }
            return false;
        },

        // Create announcement
        createAnnouncement(announcement) {
            const fullAnnouncement = {
                id: 'announce_' + Date.now(),
                title: announcement.title,
                content: announcement.content,
                type: announcement.type, // update, event, news, patch
                priority: announcement.priority || 'normal',
                publishDate: announcement.publishDate || Date.now(),
                expiryDate: announcement.expiryDate,
                platforms: announcement.platforms || ['all'],
                views: 0,
                createdAt: Date.now()
            };

            this.announcements.push(fullAnnouncement);
            this.saveAnnouncements();

            EventTracker.track('announcement_created', { announceId: fullAnnouncement.id });
            console.log('[Community] Announcement created:', fullAnnouncement.title);

            return fullAnnouncement;
        },

        // Track announcement view
        trackAnnouncementView(announceId) {
            const announcement = this.announcements.find(a => a.id === announceId);
            if (announcement) {
                announcement.views++;
            }
        },

        // Update community stats
        updateStats(stats) {
            this.communityStats = { ...this.communityStats, ...stats };
            EventTracker.track('community_stats_updated', this.communityStats);
        },

        // Get active events
        getActiveEvents() {
            const now = Date.now();
            return this.events.filter(e => 
                e.status === 'upcoming' && e.startDate <= now && e.endDate >= now
            );
        },

        // Get announcements
        getAnnouncements(limit = 10) {
            return this.announcements
                .sort((a, b) => b.publishDate - a.publishDate)
                .slice(0, limit);
        },

        // Save events
        saveEvents() {
            localStorage.setItem('hellaphobia_community_events', JSON.stringify(this.events));
        },

        // Load events
        loadEvents() {
            const saved = localStorage.getItem('hellaphobia_community_events');
            if (saved) {
                this.events = JSON.parse(saved);
            }
        },

        // Save announcements
        saveAnnouncements() {
            localStorage.setItem('hellaphobia_announcements', JSON.stringify(this.announcements));
        },

        // Load announcements
        loadAnnouncements() {
            const saved = localStorage.getItem('hellaphobia_announcements');
            if (saved) {
                this.announcements = JSON.parse(saved);
            }
        }
    };

    // ===== PHASE 19: LAUNCH MANAGER =====
    const LaunchManager = {
        launchChecklist: [],
        launchMetrics: {
            wishlists: 0,
            preOrders: 0,
            day1Players: 0,
            peakConcurrent: 0,
            reviews: { positive: 0, negative: 0 }
        },
        countdown: null,

        init() {
            this.loadChecklist();
            this.startCountdown();
            console.log('Phase 19: Launch Manager initialized');
        },

        // Add launch checklist item
        addChecklistItem(item) {
            this.launchChecklist.push({
                id: 'task_' + Date.now(),
                name: item.name,
                category: item.category, // marketing, technical, community, legal
                status: 'pending', // pending, in_progress, complete
                assignedTo: item.assignedTo,
                dueDate: item.dueDate,
                completedAt: null,
                createdAt: Date.now()
            });
            this.saveChecklist();
        },

        // Complete checklist item
        completeItem(itemId) {
            const item = this.launchChecklist.find(i => i.id === itemId);
            if (item) {
                item.status = 'complete';
                item.completedAt = Date.now();
                this.saveChecklist();
                EventTracker.track('launch_task_completed', { itemId });
            }
        },

        // Get launch checklist progress
        getChecklistProgress() {
            const total = this.launchChecklist.length;
            const completed = this.launchChecklist.filter(i => i.status === 'complete').length;
            return {
                total,
                completed,
                remaining: total - completed,
                percent: total > 0 ? Math.round((completed / total) * 100) : 0
            };
        },

        // Start launch countdown
        startCountdown() {
            const launchDate = new Date(LAUNCH_CONFIG.LAUNCH_DATE).getTime();

            this.countdown = setInterval(() => {
                const now = Date.now();
                const distance = launchDate - now;

                if (distance < 0) {
                    clearInterval(this.countdown);
                    this.onLaunch();
                    return;
                }

                const days = Math.floor(distance / (1000 * 60 * 60 * 24));
                const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((distance % (1000 * 60)) / 1000);

                console.log(`[Launch] Countdown: ${days}d ${hours}h ${minutes}m ${seconds}s`);
            }, 1000);
        },

        // Launch handler
        onLaunch() {
            console.log('[Launch] 🚀 LAUNCH DAY! Hellaphobia is now live!');
            EventTracker.track('game_launched', {
                version: LAUNCH_CONFIG.VERSION,
                date: new Date().toISOString()
            });

            // Create launch announcement
            CommunityManager.createAnnouncement({
                title: '🎉 Hellaphobia is Now Live!',
                content: 'The nightmare begins! Hellaphobia 2.0 is officially released with 18 phases of psychological horror. Thank you to our amazing community!',
                type: 'news',
                priority: 'high'
            });
        },

        // Track wishlist
        trackWishlist(platform) {
            this.launchMetrics.wishlists++;
            EventTracker.track('wishlist_added', { platform });
        },

        // Track pre-order
        trackPreOrder(platform) {
            this.launchMetrics.preOrders++;
            EventTracker.track('preorder', { platform });
        },

        // Track player
        trackPlayer(isConcurrent = true) {
            this.launchMetrics.day1Players++;
            if (isConcurrent) {
                this.launchMetrics.peakConcurrent = Math.max(
                    this.launchMetrics.peakConcurrent,
                    this.launchMetrics.day1Players
                );
            }
        },

        // Add review
        addReview(isPositive) {
            if (isPositive) {
                this.launchMetrics.reviews.positive++;
            } else {
                this.launchMetrics.reviews.negative++;
            }
        },

        // Get launch metrics
        getMetrics() {
            const total = this.launchMetrics.reviews.positive + this.launchMetrics.reviews.negative;
            return {
                ...this.launchMetrics,
                reviewScore: total > 0 ? 
                    Math.round((this.launchMetrics.reviews.positive / total) * 100) : 0,
                checklistProgress: this.getChecklistProgress()
            };
        },

        // Save checklist
        saveChecklist() {
            localStorage.setItem('hellaphobia_launch_checklist', JSON.stringify(this.launchChecklist));
        },

        // Load checklist
        loadChecklist() {
            const saved = localStorage.getItem('hellaphobia_launch_checklist');
            if (saved) {
                this.launchChecklist = JSON.parse(saved);
            }
        },

        // Stop countdown
        stopCountdown() {
            if (this.countdown) {
                clearInterval(this.countdown);
            }
        }
    };

    // ===== PHASE 19: ANALYTICS DASHBOARD =====
    const AnalyticsDashboard = {
        realTimeData: {
            activePlayers: 0,
            newPlayers: 0,
            sessions: 0,
                revenue: 0
        },
        historicalData: [],

        init() {
            console.log('Phase 19: Analytics Dashboard initialized');
        },

        // Update real-time data
        updateRealTime(data) {
            this.realTimeData = { ...this.realTimeData, ...data };
        },

        // Record historical data point
        recordDataPoint() {
            this.historicalData.push({
                timestamp: Date.now(),
                ...this.realTimeData
            });

            // Keep last 24 hours (1440 minutes)
            if (this.historicalData.length > 1440) {
                this.historicalData.shift();
            }
        },

        // Get dashboard data
        getDashboard() {
            return {
                realTime: this.realTimeData,
                historical: this.historicalData.slice(-60), // Last hour
                launchMetrics: LaunchManager.getMetrics(),
                marketingMetrics: MarketingManager.getMetrics(),
                communityStats: CommunityManager.communityStats
            };
        },

        // Export analytics report
        exportReport() {
            return {
                generatedAt: Date.now(),
                version: LAUNCH_CONFIG.VERSION,
                launchDate: LAUNCH_CONFIG.LAUNCH_DATE,
                realTime: this.realTimeData,
                historical: this.historicalData,
                launchMetrics: LaunchManager.getMetrics(),
                marketingMetrics: MarketingManager.getMetrics(),
                campaigns: MarketingManager.getCampaigns(),
                trailers: TrailerManager.getTrailers(),
                pressKit: PressKitManager.getPressKit(),
                communityStats: CommunityManager.communityStats,
                events: CommunityManager.events,
                announcements: CommunityManager.announcements
            };
        }
    };

    // ===== PHASE 19: MAIN LAUNCH MANAGER =====
    const Phase19Launch = {
        initialized: false,

        init() {
            if (this.initialized) return;

            MarketingManager.init();
            TrailerManager.init();
            PressKitManager.init();
            CommunityManager.init();
            LaunchManager.init();
            AnalyticsDashboard.init();

            this.initialized = true;
            console.log('Phase 19: Launch Preparation initialized');
        },

        // Marketing
        createCampaign: (config) => MarketingManager.createCampaign(config),
        launchCampaign: (id) => MarketingManager.launchCampaign(id),
        getMarketingMetrics: () => MarketingManager.getMetrics(),

        // Trailers
        createTrailer: (config) => TrailerManager.createTrailer(config),
        getTrailers: () => TrailerManager.getTrailers(),

        // Press Kit
        getPressKit: () => PressKitManager.getPressKit(),
        addPressAsset: (asset) => PressKitManager.addAsset(asset),

        // Community
        createEvent: (event) => CommunityManager.createEvent(event),
        createAnnouncement: (ann) => CommunityManager.createAnnouncement(ann),
        getAnnouncements: (limit) => CommunityManager.getAnnouncements(limit),

        // Launch
        addChecklistItem: (item) => LaunchManager.addChecklistItem(item),
        completeItem: (id) => LaunchManager.completeItem(id),
        getLaunchProgress: () => LaunchManager.getChecklistProgress(),
        getLaunchMetrics: () => LaunchManager.getMetrics(),

        // Analytics
        getDashboard: () => AnalyticsDashboard.getDashboard(),
        exportReport: () => AnalyticsDashboard.exportReport()
    };

    // Export Phase 19 systems
    window.Phase19Launch = Phase19Launch;
    window.MarketingManager = MarketingManager;
    window.TrailerManager = TrailerManager;
    window.PressKitManager = PressKitManager;
    window.CommunityManager = CommunityManager;
    window.LaunchManager = LaunchManager;
    window.AnalyticsDashboard = AnalyticsDashboard;
    window.LAUNCH_CONFIG = LAUNCH_CONFIG;

})();

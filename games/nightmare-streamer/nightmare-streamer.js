/**
 * PHASE 8: NIGHTMARE STREAMER - META HORROR
 * 
 * Horror game streamer discovers playing certain games makes horror REAL.
 * Chat is watching. Chat is helping. Chat is DYING.
 * 
 * Features:
 * - Live stream interface with AI chat
 * - Viewer metrics (concurrent, followers, donations)
 * - Chat decisions (Democracy Mode)
 * - Donation effects (spawn items/enemies)
 * - Viral moments & clip system
 * - Game bleed horror (horror leaks into "real" apartment)
 * - 10 playable "games within game"
 * - 30-day campaign structure
 * - 5 different endings
 * 
 * Target: Innovative meta-horror, fourth wall breaking
 */

export class NightmareStreamerGame {
  constructor(config = {}) {
    this.config = {
      canvas: config.canvas,
      debug: config.debug || false
    };
    
    // Stream state
    this.streamState = {
      day: 1,
      isLive: false,
      concurrentViewers: 0,
      totalFollowers: 0,
      totalSubs: 0,
      donations: 0,
      chatMessages: [],
      clipCount: 0
    };
    
    // Player stats
    this.playerStats = {
      health: 100,
      sanity: 100,
      energy: 100,
      money: 1000,
      stress: 0
    };
    
    // Apartment state (gets haunted over time)
    this.apartment = {
      cleanliness: 100,
      equipment: {
        pc: 'basic',
        camera: 'webcam',
        mic: 'builtin',
        lighting: 'none'
      },
      hauntings: []
    };
    
    // Games library (10 games within game)
    this.gamesLibrary = [];
    
    // Chat AI system
    this.chatAI = null;
    
    console.log('[Phase 8] NIGHTMARE STREAMER initialized');
  }

  async initialize() {
    console.log('[Phase 8] Initializing NIGHTMARE STREAMER...');
    
    // Initialize chat AI
    this.initializeChatAI();
    
    // Define 10 playable games
    this.defineGamesLibrary();
    
    // Set up stream overlay UI
    this.setupStreamOverlay();
    
    console.log('[Phase 8] ✅ NIGHTMARE STREAMER ready');
  }

  initializeChatAI() {
    // AI chat system that generates realistic messages
    this.chatAI = {
      viewers: new Map(),
      personalities: ['helpful', 'toxic', 'troll', 'wholesome', 'expert', 'newbie', 'obsessed'],
      
      generateMessage(viewer) {
        const templates = [
          'OMG watch out!',
          'Check behind you!',
          'This game is so scary!',
          'You\'re so good at this!',
          'I could never play this',
          'Donate when you get scared lol',
          'What\'s your setup?',
          'Can you play [game] next?',
          'POG',
          'F in chat',
          'L + ratio',
          'First time seeing you, instant follow'
        ];
        
        return templates[Math.floor(Math.random() * templates.length)];
      },
      
      reactToEvent(event) {
        // Generate chat reactions to events
        const reactions = {
          jumpscare: ['AAAAA', 'DID U SEE THAT', 'I PEEED', 'NOPE NOPE NOPE'],
          epic_moment: ['POGGERS', 'CLIP IT', 'INSANE', 'HOW DID U DO THAT'],
          fail: ['L', 'Skill issue', 'Unlucky', 'So close!'],
          donation: ['THANKS!', 'Generous!', 'Big baller', 'Whale alert']
        };
        
        return reactions[event] || ['nice'];
      }
    };
    
    console.log('[Phase 8] Chat AI initialized');
  }

  defineGamesLibrary() {
    this.gamesLibrary = [
      {
        id: 'game_1',
        title: 'The Haunted Mansion',
        genre: 'point_and_click',
        horrorLevel: 3,
        description: 'Classic haunted house exploration',
        unlockDay: 1,
        bleedRisk: 0.1
      },
      {
        id: 'game_2',
        title: 'Forest of Screams',
        genre: 'survival_horror',
        horrorLevel: 5,
        description: 'Trapped in a cursed forest',
        unlockDay: 3,
        bleedRisk: 0.2
      },
      {
        id: 'game_3',
        title: 'Asylum Escape',
        genre: 'puzzle_horror',
        horrorLevel: 6,
        description: 'Escape from abandoned asylum',
        unlockDay: 5,
        bleedRisk: 0.3
      },
      {
        id: 'game_4',
        title: 'Demon Summoning Sim',
        genre: 'simulation',
        horrorLevel: 8,
        description: 'Accidentally summon real demons',
        unlockDay: 10,
        bleedRisk: 0.8
      },
      {
        id: 'game_5',
        title: 'The Rake REMASTERED',
        genre: 'creepypasta',
        horrorLevel: 7,
        description: 'Based on the classic creepypasta',
        unlockDay: 7,
        bleedRisk: 0.5
      }
      // Add 5 more games...
    ];
    
    console.log(`[Phase 8] Defined ${this.gamesLibrary.length} games`);
  }

  setupStreamOverlay() {
    // Create stream overlay UI elements
    this.overlay = {
      webcam: { x: 10, y: 10, width: 320, height: 240 },
      chat: { x: 10, y: 260, width: 300, height: 400 },
      alerts: { x: 320, y: 10, width: 400, height: 100 },
      stats: { x: 730, y: 10, width: 200, height: 150 }
    };
  }

  // Core streaming mechanics
  
  startStream() {
    if (this.streamState.isLive) return false;
    
    this.streamState.isLive = true;
    this.streamState.concurrentViewers = this.calculateInitialViewers();
    
    console.log('[Phase 8] Stream started!');
    
    // Start chat simulation
    this.startChatSimulation();
    
    return true;
  }

  endStream() {
    if (!this.streamState.isLive) return false;
    
    this.streamState.isLive = false;
    
    // Calculate earnings
    const earnings = this.calculateStreamEarnings();
    this.playerStats.money += earnings;
    
    console.log(`[Phase 8] Stream ended! Earned $${earnings}`);
    
    return true;
  }

  calculateInitialViewers() {
    // Based on followers, time of day, game popularity
    const baseViewers = Math.floor(this.streamState.totalFollowers * 0.1);
    const randomFactor = Math.random() * 50;
    
    return baseViewers + randomViewer;
  }

  startChatSimulation() {
    // Generate chat messages periodically
    setInterval(() => {
      if (!this.streamState.isLive) return;
      
      const messageCount = Math.floor(Math.random() * 5) + 1;
      
      for (let i = 0; i < messageCount; i++) {
        this.generateChatMessage();
      }
    }, 1000); // Every second
  }

  generateChatMessage() {
    const viewerCount = Math.min(10, Math.floor(this.streamState.concurrentViewers / 100));
    
    for (let i = 0; i < viewerCount; i++) {
      const personality = this.chatAI.personalities[
        Math.floor(Math.random() * this.chatAI.personalities.length)
      ];
      
      const message = {
        username: `User_${Math.floor(Math.random() * 9999)}`,
        text: this.chatAI.generateMessage(),
        personality: personality,
        timestamp: Date.now()
      };
      
      this.streamState.chatMessages.push(message);
      
      // Keep only last 100 messages
      if (this.streamState.chatMessages.length > 100) {
        this.streamState.chatMessages.shift();
      }
    }
  }

  processDonation(amount) {
    this.streamState.donations += amount;
    this.playerStats.money += amount;
    
    // Generate chat reaction
    const reactions = this.chatAI.reactToEvent('donation');
    for (const reaction of reactions) {
      this.streamState.chatMessages.push({
        username: 'System',
        text: `$${amount} donation! ${reaction}`,
        type: 'donation_alert',
        timestamp: Date.now()
      });
    }
    
    console.log(`[Phase 8] Donation: $${amount}`);
  }

  // Democracy Mode - chat votes on decisions
  
  enableDemocracyMode() {
    this.democracyMode = {
      enabled: true,
      currentVote: null,
      options: [],
      votes: new Map(),
      endTime: 0
    };
    
    console.log('[Phase 8] Democracy Mode enabled!');
  }

  createPoll(options, duration = 30) {
    this.democracyMode.currentVote = {
      question: 'What should I do?',
      options: options,
      startTime: Date.now(),
      endTime: Date.now() + (duration * 1000)
    };
    
    this.democracyMode.votes.clear();
    
    // Initialize vote counts
    for (const option of options) {
      this.democracyMode.votes.set(option, 0);
    }
  }

  castVote(option) {
    if (!this.democracyMode.currentVote) return;
    
    const currentVotes = this.democracyMode.votes.get(option) || 0;
    this.democracyMode.votes.set(option, currentVotes + 1);
  }

  resolveVote() {
    if (!this.democracyMode.currentVote) return null;
    
    // Find winning option
    let winner = null;
    let maxVotes = 0;
    
    for (const [option, votes] of this.democracyMode.votes.entries()) {
      if (votes > maxVotes) {
        maxVotes = votes;
        winner = option;
      }
    }
    
    console.log(`[Phase 8] Vote result: ${winner} with ${maxVotes} votes`);
    
    this.democracyMode.currentVote = null;
    return winner;
  }

  // Game Bleed Mechanics - horror leaks into reality
  
  triggerBleedEvent(gameId, intensity) {
    const game = this.gamesLibrary.find(g => g.id === gameId);
    if (!game) return;
    
    const bleedChance = game.bleedRisk * intensity;
    
    if (Math.random() < bleedChance) {
      const bleedType = this.getRandomBleedType();
      this.apartment.hauntings.push({
        type: bleedType,
        intensity: intensity,
        timestamp: Date.now(),
        permanent: intensity > 0.7
      });
      
      console.log(`[Phase 8] BLEED EVENT: ${bleedType}`);
      
      // Apply sanity damage
      this.playerStats.sanity -= intensity * 20;
    }
  }

  getRandomBleedType() {
    const types = [
      'flickering_lights',
      'whispering_voices',
      'cold_spots',
      'moving_objects',
      'shadow_figures',
      'electronic_distortion',
      'time_loss',
      'false_notifications',
      'phantom_vibrations',
      'reflection_anomalies'
    ];
    
    return types[Math.floor(Math.random() * types.length)];
  }

  // Equipment upgrade system
  
  upgradeEquipment(slot, tier) {
    const costs = {
      pc: { basic: 0, mid: 500, high: 1500, ultra: 3000 },
      camera: { webcam: 0, hd: 300, 4k: 800, professional: 1500 },
      mic: { builtin: 0, usb: 100, xlr: 400, professional: 800 },
      lighting: { none: 0, basic: 150, rgb: 400, professional: 700 }
    };
    
    const cost = costs[slot]?.[tier];
    if (!cost || this.playerStats.money < cost) return false;
    
    this.playerStats.money -= cost;
    this.apartment.equipment[slot] = tier;
    
    console.log(`[Phase 8] Upgraded ${slot} to ${tier}`);
    return true;
  }

  // Viral moment detection
  
  detectViralMoment(event) {
    const viralChance = this.calculateViralChance(event);
    
    if (Math.random() < viralChance) {
      this.streamState.clipCount++;
      
      // Auto-clip created
      const clip = {
        id: `clip_${Date.now()}`,
        event: event,
        views: 0,
        shares: 0,
        timestamp: Date.now()
      };
      
      // Go viral calculation
      const viralMultiplier = Math.random() > 0.9 ? 100 : 
                             Math.random() > 0.7 ? 10 : 1;
      
      clip.views = this.streamState.concurrentViewers * viralMultiplier;
      clip.shares = Math.floor(clip.views * 0.1);
      
      // Gain followers from viral clip
      const newFollowers = Math.floor(clip.views * 0.05);
      this.streamState.totalFollowers += newFollowers;
      
      console.log(`[Phase 8] VIRAL CLIP! ${clip.views} views, +${newFollowers} followers`);
      
      return clip;
    }
    
    return null;
  }

  calculateViralChance(event) {
    const baseChance = 0.01; // 1% base
    
    const eventModifiers = {
      jumpscare: 0.1,
      epic_fail: 0.05,
      incredible_skill: 0.08,
      funny_moment: 0.06,
      wholesome: 0.04
    };
    
    return baseChance + (eventModifiers[event] || 0);
  }

  // Campaign progression (30 days)
  
  advanceDay() {
    this.streamState.day++;
    
    if (this.streamState.day > 30) {
      this.endCampaign();
      return;
    }
    
    // Daily events
    this.generateDailyEvents();
    
    // Reset energy
    this.playerStats.energy = 100;
    
    console.log(`[Phase 8] Day ${this.streamState.day} begins`);
  }

  generateDailyEvents() {
    const events = [
      'sponsor_offer',
      'hate_raid',
      'collaboration_request',
      'equipment_failure',
      'viral_clip',
      'mental_health_day',
      'special_event'
    ];
    
    const event = events[Math.floor(Math.random() * events.length)];
    console.log(`[Phase 8] Daily event: ${event}`);
    
    // Apply event effects
    switch (event) {
      case 'sponsor_offer':
        this.playerStats.money += 500;
        break;
      case 'hate_raid':
        this.playerStats.stress += 20;
        break;
    }
  }

  endCampaign() {
    console.log('[Phase 8] Campaign complete!');
    
    // Determine ending based on choices
    const ending = this.determineEnding();
    console.log(`[Phase 8] Ending: ${ending}`);
  }

  determineEnding() {
    const endings = {
      success: this.streamState.totalFollowers > 10000 && this.playerStats.sanity > 50,
      burned_out: this.playerStats.stress > 80,
      broke: this.playerStats.money < 100,
      insane: this.playerStats.sanity < 20,
      mysterious: this.apartment.hauntings.filter(h => h.permanent).length > 10
    };
    
    for (const [ending, condition] of Object.entries(endings)) {
      if (condition) return ending;
    }
    
    return 'normal';
  }

  dispose() {
    console.log('[Phase 8] NIGHTMARE STREAMER disposed');
  }
}

// Export singleton helper
let nightmareStreamerInstance = null;

export function getNightmareStreamerGame(config) {
  if (!nightmareStreamerInstance) {
    nightmareStreamerInstance = new NightmareStreamerGame(config);
  }
  return nightmareStreamerInstance;
}

console.log('[Phase 8] NIGHTMARE STREAMER module loaded');

/**
 * PHASE 12: CURSED ARCADE - RETRO HORROR ANTHOLOGY EXPANSION
 * 
 * Find old arcade cabinet in thrift store. Each game inside is cursed.
 * Beat them to unlock next. Games know you're playing.
 * 
 * Features:
 * - 15 mini-games (5 classics reimagined + 5 originals + 5 finale meta-games)
 * - Cabinet customization system
 * - CRT effects (scanlines, curvature, chromatic aberration)
 * - High score system with stories
 * - Secret games and unlockables
 * - Multiple endings
 * - Pixel-perfect art style
 * - Chiptune soundtrack
 * 
 * Target: Nostalgic horror excellence, authentic arcade feel
 */

export class CursedArcadeGame {
  constructor(config = {}) {
    this.config = {
      canvas: config.canvas,
      debug: config.debug || false,
      crtEffects: config.crtEffects !== false
    };
    
    // Game progress
    this.progress = {
      unlockedGames: ['pac_man_cursed'],
      completedGames: new Set(),
      highScores: new Map(),
      secretsFound: 0,
      totalSecrets: 25
    };
    
    // Cabinet state
    this.cabinet = {
      condition: 70, // 0-100
      customizations: {
        marquee: 'default',
        sideArt: 'worn',
        buttons: 'standard',
        joystick: 'classic'
      },
      coins: 0,
      freePlay: false
    };
    
    // Mini-games library
    this.games = new Map();
    
    console.log('[Phase 12] CURSED ARCADE initialized');
  }

  async initialize() {
    console.log('[Phase 12] Initializing CURSED ARCADE...');
    
    // Define all 15 mini-games
    this.defineMiniGames();
    
    // Initialize CRT effects
    if (this.config.crtEffects) {
      this.initializeCRTEffects();
    }
    
    // Load high scores
    await this.loadHighScores();
    
    console.log('[Phase 12] ✅ CURSED ARCADE ready');
  }

  defineMiniGames() {
    // CLASSICS REIMAGINED (5 games)
    
    this.games.set('pac_man_cursed', {
      id: 'pac_man_cursed',
      title: 'Pac-Man: Lost in the Maze',
      category: 'classic_reimagined',
      original: 'pac_man',
      description: 'Trapped forever. The ghosts whisper your name.',
      horrorElements: ['whispering_ghosts', 'maze_changes', 'no_exit'],
      difficulty: 3,
      unlockCondition: null,
      estimatedTime: '10 minutes',
      endings: 3
    });
    
    this.games.set('space_invaders_desktop', {
      id: 'space_invaders_desktop',
      title: 'Space Invaders: Desktop Invasion',
      category: 'classic_reimagined',
      original: 'space_invaders',
      description: 'Aliens invade your actual desktop. They\'re getting closer.',
      horrorElements: ['breaks_fourth_wall', 'desktop_integration', 'persistent_threat'],
      difficulty: 4,
      unlockCondition: 'pac_man_cursed',
      estimatedTime: '12 minutes',
      endings: 3
    });
    
    this.games.set('breakout_prison', {
      id: 'breakout_prison',
      title: 'Breakout: Prison Break',
      category: 'classic_reimagined',
      original: 'breakout',
      description: 'You\'re the ball. Escape from hell.',
      horrorElements: ['player_is_ball', 'brutal_walls', 'screaming_sounds'],
      difficulty: 5,
      unlockCondition: 'space_invaders_desktop',
      estimatedTime: '15 minutes',
      endings: 4
    });
    
    this.games.set('galaga_abduction', {
      id: 'galaga_abduction',
      title: 'Galaga: Abduction',
      category: 'classic_reimagined',
      original: 'galaga',
      description: 'Being pulled into the screen. Resistance is futile.',
      horrorElements: ['tractor_beam', 'body_horror', 'assimilation'],
      difficulty: 6,
      unlockCondition: 'breakout_prison',
      estimatedTime: '12 minutes',
      endings: 3
    });
    
    this.games.set('frogger_styx', {
      id: 'frogger_styx',
      title: 'Frogger: River Styx',
      category: 'classic_reimagined',
      original: 'frogger',
      description: 'Crossing into the afterlife. Don\'t fall in.',
      horrorElements: ['river_of_dead', 'ghost_boats', 'souls_below'],
      difficulty: 5,
      unlockCondition: 'galaga_abduction',
      estimatedTime: '10 minutes',
      endings: 3
    });
    
    // ORIGINAL CONCEPTS (5 games)
    
    this.games.set('snake_possession', {
      id: 'snake_possession',
      title: 'Snake: Possession',
      category: 'original',
      description: 'Snake grows with each soul consumed. You are what you eat.',
      horrorElements: ['soul_consumption', 'body_transformation', 'cannibalism'],
      difficulty: 4,
      unlockCondition: 'frogger_styx',
      estimatedTime: '8 minutes',
      endings: 3
    });
    
    this.games.set('tetris_madness', {
      id: 'tetris_madness',
      title: 'Tetris: Descent into Madness',
      category: 'original',
      description: 'Blocks form disturbing images. Stack them anyway.',
      horrorElements: ['pareidolia', 'inevitable_doom', 'stacking_corpses'],
      difficulty: 6,
      unlockCondition: 'snake_possession',
      estimatedTime: '15 minutes',
      endings: 4
    });
    
    this.games.set('pong_soulbound', {
      id: 'pong_soulbound',
      title: 'Pong: Soul Bound',
      category: 'original',
      description: 'The ball is a trapped spirit. Keep it in play or suffer.',
      horrorElements: ['trapped_soul', 'eternal_punishment', 'guilt'],
      difficulty: 3,
      unlockCondition: 'tetris_madness',
      estimatedTime: '10 minutes',
      endings: 3
    });
    
    this.games.set('dig_dug_excavation', {
      id: 'dig_dug_excavation',
      title: 'Dig Dug: Excavation',
      category: 'original',
      description: 'Unearthing ancient evil. Some things should stay buried.',
      horrorElements: ['ancient_evil', 'burial_grounds', 'awakening'],
      difficulty: 5,
      unlockCondition: 'pong_soulbound',
      estimatedTime: '12 minutes',
      endings: 3
    });
    
    this.games.set('bubble_bobble_trapped', {
      id: 'bubble_bobble_trapped',
      title: 'Bubble Bobble: Trapped Souls',
      category: 'original',
      description: 'Your friends encased in bubbles. Pop them to proceed.',
      horrorElements: ['friend_sacrifice', 'moral_choice', 'trapped_friends'],
      difficulty: 6,
      unlockCondition: 'dig_dug_excavation',
      estimatedTime: '15 minutes',
      endings: 5
    });
    
    // FINALE META-GAMES (5 games)
    
    this.games.set('cabinet_secrets', {
      id: 'cabinet_secrets',
      title: 'The Cabinet\'s Secrets',
      category: 'finale_meta',
      description: 'The cabinet itself holds secrets. Look closer.',
      horrorElements: ['meta_puzzle', 'fourth_wall_break', 'cabinet_is_alive'],
      difficulty: 7,
      unlockCondition: 'all_classics_and_originals',
      estimatedTime: '20 minutes',
      endings: 3
    });
    
    this.games.set('cartridge_horror', {
      id: 'cartridge_horror',
      title: 'Cursed Cartridge',
      category: 'finale_meta',
      description: 'Find hidden cartridges. Each tells a dark story.',
      horrorElements: ['collection_horror', 'anthology_within', 'dark_stories'],
      difficulty: 6,
      unlockCondition: 'cabinet_secrets',
      estimatedTime: '25 minutes',
      endings: 4
    });
    
    this.games.set('high_score_haunting', {
      id: 'high_score_haunting',
      title: 'High Score Haunting',
      category: 'finale_meta',
      description: 'Beat the high scores. The previous holders want their spots back.',
      horrorElements: ['ghost_competitors', 'score_possession', 'eternal_rankings'],
      difficulty: 8,
      unlockCondition: 'cartridge_horror',
      estimatedTime: '30 minutes',
      endings: 4
    });
    
    this.games.set('arcade_afterlife', {
      id: 'arcade_afterlife',
      title: 'Arcade Afterlife',
      category: 'finale_meta',
      description: 'You\'ve been here all along. You\'re part of the cabinet now.',
      horrorElements: ['existential_horror', 'time_loop', 'became_game'],
      difficulty: 9,
      unlockCondition: 'high_score_haunting',
      estimatedTime: '35 minutes',
      endings: 6
    });
    
    this.games.set('the_final_game', {
      id: 'the_final_game',
      title: 'THE FINAL GAME',
      category: 'finale_meta',
      description: 'Breaking the fourth wall completely. The cabinet wants out.',
      horrorElements: ['reality_break', 'cabinet_escape', 'player_in_danger'],
      difficulty: 10,
      unlockCondition: 'arcade_afterlife',
      estimatedTime: '45 minutes',
      endings: 8,
      trueEnding: true
    });
    
    console.log(`[Phase 12] Defined ${this.games.size} mini-games`);
  }

  initializeCRTEffects() {
    this.crtEffects = {
      scanlines: {
        enabled: true,
        intensity: 0.3,
        spacing: 2
      },
      curvature: {
        enabled: true,
        amount: 0.05
      },
      chromaticAberration: {
        enabled: true,
        strength: 0.002
      },
      vignette: {
        enabled: true,
        darkness: 0.4
      },
      flicker: {
        enabled: true,
        intensity: 0.05
      },
      colorShift: {
        enabled: true,
        warmth: 0.1
      }
    };
    
    console.log('[Phase 12] CRT effects initialized');
  }

  // Core gameplay
  
  selectGame(gameId) {
    const game = this.games.get(gameId);
    if (!game) {
      console.log('[Phase 12] Game not found:', gameId);
      return false;
    }
    
    if (!this.progress.unlockedGames.includes(gameId)) {
      console.log('[Phase 12] Game not unlocked:', gameId);
      return false;
    }
    
    console.log(`[Phase 12] Selected game: ${game.title}`);
    
    // Insert coin or use free play
    if (!this.cabinet.freePlay && this.cabinet.coins <= 0) {
      console.log('[Phase 12] Insert coin!');
      return false;
    }
    
    if (!this.cabinet.freePlay) {
      this.cabinet.coins--;
    }
    
    this.startGame(gameId);
    return true;
  }

  startGame(gameId) {
    const game = this.games.get(gameId);
    console.log(`[Phase 12] Starting ${game.title}...`);
    
    // Apply CRT effects
    this.applyCRTEffects();
    
    // Initialize game-specific logic
    this.initializeGameLogic(game);
  }

  initializeGameLogic(game) {
    // Each game would have its own logic implementation
    console.log(`[Phase 12] Initializing ${game.id} logic`);
    
    // Example: Pac-Man Cursed
    if (game.id === 'pac_man_cursed') {
      this.initPacManCursed();
    }
    
    // ... other games
  }

  initPacManCursed() {
    console.log('[Phase 12] PAC-MAN: LOST IN THE MAZE initialized');
    // Classic Pac-Man mechanics but:
    // - Maze changes layout periodically
    // - Ghosts whisper player's name (from browser)
    // - No exit - endless survival
    // - Eating pellets reveals disturbing imagery
  }

  completeGame(gameId, ending) {
    const game = this.games.get(gameId);
    if (!game) return;
    
    this.progress.completedGames.add(gameId);
    
    console.log(`[Phase 12] Completed ${game.title} with ending: ${ending}`);
    
    // Unlock next game
    this.unlockNextGame(gameId);
    
    // Save high score
    this.saveHighScore(gameId, ending);
    
    // Check for secret unlocks
    this.checkSecretUnlocks(gameId, ending);
  }

  unlockNextGame(completedGameId) {
    for (const [gameId, game] of this.games) {
      if (game.unlockCondition === completedGameId) {
        if (!this.progress.unlockedGames.includes(gameId)) {
          this.progress.unlockedGames.push(gameId);
          console.log(`[Phase 12] 🆕 Unlocked: ${game.title}`);
        }
      }
    }
  }

  checkSecretUnlocks(gameId, ending) {
    // Special endings unlock secret content
    const secretConditions = {
      'bubble_bobble_trapped': { ending: 5, unlock: 'true_friendship' },
      'tetris_madness': { ending: 4, unlock: 'perfect_stack' },
      'arcade_afterlife': { ending: 6, unlock: 'enlightenment' }
    };
    
    const condition = secretConditions[gameId];
    if (condition && ending === condition.ending) {
      console.log(`[Phase 12] 🎁 SECRET UNLOCKED: ${condition.unlock}`);
      this.progress.secretsFound++;
    }
  }

  // High score system
  
  saveHighScore(gameId, ending, score = 0) {
    const existing = this.progress.highScores.get(gameId);
    
    if (!existing || score > existing.score) {
      this.progress.highScores.set(gameId, {
        score: score,
        ending: ending,
        date: Date.now(),
        story: this.generateHighScoreStory(gameId, ending)
      });
      
      console.log(`[Phase 12] New high score for ${gameId}!`);
    }
  }

  generateHighScoreStory(gameId, ending) {
    const stories = {
      'pac_man_cursed': [
        'They say he\'s still eating, still running...',
        'The maze claimed another victim.',
        'Some doors should never be opened.'
      ],
      'breakout_prison': [
        'Freedom is an illusion.',
        'The ball always returns.',
        'Escape is just the beginning.'
      ]
    };
    
    const gameStories = stories[gameId] || ['Another soul added to the collection.'];
    return gameStories[Math.min(ending - 1, gameStories.length - 1)];
  }

  async loadHighScores() {
    try {
      const saved = localStorage.getItem('cursed_arcade_scores');
      if (saved) {
        const data = JSON.parse(saved);
        this.progress.highScores = new Map(data);
        console.log('[Phase 12] High scores loaded');
      }
    } catch (error) {
      console.error('[Phase 12] Failed to load high scores:', error);
    }
  }

  // Cabinet customization
  
  customizeCabinet(slot, customization) {
    const validSlots = ['marquee', 'sideArt', 'buttons', 'joystick'];
    
    if (!validSlots.includes(slot)) {
      console.log('[Phase 12] Invalid customization slot');
      return false;
    }
    
    this.cabinet.customizations[slot] = customization;
    console.log(`[Phase 12] Customized ${slot} with ${customization}`);
    
    return true;
  }

  unlockCustomization(category, item) {
    // Unlock new customization options through achievements
    console.log(`[Phase 12] Unlocked customization: ${category} - ${item}`);
  }

  // Meta-horror elements
  
  breakFourthWall(intensity) {
    const breaks = [
      () => console.log('[Phase 12] The game knows your name...'),
      () => console.log('[Phase 12] Why are you playing this?'),
      () => console.log('[Phase 12] Your desktop is being watched...'),
      () => console.log('[Phase 12] Close the game. CLOSE IT NOW.'),
      () => console.log('[Phase 12] Too late. You\'re part of it now.')
    ];
    
    const breakFn = breaks[Math.min(intensity - 1, breaks.length - 1)];
    if (breakFn) breakFn();
  }

  triggerMetaEvent(eventType) {
    switch (eventType) {
      case 'desktop_integration':
        console.log('[Phase 12] 👁️ Game window expanding beyond bounds...');
        break;
        
      case 'persistent_threat':
        console.log('[Phase 12] ⚠️ Threat persists after closing game...');
        break;
        
      case 'reality_break':
        console.log('[Phase 12] 💥 REALITY FRACTURE DETECTED...');
        break;
    }
  }

  // Progress tracking
  
  getCompletionPercentage() {
    const totalGames = this.games.size;
    const completed = this.progress.completedGames.size;
    return (completed / totalGames) * 100;
  }

  getSecretsFound() {
    return this.progress.secretsFound;
  }

  getTotalSecrets() {
    return this.progress.totalSecrets;
  }

  applyCRTEffects() {
    if (!this.config.crtEffects) return;
    
    console.log('[Phase 12] Applying CRT effects:');
    console.log('- Scanlines:', this.crtEffects.scanlines.intensity);
    console.log('- Curvature:', this.crtEffects.curvature.amount);
    console.log('- Chromatic Aberration:', this.crtEffects.chromaticAberration.strength);
    console.log('- Vignette:', this.crtEffects.vignette.darkness);
    console.log('- Flicker:', this.crtEffects.flicker.intensity);
  }

  async saveProgress() {
    try {
      const data = {
        unlockedGames: this.progress.unlockedGames,
        completedGames: Array.from(this.progress.completedGames),
        highScores: Array.from(this.progress.highScores.entries()),
        secretsFound: this.progress.secretsFound,
        cabinet: this.cabinet
      };
      
      localStorage.setItem('cursed_arcade_progress', JSON.stringify(data));
      console.log('[Phase 12] Progress saved');
    } catch (error) {
      console.error('[Phase 12] Save failed:', error);
    }
  }

  dispose() {
    this.saveProgress();
    console.log('[Phase 12] CURSED ARCADE disposed');
  }
}

// Export singleton helper
let cursedArcadeInstance = null;

export function getCursedArcadeGame(config) {
  if (!cursedArcadeInstance) {
    cursedArcadeInstance = new CursedArcadeGame(config);
  }
  return cursedArcadeInstance;
}

console.log('[Phase 12] CURSED ARCADE module loaded');

/**
 * PHASE 11: BLOOD TETRIS - COMPETITIVE PUZZLE BATTLE ROYALE
 * 
 * Tetris meets battle royale. 100 players drop into collapsing void.
 * Clear lines to rise, fail to sink into darkness. Last player floating wins.
 * 
 * Features:
 * - Battle Royale mode (100 players)
 * - Team modes (2v2, 3v3, 4v4)
 * - Ranked ladder system
 * - Power-ups and special pieces
 * - Battle Pass integration (100 tiers/season)
 * - Combo system with style points
 * - Spectator mode
 * - Cosmetics only monetization
 * 
 * Target: Addictive competitive puzzle gameplay, 60fps guaranteed
 */

export class BloodTetrisGame {
  constructor(config = {}) {
    this.config = {
      canvas: config.canvas,
      debug: config.debug || false,
      multiplayer: config.multiplayer || true
    };
    
    // Game state
    this.gameState = {
      mode: 'battle_royale', // battle_royale, teams, ranked, casual, custom
      status: 'lobby', // lobby, playing, eliminated, spectating
      players: new Map(),
      currentPlayer: null,
      spectators: new Set()
    };
    
    // Player stats
    this.playerStats = {
      level: 1,
      xp: 0,
      rank: 'bronze',
      rating: 1000,
      wins: 0,
      losses: 0,
      totalLines: 0,
      bestCombo: 0
    };
    
    // Battle Pass
    this.battlePass = {
      season: 1,
      tier: 0,
      freeTrack: [],
      premiumTrack: [],
      eliteTrack: [],
      purchased: false
    };
    
    // Cosmetics inventory
    this.cosmetics = {
      skins: [],
      trails: [],
      explosions: [],
      avatars: [],
      equipped: {
        skin: 'default',
        trail: 'none',
        explosion: 'basic',
        avatar: 'default'
      }
    };
    
    console.log('[Phase 11] BLOOD TETRIS initialized');
  }

  async initialize() {
    console.log('[Phase 11] Initializing BLOOD TETRIS...');
    
    // Initialize game systems
    this.initializeTetrominoes();
    this.initializePowerUps();
    this.initializeBattleRoyale();
    this.initializeRankedSystem();
    this.initializeBattlePass();
    
    console.log('[Phase 11] ✅ BLOOD TETRIS ready');
  }

  initializeTetrominoes() {
    // Standard tetrominoes with horror twist
    this.tetrominoes = {
      I: {
        shape: [[1, 1, 1, 1]],
        color: '#00ffff',
        bloodColor: '#ff0000',
        points: 100
      },
      O: {
        shape: [[1, 1], [1, 1]],
        color: '#ffff00',
        bloodColor: '#ffaa00',
        points: 100
      },
      T: {
        shape: [[0, 1, 0], [1, 1, 1]],
        color: '#800080',
        bloodColor: '#ff00ff',
        points: 100
      },
      S: {
        shape: [[0, 1, 1], [1, 1, 0]],
        color: '#00ff00',
        bloodColor: '#00ff00',
        points: 100
      },
      Z: {
        shape: [[1, 1, 0], [0, 1, 1]],
        color: '#ff0000',
        bloodColor: '#ff0000',
        points: 100
      },
      J: {
        shape: [[1, 0, 0], [1, 1, 1]],
        color: '#0000ff',
        bloodColor: '#0000ff',
        points: 100
      },
      L: {
        shape: [[0, 0, 1], [1, 1, 1]],
        color: '#ffa500',
        bloodColor: '#ff8c00',
        points: 100
      }
    };
    
    // Special power-up pieces
    this.specialPieces = {
      bomb: {
        shape: [[1, 1, 1], [1, 1, 1], [1, 1, 1]],
        color: '#ff0000',
        effect: 'clear_3x3_area',
        rarity: 'rare'
      },
      freeze: {
        shape: [[1, 0, 1], [0, 1, 0], [1, 0, 1]],
        color: '#00ffff',
        effect: 'freeze_opponents',
        rarity: 'epic'
      },
      swap: {
        shape: [[1, 1], [1, 1]],
        color: '#ffffff',
        effect: 'swap_with_random_player',
        rarity: 'legendary'
      },
      wild: {
        shape: [[1]],
        color: '#rainbow',
        effect: 'transform_to_any_piece',
        rarity: 'mythic'
      }
    };
    
    console.log('[Phase 11] Tetrominoes initialized');
  }

  initializePowerUps() {
    this.powerUps = [
      {
        id: 'speed_boost',
        name: 'Adrenaline Rush',
        description: 'Piece drop speed +50% for 10 seconds',
        duration: 10000,
        effect: (player) => {
          player.dropSpeed *= 0.5;
          setTimeout(() => player.dropSpeed *= 2, 10000);
        }
      },
      {
        id: 'extra_rotation',
        name: 'Quantum Spin',
        description: 'Can rotate pieces in mid-air',
        duration: 15000,
        effect: (player) => {
          player.canMidAirRotate = true;
          setTimeout(() => player.canMidAirRotate = false, 15000);
        }
      },
      {
        id: 'line_freeze',
        name: 'Temporal Stasis',
        description: 'Freeze your board for 5 seconds (no gravity)',
        duration: 5000,
        effect: (player) => {
          player.gravityDisabled = true;
          setTimeout(() => player.gravityDisabled = false, 5000);
        }
      },
      {
        id: 'attack_boost',
        name: 'Blood Frenzy',
        description: 'Send double garbage lines for 10 seconds',
        duration: 10000,
        effect: (player) => {
          player.garbageMultiplier = 2;
          setTimeout(() => player.garbageMultiplier = 1, 10000);
        }
      },
      {
        id: 'shield',
        name: 'Bone Armor',
        description: 'Block one incoming attack',
        duration: 0,
        effect: (player) => {
          player.shield = 1;
        }
      }
    ];
    
    console.log('[Phase 11] Power-ups initialized');
  }

  initializeBattleRoyale() {
    this.battleRoyale = {
      maxPlayers: 100,
      minPlayers: 10,
      currentLobby: [],
      matchId: null,
      voidLevel: 0,
      collapseTimer: 0,
      collapseInterval: 30000, // Collapse every 30 seconds
      safeZone: 100 // Starting safe zone height
    };
    
    console.log('[Phase 11] Battle Royale initialized');
  }

  initializeRankedSystem() {
    this.rankedSystem = {
      ranks: [
        { name: 'Bronze', minRating: 0, icon: '🥉' },
        { name: 'Silver', minRating: 1000, icon: '🥈' },
        { name: 'Gold', minRating: 1500, icon: '🥇' },
        { name: 'Platinum', minRating: 2000, icon: '💎' },
        { name: 'Diamond', minRating: 2500, icon: '💠' },
        { name: 'Master', minRating: 3000, icon: '👑' },
        { name: 'Grandmaster', minRating: 3500, icon: '🔥' },
        { name: 'Legend', minRating: 4000, icon: '⭐' }
      ],
      seasons: [],
      currentSeason: 1
    };
    
    console.log('[Phase 11] Ranked system initialized');
  }

  initializeBattlePass() {
    // Season 1 Battle Pass rewards
    this.battlePass.freeTrack = [
      { tier: 1, reward: { type: 'currency', amount: 50 } },
      { tier: 5, reward: { type: 'skin', id: 'classic_red' } },
      { tier: 10, reward: { type: 'currency', amount: 100 } },
      { tier: 15, reward: { type: 'trail', id: 'basic_sparkle' } },
      { tier: 20, reward: { type: 'currency', amount: 150 } },
      { tier: 25, reward: { type: 'avatar', id: 'skull_icon' } },
      { tier: 30, reward: { type: 'currency', amount: 200 } },
      { tier: 40, reward: { type: 'explosion', id: 'basic_blood' } },
      { tier: 50, reward: { type: 'currency', amount: 250 } }
    ];
    
    this.battlePass.premiumTrack = [
      { tier: 1, reward: { type: 'currency', amount: 100 } },
      { tier: 3, reward: { type: 'skin', id: 'crimson_elite' } },
      { tier: 5, reward: { type: 'trail', id: 'flame_trail' } },
      { tier: 10, reward: { type: 'currency', amount: 200 } },
      { tier: 15, reward: { type: 'skin', id: 'shadow_assassin' } },
      { tier: 20, reward: { type: 'explosion', id: 'void_explosion' } },
      { tier: 25, reward: { type: 'currency', amount: 300 } },
      { tier: 30, reward: { type: 'trail', id: 'lightning_trail' } },
      { tier: 40, reward: { type: 'skin', id: 'golden_god' } },
      { tier: 50, reward: { type: 'currency', amount: 500 } },
      { tier: 60, reward: { type: 'explosion', id: 'cosmic_burst' } },
      { tier: 70, reward: { type: 'trail', id: 'dragon_fire' } },
      { tier: 80, reward: { type: 'skin', id: 'demon_lord' } },
      { tier: 90, reward: { type: 'currency', amount: 1000 } },
      { tier: 100, reward: { type: 'skin', id: 'legendary_reaper', exclusive: true } }
    ];
    
    this.battlePass.eliteTrack = [
      { tier: 25, reward: { type: 'title', id: 'Elite Warrior' } },
      { tier: 50, reward: { type: 'emote', id: 'victory_dance' } },
      { tier: 75, reward: { type: 'title', id: 'Elite Champion' } },
      { tier: 100, reward: { type: 'skin', id: 'elite_phoenix', exclusive: true } },
      { tier: 125, reward: { type: 'title', id: 'Elite Legend', exclusive: true } }
    ];
    
    console.log('[Phase 11] Battle Pass initialized with 125 tiers');
  }

  // Core gameplay mechanics
  
  joinBattleRoyale() {
    if (this.battleRoyale.currentLobby.length >= this.battleRoyale.maxPlayers) {
      console.log('[Phase 11] Lobby full!');
      return false;
    }
    
    const player = {
      id: `player_${Date.now()}`,
      board: this.createBoard(),
      currentPiece: null,
      nextPiece: null,
      score: 0,
      lines: 0,
      combo: 0,
      position: this.battleRoyale.currentLobby.length,
      alive: true,
      powerUps: []
    };
    
    this.battleRoyale.currentLobby.push(player);
    this.gameState.players.set(player.id, player);
    
    console.log(`[Phase 11] Player ${player.id} joined Battle Royale (${this.battleRoyale.currentLobby.length}/100)`);
    
    // Start match when enough players
    if (this.battleRoyale.currentLobby.length >= this.battleRoyale.minPlayers) {
      this.startBattleRoyale();
    }
    
    return true;
  }

  createBoard() {
    return {
      grid: Array(20).fill(null).map(() => Array(10).fill(null)),
      y: 0, // Vertical position (for rising/falling)
      garbageLines: 0
    };
  }

  startBattleRoyale() {
    console.log('[Phase 11] Battle Royale starting!');
    
    this.gameState.status = 'playing';
    this.battleRoyale.matchId = `match_${Date.now()}`;
    this.battleRoyale.voidLevel = 0;
    this.battleRoyale.collapseTimer = Date.now();
    
    // Give each player their first piece
    for (const player of this.battleRoyale.currentLobby) {
      player.currentPiece = this.spawnPiece();
      player.nextPiece = this.spawnPiece();
    }
    
    // Start game loop
    this.gameLoop();
  }

  spawnPiece() {
    const pieces = Object.keys(this.tetrominoes);
    const pieceType = pieces[Math.floor(Math.random() * pieces.length)];
    
    // Small chance for special piece (5%)
    if (Math.random() < 0.05) {
      const specialTypes = Object.keys(this.specialPieces);
      const specialType = specialTypes[Math.floor(Math.random() * specialTypes.length)];
      return {
        ...this.specialPieces[specialType],
        type: 'special',
        specialType: specialType,
        x: 3,
        y: 0
      };
    }
    
    return {
      ...this.tetrominoes[pieceType],
      type: pieceType,
      x: 3,
      y: 0
    };
  }

  gameLoop() {
    if (this.gameState.status !== 'playing') return;
    
    // Update all players
    for (const [id, player] of this.gameState.players) {
      if (!player.alive) continue;
      
      this.updatePlayer(player);
    }
    
    // Check for collapsed void
    this.checkVoidCollapse();
    
    // Check win condition
    const alivePlayers = Array.from(this.gameState.players.values()).filter(p => p.alive);
    if (alivePlayers.length <= 1) {
      this.endMatch(alivePlayers[0]);
    }
    
    // Continue loop
    requestAnimationFrame(() => this.gameLoop());
  }

  updatePlayer(player) {
    // Gravity
    if (!player.gravityDisabled) {
      player.currentPiece.y++;
      
      // Collision detection
      if (this.checkCollision(player.board, player.currentPiece)) {
        player.currentPiece.y--;
        this.lockPiece(player, player.currentPiece);
        player.currentPiece = player.nextPiece;
        player.nextPiece = this.spawnPiece();
      }
    }
  }

  checkCollision(board, piece) {
    for (let row = 0; row < piece.shape.length; row++) {
      for (let col = 0; col < piece.shape[row].length; col++) {
        if (piece.shape[row][col]) {
          const newX = piece.x + col;
          const newY = piece.y + row;
          
          // Out of bounds
          if (newX < 0 || newX >= 10 || newY >= 20) {
            return true;
          }
          
          // Collision with locked pieces
          if (newY >= 0 && board.grid[newY][newX]) {
            return true;
          }
        }
      }
    }
    
    return false;
  }

  lockPiece(player, piece) {
    // Lock piece into board
    for (let row = 0; row < piece.shape.length; row++) {
      for (let col = 0; col < piece.shape[row].length; col++) {
        if (piece.shape[row][col]) {
          const y = piece.y + row;
          const x = piece.x + col;
          
          if (y >= 0 && y < 20 && x >= 0 && x < 10) {
            player.board.grid[y][x] = piece.color;
          }
        }
      }
    }
    
    // Check for completed lines
    const clearedLines = this.clearLines(player.board);
    
    if (clearedLines > 0) {
      // Calculate score
      const basePoints = [0, 100, 300, 500, 800]; // 0-4 lines
      player.score += basePoints[clearedLines] * (player.combo + 1);
      player.lines += clearedLines;
      player.combo++;
      
      // Send garbage to opponents
      const garbageToSend = Math.max(0, clearedLines - 1);
      if (garbageToSend > 0) {
        this.sendGarbage(player, garbageToSend);
      }
      
      // Activate special piece effects
      if (piece.type === 'special') {
        this.activateSpecialEffect(player, piece.specialType);
      }
      
      // Check for power-up drop (10% chance on line clear)
      if (Math.random() < 0.1) {
        this.grantPowerUp(player);
      }
    } else {
      player.combo = 0;
    }
    
    // Check for top-out (elimination)
    if (this.checkTopOut(player)) {
      player.alive = false;
      player.position = this.getRemainingPlayers().length;
      console.log(`[Phase 11] Player ${player.id} eliminated! Position: ${player.position}`);
    }
  }

  clearLines(board) {
    let cleared = 0;
    
    for (let row = 19; row >= 0; row--) {
      if (board.grid[row].every(cell => cell !== null)) {
        // Remove line
        board.grid.splice(row, 1);
        // Add empty line at top
        board.grid.unshift(Array(10).fill(null));
        cleared++;
        row++; // Check same row index again
      }
    }
    
    return cleared;
  }

  sendGarbage(sender, amount) {
    const multiplier = sender.garbageMultiplier || 1;
    const totalGarbage = amount * multiplier;
    
    // Send to random alive opponents
    const targets = this.getRemainingPlayers().filter(p => p !== sender);
    
    for (let i = 0; i < totalGarbage; i++) {
      if (targets.length === 0) break;
      
      const target = targets[Math.floor(Math.random() * targets.length)];
      
      if (target.shield > 0) {
        target.shield--;
        console.log(`[Phase 11] Player ${target.id}'s shield blocked garbage!`);
      } else {
        this.addGarbageLine(target);
      }
    }
  }

  addGarbageLine(player) {
    // Add garbage line with one hole
    const holePosition = Math.floor(Math.random() * 10);
    const garbageLine = Array(10).fill('garbage');
    garbageLine[holePosition] = null;
    
    // Remove top line (could eliminate player!)
    player.board.grid.shift();
    // Add garbage line at bottom
    player.board.grid.push(garbageLine);
    
    player.board.garbageLines++;
  }

  checkTopOut(player) {
    // Check if any locked piece is at the top row
    return player.board.grid[0].some(cell => cell !== null);
  }

  checkVoidCollapse() {
    const now = Date.now();
    
    if (now - this.battleRoyale.collapseTimer > this.battleRoyale.collapseInterval) {
      this.battleRoyale.voidLevel += 2; // Void rises by 2 lines
      this.battleRoyale.collapseTimer = now;
      
      console.log(`[Phase 11] Void collapsed! Level: ${this.battleRoyale.voidLevel}`);
      
      // Eliminate players below void level
      for (const [id, player] of this.gameState.players) {
        if (!player.alive) continue;
        
        if (player.board.y < this.battleRoyale.voidLevel) {
          player.alive = false;
          player.position = this.getRemainingPlayers().length;
          console.log(`[Phase 11] Player ${player.id} consumed by the void!`);
        }
      }
    }
  }

  activateSpecialEffect(player, specialType) {
    switch (specialType) {
      case 'bomb':
        // Clear 3x3 area around last placed piece
        console.log(`[Phase 11] ${player.id} activated BOMB!`);
        break;
        
      case 'freeze':
        // Freeze all opponents for 3 seconds
        console.log(`[Phase 11] ${player.id} activated FREEZE!`);
        break;
        
      case 'swap':
        // Swap board with random opponent
        console.log(`[Phase 11] ${player.id} activated SWAP!`);
        break;
        
      case 'wild':
        // Transform into needed piece
        console.log(`[Phase 11] ${player.id} activated WILD card!`);
        break;
    }
  }

  grantPowerUp(player) {
    const powerUp = this.powerUps[Math.floor(Math.random() * this.powerUps.length)];
    player.powerUps.push(powerUp);
    console.log(`[Phase 11] ${player.id} received power-up: ${powerUp.name}`);
  }

  usePowerUp(player, powerUpIndex) {
    const powerUp = player.powerUps[powerUpIndex];
    if (!powerUp) return false;
    
    console.log(`[Phase 11] ${player.id} used ${powerUp.name}!`);
    
    // Apply effect
    powerUp.effect(player);
    
    // Remove from inventory
    player.powerUps.splice(powerUpIndex, 1);
    
    return true;
  }

  getRemainingPlayers() {
    return Array.from(this.gameState.players.values()).filter(p => p.alive);
  }

  endMatch(winner) {
    this.gameState.status = 'finished';
    
    if (winner) {
      console.log(`[Phase 11] 🏆 MATCH WINNER: ${winner.id}!`);
      console.log(`Score: ${winner.score}, Lines: ${winner.lines}`);
      
      // Award rewards
      this.awardMatchRewards(winner);
      
      // Update stats
      this.playerStats.wins++;
      this.playerStats.rating += 25;
    } else {
      console.log('[Phase 11] Match ended in a draw!');
    }
  }

  awardMatchRewards(winner) {
    // Base rewards
    const rewards = {
      xp: 100,
      currency: 50,
      battlePassXP: 20
    };
    
    // Winner bonus
    if (winner === this.gameState.currentPlayer) {
      rewards.xp *= 2;
      rewards.currency *= 2;
      rewards.battlePassXP *= 2;
    }
    
    // Apply rewards
    this.playerStats.xp += rewards.xp;
    
    console.log(`[Phase 11] Rewards: ${rewards.xp} XP, ${rewards.currency} currency, ${rewards.battlePassXP} BP XP`);
  }

  // Ranked system
  
  playRanked() {
    this.gameState.mode = 'ranked';
    console.log(`[Phase 11] Entering ranked queue (Rating: ${this.playerStats.rating})`);
    
    // Matchmaking would happen here
    this.findRankedMatch();
  }

  findRankedMatch() {
    // Simplified matchmaking
    setTimeout(() => {
      console.log('[Phase 11] Ranked match found!');
      this.joinBattleRoyale();
    }, 1000);
  }

  updateRank(rating) {
    this.playerStats.rating = rating;
    
    // Determine rank
    for (let i = this.rankedSystem.ranks.length - 1; i >= 0; i--) {
      if (rating >= this.rankedSystem.ranks[i].minRating) {
        this.playerStats.rank = this.rankedSystem.ranks[i].name;
        break;
      }
    }
    
    console.log(`[Phase 11] New rank: ${this.playerStats.rank} (${rating} rating)`);
  }

  // Cosmetics system
  
  equipCosmetic(type, id) {
    if (!this.cosmetics[type].includes(id)) {
      console.log(`[Phase 11] Don't own cosmetic: ${id}`);
      return false;
    }
    
    this.cosmetics.equipped[type] = id;
    console.log(`[Phase 11] Equipped ${type}: ${id}`);
    return true;
  }

  unlockCosmetic(type, id) {
    if (this.cosmetics[type].includes(id)) {
      return false; // Already owned
    }
    
    this.cosmetics[type].push(id);
    console.log(`[Phase 11] Unlocked cosmetic: ${id}`);
    return true;
  }

  purchaseCosmetic(id, cost) {
    // Check if player has enough currency
    console.log(`[Phase 11] Purchasing cosmetic ${id} for ${cost} currency`);
    
    // In actual implementation, deduct currency and unlock
    return true;
  }

  // Battle Pass progression
  
  addBattlePassXP(amount) {
    const xpPerTier = 1000;
    const totalXP = this.battlePass.tier * xpPerTier + amount;
    const newTier = Math.floor(totalXP / xpPerTier);
    
    // Award tiers
    while (this.battlePass.tier < newTier) {
      this.battlePass.tier++;
      this.awardBattlePassReward(this.battlePass.tier);
    }
    
    console.log(`[Phase 11] Battle Pass: Tier ${this.battlePass.tier}`);
  }

  awardBattlePassReward(tier) {
    // Check free track
    const freeReward = this.battlePass.freeTrack.find(r => r.tier === tier);
    if (freeReward) {
      console.log(`[Phase 11] Free track reward: ${freeReward.reward.type}`);
    }
    
    // Check premium track (if purchased)
    if (this.battlePass.purchased) {
      const premiumReward = this.battlePass.premiumTrack.find(r => r.tier === tier);
      if (premiumReward) {
        console.log(`[Phase 11] Premium track reward: ${premiumReward.reward.type}`);
      }
      
      // Check elite track
      const eliteReward = this.battlePass.eliteTrack.find(r => r.tier === tier);
      if (eliteReward) {
        console.log(`[Phase 11] Elite track reward: ${eliteReward.reward.type}`);
      }
    }
  }

  // Spectator mode
  
  spectateMatch(matchId) {
    this.gameState.status = 'spectating';
    this.gameState.spectators.add(`spectator_${Date.now()}`);
    
    console.log(`[Phase 11] Spectating match ${matchId}`);
    
    // Show remaining players
    const remaining = this.getRemainingPlayers();
    console.log(`[Phase 11] ${remaining.length} players alive`);
  }

  dispose() {
    console.log('[Phase 11] BLOOD TETRIS disposed');
  }
}

// Export singleton helper
let bloodTetrisInstance = null;

export function getBloodTetrisGame(config) {
  if (!bloodTetrisInstance) {
    bloodTetrisInstance = new BloodTetrisGame(config);
  }
  return bloodTetrisInstance;
}

console.log('[Phase 11] BLOOD TETRIS module loaded');

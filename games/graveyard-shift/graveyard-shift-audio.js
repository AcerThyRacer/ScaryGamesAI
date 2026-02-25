/**
 * Graveyard Shift - Phase 2: Advanced Audio Integration
 * Features: Directional ghost whispers, proximity fading, cemetery ambiance
 */

import { initCore, getAudioManager } from '../../core/index.js';

class GraveyardShiftAudio {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.core = null;
    this.audio = null;
    this.gameActive = false;
    
    // Game state
    this.player = { x: 0, z: 0 };
    this.ghosts = [];
    this.cemeteryAmbience = null;
    
    this.lastTime = 0;
  }

  async init() {
    this.core = await initCore(this.canvas, {
      audio: { sampleRate: 44100 },
      gameId: 'graveyard-shift'
    });

    this.audio = this.core.audioManager;
    
    if (!this.audio) return false;

    this.setupInput();
    this.setupUI();
    this.startCemeteryAmbience();
    this.spawnGhosts();
    
    console.log('Graveyard Shift with Phase 2 Audio initialized');
    return true;
  }

  setupInput() {
    this.keys = {};
    document.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
    });
    document.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });
  }

  setupUI() {
    const startBtn = document.getElementById('start-btn');
    if (startBtn) {
      startBtn.addEventListener('click', () => this.startGame());
    }

    if (window.GameUtils) {
      GameUtils.injectDifficultySelector('start-screen');
      GameUtils.initPause({
        onResume: () => {
          this.gameActive = true;
          this.audio?.resume();
          this.lastTime = performance.now();
          this.gameLoop();
        },
        onRestart: () => this.restartGame()
      });
    }
  }

  startCemeteryAmbience() {
    if (!this.audio?.procedural) return;
    
    const ambience = this.audio.procedural.createNoise({
      duration: 10,
      color: 'pink'
    });
    
    this.cemeteryAmbience = this.audio.context.createBufferSource();
    this.cemeteryAmbience.buffer = ambience;
    this.cemeteryAmbience.loop = true;
    
    const gain = this.audio.context.createGain();
    gain.gain.value = 0.15;
    
    // Add filters for nighttime atmosphere
    const filter = this.audio.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;
    
    this.cemeteryAmbience.connect(filter);
    filter.connect(gain);
    gain.connect(this.audio.context.destination);
    this.cemeteryAmbience.start(0);
  }

  spawnGhosts() {
    this.ghosts = [];
    for (let i = 0; i < 5; i++) {
      this.ghosts.push({
        x: (Math.random() - 0.5) * 50,
        z: (Math.random() - 0.5) * 50,
        sourceId: null,
        whisperTimer: 0
      });
    }
  }

  update(dt) {
    if (!this.gameActive) return;

    // Player movement
    const speed = 5 * dt;
    if (this.keys['KeyW']) this.player.z -= speed;
    if (this.keys['KeyS']) this.player.z += speed;
    if (this.keys['KeyA']) this.player.x -= speed;
    if (this.keys['KeyD']) this.player.x += speed;

    // Update audio listener
    if (this.audio?.spatial) {
      this.audio.updateListener(
        { x: this.player.x, y: 1.6, z: this.player.z },
        { forward: { x: 0, y: 0, z: -1 }, up: { x: 0, y: 1, z: 0 } }
      );
    }

    // Update ghosts
    this.ghosts.forEach(ghost => {
      const dx = ghost.x - this.player.x;
      const dz = ghost.z - this.player.z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      
      // Update ghost position if has audio source
      if (ghost.sourceId) {
        this.audio.updateSourcePosition(ghost.sourceId, {
          x: ghost.x,
          y: 1.5,
          z: ghost.z
        });
      }
      
      // Ghost whisper based on proximity
      ghost.whisperTimer -= dt;
      if (ghost.whisperTimer <= 0 && distance < 15) {
        this.ghostWhisper(ghost, distance);
        ghost.whisperTimer = 5 + Math.random() * 10;
      }
    });

    this.audio?.update(dt);
  }

  ghostWhisper(ghost, distance) {
    if (!this.audio?.procedural) return;
    
    // Create directional whisper
    const whisperBuffer = this.audio.procedural.createWhisper({
      duration: 2,
      pitch: 200 + Math.random() * 200
    });
    
    // Create 3D source
    const source = this.audio.spatial.createSource(
      whisperBuffer,
      { x: ghost.x, y: 1.5, z: ghost.z },
      {
        gain: Math.max(0, 1 - distance / 20),
        occlusionFrequency: 500 + distance * 100
      }
    );
    
    ghost.sourceId = source.id;
  }

  render() {
    const ctx = this.canvas.getContext('2d');
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw player position
    ctx.fillStyle = '#fff';
    ctx.font = '20px Inter';
    ctx.textAlign = 'center';
    ctx.fillText(`Position: (${this.player.x.toFixed(1)}, ${this.player.z.toFixed(1)})`, 
                 this.canvas.width / 2, this.canvas.height / 2);
  }

  gameLoop(time) {
    if (!this.gameActive) return;
    
    requestAnimationFrame((t) => this.gameLoop(t));
    
    if (!time) time = performance.now();
    const dt = Math.min((time - this.lastTime) / 1000, 0.1);
    this.lastTime = time;
    
    this.update(dt);
    this.render();
  }

  startGame() {
    const startScreen = document.getElementById('start-screen');
    if (startScreen) startScreen.style.display = 'none';
    
    this.gameActive = true;
    this.lastTime = performance.now();
    
    if (window.GameUtils) GameUtils.setState(GameUtils.STATE.PLAYING);
    
    this.gameLoop();
  }

  restartGame() {
    this.player = { x: 0, z: 0 };
    this.spawnGhosts();
    
    const gameOverScreen = document.getElementById('game-over-screen');
    if (gameOverScreen) gameOverScreen.style.display = 'none';
    
    this.gameActive = true;
    this.lastTime = performance.now();
    
    if (window.GameUtils) GameUtils.setState(GameUtils.STATE.PLAYING);
    
    this.gameLoop();
  }
}

// Initialize game
const game = new GraveyardShiftAudio();
game.init().catch(console.error);

export default GraveyardShiftAudio;

/**
 * Blood Tetris - Phase 1: GPU Particle System Integration
 * Enhanced with GPU-accelerated blood particles and visual effects
 */

import { initCore, GPUParticleSystem } from '../../core/index.js';

class BloodTetrisGPU {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.core = null;
    this.particleSystem = null;
    this.gameActive = false;
    
    // Game state (from original)
    this.COL = 10;
    this.ROW = 20;
    this.BLOCK = 32;
    this.board = [];
    this.score = 0;
    this.level = 1;
    this.lines = 0;
    this.currentPiece = null;
    this.currentX = 0;
    this.currentY = 0;
    this.currentColor = 0;
    this.nextPiece = null;
    this.holdPiece = null;
    this.holdUsed = false;
    this.dropTimer = 0;
    this.dropInterval = 800;
    this.combo = 0;
    this.maxCombo = 0;
    this.backToBack = false;
    this.powerUps = [];
    this.activePower = '';
    this.powerTimer = 0;
    this.curseActive = false;
    this.curseType = '';
    this.curseTimer = 0;
    this.particles = []; // Traditional fallback
    this.bloodLevel = 0;
    this.shakeTimer = 0;
    this.shakeMag = 0;
    
    this.lastTime = 0;
  }

  async init() {
    // Initialize core systems
    this.core = await initCore(this.canvas, {
      renderer: { antialias: true },
      particles: { maxParticles: 8000 }
    });

    this.particleSystem = this.core.particleSystem;

    if (!this.core.webgpuSupported) {
      console.warn('WebGPU not supported, using fallback particles');
      return false;
    }

    this.setupInput();
    this.setupUI();
    
    console.log('Blood Tetris GPU initialized');
    return true;
  }

  setupInput() {
    document.addEventListener('keydown', (e) => {
      if (!this.gameActive) return;
      
      if (e.code === 'Escape') {
        this.gameActive = false;
        if (window.GameUtils) GameUtils.pauseGame();
        return;
      }
      
      const left = this.curseActive && this.curseType === 'flip_controls' ? 'ArrowRight' : 'ArrowLeft';
      const right = this.curseActive && this.curseType === 'flip_controls' ? 'ArrowLeft' : 'ArrowRight';
      
      if (e.code === left) this.movePiece(-1, 0);
      else if (e.code === right) this.movePiece(1, 0);
      else if (e.code === 'ArrowDown') {
        this.movePiece(0, 1);
        this.score += 1;
      }
      else if (e.code === 'ArrowUp') this.rotatePiece();
      else if (e.code === 'Space') {
        this.hardDrop();
        e.preventDefault();
      }
      else if (e.code === 'KeyC' || e.code === 'ShiftLeft') this.holdCurrentPiece();
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
          this.lastTime = performance.now();
          this.gameLoop();
        },
        onRestart: () => this.restartGame()
      });
    }
  }

  initBoard() {
    this.board = [];
    for (let r = 0; r < this.ROW; r++) {
      this.board[r] = [];
      for (let c = 0; c < this.COL; c++) {
        this.board[r][c] = 0;
      }
    }
  }

  spawnBloodParticles(x, y, count, color) {
    if (this.particleSystem) {
      // Use GPU particle system
      for (let i = 0; i < count; i++) {
        this.particleSystem.emitParticle(
          { x: x, y: this.canvas.height - y },
          {
            speed: 50 + Math.random() * 100,
            life: 1 + Math.random(),
            size: 3 + Math.random() * 4,
            color: {
              r: 0.8 + Math.random() * 0.2,
              g: 0.0 + Math.random() * 0.1,
              b: 0.0 + Math.random() * 0.1,
              a: 0.8 + Math.random() * 0.2
            }
          }
        );
      }
    } else {
      // Fallback to traditional particles
      for (let i = 0; i < count; i++) {
        this.particles.push({
          x: x,
          y: y,
          vx: (Math.random() - 0.5) * 120,
          vy: (Math.random() - 0.5) * 120 - 30,
          life: 0.6 + Math.random() * 0.4,
          maxLife: 1,
          color: color,
          size: 2 + Math.random() * 3
        });
      }
    }
  }

  spawnParticlesForLineClear(rows, color) {
    rows.forEach(row => {
      for (let c = 0; c < this.COL; c++) {
        this.spawnBloodParticles(
          c * this.BLOCK + this.BLOCK / 2,
          row * this.BLOCK,
          2,
          color
        );
      }
    });
  }

  spawnParticlesForDrop(x, y, color) {
    for (let c = 0; c < this.currentPiece[0].length; c++) {
      if (this.currentPiece[c]) {
        this.spawnBloodParticles(
          x * this.BLOCK + c * this.BLOCK + this.BLOCK / 2,
          y * this.BLOCK + this.currentPiece.length * this.BLOCK,
          3,
          color
        );
      }
    }
  }

  // Rest of game logic from original (simplified for brevity)
  movePiece(dx, dy) {
    if (!this.collides(this.currentPiece, this.currentX + dx, this.currentY + dy)) {
      this.currentX += dx;
      this.currentY += dy;
      return true;
    }
    return false;
  }

  collides(shape, ox, oy) {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) {
          const nx = ox + c;
          const ny = oy + r;
          if (nx < 0 || nx >= this.COL || ny >= this.ROW) return true;
          if (ny >= 0 && this.board[ny][nx]) return true;
        }
      }
    }
    return false;
  }

  rotatePiece() {
    const rotated = [];
    for (let c = 0; c < this.currentPiece[0].length; c++) {
      rotated[c] = [];
      for (let r = this.currentPiece.length - 1; r >= 0; r--) {
        rotated[c].push(this.currentPiece[r][c]);
      }
    }
    
    const kicks = [0, -1, 1, -2, 2];
    for (let k = 0; k < kicks.length; k++) {
      if (!this.collides(rotated, this.currentX + kicks[k], this.currentY)) {
        this.currentPiece = rotated;
        this.currentX += kicks[k];
        return;
      }
    }
  }

  hardDrop() {
    let dropDist = 0;
    while (!this.collides(this.currentPiece, this.currentX, this.currentY + 1)) {
      this.currentY++;
      dropDist++;
    }
    this.score += dropDist * 2;
    this.spawnParticlesForDrop(this.currentX, this.currentY, '#cc2222');
    this.lockPiece();
  }

  holdCurrentPiece() {
    if (this.holdUsed) return;
    this.holdUsed = true;
    
    if (this.holdPiece) {
      const temp = { shape: this.holdPiece, color: this.holdColor };
      this.holdPiece = this.currentPiece;
      this.holdColor = this.currentColor;
      this.currentPiece = temp.shape;
      this.currentColor = temp.color;
    } else {
      this.holdPiece = this.currentPiece;
      this.holdColor = this.currentColor;
      this.spawnPiece();
    }
    
    this.currentX = Math.floor((this.COL - this.currentPiece[0].length) / 2);
    this.currentY = 0;
  }

  lockPiece() {
    this.merge();
    this.clearLines();
    this.spawnPiece();
    this.dropTimer = 0;
  }

  merge() {
    for (let r = 0; r < this.currentPiece.length; r++) {
      for (let c = 0; c < this.currentPiece[r].length; c++) {
        if (this.currentPiece[r][c]) {
          const ny = this.currentY + r;
          const nx = this.currentX + c;
          if (ny >= 0 && ny < this.ROW && nx >= 0 && nx < this.COL) {
            this.board[ny][nx] = this.currentColor;
          }
        }
      }
    }
  }

  clearLines() {
    let cleared = 0;
    const clearedRows = [];
    
    for (let r = this.ROW - 1; r >= 0; r--) {
      let full = true;
      for (let c = 0; c < this.COL; c++) {
        if (!this.board[r][c]) {
          full = false;
          break;
        }
      }
      if (full) {
        clearedRows.push(r);
        this.board.splice(r, 1);
        const newRow = [];
        for (let c = 0; c < this.COL; c++) newRow[c] = 0;
        this.board.unshift(newRow);
        cleared++;
        r++;
      }
    }
    
    if (cleared > 0) {
      this.combo++;
      if (this.combo > this.maxCombo) this.maxCombo = this.combo;
      
      const comboMult = 1 + (this.combo - 1) * 0.5;
      const isTetris = cleared >= 4;
      const b2bMult = this.backToBack && isTetris ? 1.5 : 1;
      this.backToBack = isTetris;
      
      const points = [0, 100, 300, 500, 800];
      const gained = Math.floor((points[Math.min(cleared, 4)] || 800) * this.level * comboMult * b2bMult);
      this.score += gained;
      this.lines += cleared;
      
      this.bloodLevel = Math.min(this.ROW * 0.4, this.bloodLevel + cleared * 0.6);
      this.shakeTimer = 0.3;
      this.shakeMag = cleared * 2.5;
      
      // Spawn GPU blood particles
      this.spawnParticlesForLineClear(clearedRows, '#ff4444');
      
      if (cleared >= 4 && window.HorrorAudio) {
        HorrorAudio.playJumpScare();
      } else if (window.HorrorAudio) {
        HorrorAudio.playCollect();
      }
    } else {
      this.combo = 0;
    }
  }

  spawnPiece() {
    // Simplified piece spawning
    const shapes = [
      [[1, 1, 1, 1]],
      [[1, 1], [1, 1]],
      [[0, 1, 0], [1, 1, 1]]
    ];
    
    if (this.nextPiece) {
      this.currentPiece = this.nextPiece.shape;
      this.currentColor = this.nextPiece.color;
    } else {
      const idx = Math.floor(Math.random() * shapes.length);
      this.currentPiece = shapes[idx];
      this.currentColor = idx + 1;
    }
    
    const nextIdx = Math.floor(Math.random() * shapes.length);
    this.nextPiece = { shape: shapes[nextIdx], color: nextIdx + 1 };
    
    this.currentX = Math.floor((this.COL - this.currentPiece[0].length) / 2);
    this.currentY = 0;
    this.holdUsed = false;
    
    if (this.collides(this.currentPiece, this.currentX, this.currentY)) {
      this.gameOver();
    }
  }

  update(dt) {
    if (!this.gameActive) return;
    
    // Update drop timer
    const speedMult = this.curseActive && this.curseType === 'speed_burst' ? 3 : 1;
    const slowMult = this.activePower === 'slow' ? 0.5 : 1;
    this.dropTimer += dt * 1000 * speedMult * slowMult;
    
    const interval = this.dropInterval / (window.GameUtils ? GameUtils.getMultiplier() : 1);
    if (this.dropTimer >= interval) {
      this.dropTimer = 0;
      if (!this.movePiece(0, 1)) {
        this.lockPiece();
      }
    }
    
    // Update timers
    if (this.shakeTimer > 0) this.shakeTimer -= dt;
    if (this.bloodLevel > 0) this.bloodLevel = Math.max(0, this.bloodLevel - dt * 0.1);
    if (this.comboTimer > 0) this.comboTimer -= dt;
    if (this.powerTimer > 0) {
      this.powerTimer -= dt;
      if (this.powerTimer <= 0) this.activePower = '';
    }
    if (this.curseTimer > 0) {
      this.curseTimer -= dt;
      if (this.curseTimer <= 0) this.curseActive = false;
    }
    
    // Update particles
    if (this.particleSystem) {
      this.particleSystem.update(dt);
    } else {
      // Fallback particle update
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        if (p.life <= 0) {
          this.particles.splice(i, 1);
        }
      }
    }
  }

  render() {
    // Clear canvas
    const ctx = this.canvas.getContext('2d');
    ctx.fillStyle = '#0a0000';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw board
    for (let r = 0; r < this.ROW; r++) {
      for (let c = 0; c < this.COL; c++) {
        if (this.board[r][c]) {
          this.drawBlock(ctx, c, r, this.board[r][c]);
        }
      }
    }
    
    // Draw current piece
    if (this.currentPiece) {
      for (let r = 0; r < this.currentPiece.length; r++) {
        for (let c = 0; c < this.currentPiece[r].length; c++) {
          if (this.currentPiece[r][c]) {
            this.drawBlock(ctx, this.currentX + c, this.currentY + r, this.currentColor);
          }
        }
      }
    }
    
    // Draw particles (fallback)
    if (!this.particleSystem) {
      this.particles.forEach(p => {
        ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    }
    
    // Draw blood pool
    if (this.bloodLevel > 0) {
      const bloodH = this.bloodLevel * this.BLOCK;
      const gradient = ctx.createLinearGradient(0, this.canvas.height - bloodH, 0, this.canvas.height);
      gradient.addColorStop(0, 'rgba(120, 0, 0, 0.3)');
      gradient.addColorStop(1, 'rgba(80, 0, 0, 0.7)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, this.canvas.height - bloodH, this.COL * this.BLOCK, bloodH);
    }
  }

  drawBlock(ctx, x, y, colorIdx) {
    const COLORS = ['#cc2222', '#882222', '#aa3333', '#993311', '#cc4400', '#881144', '#773322'];
    const col = COLORS[colorIdx - 1] || '#444';
    
    ctx.shadowColor = col;
    ctx.shadowBlur = 6;
    ctx.fillStyle = col;
    ctx.fillRect(x * this.BLOCK + 1, y * this.BLOCK + 1, this.BLOCK - 2, this.BLOCK - 2);
    ctx.shadowBlur = 0;
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
    
    this.initBoard();
    this.spawnPiece();
    
    this.gameActive = true;
    this.lastTime = performance.now();
    
    if (window.GameUtils) GameUtils.setState(GameUtils.STATE.PLAYING);
    
    const hud = document.getElementById('game-hud');
    if (hud) hud.style.display = 'flex';
    
    this.gameLoop();
  }

  restartGame() {
    this.initBoard();
    this.score = 0;
    this.level = 1;
    this.lines = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.bloodLevel = 0;
    this.particles = [];
    
    if (this.particleSystem) {
      this.particleSystem.clear();
    }
    
    this.spawnPiece();
    
    const gameOverScreen = document.getElementById('game-over-screen');
    if (gameOverScreen) gameOverScreen.style.display = 'none';
    
    this.gameActive = true;
    this.lastTime = performance.now();
    
    if (window.GameUtils) GameUtils.setState(GameUtils.STATE.PLAYING);
    
    this.gameLoop();
  }

  gameOver() {
    this.gameActive = false;
    
    if (window.GameUtils) GameUtils.setState(GameUtils.STATE.GAME_OVER);
    if (window.HorrorAudio) {
      HorrorAudio.playDeath();
      HorrorAudio.stopDrone();
    }
    
    const finalScore = document.getElementById('final-score');
    if (finalScore) {
      finalScore.textContent = `Score: ${this.score} | Lv ${this.level} | Lines: ${this.lines} | Max Combo: x${this.maxCombo}`;
    }
    
    const gameOverScreen = document.getElementById('game-over-screen');
    if (gameOverScreen) gameOverScreen.style.display = 'flex';
    
    const hud = document.getElementById('game-hud');
    if (hud) hud.style.display = 'none';
  }
}

// Initialize game
const game = new BloodTetrisGPU();
game.init().catch(console.error);

export default BloodTetrisGPU;

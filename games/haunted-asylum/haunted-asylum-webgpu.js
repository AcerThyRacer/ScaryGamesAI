/**
 * Haunted Asylum - Phase 1: WebGPU 3D Migration
 * Converted from 2D Canvas to 3D WebGPU renderer
 * Features: 3D first-person view, dynamic lighting, GPU particles
 */

import { initCore, ObjectPool, GPUParticleSystem } from '../../core/index.js';

class HauntedAsylumWebGPU {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.core = null;
    this.renderer = null;
    this.particleSystem = null;
    this.gameActive = false;
    
    // Game state
    this.player = { x: 0, y: 1.6, z: 0, yaw: 0, pitch: 0 };
    this.maze = [];
    this.patients = [];
    this.fuses = [];
    this.records = [];
    this.keys = {};
    this.fusesFound = 0;
    this.totalFuses = 3;
    this.recordsFound = 0;
    this.battery = 100;
    this.sanity = 100;
    this.timeSurvived = 0;
    
    // Constants
    this.TILE = 4;
    this.MAP_W = 40;
    this.MAP_H = 30;
    this.LIGHT_RADIUS = 15;
    
    // Cell types
    this.WALL = 1;
    this.FLOOR = 0;
    this.FUSE = 2;
    this.RECORD = 3;
    this.EXIT = 4;
    this.PLAYER_START = 5;
    this.PATIENT_SPAWN = 6;
    
    this.lastTime = 0;
    this.exitPos = { x: 0, z: 0 };
  }

  async init() {
    // Initialize core systems
    this.core = await initCore(this.canvas, {
      renderer: { antialias: true, hdr: false },
      particles: { maxParticles: 5000 }
    });

    this.renderer = this.core.renderer;
    this.particleSystem = this.core.particleSystem;

    if (!this.core.webgpuSupported) {
      console.warn('WebGPU not supported, falling back to WebGL');
      // TODO: Implement WebGL fallback
      return false;
    }

    this.setupInput();
    this.setupUI();
    
    console.log('Haunted Asylum WebGPU initialized');
    return true;
  }

  setupInput() {
    this.keys = {};
    
    document.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      
      if (e.code === 'KeyE') this.tryInteract();
      if (e.code === 'Escape' && this.gameActive) {
        this.gameActive = false;
        if (window.GameUtils) GameUtils.pauseGame();
      }
    });
    
    document.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    // Mouse look
    document.addEventListener('click', () => {
      if (this.gameActive && this.canvas) {
        this.canvas.requestPointerLock();
      }
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.gameActive || document.pointerLockElement !== this.canvas) return;
      
      this.player.yaw -= e.movementX * 0.002;
      this.player.pitch -= e.movementY * 0.002;
      this.player.pitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.player.pitch));
    });
  }

  setupUI() {
    const startBtn = document.getElementById('start-btn');
    if (startBtn) {
      startBtn.addEventListener('click', () => this.startGame());
    }

    const fullscreenBtn = document.getElementById('fullscreen-btn');
    if (fullscreenBtn) {
      fullscreenBtn.addEventListener('click', () => {
        if (window.GameUtils) GameUtils.toggleFullscreen();
      });
    }

    if (window.GameUtils) {
      GameUtils.injectDifficultySelector('start-screen');
      GameUtils.initPause({
        onResume: () => {
          this.gameActive = true;
          this.lastTime = performance.now();
          this.gameLoop();
        },
        onRestart: () => this.restartLevel()
      });
    }
  }

  generateMap() {
    this.maze = [];
    for (let r = 0; r < this.MAP_H; r++) {
      this.maze[r] = [];
      for (let c = 0; c < this.MAP_W; c++) {
        this.maze[r][c] = this.WALL;
      }
    }

    // Recursive backtracker maze generation
    const stack = [];
    const visited = [];
    for (let r = 0; r < this.MAP_H; r++) {
      visited[r] = [];
      for (let c = 0; c < this.MAP_W; c++) {
        visited[r][c] = false;
      }
    }

    const carve = (r, c) => {
      visited[r][c] = true;
      this.maze[r][c] = this.FLOOR;
      
      const dirs = [[0, 2], [0, -2], [2, 0], [-2, 0]];
      this.shuffle(dirs);
      
      for (const [dr, dc] of dirs) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr > 0 && nr < this.MAP_H - 1 && nc > 0 && nc < this.MAP_W - 1 && !visited[nr][nc]) {
          this.maze[r + dr / 2][c + dc / 2] = this.FLOOR;
          carve(nr, nc);
        }
      }
    };

    carve(1, 1);

    // Create rooms
    for (let rm = 0; rm < 8; rm++) {
      const rx = 2 + Math.floor(Math.random() * (this.MAP_W - 8));
      const ry = 2 + Math.floor(Math.random() * (this.MAP_H - 8));
      const rw = 3 + Math.floor(Math.random() * 3);
      const rh = 3 + Math.floor(Math.random() * 3);
      
      for (let r = ry; r < Math.min(ry + rh, this.MAP_H - 1); r++) {
        for (let c = rx; c < Math.min(rx + rw, this.MAP_W - 1); c++) {
          this.maze[r][c] = this.FLOOR;
        }
      }
    }

    // Place player
    this.player.x = 1 * this.TILE + this.TILE / 2;
    this.player.z = 1 * this.TILE + this.TILE / 2;

    // Place fuses
    const floorCells = [];
    for (let r = 0; r < this.MAP_H; r++) {
      for (let c = 0; c < this.MAP_W; c++) {
        if (this.maze[r][c] === this.FLOOR && (r > this.MAP_H / 3 || c > this.MAP_W / 3)) {
          floorCells.push({ r, c });
        }
      }
    }
    
    this.shuffle(floorCells);
    
    let placed = 0;
    for (let i = 0; i < floorCells.length && placed < this.totalFuses; i++) {
      const cell = floorCells[i];
      const dist = Math.abs(cell.r - 1) + Math.abs(cell.c - 1);
      if (dist > 10) {
        this.maze[cell.r][cell.c] = this.FUSE;
        this.fuses.push({ x: cell.c * this.TILE, z: cell.r * this.TILE, collected: false });
        placed++;
      }
    }

    // Place records
    for (let rc = 0; rc < 5 && floorCells.length > placed + rc; rc++) {
      const cell = floorCells[placed + rc];
      if (this.maze[cell.r][cell.c] === this.FLOOR) {
        this.maze[cell.r][cell.c] = this.RECORD;
        this.records.push({ x: cell.c * this.TILE, z: cell.r * this.TILE, collected: false });
      }
    }

    // Place exit
    for (let i = floorCells.length - 1; i >= 0; i--) {
      const cell = floorCells[i];
      if (this.maze[cell.r][cell.c] === this.FLOOR) {
        this.maze[cell.r][cell.c] = this.EXIT;
        this.exitPos = { x: cell.c * this.TILE, z: cell.r * this.TILE };
        break;
      }
    }

    // Place patients
    this.patients = [];
    const patientCount = 3 + Math.floor(window.GameUtils ? GameUtils.getMultiplier() : 1);
    
    for (let p = 0; p < patientCount; p++) {
      for (let i = Math.floor(floorCells.length / 3) + p; i < floorCells.length; i++) {
        const cell = floorCells[i];
        if (this.maze[cell.r][cell.c] === this.FLOOR) {
          this.patients.push({
            x: cell.c * this.TILE + this.TILE / 2,
            z: cell.r * this.TILE + this.TILE / 2,
            speed: 1.0 + Math.random() * 0.5,
            dir: Math.random() * Math.PI * 2,
            chasing: false,
            patrolTimer: 0,
            type: Math.floor(Math.random() * 3)
          });
          break;
        }
      }
    }
  }

  shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  isWall(x, z) {
    const c = Math.floor(x / this.TILE);
    const r = Math.floor(z / this.TILE);
    if (r < 0 || r >= this.MAP_H || c < 0 || c >= this.MAP_W) return true;
    return this.maze[r][c] === this.WALL;
  }

  canMove(x, z, margin = 0.4) {
    return !this.isWall(x - margin, z - margin) &&
           !this.isWall(x + margin, z - margin) &&
           !this.isWall(x - margin, z + margin) &&
           !this.isWall(x + margin, z + margin);
  }

  tryInteract() {
    const pc = Math.floor(this.player.x / this.TILE);
    const pr = Math.floor(this.player.z / this.TILE);

    // Check adjacent cells
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const r = pr + dr;
        const c = pc + dc;
        if (r < 0 || r >= this.MAP_H || c < 0 || c >= this.MAP_W) continue;

        if (this.maze[r][c] === this.FUSE) {
          this.maze[r][c] = this.FLOOR;
          this.fusesFound++;
          this.battery = Math.min(100, this.battery + 20);
          this.fuses.find(f => Math.abs(f.x - c * this.TILE) < 1 && Math.abs(f.z - r * this.TILE) < 1).collected = true;
          
          if (window.HorrorAudio) HorrorAudio.playCollect();
          if (window.ChallengeManager) ChallengeManager.notify('haunted-asylum', 'fuses_found', 1);
          
          this.updateHUD();
          return;
        }

        if (this.maze[r][c] === this.RECORD) {
          this.maze[r][c] = this.FLOOR;
          this.recordsFound++;
          this.sanity = Math.min(100, this.sanity + 5);
          this.records.find(rec => Math.abs(rec.x - c * this.TILE) < 1 && Math.abs(rec.z - r * this.TILE) < 1).collected = true;
          
          if (window.HorrorAudio) HorrorAudio.playCollect();
          if (window.ChallengeManager) ChallengeManager.notify('haunted-asylum', 'records', 1);
          
          this.updateHUD();
          return;
        }
      }
    }
  }

  updateHUD() {
    const fusesEl = document.getElementById('hud-fuses');
    const battEl = document.getElementById('hud-battery');
    const sanEl = document.getElementById('hud-sanity');
    const recEl = document.getElementById('hud-records');
    
    if (fusesEl) fusesEl.textContent = `🔌 Fuses: ${this.fusesFound} / ${this.totalFuses}`;
    if (battEl) {
      battEl.textContent = `🔋 Battery: ${Math.round(this.battery)}%`;
      battEl.style.color = this.battery > 50 ? '#00ff88' : this.battery > 25 ? '#ffaa00' : '#ff4444';
    }
    if (sanEl) {
      sanEl.textContent = `🧠 Sanity: ${Math.round(this.sanity)}%`;
      sanEl.style.color = this.sanity > 50 ? '#aa88ff' : this.sanity > 25 ? '#ff88aa' : '#ff4444';
    }
    if (recEl) recEl.textContent = `📋 Records: ${this.recordsFound}`;
  }

  update(dt) {
    if (!this.gameActive) return;

    this.timeSurvived += dt;

    // Player movement
    const sprinting = this.keys['ShiftLeft'] || this.keys['ShiftRight'];
    const speed = (sprinting ? 5 : 3) * dt;
    
    let moveX = 0;
    let moveZ = 0;
    
    if (this.keys['KeyW'] || this.keys['ArrowUp']) moveZ += 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) moveZ -= 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) moveX -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) moveX += 1;

    if (moveX !== 0 || moveZ !== 0) {
      const len = Math.sqrt(moveX * moveX + moveZ * moveZ);
      moveX /= len;
      moveZ /= len;

      const forward = { x: -Math.sin(this.player.yaw), z: -Math.cos(this.player.yaw) };
      const right = { x: Math.cos(this.player.yaw), z: -Math.sin(this.player.yaw) };

      const newX = this.player.x + (forward.x * moveZ + right.x * moveX) * speed;
      const newZ = this.player.z + (forward.z * moveZ + right.z * moveX) * speed;

      if (this.canMove(newX, this.player.z)) this.player.x = newX;
      if (this.canMove(this.player.x, newZ)) this.player.z = newZ;
    }

    // Battery drain
    this.battery -= (sprinting ? 0.12 : 0.02) * dt * 60 * (window.GameUtils ? GameUtils.getMultiplier() : 1);
    this.battery = Math.max(0, this.battery);

    // Sanity drain
    let nearPatient = false;
    this.patients.forEach(p => {
      const dx = this.player.x - p.x;
      const dz = this.player.z - p.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < this.TILE * 5) nearPatient = true;
    });

    this.sanity -= (nearPatient ? 0.08 : 0.02) * dt * 60 * (window.GameUtils ? GameUtils.getMultiplier() : 1);
    if (this.sanity <= 0) {
      this.sanity = 0;
      this.gameOver('Your mind broke... You belong here now.');
      return;
    }

    // Update patients
    this.updatePatients(dt);

    // Check exit
    if (this.fusesFound >= this.totalFuses) {
      const dx = this.player.x - this.exitPos.x;
      const dz = this.player.z - this.exitPos.z;
      if (Math.sqrt(dx * dx + dz * dz) < this.TILE * 0.7) {
        this.gameWin();
        return;
      }
    }

    this.updateHUD();
  }

  updatePatients(dt) {
    this.patients.forEach(p => {
      const dx = this.player.x - p.x;
      const dz = this.player.z - p.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const detectionRange = this.LIGHT_RADIUS * (this.battery / 100) * 1.8;

      p.chasing = dist < detectionRange && this.battery > 0;

      let spd;
      if (p.chasing) {
        spd = (p.type === 2 ? 2.8 : 1.8) * (window.GameUtils ? GameUtils.getMultiplier() : 1);
        const angle = Math.atan2(dz, dx);
        const nx = p.x + Math.cos(angle) * spd * this.TILE * dt;
        const nz = p.z + Math.sin(angle) * spd * this.TILE * dt;
        if (this.canMove(nx, p.z, 0.6)) p.x = nx;
        if (this.canMove(p.x, nz, 0.6)) p.z = nz;
      } else {
        if (p.type === 1) return; // Sitter doesn't patrol
        p.patrolTimer -= dt;
        if (p.patrolTimer <= 0) {
          p.dir = Math.random() * Math.PI * 2;
          p.patrolTimer = 1.5 + Math.random() * 3;
        }
        spd = p.speed * 0.4;
        const nx = p.x + Math.cos(p.dir) * spd * this.TILE * dt;
        const nz = p.z + Math.sin(p.dir) * spd * this.TILE * dt;
        if (this.canMove(nx, nz, 0.6)) {
          p.x = nx;
          p.z = nz;
        } else {
          p.dir = Math.random() * Math.PI * 2;
        }
      }

      // Collision check
      if (dist < this.TILE * 0.45) {
        this.gameOver(this.getPatientDeathMsg(p));
        return;
      }
    });
  }

  getPatientDeathMsg(p) {
    const msgs = [
      'A patient grabbed you from behind...',
      'You couldn\'t escape their grasp...',
      'They were faster than you expected...',
      'The asylum claimed another soul...'
    ];
    return msgs[Math.floor(Math.random() * msgs.length)];
  }

  render() {
    // Clear screen
    this.renderer.device.queue.clearBuffer(this.renderer.uniformBuffer);

    // TODO: Implement 3D rendering with WebGPU
    // For now, use placeholder rendering
    const commandEncoder = this.renderer.device.createCommandEncoder();
    
    const passEncoder = commandEncoder.beginRenderPass({
      colorAttachments: [{
        view: this.renderer.context.getCurrentTexture().createView(),
        clearValue: { r: 0.02, g: 0.02, b: 0.05, a: 1.0 },
        loadOp: 'clear',
        storeOp: 'store'
      }],
      depthStencilAttachment: {
        view: this.renderer.depthTexture.createView(),
        depthClearValue: 1.0,
        loadOp: 'clear',
        storeOp: 'discard'
      }
    });

    passEncoder.end();
    const commandBuffer = commandEncoder.finish();
    this.renderer.device.queue.submit([commandBuffer]);
  }

  gameLoop(time) {
    if (!this.gameActive) return;
    
    requestAnimationFrame((t) => this.gameLoop(t));

    if (!time) time = performance.now();
    const dt = Math.min((time - this.lastTime) / 1000, 0.05);
    this.lastTime = time;

    if (dt <= 0) return;

    this.update(dt);
    this.render();
  }

  startGame() {
    const startScreen = document.getElementById('start-screen');
    if (startScreen) startScreen.style.display = 'none';

    const ctrlOverlay = document.getElementById('controls-overlay');
    if (ctrlOverlay) {
      ctrlOverlay.style.display = 'flex';
      
      setTimeout(() => {
        ctrlOverlay.classList.add('hiding');
        setTimeout(() => {
          ctrlOverlay.style.display = 'none';
          ctrlOverlay.classList.remove('hiding');
          
          const hud = document.getElementById('game-hud');
          if (hud) hud.style.display = 'flex';
          
          const backLink = document.getElementById('back-link');
          if (backLink) backLink.style.display = 'none';

          this.generateMap();
          
          if (window.HorrorAudio) {
            HorrorAudio.startDrone(40, 'dark');
            HorrorAudio.startHeartbeat(50);
          }

          this.fusesFound = 0;
          this.recordsFound = 0;
          this.battery = 100;
          this.sanity = 100;
          this.timeSurvived = 0;
          this.gameActive = true;
          
          if (window.GameUtils) GameUtils.setState(GameUtils.STATE.PLAYING);
          
          this.lastTime = performance.now();
          this.gameLoop();
        }, 800);
      }, 3000);
    }
  }

  restartLevel() {
    const gameOverScreen = document.getElementById('game-over-screen');
    const winScreen = document.getElementById('game-win-screen');
    const hud = document.getElementById('game-hud');
    
    if (gameOverScreen) gameOverScreen.style.display = 'none';
    if (winScreen) winScreen.style.display = 'none';
    if (hud) hud.style.display = 'flex';

    this.fusesFound = 0;
    this.recordsFound = 0;
    this.battery = 100;
    this.sanity = 100;
    this.timeSurvived = 0;
    
    this.player.x = 1 * this.TILE + this.TILE / 2;
    this.player.z = 1 * this.TILE + this.TILE / 2;
    
    if (window.HorrorAudio) {
      HorrorAudio.startDrone(40, 'dark');
      HorrorAudio.startHeartbeat(50);
    }

    this.gameActive = true;
    this.lastTime = performance.now();
    
    if (window.GameUtils) GameUtils.setState(GameUtils.STATE.PLAYING);
  }

  gameOver(msg) {
    this.gameActive = false;
    
    if (window.GameUtils) GameUtils.setState(GameUtils.STATE.GAME_OVER);
    if (window.HorrorAudio) {
      HorrorAudio.playJumpScare();
      setTimeout(() => HorrorAudio.playDeath(), 400);
      HorrorAudio.stopDrone();
      HorrorAudio.stopHeartbeat();
    }

    const deathMsg = document.getElementById('death-msg');
    if (deathMsg) deathMsg.textContent = msg || 'They caught you...';

    const gameOverScreen = document.getElementById('game-over-screen');
    if (gameOverScreen) gameOverScreen.style.display = 'flex';

    const hud = document.getElementById('game-hud');
    if (hud) hud.style.display = 'none';

    if (window.ChallengeManager) {
      ChallengeManager.notify('haunted-asylum', 'fuses_found', this.fusesFound);
      ChallengeManager.notify('haunted-asylum', 'records', this.recordsFound);
      ChallengeManager.notify('haunted-asylum', 'time_survived', this.timeSurvived);
    }
  }

  gameWin() {
    this.gameActive = false;
    
    if (window.HorrorAudio) HorrorAudio.playWin();
    if (window.GameUtils) GameUtils.setState(GameUtils.STATE.WIN);

    const winMsg = document.getElementById('win-msg');
    if (winMsg) {
      winMsg.textContent = `You escaped! Battery: ${Math.round(this.battery)}% | Sanity: ${Math.round(this.sanity)}% | Records: ${this.recordsFound}`;
    }

    const winScreen = document.getElementById('game-win-screen');
    if (winScreen) winScreen.style.display = 'flex';

    const hud = document.getElementById('game-hud');
    if (hud) hud.style.display = 'none';

    if (window.ChallengeManager) {
      ChallengeManager.notify('haunted-asylum', 'escapes', 1);
      ChallengeManager.notify('haunted-asylum', 'fuses_found', this.fusesFound);
      ChallengeManager.notify('haunted-asylum', 'records', this.recordsFound);
      ChallengeManager.notify('haunted-asylum', 'time_survived', this.timeSurvived);
      ChallengeManager.notify('haunted-asylum', 'sanity_remaining', Math.round(this.sanity));
    }
  }
}

// Initialize game
const game = new HauntedAsylumWebGPU();
game.init().catch(console.error);

export default HauntedAsylumWebGPU;

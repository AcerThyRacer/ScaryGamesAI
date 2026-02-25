/**
 * The Elevator - Phase 2: Advanced Audio Integration
 * Features: Floor-specific ambiance, room acoustics, dynamic elevator sounds
 */

import { initCore, getAudioManager } from '../../core/index.js';

class TheElevatorAudio {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.core = null;
    this.audio = null;
    this.gameActive = false;
    
    // Game state
    this.currentFloor = 0;
    this.targetFloor = 0;
    this.isMoving = false;
    this.elevatorVelocity = 0;
    this.doorOpen = false;
    this.lightFlickering = false;
    
    // Audio state
    this.ambientSource = null;
    this.motorSource = null;
    this.floorAmbience = [];
    this.lastFloor = 0;
    
    this.lastTime = 0;
  }

  async init() {
    // Initialize core with audio
    this.core = await initCore(this.canvas, {
      audio: { sampleRate: 44100 },
      gameId: 'the-elevator'
    });

    this.audio = this.core.audioManager;
    
    if (!this.audio) {
      console.warn('Audio not available, using fallback');
      return false;
    }

    this.setupInput();
    this.setupUI();
    this.generateFloorAmbience();
    
    console.log('The Elevator with Phase 2 Audio initialized');
    return true;
  }

  setupInput() {
    // Elevator button clicks
    document.querySelectorAll('.floor-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const floor = parseInt(e.target.dataset.floor);
        this.callElevator(floor);
        this.playButtonSound();
      });
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

  /**
   * Generate procedural ambience for each floor
   */
  generateFloorAmbience() {
    const floorTypes = [
      { name: 'Basement', freq: 60, type: 'industrial' },
      { name: 'Lobby', freq: 100, type: 'echoey' },
      { name: 'Office', freq: 200, type: 'quiet' },
      { name: 'Residential', freq: 150, type: 'muffled' },
      { name: 'Penthouse', freq: 300, type: 'windy' },
      { name: 'Roof', freq: 250, type: 'outdoor' }
    ];

    floorTypes.forEach((floor, index) => {
      if (this.audio?.procedural) {
        const buffer = this.createFloorAmbience(floor.type, floor.freq);
        this.floorAmbience[index] = {
          buffer,
          name: floor.name,
          type: floor.type
        };
      }
    });
  }

  createFloorAmbience(type, baseFreq) {
    const duration = 10;
    const sampleRate = this.audio.getContext().sampleRate;
    const length = sampleRate * duration;
    const buffer = this.audio.getContext().createBuffer(2, length, sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      let sample = 0;

      if (type === 'industrial') {
        // Humming machinery
        sample = Math.sin(2 * Math.PI * baseFreq * t) * 0.2;
        sample += Math.sin(2 * Math.PI * (baseFreq * 1.5) * t) * 0.1;
        sample += (Math.random() * 2 - 1) * 0.05;
      } else if (type === 'echoey') {
        // Large empty space
        sample = (Math.random() * 2 - 1) * 0.1;
        sample = sample * 0.5 + (i > 0 ? left[i-1] * 0.5 : 0);
      } else if (type === 'quiet') {
        // HVAC hum
        sample = Math.sin(2 * Math.PI * baseFreq * t) * 0.05;
        sample += Math.sin(2 * Math.PI * (baseFreq * 2) * t) * 0.03;
      } else if (type === 'muffled') {
        // Muffled sounds from other apartments
        sample = (Math.random() * 2 - 1) * 0.08;
        sample = sample * 0.3 + (i > 0 ? left[i-1] * 0.7 : 0);
      } else if (type === 'windy') {
        // Wind noise
        sample = (Math.random() * 2 - 1) * 0.15;
        sample = sample * 0.2 + (i > 0 ? left[i-1] * 0.8 : 0);
      } else if (type === 'outdoor') {
        // Distant city sounds
        sample = (Math.random() * 2 - 1) * 0.1;
        sample += Math.sin(2 * Math.PI * 100 * t) * 0.02;
      }

      left[i] = sample;
      right[i] = sample * 0.9;
    }

    return buffer;
  }

  callElevator(floor) {
    if (this.isMoving) return;
    
    this.targetFloor = floor;
    this.isMoving = true;
    this.doorOpen = false;
    
    // Play door close sound
    this.audio?.playSFX('door', { type: 'slam' });
    
    // Start elevator motor
    this.startElevatorMotor();
  }

  startElevatorMotor() {
    if (!this.audio?.context) return;
    
    // Create motor drone
    const motorBuffer = this.createMotorSound();
    this.motorSource = this.audio.context.createBufferSource();
    this.motorSource.buffer = motorBuffer;
    this.motorSource.loop = true;
    
    const gainNode = this.audio.context.createGain();
    gainNode.gain.value = 0;
    
    this.motorSource.connect(gainNode);
    gainNode.connect(this.audio.context.destination);
    this.motorSource.start(0);
    
    // Fade in
    gainNode.gain.setTargetAtTime(0.3, this.audio.context.currentTime, 0.5);
  }

  createMotorSound() {
    const duration = 2;
    const sampleRate = this.audio.getContext().sampleRate;
    const length = sampleRate * duration;
    const buffer = this.audio.getContext().createBuffer(2, length, sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      // Electric motor hum
      let sample = Math.sin(2 * Math.PI * 100 * t) * 0.3;
      sample += Math.sin(2 * Math.PI * 200 * t) * 0.2;
      sample += Math.sin(2 * Math.PI * 50 * t) * 0.1;
      // Add some noise
      sample += (Math.random() * 2 - 1) * 0.05;
      
      left[i] = sample;
      right[i] = sample;
    }

    return buffer;
  }

  update(dt) {
    if (!this.gameActive) return;

    // Update elevator movement
    if (this.isMoving) {
      const direction = this.targetFloor > this.currentFloor ? 1 : -1;
      this.elevatorVelocity += direction * 0.5 * dt;
      this.elevatorVelocity = Math.max(-2, Math.min(2, this.elevatorVelocity));
      
      this.currentFloor += this.elevatorVelocity * dt;
      
      // Update motor pitch based on velocity
      if (this.motorSource) {
        const pitch = 1 + Math.abs(this.elevatorVelocity) * 0.2;
        this.motorSource.playbackRate.value = pitch;
      }
      
      // Floor passing sound
      if (Math.floor(this.currentFloor) !== this.lastFloor && 
          this.currentFloor % 1 < 0.1) {
        this.playFloorPassingSound();
      }
      
      // Arrived at floor
      if (Math.abs(this.currentFloor - this.targetFloor) < 0.1) {
        this.currentFloor = this.targetFloor;
        this.isMoving = false;
        this.elevatorVelocity = 0;
        this.stopElevatorMotor();
        this.openDoors();
      }
    }

    // Update floor ambience
    this.updateFloorAmbience();

    // Update audio listener
    if (this.audio?.spatial) {
      this.audio.updateListener(
        { x: 0, y: this.currentFloor * 3, z: 2 },
        { forward: { x: 0, y: 0, z: -1 }, up: { x: 0, y: 1, z: 0 } }
      );
    }

    this.lastFloor = Math.floor(this.currentFloor);
  }

  updateFloorAmbience() {
    const floorIdx = Math.floor(this.currentFloor) % this.floorAmbience.length;
    const floorData = this.floorAmbience[floorIdx];
    
    if (floorData && !this.isMoving) {
      // Crossfade to new floor ambience
      if (this.ambientSource) {
        this.ambientSource.gain.gain.setTargetAtTime(
          0,
          this.audio.context.currentTime,
          1
        );
        this.ambientSource.source.stop(this.audio.context.currentTime + 1);
      }
      
      this.ambientSource = {
        source: this.audio.context.createBufferSource(),
        gain: this.audio.context.createGain()
      };
      
      this.ambientSource.source.buffer = floorData.buffer;
      this.ambientSource.source.loop = true;
      this.ambientSource.gain.gain.value = 0;
      
      this.ambientSource.source.connect(this.ambientSource.gain);
      this.ambientSource.gain.connect(this.audio.context.destination);
      this.ambientSource.source.start(0);
      
      // Fade in
      this.ambientSource.gain.gain.setTargetAtTime(
        0.3,
        this.audio.context.currentTime,
        1
      );
    }
  }

  stopElevatorMotor() {
    if (this.motorSource) {
      // Fade out
      const gain = this.motorSource._gain || this.audio.context.createGain();
      gain.gain.setTargetAtTime(
        0,
        this.audio.context.currentTime,
        0.3
      );
      this.motorSource.stop(this.audio.context.currentTime + 0.5);
      this.motorSource = null;
    }
  }

  openDoors() {
    this.doorOpen = true;
    this.audio?.playSFX('door', { type: 'creak' });
    
    // Play floor-specific sound
    const floorIdx = Math.floor(this.currentFloor) % this.floorAmbience.length;
    const floorData = this.floorAmbience[floorIdx];
    if (floorData) {
      this.audio?.speak(`Floor ${Math.floor(this.currentFloor)}: ${floorData.name}`, {
        emotion: 'ghostly',
        volume: 0.5
      });
    }
  }

  playButtonSound() {
    this.audio?.playSFX('collect', { frequency: 1200 });
  }

  playFloorPassingSound() {
    this.audio?.playSFX('hit', { duration: 0.1 });
  }

  render() {
    // Render elevator UI
    const ctx = this.canvas.getContext('2d');
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw floor indicator
    ctx.fillStyle = '#fff';
    ctx.font = '48px Inter';
    ctx.textAlign = 'center';
    ctx.fillText(`Floor ${Math.floor(this.currentFloor)}`, this.canvas.width / 2, this.canvas.height / 2);
  }

  gameLoop(time) {
    if (!this.gameActive) return;
    
    requestAnimationFrame((t) => this.gameLoop(t));
    
    if (!time) time = performance.now();
    const dt = Math.min((time - this.lastTime) / 1000, 0.1);
    this.lastTime = time;
    
    this.update(dt);
    this.render();
    
    // Update audio
    this.audio?.update(dt);
  }

  startGame() {
    const startScreen = document.getElementById('start-screen');
    if (startScreen) startScreen.style.display = 'none';
    
    this.gameActive = true;
    this.lastTime = performance.now();
    
    if (window.GameUtils) GameUtils.setState(GameUtils.STATE.PLAYING);
    
    // Start ambient sound
    this.audio?.playMusic('ambient');
    
    this.gameLoop();
  }

  restartGame() {
    this.currentFloor = 0;
    this.targetFloor = 0;
    this.isMoving = false;
    this.doorOpen = false;
    
    const gameOverScreen = document.getElementById('game-over-screen');
    if (gameOverScreen) gameOverScreen.style.display = 'none';
    
    this.gameActive = true;
    this.lastTime = performance.now();
    
    if (window.GameUtils) GameUtils.setState(GameUtils.STATE.PLAYING);
    
    this.gameLoop();
  }
}

// Initialize game
const game = new TheElevatorAudio();
game.init().catch(console.error);

export default TheElevatorAudio;

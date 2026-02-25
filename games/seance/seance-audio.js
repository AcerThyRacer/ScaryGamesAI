/**
 * Séance - Phase 2: Advanced Audio Integration
 * Features: Real-time spirit voice synthesis, EMF noise, ritual sounds
 */

import { initCore, getAudioManager } from '../../core/index.js';

class SeanceAudio {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.core = null;
    this.audio = null;
    this.gameActive = false;
    
    // Game state
    this.spiritPresence = 0;
    this.emfLevel = 0;
    this.ritualComplete = 0;
    this.spiritType = 'whisper'; // whisper, angry, sad, demonic
    
    // Audio state
    this.emfNoiseSource = null;
    this.ritualDroneSource = null;
    this.spiritMessages = [
      'Help me...',
      'Find the key...',
      'They\'re watching...',
      'Behind you...',
      'Too late...',
      'Escape...',
      'Join us...',
      'Forever...'
    ];
    
    this.lastTime = 0;
  }

  async init() {
    this.core = await initCore(this.canvas, {
      audio: { sampleRate: 44100 },
      gameId: 'seance'
    });

    this.audio = this.core.audioManager;
    
    if (!this.audio) {
      console.warn('Audio not available');
      return false;
    }

    this.setupInput();
    this.setupUI();
    this.startEMFNoise();
    this.startRitualDrone();
    
    console.log('Séance with Phase 2 Audio initialized');
    return true;
  }

  setupInput() {
    // Ouija board interaction
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('ouija-letter')) {
        this.selectLetter(e.target.textContent);
      }
    });

    document.addEventListener('mousemove', (e) => {
      // Update spirit position based on mouse
      const rect = this.canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      
      if (this.audio?.spatial) {
        this.audio.updateSourcePosition('spirit', {
          x: (x - 0.5) * 10,
          y: 1.5,
          z: (y - 0.5) * 10
        });
      }
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
   * Start EMF background noise
   */
  startEMFNoise() {
    if (!this.audio?.context) return;
    
    const noiseBuffer = this.createEMFNoise();
    this.emfNoiseSource = this.audio.context.createBufferSource();
    this.emfNoiseSource.buffer = noiseBuffer;
    this.emfNoiseSource.loop = true;
    
    const gainNode = this.audio.context.createGain();
    gainNode.gain.value = 0.1;
    
    // Add bandpass filter for EMF radio interference sound
    const filter = this.audio.context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1000;
    filter.Q.value = 1;
    
    this.emfNoiseSource.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.audio.context.destination);
    this.emfNoiseSource.start(0);
  }

  createEMFNoise() {
    const duration = 5;
    const sampleRate = this.audio.getContext().sampleRate;
    const length = sampleRate * duration;
    const buffer = this.audio.getContext().createBuffer(2, length, sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      // Intermittent bursts of noise
      let sample = (Math.random() * 2 - 1) * 0.3;
      
      // Amplitude modulation for crackling effect
      const modulation = Math.sin(2 * Math.PI * 10 * t) * 0.5 + 0.5;
      sample *= modulation;
      
      // Random bursts
      if (Math.random() < 0.01) {
        sample *= 3;
      }
      
      left[i] = sample;
      right[i] = sample * 0.9;
    }

    return buffer;
  }

  /**
   * Start ritual drone background
   */
  startRitualDrone() {
    if (!this.audio?.context) return;
    
    const droneBuffer = this.createRitualDrone();
    this.ritualDroneSource = this.audio.context.createBufferSource();
    this.ritualDroneSource.buffer = droneBuffer;
    this.ritualDroneSource.loop = true;
    
    const gainNode = this.audio.context.createGain();
    gainNode.gain.value = 0.15;
    
    this.ritualDroneSource.connect(gainNode);
    gainNode.connect(this.audio.context.destination);
    this.ritualDroneSource.start(0);
  }

  createRitualDrone() {
    const duration = 10;
    const sampleRate = this.audio.getContext().sampleRate;
    const length = sampleRate * duration;
    const buffer = this.audio.getContext().createBuffer(2, length, sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    // Chord based on ritual tones
    const frequencies = [110, 164.81, 196, 220]; // A2, E3, G3, A3

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      let sample = 0;
      
      frequencies.forEach((freq, idx) => {
        sample += Math.sin(2 * Math.PI * freq * t) * (0.2 / (idx + 1));
      });
      
      // Slow modulation
      sample *= 1 + Math.sin(2 * Math.PI * 0.2 * t) * 0.1;
      
      left[i] = sample;
      right[i] = sample * 0.95;
    }

    return buffer;
  }

  /**
   * Select letter on ouija board
   */
  selectLetter(letter) {
    this.audio?.playSFX('collect', { frequency: 880, duration: 0.1 });
    
    // Random chance of spirit response
    if (Math.random() < 0.3) {
      this.triggerSpiritResponse(letter);
    }
  }

  /**
   * Trigger spirit voice response
   */
  triggerSpiritResponse(letter) {
    const message = this.getRandomMessage();
    const emotion = this.spiritType;
    
    // Use procedural ghostly voice
    if (this.audio?.procedural) {
      const ghostBuffer = this.audio.procedural.createGhost({
        duration: 2,
        frequency: 300 + Math.random() * 200
      });
      
      const source = this.audio.context.createBufferSource();
      source.buffer = ghostBuffer;
      
      const panner = this.audio.context.createPanner();
      panner.positionX.value = (Math.random() - 0.5) * 5;
      panner.positionY.value = 1.5;
      panner.positionZ.value = (Math.random() - 0.5) * 5;
      panner.panningModel = 'HRTF';
      
      source.connect(panner);
      panner.connect(this.audio.context.destination);
      source.start(0);
    }
    
    // Also use Web Speech API for clearer messages
    this.audio?.speak(message, {
      emotion: emotion,
      pitch: 0.7,
      rate: 0.8,
      volume: 0.6
    });
    
    // Increase spirit presence
    this.spiritPresence += 0.1;
  }

  getRandomMessage() {
    return this.spiritMessages[Math.floor(Math.random() * this.spiritMessages.length)];
  }

  update(dt) {
    if (!this.gameActive) return;

    // Update EMF level based on spirit presence
    this.emfLevel = this.spiritPresence * (0.5 + Math.random() * 0.5);
    
    // Modulate EMF noise volume
    if (this.emfNoiseSource) {
      const targetGain = 0.1 + this.emfLevel * 0.3;
      // Smooth transition
    }
    
    // Random spirit activity
    if (Math.random() < 0.01 * this.spiritPresence) {
      this.triggerRandomEvent();
    }

    // Update audio listener based on player position
    if (this.audio?.spatial) {
      this.audio.updateListener(
        { x: 0, y: 1.5, z: 3 },
        { forward: { x: 0, y: 0, z: -1 }, up: { x: 0, y: 1, z: 0 } }
      );
    }

    this.audio?.update(dt);
  }

  triggerRandomEvent() {
    const events = ['whisper', 'scratch', 'door', 'ghost'];
    const event = events[Math.floor(Math.random() * events.length)];
    
    this.audio?.playSFX(event, {}, {
      x: (Math.random() - 0.5) * 10,
      y: 1.5,
      z: (Math.random() - 0.5) * 10
    });
  }

  render() {
    const ctx = this.canvas.getContext('2d');
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw EMF meter
    ctx.fillStyle = '#00ff00';
    ctx.font = '20px Inter';
    ctx.textAlign = 'left';
    ctx.fillText(`EMF: ${(this.emfLevel * 100).toFixed(0)}%`, 20, 40);
    
    // Draw spirit presence
    ctx.fillStyle = '#ff00ff';
    ctx.fillText(`Presence: ${(this.spiritPresence * 100).toFixed(0)}%`, 20, 70);
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
    this.spiritPresence = 0;
    this.emfLevel = 0;
    this.ritualComplete = 0;
    
    const gameOverScreen = document.getElementById('game-over-screen');
    if (gameOverScreen) gameOverScreen.style.display = 'none';
    
    this.gameActive = true;
    this.lastTime = performance.now();
    
    if (window.GameUtils) GameUtils.setState(GameUtils.STATE.PLAYING);
    
    this.gameLoop();
  }
}

// Initialize game
const game = new SeanceAudio();
game.init().catch(console.error);

export default SeanceAudio;

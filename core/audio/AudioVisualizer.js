/**
 * FFT Audio Visualizer - Phase 2: Advanced Audio Systems
 * Real-time frequency analysis and visualization for audio feedback
 */

export class AudioVisualizer {
  constructor(audioContext) {
    this.context = audioContext;
    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.8;
    this.analyser.minDecibels = -90;
    this.analyser.maxDecibels = -10;
    
    this.bufferLength = this.analyser.frequencyBinCount;
    this.dataArray = new Uint8Array(this.bufferLength);
    this.timeDomainData = new Uint8Array(this.bufferLength);
    
    this.canvas = null;
    this.ctx = null;
    this.visualizationType = 'frequency'; // 'frequency', 'waveform', 'spectrogram'
    this.isActive = false;
    this.animationId = null;
    
    // Connect analyser to destination
    this.analyser.connect(this.context.destination);
  }

  /**
   * Set canvas for visualization
   */
  setCanvas(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    if (canvas) {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }
  }

  /**
   * Start visualization
   */
  start(type = 'frequency') {
    if (!this.canvas || !this.ctx) {
      console.warn('No canvas set for visualization');
      return;
    }

    this.visualizationType = type;
    this.isActive = true;
    this.animate();
  }

  /**
   * Stop visualization
   */
  stop() {
    this.isActive = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  /**
   * Animation loop
   */
  animate() {
    if (!this.isActive) return;

    this.animationId = requestAnimationFrame(() => this.animate());

    // Get frequency or time domain data
    if (this.visualizationType === 'waveform') {
      this.analyser.getByteTimeDomainData(this.timeDomainData);
    } else {
      this.analyser.getByteFrequencyData(this.dataArray);
    }

    // Clear canvas
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw based on type
    if (this.visualizationType === 'frequency') {
      this.drawFrequencyBars();
    } else if (this.visualizationType === 'waveform') {
      this.drawWaveform();
    } else if (this.visualizationType === 'spectrogram') {
      this.drawSpectrogram();
    }
  }

  /**
   * Draw frequency bars
   */
  drawFrequencyBars() {
    const barWidth = (this.canvas.width / this.bufferLength) * 2.5;
    let x = 0;

    for (let i = 0; i < this.bufferLength; i++) {
      const barHeight = (this.dataArray[i] / 255) * this.canvas.height;

      // Color based on frequency
      const hue = (i / this.bufferLength) * 360;
      this.ctx.fillStyle = `hsl(${hue}, 80%, 50%)`;
      
      this.ctx.fillRect(x, this.canvas.height - barHeight, barWidth, barHeight);

      x += barWidth + 1;
    }
  }

  /**
   * Draw waveform
   */
  drawWaveform() {
    this.ctx.lineWidth = 2;
    this.ctx.strokeStyle = '#00ff88';
    this.ctx.beginPath();

    const sliceWidth = this.canvas.width / this.bufferLength;
    let x = 0;

    for (let i = 0; i < this.bufferLength; i++) {
      const v = this.timeDomainData[i] / 128.0;
      const y = (v * this.canvas.height) / 2;

      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    this.ctx.lineTo(this.canvas.width, this.canvas.height / 2);
    this.ctx.stroke();
  }

  /**
   * Draw spectrogram (waterfall display)
   */
  drawSpectrogram() {
    // Create offscreen canvas for scrolling
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    
    // Shift existing image down
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = this.canvas.width;
    tempCanvas.height = this.canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.putImageData(imageData, 0, 0);
    
    this.ctx.drawImage(tempCanvas, 0, 1);
    
    // Draw new line at top
    for (let i = 0; i < this.bufferLength; i++) {
      const x = (i / this.bufferLength) * this.canvas.width;
      const value = this.dataArray[i];
      const hue = (value / 255) * 360;
      
      this.ctx.fillStyle = `hsl(${hue}, 80%, 50%)`;
      this.ctx.fillRect(x, 0, (this.canvas.width / this.bufferLength), 1);
    }
  }

  /**
   * Get frequency data
   */
  getFrequencyData() {
    this.analyser.getByteFrequencyData(this.dataArray);
    return this.dataArray;
  }

  /**
   * Get time domain data
   */
  getTimeDomainData() {
    this.analyser.getByteTimeDomainData(this.timeDomainData);
    return this.timeDomainData;
  }

  /**
   * Get RMS (root mean square) amplitude
   */
  getRMS() {
    this.analyser.getFloatTimeDomainData(this.timeDomainData);
    let sum = 0;
    for (let i = 0; i < this.bufferLength; i++) {
      sum += this.timeDomainData[i] * this.timeDomainData[i];
    }
    return Math.sqrt(sum / this.bufferLength);
  }

  /**
   * Get dominant frequency
   */
  getDominantFrequency() {
    this.analyser.getByteFrequencyData(this.dataArray);
    
    let maxValue = 0;
    let maxIndex = 0;
    
    for (let i = 0; i < this.bufferLength; i++) {
      if (this.dataArray[i] > maxValue) {
        maxValue = this.dataArray[i];
        maxIndex = i;
      }
    }
    
    const nyquist = this.context.sampleRate / 2;
    return (maxIndex / this.bufferLength) * nyquist;
  }

  /**
   * Get frequency range average
   */
  getFrequencyRangeAverage(startFreq, endFreq) {
    const nyquist = this.context.sampleRate / 2;
    const startIndex = Math.floor((startFreq / nyquist) * this.bufferLength);
    const endIndex = Math.floor((endFreq / nyquist) * this.bufferLength);
    
    let sum = 0;
    let count = 0;
    
    for (let i = startIndex; i < endIndex; i++) {
      sum += this.dataArray[i];
      count++;
    }
    
    return count > 0 ? sum / count : 0;
  }

  /**
   * Detect if audio is playing
   */
  isPlaying(threshold = 10) {
    const rms = this.getRMS();
    return rms > threshold;
  }

  /**
   * Set FFT size
   */
  setFFTSize(size) {
    this.analyser.fftSize = size;
    this.bufferLength = this.analyser.frequencyBinCount;
    this.dataArray = new Uint8Array(this.bufferLength);
    this.timeDomainData = new Uint8Array(this.bufferLength);
  }

  /**
   * Set smoothing
   */
  setSmoothing(value) {
    this.analyser.smoothingTimeConstant = Math.max(0, Math.min(1, value));
  }

  /**
   * Cleanup
   */
  dispose() {
    this.stop();
    this.analyser.disconnect();
    if (this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }
}

export default AudioVisualizer;

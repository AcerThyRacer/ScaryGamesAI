class AudioSystem {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.5;
        this.masterGain.connect(this.ctx.destination);
        
        this.sounds = {};
        this.musicPlaying = false;
    }

    // Procedural sound effects
    playFootstep(surface) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(100 + Math.random() * 50, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.1);
        
        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        osc.start();
        osc.stop(this.ctx.currentTime + 0.1);
    }

    playHeartbeat(rate) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(60, this.ctx.currentTime);
        
        gain.gain.setValueAtTime(0.8, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        osc.start();
        osc.stop(this.ctx.currentTime + 0.2);
        
        // Second beat
        setTimeout(() => {
            const osc2 = this.ctx.createOscillator();
            const gain2 = this.ctx.createGain();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(50, this.ctx.currentTime);
            gain2.gain.setValueAtTime(0.6, this.ctx.currentTime);
            gain2.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
            osc2.connect(gain2);
            gain2.connect(this.masterGain);
            osc2.start();
            osc2.stop(this.ctx.currentTime + 0.2);
        }, 1000 / rate);
    }

    playJumpscare() {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(800, this.ctx.currentTime + 0.1);
        osc.frequency.linearRampToValueAtTime(100, this.ctx.currentTime + 0.3);
        
        gain.gain.setValueAtTime(1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        osc.start();
        osc.stop(this.ctx.currentTime + 0.5);
    }

    playCollectItem(type) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        if (type === 'battery') {
            osc.frequency.setValueAtTime(880, this.ctx.currentTime);
            osc.frequency.setValueAtTime(1100, this.ctx.currentTime + 0.1);
        } else if (type === 'key') {
            osc.frequency.setValueAtTime(1200, this.ctx.currentTime);
            osc.frequency.setValueAtTime(1600, this.ctx.currentTime + 0.15);
        } else {
            osc.frequency.setValueAtTime(660, this.ctx.currentTime);
            osc.frequency.setValueAtTime(880, this.ctx.currentTime + 0.1);
        }
        
        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        osc.start();
        osc.stop(this.ctx.currentTime + 0.3);
    }

    // Ambient drone
    startAmbientDrone() {
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc1.type = 'sine';
        osc1.frequency.value = 50;
        osc2.type = 'sine';
        osc2.frequency.value = 52; // Slight detune for beating
        
        gain.gain.value = 0.1;
        
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.masterGain);
        
        osc1.start();
        osc2.start();
        
        this.ambientOscillators = [osc1, osc2];
    }

    stopAmbientDrone() {
        if (this.ambientOscillators) {
            this.ambientOscillators.forEach(osc => osc.stop());
            this.ambientOscillators = null;
        }
    }
}

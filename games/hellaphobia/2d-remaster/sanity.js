class SanitySystem {
    constructor() {
        this.maxSanity = 100;
        this.currentSanity = 100;
        this.drainRateInDark = 2; // Sanity lost per second in darkness
        
        this.uiFill = document.getElementById('sanity-fill');
        this.glitchOverlay = document.getElementById('glitch-overlay');
    }

    update(deltaTime, inDarkness) {
        if (inDarkness) {
            this.currentSanity -= this.drainRateInDark * deltaTime;
        } else {
            // Very slow recovery in light
            this.currentSanity += 0.5 * deltaTime;
        }

        // Clamp
        if (this.currentSanity < 0) this.currentSanity = 0;
        if (this.currentSanity > this.maxSanity) this.currentSanity = this.maxSanity;

        // Update UI
        this.updateUI();
        this.applyPsychologicalEffects();
    }

    updateUI() {
        if (!this.uiFill) return;
        const percent = (this.currentSanity / this.maxSanity) * 100;
        this.uiFill.style.width = `${percent}%`;
        
        if (percent < 30) {
            this.uiFill.style.background = 'linear-gradient(90deg, #ff0000, #aa0000)';
        } else {
            this.uiFill.style.background = 'linear-gradient(90deg, #440088, #8800ff)';
        }
    }

    applyPsychologicalEffects() {
        // Glitch effect triggers more often at low sanity
        if (this.currentSanity < 50) {
            const glitchChance = (50 - this.currentSanity) / 1000;
            if (Math.random() < glitchChance) {
                this.triggerGlitch();
            }
        }
    }

    triggerGlitch() {
        if (!this.glitchOverlay) return;
        this.glitchOverlay.classList.add('active');
        setTimeout(() => {
            this.glitchOverlay.classList.remove('active');
        }, Math.random() * 200 + 50); // 50-250ms glitch
    }
}

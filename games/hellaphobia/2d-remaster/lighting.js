class LightingSystem {
    constructor() {
        this.flashlightOn = true;
        this.battery = 100; // %
        this.drainRate = 1; // % per second
        this.radius = 300;
        this.angle = Math.PI / 4; // 45 degree spread
    }

    update(deltaTime, engine) {
        // Toggle flashlight with F
        if (engine.keys['KeyF']) {
            if (!this.fPressed) {
                this.flashlightOn = !this.flashlightOn;
                this.fPressed = true;
            }
        } else {
            this.fPressed = false;
        }

        if (this.flashlightOn && this.battery > 0) {
            this.battery -= this.drainRate * deltaTime;
            if (this.battery <= 0) {
                this.battery = 0;
                this.flashlightOn = false;
            }
        }
    }

    draw(ctx, player) {
        // Create full darkness overlay
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = 'rgba(0, 0, 0, 0.95)';
        ctx.fillRect(0, 0, 800, 600);

        if (!this.flashlightOn) return;

        // Cut out the light
        ctx.globalCompositeOperation = 'destination-out';
        
        const cx = player.x + player.width / 2;
        const cy = player.y + player.height / 2;
        
        // Draw ambient glow around player
        const ambientGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 60);
        ambientGlow.addColorStop(0, 'rgba(255, 255, 255, 1)');
        ambientGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = ambientGlow;
        ctx.beginPath();
        ctx.arc(cx, cy, 60, 0, Math.PI * 2);
        ctx.fill();

        // Draw flashlight beam
        const direction = player.facingRight ? 0 : Math.PI;
        
        const beam = ctx.createRadialGradient(cx, cy, 0, cx, cy, this.radius);
        beam.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        beam.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.fillStyle = beam;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, this.radius, direction - this.angle, direction + this.angle);
        ctx.fill();
        
        ctx.globalCompositeOperation = 'source-over';
        
        // Flickering effect if low battery
        if (this.battery < 20 && Math.random() < 0.1) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(0, 0, 800, 600);
        }
    }
}

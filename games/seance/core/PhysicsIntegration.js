/**
 * ============================================
 * Séance - Physics Integration
 * ============================================
 * Ethereal spirits with soft body physics, ectoplasm fluids
 */
(function(global) {
    'use strict';

    const SeancePhysics = {
        config: {
            softBodyEnabled: true,
            fluidEnabled: true,
            maxEctoplasmParticles: 600
        },

        softBodySim: null,
        fluidSim: null,
        spiritSoftBodies: [],

        init: function() {
            const { SoftBody, FluidSimulation } = global.SGAI?.Physics || {};
            
            if (this.config.softBodyEnabled && SoftBody) {
                this.softBodySim = new SoftBody({ gravity: { x: 0, y: -2 }, pressure: true });
            }
            
            if (this.config.fluidEnabled && FluidSimulation) {
                this.fluidSim = new FluidSimulation({
                    maxParticles: this.config.maxEctoplasmParticles,
                    gravity: { x: 0, y: 5 },
                    viscosity: 0.85
                });
            }

            console.log('[SeancePhysics] Initialized');
            return this;
        },

        createSoftSpirit: function(x, y, radius, spiritType) {
            if (!this.softBodySim) return null;
            
            const softBody = this.softBodySim.createSoftCircle(x, y, radius, 16, 0.3, 1.5);
            softBody.spiritType = spiritType;
            softBody.floating = true;
            this.spiritSoftBodies.push(softBody);
            return softBody;
        },

        spawnEctoplasm: function(x, y, amount = 40) {
            if (!this.fluidSim) return;
            
            for (let i = 0; i < amount; i++) {
                const particle = this.fluidSim.addParticle(x, y, 'ectoplasm');
                if (particle) {
                    particle.vx = (Math.random() - 0.5) * 100;
                    particle.vy = (Math.random() - 0.5) * 100 - 50;
                }
            }
        },

        update: function(dt) {
            if (this.softBodySim) {
                this.softBodySim.update(dt);
                // Spirits float upward
                this.spiritSoftBodies.forEach(sb => {
                    if (sb.center && sb.floating) {
                        sb.center.y -= 5 * dt;
                    }
                });
            }
            if (this.fluidSim) this.fluidSim.update(dt);
        },

        render: function(ctx) {
            // Render ethereal spirits
            this.spiritSoftBodies.forEach(sb => {
                if (!sb.points) return;
                ctx.save();
                ctx.globalAlpha = 0.6;
                
                // Draw spirit circle with gradient
                const cx = sb.center?.x || sb.points[0]?.x || 0;
                const cy = sb.center?.y || sb.points[0]?.y || 0;
                const radius = sb.radius || 30;
                
                const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
                gradient.addColorStop(0, 'rgba(100, 200, 255, 0.8)');
                gradient.addColorStop(1, 'rgba(100, 200, 255, 0)');
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(cx, cy, radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            });

            // Render ectoplasm
            if (this.fluidSim) {
                ctx.save();
                this.fluidSim.particles.forEach(p => {
                    ctx.fillStyle = p.color;
                    ctx.globalAlpha = 0.7;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                    ctx.fill();
                });
                ctx.restore();
            }
        },

        clear: function() {
            if (this.softBodySim) this.softBodySim.clear();
            if (this.fluidSim) this.fluidSim.particles = [];
            this.spiritSoftBodies = [];
        }
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = SeancePhysics;
    } else {
        global.SeancePhysics = SeancePhysics;
    }

})(typeof window !== 'undefined' ? window : this);

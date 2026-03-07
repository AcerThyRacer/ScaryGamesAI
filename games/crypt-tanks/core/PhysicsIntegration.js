/**
 * ============================================
 * Crypt Tanks - Physics Integration
 * ============================================
 * Soft body tanks, explosive fluids, destructible walls
 */
(function(global) {
    'use strict';

    const CryptTanksPhysics = {
        config: {
            softBodyEnabled: true,
            fluidEnabled: true,
            destructionEnabled: true,
            maxDebris: 300
        },

        softBodySim: null,
        fluidSim: null,
        destructionSim: null,
        tankSoftBodies: [],
        explosions: [],

        init: function() {
            const { SoftBody, FluidSimulation, DestructionSystem } = global.SGAI?.Physics || {};
            
            if (this.config.softBodyEnabled && SoftBody) {
                this.softBodySim = new SoftBody({ gravity: { x: 0, y: 0 }, stiffness: 0.9 });
            }
            
            if (this.config.fluidEnabled && FluidSimulation) {
                this.fluidSim = new FluidSimulation({
                    maxParticles: 500,
                    gravity: { x: 0, y: 10 },
                    viscosity: 0.7
                });
            }

            if (this.config.destructionEnabled && DestructionSystem) {
                this.destructionSim = new DestructionSystem({ fragmentation: true, debrisCount: 100 });
            }

            console.log('[CryptTanksPhysics] Initialized');
            return this;
        },

        createSoftTank: function(x, y, tankType) {
            if (!this.softBodySim) return null;
            
            const softBody = this.softBodySim.createSoftRectangle(x, y, 40, 30, 4, 3, 0.6);
            softBody.tankType = tankType;
            this.tankSoftBodies.push(softBody);
            return softBody;
        },

        createExplosion: function(x, y, radius = 50) {
            this.explosions.push({
                x, y, radius, maxRadius: radius,
                timer: 0.5,
                particles: []
            });

            // Spawn fire/fluid particles
            if (this.fluidSim) {
                for (let i = 0; i < 30; i++) {
                    const particle = this.fluidSim.addParticle(x, y, 'acid');
                    if (particle) {
                        const angle = Math.random() * Math.PI * 2;
                        const speed = Math.random() * 200;
                        particle.vx = Math.cos(angle) * speed;
                        particle.vy = Math.sin(angle) * speed;
                    }
                }
            }

            // Create debris
            if (this.destructionSim) {
                this.destructionSim.createDebris(x, y, radius * 2, '#ff6600', 20);
            }
        },

        destroyWall: function(x, y) {
            if (!this.destructionSim) return;
            this.destructionSim.createDebris(x, y, 80, '#666666', 15);
        },

        update: function(dt) {
            if (this.softBodySim) this.softBodySim.update(dt);
            if (this.fluidSim) this.fluidSim.update(dt);
            if (this.destructionSim) this.destructionSim.update(dt);

            // Update explosions
            this.explosions = this.explosions.filter(exp => {
                exp.timer -= dt;
                exp.radius = exp.maxRadius * (exp.timer / 0.5);
                return exp.timer > 0;
            });
        },

        render: function(ctx) {
            // Render tanks
            this.tankSoftBodies.forEach(sb => {
                if (!sb.points) return;
                ctx.fillStyle = '#4466aa';
                ctx.fillRect(sb.points[0].x - 20, sb.points[0].y - 15, 40, 30);
            });

            // Render explosions
            this.explosions.forEach(exp => {
                const gradient = ctx.createRadialGradient(exp.x, exp.y, 0, exp.x, exp.y, exp.radius);
                gradient.addColorStop(0, 'rgba(255, 255, 200, 0.9)');
                gradient.addColorStop(0.4, 'rgba(255, 100, 0, 0.6)');
                gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(exp.x, exp.y, exp.radius, 0, Math.PI * 2);
                ctx.fill();
            });

            // Render fluid
            if (this.fluidSim) {
                this.fluidSim.particles.forEach(p => {
                    ctx.fillStyle = p.color;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                    ctx.fill();
                });
            }
        },

        clear: function() {
            if (this.softBodySim) this.softBodySim.clear();
            if (this.fluidSim) this.fluidSim.particles = [];
            if (this.destructionSim) this.destructionSim.clear();
            this.tankSoftBodies = [];
            this.explosions = [];
        }
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = CryptTanksPhysics;
    } else {
        global.CryptTanksPhysics = CryptTanksPhysics;
    }

})(typeof window !== 'undefined' ? window : this);

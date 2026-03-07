/**
 * ============================================
 * Yeti Run & Nightmare Run - Physics Integration
 * ============================================
 * Soft body character, snow/rain fluids, destructible obstacles
 */
(function(global) {
    'use strict';

    const RunnerPhysics = {
        config: {
            softBodyEnabled: true,
            fluidEnabled: true,
            fluidType: 'water', // 'water' for rain, 'snow' for Yeti Run
            maxParticles: 400
        },

        softBodySim: null,
        fluidSim: null,
        playerSoftBody: null,
        debris: [],

        init: function(gameType) {
            const { SoftBody, FluidSimulation } = global.SGAI?.Physics || {};
            
            this.config.fluidType = gameType === 'yeti' ? 'snow' : 'rain';
            
            if (this.config.softBodyEnabled && SoftBody) {
                this.softBodySim = new SoftBody({ gravity: { x: 0, y: 30 }, iterations: 3 });
            }
            
            if (this.config.fluidEnabled && FluidSimulation) {
                this.fluidSim = new FluidSimulation({
                    maxParticles: this.config.maxParticles,
                    gravity: { x: 0, y: 50 },
                    viscosity: this.config.fluidType === 'snow' ? 0.95 : 0.8
                });
            }

            console.log('[RunnerPhysics] Initialized for', gameType);
            return this;
        },

        createSoftPlayer: function(x, y) {
            if (!this.softBodySim) return null;
            
            const playerBody = this.softBodySim.createSoftRectangle(x, y, 20, 40, 3, 5, 0.5);
            playerBody.isPlayer = true;
            this.playerSoftBody = playerBody;
            return playerBody;
        },

        spawnRain: function(count = 10) {
            if (!this.fluidSim) return;
            
            const canvas = document.getElementById('game-canvas');
            if (!canvas) return;
            
            for (let i = 0; i < count; i++) {
                const x = Math.random() * canvas.width;
                const particle = this.fluidSim.addParticle(x, -10, this.config.fluidType);
                if (particle) {
                    particle.vy = 300 + Math.random() * 200;
                }
            }
        },

        onPlayerCrash: function(x, y) {
            if (!this.fluidSim) return;
            
            // Blood splatter
            for (let i = 0; i < 50; i++) {
                const particle = this.fluidSim.addParticle(x, y, 'blood');
                if (particle) {
                    const angle = Math.random() * Math.PI;
                    const speed = 100 + Math.random() * 200;
                    particle.vx = Math.cos(angle) * speed;
                    particle.vy = -Math.sin(angle) * speed;
                }
            }
        },

        update: function(dt) {
            if (this.softBodySim) this.softBodySim.update(dt);
            if (this.fluidSim) {
                this.fluidSim.update(dt);
                // Continuous rain
                if (Math.random() < 0.3) {
                    this.spawnRain(5);
                }
            }
        },

        render: function(ctx) {
            // Render player
            if (this.playerSoftBody && this.playerSoftBody.points) {
                ctx.fillStyle = '#ffccaa';
                const sb = this.playerSoftBody;
                ctx.fillRect(sb.points[0].x - 10, sb.points[0].y - 20, 20, 40);
            }

            // Render rain/snow
            if (this.fluidSim) {
                ctx.save();
                this.fluidSim.particles.forEach(p => {
                    ctx.fillStyle = p.color;
                    ctx.globalAlpha = this.config.fluidType === 'snow' ? 0.8 : 0.6;
                    ctx.beginPath();
                    if (this.config.fluidType === 'snow') {
                        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                    } else {
                        ctx.ellipse(p.x, p.y, 2, 8, 0, 0, Math.PI * 2);
                    }
                    ctx.fill();
                });
                ctx.restore();
            }
        },

        clear: function() {
            if (this.softBodySim) this.softBodySim.clear();
            if (this.fluidSim) this.fluidSim.particles = [];
            this.playerSoftBody = null;
        }
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = RunnerPhysics;
    } else {
        global.RunnerPhysics = RunnerPhysics;
    }

})(typeof window !== 'undefined' ? window : this);

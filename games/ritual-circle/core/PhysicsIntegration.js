/**
 * ============================================
 * Ritual Circle - Physics Integration
 * ============================================
 * Soft body enemies, fluid blood, destructible traps
 */
(function(global) {
    'use strict';

    const RitualCirclePhysics = {
        config: {
            softBodyEnabled: true,
            fluidEnabled: true,
            maxBloodParticles: 800
        },

        softBodySim: null,
        fluidSim: null,
        enemySoftBodies: [],
        bloodPool: [],

        init: function() {
            const { SoftBody, FluidSimulation } = global.SGAI?.Physics || {};
            
            if (this.config.softBodyEnabled && SoftBody) {
                this.softBodySim = new SoftBody({ gravity: { x: 0, y: 9.8 } });
            }
            
            if (this.config.fluidEnabled && FluidSimulation) {
                this.fluidSim = new FluidSimulation({
                    maxParticles: this.config.maxBloodParticles,
                    viscosity: 0.9
                });
            }

            console.log('[RitualCirclePhysics] Initialized');
            return this;
        },

        createSoftEnemy: function(x, y, radius, type) {
            if (!this.softBodySim) return null;
            
            const softBody = this.softBodySim.createSoftCircle(x, y, radius, 12, 0.5, 1.0);
            softBody.enemyType = type;
            this.enemySoftBodies.push(softBody);
            return softBody;
        },

        spawnBloodOnEnemyDeath: function(x, y, amount = 30) {
            if (!this.fluidSim) return;
            
            for (let i = 0; i < amount; i++) {
                const particle = this.fluidSim.addParticle(
                    x + (Math.random() - 0.5) * 20,
                    y + (Math.random() - 0.5) * 20,
                    'blood'
                );
                if (particle) {
                    particle.vx = (Math.random() - 0.5) * 150;
                    particle.vy = (Math.random() - 0.5) * 150;
                }
            }
        },

        update: function(dt) {
            if (this.softBodySim) this.softBodySim.update(dt);
            if (this.fluidSim) this.fluidSim.update(dt);
        },

        render: function(ctx) {
            // Render soft body enemies
            this.enemySoftBodies.forEach(softBody => {
                if (!softBody.points) return;
                
                ctx.save();
                ctx.beginPath();
                ctx.moveTo(softBody.points[0].x, softBody.points[0].y);
                
                for (let i = 1; i < softBody.points.length; i++) {
                    ctx.lineTo(softBody.points[i].x, softBody.points[i].y);
                }
                
                ctx.closePath();
                ctx.fillStyle = softBody.enemyType === 'demon' ? '#cc2200' : '#446644';
                ctx.fill();
                ctx.restore();
            });

            // Render blood
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
            this.enemySoftBodies = [];
        }
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = RitualCirclePhysics;
    } else {
        global.RitualCirclePhysics = RitualCirclePhysics;
    }

})(typeof window !== 'undefined' ? window : this);

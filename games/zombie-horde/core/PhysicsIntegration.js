/**
 * ============================================
 * Zombie Horde - Physics Integration
 * ============================================
 * Soft body zombies, blood pools, destructible barricades
 */
(function(global) {
    'use strict';

    const ZombieHordePhysics = {
        config: {
            softBodyEnabled: true,
            fluidEnabled: true,
            destructionEnabled: true,
            maxZombies: 200,
            maxBloodParticles: 1500
        },

        softBodySim: null,
        fluidSim: null,
        destructionSim: null,
        zombieSoftBodies: [],
        barricadeDebris: [],

        init: function() {
            const { SoftBody, FluidSimulation, DestructionSystem } = global.SGAI?.Physics || {};
            
            if (this.config.softBodyEnabled && SoftBody) {
                this.softBodySim = new SoftBody({ gravity: { x: 0, y: 0 }, iterations: 3 });
            }
            
            if (this.config.fluidEnabled && FluidSimulation) {
                this.fluidSim = new FluidSimulation({
                    maxParticles: this.config.maxBloodParticles,
                    gravity: { x: 0, y: 15 },
                    viscosity: 0.92
                });
            }

            if (this.config.destructionEnabled && DestructionSystem) {
                this.destructionSim = new DestructionSystem({ fragmentation: true });
            }

            console.log('[ZombieHordePhysics] Initialized');
            return this;
        },

        createSoftZombie: function(x, y, type) {
            if (!this.softBodySim) return null;
            
            const radius = type === 'Brute' ? 18 : (type === 'Runner' ? 8 : 10);
            const softBody = this.softBodySim.createSoftCircle(x, y, radius, 10, 0.4, 0.8);
            softBody.zombieType = type;
            this.zombieSoftBodies.push(softBody);
            return softBody;
        },

        spawnBloodOnZombieDeath: function(x, y, zombieType) {
            if (!this.fluidSim) return;
            
            const amount = zombieType === 'Brute' ? 80 : (zombieType === 'Exploder' ? 100 : 40);
            
            for (let i = 0; i < amount; i++) {
                const particle = this.fluidSim.addParticle(x, y, 'blood');
                if (particle) {
                    particle.vx = (Math.random() - 0.5) * 300;
                    particle.vy = (Math.random() - 0.5) * 300;
                }
            }

            // Exploder creates acid pool
            if (zombieType === 'Exploder') {
                for (let i = 0; i < 50; i++) {
                    const particle = this.fluidSim.addParticle(x, y, 'acid');
                    if (particle) {
                        particle.vx = (Math.random() - 0.5) * 200;
                        particle.vy = (Math.random() - 0.5) * 200;
                    }
                }
            }
        },

        onDestroyBarricade: function(x, y) {
            if (!this.destructionSim) return;
            
            const debris = this.destructionSim.createDebris(x, y, 100, '#886633', 20);
            this.barricadeDebris.push(...debris);
        },

        update: function(dt) {
            if (this.softBodySim) this.softBodySim.update(dt);
            if (this.fluidSim) this.fluidSim.update(dt);
            if (this.destructionSim) this.destructionSim.update(dt);
        },

        render: function(ctx) {
            // Render soft zombies
            this.zombieSoftBodies.forEach(sb => {
                if (!sb.points) return;
                ctx.fillStyle = '#448844';
                ctx.beginPath();
                ctx.arc(sb.center?.x || sb.points[0].x, sb.center?.y || sb.points[0].y, 10, 0, Math.PI * 2);
                ctx.fill();
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

            // Render debris
            this.barricadeDebris.forEach(d => {
                ctx.save();
                ctx.translate(d.x, d.y);
                ctx.rotate(d.rotation);
                ctx.fillStyle = d.color;
                ctx.fillRect(-d.size/2, -d.size/2, d.size, d.size);
                ctx.restore();
            });
        },

        clear: function() {
            if (this.softBodySim) this.softBodySim.clear();
            if (this.fluidSim) this.fluidSim.particles = [];
            if (this.destructionSim) this.destructionSim.clear();
            this.zombieSoftBodies = [];
            this.barricadeDebris = [];
        }
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = ZombieHordePhysics;
    } else {
        global.ZombieHordePhysics = ZombieHordePhysics;
    }

})(typeof window !== 'undefined' ? window : this);

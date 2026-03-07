/**
 * ============================================
 * Blood Tetris - Physics Integration
 * ============================================
 * Integrates soft body physics, fluid simulation, and destruction
 * for visceral horror effects.
 */
(function(global) {
    'use strict';

    // Import existing physics systems
    const { SoftBody } = global.SGAI?.Physics || {};
    const { FluidSimulation } = global.SGAI?.Physics || {};
    const { DestructionSystem } = global.SGAI?.Physics || {};

    const BloodTetrisPhysics = {
        // Configuration
        config: {
            softBodyEnabled: true,
            fluidEnabled: true,
            destructionEnabled: true,
            maxFluidParticles: 1000,
            softBodyStiffness: 0.7,
            bloodViscosity: 0.95
        },

        // Physics instances
        softBodySim: null,
        fluidSim: null,
        destructionSim: null,

        // Blood Tetris specific
        tetrominoSoftBodies: new Map(),
        bloodParticles: [],
        goreEffects: [],

        /**
         * Initialize physics systems
         */
        init: function() {
            // Soft body physics for deformable tetrominos
            if (this.config.softBodyEnabled && SoftBody) {
                this.softBodySim = new SoftBody({
                    gravity: { x: 0, y: 15 },
                    iterations: 5,
                    pressure: true
                });
            }

            // Fluid simulation for blood
            if (this.config.fluidEnabled && FluidSimulation) {
                this.fluidSim = new FluidSimulation({
                    maxParticles: this.config.maxFluidParticles,
                    gravity: { x: 0, y: 20 },
                    viscosity: this.config.bloodViscosity,
                    spacing: 4
                });
            }

            // Destruction for line clear effects
            if (this.config.destructionEnabled && DestructionSystem) {
                this.destructionSim = new DestructionSystem({
                    fragmentation: true,
                    debrisCount: 50
                });
            }

            console.log('[BloodTetrisPhysics] Initialized');
            return this;
        },

        /**
         * Create soft body tetromino
         */
        createSoftTetromino: function(type, x, y, rotation) {
            if (!this.softBodySim) return null;

            // Create soft body based on tetromino shape
            const shapes = {
                0: { width: 4, height: 1 }, // I
                1: { width: 2, height: 2 }, // O
                2: { width: 3, height: 2 }, // T
                3: { width: 3, height: 2 }, // S
                4: { width: 3, height: 2 }, // Z
                5: { width: 3, height: 2 }, // J
                6: { width: 3, height: 2 }  // L
            };

            const shape = shapes[type];
            if (!shape) return null;

            // Create soft rectangle
            const softBody = this.softBodySim.createSoftRectangle(
                x * 32,
                y * 32,
                shape.width * 32,
                shape.height * 32,
                3, // gridX
                2, // gridY
                0.5 // mass
            );

            softBody.tetrominoType = type;
            softBody.rotation = rotation;
            this.tetrominoSoftBodies.set(type + '_' + x + '_' + y, softBody);

            return softBody;
        },

        /**
         * Spawn blood particles on line clear
         */
        spawnBloodOnLineClear: function(row, count = 50) {
            if (!this.fluidSim) return;

            const canvas = document.getElementById('game-canvas');
            if (!canvas) return;

            const rowY = canvas.height - (row * 32) - 16;

            for (let i = 0; i < count; i++) {
                const x = Math.random() * canvas.width;
                const y = rowY + Math.random() * 32;
                const vx = (Math.random() - 0.5) * 200;
                const vy = (Math.random() - 0.5) * 200 - 100;

                const particle = this.fluidSim.addParticle(x, y, 'blood');
                if (particle) {
                    particle.vx = vx;
                    particle.vy = vy;
                }
            }
        },

        /**
         * Spawn gore on tetromino land
         */
        spawnGoreOnLand: function(x, y, impactForce) {
            if (!this.fluidSim || !this.destructionSim) return;

            const canvas = document.getElementById('game-canvas');
            const landX = x * 32 + 16;
            const landY = y * 32 + 16;

            // Blood splatter
            const bloodCount = Math.min(30, Math.floor(impactForce * 10));
            for (let i = 0; i < bloodCount; i++) {
                const particle = this.fluidSim.addParticle(
                    landX + (Math.random() - 0.5) * 20,
                    landY + (Math.random() - 0.5) * 20,
                    'blood'
                );
                if (particle) {
                    particle.vx = (Math.random() - 0.5) * impactForce * 100;
                    particle.vy = -Math.random() * impactForce * 50;
                }
            }

            // Debris
            if (this.destructionSim) {
                this.destructionSim.createDebris(
                    landX,
                    landY,
                    impactForce * 50,
                    '#cc0000'
                );
            }
        },

        /**
         * Update physics simulation
         */
        update: function(dt) {
            // Update soft bodies
            if (this.softBodySim) {
                this.softBodySim.update(dt);

                // Apply pressure to tetrominos
                this.tetrominoSoftBodies.forEach((softBody) => {
                    if (softBody.pressure) {
                        this.softBodySim.applyPressure(softBody, 1.2);
                    }
                });
            }

            // Update fluid
            if (this.fluidSim) {
                this.fluidSim.update(dt);
            }

            // Update destruction
            if (this.destructionSim) {
                this.destructionSim.update(dt);
            }
        },

        /**
         * Render physics objects
         */
        render: function(ctx) {
            // Render soft bodies
            if (this.softBodySim) {
                this.renderSoftBodies(ctx);
            }

            // Render fluid
            if (this.fluidSim) {
                this.renderFluid(ctx);
            }

            // Render destruction debris
            if (this.destructionSim) {
                this.renderDebris(ctx);
            }
        },

        /**
         * Render soft body tetrominos with deformation
         */
        renderSoftBodies: function(ctx) {
            const COLORS = ['#cc2222', '#882222', '#aa3333', '#993311', '#cc4400', '#881144', '#773322'];

            this.tetrominoSoftBodies.forEach((softBody) => {
                if (!softBody.points || !softBody.center) return;

                ctx.save();
                
                // Draw deformed shape
                ctx.beginPath();
                const points = softBody.points;
                
                if (points.length > 0) {
                    ctx.moveTo(points[0].x, points[0].y);
                    
                    for (let i = 1; i < points.length; i++) {
                        // Smooth curves between points
                        const xc = (points[i].x + points[(i + 1) % points.length].x) / 2;
                        const yc = (points[i].y + points[(i + 1) % points.length].y) / 2;
                        ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
                    }
                    
                    ctx.closePath();
                }

                // Gradient fill for 3D effect
                const gradient = ctx.createRadialGradient(
                    softBody.center.x,
                    softBody.center.y,
                    0,
                    softBody.center.x,
                    softBody.center.y,
                    softBody.radius || 50
                );
                
                const colorIdx = softBody.tetrominoType || 0;
                gradient.addColorStop(0, COLORS[colorIdx] || '#cc0000');
                gradient.addColorStop(1, '#440000');

                ctx.fillStyle = gradient;
                ctx.fill();

                ctx.strokeStyle = 'rgba(0,0,0,0.3)';
                ctx.lineWidth = 2;
                ctx.stroke();

                ctx.restore();
            });
        },

        /**
         * Render fluid particles
         */
        renderFluid: function(ctx) {
            if (!this.fluidSim || !this.fluidSim.particles) return;

            ctx.save();
            ctx.globalAlpha = 0.8;

            this.fluidSim.particles.forEach((particle) => {
                ctx.fillStyle = particle.color;
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                ctx.fill();
            });

            ctx.restore();
        },

        /**
         * Render destruction debris
         */
        renderDebris: function(ctx) {
            if (!this.destructionSim) return;

            this.destructionSim.debris.forEach((piece) => {
                ctx.save();
                ctx.translate(piece.x, piece.y);
                ctx.rotate(piece.rotation);

                ctx.fillStyle = piece.color;
                ctx.fillRect(-piece.size / 2, -piece.size / 2, piece.size, piece.size);

                ctx.restore();
            });
        },

        /**
         * Clear physics for game reset
         */
        clear: function() {
            if (this.softBodySim) {
                this.softBodySim.clear();
            }
            if (this.fluidSim) {
                this.fluidSim.particles = [];
            }
            if (this.destructionSim) {
                this.destructionSim.clear();
            }
            this.tetrominoSoftBodies.clear();
        }
    };

    // ============================================
    // EXPORT
    // ============================================

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = BloodTetrisPhysics;
    } else {
        global.BloodTetrisPhysics = BloodTetrisPhysics;
    }

})(typeof window !== 'undefined' ? window : this);

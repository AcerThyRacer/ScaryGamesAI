/**
 * ============================================
 * Cursed Arcade - Physics Integration
 * ============================================
 * Generic physics for arcade collection
 */
(function(global) {
    'use strict';

    const CursedArcadePhysics = {
        games: {},

        init: function() {
            console.log('[CursedArcadePhysics] Initialized');
            return this;
        },

        initGame: function(gameId, config) {
            const { SoftBody, FluidSimulation } = global.SGAI?.Physics || {};
            
            this.games[gameId] = {
                softBodySim: config.softBody ? new SoftBody(config.softBody) : null,
                fluidSim: config.fluid ? new FluidSimulation(config.fluid) : null,
                objects: []
            };
            
            return this.games[gameId];
        },

        update: function(dt) {
            Object.values(this.games).forEach(game => {
                if (game.softBodySim) game.softBodySim.update(dt);
                if (game.fluidSim) game.fluidSim.update(dt);
            });
        },

        render: function(ctx, gameId) {
            const game = this.games[gameId];
            if (!game) return;

            if (game.fluidSim) {
                game.fluidSim.particles.forEach(p => {
                    ctx.fillStyle = p.color;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                    ctx.fill();
                });
            }
        },

        clear: function() {
            Object.values(this.games).forEach(game => {
                if (game.softBodySim) game.softBodySim.clear();
                if (game.fluidSim) game.fluidSim.particles = [];
            });
            this.games = {};
        }
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = CursedArcadePhysics;
    } else {
        global.CursedArcadePhysics = CursedArcadePhysics;
    }

})(typeof window !== 'undefined' ? window : this);

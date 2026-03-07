/**
 * ============================================
 * Cursed Arcade - WebGPU Renderer
 * ============================================
 */
(function(global) {
    'use strict';

    const CursedArcadeWebGPU = {
        games: {},

        init: async function(canvas, gameId, config) {
            const { WebGPURenderer } = global.SGAI?.Renderer || {};
            if (!WebGPURenderer) return false;

            const renderer = new WebGPURenderer(canvas, config || {
                antialias: true, hdr: true, maxLights: 4
            });

            const success = await renderer.initialize();
            if (success) {
                this.games[gameId] = { renderer, entities: [] };
            }
            return success;
        },

        addEntity: function(gameId, entity) {
            const game = this.games[gameId];
            if (!game || !game.renderer) return;
            game.renderer.addEntity(entity);
            game.entities.push(entity);
        },

        render: function(gameId, dt) {
            const game = this.games[gameId];
            if (!game || !game.renderer) return;
            game.renderer.beginFrame(dt);
            game.renderer.render();
            game.renderer.endFrame();
        },

        destroy: function(gameId) {
            const game = this.games[gameId];
            if (game && game.renderer) {
                game.renderer.destroy();
                delete this.games[gameId];
            }
        }
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = CursedArcadeWebGPU;
    } else {
        global.CursedArcadeWebGPU = CursedArcadeWebGPU;
    }

})(typeof window !== 'undefined' ? window : this);

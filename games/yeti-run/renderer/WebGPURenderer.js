/**
 * ============================================
 * Runner Games - WebGPU Renderer
 * (Yeti Run & Nightmare Run)
 * ============================================
 */
(function(global) {
    'use strict';

    const RunnerWebGPU = {
        renderer: null,

        init: async function(canvas, gameType) {
            const { WebGPURenderer } = global.SGAI?.Renderer || {};
            if (!WebGPURenderer) return false;

            this.renderer = new WebGPURenderer(canvas, {
                antialias: true, hdr: true, maxLights: 8
            });

            const success = await this.renderer.initialize();
            if (success) {
                this.setupScene(gameType);
            }
            return success;
        },

        setupScene: function(gameType) {
            if (!this.renderer) return;

            // Player character
            const player = this.renderer.createMesh('player', {
                type: 'capsule', radius: 10, height: 40
            });
            player.setMaterial({
                baseColor: gameType === 'yeti' ? [0.9, 0.9, 1.0] : [0.8, 0.6, 0.4],
                metallic: 0.3,
                roughness: 0.5
            });
            this.renderer.addEntity(player);

            // Ground/track
            const ground = this.renderer.createMesh('ground', {
                type: 'box', width: 1000, height: 100, depth: 10
            });
            ground.setMaterial({
                baseColor: gameType === 'yeti' ? [0.95, 0.95, 1.0] : [0.2, 0.15, 0.1],
                metallic: 0.1,
                roughness: 0.8
            });
            this.renderer.addEntity(ground);
        },

        render: function(dt) {
            if (!this.renderer) return;
            this.renderer.beginFrame(dt);
            this.renderer.render();
            this.renderer.endFrame();
        },

        destroy: function() {
            if (this.renderer) this.renderer.destroy();
        }
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = RunnerWebGPU;
    } else {
        global.RunnerWebGPU = RunnerWebGPU;
    }

})(typeof window !== 'undefined' ? window : this);

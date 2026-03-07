/**
 * ============================================
 * Séance - WebGPU Renderer
 * ============================================
 */
(function(global) {
    'use strict';

    const SeanceWebGPU = {
        renderer: null,

        init: async function(canvas) {
            const { WebGPURenderer } = global.SGAI?.Renderer || {};
            if (!WebGPURenderer) return false;

            this.renderer = new WebGPURenderer(canvas, {
                antialias: true, hdr: true, maxLights: 6
            });

            const success = await this.renderer.initialize();
            if (success) {
                this.setupScene();
                this.setupLighting();
            }
            return success;
        },

        setupScene: function() {
            if (!this.renderer) return;

            // Ouija board table
            const table = this.renderer.createMesh('table', {
                type: 'cylinder', radius: 100, height: 5, segments: 32
            });
            table.setMaterial({
                baseColor: [0.3, 0.2, 0.15],
                metallic: 0.2,
                roughness: 0.7
            });
            this.renderer.addEntity(table);

            // Planchette
            const planchette = this.renderer.createMesh('planchette', {
                type: 'cone', radius: 15, height: 5
            });
            planchette.setMaterial({
                baseColor: [0.6, 0.5, 0.4],
                metallic: 0.4,
                roughness: 0.4,
                transparent: true,
                opacity: 0.8
            });
            this.renderer.addEntity(planchette);
        },

        setupLighting: function() {
            if (!this.renderer) return;

            this.renderer.addLight({ type: 'ambient', color: [0.05, 0.05, 0.1], intensity: 0.2 });

            // Candle lights
            for (let i = 0; i < 4; i++) {
                const angle = (i / 4) * Math.PI * 2;
                this.renderer.addLight({
                    type: 'point',
                    color: [1.0, 0.7, 0.3],
                    intensity: 0.6,
                    position: [Math.cos(angle) * 80, 10, Math.sin(angle) * 80],
                    radius: 120
                });
            }
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
        module.exports = SeanceWebGPU;
    } else {
        global.SeanceWebGPU = SeanceWebGPU;
    }

})(typeof window !== 'undefined' ? window : this);

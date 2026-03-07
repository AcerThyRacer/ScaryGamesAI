/**
 * ============================================
 * Crypt Tanks - WebGPU Renderer
 * ============================================
 */
(function(global) {
    'use strict';

    const CryptTanksWebGPU = {
        renderer: null,

        init: async function(canvas) {
            const { WebGPURenderer } = global.SGAI?.Renderer || {};
            if (!WebGPURenderer) return false;

            this.renderer = new WebGPURenderer(canvas, {
                antialias: true, hdr: true, enableInstancing: true, maxLights: 12
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

            // Tank instanced mesh
            const tankMesh = this.renderer.createInstancedMesh('tank', {
                type: 'box', width: 30, height: 20, depth: 25
            }, 50);

            tankMesh.setMaterial({
                baseColor: [0.3, 0.4, 0.5],
                metallic: 0.8,
                roughness: 0.4
            });
            this.renderer.addEntity(tankMesh);

            // Crypt walls
            const walls = this.renderer.createMesh('walls', {
                type: 'box', width: 800, height: 400, depth: 20
            });
            walls.setMaterial({
                baseColor: [0.3, 0.25, 0.2],
                metallic: 0.1,
                roughness: 0.9
            });
            this.renderer.addEntity(walls);
        },

        setupLighting: function() {
            if (!this.renderer) return;

            this.renderer.addLight({ type: 'ambient', color: [0.15, 0.1, 0.05], intensity: 0.3 });

            // Torch lights
            for (let i = 0; i < 8; i++) {
                this.renderer.addLight({
                    type: 'point',
                    color: [1.0, 0.5, 0.2],
                    intensity: 0.7,
                    position: [(Math.random()-0.5)*700, (Math.random()-0.5)*300, 50],
                    radius: 200
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
        module.exports = CryptTanksWebGPU;
    } else {
        global.CryptTanksWebGPU = CryptTanksWebGPU;
    }

})(typeof window !== 'undefined' ? window : this);

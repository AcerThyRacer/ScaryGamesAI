/**
 * ============================================
 * Zombie Horde - WebGPU Renderer
 * ============================================
 */
(function(global) {
    'use strict';

    const ZombieHordeWebGPU = {
        renderer: null,
        zombieInstances: [],

        init: async function(canvas) {
            const { WebGPURenderer } = global.SGAI?.Renderer || {};
            if (!WebGPURenderer) return false;

            this.renderer = new WebGPURenderer(canvas, {
                antialias: true, hdr: true, enableInstancing: true, maxLights: 16
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

            // Create zombie instanced mesh
            const zombieMesh = this.renderer.createInstancedMesh('zombie', {
                type: 'capsule', radius: 8, height: 30
            }, 500);

            zombieMesh.setMaterial({
                baseColor: [0.3, 0.5, 0.3],
                metallic: 0.2,
                roughness: 0.7,
                emissive: [0.1, 0.2, 0.1]
            });

            this.renderer.addEntity(zombieMesh);

            // Base
            const base = this.renderer.createMesh('base', {
                type: 'box', width: 700, height: 700, depth: 10
            });
            base.setMaterial({
                baseColor: [0.1, 0.15, 0.1],
                metallic: 0.1,
                roughness: 0.9
            });
            this.renderer.addEntity(base);
        },

        setupLighting: function() {
            if (!this.renderer) return;

            this.renderer.addLight({ type: 'ambient', color: [0.1, 0.15, 0.1], intensity: 0.4 });

            // Moonlight
            this.renderer.addLight({
                type: 'directional',
                color: [0.3, 0.3, 0.5],
                intensity: 0.6,
                position: [100, 200, 100],
                castShadow: true
            });

            // Dynamic point lights for atmosphere
            for (let i = 0; i < 5; i++) {
                this.renderer.addLight({
                    type: 'point',
                    color: [0.8, 0.2, 0.2],
                    intensity: 0.5 + Math.random() * 0.3,
                    position: [(Math.random()-0.5)*600, 50, (Math.random()-0.5)*600],
                    radius: 150
                });
            }
        },

        updateZombie: function(index, x, y, rotation) {
            if (!this.renderer) return;
            this.renderer.updateInstance('zombie', index, { position: [x, y, 0], rotation: [0, 0, rotation] });
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
        module.exports = ZombieHordeWebGPU;
    } else {
        global.ZombieHordeWebGPU = ZombieHordeWebGPU;
    }

})(typeof window !== 'undefined' ? window : this);

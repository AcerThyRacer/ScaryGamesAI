/**
 * ============================================
 * Ritual Circle - WebGPU Renderer
 * ============================================
 */
(function(global) {
    'use strict';

    const RitualCircleWebGPU = {
        renderer: null,
        
        init: async function(canvas) {
            const { WebGPURenderer } = global.SGAI?.Renderer || {};
            if (!WebGPURenderer) return false;

            this.renderer = new WebGPURenderer(canvas, {
                antialias: true, hdr: true, maxLights: 8
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

            // Create summoning circle
            const circle = this.renderer.createMesh('circle', {
                type: 'cylinder', radius: 60, height: 5, segments: 32
            });
            circle.setMaterial({
                baseColor: [0.4, 0.2, 0.6],
                metallic: 0.6,
                roughness: 0.3,
                emissive: [0.3, 0.1, 0.4],
                emissiveIntensity: 0.5
            });
            this.renderer.addEntity(circle);
        },

        setupLighting: function() {
            if (!this.renderer) return;

            this.renderer.addLight({
                type: 'ambient',
                color: [0.1, 0.05, 0.15],
                intensity: 0.3
            });

            // Rotating candles
            for (let i = 0; i < 5; i++) {
                const angle = (i / 5) * Math.PI * 2;
                this.renderer.addLight({
                    type: 'point',
                    color: [1.0, 0.6, 0.2],
                    intensity: 0.8,
                    position: [Math.cos(angle) * 80, 0, Math.sin(angle) * 80],
                    radius: 100
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
        module.exports = RitualCircleWebGPU;
    } else {
        global.RitualCircleWebGPU = RitualCircleWebGPU;
    }

})(typeof window !== 'undefined' ? window : this);

/**
 * ============================================
 * Blood Tetris - WebGPU Renderer Integration
 * ============================================
 * Upgrades rendering to WebGPU with raytracing, PBR materials,
 * GPU instancing, and advanced post-processing.
 */
(function(global) {
    'use strict';

    const BloodTetrisWebGPURenderer = {
        // Renderer instance
        renderer: null,
        
        // Configuration
        config: {
            raytracing: true,
            pbr: true,
            hdr: true,
            quality: 'high',
            targetFPS: 60,
            antialiasing: true,
            volumetricFog: false,
            bloom: true
        },

        // Tetromino materials (PBR)
        materials: {
            I: {
                baseColor: [0.8, 0.13, 0.13], // #cc2222
                metallic: 0.3,
                roughness: 0.4,
                emissive: [0.2, 0.0, 0.0]
            },
            O: {
                baseColor: [0.53, 0.13, 0.13], // #882222
                metallic: 0.5,
                roughness: 0.3,
                emissive: [0.1, 0.0, 0.0]
            },
            T: {
                baseColor: [0.67, 0.2, 0.2], // #aa3333
                metallic: 0.2,
                roughness: 0.5,
                emissive: [0.15, 0.0, 0.0]
            },
            S: {
                baseColor: [0.6, 0.2, 0.07], // #993311
                metallic: 0.4,
                roughness: 0.35,
                emissive: [0.1, 0.05, 0.0]
            },
            Z: {
                baseColor: [0.8, 0.27, 0.0], // #cc4400
                metallic: 0.35,
                roughness: 0.4,
                emissive: [0.2, 0.1, 0.0]
            },
            J: {
                baseColor: [0.53, 0.07, 0.27], // #881144
                metallic: 0.45,
                roughness: 0.3,
                emissive: [0.1, 0.0, 0.1]
            },
            L: {
                baseColor: [0.47, 0.2, 0.13], // #773322
                metallic: 0.5,
                roughness: 0.45,
                emissive: [0.05, 0.0, 0.0]
            }
        },

        // Lighting
        lights: [],

        // Post-processing
        postProcess: null,

        /**
         * Initialize WebGPU renderer
         */
        init: async function(canvas) {
            console.log('[BloodTetrisWebGPU] Initializing...');

            // Import existing WebGPU renderer
            const { WebGPURenderer } = global.SGAI?.Renderer || {};
            
            if (!WebGPURenderer) {
                console.warn('[BloodTetrisWebGPU] WebGPURenderer not found, falling back to Canvas2D');
                return false;
            }

            try {
                // Create renderer
                this.renderer = new WebGPURenderer(canvas, {
                    antialias: this.config.antialiasing,
                    hdr: this.config.hdr,
                    tonemapping: 'aces',
                    maxLights: 16,
                    shadowMapSize: 2048,
                    enableComputeShaders: true,
                    enableInstancing: true,
                    enableRayTracing: this.config.raytracing
                });

                // Initialize
                const success = await this.renderer.initialize();
                
                if (!success) {
                    console.warn('[BloodTetrisWebGPU] Initialization failed, using fallback');
                    return false;
                }

                // Setup scene
                this.setupScene();
                this.setupLighting();
                this.setupPostProcessing();

                console.log('[BloodTetrisWebGPU] Initialized successfully');
                return true;

            } catch (error) {
                console.error('[BloodTetrisWebGPU] Initialization error:', error);
                return false;
            }
        },

        /**
         * Setup 3D scene for tetrominos
         */
        setupScene: function() {
            if (!this.renderer) return;

            // Create tetromino meshes
            const shapes = [
                [[1, 1, 1, 1]], // I
                [[1, 1], [1, 1]], // O
                [[0, 1, 0], [1, 1, 1]], // T
                [[1, 0], [1, 0], [1, 1]], // S
                [[0, 1], [0, 1], [1, 1]], // Z
                [[0, 1, 1], [1, 1, 0]], // J
                [[1, 1, 0], [0, 1, 1]]  // L
            ];

            shapes.forEach((shape, index) => {
                const mesh = this.createTetrominoMesh(shape, index);
                if (mesh) {
                    this.renderer.addEntity(mesh);
                }
            });

            // Create board/arena
            const boardMesh = this.createBoardMesh();
            if (boardMesh) {
                this.renderer.addEntity(boardMesh);
            }
        },

        /**
         * Create 3D tetromino mesh with PBR materials
         */
        createTetrominoMesh: function(shape, typeIndex) {
            if (!this.renderer) return null;

            const width = shape[0].length;
            const height = shape.length;
            const depth = 1;

            // Map numeric index to material key
            const materialKeys = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
            const materialKey = materialKeys[typeIndex] || 'I';

            // Create instanced mesh for multiple copies
            const mesh = this.renderer.createInstancedMesh(
                'tetromino_' + typeIndex,
                {
                    type: 'box',
                    width: width * 32,
                    height: height * 32,
                    depth: depth * 32,
                    segments: [8, 8, 8]
                },
                100 // max instances
            );

            // Apply PBR material
            const material = this.materials[materialKey] || this.materials.I;
            mesh.setMaterial({
                baseColor: material.baseColor,
                metallic: material.metallic,
                roughness: material.roughness,
                emissive: material.emissive,
                clearcoat: 0.5,
                clearcoatRoughness: 0.2
            });

            return mesh;
        },

        /**
         * Create game board/arena mesh
         */
        createBoardMesh: function() {
            if (!this.renderer) return null;

            // Create grid/arena
            const board = this.renderer.createMesh('board', {
                type: 'box',
                width: 10 * 32,
                height: 20 * 32,
                depth: 10,
                segments: [10, 20, 1]
            });

            board.setMaterial({
                baseColor: [0.1, 0.0, 0.0],
                metallic: 0.1,
                roughness: 0.8,
                emissive: [0.05, 0.0, 0.0],
                transparent: true,
                opacity: 0.9
            });

            return board;
        },

        /**
         * Setup dramatic horror lighting
         */
        setupLighting: function() {
            if (!this.renderer) return;

            // Ambient light (dark, moody)
            this.renderer.addLight({
                type: 'ambient',
                color: [0.1, 0.0, 0.0],
                intensity: 0.3
            });

            // Directional light (moonlight from above)
            this.renderer.addLight({
                type: 'directional',
                color: [0.6, 0.2, 0.2],
                intensity: 0.8,
                position: [0, -100, 50],
                target: [0, 0, 0],
                castShadow: true,
                shadowBias: 0.0001
            });

            // Point lights for dramatic effect
            for (let i = 0; i < 3; i++) {
                this.renderer.addLight({
                    type: 'point',
                    color: [0.8, 0.1, 0.1],
                    intensity: 0.5 + Math.random() * 0.3,
                    position: [
                        (Math.random() - 0.5) * 400,
                        (Math.random() - 0.5) * 700,
                        100
                    ],
                    radius: 200,
                    castShadow: true
                });
            }
        },

        /**
         * Setup post-processing effects
         */
        setupPostProcessing: function() {
            if (!this.renderer || !this.renderer.createPostProcessStack) return;

            this.postProcess = this.renderer.createPostProcessStack({
                bloom: {
                    enabled: this.config.bloom,
                    threshold: 0.7,
                    intensity: 0.5,
                    radius: 0.4
                },
                tonemapping: {
                    enabled: this.config.hdr,
                    type: 'aces',
                    exposure: 1.2
                },
                colorGrading: {
                    enabled: true,
                    temperature: -0.2,
                    tint: 0.1,
                    saturation: 1.2,
                    contrast: 1.1
                },
                vignette: {
                    enabled: true,
                    darkness: 0.5,
                    offset: 0.1
                },
                filmGrain: {
                    enabled: true,
                    intensity: 0.08,
                    size: 1.5
                },
                chromaticAberration: {
                    enabled: true,
                    intensity: 0.02
                }
            });
        },

        /**
         * Update tetromino position in 3D space
         */
        updateTetrominoPosition: function(entityId, x, y, rotation) {
            if (!this.renderer) return;

            const entity = this.renderer.getEntity(entityId);
            if (!entity) return;

            // Update transform
            entity.setPosition(x * 32, y * 32, 0);
            entity.setRotation(0, 0, rotation * Math.PI / 2);

            // Add slight wobble for organic feel
            const time = Date.now() * 0.001;
            entity.setScale(
                1 + Math.sin(time) * 0.02,
                1 + Math.cos(time) * 0.02,
                1
            );
        },

        /**
         * Render frame with WebGPU
         */
        render: function(deltaTime) {
            if (!this.renderer) return false;

            try {
                // Begin frame
                this.renderer.beginFrame(deltaTime);

                // Update animation
                this.updateAnimations(deltaTime);

                // Render scene
                this.renderer.render();

                // Apply post-processing
                if (this.postProcess) {
                    this.renderer.applyPostProcess(this.postProcess);
                }

                // End frame
                this.renderer.endFrame();

                return true;

            } catch (error) {
                console.error('[BloodTetrisWebGPU] Render error:', error);
                return false;
            }
        },

        /**
         * Update animations
         */
        updateAnimations: function(dt) {
            if (!this.renderer) return;

            const time = Date.now() * 0.001;

            // Animate lights for horror atmosphere
            this.renderer.lights.forEach((light, index) => {
                if (light.type === 'point') {
                    light.intensity = 0.5 + Math.sin(time * 2 + index) * 0.2;
                }
            });

            // Subtle camera shake
            if (this.renderer.camera) {
                this.renderer.camera.position.x += Math.sin(time * 3) * 0.1;
                this.renderer.camera.position.y += Math.cos(time * 2.5) * 0.1;
            }
        },

        /**
         * Handle line clear with visual effects
         */
        onLineClear: function(rows) {
            if (!this.renderer) return;

            // Flash effect
            const flash = this.renderer.createMesh('lineFlash', {
                type: 'box',
                width: 10 * 32,
                height: rows.length * 32,
                depth: 1
            });

            flash.setMaterial({
                baseColor: [1.0, 0.8, 0.8],
                emissive: [1.0, 0.2, 0.2],
                emissiveIntensity: 2.0,
                transparent: true,
                opacity: 0.8
            });

            // Fade out
            let opacity = 0.8;
            const fadeInterval = setInterval(() => {
                opacity -= 0.1;
                flash.material.opacity = opacity;
                
                if (opacity <= 0) {
                    clearInterval(fadeInterval);
                    this.renderer.removeEntity(flash);
                }
            }, 50);
        },

        /**
         * Resize handler
         */
        onResize: function(width, height) {
            if (!this.renderer) return;
            this.renderer.onResize(width, height);
        },

        /**
         * Cleanup
         */
        destroy: function() {
            if (this.renderer) {
                this.renderer.destroy();
                this.renderer = null;
            }
        }
    };

    // ============================================
    // EXPORT
    // ============================================

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = BloodTetrisWebGPURenderer;
    } else {
        global.BloodTetrisWebGPURenderer = BloodTetrisWebGPURenderer;
    }

})(typeof window !== 'undefined' ? window : this);

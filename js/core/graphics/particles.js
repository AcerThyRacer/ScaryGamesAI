/**
 * ============================================
 * SGAI Graphics Framework - Phase 9: GPU Particles
 * ============================================
 * GPU-driven particle systems for weather effects.
 * 
 * Key Benefits:
 * - 100,000+ particles
 * - Global wind vectors
 * - Custom shader effects
 */

(function(global) {
    'use strict';

    // ============================================
    // GPU PARTICLE SYSTEM
    // ============================================

    /**
     * GPU-accelerated particle system using BufferGeometry
     */
    class GPUParticleSystem {
        constructor(options = {}) {
            this.maxParticles = options.maxParticles || 100000;
            this.scene = options.scene || null;
            
            // Particle state arrays (GPU-friendly)
            this.positions = new Float32Array(this.maxParticles * 3);
            this.velocities = new Float32Array(this.maxParticles * 3);
            this.colors = new Float32Array(this.maxParticles * 4);
            this.sizes = new Float32Array(this.maxParticles);
            this.lifetimes = new Float32Array(this.maxParticles * 2); // [current, max]
            
            // Active particle tracking
            this.activeCount = 0;
            this.particleIndex = 0;
            
            // Global forces
            this.gravity = options.gravity || new THREE.Vector3(0, -9.8, 0);
            this.wind = options.wind || new THREE.Vector3(0, 0, 0);
            this.windStrength = 1;
            
            // Emitter settings
            this.emitRate = 100;
            this.emitTimer = 0;
            this.emitterPosition = new THREE.Vector3();
            this.emitterRadius = 1;
            this.emitterBox = new THREE.Vector3(1, 1, 1);
            
            // Geometry and material
            this.geometry = null;
            this.material = null;
            this.points = null;
            
            this._init();
        }

        /**
         * Initialize geometry and shaders
         */
        _init() {
            // Create geometry
            this.geometry = new THREE.BufferGeometry();
            
            this.geometry.setAttribute('position', 
                new THREE.BufferAttribute(this.positions, 3));
            this.geometry.setAttribute('color', 
                new THREE.BufferAttribute(this.colors, 4));
            this.geometry.setAttribute('size', 
                new THREE.BufferAttribute(this.sizes, 1));
            
            // Custom shader material
            this.material = new THREE.ShaderMaterial({
                uniforms: {
                    uTime: { value: 0 },
                    uPixelRatio: { value: window.devicePixelRatio },
                    uSize: { value: 100.0 },
                    uTexture: { value: null }
                },
                vertexShader: `
                    attribute float size;
                    attribute vec4 color;
                    
                    varying vec4 vColor;
                    varying float vAlpha;
                    
                    uniform float uTime;
                    uniform float uPixelRatio;
                    uniform float uSize;
                    
                    void main() {
                        vColor = color;
                        vAlpha = color.a;
                        
                        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                        gl_PointSize = size * uSize * uPixelRatio * (1.0 / -mvPosition.z);
                        gl_Position = projectionMatrix * mvPosition;
                    }
                `,
                fragmentShader: `
                    varying vec4 vColor;
                    varying float vAlpha;
                    
                    uniform sampler2D uTexture;
                    
                    void main() {
                        vec2 uv = gl_PointCoord;
                        vec4 texColor = texture2D(uTexture, uv);
                        
                        gl_FragColor = vec4(vColor.rgb, vColor.a * texColor.a);
                        
                        if (gl_FragColor.a < 0.01) discard;
                    }
                `,
                transparent: true,
                depthWrite: false,
                blending: THREE.AdditiveBlending
            });
            
            this.points = new THREE.Points(this.geometry, this.material);
            this.points.frustumCulled = false;
            
            if (this.scene) {
                this.scene.add(this.points);
            }
        }

        /**
         * Emit particles
         */
        emit(count, options = {}) {
            const spawnCount = Math.min(count, this.maxParticles - this.activeCount);
            
            for (let i = 0; i < spawnCount; i++) {
                const idx = this.particleIndex;
                this.particleIndex = (this.particleIndex + 1) % this.maxParticles;
                
                const i3 = idx * 3;
                const i4 = idx * 4;
                
                // Position with spread
                const spread = options.spread || this.emitterRadius;
                this.positions[i3] = this.emitterPosition.x + (Math.random() - 0.5) * spread;
                this.positions[i3 + 1] = this.emitterPosition.y + (Math.random() - 0.5) * spread;
                this.positions[i3 + 2] = this.emitterPosition.z + (Math.random() - 0.5) * spread;
                
                // Velocity
                const speed = options.speed || 1;
                this.velocities[i3] = (Math.random() - 0.5) * speed;
                this.velocities[i3 + 1] = (Math.random() - 0.5) * speed + (options.upwardBias || 1);
                this.velocities[i3 + 2] = (Math.random() - 0.5) * speed;
                
                // Color
                const color = options.color || 0xffffff;
                this.colors[i4] = ((color >> 16) & 0xff) / 255;
                this.colors[i4 + 1] = ((color >> 8) & 0xff) / 255;
                this.colors[i4 + 2] = (color & 0xff) / 255;
                this.colors[i4 + 3] = options.alpha || 1;
                
                // Size and lifetime
                this.sizes[idx] = options.size || 1;
                this.lifetimes[idx * 2] = 0;
                this.lifetimes[idx * 2 + 1] = options.lifetime || 3;
                
                this.activeCount = Math.min(this.activeCount + 1, this.maxParticles);
            }
        }

        /**
         * Update particles on CPU
         */
        update(dt) {
            const windX = this.wind.x * this.windStrength;
            const windY = this.wind.y * this.windStrength;
            const windZ = this.wind.z * this.windStrength;
            
            const gravityX = this.gravity.x * dt;
            const gravityY = this.gravity.y * dt;
            const gravityZ = this.gravity.z * dt;
            
            for (let i = 0; i < this.maxParticles; i++) {
                const i2 = i * 2;
                const lifetime = this.lifetimes[i2 + 1];
                
                // Check if particle is alive
                if (lifetime <= 0) continue;
                
                this.lifetimes[i2] += dt;
                
                // Check if dead
                if (this.lifetimes[i2] >= lifetime) {
                    // Hide particle
                    this.positions[i * 3 + 1] = -10000;
                    continue;
                }
                
                const i3 = i * 3;
                
                // Apply forces
                this.velocities[i3] += (windX + gravityX) * dt;
                this.velocities[i3 + 1] += (windY + gravityY) * dt;
                this.velocities[i3 + 2] += (windZ + gravityZ) * dt;
                
                // Update position
                this.positions[i3] += this.velocities[i3] * dt;
                this.positions[i3 + 1] += this.velocities[i3 + 1] * dt;
                this.positions[i3 + 2] += this.velocities[i3 + 2] * dt;
                
                // Fade out
                const life = this.lifetimes[i2] / lifetime;
                this.colors[i * 4 + 3] = (1 - life) * (this.colors[i * 4 + 3] / (1 - life + 0.001));
            }
            
            // Auto-emit
            this.emitTimer += dt;
            const emitInterval = 1 / this.emitRate;
            while (this.emitTimer >= emitInterval) {
                this.emit(1);
                this.emitTimer -= emitInterval;
            }
            
            // Update GPU buffers
            this.geometry.attributes.position.needsUpdate = true;
            this.geometry.attributes.color.needsUpdate = true;
            this.geometry.attributes.size.needsUpdate = true;
            
            // Update time uniform
            this.material.uniforms.uTime.value += dt;
        }

        /**
         * Set wind direction and strength
         */
        setWind(x, y, z, strength) {
            this.wind.set(x, y, z);
            this.windStrength = strength;
        }

        /**
         * Set emitter position and shape
         */
        setEmitter(position, radius, box) {
            this.emitterPosition.copy(position);
            if (radius) this.emitterRadius = radius;
            if (box) this.emitterBox.copy(box);
        }

        /**
         * Set particle texture
         */
        setTexture(texture) {
            this.material.uniforms.uTexture.value = texture;
        }

        /**
         * Dispose
         */
        dispose() {
            this.geometry.dispose();
            this.material.dispose();
            if (this.scene && this.points) {
                this.scene.remove(this.points);
            }
        }
    }

    // ============================================
    // PRESET WEATHER SYSTEMS
    // ============================================

    /**
     * Rain particle system
     */
    class RainSystem extends GPUParticleSystem {
        constructor(scene) {
            super({
                scene,
                maxParticles: 50000,
                gravity: new THREE.Vector3(0, -50, 0),
                wind: new THREE.Vector3(0, 0, 0)
            });
            
            this.emitRate = 10000;
            this.setTexture(this._createRainTexture());
        }

        _createRainTexture() {
            const canvas = document.createElement('canvas');
            canvas.width = 32;
            canvas.height = 128;
            const ctx = canvas.getContext('2d');
            
            const gradient = ctx.createLinearGradient(16, 0, 16, 128);
            gradient.addColorStop(0, 'rgba(255,255,255,0)');
            gradient.addColorStop(0.5, 'rgba(200,200,255,0.8)');
            gradient.addColorStop(1, 'rgba(255,255,255,0)');
            
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 32, 128);
            
            const texture = new THREE.CanvasTexture(canvas);
            return texture;
        }

        update(dt, playerPosition) {
            // Move emitter with player
            this.setEmitter(
                new THREE.Vector3(playerPosition.x, playerPosition.y + 20, playerPosition.z),
                30
            );
            
            // Wind affects rain angle
            this.setWind(this.wind.x, 0, this.wind.z, this.windStrength);
            
            super.update(dt);
        }
    }

    /**
     * Snow particle system
     */
    class SnowSystem extends GPUParticleSystem {
        constructor(scene) {
            super({
                scene,
                maxParticles: 30000,
                gravity: new THREE.Vector3(0, -2, 0),
                wind: new THREE.Vector3(0, 0, 0)
            });
            
            this.emitRate = 500;
            this.setTexture(this._createSnowTexture());
        }

        _createSnowTexture() {
            const canvas = document.createElement('canvas');
            canvas.width = 32;
            canvas.height = 32;
            const ctx = canvas.getContext('2d');
            
            const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
            gradient.addColorStop(0, 'rgba(255,255,255,1)');
            gradient.addColorStop(0.5, 'rgba(255,255,255,0.5)');
            gradient.addColorStop(1, 'rgba(255,255,255,0)');
            
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 32, 32);
            
            return new THREE.CanvasTexture(canvas);
        }

        update(dt) {
            // Gentle wind variation
            const time = Date.now() * 0.001;
            this.setWind(
                Math.sin(time * 0.5) * 2,
                Math.sin(time * 0.3) * 0.5,
                Math.cos(time * 0.4) * 2,
                1
            );
            
            super.update(dt);
        }
    }

    /**
     * Sandstorm system
     */
    class SandstormSystem extends GPUParticleSystem {
        constructor(scene) {
            super({
                scene,
                maxParticles: 100000,
                gravity: new THREE.Vector3(0, 0.5, 0),
                wind: new THREE.Vector3(5, 0, 2)
            });
            
            this.emitRate = 2000;
            this.setTexture(this._createSandTexture());
        }

        _createSandTexture() {
            const canvas = document.createElement('canvas');
            canvas.width = 32;
            canvas.height = 32;
            const ctx = canvas.getContext('2d');
            
            ctx.fillStyle = 'rgba(194, 178, 128, 0.8)';
            ctx.fillRect(0, 0, 32, 32);
            
            return new THREE.CanvasTexture(canvas);
        }

        update(dt, direction) {
            if (direction) {
                this.setWind(direction.x * 10, direction.y * 2, direction.z * 10, 1);
            }
            
            super.update(dt);
        }
    }

    // ============================================
    // EXPORT
    // ============================================

    const SGAI = global.SGAI || {};
    SGAI.GPUParticleSystem = GPUParticleSystem;
    SGAI.RainSystem = RainSystem;
    SGAI.SnowSystem = SnowSystem;
    SGAI.SandstormSystem = SandstormSystem;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            GPUParticleSystem,
            RainSystem,
            SnowSystem,
            SandstormSystem
        };
    } else {
        global.SGAI = SGAI;
    }

})(typeof window !== 'undefined' ? window : this);

/* ============================================
   Shadow Crawler - WebGL Renderer
   Hardware-Accelerated 2D Rendering
   Batch Sprite Rendering | Dynamic Lighting
   Post-Processing Pipeline
   ============================================ */

(function() {
    'use strict';

    const WebGLRenderer = {
        // Core
        gl: null,
        canvas: null,
        width: 0,
        height: 0,
        initialized: false,
        useWebGL: false,

        // Programs
        programs: {},
        currentProgram: null,

        // Buffers
        quadBuffer: null,
        spriteBuffer: null,
        lightBuffer: null,

        // Textures
        textures: {},
        atlasTextures: {},
        currentTexture: null,

        // Framebuffers
        sceneBuffer: null,
        bloomBuffer: null,
        blurBuffer: null,
        finalBuffer: null,

        // Batch rendering
        spriteBatch: [],
        maxBatchSize: 1000,
        batchCount: 0,

        // Camera/Projection
        projectionMatrix: new Float32Array(16),
        viewMatrix: new Float32Array(16),

        // Render state
        clearColor: [0.05, 0.02, 0.08],
        blendMode: 'normal',

        // Lights
        lights: [],
        maxLights: 256,

        // Initialize WebGL renderer
        async init(canvas) {
            this.canvas = canvas || document.getElementById('game-canvas');

            if (!this.canvas) {
                console.warn('[WebGLRenderer] Canvas not found, falling back to 2D');
                return false;
            }

            // Try WebGL 2.0
            this.gl = this.canvas.getContext('webgl2', {
                alpha: false,
                antialias: false,
                preserveDrawingBuffer: false,
                powerPreference: 'high-performance'
            });

            // Fall back to WebGL 1.0
            if (!this.gl) {
                this.gl = this.canvas.getContext('webgl', {
                    alpha: false,
                    antialias: false
                });
            }

            if (!this.gl) {
                console.warn('[WebGLRenderer] WebGL not supported, using 2D fallback');
                return false;
            }

            const gl = this.gl;
            this.useWebGL = true;

            // Set size
            this.resize(this.canvas.width, this.canvas.height);

            // Compile shaders
            await this.compileShaders();

            // Create buffers
            this.createBuffers();

            // Create framebuffers for post-processing
            this.createFramebuffers();

            // Set up texture atlas
            await this.createTextureAtlas();

            // Enable extensions
            this.enableExtensions();

            // Initialize lights array
            this.lights = [];

            console.log('[WebGLRenderer] Initialized successfully');
            return true;
        },

        // Enable WebGL extensions
        enableExtensions() {
            const gl = this.gl;
            const extensions = [
                'OES_texture_float',
                'OES_texture_float_linear',
                'OES_standard_derivatives',
                'EXT_shader_texture_lod',
                'WEBGL_draw_buffers'
            ];

            extensions.forEach(ext => {
                try {
                    gl.getExtension(ext);
                } catch (e) {
                    console.warn('[WebGLRenderer] Extension not available:', ext);
                }
            });
        },

        // Compile all shaders
        async compileShaders() {
            const gl = this.gl;

            // Basic sprite shader
            const spriteVS = `
                attribute vec2 a_position;
                attribute vec2 a_texCoord;
                attribute vec4 a_color;
                
                uniform mat4 u_projection;
                uniform mat4 u_view;
                
                varying vec2 v_texCoord;
                varying vec4 v_color;
                
                void main() {
                    gl_Position = u_projection * u_view * vec4(a_position, 0.0, 1.0);
                    v_texCoord = a_texCoord;
                    v_color = a_color;
                }
            `;

            const spriteFS = `
                precision mediump float;
                
                varying vec2 v_texCoord;
                varying vec4 v_color;
                
                uniform sampler2D u_texture;
                uniform bool u_useTexture;
                
                void main() {
                    vec4 color = v_color;
                    if (u_useTexture) {
                        color *= texture2D(u_texture, v_texCoord);
                    }
                    gl_FragColor = color;
                }
            `;

            // Lighting shader
            const lightingVS = `
                attribute vec2 a_position;
                
                uniform vec2 u_lightPos;
                uniform float u_lightRadius;
                uniform vec3 u_lightColor;
                uniform float u_lightIntensity;
                
                varying vec2 v_lightPos;
                varying vec3 v_lightColor;
                varying float v_lightRadius;
                varying float v_lightIntensity;
                
                void main() {
                    gl_Position = vec4(a_position, 0.0, 1.0);
                    v_lightPos = u_lightPos;
                    v_lightColor = u_lightColor;
                    v_lightRadius = u_lightRadius;
                    v_lightIntensity = u_lightIntensity;
                }
            `;

            const lightingFS = `
                precision mediump float;
                
                varying vec2 v_lightPos;
                varying vec3 v_lightColor;
                varying float v_lightRadius;
                varying float v_lightIntensity;
                
                uniform vec2 u_resolution;
                
                void main() {
                    vec2 uv = gl_FragCoord.xy / u_resolution;
                    vec2 toLight = v_lightPos / u_resolution - uv;
                    float dist = length(toLight * vec2(1.0, u_resolution.y / u_resolution.x));
                    
                    float attenuation = 1.0 - smoothstep(0.0, v_lightRadius, dist);
                    attenuation *= attenuation; // Quadratic falloff
                    
                    vec3 light = v_lightColor * v_lightIntensity * attenuation;
                    
                    gl_FragColor = vec4(light, 1.0);
                }
            `;

            // Post-processing shader
            const postVS = `
                attribute vec2 a_position;
                attribute vec2 a_texCoord;
                
                varying vec2 v_texCoord;
                
                void main() {
                    gl_Position = vec4(a_position, 0.0, 1.0);
                    v_texCoord = a_texCoord;
                }
            `;

            const postFS = `
                precision mediump float;
                
                varying vec2 v_texCoord;
                
                uniform sampler2D u_texture;
                uniform float u_time;
                uniform float u_filmGrain;
                uniform float u_chromaticAberration;
                uniform float u_vignette;
                uniform vec3 u_colorGrade;
                
                float random(vec2 st) {
                    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
                }
                
                void main() {
                    vec2 uv = v_texCoord;
                    
                    // Chromatic aberration
                    float ca = u_chromaticAberration * 0.003;
                    float r = texture2D(u_texture, uv + vec2(ca, 0.0)).r;
                    float g = texture2D(u_texture, uv).g;
                    float b = texture2D(u_texture, uv - vec2(ca, 0.0)).b;
                    vec3 color = vec3(r, g, b);
                    
                    // Film grain
                    float grain = random(uv * u_time) * u_filmGrain;
                    color += grain;
                    
                    // Vignette
                    float vignette = 1.0 - dot(uv - 0.5, uv - 0.5) * u_vignette;
                    color *= vignette;
                    
                    // Color grading
                    color *= u_colorGrade;
                    
                    gl_FragColor = vec4(color, 1.0);
                }
            `;

            // Compile programs
            this.programs.sprite = this.createProgram(spriteVS, spriteFS);
            this.programs.lighting = this.createProgram(lightingVS, lightingFS);
            this.programs.post = this.createProgram(postVS, postFS);

            console.log('[WebGLRenderer] Shaders compiled successfully');
        },

        // Create shader program
        createProgram(vsSource, fsSource) {
            const gl = this.gl;

            const vs = this.compileShader(gl.VERTEX_SHADER, vsSource);
            const fs = this.compileShader(gl.FRAGMENT_SHADER, fsSource);

            const program = gl.createProgram();
            gl.attachShader(program, vs);
            gl.attachShader(program, fs);
            gl.linkProgram(program);

            if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
                console.error('[WebGLRenderer] Program link error:', gl.getProgramInfoLog(program));
                gl.deleteProgram(program);
                return null;
            }

            return program;
        },

        // Compile shader
        compileShader(type, source) {
            const gl = this.gl;
            const shader = gl.createShader(type);
            gl.shaderSource(shader, source);
            gl.compileShader(shader);

            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                console.error('[WebGLRenderer] Shader compile error:', gl.getShaderInfoLog(shader));
                gl.deleteShader(shader);
                return null;
            }

            return shader;
        },

        // Create buffers
        createBuffers() {
            const gl = this.gl;

            // Full-screen quad
            const quadData = new Float32Array([
                -1, -1, 0, 0,
                 1, -1, 1, 0,
                -1,  1, 0, 1,
                 1,  1, 1, 1
            ]);

            this.quadBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, quadData, gl.STATIC_DRAW);

            // Sprite batch buffer
            this.spriteBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.spriteBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, this.maxBatchSize * 6 * 8 * 4, gl.DYNAMIC_DRAW);
        },

        // Create framebuffers for post-processing
        createFramebuffers() {
            const gl = this.gl;
            const width = this.width;
            const height = this.height;

            // Scene buffer
            this.sceneBuffer = this.createFramebuffer(width, height);
            
            // Bloom buffer
            this.bloomBuffer = this.createFramebuffer(width, height);
            
            // Blur buffer
            this.blurBuffer = this.createFramebuffer(width / 2, height / 2);
        },

        // Create framebuffer
        createFramebuffer(width, height) {
            const gl = this.gl;

            const texture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

            const framebuffer = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

            return { framebuffer, texture, width, height };
        },

        // Create texture atlas
        async createTextureAtlas() {
            // Generate procedural textures for sprites
            this.atlasTextures.enemy = this.createProceduralTexture('enemy');
            this.atlasTextures.player = this.createProceduralTexture('player');
            this.atlasTextures.key = this.createProceduralTexture('key');
            this.atlasTextures.torch = this.createProceduralTexture('torch');
            this.atlasTextures.potion = this.createProceduralTexture('potion');
            this.atlasTextures.shield = this.createProceduralTexture('shield');
            this.atlasTextures.wall = this.createProceduralTexture('wall');
            this.atlasTextures.floor = this.createProceduralTexture('floor');
        },

        // Create procedural texture
        createProceduralTexture(type) {
            const gl = this.gl;
            const size = 64;
            const data = new Uint8Array(size * size * 4);

            for (let y = 0; y < size; y++) {
                for (let x = 0; x < size; x++) {
                    const idx = (y * size + x) * 4;
                    
                    if (type === 'enemy') {
                        const cx = size / 2, cy = size / 2;
                        const dx = x - cx, dy = y - cy;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist < 20) {
                            data[idx] = 100; data[idx + 1] = 0; data[idx + 2] = 170; data[idx + 3] = 255;
                        } else if (dist < 25) {
                            data[idx] = 170; data[idx + 1] = 0; data[idx + 2] = 255; data[idx + 3] = 200;
                        } else {
                            data[idx + 3] = 0;
                        }
                    } else if (type === 'player') {
                        const cx = size / 2, cy = size / 2;
                        const dx = x - cx, dy = y - cy;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist < 15) {
                            data[idx] = 170; data[idx + 1] = 170; data[idx + 2] = 204; data[idx + 3] = 255;
                        } else {
                            data[idx + 3] = 0;
                        }
                    } else if (type === 'key') {
                        data[idx] = 255; data[idx + 1] = 215; data[idx + 2] = 0; data[idx + 3] = 255;
                    } else if (type === 'wall') {
                        const noise = Math.random() * 30;
                        data[idx] = 26 + noise; data[idx + 1] = 16 + noise; data[idx + 2] = 48 + noise; data[idx + 3] = 255;
                    } else if (type === 'floor') {
                        const noise = Math.random() * 20;
                        data[idx] = 10 + noise; data[idx + 1] = 8 + noise; data[idx + 2] = 20 + noise; data[idx + 3] = 255;
                    } else {
                        data[idx] = 255; data[idx + 1] = 255; data[idx + 2] = 255; data[idx + 3] = 255;
                    }
                }
            }

            const texture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

            return texture;
        },

        // Resize renderer
        resize(width, height) {
            this.width = width;
            this.height = height;

            if (this.gl) {
                this.gl.viewport(0, 0, width, height);
            }

            // Recreate projection matrix
            this.projectionMatrix = this.makeOrtho(0, width, height, 0, -1, 1);
        },

        // Make orthographic projection matrix
        makeOrtho(left, right, bottom, top, near, far) {
            return new Float32Array([
                2 / (right - left), 0, 0, 0,
                0, 2 / (top - bottom), 0, 0,
                0, 0, -2 / (far - near), 0,
                -(right + left) / (right - left), -(top + bottom) / (top - bottom), -(far + near) / (far - near), 1
            ]);
        },

        // Add light
        addLight(x, y, radius, color, intensity) {
            if (this.lights.length >= this.maxLights) return;
            
            this.lights.push({
                x: x,
                y: y,
                radius: radius,
                color: color || [1, 1, 1],
                intensity: intensity || 1.0
            });
        },

        // Clear lights
        clearLights() {
            this.lights = [];
        },

        // Begin frame
        beginFrame() {
            const gl = this.gl;
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.sceneBuffer.framebuffer);
            gl.viewport(0, 0, this.width, this.height);
            gl.clearColor(this.clearColor[0], this.clearColor[1], this.clearColor[2], 1.0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            
            this.batchCount = 0;
            this.spriteBatch = [];
        },

        // Draw sprite
        drawSprite(x, y, width, height, color, texture = null, rotation = 0) {
            this.spriteBatch.push({
                x: x,
                y: y,
                width: width,
                height: height,
                color: color || [1, 1, 1, 1],
                texture: texture,
                rotation: rotation
            });

            if (this.spriteBatch.length >= this.maxBatchSize) {
                this.flushSprites();
            }
        },

        // Flush sprite batch
        flushSprites() {
            if (this.spriteBatch.length === 0) return;

            const gl = this.gl;
            const program = this.programs.sprite;
            gl.useProgram(program);

            // Set projection matrix
            const projLoc = gl.getUniformLocation(program, 'u_projection');
            const viewLoc = gl.getUniformLocation(program, 'u_view');
            gl.uniformMatrix4fv(projLoc, false, this.projectionMatrix);
            gl.uniformMatrix4fv(viewLoc, false, this.viewMatrix);

            // Build vertex data
            const vertexData = [];
            for (const sprite of this.spriteBatch) {
                const cos = Math.cos(sprite.rotation);
                const sin = Math.sin(sprite.rotation);
                
                // Four corners with rotation
                const corners = [
                    { x: -sprite.width/2, y: -sprite.height/2, u: 0, v: 0 },
                    { x: sprite.width/2, y: -sprite.height/2, u: 1, v: 0 },
                    { x: -sprite.width/2, y: sprite.height/2, u: 0, v: 1 },
                    { x: sprite.width/2, y: sprite.height/2, u: 1, v: 1 }
                ];

                for (const corner of corners) {
                    const rx = corner.x * cos - corner.y * sin;
                    const ry = corner.x * sin + corner.y * cos;
                    
                    vertexData.push(
                        sprite.x + rx,
                        sprite.y + ry,
                        corner.u,
                        corner.v,
                        sprite.color[0],
                        sprite.color[1],
                        sprite.color[2],
                        sprite.color[3]
                    );
                }
            }

            // Upload data
            const data = new Float32Array(vertexData);
            gl.bindBuffer(gl.ARRAY_BUFFER, this.spriteBuffer);
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, data);

            // Set attributes
            const posLoc = gl.getAttribLocation(program, 'a_position');
            const texCoordLoc = gl.getAttribLocation(program, 'a_texCoord');
            const colorLoc = gl.getAttribLocation(program, 'a_color');

            gl.enableVertexAttribArray(posLoc);
            gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 32, 0);

            gl.enableVertexAttribArray(texCoordLoc);
            gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 32, 8);

            gl.enableVertexAttribArray(colorLoc);
            gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 32, 16);

            // Draw
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.spriteBatch.length * 4);

            this.spriteBatch = [];
        },

        // Render lights
        renderLights(cameraOffset) {
            const gl = this.gl;
            const program = this.programs.lighting;
            gl.useProgram(program);

            gl.enable(gl.BLEND);
            gl.blendFunc(gl.ONE, gl.ONE); // Additive blending

            const resLoc = gl.getUniformLocation(program, 'u_resolution');
            gl.uniform2f(resLoc, this.width, this.height);

            for (const light of this.lights) {
                const lightPos = gl.getUniformLocation(program, 'u_lightPos');
                const lightRadius = gl.getUniformLocation(program, 'u_lightRadius');
                const lightColor = gl.getUniformLocation(program, 'u_lightColor');
                const lightIntensity = gl.getUniformLocation(program, 'u_lightIntensity');

                gl.uniform2f(lightPos, light.x - cameraOffset.x, light.y - cameraOffset.y);
                gl.uniform1f(lightRadius, light.radius);
                gl.uniform3f(lightColor, light.color[0], light.color[1], light.color[2]);
                gl.uniform1f(lightIntensity, light.intensity);

                gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            }

            gl.disable(gl.BLEND);
        },

        // Apply post-processing
        applyPostProcessing(effects) {
            const gl = this.gl;
            const program = this.programs.post;
            gl.useProgram(program);

            // Bind scene texture
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.sceneBuffer.texture);
            const texLoc = gl.getUniformLocation(program, 'u_texture');
            gl.uniform1i(texLoc, 0);

            // Set effect uniforms
            const timeLoc = gl.getUniformLocation(program, 'u_time');
            const filmGrainLoc = gl.getUniformLocation(program, 'u_filmGrain');
            const caLoc = gl.getUniformLocation(program, 'u_chromaticAberration');
            const vignetteLoc = gl.getUniformLocation(program, 'u_vignette');
            const colorGradeLoc = gl.getUniformLocation(program, 'u_colorGrade');

            gl.uniform1f(timeLoc, effects.time || 0);
            gl.uniform1f(filmGrainLoc, effects.filmGrain || 0.0);
            gl.uniform1f(caLoc, effects.chromaticAberration || 0.0);
            gl.uniform1f(vignetteLoc, effects.vignette || 0.3);
            gl.uniform3f(colorGradeLoc, 
                effects.colorGrade?.r || 1.0,
                effects.colorGrade?.g || 1.0,
                effects.colorGrade?.b || 1.0
            );

            // Draw to screen
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.viewport(0, 0, this.width, this.height);

            const posLoc = gl.getAttribLocation(program, 'a_position');
            const texCoordLoc = gl.getAttribLocation(program, 'a_texCoord');

            gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
            gl.enableVertexAttribArray(posLoc);
            gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 16, 0);

            gl.enableVertexAttribArray(texCoordLoc);
            gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 16, 8);

            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        },

        // End frame
        endFrame(effects = {}) {
            // Flush remaining sprites
            this.flushSprites();

            // Render lights
            this.renderLights({ x: 0, y: 0 });

            // Apply post-processing
            if (effects.enabled !== false) {
                this.applyPostProcessing(effects);
            }
        },

        // Get texture
        getTexture(name) {
            return this.atlasTextures[name] || null;
        },

        // Cleanup
        destroy() {
            const gl = this.gl;
            
            if (this.quadBuffer) gl.deleteBuffer(this.quadBuffer);
            if (this.spriteBuffer) gl.deleteBuffer(this.spriteBuffer);
            
            Object.values(this.programs).forEach(prog => {
                if (prog) gl.deleteProgram(prog);
            });
            
            Object.values(this.textures).forEach(tex => {
                if (tex) gl.deleteTexture(tex);
            });
            
            this.initialized = false;
        }
    };

    // Export
    window.ShadowCrawlerWebGLRenderer = WebGLRenderer;
})();

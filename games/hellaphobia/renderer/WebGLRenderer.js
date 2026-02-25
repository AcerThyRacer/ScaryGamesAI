/* ============================================================
   HELLAPHOBIA - WEBGL RENDERER
   Hardware-Accelerated 2D Rendering | Shader Pipeline
   Batch Rendering | Texture Atlasing | Dynamic Lighting
   ============================================================ */

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

            console.log('[WebGLRenderer] Initialized successfully');
            this.initialized = true;
            return true;
        },

        // Enable WebGL extensions
        enableExtensions() {
            const gl = this.gl;

            const extensions = [
                'OES_texture_float',
                'OES_texture_float_linear',
                'OES_standard_derivatives',
                'EXT_blend_minmax',
                'WEBGL_draw_buffers'
            ];

            extensions.forEach(name => {
                const ext = gl.getExtension(name);
                if (ext) {
                    console.log(`[WebGLRenderer] Enabled: ${name}`);
                }
            });
        },

        // Shader sources
        _shaders: {
            sprite: {
                vertex: `
                    attribute vec2 a_position;
                    attribute vec2 a_texCoord;
                    attribute vec4 a_color;
                    attribute vec4 a_transform;

                    uniform mat4 u_projection;
                    uniform mat4 u_view;

                    varying vec2 v_texCoord;
                    varying vec4 v_color;

                    void main() {
                        // Apply transform (x, y, scaleX, scaleY)
                        vec2 position = a_position * a_transform.zw + a_transform.xy;

                        gl_Position = u_projection * u_view * vec4(position, 0.0, 1.0);
                        v_texCoord = a_texCoord;
                        v_color = a_color;
                    }
                `,
                fragment: `
                    precision mediump float;

                    uniform sampler2D u_texture;
                    uniform float u_alpha;

                    varying vec2 v_texCoord;
                    varying vec4 v_color;

                    void main() {
                        vec4 texColor = texture2D(u_texture, v_texCoord);

                        // Alpha test for sprites
                        if (texColor.a < 0.1) discard;

                        gl_FragColor = texColor * v_color * u_alpha;
                    }
                `
            },

            lighting: {
                vertex: `
                    attribute vec2 a_position;
                    attribute vec2 a_texCoord;

                    uniform mat4 u_projection;
                    uniform mat4 u_view;

                    varying vec2 v_texCoord;

                    void main() {
                        gl_Position = u_projection * u_view * vec4(a_position, 0.0, 1.0);
                        v_texCoord = a_texCoord;
                    }
                `,
                fragment: `
                    precision mediump float;

                    uniform sampler2D u_texture;
                    uniform sampler2D u_lightTexture;
                    uniform vec2 u_resolution;
                    uniform vec2 u_lightPos;
                    uniform vec3 u_lightColor;
                    uniform float u_lightRadius;
                    uniform float u_lightIntensity;

                    varying vec2 v_texCoord;

                    void main() {
                        vec4 baseColor = texture2D(u_texture, v_texCoord);

                        // Calculate light contribution
                        vec2 screenPos = v_texCoord * u_resolution;
                        vec2 toLight = u_lightPos - screenPos;
                        float dist = length(toLight);

                        // Smooth falloff
                        float attenuation = 1.0 - smoothstep(0.0, u_lightRadius, dist);
                        attenuation *= attenuation; // Quadratic falloff

                        // Light color
                        vec3 lightContrib = u_lightColor * u_lightIntensity * attenuation;

                        // Apply lighting
                        vec3 litColor = baseColor.rgb * (0.1 + lightContrib);

                        gl_FragColor = vec4(litColor, baseColor.a);
                    }
                `
            },

            bloom: {
                vertex: `
                    attribute vec2 a_position;
                    attribute vec2 a_texCoord;

                    uniform mat4 u_projection;

                    varying vec2 v_texCoord;

                    void main() {
                        gl_Position = u_projection * vec4(a_position, 0.0, 1.0);
                        v_texCoord = a_texCoord;
                    }
                `,
                fragment: `
                    precision mediump float;

                    uniform sampler2D u_texture;
                    uniform vec2 u_resolution;
                    uniform float u_threshold;
                    uniform float u_intensity;

                    varying vec2 v_texCoord;

                    void main() {
                        // Extract bright pixels
                        vec4 color = texture2D(u_texture, v_texCoord);
                        float brightness = max(max(color.r, color.g), color.b);

                        // Threshold
                        float brightValue = max(0.0, brightness - u_threshold);

                        gl_FragColor = vec4(color.rgb * brightValue * u_intensity, color.a);
                    }
                `
            },

            blur: {
                vertex: `
                    attribute vec2 a_position;
                    attribute vec2 a_texCoord;

                    uniform mat4 u_projection;

                    varying vec2 v_texCoord;

                    void main() {
                        gl_Position = u_projection * vec4(a_position, 0.0, 1.0);
                        v_texCoord = a_texCoord;
                    }
                `,
                fragment: `
                    precision mediump float;

                    uniform sampler2D u_texture;
                    uniform vec2 u_resolution;
                    uniform vec2 u_direction;
                    uniform float u_radius;

                    varying vec2 v_texCoord;

                    void main() {
                        vec2 pixelStep = u_direction / u_resolution;
                        vec4 color = vec4(0.0);
                        float totalWeight = 0.0;

                        // Gaussian blur kernel
                        for (float i = -4.0; i <= 4.0; i++) {
                            float weight = exp(-0.5 * i * i / (u_radius * u_radius));
                            color += texture2D(u_texture, v_texCoord + pixelStep * i) * weight;
                            totalWeight += weight;
                        }

                        gl_FragColor = color / totalWeight;
                    }
                `
            },

            composite: {
                vertex: `
                    attribute vec2 a_position;
                    attribute vec2 a_texCoord;

                    uniform mat4 u_projection;

                    varying vec2 v_texCoord;

                    void main() {
                        gl_Position = u_projection * vec4(a_position, 0.0, 1.0);
                        v_texCoord = a_texCoord;
                    }
                `,
                fragment: `
                    precision mediump float;

                    uniform sampler2D u_scene;
                    uniform sampler2D u_bloom;
                    uniform float u_bloomIntensity;

                    varying vec2 v_texCoord;

                    void main() {
                        vec4 sceneColor = texture2D(u_scene, v_texCoord);
                        vec4 bloomColor = texture2D(u_bloom, v_texCoord);

                        // Add bloom
                        vec3 finalColor = sceneColor.rgb + bloomColor.rgb * u_bloomIntensity;

                        gl_FragColor = vec4(finalColor, sceneColor.a);
                    }
                `
            },

            postProcess: {
                vertex: `
                    attribute vec2 a_position;
                    attribute vec2 a_texCoord;

                    uniform mat4 u_projection;

                    varying vec2 v_texCoord;

                    void main() {
                        gl_Position = u_projection * vec4(a_position, 0.0, 1.0);
                        v_texCoord = a_texCoord;
                    }
                `,
                fragment: `
                    precision mediump float;

                    uniform sampler2D u_texture;
                    uniform vec2 u_resolution;
                    uniform float u_time;

                    // Post-processing uniforms
                    uniform float u_vignetteIntensity;
                    uniform float u_grainIntensity;
                    uniform float u_chromaticIntensity;
                    uniform float u_bloomIntensity;
                    uniform vec3 u_colorGrade;

                    varying vec2 v_texCoord;

                    // Pseudo-random
                    float random(vec2 st) {
                        return fract(sin(dot(st, vec2(12.9898, 78.233))) * 43758.5453);
                    }

                    void main() {
                        vec2 uv = v_texCoord;
                        vec3 color = texture2D(u_texture, uv).rgb;

                        // Chromatic aberration
                        if (u_chromaticIntensity > 0.0) {
                            float dist = distance(uv, vec2(0.5));
                            vec2 offset = (uv - vec2(0.5)) * dist * u_chromaticIntensity;
                            color.r = texture2D(u_texture, uv + offset).r;
                            color.b = texture2D(u_texture, uv - offset).b;
                        }

                        // Film grain
                        if (u_grainIntensity > 0.0) {
                            float noise = random(uv * u_resolution + u_time * 60.0);
                            color += (noise - 0.5) * u_grainIntensity;
                        }

                        // Vignette
                        if (u_vignetteIntensity > 0.0) {
                            float vignette = 1.0 - length(uv - vec2(0.5)) * 2.0;
                            vignette = smoothstep(0.0, 1.0, vignette);
                            color *= mix(1.0, vignette, u_vignetteIntensity);
                        }

                        // Color grading
                        color *= u_colorGrade;

                        gl_FragColor = vec4(color, 1.0);
                    }
                `
            },

            distortion: {
                vertex: `
                    attribute vec2 a_position;
                    attribute vec2 a_texCoord;

                    uniform mat4 u_projection;
                    uniform float u_time;
                    uniform float u_intensity;

                    varying vec2 v_texCoord;
                    varying vec2 v_distortedCoord;

                    void main() {
                        gl_Position = u_projection * vec4(a_position, 0.0, 1.0);
                        v_texCoord = a_texCoord;

                        // Wave distortion
                        vec2 distorted = a_texCoord;
                        distorted.x += sin(a_texCoord.y * 10.0 + u_time * 5.0) * u_intensity * 0.01;
                        distorted.y += cos(a_texCoord.x * 10.0 + u_time * 3.0) * u_intensity * 0.01;
                        v_distortedCoord = distorted;
                    }
                `,
                fragment: `
                    precision mediump float;

                    uniform sampler2D u_texture;
                    uniform float u_intensity;

                    varying vec2 v_distortedCoord;

                    void main() {
                        gl_FragColor = texture2D(u_texture, v_distortedCoord);
                    }
                `
            }
        },

        // Compile all shaders
        async compileShaders() {
            const gl = this.gl;

            for (const [name, shader] of Object.entries(this._shaders)) {
                try {
                    const program = this.createProgram(shader.vertex, shader.fragment);
                    this.programs[name] = program;
                    console.log(`[WebGLRenderer] Compiled shader: ${name}`);
                } catch (err) {
                    console.error(`[WebGLRenderer] Failed to compile ${name}:`, err);
                }
            }
        },

        // Create shader program
        createProgram(vertexSrc, fragmentSrc) {
            const gl = this.gl;

            const vertexShader = this.compileShader(gl.VERTEX_SHADER, vertexSrc);
            const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, fragmentSrc);

            const program = gl.createProgram();
            gl.attachShader(program, vertexShader);
            gl.attachShader(program, fragmentShader);
            gl.linkProgram(program);

            if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
                console.error('Program link error:', gl.getProgramInfoLog(program));
                gl.deleteProgram(program);
                return null;
            }

            return program;
        },

        // Compile single shader
        compileShader(type, source) {
            const gl = this.gl;
            const shader = gl.createShader(type);
            gl.shaderSource(shader, source);
            gl.compileShader(shader);

            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                console.error('Shader compile error:', gl.getShaderInfoLog(shader));
                gl.deleteShader(shader);
                return null;
            }

            return shader;
        },

        // Create buffers
        createBuffers() {
            const gl = this.gl;

            // Full-screen quad
            this.quadBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
            gl.bufferData(
                gl.ARRAY_BUFFER,
                new Float32Array([
                    -1, -1, 0, 0,
                    1, -1, 1, 0,
                    -1, 1, 0, 1,
                    -1, 1, 0, 1,
                    1, -1, 1, 0,
                    1, 1, 1, 1
                ]),
                gl.STATIC_DRAW
            );

            // Sprite batch buffer (will be updated dynamically)
            this.spriteBuffer = gl.createBuffer();
            const maxVerts = this.maxBatchSize * 6 * 6; // 6 vertices per quad, 6 floats per vertex
            gl.bindBuffer(gl.ARRAY_BUFFER, this.spriteBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, maxVerts * 4, gl.DYNAMIC_DRAW);

            // Light buffer (for point light quads)
            this.lightBuffer = gl.createBuffer();
        },

        // Create framebuffers for post-processing
        createFramebuffers() {
            const gl = this.gl;

            // Scene framebuffer
            this.sceneBuffer = this.createFramebuffer(this.width, this.height);

            // Bloom framebuffer (half resolution)
            this.bloomBuffer = this.createFramebuffer(this.width / 2, this.height / 2);

            // Blur framebuffer
            this.blurBuffer = this.createFramebuffer(this.width / 2, this.height / 2);

            // Final composite framebuffer
            this.finalBuffer = this.createFramebuffer(this.width, this.height);
        },

        // Create single framebuffer with texture
        createFramebuffer(width, height) {
            const gl = this.gl;

            const texture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

            const framebuffer = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

            return { framebuffer, texture, width, height };
        },

        // Create texture atlas for sprites
        async createTextureAtlas() {
            // Procedurally generate placeholder textures
            const atlasCanvas = document.createElement('canvas');
            atlasCanvas.width = 1024;
            atlasCanvas.height = 1024;
            const ctx = atlasCanvas.getContext('2d');

            // Draw placeholder sprites
            this.generatePlaceholderSprites(ctx);

            // Create WebGL texture from canvas
            const gl = this.gl;
            const texture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlasCanvas);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

            this.atlasTextures['main'] = texture;
            this.atlasInfo = this.calculateAtlasInfo();

            console.log('[WebGLRenderer] Texture atlas created');
        },

        // Generate placeholder sprites for testing
        generatePlaceholderSprites(ctx) {
            const colors = {
                player: '#4a9eff',
                monster: '#ff4444',
                wall: '#444455',
                floor: '#2a2a3a',
                blood: '#aa0000',
                particle: '#ffffff'
            };

            // Player sprite (32x40)
            ctx.fillStyle = colors.player;
            ctx.fillRect(10, 10, 32, 40);
            // Eyes
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(25, 20, 6, 6);
            ctx.fillRect(35, 20, 6, 6);

            // Monster sprite (32x32)
            ctx.fillStyle = colors.monster;
            ctx.fillRect(60, 10, 32, 32);
            ctx.fillStyle = '#ffff00';
            ctx.fillRect(68, 18, 6, 6);
            ctx.fillRect(80, 18, 6, 6);

            // Floor tile (32x32)
            ctx.fillStyle = colors.floor;
            ctx.fillRect(10, 60, 32, 32);
            ctx.strokeStyle = '#3a3a4a';
            ctx.strokeRect(10, 60, 32, 32);

            // Wall tile (32x32)
            ctx.fillStyle = colors.wall;
            ctx.fillRect(60, 60, 32, 32);
            ctx.strokeStyle = '#555566';
            ctx.strokeRect(60, 60, 32, 32);

            // Blood particle
            ctx.fillStyle = colors.blood;
            ctx.beginPath();
            ctx.arc(26, 110, 8, 0, Math.PI * 2);
            ctx.fill();

            // Generate variations
            for (let i = 0; i < 8; i++) {
                // Monster variations
                ctx.fillStyle = `hsl(${i * 30}, 70%, 50%)`;
                ctx.fillRect(60 + i * 40, 10, 32, 32);
            }
        },

        // Calculate UV coordinates for atlas sprites
        calculateAtlasInfo() {
            return {
                player: { u: 10/1024, v: 10/1024, w: 32/1024, h: 40/1024 },
                monster: { u: 60/1024, v: 10/1024, w: 32/1024, h: 32/1024 },
                floor: { u: 10/1024, v: 60/1024, w: 32/1024, h: 32/1024 },
                wall: { u: 60/1024, v: 60/1024, w: 32/1024, h: 32/1024 }
            };
        },

        // Resize renderer
        resize(width, height) {
            this.width = width;
            this.height = height;

            if (this.gl) {
                this.gl.viewport(0, 0, width, height);

                // Recreate framebuffers at new size
                this.createFramebuffers();
            }

            // Update projection matrix
            this.updateProjectionMatrix();
        },

        // Update projection matrix
        updateProjectionMatrix() {
            const ortho = (left, right, bottom, top, near, far) => {
                const lr = 1 / (left - right);
                const bt = 1 / (bottom - top);
                const nf = 1 / (near - far);

                return new Float32Array([
                    -2 * lr, 0, 0, 0,
                    0, -2 * bt, 0, 0,
                    0, 0, 2 * nf, 0,
                    (left + right) * lr, (top + bottom) * bt, (far + near) * nf, 1
                ]);
            };

            this.projectionMatrix = ortho(0, this.width, this.height, 0, -1, 1);
        },

        // Clear screen
        clear(color = null) {
            const gl = this.gl;
            const c = color || this.clearColor;
            gl.clearColor(c[0], c[1], c[2], 1.0);
            gl.clear(gl.COLOR_BUFFER_BIT);
        },

        // Begin frame (bind scene framebuffer)
        beginFrame() {
            if (!this.useWebGL) return;

            const gl = this.gl;
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.sceneBuffer.framebuffer);
            gl.viewport(0, 0, this.sceneBuffer.width, this.sceneBuffer.height);
            this.clear();

            this.batchCount = 0;
            this.spriteBatch = [];
        },

        // Render sprite to batch
        drawSprite(x, y, width, height, uv, color = [1, 1, 1, 1], rotation = 0) {
            if (!this.useWebGL) return;

            if (this.batchCount >= this.maxBatchSize) {
                this.flushSprites();
            }

            this.spriteBatch.push({
                x, y, width, height,
                uv: uv || { u: 0, v: 0, w: 1, h: 1 },
                color,
                rotation
            });
            this.batchCount++;
        },

        // Flush sprite batch to GPU
        flushSprites() {
            if (this.spriteBatch.length === 0) return;

            const gl = this.gl;
            const program = this.programs.sprite;
            gl.useProgram(program);

            // Build vertex data
            const vertices = new Float32Array(this.spriteBatch.length * 24); // 6 verts * 4 floats per vert

            let offset = 0;
            for (const sprite of this.spriteBatch) {
                const x = sprite.x;
                const y = sprite.y;
                const w = sprite.width;
                const h = sprite.height;
                const u = sprite.uv.u;
                const v = sprite.uv.v;
                const uw = sprite.uv.w;
                const vh = sprite.uv.h;
                const r = sprite.color[0];
                const g = sprite.color[1];
                const b = sprite.color[2];
                const a = sprite.color[3];

                // Triangle 1
                vertices[offset++] = x;     vertices[offset++] = y;
                vertices[offset++] = u;     vertices[offset++] = v;
                vertices[offset++] = r;     vertices[offset++] = g;
                vertices[offset++] = b;     vertices[offset++] = a;

                vertices[offset++] = x + w; vertices[offset++] = y;
                vertices[offset++] = u + uw;vertices[offset++] = v;
                vertices[offset++] = r;     vertices[offset++] = g;
                vertices[offset++] = b;     vertices[offset++] = a;

                vertices[offset++] = x;     vertices[offset++] = y + h;
                vertices[offset++] = u;     vertices[offset++] = v + vh;
                vertices[offset++] = r;     vertices[offset++] = g;
                vertices[offset++] = b;     vertices[offset++] = a;

                // Triangle 2
                vertices[offset++] = x;     vertices[offset++] = y + h;
                vertices[offset++] = u;     vertices[offset++] = v + vh;
                vertices[offset++] = r;     vertices[offset++] = g;
                vertices[offset++] = b;     vertices[offset++] = a;

                vertices[offset++] = x + w; vertices[offset++] = y;
                vertices[offset++] = u + uw;vertices[offset++] = v;
                vertices[offset++] = r;     vertices[offset++] = g;
                vertices[offset++] = b;     vertices[offset++] = a;

                vertices[offset++] = x + w; vertices[offset++] = y + h;
                vertices[offset++] = u + uw;vertices[offset++] = v + vh;
                vertices[offset++] = r;     vertices[offset++] = g;
                vertices[offset++] = b;     vertices[offset++] = a;
            }

            // Upload and draw
            gl.bindBuffer(gl.ARRAY_BUFFER, this.spriteBuffer);
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, vertices);

            // Set up attributes
            const positionLoc = gl.getAttribLocation(program, 'a_position');
            const texCoordLoc = gl.getAttribLocation(program, 'a_texCoord');
            const colorLoc = gl.getAttribLocation(program, 'a_color');

            gl.enableVertexAttribArray(positionLoc);
            gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 32, 0);

            gl.enableVertexAttribArray(texCoordLoc);
            gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 32, 8);

            gl.enableVertexAttribArray(colorLoc);
            gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 32, 16);

            // Set uniforms
            gl.uniformMatrix4fv(gl.getUniformLocation(program, 'u_projection'), false, this.projectionMatrix);
            gl.uniformMatrix4fv(gl.getUniformLocation(program, 'u_view'), false, this.viewMatrix);
            gl.uniform1i(gl.getUniformLocation(program, 'u_texture'), 0);
            gl.uniform1f(gl.getUniformLocation(program, 'u_alpha'), 1.0);

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.atlasTextures['main']);

            gl.drawArrays(gl.TRIANGLES, 0, this.spriteBatch.length * 6);

            this.spriteBatch = [];
            this.batchCount = 0;
        },

        // Draw a light source
        drawLight(x, y, radius, color, intensity = 1.0) {
            if (!this.useWebGL) return;

            const gl = this.gl;
            const program = this.programs.lighting;
            gl.useProgram(program);

            // Set up light quad
            const lightVerts = new Float32Array([
                x - radius, y - radius, 0, 0,
                x + radius, y - radius, 1, 0,
                x - radius, y + radius, 0, 1,
                x - radius, y + radius, 0, 1,
                x + radius, y - radius, 1, 0,
                x + radius, y + radius, 1, 1
            ]);

            gl.bindBuffer(gl.ARRAY_BUFFER, this.lightBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, lightVerts, gl.DYNAMIC_DRAW);

            const positionLoc = gl.getAttribLocation(program, 'a_position');
            const texCoordLoc = gl.getAttribLocation(program, 'a_texCoord');

            gl.enableVertexAttribArray(positionLoc);
            gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 16, 0);

            gl.enableVertexAttribArray(texCoordLoc);
            gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 16, 8);

            gl.uniformMatrix4fv(gl.getUniformLocation(program, 'u_projection'), false, this.projectionMatrix);
            gl.uniformMatrix4fv(gl.getUniformLocation(program, 'u_view'), false, this.viewMatrix);
            gl.uniform2f(gl.getUniformLocation(program, 'u_resolution'), this.width, this.height);
            gl.uniform2f(gl.getUniformLocation(program, 'u_lightPos'), x, y);
            gl.uniform3f(gl.getUniformLocation(program, 'u_lightColor'), color[0], color[1], color[2]);
            gl.uniform1f(gl.getUniformLocation(program, 'u_lightRadius'), radius);
            gl.uniform1f(gl.getUniformLocation(program, 'u_lightIntensity'), intensity);

            gl.drawArrays(gl.TRIANGLES, 0, 6);
        },

        // Apply post-processing and render to screen
        endFrame(postProcessSettings = {}) {
            if (!this.useWebGL) return;

            const gl = this.gl;

            // Flush any remaining sprites
            this.flushSprites();

            // Unbind framebuffer - render to screen
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.viewport(0, 0, this.width, this.height);

            // Apply bloom if enabled
            if (postProcessSettings.bloom !== false) {
                this.applyBloom(postProcessSettings.bloomThreshold || 0.8, postProcessSettings.bloomIntensity || 0.5);
            }

            // Apply final post-processing
            this.applyPostProcess(postProcessSettings);
        },

        // Apply bloom effect
        applyBloom(threshold, intensity) {
            const gl = this.gl;

            // Step 1: Extract bright areas to bloom buffer
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.bloomBuffer.framebuffer);
            gl.viewport(0, 0, this.bloomBuffer.width, this.bloomBuffer.height);

            const bloomProgram = this.programs.bloom;
            gl.useProgram(bloomProgram);

            gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);

            const positionLoc = gl.getAttribLocation(bloomProgram, 'a_position');
            const texCoordLoc = gl.getAttribLocation(bloomProgram, 'a_texCoord');

            gl.enableVertexAttribArray(positionLoc);
            gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 16, 0);

            gl.enableVertexAttribArray(texCoordLoc);
            gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 16, 8);

            gl.uniformMatrix4fv(gl.getUniformLocation(bloomProgram, 'u_projection'), false, this.projectionMatrix);
            gl.uniform1i(gl.getUniformLocation(bloomProgram, 'u_texture'), 0);
            gl.uniform2f(gl.getUniformLocation(bloomProgram, 'u_resolution'), this.bloomBuffer.width, this.bloomBuffer.height);
            gl.uniform1f(gl.getUniformLocation(bloomProgram, 'u_threshold'), threshold);
            gl.uniform1f(gl.getUniformLocation(bloomProgram, 'u_intensity'), intensity);

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.sceneBuffer.texture);

            gl.drawArrays(gl.TRIANGLES, 0, 6);

            // Step 2: Blur horizontally
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.blurBuffer.framebuffer);
            gl.viewport(0, 0, this.blurBuffer.width, this.blurBuffer.height);

            const blurProgram = this.programs.blur;
            gl.useProgram(blurProgram);

            gl.uniform2f(gl.getUniformLocation(blurProgram, 'u_direction'), 1.0, 0.0);
            gl.uniform1f(gl.getUniformLocation(blurProgram, 'u_radius'), 1.5);
            gl.bindTexture(gl.TEXTURE_2D, this.bloomBuffer.texture);

            gl.drawArrays(gl.TRIANGLES, 0, 6);

            // Step 3: Blur vertically
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.bloomBuffer.framebuffer);
            gl.viewport(0, 0, this.bloomBuffer.width, this.bloomBuffer.height);

            gl.uniform2f(gl.getUniformLocation(blurProgram, 'u_direction'), 0.0, 1.0);
            gl.bindTexture(gl.TEXTURE_2D, this.blurBuffer.texture);

            gl.drawArrays(gl.TRIANGLES, 0, 6);
        },

        // Apply final post-processing
        applyPostProcess(settings) {
            const gl = this.gl;
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.viewport(0, 0, this.width, this.height);

            const ppProgram = this.programs.postProcess;
            gl.useProgram(ppProgram);

            gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);

            const positionLoc = gl.getAttribLocation(ppProgram, 'a_position');
            const texCoordLoc = gl.getAttribLocation(ppProgram, 'a_texCoord');

            gl.enableVertexAttribArray(positionLoc);
            gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 16, 0);

            gl.enableVertexAttribArray(texCoordLoc);
            gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 16, 8);

            // Set uniforms
            gl.uniformMatrix4fv(gl.getUniformLocation(ppProgram, 'u_projection'), false, this.projectionMatrix);
            gl.uniform1i(gl.getUniformLocation(ppProgram, 'u_texture'), 0);
            gl.uniform2f(gl.getUniformLocation(ppProgram, 'u_resolution'), this.width, this.height);
            gl.uniform1f(gl.getUniformLocation(ppProgram, 'u_time'), performance.now() / 1000);

            gl.uniform1f(gl.getUniformLocation(ppProgram, 'u_vignetteIntensity'), settings.vignette || 0.3);
            gl.uniform1f(gl.getUniformLocation(ppProgram, 'u_grainIntensity'), settings.grain || 0.05);
            gl.uniform1f(gl.getUniformLocation(ppProgram, 'u_chromaticIntensity'), settings.chromatic || 0.0);
            gl.uniform1f(gl.getUniformLocation(ppProgram, 'u_bloomIntensity'), settings.bloom !== false ? (settings.bloomIntensity || 0.5) : 0);
            gl.uniform3f(gl.getUniformLocation(ppProgram, 'u_colorGrade'),
                settings.colorGrade?.[0] || 1.0,
                settings.colorGrade?.[1] || 1.0,
                settings.colorGrade?.[2] || 1.0
            );

            // Use scene texture (with bloom already composited if enabled)
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.sceneBuffer.texture);

            gl.drawArrays(gl.TRIANGLES, 0, 6);
        },

        // Set view matrix (camera)
        setCamera(x, y) {
            this.viewMatrix = new Float32Array([
                1, 0, 0, 0,
                0, 1, 0, 0,
                0, 0, 1, 0,
                -x, -y, 0, 1
            ]);
        },

        // Get sprite UV from atlas
        getSpriteUV(name) {
            return this.atlasInfo[name] || { u: 0, v: 0, w: 1, h: 1 };
        },

        // Cleanup
        dispose() {
            const gl = this.gl;
            if (!gl) return;

            // Delete programs
            Object.values(this.programs).forEach(prog => gl.deleteProgram(prog));

            // Delete buffers
            gl.deleteBuffer(this.quadBuffer);
            gl.deleteBuffer(this.spriteBuffer);
            gl.deleteBuffer(this.lightBuffer);

            // Delete textures
            Object.values(this.textures).forEach(tex => gl.deleteTexture(tex));
            Object.values(this.atlasTextures).forEach(tex => gl.deleteTexture(tex));

            // Delete framebuffers
            [this.sceneBuffer, this.bloomBuffer, this.blurBuffer, this.finalBuffer].forEach(fb => {
                if (fb && fb.framebuffer) gl.deleteFramebuffer(fb.framebuffer);
                if (fb && fb.texture) gl.deleteTexture(fb.texture);
            });

            this.initialized = false;
            this.useWebGL = false;
        }
    };

    // Export
    window.WebGLRenderer = WebGLRenderer;

    console.log('[WebGLRenderer] Module loaded');
})();

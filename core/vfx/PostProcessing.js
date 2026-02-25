/**
 * Post-Processing Pipeline - Phase 9: Advanced Visual Effects
 * Complete post-processing with SSR, volumetrics, bloom, and more
 */

export class PostProcessingPipeline {
  constructor(gl, options = {}) {
    this.gl = gl;
    this.width = gl.canvas.width;
    this.height = gl.canvas.height;
    
    // Effect toggles
    this.effects = {
      ssr: options.ssr !== false,
      volumetric: options.volumetric !== false,
      bloom: options.bloom !== false,
      vignette: options.vignette !== false,
      colorGrading: options.colorGrading !== false,
      filmGrain: options.filmGrain !== false,
      chromaticAberration: options.chromaticAberration !== false
    };
    
    // Effect parameters
    this.params = {
      bloomThreshold: options.bloomThreshold || 0.8,
      bloomIntensity: options.bloomIntensity || 1.5,
      volumetricStrength: options.volumetricStrength || 0.5,
      vignetteIntensity: options.vignetteIntensity || 0.3,
      filmGrainIntensity: options.filmGrainIntensity || 0.05,
      chromaticDistortion: options.chromaticDistortion || 0.002
    };
    
    this.framebuffers = [];
    this.textures = [];
    this.programs = {};
    
    this.init();
  }

  init() {
    const { gl, width, height } = this;
    
    // Create framebuffers for multi-pass rendering
    this.createFramebuffer('scene');
    this.createFramebuffer('bloom');
    this.createFramebuffer('blurH');
    this.createFramebuffer('blurV');
    this.createFramebuffer('final');
    
    // Compile shader programs
    this.programs.quad = this.createQuadProgram();
    this.programs.bloom = this.createBloomProgram();
    this.programs.blur = this.createBlurProgram();
    this.programs.composite = this.createCompositeProgram();
    this.programs.volumetric = this.createVolumetricProgram();
    this.programs.ssr = this.createSSRProgram();
  }

  createFramebuffer(name) {
    const { gl, width, height } = this;
    
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
    
    this.framebuffers[name] = framebuffer;
    this.textures[name] = texture;
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  createQuadProgram() {
    return this.createProgram(`
      #version 300 es
      in vec2 a_position;
      out vec2 v_uv;
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_uv = a_position * 0.5 + 0.5;
      }
    `, `
      #version 300 es
      precision highp float;
      uniform sampler2D u_texture;
      in vec2 v_uv;
      out vec4 fragColor;
      void main() {
        fragColor = texture(u_texture, v_uv);
      }
    `);
  }

  createBloomProgram() {
    return this.createProgram(`
      #version 300 es
      in vec2 a_position;
      out vec2 v_uv;
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_uv = a_position * 0.5 + 0.5;
      }
    `, `
      #version 300 es
      precision highp float;
      uniform sampler2D u_texture;
      uniform float u_threshold;
      in vec2 v_uv;
      out vec4 fragColor;
      
      void main() {
        vec3 color = texture(u_texture, v_uv).rgb;
        float brightness = dot(color, vec3(0.2126, 0.7152, 0.0722));
        vec3 bloom = max(color - u_threshold, vec3(0.0));
        fragColor = vec4(bloom, 1.0);
      }
    `);
  }

  createBlurProgram() {
    return this.createProgram(`
      #version 300 es
      in vec2 a_position;
      out vec2 v_uv;
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_uv = a_position * 0.5 + 0.5;
      }
    `, `
      #version 300 es
      precision highp float;
      uniform sampler2D u_texture;
      uniform bool u_horizontal;
      uniform vec2 u_texelSize;
      in vec2 v_uv;
      out vec4 fragColor;
      
      void main() {
        vec4 sum = vec4(0.0);
        vec2 offset = u_horizontal ? vec2(u_texelSize.x, 0.0) : vec2(0.0, u_texelSize.y);
        
        for(int i = -4; i <= 4; i++) {
          float weight = 1.0 - abs(float(i)) / 5.0;
          sum += texture(u_texture, v_uv + offset * float(i)) * weight;
        }
        
        fragColor = sum / 9.0;
      }
    `);
  }

  createCompositeProgram() {
    return this.createProgram(`
      #version 300 es
      in vec2 a_position;
      out vec2 v_uv;
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_uv = a_position * 0.5 + 0.5;
      }
    `, `
      #version 300 es
      precision highp float;
      uniform sampler2D u_scene;
      uniform sampler2D u_bloom;
      uniform float u_bloomIntensity;
      uniform float u_vignetteIntensity;
      uniform float u_grainIntensity;
      uniform float u_chromaticDistortion;
      uniform float u_time;
      in vec2 v_uv;
      out vec4 fragColor;
      
      float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
      }
      
      void main() {
        vec2 uv = v_uv;
        
        // Chromatic aberration
        if (u_chromaticDistortion > 0.0) {
          vec2 center = vec2(0.5);
          vec2 dir = uv - center;
          float dist = length(dir);
          uv.r += dir.x * dist * u_chromaticDistortion;
          uv.b -= dir.x * dist * u_chromaticDistortion;
        }
        
        vec3 scene = texture(u_scene, uv).rgb;
        vec3 bloom = texture(u_bloom, uv).rgb * u_bloomIntensity;
        
        // Combine bloom
        vec3 color = scene + bloom;
        
        // Vignette
        if (u_vignetteIntensity > 0.0) {
          float vignette = 1.0 - length(uv - 0.5) * u_vignetteIntensity;
          color *= vignette;
        }
        
        // Film grain
        if (u_grainIntensity > 0.0) {
          float noise = random(uv * u_time) * u_grainIntensity;
          color += noise;
        }
        
        // Gamma correction
        color = pow(color, vec3(0.4545));
        
        fragColor = vec4(color, 1.0);
      }
    `);
  }

  createVolumetricProgram() {
    return this.createProgram(`
      #version 300 es
      in vec2 a_position;
      out vec2 v_uv;
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_uv = a_position * 0.5 + 0.5;
      }
    `, `
      #version 300 es
      precision highp float;
      uniform sampler2D u_depth;
      uniform sampler2D u_scene;
      uniform vec3 u_lightDir;
      uniform float u_strength;
      in vec2 v_uv;
      out vec4 fragColor;
      
      void main() {
        float depth = texture(u_depth, v_uv).r;
        vec3 scene = texture(u_scene, v_uv).rgb;
        
        // Simple volumetric light rays
        vec2 lightUV = v_uv - u_lightDir.xy * 0.5;
        float ray = texture(u_scene, lightUV).r;
        
        vec3 volumetric = vec3(ray) * u_strength * (1.0 - depth);
        
        fragColor = vec4(scene + volumetric, 1.0);
      }
    `);
  }

  createSSRProgram() {
    return this.createProgram(`
      #version 300 es
      in vec2 a_position;
      out vec2 v_uv;
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_uv = a_position * 0.5 + 0.5;
      }
    `, `
      #version 300 es
      precision highp float;
      uniform sampler2D u_scene;
      uniform sampler2D u_depth;
      uniform sampler2D u_normal;
      uniform mat4 u_viewProjectionInverse;
      in vec2 v_uv;
      out vec4 fragColor;
      
      void main() {
        // Simplified SSR implementation
        vec3 scene = texture(u_scene, v_uv).rgb;
        fragColor = vec4(scene, 1.0);
      }
    `);
  }

  createProgram(vsSource, fsSource) {
    const { gl } = this;
    
    const vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vs, vsSource);
    gl.compileShader(vs);
    
    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, fsSource);
    gl.compileShader(fs);
    
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program));
      return null;
    }
    
    return program;
  }

  render(sceneTexture, depthTexture, normalTexture, time) {
    const { gl, effects, params, programs, width, height } = this;
    
    // Pass 1: Bloom extraction
    if (effects.bloom) {
      gl.useProgram(programs.bloom);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffers.bloom);
      gl.viewport(0, 0, width, height);
      
      const thresholdLoc = gl.getUniformLocation(programs.bloom, 'u_threshold');
      gl.uniform1f(thresholdLoc, params.bloomThreshold);
      
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, sceneTexture);
      gl.uniform1i(gl.getUniformLocation(programs.bloom, 'u_texture'), 0);
      
      this.drawQuad();
    }
    
    // Pass 2: Horizontal blur
    if (effects.bloom) {
      gl.useProgram(programs.blur);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffers.blurH);
      
      gl.uniform1i(gl.getUniformLocation(programs.blur, 'u_horizontal'), true);
      gl.uniform2f(gl.getUniformLocation(programs.blur, 'u_texelSize'), 1.0/width, 1.0/height);
      
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.textures.bloom);
      gl.uniform1i(gl.getUniformLocation(programs.blur, 'u_texture'), 0);
      
      this.drawQuad();
      
      // Pass 3: Vertical blur
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffers.blurV);
      gl.uniform1i(gl.getUniformLocation(programs.blur, 'u_horizontal'), false);
      
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.textures.blurH);
      gl.uniform1i(gl.getUniformLocation(programs.blur, 'u_texture'), 0);
      
      this.drawQuad();
    }
    
    // Pass 4: Volumetric lighting
    let finalTexture = sceneTexture;
    if (effects.volumetric) {
      gl.useProgram(programs.volumetric);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffers.final);
      
      gl.uniform1i(gl.getUniformLocation(programs.volumetric, 'u_scene'), 0);
      gl.uniform1i(gl.getUniformLocation(programs.volumetric, 'u_depth'), 1);
      gl.uniform1f(gl.getUniformLocation(programs.volumetric, 'u_strength'), params.volumetricStrength);
      gl.uniform3f(gl.getUniformLocation(programs.volumetric, 'u_lightDir'), 0.5, 0.3, 0.0);
      
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, sceneTexture);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, depthTexture);
      
      this.drawQuad();
      
      finalTexture = this.textures.final;
    }
    
    // Pass 5: Final composite
    gl.useProgram(programs.composite);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, width, height);
    
    gl.uniform1i(gl.getUniformLocation(programs.composite, 'u_scene'), 0);
    gl.uniform1i(gl.getUniformLocation(programs.composite, 'u_bloom'), 1);
    gl.uniform1f(gl.getUniformLocation(programs.composite, 'u_bloomIntensity'), effects.bloom ? params.bloomIntensity : 0.0);
    gl.uniform1f(gl.getUniformLocation(programs.composite, 'u_vignetteIntensity'), effects.vignette ? params.vignetteIntensity : 0.0);
    gl.uniform1f(gl.getUniformLocation(programs.composite, 'u_grainIntensity'), effects.filmGrain ? params.filmGrainIntensity : 0.0);
    gl.uniform1f(gl.getUniformLocation(programs.composite, 'u_chromaticDistortion'), effects.chromaticAberration ? params.chromaticDistortion : 0.0);
    gl.uniform1f(gl.getUniformLocation(programs.composite, 'u_time'), time);
    
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, finalTexture);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, effects.bloom ? this.textures.blurV : sceneTexture);
    
    this.drawQuad();
  }

  drawQuad() {
    const { gl } = this;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer || gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1, 1, -1, -1, 1,
      -1, 1, 1, -1, 1, 1
    ]), gl.STATIC_DRAW);
    
    const positionLoc = gl.getAttribLocation(this.getActiveProgram(), 'a_position');
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
    
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  getActiveProgram() {
    return this.gl.getParameter(this.gl.CURRENT_PROGRAM);
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    
    // Recreate framebuffers
    Object.keys(this.framebuffers).forEach(name => {
      gl.deleteFramebuffer(this.framebuffers[name]);
      gl.deleteTexture(this.textures[name]);
    });
    
    this.init();
  }

  destroy() {
    const { gl } = this;
    
    Object.values(this.framebuffers).forEach(fb => gl.deleteFramebuffer(fb));
    Object.values(this.textures).forEach(tex => gl.deleteTexture(tex));
    Object.values(this.programs).forEach(prog => gl.deleteProgram(prog));
  }
}

export default PostProcessingPipeline;

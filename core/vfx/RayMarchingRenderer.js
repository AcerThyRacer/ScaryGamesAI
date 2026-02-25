/**
 * Ray Marching Renderer - Phase 9: Advanced Visual Effects
 * GPU-accelerated ray marching with signed distance functions
 */

export class RayMarchingRenderer {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!this.gl) {
      throw new Error('WebGL not supported');
    }
    
    this.program = null;
    this.quadBuffer = null;
    this.uniforms = {};
    this.time = 0;
    this.resolution = { width: canvas.width, height: canvas.height };
    this.maxSteps = options.maxSteps || 128;
    this.maxDistance = options.maxDistance || 100.0;
    this.epsilon = options.epsilon || 0.001;
    this.stepSize = options.stepSize || 0.5;
    
    this.init();
  }

  init() {
    // Create quad buffer
    const vertices = new Float32Array([
      -1, -1, 0, 1,
       1, -1, 1, 1,
      -1,  1, 0, 0,
       1,  1, 1, 0
    ]);
    
    this.quadBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.quadBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);
    
    // Compile shader program
    this.program = this.createProgram(this.vertexShaderSource, this.fragmentShaderSource);
    this.gl.useProgram(this.program);
    
    // Setup attributes
    const positionLocation = this.gl.getAttribLocation(this.program, 'a_position');
    this.gl.enableVertexAttribArray(positionLocation);
    this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 4 * 4, 0);
    
    const texCoordLocation = this.gl.getAttribLocation(this.program, 'a_texCoord');
    this.gl.enableVertexAttribArray(texCoordLocation);
    this.gl.vertexAttribPointer(texCoordLocation, 2, this.gl.FLOAT, false, 4 * 4, 2 * 4);
    
    // Get uniform locations
    this.uniforms = {
      resolution: this.gl.getUniformLocation(this.program, 'u_resolution'),
      time: this.gl.getUniformLocation(this.program, 'u_time'),
      cameraPos: this.gl.getUniformLocation(this.program, 'u_cameraPos'),
      cameraDir: this.gl.getUniformLocation(this.program, 'u_cameraDir'),
      maxSteps: this.gl.getUniformLocation(this.program, 'u_maxSteps'),
      maxDistance: this.gl.getUniformLocation(this.program, 'u_maxDistance'),
      epsilon: this.gl.getUniformLocation(this.program, 'u_epsilon')
    };
    
    // Set initial uniforms
    this.gl.uniform2f(this.uniforms.resolution, this.resolution.width, this.resolution.height);
    this.gl.uniform1i(this.uniforms.maxSteps, this.maxSteps);
    this.gl.uniform1f(this.uniforms.maxDistance, this.maxDistance);
    this.gl.uniform1f(this.uniforms.epsilon, this.epsilon);
  }

  createProgram(vsSource, fsSource) {
    const vs = this.compileShader(this.gl.VERTEX_SHADER, vsSource);
    const fs = this.compileShader(this.gl.FRAGMENT_SHADER, fsSource);
    
    const program = this.gl.createProgram();
    this.gl.attachShader(program, vs);
    this.gl.attachShader(program, fs);
    this.gl.linkProgram(program);
    
    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      console.error('Failed to link program:', this.gl.getProgramInfoLog(program));
      return null;
    }
    
    return program;
  }

  compileShader(type, source) {
    const shader = this.gl.createShader(type);
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', this.gl.getShaderInfoLog(shader));
      this.gl.deleteShader(shader);
      return null;
    }
    
    return shader;
  }

  vertexShaderSource = `#version 300 es
    in vec4 a_position;
    in vec2 a_texCoord;
    out vec2 v_texCoord;
    
    void main() {
      gl_Position = a_position;
      v_texCoord = a_texCoord;
    }
  `;

  fragmentShaderSource = `#version 300 es
    precision highp float;
    
    uniform vec2 u_resolution;
    uniform float u_time;
    uniform vec3 u_cameraPos;
    uniform vec3 u_cameraDir;
    uniform int u_maxSteps;
    uniform float u_maxDistance;
    uniform float u_epsilon;
    
    in vec2 v_texCoord;
    out vec4 fragColor;
    
    // Signed Distance Functions
    float sdSphere(vec3 p, float r) {
      return length(p) - r;
    }
    
    float sdBox(vec3 p, vec3 b) {
      vec3 q = abs(p) - b;
      return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
    }
    
    float sdPlane(vec3 p) {
      return p.y;
    }
    
    float sdTorus(vec3 p, vec2 t) {
      vec2 q = vec2(length(p.xz) - t.x, p.y);
      return length(q) - t.y;
    }
    
    float sdCylinder(vec3 p, vec2 h) {
      vec2 d = abs(vec2(length(p.xz), p.y)) - h;
      return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
    }
    
    // Smooth minimum for blending
    float smin(float a, float b, float k) {
      float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
      return mix(b, a, h) - k * h * (1.0 - h);
    }
    
    // Rotation matrices
    mat2 rot(float a) {
      float s = sin(a), c = cos(a);
      return mat2(c, -s, s, c);
    }
    
    // Scene definition
    float map(vec3 p) {
      // Floor
      float floorDist = sdPlane(p) + 2.0;
      
      // Animated spheres
      vec3 p1 = p - vec3(sin(u_time) * 2.0, 0.0, -5.0);
      float sphere1 = sdSphere(p1, 0.5);
      
      vec3 p2 = p - vec3(cos(u_time * 0.7) * 2.0, 0.0, -5.0);
      float sphere2 = sdSphere(p2, 0.3);
      
      // Rotating box
      vec3 p3 = p - vec3(0.0, 0.0, -5.0);
      p3.xz *= rot(u_time * 0.5);
      float box = sdBox(p3, vec3(0.4));
      
      // Torus
      vec3 p4 = p - vec3(0.0, 1.0, -6.0);
      p4.xy *= rot(u_time * 0.3);
      float torus = sdTorus(p4, vec2(0.6, 0.15));
      
      // Combine with smooth minimum
      float objects = smin(sphere1, sphere2, 0.5);
      objects = smin(objects, box, 0.3);
      objects = smin(objects, torus, 0.4);
      
      return min(floorDist, objects);
    }
    
    // Calculate normal
    vec3 calcNormal(vec3 p) {
      vec2 e = vec2(0.001, 0.0);
      return normalize(vec3(
        map(p + e.xyy) - map(p - e.xyy),
        map(p + e.yxy) - map(p - e.yxy),
        map(p + e.yyx) - map(p - e.yyx)
      ));
    }
    
    // Ray march
    float rayMarch(vec3 ro, vec3 rd) {
      float dO = 0.0;
      
      for(int i = 0; i < u_maxSteps; i++) {
        vec3 p = ro + rd * dO;
        float dS = map(p);
        dO += dS;
        if(dO > u_maxDistance || dS < u_epsilon) break;
      }
      
      return dO;
    }
    
    // Soft shadows
    float softShadow(vec3 ro, vec3 rd, float mint, float maxt, float k) {
      float res = 1.0;
      float t = mint;
      
      for(int i = 0; i < 64 && t < maxt; i++) {
        float h = map(ro + rd * t);
        res = min(res, k * h / t);
        t += h;
      }
      
      return res;
    }
    
    // Ambient occlusion
    float ambientOcclusion(vec3 p, vec3 n) {
      float occ = 0.0;
      float sca = 1.0;
      
      for(int i = 0; i < 5; i++) {
        float hr = 0.01 + 0.12 * float(i) / 4.0;
        vec3 aop = p + n * hr;
        float d = map(aop);
        occ += (hr - d) * sca;
        sca *= 0.95;
      }
      
      return clamp(1.0 - 3.0 * occ, 0.0, 1.0);
    }
    
    void main() {
      vec2 uv = (v_texCoord - 0.5) * 2.0;
      uv.x *= u_resolution.x / u_resolution.y;
      
      // Camera setup
      vec3 ro = u_cameraPos;
      vec3 forward = normalize(u_cameraDir);
      vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), forward));
      vec3 up = cross(forward, right);
      vec3 rd = normalize(forward + uv.x * right + uv.y * up);
      
      // Ray march
      float t = rayMarch(ro, rd);
      
      // Color
      vec3 col = vec3(0.0);
      
      if(t < u_maxDistance) {
        vec3 p = ro + rd * t;
        vec3 n = calcNormal(p);
        vec3 lightPos = vec3(2.0, 4.0, -3.0);
        vec3 lightDir = normalize(lightPos - p);
        
        // Diffuse lighting
        float diff = max(dot(n, lightDir), 0.0);
        
        // Specular lighting
        vec3 viewDir = normalize(ro - p);
        vec3 reflectDir = reflect(-lightDir, n);
        float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
        
        // Soft shadows
        float shadow = softShadow(p + n * 0.02, lightDir, 0.02, 10.0, 16.0);
        
        // Ambient occlusion
        float ao = ambientOcclusion(p, n);
        
        // Material color (based on position for variety)
        vec3 mateCol = 0.5 + 0.5 * cos(u_time + p.xyx + vec3(0.0, 2.0, 4.0));
        
        // Final lighting
        col = mateCol * (diff * shadow + 0.1) + vec3(spec) * shadow;
        col *= ao;
        
        // Fog
        col = mix(col, vec3(0.1, 0.05, 0.1), 1.0 - exp(-0.02 * t));
      } else {
        // Sky color
        col = vec3(0.1, 0.05, 0.15);
      }
      
      // Gamma correction
      col = pow(col, vec3(0.4545));
      
      fragColor = vec4(col, 1.0);
    }
  `;

  setCamera(position, direction) {
    this.gl.uniform3fv(this.uniforms.cameraPos, position);
    this.gl.uniform3fv(this.uniforms.cameraDir, direction);
  }

  render(time) {
    this.time = time;
    this.gl.uniform1f(this.uniforms.time, time);
    
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
  }

  resize(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.resolution = { width, height };
    this.gl.uniform2f(this.uniforms.resolution, width, height);
    this.gl.viewport(0, 0, width, height);
  }

  destroy() {
    this.gl.deleteBuffer(this.quadBuffer);
    this.gl.deleteProgram(this.program);
  }
}

export default RayMarchingRenderer;

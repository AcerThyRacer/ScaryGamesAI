// Wall Distortion Fragment Shader
// Creates crawling vein patterns and color shifts

uniform float time;
uniform float intensity;
uniform sampler2D baseTexture;
uniform vec3 bloodColor;
uniform float bloodIntensity;

varying vec2 vUv;
varying float vDistortion;
varying vec3 vWorldPosition;

// Noise functions
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i = floor(v + dot(v, C.yy) * 2.0);
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
    m = m * m;
    m = m * m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
}

void main() {
    // Sample base texture
    vec4 baseColor = texture2D(baseTexture, vUv);
    
    // Generate crawling vein patterns
    float veinNoise1 = snoise(vUv * 15.0 + time * 0.3);
    float veinNoise2 = snoise(vUv * 30.0 - time * 0.2) * 0.5;
    float veinPattern = smoothstep(0.4, 0.6, veinNoise1 + veinNoise2);
    
    // Create dark vein color
    vec3 veinColor = vec3(0.15, 0.08, 0.05);
    
    // Mix veins with base color based on intensity
    float veinBlend = veinPattern * intensity * 0.4;
    vec3 wallColor = mix(baseColor.rgb, veinColor, veinBlend);
    
    // Add blood seepage effect at high intensity
    if (bloodIntensity > 0.1) {
        float bloodNoise = snoise(vUv * 8.0 + time * 0.1);
        float bloodPattern = smoothstep(0.6, 0.8, bloodNoise);
        wallColor = mix(wallColor, bloodColor, bloodPattern * bloodIntensity);
    }
    
    // Apply distortion-based darkening
    float distortionDarkening = abs(vDistortion) * 0.3;
    wallColor *= (1.0 - distortionDarkening);
    
    // Add subtle red tint at extreme danger
    float redTint = intensity * 0.15;
    wallColor.r += redTint;
    
    gl_FragColor = vec4(wallColor, baseColor.a);
}

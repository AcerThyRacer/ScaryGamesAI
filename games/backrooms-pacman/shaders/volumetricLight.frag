// Volumetric Light Fragment Shader
// Simulates light shafts through dusty air

uniform float time;
uniform vec3 lightColor;
uniform float lightIntensity;
uniform vec3 cameraPosition;
uniform vec3 lightPosition;
uniform float dustDensity;

varying vec2 vUv;
varying vec3 vWorldPosition;
varying vec3 vViewPosition;

// Noise for dust variation
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
    // Calculate vector from light to fragment
    vec3 lightDir = normalize(vWorldPosition - lightPosition);
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    
    // Calculate angle between light direction and view direction
    float lightViewDot = dot(lightDir, viewDir);
    
    // Create volumetric effect (visible when looking toward light)
    float volumetricTerm = max(0.0, lightViewDot - 0.8);
    volumetricTerm = pow(volumetricTerm, 3.0) * 2.0;
    
    // Add dust variation with noise
    float dustNoise = snoise(vUv * 10.0 + time * 0.1);
    dustNoise = dustNoise * 0.5 + 0.5; // Normalize to 0-1
    float dustFactor = dustNoise * dustDensity;
    
    // Calculate distance from light (attenuation)
    float distToLight = distance(vWorldPosition, lightPosition);
    float attenuation = 1.0 / (1.0 + distToLight * 0.1);
    
    // Combine all factors
    float volumetricIntensity = volumetricTerm * dustFactor * attenuation * lightIntensity;
    
    // Add light shafts (crepuscular rays)
    float shaftAngle = atan(vWorldPosition.x - lightPosition.x, vWorldPosition.z - lightPosition.z);
    float shaftNoise = snoise(vec2(shaftAngle * 5.0, time * 0.2));
    float shafts = smoothstep(0.3, 0.7, shaftNoise) * volumetricTerm * 0.5;
    
    // Final color
    vec3 volumetricColor = lightColor * (volumetricIntensity + shafts);
    
    // Add subtle color variation
    volumetricColor *= (0.9 + dustNoise * 0.2);
    
    gl_FragColor = vec4(volumetricColor, volumetricIntensity * 0.3);
}

// Shadow Map Fragment Shader
// Simple depth rendering for shadow mapping

uniform sampler2D baseTexture;
uniform float alphaTest;

varying vec2 vUv;
varying vec4 vLightSpacePos;

void main() {
    vec4 texColor = texture2D(baseTexture, vUv);
    
    // Alpha test for cutouts
    if (texColor.a < alphaTest) discard;
    
    // Output depth (handled by WebGL automatically)
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
}

// Shadow Map Vertex Shader
// For dynamic shadow casting

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat4 modelMatrix;
uniform mat4 lightSpaceMatrix;

attribute vec3 position;
attribute vec2 uv;

varying vec2 vUv;
varying vec4 vLightSpacePos;

void main() {
    vUv = uv;
    vLightSpacePos = lightSpaceMatrix * modelMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}

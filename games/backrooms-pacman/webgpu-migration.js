/**
 * PHASE 9.2: WebGPU Migration Layer
 * Progressive enhancement from Three.js r128 to WebGPU backend
 * Compute shaders for AI and particles
 * Better multi-GPU utilization
 */

const WebGPUMigration = (function() {
    'use strict';

    // Feature detection
    let adapter = null;
    let device = null;
    let context = null;
    let isSupported = false;
    let useWebGPU = false;

    // Compute pipelines
    let computePipelines = new Map();
    let bindGroups = new Map();
    let computeBuffers = new Map();

    // Configuration
    const config = {
        preferWebGPU: true,
        fallbackToWebGL: true,
        enableComputeShaders: true,
        multiGPU: false,
        debugMode: false
    };

    /**
     * Initialize WebGPU
     */
    async function init(canvas, options = {}) {
        Object.assign(config, options);

        console.log('[WebGPU] Initializing...');

        // Check WebGPU support
        if (!navigator.gpu) {
            console.log('[WebGPU] Not supported, falling back to WebGL');
            if (config.fallbackToWebGL) {
                return { success: false, fallback: 'webgl' };
            }
            throw new Error('WebGPU not supported');
        }

        try {
            // Request adapter
            adapter = await navigator.gpu.requestAdapter({
                powerPreference: config.preferWebGPU ? 'high-performance' : 'default',
                compatibleSurface: canvas
            });

            if (!adapter) {
                throw new Error('Failed to get GPU adapter');
            }

            // Get adapter info
            const adapterInfo = await adapter.requestAdapterInfo();
            console.log('[WebGPU] Adapter:', adapterInfo.device);
            console.log('[WebGPU] Vendor:', adapterInfo.vendor);
            console.log('[WebGPU] Architecture:', adapterInfo.architecture);

            // Request device
            const requiredFeatures = [];
            
            if (config.enableComputeShaders) {
                requiredFeatures.push('shader-f16');
            }

            if (config.multiGPU) {
                // Check for multiple GPUs
                const adapters = await navigator.gpu.requestAdapters();
                if (adapters.length > 1) {
                    console.log('[WebGPU] Multiple GPUs detected:', adapters.length);
                    // Would implement multi-GPU logic here
                }
            }

            device = await adapter.requestDevice({
                requiredFeatures,
                requiredLimits: {
                    maxTextureDimension2D: 4096,
                    maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize,
                    maxComputeWorkgroupStorageSize: adapter.limits.maxComputeWorkgroupStorageSize
                }
            });

            // Configure context
            context = canvas.getContext('webgpu');
            const format = navigator.gpu.getPreferredCanvasFormat();
            
            context.configure({
                device,
                format,
                alphaMode: 'premultiplied',
                usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC
            });

            isSupported = true;
            useWebGPU = config.preferWebGPU;

            console.log('[WebGPU] Initialized successfully');
            console.log('[WebGPU] Device limits:', {
                maxBufferSize: device.limits.maxBufferSize,
                maxTextureDimension1D: device.limits.maxTextureDimension1D,
                maxComputeWorkgroupSizeX: device.limits.maxComputeWorkgroupSizeX
            });

            return { 
                success: true, 
                device,
                adapter,
                context,
                format,
                isWebGPU: true
            };

        } catch (error) {
            console.error('[WebGPU] Initialization failed:', error);
            
            if (config.fallbackToWebGL) {
                console.log('[WebGPU] Falling back to WebGL');
                return { success: false, fallback: 'webgl', error };
            }
            
            throw error;
        }
    }

    /**
     * Create compute pipeline for AI calculations
     */
    function createAIComputePipeline() {
        if (!device || !config.enableComputeShaders) return null;

        const shaderCode = `
            struct AgentData {
                position: vec2<f32>,
                velocity: vec2<f32>,
                target: vec2<f32>,
                state: u32,
                padding: u32
            };

            @group(0) @binding(0) var<storage, read_write> agents: array<AgentData>;
            @group(0) @binding(1) var<uniform> params: vec4<f32>;
            @group(0) @binding(2) var<storage, read> obstacles: array<vec2<f32>>;

            @compute @workgroup_size(64)
            fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
                let index = global_id.x;
                if (index >= arrayLength(&agents)) {
                    return;
                }

                var agent = agents[index];
                
                // Simple AI behavior - seek target
                let direction = agent.target - agent.position;
                let distance = length(direction);
                
                if (distance > 0.001) {
                    let normalizedDir = normalize(direction);
                    let speed = params.x;
                    agent.velocity = normalizedDir * speed;
                    agent.position += agent.velocity * params.y;
                }

                // Collision avoidance (simplified)
                let avoidanceRadius = params.z;
                for (var i: u32 = 0u; i < min(10u, arrayLength(&obstacles)); i = i + 1u) {
                    let obstacleDist = distance(agent.position, obstacles[i]);
                    if (obstacleDist < avoidanceRadius) {
                        let pushDir = normalize(agent.position - obstacles[i]);
                        agent.velocity += pushDir * params.w;
                    }
                }

                agents[index] = agent;
            }
        `;

        return createComputePipeline('ai-agents', shaderCode);
    }

    /**
     * Create compute pipeline for particle system
     */
    function createParticleComputePipeline() {
        if (!device) return null;

        const shaderCode = `
            struct Particle {
                position: vec3<f32>,
                velocity: vec3<f32>,
                color: vec4<f32>,
                size: f32,
                life: f32,
                maxLife: f32,
                padding: u32
            };

            @group(0) @binding(0) var<storage, read_write> particles: array<Particle>;
            @group(0) @binding(1) var<uniform> time: f32;
            @group(0) @binding(2) var<uniform> gravity: vec3<f32>;
            @group(0) @binding(3) var<uniform> deltaTime: f32;

            @compute @workgroup_size(128)
            fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
                let index = global_id.x;
                if (index >= arrayLength(&particles)) {
                    return;
                }

                var particle = particles[index];
                
                if (particle.life <= 0.0) {
                    return;
                }

                // Update velocity
                particle.velocity += gravity * deltaTime;
                
                // Update position
                particle.position += particle.velocity * deltaTime;
                
                // Update life
                particle.life -= deltaTime;
                
                // Ground collision
                if (particle.position.y < 0.0) {
                    particle.position.y = 0.0;
                    particle.velocity.y *= -0.5;
                    particle.velocity.xz *= 0.8;
                }

                particles[index] = particle;
            }
        `;

        return createComputePipeline('particles', shaderCode);
    }

    /**
     * Create generic compute pipeline
     */
    function createComputePipeline(name, shaderCode) {
        if (!device) return null;

        try {
            const shaderModule = device.createShaderModule({
                code: shaderCode,
                label: `${name}-shader`
            });

            const pipeline = device.createComputePipeline({
                layout: 'auto',
                compute: {
                    module: shaderModule,
                    entryPoint: 'main'
                },
                label: `${name}-pipeline`
            });

            computePipelines.set(name, pipeline);
            console.log('[WebGPU] Created compute pipeline:', name);

            return pipeline;
        } catch (error) {
            console.error('[WebGPU] Failed to create compute pipeline:', name, error);
            return null;
        }
    }

    /**
     * Create buffer for compute operations
     */
    function createComputeBuffer(name, data, usage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST) {
        if (!device) return null;

        const byteSize = data.byteLength || data.length * 4;
        
        const buffer = device.createBuffer({
            size: byteSize,
            usage: usage | GPUBufferUsage.COPY_SRC,
            mappedAtCreation: data instanceof ArrayBuffer ? false : true,
            label: `${name}-buffer`
        });

        if (data instanceof ArrayBuffer || ArrayBuffer.isView(data)) {
            new Uint8Array(buffer.getMappedRange()).set(new Uint8Array(data.buffer || data));
            buffer.unmap();
        }

        computeBuffers.set(name, buffer);
        return buffer;
    }

    /**
     * Create bind group for compute shader
     */
    function createBindGroup(pipelineName, layout, bindings) {
        if (!device) return null;

        const pipeline = computePipelines.get(pipelineName);
        if (!pipeline) return null;

        const bindGroupLayout = pipeline.getBindGroupLayout(0);
        
        const entries = Object.entries(bindings).map(([binding, resource]) => ({
            binding: parseInt(binding),
            resource
        }));

        const bindGroup = device.createBindGroup({
            layout: bindGroupLayout,
            entries,
            label: `${pipelineName}-bindgroup`
        });

        bindGroups.set(`${pipelineName}-${Date.now()}`, bindGroup);
        return bindGroup;
    }

    /**
     * Dispatch compute shader
     */
    function dispatchCompute(pipelineName, workgroupCount, bindGroup) {
        if (!device || !computePipelines.has(pipelineName)) return;

        const commandEncoder = device.createCommandEncoder();
        const passEncoder = commandEncoder.beginComputePass();
        
        passEncoder.setPipeline(computePipelines.get(pipelineName));
        passEncoder.setBindGroup(0, bindGroup);
        passEncoder.dispatchWorkgroups(workgroupCount);
        passEncoder.end();

        device.queue.submit([commandEncoder.finish()]);
    }

    /**
     * Read data from GPU buffer
     */
    async function readBuffer(buffer, size) {
        if (!device) return null;

        const gpuBuffer = buffer;
        
        // Map buffer for reading
        await gpuBuffer.mapAsync(GPUMapMode.READ);
        
        // Copy data
        const copyArrayBuffer = gpuBuffer.getMappedRange(0, size);
        const data = copyArrayBuffer.slice(0);
        
        // Unmap
        gpuBuffer.unmap();
        
        return data;
    }

    /**
     * Check WebGPU support
     */
    function checkSupport() {
        return {
            supported: !!navigator.gpu,
            webglFallback: config.fallbackToWebGL,
            computeShaders: config.enableComputeShaders,
            multiGPU: config.multiGPU
        };
    }

    /**
     * Get device info
     */
    function getDeviceInfo() {
        if (!adapter) return null;

        return {
            isWebGPU: isSupported && useWebGPU,
            adapter: adapter,
            device: device,
            limits: device ? device.limits : null,
            features: device ? Array.from(device.features) : []
        };
    }

    /**
     * Cleanup WebGPU resources
     */
    function dispose() {
        computeBuffers.forEach(buffer => {
            buffer.destroy();
        });
        computeBuffers.clear();
        
        computePipelines.clear();
        bindGroups.clear();
        
        if (device) {
            device.destroy();
        }
        
        console.log('[WebGPU] Resources disposed');
    }

    // Public API
    return {
        init,
        createAIComputePipeline,
        createParticleComputePipeline,
        createComputePipeline,
        createComputeBuffer,
        createBindGroup,
        dispatchCompute,
        readBuffer,
        checkSupport,
        getDeviceInfo,
        dispose,
        isSupported: () => isSupported,
        isUsingWebGPU: () => useWebGPU,
        getDevice: () => device
    };
})();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WebGPUMigration;
}

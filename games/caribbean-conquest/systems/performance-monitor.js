// Caribbean Conquest - Performance Monitor System
// Phase 4: Real-time performance metrics and optimization

class PerformanceMonitor {
    constructor(game) {
        this.game = game;
        
        // Performance metrics
        this.metrics = {
            fps: 0,
            frameTime: 0,
            frameTimeHistory: [],
            memoryUsage: 0,
            cpuUsage: 0,
            drawCalls: 0,
            triangleCount: 0,
            textureCount: 0,
            shaderCompiles: 0,
            physicsTime: 0,
            aiTime: 0,
            renderTime: 0
        };
        
        // Performance thresholds
        this.thresholds = {
            fpsWarning: 45,
            fpsCritical: 30,
            memoryWarning: 1024 * 1024 * 512, // 512MB
            memoryCritical: 1024 * 1024 * 768, // 768MB
            frameTimeWarning: 16.67, // 60 FPS
            frameTimeCritical: 33.33 // 30 FPS
        };
        
        // Optimization recommendations
        this.recommendations = [];
        
        // Monitoring state
        this.isMonitoring = false;
        this.sampleInterval = 1000; // 1 second
        this.lastSampleTime = 0;
        this.frameCount = 0;
        this.frameTimes = [];
        
        // Performance overlay
        this.overlayVisible = false;
        this.overlayElement = null;
        
        // Bottleneck detection
        this.bottlenecks = {
            cpu: false,
            gpu: false,
            memory: false,
            network: false
        };
    }
    
    init() {
        console.log('Performance Monitor initialized');
        
        // Create performance overlay
        this.createOverlay();
        
        // Start monitoring
        this.startMonitoring();
        
        // Set up performance event listeners
        this.setupEventListeners();
    }
    
    createOverlay() {
        // Create overlay element
        this.overlayElement = document.createElement('div');
        this.overlayElement.id = 'performance-overlay';
        this.overlayElement.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.8);
            color: #00ff00;
            font-family: monospace;
            font-size: 12px;
            padding: 10px;
            border-radius: 5px;
            z-index: 10000;
            display: none;
            max-width: 300px;
            max-height: 400px;
            overflow-y: auto;
        `;
        
        document.body.appendChild(this.overlayElement);
    }
    
    startMonitoring() {
        this.isMonitoring = true;
        this.lastSampleTime = performance.now();
        
        // Start frame time tracking
        this.trackFrameTime();
        
        // Start memory monitoring
        this.trackMemory();
        
        console.log('Performance monitoring started');
    }
    
    stopMonitoring() {
        this.isMonitoring = false;
        console.log('Performance monitoring stopped');
    }
    
    trackFrameTime() {
        if (!this.isMonitoring) return;
        
        const now = performance.now();
        const delta = now - this.lastSampleTime;
        
        this.frameCount++;
        this.frameTimes.push(delta);
        
        // Keep last 60 frames (1 second at 60 FPS)
        if (this.frameTimes.length > 60) {
            this.frameTimes.shift();
        }
        
        this.lastSampleTime = now;
        
        // Calculate FPS every second
        if (this.frameCount >= 60) {
            this.calculateMetrics();
            this.frameCount = 0;
        }
        
        // Continue tracking
        requestAnimationFrame(() => this.trackFrameTime());
    }
    
    trackMemory() {
        if (!this.isMonitoring) return;
        
        // Browser memory API (if available)
        if (performance.memory) {
            this.metrics.memoryUsage = performance.memory.usedJSHeapSize;
        }
        
        // Estimate memory usage based on objects
        this.estimateMemoryUsage();
        
        // Check for memory leaks
        this.checkMemoryLeaks();
        
        // Continue tracking every 5 seconds
        setTimeout(() => this.trackMemory(), 5000);
    }
    
    estimateMemoryUsage() {
        let estimatedMemory = 0;
        
        // Estimate based on game objects
        if (this.game.ships) {
            estimatedMemory += this.game.ships.length * 10000; // ~10KB per ship
        }
        
        if (this.game.islands) {
            estimatedMemory += this.game.islands.length * 50000; // ~50KB per island
        }
        
        // Add Three.js object memory
        estimatedMemory += this.estimateThreeJSMemory();
        
        this.metrics.memoryUsage = estimatedMemory;
    }
    
    estimateThreeJSMemory() {
        let memory = 0;
        
        // Estimate Three.js memory usage
        if (this.game.renderer && this.game.renderer.scene) {
            // Rough estimate: 100KB per mesh + textures
            const scene = this.game.renderer.scene;
            
            scene.traverse((object) => {
                if (object.isMesh) {
                    memory += 100 * 1024; // 100KB per mesh
                    
                    if (object.material) {
                        memory += 50 * 1024; // 50KB per material
                    }
                    
                    if (object.geometry) {
                        memory += object.geometry.attributes.position.count * 12; // vertices * 12 bytes
                    }
                }
            });
        }
        
        return memory;
    }
    
    calculateMetrics() {
        // Calculate FPS
        const totalTime = this.frameTimes.reduce((a, b) => a + b, 0);
        const avgFrameTime = totalTime / this.frameTimes.length;
        
        this.metrics.frameTime = avgFrameTime;
        this.metrics.fps = 1000 / avgFrameTime;
        
        // Store frame time history
        this.metrics.frameTimeHistory.push(avgFrameTime);
        if (this.metrics.frameTimeHistory.length > 300) { // 5 seconds at 60 FPS
            this.metrics.frameTimeHistory.shift();
        }
        
        // Calculate CPU usage (estimated)
        this.calculateCPUUsage();
        
        // Detect bottlenecks
        this.detectBottlenecks();
        
        // Generate recommendations
        this.generateRecommendations();
        
        // Update overlay if visible
        if (this.overlayVisible) {
            this.updateOverlay();
        }
    }
    
    calculateCPUUsage() {
        // Estimate CPU usage based on frame time
        const targetFrameTime = 16.67; // 60 FPS
        const actualFrameTime = this.metrics.frameTime;
        
        // CPU usage is higher when frame time exceeds target
        this.metrics.cpuUsage = Math.min(100, (actualFrameTime / targetFrameTime) * 100);
    }
    
    detectBottlenecks() {
        const fps = this.metrics.fps;
        const frameTime = this.metrics.frameTime;
        const memory = this.metrics.memoryUsage;
        
        // Reset bottlenecks
        this.bottlenecks = {
            cpu: false,
            gpu: false,
            memory: false,
            network: false
        };
        
        // CPU bottleneck (high frame time with normal memory)
        if (frameTime > this.thresholds.frameTimeCritical && memory < this.thresholds.memoryWarning) {
            this.bottlenecks.cpu = true;
        }
        
        // GPU bottleneck (low FPS with high triangle count)
        if (fps < this.thresholds.fpsCritical && this.metrics.triangleCount > 1000000) {
            this.bottlenecks.gpu = true;
        }
        
        // Memory bottleneck
        if (memory > this.thresholds.memoryCritical) {
            this.bottlenecks.memory = true;
        }
        
        // Network bottleneck (for future multiplayer)
        if (this.game.network && this.game.network.latency > 200) {
            this.bottlenecks.network = true;
        }
    }
    
    generateRecommendations() {
        this.recommendations = [];
        
        if (this.bottlenecks.cpu) {
            this.recommendations.push({
                priority: 'high',
                category: 'cpu',
                message: 'CPU bottleneck detected. Consider reducing AI complexity or enabling multithreading.',
                action: 'enable_job_system'
            });
        }
        
        if (this.bottlenecks.gpu) {
            this.recommendations.push({
                priority: 'high',
                category: 'gpu',
                message: 'GPU bottleneck detected. Reduce render quality or enable LOD optimization.',
                action: 'reduce_quality'
            });
        }
        
        if (this.bottlenecks.memory) {
            this.recommendations.push({
                priority: 'critical',
                category: 'memory',
                message: 'High memory usage detected. Enable object pooling and asset streaming.',
                action: 'enable_memory_management'
            });
        }
        
        if (this.metrics.fps < this.thresholds.fpsWarning) {
            this.recommendations.push({
                priority: 'medium',
                category: 'performance',
                message: `Low FPS (${Math.round(this.metrics.fps)}). Consider performance optimizations.`,
                action: 'show_performance_tips'
            });
        }
        
        // Sort by priority
        this.recommendations.sort((a, b) => {
            const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        });
    }
    
    checkMemoryLeaks() {
        // Check for increasing memory usage pattern
        if (this.metrics.frameTimeHistory.length < 60) return;
        
        const recentFrames = this.metrics.frameTimeHistory.slice(-60);
        const earlyAverage = recentFrames.slice(0, 30).reduce((a, b) => a + b, 0) / 30;
        const lateAverage = recentFrames.slice(30).reduce((a, b) => a + b, 0) / 30;
        
        // If frame time increases by more than 20%, potential memory leak
        if (lateAverage > earlyAverage * 1.2) {
            console.warn('Potential memory leak detected: frame time increasing over time');
            
            this.recommendations.push({
                priority: 'critical',
                category: 'memory',
                message: 'Potential memory leak detected. Check object lifecycle management.',
                action: 'run_memory_leak_check'
            });
        }
    }
    
    updateOverlay() {
        if (!this.overlayElement) return;
        
        const fpsColor = this.metrics.fps >= 60 ? '#00ff00' : 
                        this.metrics.fps >= 30 ? '#ffff00' : '#ff0000';
        
        const memoryMB = (this.metrics.memoryUsage / (1024 * 1024)).toFixed(1);
        const memoryColor = memoryMB < 512 ? '#00ff00' : 
                           memoryMB < 768 ? '#ffff00' : '#ff0000';
        
        let html = `<div style="margin-bottom: 5px; border-bottom: 1px solid #333; padding-bottom: 5px;">
                       <strong>Performance Monitor</strong>
                   </div>`;
        
        html += `<div style="margin-bottom: 10px;">
                    <span style="color: ${fpsColor};">FPS: ${Math.round(this.metrics.fps)}</span> | 
                    Frame: ${this.metrics.frameTime.toFixed(2)}ms | 
                    CPU: ${this.metrics.cpuUsage.toFixed(1)}%
                 </div>`;
        
        html += `<div style="margin-bottom: 10px;">
                    <span style="color: ${memoryColor};">Memory: ${memoryMB} MB</span> | 
                    Draw Calls: ${this.metrics.drawCalls} | 
                    Triangles: ${this.metrics.triangleCount.toLocaleString()}
                 </div>`;
        
        // Bottlenecks
        const bottlenecks = [];
        if (this.bottlenecks.cpu) bottlenecks.push('CPU');
        if (this.bottlenecks.gpu) bottlenecks.push('GPU');
        if (this.bottlenecks.memory) bottlenecks.push('Memory');
        if (this.bottlenecks.network) bottlenecks.push('Network');
        
        if (bottlenecks.length > 0) {
            html += `<div style="color: #ff9900; margin-bottom: 10px;">
                        Bottlenecks: ${bottlenecks.join(', ')}
                     </div>`;
        }
        
        // Recommendations
        if (this.recommendations.length > 0) {
            html += `<div style="margin-top: 10px; border-top: 1px solid #333; padding-top: 5px;">
                        <strong>Recommendations:</strong>
                     </div>`;
            
            this.recommendations.slice(0, 3).forEach(rec => {
                const priorityColor = rec.priority === 'critical' ? '#ff0000' : 
                                     rec.priority === 'high' ? '#ff9900' : '#ffff00';
                
                html += `<div style="color: ${priorityColor}; font-size: 11px; margin: 2px 0;">
                            ${rec.message}
                         </div>`;
            });
        }
        
        this.overlayElement.innerHTML = html;
    }
    
    toggleOverlay() {
        this.overlayVisible = !this.overlayVisible;
        
        if (this.overlayElement) {
            this.overlayElement.style.display = this.overlayVisible ? 'block' : 'none';
            
            if (this.overlayVisible) {
                this.updateOverlay();
            }
        }
        
        return this.overlayVisible;
    }
    
    setupEventListeners() {
        // Listen for performance-related events
        document.addEventListener('keydown', (event) => {
            // Ctrl+Shift+P to toggle performance overlay
            if (event.ctrlKey && event.shiftKey && event.key === 'P') {
                event.preventDefault();
                this.toggleOverlay();
            }
            
            // Ctrl+Shift+M to dump performance metrics
            if (event.ctrlKey && event.shiftKey && event.key === 'M') {
                event.preventDefault();
                this.dumpMetrics();
            }
        });
    }
    
    dumpMetrics() {
        console.group('Performance Metrics');
        console.log(`FPS: ${Math.round(this.metrics.fps)}`);
        console.log(`Frame Time: ${this.metrics.frameTime.toFixed(2)}ms`);
        console.log(`CPU Usage: ${this.metrics.cpuUsage.toFixed(1)}%`);
        console.log(`Memory: ${(this.metrics.memoryUsage / (1024 * 1024)).toFixed(1)} MB`);
        console.log(`Draw Calls: ${this.metrics.drawCalls}`);
        console.log(`Triangles: ${this.metrics.triangleCount.toLocaleString()}`);
        
        console.group('Bottlenecks:');
        Object.entries(this.bottlenecks).forEach(([key, value]) => {
            if (value) console.log(`${key}: YES`);
        });
        console.groupEnd();
        
        console.group('Recommendations:');
        this.recommendations.forEach(rec => {
            console.log(`[${rec.priority.toUpperCase()}] ${rec.message}`);
        });
        console.groupEnd();
        
        console.groupEnd();
    }
    
    update(dt) {
        // Update performance metrics
        if (this.isMonitoring) {
            // Update Three.js metrics if available
            if (this.game.renderer && this.game.renderer.renderer) {
                const renderer = this.game.renderer.renderer;
                this.metrics.drawCalls = renderer.info.render.calls;
                this.metrics.triangleCount = renderer.info.render.triangles;
                this.metrics.textureCount = renderer.info.memory.textures;
            }
            
            // Update physics time
            if (this.game.physics) {
                this.metrics.physicsTime = this.game.physics.lastUpdateTime || 0;
            }
            
            // Update AI time
            if (this.game.ai) {
                this.metrics.aiTime = this.game.ai.lastUpdateTime || 0;
            }
        }
    }
    
    getPerformanceReport() {
        return {
            timestamp: Date.now(),
            metrics: { ...this.metrics },
            bottlenecks: { ...this.bottlenecks },
            recommendations: [...this.recommendations],
            hardwareInfo: this.getHardwareInfo()
        };
    }
    
    getHardwareInfo() {
        return {
            userAgent: navigator.userAgent,
            hardwareConcurrency: navigator.hardwareConcurrency || 'unknown',
            deviceMemory: navigator.deviceMemory || 'unknown',
            screenResolution: `${window.screen.width}x${window.screen.height}`,
            gpu: this.getGPUInfo()
        };
    }
    
    getGPUInfo() {
        // Try to get GPU info from WebGL
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            
            if (gl) {
                const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                if (debugInfo) {
                    return {
                        vendor: gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
                        renderer: gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
                    };
                }
            }
        } catch (e) {
            // GPU info not available
        }
        
        return { vendor: 'unknown', renderer: 'unknown' };
    }
    
    applyOptimization(action) {
        switch (action) {
            case 'reduce_quality':
                this.reduceRenderQuality();
                break;
            case 'enable_memory_management':
                this.enableMemoryManagement();
                break;
            case 'enable_job_system':
                this.enableJobSystem();
                break;
            default:
                console.warn(`Unknown optimization action: ${action}`);
        }
    }
    
    reduceRenderQuality() {
        // Reduce render quality settings
        if (this.game.renderer) {
            this.game.renderer.setQuality('medium');
            console.log('Render quality reduced to medium');
        }
    }
    
    enableMemoryManagement() {
        // Enable memory management systems
        if (this.game.memoryManager) {
            this.game.memoryManager.enable();
            console.log('Memory management enabled');
        }
    }
    
    enableJobSystem() {
        // Enable job system for parallel processing
        if (this.game.jobSystem) {
            this.game.jobSystem.enable();
            console.log('Job system enabled');
        }
    }
}

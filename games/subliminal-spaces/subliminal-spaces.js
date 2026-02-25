/**
 * SUBLIMINAL SPACES - Procedural Liminal Horror
 * Phase 31 Implementation - 2026 Ultimate Roadmap
 * 
 * A psychological horror exploration game featuring:
 * - Infinite procedural liminal architecture
 * - Ray-marched lighting and shadows
 * - Pareidolia engine (faces in patterns)
 * - Reality distortion systems
 * - Psychological effects based on player state
 */

import { WebGPURenderer2026 } from '../../core/renderer/WebGPURenderer2026.js';
import { WaveFunctionCollapse } from '../../core/procedural/WaveFunctionCollapse.js';
import { RayMarchingRenderer } from '../../core/vfx/RayMarchingRenderer.js';

// Game state
const gameState = {
    isPlaying: false,
    sanity: 100,
    maxSanity: 100,
    position: { x: 0, y: 1.6, z: 0 },
    rotation: { x: 0, y: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    onGround: false,
    chunks: new Map(),
    chunkSize: 32,
    renderDistance: 3,
    time: 0,
    pareidoliaInstances: []
};

// Input state
const input = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    sprint: false,
    interact: false,
    mouseX: 0,
    mouseY: 0,
    isPointerLocked: false
};

// Canvas and context
const canvas = document.getElementById('canvas');
let gl = null;
let renderer = null;
let raymarcher = null;
let wfc = null;

// Initialize WebGL/WebGPU context
async function initContext() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // Try WebGPU first
    if (navigator.gpu) {
        const adapter = await navigator.gpu.requestAdapter();
        const device = await adapter.requestDevice();
        gl = device;
        console.log('✓ WebGPU initialized');
        return true;
    }
    
    // Fallback to WebGL
    gl = canvas.getContext('webgl2', { 
        antialias: true,
        alpha: false
    });
    
    if (!gl) {
        gl = canvas.getContext('webgl', { alpha: false });
    }
    
    console.log('✓ WebGL initialized (fallback)');
    return false;
}

// Initialize WFC for procedural architecture
function initWFC() {
    wfc = new WaveFunctionCollapse({
        gridSize: 16,
        cellSize: 4,
        enableSymmetry: true,
        useDeterministicSeeding: true
    });
    
    // Define liminal space tileset rules
    const tileRules = {
        'empty': { weight: 0.3, neighbors: ['empty', 'hallway', 'room', 'stairs'] },
        'hallway': { weight: 0.4, neighbors: ['empty', 'hallway', 'room', 'intersection', 'stairs'] },
        'room': { weight: 0.2, neighbors: ['hallway', 'room'] },
        'intersection': { weight: 0.15, neighbors: ['hallway', 'intersection'] },
        'stairs': { weight: 0.1, neighbors: ['hallway', 'stairs_up', 'stairs_down'] },
        'stairs_up': { weight: 0.05, neighbors: ['stairs'] },
        'stairs_down': { weight: 0.05, neighbors: ['stairs'] },
        'liminal_pool': { weight: 0.02, neighbors: ['room'] },
        'face_room': { weight: 0.01, neighbors: ['hallway'] }
    };
    
    wfc.setRules(tileRules);
}

// Generate chunk at coordinates
function generateChunk(chunkX, chunkZ) {
    const chunkKey = `${chunkX},${chunkZ}`;
    
    if (gameState.chunks.has(chunkKey)) {
        return gameState.chunks.get(chunkKey);
    }
    
    // Use WFC to generate architecture
    const seed = chunkX * 73856093 ^ chunkZ * 19349663;
    const grid = wfc.generate(16, 16, seed);
    
    const chunk = {
        x: chunkX,
        z: chunkZ,
        grid: grid,
        meshes: [],
        colliders: []
    };
    
    // Convert grid to 3D geometry
    for (let x = 0; x < grid.length; x++) {
        for (let z = 0; z < grid[0].length; z++) {
            const cellType = grid[x][z];
            const worldX = (chunkX * 16 + x) * 4;
            const worldZ = (chunkZ * 16 + z) * 4;
            
            // Create architecture based on cell type
            createArchitectureCell(cellType, worldX, worldZ, chunk);
            
            // Add pareidolia elements in specific rooms
            if (cellType === 'face_room' || Math.random() < 0.02) {
                createPareidoliaInstance(worldX, worldZ, chunk);
            }
        }
    }
    
    gameState.chunks.set(chunkKey, chunk);
    return chunk;
}

// Create architecture cell (walls, floors, ceilings)
function createArchitectureCell(type, x, z, chunk) {
    const wallHeight = 3.5;
    const wallThickness = 0.2;
    
    switch(type) {
        case 'hallway':
        case 'room':
        case 'intersection':
            // Floor
            chunk.meshes.push(createBox(x, 0, z, 4, 0.1, 4, 'floor'));
            // Ceiling
            chunk.meshes.push(createBox(x, wallHeight, z, 4, 0.1, 4, 'ceiling'));
            break;
    }
    
    // Walls are created based on adjacent cells
    // Simplified for this implementation
}

// Create box mesh
function createBox(x, y, z, w, h, d, type) {
    return {
        type: 'box',
        x, y, z,
        width: w,
        height: h,
        depth: d,
        material: type
    };
}

// Create pareidolia instance (faces in architecture)
function createPareidoliaInstance(x, z, chunk) {
    const pareidolia = {
        x: x + Math.random() * 4,
        y: 1.5 + Math.random() * 2,
        z: z + Math.random() * 4,
        rotation: Math.random() * Math.PI * 2,
        scale: 0.5 + Math.random() * 0.5,
        type: Math.random() > 0.5 ? 'eyes' : 'mouth',
        pulsePhase: Math.random() * Math.PI * 2,
        intensity: 0.3 + Math.random() * 0.7
    };
    
    chunk.pareidolia = chunk.pareidolia || [];
    chunk.pareidolia.push(pareidolia);
    gameState.pareidoliaInstances.push(pareidolia);
}

// Update chunks around player
function updateChunks() {
    const playerChunkX = Math.floor(gameState.position.x / 64);
    const playerChunkZ = Math.floor(gameState.position.z / 64);
    
    // Load chunks in render distance
    for (let dx = -gameState.renderDistance; dx <= gameState.renderDistance; dx++) {
        for (let dz = -gameState.renderDistance; dz <= gameState.renderDistance; dz++) {
            const chunkX = playerChunkX + dx;
            const chunkZ = playerChunkZ + dz;
            generateChunk(chunkX, chunkZ);
        }
    }
    
    // Unload far chunks
    const chunksToRemove = [];
    for (const [key, chunk] of gameState.chunks) {
        const dx = Math.abs(chunk.x - playerChunkX);
        const dz = Math.abs(chunk.z - playerChunkZ);
        if (dx > gameState.renderDistance + 2 || dz > gameState.renderDistance + 2) {
            chunksToRemove.push(key);
        }
    }
    
    for (const key of chunksToRemove) {
        gameState.chunks.delete(key);
    }
}

// Handle keyboard input
function setupInputHandlers() {
    document.addEventListener('keydown', (e) => {
        switch(e.code) {
            case 'KeyW':
            case 'ArrowUp':
                input.forward = true;
                break;
            case 'KeyS':
            case 'ArrowDown':
                input.backward = true;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                input.left = true;
                break;
            case 'KeyD':
            case 'ArrowRight':
                input.right = true;
                break;
            case 'ShiftLeft':
            case 'ShiftRight':
                input.sprint = true;
                break;
            case 'KeyE':
                input.interact = true;
                break;
        }
    });
    
    document.addEventListener('keyup', (e) => {
        switch(e.code) {
            case 'KeyW':
            case 'ArrowUp':
                input.forward = false;
                break;
            case 'KeyS':
            case 'ArrowDown':
                input.backward = false;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                input.left = false;
                break;
            case 'KeyD':
            case 'ArrowRight':
                input.right = false;
                break;
            case 'ShiftLeft':
            case 'ShiftRight':
                input.sprint = false;
                break;
            case 'KeyE':
                input.interact = false;
                break;
        }
    });
    
    // Mouse look
    canvas.addEventListener('click', () => {
        if (gameState.isPlaying && !input.isPointerLocked) {
            canvas.requestPointerLock();
        }
    });
    
    document.addEventListener('pointerlockchange', () => {
        input.isPointerLocked = document.pointerLockElement === canvas;
    });
    
    document.addEventListener('mousemove', (e) => {
        if (input.isPointerLocked) {
            input.mouseX += e.movementX * 0.002;
            input.mouseY += e.movementY * 0.002;
            input.mouseY = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, input.mouseY));
        }
    });
}

// Update player movement
function updatePlayer(deltaTime) {
    if (!gameState.isPlaying) return;
    
    const speed = input.sprint ? 8.0 : 4.0;
    const acceleration = 50.0;
    const friction = 10.0;
    
    // Calculate movement direction
    let moveX = 0;
    let moveZ = 0;
    
    if (input.forward) moveZ -= 1;
    if (input.backward) moveZ += 1;
    if (input.left) moveX -= 1;
    if (input.right) moveX += 1;
    
    // Normalize diagonal movement
    const length = Math.sqrt(moveX * moveX + moveZ * moveZ);
    if (length > 0) {
        moveX /= length;
        moveZ /= length;
    }
    
    // Rotate movement by camera rotation
    const cos = Math.cos(input.mouseX);
    const sin = Math.sin(input.mouseX);
    const rotatedX = moveX * cos - moveZ * sin;
    const rotatedZ = moveX * sin + moveZ * cos;
    
    // Apply acceleration
    gameState.velocity.x += rotatedX * acceleration * deltaTime;
    gameState.velocity.z += rotatedZ * acceleration * deltaTime;
    
    // Apply friction
    gameState.velocity.x -= gameState.velocity.x * friction * deltaTime;
    gameState.velocity.z -= gameState.velocity.z * friction * deltaTime;
    
    // Update position
    gameState.position.x += gameState.velocity.x * deltaTime;
    gameState.position.z += gameState.velocity.z * deltaTime;
    
    // Simple collision detection with floor
    gameState.position.y = 1.6; // Eye level
    gameState.onGround = true;
    
    // Update rotation
    gameState.rotation.x = input.mouseY;
    gameState.rotation.y = input.mouseX;
    
    // Sanity drain based on proximity to pareidolia
    updateSanity(deltaTime);
}

// Update sanity/psychological state
function updateSanity(deltaTime) {
    let sanityDrain = 0;
    
    // Drain sanity near pareidolia instances
    for (const p of gameState.pareidoliaInstances) {
        const dx = gameState.position.x - p.x;
        const dy = gameState.position.y - p.y;
        const dz = gameState.position.z - p.z;
        const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
        
        if (dist < 5) {
            sanityDrain += (5 - dist) * 2 * p.intensity;
        }
    }
    
    // Natural sanity regeneration
    const sanityRegen = 1.0;
    
    gameState.sanity += (sanityRegen - sanityDrain) * deltaTime;
    gameState.sanity = Math.max(0, Math.min(gameState.maxSanity, gameState.sanity));
    
    // Update UI
    const sanityFill = document.getElementById('sanity-fill');
    sanityFill.style.width = `${gameState.sanity}%`;
    
    // Apply hallucination effects based on sanity
    applyHallucinationEffects();
}

// Apply visual hallucination effects
function applyHallucinationEffects() {
    const sanityRatio = gameState.sanity / gameState.maxSanity;
    
    // At low sanity, apply more distortions
    if (sanityRatio < 0.7) {
        // Subtle screen distortion
        canvas.style.filter = `hue-rotate(${(1 - sanityRatio) * 20}deg) contrast(${1 + (1 - sanityRatio) * 0.2})`;
    } else {
        canvas.style.filter = 'none';
    }
    
    // Random flickers at very low sanity
    if (sanityRatio < 0.3 && Math.random() < 0.05) {
        canvas.style.opacity = '0.8';
        setTimeout(() => {
            canvas.style.opacity = '1';
        }, 50);
    }
}

// Render scene
function render(time) {
    const deltaTime = Math.min(time / 1000, 0.1);
    gameState.time = time / 1000;
    
    // Clear canvas
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.05, 0.05, 0.08, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    // Update chunks
    updateChunks();
    
    // Render architecture with ray marching
    if (raymarcher) {
        raymarcher.setCamera(
            [gameState.position.x, gameState.position.y, gameState.position.z],
            [
                Math.sin(gameState.rotation.y) * Math.cos(gameState.rotation.x),
                Math.sin(gameState.rotation.x),
                Math.cos(gameState.rotation.y) * Math.cos(gameState.rotation.x)
            ]
        );
        raymarcher.render(time);
    }
    
    // Render pareidolia faces
    renderPareidolia(gl, time);
}

// Render pareidolia instances
function renderPareidolia(gl, time) {
    // Simplified rendering - in full implementation would use shaders
    for (const p of gameState.pareidoliaInstances) {
        const pulse = Math.sin(time * 2 + p.pulsePhase) * 0.3 + 0.7;
        const intensity = p.intensity * pulse * (gameState.sanity / gameState.maxSanity);
        
        // Draw subtle glow at pareidolia location
        // Full implementation would use proper 3D rendering
    }
}

// Main game loop
function gameLoop(time) {
    updatePlayer(0.016);
    render(time);
    requestAnimationFrame(gameLoop);
}

// Start game
async function startGame() {
    const titleScreen = document.getElementById('title-screen');
    titleScreen.classList.add('hidden');
    
    gameState.isPlaying = true;
    
    // Initialize pointer lock
    canvas.requestPointerLock();
    
    // Generate initial chunks
    generateChunk(0, 0);
    generateChunk(1, 0);
    generateChunk(-1, 0);
    generateChunk(0, 1);
    generateChunk(0, -1);
    
    console.log('✓ Game started - Welcome to the Backstage');
}

// Initialize everything
async function init() {
    console.log('Subliminal Spaces - Initializing...');
    
    // Setup context
    const hasWebGPU = await initContext();
    
    // Setup input
    setupInputHandlers();
    
    // Initialize WFC
    initWFC();
    
    // Initialize ray marcher if WebGPU available
    if (hasWebGPU) {
        try {
            raymarcher = new RayMarchingRenderer(canvas, {
                maxSteps: 128,
                maxDistance: 100.0,
                epsilon: 0.001
            });
            console.log('✓ Ray marching initialized');
        } catch (e) {
            console.log('⚠ Ray marching not available, using fallback rendering');
        }
    }
    
    // Start button handler
    document.getElementById('start-button').addEventListener('click', startGame);
    
    // Handle window resize
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });
    
    console.log('✓ Initialization complete');
    console.log('✓ Starting game loop...');
    
    // Start game loop
    requestAnimationFrame(gameLoop);
}

// Start initialization
init();

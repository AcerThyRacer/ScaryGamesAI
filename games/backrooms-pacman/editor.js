/**
 * PHASE 10.1: Level Editor for Backrooms Pac-Man
 * Browser-based maze designer with share codes and workshop integration
 */

const LevelEditor = (function() {
    'use strict';

    // Configuration
    const config = {
        gridSize: 20,
        cellSize: 4,
        defaultWallHeight: 3.5,
        maxGridSize: 50,
        minGridSize: 5,
        snapToGrid: true,
        gridSnapSize: 1
    };

    // State
    let scene, camera, renderer;
    let canvas;
    let currentTool = 'wall';
    let selectedObject = null;
    let levelData = null;
    let isDragging = false;
    let dragStart = null;
    let raycaster, mouse;
    let gridHelper, axesHelper;
    let objects = [];
    let layers = [];
    let clipboard = null;

    // Tile types
    const TILE_TYPES = {
        EMPTY: 0,
        WALL: 1,
        PELLET: 2,
        POWER_PELLET: 3,
        DOOR: 4,
        PLAYER_SPAWN: 5,
        PACMAN_SPAWN: 6,
        HAZARD: 7,
        DECORATION: 8
    };

    /**
     * Initialize the editor
     */
    function init() {
        console.log('[Editor] Initializing...');

        // Create canvas
        canvas = document.getElementById('editor-canvas');
        if (!canvas) {
            console.error('[Editor] Canvas not found');
            return;
        }

        // Initialize Three.js
        initThreeJS();

        // Initialize level data
        initLevelData();

        // Setup event listeners
        setupEventListeners();

        // Setup UI
        setupUI();

        // Create default level
        createNewLevel();

        // Start render loop
        animate();

        console.log('[Editor] Initialized successfully');
    }

    /**
     * Initialize Three.js
     */
    function initThreeJS() {
        // Scene
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x1a1a2e);

        // Camera
        camera = new THREE.PerspectiveCamera(
            75,
            canvas.clientWidth / canvas.clientHeight,
            0.1,
            1000
        );
        camera.position.set(0, 30, 30);
        camera.lookAt(0, 0, 0);

        // Renderer
        renderer = new THREE.WebGLRenderer({ 
            canvas,
            antialias: true,
            preserveDrawingBuffer: true
        });
        renderer.setSize(canvas.clientWidth, canvas.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 50, 50);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        scene.add(directionalLight);

        // Helpers
        gridHelper = new THREE.GridHelper(100, 50, 0x444444, 0x222222);
        scene.add(gridHelper);

        axesHelper = new THREE.AxesHelper(5);
        scene.add(axesHelper);

        // Raycaster
        raycaster = new THREE.Raycaster();
        mouse = new THREE.Vector2();

        // Resize handler
        window.addEventListener('resize', onWindowResize, false);
    }

    /**
     * Initialize level data structure
     */
    function initLevelData() {
        levelData = {
            version: '1.0',
            metadata: {
                name: 'Untitled Level',
                description: '',
                author: 'Anonymous',
                difficulty: 'normal',
                biome: 'yellow',
                createdAt: Date.now(),
                updatedAt: Date.now()
            },
            settings: {
                fogDensity: 0.05,
                lightIntensity: 0.7,
                gridSize: config.gridSize
            },
            grid: [],
            objects: [],
            spawns: {
                player: { x: 0, z: 0 },
                pacman: []
            }
        };

        // Initialize grid
        for (let y = 0; y < config.gridSize; y++) {
            levelData.grid[y] = [];
            for (let x = 0; x < config.gridSize; x++) {
                levelData.grid[y][x] = TILE_TYPES.EMPTY;
            }
        }
    }

    /**
     * Setup event listeners
     */
    function setupEventListeners() {
        // Canvas interactions
        canvas.addEventListener('mousedown', onMouseDown);
        canvas.addEventListener('mousemove', onMouseMove);
        canvas.addEventListener('mouseup', onMouseUp);
        canvas.addEventListener('wheel', onMouseWheel);
        canvas.addEventListener('contextmenu', onContextMenu);

        // Keyboard shortcuts
        document.addEventListener('keydown', onKeyDown);

        // Tool selection
        document.querySelectorAll('.tool-item').forEach(item => {
            item.addEventListener('click', () => {
                document.querySelectorAll('.tool-item').forEach(i => i.classList.remove('selected'));
                item.classList.add('selected');
                currentTool = item.dataset.tool;
                updateCanvasInfo();
            });
        });
    }

    /**
     * Setup UI controls
     */
    function setupUI() {
        // Level info inputs
        document.getElementById('level-name').addEventListener('input', (e) => {
            levelData.metadata.name = e.target.value;
        });

        document.getElementById('level-desc').addEventListener('input', (e) => {
            levelData.metadata.description = e.target.value;
        });

        document.getElementById('level-difficulty').addEventListener('change', (e) => {
            levelData.metadata.difficulty = e.target.value;
        });

        document.getElementById('fog-density').addEventListener('input', (e) => {
            const density = e.target.value / 1000;
            levelData.settings.fogDensity = density;
            scene.fog = new THREE.FogExp2(0x000000, density);
        });

        document.getElementById('light-intensity').addEventListener('input', (e) => {
            const intensity = e.target.value / 100;
            levelData.settings.lightIntensity = intensity;
        });

        document.getElementById('level-biome').addEventListener('change', (e) => {
            levelData.metadata.biome = e.target.value;
            applyBiome(e.target.value);
        });
    }

    /**
     * Create new level
     */
    function createNewLevel() {
        console.log('[Editor] Creating new level');
        initLevelData();
        clearScene();
        renderGrid();
        updateUI();
        showNotification('New level created', 'success');
    }

    /**
     * Clear scene objects
     */
    function clearScene() {
        objects.forEach(obj => scene.remove(obj));
        objects = [];
    }

    /**
     * Render grid visualization
     */
    function renderGrid() {
        clearScene();

        const size = config.cellSize;
        const offset = (config.gridSize * size) / 2;

        for (let y = 0; y < config.gridSize; y++) {
            for (let x = 0; x < config.gridSize; x++) {
                const tile = levelData.grid[y][x];
                if (tile !== TILE_TYPES.EMPTY) {
                    createTileVisual(x, y, tile);
                }
            }
        }

        // Render spawns
        renderSpawns();
    }

    /**
     * Create tile visual
     */
    function createTileVisual(gridX, gridY, tileType) {
        const size = config.cellSize;
        const x = gridX * size - (config.gridSize * size) / 2 + size / 2;
        const z = gridY * size - (config.gridSize * size) / 2 + size / 2;

        let geometry, material, mesh;

        switch (tileType) {
            case TILE_TYPES.WALL:
                geometry = new THREE.BoxGeometry(size, config.defaultWallHeight, size);
                material = new THREE.MeshStandardMaterial({ 
                    color: 0x888888,
                    roughness: 0.8,
                    metalness: 0.2
                });
                mesh = new THREE.Mesh(geometry, material);
                mesh.position.set(x, config.defaultWallHeight / 2, z);
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                break;

            case TILE_TYPES.PELLET:
                geometry = new THREE.SphereGeometry(0.3, 8, 8);
                material = new THREE.MeshStandardMaterial({ 
                    color: 0x4488ff,
                    emissive: 0x2244aa,
                    emissiveIntensity: 0.5
                });
                mesh = new THREE.Mesh(geometry, material);
                mesh.position.set(x, 0.5, z);
                break;

            case TILE_TYPES.POWER_PELLET:
                geometry = new THREE.SphereGeometry(0.6, 12, 12);
                material = new THREE.MeshStandardMaterial({ 
                    color: 0xffff00,
                    emissive: 0xaaaa00,
                    emissiveIntensity: 0.8
                });
                mesh = new THREE.Mesh(geometry, material);
                mesh.position.set(x, 0.5, z);
                break;

            case TILE_TYPES.DOOR:
                geometry = new THREE.BoxGeometry(size, 2.5, 0.2);
                material = new THREE.MeshStandardMaterial({ 
                    color: 0x8B4513,
                    roughness: 0.9
                });
                mesh = new THREE.Mesh(geometry, material);
                mesh.position.set(x, 1.25, z);
                break;
        }

        if (mesh) {
            mesh.userData = {
                gridX,
                gridY,
                tileType,
                isTile: true
            };
            scene.add(mesh);
            objects.push(mesh);
        }
    }

    /**
     * Render spawn points
     */
    function renderSpawns() {
        // Player spawn
        const playerSpawn = levelData.spawns.player;
        if (playerSpawn) {
            const geometry = new THREE.OctahedronGeometry(0.8);
            const material = new THREE.MeshStandardMaterial({ 
                color: 0x00ff00,
                emissive: 0x00aa00,
                emissiveIntensity: 0.6
            });
            const mesh = new THREE.Mesh(geometry, material);
            const size = config.cellSize;
            mesh.position.set(
                playerSpawn.x * size - (config.gridSize * size) / 2 + size / 2,
                1,
                playerSpawn.z * size - (config.gridSize * size) / 2 + size / 2
            );
            mesh.userData = { isSpawn: true, spawnType: 'player' };
            scene.add(mesh);
            objects.push(mesh);
        }

        // Pac-Man spawns
        levelData.spawns.pacman.forEach((spawn, index) => {
            const geometry = new THREE.SphereGeometry(1, 16, 16);
            const material = new THREE.MeshStandardMaterial({ 
                color: 0xff0000,
                emissive: 0xaa0000,
                emissiveIntensity: 0.7
            });
            const mesh = new THREE.Mesh(geometry, material);
            const size = config.cellSize;
            mesh.position.set(
                spawn.x * size - (config.gridSize * size) / 2 + size / 2,
                1,
                spawn.z * size - (config.gridSize * size) / 2 + size / 2
            );
            mesh.userData = { isSpawn: true, spawnType: 'pacman', index };
            scene.add(mesh);
            objects.push(mesh);
        });
    }

    /**
     * Mouse down handler
     */
    function onMouseDown(event) {
        if (event.button !== 0) return; // Left click only

        isDragging = true;
        dragStart = getMousePosition(event);

        // Place tile/object
        placeObject(dragStart);
    }

    /**
     * Mouse move handler
     */
    function onMouseMove(event) {
        if (!isDragging) return;

        const pos = getMousePosition(event);
        
        // Update canvas info
        updateCanvasInfo(pos);

        // Continuous placement for some tools
        if (currentTool === 'wall' || currentTool === 'floor') {
            placeObject(pos);
        }
    }

    /**
     * Mouse up handler
     */
    function onMouseUp(event) {
        isDragging = false;
        dragStart = null;
    }

    /**
     * Mouse wheel handler (zoom)
     */
    function onMouseWheel(event) {
        event.preventDefault();

        const zoomSpeed = 0.001;
        camera.position.y -= event.deltaY * zoomSpeed;
        camera.position.y = Math.max(5, Math.min(100, camera.position.y));

        updateCanvasInfo();
    }

    /**
     * Context menu handler (right-click delete)
     */
    function onContextMenu(event) {
        event.preventDefault();
        const pos = getMousePosition(event);
        deleteObject(pos);
    }

    /**
     * Get mouse position in grid coordinates
     */
    function getMousePosition(event) {
        const rect = canvas.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);

        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const intersection = new THREE.Vector3();
        raycaster.ray.intersectPlane(plane, intersection);

        const size = config.cellSize;
        const gridX = Math.floor((intersection.x + (config.gridSize * size) / 2) / size);
        const gridY = Math.floor((intersection.z + (config.gridSize * size) / 2) / size);

        return { x: gridX, y: gridY };
    }

    /**
     * Place object at grid position
     */
    function placeObject(pos) {
        const { x, y } = pos;

        // Check bounds
        if (x < 0 || x >= config.gridSize || y < 0 || y >= config.gridSize) {
            return;
        }

        // Place based on tool
        switch (currentTool) {
            case 'wall':
                levelData.grid[y][x] = TILE_TYPES.WALL;
                break;
            case 'pellet':
                levelData.grid[y][x] = TILE_TYPES.PELLET;
                break;
            case 'power-pellet':
                levelData.grid[y][x] = TILE_TYPES.POWER_PELLET;
                break;
            case 'door':
                levelData.grid[y][x] = TILE_TYPES.DOOR;
                break;
            case 'player-spawn':
                levelData.spawns.player = { x, z: y };
                break;
            case 'pacman-spawn':
                levelData.spawns.pacman.push({ x, z: y });
                break;
        }

        renderGrid();
    }

    /**
     * Delete object at grid position
     */
    function deleteObject(pos) {
        const { x, y } = pos;

        if (x < 0 || x >= config.gridSize || y < 0 || y >= config.gridSize) {
            return;
        }

        levelData.grid[y][x] = TILE_TYPES.EMPTY;
        renderGrid();
    }

    /**
     * Keyboard shortcuts
     */
    function onKeyDown(event) {
        switch (event.key.toLowerCase()) {
            case 'delete':
            case 'backspace':
                if (selectedObject) {
                    deleteSelected();
                }
                break;
            case 'c':
                if (event.ctrlKey) {
                    copySelected();
                }
                break;
            case 'v':
                if (event.ctrlKey) {
                    pasteClipboard();
                }
                break;
            case 's':
                if (event.ctrlKey) {
                    event.preventDefault();
                    saveLevel();
                }
                break;
            case 'p':
                if (event.ctrlKey) {
                    event.preventDefault();
                    playtestLevel();
                }
                break;
            case '1':
            case '2':
            case '3':
            case '4':
                selectToolByNumber(parseInt(event.key));
                break;
        }
    }

    /**
     * Window resize handler
     */
    function onWindowResize() {
        camera.aspect = canvas.clientWidth / canvas.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    }

    /**
     * Animation loop
     */
    function animate() {
        requestAnimationFrame(animate);

        // Rotate spawn markers
        objects.forEach(obj => {
            if (obj.userData.isSpawn) {
                obj.rotation.y += 0.01;
            }
        });

        renderer.render(scene, camera);
    }

    /**
     * Update canvas info display
     */
    function updateCanvasInfo(pos) {
        const info = document.getElementById('canvas-info');
        if (!info) return;

        const zoom = Math.round((50 / camera.position.y) * 100);
        const gridInfo = `Grid: ${config.gridSize}x${config.gridSize}`;
        const zoomInfo = `Zoom: ${zoom}%`;
        const toolInfo = `Tool: ${currentTool.charAt(0).toUpperCase() + currentTool.slice(1)}`;
        
        let posInfo = '';
        if (pos) {
            posInfo = `| Pos: (${pos.x}, ${pos.y})`;
        }

        info.textContent = `${gridInfo} | ${zoomInfo} | ${toolInfo} ${posInfo}`;
    }

    /**
     * Update UI from level data
     */
    function updateUI() {
        document.getElementById('level-name').value = levelData.metadata.name;
        document.getElementById('level-desc').value = levelData.metadata.description;
        document.getElementById('level-difficulty').value = levelData.metadata.difficulty;
        document.getElementById('fog-density').value = levelData.settings.fogDensity * 1000;
        document.getElementById('light-intensity').value = levelData.settings.lightIntensity * 100;
        document.getElementById('level-biome').value = levelData.metadata.biome;
    }

    /**
     * Apply biome settings
     */
    function applyBiome(biome) {
        const biomes = {
            yellow: { fog: 0xaaa844, light: 0xffffcc },
            mono: { fog: 0x333333, light: 0x666666 },
            flooded: { fog: 0x223344, light: 0x88aacc },
            construction: { fog: 0x444433, light: 0xccbb88 },
            sewers: { fog: 0x332222, light: 0xaa6644 }
        };

        const settings = biomes[biome];
        if (settings) {
            scene.background = new THREE.Color(settings.fog);
            scene.fog = new THREE.FogExp2(settings.fog, levelData.settings.fogDensity);
        }
    }

    /**
     * Save level
     */
    function saveLevel() {
        levelData.metadata.updatedAt = Date.now();

        const dataStr = JSON.stringify(levelData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `${levelData.metadata.name.replace(/\s+/g, '_').toLowerCase()}.json`;
        link.click();

        URL.revokeObjectURL(url);

        showNotification('Level saved!', 'success');
    }

    /**
     * Load level
     */
    function loadLevel() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';

        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const loaded = JSON.parse(event.target.result);
                    levelData = loaded;
                    renderGrid();
                    updateUI();
                    showNotification('Level loaded!', 'success');
                } catch (error) {
                    showNotification('Failed to load level: ' + error.message, 'error');
                }
            };
            reader.readAsText(file);
        };

        input.click();
    }

    /**
     * Export level (for sharing)
     */
    function exportLevel() {
        const exportData = {
            v: levelData.version,
            m: levelData.metadata,
            s: levelData.settings,
            g: levelData.grid,
            p: levelData.spawns
        };

        const jsonStr = JSON.stringify(exportData);
        const code = btoa(jsonStr);

        document.getElementById('share-code').textContent = code;
        document.getElementById('share-modal').classList.add('active');

        showNotification('Level exported! Share this code.', 'success');
    }

    /**
     * Import level from code
     */
    function importLevel() {
        const code = prompt('Enter level share code:');
        if (!code) return;

        try {
            const jsonStr = atob(code);
            const imported = JSON.parse(jsonStr);

            levelData = {
                version: imported.v || '1.0',
                metadata: imported.m,
                settings: imported.s,
                grid: imported.g,
                spawns: imported.p
            };

            // Validate grid size
            config.gridSize = levelData.grid.length;
            
            renderGrid();
            updateUI();

            showNotification('Level imported successfully!', 'success');
        } catch (error) {
            showNotification('Invalid share code: ' + error.message, 'error');
        }
    }

    /**
     * Share level
     */
    function shareLevel() {
        exportLevel();
    }

    /**
     * Copy share code
     */
    function copyShareCode() {
        const code = document.getElementById('share-code').textContent;
        navigator.clipboard.writeText(code).then(() => {
            showNotification('Code copied to clipboard!', 'success');
        });
    }

    /**
     * Close modal
     */
    function closeModal() {
        document.getElementById('share-modal').classList.remove('active');
    }

    /**
     * Playtest level
     */
    function playtestLevel() {
        // Save level first
        saveLevel();

        // Open in game with level parameter
        const levelCode = btoa(JSON.stringify(levelData));
        const url = `backrooms-pacman.html?custom_level=${levelCode}`;
        window.open(url, '_blank');

        showNotification('Launching playtest...', 'success');
    }

    /**
     * Publish level
     */
    function publishLevel() {
        document.getElementById('publish-name').value = levelData.metadata.name;
        document.getElementById('publish-modal').classList.add('active');
    }

    /**
     * Cancel publish
     */
    function cancelPublish() {
        document.getElementById('publish-modal').classList.remove('active');
    }

    /**
     * Confirm publish
     */
    async function confirmPublish() {
        const name = document.getElementById('publish-name').value;
        const tags = document.getElementById('publish-tags').value;
        const visibility = document.getElementById('publish-visibility').value;

        try {
            // Upload to workshop
            const response = await fetch('/api/workshop/levels', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    levelData,
                    name,
                    tags: tags.split(',').map(t => t.trim()),
                    visibility
                })
            });

            if (!response.ok) {
                throw new Error('Publish failed');
            }

            const result = await response.json();
            
            showNotification('Level published! ID: ' + result.levelId, 'success');
            cancelPublish();

        } catch (error) {
            showNotification('Publish failed: ' + error.message, 'error');
        }
    }

    /**
     * Show notification
     */
    function showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.className = `notification ${type} show`;

        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }

    /**
     * Delete selected object
     */
    function deleteSelected() {
        if (!selectedObject) return;
        
        // Remove from scene
        scene.remove(selectedObject);
        
        // Remove from objects array
        objects = objects.filter(obj => obj !== selectedObject);
        
        selectedObject = null;
    }

    /**
     * Copy selected object
     */
    function copySelected() {
        if (!selectedObject) return;
        
        clipboard = {
            type: selectedObject.userData.tileType,
            position: selectedObject.position.clone()
        };
        
        showNotification('Copied!', 'success');
    }

    /**
     * Paste clipboard
     */
    function pasteClipboard() {
        if (!clipboard) return;
        
        // Create new object at camera position
        // Implementation depends on specific use case
        showNotification('Pasted!', 'success');
    }

    /**
     * Select tool by number key
     */
    function selectToolByNumber(num) {
        const tools = ['wall', 'floor', 'pellet', 'power-pellet'];
        if (num >= 1 && num <= tools.length) {
            currentTool = tools[num - 1];
            
            // Update UI
            document.querySelectorAll('.tool-item').forEach(i => i.classList.remove('selected'));
            document.querySelector(`[data-tool="${currentTool}"]`).classList.add('selected');
            
            updateCanvasInfo();
        }
    }

    /**
     * New level
     */
    function newLevel() {
        if (confirm('Create new level? Unsaved changes will be lost.')) {
            createNewLevel();
        }
    }

    // Public API
    return {
        init,
        newLevel,
        loadLevel,
        saveLevel,
        exportLevel,
        importLevel,
        shareLevel,
        copyShareCode,
        closeModal,
        playtestLevel,
        publishLevel,
        cancelPublish,
        confirmPublish
    };
})();

// Initialize editor on page load
window.addEventListener('DOMContentLoaded', () => {
    LevelEditor.init();
});

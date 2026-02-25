/**
 * HELLAPHOBIA LEVEL EDITOR
 * =========================
 * Visual drag-and-drop level editor with:
 * - WFC integration for procedural generation
 * - Real-time preview
 * - Event/trigger system
 * - Export to game format
 * 
 * @version 1.0.0
 * @author ScaryGamesAI Team
 */

class LevelEditor {
    static canvas = null;
    static ctx = null;
    static camera = { x: 0, y: 0, zoom: 1 };
    static grid = { size: 32, visible: true, snap: true };
    static selectedObject = null;
    static selectedTool = 'select';
    static objects = [];
    static rooms = [];
    static events = [];
    static isDirty = false;
    static currentLevel = null;
    static clipboard = null;
    static dragStart = null;
    static mousePosition = { x: 0, y: 0 };

    // Room templates (WFC-compatible)
    static roomTemplates = {
        corridor_straight: {
            width: 4, height: 1,
            connections: ['left', 'right'],
            texture: '#corridor'
        },
        corridor_corner: {
            width: 2, height: 2,
            connections: ['top', 'right'],
            texture: '#corner'
        },
        room_small: {
            width: 3, height: 3,
            connections: ['top', 'bottom', 'left', 'right'],
            texture: '#small_room'
        },
        room_large: {
            width: 5, height: 5,
            connections: ['top', 'bottom', 'left', 'right'],
            texture: '#large_room'
        },
        room_boss: {
            width: 8, height: 8,
            connections: ['top'],
            texture: '#boss_arena'
        },
        stairs: {
            width: 2, height: 2,
            connections: ['top', 'bottom'],
            texture: '#stairs'
        }
    };

    /**
     * Initialize the editor
     */
    static async init() {
        this.canvas = document.getElementById('editor-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Resize canvas
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Setup input handlers
        this.setupInputHandlers();
        
        // Setup asset browser
        this.setupAssetBrowser();
        
        // Load default level
        await this.newLevel();
        
        // Start render loop
        this.renderLoop();
        
        console.log('[LevelEditor] Editor initialized');
    }

    /**
     * Resize canvas to fit viewport
     */
    static resizeCanvas() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
        this.render();
    }

    /**
     * Setup input handlers
     */
    static setupInputHandlers() {
        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
        this.canvas.addEventListener('wheel', (e) => this.onWheel(e));
        this.canvas.addEventListener('contextmenu', (e) => this.onContextMenu(e));
        
        // Keyboard events
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
        
        // Click outside to hide context menu
        document.addEventListener('click', () => {
            const contextMenu = document.getElementById('context-menu');
            if (contextMenu) contextMenu.classList.remove('active');
        });
    }

    /**
     * Setup asset browser drag and drop
     */
    static setupAssetBrowser() {
        const assets = document.querySelectorAll('.asset-item');
        assets.forEach(asset => {
            asset.addEventListener('click', () => {
                // Select asset
                document.querySelectorAll('.asset-item').forEach(a => a.classList.remove('selected'));
                asset.classList.add('selected');
                
                const type = asset.dataset.type;
                const id = asset.dataset.id;
                
                if (type === 'room') {
                    this.selectedTool = 'place_room';
                    this.selectedRoomTemplate = id;
                    this.setStatus(`Placing: ${id}`);
                } else {
                    this.selectedTool = 'place_entity';
                    this.selectedEntityType = { type, id };
                    this.setStatus(`Placing: ${id} (${type})`);
                }
            });
            
            asset.addEventListener('dblclick', () => {
                // Quick place mode
                const type = asset.dataset.type;
                const id = asset.dataset.id;
                
                if (type === 'room' && this.roomTemplates[id]) {
                    this.placeRoomAtMouse(id);
                }
            });
        });
    }

    /**
     * Create a new level
     */
    static async newLevel() {
        if (this.isDirty && !confirm('Unsaved changes will be lost. Continue?')) {
            return;
        }
        
        this.objects = [];
        this.rooms = [];
        this.events = [];
        this.selectedObject = null;
        this.currentLevel = {
            name: 'Untitled Level',
            description: '',
            author: 'Unknown',
            version: '1.0.0',
            metadata: {
                created: new Date().toISOString(),
                modified: new Date().toISOString(),
                wfcCompatible: true
            }
        };
        
        this.camera = { x: 0, y: 0, zoom: 1 };
        this.isDirty = false;
        
        this.updateObjectCount();
        this.setStatus('Created new level');
        this.render();
    }

    /**
     * Open existing level
     */
    static async openLevel() {
        if (this.isDirty && !confirm('Unsaved changes will be lost. Continue?')) {
            return;
        }
        
        // Show file picker modal
        this.showModal('Open Level', `
            <p>Select a level file to open:</p>
            <input type="file" id="level-file-input" accept=".json,.level" style="width: 100%; padding: 10px; margin: 10px 0;">
            <button class="toolbar-btn primary" onclick="LevelEditor.loadLevelFromFile()" style="width: 100%;">Open</button>
        `);
    }

    /**
     * Load level from file
     */
    static async loadLevelFromFile() {
        const fileInput = document.getElementById('level-file-input');
        const file = fileInput.files[0];
        
        if (!file) {
            alert('Please select a file');
            return;
        }
        
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            this.loadLevel(data);
            this.closeModal();
            this.setStatus(`Loaded: ${file.name}`);
        } catch (error) {
            alert(`Failed to load level: ${error.message}`);
        }
    }

    /**
     * Load level data
     */
    static loadLevel(data) {
        this.currentLevel = data;
        this.objects = data.objects || [];
        this.rooms = data.rooms || [];
        this.events = data.events || [];
        this.isDirty = false;
        
        this.updateObjectCount();
        this.render();
        this.setStatus(`Loaded: ${data.metadata?.name || 'Level'}`);
    }

    /**
     * Save current level
     */
    static saveLevel() {
        if (!this.currentLevel) {
            this.showModal('Save Level', `
                <label class="property-label">Level Name:</label>
                <input type="text" id="level-name-input" class="property-input" placeholder="My Awesome Level">
                
                <label class="property-label">Description:</label>
                <textarea id="level-desc-input" class="property-input" rows="3" placeholder="Describe your level..."></textarea>
                
                <label class="property-label">Author:</label>
                <input type="text" id="level-author-input" class="property-input" placeholder="Your name">
                
                <button class="toolbar-btn primary" onclick="LevelEditor.saveLevelData()" style="width: 100%; margin-top: 10px;">Save</button>
            `);
            return;
        }
        
        this.saveLevelData();
    }

    /**
     * Save level data
     */
    static saveLevelData() {
        const nameInput = document.getElementById('level-name-input');
        const descInput = document.getElementById('level-desc-input');
        const authorInput = document.getElementById('level-author-input');
        
        if (nameInput) {
            this.currentLevel.name = nameInput.value || 'Untitled Level';
            this.currentLevel.description = descInput?.value || '';
            this.currentLevel.author = authorInput?.value || 'Unknown';
        }
        
        this.currentLevel.modified = new Date().toISOString();
        this.currentLevel.objects = this.objects;
        this.currentLevel.rooms = this.rooms;
        this.currentLevel.events = this.events;
        
        // Download as file
        const data = JSON.stringify(this.currentLevel, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.currentLevel.name.replace(/\s+/g, '_').toLowerCase()}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        
        this.isDirty = false;
        this.setStatus(`Saved: ${this.currentLevel.name}`);
        
        if (document.getElementById('modal-template')) {
            this.closeModal();
        }
    }

    /**
     * Export level for game use
     */
    static exportLevel() {
        this.showModal('Export Level', `
            <h4>Export Options</h4>
            
            <label class="property-checkbox">
                <input type="checkbox" id="export-wfc" checked>
                Generate WFC constraints
            </label>
            
            <label class="property-checkbox">
                <input type="checkbox" id="export-events" checked>
                Include events/triggers
            </label>
            
            <label class="property-checkbox">
                <input type="checkbox" id="export-metadata" checked>
                Include metadata
            </label>
            
            <div style="margin-top: 15px;">
                <button class="toolbar-btn primary" onclick="LevelEditor.doExport()" style="width: 100%;">Export</button>
            </div>
        `);
    }

    /**
     * Do the actual export
     */
    static doExport() {
        const includeWFC = document.getElementById('export-wfc')?.checked;
        const includeEvents = document.getElementById('export-events')?.checked;
        const includeMetadata = document.getElementById('export-metadata')?.checked;
        
        const exportData = {
            version: '1.0',
            format: 'hellaphobia_level'
        };
        
        if (includeMetadata) {
            exportData.metadata = this.currentLevel.metadata;
        }
        
        exportData.rooms = this.rooms.map(room => ({
            id: room.id,
            template: room.template,
            x: room.x,
            y: room.y,
            rotation: room.rotation || 0
        }));
        
        exportData.objects = this.objects.map(obj => ({
            id: obj.id,
            type: obj.type,
            typeId: obj.typeId,
            x: obj.x,
            y: obj.y,
            properties: obj.properties
        }));
        
        if (includeEvents) {
            exportData.events = this.events;
        }
        
        if (includeWFC) {
            exportData.wfcConstraints = this.generateWFCConstraints();
        }
        
        // Download
        const data = JSON.stringify(exportData, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.currentLevel.name.replace(/\s+/g, '_').toLowerCase()}_export.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        
        this.closeModal();
        this.setStatus('Level exported successfully');
    }

    /**
     * Generate WFC constraints from placed rooms
     */
    static generateWFCConstraints() {
        const constraints = {};
        
        for (const room of this.rooms) {
            const key = `${room.x},${room.y}`;
            const template = this.roomTemplates[room.template];
            
            if (!template) continue;
            
            constraints[key] = {
                template: room.template,
                connections: template.connections,
                neighbors: {}
            };
            
            // Calculate neighbor positions based on connections
            if (template.connections.includes('right')) {
                constraints[key].neighbors.right = `${room.x + template.width},${room.y}`;
            }
            if (template.connections.includes('left')) {
                constraints[key].neighbors.left = `${room.x - 1},${room.y}`;
            }
            if (template.connections.includes('top')) {
                constraints[key].neighbors.top = `${room.x},${room.y - 1}`;
            }
            if (template.connections.includes('bottom')) {
                constraints[key].neighbors.bottom = `${room.x},${room.y + template.height}`;
            }
        }
        
        return constraints;
    }

    /**
     * Test/play level
     */
    static testLevel() {
        if (!this.currentLevel.name || this.currentLevel.name === 'Untitled Level') {
            if (!confirm('Level has no name. Test anyway?')) {
                return;
            }
        }
        
        // Save first
        this.saveLevel();
        
        // Launch in test mode
        const testWindow = window.open('', '_blank');
        if (testWindow) {
            testWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Level Playtest - ${this.currentLevel.name}</title>
                    <style>body { margin: 0; overflow: hidden; background: #000; }</style>
                </head>
                <body>
                    <div id="test-message" style="position: fixed; top: 10px; left: 10px; color: #fff; background: rgba(0,0,0,0.7); padding: 10px; border-radius: 4px;">
                        Playtest Mode - Press ESC to exit<br>
                        Level: ${this.currentLevel.name}
                    </div>
                    <script>
                        // Load level data
                        const levelData = ${JSON.stringify(this.currentLevel)};
                        console.log('Loading level:', levelData);
                        
                        // TODO: Integrate with actual game engine
                        // This would initialize the game with the custom level
                        
                        document.addEventListener('keydown', (e) => {
                            if (e.key === 'Escape') {
                                if (confirm('Exit playtest?')) {
                                    window.close();
                                }
                            }
                        });
                    <\/script>
                </body>
                </html>
            `);
        }
        
        this.setStatus('Playtest launched');
    }

    /**
     * Close editor
     */
    static closeEditor() {
        if (this.isDirty && !confirm('Unsaved changes will be lost. Close anyway?')) {
            return;
        }
        
        window.close();
        // Fallback if window.close() doesn't work
        window.location.href = 'hellaphobia.html';
    }

    /**
     * Mouse event handlers
     */
    static onMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        this.dragStart = { x, y, button: e.button };
        this.mousePosition = { x, y };
        
        if (e.button === 2) {
            // Right click - pan
            this.isPanning = true;
        } else if (e.button === 0) {
            // Left click
            if (this.selectedTool === 'select') {
                this.selectObjectAt(x, y);
            } else if (this.selectedTool === 'place_room') {
                this.placeRoomAtMouse(this.selectedRoomTemplate);
            } else if (this.selectedTool === 'place_entity') {
                this.placeEntityAtMouse(this.selectedEntityType);
            }
        }
    }

    static onMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        this.mousePosition = { x, y };
        
        // Update cursor position display
        const worldPos = this.screenToWorld(x, y);
        document.getElementById('cursor-position').textContent = 
            `X: ${Math.round(worldPos.x)}, Y: ${Math.round(worldPos.y)}`;
        
        if (this.dragStart && this.isPanning) {
            // Pan camera
            const dx = x - this.dragStart.x;
            const dy = y - this.dragStart.y;
            
            this.camera.x += dx;
            this.camera.y += dy;
            
            this.dragStart = { x, y, button: this.dragStart.button };
        }
        
        this.render();
    }

    static onMouseUp(e) {
        this.dragStart = null;
        this.isPanning = false;
    }

    static onWheel(e) {
        e.preventDefault();
        
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        this.setViewportZoom(this.camera.zoom * delta);
    }

    static onContextMenu(e) {
        e.preventDefault();
        
        const contextMenu = document.getElementById('context-menu');
        contextMenu.style.left = e.clientX + 'px';
        contextMenu.style.top = e.clientY + 'px';
        contextMenu.classList.add('active');
    }

    /**
     * Keyboard handler
     */
    static onKeyDown(e) {
        switch (e.key) {
            case 'Delete':
            case 'Backspace':
                if (this.selectedObject) {
                    this.deleteSelectedObject();
                }
                break;
            
            case 'Control':
            case 'Meta':
                // Ctrl pressed
                break;
            
            case 'z':
                if (e.ctrlKey || e.metaKey) {
                    this.undo();
                }
                break;
            
            case 'y':
                if (e.ctrlKey || e.metaKey) {
                    this.redo();
                }
                break;
            
            case 'g':
                // Toggle grid
                this.grid.visible = !this.grid.visible;
                this.render();
                break;
            
            case ' ':
                // Space - switch to select tool
                this.selectedTool = 'select';
                this.setStatus('Select tool');
                break;
        }
    }

    /**
     * Place room at mouse position
     */
    static placeRoomAtMouse(templateId) {
        const worldPos = this.screenToWorld(this.mousePosition.x, this.mousePosition.y);
        
        if (this.grid.snap) {
            worldPos.x = Math.round(worldPos.x / this.grid.size) * this.grid.size;
            worldPos.y = Math.round(worldPos.y / this.grid.size) * this.grid.size;
        }
        
        const template = this.roomTemplates[templateId];
        if (!template) {
            this.setStatus(`Unknown room template: ${templateId}`, 'error');
            return;
        }
        
        const room = {
            id: `room_${Date.now()}`,
            template: templateId,
            x: worldPos.x,
            y: worldPos.y,
            rotation: 0,
            properties: {}
        };
        
        this.rooms.push(room);
        this.isDirty = true;
        this.updateObjectCount();
        this.setStatus(`Placed room: ${templateId}`);
        this.render();
    }

    /**
     * Place entity at mouse position
     */
    static placeEntityAtMouse(entityType) {
        const worldPos = this.screenToWorld(this.mousePosition.x, this.mousePosition.y);
        
        if (this.grid.snap) {
            worldPos.x = Math.round(worldPos.x / this.grid.size) * this.grid.size;
            worldPos.y = Math.round(worldPos.y / this.grid.size) * this.grid.size;
        }
        
        const entity = {
            id: `${entityType.type}_${Date.now()}`,
            type: entityType.type,
            typeId: entityType.id,
            x: worldPos.x,
            y: worldPos.y,
            properties: {
                health: entityType.type === 'enemy' ? 100 : undefined,
                damage: entityType.type === 'enemy' ? 10 : undefined
            }
        };
        
        this.objects.push(entity);
        this.isDirty = true;
        this.updateObjectCount();
        this.setStatus(`Placed ${entityType.type}: ${entityType.id}`);
        this.render();
    }

    /**
     * Select object at screen position
     */
    static selectObjectAt(screenX, screenY) {
        const worldPos = this.screenToWorld(screenX, screenY);
        
        // Check objects first
        for (const obj of this.objects) {
            const dx = worldPos.x - obj.x;
            const dy = worldPos.y - obj.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < 20) {
                this.selectedObject = obj;
                this.renderPropertiesPanel();
                this.render();
                return;
            }
        }
        
        // Check rooms
        for (const room of this.rooms) {
            const template = this.roomTemplates[room.template];
            if (!template) continue;
            
            const rw = template.width * this.grid.size;
            const rh = template.height * this.grid.size;
            
            if (worldPos.x >= room.x && worldPos.x <= room.x + rw &&
                worldPos.y >= room.y && worldPos.y <= room.y + rh) {
                this.selectedObject = room;
                this.renderPropertiesPanel();
                this.render();
                return;
            }
        }
        
        // Deselect
        this.selectedObject = null;
        this.renderPropertiesPanel();
        this.render();
    }

    /**
     * Delete selected object
     */
    static deleteSelectedObject() {
        if (!this.selectedObject) return;
        
        const index = this.objects.indexOf(this.selectedObject);
        if (index !== -1) {
            this.objects.splice(index, 1);
        } else {
            const roomIndex = this.rooms.indexOf(this.selectedObject);
            if (roomIndex !== -1) {
                this.rooms.splice(roomIndex, 1);
            }
        }
        
        this.selectedObject = null;
        this.isDirty = true;
        this.updateObjectCount();
        this.renderPropertiesPanel();
        this.render();
        this.setStatus('Deleted object');
    }

    /**
     * Render properties panel
     */
    static renderPropertiesPanel() {
        const panel = document.getElementById('properties-content');
        if (!panel) return;
        
        if (!this.selectedObject) {
            panel.innerHTML = '<div style="color: #808080; text-align: center; padding: 20px;">Select an object to view its properties</div>';
            return;
        }
        
        const obj = this.selectedObject;
        const isRoom = !!obj.template;
        
        let html = '';
        
        if (isRoom) {
            html = `
                <div class="property-group">
                    <div class="property-group-title">Room Properties</div>
                    
                    <div class="property-item">
                        <div class="property-label">Template</div>
                        <div class="property-input">${obj.template}</div>
                    </div>
                    
                    <div class="property-item">
                        <div class="property-label">Position X</div>
                        <input type="number" class="property-input" value="${obj.x}" onchange="LevelEditor.updateProperty('x', this.value)">
                    </div>
                    
                    <div class="property-item">
                        <div class="property-label">Position Y</div>
                        <input type="number" class="property-input" value="${obj.y}" onchange="LevelEditor.updateProperty('y', this.value)">
                    </div>
                    
                    <div class="property-item">
                        <div class="property-label">Rotation</div>
                        <input type="range" class="property-slider" min="0" max="360" value="${obj.rotation || 0}" oninput="LevelEditor.updateProperty('rotation', this.value)">
                        <div style="text-align: right; font-size: 11px; color: #808080;">${obj.rotation || 0}°</div>
                    </div>
                </div>
            `;
        } else {
            html = `
                <div class="property-group">
                    <div class="property-group-title">Entity Properties</div>
                    
                    <div class="property-item">
                        <div class="property-label">Type</div>
                        <div class="property-input">${obj.type}</div>
                    </div>
                    
                    <div class="property-item">
                        <div class="property-label">ID</div>
                        <div class="property-input">${obj.typeId}</div>
                    </div>
                    
                    <div class="property-item">
                        <div class="property-label">Position X</div>
                        <input type="number" class="property-input" value="${obj.x}" onchange="LevelEditor.updateProperty('x', this.value)">
                    </div>
                    
                    <div class="property-item">
                        <div class="property-label">Position Y</div>
                        <input type="number" class="property-input" value="${obj.y}" onchange="LevelEditor.updateProperty('y', this.value)">
                    </div>
                    
                    ${obj.properties?.health !== undefined ? `
                    <div class="property-item">
                        <div class="property-label">Health</div>
                        <input type="number" class="property-input" value="${obj.properties.health}" onchange="LevelEditor.updateProperty('health', this.value)">
                    </div>
                    ` : ''}
                </div>
            `;
        }
        
        panel.innerHTML = html;
    }

    /**
     * Update object property
     */
    static updateProperty(key, value) {
        if (!this.selectedObject) return;
        
        value = Number(value);
        
        if (key === 'health' || key === 'damage') {
            if (!this.selectedObject.properties) {
                this.selectedObject.properties = {};
            }
            this.selectedObject.properties[key] = value;
        } else {
            this.selectedObject[key] = value;
        }
        
        this.isDirty = true;
        this.render();
    }

    /**
     * Viewport controls
     */
    static setViewportZoom(zoom) {
        this.camera.zoom = Math.max(0.1, Math.min(5, zoom));
        document.getElementById('zoom-level').textContent = Math.round(this.camera.zoom * 100) + '%';
        this.render();
    }

    static resetViewport() {
        this.camera = { x: 0, y: 0, zoom: 1 };
        this.render();
    }

    /**
     * Coordinate conversion
     */
    static screenToWorld(screenX, screenY) {
        return {
            x: (screenX - this.camera.x) / this.camera.zoom,
            y: (screenY - this.camera.y) / this.camera.zoom
        };
    }

    static worldToScreen(worldX, worldY) {
        return {
            x: worldX * this.camera.zoom + this.camera.x,
            y: worldY * this.camera.zoom + this.camera.y
        };
    }

    /**
     * Main render function
     */
    static render() {
        const ctx = this.ctx;
        
        // Clear
        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        ctx.save();
        ctx.translate(this.camera.x, this.camera.y);
        ctx.scale(this.camera.zoom, this.camera.zoom);
        
        // Draw grid
        if (this.grid.visible) {
            this.drawGrid(ctx);
        }
        
        // Draw rooms
        for (const room of this.rooms) {
            this.drawRoom(ctx, room);
        }
        
        // Draw objects
        for (const obj of this.objects) {
            this.drawObject(ctx, obj);
        }
        
        // Draw selection
        if (this.selectedObject) {
            this.drawSelection(ctx, this.selectedObject);
        }
        
        // Draw placement preview
        if (this.selectedTool === 'place_room' && this.selectedRoomTemplate) {
            this.drawPlacementPreview(ctx);
        }
        
        ctx.restore();
        
        // Update FPS
        document.getElementById('fps-counter').textContent = '60';
    }

    /**
     * Draw grid
     */
    static drawGrid(ctx) {
        ctx.strokeStyle = '#1a1a3a';
        ctx.lineWidth = 1;
        
        const gridSize = this.grid.size;
        const startX = Math.floor(-this.camera.x / this.camera.zoom / gridSize) * gridSize;
        const startY = Math.floor(-this.camera.y / this.camera.zoom / gridSize) * gridSize;
        const endX = startX + (this.canvas.width / this.camera.zoom) + gridSize;
        const endY = startY + (this.canvas.height / this.camera.zoom) + gridSize;
        
        for (let x = startX; x < endX; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, startY);
            ctx.lineTo(x, endY);
            ctx.stroke();
        }
        
        for (let y = startY; y < endY; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(startX, y);
            ctx.lineTo(endX, y);
            ctx.stroke();
        }
    }

    /**
     * Draw room
     */
    static drawRoom(ctx, room) {
        const template = this.roomTemplates[room.template];
        if (!template) return;
        
        const width = template.width * this.grid.size;
        const height = template.height * this.grid.size;
        
        // Background
        ctx.fillStyle = '#2a2a4a';
        ctx.fillRect(room.x, room.y, width, height);
        
        // Border
        ctx.strokeStyle = '#4a4a6a';
        ctx.lineWidth = 2;
        ctx.strokeRect(room.x, room.y, width, height);
        
        // Connection indicators
        ctx.fillStyle = '#6a4a8a';
        for (const conn of template.connections) {
            if (conn === 'right') {
                ctx.fillRect(room.x + width - 5, room.y + height / 2 - 5, 5, 10);
            } else if (conn === 'left') {
                ctx.fillRect(room.x, room.y + height / 2 - 5, 5, 10);
            } else if (conn === 'top') {
                ctx.fillRect(room.x + width / 2 - 5, room.y, 10, 5);
            } else if (conn === 'bottom') {
                ctx.fillRect(room.x + width / 2 - 5, room.y + height - 5, 10, 5);
            }
        }
        
        // Label
        ctx.fillStyle = '#e0e0e0';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(room.template, room.x + width / 2, room.y + height / 2);
    }

    /**
     * Draw object
     */
    static drawObject(ctx, obj) {
        const icon = this.getObjectIcon(obj.type, obj.typeId);
        
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(icon, obj.x, obj.y);
        
        // Label
        ctx.fillStyle = '#e0e0e0';
        ctx.font = '10px sans-serif';
        ctx.fillText(obj.typeId, obj.x, obj.y + 20);
    }

    /**
     * Get object icon
     */
    static getObjectIcon(type, typeId) {
        const icons = {
            enemy: {
                basic_enemy: '👤',
                fast_enemy: '🏃',
                tank_enemy: '🛡️',
                ranged_enemy: '🏹'
            },
            item: {
                health_potion: '🧪',
                sanity_boost: '🔮',
                key: '🗝️',
                weapon: '⚔️'
            },
            trigger: {
                spawn_trigger: '📍',
                door_trigger: '🚪',
                cutscene_trigger: '🎬'
            }
        };
        
        return icons[type]?.[typeId] || '❓';
    }

    /**
     * Draw selection outline
     */
    static drawSelection(ctx, obj) {
        ctx.strokeStyle = '#6a4a8a';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        
        if (obj.template) {
            const template = this.roomTemplates[obj.template];
            const width = template.width * this.grid.size;
            const height = template.height * this.grid.size;
            ctx.strokeRect(obj.x, obj.y, width, height);
        } else {
            ctx.beginPath();
            ctx.arc(obj.x, obj.y, 25, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        ctx.setLineDash([]);
    }

    /**
     * Draw placement preview
     */
    static drawPlacementPreview(ctx) {
        const worldPos = this.screenToWorld(this.mousePosition.x, this.mousePosition.y);
        
        if (this.grid.snap) {
            worldPos.x = Math.round(worldPos.x / this.grid.size) * this.grid.size;
            worldPos.y = Math.round(worldPos.y / this.grid.size) * this.grid.size;
        }
        
        const template = this.roomTemplates[this.selectedRoomTemplate];
        if (!template) return;
        
        const width = template.width * this.grid.size;
        const height = template.height * this.grid.size;
        
        ctx.fillStyle = 'rgba(106, 74, 138, 0.3)';
        ctx.fillRect(worldPos.x, worldPos.y, width, height);
        
        ctx.strokeStyle = '#6a4a8a';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(worldPos.x, worldPos.y, width, height);
        ctx.setLineDash([]);
    }

    /**
     * Render loop
     */
    static renderLoop() {
        this.render();
        requestAnimationFrame(() => this.renderLoop());
    }

    /**
     * Utility functions
     */
    static updateObjectCount() {
        document.getElementById('object-count').textContent = this.objects.length + this.rooms.length;
    }

    static setStatus(message, type = 'info') {
        const statusEl = document.getElementById('status-message');
        if (statusEl) {
            statusEl.textContent = message;
            statusEl.style.color = type === 'error' ? '#ff4444' : '#808080';
        }
    }

    /**
     * Event editor functions
     */
    static addEvent() {
        this.showModal('Add Event', `
            <label class="property-label">Event Type:</label>
            <select id="event-type-select" class="property-input">
                <option value="trigger">Trigger</option>
                <option value="timer">Timer</option>
                <option value="cutscene">Cutscene</option>
                <option value="dialogue">Dialogue</option>
            </select>
            
            <label class="property-label">Event Name:</label>
            <input type="text" id="event-name-input" class="property-input" placeholder="My Event">
            
            <label class="property-label">Description:</label>
            <textarea id="event-desc-input" class="property-input" rows="3"></textarea>
            
            <button class="toolbar-btn primary" onclick="LevelEditor.createEvent()" style="width: 100%; margin-top: 10px;">Create Event</button>
        `);
    }

    static createEvent() {
        const typeSelect = document.getElementById('event-type-select');
        const nameInput = document.getElementById('event-name-input');
        const descInput = document.getElementById('event-desc-input');
        
        const event = {
            id: `event_${Date.now()}`,
            type: typeSelect?.value || 'trigger',
            name: nameInput?.value || 'Unnamed Event',
            description: descInput?.value || '',
            conditions: [],
            actions: []
        };
        
        this.events.push(event);
        this.isDirty = true;
        
        this.closeModal();
        this.setStatus(`Created event: ${event.name}`);
    }

    static addCondition() {
        this.showModal('Add Condition', `
            <label class="property-label">Condition Type:</label>
            <select id="condition-type-select" class="property-input">
                <option value="has_item">Has Item</option>
                <option value="health_below">Health Below</option>
                <option value="sanity_below">Sanity Below</option>
                <option value="enemy_defeated">Enemy Defeated</option>
                <option value="time_elapsed">Time Elapsed</option>
            </select>
            
            <label class="property-label">Parameters:</label>
            <input type="text" id="condition-params-input" class="property-input" placeholder="e.g., ancient_key or 50">
            
            <button class="toolbar-btn primary" onclick="LevelEditor.createCondition()" style="width: 100%; margin-top: 10px;">Create Condition</button>
        `);
    }

    static createCondition() {
        const typeSelect = document.getElementById('condition-type-select');
        const paramsInput = document.getElementById('condition-params-input');
        
        const condition = {
            id: `cond_${Date.now()}`,
            type: typeSelect?.value || 'has_item',
            parameters: paramsInput?.value || ''
        };
        
        // Add to selected event or create new
        if (this.events.length > 0) {
            this.events[this.events.length - 1].conditions.push(condition);
        }
        
        this.closeModal();
        this.setStatus('Created condition');
    }

    static addAction() {
        this.showModal('Add Action', `
            <label class="property-label">Action Type:</label>
            <select id="action-type-select" class="property-input">
                <option value="spawn_entity">Spawn Entity</option>
                <option value="play_sound">Play Sound</option>
                <option value="change_lighting">Change Lighting</option>
                <option value="open_door">Open Door</option>
                <option value="trigger_cutscene">Trigger Cutscene</option>
                <option value="give_item">Give Item</option>
            </select>
            
            <label class="property-label">Parameters:</label>
            <input type="text" id="action-params-input" class="property-input" placeholder="e.g., enemy_basic at (100,200)">
            
            <button class="toolbar-btn primary" onclick="LevelEditor.createAction()" style="width: 100%; margin-top: 10px;">Create Action</button>
        `);
    }

    static createAction() {
        const typeSelect = document.getElementById('action-type-select');
        const paramsInput = document.getElementById('action-params-input');
        
        const action = {
            id: `action_${Date.now()}`,
            type: typeSelect?.value || 'spawn_entity',
            parameters: paramsInput?.value || ''
        };
        
        // Add to selected event or create new
        if (this.events.length > 0) {
            this.events[this.events.length - 1].actions.push(action);
        }
        
        this.closeModal();
        this.setStatus('Created action');
    }

    /**
     * Context menu actions
     */
    static contextAction(action) {
        if (!this.selectedObject) return;
        
        switch (action) {
            case 'copy':
                this.clipboard = JSON.parse(JSON.stringify(this.selectedObject));
                this.setStatus('Copied object');
                break;
            
            case 'paste':
                if (this.clipboard) {
                    const copy = JSON.parse(JSON.stringify(this.clipboard));
                    copy.id = `${copy.type}_${Date.now()}`;
                    copy.x += 20;
                    copy.y += 20;
                    this.objects.push(copy);
                    this.isDirty = true;
                    this.setStatus('Pasted object');
                }
                break;
            
            case 'duplicate':
                if (this.selectedObject) {
                    const copy = JSON.parse(JSON.stringify(this.selectedObject));
                    copy.id = `${copy.type || 'room'}_${Date.now()}`;
                    copy.x += 20;
                    copy.y += 20;
                    
                    if (copy.template) {
                        this.rooms.push(copy);
                    } else {
                        this.objects.push(copy);
                    }
                    
                    this.isDirty = true;
                    this.setStatus('Duplicated object');
                }
                break;
            
            case 'delete':
                this.deleteSelectedObject();
                break;
            
            case 'properties':
                this.renderPropertiesPanel();
                break;
        }
        
        this.render();
    }

    /**
     * Modal functions
     */
    static showModal(title, content) {
        const modal = document.getElementById('modal-template');
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-body').innerHTML = content;
        modal.classList.add('active');
    }

    static closeModal() {
        const modal = document.getElementById('modal-template');
        modal.classList.remove('active');
    }

    /**
     * Undo/Redo (placeholder)
     */
    static undo() {
        this.setStatus('Undo not implemented yet', 'info');
    }

    static redo() {
        this.setStatus('Redo not implemented yet', 'info');
    }
}

// Auto-initialize when DOM is ready
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        LevelEditor.init();
    });
}

// Export for mod system
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LevelEditor };
}

console.log('[LevelEditor] Module loaded');

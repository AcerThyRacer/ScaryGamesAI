/* ============================================================
   HELLAPHOBIA - PHASE 15: VISUAL LEVEL EDITOR
   Drag-and-Drop Editor | Mod Export | Steam Workshop
   JavaScript Scripting | Asset Import
   ============================================================ */

(function() {
    'use strict';

    // ===== LEVEL EDITOR CORE =====
    const LevelEditor = {
        active: false,
        currentLevel: null,
        tiles: [],
        entities: [],
        selectedTool: 'place_tile',
        selectedAsset: null,
        clipboard: null,
        
        init() {
            console.log('Phase 15: Visual Level Editor initialized');
        },
        
        openEditor(levelData) {
            this.active = true;
            this.currentLevel = levelData || this.createBlankLevel();
            this.tiles = this.currentLevel.tiles || [];
            this.entities = this.currentLevel.entities || [];
            
            // Create editor UI
            this.createEditorUI();
            
            window.dispatchEvent(new CustomEvent('editorOpened', {
                detail: { level: this.currentLevel }
            }));
        },
        
        closeEditor() {
            this.active = false;
            this.saveLevel();
            
            // Remove editor UI
            const editorUI = document.getElementById('level-editor-ui');
            if (editorUI) editorUI.remove();
            
            window.dispatchEvent(new CustomEvent('editorClosed'));
        },
        
        createBlankLevel() {
            return {
                name: 'Untitled Level',
                width: 3000,
                height: 2000,
                theme: 'dungeon',
                tiles: [],
                entities: [],
                spawnPoint: { x: 100, y: 100 },
                exitPoint: { x: 2900, y: 1900 }
            };
        },
        
        createEditorUI() {
            const ui = document.createElement('div');
            ui.id = 'level-editor-ui';
            ui.style.cssText = `
                position: fixed;
                inset: 0;
                z-index: 100000;
                background: rgba(0,0,0,0.9);
                display: grid;
                grid-template-columns: 250px 1fr 300px;
                grid-template-rows: 60px 1fr 200px;
                gap: 10px;
                padding: 10px;
                font-family: 'Inter', sans-serif;
                color: white;
            `;
            
            ui.innerHTML = `
                <!-- Toolbar -->
                <div style="grid-column: 1/4; background: #1a1a1a; border-radius: 8px; padding: 10px; display: flex; align-items: center; gap: 10px;">
                    <h1 style="margin: 0; font-size: 24px; color: #ff0044;">HELLAPHOBIA EDITOR</h1>
                    <button id="editor-save" style="padding: 8px 16px; background: #00ff88; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">SAVE</button>
                    <button id="editor-export" style="padding: 8px 16px; background: #0088ff; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">EXPORT MOD</button>
                    <button id="editor-close" style="padding: 8px 16px; background: #ff4444; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">CLOSE</button>
                </div>
                
                <!-- Asset Browser -->
                <div style="grid-row: 2/3; background: #1a1a1a; border-radius: 8px; padding: 10px; overflow-y: auto;">
                    <h3 style="margin-top: 0;">ASSETS</h3>
                    <div id="asset-browser"></div>
                </div>
                
                <!-- Canvas -->
                <div style="grid-row: 2/4; background: #2a2a2a; border-radius: 8px; position: relative; overflow: hidden;">
                    <canvas id="editor-canvas" style="width: 100%; height: 100%;"></canvas>
                </div>
                
                <!-- Properties Panel -->
                <div style="grid-row: 2/3; background: #1a1a1a; border-radius: 8px; padding: 10px; overflow-y: auto;">
                    <h3 style="margin-top: 0;">PROPERTIES</h3>
                    <div id="properties-panel"></div>
                </div>
                
                <!-- Entity List -->
                <div style="grid-row: 3/4; background: #1a1a1a; border-radius: 8px; padding: 10px; overflow-y: auto;">
                    <h3 style="margin-top: 0;">ENTITIES</h3>
                    <div id="entity-list"></div>
                </div>
            `;
            
            document.body.appendChild(ui);
            
            // Setup button handlers
            document.getElementById('editor-save').addEventListener('click', () => this.saveLevel());
            document.getElementById('editor-export').addEventListener('click', () => this.exportMod());
            document.getElementById('editor-close').addEventListener('click', () => this.closeEditor());
            
            // Populate asset browser
            this.populateAssetBrowser();
            
            // Initialize canvas
            this.initCanvas();
        },
        
        populateAssetBrowser() {
            const assets = {
                tiles: ['floor', 'wall', 'door', 'spike_trap', 'hidden_door'],
                enemies: ['crawler', 'chaser', 'wailer', 'stalker', 'mimic'],
                items: ['health_potion', 'sanity_boost', 'key', 'torch'],
                decorations: ['candle', 'skull', 'chains', 'blood_stain']
            };
            
            const container = document.getElementById('asset-browser');
            
            for (const [category, items] of Object.entries(assets)) {
                const section = document.createElement('div');
                section.innerHTML = `<strong>${category.toUpperCase()}</strong>`;
                
                items.forEach(item => {
                    const btn = document.createElement('button');
                    btn.textContent = item;
                    btn.style.cssText = `
                        display: block;
                        width: 100%;
                        margin: 4px 0;
                        padding: 8px;
                        background: #333;
                        border: 1px solid #444;
                        border-radius: 4px;
                        color: white;
                        cursor: pointer;
                    `;
                    btn.addEventListener('click', () => {
                        this.selectedAsset = { category, item };
                        this.selectedTool = 'place_entity';
                    });
                    section.appendChild(btn);
                });
                
                container.appendChild(section);
            }
        },
        
        initCanvas() {
            const canvas = document.getElementById('editor-canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
            
            // Render grid
            this.renderGrid(ctx, canvas.width, canvas.height);
            
            // Mouse interactions
            let isDragging = false;
            let lastX = 0, lastY = 0;
            
            canvas.addEventListener('mousedown', (e) => {
                isDragging = true;
                lastX = e.offsetX;
                lastY = e.offsetY;
                
                if (this.selectedTool === 'place_tile' || this.selectedTool === 'place_entity') {
                    this.placeAt(e.offsetX, e.offsetY);
                }
            });
            
            canvas.addEventListener('mousemove', (e) => {
                if (isDragging) {
                    // Pan view
                }
            });
            
            canvas.addEventListener('mouseup', () => {
                isDragging = false;
            });
        },
        
        renderGrid(ctx, width, height) {
            ctx.fillStyle = '#2a2a2a';
            ctx.fillRect(0, 0, width, height);
            
            ctx.strokeStyle = '#3a3a3a';
            ctx.lineWidth = 1;
            
            const gridSize = 32;
            
            for (let x = 0; x < width; x += gridSize) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, height);
                ctx.stroke();
            }
            
            for (let y = 0; y < height; y += gridSize) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(width, y);
                ctx.stroke();
            }
        },
        
        placeAt(x, y) {
            if (!this.selectedAsset) return;
            
            const gridX = Math.floor(x / 32) * 32;
            const gridY = Math.floor(y / 32) * 32;
            
            if (this.selectedAsset.category === 'tiles') {
                this.tiles.push({
                    x: gridX,
                    y: gridY,
                    w: 32,
                    h: 32,
                    type: this.selectedAsset.item
                });
            } else {
                this.entities.push({
                    x: gridX,
                    y: gridY,
                    type: this.selectedAsset.item,
                    properties: {}
                });
            }
        },
        
        saveLevel() {
            const levelData = {
                ...this.currentLevel,
                tiles: this.tiles,
                entities: this.entities
            };
            
            localStorage.setItem('hellaphobia_custom_level', JSON.stringify(levelData));
            
            window.dispatchEvent(new CustomEvent('levelSaved', {
                detail: { level: levelData }
            }));
            
            alert('Level saved!');
        },
        
        exportMod() {
            const modData = {
                metadata: {
                    name: this.currentLevel.name,
                    author: 'Unknown',
                    version: '1.0.0',
                    description: 'Custom Hellaphobia level'
                },
                level: {
                    tiles: this.tiles,
                    entities: this.entities,
                    width: this.currentLevel.width,
                    height: this.currentLevel.height,
                    theme: this.currentLevel.theme
                },
                scripts: []
            };
            
            const blob = new Blob([JSON.stringify(modData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `${this.currentLevel.name.replace(/\s+/g, '_')}_mod.json`;
            a.click();
            
            URL.revokeObjectURL(url);
            
            window.dispatchEvent(new CustomEvent('modExported', {
                detail: { mod: modData }
            }));
        },
        
        exportAPI() {
            return {
                init: () => this.init(),
                openEditor: (level) => this.openEditor(level),
                closeEditor: () => this.closeEditor(),
                saveLevel: () => this.saveLevel(),
                exportMod: () => this.exportMod()
            };
        }
    };
    
    // Export
    window.LevelEditor = LevelEditor.exportAPI();
    
    console.log('Phase 15: Visual Level Editor loaded');
})();

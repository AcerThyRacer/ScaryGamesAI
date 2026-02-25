/* ============================================================
   CURSED DEPTHS - PHASES 23-25 BUNDLE + WORLD CREATOR
   Transmog | Photo Mode | Music System | Animated World Gen
   ============================================================ */

// ===== PHASE 23: TRANSMOG SYSTEM =====
const TransmogSystem = {
    appearanceLibrary: {},
    savedOutfits: [],
    
    init() {
        console.log('🎭 Phase 23: Transmog System initialized');
        this.loadLibrary();
    },
    
    loadLibrary() {
        const saved = localStorage.getItem('cursed_depths_transmog');
        if (saved) {
            this.appearanceLibrary = JSON.parse(saved);
        }
    },
    
    saveLibrary() {
        localStorage.setItem('cursed_depths_transmog', JSON.stringify(this.appearanceLibrary));
    },
    
    addToLibrary(item) {
        const itemId = item.id || item.type;
        
        if (!this.appearanceLibrary[itemId]) {
            this.appearanceLibrary[itemId] = {
                id: itemId,
                name: item.name,
                type: item.type,
                slot: item.slot,
                appearance: item.appearance || {},
                unlocked: true,
                timesObtained: 1
            };
        } else {
            this.appearanceLibrary[itemId].timesObtained++;
        }
        
        this.saveLibrary();
        showFloatingText(`Appearance Unlocked: ${item.name}`, window.innerWidth / 2, 150, '#44FF88');
    },
    
    applyTransmog(equipmentSlot, appearanceId) {
        const appearance = this.appearanceLibrary[appearanceId];
        if (!appearance) return false;
        
        // Check slot compatibility
        if (appearance.slot !== equipmentSlot) return false;
        
        // Apply appearance override
        player.transmogSlots = player.transmogSlots || {};
        player.transmogSlots[equipmentSlot] = appearanceId;
        
        showFloatingText(`Transmog Applied: ${appearance.name}`, window.innerWidth / 2, 150, '#4488FF');
        return true;
    },
    
    clearTransmog(equipmentSlot) {
        if (player.transmogSlots && player.transmogSlots[equipmentSlot]) {
            delete player.transmogSlots[equipmentSlot];
            showFloatingText('Transmog Cleared', window.innerWidth / 2, 150, '#FF4444');
        }
    },
    
    saveOutfit(name) {
        const outfit = {
            name,
            date: new Date().toISOString(),
            transmogSlots: { ...player.transmogSlots }
        };
        
        this.savedOutfits.push(outfit);
        showFloatingText(`Outfit Saved: ${name}`, window.innerWidth / 2, 150, '#FFDD44');
    },
    
    loadOutfit(outfitName) {
        const outfit = this.savedOutfits.find(o => o.name === outfitName);
        if (!outfit) return false;
        
        player.transmogSlots = { ...outfit.transmogSlots };
        showFloatingText(`Outfit Loaded: ${outfitName}`, window.innerWidth / 2, 150, '#44FF88');
        return true;
    },
    
    renderTransmogUI(ctx) {
        const startX = 100;
        const startY = 100;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.fillRect(startX, startY, 700, 500);
        
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 20px Inter';
        ctx.textAlign = 'left';
        ctx.fillText('Appearance Library', startX + 20, startY + 30);
        
        // Display collected appearances by slot
        const slots = ['head', 'chest', 'legs', 'feet', 'hands', 'weapon', 'offhand'];
        let x = startX + 20;
        let y = startY + 60;
        
        slots.forEach(slot => {
            ctx.fillStyle = '#AAAAAA';
            ctx.font = 'bold 14px Inter';
            ctx.fillText(slot.toUpperCase(), x, y);
            
            y += 25;
            
            const slotItems = Object.values(this.appearanceLibrary).filter(item => item.slot === slot);
            
            slotItems.forEach(item => {
                ctx.globalAlpha = item.unlocked ? 1.0 : 0.3;
                ctx.fillStyle = '#FFFFFF';
                ctx.font = '12px Inter';
                ctx.fillText(`${item.name} (${item.timesObtained})`, x + 10, y);
                y += 18;
            });
            
            ctx.globalAlpha = 1.0;
            y += 10;
        });
    }
};

// ===== PHASE 24: PHOTO MODE =====
const PhotoMode = {
    active: false,
    filters: {},
    settings: {
        fov: 90,
        brightness: 1.0,
        contrast: 1.0,
        saturation: 1.0,
        sepia: 0.0,
        grayscale: 0.0,
        blur: 0.0,
        vignette: 0.0
    },
    
    init() {
        console.log('📸 Phase 24: Photo Mode initialized');
        this.defineFilters();
    },
    
    defineFilters() {
        this.filters = {
            normal: { name: 'Normal', settings: {} },
            vintage: { 
                name: 'Vintage',
                settings: { sepia: 0.4, contrast: 1.1, saturation: 0.8 }
            },
            horror: {
                name: 'Horror',
                settings: { contrast: 1.3, saturation: 0.6, vignette: 0.5 }
            },
            vibrant: {
                name: 'Vibrant',
                settings: { saturation: 1.5, contrast: 1.1 }
            },
            noir: {
                name: 'Noir',
                settings: { grayscale: 1.0, contrast: 1.4 }
            },
            dream: {
                name: 'Dream',
                settings: { blur: 0.3, brightness: 1.2, saturation: 1.2 }
            },
            cursed: {
                name: 'Cursed',
                settings: { hue: 0.3, contrast: 1.5, vignette: 0.6 }
            }
        };
    },
    
    togglePhotoMode() {
        this.active = !this.active;
        
        if (this.active) {
            gamePaused = true;
            showBossMessage('📸 Photo Mode Activated', '#FFDD44');
            this.showPhotoUI();
        } else {
            gamePaused = false;
            this.hidePhotoUI();
        }
    },
    
    applyFilter(filterName) {
        const filter = this.filters[filterName];
        if (!filter) return;
        
        Object.assign(this.settings, filter.settings);
        this.updateCanvasFilters();
    },
    
    updateCanvasFilters() {
        const canvas = document.getElementById('game-canvas');
        if (!canvas) return;
        
        const filterString = `
            brightness(${this.settings.brightness})
            contrast(${this.settings.contrast})
            saturate(${this.settings.saturation})
            sepia(${this.settings.sepia})
            grayscale(${this.settings.grayscale})
            blur(${this.settings.blur}px)
        `.trim();
        
        canvas.style.filter = filterString;
    },
    
    takeScreenshot() {
        const canvas = document.getElementById('game-canvas');
        if (!canvas) return;
        
        // Create screenshot
        const dataURL = canvas.toDataURL('image/png');
        
        // Add metadata
        const metadata = {
            timestamp: new Date().toISOString(),
            location: { x: player.x, y: player.y },
            biome: getCurrentBiome(),
            settings: { ...this.settings }
        };
        
        // Save to gallery
        this.saveToGallery(dataURL, metadata);
        
        showFloatingText('📷 Screenshot Saved!', window.innerWidth / 2, 100, '#44FF88');
    },
    
    saveToGallery(dataURL, metadata) {
        const gallery = JSON.parse(localStorage.getItem('cursed_depths_gallery') || '[]');
        
        gallery.push({
            id: Date.now().toString(),
            dataURL,
            metadata,
            date: new Date().toLocaleDateString()
        });
        
        // Keep only last 50 screenshots
        if (gallery.length > 50) {
            gallery.splice(0, gallery.length - 50);
        }
        
        localStorage.setItem('cursed_depths_gallery', JSON.stringify(gallery));
    },
    
    showPhotoUI() {
        const ui = document.createElement('div');
        ui.id = 'photo-mode-ui';
        ui.style.cssText = `
            position: absolute;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0,0,0,0.8);
            border: 2px solid #FFDD44;
            border-radius: 10px;
            padding: 20px;
            color: white;
            font-family: 'Inter', sans-serif;
            z-index: 10000;
            display: flex;
            gap: 20px;
        `;
        
        ui.innerHTML = `
            <div>
                <strong>Filters:</strong><br>
                <button onclick="PhotoMode.applyFilter('normal')">Normal</button>
                <button onclick="PhotoMode.applyFilter('vintage')">Vintage</button>
                <button onclick="PhotoMode.applyFilter('horror')">Horror</button>
                <button onclick="PhotoMode.applyFilter('vibrant')">Vibrant</button>
                <button onclick="PhotoMode.applyFilter('noir')">Noir</button>
                <button onclick="PhotoMode.applyFilter('dream')">Dream</button>
                <button onclick="PhotoMode.applyFilter('cursed')">Cursed</button>
            </div>
            <div>
                <strong>Capture:</strong><br>
                <button onclick="PhotoMode.takeScreenshot()">📷 Screenshot</button>
                <button onclick="PhotoMode.togglePhotoMode()">Exit</button>
            </div>
        `;
        
        document.getElementById('game-container').appendChild(ui);
    },
    
    hidePhotoUI() {
        const ui = document.getElementById('photo-mode-ui');
        if (ui) ui.remove();
        
        // Reset filters
        const canvas = document.getElementById('game-canvas');
        if (canvas) {
            canvas.style.filter = 'none';
        }
    }
};

// ===== PHASE 25: MUSIC & SOUNDTRACK =====
const MusicSystem = {
    unlockedTracks: [],
    currentTrack: null,
    volume: 0.7,
    
    init() {
        console.log('🎵 Phase 25: Music System initialized');
        this.defineSoundtrack();
        this.loadUnlockedTracks();
    },
    
    defineSoundtrack() {
        this.soundtrack = {
            // BIOME THEMES
            forest_day: {
                id: 'forest_day',
                name: 'Whispering Woods',
                location: 'forest',
                time: 'day',
                mood: 'peaceful',
                duration: 180
            },
            forest_night: {
                id: 'forest_night',
                name: 'Shadows Stir',
                location: 'forest',
                time: 'night',
                mood: 'eerie',
                duration: 180
            },
            desert: {
                id: 'desert',
                name: 'Scorching Sands',
                location: 'desert',
                time: 'any',
                mood: 'intense',
                duration: 165
            },
            snow: {
                id: 'snow',
                name: 'Frozen Wastes',
                location: 'snow',
                time: 'any',
                mood: 'melancholic',
                duration: 195
            },
            jungle: {
                id: 'jungle',
                name: 'Primordial Pulse',
                location: 'jungle',
                time: 'any',
                mood: 'mysterious',
                duration: 210
            },
            corruption: {
                id: 'corruption',
                name: 'Void Corruption',
                location: 'corruption',
                time: 'any',
                mood: 'dark',
                duration: 185
            },
            crimson: {
                id: 'crimson',
                name: 'Crimson Heartbeat',
                location: 'crimson',
                time: 'any',
                mood: 'horrific',
                duration: 190
            },
            hallow: {
                id: 'hallow',
                name: 'Celestial Harmony',
                location: 'hallow',
                time: 'any',
                mood: 'ethereal',
                duration: 200
            },
            
            // BOSS THEMES
            boss_eye: {
                id: 'boss_eye',
                name: 'Watching Terror',
                boss: 'eye_of_terror',
                mood: 'intense',
                duration: 150
            },
            boss_bone: {
                id: 'boss_bone',
                name: 'Colossal Bones',
                boss: 'bone_colossus',
                mood: 'epic',
                duration: 165
            },
            boss_demon: {
                id: 'boss_demon',
                name: 'Demon Lord\'s Rise',
                boss: 'demon_lord',
                mood: 'intense',
                duration: 180
            },
            
            // EVENT THEMES
            blood_moon: {
                id: 'blood_moon',
                name: 'Night of Blood',
                event: 'blood_moon',
                mood: 'terrifying',
                duration: 240
            },
            invasion: {
                id: 'invasion',
                name: 'Army at the Gates',
                event: 'invasion',
                mood: 'urgent',
                duration: 200
            },
            
            // SPECIAL THEMES
            title_screen: {
                id: 'title_screen',
                name: 'Cursed Depths Main Theme',
                location: 'menu',
                mood: 'epic',
                duration: 120
            },
            credits: {
                id: 'credits',
                name: 'Journey\'s End',
                location: 'credits',
                mood: 'triumphant',
                duration: 300
            }
        };
    },
    
    loadUnlockedTracks() {
        const saved = localStorage.getItem('cursed_depths_music');
        if (saved) {
            this.unlockedTracks = JSON.parse(saved);
        } else {
            // Unlock default tracks
            this.unlockedTracks = ['title_screen', 'forest_day', 'forest_night'];
        }
    },
    
    saveUnlockedTracks() {
        localStorage.setItem('cursed_depths_music', JSON.stringify(this.unlockedTracks));
    },
    
    unlockTrack(trackId) {
        if (!this.unlockedTracks.includes(trackId)) {
            this.unlockedTracks.push(trackId);
            this.saveUnlockedTracks();
            
            const track = this.soundtrack[trackId];
            showBossMessage(`🎵 Track Unlocked: ${track.name}`, '#FFDD44');
        }
    },
    
    changeTrack(trackId) {
        if (!this.unlockedTracks.includes(trackId)) return;
        
        this.currentTrack = trackId;
        const track = this.soundtrack[trackId];
        
        // In a real implementation, this would play audio
        console.log(`🎵 Now Playing: ${track.name}`);
    },
    
    autoSelectTrack(location, time, event) {
        // Find appropriate track for current situation
        let trackId = null;
        
        // Check for boss first
        if (activeBoss) {
            const bossTrack = Object.values(this.soundtrack).find(t => t.boss === activeBoss.type);
            if (bossTrack) trackId = bossTrack.id;
        }
        
        // Check for events
        if (!trackId && event) {
            const eventTrack = Object.values(this.soundtrack).find(t => t.event === event);
            if (eventTrack) trackId = eventTrack.id;
        }
        
        // Default to biome theme
        if (!trackId) {
            const biomeTrack = Object.values(this.soundtrack).find(t => 
                t.location === location && (t.time === time || t.time === 'any')
            );
            if (biomeTrack) trackId = biomeTrack.id;
        }
        
        if (trackId && trackId !== this.currentTrack) {
            this.changeTrack(trackId);
        }
    },
    
    renderMusicPlayer(ctx) {
        if (!this.currentTrack) return;
        
        const track = this.soundtrack[this.currentTrack];
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(20, window.innerHeight - 80, 300, 60);
        
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 14px Inter';
        ctx.textAlign = 'left';
        ctx.fillText(`🎵 ${track.name}`, 30, window.innerHeight - 50);
        
        ctx.font = '12px Inter';
        ctx.fillStyle = '#AAAAAA';
        ctx.fillText(track.mood.toUpperCase(), 30, window.innerHeight - 30);
    }
};

// ===== BONUS: ANIMATED WORLD CREATOR =====
const WorldCreator = {
    generating: false,
    progress: 0,
    animationFrame: 0,
    
    init() {
        console.log('🌍 Bonus: Animated World Creator initialized');
    },
    
    generateWorld(config = {}) {
        if (this.generating) return;
        
        this.generating = true;
        this.progress = 0;
        this.animationFrame = 0;
        
        const worldConfig = {
            seed: config.seed || Date.now(),
            width: config.width || 800,
            height: config.height || 400,
            terrain: config.terrain || 'mixed',
            biomes: config.biomes || ['forest', 'desert', 'snow', 'jungle'],
            structures: config.structures || true,
            ores: config.ores || true
        };
        
        this.showGenerationUI(worldConfig);
        this.animateGeneration(worldConfig);
    },
    
    showGenerationUI(config) {
        const ui = document.createElement('div');
        ui.id = 'world-gen-ui';
        ui.style.cssText = `
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.9);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: white;
            font-family: 'Inter', sans-serif;
            z-index: 10001;
        `;
        
        ui.innerHTML = `
            <h1 style="font-size: 48px; margin-bottom: 20px;">🌍 Generating World...</h1>
            <p style="font-size: 18px; color: #AAAAAA;">Seed: ${config.seed}</p>
            <p style="font-size: 18px; color: #AAAAAA;">Size: ${config.width}x${config.height}</p>
            <div style="width: 600px; height: 30px; background: #333; border-radius: 15px; margin: 20px; overflow: hidden;">
                <div id="gen-progress" style="width: 0%; height: 100%; background: linear-gradient(90deg, #44FF44, #4488FF); transition: width 0.3s;"></div>
            </div>
            <p id="gen-status" style="font-size: 16px; color: #44FF88;">Initializing...</p>
            <canvas id="gen-preview" width="400" height="200" style="border: 2px solid #4488FF; border-radius: 10px; margin-top: 20px;"></canvas>
        `;
        
        document.body.appendChild(ui);
    },
    
    animateGeneration(config) {
        const statusEl = document.getElementById('gen-status');
        const progressEl = document.getElementById('gen-progress');
        const previewCanvas = document.getElementById('gen-preview');
        const previewCtx = previewCanvas.getContext('2d');
        
        const steps = [
            'Generating terrain heightmap...',
            'Placing biomes...',
            'Creating caves and caverns...',
            'Distributing ores and gems...',
            'Building structures...',
            'Populating enemies...',
            'Finalizing world...'
        ];
        
        let stepIndex = 0;
        
        const animate = () => {
            this.animationFrame++;
            this.progress = Math.min(100, (this.animationFrame / 100) * 100);
            
            // Update UI
            progressEl.style.width = `${this.progress}%`;
            statusEl.textContent = steps[Math.floor((this.progress / 100) * steps.length)];
            
            // Animate preview
            this.renderGenerationPreview(previewCtx, config, this.progress);
            
            if (this.progress < 100) {
                requestAnimationFrame(animate);
            } else {
                setTimeout(() => this.completeGeneration(config), 1000);
            }
        };
        
        animate();
    },
    
    renderGenerationPreview(ctx, config, progress) {
        const width = ctx.canvas.width;
        const height = ctx.canvas.height;
        
        // Clear
        ctx.fillStyle = '#000022';
        ctx.fillRect(0, 0, width, height);
        
        // Generate animated terrain preview
        const noise = this.createNoise(config.seed);
        
        for (let x = 0; x < width; x++) {
            const terrainHeight = noise(x / 50) * 50 + height / 2;
            
            // Draw terrain columns with animation
            const columnProgress = (x / width) * 100;
            if (columnProgress <= progress) {
                const gradient = ctx.createLinearGradient(0, terrainHeight, 0, height);
                gradient.addColorStop(0, '#2D5A1E'); // Grass
                gradient.addColorStop(0.3, '#5C3A1E'); // Dirt
                gradient.addColorStop(1, '#666666'); // Stone
                
                ctx.fillStyle = gradient;
                ctx.fillRect(x, terrainHeight, 1, height - terrainHeight);
            }
        }
        
        // Draw animated overlay effects
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#44FF44';
        for (let i = 0; i < 20; i++) {
            const x = (Date.now() / 50 + i * 50) % width;
            const y = height - Math.random() * 50;
            ctx.fillRect(x, y, 2, 2);
        }
        ctx.globalAlpha = 1.0;
    },
    
    createNoise(seed) {
        // Simple pseudo-random noise function
        return (x) => {
            const n = Math.sin(x * 12.9898 + seed) * 43758.5453;
            return n - Math.floor(n);
        };
    },
    
    completeGeneration(config) {
        this.generating = false;
        
        // Remove UI
        const ui = document.getElementById('world-gen-ui');
        if (ui) ui.remove();
        
        // Create actual world data
        const worldData = this.createWorldData(config);
        
        // Save world
        localStorage.setItem('cursed_depths_world', JSON.stringify(worldData));
        
        showBossMessage('🌍 World Generated Successfully!', '#44FF88');
        
        // Auto-load world
        this.loadWorld(worldData);
    },
    
    createWorldData(config) {
        const rng = this.createRNG(config.seed);
        const world = {
            seed: config.seed,
            width: config.width,
            height: config.height,
            tiles: [],
            biomes: [],
            structures: [],
            chests: [],
            npcs: []
        };
        
        // Generate terrain
        for (let x = 0; x < config.width; x++) {
            world.tiles[x] = [];
            
            // Surface height
            const surfaceY = Math.floor(config.height * 0.3 + Math.sin(x / 50) * 20);
            
            for (let y = 0; y < config.height; y++) {
                let tileType = 'air';
                
                if (y > surfaceY) {
                    if (y < surfaceY + 5) {
                        tileType = 'dirt';
                    } else if (y < surfaceY + 20) {
                        tileType = Math.random() < 0.1 ? 'stone' : 'dirt';
                    } else {
                        tileType = 'stone';
                        
                        // Ores
                        if (config.ores && y > surfaceY + 30) {
                            const oreRoll = rng.next();
                            if (oreRoll < 0.02) tileType = 'iron_ore';
                            else if (oreRoll < 0.01) tileType = 'gold_ore';
                            else if (oreRoll < 0.005) tileType = 'diamond_ore';
                        }
                    }
                } else if (y === surfaceY) {
                    tileType = 'grass';
                }
                
                world.tiles[x][y] = {
                    type: tileType,
                    discovered: false
                };
            }
        }
        
        return world;
    },
    
    createRNG(seed) {
        let s = seed;
        return {
            next() {
                s = (s * 1664525 + 1013904223) % 4294967296;
                return s / 4294967296;
            }
        };
    },
    
    loadWorld(worldData) {
        // Initialize game with generated world
        WORLD_W = worldData.width;
        WORLD_H = worldData.height;
        worldTiles = worldData.tiles;
        
        // Set player spawn
        player.x = WORLD_W * TILE / 2;
        player.y = 100;
        
        showBossMessage('World Loaded! Explore your new realm!', '#44FF88');
    }
};

// Export globally
window.TransmogSystem = TransmogSystem;
window.PhotoMode = PhotoMode;
window.MusicSystem = MusicSystem;
window.WorldCreator = WorldCreator;

console.log('🎭📸🎵🌍 Phases 23-25 + World Creator loaded');

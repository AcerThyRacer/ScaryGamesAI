/**
 * Phase 5 AI Features UI
 * 
 * User interface for managing advanced AI features
 */

class Phase5UI {
    constructor() {
        this.phase5 = window.phase5Features || null;
        this.currentGame = null;
        this.currentTab = 'refinement';
        
        this._init();
    }
    
    _init() {
        console.log('[Phase5-UI] Initializing UI...');
        
        // Wait for phase5 features to load
        if (document.readyState === 'complete') {
            this._setupUI();
        } else {
            window.addEventListener('load', () => this._setupUI());
        }
    }
    
    _setupUI() {
        // Create floating button to open Phase 5 panel
        this._createFloatingButton();
        
        // Create main panel
        this._createMainPanel();
        
        // Setup event listeners
        this._setupEventListeners();
        
        console.log('[Phase5-UI] UI initialized');
    }
    
    _createFloatingButton() {
        const button = document.createElement('button');
        button.id = 'phase5-trigger';
        button.className = 'phase5-floating-btn';
        button.innerHTML = `
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
            <span>AI Lab</span>
        `;
        button.title = 'Open AI Features';
        
        document.body.appendChild(button);
        
        this.floatingButton = button;
    }
    
    _createMainPanel() {
        const panel = document.createElement('div');
        panel.id = 'phase5-panel';
        panel.className = 'phase5-panel';
        panel.innerHTML = `
            <div class="phase5-panel-header">
                <h2>AI Features Lab</h2>
                <button class="phase5-close-btn">&times;</button>
            </div>
            
            <div class="phase5-panel-tabs">
                <button class="phase5-tab active" data-tab="refinement">Game Refinement</button>
                <button class="phase5-tab" data-tab="generation">Multimodal</button>
                <button class="phase5-tab" data-tab="assistance">Smart Assist</button>
            </div>
            
            <div class="phase5-panel-content">
                <!-- Game Refinement Tab -->
                <div class="phase5-tab-content active" data-content="refinement">
                    <div class="phase5-section">
                        <h3>Make It Your Own</h3>
                        <p class="phase5-description">Tell the AI how to modify your game</p>
                        
                        <div class="phase5-input-group">
                            <input type="text" 
                                   id="refinement-instruction" 
                                   placeholder="e.g., Make it harder, Add more enemies, Add a boss"
                                   class="phase5-input">
                            <button id="refine-btn" class="phase5-btn primary">Apply</button>
                        </div>
                        
                        <div class="phase5-presets">
                            <h4>Quick Presets</h4>
                            <div class="phase5-preset-buttons">
                                <button class="phase5-preset" data-instruction="Make it harder">Harder</button>
                                <button class="phase5-preset" data-instruction="Add more enemies">More Enemies</button>
                                <button class="phase5-preset" data-instruction="Make it easier">Easier</button>
                                <button class="phase5-preset" data-instruction="Make it scarier">Scarier</button>
                                <button class="phase5-preset" data-instruction="Add a boss">Add Boss</button>
                                <button class="phase5-preset" data-instruction="Add power-ups">Power-ups</button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="phase5-section">
                        <h3>Style Transfer</h3>
                        <p class="phase5-description">Change the visual theme</p>
                        
                        <div class="phase5-style-grid">
                            <button class="phase5-style-btn" data-style="pixel">
                                <span class="style-preview pixel-preview"></span>
                                <span>Pixel</span>
                            </button>
                            <button class="phase5-style-btn" data-style="neon">
                                <span class="style-preview neon-preview"></span>
                                <span>Neon</span>
                            </button>
                            <button class="phase5-style-btn" data-style="realistic">
                                <span class="style-preview realistic-preview"></span>
                                <span>Realistic</span>
                            </button>
                            <button class="phase5-style-btn" data-style="dark">
                                <span class="style-preview dark-preview"></span>
                                <span>Dark</span>
                            </button>
                            <button class="phase5-style-btn" data-style="nightmare">
                                <span class="style-preview nightmare-preview"></span>
                                <span>Nightmare</span>
                            </button>
                            <button class="phase5-style-btn" data-style="retro">
                                <span class="style-preview retro-preview"></span>
                                <span>Retro</span>
                            </button>
                            <button class="phase5-style-btn" data-style="comic">
                                <span class="style-preview comic-preview"></span>
                                <span>Comic</span>
                            </button>
                            <button class="phase5-style-btn" data-style="low-poly">
                                <span class="style-preview lowpoly-preview"></span>
                                <span>Low Poly</span>
                            </button>
                        </div>
                    </div>
                    
                    <div class="phase5-section">
                        <h3>Bug Analysis</h3>
                        <button id="analyze-bugs-btn" class="phase5-btn secondary">Scan for Issues</button>
                        <div id="bug-results" class="phase5-results"></div>
                    </div>
                </div>
                
                <!-- Multimodal Tab -->
                <div class="phase5-tab-content" data-content="generation">
                    <div class="phase5-section">
                        <h3>Audio Generation</h3>
                        <p class="phase5-description">Generate AI music and sound effects</p>
                        
                        <div class="phase5-audio-controls">
                            <select id="audio-type" class="phase5-select">
                                <option value="music">Background Music</option>
                                <option value="sfx">Sound Effects</option>
                            </select>
                            
                            <select id="audio-style" class="phase5-select">
                                <option value="horror">Horror</option>
                                <option value="action">Action</option>
                                <option value="ambient">Ambient</option>
                                <option value="menu">Menu</option>
                            </select>
                            
                            <input type="range" id="audio-duration" min="5" max="60" value="10" class="phase5-range">
                            <label for="audio-duration">Duration: <span id="duration-value">10</span>s</label>
                        </div>
                        
                        <button id="generate-audio-btn" class="phase5-btn primary">Generate Audio</button>
                        
                        <div id="audio-player" class="phase5-audio-player"></div>
                    </div>
                    
                    <div class="phase5-section">
                        <h3>Voice Narration</h3>
                        <p class="phase5-description">Add AI voice to your game</p>
                        
                        <textarea id="narration-text" 
                                  class="phase5-textarea"
                                  placeholder="Enter text to narrate..."
                                  rows="3"></textarea>
                        
                        <select id="narration-style" class="phase5-select">
                            <option value="narrator">Narrator</option>
                            <option value="creepy">Creepy</option>
                            <option value="dramatic">Dramatic</option>
                            <option value="whispered">Whispered</option>
                        </select>
                        
                        <button id="generate-narration-btn" class="phase5-btn primary">Generate Narration</button>
                    </div>
                    
                    <div class="phase5-section">
                        <h3>Image to Game</h3>
                        <p class="phase5-description">Generate a game from concept art</p>
                        
                        <input type="text" 
                               id="image-url" 
                               placeholder="Enter image URL..."
                               class="phase5-input">
                        
                        <button id="generate-from-image-btn" class="phase5-btn secondary">Generate Game</button>
                    </div>
                </div>
                
                <!-- Smart Assistance Tab -->
                <div class="phase5-tab-content" data-content="assistance">
                    <div class="phase5-section">
                        <h3>Game Analyzer</h3>
                        <p class="phase5-description">Get AI-powered suggestions to improve your game</p>
                        
                        <button id="analyze-game-btn" class="phase5-btn primary">Analyze Game</button>
                        
                        <div id="analysis-results" class="phase5-results"></div>
                    </div>
                    
                    <div class="phase5-section">
                        <h3>Balance Calculator</h3>
                        <p class="phase5-description">Fine-tune difficulty for perfect gameplay</p>
                        
                        <div class="phase5-balance-inputs">
                            <div class="phase5-input-row">
                                <label>Target Completion Rate:</label>
                                <input type="range" id="target-completion" min="0" max="100" value="30" class="phase5-range">
                                <span id="completion-value">30%</span>
                            </div>
                            <div class="phase5-input-row">
                                <label>Target Session (minutes):</label>
                                <input type="range" id="target-session" min="1" max="30" value="3" class="phase5-range">
                                <span id="session-value">3</span>
                            </div>
                        </div>
                        
                        <button id="calculate-balance-btn" class="phase5-btn secondary">Calculate</button>
                        
                        <div id="balance-results" class="phase5-results"></div>
                    </div>
                    
                    <div class="phase5-section">
                        <h3>Playtest Simulator</h3>
                        <p class="phase5-description">Let AI play your game and find issues</p>
                        
                        <div class="phase5-playtest-controls">
                            <label>Iterations:</label>
                            <input type="number" id="playtest-iterations" min="1" max="50" value="10" class="phase5-number">
                        </div>
                        
                        <button id="run-playtest-btn" class="phase5-btn primary">Run Simulation</button>
                        
                        <div id="playtest-results" class="phase5-results"></div>
                    </div>
                </div>
            </div>
            
            <div class="phase5-panel-footer">
                <div class="phase5-tier-badge" id="tier-badge">Free Tier</div>
                <a href="#" class="phase5-upgrade-link">Upgrade for more</a>
            </div>
        `;
        
        document.body.appendChild(panel);
        this.panel = panel;
        
        // Create styles
        this._createStyles();
    }
    
    _createStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* Floating Button */
            .phase5-floating-btn {
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 9999;
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 12px 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                border-radius: 50px;
                cursor: pointer;
                font-weight: 600;
                font-size: 14px;
                box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
                transition: all 0.3s ease;
            }
            
            .phase5-floating-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
            }
            
            .phase5-floating-btn svg {
                animation: phase5-pulse 2s infinite;
            }
            
            @keyframes phase5-pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.6; }
            }
            
            /* Main Panel */
            .phase5-panel {
                position: fixed;
                top: 0;
                right: -450px;
                width: 450px;
                height: 100vh;
                background: #1a1a2e;
                color: #eee;
                z-index: 10000;
                display: flex;
                flex-direction: column;
                transition: right 0.3s ease;
                box-shadow: -5px 0 30px rgba(0, 0, 0, 0.5);
                font-family: 'Inter', system-ui, sans-serif;
            }
            
            .phase5-panel.open {
                right: 0;
            }
            
            .phase5-panel-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            
            .phase5-panel-header h2 {
                margin: 0;
                font-size: 18px;
                font-weight: 600;
            }
            
            .phase5-close-btn {
                background: none;
                border: none;
                color: white;
                font-size: 24px;
                cursor: pointer;
                padding: 0;
                line-height: 1;
            }
            
            /* Tabs */
            .phase5-panel-tabs {
                display: flex;
                background: #16213e;
                padding: 10px;
                gap: 5px;
            }
            
            .phase5-tab {
                flex: 1;
                padding: 10px 5px;
                background: transparent;
                border: none;
                color: #888;
                cursor: pointer;
                font-size: 12px;
                border-radius: 8px;
                transition: all 0.2s;
            }
            
            .phase5-tab.active {
                background: #667eea;
                color: white;
            }
            
            .phase5-tab:hover:not(.active) {
                background: rgba(102, 126, 234, 0.2);
                color: #aaa;
            }
            
            /* Content */
            .phase5-panel-content {
                flex: 1;
                overflow-y: auto;
                padding: 20px;
            }
            
            .phase5-tab-content {
                display: none;
            }
            
            .phase5-tab-content.active {
                display: block;
            }
            
            /* Sections */
            .phase5-section {
                background: #16213e;
                border-radius: 12px;
                padding: 16px;
                margin-bottom: 16px;
            }
            
            .phase5-section h3 {
                margin: 0 0 8px 0;
                font-size: 16px;
                color: #fff;
            }
            
            .phase5-description {
                margin: 0 0 16px 0;
                font-size: 13px;
                color: #888;
            }
            
            /* Inputs */
            .phase5-input-group {
                display: flex;
                gap: 10px;
                margin-bottom: 16px;
            }
            
            .phase5-input {
                flex: 1;
                padding: 10px 14px;
                background: #0f3460;
                border: 1px solid #1a1a2e;
                border-radius: 8px;
                color: #eee;
                font-size: 14px;
            }
            
            .phase5-input:focus {
                outline: none;
                border-color: #667eea;
            }
            
            .phase5-select {
                width: 100%;
                padding: 10px;
                background: #0f3460;
                border: 1px solid #1a1a2e;
                border-radius: 8px;
                color: #eee;
                font-size: 14px;
                margin-bottom: 12px;
            }
            
            .phase5-textarea {
                width: 100%;
                padding: 10px;
                background: #0f3460;
                border: 1px solid #1a1a2e;
                border-radius: 8px;
                color: #eee;
                font-size: 14px;
                resize: vertical;
                margin-bottom: 12px;
                font-family: inherit;
            }
            
            .phase5-range {
                width: 100%;
                margin: 8px 0;
            }
            
            .phase5-number {
                width: 80px;
                padding: 8px;
                background: #0f3460;
                border: 1px solid #1a1a2e;
                border-radius: 8px;
                color: #eee;
                font-size: 14px;
            }
            
            /* Buttons */
            .phase5-btn {
                padding: 10px 20px;
                border: none;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .phase5-btn.primary {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                width: 100%;
            }
            
            .phase5-btn.primary:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
            }
            
            .phase5-btn.secondary {
                background: #0f3460;
                color: #aaa;
                width: 100%;
            }
            
            .phase5-btn.secondary:hover {
                background: #1a1a2e;
                color: #fff;
            }
            
            .phase5-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
            
            /* Presets */
            .phase5-presets h4 {
                margin: 0 0 10px 0;
                font-size: 13px;
                color: #888;
            }
            
            .phase5-preset-buttons {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
            }
            
            .phase5-preset {
                padding: 8px 14px;
                background: #0f3460;
                border: 1px solid #1a1a2e;
                border-radius: 20px;
                color: #aaa;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .phase5-preset:hover {
                background: #667eea;
                color: white;
                border-color: #667eea;
            }
            
            /* Style Grid */
            .phase5-style-grid {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 10px;
            }
            
            .phase5-style-btn {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 6px;
                padding: 10px;
                background: #0f3460;
                border: 1px solid #1a1a2e;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .phase5-style-btn span:last-child {
                font-size: 11px;
                color: #aaa;
            }
            
            .phase5-style-btn:hover {
                border-color: #667eea;
            }
            
            .style-preview {
                width: 40px;
                height: 40px;
                border-radius: 6px;
            }
            
            .pixel-preview {
                background: 
                    linear-gradient(45deg, #1a1a2e 25%, transparent 25%),
                    linear-gradient(-45deg, #1a1a2e 25%, transparent 25%),
                    linear-gradient(45deg, transparent 75%, #e94560 75%),
                    linear-gradient(-45deg, transparent 75%, #e94560 75%);
                background-size: 8px 8px;
                background-color: #0f3460;
            }
            
            .neon-preview {
                background: linear-gradient(135deg, #ff00ff, #00ffff);
            }
            
            .realistic-preview {
                background: linear-gradient(135deg, #2d2d2d, #4a4a4a);
            }
            
            .dark-preview {
                background: #0a0a0a;
            }
            
            .nightmare-preview {
                background: linear-gradient(180deg, #0d0000, #4a0a0a);
            }
            
            .retro-preview {
                background: #000;
                box-shadow: inset 0 0 10px #00ff00;
            }
            
            .comic-preview {
                background: 
                    radial-gradient(circle, #ff0000 20%, transparent 20%),
                    radial-gradient(circle, #0000ff 20%, transparent 20%),
                    #ffff00;
                background-size: 10px 10px;
                background-position: 0 0, 5px 5px;
            }
            
            .lowpoly-preview {
                background: linear-gradient(135deg, #1e3a5f, #98c1d9);
                clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
            }
            
            /* Audio Controls */
            .phase5-audio-controls {
                margin-bottom: 12px;
            }
            
            .phase5-audio-player {
                margin-top: 12px;
            }
            
            .phase5-audio-player audio {
                width: 100%;
            }
            
            /* Results */
            .phase5-results {
                margin-top: 16px;
                padding: 12px;
                background: #0f3460;
                border-radius: 8px;
                font-size: 13px;
                display: none;
            }
            
            .phase5-results.show {
                display: block;
            }
            
            .phase5-result-item {
                padding: 8px;
                margin-bottom: 8px;
                background: #1a1a2e;
                border-radius: 6px;
            }
            
            .phase5-result-item.warning {
                border-left: 3px solid #f39c12;
            }
            
            .phase5-result-item.error {
                border-left: 3px solid #e74c3c;
            }
            
            .phase5-result-item.success {
                border-left: 3px solid #2ecc71;
            }
            
            /* Balance Inputs */
            .phase5-balance-inputs {
                margin-bottom: 12px;
            }
            
            .phase5-input-row {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 10px;
                font-size: 13px;
            }
            
            .phase5-input-row label {
                flex: 1;
                color: #aaa;
            }
            
            .phase5-input-row input[type="range"] {
                flex: 2;
            }
            
            .phase5-input-row span {
                width: 40px;
                text-align: right;
                color: #667eea;
            }
            
            /* Playtest Controls */
            .phase5-playtest-controls {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 12px;
            }
            
            .phase5-playtest-controls label {
                color: #aaa;
                font-size: 13px;
            }
            
            /* Footer */
            .phase5-panel-footer {
                padding: 16px 20px;
                background: #16213e;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .phase5-tier-badge {
                padding: 6px 12px;
                background: #0f3460;
                border-radius: 20px;
                font-size: 12px;
                color: #888;
            }
            
            .phase5-upgrade-link {
                color: #667eea;
                font-size: 12px;
                text-decoration: none;
            }
            
            .phase5-upgrade-link:hover {
                text-decoration: underline;
            }
            
            /* Loading Spinner */
            .phase5-loading {
                display: inline-block;
                width: 16px;
                height: 16px;
                border: 2px solid rgba(255,255,255,0.3);
                border-radius: 50%;
                border-top-color: white;
                animation: phase5-spin 1s linear infinite;
                margin-right: 8px;
            }
            
            @keyframes phase5-spin {
                to { transform: rotate(360deg); }
            }
            
            /* Scrollbar */
            .phase5-panel-content::-webkit-scrollbar {
                width: 6px;
            }
            
            .phase5-panel-content::-webkit-scrollbar-track {
                background: #1a1a2e;
            }
            
            .phase5-panel-content::-webkit-scrollbar-thumb {
                background: #0f3460;
                border-radius: 3px;
            }
            
            .phase5-panel-content::-webkit-scrollbar-thumb:hover {
                background: #667eea;
            }
        `;
        
        document.head.appendChild(style);
    }
    
    _setupEventListeners() {
        // Floating button toggle
        this.floatingButton?.addEventListener('click', () => {
            this.panel?.classList.toggle('open');
        });
        
        // Close button
        this.panel?.querySelector('.phase5-close-btn')?.addEventListener('click', () => {
            this.panel?.classList.remove('open');
        });
        
        // Tab switching
        this.panel?.querySelectorAll('.phase5-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                this._switchTab(tabName);
            });
        });
        
        // Refinement input
        const refineBtn = document.getElementById('refine-btn');
        refineBtn?.addEventListener('click', () => this._handleRefine());
        
        // Preset buttons
        this.panel?.querySelectorAll('.phase5-preset').forEach(preset => {
            preset.addEventListener('click', () => {
                const instruction = preset.dataset.instruction;
                document.getElementById('refinement-instruction').value = instruction;
                this._handleRefine();
            });
        });
        
        // Style transfer buttons
        this.panel?.querySelectorAll('.phase5-style-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const style = btn.dataset.style;
                this._handleStyleTransfer(style);
            });
        });
        
        // Bug analysis
        document.getElementById('analyze-bugs-btn')?.addEventListener('click', () => this._handleBugAnalysis());
        
        // Audio generation
        document.getElementById('generate-audio-btn')?.addEventListener('click', () => this._handleAudioGeneration());
        
        // Duration slider
        document.getElementById('audio-duration')?.addEventListener('input', (e) => {
            document.getElementById('duration-value').textContent = e.target.value;
        });
        
        // Narration generation
        document.getElementById('generate-narration-btn')?.addEventListener('click', () => this._handleNarrationGeneration());
        
        // Image to game
        document.getElementById('generate-from-image-btn')?.addEventListener('click', () => this._handleImageToGame());
        
        // Game analyzer
        document.getElementById('analyze-game-btn')?.addEventListener('click', () => this._handleGameAnalysis());
        
        // Balance calculator
        document.getElementById('calculate-balance-btn')?.addEventListener('click', () => this._handleBalanceCalculation());
        
        // Target sliders
        document.getElementById('target-completion')?.addEventListener('input', (e) => {
            document.getElementById('completion-value').textContent = e.target.value + '%';
        });
        
        document.getElementById('target-session')?.addEventListener('input', (e) => {
            document.getElementById('session-value').textContent = e.target.value;
        });
        
        // Playtest simulator
        document.getElementById('run-playtest-btn')?.addEventListener('click', () => this._handlePlaytest());
        
        // Update tier badge
        this._updateTierBadge();
    }
    
    _switchTab(tabName) {
        this.currentTab = tabName;
        
        this.panel?.querySelectorAll('.phase5-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });
        
        this.panel?.querySelectorAll('.phase5-tab-content').forEach(content => {
            content.classList.toggle('active', content.dataset.content === tabName);
        });
    }
    
    async _handleRefine() {
        const input = document.getElementById('refinement-instruction');
        const instruction = input?.value?.trim();
        
        if (!instruction) {
            alert('Please enter an instruction');
            return;
        }
        
        const btn = document.getElementById('refine-btn');
        const originalText = btn.textContent;
        btn.innerHTML = '<span class="phase5-loading"></span>Processing...';
        btn.disabled = true;
        
        try {
            const result = await this.phase5?.refineGame(this._getCurrentGameId(), instruction);
            
            if (result?.success) {
                this._showResult('refinement', `
                    <div class="phase5-result-item success">
                        <strong>Success!</strong><br>
                        Applied ${result.changes?.length || 0} changes to your game
                    </div>
                `);
            } else {
                this._showResult('refinement', `
                    <div class="phase5-result-item error">
                        ${result?.error || 'Failed to refine game'}
                    </div>
                `);
            }
        } catch (error) {
            this._showResult('refinement', `
                <div class="phase5-result-item error">Error: ${error.message}</div>
            `);
        }
        
        btn.textContent = originalText;
        btn.disabled = false;
    }
    
    async _handleStyleTransfer(style) {
        const btn = event.target.closest('.phase5-style-btn');
        const originalText = btn.querySelector('span:last-child').textContent;
        btn.querySelector('span:last-child').textContent = 'Applying...';
        btn.disabled = true;
        
        try {
            const result = await this.phase5?.transferStyle(this._getCurrentGameId(), style);
            
            if (result?.success) {
                this._showResult('refinement', `
                    <div class="phase5-result-item success">
                        <strong>Style Applied!</strong><br>
                        Changed to ${result.theme} theme
                    </div>
                `);
            } else {
                this._showResult('refinement', `
                    <div class="phase5-result-item error">
                        ${result?.error || 'Failed to apply style'}
                    </div>
                `);
            }
        } catch (error) {
            this._showResult('refinement', `
                <div class="phase5-result-item error">Error: ${error.message}</div>
            `);
        }
        
        btn.querySelector('span:last-child').textContent = originalText;
        btn.disabled = false;
    }
    
    async _handleBugAnalysis() {
        const btn = document.getElementById('analyze-bugs-btn');
        const resultsEl = document.getElementById('bug-results');
        
        btn.innerHTML = '<span class="phase5-loading"></span>Scanning...';
        btn.disabled = true;
        
        try {
            const result = await this.phase5?.analyzeAndFixBugs(this._getCurrentGameId());
            
            if (result?.success) {
                let html = `
                    <div class="phase5-result-item ${result.issuesFound > 0 ? 'warning' : 'success'}">
                        <strong>Analysis Complete</strong><br>
                        Found ${result.issuesFound} issues<br>
                        Applied ${result.fixesApplied} auto-fixes
                    </div>
                `;
                
                if (result.analysis?.issues?.length > 0) {
                    result.analysis.issues.forEach(issue => {
                        html += `
                            <div class="phase5-result-item warning">
                                <strong>${issue.type}:</strong> ${issue.description}
                            </div>
                        `;
                    });
                }
                
                this._showResult('refinement', html, 'bug-results');
            } else {
                this._showResult('refinement', `
                    <div class="phase5-result-item error">
                        ${result?.error || 'Failed to analyze'}
                    </div>
                `, 'bug-results');
            }
        } catch (error) {
            this._showResult('refinement', `
                <div class="phase5-result-item error">Error: ${error.message}</div>
            `, 'bug-results');
        }
        
        btn.textContent = 'Scan for Issues';
        btn.disabled = false;
    }
    
    async _handleAudioGeneration() {
        const type = document.getElementById('audio-type')?.value || 'music';
        const style = document.getElementById('audio-style')?.value || 'horror';
        const duration = parseInt(document.getElementById('audio-duration')?.value || 10);
        
        const btn = document.getElementById('generate-audio-btn');
        btn.innerHTML = '<span class="phase5-loading"></span>Generating...';
        btn.disabled = true;
        
        try {
            const result = await this.phase5?.generateAudio(type, style, duration);
            
            if (result?.success && result.url) {
                const playerEl = document.getElementById('audio-player');
                playerEl.innerHTML = `
                    <audio controls src="${result.url}">
                        Your browser does not support audio
                    </audio>
                `;
                
                this._showResult('generation', `
                    <div class="phase5-result-item success">
                        <strong>Audio Generated!</strong><br>
                        ${duration}s ${style} ${type}<br>
                        Click play to preview
                    </div>
                `, 'audio-player');
            } else {
                this._showResult('generation', `
                    <div class="phase5-result-item error">
                        ${result?.error || 'Failed to generate audio'}
                    </div>
                `, 'audio-player');
            }
        } catch (error) {
            this._showResult('generation', `
                <div class="phase5-result-item error">Error: ${error.message}</div>
            `, 'audio-player');
        }
        
        btn.textContent = 'Generate Audio';
        btn.disabled = false;
    }
    
    async _handleNarrationGeneration() {
        const text = document.getElementById('narration-text')?.value?.trim();
        const style = document.getElementById('narration-style')?.value || 'narrator';
        
        if (!text) {
            alert('Please enter text to narrate');
            return;
        }
        
        const btn = document.getElementById('generate-narration-btn');
        btn.innerHTML = '<span class="phase5-loading"></span>Generating...';
        btn.disabled = true;
        
        try {
            const result = await this.phase5?.generateNarration(text, style);
            
            if (result?.success) {
                this._showResult('generation', `
                    <div class="phase5-result-item success">
                        <strong>Narration Ready!</strong><br>
                        Style: ${result.style}<br>
                        ${result.note || 'Playing...'}
                    </div>
                `);
            } else {
                this._showResult('generation', `
                    <div class="phase5-result-item error">
                        ${result?.error || 'Failed to generate narration'}
                    </div>
                `);
            }
        } catch (error) {
            this._showResult('generation', `
                <div class="phase5-result-item error">Error: ${error.message}</div>
            `);
        }
        
        btn.textContent = 'Generate Narration';
        btn.disabled = false;
    }
    
    async _handleImageToGame() {
        const imageUrl = document.getElementById('image-url')?.value?.trim();
        
        if (!imageUrl) {
            alert('Please enter an image URL');
            return;
        }
        
        const btn = document.getElementById('generate-from-image-btn');
        btn.innerHTML = '<span class="phase5-loading"></span>Analyzing...';
        btn.disabled = true;
        
        try {
            const result = await this.phase5?.generateFromImage(imageUrl);
            
            if (result?.success) {
                this._showResult('generation', `
                    <div class="phase5-result-item success">
                        <strong>Image Analyzed!</strong><br>
                        Detected: ${result.analysis?.suggestedGenre}<br>
                        Style: ${result.analysis?.suggestedStyle}<br>
                        ${result.note || ''}
                    </div>
                `);
            } else {
                this._showResult('generation', `
                    <div class="phase5-result-item error">
                        ${result?.error || 'Failed to analyze image'}
                    </div>
                `);
            }
        } catch (error) {
            this._showResult('generation', `
                <div class="phase5-result-item error">Error: ${error.message}</div>
            `);
        }
        
        btn.textContent = 'Generate Game';
        btn.disabled = false;
    }
    
    async _handleGameAnalysis() {
        const btn = document.getElementById('analyze-game-btn');
        btn.innerHTML = '<span class="phase5-loading"></span>Analyzing...';
        btn.disabled = true;
        
        try {
            const result = await this.phase5?.analyzeGame(this._getCurrentGameId());
            
            if (result?.success) {
                const analysis = result.analysis;
                
                let html = `
                    <div class="phase5-result-item success">
                        <strong>Analysis Complete</strong><br>
                        Overall Score: ${Math.round((analysis.performance?.score + analysis.engagement?.score + analysis.accessibility?.score) / 3)}/100
                    </div>
                    <div class="phase5-result-item">
                        <strong>Performance:</strong> ${analysis.performance?.score || 0}/100
                    </div>
                    <div class="phase5-result-item">
                        <strong>Engagement:</strong> ${analysis.engagement?.score || 0}/100
                    </div>
                    <div class="phase5-result-item">
                        <strong>Accessibility:</strong> ${analysis.accessibility?.score || 0}/100
                    </div>
                `;
                
                if (analysis.suggestions?.length > 0) {
                    html += '<div class="phase5-result-item warning"><strong>Suggestions:</strong><br>';
                    analysis.suggestions.slice(0, 3).forEach(s => {
                        html += `- ${s.suggestion}<br>`;
                    });
                    html += '</div>';
                }
                
                this._showResult('assistance', html, 'analysis-results');
            } else {
                this._showResult('assistance', `
                    <div class="phase5-result-item error">
                        ${result?.error || 'Failed to analyze game'}
                    </div>
                `, 'analysis-results');
            }
        } catch (error) {
            this._showResult('assistance', `
                <div class="phase5-result-item error">Error: ${error.message}</div>
            `, 'analysis-results');
        }
        
        btn.textContent = 'Analyze Game';
        btn.disabled = false;
    }
    
    async _handleBalanceCalculation() {
        const targetCompletion = parseInt(document.getElementById('target-completion')?.value || 30) / 100;
        const targetSession = parseInt(document.getElementById('target-session')?.value || 3) * 60;
        
        const btn = document.getElementById('calculate-balance-btn');
        btn.innerHTML = '<span class="phase5-loading"></span>Calculating...';
        btn.disabled = true;
        
        try {
            const result = await this.phase5?.calculateBalance(
                this._getCurrentGameId(),
                { completionRate: targetCompletion, avgSessionLength: targetSession }
            );
            
            if (result?.success) {
                let html = `
                    <div class="phase5-result-item">
                        <strong>Balance Recommendations</strong><br>
                        Current Difficulty: ${result.recommendations?.[0]?.type || 'balanced'}
                    </div>
                `;
                
                result.recommendations?.forEach(rec => {
                    html += `
                        <div class="phase5-result-item warning">
                            <strong>${rec.type}:</strong> ${rec.suggestion || rec.action}<br>
                            ${rec.changes?.map(c => `${c.param}: ${c.multiply}x`).join(', ')}
                        </div>
                    `;
                });
                
                if (!result.recommendations?.length) {
                    html += '<div class="phase5-result-item success">Game appears well balanced!</div>';
                }
                
                this._showResult('assistance', html, 'balance-results');
            } else {
                this._showResult('assistance', `
                    <div class="phase5-result-item error">
                        ${result?.error || 'Failed to calculate balance'}
                    </div>
                `, 'balance-results');
            }
        } catch (error) {
            this._showResult('assistance', `
                <div class="phase5-result-item error">Error: ${error.message}</div>
            `, 'balance-results');
        }
        
        btn.textContent = 'Calculate';
        btn.disabled = false;
    }
    
    async _handlePlaytest() {
        const iterations = parseInt(document.getElementById('playtest-iterations')?.value || 10);
        
        const btn = document.getElementById('run-playtest-btn');
        btn.innerHTML = `<span class="phase5-loading"></span>Simulating (${iterations})...`;
        btn.disabled = true;
        
        try {
            const result = await this.phase5?.simulatePlaytest(this._getCurrentGameId(), iterations);
            
            if (result?.success) {
                const r = result.results;
                let html = `
                    <div class="phase5-result-item">
                        <strong>Playtest Results</strong><br>
                        Completion Rate: ${(r.metrics.completionRate * 100).toFixed(0)}%<br>
                        Avg Deaths: ${r.metrics.avgDeaths.toFixed(1)}<br>
                        Avg Score: ${Math.round(r.metrics.avgScore)}
                    </div>
                `;
                
                if (r.recommendations?.length > 0) {
                    r.recommendations.forEach(rec => {
                        html += `
                            <div class="phase5-result-item ${rec.severity === 'high' ? 'error' : 'warning'}">
                                <strong>${rec.issue}</strong><br>
                                ${rec.suggestion}
                            </div>
                        `;
                    });
                }
                
                this._showResult('assistance', html, 'playtest-results');
            } else {
                this._showResult('assistance', `
                    <div class="phase5-result-item error">
                        ${result?.error || 'Failed to run playtest'}
                    </div>
                `, 'playtest-results');
            }
        } catch (error) {
            this._showResult('assistance', `
                <div class="phase5-result-item error">Error: ${error.message}</div>
            `, 'playtest-results');
        }
        
        btn.textContent = 'Run Simulation';
        btn.disabled = false;
    }
    
    _showResult(tab, html, elementId = null) {
        let resultEl;
        
        if (elementId) {
            resultEl = document.getElementById(elementId);
        } else {
            // Find the results div in the current tab
            const tabContent = this.panel?.querySelector(`[data-content="${tab}"]`);
            resultEl = tabContent?.querySelector('.phase5-results');
        }
        
        if (resultEl) {
            resultEl.innerHTML = html;
            resultEl.classList.add('show');
        }
    }
    
    _getCurrentGameId() {
        // Try to get current game from various sources
        return window.currentGameId || 
               document.querySelector('[data-game-id]')?.dataset.gameId || 
               'unknown';
    }
    
    _updateTierBadge() {
        const tierInfo = this.phase5?.getFeatureAvailability?.();
        const badge = document.getElementById('tier-badge');
        
        if (badge && tierInfo) {
            const tierNames = {
                none: 'Free Tier',
                lite: 'Lite Tier',
                pro: 'Pro Tier',
                max: 'MAX Tier'
            };
            badge.textContent = tierNames[tierInfo.tier] || 'Free Tier';
        }
    }
}

// Initialize UI
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for Phase5AIFeatures to initialize
    setTimeout(() => {
        window.phase5UI = new Phase5UI();
    }, 500);
});

/**
 * ============================================
 * SGAI PHASE 4-5-6 LOADER
 * ============================================
 * Quick loader for all Phase 4-5-6 systems
 * 
 * Usage:
 *   <script src="/js/core/Phase456Loader.js"></script>
 *   // All systems automatically loaded
 */

(function(global) {
    'use strict';

    const Phase456Loader = {
        loaded: false,
        loading: false,
        scripts: [
            // Phase 4: Audio
            '/js/core/audio/DynamicAudioDirector.js',
            
            // Phase 5: AI
            '/js/core/ai/AISystem.js',
            
            // Phase 6: Post-Processing
            '/js/core/graphics/PostProcessingStack.js',
            
            // Integration
            '/js/core/integration/Phase456Integration.js'
        ],

        gameEnhancements: {
            'blood-tetris': '/games/blood-tetris/core/Phase456Enhancements.js',
            'ritual-circle': '/games/ritual-circle/core/Phase456Enhancements.js',
            'zombie-horde': '/games/zombie-horde/core/Phase456Enhancements.js',
            'seance': '/games/seance/core/Phase456Enhancements.js',
            'crypt-tanks': '/games/crypt-tanks/core/Phase456Enhancements.js',
            'yeti-run': '/games/yeti-run/core/Phase456Enhancements.js',
            'nightmare-run': '/games/nightmare-run/core/Phase456Enhancements.js',
            'cursed-arcade': '/games/cursed-arcade/core/Phase456Enhancements.js'
        },

        /**
         * Load all Phase 4-5-6 systems
         */
        async load() {
            if (this.loaded || this.loading) return true;
            this.loading = true;

            console.log('[Phase456Loader] Loading systems...');

            try {
                // Load core scripts sequentially
                for (const script of this.scripts) {
                    await this._loadScript(script);
                }

                this.loaded = true;
                this.loading = false;
                console.log('[Phase456Loader] All systems loaded successfully');
                console.log('[Phase456Loader] Available: DynamicAudioDirector, AISystem, PostProcessingStack, Phase456Integration');
                
                return true;
            } catch (error) {
                console.error('[Phase456Loader] Load failed:', error);
                this.loading = false;
                return false;
            }
        },

        /**
         * Load game-specific enhancement
         */
        async loadGameEnhancement(gameId) {
            const scriptPath = this.gameEnhancements[gameId];
            if (!scriptPath) {
                console.warn(`[Phase456Loader] No enhancement for ${gameId}`);
                return null;
            }

            try {
                await this._loadScript(scriptPath);
                console.log(`[Phase456Loader] ${gameId} enhancement loaded`);
                
                // Return the enhancement class
                const className = this._getClassName(gameId);
                return global[className];
            } catch (error) {
                console.error(`[Phase456Loader] Failed to load ${gameId} enhancement:`, error);
                return null;
            }
        },

        /**
         * Load and initialize for specific game
         */
        async initForGame(gameId, canvas, originalGame) {
            // Load core systems
            await this.load();

            // Load game enhancement
            const EnhancementClass = await this.loadGameEnhancement(gameId);
            if (!EnhancementClass) return null;

            // Create and initialize enhancement instance
            const ctx = canvas?.getContext('2d');
            const enhancement = new EnhancementClass();
            await enhancement.init(canvas, ctx, originalGame);

            console.log(`[Phase456Loader] ${gameId} fully initialized`);
            return enhancement;
        },

        /**
         * Load script dynamically
         */
        _loadScript(src) {
            return new Promise((resolve, reject) => {
                // Check if already loaded
                const existing = document.querySelector(`script[src="${src}"]`);
                if (existing) {
                    resolve();
                    return;
                }

                const script = document.createElement('script');
                script.src = src;
                script.async = false;
                
                script.onload = () => {
                    console.log(`[Phase456Loader] Loaded: ${src}`);
                    resolve();
                };
                
                script.onerror = (error) => {
                    console.error(`[Phase456Loader] Failed: ${src}`);
                    reject(error);
                };
                
                document.head.appendChild(script);
            });
        },

        /**
         * Get enhancement class name from game ID
         */
        _getClassName(gameId) {
            const mapping = {
                'blood-tetris': 'EnhancedBloodTetris',
                'ritual-circle': 'EnhancedRitualCircle',
                'zombie-horde': 'EnhancedZombieHorde',
                'seance': 'EnhancedSeance',
                'crypt-tanks': 'EnhancedCryptTanks',
                'yeti-run': 'EnhancedYetiRun',
                'nightmare-run': 'EnhancedNightmareRun',
                'cursed-arcade': 'EnhancedCursedArcade'
            };
            return mapping[gameId];
        },

        /**
         * Check if system is available
         */
        isAvailable(systemName) {
            return global[systemName] !== undefined;
        },

        /**
         * Get loaded systems
         */
        getLoadedSystems() {
            const systems = [];
            
            if (this.isAvailable('DynamicAudioDirector')) systems.push('DynamicAudioDirector');
            if (this.isAvailable('AISystem')) systems.push('AISystem');
            if (this.isAvailable('PostProcessingStack')) systems.push('PostProcessingStack');
            if (this.isAvailable('Phase456Integration')) systems.push('Phase456Integration');
            
            // Game enhancements
            Object.values(this.gameEnhancements).forEach(path => {
                const className = path.replace('/games/', '').replace('/core/Phase456Enhancements.js', '')
                    .split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
                if (this.isAvailable('Enhanced' + className)) {
                    systems.push('Enhanced' + className);
                }
            });
            
            return systems;
        },

        /**
         * Quick setup helper
         */
        async quickSetup(gameId, canvas) {
            console.log(`[Phase456Loader] Quick setup for ${gameId}...`);
            
            const enhancement = await this.initForGame(gameId, canvas, null);
            
            if (enhancement) {
                console.log('[Phase456Loader] Setup complete!');
                console.log('[Phase456Loader] Use: enhancement.update(dt, gameState)');
                console.log('[Phase456Loader] Use: enhancement.on[Event]() for audio triggers');
            }
            
            return enhancement;
        }
    };

    // Auto-load on DOM ready if data attribute present
    if (typeof document !== 'undefined') {
        const autoLoad = document.querySelector('script[data-phase456-auto]');
        if (autoLoad) {
            const gameId = autoLoad.getAttribute('data-game-id');
            if (gameId) {
                document.addEventListener('DOMContentLoaded', () => {
                    Phase456Loader.load().then(() => {
                        Phase456Loader.loadGameEnhancement(gameId);
                    });
                });
            } else {
                document.addEventListener('DOMContentLoaded', () => {
                    Phase456Loader.load();
                });
            }
        }
    }

    // Export
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = Phase456Loader;
    } else {
        global.Phase456Loader = Phase456Loader;
    }

})(typeof window !== 'undefined' ? window : this);

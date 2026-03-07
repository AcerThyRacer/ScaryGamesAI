/**
 * ============================================
 * SGAI PHASE 7-8 LOADER
 * ============================================
 * Quick loader for all Phase 7-8 systems
 * 
 * Usage:
 *   <script src="/js/core/Phase78Loader.js" data-phase78-auto data-game-id="blood-tetris"></script>
 */

(function(global) {
    'use strict';

    const Phase78Loader = {
        loaded: false,
        loading: false,
        scripts: [
            // Phase 7: Progression
            '/js/core/progression/Phase7Progression.js',
            
            // Phase 8: Persistence
            '/js/core/persistence/Phase8Persistence.js',
            
            // Integration
            '/js/core/integration/Phase78Integration.js'
        ],

        gameEnhancements: {
            'blood-tetris': '/games/blood-tetris/core/Phase78Enhancements.js',
            'ritual-circle': '/games/ritual-circle/core/Phase78Enhancements.js',
            'zombie-horde': '/games/zombie-horde/core/Phase78Enhancements.js',
            'seance': '/games/seance/core/Phase78Enhancements.js',
            'crypt-tanks': '/games/crypt-tanks/core/Phase78Enhancements.js',
            'yeti-run': '/games/yeti-run/core/Phase78Enhancements.js',
            'nightmare-run': '/games/nightmare-run/core/Phase78Enhancements.js',
            'cursed-arcade': '/games/cursed-arcade/core/Phase78Enhancements.js'
        },

        /**
         * Load all Phase 7-8 systems
         */
        async load() {
            if (this.loaded || this.loading) return true;
            this.loading = true;

            console.log('[Phase78Loader] Loading systems...');

            try {
                for (const script of this.scripts) {
                    await this._loadScript(script);
                }

                this.loaded = true;
                this.loading = false;
                console.log('[Phase78Loader] All systems loaded');
                console.log('[Phase78Loader] Available: ProgressionManager, AchievementSystem, ChallengeSystem, SaveManager, StatisticsTracker, SettingsManager, Phase78Integration');
                
                return true;
            } catch (error) {
                console.error('[Phase78Loader] Load failed:', error);
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
                console.warn(`[Phase78Loader] No enhancement for ${gameId}`);
                return null;
            }

            try {
                await this._loadScript(scriptPath);
                console.log(`[Phase78Loader] ${gameId} enhancement loaded`);
                
                const className = this._getClassName(gameId);
                return global[className];
            } catch (error) {
                console.error(`[Phase78Loader] Failed to load ${gameId} enhancement:`, error);
                return null;
            }
        },

        /**
         * Load and initialize for specific game
         */
        async initForGame(gameId, options = {}) {
            await this.load();

            const EnhancementClass = await this.loadGameEnhancement(gameId);
            if (!EnhancementClass) return null;

            const enhancement = new EnhancementClass();
            await enhancement.init(options);

            console.log(`[Phase78Loader] ${gameId} fully initialized`);
            return enhancement;
        },

        /**
         * Load script dynamically
         */
        _loadScript(src) {
            return new Promise((resolve, reject) => {
                const existing = document.querySelector(`script[src="${src}"]`);
                if (existing) {
                    resolve();
                    return;
                }

                const script = document.createElement('script');
                script.src = src;
                script.async = false;
                
                script.onload = () => {
                    console.log(`[Phase78Loader] Loaded: ${src}`);
                    resolve();
                };
                
                script.onerror = (error) => {
                    console.error(`[Phase78Loader] Failed: ${src}`);
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
                'blood-tetris': 'ProgressionBloodTetris',
                'ritual-circle': 'ProgressionRitualCircle',
                'zombie-horde': 'ProgressionZombieHorde',
                'seance': 'ProgressionSeance',
                'crypt-tanks': 'ProgressionCryptTanks',
                'yeti-run': 'ProgressionYetiRun',
                'nightmare-run': 'ProgressionNightmareRun',
                'cursed-arcade': 'ProgressionCursedArcade'
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
            
            if (this.isAvailable('ProgressionManager')) systems.push('ProgressionManager');
            if (this.isAvailable('AchievementSystem')) systems.push('AchievementSystem');
            if (this.isAvailable('ChallengeSystem')) systems.push('ChallengeSystem');
            if (this.isAvailable('SaveManager')) systems.push('SaveManager');
            if (this.isAvailable('StatisticsTracker')) systems.push('StatisticsTracker');
            if (this.isAvailable('SettingsManager')) systems.push('SettingsManager');
            if (this.isAvailable('Phase78Integration')) systems.push('Phase78Integration');
            
            return systems;
        },

        /**
         * Quick setup helper
         */
        async quickSetup(gameId, options = {}) {
            console.log(`[Phase78Loader] Quick setup for ${gameId}...`);
            
            const integration = new Phase78Integration();
            await integration.init(options);
            
            // Load game enhancement
            const EnhancementClass = await this.loadGameEnhancement(gameId);
            if (EnhancementClass) {
                const enhancement = new EnhancementClass();
                enhancement.setIntegration(integration);
                return { integration, enhancement };
            }
            
            return { integration };
        }
    };

    // Auto-load on DOM ready if data attribute present
    if (typeof document !== 'undefined') {
        const autoLoad = document.querySelector('script[data-phase78-auto]');
        if (autoLoad) {
            const gameId = autoLoad.getAttribute('data-game-id');
            if (gameId) {
                document.addEventListener('DOMContentLoaded', () => {
                    Phase78Loader.load().then(() => {
                        Phase78Loader.loadGameEnhancement(gameId);
                    });
                });
            } else {
                document.addEventListener('DOMContentLoaded', () => {
                    Phase78Loader.load();
                });
            }
        }
    }

    // Export
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = Phase78Loader;
    } else {
        global.Phase78Loader = Phase78Loader;
    }

})(typeof window !== 'undefined' ? window : this);

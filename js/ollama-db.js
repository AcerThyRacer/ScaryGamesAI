/* ============================================
   IndexedDB Storage Module for Ollama Games
   Handles large game data efficiently
   ============================================ */

const DB_NAME = 'ScaryGamesAI_Ollama';
const DB_VERSION = 1;
const STORE_GAMES = 'games';
const STORE_CACHE = 'cache';

const OllamaDB = {
    db: null,
    
    // Initialize the database
    async init() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                resolve(this.db);
                return;
            }
            
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            
            request.onerror = () => {
                console.error('IndexedDB error:', request.error);
                reject(request.error);
            };
            
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Games store
                if (!db.objectStoreNames.contains(STORE_GAMES)) {
                    const gameStore = db.createObjectStore(STORE_GAMES, { keyPath: 'id' });
                    gameStore.createIndex('category', 'category', { unique: false });
                    gameStore.createIndex('createdAt', 'createdAt', { unique: false });
                    gameStore.createIndex('updatedAt', 'updatedAt', { unique: false });
                }
                
                // Cache store for prompts and other data
                if (!db.objectStoreNames.contains(STORE_CACHE)) {
                    db.createObjectStore(STORE_CACHE, { keyPath: 'key' });
                }
            };
        });
    },
    
    // ============ GAME OPERATIONS ============
    
    // Save a game
    async saveGame(game) {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_GAMES], 'readwrite');
            const store = transaction.objectStore(STORE_GAMES);
            
            const request = store.put(game);
            
            request.onsuccess = () => resolve(game);
            request.onerror = () => reject(request.error);
        });
    },
    
    // Get a game by ID
    async getGame(id) {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_GAMES], 'readonly');
            const store = transaction.objectStore(STORE_GAMES);
            const request = store.get(id);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },
    
    // Get all games
    async getAllGames() {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_GAMES], 'readonly');
            const store = transaction.objectStore(STORE_GAMES);
            const request = store.getAll();
            
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    },
    
    // Get games by category
    async getGamesByCategory(category) {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_GAMES], 'readonly');
            const store = transaction.objectStore(STORE_GAMES);
            const index = store.index('category');
            const request = index.getAll(category);
            
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    },
    
    // Delete a game
    async deleteGame(id) {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_GAMES], 'readwrite');
            const store = transaction.objectStore(STORE_GAMES);
            const request = store.delete(id);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },
    
    // Delete multiple games
    async deleteGames(ids) {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_GAMES], 'readwrite');
            const store = transaction.objectStore(STORE_GAMES);
            
            ids.forEach(id => store.delete(id));
            
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    },
    
    // Update game
    async updateGame(id, updates) {
        const game = await this.getGame(id);
        if (!game) throw new Error('Game not found');
        
        const updated = { ...game, ...updates, updatedAt: new Date().toISOString() };
        return this.saveGame(updated);
    },
    
    // Search games
    async searchGames(query) {
        const games = await this.getAllGames();
        const lowerQuery = query.toLowerCase();
        
        return games.filter(g => 
            g.title.toLowerCase().includes(lowerQuery) ||
            g.description.toLowerCase().includes(lowerQuery) ||
            (g.category && g.category.toLowerCase().includes(lowerQuery))
        );
    },
    
    // Get game count
    async getGameCount() {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_GAMES], 'readonly');
            const store = transaction.objectStore(STORE_GAMES);
            const request = store.count();
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },
    
    // Clear all games
    async clearAllGames() {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_GAMES], 'readwrite');
            const store = transaction.objectStore(STORE_GAMES);
            const request = store.clear();
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },
    
    // ============ CACHE OPERATIONS ============
    
    // Save to cache
    async setCache(key, value, ttl = 3600000) {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_CACHE], 'readwrite');
            const store = transaction.objectStore(STORE_CACHE);
            
            const cacheEntry = {
                key: key,
                value: value,
                expires: Date.now() + ttl,
                createdAt: Date.now()
            };
            
            const request = store.put(cacheEntry);
            
            request.onsuccess = () => resolve(cacheEntry);
            request.onerror = () => reject(request.error);
        });
    },
    
    // Get from cache
    async getCache(key) {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_CACHE], 'readonly');
            const store = transaction.objectStore(STORE_CACHE);
            const request = store.get(key);
            
            request.onsuccess = () => {
                const result = request.result;
                if (!result) {
                    resolve(null);
                    return;
                }
                
                // Check if expired
                if (Date.now() > result.expires) {
                    // Delete expired entry
                    store.delete(key);
                    resolve(null);
                    return;
                }
                
                resolve(result.value);
            };
            request.onerror = () => reject(request.error);
        });
    },
    
    // Delete from cache
    async deleteCache(key) {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_CACHE], 'readwrite');
            const store = transaction.objectStore(STORE_CACHE);
            const request = store.delete(key);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },
    
    // Clear all cache
    async clearCache() {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_CACHE], 'readwrite');
            const store = transaction.objectStore(STORE_CACHE);
            const request = store.clear();
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },
    
    // ============ STORAGE INFO ============
    
    async getStorageInfo() {
        if (navigator.storage && navigator.storage.estimate) {
            const estimate = await navigator.storage.estimate();
            return {
                used: estimate.usage || 0,
                quota: estimate.quota || 0,
                usagePercent: estimate.quota ? ((estimate.usage / estimate.quota) * 100).toFixed(2) : 0
            };
        }
        return { used: 0, quota: 0, usagePercent: 0 };
    }
};

// Export
window.OllamaDB = OllamaDB;

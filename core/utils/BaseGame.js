/* ============================================
   ScaryGamesAI - Base Game Class with Cleanup
   Prevents memory leaks with AbortController pattern
   ============================================ */

/**
 * Base class for all ScaryGamesAI games
 * Provides automatic event listener cleanup and resource management
 * 
 * Usage:
 * class MyGame extends BaseGame {
 *   constructor() {
 *     super();
 *     // Event listeners automatically use this.abortSignal
 *   }
 *   
 *   dispose() {
 *     super.dispose(); // Calls cleanup
 *   }
 * }
 */
export class BaseGame {
  constructor() {
    // AbortController for automatic event listener cleanup
    this._abortController = new AbortController();
    this._abortSignal = this._abortController.signal;
    
    // Resource tracking
    this._eventListeners = new Map();
    this._intervals = new Map();
    this._timeouts = new Map();
    this._disposables = new Set();
    
    // State
    this._isDisposed = false;
  }

  /**
   * Get the abort signal for event listeners
   * All event listeners should use this signal
   */
  get abortSignal() {
    return this._abortSignal;
  }

  /**
   * Add event listener with automatic cleanup
   * @param {EventTarget} target - Element/window/document
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   * @param {Object} options - AddEventListener options
   * @returns {string} Listener ID for manual removal
   */
  addEventListener(target, event, handler, options = {}) {
    if (this._isDisposed) {
      console.warn('[BaseGame] Cannot add listener after dispose');
      return null;
    }

    const listenerId = `${event}-${Math.random().toString(36).substr(2, 9)}`;
    
    const listenerOptions = {
      ...options,
      signal: this._abortSignal
    };

    target.addEventListener(event, handler, listenerOptions);
    this._eventListeners.set(listenerId, { target, event, handler });
    
    return listenerId;
  }

  /**
   * Remove a specific event listener
   * @param {string} listenerId - ID returned from addEventListener
   */
  removeEventListener(listenerId) {
    const listener = this._eventListeners.get(listenerId);
    if (listener) {
      listener.target.removeEventListener(listener.event, listener.handler);
      this._eventListeners.delete(listenerId);
    }
  }

  /**
   * Set interval with automatic cleanup
   * @param {Function} callback - Callback function
   * @param {number} ms - Interval in milliseconds
   * @returns {number} Interval ID
   */
  setInterval(callback, ms) {
    if (this._isDisposed) {
      console.warn('[BaseGame] Cannot set interval after dispose');
      return null;
    }

    const intervalId = setInterval(callback, ms);
    this._intervals.set(intervalId, callback);
    return intervalId;
  }

  /**
   * Set timeout with automatic cleanup
   * @param {Function} callback - Callback function
   * @param {number} ms - Timeout in milliseconds
   * @returns {number} Timeout ID
   */
  setTimeout(callback, ms) {
    if (this._isDisposed) {
      console.warn('[BaseGame] Cannot set timeout after dispose');
      return null;
    }

    const timeoutId = setTimeout(() => {
      callback();
      this._timeouts.delete(timeoutId);
    }, ms);
    this._timeouts.set(timeoutId, callback);
    return timeoutId;
  }

  /**
   * Register a disposable object (has .dispose() method)
   * @param {Object} disposable - Object with dispose method
   */
  registerDisposable(disposable) {
    if (disposable && typeof disposable.dispose === 'function') {
      this._disposables.add(disposable);
    }
  }

  /**
   * Unregister a disposable object
   * @param {Object} disposable - Object to unregister
   */
  unregisterDisposable(disposable) {
    this._disposables.delete(disposable);
  }

  /**
   * Clear a specific interval
   * @param {number} intervalId - Interval ID
   */
  clearInterval(intervalId) {
    clearInterval(intervalId);
    this._intervals.delete(intervalId);
  }

  /**
   * Clear a specific timeout
   * @param {number} timeoutId - Timeout ID
   */
  clearTimeout(timeoutId) {
    clearTimeout(timeoutId);
    this._timeouts.delete(timeoutId);
  }

  /**
   * Clear all intervals
   */
  clearAllIntervals() {
    for (const intervalId of this._intervals.keys()) {
      clearInterval(intervalId);
    }
  }

  /**
   * Clear all timeouts
   */
  clearAllTimeouts() {
    for (const timeoutId of this._timeouts.keys()) {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Dispose all resources and cleanup
   * THIS MUST BE CALLED when game ends/unloads
   */
  dispose() {
    if (this._isDisposed) {
      console.warn('[BaseGame] Already disposed');
      return;
    }

    this._isDisposed = true;

    // 1. Abort all event listeners (instant cleanup)
    this._abortController.abort();
    this._eventListeners.clear();

    // 2. Clear all intervals
    this.clearAllIntervals();

    // 3. Clear all timeouts
    this.clearAllTimeouts();

    // 4. Dispose all registered disposables
    for (const disposable of this._disposables) {
      try {
        disposable.dispose();
      } catch (error) {
        console.error('[BaseGame] Error disposing:', error);
      }
    }
    this._disposables.clear();

    // 5. Create new abort controller for potential re-initialization
    this._abortController = new AbortController();
    this._abortSignal = this._abortController.signal;

    console.log('[BaseGame] Disposed successfully');
  }

  /**
   * Check if game is disposed
   * @returns {boolean}
   */
  isDisposed() {
    return this._isDisposed;
  }

  /**
   * Utility: Create debounced function with automatic cleanup
   * @param {Function} fn - Function to debounce
   * @param {number} delay - Delay in ms
   * @returns {Function} Debounced function
   */
  debounce(fn, delay) {
    let timeoutId = null;
    
    return (...args) => {
      if (this._isDisposed) return;
      
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      timeoutId = this.setTimeout(() => {
        fn.apply(this, args);
        timeoutId = null;
      }, delay);
    };
  }

  /**
   * Utility: Create throttled function
   * @param {Function} fn - Function to throttle
   * @param {number} limit - Minimum time between calls (ms)
   * @returns {Function} Throttled function
   */
  throttle(fn, limit) {
    let inThrottle = false;
    
    return (...args) => {
      if (this._isDisposed || inThrottle) return;
      
      inThrottle = true;
      fn.apply(this, args);
      
      this.setTimeout(() => {
        inThrottle = false;
      }, limit);
    };
  }
}

/**
 * Factory function to create a game instance with proper cleanup
 * @param {Function} GameClass - Game class constructor
 * @returns {Object} Game instance with dispose wrapper
 */
export function createGame(GameClass) {
  const instance = new GameClass();
  
  // Ensure dispose is called on page unload
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      if (instance.dispose) {
        instance.dispose();
      }
    });
  }
  
  return instance;
}

// Export default instance for games that use singleton pattern
export const gameCleanup = {
  activeGames: new Set(),
  
  register(game) {
    this.activeGames.add(game);
  },
  
  unregister(game) {
    this.activeGames.delete(game);
  },
  
  disposeAll() {
    for (const game of this.activeGames) {
      if (game.dispose) {
        game.dispose();
      }
    }
    this.activeGames.clear();
  }
};

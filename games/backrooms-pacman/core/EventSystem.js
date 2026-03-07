/* ============================================
   Backrooms: Pac-Man - Event System
   AbortController-based cleanup for zero memory leaks
   ============================================ */

export class EventSystem {
    constructor() {
        this.abortController = new AbortController();
        this.signal = this.abortController.signal;
        this.listeners = new Map();
    }

    addEventListener(target, event, handler, options = {}) {
        const key = `${event}-${Math.random().toString(36).substr(2, 9)}`;
        
        const listenerOptions = {
            ...options,
            signal: this.signal
        };

        target.addEventListener(event, handler, listenerOptions);
        
        this.listeners.set(key, { target, event, handler });
        
        return key;
    }

    removeEventListener(key) {
        const listener = this.listeners.get(key);
        if (listener) {
            listener.target.removeEventListener(listener.event, listener.handler);
            this.listeners.delete(key);
        }
    }

    removeAllListeners() {
        // AbortController automatically removes all listeners
        this.abortController.abort();
        this.listeners.clear();
        // Create new controller for future use
        this.abortController = new AbortController();
        this.signal = this.abortController.signal;
    }

    dispatch(event, data) {
        window.dispatchEvent(new CustomEvent(event, { detail: data }));
    }

    on(event, callback) {
        const handler = (e) => callback(e.detail);
        return this.addEventListener(window, event, handler);
    }

    off(key) {
        this.removeEventListener(key);
    }

    dispose() {
        this.removeAllListeners();
    }
}

// Export convenience functions for module usage
export function createEventSystem() {
    return new EventSystem();
}

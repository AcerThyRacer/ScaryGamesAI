/**
 * EVENT BUS - Decoupled Module Communication System
 * Publish/Subscribe pattern for loose coupling between game modules
 */

var EventBus = (function() {
    'use strict';
    
    var events = {};
    var eventHistory = [];
    var maxHistory = 50;
    var debugMode = false;
    
    /**
     * Subscribe to an event
     * @param {string} event - Event name (e.g., 'player:damage', 'enemy:spawn')
     * @param {function} callback - Function to call when event is emitted
     * @param {object} context - Optional context to bind to callback
     * @returns {function} Unsubscribe function
     */
    function on(event, callback, context) {
        if (!events[event]) {
            events[event] = [];
        }
        
        var wrappedCallback = context ? callback.bind(context) : callback;
        var listener = {
            callback: wrappedCallback,
            originalCallback: callback,
            context: context
        };
        
        events[event].push(listener);
        
        if (debugMode) {
            console.log('[EventBus] Subscribed to:', event);
        }
        
        // Return unsubscribe function
        return function unsubscribe() {
            off(event, callback);
        };
    }
    
    /**
     * Subscribe to an event once
     * @param {string} event - Event name
     * @param {function} callback - Function to call when event is emitted
     * @returns {function} Unsubscribe function
     */
    function once(event, callback) {
        var wrapper = function(data) {
            off(event, wrapper);
            callback(data);
        };
        
        return on(event, wrapper);
    }
    
    /**
     * Emit an event
     * @param {string} event - Event name
     * @param {*} data - Data to pass to listeners
     */
    function emit(event, data) {
        if (debugMode) {
            console.log('[EventBus] Emitting:', event, data);
        }
        
        // Add to history
        eventHistory.push({
            event: event,
            data: data,
            timestamp: Date.now()
        });
        
        if (eventHistory.length > maxHistory) {
            eventHistory.shift();
        }
        
        // Notify all listeners
        if (events[event]) {
            // Clone array to prevent issues if listeners modify the events array
            var listeners = events[event].slice();
            
            for (var i = 0; i < listeners.length; i++) {
                try {
                    listeners[i].callback(data);
                } catch (error) {
                    console.error('[EventBus] Error in event listener for', event, ':', error);
                }
            }
        }
        
        // Emit wildcard event for debugging/monitoring
        emitAll('*', { event: event, data: data });
    }
    
    /**
     * Emit to all listeners (internal use)
     */
    function emitAll(event, data) {
        if (events[event]) {
            var listeners = events[event].slice();
            for (var i = 0; i < listeners.length; i++) {
                try {
                    listeners[i].callback(data);
                } catch (error) {
                    console.error('[EventBus] Error in wildcard listener:', error);
                }
            }
        }
    }
    
    /**
     * Unsubscribe from an event
     * @param {string} event - Event name
     * @param {function} callback - Original callback function
     */
    function off(event, callback) {
        if (!events[event]) return;
        
        events[event] = events[event].filter(function(listener) {
            return listener.originalCallback !== callback;
        });
        
        // Clean up empty event arrays
        if (events[event].length === 0) {
            delete events[event];
        }
        
        if (debugMode) {
            console.log('[EventBus] Unsubscribed from:', event);
        }
    }
    
    /**
     * Remove all listeners for an event
     * @param {string} event - Event name
     */
    function removeAllListeners(event) {
        if (event) {
            delete events[event];
        } else {
            // Remove all events
            events = {};
        }
        
        if (debugMode) {
            console.log('[EventBus] Removed all listeners for:', event || 'all events');
        }
    }
    
    /**
     * Get event history
     * @param {string} event - Optional event name to filter
     * @returns {Array} Event history
     */
    function getHistory(event) {
        if (!event) return eventHistory.slice();
        
        return eventHistory.filter(function(entry) {
            return entry.event === event;
        });
    }
    
    /**
     * Clear event history
     */
    function clearHistory() {
        eventHistory = [];
    }
    
    /**
     * Enable/disable debug mode
     * @param {boolean} enabled - Debug mode state
     */
    function setDebug(enabled) {
        debugMode = enabled;
    }
    
    /**
     * Get statistics
     * @returns {object} Event system statistics
     */
    function getStats() {
        var stats = {
            totalEvents: Object.keys(events).length,
            totalListeners: 0,
            historySize: eventHistory.length
        };
        
        for (var event in events) {
            stats.totalListeners += events[event].length;
        }
        
        return stats;
    }
    
    /**
     * Create a typed event emitter with validation
     * @param {string} eventPrefix - Prefix for all events (e.g., 'player')
     * @returns {object} Typed event emitter
     */
    function createTypedEmitter(eventPrefix) {
        return {
            emit: function(eventName, data) {
                emit(eventPrefix + ':' + eventName, data);
            },
            on: function(eventName, callback, context) {
                return on(eventPrefix + ':' + eventName, callback, context);
            },
            once: function(eventName, callback) {
                return once(eventPrefix + ':' + eventName, callback);
            },
            off: function(eventName, callback) {
                off(eventPrefix + ':' + eventName, callback);
            }
        };
    }
    
    // Public API
    return {
        on: on,
        once: once,
        emit: emit,
        off: off,
        removeAllListeners: removeAllListeners,
        getHistory: getHistory,
        clearHistory: clearHistory,
        setDebug: setDebug,
        getStats: getStats,
        createTypedEmitter: createTypedEmitter,
        
        // Convenience typed emitters
        player: createTypedEmitter('player'),
        enemy: createTypedEmitter('enemy'),
        game: createTypedEmitter('game'),
        audio: createTypedEmitter('audio'),
        ui: createTypedEmitter('ui'),
        system: createTypedEmitter('system')
    };
})();

// Export to global scope
if (typeof window !== 'undefined') {
    window.EventBus = EventBus;
}

console.log('[EventBus] Module loaded - Event system ready');

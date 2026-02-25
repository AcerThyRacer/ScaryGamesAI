/**
 * Dependency Injection System - Phase 1: Modular Codebase
 * Universal DI container for all 10 horror games
 * Enables modular architecture with clean separation of concerns
 */

export class DIContainer {
  constructor() {
    this.services = new Map();
    this.singletons = new Map();
    this.factories = new Map();
  }

  /**
   * Register a service
   * @param {string} name - Service name
   * @param {Function} factory - Factory function that creates the service
   */
  register(name, factory) {
    this.factories.set(name, factory);
    return this;
  }

  /**
   * Register a singleton service (created once, reused)
   * @param {string} name - Service name
   * @param {Function} factory - Factory function that creates the service
   */
  singleton(name, factory) {
    this.factories.set(name, factory);
    this.singletons.set(name, true);
    return this;
  }

  /**
   * Get a service instance
   * @param {string} name - Service name
   * @returns {any} Service instance
   */
  get(name) {
    // Check if already instantiated (for singletons or previously created)
    if (this.services.has(name)) {
      return this.services.get(name);
    }

    // Create new instance
    if (!this.factories.has(name)) {
      throw new Error(`Service "${name}" not registered`);
    }

    const factory = this.factories.get(name);
    const instance = factory(this);

    // Cache if singleton
    if (this.singletons.has(name)) {
      this.services.set(name, instance);
    }

    return instance;
  }

  /**
   * Register an existing instance
   * @param {string} name - Service name
   * @param {any} instance - Service instance
   */
  instance(name, instance) {
    this.services.set(name, instance);
    return this;
  }

  /**
   * Check if a service is registered
   * @param {string} name - Service name
   * @returns {boolean} True if registered
   */
  has(name) {
    return this.factories.has(name) || this.services.has(name);
  }

  /**
   * Remove a service
   * @param {string} name - Service name
   */
  remove(name) {
    this.services.delete(name);
    this.factories.delete(name);
    this.singletons.delete(name);
    return this;
  }

  /**
   * Clear all services
   */
  clear() {
    this.services.clear();
    this.factories.clear();
    this.singletons.clear();
    return this;
  }

  /**
   * Resolve all dependencies for an object
   * @param {Object} obj - Object with dependency annotations
   * @returns {Object} Object with dependencies injected
   */
  inject(obj) {
    if (!obj.dependencies) return obj;

    const injected = { ...obj };
    
    for (const [key, depName] of Object.entries(obj.dependencies)) {
      injected[key] = this.get(depName);
    }

    return injected;
  }

  /**
   * Create a child container that inherits from this one
   * @returns {DIContainer} Child container
   */
  createChild() {
    const child = new DIContainer();
    child.parent = this;
    
    // Override get to check parent first
    const originalGet = child.get.bind(child);
    child.get = (name) => {
      if (child.factories.has(name) || child.services.has(name)) {
        return originalGet(name);
      }
      if (child.parent && child.parent.has(name)) {
        return child.parent.get(name);
      }
      throw new Error(`Service "${name}" not registered`);
    };

    return child;
  }
}

/**
 * Decorator for marking class properties as injectable
 * Usage: @inject('renderer') renderer;
 */
export function inject(serviceName) {
  return function(target, propertyKey) {
    if (!target.dependencies) {
      target.dependencies = {};
    }
    target.dependencies[propertyKey] = serviceName;
  };
}

/**
 * Decorator for marking a class as a singleton service
 * Usage: @singleton('gameState') class GameState { ... }
 */
export function singleton(serviceName) {
  return function(target) {
    target.serviceName = serviceName;
    target.isSingleton = true;
  };
}

/**
 * Decorator for marking a class as a service
 * Usage: @service('audioManager') class AudioManager { ... }
 */
export function service(serviceName) {
  return function(target) {
    target.serviceName = serviceName;
  };
}

/**
 * Register all services from a module
 * @param {DIContainer} container - DI container
 * @param {Object} module - Module with service definitions
 */
export function registerModule(container, module) {
  if (module.register) {
    module.register(container);
  }
  return container;
}

export default DIContainer;

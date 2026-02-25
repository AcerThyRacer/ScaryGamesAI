/**
 * Entity-Component-System (ECS) Architecture
 * High-performance entity management for 2000+ zombies
 * 
 * @module ECS/EntityManager
 */

// === ENTITY ===
class Entity {
  constructor(id) {
    this.id = id;
    this.components = new Map();
    this.active = true;
    this.tags = new Set();
  }
  
  addComponent(type, data = {}) {
    const component = ComponentFactory.create(type, data);
    this.components.set(type, component);
    return this;
  }
  
  getComponent(type) {
    return this.components.get(type);
  }
  
  hasComponent(type) {
    return this.components.has(type);
  }
  
  removeComponent(type) {
    const component = this.components.get(type);
    if (component) {
      if (component.onDestroy) component.onDestroy();
      this.components.delete(type);
    }
    return this;
  }
  
  updateComponent(type, data) {
    const component = this.components.get(type);
    if (component) {
      Object.assign(component, data);
    }
    return this;
  }
  
  addTag(tag) {
    this.tags.add(tag);
    return this;
  }
  
  hasTag(tag) {
    return this.tags.has(tag);
  }
  
  destroy() {
    this.active = false;
    this.components.forEach((component, type) => {
      this.removeComponent(type);
    });
    this.tags.clear();
  }
}

// === COMPONENT BASE ===
class Component {
  constructor(data = {}) {
    this.createdAt = Date.now();
    Object.assign(this, data);
  }
  
  onDestroy() {
    // Override in subclasses if cleanup needed
  }
}

// === COMPONENT FACTORY ===
const ComponentFactory = {
  registry: new Map(),
  
  register(type, constructor) {
    this.registry.set(type, constructor);
  },
  
  create(type, data) {
    const Constructor = this.registry.get(type);
    if (!Constructor) {
      console.warn(`Component type "${type}" not registered, using base Component`);
      return new Component(data);
    }
    return new Constructor(data);
  }
};

// === REGISTER ALL COMPONENTS ===
function registerComponents() {
  // Transform Components
  ComponentFactory.register('position', class extends Component {
    constructor(data) {
      super({ x: 0, y: 0, z: 0, ...data });
    }
  });
  
  ComponentFactory.register('rotation', class extends Component {
    constructor(data) {
      super({ x: 0, y: 0, z: 0, w: 1, ...data });
    }
  });
  
  ComponentFactory.register('scale', class extends Component {
    constructor(data) {
      super({ x: 1, y: 1, z: 1, ...data });
    }
  });
  
  ComponentFactory.register('velocity', class extends Component {
    constructor(data) {
      super({ vx: 0, vy: 0, vz: 0, ax: 0, ay: 0, az: 0, ...data });
    }
  });
  
  ComponentFactory.register('angularVelocity', class extends Component {
    constructor(data) {
      super({ wx: 0, wy: 0, wz: 0, ...data });
    }
  });
  
  // State Components
  ComponentFactory.register('health', class extends Component {
    constructor(data) {
      super({
        current: 100,
        max: 100,
        regen: 0,
        lastDamageTime: 0,
        damageModifiers: {},
        deathHandlers: [],
        ...data
      });
    }
    
    takeDamage(amount, type = 'physical', source = null) {
      const modifier = this.damageModifiers[type] || 1.0;
      const actualDamage = amount * modifier;
      this.current = Math.max(0, this.current - actualDamage);
      this.lastDamageTime = Date.now();
      
      if (this.current <= 0) {
        this.deathHandlers.forEach(handler => handler(source));
      }
      
      return actualDamage;
    }
    
    heal(amount) {
      this.current = Math.min(this.max, this.current + amount);
    }
    
    addDeathHandler(handler) {
      this.deathHandlers.push(handler);
    }
    
    isDead() {
      return this.current <= 0;
    }
  });
  
  ComponentFactory.register('faction', class extends Component {
    constructor(data) {
      super({
        team: 'neutral', // 'player', 'enemy', 'neutral', 'ally'
        factionId: 0,
        relations: {},
        ...data
      });
    }
    
    getRelation(otherFactionId) {
      return this.relations[otherFactionId] || 0;
    }
    
    setRelation(otherFactionId, value) {
      this.relations[otherFactionId] = value;
    }
    
    isHostile(otherFactionId) {
      return this.getRelation(otherFactionId) < -50;
    }
    
    isFriendly(otherFactionId) {
      return this.getRelation(otherFactionId) > 50;
    }
  });
  
  // AI Components
  ComponentFactory.register('zombieAI', class extends Component {
    constructor(data) {
      super({
        state: 'idle', // idle, wandering, chasing, attacking, fleeing
        target: null,
        targetId: null,
        aggression: 0.8,
        fearLevel: 0.0,
        learningRate: 0.1,
        memory: new Map(),
        lastSeenTarget: null,
        searchPosition: null,
        searchTimer: 0,
        ...data
      });
    }
    
    setState(newState) {
      const oldState = this.state;
      this.state = newState;
      this.onStateChange?.(oldState, newState);
    }
    
    setTarget(target) {
      this.target = target;
      this.targetId = target?.id || null;
    }
    
    remember(key, value) {
      this.memory.set(key, { value, timestamp: Date.now() });
    }
    
    recall(key) {
      const memory = this.memory.get(key);
      return memory ? memory.value : null;
    }
    
    forget(key) {
      this.memory.delete(key);
    }
  });
  
  ComponentFactory.register('humanAI', class extends Component {
    constructor(data) {
      super({
        state: 'idle',
        orders: null,
        autoAttack: true,
        holdPosition: false,
        patrolPath: null,
        currentWaypoint: 0,
        ...data
      });
    }
  });
  
  // Combat Components
  ComponentFactory.register('combat', class extends Component {
    constructor(data) {
      super({
        damage: 10,
        attackSpeed: 1.0,
        attackRange: 1.5,
        attackCooldown: 0,
        attackTimer: 0,
        attackType: 'melee',
        onAttack: null,
        onHit: null,
        ...data
      });
    }
    
    canAttack() {
      return this.attackTimer <= 0;
    }
    
    startAttack() {
      this.attackTimer = this.attackCooldown;
      this.onAttack?.();
    }
    
    update(deltaTime) {
      if (this.attackTimer > 0) {
        this.attackTimer -= deltaTime;
      }
    }
  });
  
  ComponentFactory.register('weapon', class extends Component {
    constructor(data) {
      super({
        type: 'none',
        damage: 10,
        range: 1.5,
        attackSpeed: 1.0,
        ammo: -1, // -1 = infinite
        maxAmmo: -1,
        reloadTime: 2.0,
        reloadTimer: 0,
        isReloading: false,
        ...data
      });
    }
    
    hasAmmo() {
      return this.ammo === -1 || this.ammo > 0;
    }
    
    consumeAmmo() {
      if (this.ammo > 0) {
        this.ammo--;
        return true;
      }
      return this.ammo === -1;
    }
    
    startReload() {
      if (!this.isReloading && this.ammo < this.maxAmmo) {
        this.isReloading = true;
        this.reloadTimer = this.reloadTime;
      }
    }
    
    update(deltaTime) {
      if (this.isReloading) {
        this.reloadTimer -= deltaTime;
        if (this.reloadTimer <= 0) {
          this.ammo = this.maxAmmo;
          this.isReloading = false;
        }
      }
    }
  });
  
  // Movement Components
  ComponentFactory.register('movement', class extends Component {
    constructor(data) {
      super({
        speed: 3.0,
        maxSpeed: 5.0,
        acceleration: 10.0,
        deceleration: 5.0,
        rotationSpeed: 5.0,
        canMove: true,
        isMoving: false,
        ...data
      });
    }
  });
  
  ComponentFactory.register('formation', class extends Component {
    constructor(data) {
      super({
        formationType: 'none', // none, line, wedge, circle, swarm
        positionInFormation: -1,
        relativeOffset: { x: 0, z: 0 },
        cohesion: 1.0,
        formationId: -1,
        ...data
      });
    }
  });
  
  // Rendering Components
  ComponentFactory.register('mesh', class extends Component {
    constructor(data) {
      super({
        geometry: null,
        material: null,
        mesh: null,
        visible: true,
        castShadow: true,
        receiveShadow: true,
        ...data
      });
    }
    
    setVisibility(visible) {
      this.visible = visible;
      if (this.mesh) {
        this.mesh.visible = visible;
      }
    }
  });
  
  ComponentFactory.register('animation', class extends Component {
    constructor(data) {
      super({
        currentState: 'idle',
        previousState: 'idle',
        animations: new Map(),
        mixer: null,
        actions: new Map(),
        blendTime: 0.2,
        ...data
      });
    }
    
    play(animationName, fadeInTime = this.blendTime) {
      if (this.currentState === animationName) return;
      
      const action = this.actions.get(animationName);
      if (action) {
        if (this.currentState !== 'idle') {
          action.crossFadeFrom(this.actions.get(this.currentState), fadeInTime);
        }
        action.play();
        this.previousState = this.currentState;
        this.currentState = animationName;
      }
    }
    
    stop(animationName, fadeOutTime = this.blendTime) {
      const action = this.actions.get(animationName);
      if (action) {
        action.fadeOut(fadeOutTime);
      }
    }
  });
  
  // Zombie-Specific Components
  ComponentFactory.register('zombieType', class extends Component {
    constructor(data) {
      super({
        type: 'shambler',
        variant: 0,
        specialAbilities: [],
        weaknesses: [],
        spawnWeight: 1.0,
        ...data
      });
    }
  });
  
  ComponentFactory.register('infection', class extends Component {
    constructor(data) {
      super({
        infectionLevel: 0, // 0-100
        transformationTimer: 0,
        isInfected: false,
        willTransform: false,
        ...data
      });
    }
    
    increaseInfection(amount) {
      this.infectionLevel = Math.min(100, this.infectionLevel + amount);
      this.isInfected = this.infectionLevel > 0;
      this.willTransform = this.infectionLevel >= 100;
    }
  });
  
  // Sensory Components
  ComponentFactory.register('senses', class extends Component {
    constructor(data) {
      super({
        vision: {
          range: 30,
          fov: 90,
          nightVision: false
        },
        hearing: {
          range: 50,
          sensitivity: 1.0
        },
        smell: {
          range: 40,
          bloodDetection: true
        },
        ...data
      });
    }
    
    canSee(target, position) {
      const distance = position.distanceTo(target.position);
      return distance <= this.vision.range;
    }
    
    canHear(sound, position) {
      const distance = position.distanceTo(sound.position);
      return distance <= this.hearing.range * sound.volume;
    }
  });
  
  // Performance Components
  ComponentFactory.register('lod', class extends Component {
    constructor(data) {
      super({
        level: 0,
        distances: [0, 20, 50, 100],
        currentDistance: 0,
        ...data
      });
    }
    
    updateLevel(distance) {
      this.currentDistance = distance;
      for (let i = this.distances.length - 1; i >= 0; i--) {
        if (distance >= this.distances[i]) {
          this.level = i;
          return i;
        }
      }
      this.level = 0;
      return 0;
    }
  });
  
  ComponentFactory.register('poolable', class extends Component {
    constructor(data) {
      super({
        poolId: null,
        inPool: false,
        lastUsed: 0,
        ...data
      });
    }
  });
  
  console.log('✅ All ECS components registered');
}

// === ENTITY MANAGER ===
class EntityManager {
  constructor() {
    this.entities = new Map();
    this.entityIdCounter = 0;
    this.pendingRemovals = [];
    this.spatialIndex = new Octree({ x: 0, y: 0, z: 0 }, 200, 4);
    this.queryCache = new Map();
    this.listeners = new Map();
  }
  
  createEntity() {
    const entity = new Entity(this.entityIdCounter++);
    this.entities.set(entity.id, entity);
    this.emit('entityCreated', entity);
    return entity;
  }
  
  getEntity(id) {
    return this.entities.get(id);
  }
  
  removeEntity(id) {
    const entity = this.entities.get(id);
    if (entity) {
      entity.destroy();
      this.pendingRemovals.push(id);
      this.spatialIndex.remove(entity);
      this.emit('entityRemoved', entity);
    }
  }
  
  processRemovals() {
    this.pendingRemovals.forEach(id => {
      this.entities.delete(id);
    });
    this.pendingRemovals = [];
  }
  
  // Query entities by components
  query(...componentTypes) {
    const key = componentTypes.join(',');
    
    if (this.queryCache.has(key)) {
      return this.queryCache.get(key);
    }
    
    const results = [];
    for (const entity of this.entities.values()) {
      if (!entity.active) continue;
      
      const hasAll = componentTypes.every(type => entity.hasComponent(type));
      if (hasAll) {
        results.push(entity);
      }
    }
    
    this.queryCache.set(key, results);
    return results;
  }
  
  // Query with spatial filtering
  queryInRadius(position, radius, ...componentTypes) {
    const candidates = this.spatialIndex.querySphere(position, radius);
    
    return candidates.filter(entity => {
      if (!entity.active) return false;
      return componentTypes.every(type => entity.hasComponent(type));
    });
  }
  
  // Update spatial index
  rebuildSpatialIndex() {
    this.spatialIndex = new Octree({ x: 0, y: 0, z: 0 }, 200, 4);
    
    for (const entity of this.entities.values()) {
      if (!entity.active) continue;
      
      const position = entity.getComponent('position');
      if (position) {
        this.spatialIndex.insert(entity, position);
      }
    }
  }
  
  // Event system
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
  }
  
  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }
  
  emit(event, ...args) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => callback(...args));
    }
  }
  
  // Statistics
  getStats() {
    const stats = {
      total: this.entities.size,
      active: 0,
      byComponent: new Map(),
      spatialObjects: this.spatialIndex.count
    };
    
    for (const entity of this.entities.values()) {
      if (entity.active) {
        stats.active++;
        
        for (const type of entity.components.keys()) {
          stats.byComponent.set(type, (stats.byComponent.get(type) || 0) + 1);
        }
      }
    }
    
    return stats;
  }
  
  // Clear all entities
  clear() {
    for (const id of this.entities.keys()) {
      this.removeEntity(id);
    }
    this.processRemovals();
    this.queryCache.clear();
  }
}

// === OCTREE SPATIAL INDEX ===
class Octree {
  constructor(center, size, depth = 0) {
    this.center = { ...center };
    this.size = size;
    this.halfSize = size / 2;
    this.depth = depth;
    this.maxDepth = 4;
    this.maxObjects = 10;
    
    this.objects = [];
    this.children = null;
  }
  
  insert(entity, position) {
    if (this.children) {
      // Has children, insert into appropriate child
      const index = this.getIndex(position);
      if (index !== -1) {
        this.children[index].insert(entity, position);
        return;
      }
    }
    
    // No children or doesn't fit in children
    this.objects.push({ entity, position });
    
    // Subdivide if too many objects and not at max depth
    if (this.objects.length > this.maxObjects && this.depth < this.maxDepth) {
      this.subdivide();
      
      // Redistribute objects
      const objects = this.objects;
      this.objects = [];
      objects.forEach(obj => {
        const index = this.getIndex(obj.position);
        if (index !== -1) {
          this.children[index].insert(obj.entity, obj.position);
        } else {
          this.objects.push(obj);
        }
      });
    }
  }
  
  remove(entity) {
    if (this.children) {
      for (const child of this.children) {
        child.remove(entity);
      }
    }
    
    this.objects = this.objects.filter(obj => obj.entity !== entity);
  }
  
  subdivide() {
    const quarterSize = this.size / 4;
    const offsets = [
      { x: -1, y: -1, z: -1 },
      { x: 1, y: -1, z: -1 },
      { x: -1, y: 1, z: -1 },
      { x: 1, y: 1, z: -1 },
      { x: -1, y: -1, z: 1 },
      { x: 1, y: -1, z: 1 },
      { x: -1, y: 1, z: 1 },
      { x: 1, y: 1, z: 1 }
    ];
    
    this.children = offsets.map(offset => {
      const center = {
        x: this.center.x + offset.x * quarterSize,
        y: this.center.y + offset.y * quarterSize,
        z: this.center.z + offset.z * quarterSize
      };
      return new Octree(center, this.size / 2, this.depth + 1);
    });
  }
  
  getIndex(position) {
    if (!this.children) return -1;
    
    const dx = position.x - this.center.x;
    const dy = position.y - this.center.y;
    const dz = position.z - this.center.z;
    const quarterSize = this.size / 4;
    
    // Determine which octant
    const x = dx > quarterSize ? 1 : (dx < -quarterSize ? -1 : 0);
    const y = dy > quarterSize ? 1 : (dy < -quarterSize ? -1 : 0);
    const z = dz > quarterSize ? 1 : (dz < -quarterSize ? -1 : 0);
    
    if (x === 0 || y === 0 || z === 0) return -1; // On boundary
    
    // Convert to index (0-7)
    return ((z + 1) / 2) * 4 + ((y + 1) / 2) * 2 + ((x + 1) / 2);
  }
  
  querySphere(center, radius) {
    const results = [];
    this._querySphere(center, radius, results);
    return results;
  }
  
  _querySphere(center, radius, results) {
    // Check if sphere intersects this octant
    const dx = Math.max(Math.abs(center.x - this.center.x) - this.halfSize, 0);
    const dy = Math.max(Math.abs(center.y - this.center.y) - this.halfSize, 0);
    const dz = Math.max(Math.abs(center.z - this.center.z) - this.halfSize, 0);
    
    const distanceSquared = dx * dx + dy * dy + dz * dz;
    
    if (distanceSquared > radius * radius) {
      return; // No intersection
    }
    
    // Add objects in this node
    this.objects.forEach(obj => {
      const dx = obj.position.x - center.x;
      const dy = obj.position.y - center.y;
      const dz = obj.position.z - center.z;
      const distSq = dx * dx + dy * dy + dz * dz;
      
      if (distSq <= radius * radius) {
        results.push(obj.entity);
      }
    });
    
    // Check children
    if (this.children) {
      for (const child of this.children) {
        child._querySphere(center, radius, results);
      }
    }
  }
  
  count() {
    let count = this.objects.length;
    if (this.children) {
      for (const child of this.children) {
        count += child.count();
      }
    }
    return count;
  }
}

// === EXPORTS ===
window.ECS = {
  Entity,
  Component,
  ComponentFactory,
  EntityManager,
  Octree,
  registerComponents
};

console.log('✅ ECS Module loaded');

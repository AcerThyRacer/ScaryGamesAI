/**
 * Total War Engine - Entity Component System Core
 * High-performance ECS with spatial partitioning and batch processing
 */

import type {
  Entity,
  EntityId,
  IComponent,
  ISystem,
  ComponentTypeId,
  Vector3,
  BoundingBox,
} from '../types';

// ============================================================================
// Entity Manager
// ============================================================================

export class EntityManager {
  private entities: Map<EntityId, Entity> = new Map();
  private freeIds: EntityId[] = [];
  private nextId: EntityId = 1;
  private entityPool: Entity[] = [];
  private activeEntityCount: number = 0;

  private static readonly POOL_SIZE = 1000;
  private static readonly MAX_ENTITIES = 50000;

  constructor() {
    this.preallocatePool(EntityManager.POOL_SIZE);
  }

  private preallocatePool(count: number): void {
    for (let i = 0; i < count; i++) {
      this.entityPool.push(this.createEntityObject(0));
    }
  }

  private createEntityObject(id: EntityId): Entity {
    return {
      id,
      active: false,
      components: new Map<ComponentTypeId, IComponent>(),
    };
  }

  createEntity(): EntityId {
    if (this.entities.size >= EntityManager.MAX_ENTITIES) {
      console.warn('Max entities reached, recycling oldest inactive');
      this.recycleInactiveEntity();
    }

    let entity: Entity;
    const id = this.freeIds.length > 0 ? this.freeIds.pop()! : this.nextId++;

    if (this.entityPool.length > 0) {
      entity = this.entityPool.pop()!;
      entity.id = id;
    } else {
      entity = this.createEntityObject(id);
    }

    entity.active = true;
    entity.components.clear();
    this.entities.set(id, entity);
    this.activeEntityCount++;

    return id;
  }

  destroyEntity(id: EntityId): void {
    const entity = this.entities.get(id);
    if (!entity) return;

    entity.active = false;
    entity.components.clear();
    this.activeEntityCount--;

    // Return to pool if pool isn't too large
    if (this.entityPool.length < EntityManager.POOL_SIZE * 2) {
      this.entityPool.push(entity);
    }

    this.entities.delete(id);
    if (id < this.nextId) {
      this.freeIds.push(id);
    }
  }

  getEntity(id: EntityId): Entity | undefined {
    return this.entities.get(id);
  }

  hasEntity(id: EntityId): boolean {
    return this.entities.has(id);
  }

  getAllEntities(): Entity[] {
    return Array.from(this.entities.values()).filter(e => e.active);
  }

  getActiveEntityCount(): number {
    return this.activeEntityCount;
  }

  private recycleInactiveEntity(): void {
    for (const [id, entity] of this.entities) {
      if (!entity.active) {
        this.destroyEntity(id);
        return;
      }
    }
  }

  clear(): void {
    this.entities.clear();
    this.freeIds = [];
    this.nextId = 1;
    this.activeEntityCount = 0;
  }
}

// ============================================================================
// Component Manager
// ============================================================================

export class ComponentManager {
  private componentStores: Map<ComponentTypeId, Map<EntityId, IComponent>> = new Map();
  private entityComponents: Map<EntityId, Set<ComponentTypeId>> = new Map();

  addComponent<T extends IComponent>(entityId: EntityId, component: T): void {
    const typeId = component.type;

    if (!this.componentStores.has(typeId)) {
      this.componentStores.set(typeId, new Map());
    }

    this.componentStores.get(typeId)!.set(entityId, component);

    if (!this.entityComponents.has(entityId)) {
      this.entityComponents.set(entityId, new Set());
    }
    this.entityComponents.get(entityId)!.add(typeId);
  }

  removeComponent(entityId: EntityId, typeId: ComponentTypeId): void {
    const store = this.componentStores.get(typeId);
    if (store) {
      store.delete(entityId);
    }

    const componentSet = this.entityComponents.get(entityId);
    if (componentSet) {
      componentSet.delete(typeId);
    }
  }

  getComponent<T extends IComponent>(entityId: EntityId, typeId: ComponentTypeId): T | undefined {
    const store = this.componentStores.get(typeId);
    return store ? (store.get(entityId) as T) : undefined;
  }

  hasComponent(entityId: EntityId, typeId: ComponentTypeId): boolean {
    const store = this.componentStores.get(typeId);
    return store ? store.has(entityId) : false;
  }

  hasComponents(entityId: EntityId, typeIds: ComponentTypeId[]): boolean {
    const componentSet = this.entityComponents.get(entityId);
    if (!componentSet) return false;
    return typeIds.every(id => componentSet.has(id));
  }

  getEntitiesWithComponents(typeIds: ComponentTypeId[]): EntityId[] {
    if (typeIds.length === 0) return [];

    const result: EntityId[] = [];
    const primaryStore = this.componentStores.get(typeIds[0]);

    if (!primaryStore) return [];

    for (const entityId of primaryStore.keys()) {
      if (this.hasComponents(entityId, typeIds)) {
        result.push(entityId);
      }
    }

    return result;
  }

  getComponentsByType<T extends IComponent>(typeId: ComponentTypeId): Map<EntityId, T> {
    return (this.componentStores.get(typeId) as Map<EntityId, T>) || new Map();
  }

  removeAllComponents(entityId: EntityId): void {
    const componentSet = this.entityComponents.get(entityId);
    if (componentSet) {
      for (const typeId of componentSet) {
        const store = this.componentStores.get(typeId);
        if (store) {
          store.delete(entityId);
        }
      }
      componentSet.clear();
    }
  }

  getComponentCount(): number {
    let count = 0;
    for (const store of this.componentStores.values()) {
      count += store.size;
    }
    return count;
  }
}

// ============================================================================
// System Manager
// ============================================================================

export class SystemManager {
  private systems: ISystem[] = [];
  private systemMap: Map<string, ISystem> = new Map();
  private systemGroups: Map<string, ISystem[]> = new Map();

  registerSystem(system: ISystem, group?: string): void {
    if (this.systemMap.has(system.name)) {
      console.warn(`System ${system.name} already registered`);
      return;
    }

    this.systems.push(system);
    this.systemMap.set(system.name, system);

    // Sort by priority
    this.systems.sort((a, b) => a.priority - b.priority);

    // Add to group
    if (group) {
      if (!this.systemGroups.has(group)) {
        this.systemGroups.set(group, []);
      }
      this.systemGroups.get(group)!.push(system);
    }

    // Initialize
    if (system.init) {
      system.init();
    }
  }

  removeSystem(name: string): void {
    const system = this.systemMap.get(name);
    if (!system) return;

    if (system.destroy) {
      system.destroy();
    }

    const index = this.systems.indexOf(system);
    if (index > -1) {
      this.systems.splice(index, 1);
    }
    this.systemMap.delete(name);
  }

  updateAll(deltaTime: number, entityManager: EntityManager, componentManager: ComponentManager): void {
    const entities = entityManager.getAllEntities();

    for (const system of this.systems) {
      const relevantEntities = entities.filter(entity =>
        componentManager.hasComponents(entity.id, system.requiredComponents)
      );
      system.update(relevantEntities, deltaTime);
    }
  }

  updateGroup(group: string, deltaTime: number, entityManager: EntityManager, componentManager: ComponentManager): void {
    const systems = this.systemGroups.get(group);
    if (!systems) return;

    const entities = entityManager.getAllEntities();

    for (const system of systems) {
      const relevantEntities = entities.filter(entity =>
        componentManager.hasComponents(entity.id, system.requiredComponents)
      );
      system.update(relevantEntities, deltaTime);
    }
  }

  getSystem<T extends ISystem>(name: string): T | undefined {
    return this.systemMap.get(name) as T;
  }

  getSystemsByGroup(group: string): ISystem[] {
    return this.systemGroups.get(group) || [];
  }
}

// ============================================================================
// Spatial Partitioning - Octree
// ============================================================================

interface OctreeNode {
  bounds: BoundingBox;
  children: OctreeNode[] | null;
  entities: Set<EntityId>;
  depth: number;
  leaf: boolean;
}

export class SpatialPartition {
  private root: OctreeNode;
  private entityPositions: Map<EntityId, Vector3> = new Map();
  private maxDepth: number = 6;
  private maxEntitiesPerNode: number = 16;

  constructor(worldSize: number) {
    const half = worldSize / 2;
    this.root = this.createNode(
      { min: { x: -half, y: -100, z: -half }, max: { x: half, y: 100, z: half } },
      0
    );
  }

  private createNode(bounds: BoundingBox, depth: number): OctreeNode {
    return {
      bounds,
      children: null,
      entities: new Set(),
      depth,
      leaf: true,
    };
  }

  insert(entityId: EntityId, position: Vector3): void {
    this.remove(entityId);
    this.entityPositions.set(entityId, { ...position });
    this.insertIntoNode(this.root, entityId, position);
  }

  private insertIntoNode(node: OctreeNode, entityId: EntityId, position: Vector3): void {
    if (!this.containsPoint(node.bounds, position)) {
      return;
    }

    if (node.leaf) {
      node.entities.add(entityId);

      if (node.entities.size > this.maxEntitiesPerNode && node.depth < this.maxDepth) {
        this.subdivide(node);
      }
    } else if (node.children) {
      for (const child of node.children) {
        this.insertIntoNode(child, entityId, position);
      }
    }
  }

  private subdivide(node: OctreeNode): void {
    node.leaf = false;
    node.children = [];

    const { min, max } = node.bounds;
    const midX = (min.x + max.x) / 2;
    const midY = (min.y + max.y) / 2;
    const midZ = (min.z + max.z) / 2;

    // Create 8 children
    for (let x = 0; x < 2; x++) {
      for (let y = 0; y < 2; y++) {
        for (let z = 0; z < 2; z++) {
          const childBounds: BoundingBox = {
            min: {
              x: x === 0 ? min.x : midX,
              y: y === 0 ? min.y : midY,
              z: z === 0 ? min.z : midZ,
            },
            max: {
              x: x === 0 ? midX : max.x,
              y: y === 0 ? midY : max.y,
              z: z === 0 ? midZ : max.z,
            },
          };
          node.children.push(this.createNode(childBounds, node.depth + 1));
        }
      }
    }

    // Redistribute entities
    const entities = Array.from(node.entities);
    node.entities.clear();

    for (const entityId of entities) {
      const pos = this.entityPositions.get(entityId);
      if (pos) {
        for (const child of node.children) {
          this.insertIntoNode(child, entityId, pos);
        }
      }
    }
  }

  remove(entityId: EntityId): void {
    const pos = this.entityPositions.get(entityId);
    if (!pos) return;

    this.entityPositions.delete(entityId);
    this.removeFromNode(this.root, entityId);
  }

  private removeFromNode(node: OctreeNode, entityId: EntityId): void {
    node.entities.delete(entityId);

    if (node.children) {
      for (const child of node.children) {
        this.removeFromNode(child, entityId);
      }
    }
  }

  queryRadius(center: Vector3, radius: number): EntityId[] {
    const result: EntityId[] = [];
    this.queryRadiusNode(this.root, center, radius, result);
    return result;
  }

  private queryRadiusNode(node: OctreeNode, center: Vector3, radius: number, result: EntityId[]): void {
    if (!this.intersectsSphere(node.bounds, center, radius)) {
      return;
    }

    if (node.leaf) {
      for (const entityId of node.entities) {
        const pos = this.entityPositions.get(entityId);
        if (pos && this.distanceSquared(pos, center) <= radius * radius) {
          result.push(entityId);
        }
      }
    } else if (node.children) {
      for (const child of node.children) {
        this.queryRadiusNode(child, center, radius, result);
      }
    }
  }

  queryBox(bounds: BoundingBox): EntityId[] {
    const result: EntityId[] = [];
    this.queryBoxNode(this.root, bounds, result);
    return result;
  }

  private queryBoxNode(node: OctreeNode, bounds: BoundingBox, result: EntityId[]): void {
    if (!this.intersectsBox(node.bounds, bounds)) {
      return;
    }

    if (node.leaf) {
      for (const entityId of node.entities) {
        const pos = this.entityPositions.get(entityId);
        if (pos && this.containsPoint(bounds, pos)) {
          result.push(entityId);
        }
      }
    } else if (node.children) {
      for (const child of node.children) {
        this.queryBoxNode(child, bounds, result);
      }
    }
  }

  private containsPoint(bounds: BoundingBox, point: Vector3): boolean {
    return (
      point.x >= bounds.min.x &&
      point.x <= bounds.max.x &&
      point.y >= bounds.min.y &&
      point.y <= bounds.max.y &&
      point.z >= bounds.min.z &&
      point.z <= bounds.max.z
    );
  }

  private intersectsSphere(bounds: BoundingBox, center: Vector3, radius: number): boolean {
    const closestX = Math.max(bounds.min.x, Math.min(center.x, bounds.max.x));
    const closestY = Math.max(bounds.min.y, Math.min(center.y, bounds.max.y));
    const closestZ = Math.max(bounds.min.z, Math.min(center.z, bounds.max.z));
    const distSq = this.distanceSquared(center, { x: closestX, y: closestY, z: closestZ });
    return distSq <= radius * radius;
  }

  private intersectsBox(a: BoundingBox, b: BoundingBox): boolean {
    return (
      a.min.x <= b.max.x &&
      a.max.x >= b.min.x &&
      a.min.y <= b.max.y &&
      a.max.y >= b.min.y &&
      a.min.z <= b.max.z &&
      a.max.z >= b.min.z
    );
  }

  private distanceSquared(a: Vector3, b: Vector3): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return dx * dx + dy * dy + dz * dz;
  }

  update(entityId: EntityId, newPosition: Vector3): void {
    this.insert(entityId, newPosition);
  }

  clear(): void {
    this.entityPositions.clear();
    this.clearNode(this.root);
  }

  private clearNode(node: OctreeNode): void {
    node.entities.clear();
    if (node.children) {
      for (const child of node.children) {
        this.clearNode(child);
      }
    }
  }
}

// ============================================================================
// World - Main Container
// ============================================================================

export class World {
  readonly entityManager: EntityManager;
  readonly componentManager: ComponentManager;
  readonly systemManager: SystemManager;
  readonly spatialPartition: SpatialPartition;

  private readonly worldSize: number;
  private lastTime: number = -1;
  private accumulator: number = 0;
  private readonly fixedDeltaTime: number = 1 / 60;

  constructor(worldSize: number = 200) {
    this.worldSize = worldSize;
    this.entityManager = new EntityManager();
    this.componentManager = new ComponentManager();
    this.systemManager = new SystemManager();
    this.spatialPartition = new SpatialPartition(worldSize);
  }

  createEntity(): EntityId {
    return this.entityManager.createEntity();
  }

  destroyEntity(id: EntityId): void {
    const transform = this.componentManager.getComponent(id, 'transform');
    if (transform) {
      // Position will be in worldPosition
    }
    this.componentManager.removeAllComponents(id);
    this.entityManager.destroyEntity(id);
  }

  addComponent<T extends IComponent>(entityId: EntityId, component: T): void {
    this.componentManager.addComponent(entityId, component);

    // Update spatial partition if transform added
    if (component.type === 'transform') {
      const transform = component as any;
      this.spatialPartition.insert(entityId, transform.worldPosition || transform.localPosition);
    }
  }

  removeComponent(entityId: EntityId, typeId: ComponentTypeId): void {
    if (typeId === 'transform') {
      this.spatialPartition.remove(entityId);
    }
    this.componentManager.removeComponent(entityId, typeId);
  }

  update(currentTime: number = performance.now() / 1000): void {
    // Skip first frame to establish baseline and prevent huge deltaTime
    if (this.lastTime < 0) {
      this.lastTime = currentTime;
      return;
    }
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    // Fixed timestep for physics/game logic
    this.accumulator += deltaTime;

    while (this.accumulator >= this.fixedDeltaTime) {
      this.systemManager.updateAll(this.fixedDeltaTime, this.entityManager, this.componentManager);
      this.accumulator -= this.fixedDeltaTime;
    }

    // Update spatial partition for moving entities
    this.updateSpatialPartition();
  }

  private updateSpatialPartition(): void {
    const transforms = this.componentManager.getComponentsByType('transform');
    for (const [entityId, transform] of transforms) {
      const t = transform as any;
      if (t.dirty) {
        this.spatialPartition.update(entityId, t.worldPosition || t.localPosition);
        t.dirty = false;
      }
    }
  }

  getEntitiesInRange(center: Vector3, radius: number): EntityId[] {
    return this.spatialPartition.queryRadius(center, radius);
  }

  getEntitiesInBox(bounds: BoundingBox): EntityId[] {
    return this.spatialPartition.queryBox(bounds);
  }

  getStats(): { entities: number; components: number; systems: number } {
    return {
      entities: this.entityManager.getActiveEntityCount(),
      components: this.componentManager.getComponentCount(),
      systems: this.systemManager['systems'].length,
    };
  }
}

export default World;

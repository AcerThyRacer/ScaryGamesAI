/**
 * Total War Engine - Animation System
 * Skeletal animation with blending, state machines, and procedural animation
 */

import type { EntityId, AnimationState } from '../types';

// ============================================================================
// Animation Types
// ============================================================================

export interface AnimationClip {
  id: string;
  name: string;
  duration: number;
  keyframes: AnimationKeyframe[];
  loop: boolean;
  blendDuration: number;
}

export interface AnimationKeyframe {
  time: number;
  boneTransforms: Map<string, BoneTransform>;
  events: AnimationEvent[];
}

export interface BoneTransform {
  position: [number, number, number];
  rotation: [number, number, number, number];
  scale: [number, number, number];
}

export interface AnimationEvent {
  time: number;
  type: 'sound' | 'effect' | 'hit' | 'footstep';
  data: Record<string, unknown>;
}

export interface SkeletonBone {
  name: string;
  parent: string | null;
  bindPose: BoneTransform;
  inverseBindPose: BoneTransform;
  children: string[];
}

export interface Skeleton {
  bones: Map<string, SkeletonBone>;
  rootBones: string[];
}

export interface AnimationInstance {
  entityId: EntityId;
  skeleton: Skeleton;
  currentClip: AnimationClip | null;
  currentTime: number;
  currentSpeed: number;
  previousClip: AnimationClip | null;
  previousTime: number;
  blendProgress: number;
  blendDuration: number;
  stateQueue: AnimationState[];
  layerMasks: Map<string, number>;
}

// ============================================================================
// Animation State Machine
// ============================================================================

interface AnimationStateNode {
  name: AnimationState;
  clip: AnimationClip;
  transitions: AnimationTransition[];
  speed: number;
  loop: boolean;
}

interface AnimationTransition {
  from: AnimationState;
  to: AnimationState;
  condition: (params: AnimationParams) => boolean;
  duration: number;
  exitTime?: number;
}

interface AnimationParams {
  speed: number;
  inCombat: boolean;
  isAttacking: boolean;
  isDead: boolean;
  healthPercent: number;
  isMoving: boolean;
  isCharging: boolean;
}

export class AnimationStateMachine {
  private states: Map<AnimationState, AnimationStateNode> = new Map();
  private currentState: AnimationState = 'idle';
  private params: AnimationParams = {
    speed: 0,
    inCombat: false,
    isAttacking: false,
    isDead: false,
    healthPercent: 1,
    isMoving: false,
    isCharging: false,
  };

  constructor() {
    this.initializeDefaultStates();
  }

  private initializeDefaultStates(): void {
    // Idle
    this.addState('idle', {
      name: 'idle',
      clip: this.createPlaceholderClip('idle', 2.0),
      transitions: [],
      speed: 1,
      loop: true,
    });

    // Walk
    this.addState('walk', {
      name: 'walk',
      clip: this.createPlaceholderClip('walk', 1.0),
      transitions: [],
      speed: 1,
      loop: true,
    });

    // Run
    this.addState('run', {
      name: 'run',
      clip: this.createPlaceholderClip('run', 0.6),
      transitions: [],
      speed: 1,
      loop: true,
    });

    // Attack
    this.addState('attack_melee', {
      name: 'attack_melee',
      clip: this.createPlaceholderClip('attack_melee', 0.8),
      transitions: [],
      speed: 1,
      loop: false,
    });

    // Death
    this.addState('death', {
      name: 'death',
      clip: this.createPlaceholderClip('death', 1.5),
      transitions: [],
      speed: 1,
      loop: false,
    });

    // Add transitions
    this.addTransition('idle', 'walk', p => p.speed > 0.1 && p.speed < 4, 0.2);
    this.addTransition('idle', 'run', p => p.speed >= 4, 0.15);
    this.addTransition('walk', 'idle', p => p.speed <= 0.1, 0.2);
    this.addTransition('walk', 'run', p => p.speed >= 4, 0.1);
    this.addTransition('run', 'idle', p => p.speed <= 0.1, 0.15);
    this.addTransition('run', 'walk', p => p.speed > 0.1 && p.speed < 4, 0.1);
    this.addTransition('idle', 'attack_melee', p => p.isAttacking, 0.1);
    this.addTransition('walk', 'attack_melee', p => p.isAttacking, 0.1);
    this.addTransition('attack_melee', 'idle', p => !p.isAttacking, 0.2);
    this.addTransition('*', 'death', p => p.isDead, 0.1);
  }

  private createPlaceholderClip(name: string, duration: number): AnimationClip {
    return {
      id: name,
      name,
      duration,
      keyframes: [],
      loop: true,
      blendDuration: 0.2,
    };
  }

  addState(state: AnimationState, node: AnimationStateNode): void {
    this.states.set(state, node);
  }

  addTransition(from: AnimationState, to: AnimationState, condition: (p: AnimationParams) => boolean, duration: number): void {
    const fromState = this.states.get(from);
    if (fromState) {
      fromState.transitions.push({ from, to, condition, duration });
    }
  }

  update(deltaTime: number): { state: AnimationState; clip: AnimationClip | null } {
    const current = this.states.get(this.currentState);
    if (!current) return { state: 'idle', clip: null };

    // Check transitions
    for (const transition of current.transitions) {
      if (transition.condition(this.params)) {
        this.currentState = transition.to;
        const newState = this.states.get(this.currentState);
        return { state: this.currentState, clip: newState?.clip || null };
      }
    }

    return { state: this.currentState, clip: current.clip };
  }

  setParam<K extends keyof AnimationParams>(key: K, value: AnimationParams[K]): void {
    this.params[key] = value;
  }

  getState(): AnimationState {
    return this.currentState;
  }
}

// ============================================================================
// Animation System
// ============================================================================

export class AnimationSystem {
  private instances: Map<EntityId, AnimationInstance> = new Map();
  private clips: Map<string, AnimationClip> = new Map();
  private stateMachines: Map<EntityId, AnimationStateMachine> = new Map();
  private globalSpeed: number = 1.0;

  constructor() {
    this.loadDefaultAnimations();
  }

  private loadDefaultAnimations(): void {
    const defaultAnims: AnimationState[] = [
      'idle',
      'walk',
      'run',
      'charge',
      'attack_melee',
      'attack_ranged',
      'defend',
      'death',
      'victory',
      'rally',
      'flee',
    ];

    for (const anim of defaultAnims) {
      this.clips.set(anim, this.createDefaultClip(anim));
    }
  }

  private createDefaultClip(name: string): AnimationClip {
    const durations: Record<string, number> = {
      idle: 3.0,
      walk: 1.2,
      run: 0.8,
      charge: 0.6,
      attack_melee: 0.7,
      attack_ranged: 1.0,
      defend: 0.5,
      death: 2.0,
      victory: 2.5,
      rally: 1.5,
      flee: 0.8,
    };

    return {
      id: name,
      name,
      duration: durations[name] || 1.0,
      keyframes: [],
      loop: !['attack_melee', 'attack_ranged', 'death', 'victory', 'rally'].includes(name),
      blendDuration: 0.2,
    };
  }

  // === Instance Management ===

  createInstance(entityId: EntityId): AnimationInstance {
    const stateMachine = new AnimationStateMachine();
    this.stateMachines.set(entityId, stateMachine);

    const instance: AnimationInstance = {
      entityId,
      skeleton: this.createDefaultSkeleton(),
      currentClip: this.clips.get('idle') || null,
      currentTime: 0,
      currentSpeed: 1.0,
      previousClip: null,
      previousTime: 0,
      blendProgress: 1,
      blendDuration: 0.2,
      stateQueue: [],
      layerMasks: new Map(),
    };

    this.instances.set(entityId, instance);
    return instance;
  }

  private createDefaultSkeleton(): Skeleton {
    const bones = new Map<string, SkeletonBone>();

    // Simplified human skeleton
    const boneList: [string, string | null][] = [
      ['root', null],
      ['hips', 'root'],
      ['spine', 'hips'],
      ['spine1', 'spine'],
      ['spine2', 'spine1'],
      ['neck', 'spine2'],
      ['head', 'neck'],
      ['left_shoulder', 'spine2'],
      ['left_arm', 'left_shoulder'],
      ['left_forearm', 'left_arm'],
      ['left_hand', 'left_forearm'],
      ['right_shoulder', 'spine2'],
      ['right_arm', 'right_shoulder'],
      ['right_forearm', 'right_arm'],
      ['right_hand', 'right_forearm'],
      ['left_thigh', 'hips'],
      ['left_shin', 'left_thigh'],
      ['left_foot', 'left_shin'],
      ['right_thigh', 'hips'],
      ['right_shin', 'right_thigh'],
      ['right_foot', 'right_shin'],
    ];

    for (const [name, parent] of boneList) {
      const bone: SkeletonBone = {
        name,
        parent,
        bindPose: { position: [0, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] },
        inverseBindPose: { position: [0, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] },
        children: [],
      };
      bones.set(name, bone);
    }

    // Set children
    for (const [name, bone] of bones) {
      if (bone.parent) {
        const parent = bones.get(bone.parent);
        if (parent) {
          parent.children.push(name);
        }
      }
    }

    return {
      bones,
      rootBones: ['hips'],
    };
  }

  destroyInstance(entityId: EntityId): void {
    this.instances.delete(entityId);
    this.stateMachines.delete(entityId);
  }

  // === Animation Control ===

  play(entityId: EntityId, stateName: AnimationState, blendDuration: number = 0.2): void {
    const instance = this.instances.get(entityId);
    const clip = this.clips.get(stateName);
    if (!instance || !clip) return;

    // Store previous animation for blending
    if (instance.currentClip) {
      instance.previousClip = instance.currentClip;
      instance.previousTime = instance.currentTime;
      instance.blendProgress = 0;
      instance.blendDuration = blendDuration;
    }

    instance.currentClip = clip;
    instance.currentTime = 0;
  }

  setSpeed(entityId: EntityId, speed: number): void {
    const instance = this.instances.get(entityId);
    if (instance) {
      instance.currentSpeed = speed;
    }
  }

  queueState(entityId: EntityId, state: AnimationState): void {
    const instance = this.instances.get(entityId);
    if (instance) {
      instance.stateQueue.push(state);
    }
  }

  // === Update ===

  update(deltaTime: number): void {
    const scaledDelta = deltaTime * this.globalSpeed;

    for (const [entityId, instance] of this.instances) {
      const stateMachine = this.stateMachines.get(entityId);
      if (!stateMachine) continue;

      // Update state machine
      const { state, clip } = stateMachine.update(scaledDelta);

      // Switch clip if state changed
      if (clip && clip !== instance.currentClip) {
        this.play(entityId, state, 0.2);
      }

      // Update current animation time
      if (instance.currentClip) {
        instance.currentTime += scaledDelta * instance.currentSpeed;

        // Handle looping
        if (instance.currentTime >= instance.currentClip.duration) {
          if (instance.currentClip.loop) {
            instance.currentTime = instance.currentTime % instance.currentClip.duration;
          } else {
            // Check for queued animations
            if (instance.stateQueue.length > 0) {
              const nextState = instance.stateQueue.shift()!;
              this.play(entityId, nextState);
            } else {
              instance.currentTime = instance.currentClip.duration;
            }
          }
        }
      }

      // Update blend
      if (instance.blendProgress < 1) {
        instance.blendProgress = Math.min(
          1,
          instance.blendProgress + scaledDelta / instance.blendDuration
        );

        // Update previous animation time
        if (instance.previousClip) {
          instance.previousTime += scaledDelta * instance.currentSpeed;
        }
      }
    }
  }

  // === Skeleton Evaluation ===

  evaluateSkeleton(entityId: EntityId): Map<string, BoneTransform> {
    const instance = this.instances.get(entityId);
    if (!instance || !instance.currentClip) {
      return new Map();
    }

    const result = new Map<string, BoneTransform>();
    const skeleton = instance.skeleton;

    // Evaluate current animation
    const currentPose = this.evaluateClip(instance.currentClip, instance.currentTime);

    // Blend with previous if needed
    if (instance.previousClip && instance.blendProgress < 1) {
      const previousPose = this.evaluateClip(instance.previousClip, instance.previousTime);
      const blendWeight = instance.blendProgress;

      for (const [boneName, currentTransform] of currentPose) {
        const previousTransform = previousPose.get(boneName);
        if (previousTransform) {
          result.set(boneName, this.blendTransforms(previousTransform, currentTransform, blendWeight));
        } else {
          result.set(boneName, currentTransform);
        }
      }
    } else {
      for (const [boneName, transform] of currentPose) {
        result.set(boneName, transform);
      }
    }

    // Apply procedural animations
    this.applyProceduralAnimation(entityId, result, skeleton);

    return result;
  }

  private evaluateClip(clip: AnimationClip, time: number): Map<string, BoneTransform> {
    const result = new Map<string, BoneTransform>();

    // Placeholder - would interpolate between keyframes
    for (const keyframe of clip.keyframes) {
      if (keyframe.time <= time) {
        for (const [boneName, transform] of keyframe.boneTransforms) {
          result.set(boneName, transform);
        }
      }
    }

    return result;
  }

  private blendTransforms(a: BoneTransform, b: BoneTransform, weight: number): BoneTransform {
    return {
      position: [
        a.position[0] + (b.position[0] - a.position[0]) * weight,
        a.position[1] + (b.position[1] - a.position[1]) * weight,
        a.position[2] + (b.position[2] - a.position[2]) * weight,
      ],
      rotation: this.slerpQuaternion(a.rotation, b.rotation, weight),
      scale: [
        a.scale[0] + (b.scale[0] - a.scale[0]) * weight,
        a.scale[1] + (b.scale[1] - a.scale[1]) * weight,
        a.scale[2] + (b.scale[2] - a.scale[2]) * weight,
      ],
    };
  }

  private slerpQuaternion(a: [number, number, number, number], b: [number, number, number, number], t: number): [number, number, number, number] {
    // Simplified slerp
    return [
      a[0] + (b[0] - a[0]) * t,
      a[1] + (b[1] - a[1]) * t,
      a[2] + (b[2] - a[2]) * t,
      a[3] + (b[3] - a[3]) * t,
    ];
  }

  private applyProceduralAnimation(entityId: EntityId, pose: Map<string, BoneTransform>, skeleton: Skeleton): void {
    // Add breathing, looking at targets, etc.
  }

  // === Animation Events ===

  getActiveEvents(entityId: EntityId, deltaTime: number): AnimationEvent[] {
    const instance = this.instances.get(entityId);
    if (!instance || !instance.currentClip) return [];

    const events: AnimationEvent[] = [];
    const prevTime = instance.currentTime - deltaTime * instance.currentSpeed;
    const currTime = instance.currentTime;

    for (const keyframe of instance.currentClip.keyframes) {
      if (keyframe.time > prevTime && keyframe.time <= currTime) {
        events.push(...keyframe.events);
      }
    }

    return events;
  }

  // === Utility ===

  setGlobalSpeed(speed: number): void {
    this.globalSpeed = speed;
  }

  getInstanceState(entityId: EntityId): AnimationState | null {
    const stateMachine = this.stateMachines.get(entityId);
    return stateMachine?.getState() || null;
  }

  isAnimationComplete(entityId: EntityId): boolean {
    const instance = this.instances.get(entityId);
    if (!instance || !instance.currentClip) return true;
    return !instance.currentClip.loop && instance.currentTime >= instance.currentClip.duration;
  }
}

export default AnimationSystem;

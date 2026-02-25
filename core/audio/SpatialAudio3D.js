/**
 * HRTF 3D Spatial Audio System - Phase 2: Advanced Audio Systems
 * Binaural audio with head-related transfer functions for realistic 3D sound
 */

export class SpatialAudio3D {
  constructor(audioContext) {
    this.context = audioContext;
    this.listener = this.context.listener;
    this.sources = new Map();
    this.occlusionEnabled = true;
    this.dopplerEnabled = true;
    this.hrtfMode = 'equalPower'; // 'equalPower' or 'HRTF'
    
    // Default listener position (player's ears)
    this.listenerPosition = { x: 0, y: 1.6, z: 0 };
    this.listenerOrientation = { 
      forward: { x: 0, y: 0, z: -1 },
      up: { x: 0, y: 1, z: 0 }
    };
  }

  /**
   * Create a 3D sound source
   */
  createSource(buffer, position, options = {}) {
    const source = this.context.createBufferSource();
    source.buffer = buffer;

    // Create panner node with HRTF
    const panner = this.context.createPanner();
    panner.positionX.value = position.x || 0;
    panner.positionY.value = position.y || 0;
    panner.positionZ.value = position.z || 0;
    panner.panningModel = this.hrtfMode;
    panner.distanceModel = options.distanceModel || 'inverse';
    panner.refDistance = options.refDistance || 1;
    panner.maxDistance = options.maxDistance || 10000;
    panner.rolloffFactor = options.rolloffFactor || 1;
    panner.coneInnerAngle = options.coneInnerAngle || 360;
    panner.coneOuterAngle = options.coneOuterAngle || 360;
    panner.coneOuterGain = options.coneOuterGain || 0;

    // Doppler effect
    if (this.dopplerEnabled) {
      panner.velocityX.value = 0;
      panner.velocityY.value = 0;
      panner.velocityZ.value = 0;
    }

    // Create gain for distance-based volume
    const gainNode = this.context.createGain();
    gainNode.gain.value = options.gain || 1;

    // Create occlusion filter
    const occlusionFilter = this.context.createBiquadFilter();
    occlusionFilter.type = 'lowpass';
    occlusionFilter.frequency.value = options.occlusionFrequency || 20000;
    occlusionFilter.Q.value = 0.5;

    // Connect chain
    source.connect(panner);
    panner.connect(occlusionFilter);
    occlusionFilter.connect(gainNode);
    gainNode.connect(this.context.destination);

    // Store source info
    const sourceId = this.generateId();
    this.sources.set(sourceId, {
      source,
      panner,
      gain: gainNode,
      occlusion: occlusionFilter,
      position: { ...position },
      velocity: { x: 0, y: 0, z: 0 },
      options
    });

    return { id: sourceId, source, panner, gain: gainNode };
  }

  /**
   * Update listener (player) position and orientation
   */
  updateListener(position, orientation) {
    this.listenerPosition = { ...position };
    this.listenerOrientation = { ...orientation };

    // Update Web Audio API listener
    this.listener.positionX.value = position.x;
    this.listener.positionY.value = position.y;
    this.listener.positionZ.value = position.z;

    const forward = orientation.forward || { x: 0, y: 0, z: -1 };
    const up = orientation.up || { x: 0, y: 1, z: 0 };

    this.listener.forwardX.value = forward.x;
    this.listener.forwardY.value = forward.y;
    this.listener.forwardZ.value = forward.z;
    this.listener.upX.value = up.x;
    this.listener.upY.value = up.y;
    this.listener.upZ.value = up.z;

    // Update all sources for occlusion
    if (this.occlusionEnabled) {
      this.updateOcclusion();
    }
  }

  /**
   * Update source position
   */
  updateSourcePosition(sourceId, position, velocity = null) {
    const sourceData = this.sources.get(sourceId);
    if (!sourceData) return;

    sourceData.position = { ...position };
    sourceData.panner.positionX.value = position.x;
    sourceData.panner.positionY.value = position.y;
    sourceData.panner.positionZ.value = position.z;

    if (velocity) {
      sourceData.velocity = { ...velocity };
      if (this.dopplerEnabled) {
        sourceData.panner.velocityX.value = velocity.x;
        sourceData.panner.velocityY.value = velocity.y;
        sourceData.panner.velocityZ.value = velocity.z;
      }
    }
  }

  /**
   * Update occlusion based on raycasting
   */
  updateOcclusion() {
    this.sources.forEach((sourceData, sourceId) => {
      const dx = sourceData.position.x - this.listenerPosition.x;
      const dy = sourceData.position.y - this.listenerPosition.y;
      const dz = sourceData.position.z - this.listenerPosition.z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

      // Check for occlusion (simplified - would use raycast in real implementation)
      const occluded = this.checkOcclusion(sourceData.position);
      
      if (occluded) {
        // Lowpass filter when occluded
        sourceData.occlusion.frequency.setTargetAtTime(
          sourceData.options.occlusionFrequency || 500,
          this.context.currentTime,
          0.1
        );
      } else {
        sourceData.occlusion.frequency.setTargetAtTime(
          20000,
          this.context.currentTime,
          0.1
        );
      }
    });
  }

  /**
   * Simple occlusion check (placeholder for real raycasting)
   */
  checkOcclusion(position) {
    // In a real implementation, this would raycast against the game world
    // For now, we'll use a simple distance-based heuristic
    return false;
  }

  /**
   * Set source volume
   */
  setSourceVolume(sourceId, volume) {
    const sourceData = this.sources.get(sourceId);
    if (sourceData) {
      sourceData.gain.gain.setTargetAtTime(
        volume,
        this.context.currentTime,
        0.1
      );
    }
  }

  /**
   * Stop and remove source
   */
  stopSource(sourceId) {
    const sourceData = this.sources.get(sourceId);
    if (sourceData) {
      try {
        sourceData.source.stop();
      } catch (e) {}
      this.sources.delete(sourceId);
    }
  }

  /**
   * Stop all sources
   */
  stopAll() {
    this.sources.forEach((sourceData, sourceId) => {
      try {
        sourceData.source.stop();
      } catch (e) {}
    });
    this.sources.clear();
  }

  /**
   * Enable/disable HRTF mode
   */
  setHRTFMode(enabled) {
    this.hrtfMode = enabled ? 'HRTF' : 'equalPower';
    
    // Update all existing sources
    this.sources.forEach((sourceData) => {
      sourceData.panner.panningModel = this.hrtfMode;
    });
  }

  /**
   * Enable/disable occlusion
   */
  setOcclusionEnabled(enabled) {
    this.occlusionEnabled = enabled;
  }

  /**
   * Enable/disable Doppler effect
   */
  setDopplerEnabled(enabled) {
    this.dopplerEnabled = enabled;
    
    this.sources.forEach((sourceData) => {
      if (enabled) {
        sourceData.panner.velocityX.value = sourceData.velocity.x;
        sourceData.panner.velocityY.value = sourceData.velocity.y;
        sourceData.panner.velocityZ.value = sourceData.velocity.z;
      } else {
        sourceData.panner.velocityX.value = 0;
        sourceData.panner.velocityY.value = 0;
        sourceData.panner.velocityZ.value = 0;
      }
    });
  }

  /**
   * Get distance to source
   */
  getDistance(sourceId) {
    const sourceData = this.sources.get(sourceId);
    if (!sourceData) return Infinity;

    const dx = sourceData.position.x - this.listenerPosition.x;
    const dy = sourceData.position.y - this.listenerPosition.y;
    const dz = sourceData.position.z - this.listenerPosition.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Get direction to source (normalized vector)
   */
  getDirection(sourceId) {
    const sourceData = this.sources.get(sourceId);
    if (!sourceData) return { x: 0, y: 0, z: 0 };

    const dx = sourceData.position.x - this.listenerPosition.x;
    const dy = sourceData.position.y - this.listenerPosition.y;
    const dz = sourceData.position.z - this.listenerPosition.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (distance === 0) return { x: 0, y: 0, z: 0 };

    return {
      x: dx / distance,
      y: dy / distance,
      z: dz / distance
    };
  }

  /**
   * Generate unique source ID
   */
  generateId() {
    return `source_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get active source count
   */
  getActiveSourceCount() {
    return this.sources.size;
  }

  /**
   * Cleanup
   */
  dispose() {
    this.stopAll();
    this.sources.clear();
  }
}

export default SpatialAudio3D;

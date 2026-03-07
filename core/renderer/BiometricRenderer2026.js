import { NextGenHorrorSystem } from '../nextgen-horror-system.js';

const EXPRESSIONS = ['neutral', 'fear', 'surprise', 'calm', 'anger', 'disgust', 'sadness'];

const NEUTRAL_PARAMS = Object.freeze({
  vignette: { intensity: 0, pulseRate: 0, color: [0, 0, 0] },
  fog: { density: 0.1, color: [0.5, 0.5, 0.5] },
  colorGrading: { saturation: 1.0, contrast: 1.0, brightness: 1.0, tint: [1, 1, 1] },
  chromaticAberration: { intensity: 0 },
  screenEffects: { flashIntensity: 0, desaturation: 0 },
  psychologicalIntensity: 0,
  scareFrequencyMultiplier: 1.0,
});

const lerp = (a, b, t) => a + (b - a) * t;
const lerpColor = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

function deepCloneParams(p) {
  return {
    vignette: { ...p.vignette, color: [...p.vignette.color] },
    fog: { ...p.fog, color: [...p.fog.color] },
    colorGrading: { ...p.colorGrading, tint: [...p.colorGrading.tint] },
    chromaticAberration: { ...p.chromaticAberration },
    screenEffects: { ...p.screenEffects },
    psychologicalIntensity: p.psychologicalIntensity,
    scareFrequencyMultiplier: p.scareFrequencyMultiplier,
  };
}

function lerpParams(cur, tgt, t) {
  cur.vignette.intensity = lerp(cur.vignette.intensity, tgt.vignette.intensity, t);
  cur.vignette.pulseRate = lerp(cur.vignette.pulseRate, tgt.vignette.pulseRate, t);
  cur.vignette.color = lerpColor(cur.vignette.color, tgt.vignette.color, t);
  cur.fog.density = lerp(cur.fog.density, tgt.fog.density, t);
  cur.fog.color = lerpColor(cur.fog.color, tgt.fog.color, t);
  for (const k of ['saturation', 'contrast', 'brightness']) {
    cur.colorGrading[k] = lerp(cur.colorGrading[k], tgt.colorGrading[k], t);
  }
  cur.colorGrading.tint = lerpColor(cur.colorGrading.tint, tgt.colorGrading.tint, t);
  cur.chromaticAberration.intensity = lerp(cur.chromaticAberration.intensity, tgt.chromaticAberration.intensity, t);
  cur.screenEffects.flashIntensity = lerp(cur.screenEffects.flashIntensity, tgt.screenEffects.flashIntensity, t);
  cur.screenEffects.desaturation = lerp(cur.screenEffects.desaturation, tgt.screenEffects.desaturation, t);
  cur.psychologicalIntensity = lerp(cur.psychologicalIntensity, tgt.psychologicalIntensity, t);
  cur.scareFrequencyMultiplier = lerp(cur.scareFrequencyMultiplier, tgt.scareFrequencyMultiplier, t);
}

export class BiometricRenderer2026 {
  constructor(device, options = {}) {
    this.device = device;
    this.options = options;

    this._initialized = false;
    this._biometricSystem = null;
    this._panicMode = false;

    // Safety & tuning
    this._maxFearLevel = options.maxFearLevel ?? 0.8;
    this._cooldownMs = (options.cooldownSeconds ?? 10) * 1000;
    this._heartRateSafetyThreshold = options.heartRateSafetyThreshold ?? 180;
    this._lerpSpeed = options.lerpSpeed ?? 0.05;
    this._panicLerpSpeed = 0.15;
    this._smoothingFactor = options.smoothingFactor ?? 0.9;
    this._calibrationDurationMs = (options.calibrationSeconds ?? 30) * 1000;

    // Smoothed biometric state (EMA)
    this._smoothed = { heartRate: 72, stressLevel: 0, ambientLight: 1.0 };
    this._rawExpression = 'neutral';
    this._prevSmoothedHR = 72;

    // Heart rate baseline calibration
    this._heartRateBaseline = 72;
    this._calibrationSamples = [];
    this._calibrationStartTime = 0;
    this._calibrated = false;

    // Stress history (rolling window), recovery tracking
    this._stressHistory = [];
    this._stressWindowMs = 120_000;
    this._prolongedStressThresholdMs = 60_000;
    this._prolongedStressLevel = 0.6;
    this._wasHighStress = false;

    // Cooldown timers, visual state
    this._cooldowns = new Map();
    this._currentParams = deepCloneParams(NEUTRAL_PARAMS);
    this._targetParams = deepCloneParams(NEUTRAL_PARAMS);

    this.stats = {
      currentStress: 0, heartRate: 0, expression: 'neutral',
      activeEffects: [], panicMode: false, cooldownRemaining: 0, frameCount: 0,
    };
  }

  async initialize(biometricSystem) {
    if (biometricSystem) {
      this._biometricSystem = biometricSystem;
    }

    this._calibrationStartTime = Date.now();
    this._calibrated = false;
    this._calibrationSamples = [];
    this._panicMode = false;
    this._stressHistory = [];
    this._cooldowns.clear();
    this._currentParams = deepCloneParams(NEUTRAL_PARAMS);
    this._targetParams = deepCloneParams(NEUTRAL_PARAMS);

    this._initialized = true;
  }

  updateBiometrics(data) {
    if (!this._initialized) return;

    const now = Date.now();
    const hr = data.heartRate ?? this._smoothed.heartRate;
    const expression = EXPRESSIONS.includes(data.expression) ? data.expression : 'neutral';
    const ambient = clamp(data.ambientLight ?? 1.0, 0, 1);
    const rawStress = clamp(data.stressLevel ?? 0, 0, 1);

    // Exponential moving average smoothing
    const sf = this._smoothingFactor;
    this._prevSmoothedHR = this._smoothed.heartRate;
    this._smoothed.heartRate = this._smoothed.heartRate * sf + hr * (1 - sf);
    this._smoothed.stressLevel = this._smoothed.stressLevel * sf + rawStress * (1 - sf);
    this._smoothed.ambientLight = this._smoothed.ambientLight * sf + ambient * (1 - sf);
    this._rawExpression = expression;

    // Heart rate baseline calibration from first N seconds
    if (!this._calibrated) {
      this._calibrationSamples.push(hr);
      if (now - this._calibrationStartTime >= this._calibrationDurationMs && this._calibrationSamples.length > 0) {
        this._heartRateBaseline = this._calibrationSamples.reduce((a, b) => a + b, 0) / this._calibrationSamples.length;
        this._calibrated = true;
      }
    }

    // Record stress history
    this._stressHistory.push({ time: now, stress: this._smoothed.stressLevel });
    const cutoff = now - this._stressWindowMs;
    while (this._stressHistory.length > 0 && this._stressHistory[0].time < cutoff) {
      this._stressHistory.shift();
    }

    // Safety: heart rate threshold triggers automatic cooldown
    if (this._smoothed.heartRate > this._heartRateSafetyThreshold) {
      this._enterSafetyCooldown(now);
      return;
    }

    // If panic mode active, lerp toward neutral and skip effect computation
    if (this._panicMode) {
      lerpParams(this._currentParams, NEUTRAL_PARAMS, this._panicLerpSpeed);
      this._updateStats(now);
      return;
    }

    this._computeTargetParams(now);
    lerpParams(this._currentParams, this._targetParams, this._lerpSpeed);
    this._updateStats(now);
  }

  _computeTargetParams(now) {
    const target = deepCloneParams(NEUTRAL_PARAMS);
    const stress = this._smoothed.stressLevel;
    const hr = this._smoothed.heartRate;
    const expr = this._rawExpression;
    const ambient = this._smoothed.ambientLight;
    const scale = Math.min(stress, this._maxFearLevel);
    const activeEffects = [];

    // Heart rate elevated (>100bpm)
    if (hr > 100) {
      const factor = clamp((hr - 100) / 80, 0, 1) * scale;
      target.vignette.pulseRate += 1.5 * factor;
      target.vignette.intensity += 0.4 * factor;
      target.vignette.color = lerpColor(target.vignette.color, [0.3, 0, 0], factor * 0.5);
      target.fog.density += 0.3 * factor;
      activeEffects.push('heartRateElevated');
    }

    // Heart rate spike (sudden >30bpm jump)
    const hrDelta = this._smoothed.heartRate - this._prevSmoothedHR;
    if (hrDelta > 30 && this._canTrigger('hrSpike', now)) {
      target.screenEffects.flashIntensity = 0.7 * scale;
      target.chromaticAberration.intensity = 0.6 * scale;
      this._markTriggered('hrSpike', now);
      activeEffects.push('heartRateSpike');
    }

    // Fear expression detected
    if (expr === 'fear') {
      const fearScale = 0.8 * scale;
      target.psychologicalIntensity = Math.max(target.psychologicalIntensity, fearScale);
      target.vignette.intensity += 0.2 * fearScale;
      activeEffects.push('fearExpression');
    }

    // Calm/bored detected
    if (expr === 'calm' || expr === 'neutral') {
      const boredomFactor = 1.0 - scale;
      target.scareFrequencyMultiplier = 1.0 + 0.8 * boredomFactor;
      target.colorGrading.brightness = Math.max(0.7, target.colorGrading.brightness - 0.15 * boredomFactor);
      target.fog.density += 0.15 * boredomFactor;
      if (boredomFactor > 0.4) activeEffects.push('calmAtmosphere');
    }

    // Surprise detected
    if (expr === 'surprise') {
      target.screenEffects.flashIntensity = Math.max(target.screenEffects.flashIntensity, 0.3 * scale);
      target.chromaticAberration.intensity = Math.max(target.chromaticAberration.intensity, 0.25 * scale);
      target.psychologicalIntensity = Math.max(target.psychologicalIntensity, 0.5 * scale);
      activeEffects.push('surpriseExtended');
    }

    // Dark room (ambientLight < 0.2)
    if (ambient < 0.2) {
      const darkFactor = 1.0 - ambient / 0.2;
      target.colorGrading.brightness -= 0.2 * darkFactor;
      target.colorGrading.contrast += 0.3 * darkFactor;
      target.vignette.intensity += 0.25 * darkFactor;
      activeEffects.push('darkRoom');
    }

    // Prolonged stress (>60s continuous high stress)
    const prolongedStress = this._isProlongedStress(now);
    if (prolongedStress) {
      const prolongedFactor = clamp(prolongedStress, 0, 1) * scale;
      target.colorGrading.saturation -= 0.4 * prolongedFactor;
      target.psychologicalIntensity = Math.max(0, target.psychologicalIntensity - 0.2 * prolongedFactor);
      target.fog.density = Math.max(0.1, target.fog.density - 0.1 * prolongedFactor);
      activeEffects.push('prolongedStress');
    }

    // Recovery phase (stress dropping after high period)
    const recovering = this._isRecovering();
    if (recovering) {
      const recoveryFactor = clamp(recovering, 0, 1);
      target.colorGrading.tint = lerpColor(target.colorGrading.tint, [1.05, 1.0, 0.92], recoveryFactor * 0.5);
      target.colorGrading.saturation = lerp(target.colorGrading.saturation, 1.0, recoveryFactor * 0.3);
      target.vignette.intensity *= 1.0 - recoveryFactor * 0.3;
      activeEffects.push('recovery');
    }

    // Clamp all values to safe ranges
    target.vignette.intensity = clamp(target.vignette.intensity, 0, 1);
    target.vignette.pulseRate = clamp(target.vignette.pulseRate, 0, 5);
    target.fog.density = clamp(target.fog.density, 0.05, 1);
    target.colorGrading.saturation = clamp(target.colorGrading.saturation, 0.2, 1.2);
    target.colorGrading.contrast = clamp(target.colorGrading.contrast, 0.5, 2.0);
    target.colorGrading.brightness = clamp(target.colorGrading.brightness, 0.3, 1.2);
    target.chromaticAberration.intensity = clamp(target.chromaticAberration.intensity, 0, 1);
    target.screenEffects.flashIntensity = clamp(target.screenEffects.flashIntensity, 0, 1);
    target.screenEffects.desaturation = clamp(target.screenEffects.desaturation, 0, 1);
    target.psychologicalIntensity = clamp(target.psychologicalIntensity, 0, this._maxFearLevel);
    target.scareFrequencyMultiplier = clamp(target.scareFrequencyMultiplier, 0.5, 3.0);
    this._targetParams = target;
    this.stats.activeEffects = activeEffects;
  }

  _isProlongedStress(now) {
    if (this._stressHistory.length < 2) return 0;
    const relevant = this._stressHistory.filter(e => e.time >= now - this._prolongedStressThresholdMs);
    if (relevant.length === 0) return 0;
    const avg = relevant.reduce((s, e) => s + e.stress, 0) / relevant.length;
    if (avg < this._prolongedStressLevel) return 0;
    return clamp((avg - this._prolongedStressLevel) / (1.0 - this._prolongedStressLevel), 0, 1);
  }

  _isRecovering() {
    if (this._stressHistory.length < 20) return 0;
    const recent = this._stressHistory.slice(-10);
    const older = this._stressHistory.slice(-20, -10);
    const recentAvg = recent.reduce((s, e) => s + e.stress, 0) / recent.length;
    const olderAvg = older.reduce((s, e) => s + e.stress, 0) / older.length;
    const drop = olderAvg - recentAvg;
    if (olderAvg > this._prolongedStressLevel && drop > 0.1) {
      this._wasHighStress = true;
      return clamp(drop / 0.4, 0, 1);
    }
    if (this._wasHighStress && recentAvg < 0.3) this._wasHighStress = false;
    return 0;
  }

  _canTrigger(name, now) {
    const e = this._cooldowns.get(name);
    return !e || now - e.lastTriggered >= e.cooldownMs;
  }

  _markTriggered(name, now) {
    this._cooldowns.set(name, { lastTriggered: now, cooldownMs: this._cooldownMs });
  }

  _getMaxCooldownRemaining(now) {
    let max = 0;
    for (const [, e] of this._cooldowns) {
      max = Math.max(max, Math.max(0, e.cooldownMs - (now - e.lastTriggered)));
    }
    return max;
  }

  _enterSafetyCooldown(now) {
    this._targetParams = deepCloneParams(NEUTRAL_PARAMS);
    lerpParams(this._currentParams, NEUTRAL_PARAMS, this._panicLerpSpeed);
    this._markTriggered('safetyCooldown', now);
    this.stats.activeEffects = ['safetyCooldown'];
    this._updateStats(now);
  }

  _updateStats(now) {
    Object.assign(this.stats, {
      currentStress: this._smoothed.stressLevel,
      heartRate: this._smoothed.heartRate,
      expression: this._rawExpression,
      panicMode: this._panicMode,
      cooldownRemaining: this._getMaxCooldownRemaining(now),
    });
    this.stats.frameCount++;
  }

  getVisualParams() {
    return this._initialized ? deepCloneParams(this._currentParams) : deepCloneParams(NEUTRAL_PARAMS);
  }

  applyToRenderer(renderParams) {
    const visual = this.getVisualParams();
    renderParams.vignette = Object.assign(renderParams.vignette ?? {}, visual.vignette);
    renderParams.fog = Object.assign(renderParams.fog ?? {}, visual.fog);
    renderParams.colorGrading = Object.assign(renderParams.colorGrading ?? {}, visual.colorGrading);
    renderParams.chromaticAberration = Object.assign(renderParams.chromaticAberration ?? {}, visual.chromaticAberration);
    renderParams.screenEffects = Object.assign(renderParams.screenEffects ?? {}, visual.screenEffects);
    renderParams.psychologicalIntensity = visual.psychologicalIntensity;
    renderParams.scareFrequencyMultiplier = visual.scareFrequencyMultiplier;
    return renderParams;
  }

  setPanicButton() {
    this._panicMode = true;
    this._targetParams = deepCloneParams(NEUTRAL_PARAMS);
    lerpParams(this._currentParams, NEUTRAL_PARAMS, this._panicLerpSpeed);
    this.stats.panicMode = true;
    this.stats.activeEffects = ['panicReset'];
  }

  resetPanic() { this._panicMode = false; this.stats.panicMode = false; }

  setMaxFearLevel(level) { this._maxFearLevel = clamp(level, 0, 1); }

  getStats() {
    return {
      currentStress: this.stats.currentStress,
      heartRate: this.stats.heartRate,
      expression: this.stats.expression,
      activeEffects: [...this.stats.activeEffects],
      panicMode: this.stats.panicMode,
      cooldownRemaining: this.stats.cooldownRemaining,
    };
  }

  dispose() {
    this._biometricSystem = null;
    this._stressHistory.length = 0;
    this._calibrationSamples.length = 0;
    this._cooldowns.clear();
    this._currentParams = deepCloneParams(NEUTRAL_PARAMS);
    this._targetParams = deepCloneParams(NEUTRAL_PARAMS);
    this._panicMode = false;
    this.device = null;
    this._initialized = false;
  }
}

export default BiometricRenderer2026;

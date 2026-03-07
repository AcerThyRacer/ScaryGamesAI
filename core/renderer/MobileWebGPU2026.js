/**
 * MobileWebGPU2026.js
 * Mobile WebGPU Optimization Layer for the ScaryGamesAI rendering engine.
 * Automatically adapts the rendering pipeline for mobile GPUs (Adreno, Mali, Apple GPU).
 * Handles device detection, quality presets, battery-aware scaling, thermal throttling,
 * and touch-optimized rendering.
 */

const DEVICE_TIERS = {
  HIGH_END_MOBILE: 'high_end_mobile',
  MID_MOBILE: 'mid_mobile',
  LOW_END_MOBILE: 'low_end_mobile',
  TABLET: 'tablet',
  DESKTOP: 'desktop',
  UNKNOWN: 'unknown'
};

const MOBILE_GPU_PATTERNS = {
  apple_high: /Apple A(1[7-9]|[2-9]\d)|Apple M[2-9]|Apple GPU.*Pro/i,
  apple_mid: /Apple A1[5-6]|Apple M1/i,
  apple_low: /Apple A1[0-4]|Apple A[1-9]\b/i,
  snapdragon_high: /Adreno.*7[5-9]|Adreno.*8[0-9]|Snapdragon 8 Gen [3-9]/i,
  snapdragon_mid: /Adreno.*7[0-4]|Adreno.*6[4-9]|Snapdragon 8 Gen [1-2]/i,
  snapdragon_low: /Adreno.*6[0-3]|Adreno.*[1-5]\d\d/i,
  mali_high: /Mali-G7[2-9]|Mali-G[8-9]\d|Mali-Immortalis/i,
  mali_mid: /Mali-G7[0-1]|Mali-G6[8-9]|Mali-G57/i,
  mali_low: /Mali-G[1-5]\d|Mali-T/i
};

const QUALITY_PRESETS = {
  [DEVICE_TIERS.HIGH_END_MOBILE]: {
    renderScale: 0.85,
    maxTextureSize: 2048,
    shadowMapSize: 1024,
    baseLOD: 1,
    maxLOD: 4,
    enableVolumetrics: false,
    enablePathTracing: false,
    enableSSR: true,
    enableBloom: true,
    enableAO: true,
    particleLimit: 2000,
    drawCallBudget: 800,
    renderTargetFormat: 'rgba16float',
    enableFog: true,
    fogMode: 'volumetric_lite'
  },
  [DEVICE_TIERS.MID_MOBILE]: {
    renderScale: 0.7,
    maxTextureSize: 2048,
    shadowMapSize: 512,
    baseLOD: 2,
    maxLOD: 4,
    enableVolumetrics: false,
    enablePathTracing: false,
    enableSSR: false,
    enableBloom: true,
    enableAO: false,
    particleLimit: 1000,
    drawCallBudget: 500,
    renderTargetFormat: 'r11g11b10ufloat',
    enableFog: true,
    fogMode: 'simple'
  },
  [DEVICE_TIERS.LOW_END_MOBILE]: {
    renderScale: 0.5,
    maxTextureSize: 1024,
    shadowMapSize: 256,
    baseLOD: 3,
    maxLOD: 4,
    enableVolumetrics: false,
    enablePathTracing: false,
    enableSSR: false,
    enableBloom: false,
    enableAO: false,
    particleLimit: 300,
    drawCallBudget: 200,
    renderTargetFormat: 'r11g11b10ufloat',
    enableFog: true,
    fogMode: 'simple'
  },
  [DEVICE_TIERS.TABLET]: {
    renderScale: 0.9,
    maxTextureSize: 2048,
    shadowMapSize: 1024,
    baseLOD: 1,
    maxLOD: 4,
    enableVolumetrics: false,
    enablePathTracing: false,
    enableSSR: true,
    enableBloom: true,
    enableAO: true,
    particleLimit: 3000,
    drawCallBudget: 1000,
    renderTargetFormat: 'rgba16float',
    enableFog: true,
    fogMode: 'volumetric_lite'
  }
};

export class MobileWebGPU2026 {
  constructor(device, options = {}) {
    this.device = device;
    this.options = {
      forceDeviceTier: options.forceDeviceTier ?? null,
      minFPS: options.minFPS ?? 30,
      targetFPS: options.targetFPS ?? 60,
      batteryLowThreshold: options.batteryLowThreshold ?? 0.2,
      batteryCriticalThreshold: options.batteryCriticalThreshold ?? 0.1,
      thermalWindowSize: options.thermalWindowSize ?? 60,
      thermalSpikeThreshold: options.thermalSpikeThreshold ?? 1.5,
      minTouchTargetPx: options.minTouchTargetPx ?? 44,
      ...options
    };

    this.initialized = false;
    this.detectedTier = DEVICE_TIERS.UNKNOWN;
    this.adapterInfo = null;
    this._isMobile = false;
    this._isTablet = false;

    this.batteryLevel = 1.0;
    this.batteryCharging = true;
    this._batteryManager = null;

    this.frameHistory = [];
    this.currentQualityMultiplier = 1.0;
    this.thermalState = 'normal';
    this._dynamicRenderScale = 1.0;

    this.f16Supported = false;
    this.currentSettings = null;
  }

  async initialize() {
    if (this.initialized) return;

    await this._detectDevice();
    await this._detectF16Support();
    await this._initBatteryMonitor();

    this.currentSettings = this.getOptimalSettings();
    this.initialized = true;
  }

  async _detectDevice() {
    try {
      if (this.device.adapterInfo) {
        this.adapterInfo = this.device.adapterInfo;
      } else if (this.device.adapter?.info) {
        this.adapterInfo = this.device.adapter.info;
      }
    } catch {
      this.adapterInfo = null;
    }

    this._isMobile = this._checkMobileUA();
    this._isTablet = this._checkTabletUA();

    if (this.options.forceDeviceTier) {
      this.detectedTier = this.options.forceDeviceTier;
      return;
    }

    if (!this._isMobile && !this._isTablet) {
      this.detectedTier = DEVICE_TIERS.DESKTOP;
      return;
    }

    const gpuName = this._getGPUName();

    if (this._isTablet && this._isHighEndTablet(gpuName)) {
      this.detectedTier = DEVICE_TIERS.TABLET;
      return;
    }

    if (MOBILE_GPU_PATTERNS.apple_high.test(gpuName) ||
        MOBILE_GPU_PATTERNS.snapdragon_high.test(gpuName) ||
        MOBILE_GPU_PATTERNS.mali_high.test(gpuName)) {
      this.detectedTier = DEVICE_TIERS.HIGH_END_MOBILE;
    } else if (MOBILE_GPU_PATTERNS.apple_mid.test(gpuName) ||
               MOBILE_GPU_PATTERNS.snapdragon_mid.test(gpuName) ||
               MOBILE_GPU_PATTERNS.mali_mid.test(gpuName)) {
      this.detectedTier = DEVICE_TIERS.MID_MOBILE;
    } else if (this._isMobile) {
      this.detectedTier = DEVICE_TIERS.LOW_END_MOBILE;
    } else {
      this.detectedTier = DEVICE_TIERS.MID_MOBILE;
    }
  }

  _checkMobileUA() {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent || '';
    return /Android|iPhone|iPod|Mobile|webOS|BlackBerry|Opera Mini|IEMobile/i.test(ua);
  }

  _checkTabletUA() {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent || '';
    return /iPad|Android(?!.*Mobile)|Tablet/i.test(ua);
  }

  _getGPUName() {
    if (!this.adapterInfo) return '';
    const desc = this.adapterInfo.description || this.adapterInfo.device || '';
    const vendor = this.adapterInfo.vendor || '';
    return `${vendor} ${desc}`.trim();
  }

  _isHighEndTablet(gpuName) {
    return /iPad Pro|Apple M[1-9]|Adreno.*7[4-9]|Adreno.*8/i.test(gpuName) ||
           (this._isTablet && MOBILE_GPU_PATTERNS.apple_high.test(gpuName));
  }

  async _detectF16Support() {
    try {
      this.f16Supported = this.device.features?.has('shader-f16') ?? false;
    } catch {
      this.f16Supported = false;
    }
  }

  async _initBatteryMonitor() {
    try {
      if (typeof navigator !== 'undefined' && navigator.getBattery) {
        this._batteryManager = await navigator.getBattery();
        this.batteryLevel = this._batteryManager.level;
        this.batteryCharging = this._batteryManager.charging;

        this._batteryManager.addEventListener('levelchange', () => {
          this.batteryLevel = this._batteryManager.level;
        });
        this._batteryManager.addEventListener('chargingchange', () => {
          this.batteryCharging = this._batteryManager.charging;
        });
      }
    } catch {
      this.batteryLevel = 1.0;
      this.batteryCharging = true;
    }
  }

  isMobile() {
    return this._isMobile || this._isTablet;
  }

  getDeviceTier() {
    return this.detectedTier;
  }

  getOptimalSettings() {
    const tier = this.detectedTier;

    if (tier === DEVICE_TIERS.DESKTOP || tier === DEVICE_TIERS.UNKNOWN) {
      return {
        renderScale: 1.0,
        maxTextureSize: 4096,
        shadowMapSize: 2048,
        baseLOD: 0,
        maxLOD: 4,
        enableVolumetrics: true,
        enablePathTracing: true,
        enableSSR: true,
        enableBloom: true,
        enableAO: true,
        particleLimit: 10000,
        drawCallBudget: 3000,
        renderTargetFormat: 'rgba16float',
        enableFog: true,
        fogMode: 'volumetric',
        isMobile: false,
        tier
      };
    }

    const preset = QUALITY_PRESETS[tier] || QUALITY_PRESETS[DEVICE_TIERS.LOW_END_MOBILE];
    const batteryMult = this.getBatteryAdjustment();
    const thermalMult = this._getThermalMultiplier();
    const combinedMult = Math.min(batteryMult, thermalMult);

    return {
      ...preset,
      renderScale: preset.renderScale * combinedMult * this._dynamicRenderScale,
      particleLimit: Math.floor(preset.particleLimit * combinedMult),
      drawCallBudget: Math.floor(preset.drawCallBudget * combinedMult),
      isMobile: true,
      tier,
      qualityMultiplier: combinedMult
    };
  }

  getWorkgroupSize() {
    if (this.detectedTier === DEVICE_TIERS.DESKTOP) return [8, 8];
    if (this.detectedTier === DEVICE_TIERS.HIGH_END_MOBILE ||
        this.detectedTier === DEVICE_TIERS.TABLET) return [8, 4];
    return [4, 4];
  }

  shouldUseF16() {
    if (!this.f16Supported) return false;
    return this._isMobile || this._isTablet;
  }

  monitorPerformance(fps, frameTime) {
    this.frameHistory.push({ fps, frameTime, timestamp: Date.now() });

    const windowSize = this.options.thermalWindowSize;
    if (this.frameHistory.length > windowSize * 2) {
      this.frameHistory = this.frameHistory.slice(-windowSize);
    }

    this._detectThermalThrottle();
    this._adjustDynamicQuality(fps, frameTime);

    this.currentSettings = this.getOptimalSettings();
    return this.currentSettings;
  }

  _detectThermalThrottle() {
    const window = this.options.thermalWindowSize;
    if (this.frameHistory.length < window) return;

    const recent = this.frameHistory.slice(-window);
    const avgFrameTime = recent.reduce((s, f) => s + f.frameTime, 0) / recent.length;

    const oldWindow = this.frameHistory.slice(-window * 2, -window);
    if (oldWindow.length === 0) return;
    const oldAvg = oldWindow.reduce((s, f) => s + f.frameTime, 0) / oldWindow.length;

    const ratio = avgFrameTime / Math.max(oldAvg, 0.001);

    if (ratio > this.options.thermalSpikeThreshold) {
      this.thermalState = 'throttled';
      this.currentQualityMultiplier = Math.max(0.5, this.currentQualityMultiplier - 0.1);
    } else if (ratio > 1.2) {
      this.thermalState = 'warm';
      this.currentQualityMultiplier = Math.max(0.7, this.currentQualityMultiplier - 0.05);
    } else if (ratio < 1.05) {
      this.thermalState = 'normal';
      this.currentQualityMultiplier = Math.min(1.0, this.currentQualityMultiplier + 0.02);
    }
  }

  _adjustDynamicQuality(fps, frameTime) {
    const target = this.options.targetFPS;
    const min = this.options.minFPS;

    if (fps < min) {
      this._dynamicRenderScale = Math.max(0.4, this._dynamicRenderScale - 0.05);
    } else if (fps < target * 0.85) {
      this._dynamicRenderScale = Math.max(0.5, this._dynamicRenderScale - 0.02);
    } else if (fps >= target * 0.95 && frameTime < (1000 / target) * 0.9) {
      this._dynamicRenderScale = Math.min(1.0, this._dynamicRenderScale + 0.01);
    }
  }

  _getThermalMultiplier() {
    switch (this.thermalState) {
      case 'throttled': return 0.6;
      case 'warm': return 0.8;
      default: return 1.0;
    }
  }

  getBatteryAdjustment() {
    if (this.batteryCharging) return 1.0;

    if (this.batteryLevel <= this.options.batteryCriticalThreshold) {
      return 0.5;
    }
    if (this.batteryLevel <= this.options.batteryLowThreshold) {
      return 0.7;
    }
    if (this.batteryLevel <= 0.4) {
      return 0.85;
    }
    return 1.0;
  }

  getMaxTextureSize() {
    const settings = this.currentSettings || this.getOptimalSettings();
    return settings.maxTextureSize;
  }

  getEffectOverrides() {
    const tier = this.detectedTier;

    if (tier === DEVICE_TIERS.DESKTOP) return {};

    const overrides = {
      volumetrics: tier === DEVICE_TIERS.HIGH_END_MOBILE || tier === DEVICE_TIERS.TABLET
        ? 'volumetric_lite'
        : 'simple_fog',
      pathTracing: 'rasterized',
      reflections: tier === DEVICE_TIERS.HIGH_END_MOBILE || tier === DEVICE_TIERS.TABLET
        ? 'ssr_half'
        : 'cubemap',
      shadows: tier === DEVICE_TIERS.LOW_END_MOBILE
        ? 'blob'
        : 'shadow_map',
      postProcess: tier === DEVICE_TIERS.LOW_END_MOBILE
        ? 'minimal'
        : 'standard'
    };

    return overrides;
  }

  getTouchConfig() {
    return {
      minTargetSize: this.options.minTouchTargetPx,
      hitAreaPadding: this._isMobile ? 8 : 4,
      doubleTapDelay: 300,
      longPressDelay: 500,
      swipeThreshold: 30,
      pinchZoomEnabled: this._isTablet,
      hapticFeedback: this._isMobile
    };
  }

  getResolutionCap() {
    const tier = this.detectedTier;
    const dpr = (typeof window !== 'undefined' ? window.devicePixelRatio : 1) || 1;

    switch (tier) {
      case DEVICE_TIERS.HIGH_END_MOBILE: return Math.min(dpr, 2.0);
      case DEVICE_TIERS.MID_MOBILE: return Math.min(dpr, 1.5);
      case DEVICE_TIERS.LOW_END_MOBILE: return 1.0;
      case DEVICE_TIERS.TABLET: return Math.min(dpr, 2.0);
      default: return dpr;
    }
  }

  getDebugInfo() {
    return {
      tier: this.detectedTier,
      isMobile: this._isMobile,
      isTablet: this._isTablet,
      gpuName: this._getGPUName(),
      f16Supported: this.f16Supported,
      batteryLevel: this.batteryLevel,
      batteryCharging: this.batteryCharging,
      thermalState: this.thermalState,
      qualityMultiplier: this.currentQualityMultiplier,
      dynamicRenderScale: this._dynamicRenderScale,
      recentFPS: this.frameHistory.length > 0
        ? this.frameHistory[this.frameHistory.length - 1].fps
        : null,
      workgroupSize: this.getWorkgroupSize(),
      resolutionCap: this.getResolutionCap(),
      maxTextureSize: this.getMaxTextureSize()
    };
  }

  dispose() {
    if (this._batteryManager) {
      try {
        this._batteryManager.removeEventListener('levelchange', null);
        this._batteryManager.removeEventListener('chargingchange', null);
      } catch { /* battery API cleanup is best-effort */ }
      this._batteryManager = null;
    }

    this.frameHistory = [];
    this.currentSettings = null;
    this.initialized = false;
  }
}

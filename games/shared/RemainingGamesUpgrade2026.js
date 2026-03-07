/**
 * Remaining Games — Universal 2026 Rendering Upgrade
 * Configurable rendering enhancements with per-game visual identity presets
 * Covers: cursed-arcade, cursed-depths, cursed-objects, cursed-sands, dollhouse,
 *         freddys-nightmare, graveyard-shift, nightmare-run, nightmare-streamer,
 *         paranormal-contractor, ritual-circle, seance, subliminal-spaces,
 *         web-of-terror, yeti-run, asylum-architect, shadow-crawler (2D)
 */

import { AreaLightSystem2026 } from '../../core/renderer/AreaLightSystem2026.js';
import { AtmosphericRenderer2026 } from '../../core/renderer/AtmosphericRenderer2026.js';
import { MaterialSystem2026 } from '../../core/renderer/MaterialSystem2026.js';
import { RadianceCascades2026 } from '../../core/renderer/RadianceCascades2026.js';

// ─── Quality Tier Multipliers ──────────────────────────────────────────

const QUALITY_TIERS = {
  ultra:  { particleMul: 1.0, shadowRes: 2048, reflRes: 512, volSteps: 64, bloomPasses: 6, ssr: true,  maxLights: 256, fogSamples: 48, dispDetail: 1.0 },
  high:   { particleMul: 0.7, shadowRes: 1024, reflRes: 256, volSteps: 32, bloomPasses: 4, ssr: true,  maxLights: 128, fogSamples: 32, dispDetail: 0.75 },
  medium: { particleMul: 0.4, shadowRes: 512,  reflRes: 128, volSteps: 16, bloomPasses: 3, ssr: false, maxLights: 64,  fogSamples: 16, dispDetail: 0.5 },
  low:    { particleMul: 0.2, shadowRes: 256,  reflRes: 0,   volSteps: 8,  bloomPasses: 2, ssr: false, maxLights: 32,  fogSamples: 8,  dispDetail: 0.25 }
};

// ─── Per-Game Preset Definitions ───────────────────────────────────────

const GAME_PRESETS = {

  // CRT monitor shader, neon area lights with bloom, arcade cabinet reflections, retro chromatic aberration
  'cursed-arcade': {
    label: 'Cursed Arcade', category: 'retro',
    pp: {
      crt: { enabled: true, scanlineIntensity: 0.35, scanlineCount: 480, phosphorGlow: 0.4, phosphorLayout: 'aperture_grille', barrelDistortion: 0.12, vignetteStrength: 0.6, flickerSpeed: 0.03, brightnessJitter: 0.02, rgbOffset: [1.002, 1.0, 0.998] },
      chromatic: { enabled: true, strength: 0.008, radial: true },
      bloom: { enabled: true, threshold: 0.5, strength: 1.8, radius: 0.6 },
      grain: { enabled: true, strength: 0.08 }
    },
    lights: {
      neon: [
        { color: [1.0, 0.1, 0.4], strength: 3.0, radius: 5.0, flicker: 0.05 },
        { color: [0.1, 0.4, 1.0], strength: 2.5, radius: 4.5, flicker: 0.08 },
        { color: [0.1, 1.0, 0.3], strength: 2.0, radius: 4.0, flicker: 0.03 },
        { color: [1.0, 0.8, 0.0], strength: 2.2, radius: 3.5, flicker: 0.06 }
      ],
      ambient: [0.03, 0.02, 0.05],
      cabinetReflections: { reflectivity: 0.4, roughness: 0.2, screenGlow: 0.8 }
    },
    fog: { color: [0.02, 0.01, 0.04], density: 0.01 },
    tension: { crtGlitchOnHigh: true, screenTearIntensity: 0.3, staticNoiseFloor: 0.05, powerSurgeFlash: [1, 1, 1] }
  },

  // Cave volumetric fog, stalactite displacement, underground water caustics, torch area lights, glow-worm emissive
  'cursed-depths': {
    label: 'Cursed Depths', category: 'underground',
    pp: { bloom: { enabled: true, threshold: 0.8, strength: 0.6, radius: 0.4 }, grain: { enabled: true, strength: 0.12 }, vignette: { enabled: true, strength: 0.7, softness: 0.5 } },
    lights: {
      torch: [{ color: [1.0, 0.6, 0.2], strength: 4.0, radius: 8.0, flicker: 0.15, ies: 'candle' }],
      glowWorms: { enabled: true, count: 200, color: [0.2, 0.9, 0.4], strength: 0.5, radius: 0.3, pulseSpeed: 0.8, clusterRadius: 2.0 },
      ambient: [0.01, 0.01, 0.02]
    },
    fog: { color: [0.02, 0.03, 0.04], density: 0.08, heightFalloff: 0.3, volumetric: true, scatterAnisotropy: 0.6 },
    materials: {
      stalactite: { displacement: true, dispScale: 0.15, albedo: [0.35, 0.3, 0.28], roughness: 0.7, wetness: 0.4 },
      waterCaustics: { enabled: true, speed: 0.3, scale: 2.0, strength: 0.6, color: [0.3, 0.5, 0.7] }
    },
    tension: { fogThickens: true, torchFlickerAmplifies: true, glowWormsFade: true }
  },

  // Item glow (emissive aura), supernatural distortion, poltergeist particles, flickering house lights
  'cursed-objects': {
    label: 'Cursed Objects', category: 'supernatural',
    pp: { bloom: { enabled: true, threshold: 0.6, strength: 1.0, radius: 0.5 }, chromatic: { enabled: true, strength: 0.005 }, grain: { enabled: true, strength: 0.06 }, vignette: { enabled: true, strength: 0.4, softness: 0.6 } },
    lights: {
      house: [{ color: [1.0, 0.9, 0.7], strength: 2.0, radius: 6.0, flicker: 0.2, ies: 'desk_lamp' }],
      cursedGlow: { enabled: true, color: [0.8, 0.2, 1.0], strength: 2.5, pulseSpeed: 1.2, auraRadius: 0.5, auraFalloff: 2.0 },
      ambient: [0.06, 0.05, 0.07]
    },
    fog: { color: [0.04, 0.03, 0.06], density: 0.015 },
    effects: {
      distortion: { enabled: true, range: 3.0, warpStrength: 0.04, noiseFreq: 2.0, noiseSpeed: 0.5 },
      poltergeist: { enabled: true, count: 100, color: [0.7, 0.3, 1.0], speed: 1.5, orbitRadius: 1.0, trailLength: 8 }
    },
    tension: { flickerAmplifies: true, distortionGrows: true, desaturation: 0.4 }
  },

  // Sandstorm volumetric particles, heat shimmer distortion, desert scattering, quicksand, ancient ruin PBR
  'cursed-sands': {
    label: 'Cursed Sands', category: 'desert',
    pp: { bloom: { enabled: true, threshold: 0.7, strength: 0.8, radius: 0.4 }, grain: { enabled: true, strength: 0.1 }, vignette: { enabled: true, strength: 0.35, softness: 0.4 } },
    lights: {
      sun: { color: [1.0, 0.85, 0.6], strength: 5.0 },
      atmosphericScatter: { enabled: true, rayleigh: [0.0025, 0.0015, 0.0008], mie: 0.005, mieAniso: 0.76, skyColor: [0.9, 0.5, 0.15] },
      ambient: [0.15, 0.1, 0.06]
    },
    fog: { color: [0.6, 0.45, 0.25], density: 0.02, heightFalloff: 0.05 },
    effects: {
      sandstorm: { enabled: true, count: 5000, windSpeed: [8, 0, 3], particleSize: [0.005, 0.02], color: [0.7, 0.55, 0.3], opacity: 0.6, turbulence: 2.0 },
      heatShimmer: { enabled: true, strength: 0.015, speed: 0.8, heightThreshold: 0.5, frequency: 4.0 },
      quicksand: { dispScale: 0.3, sinkSpeed: 0.5, rippleFreq: 1.5, surfaceColor: [0.65, 0.5, 0.3] }
    },
    materials: { ruins: { albedo: [0.6, 0.5, 0.35], roughness: 0.85, sandAccumulation: 0.4, erosionDetail: 0.6, hieroglyphEmissive: 0.2 } },
    tension: { sandstormIntensifies: true, shimmerDistorts: true, skyDarkens: true }
  },

  // Tilt-shift DOF, miniature scale lighting, porcelain SSS, creepy doll eye reflections
  'dollhouse': {
    label: 'Dollhouse', category: 'miniature',
    pp: {
      tiltShift: { enabled: true, focusPosition: 0.5, focusWidth: 0.15, blurAmount: 4.0, gradientPower: 2.0 },
      bloom: { enabled: true, threshold: 0.65, strength: 0.9, radius: 0.5 },
      grain: { enabled: true, strength: 0.04 }, vignette: { enabled: true, strength: 0.5, softness: 0.7 }
    },
    lights: {
      tiny: [{ color: [1.0, 0.9, 0.7], strength: 1.5, radius: 2.0, scale: 0.05 }, { color: [0.9, 0.8, 0.6], strength: 1.0, radius: 1.5, scale: 0.03 }],
      miniatureScale: 0.1, shadowSoftness: 0.8, ambient: [0.1, 0.09, 0.08]
    },
    fog: { color: [0.08, 0.07, 0.06], density: 0.005 },
    materials: {
      porcelain: { type: 'sss', albedo: [0.92, 0.88, 0.84], roughness: 0.15, sssColor: [0.95, 0.7, 0.6], sssRadius: 0.3, sssStrength: 0.9, clearcoat: 0.7, clearcoatRoughness: 0.08 },
      dollEyes: { type: 'glass', albedo: [0.1, 0.1, 0.1], roughness: 0.02, ior: 1.5, reflectivity: 0.95, irisColor: [0.2, 0.3, 0.15], pupilDilation: 0.5, glassThickness: 0.005 }
    },
    effects: { scaleTransition: { enabled: true, macroScale: 10.0, normalScale: 1.0, transitionDuration: 2.0, dofShift: true } },
    tension: { dollEyesTrack: true, lightsFlickerCreepy: true, tiltShiftNarrows: true }
  },

  // Animatronic metallic PBR, security camera CRT, flashlight IES, jumpscare flash/blur, glowing eyes
  'freddys-nightmare': {
    label: "Freddy's Nightmare", category: 'animatronic',
    pp: { bloom: { enabled: true, threshold: 0.55, strength: 1.2, radius: 0.5 }, chromatic: { enabled: true, strength: 0.004 }, grain: { enabled: true, strength: 0.1 }, vignette: { enabled: true, strength: 0.6, softness: 0.4 } },
    lights: {
      flashlight: { color: [1.0, 0.95, 0.85], strength: 6.0, innerCone: 0.15, outerCone: 0.45, range: 15.0, ies: 'flashlight', batteryDrain: 0.02 },
      securityCamera: { crtEffect: true, scanlines: 240, noiseIntensity: 0.15, timestamp: true, greenTint: [0.2, 1.0, 0.3], staticOnSwitch: 0.3 },
      animatronicEyes: { color: [1.0, 0.2, 0.1], strength: 3.0, radius: 0.8, innerGlow: 0.6, pulseSpeed: 0.4 },
      ambient: [0.02, 0.02, 0.03]
    },
    fog: { color: [0.02, 0.02, 0.03], density: 0.025 },
    materials: {
      animatronicMetal: { albedo: [0.7, 0.7, 0.72], roughness: 0.25, metallic: 0.95, wearCoverage: 0.5, wearRoughness: 0.65, scratchDensity: 0.3 },
      crackedPlastic: { albedo: [0.6, 0.55, 0.5], roughness: 0.4, crackDensity: 0.4, crackDepth: 0.003, yellowing: 0.2, dirtAccumulation: 0.3 }
    },
    effects: { jumpscare: { flashDuration: 0.15, flashColor: [1, 1, 1], flashIntensity: 10.0, motionBlur: 0.8, zoomSpeed: 3.0, chromaticSpike: 0.03 } },
    tension: { flashlightDims: true, ambientGetsBlacker: true, eyeGlowIntensifies: true }
  },

  // Moonlight with volumetric fog, tombstone PBR, ground fog, lantern, zombie hands displacement, rain
  'graveyard-shift': {
    label: 'Graveyard Shift', category: 'outdoor_horror',
    pp: { bloom: { enabled: true, threshold: 0.7, strength: 0.7, radius: 0.4 }, grain: { enabled: true, strength: 0.08 }, vignette: { enabled: true, strength: 0.5, softness: 0.5 } },
    lights: {
      moonlight: { color: [0.6, 0.65, 0.85], strength: 1.5, direction: [-0.3, -0.8, 0.5], shadowSoftness: 0.4, volumetricScatter: 0.3 },
      lantern: { color: [1.0, 0.7, 0.3], strength: 3.5, radius: 6.0, flicker: 0.12, ies: 'candle', swayAmount: 0.02, swaySpeed: 1.5 },
      ambient: [0.02, 0.025, 0.04]
    },
    fog: { color: [0.04, 0.05, 0.07], density: 0.05, heightFalloff: 0.8, groundFogHeight: 0.6, groundFogDensity: 0.15, volumetric: true },
    materials: { tombstone: { albedo: [0.4, 0.38, 0.35], roughness: 0.8, mossColor: [0.15, 0.25, 0.1], mossCoverage: 0.3, weathering: 0.7, etchDepth: 0.004 } },
    effects: {
      rain: { enabled: true, intensity: 0.6, dropSize: 0.003, windAngle: 0.3, splashParticles: true, puddleFormation: true, lightStreaks: true },
      zombieHands: { displacement: true, groundBreakRadius: 0.3, dirtParticles: 40, emergeSpeed: 0.5, groundCrack: true }
    },
    tension: { fogThickens: true, moonlightDims: true, rainIntensifies: true }
  },

  // Speed motion blur, dream distortion, particle trails, procedural landscape displacement, color-shifting
  'nightmare-run': {
    label: 'Nightmare Run', category: 'runner',
    pp: {
      motionBlur: { enabled: true, samples: 8, strength: 0.4, velocityScale: 1.0 },
      bloom: { enabled: true, threshold: 0.5, strength: 1.4, radius: 0.6 },
      chromatic: { enabled: true, strength: 0.006, radial: true },
      vignette: { enabled: true, strength: 0.3, softness: 0.3 }
    },
    lights: { dreamscapeColors: [[0.8, 0.2, 0.5], [0.2, 0.5, 0.9], [0.5, 0.1, 0.8], [0.1, 0.8, 0.4]], colorShiftSpeed: 0.3, ambient: [0.08, 0.05, 0.1] },
    fog: { color: [0.1, 0.05, 0.15], density: 0.02 },
    effects: {
      dreamDistortion: { enabled: true, waveAmplitude: 0.03, waveFrequency: 2.0, waveSpeed: 1.5, geometryWarp: true },
      particleTrails: { enabled: true, count: 300, trailLength: 12, speed: 5.0, colorFromDreamscape: true, sizeRange: [0.02, 0.08] },
      landscapeDisplacement: { enabled: true, noiseScale: 0.5, noiseSpeed: 0.2, amplitude: 2.0, proceduralTerrain: true }
    },
    tension: { speedIncreases: true, distortionAmplifies: true, colorsSaturate: true }
  },

  // Webcam overlay, streaming chat, screen glitch, night vision, found-footage grain
  'nightmare-streamer': {
    label: 'Nightmare Streamer', category: 'found_footage',
    pp: { bloom: { enabled: true, threshold: 0.6, strength: 0.5, radius: 0.3 }, grain: { enabled: true, strength: 0.18 }, vignette: { enabled: true, strength: 0.6, softness: 0.3 }, chromatic: { enabled: true, strength: 0.003 } },
    lights: { webcamLight: { color: [0.4, 0.6, 0.9], strength: 0.5, radius: 2.0 }, screenGlow: { color: [0.3, 0.5, 0.8], strength: 1.0, radius: 3.0, flicker: 0.05 }, ambient: [0.03, 0.03, 0.04] },
    fog: { color: [0.02, 0.02, 0.03], density: 0.01 },
    effects: {
      webcamOverlay: { enabled: true, borderColor: [0.15, 0.15, 0.15], borderWidth: 0.02, recordingDot: { color: [1, 0, 0], blinkSpeed: 1.0 }, facecamPosition: [0.75, 0.65], facecamSize: [0.22, 0.3] },
      streamingChat: { enabled: true, messageSpeed: 2.0, panicOnHorror: true, fadeOpacity: 0.7, fontSize: 14 },
      screenGlitch: { enabled: true, triggerOnHorror: true, blockSize: [8, 16], colorShift: 0.05, duration: 0.3, tearLines: 3 },
      nightVision: { enabled: true, color: [0.2, 1.0, 0.3], noiseIntensity: 0.12, scanlineIntensity: 0.08, vignetteBoost: 0.3, brightnessMultiplier: 3.0 },
      foundFootage: { enabled: true, grainSize: 2.0, strength: 0.2, colorJitter: 0.04, timestampFont: 'monospace', dateOverlay: true }
    },
    tension: { glitchFrequencyUp: true, chatPanics: true, grainIntensifies: true }
  },

  // Construction flashlight IES, blueprint overlay (x-ray), dust particles, tool metal PBR, ghost particles
  'paranormal-contractor': {
    label: 'Paranormal Contractor', category: 'construction',
    pp: { bloom: { enabled: true, threshold: 0.7, strength: 0.6, radius: 0.4 }, grain: { enabled: true, strength: 0.07 }, vignette: { enabled: true, strength: 0.35, softness: 0.5 } },
    lights: { constructionFlashlight: { color: [1.0, 0.95, 0.85], strength: 5.0, innerCone: 0.12, outerCone: 0.5, range: 12.0, ies: 'flashlight' }, ambient: [0.03, 0.03, 0.03] },
    fog: { color: [0.04, 0.04, 0.04], density: 0.02 },
    materials: { toolMetal: { albedo: [0.65, 0.62, 0.6], roughness: 0.35, metallic: 0.9, wearMask: true, gripRubber: { albedo: [0.1, 0.1, 0.1], roughness: 0.9 } } },
    effects: {
      blueprintOverlay: { enabled: true, lineColor: [0.3, 0.5, 1.0], bgColor: [0.05, 0.08, 0.15], gridScale: 0.5, wireframeOpacity: 0.7, xrayFalloff: 3.0, annotationFont: 'monospace' },
      dustMotes: { enabled: true, count: 500, sizeRange: [0.001, 0.004], drift: 0.3, lightCatchIntensity: 0.8, color: [0.8, 0.75, 0.65] },
      ghostInteraction: { enabled: true, particleColor: [0.4, 0.7, 1.0], count: 80, orbitSpeed: 2.0, trailLength: 6, emissiveIntensity: 1.5 }
    },
    tension: { flashlightFlickers: true, dustOnDisturbance: true, blueprintGlitches: true }
  },

  // Candle area lights with SSS wax, rune emissive glow, spirit volumetric, smoke/incense, ouija reflections
  'ritual-circle': {
    label: 'Ritual Circle', category: 'occult',
    pp: { bloom: { enabled: true, threshold: 0.45, strength: 1.5, radius: 0.6 }, grain: { enabled: true, strength: 0.06 }, vignette: { enabled: true, strength: 0.55, softness: 0.5 }, chromatic: { enabled: true, strength: 0.003 } },
    lights: {
      candles: { count: 12, color: [1.0, 0.7, 0.3], strength: 2.0, radius: 3.0, flicker: 0.18, ies: 'candle', arrangement: 'circle', circleRadius: 2.5 },
      runeGlow: { enabled: true, color: [0.8, 0.1, 0.2], strength: 2.5, pulseSpeed: 0.6, pulseRange: [0.5, 1.0], pattern: 'sigil' },
      ambient: [0.02, 0.01, 0.02]
    },
    fog: { color: [0.03, 0.02, 0.04], density: 0.04, heightFalloff: 0.5, volumetric: true },
    materials: { candleWax: { type: 'sss', albedo: [0.85, 0.8, 0.7], roughness: 0.4, sssColor: [0.95, 0.6, 0.3], sssRadius: 0.5, sssStrength: 0.85, meltDrip: true, meltSpeed: 0.01 } },
    effects: {
      smoke: { enabled: true, count: 150, color: [0.5, 0.45, 0.55], opacity: 0.25, riseSpeed: 0.4, turbulence: 0.8, volumetric: true },
      spiritRendering: { enabled: true, volumetricDensity: 0.3, emissionColor: [0.5, 0.6, 0.9], emissionStrength: 1.5, scattering: 0.4, trailDecay: 0.75 },
      ouijaReflections: { enabled: true, boardReflectivity: 0.3, planchetteHighlight: 0.8, letterGlow: { color: [0.9, 0.8, 0.5], strength: 1.0 } }
    },
    tension: { runeGlowIntensifies: true, candlesFlickerWild: true, smokeThickens: true }
  },

  // Séance table cloth physics, crystal ball refraction, flickering candlelight, spiritual energy particles
  'seance': {
    label: 'Séance', category: 'occult',
    pp: { bloom: { enabled: true, threshold: 0.4, strength: 1.6, radius: 0.65 }, grain: { enabled: true, strength: 0.07 }, vignette: { enabled: true, strength: 0.6, softness: 0.45 }, chromatic: { enabled: true, strength: 0.004 } },
    lights: {
      candles: { count: 6, color: [1.0, 0.65, 0.25], strength: 1.8, radius: 2.5, flicker: 0.22, ies: 'candle', arrangement: 'table_edge', tableRadius: 1.0 },
      runeGlow: { enabled: true, color: [0.6, 0.3, 0.9], strength: 2.0, pulseSpeed: 0.4, pulseRange: [0.3, 1.0], pattern: 'circle' },
      ambient: [0.015, 0.01, 0.02]
    },
    fog: { color: [0.025, 0.02, 0.035], density: 0.05, heightFalloff: 0.6, volumetric: true },
    materials: {
      candleWax: { type: 'sss', albedo: [0.9, 0.82, 0.65], roughness: 0.35, sssColor: [0.95, 0.55, 0.25], sssRadius: 0.6, sssStrength: 0.9, meltDrip: true, meltSpeed: 0.015 },
      crystalBall: { type: 'glass_sss', albedo: [0.95, 0.95, 0.98], roughness: 0.02, ior: 1.52, thickness: 0.08, absorption: [0.02, 0.01, 0.03], internalGlow: { color: [0.4, 0.3, 0.8], strength: 0.5, pulseSpeed: 0.3 } },
      tableCloth: { albedo: [0.15, 0.05, 0.08], roughness: 0.8, fabricWeave: 'velvet', fringeLength: 0.05, simEnabled: true, damping: 0.95, stiffness: 0.3 }
    },
    effects: {
      smoke: { enabled: true, count: 100, color: [0.4, 0.35, 0.5], opacity: 0.2, riseSpeed: 0.3, turbulence: 0.6, volumetric: true },
      spiritEnergy: { enabled: true, count: 200, color: [0.5, 0.3, 0.9], speed: 1.2, spiralRadius: 0.8, riseSpeed: 0.5, emissiveStrength: 2.0, convergencePoint: [0, 1.2, 0] },
      candleSway: { enabled: true, windSpeed: 0.3, gustFrequency: 0.2, flameStretch: 0.1 }
    },
    tension: { candlesNearlyExtinguish: true, crystalBallGlows: true, spiritConverges: true, tableClothRipples: true }
  },

  // Perfect fluorescent volumetric lighting, liminal emptiness, infinite corridor LOD, "not quite right" warp
  'subliminal-spaces': {
    label: 'Subliminal Spaces', category: 'liminal',
    pp: { bloom: { enabled: true, threshold: 0.8, strength: 0.4, radius: 0.3 }, grain: { enabled: true, strength: 0.04 }, vignette: { enabled: true, strength: 0.2, softness: 0.7 } },
    lights: {
      fluorescents: { color: [0.95, 0.98, 1.0], strength: 3.0, type: 'tube', tubeLength: 1.2, count: 20, spacing: 3.0, flicker: 0.01, humFrequency: 120, volumetricDust: true, dustDensity: 0.02 },
      ambient: [0.12, 0.12, 0.13]
    },
    fog: { color: [0.1, 0.1, 0.11], density: 0.008 },
    effects: {
      liminalEmptiness: { enabled: true, desaturation: 0.6, echoEffect: { enabled: true, delay: 0.4, decay: 0.3, visualEcho: true, echoOpacity: 0.15 }, wrongnessWarp: { enabled: true, subtlety: 0.005, frequency: 0.1, affectedAxes: ['y', 'z'] } },
      infiniteCorridor: { enabled: true, lodLevels: 5, streamingDistance: 100, repeatInterval: 20.0, variationSeed: 42, seamlessLoop: true }
    },
    tension: { lightsDim: true, geometryWarps: true, desaturationIncreases: true, echoGrows: true }
  },

  // Spider web strand physics (Verlet), anisotropic specular, spider SSS, egg sac glow, cocoon deformation
  'web-of-terror': {
    label: 'Web of Terror', category: 'creature',
    pp: { bloom: { enabled: true, threshold: 0.6, strength: 0.8, radius: 0.4 }, grain: { enabled: true, strength: 0.09 }, vignette: { enabled: true, strength: 0.5, softness: 0.5 }, chromatic: { enabled: true, strength: 0.004 } },
    lights: { torchLight: { color: [1.0, 0.7, 0.35], strength: 4.5, radius: 8.0, flicker: 0.1, ies: 'candle' }, ambient: [0.02, 0.02, 0.03] },
    fog: { color: [0.03, 0.03, 0.04], density: 0.04, heightFalloff: 0.3, volumetric: true },
    materials: {
      spiderWeb: { type: 'anisotropic', albedo: [0.85, 0.85, 0.82], roughness: 0.3, anisotropy: 0.8, direction: 'strand', sheenColor: [0.9, 0.9, 0.95], sheenRoughness: 0.2, strandThickness: 0.001, opacity: 0.7 },
      spiderBody: { type: 'sss', albedo: [0.08, 0.06, 0.05], roughness: 0.5, sssColor: [0.15, 0.08, 0.05], sssRadius: 0.2, sssStrength: 0.4, chitinSpecular: 0.6, chitinRoughness: 0.2 },
      eggSac: { type: 'sss', albedo: [0.7, 0.65, 0.55], roughness: 0.6, sssColor: [0.8, 0.5, 0.3], sssRadius: 0.4, sssStrength: 0.7, emissive: [0.1, 0.06, 0.02], emissiveStrength: 0.5, pulseSpeed: 0.8 },
      cocoon: { albedo: [0.6, 0.58, 0.5], roughness: 0.7, softBody: true, deformStiffness: 0.4, windResponse: 0.1 }
    },
    effects: { webPhysics: { enabled: true, strandSegments: 8, verletIterations: 4, gravity: [0, -0.5, 0], windInfluence: 0.3, breakForce: 2.0, stickyDamping: 0.9 } },
    tension: { websMultiply: true, eggSacsPulse: true, fogThickens: true }
  },

  // Snow GPU particles (100K), terrain footprint displacement, ice SSS, blizzard, avalanche, yeti fur anisotropic
  'yeti-run': {
    label: 'Yeti Run', category: 'arctic',
    pp: { bloom: { enabled: true, threshold: 0.75, strength: 0.7, radius: 0.45 }, grain: { enabled: true, strength: 0.05 }, vignette: { enabled: true, strength: 0.3, softness: 0.5 } },
    lights: { sunColor: [0.85, 0.9, 1.0], sunIntensity: 3.0, snowReflection: 0.7, ambient: [0.15, 0.18, 0.25] },
    fog: { color: [0.7, 0.75, 0.85], density: 0.03, heightFalloff: 0.1, volumetric: true },
    effects: {
      snowParticles: { enabled: true, count: 100000, sizeRange: [0.002, 0.008], fallSpeed: [1.0, 2.5], windSpeed: [2.0, 0, 0.5], turbulence: 1.5, swirl: 0.3, gpuDriven: true, lodDistances: [20, 50, 100] },
      footprints: { enabled: true, displacementDepth: 0.04, decayTime: 30.0, maxFootprints: 200, snowDisplacement: true, trailWidth: 0.3 },
      blizzard: { enabled: true, intensityRange: [0, 1], volumetricDensity: 0.15, whiteoutThreshold: 0.8, windGustFrequency: 0.2, windGustStrength: 3.0 },
      avalanche: { particleCount: 2000, fractureSize: [0.1, 0.5], cascadeSpeed: 8.0, dustCloud: true, screenShake: 0.3, rumbleIntensity: 0.8 }
    },
    materials: {
      ice: { type: 'sss', albedo: [0.85, 0.92, 0.98], roughness: 0.05, sssColor: [0.6, 0.8, 0.95], sssRadius: 0.8, sssStrength: 0.6, clearcoat: 1.0, clearcoatRoughness: 0.02, ior: 1.31 },
      yetiFur: { type: 'anisotropic', albedo: [0.8, 0.78, 0.75], roughness: 0.6, anisotropy: 0.7, direction: 'tangent', strandDensity: 50, strandLength: 0.05, secondarySpecular: { color: [0.9, 0.88, 0.85], roughness: 0.3, shift: -0.1 } },
      snow: { albedo: [0.95, 0.95, 0.97], roughness: 0.8, sparkle: { strength: 0.4, density: 500, viewDependent: true } }
    },
    tension: { blizzardIntensifies: true, visibilityDrops: true, yetiFootstepsTremor: true }
  },

  // Level editor enhanced preview, material palette, real-time lighting preview, fog preview
  'asylum-architect': {
    label: 'Asylum Architect', category: 'editor',
    pp: { bloom: { enabled: true, threshold: 0.7, strength: 0.5, radius: 0.3 } },
    lights: { editorLight: { color: [1, 1, 1], strength: 2.0, type: 'directional', shadows: true, previewMode: true }, ambient: [0.15, 0.15, 0.15] },
    fog: { color: [0.1, 0.1, 0.1], density: 0.005 },
    effects: {
      materialPalette: { enabled: true, presets: [
        { name: 'Concrete', albedo: [0.5, 0.5, 0.5], roughness: 0.8, metallic: 0 },
        { name: 'Tile', albedo: [0.7, 0.7, 0.68], roughness: 0.6, metallic: 0 },
        { name: 'Metal', albedo: [0.7, 0.7, 0.72], roughness: 0.3, metallic: 0.9 },
        { name: 'Wood', albedo: [0.55, 0.35, 0.2], roughness: 0.7, metallic: 0 },
        { name: 'Padded', albedo: [0.65, 0.63, 0.58], roughness: 0.85, metallic: 0 }
      ]},
      lightingPreview: { enabled: true, realtimeGI: false, pointLightGizmos: true, radiusVisualization: true, shadowPreview: true },
      fogPreview: { enabled: true, densityOverlay: true, interactiveDensity: true, colorPicker: true }
    },
    tension: {}
  },

  // Enhanced 2D shadows with ray casting, particle effects, screen-space light scattering
  'shadow-crawler': {
    label: 'Shadow Crawler (2D)', category: '2d', is2D: true,
    pp: { bloom: { enabled: true, threshold: 0.5, strength: 1.2, radius: 0.5 }, grain: { enabled: true, strength: 0.06 }, vignette: { enabled: true, strength: 0.55, softness: 0.5 }, chromatic: { enabled: true, strength: 0.003 } },
    lights: {
      rayCast2D: { enabled: true, rayCount: 360, maxDistance: 15.0, softShadowSamples: 4, penumbraSize: 0.02, occluderAccuracy: 0.001 },
      playerLight: { color: [1.0, 0.9, 0.7], strength: 2.5, radius: 8.0, falloff: 2.0 },
      ambient: [0.01, 0.01, 0.02]
    },
    fog: { color: [0, 0, 0], density: 0 },
    effects: {
      particles2D: { enabled: true, dustMotes: { count: 100, size: 2, drift: 0.5, opacity: 0.3 }, shadowWisps: { count: 30, size: 4, speed: 1.0, opacity: 0.5, color: [0.1, 0.05, 0.15] } },
      screenSpaceScattering: { enabled: true, sampleCount: 16, density: 0.5, weight: 0.3, decay: 0.95, exposure: 0.8, lightSourceThreshold: 0.7 }
    },
    tension: { lightRadiusShrinks: true, shadowsDarken: true, particlesSwarmPlayer: true }
  }
};

// ─── Universal Post-Processing Defaults ────────────────────────────────

const DEFAULT_PP = {
  bloom: { enabled: true, threshold: 0.7, strength: 0.6, radius: 0.4 },
  vignette: { enabled: true, strength: 0.4, softness: 0.5 },
  chromatic: { enabled: false, strength: 0.003, radial: false },
  grain: { enabled: true, strength: 0.06 },
  ssr: { enabled: false, maxSteps: 64, thickness: 0.1, maxDistance: 50 }
};

// ═══════════════════════════════════════════════════════════════════════
//  Main Class
// ═══════════════════════════════════════════════════════════════════════

export class RemainingGamesUpgrade2026 {

  constructor(game, gameId) {
    this.game = game;
    this.gameId = gameId;
    this.renderer = game.renderer || game.core?.renderer || null;
    this.device = this.renderer?.device || window.gpuDevice || null;

    // Active configuration
    this.preset = null;
    this.quality = 'high';
    this.qualityConfig = QUALITY_TIERS.high;

    // Tension system
    this.tension = 0;
    this.tensionSmoothed = 0;
    this.tensionSmoothSpeed = 2.0;

    // Subsystems
    this.areaLights = null;
    this.atmosphere = null;
    this.materialSystem = null;

    // Post-processing state
    this.postProcess = { ...DEFAULT_PP };
    this.ppUniforms = null;

    // Effect & runtime state
    this.activeEffects = new Map();
    this.effectTimers = new Map();
    this.flickerTimers = new Map();
    this.runtimeState = {};
    this.colorShiftPhase = 0;

    this.stats = { activeEffects: 0, particleCount: 0, lightCount: 0, drawCalls: 0 };
    this.time = 0;
    this.initialized = false;
  }

  // ─── Initialization ──────────────────────────────────────────────

  async initialize() {
    if (!this.device) {
      console.warn('RemainingGamesUpgrade2026: No GPU device available');
      return false;
    }
    try {
      this.preset = this.getPreset(this.gameId);
      if (!this.preset) {
        console.warn(`No preset found for game: ${this.gameId}, using defaults`);
        this.preset = this._buildDefaultPreset();
      }

      const qc = this.qualityConfig;
      this.areaLights = new AreaLightSystem2026(this.device, {
        maxLights: qc.maxLights, shadowMapSize: qc.shadowRes, enableIES: true
      });
      await this.areaLights.initialize();

      this.atmosphere = new AtmosphericRenderer2026(this.device, {
        enableVolumetricFog: qc.volSteps > 0, volumetricSteps: qc.volSteps,
        fogSamples: qc.fogSamples, maxParticles: Math.floor(10000 * qc.particleMul)
      });
      await this.atmosphere.initialize();

      this.materialSystem = new MaterialSystem2026(this.device, {
        maxMaterials: 32, enableSSS: true, enableClearcoat: true,
        enableDisplacement: qc.dispDetail > 0
      });
      await this.materialSystem.initialize();

      this.ppUniforms = this.device.createBuffer({
        size: 256, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        label: 'post-process-uniforms'
      });

      this.applyPreset(this.preset);
      this.initialized = true;
      console.log(`RemainingGamesUpgrade2026 initialized for ${this.gameId}`);
      return true;
    } catch (err) {
      console.error('Rendering upgrade init failed:', err);
      return false;
    }
  }

  // ─── Preset Management ───────────────────────────────────────────

  getPreset(gameId) {
    const p = GAME_PRESETS[gameId];
    return p ? JSON.parse(JSON.stringify(p)) : null;
  }

  applyPreset(preset) {
    if (!preset) return;
    this.preset = preset;

    // Merge post-processing settings
    if (preset.pp) {
      for (const [key, value] of Object.entries(preset.pp)) {
        this.postProcess[key] = { ...(this.postProcess[key] || {}), ...value };
      }
    }

    // Apply fog
    if (preset.fog && this.atmosphere) {
      this.atmosphere.setFogColor?.(preset.fog.color);
      this.atmosphere.setFogDensity?.(preset.fog.density);
      if (preset.fog.heightFalloff !== undefined) this.atmosphere.setHeightFalloff?.(preset.fog.heightFalloff);
    }

    // Apply lighting, materials, effects
    if (preset.lights) this._applyLightingPreset(preset.lights);
    if (preset.materials) this._applyMaterialPreset(preset.materials);
    if (preset.effects) this._initGameEffects(preset.effects);

    // SSR from quality tier
    if (this.qualityConfig.ssr) this.postProcess.ssr = { ...DEFAULT_PP.ssr, enabled: true };
  }

  setQuality(tier) {
    const qc = QUALITY_TIERS[tier];
    if (!qc) { console.warn(`Unknown quality tier: ${tier}`); return; }
    this.quality = tier;
    this.qualityConfig = qc;
    if (this.initialized && this.preset) this.applyPreset(this.preset);
  }

  // ─── Lighting Setup ──────────────────────────────────────────────

  _applyLightingPreset(lights) {
    if (!this.areaLights) return;
    const addLight = (cfg) => this.areaLights.addLight?.(cfg);
    const addFlicker = (id, rate, baseStr) => this.flickerTimers.set(id, { rate, phase: Math.random() * Math.PI * 2, baseStrength: baseStr, current: baseStr });

    // Neon area lights (cursed-arcade)
    if (lights.neon) {
      for (const n of lights.neon) {
        addLight({ type: 'sphere', color: n.color, intensity: n.strength, radius: n.radius, position: [0, 2.5, 0] });
        addFlicker(`neon_${n.color[0]}`, n.flicker, n.strength);
      }
    }

    // Torch point lights (cursed-depths, web-of-terror)
    for (const key of ['torch', 'torchLight']) {
      if (!lights[key]) continue;
      const arr = Array.isArray(lights[key]) ? lights[key] : [lights[key]];
      for (const t of arr) addLight({ type: 'point', color: t.color, intensity: t.strength, radius: t.radius, iesProfile: t.ies || 'candle' });
    }

    // House lights (cursed-objects)
    if (lights.house) {
      for (const h of lights.house) {
        addLight({ type: 'point', color: h.color, intensity: h.strength, radius: h.radius, iesProfile: h.ies || 'desk_lamp' });
        addFlicker(`house_${h.color[0]}`, h.flicker, h.strength);
      }
    }

    // Candle arrangements (ritual-circle, seance)
    if (lights.candles) {
      const c = lights.candles;
      const count = c.count || 6;
      const radius = c.circleRadius || c.tableRadius || 2.0;
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        addLight({ type: 'point', color: c.color, intensity: c.strength, radius: c.radius, iesProfile: c.ies || 'candle', position: [Math.cos(angle) * radius, 1.0, Math.sin(angle) * radius] });
        addFlicker(`candle_${i}`, c.flicker, c.strength);
      }
    }

    // Flashlight / construction flashlight (freddys-nightmare, paranormal-contractor)
    for (const key of ['flashlight', 'constructionFlashlight']) {
      if (!lights[key]) continue;
      const fl = lights[key];
      addLight({ type: 'spot', color: fl.color, intensity: fl.strength, innerCone: fl.innerCone, outerCone: fl.outerCone, range: fl.range, iesProfile: fl.ies || 'flashlight' });
      if (key === 'flashlight') { this.runtimeState.flashlightActive = true; this.runtimeState.flashlightBattery = 1.0; }
    }

    // Fluorescent tubes (subliminal-spaces)
    if (lights.fluorescents) {
      const f = lights.fluorescents;
      for (let i = 0; i < (f.count || 10); i++) {
        addLight({ type: 'tube', color: f.color, intensity: f.strength, length: f.tubeLength || 1.2, position: [0, 2.8, i * (f.spacing || 3.0)] });
      }
    }

    // Moonlight directional (graveyard-shift)
    if (lights.moonlight) addLight({ type: 'directional', color: lights.moonlight.color, intensity: lights.moonlight.strength, direction: lights.moonlight.direction });

    // Lantern (graveyard-shift)
    if (lights.lantern) {
      addLight({ type: 'point', color: lights.lantern.color, intensity: lights.lantern.strength, radius: lights.lantern.radius, iesProfile: lights.lantern.ies || 'candle' });
      addFlicker('lantern', lights.lantern.flicker, lights.lantern.strength);
    }

    // Tiny miniature lights (dollhouse)
    if (lights.tiny) for (const t of lights.tiny) addLight({ type: 'point', color: t.color, intensity: t.strength, radius: t.radius });

    // Editor directional (asylum-architect)
    if (lights.editorLight) addLight({ type: 'directional', color: lights.editorLight.color, intensity: lights.editorLight.strength });

    // Glow worms emissive particles (cursed-depths)
    if (lights.glowWorms?.enabled) {
      const gw = lights.glowWorms;
      this.runtimeState.glowWorms = [];
      for (let i = 0; i < (gw.count || 100); i++) {
        this.runtimeState.glowWorms.push({
          position: [(Math.random() - 0.5) * 30, Math.random() * 3, (Math.random() - 0.5) * 30],
          phase: Math.random() * Math.PI * 2, strength: gw.strength,
          color: [...gw.color], radius: gw.radius,
          pulseSpeed: gw.pulseSpeed + (Math.random() - 0.5) * 0.3
        });
      }
    }

    // Rune glow (ritual-circle, seance)
    if (lights.runeGlow?.enabled) this.runtimeState.runeGlow = { ...lights.runeGlow, phase: 0 };
    // Cursed item glow (cursed-objects)
    if (lights.cursedGlow?.enabled) this.runtimeState.cursedGlow = { ...lights.cursedGlow, phase: 0 };
    // Animatronic eyes (freddys-nightmare)
    if (lights.animatronicEyes) this.runtimeState.animatronicEyes = { ...lights.animatronicEyes };
    // Dreamscape color cycling (nightmare-run)
    if (lights.dreamscapeColors) { this.runtimeState.dreamColors = lights.dreamscapeColors; this.runtimeState.colorShiftSpeed = lights.colorShiftSpeed || 0.3; }
  }

  _applyMaterialPreset(materials) {
    if (!this.materialSystem) return;
    for (const [name, def] of Object.entries(materials)) this.materialSystem.createMaterial?.(name, def);
  }

  // ─── Effect Initialization ───────────────────────────────────────

  _initGameEffects(effects) {
    for (const [name, config] of Object.entries(effects)) {
      if (config && config.enabled !== false) {
        this.activeEffects.set(name, { config, state: this._createEffectState(name, config) });
      }
    }
    this.stats.activeEffects = this.activeEffects.size;
  }

  _createEffectState(name, config) {
    const state = { time: 0, active: true, intensity: 1.0 };
    const pm = this.qualityConfig.particleMul;

    // Sandstorm volumetric particles
    if (name === 'sandstorm' && config.count) {
      state.particles = Array.from({ length: Math.floor(config.count * pm) }, () => ({
        position: [(Math.random() - 0.5) * 40, Math.random() * 8, (Math.random() - 0.5) * 40],
        velocity: [...(config.windSpeed || [5, 0, 2])],
        size: config.particleSize[0] + Math.random() * (config.particleSize[1] - config.particleSize[0]),
        opacity: config.opacity * (0.5 + Math.random() * 0.5),
        turbPhase: Math.random() * Math.PI * 2
      }));
    }

    // Snow GPU particles (100K)
    if (name === 'snowParticles' && config.count) {
      state.gpuDriven = config.gpuDriven || false;
      state.particleCount = Math.floor(config.count * pm);
      state.lodDistances = config.lodDistances || [20, 50, 100];
      if (!state.gpuDriven) {
        const fallRange = config.fallSpeed || [1.0, 2.5];
        state.particles = Array.from({ length: Math.min(state.particleCount, 10000) }, () => ({
          position: [(Math.random() - 0.5) * 60, Math.random() * 30, (Math.random() - 0.5) * 60],
          fallSpeed: fallRange[0] + Math.random() * (fallRange[1] - fallRange[0]),
          size: config.sizeRange[0] + Math.random() * (config.sizeRange[1] - config.sizeRange[0]),
          swirlPhase: Math.random() * Math.PI * 2,
          swirlRadius: Math.random() * (config.swirl || 0.3)
        }));
      }
    }

    // Rain drops
    if (name === 'rain' && config.enabled) {
      const count = Math.floor(3000 * (config.intensity || 0.6) * pm);
      state.drops = Array.from({ length: count }, () => ({
        position: [(Math.random() - 0.5) * 30, Math.random() * 15, (Math.random() - 0.5) * 30],
        speed: 8 + Math.random() * 4,
        windOffset: Math.sin(config.windAngle || 0) * 2
      }));
    }

    // Generic particle-based effects
    const particleCount = config.count || config.particleCount;
    if (particleCount && !state.particles && !state.drops) {
      state.particles = Array.from({ length: Math.floor(particleCount * pm) }, () => ({
        position: [(Math.random() - 0.5) * 20, Math.random() * 5, (Math.random() - 0.5) * 20],
        velocity: [0, 0, 0], life: Math.random(), maxLife: 1.0, size: 0.01, opacity: 1.0
      }));
    }

    return state;
  }

  // ─── Tension System ──────────────────────────────────────────────

  setTension(level) {
    this.tension = Math.max(0, Math.min(1, level));
  }

  _updateTension(dt) {
    const diff = this.tension - this.tensionSmoothed;
    this.tensionSmoothed += diff * Math.min(1, this.tensionSmoothSpeed * dt);
    const t = this.tensionSmoothed;
    const tc = this.preset?.tension;
    if (!tc) return;

    // Fog thickens with tension
    if (tc.fogThickens || tc.sandstormIntensifies || tc.blizzardIntensifies) {
      const baseDensity = this.preset.fog?.density || 0.02;
      this.atmosphere?.setFogDensity?.(baseDensity * (1 + t * 2.0));
    }

    // Vignette darkens
    if (this.postProcess.vignette?.enabled) {
      const base = this.preset.pp?.vignette?.strength || 0.4;
      this.postProcess.vignette.strength = base + t * 0.35;
    }

    // Film grain intensifies
    if (this.postProcess.grain?.enabled && tc.grainIntensifies) {
      const base = this.preset.pp?.grain?.strength || 0.06;
      this.postProcess.grain.strength = base + t * 0.15;
    }

    // Chromatic aberration / distortion increases
    if (tc.distortionGrows || tc.distortionAmplifies || tc.shimmerDistorts) {
      if (this.postProcess.chromatic) {
        const base = this.preset.pp?.chromatic?.strength || 0.003;
        this.postProcess.chromatic.strength = base + t * 0.01;
        this.postProcess.chromatic.enabled = true;
      }
    }

    // Bloom pumps up
    if (this.postProcess.bloom?.enabled) {
      const base = this.preset.pp?.bloom?.strength || 0.6;
      this.postProcess.bloom.strength = base + t * 0.4;
    }

    // Game-specific tension responses
    if (tc.desaturation) this.runtimeState.desaturation = t * tc.desaturation;
    if ((tc.flashlightDims || tc.flashlightFlickers) && this.runtimeState.flashlightActive) this.runtimeState.flashlightIntensity = 1.0 - t * 0.6;
    if (tc.ambientGetsBlacker) this.runtimeState.ambientMultiplier = 1.0 - t * 0.7;
    if (tc.lightRadiusShrinks) this.runtimeState.lightRadiusMultiplier = 1.0 - t * 0.5;
  }

  // ─── Triggered Effects ───────────────────────────────────────────

  triggerEffect(effectName, params = {}) {
    switch (effectName) {
      case 'jumpscare': {
        const cfg = this.preset?.effects?.jumpscare || {};
        this.effectTimers.set('jumpscare', { duration: cfg.flashDuration || 0.15, elapsed: 0, flashColor: cfg.flashColor || [1, 1, 1], flashIntensity: cfg.flashIntensity || 10, motionBlur: cfg.motionBlur || 0.8, chromaticSpike: cfg.chromaticSpike || 0.03, ...params });
        break;
      }
      case 'screenGlitch': {
        const cfg = this.preset?.effects?.screenGlitch || {};
        this.effectTimers.set('screenGlitch', { duration: cfg.duration || 0.3, elapsed: 0, blockSize: cfg.blockSize || [8, 16], colorShift: cfg.colorShift || 0.05, tearLines: cfg.tearLines || 3, ...params });
        break;
      }
      case 'powerSurge':
        this.effectTimers.set('powerSurge', { duration: params.duration || 0.5, elapsed: 0, flashColor: this.preset?.tension?.powerSurgeFlash || [1, 1, 1], ...params });
        break;
      case 'nightVision': {
        const on = params.enabled !== undefined ? params.enabled : !this.runtimeState.nightVisionActive;
        this.runtimeState.nightVisionActive = on;
        if (on) {
          const cfg = this.preset?.effects?.nightVision || {};
          this.runtimeState.nightVisionConfig = { color: cfg.color || [0.2, 1.0, 0.3], noiseIntensity: cfg.noiseIntensity || 0.12, brightnessMultiplier: cfg.brightnessMultiplier || 3.0 };
        }
        break;
      }
      case 'blueprintMode':
        this.runtimeState.blueprintActive = params.enabled !== undefined ? params.enabled : !this.runtimeState.blueprintActive;
        break;
      case 'avalanche': {
        const cfg = this.preset?.effects?.avalanche || {};
        this.effectTimers.set('avalanche', { duration: params.duration || 5.0, elapsed: 0, screenShake: cfg.screenShake || 0.3, ...cfg, ...params });
        break;
      }
      case 'scaleTransition': {
        const cfg = this.preset?.effects?.scaleTransition || {};
        this.effectTimers.set('scaleTransition', { duration: cfg.transitionDuration || 2.0, elapsed: 0, fromScale: params.from || cfg.normalScale || 1.0, toScale: params.to || cfg.macroScale || 10.0, ...params });
        break;
      }
      default:
        console.warn(`Unknown effect: ${effectName}`);
    }
  }

  // ─── Per-Frame Updates ───────────────────────────────────────────

  _updateEffectTimers(dt) {
    const expired = [];
    for (const [name, timer] of this.effectTimers) {
      timer.elapsed += dt;
      if (timer.elapsed >= timer.duration) expired.push(name);
    }
    for (const name of expired) this.effectTimers.delete(name);
  }

  _updateFlickerTimers(dt) {
    for (const [, timer] of this.flickerTimers) {
      timer.phase += dt * (4 + timer.rate * 20);
      timer.current = timer.baseStrength * (1.0 - timer.rate * Math.abs(Math.sin(timer.phase)));
    }
  }

  _updateGlowWorms(dt) {
    if (!this.runtimeState.glowWorms) return;
    for (const worm of this.runtimeState.glowWorms) {
      worm.phase += dt * worm.pulseSpeed;
      worm.currentStrength = worm.strength * (0.5 + 0.5 * Math.sin(worm.phase));
    }
  }

  _updatePulsingGlows(dt) {
    const rg = this.runtimeState.runeGlow;
    if (rg) {
      rg.phase += dt * rg.pulseSpeed;
      const range = rg.pulseRange || [0.5, 1.0];
      rg.currentStrength = rg.strength * (range[0] + (range[1] - range[0]) * (0.5 + 0.5 * Math.sin(rg.phase)));
    }
    const cg = this.runtimeState.cursedGlow;
    if (cg) {
      cg.phase += dt * cg.pulseSpeed;
      cg.currentStrength = cg.strength * (0.6 + 0.4 * Math.sin(cg.phase));
    }
  }

  _updateDreamscapeColors(dt) {
    const colors = this.runtimeState.dreamColors;
    if (!colors?.length) return;
    this.colorShiftPhase += dt * (this.runtimeState.colorShiftSpeed || 0.3);
    const idx = this.colorShiftPhase % colors.length;
    const a = colors[Math.floor(idx) % colors.length];
    const b = colors[(Math.floor(idx) + 1) % colors.length];
    const frac = idx - Math.floor(idx);
    this.runtimeState.currentDreamColor = [a[0] + (b[0] - a[0]) * frac, a[1] + (b[1] - a[1]) * frac, a[2] + (b[2] - a[2]) * frac];
  }

  _updateActiveEffects(dt) {
    for (const [name, effect] of this.activeEffects) {
      effect.state.time += dt;

      // Sandstorm particle movement with wind + turbulence
      if (name === 'sandstorm' && effect.state.particles) {
        const wind = effect.config.windSpeed || [5, 0, 2];
        const turb = effect.config.turbulence || 2.0;
        for (const p of effect.state.particles) {
          p.turbPhase += dt * 2.0;
          p.position[0] += (wind[0] + Math.sin(p.turbPhase) * turb) * dt;
          p.position[1] += (wind[1] + Math.cos(p.turbPhase * 0.7) * turb * 0.3) * dt;
          p.position[2] += (wind[2] + Math.sin(p.turbPhase * 1.3) * turb * 0.5) * dt;
          if (p.position[0] > 20) p.position[0] -= 40;
          if (p.position[2] > 20) p.position[2] -= 40;
        }
      }

      // Snow particle fall with swirl
      if (name === 'snowParticles' && effect.state.particles && !effect.state.gpuDriven) {
        for (const p of effect.state.particles) {
          p.swirlPhase += dt * 1.5;
          p.position[1] -= p.fallSpeed * dt;
          p.position[0] += Math.sin(p.swirlPhase) * p.swirlRadius * dt;
          p.position[2] += Math.cos(p.swirlPhase * 0.8) * p.swirlRadius * dt;
          if (p.position[1] < 0) {
            p.position[1] = 25 + Math.random() * 5;
            p.position[0] = (Math.random() - 0.5) * 60;
            p.position[2] = (Math.random() - 0.5) * 60;
          }
        }
      }

      // Rain drops fall
      if (name === 'rain' && effect.state.drops) {
        for (const d of effect.state.drops) {
          d.position[1] -= d.speed * dt;
          d.position[0] += d.windOffset * dt;
          if (d.position[1] < 0) {
            d.position[1] = 12 + Math.random() * 3;
            d.position[0] = (Math.random() - 0.5) * 30;
            d.position[2] = (Math.random() - 0.5) * 30;
          }
        }
      }

      // Dream distortion wave phase
      if (name === 'dreamDistortion') effect.state.wavePhase = (effect.state.wavePhase || 0) + dt * (effect.config.waveSpeed || 1.5);

      // Web physics Verlet time accumulation
      if (name === 'webPhysics') effect.state.verletTime = (effect.state.verletTime || 0) + dt;
    }
  }

  // ─── Upload Post-Process Uniforms ────────────────────────────────

  _uploadPostProcessUniforms() {
    if (!this.ppUniforms) return;
    const pp = this.postProcess;
    const data = new Float32Array([
      pp.bloom?.enabled ? 1 : 0, pp.bloom?.threshold || 0.7, pp.bloom?.strength || 0.6, pp.bloom?.radius || 0.4,
      pp.vignette?.enabled ? 1 : 0, pp.vignette?.strength || 0.4, pp.vignette?.softness || 0.5, 0,
      pp.chromatic?.enabled ? 1 : 0, pp.chromatic?.strength || 0.003, pp.chromatic?.radial ? 1 : 0, 0,
      pp.grain?.enabled ? 1 : 0, pp.grain?.strength || 0.06, this.time, 0,
      this.tensionSmoothed, this.runtimeState.desaturation || 0, 0, 0,
      pp.crt?.enabled ? 1 : 0, pp.crt?.scanlineIntensity || 0, pp.crt?.barrelDistortion || 0, pp.crt?.phosphorGlow || 0,
      pp.tiltShift?.enabled ? 1 : 0, pp.tiltShift?.focusPosition || 0.5, pp.tiltShift?.focusWidth || 0.15, pp.tiltShift?.blurAmount || 4,
      pp.motionBlur?.enabled ? 1 : 0, pp.motionBlur?.strength || 0, pp.motionBlur?.samples || 8, 0,
      this.runtimeState.nightVisionActive ? 1 : 0, this.runtimeState.blueprintActive ? 1 : 0, 0, 0,
      this.effectTimers.has('jumpscare') ? 1 : 0, this.effectTimers.has('screenGlitch') ? 1 : 0,
      this.effectTimers.has('avalanche') ? 1 : 0, this.effectTimers.has('scaleTransition') ? 1 : 0
    ]);
    this.device.queue.writeBuffer(this.ppUniforms, 0, data.buffer, data.byteOffset, Math.min(data.byteLength, this.ppUniforms.size));
  }

  // ─── Render Hooks ────────────────────────────────────────────────

  beforeRender(camera, deltaTime) {
    if (!this.initialized) return;
    this.time += deltaTime;
    const dt = Math.min(deltaTime, 0.05);

    this._updateTension(dt);
    this._updateEffectTimers(dt);
    this._updateFlickerTimers(dt);
    this._updateGlowWorms(dt);
    this._updatePulsingGlows(dt);
    this._updateDreamscapeColors(dt);
    this._updateActiveEffects(dt);
    this._uploadPostProcessUniforms();

    this.areaLights?.update?.(deltaTime);
    this.atmosphere?.update?.(deltaTime, camera);

    this._updateStats();
  }

  afterRender() {
    // Post-frame bookkeeping, swap temporal buffers
  }

  _updateStats() {
    this.stats.activeEffects = this.activeEffects.size + this.effectTimers.size;
    let particles = 0;
    for (const [, effect] of this.activeEffects) {
      particles += effect.state.particleCount || effect.state.particles?.length || 0;
      particles += effect.state.drops?.length || 0;
    }
    this.stats.particleCount = particles;
    this.stats.lightCount = this.flickerTimers.size + (this.runtimeState.glowWorms?.length || 0);
  }

  getStats() { return { ...this.stats }; }

  // ─── Helpers ─────────────────────────────────────────────────────

  _buildDefaultPreset() {
    return {
      label: 'Unknown Game', category: 'generic',
      pp: { ...DEFAULT_PP }, lights: { ambient: [0.05, 0.05, 0.05] },
      fog: { color: [0.05, 0.05, 0.05], density: 0.02 }, tension: {}
    };
  }

  // ─── Cleanup ─────────────────────────────────────────────────────

  dispose() {
    this.activeEffects.clear();
    this.effectTimers.clear();
    this.flickerTimers.clear();
    this.runtimeState = {};

    this.ppUniforms?.destroy();
    this.areaLights?.dispose?.();
    this.atmosphere?.dispose?.();
    this.materialSystem?.dispose?.();

    this.initialized = false;
    console.log(`RemainingGamesUpgrade2026 disposed (${this.gameId})`);
  }
}

export default RemainingGamesUpgrade2026;

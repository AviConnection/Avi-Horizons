export function defaultSettings(reducedMotion = false) {
  return {
    volume: 35,
    music: true,
    musicVolume: 65,
    fullscreenOnEntry: false,
    ambient: true,
    ambientVolume: 100,
    effects: true,
    effectsVolume: 100,
    reducedMotion,
    largeText: false,
    highContrast: false,
    touchControls: 'auto',
    flightSpeed: 1,
  };
}

export function normalizeSettings(saved, reducedMotion) {
  const defaults = defaultSettings(reducedMotion);
  if (!saved || typeof saved !== 'object') return defaults;
  const volume = value => Math.min(100, Math.max(0, Math.round(value)));
  return {
    volume: Number.isFinite(saved.volume) ? volume(saved.volume) : defaults.volume,
    music: typeof saved.music === 'boolean' ? saved.music : defaults.music,
    musicVolume: Number.isFinite(saved.musicVolume) ? volume(saved.musicVolume) : defaults.musicVolume,
    fullscreenOnEntry: saved.fullscreenOnEntry === true,
    ambient: typeof saved.ambient === 'boolean' ? saved.ambient : defaults.ambient,
    ambientVolume: Number.isFinite(saved.ambientVolume) ? volume(saved.ambientVolume) : defaults.ambientVolume,
    effects: typeof saved.effects === 'boolean' ? saved.effects : defaults.effects,
    effectsVolume: Number.isFinite(saved.effectsVolume) ? volume(saved.effectsVolume) : defaults.effectsVolume,
    reducedMotion: typeof saved.reducedMotion === 'boolean' ? saved.reducedMotion : defaults.reducedMotion,
    largeText: saved.largeText === true,
    highContrast: saved.highContrast === true,
    touchControls: ['auto', 'visible', 'keyboard'].includes(saved.touchControls) ? saved.touchControls : defaults.touchControls,
    flightSpeed: [1, 3, 9].includes(saved.flightSpeed) ? saved.flightSpeed : defaults.flightSpeed,
  };
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultSettings, normalizeSettings } from '../dist/settings-model.mjs';

test('older saves retain their volume and motion preference while new settings use their defaults', () => {
  const current = normalizeSettings({ volume: 62, reducedMotion: false, sound: true }, true);
  assert.deepEqual(current, { ...defaultSettings(true), volume: 62, reducedMotion: false });
  assert.equal(normalizeSettings(null, true).reducedMotion, true);
});

test('unsupported settings restore safe defaults while valid saved controls persist', () => {
  const current = normalizeSettings({
    volume: -1, ambientVolume: 140, effectsVolume: Number.NaN,
    flightSpeed: 9, touchControls: 'keyboard', largeText: true, highContrast: true,
    music: false, musicVolume: 140, fullscreenOnEntry: true,
  });
  assert.equal(current.volume, 0);
  assert.equal(current.ambientVolume, 100);
  assert.equal(current.effectsVolume, 100);
  assert.equal(current.music, false);
  assert.equal(current.musicVolume, 100);
  assert.equal(current.fullscreenOnEntry, true);
  assert.equal(current.flightSpeed, 9);
  assert.equal(current.touchControls, 'keyboard');
  assert.equal(current.largeText, true);
  assert.equal(current.highContrast, true);
  assert.equal(normalizeSettings({ flightSpeed: 100, touchControls: 'hidden' }).flightSpeed, 1);
  assert.equal(normalizeSettings({ flightSpeed: 100, touchControls: 'hidden' }).touchControls, 'auto');
});

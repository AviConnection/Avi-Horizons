import test from 'node:test';
import assert from 'node:assert/strict';
import { routeTo, LIFT_X, nearestInteraction, evaluateLoadout } from '../dist/hub-model.mjs';

test('cross-floor navigation must go to the elevator before changing level', () => {
  const path = routeTo({ x: .88, floor: 'lower' }, { x: .22, floor: 'upper' });
  assert.equal(path[0].x, LIFT_X);
  assert.equal(path[0].floor, 'lower');
  assert.equal(path[1].kind, 'lift');
  assert.equal(path[1].floor, 'upper');
  assert.equal(path.at(-1).x, .22);
});
test('same-floor navigation never invents an elevator journey', () => {
  assert.ok(routeTo({ x: .52, floor: 'lower' }, { x: .18, floor: 'lower' }).every(step => step.kind === 'walk'));
});
test('proximity never allows opening a room on another floor', () => {
  assert.equal(nearestInteraction({ x: .755, floor: 'lower' }), null);
  assert.equal(nearestInteraction({ x: .755, floor: 'upper' }).id, 'observatory');
});
test('adding stored energy must not increase the installed power limit or lower demand', () => {
  const basic = evaluateLoadout({ camera: true });
  const battery = evaluateLoadout({ camera: true, battery: true });
  assert.equal(battery.totals.energy - basic.totals.energy, 600);
  assert.equal(battery.totals.power, basic.totals.power);
  assert.ok(battery.totals.mass > basic.totals.mass);
});
test('a battery cannot make an over-powered simultaneous payload feasible', () => {
  const result = evaluateLoadout({ camera: true, spectrometer: true, battery: true });
  assert.equal(result.valid, false);
  assert.ok(result.problems.some(message => message.includes('potencia')));
  assert.ok(result.problems.some(message => message.includes('presupuesto')));
});
test('a mission with no science instrument cannot be registered, but each individual instrument can', () => {
  assert.equal(evaluateLoadout({ battery: true }).valid, false);
  assert.equal(evaluateLoadout({ camera: true }).valid, true);
  assert.equal(evaluateLoadout({ spectrometer: true, battery: true }).valid, true);
});

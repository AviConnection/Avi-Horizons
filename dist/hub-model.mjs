/** Pure navigation and workshop rules. Values are educational prototype parameters. */
export const LEVELS = Object.freeze({ lower: .858, upper: .445 });
export const LIFT_X = .413;
export const ROOMS = Object.freeze({
  hangar: { name: 'Hangar', x: .185, floor: 'lower' },
  control: { name: 'Centro de control', x: .625, floor: 'lower' },
  laboratory: { name: 'Laboratorio', x: .885, floor: 'lower' },
  archive: { name: 'Archivo científico', x: .218, floor: 'upper' },
  observatory: { name: 'Observatorio', x: .755, floor: 'upper' },
});
export function routeTo(from, target) {
  if (!(from.floor in LEVELS) || !(target.floor in LEVELS)) throw new Error('Invalid floor');
  const x = Math.min(.945, Math.max(.055, target.x));
  const route = [];
  if (from.floor !== target.floor) {
    route.push({ kind: 'walk', x: LIFT_X, floor: from.floor });
    route.push({ kind: 'lift', x: LIFT_X, floor: target.floor });
  }
  route.push({ kind: 'walk', x, floor: target.floor });
  return route;
}
export function nearestInteraction(position) {
  if (Math.abs(position.x - LIFT_X) < .047) return { id: 'lift', name: position.floor === 'lower' ? 'Subir al nivel 02' : 'Bajar al nivel 01' };
  const matches = Object.entries(ROOMS).filter(([, room]) => room.floor === position.floor && Math.abs(room.x - position.x) < .085);
  matches.sort((a, b) => Math.abs(a[1].x - position.x) - Math.abs(b[1].x - position.x));
  return matches.length ? { id: matches[0][0], name: matches[0][1].name } : null;
}
export const EQUIPMENT = Object.freeze({
  camera: { name: 'Cámara de reconocimiento', mass: 8, power: 25, cost: 80, description: 'Registra imágenes y ayuda a reconocer zonas de interés.' },
  spectrometer: { name: 'Espectrómetro', mass: 20, power: 60, cost: 160, description: 'Obtiene información espectral para estudiar materiales.' },
  battery: { name: 'Batería adicional', mass: 12, power: 0, cost: 80, description: 'Añade 600 Wh de energía almacenada; no aumenta la potencia máxima instalada.' },
});
export const LIMITS = Object.freeze({ mass: 1250, power: 260, cost: 900 });
export function normalizeLoadout(value = {}) {
  return { ...Object.fromEntries(Object.keys(EQUIPMENT).map(id => [id, value[id] === true])), serial: value.serial === true };
}
export function evaluateLoadout(value = {}) {
  const loadout = normalizeLoadout(value);
  const totals = { mass: 1200, power: 180, cost: 600, energy: 1000 };
  for (const [id, item] of Object.entries(EQUIPMENT)) if (loadout[id]) {
    totals.mass += item.mass; totals.power += item.power; totals.cost += item.cost;
    if (id === 'battery') totals.energy += 600;
  }
  if (loadout.serial) totals.power = 180 + Math.max(loadout.camera ? EQUIPMENT.camera.power : 0, loadout.spectrometer ? EQUIPMENT.spectrometer.power : 0);
  const problems = [];
  if (!loadout.camera && !loadout.spectrometer) problems.push('Selecciona al menos un instrumento científico.');
  if (totals.mass > LIMITS.mass) problems.push('La masa supera el límite de diseño.');
  if (totals.power > LIMITS.power) problems.push('La demanda de potencia supera la capacidad instalada.');
  if (totals.cost > LIMITS.cost) problems.push('El coste supera el presupuesto disponible.');
  return { loadout, totals, problems, valid: problems.length === 0 };
}

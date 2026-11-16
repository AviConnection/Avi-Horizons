// Positions use the same fixed world coordinates on every screen size.
export const WORLD = { width: 920, height: 470 };
export const START = { x: 105, y: 236 };
const layouts = [
  [[244, 125], [455, 319], [730, 159]],
  [[225, 301], [479, 106], [752, 284]],
  [[267, 113], [541, 210], [743, 354]],
  [[260, 327], [522, 301], [707, 106]],
  [[230, 120], [465, 239], [718, 120]],
];

export function createFlight(level, pilot) {
  const positions = layouts[(level.chapter * 2 + level.index) % layouts.length];
  const stations = positions.map(([x, y], index) => ({
    x, y: y + ((level.index + index) % 3 - 1) * 18,
    name: level.stations[index][0],
    reading: level.stations[index][1],
    sampled: false,
  }));
  const hazards = [
    { x: 353 + level.index * 13, y: 222 - level.index * 15, radius: 31 + level.chapter * 5 },
    { x: 644 - level.index * 8, y: 230 + level.index * 16, radius: 25 + level.chapter * 4 },
  ];
  if (level.chapter > 1) hazards.push({ x: 565, y: 410 - level.index * 8, radius: 27 });
  for (const hazard of hazards) {
    const overlap = stations.some(station => distance(station, hazard) < hazard.radius + 44);
    if (overlap) hazard.y = hazard.y < 235 ? hazard.y + 88 : hazard.y - 88;
  }
  return {
    x: START.x, y: START.y, heading: 0, elapsed: 0, charge: 100,
    damage: 0, scans: 0, incorrect: 0, pilot, stations, hazards,
    abilityUntil: 0, target: null, analyzed: false,
  };
}

export function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function nearestStation(flight) {
  const reach = flight.pilot === 'AVI' && flight.elapsed < flight.abilityUntil ? 81 : 53;
  return flight.stations.find(station => !station.sampled && distance(flight, station) <= reach);
}

export function advanceFlight(flight, dt, axis, chapter) {
  const seconds = Math.min(.05, Math.max(0, dt));
  flight.elapsed += seconds;
  const vectorLength = Math.hypot(axis.x, axis.y);
  if (vectorLength > 0) {
    const step = Math.min(245 * seconds, axis.distance ?? Infinity);
    const vx = axis.x / vectorLength;
    const vy = axis.y / vectorLength;
    flight.x = Math.max(28, Math.min(WORLD.width - 28, flight.x + vx * step));
    flight.y = Math.max(28, Math.min(WORLD.height - 28, flight.y + vy * step));
    flight.heading = Math.atan2(vy, vx);
  }
  const inHazard = flight.hazards.some(hazard => distance(flight, hazard) < hazard.radius);
  const shielded = flight.pilot === 'MAQUI' && flight.elapsed < flight.abilityUntil;
  if (inHazard && !shielded) {
    const loss = (chapter + 3) * seconds;
    flight.charge = Math.max(1, flight.charge - loss);
    flight.damage += loss;
  }
  return inHazard && !shielded;
}

export function collectReading(flight) {
  const station = nearestStation(flight);
  if (!station) return null;
  station.sampled = true;
  flight.scans += 1;
  return station;
}

export function scoreFlight(flight) {
  const score = Math.max(35, Math.round(100 - Math.min(38, flight.damage) - flight.incorrect * 9));
  return { score, stars: score >= 90 ? 3 : score >= 72 ? 2 : 1 };
}

const __AVI = Object.create(null);
__AVI["hub-model.mjs"] = (() => {

/** Pure navigation and workshop rules. Values are educational prototype parameters. */
const LEVELS = Object.freeze({ lower: .858, upper: .445 });
const LIFT_X = .413;
const ROOMS = Object.freeze({
  hangar: { name: 'Hangar', x: .185, floor: 'lower' },
  control: { name: 'Centro de control', x: .625, floor: 'lower' },
  laboratory: { name: 'Laboratorio', x: .885, floor: 'lower' },
  archive: { name: 'Archivo científico', x: .218, floor: 'upper' },
  observatory: { name: 'Observatorio', x: .755, floor: 'upper' },
});
function routeTo(from, target) {
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
function nearestInteraction(position) {
  if (Math.abs(position.x - LIFT_X) < .047) return { id: 'lift', name: position.floor === 'lower' ? 'Subir al nivel 02' : 'Bajar al nivel 01' };
  const matches = Object.entries(ROOMS).filter(([, room]) => room.floor === position.floor && Math.abs(room.x - position.x) < .085);
  matches.sort((a, b) => Math.abs(a[1].x - position.x) - Math.abs(b[1].x - position.x));
  return matches.length ? { id: matches[0][0], name: matches[0][1].name } : null;
}
const EQUIPMENT = Object.freeze({
  camera: { name: 'Cámara de reconocimiento', mass: 8, power: 25, cost: 80, description: 'Registra imágenes y ayuda a reconocer zonas de interés.' },
  spectrometer: { name: 'Espectrómetro', mass: 20, power: 60, cost: 160, description: 'Obtiene información espectral para estudiar materiales.' },
  battery: { name: 'Batería adicional', mass: 12, power: 0, cost: 80, description: 'Añade 600 Wh de energía almacenada; no aumenta la potencia máxima instalada.' },
});
const LIMITS = Object.freeze({ mass: 1250, power: 260, cost: 900 });
function normalizeLoadout(value = {}) {
  return { ...Object.fromEntries(Object.keys(EQUIPMENT).map(id => [id, value[id] === true])), serial: value.serial === true };
}
function evaluateLoadout(value = {}) {
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

return {LEVELS,LIFT_X,ROOMS,routeTo,nearestInteraction,EQUIPMENT,LIMITS,normalizeLoadout,evaluateLoadout};
})();
__AVI["story-data.mjs"] = (() => {

const RELAY_CASES = Object.freeze({
  close: {
    label: 'Acercamiento de Marte · 31 jul. 2018',
    distanceKm: 57_600_000,
    source: 'https://science.nasa.gov/resource/mars-apparent-brightness-increases-as-it-gets-closer-to-earth/',
    credit: 'NASA/JPL-Caltech',
  },
  insight: {
    label: 'Aterrizaje de InSight · 26 nov. 2018',
    distanceKm: 146_000_000,
    source: 'https://solarsystem.nasa.gov/system/downloadable_items/2706_mars_insight_landing_presskit.pdf',
    credit: 'NASA/JPL-Caltech · guía de prensa de InSight',
  },
});

const ECHO_WINDOW = 720;
const CONTROL_PROCESSING = 120;
const ECHO_LOCAL_COST = 35;
const ECHO_LINK_COST = 5;

const STORY_CHAPTERS = [
  'El agua y la energía escasean en la Tierra. Alex recibe un fragmento del archivo de Faro 7 y pide que lo verifiques antes de recomendar una nueva expedición.',
  'El archivo de Marte ha cambiado la pregunta del programa. Antes de buscar un nuevo hogar, Alex quiere averiguar qué riesgos esconden las estrellas que podrían iluminarlo.',
  'La tripulación de relevo envía su fecha de encuentro. La nave y la Tierra cuentan años distintos en el simulador. Ayuda a Alex a fijar un regreso que ambas tripulaciones puedan interpretar.',
  'Un pulso regular y un resplandor infrarrojo llegan al archivo. Alex propone comparar las observaciones antes de darles un origen, y probar cómo la gravedad afecta a los relojes.',
  'Cuando se agotan las rutas conocidas, el Atlas se convierte en una guía para quien siga investigando. Alex necesita que documentes qué se midió, qué se calculó y qué sigue abierto.',
];

const STORY_EPILOGUE = 'Alex adjunta las 25 observaciones al mensaje de regreso. «La Tierra preguntó qué encontramos. También voy a enviar lo que aún no sabemos. Quien viaje después de nosotros merece tener las dos cosas».';

const RECOMMENDATIONS = Object.freeze({
  survey: { label: 'Recomendar un reconocimiento sin tripulación', requiredEvidence: 'La Tierra debe recibir el registro de Faro 7 y una observación con instrumento.' },
  measure: { label: 'Solicitar una medición adicional', requiredEvidence: 'La evidencia recibida debe dejar pendiente la validación del hallazgo o la observación instrumental.' },
  defer: { label: 'Aplazar y revisar el plan', requiredEvidence: 'La misión debe haber sido interrumpida o haber terminado sin evidencia confirmada en la Tierra.' },
});

return {RELAY_CASES,ECHO_WINDOW,CONTROL_PROCESSING,ECHO_LOCAL_COST,ECHO_LINK_COST,STORY_CHAPTERS,STORY_EPILOGUE,RECOMMENDATIONS};
})();
__AVI["mission-model.mjs"] = (() => {
const { normalizeLoadout, evaluateLoadout } = __AVI["hub-model.mjs"];
const { RELAY_CASES, ECHO_WINDOW, CONTROL_PROCESSING, ECHO_LOCAL_COST, ECHO_LINK_COST, RECOMMENDATIONS } = __AVI["story-data.mjs"];


// Scientific constants: NASA/JPL SSD astro_par.html. Circular, coplanar educational model.
const AU = 149597870700;
const C = 299792458;
const DAY = 86400;
const MU_SUN = 1.3271244e20;
const MARS_RADIUS_AU = 1.524;
const A = (1 + MARS_RADIUS_AU) / 2;
const E = (MARS_RADIUS_AU - 1) / (MARS_RADIUS_AU + 1);
const HOHMANN_SECONDS = Math.PI * Math.sqrt((A * AU) ** 3 / MU_SUN);
const ROUTES = Object.freeze({
  hohmann: { name: 'Transferencia Hohmann', days: HOHMANN_SECONDS / DAY, fuel: 35, energy: 90, model: 'Órbitas circulares y coplanares · transferencia kepleriana' },
  intensive: { name: 'Propulsión intensiva', days: 180, fuel: 55, energy: 170, model: 'Escenario parametrizado del juego · no es una solución orbital calculada' },
});
const VEHICLES = Object.freeze({ light: { name: 'VECTOR-L', capacity: 1250, fuel: 85, cost: 120 }, heavy: { name: 'VECTOR-H', capacity: 1500, fuel: 100, cost: 200 } });
const SITES = Object.freeze({ plain: { name: 'Planicie Aurora', risk: 4, factor: 1, description: 'Terreno ficticio abierto. Menor exigencia de aterrizaje.' }, crater: { name: 'Borde del cráter', risk: 12, factor: 1.25, description: 'Terreno ficticio más exigente, con mayor valor potencial de muestras.' } });
const OBJECTIVES = Object.freeze({ survey: { name: 'Reconocimiento general', description: 'Explora al menos dos puntos y devuelve datos científicos.' }, imaging: { name: 'Cartografía visual', instrument: 'camera', description: 'Registra el panorama con la cámara y devuelve sus imágenes.' }, minerals: { name: 'Análisis de materiales', instrument: 'spectrometer', description: 'Analiza el afloramiento con el espectrómetro y devuelve sus datos.' } });
const POINTS = Object.freeze({
  landing: { name: 'HORIZONS 2', x: .12, kind: 'base' },
  panorama: { name: 'Mirador del horizonte', x: .31, kind: 'camera', energy: 65, data: 24, science: 22 },
  mineral: { name: 'Afloramiento mineral', x: .59, kind: 'spectrometer', energy: 100, data: 36, science: 34 },
  echo: { name: 'Eco del subsuelo', x: .86, kind: 'sample', energy: 85, data: 28, science: 26 },
});
const STAGES = ['plan', 'launch', 'flight', 'incident', 'debrief', 'arrival', 'landing', 'surface', 'report'];
const clone = value => structuredClone(value);
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
function log(run, title, detail, at = run.elapsed) { run.log.push({ at, title, detail }); }
function orbitState(progress = 0, routeId = 'hohmann') {
  const p = clamp(progress, 0, 1), route = ROUTES[routeId] || ROUTES.hohmann;
  let eccentric = Math.PI * p;
  for (let i = 0; i < 8; i++) eccentric -= (eccentric - E * Math.sin(eccentric) - Math.PI * p) / (1 - E * Math.cos(eccentric));
  const ship = { x: A * (Math.cos(eccentric) - E), y: A * Math.sqrt(1 - E * E) * Math.sin(eccentric) };
  const time = p * route.days * DAY;
  const earthAngle = Math.sqrt(MU_SUN / AU ** 3) * time;
  const marsMeanMotion = Math.sqrt(MU_SUN / (MARS_RADIUS_AU * AU) ** 3);
  const marsAngle = Math.PI - marsMeanMotion * route.days * DAY + marsMeanMotion * time;
  const earth = { x: Math.cos(earthAngle), y: Math.sin(earthAngle) };
  const mars = { x: MARS_RADIUS_AU * Math.cos(marsAngle), y: MARS_RADIUS_AU * Math.sin(marsAngle) };
  const distanceAU = Math.hypot(ship.x - earth.x, ship.y - earth.y);
  const radius = Math.hypot(ship.x, ship.y) * AU;
  const speed = Math.sqrt(MU_SUN * (2 / radius - 1 / (A * AU))) * (HOHMANN_SECONDS / (route.days * DAY));
  return { ship, earth, mars, distanceAU, lightSeconds: distanceAU * AU / C, speed };
}
function clockRatio(beta) { const b = clamp(Number(beta) || 0, 0, .999999); return Math.sqrt(1 - b * b); }
function createRun(pilot, config, story = false) {
  const prepared = evaluateLoadout(config);
  if (!prepared.valid) throw new Error('La nave no cumple los límites de preparación.');
  return {
    version: 1, id: Date.now(), pilot: pilot === 'MAQUI' ? 'MAQUI' : 'AVI', config: normalizeLoadout(config),
    stage: 'plan', route: 'hohmann', site: 'plain', vehicle: 'light', objective: 'survey', progress: 0,
    elapsed: 0, fuel: VEHICLES.light.fuel, initialFuel: VEHICLES.light.fuel,
    energy: prepared.totals.energy, capacity: prepared.totals.energy, integrity: 100, science: 0,
    data: 0, queuedData: 0, deliveredData: 0, messages: [], log: [], findings: {},
    incident: null, disabled: null, calibrated: false, maxLatency: 0, kinematicLag: 0,
    landingPhase: 0, surfaceX: .12, surfaceSeconds: 0, echoRevealed: false,
    launchChecks: [], summary: null,
    ...(story ? { story: { relay: 'close', echo: null, recommendation: null } } : {}),
  };
}
function validatePlan(run) {
  const issues = [];
  if (!ROUTES[run.route] || !SITES[run.site] || !VEHICLES[run.vehicle] || !OBJECTIVES[run.objective]) return ['Elige opciones de misión válidas.'];
  const ship = evaluateLoadout(run.config);
  if (!ship.valid) issues.push(...ship.problems);
  if (ship.totals.mass > VEHICLES[run.vehicle].capacity) issues.push('La masa seca supera la capacidad del vehículo de lanzamiento.');
  const required = OBJECTIVES[run.objective].instrument;
  if (required && !run.config[required]) issues.push('El objetivo requiere un instrumento que no está equipado.');
  if (ship.totals.cost + VEHICLES[run.vehicle].cost > 1200) issues.push('Se supera el presupuesto total de misión: 1200 u.');
  if (VEHICLES[run.vehicle].fuel - ROUTES[run.route].fuel - 8 < 9) issues.push('No queda reserva mínima para el descenso.');
  return issues;
}
function choosePlan(run, options) {
  const next = clone(run);
  if (next.stage !== 'plan') return next;
  for (const key of ['route', 'site', 'vehicle', 'objective']) if (key in options) next[key] = options[key];
  if (next.story && Object.hasOwn(RELAY_CASES, options.relay ?? '')) next.story.relay = options.relay;
  next.fuel = VEHICLES[next.vehicle]?.fuel || 0; next.initialFuel = next.fuel;
  return next;
}
function beginLaunch(run) {
  if (run.stage !== 'plan' || validatePlan(run).length) return clone(run);
  const next = clone(run); next.stage = 'launch'; next.launchChecks = [];
  if (next.story) {
    const relay = relayTiming(next.story.relay);
    log(next, 'Referencia del enlace en superficie', `${relay.label}; ${relay.distanceKm.toLocaleString('es-PE')} km publicados por NASA. Respuesta ideal: ${(relay.roundTrip / 60).toFixed(1)} min, incluidos 2 min simulados de control.`);
  }
  log(next, 'Plan de misión aprobado', `${ROUTES[next.route].name}; destino ${SITES[next.site].name}; objetivo ${OBJECTIVES[next.objective].name}.`);
  return next;
}
function checkLaunch(run, id) {
  const next = clone(run); if (next.stage !== 'launch' || !['power', 'navigation', 'comms'].includes(id)) return next;
  if (!next.launchChecks.includes(id)) next.launchChecks.push(id); return next;
}
function ignite(run) {
  const next = clone(run); if (next.stage !== 'launch' || next.launchChecks.length !== 3) return next;
  next.stage = 'flight'; next.fuel -= 8; next.energy -= 55;
  log(next, 'HORIZONS 1 en trayectoria', 'Verificaciones eléctricas, navegación y comunicaciones completadas.'); return next;
}
function processMessages(run) {
  for (const message of run.messages) if (message.status === 'pending' && message.arrives <= run.elapsed + .001) {
    message.status = 'delivered';
    if (message.kind === 'science') run.deliveredData += message.amount;
    log(run, message.kind === 'science' ? 'Datos recibidos en la Tierra' : message.kind === 'reply' ? 'Respuesta terrestre recibida' : 'Telemetría recibida', message.kind === 'science' ? `${message.amount} MB confirmados.` : message.text, message.arrives);
  }
}
function message(run, kind, text, arrives, amount = 0, sent = run.elapsed) {
  run.messages.push({ id: run.messages.length + 1, kind, text, sent, arrives, status: 'pending', amount });
}
function sendStatus(run) {
  const next = clone(run); if (!['flight', 'incident', 'surface', 'arrival'].includes(next.stage) || next.energy < 5) return next;
  if (next.messages.some(m => m.kind === 'status' && m.status === 'pending')) return next;
  const latency = orbitState(next.progress, next.route).lightSeconds;
  message(next, 'status', `Estado enviado: integridad ${Math.round(next.integrity)}%, energía ${Math.round(next.energy)} Wh.`, next.elapsed + latency);
  next.energy -= 5; log(next, 'Telemetría enviada', `Latencia de ida estimada: ${(latency / 60).toFixed(1)} min.`); processMessages(next); return next;
}
function requestHelp(run) {
  const next = clone(run); if (next.stage !== 'incident' || next.incident.asked) return next;
  const latency = orbitState(next.progress, next.route).lightSeconds;
  next.incident.asked = true; next.incident.replyAt = next.elapsed + 2 * latency + 120;
  message(next, 'status', 'Anomalía en el bus de instrumentos. Solicitamos orientación.', next.elapsed + latency);
  message(next, 'reply', 'Control terrestre: prioriza estabilidad, comprueba el bus y conserva energía. Esta recomendación corresponde al estado comunicado antes de tu intervención.', next.incident.replyAt, 0, next.elapsed + latency + 120);
  next.energy = Math.max(0, next.energy - 5); log(next, 'Ayuda solicitada', `Ida y vuelta más 2 min de preparación: ${(2 * latency / 60 + 2).toFixed(1)} min.`); return next;
}
function advanceFlight(run, gameSeconds) {
  let next = clone(run); if (next.stage !== 'flight' || gameSeconds <= 0) return next;
  const route = ROUTES[next.route], total = route.days * DAY;
  let target = Math.min(1, next.progress + gameSeconds / total);
  if (!next.incident && target >= .48) target = .48;
  const delta = (target - next.progress) * total;
  const orbit = orbitState((target + next.progress) / 2, next.route), beta2 = (orbit.speed / C) ** 2;
  // Stable evaluation of 1-sqrt(1-beta²). Kinematic component only, heliocentric reference.
  next.kinematicLag += delta * beta2 / (1 + Math.sqrt(1 - beta2));
  next.fuel = Math.max(0, next.fuel - route.fuel * (target - next.progress));
  next.energy = Math.max(0, next.energy - route.energy * (target - next.progress));
  next.elapsed += delta; next.progress = target;
  next.maxLatency = Math.max(next.maxLatency, orbitState(target, next.route).lightSeconds);
  processMessages(next);
  if (!next.incident && target >= .48) {
    next.stage = 'incident'; next.incident = { start: next.elapsed, deadline: next.elapsed + 420, asked: false, replyAt: null, choice: null, resolved: false, windowLost: false, outcome: '' };
    log(next, 'Anomalía de energía', 'Una oscilación del bus amenaza la siguiente ventana de observación. Quedan 7 minutos de tiempo simulado.');
  } else if (target >= 1) { next.stage = 'arrival'; log(next, 'Encuentro con Marte', 'Transferencia completada. Comienza la preparación del descenso.'); }
  if (next.energy <= 0 || next.integrity <= 0) return finishRun(next, 'La misión entró en modo seguro por falta de recursos.', true);
  return next;
}
function calibrate(run) {
  const next = clone(run); if (next.stage !== 'flight' || next.calibrated || next.energy < 70) return next;
  next.energy -= 70; next.science += 6; next.calibrated = true;
  log(next, 'Instrumentos calibrados', 'Calibración a bordo: +6 puntos científicos, −70 Wh.'); return next;
}
function resolveIncident(run, choice) {
  let next = clone(run); if (next.stage !== 'incident' || next.incident.resolved || !['reconfigure', 'isolate', 'wait'].includes(choice)) return next;
  if (choice === 'reconfigure') {
    const cost = next.pilot === 'MAQUI' ? 120 : 180;
    if (next.energy < cost) return next;
    next.energy -= cost; next.integrity -= next.pilot === 'MAQUI' ? 2 : 5; next.science += 12;
    next.incident.outcome = `Bus reconfigurado. Conservas los instrumentos y la ventana científica. Coste: ${cost} Wh y una pequeña carga sobre los sistemas.`;
  } else if (choice === 'isolate') {
    next.disabled = next.config.spectrometer ? 'spectrometer' : 'camera'; next.energy = Math.max(0, next.energy - 30);
    next.incident.outcome = `Bus estabilizado aislando ${next.disabled === 'camera' ? 'la cámara' : 'el espectrómetro'}. Ahorras energía, pero ese instrumento no estará disponible en Marte.`;
  } else {
    if (!next.incident.asked) next = requestHelp(next);
    next.elapsed = Math.max(next.elapsed, next.incident.replyAt);
    next.energy = Math.max(0, next.energy - 35); next.incident.windowLost = true;
    next.incident.outcome = 'Esperaste en modo seguro. La nave conserva sus instrumentos, pero la ventana científica pasó antes de recibir ayuda.';
    processMessages(next);
  }
  next.incident.choice = choice; next.incident.resolved = true; next.stage = 'debrief';
  log(next, 'Decisión ante la anomalía', next.incident.outcome); return next;
}
function advanceIncident(run, seconds) {
  const next = clone(run); if (next.stage !== 'incident' || seconds <= 0) return next;
  next.elapsed += seconds; processMessages(next);
  if (next.elapsed >= next.incident.deadline) return resolveIncident(next, 'wait');
  return next;
}
function resumeFlight(run) { const next = clone(run); if (next.stage === 'debrief') next.stage = 'flight'; return next; }
function beginLanding(run) { const next = clone(run); if (next.stage === 'arrival') { next.stage = 'landing'; next.landingPhase = 0; } return next; }
function landingAction(run, mode = 'safe') {
  const next = clone(run); if (next.stage !== 'landing') return next;
  if (next.landingPhase === 0) { next.energy = Math.max(0, next.energy - 25); next.landingPhase = 1; log(next, 'Entrada protegida', 'Escudo térmico orientado. La atmósfera reduce parte de la velocidad.'); }
  else if (next.landingPhase === 1) { next.landingPhase = 2; log(next, 'Descenso con paracaídas', 'La fase aerodinámica prepara el descenso propulsado.'); }
  else {
    const cost = mode === 'economy' ? 9 : 18;
    if (next.fuel < cost) return next;
    next.fuel -= cost; next.energy = Math.max(0, next.energy - (mode === 'economy' ? 45 : 80));
    next.integrity = Math.max(0, next.integrity - SITES[next.site].risk - (mode === 'economy' ? 12 : 0));
    next.stage = 'surface'; next.surfaceX = .12; next.elapsed += 600;
    log(next, 'Aterrizaje en Marte', `${SITES[next.site].name}; descenso ${mode === 'economy' ? 'económico' : 'controlado'}. Consumo: ${cost} unidades de propulsante.`);
  }
  if (next.energy <= 0) return finishRun(next, 'Energía insuficiente al terminar el descenso.', true);
  return next;
}
function activeInstrument(run, id) { return run.config[id] === true && run.disabled !== id; }
function moveRover(run, x, seconds = 0) {
  const next = clone(run); if (next.stage !== 'surface') return next;
  const destination = clamp(x, .07, .94), distance = Math.abs(next.surfaceX - destination);
  next.energy = Math.max(0, next.energy - distance * 48); next.surfaceX = destination;
  next.elapsed += Math.max(0, seconds); next.surfaceSeconds += Math.max(0, seconds); processMessages(next);
  if (next.energy <= 0) return finishRun(next, 'El rover agotó su reserva de energía. Se conservan los datos ya transmitidos.', true);
  return next;
}
function collectPoint(run, id) {
  const next = clone(run), point = POINTS[id];
  if (next.stage !== 'surface' || !point || point.kind === 'base' || next.findings[id] || Math.abs(point.x - next.surfaceX) > .09) return next;
  if (id === 'echo' && (!next.echoRevealed || (next.story && !next.story.echo?.recovered))) return next;
  let method = point.kind, factor = 1;
  if (['camera', 'spectrometer'].includes(method) && !activeInstrument(next, method)) { method = 'manual'; factor = .45; }
  const cost = Math.round(point.energy * (next.pilot === 'MAQUI' && point.kind === 'spectrometer' ? .8 : 1));
  if (next.energy < cost) return next;
  next.energy -= cost; next.elapsed += 180; next.surfaceSeconds += 180;
  const science = Math.round(point.science * factor * SITES[next.site].factor), data = Math.round(point.data * factor);
  next.science += science; next.data += data; next.findings[id] = { name: point.name, method, science, data };
  log(next, 'Hallazgo científico', `${point.name}: ${method === 'manual' ? 'registro manual' : method === 'camera' ? 'cámara' : method === 'spectrometer' ? 'espectrómetro' : 'muestra'}. +${science} ciencia, ${data} MB.`);
  processMessages(next); return next;
}
function revealEcho(run) {
  const next = clone(run); if (next.stage !== 'surface' || next.echoRevealed) return next;
  const cost = next.pilot === 'AVI' ? 8 : 20;
  if (next.energy < cost) return next;
  next.energy -= cost; next.echoRevealed = true;
  log(next, next.pilot === 'AVI' ? 'Pulso de exploración' : 'Barrido de sensores', 'Se detectó un punto de interés bajo el regolito.'); return next;
}
function relayTiming(id) {
  const profile = Object.hasOwn(RELAY_CASES, id) ? RELAY_CASES[id] : RELAY_CASES.close;
  const oneWay = profile.distanceKm * 1000 / C;
  return { ...profile, oneWay, roundTrip: 2 * oneWay + CONTROL_PROCESSING };
}
function echoPlan(run, action) {
  if (run.stage !== 'surface' || !run.story || run.story.echo || !run.echoRevealed || Math.abs(run.surfaceX - POINTS.echo.x) > .09) return null;
  if (action === 'local') return { cost: ECHO_LOCAL_COST, delay: 60, recovered: true };
  if (action !== 'earth') return null;
  const delay = relayTiming(run.story.relay).roundTrip;
  return { cost: ECHO_LINK_COST, delay, recovered: delay <= ECHO_WINDOW };
}
function investigateEcho(run, action) {
  const plan = echoPlan(run, action);
  if (!plan || run.energy < plan.cost + (plan.recovered ? POINTS.echo.energy : 0)) return clone(run);
  const next = clone(run);
  next.story.echo = { action, recovered: plan.recovered, delay: plan.delay };
  next.energy -= plan.cost;
  next.elapsed += plan.delay;
  next.surfaceSeconds += plan.delay;
  log(next, 'Decisión en Faro 7', action === 'local'
    ? 'Alex reconstruyó el archivo a bordo. Se conservó la ventana de lectura.'
    : `Respuesta de la Tierra en ${(plan.delay / 60).toFixed(1)} min. ${plan.recovered ? 'El archivo se pudo recuperar.' : 'La ventana de lectura se cerró antes de la respuesta.'}`);
  processMessages(next);
  return plan.recovered ? collectPoint(next, 'echo') : next;
}
function reportEvidence(run) {
  const delivered = run.messages.filter(packet => packet.kind === 'science' && packet.status === 'delivered');
  const confirmed = new Set(delivered.flatMap(packet => packet.findings ?? []));
  if (run.data > 0 && run.deliveredData >= run.data) {
    for (const id of Object.keys(run.findings)) confirmed.add(id);
  }
  const echo = confirmed.has('echo');
  const instrument = (confirmed.has('panorama') && run.findings.panorama?.method === 'camera')
    || (confirmed.has('mineral') && run.findings.mineral?.method === 'spectrometer');
  const supported = run.summary?.aborted || run.deliveredData === 0 ? 'defer' : echo && instrument ? 'survey' : 'measure';
  return { echo, instrument: Boolean(instrument), supported };
}
function recordRecommendation(run, choice) {
  if (run.stage !== 'report' || !run.story || run.story.recommendation || !Object.hasOwn(RECOMMENDATIONS, choice)) return clone(run);
  const next = clone(run);
  const supported = reportEvidence(next).supported;
  next.story.recommendation = { choice, supported };
  log(next, 'Recomendación enviada por la tripulación', `${RECOMMENDATIONS[choice].label}. Alex: ${choice === supported ? 'la evidencia respalda esta recomendación.' : RECOMMENDATIONS[choice].requiredEvidence}`);
  return next;
}
function transmitData(run) {
  const next = clone(run); if (!['surface', 'arrival', 'flight'].includes(next.stage)) return next;
  const amount = next.data - next.queuedData;
  if (amount <= 0 || next.energy < 15) return next;
  const latency = orbitState(next.progress, next.route).lightSeconds;
  // 0.8 Mbit/s is a design parameter, not a claim about a real radio link.
  const serialization = amount * 8 / .8;
  message(next, 'science', 'Paquete científico.', next.elapsed + latency + serialization, amount);
  if (next.story) {
    const sent = new Set(next.messages.flatMap(packet => packet.findings ?? []));
    next.messages.at(-1).findings = Object.keys(next.findings).filter(id => !sent.has(id));
  }
  next.queuedData += amount; next.energy -= 15;
  log(next, 'Transmisión científica iniciada', `${amount} MB; ${(latency / 60).toFixed(1)} min de propagación más ${(serialization / 60).toFixed(1)} min de transmisión.`);
  return next;
}
function waitForLink(run) {
  const next = clone(run); if (!['surface', 'arrival'].includes(next.stage)) return next;
  const pending = next.messages.filter(m => m.status === 'pending');
  if (pending.length) { next.elapsed = Math.max(next.elapsed, ...pending.map(m => m.arrives)); processMessages(next); }
  return next;
}
function finishRun(run, reason = 'Expedición finalizada.', aborted = false) {
  const next = clone(run); if (next.stage === 'report') return next;
  const findings = Object.values(next.findings);
  const goal = next.objective === 'imaging' ? next.findings.panorama?.method === 'camera' : next.objective === 'minerals' ? next.findings.mineral?.method === 'spectrometer' : findings.length >= 2;
  const success = !aborted && !!goal && next.deliveredData >= 20 && next.science >= 30 && next.integrity > 0;
  const deliveryRate = next.data > 0 ? next.deliveredData / next.data : 0;
  const score = clamp(Math.round(Math.min(next.science, 100) * .5 + next.integrity * .2 + next.fuel / next.initialFuel * 15 + deliveryRate * 15), 0, 100);
  next.summary = { success, aborted, reason, score, goal: !!goal, rank: success ? score >= 80 ? 'Horizonte extraordinario' : 'Misión cumplida' : aborted ? 'Expedición interrumpida' : 'Resultado parcial' };
  next.stage = 'report'; log(next, 'Informe de misión', reason); return next;
}
function completeWithConfirmation(run) {
  if (run.stage !== 'surface') return clone(run);
  let next = transmitData(run); next = waitForLink(next);
  return finishRun(next, 'La expedición cerró tras esperar la confirmación de los paquetes enviados.');
}
function restoreRun(value) {
  // A stored run is accepted only when critical numeric state and enums are sane.
  if (!value || value.version !== 1 || !STAGES.includes(value.stage) || !['AVI', 'MAQUI'].includes(value.pilot)) return null;
  if (!ROUTES[value.route] || !SITES[value.site] || !VEHICLES[value.vehicle] || !OBJECTIVES[value.objective]) return null;
  for (const key of ['elapsed', 'progress', 'fuel', 'initialFuel', 'energy', 'capacity', 'integrity', 'science', 'data', 'queuedData', 'deliveredData', 'kinematicLag', 'surfaceX']) if (!Number.isFinite(value[key]) || value[key] < 0) return null;
  if (value.progress > 1 || value.queuedData > value.data || value.deliveredData > value.queuedData || value.energy > value.capacity || value.integrity > 100 || !Array.isArray(value.log) || !Array.isArray(value.messages) || !Array.isArray(value.launchChecks) || !value.findings) return null;
  if (['incident', 'debrief'].includes(value.stage) && (!value.incident || !Number.isFinite(value.incident.deadline))) return null;
  if (value.stage === 'report' && !value.summary) return null;
  if (value.story && !Object.hasOwn(RELAY_CASES, value.story.relay)) return null;
  return clone(value);
}

return {AU,C,DAY,MU_SUN,MARS_RADIUS_AU,HOHMANN_SECONDS,ROUTES,VEHICLES,SITES,OBJECTIVES,POINTS,STAGES,orbitState,clockRatio,createRun,validatePlan,choosePlan,beginLaunch,checkLaunch,ignite,sendStatus,requestHelp,advanceFlight,calibrate,resolveIncident,advanceIncident,resumeFlight,beginLanding,landingAction,activeInstrument,moveRover,collectPoint,revealEcho,relayTiming,echoPlan,investigateEcho,reportEvidence,recordRecommendation,transmitData,waitForLink,finishRun,completeWithConfirmation,restoreRun};
})();
__AVI["faro-model.mjs"] = (() => {
const { POINTS, advanceFlight, beginLanding, beginLaunch, checkLaunch, choosePlan, collectPoint, completeWithConfirmation, createRun, ignite, investigateEcho, landingAction, moveRover, resolveIncident, resumeFlight, revealEcho } = __AVI["mission-model.mjs"];

function prepareFaroDemo(pilot, relay) {
  let run = createRun(pilot, { camera: true, battery: true }, true);
  run = beginLaunch(choosePlan(run, { relay, objective: 'imaging' }));
  for (const system of ['power', 'navigation', 'comms']) run = checkLaunch(run, system);
  run = advanceFlight(ignite(run), Number.MAX_SAFE_INTEGER);
  run = resumeFlight(resolveIncident(run, 'reconfigure'));
  run = beginLanding(advanceFlight(run, Number.MAX_SAFE_INTEGER));
  for (let phase = 0; phase < 3; phase++) run = landingAction(run);
  run = collectPoint(moveRover(run, POINTS.panorama.x), 'panorama');
  return moveRover(revealEcho(run), POINTS.echo.x);
}

function resolveFaroDemo(run, action) {
  if (run.stage !== 'surface' || !run.story || run.story.echo) return run;
  const investigated = investigateEcho(run, action);
  if (!investigated.story.echo) return run;
  return completeWithConfirmation(investigated);
}

return {prepareFaroDemo,resolveFaroDemo};
})();
__AVI["story.js"] = (() => {
const { RELAY_CASES, RECOMMENDATIONS, ECHO_WINDOW, ECHO_LOCAL_COST } = __AVI["story-data.mjs"];
const { relayTiming, reportEvidence } = __AVI["mission-model.mjs"];


const poses = { welcome: 'welcome', explain: 'explain', alert: 'alert', relief: 'relief', portrait: 'bison' };
const fmt = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 1 });
const minutes = seconds => `${fmt.format(seconds / 60)} min`;

function alexLine(text, pose = 'explain') {
  const portrait = `<img class="alex-portrait" src="assets/alex-${poses[pose]}.webp" alt="" width="560" height="560">`;
  return `<div class="alex-line" data-alex-pose="${pose}">${portrait}<div><strong>Alex</strong><p>${text}</p></div></div>`;
}

function relayCard(id) {
  const relay = relayTiming(id);
  return `<div class="relay-card">
    <span class="eyebrow">REFERENCIA HISTÓRICA</span>
    <h4>${relay.label}</h4>
    <dl class="relay-readouts">
      <div><dt>Distancia publicada</dt><dd>${fmt.format(relay.distanceKm / 1e6)} millones de km</dd></div>
      <div><dt>Tiempo de ida calculado</dt><dd>${minutes(relay.oneWay)}</dd></div>
      <div><dt>Respuesta en el simulador</dt><dd>${minutes(relay.roundTrip)}</dd></div>
    </dl>
    <p>Distancia ÷ velocidad de la luz para la ida. La respuesta suma el viaje de vuelta y 2 min de preparación simulada.</p>
    <a href="${relay.source}" target="_blank" rel="noopener noreferrer">${relay.credit} ↗</a>
  </div>`;
}

function relayOptions(current) {
  return Object.entries(RELAY_CASES).map(([id, info]) =>
    `<option value="${id}" ${id === current ? 'selected' : ''}>${info.label}</option>`
  ).join('');
}

function storyReport(run) {
  if (!run.story) return '';
  const evidence = reportEvidence(run);
  const answer = run.story.recommendation;
  const feedback = answer
    ? answer.choice === answer.supported
      ? 'Tu recomendación coincide con la evidencia que recibió la Tierra.'
      : `Tu recomendación quedó registrada. Con esta evidencia yo propondría: ${RECOMMENDATIONS[answer.supported].label.toLowerCase()}.`
    : 'Elige qué le recomendarías a Lyra. La tripulación de relevo necesita saber qué podemos sostener con lo recibido.';
  return `<section class="story-report" aria-labelledby="story-report-title">
    <p class="eyebrow">FARO 7 / MENSAJE A CONNECTION SPACE</p>
    <h4 id="story-report-title">Una decisión basada en evidencia</h4>
    ${alexLine(feedback, evidence.echo ? 'relief' : 'explain')}
    <ul class="story-evidence">
      <li>Archivo de Faro 7: ${evidence.echo ? 'recibido en la Tierra' : 'sin confirmación'}</li>
      <li>Observación con instrumento: ${evidence.instrument ? 'recibida en la Tierra' : 'sin confirmación'}</li>
      <li>Datos confirmados: ${fmt.format(run.deliveredData)} MB</li>
    </ul>
    ${answer ? `<p><strong>Tu recomendación:</strong> ${RECOMMENDATIONS[answer.choice].label}.</p>
      ${evidence.echo ? '<p class="story-transcript">Faro 7 · Transcripción recuperada: «…todavía podemos volver. Esta vez, traigan un segundo instrumento».</p>' : '<p>El informe conserva la incertidumbre sobre el mensaje de Faro 7.</p>'}`
      : `<div class="story-actions">${Object.entries(RECOMMENDATIONS).map(([id, item]) =>
        `<button class="room-action-secondary" data-recommendation="${id}">${item.label}</button>`
      ).join('')}</div>`}
  </section>`;
}

function connectStory({ openDialog, getPilot, getRun, startExpedition, playSignal, logbook }) {
  const dialog = document.querySelector('#alex-dialog');
  const title = document.querySelector('#alex-title');
  const copy = document.querySelector('#alex-copy');
  const next = document.querySelector('#alex-next');
  const portrait = document.querySelector('#alex-portrait');
  const beginLabel = 'Ir al hangar';
  let page = 0;
  const brief = [
    'La Tierra nos pidió averiguar qué puede sostener a la próxima tripulación. Varias regiones están racionando agua y los cortes de energía ya alcanzan a la red que abastece la estación. Lyra nos ha asignado la nodriza HORIZONS 1. HORIZONS 2 llevará nuestros instrumentos a la superficie de Marte.',
    'Recibí un fragmento del archivo de Faro 7: «…todavía podemos». El resto de la transmisión quedó incompleto. Lleva instrumentos al hangar y diseña tu expedición. Voy contigo para ayudarte a comprobar dónde termina la señal y dónde empieza nuestra interpretación.',
  ];
  function showIntro() {
    portrait.src = `assets/alex-${page === 0 ? poses.welcome : poses.explain}.webp`;
    dialog.dataset.alexPose = page === 0 ? 'welcome' : 'explain';
    title.textContent = page === 0 ? `Te esperaba, ${getPilot()}.` : 'Una señal de Faro 7';
    copy.textContent = brief[page];
    next.hidden = false;
    next.textContent = page === 0 ? 'Escuchar la señal' : beginLabel;
  }
  function intro() {
    page = 0;
    showIntro();
    openDialog(dialog.id);
  }
  next.addEventListener('click', () => {
    if (page === 0) {
      page = 1;
      playSignal();
      showIntro();
      title.focus();
      return;
    }
    dialog.close();
    logbook.activity('Bienvenida de Alex', 'Se recibió el fragmento de Faro 7. Destino: Marte.', getPilot());
    startExpedition();
  });
  document.addEventListener('click', event => {
    if (!event.target.closest('[data-alex]')) return;
    const run = getRun();
    const chapters = {
      plan: 'Antes de aprobar el plan, comprueba si llevas el instrumento que exige tu objetivo. Puedes elegir una distancia histórica para preparar el ejercicio de Faro 7.',
      launch: 'Tres sistemas nos separan del despegue. Revisa energía, navegación y comunicaciones.',
      flight: 'Las lecturas de vuelo vienen del modelo orbital. La velocidad de reproducción cambia el ritmo del juego, mientras que el laboratorio compara el tiempo que registra cada reloj.',
      incident: 'Si priorizas la respuesta terrestre, podrías perder la ventana científica. Reconfigurar consume más batería. Aislar estabiliza la nave y limita lo que podrás medir.',
      debrief: run?.incident?.outcome,
      arrival: 'Elige el perfil de descenso y revisa el propulsante. Una vez abajo podemos usar el rover.',
      landing: 'Usa el escudo, el paracaídas y el descenso propulsado en ese orden. Vigila la reserva antes de escoger el modo final.',
      surface: `Pulsa Q para buscar el punto oculto. En Faro 7 puedes analizar a bordo por ${ECHO_LOCAL_COST} Wh o consultar a la Tierra. Tendrás ${minutes(ECHO_WINDOW)} para leer el archivo.`,
      report: 'Revisa qué datos recibió la Tierra. La bitácora guarda el razonamiento detrás de cada intento.',
    };
    const pose = run?.stage === 'incident' ? 'alert' : run?.stage === 'report' ? 'relief' : 'portrait';
    portrait.src = `assets/alex-${poses[pose]}.webp`;
    dialog.dataset.alexPose = pose;
    title.textContent = 'Canal de Alex';
    copy.textContent = chapters[run?.stage] ?? 'Analizo datos a bordo de HORIZONS 1. Si quieres seguir la señal de Faro 7, elige Iniciar juego y te presentaré la misión.';
    next.hidden = true;
    openDialog(dialog.id);
  });
  return { intro };
}

return {minutes,alexLine,relayCard,relayOptions,storyReport,connectStory};
})();
__AVI["faro-demo.js"] = (() => {
const { prepareFaroDemo, resolveFaroDemo } = __AVI["faro-model.mjs"];
const { echoPlan, reportEvidence } = __AVI["mission-model.mjs"];
const { ECHO_WINDOW } = __AVI["story-data.mjs"];
const { alexLine, minutes, relayCard, relayOptions } = __AVI["story.js"];




const decisionNames = { earth: 'Consultar a la Tierra', local: 'Analizar con Alex' };
const caseNames = { close: 'Acercamiento', insight: 'InSight' };

function connectFaroDemo({ openDialog, logbook, getPilot, playEffect }) {
  const dialog = document.querySelector('#faro-demo-dialog');
  const content = document.querySelector('#faro-demo-content');
  const attempts = new Map();
  let relay = 'insight';
  let run;

  function comparison() {
    if (!attempts.size) return '';
    return `<table class="faro-comparison">
      <caption>Intentos de esta sesión</caption>
      <thead><tr><th scope="col">Distancia</th><th scope="col">Decisión</th><th scope="col">Respuesta</th><th scope="col">Archivo en la Tierra</th><th scope="col">Datos</th></tr></thead>
      <tbody>${[...attempts.values()].map(item => `<tr><th scope="row">${caseNames[item.story.relay]}</th><td>${decisionNames[item.story.echo.action]}</td><td>${minutes(item.story.echo.delay)}</td><td>${reportEvidence(item).echo ? 'Recibido' : 'Sin confirmar'}</td><td>${item.deliveredData} MB</td></tr>`).join('')}</tbody>
    </table>`;
  }

  function render() {
    const echo = run.story.echo;
    const evidence = reportEvidence(run);
    const briefing = 'El transmisor de Faro 7 se reiniciará en 12 minutos. Podemos pedir ayuda a la Tierra o usar la batería para que yo reconstruya el archivo aquí.';
    const outcome = evidence.echo
      ? 'El archivo llegó a la Tierra junto con el panorama. Lyra puede recomendar un reconocimiento sin tripulación.'
      : 'Llegó el panorama, pero la respuesta tardó más que la ventana de lectura. Lyra necesita otra medición antes de recomendar el reconocimiento.';
    content.innerHTML = `<div class="faro-grid">
      <section class="faro-actions" aria-label="Decisión en Faro 7">
        ${alexLine(echo ? outcome : briefing, echo ? (evidence.echo ? 'relief' : 'alert') : 'explain')}
        <div class="faro-window"><span>Ventana de lectura</span><strong>${minutes(ECHO_WINDOW)}</strong></div>
        ${echo ? `<div class="faro-result" tabindex="-1" id="faro-result">
          <strong>${evidence.echo ? 'Archivo confirmado' : 'Ventana perdida'}</strong>
          <p>${minutes(echo.delay)} de respuesta · ${run.deliveredData} MB recibidos en la Tierra</p>
        </div><button class="primary-action compact" data-faro-retry>Probar otra decisión</button>` : `
          <div class="faro-decisions">${Object.entries(decisionNames).map(([action, label]) => {
            const plan = echoPlan(run, action);
            return `<button class="room-action-secondary" data-faro-action="${action}"><strong>${label}</strong><span>${minutes(plan.delay)} · ${plan.cost} Wh para decidir</span></button>`;
          }).join('')}</div>`}
      </section>
      <section aria-label="Datos del enlace">
        <label class="faro-relay-label" for="faro-relay">Distancia de referencia</label>
        <select id="faro-relay">${relayOptions(relay)}</select>
        ${relayCard(relay)}
      </section>
    </div>
    ${comparison()}
    ${attempts.size ? '<button class="room-action-secondary faro-log" data-logbook>Ver bitácora</button>' : ''}
    <p class="faro-note">Las distancias son históricas. Faro 7, los costes y la ventana de lectura pertenecen al escenario didáctico. Cambiar la distancia modifica el retraso de la señal. El laboratorio temporal compara la marcha de dos relojes.</p>`;
  }

  function prepare() {
    run = prepareFaroDemo(getPilot(), relay);
    render();
  }

  document.querySelector('#faro-demo-button').addEventListener('click', () => {
    prepare();
    openDialog(dialog.id);
  });
  content.addEventListener('change', event => {
    if (!event.target.matches('#faro-relay')) return;
    relay = event.target.value;
    prepare();
    content.querySelector('#faro-relay').focus();
  });
  content.addEventListener('click', event => {
    const decision = event.target.closest('[data-faro-action]');
    if (decision) {
      const result = resolveFaroDemo(run, decision.dataset.faroAction);
      if (result === run) return;
      run = { ...result, demoId: logbook.newId('faro') };
      attempts.set(`${relay}:${run.story.echo.action}`, run);
      logbook.expedition(run);
      playEffect(reportEvidence(run).echo ? 'success' : 'signal');
      render();
      content.querySelector('#faro-result').focus();
    } else if (event.target.closest('[data-faro-retry]')) {
      prepare();
      content.querySelector('[data-faro-action]').focus();
    }
  });
}

return {connectFaroDemo};
})();
__AVI["settings-model.mjs"] = (() => {

function defaultSettings(reducedMotion = false) {
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

function normalizeSettings(saved, reducedMotion) {
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

return {defaultSettings,normalizeSettings};
})();
__AVI["logbook-store.mjs"] = (() => {

const DATABASE = 'avi-horizons-logbook';
const FALLBACK = 'avi-horizons.logbook.v1';
const STORES = ['runs', 'events'];

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) {
      reject(new Error('IndexedDB no disponible'));
      return;
    }
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      db.createObjectStore('runs', { keyPath: 'id' });
      const events = db.createObjectStore('events', { keyPath: 'id' });
      events.createIndex('runId', 'runId');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Base de datos bloqueada'));
  });
}

function indexedAdapter(db) {
  return {
    mode: 'IndexedDB',
    write(batch, insertOnly) {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORES, 'readwrite');
        transaction.oncomplete = () => resolve();
        transaction.onabort = () => reject(transaction.error);
        for (const name of STORES) {
          const store = transaction.objectStore(name);
          for (const item of batch[name] ?? []) {
            if (!insertOnly && name === 'events') {
              store.put(item);
              continue;
            }
            const existing = store.get(item.id);
            existing.onsuccess = () => {
              const current = existing.result;
              if (insertOnly && current) return;
              if (name === 'runs' && current?.endedAt && !item.endedAt) return;
              store.put(item);
            };
          }
        }
      });
    },
    read() {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORES, 'readonly');
        const runs = transaction.objectStore('runs').getAll();
        const events = transaction.objectStore('events').getAll();
        transaction.oncomplete = () => resolve({ runs: runs.result, events: events.result });
        transaction.onabort = () => reject(transaction.error);
      });
    },
  };
}

function localAdapter(storage) {
  const read = () => JSON.parse(storage.getItem(FALLBACK) || '{"runs":[],"events":[]}');
  return {
    mode: 'Almacenamiento local alternativo',
    write(batch, insertOnly) {
      const data = read();
      for (const name of STORES) {
        const byId = new Map(data[name].map(item => [item.id, item]));
        for (const item of batch[name] ?? []) {
          const current = byId.get(item.id);
          if (insertOnly && current) continue;
          if (name === 'runs' && current?.endedAt && !item.endedAt) continue;
          byId.set(item.id, item);
        }
        data[name] = [...byId.values()];
      }
      storage.setItem(FALLBACK, JSON.stringify(data));
    },
    read,
  };
}

function createLogbookStore() {
  let writeFailed = false;
  const adapter = openDatabase().then(indexedAdapter, () => localAdapter(globalThis.localStorage));
  let queue = Promise.resolve();

  function write(batch, { insertOnly = false } = {}) {
    queue = queue.then(async () => {
      try {
        await (await adapter).write(batch, insertOnly);
        return true;
      } catch {
        writeFailed = true;
        return false;
      }
    });
    return queue;
  }

  async function snapshot() {
    await queue;
    try {
      const storage = await adapter;
      return { ...await storage.read(), mode: storage.mode, writeFailed };
    } catch {
      return { runs: [], events: [], mode: 'No disponible', writeFailed: true };
    }
  }

  return { write, snapshot };
}

return {createLogbookStore};
})();
__AVI["atlas-data.js"] = (() => {

const IMAGES = {
  "earth": {
    "image": "assets/atlas/earth.webp",
    "source": "https://images.nasa.gov/details/GSFC_20171208_Archive_e001386",
    "credit": "NASA/NOAA/GSFC/Suomi NPP/VIIRS/Norman Kuring",
    "url": "https://images-assets.nasa.gov/image/GSFC_20171208_Archive_e001386/GSFC_20171208_Archive_e001386~medium.jpg",
    "label": "COMPOSICIÓN OBSERVACIONAL",
    "caption": "La Tierra en Blue Marble 2012: mosaico de observaciones de Suomi NPP."
  },
  "moon": {
    "image": "assets/atlas/moon.webp",
    "source": "https://images.nasa.gov/details/KSC-20240819-PH-JBS01_0009",
    "credit": "KSC",
    "url": "https://images-assets.nasa.gov/image/KSC-20240819-PH-JBS01_0009/KSC-20240819-PH-JBS01_0009~medium.jpg",
    "label": "FOTOGRAFÍA",
    "caption": "La Luna llena fotografiada desde la Tierra."
  },
  "jupiter": {
    "image": "assets/atlas/jupiter.webp",
    "source": "https://images.nasa.gov/details/PIA01258",
    "credit": "JPL/NASA/STScI",
    "url": "https://images-assets.nasa.gov/image/PIA01258/PIA01258~thumb.jpg",
    "label": "OBSERVACIÓN · HUBBLE",
    "caption": "Júpiter e Ío en una imagen del telescopio Hubble."
  },
  "europa": {
    "image": "assets/atlas/europa.webp",
    "source": "https://images.nasa.gov/details/PIA00294",
    "credit": "NASA/JPL",
    "url": "https://images-assets.nasa.gov/image/PIA00294/PIA00294~small.jpg",
    "label": "OBSERVACIÓN · GALILEO",
    "caption": "Detalles de la superficie helada de Europa."
  },
  "saturn": {
    "image": "assets/atlas/saturn.webp",
    "source": "https://images.nasa.gov/details/PIA05983",
    "credit": "NASA/JPL",
    "url": "https://images-assets.nasa.gov/image/PIA05983/PIA05983~small.jpg",
    "label": "COMPOSICIÓN OBSERVACIONAL",
    "caption": "Saturno observado por Cassini."
  },
  "titan": {
    "image": "assets/atlas/titan.webp",
    "source": "https://images.nasa.gov/details/PIA06228",
    "credit": "NASA/JPL/Space Science Institute",
    "url": "https://images-assets.nasa.gov/image/PIA06228/PIA06228~small.jpg",
    "label": "OBSERVACIÓN · CASSINI",
    "caption": "Titán en una vista monocroma de Cassini."
  },
  "alpha": {
    "image": "assets/atlas/alpha.webp",
    "source": "https://images.nasa.gov/details/GSFC_20171208_Archive_e000214",
    "credit": "GSFC",
    "url": "https://images-assets.nasa.gov/image/GSFC_20171208_Archive_e000214/GSFC_20171208_Archive_e000214~small.jpg",
    "label": "OBSERVACIÓN · HUBBLE",
    "caption": "Alfa Centauri A y B; los rayos luminosos son efectos ópticos de la imagen."
  },
  "orion": {
    "image": "assets/atlas/orion.webp",
    "source": "https://images.nasa.gov/details/PIA04227",
    "credit": "NASA and the Hubble Heritage Team STScI/AURA",
    "url": "https://images-assets.nasa.gov/image/PIA04227/PIA04227~small.jpg",
    "label": "OBSERVACIÓN",
    "caption": "La nebulosa de Orión y estructuras de gas en una región de formación estelar."
  },
  "betelgeuse": {
    "image": "assets/atlas/betelgeuse.webp",
    "source": "https://images.nasa.gov/details/PIA16680",
    "credit": "ESA/Herschel/PACS/L. Decin et al.",
    "url": "https://images-assets.nasa.gov/image/PIA16680/PIA16680~thumb.jpg",
    "label": "OBSERVACIÓN INFRARROJA",
    "caption": "El entorno de Betelgeuse en infrarrojo; no es una fotografía de su superficie."
  },
  "milky": {
    "image": "assets/atlas/milky.webp",
    "source": "https://images.nasa.gov/details/PIA10748",
    "credit": "NASA/JPL-Caltech",
    "url": "https://images-assets.nasa.gov/image/PIA10748/PIA10748~medium.jpg",
    "label": "ILUSTRACIÓN CIENTÍFICA",
    "caption": "Representación de la estructura de la Vía Láctea. No es una fotografía tomada desde fuera."
  },
  "lmc": {
    "image": "assets/atlas/lmc.webp",
    "source": "https://images.nasa.gov/details/iss071e418742",
    "credit": "JSC",
    "url": "https://images-assets.nasa.gov/image/iss071e418742/iss071e418742~medium.jpg",
    "label": "FOTOGRAFÍA DESDE LA ISS",
    "caption": "Las Nubes de Magallanes, fotografiadas desde la Estación Espacial Internacional."
  },
  "tarantula": {
    "image": "assets/atlas/tarantula.webp",
    "source": "https://images.nasa.gov/details/GSFC_20171208_Archive_e002020",
    "credit": "GSFC",
    "url": "https://images-assets.nasa.gov/image/GSFC_20171208_Archive_e002020/GSFC_20171208_Archive_e002020~medium.jpg",
    "label": "OBSERVACIÓN · ESO",
    "caption": "Nebulosa de la Tarántula en la Gran Nube de Magallanes."
  },
  "andromeda": {
    "image": "assets/atlas/andromeda.webp",
    "source": "https://images.nasa.gov/details/GSFC_20171208_Archive_e000833",
    "credit": "GSFC",
    "url": "https://images-assets.nasa.gov/image/GSFC_20171208_Archive_e000833/GSFC_20171208_Archive_e000833~small.jpg",
    "label": "MOSAICO OBSERVACIONAL · HUBBLE",
    "caption": "Región de Andrómeda en un mosaico del telescopio Hubble."
  },
  "crab": {
    "image": "assets/atlas/crab.webp",
    "source": "https://images.nasa.gov/details/PIA03606",
    "credit": "NASA/ESA/JPL/Arizona State Univ.",
    "url": "https://images-assets.nasa.gov/image/PIA03606/PIA03606~medium.jpg",
    "label": "MOSAICO OBSERVACIONAL · HUBBLE",
    "caption": "Nebulosa del Cangrejo, remanente de supernova que contiene un púlsar."
  },
  "sagittarius": {
    "image": "assets/atlas/sagittarius.webp",
    "source": "https://images.nasa.gov/details/0300607",
    "credit": "MSFC",
    "url": "https://images-assets.nasa.gov/image/0300607/0300607~medium.jpg",
    "label": "OBSERVACIÓN EN RAYOS X · CHANDRA",
    "caption": "Gas del entorno del centro galáctico y Sagitario A*. No es una fotografía de su horizonte."
  },
  "m87": {
    "image": "assets/atlas/m87.webp",
    "source": "https://images.nasa.gov/details/PIA23122",
    "credit": "NASA/JPL-Caltech/IPAC/Event Horizon Telescope Collaboration",
    "url": "https://images-assets.nasa.gov/image/PIA23122/PIA23122~medium.jpg",
    "label": "OBSERVACIÓN INFRARROJA · SPITZER",
    "caption": "Galaxia M87 y su chorro. No es la reconstrucción de la sombra de M87* del EHT."
  },
  "quasar": {
    "image": "assets/atlas/quasar.webp",
    "source": "https://images.nasa.gov/details/PIA16114",
    "credit": "NASA/ESA",
    "url": "https://images-assets.nasa.gov/image/PIA16114/PIA16114~small.jpg",
    "label": "ILUSTRACIÓN CIENTÍFICA",
    "caption": "Cuásar ilustrativo similar a APM 08279+5255. No representa una observación de TON 618."
  },
  "darkmatter": {
    "image": "assets/atlas/darkmatter.webp",
    "source": "https://images.nasa.gov/details/GSFC_20171208_Archive_e001983",
    "credit": "GSFC",
    "url": "https://images-assets.nasa.gov/image/GSFC_20171208_Archive_e001983/GSFC_20171208_Archive_e001983~medium.jpg",
    "label": "COMPOSICIÓN MULTIBANDA",
    "caption": "Cúmulo Abell 1689. Las observaciones permiten estudiar la masa por sus efectos gravitatorios."
  },
  "cmb": {
    "image": "assets/atlas/cmb.webp",
    "source": "https://images.nasa.gov/details/PIA18916",
    "credit": "ESA/Planck Collaboration",
    "url": "https://images-assets.nasa.gov/image/PIA18916/PIA18916~small.jpg",
    "label": "VISUALIZACIÓN DE DATOS · PLANCK",
    "caption": "Polarización del fondo cósmico de microondas. No representa el dipolo de temperatura."
  },
  "mars": {
    "image": "assets/atlas/mars.webp",
    "source": "https://science.nasa.gov/resource/mars-planet-globe/",
    "credit": "NASA / ESA · Créditos completos en la fuente",
    "url": "https://assets.science.nasa.gov/content/dam/science/psd/mars/resources/detail_files/6/6453_mars-globe-valles-marineris-enhanced-full2.jpg/jcr:content/renditions/cq5dam.web.1280.1280.jpeg",
    "label": "MOSAICO OBSERVACIONAL",
    "caption": "El hemisferio de Valles Marineris en un mosaico de imágenes de Marte."
  },
  "venus": {
    "image": "assets/atlas/venus.webp",
    "source": "https://science.nasa.gov/resource/computer-simulated-global-view-of-venus/",
    "credit": "NASA / ESA · Créditos completos en la fuente",
    "url": "https://assets.science.nasa.gov/content/dam/science/psd/solar/2023/09/v/Venus.jpg/jcr:content/renditions/cq5dam.web.1280.1280.jpeg",
    "label": "RECONSTRUCCIÓN CON RADAR",
    "caption": "Globo de Venus reconstruido con datos de radar; no representa el color visible de sus nubes."
  },
  "proxima": {
    "image": "assets/atlas/proxima.webp",
    "source": "https://science.nasa.gov/asset/hubble/proxima-centauri/",
    "credit": "NASA y ESA",
    "url": "https://assets.science.nasa.gov/content/dam/science/missions/hubble/releases/2013/11/STScI-01EVT3JKAAG784PXXCNK95JD4E.tif/jcr:content/renditions/cq5dam.web.1280.1280.jpeg",
    "label": "OBSERVACIÓN · HUBBLE",
    "caption": "Próxima Centauri aparece como un punto luminoso, no como un disco resuelto."
  },
  "vy": {
    "image": "assets/atlas/vy.webp",
    "source": "https://science.nasa.gov/asset/hubble/vy-cma/",
    "credit": "NASA, ESA, Roberta Humphreys (UMN)",
    "url": "https://assets.science.nasa.gov/content/dam/science/missions/hubble/releases/2021/03/STScI-01EZWFVA3KPYP5H1REQ7SQQMYM.tif/jcr:content/renditions/cq5dam.web.1280.1280.jpeg",
    "label": "OBSERVACIÓN · HUBBLE",
    "caption": "Material expulsado por la hipergigante VY Canis Majoris."
  },
  "neutron": {
    "image": "assets/atlas/neutron.webp",
    "source": "https://science.nasa.gov/asset/hubble/artists-impression-of-disk-around-a-neutron-star/",
    "credit": "NASA, ESA y N. Tr’Ehnl (Pennsylvania State University)",
    "url": "https://assets.science.nasa.gov/content/dam/science/missions/hubble/releases/2018/09/STScI-01EVSZNRSE9PZBN13D7JEMKSXS.tif/jcr:content/renditions/cq5dam.web.1280.1280.jpeg",
    "label": "ILUSTRACIÓN DE UNA HIPÓTESIS",
    "caption": "Posible disco de polvo alrededor de RX J0806.4−4123. Esta interpretación no está demostrada por la ilustración."
  },
  "attractor": {
    "image": "assets/atlas/attractor.webp",
    "source": "https://science.nasa.gov/missions/hubble/hubble-focuses-on-the-great-attractor/",
    "credit": "ESA/Hubble y NASA",
    "url": "https://science.nasa.gov/wp-content/uploads/2023/04/720334main_potw1302a-jpg.webp",
    "label": "OBSERVACIÓN · HUBBLE",
    "caption": "Campo de galaxias en la región del Gran Atractor; no es un único objeto que atraiga todo el universo."
  },
  "woh": {
    "image": "assets/atlas/woh.webp",
    "source": "https://www.eso.org/public/images/eso2417a/",
    "credit": "ESO/K. Ohnaka et al. · CC BY 4.0",
    "url": "https://cdn.eso.org/images/screen/eso2417a.jpg",
    "label": "OBSERVACIÓN INTERFEROMÉTRICA",
    "caption": "WOH G64 y su envoltura de polvo reconstruidas con GRAVITY/VLTI; colores de representación."
  },
  "ton": {
    "image": "assets/atlas/ton.webp",
    "source": "https://www.nasa.gov/universe/nasa-animation-sizes-up-the-universes-biggest-black-holes/",
    "credit": "NASA’s Goddard Space Flight Center",
    "url": "https://www.nasa.gov/wp-content/uploads/2023/05/nasa-smhb-compared.png",
    "label": "VISUALIZACIÓN CIENTÍFICA · NASA",
    "caption": "Comparación ilustrada de escalas de agujeros negros; la fuente incluye TON 618."
  },
  "sirius": {
    "image": "assets/atlas/sirius.webp",
    "source": "https://science.nasa.gov/asset/hubble/the-dog-star-sirius-and-its-tiny-companion/",
    "credit": "NASA, ESA, H. Bond (STScI), M. Barstow (University of Leicester)",
    "url": "https://assets.science.nasa.gov/content/dam/science/missions/hubble/releases/2005/12/STScI-01EVT7ZJ6D77V1MAV8F65NSFE7.tif/jcr:content/renditions/cq5dam.web.1280.1280.jpeg",
    "label": "OBSERVACIÓN · HUBBLE",
    "caption": "Sirio A y Sirio B; la imagen de A está sobreexpuesta para revelar a su compañera."
  },
  "dipole": {
    "image": "assets/atlas/dipole.webp",
    "source": "https://lambda.gsfc.nasa.gov/product/cobe/dmr_image.html",
    "credit": "NASA / COBE / LAMBDA",
    "url": "https://lambda.gsfc.nasa.gov/product/cobe/cobe_images/physics_today.gif",
    "label": "MAPAS OBSERVACIONALES · COBE/DMR",
    "caption": "Arriba: brillo casi uniforme. Centro: contraste del dipolo. Abajo: señal tras sustraer el dipolo, con emisión galáctica aún visible."
  },
  "void": {
    "image": "assets/atlas/void.svg",
    "label": "ESQUEMA CONCEPTUAL",
    "caption": "Región ilustrativa de menor densidad. No es un mapa observado del Vacío de Boötes.",
    "credit": "Diagrama AVI CONNECTION",
    "source": "https://science.nasa.gov/universe/galaxies/large-scale-structures/"
  },
  "expansion": {
    "image": "assets/atlas/expansion.svg",
    "label": "ESQUEMA CONCEPTUAL",
    "caption": "Separaciones crecientes entre galaxias no ligadas. No representa datos ni una escala temporal.",
    "credit": "Diagrama AVI CONNECTION",
    "source": "https://science.nasa.gov/dark-energy/"
  },
  "hero": {
    "image": "assets/hero.webp",
    "label": "ESCENA ARTÍSTICA · IA",
    "caption": "CONNECTION SPACE sobre la Tierra, escenario ficticio de AVI HORIZONS.",
    "credit": "AVI CONNECTION · imagen generada con IA",
    "source": "#credits-dialog"
  },
  "surface": {
    "image": "assets/mars-surface.png",
    "label": "ESCENA ARTÍSTICA · IA",
    "caption": "Paisaje de exploración marciana del juego; no es una fotografía de Marte.",
    "credit": "AVI CONNECTION · imagen generada con IA",
    "source": "#credits-dialog"
  }
};
const ATLAS = [
  {
    "short": "Sistema solar",
    "title": "Los mundos de nuestro Sol",
    "zone": "VECINDARIO SOLAR",
    "story": "Lyra reúne a la tripulación para construir la primera sección del Atlas: explorar sin perder el contacto con nuestro hogar.",
    "levels": [
      {
        "name": "Primera salida",
        "images": [
          "earth",
          "moon"
        ],
        "description": "Tierra y Luna: el comienzo de la exploración.",
        "challenge": "Preparar navegación y comunicaciones.",
        "science": "Órbitas, referencias y propagación de señales.",
        "playable": true
      },
      {
        "name": "Bajo las nubes",
        "images": [
          "venus"
        ],
        "description": "Venus obliga a mirar más allá de nuestros ojos.",
        "challenge": "Elegir instrumentos para estudiar superficie y atmósfera.",
        "science": "Radar y límites de cada instrumento.",
        "playable": true
      },
      {
        "name": "Ecos de Marte",
        "images": [
          "mars",
          "surface"
        ],
        "description": "Prepara HORIZONS 2, viaja a Marte y reúne datos científicos con AVI o MAQUI.",
        "challenge": "Resolver una incidencia, aterrizar, explorar y transmitir resultados.",
        "science": "Recursos, transferencia orbital ideal y latencia de comunicación.",
        "playable": true
      },
      {
        "name": "Entre gigantes",
        "images": [
          "jupiter",
          "europa"
        ],
        "description": "Júpiter y Europa plantean preguntas sobre ambientes extremos.",
        "challenge": "Planear observaciones sin confundir imágenes con pruebas de vida.",
        "science": "Radiación, lunas heladas y habitabilidad.",
        "playable": true
      },
      {
        "name": "Camino exterior",
        "images": [
          "saturn",
          "titan"
        ],
        "description": "Los anillos de Saturno y la atmósfera de Titán amplían el horizonte.",
        "challenge": "Decidir qué estudiar con energía limitada.",
        "science": "Anillos, espectros y exploración lejana.",
        "playable": true
      }
    ]
  },
  {
    "short": "Otras estrellas",
    "title": "Entre otras estrellas",
    "zone": "VÍA LÁCTEA",
    "story": "Nova propone comparar sistemas estelares: una estrella cercana puede ser muy distinta del Sol.",
    "levels": [
      {
        "name": "La vecina roja",
        "images": [
          "proxima"
        ],
        "description": "Próxima Centauri abre la sección interestelar del Atlas.",
        "challenge": "Separar observaciones de hipótesis.",
        "science": "Enanas rojas y distancias interestelares.",
        "playable": true
      },
      {
        "name": "Dos soles",
        "images": [
          "alpha"
        ],
        "description": "Alfa Centauri A y B forman un sistema binario.",
        "challenge": "Distinguir estrellas y referencias de navegación.",
        "science": "Sistemas binarios y dinámica gravitatoria.",
        "playable": true
      },
      {
        "name": "La compañera de Sirio",
        "images": [
          "sirius"
        ],
        "description": "Sirio B es una enana blanca junto a Sirio A.",
        "challenge": "Separar la luz de objetos con brillos muy distintos.",
        "science": "Evolución estelar y contraste.",
        "playable": true
      },
      {
        "name": "Cuna de estrellas",
        "images": [
          "orion"
        ],
        "description": "Orión conserva pistas de estrellas en formación.",
        "challenge": "Comparar imágenes y seleccionar regiones de interés.",
        "science": "Gas, polvo y formación estelar.",
        "playable": true
      },
      {
        "name": "Gigantes de luz",
        "images": [
          "betelgeuse",
          "vy"
        ],
        "description": "Betelgeuse y VY Canis Majoris muestran estrellas evolucionadas.",
        "challenge": "Comparar tamaños estimados sin presentar récords definitivos.",
        "science": "Pérdida de masa e incertidumbre de las mediciones.",
        "playable": true
      }
    ]
  },
  {
    "short": "Otras galaxias",
    "title": "Más allá de la Vía Láctea",
    "zone": "GRUPO LOCAL Y ENTORNO",
    "story": "Una nueva perspectiva de nuestra galaxia y de los relojes que llevamos a bordo.",
    "levels": [
      {
        "name": "Nuestro lugar",
        "images": [
          "milky"
        ],
        "description": "Explora el halo y la estructura de la Vía Láctea.",
        "challenge": "Situar nuestro sistema solar en una representación galáctica.",
        "science": "Disco, halo y escalas; la vista exterior es una ilustración.",
        "playable": true
      },
      {
        "name": "La nube vecina",
        "images": [
          "lmc",
          "tarantula"
        ],
        "description": "La Gran Nube de Magallanes y la Tarántula albergan regiones de formación estelar.",
        "challenge": "Relacionar nebulosas y galaxias anfitrionas.",
        "science": "Jerarquía entre estrellas, nebulosas y galaxias.",
        "playable": true
      },
      {
        "name": "Una estrella extragaláctica",
        "images": [
          "woh"
        ],
        "description": "WOH G64 se observa a través de su envoltura de polvo.",
        "challenge": "Distinguir estructuras reconstruidas de ilustraciones.",
        "science": "Interferometría y resolución.",
        "playable": true
      },
      {
        "name": "Horizonte de Andrómeda",
        "images": [
          "andromeda"
        ],
        "description": "Andrómeda permite estudiar movimientos y distribución de masa.",
        "challenge": "Comparar modelos y observaciones.",
        "science": "La materia oscura se infiere por efectos gravitatorios.",
        "playable": true
      },
      {
        "name": "La fecha del regreso",
        "images": [
          "earth",
          "milky"
        ],
        "description": "Dos relojes pueden acumular tiempos diferentes durante un viaje ideal.",
        "challenge": "Comparar el reloj de referencia y el tiempo propio en el laboratorio.",
        "science": "La dilatación depende del movimiento y la gravedad; salir de una galaxia no la causa por sí solo.",
        "playable": true
      }
    ]
  },
  {
    "short": "Entornos extremos",
    "title": "Al borde del horizonte",
    "zone": "PÚLSARES Y AGUJEROS NEGROS",
    "story": "Teo y Nova preparan observaciones remotas de los ambientes más extremos.",
    "levels": [
      {
        "name": "El faro del Cangrejo",
        "images": [
          "crab"
        ],
        "description": "Un púlsar vive en un remanente de supernova.",
        "challenge": "Relacionar pulsos periódicos y rotación.",
        "science": "Estrellas de neutrones y remanentes de supernova.",
        "playable": true
      },
      {
        "name": "Un resplandor inesperado",
        "images": [
          "neutron"
        ],
        "description": "RX J0806.4−4123 plantea preguntas sobre emisión infrarroja extendida.",
        "challenge": "Comparar explicaciones y proponer nuevas observaciones.",
        "science": "Una anomalía no equivale a una señal artificial.",
        "playable": true
      },
      {
        "name": "El corazón de la galaxia",
        "images": [
          "sagittarius"
        ],
        "description": "Sagitario A* ocupa el entorno central de nuestra galaxia.",
        "challenge": "Estudiar gas cercano y relojes en un modelo ideal.",
        "science": "Horizonte de sucesos y dilatación gravitatoria bajo supuestos explícitos.",
        "playable": true
      },
      {
        "name": "El chorro de M87",
        "images": [
          "m87"
        ],
        "description": "M87 alberga un agujero negro supermasivo y un chorro prominente.",
        "challenge": "Distinguir galaxia, chorro y sombra del agujero negro.",
        "science": "Acreción y técnicas de observación.",
        "playable": true
      },
      {
        "name": "La escala de TON 618",
        "images": [
          "ton",
          "quasar"
        ],
        "description": "TON 618 permite explorar la escala de agujeros negros extremadamente masivos asociados a cuásares.",
        "challenge": "Comparar escalas y reconocer incertidumbres.",
        "science": "Cuásares y discos de acreción. No existe una fotografía de cerca de TON 618.",
        "playable": true
      }
    ]
  },
  {
    "short": "Grandes misterios",
    "title": "El universo que todavía desconocemos",
    "zone": "COSMOLOGÍA",
    "story": "El Atlas termina con preguntas abiertas: la siguiente aventura comienza con una nueva observación.",
    "levels": [
      {
        "name": "El Vacío de Boötes",
        "images": [
          "void"
        ],
        "description": "Una gran región con relativamente pocas galaxias.",
        "challenge": "Reconocer regiones de baja densidad en la red cósmica.",
        "science": "Estructura a gran escala; el esquema no es un mapa observado.",
        "playable": true
      },
      {
        "name": "Hacia el Gran Atractor",
        "images": [
          "attractor"
        ],
        "description": "Los movimientos de galaxias revelan concentraciones de materia.",
        "challenge": "Separar expansión y velocidades peculiares.",
        "science": "Una región de concentración de masa, no un agujero negro universal.",
        "playable": true
      },
      {
        "name": "Lo que no vemos",
        "images": [
          "darkmatter"
        ],
        "description": "Las lentes gravitatorias ayudan a investigar la masa de cúmulos.",
        "challenge": "Comparar materia visible y modelos de lente gravitatoria.",
        "science": "Evidencias gravitatorias de materia oscura; su naturaleza sigue abierta.",
        "playable": true
      },
      {
        "name": "Una dirección en el fondo",
        "images": [
          "dipole",
          "cmb"
        ],
        "description": "El dipolo del fondo cósmico ayuda a estudiar nuestro movimiento respecto a ese fondo.",
        "challenge": "Distinguir dipolo de temperatura, polarización y otras fluctuaciones.",
        "science": "Movimiento del observador y señales cosmológicas.",
        "playable": true
      },
      {
        "name": "Un horizonte en expansión",
        "images": [
          "expansion"
        ],
        "description": "La expansión acelerada impulsa el estudio de la energía oscura.",
        "challenge": "Comparar modelos y sus predicciones observables.",
        "science": "Materia oscura y energía oscura son conceptos distintos.",
        "playable": true
      }
    ]
  }
];

return {IMAGES,ATLAS};
})();
__AVI["campaign-data.mjs"] = (() => {
const { ATLAS } = __AVI["atlas-data.js"];

const CHAPTERS = [
  { art: 'solar', accent: '#ffad83', number: '01', guide: 'lyra' },
  { art: 'stars', accent: '#9bbfff', number: '02', guide: 'nova' },
  { art: 'galaxies', accent: '#d6aaff', number: '03', guide: 'nova' },
  { art: 'extreme', accent: '#ffc678', number: '04', guide: 'teo' },
  { art: 'cosmos', accent: '#76f3da', number: '05', guide: 'nova' },
];

// These three readings are collected as the player reaches each beacon.
// Answer order varies by level. Quantities described as simulated are scenario data.
const activities = [
  [
    ['Luna cercana','Repite el enlace a dos distancias y estima el tiempo de ida.',
      ['Baliza Tierra','La radio viaja aproximadamente a 300 000 km/s.'],
      ['Eco lunar','La baliza de prueba está a 384 000 km del transmisor.'],
      ['Canal de retorno','El tiempo de ida es distancia dividida entre velocidad.'],
      '¿Cuánto tarda la señal de ida en este modelo?',
      ['0,13 s','1,28 s','2,56 s'],1,'Los 2,56 s corresponden aproximadamente a ida y vuelta.'],
    ['Superficie de Venus','Identifica el instrumento que permitió ver el relieve bajo las nubes.',
      ['Cámara visible','El detector óptico registra la cubierta de nubes.'],
      ['Eco del terreno','El tiempo de retorno del pulso de radar contiene información sobre la distancia al relieve.'],
      ['Nubes','Un espectrómetro atmosférico puede estudiar gases sin reconstruir por sí solo el relieve.'],
      '¿Qué instrumento usarías para cartografiar el terreno?',
      ['Radar','Cámara de luz visible','Termómetro de cabina'],0,'Magallanes cartografió Venus con radar de apertura sintética.'],
    ['Estación Faro 7','Recupera las tres partes del mensaje y verifica su procedencia.',
      ['Antena oxidada','El mensaje se repite con la misma secuencia digital.'],
      ['Registro de estación','El identificador de la grabación coincide con el de Faro 7.'],
      ['Canal de retorno','La bitácora indica una retransmisión automática del archivo de la antigua tripulación.'],
      '¿Qué explicación respaldan los tres registros de la historia?',
      ['Un transmisor de Venus','Una comunicación de origen desconocido','Una grabación retransmitida por Faro 7'],2,'La coincidencia del identificador y del registro técnico permite verificar el origen.'],
    ['Europa y Júpiter','Relaciona el terreno helado con las pistas sobre el interior de Europa.',
      ['Superficie de Europa','El mosaico revela crestas y fracturas en el hielo.'],
      ['Magnetómetro','El campo inducido es compatible con una capa conductora, como agua salada bajo el hielo.'],
      ['Telemetría','Estas mediciones caracterizan el entorno y orientan nuevas observaciones.'],
      '¿Qué conclusión está respaldada?',
      ['Se conoce una especie viva','Los datos apoyan la hipótesis de un océano salado bajo el hielo','Las crestas revelan el fondo del océano'],1,'Una capa conductora y otros indicios sustentan la hipótesis del océano.'],
    ['Saturno y Titán','Separa los hallazgos de los anillos y de la atmósfera de Titán.',
      ['Anillos','La firma espectral de los anillos indica abundante hielo de agua.'],
      ['Titán','El radar revela detalles del terreno bajo la bruma.'],
      ['Atmósfera','El espectro registra metano en la atmósfera de Titán.'],
      '¿Qué medición ayuda a estudiar el terreno de Titán a través de la bruma?',
      ['Radar','Telemetría de batería','Fotografía de los anillos'],0,'Cassini usó radar para observar la superficie de Titán.']
  ],
  [
    ['Próxima Centauri','Inspecciona la variabilidad de una estrella cercana.',
      ['Estrella','Próxima Centauri es una enana roja.'],
      ['Fotómetro','La intensidad sube y vuelve a su nivel anterior.'],
      ['Espectro','El pulso breve coincide con un incremento de emisión energética.'],
      '¿Qué fenómeno es compatible con el aumento breve de brillo?',
      ['Una órbita completada','Una llamarada estelar','Un cambio en la edad de la estrella'],1,'Las enanas rojas pueden producir llamaradas, visibles como aumentos breves de emisión.'],
    ['Alfa Centauri A y B','Determina qué objeto explica el movimiento observado.',
      ['Componente A','Su posición cambia de manera periódica respecto del centro de masa.'],
      ['Componente B','La segunda estrella sigue un movimiento complementario.'],
      ['Centro de masa','El centro de masa del sistema sirve de referencia común.'],
      '¿Alrededor de qué referencia orbitan ambas estrellas?',
      ['Un detector de la nave','El polo galáctico','Su centro de masa común'],2,'Cada estrella orbita el centro de masa del sistema.'],
    ['Sirio A y B','Identifica una técnica para estudiar la estrella tenue.',
      ['Sirio A','Su brillo domina la observación de campo amplio.'],
      ['Sirio B','La compañera tenue se puede resolver con un instrumento de suficiente resolución.'],
      ['Canal óptico','Una apertura estrecha permite aislar la luz de un objeto para medir su espectro.'],
      '¿Qué procedimiento facilita medir el espectro de Sirio B?',
      ['Aislar su luz con una apertura estrecha','Sumar toda la luz de la región','Medir únicamente el brillo de Sirio A'],0,'La separación angular y el control del brillo permiten estudiar la enana blanca.'],
    ['Nebulosa de Orión','Encuentra regiones de formación estelar ocultas por el polvo.',
      ['Imagen visible','Zonas densas aparecen oscuras donde el polvo absorbe luz.'],
      ['Mapa infrarrojo','En ciertas bandas infrarrojas el polvo resulta más transparente.'],
      ['Núcleo','Las fuentes jóvenes aparecen con mayor contraste en los datos infrarrojos.'],
      '¿Qué banda complementarías con la observación visible?',
      ['Solo luz ultravioleta','Infrarrojo','Una frecuencia de radio de la cabina'],1,'La comparación multibanda revela estructuras y fuentes distintas.'],
    ['Betelgeuse y VY Canis Majoris','Compara estimaciones de tamaño en un ejemplo simulado.',
      ['Modelo A','Radio estimado entre 700 y 1 000 radios solares.'],
      ['Modelo B','Radio estimado entre 900 y 1 400 radios solares.'],
      ['Calibración','En este ejercicio los intervalos representan rangos de incertidumbre.'],
      '¿Qué indican los rangos simulados?',
      ['A es siempre más grande','Ambas estrellas tienen el mismo radio','Los rangos se solapan y el orden requiere más precisión'],2,'Un solapamiento limita la certeza de una comparación basada en estos rangos.']
  ],
  [
    ['La Vía Láctea','Ubica el Sistema Solar en la estructura de nuestra galaxia.',
      ['Centro galáctico','El núcleo marca la región central del mapa.'],
      ['Disco','Los brazos espirales y regiones de formación estelar trazan el disco.'],
      ['Brazo local','La región solar se encuentra en el disco, lejos del centro.'],
      '¿Dónde se ubica el Sistema Solar?',
      ['En el disco galáctico','En el núcleo galáctico','Entre la Vía Láctea y Andrómeda'],0,'El Sistema Solar se encuentra en el disco de la Vía Láctea.'],
    ['Nubes de Magallanes','Conecta la nebulosa con su galaxia anfitriona.',
      ['Galaxia satélite','La Gran Nube de Magallanes contiene estrellas, gas y polvo.'],
      ['Tarántula','La nebulosa es una región de formación estelar dentro de esa galaxia.'],
      ['Cúmulo joven','La nebulosa contiene estrellas jóvenes agrupadas.'],
      '¿Cuál es el orden de menor a mayor escala?',
      ['Galaxia → nebulosa → cúmulo','Cúmulo → nebulosa → galaxia','Nebulosa → galaxia → cúmulo'],1,'Una galaxia puede contener una nebulosa y esta puede alojar cúmulos.'],
    ['WOH G64','Reconstruye una imagen a partir de mediciones interferométricas.',
      ['Telescopio A','La observación individual separa pocos detalles.'],
      ['Telescopio B','Dos aperturas separadas miden información complementaria.'],
      ['Reconstrucción','Las franjas de interferencia permiten estimar la estructura angular.'],
      '¿Qué técnica ayuda a distinguir su envoltura de polvo?',
      ['Repetir la misma fotografía sin combinar datos','Aumentar la saturación del color','Interferometría'],2,'La interferometría combina información de aperturas separadas para resolver detalles pequeños.'],
    ['Andrómeda','Examina una curva de rotación didáctica.',
      ['Disco interior','El modelo visible coincide aproximadamente con los datos internos.'],
      ['Disco exterior','En el ejemplo, las velocidades observadas superan las predichas usando solo materia visible.'],
      ['Modelo de masa','Una componente de masa adicional cambia la velocidad prevista.'],
      '¿Qué se ajusta para comprobar esa hipótesis?',
      ['La distribución de masa del modelo','El color del fondo de pantalla','La velocidad de la luz'],0,'Las curvas de rotación son una línea de evidencia sobre la distribución de masa.'],
    ['Relojes en movimiento','Compara dos relojes para el mismo tramo ideal de viaje.',
      ['Referencia','El reloj de referencia mide 10 años entre dos sucesos del tramo.'],
      ['Velocidad','La nave mantiene 0,8 c en ese sistema inercial.'],
      ['Reloj de la nave','Usa Δτ = Δt · √(1 − v²/c²).'],
      '¿Cuánto tiempo propio transcurre a bordo?',
      ['10 años','8 años','6 años'],2,'El factor √(1 − 0,8²) vale 0,6. La nave acumula 6 años.']
  ],
  [
    ['Púlsar del Cangrejo','Distingue una señal periódica del ruido.',
      ['Primer pulso','Los picos del registro simulado llegan con intervalos muy parecidos.'],
      ['Radio','La señal reaparece a la misma fase de cada vuelta.'],
      ['Remanente','Una estrella de neutrones rotante puede barrer nuestra línea de visión con un haz.'],
      '¿Qué explica la repetición de los pulsos?',
      ['Una nube que se enciende cada noche','Un haz que barre nuestra línea de visión','Una galaxia que cambia de posición'],1,'El giro de una estrella de neutrones puede producir pulsos como los de un faro.'],
    ['RX J0806.4−4123','Investiga una fuente infrarroja con más de una explicación.',
      ['Imagen infrarroja','La emisión se extiende más allá de una fuente puntual.'],
      ['Modelo de polvo','Un disco de polvo es una hipótesis para explicar la extensión.'],
      ['Modelo alternativo','Otra hipótesis involucra el entorno de partículas del púlsar.'],
      '¿Qué haría avanzar la investigación?',
      ['Comparar predicciones con observaciones en más bandas','Dar por verificada la primera hipótesis','Clasificar la fuente por un único píxel'],0,'Las hipótesis se distinguen con nuevas mediciones que ponen a prueba sus predicciones.'],
    ['Sagitario A*','Compara relojes estáticos en un modelo gravitatorio ideal.',
      ['Referencia lejana','El reloj lejano marca un intervalo de 10 años.'],
      ['Baliza cercana','En el modelo esférico y sin rotación, la baliza permanece a r = 2 rₛ.'],
      ['Modelo','Para un reloj estático, Δτ = Δt · √(1 − rₛ/r).'],
      '¿Cuánto mide aproximadamente el reloj cercano?',
      ['5,00 años','10,00 años','7,07 años'],2,'En el modelo ideal, √(1 − 1/2) ≈ 0,707.'],
    ['Galaxia M87','Localiza la estructura que emite en varias bandas.',
      ['Núcleo','La galaxia alberga un agujero negro supermasivo en su centro.'],
      ['Radio','El mapa de radio detecta emisión extendida que parte de la región central.'],
      ['Rayos X','Las observaciones muestran regiones brillantes alineadas con esa estructura.'],
      '¿Qué fenómeno describe esa estructura alineada?',
      ['Un chorro de partículas','El disco de la Vía Láctea','La superficie de una estrella'],0,'Las observaciones de M87 en varias bandas permiten estudiar su chorro.'],
    ['Cuásar TON 618','Compara un modelo de escala para agujeros negros no rotantes.',
      ['Modelo A','Masa simulada M. El radio de Schwarzschild es proporcional a M.'],
      ['Modelo B','Masa simulada 2M. Se mantienen constantes G y c.'],
      ['Escala','La relación es rₛ = 2GM/c².'],
      '¿Cómo cambia rₛ al duplicar la masa en este modelo?',
      ['Se reduce a la mitad','Se duplica','Se cuadruplica'],1,'La relación es lineal para el modelo de Schwarzschild.']
  ],
  [
    ['Vacío de Boötes','Compara conteos simulados en volúmenes iguales.',
      ['Región A','La muestra A contiene 4 galaxias.'],
      ['Región B','La muestra B contiene 22 galaxias.'],
      ['Región C','La muestra C contiene 29 galaxias.'],
      '¿Qué región representa una zona de baja densidad en el ejercicio?',
      ['B','C','A'],2,'En volúmenes iguales, un menor conteo significa menor densidad numérica.'],
    ['Gran Atractor','Compara un movimiento medido con el modelo de expansión.',
      ['Expansión','El modelo simulado predice una recesión de 1 500 km/s.'],
      ['Observación','Se mide una recesión de 1 300 km/s en la misma dirección.'],
      ['Convención','La velocidad peculiar radial se estima restando predicción a observación.'],
      '¿Cuál es la velocidad peculiar radial del ejemplo?',
      ['−200 km/s','+200 km/s','+2 800 km/s'],0,'El residuo es 1 300 − 1 500 = −200 km/s.'],
    ['Lentes gravitatorias','Contrasta arcos observados con un modelo basado en luz visible.',
      ['Galaxias de fondo','Sus imágenes aparecen deformadas al pasar cerca del cúmulo.'],
      ['Modelo visible','El modelo con la materia luminosa subestima parte de la deformación.'],
      ['Modelo ampliado','Una distribución de masa adicional mejora el ajuste en el ejercicio.'],
      '¿Qué propiedad del cúmulo ayuda a investigar la lente?',
      ['La fecha exacta de formación','La distribución de masa','La temperatura de un detector'],1,'La lente responde a la gravedad producida por la masa total.'],
    ['Dipolo cósmico','Localiza el patrón asociado al movimiento del observador.',
      ['Hemisferio frontal','Se observa una temperatura ligeramente mayor en la dirección del movimiento.'],
      ['Hemisferio opuesto','Se observa una temperatura ligeramente menor en el sentido contrario.'],
      ['Mapa completo','Las dos regiones opuestas forman un patrón dipolar.'],
      '¿Qué patrón buscarías para identificar ese efecto?',
      ['Un anillo caliente uniforme','Tres puntos fríos al azar','Dos hemisferios con diferencias opuestas de temperatura'],2,'La señal dipolar del fondo permite estimar el movimiento respecto de él.'],
    ['Expansión cósmica','Compara separaciones simuladas en intervalos iguales.',
      ['Época 1','La separación del par de referencia es de 100 unidades.'],
      ['Época 2','Tras un intervalo, la separación es de 120 unidades.'],
      ['Época 3','Tras otro intervalo igual, la separación llega a 150 unidades.'],
      '¿Qué tendencia representa este ejercicio?',
      ['Aumento del ritmo de separación','Separación constante','Descenso del ritmo de separación'],0,'La separación crece primero en 20 y luego en 30 unidades. Es un ejemplo idealizado de aceleración.']
  ]
];

const CAMPAIGN = ATLAS.flatMap((mission, chapter) =>
  mission.levels.map((level, index) => {
    const [destination, objective, first, second, third, question, choices, answer, explanation] = activities[chapter][index];
    return {
      id: `${chapter + 1}.${index + 1}`, chapter, index, title: level.name,
      destination, objective, stations: [first, second, third], question, choices, answer, explanation,
      imageKey: level.images[0], guide: CHAPTERS[chapter].guide,
    };
  })
);

return {CHAPTERS,CAMPAIGN};
})();
__AVI["mission-templates.js"] = (() => {

function orbitalSVG(id = 'orbit-map') {
  return `<svg id="${id}" class="orbital-svg" viewBox="0 0 760 600" role="img" aria-label="Mapa de transferencia entre las órbitas de la Tierra y Marte"><defs><radialGradient id="sunGlow"><stop stop-color="#f0c77e" stop-opacity=".4"/><stop offset="1" stop-color="#f0c77e" stop-opacity="0"/></radialGradient></defs><circle cx="380" cy="300" r="56" fill="url(#sunGlow)"/><circle cx="380" cy="300" r="13" fill="#f1c886"/><text x="380" y="337" text-anchor="middle" fill="#97877d" font-size="10" font-family="monospace">SOL</text><circle cx="380" cy="300" r="108" class="faint-orbit"/><circle cx="380" cy="300" r="150" class="earth-orbit"/><circle cx="380" cy="300" r="228.6" class="mars-orbit"/><path id="orbit-route" class="planned-path"/><path id="orbit-travelled" class="travelled-path"/><line id="orbit-signal" class="signal-line"/><g id="orbit-earth"><circle r="7" fill="#90b9d6"/><text x="11" y="-12" fill="#b8d4e7" font-size="11">TIERRA</text></g><g id="orbit-mars"><circle r="9" fill="#d28b70"/><text x="14" y="-12" fill="#e7b49b" font-size="11">MARTE</text></g><g id="orbit-ship"><circle r="16" fill="#bc8bf518" stroke="#c3a8f666"/><path d="m0-8 6 14-6-3-6 3Z" fill="#e6caff"/></g></svg>`;
}
const stageNames = { plan: 'Planificación', launch: 'Lanzamiento', flight: 'Viaje', incident: 'Decisión', debrief: 'Consecuencia', arrival: 'Encuentro', landing: 'Descenso', surface: 'Exploración', report: 'Resultados' };
const stageGroups = [['plan','launch'],['flight','incident','debrief'],['arrival','landing'],['surface'],['report']];
const groupNames = ['PREPARAR','VIAJAR','ATERRIZAR','EXPLORAR','DESCUBRIR'];

return {orbitalSVG,stageNames,stageGroups,groupNames};
})();
__AVI["logbook.js"] = (() => {
const { RECOMMENDATIONS, RELAY_CASES } = __AVI["story-data.mjs"];
const { reportEvidence } = __AVI["mission-model.mjs"];
const { createLogbookStore } = __AVI["logbook-store.mjs"];
const { CAMPAIGN } = __AVI["campaign-data.mjs"];
const { ROUTES, SITES, OBJECTIVES } = __AVI["mission-model.mjs"];
const { EQUIPMENT } = __AVI["hub-model.mjs"];
const { stageNames } = __AVI["mission-templates.js"];







const MIGRATION_KEY = 'avi-horizons.logbook-migrated.v1';
const TITLES = { campaign: 'Campaña', mars: 'Expedición a Marte' };
const STATUSES = { active: 'En curso', success: 'Completada', partial: 'Parcial', ended: 'Interrumpida', legacy: 'Récord importado' };
const number = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 1 });
const escapeText = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const date = timestamp => Number.isFinite(timestamp) ? new Date(timestamp).toLocaleString('es-PE') : 'Fecha no registrada';

function simulationTime(seconds) {
  if (!Number.isFinite(seconds)) return '';
  if (seconds >= 86400) return `${number.format(seconds / 86400)} d`;
  if (seconds >= 60) return `${number.format(seconds / 60)} min`;
  return `${number.format(seconds)} s`;
}

function readOld(key, defaultValue) {
  try { return JSON.parse(localStorage.getItem(key)) ?? defaultValue; }
  catch { return defaultValue; }
}

function saveFile(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function createLogbook(openDialog) {
  const store = createLogbookStore();
  const dialog = document.querySelector('#logbook-dialog');
  const content = dialog.querySelector('#logbook-content');
  const detail = dialog.querySelector('#logbook-detail');
  const filter = dialog.querySelector('#logbook-filter');
  const status = dialog.querySelector('#logbook-status');
  let shown = { runs: [], events: [] };
  let selectedId = null;
  let serial = 0;

  function newId(prefix) {
    const random = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}-${serial++}`;
    return `${prefix}:${random}`;
  }

  function activity(title, description, pilot) {
    store.write({ events: [{ id: newId('activity'), runId: null, title, description, pilot, at: Date.now() }] });
  }

  function expedition(run, replaced = false) {
    if (!run) return;
    const runId = run.demoId ?? `mars:${run.id}`;
    const result = run.summary;
    const story = run.story;
    const evidence = story ? reportEvidence(run) : null;
    const record = {
      id: runId, type: 'mars', title: run.demoId ? 'Faro 7 · Demostración' : 'Ecos de Marte', pilot: run.pilot,
      startedAt: run.id, updatedAt: Date.now(), elapsed: run.elapsed,
      endedAt: result || replaced ? Date.now() : null,
      status: replaced ? 'ended' : result?.success ? 'success' : result?.aborted ? 'ended' : result ? 'partial' : 'active',
      stage: stageNames[run.stage], score: result?.score ?? null,
      note: replaced ? 'Se inició una nueva expedición.' : result?.reason,
      details: {
        'Ruta': ROUTES[run.route].name, 'Zona': SITES[run.site].name, 'Objetivo': OBJECTIVES[run.objective].name,
        'Verificaciones de lanzamiento': `${run.launchChecks.length} / 3`,
        'Energía restante': `${number.format(run.energy)} Wh`,
        'Propulsante restante': `${number.format(run.fuel)} u.`,
        'Integridad': `${number.format(run.integrity)} %`,
        'Ciencia': `${number.format(run.science)} puntos`,
        'Datos obtenidos': `${number.format(run.data)} MB`,
        'Datos confirmados en la Tierra': `${number.format(run.deliveredData)} MB`,
        ...(run.incident?.choice ? {
          'Decisión ante la avería': { reconfigure: 'Reconfigurar', isolate: 'Aislar', wait: 'Esperar' }[run.incident.choice],
          'Equipo aislado': EQUIPMENT[run.disabled]?.name ?? 'Ninguno',
        } : {}),
        ...(story ? {
          'Referencia de comunicación': RELAY_CASES[story.relay].label,
          'Decisión en Faro 7': story.echo?.action === 'local' ? 'Analizar con Alex' : story.echo?.action === 'earth' ? 'Consultar a la Tierra' : 'Pendiente',
          'Archivo de Faro 7': evidence.echo ? 'Recibido en la Tierra' : 'Sin confirmación',
          ...(story.recommendation ? { 'Recomendación': RECOMMENDATIONS[story.recommendation.choice].label } : {}),
        } : {}),
      },
      equipment: structuredClone(run.config),
      findings: structuredClone(run.findings),
      messages: structuredClone(run.messages),
      ...(story ? { story: structuredClone(story), source: RELAY_CASES[story.relay].source } : {}),
    };
    const events = run.log.map((entry, index) => ({
      id: `${runId}:${index}`, runId, order: index,
      title: entry.title, description: entry.detail, elapsed: entry.at,
    }));
    if (replaced) {
      events.push({
        id: `${runId}:replaced`, runId, order: events.length, elapsed: run.elapsed,
        title: 'Expedición cerrada', description: record.note,
      });
    }
    store.write({ runs: [record], events });
  }

  function campaign(flight, level, logState, result, event) {
    const record = {
      id: logState.id, type: 'campaign', title: level.title, level: level.id, pilot: flight.pilot,
      startedAt: logState.startedAt, updatedAt: Date.now(), elapsed: flight.elapsed,
      endedAt: result ? Date.now() : null, stage: result ? 'Informe' : 'Exploración',
      status: result?.status ?? (result ? 'success' : 'active'), score: result?.score ?? null,
      note: result?.note,
      details: {
        'Destino': level.destination,
        'Energía restante': `${number.format(flight.charge)} %`,
        'Lecturas': `${flight.scans} / 3`,
        'Intentos incorrectos': flight.incorrect,
      },
      findings: flight.stations.filter(station => station.sampled).map(({ name, reading }) => ({ name, reading })),
    };
    const events = event ? [{
      runId: record.id, id: newId(record.id), at: Date.now(), elapsed: flight.elapsed, ...event,
    }] : [];
    store.write({ runs: [record], events });
  }

  function importSavedRecords() {
    if (readOld(MIGRATION_KEY, false)) return;
    const scores = readOld('avi-horizons.campaign.v1', {})?.best ?? {};
    const runs = CAMPAIGN.filter(level => Number.isInteger(scores[level.id]) && scores[level.id] >= 35 && scores[level.id] <= 100).map(level => ({
      id: `legacy:campaign:${level.id}`, type: 'campaign', level: level.id, title: level.title, status: 'legacy', score: scores[level.id],
      note: 'Récord de la versión anterior. El juego guardaba la mejor puntuación por nivel.',
    }));
    const history = readOld('avi-horizons.results.v1', []);
    if (Array.isArray(history)) for (const entry of history) {
      if (!entry || !Number.isFinite(entry.id) || !Number.isFinite(entry.score) || !Object.hasOwn(ROUTES, entry.route)) continue;
      runs.push({
        id: `mars:${entry.id}`, type: 'mars', title: 'Ecos de Marte', pilot: entry.pilot,
        startedAt: entry.id, status: entry.success ? 'success' : 'partial', score: entry.score,
        note: 'Resumen recuperado del historial anterior.',
        details: { 'Ruta': ROUTES[entry.route].name, 'Ciencia': `${entry.science} puntos` },
      });
    }
    const notes = readOld('avi-horizons.crew.v1', {});
    const events = Object.entries(notes ?? {}).filter(([, description]) => typeof description === 'string').map(([key, description]) => ({
      id: `legacy:crew:${key}`, runId: null, title: 'Conversación recuperada', description,
    }));
    store.write({ runs, events }, { insertOnly: true }).then(ok => {
      if (ok) try { localStorage.setItem(MIGRATION_KEY, 'true'); } catch {}
    });
  }

  function renderEvents(events) {
    if (!events.length) return '<p class="logbook-empty">Todavía no hay eventos registrados.</p>';
    return `<ol class="logbook-events">${events.map(event => `
      <li><small>${event.runId && Number.isFinite(event.elapsed) ? `T + ${simulationTime(event.elapsed)}` : escapeText(date(event.at))}</small>
      <strong>${escapeText(event.title)}</strong><p>${escapeText(event.description)}</p></li>`).join('')}</ol>`;
  }

  function renderDetail(id) {
    const run = shown.runs.find(item => item.id === id);
    if (!run) return;
    selectedId = id;
    const events = shown.events.filter(event => event.runId === id).sort((a,b) => (a.order ?? a.at ?? 0) - (b.order ?? b.at ?? 0));
    const equipment = Object.keys(run.equipment ?? {}).filter(key => run.equipment[key])
      .map(key => EQUIPMENT[key]?.name ?? (key === 'serial' ? 'Modo secuencial' : key));
    detail.hidden = false;
    detail.innerHTML = `
      <h3 tabindex="-1">${escapeText(run.title)}</h3>
      <p>${escapeText(TITLES[run.type])} · ${escapeText(STATUSES[run.status])}${run.stage ? ` · ${escapeText(run.stage)}` : ''}</p>
      ${run.note ? `<p>${escapeText(run.note)}</p>` : ''}
      <p>Inicio: ${escapeText(date(run.startedAt))}${run.endedAt ? ` · Cierre: ${escapeText(date(run.endedAt))}` : ''}</p>
      <dl class="logbook-metrics">
        <div><dt>Piloto</dt><dd>${escapeText(run.pilot ?? 'Sin registro')}</dd></div>
        <div><dt>Puntuación</dt><dd>${Number.isFinite(run.score) ? number.format(run.score) : '—'}${run.score != null ? ' / 100' : ''}</dd></div>
        ${Number.isFinite(run.elapsed) ? `<div><dt>Tiempo simulado</dt><dd>${simulationTime(run.elapsed)}</dd></div>` : ''}
        ${Object.entries(run.details ?? {}).map(([key,value]) => `<div><dt>${escapeText(key)}</dt><dd>${escapeText(value)}</dd></div>`).join('')}
        ${equipment.length ? `<div><dt>Equipamiento</dt><dd>${escapeText(equipment.join(', '))}</dd></div>` : ''}
      </dl>
      <h4>Registro de eventos</h4>${renderEvents(events)}`;
    detail.querySelector('h3').focus();
  }

  function renderList() {
    selectedId = null;
    detail.hidden = true;
    detail.replaceChildren();
    if (filter.value === 'activity') {
      const events = shown.events.filter(event => !event.runId).sort((a,b) => (b.at ?? 0) - (a.at ?? 0));
      content.innerHTML = renderEvents(events);
      return;
    }
    const runs = shown.runs.filter(run => filter.value === 'all' || run.type === filter.value)
      .sort((a,b) => (b.updatedAt ?? b.startedAt ?? 0) - (a.updatedAt ?? a.startedAt ?? 0));
    content.innerHTML = runs.length ? `<ul class="logbook-list">${runs.map(run => `
      <li><button type="button" data-run-id="${escapeText(run.id)}"><span><strong>${run.level ? `${escapeText(run.level)} · ` : ''}${escapeText(run.title)}</strong>
      <small>${escapeText(TITLES[run.type])} · ${escapeText(run.pilot ?? 'Sin piloto registrado')} · ${escapeText(date(run.startedAt))}</small></span>
      <span><b>${escapeText(STATUSES[run.status])}</b><small>${Number.isFinite(run.score) ? number.format(run.score) : '—'}${run.score != null ? ' / 100' : ''}</small></span></button></li>`).join('')}</ul>`
      : '<p class="logbook-empty">Aún no hay misiones en este historial. Despega en la campaña o planifica una expedición en el hangar.</p>';
  }

  async function refresh() {
    shown = await store.snapshot();
    status.textContent = shown.writeFailed ? 'El navegador no pudo guardar parte de la actividad. Puedes exportar los registros disponibles.'
      : `${shown.runs.length} registros de misión · ${shown.events.length} eventos · ${shown.mode}`;
    renderList();
  }

  function csvCell(value) {
    const text = String(value ?? '');
    const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
    return `"${safe.replaceAll('"', '""')}"`;
  }

  async function exportLog(format) {
    const data = await store.snapshot();
    if (format === 'json') {
      saveFile('AVI_HORIZONS_bitacora.json', JSON.stringify({ schemaVersion: 1, exportedAt: new Date().toISOString(), runs: data.runs, events: data.events }, null, 2), 'application/json');
      return;
    }
    const rows = [['ID', 'Modo', 'Nivel', 'Misión', 'Piloto', 'Estado', 'Fecha de inicio', 'Puntuación', 'Tiempo simulado (s)']];
    for (const run of data.runs) rows.push([
      run.id, TITLES[run.type], run.level, run.title, run.pilot, STATUSES[run.status], date(run.startedAt), run.score, run.elapsed,
    ]);
    saveFile('AVI_HORIZONS_misiones.csv', '\uFEFF' + rows.map(row => row.map(csvCell).join(';')).join('\r\n'), 'text/csv;charset=utf-8');
  }

  document.addEventListener('click', event => {
    if (!event.target.closest('[data-logbook]')) return;
    document.dispatchEvent(new Event('horizons:logbook'));
    status.textContent = 'Cargando registros…';
    openDialog('logbook-dialog');
    refresh();
  });
  filter.addEventListener('change', renderList);
  content.addEventListener('click', event => {
    const button = event.target.closest('[data-run-id]');
    if (!button) return;
    if (selectedId === button.dataset.runId) detail.querySelector('h3')?.focus();
    else renderDetail(button.dataset.runId);
  });
  dialog.querySelector('#logbook-json').addEventListener('click', () => exportLog('json'));
  dialog.querySelector('#logbook-csv').addEventListener('click', () => exportLog('csv'));
  importSavedRecords();

  return { activity, expedition, campaign, newId };
}

return {createLogbook};
})();
__AVI["campaign-model.mjs"] = (() => {

// Positions use the same fixed world coordinates on every screen size.
const WORLD = { width: 920, height: 470 };
const START = { x: 105, y: 236 };
const layouts = [
  [[244, 125], [455, 319], [730, 159]],
  [[225, 301], [479, 106], [752, 284]],
  [[267, 113], [541, 210], [743, 354]],
  [[260, 327], [522, 301], [707, 106]],
  [[230, 120], [465, 239], [718, 120]],
];

function createFlight(level, pilot) {
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

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function nearestStation(flight) {
  const reach = flight.pilot === 'AVI' && flight.elapsed < flight.abilityUntil ? 81 : 53;
  return flight.stations.find(station => !station.sampled && distance(flight, station) <= reach);
}

function advanceFlight(flight, dt, axis, chapter) {
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

function collectReading(flight) {
  const station = nearestStation(flight);
  if (!station) return null;
  station.sampled = true;
  flight.scans += 1;
  return station;
}

function scoreFlight(flight) {
  const score = Math.max(35, Math.round(100 - Math.min(38, flight.damage) - flight.incorrect * 9));
  return { score, stars: score >= 90 ? 3 : score >= 72 ? 2 : 1 };
}

return {WORLD,START,createFlight,distance,nearestStation,advanceFlight,collectReading,scoreFlight};
})();
__AVI["campaign.js"] = (() => {
const { STORY_CHAPTERS, STORY_EPILOGUE } = __AVI["story-data.mjs"];
const { ATLAS, IMAGES } = __AVI["atlas-data.js"];
const { CAMPAIGN, CHAPTERS } = __AVI["campaign-data.mjs"];
const { WORLD, createFlight, advanceFlight, nearestStation, collectReading, scoreFlight } = __AVI["campaign-model.mjs"];




const SAVE_KEY = 'avi-horizons.campaign.v1';
const PILOTS = {
  AVI: { portrait: 'avi-reference.png', ability: 'Pulso de exploración', hint: 'Amplía el alcance de escaneo durante 5 s.' },
  MAQUI: { portrait: 'maqui-reference.png', ability: 'Escudo de diagnóstico', hint: 'Protege la energía durante 5 s.' },
};
const MOVEMENT = {
  arrowleft: [-1, 0], a: [-1, 0], arrowright: [1, 0], d: [1, 0],
  arrowup: [0, -1], w: [0, -1], arrowdown: [0, 1], s: [0, 1],
};
const CREW_NAMES = { lyra: 'Lyra', nova: 'Nova', teo: 'Teo' };
const num = value => Math.round(value).toLocaleString('es-PE');

function loadCampaign() {
  const save = { best: {}, checkpoint: null };
  try {
    const stored = JSON.parse(localStorage.getItem(SAVE_KEY));
    for (const level of CAMPAIGN) {
      const score = stored?.best?.[level.id];
      if (Number.isInteger(score) && score >= 35 && score <= 100) save.best[level.id] = score;
    }
    const checkpoint = stored?.checkpoint;
    if (checkpoint && CAMPAIGN.some(level => level.id === checkpoint.id) && Object.hasOwn(PILOTS, checkpoint.pilot)) {
      if (typeof checkpoint.logState?.id !== 'string' || !checkpoint.logState.id.startsWith('campaign:')) {
        delete checkpoint.logState;
      }
      save.checkpoint = checkpoint;
    }
  } catch { /* A fresh campaign remains playable without storage. */ }
  return save;
}

function starsFor(score) {
  return score >= 90 ? '★★★' : score >= 72 ? '★★☆' : '★☆☆';
}

function createCampaign({ getPilot, setPilot, getReducedMotion, onStation, onMenu, openDialog, showTimeLab, playEffect, logbook }) {
  const root = document.querySelector('#campaign-screen');
  const content = root.querySelector('#campaign-content');
  const marker = root.querySelector('#campaign-location');
  const progress = root.querySelector('#campaign-progress');
  const save = loadCampaign();
  const keys = new Set();
  let chapter = 0;
  let selected = CAMPAIGN[0];
  let flight = null;
  let logState = null;
  let view = 'map';
  let active = false;
  let frame = null;
  let previousTime = 0;
  let transition = null;
  let cooldownUntil = 0;
  let refs = {};
  let storageAvailable = true;
  let lastTelemetry = {};

  function persist() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); }
    catch { storageAvailable = false; }
  }

  function checkpoint(event) {
    if (!flight || flight.analyzed) return;
    save.checkpoint = {
      id: selected.id, pilot: flight.pilot, x: flight.x, y: flight.y,
      logState,
      charge: flight.charge, damage: flight.damage, elapsed: flight.elapsed,
      incorrect: flight.incorrect, sampled: flight.stations.map(station => station.sampled),
    };
    persist();
    logbook.campaign(flight, selected, logState, null, event);
  }

  function stopFlight() {
    if (frame !== null) cancelAnimationFrame(frame);
    clearTimeout(transition);
    frame = null;
    transition = null;
    previousTime = 0;
    keys.clear();
  }

  function refreshHeader() {
    const count = Object.keys(save.best).length;
    progress.textContent = `${count} / 25 niveles`;
    root.querySelector('#campaign-pilot').textContent = getPilot();
    root.querySelector('#campaign-pilot-image').src = `assets/${PILOTS[getPilot()].portrait}`;
    marker.textContent = view === 'map' ? 'Atlas de misiones' : selected.title;
  }

  function setBackdrop() {
    const theme = CHAPTERS[chapter];
    root.style.setProperty('--sector', theme.accent);
    root.style.setProperty('--sector-art', `url("assets/campaign/${theme.art}.webp")`);
  }

  function moveToTop() {
    window.scrollTo(0, 0);
  }

  function renderMap(focus = true) {
    stopFlight();
    view = 'map';
    root.dataset.view = view;
    setBackdrop();
    refreshHeader();
    const mission = ATLAS[chapter];
    const theme = CHAPTERS[chapter];
    const levels = CAMPAIGN.filter(level => level.chapter === chapter);
    const completed = levels.filter(level => save.best[level.id]).length;
    const resumeLevel = save.checkpoint && CAMPAIGN.find(level => level.id === save.checkpoint.id);
    const next = CAMPAIGN.find(level => !save.best[level.id]) ?? selected;
    content.innerHTML = `
      <div class="sector-map">
        <nav class="sector-nav" aria-label="Misiones">
          ${CHAPTERS.map((item, index) => {
            const count = CAMPAIGN.filter(level => level.chapter === index && save.best[level.id]).length;
            return `<button class="sector-tab" data-chapter="${index}" aria-pressed="${index === chapter}">
              <img src="assets/campaign/${item.art}.webp" alt="">
              <span class="sector-tab-text"><small>${item.number} <i></i> ${count}/5</small><strong>${ATLAS[index].short}</strong></span>
            </button>`;
          }).join('')}
        </nav>
        <div class="sector-intro motion-in">
          <div class="sector-copy">
            <p class="sector-label">MISIÓN ${theme.number} <span></span> ${mission.zone}</p>
            <h1 id="campaign-view-title" tabindex="-1">${mission.title}</h1>
            <p class="story-campaign-line"><strong>Alex</strong> · ${STORY_CHAPTERS[chapter]}</p>
            ${Object.keys(save.best).length === CAMPAIGN.length ? `<p class="story-campaign-line">${STORY_EPILOGUE}</p>` : ''}
            <div class="sector-intro-actions">
              <button class="sector-button primary" data-action="brief" data-level-id="${next.id}">${Object.keys(save.best).length === 25 ? 'Volver a explorar' : Object.keys(save.best).length === 0 ? 'Iniciar primera misión' : 'Siguiente pendiente'} <span>→</span></button>
              ${resumeLevel ? `<button class="sector-button" data-action="resume">Retomar ${resumeLevel.id} <span>↗</span></button>` : ''}
            </div>
          </div>
          <div class="sector-medal"><b>${completed}<small>/5</small></b><span>NIVELES COMPLETADOS</span></div>
        </div>
        <div class="sector-levels" aria-label="Destinos de esta misión">
          ${levels.map(level => {
            const image = IMAGES[level.imageKey];
            const score = save.best[level.id];
            return `<button class="destination-card motion-in" style="--card-order:${level.index}" data-action="brief" data-level-id="${level.id}">
              <div class="destination-image"><img src="${image.image}" alt=""><span>${level.id}</span><span class="destination-arrow" aria-hidden="true">↗</span></div>
              <div class="destination-info"><span>${level.destination}</span><strong>${level.title}</strong>
              <small>${score ? `<b class="rating" aria-label="${starsFor(score).replaceAll('☆', '').length} estrellas">${starsFor(score)}</b> · ${score} pts` : 'Explorar destino'}</small></div>
            </button>`;
          }).join('')}
        </div>
        <footer class="sector-footer"><button data-action="station">← Explorar Connection Space</button><button data-atlas>Atlas científico ↗</button><span>${storageAvailable ? 'PROGRESO LOCAL' : 'ALMACENAMIENTO NO DISPONIBLE'}</span></footer>
      </div>`;
    if (focus) {
      moveToTop();
      content.querySelector('h1').focus({ preventScroll: true });
    }
  }

  function renderBrief() {
    stopFlight();
    view = 'brief';
    root.dataset.view = view;
    setBackdrop();
    refreshHeader();
    const image = IMAGES[selected.imageKey];
    const guide = CREW_NAMES[selected.guide];
    content.innerHTML = `
      <article class="mission-brief motion-in">
        <div class="brief-copy">
          <button class="sector-back" data-action="map">← Destinos</button>
          <p class="sector-label">NIVEL ${selected.id} <span></span> ${selected.destination}</p>
          <h1 id="campaign-view-title" tabindex="-1">${selected.title}</h1>
          <p class="brief-lead">${selected.objective}</p>
          <ol class="brief-checklist"><li>Navega a las tres balizas.</li><li>Escanea y reúne las lecturas.</li><li>Envía una conclusión basada en los datos.</li></ol>
          <div class="guide-message"><img src="assets/${selected.guide}.webp" alt=""><div><button class="sector-back" data-crew="${selected.guide}"><strong>${guide} ↗</strong></button><p>Usa el piloto automático en una baliza o toma el control manual. Las zonas marcadas consumen energía de la nave.</p></div></div>
          <div class="brief-actions"><button class="sector-button primary" data-action="launch" data-level-id="${selected.id}">Despegar <span>→</span></button>
          ${selected.id === '1.3' ? '<button class="sector-button" data-action="station">Expedición detallada de Marte ↗</button>' : ''}</div>
        </div>
        <figure class="brief-image"><img src="${image.image}" alt="${image.caption}"><figcaption>${image.label} · ${image.credit}${image.source.startsWith('#') ? '' : ` <a href="${image.source}" target="_blank" rel="noopener noreferrer">Fuente ↗</a>`}</figcaption></figure>
      </article>`;
    moveToTop();
    content.querySelector('.sector-back').focus({ preventScroll: true });
  }

  function selectLevel(id) {
    const level = CAMPAIGN.find(item => item.id === id);
    if (!level) return false;
    selected = level;
    chapter = level.chapter;
    return true;
  }

  function restoreFlight(level, stored) {
    const restored = createFlight(level, stored.pilot);
    restored.x = Math.min(WORLD.width - 28, Math.max(28, Number(stored.x) || restored.x));
    restored.y = Math.min(WORLD.height - 28, Math.max(28, Number(stored.y) || restored.y));
    restored.elapsed = Number.isFinite(stored.elapsed) ? Math.max(0, stored.elapsed) : 0;
    restored.charge = Number.isFinite(stored.charge) ? Math.max(1, Math.min(100, stored.charge)) : 100;
    restored.damage = Number.isFinite(stored.damage) ? Math.max(0, stored.damage) : 0;
    restored.incorrect = Number.isInteger(stored.incorrect) ? Math.max(0, stored.incorrect) : 0;
    restored.stations.forEach((station, index) => { station.sampled = stored.sampled?.[index] === true; });
    restored.scans = restored.stations.filter(station => station.sampled).length;
    return restored;
  }

  function start(id, resume = false) {
    if (!selectLevel(id)) return;
    stopFlight();
    const previous = save.checkpoint;
    const stored = resume ? previous : null;
    if (previous && !resume && previous.logState) {
      const priorLevel = CAMPAIGN.find(level => level.id === previous.id);
      const previousFlight = restoreFlight(priorLevel, previous);
      const note = 'Se inició otro vuelo de campaña.';
      logbook.campaign(previousFlight, priorLevel, previous.logState, { status: 'ended', note }, {
        title: 'Vuelo cerrado', description: note,
      });
    }
    if (stored && stored.pilot !== getPilot()) setPilot(stored.pilot);
    flight = stored ? restoreFlight(selected, stored) : createFlight(selected, getPilot());
    logState = stored?.logState ?? { id: logbook.newId('campaign'), startedAt: stored ? null : Date.now() };
    cooldownUntil = 0;
    checkpoint({
      title: resume ? 'Vuelo retomado' : 'Despegue',
      description: resume ? 'Continuaste desde tu último punto guardado.' : selected.destination,
    });
    setBackdrop();
    if (!resume) playEffect('launch');
    if (getReducedMotion() || resume) {
      renderFlight();
      return;
    }
    view = 'jump';
    root.dataset.view = view;
    refreshHeader();
    content.innerHTML = `<div class="jump-sequence" role="status"><div class="jump-rings" aria-hidden="true"><i></i><i></i><i></i></div><p>HORIZONS 2 · EN RUTA</p><strong>${selected.destination}</strong></div>`;
    transition = setTimeout(renderFlight, 730);
  }

  function worldStyle(point) {
    return `--x:${point.x / WORLD.width * 100}%;--y:${point.y / WORLD.height * 100}%`;
  }

  function renderFlight() {
    transition = null;
    view = 'flight';
    root.dataset.view = view;
    refreshHeader();
    const image = IMAGES[selected.imageKey];
    const pilot = PILOTS[getPilot()];
    content.innerHTML = `
      <div class="flight-layout motion-in">
        <section class="flight-main" aria-label="Navegación">
          <div class="flight-topline"><div><p class="sector-label">NIVEL ${selected.id} <span></span> ${selected.destination}</p><h1 id="campaign-view-title" tabindex="-1">${selected.title}</h1></div><button class="sector-button small" data-action="pause">Pausa <kbd>Esc</kbd></button></div>
          <div id="flight-world" class="flight-world" tabindex="0" aria-label="Área de vuelo. Usa las flechas o WASD. Pulsa E para escanear y Q para activar la habilidad. Puedes seleccionar una baliza para navegar automáticamente.">
            <div class="flight-world-art" aria-hidden="true"></div>
            <div class="flight-grid" aria-hidden="true"></div>
            <span class="world-caption">HORIZONS 2 <i></i> NAVEGACIÓN LOCAL</span>
            <span class="world-north" aria-hidden="true">✦</span>
            ${flight.hazards.map(hazard => `<span class="interference" style="${worldStyle(hazard)};--size:${hazard.radius * 2 / WORLD.width * 100}%" aria-hidden="true"></span>`).join('')}
            ${flight.stations.map((station, index) => `<button class="flight-beacon" style="${worldStyle(station)}" data-action="navigate" data-beacon="${index}" aria-label="Ir a baliza ${index + 1}, ${station.name}"><i></i><b>${index + 1}</b><small>${station.name}</small></button>`).join('')}
            <div id="flight-ship" class="flight-ship" aria-hidden="true"><div class="flight-shield"></div><img class="flight-craft fleet-flight-craft" src="assets/horizons-2.webp" alt=""><div class="flight-thruster"></div></div>
            <div class="world-legend"><span><i></i> Baliza</span><span><i></i> Interferencia</span></div>
          </div>
          <div class="flight-controls">
            <div class="direction-pad" aria-label="Controles táctiles de dirección">
              <button data-move="arrowleft" aria-label="Izquierda">←</button><button data-move="arrowup" aria-label="Arriba">↑</button><button data-move="arrowdown" aria-label="Abajo">↓</button><button data-move="arrowright" aria-label="Derecha">→</button>
            </div>
            <div class="flight-actions">
              <button id="flight-ability" class="sector-button small" data-action="ability" title="${pilot.hint}">${pilot.ability} <kbd>Q</kbd></button>
              <button id="flight-scan" class="sector-button small primary" data-action="scan">Escanear <kbd>E</kbd></button>
            </div>
          </div>
          <p class="flight-hint" id="flight-hint" role="status">Selecciona una baliza para viajar y escanear automáticamente.</p>
        </section>
        <aside class="flight-console" aria-label="Telemetría">
          <figure class="console-image"><img src="${image.image}" alt="${image.caption}"><figcaption>${image.label}</figcaption></figure>
          <div class="console-body">
            <p class="sector-label">TELEMETRÍA DE NAVE</p>
            <div class="console-meter"><span>Energía</span><b id="flight-energy">100%</b><i><b id="flight-energy-bar"></b></i></div>
            <div class="console-reading"><span>Lecturas</span><b id="flight-readings">0 / 3</b></div>
            <div class="console-reading"><span>Tiempo de vuelo</span><b id="flight-clock">00:00</b></div>
            <div class="console-log" id="flight-log" aria-live="polite"></div>
            <button class="sector-button primary" data-action="analyze" id="flight-analyze" disabled>Analizar lecturas <span>→</span></button>
          </div>
        </aside>
      </div>`;
    refs = {
      world: content.querySelector('#flight-world'),
      ship: content.querySelector('#flight-ship'),
      energy: content.querySelector('#flight-energy'),
      energyBar: content.querySelector('#flight-energy-bar'),
      clock: content.querySelector('#flight-clock'),
      scan: content.querySelector('#flight-scan'),
      ability: content.querySelector('#flight-ability'),
      readings: content.querySelector('#flight-readings'),
      analyze: content.querySelector('#flight-analyze'),
      hint: content.querySelector('#flight-hint'),
      log: content.querySelector('#flight-log'),
      beacons: [...content.querySelectorAll('[data-beacon]')],
    };
    lastTelemetry = {};
    updateReadings();
    paintFlight(false, false);
    moveToTop();
    refs.world.focus({ preventScroll: true });
    frame = requestAnimationFrame(tick);
  }

  function updateReadings() {
    refs.readings.textContent = `${flight.scans} / 3`;
    refs.analyze.disabled = flight.scans !== flight.stations.length;
    refs.beacons.forEach((button, index) => {
      const station = flight.stations[index];
      button.classList.toggle('sampled', station.sampled);
      button.setAttribute('aria-label', `${station.sampled ? 'Baliza registrada' : 'Ir a baliza'} ${index + 1}, ${station.name}`);
      button.querySelector('b').textContent = station.sampled ? '✓' : index + 1;
    });
    const list = flight.stations.filter(station => station.sampled);
    refs.log.innerHTML = list.length
      ? list.map(station => `<div class="reading-entry"><strong>${station.name}</strong><p>${station.reading}</p></div>`).join('')
      : '<p>Al llegar a una baliza, la lectura aparecerá aquí.</p>';
  }

  function paintFlight(danger, moving) {
    refs.ship.style.cssText = `${worldStyle(flight)};--heading:${flight.heading}rad`;
    refs.ship.classList.toggle('thrust', moving);
    refs.ship.classList.toggle('ability', flight.elapsed < flight.abilityUntil);
    refs.world.classList.toggle('danger', danger);
    const energy = num(flight.charge);
    if (energy !== lastTelemetry.energy) {
      refs.energy.textContent = `${energy}%`;
      refs.energyBar.style.width = `${flight.charge}%`;
      lastTelemetry.energy = energy;
    }
    const seconds = Math.floor(flight.elapsed);
    if (seconds !== lastTelemetry.seconds) {
      refs.clock.textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
      lastTelemetry.seconds = seconds;
    }
    refs.scan.disabled = !nearestStation(flight);
    refs.ability.disabled = flight.elapsed < cooldownUntil;
  }

  function scan() {
    const station = collectReading(flight);
    if (!station) return;
    updateReadings();
    checkpoint({ title: station.name, description: station.reading });
    playEffect('scan');
    refs.hint.textContent = flight.scans === 3 ? 'Tres lecturas registradas. Abre el análisis.' : `Lectura registrada: ${station.name}.`;
  }

  function tick(now) {
    if (!active || view !== 'flight') return;
    const dt = previousTime ? (now - previousTime) / 1000 : 0;
    previousTime = now;
    if (!document.hidden && !document.querySelector('dialog[open]')) {
      const axis = { x: 0, y: 0 };
      for (const key of keys) {
        axis.x += MOVEMENT[key][0];
        axis.y += MOVEMENT[key][1];
      }
      if (axis.x || axis.y) flight.target = null;
      if (flight.target !== null) {
        const destination = flight.stations[flight.target];
        const dx = destination.x - flight.x;
        const dy = destination.y - flight.y;
        if (Math.hypot(dx, dy) < 20) {
          flight.target = null;
          if (!destination.sampled) scan();
        } else {
          axis.x = dx;
          axis.y = dy;
          axis.distance = Math.hypot(dx, dy);
        }
      }
      const danger = advanceFlight(flight, dt, axis, chapter);
      paintFlight(danger, Boolean(axis.x || axis.y));
    } else {
      keys.clear();
    }
    frame = requestAnimationFrame(tick);
  }

  function useAbility() {
    if (flight.elapsed < cooldownUntil) return;
    flight.abilityUntil = flight.elapsed + 5;
    cooldownUntil = flight.elapsed + 10;
    refs.hint.textContent = PILOTS[getPilot()].hint;
    checkpoint({ title: PILOTS[getPilot()].ability, description: PILOTS[getPilot()].hint });
    playEffect('scan');
  }

  function showAnalysis() {
    if (flight.scans !== 3) return;
    stopFlight();
    checkpoint();
    view = 'analysis';
    root.dataset.view = view;
    refreshHeader();
    const experiment = { '3.5': 'speed', '4.3': 'gravity' }[selected.id];
    content.innerHTML = `
      <article class="analysis-panel motion-in">
        <div class="analysis-header"><p class="sector-label">NIVEL ${selected.id} <span></span> CONCLUSIÓN CIENTÍFICA</p><h1 id="campaign-view-title" tabindex="-1">${selected.title}</h1></div>
        <div class="analysis-readings">${flight.stations.map((station, index) => `<div><span>${index + 1}</span><strong>${station.name}</strong><p>${station.reading}</p></div>`).join('')}</div>
        ${experiment ? `<button class="sector-button small" data-action="experiment" data-experiment="${experiment}">Abrir laboratorio temporal →</button>` : ''}
        <h2>${selected.question}</h2>
        <div class="analysis-answers">${selected.choices.map((choice, index) => `<button data-action="answer" data-choice="${index}"><b>${String.fromCharCode(65 + index)}</b><span>${choice}</span></button>`).join('')}</div>
        <p class="analysis-feedback" id="analysis-feedback" role="status"></p>
        <button class="sector-back" data-action="map">← Guardar y volver al mapa</button>
      </article>`;
    moveToTop();
    content.querySelector('.analysis-answers button').focus({ preventScroll: true });
  }

  function answer(button) {
    if (view !== 'analysis' || flight.analyzed) return;
    if (Number(button.dataset.choice) !== selected.answer) {
      flight.incorrect += 1;
      button.disabled = true;
      button.classList.add('answer-retry');
      content.querySelector('#analysis-feedback').textContent = 'Revisa las lecturas registradas y vuelve a intentarlo.';
      content.querySelector('.analysis-answers button:not(:disabled)')?.focus({ preventScroll: true });
      checkpoint({ title: 'Respuesta revisada', description: selected.choices[Number(button.dataset.choice)] });
      return;
    }
    flight.analyzed = true;
    const { score } = scoreFlight(flight);
    save.best[selected.id] = Math.max(score, save.best[selected.id] ?? 0);
    save.checkpoint = null;
    persist();
    logbook.campaign(flight, selected, logState, { score }, {
      title: 'Observación confirmada', description: selected.explanation,
    });
    playEffect('success');
    showResult(score);
  }

  function showResult(score) {
    view = 'result';
    root.dataset.view = view;
    refreshHeader();
    const count = Object.keys(save.best).length;
    const next = CAMPAIGN[CAMPAIGN.indexOf(selected) + 1];
    const title = count === 25 ? 'Campaña completada' : 'Observación confirmada';
    const missionComplete = CAMPAIGN.filter(level => level.chapter === chapter).every(level => save.best[level.id]);
    content.innerHTML = `
      <article class="result-panel motion-in">
        <div class="result-stars" aria-label="${starsFor(score).replaceAll('☆', '').length} estrellas">${starsFor(score)}</div>
        <p class="sector-label">NIVEL ${selected.id} <span></span> ${selected.title}</p>
        <h1 id="campaign-view-title" tabindex="-1">${title}</h1>
        <p>${selected.explanation}</p>
        ${count === 25 ? `<p class="result-epilogue">${STORY_EPILOGUE}</p>` : missionComplete ? `<p class="result-epilogue">${ATLAS[chapter].title} · Misión completada</p>` : ''}
        <div class="result-stats"><div><span>Puntuación</span><b>${score}</b></div><div><span>Récord del nivel</span><b>${save.best[selected.id]}</b></div><div><span>Campaña</span><b>${count}/25</b></div></div>
        <div class="result-actions">${next ? `<button class="sector-button primary" data-action="brief" data-level-id="${next.id}">Siguiente destino <span>→</span></button>` : ''}
          <button class="sector-button ${next ? '' : 'primary'}" data-action="map">Mapa de misiones <span>↗</span></button><button class="sector-button" data-action="launch" data-level-id="${selected.id}">Repetir nivel</button><button class="sector-button" data-logbook>Ver bitácora</button></div>
        <small>${storageAvailable ? 'Resultado guardado en este navegador.' : 'El navegador no permitió guardar este resultado.'}</small>
      </article>`;
    moveToTop();
    content.querySelector('.result-actions button').focus({ preventScroll: true });
  }

  function pause() {
    if (view !== 'flight') return;
    keys.clear();
    checkpoint();
    openDialog('campaign-pause');
  }

  function leave(callback) {
    checkpoint();
    stopFlight();
    root.hidden = true;
    active = false;
    flight = null;
    callback();
  }

  function open(id) {
    active = true;
    root.hidden = false;
    if (id && selectLevel(id)) renderBrief();
    else renderMap();
  }

  root.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.dataset.chapter !== undefined) {
      chapter = Number(button.dataset.chapter);
      renderMap(false);
      content.querySelector(`[data-chapter="${chapter}"]`).focus({ preventScroll: true });
      return;
    }
    switch (button.dataset.action) {
      case 'menu': leave(onMenu); break;
      case 'station': leave(onStation); break;
      case 'map': checkpoint(); flight = null; renderMap(); break;
      case 'brief': if (selectLevel(button.dataset.levelId)) renderBrief(); break;
      case 'launch': start(button.dataset.levelId); break;
      case 'resume': if (save.checkpoint) start(save.checkpoint.id, true); break;
      case 'navigate':
        flight.target = Number(button.dataset.beacon);
        refs.hint.textContent = `En ruta a ${flight.stations[flight.target].name}.`;
        refs.world.focus({ preventScroll: true });
        break;
      case 'scan': scan(); break;
      case 'ability': useAbility(); break;
      case 'analyze': showAnalysis(); break;
      case 'answer': answer(button); break;
      case 'pause': pause(); break;
      case 'experiment': showTimeLab(button.dataset.experiment); break;
    }
  });

  root.addEventListener('pointerdown', event => {
    const button = event.target.closest('[data-move]');
    if (!button) return;
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    keys.add(button.dataset.move);
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    root.addEventListener(type, event => {
      const button = event.target.closest('[data-move]');
      if (button) keys.delete(button.dataset.move);
    });
  }
  window.addEventListener('keydown', event => {
    if (!active || view !== 'flight' || document.querySelector('dialog[open]') || event.altKey || event.ctrlKey || event.metaKey) return;
    const key = event.key.toLowerCase();
    if (Object.hasOwn(MOVEMENT, key)) {
      event.preventDefault();
      keys.add(key);
    } else if (!event.repeat && ['e', 'q', 'escape'].includes(key)) {
      event.preventDefault();
      if (key === 'e') scan();
      if (key === 'q') useAbility();
      if (key === 'escape') pause();
    }
  });
  window.addEventListener('keyup', event => keys.delete(event.key.toLowerCase()));
  window.addEventListener('blur', () => keys.clear());
  window.addEventListener('pagehide', () => checkpoint());
  document.addEventListener('horizons:logbook', () => checkpoint());
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { keys.clear(); checkpoint(); }
  });
  document.querySelector('#campaign-save-map').addEventListener('click', () => {
    document.querySelector('#campaign-pause').close();
    checkpoint();
    flight = null;
    renderMap();
  });

  document.querySelector('#campaign-flight-settings').addEventListener('click', () => {
    openDialog('settings-dialog');
  });

  document.querySelector('#campaign-resume-flight').addEventListener('click', () => {
    document.querySelector('#campaign-pause').close();
    refs.world.focus({ preventScroll: true });
  });

  return { open, leave, isActive: () => active };
}

return {createCampaign};
})();
__AVI["horizons.js"] = (() => {
const { ATLAS, IMAGES } = __AVI["atlas-data.js"];

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const CREW={
lyra:{name:'LYRA',role:'Comandante · Centro de control',image:'assets/lyra.webp',intro:'Bienvenido a bordo, {pilot}. Un horizonte no se cruza en soledad. Nuestra primera tarea es escuchar lo que Marte todavía tiene que contarnos.',topics:[
['¿Por qué se llama Ecos de Marte?','Faro 7 es una estación abandonada en nuestra historia. Recibimos un fragmento de su antiguo archivo: «…todavía podemos». Antes de imaginar respuestas, reuniremos imágenes y mediciones.','Faro 7: investigar antes de interpretar.'],
['¿Cuál será mi responsabilidad?','Tú eliges los instrumentos, verificas la salida y decides cómo resolver una avería. En Marte, recolecta datos y transmítelos. Volver con información confirmada importa más que acumular muestras sin energía para enviarlas.','Lyra: reservar energía para transmitir los datos.'],
['Quiero conocer los cinco horizontes.','Partiremos de nuestro sistema solar, conoceremos otras estrellas, saldremos de la Vía Láctea, estudiaremos entornos extremos y exploraremos grandes estructuras. Puedes elegir cualquiera de esos destinos desde el mapa y aportar sus lecturas a la bitácora.','Campaña: cinco misiones conectadas por el Atlas.']]},
teo:{name:'TEO',role:'Ingeniero · Hangar',image:'assets/teo.webp',intro:'¡{pilot}! La nave está entera y podemos mantenerla así. Revisemos juntos qué vas a llevar.',topics:[
['Ayúdame a preparar HORIZONS 2.','La cámara registra el paisaje y el espectrómetro ayuda a estudiar materiales. Ambos consumen recursos. Activa la programación por turnos si el pico de potencia es demasiado alto; luego registra la preparación en el hangar.','Teo: programar instrumentos por turnos reduce el pico de potencia.'],
['¿Reparar o aislar una avería?','Reparar recupera el sistema con un coste de tiempo y recursos. Aislar contiene el problema y puede limitar alguna capacidad. Consulta los valores que muestra cada decisión: ninguna opción es siempre la mejor.','Teo: comparar recursos y consecuencias antes de actuar.'],
['¿Qué te hace seguir explorando?','Una vez construí una radio que solo recibía ruido. Nova me enseñó a medirlo y encontramos una conexión suelta. Desde entonces anoto lo que falla: a veces el descubrimiento empieza con un cable que no miraste.','Historia de Teo: el ruido también puede revelar un fallo.']]},
nova:{name:'NOVA',role:'Astrofísica · Observatorio',image:'assets/nova.webp',intro:'Hola, {pilot}. Cada punto de luz tiene una historia, pero también una incertidumbre. Te ayudaré a distinguir lo que observamos de lo que imaginamos.',topics:[
['¿Retraso de señal y dilatación son lo mismo?','No. Una señal tarda en recorrer la distancia: t = d/c. La dilatación temporal compara cuánto tiempo acumulan relojes en distintas condiciones de movimiento o gravedad. Alejarse por sí solo no explica una diferencia entre relojes. Prueba los modelos del laboratorio temporal.','Nova: separar latencia de comunicación y tiempo propio.'],
['¿Qué sabemos de las señales infrarrojas?','En RX J0806.4−4123 se estudió emisión infrarroja extendida. Un disco de polvo o un entorno asociado al viento del púlsar son interpretaciones propuestas. Una señal inusual no demuestra que exista una civilización.','Nova: una hipótesis necesita pruebas que la distingan de otras.'],
['¿Cómo viajaremos tan lejos?','Los saltos entre regiones lejanas pertenecen a la ficción del juego. Los experimentos de relatividad tienen supuestos explícitos. Mantendremos esa separación para explorar sin presentar una tecnología imaginaria como si existiera.','Nova: distinguir recursos narrativos de modelos físicos.']]}
};
function connectHorizons({openDialog,getPilot,startGame,logbook}){
let journal={},current='lyra',missionIndex=0;
try{const s=JSON.parse(localStorage.getItem('avi-horizons.crew.v1')||'{}');if(s&&typeof s==='object'&&!Array.isArray(s))journal=s;}catch{}
const companion=()=>getPilot()==='AVI'?{name:'MAQUI',role:'Tu compañero · Diagnóstico',image:'assets/maqui-reference.png',intro:'Voy contigo, AVI. Tú observas el horizonte y yo reviso que podamos alcanzarlo.',topics:[['¿Qué revisamos primero?','Primero los sistemas; después, los datos. Si algo parece extraño, comparemos dos mediciones antes de decidir.','Maqui: comprobar una anomalía con más de una medición.'],['¿Qué te gustaría encontrar?','Un lugar donde sentarnos a mirar estrellas después de terminar el informe. Pero primero, ¡la transmisión!','Maqui quiere compartir el horizonte después de la misión.']]}:{name:'AVI',role:'Tu compañera · Exploración',image:'assets/avi-reference.png',intro:'Aquí estoy, MAQUI. Tú mantén atentos los sistemas; yo buscaré los detalles que se nos escapan.',topics:[['¿Cómo buscamos pistas?','Revisemos cada punto de interés y usemos los instrumentos adecuados. Una imagen nos da contexto; una medición puede cambiar nuestra interpretación.','AVI: combinar observación y mediciones.'],['¿Por qué quieres explorar?','Porque cada respuesta abre una pregunta nueva. Y porque un descubrimiento se vuelve más valioso cuando podemos compartirlo.','AVI explora para comprender y compartir.']]};
function contact(id,answer=null){
current=id in CREW||id==='partner'?id:'lyra';const c=current==='partner'?companion():CREW[current];const prefix=current==='partner'?c.name:current;
if(answer!==null){logbook.activity(`Conversación con ${c.name}`, c.topics[answer][2], getPilot());journal[`${prefix}:${answer}`]=c.topics[answer][2];try{localStorage.setItem('avi-horizons.crew.v1',JSON.stringify(journal));}catch{}}
$('#crew-content').innerHTML=`<nav class="crew-tabs" aria-label="Contactos">${Object.entries(CREW).map(([id,c])=>`<button data-contact="${id}" aria-pressed="${current===id}">${c.name}</button>`).join('')}<button data-contact="partner" aria-pressed="${current==='partner'}">${companion().name}</button></nav><div class="conversation-layout"><figure class="crew-portrait"><img src="${c.image}" alt="Retrato de ${c.name}"><figcaption>CONNECTION SPACE · TRIPULACIÓN</figcaption></figure><section class="conversation"><p class="eyebrow">${c.role}</p><h2 id="crew-title">${c.name}<span class="contact-live">● EN LÍNEA</span></h2><div class="speech" role="status">${answer===null?esc(c.intro.replace('{pilot}',getPilot())):`<p class="your-answer">${getPilot()}: ${esc(c.topics[answer][0])}</p>${esc(c.topics[answer][1])}`}</div><p class="conversation-prompt">${answer===null?'ELIGE QUÉ PREGUNTAR':'ANOTACIÓN GUARDADA EN TU BITÁCORA'}</p><div class="dialogue-choices">${c.topics.map(([q],i)=>`<button data-answer="${i}"><span>${String(i+1).padStart(2,'0')} · ${esc(q)}</span><span>${journal[`${prefix}:${i}`]?'✓':'→'}</span></button>`).join('')}</div></section></div><details class="crew-journal"><summary>Bitácora de conversaciones · ${Object.keys(journal).length} notas</summary>${Object.keys(journal).length?`<ul>${Object.values(journal).filter(v=>typeof v==='string').map(v=>`<li>${esc(v)}</li>`).join('')}</ul>`:'<p>Habla con la tripulación para reunir consejos e historias.</p>'}</details>`;
$('#crew-content').querySelectorAll('[data-contact]').forEach(b=>b.onclick=()=>contact(b.dataset.contact));$('#crew-content').querySelectorAll('[data-answer]').forEach(b=>b.onclick=()=>contact(current,Number(b.dataset.answer)));
const wasOpen=$('#crew-dialog').open;openDialog('crew-dialog');if(wasOpen)$(answer===null?`[data-contact="${current}"]`:`[data-answer="${answer}"]`).focus({preventScroll:true});
}
function figure(key){const a=IMAGES[key];return `<figure class="astro-figure"><img src="${a.image}" alt="${esc(a.caption)}"><figcaption><strong>${esc(a.label)}</strong><span>${esc(a.caption)}</span>${a.source.startsWith('#')?`<span>${esc(a.credit)}</span>`:`<a href="${a.source}" target="_blank" rel="noopener noreferrer">${esc(a.credit)} · Fuente →</a>`}</figcaption></figure>`;}
function atlas(mi=missionIndex,li=0){missionIndex=mi;const m=ATLAS[mi],l=m.levels[li];
$('#atlas-missions').innerHTML=ATLAS.map((m,i)=>`<button data-mission="${i}" aria-pressed="${i===mi}"><small>0${i+1}</small>${m.short}</button>`).join('');
$('#atlas-content').innerHTML=`<div class="atlas-heading"><span class="eyebrow">MISIÓN 0${mi+1} / ${m.zone}</span><h3>${m.title}</h3><p>${m.story}</p></div><div class="atlas-levels" aria-label="Niveles de esta misión">${m.levels.map((l,i)=>`<button data-level="${i}" aria-pressed="${i===li}"><span>${mi+1}.${i+1}</span>${l.name}<small>JUGAR</small></button>`).join('')}</div><article class="atlas-detail"><div class="atlas-gallery">${l.images.map(figure).join('')}</div><div class="atlas-brief"><p class="eyebrow">NIVEL ${mi+1}.${li+1}</p><h3>${l.name}</h3><p>${l.description}</p><h4>EL RETO</h4><p>${l.challenge}</p><h4>LO QUE APRENDERÁS</h4><p>${l.science}</p><button class="primary-action compact" id="atlas-play"><span>JUGAR ESTE NIVEL →</span></button><button class="text-action" data-crew="${mi===0?'lyra':'nova'}">Consultar a ${mi===0?'Lyra':'Nova'} →</button></div></article><p class="panel-footnote">Observaciones, composiciones e ilustraciones identificadas en cada ficha. Los saltos interestelares e intergalácticos son un recurso narrativo, no tecnología disponible. Las distancias no están representadas a escala.</p>`;
$('#atlas-missions').querySelectorAll('button').forEach(b=>b.onclick=()=>atlas(Number(b.dataset.mission)));$('#atlas-content').querySelectorAll('[data-level]').forEach(b=>b.onclick=()=>atlas(mi,Number(b.dataset.level)));if($('#atlas-play'))$('#atlas-play').onclick=()=>{$('#atlas-dialog').close();startGame(`${mi+1}.${li+1}`);};const wasOpen=$('#atlas-dialog').open;openDialog('atlas-dialog');if(wasOpen)$(`[data-level="${li}"]`).focus({preventScroll:true});
}
document.addEventListener('click',e=>{const c=e.target.closest('[data-crew]'),a=e.target.closest('[data-atlas]');if(c)contact(c.dataset.crew);if(a)atlas();});
document.addEventListener('horizons:room',e=>{const id={hangar:'teo',control:'lyra',laboratory:'nova',observatory:'nova'}[e.detail.room];if(!id)return;const c=CREW[id];$('#hub-room-content').insertAdjacentHTML('afterbegin',`<button class="room-contact" data-crew="${id}"><img src="${c.image}" alt="${c.name}"><span><strong>${c.name} ESTÁ AQUÍ</strong><small>${c.role} · Conversar →</small></span></button>`);});
const stages={plan:['hero','Tu siguiente horizonte','lyra'],launch:['hero','La tripulación está lista','teo'],flight:['earth','Un hogar cada vez más lejano','nova'],incident:['hero','Nadie resuelve lo desconocido a solas','teo'],debrief:['hero','Cada decisión deja una lección','lyra'],arrival:['mars','El planeta rojo, al fin','nova'],landing:['surface','Busca un lugar para empezar','teo'],surface:['surface','Ecos bajo el polvo marciano','nova'],report:['surface','Lo que descubrimos juntos','lyra']};
document.addEventListener('horizons:stage',e=>{const[key,title,id]=stages[e.detail.stage]||stages.plan,a=IMAGES[key];$('#expedition-content').insertAdjacentHTML('afterbegin',`<div class="mission-scene-card"><img class="scene-landscape" src="${a.image}" alt="${esc(a.caption)}"><div><span class="eyebrow">ECOS DE MARTE / BITÁCORA VISUAL</span><strong>${title}</strong><small>${esc(a.label)}</small></div><button data-crew="${id}"><img src="${CREW[id].image}" alt=""><span>Hablar con ${CREW[id].name} →</span></button></div>`);});
}

return {connectHorizons};
})();
__AVI["fleet.js"] = (() => {

const FLEET = {
  carrier: { name: 'HORIZONS 1', role: 'Nave nodriza', image: 'assets/horizons-1.webp', note: 'Sostiene el viaje interplanetario y el enlace orbital.' },
  shuttle: { name: 'HORIZONS 2', role: 'Explorador de superficie', image: 'assets/horizons-2.webp', note: 'Desciende con los instrumentos para investigar Faro 7.' },
};

function shipImage(key, className = '') {
  const ship = FLEET[key];
  return `<img class="${className}" src="${ship.image}" alt="${ship.name}">`;
}

function fleetCards() {
  return `<div class="fleet-cards">${Object.entries(FLEET).map(([key, ship]) =>
    `<article class="fleet-card fleet-${key}">${shipImage(key)}<div><strong>${ship.name}</strong><span>${ship.role}</span><p>${ship.note}</p></div></article>`
  ).join('')}</div>`;
}

return {FLEET,shipImage,fleetCards};
})();
__AVI["hub.js"] = (() => {
const { fleetCards } = __AVI["fleet.js"];
const { LEVELS, LIFT_X, ROOMS, routeTo, nearestInteraction, EQUIPMENT, LIMITS, normalizeLoadout, evaluateLoadout } = __AVI["hub-model.mjs"];


const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const saveKey = 'avi-horizons.hub.v1';

/** The hub owns navigation and workshop state; the menu owns identity and preferences. */
function createHub({ getPilot, getReducedMotion, openDialog, onExit, onPlan, onTimeLab, logbook }) {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(saveKey) || '{}') || {}; } catch {}
  let config = normalizeLoadout(saved.config || { camera: true });
  const visited = new Set(Array.isArray(saved.visited) ? saved.visited.filter(id => id in ROOMS) : []);
  let prepared = saved.prepared === true && evaluateLoadout(config).valid;
  let briefingRead = saved.briefingRead === true;
  let position = {
    x: typeof saved.x === 'number' && Number.isFinite(saved.x) ? Math.max(.055, Math.min(.945, saved.x)) : .525,
    floor: saved.floor in LEVELS ? saved.floor : 'lower',
  };
  let visualY = LEVELS[position.floor];
  let active = false, route = [], arrival = null, riding = false, moving = false;
  let lastTime = 0, frame = null, facing = 1, lastNear = undefined, skillTimer, pulseTimer;
  let signalDistance = 8;
  const keys = new Set();
  const screen = $('#hub-screen'), world = $('#hub-world'), player = $('#hub-player');
  const viewport = $('#hub-viewport'), roomDialog = $('#hub-room-dialog');
  const announce = message => { $('#hub-announcement').textContent = message; };

  function persist() {
    try { localStorage.setItem(saveKey, JSON.stringify({ config, visited: [...visited], prepared, briefingRead, x: position.x, floor: position.floor })); } catch {}
  }
  function clearKeys() { keys.clear(); }
  function stopRoute() { route = []; arrival = null; $('#hub-journey').hidden = true; }
  function cameraFollow() {
    if (viewport.clientWidth >= world.clientWidth) return;
    viewport.scrollLeft = Math.max(0, position.x * world.clientWidth - viewport.clientWidth / 2);
  }
  function renderPosition() {
    player.style.left = `${position.x * 100}%`;
    player.style.top = `${visualY * 100}%`;
    player.style.setProperty('--facing', facing);
    player.classList.toggle('moving', moving && !riding);
    player.setAttribute('aria-label', riding ? `${getPilot()} en el ascensor` : `${getPilot()} en ${position.floor === 'lower' ? 'el nivel 01' : 'el nivel 02'} de CONNECTION SPACE`);
    $('#lift-cabin').style.bottom = `${Math.max(0, (LEVELS.lower - visualY) / (LEVELS.lower - LEVELS.upper) * 49)}%`;
    $('#hub-floor').textContent = riding ? 'ASCENSOR EN MOVIMIENTO' : position.floor === 'lower' ? 'NIVEL 01' : 'NIVEL 02';
    cameraFollow();
    const near = riding ? null : nearestInteraction(position);
    if (near?.id !== lastNear || lastNear === undefined) {
      lastNear = near?.id ?? null;
      $$('.hub-room-sign').forEach(button => button.classList.toggle('nearby', button.dataset.room === near?.id));
      $('#hub-interact').disabled = !near;
      $('#mobile-interact').disabled = !near;
      $('#hub-interact').innerHTML = `<kbd>E</kbd> ${near ? near.name.toUpperCase() : 'INTERACTUAR'}`;
      $('#hub-proximity').hidden = !near;
      $('#hub-proximity').textContent = near ? `E · ${near.name}` : '';
    }
    $('#hub-proximity').style.left = `${position.x * 100}%`;
    $('#hub-proximity').style.top = `${(visualY - .24) * 100}%`;
  }
  function renderProgress() {
    $('#hub-progress').textContent = `${visited.size} / 5 ÁREAS VISITADAS`;
    $$('.hub-room-sign').forEach(button => {
      button.querySelector('.room-visited').hidden = !visited.has(button.dataset.room);
    });
    $('#hub-objective').textContent = prepared
      ? 'HORIZONS 2 preparada. Planifica ECOS DE MARTE.'
      : 'Ve al hangar y prepara HORIZONS 1.';
    $('#hub-expedition').hidden = !prepared;
    $('#hub-ability-label').textContent = getPilot() === 'AVI' ? 'Q · PULSO DISPONIBLE' : 'Q · DIAGNÓSTICO';
  }
  function enter() {
    active = true; clearKeys(); stopRoute(); lastNear = undefined;
    $('#main').hidden = true; $('#main').inert = true;
    screen.hidden = false;
    const avi = getPilot() === 'AVI';
    $('#hub-pilot-name').textContent = getPilot();
    $('#hub-avi-sprite').hidden = !avi; $('#hub-maqui-sprite').hidden = avi;
    player.setAttribute('aria-label', `${getPilot()} en ${position.floor === 'lower' ? 'el nivel 01' : 'el nivel 02'} de CONNECTION SPACE`);
    visualY = LEVELS[position.floor];
    renderProgress(); renderPosition();
    announce(`Bienvenido a CONNECTION SPACE, ${getPilot()}. ${prepared ? 'Tu preparación está registrada. Explora las áreas de la estación.' : 'Ve al hangar para preparar HORIZONS 1.'} Puedes moverte con A y D, o seleccionar una sala para llegar a ella.`);
    requestAnimationFrame(() => { world.focus({ preventScroll: true }); cameraFollow(); });
    lastTime = 0;
    if (frame !== null) cancelAnimationFrame(frame);
    frame = requestAnimationFrame(tick);
  }
  function exit() {
    persist(); active = false; clearKeys(); stopRoute();
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    screen.hidden = true;
    onExit();
  }
  function navigate(target, callback, name) {
    clearKeys(); route = routeTo(position, target); arrival = callback; lastNear = undefined;
    $('#hub-journey').textContent = `EN CAMINO · ${name.toUpperCase()}`;
    $('#hub-journey').hidden = false;
    announce(`En camino a ${name}.`);
    world.focus({ preventScroll: true });
  }
  function navigateRoom(id) {
    if (!ROOMS[id] || riding) return;
    navigate(ROOMS[id], () => openRoom(id), ROOMS[id].name);
  }
  function useLift() {
    if (riding) return;
    const destination = position.floor === 'lower' ? 'upper' : 'lower';
    navigate({ x: LIFT_X, floor: destination }, () => { announce(`Ascensor: ${destination === 'upper' ? 'nivel 02' : 'nivel 01'}.`); persist(); }, 'Ascensor');
  }
  function interact() {
    if (!active || riding || document.querySelector('dialog[open]')) return;
    const near = nearestInteraction(position);
    if (!near) { announce('Acércate a una sala o al ascensor para interactuar.'); return; }
    clearKeys(); stopRoute();
    if (near.id === 'lift') useLift();
    else openRoom(near.id);
  }
  function tick(time) {
    frame = null;
    if (!active) return;
    // Automatic routes remain usable on low-frame-rate devices; each step still clamps to its target.
    const dt = lastTime ? Math.min((time - lastTime) / 1000, 1) : 0;
    lastTime = time; moving = false;
    if (!document.hidden && !document.querySelector('dialog[open]')) {
      if (route.length) {
        const step = route[0];
        riding = step.kind === 'lift';
        if (riding) {
          const destination = LEVELS[step.floor];
          const difference = destination - visualY;
          const delta = getReducedMotion() ? Math.abs(difference) : .33 * dt;
          visualY += Math.sign(difference) * Math.min(Math.abs(difference), delta);
          if (Math.abs(destination - visualY) < .0001) { visualY = destination; position.floor = step.floor; route.shift(); riding = false; }
        } else {
          const difference = step.x - position.x;
          if (Math.abs(difference) > .0001) { facing = difference > 0 ? -1 : 1; moving = true; }
          position.x += Math.sign(difference) * Math.min(Math.abs(difference), .185 * dt);
          visualY = LEVELS[position.floor];
          if (Math.abs(step.x - position.x) < .0001) { position.x = step.x; route.shift(); moving = false; }
        }
        if (!route.length) {
          $('#hub-journey').hidden = true;
          const callback = arrival; arrival = null; persist(); callback?.();
        }
      } else {
        riding = false;
        const direction = (keys.has('right') ? 1 : 0) - (keys.has('left') ? 1 : 0);
        if (direction) {
          facing = direction > 0 ? -1 : 1;
          position.x = Math.max(.055, Math.min(.945, position.x + direction * .185 * dt));
          moving = true;
        }
        visualY = LEVELS[position.floor];
      }
      renderPosition();
    }
    frame = requestAnimationFrame(tick);
  }

  function openRoom(id) {
    clearKeys(); stopRoute(); moving = false;
    logbook.activity('Sala visitada', ROOMS[id].name, getPilot());
    visited.add(id); persist(); renderProgress(); renderPosition();
    if (id === 'archive') { openDialog('science-dialog'); announce('Archivo científico abierto.'); return; }
    $('#hub-room-kicker').textContent = `CONNECTION SPACE / ${ROOMS[id].name.toUpperCase()}`;
    $('#hub-room-title').textContent = id === 'hangar' ? 'Hangar de la flota' : id === 'control' ? 'ECOS DE MARTE.' : id === 'laboratory' ? 'Instrumentos para descubrir.' : 'La distancia también es tiempo.';
    const content = $('#hub-room-content');
    roomDialog.classList.toggle('bright-hangar', id === 'hangar');
    if (id === 'hangar') renderHangar(content);
    if (id === 'control') renderControl(content);
    if (id === 'laboratory') renderLab(content);
    if (id === 'observatory') renderObservatory(content);
    document.dispatchEvent(new CustomEvent('horizons:room',{detail:{room:id}}));
    openDialog('hub-room-dialog');
    announce(`${ROOMS[id].name}. ${visited.size} de cinco áreas visitadas.`);
  }
  function totalsMarkup(result) {
    const fields = [
      ['mass', 'MASA SECA', 'kg', `Límite ${LIMITS.mass} kg`],
      ['power', 'POTENCIA', 'W', `Capacidad ${LIMITS.power} W`],
      ['energy', 'ENERGÍA', 'Wh', 'Almacenamiento'],
      ['cost', 'COSTE', 'u.', `Presupuesto ${LIMITS.cost} u.`],
    ];
    return fields.map(([key, title, unit, note]) => `<div class="ship-metric ${LIMITS[key] && result.totals[key] > LIMITS[key] ? 'over' : ''}"><dt>${title}</dt><dd>${result.totals[key]} <span>${unit}</span></dd><small>${note}</small></div>`).join('');
  }
  function renderHangar(content) {
    content.innerHTML = `${fleetCards()}<p class="room-copy">Elige tu carga científica y comprueba cómo cambia la masa, la demanda de potencia y el presupuesto. Cada equipo cuenta.</p><fieldset class="equipment-options" style="border:0;padding:0"><legend class="sr-only">Equipamiento de HORIZONS 2</legend>${Object.entries(EQUIPMENT).map(([id, item]) => `<label class="equipment-option"><input type="checkbox" data-equipment="${id}" ${config[id] ? 'checked' : ''}><span><strong>${item.name}</strong><small>+${item.mass} kg · +${item.power} W · ${item.cost} u.</small><p>${item.description}</p></span></label>`).join('')}</fieldset><label class="equipment-option"><input type="checkbox" data-equipment="serial" ${config.serial ? 'checked' : ''}><span><strong>Programar instrumentos por turnos</strong><p>Reduce el pico de potencia: cámara y espectrómetro no funcionan a la vez.</p></span></label><dl class="ship-totals" id="ship-totals"></dl><p id="ship-feedback" class="ship-feedback" role="status"></p><button class="primary-action compact" id="prepare-ship"><span>REGISTRAR PREPARACIÓN</span><span aria-hidden="true">↗</span></button><button class="console-action hub-plan-launch" id="hangar-plan">PLANIFICAR ECOS DE MARTE ↗</button><p class="panel-footnote">Valores didácticos de una nave ficticia. No son especificaciones de hardware NASA. La potencia refleja el pico según la programación elegida; «u.» son unidades de presupuesto.</p>`;
    const update = () => {
      const result = evaluateLoadout(config);
      $('#ship-totals').innerHTML = totalsMarkup(result);
      $('#ship-feedback').textContent = result.valid ? prepared ? 'Preparación registrada. Puedes seguir explorando la estación.' : 'Configuración dentro de los límites. Lista para registrar.' : result.problems.join(' ');
      $('#ship-feedback').classList.toggle('invalid', !result.valid);
      $('#prepare-ship').disabled = !result.valid;
      $('#hangar-plan').disabled = !prepared || !result.valid;
    };
    $$('[data-equipment]').forEach(input => input.addEventListener('change', () => {
      config[input.dataset.equipment] = input.checked; prepared = false; persist(); update(); renderProgress();
    }));
    $('#prepare-ship').addEventListener('click', () => {
      const setup = evaluateLoadout(config);
      if (!setup.valid) return;
      const { mass, power, cost, energy } = setup.totals;
      const equipment = Object.entries(EQUIPMENT).filter(([id]) => config[id]).map(([,item]) => item.name);
      logbook.activity('HORIZONS 2 preparada', `${equipment.join(' + ')}. ${mass} kg · ${power} W · ${energy} Wh · ${cost} u.`, getPilot());
      prepared = true; persist(); update(); renderProgress(); announce('HORIZONS 2: preparación registrada.');
    });
    $('#hangar-plan').addEventListener('click', dispatchPlan);
    update();
  }
  function renderControl(content) {
    content.innerHTML = `<p class="room-copy">Primera misión de HORIZONS 1: reconocimiento científico de Marte. Tu preparación define los instrumentos disponibles y los recursos que tendrás que administrar.</p><div class="room-card"><h3>LA PREPARACIÓN TAMBIÉN ES MISIÓN</h3><p>Antes de partir, prepara la nave, conoce sus instrumentos y comprende por qué una respuesta de la Tierra puede llegar después de una decisión importante.</p></div><ul class="room-checklist"><li><span>✓</span>Personaje seleccionado: ${getPilot()}</li><li><span>${prepared ? '✓' : '·'}</span>Configuración de HORIZONS 1 ${prepared ? 'registrada' : 'pendiente'}</li><li><span>${briefingRead ? '✓' : '·'}</span>Briefing ${briefingRead ? 'revisado' : 'pendiente'}</li></ul><button class="primary-action compact" id="read-briefing"><span>${briefingRead ? 'BRIEFING REVISADO' : 'MARCAR BRIEFING COMO REVISADO'}</span><span aria-hidden="true">✓</span></button><button class="console-action hub-plan-launch" id="control-plan" ${prepared?'':'disabled'}>ABRIR PLANIFICADOR DE MISIÓN ↗</button><p class="panel-footnote">Prepara y registra la configuración en el hangar para habilitar el planificador.</p>`;
    $('#control-plan').addEventListener('click', dispatchPlan);
    $('#read-briefing').addEventListener('click', () => { if (!briefingRead) logbook.activity('Briefing revisado', 'Ecos de Marte', getPilot()); briefingRead = true; persist(); renderControl(content); announce('Briefing de ECOS DE MARTE revisado.'); });
  }
  function renderLab(content) {
    content.innerHTML = `<p class="room-copy">Un instrumento responde una pregunta científica. Elegir varios también aumenta las necesidades de la misión.</p>${['camera', 'spectrometer'].map(id => `<div class="room-card"><h3>${EQUIPMENT[id].name.toUpperCase()} · ${config[id] ? 'EQUIPADO' : 'SIN EQUIPAR'}</h3><p>${EQUIPMENT[id].description}</p></div>`).join('')}<div class="room-actions"><button class="room-action-secondary" id="lab-to-hangar">Volver al hangar para cambiar instrumentos ↗</button><button class="room-action-secondary" id="lab-science">Consultar el archivo científico ↗</button></div>`;
    $('#lab-to-hangar').addEventListener('click', () => { roomDialog.close(); navigateRoom('hangar'); });
    $('#lab-science').addEventListener('click', () => { roomDialog.close(); openDialog('science-dialog'); });
  }
  function renderObservatory(content) {
    content.innerHTML = `<p class="room-copy">Las señales recorren una distancia antes de llegar. Explora un ejemplo de comunicación con distancia fija; este control no representa la posición actual de Marte.</p><div class="signal-demo" aria-hidden="true"><span>TIERRA</span><i></i><span>HORIZONS 1</span></div><label class="latency-label" for="signal-distance"><span>DISTANCIA DE DEMOSTRACIÓN</span><span id="signal-distance-value"></span></label><input class="latency-slider" type="range" id="signal-distance" min="1" max="22" value="${signalDistance}" step="1"><div class="room-card" aria-live="polite"><h3>LO QUE TARDA UNA RESPUESTA</h3><p id="signal-result"></p></div><p class="room-copy">Un minuto luz es la distancia que recorre la luz en un minuto en el vacío. Para esta comparación suponemos una respuesta inmediata y una distancia constante.</p><p class="science-callout room-copy">Este retraso es latencia. No significa que los relojes hayan acumulado tiempos diferentes por dilatación temporal.</p><button class="room-action-secondary" id="observatory-science">Explorar tiempo y relatividad en el archivo ↗</button><button class="console-action hub-temporal-link" id="observatory-lab">EXPERIMENTAR CON EL TIEMPO Y LA ASISTENCIA ↗</button>`;
    const update = () => {
      $('#signal-distance-value').textContent = `${signalDistance} min luz`;
      $('#signal-result').textContent = `Ida: ${signalDistance} min. Respuesta de ida y vuelta: al menos ${signalDistance * 2} min, sin incluir el tiempo de procesamiento.`;
    };
    $('#signal-distance').addEventListener('input', event => { signalDistance = Number(event.target.value); update(); });
    $('#observatory-lab').addEventListener('click', () => { roomDialog.close(); onTimeLab(); });
    $('#observatory-science').addEventListener('click', () => { roomDialog.close(); openDialog('science-dialog'); $('#tab-time').click(); });
    update();
  }
  function useAbility() {
    if (!active || riding || document.querySelector('dialog[open]')) return;
    if (getPilot() === 'MAQUI') {
      clearKeys(); stopRoute();
      const result = evaluateLoadout(config);
      $('#hub-room-kicker').textContent = 'MAQUI / DIAGNÓSTICO POR REGLAS';
      $('#hub-room-title').textContent = 'Cada sistema cuenta.';
      $('#hub-room-content').innerHTML = `<p class="room-copy">Análisis de la configuración registrada en el hangar. Las recomendaciones se obtienen de límites explícitos de masa, potencia y presupuesto.</p><dl class="ship-totals">${totalsMarkup(result)}</dl><div class="room-card"><h3>${result.valid ? 'CONFIGURACIÓN VIABLE' : 'REVISIÓN NECESARIA'}</h3><p>${result.valid ? prepared ? 'La configuración respeta los límites y su preparación está registrada.' : 'Los límites se respetan. Registra la preparación en el hangar antes de continuar.' : result.problems.join(' ')}</p></div><p class="panel-footnote">Evaluación local por reglas del prototipo; no es un modelo entrenado ni un diagnóstico de hardware real.</p>`;
      openDialog('hub-room-dialog');
      announce('MAQUI: diagnóstico de la configuración disponible.');
      return;
    }
    screen.classList.add('scanning'); $('#hub-pulse').hidden = false;
    $('#hub-ability-label').textContent = 'RUTAS REVELADAS';
    announce('Pulso de AVI: cinco áreas y el ascensor conectan la estación. Las salas están resaltadas.');
    clearTimeout(skillTimer); clearTimeout(pulseTimer);
    pulseTimer = setTimeout(() => { $('#hub-pulse').hidden = true; }, getReducedMotion() ? 50 : 1900);
    skillTimer = setTimeout(() => { screen.classList.remove('scanning'); renderProgress(); }, 4000);
  }
  function dispatchPlan() { if (!prepared || !evaluateLoadout(config).valid) return; roomDialog.close(); clearKeys(); stopRoute(); onPlan(structuredClone(config)); }
  $('#hub-expedition').addEventListener('click', dispatchPlan);
  function pause() {
    if (!active || document.querySelector('dialog[open]')) return;
    clearKeys(); openDialog('hub-pause-dialog');
  }

  $$('[data-room]').forEach(button => button.addEventListener('click', () => navigateRoom(button.dataset.room)));
  $('#hub-lift').addEventListener('click', useLift);
  $('#hub-interact').addEventListener('click', interact);
  $('#mobile-interact').addEventListener('click', interact);
  $('#hub-proximity').addEventListener('click', interact);
  $('#hub-ability').addEventListener('click', useAbility);
  $('#mobile-ability').addEventListener('click', useAbility);
  $('#hub-pause').addEventListener('click', pause);
  $('#hub-home').addEventListener('click', pause);
  $('#hub-resume').addEventListener('click', () => $('#hub-pause-dialog').close());
  $('#hub-settings').addEventListener('click', () => { $('#hub-pause-dialog').close(); openDialog('settings-dialog'); });
  $('#hub-return-menu').addEventListener('click', () => { $('#hub-pause-dialog').close(); exit(); });
  for (const [id, direction] of [['move-left', 'left'], ['move-right', 'right']]) {
    const button = document.getElementById(id);
    button.addEventListener('pointerdown', event => { if (riding) return; event.preventDefault(); stopRoute(); keys.add(direction); position.x = Math.max(.055, Math.min(.945, position.x + (direction === 'right' ? .012 : -.012))); facing = direction === 'right' ? -1 : 1; renderPosition(); button.setPointerCapture(event.pointerId); world.focus({ preventScroll: true }); });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(name => button.addEventListener(name, () => keys.delete(direction)));
  }
  window.addEventListener('keydown', event => {
    if (!active || document.querySelector('dialog[open]') || event.ctrlKey || event.altKey || event.metaKey) return;
    if (event.target.matches('input, textarea, select')) return;
    const key = event.key.toLowerCase();
    const direction = ['a', 'arrowleft'].includes(key) ? 'left' : ['d', 'arrowright'].includes(key) ? 'right' : null;
    if (direction) { event.preventDefault(); if (!riding) { stopRoute(); keys.add(direction); if (!event.repeat) { position.x = Math.max(.055, Math.min(.945, position.x + (direction === 'right' ? .012 : -.012))); facing = direction === 'right' ? -1 : 1; renderPosition(); } } }
    else if (key === 'e' && !event.repeat) { event.preventDefault(); interact(); }
    else if (key === 'q' && !event.repeat) { event.preventDefault(); useAbility(); }
    else if (key === 'escape') { event.preventDefault(); pause(); }
  });
  window.addEventListener('keyup', event => {
    if (['a', 'arrowleft'].includes(event.key.toLowerCase())) keys.delete('left');
    if (['d', 'arrowright'].includes(event.key.toLowerCase())) keys.delete('right');
    if (active && !keys.size) persist();
  });
  window.addEventListener('blur', clearKeys);
  document.addEventListener('visibilitychange', () => { clearKeys(); if (document.hidden && active) persist(); });
  window.addEventListener('resize', () => { if (active) { renderPosition(); cameraFollow(); } });
  window.addEventListener('pagehide', persist);
  return { enter, exit, visitHangar: () => navigateRoom('hangar') };
}

return {createHub};
})();
__AVI["mission.js"] = (() => {
const { shipImage } = __AVI["fleet.js"];
const { alexLine, minutes, relayCard, relayOptions, storyReport } = __AVI["story.js"];
const { ECHO_WINDOW, RECOMMENDATIONS } = __AVI["story-data.mjs"];
const M = __AVI["mission-model.mjs"];
const { evaluateLoadout, EQUIPMENT } = __AVI["hub-model.mjs"];
const { orbitalSVG, stageNames, stageGroups, groupNames } = __AVI["mission-templates.js"];






const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const KEY = 'avi-horizons.expedition.v1', HISTORY_KEY = 'avi-horizons.results.v1';
const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[character]));
const number = (value, digits = 0) => Number(value || 0).toLocaleString('es-PE', { maximumFractionDigits: digits, minimumFractionDigits: digits });
const time = seconds => seconds >= M.DAY ? `${number(seconds / M.DAY, 1)} d` : seconds >= 3600 ? `${number(seconds / 3600, 1)} h` : `${number(seconds / 60, 1)} min`;
const pilotImage = pilot => pilot === 'AVI' ? 'assets/avi-explorer-v2.png' : 'assets/maqui-explorer.png';
const eye = '<svg class="ui-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19 19 5M5 5h14v14"/></svg>';

function createMission({ getPilot, onPilot, onHub, onMenu, openDialog, getReducedMotion, getFlightSpeed, onFlightSpeed, logbook }) {
  let run = null, history = [], active = false, playing = false, frame = null, last = 0, accrued = 0;
  let pendingConfig = null, targetPoint = null, surfaceKeys = new Set(), routeMarkup = '', lastSaved = 0;
  try { run = M.restoreRun(JSON.parse(localStorage.getItem(KEY) || 'null')); } catch {}
  try { const data = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); if (Array.isArray(data)) history = data.filter(x => Number.isFinite(x.score) && M.ROUTES[x.route]).slice(-8); } catch {}
  const screen = $('#expedition-screen'), content = $('#expedition-content');
  const announce = text => { $('#expedition-announcement').textContent = text; };
  function updateMenu() {
    $('#continue-mission').hidden = !run;
    $('#continue-stage').textContent = run ? stageNames[run.stage] : '';
  }
  function save(record = false) {
    if (!run) return;
    try { localStorage.setItem(KEY, JSON.stringify(run)); $('#expedition-save').textContent = 'GUARDADO LOCAL'; }
    catch { $('#expedition-save').textContent = 'GUARDADO NO DISPONIBLE'; }
    if (record) logbook.expedition(run);
    updateMenu();
  }
  function archiveResult() {
    if (!run?.summary || history.some(entry => entry.id === run.id)) return;
    history.push({
      id: run.id, pilot: run.pilot, route: run.route, score: run.summary.score, success: run.summary.success, science: run.science,
      decision: run.incident?.choice, echoDecision: run.story?.echo?.action, energy: run.energy, disabled: run.disabled,
      evidence: run.story ? M.reportEvidence(run).echo : null, delivered: run.deliveredData,
    });
    history = history.slice(-8);
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch {}
  }
  function setRun(next, force = false) {
    const previous = run?.stage;
    const shouldRecord = force || previous !== next.stage || next.log.length !== run?.log.length
      || next.launchChecks.length !== run?.launchChecks.length
      || next.story?.relay !== run?.story?.relay
      || ['route', 'site', 'vehicle', 'objective'].some(key => next[key] !== run?.[key]);
    run = next;
    if (run.stage === 'incident' && previous !== 'incident') playing = false;
    if (run.stage === 'report') { playing = false; archiveResult(); }
    save(shouldRecord);
    if (force || previous !== run.stage) renderStage();
    updateHUD();
  }
  function hideOtherScreens() {
    $('#main').hidden = true; $('#main').inert = true; $('#hub-screen').hidden = true;
    screen.hidden = false;
  }
  function enter() {
    if (!run) return;
    active = true; playing = false; targetPoint = null; surfaceKeys.clear();
    onPilot(run.pilot); hideOtherScreens(); renderStage(); updateHUD();
    content.focus({ preventScroll: true });
    if (frame !== null) cancelAnimationFrame(frame);
    last = 0; accrued = 0; frame = requestAnimationFrame(tick);
  }
  function leave(toHub = false) {
    save(true); active = false; playing = false; targetPoint = null; surfaceKeys.clear();
    if (frame !== null) cancelAnimationFrame(frame); frame = null; screen.hidden = true;
    toHub ? onHub() : onMenu();
  }
  function newPlan(config, previous = null) {
    if (run && !run.summary) logbook.expedition(run, true);
    const fresh = M.createRun(previous?.pilot ?? getPilot(), config, true);
    const options = previous ? {
      route: previous.route, site: previous.site, vehicle: previous.vehicle,
      objective: previous.objective, relay: previous.story?.relay,
    } : {};
    if (run && fresh.id <= run.id) fresh.id = run.id + 1;
    setRun(M.choosePlan(fresh, options), true);
    enter();
  }
  function openPlanning(config) {
    pendingConfig = config;
    if (run && !['plan','report'].includes(run.stage)) { openDialog('expedition-replace-dialog'); return; }
    newPlan(config);
  }
  function resume() { if (run) enter(); }
  function updateHUD() {
    if (!run) return;
    $('#expedition-stage').textContent = stageNames[run.stage].toUpperCase();
    $('#expedition-pilot').textContent = run.pilot;
    $('#resource-fuel').textContent = number(run.fuel, 1);
    $('#resource-energy').textContent = number(run.energy);
    $('#resource-integrity').textContent = `${number(run.integrity)}%`;
    $('#resource-data').textContent = `${number(run.deliveredData)} MB`;
    $('#resource-data-detail').textContent = `${number(run.data)} MB obtenidos`;
    $('#bar-fuel').style.width = `${Math.max(0, run.fuel / run.initialFuel * 100)}%`;
    $('#bar-energy').style.width = `${Math.max(0, run.energy / run.capacity * 100)}%`;
    $('#bar-integrity').style.width = `${run.integrity}%`;
    $('#expedition-clock').textContent = `T + ${time(run.elapsed)}`;
    $('#message-count').textContent = run.messages.filter(message => message.status === 'pending').length;
    if (run.stage === 'flight') updateFlight();
    if (run.stage === 'incident') updateIncident();
    if (run.stage === 'surface') updateSurface();
  }
  function renderSteps() {
    const index = stageGroups.findIndex(group => group.includes(run.stage));
    $('#expedition-steps').innerHTML = groupNames.map((name, i) => `<span class="${i === index ? 'current' : i < index ? 'passed' : ''}" ${i === index ? 'aria-current="step"' : ''}><b>${String(i + 1).padStart(2,'0')}</b>${name}</span>`).join('');
  }
  function renderStage() {
    if (!run) return;
    renderSteps(); screen.dataset.stage = run.stage;
    const renderer = { plan: renderPlan, launch: renderLaunch, flight: renderFlight, incident: renderIncident, debrief: renderDebrief, arrival: renderArrival, landing: renderLanding, surface: renderSurface, report: renderReport }[run.stage];
    renderer(); document.dispatchEvent(new CustomEvent('horizons:stage',{detail:{stage:run.stage}})); content.scrollTop = 0; updateHUD();
    announce(`${stageNames[run.stage]}. ${run.stage === 'incident' ? 'Anomalía detectada. El reloj está en pausa hasta que decidas activarlo.' : ''}`);
  }
  function renderPlan() {
    const loadout = evaluateLoadout(run.config);
    const options = (items, selected) => Object.entries(items).map(([id, value]) => `<option value="${id}" ${id === selected ? 'selected' : ''}>${value.name}</option>`).join('');
    content.innerHTML = `<div class="planning-layout"><section class="plan-form"><p class="eyebrow">EL VIAJE EMPIEZA CON UNA DECISIÓN</p><h3>Diseña tu<br><em>horizonte.</em></h3><p class="lead-copy">Una nave. Un destino. Diferentes maneras de llegar. Elige cómo convertir tu preparación en una misión.</p><div class="plan-fields"><label for="plan-route">TRAYECTORIA<select id="plan-route" aria-label="Trayectoria">${options(M.ROUTES,run.route)}</select></label><label for="plan-site">ZONA DE ATERRIZAJE<select id="plan-site" aria-label="Zona de aterrizaje">${options(M.SITES,run.site)}</select></label><label for="plan-objective">OBJETIVO CIENTÍFICO<select id="plan-objective" aria-label="Objetivo científico">${options(M.OBJECTIVES,run.objective)}</select></label><label for="plan-vehicle">VEHÍCULO DE LANZAMIENTO<select id="plan-vehicle" aria-label="Vehículo de lanzamiento">${options(M.VEHICLES,run.vehicle)}</select></label>${run.story ? `<label for="plan-relay">REFERENCIA PARA FARO 7<select id="plan-relay">${relayOptions(run.story.relay)}</select></label>` : ''}</div><div class="plan-explanation" id="plan-explanation"></div><p class="plan-validation" id="plan-validation" role="status"></p><button class="primary-action" id="approve-plan"><span>CONFIRMAR PLAN DE MISIÓN</span>${eye}</button><button class="text-action" id="plan-return">← Volver a CONNECTION SPACE</button></section><section class="plan-map-panel">${orbitalSVG()}<div class="plan-map-caption"><span class="map-key earth-key">TIERRA</span><span class="map-key mars-key">MARTE</span><span class="map-key path-key">HORIZONS 1</span></div><div class="plan-totals" id="plan-totals"></div>${run.story ? '<div id="plan-relay-card"></div>' : ''}<details class="model-details"><summary>Qué calcula este modelo</summary><p>Hohmann: transferencia heliocéntrica entre órbitas circulares, coplanares y con fase de encuentro ideal. No usa efemérides actuales. La ruta intensiva es un escenario de juego parametrizado, no una solución de propulsión real.</p><p>Masa seca preparada: ${loadout.totals.mass} kg. Los vehículos, presupuesto, consumo y propulsante en unidades de juego son ficticios. La generación solar compensa la carga base en crucero; la batería cubre operaciones y contingencias.</p><a href="https://www.jpl.nasa.gov/edu/resources/lesson-plan/lets-go-to-mars-calculating-launch-windows/" target="_blank" rel="noopener noreferrer">Modelo educativo de NASA/JPL ↗</a></details></section></div>`;
    ['route','site','vehicle','objective'].forEach(key => $(`#plan-${key}`).addEventListener('change', event => { setRun(M.choosePlan(run,{[key]:event.target.value})); updatePlanDetails(); }));
    $('#plan-relay')?.addEventListener('change', event => {
      setRun(M.choosePlan(run, { relay: event.target.value }));
      updatePlanDetails();
    });
    $('#approve-plan').addEventListener('click', () => { setRun(M.beginLaunch(run)); });
    $('#plan-return').addEventListener('click', () => leave(true));
    updatePlanDetails();
  }
  function updatePlanDetails() {
    const route=M.ROUTES[run.route], site=M.SITES[run.site], vehicle=M.VEHICLES[run.vehicle], ship=evaluateLoadout(run.config);
    const issues=M.validatePlan(run);
    $('#plan-explanation').innerHTML=`<strong>${esc(M.OBJECTIVES[run.objective].name)}</strong><p>${esc(M.OBJECTIVES[run.objective].description)}</p><p>${esc(site.description)}</p>`;
    $('#plan-validation').textContent=issues.length ? issues.join(' ') : 'Plan viable dentro de las restricciones del modelo.';
    $('#plan-validation').classList.toggle('invalid',!!issues.length); $('#approve-plan').disabled=!!issues.length;
    $('#plan-totals').innerHTML=`<div><span>DURACIÓN PREVISTA</span><strong>${number(route.days)} <small>días</small></strong></div><div><span>PROPULSANTE DE CRUCERO</span><strong>${route.fuel} <small>/ ${vehicle.fuel} u.</small></strong></div><div><span>PRESUPUESTO TOTAL</span><strong>${ship.totals.cost+vehicle.cost} <small>/ 1200 u.</small></strong></div>`;
    if (run.story) $('#plan-relay-card').innerHTML = relayCard(run.story.relay);
    drawOrbit(0);
  }
  function renderLaunch() {
    content.innerHTML=`<div class="launch-layout"><section class="launch-visual"><div class="launch-orbit-ring"></div>${shipImage('carrier', 'launch-ship')}<span class="launch-station-label">CONNECTION SPACE / PUERTO 01</span><div class="launch-engine" aria-hidden="true"></div></section><section class="launch-checklist"><p class="eyebrow">SECUENCIA DE SALIDA</p><h3>Todo listo para<br><em>lo desconocido.</em></h3><p class="lead-copy">Comprueba los tres sistemas antes de liberar HORIZONS 1. La nave partirá con la configuración que elegiste.</p><div class="launch-checks">${[['power','Energía y carga útil','Batería, instrumentos y programación eléctrica.'],['navigation','Navegación y encuentro','Trayectoria y fase de llegada a Marte.'],['comms','Comunicaciones','Enlace con la Tierra y capacidad de operar a bordo.']].map(([id,name,description])=>`<label><input type="checkbox" data-launch-check="${id}" ${run.launchChecks.includes(id)?'checked':''}><span><strong>${name}</strong><small>${description}</small></span><i>✓</i></label>`).join('')}</div><button class="primary-action" id="ignite-button" ${run.launchChecks.length===3?'':'disabled'}><span>LIBERAR HORIZONS 1</span>${eye}</button><button class="text-action" id="revise-plan">← Revisar planificación</button></section></div>`;
    $$('[data-launch-check]').forEach(input=>input.addEventListener('change',()=>{if(input.checked)setRun(M.checkLaunch(run,input.dataset.launchCheck));else{const next=structuredClone(run);next.launchChecks=next.launchChecks.filter(id=>id!==input.dataset.launchCheck);setRun(next);}$('#ignite-button').disabled=run.launchChecks.length!==3;}));
    $('#ignite-button').addEventListener('click',()=>{playing=true;setRun(M.ignite(run));});
    $('#revise-plan').addEventListener('click',()=>{const next=structuredClone(run);next.stage='plan';setRun(next);});
  }
  function renderFlight() {
    content.innerHTML=`<div class="flight-layout"><section class="flight-cartography">${orbitalSVG()}<div class="flight-map-top"><span class="eyebrow">NAVEGACIÓN HELIOCÉNTRICA</span><span class="live-indicator"><i class="status-dot"></i>TELEMETRÍA SIMULADA</span></div><div class="travel-progress"><div><span id="flight-phase">EN TRANSFERENCIA</span><strong id="flight-percent">0%</strong></div><i><b id="flight-progress-fill"></b></i></div></section><aside class="flight-console"><p class="eyebrow">HORIZONS 1 / CONTROL DE MISIÓN</p><h3>La distancia<br>cambia las <em>reglas.</em></h3><div class="flight-readouts"><div><span>TIEMPO DE MISIÓN</span><strong id="flight-time"></strong></div><div><span>DISTANCIA A LA TIERRA</span><strong id="flight-distance"></strong></div><div><span>LATENCIA DE IDA</span><strong id="flight-latency"></strong></div><div><span>RAPIDEZ HELIOCÉNTRICA</span><strong id="flight-speed"></strong></div></div><div class="playback-controls"><button class="small-pill" id="toggle-simulation"></button><select id="playback-speed" aria-label="Velocidad de reproducción"><option value="1">1× · 3 días/s</option><option value="3">3× · 9 días/s</option><option value="9">9× · 27 días/s</option></select></div><button class="console-action" id="advance-days">Adelantar 30 días <span>→</span></button><button class="console-action" id="send-flight-status">Enviar telemetría <span>↗</span></button><button class="console-action" id="calibrate-instruments" ${run.calibrated||run.energy<70?'disabled':''}>${run.calibrated?'Instrumentos calibrados':'Calibrar instrumentos · 70 Wh'} <span>◇</span></button><div class="flight-log" id="flight-log"></div><p class="microcopy">La reproducción acelera la presentación del viaje. No representa dilatación temporal.</p></aside></div>`;
    $('#toggle-simulation').addEventListener('click',()=>{playing=!playing;updateFlight();});
    $('#playback-speed').value=String(getFlightSpeed());$('#playback-speed').addEventListener('change',event=>onFlightSpeed(event.target.value));
    $('#advance-days').addEventListener('click',()=>setRun(M.advanceFlight(run,30*M.DAY)));
    $('#send-flight-status').addEventListener('click',()=>{setRun(M.sendStatus(run));showCommunications();});
    $('#calibrate-instruments').addEventListener('click',()=>{setRun(M.calibrate(run));$('#calibrate-instruments').disabled=true;$('#calibrate-instruments').textContent='Instrumentos calibrados';});
    drawOrbit(run.progress);updateFlight();
  }
  function updateFlight() {
    if(!$('#flight-time'))return;
    const orbit=M.orbitState(run.progress,run.route);
    $('#flight-time').textContent=time(run.elapsed);$('#flight-distance').textContent=`${number(orbit.distanceAU,2)} UA`;
    $('#flight-latency').textContent=`${number(orbit.lightSeconds/60,1)} min`;
    $('#flight-speed').textContent=`${number(orbit.speed/1000,1)} km/s`;
    $('#flight-percent').textContent=`${number(run.progress*100,1)}%`;$('#flight-progress-fill').style.width=`${run.progress*100}%`;
    $('#toggle-simulation').textContent=playing?'Ⅱ Pausar':'▷ Reanudar';$('#flight-phase').textContent=playing?'EN TRANSFERENCIA':'REPRODUCCIÓN EN PAUSA';
    $('#flight-log').innerHTML=run.log.slice(-2).map(entry=>`<p><span>T + ${time(entry.at)}</span>${esc(entry.title)}</p>`).join('');
    drawOrbit(run.progress);
  }
  function drawOrbit(progress) {
    if(!$('#orbit-map'))return;
    const state=M.orbitState(progress,run.route), point=position=>({x:380+position.x*150,y:300-position.y*150});
    const path=(end)=>Array.from({length:81},(_,i)=>point(M.orbitState(end*i/80,run.route).ship)).map((p,i)=>`${i?'L':'M'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
    const full=path(1);if(routeMarkup!==full||!$('#orbit-route').getAttribute('d')){$('#orbit-route').setAttribute('d',full);routeMarkup=full;}
    $('#orbit-travelled').setAttribute('d',path(progress));
    for(const [id,position]of[['earth',state.earth],['mars',state.mars],['ship',state.ship]]){const p=point(position);$(`#orbit-${id}`).setAttribute('transform',`translate(${p.x},${p.y})`);}
    const ship=point(state.ship),earth=point(state.earth);const signal=$('#orbit-signal');
    signal.setAttribute('x1',ship.x);signal.setAttribute('y1',ship.y);signal.setAttribute('x2',earth.x);signal.setAttribute('y2',earth.y);
  }
  function renderIncident() {
    const latency=M.orbitState(run.progress,run.route).lightSeconds;
    content.innerHTML=`<div class="incident-layout"><section class="incident-story"><div class="warning-label">ANOMALÍA DETECTADA / BUS DE INSTRUMENTOS</div><h3>La ayuda está<br>demasiado <em>lejos.</em></h3><p class="lead-copy">Una oscilación eléctrica amenaza la siguiente observación científica. La Tierra puede orientarte, pero su respuesta debe recorrer el espacio.</p>${run.story ? alexLine('Necesitamos decidir en siete minutos. Si la respuesta tarda más, tendremos que actuar a bordo o renunciar a esta observación.', 'alert') : ''}<div class="incident-clock"><span>VENTANA DE OBSERVACIÓN</span><strong id="incident-countdown">07:00</strong><small>TIEMPO SIMULADO RESTANTE</small></div><div class="signal-comparison"><span>Respuesta terrestre más temprana</span><strong>${number(latency*2/60+2,1)} min</strong><small>Ida + 2 min de preparación + vuelta.</small></div><button class="console-action" id="request-help">Solicitar instrucciones a la Tierra <span>↗</span></button><p id="help-status" class="microcopy"></p><button class="small-pill" id="incident-play">Activar reloj de decisión</button><p class="microcopy">El reloj empieza en pausa para que puedas leer. Al activarlo: 1 s de juego = 6 s simulados.</p></section><section class="incident-choices"><p class="eyebrow">TU DECISIÓN, TUS CONSECUENCIAS</p><button class="decision-card" data-decision="reconfigure" ${run.energy<(run.pilot==='MAQUI'?120:180)?'disabled':''}><span class="decision-number">01</span><strong>Reconfigurar a bordo</strong><p>Conserva los instrumentos y la ventana de observación. Consume ${run.pilot==='MAQUI'?120:180} Wh y exige una intervención técnica.</p><small>${run.pilot==='MAQUI'?'MAQUI optimiza el diagnóstico y reduce el coste.':'Intervención local con los datos disponibles.'}</small></button><button class="decision-card" data-decision="isolate"><span class="decision-number">02</span><strong>Aislar un instrumento</strong><p>Estabiliza el bus con 30 Wh. ${run.config.spectrometer?'El espectrómetro':'La cámara'} quedará fuera de servicio durante el resto de la misión.</p><small>Menor consumo, menor capacidad científica.</small></button><button class="decision-card" data-decision="wait"><span class="decision-number">03</span><strong>Esperar en modo seguro</strong><p>Conserva los instrumentos y espera orientación. La ventana de observación terminará antes de recibir la respuesta.</p><small>La espera se representa mediante un salto de tiempo.</small></button><div class="advisor-note"><strong>${run.pilot==='MAQUI'?'DIAGNÓSTICO DE MAQUI':'SISTEMA DE APOYO'}</strong><p>${run.energy>=(run.pilot==='MAQUI'?120:180)?'La reserva permite reconfigurar. Si tu objetivo depende de los instrumentos, conservarlos puede ser valioso.':'La energía disponible limita la intervención. Considera el modo seguro y el coste de perder la observación.'}</p><small>Recomendación por reglas; la decisión es tuya.</small></div></section></div>`;
    $$('[data-decision]').forEach(button=>button.addEventListener('click',()=>{playing=false;setRun(M.resolveIncident(run,button.dataset.decision));}));
    $('#request-help').addEventListener('click',()=>{setRun(M.requestHelp(run));updateIncident();});
    $('#incident-play').addEventListener('click',()=>{playing=!playing;updateIncident();});updateIncident();
  }
  function updateIncident() {
    if(!$('#incident-countdown'))return;
    const remaining=Math.max(0,Math.ceil(run.incident.deadline-run.elapsed));
    $('#incident-countdown').textContent=`${String(Math.floor(remaining/60)).padStart(2,'0')}:${String(remaining%60).padStart(2,'0')}`;
    $('#request-help').disabled=run.incident.asked;
    $('#help-status').textContent=run.incident.asked?`Solicitud enviada. Respuesta prevista dentro de ${number((run.incident.replyAt-run.elapsed)/60,1)} min simulados.`:'Todavía no se ha enviado una solicitud.';
    $('#incident-play').textContent=playing?'Ⅱ Pausar reloj':'▷ Activar reloj de decisión';
  }
  function renderDebrief() {
    const choice=run.incident.choice;
    content.innerHTML=`<div class="decision-result"><p class="eyebrow">DECISIÓN → CONSECUENCIA</p><div class="decision-result-symbol">${choice==='wait'?'◷':choice==='isolate'?'◇':'✓'}</div><h3>${choice==='wait'?'La señal llegó.<br>La ventana, <em>pasó.</em>':choice==='isolate'?'Estabilidad a cambio<br>de <em>capacidad.</em>':'Autonomía para<br><em>seguir explorando.</em>'}</h3><p class="lead-copy">${esc(run.incident.outcome)}</p><div class="result-mini-grid"><div><span>ENERGÍA RESTANTE</span><strong>${number(run.energy)} Wh</strong></div><div><span>INTEGRIDAD</span><strong>${number(run.integrity)}%</strong></div><div><span>VENTANA CIENTÍFICA</span><strong>${run.incident.windowLost?'Perdida':'Conservada'}</strong></div></div><button class="primary-action" id="resume-voyage"><span>CONTINUAR HACIA MARTE</span>${eye}</button><p class="microcopy">Una respuesta tardía no significa dilatación temporal: significa que la información necesita viajar.</p></div>`;
    $('#resume-voyage').addEventListener('click',()=>{playing=true;setRun(M.resumeFlight(run));});
  }
  function renderArrival() {
    content.innerHTML=`<div class="arrival-layout"><div class="arrival-mars" aria-hidden="true"><i></i><span>MARTE</span></div><section><p class="eyebrow">ENCUENTRO CONFIRMADO</p><h3>Otro mundo.<br>La misma <em>curiosidad.</em></h3><p class="lead-copy">HORIZONS 1 mantiene el enlace en órbita. Transfiere el equipo a HORIZONS 2 para iniciar el descenso y localizar Faro 7.</p><dl class="arrival-details"><div><dt>ZONA</dt><dd>${M.SITES[run.site].name}</dd></div><div><dt>OBJETIVO</dt><dd>${M.OBJECTIVES[run.objective].name}</dd></div><div><dt>PROPULSANTE</dt><dd>${number(run.fuel,1)} u.</dd></div><div><dt>ENLACE A LA TIERRA</dt><dd>${number(M.orbitState(1,run.route).lightSeconds/60,1)} min de ida</dd></div></dl><button class="primary-action" id="begin-descent"><span>PREPARAR DESCENSO</span>${eye}</button></section></div>`;
    $('#begin-descent').addEventListener('click',()=>setRun(M.beginLanding(run)));
  }
  function renderLanding() {
    const phases=[['Entrada atmosférica','El escudo térmico protege la nave mientras la atmósfera reduce parte de su velocidad.','ORIENTAR ESCUDO TÉRMICO','100 km','5,5 km/s'],['Descenso aerodinámico','Despliega el paracaídas en la secuencia de descenso. La atmósfera marciana no basta para completar por sí sola el frenado.','DESPLEGAR PARACAÍDAS','11 km','450 m/s'],['Descenso propulsado','Elige cómo emplear la reserva final. Un descenso controlado consume más propulsante y conserva mejor los sistemas.','ATERRIZAJE CONTROLADO · 18 u.','1,5 km','85 m/s']];
    const phase=phases[run.landingPhase];
    content.innerHTML=`<div class="landing-layout"><section class="landing-visual" data-phase="${run.landingPhase}"><div class="landing-sky"></div><div class="descent-path"></div><div class="landing-craft ${run.landingPhase===1?'parachute':''}">${shipImage('shuttle', 'descent-ship')}</div><div class="landing-ground"></div><div class="landing-altitude"><span>ALTITUD ILUSTRATIVA</span><strong>${phase[3]}</strong><span>RAPIDEZ ILUSTRATIVA</span><strong>${phase[4]}</strong></div></section><section class="landing-console"><p class="eyebrow">ENTRADA / DESCENSO / ATERRIZAJE</p><div class="landing-step-count">${run.landingPhase+1}<small>/ 03</small></div><h3>${phase[0].split(' ')[0]}<br><em>${phase[0].split(' ').slice(1).join(' ')}.</em></h3><p class="lead-copy">${phase[1]}</p><button class="primary-action" id="landing-action" ${run.landingPhase===2&&run.fuel<18?'disabled':''}><span>${phase[2]}</span>${eye}</button>${run.landingPhase===2?`<button class="console-action" id="landing-economy" ${run.fuel<9?'disabled':''}>Descenso económico · 9 u. <small>Mayor desgaste de la nave</small></button>`:''}<p class="microcopy">Secuencia didáctica inspirada en entrada, paracaídas y propulsión. Las alturas y velocidades son ilustrativas, no una simulación de guiado ni especificaciones de una misión real.</p><a class="source-link" href="https://science.nasa.gov/solar-system/skywatching/night-sky-network/landing-on-mars-a-tricky-feat/" target="_blank" rel="noopener noreferrer">Cómo se aterriza en Marte · NASA ↗</a></section></div>`;
    $('#landing-action').addEventListener('click',()=>setRun(M.landingAction(run,'safe'),true));
    $('#landing-economy')?.addEventListener('click',()=>setRun(M.landingAction(run,'economy'),true));
  }
  function renderSurface() {
    content.innerHTML=`<section class="surface-shell"><header class="surface-heading"><div><p class="eyebrow">MARTE / ${M.SITES[run.site].name.toUpperCase()}</p><h3>Escucha lo que<br>el mundo <em>guarda.</em></h3></div><div class="surface-tools"><button class="small-pill" id="surface-skill">Q · ${run.pilot==='AVI'?'Pulso de exploración':'Diagnóstico'}</button><button class="small-pill" id="surface-transmit">Transmitir datos</button><button class="small-pill" id="surface-finish">Cerrar expedición</button></div></header><div class="surface-viewport" id="surface-viewport"><div class="surface-world" id="surface-world" tabindex="0" aria-label="Exploración en rover presurizado. A y D para conducir, E para interactuar y Q para usar la habilidad. También puedes seleccionar los puntos de interés."><img class="surface-background" src="assets/mars-surface.png" alt="Paisaje marciano ilustrado: planicie rojiza, afloramientos y montañas al atardecer. Escenario ficticio."><div class="surface-landing-pod">${shipImage('shuttle', 'surface-pod')}<span>HORIZONS 2</span></div>${Object.entries(M.POINTS).map(([id,point])=>`<button class="surface-point" data-point="${id}" style="--point-x:${point.x*100}%" ${id==='echo'&&!run.echoRevealed?'hidden':''}><span class="point-marker">${point.kind==='base'?'⌂':run.findings[id]?'✓':'◇'}</span><strong>${point.name}</strong><small>${point.kind==='base'?'BASE DE MISIÓN':run.findings[id]?'REGISTRADO':'EXPLORAR'}</small></button>`).join('')}<div class="pressurized-rover" id="surface-rover" role="img" aria-label="${run.pilot} dentro de un rover presurizado"><div class="rover-cabin"><img src="${pilotImage(run.pilot)}" alt=""></div><div class="rover-body"><span>AVI CONNECTION</span></div><i class="rover-wheel wheel-left"></i><i class="rover-wheel wheel-right"></i><span class="rover-beam"></span></div><span class="surface-navigation-note" id="surface-navigation-note" hidden></span></div></div><footer class="surface-footer"><span id="surface-finding-count">0 / 3 HALLAZGOS</span><span>ROVER PRESURIZADO · CONTROLES A / D · E · Q</span><div><button id="rover-left" aria-label="Conducir a la izquierda">←</button><button id="rover-right" aria-label="Conducir a la derecha">→</button><button id="rover-interact" aria-label="Interactuar con el punto cercano">E</button></div></footer><p class="microcopy surface-caption">El terreno, las lecturas y los hallazgos son parte de un escenario ficticio. Obtén datos, envíalos y espera su confirmación antes de cerrar la expedición.</p></section>`;
    $$('[data-point]').forEach(button=>button.addEventListener('click',()=>{targetPoint=button.dataset.point;surfaceKeys.clear();$('#surface-navigation-note').hidden=false;$('#surface-navigation-note').textContent=`EN CAMINO · ${M.POINTS[targetPoint].name.toUpperCase()}`;$('#surface-world').focus({preventScroll:true});}));
    $('#surface-skill').addEventListener('click',useSurfaceAbility);$('#surface-transmit').addEventListener('click',()=>{setRun(M.transmitData(run));showCommunications();});
    $('#surface-finish').addEventListener('click',showFinish);$('#rover-interact').addEventListener('click',interactSurface);
    for(const[id,direction]of[['rover-left','left'],['rover-right','right']]){const button=document.getElementById(id);button.addEventListener('pointerdown',event=>{event.preventDefault();targetPoint=null;surfaceKeys.add(direction);setRun(M.moveRover(run,run.surfaceX+(direction==='right'?.012:-.012)));button.setPointerCapture(event.pointerId);});['pointerup','pointercancel','lostpointercapture'].forEach(name=>button.addEventListener(name,()=>surfaceKeys.delete(direction)));}
    updateSurface();
  }
  function updateSurface() {
    if(!$('#surface-rover'))return;
    $('#surface-rover').style.left=`${run.surfaceX*100}%`;
    $('#surface-rover').classList.toggle('driving',!!targetPoint||surfaceKeys.size>0);
    $('#surface-finding-count').textContent=`${Object.keys(run.findings).length} / 3 HALLAZGOS · ${run.data} MB`;
    $$('[data-point]').forEach(button=>{const id=button.dataset.point;button.hidden=id==='echo'&&!run.echoRevealed;button.classList.toggle('near',Math.abs(M.POINTS[id].x-run.surfaceX)<.09);if(id!=='landing'&&run.findings[id]){button.querySelector('.point-marker').textContent='✓';button.querySelector('small').textContent='REGISTRADO';}});
    const viewport=$('#surface-viewport'),world=$('#surface-world');if(world.clientWidth>viewport.clientWidth)viewport.scrollLeft=Math.max(0,run.surfaceX*world.clientWidth-viewport.clientWidth/2);
  }
  function nearestPoint() {return Object.entries(M.POINTS).filter(([id,point])=>(id!=='echo'||run.echoRevealed)&&Math.abs(point.x-run.surfaceX)<.09).sort((a,b)=>Math.abs(a[1].x-run.surfaceX)-Math.abs(b[1].x-run.surfaceX))[0]?.[0];}
  function interactSurface(){if(run?.stage!=='surface')return;targetPoint=null;surfaceKeys.clear();const id=nearestPoint();if(id)openPoint(id);else announce('Acércate a un punto de interés o selecciónalo para conducir hasta él.');}
  function pointDialog(title,html){$('#hub-room-dialog').classList.remove('bright-hangar');$('#hub-room-kicker').textContent='ECOS DE MARTE / EXPLORACIÓN';$('#hub-room-title').textContent=title;$('#hub-room-content').innerHTML=html;openDialog('hub-room-dialog');}
  function openPoint(id){
    if(id==='landing'){showFinish();return;}
    if(id==='echo' && run.story){openFaro();return;}
    const point=M.POINTS[id],finding=run.findings[id],full=!['camera','spectrometer'].includes(point.kind)||M.activeInstrument(run,point.kind);
    const method=point.kind==='camera'?'cámara':point.kind==='spectrometer'?'espectrómetro':'muestreo del rover';
    pointDialog(point.name,`<p class="room-copy">${id==='panorama'?'Una vista amplia permite documentar el entorno y comparar zonas de interés.':id==='mineral'?'El afloramiento ofrece materiales para estudiar con los instrumentos de la nave.':'El barrido detectó un contraste bajo el regolito. El rover puede registrar una muestra de demostración.'}</p><div class="room-card"><h3>${finding?'HALLAZGO REGISTRADO':full?'INSTRUMENTO DISPONIBLE':'REGISTRO MANUAL DISPONIBLE'}</h3><p>${finding?`${esc(finding.name)}: ${finding.science} puntos científicos y ${finding.data} MB.`:full?`Puedes usar ${method}. Consumo previsto: ${Math.round(point.energy*(run.pilot==='MAQUI'&&point.kind==='spectrometer'?.8:1))} Wh.`:`El instrumento especializado no está disponible. Un registro manual obtiene menos datos y valor científico.`}</p></div>${finding?'':`<button class="primary-action compact" id="collect-point" ${run.energy<Math.round(point.energy*(run.pilot==='MAQUI'&&point.kind==='spectrometer'?.8:1))?'disabled':''}><span>${full?'REALIZAR OBSERVACIÓN':'REGISTRAR MANUALMENTE'}</span>${eye}</button>`}<button class="text-action" id="point-comms">Abrir comunicaciones ↗</button>`);
    $('#collect-point')?.addEventListener('click',()=>{setRun(M.collectPoint(run,id));openPoint(id);});$('#point-comms').addEventListener('click',()=>{$('#hub-room-dialog').close();showCommunications();});
  }
  function openFaro() {
    const outcome = run.story.echo;
    const local = M.echoPlan(run, 'local');
    const earth = M.echoPlan(run, 'earth');
    const timing = M.relayTiming(run.story.relay);
    const feedback = outcome
      ? outcome.recovered
        ? 'Ya tenemos el archivo. Transmítelo a la Tierra para que figure como evidencia en el informe.'
        : 'La ventana se cerró antes de que llegara la respuesta. Podemos transmitir otras observaciones y registrar lo que quedó pendiente.'
      : 'El lector de Faro 7 nos da una ventana de 12 minutos simulados. Puedo reconstruir el archivo en HORIZONS 2 con más consumo, o puedes pedir ayuda a la Tierra y esperar.';
    const disable = plan => run.energy < plan.cost + (plan.recovered ? M.POINTS.echo.energy : 0) ? 'disabled' : '';
    pointDialog('El archivo de Faro 7', `${alexLine(feedback, outcome ? (outcome.recovered ? 'relief' : 'alert') : 'explain')}
      ${relayCard(run.story.relay)}
      <p class="microcopy">La fecha aporta la geometría histórica Tierra–Marte al ejercicio. Faro 7, el consumo y la ventana de ${minutes(ECHO_WINDOW)} son ficticios. El cálculo supone un enlace disponible e ignora esperas de retransmisión.</p>
      ${outcome || !local || !earth ? '' : `<div class="story-actions">
        <button class="room-action-secondary" data-faro-action="local" ${disable(local)}>Analizar con Alex · ${local.cost} Wh de operación</button>
        <button class="room-action-secondary" data-faro-action="earth" ${disable(earth)}>Consultar a la Tierra · ${minutes(timing.roundTrip)}</button>
      </div><p class="microcopy">Recuperar y registrar el archivo requiere ${M.POINTS.echo.energy} Wh adicionales.</p>`}`);
    $$('[data-faro-action]').forEach(button => button.addEventListener('click', () => {
      setRun(M.investigateEcho(run, button.dataset.faroAction));
      openFaro();
      $('#hub-room-dialog [data-close]').focus();
    }));
  }
  function useSurfaceAbility(){
    if(run.stage!=='surface')return;
    const scan = () => {
      setRun(M.revealEcho(run));
      const world = $('#surface-world');
      if (!world || getReducedMotion()) return;
      world.classList.add('pulse-active');
      setTimeout(() => world.classList.remove('pulse-active'), 1600);
    };
    if(run.pilot==='AVI'){scan();announce('Pulso de AVI: punto de interés bajo el regolito localizado.');return;}
    const estimated=Object.entries(M.POINTS).filter(([id,p])=>p.kind!=='base'&&!run.findings[id]).reduce((sum,[,p])=>sum+p.energy,0);
    pointDialog('Antes de actuar, comprende.',`<p class="room-copy">MAQUI compara la reserva con las observaciones pendientes. Estimación conservadora por reglas, sin incluir desplazamiento ni transmisiones.</p><div class="room-card"><h3>DIAGNÓSTICO DE RESERVA</h3><p>Energía disponible: ${number(run.energy)} Wh. Observaciones pendientes: hasta ${estimated} Wh. ${run.energy>estimated+50?'Existe margen para explorar y transmitir.':'Prioriza los puntos ligados a tu objetivo y conserva energía para el enlace.'}</p></div><button class="primary-action compact" id="diagnostic-scan" ${run.echoRevealed||run.energy<20?'disabled':''}><span>${run.echoRevealed?'ANOMALÍA YA LOCALIZADA':'BARRIDO DE SENSORES · 20 Wh'}</span>${eye}</button>`);
    $('#diagnostic-scan').addEventListener('click',()=>{scan();$('#hub-room-dialog').close();announce('MAQUI localizó un contraste bajo el regolito.');});
  }
  function showFinish(){pointDialog('Lo que descubriste<br>merece llegar.',`<p class="room-copy">Has registrado ${Object.keys(run.findings).length} hallazgos y ${run.data} MB. La Tierra ha confirmado ${number(run.deliveredData)} MB. Cerrar la expedición puede incluir enviar los datos restantes y esperar su confirmación.</p><div class="room-card"><h3>${esc(M.OBJECTIVES[run.objective].name.toUpperCase())}</h3><p>${esc(M.OBJECTIVES[run.objective].description)}</p></div><button class="primary-action compact" id="finish-confirmed"><span>TRANSMITIR, ESPERAR Y FINALIZAR</span>${eye}</button><button class="text-action" id="finish-partial">Finalizar ahora con los datos ya confirmados</button>`);
    $('#hub-room-title').textContent='Lo que descubriste merece llegar.';
    $('#finish-confirmed').addEventListener('click',()=>{$('#hub-room-dialog').close();setRun(M.completeWithConfirmation(run));});$('#finish-partial').addEventListener('click',()=>{$('#hub-room-dialog').close();setRun(M.finishRun(run,'Expedición cerrada sin esperar los paquetes pendientes.'));});
  }
  function showCommunications(){renderCommunications();openDialog('communications-dialog');}
  function renderCommunications(){
    const body=$('#communications-content');if(!run){body.innerHTML='<p class="room-copy">El enlace estará disponible cuando planifiques tu expedición. Las señales se simulan con su distancia y tiempo de propagación.</p>';return;}
    const latency=M.orbitState(run.progress,run.route).lightSeconds,pending=run.messages.filter(m=>m.status==='pending');
    body.innerHTML=`<div class="link-readouts"><div><span>LATENCIA DE IDA</span><strong>${number(latency/60,1)} min</strong></div><div><span>DATOS EN LA TIERRA</span><strong>${number(run.deliveredData)} MB</strong></div></div><p class="room-copy">Tiempos de un escenario orbital idealizado. Los paneles detienen la reproducción; puedes esperar la siguiente señal con el control inferior.</p><div class="message-list">${run.messages.length?run.messages.slice(-8).map(message=>`<article class="message ${message.status}"><div><span>${message.kind==='reply'?'TIERRA → NAVE':message.kind==='science'?'CIENCIA → TIERRA':'NAVE → TIERRA'}</span><strong>${message.status==='delivered'?'RECIBIDO':message.sent>run.elapsed?'POR EMITIR':'EN TRÁNSITO'}</strong></div><p>${message.status==='pending'&&message.kind==='reply'?'Respuesta terrestre aún no disponible.':esc(message.text)}</p><small>${message.status==='delivered'?`Recepción: T + ${time(message.arrives)}`:`Tiempo restante: ${time(Math.max(0,message.arrives-run.elapsed))}`}${message.amount?` · ${message.amount} MB`:''}</small></article>`).join(''):'<p class="empty-state">El espacio está en silencio. Aún no has enviado un mensaje.</p>'}</div><div class="comms-actions"><button class="room-action-secondary" id="comms-status" ${!['flight','incident','surface','arrival'].includes(run.stage)||run.energy<5?'disabled':''}>Enviar estado · 5 Wh</button><button class="room-action-secondary" id="comms-science" ${run.stage!=='surface'||run.data<=run.queuedData||run.energy<15?'disabled':''}>Transmitir ciencia · 15 Wh</button><button class="room-action-secondary" id="comms-wait" ${!pending.length?'disabled':''}>${run.stage==='incident'?'Esperar respuesta · se pierde la ventana':'Esperar próxima confirmación'}</button></div><p class="panel-footnote">Radio del prototipo: 0,8 Mbit/s. La recepción incluye propagación y transmisión. En la anomalía, esperar tiene una consecuencia explícita.</p>`;
    $('#comms-status').addEventListener('click',()=>{setRun(M.sendStatus(run));renderCommunications();});$('#comms-science').addEventListener('click',()=>{setRun(M.transmitData(run));renderCommunications();});
    $('#comms-wait').addEventListener('click',()=>{if(run.stage==='incident'){ $('#communications-dialog').close();setRun(M.resolveIncident(run,'wait'));return;}if(run.stage==='flight'){const arrival=Math.min(...run.messages.filter(m=>m.status==='pending').map(m=>m.arrives));setRun(M.advanceFlight(run,Math.max(1,arrival-run.elapsed+1)));}else setRun(M.waitForLink(run));renderCommunications();});
  }
  function renderReport(){
    const summary=run.summary,findings=Object.values(run.findings),route=M.ROUTES[run.route];
    content.innerHTML=`<div class="report-layout"><header class="report-heading"><div><p class="eyebrow">ECOS DE MARTE / INFORME CIENTÍFICO</p><h3>${summary.success?'Regresamos con<br><em>nuevas preguntas.</em>':'Cada intento<br>abre un <em>horizonte.</em>'}</h3><p class="lead-copy">${esc(summary.reason)}</p><span class="report-rank ${summary.success?'success':''}">${esc(summary.rank)}</span></div><div class="score-orbit"><strong>${summary.score}</strong><span>/ 100</span><small>PUNTUACIÓN DE MISIÓN</small></div></header><div class="report-metrics"><div><span>VALOR CIENTÍFICO</span><strong>${number(run.science)} <small>u.</small></strong></div><div><span>DATOS CONFIRMADOS</span><strong>${number(run.deliveredData)} <small>MB</small></strong></div><div><span>INTEGRIDAD FINAL</span><strong>${number(run.integrity)}<small>%</small></strong></div><div><span>PROPULSANTE RESTANTE</span><strong>${number(run.fuel,1)}<small> u.</small></strong></div></div><div class="report-columns"><section><h4>TU MISIÓN, EXPLICADA</h4><ul class="report-lessons"><li><strong>Trayectoria</strong>${esc(route.name)}: ${number(route.days)} días previstos y ${route.fuel} unidades de propulsante de crucero.</li><li><strong>Autonomía</strong>${esc(run.incident?.outcome||'No se llegó a la etapa de la anomalía.')}</li><li><strong>Objetivo científico</strong>${summary.goal?'Se cumplió la condición científica del objetivo.':'La condición científica del objetivo quedó pendiente.'} ${run.deliveredData<run.data?'Parte de los datos no llegó a la Tierra.':'Los datos enviados quedaron confirmados.'}</li><li><strong>Tiempo y comunicación</strong>Mayor latencia registrada: ${number(run.maxLatency/60,1)} min de ida. Corrección cinemática acumulada del reloj: ${number(run.kinematicLag*1000,1)} ms.</li></ul><p class="microcopy">La corrección del reloj usa solo movimiento respecto a una referencia heliocéntrica ideal. No compara directamente relojes terrestres ni incluye gravedad.</p><h4>HALLAZGOS</h4><div class="findings-list">${findings.length?findings.map(f=>`<article><strong>${esc(f.name)}</strong><span>${f.science} ciencia · ${f.data} MB · ${esc(f.method)}</span></article>`).join(''):'<p class="empty-state">Aún no se registraron hallazgos de superficie.</p>'}</div></section><section><h4>BITÁCORA DE DECISIONES</h4><ol class="report-timeline">${[...run.log].sort((a,b)=>a.at-b.at).map(entry=>`<li><span>T + ${time(entry.at)}</span><strong>${esc(entry.title)}</strong><p>${esc(entry.detail)}</p></li>`).join('')}</ol></section></div>${storyReport(run)}<div class="report-actions"><button class="primary-action compact" id="replay-expedition"><span>REPETIR CON EL MISMO PLAN</span>${eye}</button><button class="room-action-secondary" id="report-export">Descargar informe</button><button class="room-action-secondary" data-logbook>Ver bitácora</button><button class="room-action-secondary" data-report-campaign>Explorar la campaña</button><button class="room-action-secondary" id="report-return-hub">Volver a la estación</button></div><details class="model-details"><summary>Comparar mis últimas expediciones</summary><div class="history-table">${comparisonTable()}</div></details></div>`;
    $$('[data-recommendation]').forEach(button => button.addEventListener('click', () => {
      setRun(M.recordRecommendation(run, button.dataset.recommendation));
      const panel = $('.story-report', content);
      panel.outerHTML = storyReport(run);
      const heading = $('#story-report-title');
      heading.tabIndex = -1;
      heading.focus();
    }));
    $('#replay-expedition').addEventListener('click',()=>newPlan(run.config, run));$('#report-return-hub').addEventListener('click',()=>leave(true));$('#report-export').addEventListener('click',downloadReport);
  }
  function comparisonTable() {
    const decisions = { reconfigure: 'Reconfigurar', isolate: 'Aislar', wait: 'Esperar' };
    const echoActions = { local: 'Alex', earth: 'Tierra' };
    const rows = [...history].reverse().map(entry => `<tr>
      <td>${esc(entry.pilot)} · ${esc(M.ROUTES[entry.route].name)}</td>
      <td>${decisions[entry.decision] ?? '—'}</td>
      <td>${echoActions[entry.echoDecision] ?? '—'}</td>
      <td>${Number.isFinite(entry.energy) ? number(entry.energy) + ' Wh' : '—'}</td>
      <td>${EQUIPMENT[entry.disabled]?.name ?? (Number.isFinite(entry.energy) ? 'Ninguno aislado' : '—')}</td>
      <td>${Number.isFinite(entry.delivered) ? number(entry.delivered) + ' MB' : '—'}</td>
      <td>${entry.evidence == null ? '—' : entry.evidence ? 'Recibido' : 'Pendiente'}</td>
      <td>${number(entry.score)} / 100</td>
    </tr>`).join('');
    return `<div class="story-compare-wrap"><table class="story-compare"><thead><tr>
      <th>Partida</th><th>Avería</th><th>Consulta Faro 7</th><th>Energía al cierre</th><th>Instrumento aislado</th><th>Datos recibidos</th><th>Archivo</th><th>Puntuación</th>
    </tr></thead><tbody>${rows}</tbody></table></div>`;
  }
  function downloadReport(){const text=`# AVI HORIZONS — ECOS DE MARTE\n\nPersonaje: ${run.pilot}\nResultado: ${run.summary.rank}\nPuntuación: ${run.summary.score}/100\nObjetivo: ${M.OBJECTIVES[run.objective].name}\nRuta: ${M.ROUTES[run.route].name}\nDuración de misión: ${time(run.elapsed)}\nCiencia: ${run.science} u.\nDatos recibidos: ${run.deliveredData} MB\nIntegridad: ${run.integrity}%\n\n## Bitácora\n\n${[...run.log].sort((a,b)=>a.at-b.at).map(e=>`- T + ${time(e.at)} — ${e.title}: ${e.detail}`).join('\n')}\n\n## Modelo\n\nJuego educativo con recursos, vehículos y terreno ficticios. Hohmann usa órbitas circulares coplanares; ruta intensiva parametrizada. No usa efemérides actuales. Corrección cinemática de relojes sin gravedad.\n\n${run.story ? `Referencia de enlace de Faro 7: ${M.relayTiming(run.story.relay).source}\n` : ''}
Fuentes: https://ssd.jpl.nasa.gov/astro_par.html y https://science.nasa.gov/learn/basics-of-space-flight/chapter4-1/\n`;
    const blob=new Blob([text],{type:'text/markdown;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='AVI_HORIZONS_Informe_de_mision.md';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function tick(now){
    frame=null;if(!active)return;
    const dt=last?Math.min((now-last)/1000,1):0;last=now;
    if(!document.hidden&&!document.querySelector('dialog[open]')){
      accrued+=dt;
      if(accrued>=.2){const delta=accrued;accrued=0;
        if(run.stage==='flight'&&playing)setRun(M.advanceFlight(run,delta*3*M.DAY*getFlightSpeed()));
        else if(run.stage==='incident'&&playing)setRun(M.advanceIncident(run,delta*6));
        else if(run.stage==='surface'){
          let x=run.surfaceX;
          if(targetPoint){const target=M.POINTS[targetPoint].x,difference=target-x;x+=Math.sign(difference)*Math.min(Math.abs(difference),delta*.14);}
          else{x+=((surfaceKeys.has('right')?1:0)-(surfaceKeys.has('left')?1:0))*delta*.14;}
          if(x!==run.surfaceX){setRun(M.moveRover(run,x,delta*6));if(run.stage==='surface'&&targetPoint&&Math.abs(run.surfaceX-M.POINTS[targetPoint].x)<.001){const id=targetPoint;targetPoint=null;$('#surface-navigation-note').hidden=true;openPoint(id);}}
        }
      }
    }else accrued=0;
    frame=requestAnimationFrame(tick);
  }
  function pause(){if(active&&!document.querySelector('dialog[open]')){surfaceKeys.clear();openDialog('expedition-pause-dialog');}}
  $('#continue-mission').addEventListener('click',resume);
  $('#replace-continue').addEventListener('click',()=>{$('#expedition-replace-dialog').close();resume();});
  $('#replace-new').addEventListener('click',()=>{$('#expedition-replace-dialog').close();newPlan(pendingConfig);});
  $('#expedition-home').addEventListener('click',pause);$('#expedition-pause').addEventListener('click',pause);
  $('#expedition-resume').addEventListener('click',()=>$('#expedition-pause-dialog').close());
  $('#expedition-settings').addEventListener('click',()=>{$('#expedition-pause-dialog').close();openDialog('settings-dialog');});
  $('#expedition-save-menu').addEventListener('click',()=>{$('#expedition-pause-dialog').close();leave(false);});
  $('#expedition-abort').addEventListener('click',()=>{$('#expedition-pause-dialog').close();setRun(M.finishRun(run,'La tripulación cerró la misión con los resultados disponibles.',true));});
  $('#expedition-comms').addEventListener('click',showCommunications);$('#expedition-science').addEventListener('click',()=>openDialog('science-dialog'));
  window.addEventListener('keydown',event=>{
    if(!active||document.querySelector('dialog[open]')||event.ctrlKey||event.altKey||event.metaKey||event.target.matches('input,textarea,select'))return;
    const key=event.key.toLowerCase();if(key==='escape'){event.preventDefault();pause();return;}
    if(run.stage!=='surface')return;
    const direction=['a','arrowleft'].includes(key)?'left':['d','arrowright'].includes(key)?'right':null;
    if(direction){event.preventDefault();targetPoint=null;surfaceKeys.add(direction);if(!event.repeat)setRun(M.moveRover(run,run.surfaceX+(direction==='right'?.012:-.012)));}
    else if(key==='e'&&!event.repeat){event.preventDefault();interactSurface();}else if(key==='q'&&!event.repeat){event.preventDefault();useSurfaceAbility();}
  });
  window.addEventListener('keyup',event=>{if(['a','arrowleft'].includes(event.key.toLowerCase()))surfaceKeys.delete('left');if(['d','arrowright'].includes(event.key.toLowerCase()))surfaceKeys.delete('right');});
  window.addEventListener('blur',()=>surfaceKeys.clear());
  window.addEventListener('pagehide',()=>{ if(active) save(true); });
  document.addEventListener('horizons:logbook',()=>{ if(active) save(true); });
  updateMenu();
  if (run) logbook.expedition(run);
  return { openPlanning, resume, leave, getRun:()=>run };
}

return {createMission};
})();
__AVI["mission-science.js"] = (() => {
const { clockRatio, ROUTES, orbitState } = __AVI["mission-model.mjs"];

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const fmt = n => Number(n).toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2});
function connectScience({openDialog,getRun}) {
  let selectedPlanet='Mars', assistGain=true;
  const bodies=[
    {id:'Earth',name:'Tierra',radius:100,color:'#8dbbd4',text:'Punto de partida de ECOS DE MARTE. Las posiciones del juego usan una órbita circular de referencia de 1 UA.'},
    {id:'Moon',name:'Luna',radius:72,color:'#c3bdc8',text:'Satélite de la Tierra. Se muestra separada para facilitar su selección; su representación aquí no está a escala.'},
    {id:'Venus',name:'Venus',radius:62,color:'#d5b288',text:'Un cuerpo útil para estudiar encuentros gravitatorios y la relación entre trayectoria y energía. Consulta el experimento de asistencia del observatorio.'},
    {id:'Mars',name:'Marte',radius:137,color:'#d58b70',text:'Destino jugable de ECOS DE MARTE. Configura HORIZONS 2, resuelve la avería, aterriza y devuelve datos de una exploración ficticia.'},
    {id:'Jupiter',name:'Júpiter',radius:188,color:'#c5a68e',text:'Un destino del archivo de navegación para explorar conceptos de asistencia gravitatoria. La campaña actual se desarrolla entre la Tierra y Marte.'},
  ];
  function showMap(){
    const run=getRun(),selected=bodies.find(body=>body.id===selectedPlanet);
    $('#star-map-content').innerHTML=`<div class="star-map-layout"><svg class="system-map" viewBox="0 0 600 480" aria-label="Mapa esquemático del sistema de navegación, distancias y fases no a escala"><defs><radialGradient id="star-map-sun"><stop stop-color="#f2c582" stop-opacity=".5"/><stop offset="1" stop-color="#f2c582" stop-opacity="0"/></radialGradient></defs><circle cx="300" cy="240" r="40" fill="url(#star-map-sun)"/><circle cx="300" cy="240" r="9" fill="#edc17b"/>${bodies.map((body,index)=>{const a=-.9+index*1.36,x=body.id==='Moon'?300+Math.cos(-.9)*100+23:300+Math.cos(a)*body.radius,y=body.id==='Moon'?240+Math.sin(-.9)*100-12:240+Math.sin(a)*body.radius;return `${body.id==='Moon'?'':`<circle cx="300" cy="240" r="${body.radius}" fill="none" stroke="#c1a4db1a"/>`}<circle cx="${x}" cy="${y}" r="${body.id==='Jupiter'?13:7}" fill="${body.color}"/><text x="${x+12}" y="${y-10}" fill="#c6b4d5" font-size="11">${body.name.toUpperCase()}</text>`;}).join('')}</svg><div class="planet-list">${bodies.map(body=>`<button data-planet="${body.id}" class="${body.id===selectedPlanet?'selected':''}"><i style="background:${body.color}"></i>${body.name}<span>${body.id==='Mars'?'MISIÓN':'ARCHIVO'}</span></button>`).join('')}</div></div><div class="planet-description"><p class="eyebrow">${selected.name.toUpperCase()} / ${selected.id==='Mars'?'ECOS DE MARTE':'ARCHIVO ESTELAR'}</p><p>${selected.text}</p>${run?`<small>Expedición actual: ${ROUTES[run.route].name} · avance ${(run.progress*100).toFixed(0)}% · distancia simulada a la Tierra ${orbitState(run.progress,run.route).distanceAU.toFixed(2)} UA.</small>`:''}</div><p class="panel-footnote">Mapa conceptual: tamaños, distancias y posiciones no a escala. La trayectoria de la misión utiliza su propio modelo de encuentro, no estas posiciones ilustrativas.</p>`;
    $$('[data-planet]').forEach(button=>button.addEventListener('click',()=>{selectedPlanet=button.dataset.planet;showMap();}));
    openDialog('star-map-dialog');
  }
  $('#menu-star-map').addEventListener('click',showMap);$('#expedition-map').addEventListener('click',showMap);
  const tabs=$$('.lab-tabs [role=tab]');
  function selectLab(tab){tabs.forEach(item=>{const active=item===tab;item.setAttribute('aria-selected',String(active));item.tabIndex=active?0:-1;document.getElementById(item.getAttribute('aria-controls')).hidden=!active;});}
  tabs.forEach((tab,index)=>{tab.addEventListener('click',()=>selectLab(tab));tab.addEventListener('keydown',event=>{let next=index;if(event.key==='ArrowRight')next=(index+1)%tabs.length;else if(event.key==='ArrowLeft')next=(index-1+tabs.length)%tabs.length;else return;event.preventDefault();selectLab(tabs[next]);tabs[next].focus();});});
  function updateSpeed(){const beta=Number($('#lab-beta').value)/100,ratio=clockRatio(beta);$('#lab-beta-value').textContent=`${fmt(beta)} c`;$('#lab-proper').innerHTML=`${fmt(10*ratio)} <small>años</small>`;$('#lab-proper-bar').style.width=`${ratio*100}%`;}
  function updateGravity(){const r=Number($('#lab-radius').value);$('#lab-radius-value').textContent=`${r} rₛ`;$('#lab-gravity-proper').innerHTML=`${fmt(10*Math.sqrt(1-1/r))} <small>años</small>`;$('#gravity-clock-dot').style.left=`${30+r*2.4}%`;}
  function updateAssist(){const degrees=Number($('#lab-angle').value),angle=degrees*Math.PI/180,v=13,u=10;const before=assistGain?v-u:v+u,after=Math.sqrt(v*v+u*u+(assistGain?-1:1)*2*v*u*Math.cos(angle));$('#lab-angle-value').textContent=`${degrees}°`;$('#assist-vector').setAttribute('d',`M 240 90 l ${Math.cos(angle)*(assistGain?-1:1)*140} ${-Math.sin(angle)*70}`);$('#assist-results').innerHTML=`<div><span>ANTES / MARCO SOLAR</span><strong>${fmt(before)} km/s</strong></div><div><span>DESPUÉS / MARCO SOLAR</span><strong>${fmt(after)} km/s</strong></div><p>En el marco del planeta: 10 km/s antes y después. La energía no aparece de la nada: se intercambia con el movimiento orbital del planeta.</p>`;$('#assist-gain').classList.toggle('selected',assistGain);$('#assist-brake').classList.toggle('selected',!assistGain);}
  $('#lab-beta').addEventListener('input',updateSpeed);$('#lab-radius').addEventListener('input',updateGravity);$('#lab-angle').addEventListener('input',updateAssist);
  $('#assist-gain').addEventListener('click',()=>{assistGain=true;updateAssist();});$('#assist-brake').addEventListener('click',()=>{assistGain=false;updateAssist();});
  function showTimeLab(){updateSpeed();updateGravity();updateAssist();openDialog('time-lab-dialog');}
  $('#menu-time-lab').addEventListener('click',showTimeLab);updateSpeed();updateGravity();updateAssist();
  return {showMap,showTimeLab};
}

return {connectScience};
})();
__AVI["app.js"] = (() => {
const { connectFaroDemo } = __AVI["faro-demo.js"];
const { defaultSettings, normalizeSettings } = __AVI["settings-model.mjs"];
const { connectStory } = __AVI["story.js"];
const { createLogbook } = __AVI["logbook.js"];
const { createCampaign } = __AVI["campaign.js"];
const { connectHorizons } = __AVI["horizons.js"];
const { createHub } = __AVI["hub.js"];
const { createMission } = __AVI["mission.js"];
const { connectScience } = __AVI["mission-science.js"];






/** AVI HORIZONS — intro and explorable hub. No external services or telemetry. */



const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const storageKey = 'avi-horizons.intro.v1';
const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
let saved = {};
try { saved = JSON.parse(localStorage.getItem(storageKey) || '{}') || {}; } catch { /* Storage is optional. */ }
const preferences = normalizeSettings(saved, motionQuery.matches);
const state = {
  sound: false, // Always wait for a gesture before starting Web Audio.
  pilot: ['AVI', 'MAQUI'].includes(saved.pilot) ? saved.pilot : 'AVI',
  pilotConfirmed: saved.pilotConfirmed === true,
};
function persist() {
  try {
    localStorage.setItem(storageKey, JSON.stringify({ ...preferences, pilot: state.pilot, pilotConfirmed: state.pilotConfirmed }));
    return true;
  } catch { return false; }
}

const preloader = $('#preloader');
const main = $('#main');
let introTimer;
function runIntro() {
  const previous = document.activeElement;
  clearTimeout(introTimer);
  preloader.hidden = false;
  main.inert = true;
  introTimer = setTimeout(() => {
    preloader.hidden = true;
    main.inert = false;
    document.body.classList.add('ready');
    (main.contains(previous) ? previous : $('#mission-button')).focus({ preventScroll: true });
  }, 5000);
}

const desktopQuery = window.matchMedia('(orientation: portrait), (max-width: 800px), (hover: none) and (pointer: coarse)');
const desktopDialog = $('#desktop-only');
function checkDesktop() {
  if (desktopQuery.matches && !desktopDialog.open) desktopDialog.showModal();
  if (!desktopQuery.matches && desktopDialog.open) desktopDialog.close();
}
desktopQuery.addEventListener('change', checkDesktop);
desktopDialog.addEventListener('cancel', event => event.preventDefault());

const fullscreenAvailable = !!document.fullscreenEnabled && typeof document.documentElement.requestFullscreen === 'function';
const fullscreenButtons = $$('[data-fullscreen]');
const fullscreenHint = 'Oculta la barra del navegador. Pulsa Esc para volver.';
function renderFullscreen(message = fullscreenHint) {
  const active = !!document.fullscreenElement;
  for (const button of fullscreenButtons) button.setAttribute('aria-pressed', String(active));
  const label = active ? 'Salir de pantalla completa' : 'Pantalla completa';
  $('#home-fullscreen').setAttribute('aria-label', label);
  $('#home-fullscreen').title = label;
  $('#settings-fullscreen').textContent = active ? 'Salir' : 'Activar';
  $('#fullscreen-info').textContent = message;
}
async function toggleFullscreen() {
  if (!fullscreenAvailable) return;
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
    renderFullscreen();
  } catch (error) {
    console.warn('Pantalla completa rechazada por el navegador:', error.message);
    const message = 'El navegador no pudo activar este modo. En computadora, prueba F11.';
    renderFullscreen(message);
    $('#settings-status').textContent = message;
    if (!$('#settings-dialog').open) showToast(message);
  }
}
$('#home-fullscreen').hidden = !fullscreenAvailable;
$('#fullscreen-on-play-option').hidden = !fullscreenAvailable;
$('#settings-fullscreen').disabled = !fullscreenAvailable;
renderFullscreen(fullscreenAvailable ? fullscreenHint : 'Pantalla completa no está disponible aquí. En computadora, prueba F11.');
fullscreenButtons.forEach(button => button.addEventListener('click', toggleFullscreen));
document.addEventListener('fullscreenchange', () => renderFullscreen());
$('#fullscreen-on-play').addEventListener('change', event => {
  preferences.fullscreenOnEntry = event.target.checked;
  applySettings();
});
$('#replay-intro').addEventListener('click', runIntro);

// Native dialogs provide focus containment and Escape-to-close behavior.
const returnFocus = new WeakMap();
function openDialog(id) {
  const dialog = document.getElementById(id);
  if (!dialog || dialog.open) return;
  returnFocus.set(dialog, document.activeElement);
  if (id === 'character-dialog') {
    $(`input[name=pilot][value="${state.pilot}"]`).checked = true;
    renderSelection();
  }
  dialog.showModal();
  document.body.style.overflow = 'hidden';
}
$$('[data-dialog]').forEach(button => button.addEventListener('click', () => openDialog(button.dataset.dialog)));
$('#mission-button').addEventListener('click', () => choosePilot('story'));
$('#campaign-button').addEventListener('click', () => choosePilot('campaign'));
$('#change-pilot').addEventListener('click', () => choosePilot('menu'));
$('#station-button').addEventListener('click', () => choosePilot('station'));
$('#station-campaign').addEventListener('click', () => showCampaign());
document.addEventListener('click', event => {
  if (event.target.closest('[data-report-campaign]')) showCampaign();
});
$$('dialog:not(#desktop-only)').forEach(dialog => {
  $('[data-close]', dialog).addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    document.body.style.overflow = document.querySelector('dialog[open]') ? 'hidden' : '';
    const target = returnFocus.get(dialog);
    if (target && !target.closest('[hidden], [inert]')) target.focus({ preventScroll: true });
  });
});

// Arrow keys move between tabs, while Tab advances to the selected panel.
function connectTabs(selector) {
  const tabs = $$(selector);
  function activate(tab) {
    tabs.forEach(item => {
      const active = item === tab;
      item.setAttribute('aria-selected', String(active));
      item.tabIndex = active ? 0 : -1;
      document.getElementById(item.getAttribute('aria-controls')).hidden = !active;
    });
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activate(tab));
    tab.addEventListener('keydown', event => {
      let next = index;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = tabs.length - 1;
      else return;
      event.preventDefault();
      activate(tabs[next]);
      tabs[next].focus();
    });
  });
}
connectTabs('.science-tabs [role=tab]');
connectTabs('.settings-tabs [role=tab]');
function renderSelection() {
  $$('input[name=pilot]').forEach(input => {
    $('.selection-indicator', input.parentElement).firstChild.textContent = input.checked ? 'SELECCIONADO ' : 'SELECCIONAR ';
  });
}
$$('input[name=pilot]').forEach(input => input.addEventListener('change', renderSelection));
function renderPilot() {
  $('#selected-pilot').hidden = !state.pilotConfirmed;
  $('#pilot-status').textContent = `Piloto: ${state.pilot}`;
}
let toastTimeout;
function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => { toast.hidden = true; }, 3500);
}
let hub;
let mission;
let science;
let campaign;
let nextScreen = 'campaign';
let requestedLevel = null;

function savePilot(pilot) {
  state.pilot = pilot;
  state.pilotConfirmed = true;
  persist();
  renderPilot();
}

function choosePilot(screen, level = null) {
  nextScreen = screen;
  requestedLevel = level;
  openDialog('character-dialog');
}

function showMenu() {
  main.hidden = false;
  main.inert = false;
  resizeStars();
  $('#mission-button').focus({ preventScroll: true });
}

function showCampaign(level = null) {
  if (!$('#hub-screen').hidden) hub.exit();
  if (!$('#expedition-screen').hidden) mission.leave(false);
  if (campaign.isActive()) campaign.leave(() => {});
  main.hidden = true;
  main.inert = true;
  campaign.open(level);
}

$('#confirm-pilot').addEventListener('click', () => {
  savePilot($('input[name=pilot]:checked').value);
  $('#character-dialog').close();
  $('#toast').hidden = true;
  if (nextScreen === 'campaign') showCampaign(requestedLevel);
  if (nextScreen === 'station') hub.enter();
  if (nextScreen === 'story') story.intro();
});

// Separate gain buses let the same master volume control all synthesized audio.
let audioContext, masterGain, ambientGain, effectsGain;
let audioRequest = 0;
let wantsSound = false;
let audioChoiceMade = false;
const soundtrack = $('#soundtrack');
function syncSoundtrack() {
  soundtrack.volume = (preferences.volume / 100) * (preferences.musicVolume / 100);
  if (!wantsSound || !preferences.music || document.hidden) {
    soundtrack.pause();
  } else if (soundtrack.paused) {
    soundtrack.play().catch(error => {
      if (error.name === 'AbortError' || !wantsSound || !preferences.music) return;
      $('#settings-status').textContent = 'La música de fondo no está disponible.';
    });
  }
}
function updateAudio() {
  syncSoundtrack();
  if (!masterGain) return;
  const time = audioContext.currentTime;
  masterGain.gain.setTargetAtTime(state.sound ? preferences.volume / 100 : 0, time, .07);
  ambientGain.gain.setTargetAtTime(preferences.ambient ? preferences.ambientVolume / 100 * .12 : 0, time, .12);
  effectsGain.gain.setTargetAtTime(preferences.effects ? preferences.effectsVolume / 100 : 0, time, .07);
}

function initAudio() {
  const AudioClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioClass) throw new Error('Audio unavailable');
  audioContext = new AudioClass();
  masterGain = audioContext.createGain();
  masterGain.gain.value = 0;
  masterGain.connect(audioContext.destination);
  ambientGain = audioContext.createGain();
  ambientGain.gain.value = 0;
  effectsGain = audioContext.createGain();
  effectsGain.gain.value = 0;
  effectsGain.connect(masterGain);
  const filter = audioContext.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 350;
  ambientGain.connect(filter);
  filter.connect(masterGain);
  [65.406, 98, 130.813].forEach((frequency, index) => {
    const oscillator = audioContext.createOscillator();
    const voice = audioContext.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    voice.gain.value = index === 0 ? 0.6 : 0.16;
    oscillator.connect(voice);
    voice.connect(ambientGain);
    oscillator.start();
  });
}

async function setSound(enabled) {
  const request = ++audioRequest;
  wantsSound = enabled;
  audioChoiceMade = true;
  if (!enabled) {
    state.sound = false;
    $('#settings-status').textContent = 'Sonido silenciado.';
    updateAudio();
    renderSettings();
    return;
  }
  // Start the local track while the gesture still authorizes playback.
  syncSoundtrack();
  try {
    if (!audioContext) initAudio();
    await audioContext.resume();
    if (request !== audioRequest) return;
    state.sound = true;
    $('#settings-status').textContent = 'Sonido activado.';
  } catch {
    if (request !== audioRequest) return;
    state.sound = wantsSound = false;
    const message = 'El sonido no está disponible en este navegador.';
    $('#settings-status').textContent = message;
    $('#toast').textContent = message;
    $('#toast').hidden = false;
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => { $('#toast').hidden = true; }, 3500);
  }
  updateAudio();
  renderSettings();
}

const ranges = { volume: 'volume', 'music-volume': 'musicVolume', 'ambient-volume': 'ambientVolume', 'effects-volume': 'effectsVolume' };
const switches = {
  'music-toggle': 'music', 'ambient-toggle': 'ambient', 'effects-toggle': 'effects', 'motion-toggle': 'reducedMotion',
  'large-text-toggle': 'largeText', 'contrast-toggle': 'highContrast',
};
function renderSettings() {
  document.body.dataset.reducedMotion = String(preferences.reducedMotion);
  document.body.dataset.largeText = String(preferences.largeText);
  document.body.dataset.highContrast = String(preferences.highContrast);
  document.body.dataset.touchControls = preferences.touchControls;
  $('#touch-controls').value = preferences.touchControls;
  $('#flight-speed-setting').value = preferences.flightSpeed;
  const playback = $('#playback-speed');
  if (playback) playback.value = preferences.flightSpeed;
  $('#sound-toggle').checked = state.sound;
  $('#fullscreen-on-play').checked = preferences.fullscreenOnEntry;
  $('#quick-sound').setAttribute('aria-pressed', String(state.sound));
  $('#quick-sound').setAttribute('aria-label', state.sound ? 'Desactivar sonido' : 'Activar sonido');
  for (const [id, key] of Object.entries(switches)) document.getElementById(id).checked = preferences[key];
  for (const [id, key] of Object.entries(ranges)) {
    document.getElementById(id).value = preferences[key];
    document.getElementById(id + '-value').value = preferences[key] + '%';
  }
}
function applySettings(message = 'Ajustes guardados en este navegador.') {
  renderSettings();
  updateAudio();
  $('#settings-status').textContent = persist() ? message : 'Ajustes aplicados para esta sesión.';
}
$('#quick-sound').addEventListener('click', () => setSound(!wantsSound));
$('#sound-toggle').addEventListener('change', event => setSound(event.target.checked));
for (const [id, key] of Object.entries(ranges)) {
  document.getElementById(id).addEventListener('input', event => {
    preferences[key] = Number(event.target.value);
    applySettings();
  });
}
for (const [id, key] of Object.entries(switches)) {
  document.getElementById(id).addEventListener('change', event => {
    preferences[key] = event.target.checked;
    applySettings();
    if (key === 'reducedMotion') drawStars();
  });
}
$('#touch-controls').addEventListener('change', event => {
  preferences.touchControls = event.target.value;
  applySettings();
});
function changeFlightSpeed(speed) {
  preferences.flightSpeed = Number(speed);
  applySettings();
}
$('#flight-speed-setting').addEventListener('change', event => changeFlightSpeed(event.target.value));
$('#settings-reset').addEventListener('click', () => {
  Object.assign(preferences, defaultSettings(motionQuery.matches));
  applySettings('Valores de fábrica restablecidos.');
  drawStars();
});
document.addEventListener('visibilitychange', () => {
  syncSoundtrack();
  if (!audioContext) return;
  if (document.hidden) audioContext.suspend().catch(() => {});
  else if (wantsSound) audioContext.resume().catch(() => {});
});

// Deterministic 2D star field. No redraws when motion is reduced, hidden, or inside the hub.
const canvas = $('#stars');
const ctx = canvas.getContext('2d');
let stars = [], width = 0, height = 0, lastFrame = 0;
function resizeStars() {
  const rect = canvas.getBoundingClientRect();
  width = rect.width; height = rect.height;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
  if (!ctx) return;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  let seed = 71;
  const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  stars = Array.from({ length: Math.round(Math.min(width * height / 4500, 320)) }, () => ({ x: random() * width, y: random() * height, r: random() > .96 ? 1.4 : random() * .7 + .25, a: random() * .55 + .15, phase: random() * 6.28, drift: 4 + random() * 13 }));
  drawStars();
}
function drawStars(time = 0) {
  if (!ctx) return;
  ctx.clearRect(0, 0, width, height);
  stars.forEach(star => {
    const opacity = star.a * (preferences.reducedMotion ? 1 : .82 + Math.sin(time / 5000 + star.phase) * .18);
    ctx.fillStyle = `rgba(199,210,255,${opacity})`;
    ctx.beginPath(); ctx.arc((star.x + time / 1000 * star.drift) % width, (star.y + time / 2400 * star.drift) % height, star.r, 0, Math.PI * 2); ctx.fill();
  });
}
function animate(time) {
  if (!preferences.reducedMotion && !document.hidden && !main.hidden && time - lastFrame > 80) { drawStars(time); lastFrame = time; }
  requestAnimationFrame(animate);
}
let resizeFrame;
window.addEventListener('resize', () => { cancelAnimationFrame(resizeFrame); resizeFrame = requestAnimationFrame(resizeStars); });
window.addEventListener('pointermove', event => {
  if (main.hidden || preferences.reducedMotion || event.pointerType === 'touch' || window.innerWidth < 650) return;
  $('.station-art').style.setProperty('--px', `${(event.clientX / window.innerWidth - .5) * -9}px`);
  $('.station-art').style.setProperty('--py', `${(event.clientY / window.innerHeight - .5) * -7}px`);
}, { passive: true });
const logbook = createLogbook(openDialog);
hub = createHub({
  logbook,
  getPilot: () => state.pilot,
  getReducedMotion: () => preferences.reducedMotion,
  openDialog,
  onExit: () => { main.hidden = false; main.inert = false; resizeStars(); $('#mission-button').focus({ preventScroll: true }); },
  onPlan: config => { hub.exit(); mission.openPlanning(config); },
  onTimeLab: () => science.showTimeLab(),
});
mission = createMission({
  logbook,
  getPilot: () => state.pilot,
  onPilot: pilot => { state.pilot = pilot; state.pilotConfirmed = true; persist(); renderPilot(); },
  getReducedMotion: () => preferences.reducedMotion,
  openDialog,
  getFlightSpeed: () => preferences.flightSpeed,
  onFlightSpeed: changeFlightSpeed,
  onHub: () => hub.enter(),
  onMenu: () => { main.hidden = false; main.inert = false; resizeStars(); $('#mission-button').focus({ preventScroll: true }); },
});
const story = connectStory({
  openDialog, logbook, getPilot: () => state.pilot,
  getRun: () => $('#expedition-screen').hidden ? null : mission.getRun(),
  startExpedition: () => { hub.enter(); hub.visitHangar(); },
  playSignal: () => playEffect('signal'),
});
science = connectScience({ openDialog, getRun: () => mission.getRun() });
function playEffect(name) {
  if (!state.sound || !preferences.effects || !audioContext || audioContext.state !== 'running') return;
  const frequencies = { click: [680], launch: [164, 246], scan: [540, 810], success: [392, 523, 659], signal: [427, 374, 551, 319] }[name] ?? [];
  frequencies.forEach((frequency, index) => {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const start = audioContext.currentTime + index * .075;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0, start);
    const duration = name === 'click' ? .055 : .2;
    gain.gain.linearRampToValueAtTime(name === 'click' ? .075 : .055, start + .014);
    gain.gain.linearRampToValueAtTime(0, start + duration);
    oscillator.connect(gain);
    gain.connect(effectsGain);
    oscillator.start(start);
    oscillator.stop(start + duration + .01);
  });
}

campaign = createCampaign({
  logbook,
  getPilot: () => state.pilot, setPilot: savePilot, getReducedMotion: () => preferences.reducedMotion,
  onStation: () => hub.enter(), onMenu: showMenu, openDialog,
  showTimeLab: experiment => { science.showTimeLab(); $(`#lab-${experiment}-tab`).click(); },
  playEffect,
});
connectHorizons({
  logbook,
  openDialog, getPilot: () => state.pilot,
  startGame: level => state.pilotConfirmed ? showCampaign(level) : choosePilot('campaign', level),
});
connectFaroDemo({ openDialog, logbook, getPilot: () => state.pilot, playEffect });
document.addEventListener('click', event => {
  const control = event.target.closest('button, summary, a[href]');
  if (!event.isTrusted || !control || control.disabled || desktopDialog.open) return;
  const startsGame = control.matches('#mission-button, #faro-demo-button, #continue-mission, #campaign-button, #station-button');
  if (startsGame && !audioChoiceMade) setSound(true).then(() => playEffect('click'));
  else playEffect('click');
  if (startsGame && preferences.fullscreenOnEntry && fullscreenAvailable && !document.fullscreenElement) toggleFullscreen();
}, true);
renderSettings(); renderPilot(); resizeStars(); requestAnimationFrame(animate); runIntro(); checkDesktop();

return {};
})();
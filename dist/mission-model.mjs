import { normalizeLoadout, evaluateLoadout } from './hub-model.mjs';
import { RELAY_CASES, ECHO_WINDOW, CONTROL_PROCESSING, ECHO_LOCAL_COST, ECHO_LINK_COST, RECOMMENDATIONS } from './story-data.mjs';

// Scientific constants: NASA/JPL SSD astro_par.html. Circular, coplanar educational model.
export const AU = 149597870700;
export const C = 299792458;
export const DAY = 86400;
export const MU_SUN = 1.3271244e20;
export const MARS_RADIUS_AU = 1.524;
const A = (1 + MARS_RADIUS_AU) / 2;
const E = (MARS_RADIUS_AU - 1) / (MARS_RADIUS_AU + 1);
export const HOHMANN_SECONDS = Math.PI * Math.sqrt((A * AU) ** 3 / MU_SUN);
export const ROUTES = Object.freeze({
  hohmann: { name: 'Transferencia Hohmann', days: HOHMANN_SECONDS / DAY, fuel: 35, energy: 90, model: 'Órbitas circulares y coplanares · transferencia kepleriana' },
  intensive: { name: 'Propulsión intensiva', days: 180, fuel: 55, energy: 170, model: 'Escenario parametrizado del juego · no es una solución orbital calculada' },
});
export const VEHICLES = Object.freeze({ light: { name: 'VECTOR-L', capacity: 1250, fuel: 85, cost: 120 }, heavy: { name: 'VECTOR-H', capacity: 1500, fuel: 100, cost: 200 } });
export const SITES = Object.freeze({ plain: { name: 'Planicie Aurora', risk: 4, factor: 1, description: 'Terreno ficticio abierto. Menor exigencia de aterrizaje.' }, crater: { name: 'Borde del cráter', risk: 12, factor: 1.25, description: 'Terreno ficticio más exigente, con mayor valor potencial de muestras.' } });
export const OBJECTIVES = Object.freeze({ survey: { name: 'Reconocimiento general', description: 'Explora al menos dos puntos y devuelve datos científicos.' }, imaging: { name: 'Cartografía visual', instrument: 'camera', description: 'Registra el panorama con la cámara y devuelve sus imágenes.' }, minerals: { name: 'Análisis de materiales', instrument: 'spectrometer', description: 'Analiza el afloramiento con el espectrómetro y devuelve sus datos.' } });
export const POINTS = Object.freeze({
  landing: { name: 'HORIZONS 2', x: .12, kind: 'base' },
  panorama: { name: 'Mirador del horizonte', x: .31, kind: 'camera', energy: 65, data: 24, science: 22 },
  mineral: { name: 'Afloramiento mineral', x: .59, kind: 'spectrometer', energy: 100, data: 36, science: 34 },
  echo: { name: 'Eco del subsuelo', x: .86, kind: 'sample', energy: 85, data: 28, science: 26 },
});
export const STAGES = ['plan', 'launch', 'flight', 'incident', 'debrief', 'arrival', 'landing', 'surface', 'report'];
const clone = value => structuredClone(value);
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
function log(run, title, detail, at = run.elapsed) { run.log.push({ at, title, detail }); }
export function orbitState(progress = 0, routeId = 'hohmann') {
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
export function clockRatio(beta) { const b = clamp(Number(beta) || 0, 0, .999999); return Math.sqrt(1 - b * b); }
export function createRun(pilot, config, story = false) {
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
export function validatePlan(run) {
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
export function choosePlan(run, options) {
  const next = clone(run);
  if (next.stage !== 'plan') return next;
  for (const key of ['route', 'site', 'vehicle', 'objective']) if (key in options) next[key] = options[key];
  if (next.story && Object.hasOwn(RELAY_CASES, options.relay ?? '')) next.story.relay = options.relay;
  next.fuel = VEHICLES[next.vehicle]?.fuel || 0; next.initialFuel = next.fuel;
  return next;
}
export function beginLaunch(run) {
  if (run.stage !== 'plan' || validatePlan(run).length) return clone(run);
  const next = clone(run); next.stage = 'launch'; next.launchChecks = [];
  if (next.story) {
    const relay = relayTiming(next.story.relay);
    log(next, 'Referencia del enlace en superficie', `${relay.label}; ${relay.distanceKm.toLocaleString('es-PE')} km publicados por NASA. Respuesta ideal: ${(relay.roundTrip / 60).toFixed(1)} min, incluidos 2 min simulados de control.`);
  }
  log(next, 'Plan de misión aprobado', `${ROUTES[next.route].name}; destino ${SITES[next.site].name}; objetivo ${OBJECTIVES[next.objective].name}.`);
  return next;
}
export function checkLaunch(run, id) {
  const next = clone(run); if (next.stage !== 'launch' || !['power', 'navigation', 'comms'].includes(id)) return next;
  if (!next.launchChecks.includes(id)) next.launchChecks.push(id); return next;
}
export function ignite(run) {
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
export function sendStatus(run) {
  const next = clone(run); if (!['flight', 'incident', 'surface', 'arrival'].includes(next.stage) || next.energy < 5) return next;
  if (next.messages.some(m => m.kind === 'status' && m.status === 'pending')) return next;
  const latency = orbitState(next.progress, next.route).lightSeconds;
  message(next, 'status', `Estado enviado: integridad ${Math.round(next.integrity)}%, energía ${Math.round(next.energy)} Wh.`, next.elapsed + latency);
  next.energy -= 5; log(next, 'Telemetría enviada', `Latencia de ida estimada: ${(latency / 60).toFixed(1)} min.`); processMessages(next); return next;
}
export function requestHelp(run) {
  const next = clone(run); if (next.stage !== 'incident' || next.incident.asked) return next;
  const latency = orbitState(next.progress, next.route).lightSeconds;
  next.incident.asked = true; next.incident.replyAt = next.elapsed + 2 * latency + 120;
  message(next, 'status', 'Anomalía en el bus de instrumentos. Solicitamos orientación.', next.elapsed + latency);
  message(next, 'reply', 'Control terrestre: prioriza estabilidad, comprueba el bus y conserva energía. Esta recomendación corresponde al estado comunicado antes de tu intervención.', next.incident.replyAt, 0, next.elapsed + latency + 120);
  next.energy = Math.max(0, next.energy - 5); log(next, 'Ayuda solicitada', `Ida y vuelta más 2 min de preparación: ${(2 * latency / 60 + 2).toFixed(1)} min.`); return next;
}
export function advanceFlight(run, gameSeconds) {
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
export function calibrate(run) {
  const next = clone(run); if (next.stage !== 'flight' || next.calibrated || next.energy < 70) return next;
  next.energy -= 70; next.science += 6; next.calibrated = true;
  log(next, 'Instrumentos calibrados', 'Calibración a bordo: +6 puntos científicos, −70 Wh.'); return next;
}
export function resolveIncident(run, choice) {
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
export function advanceIncident(run, seconds) {
  const next = clone(run); if (next.stage !== 'incident' || seconds <= 0) return next;
  next.elapsed += seconds; processMessages(next);
  if (next.elapsed >= next.incident.deadline) return resolveIncident(next, 'wait');
  return next;
}
export function resumeFlight(run) { const next = clone(run); if (next.stage === 'debrief') next.stage = 'flight'; return next; }
export function beginLanding(run) { const next = clone(run); if (next.stage === 'arrival') { next.stage = 'landing'; next.landingPhase = 0; } return next; }
export function landingAction(run, mode = 'safe') {
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
export function activeInstrument(run, id) { return run.config[id] === true && run.disabled !== id; }
export function moveRover(run, x, seconds = 0) {
  const next = clone(run); if (next.stage !== 'surface') return next;
  const destination = clamp(x, .07, .94), distance = Math.abs(next.surfaceX - destination);
  next.energy = Math.max(0, next.energy - distance * 48); next.surfaceX = destination;
  next.elapsed += Math.max(0, seconds); next.surfaceSeconds += Math.max(0, seconds); processMessages(next);
  if (next.energy <= 0) return finishRun(next, 'El rover agotó su reserva de energía. Se conservan los datos ya transmitidos.', true);
  return next;
}
export function collectPoint(run, id) {
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
export function revealEcho(run) {
  const next = clone(run); if (next.stage !== 'surface' || next.echoRevealed) return next;
  const cost = next.pilot === 'AVI' ? 8 : 20;
  if (next.energy < cost) return next;
  next.energy -= cost; next.echoRevealed = true;
  log(next, next.pilot === 'AVI' ? 'Pulso de exploración' : 'Barrido de sensores', 'Se detectó un punto de interés bajo el regolito.'); return next;
}
export function relayTiming(id) {
  const profile = Object.hasOwn(RELAY_CASES, id) ? RELAY_CASES[id] : RELAY_CASES.close;
  const oneWay = profile.distanceKm * 1000 / C;
  return { ...profile, oneWay, roundTrip: 2 * oneWay + CONTROL_PROCESSING };
}
export function echoPlan(run, action) {
  if (run.stage !== 'surface' || !run.story || run.story.echo || !run.echoRevealed || Math.abs(run.surfaceX - POINTS.echo.x) > .09) return null;
  if (action === 'local') return { cost: ECHO_LOCAL_COST, delay: 60, recovered: true };
  if (action !== 'earth') return null;
  const delay = relayTiming(run.story.relay).roundTrip;
  return { cost: ECHO_LINK_COST, delay, recovered: delay <= ECHO_WINDOW };
}
export function investigateEcho(run, action) {
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
export function reportEvidence(run) {
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
export function recordRecommendation(run, choice) {
  if (run.stage !== 'report' || !run.story || run.story.recommendation || !Object.hasOwn(RECOMMENDATIONS, choice)) return clone(run);
  const next = clone(run);
  const supported = reportEvidence(next).supported;
  next.story.recommendation = { choice, supported };
  log(next, 'Recomendación enviada por la tripulación', `${RECOMMENDATIONS[choice].label}. Alex: ${choice === supported ? 'la evidencia respalda esta recomendación.' : RECOMMENDATIONS[choice].requiredEvidence}`);
  return next;
}
export function transmitData(run) {
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
export function waitForLink(run) {
  const next = clone(run); if (!['surface', 'arrival'].includes(next.stage)) return next;
  const pending = next.messages.filter(m => m.status === 'pending');
  if (pending.length) { next.elapsed = Math.max(next.elapsed, ...pending.map(m => m.arrives)); processMessages(next); }
  return next;
}
export function finishRun(run, reason = 'Expedición finalizada.', aborted = false) {
  const next = clone(run); if (next.stage === 'report') return next;
  const findings = Object.values(next.findings);
  const goal = next.objective === 'imaging' ? next.findings.panorama?.method === 'camera' : next.objective === 'minerals' ? next.findings.mineral?.method === 'spectrometer' : findings.length >= 2;
  const success = !aborted && !!goal && next.deliveredData >= 20 && next.science >= 30 && next.integrity > 0;
  const deliveryRate = next.data > 0 ? next.deliveredData / next.data : 0;
  const score = clamp(Math.round(Math.min(next.science, 100) * .5 + next.integrity * .2 + next.fuel / next.initialFuel * 15 + deliveryRate * 15), 0, 100);
  next.summary = { success, aborted, reason, score, goal: !!goal, rank: success ? score >= 80 ? 'Horizonte extraordinario' : 'Misión cumplida' : aborted ? 'Expedición interrumpida' : 'Resultado parcial' };
  next.stage = 'report'; log(next, 'Informe de misión', reason); return next;
}
export function completeWithConfirmation(run) {
  if (run.stage !== 'surface') return clone(run);
  let next = transmitData(run); next = waitForLink(next);
  return finishRun(next, 'La expedición cerró tras esperar la confirmación de los paquetes enviados.');
}
export function restoreRun(value) {
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

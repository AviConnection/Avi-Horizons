import { fleetCards } from './fleet.js';
import { LEVELS, LIFT_X, ROOMS, routeTo, nearestInteraction, EQUIPMENT, LIMITS, normalizeLoadout, evaluateLoadout } from './hub-model.mjs';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const saveKey = 'avi-horizons.hub.v1';

/** The hub owns navigation and workshop state; the menu owns identity and preferences. */
export function createHub({ getPilot, getReducedMotion, openDialog, onExit, onPlan, onTimeLab, logbook }) {
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

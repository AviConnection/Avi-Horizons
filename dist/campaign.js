import { STORY_CHAPTERS, STORY_EPILOGUE } from './story-data.mjs';
import { ATLAS, IMAGES } from './atlas-data.js';
import { CAMPAIGN, CHAPTERS } from './campaign-data.mjs';
import { WORLD, createFlight, advanceFlight, nearestStation, collectReading, scoreFlight } from './campaign-model.mjs';

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

export function createCampaign({ getPilot, setPilot, getReducedMotion, onStation, onMenu, openDialog, showTimeLab, playEffect, logbook }) {
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

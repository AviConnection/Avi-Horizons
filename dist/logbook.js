import { RECOMMENDATIONS, RELAY_CASES } from './story-data.mjs';
import { reportEvidence } from './mission-model.mjs';
import { createLogbookStore } from './logbook-store.mjs';
import { CAMPAIGN } from './campaign-data.mjs';
import { ROUTES, SITES, OBJECTIVES } from './mission-model.mjs';
import { EQUIPMENT } from './hub-model.mjs';
import { stageNames } from './mission-templates.js';

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

export function createLogbook(openDialog) {
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

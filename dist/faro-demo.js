import { prepareFaroDemo, resolveFaroDemo } from './faro-model.mjs';
import { echoPlan, reportEvidence } from './mission-model.mjs';
import { ECHO_WINDOW } from './story-data.mjs';
import { alexLine, minutes, relayCard, relayOptions } from './story.js';

const decisionNames = { earth: 'Consultar a la Tierra', local: 'Analizar con Alex' };
const caseNames = { close: 'Acercamiento', insight: 'InSight' };

export function connectFaroDemo({ openDialog, logbook, getPilot, playEffect }) {
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

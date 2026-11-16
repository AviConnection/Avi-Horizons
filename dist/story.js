import { RELAY_CASES, RECOMMENDATIONS, ECHO_WINDOW, ECHO_LOCAL_COST } from './story-data.mjs';
import { relayTiming, reportEvidence } from './mission-model.mjs';

const poses = { welcome: 'welcome', explain: 'explain', alert: 'alert', relief: 'relief', portrait: 'bison' };
const fmt = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 1 });
export const minutes = seconds => `${fmt.format(seconds / 60)} min`;

export function alexLine(text, pose = 'explain') {
  const portrait = `<img class="alex-portrait" src="assets/alex-${poses[pose]}.webp" alt="" width="560" height="560">`;
  return `<div class="alex-line" data-alex-pose="${pose}">${portrait}<div><strong>Alex</strong><p>${text}</p></div></div>`;
}

export function relayCard(id) {
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

export function relayOptions(current) {
  return Object.entries(RELAY_CASES).map(([id, info]) =>
    `<option value="${id}" ${id === current ? 'selected' : ''}>${info.label}</option>`
  ).join('');
}

export function storyReport(run) {
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

export function connectStory({ openDialog, getPilot, getRun, startExpedition, playSignal, logbook }) {
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

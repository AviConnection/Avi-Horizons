import { shipImage } from './fleet.js';
import { alexLine, minutes, relayCard, relayOptions, storyReport } from './story.js';
import { ECHO_WINDOW, RECOMMENDATIONS } from './story-data.mjs';
import * as M from './mission-model.mjs';
import { evaluateLoadout, EQUIPMENT } from './hub-model.mjs';
import { orbitalSVG, stageNames, stageGroups, groupNames } from './mission-templates.js';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const KEY = 'avi-horizons.expedition.v1', HISTORY_KEY = 'avi-horizons.results.v1';
const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[character]));
const number = (value, digits = 0) => Number(value || 0).toLocaleString('es-PE', { maximumFractionDigits: digits, minimumFractionDigits: digits });
const time = seconds => seconds >= M.DAY ? `${number(seconds / M.DAY, 1)} d` : seconds >= 3600 ? `${number(seconds / 3600, 1)} h` : `${number(seconds / 60, 1)} min`;
const pilotImage = pilot => pilot === 'AVI' ? 'assets/avi-explorer-v2.png' : 'assets/maqui-explorer.png';
const eye = '<svg class="ui-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19 19 5M5 5h14v14"/></svg>';

export function createMission({ getPilot, onPilot, onHub, onMenu, openDialog, getReducedMotion, getFlightSpeed, onFlightSpeed, logbook }) {
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

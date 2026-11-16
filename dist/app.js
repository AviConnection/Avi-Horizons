import { connectFaroDemo } from './faro-demo.js';
import { defaultSettings, normalizeSettings } from './settings-model.mjs';
import { connectStory } from './story.js';
import { createLogbook } from './logbook.js';
import { createCampaign } from './campaign.js';
import { connectHorizons } from './horizons.js';
/** AVI HORIZONS — intro and explorable hub. No external services or telemetry. */
import { createHub } from './hub.js';
import { createMission } from './mission.js';
import { connectScience } from './mission-science.js';
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

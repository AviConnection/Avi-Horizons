import { clockRatio, ROUTES, orbitState } from './mission-model.mjs';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const fmt = n => Number(n).toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2});
export function connectScience({openDialog,getRun}) {
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

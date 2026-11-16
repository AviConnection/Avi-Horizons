import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../dist/mission-model.mjs';
import { evaluateLoadout } from '../dist/hub-model.mjs';

function start(config={camera:true,spectrometer:true,serial:true},pilot='AVI',options={}){
  let run=M.createRun(pilot,config);run=M.choosePlan(run,options);assert.deepEqual(M.validatePlan(run),[]);
  run=M.beginLaunch(run);for(const id of ['power','navigation','comms'])run=M.checkLaunch(run,id);
  return M.ignite(run);
}
function reachSurface(pilot='AVI',choice='reconfigure',options={}){
  let run=start(undefined,pilot,options);
  run=M.advanceFlight(run,M.DAY*1000);assert.equal(run.stage,'incident');
  run=M.resolveIncident(run,choice);run=M.resumeFlight(run);run=M.advanceFlight(run,M.DAY*1000);
  assert.equal(run.stage,'arrival');run=M.beginLanding(run);
  run=M.landingAction(run);run=M.landingAction(run);run=M.landingAction(run,'safe');
  assert.equal(run.stage,'surface');return run;
}
function explore(run){
  run=M.revealEcho(run);
  for(const id of ['panorama','mineral','echo']){run=M.moveRover(run,M.POINTS[id].x,60);run=M.collectPoint(run,id);}
  return run;
}
test('Hohmann model meets both planets and has the expected transfer duration',()=>{
  const start=M.orbitState(0),end=M.orbitState(1);
  assert.ok(Math.hypot(start.ship.x-start.earth.x,start.ship.y-start.earth.y)<1e-12);
  assert.ok(Math.hypot(end.ship.x-end.mars.x,end.ship.y-end.mars.y)<1e-12);
  assert.ok(M.HOHMANN_SECONDS/M.DAY>258&&M.HOHMANN_SECONDS/M.DAY<260);
  assert.ok(Math.abs(M.AU/M.C-499.004783836)<1e-6);
});
test('time dilation experiment gives six proper years for ten reference years at 0.8c',()=>{
  assert.ok(Math.abs(M.clockRatio(.8)*10-6)<1e-12);
  assert.equal(M.clockRatio(0),1);
});
test('scheduling both instruments by turns reduces peak demand without inventing energy',()=>{
  const concurrent=evaluateLoadout({camera:true,spectrometer:true}),serial=evaluateLoadout({camera:true,spectrometer:true,serial:true});
  assert.equal(concurrent.totals.power,265);assert.equal(serial.totals.power,240);
  assert.equal(concurrent.totals.mass,serial.totals.mass);assert.equal(concurrent.totals.energy,serial.totals.energy);
  assert.equal(concurrent.valid,false);assert.equal(serial.valid,true);
});
test('launch requires every distinct check and invalid equipment cannot satisfy the plan',()=>{
  let run=M.beginLaunch(M.createRun('AVI',{camera:true}));
  run=M.checkLaunch(run,'power');run=M.checkLaunch(run,'power');run=M.checkLaunch(run,'navigation');
  assert.equal(M.ignite(run).stage,'launch');
  const bad=M.choosePlan(M.createRun('AVI',{camera:true}),{objective:'minerals'});
  assert.ok(M.validatePlan(bad).length);assert.equal(M.beginLaunch(bad).stage,'plan');
});
test('fast-forward cannot skip the central decision or resolve it twice',()=>{
  let run=start();run=M.advanceFlight(run,1e12);
  assert.equal(run.stage,'incident');assert.equal(run.progress,.48);
  const blocked=M.advanceFlight(run,1e12);assert.equal(blocked.elapsed,run.elapsed);
  run=M.resolveIncident(run,'reconfigure');const twice=M.resolveIncident(run,'reconfigure');
  assert.equal(twice.energy,run.energy);assert.equal(twice.science,run.science);
});
test('help arrives after propagation in both directions and processing, never before the decision window',()=>{
  let run=M.advanceFlight(start(),1e12);run=M.requestHelp(run);
  const outbound=run.messages.find(x=>x.kind==='status'),reply=run.messages.find(x=>x.kind==='reply');
  assert.ok(outbound.arrives>outbound.sent);assert.ok(reply.sent>=outbound.arrives+120);
  assert.ok(reply.arrives>run.incident.deadline);
  run=M.advanceIncident(run,10);assert.equal(run.messages.find(x=>x.kind==='reply').status,'pending');
});
test('waiting keeps instruments but loses the window; deadline fallback does not soft-lock',()=>{
  const incident=M.advanceFlight(start(),1e12);
  const waiting=M.resolveIncident(incident,'wait');assert.equal(waiting.disabled,null);
  assert.equal(waiting.incident.windowLost,true);assert.equal(waiting.stage,'debrief');
  assert.equal(waiting.messages.find(x=>x.kind==='reply').status,'delivered');
  const expired=M.advanceIncident(incident,1000);assert.equal(expired.stage,'debrief');assert.equal(expired.incident.choice,'wait');
});
test('MAQUI pays less for a diagnosed reconfiguration, while AVI reveals surface points more cheaply',()=>{
  const avi=M.resolveIncident(M.advanceFlight(start(undefined,'AVI'),1e12),'reconfigure');
  const maqui=M.resolveIncident(M.advanceFlight(start(undefined,'MAQUI'),1e12),'reconfigure');
  assert.equal(maqui.energy-avi.energy,60);
  const a=reachSurface('AVI'),m=reachSurface('MAQUI');
  assert.equal(a.energy-M.revealEcho(a).energy,8);assert.equal(m.energy-M.revealEcho(m).energy,20);
});
test('points require proximity, the hidden point requires discovery, and findings cannot be duplicated',()=>{
  let run=reachSurface();assert.equal(M.collectPoint(run,'panorama').data,0);
  run=M.moveRover(run,M.POINTS.echo.x);assert.equal(M.collectPoint(run,'echo').data,0);
  run=M.revealEcho(run);run=M.collectPoint(run,'echo');const duplicate=M.collectPoint(run,'echo');
  assert.equal(duplicate.data,run.data);assert.equal(duplicate.science,run.science);
});
test('science is not credited to Earth until its packet arrives, and retransmission does not duplicate it',()=>{
  let run=explore(reachSurface());run=M.transmitData(run);
  assert.ok(run.queuedData>0);assert.equal(run.deliveredData,0);
  const repeated=M.transmitData(run);assert.equal(repeated.messages.length,run.messages.length);
  const partial=M.finishRun(run);assert.equal(partial.summary.success,false);
  run=M.waitForLink(run);assert.equal(run.deliveredData,run.data);
  const finished=M.finishRun(run);assert.equal(finished.summary.success,true);
});
test('full AVI and MAQUI expeditions both reach a report with finite bounded resources',()=>{
  for(const pilot of ['AVI','MAQUI'])for(const route of ['hohmann','intensive']){
    let run=explore(reachSurface(pilot,'reconfigure',{route}));run=M.completeWithConfirmation(run);
    assert.equal(run.stage,'report');assert.equal(run.summary.success,true);
    for(const key of ['fuel','energy','integrity','science','kinematicLag'])assert.ok(Number.isFinite(run[key])&&run[key]>=0,key);
    assert.ok(run.energy<=run.capacity);assert.ok(run.summary.score>=0&&run.summary.score<=100);
    assert.ok(M.restoreRun(JSON.parse(JSON.stringify(run))));
  }
});
test('isolating an essential instrument changes the scientific outcome instead of fabricating a success',()=>{
  let run=start({camera:true},'AVI',{objective:'imaging'});run=M.advanceFlight(run,1e12);
  run=M.resolveIncident(run,'isolate');assert.equal(run.disabled,'camera');run=M.resumeFlight(run);run=M.advanceFlight(run,1e12);
  run=M.beginLanding(run);run=M.landingAction(run);run=M.landingAction(run);run=M.landingAction(run);
  run=explore(run);run=M.completeWithConfirmation(run);
  assert.equal(run.findings.panorama.method,'manual');assert.equal(run.summary.goal,false);assert.equal(run.summary.success,false);
});
test('bad checkpoints are rejected and reducers do not mutate their input',()=>{
  const run=start(),before=JSON.stringify(run);M.advanceFlight(run,M.DAY);assert.equal(JSON.stringify(run),before);
  assert.equal(M.restoreRun({...run,energy:Infinity}),null);
  assert.equal(M.restoreRun({...run,progress:2}),null);
  assert.equal(M.restoreRun({...run,stage:'unknown'}),null);
  assert.equal(M.restoreRun({...run,deliveredData:1,queuedData:0}),null);
});

function arriveAtFaro(relay) {
  let run = M.createRun('MAQUI', { camera: true, spectrometer: true, serial: true }, true);
  run = M.choosePlan(run, { relay });
  run = M.beginLaunch(run);
  for (const id of ['power', 'navigation', 'comms']) run = M.checkLaunch(run, id);
  run = M.advanceFlight(M.ignite(run), 1e12);
  run = M.resolveIncident(run, 'reconfigure');
  run = M.advanceFlight(M.resumeFlight(run), 1e12);
  run = M.beginLanding(run);
  run = M.landingAction(M.landingAction(M.landingAction(run)), 'safe');
  run = M.collectPoint(M.moveRover(run, M.POINTS.mineral.x), 'mineral');
  return M.moveRover(M.revealEcho(run), M.POINTS.echo.x);
}

test('the historical Mars distance changes whether requesting Earth help recovers the archive', () => {
  const near = arriveAtFaro('close');
  const far = arriveAtFaro('insight');
  assert.ok(M.relayTiming('close').roundTrip < 12 * 60);
  assert.ok(M.relayTiming('insight').roundTrip > 12 * 60);
  assert.equal(M.collectPoint(near, 'echo').findings.echo, undefined);
  const returnedNear = M.investigateEcho(near, 'earth');
  const returnedFar = M.investigateEcho(far, 'earth');
  const withAlex = M.investigateEcho(far, 'local');
  assert.ok(returnedNear.findings.echo);
  assert.equal(returnedFar.findings.echo, undefined);
  assert.ok(withAlex.findings.echo);
  assert.deepEqual(M.investigateEcho(returnedFar, 'local'), returnedFar);
  const lowEnergy = { ...far, energy: 100 };
  assert.deepEqual(M.investigateEcho(lowEnergy, 'local'), lowEnergy);
});

test('the recommendation uses confirmed findings and retains a single recorded decision', () => {
  let run = M.transmitData(arriveAtFaro('insight'));
  run = M.waitForLink(run);
  assert.deepEqual(M.reportEvidence(run), { echo: false, instrument: true, supported: 'measure' });
  run = M.investigateEcho(run, 'local');
  assert.deepEqual(M.reportEvidence(run), { echo: false, instrument: true, supported: 'measure' });
  const result = M.completeWithConfirmation(run);
  assert.deepEqual(M.reportEvidence(result), { echo: true, instrument: true, supported: 'survey' });
  const recommendation = M.recordRecommendation(result, 'survey');
  assert.deepEqual(recommendation.story.recommendation, { choice: 'survey', supported: 'survey' });
  assert.deepEqual(M.recordRecommendation(recommendation, 'defer'), recommendation);
  assert.deepEqual(M.restoreRun(recommendation), recommendation);
});

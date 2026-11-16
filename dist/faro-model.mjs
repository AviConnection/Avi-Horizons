import { POINTS, advanceFlight, beginLanding, beginLaunch, checkLaunch, choosePlan, collectPoint, completeWithConfirmation, createRun, ignite, investigateEcho, landingAction, moveRover, resolveIncident, resumeFlight, revealEcho } from './mission-model.mjs';

export function prepareFaroDemo(pilot, relay) {
  let run = createRun(pilot, { camera: true, battery: true }, true);
  run = beginLaunch(choosePlan(run, { relay, objective: 'imaging' }));
  for (const system of ['power', 'navigation', 'comms']) run = checkLaunch(run, system);
  run = advanceFlight(ignite(run), Number.MAX_SAFE_INTEGER);
  run = resumeFlight(resolveIncident(run, 'reconfigure'));
  run = beginLanding(advanceFlight(run, Number.MAX_SAFE_INTEGER));
  for (let phase = 0; phase < 3; phase++) run = landingAction(run);
  run = collectPoint(moveRover(run, POINTS.panorama.x), 'panorama');
  return moveRover(revealEcho(run), POINTS.echo.x);
}

export function resolveFaroDemo(run, action) {
  if (run.stage !== 'surface' || !run.story || run.story.echo) return run;
  const investigated = investigateEcho(run, action);
  if (!investigated.story.echo) return run;
  return completeWithConfirmation(investigated);
}

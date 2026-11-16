import assert from 'node:assert/strict';
import test from 'node:test';
import { prepareFaroDemo, resolveFaroDemo } from '../dist/faro-model.mjs';
import { reportEvidence } from '../dist/mission-model.mjs';

for (const pilot of ['AVI', 'MAQUI']) {
  test(`Faro 7 demo compares three valid decisions for ${pilot}`, () => {
    const far = prepareFaroDemo(pilot, 'insight');
    const close = prepareFaroDemo(pilot, 'close');
    const late = resolveFaroDemo(far, 'earth');
    const local = resolveFaroDemo(far, 'local');
    const timely = resolveFaroDemo(close, 'earth');

    assert.equal(far.stage, 'surface');
    assert.equal(far.story.echo, null);
    assert.equal(late.stage, 'report');
    assert.equal(reportEvidence(late).echo, false);
    assert.equal(late.deliveredData, 24);
    for (const result of [local, timely]) {
      assert.equal(result.stage, 'report');
      assert.equal(reportEvidence(result).echo, true);
      assert.equal(result.deliveredData, 52);
    }
  });
}

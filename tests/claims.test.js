/**
 * Claims.
 *
 * The pitch deck and the model card make specific numeric claims. This file
 * recomputes each one from the engine and then checks that the same number
 * appears in the shipped HTML. If a coefficient changes, this test fails and
 * names the sentence that needs rewriting — which is the only way a hackathon
 * deck stays honest after the model moves.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { evaluateRotation } from '../dist/engine/evaluate.js';
import { searchRotations, shiftContext } from '../dist/engine/search.js';
import { reference, annualRain } from './_helpers.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pitch = fs.readFileSync(path.join(ROOT, 'dist', 'pitch.html'), 'utf8');
const model = fs.readFileSync(path.join(ROOT, 'dist', 'model.html'), 'utf8');

const { ctx, region: punjab, cache, years } = reference();

const OPTIONS = { irrigationMm: 900, residueRetained: true, practice: 'none', slopePct: 0.5 };
const RICE_WHEAT = ['rice', 'wheat', 'rice', 'wheat'];
const COTTON_CHICKPEA = ['cotton', 'chickpea', 'cotton', 'chickpea'];
const MAIZE_WHEAT = ['maize', 'wheat', 'maize', 'wheat'];

const evaluate = (rotation) =>
  evaluateRotation(ctx, punjab, rotation, cache, { ...OPTIONS, years });

const current = evaluate(RICE_WHEAT);
const proposed = evaluate(COTTON_CHICKPEA);
const reliable = evaluate(MAIZE_WHEAT);

const search = searchRotations(ctx, punjab, { ...OPTIONS, cache });

test('the deck cites the search size the engine actually produces', () => {
  assert.equal(search.candidates, 2304);
  assert.equal(search.distinct, 1176);
  assert.equal(search.simulatedSeasons, 152064);
  assert.equal(years.length, 33);
  for (const n of ['2,304', '1,176', '152,064']) {
    assert.ok(pitch.includes(n), `pitch.html no longer states ${n}`);
  }
});

test('the deck cites the reliability of both rotations correctly', () => {
  assert.equal(Math.round(current.reliability * 100), 39);
  assert.equal(Math.round(proposed.reliability * 100), 85);
  assert.ok(pitch.includes('39%'), 'pitch.html no longer states 39%');
  assert.ok(pitch.includes('85%'), 'pitch.html no longer states 85%');
});

test('the deck cites the irrigation requirement of both rotations correctly', () => {
  assert.equal(current.meanRequirement, 938);
  assert.equal(proposed.meanRequirement, 703);
  assert.ok(pitch.includes('938 mm'), 'pitch.html no longer states 938 mm');
  assert.ok(pitch.includes('703 mm'), 'pitch.html no longer states 703 mm');
});

test('the deck cites the nitrogen balance of both rotations correctly', () => {
  assert.equal(Math.round(current.nitrogen.net * 10) / 10, -74.3);
  assert.equal(Math.round(proposed.nitrogen.net * 10) / 10, 8.7);
  assert.ok(pitch.includes('−74 kg N'), 'pitch.html no longer states −74 kg N');
  assert.ok(pitch.includes('+9 kg N'), 'pitch.html no longer states +9 kg N');
});

test('the deck cites the downside margin of both rotations correctly', () => {
  assert.equal(current.marginP10, 156000);
  assert.equal(proposed.marginP10, 160000);
  assert.ok(pitch.includes('156k PKR'), 'pitch.html no longer states 156k PKR');
  assert.ok(pitch.includes('160k PKR'), 'pitch.html no longer states 160k PKR');
});

test('the deck cites the family-break count of both rotations correctly', () => {
  assert.equal(current.familyBreaks, 0);
  assert.equal(proposed.familyBreaks, 4);
  assert.ok(pitch.includes('0 family breaks'), 'pitch.html no longer states 0 family breaks');
  assert.ok(pitch.includes('4 family breaks'), 'pitch.html no longer states 4 family breaks');
});

test('the deck is right that the most reliable rotation is not the recommendation', () => {
  assert.equal(reliable.reliability, 1, 'maize-wheat should be fully reliable');
  assert.ok(
    reliable.nitrogen.net < current.nitrogen.net,
    'the reason we reject maize-wheat is that it mines more nitrogen than rice-wheat',
  );
  assert.equal(Math.round(reliable.nitrogen.net), -121);
  assert.ok(pitch.includes('121 kg of nitrogen'), 'pitch.html no longer states 121 kg of nitrogen');
});

test('the deck cites the failing-year count correctly', () => {
  assert.equal(current.failingYears.length, 20);
  assert.ok(pitch.includes('20'), 'pitch.html no longer states 20');
  assert.ok(model.includes('20'), 'model.html no longer states 20');
});

test('the deck cites the validation result correctly', () => {
  const driest = annualRain(ctx, years).slice(0, 5).map((y) => y.year);
  for (const year of driest) {
    assert.ok(current.failingYears.includes(year), `${year} should be flagged`);
  }
  assert.ok(pitch.includes('5 of 5'), 'pitch.html no longer states 5 of 5');
  assert.ok(pitch.includes('0.06'), 'pitch.html no longer states the 0.06 wetness delta');
});

test('the deck cites the 2050 stress test correctly', () => {
  const shifted = shiftContext(ctx, { dTempC: 1.9, dPrecipPct: -6 });
  const future = searchRotations(shifted, punjab, { ...OPTIONS });
  const rw = evaluateRotation(shifted, punjab, RICE_WHEAT, future.cache, {
    ...OPTIONS,
    years: future.years,
  });
  const cc = evaluateRotation(shifted, punjab, COTTON_CHICKPEA, future.cache, {
    ...OPTIONS,
    years: future.years,
  });
  assert.equal(Math.round(rw.reliability * 100), 27);
  assert.equal(Math.round(cc.reliability * 100), 79);
  assert.ok(pitch.includes('27%'), 'pitch.html no longer states 27%');
  assert.ok(pitch.includes('79%'), 'pitch.html no longer states 79%');
  assert.ok(pitch.includes('+1.9 °C'), 'pitch.html no longer states the temperature delta');
  assert.ok(pitch.includes('−6%'), 'pitch.html no longer states the rainfall delta');
});

test('the deck cites the scale figure correctly', () => {
  const areaHa = punjab.scaleAreaHa;
  const share = 0.1;
  const deltaMm = current.meanRequirement - proposed.meanRequirement;
  // 1 mm over 1 ha is 10 m3.
  const km3 = (deltaMm * 10 * areaHa * share) / 1e9;
  assert.equal(km3.toFixed(2), '0.99');
  assert.ok(pitch.includes('0.99'), 'pitch.html no longer states 0.99 km3');
  assert.ok(pitch.includes('4.2 million'), 'pitch.html no longer states the area');
});

test('the model card states the same reliability the engine computes', () => {
  assert.ok(model.includes('39%'), 'model.html no longer states 39%');
  assert.ok(model.includes('900 mm'), 'model.html no longer states the 900 mm supply');
});

test('the model card lists the known errors it claims to list', () => {
  const section = model.slice(model.indexOf('What we know is wrong'));
  const items = (section.match(/<li>/g) ?? []).length;
  assert.ok(items >= 8, `model card lists only ${items} known errors`);
});

test('the model card cites every NASA product the app actually uses', () => {
  for (const product of ['POWER', 'MERRA-2', 'MODIS', 'SMAP', 'IMERG', 'GRACE-FO', 'SoilGrids']) {
    assert.ok(model.includes(product), `model card does not mention ${product}`);
  }
});

test('the pitch deck has seven slides and a working link back to the app', () => {
  assert.equal((pitch.match(/class="slide[ "]/g) ?? []).length, 7);
  assert.ok(pitch.includes('href="index.html"'), 'pitch has no link back to the app');
});

test('no page claims an affiliation with NASA', () => {
  for (const [name, html] of [['pitch', pitch], ['model', model]]) {
    assert.ok(
      /No affiliation or endorsement is claimed|describe challenge context/i.test(html),
      `${name}.html is missing the non-affiliation disclaimer`,
    );
  }
});

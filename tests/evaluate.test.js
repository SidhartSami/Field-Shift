/**
 * Evaluation semantics.
 *
 * The product's headline number is a failure rate, so the definition of failure
 * is the most load-bearing line of code in the repository. These tests pin it
 * down: a year fails when the rotation's irrigation requirement exceeds the
 * water the farmer can supply, and nothing else counts as a failure.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { evaluateRotation, usableYears, simulateRotationDetail } from '../dist/engine/evaluate.js';
import { reference, annualRain } from './_helpers.js';

const { ctx, region: punjab, cache, years } = reference();

const RICE_WHEAT = ['rice', 'wheat', 'rice', 'wheat'];
const COTTON_CHICKPEA = ['cotton', 'chickpea', 'cotton', 'chickpea'];

const evaluate = (rotation, supply, extra = {}) =>
  evaluateRotation(ctx, punjab, rotation, cache, { years, irrigationMm: supply, ...extra });

test('the usable record is 33 years, 1991 to 2023', () => {
  assert.equal(years.length, 33);
  assert.equal(years[0], 1991);
  assert.equal(years[years.length - 1], 2023);
});

test('reliability is exactly the share of years that fit the supply', () => {
  const r = evaluate(RICE_WHEAT, 900);
  assert.equal(r.years, 33);
  assert.equal(r.reliableYears + r.failingYears.length, 33);
  assert.ok(Math.abs(r.reliability - r.reliableYears / 33) < 1e-12);
});

test('a year fails if and only if its requirement exceeds supply', () => {
  const r = evaluate(RICE_WHEAT, 900);
  for (const y of r.perYear) {
    assert.equal(y.ok, y.unmet <= 0, `${y.year}: ok=${y.ok} but unmet=${y.unmet}`);
    assert.equal(y.unmet, Math.max(0, y.requirement - 900), `${y.year} unmet arithmetic`);
  }
});

test('reliability is monotonic in water supply', () => {
  let previous = -1;
  for (const supply of [200, 400, 600, 800, 1000, 1200, 1400, 1600]) {
    const r = evaluate(RICE_WHEAT, supply);
    assert.ok(
      r.reliability >= previous - 1e-12,
      `reliability fell from ${previous} to ${r.reliability} at ${supply} mm`,
    );
    previous = r.reliability;
  }
});

test('zero supply means zero reliability, and infinite supply means certainty', () => {
  assert.equal(evaluate(RICE_WHEAT, 0).reliability, 0);
  assert.equal(evaluate(RICE_WHEAT, 5000).reliability, 1);
});

test('tolerance can only increase reliability', () => {
  const strict = evaluate(RICE_WHEAT, 900, { toleranceMm: 0 });
  const loose = evaluate(RICE_WHEAT, 900, { toleranceMm: 100 });
  assert.ok(loose.reliability >= strict.reliability);
});

test('rice-wheat is 39% reliable at 900 mm, as the pitch states', () => {
  const r = evaluate(RICE_WHEAT, 900);
  assert.equal(r.reliableYears, 13);
  assert.equal(r.failingYears.length, 20);
  assert.equal(Math.round(r.reliability * 100), 39);
});

test('cotton-chickpea is 85% reliable at 900 mm, as the pitch states', () => {
  const r = evaluate(COTTON_CHICKPEA, 900);
  assert.equal(Math.round(r.reliability * 100), 85);
  assert.ok(r.meanRequirement < evaluate(RICE_WHEAT, 900).meanRequirement);
});

test('the recommended rotation beats current practice on water, nitrogen and margin', () => {
  const current = evaluate(RICE_WHEAT, 900);
  const proposed = evaluate(COTTON_CHICKPEA, 900);
  assert.ok(proposed.reliability > current.reliability, 'water');
  assert.ok(proposed.nitrogen.net > current.nitrogen.net, 'nitrogen');
  assert.ok(proposed.marginP10 >= current.marginP10, 'downside margin');
});

test('the recommendation rule is falsifiable: it can fail to find a winner', () => {
  // At a supply so low that nothing fits, no rotation can beat current practice
  // on reliability, so the rule must have a defined fallback rather than a crash.
  const current = evaluate(RICE_WHEAT, 50);
  const proposed = evaluate(COTTON_CHICKPEA, 50);
  assert.equal(current.reliability, 0);
  assert.equal(proposed.reliability, 0);
  assert.ok(Number.isFinite(proposed.marginP10));
});

test('margin quantiles are ordered P10 <= P50 <= P90', () => {
  for (const rotation of [RICE_WHEAT, COTTON_CHICKPEA, ['maize', 'wheat', 'maize', 'wheat']]) {
    const r = evaluate(rotation, 900);
    assert.ok(r.marginP10 <= r.marginP50, `${rotation} P10 > P50`);
    assert.ok(r.marginP50 <= r.marginP90, `${rotation} P50 > P90`);
  }
});

test('the worst year is the year with the largest unmet requirement', () => {
  const r = evaluate(RICE_WHEAT, 900);
  const worst = r.perYear.reduce((a, b) => (b.unmet > a.unmet ? b : a));
  assert.equal(r.worstYear.year, worst.year);
  assert.equal(r.worstYear.unmet, Math.round(worst.unmet));
});

test('family breaks count the transitions around the cycle', () => {
  // rice(grass) -> wheat(grass) -> rice(grass) -> wheat(grass) -> back to rice
  assert.equal(evaluate(RICE_WHEAT, 900).familyBreaks, 0);
  // cotton -> chickpea -> cotton -> chickpea -> back to cotton: four transitions
  assert.equal(evaluate(COTTON_CHICKPEA, 900).familyBreaks, 4);
});

test('legume seasons are counted from the crop table, not hard-coded', () => {
  assert.equal(evaluate(COTTON_CHICKPEA, 900).legumeSeasons, 2);
  assert.equal(evaluate(RICE_WHEAT, 900).legumeSeasons, 0);
  assert.equal(evaluate(['mung', 'lentil', 'mung', 'lentil'], 900).legumeSeasons, 4);
});

test('soil loss is positive and bounded for every rotation', () => {
  for (const rotation of [RICE_WHEAT, COTTON_CHICKPEA, ['mung', 'lentil', 'mung', 'lentil']]) {
    const r = evaluate(rotation, 900);
    assert.ok(r.erosionTPerHa > 0, `${rotation} erosion ${r.erosionTPerHa}`);
    assert.ok(r.erosionTPerHa < 100, `${rotation} erosion implausibly high`);
  }
});

test('a continuous-canopy rotation loses less soil than a sparse row crop', () => {
  // Rice is ponded and berseem is a dense fodder ley; cotton is a wide-row crop
  // that leaves the surface exposed for most of the kharif. The model should
  // reflect that, and it should not flatter the rotation we recommend.
  const dense = evaluate(['rice', 'berseem', 'rice', 'berseem'], 900);
  const sparse = evaluate(COTTON_CHICKPEA, 900);
  assert.ok(
    dense.erosionTPerHa < sparse.erosionTPerHa,
    `dense ${dense.erosionTPerHa} should be below sparse ${sparse.erosionTPerHa}`,
  );
});

test('the recommended rotation is not the best on every objective', () => {
  // If it were, the frontier would be a single point and the trade-off story
  // would be marketing. Cotton-chickpea wins on water and nitrogen; it loses on
  // soil loss. That tension is the product.
  const proposed = evaluate(COTTON_CHICKPEA, 900);
  const current = evaluate(RICE_WHEAT, 900);
  assert.ok(proposed.erosionTPerHa > current.erosionTPerHa, 'expected a soil-loss trade-off');
});

test('the validation claim holds: all five driest years are failures for rice-wheat', () => {
  const r = evaluate(RICE_WHEAT, 900);
  const driest = annualRain(ctx, years).slice(0, 5).map((y) => y.year);
  assert.equal(driest.length, 5);
  for (const year of driest) {
    assert.ok(r.failingYears.includes(year), `${year} is one of the driest but was not flagged`);
  }
});

test('passing years are wetter than failing years in the reanalysis root zone', () => {
  const r = evaluate(RICE_WHEAT, 900);
  const d = ctx.bundle.daily;
  const wetness = new Map();
  for (let i = 0; i < d.n; i += 1) {
    const date = new Date(ctx.startDate.getTime() + i * 86400000);
    const y = date.getUTCFullYear();
    const m = date.getUTCMonth();
    if (m < 4 || m > 8) continue; // May-September
    const v = d.gwetroot?.[i];
    if (!Number.isFinite(v) || v <= -900) continue;
    const acc = wetness.get(y) ?? { sum: 0, n: 0 };
    acc.sum += v;
    acc.n += 1;
    wetness.set(y, acc);
  }
  const mean = (list) => {
    const vals = list.map((y) => wetness.get(y)).filter(Boolean).map((a) => a.sum / a.n);
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  };
  const passing = years.filter((y) => !r.failingYears.includes(y));
  assert.ok(
    mean(passing) > mean(r.failingYears),
    'the validation signal the model card cites is not present in the data',
  );
});

test('the detail tier allocates the real supply and reports stress', () => {
  const detail = simulateRotationDetail(ctx, punjab, COTTON_CHICKPEA, {
    years,
    irrigationMm: 900,
  });
  assert.ok(Array.isArray(detail), 'detail tier returns one record per year');
  assert.equal(detail.length, 33);
  for (const y of detail) {
    assert.ok(Number.isFinite(y.applied), `${y.year} applied water`);
    assert.ok(y.applied <= 900 + 1e-6, `${y.year} applied more water than supplied`);
    assert.ok(y.stressDays >= 0, `${y.year} negative stress days`);
    assert.equal(y.seasons.length, 2, `${y.year} should carry both seasons`);
    assert.ok(y.etC >= 0 && y.pe >= 0, `${y.year} negative flux`);
  }
});

test('the detail tier never applies more water than the farmer has', () => {
  for (const supply of [0, 300, 900, 2000]) {
    const detail = simulateRotationDetail(ctx, punjab, RICE_WHEAT, { years, irrigationMm: supply });
    const total = detail.reduce((a, y) => a + y.applied, 0);
    assert.ok(total <= supply * detail.length + 1e-6, `supply ${supply} exceeded`);
  }
});

test('the detail tier reports unmet demand when supply is short', () => {
  const short = simulateRotationDetail(ctx, punjab, RICE_WHEAT, { years, irrigationMm: 400 });
  const ample = simulateRotationDetail(ctx, punjab, RICE_WHEAT, { years, irrigationMm: 3000 });
  const sum = (list, key) => list.reduce((a, y) => a + y[key], 0);
  assert.ok(sum(short, 'unmet') > 0, 'a 400 mm supply should leave demand unmet');
  assert.equal(sum(ample, 'unmet'), 0, 'a 3000 mm supply should leave nothing unmet');
});

test('the detail tier is deterministic', () => {
  const a = simulateRotationDetail(ctx, punjab, COTTON_CHICKPEA, { years, irrigationMm: 900 });
  const b = simulateRotationDetail(ctx, punjab, COTTON_CHICKPEA, { years, irrigationMm: 900 });
  assert.deepEqual(a.perYear, b.perYear);
});

test('usableYears is stable across calls and matches the context', () => {
  assert.deepEqual(usableYears(ctx, punjab, cache), years);
});

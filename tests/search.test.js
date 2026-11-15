/**
 * The search: enumeration, deduplication, and the Pareto frontier.
 *
 * The frontier is the product's core claim — "these are the only rotations a
 * rational decision maker needs to consider". If the dominance test is wrong,
 * the shortlist is wrong, and the recommendation is wrong. So it gets tested
 * against brute force rather than against itself.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { enumerateRotations, canonical, searchRotations, OBJECTIVES } from '../dist/engine/search.js';
import { paretoFrontier, weightedRank } from '../dist/engine/pareto.js';
import { region } from '../dist/engine/regions.js';
import { reference } from './_helpers.js';

const { ctx, region: punjab, cache, years } = reference();

test('enumeration covers the full cross product of both seasons', () => {
  const [s0, s1] = punjab.seasons;
  const expected = s0.crops.length * s1.crops.length * s0.crops.length * s1.crops.length;
  assert.equal(enumerateRotations(punjab).length, expected);
  assert.equal(expected, 2304, 'the docs and pitch both cite 2,304 candidates');
});

test('every enumerated rotation alternates seasons correctly', () => {
  const [s0, s1] = punjab.seasons;
  const ok0 = new Set(s0.crops.map((c) => c.id));
  const ok1 = new Set(s1.crops.map((c) => c.id));
  for (const r of enumerateRotations(punjab)) {
    assert.equal(r.length, 4);
    assert.ok(ok0.has(r[0]) && ok0.has(r[2]), `${r} season 0 slot`);
    assert.ok(ok1.has(r[1]) && ok1.has(r[3]), `${r} season 1 slot`);
  }
});

test('canonical form collapses a cycle and its rotation', () => {
  const a = ['rice', 'wheat', 'cotton', 'chickpea'];
  assert.equal(canonical(a), canonical(['cotton', 'chickpea', 'rice', 'wheat']));
  assert.equal(canonical(a), canonical(['wheat', 'cotton', 'chickpea', 'rice']));
  assert.notEqual(canonical(a), canonical(['rice', 'chickpea', 'cotton', 'wheat']));
});

test('canonical form is stable under repeated application', () => {
  for (const r of enumerateRotations(punjab).slice(0, 200)) {
    const once = canonical(r);
    assert.equal(canonical(once.split('|')), once);
  }
});

test('the search returns 2,304 candidates and 1,176 distinct cycles', () => {
  const result = searchRotations(ctx, punjab, { cache });
  assert.equal(result.candidates, 2304);
  assert.equal(result.distinct, 1176);
  assert.equal(result.results.length, 1176);
  assert.equal(result.simulatedSeasons, 2304 * years.length * 2);
});

test('the search is deterministic', () => {
  const a = searchRotations(ctx, punjab, { cache });
  const b = searchRotations(ctx, punjab, { cache });
  assert.deepEqual(
    a.frontier.map((r) => r.key),
    b.frontier.map((r) => r.key),
  );
});

test('frontier and dominated partition the results exactly', () => {
  const result = searchRotations(ctx, punjab, { cache });
  assert.equal(result.frontier.length + result.dominated.length, result.results.length);
  const keys = new Set([...result.frontier, ...result.dominated].map((r) => r.key));
  assert.equal(keys.size, result.results.length, 'a rotation appears in both sets');
});

test('no frontier member is dominated by any result, checked by brute force', () => {
  const result = searchRotations(ctx, punjab, { cache });
  const value = (item, o) => (o.dir === 'max' ? item[o.key] : -item[o.key]);

  for (const candidate of result.frontier) {
    for (const other of result.results) {
      if (other === candidate) continue;
      let atLeastAsGood = true;
      let strictlyBetter = false;
      for (const o of OBJECTIVES) {
        const a = value(other, o);
        const b = value(candidate, o);
        if (a < b - 1e-9) { atLeastAsGood = false; break; }
        if (a > b + 1e-9) strictlyBetter = true;
      }
      assert.ok(
        !(atLeastAsGood && strictlyBetter),
        `${other.key} dominates frontier member ${candidate.key}`,
      );
    }
  }
});

test('every dominated result really is dominated by something', () => {
  const result = searchRotations(ctx, punjab, { cache });
  const value = (item, o) => (o.dir === 'max' ? item[o.key] : -item[o.key]);

  for (const candidate of result.dominated) {
    const found = result.results.some((other) => {
      if (other === candidate) return false;
      let atLeastAsGood = true;
      let strictlyBetter = false;
      for (const o of OBJECTIVES) {
        const a = value(other, o);
        const b = value(candidate, o);
        if (a < b - 1e-9) { atLeastAsGood = false; break; }
        if (a > b + 1e-9) strictlyBetter = true;
      }
      return atLeastAsGood && strictlyBetter;
    });
    assert.ok(found, `${candidate.key} is marked dominated but nothing dominates it`);
  }
});

test('paretoFrontier on a hand-built set keeps only the efficient points', () => {
  const objectives = [
    { key: 'a', dir: 'max' },
    { key: 'b', dir: 'max' },
  ];
  const items = [
    { id: 'best-a', a: 10, b: 1 },
    { id: 'best-b', a: 1, b: 10 },
    { id: 'middle', a: 5, b: 5 },
    { id: 'worst', a: 1, b: 1 },
    { id: 'tie', a: 10, b: 1 },
  ];
  const { frontier, dominated } = paretoFrontier(items, objectives);
  const ids = frontier.map((i) => i.id).sort();
  assert.deepEqual(ids, ['best-a', 'best-b', 'middle', 'tie']);
  assert.deepEqual(dominated.map((i) => i.id), ['worst']);
});

test('a single item is always on the frontier', () => {
  const { frontier, dominated } = paretoFrontier([{ a: 1, b: 2 }], [
    { key: 'a', dir: 'max' },
    { key: 'b', dir: 'max' },
  ]);
  assert.equal(frontier.length, 1);
  assert.equal(dominated.length, 0);
});

test('minimising objectives inverts the dominance direction', () => {
  const objectives = [{ key: 'loss', dir: 'min' }];
  const { frontier } = paretoFrontier([{ id: 'low', loss: 1 }, { id: 'high', loss: 9 }], objectives);
  assert.deepEqual(frontier.map((i) => i.id), ['low']);
});

test('weightedRank returns the same set, reordered', () => {
  const result = searchRotations(ctx, punjab, { cache });
  const ranked = weightedRank(result.frontier, [
    { key: 'reliability', dir: 'max', weight: 1 },
    { key: 'nitrogenNet', dir: 'max', weight: 1 },
    { key: 'erosionTPerHa', dir: 'min', weight: 1 },
    { key: 'marginP10', dir: 'max', weight: 1 },
  ]);
  assert.equal(ranked.length, result.frontier.length);
  assert.deepEqual(
    new Set(ranked.map((r) => r.key)),
    new Set(result.frontier.map((r) => r.key)),
  );
});

test('the frontier is small enough to be a shortlist and large enough to be a choice', () => {
  const result = searchRotations(ctx, punjab, { cache });
  assert.ok(result.frontier.length >= 3, `frontier has only ${result.frontier.length} members`);
  assert.ok(result.frontier.length < result.results.length / 4, 'frontier is not selective');
});

test('region packs expose the fields the UI reads', () => {
  for (const id of ['indo-gangetic', 'us-corn-belt', 'east-african-highlands', 'deccan', 'mekong']) {
    const r = region(id);
    assert.ok(r, `missing region ${id}`);
    assert.equal(r.seasons.length, 2, `${id} seasons`);
    assert.ok(r.seasons.every((s) => s.crops.length > 0), `${id} has an empty season`);
    assert.ok(r.currency, `${id} currency`);
    assert.ok(r.scaleAreaHa > 0, `${id} scale area`);
    assert.ok(r.scaleAreaLabel, `${id} scale label`);
  }
});

test('region lookup throws on an unknown id', () => {
  assert.throws(() => region('atlantis'));
});

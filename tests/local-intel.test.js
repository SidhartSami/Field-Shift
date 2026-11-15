import { test } from 'node:test';
import assert from 'node:assert/strict';
import { basicIntel, SEASON_MM, localIntelSummary } from '../dist/ui/local-intel.js';

test('basicIntel reports demand, gap and a 0–100 screen', () => {
  const r = basicIntel({
    summer: 'rice', winter: 'wheat', irrigation: 500, soil: 'loam',
    residue: true, dry: 0, heat: 0, climateRain: 900,
  });
  assert.equal(r.demand, Math.round((SEASON_MM.rice + SEASON_MM.wheat) / 2));
  assert.ok(r.gap >= 0 && r.score >= 0 && r.score <= 100);
  assert.equal(r.basis, 'basic');
  assert.match(localIntelSummary(r), /Demand/);
});

test('more irrigation never increases the unmet gap', () => {
  const a = basicIntel({ summer: 'maize', winter: 'wheat', irrigation: 200, soil: 'sand', residue: true, dry: 0, heat: 0 });
  const b = basicIntel({ summer: 'maize', winter: 'wheat', irrigation: 800, soil: 'sand', residue: true, dry: 0, heat: 0 });
  assert.ok(b.gap <= a.gap);
});

test('dry scenario reduces effective rain and never improves the gap', () => {
  const wet = basicIntel({ summer: 'rice', winter: 'wheat', irrigation: 400, soil: 'loam', residue: true, dry: 0, heat: 0 });
  const dry = basicIntel({ summer: 'rice', winter: 'wheat', irrigation: 400, soil: 'loam', residue: true, dry: 40, heat: 0 });
  assert.ok(dry.rain < wet.rain);
  assert.ok(dry.gap >= wet.gap);
});

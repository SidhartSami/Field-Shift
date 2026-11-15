/**
 * Engine primitives: the physics and bookkeeping that everything else rests on.
 *
 * These are property tests, not golden-number tests. A golden number would break
 * every time a coefficient is corrected; a property survives refactoring and
 * still catches the failures that matter: water content outside physical
 * bounds, a nitrogen balance that rewards the wrong thing, an ET0 that goes
 * negative at night.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { CROPS, crop, PATHOGENS } from '../dist/engine/crops.js';
import { soilHydraulics, totalAvailableWater, textureClass } from '../dist/engine/soil.js';
import { et0, extraterrestrialRadiation } from '../dist/engine/eto.js';
import { kFactor, lsFactor, cFactor, pFactor, rusle } from '../dist/engine/erosion.js';
import { nitrogenBalance, socTrajectory } from '../dist/engine/nitrogen.js';
import { effectiveRainMonth, parseStart } from '../dist/engine/context.js';

test('every crop has the parameters the water balance needs', () => {
  const ids = Object.keys(CROPS);
  assert.ok(ids.length >= 15, `only ${ids.length} crops defined`);
  for (const id of ids) {
    const c = CROPS[id];
    assert.ok(c.name, `${id} has no name`);
    assert.ok(c.family, `${id} has no family`);
    for (const stage of ['ini', 'mid', 'end']) {
      assert.ok(Number.isFinite(c.kcb[stage]), `${id} Kcb.${stage}`);
      assert.ok(c.kcb[stage] > 0 && c.kcb[stage] <= 1.4, `${id} Kcb.${stage} out of range`);
    }
    assert.equal(c.stages.length, 4, `${id} needs four growth stages`);
    assert.ok(c.stages.every((d) => d > 0), `${id} has a zero-length stage`);
    assert.ok(c.zr > 0 && c.zr < 4, `${id} rooting depth ${c.zr}`);
    assert.ok(c.p > 0 && c.p < 1, `${id} depletion fraction ${c.p}`);
    assert.ok(Number.isFinite(c.tcrit), `${id} critical temperature`);
    assert.ok(c.cover >= 0 && c.cover <= 1, `${id} cover ${c.cover}`);
    assert.ok(c.source, `${id} has no citation`);
  }
});

test('crop lookup throws on an unknown id rather than returning a silent default', () => {
  assert.throws(() => crop('not-a-crop'), /Unknown crop/);
  assert.equal(crop('wheat').name, 'Wheat');
});

test('legumes are the only nitrogen-fixing family', () => {
  const fixers = Object.values(CROPS).filter((c) => c.nfix > 0);
  assert.ok(fixers.length >= 3, 'expected several legumes');
  for (const c of fixers) assert.equal(c.family, 'legume', `${c.name} fixes N but is ${c.family}`);
});

test('pathogen table is internally consistent', () => {
  for (const [id, entry] of Object.entries(PATHOGENS)) {
    assert.ok(CROPS[entry.crop], `pathogen ${id} names unknown crop ${entry.crop}`);
    assert.ok(entry.name && entry.latin, `pathogen ${id} missing names`);
    assert.ok(entry.tmin < entry.tmax, `pathogen ${id} temperature window inverted`);
    assert.ok(entry.rhMin > 0 && entry.rhMin <= 100, `pathogen ${id} humidity threshold`);
  }
});

test('every disease a crop declares exists in the pathogen table', () => {
  for (const [id, c] of Object.entries(CROPS)) {
    for (const d of c.disease) {
      assert.ok(PATHOGENS[d], `${id} declares unknown disease ${d}`);
      assert.equal(PATHOGENS[d].crop, id, `${d} is registered to ${PATHOGENS[d].crop}, not ${id}`);
    }
  }
});

test('soil hydraulics stay inside physical bounds for any texture', () => {
  for (const clay of [5, 15, 25, 35, 45, 60]) {
    for (const sand of [5, 20, 40, 60, 80]) {
      if (clay + sand > 100) continue;
      const h = soilHydraulics({ clay, sand, soc: 0.6 });
      assert.ok(h.wp > 0 && h.wp < 0.4, `wp ${h.wp} at clay ${clay} sand ${sand}`);
      assert.ok(h.fc > h.wp, `fc ${h.fc} <= wp ${h.wp}`);
      assert.ok(h.sat > h.fc, `sat ${h.sat} <= fc ${h.fc}`);
      assert.ok(h.awcMmPerM > 0 && h.awcMmPerM < 400, `awc ${h.awcMmPerM}`);
    }
  }
});

test('heavier clay holds more plant-available water than sand', () => {
  const clay = soilHydraulics({ clay: 45, sand: 20, soc: 0.6 });
  const sand = soilHydraulics({ clay: 8, sand: 85, soc: 0.6 });
  assert.ok(clay.awcMmPerM > sand.awcMmPerM);
});

test('total available water scales with rooting depth and never goes below 10 mm', () => {
  assert.equal(totalAvailableWater(150, 1.0), 150);
  assert.equal(totalAvailableWater(150, 0.5), 75);
  assert.equal(totalAvailableWater(1, 0.1), 10);
});

test('texture class covers the USDA range without gaps', () => {
  assert.equal(textureClass(45, 20), 'clay');
  assert.equal(textureClass(30, 30), 'clay loam');
  assert.equal(textureClass(10, 80), 'sandy loam');
  assert.equal(textureClass(22, 40), 'loam');
  assert.equal(textureClass(12, 30), 'silt loam');
  // Silt has to be able to override clay: the Punjab field is 22% clay, 22% sand,
  // 56% silt, which is a silt loam and not a loam.
  assert.equal(textureClass(22.1, 21.6, 56.1), 'silt loam');
  assert.equal(textureClass(37.2, 14.0, 49.0), 'silty clay loam');
  assert.equal(textureClass(43.0, 17.9, 38.7), 'clay');
  // Silt is derived when it is not supplied.
  assert.equal(textureClass(22.1, 21.6), 'silt loam');
});

test('extraterrestrial radiation is zero at the poles in polar night', () => {
  assert.ok(extraterrestrialRadiation(80, 355) < 1);
  assert.ok(extraterrestrialRadiation(0, 172) > 30);
});

test('ET0 is finite, non-negative and higher on a hot dry day', () => {
  const cool = { tmax: 22, tmin: 12, rh: 70, ws: 2, srad: 14 };
  const hot = { tmax: 40, tmin: 28, rh: 30, ws: 3, srad: 26 };
  const a = et0(cool, 31.7, 180, 196);
  const b = et0(hot, 31.7, 180, 196);
  assert.ok(Number.isFinite(a) && a > 0, `cool ET0 ${a}`);
  assert.ok(Number.isFinite(b) && b > a, `hot ET0 ${b} should exceed ${a}`);
});

test('ET0 returns NaN on fill values instead of a plausible number', () => {
  const fill = { tmax: -999, tmin: -999, rh: 60, ws: 2, srad: 20 };
  assert.ok(Number.isNaN(et0(fill, 31.7, 180, 196)));
  const noSun = { tmax: 30, tmin: 20, rh: 60, ws: 2, srad: 0 };
  assert.ok(Number.isNaN(et0(noSun, 31.7, 180, 196)));
});

test('effective rainfall never exceeds gross rainfall', () => {
  for (const p of [0, 5, 40, 120, 240, 400, 900]) {
    const pe = effectiveRainMonth(p);
    assert.ok(pe >= 0, `Pe ${pe} negative at P ${p}`);
    assert.ok(pe <= p, `Pe ${pe} exceeds P ${p}`);
  }
});

test('effective rainfall is monotonic in gross rainfall', () => {
  let previous = -1;
  for (let p = 0; p <= 600; p += 10) {
    const pe = effectiveRainMonth(p);
    assert.ok(pe >= previous - 1e-9, `Pe fell from ${previous} to ${pe} at P ${p}`);
    previous = pe;
  }
});

test('parseStart accepts both POWER and ISO date formats', () => {
  assert.equal(parseStart('19910101').toISOString().slice(0, 10), '1991-01-01');
  assert.equal(parseStart('1991-01-01').toISOString().slice(0, 10), '1991-01-01');
});

test('erodibility rises with silt and falls with sand', () => {
  const silty = kFactor({ sand: 20, silt: 60, clay: 20, soc: 1.0 });
  const sandy = kFactor({ sand: 80, silt: 10, clay: 10, soc: 1.0 });
  assert.ok(silty > sandy, `silty ${silty} should exceed sandy ${sandy}`);
  assert.ok(silty > 0 && silty < 1);
});

test('slope length and steepness both increase the LS factor', () => {
  assert.ok(lsFactor(5) > lsFactor(1));
  assert.ok(lsFactor(2, 200) > lsFactor(2, 100));
});

test('cover and residue both reduce soil loss', () => {
  const bare = cFactor(0.1, false);
  const covered = cFactor(0.9, true);
  assert.ok(covered < bare, `cover ${covered} should be below bare ${bare}`);
  assert.ok(pFactor('terrace') < pFactor('none'));
});

test('RUSLE is zero when there is no erosivity and positive otherwise', () => {
  const base = { k: 0.3, ls: 1.2, meanCover: 0.5, residueRetained: true, practice: 'none' };
  assert.equal(rusle({ ...base, erosivity: 0 }), 0);
  assert.ok(rusle({ ...base, erosivity: 300 }) > 0);
});

test('a legume in the rotation improves the nitrogen balance', () => {
  const withLegume = nitrogenBalance(
    [{ cropId: 'chickpea' }, { cropId: 'wheat' }, { cropId: 'chickpea' }, { cropId: 'wheat' }],
    { residueRetained: true },
  );
  const withoutLegume = nitrogenBalance(
    [{ cropId: 'rice' }, { cropId: 'wheat' }, { cropId: 'rice' }, { cropId: 'wheat' }],
    { residueRetained: true },
  );
  assert.ok(withLegume.net > withoutLegume.net, `${withLegume.net} vs ${withoutLegume.net}`);
});

test('retaining residue never lowers the nitrogen balance', () => {
  const seasons = [{ cropId: 'maize' }, { cropId: 'wheat' }, { cropId: 'maize' }, { cropId: 'wheat' }];
  const kept = nitrogenBalance(seasons, { residueRetained: true });
  const burnt = nitrogenBalance(seasons, { residueRetained: false });
  assert.ok(kept.net >= burnt.net);
});

test('soil carbon trajectory is a bounded percentage change', () => {
  const seasons = [{ cropId: 'mung' }, { cropId: 'wheat' }, { cropId: 'mung' }, { cropId: 'wheat' }];
  const soc = socTrajectory(seasons, { residueRetained: true, socPct: 0.45 });
  assert.ok(Number.isFinite(soc.deltaPct));
  assert.ok(Math.abs(soc.deltaPct) < 100, `implausible SOC delta ${soc.deltaPct}%`);
});

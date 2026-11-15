/**
 * Data integrity.
 *
 * The app's whole claim is that its numbers come from a specific, named NASA
 * product over a specific, named period. These tests hold that claim to account:
 * if a bundle is truncated, mislabelled or missing provenance, the suite fails
 * before the app can quietly render a shorter record.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { fieldIndex, loadBundle, FIELDS_DIR } from './_helpers.js';
import fs from 'node:fs';

const index = fieldIndex();

test('field index lists five fields across five regions', () => {
  assert.equal(index.length, 5);
  const regions = new Set(index.map((f) => f.region));
  assert.equal(regions.size, 5, 'each field should exercise a different region pack');
});

test('every indexed field has a bundle on disk', () => {
  for (const entry of index) {
    const file = `${FIELDS_DIR}/${entry.id}.json`;
    assert.ok(fs.existsSync(file), `missing bundle for ${entry.id}`);
  }
});

test('every bundle carries the full 1991-2024 daily record', () => {
  for (const entry of index) {
    const b = loadBundle(entry.id);
    assert.equal(b.daily.start, '19910101', `${entry.id} start date`);
    // 1991-01-01 through 2024-12-31 inclusive, leap years included.
    assert.equal(b.daily.n, 12419, `${entry.id} day count`);
    for (const key of ['tmax', 'tmin', 'tmean', 'precip', 'rh', 'ws']) {
      assert.equal(b.daily[key].length, b.daily.n, `${entry.id}.${key} length`);
    }
  }
});

test('no daily series contains a fill value', () => {
  for (const entry of index) {
    const b = loadBundle(entry.id);
    for (const key of ['tmax', 'tmin', 'tmean', 'precip', 'rh', 'ws']) {
      const bad = b.daily[key].filter((v) => !Number.isFinite(v) || v <= -900);
      assert.equal(bad.length, 0, `${entry.id}.${key} has ${bad.length} fill values`);
    }
  }
});

test('every bundle names its meteorology source and retrieval date', () => {
  for (const entry of index) {
    const b = loadBundle(entry.id);
    const p = b.provenance?.meteorology;
    assert.ok(p, `${entry.id} has no meteorology provenance`);
    assert.match(p.source, /NASA POWER/i);
    assert.match(p.product, /MERRA-2/i);
    assert.match(p.retrieved, /^\d{4}-\d{2}-\d{2}$/);
    assert.match(p.url, /^https:\/\/power\.larc\.nasa\.gov\//);
  }
});

test('every bundle names its vegetation source', () => {
  for (const entry of index) {
    const b = loadBundle(entry.id);
    assert.match(b.provenance?.vegetation?.source ?? '', /MODIS/i);
  }
});

test('soil properties are physically plausible', () => {
  for (const entry of index) {
    const b = loadBundle(entry.id);
    const clay = b.soil.clay.value;
    const sand = b.soil.sand.value;
    assert.ok(clay > 0 && clay < 100, `${entry.id} clay ${clay}`);
    assert.ok(sand > 0 && sand < 100, `${entry.id} sand ${sand}`);
    assert.ok(clay + sand <= 100, `${entry.id} clay+sand exceeds 100`);
    assert.ok(b.soil.soc.value > 0, `${entry.id} soc`);
  }
});

test('temperature and rainfall are inside climatological bounds', () => {
  for (const entry of index) {
    const b = loadBundle(entry.id);
    const tmax = Math.max(...b.daily.tmax);
    const tmin = Math.min(...b.daily.tmin);
    const rain = b.daily.precip.reduce((a, v) => a + Math.max(0, v), 0);
    assert.ok(tmax < 55, `${entry.id} tmax ${tmax}`);
    assert.ok(tmin > -40, `${entry.id} tmin ${tmin}`);
    assert.ok(rain > 0, `${entry.id} has no rainfall at all`);
  }
});

test('the Punjab record contains the 1999 drought the docs cite', () => {
  const b = loadBundle('punjab-sheikhupura');
  const d = b.daily;
  let mm1999 = 0;
  for (let i = 0; i < d.n; i += 1) {
    const year = 1991 + Math.floor(i / 365.25);
    if (year === 1999) mm1999 += Math.max(0, d.precip[i]);
  }
  // The model card and pitch both name 1999 as the driest year on record.
  assert.ok(mm1999 > 100 && mm1999 < 300, `1999 rainfall ${mm1999} mm`);
});

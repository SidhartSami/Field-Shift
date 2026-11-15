/**
 * Formatting.
 *
 * Every number a judge or a farmer reads passes through these functions, so the
 * failure mode to guard against is not a crash — it is a plausible-looking wrong
 * number. Missing data must render as an em dash, never as zero.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  num, pct, mm, money, signed, cropName, cropLocal,
  rotationLabel, rotationShort, chip, escapeHtml,
} from '../dist/ui/format.js';

test('missing values render as an em dash, never as zero', () => {
  for (const v of [NaN, Infinity, -Infinity, undefined, null]) {
    assert.equal(num(v), '—', `num(${v})`);
    assert.equal(pct(v), '—', `pct(${v})`);
    assert.equal(money(v, 'PKR'), '—', `money(${v})`);
    assert.equal(signed(v), '—', `signed(${v})`);
  }
});

test('num respects the requested precision', () => {
  assert.equal(num(1234.5678, 0), '1,235');
  assert.equal(num(1234.5678, 1), '1,234.6');
  assert.equal(num(0, 2), '0.00');
});

test('pct converts a fraction to a percentage', () => {
  assert.equal(pct(0.42), '42%');
  assert.equal(pct(0.855, 1), '85.5%');
  assert.equal(pct(1), '100%');
  assert.equal(pct(0), '0%');
});

test('mm appends the unit', () => {
  assert.equal(mm(937), '937 mm');
  assert.equal(mm(0), '0 mm');
});

test('money scales to thousands, millions and billions', () => {
  assert.equal(money(950, 'PKR'), '950 PKR');
  assert.equal(money(156000, 'PKR'), '156k PKR');
  assert.equal(money(4200000, 'PKR'), '4.2m PKR');
  assert.equal(money(1010000000, 'PKR'), '1.0bn PKR');
});

test('money keeps the sign on a loss', () => {
  assert.ok(money(-156000, 'PKR').startsWith('-'));
});

test('signed marks a gain explicitly and leaves a loss alone', () => {
  assert.equal(signed(8.7), '+8.7');
  assert.equal(signed(-74.3), '-74.3');
  assert.equal(signed(0), '0.0');
});

test('crop names resolve, and unknown ids pass through rather than vanishing', () => {
  assert.equal(cropName('wheat'), 'Wheat');
  assert.equal(cropName('fallow'), 'Fallow');
  assert.equal(cropName('quinoa'), 'quinoa');
  assert.equal(cropLocal('wheat'), 'Gandum');
  assert.equal(cropLocal('fallow'), '—');
});

test('rotation labels read as a sequence', () => {
  const r = ['cotton', 'chickpea', 'cotton', 'chickpea'];
  assert.equal(rotationLabel(r), 'Cotton · Chickpea · Cotton · Chickpea');
  assert.equal(rotationShort(r), 'Cotton–Chickpea–Cotton–Chickpea');
});

test('chips only ever emit the three provenance classes', () => {
  assert.match(chip('observed'), /chip-observed/);
  assert.match(chip('reanalysis'), /chip-reanalysis/);
  assert.match(chip('simulated'), /chip-simulated/);
  assert.match(chip('anything-else'), /chip-simulated/);
});

test('escapeHtml neutralises every character that could break out of markup', () => {
  assert.equal(escapeHtml('<script>'), '&lt;script&gt;');
  assert.equal(escapeHtml('a & b'), 'a &amp; b');
  assert.equal(escapeHtml('"quoted"'), '&quot;quoted&quot;');
  assert.equal(escapeHtml("it's"), 'it&#39;s');
  assert.equal(escapeHtml('plain'), 'plain');
});

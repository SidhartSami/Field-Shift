/**
 * Describe-it.
 *
 * The natural-language parser came from the voice-entry branch; this file
 * covers the adapter that folds its output into the Rotation Lab controls.
 * The parser's own tests live in tests/voice-live.test.js and run unmodified.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { parseUtterance } from '../dist/voice-live.js';
import { applyDescription, describeSummary } from '../dist/ui/describe.js';

const OPTIONS = { irrigationMm: 900, residueRetained: true, practice: 'none', slopePct: 0.5 };

test('irrigation in a sentence sets the supply slider', () => {
  const r = applyDescription(OPTIONS, parseUtterance('irrigation is 400 mm per year'));
  assert.equal(r.options.irrigationMm, 400);
  assert.deepEqual(r.applied, ['water supply']);
  assert.equal(r.stress, false);
});

test('supply is clamped to the slider range rather than trusted', () => {
  assert.equal(applyDescription(OPTIONS, { irrigation: 9999 }).options.irrigationMm, 1600);
  assert.equal(applyDescription(OPTIONS, { irrigation: -50 }).options.irrigationMm, 0);
});

test('residue is applied in both directions', () => {
  assert.equal(applyDescription(OPTIONS, parseUtterance('clear residue')).options.residueRetained, false);
  assert.equal(applyDescription(OPTIONS, parseUtterance('keep the crop residue')).options.residueRetained, true);
});

test('any mention of drying or warming turns the stress test on', () => {
  assert.equal(applyDescription(OPTIONS, parseUtterance('make it drier by 30')).stress, true);
  assert.equal(applyDescription(OPTIONS, parseUtterance('hotter by 2 degrees')).stress, true);
  assert.equal(applyDescription(OPTIONS, parseUtterance('irrigation 400')).stress, false);
});

test('facts the Lab cannot act on are named, not silently dropped', () => {
  const r = applyDescription(OPTIONS, parseUtterance('clay soil on 12 acres in Lahore'));
  assert.deepEqual(r.applied, []);
  assert.ok(r.ignored.includes('soil texture'));
  assert.ok(r.ignored.includes('field area'));
  assert.ok(r.ignored.includes('location'));
  const line = describeSummary(r);
  assert.match(line, /Not used here/);
  assert.match(line, /soil texture/);
});

test('a mixed sentence applies what maps and reports the rest', () => {
  const r = applyDescription(OPTIONS, parseUtterance('irrigation 400, clay soil, plant chickpea'));
  assert.equal(r.options.irrigationMm, 400);
  assert.deepEqual(r.applied, ['water supply']);
  assert.ok(r.ignored.includes('soil texture'));
  assert.ok(r.ignored.includes('winter crop'));
  assert.match(describeSummary(r), /^Applied: water supply\./);
});

test('the input options object is never mutated', () => {
  const before = { ...OPTIONS };
  applyDescription(OPTIONS, parseUtterance('irrigation 400 and clear residue'));
  assert.deepEqual(OPTIONS, before);
});

test('an empty or irrelevant sentence produces no summary', () => {
  assert.equal(describeSummary(applyDescription(OPTIONS, parseUtterance('hello there'))), '');
  assert.equal(describeSummary(applyDescription(OPTIONS, {})), '');
});

test('the describe input is present in the shipped app', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const html = fs.readFileSync(path.join(root, 'dist', 'app.html'), 'utf8');
  assert.ok(html.includes('id="describe"'), 'app.html lost the describe input');
  assert.ok(html.includes('id="describe-read"'), 'app.html lost the describe readout');
});

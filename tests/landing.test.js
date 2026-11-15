/**
 * Landing page.
 *
 * dist/index.html is the front page; dist/app.html is the tool. This file
 * guards the split and keeps the landing page's numbers tied to the engine —
 * a landing page that drifts from the model is the fastest way to lose a
 * judge's trust, because it is the first thing they read.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { evaluateRotation } from '../dist/engine/evaluate.js';
import { searchRotations } from '../dist/engine/search.js';
import { reference } from './_helpers.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => fs.readFileSync(path.join(ROOT, 'dist', f), 'utf8');

const landing = read('index.html');
const app = read('app.html');
const model = read('model.html');
const pitch = read('pitch.html');

const { ctx, region: punjab, cache, years } = reference();
const OPTIONS = { irrigationMm: 900, residueRetained: true, practice: 'none', slopePct: 0.5 };
const evaluate = (rotation) =>
  evaluateRotation(ctx, punjab, rotation, cache, { ...OPTIONS, years });

const current = evaluate(['rice', 'wheat', 'rice', 'wheat']);
const proposed = evaluate(['cotton', 'chickpea', 'cotton', 'chickpea']);
const search = searchRotations(ctx, punjab, { ...OPTIONS, cache });

test('the landing page is the root document and the app is not', () => {
  assert.ok(fs.existsSync(path.join(ROOT, 'dist', 'index.html')));
  assert.ok(fs.existsSync(path.join(ROOT, 'dist', 'app.html')));
  assert.ok(landing.includes('worked for your father'), 'index.html is not the landing page');
  assert.ok(!landing.includes('id="view-lab"'), 'index.html still contains the app');
  assert.ok(app.includes('id="view-lab"'), 'app.html is not the app');
});

test('the landing page routes to every other surface', () => {
  for (const href of ['app.html', 'model.html', 'pitch.html']) {
    assert.ok(landing.includes(`href="${href}"`), `landing page does not link to ${href}`);
  }
});

test('no shipped page still treats index.html as the app', () => {
  for (const [name, html] of [['app.html', app], ['model.html', model], ['pitch.html', pitch]]) {
    assert.ok(!html.includes('href="index.html"'), `${name} still links to index.html`);
  }
});

test('the landing page carries the non-affiliation disclaimer', () => {
  assert.ok(
    landing.includes('No affiliation or endorsement is claimed'),
    'the landing page must not imply NASA endorsement',
  );
});

test('the landing page cites the search size the engine produces', () => {
  assert.equal(search.candidates, 2304);
  assert.equal(search.distinct, 1176);
  assert.equal(search.simulatedSeasons, 152064);
  assert.equal(years.length, 33);
  for (const n of ['2,304', '1,176', '152,064']) {
    assert.ok(landing.includes(n), `landing page no longer states ${n}`);
  }
});

test('the landing page cites both reliabilities correctly', () => {
  assert.equal(Math.round(current.reliability * 100), 39);
  assert.equal(Math.round(proposed.reliability * 100), 85);
  assert.ok(landing.includes('39%'));
  assert.ok(landing.includes('85%'));
});

test('the landing page cites both irrigation requirements correctly', () => {
  assert.equal(current.meanRequirement, 938);
  assert.equal(proposed.meanRequirement, 703);
  assert.ok(landing.includes('938 mm'));
  assert.ok(landing.includes('703 mm'));
});

test('the landing page cites both nitrogen balances correctly', () => {
  assert.equal(Math.round(current.nitrogen.net), -74);
  assert.equal(Math.round(proposed.nitrogen.net), 9);
  assert.ok(landing.includes('−74 kg N'));
  assert.ok(landing.includes('+9 kg N'));
});

test('the landing page cites both downside margins correctly', () => {
  assert.equal(current.marginP10, 156000);
  assert.equal(proposed.marginP10, 160000);
  assert.ok(landing.includes('156k PKR'));
  assert.ok(landing.includes('160k PKR'));
});

test('the landing page names the failing years the engine actually returns', () => {
  assert.equal(current.failingYears.length, 20);
  assert.ok(landing.includes('Twenty of the last thirty-three'));
  for (const year of current.failingYears) {
    assert.ok(landing.includes(String(year)), `landing page omits failing year ${year}`);
  }
});

test('the landing page does not claim maize-wheat is the recommendation', () => {
  const maize = evaluate(['maize', 'wheat', 'maize', 'wheat']);
  assert.equal(maize.reliability, 1);
  assert.ok(maize.nitrogen.net < current.nitrogen.net);
  assert.ok(landing.includes('do not recommend it'));
  assert.ok(landing.includes('121 kg'));
});

test('every screenshot the landing page references exists and is a real JPEG', () => {
  const refs = [...landing.matchAll(/src="(assets\/shots\/[^"]+)"/g)].map((m) => m[1]);
  assert.ok(refs.length >= 4, 'the landing page should show the product');
  for (const rel of new Set(refs)) {
    const file = path.join(ROOT, 'dist', rel);
    assert.ok(fs.existsSync(file), `missing screenshot ${rel}`);
    const buf = fs.readFileSync(file);
    assert.equal(buf[0], 0xff, `${rel} is not a JPEG`);
    assert.equal(buf[1], 0xd8, `${rel} is not a JPEG`);
    assert.ok(buf.length > 20000, `${rel} looks like a placeholder`);
  }
});

test('the landing page declares intrinsic image sizes so nothing shifts on load', () => {
  const imgs = [...landing.matchAll(/<img [^>]*>/g)].map((m) => m[0]);
  assert.ok(imgs.length >= 4);
  for (const tag of imgs) {
    assert.match(tag, /width="\d+"/, `img without width: ${tag.slice(0, 60)}`);
    assert.match(tag, /height="\d+"/, `img without height: ${tag.slice(0, 60)}`);
    assert.match(tag, /alt="[^"]{20,}"/, `img without a real alt: ${tag.slice(0, 60)}`);
  }
});

test('the landing page reuses the app stylesheet rather than forking the palette', () => {
  assert.ok(landing.includes('href="app.css"'));
  assert.ok(!landing.includes('<link rel="stylesheet" href="landing.css"'));
});

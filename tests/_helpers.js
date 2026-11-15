/**
 * Shared fixtures for the test suite.
 *
 * The tests run against the same engine modules the browser loads, from
 * dist/engine, so a passing suite means the shipped code is correct, not a
 * parallel copy of it.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildContext } from '../dist/engine/context.js';
import { region } from '../dist/engine/regions.js';
import { buildSeasonCache, usableYears } from '../dist/engine/evaluate.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const FIELDS_DIR = path.join(ROOT, 'data', 'fields');

export function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}

export function fieldIndex() {
  return readJson('data/fields/index.json');
}

export function loadBundle(id) {
  return readJson(`data/fields/${id}.json`);
}

/** The Punjab field is the reference case used throughout the docs and pitch. */
export const REFERENCE_FIELD = 'punjab-sheikhupura';

let cached = null;

/**
 * Build the Punjab context, region pack, season cache and usable years once.
 * The search is ~50 ms, but the cache build is not, so share it.
 */
export function reference() {
  if (cached) return cached;
  const bundle = loadBundle(REFERENCE_FIELD);
  const ctx = buildContext(bundle);
  const reg = region(bundle.region);
  const cache = buildSeasonCache(ctx, reg);
  const years = usableYears(ctx, reg, cache);
  cached = { bundle, ctx, region: reg, cache, years };
  return cached;
}

/** Annual rainfall totals for the given years, in mm, sorted driest first. */
export function annualRain(ctx, years) {
  const d = ctx.bundle.daily;
  const totals = new Map();
  for (let i = 0; i < d.n; i += 1) {
    const date = new Date(ctx.startDate.getTime() + i * 86400000);
    const y = date.getUTCFullYear();
    totals.set(y, (totals.get(y) ?? 0) + Math.max(0, d.precip[i] || 0));
  }
  return years
    .map((year) => ({ year, mm: Math.round(totals.get(year) ?? 0) }))
    .sort((a, b) => a.mm - b.mm);
}

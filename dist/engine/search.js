/**
 * Rotation search.
 *
 * Enumerates every legal four-season sequence in a region pack, evaluates each
 * against the full historical record, and returns the efficient frontier.
 *
 * For Punjab that is 8 kharif x 6 rabi x 8 kharif x 6 rabi = 2,304 sequences.
 * Many are the same two-year cycle started at a different point, so the results
 * are de-duplicated by canonical rotation before display.
 */

import { evaluateRotation, buildSeasonCache, usableYears } from './evaluate.js';
import { buildContext } from './context.js';
import { paretoFrontier } from './pareto.js';

export const OBJECTIVES = [
  { key: 'reliability', dir: 'max', label: 'Water reliability' },
  { key: 'nitrogenNet', dir: 'max', label: 'Nitrogen balance' },
  { key: 'erosionTPerHa', dir: 'min', label: 'Soil loss' },
  { key: 'marginP10', dir: 'max', label: 'Downside margin' },
];

/** Every four-season sequence, in season order. */
export function enumerateRotations(region) {
  const [s0, s1] = region.seasons;
  const out = [];
  for (const a of s0.crops) {
    for (const b of s1.crops) {
      for (const c of s0.crops) {
        for (const d of s1.crops) {
          out.push([a.id, b.id, c.id, d.id]);
        }
      }
    }
  }
  return out;
}

/** Canonical form of a two-year cycle, so [a,b,c,d] and [c,d,a,b] collapse. */
export function canonical(rotation) {
  const shifts = [0, 1, 2, 3].map((k) => rotation.slice(k).concat(rotation.slice(0, k)).join('|'));
  return shifts.sort()[0];
}

/**
 * Evaluate every rotation and split into frontier and dominated sets.
 * @param {object} ctx
 * @param {object} region
 * @param {object} options
 */
export function searchRotations(ctx, region, options = {}) {
  const cache = options.cache ?? buildSeasonCache(ctx, region, options);
  const years = usableYears(ctx, region, cache);
  const rotations = enumerateRotations(region);

  const seen = new Set();
  const results = [];
  for (const rotation of rotations) {
    const key = canonical(rotation);
    if (seen.has(key)) continue;
    seen.add(key);
    const evaluated = evaluateRotation(ctx, region, rotation, cache, { ...options, years });
    results.push({
      ...evaluated,
      socDelta: evaluated.soc.deltaPct,
      nitrogenNet: evaluated.nitrogen.net,
      key,
    });
  }

  const { frontier, dominated } = paretoFrontier(results, OBJECTIVES);
  frontier.sort((a, b) => b.reliability - a.reliability || b.nitrogenNet - a.nitrogenNet);

  return {
    cache,
    years,
    candidates: rotations.length,
    distinct: results.length,
    results,
    frontier,
    dominated,
    simulatedSeasons: rotations.length * years.length * 2,
  };
}

/**
 * Re-run the search under a climate delta, for the 2050 stress test.
 * @param {object} ctx
 * @param {object} region
 * @param {{dTempC:number, dPrecipPct:number}} delta
 * @param {object} options
 */
export function searchUnderDelta(ctx, region, delta, options = {}) {
  const shifted = shiftContext(ctx, delta);
  return searchRotations(shifted, region, options);
}

/** Apply a uniform temperature and precipitation delta to a field context. */
export function shiftContext(ctx, { dTempC = 0, dPrecipPct = 0 }) {
  const d = ctx.bundle.daily;
  const n = d.n;
  const factor = 1 + dPrecipPct / 100;
  const tmax = new Array(n);
  const tmin = new Array(n);
  const tmean = new Array(n);
  const precip = new Array(n);
  for (let i = 0; i < n; i += 1) {
    tmax[i] = d.tmax[i] + dTempC;
    tmin[i] = d.tmin[i] + dTempC;
    tmean[i] = d.tmean[i] + dTempC;
    precip[i] = Math.max(0, d.precip[i] * factor);
  }
  const bundle = {
    ...ctx.bundle,
    daily: { ...d, tmax, tmin, tmean, precip },
  };
  return buildContext(bundle, ctx.soil);
}

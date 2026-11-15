/**
 * Rotation evaluation.
 *
 * Two tiers, deliberately:
 *
 *  - The *search* tier caches one simulation per (season, crop, year) with
 *    unlimited irrigation, so the irrigation requirement and heat exposure of
 *    every crop in every year are computed once. A rotation is then four array
 *    lookups per year, which is what makes a 2,304-rotation search instant.
 *
 *  - The *detail* tier re-runs the selected rotation with the farmer's actual
 *    water supply allocated in proportion to demand, so stress days and applied
 *    water are physical rather than inferred.
 */

import { CROPS } from './crops.js';
import { simulateSeason } from './season.js';
import { kFactor, lsFactor, rusle } from './erosion.js';
import { nitrogenBalance, socTrajectory } from './nitrogen.js';

const UNLIMITED = 1e9;

/**
 * Simulate every crop in every season of every year once.
 * @param {object} ctx
 * @param {object} region region pack
 * @param {object} options { residueRetained, slopePct, practice }
 */
export function buildSeasonCache(ctx, region, options = {}) {
  const cache = {};
  for (const season of region.seasons) {
    cache[season.id] = {};
    for (const entry of season.crops) {
      const byYear = {};
      for (const year of ctx.years) {
        const result = simulateSeason(
          ctx,
          entry.id,
          { ...entry, seasonId: season.id },
          year,
          { ...options, irrigationMm: UNLIMITED },
        );
        if (result) byYear[year] = result;
      }
      cache[season.id][entry.id] = byYear;
    }
  }
  return cache;
}

/** Years that have a complete pair of seasons for every crop in the region. */
export function usableYears(ctx, region, cache) {
  const years = [];
  for (const year of ctx.years) {
    let ok = true;
    for (const season of region.seasons) {
      for (const entry of season.crops) {
        if (!cache[season.id][entry.id][year]) {
          ok = false;
          break;
        }
      }
      if (!ok) break;
    }
    if (ok) years.push(year);
  }
  return years;
}

/**
 * Evaluate one four-season rotation across the whole record.
 * @param {object} ctx
 * @param {object} region
 * @param {string[]} rotation four crop ids, in season order
 * @param {object} cache from buildSeasonCache
 * @param {object} options { irrigationMm, toleranceMm, heatToleranceDays, residueRetained, slopePct, practice, socPct }
 */
export function evaluateRotation(ctx, region, rotation, cache, options = {}) {
  const years = options.years ?? usableYears(ctx, region, cache);
  const tolerance = options.toleranceMm ?? 0;
  const supply = options.irrigationMm ?? 0;
  const [s0, s1] = region.seasons;

  const perYear = [];
  let reliable = 0;
  let worst = null;
  let totalRequirement = 0;
  let totalUnmet = 0;
  let totalHeat = 0;
  let erosivity = 0;
  let coverWeighted = 0;
  let durationTotal = 0;
  const disease = {};

  for (let i = 0; i < years.length; i += 1) {
    const year = years[i];
    const pair = i % 2 === 0 ? [rotation[0], rotation[1]] : [rotation[2], rotation[3]];
    const a = cache[s0.id][pair[0]]?.[year];
    const b = cache[s1.id][pair[1]]?.[year];
    if (!a || !b) continue;

    const requirement = a.requirement + b.requirement;
    const unmet = Math.max(0, requirement - supply);
    const heatDays = a.heatDays + b.heatDays;
    const margin = a.margin[1] + b.margin[1];
    const marginLow = a.margin[0] + b.margin[0];
    const marginHigh = a.margin[2] + b.margin[2];

    // Water reliability is a binary, checkable statement: did the rotation's
    // irrigation requirement fit inside the water the farmer can supply?
    // Heat is reported separately as exposure, not folded into a fake pass/fail.
    const ok = unmet <= tolerance;
    if (ok) reliable += 1;

    totalRequirement += requirement;
    totalUnmet += unmet;
    totalHeat += heatDays;
    erosivity += a.erosivity + b.erosivity;
    coverWeighted += a.meanCover * a.duration + b.meanCover * b.duration;
    durationTotal += a.duration + b.duration;

    for (const [id, days] of Object.entries(a.diseaseDays)) disease[id] = (disease[id] ?? 0) + days;
    for (const [id, days] of Object.entries(b.diseaseDays)) disease[id] = (disease[id] ?? 0) + days;

    const record = { year, requirement, unmet, heatDays, margin, marginLow, marginHigh, ok };
    perYear.push(record);
    if (!worst || unmet > worst.unmet) worst = record;
  }

  const n = perYear.length || 1;
  const margins = perYear.map((y) => y.margin).sort((x, y) => x - y);
  const meanCover = durationTotal > 0 ? coverWeighted / durationTotal : 0;

  const soil = ctx.soil;
  const k = kFactor({
    sand: soil.sand ?? 45,
    silt: soil.silt ?? 33,
    clay: soil.clay ?? 22,
    soc: soil.soc ?? 0.45,
  });
  const ls = lsFactor(options.slopePct ?? 1);
  const erosionTPerHa = rusle({
    erosivity: erosivity / n,
    k,
    ls,
    meanCover,
    residueRetained: options.residueRetained !== false,
    practice: options.practice ?? 'none',
  });

  const seasons = [
    { cropId: rotation[0] },
    { cropId: rotation[1] },
    { cropId: rotation[2] },
    { cropId: rotation[3] },
  ];
  const nBalance = nitrogenBalance(seasons, {
    residueRetained: options.residueRetained !== false,
  });
  const soc = socTrajectory(seasons, {
    residueRetained: options.residueRetained !== false,
    socPct: options.socPct ?? soil.soc ?? 0.45,
  });

  const families = seasons.map((s) => CROPS[s.cropId]?.family ?? 'fallow');
  let breaks = 0;
  for (let i = 1; i < families.length; i += 1) if (families[i] !== families[i - 1]) breaks += 1;
  if (families[0] !== families[families.length - 1]) breaks += 1;

  return {
    rotation,
    years: n,
    reliability: reliable / n,
    reliableYears: reliable,
    failingYears: perYear.filter((y) => !y.ok).map((y) => y.year),
    worstYear: worst ? { year: worst.year, unmet: round(worst.unmet, 0) } : null,
    meanRequirement: round(totalRequirement / n, 0),
    meanUnmet: round(totalUnmet / n, 0),
    meanHeatDays: round(totalHeat / n, 1),
    waterStress: round(totalUnmet / Math.max(1, totalRequirement), 3),
    marginP10: quantile(margins, 0.1),
    marginP50: quantile(margins, 0.5),
    marginP90: quantile(margins, 0.9),
    erosionTPerHa: round(erosionTPerHa, 2),
    nitrogen: nBalance,
    soc,
    familyBreaks: breaks,
    legumeSeasons: seasons.filter((s) => CROPS[s.cropId]?.family === 'legume').length,
    diseaseDays: disease,
    perYear,
  };
}

/**
 * Detail tier: re-run the selected rotation with the real water supply,
 * allocated between seasons in proportion to demand.
 */
export function simulateRotationDetail(ctx, region, rotation, options = {}) {
  const years = options.years ?? ctx.years;
  const supply = options.irrigationMm ?? 0;
  const [s0, s1] = region.seasons;
  const out = [];

  for (let i = 0; i < years.length; i += 1) {
    const year = years[i];
    const pair = i % 2 === 0 ? [rotation[0], rotation[1]] : [rotation[2], rotation[3]];
    const c0 = s0.crops.find((c) => c.id === pair[0]);
    const c1 = s1.crops.find((c) => c.id === pair[1]);
    if (!c0 || !c1) continue;

    const probe0 = simulateSeason(ctx, c0.id, { ...c0, seasonId: s0.id }, year, {
      ...options,
      irrigationMm: UNLIMITED,
    });
    const probe1 = simulateSeason(ctx, c1.id, { ...c1, seasonId: s1.id }, year, {
      ...options,
      irrigationMm: UNLIMITED,
    });
    if (!probe0 || !probe1) continue;

    const total = probe0.requirement + probe1.requirement;
    const share0 = total > 0 ? probe0.requirement / total : 0.5;
    const a = simulateSeason(ctx, c0.id, { ...c0, seasonId: s0.id }, year, {
      ...options,
      irrigationMm: supply * share0,
    });
    const b = simulateSeason(ctx, c1.id, { ...c1, seasonId: s1.id }, year, {
      ...options,
      irrigationMm: supply * (1 - share0),
    });
    if (!a || !b) continue;

    out.push({
      year,
      seasons: [a, b],
      requirement: round(a.requirement + b.requirement, 0),
      applied: round(a.applied + b.applied, 0),
      unmet: round(a.unmet + b.unmet, 0),
      stressDays: a.stressDays + b.stressDays,
      heatDays: a.heatDays + b.heatDays,
      etC: round(a.etC + b.etC, 0),
      pe: round(a.pe + b.pe, 0),
      margin: a.margin[1] + b.margin[1],
    });
  }
  return out;
}

function quantile(sorted, q) {
  if (!sorted.length) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo];
  return Math.round(sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo));
}

function round(v, d) {
  const f = Math.pow(10, d);
  return Math.round(v * f) / f;
}

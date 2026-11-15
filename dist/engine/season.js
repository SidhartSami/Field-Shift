/**
 * One crop season, simulated day by day.
 *
 * Water balance follows FAO-56 dual coefficient practice: Kcb from the stage
 * curve, Ks from the depletion, irrigation applied when depletion exceeds RAW.
 * The same pass returns both the irrigation *requirement* (what the crop needs)
 * and what the farmer's available supply can actually deliver, so the gap is
 * explicit rather than assumed away.
 */

import { CROPS, PATHOGENS } from './crops.js';
import { FALLOW } from './regions.js';
import { totalAvailableWater } from './soil.js';

const DEFAULT_OPTIONS = {
  irrigationMm: 0,
  residueRetained: true,
  slopePct: 1,
  practice: 'none',
  initialDepletionFrac: 0.5,
};

/** Kcb and canopy cover for a given day of the season. */
function stageCurve(cropDef, duration) {
  const [l1, l2, l3, l4] = cropDef.stages;
  const total = l1 + l2 + l3 + l4;
  const scale = duration / total;
  const ini = Math.max(1, Math.round(l1 * scale));
  const dev = Math.max(1, Math.round(l2 * scale));
  const mid = Math.max(1, Math.round(l3 * scale));
  const late = Math.max(1, duration - ini - dev - mid);
  return { ini, dev, mid, late };
}

function kcbAt(cropDef, curve, day) {
  const { ini, dev, mid } = curve;
  const { kcb } = cropDef;
  if (day < ini) return kcb.ini;
  if (day < ini + dev) {
    const t = (day - ini) / Math.max(1, dev);
    return kcb.ini + (kcb.mid - kcb.ini) * t;
  }
  if (day < ini + dev + mid) return kcb.mid;
  const lateLen = Math.max(1, curve.late);
  const t = (day - ini - dev - mid) / lateLen;
  return kcb.mid + (kcb.end - kcb.mid) * Math.min(1, t);
}

/**
 * @param {object} ctx field context from buildContext
 * @param {string} cropId
 * @param {{plantDay:number,duration:number,margin:number[]}} calendar
 * @param {number} year
 * @param {object} [options]
 */
export function simulateSeason(ctx, cropId, calendar, year, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const cropDef = cropId === 'fallow' ? FALLOW : CROPS[cropId];
  if (!cropDef) throw new Error(`Unknown crop: ${cropId}`);

  const startIndex = ctx.indexOf(year, calendar.plantDay);
  const duration = calendar.duration;
  if (startIndex < 0 || startIndex + duration >= ctx.bundle.daily.n) {
    return null;
  }

  const curve = stageCurve(cropDef, duration);
  const taw = totalAvailableWater(ctx.hydraulics.awcMmPerM, cropDef.zr);
  const raw = Math.max(5, cropDef.p * taw);

  let dr = opts.initialDepletionFrac * taw;
  let remaining = Math.max(0, opts.irrigationMm);
  let requirement = 0;
  let applied = 0;
  let etC = 0;
  let pe = 0;
  let stressDays = 0;
  let heatDays = 0;
  let coverSum = 0;
  let erosivity = 0;
  let maxDeficit = 0;
  const diseaseDays = {};

  const heatFrom = Math.floor(duration * cropDef.heatWindow[0]);
  const heatTo = Math.floor(duration * cropDef.heatWindow[1]);
  const pathogens = (cropDef.disease ?? []).map((id) => [id, PATHOGENS[id]]).filter(([, p]) => p);
  for (const [id] of pathogens) diseaseDays[id] = 0;

  const d = ctx.bundle.daily;

  for (let day = 0; day < duration; day += 1) {
    const k = startIndex + day;
    const kcb = kcbAt(cropDef, curve, day);
    const cover = cropDef.kcb.mid > 0 ? Math.min(1, kcb / cropDef.kcb.mid) * cropDef.cover : 0;
    coverSum += cover;

    const e0 = ctx.et0[k];
    const etc = Number.isFinite(e0) ? kcb * e0 : 0;

    // Stress coefficient from the depletion carried into this day.
    const ks = dr <= raw ? 1 : Math.max(0, (taw - dr) / Math.max(1, taw - raw));
    const etcAdj = ks * etc;
    etC += etcAdj;

    const rain = ctx.pe[k] || 0;
    pe += rain;

    if (dr > raw) {
      const need = dr;
      requirement += need;
      const apply = Math.min(need, remaining);
      remaining -= apply;
      applied += apply;
      dr -= apply;
      if (apply < need - 0.5) stressDays += 1;
    }

    dr = dr - rain + etcAdj;
    if (dr < 0) dr = 0;
    if (dr > taw) dr = taw;
    if (dr > maxDeficit) maxDeficit = dr;

    erosivity += ctx.erosivity[k] || 0;

    if (day >= heatFrom && day <= heatTo) {
      const tmax = d.tmax[k];
      if (Number.isFinite(tmax) && tmax > cropDef.tcrit) heatDays += 1;
    }

    for (const [id, p] of pathogens) {
      if (day < heatFrom || day > heatTo) continue;
      const tmax = d.tmax[k];
      const tmin = d.tmin[k];
      const rh = d.rh[k];
      if (![tmax, tmin, rh].every(Number.isFinite)) continue;
      const mid = (tmax + tmin) / 2;
      if (mid >= p.tmin && mid <= p.tmax && rh >= p.rhMin) diseaseDays[id] += 1;
    }
  }

  const meanCover = coverSum / duration;
  const unmet = Math.max(0, requirement - applied);

  return {
    cropId,
    year,
    season: calendar.seasonId ?? null,
    duration,
    requirement: round(requirement, 1),
    applied: round(applied, 1),
    unmet: round(unmet, 1),
    etC: round(etC, 1),
    pe: round(pe, 1),
    stressDays,
    heatDays,
    maxDeficit: round(maxDeficit, 1),
    taw: round(taw, 1),
    raw: round(raw, 1),
    meanCover: round(meanCover, 3),
    erosivity: round(erosivity, 1),
    diseaseDays,
    margin: calendar.margin ?? [0, 0, 0],
  };
}

function round(v, d) {
  const f = Math.pow(10, d);
  return Math.round(v * f) / f;
}

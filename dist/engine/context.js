/**
 * Field context: everything that can be precomputed once per field and reused
 * by every rotation. ET0 and effective rainfall are the expensive parts, so they
 * are computed once for the whole 34-year record.
 */

import { et0Series } from './eto.js';
import { soilHydraulics } from './soil.js';

/**
 * USDA-SCS effective rainfall for a monthly total (mm).
 * Pe = P(125 - 0.2P)/125 for P < 250, else 125 + 0.1P.
 */
export function effectiveRainMonth(pMm) {
  if (!(pMm > 0)) return 0;
  const pe = pMm < 250 ? (pMm * (125 - 0.2 * pMm)) / 125 : 125 + 0.1 * pMm;
  return Math.max(0, Math.min(pMm, pe));
}

/**
 * Parse the bundle's start date. POWER keys are YYYYMMDD; accept ISO too.
 * @param {string} raw
 */
export function parseStart(raw) {
  if (/^\d{8}$/.test(raw)) {
    return new Date(Date.UTC(Number(raw.slice(0, 4)), Number(raw.slice(4, 6)) - 1, Number(raw.slice(6, 8))));
  }
  return new Date(raw + 'T00:00:00Z');
}

/**
 * @param {object} bundle field bundle from data/fields/*.json
 * @param {{clay:number,sand:number,soc:number}} [soilOverride]
 */
export function buildContext(bundle, soilOverride) {
  const d = bundle.daily;
  const et0 = et0Series(bundle);

  const soil = soilOverride ?? {
    clay: bundle.soil?.clay?.value ?? 22,
    sand: bundle.soil?.sand?.value ?? 45,
    silt: bundle.soil?.silt?.value ?? 33,
    soc: (bundle.soil?.soc?.value ?? 4.5) / 10,
  };
  const hydraulics = soilHydraulics(soil);

  // Monthly effective rainfall, distributed back to days in proportion to the
  // daily totals so that timing is preserved.
  const pe = new Float64Array(d.n);
  const start = parseStart(d.start);
  let i = 0;
  while (i < d.n) {
    const date = new Date(start.getTime() + i * 86400000);
    const y = date.getUTCFullYear();
    const m = date.getUTCMonth();
    let j = i;
    let total = 0;
    while (j < d.n) {
      const dj = new Date(start.getTime() + j * 86400000);
      if (dj.getUTCFullYear() !== y || dj.getUTCMonth() !== m) break;
      total += Math.max(0, d.precip[j] || 0);
      j += 1;
    }
    const peMonth = effectiveRainMonth(total);
    const frac = total > 0 ? peMonth / total : 0;
    for (let k = i; k < j; k += 1) pe[k] = Math.max(0, d.precip[k] || 0) * frac;
    i = j;
  }

  const yearStart = new Map();
  for (let k = 0; k < d.n; k += 1) {
    const date = new Date(start.getTime() + k * 86400000);
    const y = date.getUTCFullYear();
    if (!yearStart.has(y)) yearStart.set(y, k);
  }

  // Monthly rainfall erosivity, modified Fournier index (Renard & Freimund 1994).
  // R_month = 1.735 * 10^(1.5*log10(p_m^2 / P_year) - 0.8188)
  const erosivity = new Float64Array(d.n);
  const monthlyRain = new Map();
  for (let k = 0; k < d.n; k += 1) {
    const date = new Date(start.getTime() + k * 86400000);
    const key = `${date.getUTCFullYear()}-${date.getUTCMonth()}`;
    monthlyRain.set(key, (monthlyRain.get(key) ?? 0) + Math.max(0, d.precip[k] || 0));
  }
  const annualRain = new Map();
  for (const [key, v] of monthlyRain) {
    const y = Number(key.split('-')[0]);
    annualRain.set(y, (annualRain.get(y) ?? 0) + v);
  }
  const monthR = new Map();
  for (const [key, p] of monthlyRain) {
    const y = Number(key.split('-')[0]);
    const total = annualRain.get(y) ?? 0;
    if (total <= 0 || p <= 0) {
      monthR.set(key, 0);
      continue;
    }
    const r = 1.735 * Math.pow(10, 1.5 * Math.log10((p * p) / total) - 0.8188);
    monthR.set(key, Math.max(0, r));
  }
  for (let k = 0; k < d.n; k += 1) {
    const date = new Date(start.getTime() + k * 86400000);
    const key = `${date.getUTCFullYear()}-${date.getUTCMonth()}`;
    const daysInMonth = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
    erosivity[k] = (monthR.get(key) ?? 0) / daysInMonth;
  }

  return {
    bundle,
    et0,
    pe,
    erosivity,
    soil,
    hydraulics,
    startDate: start,
    yearStart,
    years: [...yearStart.keys()],
    dayOfYear(k) {
      const date = new Date(start.getTime() + k * 86400000);
      return Math.floor((date - Date.UTC(date.getUTCFullYear(), 0, 0)) / 86400000) || 1;
    },
    dateAt(k) {
      return new Date(start.getTime() + k * 86400000);
    },
    indexOf(year, dayOfYear) {
      const base = yearStart.get(year);
      if (base === undefined) return -1;
      const jan1 = Date.UTC(year, 0, 1);
      const target = jan1 + (dayOfYear - 1) * 86400000;
      const offset = Math.round((target - Date.UTC(year, 0, 1)) / 86400000);
      return base + offset;
    },
  };
}

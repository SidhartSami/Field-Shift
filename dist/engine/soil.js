/**
 * Soil hydraulic properties from texture, Saxton & Rawls (2006).
 *
 * Inputs are percentages (clay, sand) and organic carbon in percent. Outputs are
 * volumetric water content at field capacity and wilting point, plus the plant
 * available water capacity in mm per metre of soil.
 */

const OM_FROM_SOC = 1.724; // organic matter = organic carbon x 1.724

/**
 * @param {{clay:number,sand:number,soc:number}} soil percentages
 * @returns {{fc:number,wp:number,awcMmPerM:number,sat:number}}
 */
export function soilHydraulics(soil) {
  const clay = clamp((soil.clay ?? 22) / 100, 0.01, 0.99);
  const sand = clamp((soil.sand ?? 45) / 100, 0.01, 0.99);
  const om = clamp((soil.soc ?? 0.45) * OM_FROM_SOC, 0.1, 8);

  // Saxton & Rawls (2006), equations 1 and 2.
  const wp =
    -0.024 * sand + 0.487 * clay + 0.006 * om + 0.005 * sand * om -
    0.013 * clay * om + 0.068 * sand * clay + 0.031;
  const fc =
    -0.251 * sand + 0.195 * clay + 0.011 * om + 0.006 * sand * om -
    0.027 * clay * om + 0.452 * sand * clay + 0.299;

  const wpC = clamp(wp, 0.02, 0.35);
  const fcC = clamp(fc, wpC + 0.03, 0.55);
  const sat = clamp(fcC + 0.08, fcC + 0.02, 0.62);

  return {
    fc: round(fcC, 3),
    wp: round(wpC, 3),
    sat: round(sat, 3),
    awcMmPerM: Math.round((fcC - wpC) * 1000),
  };
}

/**
 * Total available water for a rooting depth.
 * @param {number} awcMmPerM from soilHydraulics
 * @param {number} zrM rooting depth, metres
 */
export function totalAvailableWater(awcMmPerM, zrM) {
  return Math.max(10, awcMmPerM * zrM);
}

/**
 * USDA texture class from clay, sand and silt percentages.
 *
 * Silt matters: a soil at 22% clay and 56% silt is a silt loam, not a loam, and the
 * difference is the whole reason the Punjab field holds more water than its clay
 * fraction suggests. Silt is derived from the other two when it is not supplied.
 */
export function textureClass(clay, sand, silt) {
  const si = silt ?? Math.max(0, 100 - clay - sand);
  if (clay >= 40) {
    if (si >= 40) return 'silty clay';
    if (sand >= 45) return 'sandy clay';
    return 'clay';
  }
  if (clay >= 27) {
    if (sand <= 20) return 'silty clay loam';
    if (sand >= 45) return 'sandy clay loam';
    return 'clay loam';
  }
  if (si >= 80) return 'silt';
  if (si >= 50) return 'silt loam';
  if (sand >= 70) return 'sandy loam';
  if (sand >= 43 && clay < 20) return 'sandy loam';
  return 'loam';
}

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

function round(v, d) {
  const f = Math.pow(10, d);
  return Math.round(v * f) / f;
}

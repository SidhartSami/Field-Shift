/**
 * Soil loss, RUSLE: A = R * K * LS * C * P.
 *
 * R comes from the modified Fournier index computed in context.js, K from the
 * Williams (1995) texture equation, LS from slope steepness and length, C from
 * the simulated canopy-cover calendar, P from the management practice.
 */

/** Soil erodibility factor K (t ha h / ha MJ mm), Williams (1995). */
export function kFactor({ sand, silt, clay, soc }) {
  const san = clamp(sand, 1, 99);
  const sil = clamp(silt, 1, 99);
  const cla = clamp(clay, 1, 99);
  const c = clamp(soc, 0.05, 8);
  const sn1 = 1 - san / 100;
  const k =
    0.2 +
    0.3 *
      Math.exp(-0.0256 * san * (1 - sil / 100)) *
      Math.pow(sil / (cla + sil), 0.3) *
      (1 - (0.25 * c) / (c + Math.exp(3.72 - 2.95 * c))) *
      (1 - (0.7 * sn1) / (sn1 + Math.exp(-5.51 + 22.9 * sn1)));
  return clamp(k, 0.005, 0.7);
}

/** Slope length and steepness factor, Wischmeier & Smith (1978). */
export function lsFactor(slopePct, slopeLengthM = 100) {
  const s = Math.max(0.01, slopePct) / 100;
  const m = slopePct >= 5 ? 0.5 : slopePct >= 3.5 ? 0.4 : slopePct >= 1 ? 0.3 : 0.2;
  const length = Math.pow(slopeLengthM / 22.13, m);
  const steep = 65.41 * s * s + 4.56 * s + 0.065;
  return length * steep;
}

/** Cover-management factor from mean canopy cover fraction. */
export function cFactor(meanCover, residueRetained) {
  const base = 0.45 * Math.exp(-2.5 * clamp(meanCover, 0, 1));
  const withResidue = residueRetained ? base * 0.7 : base;
  return clamp(withResidue, 0.02, 0.6);
}

/** Support-practice factor. */
export function pFactor(practice) {
  if (practice === 'terrace') return 0.25;
  if (practice === 'contour') return 0.5;
  return 1.0;
}

/**
 * Annual soil loss for a rotation, t/ha/yr.
 * @param {object} args
 */
export function rusle({ erosivity, k, ls, meanCover, residueRetained, practice }) {
  const c = cFactor(meanCover, residueRetained);
  const p = pFactor(practice);
  return erosivity * k * ls * c * p;
}

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

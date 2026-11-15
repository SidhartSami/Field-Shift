/**
 * Basic intelligence for a user-created property.
 *
 * Deliberately lightweight — no 34-year replay. Seasonal water demand from
 * published-style planning coefficients, effective rainfall by soil texture,
 * and a transparent weighted screen. Label everything as a basic screen.
 */

const SOIL_EFF = { sand: 0.45, loam: 0.65, clay: 0.55 };

/** Illustrative seasonal crop water demand (mm) — planning coefficients only. */
export const SEASON_MM = {
  rice: 1200,
  maize: 650,
  millet: 350,
  mung: 350,
  wheat: 450,
  chickpea: 300,
  mustard: 300,
};

const SOIL_SCORE = { sand: 40, loam: 70, clay: 60 };

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

/**
 * @param {object} p property fields
 * @param {number} p.summerWater mm
 * @param {number} p.winterWater mm
 * @param {number} p.irrigation mm/year you can supply
 * @param {string} p.soil sand|loam|clay
 * @param {boolean} p.residue
 * @param {number} p.dry 0–60 (% rain reduction)
 * @param {number} p.heat 0–5 °C
 * @param {number|null} [climateRain] optional annual rain (mm) from a nearby record
 */
export function basicIntel(p) {
  const summerWater = SEASON_MM[p.summer] ?? 600;
  const winterWater = SEASON_MM[p.winter] ?? 450;
  // Two seasons per year → annualised demand (mean of the pair × 1 reference year).
  const demand = Math.round((summerWater + winterWater) / 2);
  const eff = SOIL_EFF[p.soil] ?? 0.6;
  const rain0 = Number.isFinite(p.climateRain) && p.climateRain > 0 ? p.climateRain : 700;
  const rain = Math.round(rain0 * (1 - clamp(p.dry ?? 0, 0, 60) / 100));
  const effectiveRain = Math.round(rain * eff);
  const irrigation = Math.max(0, Math.round(p.irrigation ?? 0));
  const gap = Math.max(0, demand - effectiveRain - irrigation);
  const waterScore = demand > 0 ? clamp(Math.round((1 - gap / demand) * 100), 0, 100) : 100;
  const soilScore = clamp((SOIL_SCORE[p.soil] ?? 55) + (p.residue ? 10 : 0), 0, 100);
  const heatPenalty = clamp(Math.round((p.heat ?? 0) * 8), 0, 30);
  const score = clamp(Math.round(waterScore * 0.6 + soilScore * 0.4 - heatPenalty), 0, 100);
  const flags = [];
  if (gap > 150) flags.push('Water gap is large for this pair — check canal/tubewell reality.');
  if (!p.residue) flags.push('Residue off raises exposure on light soils.');
  if ((p.heat ?? 0) >= 3) flags.push('Heat stress is on; mid-season failure risk rises.');
  if (irrigation > 0 && irrigation < demand * 0.35) flags.push('Supplied irrigation covers well under a third of demand.');
  return {
    demand,
    rain,
    effectiveRain,
    irrigation,
    gap,
    waterScore,
    soilScore,
    score,
    flags,
    basis: 'basic',
    note: 'Basic screen from planning coefficients — not the 34-year replay. Use Rotation lab on a mapped field for failure rates.',
  };
}

export function localIntelSummary(r) {
  const parts = [
    `Demand ≈ ${r.demand} mm/yr · gap ${r.gap} mm · screen ${r.score}/100.`,
  ];
  if (r.flags.length) parts.push(r.flags.join(' '));
  return parts.join(' ');
}

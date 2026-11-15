/**
 * Nitrogen balance and soil organic carbon trajectory.
 *
 * Deliberately simple and transparent: fixation credits, residue return, crop
 * removal, and a first-order carbon decay. It is a screening balance, not a
 * process model, and it is reported as a band rather than a prediction.
 */

import { CROPS } from './crops.js';

/** Typical attainable yield, t/ha, used for nutrient removal. Editable. */
export const DEFAULT_YIELD = {
  rice: 4.0,
  wheat: 3.5,
  maize: 4.5,
  millet: 1.5,
  chickpea: 1.0,
  mustard: 1.2,
  mung: 0.8,
  cotton: 2.0,
  sorghum: 2.5,
  lentil: 1.0,
  barley: 2.5,
  soybean: 2.8,
  bean: 1.2,
  pigeonpea: 1.2,
  oats: 3.0,
  alfalfa: 12.0,
  potato: 20.0,
  sesame: 0.7,
  groundnut: 1.5,
  berseem: 12.0,
  fallow: 0,
};

const N_CONTENT_RESIDUE = 0.008; // kg N per kg dry residue
const HARVEST_INDEX = 0.45;
const CARBON_FRACTION = 0.45;
const SOC_DECAY = 0.02; // per year

/**
 * @param {Array<{cropId:string}>} seasons four seasons of a two-year rotation
 * @param {{residueRetained:boolean, socPct:number}} options
 */
export function nitrogenBalance(seasons, options) {
  const residueRetained = options.residueRetained !== false;
  let fixation = 0;
  let removal = 0;
  let residueN = 0;
  let residueBiomass = 0;

  for (const s of seasons) {
    const c = CROPS[s.cropId];
    if (!c) continue;
    const yieldT = DEFAULT_YIELD[s.cropId] ?? 0;
    fixation += c.nfix ?? 0;
    removal += yieldT * 1000 * (c.nremoval ?? 0);
    const residueT = (yieldT * (1 - HARVEST_INDEX)) / HARVEST_INDEX;
    residueBiomass += residueT;
    if (residueRetained) residueN += residueT * 1000 * N_CONTENT_RESIDUE;
  }

  const net = fixation + residueN - removal;
  return {
    fixation: round(fixation, 1),
    removal: round(removal, 1),
    residueN: round(residueN, 1),
    net: round(net, 1),
    residueBiomass: round(residueBiomass, 2),
  };
}

/**
 * Twenty-year soil organic carbon trajectory under a repeated rotation.
 * @returns {{startPct:number, endPct:number, deltaPct:number, perYear:number}}
 */
export function socTrajectory(seasons, options, years = 20) {
  const startPct = options.socPct ?? 0.45;
  const residueRetained = options.residueRetained !== false;
  let soc = startPct;

  let residuePerYear = 0;
  for (const s of seasons) {
    const yieldT = DEFAULT_YIELD[s.cropId] ?? 0;
    residuePerYear += (yieldT * (1 - HARVEST_INDEX)) / HARVEST_INDEX;
  }
  residuePerYear /= 2; // four seasons span two years
  const carbonInput = residuePerYear * 1000 * CARBON_FRACTION * (residueRetained ? 0.35 : 0.15);

  // Topsoil mass, 0-30 cm, 1.4 g/cm3: 4200 t/ha. SOC stock = soc% * 4200 / 100.
  const soilMassTPerHa = 4200;
  for (let y = 0; y < years; y += 1) {
    const stock = (soc / 100) * soilMassTPerHa;
    const decay = SOC_DECAY * stock;
    const next = stock + (carbonInput - decay) / 1000;
    soc = Math.max(0.1, (next / soilMassTPerHa) * 100);
  }

  return {
    startPct: round(startPct, 2),
    endPct: round(soc, 2),
    deltaPct: round(soc - startPct, 2),
    perYear: round((soc - startPct) / years, 4),
  };
}

function round(v, d) {
  const f = Math.pow(10, d);
  return Math.round(v * f) / f;
}

/**
 * Describe-it: natural language → Rotation Lab controls.
 *
 * The parser in ../voice-live.js was written for a field-entry form that this
 * build no longer has. Its output is still useful: a farmer who says
 * "irrigation 400, keep residue, drier by 30" is describing exactly the three
 * things the Lab lets you set. This module maps the facts that apply and names
 * the ones that do not, rather than silently dropping them.
 *
 * Pure: no DOM, no state. The caller decides what to do with the result.
 */

const SUPPLY_MIN = 0;
const SUPPLY_MAX = 1600;

/** Facts the Lab can act on, in the order we report them. */
const APPLIED = {
  irrigation: 'water supply',
  residue: 'residue',
  dry: '2050 stress test',
  heat: '2050 stress test',
};

/** Facts that belong to a field-entry form, not to the Lab. */
const IGNORED = {
  summer: 'summer crop',
  winter: 'winter crop',
  soil: 'soil texture',
  organic: 'organic matter',
  area: 'field area',
  areaUnit: 'area unit',
  priority: 'priority',
  farm: 'field name',
  place: 'location',
};

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

/**
 * Fold parsed facts into Lab options.
 *
 * @param {{irrigationMm:number, residueRetained:boolean, practice:string, slopePct:number}} options
 * @param {object} facts  output of parseUtterance
 * @returns {{options:object, applied:string[], ignored:string[], stress:boolean}}
 */
export function applyDescription(options, facts) {
  const next = { ...options };
  const applied = [];
  const ignored = [];
  let stress = false;

  if (typeof facts?.irrigation === 'number' && Number.isFinite(facts.irrigation)) {
    next.irrigationMm = clamp(Math.round(facts.irrigation), SUPPLY_MIN, SUPPLY_MAX);
    applied.push(APPLIED.irrigation);
  }
  if (typeof facts?.residue === 'boolean') {
    next.residueRetained = facts.residue;
    applied.push(APPLIED.residue);
  }
  // The Lab's stress test is a fixed scenario (+1.9 °C, −6% rain), so any
  // mention of drying or warming turns it on; the magnitude is not settable.
  if (typeof facts?.dry === 'number' || typeof facts?.heat === 'number') {
    stress = true;
    applied.push(APPLIED.dry);
  }

  for (const key of Object.keys(IGNORED)) {
    if (facts?.[key] !== undefined && facts[key] !== null && facts[key] !== '') {
      ignored.push(IGNORED[key]);
    }
  }

  return { options: next, applied: [...new Set(applied)], ignored, stress };
}

/** One line for the UI. Empty string when nothing was understood. */
export function describeSummary(result) {
  if (!result.applied.length && !result.ignored.length) return '';
  const parts = [];
  if (result.applied.length) parts.push(`Applied: ${result.applied.join(', ')}.`);
  if (result.ignored.length) {
    parts.push(`Not used here: ${result.ignored.join(', ')} — the Lab works on the field you picked.`);
  }
  return parts.join(' ');
}

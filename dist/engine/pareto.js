/**
 * Non-dominated sorting over four objectives.
 *
 * A rotation is dominated when another rotation is at least as good on every
 * objective and strictly better on one. The non-dominated set is the efficient
 * frontier: the only rotations a rational decision maker needs to consider.
 *
 * This replaces the weighted-sum score. Weights are a *view* of the frontier,
 * not a property of the model, which is why the app can let a farmer drag a
 * priority slider without changing the underlying answer.
 */

/**
 * @param {Array<object>} items
 * @param {Array<{key:string,dir:'max'|'min'}>} objectives
 * @returns {{frontier:Array<object>, dominated:Array<object>}}
 */
export function paretoFrontier(items, objectives) {
  const values = items.map((item) => objectives.map((o) => (o.dir === 'max' ? item[o.key] : -item[o.key])));

  const frontier = [];
  const dominated = [];

  for (let i = 0; i < items.length; i += 1) {
    let isDominated = false;
    for (let j = 0; j < items.length; j += 1) {
      if (i === j) continue;
      if (dominates(values[j], values[i])) {
        isDominated = true;
        break;
      }
    }
    if (isDominated) dominated.push(items[i]);
    else frontier.push(items[i]);
  }

  return { frontier, dominated };
}

function dominates(a, b) {
  let strictlyBetter = false;
  for (let k = 0; k < a.length; k += 1) {
    if (a[k] < b[k] - 1e-9) return false;
    if (a[k] > b[k] + 1e-9) strictlyBetter = true;
  }
  return strictlyBetter;
}

/**
 * Rank a frontier by a weighted preference, for the "your priorities" view.
 * @param {Array<object>} items
 * @param {Array<{key:string,dir:'max'|'min',weight:number}>} objectives
 */
export function weightedRank(items, objectives) {
  const ranges = {};
  for (const o of objectives) {
    const vals = items.map((i) => i[o.key]);
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    ranges[o.key] = hi - lo || 1;
  }
  return items
    .map((item) => {
      let score = 0;
      for (const o of objectives) {
        const norm = (item[o.key] - Math.min(...items.map((i) => i[o.key]))) / ranges[o.key];
        score += o.weight * (o.dir === 'max' ? norm : 1 - norm);
      }
      return { ...item, preferenceScore: Math.round(score * 1000) / 1000 };
    })
    .sort((a, b) => b.preferenceScore - a.preferenceScore);
}

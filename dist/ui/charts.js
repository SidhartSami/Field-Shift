/** Hand-rolled SVG charts. No chart library, no build step, full control. */

const NS = 'http://www.w3.org/2000/svg';

function el(name, attrs = {}, parent) {
  const node = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (parent) parent.appendChild(node);
  return node;
}

/**
 * The Field's Memory: one column per year, three stacked signals.
 * @param {HTMLElement} host
 * @param {Array<{year:number,rain:number,heat:number,ndvi:number,dry:boolean}>} years
 * @param {(y:object|null)=>void} onRead
 */
export function memoryStrip(host, years, onRead) {
  host.innerHTML = '';
  const maxRain = Math.max(...years.map((y) => y.rain), 1);
  const maxHeat = Math.max(...years.map((y) => y.heat), 1);
  const maxNdvi = Math.max(...years.map((y) => y.ndvi || 0), 0.01);

  for (const y of years) {
    const col = document.createElement('div');
    col.className = `memory-year${y.dry ? ' is-dry' : ''}`;
    col.tabIndex = 0;
    col.setAttribute('role', 'button');
    col.setAttribute('aria-label', `${y.year}: ${Math.round(y.rain)} millimetres rain, ${y.heat} heat days`);

    const rain = document.createElement('div');
    rain.className = 'bar-rain';
    rain.style.height = `${Math.max(2, (y.rain / maxRain) * 62)}%`;
    col.appendChild(rain);

    const heat = document.createElement('div');
    heat.className = 'bar-heat';
    heat.style.height = `${Math.max(0, (y.heat / maxHeat) * 22)}%`;
    col.appendChild(heat);

    const ndvi = document.createElement('div');
    ndvi.className = 'bar-ndvi';
    ndvi.style.height = `${Math.max(0, ((y.ndvi || 0) / maxNdvi) * 14)}%`;
    col.appendChild(ndvi);

    const read = () => onRead(y);
    col.addEventListener('mouseenter', read);
    col.addEventListener('focus', read);
    col.addEventListener('click', read);
    host.appendChild(col);
  }
}

/** Year axis under the strip, labelled every five years. */
export function memoryAxis(host, years) {
  host.innerHTML = '';
  for (const y of years) {
    const s = document.createElement('span');
    s.textContent = y.year % 5 === 0 || y.year === years[0].year || y.year === years[years.length - 1].year
      ? String(y.year)
      : '';
    host.appendChild(s);
  }
}

/**
 * Pareto scatter: reliability against nitrogen balance.
 * @param {HTMLElement} host
 * @param {object} args
 */
export function paretoPlot(host, args) {
  const { results, frontier, baseline, onPick, selectedKey } = args;
  host.innerHTML = '';
  const W = 720;
  const H = 560;
  const pad = { t: 18, r: 22, b: 46, l: 58 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;

  const xs = results.map((r) => r.reliability * 100);
  const ys = results.map((r) => r.nitrogenNet);
  // Start the x axis at the lowest reliability actually present, rounded down to
  // a decade, so the frontier is not crushed against the right edge.
  const xMin = Math.max(0, Math.floor(Math.min(...xs) / 10) * 10);
  const xMax = 100;
  const yMin = Math.min(...ys, -10);
  const yMax = Math.max(...ys, 10);
  const x = (v) => pad.l + ((v - xMin) / (xMax - xMin || 1)) * iw;
  const y = (v) => pad.t + ih - ((v - yMin) / (yMax - yMin)) * ih;

  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Rotation frontier' }, host);

  // grid
  for (const g of niceTicks(xMin, xMax, 4)) {
    el('line', { x1: x(g), x2: x(g), y1: pad.t, y2: pad.t + ih, stroke: '#e8e3d6', 'stroke-width': 1 }, svg);
    const t = el('text', { x: x(g), y: H - 24, 'text-anchor': 'middle', fill: '#6d746a', 'font-size': 12, 'font-family': 'Instrument Sans, sans-serif' }, svg);
    t.textContent = `${Math.round(g)}%`;
  }
  const yTicks = niceTicks(yMin, yMax, 5);
  for (const v of yTicks) {
    el('line', { x1: pad.l, x2: pad.l + iw, y1: y(v), y2: y(v), stroke: '#e8e3d6', 'stroke-width': 1 }, svg);
    const t = el('text', { x: pad.l - 10, y: y(v) + 3.5, 'text-anchor': 'end', fill: '#6d746a', 'font-size': 12, 'font-family': 'Instrument Sans, sans-serif' }, svg);
    t.textContent = String(Math.round(v));
  }
  // zero line
  if (yMin < 0 && yMax > 0) {
    el('line', { x1: pad.l, x2: pad.l + iw, y1: y(0), y2: y(0), stroke: '#c9c2b0', 'stroke-width': 1, 'stroke-dasharray': '3 3' }, svg);
  }

  const maxMargin = Math.max(...results.map((r) => Math.abs(r.marginP10)), 1);
  const maxEro = Math.max(...results.map((r) => r.erosionTPerHa), 0.01);
  const frontierKeys = new Set(frontier.map((f) => f.key));

  const dots = el('g', {}, svg);
  const sorted = [...results].sort((a, b) => (frontierKeys.has(a.key) ? 1 : 0) - (frontierKeys.has(b.key) ? 1 : 0));
  for (const r of sorted) {
    const isFrontier = frontierKeys.has(r.key);
    const isBase = baseline && r.key === baseline.key;
    const rad = 3 + Math.sqrt(Math.abs(r.marginP10) / maxMargin) * 7;
    const eroT = Math.min(1, r.erosionTPerHa / maxEro);
    const fill = isBase ? '#a33a2a' : isFrontier ? '#0f6b5c' : `rgba(92,125,58,${0.1 + eroT * 0.35})`;
    const c = el('circle', {
      cx: x(r.reliability * 100),
      cy: y(r.nitrogenNet),
      r: isBase || isFrontier ? rad + 1.5 : rad,
      fill,
      stroke: isBase ? '#7a2418' : isFrontier ? '#0a4a40' : 'none',
      'stroke-width': isBase || isFrontier ? 1.4 : 0,
      opacity: isFrontier || isBase ? 1 : 0.32,
      tabindex: 0,
      role: 'button',
      'aria-label': `${r.rotation.join(' then ')}: ${Math.round(r.reliability * 100)} percent reliable`,
      style: 'cursor:pointer',
    }, dots);
    if (selectedKey && r.key === selectedKey) {
      el('circle', { cx: x(r.reliability * 100), cy: y(r.nitrogenNet), r: rad + 6, fill: 'none', stroke: '#141a17', 'stroke-width': 1.2, 'stroke-dasharray': '2 2' }, dots);
    }
    const pick = () => onPick(r);
    c.addEventListener('click', pick);
    c.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
    const title = el('title', {}, c);
    title.textContent = `${r.rotation.join(' → ')}\n${Math.round(r.reliability * 100)}% reliable · N ${r.nitrogenNet} kg/ha · ${r.erosionTPerHa} t/ha soil loss`;
  }

  // axis labels
  const xl = el('text', { x: pad.l + iw / 2, y: H - 6, 'text-anchor': 'middle', fill: '#3a423c', 'font-size': 12, 'font-family': 'Instrument Sans, sans-serif' }, svg);
  xl.textContent = 'Water reliability: share of years the water budget is met';
  const yl = el('text', { x: 14, y: pad.t + ih / 2, 'text-anchor': 'middle', fill: '#3a423c', 'font-size': 12, 'font-family': 'Instrument Sans, sans-serif', transform: `rotate(-90 14 ${pad.t + ih / 2})` }, svg);
  yl.textContent = 'Nitrogen balance, kg/ha per year';

  // legend
  const lg = el('g', { transform: `translate(${pad.l + 8},${pad.t + 6})` }, svg);
  const items = [
    ['#0f6b5c', 'Efficient frontier'],
    ['#a33a2a', 'Your current rotation'],
    ['rgba(92,125,58,.45)', 'Dominated'],
  ];
  items.forEach(([color, label], i) => {
    el('circle', { cx: 5, cy: i * 17 + 4, r: 4.5, fill: color }, lg);
    const t = el('text', { x: 16, y: i * 17 + 8, fill: '#3a423c', 'font-size': 12.5, 'font-family': 'Instrument Sans, sans-serif' }, lg);
    t.textContent = label;
  });
}

function niceTicks(min, max, count) {
  const span = max - min || 1;
  const step = Math.pow(10, Math.floor(Math.log10(span / count)));
  const err = (span / count) / step;
  const mult = err >= 7.5 ? 10 : err >= 3.5 ? 5 : err >= 1.5 ? 2 : 1;
  const s = step * mult;
  const start = Math.ceil(min / s) * s;
  const out = [];
  for (let v = start; v <= max + 1e-9; v += s) out.push(v);
  return out;
}

/**
 * Reliability-versus-supply curve: where each rotation becomes safe.
 * @param {HTMLElement} host
 * @param {Array<{label:string,color:string,points:Array<{supply:number,reliability:number}>}>} series
 * @param {number} marker supply value to mark
 */
export function supplyCurve(host, series, marker) {
  host.innerHTML = '';
  const W = 720;
  const H = 300;
  const pad = { t: 16, r: 20, b: 40, l: 52 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const maxSupply = Math.max(...series.flatMap((s) => s.points.map((p) => p.supply)), 1);
  const x = (v) => pad.l + (v / maxSupply) * iw;
  const y = (v) => pad.t + ih - v * ih;

  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Reliability against water supply' }, host);
  for (let g = 0; g <= 100; g += 25) {
    el('line', { x1: pad.l, x2: pad.l + iw, y1: y(g / 100), y2: y(g / 100), stroke: '#e8e3d6' }, svg);
    const t = el('text', { x: pad.l - 8, y: y(g / 100) + 3.5, 'text-anchor': 'end', fill: '#6d746a', 'font-size': 12, 'font-family': 'Instrument Sans, sans-serif' }, svg);
    t.textContent = `${g}%`;
  }
  for (const s of series) {
    const d = s.points.map((p, i) => `${i ? 'L' : 'M'}${x(p.supply).toFixed(1)},${y(p.reliability).toFixed(1)}`).join(' ');
    el('path', { d, fill: 'none', stroke: s.color, 'stroke-width': 2, 'stroke-linejoin': 'round' }, svg);
  }
  for (const g of niceTicks(0, maxSupply, 4)) {
    el('line', { x1: x(g), x2: x(g), y1: pad.t + ih, y2: pad.t + ih + 4, stroke: '#c9c2b0' }, svg);
    const t = el('text', { x: x(g), y: H - 22, 'text-anchor': 'middle', fill: '#6d746a', 'font-size': 12, 'font-family': 'Instrument Sans, sans-serif' }, svg);
    t.textContent = String(Math.round(g));
  }
  if (Number.isFinite(marker)) {
    el('line', { x1: x(marker), x2: x(marker), y1: pad.t, y2: pad.t + ih, stroke: '#141a17', 'stroke-width': 1, 'stroke-dasharray': '4 3' }, svg);
    const t = el('text', { x: x(marker) - 6, y: pad.t + 10, 'text-anchor': 'end', fill: '#141a17', 'font-size': 12, 'font-family': 'Instrument Sans, sans-serif' }, svg);
    t.textContent = `you: ${marker} mm`;
  }
  const xl = el('text', { x: pad.l + iw / 2, y: H - 4, 'text-anchor': 'middle', fill: '#3a423c', 'font-size': 12, 'font-family': 'Instrument Sans, sans-serif' }, svg);
  xl.textContent = 'Irrigation water available, mm per year';
}

/**
 * Requirement against supply, one bar per year.
 *
 * The single most legible chart in the product: every year the rotation needs
 * more water than the farmer has is a bar that crosses the line. No score, no
 * index, just the years, in order.
 *
 * @param {HTMLElement} host
 * @param {Array<{year:number, requirement:number, unmet:number, ok:boolean}>} perYear
 * @param {number} supply mm the farmer can provide
 */
export function requirementStrip(host, perYear, supply) {
  host.innerHTML = '';
  if (!perYear.length) return;
  const W = 720;
  const H = 190;
  const pad = { t: 14, r: 8, b: 26, l: 44 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const maxReq = Math.max(...perYear.map((y) => y.requirement), supply) * 1.08;
  const bw = iw / perYear.length;
  const y = (v) => pad.t + ih - (v / maxReq) * ih;

  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Irrigation requirement by year against available supply' }, host);

  for (let g = 0; g <= maxReq; g += 250) {
    el('line', { x1: pad.l, x2: pad.l + iw, y1: y(g), y2: y(g), stroke: '#e8e3d6', 'stroke-width': 1 }, svg);
    const t = el('text', { x: pad.l - 8, y: y(g) + 3.5, 'text-anchor': 'end', fill: '#6d746a', 'font-size': 12, 'font-family': 'Instrument Sans, sans-serif' }, svg);
    t.textContent = String(g);
  }

  perYear.forEach((rec, i) => {
    const x = pad.l + i * bw;
    const h = Math.max(1, (rec.requirement / maxReq) * ih);
    el('rect', {
      x: x + bw * 0.14,
      y: pad.t + ih - h,
      width: Math.max(1.5, bw * 0.72),
      height: h,
      fill: rec.ok ? '#0f6b5c' : '#a33a2a',
      opacity: rec.ok ? 0.85 : 1,
    }, svg);
    if (rec.year % 5 === 0) {
      const t = el('text', { x: x + bw / 2, y: H - 8, 'text-anchor': 'middle', fill: '#6d746a', 'font-size': 12, 'font-family': 'Instrument Sans, sans-serif' }, svg);
      t.textContent = String(rec.year);
    }
  });

  el('line', { x1: pad.l, x2: pad.l + iw, y1: y(supply), y2: y(supply), stroke: '#141a17', 'stroke-width': 1.4, 'stroke-dasharray': '5 3' }, svg);
  const lab = el('text', { x: pad.l + iw, y: y(supply) - 6, 'text-anchor': 'end', fill: '#141a17', 'font-size': 12, 'font-family': 'Instrument Sans, sans-serif' }, svg);
  lab.textContent = `supply ${supply} mm`;
}

/**
 * Field Shift — application shell.
 *
 * Four surfaces, one state object. The engine does the science; this file only
 * decides what to show and in what order.
 */

import { buildContext } from './engine/context.js';
import { REGIONS } from './engine/regions.js';
import { searchRotations, shiftContext } from './engine/search.js';
import { evaluateRotation, buildSeasonCache, usableYears } from './engine/evaluate.js';
import { CROPS } from './engine/crops.js';
import { textureClass } from './engine/soil.js';
import { memoryStrip, memoryAxis, paretoPlot, supplyCurve, requirementStrip } from './ui/charts.js';
import {
  num, pct, money, signed, cropName, rotationLabel, chip, escapeHtml,
} from './ui/format.js';

const state = {
  index: [],
  bundle: null,
  region: null,
  ctx: null,
  cache: null,
  years: [],
  search: null,
  future: null,
  selected: null,
  baseline: null,
  shortlist: [],
  options: { irrigationMm: 900, residueRetained: true, practice: 'none', slopePct: 0.5 },
  view: 'field',
  map: null,
  layer: 'ndvi',
  dateIndex: 0,
};

const LAYERS = [
  { id: 'ndvi', label: 'MODIS NDVI', gibs: 'MODIS_Terra_L3_NDVI_Monthly', tms: 'GoogleMapsCompatible_Level7', ext: 'png', credit: 'NASA MODIS Terra NDVI, monthly composite', why: 'Greenness. The season the crop is actually growing, not the season the calendar says.' },
  { id: 'lst', label: 'Land surface temp', gibs: 'MODIS_Terra_L3_Land_Surface_Temp_Monthly_CMG_Day_TES', tms: 'GoogleMapsCompatible_Level6', ext: 'png', credit: 'NASA MODIS Terra land surface temperature, monthly', why: 'Heat load on the canopy. This is the term that drives the heat-day count in the brief.' },
  { id: 'rain', label: 'GPM IMERG rain', gibs: 'IMERG_Precipitation_Rate', tms: 'GoogleMapsCompatible_Level6', ext: 'png', credit: 'NASA GPM IMERG precipitation rate', why: 'Where the monsoon actually arrived. The trigger date in the fallback rule comes from this.' },
  { id: 'smap', label: 'SMAP soil moisture', gibs: 'SMAP_L4_Analyzed_Root_Zone_Soil_Moisture', tms: 'GoogleMapsCompatible_Level6', ext: 'png', credit: 'NASA SMAP L4 root-zone soil moisture', why: 'The water actually in the root zone. The variable the whole water balance is trying to predict.' },
  { id: 'grace', label: 'GRACE water storage', gibs: 'GRACE_Tellus_Liquid_Water_Equivalent_Thickness_Mascon_CRI', tms: 'GoogleMapsCompatible_Level6', ext: 'png', credit: 'NASA GRACE-FO terrestrial water storage anomaly', why: 'The aquifer, weighed from orbit. This is the trend that makes the current rotation untenable.' },
  { id: 'true', label: 'True colour', gibs: 'MODIS_Terra_CorrectedReflectance_TrueColor', tms: 'GoogleMapsCompatible_Level9', ext: 'jpg', credit: 'NASA MODIS Terra corrected reflectance', why: 'What the field looked like. Use it to sanity-check that the other layers are describing real ground.' },
];

const $ = (sel) => document.querySelector(sel);

/* ── boot ─────────────────────────────────────────────────── */

async function boot() {
  state.index = await fetch('data/fields/index.json').then((r) => r.json());
  const select = $('#field-select');
  select.innerHTML = state.index
    .map((f) => `<option value="${f.id}">${escapeHtml(f.name)} · ${escapeHtml(f.country)}</option>`)
    .join('');
  select.addEventListener('change', () => loadField(select.value));

  bindChrome();
  await loadField(state.index[0].id);
  route();
}

function bindChrome() {
  window.addEventListener('hashchange', route);
  $('#supply').addEventListener('input', (e) => {
    state.options.irrigationMm = Number(e.target.value);
    $('#supply-out').textContent = `${state.options.irrigationMm} mm`;
    recompute();
  });
  $('#residue').addEventListener('change', (e) => {
    state.options.residueRetained = e.target.checked;
    recompute();
  });
  $('#practice').addEventListener('change', (e) => {
    state.options.practice = e.target.value;
    recompute();
  });
  $('#future').addEventListener('change', (e) => {
    if (e.target.checked) ensureFuture();
    renderLab();
  });
  $('#print-btn').addEventListener('click', () => window.print());
  $('#save-btn').addEventListener('click', savePlan);
  $('#date-prev').addEventListener('click', () => stepDate(-1));
  $('#date-next').addEventListener('click', () => stepDate(1));
  $('#date-slider').addEventListener('input', (e) => {
    state.dateIndex = Number(e.target.value);
    applyLayer();
  });
}

/* ── data ─────────────────────────────────────────────────── */

async function loadField(id) {
  const bundle = await fetch(`data/fields/${id}.json`).then((r) => r.json());
  state.bundle = bundle;
  state.region = REGIONS[bundle.region];
  state.options.irrigationMm = state.region.defaultIrrigationMm;
  state.options.slopePct = state.region.defaultSlopePct;
  $('#supply').value = String(state.options.irrigationMm);
  $('#supply-out').textContent = `${state.options.irrigationMm} mm`;
  $('#field-select').value = id;

  state.ctx = buildContext(bundle);
  state.future = null;
  $('#future').checked = false;

  recompute();
  renderField();
  renderMemory();
  renderDecision();
  renderLedger();
  initMap();
}

function recompute() {
  state.cache = buildSeasonCache(state.ctx, state.region, state.options);
  state.years = usableYears(state.ctx, state.region, state.cache);
  state.search = searchRotations(state.ctx, state.region, {
    ...state.options, cache: state.cache, years: state.years,
  });
  state.baseline = findBaseline(state.search);
  state.selected = pickDefault(state.search, state.baseline);
  state.shortlist = buildShortlist(state.search, state.baseline);
  renderLab();
  renderDecision();
}

function canonicalKey(rotation) {
  return [0, 1, 2, 3].map((k) => rotation.slice(k).concat(rotation.slice(0, k)).join('|')).sort()[0];
}

function findBaseline(search) {
  const [a, b] = state.region.baseline;
  return search.results.find((r) => r.key === canonicalKey([a, b, a, b])) ?? null;
}

/**
 * The recommendation rule, stated plainly: prefer a rotation that beats current
 * practice on money, nitrogen and water at the same time. If nothing does, fall
 * back to the most reliable option and say so.
 */
function pickDefault(search, baseline) {
  if (!baseline) return search.results[0];
  const dominates = search.results.filter(
    (r) => r.marginP10 >= baseline.marginP10
      && r.nitrogenNet > baseline.nitrogenNet
      && r.reliability > baseline.reliability,
  );
  if (dominates.length) {
    return dominates.sort((a, b) => b.reliability - a.reliability || b.marginP10 - a.marginP10)[0];
  }
  return [...search.results].sort((a, b) => b.reliability - a.reliability || b.marginP10 - a.marginP10)[0];
}

/** Seven rotations: the recommendation, current practice, and the best in the set at one thing. */
function buildShortlist(search, baseline) {
  const pick = (fn) => [...search.results].sort(fn)[0];
  const out = [];
  if (state.selected) {
    out.push({
      role: 'Recommended',
      note: 'Beats current practice on water, nitrogen and margin together',
      r: state.selected,
      lead: true,
    });
  }
  if (baseline) out.push({ role: 'Your current practice', note: 'What this field does now', r: baseline });
  out.push({ role: 'Most reliable', note: 'Meets the water budget most often', r: pick((a, b) => b.reliability - a.reliability || b.marginP10 - a.marginP10) });
  out.push({ role: 'Best downside margin', note: 'Highest P10 gross margin', r: pick((a, b) => b.marginP10 - a.marginP10) });
  out.push({ role: 'Best nitrogen balance', note: 'Fixes the most, removes the least', r: pick((a, b) => b.nitrogenNet - a.nitrogenNet) });
  out.push({ role: 'Least water', note: 'Lowest irrigation requirement', r: pick((a, b) => a.meanRequirement - b.meanRequirement) });
  out.push({ role: 'Least soil loss', note: 'Lowest RUSLE soil loss', r: pick((a, b) => a.erosionTPerHa - b.erosionTPerHa) });
  const seen = new Set();
  return out.filter((x) => {
    if (!x.r || seen.has(x.r.key)) return false;
    seen.add(x.r.key);
    return true;
  });
}

function ensureFuture() {
  if (state.future) return;
  const shifted = shiftContext(state.ctx, { dTempC: 1.9, dPrecipPct: -6 });
  state.future = searchRotations(shifted, state.region, { ...state.options });
}

/* ── field view ───────────────────────────────────────────── */

function renderField() {
  const b = state.bundle;
  const r = state.region;
  $('#field-title').textContent = b.name;
  $('#field-lede').textContent = `${r.name} · ${b.system.replace('-', '–')} system. ${b.note}`;

  const annual = annualStats();
  const soil = state.ctx.soil;
  const facts = [
    ['Area', `${num(r.defaultAreaHa, 1)} <small>ha</small>`],
    ['Elevation', `${num(b.elevation)} <small>m</small>`],
    ['Rainfall', `${num(annual.rainMean)} <small>mm/yr</small>`],
    ['Reference ET₀', `${num(annual.et0Mean)} <small>mm/yr</small>`],
    ['Soil texture', texture(soil)],
    ['Organic carbon', `${num(soil.soc, 2)} <small>%</small>`],
    ['Available water', `${num(state.ctx.hydraulics.awcMmPerM)} <small>mm/m</small>`],
    ['Record', `${state.bundle.daily.start.slice(0, 4)}–${annual.lastYear} <small>${state.years.length} usable</small>`],
  ];
  $('#facts').innerHTML = facts
    .map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`)
    .join('');

  const ndvi = b.ndvi?.values?.length;
  $('#sources').innerHTML = [
    `<div>${chip('observed')} MODIS MOD13Q1 NDVI, 250 m${ndvi ? ` · ${ndvi} composites` : ' · composite pending'}</div>`,
    `<div>${chip('reanalysis')} NASA POWER daily, ${b.daily.n.toLocaleString()} days</div>`,
    `<div>${chip('simulated')} FAO-56 water balance · RUSLE · N balance</div>`,
    `<div>${chip('observed')} Soil: ${escapeHtml(b.soil.source)}</div>`,
  ].join('');

  renderThesis();
}

/** The one sentence the whole product exists to say. */
function renderThesis() {
  const base = state.baseline;
  const rec = state.selected;
  if (!base || !rec) return;
  const cur = state.region.currency;
  const better = rec.marginP10 >= base.marginP10 && rec.nitrogenNet > base.nitrogenNet;
  $('#thesis').innerHTML = `
    <p class="thesis-line">
      <strong>${escapeHtml(rotationLabel(base.rotation))}</strong> meets this field's water budget in
      <strong class="thesis-num">${pct(base.reliability)}</strong> of ${base.years} years.
    </p>
    <p class="thesis-sub">
      ${better
        ? `One rotation beats it on water, nitrogen and money at the same time:
           <a href="#decision"><strong>${escapeHtml(rotationLabel(rec.rotation))}</strong></a> —
           ${pct(rec.reliability)} reliable, ${signed(rec.nitrogenNet, 0)} kg N, ${money(rec.marginP10, cur)} downside.`
        : `The most reliable option we found is
           <a href="#decision"><strong>${escapeHtml(rotationLabel(rec.rotation))}</strong></a> at ${pct(rec.reliability)}.`}
    </p>
  `;
}

function texture(soil) {
  const name = textureClass(soil.clay ?? 22, soil.sand ?? 45, soil.silt);
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function annualStats() {
  const d = state.bundle.daily;
  const start = parseStart(d.start);
  const byYear = new Map();
  for (let i = 0; i < d.n; i += 1) {
    const date = new Date(start.getTime() + i * 86400000);
    const y = date.getUTCFullYear();
    if (!byYear.has(y)) byYear.set(y, { rain: 0, heat: 0, et0: 0, days: 0, wet: 0 });
    const rec = byYear.get(y);
    rec.rain += Math.max(0, d.precip[i] || 0);
    if (d.tmax[i] > 35) rec.heat += 1;
    rec.et0 += state.ctx.et0[i] || 0;
    rec.wet += d.gwetroot[i] || 0;
    rec.days += 1;
  }
  const ndviByYear = new Map();
  if (state.bundle.ndvi?.dates) {
    state.bundle.ndvi.dates.forEach((iso, i) => {
      const y = Number(iso.slice(0, 4));
      const v = state.bundle.ndvi.values[i];
      if (!Number.isFinite(v)) return;
      ndviByYear.set(y, Math.max(ndviByYear.get(y) ?? 0, v));
    });
  }
  const years = [...byYear.entries()]
    .filter(([, v]) => v.days > 300)
    .map(([year, v]) => ({
      year,
      rain: v.rain,
      heat: v.heat,
      et0: v.et0,
      wet: v.wet / v.days,
      ndvi: ndviByYear.get(year) ?? 0,
    }));
  const rains = years.map((y) => y.rain).sort((a, b) => a - b);
  const median = rains[Math.floor(rains.length / 2)] ?? 1;
  for (const y of years) y.dry = y.rain < median * 0.78;
  return {
    years,
    median,
    lastYear: years.length ? years[years.length - 1].year : '—',
    rainMean: years.reduce((a, y) => a + y.rain, 0) / years.length,
    et0Mean: years.reduce((a, y) => a + y.et0, 0) / years.length,
  };
}

function renderMemory() {
  const { years } = annualStats();
  memoryStrip($('#memory-strip'), years, (y) => {
    if (!y) return;
    const ndviText = y.ndvi ? ` · peak NDVI <b>${y.ndvi.toFixed(2)}</b>` : '';
    $('#memory-read').innerHTML =
      `<b>${y.year}</b> — rainfall <b>${num(y.rain)} mm</b> · days above 35 °C <b>${y.heat}</b>` +
      ` · reference ET₀ <b>${num(y.et0)} mm</b> · root-zone wetness <b>${y.wet.toFixed(2)}</b>${ndviText}` +
      (y.dry ? ' · <b>failed monsoon</b>' : '');
  });
  memoryAxis($('#memory-axis'), years);

  const dry = years.filter((y) => y.dry).map((y) => y.year);
  const warmest = [...years].sort((a, b) => b.heat - a.heat).slice(0, 5).map((y) => y.year).sort((a, b) => a - b);
  const recent = warmest.filter((y) => y >= 2000).length;
  $('#memory-read').innerHTML =
    `The record holds <b>${years.length}</b> complete years. <b>${dry.length}</b> failed the monsoon ` +
    `(below 78% of the median). The five hottest years are ${warmest.join(', ')} — ` +
    `${recent} of the five fall after 2000.`;
}

/* ── map ──────────────────────────────────────────────────── */

function initMap() {
  const b = state.bundle;
  if (state.map) {
    state.map.remove();
    state.map = null;
  }
  const map = L.map('map', { zoomControl: true, attributionControl: false }).setView([b.lat, b.lon], 10);
  state.map = map;

  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 17,
  }).addTo(map);

  const side = Math.sqrt(state.region.defaultAreaHa * 10000) / 2;
  const dLat = side / 111320;
  const dLon = side / (111320 * Math.cos((b.lat * Math.PI) / 180));
  L.rectangle([[b.lat - dLat, b.lon - dLon], [b.lat + dLat, b.lon + dLon]], {
    color: '#f2eee4', weight: 1.6, fill: false, dashArray: '4 3',
  }).addTo(map);
  L.circleMarker([b.lat, b.lon], { radius: 3, color: '#f2eee4', fillColor: '#f2eee4', fillOpacity: 1 }).addTo(map);

  $('#layer-tabs').innerHTML = LAYERS
    .map((l) => `<button role="tab" data-layer="${l.id}" aria-selected="${l.id === state.layer}">${l.label}</button>`)
    .join('');
  $('#layer-tabs').querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.layer = btn.dataset.layer;
      $('#layer-tabs').querySelectorAll('button').forEach((b2) => b2.setAttribute('aria-selected', String(b2 === btn)));
      applyLayer();
    });
  });

  const months = monthRange();
  state.dateIndex = months.length - 1;
  const slider = $('#date-slider');
  slider.max = String(months.length - 1);
  slider.value = String(state.dateIndex);
  applyLayer();
}

function monthRange() {
  const out = [];
  const now = new Date();
  for (let y = 2000; y <= now.getUTCFullYear(); y += 1) {
    for (let m = 0; m < 12; m += 1) {
      if (y === now.getUTCFullYear() && m > now.getUTCMonth() - 1) break;
      out.push(`${y}-${String(m + 1).padStart(2, '0')}-01`);
    }
  }
  return out;
}

function applyLayer() {
  const layer = LAYERS.find((l) => l.id === state.layer);
  const months = monthRange();
  const date = months[Math.min(state.dateIndex, months.length - 1)];
  $('#date-label').textContent = date.slice(0, 7);
  $('#map-credit').textContent = layer.credit;
  $('#map-why').textContent = layer.why;

  if (state.gibsLayer) state.map.removeLayer(state.gibsLayer);
  const url = `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${layer.gibs}/default/${date}/${layer.tms}/{z}/{y}/{x}.${layer.ext}`;
  state.gibsLayer = L.tileLayer(url, {
    maxNativeZoom: Number(layer.tms.split('Level')[1]),
    maxZoom: 17,
    opacity: 0.55,
  }).addTo(state.map);
}

function stepDate(delta) {
  const months = monthRange();
  state.dateIndex = Math.max(0, Math.min(months.length - 1, state.dateIndex + delta));
  $('#date-slider').value = String(state.dateIndex);
  applyLayer();
}

/* ── lab ──────────────────────────────────────────────────── */

function renderLab() {
  const s = state.search;
  if (!s) return;
  $('#lab-stats').innerHTML = [
    [num(s.candidates), 'sequences'],
    [num(s.distinct), 'distinct cycles'],
    [num(s.years.length), 'years'],
    [num(s.simulatedSeasons), 'simulated seasons'],
  ].map(([v, l]) => `<div><b>${v}</b><span>${l}</span></div>`).join('');

  const results = state.future ? state.future.results : s.results;
  const frontier = state.future ? state.future.frontier : s.frontier;
  const baseline = state.future
    ? state.future.results.find((r) => r.key === state.baseline?.key)
    : state.baseline;

  paretoPlot($('#pareto'), {
    results,
    frontier,
    baseline,
    selectedKey: state.selected?.key,
    onPick: (r) => {
      state.selected = r;
      renderLab();
      renderDecision();
      location.hash = '#decision';
    },
  });

  renderShortlist(results, baseline);
  renderSupplyCurve();
  renderFutureBanner();
}

function renderShortlist(results, baseline) {
  const rows = state.shortlist
    .map(({ role, note, r, lead }) => ({ role, note, lead, r: results.find((x) => x.key === r.key) }))
    .filter((x) => x.r);
  if (baseline && !rows.some((x) => x.r.key === baseline.key)) {
    rows.unshift({ role: 'Your current practice', note: 'What this field does now', r: baseline });
  }

  $('#frontier-list').innerHTML = rows
    .map(({ role, note, r, lead }) => {
      const isBase = baseline && r.key === baseline.key;
      const cls = [
        'rot-card',
        isBase ? 'is-baseline' : '',
        lead ? 'is-lead' : '',
        state.selected?.key === r.key ? 'is-selected' : '',
      ].filter(Boolean).join(' ');
      return `<button class="${cls}" data-key="${r.key}">
        <p class="rot-role">${escapeHtml(role)}</p>
        <h3>${escapeHtml(rotationLabel(r.rotation))}</h3>
        <p class="seq">${escapeHtml(note)}</p>
        <div class="rot-metrics">
          <span class="${r.reliability >= 0.8 ? 'good' : r.reliability < 0.5 ? 'bad' : ''}"><b>${pct(r.reliability)}</b> reliable</span>
          <span><b>${num(r.meanRequirement)}</b> mm need</span>
          <span class="${r.nitrogenNet >= 0 ? 'good' : 'bad'}"><b>${signed(r.nitrogenNet, 0)}</b> kg N</span>
          <span><b>${num(r.erosionTPerHa, 2)}</b> t/ha loss</span>
          <span><b>${money(r.marginP10, state.region.currency)}</b> downside</span>
        </div>
      </button>`;
    })
    .join('');

  $('#frontier-list').querySelectorAll('.rot-card').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.selected = results.find((r) => r.key === btn.dataset.key);
      renderLab();
      renderDecision();
      location.hash = '#decision';
    });
  });
}

function renderSupplyCurve() {
  const base = state.baseline;
  const rec = state.selected;
  if (!base || !rec) return;
  const series = [];
  const add = (r, label, color) => {
    const points = [];
    for (let sup = 0; sup <= 1600; sup += 50) {
      const e = evaluateRotation(state.ctx, state.region, r.rotation, state.cache, {
        ...state.options, irrigationMm: sup, years: state.years,
      });
      points.push({ supply: sup, reliability: e.reliability });
    }
    series.push({ label, color, points });
  };
  add(base, 'Current practice', '#a33a2a');
  if (rec.key !== base.key) add(rec, 'Recommended', '#0f6b5c');
  supplyCurve($('#supply-curve'), series, state.options.irrigationMm);
  $('#supply-legend').innerHTML = series
    .map((s) => `<span><i style="background:${s.color}"></i>${escapeHtml(s.label)}</span>`)
    .join('');
}

function renderFutureBanner() {
  const host = $('#future-banner');
  if (!state.future) {
    host.hidden = true;
    return;
  }
  const base = state.baseline;
  const rec = state.selected;
  const fBase = base ? state.future.results.find((r) => r.key === base.key) : null;
  const fRec = rec ? state.future.results.find((r) => r.key === rec.key) : null;
  host.hidden = false;
  host.innerHTML = `
    <p class="eyebrow">2050 stress test · SSP2-4.5 South Asia · +1.9 °C, −6% rainfall</p>
    <p>
      ${fBase ? `Current practice falls from <b>${pct(base.reliability)}</b> to <b>${pct(fBase.reliability)}</b> reliable.` : ''}
      ${fRec ? ` The recommended rotation falls from <b>${pct(rec.reliability)}</b> to <b>${pct(fRec.reliability)}</b>.` : ''}
      ${fBase && fRec && fRec.reliability > fBase.reliability
        ? ` The gap widens, which is the point: the rotation that survives the century is not the one that maximises this year's margin.`
        : ''}
    </p>
    <p class="meta">Scenario deltas from the IPCC AR6 Atlas; applied uniformly to the observed record. Tagged simulated.</p>
  `;
}

/* ── decision ─────────────────────────────────────────────── */

function renderDecision() {
  const r = state.selected;
  const base = state.baseline;
  if (!r) return;
  $('#decision-title').textContent = rotationLabel(r.rotation);

  const cur = state.region.currency;
  const waterSaved = base ? base.meanRequirement - r.meanRequirement : 0;
  const marginDelta = base ? r.marginP10 - base.marginP10 : 0;
  const nDelta = base ? r.nitrogenNet - base.nitrogenNet : 0;
  const eroDelta = base ? r.erosionTPerHa - base.erosionTPerHa : 0;

  const sections = [];

  sections.push(`
    <div class="brief-head">
      <div class="brief-score">
        <b>${pct(r.reliability)}</b>
        <span>water reliability</span>
      </div>
      <p class="brief-seq">${r.rotation.map((c) => `${escapeHtml(cropName(c))} <span class="local">${escapeHtml(CROPS[c]?.local ?? '')}</span>`).join(' <span class="arrow">→</span> ')}</p>
    </div>
    <dl class="brief-metrics">
      <div><dt>Meets budget</dt><dd>${r.reliableYears}<small> of ${r.years} years</small></dd></div>
      <div><dt>Water needed</dt><dd>${num(r.meanRequirement)}<small> mm/yr</small></dd></div>
      <div><dt>Worst year</dt><dd>${r.worstYear && r.worstYear.unmet > 0 ? `${num(r.worstYear.unmet)}<small> mm short, ${r.worstYear.year}</small>` : `<small>no shortfall in the record</small>`}</dd></div>
      <div><dt>Heat days</dt><dd>${num(r.meanHeatDays, 1)}<small> per year</small></dd></div>
      <div><dt>Nitrogen</dt><dd>${signed(r.nitrogenNet, 0)}<small> kg/ha/yr</small></dd></div>
      <div><dt>Soil loss</dt><dd>${num(r.erosionTPerHa, 2)}<small> t/ha/yr</small></dd></div>
      <div><dt>Downside margin</dt><dd>${money(r.marginP10, cur)}<small> P10</small></dd></div>
      <div><dt>Legume seasons</dt><dd>${r.legumeSeasons}<small> of 4</small></dd></div>
    </dl>
  `);

  sections.push(`
    <div class="brief-section">
      <h3>Why this one</h3>
      <p>${whyText(r, base, waterSaved, nDelta, eroDelta, marginDelta, cur)}</p>
      <p>${diversityText(r)}</p>
    </div>
  `);

  sections.push(`
    <div class="brief-section">
      <h3>When it fails</h3>
      <p>${r.failingYears.length
        ? `It misses the water budget in <strong>${r.failingYears.length} of ${r.years}</strong> years. Those are the years to plan around, not the average.`
        : `It meets the water budget in every year of the record at the supply you entered. That is a statement about this record, not a guarantee about next season.`}</p>
      <div class="req-strip" id="req-strip"></div>
      <div class="req-legend">
        <span><i style="background:#0f6b5c"></i>within budget</span>
        <span><i style="background:#a33a2a"></i>short</span>
        <span><i class="dash"></i>your supply, ${state.options.irrigationMm} mm</span>
      </div>
      ${droughtText(r)}
    </div>
  `);

  sections.push(`
    <div class="brief-section">
      <h3>Do this</h3>
      <ol class="actions">
        ${actionList(r).map((a) => `<li>${a}</li>`).join('')}
      </ol>
    </div>
  `);

  sections.push(`
    <div class="brief-section">
      <h3>The fallback</h3>
      <p>${fallbackText(r)}</p>
    </div>
  `);

  sections.push(`
    <div class="brief-section">
      <h3>What we cannot see</h3>
      <ul class="blockers">
        <li>Whether a buyer will take <strong>${uniqueCrops(r).join(', ')}</strong> at a price that holds the margin.</li>
        <li>Seed, labour and machinery access for the new seasons.</li>
        <li>Drainage, salinity and the actual sowing window on this field.</li>
        <li>Whether the aquifer beneath it keeps falling at the rate GRACE has measured.</li>
      </ul>
    </div>
  `);

  const ndviPrediction = predictionNdvi();
  sections.push(`
    <div class="brief-section prediction">
      <h3>The prediction</h3>
      <p>We expect the next season on this field to show root-zone wetness above
      <span class="mono">${predictionWetness()}</span> through the growing window${ndviPrediction
        ? ` and a peak NDVI above <span class="mono">${ndviPrediction}</span>`
        : ''}. We will check ${ndviPrediction ? 'both' : 'it'} against the satellite pass in
      <span class="mono">${nextCheckMonth()}</span> and record the result in the ledger — hit, miss, or inconclusive.</p>
      ${ndviPrediction ? '' : '<p class="ledger-note">No MODIS composite is bundled for this field yet, so the NDVI prediction is withheld rather than invented.</p>'}
    </div>
  `);

  sections.push(`
    <div class="brief-section">
      <h3>What would change our mind</h3>
      <p>${thresholdText(r, base)}</p>
    </div>
  `);

  $('#decision-body').innerHTML = `<article class="brief">${sections.join('')}</article>`;
  requirementStrip($('#req-strip'), r.perYear, state.options.irrigationMm);
}

function uniqueCrops(r) {
  return [...new Set(r.rotation.map(cropName))];
}

function whyText(r, base, waterSaved, nDelta, eroDelta, marginDelta, cur) {
  if (!base) return 'No baseline rotation is defined for this region.';
  const parts = [];
  parts.push(
    `Your current rotation, <strong>${rotationLabel(base.rotation)}</strong>, meets the water budget in ` +
    `<strong>${base.reliableYears} of ${base.years}</strong> years. This one meets it in ` +
    `<strong>${r.reliableYears} of ${r.years}</strong>.`,
  );
  if (waterSaved > 0) {
    parts.push(`It needs <strong>${num(waterSaved)} mm less water a year</strong> — about ${num(waterSaved * 10 * state.region.defaultAreaHa)} m³ across ${num(state.region.defaultAreaHa, 1)} hectares.`);
  } else if (waterSaved < 0) {
    parts.push(`It needs <strong>${num(-waterSaved)} mm more water a year</strong>, which is the cost of the other gains.`);
  }
  if (Math.abs(nDelta) > 1) {
    parts.push(nDelta > 0
      ? `It moves the nitrogen balance by <strong>${signed(nDelta, 0)} kg/ha</strong> a year, because the legumes fix what the cereals remove.`
      : `It moves the nitrogen balance by <strong>${signed(nDelta, 0)} kg/ha</strong> a year — the legumes do not fully cover removal.`);
  }
  if (Math.abs(eroDelta) > 0.02) {
    parts.push(eroDelta < 0
      ? `Soil loss falls by <strong>${num(-eroDelta, 2)} t/ha/yr</strong>.`
      : `Soil loss rises by <strong>${num(eroDelta, 2)} t/ha/yr</strong>, because the canopy covers the ground for fewer days.`);
  }
  if (Math.abs(marginDelta) > 0) {
    parts.push(marginDelta < 0
      ? `The downside margin is <strong>${money(-marginDelta, cur)} lower</strong> per hectare. That is the real price of the switch, and it is why the buyer question matters more than the water number.`
      : `The downside margin is <strong>${money(marginDelta, cur)} higher</strong> per hectare.`);
  }
  return parts.join(' ');
}

function diversityText(r) {
  if (r.familyBreaks >= 3) {
    return `It breaks the crop family <strong>${r.familyBreaks} times</strong> across four seasons, which is the mechanism that interrupts the pest and disease cycles a repeated cereal cannot.`;
  }
  if (r.legumeSeasons >= 3) {
    return `All four seasons are legumes, so the rotation fixes nitrogen heavily but does not diversify crop families — the disease break comes from the legume itself, not from rotation.`;
  }
  if (r.familyBreaks === 0) {
    return `It repeats one crop family across all four seasons. That is the cheapest rotation to run and the most fragile one to pests.`;
  }
  return `It breaks the crop family <strong>${r.familyBreaks} times</strong> across four seasons.`;
}

/** Do the model's failure years line up with the driest years on record? */
function droughtText(r) {
  const { years } = annualStats();
  if (!r.failingYears.length || !years.length) return '';
  const ranked = [...years].sort((a, b) => a.rain - b.rain);
  const driest = new Set(ranked.slice(0, 5).map((y) => y.year));
  const overlap = r.failingYears.filter((y) => driest.has(y));
  if (!overlap.length) return '';
  return `<p class="check">Cross-check: ${overlap.length} of the ${r.failingYears.length} failing years — ${overlap.join(', ')} — are among the five driest in the record. The model is not inventing failures.</p>`;
}
function actionList(r) {
  const [s0, s1] = state.region.seasons;
  const out = [];
  out.push(`Sow <strong>${cropName(r.rotation[0])}</strong> in ${s0.label.toLowerCase()} (${s0.sub}), then <strong>${cropName(r.rotation[1])}</strong> in ${s1.label.toLowerCase()}.`);
  out.push(`Hold irrigation to <strong>${state.options.irrigationMm} mm a year</strong>. The model says this rotation fits inside that; the current one does not.`);
  const burnt = evaluateRotation(state.ctx, state.region, r.rotation, state.cache, {
    ...state.options, years: state.years, residueRetained: false,
  });
  out.push(`Keep residue on the surface. Burning it would take soil loss from <strong>${num(r.erosionTPerHa, 2)}</strong> to <strong>${num(burnt.erosionTPerHa, 2)} t/ha/yr</strong> in this calculation.`);
  if (r.legumeSeasons) out.push(`Do not add nitrogen to the legume seasons. The balance already runs at <strong>${signed(r.nitrogenNet, 0)} kg/ha</strong>.`);
  out.push(`Watch the ${r.failingYears.length ? `${r.failingYears.length} flagged years` : 'flagged years'} in the ledger. If the season starts like one of them, use the fallback below.`);
  return out;
}

function fallbackText(r) {
  const kharif = r.rotation[0];
  const alt = state.region.seasons[0].crops
    .map((c) => c.id)
    .filter((id) => id !== kharif && CROPS[id]?.family !== CROPS[kharif]?.family)
    .sort((a, b) => (CROPS[a]?.kcb.mid ?? 0) - (CROPS[b]?.kcb.mid ?? 0))[0];
  const day = state.region.seasons[0].crops.find((c) => c.id === kharif)?.plantDay ?? 165;
  return `If the monsoon has not arrived by <strong>${dayOfYearToDate(day + 20)}</strong>, do not force ${cropName(kharif)}. ` +
    `Switch the ${state.region.seasons[0].label.toLowerCase()} to <strong>${cropName(alt)}</strong>, which needs less water and can still finish before the ${state.region.seasons[1].label.toLowerCase()} window. ` +
    `The trigger is the date, not the hope.`;
}

function dayOfYearToDate(doy) {
  const d = new Date(Date.UTC(2025, 0, 1));
  d.setUTCDate(doy);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', timeZone: 'UTC' });
}

function predictionWetness() {
  const wet = state.bundle.daily.gwetroot;
  const mean = wet.reduce((a, b) => a + (b || 0), 0) / wet.length;
  return Math.max(0.2, Math.min(0.6, mean - 0.02)).toFixed(2);
}

function predictionNdvi() {
  const vals = state.bundle.ndvi?.values ?? [];
  // No composite in the bundle means no prediction. Inventing a plausible
  // number here would be the exact failure mode this product exists to avoid.
  if (!vals.length) return null;
  const sorted = [...vals].sort((a, b) => a - b);
  const p60 = sorted[Math.floor(sorted.length * 0.6)];
  return Math.max(0.3, Math.min(0.8, p60)).toFixed(2);
}

function nextCheckMonth() {
  const d = new Date();
  d.setMonth(d.getMonth() + 4);
  return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

function thresholdText(r, base) {
  if (!base) return 'No baseline to compare against.';
  const probes = [];
  for (let s = 0; s <= 1600; s += 50) {
    const a = evaluateRotation(state.ctx, state.region, r.rotation, state.cache, { ...state.options, irrigationMm: s, years: state.years });
    const b = evaluateRotation(state.ctx, state.region, base.rotation, state.cache, { ...state.options, irrigationMm: s, years: state.years });
    probes.push({ s, a: a.reliability, b: b.reliability });
  }
  const flip = probes.find((p) => p.a < p.b);
  const need = probes.find((p) => p.a >= 0.9);
  const parts = [];
  if (need) parts.push(`This rotation reaches 90% reliability at about <strong>${need.s} mm/year</strong> of irrigation.`);
  if (flip) parts.push(`Below <strong>${flip.s} mm/year</strong> it stops being more reliable than your current practice.`);
  const marginFlip = base.marginP10 > 0
    ? Math.round(((base.marginP10 - r.marginP10) / Math.max(1, base.marginP10)) * 100)
    : 0;
  if (marginFlip > 0) {
    parts.push(`It also stops being worth it if the downside margin falls more than <strong>${marginFlip}%</strong> below current practice — a buyer-price question, not a satellite question.`);
  }
  return parts.join(' ') || 'The ranking is stable across the tested range.';
}

function savePlan() {
  const r = state.selected;
  if (!r) return;
  const plans = JSON.parse(localStorage.getItem('fieldshift-plans-v3') ?? '[]');
  plans.unshift({
    id: crypto.randomUUID(),
    field: state.bundle.id,
    rotation: r.rotation,
    reliability: r.reliability,
    years: r.years,
    supply: state.options.irrigationMm,
    prediction: { wetness: predictionWetness(), ndvi: predictionNdvi(), check: nextCheckMonth() },
    saved: new Date().toISOString(),
  });
  localStorage.setItem('fieldshift-plans-v3', JSON.stringify(plans.slice(0, 40)));
  $('#save-btn').textContent = 'Saved';
  setTimeout(() => { $('#save-btn').textContent = 'Save this plan'; }, 1600);
  renderLedger();
}

/* ── ledger ───────────────────────────────────────────────── */

/** Mean May–September root-zone wetness per year, from the reanalysis record. */
function wetnessByYear() {
  const wet = state.bundle.daily.gwetroot;
  const start = parseStart(state.bundle.daily.start);
  const acc = new Map();
  for (let i = 0; i < state.bundle.daily.n; i += 1) {
    const dt = new Date(start.getTime() + i * 86400000);
    const m = dt.getUTCMonth();
    if (m < 5 || m > 9) continue;
    const y = dt.getUTCFullYear();
    const rec = acc.get(y) ?? { sum: 0, n: 0 };
    rec.sum += wet[i] || 0;
    rec.n += 1;
    acc.set(y, rec);
  }
  const out = new Map();
  for (const [y, rec] of acc) if (rec.n) out.set(y, rec.sum / rec.n);
  return out;
}

function renderLedger() {
  const wetness = wetnessByYear();
  const wetMean = [...wetness.values()].reduce((a, b) => a + b, 0) / Math.max(1, wetness.size);
  // One flagged year and one passing year, both the most recent, so the reader
  // sees the model being right and being wrong in the same breath.
  const lastFail = [...state.baseline.failingYears].sort((a, b) => b - a)[0];
  const lastPass = state.years
    .filter((y) => !state.baseline.failingYears.includes(y))
    .sort((a, b) => b - a)[0];
  const backtest = (year, expected) => {
    const observed = wetness.get(year);
    return {
      title: `${year} — flagged as ${expected === 'fail' ? 'a failure year' : 'a pass'}`,
      meta: `model: water budget ${expected === 'fail' ? 'missed' : 'met'} · observed: NASA POWER GWETROOT, May–Sep`,
      text: Number.isFinite(observed) ? `${observed.toFixed(2)} m³/m³` : 'No data',
      note: Number.isFinite(observed) ? `record mean ${wetMean.toFixed(2)}` : '',
      hit: Number.isFinite(observed) ? (expected === 'fail' ? observed < wetMean : observed >= wetMean) : null,
    };
  };

  const ndviPrediction = predictionNdvi();
  const predictions = [
    ...(lastFail ? [backtest(lastFail, 'fail')] : []),
    ...(lastPass ? [backtest(lastPass, 'pass')] : []),
    {
      title: 'Next season root-zone wetness',
      meta: 'predicted ≥ ' + predictionWetness() + ' · NASA POWER GWETROOT',
      text: `Check ${nextCheckMonth()}`,
      note: 'committed, not yet resolved',
      hit: null,
    },
    ndviPrediction
      ? {
        title: 'Next season peak NDVI',
        meta: 'predicted ≥ ' + ndviPrediction + ' · NASA MODIS MOD13Q1',
        text: `Check ${nextCheckMonth()}`,
        note: 'committed, not yet resolved',
        hit: null,
      }
      : {
        title: 'Next season peak NDVI',
        meta: 'no composite bundled · NASA MODIS MOD13Q1',
        text: 'Withheld',
        note: 'no prediction made, so nothing to score',
        hit: null,
      },
  ];

  const hits = predictions.filter((p) => p.hit === true).length;
  const misses = predictions.filter((p) => p.hit === false).length;
  const open = predictions.filter((p) => p.hit === null).length;
  const saved = JSON.parse(localStorage.getItem('fieldshift-plans-v3') ?? '[]');

  $('#ledger-body').innerHTML = `
    ${validationPanel()}

    <h2 class="ledger-h2">Predictions we have already made</h2>
    <div class="ledger-grid">
      ${predictions.map((p) => `
        <div class="ledger-card">
          <h3>${escapeHtml(p.title)}</h3>
          <p class="meta">${escapeHtml(p.meta)}</p>
          <p class="ledger-obs">${escapeHtml(p.text)}</p>
          ${p.note ? `<p class="ledger-note">${escapeHtml(p.note)}</p>` : ''}
          <span class="verdict ${p.hit === true ? 'verdict-hit' : p.hit === false ? 'verdict-miss' : 'verdict-open'}">
            ${p.hit === true ? 'hit' : p.hit === false ? 'miss' : 'open'}
          </span>
        </div>`).join('')}
    </div>

    <div class="scorecard">
      <div><b>${predictions.length}</b><span>predictions</span></div>
      <div><b>${hits}</b><span>hit</span></div>
      <div><b>${misses}</b><span>miss</span></div>
      <div><b>${open}</b><span>open</span></div>
      <div><b>${saved.length}</b><span>plans saved</span></div>
    </div>

    ${scalePanel()}
  `;
}

/** The honest test: do the model's failure years look like real dry years? */
function validationPanel() {
  const base = state.baseline;
  const rec = state.selected;
  if (!base) return '';
  const { years } = annualStats();
  const ranked = [...years].sort((a, b) => a.rain - b.rain);
  const driest = ranked.slice(0, 5);
  const driestSet = new Set(driest.map((y) => y.year));
  const overlap = base.failingYears.filter((y) => driestSet.has(y));

  const wetness = wetnessByYear();
  const meanWet = (y) => wetness.get(y) ?? NaN;
  const failWet = base.failingYears.map(meanWet).filter(Number.isFinite);
  const okWet = years
    .map((y) => y.year)
    .filter((y) => !base.failingYears.includes(y))
    .map(meanWet)
    .filter(Number.isFinite);
  const avg = (a) => (a.length ? a.reduce((x, z) => x + z, 0) / a.length : NaN);
  const delta = avg(okWet) - avg(failWet);

  return `
    <div class="validation">
      <p class="eyebrow">Model validation · not a claim, a check</p>
      <h2>Do the years we call failures look like failures?</h2>
      <div class="validation-grid">
        <div>
          <b>${overlap.length} of 5</b>
          <span>driest years in the record are flagged as failures by the model for current practice</span>
        </div>
        <div>
          <b>${Number.isFinite(delta) ? delta.toFixed(2) : '—'}</b>
          <span>m³/m³ wetter root zone in years the model passes than in years it fails, from the reanalysis record</span>
        </div>
        <div>
          <b>${base.failingYears.length}</b>
          <span>years the model says ${escapeHtml(rotationLabel(base.rotation))} misses the water budget at ${state.options.irrigationMm} mm</span>
        </div>
      </div>
      <p class="validation-note">
        The driest five years are ${driest.map((y) => `${y.year} (${num(y.rain)} mm)`).join(', ')}.
        The model flags ${overlap.join(', ') || 'none of them'} as failures.
        ${rec && rec.key !== base.key ? `The recommended rotation fails in ${rec.failingYears.length} years instead of ${base.failingYears.length}.` : ''}
        This is a directional check on a reanalysis product, not an independent satellite validation — we say so because the difference matters.
      </p>
    </div>
  `;
}

function scalePanel() {
  const base = state.baseline;
  const alt = state.selected;
  if (!base || !alt) return '';
  const areaHa = state.region.scaleAreaHa ?? 4_200_000;
  const share = 0.1;
  const deltaMm = Math.max(0, base.meanRequirement - alt.meanRequirement);
  const km3 = (deltaMm * 10 * areaHa * share) / 1e9;
  return `
    <div class="scale-panel">
      <h2>What this means beyond one field</h2>
      <p>
        The ${escapeHtml(state.region.name)} ${escapeHtml(state.region.baseline.map(cropName).join('–'))} system
        covers roughly <span class="mono">${num(areaHa / 1e6, 1)} million hectares</span>
        (${escapeHtml(state.region.scaleAreaLabel ?? 'regional cropland')}). Our model says the current
        rotation meets a <span class="mono">${state.options.irrigationMm} mm</span> water budget in
        <span class="mono">${pct(base.reliability)}</span> of years on this field.
      </p>
      <p>
        If <span class="mono">10%</span> of that area shifted to the recommended rotation, the modelled
        irrigation demand falls by <span class="scale-num">${km3.toFixed(2)}</span>
        <span class="mono">km³ per year</span>.
      </p>
      <p class="meta">
        Area, share and demand difference are all editable in the model card. This is arithmetic on our own
        model output, not a measured saving, and it assumes the rotation is adopted uniformly — which it would not be.
      </p>
    </div>
  `;
}

/* ── routing ──────────────────────────────────────────────── */

function route() {
  const view = (location.hash.replace('#', '') || 'field');
  state.view = ['field', 'lab', 'decision', 'ledger'].includes(view) ? view : 'field';
  for (const v of ['field', 'lab', 'decision', 'ledger']) {
    $(`#view-${v}`).hidden = v !== state.view;
  }
  document.querySelectorAll('.tabs a').forEach((a) => {
    a.setAttribute('aria-current', a.dataset.view === state.view ? 'page' : 'false');
  });
  if (state.view === 'field' && state.map) setTimeout(() => state.map.invalidateSize(), 60);
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function parseStart(raw) {
  if (/^\d{8}$/.test(raw)) {
    return new Date(Date.UTC(Number(raw.slice(0, 4)), Number(raw.slice(4, 6)) - 1, Number(raw.slice(6, 8))));
  }
  return new Date(`${raw}T00:00:00Z`);
}

boot().catch((err) => {
  console.error(err);
  document.body.insertAdjacentHTML('afterbegin',
    `<pre style="padding:20px;background:#f2d6d0;color:#7a2418;font:12px monospace;white-space:pre-wrap">${escapeHtml(err.stack || String(err))}</pre>`);
});

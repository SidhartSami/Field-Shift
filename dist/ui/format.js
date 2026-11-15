/** Number, unit and label formatting. Everything user-facing goes through here. */

import { CROPS } from '../engine/crops.js';

export function num(v, digits = 0) {
  if (!Number.isFinite(v)) return '—';
  return v.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function pct(v, digits = 0) {
  if (!Number.isFinite(v)) return '—';
  return `${(v * 100).toFixed(digits)}%`;
}

export function mm(v) {
  return `${num(v)} mm`;
}

export function money(v, currency) {
  if (!Number.isFinite(v)) return '—';
  const abs = Math.abs(v);
  if (abs >= 1e9) return `${(v / 1e9).toFixed(1)}bn ${currency}`;
  if (abs >= 1e6) return `${(v / 1e6).toFixed(1)}m ${currency}`;
  if (abs >= 1e4) return `${num(v / 1000, 0)}k ${currency}`;
  return `${num(v)} ${currency}`;
}

export function signed(v, digits = 1) {
  if (!Number.isFinite(v)) return '—';
  const s = v > 0 ? '+' : '';
  return `${s}${num(v, digits)}`;
}

export function cropName(id) {
  if (id === 'fallow') return 'Fallow';
  return CROPS[id]?.name ?? id;
}

export function cropLocal(id) {
  if (id === 'fallow') return '—';
  return CROPS[id]?.local ?? '';
}

export function rotationLabel(rotation) {
  return rotation.map(cropName).join(' · ');
}

export function rotationShort(rotation) {
  return rotation.map((c) => cropName(c).split(' ')[0]).join('–');
}

export function chip(kind) {
  const label = kind === 'observed' ? 'observed' : kind === 'reanalysis' ? 'reanalysis' : 'simulated';
  return `<span class="chip chip-${label}">${label}</span>`;
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

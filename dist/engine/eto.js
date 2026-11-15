/**
 * Reference evapotranspiration, FAO-56 Penman-Monteith (Allen et al. 1998).
 *
 * Inputs are NASA POWER daily fields: T2M_MAX, T2M_MIN, RH2M, WS2M and
 * ALLSKY_SFC_SW_DWN (MJ/m2/day). Elevation comes from
 * the POWER response geometry.
 *
 * Output is mm/day. The equation is the standard one used by every irrigation
 * advisory service; nothing here is bespoke.
 */

const GSC = 0.0820; // MJ m-2 min-1
const SIGMA = 4.903e-9; // MJ K-4 m-2 day-1
const ALBEDO = 0.23;

function satVapourPressure(t) {
  return 0.6108 * Math.exp((17.27 * t) / (t + 237.3));
}

function slopeVapourPressure(t) {
  const es = satVapourPressure(t);
  return (4098 * es) / Math.pow(t + 237.3, 2);
}

/** Extraterrestrial radiation, MJ m-2 day-1. */
export function extraterrestrialRadiation(latDeg, dayOfYear) {
  const phi = (Math.PI / 180) * latDeg;
  const dr = 1 + 0.033 * Math.cos((2 * Math.PI * dayOfYear) / 365);
  const delta = 0.409 * Math.sin((2 * Math.PI * dayOfYear) / 365 - 1.39);
  const x = Math.max(-1, Math.min(1, -Math.tan(phi) * Math.tan(delta)));
  const ws = Math.acos(x);
  return (
    ((24 * 60) / Math.PI) *
    GSC *
    dr *
    (ws * Math.sin(phi) * Math.sin(delta) + Math.cos(phi) * Math.cos(delta) * Math.sin(ws))
  );
}

/**
 * Daily reference evapotranspiration.
 * @param {{tmax:number,tmin:number,rh:number,ws:number,srad:number}} day
 * @param {number} latDeg latitude, degrees
 * @param {number} dayOfYear 1-366
 * @param {number} elevM elevation, metres
 * @returns {number} ET0 in mm/day
 */
export function et0(day, latDeg, dayOfYear, elevM) {
  const { tmax, tmin, rh, ws, srad } = day;
  if (![tmax, tmin, rh, ws, srad].every(Number.isFinite)) return NaN;
  if (tmax <= -900 || tmin <= -900) return NaN;

  const t = (tmax + tmin) / 2;
  // POWER returns ALLSKY_SFC_SW_DWN in MJ/m2/day (verified against the API
  // response header), so no unit conversion is applied here.
  const rs = srad;
  if (rs <= 0) return NaN;

  const p = 101.3 * Math.pow((293 - 0.0065 * elevM) / 293, 5.26);
  const gamma = 0.000665 * p;
  const delta = slopeVapourPressure(t);

  const es = (satVapourPressure(tmax) + satVapourPressure(tmin)) / 2;
  const ea = Math.max(0, (rh / 100) * es);

  const ra = extraterrestrialRadiation(latDeg, dayOfYear);
  const rso = (0.75 + 2e-5 * elevM) * ra;
  const rns = (1 - ALBEDO) * rs;
  const ratio = rso > 0 ? Math.min(1, rs / rso) : 0;
  const rnl =
    SIGMA *
    ((Math.pow(tmax + 273.16, 4) + Math.pow(tmin + 273.16, 4)) / 2) *
    (0.34 - 0.14 * Math.sqrt(ea)) *
    (1.35 * ratio - 0.35);
  const rn = rns - rnl;

  const u2 = Math.max(0.1, ws);
  const num = 0.408 * delta * rn + gamma * (900 / (t + 273)) * u2 * (es - ea);
  const den = delta + gamma * (1 + 0.34 * u2);
  const value = num / den;
  return Number.isFinite(value) ? Math.max(0, value) : NaN;
}

/**
 * Precompute ET0 for a whole field bundle.
 * @param {object} bundle field bundle with daily arrays
 * @returns {Float64Array} ET0 per day, NaN where inputs are missing
 */
export function et0Series(bundle) {
  const d = bundle.daily;
  const out = new Float64Array(d.n);
  const start = /^\d{8}$/.test(d.start)
    ? new Date(Date.UTC(Number(d.start.slice(0,4)), Number(d.start.slice(4,6))-1, Number(d.start.slice(6,8))))
    : new Date(d.start + 'T00:00:00Z');
  for (let i = 0; i < d.n; i += 1) {
    const date = new Date(start.getTime() + i * 86400000);
    const doy =
      Math.floor((date - Date.UTC(date.getUTCFullYear(), 0, 0)) / 86400000) || 1;
    out[i] = et0(
      { tmax: d.tmax[i], tmin: d.tmin[i], rh: d.rh[i], ws: d.ws[i], srad: d.srad[i] },
      bundle.lat,
      doy,
      bundle.elevation,
    );
  }
  return out;
}

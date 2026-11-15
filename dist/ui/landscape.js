/**
 * The record as a landscape.
 *
 * Thirty-three years of water requirement, one column per year, standing on a
 * ground plane with the supply level drawn as a wireframe sheet. Columns that
 * break the sheet are the years the rotation fails. Drag to orbit.
 *
 * Canvas 2D with a hand-rolled projection rather than a WebGL library: the
 * scene is 33 boxes and a grid, so a 600 KB dependency would buy nothing but
 * load time. Painter's algorithm, back-face culling by projected winding, flat
 * shading per face.
 */

const TAU = Math.PI * 2;

/** Rotate a world point into camera space, then project to the canvas. */
function project(p, cam) {
  const cy = Math.cos(cam.yaw);
  const sy = Math.sin(cam.yaw);
  const x1 = p.x * cy + p.z * sy;
  const z1 = -p.x * sy + p.z * cy;

  const cp = Math.cos(cam.pitch);
  const sp = Math.sin(cam.pitch);
  const y2 = p.y * cp - z1 * sp;
  const z2 = p.y * sp + z1 * cp;

  const depth = cam.dist + z2;
  const k = cam.focal / Math.max(0.35, depth);
  return { x: cam.cx + x1 * k, y: cam.cy - y2 * k, depth };
}

/** Signed area of a projected polygon. Negative means back-facing. */
function winding(points) {
  let sum = 0;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return sum / 2;
}

function shade(hex, factor) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * factor);
  const g = Math.round(((n >> 8) & 255) * factor);
  const b = Math.round((n & 255) * factor);
  return `rgb(${r},${g},${b})`;
}

function quad(ctx, pts, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i += 1) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{years:Array<{year:number,requirement:number,ok:boolean}>, supply:number}} data
 */
export function landscape(canvas, data) {
  const ctx = canvas.getContext('2d');
  if (!data.years.length) return { destroy() {}, setData() {} };

  let years = data.years;
  let maxReq = Math.max(...years.map((y) => y.requirement), data.supply) * 1.06;
  let supplyY = data.supply / maxReq;

  const cam = { yaw: -0.60, pitch: 0.52, dist: 2.6, focal: 1, cx: 0, cy: 0 };
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let idleYaw = cam.yaw;

  const span = 2;
  const halfD = 0.016;
  const depth = 0.10;

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cam.cx = rect.width / 2;
    cam.cy = rect.height * 0.76;
    cam.focal = Math.min(rect.width * 0.76, rect.height * 1.85);
    draw();
  }

  function draw() {
    const N = years.length;
    const step = span / N;
    const halfW = step * 0.30;
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);

    const faces = [];

    // Ground grid, drawn as flat lines so the base reads as a surface.
    ctx.strokeStyle = 'rgba(20,26,23,.10)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= N; i += 4) {
      const x = -span / 2 + i * step;
      const a = project({ x, y: 0, z: -depth }, cam);
      const b = project({ x, y: 0, z: depth }, cam);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    for (const z of [-depth, 0, depth]) {
      const a = project({ x: -span / 2, y: 0, z }, cam);
      const b = project({ x: span / 2, y: 0, z }, cam);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }

    // The supply sheet, drawn over the columns as a wireframe so it reads as
    // glass rather than as a wall.
    ctx.strokeStyle = 'rgba(20,26,23,.5)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    for (let i = 0; i <= N; i += 4) {
      const x = -span / 2 + i * step;
      const a = project({ x, y: supplyY, z: -depth }, cam);
      const b = project({ x, y: supplyY, z: depth }, cam);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    for (const z of [-depth, depth]) {
      const a = project({ x: -span / 2, y: supplyY, z }, cam);
      const b = project({ x: span / 2, y: supplyY, z }, cam);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    ctx.setLineDash([]);

    years.forEach((rec, i) => {
      const x = -span / 2 + step * (i + 0.5);
      const h = rec.requirement / maxReq;
      const base = rec.ok ? '#0f6b5c' : '#a33a2a';

      const corners = {
        a: { x: x - halfW, z: -halfD },
        b: { x: x + halfW, z: -halfD },
        c: { x: x + halfW, z: halfD },
        d: { x: x - halfW, z: halfD },
      };
      const at = (c, y) => project({ x: c.x, y, z: c.z }, cam);

      const sides = [
        { pts: [at(corners.a, 0), at(corners.b, 0), at(corners.b, h), at(corners.a, h)], f: 0.72 },
        { pts: [at(corners.b, 0), at(corners.c, 0), at(corners.c, h), at(corners.b, h)], f: 0.86 },
        { pts: [at(corners.c, 0), at(corners.d, 0), at(corners.d, h), at(corners.c, h)], f: 0.72 },
        { pts: [at(corners.d, 0), at(corners.a, 0), at(corners.a, h), at(corners.d, h)], f: 0.86 },
      ];
      for (const s of sides) {
        if (winding(s.pts) <= 0) continue;
        faces.push({ pts: s.pts, fill: shade(base, s.f), depth: avgDepth(s.pts) });
      }
      const top = [at(corners.a, h), at(corners.b, h), at(corners.c, h), at(corners.d, h)];
      if (winding(top) > 0) faces.push({ pts: top, fill: shade(base, 1.12), depth: avgDepth(top) });
    });

    faces.sort((p, q) => q.depth - p.depth);
    for (const f of faces) quad(ctx, f.pts, f.fill, null);

    // Year ticks along the near edge.
    ctx.fillStyle = 'rgba(109,116,106,.9)';
    ctx.font = '500 12px "Instrument Sans", sans-serif';
    ctx.textAlign = 'center';
    years.forEach((rec, i) => {
      if (rec.year % 5 !== 0) return;
      const x = -span / 2 + step * (i + 0.5);
      const p = project({ x, y: 0, z: depth }, cam);
      ctx.fillText(String(rec.year), p.x, p.y + 20);
    });
  }

  function avgDepth(pts) {
    let d = 0;
    for (const p of pts) d += p.depth;
    return d / pts.length;
  }

  function onDown(e) {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.setPointerCapture?.(e.pointerId);
    canvas.classList.add('is-dragging');
  }
  function onMove(e) {
    if (!dragging) return;
    cam.yaw += (e.clientX - lastX) * 0.008;
    cam.pitch = Math.max(0.12, Math.min(0.95, cam.pitch + (e.clientY - lastY) * 0.004));
    lastX = e.clientX;
    lastY = e.clientY;
    draw();
  }
  function onUp(e) {
    dragging = false;
    canvas.releasePointerCapture?.(e.pointerId);
    canvas.classList.remove('is-dragging');
  }

  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  function setData(next) {
    years = next.years;
    maxReq = Math.max(...years.map((y) => y.requirement), next.supply) * 1.06;
    supplyY = next.supply / maxReq;
    draw();
  }

  function destroy() {
    ro.disconnect();
    canvas.removeEventListener('pointerdown', onDown);
    canvas.removeEventListener('pointermove', onMove);
    canvas.removeEventListener('pointerup', onUp);
    canvas.removeEventListener('pointercancel', onUp);
  }

  return { destroy, setData };
}

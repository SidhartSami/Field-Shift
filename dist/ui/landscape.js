/**
 * The record as a landscape.
 *
 * Three axes, all carrying data:
 *   x  the year, one column each
 *   y  the irrigation requirement, in millimetres
 *   z  the rotation, one row per rotation
 *
 * The supply level is a dashed sheet cutting across both rows. A column that
 * breaks the sheet is a year that rotation fails, so the comparison is a
 * height comparison in one scene rather than two pictures you have to hold in
 * your head. Drag to orbit.
 *
 * Canvas 2D with a hand-rolled projection rather than a WebGL library: the
 * scene is 66 boxes and a grid, so a 600 KB dependency would buy nothing but
 * load time. Painter's algorithm, back-face culling by projected winding,
 * flat shading per face.
 */

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

function quad(ctx, pts, fill) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i += 1) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
}

function line(ctx, a, b) {
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
}

const INK = '#141a17';
const MUTED = '#6d746a';
const GRID = 'rgba(20,26,23,.10)';
const AXIS = 'rgba(20,26,23,.28)';
const SHEET = 'rgba(20,26,23,.42)';

/* Two states, two values of one grey ramp. The failures are the dark columns,
   because the failures are the thing the product is about. */
const FACE = {
  ok: { top: '#d9d2c3', a: '#c9c2b2', b: '#bcb4a3' },
  fail: { top: '#141a17', a: '#1c2520', b: '#26302a' },
};

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{series:Array<{label:string,years:Array<{year:number,requirement:number,ok:boolean}>}>, supply:number}} data
 */
export function landscape(canvas, data) {
  const ctx = canvas.getContext('2d');
  let series = data.series || [];
  let supply = data.supply;
  if (!series.length || !series[0].years.length) return { destroy() {}, setData() {} };

  const span = 2;
  const rowGap = 0.34;
  const halfD = 0.05;

  let maxReq = 0;
  function measure() {
    maxReq = Math.max(
      supply,
      ...series.flatMap((s) => s.years.map((y) => y.requirement)),
    ) * 1.06;
  }
  measure();

  const cam = { yaw: -0.62, pitch: 0.66, dist: 3.05, focal: 1, cx: 0, cy: 0 };
  let compact = false;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  /* Row 0 is the near row, so the rotation with the most failures sits in
     front of the one it is being compared against. */
  const rowZ = (i) => (series.length === 1 ? 0 : ((series.length - 1) / 2 - i) * rowGap * 2);
  const nearZ = () => Math.max(...series.map((_, i) => rowZ(i))) + halfD;
  const farZ = () => Math.min(...series.map((_, i) => rowZ(i))) - halfD;

  /**
   * Fit the scene to the canvas instead of guessing a focal length. Project the
   * eight corners of the bounding box at unit scale, then solve for the scale
   * and offset that centre it with room for the axis labels.
   *
   * The padding is a fraction of the canvas, not a pixel constant: a 196px
   * right margin is right for a 1100px canvas and leaves almost nothing for
   * the geometry on a phone.
   */
  function fit(width, height) {
    const probe = { ...cam, focal: 1, cx: 0, cy: 0 };
    const xs = [];
    const ys = [];
    for (const x of [-span / 2, span / 2]) {
      for (const y of [0, 1]) {
        for (const z of [farZ(), nearZ()]) {
          const p = project({ x, y, z }, probe);
          xs.push(p.x);
          ys.push(p.y);
        }
      }
    }
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const padLeft = compact ? 34 : 76;
    const padRight = compact ? 96 : 196;
    const padTop = compact ? 22 : 30;
    const padBottom = compact ? 38 : 54;
    const scale = Math.min(
      (width - padLeft - padRight) / (maxX - minX),
      (height - padTop - padBottom) / (maxY - minY),
    );
    cam.focal = scale;
    cam.cx = padLeft + (width - padLeft - padRight) / 2 - scale * (minX + maxX) / 2;
    cam.cy = padTop + (height - padTop - padBottom) / 2 - scale * (minY + maxY) / 2;
  }

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    /* A portrait canvas needs a steeper pitch: the rows separate vertically
       instead of horizontally, which is the axis a phone actually has. */
    const nextCompact = rect.width < 560;
    if (nextCompact !== compact) {
      compact = nextCompact;
      cam.pitch = compact ? 0.94 : 0.66;
      cam.yaw = compact ? -0.5 : -0.62;
    }

    fit(rect.width, rect.height);
    draw();
  }

  function draw() {
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);

    const N = series[0].years.length;
    const step = span / N;
    const halfW = step * 0.30;
    const supplyY = supply / maxReq;
    const zNear = nearZ();
    const zFar = farZ();

    /* ── ground ─────────────────────────────────────────────── */
    ctx.strokeStyle = GRID;
    ctx.lineWidth = 1;
    for (let i = 0; i <= N; i += 4) {
      const x = -span / 2 + i * step;
      line(ctx, project({ x, y: 0, z: zFar }, cam), project({ x, y: 0, z: zNear }, cam));
    }
    for (const z of [zFar, 0, zNear]) {
      line(ctx, project({ x: -span / 2, y: 0, z }, cam), project({ x: span / 2, y: 0, z }, cam));
    }

    /* ── the columns, both rows, sorted back to front ───────── */
    const faces = [];
    series.forEach((s, si) => {
      const z0 = rowZ(si);
      s.years.forEach((rec, i) => {
        const x = -span / 2 + step * (i + 0.5);
        const h = rec.requirement / maxReq;
        const pal = rec.ok ? FACE.ok : FACE.fail;

        const corners = {
          a: { x: x - halfW, z: z0 - halfD },
          b: { x: x + halfW, z: z0 - halfD },
          c: { x: x + halfW, z: z0 + halfD },
          d: { x: x - halfW, z: z0 + halfD },
        };
        const at = (c, y) => project({ x: c.x, y, z: c.z }, cam);

        const sides = [
          { pts: [at(corners.a, 0), at(corners.b, 0), at(corners.b, h), at(corners.a, h)], fill: pal.a },
          { pts: [at(corners.b, 0), at(corners.c, 0), at(corners.c, h), at(corners.b, h)], fill: pal.b },
          { pts: [at(corners.c, 0), at(corners.d, 0), at(corners.d, h), at(corners.c, h)], fill: pal.a },
          { pts: [at(corners.d, 0), at(corners.a, 0), at(corners.a, h), at(corners.d, h)], fill: pal.b },
        ];
        for (const side of sides) {
          if (winding(side.pts) <= 0) continue;
          faces.push({ pts: side.pts, fill: side.fill, depth: avgDepth(side.pts) });
        }
        const top = [at(corners.a, h), at(corners.b, h), at(corners.c, h), at(corners.d, h)];
        if (winding(top) > 0) faces.push({ pts: top, fill: pal.top, depth: avgDepth(top) });
      });
    });

    faces.sort((p, q) => q.depth - p.depth);
    for (const f of faces) quad(ctx, f.pts, f.fill);

    /* ── the supply sheet, over the columns so it reads as glass ─ */
    ctx.strokeStyle = SHEET;
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    for (let i = 0; i <= N; i += 4) {
      const x = -span / 2 + i * step;
      line(ctx, project({ x, y: supplyY, z: zFar }, cam), project({ x, y: supplyY, z: zNear }, cam));
    }
    for (const z of [zFar, zNear]) {
      line(ctx, project({ x: -span / 2, y: supplyY, z }, cam), project({ x: span / 2, y: supplyY, z }, cam));
    }
    ctx.setLineDash([]);

    /* ── axes ───────────────────────────────────────────────── */
    ctx.strokeStyle = AXIS;
    ctx.lineWidth = 1;
    // y, up the left edge
    line(ctx, project({ x: -span / 2, y: 0, z: zNear }, cam), project({ x: -span / 2, y: 1, z: zNear }, cam));
    // x, along the near edge
    line(ctx, project({ x: -span / 2, y: 0, z: zNear }, cam), project({ x: span / 2, y: 0, z: zNear }, cam));
    // z, along the right edge
    line(ctx, project({ x: span / 2, y: 0, z: zFar }, cam), project({ x: span / 2, y: 0, z: zNear }, cam));

    ctx.font = `500 ${compact ? 10.5 : 12}px "Instrument Sans", sans-serif`;
    ctx.fillStyle = MUTED;

    // x: years
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const yearCands = [];
    series[0].years.forEach((rec, i) => {
      if (rec.year % 5 !== 0) return;
      const x = -span / 2 + step * (i + 0.5);
      const p = project({ x, y: 0, z: zNear }, cam);
      yearCands.push({ pos: p.x, text: String(rec.year), y: p.y });
    });
    for (const c of thin(yearCands, compact ? 30 : 40)) {
      ctx.fillText(c.text, c.pos, c.y + (compact ? 9 : 12));
    }

    // y: millimetres
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    /* Pick the tick step from the projected length of the axis, so the ticks
       stay evenly spaced instead of thinning into an irregular set. */
    const yTop = project({ x: -span / 2, y: 1, z: zNear }, cam);
    const yBot = project({ x: -span / 2, y: 0, z: zNear }, cam);
    const axisPx = Math.abs(yBot.y - yTop.y);
    const minGap = compact ? 21 : 30;
    const yStep = [250, 500, 1000, 2000].find((s) => (axisPx * s) / maxReq >= minGap) || 2000;
    for (let mm = 0; mm <= maxReq; mm += yStep) {
      const p = project({ x: -span / 2, y: mm / maxReq, z: zNear }, cam);
      ctx.fillText(String(mm), p.x - (compact ? 8 : 12), p.y);
      ctx.strokeStyle = AXIS;
      line(ctx, { x: p.x - (compact ? 5 : 7), y: p.y }, { x: p.x, y: p.y });
    }
    const unit = project({ x: -span / 2, y: 1, z: zNear }, cam);
    ctx.fillText('mm', unit.x - (compact ? 8 : 12), unit.y - (compact ? 15 : 20));

    // z: the rotation, at the near end of each row
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    series.forEach((s, si) => {
      const p = project({ x: span / 2 + 0.03, y: 0, z: rowZ(si) }, cam);
      ctx.fillStyle = INK;
      ctx.fillText(s.label, p.x, p.y);
      ctx.fillStyle = MUTED;
    });
  }

  /**
   * Keep the labels that fit. Candidates arrive in drawing order; a label is
   * dropped when it would land closer than `minGap` to the last one kept, so
   * the axis thins itself to whatever the canvas can hold instead of relying
   * on a hardcoded "every fifth year".
   */
  function thin(cands, minGap) {
    const keep = [];
    let last = -Infinity;
    for (const c of cands) {
      if (c.pos - last < minGap) continue;
      keep.push(c);
      last = c.pos;
    }
    return keep;
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
    cam.pitch = Math.max(0.16, Math.min(1.05, cam.pitch + (e.clientY - lastY) * 0.004));
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
    series = next.series;
    supply = next.supply;
    measure();
    resize();
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

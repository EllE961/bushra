type Ctx = CanvasRenderingContext2D;
type P = { x: number; y: number };

/** An inward spiral that leaves (cx, cy - r0) heading in direction `dir` (+1 clockwise on screen, -1 counter). */
export function spiral(cx: number, cy: number, r0: number, turns: number, start: number, dir: 1 | -1, tight = 0.22): P[] {
  const n = Math.max(24, Math.round(turns * 48));
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const a = start + dir * t * turns * Math.PI * 2;
    const r = r0 * (1 - (1 - tight) * t);
    return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
  });
}

export function polyline(ctx: Ctx, pts: P[]) {
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
}

function teardrop(ctx: Ctx, x: number, y: number, angle: number, len: number, wid: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(len * 0.35, -wid, len * 0.95, -wid * 0.7, len, 0);
  ctx.bezierCurveTo(len * 0.95, wid * 0.7, len * 0.35, wid, 0, 0);
  ctx.restore();
}

/**
 * A broad-nib pen stroke along `pts`: hairline where the pen moves along the
 * nib, full where it moves across it, and tapering into both ends.
 */
export function pen(ctx: Ctx, pts: P[], thin: number, thick: number, o: { nib?: number; taperStart?: number; taperEnd?: number } = {}) {
  const nib = o.nib ?? Math.PI / 4;
  const n = pts.length;
  const lens = [0];
  for (let i = 1; i < n; i++) lens.push(lens[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  const total = lens[n - 1] || 1;
  const ts = o.taperStart ?? 40;
  const te = o.taperEnd ?? 40;
  const left: P[] = [];
  const right: P[] = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(n - 1, i + 1)];
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    let w = thin + (thick - thin) * Math.abs(Math.sin(ang - nib));
    const fromStart = lens[i];
    const fromEnd = total - lens[i];
    if (ts > 0) w *= Math.min(1, 0.15 + 0.85 * Math.sqrt(Math.min(1, fromStart / ts)));
    if (te > 0) w *= Math.min(1, 0.15 + 0.85 * Math.sqrt(Math.min(1, fromEnd / te)));
    const nx = -Math.sin(ang) * (w / 2);
    const ny = Math.cos(ang) * (w / 2);
    left.push({ x: pts[i].x + nx, y: pts[i].y + ny });
    right.push({ x: pts[i].x - nx, y: pts[i].y - ny });
  }
  ctx.beginPath();
  left.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i].x, right[i].y);
  ctx.closePath();
  ctx.fill();
}

/** Points along a cubic Bezier. */
export function cubic(p0: P, p1: P, p2: P, p3: P, n = 32): P[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const u = 1 - t;
    return {
      x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
      y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
    };
  });
}

/**
 * A calligraphic corner: two arms that run along the edges and roll into
 * scrolls near the corner, with a leaf on the diagonal. Drawn for a top-left
 * corner at (x, y); `sx`/`sy` mirror it into the other three.
 */
export function flourishCorner(
  ctx: Ctx,
  x: number,
  y: number,
  sx: 1 | -1,
  sy: 1 | -1,
  o: { arm: number; armV?: number; size?: number; color: string; weight?: number },
) {
  const k = o.size ?? 1;
  const wt = o.weight ?? 1;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(sx * k, sy * k);
  ctx.fillStyle = o.color;

  const half = (flip: boolean, arm: number) => {
    const m = (p: P): P => (flip ? { x: p.y, y: p.x } : p);
    const a = 26;
    // The arm runs in from afar and rolls under into the main scroll.
    const scroll = spiral(150, a + 46, 46, 1.35, -Math.PI / 2, -1, 0.14);
    const armPts: P[] = [];
    for (let i = 0; i <= 40; i++) armPts.push({ x: arm / k - (i / 40) * (arm / k - 150), y: a });
    pen(ctx, [...armPts, ...scroll.slice(1)].map(m), 1.1 * wt, 5 * wt, { taperStart: 180, taperEnd: 24 });
    // A tendril that leaves the arm and curls back toward the edge.
    const curl = spiral(262, a - 14, 14, 1.15, Math.PI / 2, 1, 0.2);
    const lead = cubic({ x: 340, y: a }, { x: 310, y: a }, { x: 280, y: a + 4 }, curl[0], 12);
    pen(ctx, [...lead, ...curl.slice(1)].map(m), 0.9 * wt, 3 * wt, { taperStart: 30, taperEnd: 14 });
    for (const [px, r] of [
      [382, 3.6],
      [404, 2.6],
      [422, 1.8],
    ] as const) {
      const d = m({ x: px, y: a });
      ctx.beginPath();
      ctx.arc(d.x, d.y, r * wt, 0, Math.PI * 2);
      ctx.fill();
    }
  };
  half(false, o.arm);
  half(true, o.armV ?? o.arm);

  // The diagonal: a leaf pointing into the corner, flanked by seeds.
  teardrop(ctx, 82, 82, Math.PI + Math.PI / 4, 66, 14);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(12, 12, 4.4 * wt, 0, Math.PI * 2);
  ctx.fill();
  for (const [px, py] of [
    [70, 34],
    [34, 70],
  ]) {
    ctx.beginPath();
    ctx.arc(px, py, 3 * wt, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** A rule that tapers to nothing at both ends, with a diamond and seeds at its centre. */
export function taperedRule(ctx: Ctx, cx: number, cy: number, width: number, color: string, weight = 2.2) {
  ctx.save();
  ctx.fillStyle = color;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + s * 22, cy - weight / 2);
    ctx.lineTo(cx + s * (width / 2), cy);
    ctx.lineTo(cx + s * 22, cy + weight / 2);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + s * (width / 2 + 10), cy, weight * 1.1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(cx, cy - 9);
  ctx.lineTo(cx + 9, cy);
  ctx.lineTo(cx, cy + 9);
  ctx.lineTo(cx - 9, cy);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** A star polygon with `points` tips, alternating between two radii. */
export function star(ctx: Ctx, cx: number, cy: number, points: number, outer: number, inner: number, rot = -Math.PI / 2) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = rot + (i * Math.PI) / points;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/** Rounded rectangle path. */
export function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Islamic geometric patterns, built from first principles so they tile exactly. */

export type P = { x: number; y: number };

/** A regular polygon whose edges sit `apothem` from the centre; `rot` is the angle of the first vertex. */
export function regular(cx: number, cy: number, n: number, apothem: number, rot: number): P[] {
  const r = apothem / Math.cos(Math.PI / n);
  return Array.from({ length: n }, (_, i) => {
    const a = rot + (i * 2 * Math.PI) / n;
    return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
  });
}

/**
 * Hankin's "polygons in contact": from every edge midpoint two rays lean in at
 * `theta` to the edge and stop where they meet their neighbours'. Because the
 * angle is taken from the shared edge, lines run on unbroken into the next
 * tile. Returns one polyline [M1, X, M2] per vertex.
 */
export function hankin(poly: P[], theta: number): P[][] {
  const n = poly.length;
  const c = poly.reduce((s, p) => ({ x: s.x + p.x / n, y: s.y + p.y / n }), { x: 0, y: 0 });
  const out: P[][] = [];
  for (let i = 0; i < n; i++) {
    const prev = poly[(i - 1 + n) % n];
    const v = poly[i];
    const next = poly[(i + 1) % n];
    const m1 = { x: (prev.x + v.x) / 2, y: (prev.y + v.y) / 2 };
    const m2 = { x: (v.x + next.x) / 2, y: (v.y + next.y) / 2 };
    const d = norm({ x: v.x - m1.x, y: v.y - m1.y });
    const inward = norm({ x: c.x - m1.x, y: c.y - m1.y });
    const ray = { x: Math.cos(theta) * d.x + Math.sin(theta) * inward.x, y: Math.cos(theta) * d.y + Math.sin(theta) * inward.y };
    const bis = { x: v.x - c.x, y: v.y - c.y };
    const t = cross({ x: c.x - m1.x, y: c.y - m1.y }, bis) / cross(ray, bis);
    const x = { x: m1.x + ray.x * t, y: m1.y + ray.y * t };
    out.push([m1, x, m2]);
  }
  return out;
}

/** The star a Hankin pass leaves in the middle of a polygon: edge midpoints and contact points, alternating. */
export function hankinStar(poly: P[], theta: number): P[] {
  return hankin(poly, theta).flatMap(([, x, m2]) => [x, m2]);
}

function norm(p: P): P {
  const l = Math.hypot(p.x, p.y) || 1;
  return { x: p.x / l, y: p.y / l };
}

function cross(a: P, b: P) {
  return a.x * b.y - a.y * b.x;
}

/**
 * The 4.8.8 tiling: octagons on a square lattice of pitch `a` through (ox, oy),
 * squares standing on their points in between. Covers the rectangle given.
 */
export function tiling488(x0: number, y0: number, x1: number, y1: number, a: number, ox: number, oy: number) {
  const octagons: P[][] = [];
  const squares: P[][] = [];
  const side = a * (Math.SQRT2 - 1);
  const i0 = Math.floor((x0 - ox) / a) - 1;
  const i1 = Math.ceil((x1 - ox) / a) + 1;
  const j0 = Math.floor((y0 - oy) / a) - 1;
  const j1 = Math.ceil((y1 - oy) / a) + 1;
  for (let i = i0; i <= i1; i++) {
    for (let j = j0; j <= j1; j++) {
      octagons.push(regular(ox + i * a, oy + j * a, 8, a / 2, Math.PI / 8));
      squares.push(regular(ox + (i + 0.5) * a, oy + (j + 0.5) * a, 4, side / 2, 0));
    }
  }
  return { octagons, squares };
}

/** An eight-pointed star of two overlapping squares, tips at `r` on the axes and diagonals. */
export function star8(cx: number, cy: number, r: number, rot = 0): P[] {
  const inner = r * Math.cos(Math.PI / 4) / Math.cos(Math.PI / 8);
  return Array.from({ length: 16 }, (_, i) => {
    const a = rot + (i * Math.PI) / 8;
    const d = i % 2 === 0 ? r : inner;
    return { x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d };
  });
}

/**
 * The star-and-cross tiling: eight-pointed stars on a lattice of pitch `a`,
 * touching tip to tip, and pointed crosses filling the gaps between them.
 */
export function starAndCross(x0: number, y0: number, x1: number, y1: number, a: number, ox: number, oy: number) {
  const stars: { i: number; j: number; pts: P[]; c: P }[] = [];
  const crosses: { i: number; j: number; pts: P[]; c: P }[] = [];
  const v = (a / 2) * Math.SQRT1_2;
  const u = a / 2 - v;
  const arm: P[] = [
    { x: 0, y: -a / 2 },
    { x: u, y: -v },
    { x: u, y: -u },
    { x: v, y: -u },
  ];
  const i0 = Math.floor((x0 - ox) / a) - 1;
  const i1 = Math.ceil((x1 - ox) / a) + 1;
  const j0 = Math.floor((y0 - oy) / a) - 1;
  const j1 = Math.ceil((y1 - oy) / a) + 1;
  for (let i = i0; i <= i1; i++) {
    for (let j = j0; j <= j1; j++) {
      const sc = { x: ox + i * a, y: oy + j * a };
      stars.push({ i, j, c: sc, pts: star8(sc.x, sc.y, a / 2) });
      const cc = { x: sc.x + a / 2, y: sc.y + a / 2 };
      const pts: P[] = [];
      for (let k = 0; k < 4; k++) {
        const cos = Math.cos((k * Math.PI) / 2);
        const sin = Math.sin((k * Math.PI) / 2);
        for (const p of arm) pts.push({ x: cc.x + p.x * cos - p.y * sin, y: cc.y + p.x * sin + p.y * cos });
      }
      crosses.push({ i, j, c: cc, pts });
    }
  }
  return { stars, crosses };
}

export function path(ctx: CanvasRenderingContext2D, pts: P[], close = true) {
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  if (close) ctx.closePath();
}

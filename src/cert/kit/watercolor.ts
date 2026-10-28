import type { Rng } from "./rng";

/**
 * Watercolor in the manner of Tyler Hobbs: a shape is roughened by recursive
 * midpoint displacement, then filled dozens of times at a few percent opacity,
 * each fill roughened again. The overlaps build a soft, pooled edge and a
 * deeper core, which is what makes a flat polygon read as paint.
 */

export interface Pt {
  x: number;
  y: number;
  /** How much this vertex may wander; lets a petal keep a crisp base and a loose tip. */
  v: number;
}

/** Points packed as x, y, v triples: a petal's wash makes hundreds of thousands of them. */
type Packed = Float64Array;

function pack(pts: Pt[]): Packed {
  const out = new Float64Array(pts.length * 3);
  pts.forEach((p, i) => {
    out[i * 3] = p.x;
    out[i * 3 + 1] = p.y;
    out[i * 3 + 2] = p.v;
  });
  return out;
}

function roughen(src: Packed, depth: number, spread: number, rng: Rng): Packed {
  let out = src;
  for (let d = 0; d < depth; d++) {
    const n = out.length / 3;
    const next = new Float64Array(n * 6);
    for (let i = 0; i < n; i++) {
      const ai = i * 3;
      const bi = ((i + 1) % n) * 3;
      const ax = out[ai], ay = out[ai + 1], av = out[ai + 2];
      const bx = out[bi], by = out[bi + 1], bv = out[bi + 2];
      const v = (av + bv) / 2;
      const sd = Math.hypot(bx - ax, by - ay) * spread * v;
      const o = i * 6;
      next[o] = ax;
      next[o + 1] = ay;
      next[o + 2] = av;
      next[o + 3] = (ax + bx) / 2 + rng.gauss(0, sd);
      next[o + 4] = (ay + by) / 2 + rng.gauss(0, sd);
      next[o + 5] = v * rng.range(0.7, 1.15);
    }
    out = next;
  }
  return out;
}

export function deform(pts: Pt[], depth: number, spread: number, rng: Rng): Pt[] {
  const out = roughen(pack(pts), depth, spread, rng);
  return Array.from({ length: out.length / 3 }, (_, i) => ({ x: out[i * 3], y: out[i * 3 + 1], v: out[i * 3 + 2] }));
}

export function trace(ctx: CanvasRenderingContext2D, pts: readonly { x: number; y: number }[]) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
}

function tracePacked(ctx: CanvasRenderingContext2D, p: Packed) {
  ctx.beginPath();
  ctx.moveTo(p[0], p[1]);
  for (let i = 3; i < p.length; i += 3) ctx.lineTo(p[i], p[i + 1]);
  ctx.closePath();
}

export interface WashOptions {
  layers?: number;
  alpha?: number;
  /** Roughness of the base outline. */
  spread?: number;
  /** Roughness added on every layer. */
  jitter?: number;
  /** A deeper shade some layers drift toward, so a petal darkens unevenly. */
  shade?: string;
  /** Pigment pooling at the rim. */
  rim?: number;
  /** Mottle each layer through random holes, as pigment settles unevenly. */
  texture?: boolean;
}

function bounds(p: Packed) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < p.length; i += 3) {
    if (p[i] < x0) x0 = p[i];
    if (p[i + 1] < y0) y0 = p[i + 1];
    if (p[i] > x1) x1 = p[i];
    if (p[i + 1] > y1) y1 = p[i + 1];
  }
  return { x0, y0, x1, y1 };
}

export function wash(ctx: CanvasRenderingContext2D, rng: Rng, shape: Pt[], color: string, o: WashOptions = {}) {
  const layers = o.layers ?? 30;
  const alpha = o.alpha ?? 0.045;
  const base = roughen(pack(shape), 3, o.spread ?? 0.3, rng);
  const b = bounds(base);
  const size = Math.max(b.x1 - b.x0, b.y1 - b.y0);
  const texture = o.texture ?? size > 30;
  ctx.save();
  for (let i = 0; i < layers; i++) {
    const poly = roughen(base, 2, o.jitter ?? 0.32, rng);
    ctx.globalAlpha = alpha * rng.range(0.55, 1.35);
    ctx.fillStyle = o.shade && rng.chance(0.35) ? o.shade : color;
    if (texture && i % 3 !== 0) {
      ctx.save();
      ctx.beginPath();
      for (let k = 0; k < 7; k++) {
        const r = size * rng.range(0.12, 0.42);
        const cx = rng.range(b.x0, b.x1);
        const cy = rng.range(b.y0, b.y1);
        ctx.moveTo(cx + r, cy);
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
      }
      ctx.clip();
      tracePacked(ctx, poly);
      ctx.fill();
      ctx.restore();
    } else {
      tracePacked(ctx, poly);
      ctx.fill();
    }
    // The rim on every other layer at twice the strength: the same pooling for half the strokes.
    if (o.rim && i % 2 === 0) {
      ctx.globalAlpha = Math.min(1, alpha * o.rim * 2);
      ctx.strokeStyle = o.shade ?? color;
      ctx.lineWidth = Math.max(1, size * 0.02);
      tracePacked(ctx, poly);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/* ---------- shapes ---------- */

export function ellipse(cx: number, cy: number, rx: number, ry: number, rot = 0, n = 10, v = 1): Pt[] {
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  return Array.from({ length: n }, (_, i) => {
    const t = (i / n) * Math.PI * 2;
    const x = Math.cos(t) * rx;
    const y = Math.sin(t) * ry;
    return { x: cx + x * cos - y * sin, y: cy + x * sin + y * cos, v };
  });
}

/** A petal from (x, y) outward along `angle`: narrow at the base, full and rounded at the tip. */
export function petal(x: number, y: number, angle: number, length: number, width: number): Pt[] {
  const pts: Pt[] = [];
  const n = 7;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const side = (t: number) => (width / 2) * Math.pow(Math.sin(Math.PI * Math.min(1, t * 0.92 + 0.04)), 0.7) * (0.35 + 0.65 * t);
  const push = (along: number, across: number, v: number) =>
    pts.push({ x: x + along * cos - across * sin, y: y + along * sin + across * cos, v });
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    push(t * length, side(t), 0.4 + t);
  }
  for (let i = n; i >= 0; i--) {
    const t = i / n;
    push(t * length, -side(t), 0.4 + t);
  }
  return pts;
}

/** A leaf from (x, y) outward along `angle`, pointed at both ends. */
export function leaf(x: number, y: number, angle: number, length: number, width: number, bend = 0): Pt[] {
  const pts: Pt[] = [];
  const n = 8;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const push = (along: number, across: number, v: number) => {
    const curve = bend * Math.sin(Math.PI * (along / length)) * length;
    pts.push({ x: x + along * cos - (across + curve) * sin, y: y + along * sin + (across + curve) * cos, v });
  };
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    push(t * length, (width / 2) * Math.pow(Math.sin(Math.PI * t), 0.9) * (1 - 0.25 * t), 0.5);
  }
  for (let i = n - 1; i > 0; i--) {
    const t = i / n;
    push(t * length, -(width / 2) * Math.pow(Math.sin(Math.PI * t), 0.9) * (1 - 0.25 * t), 0.5);
  }
  return pts;
}

/* ---------- botanical pieces ---------- */

export interface FloralPalette {
  petals: readonly string[];
  deep: string;
  center: string;
  stamen: string;
  leaves: readonly string[];
  stem: string;
  berry: string;
  speck: string;
}

export function stroke(
  ctx: CanvasRenderingContext2D,
  rng: Rng,
  pts: readonly { x: number; y: number }[],
  color: string,
  width: number,
  alpha = 0.55,
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (let pass = 0; pass < 3; pass++) {
    ctx.globalAlpha = alpha / (pass + 1.2);
    ctx.lineWidth = width * (1 - pass * 0.25);
    ctx.beginPath();
    pts.forEach((p, i) => {
      const x = p.x + rng.gauss(0, width * 0.12);
      const y = p.y + rng.gauss(0, width * 0.12);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }
  ctx.restore();
}

/** Points along a quadratic curve. */
export function curve(x0: number, y0: number, cx: number, cy: number, x1: number, y1: number, n = 18) {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const u = 1 - t;
    return { x: u * u * x0 + 2 * u * t * cx + t * t * x1, y: u * u * y0 + 2 * u * t * cy + t * t * y1 };
  });
}

export function paintLeaf(
  ctx: CanvasRenderingContext2D,
  rng: Rng,
  x: number,
  y: number,
  angle: number,
  length: number,
  color: string,
  vein?: string,
) {
  const bend = rng.range(-0.12, 0.12);
  const width = length * rng.range(0.3, 0.42);
  const shape = leaf(x, y, angle, length, width, bend);
  wash(ctx, rng, shape, color, { layers: 22, alpha: 0.06, spread: 0.1, jitter: 0.2, rim: 0.6 });
  // One half of the leaf a shade deeper, split along the vein: the way a brush leaves it.
  const half = shape.slice(0, Math.ceil(shape.length / 2) + 1);
  wash(ctx, rng, half, vein ?? color, { layers: 10, alpha: 0.035, spread: 0.06, jitter: 0.14, texture: false });
  if (vein) {
    const pts = Array.from({ length: 9 }, (_, i) => {
      const t = (i / 8) * 0.85;
      const along = t * length;
      const across = bend * Math.sin(Math.PI * t) * length;
      return {
        x: x + along * Math.cos(angle) - across * Math.sin(angle),
        y: y + along * Math.sin(angle) + across * Math.cos(angle),
      };
    });
    stroke(ctx, rng, pts, vein, Math.max(1, length * 0.022), 0.28);
  }
}

/** A full, layered bloom: three rings of petals around a stamen crown. */
export function peony(ctx: CanvasRenderingContext2D, rng: Rng, x: number, y: number, r: number, p: FloralPalette) {
  const turn = rng.range(0, Math.PI * 2);
  const rings = [
    { count: 7, len: r, wid: r * 1.0, inset: r * 0.1, color: p.petals[0], alpha: 0.04 },
    { count: 6, len: r * 0.72, wid: r * 0.82, inset: r * 0.06, color: p.petals[1] ?? p.petals[0], alpha: 0.045 },
    { count: 5, len: r * 0.46, wid: r * 0.58, inset: 0, color: p.deep, alpha: 0.045 },
  ];
  rings.forEach((ring, k) => {
    for (let i = 0; i < ring.count; i++) {
      const a = turn + (i / ring.count) * Math.PI * 2 + k * 0.45 + rng.gauss(0, 0.14);
      const shape = petal(x + Math.cos(a) * ring.inset, y + Math.sin(a) * ring.inset, a, ring.len * rng.range(0.82, 1.08), ring.wid);
      wash(ctx, rng, shape, ring.color, { layers: 28, alpha: ring.alpha, spread: 0.16, jitter: 0.24, shade: p.deep, rim: 1.1 });
    }
  });
  wash(ctx, rng, ellipse(x, y, r * 0.16, r * 0.16, 0, 9), p.center, { layers: 20, alpha: 0.07, spread: 0.2, jitter: 0.25 });
  dots(ctx, rng, x, y, r * 0.24, Math.round(12 + r / 8), p.stamen, r * 0.026);
}

/** An open five-petal flower with a dark heart, like an anemone. */
export function anemone(ctx: CanvasRenderingContext2D, rng: Rng, x: number, y: number, r: number, p: FloralPalette, color?: string) {
  const turn = rng.range(0, Math.PI * 2);
  const petals = rng.int(5, 6);
  for (let i = 0; i < petals; i++) {
    const a = turn + (i / petals) * Math.PI * 2 + rng.gauss(0, 0.1);
    wash(ctx, rng, petal(x, y, a, r * rng.range(0.88, 1.05), r * 1.0), color ?? p.petals[2] ?? p.petals[0], {
      layers: 24,
      alpha: 0.05,
      spread: 0.14,
      jitter: 0.22,
      shade: p.deep,
      rim: 1.2,
    });
  }
  wash(ctx, rng, ellipse(x, y, r * 0.22, r * 0.22, 0, 9), p.center, { layers: 18, alpha: 0.1, spread: 0.15, jitter: 0.2 });
  dots(ctx, rng, x, y, r * 0.34, 12, p.stamen, r * 0.032);
}

export function bud(ctx: CanvasRenderingContext2D, rng: Rng, x: number, y: number, angle: number, r: number, p: FloralPalette) {
  wash(ctx, rng, ellipse(x + Math.cos(angle) * r * 0.5, y + Math.sin(angle) * r * 0.5, r * 0.75, r * 0.5, angle, 9), p.petals[1] ?? p.petals[0], {
    layers: 20,
    alpha: 0.07,
    spread: 0.12,
    jitter: 0.2,
    shade: p.deep,
    rim: 1,
  });
  paintLeaf(ctx, rng, x, y, angle - 0.6, r * 0.9, p.leaves[0]);
  paintLeaf(ctx, rng, x, y, angle + 0.6, r * 0.9, p.leaves[0]);
}

/** A pale round berry flecked with color, as in pressed-flower paintings. */
export function berry(ctx: CanvasRenderingContext2D, rng: Rng, x: number, y: number, r: number, p: FloralPalette) {
  wash(ctx, rng, ellipse(x, y, r, r, 0, 9), p.berry, { layers: 14, alpha: 0.09, spread: 0.08, jitter: 0.12, rim: 1.4, shade: p.petals[0] });
  ctx.save();
  ctx.fillStyle = p.speck;
  for (let i = 0; i < Math.round(r * 0.9); i++) {
    const a = rng.range(0, Math.PI * 2);
    const d = Math.sqrt(rng.next()) * r * 0.8;
    ctx.globalAlpha = rng.range(0.35, 0.75);
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, rng.range(0.9, 1.6) * Math.max(1, r / 14), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function dots(ctx: CanvasRenderingContext2D, rng: Rng, x: number, y: number, radius: number, count: number, color: string, size: number) {
  ctx.save();
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + rng.gauss(0, 0.15);
    const d = radius * rng.range(0.55, 1);
    ctx.globalAlpha = rng.range(0.5, 0.9);
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, size * rng.range(0.7, 1.3), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * A stem from (x, y) heading along `angle`, leaves alternating along it and a
 * finish at the tip (a flower, a bud or a cluster of berries).
 */
export function sprig(
  ctx: CanvasRenderingContext2D,
  rng: Rng,
  x: number,
  y: number,
  angle: number,
  length: number,
  p: FloralPalette,
  tip: "bud" | "berries" | "flower" | "leaf" | "none" = "leaf",
) {
  const bend = rng.range(-0.25, 0.25);
  const ex = x + Math.cos(angle) * length;
  const ey = y + Math.sin(angle) * length;
  const cx = (x + ex) / 2 - Math.sin(angle) * length * bend;
  const cy = (y + ey) / 2 + Math.cos(angle) * length * bend;
  const pts = curve(x, y, cx, cy, ex, ey);
  stroke(ctx, rng, pts, p.stem, Math.max(1.4, length * 0.012), 0.55);

  const leafSize = length * 0.26;
  for (let i = 3; i < pts.length - 2; i += 3) {
    const a = pts[i];
    const b = pts[i + 1];
    const dir = Math.atan2(b.y - a.y, b.x - a.x);
    const side = i % 2 === 0 ? 1 : -1;
    paintLeaf(ctx, rng, a.x, a.y, dir + side * rng.range(0.55, 0.9), leafSize * rng.range(0.75, 1.1), rng.pick(p.leaves), p.stem);
  }
  const end = pts[pts.length - 1];
  const dir = Math.atan2(end.y - pts[pts.length - 3].y, end.x - pts[pts.length - 3].x);
  if (tip === "leaf") paintLeaf(ctx, rng, end.x, end.y, dir, leafSize * 1.1, rng.pick(p.leaves), p.stem);
  if (tip === "bud") bud(ctx, rng, end.x, end.y, dir, length * 0.1, p);
  if (tip === "flower") anemone(ctx, rng, end.x, end.y, length * 0.14, p);
  if (tip === "berries") {
    for (let i = 0; i < 4; i++) {
      const a = dir + rng.range(-1.2, 1.2);
      const d = length * rng.range(0.03, 0.12);
      berry(ctx, rng, end.x + Math.cos(a) * d, end.y + Math.sin(a) * d, length * rng.range(0.035, 0.055), p);
    }
  }
}

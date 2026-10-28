import { cubic } from "./ornament";
import type { Rng } from "./rng";

type Ctx = CanvasRenderingContext2D;
export type P = { x: number; y: number };

/** Canvas shadows ignore the transform, so they are given here in sheet units and scaled to the device. */
export function shade(ctx: Ctx, color: string, blur: number, dx = 0, dy = 0) {
  const m = ctx.getTransform();
  const s = Math.hypot(m.a, m.b);
  ctx.shadowColor = color;
  ctx.shadowBlur = blur * s;
  ctx.shadowOffsetX = dx * s;
  ctx.shadowOffsetY = dy * s;
}

/** A hex colour moved toward another by t, as an rgb() string. */
export function mix(a: string, b: string, t: number): string {
  const ch = (c: string, i: number) => parseInt(c.slice(1 + i * 2, 3 + i * 2), 16);
  const v = [0, 1, 2].map((i) => Math.round(ch(a, i) + (ch(b, i) - ch(a, i)) * t));
  return `rgb(${v[0]},${v[1]},${v[2]})`;
}

export function trace(ctx: Ctx, pts: readonly P[], close = true) {
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  if (close) ctx.closePath();
}

/* ---------- arches ---------- */

export interface Arch {
  cx: number;
  /** Half the span. */
  half: number;
  /** Where the sides stop rising straight and the curve begins. */
  spring: number;
  /** The tip. */
  apex: number;
  /** Where the sides end: the sill. */
  foot: number;
}

/**
 * The left half of a keel arch, spring to tip: a full shoulder, a long
 * slope, and a short reverse curve that lifts the tip into a point.
 */
function leftHalf(a: Arch, n: number): P[] {
  const rise = a.spring - a.apex;
  const s = { x: a.cx - a.half, y: a.spring };
  const q = { x: a.cx - a.half * 0.34, y: a.apex + rise * 0.3 };
  const tl = Math.hypot(1, 0.62);
  const t = { x: 1 / tl, y: -0.62 / tl };
  const tip = { x: a.cx, y: a.apex };
  const shoulder = cubic(s, { x: s.x, y: a.spring - rise * 0.52 }, { x: q.x - t.x * a.half * 0.34, y: q.y - t.y * a.half * 0.34 }, q, n);
  const keel = cubic(q, { x: q.x + t.x * a.half * 0.16, y: q.y + t.y * a.half * 0.16 }, { x: a.cx - a.half * 0.035, y: a.apex + rise * 0.13 }, tip, Math.ceil(n / 2));
  return [...shoulder, ...keel.slice(1)];
}

/** The opening, from the left foot round over the tip to the right foot. */
export function archOutline(a: Arch, n = 56): P[] {
  const left = leftHalf(a, n);
  const right = left
    .slice(0, -1)
    .reverse()
    .map((p) => ({ x: 2 * a.cx - p.x, y: p.y }));
  return [{ x: a.cx - a.half, y: a.foot }, ...left, ...right, { x: a.cx + a.half, y: a.foot }];
}

/** Half the opening's width as a function of height, for fitting text and ornament inside it. */
export function archProfile(a: Arch): (y: number) => number {
  const left = leftHalf(a, 56);
  return (y) => {
    if (y >= a.spring) return y <= a.foot ? a.half : 0;
    if (y <= a.apex) return 0;
    for (let i = 1; i < left.length; i++) {
      const p = left[i - 1];
      const q = left[i];
      if ((p.y - y) * (q.y - y) <= 0 && p.y !== q.y) return a.cx - (p.x + ((q.x - p.x) * (y - p.y)) / (q.y - p.y));
    }
    return 0;
  };
}

/**
 * One cell of the ogee trellis: a lantern shape whose four edges are
 * S-curves, so cells on a half-drop grid share their edges exactly.
 */
export function lanternCell(ctx: Ctx, x: number, y: number, halfW: number, halfH: number) {
  const k = 0.55;
  ctx.moveTo(x - halfW, y);
  ctx.bezierCurveTo(x - halfW, y - halfH * k, x, y - halfH * (1 - k), x, y - halfH);
  ctx.bezierCurveTo(x, y - halfH * (1 - k), x + halfW, y - halfH * k, x + halfW, y);
  ctx.bezierCurveTo(x + halfW, y + halfH * k, x, y + halfH * (1 - k), x, y + halfH);
  ctx.bezierCurveTo(x, y + halfH * (1 - k), x - halfW, y + halfH * k, x - halfW, y);
  ctx.closePath();
}

/** Centres of the trellis cells covering a rectangle, columns symmetric about cx. */
export function trellisCentres(x0: number, y0: number, x1: number, y1: number, cx: number, halfW: number, halfH: number): P[] {
  const out: P[] = [];
  const i0 = Math.floor((x0 - cx) / halfW) - 1;
  const i1 = Math.ceil((x1 - cx) / halfW) + 1;
  const j0 = Math.floor(y0 / (2 * halfH)) - 1;
  const j1 = Math.ceil(y1 / (2 * halfH)) + 1;
  for (let i = i0; i <= i1; i++) {
    for (let j = j0; j <= j1; j++) out.push({ x: cx + i * halfW, y: j * 2 * halfH + (Math.abs(i) % 2) * halfH });
  }
  return out;
}

/* ---------- marble and Art Deco ---------- */

/**
 * A marble vein: a line that holds a general heading but wanders, slowly
 * in long swings and sharply in small kinks, the way cracks run through stone.
 */
export function veinPath(rng: Rng, x: number, y: number, heading: number, length: number, step = 5, kinks = 0.12): P[] {
  const pts: P[] = [{ x, y }];
  const p1 = rng.range(0, Math.PI * 2);
  const p2 = rng.range(0, Math.PI * 2);
  const f1 = rng.range(0.003, 0.007);
  const f2 = rng.range(0.012, 0.024);
  let kink = 0;
  for (let t = step; t <= length; t += step) {
    kink = kink * 0.7 + rng.gauss(0, kinks);
    const a = heading + Math.sin(t * f1 + p1) * 0.5 + Math.sin(t * f2 + p2) * 0.16 + kink;
    x += Math.cos(a) * step;
    y += Math.sin(a) * step;
    pts.push({ x, y });
  }
  return pts;
}

/** Fills a line of varying width: `width(t)` gives the full width at t from 0 to 1 along it. */
export function ribbon(ctx: Ctx, pts: readonly P[], width: (t: number) => number) {
  const n = pts.length;
  const left: P[] = [];
  const right: P[] = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(n - 1, i + 1)];
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    const half = width(i / (n - 1)) / 2;
    left.push({ x: pts[i].x - Math.sin(ang) * half, y: pts[i].y + Math.cos(ang) * half });
    right.push({ x: pts[i].x + Math.sin(ang) * half, y: pts[i].y - Math.cos(ang) * half });
  }
  ctx.beginPath();
  trace(ctx, [...left, ...right.reverse()]);
  ctx.fill();
}

/**
 * An Art Deco fan centred on (cx, cy), opening between angles a0 and a1:
 * pleats that widen outward, long and short in turn, inside a double arc,
 * round a ringed hub.
 */
export function fan(
  ctx: Ctx,
  cx: number,
  cy: number,
  r: number,
  a0: number,
  a1: number,
  o: { pleats: number; hub: number; gold: string | CanvasGradient; ground: string },
) {
  const sector = (r0: number, r1: number, b0: number, b1: number) => {
    ctx.beginPath();
    ctx.arc(cx, cy, r1, b0, b1);
    ctx.arc(cx, cy, r0, b1, b0, true);
    ctx.closePath();
  };
  ctx.save();
  ctx.fillStyle = o.gold;
  ctx.strokeStyle = o.gold;
  const step = (a1 - a0) / o.pleats;
  const inner = o.hub * 1.55;
  for (let i = 0; i < o.pleats; i++) {
    const mid = a0 + step * (i + 0.5);
    const long = i % 2 === 0;
    const out = long ? r * 0.86 : r * 0.7;
    // A pleat: a hairline at the hub opening to a wedge at its outer end.
    const spread = step * (long ? 0.17 : 0.08);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(mid - spread * 0.12) * inner, cy + Math.sin(mid - spread * 0.12) * inner);
    ctx.lineTo(cx + Math.cos(mid - spread) * out, cy + Math.sin(mid - spread) * out);
    ctx.arc(cx, cy, out, mid - spread, mid + spread);
    ctx.lineTo(cx + Math.cos(mid + spread * 0.12) * inner, cy + Math.sin(mid + spread * 0.12) * inner);
    ctx.closePath();
    ctx.fill();
  }
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.93, a0, a1);
  ctx.stroke();
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.arc(cx, cy, r, a0, a1);
  ctx.stroke();
  // The hub: a solid disc inside a thin ring.
  sector(o.hub * 1.22, o.hub * 1.32, a0, a1);
  ctx.fill();
  sector(0, o.hub, a0, a1);
  ctx.fill();
  ctx.fillStyle = o.ground;
  sector(o.hub * 0.55, o.hub * 0.7, a0, a1);
  ctx.fill();
  ctx.restore();
}

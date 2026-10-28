import type { Rng } from "./rng";
import { glow, softStar } from "./sky";

/**
 * Toy-like space pieces for a children's sheet: planets with flat, cel-style
 * shading, a ring that passes behind and in front of its planet, a rocket with a
 * layered flame, and stars with rounded points that glow on a dark sky.
 */

type Ctx = CanvasRenderingContext2D;
type P = { x: number; y: number };

export interface PlanetStyle {
  /** Lit side, body and shadow side of the sphere. */
  light: string;
  body: string;
  dark: string;
  /** Stripes across the face: centre (-1 to 1 of the radius), half-width, colour. */
  bands?: readonly (readonly [number, number, string])[];
  /** Craters are drawn in this colour when given. */
  crater?: string;
  /** Where the craters sit, as x, y and radius in fractions of the planet's radius; scattered when absent. */
  spots?: readonly (readonly [number, number, number])[];
  /** Turns the stripes. */
  tilt?: number;
  /** The toy-like shine; off for a planet so large its lit side is out of frame. */
  gloss?: boolean;
}

export function planet(ctx: Ctx, rng: Rng, x: number, y: number, r: number, s: PlanetStyle) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();

  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.05, x, y, r * 1.05);
  g.addColorStop(0, s.light);
  g.addColorStop(0.55, s.body);
  g.addColorStop(1, s.dark);
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);

  if (s.bands) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(s.tilt ?? 0);
    for (const [c, hw, color] of s.bands) {
      const y0 = (c - hw) * r;
      const y1 = (c + hw) * r;
      // Bowed like lines of latitude seen a little from above.
      const bow = r * 0.14;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(-r * 1.1, y0);
      ctx.quadraticCurveTo(0, y0 + bow * 2, r * 1.1, y0);
      ctx.lineTo(r * 1.1, y1);
      ctx.quadraticCurveTo(0, y1 + bow * 2, -r * 1.1, y1);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  if (s.crater) {
    const spots =
      s.spots ??
      Array.from({ length: Math.max(3, Math.round(r / 22)) }, () => {
        const a = rng.range(0, Math.PI * 2);
        const d = Math.sqrt(rng.next()) * 0.72;
        return [Math.cos(a) * d, Math.sin(a) * d, rng.range(0.08, 0.17)] as const;
      });
    for (const [sx, sy, sr] of spots) {
      const cr = r * sr;
      const cx = x + sx * r;
      const cy = y + sy * r;
      ctx.fillStyle = s.crater;
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.ellipse(cx, cy, cr, cr * 0.85, 0, 0, Math.PI * 2);
      ctx.fill();
      // A lit lip on the far side of each crater.
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = s.light;
      ctx.lineWidth = Math.max(1, cr * 0.18);
      ctx.beginPath();
      ctx.ellipse(cx, cy, cr, cr * 0.85, 0, 0.1 * Math.PI, 0.9 * Math.PI);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  // Cel shadow: everything outside a disc nudged toward the light.
  ctx.fillStyle = s.dark;
  ctx.globalAlpha = 0.42;
  ctx.beginPath();
  ctx.arc(x, y, r * 1.02, 0, Math.PI * 2);
  ctx.arc(x - r * 0.24, y - r * 0.3, r * 1.04, 0, Math.PI * 2, true);
  ctx.fill();

  // A thin crescent of light on the lit edge lifts the planet off the dark sky; it tapers at both ends.
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = s.light;
  ctx.beginPath();
  ctx.arc(x, y, r * 1.02, 0, Math.PI * 2);
  ctx.arc(x + r * 0.035, y + r * 0.045, r, 0, Math.PI * 2, true);
  ctx.fill();

  if (s.gloss !== false) {
    // A glossy highlight, as on a toy.
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.ellipse(x - r * 0.42, y - r * 0.46, r * 0.2, r * 0.11, -0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.arc(x - r * 0.2, y - r * 0.62, r * 0.045, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Half of a planet's ring. Draw the back half, then the planet, then the front.
 * `r` is the planet's radius; the ring is tipped by `tilt` and flattened by `open`.
 */
export function ring(ctx: Ctx, x: number, y: number, r: number, tilt: number, open: number, colors: readonly [string, string, string], part: "back" | "front") {
  const [inner, outer, stripe] = colors;
  const a0 = part === "back" ? Math.PI : 0;
  const a1 = part === "back" ? Math.PI * 2 : Math.PI;
  const band = (ri: number, ro: number) => {
    ctx.beginPath();
    ctx.ellipse(0, 0, ro, ro * open, 0, a0, a1);
    ctx.ellipse(0, 0, ri, ri * open, 0, a1, a0, true);
    ctx.closePath();
  };
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  const g = ctx.createLinearGradient(-r * 2, 0, r * 2, 0);
  g.addColorStop(0, outer);
  g.addColorStop(0.5, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  band(r * 1.3, r * 1.95);
  ctx.fill();
  ctx.fillStyle = stripe;
  ctx.globalAlpha = 0.85;
  band(r * 1.55, r * 1.63);
  ctx.fill();
  if (part === "back") {
    // The far side sits in the planet's shade.
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = stripe;
    band(r * 1.3, r * 1.95);
    ctx.fill();
  }
  ctx.restore();
}

export interface RocketStyle {
  body: string;
  shade: string;
  trim: string;
  trimDark: string;
  glass: string;
}

/** A teardrop pointing along +y from the origin, `len` long. */
function drop(ctx: Ctx, wid: number, len: number) {
  ctx.beginPath();
  ctx.moveTo(-wid, 0);
  ctx.bezierCurveTo(-wid, len * 0.45, -wid * 0.25, len * 0.8, 0, len);
  ctx.bezierCurveTo(wid * 0.25, len * 0.8, wid, len * 0.45, wid, 0);
  ctx.quadraticCurveTo(0, -wid * 0.6, -wid, 0);
  ctx.closePath();
}

/** A rocket `s` long, nose at angle `angle` (0 is straight up), centred on (x, y), with its flame. */
export function rocket(ctx: Ctx, x: number, y: number, s: number, angle: number, c: RocketStyle) {
  const half = s / 2;
  const bw = s * 0.21;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // Flame: three tongues, hottest inside.
  glow(ctx, 0, half + s * 0.18, s * 0.55, "rgba(255,170,80,0.85)", 0.7);
  ctx.save();
  ctx.translate(0, half - s * 0.02);
  ctx.fillStyle = "#ff6b4a";
  drop(ctx, bw * 0.78, s * 0.62);
  ctx.fill();
  ctx.fillStyle = "#ffb340";
  drop(ctx, bw * 0.55, s * 0.46);
  ctx.fill();
  ctx.fillStyle = "#fff4c4";
  drop(ctx, bw * 0.3, s * 0.28);
  ctx.fill();
  ctx.restore();

  // Side fins, swept back.
  ctx.fillStyle = c.trim;
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sx * bw * 0.8, half * 0.05);
    ctx.bezierCurveTo(sx * bw * 1.9, half * 0.35, sx * bw * 2.0, half * 0.75, sx * bw * 1.85, half * 1.02);
    ctx.quadraticCurveTo(sx * bw * 1.4, half * 0.8, sx * bw * 0.75, half * 0.78);
    ctx.closePath();
    ctx.fill();
  }

  // Nozzle.
  ctx.fillStyle = "#5b5f86";
  ctx.beginPath();
  ctx.moveTo(-bw * 0.5, half * 0.86);
  ctx.lineTo(bw * 0.5, half * 0.86);
  ctx.lineTo(bw * 0.62, half * 1.04);
  ctx.lineTo(-bw * 0.62, half * 1.04);
  ctx.closePath();
  ctx.fill();

  // The body: an ogive, rounder at the shoulders.
  const body = () => {
    ctx.beginPath();
    ctx.moveTo(0, -half);
    ctx.bezierCurveTo(bw * 0.95, -half * 0.72, bw * 1.15, -half * 0.1, bw * 0.92, half * 0.9);
    ctx.lineTo(-bw * 0.92, half * 0.9);
    ctx.bezierCurveTo(-bw * 1.15, -half * 0.1, -bw * 0.95, -half * 0.72, 0, -half);
    ctx.closePath();
  };
  const g = ctx.createLinearGradient(-bw, 0, bw, 0);
  g.addColorStop(0, c.body);
  g.addColorStop(0.45, c.body);
  g.addColorStop(1, c.shade);
  body();
  ctx.fillStyle = g;
  ctx.fill();

  ctx.save();
  body();
  ctx.clip();
  // Nose cone and a band near the tail, in the trim colour with its own shade.
  const t = ctx.createLinearGradient(-bw, 0, bw, 0);
  t.addColorStop(0, c.trim);
  t.addColorStop(0.5, c.trim);
  t.addColorStop(1, c.trimDark);
  ctx.fillStyle = t;
  ctx.beginPath();
  ctx.moveTo(-bw * 2, -half * 0.5);
  ctx.quadraticCurveTo(0, -half * 0.42, bw * 2, -half * 0.5);
  ctx.lineTo(bw * 2, -half * 1.2);
  ctx.lineTo(-bw * 2, -half * 1.2);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-bw * 2, half * 0.56);
  ctx.quadraticCurveTo(0, half * 0.64, bw * 2, half * 0.56);
  ctx.lineTo(bw * 2, half * 0.7);
  ctx.quadraticCurveTo(0, half * 0.78, -bw * 2, half * 0.7);
  ctx.closePath();
  ctx.fill();
  // A long highlight down the lit side.
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.ellipse(-bw * 0.48, -half * 0.05, bw * 0.12, half * 0.55, 0.06, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // The porthole: a trim ring around blue glass with a glint.
  const wy = -half * 0.12;
  const wr = bw * 0.52;
  ctx.fillStyle = "#ffd84d";
  ctx.beginPath();
  ctx.arc(0, wy, wr * 1.28, 0, Math.PI * 2);
  ctx.fill();
  const gl = ctx.createLinearGradient(0, wy - wr, 0, wy + wr);
  gl.addColorStop(0, "#a8ecff");
  gl.addColorStop(1, c.glass);
  ctx.fillStyle = gl;
  ctx.beginPath();
  ctx.arc(0, wy, wr, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.beginPath();
  ctx.ellipse(-wr * 0.32, wy - wr * 0.34, wr * 0.32, wr * 0.18, -0.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/** A star with rounded points, glowing on a dark sky, with a soft highlight. */
export function glowStar(ctx: Ctx, x: number, y: number, r: number, color: string, rot = 0) {
  glow(ctx, x, y, r * 2.6, color, 0.32);
  ctx.save();
  ctx.fillStyle = color;
  softStar(ctx, x, y, r, rot);
  ctx.fill();
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = "#ffffff";
  softStar(ctx, x - r * 0.12, y - r * 0.14, r * 0.42, rot);
  ctx.fill();
  ctx.restore();
}

/** Points along a cubic Bezier. */
export function bezier(p0: P, p1: P, p2: P, p3: P, n = 40): P[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const u = 1 - t;
    return {
      x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
      y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
    };
  });
}

/** Evenly spaced dots along a path, shrinking and fading from its start. */
export function dottedTrail(ctx: Ctx, pts: P[], gap: number, size: number, color: string) {
  const lens = [0];
  for (let i = 1; i < pts.length; i++) lens.push(lens[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  const total = lens[lens.length - 1];
  ctx.save();
  ctx.fillStyle = color;
  let j = 0;
  for (let d = 0; d <= total; d += gap) {
    while (j < lens.length - 2 && lens[j + 1] < d) j++;
    const f = (d - lens[j]) / (lens[j + 1] - lens[j] || 1);
    const x = pts[j].x + (pts[j + 1].x - pts[j].x) * f;
    const y = pts[j].y + (pts[j + 1].y - pts[j].y) * f;
    const t = d / total;
    ctx.globalAlpha = 0.85 * (1 - t * 0.75);
    ctx.beginPath();
    ctx.arc(x, y, size * (1 - t * 0.55), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Stars joined by fine lines, as in a picture book's sky map. */
export function constellation(ctx: Ctx, pts: readonly P[], edges: readonly (readonly [number, number])[], color: string, star: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.globalAlpha = 0.5;
  ctx.setLineDash([2, 9]);
  ctx.beginPath();
  for (const [a, b] of edges) {
    ctx.moveTo(pts[a].x, pts[a].y);
    ctx.lineTo(pts[b].x, pts[b].y);
  }
  ctx.stroke();
  ctx.restore();
  pts.forEach((p, i) => glowStar(ctx, p.x, p.y, i % 3 === 0 ? 11 : 8, star, i * 0.4));
}

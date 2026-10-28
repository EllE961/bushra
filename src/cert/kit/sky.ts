import type { Rng } from "./rng";

type Ctx = CanvasRenderingContext2D;

/* ---------- night ---------- */

export function glow(ctx: Ctx, x: number, y: number, r: number, color: string, alpha = 1) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = "screen";
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.restore();
}

/** A four-point sparkle with a soft halo. */
export function sparkle(ctx: Ctx, x: number, y: number, r: number, color: string, alpha = 1) {
  glow(ctx, x, y, r * 2.2, color, 0.35 * alpha);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 - Math.PI / 2;
    const b = a + Math.PI / 4;
    const tip = { x: x + Math.cos(a) * r, y: y + Math.sin(a) * r };
    const waist = { x: x + Math.cos(b) * r * 0.14, y: y + Math.sin(b) * r * 0.14 };
    if (i === 0) ctx.moveTo(tip.x, tip.y);
    else ctx.lineTo(tip.x, tip.y);
    ctx.quadraticCurveTo(x + Math.cos(b) * r * 0.08, y + Math.sin(b) * r * 0.08, waist.x, waist.y);
    const next = a + Math.PI / 2;
    ctx.quadraticCurveTo(x + Math.cos(b) * r * 0.08, y + Math.sin(b) * r * 0.08, x + Math.cos(next) * r, y + Math.sin(next) * r);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Stars thinning toward the bottom, kept sparse inside `hole` so the text stays calm. */
export function starfield(
  ctx: Ctx,
  rng: Rng,
  w: number,
  h: number,
  count: number,
  hole?: { x: number; y: number; w: number; h: number },
) {
  const tints = ["#ffffff", "#dfe8ff", "#fff1cf"];
  ctx.save();
  for (let i = 0; i < count; i++) {
    const x = rng.range(0, w);
    const y = Math.pow(rng.next(), 1.6) * h;
    const inHole = hole && x > hole.x && x < hole.x + hole.w && y > hole.y && y < hole.y + hole.h;
    if (inHole && rng.chance(0.8)) continue;
    const big = rng.chance(0.08);
    ctx.globalAlpha = rng.range(0.25, big ? 1 : 0.75) * (inHole ? 0.5 : 1);
    ctx.fillStyle = rng.pick(tints);
    ctx.beginPath();
    ctx.arc(x, y, big ? rng.range(1.8, 2.6) : rng.range(0.6, 1.5), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** True when the arc from `s` to `e` drawn clockwise passes through `m`. */
function clockwiseHolds(s: number, e: number, m: number) {
  const tau = Math.PI * 2;
  const norm = (a: number) => ((a % tau) + tau) % tau;
  return norm(m - s) < norm(e - s);
}

/**
 * A crescent: the moon's disc with a second disc bitten out of it, built as one
 * path so it needs no scratch canvas. `tilt` turns the opening.
 */
export function crescent(ctx: Ctx, x: number, y: number, r: number, tilt: number, bite = 0.82, offset = 0.42) {
  const d = r * offset * 1.0;
  const cx2 = x + Math.cos(tilt) * d;
  const cy2 = y + Math.sin(tilt) * d;
  const r2 = r * bite;
  const a = (r * r - r2 * r2 + d * d) / (2 * d);
  const hh = Math.sqrt(Math.max(0, r * r - a * a));
  const ux = Math.cos(tilt);
  const uy = Math.sin(tilt);
  const px = x + a * ux;
  const py = y + a * uy;
  const i1 = { x: px - hh * uy, y: py + hh * ux };
  const i2 = { x: px + hh * uy, y: py - hh * ux };
  const o1 = Math.atan2(i1.y - y, i1.x - x);
  const o2 = Math.atan2(i2.y - y, i2.x - x);
  const away = tilt + Math.PI;
  const n1 = Math.atan2(i1.y - cy2, i1.x - cx2);
  const n2 = Math.atan2(i2.y - cy2, i2.x - cx2);
  ctx.beginPath();
  ctx.moveTo(i1.x, i1.y);
  ctx.arc(x, y, r, o1, o2, !clockwiseHolds(o1, o2, away));
  ctx.arc(cx2, cy2, r2, n2, n1, !clockwiseHolds(n2, n1, away));
  ctx.closePath();
}

function metal(ctx: Ctx, x: number, s: number) {
  const g = ctx.createLinearGradient(x - s / 2, 0, x + s / 2, 0);
  g.addColorStop(0, "#7c5418");
  g.addColorStop(0.28, "#f2d283");
  g.addColorStop(0.5, "#b8842f");
  g.addColorStop(0.72, "#f7e2a4");
  g.addColorStop(1, "#7c5418");
  return g;
}

/**
 * A hanging fanous: a chain from (x, top), a domed cap, a faceted glass body
 * lit from inside, and a drop finial. `s` is the body width.
 */
export function lantern(ctx: Ctx, x: number, top: number, chain: number, s: number) {
  const Y = top + chain;
  const Bt = Y + 0.56 * s;
  const Bb = Bt + 1.12 * s;
  const mid = Bt + 0.56 * s;

  glow(ctx, x, mid, s * 2.1, "rgba(255,186,92,0.55)", 0.9);
  glow(ctx, x, mid, s * 0.9, "rgba(255,214,140,0.5)", 0.8);

  ctx.save();
  // Chain: a hairline with small links.
  ctx.strokeStyle = "#c99a4a";
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = Math.max(1.2, s * 0.018);
  ctx.beginPath();
  ctx.moveTo(x, top);
  ctx.lineTo(x, Y);
  ctx.stroke();
  for (let cy = top + 10; cy < Y - 4; cy += Math.max(10, s * 0.14)) {
    ctx.beginPath();
    ctx.ellipse(x, cy, s * 0.022, s * 0.05, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  const gold = metal(ctx, x, s * 0.7);
  ctx.fillStyle = gold;
  ctx.strokeStyle = gold;

  // Ring and spire.
  ctx.lineWidth = s * 0.028;
  ctx.beginPath();
  ctx.arc(x, Y + 0.06 * s, 0.06 * s, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, Y + 0.12 * s);
  ctx.quadraticCurveTo(x + 0.07 * s, Y + 0.26 * s, x + 0.035 * s, Y + 0.31 * s);
  ctx.lineTo(x - 0.035 * s, Y + 0.31 * s);
  ctx.quadraticCurveTo(x - 0.07 * s, Y + 0.26 * s, x, Y + 0.12 * s);
  ctx.fill();

  // Dome cap and collar.
  ctx.beginPath();
  ctx.moveTo(x - 0.27 * s, Y + 0.5 * s);
  ctx.bezierCurveTo(x - 0.27 * s, Y + 0.36 * s, x - 0.12 * s, Y + 0.3 * s, x, Y + 0.3 * s);
  ctx.bezierCurveTo(x + 0.12 * s, Y + 0.3 * s, x + 0.27 * s, Y + 0.36 * s, x + 0.27 * s, Y + 0.5 * s);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(x - 0.33 * s, Y + 0.49 * s, 0.66 * s, 0.07 * s);

  // The glass body, lit from within.
  const half = [
    [0.29, Bt],
    [0.47, Bt + 0.24 * s],
    [0.47, Bt + 0.84 * s],
    [0.29, Bb],
  ] as const;
  const outline = () => {
    ctx.beginPath();
    half.forEach(([hx, hy], i) => (i === 0 ? ctx.moveTo(x - hx * s, hy) : ctx.lineTo(x - hx * s, hy)));
    for (let i = half.length - 1; i >= 0; i--) ctx.lineTo(x + half[i][0] * s, half[i][1]);
    ctx.closePath();
  };
  const light = ctx.createRadialGradient(x, mid, 0, x, mid, s * 0.62);
  light.addColorStop(0, "#fff8dc");
  light.addColorStop(0.35, "#ffdb84");
  light.addColorStop(0.75, "#f0a043");
  light.addColorStop(1, "#b5601f");
  outline();
  ctx.fillStyle = light;
  ctx.fill();

  // Lattice: facet edges, bands, and pointed arches in the middle tier.
  ctx.strokeStyle = gold;
  ctx.lineJoin = "round";
  ctx.lineWidth = s * 0.03;
  outline();
  ctx.stroke();
  ctx.lineWidth = s * 0.018;
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(x + sx * 0.12 * s, Bt);
    ctx.lineTo(x + sx * 0.2 * s, Bt + 0.24 * s);
    ctx.lineTo(x + sx * 0.2 * s, Bt + 0.84 * s);
    ctx.lineTo(x + sx * 0.12 * s, Bb);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(x - 0.47 * s, Bt + 0.24 * s);
  ctx.lineTo(x + 0.47 * s, Bt + 0.24 * s);
  ctx.moveTo(x - 0.47 * s, Bt + 0.84 * s);
  ctx.lineTo(x + 0.47 * s, Bt + 0.84 * s);
  ctx.stroke();
  ctx.lineWidth = s * 0.012;
  for (const [cx, hw] of [
    [-0.335, 0.09],
    [0, 0.13],
    [0.335, 0.09],
  ] as const) {
    const ax = x + cx * s;
    const top = Bt + 0.34 * s;
    const bot = Bt + 0.76 * s;
    ctx.beginPath();
    ctx.moveTo(ax - hw * s, bot);
    ctx.lineTo(ax - hw * s, top + 0.1 * s);
    ctx.quadraticCurveTo(ax - hw * s, top + 0.02 * s, ax, top - 0.04 * s);
    ctx.quadraticCurveTo(ax + hw * s, top + 0.02 * s, ax + hw * s, top + 0.1 * s);
    ctx.lineTo(ax + hw * s, bot);
    ctx.stroke();
  }

  // Base collar, bowl and drop.
  ctx.fillStyle = gold;
  ctx.fillRect(x - 0.33 * s, Bb - 0.01 * s, 0.66 * s, 0.07 * s);
  ctx.beginPath();
  ctx.moveTo(x - 0.24 * s, Bb + 0.06 * s);
  ctx.bezierCurveTo(x - 0.22 * s, Bb + 0.2 * s, x - 0.08 * s, Bb + 0.24 * s, x, Bb + 0.25 * s);
  ctx.bezierCurveTo(x + 0.08 * s, Bb + 0.24 * s, x + 0.22 * s, Bb + 0.2 * s, x + 0.24 * s, Bb + 0.06 * s);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x, Bb + 0.24 * s);
  ctx.quadraticCurveTo(x + 0.06 * s, Bb + 0.36 * s, x, Bb + 0.46 * s);
  ctx.quadraticCurveTo(x - 0.06 * s, Bb + 0.36 * s, x, Bb + 0.24 * s);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, Bb + 0.5 * s, 0.035 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** One mosque: a drum and onion dome with a crescent finial, optional minarets either side. */
function mosque(ctx: Ctx, x: number, base: number, s: number, minarets: boolean) {
  const domeW = s;
  const drumH = s * 0.32;
  const top = base - s * 0.5 - drumH;
  ctx.rect(x - s * 0.95, base - s * 0.5, s * 1.9, s * 0.5);
  ctx.rect(x - domeW * 0.52, top + s * 0.02, domeW * 1.04, drumH);
  ctx.moveTo(x - domeW * 0.5, top + s * 0.04);
  ctx.bezierCurveTo(x - domeW * 0.62, top - s * 0.32, x - domeW * 0.12, top - s * 0.52, x, top - s * 0.74);
  ctx.bezierCurveTo(x + domeW * 0.12, top - s * 0.52, x + domeW * 0.62, top - s * 0.32, x + domeW * 0.5, top + s * 0.04);
  ctx.closePath();
  ctx.rect(x - s * 0.012, top - s * 0.9, s * 0.024, s * 0.18);
  ctx.moveTo(x + s * 0.045, top - s * 0.94);
  ctx.arc(x, top - s * 0.94, s * 0.045, 0, Math.PI * 2);
  if (minarets) {
    for (const sx of [-1, 1]) {
      const mx = x + sx * s * 1.25;
      const mw = s * 0.11;
      const mh = s * 1.75;
      ctx.rect(mx - mw / 2, base - mh, mw, mh);
      ctx.rect(mx - mw * 0.85, base - mh * 0.72, mw * 1.7, s * 0.05);
      ctx.rect(mx - mw * 0.75, base - mh - s * 0.04, mw * 1.5, s * 0.05);
      ctx.moveTo(mx - mw * 0.55, base - mh - s * 0.04);
      ctx.lineTo(mx, base - mh - s * 0.42);
      ctx.lineTo(mx + mw * 0.55, base - mh - s * 0.04);
      ctx.closePath();
    }
  }
}

/** A low skyline of domes and minarets along the foot of the sheet. */
export function skyline(ctx: Ctx, w: number, h: number, color: string) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.rect(0, h - 26, w, 26);
  mosque(ctx, w * 0.115, h - 20, 118, true);
  mosque(ctx, w * 0.885, h - 20, 118, true);
  mosque(ctx, w * 0.27, h - 20, 62, false);
  mosque(ctx, w * 0.73, h - 20, 62, false);
  for (const [fx, fs] of [
    [0.36, 38],
    [0.64, 38],
    [0.205, 46],
    [0.795, 46],
  ] as const) {
    mosque(ctx, w * fx, h - 20, fs, false);
  }
  ctx.fill();
  ctx.restore();
}

/* ---------- daylight ---------- */

/** A five-point star with rounded tips. */
export function softStar(ctx: Ctx, x: number, y: number, r: number, rot = 0) {
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 === 0 ? r : r * 0.5;
    const a = rot - Math.PI / 2 + (i * Math.PI) / 5;
    pts.push({ x: x + Math.cos(a) * rr, y: y + Math.sin(a) * rr });
  }
  const round = r * 0.18;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const p = pts[i];
    const prev = pts[(i + 9) % 10];
    const next = pts[(i + 1) % 10];
    const d1 = Math.hypot(p.x - prev.x, p.y - prev.y);
    const d2 = Math.hypot(next.x - p.x, next.y - p.y);
    const a = { x: p.x + ((prev.x - p.x) * round) / d1, y: p.y + ((prev.y - p.y) * round) / d1 };
    const b = { x: p.x + ((next.x - p.x) * round) / d2, y: p.y + ((next.y - p.y) * round) / d2 };
    if (i === 0) ctx.moveTo(a.x, a.y);
    else ctx.lineTo(a.x, a.y);
    ctx.quadraticCurveTo(p.x, p.y, b.x, b.y);
  }
  ctx.closePath();
}

/**
 * A bank of cloud puffs along the foot of the sheet: tall at the corners,
 * low through the middle so a footer line can sit on it. Adds to the current path.
 */
export function cloudBank(ctx: Ctx, rng: Rng, w: number, h: number, corner: number, middle: number, lift = 0) {
  const step = 105;
  for (let x = -60; x <= w + 60; x += step * rng.range(0.8, 1.1)) {
    const edge = Math.pow(Math.abs(x / w - 0.5) * 2, 2.2);
    const r = (middle + (corner - middle) * edge) * rng.range(0.85, 1.15);
    const cy = h + 20 - lift - edge * corner * 0.55;
    ctx.moveTo(x + r, cy);
    ctx.arc(x, cy, r, 0, Math.PI * 2);
  }
  ctx.rect(-10, h - middle * 0.4 - lift, w + 20, middle * 0.4 + lift + 10);
}

/**
 * A bunting garland hanging from (x0, y0) to (x1, y1) with `sag`. Flags hang
 * plumb from the string and rock a little with its slope.
 */
export function bunting(
  ctx: Ctx,
  rng: Rng,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  sag: number,
  colors: readonly string[],
  flag: number,
  string: string,
) {
  const at = (t: number) => {
    const u = 1 - t;
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2 + sag * 2;
    return { x: u * u * x0 + 2 * u * t * cx + t * t * x1, y: u * u * y0 + 2 * u * t * cy + t * t * y1 };
  };
  ctx.save();
  ctx.strokeStyle = string;
  ctx.lineWidth = 2.4;
  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  for (let i = 0; i <= 60; i++) {
    const p = at(i / 60);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;

  const len = Math.hypot(x1 - x0, y1 - y0);
  const count = Math.floor(len / (flag * 1.25));
  const offset = rng.int(0, colors.length - 1);
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    const p = at(t - 0.5 / count + 0.08 / count);
    const q = at(t + 0.5 / count - 0.08 / count);
    const slope = Math.atan2(q.y - p.y, q.x - p.x);
    const mx = (p.x + q.x) / 2;
    const my = (p.y + q.y) / 2;
    const half = flag * 0.46;
    const drop = flag * 1.05;
    ctx.save();
    ctx.translate(mx, my);
    ctx.rotate(slope * 0.85);
    ctx.shadowColor = "rgba(60,70,120,0.18)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 5;
    ctx.fillStyle = colors[(i + offset) % colors.length];
    const r = flag * 0.08;
    ctx.beginPath();
    ctx.moveTo(-half, 0);
    ctx.lineTo(half, 0);
    ctx.lineTo(r * 0.6, drop - r);
    ctx.quadraticCurveTo(0, drop + r * 0.4, -r * 0.6, drop - r);
    ctx.closePath();
    ctx.fill();
    ctx.shadowColor = "transparent";
    // A stitched hem a little inside the edge.
    ctx.strokeStyle = "rgba(255,255,255,0.65)";
    ctx.lineWidth = 1.8;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(-half * 0.72, flag * 0.1);
    ctx.lineTo(0, drop * 0.78);
    ctx.lineTo(half * 0.72, flag * 0.1);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }
  // Little knots where the flags meet the string.
  ctx.fillStyle = string;
  for (let i = 0; i <= count; i++) {
    const p = at(i / count);
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

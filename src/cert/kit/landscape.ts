import { surface } from "../canvas";
import { cubic } from "./ornament";
import { Rng } from "./rng";

type Ctx = CanvasRenderingContext2D;
export type P = { x: number; y: number };

/* ---------- shared ---------- */

const tiles = new Map<number, HTMLCanvasElement | OffscreenCanvas>();

function grainTile(seed: number, size = 160) {
  const hit = tiles.get(seed);
  if (hit) return hit;
  const { canvas, ctx } = surface(size, size);
  const img = ctx.createImageData(size, size);
  const rng = new Rng(seed);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = rng.next();
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v > 0.5 ? 255 : 0;
    img.data[i + 3] = Math.abs(v - 0.5) * 2 * 255;
  }
  ctx.putImageData(img, 0, 0);
  tiles.set(seed, canvas);
  return canvas;
}

/** Fine grain over the whole sheet, so flat gradients read as print rather than screen. */
export function grain(ctx: Ctx, w: number, h: number, strength: number, seed = 5) {
  const pattern = ctx.createPattern(grainTile(seed), "repeat");
  if (!pattern) return;
  ctx.save();
  ctx.globalAlpha = strength;
  ctx.globalCompositeOperation = "overlay";
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

export function vertical(ctx: Ctx, y0: number, y1: number, stops: readonly (readonly [number, string])[]) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  for (const [t, c] of stops) g.addColorStop(t, c);
  return g;
}

/** A soft round light. Drawn normally, not screened, so it can warm a pale sky without blowing it out. */
export function bloom(ctx: Ctx, x: number, y: number, r: number, color: string, alpha = 1, inner = 0) {
  const g = ctx.createRadialGradient(x, y, r * inner, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.restore();
}

function polygon(ctx: Ctx, pts: readonly P[]) {
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
}

/* ---------- dunes ---------- */

export interface Ridge {
  pts: P[];
  /** Index into `pts` of every crest. */
  crests: number[];
  /** Index into `pts` of every trough. */
  troughs: number[];
}

/**
 * A dune line through `knots`, left to right. Troughs come out round; crests
 * come to a soft point, `sharp` of the way from a dome (0) to a knife edge (1).
 */
export function ridge(knots: readonly P[], sharp = 0.5, steps = 26): Ridge {
  const n = knots.length;
  const kind = knots.map((k, i) => {
    const a = knots[i - 1];
    const b = knots[i + 1];
    if (a && b && k.y < a.y && k.y < b.y) return "crest";
    if (a && b && k.y > a.y && k.y > b.y) return "trough";
    return "slope";
  });
  // The handle leaving knot i toward neighbour j.
  const handle = (i: number, j: number): P => {
    const k = knots[i];
    const o = knots[j];
    const dx = o.x - k.x;
    if (kind[i] === "crest") return { x: k.x + dx * 0.36, y: k.y + (o.y - k.y) * sharp * 0.55 };
    if (kind[i] === "trough" || !knots[i - 1] || !knots[i + 1]) return { x: k.x + dx * 0.42, y: k.y };
    const a = knots[i - 1];
    const b = knots[i + 1];
    const slope = (b.y - a.y) / (b.x - a.x);
    return { x: k.x + dx * 0.38, y: k.y + slope * dx * 0.38 };
  };
  const pts: P[] = [];
  const crests: number[] = [];
  const troughs: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    if (kind[i] === "crest") crests.push(pts.length);
    if (kind[i] === "trough") troughs.push(pts.length);
    const seg = cubic(knots[i], handle(i, i + 1), handle(i + 1, i), knots[i + 1], steps);
    pts.push(...(i === 0 ? seg : seg.slice(1)).slice(0, -1));
  }
  pts.push(knots[n - 1]);
  return { pts, crests, troughs };
}

/** Height of the ridge line at x. */
export function heightAt(r: Ridge, x: number) {
  const p = r.pts;
  for (let i = 1; i < p.length; i++) {
    if (p[i].x >= x) {
      const t = (x - p[i - 1].x) / (p[i].x - p[i - 1].x || 1);
      return p[i - 1].y + (p[i].y - p[i - 1].y) * t;
    }
  }
  return p[p.length - 1].y;
}

export interface DuneTone {
  /** The sunlit face: at the crest, and where the gradient ends. */
  lit: readonly [string, string];
  /** The slip face: at the crest line, midway, and at the hollow (usually transparent, so the fold melts). */
  shade: readonly [string, string, string];
  /** How far below the highest crest the gradients run. */
  depth: number;
  /** Light caught along the crest line. */
  crest?: string;
  crestAlpha?: number;
}

function outline(ctx: Ctx, r: Ridge, bottom: number) {
  ctx.beginPath();
  polygon(ctx, [...r.pts, { x: r.pts[r.pts.length - 1].x, y: bottom }, { x: r.pts[0].x, y: bottom }]);
}

/**
 * One dune ridge, lit from `sunX`: each crest has a lit face toward the sun and
 * a slip face away from it, split by a crest line that sweeps down toward the viewer.
 */
export function dune(ctx: Ctx, r: Ridge, bottom: number, sunX: number, tone: DuneTone) {
  const top = Math.min(...r.pts.map((p) => p.y));
  ctx.save();
  outline(ctx, r, bottom);
  ctx.fillStyle = vertical(ctx, top, top + tone.depth, [
    [0, tone.lit[0]],
    [1, tone.lit[1]],
  ]);
  ctx.fill();
  ctx.clip();

  // Slip faces: from each crest a crest line falls toward the viewer and sweeps
  // to the lee side; the face between it and the next hollow is in shadow.
  for (const ci of r.crests) {
    const c = r.pts[ci];
    const dir = c.x >= sunX ? 1 : -1;
    const face: P[] = [c];
    let i = ci + dir;
    while (i > 0 && i < r.pts.length - 1 && !r.troughs.includes(i)) {
      face.push(r.pts[i]);
      i += dir;
    }
    const t = r.pts[i];
    face.push(t);
    const span = Math.abs(t.x - c.x);
    const drop = Math.min(bottom - c.y, tone.depth * 1.6);
    const tDrop = Math.max(drop - (t.y - c.y), 30);
    // The hollow's edge, a soft fold running down from the trough.
    face.push(
      ...cubic(t, { x: t.x, y: t.y + tDrop * 0.4 }, { x: t.x + dir * span * 0.08, y: t.y + tDrop * 0.75 }, { x: t.x + dir * span * 0.3, y: t.y + tDrop }, 14).slice(1),
    );
    face.push({ x: t.x + dir * span * 0.3, y: bottom + 20 }, { x: c.x + dir * span * 0.5, y: bottom + 20 });
    const foot = { x: c.x + dir * span * 0.5, y: c.y + drop };
    face.push(...cubic(foot, { x: c.x + dir * span * 0.16, y: c.y + drop * 0.66 }, { x: c.x + dir * span * 0.03, y: c.y + drop * 0.28 }, c, 18).slice(0, -1));
    const g = ctx.createLinearGradient(c.x, 0, c.x + dir * span, 0);
    g.addColorStop(0, tone.shade[0]);
    g.addColorStop(0.5, tone.shade[1]);
    g.addColorStop(1, tone.shade[2]);
    ctx.fillStyle = g;
    ctx.beginPath();
    polygon(ctx, face);
    ctx.fill();
  }

  // Light along the crest: a soft band inside the silhouette, brightest at the edge.
  if (tone.crest) {
    ctx.strokeStyle = tone.crest;
    ctx.lineJoin = "round";
    for (const [width, a] of [
      [26, 0.12],
      [12, 0.18],
      [4, 0.35],
    ] as const) {
      ctx.globalAlpha = a * (tone.crestAlpha ?? 1);
      ctx.lineWidth = width;
      ctx.beginPath();
      r.pts.forEach((p, k) => (k === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.stroke();
    }
  }
  ctx.restore();
}

/**
 * Wind ripples: fine contour lines that follow the ridge down its face, closer
 * together near the crest and wider apart toward the viewer, fading at both ends.
 */
export function ripples(ctx: Ctx, rng: Rng, r: Ridge, bottom: number, x0: number, x1: number, rows: number, color: string, alpha: number) {
  ctx.save();
  outline(ctx, r, bottom);
  ctx.clip();
  ctx.lineCap = "round";
  for (let j = 0; j < rows; j++) {
    const d = 16 + j * 13 + j * j * 1.6;
    const len = rng.range(0.25, 0.55) * (x1 - x0);
    const a = rng.range(x0, x1 - len);
    const b = a + len;
    const phase = rng.range(0, Math.PI * 2);
    const g = ctx.createLinearGradient(a, 0, b, 0);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(0.5, color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.strokeStyle = g;
    ctx.globalAlpha = alpha * rng.range(0.6, 1);
    ctx.lineWidth = 1 + j * 0.12;
    ctx.beginPath();
    for (let x = a; x <= b; x += 10) {
      const y = heightAt(r, x) + d + Math.sin(x * 0.012 + phase) * (3 + j * 0.6);
      if (x === a) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/* ---------- desert pieces ---------- */

/**
 * A date palm in silhouette, rooted at (x, y). The trunk bends by `lean`
 * (a fraction of the height); the crown is feathered fronds with leaflets,
 * the oldest hanging low, and date bunches under the crown.
 */
export function palm(ctx: Ctx, rng: Rng, x: number, y: number, height: number, lean: number, color: string) {
  const H = height;
  const top = { x: x + lean * H, y: y - H };
  const mid = { x: x + lean * H * 0.15, y: y - H * 0.55 };
  const at = (t: number): P => {
    const u = 1 - t;
    return { x: u * u * x + 2 * u * t * mid.x + t * t * top.x, y: u * u * y + 2 * u * t * mid.y + t * t * top.y };
  };
  ctx.save();
  ctx.fillStyle = color;

  // Trunk: tapering, with the stubs of old leaf bases scalloping both edges.
  const n = Math.max(24, Math.round(H / 7));
  const left: P[] = [];
  const right: P[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = at(Math.max(0, t - 0.01));
    const b = at(Math.min(1, t + 0.01));
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    const p = at(t);
    const flare = 1 + Math.pow(1 - t, 10) * 0.7;
    const stub = i % 2 === 0 ? 1.12 : 0.97;
    const half = H * (0.028 - 0.007 * t) * flare * stub;
    const nx = -Math.sin(ang) * half;
    const ny = Math.cos(ang) * half;
    left.push({ x: p.x + nx, y: p.y + ny });
    right.push({ x: p.x - nx, y: p.y - ny });
  }
  ctx.beginPath();
  polygon(ctx, [...left, { x: top.x, y: top.y - H * 0.02 }, ...right.reverse()]);
  ctx.fill();

  // Fronds, as one path of tapered leaflets so the crown fills in a single pass.
  const crown = { x: top.x, y: top.y + H * 0.01 };
  const fronds: [number, number, number][] = [
    // angle (0 is right, -90 up), length, droop
    [-86, 0.25, 0.08],
    [-98, 0.24, 0.08],
    [-68, 0.3, 0.2],
    [-114, 0.3, 0.2],
    [-48, 0.35, 0.32],
    [-134, 0.34, 0.32],
    [-26, 0.37, 0.44],
    [-156, 0.37, 0.44],
    [-6, 0.36, 0.56],
    [-176, 0.35, 0.56],
    [16, 0.31, 0.64],
    [164, 0.3, 0.64],
    [44, 0.24, 0.6],
    [136, 0.23, 0.6],
    [74, 0.17, 0.4],
    [106, 0.16, 0.4],
  ];
  ctx.beginPath();
  for (const [deg, lf, droop] of fronds) {
    const th = ((deg + rng.range(-6, 6)) * Math.PI) / 180;
    const L = H * lf * rng.range(0.9, 1.08);
    const dr = droop * rng.range(0.85, 1.15);
    const ux = Math.cos(th);
    const uy = Math.sin(th);
    const f = (t: number): P => ({ x: crown.x + ux * L * t, y: crown.y + uy * L * t + dr * L * t * t });
    const df = (t: number) => {
      const dx = ux * L;
      const dy = uy * L + 2 * dr * L * t;
      const l = Math.hypot(dx, dy);
      return { x: dx / l, y: dy / l };
    };
    // The rachis, a thin taper.
    const spine: P[] = [];
    const back: P[] = [];
    for (let i = 0; i <= 16; i++) {
      const t = i / 16;
      const p = f(t);
      const d = df(t);
      const half = H * 0.006 * (1 - t) + 0.4;
      spine.push({ x: p.x - d.y * half, y: p.y + d.x * half });
      back.push({ x: p.x + d.y * half, y: p.y - d.x * half });
    }
    polygon(ctx, [...spine, ...back.reverse()]);
    // Stiff leaflets on both sides, raked toward the tip and pulled down a little.
    const count = Math.round(14 + lf * 36);
    for (let i = 2; i <= count; i++) {
      const t = i / count;
      const p = f(t);
      const d = df(t);
      const len = L * 0.15 * Math.pow(Math.sin(Math.PI * Math.min(0.97, 0.2 + t * 0.8)), 0.6) * rng.range(0.85, 1.12);
      const bw = Math.max(0.7, H * 0.0042 * (1 - t * 0.5));
      for (const s of [-1, 1]) {
        const rake = 0.7 + rng.range(-0.1, 0.1);
        let lx = d.x * Math.cos(rake) - s * d.y * Math.sin(rake);
        let ly = s * d.x * Math.sin(rake) + d.y * Math.cos(rake);
        ly += 0.25;
        const l = Math.hypot(lx, ly);
        lx /= l;
        ly /= l;
        const tip = { x: p.x + lx * len, y: p.y + ly * len };
        ctx.moveTo(p.x - ly * bw, p.y + lx * bw);
        ctx.quadraticCurveTo(p.x + lx * len * 0.5 - ly * bw * 0.8, p.y + ly * len * 0.5 + lx * bw * 0.8 - len * 0.04, tip.x, tip.y);
        ctx.lineTo(p.x + ly * bw, p.y - lx * bw);
        ctx.closePath();
      }
    }
  }
  ctx.fill();

  // Date bunches hanging under the crown.
  for (const sx of [-1, 1]) {
    const bx = crown.x + sx * H * 0.035;
    const by = crown.y + H * 0.03;
    for (let k = 0; k < 14; k++) {
      const t = k / 13;
      const px = bx + sx * H * 0.012 * t + rng.range(-1, 1) * H * 0.012 * (1 - t * 0.5);
      const py = by + t * H * 0.075;
      const r = H * rng.range(0.006, 0.009) * (1 - t * 0.3);
      ctx.moveTo(px + r, py);
      ctx.arc(px, py, r, 0, Math.PI * 2);
    }
  }
  ctx.fill();
  ctx.restore();
}

/**
 * An Omani watchtower on a rise: a round burj that narrows as it climbs,
 * a parapet of pointed merlons, and a low crenellated wall running off to one side.
 * `s` is the tower's width at its foot; (x, y) the middle of its foot.
 */
export function watchtower(ctx: Ctx, x: number, y: number, s: number, color: string, side: 1 | -1 = -1) {
  const H = s * 1.7;
  const top = y - H;
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  // The burj: a battered drum, a little bowed, wider at the foot.
  ctx.moveTo(x - s * 0.5, y + s * 0.3);
  ctx.quadraticCurveTo(x - s * 0.44, y - H * 0.5, x - s * 0.34, top);
  ctx.lineTo(x + s * 0.34, top);
  ctx.quadraticCurveTo(x + s * 0.44, y - H * 0.5, x + s * 0.5, y + s * 0.3);
  ctx.closePath();
  // A parapet that steps out over the drum, then a crown of pointed merlons.
  ctx.moveTo(x - s * 0.34, top + s * 0.02);
  ctx.lineTo(x - s * 0.4, top - s * 0.1);
  ctx.lineTo(x + s * 0.4, top - s * 0.1);
  ctx.lineTo(x + s * 0.34, top + s * 0.02);
  ctx.closePath();
  const m = 5;
  const w0 = s * 0.8;
  for (let i = 0; i < m; i++) {
    const cx = x - w0 / 2 + (w0 * (i + 0.5)) / m;
    const hw = w0 / m / 2 - s * 0.02;
    ctx.moveTo(cx - hw, top - s * 0.09);
    ctx.lineTo(cx - hw, top - s * 0.17);
    ctx.lineTo(cx, top - s * 0.3);
    ctx.lineTo(cx + hw, top - s * 0.17);
    ctx.lineTo(cx + hw, top - s * 0.09);
    ctx.closePath();
  }
  // A curtain wall running off to one side, its merlons smaller, ending in a squat square tower.
  const wh = s * 0.6;
  const wx0 = x + side * s * 0.35;
  const wx1 = x + side * s * 2.2;
  ctx.rect(Math.min(wx0, wx1), y - wh, Math.abs(wx1 - wx0), wh + s * 0.4);
  const step = s * 0.22;
  for (let k = 0; k < 8; k++) {
    const cx = x + side * (s * 0.55 + k * step);
    ctx.moveTo(cx - step * 0.3, y - wh + 1);
    ctx.lineTo(cx - step * 0.3, y - wh - s * 0.07);
    ctx.lineTo(cx, y - wh - s * 0.16);
    ctx.lineTo(cx + step * 0.3, y - wh - s * 0.07);
    ctx.lineTo(cx + step * 0.3, y - wh + 1);
    ctx.closePath();
  }
  const tx = x + side * s * 2.4;
  ctx.moveTo(tx - s * 0.34, y + s * 0.4);
  ctx.lineTo(tx - s * 0.3, y - s * 0.95);
  ctx.lineTo(tx + s * 0.3, y - s * 0.95);
  ctx.lineTo(tx + s * 0.34, y + s * 0.4);
  ctx.closePath();
  for (const dx of [-0.2, 0, 0.2]) {
    ctx.moveTo(tx + (dx - 0.085) * s, y - s * 0.95 + 1);
    ctx.lineTo(tx + (dx - 0.085) * s, y - s * 1.03);
    ctx.lineTo(tx + dx * s, y - s * 1.14);
    ctx.lineTo(tx + (dx + 0.085) * s, y - s * 1.03);
    ctx.lineTo(tx + (dx + 0.085) * s, y - s * 0.95 + 1);
    ctx.closePath();
  }
  ctx.fill();
  // Arrow slits, picked out in the sky's tone.
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = "#fff3dc";
  ctx.fillRect(x - s * 0.04, top + s * 0.25, s * 0.08, s * 0.22);
  ctx.fillRect(x - s * 0.18, top + s * 0.75, s * 0.06, s * 0.16);
  ctx.fillRect(x + s * 0.12, top + s * 0.75, s * 0.06, s * 0.16);
  ctx.restore();
}

/**
 * A bird in flight, far off: two tapered wings that lift from the body and
 * fall to the tips. `flap` from -1 (down stroke) to 1 (wings raised).
 */
export function bird(ctx: Ctx, x: number, y: number, span: number, flap: number, color: string, tilt = 0) {
  const s = span / 2;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  ctx.fillStyle = color;
  ctx.beginPath();
  for (const d of [-1, 1]) {
    const lift = s * (0.28 + 0.25 * flap);
    const tipY = -s * 0.05 * flap + s * 0.12;
    // Upper edge: out to the wrist, then down to the tip; lower edge back, a touch fuller near the body.
    ctx.moveTo(0, s * 0.04);
    ctx.bezierCurveTo(d * s * 0.22, -lift * 0.9, d * s * 0.5, -lift, d * s, tipY);
    ctx.bezierCurveTo(d * s * 0.52, -lift * 0.62, d * s * 0.24, -lift * 0.42, 0, s * 0.12);
    ctx.closePath();
  }
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, s * 0.07, s * 0.05, s * 0.07, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/* ---------- coast pieces ---------- */

/**
 * A mountain line through `peaks` ([x, y] pairs), roughened by midpoint
 * displacement so the slopes break into crags. Displacement shrinks where the
 * line runs low over `base`, so a gap left open in the range stays open.
 */
export function crags(rng: Rng, peaks: readonly (readonly [number, number])[], rough: number, depth = 6, base = Infinity): P[] {
  let pts: P[] = peaks.map(([x, y]) => ({ x, y }));
  for (let d = 0; d < depth; d++) {
    const next: P[] = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1];
      const b = pts[i];
      const len = b.x - a.x;
      const my = (a.y + b.y) / 2;
      const room = Math.min(1, Math.max(0, (base - my) / 80));
      const y = my + rng.gauss(0, len * rough * room);
      next.push({ x: (a.x + b.x) / 2 + rng.gauss(0, len * 0.06), y: Math.min(y, base - 2) }, b);
    }
    pts = next;
    rough *= 0.62;
  }
  return pts;
}

export interface DhowColors {
  hull: string;
  trim: string;
  sail: string;
  shade: string;
  rigging: string;
  flag?: string;
}

/**
 * A dhow under a lateen sail, bow to the right, floating at (x, y). `s` is the
 * hull length. A long raked prow, a high square stern, and a yard that sweeps
 * from the stem up past the stern, the sail a full triangle under it.
 */
export function dhow(ctx: Ctx, x: number, y: number, s: number, c: DhowColors) {
  ctx.save();
  ctx.translate(x, y);
  const q = (px: number, py: number): [number, number] => [px * s, py * s];
  const line = Math.max(1, s * 0.006);

  // Sail: the luff along the yard, the leech and foot bellied by the wind.
  const tack = q(0.4, -0.16);
  const peak = q(-0.44, -1.0);
  const clew = q(-0.24, -0.17);
  ctx.beginPath();
  ctx.moveTo(...tack);
  ctx.quadraticCurveTo(...q(0.0, -0.6), ...peak);
  ctx.quadraticCurveTo(...q(-0.22, -0.56), ...clew);
  ctx.quadraticCurveTo(...q(0.1, -0.24), ...tack);
  ctx.closePath();
  const g = ctx.createLinearGradient(peak[0], 0, tack[0], 0);
  g.addColorStop(0, c.shade);
  g.addColorStop(0.55, c.sail);
  g.addColorStop(1, c.sail);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  // Cloths sewn up the sail, fanning from the foot.
  ctx.strokeStyle = c.shade;
  ctx.lineWidth = line * 0.8;
  ctx.globalAlpha = 0.7;
  for (const t of [0.16, 0.32, 0.48, 0.64, 0.8]) {
    const a = { x: peak[0] + (tack[0] - peak[0]) * t, y: peak[1] + (tack[1] - peak[1]) * t };
    const b = { x: clew[0] + (tack[0] - clew[0]) * t, y: clew[1] + (tack[1] - clew[1]) * t };
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y + s * 0.02);
    ctx.stroke();
  }
  ctx.restore();

  // Mast, raked forward, and the long yard.
  ctx.strokeStyle = c.rigging;
  ctx.lineCap = "round";
  ctx.lineWidth = line * 1.8;
  ctx.beginPath();
  ctx.moveTo(...q(0.06, -0.1));
  ctx.lineTo(...q(0.15, -0.66));
  ctx.stroke();
  ctx.lineWidth = line * 1.5;
  ctx.beginPath();
  ctx.moveTo(...q(0.47, -0.13));
  ctx.quadraticCurveTo(...q(0.0, -0.62), ...q(-0.5, -1.04));
  ctx.stroke();
  // Halyard and sheet, hairlines.
  ctx.lineWidth = line * 0.6;
  ctx.globalAlpha = 0.8;
  ctx.beginPath();
  ctx.moveTo(...q(0.15, -0.64));
  ctx.lineTo(...q(0.36, -0.18));
  ctx.moveTo(...clew);
  ctx.lineTo(...q(-0.34, -0.17));
  ctx.stroke();
  ctx.globalAlpha = 1;

  if (c.flag) {
    ctx.fillStyle = c.flag;
    ctx.beginPath();
    ctx.moveTo(...q(-0.5, -1.04));
    ctx.quadraticCurveTo(...q(-0.56, -1.06), ...q(-0.63, -1.02));
    ctx.lineTo(...q(-0.5, -1.0));
    ctx.closePath();
    ctx.fill();
  }

  // Hull.
  ctx.fillStyle = c.hull;
  ctx.beginPath();
  ctx.moveTo(...q(-0.36, 0));
  ctx.lineTo(...q(0.3, 0));
  ctx.quadraticCurveTo(...q(0.46, -0.03), ...q(0.62, -0.2));
  ctx.lineTo(...q(0.6, -0.215));
  ctx.quadraticCurveTo(...q(0.3, -0.085), ...q(0.0, -0.085));
  ctx.quadraticCurveTo(...q(-0.28, -0.085), ...q(-0.36, -0.13));
  ctx.lineTo(...q(-0.4, -0.2));
  ctx.lineTo(...q(-0.46, -0.2));
  ctx.quadraticCurveTo(...q(-0.45, -0.07), ...q(-0.36, 0));
  ctx.closePath();
  ctx.fill();
  // A pale strake along the sheer, and the stern's rail.
  ctx.strokeStyle = c.trim;
  ctx.lineWidth = line * 1.3;
  ctx.beginPath();
  ctx.moveTo(...q(0.55, -0.165));
  ctx.quadraticCurveTo(...q(0.3, -0.06), ...q(0.0, -0.06));
  ctx.quadraticCurveTo(...q(-0.28, -0.06), ...q(-0.43, -0.13));
  ctx.stroke();
  ctx.lineWidth = line;
  ctx.beginPath();
  ctx.moveTo(...q(-0.36, -0.13));
  ctx.lineTo(...q(-0.36, -0.2));
  ctx.moveTo(...q(-0.46, -0.205));
  ctx.lineTo(...q(-0.34, -0.205));
  ctx.stroke();
  ctx.restore();
}

/** A gull gliding: long wings bent at the wrist. */
export function gull(ctx: Ctx, x: number, y: number, span: number, color: string, tilt = 0, lift = 0.5) {
  const s = span / 2;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  ctx.fillStyle = color;
  ctx.beginPath();
  for (const d of [-1, 1]) {
    const wy = -s * (0.18 + 0.2 * lift);
    ctx.moveTo(0, 0);
    // Inner wing up to the wrist, outer wing sweeping back and down to the tip.
    ctx.bezierCurveTo(d * s * 0.12, wy * 0.9, d * s * 0.3, wy * 1.15, d * s * 0.46, wy);
    ctx.bezierCurveTo(d * s * 0.66, wy * 0.7, d * s * 0.86, wy * 0.15, d * s, s * 0.14);
    ctx.bezierCurveTo(d * s * 0.8, wy * 0.1 + s * 0.06, d * s * 0.6, wy * 0.5 + s * 0.05, d * s * 0.44, wy + s * 0.08);
    ctx.bezierCurveTo(d * s * 0.3, wy * 0.9 + s * 0.08, d * s * 0.12, wy * 0.5 + s * 0.1, 0, s * 0.1);
    ctx.closePath();
  }
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, s * 0.05, s * 0.07, s * 0.05, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

import { spiral, star } from "./ornament";

type Ctx = CanvasRenderingContext2D;
type P = { x: number; y: number };

/** Gold leaf: a diagonal gradient with a bright band, so long rules shimmer rather than sit flat. */
export function foil(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, tone: "warm" | "pale" = "warm") {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  const stops =
    tone === "warm"
      ? ["#8a6420", "#c99a3e", "#f1d68c", "#b88a35", "#e3c06e", "#7d5719"]
      : ["#9a7631", "#d6b064", "#f6e3a8", "#c49b4a", "#ecd08a", "#8f6a28"];
  stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
  return g;
}

/** An eight-pointed star of two squares, the khatam. */
export function khatam(ctx: Ctx, cx: number, cy: number, r: number, rot = 0) {
  star(ctx, cx, cy, 8, r, r * 0.7654, rot - Math.PI / 2);
}

export function teardrop(ctx: Ctx, x: number, y: number, angle: number, len: number, wid: number) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const t = (u: number, v: number): [number, number] => [x + u * c - v * s, y + u * s + v * c];
  ctx.moveTo(...t(0, 0));
  ctx.bezierCurveTo(...t(len * 0.3, -wid), ...t(len * 0.95, -wid * 0.75), ...t(len, 0));
  ctx.bezierCurveTo(...t(len * 0.95, wid * 0.75), ...t(len * 0.3, wid), ...t(0, 0));
}

function line(ctx: Ctx, pts: P[]) {
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();
}

/**
 * A gold arabesque vine along a band, drawn in local coordinates: it runs
 * along +x from 0 to `len`, centred on y = 0, and `band` is the band's depth.
 * Each crest throws a curling tendril into the hollow beside it and a leaf
 * the other way, the way illuminators fill a mushaf border.
 */
export function vine(ctx: Ctx, len: number, band: number, gold: string | CanvasGradient, accent: string) {
  const n = Math.max(2, Math.round(len / 118));
  const period = len / n;
  const amp = band * 0.2;
  const y = (u: number) => amp * Math.sin((2 * Math.PI * u) / period);
  ctx.save();
  ctx.strokeStyle = gold;
  ctx.fillStyle = gold;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = 2.8;
  const pts: P[] = [];
  for (let i = 0; i <= n * 40; i++) {
    const u = (i / (n * 40)) * len;
    pts.push({ x: u, y: y(u) });
  }
  line(ctx, pts);

  for (let k = 0; k < n * 2; k++) {
    const u = period / 4 + (k * period) / 2;
    const s = k % 2 === 0 ? 1 : -1;
    // The tendril leaves just past the crest and rolls into the hollow above it.
    const cx = u + period * 0.13;
    const cy = s * amp - s * band * 0.27;
    const curl = spiral(cx, cy, band * 0.15, 1.05, s > 0 ? Math.PI / 2 : -Math.PI / 2, s > 0 ? -1 : 1, 0.25);
    ctx.lineWidth = 1.9;
    line(ctx, [{ x: u + period * 0.02, y: y(u + period * 0.02) }, ...curl]);
    // A split leaf hanging the other way from the crest.
    ctx.beginPath();
    teardrop(ctx, u - period * 0.04, s * amp, s > 0 ? Math.PI * 0.82 : -Math.PI * 0.82, band * 0.4, band * 0.1);
    ctx.fill();
    // A seed between the waves.
    ctx.save();
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(u + period / 4, -s * amp * 0.9, 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

/** A round medallion: gold ring, petals, an eight-pointed star and a red heart. */
export function medallion(ctx: Ctx, cx: number, cy: number, r: number, gold: string | CanvasGradient, field: string, heart: string) {
  ctx.save();
  ctx.fillStyle = gold;
  // Scalloped rim: small circles around the edge.
  const lobes = 16;
  for (let i = 0; i < lobes; i++) {
    const a = (i / lobes) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * r * 0.92, cy + Math.sin(a) * r * 0.92, r * 0.16, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.94, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = field;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = gold;
  khatam(ctx, cx, cy, r * 0.66, Math.PI / 8);
  ctx.fill();
  ctx.fillStyle = field;
  khatam(ctx, cx, cy, r * 0.42, Math.PI / 8);
  ctx.fill();
  ctx.fillStyle = gold;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.26, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = heart;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * The outline of a surah-header cartouche: a long panel whose ends draw out
 * into ogee points, centred on (cx, cy).
 */
export function cartouche(ctx: Ctx, cx: number, cy: number, halfW: number, halfH: number, point: number) {
  const x0 = cx - halfW;
  const x1 = cx + halfW;
  ctx.beginPath();
  ctx.moveTo(x0 - point, cy);
  ctx.bezierCurveTo(x0 - point * 0.35, cy - halfH * 0.15, x0 - point * 0.1, cy - halfH, x0 + point * 0.25, cy - halfH);
  ctx.lineTo(x1 - point * 0.25, cy - halfH);
  ctx.bezierCurveTo(x1 + point * 0.1, cy - halfH, x1 + point * 0.35, cy - halfH * 0.15, x1 + point, cy);
  ctx.bezierCurveTo(x1 + point * 0.35, cy + halfH * 0.15, x1 + point * 0.1, cy + halfH, x1 - point * 0.25, cy + halfH);
  ctx.lineTo(x0 + point * 0.25, cy + halfH);
  ctx.bezierCurveTo(x0 - point * 0.1, cy + halfH, x0 - point * 0.35, cy + halfH * 0.15, x0 - point, cy);
  ctx.closePath();
}

/** A small rosette between two tapered rules, like the marker that closes an ayah. */
export function rosetteRule(ctx: Ctx, cx: number, cy: number, width: number, gold: string | CanvasGradient, heart: string) {
  ctx.save();
  ctx.fillStyle = gold;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + s * 26, cy - 1.6);
    ctx.lineTo(cx + s * (width / 2), cy);
    ctx.lineTo(cx + s * 26, cy + 1.6);
    ctx.closePath();
    ctx.fill();
    for (const [d, r] of [
      [width / 2 + 12, 2.6],
      [width / 2 + 24, 1.8],
    ]) {
      ctx.beginPath();
      ctx.arc(cx + s * d, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    teardrop(ctx, cx, cy, a, 15, 4.2);
    ctx.fill();
  }
  ctx.fillStyle = heart;
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

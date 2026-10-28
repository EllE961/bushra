import { surface } from "../canvas";
import { F } from "../families";
import { hankin, hankinStar, path, star8, tiling488, type P } from "../kit/geometry";
import { star } from "../kit/ornament";
import { paper } from "../kit/paper";
import type { Paint, Template } from "../types";

const FIELD = "#0b3a31";
const BAND = "#072a23";
const CREAM = "#f1e7cc";
const GOLD = "#d9b45f";
const THETA = (3 * Math.PI) / 8;

/** Gold that catches the light: a diagonal sweep of bright and deep golds. */
function foil(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  const stops = ["#b8893a", "#f3d98f", "#c9973f", "#e9c873", "#a97a2e", "#f0d488", "#bf8e3b"];
  stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
  return g;
}

const goldText: Paint = (ctx, box) => {
  const g = ctx.createLinearGradient(0, box.y - box.h * 0.25, 0, box.y + box.h * 1.1);
  g.addColorStop(0, "#fbecb8");
  g.addColorStop(0.42, "#e6c26b");
  g.addColorStop(0.58, "#c3913b");
  g.addColorStop(1, "#f2d690");
  return g;
};

/** The band sits on the 4.8.8 lattice, sized so its corners and centre fall on octagons. */
function frame(w: number, h: number) {
  const a = Math.round(w / 20);
  let nx = Math.floor((w - 70) / a);
  if (nx % 2 === 0) nx -= 1;
  const ny = Math.floor((h - 70) / a);
  const mx = (w - nx * a) / 2;
  const my = (h - ny * a) / 2;
  return { a, mx, my, ox: mx + a / 2, oy: my + a / 2 };
}

function strapwork(ctx: CanvasRenderingContext2D, lines: P[][], w: number, h: number, wide: number, narrow: number, inner: string) {
  ctx.lineJoin = "miter";
  ctx.lineCap = "round";
  ctx.strokeStyle = foil(ctx, 0, 0, w, h);
  ctx.lineWidth = wide;
  ctx.beginPath();
  for (const l of lines) path(ctx, l, false);
  ctx.stroke();
  ctx.strokeStyle = inner;
  ctx.lineWidth = narrow;
  ctx.beginPath();
  for (const l of lines) path(ctx, l, false);
  ctx.stroke();
}

function medallion(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = r * 0.35;
  ctx.fillStyle = BAND;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  const gold = foil(ctx, cx - r, cy - r, cx + r, cy + r);
  ctx.strokeStyle = gold;
  ctx.fillStyle = gold;
  ctx.lineWidth = r * 0.05;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = r * 0.018;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.88, 0, Math.PI * 2);
  ctx.stroke();
  // Sixteen-point rosette, then an eight-pointed star set in it.
  star(ctx, cx, cy, 16, r * 0.8, r * 0.6, -Math.PI / 2);
  ctx.lineWidth = r * 0.03;
  ctx.stroke();
  ctx.beginPath();
  path(ctx, star8(cx, cy, r * 0.56, Math.PI / 8));
  ctx.fill();
  ctx.fillStyle = BAND;
  ctx.beginPath();
  path(ctx, star8(cx, cy, r * 0.34, Math.PI / 8));
  ctx.fill();
  ctx.fillStyle = gold;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export const emerald: Template = {
  id: "emerald",
  label: "زمرد",
  tone: "#0f4a3c",
  seed: 23,
  paint(ctx, w, h) {
    paper(ctx, w, h, FIELD, { grain: 0.55, vignette: "rgba(0,12,9,0.55)", seed: 23 });
    const glow = ctx.createRadialGradient(w / 2, h * 0.45, 0, w / 2, h * 0.45, w * 0.5);
    glow.addColorStop(0, "rgba(46,128,102,0.42)");
    glow.addColorStop(1, "rgba(46,128,102,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    const { a, mx, my, ox, oy } = frame(w, h);
    const { octagons, squares } = tiling488(0, 0, w, h, a, ox, oy);
    const lines = [...octagons, ...squares].flatMap((p) => hankin(p, THETA));
    const inner = { x: mx + a, y: my + a, w: w - 2 * (mx + a), h: h - 2 * (my + a) };

    // The pattern carries on faintly into the field and dissolves toward the words.
    const s = ctx.getTransform().a;
    const ghost = surface(Math.ceil(w * s), Math.ceil(h * s));
    const g = ghost.ctx;
    g.scale(s, s);
    g.strokeStyle = GOLD;
    g.lineWidth = 2;
    g.beginPath();
    for (const l of lines) path(g, l, false);
    g.stroke();
    g.globalCompositeOperation = "destination-in";
    const fade = g.createRadialGradient(w / 2, h / 2, h * 0.18, w / 2, h / 2, w * 0.56);
    fade.addColorStop(0, "rgba(0,0,0,0)");
    fade.addColorStop(1, "rgba(0,0,0,1)");
    g.fillStyle = fade;
    g.fillRect(0, 0, w, h);
    ctx.save();
    ctx.beginPath();
    ctx.rect(inner.x, inner.y, inner.w, inner.h);
    ctx.clip();
    ctx.globalAlpha = 0.16;
    ctx.drawImage(ghost.canvas as CanvasImageSource, 0, 0, w, h);
    ctx.restore();

    // The band.
    ctx.save();
    ctx.beginPath();
    ctx.rect(mx, my, w - 2 * mx, h - 2 * my);
    ctx.rect(inner.x, inner.y, inner.w, inner.h);
    ctx.clip("evenodd");
    ctx.fillStyle = BAND;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "rgba(217,180,95,0.13)";
    ctx.beginPath();
    for (const o of octagons) path(ctx, hankinStar(o, THETA));
    ctx.fill();
    strapwork(ctx, lines, w, h, a * 0.085, a * 0.034, BAND);
    ctx.restore();

    // Double rules on both edges of the band.
    const gold = foil(ctx, 0, 0, w, h);
    ctx.strokeStyle = gold;
    for (const [inset, width] of [
      [0, a * 0.04],
      [-a * 0.13, a * 0.014],
      [a, a * 0.04],
      [a + a * 0.13, a * 0.014],
    ] as const) {
      ctx.lineWidth = width;
      ctx.strokeRect(mx + inset, my + inset, w - 2 * (mx + inset), h - 2 * (my + inset));
    }

    for (const [cx, cy] of [
      [ox, oy],
      [w - ox, oy],
      [ox, h - oy],
      [w - ox, h - oy],
    ]) {
      medallion(ctx, cx, cy, a * 0.66);
    }
    medallion(ctx, w / 2, oy, a * 0.78);
  },
  layout(w, h) {
    const { a, my } = frame(w, h);
    const innerTop = my + a;
    const footerY = h - innerTop - a * 0.5;
    const k = Math.max(1, Math.min(1.15, h / w / 0.5625));
    return {
      box: { x: w * 0.18, y: innerTop + a * 0.7, w: w * 0.64, h: footerY - innerTop - a * 1.25 },
      verse: { family: F.quran, size: 36 * k, color: "#d8bd7c", leading: 1.9 },
      intro: { family: F.naskh, weight: 700, size: 44 * k, color: CREAM },
      name: {
        family: F.ruqaa,
        weight: 700,
        size: 116 * k,
        min: 64,
        color: goldText,
        leading: 1.5,
        dy: -0.04,
        shadow: { color: "rgba(0,0,0,0.4)", blur: 14, y: 4 },
      },
      deed: { family: F.naskh, weight: 700, size: 48 * k, color: CREAM },
      target: { color: "#e8c56f" },
      prayer: { family: F.naskh, size: 34 * k, color: "#cbc3a8", leading: 1.75 },
      footer: { family: F.naskh, size: 27 * k, color: "#b9a77a", y: footerY },
      divider: {
        height: 36,
        draw: (ctx, cx, cy) => {
          ctx.save();
          const g = foil(ctx, cx - 170, cy, cx + 170, cy);
          ctx.fillStyle = g;
          for (const s of [-1, 1]) {
            ctx.beginPath();
            ctx.moveTo(cx + s * 26, cy - 1.3);
            ctx.lineTo(cx + s * 170, cy);
            ctx.lineTo(cx + s * 26, cy + 1.3);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.arc(cx + s * 182, cy, 2.6, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.beginPath();
          path(ctx, star8(cx, cy, 14, Math.PI / 8));
          ctx.fill();
          ctx.fillStyle = FIELD;
          ctx.beginPath();
          ctx.arc(cx, cy, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        },
      },
      gaps: { verse: 22, name: 8, deed: 22 },
    };
  },
};

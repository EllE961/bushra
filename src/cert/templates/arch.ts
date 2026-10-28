import { surface } from "../canvas";
import { F } from "../families";
import { star8 } from "../kit/geometry";
import { archOutline, archProfile, lanternCell, mix, shade, trace, trellisCentres, type Arch } from "../kit/deco";
import { paper } from "../kit/paper";
import type { Template } from "../types";

type Ctx = CanvasRenderingContext2D;

const WALL = "#f6efe3";
const CLAY = "#c9805f";
const INK = "#3e4238";
const GREEN = "#3c5641";

/** Paper layers from the back to the front, and how far each opening stands out from the one behind it. */
const LAYERS = [
  { color: "#d39678", step: 0 },
  { color: "#f0e6d4", step: 22 },
  { color: "#c6cfb5", step: 28 },
  { color: "#a8b69b", step: 34 },
  { color: "#8b9d81", step: 44 },
];

function geometry(w: number, h: number) {
  const tall = h / w > 0.6;
  const half = w * 0.3;
  const apex = h * (tall ? 0.13 : 0.14);
  const rise = half * 0.62;
  const total = LAYERS.reduce((t, l) => t + l.step, 0);
  const sill = h - 30 * (tall ? 1.2 : 1);
  let off = 0;
  const arches: Arch[] = LAYERS.map((l) => {
    off += l.step;
    return { cx: w / 2, half: half + off, spring: apex + rise - off * 0.25, apex: apex - off * 0.9, foot: sill - (total - off) * 0.5 };
  });
  const k = tall ? 1.16 : 1;
  const star = { x: w / 2, y: apex + 78 * k, r: 25 * k };
  return { arches, star, k };
}

/** Paper lit from above: a touch lighter at the top of the sheet, a touch deeper at the foot. */
function lit(ctx: Ctx, h: number, color: string) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, mix(color, "#ffffff", 0.1));
  g.addColorStop(0.55, color);
  g.addColorStop(1, mix(color, "#3a3226", 0.08));
  return g;
}

/** A paper star on a thread, hanging from the tip of the innermost arch. */
function hangingStar(ctx: Ctx, x: number, top: number, y: number, r: number) {
  ctx.save();
  ctx.strokeStyle = "#9c8a70";
  ctx.lineWidth = 1.4;
  shade(ctx, "rgba(60,46,30,0.25)", 3, 2, 4);
  ctx.beginPath();
  ctx.moveTo(x, top - 10);
  ctx.lineTo(x, y - r);
  ctx.stroke();
  ctx.fillStyle = CLAY;
  ctx.beginPath();
  ctx.arc(x, y - r - 13, 3.6, 0, Math.PI * 2);
  ctx.fill();

  shade(ctx, "rgba(60,46,30,0.3)", 10, 4, 9);
  ctx.fillStyle = CLAY;
  ctx.beginPath();
  trace(ctx, star8(x, y, r, Math.PI / 8 - Math.PI / 2));
  ctx.fill();
  shade(ctx, "rgba(60,46,30,0.25)", 4, 1, 2);
  ctx.fillStyle = "#f3e7d4";
  ctx.beginPath();
  trace(ctx, star8(x, y, r * 0.55, -Math.PI / 2));
  ctx.fill();
  ctx.restore();
}

/**
 * The front sheet, cut on a scratch canvas: the arch, and a lattice of
 * lantern-shaped holes that stops short of a plain border round the opening.
 */
function frontSheet(ctx: Ctx, w: number, h: number, a: Arch, color: string) {
  const s = ctx.getTransform().a;
  const { canvas, ctx: g } = surface(Math.ceil(w * s), Math.ceil(h * s));
  g.scale(s, s);
  g.fillStyle = lit(g, h, color);
  g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = "destination-out";
  g.beginPath();
  trace(g, archOutline(a));
  g.fill();

  const border = 30;
  const edge = 24;
  const rim = archOutline({ ...a, half: a.half + border, apex: a.apex - border, spring: a.spring - border * 0.25, foot: a.foot + border });
  const profile = archProfile(a);
  const hw = w / 46;
  const hh = w / 33;
  const cw = hw * 0.62;
  const ch = hh * 0.62;
  const outside = (x: number, y: number) => y < a.apex - border || Math.abs(x - a.cx) > profile(y) + border;
  g.beginPath();
  for (const c of trellisCentres(0, 0, w, h, w / 2, hw, hh)) {
    // Whole holes only: none crossing the sheet's edge or the border round the arch.
    if (c.x - cw < edge || c.x + cw > w - edge || c.y - ch < edge || c.y + ch > h - edge) continue;
    let d = Infinity;
    for (const p of rim) d = Math.min(d, Math.hypot(p.x - c.x, p.y - c.y));
    if (d < ch + 4 || !outside(c.x, c.y)) continue;
    lanternCell(g, c.x, c.y, cw, ch);
  }
  g.fill();
  return canvas as CanvasImageSource;
}

export const arch: Template = {
  id: "arch",
  label: "محراب",
  tone: "#a9b79b",
  seed: 47,
  paint(ctx, w, h) {
    const { arches, star } = geometry(w, h);
    ctx.fillStyle = WALL;
    ctx.fillRect(0, 0, w, h);
    // Light falling into the niche from above.
    const light = ctx.createRadialGradient(w / 2, h * 0.38, 0, w / 2, h * 0.5, w * 0.42);
    light.addColorStop(0, "rgba(255,252,244,0.9)");
    light.addColorStop(1, "rgba(226,212,190,0.5)");
    ctx.fillStyle = light;
    ctx.fillRect(0, 0, w, h);

    hangingStar(ctx, star.x, arches[0].apex, star.y, star.r);

    arches.forEach((a, i) => {
      const color = LAYERS[i].color;
      const outline = archOutline(a);
      const cut = i === arches.length - 1 ? frontSheet(ctx, w, h, a, color) : null;
      const sheet = () => {
        if (cut) {
          ctx.drawImage(cut, 0, 0, w, h);
          return;
        }
        ctx.beginPath();
        ctx.rect(-80, -80, w + 160, h + 160);
        trace(ctx, outline);
        ctx.fill("evenodd");
      };
      ctx.save();
      ctx.fillStyle = lit(ctx, h, color);
      // A wide soft shadow, then a tight one where the paper nearly touches the sheet behind.
      shade(ctx, "rgba(58,46,32,0.34)", 30, 0, 12);
      sheet();
      shade(ctx, "rgba(58,46,32,0.26)", 5, 0, 2);
      sheet();
      ctx.restore();
      // The cut edge catches the light.
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, w, h);
      trace(ctx, outline);
      ctx.clip("evenodd");
      ctx.beginPath();
      trace(ctx, outline);
      ctx.strokeStyle = "rgba(255,253,246,0.45)";
      ctx.lineWidth = 2.2;
      ctx.stroke();
      ctx.restore();
    });

    paper(ctx, w, h, "rgba(0,0,0,0)", { grain: 0.5, seed: 47 });
  },
  layout(w, h) {
    const { arches, star, k } = geometry(w, h);
    const top = star.y + star.r + 26 * k;
    const footerY = arches[0].foot - 40 * k;
    return {
      box: { x: w * 0.27, y: top, w: w * 0.46, h: footerY - 40 * k - top },
      verse: { family: F.quran, size: 32 * k, color: "#8a7a5a", leading: 1.9 },
      intro: { family: F.messiri, weight: 500, size: 40 * k, color: INK },
      name: { family: F.ruqaa, weight: 700, size: 108 * k, min: 60, color: GREEN, leading: 1.45, dy: -0.04 },
      deed: { family: F.messiri, weight: 600, size: 44 * k, color: INK },
      target: { color: "#b05e3e" },
      prayer: { family: F.naskh, size: 33 * k, color: "#5c5a4d", leading: 1.75, width: w * 0.44 },
      footer: { family: F.messiri, weight: 400, size: 25 * k, color: "#857d6c", y: footerY },
      divider: {
        height: 32 * k,
        draw: (ctx, cx, cy) => {
          ctx.save();
          ctx.fillStyle = "#a3b093";
          for (const s of [-1, 1]) ctx.fillRect(s > 0 ? cx + 24 : cx - 164, cy - 1, 140, 2);
          ctx.fillStyle = CLAY;
          ctx.beginPath();
          trace(ctx, star8(cx, cy, 12, Math.PI / 8 - Math.PI / 2));
          ctx.fill();
          ctx.fillStyle = WALL;
          ctx.beginPath();
          ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        },
      },
      gaps: { verse: 20 * k, intro: 2, name: 6 * k, deed: 20 * k },
    };
  },
};

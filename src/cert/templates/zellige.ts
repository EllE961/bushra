import { F } from "../families";
import { path, star8, starAndCross, type P } from "../kit/geometry";
import { paper } from "../kit/paper";
import { Rng } from "../kit/rng";
import type { Template } from "../types";

const GLAZE = "#f6f2e8";
const GROUT = "#ece6d9";
const COBALT = "#203f80";
const GREEN = "#1a5f4c";
const OCHRE = "#c9902f";
const INK = "#1c2f57";

function box(pts: P[]) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of pts) {
    x0 = Math.min(x0, p.x);
    y0 = Math.min(y0, p.y);
    x1 = Math.max(x1, p.x);
    y1 = Math.max(y1, p.y);
  }
  return { x0, y0, x1, y1 };
}

/** One hand-cut piece: its own slightly uneven tone, and the sheen of the glaze across it. */
function piece(ctx: CanvasRenderingContext2D, rng: Rng, pts: P[], color: string) {
  ctx.beginPath();
  path(ctx, pts);
  ctx.fillStyle = color;
  ctx.fill();
  const shift = rng.range(-1, 1);
  ctx.fillStyle = shift > 0 ? `rgba(255,255,255,${shift * 0.09})` : `rgba(0,0,0,${-shift * 0.1})`;
  ctx.fill();
  const b = box(pts);
  const g = ctx.createLinearGradient(b.x0, b.y0, b.x1, b.y1);
  g.addColorStop(0, "rgba(255,255,255,0.26)");
  g.addColorStop(0.45, "rgba(255,255,255,0)");
  g.addColorStop(1, "rgba(0,0,0,0.08)");
  ctx.fillStyle = g;
  ctx.fill();
}

/** Tile pitch from the width so both formats share it; a taller sheet gets deeper bands. */
function bands(w: number, h: number) {
  const a = w / 20;
  return { a, depth: a * 1.78 + Math.max(0, h - w * 0.5625) * 0.32 };
}

function tileBand(ctx: CanvasRenderingContext2D, rng: Rng, w: number, y0: number, y1: number, a: number, oy: number) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, y0, w, y1 - y0);
  ctx.clip();
  const { stars, crosses } = starAndCross(0, y0, w, y1, a, w / 2, oy);
  const diamond = (c: P, r: number): P[] => [
    { x: c.x, y: c.y - r },
    { x: c.x + r, y: c.y },
    { x: c.x, y: c.y + r },
    { x: c.x - r, y: c.y },
  ];
  for (const c of crosses) {
    piece(ctx, rng, c.pts, GLAZE);
    piece(ctx, rng, diamond(c.c, a * 0.11), (((c.i + c.j) % 2) + 2) % 2 === 0 ? OCHRE : COBALT);
  }
  for (const s of stars) {
    const blue = (((s.i + s.j) % 2) + 2) % 2 === 0;
    piece(ctx, rng, s.pts, blue ? COBALT : GREEN);
    piece(ctx, rng, star8(s.c.x, s.c.y, a * 0.2, Math.PI / 8), GLAZE);
  }
  // Grout between every piece.
  ctx.strokeStyle = GROUT;
  ctx.lineJoin = "round";
  ctx.lineWidth = a * 0.036;
  ctx.beginPath();
  for (const s of stars) {
    path(ctx, s.pts);
    path(ctx, star8(s.c.x, s.c.y, a * 0.2, Math.PI / 8));
  }
  for (const c of crosses) path(ctx, diamond(c.c, a * 0.11));
  ctx.stroke();
  ctx.restore();
}

/** The strip that binds a tiled band: a dark fillet, then a fine ochre line. */
function fillet(ctx: CanvasRenderingContext2D, w: number, y: number, dir: 1 | -1, a: number) {
  const t = a * 0.09;
  ctx.fillStyle = INK;
  ctx.fillRect(0, dir === 1 ? y : y - t, w, t);
  ctx.fillStyle = OCHRE;
  const ly = y + dir * (t + a * 0.07);
  ctx.fillRect(0, ly - a * 0.012, w, a * 0.024);
}

export const zellige: Template = {
  id: "zellige",
  label: "زليج",
  tone: "#2f5d9c",
  seed: 41,
  paint(ctx, w, h) {
    const rng = new Rng(41);
    paper(ctx, w, h, GLAZE, { grain: 0.35, seed: 41 });
    const sheen = ctx.createRadialGradient(w * 0.5, h * 0.42, 0, w * 0.5, h * 0.5, w * 0.6);
    sheen.addColorStop(0, "rgba(255,255,255,0.7)");
    sheen.addColorStop(1, "rgba(214,204,182,0.35)");
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, w, h);

    const { a, depth } = bands(w, h);
    tileBand(ctx, rng, w, 0, depth, a, depth - a / 2);
    tileBand(ctx, rng, w, h - depth, h, a, h - depth + a / 2);
    fillet(ctx, w, depth, 1, a);
    fillet(ctx, w, h - depth, -1, a);

    // Side rules close the field into a panel, pinned with small stars where they meet the fillets.
    const top = depth + a * 0.09;
    const bottom = h - depth - a * 0.09;
    for (const x of [a * 0.55, w - a * 0.55]) {
      ctx.fillStyle = INK;
      ctx.fillRect(x - a * 0.022, top, a * 0.044, bottom - top);
      ctx.fillStyle = OCHRE;
      const inner = x < w / 2 ? x + a * 0.13 : x - a * 0.13;
      ctx.fillRect(inner - a * 0.012, top + a * 0.16, a * 0.024, bottom - top - a * 0.32);
      for (const y of [top + a * 0.16, bottom - a * 0.16]) {
        ctx.beginPath();
        path(ctx, star8(x, y, a * 0.17));
        ctx.fillStyle = COBALT;
        ctx.fill();
        ctx.strokeStyle = GROUT;
        ctx.lineWidth = a * 0.03;
        ctx.stroke();
        ctx.beginPath();
        path(ctx, star8(x, y, a * 0.07, Math.PI / 8));
        ctx.fillStyle = OCHRE;
        ctx.fill();
      }
    }
  },
  layout(w, h) {
    const { a, depth } = bands(w, h);
    const k = Math.max(1, Math.min(1.15, h / w / 0.5625));
    const top = depth + a * 0.5;
    const footerY = h - depth - a * 0.55;
    return {
      box: { x: w * 0.17, y: top, w: w * 0.66, h: footerY - top - a * 0.45 },
      verse: { family: F.quran, size: 35 * k, color: "#9a6a24", leading: 1.9 },
      intro: { family: F.naskh, weight: 700, size: 44 * k, color: INK },
      name: { family: F.ruqaa, weight: 700, size: 112 * k, min: 64, color: COBALT, leading: 1.45, dy: -0.04 },
      deed: { family: F.naskh, weight: 700, size: 48 * k, color: INK },
      target: { color: GREEN },
      prayer: { family: F.naskh, size: 34 * k, color: "#4a5670", leading: 1.75 },
      footer: { family: F.naskh, size: 27 * k, color: "#6b7488", y: footerY },
      divider: {
        height: 40,
        draw: (ctx, cx, cy) => {
          ctx.save();
          ctx.fillStyle = INK;
          for (const s of [-1, 1]) {
            ctx.fillRect(Math.min(cx + s * 30, cx + s * 160), cy - 1, 130, 2);
            ctx.beginPath();
            const dx = cx + s * 176;
            ctx.moveTo(dx, cy - 6);
            ctx.lineTo(dx + 6, cy);
            ctx.lineTo(dx, cy + 6);
            ctx.lineTo(dx - 6, cy);
            ctx.closePath();
            ctx.fillStyle = OCHRE;
            ctx.fill();
            ctx.fillStyle = INK;
          }
          ctx.beginPath();
          path(ctx, star8(cx, cy, 17));
          ctx.fillStyle = COBALT;
          ctx.fill();
          ctx.beginPath();
          path(ctx, star8(cx, cy, 7, Math.PI / 8));
          ctx.fillStyle = OCHRE;
          ctx.fill();
          ctx.restore();
        },
      },
      gaps: { verse: 22, name: 6, deed: 22 },
    };
  },
};

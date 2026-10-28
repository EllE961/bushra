import { F } from "../families";
import { paper } from "../kit/paper";
import { foil, khatam } from "../kit/tazhib";
import type { Template } from "../types";

type Ctx = CanvasRenderingContext2D;

const INK = "#171512";
const SOFT = "#57524a";
const IVORY = "#fbf8f1";

/** Brushed gold: a conic sweep where the browser has one, a diagonal foil where it does not. */
function sweep(ctx: Ctx, cx: number, cy: number, r: number) {
  if (typeof ctx.createConicGradient !== "function") return foil(ctx, cx - r, cy - r, cx + r, cy + r, "pale");
  const g = ctx.createConicGradient(-Math.PI / 3, cx, cy);
  const stops = ["#b8913f", "#f4e2a6", "#c79e4c", "#8f6a28", "#e6c77c", "#fff1c4", "#b68a36", "#80601f", "#d9b462", "#b8913f"];
  stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
  return g;
}

function scallops(ctx: Ctx, cx: number, cy: number, r: number, n: number, depth: number) {
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2;
    const a1 = ((i + 1) / n) * Math.PI * 2;
    const am = (a0 + a1) / 2;
    if (i === 0) ctx.moveTo(cx + Math.cos(a0) * r, cy + Math.sin(a0) * r);
    ctx.quadraticCurveTo(cx + Math.cos(am) * r * (1 + depth), cy + Math.sin(am) * r * (1 + depth), cx + Math.cos(a1) * r, cy + Math.sin(a1) * r);
  }
  ctx.closePath();
}

function ribbon(ctx: Ctx, x: number, y: number, angle: number, len: number, wid: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  const g = ctx.createLinearGradient(-wid / 2, 0, wid / 2, 0);
  g.addColorStop(0, "#121110");
  g.addColorStop(0.45, "#34312c");
  g.addColorStop(1, "#151413");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-wid / 2, 0);
  ctx.lineTo(wid / 2, 0);
  ctx.lineTo(wid / 2, len);
  ctx.lineTo(0, len - wid * 0.42);
  ctx.lineTo(-wid / 2, len);
  ctx.closePath();
  ctx.fill();
  // Two gold threads woven near the edges.
  ctx.strokeStyle = foil(ctx, 0, 0, wid, len, "pale");
  ctx.lineWidth = 2;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * (wid / 2 - 7), 0);
    ctx.lineTo(s * (wid / 2 - 7), len - 8 - wid * 0.42 * (7 / (wid / 2)));
    ctx.stroke();
  }
  ctx.restore();
}

/** A foil rosette with two ribbon tails, lit from the top left. */
function rosette(ctx: Ctx, cx: number, cy: number, r: number) {
  ribbon(ctx, cx - r * 0.18, cy + r * 0.2, 0.32, r * 1.75, r * 0.48);
  ribbon(ctx, cx + r * 0.18, cy + r * 0.2, -0.32, r * 1.75, r * 0.48);

  ctx.save();
  ctx.shadowColor = "rgba(70,48,12,0.32)";
  ctx.shadowBlur = r * 0.18;
  ctx.shadowOffsetY = r * 0.06;
  scallops(ctx, cx, cy, r, 36, 0.075);
  ctx.fillStyle = sweep(ctx, cx, cy, r);
  ctx.fill();
  ctx.restore();

  const dark = "rgba(96,68,20,0.75)";
  const light = "rgba(255,246,214,0.85)";
  const ring = (rr: number, width: number, color: string, dx = 0, dy = 0) => {
    ctx.beginPath();
    ctx.arc(cx + dx, cy + dy, rr, 0, Math.PI * 2);
    ctx.lineWidth = width;
    ctx.strokeStyle = color;
    ctx.stroke();
  };
  ctx.save();
  // Pressed rings: a dark line with a highlight just below it reads as an emboss.
  ring(r * 0.9, 1.6, light, 0, 1.2);
  ring(r * 0.9, 1.6, dark);
  ring(r * 0.72, 1.4, light, 0, 1.2);
  ring(r * 0.72, 1.4, dark);
  // Milled band between the rings.
  ctx.strokeStyle = dark;
  ctx.lineWidth = 1.3;
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r * 0.76, cy + Math.sin(a) * r * 0.76);
    ctx.lineTo(cx + Math.cos(a) * r * 0.86, cy + Math.sin(a) * r * 0.86);
    ctx.stroke();
  }
  // The field, a smoother gold, and the star pressed into it.
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.68, 0, Math.PI * 2);
  ctx.fillStyle = foil(ctx, cx - r, cy - r, cx + r, cy + r, "pale");
  ctx.fill();
  ctx.lineWidth = 2;
  for (const [color, off] of [
    [light, 1.4],
    [dark, 0],
  ] as const) {
    ctx.strokeStyle = color;
    khatam(ctx, cx, cy + off, r * 0.46, Math.PI / 8);
    ctx.stroke();
    khatam(ctx, cx, cy + off, r * 0.3, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy + off, r * 0.11, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function bracket(ctx: Ctx, x: number, y: number, sx: number, sy: number, len: number, gold: CanvasGradient) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(sx, sy);
  ctx.fillStyle = gold;
  ctx.fillRect(0, 0, len, 3);
  ctx.fillRect(0, 0, 3, len);
  ctx.fillRect(10, 10, len * 0.42, 1.2);
  ctx.fillRect(10, 10, 1.2, len * 0.42);
  ctx.beginPath();
  ctx.moveTo(-8, 0);
  ctx.lineTo(0, -8);
  ctx.lineTo(8, 0);
  ctx.lineTo(0, 8);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function seal_(h: number) {
  return { x: 300, y: h - 300, r: 96 };
}

export const seal: Template = {
  id: "seal",
  label: "وسام",
  tone: "#b8913f",
  seed: 31,
  paint(ctx, w, h) {
    paper(ctx, w, h, IVORY, { grain: 0.45, vignette: "rgba(120,96,50,0.10)", seed: 31 });
    const light = ctx.createRadialGradient(w * 0.5, h * 0.42, 0, w * 0.5, h * 0.42, w * 0.6);
    light.addColorStop(0, "rgba(255,255,255,0.55)");
    light.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = light;
    ctx.fillRect(0, 0, w, h);

    const gold = foil(ctx, 0, 0, w, h, "pale");
    // A watermark behind the words: the star drawn large in the faintest gold.
    ctx.save();
    ctx.strokeStyle = "#b8913f";
    ctx.globalAlpha = 0.07;
    ctx.lineWidth = 2;
    for (const [r, rot] of [
      [h * 0.36, Math.PI / 8],
      [h * 0.335, Math.PI / 8],
      [h * 0.23, 0],
    ]) {
      khatam(ctx, w / 2, h * 0.47, r, rot);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(w / 2, h * 0.47, h * 0.39, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // A hairline frame inside another, and gold brackets holding the corners.
    ctx.save();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.6;
    ctx.globalAlpha = 0.85;
    ctx.strokeRect(48, 48, w - 96, h - 96);
    ctx.lineWidth = 0.9;
    ctx.globalAlpha = 0.5;
    ctx.strokeRect(60, 60, w - 120, h - 120);
    ctx.restore();
    const b = 80;
    bracket(ctx, b, b, 1, 1, 128, gold);
    bracket(ctx, w - b, b, -1, 1, 128, gold);
    bracket(ctx, b, h - b, 1, -1, 128, gold);
    bracket(ctx, w - b, h - b, -1, -1, 128, gold);

    // A small star set into the top of the frame.
    ctx.save();
    ctx.fillStyle = IVORY;
    ctx.fillRect(w / 2 - 34, 40, 68, 28);
    ctx.fillStyle = gold;
    khatam(ctx, w / 2, 54, 15, Math.PI / 8);
    ctx.fill();
    ctx.fillStyle = IVORY;
    ctx.beginPath();
    ctx.arc(w / 2, 54, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = gold;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(w / 2 + s * 27, 54, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    const s = seal_(h);
    rosette(ctx, s.x, s.y, s.r);
  },
  layout(w, h) {
    const k = h / w > 0.6 ? 1.1 : 1;
    const goldText = (ctx: Ctx, box: { x: number; y: number; w: number; h: number }) => {
      const g = ctx.createLinearGradient(box.x, box.y, box.x + box.w, box.y + box.h);
      g.addColorStop(0, "#9a7329");
      g.addColorStop(0.5, "#c69b45");
      g.addColorStop(1, "#8a6420");
      return g;
    };
    return {
      box: { x: w * 0.23, y: h * 0.17, w: w * 0.54, h: h * 0.62 },
      verse: { family: F.quran, size: 32 * k, color: "#8f6d2e", leading: 2 },
      intro: { family: F.messiri, weight: 500, size: 38 * k, color: "#3a3631" },
      name: { family: F.ruqaa, weight: 700, size: 120 * k, min: 66, color: INK, leading: 1.45, dy: -0.04 },
      deed: { family: F.messiri, weight: 600, size: 46 * k, color: "#26231f" },
      target: { color: goldText, weight: 700 },
      prayer: { family: F.naskh, size: 34 * k, color: SOFT, leading: 1.8 },
      footer: { family: F.messiri, weight: 400, size: 25 * k, color: "#7d766b", y: h - 128 },
      divider: {
        height: 40 * k,
        draw: (ctx, cx, cy) => {
          ctx.save();
          ctx.fillStyle = foil(ctx, cx - 200, cy, cx + 200, cy, "pale");
          ctx.fillRect(cx - 190, cy - 0.6, 160, 1.2);
          ctx.fillRect(cx + 30, cy - 0.6, 160, 1.2);
          for (const [dx, r] of [
            [0, 8],
            [-18, 3.4],
            [18, 3.4],
          ]) {
            ctx.beginPath();
            ctx.moveTo(cx + dx, cy - r);
            ctx.lineTo(cx + dx + r, cy);
            ctx.lineTo(cx + dx, cy + r);
            ctx.lineTo(cx + dx - r, cy);
            ctx.closePath();
            ctx.fill();
          }
          ctx.restore();
        },
      },
      gaps: { verse: 26 * k, intro: 2, name: 6 * k, deed: 26 * k },
    };
  },
};

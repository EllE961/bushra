import { F } from "../families";
import { Rng } from "../kit/rng";
import { bunting, cloudBank, crescent, softStar } from "../kit/sky";
import type { Paint, Template } from "../types";

const NAVY = "#2f3d6e";
const FLAGS = ["#ff8a7a", "#ffc94d", "#5fcfae", "#6cb3ff", "#b49cff"];
const CONFETTI = ["#ff8a7a", "#ffc94d", "#5fcfae", "#6cb3ff", "#b49cff", "#ff9fc4"];

const nameFill: Paint = (ctx, box) => {
  const g = ctx.createLinearGradient(box.x, 0, box.x + box.w, 0);
  g.addColorStop(0, "#7b5cff");
  g.addColorStop(0.5, "#ff6f91");
  g.addColorStop(1, "#ff9a3d");
  return g;
};

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, rot = 0) {
  ctx.save();
  ctx.shadowColor = "rgba(80,90,150,0.2)";
  ctx.shadowBlur = r * 0.5;
  ctx.shadowOffsetY = r * 0.15;
  ctx.fillStyle = color;
  softStar(ctx, x, y, r, rot);
  ctx.fill();
  ctx.shadowColor = "transparent";
  // A soft highlight on the upper left.
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = "#ffffff";
  softStar(ctx, x - r * 0.12, y - r * 0.14, r * 0.42, rot);
  ctx.fill();
  ctx.restore();
}

function stars3(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  star(ctx, cx - 44, cy + 2, 11, "#ff9fb4", -0.2);
  star(ctx, cx, cy, 16, "#ffc94d");
  star(ctx, cx + 44, cy + 2, 11, "#5fcfae", 0.2);
}

export const kids: Template = {
  id: "kids",
  label: "نجوم",
  tone: "#ffb35c",
  seed: 31,
  paint(ctx, w, h) {
    const rng = new Rng(31);

    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, "#c4e2ff");
    sky.addColorStop(0.5, "#e8f3ff");
    sky.addColorStop(1, "#fdeedd");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // Large soft bubbles for depth.
    ctx.save();
    for (const [x, y, r, a] of [
      [w * 0.08, h * 0.5, 260, 0.35],
      [w * 0.93, h * 0.42, 220, 0.3],
      [w * 0.5, h * 0.55, 520, 0.28],
      [w * 0.75, h * 0.9, 300, 0.25],
    ] as const) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(255,255,255,${a})`);
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    ctx.restore();

    // Confetti, kept to the margins.
    ctx.save();
    for (let i = 0; i < 90; i++) {
      const x = rng.range(20, w - 20);
      const y = rng.range(150, h - 120);
      if (x > w * 0.17 && x < w * 0.83 && y > h * 0.16) continue;
      ctx.globalAlpha = rng.range(0.55, 0.9);
      ctx.fillStyle = rng.pick(CONFETTI);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rng.range(0, Math.PI));
      if (rng.chance(0.5)) {
        ctx.beginPath();
        ctx.arc(0, 0, rng.range(4, 8), 0, Math.PI * 2);
        ctx.fill();
      } else {
        const l = rng.range(12, 20);
        ctx.beginPath();
        ctx.arc(-l / 2, 0, 3.5, Math.PI / 2, -Math.PI / 2);
        ctx.arc(l / 2, 0, 3.5, -Math.PI / 2, Math.PI / 2);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.restore();

    // A crescent and stars on the open sides.
    ctx.save();
    ctx.shadowColor = "rgba(80,90,150,0.2)";
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = "#ffd766";
    crescent(ctx, 200, h * 0.4, 74, -0.5, 0.82, 0.45);
    ctx.fill();
    ctx.restore();
    star(ctx, 300, h * 0.33, 22, "#ffc94d", 0.15);
    star(ctx, 130, h * 0.6, 30, "#ff9fb4", -0.2);
    star(ctx, 250, h * 0.7, 16, "#6cb3ff", 0.3);
    star(ctx, w - 190, h * 0.36, 44, "#ffc94d", -0.12);
    star(ctx, w - 300, h * 0.52, 20, "#5fcfae", 0.25);
    star(ctx, w - 140, h * 0.63, 26, "#b49cff", 0.1);
    star(ctx, w - 330, h * 0.24, 14, "#ff9fb4", -0.3);

    // Two swags of bunting across the top.
    bunting(ctx, rng, -30, 18, w / 2, 18, 78, FLAGS, 62, "#5a6aa0");
    bunting(ctx, rng, w / 2, 18, w + 30, 18, 78, [...FLAGS].reverse(), 62, "#5a6aa0");

    // Clouds banked along the bottom, higher at the corners.
    ctx.save();
    ctx.shadowColor = "rgba(110,140,200,0.28)";
    ctx.shadowBlur = 36;
    ctx.fillStyle = "#dbe9fa";
    ctx.beginPath();
    cloudBank(ctx, rng, w, h, 190, 90, 46);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    cloudBank(ctx, rng, w, h, 160, 70);
    ctx.fill();
    ctx.restore();
  },
  layout(w, h) {
    return {
      box: { x: w * 0.2, y: h * 0.19, w: w * 0.6, h: h * 0.66 },
      verse: { family: F.quran, size: 34, color: "#5b6b9e", leading: 1.9 },
      intro: { family: F.round, weight: 600, size: 38, color: NAVY, leading: 1.7 },
      name: {
        family: F.round,
        weight: 700,
        size: 96,
        min: 54,
        color: nameFill,
        leading: 1.55,
        stroke: { color: "#ffffff", width: 9 },
        shadow: { color: "rgba(70,90,160,0.28)", blur: 22, y: 8 },
      },
      deed: { family: F.round, weight: 600, size: 42, color: NAVY, leading: 1.7 },
      target: { color: "#3f86f0", weight: 700 },
      prayer: { family: F.round, weight: 400, size: 29, color: "#56628f", leading: 1.9 },
      footer: { family: F.round, weight: 500, size: 24, color: "#6c78a3", y: h - 92 },
      divider: { height: 44, draw: stars3 },
      gaps: { verse: 18, intro: 2, name: 6, deed: 20 },
    };
  },
};

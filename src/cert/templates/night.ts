import { F } from "../families";
import { Rng } from "../kit/rng";
import { crescent, glow, lantern, skyline, sparkle, starfield } from "../kit/sky";
import type { Paint, Template } from "../types";

const CREAM = "#f4e8cb";
const PALE_GOLD = "#e9cf8e";

const goldText: Paint = (ctx, box) => {
  const g = ctx.createLinearGradient(0, box.y - box.h * 0.2, 0, box.y + box.h * 1.2);
  g.addColorStop(0, "#fff1c4");
  g.addColorStop(0.45, "#efc76a");
  g.addColorStop(0.62, "#d9a443");
  g.addColorStop(1, "#f6dc93");
  return g;
};

/** A hairline rule with a sparkle at its heart. */
function rule(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  ctx.save();
  for (const s of [-1, 1]) {
    const g = ctx.createLinearGradient(cx + s * 26, cy, cx + s * 190, cy);
    g.addColorStop(0, "rgba(233,207,142,0.9)");
    g.addColorStop(1, "rgba(233,207,142,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(cx + s * 26, cy - 1.2);
    ctx.lineTo(cx + s * 190, cy);
    ctx.lineTo(cx + s * 26, cy + 1.2);
    ctx.closePath();
    ctx.fill();
  }
  sparkle(ctx, cx, cy, 15, "#f6dc93");
  ctx.restore();
}

export const night: Template = {
  id: "night",
  label: "ليل",
  tone: "#1c2a5c",
  seed: 23,
  paint(ctx, w, h) {
    const rng = new Rng(23);

    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, "#060b22");
    sky.addColorStop(0.55, "#0f1a40");
    sky.addColorStop(1, "#1e2a5e");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    glow(ctx, w * 0.5, h * 0.52, w * 0.42, "rgba(64,86,170,0.55)", 0.55);
    glow(ctx, w * 0.5, h * 1.05, w * 0.5, "rgba(210,150,90,0.35)", 0.35);

    starfield(ctx, rng, w, h, 520, { x: w * 0.24, y: h * 0.2, w: w * 0.52, h: h * 0.62 });

    // The crescent, top left, with its star.
    const mx = 260;
    const my = 230;
    // The halo sits on the lit limb, not the disc, so the bitten side stays dark sky.
    glow(ctx, mx - 40, my + 14, 320, "rgba(250,214,140,0.45)", 0.5);
    const moon = ctx.createLinearGradient(mx - 120, my - 120, mx + 120, my + 120);
    moon.addColorStop(0, "#fff3cc");
    moon.addColorStop(0.5, "#f0cd78");
    moon.addColorStop(1, "#c98f34");
    ctx.save();
    ctx.shadowColor = "rgba(255,214,140,0.8)";
    ctx.shadowBlur = 46;
    ctx.fillStyle = moon;
    crescent(ctx, mx, my, 118, -0.35, 0.84, 0.44);
    ctx.fill();
    ctx.restore();
    sparkle(ctx, mx + 128, my - 4, 22, "#fbe6b0");

    // Sparkles scattered in the open sky.
    for (const [x, y, r] of [
      [w * 0.33, h * 0.1, 14],
      [w * 0.58, h * 0.07, 10],
      [w * 0.7, h * 0.16, 16],
      [w * 0.14, h * 0.52, 12],
      [w * 0.07, h * 0.36, 8],
      [w * 0.86, h * 0.62, 12],
      [w * 0.45, h * 0.15, 7],
    ] as const) {
      sparkle(ctx, x, y, r, "#f7e7bd", rng.range(0.7, 1));
    }

    // Lanterns hang from the top right.
    lantern(ctx, w - 360, 0, 120, 74);
    lantern(ctx, w - 220, 0, 250, 96);
    lantern(ctx, w - 95, 0, 90, 64);

    skyline(ctx, w, h, "rgba(5,9,28,0.92)");
    // A faint mist where the skyline meets the sky.
    const mist = ctx.createLinearGradient(0, h - 240, 0, h);
    mist.addColorStop(0, "rgba(30,42,94,0)");
    mist.addColorStop(1, "rgba(30,42,94,0.25)");
    ctx.fillStyle = mist;
    ctx.fillRect(0, h - 240, w, 240);
  },
  layout(w, h) {
    return {
      box: { x: w * 0.24, y: h * 0.17, w: w * 0.52, h: h * 0.66 },
      verse: { family: F.quran, size: 36, color: PALE_GOLD, leading: 1.9 },
      intro: { family: F.naskh, weight: 700, size: 44, color: CREAM },
      name: {
        family: F.ruqaa,
        weight: 700,
        size: 116,
        min: 64,
        color: goldText,
        leading: 1.5,
        dy: -0.04,
        shadow: { color: "rgba(240,190,90,0.35)", blur: 28 },
      },
      deed: { family: F.naskh, weight: 700, size: 50, color: CREAM },
      target: { color: "#f0c96a" },
      prayer: { family: F.naskh, size: 35, color: "#cfc6b0", leading: 1.75 },
      footer: { family: F.naskh, size: 28, color: "#b9b097", y: h - 120 },
      divider: { height: 36, draw: rule },
      gaps: { verse: 26, name: 8, deed: 24 },
    };
  },
};

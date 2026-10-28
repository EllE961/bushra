import { F } from "../families";
import { Rng } from "../kit/rng";
import { glow, sparkle, starfield } from "../kit/sky";
import { bezier, constellation, dottedTrail, glowStar, planet, ring, rocket } from "../kit/space";
import type { Paint, Template } from "../types";

const TEXT = "#f4f1ff";
const SOFT = "#cbc4f2";
const YELLOW = "#ffd84d";
const PINK = "#ff8cc6";
const MINT = "#6ff0c8";
const SKY = "#7cc8ff";

const nameFill: Paint = (ctx, box) => {
  const g = ctx.createLinearGradient(box.x, 0, box.x + box.w, 0);
  g.addColorStop(0, "#ff6fa8");
  g.addColorStop(0.5, "#ff9a4a");
  g.addColorStop(1, "#ffd84d");
  return g;
};

/** A small ringed planet between two stars. */
function divider(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  ctx.save();
  ctx.fillStyle = SOFT;
  for (const s of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      ctx.globalAlpha = 0.7 - i * 0.15;
      ctx.beginPath();
      ctx.arc(cx + s * (70 + i * 18), cy, 3 - i * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
  glowStar(ctx, cx - 44, cy, 10, PINK, -0.2);
  glowStar(ctx, cx + 44, cy, 10, MINT, 0.2);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.3);
  ctx.strokeStyle = YELLOW;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(0, 0, 22, 6.5, 0, Math.PI, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "#ff9a6b";
  ctx.beginPath();
  ctx.arc(0, 0, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, 0, 22, 6.5, 0, 0, Math.PI);
  ctx.stroke();
  ctx.restore();
}

export const space: Template = {
  id: "space",
  label: "فضاء",
  tone: "#3a2a8c",
  seed: 47,
  paint(ctx, w, h) {
    const rng = new Rng(47);
    const k = Math.min(1.15, h / 1080);

    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, "#19155a");
    sky.addColorStop(0.5, "#2c2480");
    sky.addColorStop(1, "#5230a0");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // Soft nebulae in the corners, colour rather than mist.
    glow(ctx, 0, h, w * 0.45, "rgba(255,92,170,0.6)", 0.6);
    glow(ctx, w, 0, w * 0.38, "rgba(64,170,255,0.55)", 0.55);
    glow(ctx, w * 0.3, 0, w * 0.25, "rgba(160,110,255,0.4)", 0.4);
    glow(ctx, w * 0.5, h * 0.5, w * 0.36, "rgba(110,90,230,0.45)", 0.4);

    starfield(ctx, rng, w, h, 320, { x: w * 0.2, y: h * 0.14, w: w * 0.6, h: h * 0.72 });

    // Top left: the ringed planet, with a small moon.
    const px = 250;
    const py = 250 * k;
    const pr = 104 * k;
    const rings = ["#fff0a8", "#ffc85a", "#ff8f6b"] as const;
    ring(ctx, px, py, pr, -0.32, 0.3, rings, "back");
    planet(ctx, rng, px, py, pr, {
      light: "#ffd1a8",
      body: "#ff9468",
      dark: "#c94f86",
      bands: [
        [-0.42, 0.1, "rgba(255,214,150,0.55)"],
        [0.05, 0.14, "rgba(232,96,120,0.45)"],
        [0.45, 0.08, "rgba(255,214,150,0.45)"],
      ],
      tilt: -0.32,
    });
    ring(ctx, px, py, pr, -0.32, 0.3, rings, "front");
    planet(ctx, rng, 470, 118 * k, 26 * k, {
      light: "#e9fff8",
      body: "#9fe9d6",
      dark: "#4f9fb0",
      crater: "#76c9bd",
      spots: [
        [0.32, 0.3, 0.2],
        [0.42, -0.36, 0.1],
        [-0.28, 0.52, 0.11],
      ],
    });

    // Bottom left: a picture-book constellation and a pink planet.
    constellation(
      ctx,
      [
        { x: 96, y: h * 0.6 },
        { x: 196, y: h * 0.56 },
        { x: 300, y: h * 0.61 },
        { x: 268, y: h * 0.71 },
        { x: 150, y: h * 0.7 },
        { x: 352, y: h * 0.76 },
      ],
      [
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 4],
        [4, 0],
        [3, 5],
      ],
      "#d9d4ff",
      "#fff3b0",
    );
    planet(ctx, rng, 150, h - 150 * k, 58 * k, {
      light: "#ffd6f0",
      body: "#ff8fcf",
      dark: "#a0489a",
      bands: [
        [-0.3, 0.09, "rgba(255,230,245,0.5)"],
        [0.25, 0.12, "rgba(170,70,150,0.35)"],
      ],
      tilt: 0.25,
    });

    // Bottom right: a big moon rising over the corner, the rocket's launch pad.
    const mx = w - 60;
    const my = h + 90 * k;
    const mr = 330 * k;
    glow(ctx, mx, my, mr * 1.3, "rgba(90,240,220,0.55)", 0.55);
    planet(ctx, rng, mx, my, mr, {
      light: "#b7fff1",
      body: "#45d0c2",
      dark: "#2a6fb0",
      crater: "#36abb0",
      spots: [
        [-0.55, -0.62, 0.09],
        [-0.3, -0.78, 0.06],
        [-0.72, -0.3, 0.12],
        [-0.12, -0.5, 0.13],
        [-0.42, -0.36, 0.05],
      ],
      gloss: false,
    });

    // The rocket climbs away from it, its trail curling up the right margin.
    const rx = w - 232;
    const ry = h * 0.3;
    const rs = 200 * k;
    const ra = 0.38;
    const tail = { x: rx - Math.sin(ra) * rs * 1.08, y: ry + Math.cos(ra) * rs * 1.08 };
    const pad = { x: mx - Math.cos(1.2) * mr, y: my - Math.sin(1.2) * mr };
    dottedTrail(
      ctx,
      bezier(tail, { x: tail.x - 80, y: tail.y + 160 }, { x: pad.x - 120, y: pad.y - 160 }, pad),
      22,
      6,
      "#e6e0ff",
    );
    rocket(ctx, rx, ry, rs, ra, { body: "#fbf9ff", shade: "#c5bdf0", trim: "#ff5f7e", trimDark: "#d63c66", glass: "#3f7fe0" });
    for (const [dx, dy, r] of [
      [-70, 40, 9],
      [60, 130, 7],
      [-10, 175, 6],
    ] as const) {
      sparkle(ctx, tail.x + dx * k, tail.y + dy * k - 60 * k, r * k, "#fff4c4", 0.9);
    }

    // Rounded stars and a few sparkles in the margins.
    for (const [x, y, r, c, rot] of [
      [80, h * 0.42, 16, YELLOW, 0.1],
      [380, h * 0.36, 12, PINK, -0.3],
      [w * 0.29, 66, 11, MINT, 0.2],
      [w * 0.42, 40, 8, YELLOW, -0.1],
      [w * 0.66, 70, 13, YELLOW, 0.25],
      [w - 470, 96, 10, PINK, 0.3],
      [w - 90, h * 0.6, 15, YELLOW, -0.2],
      [w - 420, h * 0.62, 9, SKY, 0.1],
      [w * 0.28, h - 54, 12, PINK, 0.2],
      [w * 0.7, h - 64, 10, MINT, -0.3],
      [430, h - 70, 9, SKY, 0],
    ] as const) {
      glowStar(ctx, x, y, r * k, c, rot);
    }
    for (const [x, y, r] of [
      [w * 0.36, 120, 9],
      [w * 0.58, 50, 7],
      [w - 120, 90, 12],
      [60, 120, 9],
      [w * 0.47, h - 40, 7],
    ] as const) {
      sparkle(ctx, x, y, r * k, "#ffffff", 0.9);
    }
  },
  layout(w, h) {
    const k = Math.max(1, Math.min(1.12, h / w / 0.5625));
    return {
      box: { x: w * 0.22, y: h * 0.15, w: w * 0.56, h: h * 0.68 },
      verse: { family: F.quran, size: 34 * k, color: "#c9c2ff", leading: 1.9 },
      intro: { family: F.round, weight: 600, size: 38 * k, color: TEXT, leading: 1.7 },
      name: {
        family: F.round,
        weight: 700,
        size: 94 * k,
        min: 54,
        color: nameFill,
        leading: 1.55,
        stroke: { color: "#ffffff", width: 8 },
        shadow: { color: "rgba(255,120,210,0.6)", blur: 34 },
      },
      deed: { family: F.round, weight: 600, size: 42 * k, color: TEXT, leading: 1.7 },
      target: { color: YELLOW, weight: 700 },
      prayer: { family: F.round, weight: 400, size: 29 * k, color: SOFT, leading: 1.9, width: w * 0.58 },
      footer: { family: F.round, weight: 500, size: 24 * k, color: "#b3a9e6", y: h - 92 * k },
      divider: { height: 44, draw: divider },
      gaps: { verse: 18, intro: 2, name: 6, deed: 20 },
    };
  },
};

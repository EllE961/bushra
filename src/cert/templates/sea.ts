import { F } from "../families";
import { bloom, crags, dhow, grain, gull, vertical } from "../kit/landscape";
import { Rng } from "../kit/rng";
import { deform, leaf, type Pt, trace, wash } from "../kit/watercolor";
import type { Paint, Template } from "../types";

const NAVY = "#1c3550";
/** Seed for the mountain lines, kept apart so the range holds its shape while the rest is tuned. */
const HILLS = 43;
const TEAL = "#17656f";

type Ctx = CanvasRenderingContext2D;

/** The sea and the hills keep their height in pixels and stretch a little on the taller A4. */
const lift = (h: number) => 1 + (h / 1080 - 1) * 0.6;
const horizonOf = (h: number) => h - 252 * lift(h);

const nameFill: Paint = (ctx, box) => {
  const g = ctx.createLinearGradient(0, box.y, 0, box.y + box.h);
  g.addColorStop(0, "#1f3f5c");
  g.addColorStop(1, "#16505e");
  return g;
};

/** A rule that swells into a small wave at its middle. */
function divider(ctx: Ctx, cx: number, cy: number) {
  ctx.save();
  for (const s of [-1, 1]) {
    const g = ctx.createLinearGradient(cx + s * 40, cy, cx + s * 190, cy);
    g.addColorStop(0, "rgba(23,101,111,0.8)");
    g.addColorStop(1, "rgba(23,101,111,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(cx + s * 40, cy - 1.1);
    ctx.lineTo(cx + s * 190, cy);
    ctx.lineTo(cx + s * 40, cy + 1.1);
    ctx.closePath();
    ctx.fill();
  }
  ctx.strokeStyle = TEAL;
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.beginPath();
  for (let i = 0; i <= 60; i++) {
    const t = i / 60;
    const x = cx - 40 + t * 80;
    const y = cy - Math.sin(t * Math.PI * 4) * 5.5 * Math.pow(Math.sin(t * Math.PI), 0.4);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.restore();
}

export const sea: Template = {
  id: "sea",
  label: "بحر",
  tone: "#2f8a9e",
  seed: 53,
  paint(ctx, w, h) {
    const rng = new Rng(53);
    const k = lift(h);
    const hz = horizonOf(h);

    // Sky: a soft aqua overhead clearing to a pale haze at the horizon.
    ctx.fillStyle = vertical(ctx, 0, hz, [
      [0, "#cbe4e6"],
      [0.5, "#e2efed"],
      [0.88, "#f2f4ec"],
      [1, "#f5f3ea"],
    ]);
    ctx.fillRect(0, 0, w, h);
    bloom(ctx, w * 0.6, hz - 30, 760, "rgba(255,251,240,0.9)", 0.6);

    // Thin high cloud in the corners, each a few soft streaks.
    for (const [x, y, len] of [
      [0.1, 0.15, 520],
      [0.9, 0.22, 480],
    ] as const) {
      for (let i = 0; i < 5; i++) {
        const cx = w * x + rng.range(-0.4, 0.4) * len;
        const cy = h * y + rng.range(-30, 30);
        const rx = len * rng.range(0.25, 0.45);
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(1, rng.range(0.035, 0.06));
        bloom(ctx, 0, 0, rx, "rgba(255,255,255,0.75)", rng.range(0.5, 0.8));
        ctx.restore();
      }
    }

    // The Hajar range: a far pale line and a nearer one, open in the middle, lost in haze at the foot.
    const hills = new Rng(HILLS);
    const range = (peaks: [number, number][], color: string) => {
      const line = crags(hills, peaks, 0.2, 4, hz);
      const shape: Pt[] = [...line.map((p) => ({ ...p, v: 1 })), { x: w + 80, y: hz + 4, v: 0 }, { x: -80, y: hz + 4, v: 0 }];
      wash(ctx, hills, shape, color, { layers: 10, alpha: 0.13, spread: 0.06, jitter: 0.05, rim: 0.5 });
    };
    range(
      [
        [-80, hz - 110 * k],
        [w * 0.05, hz - 168 * k],
        [w * 0.15, hz - 132 * k],
        [w * 0.24, hz - 100 * k],
        [w * 0.34, hz - 46 * k],
        [w * 0.44, hz - 10],
        [w * 0.58, hz - 12],
        [w * 0.68, hz - 58 * k],
        [w * 0.78, hz - 112 * k],
        [w * 0.9, hz - 176 * k],
        [w + 80, hz - 130 * k],
      ],
      "#a7c2cf",
    );
    ctx.fillStyle = vertical(ctx, hz - 150 * k, hz, [
      [0, "rgba(243,244,236,0)"],
      [1, "rgba(243,244,236,0.8)"],
    ]);
    ctx.fillRect(0, hz - 150 * k, w, 150 * k);
    range(
      [
        [-80, hz - 64 * k],
        [w * 0.03, hz - 104 * k],
        [w * 0.12, hz - 76 * k],
        [w * 0.21, hz - 44 * k],
        [w * 0.29, hz - 8],
        [w * 0.72, hz - 8],
        [w * 0.82, hz - 52 * k],
        [w * 0.94, hz - 100 * k],
        [w + 80, hz - 70 * k],
      ],
      "#7fa3b4",
    );
    ctx.fillStyle = vertical(ctx, hz - 90 * k, hz, [
      [0, "rgba(243,244,236,0)"],
      [1, "rgba(243,244,236,0.85)"],
    ]);
    ctx.fillRect(0, hz - 90 * k, w, 90 * k);

    // The sea: a light underwash, then horizontal strokes of teal and turquoise,
    // deep and thin at the horizon, lighter and broader toward the viewer.
    const water = new Rng(67);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, hz, w, h - hz + 10);
    ctx.clip();
    ctx.fillStyle = vertical(ctx, hz, h, [
      [0, "#5f9fa8"],
      [0.3, "#8cc4c3"],
      [1, "#c4e6dd"],
    ]);
    ctx.fillRect(0, hz, w, h - hz);
    const deep = ["#2b6f80", "#337b8b", "#2e7288"];
    const mid = ["#3a8f9a", "#46a1a4", "#3b8a98"];
    const near = ["#52b3af", "#66c2b9", "#48a5a5", "#84d3c6"];
    const rows = 15;
    for (let r = 0; r < rows; r++) {
      const t = r / (rows - 1);
      const y = hz + 4 + Math.pow(t, 1.6) * (h - hz - 10);
      const thick = (6 + t * 36) * k;
      const pal = t < 0.2 ? deep : t < 0.55 ? mid : near;
      let x = water.range(-320, -40);
      while (x < w + 60) {
        const len = water.range(260, 700) * (0.55 + t * 0.9);
        wash(ctx, water, leaf(x, y + water.gauss(0, thick * 0.2), 0, len, thick, water.range(-0.02, 0.02)), water.pick(pal), {
          layers: 6,
          alpha: 0.14,
          spread: 0.05,
          jitter: 0.07,
          rim: 0.9,
        });
        x += len * water.range(0.55, 0.95);
      }
    }
    // A firmer line where the sea meets the sky.
    ctx.fillStyle = vertical(ctx, hz, hz + 8, [
      [0, "rgba(38,100,116,0.55)"],
      [1, "rgba(38,100,116,0)"],
    ]);
    ctx.fillRect(0, hz, w, 8);

    // Light on the water under the brightest sky.
    ctx.save();
    ctx.translate(w * 0.6, hz + 6);
    ctx.scale(1, 0.16);
    bloom(ctx, 0, 0, 640, "rgba(236,250,246,0.85)", 0.55);
    ctx.restore();

    // Wave crests: soft slivers of white, small at the horizon and broader near the foot.
    ctx.fillStyle = "#ffffff";
    for (let r = 0; r < 12; r++) {
      const t = (r + 0.5) / 12;
      const y = hz + 10 + Math.pow(t, 1.6) * (h - hz - 14);
      const sc = 0.3 + t * 1.5;
      let x = water.range(-200, 100);
      while (x < w + 100) {
        const len = water.range(40, 160) * sc;
        if (water.chance(0.3 - t * 0.2)) {
          x += len * 3;
          continue;
        }
        const thick = water.range(2.4, 5.5) * sc;
        const shape = leaf(x, y + water.gauss(0, 4 * sc), water.gauss(0, 0.015), len, thick, water.range(-0.06, 0.02));
        wash(ctx, water, shape, "#ffffff", { layers: 4, alpha: 0.3, spread: 0.06, jitter: 0.1, texture: false });
        if (t > 0.3 && water.chance(0.6)) {
          // A brighter core where the crest breaks.
          ctx.globalAlpha = 0.75;
          trace(ctx, deform(leaf(x + len * 0.2, y - thick * 0.1, 0, len * 0.5, thick * 0.4), 2, 0.04, water));
          ctx.fill();
        }
        x += len + water.range(140, 460) * sc;
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // A dhow running along the horizon, her shadow on the water beneath.
    const bx = w * 0.79;
    const by = hz + 24 * k;
    const bs = 176 * Math.min(1.12, k);
    // Her reflection, broken into short strokes by the swell.
    ctx.save();
    ctx.fillStyle = "#2b4f57";
    for (const [dx, dy, len, a] of [
      [-0.02, 0.05, 0.8, 0.3],
      [0.06, 0.085, 0.6, 0.22],
      [-0.06, 0.12, 0.44, 0.16],
      [0.03, 0.155, 0.3, 0.1],
    ] as const) {
      ctx.globalAlpha = a;
      ctx.beginPath();
      ctx.ellipse(bx + dx * bs, by + dy * bs, (len * bs) / 2, bs * 0.012, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    dhow(ctx, bx, by, bs, {
      hull: "#4e3226",
      trim: "#c8a274",
      sail: "#fbf5e9",
      shade: "#d6c5a8",
      rigging: "#3e2a20",
      flag: "#b8322a",
    });
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = 1.8;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(bx - bs * 0.42, by + 1);
    ctx.quadraticCurveTo(bx, by + 4, bx + bs * 0.62, by - 1);
    ctx.stroke();
    ctx.restore();

    // Gulls over the open corners.
    for (const [x, y, s, t, l] of [
      [0.085, 0.3, 62, -0.08, 0.6],
      [0.135, 0.37, 42, 0.1, 0.3],
      [0.88, 0.31, 54, 0.06, 0.5],
      [0.84, 0.39, 34, -0.12, 0.8],
    ] as const) {
      gull(ctx, w * x, h * y, s, "rgba(56,82,96,0.8)", t, l);
    }

    grain(ctx, w, h, 0.07);
  },
  layout(w, h) {
    const hz = horizonOf(h);
    return {
      box: { x: w * 0.22, y: h * 0.05, w: w * 0.56, h: hz - 96 - h * 0.05 },
      verse: { family: F.quran, size: 34, color: "#4a7f88", leading: 1.9 },
      intro: { family: F.naskh, weight: 700, size: 42, color: NAVY },
      name: { family: F.ruqaa, weight: 700, size: 108, min: 60, color: nameFill, leading: 1.45, dy: -0.04 },
      deed: { family: F.naskh, weight: 700, size: 47, color: NAVY },
      target: { color: TEAL },
      prayer: { family: F.naskh, size: 33, color: "#34536a", leading: 1.7 },
      footer: { family: F.naskh, weight: 700, size: 27, color: "#3b5b6e", y: hz - 42 },
      divider: { height: 34, draw: divider },
      gaps: { verse: 20, intro: 2, name: 6, deed: 20 },
    };
  },
};

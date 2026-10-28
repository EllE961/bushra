import { F } from "../families";
import { bird, bloom, dune, type DuneTone, grain, heightAt, palm, ridge, ripples, vertical, watchtower } from "../kit/landscape";
import { Rng } from "../kit/rng";
import type { Template } from "../types";

const ESPRESSO = "#3b2317";
const TERRACOTTA = "#b0502c";

type Ctx = CanvasRenderingContext2D;

/** Dune heights are given for the wide sheet and stretch a little on the taller A4. */
const lift = (h: number) => 1 + (h / 1080 - 1) * 0.6;

const TONES: DuneTone[] = [
  { lit: ["#efbca8", "#e8ae9e"], shade: ["#d8988f", "rgba(220,160,150,0.6)", "rgba(226,170,158,0)"], depth: 160, crest: "#fde6cc", crestAlpha: 0.8 },
  { lit: ["#f2b994", "#e6a283"], shade: ["#cf846e", "rgba(212,140,116,0.7)", "rgba(222,156,128,0)"], depth: 180, crest: "#fde3bf" },
  { lit: ["#f2b47f", "#e19966"], shade: ["#c26f4b", "rgba(200,122,84,0.7)", "rgba(212,138,98,0)"], depth: 200, crest: "#fde0b0" },
  { lit: ["#f5c991", "#e7a96f"], shade: ["#b5623d", "rgba(190,110,70,0.75)", "rgba(205,130,86,0)"], depth: 240, crest: "#fff1d2" },
];

/** A setting sun on a rule: the line runs out either side and fades. */
function divider(ctx: Ctx, cx: number, cy: number) {
  ctx.save();
  for (const s of [-1, 1]) {
    const g = ctx.createLinearGradient(cx + s * 20, cy, cx + s * 170, cy);
    g.addColorStop(0, "rgba(176,80,44,0.85)");
    g.addColorStop(1, "rgba(176,80,44,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(cx + s * 16, cy + 3.2);
    ctx.lineTo(cx + s * 170, cy + 4);
    ctx.lineTo(cx + s * 16, cy + 4.8);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = TERRACOTTA;
  ctx.beginPath();
  ctx.arc(cx, cy + 4, 10, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = TERRACOTTA;
  ctx.lineWidth = 1.6;
  ctx.lineCap = "round";
  for (const a of [-150, -120, -90, -60, -30]) {
    const t = (a * Math.PI) / 180;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(t) * 15, cy + 4 + Math.sin(t) * 15);
    ctx.lineTo(cx + Math.cos(t) * 21, cy + 4 + Math.sin(t) * 21);
    ctx.stroke();
  }
  ctx.restore();
}

export const desert: Template = {
  id: "desert",
  label: "صحراء",
  tone: "#d9965b",
  seed: 41,
  paint(ctx, w, h) {
    const rng = new Rng(41);
    const k = lift(h);
    const Y = (d: number) => h - d * k;

    // Golden hour: apricot overhead, rose through the middle, pale gold at the horizon.
    ctx.fillStyle = vertical(ctx, 0, Y(260), [
      [0, "#eda582"],
      [0.34, "#f2b9a4"],
      [0.72, "#f7cfa6"],
      [1, "#fadcb4"],
    ]);
    ctx.fillRect(0, 0, w, h);

    // The sun, low and soft, half sunk behind the far dunes.
    const sun = { x: w * 0.215, y: Y(350), r: 138 };
    bloom(ctx, sun.x, sun.y, 1000, "rgba(255,214,160,0.75)", 0.7);
    bloom(ctx, sun.x, sun.y, 300, "rgba(255,236,200,0.9)", 0.75);
    ctx.save();
    ctx.shadowColor = "rgba(255,240,205,1)";
    ctx.shadowBlur = 48;
    ctx.fillStyle = vertical(ctx, sun.y - sun.r, sun.y + sun.r * 0.4, [
      [0, "#fffcf2"],
      [1, "#ffefc8"],
    ]);
    ctx.beginPath();
    ctx.arc(sun.x, sun.y, sun.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // A few birds, far off, in the open corners.
    for (const [x, y, s, f, t] of [
      [0.085, 0.2, 46, 0.7, -0.12],
      [0.125, 0.25, 34, -0.2, 0.06],
      [0.15, 0.17, 28, 0.9, -0.04],
      [0.875, 0.13, 36, 0.4, 0.1],
      [0.905, 0.17, 26, -0.4, 0],
    ] as const) {
      bird(ctx, w * x, h * y, s, f, "rgba(88,48,36,0.78)", t);
    }

    const ridges = [
      ridge(
        [
          { x: -80, y: Y(350) },
          { x: w * 0.04, y: Y(398) },
          { x: w * 0.17, y: Y(338) },
          { x: w * 0.33, y: Y(368) },
          { x: w * 0.47, y: Y(306) },
          { x: w * 0.61, y: Y(330) },
          { x: w * 0.72, y: Y(300) },
          { x: w * 0.86, y: Y(408) },
          { x: w + 80, y: Y(350) },
        ],
        0.5,
      ),
      ridge(
        [
          { x: -80, y: Y(240) },
          { x: w * 0.12, y: Y(298) },
          { x: w * 0.3, y: Y(214) },
          { x: w * 0.47, y: Y(256) },
          { x: w * 0.6, y: Y(214) },
          { x: w * 0.78, y: Y(318) },
          { x: w * 0.93, y: Y(250) },
          { x: w + 80, y: Y(272) },
        ],
        0.6,
      ),
      ridge(
        [
          { x: -80, y: Y(150) },
          { x: w * 0.2, y: Y(222) },
          { x: w * 0.37, y: Y(150) },
          { x: w * 0.55, y: Y(186) },
          { x: w * 0.7, y: Y(134) },
          { x: w + 80, y: Y(168) },
        ],
        0.65,
      ),
      ridge(
        [
          { x: -80, y: Y(124) },
          { x: w * 0.1, y: Y(160) },
          { x: w * 0.42, y: Y(88) },
          { x: w * 0.68, y: Y(108) },
          { x: w * 0.9, y: Y(196) },
          { x: w + 80, y: Y(176) },
        ],
        0.55,
      ),
    ];

    ridges.forEach((r, i) => {
      if (i === 0) {
        // A watchtower and its wall on the far crest, against the glow; the dune buries its foot.
        const tx = w * 0.046;
        watchtower(ctx, tx, heightAt(r, tx) + 4, 34, "#c98676", -1);
      }
      dune(ctx, r, h + 10, sun.x, TONES[i]);
      if (i === 1) {
        // Two palms in the middle distance, crossing the foot of the sun.
        for (const [x, ht, lean] of [
          [0.118, 158, -0.04],
          [0.136, 122, 0.05],
        ] as const) {
          palm(ctx, rng, w * x, heightAt(r, w * x) + 10, ht * k, lean, "#a8644f");
        }
      }
      if (i < ridges.length - 1) {
        // Haze pooled in the hollow before the next ridge.
        const top = Math.min(...r.pts.map((p) => p.y));
        ctx.fillStyle = vertical(ctx, top + 20, top + 230, [
          [0, "rgba(252,230,194,0)"],
          [1, "rgba(252,230,194,0.6)"],
        ]);
        ctx.fillRect(0, top + 20, w, h);
      }
    });

    const front = ridges[ridges.length - 1];
    ripples(ctx, rng, front, h + 10, w * 0.12, w * 0.8, 9, "rgba(176,98,56,1)", 0.3);

    // A grove on the near dune, right.
    for (const [x, ht, lean] of [
      [0.87, 300, -0.06],
      [0.925, 236, 0.05],
      [0.965, 330, 0.02],
    ] as const) {
      palm(ctx, rng, w * x, heightAt(front, w * x) + 16, ht * k, lean, "#4f2c20");
    }

    grain(ctx, w, h, 0.07);
  },
  layout(w, h) {
    const land = h - 340 * lift(h);
    return {
      box: { x: w * 0.22, y: h * 0.05, w: w * 0.56, h: land - h * 0.05 },
      verse: { family: F.quran, size: 34, color: "#8b5640", leading: 1.9 },
      intro: { family: F.naskh, weight: 700, size: 42, color: ESPRESSO },
      name: { family: F.ruqaa, weight: 700, size: 108, min: 60, color: ESPRESSO, leading: 1.45, dy: -0.04 },
      deed: { family: F.naskh, weight: 700, size: 47, color: ESPRESSO },
      target: { color: TERRACOTTA },
      prayer: { family: F.naskh, size: 33, color: "#5a3626", leading: 1.7 },
      footer: { family: F.naskh, weight: 700, size: 27, color: "#5a3424", y: h - 52 * lift(h) },
      divider: { height: 34, draw: divider },
      gaps: { verse: 20, intro: 2, name: 6, deed: 20 },
    };
  },
};

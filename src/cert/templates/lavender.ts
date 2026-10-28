import { F } from "../families";
import { roundRect } from "../kit/ornament";
import { paper } from "../kit/paper";
import { Rng } from "../kit/rng";
import { curve, deform, ellipse, leaf, type Pt, stroke, wash } from "../kit/watercolor";
import type { Template } from "../types";

type Ctx = CanvasRenderingContext2D;

const INK = "#4a2a58";
const VIOLET = "#7b4fa8";
const FRAME = "#a58cc4";
const STEM = "#7d8c72";
const LEAVES = ["#94a48d", "#82947f", "#a9b4a1", "#8a9a90", "#b3bcab"];
const EUCALYPTUS = ["#9fb2ab", "#8fa59e", "#b2c2b9"];

/** Bud colours per spike, so the bunch is not one flat purple: some bluer, some pinker. */
const SPIKES = [
  { buds: ["#8762c2", "#7350ad", "#a083d8", "#b69ee2"], deep: "#4f3486" },
  { buds: ["#7a6ad0", "#6656bd", "#978bdd", "#b1a8ea"], deep: "#433a8c" },
  { buds: ["#9f6fc8", "#8a58b6", "#b58fda", "#c9ade6"], deep: "#5f3784" },
];

/**
 * A tiny watercolor dab. wash() re-roughens the outline on every layer, which is
 * lost on a shape this small and costly by the thousand, so a bud is roughened
 * once and laid down as a few glazes, each a little shifted and resized.
 */
function dab(ctx: Ctx, rng: Rng, shape: Pt[], color: string, layers: number, alpha: number, shrink = 0.72, wobble = 0.12) {
  const pts = deform(shape, 2, 0.16, rng);
  let cx = 0;
  let cy = 0;
  for (const p of pts) {
    cx += p.x / pts.length;
    cy += p.y / pts.length;
  }
  const drift = Math.hypot(pts[0].x - cx, pts[0].y - cy) * wobble;
  ctx.fillStyle = color;
  for (let i = 0; i < layers; i++) {
    const s = rng.range(shrink, 1.08);
    const ox = cx + rng.gauss(0, drift);
    const oy = cy + rng.gauss(0, drift);
    ctx.globalAlpha = alpha * rng.range(0.6, 1.35);
    ctx.beginPath();
    for (let j = 0; j < pts.length; j++) {
      const x = ox + (pts[j].x - cx) * s;
      const y = oy + (pts[j].y - cy) * s;
      if (j === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }
}

/** Squashes a shape toward (cx, cy) across `rot`, so a flower can face a little away. */
function foreshorten(pts: Pt[], cx: number, cy: number, squash: number, rot: number): Pt[] {
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  return pts.map((p) => {
    const dx = p.x - cx;
    const dy = p.y - cy;
    const u = dx * c + dy * s;
    const v = (-dx * s + dy * c) * squash;
    return { x: cx + u * c - v * s, y: cy + u * s + v * c, v: p.v };
  });
}

/** One stem of lavender: bare below, then whorls of buds that close up and shrink toward the tip. */
function spike(ctx: Ctx, rng: Rng, bx: number, by: number, angle: number, len: number, k: number, fade = 1) {
  const tx = bx + Math.cos(angle) * len;
  const ty = by + Math.sin(angle) * len;
  const bend = rng.range(-0.08, 0.08) * len;
  const cx = (bx + tx) / 2 - Math.sin(angle) * bend;
  const cy = (by + ty) / 2 + Math.cos(angle) * bend;
  const at = (t: number) => {
    const u = 1 - t;
    return { x: u * u * bx + 2 * u * t * cx + t * t * tx, y: u * u * by + 2 * u * t * cy + t * t * ty };
  };
  const dir = (t: number) => Math.atan2((1 - t) * (cy - by) + t * (ty - cy), (1 - t) * (cx - bx) + t * (tx - cx));

  const spikeLen = Math.min(len * rng.range(0.36, 0.44), 250 * k);
  const t0 = 1 - spikeLen / len;
  stroke(ctx, rng, Array.from({ length: 15 }, (_, i) => at((i / 14) * (t0 + (1 - t0) * 0.92))), STEM, 2.4 * k, 0.6 * fade);

  // A pale bleed behind the flowers, where the wet paint spread past the buds.
  const mt = t0 + (1 - t0) * 0.45;
  const mid = at(mt);
  wash(ctx, rng, ellipse(mid.x, mid.y, spikeLen * 0.56, 15 * k, dir(mt), 7), "#c6b0e8", {
    layers: 4,
    alpha: 0.07 * fade,
    spread: 0.2,
    jitter: 0.2,
    texture: false,
  });

  const pal = rng.pick(SPIKES);
  const n = Math.max(4, Math.round(spikeLen / (17 * k)));
  ctx.save();
  for (let i = 0; i < n; i++) {
    const u = 1 - Math.pow(1 - i / (n - 1), 1.4);
    const t = t0 + (1 - t0) * u;
    const p = at(t);
    const a = dir(t);
    const s = k * (1.12 - 0.6 * u);
    const count = u > 0.94 ? 2 : u > 0.8 ? 3 : rng.int(4, 6);
    for (let j = 0; j < count; j++) {
      const across = (((j + 0.5) / count) * 2 - 1) * 8.5 * s + rng.gauss(0, 1.3 * s);
      const along = rng.gauss(0, 2.4 * s);
      const x = p.x + Math.cos(a) * along - Math.sin(a) * across;
      const y = p.y + Math.sin(a) * along + Math.cos(a) * across;
      const tilt = a + Math.sign(across || 1) * rng.range(0.25, 0.85);
      const L = rng.range(12.5, 17.5) * s;
      // The buds behind the stem in shadow, those in front lighter.
      const back = j % 2 === 0;
      const color = back ? pal.deep : u > 0.75 ? pal.buds[rng.int(2, 3)] : rng.pick(pal.buds);
      dab(ctx, rng, ellipse(x + Math.cos(tilt) * L * 0.3, y + Math.sin(tilt) * L * 0.3, L * 0.55, L * 0.33, tilt, 6), color, 6, (back ? 0.15 : 0.22) * fade);
    }
  }
  ctx.restore();
}

function chamomile(ctx: Ctx, rng: Rng, x: number, y: number, r: number, squash = 0.85, rot = 0) {
  const n = rng.int(13, 16);
  const turn = rng.range(0, Math.PI * 2);
  for (let i = 0; i < n; i++) {
    const a = turn + (i / n) * Math.PI * 2 + rng.gauss(0, 0.06);
    const len = r * rng.range(0.86, 1.04);
    const shape = ellipse(x + Math.cos(a) * len * 0.55, y + Math.sin(a) * len * 0.55, len * 0.47, r * 0.16, a, 6);
    wash(ctx, rng, foreshorten(shape, x, y, squash, rot), "#fffdf9", { layers: 8, alpha: 0.18, spread: 0.1, jitter: 0.14, shade: "#e0d5ea", rim: 1.6 });
  }
  wash(ctx, rng, foreshorten(ellipse(x, y, r * 0.3, r * 0.3, 0, 8), x, y, squash, rot), "#f3c84c", {
    layers: 10,
    alpha: 0.15,
    spread: 0.08,
    jitter: 0.12,
    shade: "#de9b2e",
    rim: 1,
  });
  // Speckled seeds, heavier on the shaded side; a ring of dots would read as a face.
  ctx.save();
  ctx.fillStyle = "#b8741d";
  for (let i = 0; i < 16; i++) {
    const a = rng.range(-0.6, 2.4);
    const d = Math.sqrt(rng.next()) * r * 0.25;
    ctx.globalAlpha = rng.range(0.35, 0.75);
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d * squash, r * rng.range(0.018, 0.034), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function blade(ctx: Ctx, rng: Rng, x: number, y: number, angle: number, len: number) {
  ctx.save();
  dab(ctx, rng, leaf(x, y, angle, len, len * rng.range(0.07, 0.1), rng.range(-0.12, 0.12)), rng.pick(LEAVES), 6, 0.15, 0.94, 0.02);
  ctx.restore();
}

/** A eucalyptus stem: a gentle curve with round grey leaves in pairs. */
function eucalyptus(ctx: Ctx, rng: Rng, x: number, y: number, angle: number, len: number, k: number) {
  const n = 7;
  const pts = Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const a = angle + t * rng.range(-0.25, 0.25);
    return { x: x + Math.cos(a) * len * t, y: y + Math.sin(a) * len * t };
  });
  stroke(ctx, rng, pts, "#7f8f86", 2 * k, 0.55);
  for (let i = 1; i <= n; i++) {
    const p = pts[i];
    const r = (24 - i * 1.6) * k;
    for (const side of [-1, 1]) {
      if (i === n && side > 0) continue;
      const a = angle + side * 1.25 + rng.gauss(0, 0.15);
      const lx = p.x + Math.cos(a) * r * 0.9;
      const ly = p.y + Math.sin(a) * r * 0.9;
      wash(ctx, rng, ellipse(lx, ly, r, r * 0.78, a, 10), rng.pick(EUCALYPTUS), { layers: 9, alpha: 0.1, spread: 0.06, jitter: 0.1, shade: "#86a096", rim: 0.45, texture: false });
    }
  }
}

/** A bunch rising from a bottom corner and fanning in toward the middle. `side` is 1 for the left corner. */
function bouquet(ctx: Ctx, rng: Rng, w: number, h: number, side: 1 | -1, k: number) {
  const rx = side > 0 ? 70 : w - 70;
  const ry = h + 70;
  const toward = (theta: number) => -Math.PI / 2 + side * theta;

  wash(ctx, rng, ellipse(rx + side * 120, h - 250 * k, 330, 380 * k, side * 0.3, 9), "#d9c6ef", { layers: 4, alpha: 0.08, spread: 0.3, jitter: 0.3, texture: false });

  // A paler, smaller row behind, for depth.
  for (let i = 0; i < 9; i++) {
    const f = i / 8;
    spike(ctx, rng, rx + side * (60 + 330 * f), h + 20, toward(-0.1 + 0.5 * f + rng.gauss(0, 0.05)), h * (0.5 - 0.3 * f) * rng.range(0.85, 1.1), k * 0.8, 0.45);
  }

  for (let i = 0; i < 9; i++) blade(ctx, rng, rx + side * rng.range(0, 90), h + 10, toward(rng.range(-0.3, 1.2)), rng.range(140, 260) * k);
  eucalyptus(ctx, rng, rx + side * 40, h + 20, toward(0.95), 330 * k, k);
  eucalyptus(ctx, rng, rx - side * 10, h + 20, toward(0.12), 300 * k, k);

  const stems = 15;
  for (let i = 0; i < stems; i++) {
    const f = i / (stems - 1);
    const theta = -0.14 + 1.2 * f + rng.gauss(0, 0.04);
    const len = h * (0.76 - 0.42 * Math.pow(f, 0.8)) * rng.range(0.9, 1.05);
    spike(ctx, rng, rx + rng.gauss(0, 14), ry, toward(theta), len, k);
  }

  for (let i = 0; i < 6; i++) blade(ctx, rng, rx + side * rng.range(40, 200), h + 10, toward(rng.range(0.1, 1.3)), rng.range(90, 170) * k);

  for (const [dx, dy, r] of [
    [150, 150, 46],
    [270, 70, 36],
    [40, 250, 34],
    [330, 175, 26],
    [70, 60, 30],
  ] as const) {
    const fx = rx + side * dx * k;
    const fy = h - dy * k;
    // A thin stem down into the bunch, so the flower is held rather than floating.
    stroke(ctx, rng, curve(fx, fy, fx - side * 30 * k, (fy + h) / 2, rx + side * dx * 0.5 * k, h + 20), STEM, 2 * k, 0.5);
    chamomile(ctx, rng, fx, fy, r * k, rng.range(0.72, 0.95), rng.range(-0.4, 0.4));
  }
}

export const lavender: Template = {
  id: "lavender",
  label: "خزامى",
  tone: "#b7a3d9",
  seed: 41,
  paint(ctx, w, h) {
    const rng = new Rng(41);
    paper(ctx, w, h, "#f4edf7", { grain: 0.7, mottle: ["#e9daf0", "#fbf7fc", "#eee0f2"], vignette: "rgba(100,70,130,0.10)" });

    // A fine frame that fades out as it comes down, so the flowers grow out of the open foot.
    ctx.save();
    const fade = ctx.createLinearGradient(0, 0, 0, h);
    fade.addColorStop(0, FRAME);
    fade.addColorStop(0.5, FRAME);
    fade.addColorStop(0.82, "rgba(165,140,196,0)");
    ctx.strokeStyle = fade;
    ctx.lineWidth = 1.6;
    roundRect(ctx, 46, 46, w - 92, h - 92, 4);
    ctx.stroke();
    ctx.restore();

    const k = Math.min(1.15, h / 1080);

    // A low meadow between the two bunches, in clumps, rising toward them.
    for (let x = 330; x <= w - 330; x += rng.range(16, 30)) {
      const d = Math.abs(x - w / 2) / (w / 2 - 330);
      const clump = 0.5 + 0.5 * Math.sin(x * 0.011 + 1.3) * Math.sin(x * 0.0047);
      blade(ctx, rng, x, h + 6, -Math.PI / 2 + rng.gauss(0, 0.5), (30 + 70 * d * d) * k * rng.range(0.6, 1.1));
      if (rng.chance(0.15 + 0.5 * clump + 0.3 * d)) {
        const len = (50 + 120 * d * d) * k * rng.range(0.7, 1.15) * (0.75 + 0.4 * clump);
        spike(ctx, rng, x, h + 12, -Math.PI / 2 + rng.gauss(0, 0.13), len, k * 0.8);
      }
    }
    for (const fx of [0.31, 0.43, 0.58, 0.69]) {
      chamomile(ctx, rng, w * fx + rng.range(-20, 20), h - rng.range(16, 34) * k, rng.range(15, 20) * k, rng.range(0.7, 0.9), rng.range(-0.3, 0.3));
    }

    bouquet(ctx, rng, w, h, 1, k);
    bouquet(ctx, rng, w, h, -1, k);
  },
  layout(w, h) {
    const k = Math.max(1, Math.min(1.12, h / w / 0.5625));
    return {
      box: { x: w * 0.22, y: h * 0.15, w: w * 0.56, h: h * 0.62 },
      verse: { family: F.quran, size: 35 * k, color: "#8a6c9c", leading: 1.9 },
      intro: { family: F.naskh, weight: 700, size: 44 * k, color: "#5d3f6b" },
      name: { family: F.ruqaa, weight: 700, size: 112 * k, min: 62, color: INK, leading: 1.5, dy: -0.04 },
      deed: { family: F.naskh, weight: 700, size: 48 * k, color: INK },
      target: { color: VIOLET },
      prayer: { family: F.naskh, size: 35 * k, color: "#6a5577", leading: 1.75 },
      footer: { family: F.naskh, size: 27 * k, color: "#7e6a8a", y: h - 128 * k },
      divider: {
        height: 36,
        draw(ctx, cx, cy) {
          ctx.save();
          ctx.fillStyle = FRAME;
          for (const s of [-1, 1]) {
            ctx.beginPath();
            ctx.moveTo(cx + s * 26, cy - 1.1);
            ctx.lineTo(cx + s * 170, cy);
            ctx.lineTo(cx + s * 26, cy + 1.1);
            ctx.closePath();
            ctx.fill();
          }
          // Three buds in a little fan.
          ctx.fillStyle = VIOLET;
          for (const a of [-0.55, 0, 0.55]) {
            ctx.beginPath();
            ctx.ellipse(cx + Math.sin(a) * 9, cy - Math.cos(a) * 9 + 4, 4.2, 7.5, a, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        },
      },
      gaps: { verse: 22, name: 8, deed: 22 },
    };
  },
};

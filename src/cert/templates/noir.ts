import { surface } from "../canvas";
import { F } from "../families";
import { fan, ribbon, shade, trace, veinPath, type P } from "../kit/deco";
import { paper } from "../kit/paper";
import { Rng } from "../kit/rng";
import { foil } from "../kit/tazhib";
import type { Paint, Template } from "../types";

type Ctx = CanvasRenderingContext2D;

const GROUND = "#0f0e0d";
const IVORY = "#ece3cf";

const goldFoil: Paint = (ctx, box) => {
  const g = ctx.createLinearGradient(box.x, box.y - box.h * 0.15, box.x + box.h * 0.35, box.y + box.h * 1.1);
  g.addColorStop(0, "#fbecbd");
  g.addColorStop(0.32, "#e4c47c");
  g.addColorStop(0.5, "#b68a3e");
  g.addColorStop(0.64, "#d7b066");
  g.addColorStop(1, "#f4dd9f");
  return g;
};

function frame(w: number, h: number) {
  const k = h / w > 0.6 ? 1.14 : 1;
  return { outer: 38, inner: 50, fanR: 100 * k, k };
}

/** Large soft clouds of lighter and darker stone, drawn out along the grain. */
function clouds(ctx: Ctx, rng: Rng, w: number, h: number, heading: number) {
  for (let i = 0; i < 16; i++) {
    const x = rng.range(-0.1, 1.1) * w;
    const y = rng.range(-0.1, 1.1) * h;
    const rx = rng.range(0.12, 0.34) * w;
    const light = i % 3 !== 0;
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, light ? `rgba(84,78,70,${rng.range(0.14, 0.26)})` : `rgba(0,0,0,${rng.range(0.3, 0.45)})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(heading + rng.gauss(0, 0.15));
    ctx.scale(1, rng.range(0.18, 0.4));
    ctx.fillStyle = g;
    ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
    ctx.restore();
  }
}

function stroke(ctx: Ctx, pts: P[]) {
  ctx.beginPath();
  trace(ctx, pts, false);
  ctx.stroke();
}

/** One vein and its offshoots: a faint haze along it, then a hairline that swells and thins. */
function vein(ctx: Ctx, rng: Rng, pts: P[], gold: boolean, weight: number, depth = 0) {
  const ph = rng.range(0, 6);
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = gold ? "rgba(214,174,98,0.03)" : "rgba(210,202,190,0.018)";
  ctx.lineWidth = 16 * weight;
  stroke(ctx, pts);
  ctx.lineWidth = 4 * weight;
  ctx.strokeStyle = gold ? "rgba(214,174,98,0.07)" : "rgba(210,202,190,0.045)";
  stroke(ctx, pts);
  ctx.fillStyle = gold ? "rgba(222,184,108,0.75)" : "rgba(226,220,210,0.3)";
  if (gold) shade(ctx, "rgba(222,184,108,0.45)", 6);
  // The vein swells and thins, and here and there sinks below the polish altogether.
  const ph2 = rng.range(0, 6);
  ribbon(ctx, pts, (t) => {
    const body = 0.5 + 0.5 * Math.sin(t * 11 + ph) + 0.35 * Math.sin(t * 29 + ph2);
    return weight * 1.8 * Math.sin(Math.PI * t) ** 0.5 * Math.max(0, Math.min(1.2, body));
  });
  ctx.restore();

  if (depth > 0) return;
  const n = rng.int(1, 3);
  for (let i = 0; i < n; i++) {
    const at = rng.int(Math.floor(pts.length * 0.15), Math.floor(pts.length * 0.8));
    const p = pts[at];
    const q = pts[Math.min(pts.length - 1, at + 2)];
    const heading = Math.atan2(q.y - p.y, q.x - p.x) + (rng.chance(0.5) ? 1 : -1) * rng.range(0.35, 0.8);
    vein(ctx, rng, veinPath(rng, p.x, p.y, heading, rng.range(90, 320)), gold, weight * 0.55, depth + 1);
  }
}

/** Black marble: dark ground, clouds along the grain, and a few fine veins kept clear of the words. */
function marble(ctx: Ctx, w: number, h: number) {
  const rng = new Rng(59);
  const base = ctx.createRadialGradient(w * 0.5, h * 0.46, 0, w * 0.5, h * 0.5, Math.hypot(w, h) * 0.6);
  base.addColorStop(0, "#1d1c1a");
  base.addColorStop(0.55, "#131211");
  base.addColorStop(1, "#090908");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  clouds(ctx, rng, w, h, 0.42);

  const s = ctx.getTransform().a;
  const { canvas, ctx: g } = surface(Math.ceil(w * s), Math.ceil(h * s));
  g.scale(s, s);
  // Where each vein enters, its heading, whether it carries gold, and its weight.
  const starts: [number, number, number, boolean, number][] = [
    [-0.05, 0.12, 0.38, false, 1],
    [0.2, -0.05, 0.62, true, 1.1],
    [-0.05, 0.62, 0.3, false, 0.75],
    [1.05, 0.3, Math.PI - 0.32, false, 0.8],
    [0.62, 1.05, -2.2, true, 0.85],
  ];
  for (const [fx, fy, a, gold, weight] of starts) {
    vein(g, rng, veinPath(rng, fx * w, fy * h, a + rng.gauss(0, 0.08), w * 1.3, 5, 0.04), gold, weight);
  }
  // The veins sink away behind the words.
  g.globalCompositeOperation = "destination-out";
  g.save();
  g.translate(w / 2, h / 2);
  g.scale(1, h / w);
  const fade = g.createRadialGradient(0, 0, 0, 0, 0, w * 0.48);
  fade.addColorStop(0, "rgba(0,0,0,0.95)");
  fade.addColorStop(0.55, "rgba(0,0,0,0.85)");
  fade.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = fade;
  g.fillRect(-w, -w, w * 2, w * 2);
  g.restore();
  ctx.drawImage(canvas as CanvasImageSource, 0, 0, w, h);

  // A broad sheen, as if the slab were polished.
  const sheen = ctx.createLinearGradient(0, 0, w, h);
  sheen.addColorStop(0.2, "rgba(255,248,232,0)");
  sheen.addColorStop(0.42, "rgba(255,248,232,0.035)");
  sheen.addColorStop(0.6, "rgba(255,248,232,0)");
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, w, h);
  paper(ctx, w, h, "rgba(0,0,0,0)", { grain: 0.5, vignette: "rgba(0,0,0,0.55)", seed: 59 });
}

/**
 * A stepped Deco accent standing on a rule: hairlines rising in a ziggurat,
 * tallest at the centre. Drawn upright at (x, y) and turned by `rot`.
 */
function ziggurat(ctx: Ctx, x: number, y: number, rot: number, k: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  for (const [dx, len] of [
    [0, 38],
    [7, 27],
    [14, 17],
    [21, 9],
  ]) {
    for (const s of dx === 0 ? [1] : [-1, 1]) ctx.fillRect(s * dx * k - 0.6, -len * k, 1.2, len * k);
  }
  diamond(ctx, 0, -46 * k, 4.5 * k);
  ctx.fill();
  ctx.restore();
}

function diamond(ctx: Ctx, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + r, y);
  ctx.lineTo(x, y + r);
  ctx.lineTo(x - r, y);
  ctx.closePath();
}

export const noir: Template = {
  id: "noir",
  label: "فخامة",
  tone: "#1b1a18",
  seed: 59,
  paint(ctx, w, h) {
    marble(ctx, w, h);
    const { outer: o, inner: i, fanR, k } = frame(w, h);
    const gold = foil(ctx, 0, 0, w, h, "pale");
    ctx.save();
    ctx.strokeStyle = gold;
    ctx.lineWidth = 2.6;
    ctx.strokeRect(o, o, w - o * 2, h - o * 2);
    // The inner rule runs into the fan's outer arc.
    const gap = Math.sqrt(fanR * fanR - (i - o) * (i - o));
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w / 2 - gap, i);
    ctx.lineTo(i, i);
    ctx.lineTo(i, h - i);
    ctx.lineTo(w - i, h - i);
    ctx.lineTo(w - i, i);
    ctx.lineTo(w / 2 + gap, i);
    ctx.stroke();
    ctx.restore();

    fan(ctx, w / 2, o, fanR, 0, Math.PI, { pleats: 17, hub: 24 * k, gold, ground: GROUND });
    for (const [x, y, a] of [
      [i, i, 0],
      [w - i, i, Math.PI / 2],
      [w - i, h - i, Math.PI],
      [i, h - i, -Math.PI / 2],
    ]) {
      fan(ctx, x, y, 64 * k, a, a + Math.PI / 2, { pleats: 7, hub: 12 * k, gold, ground: GROUND });
    }
    // Stepped accents at the foot and the sides, each pinned to the outer rule by a diamond.
    ctx.save();
    ctx.fillStyle = gold;
    ziggurat(ctx, w / 2, h - i, 0, k);
    ziggurat(ctx, i, h / 2, Math.PI / 2, k);
    ziggurat(ctx, w - i, h / 2, -Math.PI / 2, k);
    for (const [x, y] of [
      [w / 2, h - o],
      [o, h / 2],
      [w - o, h / 2],
    ]) {
      ctx.fillStyle = gold;
      diamond(ctx, x, y, 8);
      ctx.fill();
      ctx.fillStyle = GROUND;
      diamond(ctx, x, y, 3.5);
      ctx.fill();
    }
    ctx.restore();
  },
  layout(w, h) {
    const { outer, inner, fanR, k } = frame(w, h);
    const top = outer + fanR + 36 * k;
    const footerY = h - inner - 84 * k;
    return {
      box: { x: w * 0.2, y: top, w: w * 0.6, h: footerY - 44 * k - top },
      verse: { family: F.quran, size: 31 * k, color: "#b59c69", leading: 1.9 },
      intro: { family: F.messiri, weight: 500, size: 38 * k, color: IVORY },
      name: {
        // El Messiri keeps the Deco geometry and, unlike Reem Kufi, never lets ح read as ع in a name.
        family: F.messiri,
        weight: 700,
        size: 100 * k,
        min: 60,
        color: goldFoil,
        leading: 1.5,
        shadow: { color: "rgba(0,0,0,0.6)", blur: 16, y: 5 },
      },
      deed: { family: F.messiri, weight: 500, size: 42 * k, color: IVORY },
      target: { color: goldFoil, weight: 600 },
      prayer: { family: F.naskh, size: 32 * k, color: "#c8bda5", leading: 1.8, width: w * 0.5 },
      footer: { family: F.messiri, weight: 400, size: 23 * k, color: "#a3947a", y: footerY },
      divider: {
        height: 34 * k,
        draw: (ctx, cx, cy) => {
          ctx.save();
          ctx.fillStyle = foil(ctx, cx - 170, cy, cx + 170, cy, "pale");
          for (const s of [-1, 1]) {
            ctx.fillRect(s > 0 ? cx + 20 : cx - 170, cy - 0.6, 150, 1.2);
            ctx.fillRect(s > 0 ? cx + 20 : cx - 116, cy - 5.6, 96, 1);
            ctx.fillRect(s > 0 ? cx + 20 : cx - 116, cy + 4.6, 96, 1);
            diamond(ctx, cx + s * 180, cy, 3.4);
            ctx.fill();
          }
          diamond(ctx, cx, cy, 10);
          ctx.fill();
          ctx.fillStyle = GROUND;
          diamond(ctx, cx, cy, 4.5);
          ctx.fill();
          ctx.restore();
        },
      },
      gaps: { verse: 22 * k, intro: 4, name: 4 * k, deed: 22 * k },
    };
  },
};

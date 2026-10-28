import { F } from "../families";
import { pen, roundRect } from "../kit/ornament";
import { paper } from "../kit/paper";
import { Rng } from "../kit/rng";
import { ellipse, leaf, wash } from "../kit/watercolor";
import type { Template } from "../types";

const INK = "#34402a";
const SAGE = ["#8a9a6a", "#6e7f52", "#a3ae84", "#7c8c63", "#b5bb98"];
const UNDER = "#c3c8ae";
const STEM = "#6b5d45";
const FRAME = "#9c9168";

type Ctx = CanvasRenderingContext2D;
type P = { x: number; y: number };

function oliveLeaf(ctx: Ctx, rng: Rng, x: number, y: number, angle: number, len: number) {
  const shape = leaf(x, y, angle, len, len * rng.range(0.2, 0.26), rng.range(-0.08, 0.08));
  // Olive leaves are silver underneath; a pale wash shows through the green.
  wash(ctx, rng, shape, rng.chance(0.25) ? UNDER : rng.pick(SAGE), { layers: 18, alpha: 0.085, spread: 0.08, jitter: 0.16, rim: 0.8 });
  wash(ctx, rng, shape.slice(0, Math.ceil(shape.length / 2) + 1), "#55653f", { layers: 8, alpha: 0.03, spread: 0.05, jitter: 0.12, texture: false });
}

function fruit(ctx: Ctx, rng: Rng, x: number, y: number, angle: number, size: number) {
  const ripe = rng.chance(0.55);
  const body = ripe ? "#463449" : "#8b9440";
  wash(ctx, rng, ellipse(x, y, size * 0.72, size, angle, 10), body, {
    layers: 20,
    alpha: 0.085,
    spread: 0.06,
    jitter: 0.1,
    shade: ripe ? "#2b1f30" : "#5e6a2a",
    rim: 1.2,
  });
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = "#fffaf0";
  ctx.beginPath();
  ctx.ellipse(x - size * 0.22, y - size * 0.35, size * 0.16, size * 0.28, angle - 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** A branch along `path`: a tapering stem, paired leaves that lean toward the tip, olives tucked between. */
function branch(ctx: Ctx, rng: Rng, path: P[], scale: number) {
  ctx.save();
  ctx.fillStyle = STEM;
  ctx.globalAlpha = 0.75;
  pen(ctx, path, 1.6 * scale, 5 * scale, { taperStart: 10, taperEnd: 220 * scale });
  ctx.restore();

  const fruits: [number, number, number, number][] = [];
  for (let i = 2; i < path.length - 1; i++) {
    const a = path[i - 1];
    const b = path[i + 1];
    const dir = Math.atan2(b.y - a.y, b.x - a.x);
    const t = i / (path.length - 1);
    const len = (128 - 52 * t) * scale * rng.range(0.85, 1.12);
    for (const side of [-1, 1]) {
      if (rng.chance(0.12)) continue;
      oliveLeaf(ctx, rng, path[i].x, path[i].y, dir + side * rng.range(0.42, 0.7), len);
    }
    if (i % 3 === 1 && t < 0.85 && rng.chance(0.85)) {
      const side = rng.chance(0.5) ? -1 : 1;
      const off = 26 * scale;
      fruits.push([path[i].x - Math.sin(dir) * off * side, path[i].y + Math.cos(dir) * off * side, dir + side * 0.3, 20 * scale]);
    }
  }
  oliveLeaf(ctx, rng, path[path.length - 1].x, path[path.length - 1].y, Math.atan2(path[path.length - 1].y - path[path.length - 2].y, path[path.length - 1].x - path[path.length - 2].x), 70 * scale);
  for (const [x, y, a, s] of fruits) fruit(ctx, rng, x, y, a, s);
}

export const olive: Template = {
  id: "olive",
  label: "زيتون",
  tone: "#8a9a6b",
  seed: 23,
  paint(ctx, w, h) {
    const rng = new Rng(23);
    paper(ctx, w, h, "#f6f3e9", { grain: 0.7, mottle: ["#e7e8d6", "#fbf9f2", "#ece6d2"], vignette: "rgba(120,110,70,0.12)" });

    // A fine double frame, the inner rule broken at the corners.
    ctx.save();
    ctx.strokeStyle = FRAME;
    ctx.lineWidth = 2.4;
    roundRect(ctx, 44, 44, w - 88, h - 88, 6);
    ctx.stroke();
    ctx.lineWidth = 1.1;
    ctx.globalAlpha = 0.8;
    roundRect(ctx, 60, 60, w - 120, h - 120, 3);
    ctx.stroke();
    ctx.restore();

    // Two branches that meet under the text and climb the sides, like a laurel.
    const cx = w / 2;
    const cy = h * 0.53;
    const rx = w * 0.425;
    const ry = h * 0.43;
    const scale = Math.min(1.15, h / 1080);
    for (const side of [-1, 1]) {
      const path: P[] = [];
      for (let i = 0; i <= 26; i++) {
        const t = 0.08 + (i / 26) * 2.15;
        path.push({ x: cx + side * rx * Math.sin(t), y: cy + ry * Math.cos(t) });
      }
      branch(ctx, rng, path, scale);
    }
    // The tie where the stems cross.
    ctx.save();
    ctx.fillStyle = "#a28a52";
    for (const r of [9, 5]) {
      ctx.globalAlpha = r === 9 ? 0.85 : 1;
      ctx.beginPath();
      ctx.arc(cx, cy + ry - 4, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  },
  layout(w, h) {
    return {
      box: { x: w * 0.24, y: h * 0.17, w: w * 0.52, h: h * 0.62 },
      verse: { family: F.quran, size: 34, color: "#7d8660", leading: 1.9 },
      intro: { family: F.messiri, weight: 500, size: 42, color: "#5d6847" },
      name: { family: F.ruqaa, weight: 700, size: 112, min: 62, color: INK, dy: -0.04 },
      deed: { family: F.messiri, weight: 600, size: 46, color: INK },
      target: { color: "#7b6a2e" },
      prayer: { family: F.naskh, size: 35, color: "#5a6249", leading: 1.75 },
      footer: { family: F.messiri, size: 27, color: "#7d8466", y: h - 112 },
      divider: {
        height: 36,
        draw(ctx, cx, cy) {
          ctx.save();
          ctx.fillStyle = FRAME;
          for (const s of [-1, 1]) {
            ctx.beginPath();
            ctx.moveTo(cx + s * 22, cy - 1.1);
            ctx.lineTo(cx + s * 160, cy);
            ctx.lineTo(cx + s * 22, cy + 1.1);
            ctx.fill();
          }
          // An olive at the centre, upright, with a leaf either side.
          for (const s of [-1, 1]) {
            ctx.save();
            ctx.translate(cx, cy + 2);
            ctx.rotate(s * -1.15);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(-4, -9, 0, -20);
            ctx.quadraticCurveTo(4, -9, 0, 0);
            ctx.fill();
            ctx.restore();
          }
          ctx.fillStyle = "#6f7b4c";
          ctx.beginPath();
          ctx.ellipse(cx, cy - 1, 5.5, 7.5, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        },
      },
      gaps: { verse: 22, deed: 22 },
    };
  },
};

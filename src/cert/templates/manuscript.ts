import { F } from "../families";
import { paper } from "../kit/paper";
import { Rng } from "../kit/rng";
import { cartouche, foil, khatam, medallion, rosetteRule, teardrop, vine } from "../kit/tazhib";
import { ellipse, wash } from "../kit/watercolor";
import type { Template } from "../types";

const INK = "#2e2012";
const RUBRIC = "#8e2116";
const LAPIS = "#1d3a6e";
const LAPIS_DARK = "#142a52";

const MARGIN = 42;
const BAND = 58;

export const manuscript: Template = {
  id: "manuscript",
  label: "مخطوطة",
  tone: "#c9a96a",
  seed: 23,
  paint(ctx, w, h) {
    const rng = new Rng(23);
    paper(ctx, w, h, "#efe2c4", { grain: 1, seed: 23 });
    // Uneven tone, then old water stains. Few layers at a visible alpha: hundreds of
    // near-zero fills round off unevenly per channel and tint the sheet.
    for (let k = 0; k < 8; k++) {
      const pale = k % 2 === 0;
      wash(ctx, rng, ellipse(rng.range(0, w), rng.range(0, h), rng.range(w * 0.12, w * 0.3), rng.range(h * 0.12, h * 0.3), rng.range(0, 3), 8), pale ? "#f7eedb" : "#dcc394", {
        layers: 4,
        alpha: 0.05,
        spread: 0.3,
        jitter: 0.25,
        texture: false,
      });
    }
    for (let k = 0; k < 5; k++) {
      wash(ctx, rng, ellipse(rng.range(0, w), rng.range(0, h), rng.range(60, 200), rng.range(40, 140), rng.range(0, 3), 9), "#b8925a", {
        layers: 4,
        alpha: 0.022,
        spread: 0.35,
        jitter: 0.25,
        rim: 1.1,
        texture: false,
      });
    }
    paper(ctx, w, h, "rgba(0,0,0,0)", { vignette: "rgba(112,72,24,0.42)" });
    ctx.save();
    ctx.fillStyle = "#8a5a22";
    for (let i = 0; i < 70; i++) {
      ctx.globalAlpha = rng.range(0.03, 0.1);
      ctx.beginPath();
      ctx.arc(rng.range(0, w), rng.range(0, h), rng.range(0.8, 3.2), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    const gold = foil(ctx, 0, 0, w, h);
    const o = MARGIN;
    const i = MARGIN + BAND;

    // The lapis band, faintly uneven like ground pigment.
    ctx.save();
    ctx.beginPath();
    ctx.rect(o, o, w - o * 2, h - o * 2);
    ctx.rect(i, i, w - i * 2, h - i * 2);
    const lap = ctx.createLinearGradient(0, 0, w, h);
    lap.addColorStop(0, "#1f3f78");
    lap.addColorStop(0.5, LAPIS);
    lap.addColorStop(1, "#18315f");
    ctx.fillStyle = lap;
    ctx.fill("evenodd");
    ctx.clip("evenodd");
    ctx.fillStyle = "#6f8fc9";
    for (let k = 0; k < 900; k++) {
      ctx.globalAlpha = rng.range(0.04, 0.14);
      ctx.beginPath();
      ctx.arc(rng.range(o, w - o), rng.range(o, h - o), rng.range(0.5, 1.6), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // The vine along each side, between the corner squares.
    const sides: [number, number, number, number][] = [
      [i, o + BAND / 2, 0, w - i * 2],
      [w - i, h - o - BAND / 2, Math.PI, w - i * 2],
      [w - o - BAND / 2, i, Math.PI / 2, h - i * 2],
      [o + BAND / 2, h - i, -Math.PI / 2, h - i * 2],
    ];
    for (const [x, y, rot, len] of sides) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      vine(ctx, len, BAND, gold, "#c8452f");
      ctx.restore();
    }

    // Gold rules either side of the band, then a hairline of gold and one of red inside.
    ctx.save();
    ctx.strokeStyle = gold;
    ctx.lineWidth = 4;
    ctx.strokeRect(o, o, w - o * 2, h - o * 2);
    ctx.lineWidth = 3;
    ctx.strokeRect(i, i, w - i * 2, h - i * 2);
    ctx.lineWidth = 1.2;
    ctx.strokeRect(o - 9, o - 9, w - (o - 9) * 2, h - (o - 9) * 2);
    ctx.strokeRect(i + 9, i + 9, w - (i + 9) * 2, h - (i + 9) * 2);
    ctx.strokeStyle = RUBRIC;
    ctx.globalAlpha = 0.75;
    ctx.lineWidth = 1.6;
    ctx.strokeRect(i + 16, i + 16, w - (i + 16) * 2, h - (i + 16) * 2);
    ctx.restore();

    // Corner squares with a star, and medallions at the middle of each long side.
    for (const [cx, cy] of [
      [o + BAND / 2, o + BAND / 2],
      [w - o - BAND / 2, o + BAND / 2],
      [o + BAND / 2, h - o - BAND / 2],
      [w - o - BAND / 2, h - o - BAND / 2],
    ]) {
      ctx.save();
      ctx.fillStyle = LAPIS_DARK;
      ctx.fillRect(cx - BAND / 2, cy - BAND / 2, BAND, BAND);
      ctx.strokeStyle = gold;
      ctx.lineWidth = 3;
      ctx.strokeRect(cx - BAND / 2, cy - BAND / 2, BAND, BAND);
      ctx.fillStyle = gold;
      khatam(ctx, cx, cy, BAND * 0.4);
      ctx.fill();
      ctx.fillStyle = LAPIS_DARK;
      khatam(ctx, cx, cy, BAND * 0.24);
      ctx.fill();
      ctx.fillStyle = "#c8452f";
      ctx.beginPath();
      ctx.arc(cx, cy, BAND * 0.09, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    medallion(ctx, w / 2, o + BAND / 2, BAND * 0.78, gold, LAPIS_DARK, "#c8452f");
    medallion(ctx, w / 2, h - o - BAND / 2, BAND * 0.78, gold, LAPIS_DARK, "#c8452f");

    // Quarter rosettes tucked into the inner corners: two arcs, three leaves, a seed.
    const c = i + 16;
    for (const [x, y, a] of [
      [c, c, 0],
      [w - c, c, Math.PI / 2],
      [w - c, h - c, Math.PI],
      [c, h - c, -Math.PI / 2],
    ]) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a);
      ctx.strokeStyle = gold;
      ctx.fillStyle = gold;
      ctx.lineWidth = 2;
      for (const r of [46, 54]) {
        ctx.beginPath();
        ctx.arc(0, 0, r, 0.06, Math.PI / 2 - 0.06);
        ctx.stroke();
      }
      for (const t of [Math.PI / 8, Math.PI / 4, (3 * Math.PI) / 8]) {
        ctx.beginPath();
        teardrop(ctx, Math.cos(t) * 6, Math.sin(t) * 6, t, t === Math.PI / 4 ? 36 : 26, t === Math.PI / 4 ? 8 : 6);
        ctx.fill();
      }
      ctx.fillStyle = "#c8452f";
      ctx.beginPath();
      ctx.arc(Math.cos(Math.PI / 4) * 50, Math.sin(Math.PI / 4) * 50, 3.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  },
  layout(w, h) {
    // The A4 sheet is taller: the same words, a size up and spaced further apart.
    const k = h / w > 0.6 ? 1.1 : 1;
    return {
      box: { x: w * 0.2, y: h * 0.16, w: w * 0.6, h: h * 0.68 },
      verse: { family: F.quran, size: 34 * k, color: INK, leading: 2.1 },
      intro: { family: F.naskh, weight: 700, size: 44 * k, color: INK },
      name: { family: F.ruqaa, weight: 700, size: 112 * k, min: 64, color: RUBRIC, leading: 1.5, dy: -0.04 },
      deed: { family: F.naskh, weight: 700, size: 50 * k, color: INK },
      target: { color: LAPIS },
      prayer: { family: F.naskh, size: 35 * k, color: "#4d3720", leading: 1.75 },
      footer: { family: F.naskh, size: 27 * k, color: "#6e5434", y: h - MARGIN - BAND - 62 * k },
      divider: {
        height: 36 * k,
        draw: (ctx, cx, cy) => rosetteRule(ctx, cx, cy, 280, foil(ctx, cx - 160, cy - 10, cx + 160, cy + 10), "#b8402b"),
      },
      gaps: { verse: 40 * k * k, name: 8 * k, deed: 24 * k * k },
    };
  },
  underlay(ctx, _w, _h, placed) {
    const v = placed.verse;
    if (!v) return;
    // A surah-header panel: a lapis band holding a pale cartouche the verse sits in.
    const cx = v.x + v.w / 2;
    const cy = v.y + v.h / 2;
    const halfW = v.w / 2 + 90;
    const halfH = v.h / 2 + 4;
    const gold = foil(ctx, cx - halfW, cy - halfH, cx + halfW, cy + halfH);
    ctx.save();
    ctx.fillStyle = LAPIS;
    ctx.fillRect(cx - halfW - 70, cy - halfH, (halfW + 70) * 2, halfH * 2);
    ctx.strokeStyle = gold;
    ctx.lineWidth = 3;
    ctx.strokeRect(cx - halfW - 70, cy - halfH, (halfW + 70) * 2, halfH * 2);
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - halfW - 76, cy - halfH - 6, (halfW + 76) * 2, halfH * 2 + 12);

    cartouche(ctx, cx, cy, halfW - 36, halfH - 9, 46);
    ctx.fillStyle = "#f5ead2";
    ctx.fill();
    ctx.lineWidth = 2.6;
    ctx.stroke();
    cartouche(ctx, cx, cy, halfW - 40, halfH - 15, 40);
    ctx.lineWidth = 1;
    ctx.stroke();

    // Small medallions at the panel's ends, and gold seeds in its corners.
    for (const s of [-1, 1]) {
      medallion(ctx, cx + s * (halfW + 30), cy, halfH * 0.62, gold, "#142a52", "#c8452f");
      for (const t of [-1, 1]) {
        ctx.fillStyle = gold;
        ctx.beginPath();
        ctx.arc(cx + s * (halfW - 30), cy + t * (halfH - 11), 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  },
};

import { F } from "../families";
import { flourishCorner, taperedRule } from "../kit/ornament";
import { paper } from "../kit/paper";
import { Rng } from "../kit/rng";
import { anemone, berry, type FloralPalette, peony, sprig } from "../kit/watercolor";
import type { Template } from "../types";

const INK = "#7c3a2a";
const ROSE = "#a34556";
const LINE = "#8f5b45";

const P: FloralPalette = {
  petals: ["#f2b8b5", "#eaa0a4", "#fbe3dc"],
  deep: "#d77f88",
  center: "#b4505e",
  stamen: "#c89a4a",
  leaves: ["#7f9a7a", "#5f7c62", "#a9b98f", "#b99a5b"],
  stem: "#5c6e55",
  berry: "#f6d9d3",
  speck: "#b03a46",
};

const GOLD: FloralPalette = {
  ...P,
  petals: ["#f2d08a", "#e9b866", "#f8e6b8"],
  deep: "#d39b4a",
  center: "#a8642b",
  stamen: "#8a4f25",
};

const RUST: FloralPalette = {
  ...P,
  petals: ["#e2a77d", "#d68e66", "#f1c7a6"],
  deep: "#c4744e",
  center: "#8d3f2a",
  stamen: "#6d3423",
};

export const rose: Template = {
  id: "rose",
  label: "ورد",
  tone: "#e9b3ac",
  seed: 11,
  paint(ctx, w, h) {
    const rng = new Rng(11);
    paper(ctx, w, h, "#f7e5dc", { grain: 0.7, mottle: ["#efcfc2", "#fbefe8", "#f2d9cc"], vignette: "rgba(170,110,90,0.10)" });

    // Top-left spray, spilling off the corner.
    for (const [a, len, tip] of [
      [0.08, 430, "berries"],
      [0.38, 360, "leaf"],
      [0.75, 330, "bud"],
      [1.1, 300, "leaf"],
      [1.38, 380, "berries"],
    ] as const) {
      sprig(ctx, rng, 40, 40, a, len, rng.chance(0.3) ? GOLD : P, tip);
    }
    peony(ctx, rng, 120, 95, 150, P);
    peony(ctx, rng, 390, 40, 92, GOLD);
    anemone(ctx, rng, 70, 330, 60, P);
    anemone(ctx, rng, 300, 210, 42, P, "#fbe7e2");
    for (let i = 0; i < 5; i++) berry(ctx, rng, 520 + rng.range(-40, 40), 40 + rng.range(-20, 50), rng.range(14, 22), P);

    // Bottom-right spray, warmer.
    for (const [a, len, tip] of [
      [Math.PI + 0.1, 470, "berries"],
      [Math.PI + 0.45, 380, "flower"],
      [Math.PI + 0.85, 340, "leaf"],
      [Math.PI + 1.2, 360, "bud"],
      [Math.PI + 1.45, 300, "leaf"],
    ] as const) {
      sprig(ctx, rng, w - 40, h - 40, a, len, rng.chance(0.5) ? RUST : P, tip);
    }
    peony(ctx, rng, w - 120, h - 110, 160, P);
    anemone(ctx, rng, w - 380, h - 50, 70, RUST);
    anemone(ctx, rng, w - 60, h - 330, 58, GOLD);
    peony(ctx, rng, w - 300, h - 230, 64, RUST);
    for (let i = 0; i < 6; i++) berry(ctx, rng, w - 520 + rng.range(-50, 50), h - 70 + rng.range(-40, 30), rng.range(14, 22), P);

    // Two quieter blooms on the open edges, as in pressed-flower cards.
    sprig(ctx, rng, w * 0.4, h + 20, -Math.PI + 0.35, 230, P, "leaf");
    sprig(ctx, rng, w * 0.4, h + 20, -0.3, 200, P, "berries");
    peony(ctx, rng, w * 0.4, h + 34, 92, P);
    anemone(ctx, rng, w * 0.4 + 120, h - 14, 40, P, "#fbe7e2");
    anemone(ctx, rng, w + 10, h * 0.42, 70, P, "#fbe3dc");

    flourishCorner(ctx, w - 56, 56, -1, 1, { arm: 560, armV: 380, color: LINE });
    flourishCorner(ctx, 56, h - 56, 1, -1, { arm: 560, armV: 380, color: LINE });
  },
  layout(w, h) {
    return {
      box: { x: w * 0.2, y: h * 0.22, w: w * 0.6, h: h * 0.6 },
      verse: { family: F.quran, size: 36, color: "#a26f5e", leading: 1.9 },
      intro: { family: F.naskh, weight: 700, size: 46, color: INK },
      name: { family: F.ruqaa, weight: 700, size: 112, min: 64, color: INK, leading: 1.5, dy: -0.04 },
      deed: { family: F.naskh, weight: 700, size: 50, color: INK },
      target: { color: ROSE },
      prayer: { family: F.naskh, size: 36, color: "#8e5a49", leading: 1.75 },
      footer: { family: F.naskh, size: 28, color: "#9b6b5a", y: h * 0.86 },
      divider: { height: 34, draw: (ctx, cx, cy) => taperedRule(ctx, cx, cy, 300, LINE, 2) },
      gaps: { verse: 24, name: 10, deed: 24 },
    };
  },
};

import { surface } from "../canvas";
import { Rng } from "./rng";
import { ellipse, wash } from "./watercolor";

const tiles = new Map<string, HTMLCanvasElement | OffscreenCanvas>();

/** A small tile of random grain, tiled across the sheet as a pattern. */
function grainTile(seed: number, size = 180): HTMLCanvasElement | OffscreenCanvas {
  const key = `${seed}:${size}`;
  const hit = tiles.get(key);
  if (hit) return hit;
  const { canvas: c, ctx: g } = surface(size, size);
  const img = g.createImageData(size, size);
  const rng = new Rng(seed);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = rng.next();
    const tone = v > 0.5 ? 255 : 0;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = tone;
    img.data[i + 3] = Math.abs(v - 0.5) * 2 * 255;
  }
  g.putImageData(img, 0, 0);
  tiles.set(key, c);
  return c;
}

export interface PaperOptions {
  /** Grain strength, 0 to 1. */
  grain?: number;
  /** Soft darkening toward the edges. */
  vignette?: string;
  vignetteAlpha?: number;
  /** Large faint washes that make the sheet look hand-laid rather than flat. */
  mottle?: readonly string[];
  seed?: number;
}

export function paper(ctx: CanvasRenderingContext2D, w: number, h: number, base: string, o: PaperOptions = {}) {
  ctx.save();
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);

  if (o.mottle?.length) {
    const rng = new Rng(o.seed ?? 7);
    for (let i = 0; i < 9; i++) {
      const color = o.mottle[i % o.mottle.length];
      wash(ctx, rng, ellipse(rng.range(0, w), rng.range(0, h), rng.range(w * 0.15, w * 0.35), rng.range(h * 0.15, h * 0.35), rng.range(0, 3), 8), color, {
        // Fewer, stronger layers: fills much fainter than this round unevenly per channel and tint the sheet.
        layers: 4,
        alpha: 0.03,
        spread: 0.3,
        jitter: 0.25,
        texture: false,
      });
    }
  }

  if (o.vignette) {
    const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.hypot(w, h) * 0.6);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, o.vignette);
    ctx.globalAlpha = o.vignetteAlpha ?? 1;
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;
  }

  if (o.grain) {
    const pattern = ctx.createPattern(grainTile(o.seed ?? 3), "repeat");
    if (pattern) {
      ctx.globalAlpha = o.grain * 0.09;
      ctx.globalCompositeOperation = "overlay";
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, w, h);
    }
  }
  ctx.restore();
}

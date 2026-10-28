import { wording } from "../lib/wording";
import { artwork } from "./background";
import { ensureFont } from "./fonts";
import { TEMPLATES } from "./templates";
import { SHEET, type CertData, type Format, type Layout, type Placed, type Rect, type Template, type TextStyle } from "./types";

type Ctx = CanvasRenderingContext2D;

function font(ctx: Ctx, s: TextStyle, size = s.size) {
  ctx.font = `${s.weight ?? 400} ${size}px ${s.family}`;
}

function measure(ctx: Ctx, s: TextStyle, size: number, text: string) {
  font(ctx, s, size);
  return ctx.measureText(text).width;
}

/** Greedy breaks give a long first line and a stub; this evens the lines out for centred text. */
function balance(ctx: Ctx, s: TextStyle, size: number, text: string, width: number): string[] {
  const words = text.split(" ");
  const greedy = (limit: number) => {
    const lines: string[] = [];
    let line = "";
    for (const w of words) {
      const next = line ? `${line} ${w}` : w;
      if (line && measure(ctx, s, size, next) > limit) {
        lines.push(line);
        line = w;
      } else line = next;
    }
    if (line) lines.push(line);
    return lines;
  };
  const target = greedy(width).length;
  if (target <= 1) return [text];
  let lo = width / target;
  let hi = width;
  for (let i = 0; i < 12; i++) {
    const mid = (lo + hi) / 2;
    if (greedy(mid).length > target) lo = mid;
    else hi = mid;
  }
  return greedy(hi);
}

interface Run {
  text: string;
  style: TextStyle;
}

interface Line {
  runs: Run[];
  size: number;
  height: number;
  alpha?: number;
}

interface Block {
  key: keyof Omit<Placed, "block"> | "divider";
  lines: Line[];
  gap: number;
}

function line(style: TextStyle, size: number, text: string, alpha?: number): Line {
  return { runs: [{ text, style }], size, height: size * (style.leading ?? 1.5), alpha };
}

function plan(ctx: Ctx, L: Layout, data: CertData, placeholder: string | null) {
  const words = wording(data);
  const box = L.box;
  const gap = { verse: 34, intro: 4, name: 10, deed: 22, prayer: 0, ...L.gaps };
  const blocks: Block[] = [];

  if (words.verse && L.verse) {
    blocks.push({ key: "verse", lines: [line(L.verse, L.verse.size, words.verse)], gap: gap.verse });
  }
  blocks.push({ key: "intro", lines: [line(L.intro, L.intro.size, words.intro)], gap: gap.intro });

  // The name: as large as the style allows, shrunk to fit, and only then split.
  const name = words.name || placeholder || "";
  let size = L.name.size;
  const natural = measure(ctx, L.name, size, name);
  if (natural > box.w) size = Math.max(L.name.min, (size * box.w) / natural);
  let nameLines = [name];
  if (measure(ctx, L.name, size, name) > box.w) {
    // Two lines after all: split at the smallest size, then let both lines grow back to fill the width.
    nameLines = balance(ctx, L.name, size, name, box.w);
    const widest = Math.max(...nameLines.map((t) => measure(ctx, L.name, size, t)));
    size = Math.min(L.name.size * 0.86, (size * box.w * 0.96) / widest);
  }
  blocks.push({
    key: "name",
    lines: nameLines.map((t) => line(L.name, size, t, words.name ? undefined : 0.3)),
    gap: L.divider ? 0 : gap.name,
  });
  if (L.divider) {
    blocks.push({ key: "divider", lines: [{ runs: [], size: 0, height: L.divider.height }], gap: gap.name });
  }

  // "اجتيازها حفظ" then the surah in its accent style, on one line when it fits.
  const accent: TextStyle = { ...L.deed, ...L.target };
  const space = measure(ctx, L.deed, L.deed.size, " ");
  let deedSize = L.deed.size;
  const full = measure(ctx, L.deed, deedSize, words.deed) + space + measure(ctx, accent, deedSize, words.target);
  if (full > box.w) deedSize = Math.max(L.deed.size * 0.72, (deedSize * box.w) / full);
  const fits =
    measure(ctx, L.deed, deedSize, words.deed) + space + measure(ctx, accent, deedSize, words.target) <= box.w;
  const deedLines: Line[] = fits
    ? [
        {
          runs: [
            { text: words.deed, style: L.deed },
            { text: words.target, style: accent },
          ],
          size: deedSize,
          height: deedSize * (L.deed.leading ?? 1.5),
        },
      ]
    : [
        line(L.deed, deedSize, words.deed),
        ...balance(ctx, accent, deedSize, words.target, box.w).map((t) => line(accent, deedSize, t)),
      ];
  blocks.push({ key: "deed", lines: deedLines, gap: gap.deed });

  const prayerWidth = L.prayer.width ?? box.w * 0.82;
  blocks.push({
    key: "prayer",
    // The prayer breaks at its comma first, so no line splits "ربيع قلبها".
    lines: words.prayer
      .split("\n")
      .flatMap((part) => balance(ctx, L.prayer, L.prayer.size, part, prayerWidth))
      .map((t) => line(L.prayer, L.prayer.size, t)),
    gap: 0,
  });

  const total = blocks.reduce((sum, b, i) => sum + b.lines.reduce((s, l) => s + l.height, 0) + (i < blocks.length - 1 ? b.gap : 0), 0);
  return { blocks, total, footer: words.footer };
}

function drawRuns(ctx: Ctx, runs: Run[], size: number, cx: number, cy: number) {
  const widths = runs.map((r) => measure(ctx, r.style, size, r.text));
  const space = runs.length > 1 ? measure(ctx, runs[0].style, size, " ") : 0;
  const total = widths.reduce((a, b) => a + b, 0) + space * (runs.length - 1);
  // Right to left: the first run starts at the right edge.
  let x = cx + total / 2;
  runs.forEach((r, i) => {
    const s = r.style;
    font(ctx, s, size);
    const box: Rect = { x: x - widths[i], y: cy - size / 2, w: widths[i], h: size };
    const y = cy + size * (s.dy ?? 0);
    ctx.save();
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.direction = "rtl";
    if (s.shadow) {
      ctx.shadowColor = s.shadow.color;
      ctx.shadowBlur = s.shadow.blur;
      ctx.shadowOffsetY = s.shadow.y ?? 0;
    }
    if (s.stroke) {
      ctx.lineJoin = "round";
      ctx.lineWidth = s.stroke.width * 2;
      ctx.strokeStyle = s.stroke.color;
      ctx.strokeText(r.text, x, y);
      ctx.shadowColor = "transparent";
    }
    ctx.fillStyle = typeof s.color === "function" ? s.color(ctx, box) : s.color;
    ctx.fillText(r.text, x, y);
    ctx.restore();
    x -= widths[i] + space;
  });
  return total;
}

/** Lays the words out and draws them, with the template's ornaments around them. */
export function drawText(ctx: Ctx, t: Template, w: number, h: number, data: CertData, placeholder: string | null) {
  const L = t.layout(w, h);
  const { blocks, total, footer } = plan(ctx, L, data, placeholder);
  const cx = L.box.x + L.box.w / 2;
  let y = L.box.y + (L.box.h - total) / 2;
  const placed: Placed = { block: { x: L.box.x, y, w: L.box.w, h: total } };

  const steps: (() => void)[] = [];
  for (const b of blocks) {
    const top = y;
    let widest = 0;
    for (const l of b.lines) {
      const cy = y + l.height / 2;
      if (b.key === "divider") {
        steps.push(() => L.divider!.draw(ctx, cx, cy));
      } else {
        widest = Math.max(widest, l.runs.reduce((s, r) => s + measure(ctx, r.style, l.size, r.text), 0));
        steps.push(() => {
          ctx.save();
          if (l.alpha !== undefined) ctx.globalAlpha = l.alpha;
          drawRuns(ctx, l.runs, l.size, cx, cy);
          ctx.restore();
        });
      }
      y += l.height;
    }
    if (b.key !== "divider") placed[b.key] = { x: cx - widest / 2, y: top, w: widest, h: y - top };
    y += b.gap;
  }

  if (footer) {
    const fy = L.footer.y ?? placed.block.y + total + 56;
    const fw = measure(ctx, L.footer, L.footer.size, footer);
    placed.footer = { x: cx - fw / 2, y: fy - L.footer.size / 2, w: fw, h: L.footer.size };
    steps.push(() => drawRuns(ctx, [{ text: footer, style: L.footer }], L.footer.size, cx, fy));
  }

  t.underlay?.(ctx, w, h, placed);
  steps.forEach((s) => s());
  t.overlay?.(ctx, w, h, placed);
  return placed;
}

function fontsFor(L: Layout, data: CertData) {
  const words = wording(data);
  const all = Object.values(words).join(" ") + " 0123456789";
  const styles = [L.verse, L.intro, L.name, L.deed, { ...L.deed, ...L.target }, L.prayer, L.footer].filter(Boolean) as TextStyle[];
  return Promise.all(styles.map((s) => ensureFont(s.family, s.weight ?? 400, all)));
}

const tokens = new WeakMap<HTMLCanvasElement, number>();

export interface RenderOptions {
  /** Drawn faintly in place of an empty name, in the live preview. */
  placeholder?: string | null;
  /** Thumbnails wait behind the preview for the painter. */
  urgent?: boolean;
}

/**
 * Renders a certificate into `canvas` at `width` device pixels. Overlapping
 * calls on one canvas (fast typing) resolve to the latest; earlier ones skip
 * their draw, so the canvas never flashes an older state.
 */
export async function render(
  canvas: HTMLCanvasElement,
  templateId: string,
  data: CertData,
  format: Format,
  width: number,
  o: RenderOptions = {},
): Promise<boolean> {
  const token = (tokens.get(canvas) ?? 0) + 1;
  tokens.set(canvas, token);
  const t = TEMPLATES.find((x) => x.id === templateId) ?? TEMPLATES[0];
  const sheet = SHEET[format];
  const [art] = await Promise.all([artwork(t.id, format, width, o.urgent ?? true), fontsFor(t.layout(sheet.w, sheet.h), data)]);
  if (tokens.get(canvas) !== token) return false;

  const scale = width / sheet.w;
  const height = Math.round(sheet.h * scale);
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(art, 0, 0, width, height);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  drawText(ctx, t, sheet.w, sheet.h, data, o.placeholder ?? null);
  return true;
}

/** The full-size PNG for download. */
export async function exportImage(templateId: string, data: CertData, format: Format): Promise<Blob> {
  const canvas = document.createElement("canvas");
  await render(canvas, templateId, data, format, SHEET[format].export);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png"),
  );
}

import { surface } from "./canvas";
import type { PaintRequest } from "./paint.worker";
import { TEMPLATES } from "./templates";
import { SHEET, type Format } from "./types";

/**
 * The artwork takes a few hundred milliseconds to paint at full size, so it is
 * painted once per template, format and width, off the main thread where the
 * browser allows, and kept. Typing a name only redraws the text on top.
 */

type Art = ImageBitmap | HTMLCanvasElement | OffscreenCanvas;

interface Job extends PaintRequest {
  urgent: boolean;
  resolve: (art: Art) => void;
}

const supported =
  typeof Worker !== "undefined" &&
  typeof OffscreenCanvas !== "undefined" &&
  typeof OffscreenCanvas.prototype.transferToImageBitmap === "function";

let nextId = 1;
const queue: Job[] = [];
const waiting = new Map<number, Job>();
const idle: Worker[] = [];
let workers: Worker[] | null = null;

function paintHere(job: PaintRequest): Art {
  const t = TEMPLATES.find((x) => x.id === job.template)!;
  const sheet = SHEET[job.format];
  const scale = job.width / sheet.w;
  const { canvas, ctx } = surface(job.width, Math.round(sheet.h * scale));
  ctx.scale(scale, scale);
  t.paint(ctx, sheet.w, sheet.h);
  return canvas;
}

function startWorkers() {
  const count = Math.max(1, Math.min(3, (navigator.hardwareConcurrency || 2) - 1));
  workers = Array.from({ length: count }, () => {
    const w = new Worker(new URL("./paint.worker.ts", import.meta.url), { type: "module" });
    w.onmessage = (e: MessageEvent<{ id: number; bitmap?: ImageBitmap; error?: string }>) => {
      const job = waiting.get(e.data.id);
      waiting.delete(e.data.id);
      idle.push(w);
      if (job) job.resolve(e.data.bitmap ?? paintHere(job));
      pump();
    };
    w.onerror = () => {
      // A worker that cannot start (an old browser, a blocked module) hands its work back to the page.
      for (const [id, job] of waiting) {
        waiting.delete(id);
        job.resolve(paintHere(job));
      }
    };
    return w;
  });
  idle.push(...workers);
}

function pump() {
  while (idle.length && queue.length) {
    const i = queue.findIndex((j) => j.urgent);
    const job = queue.splice(i === -1 ? 0 : i, 1)[0];
    const w = idle.pop()!;
    waiting.set(job.id, job);
    w.postMessage({ id: job.id, template: job.template, format: job.format, width: job.width } satisfies PaintRequest);
  }
}

const cache = new Map<string, Promise<Art>>();
const LIMIT = 28;

export function artwork(template: string, format: Format, width: number, urgent = true): Promise<Art> {
  const key = `${template}:${format}:${width}`;
  const hit = cache.get(key);
  if (hit) {
    cache.delete(key);
    cache.set(key, hit);
    return hit;
  }
  const p = new Promise<Art>((resolve) => {
    const req = { id: nextId++, template, format, width };
    if (!supported) {
      setTimeout(() => resolve(paintHere(req)), 0);
      return;
    }
    if (!workers) startWorkers();
    queue.push({ ...req, urgent, resolve });
    pump();
  });
  cache.set(key, p);
  if (cache.size > LIMIT) cache.delete(cache.keys().next().value!);
  return p;
}

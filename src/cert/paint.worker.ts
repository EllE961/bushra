/// <reference lib="webworker" />
import { TEMPLATES } from "./templates";
import { SHEET, type Format } from "./types";

export interface PaintRequest {
  id: number;
  template: string;
  format: Format;
  width: number;
}

self.onmessage = (e: MessageEvent<PaintRequest>) => {
  const { id, template, format, width } = e.data;
  try {
    const t = TEMPLATES.find((x) => x.id === template)!;
    const sheet = SHEET[format];
    const scale = width / sheet.w;
    const canvas = new OffscreenCanvas(width, Math.round(sheet.h * scale));
    const ctx = canvas.getContext("2d") as unknown as CanvasRenderingContext2D;
    ctx.scale(scale, scale);
    t.paint(ctx, sheet.w, sheet.h);
    const bitmap = canvas.transferToImageBitmap();
    (self as unknown as DedicatedWorkerGlobalScope).postMessage({ id, bitmap }, [bitmap]);
  } catch (err) {
    self.postMessage({ id, error: String(err) });
  }
};

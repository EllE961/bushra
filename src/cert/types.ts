export type Gender = "f" | "m";
export type Kind = "hifz" | "tilawah";
export type Format = "wide" | "a4";

export type Target =
  | { type: "surah"; n: number }
  | { type: "juz"; n: number }
  | { type: "quran" }
  | { type: "custom"; text: string };

export interface CertData {
  name: string;
  gender: Gender;
  kind: Kind;
  target: Target;
  school: string;
  date: boolean;
  verse: boolean;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A fill, or a function that builds one for the box the text occupies (for gold foil and the like). */
export type Paint = string | ((ctx: CanvasRenderingContext2D, box: Rect) => string | CanvasGradient);

export interface TextStyle {
  /** CSS font-family, quoted. */
  family: string;
  weight?: number;
  /** Logical px on the 1920-wide sheet. */
  size: number;
  color: Paint;
  /** Line box as a multiple of the size. */
  leading?: number;
  stroke?: { color: string; width: number };
  shadow?: { color: string; blur: number; y?: number };
  /** Optical nudge, as a fraction of the size, for fonts that sit high or low. */
  dy?: number;
}

export interface Layout {
  /** The area the text block is centred in. */
  box: Rect;
  verse?: TextStyle;
  intro: TextStyle;
  name: TextStyle & { min: number };
  deed: TextStyle;
  /** Overrides for the surah part of the deed line. */
  target?: Partial<TextStyle>;
  prayer: TextStyle & { width?: number };
  footer: TextStyle & { y?: number };
  /** Space after each block, in logical px. */
  gaps?: Partial<Record<"verse" | "intro" | "name" | "deed" | "prayer", number>>;
  /** An ornament between the name and the deed line. */
  divider?: { height: number; draw: (ctx: CanvasRenderingContext2D, cx: number, cy: number) => void };
}

/** Where each block landed, for templates that frame the text (a cartouche around the verse, say). */
export interface Placed {
  verse?: Rect;
  intro?: Rect;
  name?: Rect;
  deed?: Rect;
  prayer?: Rect;
  footer?: Rect;
  block: Rect;
}

export interface Template {
  id: string;
  /** Shown under the thumbnail. */
  label: string;
  /** Picks the theme color of the result screen. */
  tone: string;
  seed: number;
  /** Paints the artwork. Runs in a worker when it can, so it must not touch the DOM. */
  paint: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
  layout: (w: number, h: number) => Layout;
  /** Drawn after the text, for ornaments that hug it. */
  overlay?: (ctx: CanvasRenderingContext2D, w: number, h: number, placed: Placed) => void;
  /** Drawn before the text, for ornaments that sit behind it. */
  underlay?: (ctx: CanvasRenderingContext2D, w: number, h: number, placed: Placed) => void;
}

export const SHEET = {
  wide: { w: 1920, h: 1080, export: 2560 },
  a4: { w: 1920, h: 1358, export: 3508 },
} as const;

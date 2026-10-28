import "@fontsource/aref-ruqaa/400.css";
import "@fontsource/aref-ruqaa/700.css";
import "@fontsource/amiri/400.css";
import "@fontsource/amiri/700.css";
import "@fontsource/amiri-quran/400.css";
import "@fontsource-variable/reem-kufi/index.css";
import "@fontsource-variable/el-messiri/index.css";
import "@fontsource-variable/lemonada/index.css";

const loading = new Map<string, Promise<unknown>>();

/**
 * A canvas never waits for a web font: it draws with whatever is ready. So
 * every face is loaded, for the exact characters about to be drawn, first.
 */
export function ensureFont(family: string, weight: number, text: string): Promise<unknown> {
  // The subset files split on script, so Arabic, digits and the ornate brackets are enough to key on.
  const key = `${weight} ${family} ${/\d/.test(text) ? "d" : ""}${/[﴾﴿]/.test(text) ? "q" : ""}`;
  let p = loading.get(key);
  if (!p) {
    p = document.fonts.load(`${weight} 40px ${family}`, text || "ب").catch(() => undefined);
    loading.set(key, p);
  }
  return p;
}

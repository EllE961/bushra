export function fileName(name: string): string {
  const clean = name.replace(/[\\/:*?"<>|]+/g, "").trim();
  return `${clean ? `شهادة ${clean}` : "شهادة"}.png`;
}

export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function canShare(file: File): boolean {
  try {
    return typeof navigator.share === "function" && !!navigator.canShare?.({ files: [file] });
  } catch {
    return false;
  }
}

/** Resolves false when the person closes the share sheet without picking anything. */
export async function share(file: File): Promise<boolean> {
  try {
    await navigator.share({ files: [file] });
    return true;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") return false;
    throw err;
  }
}

export const canCopy = () => typeof ClipboardItem !== "undefined" && typeof navigator.clipboard?.write === "function";

export async function copyImage(blob: Blob) {
  await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
}

/** Phones and tablets: the share sheet is how a picture reaches the gallery or WhatsApp. */
export const isTouch = () => typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;

export function haptic(ms = 8) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    // Not supported (iOS); silence is fine.
  }
}

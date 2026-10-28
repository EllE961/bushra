import { motion } from "motion/react";
import { memo, useEffect, useLayoutEffect, useRef, useState } from "react";
import { render } from "../cert/render";
import { SHEET, type CertData, type Format } from "../cert/types";

interface Layer {
  key: string;
  template: string;
  format: Format;
  ready: boolean;
}

/** Device pixels for a box this wide, rounded up so small resizes reuse the painted artwork. */
export function pixels(cssWidth: number, cap = 2400) {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  return Math.min(cap, Math.ceil((cssWidth * dpr) / 128) * 128);
}

export function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

const Canvas = memo(function Canvas({
  layer,
  data,
  width,
  live,
  placeholder,
  onReady,
  onShown,
}: {
  layer: Layer;
  data: CertData;
  width: number;
  live: boolean;
  placeholder: string;
  onReady: (key: string) => void;
  onShown: (key: string) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    // Only the newest layer follows the form; older ones are fading out.
    if (!width || !live) return;
    const frame = requestAnimationFrame(() => {
      if (!ref.current) return;
      render(ref.current, layer.template, data, layer.format, width, { placeholder }).then((ok) => ok && onReady(layer.key));
    });
    return () => cancelAnimationFrame(frame);
  }, [data, width, live, placeholder, layer.key, layer.template, layer.format, onReady]);

  return (
    <motion.canvas
      ref={ref}
      aria-hidden
      className="absolute inset-0 block size-full"
      initial={{ opacity: 0, scale: 1.015 }}
      animate={layer.ready ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 1.015 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      onAnimationComplete={() => layer.ready && onShown(layer.key)}
    />
  );
});

/**
 * The live certificate. It is the same renderer as the download, so what you
 * see is exactly the image you get. Switching designs crossfades once the new
 * artwork is painted; the old one stays up until then.
 */
export function Preview({
  template,
  format,
  data,
  placeholder,
  label,
}: {
  template: string;
  format: Format;
  data: CertData;
  placeholder: string;
  label: string;
}) {
  const [box, cssWidth] = useWidth<HTMLDivElement>();
  const width = cssWidth ? pixels(cssWidth) : 0;
  const key = `${template}:${format}`;
  const [layers, setLayers] = useState<Layer[]>([{ key, template, format, ready: false }]);

  useEffect(() => {
    setLayers((ls) => (ls[ls.length - 1].key === key ? ls : [...ls, { key, template, format, ready: false }].slice(-3)));
  }, [key, template, format]);

  const onReady = useRef((k: string) => setLayers((ls) => ls.map((l) => (l.key === k && !l.ready ? { ...l, ready: true } : l)))).current;
  const onShown = useRef((k: string) =>
    setLayers((ls) => {
      const i = ls.findIndex((l) => l.key === k);
      return i > 0 ? ls.slice(i) : ls;
    }),
  ).current;

  const busy = !layers[layers.length - 1].ready;
  const sheet = SHEET[format];

  return (
    <motion.div
      ref={box}
      role="img"
      aria-label={label}
      className="relative w-full overflow-hidden rounded-[16px] bg-sunken ring-1 ring-black/5 shadow-lift"
      initial={false}
      animate={{ paddingTop: `${(sheet.h / sheet.w) * 100}%` }}
      transition={{ type: "spring", stiffness: 260, damping: 32 }}
    >
      {layers.map((l, i) => (
        <Canvas
          key={l.key}
          layer={l}
          data={data}
          width={width}
          live={i === layers.length - 1}
          placeholder={placeholder}
          onReady={onReady}
          onShown={onShown}
        />
      ))}
      {busy && layers.length === 1 && <div className="shimmer absolute inset-0" />}
      <motion.div
        className="pointer-events-none absolute top-3 left-3 size-5"
        initial={false}
        animate={{ opacity: busy && layers.length > 1 ? 1 : 0 }}
      >
        <svg viewBox="0 0 20 20" className="size-5 animate-spin text-white drop-shadow" aria-hidden>
          <circle cx="10" cy="10" r="7.5" fill="none" stroke="currentColor" strokeOpacity=".35" strokeWidth="2.5" />
          <path d="M17.5 10a7.5 7.5 0 0 0-7.5-7.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </motion.div>
    </motion.div>
  );
}

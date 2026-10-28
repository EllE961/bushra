import { Check } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { memo, useEffect, useRef, useState } from "react";
import { render } from "../cert/render";
import { TEMPLATES } from "../cert/templates";
import { SHEET, type CertData, type Format } from "../cert/types";
import { haptic } from "../lib/share";
import { pixels, useWidth } from "./Preview";

const Thumb = memo(function Thumb({
  id,
  data,
  format,
  placeholder,
}: {
  id: string;
  data: CertData;
  format: Format;
  placeholder: string;
}) {
  const [box, cssWidth] = useWidth<HTMLDivElement>();
  const canvas = useRef<HTMLCanvasElement>(null);
  const shown = useRef(false);
  const [visible, setVisible] = useState(false);
  const [near, setNear] = useState(false);

  // Paint a design only once it scrolls near the view: a phone shows two or three of fourteen.
  useEffect(() => {
    const el = box.current;
    if (!el || near) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: "0px 240px" });
    io.observe(el);
    return () => io.disconnect();
  }, [box, near]);

  useEffect(() => {
    if (!cssWidth || !near) return;
    // The first paint is immediate; later ones wait for a pause in typing.
    const t = setTimeout(
      () => {
        if (!canvas.current) return;
        render(canvas.current, id, data, format, pixels(cssWidth, 900), { placeholder, urgent: false }).then((ok) => {
          if (ok && canvas.current && !shown.current) {
            shown.current = true;
            setVisible(true);
            canvas.current.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400, easing: "ease-out", fill: "forwards" });
          }
        });
      },
      shown.current ? 260 : 0,
    );
    return () => clearTimeout(t);
  }, [id, data, format, placeholder, cssWidth, near]);

  const sheet = SHEET[format];
  return (
    <div ref={box} className="relative w-full overflow-hidden rounded-[12px] bg-sunken" style={{ aspectRatio: `${sheet.w} / ${sheet.h}` }}>
      {!visible && <div className="shimmer absolute inset-0" />}
      <canvas ref={canvas} aria-hidden className="absolute inset-0 block size-full opacity-0" />
    </div>
  );
});

export function TemplatePicker({
  value,
  onChange,
  data,
  format,
  placeholder,
}: {
  value: string;
  onChange: (id: string) => void;
  data: CertData;
  format: Format;
  placeholder: string;
}) {
  const row = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Centre the chosen design without scrolling the page itself.
    const r = row.current;
    const el = r?.querySelector<HTMLElement>('[aria-checked="true"]');
    if (!r || !el) return;
    const a = el.getBoundingClientRect();
    const b = r.getBoundingClientRect();
    r.scrollBy({ left: a.left + a.width / 2 - (b.left + b.width / 2) });
  }, []);

  return (
    <div
      ref={row}
      role="radiogroup"
      aria-label="التصميم"
      className="no-scrollbar -mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pt-1 pb-2 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0"
    >
      {TEMPLATES.map((t) => {
        const on = t.id === value;
        return (
          <motion.button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={`تصميم ${t.label}`}
            onClick={() => {
              if (on) return;
              haptic();
              onChange(t.id);
            }}
            whileTap={{ scale: 0.96 }}
            className="group relative w-[42%] shrink-0 snap-center text-start sm:w-[30%] lg:w-auto"
          >
            <div className="relative">
              {on && (
                <motion.span
                  layoutId="template-ring"
                  className="absolute -inset-[4px] rounded-[15px] border-2 border-accent"
                  transition={{ type: "spring", stiffness: 500, damping: 36 }}
                />
              )}
              <div className={`transition-transform duration-300 ease-out-quint ${on ? "" : "group-hover:-translate-y-0.5"}`}>
                <Thumb id={t.id} data={data} format={format} placeholder={placeholder} />
              </div>
              <motion.span
                className="absolute -top-1.5 -left-1.5 grid size-6 place-items-center rounded-full bg-accent text-accent-ink shadow-card"
                initial={false}
                animate={{ scale: on ? 1 : 0, opacity: on ? 1 : 0 }}
                transition={{ type: "spring", stiffness: 600, damping: 28 }}
              >
                <Check size={13} weight="bold" />
              </motion.span>
            </div>
            <div className={`mt-2 flex items-center gap-1.5 px-0.5 text-[14px] transition-colors ${on ? "font-semibold text-ink" : "text-ink-2"}`}>
              <span className="size-2.5 rounded-full ring-1 ring-black/10" style={{ background: t.tone }} />
              {t.label}
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}

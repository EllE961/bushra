import { motion } from "motion/react";
import { type ReactNode, useId } from "react";
import { haptic } from "../lib/share";

export interface Option<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

/** A radio group drawn as a segmented control; the thumb slides between options. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  size = "md",
}: {
  value: T;
  options: readonly Option<T>[];
  onChange: (v: T) => void;
  label: string;
  size?: "sm" | "md";
}) {
  const id = useId();
  const pick = (v: T) => {
    if (v === value) return;
    haptic();
    onChange(v);
  };
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`relative grid rounded-[14px] bg-sunken p-1 ${size === "sm" ? "h-10" : "h-12"}`}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      onKeyDown={(e) => {
        const i = options.findIndex((o) => o.value === value);
        // Arrow keys follow the reading direction: in RTL, left moves forward.
        if (e.key === "ArrowLeft") pick(options[(i + 1) % options.length].value);
        if (e.key === "ArrowRight") pick(options[(i - 1 + options.length) % options.length].value);
      }}
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            onClick={() => pick(o.value)}
            className={`relative z-10 flex items-center justify-center gap-1.5 rounded-[10px] font-medium transition-colors duration-200 ${
              size === "sm" ? "text-[14px]" : "text-[15px]"
            } ${on ? "text-ink" : "text-ink-3 hover:text-ink-2"}`}
          >
            {on && (
              <motion.span
                layoutId={`seg-${id}`}
                className="absolute inset-0 -z-10 rounded-[10px] bg-surface shadow-card"
                transition={{ type: "spring", stiffness: 520, damping: 38 }}
              />
            )}
            {o.icon}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

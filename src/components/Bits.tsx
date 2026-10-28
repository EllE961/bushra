import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { haptic } from "../lib/share";

/** The mark: an eight-pointed star, as on a mushaf's ayah ends, in a seal. */
export function Mark({ className = "size-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <rect width="40" height="40" rx="11" fill="var(--accent)" />
      <g fill="none" stroke="#e7c27a" strokeWidth="1.8" strokeLinejoin="round">
        <rect x="11" y="11" width="18" height="18" rx="2.2" />
        <rect x="11" y="11" width="18" height="18" rx="2.2" transform="rotate(45 20 20)" />
      </g>
      <circle cx="20" cy="20" r="3.2" fill="#e7c27a" />
    </svg>
  );
}

export function Card({ title, aside, children, delay = 0 }: { title: string; aside?: ReactNode; children: ReactNode; delay?: number }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-[22px] border border-line bg-surface p-5 shadow-card"
    >
      <div className="mb-3.5 flex min-h-10 items-center justify-between gap-3">
        <h2 className="text-[16px] font-bold text-ink">{title}</h2>
        {aside}
      </div>
      {children}
    </motion.section>
  );
}

export function Switch({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => {
        haptic();
        onChange(!checked);
      }}
      className="flex w-full items-center justify-between gap-4 py-3 text-start"
    >
      <span className="min-w-0">
        <span className="block text-[15.5px] font-medium">{label}</span>
        {hint && <span className="block truncate text-[13px] text-ink-3">{hint}</span>}
      </span>
      <span className={`relative h-[30px] w-[50px] shrink-0 rounded-full transition-colors duration-300 ${checked ? "bg-accent" : "bg-line-strong"}`}>
        <motion.span
          className="absolute top-[3px] size-6 rounded-full bg-white shadow-[0_2px_6px_rgb(0_0_0/0.2)]"
          initial={false}
          animate={{ right: checked ? 23 : 3 }}
          transition={{ type: "spring", stiffness: 600, damping: 34 }}
        />
      </span>
    </button>
  );
}

export function Toast({ message }: { message: string | null }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(108px+env(safe-area-inset-bottom))] z-[90] flex justify-center px-5 lg:bottom-8">
      <AnimatePresence>
        {message && (
          <motion.div
            key={message}
            role="status"
            initial={{ opacity: 0, y: 14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 500, damping: 34 }}
            className="rounded-2xl bg-ink px-4 py-3 text-[14.5px] font-medium text-bg shadow-lift"
          >
            {message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

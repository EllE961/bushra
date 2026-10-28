import { X } from "@phosphor-icons/react";
import { AnimatePresence, motion, useDragControls } from "motion/react";
import { type ReactNode, type RefObject, useEffect, useId, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

const wideQuery = "(min-width: 768px)";
function useWide() {
  return useSyncExternalStore(
    (cb) => {
      const m = matchMedia(wideQuery);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => matchMedia(wideQuery).matches,
  );
}

/**
 * A bottom sheet on phones (drag the handle down to dismiss) and a centred
 * dialog on wider screens. Locks the page behind it and hands focus back on close.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  initialFocus,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  initialFocus?: RefObject<HTMLElement | null>;
  wide?: boolean;
}) {
  const isWide = useWide();
  const drag = useDragControls();
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;
    opener.current = document.activeElement;
    const root = document.documentElement;
    const prev = root.style.overflow;
    root.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && panel.current) {
        const items = panel.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        );
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    const t = setTimeout(() => (initialFocus?.current ?? panel.current)?.focus({ preventScroll: true }), 60);
    return () => {
      clearTimeout(t);
      root.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
      (opener.current as HTMLElement | null)?.focus?.({ preventScroll: true });
    };
  }, [open, onClose, initialFocus]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6">
          <motion.div
            className="absolute inset-0 bg-[#0d0b08]/45 backdrop-blur-[3px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
          />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className={`relative flex max-h-[90dvh] w-full flex-col overflow-hidden bg-surface outline-none shadow-lift md:max-h-[85dvh] md:rounded-[28px] ${
              wide ? "md:max-w-3xl" : "md:max-w-lg"
            } rounded-t-[28px] pb-[env(safe-area-inset-bottom)]`}
            initial={isWide ? { opacity: 0, scale: 0.96, y: 12 } : { y: "100%" }}
            animate={isWide ? { opacity: 1, scale: 1, y: 0 } : { y: 0 }}
            exit={isWide ? { opacity: 0, scale: 0.97, y: 8 } : { y: "100%" }}
            transition={isWide ? { type: "spring", stiffness: 420, damping: 34 } : { type: "spring", stiffness: 380, damping: 40 }}
            drag={isWide ? false : "y"}
            dragControls={drag}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.7 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 110 || info.velocity.y > 650) onClose();
            }}
          >
            <div
              className="shrink-0 touch-none select-none pt-2.5 md:pt-0"
              onPointerDown={(e) => !isWide && drag.start(e)}
            >
              <div className="mx-auto h-1.5 w-10 rounded-full bg-line-strong md:hidden" />
              <div className="flex items-center justify-between gap-3 px-5 pt-3 pb-2 md:px-6 md:pt-5">
                <h2 id={titleId} className="text-[19px] font-bold tracking-[-0.01em]">
                  {title}
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="إغلاق"
                  className="grid size-9 place-items-center rounded-full bg-sunken text-ink-2 transition-colors hover:text-ink active:scale-95"
                >
                  <X size={18} weight="bold" />
                </button>
              </div>
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

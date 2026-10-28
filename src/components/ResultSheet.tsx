import { Copy, DownloadSimple, ShareNetwork, UserPlus } from "@phosphor-icons/react";
import confetti from "canvas-confetti";
import { motion } from "motion/react";
import { useEffect, useRef } from "react";
import type { Gender } from "../cert/types";
import { canCopy, canShare, copyImage, download, isTouch, share } from "../lib/share";
import { Sheet } from "./Sheet";

export interface Result {
  blob: Blob;
  file: File;
  url: string;
  width: number;
  height: number;
}

function burst(from: HTMLElement | null) {
  if (!from) return;
  const r = from.getBoundingClientRect();
  const origin = { x: (r.left + r.width / 2) / innerWidth, y: (r.top + r.height * 0.35) / innerHeight };
  const colors = ["#d6ab5c", "#f3e6cc", "#0f5a48", "#e9b3ac", "#ffffff"];
  const base = { origin, colors, disableForReducedMotion: true, zIndex: 80, ticks: 220, scalar: 0.95 };
  confetti({ ...base, particleCount: 70, spread: 72, startVelocity: 38 });
  setTimeout(() => confetti({ ...base, particleCount: 40, spread: 110, startVelocity: 26, decay: 0.92 }), 140);
}

export function ResultSheet({
  result,
  onClose,
  onNext,
  gender,
  notify,
}: {
  result: Result | null;
  onClose: () => void;
  onNext: () => void;
  gender: Gender;
  notify: (msg: string) => void;
}) {
  const img = useRef<HTMLImageElement>(null);
  // Keep showing the last image while the sheet slides away.
  const last = useRef(result);
  if (result) last.current = result;
  const shown = result ?? last.current;
  const touch = isTouch();
  const sharable = result ? canShare(result.file) : false;
  const copyable = canCopy();

  useEffect(() => {
    if (!result) return;
    const t = setTimeout(() => burst(img.current), 380);
    return () => clearTimeout(t);
  }, [result]);

  const save = () => {
    if (!result) return;
    download(result.blob, result.file.name);
    notify("بدأ تنزيل الصورة");
  };
  const send = async () => {
    if (!result) return;
    try {
      await share(result.file);
    } catch {
      save();
    }
  };
  const copy = async () => {
    if (!result) return;
    try {
      await copyImage(result.blob);
      notify("نُسخت الصورة، الصقها في المحادثة");
    } catch {
      notify("تعذّر النسخ، استخدم التنزيل");
    }
  };

  const primary = touch && sharable ? { label: "حفظ أو مشاركة", icon: <ShareNetwork size={20} weight="bold" />, run: send } : { label: "تنزيل الصورة", icon: <DownloadSimple size={20} weight="bold" />, run: save };
  const secondary =
    touch && sharable
      ? { label: "تنزيل", icon: <DownloadSimple size={19} />, run: save }
      : copyable
        ? { label: "نسخ", icon: <Copy size={19} />, run: copy }
        : sharable
          ? { label: "مشاركة", icon: <ShareNetwork size={19} />, run: send }
          : null;

  return (
    <Sheet open={!!result} onClose={onClose} title="الشهادة جاهزة" wide>
      {shown && (
        <div className="overflow-y-auto overscroll-contain px-5 pb-5 md:px-6 md:pb-6">
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.94, rotate: -0.6 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 24, delay: 0.12 }}
            className="relative"
          >
            <img
              ref={img}
              src={shown.url}
              alt="الشهادة"
              className="block w-full rounded-[14px] bg-sunken shadow-lift ring-1 ring-black/5"
              style={{ aspectRatio: `${shown.width} / ${shown.height}` }}
            />
          </motion.div>
          <div className="mt-2.5 flex items-center justify-between text-[12.5px] text-ink-3">
            <span>{touch ? "يمكنك أيضًا الضغط مطولًا على الصورة لحفظها" : "صورة PNG بجودة عالية"}</span>
            <span className="tabular-nums" dir="ltr">
              {shown.width} × {shown.height}
            </span>
          </div>

          <motion.div
            className="mt-4 flex gap-2.5"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={primary.run}
              className="flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-accent text-[16px] font-semibold text-accent-ink shadow-card transition-colors hover:bg-accent-2"
            >
              {primary.icon}
              {primary.label}
            </motion.button>
            {secondary && (
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={secondary.run}
                className="flex h-14 items-center justify-center gap-2 rounded-2xl border border-line bg-surface px-5 text-[15px] font-semibold transition-colors hover:border-line-strong"
              >
                {secondary.icon}
                {secondary.label}
              </motion.button>
            )}
          </motion.div>
          <motion.button
            type="button"
            onClick={onNext}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mx-auto mt-3 flex h-11 items-center gap-2 rounded-xl px-4 text-[15px] font-medium text-ink-2 transition-colors hover:bg-sunken hover:text-ink"
          >
            <UserPlus size={19} />
            {gender === "f" ? "شهادة لطالبة أخرى" : "شهادة لطالب آخر"}
          </motion.button>
        </div>
      )}
    </Sheet>
  );
}

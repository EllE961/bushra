import { BookOpen, MagnifyingGlass, PencilSimpleLine, X } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import type { Gender, Kind, Target } from "../cert/types";
import { JUZ_START_SURAH, SURAHS, fold, juzName, surahMatches } from "../lib/quran";
import { haptic, isTouch } from "../lib/share";
import { Segmented } from "./Segmented";
import { Sheet } from "./Sheet";

type Tab = "surah" | "juz" | "other";

/** The eight-pointed star that marks ayah ends in many mushafs, used to carry the number. */
export function NumberMark({ n, active }: { n: number; active?: boolean }) {
  return (
    <span className="relative grid size-9 shrink-0 place-items-center">
      <svg viewBox="0 0 36 36" className={`absolute inset-0 ${active ? "text-accent" : "text-line-strong"}`} aria-hidden>
        <rect x="7" y="7" width="22" height="22" rx="3" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <rect x="7" y="7" width="22" height="22" rx="3" fill="none" stroke="currentColor" strokeWidth="1.4" transform="rotate(45 18 18)" />
      </svg>
      <span className={`relative text-[12px] font-semibold tabular-nums ${active ? "text-accent" : "text-ink-2"}`}>{n}</span>
    </span>
  );
}

function same(a: Target, b: Target) {
  if (a.type !== b.type) return false;
  if (a.type === "surah" || a.type === "juz") return a.n === (b as typeof a).n;
  if (a.type === "custom") return a.text === (b as typeof a).text;
  return true;
}

export function SurahPicker({
  open,
  onClose,
  value,
  recent,
  onPick,
  gender,
  kind,
}: {
  gender: Gender;
  kind: Kind;
  open: boolean;
  onClose: () => void;
  value: Target;
  recent: number[];
  onPick: (t: Target) => void;
}) {
  const [tab, setTab] = useState<Tab>(value.type === "juz" ? "juz" : value.type === "surah" ? "surah" : "other");
  const [query, setQuery] = useState("");
  const [custom, setCustom] = useState(value.type === "custom" ? value.text : "");
  const q = useDeferredValue(query);
  const search = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);

  // Open on the current choice, so Al-Naba' is not 77 rows down.
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      const box = list.current;
      const on = box?.querySelector<HTMLElement>('[aria-pressed="true"]');
      if (!box || !on) return;
      const a = on.getBoundingClientRect();
      const b = box.getBoundingClientRect();
      box.scrollTop += a.top - b.top - (b.height - a.height) / 2;
    });
    return () => cancelAnimationFrame(frame);
  }, [open, tab]);

  const surahs = useMemo(() => SURAHS.map((_, i) => i).filter((i) => surahMatches(i, q)), [q]);
  const ajza = useMemo(() => {
    const f = fold(q);
    return Array.from({ length: 30 }, (_, i) => i + 1).filter(
      (n) => !f || String(n).startsWith(f) || fold(juzName(n)).includes(f) || fold(SURAHS[JUZ_START_SURAH[n - 1] - 1]).includes(f),
    );
  }, [q]);

  const pick = (t: Target) => {
    haptic(10);
    onPick(t);
    setQuery("");
    onClose();
  };

  const item = (key: string, t: Target, n: number, title: string, sub?: string) => {
    const on = same(t, value);
    return (
      <motion.button
        key={key}
        type="button"
        whileTap={{ scale: 0.97 }}
        onClick={() => pick(t)}
        aria-pressed={on}
        className={`flex min-h-14 items-center gap-2.5 rounded-2xl border px-2.5 py-2 text-start transition-colors ${
          on ? "border-accent/40 bg-accent-soft" : "border-transparent bg-sunken/60 hover:bg-sunken"
        }`}
      >
        <NumberMark n={n} active={on} />
        <span className="min-w-0">
          <span className={`block truncate text-[16px] font-semibold ${on ? "text-accent" : ""}`}>{title}</span>
          {sub && <span className="block truncate text-[12.5px] text-ink-3">{sub}</span>}
        </span>
      </motion.button>
    );
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={gender === "f" ? "ماذا أنجزت الطالبة؟" : "ماذا أنجز الطالب؟"}
      initialFocus={tab === "other" || isTouch() ? undefined : search}
    >
      <div className="shrink-0 space-y-3 px-5 pb-3 md:px-6">
        <Segmented<Tab>
          label="النوع"
          size="sm"
          value={tab}
          onChange={setTab}
          options={[
            { value: "surah", label: "سورة" },
            { value: "juz", label: "جزء" },
            { value: "other", label: "أخرى" },
          ]}
        />
        {tab !== "other" && (
          <label className="flex h-12 items-center gap-2 rounded-2xl border border-line bg-surface px-3.5 transition-colors focus-within:border-accent/50">
            <MagnifyingGlass size={19} className="shrink-0 text-ink-3" />
            <input
              ref={search}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={tab === "surah" ? "ابحث باسم السورة أو رقمها" : "ابحث برقم الجزء أو بسورته"}
              className="h-full min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-ink-3"
              enterKeyHint="search"
              autoComplete="off"
            />
            {query && (
              <button type="button" aria-label="مسح البحث" onClick={() => setQuery("")} className="grid size-7 place-items-center rounded-full bg-sunken text-ink-3">
                <X size={13} weight="bold" />
              </button>
            )}
          </label>
        )}
      </div>

      <div ref={list} className="min-h-[46dvh] flex-1 overflow-y-auto overscroll-contain px-5 pb-6 md:min-h-0 md:px-6">
        {tab === "surah" && (
          <>
            {!q && recent.length > 0 && (
              <div className="mb-4">
                <div className="mb-2 text-[13px] font-medium text-ink-3">استخدمتها مؤخرًا</div>
                <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
                  {recent.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => pick({ type: "surah", n })}
                      className="h-9 shrink-0 rounded-full border border-line bg-surface px-3.5 text-[14px] font-medium transition-colors hover:border-line-strong active:scale-95"
                    >
                      {SURAHS[n - 1]}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {surahs.length ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {surahs.map((i) => item(`s${i}`, { type: "surah", n: i + 1 }, i + 1, SURAHS[i]))}
              </div>
            ) : (
              <Empty query={query} onUse={() => pick({ type: "custom", text: query.trim() })} />
            )}
          </>
        )}

        {tab === "juz" &&
          (ajza.length ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {ajza.map((n) => item(`j${n}`, { type: "juz", n }, n, juzName(n), `يبدأ من ${SURAHS[JUZ_START_SURAH[n - 1] - 1]}`))}
            </div>
          ) : (
            <Empty query={query} onUse={() => pick({ type: "custom", text: query.trim() })} />
          ))}

        {tab === "other" && (
          <div className="space-y-3 pt-1">
            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={() => pick({ type: "quran" })}
              className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-start transition-colors ${
                value.type === "quran" ? "border-accent/40 bg-accent-soft" : "border-line bg-surface hover:border-line-strong"
              }`}
            >
              <span className="grid size-11 place-items-center rounded-xl bg-gold-soft text-gold">
                <BookOpen size={22} weight="duotone" />
              </span>
              <span>
                <span className="block text-[16px] font-semibold">القرآن الكريم كاملًا</span>
                <span className="block text-[13px] text-ink-3">لمن أتمّ الختمة</span>
              </span>
            </motion.button>

            <form
              className="rounded-2xl border border-line bg-surface p-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (custom.trim()) pick({ type: "custom", text: custom.trim() });
              }}
            >
              <div className="mb-1 flex items-center gap-2 text-[16px] font-semibold">
                <PencilSimpleLine size={19} className="text-ink-3" />
                نص من اختيارك
              </div>
              <p className="mb-3 text-[13px] text-ink-3">
                يُكتب بعد «{gender === "f" ? "اجتيازها" : "اجتيازه"} {kind === "hifz" ? "حفظ" : "تلاوة"}» كما هو، مثل: جزء عمّ وجزء تبارك
              </p>
              <div className="flex gap-2">
                <input
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                  placeholder={gender === "f" ? "اكتب ما أنجزته الطالبة" : "اكتب ما أنجزه الطالب"}
                  maxLength={60}
                  className="h-12 min-w-0 flex-1 rounded-xl border border-line bg-bg px-3.5 text-[16px] outline-none transition-colors placeholder:text-ink-3 focus:border-accent/50"
                />
                <button
                  type="submit"
                  disabled={!custom.trim()}
                  className="h-12 shrink-0 rounded-xl bg-accent px-4 text-[15px] font-semibold text-accent-ink transition-opacity disabled:opacity-40"
                >
                  اعتماد
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </Sheet>
  );
}

function Empty({ query, onUse }: { query: string; onUse: () => void }) {
  return (
    <div className="flex flex-col items-center px-4 py-10 text-center">
      <div className="text-[15px] text-ink-2">لا يوجد ما يطابق «{query}»</div>
      <button
        type="button"
        onClick={onUse}
        className="mt-4 h-11 rounded-xl border border-line bg-surface px-4 text-[14.5px] font-medium transition-colors hover:border-line-strong active:scale-[0.98]"
      >
        استخدم «{query.trim()}» كما كتبته
      </button>
    </div>
  );
}

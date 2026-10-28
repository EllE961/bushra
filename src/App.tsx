import { BookOpenText, CaretDown, Heart, LockSimple, Sparkle, X } from "@phosphor-icons/react";
import { AnimatePresence, MotionConfig, motion, useAnimationControls } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, Mark, Switch, Toast } from "./components/Bits";
import { Faq } from "./components/Faq";
import { Preview } from "./components/Preview";
import { type Result, ResultSheet } from "./components/ResultSheet";
import { Segmented } from "./components/Segmented";
import { NumberMark, SurahPicker } from "./components/SurahPicker";
import { TemplatePicker } from "./components/TemplatePicker";
import { exportImage } from "./cert/render";
import { TEMPLATES } from "./cert/templates";
import { SHEET, type CertData, type Gender, type Kind, type Target } from "./cert/types";
import { fileName, haptic, isTouch } from "./lib/share";
import { usePrefs } from "./lib/store";
import { hijriToday, student, targetLabel } from "./lib/wording";

function targetNumber(t: Target) {
  return t.type === "surah" || t.type === "juz" ? t.n : null;
}

export function App() {
  const [prefs, set, setPrefs] = usePrefs();
  const [name, setName] = useState("");
  const [picker, setPicker] = useState(false);
  const [extras, setExtras] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const shake = useAnimationControls();

  const data: CertData = useMemo(
    () => ({
      name,
      gender: prefs.gender,
      kind: prefs.kind,
      target: prefs.target,
      school: prefs.school,
      date: prefs.date,
      verse: prefs.verse,
    }),
    [name, prefs.gender, prefs.kind, prefs.target, prefs.school, prefs.date, prefs.verse],
  );
  const template = TEMPLATES.some((t) => t.id === prefs.template) ? prefs.template : TEMPLATES[0].id;
  const who = student(prefs.gender);
  const placeholder = `اسم ${who}`;

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const generate = useCallback(async () => {
    if (busy) return;
    if (!name.trim()) {
      setError(true);
      haptic(30);
      shake.start({ x: [0, -10, 9, -6, 4, 0], transition: { duration: 0.45 } });
      nameInput.current?.focus();
      return;
    }
    setBusy(true);
    const started = performance.now();
    try {
      const blob = await exportImage(template, data, prefs.format);
      // Let the moment register even on a fast machine.
      await new Promise((r) => setTimeout(r, Math.max(0, 700 - (performance.now() - started))));
      const file = new File([blob], fileName(name.trim()), { type: "image/png" });
      const size = SHEET[prefs.format];
      setResult((old) => {
        if (old) URL.revokeObjectURL(old.url);
        return { blob, file, url: URL.createObjectURL(blob), width: size.export, height: Math.round((size.h / size.w) * size.export) };
      });
      haptic(18);
      if (prefs.target.type === "surah") {
        const n = prefs.target.n;
        set("recent", [n, ...prefs.recent.filter((x) => x !== n)].slice(0, 8));
      }
    } catch {
      setToast("تعذّر إنشاء الصورة، حاول مرة أخرى");
    } finally {
      setBusy(false);
    }
  }, [busy, name, template, data, prefs.format, prefs.target, prefs.recent, set, shake]);

  const next = () => {
    setResult(null);
    setName("");
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => nameInput.current?.focus({ preventScroll: true }), 420);
  };

  const n = targetNumber(prefs.target);
  const hijri = useMemo(() => hijriToday(), []);

  return (
    <MotionConfig reducedMotion="user">
      <div className="mx-auto max-w-6xl px-5 pb-[calc(120px+env(safe-area-inset-bottom))] lg:px-8 lg:pb-14">
        <motion.header
          className="flex items-center gap-3 pt-[max(16px,env(safe-area-inset-top))] pb-3 lg:py-7"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <Mark className="size-10" />
          <h1 className="leading-tight font-normal">
            <span className="block font-ruqaa text-[27px] leading-[1.15] font-bold text-ink">بُشرى</span>
            <span className="sr-only"> · </span>
            <span className="block text-[13px] text-ink-3">شهادات تهنئة لحفظ القرآن وتلاوته</span>
          </h1>
        </motion.header>

        <main className="lg:grid lg:grid-cols-[400px_minmax(0,1fr)] lg:items-start lg:gap-10">
          <div className="sticky top-0 z-20 -mx-5 bg-bg/90 px-5 pt-2 pb-4 backdrop-blur-md lg:order-2 lg:top-7 lg:mx-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <Preview
                template={template}
                format={prefs.format}
                data={data}
                placeholder={placeholder}
                label={`معاينة الشهادة: ${name || placeholder}، ${targetLabel(prefs.target)}`}
              />
            </motion.div>
            <div className="mt-6 hidden lg:block">
              <GenerateButton busy={busy} onClick={generate} />
            </div>
            <p className="mt-3 hidden items-center justify-center gap-1.5 text-[13px] text-ink-3 lg:flex">
              <LockSimple size={14} />
              تُصنع الصورة على جهازك، ولا يُرسل الاسم إلى أي مكان
            </p>
          </div>

          <div className="mt-1 space-y-4 lg:order-1 lg:mt-0">
            <Card
              title={`اسم ${who}`}
              delay={0.05}
              aside={
                <div className="w-[148px]">
                  <Segmented<Gender>
                    label="الطالب أو الطالبة"
                    size="sm"
                    value={prefs.gender}
                    onChange={(g) => set("gender", g)}
                    options={[
                      { value: "f", label: "طالبة" },
                      { value: "m", label: "طالب" },
                    ]}
                  />
                </div>
              }
            >
              <motion.div animate={shake}>
                <label
                  className={`flex h-14 items-center gap-2 rounded-2xl border bg-bg px-4 transition-colors focus-within:border-accent/60 focus-within:bg-surface ${
                    error ? "border-danger/60" : "border-line"
                  }`}
                >
                  <input
                    ref={nameInput}
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (error) setError(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter") return;
                      // On a phone the key just puts the keyboard away; on a computer it makes the certificate.
                      if (isTouch()) e.currentTarget.blur();
                      else generate();
                    }}
                    placeholder="الاسم كما سيظهر في الشهادة"
                    aria-label={`اسم ${who}`}
                    aria-invalid={error}
                    maxLength={70}
                    autoComplete="off"
                    enterKeyHint="done"
                    className="h-full min-w-0 flex-1 bg-transparent text-[18px] font-medium outline-none placeholder:font-normal placeholder:text-ink-3"
                  />
                  <AnimatePresence>
                    {name && (
                      <motion.button
                        type="button"
                        aria-label="مسح الاسم"
                        initial={{ opacity: 0, scale: 0.6 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.6 }}
                        onClick={() => {
                          setName("");
                          nameInput.current?.focus();
                        }}
                        className="grid size-7 shrink-0 place-items-center rounded-full bg-sunken text-ink-3 hover:text-ink"
                      >
                        <X size={13} weight="bold" />
                      </motion.button>
                    )}
                  </AnimatePresence>
                </label>
              </motion.div>
              <AnimatePresence>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden pt-2 text-[13.5px] text-danger"
                  >
                    اكتب اسم {who} أولًا
                  </motion.p>
                )}
              </AnimatePresence>
            </Card>

            <Card title="الإنجاز" delay={0.1}>
              <Segmented<Kind>
                label="نوع الإنجاز"
                value={prefs.kind}
                onChange={(k) => set("kind", k)}
                options={[
                  { value: "hifz", label: "حفظ", icon: <Heart size={18} weight="duotone" /> },
                  { value: "tilawah", label: "تلاوة", icon: <BookOpenText size={18} weight="duotone" /> },
                ]}
              />
              <motion.button
                type="button"
                whileTap={{ scale: 0.985 }}
                onClick={() => setPicker(true)}
                className="mt-3 flex h-16 w-full items-center gap-3 rounded-2xl border border-line bg-bg px-3 text-start transition-colors hover:border-line-strong"
              >
                {n !== null ? (
                  <NumberMark n={n} active />
                ) : (
                  <span className="grid size-9 place-items-center text-gold">
                    <Sparkle size={20} weight="fill" />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block text-[12.5px] text-ink-3">{prefs.kind === "hifz" ? "حفظ" : "تلاوة"}</span>
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span
                      key={targetLabel(prefs.target)}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.22 }}
                      className="block truncate text-[17px] font-semibold"
                    >
                      {targetLabel(prefs.target)}
                    </motion.span>
                  </AnimatePresence>
                </span>
                <span className="flex items-center gap-1 rounded-full bg-sunken px-3 py-1.5 text-[13px] font-medium text-ink-2">
                  تغيير
                  <CaretDown size={13} weight="bold" />
                </span>
              </motion.button>
            </Card>

            <Card title="التصميم" delay={0.15} aside={<span className="text-[13px] text-ink-3">{TEMPLATES.length} تصاميم</span>}>
              <TemplatePicker value={template} onChange={(id) => set("template", id)} data={data} format={prefs.format} placeholder={placeholder} />
            </Card>

            <motion.section
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden rounded-[22px] border border-line bg-surface shadow-card"
            >
              <button
                type="button"
                aria-expanded={extras}
                onClick={() => setExtras((v) => !v)}
                className="flex h-16 w-full items-center justify-between px-5 text-start"
              >
                <span>
                  <span className="block text-[16px] font-bold">خيارات إضافية</span>
                  <span className="block text-[13px] text-ink-3">اسم الحلقة، التاريخ، الآية، مقاس الصورة</span>
                </span>
                <motion.span animate={{ rotate: extras ? 180 : 0 }} transition={{ type: "spring", stiffness: 400, damping: 30 }} className="text-ink-3">
                  <CaretDown size={18} weight="bold" />
                </motion.span>
              </button>
              <AnimatePresence initial={false}>
                {extras && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <div className="space-y-1 border-t border-line px-5 pt-4 pb-4">
                      <label className="block">
                        <span className="mb-1.5 block text-[14px] font-medium text-ink-2">اسم المدرسة أو الحلقة</span>
                        <input
                          value={prefs.school}
                          onChange={(e) => set("school", e.target.value)}
                          placeholder="اختياري، يظهر أسفل الشهادة"
                          maxLength={60}
                          className="h-12 w-full rounded-xl border border-line bg-bg px-3.5 text-[16px] outline-none transition-colors placeholder:text-ink-3 focus:border-accent/60 focus:bg-surface"
                        />
                      </label>
                      <div className="divide-y divide-line">
                        <Switch label="التاريخ الهجري" hint={hijri} checked={prefs.date} onChange={(v) => set("date", v)} />
                        <Switch
                          label="الآية الكريمة"
                          hint={prefs.kind === "hifz" ? "من سورة القمر، أعلى الشهادة" : "من سورة المزمل، أعلى الشهادة"}
                          checked={prefs.verse}
                          onChange={(v) => set("verse", v)}
                        />
                      </div>
                      <div className="pt-2">
                        <span className="mb-2 block text-[14px] font-medium text-ink-2">مقاس الصورة</span>
                        <Segmented
                          label="مقاس الصورة"
                          size="sm"
                          value={prefs.format}
                          onChange={(f) => setPrefs((p) => ({ ...p, format: f }))}
                          options={[
                            { value: "wide", label: "للمشاركة" },
                            { value: "a4", label: "للطباعة A4" },
                          ]}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.section>

            <Faq />

            <footer className="px-1 pt-2 pb-2 text-center text-[12.5px] leading-relaxed text-ink-3 lg:text-start">
              <p className="flex items-center justify-center gap-1.5 lg:hidden">
                <LockSimple size={13} />
                تُصنع الصورة على جهازك، ولا يُرسل الاسم إلى أي مكان
              </p>
              <p>
                نص الآيات من{" "}
                <a href="https://tanzil.net" target="_blank" rel="noreferrer" className="underline decoration-line-strong underline-offset-4 hover:text-ink-2">
                  مشروع تنزيل
                </a>
              </p>
            </footer>
          </div>
        </main>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-bg via-bg/95 to-bg/0 px-5 pt-6 pb-[max(16px,env(safe-area-inset-bottom))] lg:hidden">
        <GenerateButton busy={busy} onClick={generate} />
      </div>

      <SurahPicker
        open={picker}
        onClose={() => setPicker(false)}
        value={prefs.target}
        recent={prefs.recent}
        gender={prefs.gender}
        kind={prefs.kind}
        onPick={(t) => set("target", t)}
      />
      <ResultSheet result={result} onClose={() => setResult(null)} onNext={next} gender={prefs.gender} notify={setToast} />
      <Toast message={toast} />
    </MotionConfig>
  );
}

function GenerateButton({ busy, onClick }: { busy: boolean; onClick: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      aria-busy={busy}
      className={`relative flex h-[58px] w-full items-center justify-center gap-2.5 overflow-hidden rounded-[18px] bg-accent text-[17px] font-semibold text-accent-ink shadow-lift transition-colors hover:bg-accent-2 ${
        busy ? "shimmer" : ""
      }`}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={busy ? "busy" : "idle"}
          className="flex items-center gap-2.5"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {busy ? (
            <>
              <svg viewBox="0 0 20 20" className="size-5 animate-spin" aria-hidden>
                <circle cx="10" cy="10" r="7.5" fill="none" stroke="currentColor" strokeOpacity=".3" strokeWidth="2.5" />
                <path d="M17.5 10a7.5 7.5 0 0 0-7.5-7.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
              جارٍ تجهيز الصورة
            </>
          ) : (
            <>
              <Sparkle size={20} weight="fill" />
              إنشاء الشهادة
            </>
          )}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}

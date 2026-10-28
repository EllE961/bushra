import { Plus } from "@phosphor-icons/react";
import { FAQ } from "../lib/faq";

/** Native disclosure rows: the answers stay in the page for readers and search engines alike. */
export function Faq() {
  return (
    <section aria-labelledby="faq-title" className="rounded-[22px] border border-line bg-surface px-5 pt-5 pb-2 shadow-card">
      <h2 id="faq-title" className="mb-1 text-[16px] font-bold">
        أسئلة شائعة
      </h2>
      <div className="divide-y divide-line">
        {FAQ.map(({ q, a }) => (
          <details key={q} className="group py-1">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-3 text-[15px] font-medium [&::-webkit-details-marker]:hidden">
              {q}
              <Plus size={16} weight="bold" className="shrink-0 text-ink-3 transition-transform duration-300 group-open:rotate-45" />
            </summary>
            <p className="pb-3 text-[14.5px] leading-relaxed text-ink-2">{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

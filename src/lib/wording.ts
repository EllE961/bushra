import type { CertData, Gender, Target } from "../cert/types";
import { SURAHS, juzName } from "./quran";
import { VERSES } from "./verses";

export function targetLabel(t: Target): string {
  switch (t.type) {
    case "surah":
      return `سورة ${SURAHS[t.n - 1]}`;
    case "juz":
      return juzName(t.n);
    case "quran":
      return "القرآن الكريم كاملًا";
    case "custom":
      return t.text.trim();
  }
}

export const student = (g: Gender) => (g === "f" ? "الطالبة" : "الطالب");

export function hijriToday(): string {
  try {
    return new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura-nu-latn", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date());
  } catch {
    return "";
  }
}

export interface Wording {
  verse: string | null;
  intro: string;
  name: string;
  deed: string;
  target: string;
  prayer: string;
  footer: string;
}

/** Everything the certificate says, with the pronouns following the student. */
export function wording(d: CertData): Wording {
  const f = d.gender === "f";
  return {
    verse: d.verse ? `﴿ ${VERSES[d.kind]} ﴾` : null,
    intro: f ? "نبارك للطالبة" : "نبارك للطالب",
    name: d.name.trim().replace(/\s+/g, " "),
    deed: `${f ? "اجتيازها" : "اجتيازه"} ${d.kind === "hifz" ? "حفظ" : "تلاوة"}`,
    target: targetLabel(d.target),
    prayer: f
      ? "نسأل الله العظيم أن يجعل القرآن الكريم ربيع قلبها ونورًا لدربها،\nوأن يجعلها مباركةً أينما كانت"
      : "نسأل الله العظيم أن يجعل القرآن الكريم ربيع قلبه ونورًا لدربه،\nوأن يجعله مباركًا أينما كان",
    footer: [d.school.trim(), d.date ? hijriToday() : ""].filter(Boolean).join("   ·   "),
  };
}

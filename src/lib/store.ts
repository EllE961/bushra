import { useCallback, useEffect, useState } from "react";
import type { Format, Gender, Kind, Target } from "../cert/types";

/** What a teacher keeps from one certificate to the next. The name is never stored. */
export interface Prefs {
  gender: Gender;
  kind: Kind;
  target: Target;
  template: string;
  format: Format;
  school: string;
  date: boolean;
  verse: boolean;
  recent: number[];
}

const KEY = "bushra:prefs:v1";

const DEFAULTS: Prefs = {
  gender: "f",
  kind: "hifz",
  target: { type: "surah", n: 4 },
  template: "rose",
  format: "wide",
  school: "",
  date: false,
  verse: true,
  recent: [],
};

function load(): Prefs {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

export function usePrefs() {
  const [prefs, setPrefs] = useState<Prefs>(load);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(prefs));
    } catch {
      // Private mode or storage full: the app still works, it just forgets.
    }
  }, [prefs]);
  const set = useCallback(<K extends keyof Prefs>(key: K, value: Prefs[K]) => setPrefs((p) => ({ ...p, [key]: value })), []);
  return [prefs, set, setPrefs] as const;
}

import { render } from "../cert/render";
import { TEMPLATES } from "../cert/templates";
import type { CertData, Format } from "../cert/types";

/** Every design in a grid, for judging the set side by side. */
export async function mount(params: URLSearchParams) {
  const format = (params.get("format") ?? "wide") as Format;
  const cols = Number(params.get("cols") ?? 2);
  const width = Number(params.get("w") ?? 960);
  const gap = Number(params.get("gap") ?? 0);
  const data: CertData = {
    name: params.get("name") ?? "مريم بنت سعيد الحارثية",
    gender: (params.get("g") ?? "f") as "f" | "m",
    kind: (params.get("kind") ?? "hifz") as "hifz" | "tilawah",
    target: { type: "surah", n: Number(params.get("surah") ?? 4) },
    school: params.get("school") ?? "",
    date: params.has("date"),
    verse: !params.has("noverse"),
  };
  document.body.style.cssText = `margin:0;background:${params.get("bg") ?? "#000"}`;
  const grid = document.createElement("div");
  grid.style.cssText = `display:grid;grid-template-columns:repeat(${cols},${width}px);gap:${gap}px;padding:${gap}px;width:max-content`;
  document.body.replaceChildren(grid);
  await Promise.all(
    TEMPLATES.map((t) => {
      const c = document.createElement("canvas");
      c.style.cssText = `display:block;width:${width}px;border-radius:${gap ? 10 : 0}px`;
      grid.append(c);
      return render(c, t.id, data, format, width * 2);
    }),
  );
  document.title = "done";
}

import { render } from "../cert/render";
import { SHEET, type CertData, type Format } from "../cert/types";

export async function mount(params: URLSearchParams) {
  const format = (params.get("format") ?? "wide") as Format;
  const data: CertData = {
    name: params.get("name") ?? "مريم بنت سعيد الحارثية",
    gender: (params.get("g") ?? "f") as "f" | "m",
    kind: (params.get("kind") ?? "tilawah") as "hifz" | "tilawah",
    target: { type: "surah", n: Number(params.get("surah") ?? 4) },
    school: params.get("school") ?? "",
    date: params.has("date"),
    verse: !params.has("noverse"),
  };
  const width = Number(params.get("w") ?? SHEET[format].w);
  document.body.style.margin = "0";
  const canvas = document.createElement("canvas");
  canvas.style.display = "block";
  canvas.style.width = `${SHEET[format].w}px`;
  document.body.append(canvas);
  const t0 = performance.now();
  await render(canvas, params.get("render") || "rose", data, format, width);
  console.log(`rendered in ${Math.round(performance.now() - t0)}ms`);
  document.title = "done";
}

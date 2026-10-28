import { render } from "../cert/render";
import type { CertData } from "../cert/types";

const mark = (size: number, bleed: boolean) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="${size}" height="${size}">
  <rect width="40" height="40" rx="${bleed ? 0 : 9}" fill="#0f5a48"/>
  <g transform="translate(20 20) scale(${bleed ? 0.82 : 1.12}) translate(-20 -20)">
    <g fill="none" stroke="#e7c27a" stroke-width="1.7" stroke-linejoin="round">
      <rect x="11" y="11" width="18" height="18" rx="2.2"/>
      <rect x="11" y="11" width="18" height="18" rx="2.2" transform="rotate(45 20 20)"/>
    </g>
    <circle cx="20" cy="20" r="3.2" fill="#e7c27a"/>
  </g>
</svg>`;

/** App icons and the link preview image, rendered for screenshots. */
export async function mount(params: URLSearchParams) {
  const what = params.get("brand");
  document.body.style.cssText = "margin:0;background:transparent";
  if (what === "icon" || what === "maskable") {
    const size = Number(params.get("size") ?? 512);
    document.body.innerHTML = mark(size, what === "maskable");
    document.title = "done";
    return;
  }
  // The link preview: a certificate on the page's own paper, with the name of the tool.
  document.body.innerHTML = `
  <div style="width:1200px;height:630px;position:relative;overflow:hidden;background:#f3eee5;font-family:'IBM Plex Sans Arabic';direction:rtl">
    <div style="position:absolute;top:0;right:0;width:470px;height:630px;display:flex;flex-direction:column;justify-content:center;padding:0 64px 0 0;box-sizing:border-box">
      <div style="display:flex;align-items:center;gap:18px">${mark(76, false)}
        <div style="font-family:'Aref Ruqaa';font-weight:700;font-size:76px;line-height:1.1;color:#1d1914">بُشرى</div>
      </div>
      <div style="margin-top:22px;font-size:34px;font-weight:700;line-height:1.45;color:#1d1914">شهادات تهنئة لحفظ<br/>القرآن وتلاوته</div>
      <div style="margin-top:16px;font-size:22px;line-height:1.7;color:#6b6256">اكتب الاسم، واختر السورة والتصميم، ونزّل الصورة.</div>
    </div>
    <canvas id="b" style="position:absolute;left:96px;top:70px;width:600px;border-radius:14px;transform:rotate(-5deg);box-shadow:0 30px 60px -24px rgba(32,24,12,.45)"></canvas>
    <canvas id="a" style="position:absolute;left:40px;top:200px;width:640px;border-radius:14px;transform:rotate(2deg);box-shadow:0 40px 80px -28px rgba(32,24,12,.55)"></canvas>
  </div>`;
  const data: CertData = { name: "مريم بنت سعيد الحارثية", gender: "f", kind: "hifz", target: { type: "surah", n: 18 }, school: "", date: false, verse: true };
  await document.fonts.load("700 40px 'Aref Ruqaa'", "بشرى");
  await document.fonts.load("700 20px 'IBM Plex Sans Arabic'", "شهادات");
  await Promise.all([
    render(document.getElementById("a") as HTMLCanvasElement, "rose", data, "wide", 1280),
    render(document.getElementById("b") as HTMLCanvasElement, "night", { ...data, name: "عبدالله بن سالم الهنائي", gender: "m" }, "wide", 1200),
  ]);
  document.title = "done";
}

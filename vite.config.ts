import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { type Plugin, defineConfig, loadEnv } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { FAQ } from "./src/lib/faq";

/** Describes the tool to search engines, with the same questions and answers the page shows. */
function structuredData(site: string): Plugin {
  const data = [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "بُشرى",
      alternateName: "Bushra",
      url: `${site}/`,
      description: "أداة مجانية لتصميم شهادات تهنئة لحفظ القرآن الكريم وتلاوته، بتصاميم متنوعة، تُنزَّل صورةً جاهزة للمشاركة أو الطباعة.",
      applicationCategory: "DesignApplication",
      operatingSystem: "Any",
      inLanguage: "ar",
      isAccessibleForFree: true,
      image: `${site}/og.jpg`,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      inLanguage: "ar",
      mainEntity: FAQ.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
    },
  ];
  const json = JSON.stringify(data).replace(/</g, "\u003c");
  return {
    name: "structured-data",
    transformIndexHtml: (html) => html.replace("</head>", `  <script type="application/ld+json">${json}</script>\n  </head>`),
  };
}

export default defineConfig(({ mode }) => {
  const site = loadEnv(mode, ".").VITE_SITE_URL ?? "";
  return {
    plugins: [
      react(),
      tailwindcss(),
      structuredData(site),
      // Installable, and usable offline once opened: schools do not always have a signal.
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["favicon.svg", "apple-touch-icon.png"],
        manifest: {
          name: "بُشرى: شهادات تهنئة لحفظ القرآن وتلاوته",
          short_name: "بُشرى",
          description: "اكتب اسم الطالب، واختر السورة والتصميم، ونزّل شهادة التهنئة صورةً جاهزة.",
          lang: "ar",
          dir: "rtl",
          start_url: "/",
          display: "standalone",
          background_color: "#f3eee5",
          theme_color: "#f3eee5",
          icons: [
            { src: "icon-192.png", sizes: "192x192", type: "image/png" },
            { src: "icon-512.png", sizes: "512x512", type: "image/png" },
            { src: "icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          ],
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
          // Only the Arabic and Latin font subsets are ever drawn.
          globIgnores: ["**/*cyrillic*", "**/*greek*", "**/*vietnamese*", "**/*latin-ext*", "**/*math*", "**/*symbols*"],
          maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        },
      }),
    ],
    worker: { format: "es" },
  };
});

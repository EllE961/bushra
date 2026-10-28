import "@fontsource/ibm-plex-sans-arabic/400.css";
import "@fontsource/ibm-plex-sans-arabic/500.css";
import "@fontsource/ibm-plex-sans-arabic/600.css";
import "@fontsource/ibm-plex-sans-arabic/700.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./cert/fonts";
import "./styles.css";

const params = new URLSearchParams(location.search);

if (import.meta.env.DEV && params.has("render")) {
  // A bare full-size render for checking artwork with a headless browser.
  import("./dev/render-page").then((m) => m.mount(params));
} else if (import.meta.env.DEV && params.has("brand")) {
  import("./dev/brand-page").then((m) => m.mount(params));
} else if (import.meta.env.DEV && params.has("contact")) {
  import("./dev/contact-page").then((m) => m.mount(params));
} else {
  import("./App").then(({ App }) =>
    createRoot(document.getElementById("root")!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    ),
  );
}

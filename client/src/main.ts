// ============================================================
// LORE — client entry point.
// ============================================================
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/card.css";
import "./styles/game.css";
import "./styles/screens.css";
import "./styles/mobile.css";
import { App } from "./router";
import { initLang } from "./i18n";
import { initAnalytics } from "./net/analytics";
import { initSound, sfx } from "./ui/sound";
import { initCardTilt } from "./ui/tilt";

/** Capture acquisition params (invite ref + UTM) before any navigation strips them. */
function captureAcquisition(): void {
  try {
    const p = new URLSearchParams(location.search);
    const ref = p.get("ref");
    if (ref) localStorage.setItem("lore_ref", ref.slice(0, 16));
    const utm = ["utm_source", "utm_medium", "utm_campaign"].map((k) => p.get(k)).filter(Boolean).join("/");
    if (utm) localStorage.setItem("lore_src", utm.slice(0, 120));
    else if (ref && !localStorage.getItem("lore_src")) localStorage.setItem("lore_src", `ref:${ref.slice(0, 16)}`);
  } catch { /* storage unavailable */ }
}

/** One delegated listener = click sounds for every button-ish element, home and in-game. */
function bindUiSounds(): void {
  document.addEventListener("click", (e) => {
    const el = (e.target as HTMLElement | null)?.closest?.("button, .btn, .mode-card, .tut-card, a[id]");
    if (el && !(el as HTMLButtonElement).disabled) sfx("click");
  }, { capture: true });
}

async function boot(): Promise<void> {
  captureAcquisition();
  initSound();
  bindUiSounds();
  initCardTilt();
  initAnalytics(); // dormant unless POSTHOG_KEY is set
  let country = "";
  try { country = ((await fetch("/api/geo").then((r) => r.json())) as { country?: string }).country || ""; } catch { /* offline / dev */ }
  initLang(country === "JP" ? "ja" : country === "KR" ? "ko" : "en"); // JP→ja, KR→ko, elsewhere→en
  const root = document.getElementById("app");
  if (root) new App(root).start();
}
boot();

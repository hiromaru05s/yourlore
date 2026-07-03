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

async function boot(): Promise<void> {
  let country = "";
  try { country = ((await fetch("/api/geo").then((r) => r.json())) as { country?: string }).country || ""; } catch { /* offline / dev */ }
  initLang(country === "JP" ? "ja" : country === "KR" ? "ko" : "en"); // JP→ja, KR→ko, elsewhere→en
  const root = document.getElementById("app");
  if (root) new App(root).start();
}
boot();

// ============================================================
// LORE — language dropdown (한국어 / 日本語)
// ============================================================
import { getLang, setLang, type Lang } from "../i18n";

export function langSelectEl(): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "lang-select";
  const sel = document.createElement("select");
  sel.innerHTML =
    `<option value="ko"${getLang() === "ko" ? " selected" : ""}>한국어</option>` +
    `<option value="ja"${getLang() === "ja" ? " selected" : ""}>日本語</option>`;
  sel.onchange = () => setLang(sel.value as Lang);
  wrap.appendChild(sel);
  return wrap;
}

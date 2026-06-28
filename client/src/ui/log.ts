// ============================================================
// LORE — battle log panel. Groups lines under turn headers,
// newest at the bottom, auto-scrolls. Bilingual: each line keeps
// both KO/JA HTML and re-renders when the language changes; card
// names inside lines are localized by their card id.
// ============================================================
import { DB } from "../shared/cards";
import { zoomCard } from "./anim";
import { cardName, getLang, onLangChange, t } from "../i18n";

type Entry =
  | { kind: "header"; turn: number; name: string; isBot: boolean }
  | { kind: "line"; ko: string; ja: string };

export class GameLog {
  private el: HTMLElement;
  private entries: Entry[] = [];
  private unsub: () => void;

  constructor(el: HTMLElement) {
    this.el = el;
    // clicking a card name in the log zooms that card
    this.el.addEventListener("click", (e) => {
      const t = (e.target as HTMLElement).closest(".log-card") as HTMLElement | null;
      const id = t?.dataset.card;
      if (id && DB[id]) zoomCard({ uid: "log_" + id, ...DB[id] });
    });
    this.unsub = onLangChange(() => this.renderAll());
  }

  clear(): void { this.entries = []; this.el.innerHTML = ""; }

  turnHeader(turn: number, name: string, isBot: boolean): void {
    const entry: Entry = { kind: "header", turn, name, isBot };
    this.entries.push(entry);
    this.el.appendChild(this.build(entry));
    this.scroll();
  }

  line(ko: string, ja?: string): void {
    const entry: Entry = { kind: "line", ko, ja: ja ?? ko };
    this.entries.push(entry);
    this.el.appendChild(this.build(entry));
    this.scroll();
  }

  dispose(): void { this.unsub(); }

  // ---- rendering ----
  private build(entry: Entry): HTMLElement {
    if (entry.kind === "header") {
      const h = document.createElement("div");
      h.className = "turn-head" + (entry.isBot ? " bot" : "");
      h.textContent = `${t("game.turn")} ${entry.turn} — ${entry.name}`;
      return h;
    }
    const d = document.createElement("div");
    d.className = "ln";
    d.innerHTML = getLang() === "ja" ? entry.ja : entry.ko;
    this.localizeCards(d);
    return d;
  }

  /** Localize each clickable card name to the current language by its card id. */
  private localizeCards(node: HTMLElement): void {
    node.querySelectorAll<HTMLElement>(".log-card").forEach((el) => {
      const id = el.dataset.card;
      if (id && DB[id]) el.textContent = cardName({ uid: "", ...DB[id] });
    });
  }

  private renderAll(): void {
    this.el.innerHTML = "";
    for (const e of this.entries) this.el.appendChild(this.build(e));
    this.scroll();
  }

  private scroll(): void { this.el.scrollTop = this.el.scrollHeight; }
}

// ============================================================
// LORE — battle log panel. Groups lines under turn headers,
// newest at the bottom, auto-scrolls. Bilingual: each line keeps
// both KO/JA HTML and re-renders when the language changes; card
// names inside lines are localized by their card id.
// ============================================================
import { DB } from "../shared/cards";
import { zoomCard } from "./anim";
import { cardName, getLang, onLangChange, t } from "../i18n";
import { logToEn } from "../shared/logEn";

type Entry =
  | { kind: "header"; turn: number; name: string; isBot: boolean; mine?: boolean }
  | { kind: "line"; ko: string; ja: string; mine?: boolean };

export class GameLog {
  private el: HTMLElement;
  private entries: Entry[] = [];
  private unsub: () => void;
  private curMine: boolean | undefined; // 현재 턴 주인 (라인 배경 틴트용)

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

  turnHeader(turn: number, name: string, isBot: boolean, mine?: boolean): void {
    if (isBot) mine = false; // 봇 턴은 항상 상대
    this.curMine = mine;
    const entry: Entry = { kind: "header", turn, name, isBot, mine };
    this.entries.push(entry);
    this.el.appendChild(this.build(entry));
    this.scroll();
  }

  line(ko: string, ja?: string): void {
    const entry: Entry = { kind: "line", ko, ja: ja ?? ko, mine: this.curMine };
    this.entries.push(entry);
    this.el.appendChild(this.build(entry));
    this.scroll();
  }

  dispose(): void { this.unsub(); }

  // ---- rendering ----
  private build(entry: Entry): HTMLElement {
    const side = entry.mine === true ? " mine" : entry.mine === false ? " opp" : "";
    if (entry.kind === "header") {
      const h = document.createElement("div");
      h.className = "turn-head" + (entry.isBot ? " bot" : "") + side;
      h.textContent = `${t("game.turn")} ${entry.turn} — ${entry.name}`;
      return h;
    }
    const d = document.createElement("div");
    d.className = "ln" + side;
    const lang = getLang();
    d.innerHTML = lang === "ja" ? entry.ja : lang === "en" ? logToEn(entry.ko) : entry.ko;
    this.localizeCards(d);
    return d;
  }

  /** Localize each clickable card name to the current language + color it by card type. */
  private localizeCards(node: HTMLElement): void {
    node.querySelectorAll<HTMLElement>(".log-card").forEach((el) => {
      const id = el.dataset.card;
      if (id && DB[id]) {
        el.textContent = cardName({ uid: "", ...DB[id] });
        el.classList.add("lc-" + DB[id].t); // lc-mon / lc-spell / lc-trap / lc-starter
      }
    });
  }

  private renderAll(): void {
    this.el.innerHTML = "";
    for (const e of this.entries) this.el.appendChild(this.build(e));
    this.scroll();
  }

  private scroll(): void { this.el.scrollTop = this.el.scrollHeight; }
}

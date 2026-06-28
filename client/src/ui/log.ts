// ============================================================
// LORE — battle log panel. Groups lines under turn headers,
// newest at the bottom, auto-scrolls.
// ============================================================
import { DB } from "../shared/cards";
import { zoomCard } from "./anim";

export class GameLog {
  private el: HTMLElement;

  constructor(el: HTMLElement) {
    this.el = el;
    // clicking a card name in the log zooms that card
    this.el.addEventListener("click", (e) => {
      const t = (e.target as HTMLElement).closest(".log-card") as HTMLElement | null;
      const id = t?.dataset.card;
      if (id && DB[id]) zoomCard({ uid: "log_" + id, ...DB[id] });
    });
  }

  clear(): void { this.el.innerHTML = ""; }

  turnHeader(turn: number, name: string, isBot: boolean): void {
    const h = document.createElement("div");
    h.className = "turn-head" + (isBot ? " bot" : "");
    h.textContent = `TURN ${turn} — ${name}`;
    this.el.appendChild(h);
    this.scroll();
  }

  line(html: string): void {
    const d = document.createElement("div");
    d.className = "ln";
    d.innerHTML = html;
    this.el.appendChild(d);
    this.scroll();
  }

  private scroll(): void { this.el.scrollTop = this.el.scrollHeight; }
}

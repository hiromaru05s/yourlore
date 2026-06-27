// ============================================================
// LORE — battle log panel. Groups lines under turn headers,
// newest at the bottom, auto-scrolls.
// ============================================================
export class GameLog {
  private el: HTMLElement;

  constructor(el: HTMLElement) { this.el = el; }

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

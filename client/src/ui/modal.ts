// ============================================================
// LORE — overlays: generic modal, confirm (surrender), win,
// treasure reveal, and the seek/recall card picker.
// ============================================================
import type { CardInst } from "../shared/types";
import { cardEl } from "./cardView";
import { TRIBES } from "../shared/cards";
import { t, getLang } from "../i18n";

let root: HTMLElement | null = null;
function getRoot(): HTMLElement {
  if (!root) { root = document.createElement("div"); root.id = "overlayRoot"; document.body.appendChild(root); }
  return root;
}
export function closeOverlay(): void { getRoot().innerHTML = ""; }

function mount(node: HTMLElement): void {
  const ov = document.createElement("div");
  ov.className = "overlay";
  ov.appendChild(node);
  getRoot().innerHTML = "";
  getRoot().appendChild(ov);
}

/** YES/NO confirm. Resolves true on confirm. */
export function confirmDialog(opts: { title: string; body?: string; confirm: string; cancel: string; danger?: boolean }): Promise<boolean> {
  return new Promise((resolve) => {
    const m = document.createElement("div");
    m.className = "modal";
    m.innerHTML = `<h2>${opts.title}</h2>${opts.body ? `<p>${opts.body}</p>` : ""}<div class="modal-row"></div>`;
    const row = m.querySelector(".modal-row")!;
    const no = document.createElement("button");
    no.className = "btn btn-ghost"; no.textContent = opts.cancel;
    const yes = document.createElement("button");
    yes.className = "btn " + (opts.danger ? "btn-danger" : "btn-primary"); yes.textContent = opts.confirm;
    no.onclick = () => { closeOverlay(); resolve(false); };
    yes.onclick = () => { closeOverlay(); resolve(true); };
    row.append(no, yes);
    mount(m);
  });
}

export function winModal(won: boolean, detail: string, onAgain: () => void, onHome: () => void): void {
  const m = document.createElement("div");
  m.className = "modal";
  const title = won ? t("modal.win") : t("modal.lose");
  const color = won ? "var(--gold-glow)" : "var(--vermil-hi)";
  m.innerHTML = `<h2 style="color:${color}">${title}</h2><p style="color:var(--paper);font-size:14px">${detail}</p><p>${t("modal.gameover")}</p><div class="modal-row"></div>`;
  const row = m.querySelector(".modal-row")!;
  const home = document.createElement("button"); home.className = "btn btn-ghost"; home.textContent = t("modal.home");
  const again = document.createElement("button"); again.className = "btn btn-gold"; again.textContent = t("modal.again");
  home.onclick = () => { closeOverlay(); onHome(); };
  again.onclick = () => { closeOverlay(); onAgain(); };
  row.append(home, again);
  mount(m);
}

/** Simple notice with a single button (e.g. disconnect). */
export function noticeModal(title: string, body: string, btn: string, onClick: () => void): void {
  const m = document.createElement("div");
  m.className = "modal";
  m.innerHTML = `<h2>${title}</h2><p>${body}</p><div class="modal-row"></div>`;
  const b = document.createElement("button"); b.className = "btn btn-primary"; b.textContent = btn;
  b.onclick = () => { closeOverlay(); onClick(); };
  m.querySelector(".modal-row")!.appendChild(b);
  mount(m);
}

export function treasureModal(kind: string, text: string): void {
  const ico = kind === "mana" ? "◆" : kind === "hp" ? "✚" : kind === "mimic" ? "👹" : "❤";
  const m = document.createElement("div");
  m.className = "modal";
  m.innerHTML = `<h2>${t("treasure.title")}</h2><div class="chest-reward">${ico}</div><div class="treasure-roll">${text}</div><div class="modal-row"></div>`;
  const ok = document.createElement("button"); ok.className = "btn btn-gold"; ok.textContent = t("treasure.get");
  ok.onclick = () => closeOverlay();
  m.querySelector(".modal-row")!.appendChild(ok);
  mount(m);
}

/** Tribe synergy info popup (tap a tribe tag). */
export function showTribeInfo(tribe: string): void {
  const info = TRIBES[tribe]?.[getLang()];
  if (!info) return;
  const m = document.createElement("div");
  m.className = "modal";
  m.innerHTML = `<h2>${info.name} ${t("tribe.suffix")}</h2><div style="color:var(--vermil-hi);font-size:12px;margin-bottom:10px">${info.note}</div><div style="text-align:left;color:var(--paper);font-size:13px;line-height:1.8">${info.bonuses.map((b) => "• " + b).join("<br>")}</div><p style="margin-top:8px">${t("tribe.footer")}</p><div class="modal-row"></div>`;
  const ok = document.createElement("button");
  ok.className = "btn btn-gold"; ok.textContent = t("common.confirm"); ok.onclick = () => closeOverlay();
  m.querySelector(".modal-row")!.appendChild(ok);
  mount(m);
}

/** Seek/Recall picker. Calls onPick with chosen uid (or null on cancel). */
export function cardPicker(title: string, pool: CardInst[], onPick: (uid: string | null) => void): void {
  const m = document.createElement("div");
  m.className = "modal"; m.style.maxWidth = "720px";
  m.innerHTML = `<h2 style="font-size:14px">${title}</h2><div class="picker-grid" style="display:flex;gap:9px;flex-wrap:wrap;justify-content:center;margin:16px 0;max-height:54vh;overflow:auto"></div><div class="modal-row"></div>`;
  const grid = m.querySelector(".picker-grid")!;
  pool.forEach((c) => {
    const card = cardEl(c, { playable: true });
    card.onclick = () => { closeOverlay(); onPick(c.uid); };
    grid.appendChild(card);
  });
  const cancel = document.createElement("button");
  cancel.className = "btn btn-ghost"; cancel.textContent = t("common.cancel");
  cancel.onclick = () => { closeOverlay(); onPick(null); };
  m.querySelector(".modal-row")!.appendChild(cancel);
  mount(m);
}

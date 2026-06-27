// ============================================================
// LORE — overlays: generic modal, confirm (surrender), win,
// treasure reveal, and the seek/recall card picker.
// ============================================================
import type { CardInst } from "../shared/types";
import { cardEl } from "./cardView";

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

export function winModal(name: string, onAgain: () => void, onHome: () => void): void {
  const m = document.createElement("div");
  m.className = "modal";
  m.innerHTML = `<h2>승리</h2><p style="color:var(--paper);font-size:15px">${name} 의 승리</p><p>LORE · 1게임 종료</p><div class="modal-row"></div>`;
  const row = m.querySelector(".modal-row")!;
  const home = document.createElement("button"); home.className = "btn btn-ghost"; home.textContent = "홈으로";
  const again = document.createElement("button"); again.className = "btn btn-gold"; again.textContent = "다시 하기";
  home.onclick = () => { closeOverlay(); onHome(); };
  again.onclick = () => { closeOverlay(); onAgain(); };
  row.append(home, again);
  mount(m);
}

export function treasureModal(kind: string, text: string): void {
  const ico = kind === "mana" ? "◆" : kind === "hp" ? "✚" : "❤";
  const m = document.createElement("div");
  m.className = "modal";
  m.innerHTML = `<h2>보물상자</h2><div class="chest-reward">${ico}</div><div class="treasure-roll">${text}</div><div class="modal-row"></div>`;
  const ok = document.createElement("button"); ok.className = "btn btn-gold"; ok.textContent = "받기";
  ok.onclick = () => closeOverlay();
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
  cancel.className = "btn btn-ghost"; cancel.textContent = "취소";
  cancel.onclick = () => { closeOverlay(); onPick(null); };
  m.querySelector(".modal-row")!.appendChild(cancel);
  mount(m);
}

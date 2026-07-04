// ============================================================
// LORE — card DOM builder. One renderer for every card everywhere
// (board / market / hand / pile / zoom) so sizing stays consistent.
// ============================================================
import type { CardInst, FieldMon, PlayerState } from "../shared/types";
import { FRAME_BACK, TRIBES } from "../shared/cards";
import { effAtk, effDef, playCost } from "../shared/engine";
import { showTribeInfo } from "./modal";
import { cardName, cardText, getLang } from "../i18n";

export interface CardOpts {
  size?: "board" | "mkt" | "hand";
  field?: boolean;
  owner?: PlayerState;
  playable?: boolean;
  buyable?: boolean;
  dim?: boolean;
  attacker?: boolean;
  targetable?: boolean;
  exhausted?: boolean;
  costOverride?: number;
  badge?: string;
}

function el(tag: string, cls?: string, html?: string): HTMLElement {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}

function artEl(cardId: string): HTMLElement {
  const art = el("div", "card-art");
  const img = document.createElement("img");
  img.src = `/art/cards/${cardId}.webp`;
  img.alt = "";
  img.loading = "lazy";
  img.decoding = "async";
  img.onerror = () => img.remove();
  art.appendChild(img);
  return art;
}

export function cardEl(c: CardInst, opt: CardOpts = {}): HTMLElement {
  const typeClass = c.t === "mon" ? "card--mon" : c.t === "trap" ? "card--trap" : c.t === "starter" ? "card--starter" : "card--spell";
  const sizeClass = opt.size === "mkt" ? "card--mkt" : opt.size === "hand" ? "card--hand" : "";
  const node = el("div", `card ${typeClass} ${sizeClass}`.trim());
  node.dataset.uid = c.uid;
  // 3-layer card, fully CSS-drawn (responsive, no PNG): art (behind) → frame
  // (drawn border + name/stat plates, transparent art window) → text/cost (front).
  node.appendChild(artEl(c.id));
  node.appendChild(el("div", "card-frame"));
  const tico = c.t === "mon" ? "⚔" : c.t === "trap" ? "▽" : c.t === "starter" ? "◈" : "✦";
  node.appendChild(el("div", "card-tico", tico));

  if (opt.playable) node.classList.add("is-playable");
  if (opt.buyable) node.classList.add("is-buyable");
  if (opt.dim) node.classList.add("is-dim");
  if (opt.attacker) node.classList.add("is-attacker");
  if (opt.targetable) node.classList.add("is-targetable");
  if (opt.exhausted) node.classList.add("is-exhausted");

  const cost = opt.costOverride != null ? opt.costOverride : c.cost;
  node.appendChild(el("div", "card-cost", String(cost)));
  // 시전(발동) 코스트가 구매 코스트와 다르면 보조 배지로 통일 표기
  const pc = playCost(c);
  if (c.t !== "starter" && pc !== c.cost && opt.costOverride == null) {
    node.appendChild(el("div", "card-play", `⚡${pc}`));
  }
  const nm = cardName(c);
  const nameEl2 = el("div", "card-name" + (nm.length >= 9 ? " card-name--long" : ""), nm);
  node.appendChild(nameEl2);

  if (c.t === "mon") {
    const a = opt.field && opt.owner ? effAtk(opt.owner, c as FieldMon) : c.atk!;
    const d = opt.field && opt.owner ? effDef(opt.owner, c as FieldMon) : c.def!;
    // The monster frame already has built-in sword/shield icons — we only place the numbers.
    // Rendered as plain flex-centered divs (same as name/effect) so they never depend on a
    // monospace font or transform being available on the viewer's machine.
    node.appendChild(el("div", "ad-atk", String(a)));
    node.appendChild(el("div", "ad-def", String(d)));
  }
  // 효과 텍스트: "(시전 N)" 계열 표기는 배지로 대체되므로 제거하고, 구분자를 줄바꿈으로
  let txt = cardText(c)
    .replace(/\s*\((?:시전|Cast|発動)\s*\d+\)/g, "")
    .replace(/ · /g, "\n")
    .replace(/ \/ /g, "\n")
    .trim();
  if (txt && txt !== "—") {
    const effCls = "card-eff" + (txt.length > 140 ? " card-eff--tiny" : txt.length > 80 ? " card-eff--small" : "");
    node.appendChild(el("div", effCls, `<span style="white-space:pre-line">${txt}</span>`));
  }
  if (opt.badge) node.appendChild(el("span", "badge", opt.badge));
  if (c.tribe) {
    const tn = TRIBES[c.tribe]?.[getLang()]?.name ?? c.tribe;
    const tag = el("div", "tribe-tag", `${tn} ⓘ`);
    tag.onclick = (e) => { e.stopPropagation(); showTribeInfo(c.tribe!); };
    node.appendChild(tag);
  }
  return node;
}

export function backEl(w?: number, h?: number): HTMLElement {
  const node = el("div", "card card--back");
  node.style.backgroundImage = `url(${FRAME_BACK})`;
  if (w) node.style.width = w + "px";
  if (h) node.style.height = h + "px";
  return node;
}

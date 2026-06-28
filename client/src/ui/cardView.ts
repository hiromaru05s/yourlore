// ============================================================
// LORE — card DOM builder. One renderer for every card everywhere
// (board / market / hand / pile / zoom) so sizing stays consistent.
// ============================================================
import type { CardInst, FieldMon, PlayerState } from "../shared/types";
import { FRAME_BACK, frameFor, TRIBES } from "../shared/cards";
import { effAtk, effDef } from "../shared/engine";
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
  node.style.backgroundImage = `url(${frameFor(c.t)})`;
  node.dataset.uid = c.uid;

  if (opt.playable) node.classList.add("is-playable");
  if (opt.buyable) node.classList.add("is-buyable");
  if (opt.dim) node.classList.add("is-dim");
  if (opt.attacker) node.classList.add("is-attacker");
  if (opt.targetable) node.classList.add("is-targetable");
  if (opt.exhausted) node.classList.add("is-exhausted");

  const cost = opt.costOverride != null ? opt.costOverride : c.cost;
  node.appendChild(el("div", "card-cost", String(cost)));
  node.appendChild(el("div", "card-name", cardName(c)));
  node.appendChild(artEl(c.id));

  if (c.t === "mon") {
    const a = opt.field && opt.owner ? effAtk(opt.owner, c as FieldMon) : c.atk!;
    const d = opt.field ? effDef(c as FieldMon) : c.def!;
    const ad = el("div", "card-ad");
    ad.appendChild(el("span", "ad-atk", "⚔ " + a));
    ad.appendChild(el("span", "ad-def", "🛡 " + d));
    node.appendChild(ad);
  }
  const txt = cardText(c);
  if (txt && txt !== "—") node.appendChild(el("div", "card-eff", txt));
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

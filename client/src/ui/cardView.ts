// ============================================================
// LORE — card DOM builder. One renderer for every card everywhere
// (board / market / hand / pile / zoom) so sizing stays consistent.
// ============================================================
import type { CardInst, FieldMon, PlayerState } from "../shared/types";
import { FRAME_BACK, frameFor, fieldFrameFor, PASSIVES, cardPassives } from "../shared/cards";
import { curHp, effAtk, effDef, playCost } from "../shared/engine";
import { cardName, cardText, getLang, t } from "../i18n";

/**
 * 카드 효과 텍스트 안의 패시브 키워드명을 <span class="psv" data-psv="key">로 감싼다.
 * 그 카드가 실제로 가진 패시브의 이름만 래핑 — 다른 문장 속 우연한 일치는 건드리지 않는다.
 * (줌 화면에서 hover 시 우측 패시브 설명 패널이 하이라이트된다)
 */
/** 【발동조건 태그】 → 강조 칩. 표기 규칙: docs/card-text-style.md (shared/cardText.ts) */
export function decorateTags(txt: string): string {
  return txt.replace(/【([^】]{1,24})】/g, '<span class="fx-tag">$1</span>');
}

export function decoratePassives(c: CardInst, txt: string): string {
  const keys = cardPassives(c);
  if (!keys.length) return txt;
  const lang = getLang();
  for (const k of keys) {
    const p = PASSIVES[k];
    if (!p) continue;
    const name = lang === "ja" ? p.ja.name : lang === "en" ? p.en.name : p.ko.name;
    if (!name || !txt.includes(name)) continue;
    txt = txt.split(name).join(`<span class="psv" data-psv="${k}">${name}</span>`);
  }
  return txt;
}

export interface CardOpts {
  size?: "board" | "mkt" | "hand";
  fullArt?: boolean; // zoom overlay: load the full-resolution art (default: 384px thumb)
  field?: boolean;
  compactField?: boolean;
  owner?: PlayerState;
  playable?: boolean;
  buyable?: boolean;
  dim?: boolean;
  attacker?: boolean;
  targetable?: boolean;
  exhausted?: boolean;
  costOverride?: number;
  badge?: string;
  hpNow?: number; // 확대(줌)용 — 필드 몬스터의 현재 체력 (hpMax와 함께 넘기면 "현재/최대"로 표시)
  hpMax?: number;
}

function el(tag: string, cls?: string, html?: string): HTMLElement {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}

/**
 * 실측 자동 축소: 요소가 DOM에 붙은 뒤(rAF) 내용이 박스를 넘치면 폰트를 줄여
 * 항상 프레임 안에 들어가게 한다. 카드가 손패/마켓/줌 어느 크기로 렌더되든
 * em 기반이라 같은 비율로 동작 — "효과 텍스트가 프레임을 벗어나는" 문제의 근본 해결.
 * (CSS 클래스 버킷(--small/--tiny)은 1차 근사로 유지, 이 함수가 최종 보정)
 */
function fitToBox(box: HTMLElement, minPx = 3.5): void {
  let tries = 0;
  const run = (): void => {
    // 주의: rAF는 숨겨진 탭에서 영원히 안 불린다(재접속 백그라운드 렌더 등) → setTimeout 사용.
    // 레이아웃 측정(scrollHeight)은 백그라운드에서도 동작한다.
    if (!box.isConnected) { if (tries++ < 8) setTimeout(run, 16 * tries); return; }
    let guard = 0;
    while (guard++ < 10) {
      const overH = box.scrollHeight - box.clientHeight;
      const overW = box.scrollWidth - box.clientWidth;
      if (overH <= 1 && overW <= 1) break;
      const cur = parseFloat(getComputedStyle(box).fontSize);
      if (cur <= minPx) break;
      const rH = box.scrollHeight > 0 ? box.clientHeight / box.scrollHeight : 1;
      const rW = box.scrollWidth > 0 ? box.clientWidth / box.scrollWidth : 1;
      const next = Math.max(minPx, cur * Math.min(rH, rW) * 0.97);
      if (next >= cur) break;
      box.style.fontSize = next.toFixed(2) + "px";
    }
  };
  setTimeout(run, 0);
}

function artEl(cardId: string, full = false): HTMLElement {
  // small views load the 384px thumbnail; only the zoom overlay fetches the full-res art
  const art = el("div", "card-art");
  const img = document.createElement("img");
  img.src = `/art/${full ? "cards" : "cards-sm"}/${cardId}.webp`;
  img.alt = "";
  img.loading = "lazy";
  img.decoding = "async";
  img.className = "card-art-img";
  if (full) img.style.backgroundImage = `url(/art/cards-sm/${cardId}.webp)`; // thumb as instant placeholder under the full art
  const done = (): void => { img.classList.add("art-loaded"); art.classList.add("art-done"); };
  if (img.complete && img.naturalWidth) done();
  else img.onload = done;
  img.onerror = () => { img.remove(); art.classList.add("art-done"); };
  art.appendChild(img);
  return art;
}

export function cardEl(c: CardInst, opt: CardOpts = {}): HTMLElement {
  const typeClass = c.t === "mon" ? "card--mon" : c.t === "trap" ? "card--trap" : c.t === "starter" ? "card--starter" : "card--spell";
  const sizeClass = opt.size === "mkt" ? "card--mkt" : opt.size === "hand" ? "card--hand" : "";
  const node = el("div", `card ${typeClass} ${sizeClass}`.trim());
  node.dataset.uid = c.uid;
  if (opt.compactField) node.classList.add("card--field");
  // Layering: art sits BEHIND the frame (in the transparent art window), the
  // frame PNG overlays on top (its border hugs the art edges), then text/cost
  // render above the frame. (frame's outer + window are transparent.)
  node.appendChild(artEl(c.id, opt.fullArt));
  const frameEl = el("div", "card-frame");
  // square field tiles use the dedicated 1254 square frames; everything else
  // (hand / market / zoom / deck-builder) keeps the vertical card frames
  frameEl.style.backgroundImage = `url(${opt.compactField ? fieldFrameFor(c.t) : frameFor(c.t)})`;
  node.appendChild(frameEl);

  if (opt.playable) node.classList.add("is-playable");
  if (opt.buyable) node.classList.add("is-buyable");
  if (opt.dim) node.classList.add("is-dim");
  if (opt.attacker) node.classList.add("is-attacker");
  if (opt.targetable) node.classList.add("is-targetable");
  if (opt.exhausted) node.classList.add("is-exhausted");

  const cost = opt.costOverride != null ? opt.costOverride : c.cost;
  node.appendChild(el("div", "card-cost" + (cost >= 10 ? " card-cost--2d" : ""), String(cost)));
  const pc = playCost(c);
  const nm = cardName(c);
  const nameEl2 = el("div", "card-name" + (nm.length >= 9 ? " card-name--long" : ""), nm);
  node.appendChild(nameEl2);

  if (c.t === "mon") {
    const a = opt.field && opt.owner ? effAtk(opt.owner, c as FieldMon) : c.atk!;
    // v24 HP-combat: the shield slot shows CURRENT HP — on the field AND in zoom
    // (v29: zoom used to show max HP, so a damaged monster read as healthy there).
    // 최대 체력은 몬스터 칩에 표시하지 않는다 (숫자 하나 + 손상 시 빨간색만).
    const fm = c as FieldMon;
    const onField = !!(opt.field && opt.owner);
    const isEgg = fm.hatch != null;
    let d: number, hurt = false;
    if (onField) {
      d = isEgg ? effDef(opt.owner!, fm) : curHp(opt.owner!, fm);
      hurt = !isEgg && (fm.dmg || 0) > 0;
    } else if (opt.hpNow != null) {
      d = opt.hpNow;
      hurt = opt.hpMax != null && opt.hpMax > d;
    } else d = c.def!;
    node.appendChild(el("div", "ad-atk" + (String(a).length >= 3 ? " ad-num--3d" : ""), String(a)));
    // 알은 체력 대신 부화/내구도 배지가 실질 정보 → 체력 칩을 감춘다(장식 숫자 제거)
    if (!(onField && isEgg)) {
      node.appendChild(el("div", "ad-def" + (hurt ? " ad-def--hurt" : "") + (String(d).length >= 3 ? " ad-num--3d" : ""), String(d)));
    }
  }
  // 암살자 길드: 카운트 배지
  if (opt.field && c.aura === "assassinGuild") {
    const gc = (c as { gcount?: number }).gcount ?? 0;
    node.appendChild(el("div", "egg-cnt", `<span class="ec ec-d">⚔${gc}/3</span>`));
  }
  // 알(egg): 부화/내구도 카운터 배지 — 필드에서는 실시간 값, 손패/마켓에서는 초기값
  if (c.hatchTurns != null) {
    const eggH = (c as { hatch?: number }).hatch ?? c.hatchTurns;
    const eggD = (c as { dur?: number }).dur ?? c.hatchDur ?? 4;
    node.appendChild(el("div", "egg-cnt", `<span class="ec ec-h">🥚${eggH}</span><span class="ec ec-d">🛡${Math.max(0, eggD)}</span>`));
  }
  // 기합 토큰 / 부패 카운터 / 부여 패시브 배지 (필드 카드만)
  if (opt.field && c.hatchTurns == null && c.aura !== "assassinGuild") {
    const fm = c as FieldMon;
    const bits: string[] = [];
    if ((fm.guts ?? 0) > 0) bits.push(`<span class="ec ec-g">💢${fm.guts}</span>`);
    if ((fm.decayCnt ?? 0) > 0) bits.push(`<span class="ec ec-x">☠${fm.decayCnt}/3</span>`);
    if (fm.passivesG?.length) {
      const lang0 = getLang();
      for (const k of fm.passivesG) {
        const p = PASSIVES[k];
        if (p) bits.push(`<span class="ec ec-p">${lang0 === "ja" ? p.ja.name : lang0 === "en" ? p.en.name : p.ko.name}</span>`);
      }
    }
    if (bits.length) node.appendChild(el("div", "egg-cnt", bits.join("")));
  }
  // 이름도 실측-축소: 긴 이름(EN 포함)이 프레임 이름판을 벗어나지 않게
  fitToBox(nameEl2);
  // 효과 텍스트: "(시전 N)"/"(소환 N)" 계열 표기는 배지로 대체되므로 제거하고, 구분자를 줄바꿈으로
  let txt = cardText(c)
    .replace(/\s*\((?:시전|Cast|発動|소환|Summon|召喚)\s*\d+\)/g, "")
    .replace(/ · /g, "\n")
    .replace(/ \/ /g, "\n")
    .trim();
  const hasCast = c.t !== "starter" && pc !== c.cost;
  if ((txt && txt !== "—") || hasCast) {
    const effCls = "card-eff" + (txt.length > 140 ? " card-eff--tiny" : txt.length > 80 ? " card-eff--small" : "");
    const eff = el("div", effCls);
    if (hasCast) {
      // monsters are SUMMONED, spells/traps are CAST — label the play-cost badge accordingly
      const cast = el("div", "card-cast", `<span class="cc-ico">⚡</span>${t(c.t === "mon" ? "card.summon" : "card.cast")} ${pc}`);
      // instant tooltip anchored to the card (not inside the clipped .card-eff)
      const tip = el("div", "cast-tip", t(c.t === "mon" ? "card.summon.tip" : "card.cast.tip"));
      node.appendChild(tip);
      cast.addEventListener("pointerenter", () => tip.classList.add("show"));
      cast.addEventListener("pointerleave", () => tip.classList.remove("show"));
      eff.appendChild(cast);
    }
    if (txt && txt !== "—") eff.appendChild(el("div", "card-eff-txt", `<span style="white-space:pre-line">${decorateTags(decoratePassives(c, txt))}</span>`));
    fitToBox(eff); // 실측 자동 축소 — 어떤 길이의 효과도 항상 프레임 텍스트판 안에
    node.appendChild(eff);
  }
  if (opt.badge) node.appendChild(el("span", "badge", opt.badge));
  // tribe info is shown BESIDE the card in the zoom view (see anim.zoomCard),
  // so no on-art tribe button here (keeps the art clean).
  return node;
}

export function backEl(w?: number, h?: number): HTMLElement {
  const node = el("div", "card card--back");
  node.style.backgroundImage = `url(${FRAME_BACK})`;
  if (w) node.style.width = w + "px";
  if (h) node.style.height = h + "px";
  return node;
}

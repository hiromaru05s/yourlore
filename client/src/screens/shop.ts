import {COSMETICS,cosmetic} from '../shared/cosmetics';
import { homeIcon } from "../ui/homeIcons";
// ============================================================
// LORE — Shop. Currently sells card sleeves for credits (1💎 each).
// Server (social.ts /social/buy-sleeve) is authoritative on price &
// ownership; purchased cosmetics are equipped per deck in the deck builder.
// ============================================================
import type { App, Screen } from "../router";
import { api } from "../net/api";
import { t, onLangChange, getLang } from "../i18n";
import { sfx } from "../ui/sound";

export function mountShop(app: App): Screen {
  const wrap = document.createElement("div");
  wrap.className = "screen tut-screen";
  app.root.appendChild(wrap);

  let dead = false;
  let owned = new Set<string>(["default"]);
  let credits = app.user?.credits ?? 0;

  const build = (): void => {
    wrap.innerHTML = `
      <div class="tut">
        <div class="tut-head">
          <button class="btn btn-ghost" id="back">← ${t("common.back")}</button>
          <h2>${homeIcon("shop")} ${t("shop.title")}</h2>
          <span class="shop-credits">${homeIcon("shard")} <b id="shopCredits">${credits}</b></span>
        </div>
        <div class="tut-body">
          <section class="tut-sec">
            <h3><span class="tut-ico">${homeIcon("sleeve")}</span>スリーブ ＆ デッキ置き場・シェルフ</h3>
            <p class="set-desc">各4種類。0シャードで受け取り、デッキ構成の「外観」から、デッキごとに装備できます。</p>
            <div class="shop-grid" id="grid"></div>
          </section>
        </div>
      </div>`;
    (wrap.querySelector("#back") as HTMLElement).onclick = () => app.home();
    renderGrid();
  };

  const renderGrid = (): void => {
    const grid = wrap.querySelector("#grid") as HTMLElement;
    const buyable = COSMETICS;
    if (!buyable.length) {
      const lang = getLang();
      grid.innerHTML = `<p class="shop-empty">${lang === "ja" ? "現在販売中の商品はありません。" : lang === "en" ? "There are currently no items for sale." : "현재 판매 중인 상품이 없습니다."}</p>`;
      return;
    }
    grid.innerHTML = buyable.map((s) => {
      const has = owned.has(s.id);
      return `
        <div class="shop-item ${has ? "is-owned" : ""}">
          <div class="sl-preview ${s.kind==='furniture'?'furniture-preview':''}" style="background-image:url(${s.url})"></div>
          <div class="sl-name">${s[getLang()]}</div>
          ${has
            ? `<button class="btn btn-mini btn-ghost" disabled>${homeIcon("check")} ${t("shop.owned")}</button>`
            : `<button class="btn btn-mini btn-gold" data-buy="${s.id}">${t("shop.buy")} ${homeIcon("shard")}${s.price}</button>`}
        </div>`;
    }).join("");

    grid.querySelectorAll("[data-buy]").forEach((btn) => {
      (btn as HTMLElement).onclick = () => {
        const id = (btn as HTMLElement).dataset.buy!;
        const s = cosmetic(id)!;
        if (credits < s.price) { sfx("error"); alert(t("shop.nocredit")); return; }

        (btn as HTMLButtonElement).disabled = true;
        api.buySleeve(id).then((r) => {
          credits = r.credits;
          owned = new Set([...r.sleeves,...r.furnitures]);
          if (app.user) app.user.credits = r.credits;
          sfx("coin");
          (wrap.querySelector("#shopCredits") as HTMLElement).textContent = String(credits);
          renderGrid();
        }).catch((e) => { (btn as HTMLButtonElement).disabled = false; sfx("error"); alert((e as Error).message); });
      };
    });
  };

  // load current ownership + credits
  void api.profile().then((p) => {
    if (dead) return;
    owned = new Set([...(p.sleeves??["default"]),...(p.furnitures??[])]);
    credits = p.credits ?? credits;
    build();
  }).catch(() => { if (!dead) build(); });

  build();
  const unsub = onLangChange(() => build());
  return { destroy: () => { dead = true; unsub(); } };
}

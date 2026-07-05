// ============================================================
// LORE — Shop. Currently sells card sleeves for credits (1💎 each).
// Server (social.ts /social/buy-sleeve) is authoritative on price &
// ownership; purchased sleeves are equipped from the profile.
// ============================================================
import type { App, Screen } from "../router";
import { api } from "../net/api";
import { t, onLangChange, getLang } from "../i18n";
import { SLEEVE_LIST, SLEEVES } from "../shared/cards";
import { sfx } from "../ui/sound";

function sleeveName(id: string): string {
  const s = SLEEVES[id]; if (!s) return id;
  const lang = getLang();
  return lang === "ja" ? s.ja : lang === "en" ? s.en : s.ko;
}

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
          <h2>🛒 ${t("shop.title")}</h2>
          <span class="shop-credits">💎 <b id="shopCredits">${credits}</b></span>
        </div>
        <div class="tut-body">
          <section class="tut-sec">
            <h3><span class="tut-ico">🎴</span>${t("shop.sleeves")}</h3>
            <p class="set-desc">${t("shop.desc")}</p>
            <div class="shop-grid" id="grid"></div>
          </section>
        </div>
      </div>`;
    (wrap.querySelector("#back") as HTMLElement).onclick = () => app.home();
    renderGrid();
  };

  const renderGrid = (): void => {
    const grid = wrap.querySelector("#grid") as HTMLElement;
    const buyable = SLEEVE_LIST.filter((s) => s.price > 0);
    grid.innerHTML = buyable.map((s) => {
      const has = owned.has(s.id);
      return `
        <div class="shop-item ${has ? "is-owned" : ""}">
          <div class="sl-preview" style="background-image:url(${s.url})"></div>
          <div class="sl-name">${sleeveName(s.id)}</div>
          ${has
            ? `<button class="btn btn-mini btn-ghost" disabled>✓ ${t("shop.owned")}</button>`
            : `<button class="btn btn-mini btn-gold" data-buy="${s.id}">${t("shop.buy")} 💎${s.price}</button>`}
        </div>`;
    }).join("");

    grid.querySelectorAll("[data-buy]").forEach((btn) => {
      (btn as HTMLElement).onclick = () => {
        const id = (btn as HTMLElement).dataset.buy!;
        const s = SLEEVES[id];
        if (credits < s.price) { sfx("error"); alert(t("shop.nocredit")); return; }
        if (!confirm(`${sleeveName(id)} — 💎${s.price}\n${t("shop.buy.confirm")}`)) return;
        (btn as HTMLButtonElement).disabled = true;
        api.buySleeve(id).then((r) => {
          credits = r.credits;
          owned = new Set(r.sleeves);
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
    owned = new Set(p.sleeves ?? ["default"]);
    credits = p.credits ?? credits;
    build();
  }).catch(() => { if (!dead) build(); });

  build();
  const unsub = onLangChange(() => build());
  return { destroy: () => { dead = true; unsub(); } };
}

// ============================================================
// LORE — settings: SFX volume, profile privacy, coupon codes,
// billing (subscription status — payments not wired up yet).
// ============================================================
import type { App, Screen } from "../router";
import { api } from "../net/api";
import { t, onLangChange } from "../i18n";
import { langSelectEl } from "../ui/langSelect";
import { getSfxVolume, setSfxVolume, sfx } from "../ui/sound";

export function mountSettings(app: App): Screen {
  const wrap = document.createElement("div");
  wrap.className = "screen tut-screen";
  wrap.innerHTML = `
    <div class="topright-lang"></div>
    <div class="tut">
      <div class="tut-head">
        <button class="btn btn-ghost" id="back">← ${t("common.back")}</button>
        <h2>⚙ ${t("settings.title")}</h2>
      </div>
      <div class="tut-body">
        <section class="tut-sec">
          <h3><span class="tut-ico">🔊</span>${t("settings.sound")}</h3>
          <div class="set-row">
            <label class="set-label" for="vol">${t("settings.sound.volume")}</label>
            <input type="range" id="vol" min="0" max="100" step="5" value="${Math.round(getSfxVolume() * 100)}">
            <span class="set-val" id="volVal">${Math.round(getSfxVolume() * 100)}%</span>
            <button class="btn btn-mini btn-ghost" id="volTest">${t("settings.sound.test")}</button>
          </div>
        </section>
        <section class="tut-sec">
          <h3><span class="tut-ico">👁️</span>${t("settings.privacy")}</h3>
          <div class="set-row">
            <label class="set-label">${t("settings.privacy.public")}</label>
            <label class="switch"><input type="checkbox" id="pub" checked><span class="slider"></span></label>
          </div>
          <p class="set-desc">${t("settings.privacy.desc")}</p>
        </section>
        <section class="tut-sec">
          <h3><span class="tut-ico">🎟️</span>${t("settings.coupon")}</h3>
          <div class="set-row fr-add">
            <input class="input" id="coupon" placeholder="${t("settings.coupon.ph")}" maxlength="32" style="text-transform:uppercase">
            <button class="btn btn-gold" id="couponGo">${t("settings.coupon.apply")}</button>
          </div>
          <div class="fr-add-msg" id="couponMsg"></div>
        </section>
        <section class="tut-sec">
          <h3><span class="tut-ico">💳</span>${t("settings.billing")}</h3>
          <div class="set-row"><span class="set-label">${t("settings.billing.credits")}</span><span class="set-val">💎 <b id="credits">${app.user?.credits ?? 0}</b></span></div>
          <div class="set-row"><span class="set-label">${t("settings.billing.sub")}</span><span class="set-val">${t("settings.billing.none")}</span></div>
          <div class="bill-plan">
            <div class="bill-plan-name">LORE PREMIUM</div>
            <div class="bill-plan-desc">${t("settings.billing.plan")}</div>
            <button class="btn btn-primary btn-block" disabled>${t("settings.billing.soon")}</button>
          </div>
        </section>
      </div>
    </div>`;
  app.root.appendChild(wrap);
  wrap.querySelector(".topright-lang")!.appendChild(langSelectEl());
  (wrap.querySelector("#back") as HTMLElement).onclick = () => app.home();

  // ---- volume ----
  const vol = wrap.querySelector("#vol") as HTMLInputElement;
  const volVal = wrap.querySelector("#volVal") as HTMLElement;
  vol.oninput = () => { setSfxVolume(Number(vol.value) / 100); volVal.textContent = `${vol.value}%`; };
  vol.onchange = () => sfx("coin");
  (wrap.querySelector("#volTest") as HTMLElement).onclick = () => sfx("impact");

  // ---- privacy (load current, then toggle) ----
  const pub = wrap.querySelector("#pub") as HTMLInputElement;
  void api.profile().then((p) => { pub.checked = p.stats_public !== false; }).catch(() => { /* keep default */ });
  pub.onchange = () => {
    void api.updateMe({ stats_public: pub.checked }).then(() => sfx("pop")).catch(() => { pub.checked = !pub.checked; sfx("error"); });
  };

  // ---- coupon ----
  const couponMsg = wrap.querySelector("#couponMsg") as HTMLElement;
  const redeem = (): void => {
    const code = (wrap.querySelector("#coupon") as HTMLInputElement).value.trim();
    if (!code) return;
    couponMsg.textContent = "…";
    api.redeemCoupon(code).then((r) => {
      couponMsg.textContent = `✓ ${t("settings.coupon.ok")} +${r.amount} 💎`;
      (wrap.querySelector("#credits") as HTMLElement).textContent = String(r.credits);
      if (app.user) app.user.credits = r.credits;
      (wrap.querySelector("#coupon") as HTMLInputElement).value = "";
      sfx("coin");
    }).catch((e) => { couponMsg.textContent = (e as Error).message; sfx("error"); });
  };
  (wrap.querySelector("#couponGo") as HTMLElement).onclick = redeem;
  (wrap.querySelector("#coupon") as HTMLInputElement).onkeydown = (e) => { if (e.key === "Enter") redeem(); };

  const unsub = onLangChange(() => app.settings());
  return { destroy: unsub };
}

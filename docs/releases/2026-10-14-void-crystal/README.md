# 虚空の水晶魔術 — selected runtime adoption

2026-10-14: User approved the final `void-crystal-sorcery.html` preview and requested staging.

- EXILE_NUKE2 keeps its ID, costs and rules. Japanese: 虚空の水晶魔術; English: Void Crystal Sorcery; Korean: 공허의 수정 마술.
- Approved painted crystal art is supplied in full/sm/xs WebP sizes, selected only for this ID. `art-prompt.txt` records the original image generation prompt.
- The selected preview renderer, timing and HP reaction are promoted to `ui/voidCrystal`. The shell contact remains 3220 ms, pressure holds for 85 ms and the crystal fracture/black pressure folds disperse by 5900 ms. No full-screen flash.
- Normal `BaseController.playEvents → revealSpell → playVoidCrystal` owns the effect. The generic spell frame is replaced for this cast, with the same hand reveal and shelf exit. Actual public Rift records supply the surface and engine-captured count; records remain in the Rift.
- HP updates once at contact from the matching engine damage event. Reflection follows its resolved player target; echoed hits retain their own sequential events. Failed loading, zero records, skipped, hidden, resized or disposed scenes fall through to the ordinary event update without dropping damage. All temporary GPU resources and HP/source styles are restored.

## Verification

`node tests/void-crystal-rules.mjs`: 64 engine cases across both sides, 0/1/8/60 records, shielding, reflection, echo and unchanged Rift records. Included in production suite.

`runtime-check.json`: real engine result → production controller/animation route, both sides, reflection, echo, zero records, skip before/after impact, reduced motion, mobile 390px. HP stays unchanged before contact, damage matches engine state, one GPU overlay, no JS errors and complete canvas/style cleanup. Contact screenshots accompany the report. The selected renderer's continuous animation was previously approved in the 5427 preview; this check establishes runtime event integration, not authenticated network-match completion.

Browser check reproduction (DEV fixture only; not in production build): copy `tests/fixtures/void-crystal/runtime.js` to `client/void-crystal-runtime-qa.js` and `index.html` to `client/void-crystal-runtime-qa.html`; start Vite on 55427; run `node tests/void-crystal-browser.mjs`. `PLAYWRIGHT_MODULE` and `LORE_QA_ORIGIN` can override the local browser tool and server. Remove the two temporary client fixtures afterward.

Staging release must use `node scripts/deploy-guard.mjs staging`. Exact source/version and deployed asset parity are recorded after publication. Production is not part of this request.

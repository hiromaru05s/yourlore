# Biblion tutorial and mana spirit

12 independent hands-on lessons use the current v57 card database and the actual game reducer. Each first clear grants 250 Shards, totaling 3,000. Completing the final lesson does not add another 3,000. Lessons can be resumed from the first unpaid lesson or replayed individually.

## Curriculum

1. Expand the hand, drag Attune, distinguish available and maximum mana.
2. Summon and make a direct attack.
3. Select a defender, destroy it and observe overflow damage.
4. Cast Sharpen and resolve its target; distinguish lasting and temporary buffs.
5. Buy into the graveyard, end the turn and draw through a reshuffle.
6. Spend one mana to refresh the offer.
7. Play Cull and observe the Rift rather than the graveyard.
8. Open a chest and inspect its dice outcome.
9. Play Fountain of Knowledge and observe its next-turn trigger.
10. Summon two different cards of one tribe and trigger synergy.
11. Explicitly choose the excess hand card to discard and carry seven forward.
12. Finish a prepared duel using the same combat and mana rules.

Setup cards, mana and the final opponent's Spirit are explicitly practice-only. The opponent passes. There is no turn timer, match reward or ranked record. No balanced card definition or normal duel rule was changed.

## Entry, records and rewards

Password login, immediate registration login and restored/OAuth sessions use the same first-entry check. A server record stores the response. “No” first opens a second confirmation that the 3,000-Shard clear reward is not received without completing the tutorial. Starting later remains possible.

The new curriculum uses `tutorial:v2:<lesson>` reward keys. Earlier tutorial claims remain unchanged; they do not masquerade as completion of the new exercises. The account progress endpoint distinguishes network failure from empty progress. Each completion sends a bounded action transcript; the server replays the deterministic lesson, validates success and uses an atomic D1 claim/payment transaction. Direct generic reward claims cannot grant these keys. Duplicate/retry claims return zero additional payment. Failed payment can be retried with the completed transcript.

## Reading and companion

The topmost tutorial control opens a focus-managed rule notebook with an index, current passive definitions and corrected combat/chest/recovery wording. Japanese, English and Korean are included. A single dark reading surface keeps text legible over the live library background and retains the approved common navigation.

The mana spirit is original procedural Three.js geometry: faceted ivory shell, inset dark face, azure mana core, gold seal and attached folded fins. Idle breathing, blinking and a short clear reaction keep a readable primary form. The material layers and local shadow translate the depth/readability principles of `docs/animation-quality-benchmark.md`; this is a character idle, not a replacement card VFX. No external character art or particles are required. Reduced motion renders a still pose; missing WebGL has a deliberately simplified SVG fallback. Hidden/offscreen instances stop rendering, and disposal releases geometry, materials, WebGL context and listeners.

The same spirit provides optional contextual help during BOT and online play. It reads only public board state and the local player's hand count; it neither sees the opponent's hand nor chooses moves. The normal duel timer continues while reading help.

## Verification

- `tests/tutorial-academy.mjs`: all 12 actual v57 reducer solutions, incomplete/invalid transcripts, authenticated account isolation, skip persistence, duplicate payments, transactional rollback and exact 3,000 total.
- `tests/trap-removal-tutorial.mjs`: real tutorial DOM, three languages, old-key isolation, two-stage onboarding, failed-payment retry, teardown and existing card-gallery filters.
- `tests/tutorial-academy-browser.mjs`: genuine drag-to-play, attack target selection, mobile drag/refresh, notebook keyboard close, real WebGL spirit, reduced motion, language changes, dedupe and disposal. API fixture; not a live account proof.
- Full App/router browser check: first-login invitation, saved choice, actual lounge/navigation, scrolling to lesson 12 at 390px; fixture account. Screenshots use the actual app shell.
- Visual inspection: desktop/mobile readable form, subdued material layering, attached-fin motion and non-obstructing lesson placement. Continuous capture is in `qa/video/`. This is implementation QA, not user visual approval.

## Staging release

- URL: https://test.yourlore.xyz
- Deployed committed source: `b376938fdb0301dc52d0ab07e7bd790b51f467e0`.
- Worker version: `133ec917-b351-47bf-b629-40dac9b80e30`, 100% staging traffic.
- `node scripts/deploy-guard.mjs staging` passed typechecks, all 106 production suites and the production build before uploading the isolated committed snapshot.
- All 62 deployed HTML/JavaScript/CSS files match the exact guarded build by SHA-256; see `staging/assets.json` and `scripts/check-tutorial-staging.mjs`.
- No production deployment. The original working directory's unrelated changes were preserved.

## Authenticated staging checks

`tests/tutorial-staging.mjs` passed on the deployed source with a disposable, preverified account. `staging/authenticated.json` records the exact boundary:

- Real password login, first-entry invitation and the two-stage No confirmation.
- Real mouse drag of Attune on the actual 3D board, followed by the 250-Shard payment.
- All remaining eleven lesson transcripts accepted by the deployed server; total 3,000 Shards.
- Two simultaneous requests grant `[250, 0]`; incomplete claims are rejected and replay grants zero.
- Reload restores 12/12 completion and 3,000 balance without reopening the invitation; mobile notebook opens and closes.
- No browser page errors. A separate remote D1 query confirmed 12 paid lesson records and 3,000 credits.
- The disposable account, rewards, sessions, activity and presence were removed afterward; `staging/d1-cleanup.json` verifies no remaining user/reward/session/presence rows. Temporary credentials were deleted.

Cold headless Chrome asset loading stalled with its default transport. The completed run used HTTP/1.1 (HTTP/2 and QUIC disabled), with actual loading-screen retry controls. All images/scripts/API requests remained live staging; no fixture responses or injected gameplay state were used. One transient card-image connection reset recovered. This does not establish a cold-load performance benchmark or broad network reliability. Email delivery and OAuth consent were not exercised. All twelve lessons have real-reducer coverage locally; live physical browser input covers the first lesson, while the other eleven have deployed-server replay/payment coverage.

The final Worker-version check remained `133ec917-b351-47bf-b629-40dac9b80e30`. Follow-up commits contain verification scripts and evidence only; the deployed runtime source above is unchanged.

# 虚空射撃 — crystal 03 adoption

EXILE_NUKE1 now uses the selected 「晶層の穿針」03 from the 2026-10-14 three-direction comparison. The improved oblique fracture from that comparison is retained: closed sections cut from the incoming crystal, with continuous normals, capped fracture faces and tip-to-rear separation. Its lift, compression, material and launch timing are unchanged.

The engine publishes the public Rift count before damage. The production controller reveals the actual played card at its normal large focus position, then runs one dedicated renderer. Damage/HP feedback starts at the 2150 ms contact while the fracture tail continues. No extra deck thumbnail or generic spell-frame duplicate is created. Repeated rune casts serialize their dedicated presentations. Fast-forward, hidden page, resize, detached targets, reduced motion and missing WebGL all settle the queue and clean up.

The stable ID, mana cost, damage formula and Rift contents are unchanged. Japanese/English/Korean names are 虚空射撃 / Void Shot / 공허 사격. No other card uses these exact names. EXILE_NUKE2 is unchanged.

## Art

Built-in `image_gen` produced [the original](art/void-shot-source.png), normalized to the [1472 × 1344 master](art/EXILE_NUKE1-master.webp). The [exact prompt](art/prompt.txt) and [references, dimensions and SHA-256 hashes](art/manifest.json) are retained. The delivered assets are the 832 / 384 / 192 pixel WebP versions of EXILE_NUKE1; its revision query is `20261014-void-shot-v1`.

SORTER, CHOSEN_AREA, NHEX, ELF and the white-library / fixed-duo concept art informed the painted treatment. The image depicts layered violet crystal, white stone, old gold and indigo with visible painterly forms, matching the chosen effect without photorealistic weapon imagery.

## Validation

- `node tests/void-shot.mjs`: both owners; Rift 0, 1, 8, 24 and 60; event ordering; unchanged damage and Rift contents; nullification; rune echo; EXILE_NUKE2 isolation; three-language name uniqueness.
- `tests/void-shot-browser.mjs`: actual local engine → production controller → animation flow, desktop/mobile and both owners. One crystal 03 renderer, no fallback on normal runs, HP transition at contact, no remaining canvases/cards. Skip/resize/hidden/detached/reduced-motion/WebGL-failure paths pass. See [report](qa/report.json).
- Visual review is separate from functional assertions. The chosen source geometry and material are preserved; the new card art is visibly painterly. QA captures and local video are evidence of the production controller fixture, not authenticated online gameplay.
- Staging deployment and deployed bundle checks are recorded separately in the deployment evidence after publication. This request does not deploy production.

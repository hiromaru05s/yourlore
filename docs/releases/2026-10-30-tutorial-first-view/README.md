# Centered Zeno welcome and immediately accessible tutorial start

The welcome conversation is centered in the usable area between the existing header and navigation. The copy is spoken by Zeno throughout, with no narrator-style subtitle or separate fine print. Speech uses one font family and 18px text; speaker and actions use 14px. Narrow layouts use 16px speech and 14px controls. The Later/Back confirmation and save-error message follow the same typography.

The basic tutorial's real Start/Replay, Single and account-backed journey-resume buttons now sit directly beneath Zeno's greeting, before the lesson outline. The hero is shorter. The actions hide on the Companion tab; the guided Companion introduction continues to hide this entire hero.

## Source and visual reference

- Started from latest fetched `gh/main` `409bca951e9a9f08d7ea78dd20f5432d124eaf7c`, including deployed runtime `b959aa1c6a5e3c846c1edeafa41fc3e9f7c2c916`.
- Work and local preview root: `/Users/hiromaru05s/.codex/worktrees/tutorial-onboarding/LORE_TCG`.
- Existing `tutorialWelcome.ts`, `tutorial.ts`, `zenoSpeech.css`, `tutorialParts.css`, and shared `loungeLayout.css` own the change. Adopted Zeno (`manaSpirit.ts`), library background, header, navigation, azure panels, and standard buttons are reused.
- Local preview is a Vite server launched from this worktree, with its exact loopback origin in the QA report. Production verification uses `https://yourlore.xyz`.

## Verification

- Real Chrome with the real rendered application and isolated Worker/SQLite account fixtures: Korean and Japanese at 1461×790, English at 1280×720, and all three languages at 1024×600.
- Measure the welcome's vertical center against the content area, and the computed font sizes (at most two), including the Later confirmation. Start button is visible and hit-testable above the navigation with scrollTop 0; clicking starts the basic duel. Screenshots are visually inspected separately from these assertions.
- Existing tutorial DOM and Companion checks and TypeScript checks passed. The guarded release also runs the complete production suite.
- This change has no server, currency, database schema, or asset changes. These fixture checks do not claim real-account rewards, a completed live match, or physical-device performance.
- QA screenshots, report, and repeatable verification script: `docs/qa/2026-10-30-tutorial-first-view/`. Production version and verification are recorded alongside this document after release.

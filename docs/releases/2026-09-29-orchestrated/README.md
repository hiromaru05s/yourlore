# 2026-09-29 staging integration

Coordinator task: `01a0e9ed-c169-7b33-9251-2c7173f0fd51`.
Base: `e79d6a7f93d9e6b69e935be6c80d3464205501b3`.
Target: `https://test.yourlore.xyz` (`lore-server-staging`).

## Scope and ownership

| Change | Source task | State |
| --- | --- | --- |
| Recessed board and silver inscription Rift | Existing main | Preserved by the base commit |
| Passive v2 SVGs and localized names in the right-side description | `01a0e9a7-81d7-74c0-827c-b8b798886c30` | Adopted source captured |
| Turn-control light 1, porcelain | `01a0e9a7-bc9e-7203-a1cf-e9baa839b1c4` | Adopted source captured |
| Quest fold 2 | `01a0e997-19f4-77e0-8eb0-2f57fd65b608` | Waiting for completed source validation |
| Dew/shield v54 and revised card art | `01a0e9ce-0b6e-73d1-a6f0-94e24976769a` | In progress in its own worktree |

Mana formation, shelf-return, result-screen and passive-highlight comparison
variants are unselected and are not part of this release. Their source files and
media remain in the shared working tree.

## Shared-file integration

The shared `main` working tree contains unrelated, uncommitted changes. This
release is assembled in a separate worktree. `readingBoardWidgets.ts` and
`duelScene.ts` take only the adopted turn-light changes. `anim.ts` takes the
localized passive-name change; quest changes will be added after their handoff.
The mana and shelf preview hooks are not copied into the release.

`adopted-source-snapshot.json` records copied file hashes. The two turn-light
source files are copied without alteration. Existing source-task visual reports
and adoption screenshots are retained in `turn-light-source-qa/`; these are
previous validation evidence, not new tests of this release.

## Integration checks

- Client/server typecheck passed for the adopted UI snapshot.
- `tests/duel-ui.mjs` passed after replacing its obsolete maximum-health bar
  assertion with current-health text and absence of the retired bar. This
  corrects a test left behind by an earlier migration; game behavior is unchanged.
- Build, completed quest/dew integration, final staging verification and push
  remain pending. This document is not a deployment-completion claim.

Functional validation and visual approval are separate. The selected passive
icons and porcelain turn light retain the source tasks' approvals. Authenticated
online multiplayer has not been validated by this integration task.

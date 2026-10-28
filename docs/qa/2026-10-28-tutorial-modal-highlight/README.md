# Tutorial modal highlight correction

Reproduced through real visible tutorial controls in a local real-board fixture: proceed through cost/ATK/health explanations, then right-click Pup during the summon action. The inspector replaces the spotlight target, but the underlying hand pointer was still unioned into the ring. At 1280×720, inspector bottom 644.125px produced ring bottom 707px because hand bottom was 702.135px.

Fix: exclude covered board-pointer and whole-hand bounds while a modal is the active target. Inspector layout and game rules unchanged. After correction ring bottom is 649px (4px pad plus integer rounding). At 1024×768 inspector bottom 683.109px, ring bottom 688px. Escape closes inspection and restores the drag guide. Screenshots show the same action and card before/after.

The existing optional browser regression now checks all four modal edges within 6px while inspecting during a play step. It was syntax-checked; the scenario was executed through Codex browser controls at both sizes, not by the standalone browser runner. The real-engine tutorial replay passed.

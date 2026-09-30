# Duel opening: remove manual skip

Removed the production duel opening skip button, click handler and unused CSS. The authoritative opening clock, coin result, initial deal and reduced-motion / resize / background / abort cleanup remain unchanged.

Validation: client/server typecheck and production build pass; the existing duel-opening browser regression passes across four viewports, both first players, click/Escape/Space without bypass, natural local completion, online start gate with 500-second clock skew, reduced motion, cancellation and WebGL fallback. The existing duel UI test passes; its PNG expectations were updated to the UI WebP assets already shipped by the preceding optimization.

This is an interaction change; animation poses and timing were not redesigned. Local browser evidence is in `local/browser-report.json`.

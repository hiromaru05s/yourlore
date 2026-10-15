# Menu readability and shared library background

HOME's small pale text was drawn directly over the bright library. The reading column now has one dark translucent surface, 12px supporting text, clearer mode selection, and larger rank/deck labels. The shared header has a stronger reading shade. The navigation shade stops at the content edge instead of fading the bottom of the reading column.

All menu library backgrounds (deck, cards, rankings, friends, shop and its gacha surface, tutorial, profile, login/lobby fallbacks) use `--menu-library-image`, pointing to the current HOME `atmosphere-v2/library-wide.png`. Both legacy library variants were removed from runtime styles and menu preloading; the HTML preload now points to the same plate. HOME's existing animated scene is preserved.

Validation: `npm run build`, `node tests/menu-selected.mjs`, `git diff --check`, and `tests/menu-readability-browser.mjs` against the production build. Browser checks cover seven routes at 1440×900, 1280×720, 390×844, 320×568 and 844×390, plus profile; inspect shared background, HOME font sizes, viewport overflow, header/navigation pointer targets and old image requests. Mobile HOME scrolls vertically to retain legible text and controls. Screenshots include its scrolled rank/deck details.

The browser uses the normal App/router and real artwork with fixture API responses. This establishes menu rendering/navigation, not authenticated server behavior or multiplayer gameplay. Visual review is separate from automated geometry/function checks.

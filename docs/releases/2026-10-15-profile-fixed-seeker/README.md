# Fixed seeker profile UI

Removed character selection from the profile portrait and settings. The portrait is a non-interactive image without an edit badge. The identity column centers the portrait above the display name on desktop and mobile.

Local browser verification used the real application UI with API fixtures. At 1280×900, 1920×1080, 390×844, 320×568 and 844×390 the portrait/name center delta was less than 0.01px and there was no horizontal document overflow. Clicking the portrait does not open a picker or write account data. Rename remains accessible, and settings retain volume and graphics controls. Browser errors: zero. See local-browser.json.

This verifies profile UI behavior and geometry; it does not claim an authenticated gameplay check.

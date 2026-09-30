# BOT difficulty menu refresh

Replace four ornate image cards with a single navy selection surface, matching the quiet HOME/support menus. The four rows retain their existing localized names and descriptions. Roman numerals and four small intensity marks indicate order; a short footer explains that choosing a row starts the duel. Remove the oversized illustrations, nested borders, library image inside the modal and hover lift. Keep a distinct keyboard focus outline, minimum 44px actions and a scrollable dialog at small heights.

The selected difficulty and immediate-start behavior are unchanged. Each row still calls `app.botGame` with exactly easy, normal, hard or hell. Cancel, backdrop dismissal, Escape, focus restoration and focus trapping continue through the existing handlers.

Validation: client/server typecheck and production build pass. Chrome checks at 1280/1920 desktop, 390/320 portrait and 844×390 landscape pass. Japanese, English and Korean fit the dialog without horizontal overflow; short viewports use dialog scrolling. All four difficulty callbacks, keyboard focus and three dismissal routes pass. Visual inspection confirms one thin outer frame, continuous rows and readable text. Browser page errors: zero. Checks use API/account fixtures.

Staging: runtime `a2dd8c7c`, version `82ab06c5-73aa-43c6-aa92-6c4341f7aca2`, 100% traffic. All 18 deployed HTML/JS/CSS hashes match the build. Responsive, three-language, focus and dismissal checks pass on the deployed frontend. Selecting Easy starts a real local BOT game and completes the unskippable opening with hand visible and controls unlocked. API/account responses are fixtures; no production deployment.

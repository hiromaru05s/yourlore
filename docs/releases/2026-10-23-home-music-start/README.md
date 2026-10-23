# HOME music startup

HOME music previously created its media element only after the artwork and entrance finished, with `preload="none"`. The music request and buffering therefore added an unpredictable silent interval after HOME was ready.

HOME now preloads the same recording during preparation and starts 600 ms after the first screen-ready signal. Later menu-ready events and gestures do not reset or bypass this pause. Muted/background startup does not preload; navigation cancels the pending start and releases the element. Battle intro and loop timing retain their existing defaults.

## Browser evidence

`tests/home-music-start-browser.mjs` uses the actual HOME, entrance and native Chrome audio with API/account fixtures. A 2,500 ms delay is applied to the music response with service workers disabled so the network condition is reproducible. Autoplay is explicitly allowed to isolate playback timing; this does not prove an authenticated session or unrestricted autoplay on every browser.

- Before, production: 3,312 ms from screen ready to `playing` (`before.json`).
- After, local production build: 612 ms (`local-build.json`). The recording started loading before HOME was ready.
- Native playback mute/restore and menu navigation passed; one active recording remained.
- Unit regression covers initial silence, repeated ready events, gestures during the pause, navigation cancellation, mute, visibility, autoplay rejection/retry, and battle intro/loop timing.
- Typecheck and build passed. The first concurrent full-suite run hit transfer/card-reference timeouts and was stopped to avoid competing with an existing production release. Final guarded release results are recorded separately after completion.

The 600 ms interval is the intended start time once the browser permits playback; a connection that has not buffered enough audio can still delay it. The recording, gain and HOME entrance animation are unchanged.

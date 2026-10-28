# Tutorial turn-button copy — production release

- Source: `75147cbe36b10b5b2467ee185ac96aaf25e39472`
- Production: https://yourlore.xyz
- Worker version: `658b8a82-dba9-46a2-82cc-c8205fc793ff`
- Served entry: `/assets/main-C27LSbLT.js`
- Served application chunk: `/assets/main-ChGdgE3I.js`

Changed the third checkpoint, highlighted at `#endBtn`, to explain alternating turns, pressing END TURN to end a turn, and the surrounding timer light. Removed the unrelated monster-attack instruction at that checkpoint. Japanese, English and Korean updated; gameplay unchanged.

Japanese copy:
> お互い交互にターンを進めるよ。この「END TURN」を押すと、自分のターンを終了できるよ。ボタンの周りの光で、残り時間も確認できるよ。

Validation: actual tutorial reducer replay passed (47 checkpoints, 1455 Japanese body characters); guarded production deploy passed all 249 tests, typechecks and build. Production application chunk fetched after deployment contains the new copy and no longer contains the old copy. Timer source confirms the surrounding 24 segments reflect remaining time.

The signed-in browser was available before deployment but disconnected during release; native Chrome subsequently showed the profile picker. Post-release visual verification was not completed. Served-asset verification above is not a post-release screenshot claim.

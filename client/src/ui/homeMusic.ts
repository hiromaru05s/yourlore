import { isMenuReady } from "./assetReadiness";
import { HOME_MUSIC_GAIN, startBackgroundMusic } from "./backgroundMusic";

/** Preload during HOME preparation, then leave one short beat after the reveal. */
export function startHomeMusic(): () => void {
  return startBackgroundMusic({
    url: "/music/yohaku-to-zankyo.mp3",
    gain: HOME_MUSIC_GAIN,
    ready: isMenuReady(),
    preload: true,
    startDelayMs: 600,
  });
}

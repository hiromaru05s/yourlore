import { isMenuReady } from "./assetReadiness";
import { HOME_MUSIC_GAIN, startBackgroundMusic } from "./backgroundMusic";

/** Shared menu music, owned by the router across page changes; waits for initial artwork. */
export function startHomeMusic(): () => void {
  return startBackgroundMusic({
    url: "/music/yohaku-to-zankyo.mp3",
    gain: HOME_MUSIC_GAIN,
    ready: isMenuReady(),
  });
}

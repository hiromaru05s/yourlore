import { isMenuReady } from "./assetReadiness";
import { HOME_MUSIC_GAIN, startBackgroundMusic } from "./backgroundMusic";

/** Home-only music. The recording never competes with the initial artwork load. */
export function startHomeMusic(): () => void {
  return startBackgroundMusic({
    url: "/music/yohaku-to-zankyo.mp3",
    gain: HOME_MUSIC_GAIN,
    ready: isMenuReady(),
  });
}

import { isMenuReady } from "./assetReadiness";
import { getSfxVolume } from "./sound";

/** Home-only music. The recording never competes with the initial artwork load. */
export function startHomeMusic(): () => void {
  let audio: HTMLAudioElement | undefined;
  let disposed = false;
  let ready = isMenuReady();
  let pending = false;
  const audible = () => !disposed && ready && !document.hidden && getSfxVolume() > 0;

  const sync = () => {
    if (!audible()) { audio?.pause(); return; }
    if (!audio) {
      audio = new Audio("/music/yohaku-to-zankyo.mp3");
      audio.loop = true;
      audio.preload = "none";
    }
    // Keep the music beneath interface effects; respect the existing mute setting.
    audio.volume = .5 * getSfxVolume() ** 2;
    if (!audio.paused || pending) return;
    pending = true;
    void audio.play().then(() => {
      if (!audible()) audio?.pause();
    }).catch(() => {
      // Autoplay may require the next user gesture. Navigation remains available.
    }).finally(() => { pending = false; });
  };
  const onReady = () => { ready = true; sync(); };
  document.addEventListener("lore:screen-ready", onReady);
  document.addEventListener("pointerdown", sync, true);
  document.addEventListener("click", sync, true);
  document.addEventListener("keydown", sync, true);
  document.addEventListener("visibilitychange", sync);
  sync();

  return () => {
    disposed = true;
    document.removeEventListener("lore:screen-ready", onReady);
    document.removeEventListener("pointerdown", sync, true);
    document.removeEventListener("click", sync, true);
    document.removeEventListener("keydown", sync, true);
    document.removeEventListener("visibilitychange", sync);
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
  };
}

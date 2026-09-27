import { getSfxVolume } from "./sound";

export const HOME_MUSIC_GAIN = .5;
interface MusicOptions {
  url: string;
  gain: number;
  gapMs?: number;
  ready?: boolean;
}

/** One screen owns one recording and its restart timer. */
export function startBackgroundMusic({ url, gain, gapMs = 0, ready = true }: MusicOptions): () => void {
  let audio: HTMLAudioElement | undefined;
  let disposed = false;
  let pending = false;
  let restartAt = 0;
  let restartTimer: ReturnType<typeof setTimeout> | undefined;
  const audible = () => !disposed && ready && !document.hidden && getSfxVolume() > 0;
  const onEnded = () => {
    restartAt = performance.now() + gapMs;
    clearTimeout(restartTimer);
    restartTimer = setTimeout(sync, gapMs);
  };
  const sync = () => {
    if (!audible()) { audio?.pause(); return; }
    if (audio) audio.volume = gain * getSfxVolume() ** 2;
    // Gestures, volume changes and tab switches must not skip the quiet interval.
    const remaining = restartAt - performance.now();
    if (remaining > 0) {
      clearTimeout(restartTimer);
      restartTimer = setTimeout(sync, remaining);
      return;
    }
    if (!audio) {
      audio = new Audio(url);
      audio.loop = gapMs === 0;
      audio.preload = "none";
      audio.volume = gain * getSfxVolume() ** 2;
      if (gapMs > 0) audio.addEventListener("ended", onEnded);
    }
    if (!audio.paused || pending) return;
    if (audio.ended) audio.currentTime = 0;
    pending = true;
    void audio.play().then(() => {
      if (!audible()) audio?.pause();
    }).catch(() => {
      // Autoplay may require the next user gesture. Navigation remains available.
    }).finally(() => { pending = false; });
  };
  const onReady = () => { ready = true; sync(); };
  document.addEventListener("lore:screen-ready", onReady);
  document.addEventListener("lore:volume-change", sync);
  document.addEventListener("pointerdown", sync, true);
  document.addEventListener("click", sync, true);
  document.addEventListener("keydown", sync, true);
  document.addEventListener("visibilitychange", sync);
  sync();

  return () => {
    disposed = true;
    clearTimeout(restartTimer);
    document.removeEventListener("lore:screen-ready", onReady);
    document.removeEventListener("lore:volume-change", sync);
    document.removeEventListener("pointerdown", sync, true);
    document.removeEventListener("click", sync, true);
    document.removeEventListener("keydown", sync, true);
    document.removeEventListener("visibilitychange", sync);
    if (audio) {
      audio.removeEventListener("ended", onEnded);
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
  };
}

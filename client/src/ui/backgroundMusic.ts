import { getSfxVolume } from "./sound";

export const HOME_MUSIC_GAIN = .5;
interface MusicOptions {
  url: string;
  gain: number;
  gapMs?: number;
  ready?: boolean;
  intro?: { url: string; durationSeconds: number; offsetSeconds?: number };
}

/** One screen owns one recording and its restart timer. */
export function startBackgroundMusic({ url, gain, gapMs = 0, ready = true, intro }: MusicOptions): () => void {
  let audio: HTMLAudioElement | undefined;
  let disposed = false;
  const introStartedAt = performance.now() - (intro?.offsetSeconds ?? 0) * 1000;
  let pending = false;
  let restartAt = 0;
  let restartTimer: ReturnType<typeof setTimeout> | undefined;
  const releaseAudio = () => {
    if (!audio) return;
    audio.removeEventListener("ended", onEnded);
    audio.removeEventListener("error", onError);
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    audio = undefined;
  };
  const finishIntro = () => {
    intro = undefined;
    releaseAudio();
    pending = false;
    sync();
  };
  const onError = () => { if (intro && !disposed) finishIntro(); };
  const audible = () => !disposed && ready && !document.hidden && getSfxVolume() > 0;
  const onEnded = () => {
    if (intro) { finishIntro(); return; }
    restartAt = performance.now() + gapMs;
    clearTimeout(restartTimer);
    restartTimer = setTimeout(sync, gapMs);
  };
  const sync = () => {
    if (!audible()) { audio?.pause(); return; }
    // Rejoin, mute and hidden-tab recovery follow the opening clock, not a stale fanfare.
    if (intro && (!audio || audio.paused)) {
      intro.offsetSeconds = Math.max(0, performance.now() - introStartedAt) / 1000;
      if (intro.offsetSeconds >= intro.durationSeconds) { finishIntro(); return; }
      if (audio) audio.currentTime = intro.offsetSeconds;
    }
    if (audio) audio.volume = gain * getSfxVolume() ** 2;
    // Gestures, volume changes and tab switches must not skip the quiet interval.
    const remaining = restartAt - performance.now();
    if (remaining > 0) {
      clearTimeout(restartTimer);
      restartTimer = setTimeout(sync, remaining);
      return;
    }
    if (!audio) {
      audio = new Audio(intro?.url ?? url);
      audio.loop = !intro && gapMs === 0;
      audio.preload = "none";
      audio.volume = gain * getSfxVolume() ** 2;
      if (intro?.offsetSeconds) audio.currentTime = intro.offsetSeconds;
      if (intro || gapMs > 0) audio.addEventListener("ended", onEnded);
      audio.addEventListener("error", onError);
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
    releaseAudio();
  };
}

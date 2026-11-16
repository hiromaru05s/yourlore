import {SEEKER_ID, SEEKER_ROOT} from './seekerMotion';
import {seekerName} from './seekerLabels';

const standingArt: Record<string, string> = {[SEEKER_ID]: SEEKER_ROOT + '/standing.webp'};
export const standingSeeker = (id?: string | null) => standingArt[id ?? ''] ?? standingArt[SEEKER_ID];

/** Deform horizontal sections of the painting. The shoulders lead the cloth,
 * the hood follows the chest, and both boots keep their original footing. */
export function mountHomeSeeker(host: HTMLElement, avatar?: string | null) {
  const poster = new Image();
  host.setAttribute('role', 'img');
  host.setAttribute('aria-label', seekerName(avatar ?? undefined));
  poster.alt = '';
  poster.src = standingSeeker(avatar);
  host.append(poster);
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext('2d');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0, elapsed = 0, previous = 0, visible = true, disposed = false;
  function draw(time: number) {
    frame = requestAnimationFrame(draw);
    if (!ctx || time - previous < 1000 / 30) return;
    elapsed += Math.min(time - previous, 65) / 1000;
    previous = time;
    const {width, height} = canvas;
    const sourceScale = poster.naturalHeight / height;
    const breath = Math.sin(elapsed * 1.43);
    ctx.clearRect(0, 0, width, height);
    const lift = (y: number) => Math.round(y - breath * 2.7 * Math.max(0, 1 - y / (height * .63)));
    for (let y = 0; y < height; y += 4) {
      const end = Math.min(y + 4, height), v = y / height;
      const shoulders = Math.exp(-Math.pow((v - .27) / .19, 2));
      const hem = Math.exp(-Math.pow((v - .74) / .12, 2));
      const sway = 2.8 * (1-v)**2 * Math.sin(elapsed * .77) + 2.2 * hem * Math.sin(elapsed * 1.02 - v * 6);
      const spread = breath * shoulders * 1.8;
      ctx.drawImage(poster, 0, y * sourceScale, poster.naturalWidth, (end-y)*sourceScale,
        sway-spread, lift(y), width+spread*2, lift(end)-lift(y));
    }
  }
  function sync() {
    cancelAnimationFrame(frame);
    const active = !!ctx && canvas.isConnected && !reduced.matches && visible && !document.hidden;
    host.classList.toggle('is-moving', active);
    if (active) { previous = performance.now(); frame = requestAnimationFrame(draw); }
  }
  const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); });
  observer.observe(host);
  void poster.decode().then(() => {
    if (disposed || !ctx) return;
    canvas.height = Math.min(720, poster.naturalHeight);
    canvas.width = Math.round(canvas.height * poster.naturalWidth / poster.naturalHeight);
    ctx.drawImage(poster, 0, 0, canvas.width, canvas.height);
    host.append(canvas); sync();
  }).catch(() => {});
  reduced.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  return () => {
    disposed = true; cancelAnimationFrame(frame); observer.disconnect();
    reduced.removeEventListener('change', sync);
    document.removeEventListener('visibilitychange', sync);
  };
}

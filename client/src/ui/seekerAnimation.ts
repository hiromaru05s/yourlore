import {SeekerMotion, SEEKER_SIZE, SEEKER_ID, SEEKER_HIT_MS, seekerAtlas, type SeekerAction} from './seekerMotion';
import {seekerName} from './seekerLabels';
export {SEEKER_ACTIONS, damageAction} from './seekerMotion';
export type {SeekerAction} from './seekerMotion';
export const seekerAssets = [seekerAtlas()];
let image: Promise<HTMLImageElement> | undefined;
const players = new Map<HTMLCanvasElement, {motion: SeekerMotion; image?: HTMLImageElement; last: number; timer: number; board: boolean; impact?: Animation}>();
let paused = false, media: MediaQueryList | undefined;
function load(): Promise<HTMLImageElement> {
  if (!image) {
    image = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = seekerAtlas();
    });
    void image.catch(() => { image = undefined; });
  }
  return image;
}
function paint(canvas: HTMLCanvasElement): void {
  const player = players.get(canvas); if (!player?.image) return;
  const {action, frame} = player.motion.sample(performance.now());
  if (player.last === frame) return;
  const ctx = canvas.getContext('2d', {alpha: false}); if (!ctx) return;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(player.image, frame * SEEKER_SIZE, 0, SEEKER_SIZE, SEEKER_SIZE, 0, 0, SEEKER_SIZE, SEEKER_SIZE);
  player.last = frame; canvas.dataset.action = action; canvas.dataset.frame = String(frame); canvas.dataset.ready = 'true';
}
function settleAll(): void { for (const canvas of players.keys()) resetSeeker(canvas); }
function attach(): void {
  media = matchMedia('(prefers-reduced-motion: reduce)'); media.addEventListener('change', settleAll);
  document.addEventListener('visibilitychange', settleAll);
}
function detach(): void {
  media?.removeEventListener('change', settleAll); media = undefined;
  document.removeEventListener('visibilitychange', settleAll);
}
export function seekerPortrait(options: {board?:boolean} = {}): HTMLCanvasElement {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = SEEKER_SIZE;
  canvas.className = 'seeker-motion'; canvas.dataset.animation = 'faceless-v2'; canvas.dataset.seeker = SEEKER_ID;
  canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', seekerName());
  const ctx = canvas.getContext('2d', {alpha: false}); if (ctx) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, SEEKER_SIZE, SEEKER_SIZE); }
  if (!players.size) attach();
  const player = {motion: new SeekerMotion(), last: -1, timer: 0, board: options.board??false, image: undefined as HTMLImageElement | undefined};
  players.set(canvas, player);
  void load().then(img => { if (players.has(canvas)) { player.image = img; paint(canvas); } })
    .catch(() => { if (players.has(canvas)) canvas.dataset.ready = 'error'; });
  return canvas;
}
export function playSeeker(canvas: HTMLCanvasElement | null, action: SeekerAction): void {
  if (!canvas) return;
  const player = players.get(canvas); if (!player) return;
  clearTimeout(player.timer); player.timer = 0;
  player.impact?.cancel(); player.impact = undefined;
  if ((paused && player.board) || document.hidden || media?.matches) action = 'idle';
  player.motion.request(action, performance.now()); paint(canvas);
  // Static at rest. One timer per hit, replaced by repeated damage; no animation loop or queue.
  if (action === 'hurt') {
    const frame = canvas.closest<HTMLElement>('.pt-ring, .hooded-live, .portrait-paper') ?? canvas;
    const kick = Math.min(6, Math.max(3, frame.getBoundingClientRect().width * .035));
    // Individual transforms preserve the board's layout transform and move its frame artwork too.
    player.impact = frame.animate([
      {translate: '0px 0px', rotate: '0deg', offset: 0},
      {translate: `${-kick}px 1px`, rotate: '-1.2deg', offset: .13},
      {translate: `${kick * .7}px -1px`, rotate: '.8deg', offset: .34},
      {translate: `${-kick * .4}px 0px`, rotate: '-.45deg', offset: .56},
      {translate: `${kick * .18}px 0px`, rotate: '.2deg', offset: .77},
      {translate: '0px 0px', rotate: '0deg', offset: 1},
    ], {duration: SEEKER_HIT_MS, easing: 'ease-out'});
    player.impact.id = 'seeker-impact';
    player.impact.startTime = document.timeline.currentTime;
    player.timer = window.setTimeout(() => {
      player.timer = 0;
      if (!canvas.isConnected) disposeSeeker(canvas); else resetSeeker(canvas);
    }, SEEKER_HIT_MS);
  }
}
export function resetSeeker(canvas: HTMLCanvasElement): void {
  const player = players.get(canvas); if (!player) return;
  clearTimeout(player.timer); player.timer = 0;
  player.impact?.cancel(); player.impact = undefined;
  player.motion.reset(); paint(canvas);
}
export function playSeekerSide(side: 'me' | 'opp', action: SeekerAction): void {
  playSeeker(document.querySelector<HTMLCanvasElement>(`#portrait${side === 'me' ? 'Me' : 'Opp'} .seeker-motion`), action);
}
export function setSeekerSkip(value: boolean): void {
  paused = value;
  for (const [canvas, player] of players) if (player.board) resetSeeker(canvas);
}
export function disposeSeeker(canvas: HTMLCanvasElement): void {
  const player = players.get(canvas);
  clearTimeout(player?.timer); player?.impact?.cancel(); players.delete(canvas); if (!players.size) detach();
}
export function disposeSeekers(root: ParentNode): void { root.querySelectorAll<HTMLCanvasElement>('.seeker-motion').forEach(disposeSeeker); }
export function seekerPlaybackCount(): number { return players.size; }

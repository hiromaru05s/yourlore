import {SeekerMotion, SEEKER_ACTIONS, SEEKER_SIZE, seekerAtlas, type SeekerAction, type SeekerColor} from './seekerMotion';
export {SEEKER_ACTIONS, seekerDuration, damageAction} from './seekerMotion';
export type {SeekerAction} from './seekerMotion';
export const seekerAssets = (['red', 'blue'] as const).map(seekerAtlas);
const images = new Map<SeekerColor, Promise<HTMLImageElement>>();
const players = new Map<HTMLCanvasElement, {motion: SeekerMotion; image?: HTMLImageElement; last: string; connected: boolean; board: boolean}>();
let clock = 0, paused = false, media: MediaQueryList | undefined;
function load(color: SeekerColor): Promise<HTMLImageElement> {
  let promise = images.get(color);
  if (!promise) {
    promise = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = seekerAtlas(color);
    });
    images.set(color, promise);
    void promise.catch(() => images.delete(color));
  }
  return promise;
}
function paint(canvas: HTMLCanvasElement, now: number): void {
  const player = players.get(canvas); if (!player?.image) return;
  const {action, frame} = player.motion.sample(now), key = `${action}:${frame}`;
  if (player.last === key) return;
  const ctx = canvas.getContext('2d', {alpha: false}); if (!ctx) return;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(player.image, frame * SEEKER_SIZE, SEEKER_ACTIONS.indexOf(action) * SEEKER_SIZE,
    SEEKER_SIZE, SEEKER_SIZE, 0, 0, SEEKER_SIZE, SEEKER_SIZE);
  player.last = key; canvas.dataset.action = action; canvas.dataset.frame = String(frame); canvas.dataset.ready = 'true';
}
function tick(now: number): void {
  clock = 0;
  for (const [canvas, player] of players) {
    if (!canvas.isConnected) { if (player.connected) disposeSeeker(canvas); continue; }
    player.connected = true; if(!paused || !player.board)paint(canvas, now);
  }
  schedule();
}
function schedule(): void {
  if ([...players.values()].some(p=>!paused||!p.board) && !clock && !document.hidden && !media?.matches) clock = requestAnimationFrame(tick);
}
function settleAll(): void {
  cancelAnimationFrame(clock); clock = 0;
  const now = performance.now();
  for (const [canvas, player] of players) { player.motion.settle(now); paint(canvas, now); }
  schedule();
}
function attach(): void {
  media = matchMedia('(prefers-reduced-motion: reduce)'); media.addEventListener('change', settleAll);
  document.addEventListener('visibilitychange', settleAll);
}
function detach(): void {
  cancelAnimationFrame(clock); clock = 0;
  media?.removeEventListener('change', settleAll); media = undefined;
  document.removeEventListener('visibilitychange', settleAll);
}
export function seekerPortrait(color: SeekerColor, options: {board?:boolean} = {}): HTMLCanvasElement {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = SEEKER_SIZE;
  canvas.className = 'seeker-motion'; canvas.dataset.animation = 'hooded-v1'; canvas.dataset.seeker = color;
  canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', color === 'red' ? 'Hooded woman' : 'Hooded man');
  const ctx = canvas.getContext('2d', {alpha: false}); if (ctx) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, SEEKER_SIZE, SEEKER_SIZE); }
  if (!players.size) attach();
  const player = {motion: new SeekerMotion(performance.now()), last: '', connected: false, board: options.board??false, image: undefined as HTMLImageElement | undefined};
  players.set(canvas, player);
  void load(color).then(img => {
    if (!players.has(canvas)) return;
    player.image = img; const now = performance.now();
    player.motion.settle(now); paint(canvas, now); schedule();
  }).catch(() => { if (players.has(canvas)) canvas.dataset.ready = 'error'; });
  schedule(); return canvas;
}
export function playSeeker(canvas: HTMLCanvasElement | null, action: SeekerAction): void {
  if (!canvas) return;
  const player = players.get(canvas); if (!player) return;
  const now = performance.now(); player.motion.request(action, now);
  if ((paused&&player.board) || document.hidden || media?.matches) player.motion.settle(now);
  paint(canvas, now); schedule();
}
export function resetSeeker(canvas: HTMLCanvasElement): void {
  const player = players.get(canvas); if (!player) return;
  const now = performance.now(); player.motion.reset(now); paint(canvas, now); schedule();
}
export function playSeekerSide(side: 'me' | 'opp', action: SeekerAction): void {
  playSeeker(document.querySelector<HTMLCanvasElement>(`#portrait${side === 'me' ? 'Me' : 'Opp'} .seeker-motion`), action);
}
/** Reconnected/initial end-state snapshots show the final pose without replaying a result. */
export function settleSeekerSide(side: 'me' | 'opp', action: 'victory' | 'defeat'): void {
  const canvas=document.querySelector<HTMLCanvasElement>(`#portrait${side === 'me' ? 'Me' : 'Opp'} .seeker-motion`);
  if(!canvas)return;
  const player=players.get(canvas);if(!player)return;
  const now=performance.now();player.motion.request(action,now);player.motion.settle(now);paint(canvas,now);
}
export function setSeekerSkip(value: boolean): void {
  if (paused === value) return;
  paused=value;cancelAnimationFrame(clock);clock=0;const now=performance.now();
  // Fast-forward belongs to the duel; closing a match must not freeze a later profile preview.
  for(const [canvas,player] of players)if(player.board){player.motion.settle(now);paint(canvas,now);}
  schedule();
}
export function disposeSeeker(canvas: HTMLCanvasElement): void { players.delete(canvas); if (!players.size) detach(); }
export function disposeSeekers(root: ParentNode): void { root.querySelectorAll<HTMLCanvasElement>('.seeker-motion').forEach(disposeSeeker); }
export function seekerPlaybackCount(): number { return players.size; }

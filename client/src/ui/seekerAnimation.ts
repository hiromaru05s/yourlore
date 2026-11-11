import {SeekerMotion, SEEKER_SIZE, SEEKER_ID, seekerRecoil, seekerManaCrest, seekerAtlas, type SeekerAction} from './seekerMotion';
import {seekerName} from './seekerLabels';
export {SEEKER_ACTIONS, damageAction} from './seekerMotion';
export type {SeekerAction} from './seekerMotion';
export const seekerAssets = [seekerAtlas(), seekerRecoil(), seekerManaCrest()];
type Player = {motion: SeekerMotion; idle?: HTMLImageElement; last: string; raf: number; board: boolean; request: number};
const players = new Map<HTMLCanvasElement, Player>();
const images = new Map<string, Promise<HTMLImageElement>>();
let manaCrest: HTMLImageElement | undefined;
let recoil: HTMLImageElement | undefined;
let paused = false, media: MediaQueryList | undefined;
function load(url: string): Promise<HTMLImageElement> {
  const cached = images.get(url);
  if (cached) return cached;
  const img = new Image();
  const result = new Promise<HTMLImageElement>((resolve, reject) => {
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  }).catch(error => { images.delete(url); throw error; });
  images.set(url, result);
  return result;
}
function paint(canvas: HTMLCanvasElement, player: Player, now: number): void {
  const {action, frame} = player.motion.sample(now);
  const key = action + frame;
  const img = action === 'hurt' ? recoil : player.idle;
  if (img && player.last !== key) {
    const ctx = canvas.getContext('2d', {alpha: false});
    ctx?.drawImage(img, (frame % 8) * SEEKER_SIZE, Math.floor(frame / 8) * SEEKER_SIZE,
      SEEKER_SIZE, SEEKER_SIZE, 0, 0, SEEKER_SIZE, SEEKER_SIZE);
    player.last = key;
    canvas.dataset.action = action; canvas.dataset.frame = String(frame); canvas.dataset.ready = 'true';
  }
  if (action === 'hurt') {
    player.raf = requestAnimationFrame(time => {
      player.raf = 0;
      if (canvas.isConnected) paint(canvas, player, time); else disposeSeeker(canvas);
    });
  }
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
  const player: Player = {motion: new SeekerMotion(), last: '', raf: 0, request: 0, board: options.board ?? false};
  players.set(canvas, player);
  void load(seekerAtlas()).then(img => {
    if (!players.has(canvas)) return;
    player.idle = img;
    if (!player.raf) paint(canvas, player, performance.now());
  }).catch(() => { if (players.has(canvas)) canvas.dataset.ready = 'error'; });
  if (player.board && !media?.matches && !recoil) void load(seekerRecoil()).then(img => { recoil = img; }).catch(() => {});
  if (player.board && !media?.matches && !manaCrest) void load(seekerManaCrest()).then(img => { manaCrest = img; }).catch(() => {});
  return canvas;
}
export function playSeeker(canvas: HTMLCanvasElement | null, action: SeekerAction): void {
  if (!canvas) return;
  const player = players.get(canvas);
  if (!player) return;
  if (action === 'idle' || (paused && player.board) || document.hidden || media?.matches) {
    resetSeeker(canvas);
    return;
  }
  const request = ++player.request;
  const start = () => {
    if (request !== player.request || !players.has(canvas)) return;
    cancelAnimationFrame(player.raf);
    const now = performance.now();
    player.motion.request('hurt', now);
    paint(canvas, player, now);
  };
  if (recoil) start();
  else void load(seekerRecoil()).then(img => { recoil = img; start(); }).catch(() => {});
}
/** Play the 57-pose crest study on the same canvas as idle and damage. */
export function playSeekerMana(side: 'me' | 'opp'): void {
  const canvas = document.querySelector<HTMLCanvasElement>(side === 'me' ? '#portraitMe .seeker-motion' : '#portraitOpp .seeker-motion');
  if (!canvas || paused || document.hidden || media?.matches || canvas.dataset.action === 'hurt') return;
  const player = players.get(canvas);
  if (!player) return;
  const request = ++player.request;
  const start = (image: HTMLImageElement) => {
    if (request !== player.request || !canvas.isConnected || players.get(canvas) !== player) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    cancelAnimationFrame(player.raf);
    let elapsed = 0, lastTime = performance.now(), lastFrame = -1;
    function tick(now: number) {
      elapsed += Math.min(40, Math.max(0, now - lastTime));
      lastTime = now;
      const frame = Math.round(elapsed / 26);
      if (!canvas!.isConnected) { disposeSeeker(canvas!); return; }
      if (frame >= 56) { resetSeeker(canvas!); return; }
      if (frame !== lastFrame) {
        ctx!.drawImage(image, (frame % 8) * SEEKER_SIZE, Math.floor(frame / 8) * SEEKER_SIZE,
          SEEKER_SIZE, SEEKER_SIZE, 0, 0, SEEKER_SIZE, SEEKER_SIZE);
        player!.last = 'mana' + frame;
        canvas!.dataset.action = 'mana'; canvas!.dataset.frame = String(frame);
        lastFrame = frame;
      }
      player!.raf = requestAnimationFrame(tick);
    }
    tick(lastTime);
  };
  if (manaCrest) start(manaCrest);
  else void load(seekerManaCrest()).then(image => { manaCrest = image; start(image); }).catch(() => {});
}
export function resetSeeker(canvas: HTMLCanvasElement): void {
  const player = players.get(canvas);
  if (!player) return;
  player.request++;
  cancelAnimationFrame(player.raf); player.raf = 0;
  player.motion.reset(); paint(canvas, player, performance.now());
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
  if (player) cancelAnimationFrame(player.raf); players.delete(canvas); if (!players.size) detach();
}
export function disposeSeekers(root: ParentNode): void { root.querySelectorAll<HTMLCanvasElement>('.seeker-motion').forEach(disposeSeeker); }
export function seekerPlaybackCount(): number { return players.size; }

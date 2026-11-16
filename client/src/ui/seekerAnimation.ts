import '../styles/portraitBackground.css';
import type {ProfileBackground} from '../shared/profileAppearance';
import {SeekerMotion, SEEKER_SIZE, SEEKER_ID, seekerRecoil, seekerManaCrest, seekerHealRise, seekerAtlas, type SeekerAction} from './seekerMotion';
import {seekerName} from './seekerLabels';
export {SEEKER_ACTIONS, damageAction} from './seekerMotion';
export type {SeekerAction} from './seekerMotion';
export const seekerAssets = [seekerAtlas(), seekerRecoil(), seekerManaCrest(), seekerHealRise()];
type Player = {motion: SeekerMotion; idle?: HTMLImageElement; recoil?: HTMLImageElement; cutout: boolean; last: string; raf: number; board: boolean; request: number};
const players = new Map<HTMLCanvasElement, Player>();
const images = new Map<string, Promise<HTMLImageElement>>();
const lightSheets = {mana: seekerManaCrest(), heal: seekerHealRise()};
type Light = keyof typeof lightSheets;
function sheetUrl(url: string, player: Player) {
  return player.cutout ? url.replace('/faceless-v2/', '/faceless-v2/cutout/') : url;
}
function drawPose(canvas: HTMLCanvasElement, player: Player, image: HTMLImageElement, frame: number) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const size = player.cutout ? SEEKER_SIZE / 2 : SEEKER_SIZE;
  if (player.cutout) ctx.clearRect(0, 0, canvas.width, canvas.height);
  const extent = player.cutout ? canvas.width * .84 : canvas.width;
  ctx.drawImage(image, (frame % 8) * size, Math.floor(frame / 8) * size,
    size, size, (canvas.width-extent)/2, canvas.height-extent, extent, extent);
}
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
  const img = action === 'hurt' ? player.recoil : player.idle;
  if (img && player.last !== key) {
    drawPose(canvas, player, img, frame);
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
export function seekerPortrait(options: {board?:boolean; background?:ProfileBackground} = {}): HTMLCanvasElement {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = SEEKER_SIZE;
  canvas.className = 'seeker-motion'; canvas.dataset.animation = 'faceless-v2'; canvas.dataset.seeker = SEEKER_ID;
  canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', seekerName());
  const background = options.background ?? 'plain';
  const cutout = background !== 'plain';
  canvas.dataset.background = background;
  const ctx = canvas.getContext('2d', {alpha: cutout}); if (ctx && !cutout) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, SEEKER_SIZE, SEEKER_SIZE); }
  if (!players.size) attach();
  const player: Player = {motion: new SeekerMotion(), cutout, last: '', raf: 0, request: 0, board: options.board ?? false};
  players.set(canvas, player);
  void load(sheetUrl(seekerAtlas(), player)).then(img => {
    if (!players.has(canvas)) return;
    player.idle = img;
    if (!player.raf) paint(canvas, player, performance.now());
  }).catch(() => { if (players.has(canvas)) canvas.dataset.ready = 'error'; });
  if (player.board && !media?.matches) {
    void load(sheetUrl(seekerRecoil(), player)).then(img => { player.recoil = img; }).catch(() => {});
    for (const light of ['mana', 'heal'] as const) {
      void load(sheetUrl(lightSheets[light], player)).catch(() => {});
    }
  }
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
  if (player.recoil) start();
  else void load(sheetUrl(seekerRecoil(), player)).then(img => { player.recoil = img; start(); }).catch(() => {});
}
/** Both light studies have 57 poses and end on the original idle portrait. */
export function playSeekerLight(side: 'me' | 'opp', light: Light): void {
  const canvas = document.querySelector<HTMLCanvasElement>(side === 'me' ? '#portraitMe .seeker-motion' : '#portraitOpp .seeker-motion');
  if (!canvas || paused || document.hidden || media?.matches || canvas.dataset.action === 'hurt') return;
  const player = players.get(canvas);
  if (!player) return;
  const request = ++player.request;
  const frameMs = light === 'mana' ? 26 : 32;
  const start = (image: HTMLImageElement) => {
    if (request !== player.request || !canvas.isConnected || players.get(canvas) !== player) return;
    cancelAnimationFrame(player.raf);
    let elapsed = 0, lastTime = performance.now(), lastFrame = -1;
    function tick(now: number) {
      elapsed += Math.min(40, Math.max(0, now - lastTime));
      lastTime = now;
      const frame = Math.round(elapsed / frameMs);
      if (!canvas!.isConnected) { disposeSeeker(canvas!); return; }
      if (frame >= 56) { resetSeeker(canvas!); return; }
      if (frame !== lastFrame) {
        drawPose(canvas!, player!, image, frame);
        player!.last = light + frame;
        canvas!.dataset.action = light; canvas!.dataset.frame = String(frame);
        lastFrame = frame;
      }
      player!.raf = requestAnimationFrame(tick);
    }
    tick(lastTime);
  };
  void load(sheetUrl(lightSheets[light], player)).then(start).catch(() => {});
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

import '../styles/portraitBackground.css';
import {createSeekerReaction} from './seekerReaction';
import type {ProfileBackground} from '../shared/profileAppearance';
import {SeekerMotion, SEEKER_SIZE, SEEKER_ID, seekerRecoil, seekerPoster, seekerIdle, type SeekerAction} from './seekerMotion';
import {seekerName} from './seekerLabels';
export {SEEKER_ACTIONS, damageAction} from './seekerMotion';
export type {SeekerAction} from './seekerMotion';
export const seekerAssets = [seekerPoster(), seekerIdle(), seekerRecoil()];
type Player = {motion: SeekerMotion; idle?: HTMLImageElement; recoil?: HTMLImageElement; loop?: HTMLImageElement; rig?: ReturnType<typeof createSeekerReaction>; last: string; raf: number; board: boolean; request: number};
const players = new Map<HTMLCanvasElement, Player>();
const images = new Map<string, Promise<HTMLImageElement>>();
type Light = 'mana' | 'heal';
function drawPose(canvas: HTMLCanvasElement, image: HTMLImageElement, frame: number) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const size = SEEKER_SIZE;
  ctx.clearRect(0, 0, size, size);
  ctx.drawImage(image, (frame % 8) * size, Math.floor(frame / 8) * size,
    size, size, 0, 0, canvas.width, canvas.height);
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
    drawPose(canvas, img, frame);
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
// Never swap out the GIF for a reaction. The canvas supplies the still for
// reduced motion, loading or decode failure, and the standalone studio.
function syncLoop(player: Player) {
  const loop = player.loop;
  if (!loop) return;
  const active = !paused && !document.hidden && !media?.matches;
  if (active && !loop.hasAttribute('src')) loop.src = seekerIdle();
  loop.hidden = !active || !loop.complete || !loop.naturalWidth;
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
export function seekerPortrait(options: {board?:boolean; background?:ProfileBackground; loop?:HTMLImageElement} = {}): HTMLCanvasElement {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = SEEKER_SIZE;
  canvas.className = 'seeker-motion'; canvas.dataset.animation = 'daylight-v1'; canvas.dataset.seeker = SEEKER_ID;
  canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', seekerName());
  const background = options.background ?? 'plain';
  canvas.dataset.background = background;
  if (!players.size) attach();
  const player: Player = {motion: new SeekerMotion(), loop:options.loop, last: '', raf: 0, request: 0, board: options.board ?? false};
  players.set(canvas, player);
  if (player.loop) { player.loop.onload = () => syncLoop(player); syncLoop(player); }
  void load(seekerPoster()).then(img => {
    if (!players.has(canvas)) return;
    player.idle = img;
    if (!player.raf && (!player.rig || !canvas.dataset.ready || canvas.dataset.action === 'idle')) paint(canvas, player, performance.now());
  }).catch(() => { if (players.has(canvas)) canvas.dataset.ready = 'error'; });
  return canvas;
}
export function boardSeeker(background: ProfileBackground): Node[] {
  const loop=new Image();loop.className='seeker-idle';loop.alt='';loop.hidden=true;
  const canvas=seekerPortrait({board:true,background,loop});
  const rig=createSeekerReaction(loop,canvas);
  players.get(canvas)!.rig=rig;
  return [canvas,loop,rig.svg];
}
export function playSeeker(canvas: HTMLCanvasElement | null, action: SeekerAction): void {
  if (!canvas) return;
  const player = players.get(canvas);
  if (!player) return;
  if (action === 'idle' || (paused && player.board) || document.hidden || media?.matches) {
    resetSeeker(canvas);
    return;
  }
  if (player.rig) {player.rig.play('hurt');return;}
  const request = ++player.request;
  const start = () => {
    if (request !== player.request || !players.has(canvas)) return;
    cancelAnimationFrame(player.raf);
    const now = performance.now();
    player.motion.request('hurt', now);
    paint(canvas, player, now);
  };
  if (player.recoil) start();
  else void load(seekerRecoil()).then(img => { player.recoil = img; start(); }).catch(() => {});
}
export function playSeekerLight(side: 'me' | 'opp', light: Light): void {
  if (paused || document.hidden || media?.matches) return;
  const canvas=document.querySelector<HTMLCanvasElement>(`#portrait${side==='me'?'Me':'Opp'} .seeker-motion`);
  if (canvas) players.get(canvas)?.rig?.play(light);
}
export function resetSeeker(canvas: HTMLCanvasElement): void {
  const player = players.get(canvas);
  if (!player) return;
  player.request++;
  cancelAnimationFrame(player.raf); player.raf = 0;
  player.rig?.reset(); syncLoop(player); player.motion.reset(); paint(canvas, player, performance.now());
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
  if (!player) return;
  cancelAnimationFrame(player.raf);
  player.rig?.reset();
  if (player.loop) player.loop.onload = null;
  players.delete(canvas); if (!players.size) detach();
}
export function disposeSeekers(root: ParentNode): void { root.querySelectorAll<HTMLCanvasElement>('.seeker-motion').forEach(disposeSeeker); }
export function seekerPlaybackCount(): number { return players.size; }

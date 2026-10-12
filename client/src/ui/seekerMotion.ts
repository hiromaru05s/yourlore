/** Eight authored poses per action, without blending pixel-art silhouettes. */
export const SEEKER_ACTIONS = ['idle', 'mana', 'heal', 'hurt', 'heavy', 'defeat', 'victory'] as const;
export type SeekerAction = typeof SEEKER_ACTIONS[number];
export type SeekerColor = 'red' | 'blue';
export const SEEKER_SIZE = 128;
export const SEEKER_ROOT = '/art/seekers/hooded-v1';
export const seekerPoster = (color: SeekerColor) => `${SEEKER_ROOT}/${color}-portrait.webp`;
export const seekerAtlas = (color: SeekerColor) => `${SEEKER_ROOT}/${color}.webp`;
export const seekerColor = (avatar?: string | null): SeekerColor => avatar === 'SEEKER_RED' ? 'red' : 'blue';
export const SEEKER_TIMINGS: Record<SeekerAction, readonly number[]> = {
  idle: [420, 300, 300, 420, 380, 300, 300, 420],
  mana: [90, 120, 150, 160, 230, 160, 150, 180],
  heal: [90, 140, 170, 210, 190, 160, 140, 180],
  hurt: [35, 55, 90, 110, 110, 120, 135, 160],
  heavy: [35, 60, 110, 130, 200, 170, 150, 180],
  defeat: [90, 140, 180, 220, 240, 240, 240, 240],
  victory: [100, 140, 160, 220, 230, 180, 180, 200],
};
export const seekerDuration = (action: SeekerAction) => SEEKER_TIMINGS[action].reduce((a, b) => a + b, 0);
export const damageAction = (amount: number): SeekerAction | null => amount > 0 ? amount >= 10 ? 'heavy' : 'hurt' : null;
const priority: Record<SeekerAction, number> = {idle: 0, mana: 1, heal: 1, hurt: 2, heavy: 3, victory: 4, defeat: 5};
export interface SeekerPose { action: SeekerAction; frame: number; }
/** Injected clock allows exact frame-boundary and interruption verification. */
export class SeekerMotion {
  action: SeekerAction = 'idle';
  started = 0;
  terminal: 'defeat' | 'victory' | null = null;
  private queue: SeekerAction[] = [];
  private bridge: { action: SeekerAction; frames: number[]; started: number; next: SeekerAction } | null = null;
  constructor(now = 0) { this.started = now; }
  private frame(now: number): number {
    const duration = seekerDuration(this.action);
    let age = Math.max(0, now - this.started);
    if (this.action === 'idle') age %= duration;
    for (let i = 0; i < 8; i++) { age -= SEEKER_TIMINGS[this.action][i]; if (age < 0) return i; }
    return 7;
  }
  private begin(action: SeekerAction, now: number): void { this.action = action; this.started = now; this.bridge = null; }
  request(action: SeekerAction, now: number): void {
    if (this.terminal) return;
    const current = this.sample(now);
    if (action === 'idle') this.queue = [];
    else if (action === 'defeat' || action === 'victory') { this.terminal = action; this.queue = []; }
    else if (this.bridge || (this.action !== 'idle' && priority[action] <= priority[this.action])) {
      if (!this.queue.includes(action)) this.queue.push(action);
      this.queue = this.queue.sort((a, b) => priority[b] - priority[a]).slice(0, 2);
      return;
    }
    if (current.frame === 0 || current.frame === 7) { this.begin(action, now); return; }
    // Reach the shared neutral endpoint through authored frames, in at most 160ms.
    const frames = current.frame <= 3
      ? Array.from({length: current.frame + 1}, (_, i) => current.frame - i)
      : Array.from({length: 8 - current.frame}, (_, i) => current.frame + i);
    this.bridge = {action: current.action, frames, started: now, next: action};
  }
  sample(now: number): SeekerPose {
    if (this.bridge) {
      const {action, frames, started, next} = this.bridge;
      const i = Math.floor(Math.max(0, now - started) / 40);
      if (i < frames.length) return {action, frame: frames[i]};
      this.begin(next, started + frames.length * 40);
    }
    if (this.action !== 'idle' && now - this.started >= seekerDuration(this.action)) {
      if (this.action === 'defeat') return {action: 'defeat', frame: 7};
      this.begin(this.queue.shift() ?? 'idle', now);
    }
    return {action: this.action, frame: this.frame(now)};
  }
  settle(now: number): void {
    this.queue = []; this.bridge = null;
    this.begin(this.terminal === 'defeat' ? 'defeat' : 'idle', now);
    if (this.terminal === 'defeat') this.started -= seekerDuration('defeat');
  }
  reset(now: number): void { this.terminal = null; this.queue = []; this.begin('idle', now); }
}

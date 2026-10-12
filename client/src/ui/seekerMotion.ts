/** One static portrait and one authored impact pose; no idle animation. */
export const SEEKER_ID = 'SEEKER_HOODED';
export const SEEKER_ACTIONS = ['idle', 'hurt'] as const;
export type SeekerAction = typeof SEEKER_ACTIONS[number];
export const SEEKER_SIZE = 512;
export const SEEKER_ROOT = '/art/seekers/faceless-v1';
export const SEEKER_HIT_MS = 220;
export const seekerPoster = () => `${SEEKER_ROOT}/portrait.webp`;
export const seekerAtlas = () => `${SEEKER_ROOT}/poses.webp`;
export const damageAction = (amount: number): SeekerAction | null => amount > 0 ? 'hurt' : null;
export class SeekerMotion {
  private hitUntil = 0;
  constructor(_now = 0) {}
  request(action: SeekerAction, now: number): void { this.hitUntil = action === 'hurt' ? now + SEEKER_HIT_MS : 0; }
  sample(now: number): {action: SeekerAction; frame: number} {
    return now < this.hitUntil ? {action: 'hurt', frame: 1} : {action: 'idle', frame: 0};
  }
  reset(_now = 0): void { this.hitUntil = 0; }
}

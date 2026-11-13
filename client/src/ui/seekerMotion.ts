/** The adopted shoulder recoil has 41 poses on an eight-column atlas. */
export const SEEKER_ID = 'SEEKER_HOODED';
export const SEEKER_ACTIONS = ['idle', 'hurt'] as const;
export type SeekerAction = typeof SEEKER_ACTIONS[number];
export const SEEKER_SIZE = 512;
export const SEEKER_ROOT = '/art/seekers/faceless-v2';
export const SEEKER_HIT_MS = 800;
export const seekerPoster = () => `${SEEKER_ROOT}/portrait.webp`;
export const seekerAtlas = () => `${SEEKER_ROOT}/poses.webp`;
export const seekerRecoil = () => `${SEEKER_ROOT}/recoil-a.webp`;
export const seekerManaCrest = () => SEEKER_ROOT + '/mana-crest.webp';
export const seekerHealRise = () => SEEKER_ROOT + '/heal-rise.webp';
export const damageAction = (amount: number): SeekerAction | null => amount > 0 ? 'hurt' : null;
export class SeekerMotion {
  private elapsed = 0;
  private from = 0;
  private previousTime: number | null = null;
  private frame = 0;
  request(action: SeekerAction, now: number): void {
    if (action === 'idle') { this.reset(); return; }
    this.from = this.frame;
    this.elapsed = 0;
    this.previousTime = now;
  }
  sample(now: number): {action: SeekerAction; frame: number} {
    if (this.previousTime !== null) {
      // Bound the step so that a costly board redraw cannot skip the impact.
      this.elapsed += Math.max(0, Math.min(32, now - this.previousTime)) / (SEEKER_HIT_MS / 40);
      this.previousTime = now;
      const peak = 7;
      const pickup = Math.min(5, Math.max(0, this.from - peak));
      const position = this.elapsed < pickup
        ? this.from + (peak - this.from) * this.elapsed / pickup
        : (pickup ? peak - pickup : this.from) + this.elapsed;
      this.frame = Math.round(position);
      if (this.frame < 40) return {action:'hurt', frame:this.frame};
      this.reset();
    }
    return {action:'idle', frame:0};
  }
  reset(): void { this.previousTime = null; this.frame = 0; }
}

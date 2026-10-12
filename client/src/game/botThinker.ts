import { safeGreedy, legalBotAction } from '../shared/bot';
import { observationSample } from '../shared/botObservation';
import type { BotDifficulty } from '../shared/bot';
import type { Action, GameState } from '../shared/types';

/** One cancellable background decision per controller; leaving a duel terminates work. */
export class BotThinker {
  private worker: Worker | null = null;
  private serial = 0;
  private pending: { id: number; resolve: (a: Action | null) => void; timer: ReturnType<typeof setTimeout> } | null = null;
  private dead = false;
  private unavailable = false;

  constructor() { this.start(); }

  private start(): void {
    if (this.dead || this.unavailable || this.worker) return;
    try {
      this.worker = new Worker(new URL('./bot.worker.ts', import.meta.url), { type: 'module' });
      this.worker.onmessage = (event: MessageEvent<{ id: number; action?: Action; error?: string }>) => {
        const p = this.pending;
        if (!p || event.data.id !== p.id) return;
        clearTimeout(p.timer); this.pending = null;
        p.resolve(event.data.action ?? null);
      };
      this.worker.onerror = () => { this.unavailable = true; this.cancel(); };
    } catch { this.worker = null; this.unavailable = true; }
  }

  async decide(state: GameState, difficulty: BotDifficulty): Promise<Action | null> {
    if (this.dead) return null;
    this.start();
    if (!this.worker) return legalBotAction(state, safeGreedy(observationSample(state, state.pending?.owner ?? state.cur, 0)));
    // Only the most recent request can apply an action.
    if (this.pending) this.finish(null);
    const id = ++this.serial;
    return new Promise(resolve => {
      const timer = setTimeout(() => { this.cancel(); }, 15000);
      this.pending = { id, resolve, timer };
      try { this.worker!.postMessage({ id, state, difficulty }); }
      catch { this.unavailable = true; this.cancel(); }
    });
  }

  private finish(action: Action | null): void {
    if (!this.pending) return;
    clearTimeout(this.pending.timer);
    this.pending.resolve(action); this.pending = null;
  }
  private cancel(): void { this.worker?.terminate(); this.worker = null; this.finish(null); }
  destroy(): void { this.dead = true; this.cancel(); }
}

import { safeGreedy, legalBotAction } from '../shared/bot';
import { observationSample } from '../shared/botObservation';
import type { BotDifficulty } from '../shared/bot';
import type { Action, GameState } from '../shared/types';

/** One cancellable background decision per controller; leaving a duel terminates work. */
export class BotThinker {
  private worker: Worker | null = null;
  private serial = 0;
  private pending: { id: number; resolve: (a: Action | null) => void; timer: ReturnType<typeof setTimeout>; best?: Action } | null = null;
  private dead = false;
  private unavailable = false;

  constructor() { this.start(); }

  private start(): void {
    if (this.dead || this.unavailable || this.worker) return;
    try {
      const worker = this.worker = new Worker(new URL('./bot.worker.ts', import.meta.url), { type: 'module' });
      this.worker.onmessage = (event: MessageEvent<{ id: number; action?: Action; error?: string; progress?: boolean }>) => {
        const p = this.pending;
        if (this.worker !== worker || !p || event.data.id !== p.id) return;
        if (event.data.progress) { if (event.data.action) p.best = event.data.action; return; }
        clearTimeout(p.timer); this.pending = null;
        p.resolve(event.data.action ?? p.best ?? null);
      };
      this.worker.onerror = event => { event.preventDefault(); if (this.worker !== worker) return; this.unavailable = true; this.cancel(this.pending?.best); };
      this.worker.onmessageerror = () => { if (this.worker !== worker) return; this.unavailable = true; this.cancel(this.pending?.best); };
    } catch { this.worker = null; this.unavailable = true; }
  }

  async decide(state: GameState, difficulty: BotDifficulty): Promise<Action | null> {
    if (this.dead) return null;
    // Terminate superseded computation rather than queueing another expensive search.
    if (this.pending) this.cancel();
    this.start();
    if (!this.worker) return legalBotAction(state, safeGreedy(observationSample(state, state.pending?.owner ?? state.cur, 0)));
    // Only the most recent request can apply an action.
    const id = ++this.serial;
    return new Promise(resolve => {
      const timer = setTimeout(() => { this.cancel(this.pending?.best); }, 15000);
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
  private cancel(best?: Action): void { this.worker?.terminate(); this.worker = null; this.finish(best ?? null); }
  destroy(): void { this.dead = true; this.cancel(); }
}

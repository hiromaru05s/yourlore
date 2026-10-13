import { botDecide } from '../shared/bot';
import type { BotDifficulty } from '../shared/bot';
import type { GameState } from '../shared/types';

self.onmessage = (event: MessageEvent<{ id: number; state: GameState; difficulty: BotDifficulty }>) => {
  const { id, state, difficulty } = event.data;
  try { self.postMessage({ id, action: botDecide(state, difficulty, action => self.postMessage({ id, action, progress: true })) }); }
  catch (error) { self.postMessage({ id, error: String(error) }); }
};

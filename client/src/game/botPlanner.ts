import { BotThinker } from './botThinker';
import type {Action,GameState} from '../shared/types';
import type {BotDifficulty} from '../shared/bot';
export interface BotRequest{id:number;state:GameState;difficulty:BotDifficulty;}
export interface BotReply{id:number;action?:Action;error?:boolean;}
/** Compatibility facade for callers introduced before BotThinker. Both paths
 * share cancellation, bounded waiting and the fast legal fallback. */
export class BotPlanner {
 private readonly thinker = new BotThinker();
 async decide(state: GameState, difficulty: BotDifficulty): Promise<Action | undefined> {
  return (await this.thinker.decide(state, difficulty)) ?? undefined;
 }
 dispose(): void { this.thinker.destroy(); }
}

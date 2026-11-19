import type {TierKey} from './rank';
/** Public presentation snapshot captured at room creation, never achievement progress. */
export interface DuelProfile {
 level?:number|null;
 rating?:{mmr:number;tier:TierKey}|null;
}

// Phase A: fresh production namespaces; legacy objects can only retire data.
export { default } from './index';
export { Matchmaker as MatchmakerFresh20261027 } from './matchmaker';
export { GameRoom as GameRoomFresh20261027 } from './gameRoom';
import { RetiredUserData } from './retiredUserData';
export class MatchmakerLive extends RetiredUserData {}
export class GameRoomLive extends RetiredUserData {}

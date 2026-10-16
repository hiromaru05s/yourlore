// Production's 2026-10-16 fresh start uses new namespaces. The implementation
// stays shared with staging. Legacy exports remain until phase 2 deletes them.
export { default } from './index';
export { Matchmaker as MatchmakerLive } from './matchmaker';
export { GameRoom as GameRoomLive } from './gameRoom';
export { Matchmaker } from './matchmaker';
export { GameRoom } from './gameRoom';

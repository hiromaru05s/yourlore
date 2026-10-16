// Production's 2026-10-16 fresh start uses new namespaces. The implementation
// stays shared with staging; legacy class exports must not survive deletion.
export { default } from './index';
export { Matchmaker as MatchmakerLive } from './matchmaker';
export { GameRoom as GameRoomLive } from './gameRoom';

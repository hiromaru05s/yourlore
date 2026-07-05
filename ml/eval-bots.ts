// Bot-vs-bot evaluator.
//
// Usage:
//   npx esbuild ml/eval-bots.ts --bundle --platform=node --format=cjs --outfile=/tmp/lore-eval-bots.cjs
//   node /tmp/lore-eval-bots.cjs 10000 hell hard
import { createGame, reduce } from "../client/src/shared/engine";
import { botDecide, type BotDifficulty } from "../client/src/shared/bot";
import type { GameState, Side } from "../client/src/shared/types";

const GAMES = Number(process.argv[2] ?? 1000);
const A = (process.argv[3] ?? "hell") as BotDifficulty;
const B = (process.argv[4] ?? "hard") as BotDifficulty;
const MAX_STEPS = Number(process.argv[5] ?? 20000);
const OFFSET = Number(process.argv[6] ?? 0);

let rs = (0xdecafbad ^ Math.imul(OFFSET + 1, 0x9e3779b9)) >>> 0;
Math.random = (): number => {
  rs ^= rs << 13;
  rs ^= rs >>> 17;
  rs ^= rs << 5;
  rs >>>= 0;
  return rs / 4294967296;
};

function playGame(i: number): Side | null {
  const gameNo = OFFSET + i;
  const aSide = (gameNo % 2) as Side;
  const st0 = createGame({
    seed: 900000 + gameNo,
    mode: "bot",
    starting: (gameNo % 2) as Side,
    p0: { id: "P0", name: aSide === 0 ? A : B, isBot: true },
    p1: { id: "P1", name: aSide === 1 ? A : B, isBot: true },
  }).state;
  let st: GameState = st0;
  let guard = 0;
  while (!st.over && guard < MAX_STEPS) {
    const diff = st.cur === aSide ? A : B;
    st = reduce(st, botDecide(st, diff)).state;
    guard++;
  }
  if (!st.over) return null;
  return st.winner === aSide ? 0 : 1;
}

let aWins = 0;
let bWins = 0;
let draws = 0;
const t0 = Date.now();
for (let i = 0; i < GAMES; i++) {
  const winner = playGame(i);
  if (winner === 0) aWins++;
  else if (winner === 1) bWins++;
  else draws++;
  if ((i + 1) % 250 === 0 || i + 1 === GAMES) {
    const decided = aWins + bWins;
    const wr = decided > 0 ? (aWins / decided) * 100 : 0;
    const sec = ((Date.now() - t0) / 1000).toFixed(1);
    console.error(`${i + 1}/${GAMES} ${A}=${aWins} ${B}=${bWins} draws=${draws} winrate=${wr.toFixed(2)}% elapsed=${sec}s`);
  }
}

const decided = aWins + bWins;
const p = decided > 0 ? aWins / decided : 0;
const se = decided > 0 ? Math.sqrt((p * (1 - p)) / decided) : 0;
console.log(JSON.stringify({
  games: GAMES,
  decided,
  draws,
  [A]: aWins,
  [B]: bWins,
  winrate: p,
  ci95: [p - 1.96 * se, p + 1.96 * se],
  offset: OFFSET,
}, null, 2));

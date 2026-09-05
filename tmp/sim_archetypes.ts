/* eslint-disable */
import { DB } from "../client/src/shared/cards";
import { createGame, reduce } from "../client/src/shared/engine";
import { greedyDecide } from "../client/src/shared/bot";
import type { GameState, CardInst } from "../client/src/shared/types";
const ARCH: Record<string, { start?: string[]; add: string[] }> = {
  baseline: { add: [] },
  golem: { add: ["GOLEM1", "GOLEM2", "M10", "NWL3", "NGA3", "MANA_GIANT", "GOLEM3", "AEM", "KNIGHT_TEACH"] },
  castle: { start: ["CASTLE", "STARTER_TRASH", "STARTER_TRASH", "STARTER_TRASH", "STARTER_CHEST", "STARTER_CHEST", "STARTER_TRASH", "STARTER_TRASH"], add: ["BUDGET", "LEVY", "EXPANSION", "HORDE", "ELITE", "M11", "GM6_7", "WAR_DECL", "VITAL4"] },
  assassin: { start: ["GUILD_HALL", "STARTER_TRASH", "STARTER_TRASH", "STARTER_TRASH", "STARTER_CHEST", "STARTER_CHEST", "STARTER_TRASH", "STARTER_TRASH"], add: ["ASSASSIN1", "ASSASSIN2", "ASSASSIN3", "GUILD_HQ", "NL_SECRET", "ASSASSIN4", "GUILD_CHEST"] },
  origin: { add: ["TGE1", "TGE2", "TGE3", "TGE4", "TGE5", "TGE6", "TGE7", "GENESIS_SONG", "GENESIS_MAGIC"] },
  elf: { start: ["ELF_HAVEN", "HALF_ELF", "HALF_ELF", "STARTER_TRASH", "STARTER_TRASH", "STARTER_TRASH", "STARTER_CHEST", "STARTER_CHEST"], add: ["VITAL2", "VITAL3", "ELF", "DARK_ELF", "WORLD_SEED", "LIFE_SANCTUM", "HIGH_ELF", "WORLD_BLESS"] },
  vampire: { add: ["VAMP_PACT", "VAMP_BUTLER", "BLOOD1", "BLOOD_JOY", "BLOOD_FEST", "BLOOD_SHIELD", "VAMP_PACT2", "BLOOD_ANGER"] },
  mimic: { start: ["MIMIC_PARTY", "STARTER_CHEST", "STARTER_CHEST", "STARTER_CHEST", "STARTER_TRASH", "STARTER_TRASH", "STARTER_TRASH", "DUNGEON_FLOOR"], add: ["MIMIC_LORD", "AWAKENED_MIMIC", "MIMIC_KING", "GEM_RAIN", "GREED_PRICE", "MIMIC_LAIR", "LUCKY_CHEST"] },
  decay: { start: ["RUST_SHROOM", "RUST_SHROOM", "ACID_RAIN", "STARTER_TRASH", "STARTER_TRASH", "STARTER_CHEST", "STARTER_CHEST", "STARTER_TRASH"], add: ["RUST_SLUG", "DECAY_CRAFT", "STRONG_ACID", "ROTTEN_GROUND", "T8", "RUST_SLUG"] },
  cull: { start: ["TRIAL_AREA", "CHOSEN_AREA", "STARTER_TRASH", "STARTER_TRASH", "STARTER_TRASH", "STARTER_TRASH", "STARTER_TRASH", "STARTER_TRASH"], add: ["CULL_FLOOD", "CROSSROADS", "CHOSEN_KNIGHT", "CHOSEN_MAGE", "CHOSEN_ARCHER", "EXILE_NUKE1", "FURNACE", "PURGE_TOUCH"] },
  solitary: { add: ["TSO1", "TSO2", "TSO3", "TSO5", "TSO2", "TSO3"] },
  devour: { add: ["TPO1", "TPO2", "TPO3", "TPO5", "TPO2", "TPO3"] },
  aristocrat: { add: ["TAR1", "TAR2", "TAR3", "TAR5", "LAND_GRANT", "TAR2", "TAR3"] },
  demon: { add: ["TDE1", "TDE2", "TDE3", "TDE4", "DEMON_REALM", "TDE2", "TDE3"] },
  gambler: { start: ["GAMBLER", "GAMBLER", "CASINO", "FATE_WHEEL", "STARTER_TRASH", "STARTER_TRASH", "STARTER_CHEST", "STARTER_CHEST"], add: ["LEGEND_GAMBLER", "GAMBLE", "ND3", "LUCKY_CHEST"] },
  egg: { start: ["ANCIENT_CIV", "INCUBATOR_S", "INCUBATOR_S", "STARTER_TRASH", "STARTER_TRASH", "STARTER_TRASH", "STARTER_CHEST", "STARTER_CHEST"], add: ["DRAGON_EGG", "EGG_MASTER", "INCUBATOR", "BEAST_EGG", "EGG_MASTER"] },
  trap: { start: ["COLLUSION", "MIMIC_PARTY", "STARTER_TRASH", "STARTER_TRASH", "STARTER_TRASH", "STARTER_CHEST", "STARTER_CHEST", "STARTER_TRASH"], add: ["NT_SNARE", "T2", "T9", "T12", "T13", "T4", "TRAPSMITH", "GT5_1", "T3"] },
  burn: { start: ["FLAME", "FLAME", "AMBUSH", "GHOST", "GHOST", "STARTER_TRASH", "STARTER_CHEST", "STARTER_CHEST"], add: ["S13", "S1", "AHEUK", "GS6_4", "EXILE_NUKE1", "TIMEWARP", "S13"] },
  merchant: { start: ["GUILD_CO", "SLUM", "GRAPE", "GRAPE", "BREWING", "STARTER_TRASH", "STARTER_CHEST", "STARTER_CHEST"], add: ["MERCH1", "MERCH2", "GRAPE2", "MERCH1"] },
};
const names = Object.keys(ARCH);
for (const n of names) for (const id of [...(ARCH[n].start ?? []), ...ARCH[n].add]) if (!DB[id] && !id.startsWith("STARTER")) console.log("missing", n, id);
let uid = 0;
const inject = (g: GameState, s: 0 | 1, ids: string[]) => { const p = g.players[s]; for (const id of ids) if (DB[id]) p.deck.push({ uid: "inj" + (++uid), ...structuredClone(DB[id]) } as CardInst); for (let i = p.deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [p.deck[i], p.deck[j]] = [p.deck[j], p.deck[i]]; } };
const wins: Record<string, number> = {}, games: Record<string, number> = {}, turnsSum: Record<string, number> = {};
const N = 20;
const SHARD = Number(process.argv[2] || 0), SHARDS = Number(process.argv[3] || 1);
let pairIdx = 0;
const out: string[] = [];
for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) {
  const A = names[i], B = names[j];
  if ((pairIdx++) % SHARDS !== SHARD) continue;
  for (let k = 0; k < N; k++) {
    const aFirst = k % 2 === 0; const seed = 1000 + i * 100000 + j * 1000 + k;
    const p0 = aFirst ? A : B, p1 = aFirst ? B : A;
    let g = createGame({ seed, mode: "bot", starting: 0, p0: { id: "a", name: p0, isBot: true, deck: ARCH[p0].start }, p1: { id: "b", name: p1, isBot: true, deck: ARCH[p1].start } } as never).state;
    inject(g, 0, ARCH[p0].add); inject(g, 1, ARCH[p1].add);
    let steps = 0, last = "", rep = 0;
    while (!g.over && steps < 3000) { const a = greedyDecide(g); const key = JSON.stringify(a); if (key === last) rep++; else { rep = 0; last = key; } g = reduce(g, rep > 20 ? { type: "endTurn" } : a).state; steps++; }
    games[A] = (games[A] || 0) + 1; games[B] = (games[B] || 0) + 1;
    const w = g.winner == null ? null : (g.winner === 0 ? p0 : p1);
    if (w) wins[w] = (wins[w] || 0) + 1;
    out.push(`${A}\t${B}\t${w ?? "-"}\t${g.turn}`);
    turnsSum[A] = (turnsSum[A] || 0) + g.turn; turnsSum[B] = (turnsSum[B] || 0) + g.turn;
  }
}
require("fs").writeFileSync(`/private/tmp/claude-501/-Users-hiromaru05s-Desktop-LORE-TCG/72f5dd62-87ca-476a-95fe-7322269e640d/scratchpad/arch_${SHARD}.tsv`, out.join("\n") + "\n");
const rows = names.map((n) => ({ n, wr: (wins[n] || 0) / games[n], t: turnsSum[n] / games[n] })).sort((a, b) => a.wr - b.wr);
for (const r of rows) console.log(r.n.padEnd(11), (r.wr * 100).toFixed(1).padStart(5) + "%", "avg turn", r.t.toFixed(1));

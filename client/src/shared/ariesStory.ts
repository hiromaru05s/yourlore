import type { BotDifficulty } from './bot';
import type { PlayerState } from './types';

export type AriesStage = 0 | 1 | 2;
export interface StoryOpponent {
  stage: AriesStage;
  avatar: string;
  name: Record<'ja'|'en'|'ko', string>;
  title: Record<'ja'|'en'|'ko', string>;
  deck: string[];
  difficulty: BotDifficulty;
  tune: PlayerState['botTune'];
}

const elites = ['ELITE_GOBLIN', 'ELITE_GOBLIN', 'ELITE_GOBLIN'];
const eliteAggroTune: PlayerState['botTune'] = { minBuyEarly: 4, minBuy: 8, chestTurn: 4 };
export const ARIES_OPPONENTS: Record<AriesStage, StoryOpponent> = {
  0: { stage: 0, avatar: 'STORY_SHION', name: {ja:'火走りのシオン',en:'Shion, the Quickstep',ko:'불걸음 시온'}, title: {ja:'先遣シーカー',en:'Pathfinder Seeker',ko:'선봉 시커'}, deck: [...elites, 'TRUMPET','TRUMPET','COUNTERCALC','WEAKEN_ALL','STARTER_TRASH'], difficulty:'hell', tune:eliteAggroTune },
  1: { stage: 1, avatar: 'STORY_RENA', name: {ja:'紅刃のレナ',en:'Rena, the Red Edge',ko:'붉은 칼날 레나'}, title: {ja:'先遣シーカー',en:'Pathfinder Seeker',ko:'선봉 시커'}, deck: [...elites, 'FLAME','FLAME','WEAKEN_ALL','COUNTERCALC','STARTER_TRASH'], difficulty:'hell', tune:eliteAggroTune },
  2: { stage: 2, avatar: 'STORY_ARIES', name: {ja:'Aries',en:'Aries',ko:'Aries'}, title: {ja:'マスターシーカー · 神速アグロ',en:'Master Seeker · Flash Aggro',ko:'마스터 시커 · 신속 어그로'}, deck: ['ELITE_GOBLIN','ELITE_GOBLIN','ELITE_GOBLIN','GOBLIN_ORIGIN','GOBLIN_PARTY','FORGE','ICARUS_SHOES','ICARUS_WINGS'], difficulty:'hell', tune:eliteAggroTune },
};

export const ARIES_COMPLETED_KEY = 'lore.story.aries.cleared.v1';
export const ARIES_STARTER_NAMES: Record<'ja'|'en'|'ko', string[]> = {
  ja:['アチューン','精鋭ゴブリン ×3','ゴブリンの起源','ゴブリンパーティー','ゴブリン鍛冶屋','イカロスの靴','イカロスの翼'],
  en:['Attune','Elite Goblin ×3','Goblin Origin','Goblin Party','Goblin Forge','Icarus’s Shoes','Icarus’s Wings'],
  ko:['어튠','정예 고블린 ×3','고블린의 기원','고블린 파티','고블린 대장간','이카로스의 신발','이카로스의 날개'],
};

export function ariesRoomStage(roomId: string): AriesStage | undefined {
  const match = /^aries-[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}-([012])$/.exec(roomId);
  return match ? Number(match[1]) as AriesStage : undefined;
}

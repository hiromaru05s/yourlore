import type { CardInst, FieldMon, GameState, Side } from './types';
import { hasPassive } from './cards';
import { curHp, effAtk, effDef, CUSTOM_SPELLS, isAssassinCard, isGolem, isKnight, isVampFamily } from './engine';

/** Public, deterministic choices only. Never run effects to discover a cast's targets. */
export interface PlayIntent {
  reason: string;
  pool: CardInst[];
  min: number;
  max: number;
}
export function playIntent(g: GameState, owner: Side, c: CardInst): PlayIntent | null {
  if (c.t !== 'spell' || c.ench || c.quick) return null;
  const p = g.players[owner], o = g.players[1-owner];
  const enemy = o.field.filter(m => !hasPassive(m, 'aura'));
  const plan = (reason: string, pool: CardInst[], max = 1, min = 1): PlayIntent =>
    ({ reason, pool, min: pool.length ? Math.min(min, pool.length) : min > 0 ? 1 : 0, max: Math.min(max, pool.length) });
  const board = (traps: boolean, enchants: boolean) => [
    ...(traps ? o.traps.map(t => ({ uid: t.card.uid, id: 'HIDDEN', t: 'trap' as const, cost: 0, name: '?', text: '?' })) : []),
    ...(enchants ? o.enchants.map(e => e.card) : []),
    ...(traps ? p.traps.map(t => t.card) : []),
    ...(enchants ? p.enchants.map(e => e.card) : []),
  ];
  switch (c.id) {
    // These IDs override their legacy act with automatic target rules.
    case 'WALLBREAK1': case 'SNIPE1': return null;
    case 'SELECTED_SWORD': return plan(c.id, [...p.field, ...enemy]);
    case 'TRUMPET': return plan('buffTurn', p.field, 3, 0);
    case 'AEM': return plan('golemBuff', p.field.filter(isGolem), 2, 2);
    case 'NL_SECRET': return plan('nlTarget', p.field);
    case 'MAJESTY_RITE': return plan('grantMajesty', p.field.filter(m => !hasPassive(m, 'majesty')));
    case 'BLOOD_SECRET': return plan('bloodSecret', p.field.filter(isVampFamily));
    case 'BLOOD2': return plan('bloodShower', board(true, true), 2, 0);
    case 'STABLE': return plan(c.id, p.field.filter(isKnight));
    case 'ROGUE_ART': return p.field.some(isAssassinCard) ? null : plan(c.id, p.field);
    case 'FIRE_ZONE': return plan(c.id, p.hand.filter(h => h.uid !== c.uid && !hasPassive(h, 'relic')));
    case 'FIRE_BALL': return plan(c.id, [
      ...g.players.map((pl, i) => ({ ...c, uid: `player-${i}`, name: pl.name, nameJa: pl.name, nameEn: pl.name })),
      ...p.field, ...enemy,
    ]);
  }
  if (CUSTOM_SPELLS.has(c.id)) return null;
  switch (c.act) {
    case 'buffTurn': case 'buffPerm': return plan(c.act, p.field.filter(m => c.id !== 'S3' || !m.tribe));
    case 'destroyMon': return plan(c.act, [...enemy, ...p.field].filter(m => !c.cap || m.cost <= c.cap), c.val || 1, 0);
    case 'weaken': return plan(c.act, enemy);
    case 'destroyTrap': return (c.val ?? 0) < 99 ? plan(c.act, board(true, false), c.val || 1, 0) : null;
    case 'destroyEnch': return plan(c.act, board(false, true), c.val || 1, 0);
    case 'seek': return plan(c.act, [...p.deck].sort((a,b) => a.cost-b.cost || a.id.localeCompare(b.id) || a.uid.localeCompare(b.uid)), 1, 0);
    case 'recall': return plan(c.act, p.discard.filter(h => h.uid !== c.uid), 1, 0);
    case 'exilePick': return plan(c.act, p.discard.filter(h => !hasPassive(h,'relic')), 1, 0);
    case 'incubate': return plan(c.act, p.field.filter(m => m.hatch != null), 1, 0);
    default: return null;
  }
}

/** Choices following draws, random results, summons or quest completion stay after
 * resolution. Review these casts first; cancelling that later choice is not a refund. */
export const FOLLOWUP_CASTS = new Set([
  'DECAY_CRAFT', 'REFRESH_HAND', 'FOCUS', 'CULL_FLOOD', 'PURGE_ALL',
  'LAND_GRANT', 'DARK_MERCHANT', 'GS8_0', 'CREATION',
]);

/** Explicit rule metadata, not text parsing. These can hurt the caster/board or
 * benefit the opponent even when they have no selectable target. */
export const RISKY_CASTS = new Set([
  'WALLBREAK1','WALLBREAK2','SNIPE1','SNIPE2','BLOOD1','BLOOD2','BLOOD_JOY',
  'BLOOD_ANGER','BLOOD_SORROW','BLOOD_PLEASURE','BLOOD_SECRET','VAMP_PACT','VAMP_PACT2',
  'FLAME','AMBUSH','SHATTER','CATALYST','FORBIDDEN','BLACK_NOVA','FIRE_BALL','FIRE_ARROW',
  'FIRE_METEOR','EARTHQUAKE','TRICKROOM','HANDRESET','NEGOTIATE','UNBRAND','S14',
  'DUNGEON_FLOOR','MASSACRE','MAJESTY_RITE','STABLE','MAGMA_RAIN','CURSE',
  'VOID_RITE','NHEAL','INFERNO','GLASS_BAN','MEDITATE','LUCKY_CHEST','GUILD_CHEST',
  'STARTER_CHEST','VOID_APOSTLE','GM6_0','WINE_COLLECTOR',
]);
export function needsCastReview(g: GameState, owner: Side, c: CardInst): boolean {
  if (playIntent(g, owner, c) || FOLLOWUP_CASTS.has(c.id) || RISKY_CASTS.has(c.id)) return true;
  if(c.onSummon==='selfBurn')return true;
  if(c.act==='cullShield' && !(g.players[owner].removed??[]).some(c=>c.star==='trash'))return true;
  if (c.t !== 'spell') return false;
  return ['trialArea','lawless','weakenAll','demonWorld'].includes(c.ench ?? '')
    || ['blackReverse','brandMagic','hexCurseOnSpell','hexBoss'].some(fx =>
      g.players.some(p => p.field.some(m => m.aura === fx) || p.enchants.some(e => e.card.ench === fx)));
}

export function targetOwner(g: GameState, uid: string): Side | null {
  if (uid === 'player-0') return 0;
  if (uid === 'player-1') return 1;
  for (const s of [0,1] as Side[]) {
    const p=g.players[s];
    if ([...p.field,...p.hand,...p.deck,...p.discard,...(p.removed??[]),...p.enchants.map(e=>e.card),...p.traps.map(t=>t.card)].some(c=>c.uid===uid)) return s;
  }
  return null;
}

/** Show the exact publicly determined victim before an automatic removal cast. */
export function automaticCastTargets(g: GameState, owner: Side, c: CardInst): CardInst[] {
  if(!['WALLBREAK1','SNIPE1','WALLBREAK2','SNIPE2'].includes(c.id))return [];
  const all=c.id==='WALLBREAK2'||c.id==='SNIPE2';
  const p=g.players[owner],o=g.players[1-owner];
  const candidates: {m:FieldMon;p:typeof p}[]=[];
  for(const pl of [o,p])for(const m of pl.field){
    if(!all&&pl!==p&&hasPassive(m,'aura'))continue;
    if(c.id.startsWith('WALLBREAK')?effAtk(pl,m,g)<=2:curHp(pl,m)<=(all?2:3))candidates.push({m,p:pl});
  }
  if(all)return candidates.map(x=>x.m);
  return candidates.sort((a,b)=>effAtk(b.p,b.m,g)+effDef(b.p,b.m)-effAtk(a.p,a.m,g)-effDef(a.p,a.m)).slice(0,1).map(x=>x.m);
}

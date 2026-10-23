import type { CardDef, FieldMon, GameState, PlayerState } from './types';
import { hasPassive } from './cards';
import { curHp, effAtk, effDef, effMaxMana } from './engine';

/** Printed bodies are not attack power once a public lock is in play. */
export function enteringAttack(g: GameState, p: PlayerState, c: CardDef): number {
  const swapped = (g.trickLeft ?? 0) > 0;
  const suppression = g.players.reduce((n,q)=>n+q.enchants.filter(e=>e.card.ench==='weakenAll').length,0);
  const m: FieldMon = {...c,uid:'estimate',atk:swapped?c.def:c.atk,def:swapped?c.atk:c.def,
    atkMod:-2*suppression,defMod:0,dmg:0,tempAtk:0,exhausted:false,summonedTurn:g.turn};
  return Math.max(0,effAtk({...p,field:[...p.field,m]},m,g));
}

export function removalHits(g: GameState, owner: PlayerState, c: CardDef, m: CardDef): boolean {
  if (m.t!=='mon' || c.act!=='destroyMon') return false;
  const sweep=c.id==='WALLBREAK2'||c.id==='SNIPE2';
  if(hasPassive(m,'aura')&&!sweep)return false;
  const field = 'uid' in m && owner.field.some(x=>x.uid===(m as FieldMon).uid);
  const atk = field ? effAtk(owner,m as FieldMon,g) : enteringAttack(g,owner,m);
  const hp = field ? curHp(owner,m as FieldMon) : m.def??0;
  if (field && (c.id==='WALLBREAK1'||c.id==='SNIPE1')) {
    const caster=g.players[owner===g.players[0]?1:0];
    const candidates=[owner,caster].flatMap(p=>p.field.filter(x=>(p===caster||!hasPassive(x,'aura'))
      && (c.id==='WALLBREAK1'?effAtk(p,x,g)<=2:curHp(p,x)<=3)).map(x=>({p,x})));
    candidates.sort((a,b)=>(effAtk(b.p,b.x,g)+effDef(b.p,b.x))-(effAtk(a.p,a.x,g)+effDef(a.p,a.x)));
    return candidates[0]?.x.uid===(m as FieldMon).uid;
  }
  return (!c.cap || m.cost<=c.cap) && (c.id!=='RUNE1'||m.cost>=5)
    && (!c.id.startsWith('WALLBREAK')||atk<=2)
    && (!c.id.startsWith('SNIPE')||hp<=(c.id==='SNIPE1'?3:2));
}

/** A counter market is an option, not evidence of an unseen hand. */
export function matchupPlan(g: GameState, p: PlayerState, known: CardDef[]) {
  const o=g.players[p===g.players[0]?1:0];
  const own=[...p.hand,...p.deck,...p.discard,...p.field];
  const small=own.filter(c=>c.t==='mon'&&(c.atk??0)<=2).length;
  const all=own.filter(c=>c.t==='mon').length;
  const suppression=g.players.reduce((n,q)=>n+q.enchants.filter(e=>e.card.ench==='weakenAll').length,0);
  const stopped=p.field.filter(m=>(m.atk??0)>0&&effAtk(p,m,g)<=0).length;
  const blocked=stopped>0 || (suppression>0 && small>0);
  const offers=g.market.filter((c,i)=>(g.marketStock?.[i]??3)>0&&c.cost<=effMaxMana(o)+2);
  const walls=o.field.filter(m=>m.hatch==null&&(curHp(o,m)>=7||m.aura==='gutsOnHit'||m.aura==='eliteGuard'));
  const wallRisk=Math.max(walls.length?1:0,
    known.some(c=>c.t==='mon'&&((c.def??0)>=7||c.aura==='gutsOnHit'))?.7:0,
    offers.some(c=>c.t==='mon'&&((c.def??0)>=7||c.aura==='gutsOnHit'))?.45:0);
  const suppressRisk=suppression?1:known.some(c=>c.ench==='weakenAll')?.7:0;
  return {o,own,small,all,suppression,stopped,blocked,walls,wallRisk,suppressRisk,offers};
}

/** Value of an actual blocker against this board, including finite guts and
 * decay progress. It is never treated as an immortal wall or as extra HP. */
export function resilience(g: GameState, p: PlayerState, m: FieldMon): number {
  const o=g.players[p===g.players[0]?1:0];
  const attackers=o.field.filter(x=>effAtk(o,x,g)>0&&!x.directOnly);
  const decay=attackers.filter(x=>hasPassive(x,'decay')).length;
  const guts=Math.max(0,m.guts??0);
  const hits=attackers.length || 2;
  let value=Math.min(guts,hits+1)*2.5;
  if (m.aura==='gutsOnHit' && attackers.some(x=>effAtk(o,x,g)<curHp(p,m))) value+=3;
  if ((m.decayCnt??0)>0 && decay) value-=Math.min(10,(m.decayCnt??0)*3+decay);
  // Counterattack and high defensive walls make zero-ATK units useful blockers,
  // but cannot pretend that these units are advancing an attack plan.
  if (effAtk(p,m,g)<=0 && !m.turnFx && !m.aura) value-=1.5;
  if (m.aura==='eliteGuard') value+=Math.min(10,attackers.filter(x=>x.cost<=6).length*3);
  return value;
}

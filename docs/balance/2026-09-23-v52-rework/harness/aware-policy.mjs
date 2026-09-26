// Secondary diagnostic policy only. No game rules or rollout randomness are changed.
import {greedyDecide,candidates,playBlockReason,effAtk,effDef,hasPassive} from './core.bundle.mjs';
export function awareChoice(g,a){
 const p=g.players[g.cur],o=g.players[1-g.cur];
 if(g.pending?.kind==='oppMon'&&g.pending.reason==='attack'){
  const m=p.field.find(x=>x.uid===g.pending.data?.attackerUid);
  if(m?.id==='POISON_MASTER'){
   const target=o.field.filter(t=>t.hatch==null&&!(t.aura==='eliteGuard'&&m.cost<=6)).sort((x,y)=>(effAtk(o,y,g)*2+effDef(o,y))-(effAtk(o,x,g)*2+effDef(o,x)))[0];
   if(target)return {type:'chooseTarget',uid:target.uid};
  }
  return a;
 }
 if(g.pending)return a;
 const poison=p.field.find(m=>m.id==='POISON_MASTER'&&!m.exhausted&&!o.field.some(x=>hasPassive(x,'majesty')&&m.summonedTurn===g.turn));
 if(poison&&o.field.some(t=>t.hatch==null&&!(t.aura==='eliteGuard'&&poison.cost<=6))&&candidates(g).some(x=>x.type==='attack'&&x.uid===poison.uid))return {type:'attack',uid:poison.uid};
 const chosen=a.type==='play'?p.hand[a.idx]:null;
 if(chosen&&['DISCOVERY_SMALL','DISCOVERY','DISCOVERY_LARGE','PREPARATION'].includes(chosen.id)){
  const idx=p.hand.findIndex(c=>['EROSION','GROWTH'].includes(c.id)&&!playBlockReason(g,g.cur,c));if(idx>=0)return {type:'play',idx};
 }
 if(chosen&&['FIRE_BALL','FIRE_ARROW','FIRE_ZONE','FIRE_METEOR'].includes(chosen.id)){
  const idx=p.hand.findIndex(c=>c.id==='FIRE_ART'&&!playBlockReason(g,g.cur,c));if(idx>=0&&chosen.cost>1)return {type:'play',idx};
 }
 const reverse=g.players.some(pl=>pl.enchants.some(e=>e.card.ench==='blackReverse'));
 const selfBurn=reverse&&chosen&&['SOUL_HARVEST','FIRE_ARROW','FIRE_ZONE','FIRE_METEOR'].includes(chosen.id);
 const m=a.type==='attack'?p.field.find(x=>x.uid===a.uid):null;
 const selfAttack=reverse&&m&&(m.directOnly||!o.field.length);
 if(selfBurn||selfAttack){
  const view=structuredClone(g),vp=view.players[g.cur];
  // Mask known self-damaging choices from this diagnostic policy, without changing the engine state.
  for(const c of vp.hand)if(['SOUL_HARVEST','FIRE_ARROW','FIRE_ZONE','FIRE_METEOR'].includes(c.id)){c.cost=999;c.play=999;}
  for(const x of vp.field)if(x.directOnly||!o.field.length)x.exhausted=true;
  const alt=greedyDecide(view,false);if(alt.type==='play'&&playBlockReason(g,g.cur,p.hand[alt.idx]))return {type:'endTurn'};return alt;
 }
 return a;
}

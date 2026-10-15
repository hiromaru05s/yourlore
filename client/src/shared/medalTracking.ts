import type {Action, GameEvent, GameState, Side} from './types';
export interface MedalDuelStats { hpLost:number; attacks:number; summoned:number; destroyed:number; deficit:number; sixes:number; }
export interface MedalDuel { version:1; players:[MedalDuelStats,MedalDuelStats]; forfeited:boolean; special?:'chosen'|'origin'; }
export function newMedalDuel():MedalDuel {
 const fresh=():MedalDuelStats=>({hpLost:0,attacks:0,summoned:0,destroyed:0,deficit:0,sixes:0});
 return {version:1,players:[fresh(),fresh()],forfeited:false};
}
/** Lives inside engine snapshots: abandoned dice outcomes roll back along with the game. */
export function trackMedalDuel(before:GameState,after:GameState,events:GameEvent[],action:Action):void {
 const data=after.medalDuel;if(!data||before.over)return;
 if(action.type==='surrender')data.forfeited=true;
 const hp=before.players.map(p=>p.hp);
 const deficits=()=>{for(const s of [0,1] as Side[])data.players[s].deficit=Math.max(data.players[s].deficit,hp[1-s]-hp[s]);};
 deficits();
 for(const e of events){
  if(e.type==='damage'){data.players[e.player].hpLost+=Math.max(0,e.amount);hp[e.player]-=e.amount;}
  if(e.type==='nova'){data.players[e.player].hpLost+=Math.max(0,e.from-e.to);hp[e.player]=e.to;}
  if(e.type==='heal')hp[e.player]+=e.amount;
  if(e.type==='attack')data.players[e.player].attacks++;
  if(e.type==='summon')data.players[e.player].summoned++;
  if(e.type==='destroy')data.players[e.player].destroyed++;
  if(e.type==='dice')data.players[e.player].sixes+=e.rolls.filter(n=>n===6).length;
  deficits();
 }
 if(after.over&&after.winner!==null&&!data.forfeited&&after.players[1-after.winner].hp>0){
  if(events.some(e=>e.type==='tribeSynergy'&&e.player===after.winner&&e.tribe==='시초'&&e.threshold===6))data.special='origin';
  else if(events.some(e=>e.type==='playSpell'&&e.player===after.winner&&e.id==='CHOSEN_AREA'))data.special='chosen';
 }
}
/** Only server-settled PvP results call this; surrender/disconnect never grants feats. */
export function duelMedalMetrics(g:GameState,side:Side,effectiveMaxMana=g.players[side].maxMana):Record<string,number>{
 const d=g.medalDuel;if(!d)return{};
 const p=g.players[side],s=d.players[side],out:Record<string,number>={sixes:s.sixes};
 if(!g.over||g.winner!==side||d.forfeited)return out;
 out.perfect=Number(s.hpLost===0);
 out.speed=Number(g.turn<=7);
 out.special=Number(!!d.special);out.chosen=Number(d.special==='chosen');out.origin=Number(d.special==='origin');
 out.lastPoint=Number(p.hp===1);out.comeback=Number(s.deficit>=30);
 out.quiet=Number(s.attacks===0);out.survivors=Number(s.summoned>0&&s.destroyed===0);
 out.enemyTurn=Number(g.cur!==side);
 out.healing=Number((p.activity?.heal??0)>=50);out.decay=Number((p.activity?.decay??0)>=5);
 out.shopping=Number(Object.values(p.buys).reduce((a,b)=>a+b,0)>=10);
 out.mana=Number(effectiveMaxMana>=20);
 out.alliance=Number(new Set(p.tribesFired.map(k=>k.split(':')[0])).size>=3);
 return out;
}

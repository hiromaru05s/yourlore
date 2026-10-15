import type { GameState, PlayerState, Side } from './types';
import { effAtk, curHp, playCost } from './engine';
import { cardPower } from './cardEval';
import { hasPassive } from './cards';
import { VALUE_WEIGHTS } from './botValueWeights';

function playerFeatures(g: GameState, p: PlayerState): number[] {
  const deck=[...p.deck,...p.hand,...p.discard];
  const power=(c: typeof deck[number])=>Math.min(70,cardPower(c))/(1+Math.max(0,playCost(c,p)-p.maxMana)*0.7);
  const mons=p.field.filter(m=>m.hatch==null);
  const atk=mons.reduce((s,m)=>s+Math.max(0,effAtk(p,m,g)),0);
  const hp=mons.reduce((s,m)=>s+Math.max(0,curHp(p,m)),0);
  const engine=(id:string)=>p.enchants.filter(e=>e.card.id===id).length;
  const collection=[...deck,...p.field,...p.enchants.map(e=>e.card)];
  const culls=(p.removed??[]).filter(c=>c.star==='trash').length;
  return [
    Math.log1p(Math.max(0,p.hp))/4,Math.min(60,p.hp)/40,
    Math.min(200,p.shield??0)/40,Math.min(40,p.dew??0)/10,
    Math.min(30,p.maxMana)/15,p.mana/15,atk/30,hp/30,mons.length/7,
    mons.reduce((s,m)=>s+(m.directOnly?effAtk(p,m,g):0),0)/20,
    mons.reduce((s,m)=>s+(hasPassive(m,'dual')?effAtk(p,m,g):0),0)/20,
    mons.reduce((s,m)=>s+(hasPassive(m,'counter')?effAtk(p,m,g):0),0)/20,
    p.field.filter(m=>m.hatch!=null).reduce((s,m)=>s+((m.hatchTurns??8)-(m.hatch??0))*(m.dur??1),0)/20,
    deck.reduce((s,c)=>s+power(c),0)/Math.max(5,deck.length)/20,
    p.hand.reduce((s,c)=>s+power(c),0)/70,Math.min(40,deck.length)/20,
    p.enchants.reduce((s,e)=>s+Math.min(40,cardPower(e.card)),0)/30,
    p.traps.length/4,(p.bleed??0)/8,
    (p.quests??[]).reduce((s,q)=>s+q.progress/Math.max(1,q.card.quest?.target??1),0),
    engine('RIFT'),engine('TRIAL_AREA'),engine('ELF_HAVEN'),
    Math.min(30,culls)/25,collection.some(c=>c.id==='CHOSEN_AREA')?Math.min(25,culls)/25:0,
    Math.min(150,p.hp)/100*Math.max(0,g.turn-30)/30,
    mons.filter(m=>m.aura||m.turnFx).reduce((s,m)=>s+Math.min(40,cardPower(m)),0)/40,
  ];
}
export function valueFeatures(g: GameState, s: Side): number[] {
  const a=playerFeatures(g,g.players[s]),b=playerFeatures(g,g.players[1-s]);
  return a.map((v,i)=>v-b[i]);
}
export function learnedValue(g: GameState,s:Side):number {
  const x=valueFeatures(g,s);let z=0;
  for(let i=0;i<x.length;i++)z+=x[i]*VALUE_WEIGHTS.weights[i]/VALUE_WEIGHTS.scale[i];
  return 1/(1+Math.exp(-z));
}

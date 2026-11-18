import type {Action, GameState, Side} from './types';
import {actingSide} from './engine';
import {botActions, actionChangesState} from './botActions';
import {searchReduce as reduce} from './botBudget';
import {purchaseEvaluator} from './botEconomy';
import {actionKey, resolveAssessment, type AcquisitionAssessment} from './botAcquisition';
import {unproductiveOpponentHeal} from './botStrategy';

type Node={state:GameState;first:Action;value:number;ended:boolean};
/** Retain several whole-turn sequences instead of choosing one first card and
 * immediately reverting to summon-first greedy play. Targets are resolved by
 * the engine inside each branch. Refresh luck is left to the paired search. */
export function turnPlan(g: GameState, fallback: Action, score: (g:GameState,s:Side)=>number,
  acquisition:Map<string,AcquisitionAssessment>, width:number, depth:number):Action {
  if(g.pending)return fallback;
  const side=g.cur;
  let frontier:Node[]=[{state:g,first:fallback,value:score(g,side),ended:false}],best:Node|undefined;
  const seen=new Set<string>();
  const signature=(st:GameState):string=>JSON.stringify([st.turn,st.cur,st.rng,st.pending,st.marketStock,st.players],
    (k,v)=>['name','nameJa','nameEn','text','textJa','textEn','revealedCards','supplyHist'].includes(k)?undefined:v);
  for(let d=0;d<depth&&frontier.length;d++) {
    const children:Node[]=[];
    for(const node of frontier) {
      if(node.ended){children.push(node);continue;}
      const evaluate=purchaseEvaluator(node.state,node.state.players[side]),plays=new Set<string>();
      for(const action of botActions(node.state)) {
        if(action.type==='refresh')continue;
        if(action.type==='play'){
          const c=node.state.players[side].hand[action.idx];
          const key=JSON.stringify({...c,uid:''});if(plays.has(key))continue;plays.add(key);
        }
        if(action.type==='buyMarket'||action.type==='buySupply') {
          const c=action.type==='buyMarket'?node.state.market[action.i]:node.state.players[side].supply[action.i];
          const value=d===0?acquisition.get(actionKey(action))?.margin:undefined;
          if(c&&(value??evaluate(c,action.type==='buyMarket'?action.i:undefined).margin)<=0)continue;
        }
        const next=reduce(node.state,action).state;
        if(!actionChangesState(node.state,next)||unproductiveOpponentHeal(node.state,action,next))continue;
        // Keep the opponent's start-of-turn choice for their own policy.
        const state=next.cur===side?resolveAssessment(next,score,4):next;
        const sig=signature(state);if(seen.has(sig))continue;seen.add(sig);
        const first=d===0?action:node.first;
        const a=acquisition.get(actionKey(first));
        const value=score(state,side)+(a?Math.max(-8,Math.min(8,a.margin*.2)):0);
        const ended=state.cur!==side||state.over||actingSide(state)!==side;
        const child={state,first,value,ended};children.push(child);
        if(ended&&(!best||value>best.value))best=child;
      }
    }
    children.sort((a,b)=>b.value-a.value);
    // Do not let identical first moves consume every slot: preserving roots
    // keeps a setup card alive long enough to see the second/third action.
    const roots=new Set<string>();frontier=[];
    for(const c of children){const k=actionKey(c.first);if(!roots.has(k)){frontier.push(c);roots.add(k);if(frontier.length===width)break;}}
    for(const c of children){if(frontier.length===width)break;if(!frontier.includes(c))frontier.push(c);}
  }
  for(const node of frontier) {
    const state=node.ended?node.state:resolveAssessment(reduce(node.state,{type:'endTurn'}).state,score,4);
    const a=acquisition.get(actionKey(node.first));
    const value=score(state,side)+(a?Math.max(-8,Math.min(8,a.margin*.2)):0);
    if(!best||value>best.value)best={...node,state,value,ended:true};
  }
  return best?.first??fallback;
}

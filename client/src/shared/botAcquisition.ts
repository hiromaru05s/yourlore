import type {Action, CardInst, GameState, Side} from './types';
import {actingSide, effMaxMana, playBlockReason, playCost, TURN_DRAW, MAX_TURNS} from './engine';
import {cloneGameState} from './cloneGameState';
import {botActions, actionChangesState} from './botActions';
import {searchReduce as reduce} from './botBudget';
import {purchaseEvaluator, immediateHireMana} from './botEconomy';
import {observationSample} from './botObservation';

export interface AcquisitionAssessment {
  action: Action; id: string; immediate: boolean; arrival: number;
  heuristic: number; impact: number; cooperation: number; worst: number; margin: number; usable: number;
}
export const actionKey = (action: Action): string => JSON.stringify(action);

/** Resolve real engine choices, including friendly fire and optional cancellation.
 * This is a hypothetical continuation, never a forced-win claim. The other
 * player chooses for themselves, not for the purchaser. Bounded per probe. */
export function resolveAssessment(g: GameState, score: (g: GameState, side: Side) => number, maxChoices = 8): GameState {
  let st=g;
  for(let depth=0;st.pending&&!st.over&&depth<maxChoices;depth++) {
    const side=actingSide(st);
    let best: GameState|undefined, value=-Infinity;
    const seen=new Set<string>();
    for(const a of botActions(st)) {
      if((a.type==='pick'||a.type==='chooseTarget')&&a.uid) {
        const c=[...st.players[side].hand,...st.players[side].deck,...st.players[side].discard].find(c=>c.uid===a.uid);
        if(c){const key=JSON.stringify({...c,uid:''});if(seen.has(key))continue;seen.add(key);}
      }
      const next=reduce(st,a).state;
      if(!actionChangesState(st,next))continue;
      const v=score(next,side);
      if(v>value){value=v;best=next;}
    }
    if(!best)break;st=best;
  }
  return st;
}

/** Counterfactual card trials reprice the SAME offer for the current position.
 * Immediate purchases use the exact buy path. Ordinary cards are tested as a
 * future draw with next-turn mana; arrival discounts are kept separate from
 * their effect. This is NOT a claim that the card is already in our hand.
 * All trials use common public-information samples, never live RNG/private cards.
 */
export function assessAcquisitions(g: GameState, score: (g: GameState, side: Side) => number, samples=2): Map<string, AcquisitionAssessment> {
  const out=new Map<string,AcquisitionAssessment>();
  if(g.pending)return out;
  const side=g.cur,p=g.players[side],evaluate=purchaseEvaluator(g,p);
  const drawRate=TURN_DRAW+(p.bonusDrawPerm??0)+p.enchants.reduce((n,e)=>n+(e.card.ench==='bonusDraw'?(e.card.val2??0):0),0)+p.field.filter(m=>m.aura==='pageDraw').length;
  const arrival=Math.max(1,(p.deck.length+(p.discard.length+1)/2)/Math.max(1,drawRate));
  const turnsLeft=Math.max(0,Math.ceil((MAX_TURNS-g.turn)/2));
  const actions=botActions(g).filter(a=>a.type==='buyMarket'||a.type==='buySupply');
  // No static top-N prefilter: every affordable offer gets a contextual trial.
  const worlds=Array.from({length:samples},(_,i)=>observationSample(g,side,503+i));
  for(const action of actions) {
    if(action.type!=='buyMarket'&&action.type!=='buySupply')continue;
    const c=(action.type==='buyMarket'?g.market[action.i]:p.supply[action.i]) as CardInst;
    const h=evaluate(c,action.type==='buyMarket'?action.i:undefined);
    const immediate=!!c.quick||(['MERCENARY','MERC_LEADER','MERC_MASTER'].includes(c.id)&&p.mana>=h.cost+immediateHireMana(p,c)&&h.tempo>0);
    const impacts:number[]=[],cooperations:number[]=[];let usable=0;
    const supportPool=[...p.hand,...p.deck,...p.discard].filter(x=>x.id!==c.id&&!x.quick&&playCost(x,p)<=effMaxMana(p));
    const supportIds=new Set<string>();
    const supports=supportPool.sort((a,b)=>Number(p.hand.includes(b))-Number(p.hand.includes(a))||playCost(a,p)-playCost(b,p))
      .filter(x=>{if(supportIds.has(x.id))return false;supportIds.add(x.id);return true;}).slice(0,samples===1?1:3);
    for(const world of worlds) {
      let before=world,after:GameState,applied=true;
      if(immediate){after=resolveAssessment(reduce(before,action).state,score);}
      else {
        before=cloneGameState(world);
        const owner=before.players[side];
        // Preserve actual board, resource requirements and spell locks. Only
        // normal per-turn spending counters are renewed for this forecast.
        owner.mana=effMaxMana(owner);owner.spellsCastTurn=0;owner.playsTurn=0;owner.usesTurn={};
        const trial={...c,uid:'acquisition-trial-'+c.uid};
        if(playCost(trial,owner)>owner.mana||playBlockReason(before,side,trial)){after=before;applied=false;}
        else {
          const idx=owner.hand.length;
          const trialState=cloneGameState(before);trialState.players[side].hand.push(trial);
          after=resolveAssessment(reduce(trialState,{type:'play',idx}).state,score);
          if(after.players[side].hand.some(x=>x.uid===trial.uid)){after=before;applied=false;}
        }
      }
      if(applied)usable++;
      // Compare c+owned support with support alone under the SAME mana budget.
      // Trying both orders recognizes setup-before-payoff without an ID whitelist.
      // An owned deck/discard card is a discounted future draw, never a free card.
      const one=score(after,side)-score(before,side);
      let cooperation=0;
      if(!immediate&&!before.over)for(const support of supports) {
        const delivered=cloneGameState(before),owner=delivered.players[side];
        let idx=owner.hand.findIndex(x=>x.uid===support.uid);
        if(idx<0){const pool=owner.deck.some(x=>x.uid===support.uid)?owner.deck:owner.discard;const i=pool.findIndex(x=>x.uid===support.uid);if(i<0)continue;owner.hand.push(pool.splice(i,1)[0]);idx=owner.hand.length-1;}
        const cast=(state:GameState,card:CardInst):GameState|undefined=>{
          if(state.over||state.cur!==side||state.pending)return;
          let st=cloneGameState(state),pl=st.players[side],i=pl.hand.findIndex(x=>x.uid===card.uid);
          if(i<0){i=pl.hand.length;pl.hand.push({...card,uid:card.uid});}
          if(playBlockReason(st,side,pl.hand[i]))return;
          const next=resolveAssessment(reduce(st,{type:'play',idx:i}).state,score,4);
          return next.players[side].hand.some(x=>x.uid===card.uid)?undefined:next;
        };
        const control=cast(delivered,support);if(!control||control.over)continue;
        const trial={...c,uid:'acquisition-pair-'+c.uid};
        const first=cast(delivered,trial),a=first&&cast(first,support),b=cast(control,trial);
        if(!applied&&(a||b)){usable++;applied=true;}
        const pair=Math.max(a?score(a,side)-score(control,side):-Infinity,b?score(b,side)-score(control,side):-Infinity);
        const access=p.hand.some(x=>x.uid===support.uid)?.65:Math.min(.4,drawRate/Math.max(1,p.deck.length+p.discard.length));
        cooperation=Math.max(cooperation,Math.min(20,Math.max(0,pair-one))*access);
      }
      cooperations.push(cooperation);
      impacts.push(after.over?(after.winner===side?120:after.winner==null?0:-160):Math.max(-100,Math.min(100,score(after,side)-score(before,side))));
    }
    const mean=impacts.reduce((a,b)=>a+b,0)/samples,worst=Math.min(...impacts);
    const cooperation=cooperations.reduce((a,b)=>a+b,0)/samples;
    const impact=mean*.8+worst*.2+cooperation;
    // Static potential remains a fallback for delayed engines/unmet setups,
    // while actual effects can reverse the ranking of removal, heal and buffs.
    const access=immediate?1:Math.min(1,turnsLeft/arrival)/(1+.22*(arrival-1));
    const correction=usable?Math.max(-45,Math.min(45,impact-h.base*.5))*access:0;
    let margin=h.margin*access+correction-(1-access)*h.floor;
    if(immediate&&worst<=-80)margin=-100;
    // A conditional bomb without a currently executable route is an option,
    // not an available threat. Do not spend development turns hoarding it.
    if(!usable&&c.summonReq)margin=Math.min(margin,h.margin*.2-h.cost-h.floor*.5);
    if(!immediate&&arrival>turnsLeft)margin-=Math.max(0,h.value)*.8;
    out.set(actionKey(action),{action,id:c.id,immediate,arrival:immediate?0:arrival,heuristic:h.margin,impact,cooperation,worst,margin,usable});
  }
  return out;
}

import {clearMonsterStates,syncMonsterStates,playMonster} from '../../../ui/monster/runtime';
import {setFxSkip,pileFlash} from '../../../ui/anim';
import type {GameView} from '../../../ui/boardView';
import type {GameState} from '../../../shared/types';
/** Private preview ownership. Never clear a running canonical action to expose a canvas. */
export function nativeBridge(root:HTMLElement){
 let active=0;
 const traces:{uid:string;destination:string;kind?:'attack'|'destroy';outcome:'completed'|'cancelled'|'reduced'|'missing';started:number;ended:number}[]=[];
 const idle=()=>{if(active)throw Error('Cannot replace native display during an active action');};
 return {
  traces,get active(){return active;},
  render(view:GameView,state:GameState){idle();setFxSkip(true);view.render(state);},
  claim(){idle();clearMonsterStates(root);},
  restore(){idle();syncMonsterStates(root);},
  async attack(uid:string,owner:number,targetUid:string|null,signal:AbortSignal,reduced:boolean){
   const node=root.querySelector<HTMLElement>(`.card[data-uid="${uid}"]`),target=targetUid?root.querySelector<HTMLElement>(`.card[data-uid="${targetUid}"]`):root.querySelector<HTMLElement>(owner===0?'#portraitOpp':'#portraitMe');
   if(!node||!target||signal.aborted)return false;const started=performance.now(),destination=targetUid||'opponent';
   if(reduced){traces.push({uid,destination,kind:'attack',started,ended:performance.now(),outcome:'reduced'});return true;}
   setFxSkip(false);active++;
   try{const complete=await playMonster(node,'attack',{variant:'A',target,side:owner===0?1:-1,signal});traces.push({uid,destination,kind:'attack',started,ended:performance.now(),outcome:complete?'completed':'cancelled'});if(!complete&&!signal.aborted)throw Error(`Native attack cancelled: ${uid}`);return complete;}finally{active--;}
  },
  async destroy(uid:string,owner:number,voided:boolean,signal:AbortSignal,reduced:boolean){
   const destination=voided?(owner===0?'rift-me':'rift-opp'):(owner===0?'pile-myDisc':'pile-oppDisc');
   const node=root.querySelector<HTMLElement>(`.card[data-uid="${uid}"]`),target=document.getElementById(destination),started=performance.now();
   if(!node||!target){traces.push({uid,destination,started,ended:performance.now(),outcome:'missing'});throw Error(`Missing native destroy endpoint: ${uid}`);}
   if(signal.aborted)return false;
   if(reduced){node.style.visibility='hidden';traces.push({uid,destination,started,ended:performance.now(),outcome:'reduced'});return true;}
   setFxSkip(false);active++;
   try{
    // Exact existing ghostDie renderer, variants, destination and side. No new trajectory.
    const complete=await playMonster(node,'destroy',{variant:voided?'B':'A',destination:target.querySelector<HTMLElement>('.pile-print .card')??target,side:owner===0?1:-1,signal});
    traces.push({uid,destination,started,ended:performance.now(),outcome:complete?'completed':'cancelled'});
    if(complete){node.style.visibility='hidden';if(!voided)pileFlash(destination);}
    if(!complete&&!signal.aborted)throw Error(`Native destroy cancelled: ${uid}`);
    return complete;
   }finally{active--;}
  },
 };
}
export type NativeBridge=ReturnType<typeof nativeBridge>;

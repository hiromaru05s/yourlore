import type {GameState} from '../shared/types';
import {effAtk,effDef,curHp,monsterCanAttack} from '../shared/engine';
import {playMonster,syncMonsterStates,clearMonsterStates} from './monster/runtime';
import type {Kind} from './monster/catalog';

/** Snapshot numeric values, not mutable engine objects; combat damage is not a debuff. */
export function createBoardStatRise(root:HTMLElement){
 let previous=new Map<string,{id:string;owner:number;atk:number;def:number;hp:number}>(),disposed=false;
 return {
  update(state:GameState){
   if(disposed)return;
   const next=new Map<string,{id:string;owner:number;atk:number;def:number;hp:number}>();
   const effects:Array<()=>void>=[];
   state.players.forEach((p,owner)=>p.field.forEach(m=>{
    const value={id:m.id,owner,atk:effAtk(p,m,state),def:effDef(p,m),hp:curHp(p,m)};next.set(m.uid,value);
    const n=[...root.querySelectorAll<HTMLElement>('.zone-mon .card[data-uid]')].find(n=>n.dataset.uid===m.uid);if(!n)return;
    if(m.aura)n.dataset.monsterAura=m.aura;else delete n.dataset.monsterAura;
    const unable=!monsterCanAttack(state,p,m);
    if(unable){n.dataset.monsterBlocked='true';n.classList.remove('is-attacker');}else delete n.dataset.monsterBlocked;
    const old=previous.get(m.uid);if(!old||old.id!==m.id||old.owner!==owner||state.over)return;
    const da=value.atk-old.atk,dh=value.def-old.def;if(!da&&!dh)return;
    const stats={...(da?{atk:{from:old.atk,to:value.atk}}:{}),...(dh?{def:{from:value.hp-dh,to:value.hp}}:{})};
    effects.push(()=>{void(async()=>{
     // Opposite-sign changes use two coherent motions, never conflicting clones.
     for(const down of [false,true]){
      const atk=down?da<0:da>0,hp=down?dh<0:dh>0;if(!atk&&!hp)continue;
      const kind=((atk&&hp?'both':atk?'atk':'hp')+(down?'Down':'')) as Kind;
      await playMonster(n,kind,{stats:{...(atk?{atk:stats.atk}:{}),...(hp?{def:stats.def}:{})},side:n.closest('#oppRow')?-1:1});
     }
    })();});
   }));
   previous=next;syncMonsterStates(root);effects.forEach(run=>run());
  },
  dispose(){disposed=true;previous.clear();clearMonsterStates(root);}
 };
}

import {cancelMaterials} from './cardMaterial/effect';
import {fieldVisualState} from './fieldVisualState';
import type {GameState} from '../shared/types';
import {effAtk,effDef,curHp} from '../shared/engine';
import {playMonster,syncMonsterStates,clearMonsterStates} from './monster/runtime';
import type {Kind} from './monster/catalog';

/** Snapshot numeric values, not mutable engine objects; combat damage is not a debuff. */
export function createBoardStatRise(root:HTMLElement){
 let previous=new Map<string,{id:string;owner:number;atk:number;def:number;hp:number}>(),disposed=false;
 return {
  async update(state:GameState,handled:ReadonlySet<string>=new Set(),healthPresented:ReadonlyMap<string,number>=new Map(),animate=true){
   if(disposed)return;
   cancelMaterials(root);
   const next=new Map<string,{id:string;owner:number;atk:number;def:number;hp:number}>();
   const effects:Array<()=>Promise<void>>=[];
   // Each multi-target pick replaces the board and fast-forwards the previous
   // batch. Keep its numeric baseline until selection ends (including cancel),
   // then present every affected card together on the final board.
   const choosingBuff=state.pending?.kind==='myMon'&&state.pending.reason==='buffTurn';
   state.players.forEach((p,owner)=>p.field.forEach(m=>{
    const value={id:m.id,owner,atk:effAtk(p,m,state),def:effDef(p,m),hp:curHp(p,m)};next.set(m.uid,value);
    const n=[...root.querySelectorAll<HTMLElement>('.zone-mon .card[data-uid]')].find(n=>n.dataset.uid===m.uid);if(!n)return;
    const {blocked:unable,aura}=fieldVisualState(state,p,m);
    if(aura)n.dataset.monsterAura=aura;else delete n.dataset.monsterAura;
    if(unable){n.dataset.monsterBlocked='true';n.classList.remove('is-attacker');}else delete n.dataset.monsterBlocked;
    const old=previous.get(m.uid);if(!old||old.id!==m.id||old.owner!==owner||state.over||handled.has(m.uid)||!animate)return;
    const da=value.atk-old.atk;
    // Hits already committed at contact must not play twice. Recovery and other
    // current-health changes still need feedback even when maximum HP is equal.
    const dh=value.hp-(healthPresented.get(m.uid)??old.hp);
    if(!da&&!dh)return;
    const stats={...(da?{atk:{from:old.atk,to:value.atk}}:{}),...(dh?{def:{from:value.hp-dh,to:value.hp}}:{})};
    // Hold the old print synchronously, before any field actor is constructed
    // or artwork decoding yields. Selection snapshots share this same baseline.
    for(const key of ['atk','def'] as const){
     const change=stats[key];if(!change)continue;
     const label=n.querySelector('.ad-'+key+' .seal-value');if(label)label.textContent=String(change.from);
    }
    if(choosingBuff){next.set(m.uid,{...old,hp:value.hp-dh});return;}
    effects.push(async()=>{
     // One surface carries both values, including opposite directions.
     const kind=((da&&dh?'both':da?'atk':'hp')+(da<=0&&dh<=0?'Down':'')) as Kind;
     await playMonster(n,kind,{stats,side:n.closest('#oppRow')?-1:1});
     // Skipped/hidden/unavailable renderers must settle the held print too.
     for(const key of ['atk','def'] as const){const change=stats[key];if(change){const label=n.querySelector('.ad-'+key+' .seal-value');if(label)label.textContent=String(change.to);}}
    });
   }));
   previous=next;syncMonsterStates(root);await Promise.all(effects.map(run=>run()));
  },
  dispose(){disposed=true;previous.clear();clearMonsterStates(root);}
 };
}

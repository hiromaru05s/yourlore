import type {CardInst,FieldMon} from '../shared/types';
import {getLang} from '../i18n';
import {decayStateDescription} from '../shared/cardPresentation';
import './cardCounter.css';

export type CounterKind='guts'|'decay'|'hatch'|'charge';
export type CounterValue={kind:CounterKind;value:number};
type Identity=CounterValue&{uid:string;cardId:string;index:number;transient?:boolean};
type Motion={from:number;to:number;start:number;duration:number;remove?:boolean};
export const COUNTER_SLOT_MS=520;
const identities=new WeakMap<HTMLElement,Identity>(),motions=new WeakMap<HTMLElement,Motion>();
const active=new Map<HTMLElement,Motion>();
let sequence=0,raf=0,listening=false;
const count=(n:number)=>Number.isFinite(n)?Math.max(0,Math.floor(n)):0;
export function counterPosition(from:number,to:number,progress:number){const p=Math.max(0,Math.min(1,progress));return from+(to-from)*p*p*(3-2*p);}
export function fieldCounters(card:CardInst,onField=false):CounterValue[]{
 const m=card as FieldMon,result:CounterValue[]=[];
 if(card.hatchTurns!=null)result.push({kind:'hatch',value:count(m.hatch??card.hatchTurns)});
 if((m.guts??0)>0||(m.guts!=null&&((card.passive??[]).includes('guts')||m.passivesG?.includes('guts')||m.conditionalPassives?.includes('guts'))))result.push({kind:'guts',value:count(m.guts??0)});
 if(m.gcount!=null||(onField&&(['casino','assassinGuild','vampButler'].includes(card.aura??'')||card.id==='CASTLE')))result.push({kind:'charge',value:count(m.gcount??0)});
 if((m.decayCnt??0)>0)result.push({kind:'decay',value:count(m.decayCnt!)});
 return result;
}
function description(kind:CounterKind,value:number){
 const lang=getLang();
 if(kind==='decay')return decayStateDescription(value,lang);
 const labels={ja:{guts:'気合',hatch:'孵化',charge:'カウンター'},en:{guts:'Guts',hatch:'Hatch',charge:'Counter'},ko:{guts:'기합',hatch:'부화',charge:'카운터'}};
 return `${labels[lang][kind]} ${value}`;
}
function rows(position:number){
 const base=Math.floor(position+1e-8),fraction=position-base;
 const row=(value:number,y:number)=>{const digits=String(value).length,size=digits===1?24:digits===2?22:digits===3?18:54/digits;return `<text class="counter-slot-digit" data-value="${value}" x="32" y="29.5" dominant-baseline="central" transform="translate(0 ${y})" text-anchor="middle" font-family="Georgia,serif" font-weight="bold" font-size="${size}" fill="#28352e">${value}</text>`;};
 return row(base,-fraction*32)+(fraction>1e-7?row(base+1,(1-fraction)*32):'');
}
function paint(badge:HTMLElement,position:number){
 badge.querySelector('.counter-slot-reel')!.innerHTML=rows(position);
 badge.dataset.counterPosition=String(position);
}
function label(badge:HTMLElement,value:number){const meta=identities.get(badge)!;meta.value=value;badge.dataset.counterValue=String(value);badge.title=description(meta.kind,value);badge.setAttribute('aria-label',badge.title);}
export function createCardCounter(uid:string,cardId:string,kind:CounterKind,value:number,index=0):HTMLElement{
 const n=count(value),id='lore-counter-'+(++sequence),badge=document.createElement('span');
 badge.className='card-counter'+(kind==='decay'?' ec-decay-state':'');badge.dataset.counterKind=kind;badge.dataset.counterIndex=String(index);badge.style.setProperty('--counter-index',String(index));
 if(kind==='decay')badge.dataset.status='decay';
 badge.setAttribute('role','img');identities.set(badge,{uid,cardId,kind,value:n,index});
 badge.innerHTML=`<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false"><defs><radialGradient id="${id}ivory" cx=".32" cy=".23" r=".9"><stop stop-color="#fff9e8"/><stop offset=".6" stop-color="#eee4cd"/><stop offset="1" stop-color="#cdbf9f"/></radialGradient><linearGradient id="${id}gold" x2=".65" y2="1"><stop stop-color="#e5d3a7"/><stop offset=".44" stop-color="#8d7858"/><stop offset=".78" stop-color="#b9a47a"/><stop offset="1" stop-color="#63523a"/></linearGradient><linearGradient id="${id}window" x2=".2" y2="1"><stop stop-color="#c9bca1"/><stop offset=".16" stop-color="#e5d9bf"/><stop offset="1" stop-color="#fff7e3"/></linearGradient><clipPath id="${id}clip"><rect x="12.5" y="17.25" width="39" height="28.5" rx="3.5"/></clipPath></defs><circle cx="32" cy="31" r="28.5" fill="url(#${id}ivory)" stroke="url(#${id}gold)" stroke-width="2"/><circle cx="32" cy="31" r="26.1" fill="none" stroke="#fff9e5" stroke-width=".8"/><path d="M29 8l3 4 3-4M29 54l3-4 3 4" stroke="#7b6b4d" stroke-width="1.1" fill="none" stroke-linecap="round"/><rect class="counter-number-window" x="10.5" y="15.5" width="43" height="32" rx="5" fill="url(#${id}window)" stroke="#a2906e" stroke-width="1"/><path d="M15 17h34" stroke="#b7a583" stroke-width=".6"/><path d="M15 46h34" stroke="#fff9e7" stroke-width="1"/><g class="counter-slot-reel" clip-path="url(#${id}clip)">${rows(n)}</g><path d="M14 17.8h36" stroke="#655437" stroke-opacity=".14" stroke-width="1.3"/></svg>`;
 label(badge,n);paint(badge,n);return badge;
}
function position(badge:HTMLElement,now=performance.now()){const m=motions.get(badge);return m?counterPosition(m.from,m.to,(now-m.start)/m.duration):identities.get(badge)?.value??0;}
function reduced(){return document.hidden||matchMedia('(prefers-reduced-motion: reduce)').matches;}
function settle(){for(const [badge,m]of active){paint(badge,m.to);motions.set(badge,{from:m.to,to:m.to,start:0,duration:1});if(m.remove)badge.remove();}active.clear();if(raf)cancelAnimationFrame(raf);raf=0;unlisten();}
const visibility=()=>{if(document.hidden)settle();};
function unlisten(){if(!listening)return;listening=false;document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',settle);}
function tick(now:number){raf=0;for(const [badge,m]of active){if(!badge.isConnected){active.delete(badge);continue;}const done=now-m.start>=m.duration||reduced();paint(badge,done?m.to:position(badge,now));if(done){active.delete(badge);motions.set(badge,{from:m.to,to:m.to,start:0,duration:1});if(m.remove)badge.remove();}}if(active.size)raf=requestAnimationFrame(tick);else unlisten();}
function schedule(){if(!listening){listening=true;document.addEventListener('visibilitychange',visibility);window.addEventListener('pagehide',settle);}if(!raf)raf=requestAnimationFrame(tick);}
export function setCardCounter(badge:HTMLElement,to:number,opt:{from?:number;animate?:boolean;remove?:boolean}={}){
 const n=count(to),old=motions.get(badge),sampled=position(badge);label(badge,n);
 if(opt.from==null&&old?.to===n&&active.has(badge)){if(opt.animate!==false&&!reduced())return;}
 const from=opt.from??sampled;
 active.delete(badge);
 if(opt.animate===false||reduced()||Math.abs(from-n)<1e-7){motions.set(badge,{from:n,to:n,start:0,duration:1});paint(badge,n);if(opt.remove)badge.remove();return;}
 const motion={from,to:n,start:performance.now(),duration:COUNTER_SLOT_MS,remove:opt.remove};motions.set(badge,motion);active.set(badge,motion);paint(badge,from);schedule();
}
function transfer(old:HTMLElement,badge:HTMLElement,to:number,remove=false){
 const motion=motions.get(old);
 if(motion&&active.has(old)&&motion.to===to&&!reduced()){
  active.delete(old);const next={...motion,remove};motions.set(badge,next);active.set(badge,next);label(badge,to);paint(badge,position(badge));schedule();
 }else setCardCounter(badge,to,{from:position(old),remove});
}
/** Follow authoritative, public board snapshots across the board's DOM rebuilds. */
export function createBoardCardCounters(root:HTMLElement){
 let previous=new Map<string,HTMLElement>(),seen=new Set<string>(),disposed=false;
 const owner=(n:HTMLElement)=>n.closest('#oppRow')?'opp':'me';
 const objectKey=(side:string,uid:string,id:string)=>`${side}:${uid}:${id}`;
 return {
  sync(ended=false){
   if(disposed)return;
   const next=new Map<string,HTMLElement>(),objects=new Map<string,HTMLElement>();
   root.querySelectorAll<HTMLElement>('.zone-mon .card[data-uid],.zone-st .buff-icon[data-uid]').forEach(n=>objects.set(objectKey(owner(n),n.dataset.uid!,n.dataset.cardId??''),n));
   const badges=[...root.querySelectorAll<HTMLElement>('.zone-mon .card-counter,.zone-st .card-counter')].filter(n=>!identities.get(n)?.transient);
   for(const badge of badges){
    const meta=identities.get(badge);if(!meta)continue;
    const object=objectKey(owner(badge),meta.uid,meta.cardId),key=object+':'+meta.kind,old=previous.get(key);next.set(key,badge);
    if(ended){setCardCounter(badge,meta.value,{animate:false});continue;}
    if(old)transfer(old,badge,meta.value);else if(seen.has(object))setCardCounter(badge,meta.value,{from:0});
   }
   for(const [key,old]of previous){
    if(next.has(key))continue;const meta=identities.get(old)!;
    const object=key.slice(0,key.lastIndexOf(':')),host=objects.get(object);
    if(!host||ended||position(old)<1e-7)continue;
    const badge=createCardCounter(meta.uid,meta.cardId,meta.kind,0,host.querySelectorAll('.card-counter').length);
    identities.get(badge)!.transient=true;host.append(badge);transfer(old,badge,0,true);next.set(key,badge);
   }
   previous=next;seen=new Set(objects.keys());
  },
  dispose(){disposed=true;for(const badge of previous.values())active.delete(badge);root.querySelectorAll<HTMLElement>('.card-counter').forEach(n=>active.delete(n));previous.clear();seen.clear();if(!active.size){if(raf)cancelAnimationFrame(raf);raf=0;unlisten();}}
 };
}
